import { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import authApi from '../utils/api/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize and check for stored session tokens on app mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Fetch current user details with stored token
        const userData = await authApi.getMe();
        setUser(userData);
        
        // Silently refresh token in background to extend session
        try {
          const refreshData = await authApi.refresh();
          await SecureStore.setItemAsync('token', refreshData.token);
          console.log('[AuthContext] Token refreshed on app init');
        } catch (refreshErr) {
          console.log('[AuthContext] Token refresh failed on init:', refreshErr.message);
          // Continue with existing token if refresh fails
        }
      } catch (err) {
        console.log('[AuthContext] Session initialization error:', err.message);
        // Clear corrupt/expired token
        await SecureStore.deleteItemAsync('token').catch(() => {});
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login action handler
  const login = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      await SecureStore.setItemAsync('token', data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const errMsg = err.data?.message || err.message || 'Login failed. Please check credentials.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Logout action handler
  const logout = async () => {
    try {
      // Call backend logout endpoint for audit trail
      await authApi.logout().catch((err) => {
        console.warn('[AuthContext] Backend logout call failed:', err.message);
        // Continue with client-side logout even if backend fails
      });
      
      await SecureStore.deleteItemAsync('token');
      setUser(null);
    } catch (err) {
      console.warn('[AuthContext] Failed to clear token during logout:', err.message);
    }
  };

  // Refresh token to extend session
  const refreshToken = async () => {
    try {
      const refreshData = await authApi.refresh();
      await SecureStore.setItemAsync('token', refreshData.token);
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
