import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck,
  BedDouble,
  Building2,
  CalendarDays,
  ChartPie,
  ChevronRight,
  CircleCheck,
  Coffee,
  Cookie,
  DoorOpen,
  Footprints,
  History,
  IndianRupee,
  Moon,
  ReceiptText,
  RefreshCw,
  Soup,
  UserPlus,
  UtensilsCrossed,
  Vote,
  Wrench,
  TriangleAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import {
  dashboard as dashboardApi,
  floors as floorsApi,
  mess as messApi,
  complaints as complaintsApi,
  fees as feesApi,
  leaves as leavesApi,
} from '../../utils/api';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import ProgressBar from '../../components/ui/ProgressBar';
import DonutRing from '../../components/ui/DonutRing';
import HostelIllustration from '../../components/ui/HostelIllustration';
import { Card, CardHeader, EmptyState, StatTile } from './DashboardWidgets';
import LeaveRequestsCard from './LeaveRequestsCard';
import FeesMonthCard from './FeesMonthCard';
import OutsideCard from './OutsideCard';
import {
  STATUS_BADGE,
  TONES,
  formatRupees,
  greeting,
  isSameDay,
  plural,
  residentName,
  rise,
  startOfDay,
  timeAgo,
} from './dashboardUtils';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

const MEAL_ICONS = { Breakfast: Coffee, Lunch: Soup, Snacks: Cookie, Dinner: Moon };

const AUTO_REFRESH_MS = 60000;

const DashboardSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5" aria-busy="true" aria-label="Loading dashboard">
    <div className="md:col-span-2 xl:col-span-8 h-[220px] rounded-[var(--border-radius-card)] skeleton-loading" />
    <div className="md:col-span-2 xl:col-span-4 h-[220px] rounded-[var(--border-radius-card)] skeleton-loading" />
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="xl:col-span-3 h-[156px] rounded-[var(--border-radius-card)] skeleton-loading" />
    ))}
    <div className="md:col-span-2 xl:col-span-7 h-[320px] rounded-[var(--border-radius-card)] skeleton-loading" />
    <div className="md:col-span-2 xl:col-span-5 h-[320px] rounded-[var(--border-radius-card)] skeleton-loading" />
  </div>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [, setClock] = useState(0);
  const [floor, setFloor] = useState(user?.assignedFloor ? String(user.assignedFloor) : 'all');

  const load = useCallback(async () => {
    try {
      const [dash, floorList, messStats, complaintList, invoiceList, leaveList] = await Promise.all([
        dashboardApi.getDashboard(),
        floorsApi.getAll().catch(() => []),
        messApi.getStats().catch(() => null),
        complaintsApi.getAll().catch(() => []),
        feesApi.getAll().catch(() => []),
        leavesApi.getAll().catch(() => []),
      ]);
      setData({
        dash,
        floors: floorList || [],
        messStats,
        complaints: complaintList || [],
        invoices: invoiceList || [],
        leaves: leaveList || [],
      });
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Could not load the dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load, then quietly refresh every minute while the tab is visible
  useEffect(() => {
    load();
    const refresh = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, AUTO_REFRESH_MS);
    const tick = setInterval(() => setClock((c) => c + 1), 30000);
    return () => {
      clearInterval(refresh);
      clearInterval(tick);
    };
  }, [load]);

  const handleLeaveDecision = async (leave, status, comments) => {
    const name = residentName(leave);
    try {
      await leavesApi.updateStatus(leave.id, status, comments);
      setData((d) => ({
        ...d,
        leaves: d.leaves.map((l) => (l.id === leave.id ? { ...l, status, comments } : l)),
      }));
      if (status === 'APPROVED') {
        toast.success(`Leave approved for ${name}`, 'The student and parents have been notified.');
      } else {
        toast.success(`Leave rejected for ${name}`, 'The student has been notified.');
      }
      return true;
    } catch (err) {
      toast.error('Could not update the leave', err.message);
      return false;
    }
  };

  const view = useMemo(() => {
    if (!data) return null;
    const { dash, floors, messStats, complaints, invoices, leaves } = data;
    const rooms = dash.rooms || [];
    const students = dash.students || [];
    const now = new Date();
    const today = startOfDay(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const studentFloor = new Map(students.map((s) => [s.id, s.room?.floorNumber ?? null]));
    const inFloor = (studentId) => floor === 'all' || String(studentFloor.get(studentId)) === floor;

    const bedsIn = (list) => list.reduce((sum, r) => sum + (r.sharingType || r.capacity || 0), 0);
    const occupiedIn = (list) => list.reduce((sum, r) => sum + (r.students?.length || 0), 0);

    const floorRooms = floor === 'all' ? rooms : rooms.filter((r) => String(r.floorNumber) === floor);
    const totalBeds = bedsIn(floorRooms);
    const occupiedBeds = occupiedIn(floorRooms);
    const maintenanceBeds = bedsIn(floorRooms.filter((r) => r.status === 'MAINTENANCE'));
    const residents = students.filter((s) => inFloor(s.id)).length;

    const floorLeaves = leaves.filter((l) => inFloor(l.studentId));
    const floorInvoices = invoices.filter((i) => inFloor(i.studentId));
    const floorComplaints = complaints.filter((c) => inFloor(c.studentId));

    // Leaves
    const pendingLeaves = floorLeaves
      .filter((l) => l.status === 'PENDING')
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const outNow = floorLeaves
      .filter((l) => l.status === 'CHECKED_OUT')
      .map((l) => ({
        ...l,
        late: new Date(l.endDate) < today,
        dueToday: isSameDay(l.endDate, now),
      }))
      .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

    // Fees
    const unpaid = floorInvoices.filter((i) => i.status === 'UNPAID');
    const dues = unpaid.reduce((sum, i) => sum + (i.amount || 0), 0);
    const overdue = unpaid
      .filter((i) => i.dueDate && new Date(i.dueDate) < today)
      .map((i) => ({
        id: i.id,
        name: residentName(i),
        amount: i.amount || 0,
        daysLate: Math.max(1, Math.floor((today - startOfDay(i.dueDate)) / 86400000)),
      }))
      .sort((a, b) => b.daysLate - a.daysLate);
    const thisMonth = floorInvoices.filter((i) => new Date(i.createdAt) >= monthStart);
    const month = {
      billed: thisMonth.reduce((sum, i) => sum + (i.amount || 0), 0),
      collected: floorInvoices
        .filter((i) => i.status === 'PAID' && i.paidAt && new Date(i.paidAt) >= monthStart)
        .reduce((sum, i) => sum + (i.amount || 0), 0),
      pending: thisMonth.filter((i) => i.status === 'UNPAID').reduce((sum, i) => sum + (i.amount || 0), 0),
    };

    const openComplaints = floorComplaints.filter((c) => c.status !== 'RESOLVED');
    const visitorsInside = (dash.activeVisitors || []).filter((v) => inFloor(v.studentId));

    // Floor list comes from the Floor table; fall back to whatever floors rooms mention
    const floorNumbers = floors.length
      ? floors.map((f) => f.floorNumber)
      : [...new Set(rooms.map((r) => r.floorNumber).filter(Boolean))].sort((a, b) => a - b);
    const floorRows = floorNumbers.map((num) => {
      const meta = floors.find((f) => f.floorNumber === num);
      const list = rooms.filter((r) => r.floorNumber === num);
      return {
        num,
        company: meta?.companyName || '',
        hostel: meta?.hostelName || '',
        beds: bedsIn(list),
        occupied: occupiedIn(list),
      };
    });

    const meals = messStats?.mealStatsChartData || [];

    const activity = [
      ...floorLeaves.map((l) => ({
        id: `leave-${l.id}`,
        icon: CalendarDays,
        tone: 'lilac',
        text: `${residentName(l)} ${{ PENDING: 'applied for leave', APPROVED: '— leave approved', REJECTED: '— leave rejected', CHECKED_OUT: 'left the hostel', RETURNED: 'is back in the hostel' }[l.status] || ''}`,
        status: l.status,
        at: l.createdAt,
        to: '/admin/leaves',
      })),
      ...floorComplaints.map((c) => ({
        id: `complaint-${c.id}`,
        icon: Wrench,
        tone: 'peach',
        text: `${c.category || 'General'} issue${c.student?.room?.roomNumber ? ` · Room ${c.student.room.roomNumber}` : ''}`,
        status: c.status,
        at: c.createdAt,
        to: '/admin/complaints',
      })),
      ...floorInvoices.map((i) => ({
        id: `invoice-${i.id}`,
        icon: ReceiptText,
        tone: 'sun',
        text: i.status === 'PAID'
          ? `${residentName(i)} paid ${formatRupees(i.amount)}`
          : `Invoice ${formatRupees(i.amount)} raised for ${residentName(i)}`,
        status: i.status,
        at: i.status === 'PAID' ? i.paidAt || i.createdAt : i.createdAt,
        to: '/admin/fees',
      })),
    ]
      .filter((a) => a.at)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 6);

    return {
      floorRows,
      totalBeds,
      occupiedBeds,
      maintenanceBeds,
      vacantBeds: Math.max(0, totalBeds - occupiedBeds - maintenanceBeds),
      occupancyPct: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      residents,
      unpaidCount: unpaid.length,
      dues,
      overdue,
      month,
      pendingLeaves,
      outNow,
      dueBackToday: outNow.filter((l) => l.dueToday || l.late).length,
      openComplaints: openComplaints.length,
      pendingApprovals: (dash.pendingApprovals || []).length,
      visitorsInside,
      meals,
      activity,
      poll: dash.latestPoll,
    };
  }, [data, floor]);

  if (loading) return <DashboardSkeleton />;

  if (!view) {
    return (
      <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-10 flex flex-col items-center text-center gap-3">
        <span className="w-12 h-12 rounded-full bg-[var(--danger-bg)] text-[var(--danger)] flex items-center justify-center">
          <TriangleAlert size={22} />
        </span>
        <h2 className="text-[17px] font-bold m-0">Dashboard could not load</h2>
        <p className="text-[14px] text-[var(--text-secondary)] m-0">{error || 'Something went wrong.'}</p>
        <button className="btn-primary mt-2" onClick={() => { setLoading(true); load(); }}>
          <RefreshCw size={16} /> Try again
        </button>
      </div>
    );
  }

  const displayName = (user?.name || '').replace(/\s*\(.*\)\s*/, '').trim() || 'Warden';
  const selectedFloor = view.floorRows.find((f) => String(f.num) === floor) || null;
  const floorOptions = [
    { value: 'all', label: 'All' },
    ...view.floorRows.map((f) => ({ value: String(f.num), label: `Floor ${f.num}` })),
  ];
  const attention = [
    { label: 'Registrations to approve', count: view.pendingApprovals, to: '/admin/approvals', icon: BadgeCheck },
    { label: 'Leave requests pending', count: view.pendingLeaves.length, to: '/admin/leaves', icon: CalendarDays },
    { label: 'Complaints open', count: view.openComplaints, to: '/admin/complaints', icon: Wrench },
    { label: 'Invoices overdue', count: view.overdue.length, to: '/admin/fees', icon: IndianRupee },
  ];
  const attentionTotal = attention.reduce((sum, a) => sum + a.count, 0);

  const quickActions = [
    { label: 'Add student', icon: UserPlus, onClick: () => navigate('/admin/students', { state: { action: 'add' } }) },
    { label: 'Add room', icon: BedDouble, onClick: () => navigate('/admin/rooms', { state: { action: 'add' } }) },
    { label: 'Log visitor', icon: DoorOpen, onClick: () => navigate('/admin/visitors', { state: { action: 'add' } }) },
    { label: 'Invoices', icon: IndianRupee, onClick: () => navigate('/admin/fees') },
  ];

  const roomLegend = [
    { label: 'Occupied', value: view.occupiedBeds, color: 'var(--color-brand-500)' },
    { label: 'Vacant', value: view.vacantBeds, color: 'var(--color-sun-200)' },
    { label: 'Maintenance', value: view.maintenanceBeds, color: 'var(--color-peach-500)' },
  ];

  const refreshNow = () => {
    setRefreshing(true);
    load();
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5">
      {error && (
        <div className="md:col-span-2 xl:col-span-12 flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium">
          <TriangleAlert size={16} className="shrink-0" />
          <span className="flex-1">Could not refresh — showing the last loaded data. {error}</span>
          <button onClick={refreshNow} className="font-semibold underline bg-transparent border-none cursor-pointer text-[var(--danger)]">Retry</button>
        </div>
      )}

      {/* Welcome — the only place the floor is chosen */}
      <motion.section
        variants={rise}
        className="md:col-span-2 xl:col-span-8 relative overflow-hidden rounded-[var(--border-radius-card)] bg-[var(--sidebar-bg)] p-6 sm:p-7 flex items-stretch gap-4 min-h-[220px]"
      >
        <span className="absolute -left-10 -bottom-16 w-48 h-48 rounded-full bg-mint-300/40 pointer-events-none" />
        <div className="relative flex-1 min-w-0 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <p className="text-[13px] font-medium text-brand-700 m-0 pt-1.5">
                {greeting()}, {displayName} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <button
                onClick={refreshNow}
                className="lg:hidden h-9 w-9 shrink-0 rounded-xl bg-white/70 hover:bg-white border-none flex items-center justify-center text-brand-700 cursor-pointer transition-colors"
                aria-label="Refresh dashboard"
              >
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={floor}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="mt-2"
              >
                <p className="text-[12px] font-semibold text-[var(--text-tertiary)] m-0">Now viewing</p>
                <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-tight m-0">
                  {selectedFloor ? (
                    <>
                      Floor {selectedFloor.num}
                      {selectedFloor.company && <span className="text-brand-700"> · {selectedFloor.company}</span>}
                    </>
                  ) : (
                    <>All floors <span className="text-brand-700">· Hari Pushp PG</span></>
                  )}
                </h1>
                <p className="text-[14px] text-[var(--text-secondary)] mt-1 mb-0">
                  {selectedFloor?.hostel || 'Consolidated view of every floor'} · {plural(view.residents, 'resident')} · {view.occupancyPct}% occupied
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div role="radiogroup" aria-label="Choose floor" className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-white/70">
              {floorOptions.map((opt) => {
                const active = floor === opt.value;
                return (
                  <button
                    key={opt.value}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setFloor(opt.value)}
                    className={`relative h-9 px-3 rounded-lg border-none bg-transparent text-[13px] whitespace-nowrap cursor-pointer transition-colors ${
                      active ? 'text-sun-900 font-semibold' : 'text-[var(--text-secondary)] font-medium hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="dashboard-floor-pill"
                        className="absolute inset-0 rounded-lg bg-sun-300"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            {lastUpdated && (
              <span className="text-[12px] text-brand-700/80">Updated {timeAgo(lastUpdated)}</span>
            )}
          </div>
        </div>
        <button
          onClick={refreshNow}
          className="hidden lg:flex absolute top-5 right-5 z-10 h-9 w-9 rounded-xl bg-white/70 hover:bg-white border-none items-center justify-center text-brand-700 cursor-pointer transition-colors"
          aria-label="Refresh dashboard"
          title="Refresh now"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <motion.div
          className="relative hidden lg:flex items-end w-[220px] shrink-0 -mb-7 -mr-2"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <HostelIllustration className="w-full h-auto" />
        </motion.div>
      </motion.section>

      {/* Needs attention */}
      <Card className="md:col-span-2 xl:col-span-4 card-highlight flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold m-0 text-sun-900">Needs your attention</h2>
          {attentionTotal === 0 && (
            <span className="badge badge-success"><CircleCheck size={13} /> All clear</span>
          )}
        </div>
        <ul className="list-none m-0 p-0 flex flex-col gap-1.5 flex-1 justify-center">
          {attention.map(({ label, count, to, icon: Icon }) => (
            <li key={label}>
              <Link to={to} className="group flex items-center gap-3 px-3 py-2 rounded-xl bg-white/80 hover:bg-white transition-colors">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${count > 0 ? 'bg-sun-300 text-sun-900' : 'bg-cream-100 text-[var(--text-tertiary)]'}`}>
                  <Icon size={16} />
                </span>
                <span className={`flex-1 text-[14px] ${count > 0 ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                  {label}
                </span>
                <span className={`text-[16px] font-bold ${count > 0 ? 'text-sun-900' : 'text-[var(--text-tertiary)]'}`}>
                  <AnimatedNumber value={count} />
                </span>
                <ChevronRight size={16} className="text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      {/* Key numbers */}
      <div className="md:col-span-2 xl:col-span-12 grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        <StatTile
          to="/admin/rooms"
          icon={BedDouble}
          tone="mint"
          label="Beds occupied"
          caption={
            <div className="flex items-center gap-3">
              <ProgressBar value={view.occupiedBeds} max={view.totalBeds} height={6} label="Occupancy" trackClassName="bg-white/80" />
              <span className="shrink-0 font-semibold">{view.occupancyPct}%</span>
            </div>
          }
        >
          <AnimatedNumber value={view.occupiedBeds} />
          <span className="text-[16px] font-semibold text-[var(--text-tertiary)]"> / {view.totalBeds}</span>
        </StatTile>
        <StatTile
          to="/admin/leaves"
          icon={Footprints}
          tone="lilac"
          label="Out on leave"
          caption={view.dueBackToday ? `${view.dueBackToday} due back today` : 'Nobody due back today'}
        >
          <AnimatedNumber value={view.outNow.length} />
        </StatTile>
        <StatTile
          to="/admin/fees"
          icon={IndianRupee}
          tone="sun"
          label="Fees outstanding"
          caption={view.overdue.length ? `${plural(view.overdue.length, 'invoice')} overdue` : plural(view.unpaidCount, 'unpaid invoice')}
        >
          <AnimatedNumber value={view.dues} format={formatRupees} />
        </StatTile>
        <StatTile to="/admin/visitors" icon={DoorOpen} tone="peach" label="Visitors inside" caption="Checked in right now">
          <AnimatedNumber value={view.visitorsInside.length} />
        </StatTile>
      </div>

      {/* Action row */}
      <LeaveRequestsCard className="md:col-span-2 xl:col-span-7" leaves={view.pendingLeaves} onDecision={handleLeaveDecision} />
      <FeesMonthCard className="md:col-span-2 xl:col-span-5" month={view.month} overdue={view.overdue} />

      {/* Floor-wise occupancy */}
      <Card className="md:col-span-2 xl:col-span-5">
        <CardHeader icon={Building2} title="Floor-wise occupancy" to="/admin/floors" linkLabel="Directory" />
        {view.floorRows.length === 0 ? (
          <EmptyState icon={Building2} text="No floors set up yet." />
        ) : (
          <ul className="list-none m-0 p-0 flex flex-col gap-1">
            {view.floorRows.map((f, index) => {
              const selected = floor === String(f.num);
              const pct = f.beds ? Math.round((f.occupied / f.beds) * 100) : 0;
              return (
                <li key={f.num}>
                  <div
                    aria-current={selected ? 'true' : undefined}
                    className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all ${
                      selected ? 'bg-cream-100' : ''
                    } ${floor !== 'all' && !selected ? 'opacity-55' : ''}`}
                  >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-[14px] font-bold shrink-0 transition-colors ${
                      selected ? 'bg-sun-300 text-sun-900' : 'bg-mint-100 text-brand-700'
                    }`}>
                      {f.num}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-baseline justify-between gap-3 mb-1.5">
                        <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                          {f.company || `Floor ${f.num}`}
                        </span>
                        <span className="text-[12px] text-[var(--text-secondary)] shrink-0">
                          <strong className="text-[var(--text-primary)]">{f.occupied}</strong>/{f.beds} · {pct}%
                        </span>
                      </span>
                      <ProgressBar
                        value={f.occupied}
                        max={f.beds}
                        height={6}
                        tone={selected ? 'sun' : 'brand'}
                        delay={0.1 + index * 0.06}
                        label={`Floor ${f.num} occupancy`}
                        trackClassName={selected ? 'bg-white' : 'bg-mint-100'}
                      />
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Bed status */}
      <Card className="xl:col-span-3 flex flex-col">
        <CardHeader icon={ChartPie} title="Bed status" />
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <DonutRing
            segments={roomLegend.map(({ value, color }) => ({ value, color }))}
            label={`${view.occupancyPct}% of beds occupied`}
          >
            <span className="text-[28px] font-bold leading-none">
              <AnimatedNumber value={view.occupancyPct} />%
            </span>
            <span className="text-[12px] text-[var(--text-tertiary)] mt-1">occupied</span>
          </DonutRing>
          <ul className="list-none m-0 p-0 w-full flex flex-col gap-2">
            {roomLegend.map(({ label, value, color }) => (
              <li key={label} className="flex items-center gap-2.5 text-[13px]">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="flex-1 text-[var(--text-secondary)]">{label}</span>
                <span className="font-semibold">{value}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Recent activity */}
      <Card className="xl:col-span-4">
        <CardHeader icon={History} tone="lilac" title="Recent activity" to="/admin/activity-log" />
        {view.activity.length === 0 ? (
          <EmptyState icon={History} text="Leaves, complaints and payments will show up here." />
        ) : (
          <ol className="list-none m-0 p-0 relative">
            <span className="absolute left-[17px] top-3 bottom-3 w-px bg-[var(--border-color)]" aria-hidden="true" />
            {view.activity.map(({ id, icon: Icon, tone, text, status, at, to }, index) => (
              <motion.li
                key={id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <Link to={to} className="relative flex items-center gap-3 py-2 group">
                  <span className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white ${TONES[tone].soft}`}>
                    <Icon size={15} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-medium text-[var(--text-primary)] truncate group-hover:text-brand-700">{text}</span>
                    <span className="block text-[12px] text-[var(--text-tertiary)]">{timeAgo(at)}</span>
                  </span>
                  {status && <span className={`badge ${STATUS_BADGE[status] || 'badge-info'} shrink-0`}>{status.replace('_', ' ').toLowerCase()}</span>}
                </Link>
              </motion.li>
            ))}
          </ol>
        )}
      </Card>

      {/* In & out */}
      <OutsideCard className="xl:col-span-4" outNow={view.outNow} visitorsInside={view.visitorsInside} />

      {/* Today's meals */}
      <Card className="xl:col-span-4">
        <CardHeader icon={UtensilsCrossed} tone="peach" title="Today's meals" to="/admin/cook-dashboard" linkLabel="Kitchen" />
        {view.meals.length === 0 ? (
          <EmptyState icon={UtensilsCrossed} text="Meal data is not available." />
        ) : (
          <ul className="list-none m-0 p-0 grid grid-cols-2 gap-2.5">
            {view.meals.map((m, index) => {
              const MealIcon = MEAL_ICONS[m.name] || UtensilsCrossed;
              return (
                <li key={m.name} className="p-3 rounded-xl bg-peach-50 border border-peach-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-lg bg-white text-peach-700 flex items-center justify-center">
                      <MealIcon size={14} />
                    </span>
                    <span className="text-[13px] font-semibold">{m.name}</span>
                  </div>
                  <div className="text-[13px] text-[var(--text-secondary)] mb-1.5">
                    <strong className="text-[18px] text-[var(--text-primary)]">{m.Attended}</strong> / {m.Capacity}
                  </div>
                  <ProgressBar value={m.Attended} max={m.Capacity} tone="sun" height={5} delay={0.15 + index * 0.06} label={`${m.name} attendance`} trackClassName="bg-white" />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Quick actions + poll */}
      <div className="md:col-span-2 xl:col-span-4 flex flex-col gap-5">
        <Card>
          <h2 className="text-[15px] font-bold m-0 mb-3">Quick actions</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map(({ label, icon: Icon, onClick }) => (
              <motion.button
                key={label}
                onClick={onClick}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-cream-100 hover:bg-sun-100 border border-cream-200 text-left cursor-pointer transition-colors"
              >
                <span className="w-9 h-9 rounded-xl bg-sun-300 text-sun-900 flex items-center justify-center shrink-0">
                  <Icon size={17} />
                </span>
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</span>
              </motion.button>
            ))}
          </div>
        </Card>

        {view.poll && (
          <Card>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Vote size={16} className="text-brand-600" />
                <h2 className="text-[15px] font-bold m-0">Latest poll</h2>
              </div>
              <span className={`badge ${view.poll.isActive ? 'badge-success' : 'badge-info'}`}>
                {view.poll.isActive ? 'Live' : 'Closed'}
              </span>
            </div>
            <p className="text-[14px] font-medium text-[var(--text-primary)] mt-0 mb-3">{view.poll.question}</p>
            <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
              {(view.poll.options || []).map((o, index) => (
                <li key={o.option}>
                  <div className="flex justify-between text-[13px] mb-1">
                    <span className="text-[var(--text-secondary)] truncate">{o.option}</span>
                    <span className="font-semibold shrink-0">{o.percentage}%</span>
                  </div>
                  <ProgressBar value={o.percentage} max={100} height={6} delay={0.2 + index * 0.06} label={o.option} />
                </li>
              ))}
            </ul>
            <p className="text-[12px] text-[var(--text-tertiary)] mt-3 mb-0">{plural(view.poll.totalVotes || 0, 'vote')}</p>
          </Card>
        )}
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
