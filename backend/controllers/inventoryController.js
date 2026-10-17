const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/activityLogger');

// Stock register:
//  FIXED_ASSET  furniture in rooms, solar plant, lift, water cooler…
//  INVENTORY    gym machines, appliances, mattresses in store…
//  CONSUMABLE   kitchen groceries, gas, cleaning supplies — goes IN when bought, OUT when used
const CATEGORIES = ['FIXED_ASSET', 'INVENTORY', 'CONSUMABLE'];
const CONDITIONS = ['GOOD', 'NEEDS_REPAIR', 'DAMAGED', 'DISPOSED'];
const TYPES = ['IN', 'OUT', 'ADJUST'];

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const cleanItem = (body, partial = false) => {
  const out = {};
  const err = (m) => { throw Object.assign(new Error(m), { status: 400 }); };
  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (name.length < 2) err('Give the item a name');
    out.name = name.slice(0, 80);
  }
  if (!partial || body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) err('Choose a type: fixed asset, inventory or consumable');
    out.category = body.category;
  }
  if (body.location !== undefined) out.location = String(body.location || '').trim().slice(0, 80) || null;
  if (body.floorNumber !== undefined) out.floorNumber = num(body.floorNumber);
  if (body.unit !== undefined) out.unit = String(body.unit || 'pcs').trim().slice(0, 16) || 'pcs';
  if (body.minQuantity !== undefined) {
    const m = num(body.minQuantity);
    if (m !== null && (Number.isNaN(m) || m < 0)) err('Low-stock level must be 0 or more');
    out.minQuantity = m;
  }
  if (body.unitCost !== undefined) {
    const c = num(body.unitCost);
    if (c !== null && (Number.isNaN(c) || c < 0)) err('Price must be 0 or more');
    out.unitCost = c;
  }
  if (body.condition !== undefined) {
    if (!CONDITIONS.includes(body.condition)) err('Unknown condition');
    out.condition = body.condition;
  }
  if (body.purchaseDate !== undefined) {
    const d = body.purchaseDate ? new Date(body.purchaseDate) : null;
    if (d && Number.isNaN(d.getTime())) err('Purchase date is not valid');
    out.purchaseDate = d;
  }
  if (body.notes !== undefined) out.notes = String(body.notes || '').trim().slice(0, 300) || null;
  return out;
};
const fail = (res, error, msg) => {
  if (error.status === 400) return res.status(400).json({ message: error.message });
  console.error(msg, error);
  return res.status(500).json({ message: msg });
};

