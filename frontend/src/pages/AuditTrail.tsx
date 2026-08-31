import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { TopBar, PageHeader } from '@/components/TopBar';
import { Card, Pill, Button, EmptyState } from '@/components/ui';
import { fmtDateTime } from '@/utils/format';
import type { AuditEvent, AuditEventType } from '@/types';
import {
  Upload,
  FileDown,
  ShieldCheck,
  Flag,
  Sparkles,
  MessageSquare,
  Gavel,
  Stamp,
  Download,
  ArrowLeft,
  ScrollText,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const eventMeta: Record<
  AuditEventType,
  {
    icon: typeof Upload;
    label: string;
    tone: 'neutral' | 'verified' | 'exception' | 'pending' | 'ink';
  }
> = {
  uploaded: { icon: Upload, label: 'Uploaded', tone: 'neutral' },
  imported: { icon: FileDown, label: 'Imported', tone: 'neutral' },
  validated: { icon: ShieldCheck, label: 'Validated', tone: 'neutral' },
  exception_created: { icon: Flag, label: 'Exception created', tone: 'exception' },
  ai_recommendation_generated: { icon: Sparkles, label: 'AI recommendation', tone: 'ink' },
  comment: { icon: MessageSquare, label: 'Comment', tone: 'neutral' },
  decision: { icon: Gavel, label: 'Decision', tone: 'pending' },
  verified: { icon: Stamp, label: 'Verified', tone: 'verified' },
  exported: { icon: Download, label: 'Exported', tone: 'verified' },
};

export function AuditTrail() {
  const { loanId } = useParams<{ loanId: string }>();
  const nav = useNavigate();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!loanId) return;
    setLoading(true);
    setEvents(await api.getAudit(loanId));
    setLoading(false);
  }, [loanId]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = events
    ? [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    : [];

  return (
    <div>
      <TopBar
        breadcrumb={
          <>
            <button
              onClick={() => nav('/consumer/verified')}
              className="text-warmink-mute hover:text-warmink"
            >
              Consumer
            </button>
            <span className="text-warmink-mute/50">/</span>
            <span className="font-mono text-warmink font-medium">{loanId}</span>
            <span className="text-warmink-mute/50">/</span>
            <span className="text-warmink">Audit trail</span>
          </>
        }
      />
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <ScrollText className="w-6 h-6 text-verified" strokeWidth={1.5} />
            Audit trail viewer
          </span>
        }
        subtitle={
          <>
            Chronological paper trail for{' '}
            <span className="font-mono text-warmink-soft font-semibold">{loanId}</span> — from
            tape ingest and automated rule validation through human review, AI assistance,
            cryptographic verification, and export.
          </>
        }
        right={
          <Button variant="ghost" onClick={() => nav(-1)}>
            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
            Back
          </Button>
        }
      />

      <div className="px-6 lg:px-10 py-8">
        <Card>
          {loading && !events ? (
            <div className="p-8 text-center text-sm text-warmink-mute">
              Loading immutable audit trail…
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="w-6 h-6" strokeWidth={1.5} />}
              title="No audit events recorded for this loan yet."
            />
          ) : (
            <ol className="relative bg-parchment-lighter">
              {/* Ruled vertical lineage line */}
              <div
                className="absolute left-[2.15rem] top-6 bottom-6 w-px bg-warmink/15"
                aria-hidden
              />
              {sorted.map((ev, i) => {
                const meta = eventMeta[ev.event_type] ?? {
                  icon: ScrollText,
                  label: ev.event_type,
                  tone: 'neutral',
                };
                const Icon = meta.icon;
                const isLast = i === sorted.length - 1;
                return (
                  <li
                    key={i}
                    className={cn(
                      'relative flex gap-4 px-6 py-4.5 transition-colors',
                      !isLast && 'border-b border-warmink/10',
                      ev.event_type === 'verified' && 'bg-verified/5',
                    )}
                  >
                    <div className="relative z-10 shrink-0">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center w-9 h-9 border bg-parchment',
                          meta.tone === 'verified' && 'border-verified text-verified',
                          meta.tone === 'exception' && 'border-exception text-exception',
                          meta.tone === 'pending' && 'border-pending text-pending-dark',
                          meta.tone === 'ink' && 'border-ink text-paper bg-ink',
                          meta.tone === 'neutral' && 'border-warmink/25 text-warmink-soft',
                        )}
                      >
                        <Icon className="w-4 h-4" strokeWidth={1.75} />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-slab text-sm font-semibold text-warmink">
                          {meta.label}
                        </span>
                        <Pill tone={meta.tone === 'ink' ? 'neutral' : meta.tone}>
                          {ev.event_type.replace(/_/g, ' ')}
                        </Pill>
                        <span className="font-mono text-2xs text-warmink-mute">
                          {fmtDateTime(ev.timestamp)}
                        </span>
                      </div>
                      {ev.detail && (
                        <p className="mt-1 text-sm text-warmink-soft leading-relaxed max-w-ledger">
                          {ev.detail}
                        </p>
                      )}
                      <p className="mt-1 text-2xs text-warmink-mute font-mono">
                        Actor: <span className="text-warmink-soft">{ev.actor}</span>
                        {' · '}
                        Entity: <span>{ev.entity_type}/{ev.entity_id}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
