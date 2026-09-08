import { createContext, useState, useEffect, useContext } from 'react';
import { auth as authApi } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if token exists on mount and fetch current user profile
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        localStorage.removeItem('user');
        setLoading(false);
        return;
      }

      try {
        const userData = await authApi.getMe();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Silently refresh token in background to extend session
        try {
          const refreshData = await authApi.refresh();
          if (refreshData?.token) {
            localStorage.setItem('token', refreshData.token);
          }
        } catch (refreshErr) {
          console.log('[AuthContext] Token refresh failed on init:', refreshErr.message);
        }
      } catch (err) {
        console.error('Failed to authenticate token on init:', err.message);
        const errStr = String(err.message || err.status || '');
        if (errStr.includes('401') || errStr.includes('403') || errStr.includes('Unauthorized') || errStr.includes('invalid')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login handler
  const login = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await authApi.logout().catch((err) => {
        console.warn('[AuthContext] Backend logout call failed:', err.message);
      });
    } catch (err) {
      console.warn('[AuthContext] Logout error:', err.message);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  // Refresh token to extend session
  const refreshToken = async () => {
    try {
      const refreshData = await authApi.refresh();
      localStorage.setItem('token', refreshData.token);
      setUser(refreshData.user);
      console.log('[AuthContext] Token refreshed successfully');
      return refreshData;
    } catch (err) {
      console.warn('[AuthContext] Token refresh failed:', err.message);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, refreshToken, setError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
