import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/appContext';
import type { Role } from '@/types';
import {
  Upload,
  ListChecks,
  ShieldCheck,
  Database,
  LogOut,
  Landmark,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Upload;
}

const navByRole: Record<Role, NavItem[]> = {
  operator: [
    { to: '/operator', label: 'Dashboard', icon: Landmark },
    { to: '/operator/imports', label: 'Import history', icon: Database },
  ],
  reviewer: [
    { to: '/reviewer', label: 'Dashboard', icon: Landmark },
    { to: '/reviewer/queue', label: 'Exception queue', icon: ListChecks },
  ],
  consumer: [
    { to: '/consumer', label: 'Dashboard', icon: Landmark },
    { to: '/consumer/verified', label: 'Verified records', icon: ShieldCheck },
  ],
};

const roleLabel: Record<Role, string> = {
  operator: 'Data Operator',
  reviewer: 'Reviewer',
  consumer: 'Data Consumer',
};

const roleIcon: Record<Role, typeof Upload> = {
  operator: Upload,
  reviewer: ListChecks,
  consumer: ShieldCheck,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, actor, user, signOut } = useApp();
  const loc = useLocation();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!role) return <>{children}</>;
  const items = navByRole[role];

  const initials = actor
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const SidebarContent = (
    <>
      <div className="px-5 pt-5 pb-4 border-b border-paper/10">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-verified-light" strokeWidth={1.75} />
          <span className="font-slab text-base font-semibold tracking-tight">
            Loan Verify
          </span>
        </div>
        <p className="mt-1 text-2xs text-paper/50 uppercase tracking-wider font-mono">
          {roleLabel[role]} Console
        </p>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto thin-scroll">
        <p className="px-5 pt-2 pb-1 text-2xs uppercase tracking-wider text-paper/40">
          Navigation
        </p>
        {items.map((it) => {
          const active =
            loc.pathname === it.to ||
            (it.to !== `/${role}` && loc.pathname.startsWith(it.to));
          return (
            <NavLink
              key={it.to}
              to={it.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-5 py-2.5 text-sm border-l-2 transition-colors',
                active
                  ? 'border-verified-light text-paper bg-paper/10 font-medium'
                  : 'border-transparent text-paper/65 hover:text-paper hover:bg-paper/5',
              )}
            >
              <it.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span>{it.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Authenticated User Profile & Sign Out (Strict RBAC isolation) */}
      <div className="p-4 border-t border-paper/10 bg-paper/5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-none border border-paper/20 bg-paper/10 text-paper flex items-center justify-center font-mono text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-paper truncate">{actor}</p>
            <p className="text-3xs text-paper/50 font-mono truncate">{user?.email || `${role}@intain.com`}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-verified-light" />
              <span className="text-3xs text-verified-light uppercase tracking-wider font-mono">
                {roleLabel[role]}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            signOut();
            nav('/');
          }}
          className="mt-3 w-full flex items-center justify-center gap-1.5 text-2xs text-paper/70 hover:text-paper border border-paper/20 hover:border-paper/40 py-1.5 transition-colors bg-paper/5"
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span>Sign Out / Switch Portal</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-parchment">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 bg-ink text-paper flex-col sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-ink/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-ink text-paper flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 text-paper/60 hover:text-paper"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0">
        {/* Mobile top bar with menu button */}
        <div className="md:hidden sticky top-0 z-30 bg-ink text-paper flex items-center gap-3 px-4 h-12 border-b border-paper/10">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="text-paper/80 hover:text-paper"
          >
            <Menu className="w-5 h-5" strokeWidth={1.75} />
          </button>
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-verified-light" strokeWidth={1.75} />
            <span className="font-slab text-sm font-semibold">Loan Verify</span>
          </div>
          {loc.pathname !== `/${role}` && (
            <button
              onClick={() => nav(`/${role}`)}
              className="ml-auto text-paper/60 hover:text-paper"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
