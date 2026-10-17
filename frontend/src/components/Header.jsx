import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api, { auth as authApi, leaves as leavesApi, complaints as complaintsApi, visitors as visitorsApi } from '../utils/api';
import { Bell, Megaphone, LogOut, ChevronDown, Menu, Search, CheckCheck, UserCheck, FileCheck, Wrench, Users, ArrowRight } from 'lucide-react';
import { getSearchablePages, getInitials, ROLE_LABELS } from '../config/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SIDEBAR_COLLAPSED, SIDEBAR_EXPANDED } from './Sidebar';
import { adminExtraNotifications, studentNotifications } from '../utils/notifications';

const noticeToNotification = (n) => ({
  id: `notice-${n.id}`,
  title: n.title,
  message: n.content,
  type: n.priority || 'INFO',
  icon: <Megaphone size={16} className="text-brand-600" />,
  badgeBg: 'bg-brand-50 text-brand-700',
  time: new Date(n.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
});

const Header = ({ isCollapsed, onMenuToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('hms_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [showNoticesDropdown, setShowNoticesDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close the page-search results when clicking elsewhere
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('hms_read_notifications', JSON.stringify(readIds));
    } catch (e) {}
  }, [readIds]);

  // Real-time live notifications fetcher
  useEffect(() => {
    const fetchRealNotifications = async () => {
      if (!user) return;
      try {
        const list = [];

        if (user.role === 'ADMIN') {
          const [pendingUsers, leavesList, complaintsList, visitorsList, noticesList, extras] = await Promise.all([
            authApi.getPending().catch(() => []),
            leavesApi.getAll().catch(() => []),
            complaintsApi.getAll().catch(() => []),
            visitorsApi.getAll().catch(() => []),
            api('/notices').catch(() => []),
            adminExtraNotifications().catch(() => [])
          ]);

          if (pendingUsers && pendingUsers.length > 0) {
            list.push({
              id: 'pending-users',
              title: 'Registration approvals',
              message: `${pendingUsers.length} pending registration request(s) awaiting your approval.`,
              link: '/admin/approvals',
              type: 'URGENT',
              icon: <UserCheck size={16} className="text-[var(--danger)]" />,
              badgeBg: 'bg-[var(--danger-bg)] text-[var(--danger)]',
              time: 'Action required'
            });
          }

          const pendingLeaves = (leavesList || []).filter(l => l.status === 'PENDING');
          if (pendingLeaves.length > 0) {
            list.push({
              id: 'pending-leaves',
              title: 'Leave approvals',
              message: `${pendingLeaves.length} student leave application(s) pending review.`,
              link: '/admin/leaves',
              type: 'WARNING',
              icon: <FileCheck size={16} className="text-[var(--warning)]" />,
              badgeBg: 'bg-[var(--warning-bg)] text-[var(--warning)]',
              time: 'Pending review'
            });
          }

          const openComplaints = (complaintsList || []).filter(c => c.status !== 'RESOLVED');
          if (openComplaints.length > 0) {
            list.push({
              id: 'open-complaints',
              title: 'Maintenance issues',
              message: `${openComplaints.length} complaint ticket(s) currently open.`,
              link: '/admin/complaints',
              type: 'WARNING',
              icon: <Wrench size={16} className="text-brand-600" />,
              badgeBg: 'bg-brand-50 text-brand-700',
              time: 'Inspection needed'
            });
          }

          const activeVisitors = (visitorsList || []).filter(v => v.checkOutTime === null);
          if (activeVisitors.length > 0) {
            list.push({
              id: 'active-visitors',
              title: 'Visitors inside',
              message: `${activeVisitors.length} visitor(s) currently checked in.`,
              link: '/admin/visitors',
              type: 'INFO',
              icon: <Users size={16} className="text-[var(--success)]" />,
              badgeBg: 'bg-[var(--success-bg)] text-[var(--success)]',
              time: 'On site'
            });
          }

          list.push(...extras);
          (noticesList || []).forEach(n => list.push(noticeToNotification(n)));
        } else if (user.role === 'STUDENT') {
          // Warden decisions on this student's leaves, complaints, bills and ideas
          const [mine, noticesList] = await Promise.all([
            studentNotifications(user).catch(() => []),
            api('/notices').catch(() => [])
          ]);
          list.push(...mine);
          (noticesList || []).forEach(n => list.push(noticeToNotification(n)));
        } else {
          const noticesList = await api('/notices').catch(() => []);
          (noticesList || []).forEach(n => list.push(noticeToNotification(n)));
        }

        setNotifications(list);
      } catch (error) {
        console.error('Error fetching real-time notifications:', error);
      }
    };

    fetchRealNotifications();
    const interval = setInterval(fetchRealNotifications, 20000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  const trimmedQuery = query.trim().toLowerCase();
  const searchResults = trimmedQuery
    ? getSearchablePages(user.role).filter(page =>
        `${page.section || ''} ${page.name}`.toLowerCase().includes(trimmedQuery)
      )
    : [];

  const goToPage = (path) => {
    navigate(path);
    setQuery('');
    setSearchOpen(false);
  };

  const handleNotificationClick = (notif) => {
    if (!readIds.includes(notif.id)) {
      setReadIds(prev => [...prev, notif.id]);
    }
    setShowNoticesDropdown(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const markAllAsRead = () => setReadIds(notifications.map(n => n.id));

  const leftOffset = isDesktop ? (isCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED) : 0;

  return (
    <header
      className="h-[var(--header-height)] fixed top-0 right-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-8 bg-white/95 border-b border-[var(--border-color)] transition-[left] duration-300"
      style={{ left: leftOffset }}
    >
      {/* Left — menu toggle + page search */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-10 h-10 shrink-0 rounded-xl bg-mint-100 border-none flex items-center justify-center cursor-pointer text-brand-700 hover:bg-mint-200"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <span className="md:hidden text-[15px] font-bold text-[var(--text-primary)] truncate">Hari Pushp Tower</span>

        <div ref={searchRef} className="relative hidden md:block w-full max-w-[380px]">
          <div className="flex items-center gap-2 h-10 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 focus-within:border-brand-400 focus-within:bg-white transition-colors">
            <Search size={16} className="text-[var(--text-tertiary)] shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults[0]) goToPage(searchResults[0].path);
                if (e.key === 'Escape') setSearchOpen(false);
              }}
              placeholder="Jump to a page…"
              aria-label="Search pages"
              className="bg-transparent border-none outline-none text-[14px] w-full text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            />
          </div>
          {searchOpen && trimmedQuery && (
            <div className="absolute left-0 right-0 top-12 bg-white rounded-xl border border-[var(--border-color)] shadow-[var(--shadow-lg)] p-1.5 z-50 animate-fade-in">
              {searchResults.length === 0 ? (
                <p className="px-3 py-2.5 text-[13px] text-[var(--text-tertiary)]">No matching page</p>
              ) : (
                searchResults.map(({ path, name, section, icon: Icon }) => (
                  <button
                    key={path}
                    onClick={() => goToPage(path)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-[14px] text-[var(--text-primary)] hover:bg-mint-100 border-none bg-transparent cursor-pointer"
                  >
                    <Icon size={16} className="text-brand-600 shrink-0" />
                    <span className="truncate">{name}</span>
                    {section && <span className="ml-auto text-[12px] text-[var(--text-tertiary)] shrink-0">{section}</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right — notifications + profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="relative">
          <button
            onClick={() => {
              setShowNoticesDropdown(!showNoticesDropdown);
              setShowProfileDropdown(false);
            }}
            className="w-10 h-10 rounded-xl bg-transparent hover:bg-mint-100 border-none flex items-center justify-center text-[var(--text-secondary)] cursor-pointer relative transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-[var(--danger)] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
          {showNoticesDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute -right-14 sm:right-0 top-12 w-[92vw] sm:w-[380px] max-w-[380px] max-h-[480px] rounded-2xl flex flex-col shadow-[var(--shadow-lg)] overflow-hidden border border-[var(--border-color)] bg-white z-50 origin-top-right"
            >
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-bold">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-[var(--danger-bg)] text-[var(--danger)] text-[11px] font-semibold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[12px] font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1 bg-transparent border-none cursor-pointer"
                  >
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-grow p-2 custom-scrollbar flex flex-col gap-1">
                {notifications.length === 0 ? (
                  <div className="py-12 px-4 text-center flex flex-col items-center gap-2">
                    <CheckCheck size={28} className="text-[var(--success)]" />
                    <p className="text-[var(--text-primary)] font-semibold text-sm">All caught up</p>
                    <p className="text-[var(--text-tertiary)] text-xs">No pending requests or unread notifications.</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isRead = readIds.includes(notif.id);
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3 rounded-xl transition-colors cursor-pointer flex items-start gap-3 text-left ${
                          isRead ? 'opacity-70 hover:bg-[var(--bg-primary)]' : 'bg-mint-50 hover:bg-mint-100'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-[var(--border-color)] flex items-center justify-center shrink-0">
                          {notif.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-2 mb-0.5">
                            <h4 className="text-[13px] font-semibold truncate">{notif.title}</h4>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${notif.badgeBg}`}>
                              {notif.time}
                            </span>
                          </div>
                          <p className="text-[12px] text-[var(--text-secondary)] leading-snug line-clamp-2 m-0">{notif.message}</p>
                          {notif.link && (
                            <div className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold text-brand-700">
                              Open page <ArrowRight size={12} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowNoticesDropdown(false);
            }}
            className="flex items-center gap-2.5 cursor-pointer p-1 pr-2 rounded-xl border-none bg-transparent hover:bg-mint-100 transition-colors"
            aria-label="Account menu"
          >
            <span className="w-9 h-9 rounded-full bg-sun-300 text-sun-900 flex items-center justify-center text-[13px] font-bold">
              {getInitials(user.name)}
            </span>
            <span className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-[13px] font-semibold text-[var(--text-primary)] max-w-[140px] truncate">{user.name}</span>
              <span className="text-[11px] text-[var(--text-tertiary)]">{ROLE_LABELS[user.role]}</span>
            </span>
            <ChevronDown size={14} className="text-[var(--text-tertiary)] hidden sm:inline" />
          </button>

          <AnimatePresence>
          {showProfileDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 w-[240px] max-w-[90vw] rounded-2xl shadow-[var(--shadow-lg)] p-1.5 border border-[var(--border-color)] bg-white z-50 origin-top-right"
            >
              <div className="px-3 py-3 mb-1 border-b border-[var(--border-color)]">
                <p className="text-sm font-semibold truncate m-0">{user.name}</p>
                <p className="text-[12px] text-[var(--text-tertiary)] truncate mt-0.5 mb-0">{user.email}</p>
              </div>
              {user.role === 'STUDENT' && (
                <button
                  onClick={() => { setShowProfileDropdown(false); navigate('/student/profile'); }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 bg-transparent border-none rounded-lg cursor-pointer text-[14px] text-left transition-colors hover:bg-mint-50 font-medium"
                >
                  <UserCheck size={16} className="text-brand-600" />
                  My profile
                </button>
              )}
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 bg-transparent border-none rounded-lg cursor-pointer text-[14px] text-left transition-colors hover:bg-[var(--danger-bg)] text-[var(--danger)] font-medium"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
