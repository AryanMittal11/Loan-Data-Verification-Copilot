import { useState, useCallback, useEffect } from 'react';
import { api } from '@/services/api';
import { TopBar, PageHeader } from '@/components/TopBar';
import { Card, EmptyState } from '@/components/ui';
import { ImportTable } from '@/pages/OperatorDashboard';
import type { ImportEvent } from '@/types';
import { Database } from 'lucide-react';

export function ImportHistory() {
  const [imports, setImports] = useState<ImportEvent[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setImports(await api.getImportEvents());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
          ) : imports === null || imports.length === 0 ? (
            <EmptyState
              icon={<Database className="w-6 h-6" strokeWidth={1.5} />}
              title="No imports yet — upload a loan tape to get started."
            />
          ) : (
            <ImportTable imports={imports} />
          )}
        </Card>
      </div>
    </div>
  );
}
