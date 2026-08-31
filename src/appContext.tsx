import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Role } from '@/types';

interface AppState {
  role: Role | null;
  actor: string;
  setRole: (r: Role) => void;
  switchRole: (r: Role) => void;
  signOut: () => void;
}

const Ctx = createContext<AppState | null>(null);

const actorFor: Record<Role, string> = {
  operator: 'Data Operator',
  reviewer: 'Reviewer A',
  consumer: 'Data Consumer',
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null);

  const setRole = useCallback((r: Role) => setRoleState(r), []);
  const switchRole = useCallback((r: Role) => setRoleState(r), []);
  const signOut = useCallback(() => setRoleState(null), []);

  return (
    <Ctx.Provider
      value={{
        role,
        actor: role ? actorFor[role] : 'Anonymous',
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
