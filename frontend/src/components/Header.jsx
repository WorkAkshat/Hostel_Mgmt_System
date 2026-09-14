import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { auth as authApi, leaves as leavesApi, complaints as complaintsApi, visitors as visitorsApi } from '../utils/api';
import { Bell, Megaphone, LogOut, ChevronDown, Menu, Search, Sun, Moon, CheckCheck, UserCheck, FileCheck, Wrench, Users, ArrowRight } from 'lucide-react';

const Header = ({ isCollapsed, onMenuToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  // Monitor scroll to add premium sticky shadow
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Save readIds to localStorage
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
          const [pendingUsers, leavesList, complaintsList, visitorsList, noticesList] = await Promise.all([
            authApi.getPending().catch(() => []),
            leavesApi.getAll().catch(() => []),
            complaintsApi.getAll().catch(() => []),
            visitorsApi.getAll().catch(() => []),
            api('/notices').catch(() => [])
          ]);

          if (pendingUsers && pendingUsers.length > 0) {
            list.push({
              id: 'pending-users',
              title: 'Registration Approvals',
              message: `${pendingUsers.length} pending registration request(s) awaiting your approval.`,
              link: '/admin/approvals',
              type: 'URGENT',
              icon: <UserCheck size={16} className="text-red-600" />,
              badgeBg: 'bg-red-50 text-red-600 border-red-100',
              time: 'Action Required'
            });
          }

          const pendingLeaves = (leavesList || []).filter(l => l.status === 'PENDING');
          if (pendingLeaves.length > 0) {
            list.push({
              id: 'pending-leaves',
              title: 'Leave Approvals',
              message: `${pendingLeaves.length} student leave application(s) pending review.`,
              link: '/admin/leaves',
              type: 'WARNING',
              icon: <FileCheck size={16} className="text-amber-600" />,
              badgeBg: 'bg-amber-50 text-amber-600 border-amber-100',
              time: 'Pending Review'
            });
          }

          const openComplaints = (complaintsList || []).filter(c => c.status !== 'RESOLVED');
          if (openComplaints.length > 0) {
            list.push({
              id: 'open-complaints',
              title: 'Maintenance Issues',
              message: `${openComplaints.length} helpdesk complaint ticket(s) currently active.`,
              link: '/admin/complaints',
              type: 'WARNING',
              icon: <Wrench size={16} className="text-blue-600" />,
              badgeBg: 'bg-blue-50 text-blue-600 border-blue-100',
              time: 'Inspection Needed'
            });
          }

          const activeVisitors = (visitorsList || []).filter(v => v.checkOutTime === null);
          if (activeVisitors.length > 0) {
            list.push({
              id: 'active-visitors',
              title: 'Guest Check-ins',
              message: `${activeVisitors.length} visitor(s) currently checked-in inside premises.`,
              link: '/admin/visitors',
              type: 'INFO',
              icon: <Users size={16} className="text-emerald-600" />,
              badgeBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
              time: 'Live On-site'
            });
          }

          (noticesList || []).forEach(n => {
            list.push({
              id: `notice-${n.id}`,
              title: n.title,
              message: n.content,
              type: n.priority || 'INFO',
              icon: <Megaphone size={16} className="text-indigo-600" />,
              badgeBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
              time: new Date(n.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
            });
          });
        } else {
          const noticesList = await api('/notices').catch(() => []);
          (noticesList || []).forEach(n => {
            list.push({
              id: `notice-${n.id}`,
              title: n.title,
              message: n.content,
              type: n.priority || 'INFO',
              icon: <Megaphone size={16} className="text-indigo-600" />,
              badgeBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
              time: new Date(n.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
            });
          });
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

  const unreadNotifications = notifications.filter(n => !readIds.includes(n.id));
  const unreadCount = unreadNotifications.length;

  const handleNotificationClick = (notif) => {
    if (!readIds.includes(notif.id)) {
      setReadIds(prev => [...prev, notif.id]);
    }
    setShowNoticesDropdown(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
  };

  const leftOffset = isDesktop ? (isCollapsed ? '100px' : '280px') : '0px';

  return (
    <header 
      className={`h-[80px] fixed top-0 right-0 z-30 flex items-center justify-between px-4 sm:px-8 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(15,23,42,0.04)] border-b border-white/40' : 'bg-transparent border-b border-transparent'
      }`}
      style={{ left: leftOffset }}
    >
      {/* Left Section - Mobile Hamburger / Greeting */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button 
          onClick={onMenuToggle}
          className="lg:hidden w-10 h-10 rounded-[14px] bg-white border border-slate-200 flex items-center justify-center cursor-pointer text-slate-700 hover:bg-slate-50 shadow-sm"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-sm font-medium text-slate-600 hidden xs:inline">Hello, <strong className="text-slate-900">{user.name}</strong> 👋</span>
              <span className="bg-blue-50 text-[var(--primary)] text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-blue-100 hidden xs:inline">
                {user.role === 'ADMIN' ? 'Chief Warden' : user.role === 'STAFF' ? 'Staff' : 'Student'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section - Search (Pill shaped) */}
      <div className="hidden md:flex items-center w-[360px] h-10 rounded-full bg-white shadow-sm border border-slate-200 px-4 gap-3 group focus-within:border-[var(--primary)] focus-within:shadow-md transition-all">
        <Search size={16} className="text-slate-400 group-focus-within:text-[var(--primary)]" />
        <input 
          type="text" 
          placeholder="Search anything..." 
          className="bg-transparent border-none outline-none text-[13px] w-full text-slate-700 placeholder-slate-400"
        />
        <div className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-400 font-medium">⌘K</div>
      </div>

      {/* Right Section - Utility Buttons & Dropdown */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Real-time Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNoticesDropdown(!showNoticesDropdown);
              setShowProfileDropdown(false);
            }} 
            className="w-10 h-10 rounded-full hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm flex items-center justify-center text-slate-500 cursor-pointer relative transition-all"
            title="Real-Time Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[10px] font-extrabold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Real-time Interactive Notifications Panel */}
          {showNoticesDropdown && (
            <div className="absolute -right-16 sm:right-0 top-12 w-[92vw] sm:w-[380px] max-w-[380px] max-h-[480px] rounded-[24px] flex flex-col shadow-2xl overflow-hidden border border-slate-200 bg-white/95 backdrop-blur-xl animate-fade-in z-50">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <Bell size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-extrabold text-slate-800">Live Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-red-50 text-red-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-red-100">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-transparent border-none cursor-pointer"
                  >
                    <CheckCheck size={14} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-grow p-2.5 custom-scrollbar flex flex-col gap-2">
                {notifications.length === 0 ? (
                  <div className="py-12 px-4 text-center flex flex-col items-center gap-2">
                    <CheckCheck size={32} className="text-emerald-500" />
                    <p className="text-slate-600 font-bold text-sm">All caught up!</p>
                    <p className="text-slate-400 text-xs">No pending requests or unread notifications.</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isRead = readIds.includes(notif.id);
                    return (
                      <div 
                        key={notif.id} 
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 rounded-[18px] border transition-all cursor-pointer flex items-start gap-3 text-left ${
                          isRead
                            ? 'bg-white border-slate-100 hover:bg-slate-50/80 opacity-75'
                            : 'bg-indigo-50/40 border-indigo-100 hover:bg-indigo-50/70 shadow-sm'
                        }`}
                      >
                        <div className="p-2 rounded-xl bg-white shadow-sm border border-slate-100 flex-shrink-0 mt-0.5">
                          {notif.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-2 mb-1">
                            <h4 className="text-[13px] font-extrabold text-slate-800 truncate">{notif.title}</h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase flex-shrink-0 ${notif.badgeBg}`}>
                              {notif.time}
                            </span>
                          </div>

                          <p className="text-[12px] text-slate-600 leading-snug line-clamp-2">{notif.message}</p>

                          {notif.link && (
                            <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800">
                              <span>Open page</span>
                              <ArrowRight size={12} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="w-10 h-10 rounded-full hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm flex items-center justify-center text-slate-500 cursor-pointer transition-all"
          title="Toggle Theme"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Profile Avatar & Dropdown */}
        <div className="relative">
          <div
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowNoticesDropdown(false);
            }}
            className="flex items-center gap-2 cursor-pointer p-1.5 pr-2 rounded-full border border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all"
          >
            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4f46e5&color=fff`} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
            <span className="hidden sm:block text-[13px] font-semibold text-slate-700 pl-1">{user.name}</span>
            <ChevronDown size={14} className="text-slate-500 hidden sm:inline ml-1" />
          </div>

          {showProfileDropdown && (
            <div className="absolute right-0 top-12 w-[240px] max-w-[90vw] rounded-[20px] shadow-[0_10px_35px_rgba(15,23,42,0.1)] p-2 border border-slate-200 bg-white/95 backdrop-blur-xl animate-fade-in z-50">
              <div className="p-4 bg-slate-50/50 rounded-[14px] border border-slate-100 mb-2">
                <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                <p className="text-[12px] text-slate-500 truncate mt-0.5">{user.email}</p>
              </div>
              <button 
                onClick={() => {
                  logout();
                  navigate('/login');
                }} 
                className="flex items-center gap-3 w-full p-3 bg-transparent border-none rounded-[12px] cursor-pointer text-[13px] text-left transition-all hover:bg-rose-50 text-rose-600 font-semibold"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
