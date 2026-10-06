const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/activityLogger');

// ─── Hostel payment details (UPI / bank) per floor ─────────────────────────
// Stored as one JSON setting: { "1": { upiId, payeeName, bankName, accountName, accountNo, ifsc, note }, … }
const SETTINGS_KEY = 'payment-details';
const FIELDS = ['upiId', 'payeeName', 'bankName', 'accountName', 'accountNo', 'ifsc', 'note'];

const readDetails = async () => {
  const row = await prisma.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
  try { return row ? JSON.parse(row.value) : {}; } catch { return {}; }
};

// @route GET /api/v1/payments/settings   (any signed-in user — students need it to pay)
const getSettings = async (req, res) => {
  try {
    res.json(await readDetails());
  } catch (error) {
    console.error('Error reading payment settings:', error);
    res.status(500).json({ message: 'Could not load payment details' });
  }
};

// @route PUT /api/v1/payments/settings   body: { floor, upiId, payeeName, … }   (Admin)
const updateSettings = async (req, res) => {
  try {
    const floor = String(req.body?.floor || '').trim();
    if (!floor) return res.status(400).json({ message: 'Choose the floor these details belong to' });
    if (req.user.assignedFloor && String(req.user.assignedFloor) !== floor) {
      return res.status(403).json({ message: 'You can only change your own floor' });
    }
    const entry = {};
    FIELDS.forEach((f) => { entry[f] = String(req.body?.[f] ?? '').trim().slice(0, 120); });
    if (entry.upiId && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(entry.upiId)) {
      return res.status(400).json({ message: 'UPI ID looks wrong — it should be like name@bank' });
    }
    if (entry.ifsc && !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(entry.ifsc)) {
      return res.status(400).json({ message: 'IFSC should be 11 characters, like SBIN0001234' });
    }
    entry.ifsc = entry.ifsc.toUpperCase();
    const all = await readDetails();
    all[floor] = entry;
    await prisma.appSetting.upsert({ where: { key: SETTINGS_KEY }, update: { value: JSON.stringify(all) }, create: { key: SETTINGS_KEY, value: JSON.stringify(all) } });
    res.json(all);
    logActivity({ req, action: 'UPDATE', module: 'FEE', description: `Updated payment details for floor ${floor}`, targetType: 'Setting' });
  } catch (error) {
    console.error('Error saving payment settings:', error);
    res.status(500).json({ message: 'Could not save payment details' });
  }
};

// ─── Payment claims: student paid by UPI / bank, warden confirms ───────────
const METHODS = ['UPI', 'BANK', 'CASH'];

const findBill = async (kind, id) => (kind === 'INVOICE'
  ? prisma.invoice.findUnique({ where: { id } })
  : prisma.demandNote.findUnique({ where: { id } }));
const billAmount = (kind, bill) => (kind === 'INVOICE' ? bill.amount : bill.totalAmount);
const billLabel = (kind, bill) => (kind === 'INVOICE' ? 'fee bill' : `demand note ${bill.billingMonth}`);

// @route POST /api/v1/payments/claims   (Student)
const createClaim = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id }, include: { user: { select: { name: true } } } });
    if (!student) return res.status(403).json({ message: 'Only residents can send a payment' });

    const { billKind, billId, method, reference = '', paidOn, note = '' } = req.body || {};
    if (!['INVOICE', 'NOTE'].includes(billKind) || !billId) return res.status(400).json({ message: 'Which bill did you pay?' });
    if (!METHODS.includes(method)) return res.status(400).json({ message: `Payment method must be one of ${METHODS.join(', ')}` });
    const ref = String(reference).trim();
    if (method !== 'CASH' && ref.length < 6) return res.status(400).json({ message: 'Enter the UPI / bank transaction ID (UTR) so the warden can match it' });
    const when = paidOn ? new Date(paidOn) : new Date();
    if (Number.isNaN(when.getTime()) || when > new Date(Date.now() + 60_000)) return res.status(400).json({ message: 'Payment date cannot be in the future' });

    const bill = await findBill(billKind, billId);
    if (!bill || bill.studentId !== student.id) return res.status(404).json({ message: 'Bill not found' });
    if (bill.status === 'PAID') return res.status(400).json({ message: 'This bill is already paid' });
    const open = await prisma.paymentClaim.findFirst({ where: { billId, status: 'PENDING' } });
    if (open) return res.status(400).json({ message: 'You already sent this payment — the warden is checking it' });

    const claim = await prisma.paymentClaim.create({
      data: { studentId: student.id, billKind, billId, amount: billAmount(billKind, bill), method, reference: ref.slice(0, 60), paidOn: when, note: String(note).trim().slice(0, 200) || null },
    });
    res.status(201).json(claim);
    logActivity({ req, action: 'CREATE', module: 'FEE', description: `${student.user.name} reported paying ₹${claim.amount} for ${billLabel(billKind, bill)} via ${method}${ref ? ` (ref ${ref})` : ''}`, targetId: claim.id, targetType: 'PaymentClaim' });
  } catch (error) {
    console.error('Error creating payment claim:', error);
    res.status(500).json({ message: 'Could not send the payment details' });
  }
};

