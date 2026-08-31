import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Role, User, AuthCredentials, RegisterData } from '@/types';
import { api } from '@/services/api';

interface AppState {
  user: User | null;
  role: Role | null;
  actor: string;
  login: (creds: AuthCredentials) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  setRole: (r: Role) => void;
  switchRole: (r: Role) => void;
  signOut: () => void;
}

const Ctx = createContext<AppState | null>(null);

const STORAGE_KEY = 'loan_verify_user_session';

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as User) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [user]);

  const login = useCallback(async (creds: AuthCredentials): Promise<User> => {
    const loggedIn = await api.login(creds.email, creds.password, creds.role);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<User> => {
    const registered = await api.register(data);
    setUser(registered);
    return registered;
  }, []);

  const setRole = useCallback((r: Role) => {
    setUser((prev) =>
      prev
        ? { ...prev, role: r }
        : {
            id: `USR-${Date.now().toString().slice(-4)}`,
            name: r === 'operator' ? 'Data Operator' : r === 'reviewer' ? 'Reviewer A' : 'Data Consumer',
            email: `${r}@intain.com`,
            role: r,
          },
    );
  }, []);

  const switchRole = useCallback((r: Role) => {
    setRole(r);
  }, [setRole]);

  const signOut = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        role: user?.role ?? null,
        actor: user?.name ?? (user?.role ? `${user.role.toUpperCase()} User` : 'Anonymous'),
        login,
        register,
        setRole,
        switchRole,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}

