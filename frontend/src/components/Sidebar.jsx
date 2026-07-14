import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Home, 
  FileCheck, 
  Wrench, 
  UserCheck, 
  Receipt, 
  Sparkles,
  Contact,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  PlusCircle,
  AlertCircle
} from 'lucide-react';

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleQuickAction = (path) => {
    navigate(path, { state: { action: 'add' } });
    if (isMobileOpen) onClose();
  };

  if (!user) return null;

  const getNavLinks = () => {
    switch (user.role) {
      case 'ADMIN':
        return [
          { path: '/admin/dashboard', name: 'Dashboard', icon: <LayoutDashboard size={18} /> },
          { path: '/admin/students', name: 'Students Directory', icon: <Users size={18} /> },
          { path: '/admin/rooms', name: 'Rooms & Assets', icon: <Home size={18} /> },
          { path: '/admin/leaves', name: 'Leave Approvals', icon: <FileCheck size={18} /> },
          { path: '/admin/mess', name: 'Mess Menu', icon: <Sparkles size={18} /> },
          { path: '/admin/fees', name: 'Fees & Invoices', icon: <Receipt size={18} /> },
          { path: '/admin/complaints', name: 'Complaints Logs', icon: <Wrench size={18} /> },
          { path: '/admin/visitors', name: 'Visitor Log', icon: <UserCheck size={18} /> },
          { path: '/admin/staff', name: 'Staff Roster', icon: <Contact size={18} /> },
        ];
      case 'STUDENT':
        return [
          { path: '/student/dashboard', name: 'Dashboard', icon: <LayoutDashboard size={18} /> },
          { path: '/student/leaves', name: 'Apply Leave', icon: <FileCheck size={18} /> },
          { path: '/student/mess', name: 'Mess Rating', icon: <Sparkles size={18} /> },
          { path: '/student/fees', name: 'My Invoices', icon: <Receipt size={18} /> },
          { path: '/student/complaints', name: 'My Complaints', icon: <Wrench size={18} /> },
        ];
      case 'STAFF':
        return [
          { path: '/staff/visitors', name: 'Visitor Registry', icon: <UserCheck size={18} /> },
          { path: '/staff/gatepass', name: 'Gate Operations', icon: <FileCheck size={18} /> },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sidebar Header Logo */}
      <div className="flex items-center justify-between mb-8 min-h-[40px] px-2 pt-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 min-w-[40px] rounded-[14px] bg-[var(--primary)] flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.3)] flex-shrink-0">
            <Home size={20} className="text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col transition-all duration-300 overflow-hidden">
              <h2 className="text-[1.05rem] text-[var(--text-primary)] font-bold leading-none whitespace-nowrap">GHMS Portal</h2>
              <span className="text-[0.65rem] text-[var(--text-secondary)] mt-1 whitespace-nowrap">Girls Hostel</span>
            </div>
          )}
        </div>
        
      </div>

      {/* Navigation List */}
      <nav className="flex flex-col gap-1.5 flex-grow overflow-y-auto px-2 custom-scrollbar">
        {navLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            onClick={isMobileOpen ? onClose : undefined}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3.5 py-3 rounded-[16px] font-medium text-[14px] transition-all duration-200 cursor-pointer group relative ${
                isCollapsed ? 'justify-center px-0 mx-auto w-[48px]' : ''
              } ${
                isActive 
                  ? 'bg-gradient-to-r from-[#2563eb] to-[#4f46e5] text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] border border-white/10' 
                  : 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900 border border-transparent'
              }`
            }
            title={isCollapsed ? link.name : ''}
          >
            {({ isActive }) => (
              <>
                <div className={`flex items-center justify-center w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-[var(--primary)]'}`}>
                  {link.icon}
                </div>
                {!isCollapsed && (
                  <span className="truncate transition-all duration-200">{link.name}</span>
                )}
              </>
            )}
          </NavLink>
        ))}

      {/* Profile Card Summary */}
      </nav>

      <div className="mt-auto pt-4 px-2">
        <div className={`flex items-center gap-3 p-3 rounded-[18px] bg-white border border-slate-200 shadow-sm mb-4 overflow-hidden ${isCollapsed ? 'justify-center p-2 mx-auto w-12 h-12' : ''}`}>
          <img src={`https://ui-avatars.com/api/?name=${user.name}&background=10b981&color=fff`} alt="Profile" className="w-10 h-10 min-w-[40px] rounded-full object-cover flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden transition-all duration-300 w-full">
              <div className="flex justify-between items-center w-full">
                <p className="text-[13px] font-bold text-[var(--text-primary)] truncate">{user.name}</p>
                <ChevronDown size={14} className="text-slate-400" />
              </div>
              <span className="text-[11px] text-slate-500 font-medium truncate">
                {user.role === 'ADMIN' ? 'Chief Warden' : user.role === 'STAFF' ? 'Staff' : 'Student'}
              </span>
            </div>
          )}
        </div>

        {/* Quick Actions (only visible on desktop when expanded) */}
        {!isCollapsed && user.role === 'ADMIN' && (
          <div className="mb-6 px-1 animate-fade-in">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 block">Quick Actions</span>
            <div className="flex flex-col gap-2">
              <button onClick={() => handleQuickAction('/admin/students')} className="flex items-center gap-3 text-[13px] font-medium text-slate-600 hover:text-[var(--primary)] py-1.5 cursor-pointer bg-transparent border-none w-full text-left transition-colors">
                <PlusCircle size={16} className="text-slate-400" />
                Add New Student
              </button>
              <button onClick={() => handleQuickAction('/admin/rooms')} className="flex items-center gap-3 text-[13px] font-medium text-slate-600 hover:text-[var(--primary)] py-1.5 cursor-pointer bg-transparent border-none w-full text-left transition-colors">
                <Home size={16} className="text-slate-400" />
                Add Room / Asset
              </button>
              <button onClick={() => handleQuickAction('/admin/visitors')} className="flex items-center gap-3 text-[13px] font-medium text-slate-600 hover:text-[var(--primary)] py-1.5 cursor-pointer bg-transparent border-none w-full text-left transition-colors">
                <UserCheck size={16} className="text-slate-400" />
                Register Visitor
              </button>
              <button onClick={() => { navigate('/admin/complaints'); if (isMobileOpen) onClose(); }} className="flex items-center gap-3 text-[13px] font-medium text-slate-600 hover:text-rose-600 py-1.5 cursor-pointer bg-transparent border-none w-full text-left transition-colors">
                <AlertCircle size={16} className="text-slate-400" />
                Raise Complaint
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar - fixed, always visible on lg+ */}
      <aside 
        className="h-screen fixed left-0 top-0 z-40 lg:flex flex-col p-4 transition-all duration-300 ease-in-out hidden"
        style={{ width: isCollapsed ? '100px' : '280px' }}
      >
        <div className="glass-panel w-full h-full rounded-[24px] shadow-[0_10px_35px_rgba(15,23,42,0.04)] py-4 flex flex-col">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 lg:hidden flex"
            onClick={onClose}
          >
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-[280px] h-screen bg-white/90 backdrop-blur-xl p-4 flex flex-col shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border-none flex items-center justify-center cursor-pointer text-slate-500"
              >
                <X size={16} />
              </button>
              <div className="h-full pt-4">
                {sidebarContent}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
