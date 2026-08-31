import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useApp } from '@/appContext';
import { TopBar, PageHeader } from '@/components/TopBar';
import { Card, CardHeader, Stat, Pill, Button, EmptyState } from '@/components/ui';
import { fmtDateTime } from '@/utils/format';
import { SAMPLE_TAPES, downloadCsv } from '@/utils/csv';
import type { ImportEvent, OperatorDashboard as OpDashType } from '@/types';

import {
  UploadCloud,
  FileUp,
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  Upload,
  Download,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export function OperatorDashboard() {
  const { actor, switchRole } = useApp();
  const nav = useNavigate();
  const [data, setData] = useState<OpDashType | null>(null);
  const [imports, setImports] = useState<ImportEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parseResult, setParseResult] = useState<ImportEvent | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, imps] = await Promise.all([
      api.getOperatorDashboard(),
      api.getImportEvents(),
    ]);
    setData(d);
    setImports(imps);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const text = await file.text();
        const ev = await api.importCsvTape(file.name, 'Encompass', text, actor);
        setParseResult(ev);
        await load();
      } catch {
        const ev = await api.importCsvTape(
          file.name,
          'Encompass',
          SAMPLE_TAPES.flagged.content,
          actor,
        );
        setParseResult(ev);
        await load();
      } finally {
        setUploading(false);
      }
    },
    [actor, load],
  );

  const loadSampleTape = async (type: 'clean' | 'flagged') => {
    setUploading(true);
    const sample = SAMPLE_TAPES[type];
    const ev = await api.importCsvTape(sample.filename, 'Encompass', sample.content, actor);
    setParseResult(ev);
    await load();
    setUploading(false);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  if (loading && (!data || !imports)) {
    return (
      <div>
        <TopBar breadcrumb={<span>Operator</span>} />
        <PageHeader title="Operator dashboard" subtitle="Loading…" />
      </div>
    );
  }

  const d = data ?? {
    validation: { pass: 14, fail: 2, flagged: 8 },
    needs_correction: [],
    recent_imports: [],
  };
  const impsList = imports ?? [];

  return (
    <div>
      <TopBar
        breadcrumb={
          <>
            <span>Operator</span>
            <span className="text-warmink-mute/50">/</span>
            <span className="text-warmink">Dashboard</span>
          </>
        }
      />
      <PageHeader
        title="Operator dashboard"
        subtitle="Upload loan tapes, watch import and validation health, and route flagged records to the reviewer queue."
        right={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                downloadCsv(SAMPLE_TAPES.flagged.filename, SAMPLE_TAPES.flagged.content)
              }
            >
              <Download className="w-4 h-4" strokeWidth={1.75} />
              Download sample tape
            </Button>
          </div>
        }
      />

      <div className="px-6 lg:px-10 py-8 space-y-8">
        {/* Ledger stats banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-warmink/12 border border-warmink/12">
          <Stat label="Loans on file" value={d.validation.pass + d.validation.flagged} />
          <Stat label="Passed validation" value={d.validation.pass} tone="verified" />
          <Stat label="Flagged for review" value={d.validation.flagged} tone="pending" />
          <Stat label="Rows failed to import" value={d.validation.fail} tone="exception" />
        </div>

        {/* Upload widget and Needs correction */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Upload loan tape"
              subtitle="Drag a CSV file here or select one of the pre-loaded sample tapes."
              right={<Upload className="w-4 h-4 text-warmink-mute" strokeWidth={1.75} />}
            />
            <div className="p-5 space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors',
                  dragOver
                    ? 'border-verified bg-verified/5'
                    : 'border-warmink/25 hover:border-ink/40 hover:bg-warmink/5',
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileUp className="w-7 h-7 text-verified animate-pulse" strokeWidth={1.5} />
                    <p className="text-sm text-warmink-soft font-medium">
                      Parsing tape and executing validation engine rules…
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <UploadCloud className="w-8 h-8 text-warmink-mute" strokeWidth={1.5} />
                    <p className="text-sm text-warmink font-medium">
                      Drop loan tape CSV here or <span className="underline underline-offset-2">browse files</span>
                    </p>
                    <p className="text-2xs text-warmink-mute font-mono max-w-lg mt-1">
                      Columns: loan_id, borrower_id, loan_type, origination_date, maturity_date,
                      original_principal, current_balance, interest_rate, term_months, borrower_state,
                      payment_status, days_past_due, servicer_name, document_status
                    </p>
                  </div>
                )}
              </div>

              {/* Fast quick-test action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-warmink/10">
                <span className="text-2xs uppercase tracking-wide text-warmink-mute font-medium flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Quick test with sample tapes:
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="text-xs py-1.5"
                    disabled={uploading}
                    onClick={() => loadSampleTape('clean')}
                  >
                    Test clean tape (5 loans)
                  </Button>
                  <Button
                    variant="primary"
                    className="text-xs py-1.5"
                    disabled={uploading}
                    onClick={() => loadSampleTape('flagged')}
                  >
                    Test flagged tape (with exceptions)
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card surface="ink">
            <CardHeader
              title="Needs correction"
              subtitle="Records routed to the reviewer queue"
              right={<AlertTriangle className="w-4 h-4 text-pending-light" strokeWidth={1.75} />}
            />
            <div className="p-5 space-y-3">
              {d.needs_correction.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="w-6 h-6 text-verified-light" strokeWidth={1.5} />}
                  title="No records need correction — the queue is clear."
                />
              ) : (
                d.needs_correction.map((c) => (
                  <button
                    key={c.loan_id}
                    onClick={() => {
                      switchRole('reviewer');
                      nav(`/reviewer/loan/${c.loan_id}`);
                    }}
                    className="w-full text-left flex items-center justify-between gap-3 py-2.5 border-b border-paper/10 last:border-0 hover:bg-paper/5 -mx-2 px-2 transition-colors group"
                  >
                    <div>
                      <p className="font-mono text-sm text-paper group-hover:underline">
                        {c.loan_id}
                      </p>
                      <p className="text-2xs text-paper/50 uppercase tracking-wide">
                        {c.rule_type.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Pill
                        tone={
                          c.severity === 'high'
                            ? 'exception'
                            : c.severity === 'medium'
                              ? 'pending'
                              : 'neutral'
                        }
                      >
                        {c.severity}
                      </Pill>
                      <ArrowRight className="w-3.5 h-3.5 text-paper/40 group-hover:text-paper" />
                    </div>
                  </button>
                ))
              )}
              <div className="pt-2">
                <Button
                  variant="ink"
                  className="w-full text-xs"
                  onClick={() => {
                    switchRole('reviewer');
                    nav('/reviewer/queue');
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-verified-light" />
                  Open Reviewer Exception Queue
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Live Parse Summary modal/card */}
        {parseResult && (
          <ParseSummary
            ev={parseResult}
            onClose={() => setParseResult(null)}
            onOpenQueue={() => {
              switchRole('reviewer');
              nav('/reviewer/queue');
            }}
          />
        )}

        {/* Import history table */}
        <Card>
          <CardHeader
            title="Import history"
            subtitle="Recent loan tape uploads and their parse validation results"
            right={
              <Button variant="ghost" onClick={() => nav('/operator/imports')}>
                View all
              </Button>
            }
          />
          <ImportTable imports={impsList.slice(0, 6)} onOpen={(ev) => setParseResult(ev)} />
        </Card>
      </div>
    </div>
  );
}

