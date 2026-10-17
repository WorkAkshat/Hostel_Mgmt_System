import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, BedDouble, CalendarDays, ChevronDown, ClipboardCheck, Contact, DoorOpen, Download, KeyRound, Landmark,
  MessageSquareText, Moon, Radio, Receipt, SlidersHorizontal, Users, UtensilsCrossed, Wrench, X,
} from 'lucide-react';
import { activityLogs as activityLogsApi } from '../utils/api';
import FilterChips from '../components/ui/FilterChips';
import ProgressBar from '../components/ui/ProgressBar';
import Avatar from '../components/ui/Avatar';
import { EmptyPanel, ErrorPanel, PageHeader, SearchBox } from '../components/ui/PageStates';
import { downloadCsv, fmtDate, fmtTime, plural } from '../utils/format';

const MODULES = {
  AUTH: { label: 'Sign-ins', icon: KeyRound, chip: 'bg-lilac-50 text-lilac-700' },
  STUDENT: { label: 'Students', icon: Users, chip: 'bg-mint-100 text-brand-700' },
  ROOM: { label: 'Rooms', icon: BedDouble, chip: 'bg-mint-100 text-brand-700' },
  LEAVE: { label: 'Leaves', icon: CalendarDays, chip: 'bg-cream-100 text-sun-800' },
  VISITOR: { label: 'Visitors', icon: DoorOpen, chip: 'bg-cream-100 text-sun-800' },
  ATTENDANCE: { label: 'Roll call', icon: Moon, chip: 'bg-lilac-50 text-lilac-700' },
  MESS: { label: 'Mess', icon: UtensilsCrossed, chip: 'bg-peach-50 text-peach-700' },
  COMPLAINT: { label: 'Complaints', icon: Wrench, chip: 'bg-peach-50 text-peach-700' },
  SUGGESTION: { label: 'Suggestions', icon: MessageSquareText, chip: 'bg-peach-50 text-peach-700' },
  FEE: { label: 'Fees', icon: Receipt, chip: 'bg-sun-200 text-sun-900' },
  ACCOUNTING: { label: 'Accounts', icon: Landmark, chip: 'bg-sun-200 text-sun-900' },
  STAFF: { label: 'Staff', icon: Contact, chip: 'bg-mint-100 text-brand-700' },
};
const moduleMeta = (m) => MODULES[m] || { label: m ? m.charAt(0) + m.slice(1).toLowerCase() : 'System', icon: Activity, chip: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]' };

const ACTIONS = {
  LOGIN: 'Signed in', LOGOUT: 'Signed out', CREATE: 'Created', REGISTER: 'Registered', UPDATE: 'Updated', DELETE: 'Deleted',
  APPROVE: 'Approved', REJECT: 'Rejected', CHECKOUT: 'Gate exit', CHECKIN: 'Gate entry', PAYMENT: 'Payment', OPT_OUT: 'Meal skipped',
};
const ACTION_BADGE = { APPROVE: 'badge-success', PAYMENT: 'badge-success', CREATE: 'badge-info', REJECT: 'badge-danger', DELETE: 'badge-danger', UPDATE: 'badge-warning' };
const ROLE_LABEL = { ADMIN: 'Warden', STAFF: 'Staff', STUDENT: 'Student' };

const PAGE = 40;

const dayLabel = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return fmtDate(d, { weekday: 'long', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
};

const parseMeta = (raw) => {
  if (!raw) return null;
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const entries = Object.entries(obj || {}).filter(([, v]) => v !== '' && v != null && typeof v !== 'object');
    return entries.length ? entries : null;
  } catch {
    return null;
  }
};

