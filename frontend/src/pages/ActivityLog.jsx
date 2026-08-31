import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  User,
  Shield,
  Clock,
  Download,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  FileText,
  AlertTriangle,
  Users,
  Home,
  UtensilsCrossed,
  Receipt,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Sparkles,
  ArrowUpDown,
  Building2
} from 'lucide-react';
import { activityLogs as activityLogsApi } from '../utils/api';

const MODULES = [
  { id: 'ALL', label: 'All Modules', icon: '🌐' },
  { id: 'AUTH', label: 'Authentication', icon: '🔐', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'LEAVE', label: 'Leaves & Passes', icon: '🏖️', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'COMPLAINT', label: 'Complaints', icon: '🛠️', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'FEE', label: 'Fees & Demand Notes', icon: '🧾', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'ROOM', label: 'Rooms & Beds', icon: '🏠', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: 'VISITOR', label: 'Visitors', icon: '👥', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'MESS', label: 'Mess & Dining', icon: '🍽️', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'ACCOUNTING', label: 'Accounting & Vouchers', icon: '📊', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'ATTENDANCE', label: 'Night Attendance', icon: '🌙', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'STAFF', label: 'Staff Roster', icon: '👔', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { id: 'STUDENT', label: 'Students', icon: '🎓', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  { id: 'SUGGESTION', label: 'Suggestions', icon: '💬', color: 'bg-lime-100 text-lime-800 border-lime-200' },
];

const ACTIONS = [
  { id: 'ALL', label: 'All Actions' },
  { id: 'LOGIN', label: 'Login 🔑' },
  { id: 'LOGOUT', label: 'Logout 🚪' },
  { id: 'CREATE', label: 'Create / Submit ➕' },
  { id: 'UPDATE', label: 'Update ✏️' },
  { id: 'DELETE', label: 'Delete 🗑️' },
  { id: 'APPROVE', label: 'Approve ✅' },
  { id: 'REJECT', label: 'Reject ❌' },
  { id: 'CHECKOUT', label: 'Gate Exit 🚶' },
  { id: 'CHECKIN', label: 'Gate Entry 🏠' },
  { id: 'PAYMENT', label: 'Payment 💳' },
  { id: 'OPT_OUT', label: 'Meal Opt-Out 🚫' },
];

const ROLES = [
  { id: 'ALL', label: 'All Roles' },
  { id: 'ADMIN', label: 'Chief Warden / Admin' },
  { id: 'STUDENT', label: 'Student' },
  { id: 'STAFF', label: 'Staff / Security' },
];

const getActionBadge = (action) => {
  switch (action) {
    case 'LOGIN':
      return { label: 'Login', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'LOGOUT':
      return { label: 'Logout', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'CREATE':
    case 'REGISTER':
      return { label: 'Created', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'APPROVE':
      return { label: 'Approved', color: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold' };
    case 'REJECT':
      return { label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-300 font-bold' };
    case 'DELETE':
      return { label: 'Deleted', color: 'bg-red-50 text-red-700 border-red-200' };
    case 'UPDATE':
      return { label: 'Updated', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'CHECKOUT':
      return { label: 'Gate Exit', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'CHECKIN':
      return { label: 'Gate Entry', color: 'bg-teal-50 text-teal-700 border-teal-200' };
    case 'PAYMENT':
      return { label: 'Payment', color: 'bg-green-50 text-green-700 border-green-300 font-bold' };
    case 'OPT_OUT':
      return { label: 'Opt-Out', color: 'bg-orange-50 text-orange-700 border-orange-200' };
    default:
      return { label: action, color: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
};

const getRoleBadge = (role) => {
  switch (role) {
    case 'ADMIN':
      return { label: 'Admin', color: 'bg-indigo-100 text-indigo-800' };
    case 'STAFF':
      return { label: 'Staff', color: 'bg-purple-100 text-purple-800' };
    case 'STUDENT':
      return { label: 'Student', color: 'bg-emerald-100 text-emerald-800' };
    default:
      return { label: role || 'System', color: 'bg-slate-100 text-slate-600' };
  }
};

export default function ActivityLog() {
  const { user } = useAuth();

  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(40);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const searchTimeoutRef = useRef(null);

  // Fetch Stats
  const loadStats = useCallback(async () => {
    try {
      const res = await activityLogsApi.getStats();
      setStats(res?.data || res);
    } catch (e) {
      console.error('Error loading stats:', e);
    }
  }, []);

  // Fetch Logs
  const loadLogs = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const params = {
        page: targetPage,
        limit,
        module: selectedModule !== 'ALL' ? selectedModule : undefined,
        action: selectedAction !== 'ALL' ? selectedAction : undefined,
        role: selectedRole !== 'ALL' ? selectedRole : undefined,
        search: search.trim() || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      };

      const res = await activityLogsApi.getLogs(params);
      const data = res?.data || res || {};
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || 1);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error('Error loading activity logs:', e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, selectedModule, selectedAction, selectedRole, search, dateFrom, dateTo]);

  // Initial load
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadLogs(1);
  }, [selectedModule, selectedAction, selectedRole, dateFrom, dateTo]);

  // Search debounce
  const handleSearchChange = (val) => {
    setSearch(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      loadLogs(1);
    }, 350);
  };

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadLogs(page);
      loadStats();
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, page, loadLogs, loadStats]);

  // Quick Date Filter Presets
  const setDatePreset = (preset) => {
    const today = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const t = fmt(today);
      setDateFrom(t);
      setDateTo(t);
    } else if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const str = fmt(y);
      setDateFrom(str);
      setDateTo(str);
    } else if (preset === '7days') {
      const w = new Date(today);
      w.setDate(w.getDate() - 7);
      setDateFrom(fmt(w));
      setDateTo(fmt(today));
    } else if (preset === '30days') {
      const m = new Date(today);
      m.setDate(m.getDate() - 30);
      setDateFrom(fmt(m));
      setDateTo(fmt(today));
    } else if (preset === 'clear') {
      setDateFrom('');
      setDateTo('');
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (logs.length === 0) return;
    const headers = ['Timestamp', 'User', 'Role', 'Module', 'Action', 'Description', 'IP Address'];
    const rows = logs.map(l => [
      new Date(l.createdAt).toLocaleString('en-IN'),
      l.userName || 'System',
      l.userRole || '–',
      l.module,
      l.action,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      l.ipAddress || '–'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Activity_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fmtTime = (d) => {
    const date = new Date(d);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const fmtDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="animate-fade-in flex flex-col gap-5 text-left pb-12 min-h-screen">
      {/* ── HEADER ── */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Activity size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">System Activity Log</h1>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-indigo-200">
                Audit Trail
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Real-time trace of actions by students, wardens, staff, and system events</p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-2 ring-emerald-200 animate-pulse'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span>{autoRefresh ? 'Live Auto-Sync ON' : 'Live Sync OFF'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => { loadLogs(page); loadStats(); }}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition-all cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 border-none shadow-sm shadow-indigo-200 transition-all cursor-pointer"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── METRIC STATS BANNER ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black">
              📊
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Total Activities</span>
              <div className="text-xl font-black text-slate-900 leading-tight">{stats.totalLogs?.toLocaleString('en-IN') || 0}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-black">
              ⚡
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Today's Actions</span>
              <div className="text-xl font-black text-emerald-700 leading-tight">{stats.todayLogs?.toLocaleString('en-IN') || 0}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-black">
              🏛️
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Active Modules</span>
              <div className="text-xl font-black text-purple-700 leading-tight">{stats.moduleBreakdown?.length || 0}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-black">
              👥
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Top Actors</span>
              <div className="text-sm font-black text-slate-800 truncate max-w-[130px]">
                {stats.recentUsers?.[0]?.userName || 'Admin'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
        {/* Search & Main Selects */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user name or description..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-indigo-400 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); loadLogs(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-black"
              >
                ✕
              </button>
            )}
          </div>

          {/* Module Select */}
          <div className="md:col-span-3">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 cursor-pointer"
            >
              {MODULES.map(m => (
                <option key={m.id} value={m.id}>{m.icon} {m.label}</option>
              ))}
            </select>
          </div>

          {/* Action Select */}
          <div className="md:col-span-3">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 cursor-pointer"
            >
              {ACTIONS.map(a => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Role Select */}
          <div className="md:col-span-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 cursor-pointer"
            >
              {ROLES.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filters & Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Calendar size={13} /> Date Range:
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-400"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-400"
            />
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 mr-1">Quick:</span>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7D' },
              { id: '30days', label: 'Last 30D' },
              { id: 'clear', label: 'Reset' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all border ${
                  p.id === 'clear'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                    : 'bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border-slate-200 hover:border-indigo-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ACTIVITY TIMELINE / FEED ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {/* Feed Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Activity Feed</h3>
            <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full">
              {total} entries
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">
            Last synced at {lastRefreshed.toLocaleTimeString('en-IN', { hour12: false })}
          </span>
        </div>

        {/* Feed Content */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="spinner mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-400">Loading activity feed...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
              🔍
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800">No activities match your filters</h4>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Try clearing filters or search query to see all logs.</p>
            </div>
            <button
              onClick={() => {
                setSelectedModule('ALL');
                setSelectedAction('ALL');
                setSelectedRole('ALL');
                setDateFrom('');
                setDateTo('');
                setSearch('');
              }}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 border border-indigo-200 cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const actionBadge = getActionBadge(log.action);
              const roleBadge = getRoleBadge(log.userRole);
              const modInfo = MODULES.find(m => m.id === log.module) || { label: log.module, icon: '📌', color: 'bg-slate-100 text-slate-800 border-slate-200' };

              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  {/* Left: Avatar + Details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {(log.userName || 'S').charAt(0).toUpperCase()}
                    </div>

                    {/* Action & Info */}
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      {/* Top Badges Row */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-black text-slate-900 text-xs truncate max-w-[200px]">
                          {log.userName || 'System / Automated'}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${roleBadge.color}`}>
                          {roleBadge.label}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${actionBadge.color}`}>
                          {actionBadge.label}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${modInfo.color}`}>
                          {modInfo.icon} {modInfo.label}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-slate-700 font-semibold text-xs leading-relaxed break-words">
                        {log.description}
                      </p>

                      {/* Meta: Target Type & IP */}
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-semibold mt-0.5">
                        {log.targetType && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                            Target: {log.targetType}
                          </span>
                        )}
                        {log.ipAddress && (
                          <span className="text-slate-400">
                            IP: {log.ipAddress.replace(/^.*:/, '')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Timestamp */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <span className="text-xs font-black text-slate-800 font-mono">
                      {fmtTime(log.createdAt)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {fmtDate(log.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PAGINATION CONTROLS ── */}
        {totalPages > 1 && (
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold">
              Showing page <b className="text-slate-800">{page}</b> of <b className="text-slate-800">{totalPages}</b> ({total} logs)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (page > 1) {
                    setPage(page - 1);
                    loadLogs(page - 1);
                  }
                }}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={14} /> Prev
              </button>

              <button
                onClick={() => {
                  if (page < totalPages) {
                    setPage(page + 1);
                    loadLogs(page + 1);
                  }
                }}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
