import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Bell, Megaphone, LogOut, ChevronDown, Menu, Search, Sun, Moon } from 'lucide-react';

const Header = ({ isCollapsed, onMenuToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
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

  // Fetch notices for notifications badge
  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const noticesData = await api('/notices');
        setNotices(noticesData);
      } catch (error) {
        console.error('Error fetching notices in header:', error);
      }
    };

    if (user) {
      fetchNotices();
      const interval = setInterval(fetchNotices, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user) return null;

  const urgentNoticesCount = notices.length;

  const getPageTitle = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('students')) return 'Students Directory';
    if (path.includes('rooms')) return 'Rooms & Assets';
    if (path.includes('leaves')) return 'Leave Approvals';
    if (path.includes('mess')) return 'Mess Menu';
    if (path.includes('fees')) return 'Fees & Invoices';
    if (path.includes('complaints')) return 'Complaints Logs';
    if (path.includes('visitors')) return 'Visitor Log';
    if (path.includes('staff')) return 'Staff Roster';
    if (path.includes('gatepass')) return 'Gate Operations';
    return 'Home';
  };

  const leftOffset = isDesktop ? (isCollapsed ? '100px' : '280px') : '0px';

  return (
    <header 
      className={`h-[80px] fixed top-0 right-0 z-30 flex items-center justify-between px-4 sm:px-8 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(15,23,42,0.04)] border-b border-white/40' : 'bg-transparent border-b border-transparent'
      }`}
      style={{ left: leftOffset }}
    >
      {/* Left Section - Mobile Hamburger / Breadcrumbs */}
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
        {/* Notices Bell */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowNoticesDropdown(!showNoticesDropdown);
              setShowProfileDropdown(false);
            }} 
            className="w-10 h-10 rounded-full hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm flex items-center justify-center text-slate-500 cursor-pointer relative transition-all"
          >
            <Bell size={20} />
            {urgentNoticesCount > 0 && (
              <span className="absolute top-2 right-2 bg-[var(--danger)] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
                {urgentNoticesCount}
              </span>
            )}
          </button>

          {/* ... notices dropdown ... */}
          {showNoticesDropdown && (
            <div className="absolute -right-16 sm:right-0 top-12 w-[90vw] sm:w-[340px] max-w-[340px] max-h-[400px] rounded-[var(--border-radius-card)] flex flex-col shadow-2xl overflow-hidden border border-slate-200 bg-white/95 backdrop-blur-xl animate-fade-in z-50">
              <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-slate-50/80">
                <Megaphone size={18} className="text-[var(--secondary)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Notice Board</h3>
              </div>
              <div className="overflow-y-auto flex-grow p-2 custom-scrollbar">
                {notices.length === 0 ? (
                  <p className="py-8 px-4 text-center text-slate-400 text-[13px]">No announcements posted.</p>
                ) : (
                  notices.map((notice) => (
                    <div key={notice.id} className="p-3 rounded-[14px] border border-transparent hover:border-slate-100 flex flex-col gap-1.5 hover:bg-slate-50 transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                          style={{
                            ...notice.priority === 'URGENT' ? { background: 'rgba(239,68,68,0.08)', color: '#ef4444' } : 
                               notice.priority === 'WARNING' ? { background: 'rgba(245,158,11,0.08)', color: '#f59e0b' } : 
                               { background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }
                          }}
                        >
                          {notice.priority}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{new Date(notice.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-[13px] font-bold text-slate-800">{notice.title}</h4>
                      <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-2">{notice.content}</p>
                    </div>
                  ))
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
            <img src={`https://ui-avatars.com/api/?name=${user.name}&background=10b981&color=fff`} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
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
