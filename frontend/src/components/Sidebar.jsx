import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getNavLinks = () => {
    switch (user.role) {
      case 'ADMIN':
        return [
          { path: '/admin/dashboard', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
          { path: '/admin/students', name: 'Students Directory', icon: <Users size={20} /> },
          { path: '/admin/rooms', name: 'Rooms & Assets', icon: <Home size={20} /> },
          { path: '/admin/leaves', name: 'Leave Approvals', icon: <FileCheck size={20} /> },
          { path: '/admin/mess', name: 'Mess Menu', icon: <Sparkles size={20} /> },
          { path: '/admin/fees', name: 'Fees & Invoices', icon: <Receipt size={20} /> },
          { path: '/admin/complaints', name: 'Complaints Logs', icon: <Wrench size={20} /> },
          { path: '/admin/visitors', name: 'Visitor Log', icon: <UserCheck size={20} /> },
          { path: '/admin/staff', name: 'Staff Roster', icon: <Contact size={20} /> },
        ];
      case 'STUDENT':
        return [
          { path: '/student/dashboard', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
          { path: '/student/leaves', name: 'Apply Leave', icon: <FileCheck size={20} /> },
          { path: '/student/mess', name: 'Mess Rating', icon: <Sparkles size={20} /> },
          { path: '/student/fees', name: 'My Invoices', icon: <Receipt size={20} /> },
          { path: '/student/complaints', name: 'My Complaints', icon: <Wrench size={20} /> },
        ];
      case 'STAFF':
        return [
          { path: '/staff/visitors', name: 'Visitor Registry', icon: <UserCheck size={20} /> },
          { path: '/staff/gatepass', name: 'Gate Operations', icon: <FileCheck size={20} /> },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <aside className="w-[var(--sidebar-width)] h-screen fixed left-0 top-0 z-10 rounded-none border-r border-[var(--border-color)] hidden lg:flex flex-col p-6 glass-card">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--accent-gradient)] flex items-center justify-center shadow-lg">
            <Sparkles size={22} className="text-white" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-[1.15rem] text-[var(--text-primary)] font-bold leading-none">GHMS Portal</h2>
            <span className="text-[0.7rem] text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">Girls Hostel</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-[var(--border-radius-sm)] bg-black/2 border border-black/5 mb-8">
        <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-lg border border-white/10">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col overflow-hidden">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user.name}</p>
          <span className="text-xs text-[var(--accent)] font-medium">
            {user.role === 'ADMIN' ? 'Chief Warden' : user.role === 'STAFF' ? 'Staff' : 'Student'}
          </span>
        </div>
      </div>

      <nav className="flex flex-col gap-1.5 flex-grow overflow-y-auto">
        {navLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-[var(--border-radius-sm)] text-[var(--text-secondary)] font-medium text-sm transition-all duration-200 cursor-pointer hover:bg-black/2 hover:text-[var(--text-primary)] ${
                isActive ? 'bg-[var(--accent-light)] text-[var(--accent)] font-semibold border-l-3 border-[var(--accent)] pl-[13px]' : ''
              }`
            }
          >
            {link.icon}
            <span>{link.name}</span>
          </NavLink>
        ))}
      </nav>

      <button 
        onClick={logout} 
        className="flex items-center gap-3 px-4 py-3 rounded-[var(--border-radius-sm)] bg-transparent border-none text-[var(--danger)] font-medium text-sm cursor-pointer w-full text-left mt-auto transition-all duration-200 hover:bg-[var(--danger-bg)]"
      >
        <LogOut size={20} />
        <span>Logout</span>
      </button>
    </aside>
  );
};

export default Sidebar;
