import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { TopBar, PageHeader } from '@/components/TopBar';
import { Card, Pill, EmptyState, Button } from '@/components/ui';
import { fmtDateTime } from '@/utils/format';
import type { Exception, ExceptionSeverity, RuleType } from '@/types';
import { Search, ListChecks, Filter, X } from 'lucide-react';
import { cn } from '@/utils/cn';

const ruleTypes: RuleType[] = [
  'date_order',
  'balance_under_principal',
  'rate_in_range',
  'term_consistent',
  'document_complete',
  'dpd_status_match',
  'servicer_present',
];

const severityTone: Record<ExceptionSeverity, 'exception' | 'pending' | 'neutral'> = {
  high: 'exception',
  medium: 'pending',
  low: 'neutral',
};

export function ExceptionQueue() {
  const nav = useNavigate();
  const [exceptions, setExceptions] = useState<Exception[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState<ExceptionSeverity | 'all'>('all');
  const [ruleFilter, setRuleFilter] = useState<RuleType | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setExceptions(await api.getExceptions());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!exceptions) return [];
    return exceptions.filter((e) => {
      if (sevFilter !== 'all' && e.severity !== sevFilter) return false;
      if (ruleFilter !== 'all' && e.rule_type !== ruleFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!e.loan_id.toLowerCase().includes(q) && !e.id.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [exceptions, sevFilter, ruleFilter, search]);

  const clearFilters = () => {
    setSearch('');
    setSevFilter('all');
    setRuleFilter('all');
  };

  const hasFilters = search || sevFilter !== 'all' || ruleFilter !== 'all';

  return (
    <div>
      <TopBar
        breadcrumb={
          <>
            <span>Reviewer</span>
            <span className="text-warmink-mute/50">/</span>
            <span className="text-warmink">Exception queue</span>
          </>
        }
      />
      <PageHeader
        title="Exception queue"
        subtitle="Filter by exception type and severity, or search by loan ID or exception ID. Click any row to review details and consult the AI assistant."
      />

      <div className="px-6 lg:px-10 py-8 space-y-5">
        <Card>
          <div className="flex flex-col md:flex-row md:items-center gap-3 p-4 border-b border-warmink/12 bg-parchment-lighter">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warmink-mute"
                strokeWidth={1.75}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by loan ID (e.g. LN-100202) or exception ID"
                className="w-full pl-9 pr-3 py-2 text-sm bg-parchment-light border border-warmink/20 focus:border-ink/40 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-warmink-mute" strokeWidth={1.75} />
              <select
                value={sevFilter}
                onChange={(e) => setSevFilter(e.target.value as ExceptionSeverity | 'all')}
                className="text-sm bg-parchment-light border border-warmink/20 px-2.5 py-2 focus:border-ink/40 outline-none"
              >
                <option value="all">All severities</option>
                <option value="high">High severity</option>
                <option value="medium">Medium severity</option>
                <option value="low">Low severity</option>
              </select>
              <select
                value={ruleFilter}
                onChange={(e) => setRuleFilter(e.target.value as RuleType | 'all')}
                className="text-sm bg-parchment-light border border-warmink/20 px-2.5 py-2 focus:border-ink/40 outline-none"
              >
                <option value="all">All validation rules</option>
                {ruleTypes.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-2xs uppercase tracking-wide text-warmink-mute hover:text-warmink border border-warmink/20 px-2.5 py-2 bg-parchment-light"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Clear
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-warmink-mute">
              Loading exception queue…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<ListChecks className="w-6 h-6" strokeWidth={1.5} />}
              title={
                hasFilters
                  ? 'No exceptions match these filters — try clearing them.'
                  : 'No exceptions yet — upload a loan tape to get started.'
              }
            />
          ) : (
            <div className="overflow-x-auto thin-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-2xs uppercase tracking-wide text-warmink-mute border-b border-warmink/15">
                    <th className="text-left font-medium px-5 py-2.5">Exception</th>
                    <th className="text-left font-medium px-3 py-2.5">Loan</th>
                    <th className="text-left font-medium px-3 py-2.5">Rule type</th>
                    <th className="text-left font-medium px-3 py-2.5">Severity</th>
                    <th className="text-left font-medium px-3 py-2.5">Status</th>
                    <th className="text-left font-medium px-3 py-2.5">Detected</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => nav(`/reviewer/loan/${e.loan_id}`)}
                      className={cn(
                        'ledger-row hover:bg-warmink/5 cursor-pointer transition-colors',
                        e.status !== 'open' && 'opacity-65',
                      )}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-warmink font-medium">
                        {e.id}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-warmink">
                        {e.loan_id}
                      </td>
                      <td className="px-3 py-3 text-warmink-soft capitalize">
                        {e.rule_type.replace(/_/g, ' ')}
                      </td>
                      <td className="px-3 py-3">
                        <Pill tone={severityTone[e.severity]}>{e.severity}</Pill>
                      </td>
                      <td className="px-3 py-3">
                        <Pill
                          tone={
                            e.status === 'open'
                              ? 'pending'
                              : e.status === 'approved'
                                ? 'verified'
                                : e.status === 'rejected'
                                  ? 'exception'
                                  : 'neutral'
                          }
                        >
                          {e.status.replace(/_/g, ' ')}
                        </Pill>
                      </td>
                      <td className="px-3 py-3 font-mono text-2xs text-warmink-mute">
                        {fmtDateTime(e.detected_at)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button variant="ghost" className="text-xs">
                          Review loan
                        </Button>
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
