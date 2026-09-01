import { useState, useCallback, useEffect } from 'react';
import { api } from '@/services/api';
import { TopBar, PageHeader } from '@/components/TopBar';
import { Card, EmptyState, Pill } from '@/components/ui';
import { fmtDateTime } from '@/utils/format';
import type { ImportEvent } from '@/types';
import { Database } from 'lucide-react';

export function ImportHistory() {
  const [imports, setImports] = useState<ImportEvent[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setImports(await api.getImportEvents());
    } catch {
      setImports([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const impsList = imports ?? [];

  return (
    <div>
      <TopBar
        breadcrumb={
          <>
            <span>Operator</span>
            <span className="text-warmink-mute/50">/</span>
            <span className="text-warmink">Import history</span>
          </>
        }
      />
      <PageHeader
        title="Import history"
        subtitle="Every loan tape upload, its parse result, and any rows that failed to import."
      />
      <div className="px-6 lg:px-10 py-8">
        <Card>
          {loading && imports === null ? (
            <div className="p-6 text-sm text-warmink-mute">Loading import history…</div>
          ) : impsList.length === 0 ? (
            <EmptyState
              icon={<Database className="w-6 h-6" strokeWidth={1.5} />}
              title="No imports yet — upload a loan tape to get started."
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
