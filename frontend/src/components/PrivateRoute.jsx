import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Verifying session credentials...</p>
      </div>
    );
  }

  // 1. If not authenticated, redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. If role is not allowed, redirect to correct default page
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.role === 'STUDENT') {
      return <Navigate to="/student/dashboard" replace />;
    } else {
      return <Navigate to="/staff/visitors" replace />;
    }
  }

  return children;
};

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0b0f19',
    color: '#f3f4f6',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255, 255, 255, 0.1)',
    borderTop: '4px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem',
  },
  loadingText: {
    fontSize: '0.9rem',
    color: '#9ca3af',
  }
};

// Global keyframe for spinner animation is in index.css, adding fallback
const styleElement = document.createElement('style');
styleElement.innerHTML = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleElement);

export default PrivateRoute;
