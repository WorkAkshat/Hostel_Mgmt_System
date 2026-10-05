import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CircleCheck, TriangleAlert } from 'lucide-react';
import FilterChips from '../../components/ui/FilterChips';
import { EmptyPanel, SearchBox } from '../../components/ui/PageStates';
import { GROUP_LABELS, VOUCHER_TYPES, inr, panel, shortDate, voucherBadge } from './tallyUtils';

const Loading = () => (
  <div className={`${panel} p-5 flex flex-col gap-3`} aria-busy="true">
    {[0, 1, 2, 3].map((i) => <div key={i} className="h-11 rounded-xl skeleton-loading" />)}
  </div>
);

// ---------- Day book ----------
export const DayBook = ({ rows }) => {
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows || [])
      .filter((v) => type === 'all' || v.voucherType === type)
      .filter((v) => !q || [v.voucherNo, v.narration, v.debitHead, v.creditHead, v.companyName].some((x) => x && String(x).toLowerCase().includes(q)));
  }, [rows, type, search]);

  if (!rows) return <Loading />;
  const counts = Object.fromEntries(VOUCHER_TYPES.map((t) => [t.value, rows.filter((r) => r.voucherType === t.value).length]));

  return (
    <div className="flex flex-col gap-3">
      <div className={`${panel} p-4 flex flex-col lg:flex-row gap-3 lg:items-center`}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search voucher no., narration or account" className="flex-1" />
        <FilterChips id="db-type" value={type} onChange={setType} options={[{ value: 'all', label: 'All', count: rows.length }, ...VOUCHER_TYPES.filter((t) => counts[t.value]).map((t) => ({ value: t.value, label: t.label, count: counts[t.value] }))]} />
      </div>
      {shown.length === 0 ? (
        <EmptyPanel icon={BookOpen} title={rows.length ? 'No vouchers match' : 'No vouchers yet'} text={rows.length ? 'Try another search or type.' : 'Record an expense or sync fee receipts to start the day book.'} />
      ) : (
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Voucher</th>
                <th>Narration</th>
                <th>Debit</th>
                <th>Credit</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((v, i) => (
                <motion.tr key={`${v.id}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: Math.min(i, 12) * 0.015 } }}>
                  <td className="whitespace-nowrap">
                    <div className="font-semibold">{v.voucherNo}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`badge normal-case ${voucherBadge(v.voucherType)}`}>{VOUCHER_TYPES.find((t) => t.value === v.voucherType)?.label || v.voucherType}</span>
                      <span className="text-[12px] text-[var(--text-tertiary)]">{shortDate(v.date)}</span>
                    </div>
                  </td>
                  <td className="min-w-[220px]">
                    <div>{v.narration}</div>
                    {v.companyName && <div className="text-[12px] text-[var(--text-tertiary)]">{v.companyName}</div>}
                  </td>
                  <td className="text-[13px] min-w-[150px]">{v.debitHead}</td>
                  <td className="text-[13px] min-w-[150px]">{v.creditHead}</td>
                  <td className="text-right font-bold whitespace-nowrap">{inr(v.debitAmount)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ---------- Trial balance ----------
export const TrialBalance = ({ data }) => {
  if (!data) return <Loading />;
  const groups = Object.entries((data.summary || []).reduce((acc, r) => ({ ...acc, [r.group]: [...(acc[r.group] || []), r] }), {}));
  return (
    <section className={`${panel} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-color)]">
        <h2 className="text-[16px] font-bold m-0">Trial balance</h2>
        <span className={`badge normal-case ${data.isBalanced ? 'badge-success' : 'badge-danger'}`}>
          {data.isBalanced ? <><CircleCheck size={12} /> Debits equal credits</> : <><TriangleAlert size={12} /> Out by {inr(Math.abs(data.totalDebit - data.totalCredit))}</>}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
              <th className="text-left font-semibold px-5 py-2.5">Account</th>
              <th className="text-right font-semibold px-5 py-2.5 w-[140px]">Debit</th>
              <th className="text-right font-semibold px-5 py-2.5 w-[140px]">Credit</th>
            </tr>
          </thead>
          {groups.map(([group, rows]) => (
            <tbody key={group}>
              <tr><td colSpan={3} className="px-5 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-brand-700 bg-mint-50/60">{GROUP_LABELS[group] || group}</td></tr>
              {rows.map((r) => (
                <tr key={r.code} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]">
                  <td className="px-5 py-2.5"><span className="font-medium">{r.name}</span> <span className="text-[11px] text-[var(--text-tertiary)]">{r.code}</span></td>
                  <td className="px-5 py-2.5 text-right">{r.closingDebit > 0 ? inr(r.closingDebit) : ''}</td>
                  <td className="px-5 py-2.5 text-right">{r.closingCredit > 0 ? inr(r.closingCredit) : ''}</td>
                </tr>
              ))}
            </tbody>
          ))}
          <tfoot>
            <tr className="bg-cream-100 font-bold">
              <td className="px-5 py-3">Total</td>
              <td className="px-5 py-3 text-right">{inr(data.totalDebit)}</td>
              <td className="px-5 py-3 text-right">{inr(data.totalCredit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
};

// Two-column statement block (P&L sides, balance sheet sides)
const Side = ({ title, tone, rows, totalLabel, total, children }) => (
  <section className={`${panel} overflow-hidden flex flex-col`}>
    <h3 className={`m-0 px-5 py-3 text-[13px] font-bold uppercase tracking-wider ${tone}`}>{title}</h3>
    <ul className="list-none m-0 p-0 flex-1">
      {children}
      {rows.map((h, i) => (
        <li key={`${h.name}-${i}`} className="flex justify-between gap-3 px-5 py-2.5 border-b border-[var(--border-color)] text-[13px]">
          <span>{h.name}</span><span className="font-semibold whitespace-nowrap">{inr(h.amount)}</span>
        </li>
      ))}
      {rows.length === 0 && !children && <li className="px-5 py-4 text-[13px] text-[var(--text-tertiary)]">Nothing recorded.</li>}
    </ul>
    <div className="flex justify-between px-5 py-3 font-bold text-[14px] bg-[var(--bg-primary)]"><span>{totalLabel}</span><span>{inr(total)}</span></div>
  </section>
);

// ---------- Profit & loss ----------
export const ProfitLoss = ({ data }) => {
  if (!data) return <Loading />;
  const profit = data.netProfit >= 0;
  return (
    <div className="flex flex-col gap-4">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-[var(--border-radius-card)] border p-5 flex flex-wrap items-center justify-between gap-3 ${profit ? 'bg-mint-100 border-mint-200' : 'bg-peach-50 border-peach-100'}`}
      >
        <div>
          <span className="block text-[13px] text-[var(--text-secondary)]">Net {profit ? 'surplus' : 'deficit'}</span>
          <span className={`block text-[28px] font-extrabold tracking-tight ${profit ? 'text-brand-800' : 'text-[var(--danger)]'}`}>{inr(Math.abs(data.netProfit))}</span>
        </div>
        <div className="text-[13px] text-[var(--text-secondary)] text-right">
          <div>Income <strong className="text-[var(--text-primary)]">{inr(data.totalIncome)}</strong></div>
          <div>Expenses <strong className="text-[var(--text-primary)]">{inr(data.totalExpenses)}</strong></div>
        </div>
      </motion.section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Side title="Income" tone="bg-mint-50 text-brand-800" rows={data.incomeBreakdown || []} totalLabel="Total income" total={data.totalIncome} />
        <Side title="Expenses" tone="bg-peach-50 text-peach-900" rows={data.expenseBreakdown || []} totalLabel="Total expenses" total={data.totalExpenses} />
      </div>
    </div>
  );
};

// ---------- Balance sheet ----------
export const BalanceSheet = ({ data }) => {
  if (!data) return <Loading />;
  const balanced = Math.abs((data.totalAssets || 0) - (data.totalEquityAndLiabilities || 0)) < 0.5;
  return (
    <div className="flex flex-col gap-4">
      <div className={`flex items-center gap-2 text-[13px] font-medium ${balanced ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
        {balanced ? <CircleCheck size={16} /> : <TriangleAlert size={16} />}
        {balanced ? 'Assets equal equity and liabilities.' : `Sides differ by ${inr(Math.abs(data.totalAssets - data.totalEquityAndLiabilities))}.`}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Side title="Equity & liabilities" tone="bg-lilac-50 text-lilac-900" rows={data.liabilityBreakdown || []} totalLabel="Total" total={data.totalEquityAndLiabilities}>
          <li className="flex justify-between gap-3 px-5 py-2.5 border-b border-[var(--border-color)] text-[13px]">
            <span>Retained earnings (net profit)</span><span className="font-semibold whitespace-nowrap">{inr(data.netProfit)}</span>
          </li>
        </Side>
        <Side title="Assets" tone="bg-cream-100 text-sun-900" rows={data.assetBreakdown || []} totalLabel="Total" total={data.totalAssets} />
      </div>
    </div>
  );
};
