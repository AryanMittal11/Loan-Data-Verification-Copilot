import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function Card({
  children,
  className,
  surface = 'parchment',
}: {
  children: ReactNode;
  className?: string;
  surface?: 'parchment' | 'parchmentDim' | 'ink';
}) {
  const bg =
    surface === 'ink'
      ? 'bg-ink text-paper'
      : surface === 'parchmentDim'
        ? 'bg-parchment-dim text-warmink'
        : 'bg-parchment-lighter text-warmink';
  return (
    <section className={cn('border border-warmink/15', bg, className)}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
  slab = true,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  slab?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-warmink/12">
      <div>
        <h3
          className={cn(
            'text-base font-semibold leading-tight',
            slab && 'font-slab',
          )}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs text-warmink-mute">{subtitle}</p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function Pill({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'verified' | 'exception' | 'pending' | 'ink';
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: 'border-warmink/25 text-warmink-soft bg-warmink/5',
    verified: 'border-verified text-verified bg-verified/5',
    exception: 'border-exception text-exception bg-exception/5',
    pending: 'border-pending text-pending-dark bg-pending/10',
    ink: 'border-paper/30 text-paper bg-ink-700',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 text-2xs font-medium uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'verified' | 'ink';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const variants: Record<string, string> = {
    primary:
      'bg-ink text-paper border-ink hover:bg-ink-800 focus-visible:bg-ink-800',
    secondary:
      'bg-transparent text-ink border-ink/30 hover:border-ink hover:bg-ink/5',
    ghost: 'bg-transparent text-ink border-transparent hover:bg-ink/5',
    danger:
      'bg-exception text-paper border-exception hover:bg-exception-dark focus-visible:bg-exception-dark',
    verified:
      'bg-verified text-paper border-verified hover:bg-verified-dark focus-visible:bg-verified-dark',
    ink: 'bg-ink-700 text-paper border-ink-600 hover:bg-ink-600',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'neutral' | 'verified' | 'exception' | 'pending';
}) {
  const toneColor: Record<string, string> = {
    neutral: 'text-warmink',
    verified: 'text-verified',
    exception: 'text-exception',
    pending: 'text-pending-dark',
  };
  return (
    <div className="px-5 py-4">
      <div className="text-2xs uppercase tracking-wide text-warmink-mute font-medium">
        {label}
      </div>
      <div className={cn('mt-1 font-slab text-2xl tnum', toneColor[tone])}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-warmink-mute">{hint}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  action,
  icon,
}: {
  title: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon && <div className="text-warmink-mute opacity-60">{icon}</div>}
      <p className="text-sm text-warmink-soft max-w-sm">{title}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        'font-slab text-xl font-semibold text-warmink leading-tight',
        className,
      )}
    >
      {children}
    </h2>
  );
}
