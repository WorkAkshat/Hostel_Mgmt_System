import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen, Receipt, FileText, Scale, TrendingUp, Landmark,
  Plus, Search, RefreshCw, ChevronRight, CheckCircle2, ShieldAlert
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:9000/api/v1';
const fmtInr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function TallyAccounting() {
  const { user } = useAuth();
  const token = user?.token || localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Firm scope state
  const isFloorWarden = user?.role === 'ADMIN' && user?.assignedFloor;
  const [selectedFloor, setSelectedFloor] = useState(isFloorWarden ? String(user.assignedFloor) : 'combined');

  // Active accounting tab
  const [activeTab, setActiveTab] = useState('daybook'); // 'daybook' | 'ledger' | 'trial' | 'pnl' | 'bs' | 'voucher'

  // Data states
  const [daybook, setDaybook] = useState([]);
  const [trial, setTrial] = useState(null);
  const [pnl, setPnl] = useState(null);
  const [bs, setBs] = useState(null);
  const [heads, setHeads] = useState([]);
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

  // Fetch Day Book
  const fetchDaybook = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accounting/daybook?floorNumber=${selectedFloor}`, { headers });
      const data = await res.json();
      setDaybook(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedFloor]);

  // Fetch Trial Balance
  const fetchTrial = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accounting/trial-balance?floorNumber=${selectedFloor}`, { headers });
      const data = await res.json();
      setTrial(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedFloor]);

  // Fetch P&L
  const fetchPnl = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accounting/profit-loss?floorNumber=${selectedFloor}`, { headers });
      const data = await res.json();
      setPnl(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedFloor]);

  // Fetch Balance Sheet
  const fetchBs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accounting/balance-sheet?floorNumber=${selectedFloor}`, { headers });
      const data = await res.json();
      setBs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedFloor]);

  // Fetch Account Heads
  const fetchHeads = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/accounting/heads`, { headers });
      const data = await res.json();
      setHeads(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchHeads();
  }, [fetchHeads]);

  useEffect(() => {
    if (activeTab === 'daybook') fetchDaybook();
    else if (activeTab === 'trial') fetchTrial();
    else if (activeTab === 'pnl') fetchPnl();
    else if (activeTab === 'bs') fetchBs();
  }, [activeTab, selectedFloor, fetchDaybook, fetchTrial, fetchPnl, fetchBs]);

  const handlePostVoucher = async (e) => {
    e.preventDefault();
    setPostMsg(null);
    try {
      const res = await fetch(`${API_BASE}/accounting/vouchers`, {
        method: 'POST',
        headers,
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
      fetchDaybook();
    } catch (err) {
      setPostMsg({ type: 'error', text: err.message });
    }
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
    <div className="animate-fade-in flex flex-col gap-6 text-left">
      {/* Tally Style Header */}
      <div className="rounded-[20px] bg-slate-900 text-white p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-black text-xl">
                T
              </div>
              <div>
                <h1 className="text-xl font-black tracking-wide text-white">Tally ERP Financial Accounting Ledger</h1>
                <p className="text-xs text-slate-400 mt-0.5">Double-Entry General Ledger, Day Book, P&L Statement & Balance Sheet</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Firm Scope Switcher */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-semibold text-slate-400">Firm Scope:</span>
              {isFloorWarden ? (
                <span className="text-xs font-bold text-emerald-400">{firmNameMap[selectedFloor]}</span>
              ) : (
                <select
                  value={selectedFloor}
                  onChange={(e) => setSelectedFloor(e.target.value)}
                  className="bg-transparent text-xs font-bold text-emerald-400 outline-none cursor-pointer"
                >
                  <option value="combined" className="bg-slate-900 text-white">Consolidated (All 5 Firms)</option>
                  <option value="1" className="bg-slate-900 text-white">Floor 1 – Rajken Enterprises</option>
                  <option value="2" className="bg-slate-900 text-white">Floor 2 – Vandana Enterprises</option>
                  <option value="3" className="bg-slate-900 text-white">Floor 3 – Pushpa Enterprises</option>
                  <option value="4" className="bg-slate-900 text-white">Floor 4 – Harish Chandra Ent.</option>
                  <option value="5" className="bg-slate-900 text-white">Floor 5 – Ramesh Enterprises</option>
                </select>
              )}
            </div>

            <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl">
              F.Y. 2026-2027
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'daybook', label: '📖 Day Book (दैनिक बही)', icon: <BookOpen size={16} /> },
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
        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Transaction Vouchers Register (Day Book)</h3>
            <button onClick={fetchDaybook} className="text-xs text-slate-500 flex items-center gap-1 hover:text-slate-800">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center"><div className="spinner mx-auto" /></div>
          ) : daybook.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No vouchers recorded for this firm scope.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-300 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Voucher No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Operating Firm</th>
                    <th className="p-3">Particulars / Narration</th>
                    <th className="p-3 text-right">Debit (Dr)</th>
                    <th className="p-3 text-right">Credit (Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {daybook.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-700">{v.voucherNo}</td>
                      <td className="p-3 text-slate-500">{new Date(v.date).toLocaleDateString('en-IN')}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          v.voucherType === 'RECEIPT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {v.voucherType}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-semibold">{v.companyName || 'Consolidated'}</td>
                      <td className="p-3 text-slate-700">{v.narration}</td>
                      <td className="p-3 text-right font-bold text-slate-800">{fmtInr(v.amount)}</td>
                      <td className="p-3 text-right font-bold text-slate-800">{fmtInr(v.amount)}</td>
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
        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Trial Balance Ledger Summary</h3>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${trial.isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {trial.isBalanced ? '✓ Balanced (Dr = Cr)' : '⚠️ Unbalanced Ledger'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-300 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Account Head Name</th>
                  <th className="p-3">Group Category</th>
                  <th className="p-3 text-right">Debit (Dr) Amount</th>
                  <th className="p-3 text-right">Credit (Cr) Amount</th>
                  <th className="p-3 text-right">Net Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {trial.summary.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-500 font-bold">{row.code}</td>
                    <td className="p-3 font-bold text-slate-800">{row.name}</td>
                    <td className="p-3 text-slate-500">{row.group} ({row.category})</td>
                    <td className="p-3 text-right font-semibold text-slate-700">{fmtInr(row.debit)}</td>
                    <td className="p-3 text-right font-semibold text-slate-700">{fmtInr(row.credit)}</td>
                    <td className="p-3 text-right font-black text-slate-900">{fmtInr(Math.abs(row.netBalance))} {row.netBalance >= 0 ? 'Dr' : 'Cr'}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-black text-slate-900 text-sm">
                  <td className="p-3" colSpan={3}>TOTAL BALANCE</td>
                  <td className="p-3 text-right text-emerald-700">{fmtInr(trial.totalDebit)}</td>
                  <td className="p-3 text-right text-emerald-700">{fmtInr(trial.totalCredit)}</td>
                  <td className="p-3 text-right" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PROFIT & LOSS TAB ── */}
      {activeTab === 'pnl' && pnl && (
        <div className="glass-card p-6 flex flex-col gap-6">
          <h3 className="text-sm font-bold text-slate-800">Profit & Loss Statement</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Revenue Income</span>
              <div className="text-xl font-black text-emerald-900 mt-1">{fmtInr(pnl.totalIncome)}</div>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Total Operating Expenses</span>
              <div className="text-xl font-black text-rose-900 mt-1">{fmtInr(pnl.totalExpenses)}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Net Operating Surplus / Profit</span>
              <div className="text-xl font-black text-emerald-300 mt-1">{fmtInr(pnl.netProfit)}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── BALANCE SHEET TAB ── */}
      {activeTab === 'bs' && bs && (
        <div className="glass-card p-6 flex flex-col gap-6">
          <h3 className="text-sm font-bold text-slate-800">Balance Sheet Statement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Liabilities */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 pb-2">Capital & Liabilities</h4>
              <div className="flex justify-between text-xs font-medium py-1">
                <span>Capital & Surplus Reserves</span>
                <span className="font-bold text-slate-800">{fmtInr(bs.capitalAndReserves)}</span>
              </div>
              <div className="flex justify-between text-xs font-medium py-1">
                <span>Student Refundable Deposits</span>
                <span className="font-bold text-slate-800">{fmtInr(bs.totalLiabilities)}</span>
              </div>
              <div className="border-t border-slate-300 pt-2 flex justify-between font-black text-slate-900 text-sm">
                <span>TOTAL LIABILITIES</span>
                <span>{fmtInr(bs.totalAssets)}</span>
              </div>
            </div>

            {/* Assets */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 pb-2">Assets & Cash Balances</h4>
              <div className="flex justify-between text-xs font-medium py-1">
                <span>Current Bank & Cash Assets</span>
                <span className="font-bold text-slate-800">{fmtInr(bs.totalAssets)}</span>
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
        <div className="glass-card p-6 max-w-2xl">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Post Tally Accounting Voucher</h3>

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

            <button type="submit" className="w-full py-3 bg-slate-900 text-emerald-400 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md">
              <Plus size={16} /> Post Voucher to Tally Ledger
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
