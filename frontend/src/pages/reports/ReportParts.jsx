import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ProgressBar from '../../components/ui/ProgressBar';
import { currentMonth, monthLabel, shiftMonth } from '../finance/financeUtils';
import { useFloors, useReportFilters } from './reportState';

// Page title, month stepper, floor picker and page actions
export const ReportHeader = ({ title, subtitle, onRefresh, loading, children }) => {
  const { user } = useAuth();
  const [{ month, floor }, setFilters] = useReportFilters();
  const floors = useFloors();
  const locked = user?.assignedFloor ? String(user.assignedFloor) : null;
  const shownFloor = locked || floor;
  const floorName = shownFloor === 'all' ? 'All floors' : floors.find((f) => String(f.floorNumber) === shownFloor)?.companyName || `Floor ${shownFloor}`;

  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle || `${floorName} · ${monthLabel(month)}`}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-[var(--border-color)]">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-transparent border-none cursor-pointer hover:bg-mint-50" onClick={() => setFilters({ month: shiftMonth(month, -1) })} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <label className="sr-only" htmlFor="report-month">Month</label>
          <input id="report-month" type="month" className="h-8 px-1 border-none bg-transparent text-[13px] font-semibold cursor-pointer" value={month} max={currentMonth()} onChange={(e) => e.target.value && setFilters({ month: e.target.value })} />
          <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-transparent border-none cursor-pointer hover:bg-mint-50 disabled:opacity-40" onClick={() => setFilters({ month: shiftMonth(month, 1) })} disabled={month >= currentMonth()} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
        {locked ? (
          <span className="h-10 px-3 rounded-xl bg-mint-50 border border-[var(--border-color)] text-[13px] font-semibold flex items-center">{floorName}</span>
        ) : (
          <select className="form-input w-auto cursor-pointer" value={floor} onChange={(e) => setFilters({ floor: e.target.value })} aria-label="Floor">
            <option value="all">All floors</option>
            {floors.map((f) => <option key={f.floorNumber} value={String(f.floorNumber)}>Floor {f.floorNumber} · {f.companyName}</option>)}
          </select>
        )}
        {onRefresh && <button className="btn-secondary" onClick={onRefresh} aria-label="Refresh"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>}
        {children}
      </div>
    </div>
  );
};

export const Card = ({ title, action, className = '', children }) => (
  <section className={`bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5 ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-[15px] font-bold m-0">{title}</h2>
        {action}
      </div>
    )}
    {children}
  </section>
);

// Day-by-day bars. series: [{ key, label, color }] stacked in order
export const DailyBars = ({ days, series, height = 150, label }) => {
  const totals = days.map((d) => series.reduce((s, x) => s + (d[x.key] || 0), 0));
  const max = Math.max(1, ...totals);
  const empty = totals.every((t) => t === 0);
  return (
    <div>
      {series.length > 1 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {series.map((x) => (
            <span key={x.key} className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: x.color }} /> {x.label}
            </span>
          ))}
        </div>
      )}
      {empty ? (
        <p className="text-[13px] text-[var(--text-tertiary)] m-0 py-8 text-center">Nothing recorded this month.</p>
      ) : (
        <div className="flex items-end gap-[3px]" style={{ height }} role="img" aria-label={label}>
          {days.map((d, i) => (
            <div key={d.date} className="flex-1 h-full flex flex-col justify-end group relative" title={`${d.date.slice(8)} · ${series.map((x) => `${x.label} ${d[x.key] || 0}`).join(', ')}`}>
              <motion.div
                className="w-full flex flex-col-reverse rounded-t-[4px] overflow-hidden"
                initial={{ height: 0 }}
                animate={{ height: `${(totals[i] / max) * 100}%` }}
                transition={{ duration: 0.6, delay: Math.min(i, 30) * 0.012, ease: [0.16, 1, 0.3, 1] }}
              >
                {series.map((x) => (
                  <span key={x.key} style={{ background: x.color, height: totals[i] ? `${((d[x.key] || 0) / totals[i]) * 100}%` : 0 }} className="block w-full group-hover:opacity-80" />
                ))}
              </motion.div>
            </div>
          ))}
        </div>
      )}
      {!empty && (
        <div className="flex justify-between mt-1.5 text-[10px] text-[var(--text-tertiary)]">
          {days.filter((_, i) => i === 0 || (i + 1) % 5 === 0).map((d) => <span key={d.date}>{Number(d.date.slice(8))}</span>)}
        </div>
      )}
    </div>
  );
};

// Ranked horizontal bars. items: [{ label, value, note? }]
export const BarList = ({ items, tone = 'brand', empty = 'Nothing recorded this month.' }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length || items.every((i) => !i.value)) return <p className="text-[13px] text-[var(--text-tertiary)] m-0">{empty}</p>;
  return (
    <ul className="list-none m-0 p-0 flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={item.label}>
          <div className="flex items-center justify-between gap-2 text-[13px] mb-1">
            <span className="truncate">{item.label}</span>
            <span className="shrink-0"><strong>{item.value}</strong>{item.note && <span className="text-[var(--text-tertiary)]"> · {item.note}</span>}</span>
          </div>
          <ProgressBar value={item.value} max={max} tone={i === 0 ? tone : 'sun'} height={6} delay={i * 0.04} label={item.label} />
        </li>
      ))}
    </ul>
  );
};

export const ReportSkeleton = () => (
  <div className="flex flex-col gap-4" aria-busy="true">
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[130px] rounded-[var(--border-radius-card)] skeleton-loading" />)}</div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{[0, 1].map((i) => <div key={i} className="h-[260px] rounded-[var(--border-radius-card)] skeleton-loading" />)}</div>
  </div>
);
