import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen, Scale, TrendingUp, Landmark,
  Plus, RefreshCw, CheckCircle2, ShieldAlert,
  Printer, FileSpreadsheet, User, Wallet
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:9000/api/v1';
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInr = (n) => `₹${fmt(n)}`;

export default function TallyAccounting() {
  const { user } = useAuth();
  const token = user?.token || localStorage.getItem('token');

  const isFloorWarden = user?.role === 'ADMIN' && user?.assignedFloor;
  const [selectedFloor, setSelectedFloor] = useState(isFloorWarden ? String(user.assignedFloor) : 'combined');
  const [activeTab, setActiveTab] = useState('daily');

  const [daybook, setDaybook] = useState([]);
  const [trial, setTrial] = useState(null);
  const [pnl, setPnl] = useState(null);
  const [bs, setBs] = useState(null);
  const [heads, setHeads] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentLedger, setStudentLedger] = useState(null);
  const [loading, setLoading] = useState(false);

  const [voucherForm, setVoucherForm] = useState({
    voucherType: 'RECEIPT', amount: '', narration: '',
    debitHeadCode: 'ASSET-BANK', creditHeadCode: 'REV-HOSTEL'
  });
  const [postMsg, setPostMsg] = useState(null);

  // Daily Expense quick-entry state
  const [dailyForm, setDailyForm] = useState({
    category: 'EXP-CLEANING', amount: '', narration: '',
    paymentMode: 'ASSET-CASH', date: new Date().toISOString().split('T')[0]
  });
  const [dailyMsg, setDailyMsg] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [recentDailyExpenses, setRecentDailyExpenses] = useState([]);

  // Single-fetch guards
  const fetchedRef = useRef({});
  const headsFetchedRef = useRef(false);
  const studentsFetchedRef = useRef(false);

  const firmMap = {
    '1': 'Rajken Enterprises', '2': 'Vandana Enterprises',
    '3': 'Pushpa Enterprises', '4': 'Harish Chandra Enterprises',
    '5': 'Ramesh Enterprises', 'combined': 'Hari Pushp PG (Consolidated)'
  };

  // --- Data Fetchers ---
  const fetchData = useCallback(async (endpoint, key, setter, force = false) => {
    const cacheKey = `${key}-${selectedFloor}`;
    if (!force && fetchedRef.current[cacheKey]) return;
    fetchedRef.current[cacheKey] = true;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accounting/${endpoint}?floorNumber=${selectedFloor}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setter(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, selectedFloor]);

  const fetchDaybook = useCallback((f) => fetchData('daybook', 'db', d => setDaybook(Array.isArray(d) ? d : []), f), [fetchData]);
  const fetchTrial = useCallback((f) => fetchData('trial-balance', 'tb', setTrial, f), [fetchData]);
  const fetchPnl = useCallback((f) => fetchData('profit-loss', 'pl', setPnl, f), [fetchData]);
  const fetchBs = useCallback((f) => fetchData('balance-sheet', 'bs', setBs, f), [fetchData]);

  const fetchStudentLedger = useCallback(async (stId) => {
    if (!stId || !token) return;
    const key = `sl-${stId}`;
    if (fetchedRef.current[key]) return;
    fetchedRef.current[key] = true;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accounting/student-ledger/${stId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudentLedger(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  // Load students & heads ONCE
  useEffect(() => {
    if (!token || studentsFetchedRef.current) return;
    studentsFetchedRef.current = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/students`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (Array.isArray(data)) { setStudents(data); if (data.length > 0) setSelectedStudentId(data[0].id); }
      } catch (e) { console.error(e); }
    })();
  }, [token]);

  useEffect(() => {
    if (!token || headsFetchedRef.current) return;
    headsFetchedRef.current = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/accounting/heads`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (Array.isArray(data)) setHeads(data);
      } catch (e) { console.error(e); }
    })();
  }, [token]);

  // Tab data loading
  useEffect(() => {
    if (activeTab === 'daybook') fetchDaybook();
    else if (activeTab === 'trial') fetchTrial();
    else if (activeTab === 'pnl') fetchPnl();
    else if (activeTab === 'bs') fetchBs();
    else if (activeTab === 'student' && selectedStudentId) fetchStudentLedger(selectedStudentId);
  }, [activeTab, selectedFloor, selectedStudentId, fetchDaybook, fetchTrial, fetchPnl, fetchBs, fetchStudentLedger]);

  // When student changes, clear cache so it refetches
  const handleStudentChange = (id) => {
    setSelectedStudentId(id);
    delete fetchedRef.current[`sl-${id}`];
    setStudentLedger(null);
  };

  const handlePostVoucher = async (e) => {
    e.preventDefault();
    setPostMsg(null);
    try {
      const res = await fetch(`${API_BASE}/accounting/vouchers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...voucherForm, floorNumber: selectedFloor === 'combined' ? null : selectedFloor })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setPostMsg({ type: 'success', text: `Voucher ${data.voucherNo} posted successfully!` });
      setVoucherForm({ voucherType: 'RECEIPT', amount: '', narration: '', debitHeadCode: 'ASSET-BANK', creditHeadCode: 'REV-HOSTEL' });
      // Clear daybook cache so it refetches
      delete fetchedRef.current[`db-${selectedFloor}`];
    } catch (err) { setPostMsg({ type: 'error', text: err.message }); }
  };

  // Daily Expense quick-entry categories
  const dailyExpenseCategories = [
    { code: 'EXP-CLEANING',     label: '🧹 Cleaning & Housekeeping',   emoji: '🧹' },
    { code: 'EXP-PETTY-CASH',   label: '💰 Petty Cash / Misc',         emoji: '💰' },
    { code: 'EXP-WATER',        label: '🚰 Water & Tanker',            emoji: '🚰' },
    { code: 'EXP-TRANSPORT',    label: '🚗 Transport & Travel',        emoji: '🚗' },
    { code: 'EXP-STATIONERY',   label: '📝 Stationery & Office',       emoji: '📝' },
    { code: 'EXP-INTERNET',     label: '📶 Internet / WiFi',           emoji: '📶' },
    { code: 'EXP-PEST-CONTROL', label: '🪲 Pest Control',              emoji: '🪲' },
    { code: 'EXP-KITCHEN',      label: '🍳 Kitchen & Pantry',          emoji: '🍳' },
    { code: 'EXP-MAINT',        label: '🔧 Repairs & Maintenance',     emoji: '🔧' },
    { code: 'EXP-ELEC-UTIL',    label: '⚡ Electricity Bill',           emoji: '⚡' },
    { code: 'EXP-STAFF-SALARY', label: '👥 Staff Salary',              emoji: '👥' },
    { code: 'EXP-MESS-PAYMENT', label: '🍽️ Mess / Catering Payment',   emoji: '🍽️' },
    { code: 'EXP-OTHERS',       label: '📦 Others / General',          emoji: '📦' },
  ];

  const handlePostDailyExpense = async (e) => {
    e.preventDefault();
    setDailyMsg(null);
    setDailyLoading(true);
    try {
      const catInfo = dailyExpenseCategories.find(c => c.code === dailyForm.category);
      const res = await fetch(`${API_BASE}/accounting/vouchers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherType: 'PAYMENT',
          amount: dailyForm.amount,
          narration: dailyForm.narration,
          date: dailyForm.date,
          debitHeadCode: dailyForm.category,
          creditHeadCode: dailyForm.paymentMode,
          floorNumber: selectedFloor === 'combined' ? null : selectedFloor
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setDailyMsg({ type: 'success', text: `Expense ${data.voucherNo} recorded — ₹${dailyForm.amount} for ${catInfo?.label || dailyForm.category}` });
      // Add to recent list
      setRecentDailyExpenses(prev => [{
        voucherNo: data.voucherNo,
        date: dailyForm.date,
        category: catInfo?.label || dailyForm.category,
        amount: dailyForm.amount,
        narration: dailyForm.narration,
        paymentMode: dailyForm.paymentMode === 'ASSET-CASH' ? 'Cash' : 'Bank'
      }, ...prev].slice(0, 10));
      // Reset form but keep date and payment mode
      setDailyForm(f => ({ ...f, category: 'EXP-CLEANING', amount: '', narration: '' }));
      // Clear daybook cache
      delete fetchedRef.current[`db-${selectedFloor}`];
    } catch (err) { setDailyMsg({ type: 'error', text: err.message }); }
    finally { setDailyLoading(false); }
  };

  // CSV Export
  const exportCsv = (filename, rows) => {
    if (!rows?.length) return;
    const process = (row) => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
    const csv = 'data:text/csv;charset=utf-8,' + rows.map(process).join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csv); a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in flex flex-col gap-5 text-left print:p-0 min-h-screen">
      {/* Header */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-lg">📊</div>
          <div>
            <h1 className="text-lg font-black text-slate-900">Accounting & Ledger</h1>
            <p className="text-[11px] text-slate-500 font-medium">ICAI Standard Double-Entry Ledger System</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-500">Firm:</span>
            {isFloorWarden ? (
              <span className="text-[11px] font-black text-slate-800">{firmMap[selectedFloor]}</span>
            ) : (
              <select value={selectedFloor} onChange={(e) => { setSelectedFloor(e.target.value); fetchedRef.current = {}; }}
                className="bg-transparent text-[11px] font-black text-slate-800 outline-none cursor-pointer">
                <option value="combined">Consolidated (All Firms)</option>
                {[1,2,3,4,5].map(n => <option key={n} value={String(n)}>Floor {n} – {firmMap[String(n)]}</option>)}
              </select>
            )}
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] hover:bg-slate-200 cursor-pointer">
            <Printer size={13} /> Print
          </button>
          <button onClick={() => {
            if (activeTab === 'student' && studentLedger) {
              exportCsv(`Ledger_${studentLedger.student.name}.csv`, [
                ['Date', 'Voucher No', 'Particulars', 'Debit', 'Credit', 'Balance'],
                ...studentLedger.ledger.map(l => [fmtDate(l.date), l.voucherNo, l.particulars, l.debit || '', l.credit || '', `${l.runningBalance.toFixed(2)} Dr`]),
                ['', '', 'TOTAL', studentLedger.totalDebit, studentLedger.totalCredit, `${studentLedger.closingBalance.toFixed(2)} Dr`]
              ]);
            } else if (activeTab === 'daybook') {
              exportCsv(`DayBook.csv`, [
                ['Voucher No', 'Date', 'Type', 'Firm', 'Narration', 'Debit A/c', 'Dr Amt', 'Credit A/c', 'Cr Amt'],
                ...daybook.map(v => [v.voucherNo, fmtDate(v.date), v.voucherType, v.companyName, v.narration, v.debitHead, v.debitAmount, v.creditHead, v.creditAmount])
              ]);
            }
          }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 border-none cursor-pointer">
            <FileSpreadsheet size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 print:hidden">
        {[
          { id: 'daily', label: 'Daily Expense', icon: <Wallet size={14} /> },
          { id: 'student', label: 'Student Ledger', icon: <User size={14} /> },
          { id: 'daybook', label: 'Day Book', icon: <BookOpen size={14} /> },
          { id: 'trial', label: 'Trial Balance', icon: <Scale size={14} /> },
          { id: 'pnl', label: 'Profit & Loss', icon: <TrendingUp size={14} /> },
          { id: 'bs', label: 'Balance Sheet', icon: <Landmark size={14} /> },
          { id: 'voucher', label: 'Post Voucher', icon: <Plus size={14} /> },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-3.5 py-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
              activeTab === t.id
                ? t.id === 'daily' ? 'bg-orange-600 text-white border-orange-600' : 'bg-slate-800 text-white border-slate-800'
                : t.id === 'daily' ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}>
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── DAILY EXPENSE QUICK ENTRY ── */}
      {activeTab === 'daily' && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Form */}
          <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white">
              <h3 className="text-sm font-black flex items-center gap-2"><Wallet size={16} /> Daily Expense Entry</h3>
              <p className="text-[11px] font-medium opacity-90 mt-0.5">Quick-log your day-to-day hostel expenses</p>
            </div>

            {dailyMsg && (
              <div className={`mx-4 mt-4 p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                dailyMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}>
                {dailyMsg.type === 'success' ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}
                <span>{dailyMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePostDailyExpense} className="p-4 flex flex-col gap-4">
              {/* Date & Payment Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Date</label>
                  <input type="date" value={dailyForm.date}
                    onChange={(e) => setDailyForm({ ...dailyForm, date: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-bold bg-white outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Paid Via</label>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setDailyForm({ ...dailyForm, paymentMode: 'ASSET-CASH' })}
                      className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all border ${
                        dailyForm.paymentMode === 'ASSET-CASH'
                          ? 'bg-orange-600 text-white border-orange-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}>💵 Cash</button>
                    <button type="button" onClick={() => setDailyForm({ ...dailyForm, paymentMode: 'ASSET-BANK' })}
                      className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all border ${
                        dailyForm.paymentMode === 'ASSET-BANK'
                          ? 'bg-orange-600 text-white border-orange-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}>🏦 Bank</button>
                  </div>
                </div>
              </div>

              {/* Category Grid */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-2">Expense Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {dailyExpenseCategories.map(cat => (
                    <button type="button" key={cat.code}
                      onClick={() => setDailyForm({ ...dailyForm, category: cat.code })}
                      className={`px-2.5 py-2 rounded-lg text-[11px] font-bold text-left cursor-pointer transition-all border flex items-center gap-1.5 ${
                        dailyForm.category === cat.code
                          ? 'bg-orange-50 text-orange-800 border-orange-300 ring-1 ring-orange-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}>
                      <span className="text-sm">{cat.emoji}</span>
                      <span className="truncate">{cat.label.replace(/^.+?\s/, '')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Amount (₹)</label>
                <input type="number" required min="1" step="0.01" placeholder="e.g. 500"
                  value={dailyForm.amount}
                  onChange={(e) => setDailyForm({ ...dailyForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-sm font-black bg-white outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition-all"
                  style={{ fontSize: '16px' }} />
              </div>

              {/* Narration */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Description / Narration</label>
                <textarea required rows={2} placeholder="e.g. Bought brooms and floor cleaner from local market"
                  value={dailyForm.narration}
                  onChange={(e) => setDailyForm({ ...dailyForm, narration: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition-all resize-none" />
              </div>

              {/* Submit */}
              <button type="submit" disabled={dailyLoading}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border-none cursor-pointer transition-all ${
                  dailyLoading ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm hover:shadow-md'
                }`}>
                {dailyLoading ? (
                  <><div className="spinner" style={{ width: 14, height: 14 }} /> Recording...</>
                ) : (
                  <><Plus size={14} /> Record Expense</>
                )}
              </button>
            </form>
          </div>

          {/* Recent Expenses Sidebar */}
          <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center justify-between">
              <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Recent Entries (This Session)</h4>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{recentDailyExpenses.length}</span>
            </div>
            {recentDailyExpenses.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-2xl mb-2">📋</div>
                <p className="text-[11px] text-slate-400 font-medium">No expenses recorded yet in this session.<br />Start logging above!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {recentDailyExpenses.map((exp, i) => (
                  <div key={i} className="p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-black text-slate-800">{exp.category}</span>
                      <span className="text-xs font-black text-orange-700">₹{Number(exp.amount).toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{exp.narration}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-slate-400 font-semibold">{exp.voucherNo}</span>
                      <span className="text-[9px] text-slate-300">•</span>
                      <span className="text-[9px] text-slate-400 font-semibold">{exp.date}</span>
                      <span className="text-[9px] text-slate-300">•</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        exp.paymentMode === 'Cash' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                      }`}>{exp.paymentMode}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recentDailyExpenses.length > 0 && (
              <div className="border-t border-slate-200 bg-orange-50 p-3 flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-600">Session Total</span>
                <span className="text-sm font-black text-orange-800">
                  ₹{recentDailyExpenses.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STUDENT LEDGER ── */}
      {activeTab === 'student' && (
        <div className="flex flex-col gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
            <span className="text-xs font-bold text-slate-700">Select Student:</span>
            <select value={selectedStudentId} onChange={(e) => handleStudentChange(e.target.value)}
              className="w-full sm:w-80 p-2 rounded-lg border border-slate-300 text-xs font-bold bg-white outline-none">
              {students.map(s => <option key={s.id} value={s.id}>{s.user?.name} ({s.rollNumber}) – Room {s.room?.roomNumber || '–'}</option>)}
            </select>
          </div>

          {loading ? <div className="py-10 text-center bg-white rounded-xl border border-slate-200"><div className="spinner mx-auto" /></div>
          : !studentLedger ? <div className="py-10 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">Select a student to view ledger.</div>
          : (
            <div className="bg-white border-2 border-slate-700 rounded-lg overflow-hidden print:border-black">
              {/* Header */}
              <div className="bg-[#a3d18c] text-slate-950 font-black text-center py-2 text-base uppercase border-b-2 border-slate-700 tracking-wide">
                General Ledger
              </div>
              <div className="p-3 border-b-2 border-slate-700 text-center">
                <div className="font-black text-sm text-slate-900">{firmMap[selectedFloor] || 'Hari Pushp PG'}</div>
                <div className="text-[10px] text-slate-600 font-medium">Hari Pushp Girls Hostel Complex</div>
              </div>

              {/* Party Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 text-xs border-b-2 border-slate-700 divide-y md:divide-y-0 md:divide-x divide-slate-700">
                <div className="p-2.5 space-y-0.5">
                  <div><b className="text-slate-800">Party Name:</b> <span className="font-black text-sm">{studentLedger.student.name}</span></div>
                  <div><b className="text-slate-800">Address:</b> <span className="font-medium">Room {studentLedger.student.roomNumber} (Bed: {studentLedger.student.bedId})</span></div>
                  <div><b className="text-slate-800">Roll No:</b> <span className="font-mono font-bold">{studentLedger.student.rollNumber}</span></div>
                </div>
                <div className="p-2.5 space-y-0.5 bg-slate-50/50">
                  <div className="flex justify-between"><b>Date:</b> <span className="font-mono font-bold">
                    {studentLedger.periodFrom ? `${fmtDate(studentLedger.periodFrom)} to ${fmtDate(studentLedger.periodTo)}` : '–'}
                  </span></div>
                  <div className="flex justify-between border-t border-slate-300 pt-0.5"><b>Opening Bal:</b> <span className="font-mono font-bold">0.00 Dr</span></div>
                  <div className="flex justify-between border-t border-slate-300 pt-0.5"><b>Closing Bal:</b>
                    <span className={`font-mono font-black ${studentLedger.closingBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {fmt(Math.abs(studentLedger.closingBalance))} {studentLedger.closingBalance > 0 ? 'Dr' : studentLedger.closingBalance < 0 ? 'Cr' : '–'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-200 font-black uppercase border-b-2 border-slate-700 text-slate-900">
                    <tr>
                      <th className="p-2 border-r border-slate-400 w-20 text-center">Type</th>
                      <th className="p-2 border-r border-slate-400 w-24 text-center">Date</th>
                      <th className="p-2 border-r border-slate-400 w-28">Voucher No</th>
                      <th className="p-2 border-r border-slate-400">Particular</th>
                      <th className="p-2 border-r border-slate-400 w-24 text-right">Debit (₹)</th>
                      <th className="p-2 border-r border-slate-400 w-24 text-right">Credit (₹)</th>
                      <th className="p-2 w-28 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {studentLedger.ledger.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-300 text-center font-bold">{r.type === 'DEMAND_NOTE' ? 'Invoice' : 'Receipt'}</td>
                        <td className="p-2 border-r border-slate-300 text-center">{fmtDate(r.date)}</td>
                        <td className="p-2 border-r border-slate-300 font-mono font-bold">{r.voucherNo}</td>
                        <td className="p-2 border-r border-slate-300 font-semibold">{r.particulars}</td>
                        <td className="p-2 border-r border-slate-300 text-right font-bold text-rose-700">{r.debit > 0 ? fmt(r.debit) : ''}</td>
                        <td className="p-2 border-r border-slate-300 text-right font-bold text-emerald-700">{r.credit > 0 ? fmt(r.credit) : ''}</td>
                        <td className="p-2 text-right font-black">{fmt(Math.abs(r.runningBalance))} {r.runningBalance >= 0 ? 'Dr' : 'Cr'}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 border-t-2 border-slate-700 font-black text-xs">
                      <td className="p-2 border-r border-slate-400 text-center" colSpan={4}>Total</td>
                      <td className="p-2 border-r border-slate-400 text-right text-rose-700">{fmt(studentLedger.totalDebit)}</td>
                      <td className="p-2 border-r border-slate-400 text-right text-emerald-700">{fmt(studentLedger.totalCredit)}</td>
                      <td className="p-2 text-right">{fmt(Math.abs(studentLedger.closingBalance))} {studentLedger.closingBalance >= 0 ? 'Dr' : 'Cr'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DAY BOOK ── */}
      {activeTab === 'daybook' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800">Day Book (Voucher Register)</h3>
            <button onClick={() => fetchDaybook(true)} className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 hover:text-emerald-700 cursor-pointer">
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
          {loading ? <div className="py-10 text-center"><div className="spinner mx-auto" /></div>
          : daybook.length === 0 ? <div className="py-10 text-center text-slate-400 text-xs">No vouchers recorded.</div>
          : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 font-bold uppercase text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Voucher No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Firm</th>
                    <th className="p-3">Narration</th>
                    <th className="p-3">Debit A/c</th>
                    <th className="p-3 text-right">Dr (₹)</th>
                    <th className="p-3">Credit A/c</th>
                    <th className="p-3 text-right">Cr (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {daybook.map((v, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{v.voucherNo}</td>
                      <td className="p-3 text-slate-600">{fmtDate(v.date)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          v.voucherType === 'RECEIPT' ? 'bg-emerald-100 text-emerald-800' :
                          v.voucherType === 'PAYMENT' ? 'bg-rose-100 text-rose-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>{v.voucherType}</span>
                      </td>
                      <td className="p-3 text-slate-700 font-semibold">{v.companyName || '–'}</td>
                      <td className="p-3 text-slate-800">{v.narration}</td>
                      <td className="p-3 text-slate-600 font-medium">{v.debitHead}</td>
                      <td className="p-3 text-right font-bold text-rose-700">{fmtInr(v.debitAmount)}</td>
                      <td className="p-3 text-slate-600 font-medium">{v.creditHead}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">{fmtInr(v.creditAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TRIAL BALANCE ── */}
      {activeTab === 'trial' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800">Trial Balance</h3>
            {trial && (
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${trial.isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {trial.isBalanced ? '✓ Balanced' : '⚠ Unbalanced'}
              </span>
            )}
          </div>
          {loading || !trial ? <div className="py-10 text-center"><div className="spinner mx-auto" /></div> : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 font-bold uppercase text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Ledger A/c Code</th>
                    <th className="p-3">Account Head</th>
                    <th className="p-3">Group</th>
                    <th className="p-3 text-right">Debit (₹)</th>
                    <th className="p-3 text-right">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trial.summary.map(r => (
                    <tr key={r.code} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-slate-500 font-bold">{r.code}</td>
                      <td className="p-3 font-bold text-slate-900">{r.name}</td>
                      <td className="p-3 text-slate-500">{r.group}</td>
                      <td className="p-3 text-right font-bold">{r.closingDebit > 0 ? fmtInr(r.closingDebit) : ''}</td>
                      <td className="p-3 text-right font-bold">{r.closingCredit > 0 ? fmtInr(r.closingCredit) : ''}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900">
                    <td className="p-3" colSpan={3}>TOTAL</td>
                    <td className="p-3 text-right">{fmtInr(trial.totalDebit)}</td>
                    <td className="p-3 text-right">{fmtInr(trial.totalCredit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PROFIT & LOSS ── */}
      {activeTab === 'pnl' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-4">
          <h3 className="text-sm font-black text-slate-800">Profit & Loss Account (Income & Expenditure)</h3>
          {loading || !pnl ? <div className="py-10 text-center"><div className="spinner mx-auto" /></div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Income Side */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-emerald-50 border-b border-emerald-200 p-3 font-black text-xs text-emerald-900 uppercase tracking-wider">
                  Income (Credit Side)
                </div>
                <div className="divide-y divide-slate-100">
                  {pnl.incomeBreakdown.map((h, i) => (
                    <div key={i} className="flex justify-between p-3 text-xs">
                      <span className="font-medium text-slate-800">{h.name}</span>
                      <span className="font-bold text-slate-900">{fmtInr(h.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between p-3 text-xs bg-emerald-50 font-black text-emerald-900 border-t-2 border-emerald-300">
                    <span>Total Income</span>
                    <span>{fmtInr(pnl.totalIncome)}</span>
                  </div>
                </div>
              </div>

              {/* Expense Side */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-rose-50 border-b border-rose-200 p-3 font-black text-xs text-rose-900 uppercase tracking-wider">
                  Expenditure (Debit Side)
                </div>
                <div className="divide-y divide-slate-100">
                  {pnl.expenseBreakdown.map((h, i) => (
                    <div key={i} className="flex justify-between p-3 text-xs">
                      <span className="font-medium text-slate-800">{h.name}</span>
                      <span className="font-bold text-slate-900">{fmtInr(h.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between p-3 text-xs bg-rose-50 font-black text-rose-900 border-t-2 border-rose-300">
                    <span>Total Expenditure</span>
                    <span>{fmtInr(pnl.totalExpenses)}</span>
                  </div>
                </div>
              </div>

              {/* Net Result */}
              <div className="md:col-span-2 p-4 rounded-xl bg-slate-800 text-white flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider">Net {pnl.netProfit >= 0 ? 'Surplus (Profit)' : 'Deficit (Loss)'}</span>
                <span className={`text-xl font-black ${pnl.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtInr(Math.abs(pnl.netProfit))}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BALANCE SHEET ── */}
      {activeTab === 'bs' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-4">
          <h3 className="text-sm font-black text-slate-800">Balance Sheet (as per ICAI Schedule III)</h3>
          {loading || !bs ? <div className="py-10 text-center"><div className="spinner mx-auto" /></div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Equity & Liabilities */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-blue-50 border-b border-blue-200 p-3 font-black text-xs text-blue-900 uppercase tracking-wider">
                  I. Equity & Liabilities
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="p-3 text-xs">
                    <div className="font-bold text-slate-600 uppercase text-[10px] mb-1">Capital & Surplus</div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-800">Retained Earnings (Net Profit)</span>
                      <span className="font-bold text-slate-900">{fmtInr(bs.netProfit)}</span>
                    </div>
                  </div>
                  {bs.liabilityBreakdown.map((h, i) => (
                    <div key={i} className="flex justify-between p-3 text-xs">
                      <span className="font-medium text-slate-800">{h.name}</span>
                      <span className="font-bold text-slate-900">{fmtInr(h.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between p-3 text-xs bg-blue-50 font-black text-blue-900 border-t-2 border-blue-300">
                    <span>Total Equity & Liabilities</span>
                    <span>{fmtInr(bs.totalEquityAndLiabilities)}</span>
                  </div>
                </div>
              </div>

              {/* Assets */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-amber-50 border-b border-amber-200 p-3 font-black text-xs text-amber-900 uppercase tracking-wider">
                  II. Assets
                </div>
                <div className="divide-y divide-slate-100">
                  {bs.assetBreakdown.map((h, i) => (
                    <div key={i} className="flex justify-between p-3 text-xs">
                      <span className="font-medium text-slate-800">{h.name}</span>
                      <span className="font-bold text-slate-900">{fmtInr(h.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between p-3 text-xs bg-amber-50 font-black text-amber-900 border-t-2 border-amber-300">
                    <span>Total Assets</span>
                    <span>{fmtInr(bs.totalAssets)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── POST VOUCHER ── */}
      {activeTab === 'voucher' && (
        <div className="bg-white p-5 max-w-xl border border-slate-200 rounded-xl">
          <h3 className="text-sm font-black text-slate-800 mb-3">Post Voucher Entry</h3>
          {postMsg && (
            <div className={`p-3 rounded-lg mb-3 text-xs font-semibold flex items-center gap-2 ${
              postMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              {postMsg.type === 'success' ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}
              <span>{postMsg.text}</span>
            </div>
          )}
          <form onSubmit={handlePostVoucher} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Voucher Type</label>
                <select value={voucherForm.voucherType} onChange={(e) => setVoucherForm({ ...voucherForm, voucherType: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs font-bold">
                  <option value="RECEIPT">Receipt (प्राप्ति)</option>
                  <option value="PAYMENT">Payment (भुगतान)</option>
                  <option value="JOURNAL">Journal (जर्नल)</option>
                  <option value="CONTRA">Contra (कॉन्ट्रा)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Amount (₹)</label>
                <input type="number" required min="1" placeholder="e.g. 14000"
                  value={voucherForm.amount} onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs font-bold" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Debit A/c (Dr)</label>
                <select value={voucherForm.debitHeadCode} onChange={(e) => setVoucherForm({ ...voucherForm, debitHeadCode: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs font-semibold">
                  {heads.map(h => <option key={h.code} value={h.code}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Credit A/c (Cr)</label>
                <select value={voucherForm.creditHeadCode} onChange={(e) => setVoucherForm({ ...voucherForm, creditHeadCode: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs font-semibold">
                  {heads.map(h => <option key={h.code} value={h.code}>{h.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Narration</label>
              <textarea required rows={2} placeholder="e.g. Received hostel rent from Sneha Patel"
                value={voucherForm.narration} onChange={(e) => setVoucherForm({ ...voucherForm, narration: e.target.value })}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 border-none cursor-pointer">
              <Plus size={14} /> Post Voucher
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