// @route GET /api/v1/payments/claims/mine   (Student)
const myClaims = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.json([]);
    res.json(await prisma.paymentClaim.findMany({ where: { studentId: student.id }, orderBy: { createdAt: 'desc' } }));
  } catch (error) {
    console.error('Error loading my payment claims:', error);
    res.status(500).json({ message: 'Could not load your payments' });
  }
};

// @route GET /api/v1/payments/claims?status=PENDING   (Admin)
const listClaims = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.user.assignedFloor) where.student = { room: { floorNumber: req.user.assignedFloor } };
    const claims = await prisma.paymentClaim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { student: { select: { id: true, rollNumber: true, phoneNumber: true, user: { select: { name: true } }, room: { select: { roomNumber: true, floorNumber: true } } } } },
    });
    // Attach a short bill title so the warden knows what was paid
    const withBills = await Promise.all(claims.map(async (c) => {
      const bill = await findBill(c.billKind, c.billId);
      return { ...c, billTitle: bill ? (c.billKind === 'INVOICE' ? `Fee bill · due ${bill.dueDate.toISOString().slice(0, 10)}` : `Demand note · ${bill.billingMonth}`) : 'Bill removed', billStatus: bill?.status || null };
    }));
    res.json(withBills);
  } catch (error) {
    console.error('Error listing payment claims:', error);
    res.status(500).json({ message: 'Could not load payments' });
  }
};

// @route POST /api/v1/payments/claims/:id/approve   (Admin) — marks the bill PAID
const approveClaim = async (req, res) => {
  try {
    const claim = await prisma.paymentClaim.findUnique({ where: { id: req.params.id }, include: { student: { include: { user: { select: { name: true } }, room: true } } } });
    if (!claim) return res.status(404).json({ message: 'Payment not found' });
    if (claim.status !== 'PENDING') return res.status(400).json({ message: 'This payment was already decided' });
    if (req.user.assignedFloor && claim.student.room?.floorNumber !== req.user.assignedFloor) return res.status(403).json({ message: 'This resident is on another floor' });

    const bill = await findBill(claim.billKind, claim.billId);
    if (!bill) return res.status(404).json({ message: 'The bill no longer exists' });
    const paidAt = claim.paidOn > new Date() ? new Date() : claim.paidOn;
    if (bill.status !== 'PAID') {
      if (claim.billKind === 'INVOICE') await prisma.invoice.update({ where: { id: bill.id }, data: { status: 'PAID', paidAt, payMethod: claim.method, payReference: claim.reference || null } });
      else await prisma.demandNote.update({ where: { id: bill.id }, data: { status: 'PAID', paidAt } });
    }
    const updated = await prisma.paymentClaim.update({ where: { id: claim.id }, data: { status: 'APPROVED', decidedBy: req.user.name, decidedAt: new Date() } });
    res.json(updated);

    if (claim.billKind === 'INVOICE') {
      const { syncAccountingReceipts } = require('./accountingController');
      syncAccountingReceipts().catch((err) => console.error('Failed to auto-sync payment voucher:', err));
    }
    logActivity({ req, action: 'PAYMENT', module: 'FEE', description: `Confirmed ₹${claim.amount} from ${claim.student.user.name} via ${claim.method}${claim.reference ? ` (ref ${claim.reference})` : ''}`, targetId: bill.id, targetType: claim.billKind === 'INVOICE' ? 'Invoice' : 'DemandNote', metadata: { method: claim.method, reference: claim.reference, paidAt, claimId: claim.id } });
  } catch (error) {
    console.error('Error approving payment claim:', error);
    res.status(500).json({ message: 'Could not confirm the payment' });
  }
};

// @route POST /api/v1/payments/claims/:id/reject   body: { reason }   (Admin)
const rejectClaim = async (req, res) => {
  try {
    const claim = await prisma.paymentClaim.findUnique({ where: { id: req.params.id }, include: { student: { include: { user: { select: { name: true } }, room: true } } } });
    if (!claim) return res.status(404).json({ message: 'Payment not found' });
    if (claim.status !== 'PENDING') return res.status(400).json({ message: 'This payment was already decided' });
    if (req.user.assignedFloor && claim.student.room?.floorNumber !== req.user.assignedFloor) return res.status(403).json({ message: 'This resident is on another floor' });
    const reason = String(req.body?.reason || '').trim().slice(0, 200);
    if (reason.length < 3) return res.status(400).json({ message: 'Tell the resident why (e.g. "No such UTR in the bank statement")' });
    const updated = await prisma.paymentClaim.update({ where: { id: claim.id }, data: { status: 'REJECTED', reason, decidedBy: req.user.name, decidedAt: new Date() } });
    res.json(updated);
    logActivity({ req, action: 'REJECT', module: 'FEE', description: `Rejected payment of ₹${claim.amount} from ${claim.student.user.name}: ${reason}`, targetId: claim.id, targetType: 'PaymentClaim' });
  } catch (error) {
    console.error('Error rejecting payment claim:', error);
    res.status(500).json({ message: 'Could not reject the payment' });
  }
};

module.exports = { getSettings, updateSettings, createClaim, myClaims, listClaims, approveClaim, rejectClaim };