const LogRow = ({ log }) => {
  const [open, setOpen] = useState(false);
  const meta = moduleMeta(log.module);
  const Icon = meta.icon;
  const details = parseMeta(log.metadata);
  const expandable = Boolean(details || log.ipAddress || log.targetType);
  return (
    <li className="relative pl-12 sm:pl-14">
      <span className={`absolute left-0 top-3 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${meta.chip}`}><Icon size={17} /></span>
      <div className="py-3 border-b border-[var(--border-color)]">
        <button
          onClick={() => expandable && setOpen((v) => !v)}
          aria-expanded={expandable ? open : undefined}
          className={`w-full text-left bg-transparent border-none p-0 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 ${expandable ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] text-[var(--text-primary)] leading-snug">{log.description}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[12px] text-[var(--text-tertiary)]">
              <span className="font-semibold text-[var(--text-secondary)]">{log.userName || 'System'}</span>
              {log.userRole && <span>· {ROLE_LABEL[log.userRole] || log.userRole}</span>}
              <span>· {meta.label}</span>
            </span>
          </span>
          <span className="flex items-center gap-2 shrink-0">
            <span className={`badge normal-case ${ACTION_BADGE[log.action] || 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>{ACTIONS[log.action] || log.action}</span>
            <span className="text-[12px] text-[var(--text-tertiary)] w-[62px] text-right">{fmtTime(log.createdAt)}</span>
            {expandable && <ChevronDown size={15} className={`text-[var(--text-tertiary)] transition-transform ${open ? 'rotate-180' : ''}`} />}
          </span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.dl
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[12px] bg-[var(--bg-primary)] rounded-xl px-3 py-2.5"
            >
              {details?.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-[var(--text-tertiary)] capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</dt>
                  <dd className="m-0 font-medium break-all">{String(v)}</dd>
                </div>
              ))}
              {log.targetType && <><dt className="text-[var(--text-tertiary)]">Record</dt><dd className="m-0 font-medium">{log.targetType}</dd></>}
              {log.ipAddress && <><dt className="text-[var(--text-tertiary)]">IP address</dt><dd className="m-0 font-medium">{log.ipAddress}</dd></>}
              <dt className="text-[var(--text-tertiary)]">Time</dt><dd className="m-0 font-medium">{new Date(log.createdAt).toLocaleString('en-IN')}</dd>
            </motion.dl>
          )}
        </AnimatePresence>
      </div>
    </li>
  );
};

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [module, setModule] = useState('ALL');
  const [showLogins, setShowLogins] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('ALL');
  const [action, setAction] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [moreFilters, setMoreFilters] = useState(false);
  const [live, setLive] = useState(false);
  const debounce = useRef(null);

  // Debounce typing in the search box
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(debounce.current);
  }, [search]);

  const params = useMemo(() => ({
    module: module === 'ALL' ? undefined : module,
    action: action === 'ALL' ? undefined : action,
    exclude: !showLogins && action === 'ALL' && module !== 'AUTH' ? 'LOGIN' : undefined,
    role,
    search: query,
    from,
    to,
    limit: PAGE,
  }), [module, action, showLogins, role, query, from, to]);

  const load = useCallback(async (nextPage = 1) => {
    try {
      setError(null);
      const res = await activityLogsApi.getLogs({ ...params, page: nextPage });
      setLogs((list) => (nextPage === 1 ? res.logs || [] : [...list, ...(res.logs || [])]));
      setTotal(res.total || 0);
      setPage(nextPage);
    } catch (err) {
      setError(err.message || 'Could not load the activity log.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [params]);

  useEffect(() => {
    setLoading(true);
    load(1);
  }, [load]);

  useEffect(() => {
    activityLogsApi.getStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (!live) return undefined;
    const id = setInterval(() => {
      load(1);
      activityLogsApi.getStats().then(setStats).catch(() => {});
    }, 20000);
    return () => clearInterval(id);
  }, [live, load]);

  const groups = useMemo(() => {
    const out = [];
    logs.forEach((log) => {
      const label = dayLabel(log.createdAt);
      if (!out.length || out[out.length - 1].label !== label) out.push({ label, items: [] });
      out[out.length - 1].items.push(log);
    });
    return out;
  }, [logs]);

  const moduleCounts = Object.fromEntries((stats?.moduleBreakdown || []).map((m) => [m.module, m.count]));
  const chipOptions = [
    { value: 'ALL', label: 'Everything' },
    ...Object.keys(MODULES).filter((k) => k !== 'AUTH' && moduleCounts[k]).map((k) => ({ value: k, label: MODULES[k].label, count: moduleCounts[k] })),
  ];
  const activeExtra = [role !== 'ALL', action !== 'ALL', from, to].filter(Boolean).length;
  const maxModule = Math.max(1, ...(stats?.moduleBreakdown || []).map((m) => m.count));

  const clearExtra = () => { setRole('ALL'); setAction('ALL'); setFrom(''); setTo(''); };

  const exportCsv = () =>
    downloadCsv(
      `activity-log-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Time', 'Who', 'Role', 'Area', 'Action', 'What happened', 'IP address'],
      logs.map((l) => [new Date(l.createdAt).toLocaleString('en-IN'), l.userName || 'System', ROLE_LABEL[l.userRole] || l.userRole || '', moduleMeta(l.module).label, ACTIONS[l.action] || l.action, l.description, l.ipAddress || ''])
    );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Activity Log"
        subtitle={stats ? `${plural(stats.todayLogs, 'action')} today · ${stats.weekLogs ?? stats.totalLogs} this week` : 'Who did what, and when'}
      >
        <button
          className={`${live ? 'btn-brand' : 'btn-secondary'}`}
          onClick={() => setLive((v) => !v)}
          aria-pressed={live}
          title="Refresh every 20 seconds"
        >
          <Radio size={16} className={live ? 'animate-pulse' : ''} /> {live ? 'Live' : 'Go live'}
        </button>
        <button className="btn-secondary" onClick={exportCsv} disabled={!logs.length}><Download size={16} /> <span className="hidden sm:inline">Export</span></button>
      </PageHeader>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <SearchBox value={search} onChange={setSearch} placeholder="Search what happened or who did it" className="flex-1" />
              <button className={`btn-secondary relative ${moreFilters ? 'bg-mint-50' : ''}`} onClick={() => setMoreFilters((v) => !v)} aria-expanded={moreFilters}>
                <SlidersHorizontal size={16} /> <span className="hidden sm:inline">Filters</span>
                {activeExtra > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-sun-400 text-sun-900 text-[11px] font-bold flex items-center justify-center">{activeExtra}</span>}
              </button>
            </div>
            <AnimatePresence initial={false}>
              {moreFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                    <select className="form-input cursor-pointer" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Who">
                      <option value="ALL">Anyone</option>
                      {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}s</option>)}
                    </select>
                    <select className="form-input cursor-pointer" value={action} onChange={(e) => setAction(e.target.value)} aria-label="Action">
                      <option value="ALL">Any action</option>
                      {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input type="date" className="form-input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
                    <input type="date" className="form-input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
                  </div>
                  {activeExtra > 0 && (
                    <button className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-brand-700 bg-transparent border-none cursor-pointer p-0" onClick={clearExtra}>
                      <X size={13} /> Clear filters
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <FilterChips id="log-module" value={module} onChange={setModule} options={chipOptions} />
              <label className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)] cursor-pointer select-none shrink-0">
                <input type="checkbox" className="w-4 h-4 accent-[var(--color-brand-600)]" checked={showLogins} onChange={(e) => setShowLogins(e.target.checked)} />
                Show sign-ins
              </label>
            </div>
          </div>

          {error && <ErrorPanel message={error} onRetry={() => { setLoading(true); load(1); }} />}

          {loading ? (
            <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5 flex flex-col gap-3" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-12 rounded-xl skeleton-loading" />)}
            </div>
          ) : logs.length === 0 ? (
            <EmptyPanel icon={ClipboardCheck} title="Nothing recorded" text={query || module !== 'ALL' || activeExtra ? 'No activity matches these filters.' : 'Actions by wardens, staff and students will appear here.'} />
          ) : (
            <section className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] px-4 sm:px-5 pb-3">
              {groups.map((g) => (
                <div key={g.label}>
                  <h2 className="sticky top-[var(--header-height)] z-[1] bg-white text-[12px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] m-0 pt-4 pb-1">{g.label}</h2>
                  <ul className="list-none m-0 p-0">
                    {g.items.map((log) => <LogRow key={log.id} log={log} />)}
                  </ul>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 pt-3">
                <span className="text-[12px] text-[var(--text-tertiary)]">Showing {logs.length} of {total}</span>
                {logs.length < total && (
                  <button className="btn-secondary h-9 px-4 text-[13px]" disabled={loadingMore} onClick={() => { setLoadingMore(true); load(page + 1); }}>
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Side summary */}
        <aside className="flex flex-col gap-5">
          <section className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5">
            <h2 className="text-[15px] font-bold m-0 mb-3">Busiest areas</h2>
            {!stats ? (
              <div className="h-24 rounded-xl skeleton-loading" />
            ) : (
              <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
                {stats.moduleBreakdown.slice(0, 6).map((m, i) => {
                  const meta = moduleMeta(m.module);
                  const Icon = meta.icon;
                  return (
                    <li key={m.module}>
                      <button onClick={() => { setModule(m.module); if (m.module === 'AUTH') setShowLogins(true); }} className="w-full bg-transparent border-none p-0 text-left cursor-pointer group">
                        <span className="flex items-center gap-2 text-[13px] mb-1">
                          <Icon size={14} className="text-[var(--text-tertiary)]" />
                          <span className="flex-1 group-hover:text-brand-700">{meta.label}</span>
                          <strong>{m.count}</strong>
                        </span>
                        <ProgressBar value={m.count} max={maxModule} tone={i === 0 ? 'brand' : 'sun'} height={5} delay={i * 0.05} label={`${meta.label} activity`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          {stats?.recentUsers?.length > 0 && (
            <section className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5">
              <h2 className="text-[15px] font-bold m-0 mb-3">Most active this week</h2>
              <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
                {stats.recentUsers.map((u) => (
                  <li key={`${u.userName}-${u.userRole}`}>
                    <button onClick={() => setSearch(u.userName)} className="w-full flex items-center gap-3 bg-transparent border-none p-0 cursor-pointer text-left group">
                      <Avatar name={u.userName} size={32} tone={u.userRole === 'STUDENT' ? 'mint' : u.userRole === 'STAFF' ? 'lilac' : 'sun'} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-semibold truncate group-hover:text-brand-700">{u.userName}</span>
                        <span className="block text-[11px] text-[var(--text-tertiary)]">{ROLE_LABEL[u.userRole] || u.userRole}</span>
                      </span>
                      <span className="text-[12px] font-semibold text-[var(--text-secondary)]">{u.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

export default ActivityLog;
