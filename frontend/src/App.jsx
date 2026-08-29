import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { motion, AnimatePresence } from 'framer-motion';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Rooms from './pages/Rooms';
import Leaves from './pages/Leaves';
import Mess from './pages/Mess';
import Fees from './pages/Fees';
import Complaints from './pages/Complaints';
import Visitors from './pages/Visitors';
import Staff from './pages/Staff';
import Approvals from './pages/Approvals';
import FloorDirectory from './pages/FloorDirectory';
import ModulesView from './pages/ModulesView';

import { useState, useEffect } from 'react';

import { Home as HomeIcon, FileText, Sparkles, Wrench, User, LogOut, LayoutGrid, CalendarDays } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

// Dashboard Layout Wrapper
const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  if (!user) return <Navigate to="/login" replace />;

  const getNavTabs = () => {
    if (user.role === 'ADMIN') {
      return [
        { label: 'Home', path: '/admin/dashboard', icon: <HomeIcon size={20} /> },
        { label: 'Rooms', path: '/admin/rooms', icon: <LayoutGrid size={20} /> },
        { label: 'Leaves', path: '/admin/leaves', icon: <CalendarDays size={20} /> },
        { label: 'Issues', path: '/admin/complaints', icon: <Wrench size={20} /> },
      ];
    } else if (user.role === 'STUDENT') {
      return [
        { label: 'Home', path: '/student/dashboard', icon: <HomeIcon size={20} /> },
        { label: 'Apply Leave', path: '/student/leaves', icon: <CalendarDays size={20} /> },
        { label: 'Mess', path: '/student/mess', icon: <Sparkles size={20} /> },
        { label: 'Complaints', path: '/student/complaints', icon: <Wrench size={20} /> },
      ];
    } else {
      return [
        { label: 'Visitors', path: '/staff/visitors', icon: <User size={20} /> },
        { label: 'Gatepass', path: '/staff/gatepass', icon: <CalendarDays size={20} /> },
      ];
    }
  };

  const tabs = getNavTabs();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  // Keep desktop tracking reactive to window resize
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Must match the width values in Sidebar.jsx
  const SIDEBAR_EXPANDED = '280px';
  const SIDEBAR_COLLAPSED = '100px';
  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <div className="app-container">
      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        isMobileOpen={isMobileOpen} 
        onClose={() => setIsMobileOpen(false)} 
      />

      <div 
        className={`main-content transition-all duration-300 ease-in-out ${isDesktop ? 'pl-8 pr-8' : 'pl-4 pr-4 pb-[112px]'} pt-[calc(var(--header-height)+32px)] lg:pt-[calc(var(--header-height)+32px)]`}
        style={{ 
          marginLeft: isDesktop ? sidebarWidth : '0px',
        }}
      >
        <Header 
          isCollapsed={isCollapsed}
          onMenuToggle={() => setIsMobileOpen(true)} 
        />
        <AnimatePresence mode="wait">
          <motion.main 
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Sticky Floating Bottom Navigation Bar for Mobile */}
      <div className="fixed bottom-4 left-4 right-4 h-[64px] bg-white/90 backdrop-blur-md border border-[var(--border-color)] flex items-center justify-around z-40 lg:hidden shadow-lg rounded-2xl">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer w-16 h-full transition-all ${
                isActive ? 'text-[var(--secondary)] font-semibold scale-105' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.icon}
              <span className="text-[10px]">{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setShowProfileModal(true)}
          className="flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer w-16 h-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <User size={20} />
          <span className="text-[10px]">Account</span>
        </button>
      </div>

      {/* Profile/Account Modal */}
      {showProfileModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[99999] p-4"
          onClick={() => setShowProfileModal(false)}
        >
          <div 
            className="glass-card w-full max-w-[360px] p-6 flex flex-col items-center gap-4 text-center animate-fade-in rounded-[24px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Avatar with indigo gradient — matches primary brand color */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#2563eb] text-white flex items-center justify-center font-bold text-3xl shadow-[0_8px_24px_rgba(79,70,229,0.35)]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <h3 className="text-lg font-bold text-[var(--text-primary)] leading-tight">{user.name}</h3>
              <p className="text-xs text-[var(--text-tertiary)] font-medium">{user.email}</p>
              {/* Role badge — indigo to match brand, not green */}
              <span className="inline-flex items-center mt-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
                {user.role === 'ADMIN' ? 'Chief Warden' : user.role === 'STAFF' ? 'Staff' : 'Student'}
              </span>
            </div>
            <div className="w-full h-px bg-[var(--border-color)]"></div>
            <button
              onClick={() => {
                setShowProfileModal(false);
                logout();
                navigate('/login');
              }}
              className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 text-red-600 border border-red-100 rounded-[14px] font-semibold cursor-pointer transition-colors hover:bg-red-100"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
            <button
              onClick={() => setShowProfileModal(false)}
              className="w-full py-2.5 bg-transparent text-[var(--text-secondary)] border border-[var(--border-color)] rounded-[14px] font-medium cursor-pointer hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Root Redirection Helper based on User Role
const HomeRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (user.role === 'STUDENT') {
    return <Navigate to="/student/dashboard" replace />;
  } else {
    return <Navigate to="/staff/visitors" replace />;
  }
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Secure Role Protected Routes */}
          <Route element={<DashboardLayout />}>
            {/* Admin (Warden) Routes */}
            <Route 
              path="/admin/dashboard" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><Dashboard /></PrivateRoute>} 
            />
            <Route 
              path="/admin/floors" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><FloorDirectory /></PrivateRoute>} 
            />
            <Route 
              path="/admin/approvals" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><Approvals /></PrivateRoute>} 
            />
            <Route 
              path="/admin/students" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><Students /></PrivateRoute>} 
            />
            <Route 
              path="/admin/rooms" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><Rooms /></PrivateRoute>} 
            />
            <Route 
              path="/admin/leaves" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><Leaves /></PrivateRoute>} 
            />
            <Route 
              path="/admin/mess" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><Mess /></PrivateRoute>} 
            />
            <Route 
              path="/admin/fees" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><Fees /></PrivateRoute>} 
            />
            <Route 
              path="/admin/complaints" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><Complaints /></PrivateRoute>} 
            />
            <Route 
              path="/admin/visitors" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><Visitors /></PrivateRoute>} 
            />
            <Route 
              path="/admin/reports" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><ModulesView defaultTab="reports" /></PrivateRoute>} 
            />
            <Route 
              path="/admin/demand-notes" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><ModulesView defaultTab="demand-notes" /></PrivateRoute>} 
            />
            <Route 
              path="/admin/cook-dashboard" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><ModulesView defaultTab="cook-dashboard" /></PrivateRoute>} 
            />
            <Route 
              path="/admin/suggestions" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><ModulesView defaultTab="suggestions" /></PrivateRoute>} 
            />
            <Route 
              path="/admin/night-attendance" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><ModulesView defaultTab="night-attendance" /></PrivateRoute>} 
            />
            <Route 
              path="/admin/staff" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><Staff /></PrivateRoute>} 
            />

            {/* Student Routes */}
            <Route 
              path="/student/dashboard" 
              element={<PrivateRoute allowedRoles={['STUDENT']}><Dashboard /></PrivateRoute>} 
            />
            <Route 
              path="/student/leaves" 
              element={<PrivateRoute allowedRoles={['STUDENT']}><Leaves /></PrivateRoute>} 
            />
            <Route 
              path="/student/mess" 
              element={<PrivateRoute allowedRoles={['STUDENT']}><Mess /></PrivateRoute>} 
            />
            <Route 
              path="/student/fees" 
              element={<PrivateRoute allowedRoles={['STUDENT']}><Fees /></PrivateRoute>} 
            />
            <Route 
              path="/student/complaints" 
              element={<PrivateRoute allowedRoles={['STUDENT']}><Complaints /></PrivateRoute>} 
            />
            <Route 
              path="/student/suggestions" 
              element={<PrivateRoute allowedRoles={['STUDENT']}><ModulesView defaultTab="suggestions" /></PrivateRoute>} 
            />

            {/* Security Staff Routes */}
            <Route 
              path="/staff/visitors" 
              element={<PrivateRoute allowedRoles={['STAFF']}><Visitors /></PrivateRoute>} 
            />
            <Route 
              path="/staff/gatepass" 
              element={<PrivateRoute allowedRoles={['STAFF', 'ADMIN']}><Leaves /></PrivateRoute>} 
            />
          </Route>

          {/* Root & Catch-All Redirects */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

const styles = {
  loaderContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
  }
};

export default App;
