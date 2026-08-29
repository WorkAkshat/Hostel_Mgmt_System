import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen, Receipt, Scale, TrendingUp, Landmark,
  Plus, RefreshCw, CheckCircle2, ShieldAlert,
  Printer, Download, FileSpreadsheet, User, Building2
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:9000/api/v1';
const fmtInr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function TallyAccounting() {
  const { user } = useAuth();
  const token = user?.token || localStorage.getItem('token');

  // Firm scope state
  const isFloorWarden = user?.role === 'ADMIN' && user?.assignedFloor;
  const [selectedFloor, setSelectedFloor] = useState(isFloorWarden ? String(user.assignedFloor) : 'combined');

  // Active accounting tab: 'daybook' | 'student' | 'trial' | 'pnl' | 'bs' | 'voucher'
  const [activeTab, setActiveTab] = useState('daybook');

  // Data states
  const [daybook, setDaybook] = useState([]);
  const [trial, setTrial] = useState(null);
  const [pnl, setPnl] = useState(null);
  const [bs, setBs] = useState(null);
  const [heads, setHeads] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentLedger, setStudentLedger] = useState(null);
  const [loading, setLoading] = useState(true);

  // Voucher form state
  const [voucherForm, setVoucherForm] = useState({
    voucherType: 'RECEIPT',
    amount: '',
    narration: '',
    debitHeadCode: 'ASSET-BANK',
    creditHeadCode: 'REV-HOSTEL',
    companyName: ''
  });
  const [postMsg, setPostMsg] = useState(null);

  // Single-fetch guards to prevent duplicate loading calls
  const daybookFetchedRef = useRef('');
  const trialFetchedRef = useRef('');
  const pnlFetchedRef = useRef('');
  const bsFetchedRef = useRef('');

  // Fetch Day Book
  const fetchDaybook = useCallback(async (force = false) => {
    const key = `daybook-${selectedFloor}`;
    if (!force && daybookFetchedRef.current === key) return;
    daybookFetchedRef.current = key;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accounting/daybook?floorNumber=${selectedFloor}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setDaybook(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, selectedFloor]);

  // Fetch Trial Balance
  const fetchTrial = useCallback(async (force = false) => {
    const key = `trial-${selectedFloor}`;
    if (!force && trialFetchedRef.current === key) return;
    trialFetchedRef.current = key;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accounting/trial-balance?floorNumber=${selectedFloor}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTrial(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, selectedFloor]);

  // Fetch P&L
  const fetchPnl = useCallback(async (force = false) => {
    const key = `pnl-${selectedFloor}`;
    if (!force && pnlFetchedRef.current === key) return;
    pnlFetchedRef.current = key;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accounting/profit-loss?floorNumber=${selectedFloor}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPnl(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, selectedFloor]);

  // Fetch Balance Sheet
  const fetchBs = useCallback(async (force = false) => {
    const key = `bs-${selectedFloor}`;
    if (!force && bsFetchedRef.current === key) return;
    bsFetchedRef.current = key;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accounting/balance-sheet?floorNumber=${selectedFloor}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setBs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, selectedFloor]);

  // Load students list once for Student-Wise Ledger dropdown
  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    const fetchStudents = async () => {
      try {
        const res = await fetch(`${API_BASE}/students`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (isMounted && Array.isArray(data)) {
          setStudents(data);
          if (data.length > 0) setSelectedStudentId(data[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchStudents();
    return () => { isMounted = false; };
  }, [token]);

  // Fetch Student Ledger when student selected
  const fetchStudentLedger = useCallback(async (stId) => {
    if (!stId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accounting/student-ledger/${stId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStudentLedger(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch Account Heads (ONCE)
  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    const fetchHeads = async () => {
      try {
        const res = await fetch(`${API_BASE}/accounting/heads`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (isMounted) setHeads(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchHeads();
    return () => { isMounted = false; };
  }, [token]);

  useEffect(() => {
    if (activeTab === 'daybook') fetchDaybook();
    else if (activeTab === 'trial') fetchTrial();
    else if (activeTab === 'pnl') fetchPnl();
    else if (activeTab === 'bs') fetchBs();
    else if (activeTab === 'student' && selectedStudentId) fetchStudentLedger(selectedStudentId);
  }, [activeTab, selectedFloor, selectedStudentId, fetchDaybook, fetchTrial, fetchPnl, fetchBs, fetchStudentLedger]);

  const handlePostVoucher = async (e) => {
    e.preventDefault();
    setPostMsg(null);
    try {
      const res = await fetch(`${API_BASE}/accounting/vouchers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...voucherForm,
          floorNumber: selectedFloor === 'combined' ? null : selectedFloor
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to post voucher');
      setPostMsg({ type: 'success', text: `Voucher ${data.voucherNo} posted successfully to Tally Ledger!` });
      setVoucherForm({
        voucherType: 'RECEIPT',
        amount: '',
        narration: '',
        debitHeadCode: 'ASSET-BANK',
        creditHeadCode: 'REV-HOSTEL',
        companyName: ''
      });
      fetchDaybook(true);
    } catch (err) {
      setPostMsg({ type: 'error', text: err.message });
    }
  };

  // Export CSV Helper
  const exportCsv = (filename, rows) => {
    if (!rows || rows.length === 0) return;
    const processRow = (row) =>
      row.map(val => {
        let result = val === null || val === undefined ? '' : String(val);
        result = result.replace(/"/g, '""');
        return `"${result}"`;
      }).join(',');

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(processRow).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const firmNameMap = {
    '1': 'Rajken Enterprises (Floor 1)',
    '2': 'Vandana Enterprises (Floor 2)',
    '3': 'Pushpa Enterprises (Floor 3)',
    '4': 'Harish Chandra Ent. (Floor 4)',
    '5': 'Ramesh Enterprises (Floor 5)',
    'combined': 'Consolidated – All 5 Firms Combined'
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6 text-left print:p-0">
      {/* Clean Executive Light Header */}
      <div className="rounded-[24px] bg-white border border-slate-200/90 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-black text-2xl shadow-xs">
              📖
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Tally ERP Financial Accounting Engine</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">ICAI Schedule III Standard Compliant Ledger, Trial Balance, P&L & Balance Sheet</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          {/* Firm Scope Switcher */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl">
            <span className="text-xs font-semibold text-slate-500">Firm Scope:</span>
            {isFloorWarden ? (
              <span className="text-xs font-black text-slate-800">{firmNameMap[selectedFloor]}</span>
            ) : (
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer"
              >
                <option value="combined">Consolidated (All 5 Firms)</option>
                <option value="1">Floor 1 – Rajken Enterprises</option>
                <option value="2">Floor 2 – Vandana Enterprises</option>
                <option value="3">Floor 3 – Pushpa Enterprises</option>
                <option value="4">Floor 4 – Harish Chandra Ent.</option>
                <option value="5">Floor 5 – Ramesh Enterprises</option>
              </select>
            )}
          </div>

          {/* Action Export Buttons */}
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer">
            <Printer size={14} /> Print
          </button>
          <button
            onClick={() => {
              if (activeTab === 'daybook') {
                const csvData = [
                  ['Voucher No', 'Date', 'Type', 'Operating Firm', 'Narration', 'Amount'],
                  ...daybook.map(v => [v.voucherNo, new Date(v.date).toLocaleDateString(), v.voucherType, v.companyName || 'Consolidated', v.narration, v.amount])
                ];
                exportCsv(`Tally_DayBook_${selectedFloor}.csv`, csvData);
              } else if (activeTab === 'student' && studentLedger) {
                const csvData = [
                  ['Date', 'Voucher No', 'Particulars', 'Debit (Dr)', 'Credit (Cr)', 'Running Balance'],
                  ...studentLedger.ledger.map(l => [new Date(l.date).toLocaleDateString(), l.voucherNo, l.particulars, l.debit, l.credit, l.runningBalance])
                ];
                exportCsv(`Student_Ledger_${studentLedger.student.name}.csv`, csvData);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs hover:bg-emerald-700 shadow-sm border-none cursor-pointer transition-colors"
          >
            <FileSpreadsheet size={14} /> Export CSV / Excel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 print:hidden">
        {[
          { id: 'daybook', label: '📖 Day Book (दैनिक बही)', icon: <BookOpen size={16} /> },
          { id: 'student', label: '👤 Student-Wise Ledger (छात्र बही)', icon: <User size={16} /> },
          { id: 'trial', label: '⚖️ Trial Balance (तुलन पत्र)', icon: <Scale size={16} /> },
          { id: 'pnl', label: '📈 Profit & Loss (लाभ-हानि)', icon: <TrendingUp size={16} /> },
          { id: 'bs', label: '🏦 Balance Sheet (बैलेंस शीट)', icon: <Landmark size={16} /> },
          { id: 'voucher', label: '✍️ Post Voucher (वाउचर प्रविष्टि)', icon: <Plus size={16} /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all border ${
              activeTab === t.id
                ? 'bg-slate-900 text-emerald-400 border-slate-900 shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── DAY BOOK TAB ── */}
      {activeTab === 'daybook' && (
        <div className="glass-card p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-800">Transaction Vouchers Register (Day Book)</h3>
            <button onClick={() => fetchDaybook(true)} className="text-xs text-slate-500 font-semibold flex items-center gap-1 hover:text-emerald-700 cursor-pointer">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center"><div className="spinner mx-auto" /></div>
          ) : daybook.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm font-medium">No vouchers recorded for this firm scope.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wide border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Voucher No</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Operating Firm</th>
                    <th className="p-3.5">Particulars / Narration</th>
                    <th className="p-3.5 text-right">Debit (Dr)</th>
                    <th className="p-3.5 text-right">Credit (Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {daybook.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-800">{v.voucherNo}</td>
                      <td className="p-3.5 text-slate-500">{new Date(v.date).toLocaleDateString('en-IN')}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                          v.voucherType === 'RECEIPT' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {v.voucherType}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700 font-semibold">{v.companyName || 'Consolidated'}</td>
                      <td className="p-3.5 text-slate-800 font-medium">{v.narration}</td>
                      <td className="p-3.5 text-right font-bold text-slate-900">{fmtInr(v.amount)}</td>
                      <td className="p-3.5 text-right font-bold text-slate-900">{fmtInr(v.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── STUDENT-WISE LEDGER TAB ── */}
      {activeTab === 'student' && (
        <div className="glass-card p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-base font-extrabold text-slate-800">Student General Ledger (छात्र खाता बही)</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Select Resident Student:</span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 text-slate-800 outline-none"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.user?.name} ({s.rollNumber}) - Room {s.room?.roomNumber || 'N/A'}</option>
                ))}
              </select>
            </div>
          </div>

          {studentLedger && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap justify-between items-center gap-4">
              <div>
                <div className="text-base font-black text-slate-800">{studentLedger.student.name}</div>
                <div className="text-xs text-slate-500">Roll: {studentLedger.student.rollNumber} · Room {studentLedger.student.roomNumber} (Bed: {studentLedger.student.bedId})</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-semibold">Net Outstanding Balance:</span>
                <span className={`text-xl font-black ${studentLedger.closingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {fmtInr(studentLedger.closingBalance)} {studentLedger.closingBalance > 0 ? 'Dr (Due)' : 'Cleared'}
                </span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center"><div className="spinner mx-auto" /></div>
          ) : !studentLedger || studentLedger.ledger.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm font-medium">No ledger entries found for selected student.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wide border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Voucher / Demand Ref</th>
                    <th className="p-3.5">Particulars / Transaction Description</th>
                    <th className="p-3.5 text-right">Debit (Dr) Charges</th>
                    <th className="p-3.5 text-right">Credit (Cr) Received</th>
                    <th className="p-3.5 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {studentLedger.ledger.map((l, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="p-3.5 text-slate-500">{new Date(l.date).toLocaleDateString('en-IN')}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-800">{l.voucherNo}</td>
                      <td className="p-3.5 text-slate-800 font-semibold">{l.particulars}</td>
                      <td className="p-3.5 text-right font-bold text-rose-600">{l.debit > 0 ? fmtInr(l.debit) : '-'}</td>
                      <td className="p-3.5 text-right font-bold text-emerald-600">{l.credit > 0 ? fmtInr(l.credit) : '-'}</td>
                      <td className="p-3.5 text-right font-black text-slate-900">{fmtInr(l.runningBalance)} Dr</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TRIAL BALANCE TAB ── */}
      {activeTab === 'trial' && trial && (
        <div className="glass-card p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-800">Trial Balance Ledger Summary</h3>
            <span className={`text-xs font-extrabold px-3.5 py-1 rounded-full ${trial.isBalanced ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
              {trial.isBalanced ? '✓ Balanced Ledger (Dr = Cr)' : '⚠️ Unbalanced Ledger'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wide border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Account Head Name</th>
                  <th className="p-3.5">Group Category</th>
                  <th className="p-3.5 text-right">Debit (Dr) Amount</th>
                  <th className="p-3.5 text-right">Credit (Cr) Amount</th>
                  <th className="p-3.5 text-right">Net Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {trial.summary.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-50/80">
                    <td className="p-3.5 font-mono text-slate-500 font-bold">{row.code}</td>
                    <td className="p-3.5 font-extrabold text-slate-800">{row.name}</td>
                    <td className="p-3.5 text-slate-500">{row.group} ({row.category})</td>
                    <td className="p-3.5 text-right font-semibold text-slate-700">{fmtInr(row.debit)}</td>
                    <td className="p-3.5 text-right font-semibold text-slate-700">{fmtInr(row.credit)}</td>
                    <td className="p-3.5 text-right font-black text-slate-900">{fmtInr(Math.abs(row.netBalance))} {row.netBalance >= 0 ? 'Dr' : 'Cr'}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-black text-slate-900 text-sm border-t-2 border-slate-300">
                  <td className="p-3.5" colSpan={3}>TOTAL BALANCE</td>
                  <td className="p-3.5 text-right text-emerald-700">{fmtInr(trial.totalDebit)}</td>
                  <td className="p-3.5 text-right text-emerald-700">{fmtInr(trial.totalCredit)}</td>
                  <td className="p-3.5 text-right" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PROFIT & LOSS TAB (ICAI Standard AS-2) ── */}
      {activeTab === 'pnl' && pnl && (
        <div className="glass-card p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col gap-6">
          <h3 className="text-base font-extrabold text-slate-800">ICAI Compliant Profit & Loss Statement (AS-2 Standard)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">I. Revenue from Operations</span>
              <div className="text-2xl font-black text-emerald-900 mt-1">{fmtInr(pnl.totalIncome)}</div>
            </div>
            <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">II. Operating & Admin Expenses</span>
              <div className="text-2xl font-black text-rose-900 mt-1">{fmtInr(pnl.totalExpenses)}</div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Net Surplus / Profit Before Tax</span>
              <div className="text-2xl font-black text-emerald-300 mt-1">{fmtInr(pnl.netProfit)}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── BALANCE SHEET TAB (ICAI Schedule III Standard) ── */}
      {activeTab === 'bs' && bs && (
        <div className="glass-card p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col gap-6">
          <h3 className="text-base font-extrabold text-slate-800">ICAI Schedule III Balance Sheet Statement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Liabilities */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2">I. EQUITY AND LIABILITIES</h4>
              <div className="flex justify-between text-xs font-semibold py-1">
                <span>1. Capital & Reserves / Surplus</span>
                <span className="font-extrabold text-slate-900">{fmtInr(bs.capitalAndReserves)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold py-1">
                <span>2. Non-Current Liabilities (Refundable Deposits)</span>
                <span className="font-extrabold text-slate-900">{fmtInr(bs.totalLiabilities)}</span>
              </div>
              <div className="border-t border-slate-300 pt-2 flex justify-between font-black text-slate-900 text-sm">
                <span>TOTAL EQUITY & LIABILITIES</span>
                <span>{fmtInr(bs.totalAssets)}</span>
              </div>
            </div>

            {/* Assets */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2">II. ASSETS</h4>
              <div className="flex justify-between text-xs font-semibold py-1">
                <span>1. Current Assets (Cash & Bank Balances)</span>
                <span className="font-extrabold text-slate-900">{fmtInr(bs.totalAssets)}</span>
              </div>
              <div className="border-t border-slate-300 pt-2 flex justify-between font-black text-slate-900 text-sm">
                <span>TOTAL ASSETS</span>
                <span className="text-emerald-700">{fmtInr(bs.totalAssets)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── POST VOUCHER TAB ── */}
      {activeTab === 'voucher' && (
        <div className="glass-card p-6 max-w-2xl bg-white border border-slate-200/90 rounded-2xl shadow-sm">
          <h3 className="text-base font-extrabold text-slate-800 mb-4">Post Tally Accounting Voucher</h3>

          {postMsg && (
            <div className={`p-4 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${
              postMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              {postMsg.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
              <span>{postMsg.text}</span>
            </div>
          )}

          <form onSubmit={handlePostVoucher} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Voucher Type</label>
                <select
                  value={voucherForm.voucherType}
                  onChange={(e) => setVoucherForm({ ...voucherForm, voucherType: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-bold"
                >
                  <option value="RECEIPT">RECEIPT VOUCHER (कमीशन / शुल्क प्राप्ति)</option>
                  <option value="PAYMENT">PAYMENT VOUCHER (भुगतान)</option>
                  <option value="JOURNAL">JOURNAL VOUCHER (जर्नल)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 14000"
                  value={voucherForm.amount}
                  onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Debit Account Head (Dr)</label>
                <select
                  value={voucherForm.debitHeadCode}
                  onChange={(e) => setVoucherForm({ ...voucherForm, debitHeadCode: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                >
                  {heads.map(h => (
                    <option key={h.code} value={h.code}>Dr: {h.name} ({h.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Credit Account Head (Cr)</label>
                <select
                  value={voucherForm.creditHeadCode}
                  onChange={(e) => setVoucherForm({ ...voucherForm, creditHeadCode: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                >
                  {heads.map(h => (
                    <option key={h.code} value={h.code}>Cr: {h.name} ({h.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Particulars / Narration Description</label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Received September hostel rent from Sneha Patel via Bank Transfer"
                value={voucherForm.narration}
                onChange={(e) => setVoucherForm({ ...voucherForm, narration: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-medium"
              />
            </div>

            <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md border-none cursor-pointer transition-colors">
              <Plus size={16} /> Post Voucher to Tally Ledger
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
