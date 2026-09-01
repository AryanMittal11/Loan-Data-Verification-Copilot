import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useApp } from '@/appContext';
import { TopBar, PageHeader } from '@/components/TopBar';
import { Card, CardHeader, Stat, Pill, Button, EmptyState } from '@/components/ui';
import { fmtDateTime } from '@/utils/format';
import { SAMPLE_TAPES } from '@/utils/csv';
import type { ImportEvent, OperatorDashboard as OpDashType, SourceSystem } from '@/types';

import {
  UploadCloud,
  FileUp,
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  Upload,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export function OperatorDashboard() {
  const { actor } = useApp();
  const nav = useNavigate();
  const [data, setData] = useState<OpDashType | null>(null);
  const [imports, setImports] = useState<ImportEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parseResult, setParseResult] = useState<ImportEvent | null>(null);
  const [sourceSystem, setSourceSystem] = useState<SourceSystem>('Encompass');
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, imps] = await Promise.all([
        api.getOperatorDashboard(),
        api.getImportEvents(),
      ]);
      setData(d);
      setImports(imps);
    } catch {
      setData(null);
      setImports([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Invalid file format. Please upload a valid CSV file (.csv).');
        return;
      }
      setUploading(true);
      setParseResult(null);
      try {
        const text = await file.text();
        if (!text.trim()) {
          alert('The uploaded file is empty. Please select a CSV file with loan records.');
          return;
        }
        const ev = await api.importCsvTape(file.name, sourceSystem, text, actor);
        setParseResult(ev);
        await load();
      } catch (err: any) {
        alert(`File import error: ${err?.message || 'Failed to process CSV file.'}`);
      } finally {
        setUploading(false);
      }
    },
    [actor, sourceSystem, load],
  );

  const loadSampleTape = async (type: 'clean' | 'flagged') => {
    setUploading(true);
    try {
      const sample = SAMPLE_TAPES[type];
      const ev = await api.importCsvTape(sample.filename, sourceSystem, sample.content, actor);
      setParseResult(ev);
      await load();
    } catch (err: any) {
      alert(`Import error: ${err?.message || 'Failed to process sample tape.'}`);
    } finally {
      setUploading(false);
    }
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
    validation: { pass: 0, fail: 0, flagged: 0 },
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
        subtitle="Upload loan tapes, track ingestion pipeline health, and review automated rule outputs."
      />

      <div className="px-6 lg:px-10 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-warmink/12 border border-warmink/12">
          <Stat label="Total imported files" value={impsList.length} />
          <Stat label="Passed validation" value={d.validation.pass} tone="verified" />
          <Stat label="Flagged exceptions" value={d.validation.flagged} tone="pending" />
          <Stat label="Failed row imports" value={d.validation.fail} tone="exception" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload card */}
          <Card className="lg:col-span-2">
            <CardHeader
              title="Ingest loan tape"
              subtitle="Upload CSV exports from Encompass, Byte, Calyx, or servicer updates."
              right={
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-mono text-warmink-mute uppercase">System:</span>
                  <select
                    value={sourceSystem}
                    onChange={(e) => setSourceSystem(e.target.value as SourceSystem)}
                    className="text-2xs font-mono bg-parchment-light border border-warmink/20 px-2 py-1 focus:border-ink/40 outline-none"
                  >
                    <option value="Encompass">Encompass LOS</option>
                    <option value="Byte">Byte LOS</option>
                    <option value="Calyx">Calyx LOS</option>
                    <option value="Cascade Servicing">Servicer Update (Cascade)</option>
                    <option value="Document Manifest">Document Manifest</option>
                  </select>
                </div>
              }
            />
            <div className="p-5">
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
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed p-8 text-center cursor-pointer transition-all',
                  dragOver
                    ? 'border-verified bg-verified/5'
                    : 'border-warmink/25 hover:border-warmink/50 bg-parchment-lighter',
                )}
              >
                <UploadCloud
                  className="w-10 h-10 mx-auto text-warmink-mute mb-3"
                  strokeWidth={1.5}
                />
                <p className="text-sm font-medium text-warmink">
                  {uploading ? 'Parsing & running rules…' : 'Drop loan tape CSV here, or click to browse'}
                </p>
                <p className="mt-1 text-2xs text-warmink-mute font-mono">
                  Accepts CSV format · loan_id, borrower_id, principal, balance, rate, dates, servicer
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-warmink/10 flex flex-wrap items-center justify-between gap-3 text-2xs">
                <span className="text-warmink-mute">Or load sample tape fixture:</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => loadSampleTape('clean')}
                    disabled={uploading}
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    Clean conforming tape
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => loadSampleTape('flagged')}
                    disabled={uploading}
                  >
                    <FileWarning className="w-3.5 h-3.5 text-amber-700" />
                    Tape with intentional exceptions
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Import summary output */}
          <Card>
            <CardHeader
              title="Parse & Rule Summary"
              subtitle="Result of last uploaded tape batch"
            />
            <div className="p-5">
              {parseResult ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-medium text-warmink truncate">
                      {parseResult.file_name}
                    </span>
                    <Pill tone={parseResult.status === 'parsed' ? 'verified' : 'exception'}>
                      {parseResult.status}
                    </Pill>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-2xs font-mono py-2 bg-parchment border border-warmink/15">
                    <div>
                      <div className="text-warmink-mute">Imported</div>
                      <div className="text-sm font-bold text-warmink">{parseResult.rows_imported}</div>
                    </div>
                    <div>
                      <div className="text-warmink-mute">Flagged</div>
                      <div className="text-sm font-bold text-pending-dark">{parseResult.rows_flagged}</div>
                    </div>
                    <div>
                      <div className="text-warmink-mute">Failed</div>
                      <div className="text-sm font-bold text-red-600">{parseResult.rows_failed}</div>
                    </div>
                  </div>
                  {parseResult.failed_rows && parseResult.failed_rows.length > 0 && (
                    <div className="p-2 bg-red-50 border border-red-200 text-2xs text-red-800 space-y-1 max-h-32 overflow-y-auto">
                      <div className="font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-600" /> Failed Rows:
                      </div>
                      {parseResult.failed_rows.map((fr, idx) => (
                        <div key={idx}>
                          Row {fr.row}: {fr.reason}
                        </div>
                      ))}
                    </div>
                  )}
                  {parseResult.rows_flagged > 0 && (
                    <div className="pt-2">
                      <p className="text-2xs text-warmink-soft mb-2">
                        {parseResult.rows_flagged} exception(s) routed to Reviewer Queue.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-2xs text-warmink-mute">
                  No upload performed in this session yet. Drop a CSV file on the left to test ingestion.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Needs Correction Table */}
        <Card>
          <CardHeader
            title="Records requiring reviewer attention"
            subtitle="Flagged loans grouped by severity and active validation rule"
          />
          {d.needs_correction.length === 0 ? (
            <div className="p-6 text-center text-xs text-warmink-mute flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-verified" />
              No records currently need correction. Pipeline is clean.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-2xs uppercase tracking-wide text-warmink-mute border-b border-warmink/15">
                    <th className="text-left font-medium px-5 py-2.5">Loan ID</th>
                    <th className="text-left font-medium px-3 py-2.5">Rule Code</th>
                    <th className="text-left font-medium px-3 py-2.5">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {d.needs_correction.map((item, idx) => (
                    <tr key={idx} className="border-b border-warmink/10 hover:bg-warmink/5">
                      <td className="px-5 py-2.5 font-mono text-xs font-medium text-warmink">
                        {item.loan_id}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-2xs text-warmink-soft">
                        {item.rule_type}
                      </td>
                      <td className="px-3 py-2.5">
                        <Pill tone={item.severity === 'high' ? 'exception' : item.severity === 'medium' ? 'pending' : 'neutral'}>
                          {item.severity}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Recent Imports History */}
        <Card>
          <CardHeader
            title="Import history"
            subtitle="Recent source files ingested into Loan Record store"
          />
          {impsList.length === 0 ? (
            <EmptyState
              icon={<Upload className="w-6 h-6" strokeWidth={1.5} />}
              title="No import events recorded yet."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-2xs uppercase tracking-wide text-warmink-mute border-b border-warmink/15">
                    <th className="text-left font-medium px-5 py-2.5">File Name</th>
                    <th className="text-left font-medium px-3 py-2.5">Source Type</th>
                    <th className="text-left font-medium px-3 py-2.5">Uploaded At</th>
                    <th className="text-right font-medium px-3 py-2.5">Rows</th>
                    <th className="text-right font-medium px-3 py-2.5">Flagged</th>
                    <th className="text-left font-medium px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {impsList.map((imp) => (
                    <tr key={imp.id} className="border-b border-warmink/10 hover:bg-warmink/5">
                      <td className="px-5 py-3 font-mono text-xs text-warmink font-medium">
                        {imp.file_name}
                      </td>
                      <td className="px-3 py-3 text-warmink-soft">{imp.source_system}</td>
                      <td className="px-3 py-3 font-mono text-2xs text-warmink-mute">
                        {fmtDateTime(imp.uploaded_at)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tnum">{imp.rows_imported}</td>
                      <td className="px-3 py-3 text-right font-mono tnum text-pending-dark">
                        {imp.rows_flagged}
                      </td>
                      <td className="px-3 py-3">
                        <Pill tone={imp.status === 'parsed' ? 'verified' : 'exception'}>
                          {imp.status}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