// @route GET /api/v1/inventory/items?category=&q=   (Admin, Staff)
const listItems = async (req, res) => {
  try {
    const where = {};
    if (req.query.category && CATEGORIES.includes(req.query.category)) where.category = req.query.category;
    if (req.query.floorNumber) where.floorNumber = Number(req.query.floorNumber);
    const items = await prisma.inventoryItem.findMany({ where, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    const q = String(req.query.q || '').trim().toLowerCase();
    res.json(q ? items.filter((i) => [i.name, i.location, i.notes].some((v) => v && v.toLowerCase().includes(q))) : items);
  } catch (error) { fail(res, error, 'Could not load stock items'); }
};

// @route POST /api/v1/inventory/items   (Admin) — optional openingQuantity creates the first IN entry
const createItem = async (req, res) => {
  try {
    const data = cleanItem(req.body || {});
    const opening = num(req.body?.openingQuantity) || 0;
    if (Number.isNaN(opening) || opening < 0) return res.status(400).json({ message: 'Opening quantity must be 0 or more' });
    const item = await prisma.inventoryItem.create({
      data: {
        ...data,
        quantity: opening,
        movements: opening ? { create: { type: 'IN', quantity: opening, unitCost: data.unitCost ?? null, note: 'Opening stock', date: data.purchaseDate || new Date(), byName: req.user.name } } : undefined,
      },
    });
    res.status(201).json(item);
    logActivity({ req, action: 'CREATE', module: 'INVENTORY', description: `Added ${item.name} (${opening} ${item.unit}) to stock`, targetId: item.id, targetType: 'InventoryItem' });
  } catch (error) { fail(res, error, 'Could not add the item'); }
};

// @route PUT /api/v1/inventory/items/:id   (Admin) — details only; quantity changes go through movements
const updateItem = async (req, res) => {
  try {
    const data = cleanItem(req.body || {}, true);
    const item = await prisma.inventoryItem.update({ where: { id: req.params.id }, data });
    res.json(item);
    logActivity({ req, action: 'UPDATE', module: 'INVENTORY', description: `Updated ${item.name}`, targetId: item.id, targetType: 'InventoryItem' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Item not found' });
    fail(res, error, 'Could not update the item');
  }
};

// @route DELETE /api/v1/inventory/items/:id   (Admin)
const deleteItem = async (req, res) => {
  try {
    const item = await prisma.inventoryItem.delete({ where: { id: req.params.id } });
    res.json({ message: 'Item removed' });
    logActivity({ req, action: 'DELETE', module: 'INVENTORY', description: `Removed ${item.name} from stock`, targetId: item.id, targetType: 'InventoryItem' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Item not found' });
    fail(res, error, 'Could not remove the item');
  }
};

// @route GET /api/v1/inventory/items/:id/movements   (Admin, Staff)
const listMovements = async (req, res) => {
  try {
    res.json(await prisma.stockMovement.findMany({ where: { itemId: req.params.id }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 200 }));
  } catch (error) { fail(res, error, 'Could not load the stock history'); }
};

// @route POST /api/v1/inventory/items/:id/movements   body: { type, quantity, unitCost?, note?, date? }   (Admin, Staff)
const addMovement = async (req, res) => {
  try {
    const { type, note = '' } = req.body || {};
    const quantity = Number(req.body?.quantity);
    const unitCost = num(req.body?.unitCost);
    if (!TYPES.includes(type)) return res.status(400).json({ message: 'Choose Stock in, Used or Count' });
    if (!Number.isFinite(quantity) || quantity < 0 || (type !== 'ADJUST' && quantity === 0)) return res.status(400).json({ message: 'Enter a quantity more than 0' });
    if (unitCost !== null && (Number.isNaN(unitCost) || unitCost < 0)) return res.status(400).json({ message: 'Price must be 0 or more' });
    const date = req.body?.date ? new Date(req.body.date) : new Date();
    if (Number.isNaN(date.getTime()) || date > new Date(Date.now() + 86400000)) return res.status(400).json({ message: 'Date cannot be in the future' });

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: req.params.id } });
      if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });
      let next = item.quantity;
      if (type === 'IN') next += quantity;
      if (type === 'OUT') {
        if (quantity > item.quantity) throw Object.assign(new Error(`Only ${item.quantity} ${item.unit} left in stock`), { status: 400 });
        next -= quantity;
      }
      if (type === 'ADJUST') next = quantity;
      const movement = await tx.stockMovement.create({ data: { itemId: item.id, type, quantity, unitCost, note: String(note).trim().slice(0, 200) || null, date, byName: req.user.name } });
      const updated = await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: Math.round(next * 1000) / 1000, ...(type === 'IN' && unitCost !== null ? { unitCost } : {}) } });
      return { movement, item: updated, before: item.quantity };
    });
    res.status(201).json(result);
    const verb = type === 'IN' ? 'Stock in' : type === 'OUT' ? 'Used' : 'Counted';
    logActivity({ req, action: type === 'OUT' ? 'UPDATE' : 'CREATE', module: 'INVENTORY', description: `${verb}: ${result.item.name} ${quantity} ${result.item.unit} (now ${result.item.quantity})`, targetId: result.item.id, targetType: 'InventoryItem' });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ message: error.message });
    fail(res, error, 'Could not save the stock entry');
  }
};

// @route GET /api/v1/inventory/summary?month=YYYY-MM   (Admin, Staff)
// Totals per category, low-stock list and, for the month, how much of each consumable came in and was used.
const summary = async (req, res) => {
  try {
    const month = /^\d{4}-\d{2}$/.test(String(req.query.month || '')) ? String(req.query.month) : new Date().toISOString().slice(0, 7);
    const [y, m] = month.split('-').map(Number);
    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 1);
    const items = await prisma.inventoryItem.findMany();
    const moves = await prisma.stockMovement.findMany({ where: { date: { gte: from, lt: to } }, include: { item: { select: { name: true, unit: true, category: true } } } });

    const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, { items: 0, value: 0, needsRepair: 0 }]));
    items.forEach((i) => {
      const b = byCategory[i.category];
      if (!b) return;
      b.items += 1;
      b.value += (i.unitCost || 0) * (i.quantity || 0);
      if (i.condition === 'NEEDS_REPAIR' || i.condition === 'DAMAGED') b.needsRepair += 1;
    });
    const lowStock = items.filter((i) => i.category === 'CONSUMABLE' && i.minQuantity != null && i.quantity <= i.minQuantity)
      .map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, unit: i.unit, minQuantity: i.minQuantity }));

    const flow = {};
    moves.filter((mv) => mv.type !== 'ADJUST').forEach((mv) => {
      const f = (flow[mv.itemId] ||= { itemId: mv.itemId, name: mv.item.name, unit: mv.item.unit, category: mv.item.category, in: 0, out: 0, spent: 0 });
      if (mv.type === 'IN') { f.in += mv.quantity; f.spent += (mv.unitCost || 0) * mv.quantity; } else f.out += mv.quantity;
    });
    res.json({
      month,
      byCategory,
      lowStock,
      monthFlow: Object.values(flow).sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name)),
      monthSpend: Object.values(flow).reduce((a, f) => a + f.spent, 0),
    });
  } catch (error) { fail(res, error, 'Could not build the stock summary'); }
};

module.exports = { listItems, createItem, updateItem, deleteItem, listMovements, addMovement, summary };
