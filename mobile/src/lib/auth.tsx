import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api';
import { setUnauthorizedHandler } from '../api/client';
import { storage, KEYS } from './storage';
import { queryClient } from './query';

export type Role = 'STUDENT' | 'ADMIN' | 'STAFF';
export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  assignedFloor?: number | null;
  companyName?: string;
  studentDetails?: { id: string; rollNumber: string; phoneNumber?: string; status?: string; room?: { id: string; roomNumber: string } | null } | null;
  staffDetails?: { id: string; department: string; designation: string } | null;
};

type AuthState = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const clear = useCallback(async () => {
    await storage.remove(KEYS.token);
    await storage.remove(KEYS.user);
    queryClient.clear();
    setUser(null);
  }, []);

  // Restore the saved session, refreshing the token so it stays valid
  useEffect(() => {
    setUnauthorizedHandler(() => { clear(); });
    (async () => {
      try {
        const token = await storage.get(KEYS.token);
        if (!token) return;
        const saved = await storage.get(KEYS.user);
        if (saved) setUser(JSON.parse(saved));
        try {
          const fresh = await authApi.refresh();
          if (fresh?.token) await storage.set(KEYS.token, fresh.token);
          if (fresh?.user) {
            setUser(fresh.user);
            await storage.set(KEYS.user, JSON.stringify(fresh.user));
          }
        } catch (err: any) {
          if (err?.status === 401) await clear();
          // Offline: keep the saved session
        }
      } finally {
        setReady(true);
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email.trim().toLowerCase(), password);
    await storage.set(KEYS.token, res.token);
    await storage.set(KEYS.user, JSON.stringify(res.user));
    queryClient.clear();
    setUser(res.user);
    return res.user as User;
  }, []);

  const logout = useCallback(async () => {
    authApi.logout().catch(() => {});
    await clear();
  }, [clear]);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
};
