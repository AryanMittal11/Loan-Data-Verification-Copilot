import type { ReactNode } from 'react';
import { useApp } from '@/appContext';
import { cn } from '@/utils/cn';

const roleLabel = {
  operator: 'Data Operator',
  reviewer: 'Reviewer',
  consumer: 'Data Consumer',
} as const;

export function TopBar({ breadcrumb }: { breadcrumb: ReactNode }) {
  const { role, actor } = useApp();
  return (
    <header className="sticky top-0 z-20 bg-parchment/95 backdrop-blur border-b border-warmink/15">
      <div className="flex items-center justify-between px-6 lg:px-10 h-12">
        <div className="flex items-center gap-2 text-xs text-warmink-mute">
          {breadcrumb}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-warmink-mute hidden sm:inline">
            Signed in as
          </span>
          <span className="text-xs font-medium text-warmink">{actor}</span>
          <span
            className={cn(
              'text-2xs uppercase tracking-wider px-2 py-0.5 border',
              role === 'operator' && 'border-pending text-pending-dark',
              role === 'reviewer' && 'border-verified text-verified',
              role === 'consumer' && 'border-ink/30 text-ink',
            )}
          >
            {role ? roleLabel[role] : ''}
          </span>
        </div>
      </div>
    </header>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 px-6 lg:px-10 pt-8 pb-6 border-b border-warmink/12">
      <div>
        <h1 className="font-slab text-2xl font-semibold text-warmink leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-warmink-mute max-w-ledger">
            {subtitle}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
