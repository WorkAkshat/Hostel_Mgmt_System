import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, Building2, ChartColumn, ChevronRight, Download, Layers, Phone, RefreshCw, Search, Snowflake, TriangleAlert, X,
} from 'lucide-react';
import { floors as floorsApi } from '../utils/api';
import Avatar from '../components/ui/Avatar';
import ProgressBar from '../components/ui/ProgressBar';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import FilterChips from '../components/ui/FilterChips';
import { ROOM_STATUS } from './rooms/RoomDrawer';

const rupees = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const thisMonth = () => new Date().toISOString().slice(0, 7);

const downloadCsv = (filename, header, rows) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [header.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const Panel = ({ children, className = '' }) => (
  <div className={`bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] ${className}`}>{children}</div>
);

// ─── Overview ────────────────────────────────────────────────────────────────
const FloorCard = ({ floor, index, onOpen }) => {
  const s = floor.stats || {};
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
      whileHover={{ y: -4 }}
      onClick={onOpen}
      className="group text-left w-full bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] overflow-hidden cursor-pointer hover:border-brand-200 hover:shadow-[var(--shadow-hover)] transition-[border-color,box-shadow]"
    >
      <div className="bg-mint-100 px-5 pt-5 pb-4 flex items-start gap-3.5">
        <span className="w-12 h-12 rounded-2xl bg-white text-brand-700 flex flex-col items-center justify-center shrink-0">
          <span className="text-[10px] leading-none text-[var(--text-tertiary)]">Floor</span>
          <span className="text-[20px] font-bold leading-tight">{floor.floorNumber}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-bold truncate">{floor.companyName}</span>
          <span className="block text-[13px] text-brand-700 truncate">{floor.hostelName}</span>
        </span>
        <ChevronRight size={18} className="text-brand-600 mt-1 transition-transform group-hover:translate-x-1" />
      </div>
      <div className="px-5 py-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[13px] text-[var(--text-secondary)]">Occupancy</span>
          <span className="text-[14px] font-bold">{s.occupancyPct ?? 0}%</span>
        </div>
        <ProgressBar value={s.occupancyPct ?? 0} max={100} height={7} delay={0.15 + index * 0.05} label={`Floor ${floor.floorNumber} occupancy`} />
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: 'Rooms', value: s.totalRooms ?? 0 },
            { label: 'Residents', value: s.totalStudents ?? 0 },
            { label: 'Free beds', value: s.freeBeds ?? 0, highlight: true },
          ].map((stat) => (
            <span key={stat.label} className={`rounded-xl px-3 py-2 ${stat.highlight ? 'bg-cream-100' : 'bg-mint-50'}`}>
              <span className="block text-[11px] text-[var(--text-tertiary)]">{stat.label}</span>
              <span className="block text-[17px] font-bold">{stat.value}</span>
            </span>
          ))}
        </div>
      </div>
    </motion.button>
  );
};

