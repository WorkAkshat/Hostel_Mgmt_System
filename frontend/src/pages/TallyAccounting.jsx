import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, BookUser, Download, FilePlus2, Landmark, Printer, RefreshCw, Scale, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accounting as accountingApi, floors as floorsApi, students as studentsApi } from '../utils/api';
import { useToast } from '../components/ui/Toast';
import { ErrorPanel, PageHeader } from '../components/ui/PageStates';
import { downloadCsv } from '../utils/format';
import DailyExpense from './tally/DailyExpense';
import StudentLedger from './tally/StudentLedger';
import VoucherForm from './tally/VoucherForm';
import { BalanceSheet, DayBook, ProfitLoss, TrialBalance } from './tally/Statements';
import { shortDate } from './tally/tallyUtils';

const TABS = [
  { id: 'daily', label: 'Expenses', icon: Wallet },
  { id: 'student', label: 'Student ledger', icon: BookUser },
  { id: 'daybook', label: 'Day book', icon: BookOpen },
  { id: 'trial', label: 'Trial balance', icon: Scale },
  { id: 'pnl', label: 'Profit & loss', icon: TrendingUp },
  { id: 'bs', label: 'Balance sheet', icon: Landmark },
  { id: 'voucher', label: 'New voucher', icon: FilePlus2 },
];

// Which statement each tab needs from the server
const LOADERS = {
  daily: ['daybook', accountingApi.getDayBook],
  daybook: ['daybook', accountingApi.getDayBook],
  trial: ['trial', accountingApi.getTrialBalance],
  pnl: ['pnl', accountingApi.getProfitLoss],
  bs: ['bs', accountingApi.getBalanceSheet],
};

