import { createContext, useState, useEffect, useContext } from 'react';
import { auth as authApi } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if token exists on mount and fetch current user profile
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await authApi.getMe();
        setUser(userData);
        
        // Silently refresh token in background to extend session
        try {
          const refreshData = await authApi.refresh();
          localStorage.setItem('token', refreshData.token);
          console.log('[AuthContext] Token refreshed on app init');
        } catch (refreshErr) {
          console.log('[AuthContext] Token refresh failed on init:', refreshErr.message);
          // Continue with existing token if refresh fails
        }
      } catch (err) {
        console.error('Failed to authenticate token:', err.message);
        localStorage.removeItem('token');
        setUser(null);
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
      // Call backend logout endpoint for audit trail
      await authApi.logout().catch((err) => {
        console.warn('[AuthContext] Backend logout call failed:', err.message);
        // Continue with client-side logout even if backend fails
      });
    } catch (err) {
      console.warn('[AuthContext] Logout error:', err.message);
    } finally {
      localStorage.removeItem('token');
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
