import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CircleCheck, Download, Receipt, RefreshCw, Users, UtensilsCrossed, Wallet } from 'lucide-react';
import { floors as floorsApi } from '../utils/api';
import Avatar from '../components/ui/Avatar';
import DonutRing from '../components/ui/DonutRing';
import FilterChips from '../components/ui/FilterChips';
import ProgressBar from '../components/ui/ProgressBar';
import { EmptyPanel, ErrorPanel, PageHeader, SearchBox, SkeletonList } from '../components/ui/PageStates';
import { downloadCsv, plural, rupees } from '../utils/format';
import SummaryTile from './finance/SummaryTile';
import { currentMonth, monthLabel, shiftMonth, stagger } from './finance/financeUtils';
import { useReportFilters } from './reports/reportState';

const PARTS = [
  { key: 'rent', label: 'Room rent', color: 'var(--color-brand-500)' },
  { key: 'mess', label: 'Catering', color: 'var(--color-sun-400)' },
  { key: 'elec', label: 'Electricity', color: 'var(--color-peach-500)' },
];

const ROW_STATUS = {
  PAID: { label: 'Paid', badge: 'badge-success' },
  UNPAID: { label: 'Unpaid', badge: 'badge-warning' },
  PENDING_INVOICE: { label: 'Not invoiced', badge: 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]' },
};

// Normalise the combined and single-floor report shapes into one summary
const summarise = (data, scope) => {
  if (!data) return null;
  if (scope === 'combined') {
    const g = data.grandTotal || {};
    return { residents: g.totalStudents, rent: g.hostelFee, mess: g.messFee, elec: g.electricity, billed: g.total, collected: g.collected, pending: g.pending, rate: g.collectionRate };
  }
  const s = data.summary || {};
  return { residents: s.totalStudents, rent: s.totalHostelFee, mess: s.totalMessFee, elec: s.totalElectricity, billed: s.grandTotal, collected: s.totalCollected, pending: s.totalPending, rate: s.collectionRate };
};

