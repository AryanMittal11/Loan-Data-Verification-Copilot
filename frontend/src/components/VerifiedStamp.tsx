import { cn } from '@/utils/cn';
import { fmtDate, shortHash } from '@/utils/format';

export function VerifiedStamp({
  hash,
  date,
  size = 'lg',
  land = false,
  className,
}: {
  hash: string;
  date: string;
  size?: 'lg' | 'sm';
  land?: boolean;
  className?: string;
}) {
  if (size === 'sm') {
    return (
      <span className={cn('stamp-badge', className)} title={`Verified ${fmtDate(date)} — ${hash}`}>
        Verified
      </span>
    );
  }
  return (
    <div className={cn('stamp', land && 'stamp-land', className)} aria-label="Verified record stamp">
      <span className="font-slab font-bold text-lg leading-none tracking-wide">VERIFIED</span>
      <span className="font-mono text-2xs mt-1 leading-none text-verified/80">
        {shortHash(hash, 14)}
      </span>
      <span className="font-mono text-2xs mt-0.5 leading-none text-verified/70">
        {fmtDate(date)}
      </span>
    </div>
  );
}
