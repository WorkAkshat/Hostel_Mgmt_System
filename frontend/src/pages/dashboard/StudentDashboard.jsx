import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Coffee,
  Cookie,
  CreditCard,
  Download,
  FileText,
  GraduationCap,
  Heart,
  Home,
  IndianRupee,
  MapPin,
  Moon,
  Phone,
  Receipt,
  RefreshCw,
  Send,
  ShieldCheck,
  Soup,
  Sparkles,
  UtensilsCrossed,
  Wrench,
  ChevronRight,
  Clock,
  CircleCheck,
  Building2,
  BedDouble,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  dashboard as dashboardApi,
  fees as feesApi,
  leaves as leavesApi,
  mess as messApi,
  complaints as complaintsApi
} from '../../utils/api';
import Avatar from '../../components/ui/Avatar';
import ProgressBar from '../../components/ui/ProgressBar';

const MEAL_ICONS = {
  Breakfast: Coffee,
  Lunch: Soup,
  Snacks: Cookie,
  Dinner: Moon,
};

const COMPANY_FLOOR_MAP = {
  1: 'Rajken Enterprises (1st Floor)',
  2: 'Vandana Enterprises (2nd Floor)',
  3: 'Pushpa Enterprises (3rd Floor)',
  4: 'Harish Chandra Enterprises (4th Floor)',
  5: 'Ramesh Enterprises (5th Floor)',
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [todayMenu, setTodayMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dashData, feeList, leaveList, menuData] = await Promise.all([
        dashboardApi.getDashboard().catch(() => null),
        feesApi.getAll().catch(() => []),
        leavesApi.getMyLeaves().catch(() => []),
        messApi.getMenu().catch(() => null),
      ]);

      setStats(dashData);
      setInvoices(feeList || []);
      setLeaves(leaveList || []);

      // Extract today's day of week
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDay = dayNames[new Date().getDay()];
      if (menuData && menuData[todayDay]) {
        setTodayMenu(menuData[todayDay]);
      }
    } catch (err) {
      console.error('Error loading student dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5" aria-busy="true">
        <div className="md:col-span-2 xl:col-span-12 h-[220px] rounded-[var(--border-radius-card)] skeleton-loading" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="xl:col-span-3 h-[120px] rounded-[var(--border-radius-card)] skeleton-loading" />
        ))}
        <div className="md:col-span-2 xl:col-span-7 h-[300px] rounded-[var(--border-radius-card)] skeleton-loading" />
        <div className="md:col-span-2 xl:col-span-5 h-[300px] rounded-[var(--border-radius-card)] skeleton-loading" />
      </div>
    );
  }

  const profile = stats?.profile || user?.studentDetails || {};
  const room = profile.room || user?.studentDetails?.room || null;
  const floorNum = room?.floor || (room?.roomNumber ? parseInt(String(room.roomNumber)[0]) : null);
  const companyName = floorNum ? COMPANY_FLOOR_MAP[floorNum] || `Floor ${floorNum}` : 'Hari Pushp PG';

  // Metrics
  const activeLeaves = leaves.filter((l) => l.status === 'PENDING' || l.status === 'APPROVED' || l.status === 'CHECKED_OUT').length;
  const pendingFees = invoices.filter((inv) => inv.status !== 'PAID').reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  const latestInvoice = invoices[0] || null;
  const activeLeave = leaves[0] || null;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Student Hero Profile Banner */}
      <div className="relative rounded-[24px] bg-gradient-to-r from-brand-800 via-brand-700 to-brand-900 text-white p-6 sm:p-8 overflow-hidden shadow-md">
        {/* Subtle decorative circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none blur-2xl" />
        <div className="absolute -bottom-16 -right-8 w-48 h-48 rounded-full bg-sun-300/10 pointer-events-none blur-xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center font-extrabold text-2xl sm:text-3xl text-white shadow-inner shrink-0 overflow-hidden">
              {profile.profilePic || user.avatar ? (
                <img src={profile.profilePic || user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span>{user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white m-0 truncate">
                  {user.name}
                </h1>
                <span className="inline-flex items-center gap-1 bg-sun-300 text-sun-900 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs">
                  <UserCheck size={12} />
                  Resident Student
                </span>
              </div>
              <p className="text-white/80 text-xs sm:text-sm font-medium m-0 flex items-center gap-2">
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-white/90">
                  {profile.rollNumber || user.studentDetails?.rollNumber || 'HARIPUSHP_PG'}
                </span>
                <span>&bull;</span>
                <span className="truncate">{user.email}</span>
              </p>
              <p className="text-white/70 text-[12px] font-medium m-0 mt-0.5 flex items-center gap-1.5">
                <Building2 size={13} className="text-sun-300" />
                <span>{companyName}</span>
              </p>
            </div>
          </div>

          {/* Room Badge */}
          {room ? (
            <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl p-4 sm:px-6 sm:py-4 flex flex-col items-center md:items-end text-center md:text-right shrink-0">
              <span className="text-[11px] text-white/70 font-semibold uppercase tracking-wider">Allocated Room</span>
              <span className="text-2xl sm:text-3xl font-black text-sun-300 leading-tight">
                {room.roomNumber}
              </span>
              <span className="text-[12px] text-white/90 font-medium">
                {room.block ? `${room.block} Block &bull; ` : ''}{room.sharingType || 2}-Sharing Room
              </span>
            </div>
          ) : (
            <div className="bg-white/10 border border-white/20 rounded-2xl px-5 py-3 text-center md:text-right shrink-0">
              <span className="text-xs text-white/80 font-medium">Room Assignment in progress</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Top KPI Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Outstanding Fees */}
        <Link
          to="/student/fees"
          className="glass-card glass-card-interactive p-4 sm:p-5 flex flex-col justify-between text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Due Invoices</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Receipt size={16} />
            </span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)]">
              {pendingFees > 0 ? `₹${pendingFees.toLocaleString('en-IN')}` : '₹0'}
            </span>
            <span className={`block text-[12px] font-semibold mt-1 ${pendingFees > 0 ? 'text-amber-700' : 'text-[var(--success)]'}`}>
              {pendingFees > 0 ? 'Payment Pending' : 'All Dues Cleared'}
            </span>
          </div>
        </Link>

        {/* Active Leave Requests */}
        <Link
          to="/student/leaves"
          className="glass-card glass-card-interactive p-4 sm:p-5 flex flex-col justify-between text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Gate Passes</span>
            <span className="w-8 h-8 rounded-xl bg-mint-100 text-brand-700 flex items-center justify-center">
              <CalendarDays size={16} />
            </span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)]">
              {activeLeaves}
            </span>
            <span className="block text-[12px] font-semibold text-brand-700 mt-1">
              {activeLeaves > 0 ? `${activeLeaves} Active / Pending` : 'No Active Pass'}
            </span>
          </div>
        </Link>

        {/* Mess Today */}
        <Link
          to="/student/mess"
          className="glass-card glass-card-interactive p-4 sm:p-5 flex flex-col justify-between text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Mess Today</span>
            <span className="w-8 h-8 rounded-xl bg-sun-100 text-sun-900 flex items-center justify-center">
              <UtensilsCrossed size={16} />
            </span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)]">
              4 Meals
            </span>
            <span className="block text-[12px] font-semibold text-sun-900 mt-1">
              Breakfast &bull; Lunch &bull; Dinner
            </span>
          </div>
        </Link>

        {/* Helpdesk */}
        <Link
          to="/student/complaints"
          className="glass-card glass-card-interactive p-4 sm:p-5 flex flex-col justify-between text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Helpdesk</span>
            <span className="w-8 h-8 rounded-xl bg-peach-100 text-peach-700 flex items-center justify-center">
              <Wrench size={16} />
            </span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)]">
              Support
            </span>
            <span className="block text-[12px] font-semibold text-peach-700 mt-1">
              File Maintenance Ticket
            </span>
          </div>
        </Link>
      </div>

      {/* 3. Main Split Sections (Today's Menu & Invoices) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Today's Mess Menu Card */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="glass-card p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3.5">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-mint-100 text-brand-700 flex items-center justify-center">
                  <UtensilsCrossed size={16} />
                </span>
                <h3 className="text-[16px] font-bold text-[var(--text-primary)] m-0">
                  Today's Mess Menu
                </h3>
              </div>
              <Link
                to="/student/mess"
                className="text-[13px] font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1"
              >
                <span>Full Menu</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {todayMenu ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map((meal) => {
                  const Icon = MEAL_ICONS[meal] || UtensilsCrossed;
                  const itemText = todayMenu[meal] || 'Chef Special &bull; Rotating Menu';
                  return (
                    <div
                      key={meal}
                      className="p-3.5 rounded-xl bg-mint-50/60 border border-mint-100 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-brand-600 text-white flex items-center justify-center">
                          <Icon size={13} />
                        </span>
                        <span className="font-bold text-[13px] text-brand-900">{meal}</span>
                      </div>
                      <p className="text-[12px] text-[var(--text-secondary)] font-medium m-0 leading-snug">
                        {itemText}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-[var(--text-tertiary)] text-xs">
                <span>Healthy, hygienic home-style meals are served daily.</span>
              </div>
            )}
          </div>

          {/* Quick Gate Pass Status */}
          {activeLeave && (
            <div className="glass-card p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-mint-100 text-brand-700 flex items-center justify-center">
                    <CalendarDays size={16} />
                  </span>
                  <h3 className="text-[15px] font-bold text-[var(--text-primary)] m-0">
                    Active Gate Pass Status
                  </h3>
                </div>
                <span className="badge badge-info uppercase text-[10px] font-bold">
                  {activeLeave.status}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-xs">
                <p className="m-0 font-medium text-[var(--text-secondary)]">
                  <strong>Reason:</strong> {activeLeave.reason}
                </p>
                <p className="m-0 font-medium text-[var(--text-tertiary)]">
                  From: {new Date(activeLeave.startDate).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })} &bull; Back by: {new Date(activeLeave.endDate).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Invoices & Fee Status */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="glass-card p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3.5">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Receipt size={16} />
                </span>
                <h3 className="text-[16px] font-bold text-[var(--text-primary)] m-0">
                  Fee Invoices
                </h3>
              </div>
              <Link
                to="/student/fees"
                className="text-[13px] font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {latestInvoice ? (
              <div className="flex flex-col gap-3">
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-[var(--text-primary)]">
                      Invoice #{String(latestInvoice.id).slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        latestInvoice.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {latestInvoice.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs border-t border-[var(--border-color)] pt-2 mt-1">
                    <div>
                      <span className="text-[10px] text-[var(--text-tertiary)] block">Rent</span>
                      <span className="font-bold">₹{Number(latestInvoice.rentAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-tertiary)] block">Mess</span>
                      <span className="font-bold">₹{Number(latestInvoice.messAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-tertiary)] block">Power</span>
                      <span className="font-bold">₹{Number(latestInvoice.electricityAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-2 mt-1">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">Total Amount:</span>
                    <span className="text-[15px] font-extrabold text-brand-800">
                      ₹{Number(latestInvoice.totalAmount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <Link
                  to="/student/fees"
                  className="w-full h-11 bg-sun-300 hover:bg-sun-400 text-sun-900 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-[13px] shadow-xs"
                >
                  <CreditCard size={15} />
                  <span>{latestInvoice.status === 'PAID' ? 'View Payment Receipt' : 'Pay Pending Fees'}</span>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 text-[var(--text-tertiary)] text-xs">
                <CircleCheck size={24} className="mx-auto mb-1 text-[var(--success)]" />
                <span>No fee invoices pending at this moment.</span>
              </div>
            )}
          </div>

          {/* Quick Helpdesk Ticket Button */}
          <div className="glass-card p-4 sm:p-5 flex items-center justify-between gap-4 bg-mint-50/50 border border-mint-100">
            <div>
              <h4 className="text-[14px] font-bold text-brand-900 m-0">Need any Maintenance?</h4>
              <p className="text-[12px] text-brand-700 m-0 mt-0.5">Report AC, plumbing, or room issues to the warden.</p>
            </div>
            <Link
              to="/student/complaints"
              className="btn-secondary h-9 px-3.5 text-[12px] font-bold shrink-0 bg-white"
            >
              Report Issue
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