// ─── Residents tab ───────────────────────────────────────────────────────────
const ResidentsTab = ({ detail }) => {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const rooms = (detail?.rooms || [])
    .map((room) => ({
      ...room,
      students: room.students.filter((s) => !q || [s.name, s.rollNumber, s.phoneNumber, s.coachingCollege].some((v) => v && v.toLowerCase().includes(q))),
    }))
    .filter((r) => !q || r.students.length || String(r.roomNumber).toLowerCase().includes(q));

  return (
    <div className="flex flex-col gap-4">
      <label className="relative">
        <span className="sr-only">Search residents</span>
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
        <input className="form-input pl-10 pr-9 bg-white" placeholder="Search name, roll no., phone or college" value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && (
          <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer">
            <X size={14} />
          </button>
        )}
      </label>

      {rooms.length === 0 ? (
        <Panel className="p-10 text-center text-[14px] text-[var(--text-secondary)]">
          {q ? 'No resident matches your search.' : 'No rooms on this floor yet.'}
        </Panel>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {rooms.map((room, i) => {
            const status = ROOM_STATUS[room.status] || ROOM_STATUS.AVAILABLE;
            return (
              <motion.div key={room.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.03 } }}>
                <Panel className="p-4 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-11 h-11 rounded-xl bg-mint-100 text-brand-800 font-bold flex items-center justify-center shrink-0">{room.roomNumber}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-semibold">
                        {room.sharingLabel} sharing {room.isAc && <Snowflake size={12} className="inline text-brand-500 ml-0.5" />}
                      </span>
                      <span className="block text-[12px] text-[var(--text-tertiary)]">
                        {room.occupancy}/{room.capacity} beds · {rupees(room.monthlyFee)}/bed
                      </span>
                    </span>
                    <span className={`badge ${status.badge}`}>{status.label}</span>
                  </div>
                  {room.students.length === 0 ? (
                    <p className="text-[13px] text-[var(--text-tertiary)] m-0 px-1 py-2">No residents in this room.</p>
                  ) : (
                    <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
                      {room.students.map((s) => (
                        <li key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-primary)]">
                          <Avatar name={s.name} src={s.avatar} size={36} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] font-semibold truncate">{s.name}</span>
                            <span className="block text-[12px] text-[var(--text-tertiary)] truncate">
                              {s.rollNumber}{s.coachingCollege ? ` · ${s.coachingCollege}` : ''}
                            </span>
                          </span>
                          {s.latestInvoice && (
                            <span className={`badge ${s.latestInvoice.status === 'PAID' ? 'badge-success' : 'badge-warning'} hidden sm:inline-flex`}>
                              {s.latestInvoice.status === 'PAID' ? 'Paid' : `Due ${rupees(s.latestInvoice.amount)}`}
                            </span>
                          )}
                          {s.phoneNumber && (
                            <a href={`tel:${s.phoneNumber}`} className="w-8 h-8 rounded-lg bg-white text-brand-700 flex items-center justify-center shrink-0" aria-label={`Call ${s.name}`}>
                              <Phone size={14} />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Billing tab ─────────────────────────────────────────────────────────────
const BillingTab = ({ floorKey, floorName }) => {
  const [month, setMonth] = useState(thisMonth);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await floorsApi.getReport(floorKey, month));
    } catch (err) {
      setError(err.message || 'Could not load the report.');
    } finally {
      setLoading(false);
    }
  }, [floorKey, month]);

  useEffect(() => {
    load();
  }, [load]);

  const combined = floorKey === 'combined';
  const sum = combined
    ? {
        totalStudents: report?.grandTotal?.totalStudents,
        grandTotal: report?.grandTotal?.total,
        totalCollected: report?.grandTotal?.collected,
        totalPending: report?.grandTotal?.pending,
      }
    : report?.summary || {};
  const rate = sum.grandTotal ? Math.round(((sum.totalCollected || 0) / sum.grandTotal) * 100) : 0;
  const monthLabel = new Date(`${month}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const exportReport = () => {
    if (combined) {
      downloadCsv(`floors-report-${month}.csv`,
        ['Floor', 'Company', 'Students', 'Hostel fee', 'Mess fee', 'Electricity', 'Total', 'Collected', 'Pending'],
        (report.floors || []).map((f) => [f.floor?.floorNumber, f.floor?.companyName, f.summary?.totalStudents, f.summary?.totalHostelFee, f.summary?.totalMessFee, f.summary?.totalElectricity, f.summary?.grandTotal, f.summary?.totalCollected, f.summary?.totalPending]));
    } else {
      downloadCsv(`floor-${floorKey}-report-${month}.csv`,
        ['Resident', 'Room', 'Sharing', 'Hostel fee', 'Mess fee', 'Electricity', 'Total', 'Paid', 'Pending'],
        (report.students || []).map((s) => [s.name, s.roomNumber, s.sharingType, s.hostelFee, s.messFee, s.electricity, s.total, s.paid, s.pending]));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-secondary)]">
          Month
          <input type="month" className="form-input h-10 w-[170px]" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
        <button className="btn-secondary h-10" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh</button>
        <button className="btn-secondary h-10 sm:ml-auto" onClick={exportReport} disabled={loading || !report}><Download size={15} /> Export CSV</button>
      </div>

      {error ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium">
          <TriangleAlert size={17} /> {error}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[92px] rounded-[var(--border-radius-card)] skeleton-loading" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Residents billed', value: sum.totalStudents || 0, tone: 'bg-white border-[var(--border-color)]' },
              { label: 'Total for the month', value: sum.grandTotal || 0, money: true, tone: 'bg-white border-[var(--border-color)]' },
              { label: 'Collected', value: sum.totalCollected || 0, money: true, tone: 'bg-mint-100 border-mint-200' },
              { label: 'Still pending', value: sum.totalPending || 0, money: true, tone: 'bg-cream-100 border-cream-200' },
            ].map((t) => (
              <div key={t.label} className={`rounded-[var(--border-radius-card)] border px-4 py-3.5 ${t.tone}`}>
                <div className="text-[12px] text-[var(--text-secondary)]">{t.label}</div>
                <div className="text-[22px] font-bold leading-tight"><AnimatedNumber value={t.value} format={t.money ? rupees : undefined} /></div>
              </div>
            ))}
          </div>
          <Panel className="px-4 py-3.5">
            <div className="flex justify-between text-[13px] mb-2">
              <span className="text-[var(--text-secondary)]">Collected for {monthLabel}</span>
              <span className="font-bold">{rate}%</span>
            </div>
            <ProgressBar value={rate} max={100} height={8} label="Collection rate" />
          </Panel>

          <div className="custom-table-container">
            {combined ? (
              <table className="custom-table">
                <thead>
                  <tr>{['Floor', 'Company', 'Residents', 'Hostel fee', 'Mess fee', 'Electricity', 'Total', 'Collected', 'Pending'].map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {(report?.floors || []).map((f) => (
                    <tr key={f.floor?.floorNumber}>
                      <td className="font-semibold">{f.floor?.floorNumber}</td>
                      <td>{f.floor?.companyName}</td>
                      <td>{f.summary?.totalStudents}</td>
                      <td>{rupees(f.summary?.totalHostelFee)}</td>
                      <td>{rupees(f.summary?.totalMessFee)}</td>
                      <td>{rupees(f.summary?.totalElectricity)}</td>
                      <td className="font-semibold">{rupees(f.summary?.grandTotal)}</td>
                      <td className="text-[var(--success)] font-semibold">{rupees(f.summary?.totalCollected)}</td>
                      <td className="text-[var(--warning)] font-semibold">{rupees(f.summary?.totalPending)}</td>
                    </tr>
                  ))}
                  <tr className="bg-mint-50">
                    <td colSpan={2} className="font-semibold">Meenakshi Enterprises (catering)</td>
                    <td>{report?.grandTotal?.totalStudents}</td>
                    <td colSpan={3} className="text-[13px] text-[var(--text-tertiary)]">₹3,000 × {report?.grandTotal?.totalStudents || 0} residents</td>
                    <td className="font-semibold">{rupees(report?.grandTotal?.meenakshiCatering)}</td>
                    <td colSpan={2} />
                  </tr>
                  <tr className="bg-cream-100 font-bold">
                    <td colSpan={2}>Grand total</td>
                    <td>{report?.grandTotal?.totalStudents}</td>
                    <td>{rupees(report?.grandTotal?.hostelFee)}</td>
                    <td>{rupees(report?.grandTotal?.messFee)}</td>
                    <td>{rupees(report?.grandTotal?.electricity)}</td>
                    <td>{rupees(report?.grandTotal?.total)}</td>
                    <td className="text-[var(--success)]">{rupees(report?.grandTotal?.collected)}</td>
                    <td className="text-[var(--warning)]">{rupees(report?.grandTotal?.pending)}</td>
                  </tr>
                </tbody>
              </table>
            ) : (report?.students || []).length === 0 ? (
              <p className="p-8 text-center text-[14px] text-[var(--text-secondary)] m-0">No residents were billed on {floorName} for {monthLabel}.</p>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>{['Resident', 'Room', 'Sharing', 'Hostel fee', 'Mess', 'Electricity', 'Total', 'Paid', 'Pending'].map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {report.students.map((s, i) => (
                    <tr key={`${s.name}-${i}`}>
                      <td className="font-semibold">{s.name}</td>
                      <td>{s.roomNumber}</td>
                      <td>{s.sharingType}</td>
                      <td>{rupees(s.hostelFee)}</td>
                      <td>{rupees(s.messFee)}</td>
                      <td>{rupees(s.electricity)}</td>
                      <td className="font-semibold">{rupees(s.total)}</td>
                      <td className="text-[var(--success)] font-semibold">{rupees(s.paid)}</td>
                      <td className={s.pending ? 'text-[var(--warning)] font-semibold' : 'text-[var(--text-tertiary)]'}>{rupees(s.pending)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────
export default function FloorDirectory() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('floor'); // null = overview, 'combined', or a floor number
  const tab = params.get('tab') || 'residents';

  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadFloors = useCallback(async () => {
    try {
      setError(null);
      setFloors((await floorsApi.getAll()) || []);
    } catch (err) {
      setError(err.message || 'Could not load floors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFloors();
  }, [loadFloors]);

  useEffect(() => {
    if (!selected || selected === 'combined') return;
    let cancelled = false;
    setDetailLoading(true);
    setDetail(null);
    floorsApi.getStudents(selected)
      .then((d) => !cancelled && setDetail(d))
      .catch(() => !cancelled && setDetail(null))
      .finally(() => !cancelled && setDetailLoading(false));
    return () => { cancelled = true; };
  }, [selected]);

  const open = (floorKey, nextTab) => setParams(floorKey ? { floor: String(floorKey), ...(nextTab ? { tab: nextTab } : {}) } : {});
  const floor = floors.find((f) => String(f.floorNumber) === selected);

  const totals = useMemo(() => floors.reduce((acc, f) => ({
    rooms: acc.rooms + (f.stats?.totalRooms || 0),
    residents: acc.residents + (f.stats?.totalStudents || 0),
    free: acc.free + (f.stats?.freeBeds || 0),
  }), { rooms: 0, residents: 0, free: 0 }), [floors]);

  // Overview
  if (!selected) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="page-title">Floor directory</h1>
          <p className="page-subtitle">
            {loading ? 'Loading floors…' : `${floors.length} floors · ${totals.rooms} rooms · ${totals.residents} residents · ${totals.free} free beds`}
          </p>
        </div>

        {error ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium">
            <TriangleAlert size={17} /> <span className="flex-1">{error}</span>
            <button onClick={loadFloors} className="font-semibold underline bg-transparent border-none cursor-pointer text-[var(--danger)]">Retry</button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-[230px] rounded-[var(--border-radius-card)] skeleton-loading" />)}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {floors.map((f, i) => <FloorCard key={f.id} floor={f} index={i} onOpen={() => open(f.floorNumber)} />)}
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { delay: floors.length * 0.05 } }}
              whileHover={{ y: -4 }}
              onClick={() => open('combined')}
              className="group text-left w-full rounded-[var(--border-radius-card)] border border-cream-200 bg-cream-100 p-5 cursor-pointer flex flex-col justify-between gap-6 min-h-[230px] hover:shadow-[var(--shadow-hover)] transition-shadow"
            >
              <span className="flex items-start gap-3.5">
                <span className="w-12 h-12 rounded-2xl bg-sun-300 text-sun-900 flex items-center justify-center shrink-0"><Layers size={22} /></span>
                <span>
                  <span className="block text-[16px] font-bold">All floors together</span>
                  <span className="block text-[13px] text-[var(--text-secondary)] mt-0.5">Monthly billing for every floor, plus Meenakshi Enterprises catering</span>
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-[14px] font-semibold text-sun-900">
                <ChartColumn size={16} /> Open combined report <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
              </span>
            </motion.button>
          </div>
        )}
      </div>
    );
  }

  const combined = selected === 'combined';
  const floorName = combined ? 'All floors' : `Floor ${selected}`;

  return (
    <div className="flex flex-col gap-5">
      {/* Floor header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => open(null)}
          aria-label="Back to all floors"
          className="w-10 h-10 shrink-0 rounded-xl bg-white border border-[var(--border-color)] flex items-center justify-center cursor-pointer text-[var(--text-secondary)] hover:bg-mint-50"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <p className="text-[13px] text-[var(--text-tertiary)] m-0">Floor directory</p>
          <h1 className="page-title m-0">
            {combined ? 'All floors' : <>Floor {selected}{floor?.companyName && <span className="text-brand-700"> · {floor.companyName}</span>}</>}
          </h1>
          {!combined && floor && (
            <p className="page-subtitle m-0 mt-1">
              {floor.hostelName} · {floor.stats?.totalRooms} rooms · {floor.stats?.totalStudents} residents · {floor.stats?.freeBeds} free beds
            </p>
          )}
        </div>
      </div>

      {!combined && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterChips
            id="floor-tab"
            value={tab}
            onChange={(t) => open(selected, t)}
            options={[{ value: 'residents', label: 'Residents' }, { value: 'billing', label: 'Monthly billing' }]}
          />
          <div className="flex gap-1.5 overflow-x-auto">
            {floors.map((f) => (
              <button
                key={f.floorNumber}
                onClick={() => open(f.floorNumber, tab)}
                className={`w-9 h-9 rounded-lg text-[13px] font-bold border cursor-pointer transition-colors ${
                  String(f.floorNumber) === selected ? 'bg-sun-300 border-transparent text-sun-900' : 'bg-white border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                }`}
                aria-label={`Floor ${f.floorNumber}`}
                title={f.companyName}
              >
                {f.floorNumber}
              </button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${selected}-${combined ? 'billing' : tab}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {combined || tab === 'billing' ? (
            <BillingTab floorKey={combined ? 'combined' : selected} floorName={floorName} />
          ) : detailLoading ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[160px] rounded-[var(--border-radius-card)] skeleton-loading" />)}</div>
          ) : detail ? (
            <ResidentsTab detail={detail} />
          ) : (
            <Panel className="p-10 text-center text-[14px] text-[var(--text-secondary)]">
              <Building2 size={26} className="mx-auto mb-2 text-brand-400" />
              Could not load this floor.
            </Panel>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
