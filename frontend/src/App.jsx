import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Rooms from './pages/Rooms';
import Leaves from './pages/Leaves';
import Mess from './pages/Mess';
import Fees from './pages/Fees';
import Complaints from './pages/Complaints';
import Visitors from './pages/Visitors';
import Staff from './pages/Staff';

import { useState } from 'react';

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

  return (
    <div className="app-container pb-[65px] lg:pb-0">
      <Sidebar isOpen={false} onClose={() => {}} />

      <div className="main-content">
        <Header onMenuToggle={() => {}} />
        <main className="min-h-[calc(100vh-var(--header-height)-4rem)]">
          <Outlet />
        </main>
      </div>

      {/* Sticky Bottom Navigation Bar for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 h-[65px] bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex items-center justify-around z-40 lg:hidden shadow-lg">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer w-16 h-full transition-all ${
                isActive ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-secondary)]'
              }`}
            >
              {tab.icon}
              <span className="text-[10px]">{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setShowProfileModal(true)}
          className="flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer w-16 h-full text-[var(--text-secondary)]"
        >
          <User size={20} />
          <span className="text-[10px]">Account</span>
        </button>
      </div>

      {/* Profile/Account Modal */}
      {showProfileModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[99999]"
          onClick={() => setShowProfileModal(false)}
        >
          <div 
            className="glass-card w-[90%] max-w-[340px] p-6 flex flex-col items-center gap-4 text-center animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-3xl shadow-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{user.name}</h3>
              <p className="text-xs text-[var(--text-tertiary)]">{user.email}</p>
              <span className="inline-block mt-2 bg-[var(--accent-light)] text-[var(--accent)] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                {user.role === 'ADMIN' ? 'Chief Warden' : user.role === 'STAFF' ? 'Staff' : 'Student'}
              </span>
            </div>
            <div className="w-full h-[1px] bg-[var(--border-color)] my-1"></div>
            <button
              onClick={() => {
                setShowProfileModal(false);
                logout();
              }}
              className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--danger-bg)] text-[var(--danger)] border-none rounded-lg font-semibold cursor-pointer transition-colors"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
            <button
              onClick={() => setShowProfileModal(false)}
              className="w-full py-2 bg-transparent text-[var(--text-secondary)] border border-[var(--border-color)] rounded-lg font-medium cursor-pointer"
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

          {/* Secure Role Protected Routes */}
          <Route element={<DashboardLayout />}>
            {/* Admin (Warden) Routes */}
            <Route 
              path="/admin/dashboard" 
              element={<PrivateRoute allowedRoles={['ADMIN']}><Dashboard /></PrivateRoute>} 
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
