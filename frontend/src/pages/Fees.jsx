import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fees as feesApi, demandNotes as demandNotesApi, students as studentsApi,
} from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import {
  ArrowLeft, Calendar, Check, CheckCircle, CreditCard, Download,
  Pencil, Plus, Receipt, RefreshCw, Send, ShieldAlert, X,
} from 'lucide-react';
import CustomModal from '../components/CustomModal';
import DemandNotePrint from '../components/DemandNotePrint';
import InvoicePreviewModal, { getBreakdown } from '../components/InvoicePreviewModal';
import Avatar from '../components/ui/Avatar';
import { priceFor } from '../config/hostel';

/* ─── Status badge ───────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => (
  <span className={`badge ${status === 'PAID' ? 'badge-success' : 'badge-danger'}`}>
    {status === 'PAID' ? 'Paid' : 'Unpaid'}
  </span>
);

/* ─── Breakdown mini pills ───────────────────────────────────────────── */
const BreakdownPills = ({ bd }) => (
  <div className="flex flex-wrap gap-1.5 mt-2">
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-100">
      🏠 Rent ₹{bd.rent.toLocaleString('en-IN')}
    </span>
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-peach-50 text-peach-700 border border-peach-100">
      🍽 Mess ₹{bd.mess.toLocaleString('en-IN')}
    </span>
    {bd.elec > 0 && (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sun-50 text-sun-700 border border-sun-100">
        ⚡ Elec ₹{bd.elec.toLocaleString('en-IN')}
      </span>
    )}
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────────── */
const Fees = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [invoices, setInvoices] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [generateOpen, setGenerateOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [printNote, setPrintNote] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState(null);

  // Generate form with breakdown
  const defaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  };
  const [genForm, setGenForm] = useState({
    studentRollNumber: '',
    rent: '11000',
    mess: '3000',
    electricity: '0',
    dueDate: defaultDueDate()
  });
  const [genError, setGenError] = useState(null);
  const [genLoading, setGenLoading] = useState(false);

  const genTotal = (Number(genForm.rent) || 0) + (Number(genForm.mess) || 0) + (Number(genForm.electricity) || 0);

  const handleStudentSelect = (rollNo) => {
    const student = studentsList.find(s => s.rollNumber === rollNo);
    const sharingType = student?.room?.sharingType;
    const canonical = sharingType ? priceFor(sharingType) : priceFor(2);
    setGenForm(f => ({
      ...f,
      studentRollNumber: rollNo,
      rent: String(canonical?.roomRent || 11000),
      mess: String(canonical?.messFee || 3000),
    }));
  };

  // Edit form — 3 separate components
  const [editForm, setEditForm] = useState({ rent: '', mess: '', electricity: '', dueDate: '' });
  const [editError, setEditError] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Dispatch all
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [payForm, setPayForm] = useState({ cardName: '', cardNumber: '4111 2222 3333 4444', expiry: '12/28', cvv: '123' });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      let feeList = [], demandList = [];
      try {
        feeList = user.role === 'ADMIN' ? await feesApi.getAll() : await feesApi.getMyInvoices();
      } catch { /**/ }
      try { demandList = await demandNotesApi.getAll(); } catch { /**/ }

      const combined = [
        ...(Array.isArray(demandList) ? demandList.map(n => ({ ...n, isDemandNote: true, amount: n.totalAmount, dueDate: n.cycleEnd || n.dueDate || '' })) : []),
        ...(Array.isArray(feeList) ? feeList : []),
      ];
      setInvoices(combined);
    } catch (e) {
      toast.error('Could not load invoices', e.message);
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    fetchInvoices();
    if (user.role === 'ADMIN') {
      studentsApi.getAll().then(d => setStudentsList(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, [fetchInvoices, user.role]);

  /* Stats */
  const totalCollected = invoices.filter(i => i.status === 'PAID').reduce((a, i) => a + (Number(i.amount) || 0), 0);
  const totalOutstanding = invoices.filter(i => i.status === 'UNPAID').reduce((a, i) => a + (Number(i.amount) || 0), 0);
  const paidCount = invoices.filter(i => i.status === 'PAID').length;
  const unpaidCount = invoices.filter(i => i.status === 'UNPAID').length;

  const filtered = invoices.filter(inv => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      inv.id?.toLowerCase().includes(q) ||
      inv.student?.user?.name?.toLowerCase().includes(q) ||
      inv.student?.rollNumber?.toLowerCase().includes(q) ||
      String(inv.student?.room?.roomNumber || '').includes(q);
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  /* Handlers */
  const handleDispatchAll = async () => {
    if (!window.confirm('This will generate monthly invoices for all active students who haven\'t been billed yet this month. Continue?')) return;
    setDispatchLoading(true);
    try {
      const res = await feesApi.autoGenerateMonthly();
      toast.success('Invoices dispatched!', res.message || 'Monthly billing complete.');
      fetchInvoices();
    } catch (e) {
      toast.error('Dispatch failed', e.message);
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenError(null);
    if (!genForm.studentRollNumber) { setGenError('Select a student.'); return; }
    const rent = Number(genForm.rent) || 0;
    const mess = Number(genForm.mess) || 0;
    const elec = Number(genForm.electricity) || 0;
    const total = rent + mess + elec;
    if (total <= 0) { setGenError('Enter valid fee amounts.'); return; }
    setGenLoading(true);
    try {
      await feesApi.create({
        studentRollNumber: genForm.studentRollNumber,
        rentAmount: rent,
        messAmount: mess,
        electricityAmount: elec,
        amount: total,
        dueDate: genForm.dueDate
      });
      toast.success('Invoice dispatched', `Bill of ₹${total.toLocaleString('en-IN')} sent.`);
      setGenerateOpen(false);
      setGenForm({ studentRollNumber: '', rent: '11000', mess: '3000', electricity: '0', dueDate: defaultDueDate() });
      fetchInvoices();
    } catch (e) {
      setGenError(e.message || 'Failed to generate invoice');
    } finally {
      setGenLoading(false);
    }
  };

  const openEdit = (inv) => {
    setSelectedInvoice(inv);
    const sharingType = inv.student?.room?.sharingType;
    const canonical = sharingType ? priceFor(sharingType) : null;
    setEditForm({
      rent: String(inv.rentAmount ?? canonical?.roomRent ?? ''),
      mess: String(inv.messAmount ?? canonical?.messFee ?? ''),
      electricity: String(inv.electricityAmount ?? '0'),
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : defaultDueDate(),
    });
    setEditError(null);
    setEditModalOpen(true);
  };

  const editTotal = (Number(editForm.rent) || 0) + (Number(editForm.mess) || 0) + (Number(editForm.electricity) || 0);

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditError(null);
    const rent = Number(editForm.rent) || 0;
    const mess = Number(editForm.mess) || 0;
    const elec = Number(editForm.electricity) || 0;
    if (rent <= 0 && mess <= 0 && elec <= 0) { setEditError('Enter at least one amount.'); return; }
    setEditLoading(true);
    try {
      await feesApi.update(selectedInvoice.id, {
        rentAmount: rent,
        messAmount: mess,
        electricityAmount: elec,
        dueDate: editForm.dueDate,
      });
      toast.success('Invoice updated', `Total corrected to ₹${(rent + mess + elec).toLocaleString('en-IN')}.`);
      setEditModalOpen(false);
      fetchInvoices();
    } catch (e) {
      setEditError(e.message || 'Could not update invoice');
    } finally {
      setEditLoading(false);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setPaymentLoading(true);
    try {
      await feesApi.pay(selectedInvoice.id);
      toast.success('Payment recorded!', 'Invoice marked as paid.');
      setPayModalOpen(false);
      fetchInvoices();
    } catch (e) {
      toast.error('Payment failed', e.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const FeePresets = [9000, 11000, 12000, 13000, 14000, 16000];

  return (
    <div className="flex flex-col gap-5">

      {/* ─── Premium Hero Banner ─── */}
      <div
        className="relative overflow-hidden rounded-[var(--border-radius-card)] p-6 sm:p-8"
        style={{ background: 'linear-gradient(135deg, #246460 0%, #2b7a74 45%, #3a918a 100%)' }}
      >
        <div className="pointer-events-none absolute -top-10 -right-10 w-52 h-52 rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="pointer-events-none absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            {user.role === 'STUDENT' && (
              <button
                onClick={() => navigate('/student/dashboard')}
                className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold border-none cursor-pointer bg-transparent p-0"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                <ArrowLeft size={14} /> Back to dashboard
              </button>
            )}
            <div className="flex items-center gap-2.5 mb-1">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.18)' }}>
                <Receipt size={18} style={{ color: '#fff' }} />
              </span>
              <h1 className="text-[24px] font-bold m-0 leading-none" style={{ color: '#fff' }}>
                {user.role === 'ADMIN' ? 'Fee Ledger' : 'My Invoices'}
              </h1>
            </div>
            <p className="m-0 text-[13px] font-medium mt-2" style={{ color: 'rgba(255,255,255,0.72)' }}>
              {user.role === 'ADMIN'
                ? `${invoices.length} total invoices · ₹${totalCollected.toLocaleString('en-IN')} collected · ₹${totalOutstanding.toLocaleString('en-IN')} outstanding`
                : 'View your fee breakdown and pay outstanding dues online'}
            </p>
          </div>

          {/* Admin stats */}
          {user.role === 'ADMIN' && !loading && (
            <div className="flex flex-wrap gap-2.5">
              {[
                { label: 'Collected', value: `₹${(totalCollected / 1000).toFixed(0)}K`, sub: `${paidCount} paid`, color: '#4ade80' },
                { label: 'Outstanding', value: `₹${(totalOutstanding / 1000).toFixed(0)}K`, sub: `${unpaidCount} unpaid`, color: '#f87171' },
                { label: 'Total Invoices', value: invoices.length, sub: `${Math.round((paidCount / (invoices.length || 1)) * 100)}% paid`, color: '#fff' },
              ].map(s => (
                <div key={s.label}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.22)' }}
                >
                  <div>
                    <div className="text-[20px] font-bold leading-none" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{s.label}</div>
                    <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="relative flex flex-wrap gap-2.5 mt-5">
          {user.role === 'ADMIN' && (
            <>
              <button
                onClick={handleDispatchAll}
                disabled={dispatchLoading}
                className="h-10 px-5 rounded-[var(--border-radius-btn)] text-[13px] font-bold flex items-center gap-2 cursor-pointer border-none transition-all"
                style={{ background: '#fff', color: '#246460' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f8f7'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                title="Generate monthly invoices for all active students at once"
              >
                <Send size={15} />
                {dispatchLoading ? 'Dispatching…' : 'Dispatch to All Students'}
              </button>
              <button
                onClick={() => setGenerateOpen(true)}
                className="h-10 px-4 rounded-[var(--border-radius-btn)] text-[13px] font-semibold flex items-center gap-2 cursor-pointer border-none transition-all"
                style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.26)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
              >
                <Plus size={15} /> Generate Single Bill
              </button>
            </>
          )}
          <button
            onClick={fetchInvoices}
            className="h-10 w-10 rounded-[var(--border-radius-btn)] flex items-center justify-center cursor-pointer border-none transition-all"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
            title="Refresh"
          >
            <RefreshCw size={15} style={{ color: '#fff' }} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── Filter bar ─── */}
      <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <input
          type="text"
          placeholder="Search by student name, roll no., room…"
          className="form-input flex-1"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <div className="flex gap-2">
          <select className="form-input w-auto flex-1 sm:w-[180px] cursor-pointer" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="PAID">Paid only</option>
            <option value="UNPAID">Unpaid / pending</option>
          </select>
        </div>
      </div>

      {/* ─── Content ─── */}
      {loading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-[100px] rounded-[var(--border-radius-card)] skeleton-loading" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-12 flex flex-col items-center text-center gap-3">
          <span className="w-14 h-14 rounded-full bg-mint-100 text-brand-600 flex items-center justify-center"><Receipt size={24} /></span>
          <h3 className="text-[16px] font-bold m-0">No invoices found</h3>
          <p className="text-[14px] text-[var(--text-secondary)] m-0 max-w-sm">
            {searchTerm || statusFilter !== 'ALL' ? 'Try resetting filters.' : 'No fee invoices in the system yet.'}
          </p>
          {user.role === 'ADMIN' && (
            <button className="btn-primary mt-2" onClick={() => setGenerateOpen(true)}><Plus size={15} /> Generate Bill</button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  {user.role === 'ADMIN' && <th>Student</th>}
                  <th>Invoice</th>
                  <th>Amount & Breakdown</th>
                  <th>Due Date</th>
                  <th>Paid On</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((inv, idx) => {
                    const bd = getBreakdown(inv);
                    return (
                      <motion.tr
                        key={inv.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(idx, 10) * 0.02 }}
                      >
                        {user.role === 'ADMIN' && (
                          <td>
                            <div className="flex items-center gap-3 min-w-[200px]">
                              <Avatar name={inv.student?.user?.name} size={36} />
                              <div className="min-w-0">
                                <div className="font-semibold text-[13px] truncate">{inv.student?.user?.name || 'Student'}</div>
                                <div className="text-[11px] text-[var(--text-tertiary)] font-mono">{inv.student?.rollNumber || '—'}</div>
                                {inv.student?.room && (
                                  <div className="text-[11px] text-[var(--text-tertiary)]">Room {inv.student.room.roomNumber} · Floor {inv.student.room.floorNumber}</div>
                                )}
                              </div>
                            </div>
                          </td>
                        )}
                        <td>
                          <code className="font-mono bg-mint-50 border border-brand-100 px-2 py-0.5 rounded text-[11px] text-brand-700 font-bold">
                            #INV-{String(inv.id).split('-')[0].toUpperCase()}
                          </code>
                          {inv.isDemandNote && <span className="ml-1.5 badge badge-info text-[10px]">Demand Note</span>}
                        </td>
                        <td>
                          <div className="font-bold text-[15px]">₹{Number(inv.amount).toLocaleString('en-IN')}</div>
                          <BreakdownPills bd={bd} />
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                            <Calendar size={13} className="text-[var(--text-tertiary)]" />
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : 'N/A'}
                          </div>
                        </td>
                        <td>
                          {inv.paidAt ? (
                            <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                              <Check size={13} className="text-[var(--success)]" />
                              {new Date(inv.paidAt).toLocaleDateString('en-IN')}
                            </div>
                          ) : (
                            <span className="text-[var(--text-tertiary)] text-[12px] italic">Pending</span>
                          )}
                        </td>
                        <td><StatusBadge status={inv.status} /></td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              className="h-8 px-3 rounded-lg bg-mint-50 text-brand-700 border border-brand-100 text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-mint-100 transition-colors"
                              onClick={() => inv.isDemandNote ? setPrintNote(inv) : setInvoicePreview(inv)}
                              title="View & Download Invoice"
                            >
                              <Download size={13} /> View Invoice
                            </button>
                            {user.role === 'ADMIN' && inv.status !== 'PAID' && !inv.isDemandNote && (
                              <button
                                className="h-8 w-8 rounded-lg bg-sun-50 text-sun-700 border border-sun-100 flex items-center justify-center cursor-pointer hover:bg-sun-100 transition-colors"
                                onClick={() => openEdit(inv)}
                                title="Edit invoice"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            {inv.status !== 'PAID' && (
                              <button
                                className="h-8 px-3 rounded-lg btn-primary text-[12px]"
                                onClick={() => { setSelectedInvoice(inv); setPayForm(f => ({ ...f, cardName: user.name })); setPayModalOpen(true); }}
                              >
                                <CreditCard size={13} /> Pay
                              </button>
                            )}
                            {inv.status === 'PAID' && (
                              <span className="h-8 px-2.5 rounded-lg bg-[var(--success-bg)] text-[var(--success)] text-[11px] font-bold flex items-center gap-1 border border-green-100">
                                <CheckCircle size={12} /> Paid
                              </span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
            <div className="px-5 py-3 text-[12px] text-[var(--text-tertiary)] border-t border-[var(--border-color)]">
              Showing {filtered.length} of {invoices.length} invoices
            </div>
          </div>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filtered.map(inv => {
              const bd = getBreakdown(inv);
              return (
                <div key={inv.id} className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] overflow-hidden">
                  <div className="h-1" style={{ background: inv.status === 'PAID' ? 'linear-gradient(90deg, #22c55e, #4ade80)' : 'linear-gradient(90deg, #ef4444, #f87171)' }} />
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <code className="text-[11px] font-mono text-brand-700 bg-mint-50 border border-brand-100 px-2 py-0.5 rounded font-bold">
                          #INV-{String(inv.id).split('-')[0].toUpperCase()}
                        </code>
                        {user.role === 'ADMIN' && inv.student && (
                          <div className="flex items-center gap-2 mt-2">
                            <Avatar name={inv.student?.user?.name} size={28} />
                            <div>
                              <div className="font-semibold text-[13px]">{inv.student?.user?.name}</div>
                              <div className="text-[11px] text-[var(--text-tertiary)] font-mono">{inv.student?.rollNumber}</div>
                              {inv.student?.room && <div className="text-[11px] text-[var(--text-tertiary)]">Room {inv.student.room.roomNumber}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                      <StatusBadge status={inv.status} />
                    </div>

                    <div>
                      <div className="text-[22px] font-bold">₹{Number(inv.amount).toLocaleString('en-IN')}</div>
                      <BreakdownPills bd={bd} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div className="rounded-xl bg-mint-50 px-3 py-2">
                        <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide font-bold">Due Date</div>
                        <div className="font-semibold mt-0.5">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : 'N/A'}</div>
                      </div>
                      <div className="rounded-xl bg-mint-50 px-3 py-2">
                        <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide font-bold">Paid On</div>
                        <div className="font-semibold mt-0.5">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('en-IN') : '—'}</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="btn-secondary flex-1 h-9 text-[12px]"
                        onClick={() => inv.isDemandNote ? setPrintNote(inv) : setInvoicePreview(inv)}
                      >
                        <Download size={13} /> View Invoice
                      </button>
                      {user.role === 'ADMIN' && inv.status !== 'PAID' && !inv.isDemandNote && (
                        <button className="h-9 w-9 rounded-lg bg-sun-50 text-sun-700 border border-sun-100 flex items-center justify-center cursor-pointer hover:bg-sun-100 shrink-0" onClick={() => openEdit(inv)} title="Edit">
                          <Pencil size={14} />
                        </button>
                      )}
                      {inv.status !== 'PAID' && (
                        <button className="btn-primary flex-1 h-9 text-[12px]" onClick={() => { setSelectedInvoice(inv); setPayForm(f => ({ ...f, cardName: user.name })); setPayModalOpen(true); }}>
                          <CreditCard size={13} /> Pay Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── Generate Invoice Modal ─── */}
      <CustomModal isOpen={generateOpen} onClose={() => setGenerateOpen(false)} title="Generate Fee Invoice">
        {genError && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium mb-4">
            <ShieldAlert size={16} /> {genError}
          </div>
        )}
        <form onSubmit={handleGenerate} className="flex flex-col gap-4">
          <div>
            <label className="form-label">Student</label>
            <select className="form-input cursor-pointer" required value={genForm.studentRollNumber}
              onChange={e => handleStudentSelect(e.target.value)}>
              <option value="">— Select student —</option>
              {studentsList.filter(s => s.rollNumber).map(s => (
                <option key={s.id} value={s.rollNumber}>
                  {s.user?.name} ({s.rollNumber}){s.room ? ` · Room ${s.room.roomNumber} (${s.room.sharingType === 1 ? 'Single' : s.room.sharingType === 2 ? 'Twin' : 'Triple'})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Components */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label flex items-center gap-1.5">
                <span>🏠</span> Room Rent
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-[13px] font-bold">₹</span>
                <input
                  type="number" min="0" className="form-input pl-6" required
                  value={genForm.rent}
                  onChange={e => setGenForm(f => ({ ...f, rent: e.target.value }))}
                  placeholder="11000"
                />
              </div>
            </div>
            <div>
              <label className="form-label flex items-center gap-1.5">
                <span>🍽</span> Mess / Catering
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-[13px] font-bold">₹</span>
                <input
                  type="number" min="0" className="form-input pl-6" required
                  value={genForm.mess}
                  onChange={e => setGenForm(f => ({ ...f, mess: e.target.value }))}
                  placeholder="3000"
                />
              </div>
            </div>
            <div>
              <label className="form-label flex items-center gap-1.5">
                <span>⚡</span> Electricity
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-[13px] font-bold">₹</span>
                <input
                  type="number" min="0" className="form-input pl-6"
                  value={genForm.electricity}
                  onChange={e => setGenForm(f => ({ ...f, electricity: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Live Total Display */}
          <div className="rounded-xl p-3.5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #246460, #3a918a)' }}>
            <span className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>Total Bill Amount</span>
            <span className="text-[20px] font-bold" style={{ color: '#fff' }}>₹{genTotal.toLocaleString('en-IN')}</span>
          </div>

          <div>
            <label className="form-label">Due Date</label>
            <input type="date" className="form-input" required value={genForm.dueDate}
              onChange={e => setGenForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-[var(--border-color)]">
            <button type="button" className="btn-secondary" onClick={() => setGenerateOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={genLoading || genTotal <= 0}>
              {genLoading ? 'Sending…' : `Dispatch Bill (₹${genTotal.toLocaleString('en-IN')})`}
            </button>
          </div>
        </form>
      </CustomModal>

      {/* ─── Edit Invoice Modal ─── */}
      <CustomModal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Correct Invoice Amounts">
        <div className="mb-4 p-3.5 rounded-xl bg-sun-50 border border-sun-100 text-[13px] text-sun-700 font-medium">
          ⚠️ Edit the individual rent, mess and electricity amounts. The total will be calculated automatically.
        </div>
        {editError && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium mb-4">
            <ShieldAlert size={16} /> {editError}
          </div>
        )}
        {selectedInvoice && (
          <div className="mb-4 p-3 rounded-xl bg-mint-50 border border-brand-100 text-[13px] flex items-center justify-between">
            <div>
              <div className="font-semibold text-brand-800">{selectedInvoice.student?.user?.name}</div>
              <div className="text-[var(--text-tertiary)] text-[12px]">
                {selectedInvoice.student?.rollNumber} &middot; Room {selectedInvoice.student?.room?.roomNumber || 'N/A'} &middot; #INV-{String(selectedInvoice.id).split('-')[0].toUpperCase()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide">Current Total</div>
              <div className="font-bold text-[15px] text-brand-700">₹{Number(selectedInvoice.amount).toLocaleString('en-IN')}</div>
            </div>
          </div>
        )}
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          {/* Three fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label flex items-center gap-1.5">
                <span className="text-base">🏠</span> Room Rent
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-[13px] font-bold">₹</span>
                <input
                  type="number" min="0" className="form-input pl-6"
                  value={editForm.rent}
                  placeholder="e.g. 9000"
                  onChange={e => setEditForm(f => ({ ...f, rent: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="form-label flex items-center gap-1.5">
                <span className="text-base">🍽</span> Mess / Catering
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-[13px] font-bold">₹</span>
                <input
                  type="number" min="0" className="form-input pl-6"
                  value={editForm.mess}
                  placeholder="e.g. 3000"
                  onChange={e => setEditForm(f => ({ ...f, mess: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="form-label flex items-center gap-1.5">
                <span className="text-base">⚡</span> Electricity
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-[13px] font-bold">₹</span>
                <input
                  type="number" min="0" className="form-input pl-6"
                  value={editForm.electricity}
                  placeholder="e.g. 500"
                  onChange={e => setEditForm(f => ({ ...f, electricity: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Live total */}
          <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #246460, #3a918a)' }}>
            <span className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>New Total</span>
            <span className="text-[22px] font-bold" style={{ color: '#fff' }}>₹{editTotal.toLocaleString('en-IN')}</span>
          </div>

          <div>
            <label className="form-label">New Due Date</label>
            <input type="date" className="form-input" value={editForm.dueDate}
              onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-[var(--border-color)]">
            <button type="button" className="btn-secondary" onClick={() => setEditModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={editLoading || editTotal <= 0}>
              {editLoading ? 'Saving…' : `Save ₹${editTotal.toLocaleString('en-IN')}`}
            </button>
          </div>
        </form>
      </CustomModal>

      {/* ─── Pay Modal (Student) ─── */}
      <CustomModal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} title="Pay Invoice">
        {selectedInvoice && (
          <div className="mb-4 p-4 rounded-xl bg-mint-50 border border-brand-100">
            <div className="text-[11px] text-[var(--text-tertiary)] uppercase font-bold tracking-wide mb-2">Invoice Summary</div>
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[var(--text-secondary)]">Total due</span>
              <span className="text-[22px] font-bold text-brand-700">₹{Number(selectedInvoice.amount).toLocaleString('en-IN')}</span>
            </div>
            <BreakdownPills bd={getBreakdown(selectedInvoice)} />
          </div>
        )}
        <form onSubmit={handlePay} className="flex flex-col gap-4">
          <div>
            <label className="form-label">Cardholder Name</label>
            <input type="text" className="form-input" required value={payForm.cardName}
              onChange={e => setPayForm(f => ({ ...f, cardName: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Card Number</label>
            <input type="text" className="form-input font-mono" required value={payForm.cardNumber}
              onChange={e => setPayForm(f => ({ ...f, cardNumber: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Expiry</label>
              <input type="text" className="form-input" placeholder="MM/YY" required value={payForm.expiry}
                onChange={e => setPayForm(f => ({ ...f, expiry: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">CVV</label>
              <input type="password" className="form-input" placeholder="•••" required value={payForm.cvv}
                onChange={e => setPayForm(f => ({ ...f, cvv: e.target.value }))} />
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] m-0">This is a secure mock payment sandbox for demo purposes.</p>
          <div className="flex gap-3 justify-end pt-2 border-t border-[var(--border-color)]">
            <button type="button" className="btn-secondary" onClick={() => setPayModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={paymentLoading}>
              {paymentLoading ? 'Processing…' : `Pay ₹${Number(selectedInvoice?.amount || 0).toLocaleString('en-IN')}`}
            </button>
          </div>
        </form>
      </CustomModal>

      {/* Invoice Preview Modal */}
      {invoicePreview && (
        <InvoicePreviewModal invoice={invoicePreview} onClose={() => setInvoicePreview(null)} />
      )}

      {/* Demand Note Print */}
      {printNote && <DemandNotePrint note={printNote} onClose={() => setPrintNote(null)} />}
    </div>
  );
};

export default Fees;
