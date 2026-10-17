import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import SectionTabs from './components/SectionTabs';
import { ToastProvider } from './components/ui/Toast';

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
import Reports from './pages/Reports';
import StudentProfile from './pages/StudentProfile';
import ReportsOverview from './pages/reports/ReportsOverview';
import OccupancyReport from './pages/reports/OccupancyReport';
import GateReport from './pages/reports/GateReport';
import HelpdeskReport from './pages/reports/HelpdeskReport';
import MessReport from './pages/reports/MessReport';
import DemandNotes from './pages/DemandNotes';
import TallyAccounting from './pages/TallyAccounting';
import ActivityLog from './pages/ActivityLog';
import Inventory from './pages/Inventory';
import NightRollCall from './pages/NightRollCall';
import CookDashboard from './pages/CookDashboard';
import Suggestions from './pages/Suggestions';

import { useState, useEffect } from 'react';

import { User, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getMobileNavItems, getInitials, isItemActive, itemPath, ROLE_LABELS } from './config/navigation';
import { SIDEBAR_COLLAPSED, SIDEBAR_EXPANDED } from './components/Sidebar';

const readCollapsed = () => {
  try {
    return localStorage.getItem('hms_sidebar_collapsed') === '1';
  } catch (e) {
    return false;
  }
};

// Dashboard Layout Wrapper
const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  // Keep desktop tracking reactive to window resize
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('hms_sidebar_collapsed', isCollapsed ? '1' : '0');
    } catch (e) {}
  }, [isCollapsed]);

  if (!user) return <Navigate to="/login" replace />;

  const tabs = getMobileNavItems(user.role);
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
        className={`main-content transition-[margin] duration-300 ease-in-out ${isDesktop ? 'px-8 pb-10' : 'px-4 pb-[104px]'} pt-[calc(var(--header-height)+24px)] lg:pt-[calc(var(--header-height)+32px)]`}
        style={{
          marginLeft: isDesktop ? sidebarWidth : 0,
        }}
      >
        <Header 
          isCollapsed={isCollapsed}
          onMenuToggle={() => setIsMobileOpen(true)} 
        />
        <SectionTabs />
        <main className="w-full min-h-[calc(100vh-var(--header-height)-80px)]">
          <Outlet />
        </main>
      </div>

      {/* Bottom navigation bar for mobile */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-[72px] pb-[env(safe-area-inset-bottom)] bg-white border-t border-[var(--border-color)] flex items-stretch justify-around z-40 lg:hidden"
        aria-label="Quick navigation"
      >
        {tabs.map((item) => {
          const { mobile: label, icon: Icon } = item;
          const isActive = isItemActive(item, location.pathname);
          return (
            <button
              key={item.name}
              onClick={() => navigate(itemPath(item))}
              className={`flex-1 flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer transition-colors ${
                isActive ? 'text-sun-900' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className="relative w-12 h-7 rounded-full flex items-center justify-center">
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 rounded-full bg-sun-300"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon size={20} className="relative" />
              </span>
              <span className={`text-[11px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setShowProfileModal(true)}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        >
          <span className="w-12 h-7 rounded-full flex items-center justify-center">
            <User size={20} />
          </span>
          <span className="text-[11px] font-medium">Account</span>
        </button>
      </nav>

      {/* Profile/Account Modal */}
      {showProfileModal && (
        <div
          className="fixed inset-0 bg-[#1b2a29]/40 flex items-end sm:items-center justify-center z-[99999] p-4"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="glass-card w-full max-w-[360px] p-6 flex flex-col items-center gap-4 text-center animate-fade-in rounded-[var(--border-radius-modal)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-20 h-20 rounded-full bg-sun-300 text-sun-900 flex items-center justify-center font-bold text-2xl">
              {getInitials(user.name)}
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <h3 className="text-lg font-bold leading-tight">{user.name}</h3>
              <p className="text-xs text-[var(--text-tertiary)] font-medium">{user.email}</p>
              <span className="inline-flex items-center mt-1 bg-mint-100 text-brand-700 px-3 py-1 rounded-full text-[12px] font-semibold">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <div className="w-full h-px bg-[var(--border-color)]"></div>
            {user.role === 'STUDENT' && (
              <button
                onClick={() => { setShowProfileModal(false); navigate('/student/profile'); }}
                className="btn-secondary w-full"
              >
                <User size={17} /> My profile
              </button>
            )}
            <button
              onClick={() => {
                setShowProfileModal(false);
                logout();
                navigate('/login');
              }}
              className="flex items-center justify-center gap-2 w-full h-11 bg-[var(--danger-bg)] text-[var(--danger)] border-none rounded-[var(--border-radius-btn)] font-semibold cursor-pointer transition-colors hover:brightness-95"
            >
              <LogOut size={18} />
              <span>Sign out</span>
            </button>
            <button
              onClick={() => setShowProfileModal(false)}
              className="btn-secondary w-full"
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
    <MotionConfig reducedMotion="user">
    <ToastProvider>
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
              path="/admin/tally" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><TallyAccounting /></PrivateRoute>} 
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
              element={<PrivateRoute allowedRoles={['ADMIN']}><Reports /></PrivateRoute>} 
            />
            <Route path="/admin/reports/overview" element={<PrivateRoute allowedRoles={['ADMIN']}><ReportsOverview /></PrivateRoute>} />
            <Route path="/admin/reports/occupancy" element={<PrivateRoute allowedRoles={['ADMIN']}><OccupancyReport /></PrivateRoute>} />
            <Route path="/admin/reports/gate" element={<PrivateRoute allowedRoles={['ADMIN']}><GateReport /></PrivateRoute>} />
            <Route path="/admin/reports/helpdesk" element={<PrivateRoute allowedRoles={['ADMIN']}><HelpdeskReport /></PrivateRoute>} />
            <Route path="/admin/reports/mess" element={<PrivateRoute allowedRoles={['ADMIN']}><MessReport /></PrivateRoute>} />
            <Route 
              path="/admin/demand-notes" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><DemandNotes /></PrivateRoute>} 
            />
            <Route 
              path="/admin/cook-dashboard" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><CookDashboard /></PrivateRoute>} 
            />
            <Route 
              path="/admin/suggestions" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><Suggestions /></PrivateRoute>} 
            />
            <Route 
              path="/admin/night-attendance" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><NightRollCall /></PrivateRoute>} 
            />
            <Route 
              path="/admin/staff" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><Staff /></PrivateRoute>} 
            />
            <Route 
              path="/admin/activity-log" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><ActivityLog /></PrivateRoute>} 
            />
            <Route 
              path="/admin/inventory" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><Inventory /></PrivateRoute>} 
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
            <Route path="/student/profile" element={<PrivateRoute allowedRoles={['STUDENT']}><StudentProfile /></PrivateRoute>} />
            <Route 
              path="/student/complaints" 
              element={<PrivateRoute allowedRoles={['STUDENT']}><Complaints /></PrivateRoute>} 
            />
            <Route 
              path="/student/suggestions" 
              element={<PrivateRoute allowedRoles={['STUDENT']}><Suggestions /></PrivateRoute>} 
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
    </ToastProvider>
    </MotionConfig>
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
