const { PrismaClient } = require('@prisma/client');
const { logActivity } = require('../utils/activityLogger');

const prisma = new PrismaClient();

const METHODS = ['CASH', 'UPI', 'BANK', 'CHEQUE'];
const round = (n) => Math.round(n * 100) / 100;

// Outstanding = given − taken back so far
const shape = (a) => ({
  ...a,
  outstanding: round(Math.max(0, a.amount - (a.recoveredAmount || 0))),
  settled: (a.recoveredAmount || 0) >= a.amount,
});

const validDate = (v, label) => {
  if (!v) return new Date();
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw Object.assign(new Error(`${label} is not a valid date`), { status: 400 });
  if (d > new Date(Date.now() + 86400000)) throw Object.assign(new Error(`${label} cannot be in the future`), { status: 400 });
  return d;
};

const fail = (res, error, msg) => {
  if (error.status) return res.status(error.status).json({ message: error.message });
  console.error(msg, error);
  return res.status(500).json({ message: msg });
};

// @desc    All advances (newest first) with totals; ?staffId= for one person
// @route   GET /api/v1/staff-advances
// @access  Private (Admin)
const listAdvances = async (req, res) => {
  try {
    const where = req.query.staffId ? { staffId: String(req.query.staffId) } : {};
    const rows = (await prisma.staffAdvance.findMany({
      where,
      orderBy: [{ givenOn: 'desc' }, { createdAt: 'desc' }],
      include: { staff: { select: { id: true, designation: true, department: true, phoneNumber: true } } },
    })).map(shape);
    const totals = rows.reduce((t, a) => ({
      given: round(t.given + a.amount),
      recovered: round(t.recovered + (a.recoveredAmount || 0)),
      outstanding: round(t.outstanding + a.outstanding),
    }), { given: 0, recovered: 0, outstanding: 0 });
    res.json({ advances: rows, totals });
  } catch (error) { fail(res, error, 'Could not load staff advances'); }
};

// @desc    Record money given to a staff member ahead of salary
// @route   POST /api/v1/staff-advances   { staffId? | staffName, amount, method, reference?, note?, givenOn? }
// @access  Private (Admin)
const createAdvance = async (req, res) => {
  try {
    const { staffId, staffName, method = 'CASH', reference = '', note = '' } = req.body || {};
    const amount = round(Number(req.body?.amount));
    if (!(amount > 0) || amount > 1000000) return res.status(400).json({ message: 'Enter an amount between ₹1 and ₹10,00,000.' });
    if (!METHODS.includes(method)) return res.status(400).json({ message: 'Choose how it was given: cash, UPI, bank or cheque.' });

    let name = String(staffName || '').trim();
    let linked = null;
    if (staffId) {
      linked = await prisma.staff.findUnique({ where: { id: String(staffId) }, include: { user: { select: { name: true } } } });
      if (!linked) return res.status(404).json({ message: 'Staff member not found.' });
      name = linked.user?.name || name;
    }
    if (name.length < 2) return res.status(400).json({ message: 'Choose the staff member or type their name.' });

    const advance = await prisma.staffAdvance.create({
      data: {
        staffId: linked?.id || null,
        staffName: name.slice(0, 80),
        amount,
        method,
        reference: String(reference).trim().slice(0, 40) || null,
        note: String(note).trim().slice(0, 300) || null,
        givenOn: validDate(req.body?.givenOn, 'Date'),
        createdBy: req.user.name,
      },
    });
    res.status(201).json(shape(advance));
    logActivity({ req, action: 'CREATE', module: 'STAFF', description: `Gave ₹${amount} advance to ${name} via ${method}`, targetId: advance.id, targetType: 'StaffAdvance' });
  } catch (error) { fail(res, error, 'Could not save the advance'); }
};

// @desc    Take back (part of) an advance — e.g. cut from this month's salary
// @route   POST /api/v1/staff-advances/:id/recover   { amount, on?, note? }
// @access  Private (Admin)
const recoverAdvance = async (req, res) => {
  try {
    const a = await prisma.staffAdvance.findUnique({ where: { id: req.params.id } });
    if (!a) return res.status(404).json({ message: 'Advance not found.' });
    const left = round(a.amount - (a.recoveredAmount || 0));
    if (left <= 0) return res.status(400).json({ message: 'This advance is already fully recovered.' });
    const amount = req.body?.amount === undefined || req.body?.amount === '' ? left : round(Number(req.body.amount));
    if (!(amount > 0)) return res.status(400).json({ message: 'Enter the amount taken back.' });
    if (amount > left) return res.status(400).json({ message: `Only ₹${left} is still outstanding on this advance.` });
    const extra = String(req.body?.note || '').trim();
    const updated = await prisma.staffAdvance.update({
      where: { id: a.id },
      data: {
        recoveredAmount: round((a.recoveredAmount || 0) + amount),
        recoveredOn: validDate(req.body?.on, 'Date'),
        ...(extra ? { note: `${a.note ? `${a.note} · ` : ''}${extra}`.slice(0, 300) } : {}),
      },
    });
    res.json(shape(updated));
    logActivity({ req, action: 'UPDATE', module: 'STAFF', description: `Recovered ₹${amount} of ${a.staffName}'s advance (₹${round(left - amount)} still due)`, targetId: a.id, targetType: 'StaffAdvance' });
  } catch (error) { fail(res, error, 'Could not update the advance'); }
};

// @desc    Remove an advance entered by mistake
// @route   DELETE /api/v1/staff-advances/:id
// @access  Private (Admin)
const deleteAdvance = async (req, res) => {
  try {
    const a = await prisma.staffAdvance.delete({ where: { id: req.params.id } });
    res.json({ message: 'Advance removed' });
    logActivity({ req, action: 'DELETE', module: 'STAFF', description: `Removed ₹${a.amount} advance entry for ${a.staffName}`, targetId: a.id, targetType: 'StaffAdvance' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Advance not found.' });
    fail(res, error, 'Could not remove the advance');
  }
};

module.exports = { listAdvances, createAdvance, recoverAdvance, deleteAdvance };