const TallyAccounting = () => {
  const { user } = useAuth();
  const toast = useToast();
  const lockedFloor = user?.role === 'ADMIN' && user?.assignedFloor ? String(user.assignedFloor) : null;
  const [floor, setFloor] = useState(lockedFloor || 'combined');
  const [tab, setTab] = useState('daily');
  const [floors, setFloors] = useState([]);
  const [heads, setHeads] = useState([]);
  const [students, setStudents] = useState([]);
  const [data, setData] = useState({}); // { daybook, trial, pnl, bs } for the current floor
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [ledger, setLedger] = useState(null);

  useEffect(() => {
    floorsApi.getAll().then((f) => setFloors(f || [])).catch(() => {});
    accountingApi.getHeads().then((h) => setHeads(Array.isArray(h) ? h : [])).catch(() => {});
    studentsApi.getAll().then((s) => setStudents(Array.isArray(s) ? s : [])).catch(() => {});
  }, []);

  const firmName = floor === 'combined'
    ? 'All companies'
    : floors.find((f) => String(f.floorNumber) === floor)?.companyName || `Floor ${floor}`;

  const load = useCallback(async (which, force = false) => {
    const entry = LOADERS[which];
    if (!entry) return;
    const [key, fetcher] = entry;
    if (!force && data[key]) return;
    try {
      setError(null);
      const res = await fetcher(floor);
      setData((d) => ({ ...d, [key]: key === 'daybook' ? (Array.isArray(res) ? res : []) : res }));
    } catch (err) {
      setError(err.message || 'Could not load the ledger.');
    }
  }, [floor, data]);

  // Reset cached statements when the firm changes
  useEffect(() => {
    setData({});
  }, [floor]);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const refresh = () => {
    setData({});
  };

  const syncAll = async () => {
    setSyncing(true);
    try {
      const res = await accountingApi.sync();
      toast.success('Ledger synced', `${res.stats?.totalSynced || 0} fee receipts posted.`);
      refresh();
    } catch (err) {
      toast.error('Sync failed', err.message);
    } finally {
      setSyncing(false);
    }
  };

  const exportCsv = () => {
    if (tab === 'student' && ledger) {
      downloadCsv(`ledger-${ledger.student.rollNumber}.csv`, ['Date', 'Voucher no.', 'Particulars', 'Debit', 'Credit', 'Balance'], [
        ...ledger.ledger.map((l) => [shortDate(l.date), l.voucherNo, l.particulars, l.debit || '', l.credit || '', l.runningBalance.toFixed(2)]),
        ['', '', 'Total', ledger.totalDebit, ledger.totalCredit, ledger.closingBalance.toFixed(2)],
      ]);
    } else if (tab === 'trial' && data.trial) {
      downloadCsv(`trial-balance-${floor}.csv`, ['Code', 'Account', 'Group', 'Debit', 'Credit'], [
        ...data.trial.summary.map((r) => [r.code, r.name, r.group, r.closingDebit || '', r.closingCredit || '']),
        ['', 'Total', '', data.trial.totalDebit, data.trial.totalCredit],
      ]);
    } else if (data.daybook) {
      downloadCsv(`day-book-${floor}.csv`, ['Voucher no.', 'Date', 'Type', 'Firm', 'Narration', 'Debit a/c', 'Debit', 'Credit a/c', 'Credit'],
        data.daybook.map((v) => [v.voucherNo, shortDate(v.date), v.voucherType, v.companyName, v.narration, v.debitHead, v.debitAmount, v.creditHead, v.creditAmount]));
    }
  };
  const canExport = (tab === 'student' && ledger) || (tab === 'trial' && data.trial) || ((tab === 'daybook' || tab === 'daily') && data.daybook?.length);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Tally Ledger" subtitle={`Double-entry books · ${firmName}`}>
        {lockedFloor ? (
          <span className="h-10 px-3 rounded-xl bg-mint-50 border border-[var(--border-color)] text-[13px] font-semibold flex items-center">{firmName}</span>
        ) : (
          <select className="form-input w-auto cursor-pointer print:hidden" value={floor} onChange={(e) => setFloor(e.target.value)} aria-label="Firm">
            <option value="combined">All companies</option>
            {floors.map((f) => <option key={f.floorNumber} value={String(f.floorNumber)}>Floor {f.floorNumber} · {f.companyName}</option>)}
          </select>
        )}
        <button className="btn-brand print:hidden" onClick={syncAll} disabled={syncing} title="Post paid rent, mess and electricity receipts into the ledger">
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing…' : 'Sync receipts'}
        </button>
        <button className="btn-secondary print:hidden" onClick={() => window.print()} aria-label="Print"><Printer size={16} /></button>
        <button className="btn-secondary print:hidden" onClick={exportCsv} disabled={!canExport} aria-label="Export CSV"><Download size={16} /></button>
      </PageHeader>

      <div className="overflow-x-auto -mx-1 px-1 print:hidden" role="tablist" aria-label="Ledger views">
        <div className="inline-flex gap-1 p-1 rounded-2xl bg-white border border-[var(--border-color)]">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id)}
                className={`relative h-9 px-3.5 rounded-xl text-[13px] whitespace-nowrap border-none bg-transparent cursor-pointer flex items-center gap-1.5 ${active ? 'text-sun-900 font-semibold' : 'text-[var(--text-secondary)] font-medium hover:text-[var(--text-primary)]'}`}
              >
                {active && <motion.span layoutId="tally-tab" className="absolute inset-0 rounded-xl bg-sun-300" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <Icon size={15} className="relative" />
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <ErrorPanel message={error} onRetry={() => load(tab, true)} />}

      <motion.div key={`${tab}-${floor}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {tab === 'daily' && <DailyExpense floor={floor} daybook={data.daybook} onPosted={() => load('daybook', true)} />}
        {tab === 'student' && <StudentLedger students={students} firmName={firmName} onLedger={setLedger} />}
        {tab === 'daybook' && <DayBook rows={data.daybook} />}
        {tab === 'trial' && <TrialBalance data={data.trial} />}
        {tab === 'pnl' && <ProfitLoss data={data.pnl} />}
        {tab === 'bs' && <BalanceSheet data={data.bs} />}
        {tab === 'voucher' && <VoucherForm heads={heads} floor={floor} onPosted={refresh} />}
      </motion.div>
    </div>
  );
};

export default TallyAccounting;