const Reports = () => {
  // Month and floor are shared with the other report tabs
  const [{ month, floor }, setFilters] = useReportFilters();
  const scope = floor === 'all' ? 'combined' : floor;
  const setMonth = (fn) => setFilters({ month: typeof fn === 'function' ? fn(month) : fn });
  const setScope = (v) => setFilters({ floor: v === 'combined' ? 'all' : v });
  const [floors, setFloors] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [rowFilter, setRowFilter] = useState('all');

  useEffect(() => {
    floorsApi.getAll().then((f) => setFloors(f || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      setData(await floorsApi.getReport(scope, month));
    } catch (err) {
      setError(err.message || 'Could not load the report.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [scope, month]);

  useEffect(() => {
    load();
  }, [load]);

  const sum = summarise(data, scope);
  const students = useMemo(() => {
    if (scope === 'combined' || !data?.students) return [];
    const q = search.trim().toLowerCase();
    return data.students
      .filter((s) => rowFilter === 'all' || s.status === rowFilter)
      .filter((s) => !q || [s.name, s.rollNumber, s.roomNumber].some((v) => v && String(v).toLowerCase().includes(q)));
  }, [data, scope, search, rowFilter]);

  const statusCounts = useMemo(() => {
    const c = { PAID: 0, UNPAID: 0, PENDING_INVOICE: 0 };
    (data?.students || []).forEach((s) => { c[s.status] = (c[s.status] || 0) + 1; });
    return c;
  }, [data]);

  const exportCsv = () => {
    if (scope === 'combined') {
      downloadCsv(`report-${month}-all-floors.csv`, ['Floor', 'Company', 'Residents', 'Room rent', 'Catering', 'Electricity', 'Billed', 'Collected', 'Pending', 'Collection %'],
        (data.floors || []).map((f) => [f.floor.floorNumber, f.floor.companyName, f.summary.totalStudents, f.summary.totalHostelFee, f.summary.totalMessFee, f.summary.totalElectricity, f.summary.grandTotal, f.summary.totalCollected, f.summary.totalPending, f.summary.collectionRate]));
    } else {
      downloadCsv(`report-${month}-floor-${scope}.csv`, ['Resident', 'Roll no.', 'Room', 'Sharing', 'Room rent', 'Catering', 'Electricity', 'Total', 'Paid', 'Pending', 'Status'],
        students.map((s) => [s.name, s.rollNumber, s.roomNumber, s.sharingType, s.hostelFee, s.messFee, s.electricity, s.total, s.paid, s.pending, ROW_STATUS[s.status]?.label || s.status]));
    }
  };

  const scopeOptions = [{ value: 'combined', label: 'All floors' }, ...floors.map((f) => ({ value: String(f.floorNumber), label: `Floor ${f.floorNumber}` }))];
  const currentFloor = floors.find((f) => String(f.floorNumber) === scope);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Fee collection"
        subtitle={scope === 'combined' ? `All companies · ${monthLabel(month)}` : `${currentFloor?.companyName || `Floor ${scope}`} · ${monthLabel(month)}`}
      >
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-[var(--border-color)]">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-transparent border-none cursor-pointer hover:bg-mint-50" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <label className="sr-only" htmlFor="rp-month">Month</label>
          <input id="rp-month" type="month" className="h-8 px-2 border-none bg-transparent text-[13px] font-semibold cursor-pointer" value={month} max={currentMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-transparent border-none cursor-pointer hover:bg-mint-50 disabled:opacity-40" onClick={() => setMonth((m) => shiftMonth(m, 1))} disabled={month >= currentMonth()} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
        <button className="btn-secondary" onClick={load} aria-label="Refresh"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
        <button className="btn-secondary" onClick={exportCsv} disabled={!data}><Download size={16} /> <span className="hidden sm:inline">Export</span></button>
      </PageHeader>

      <FilterChips id="report-scope" value={scope} onChange={(v) => { setScope(v); setSearch(''); setRowFilter('all'); }} options={scopeOptions} />

      {error && <ErrorPanel message={error} onRetry={load} />}

      {loading && !data ? (
        <SkeletonList count={4} height={120} columns="grid-cols-2 xl:grid-cols-4" />
      ) : sum && (
        <>
          <motion.div key={`${scope}-${month}`} variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <SummaryTile icon={Users} tone="white" label="Residents billed" value={sum.residents || 0} money={false} caption={scope === 'combined' ? `${(data.floors || []).length} floors` : currentFloor?.hostelName} />
            <SummaryTile icon={Receipt} tone="lilac" label="Billed" value={sum.billed || 0} caption="Rent + catering + electricity" />
            <SummaryTile icon={CircleCheck} tone="mint" label="Collected" value={sum.collected || 0} caption={`${sum.rate || 0}% of billed`}>
              <span className="relative block mt-2"><ProgressBar value={sum.collected || 0} max={sum.billed || 1} tone="brand" height={6} label="Collection rate" trackClassName="bg-white/70" /></span>
            </SummaryTile>
            <SummaryTile icon={Wallet} tone="sun" label="Pending" value={sum.pending || 0} caption={scope === 'combined' ? 'Across all floors' : plural(statusCounts.UNPAID + statusCounts.PENDING_INVOICE, 'resident')} />
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5 items-start">
            {/* Main panel */}
            {scope === 'combined' ? (
              <section className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5">
                <h2 className="text-[16px] font-bold m-0 mb-4">Collection by floor</h2>
                {(data.floors || []).length === 0 ? (
                  <p className="text-[13px] text-[var(--text-tertiary)] m-0">No floors configured.</p>
                ) : (
                  <ul className="list-none m-0 p-0 flex flex-col gap-2">
                    {data.floors.map((f, i) => (
                      <motion.li key={f.floor.floorNumber} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}>
                        <button
                          onClick={() => setScope(String(f.floor.floorNumber))}
                          className="w-full text-left p-3.5 rounded-2xl border border-[var(--border-color)] bg-white hover:border-brand-200 hover:bg-mint-50/50 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-3 mb-2.5">
                            <span className="w-10 h-10 shrink-0 rounded-xl bg-mint-100 text-brand-700 font-bold flex items-center justify-center">{f.floor.floorNumber}</span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-[14px] font-semibold truncate">{f.floor.companyName}</span>
                              <span className="block text-[12px] text-[var(--text-tertiary)] truncate">{plural(f.summary.totalStudents, 'resident')} · {f.floor.hostelName}</span>
                            </span>
                            <span className="text-right">
                              <span className="block text-[15px] font-bold">{rupees(f.summary.totalCollected)}</span>
                              <span className="block text-[12px] text-[var(--text-tertiary)]">of {rupees(f.summary.grandTotal)}</span>
                            </span>
                            <ChevronRight size={17} className="text-[var(--text-tertiary)] group-hover:translate-x-0.5 transition-transform" />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1"><ProgressBar value={f.summary.totalCollected} max={f.summary.grandTotal || 1} tone={f.summary.collectionRate >= 80 ? 'brand' : 'sun'} height={7} delay={0.1 + i * 0.05} label={`Floor ${f.floor.floorNumber} collection`} /></div>
                            <span className="text-[12px] font-semibold w-10 text-right">{f.summary.collectionRate}%</span>
                            {f.summary.totalPending > 0 && <span className="text-[12px] text-[var(--warning)] font-semibold whitespace-nowrap">{rupees(f.summary.totalPending)} due</span>}
                          </div>
                        </button>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </section>
            ) : (
              <section className="flex flex-col gap-3">
                <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                  <SearchBox value={search} onChange={setSearch} placeholder="Search resident, roll no. or room" className="flex-1" />
                  <FilterChips
                    id="report-rows"
                    value={rowFilter}
                    onChange={setRowFilter}
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'UNPAID', label: 'Unpaid', count: statusCounts.UNPAID },
                      { value: 'PENDING_INVOICE', label: 'Not invoiced', count: statusCounts.PENDING_INVOICE },
                      { value: 'PAID', label: 'Paid', count: statusCounts.PAID },
                    ]}
                  />
                </div>
                {students.length === 0 ? (
                  <EmptyPanel icon={Users} title={data.students?.length ? 'No residents match' : 'No residents on this floor'} text={data.students?.length ? 'Try a different search or filter.' : 'Assign residents to rooms on this floor to see them here.'} />
                ) : (
                  <div className="custom-table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Resident</th>
                          <th>Room</th>
                          <th className="text-right">Rent + mess</th>
                          <th className="text-right">Electricity</th>
                          <th className="text-right">Total</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s, i) => (
                          <motion.tr key={s.id || `${s.rollNumber}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: Math.min(i, 12) * 0.02 } }}>
                            <td>
                              <div className="flex items-center gap-3 min-w-[180px]">
                                <Avatar name={s.name} size={32} />
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">{s.name}</div>
                                  <div className="text-[12px] text-[var(--text-tertiary)]">{s.rollNumber}</div>
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap">{s.roomNumber} <span className="text-[12px] text-[var(--text-tertiary)]">· {s.sharingType}</span></td>
                            <td className="text-right">{rupees(s.hostelFee + s.messFee)}</td>
                            <td className="text-right">{s.electricity ? rupees(s.electricity) : <span className="text-[var(--text-tertiary)]">—</span>}</td>
                            <td className="text-right font-bold">{rupees(s.total)}</td>
                            <td><span className={`badge normal-case ${ROW_STATUS[s.status]?.badge || ''}`}>{ROW_STATUS[s.status]?.label || s.status}</span></td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* Breakdown */}
            <aside className="flex flex-col gap-5">
              <section className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5">
                <h2 className="text-[16px] font-bold m-0 mb-4">Where the money comes from</h2>
                <div className="flex items-center gap-5">
                  <DonutRing size={132} stroke={15} label="Billing breakdown" segments={PARTS.map((p) => ({ value: sum[p.key] || 0, color: p.color }))}>
                    <span className="text-[11px] text-[var(--text-tertiary)]">Billed</span>
                    <span className="text-[15px] font-bold">{rupees(sum.billed)}</span>
                  </DonutRing>
                  <ul className="list-none m-0 p-0 flex flex-col gap-2.5 flex-1 min-w-0">
                    {PARTS.map((p) => (
                      <li key={p.key} className="flex items-center gap-2 text-[13px]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                        <span className="flex-1 text-[var(--text-secondary)]">{p.label}</span>
                        <strong>{rupees(sum[p.key])}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
              {scope === 'combined' && data.grandTotal?.meenakshiCatering > 0 && (
                <section className="rounded-[var(--border-radius-card)] bg-cream-100 border border-sun-200 p-5 flex items-center gap-3">
                  <span className="w-11 h-11 rounded-2xl bg-sun-300 text-sun-900 flex items-center justify-center"><UtensilsCrossed size={19} /></span>
                  <span className="flex-1">
                    <span className="block text-[13px] text-[var(--text-secondary)]">Payable to the caterer</span>
                    <span className="block text-[20px] font-bold">{rupees(data.grandTotal.meenakshiCatering)}</span>
                    <span className="block text-[12px] text-[var(--text-tertiary)]">Meenakshi Enterprises · {data.grandTotal.totalStudents} residents</span>
                  </span>
                </section>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
