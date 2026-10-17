import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookUser } from 'lucide-react';
import { accounting as accountingApi } from '../../utils/api';
import Avatar from '../../components/ui/Avatar';
import { EmptyPanel, ErrorPanel, SearchBox } from '../../components/ui/PageStates';
import { inr, money, panel, shortDate } from './tallyUtils';

const balanceText = (n) => `${money(Math.abs(n))} ${n > 0 ? 'Dr' : n < 0 ? 'Cr' : ''}`.trim();

// Party ledger for one resident: bills (debit) and receipts (credit) with a running balance.
const StudentLedger = ({ students, firmName, onLedger }) => {
  const [studentId, setStudentId] = useState('');
  const [query, setQuery] = useState('');
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter((s) => !q || [s.user?.name, s.rollNumber, s.room?.roomNumber].some((v) => v && String(v).toLowerCase().includes(q)))
      .slice(0, 50);
  }, [students, query]);

  useEffect(() => {
    if (!studentId) return undefined;
    let alive = true;
    setLoading(true);
    setError(null);
    accountingApi.getStudentLedger(studentId)
      .then((d) => { if (alive) { setLedger(d); onLedger(d); } })
      .catch((err) => { if (alive) setError(err.message || 'Could not load the ledger.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [studentId, onLedger]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
      <aside className={`${panel} p-3 flex flex-col gap-2 lg:sticky lg:top-[calc(var(--header-height)+16px)] print:hidden`}>
        <SearchBox value={query} onChange={setQuery} placeholder="Find a resident" />
        <ul className="list-none m-0 p-0 max-h-[420px] lg:max-h-[60vh] overflow-y-auto custom-scrollbar">
          {matches.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setStudentId(s.id)}
                aria-pressed={studentId === s.id}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border-none cursor-pointer text-left ${studentId === s.id ? 'bg-sun-200' : 'bg-transparent hover:bg-mint-50'}`}
              >
                <Avatar name={s.user?.name} src={s.user?.avatar || s.profilePic} size={30} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold truncate">{s.user?.name}</span>
                  <span className="block text-[11px] text-[var(--text-tertiary)]">{s.rollNumber}{s.room ? ` · Room ${s.room.roomNumber}` : ''}</span>
                </span>
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="px-3 py-4 text-[13px] text-[var(--text-tertiary)]">No resident found.</li>}
        </ul>
      </aside>

      <div className="min-w-0">
        {error ? <ErrorPanel message={error} /> : !studentId ? (
          <EmptyPanel icon={BookUser} title="Choose a resident" text="Their bills, payments and balance appear here, ready to print." />
        ) : loading || !ledger ? (
          <div className={`${panel} h-[320px] skeleton-loading`} />
        ) : (
          <motion.section key={studentId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`${panel} overflow-hidden`}>
            <header className="px-5 py-4 bg-mint-50 border-b border-[var(--border-color)] flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700 m-0">Party ledger · {firmName}</p>
                <h2 className="text-[18px] font-bold m-0 mt-0.5">{ledger.student.name}</h2>
                <p className="text-[12px] text-[var(--text-secondary)] m-0">
                  {ledger.student.rollNumber} · Room {ledger.student.roomNumber}{ledger.student.bedId ? ` (bed ${ledger.student.bedId})` : ''}
                  {ledger.periodFrom ? ` · ${shortDate(ledger.periodFrom)} – ${shortDate(ledger.periodTo)}` : ''}
                </p>
              </div>
              <div className="text-right">
                <span className="block text-[12px] text-[var(--text-secondary)]">Closing balance</span>
                <span className={`block text-[22px] font-bold ${ledger.closingBalance > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>₹{balanceText(ledger.closingBalance)}</span>
                <span className="block text-[11px] text-[var(--text-tertiary)]">{ledger.closingBalance > 0 ? 'Resident owes' : ledger.closingBalance < 0 ? 'Paid in advance' : 'Settled'}</span>
              </div>
            </header>
            {ledger.ledger.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-[var(--text-tertiary)] m-0">No bills or receipts for this resident yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-color)]">
                      <th className="text-left font-semibold px-5 py-2.5">Date</th>
                      <th className="text-left font-semibold px-3 py-2.5">Particulars</th>
                      <th className="text-right font-semibold px-3 py-2.5">Debit</th>
                      <th className="text-right font-semibold px-3 py-2.5">Credit</th>
                      <th className="text-right font-semibold px-5 py-2.5">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.ledger.map((r, i) => (
                      <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]">
                        <td className="px-5 py-2.5 whitespace-nowrap">{shortDate(r.date)}</td>
                        <td className="px-3 py-2.5 min-w-[200px]">
                          <div>{r.particulars}</div>
                          <div className="text-[11px] text-[var(--text-tertiary)]">{r.type === 'DEMAND_NOTE' ? 'Bill' : 'Receipt'} · {r.voucherNo}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-[var(--danger)]">{r.debit > 0 ? money(r.debit) : ''}</td>
                        <td className="px-3 py-2.5 text-right text-[var(--success)]">{r.credit > 0 ? money(r.credit) : ''}</td>
                        <td className="px-5 py-2.5 text-right font-semibold whitespace-nowrap">{balanceText(r.runningBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-cream-100 font-bold">
                      <td className="px-5 py-3" colSpan={2}>Total</td>
                      <td className="px-3 py-3 text-right">{inr(ledger.totalDebit)}</td>
                      <td className="px-3 py-3 text-right">{inr(ledger.totalCredit)}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">{balanceText(ledger.closingBalance)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </motion.section>
        )}
      </div>
    </div>
  );
};

export default StudentLedger;
