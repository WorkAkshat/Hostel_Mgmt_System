import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Bell, Megaphone, LogOut, ChevronDown, Menu } from 'lucide-react';


const Header = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const [notices, setNotices] = useState([]);
  const [showNoticesDropdown, setShowNoticesDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

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

  return (
    <header className="h-[var(--header-height)] fixed top-0 right-0 left-0 lg:left-[var(--sidebar-width)] z-30 rounded-none border-b border-[var(--border-color)] flex items-center justify-between px-4 lg:px-10 bg-white/80 backdrop-blur-md shadow-sm">
      {/* Desktop Header Left */}
      <div className="hidden lg:flex items-center gap-4">
        <span className="text-base text-[var(--text-primary)]">
          Hello, <strong className="font-bold text-[var(--text-primary)]">{user.name}</strong>
        </span>
        <span className="bg-[var(--accent-light)] text-[var(--accent)] px-2.5 py-0.5 rounded-md text-xs font-semibold">
          {user.role === 'ADMIN' ? 'Chief Warden' : user.role === 'STAFF' ? 'Staff Portal' : `Room ${user.studentDetails?.room?.roomNumber || 'Unassigned'}`}
        </span>
      </div>

      {/* Mobile Header Left (mockup style) */}
      <div className="flex lg:hidden items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-base shadow-sm">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col text-left leading-tight">
          <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">Hello,</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">{user.name}</span>
        </div>
      </div>

      {/* Mobile Header Right - Hostel Connect Logo (mockup style) */}
      <div className="flex lg:hidden items-center gap-1.5">
        <span className="text-sm font-bold text-[#0b1a52] font-heading">Hostel Connect</span>
        <span className="text-[#0b1a52]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94-3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </span>
      </div>

      {/* Desktop Header Right (Notifications, Profile Dropdown) */}
      <div className="hidden lg:flex items-center gap-5">
        {/* Notices Dropdown */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowNoticesDropdown(!showNoticesDropdown);
              setShowProfileDropdown(false);
            }} 
            className="bg-transparent border-none w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-secondary)] cursor-pointer relative transition-all duration-200 hover:bg-black/5 hover:text-[var(--text-primary)]"
            title="Notice Board Announcements"
          >
            <Bell size={20} />
            {urgentNoticesCount > 0 && (
              <span className="absolute top-[3px] right-[3px] bg-[var(--danger)] text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center border-2 border-[var(--bg-secondary)]">{urgentNoticesCount}</span>
            )}
          </button>

          {showNoticesDropdown && (
            <div className="absolute right-0 top-12 w-[340px] max-h-[400px] rounded-[var(--border-radius-md)] flex flex-col shadow-2xl overflow-hidden border border-[var(--glass-border)] glass-card">
              <div className="flex items-center gap-2 p-4 border-b border-[var(--border-color)] bg-white/2">
                <Megaphone size={18} className="text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notice Board</h3>
              </div>
              <div className="overflow-y-auto flex-grow p-2">
                {notices.length === 0 ? (
                  <p className="py-8 px-4 text-center text-[var(--text-tertiary)] text-sm">No recent notices pinned.</p>
                ) : (
                  notices.map((notice) => (
                    <div key={notice.id} className="p-3 rounded-[var(--border-radius-sm)] border-b border-[var(--border-color)] flex flex-col gap-1.5 transition-all duration-200 hover:bg-black/2 last:border-b-0">
                      <div className="flex justify-between items-center">
                        <span 
                          className="badge" 
                          style={{
                            fontSize: '0.65rem',
                            padding: '0.15rem 0.5rem',
                            ...notice.priority === 'URGENT' ? { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' } : 
                               notice.priority === 'WARNING' ? { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' } : 
                               { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }
                          }}
                        >
                          {notice.priority}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          {new Date(notice.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-[var(--text-primary)]">{notice.title}</h4>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{notice.content}</p>
                      <span className="text-[10px] text-[var(--accent)] self-end font-medium">By {notice.postedBy}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <div 
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowNoticesDropdown(false);
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <ChevronDown size={16} className="text-[var(--text-secondary)]" />
          </div>

          {showProfileDropdown && (
            <div className="absolute right-0 top-10 w-[200px] rounded-[var(--border-radius-sm)] shadow-2xl p-2 border border-[var(--glass-border)] glass-card">
              <div className="p-3">
                <p className="text-xs text-[var(--text-primary)] font-semibold truncate">{user.email}</p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Role: {user.role}</p>
              </div>
              <div className="h-[1px] bg-[var(--border-color)] my-1"></div>
              <button 
                onClick={logout} 
                className="flex items-center gap-3 w-full p-2.5 bg-transparent border-none rounded-[var(--border-radius-sm)] cursor-pointer text-sm text-left transition-all duration-200 hover:bg-[var(--danger-bg)] text-[var(--danger)]"
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