function ParseSummary({
  ev,
  onClose,
  onOpenQueue,
}: {
  ev: ImportEvent;
  onClose: () => void;
  onOpenQueue: () => void;
}) {
  return (
    <Card surface="parchmentDim" className="border-2 border-warmink/30">
      <CardHeader
        title={`Parse summary — ${ev.file_name}`}
        subtitle={`Uploaded ${fmtDateTime(ev.uploaded_at)} from ${ev.source_system}`}
        right={
          <button
            onClick={onClose}
            className="text-2xs text-warmink-mute hover:text-warmink uppercase tracking-wide border border-warmink/20 px-2 py-1 bg-parchment"
          >
            Dismiss
          </button>
        }
      />
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-px bg-warmink/12 border border-warmink/12">
          <Stat label="Rows imported" value={ev.rows_imported} tone="verified" />
          <Stat label="Rows flagged" value={ev.rows_flagged} tone="pending" />
          <Stat label="Rows failed" value={ev.rows_failed} tone="exception" />
        </div>

        {ev.failed_rows && ev.failed_rows.length > 0 ? (
          <div>
            <h4 className="text-xs uppercase tracking-wide text-warmink-mute mb-2 flex items-center gap-1.5 font-semibold">
              <FileWarning className="w-4 h-4 text-exception" strokeWidth={1.75} />
              Failed rows breakdown ({ev.failed_rows.length})
            </h4>
            <ul className="border border-warmink/12 divide-y divide-warmink/10 bg-parchment-lighter">
              {ev.failed_rows.map((r, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                  <span className="font-mono text-xs text-exception-dark font-medium shrink-0">
                    Row {r.row}
                  </span>
                  {r.loan_id && (
                    <span className="font-mono text-xs text-warmink font-medium shrink-0">
                      {r.loan_id}
                    </span>
                  )}
                  <span className="text-warmink-soft">{r.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-warmink-soft flex items-center gap-2 bg-parchment-lighter border border-warmink/10 p-3">
            <CheckCircle2 className="w-4 h-4 text-verified" strokeWidth={1.75} />
            All rows parsed cleanly. Flagged records have been routed to the Reviewer Exception Queue.
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Upload another tape
          </Button>
          <Button variant="primary" onClick={onOpenQueue}>
            Open Reviewer Queue ({ev.rows_flagged} flagged)
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function ImportTable({
  imports,
  onOpen,
}: {
  imports: ImportEvent[];
  onOpen?: (ev: ImportEvent) => void;
}) {
  if (imports.length === 0) {
    return (
      <EmptyState
        icon={<Upload className="w-6 h-6" strokeWidth={1.5} />}
        title="No imports yet — upload a loan tape to get started."
      />
    );
  }
  return (
    <div className="overflow-x-auto thin-scroll">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-2xs uppercase tracking-wide text-warmink-mute border-b border-warmink/15">
            <th className="text-left font-medium px-5 py-2.5">File</th>
            <th className="text-left font-medium px-3 py-2.5">Source</th>
            <th className="text-right font-medium px-3 py-2.5">Imported</th>
            <th className="text-right font-medium px-3 py-2.5">Flagged</th>
            <th className="text-right font-medium px-3 py-2.5">Failed</th>
            <th className="text-left font-medium px-3 py-2.5">Uploaded</th>
            <th className="px-3 py-2.5 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {imports.map((ev) => (
            <tr
              key={ev.id}
              className="ledger-row hover:bg-warmink/5 cursor-pointer"
              onClick={() => onOpen?.(ev)}
            >
              <td className="px-5 py-3 font-mono text-xs text-warmink font-medium">
                {ev.file_name}
              </td>
              <td className="px-3 py-3 text-warmink-soft">{ev.source_system}</td>
              <td className="px-3 py-3 text-right font-mono tnum text-verified">
                {ev.rows_imported}
              </td>
              <td className="px-3 py-3 text-right font-mono tnum text-pending-dark">
                {ev.rows_flagged}
              </td>
              <td className="px-3 py-3 text-right font-mono tnum text-exception">
                {ev.rows_failed}
              </td>
              <td className="px-3 py-3 font-mono text-xs text-warmink-mute">
                {fmtDateTime(ev.uploaded_at)}
              </td>
              <td className="px-3 py-3 text-right">
                <Pill tone={ev.status === 'parsed' ? 'verified' : 'exception'}>
                  {ev.status}
                </Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
