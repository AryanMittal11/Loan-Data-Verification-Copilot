import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { TopBar, PageHeader } from '@/components/TopBar';
import { Card, CardHeader, Stat, Button, EmptyState } from '@/components/ui';
import { VerifiedStamp } from '@/components/VerifiedStamp';
import { fmtMoney, fmtDate, fmtDateTime } from '@/utils/format';
import { exportAllVerifiedLoansCsv } from '@/utils/csv';
import type { ConsumerDashboard as ConsumerDashType, VerifiedRecord } from '@/types';
import { ShieldCheck, ScrollText, Download } from 'lucide-react';

export function ConsumerDashboard() {
  const nav = useNavigate();
  const [data, setData] = useState<ConsumerDashType | null>(null);
  const [verified, setVerified] = useState<VerifiedRecord[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, v] = await Promise.all([
        api.getConsumerDashboard(),
        api.getVerifiedLoans(),
      ]);
      setData(d);
      setVerified(v);
    } catch {
      setData(null);
      setVerified([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && (!data || !verified)) {
    return (
      <div>
        <TopBar breadcrumb={<span>Consumer</span>} />
        <PageHeader title="Data Consumer dashboard" subtitle="Loading…" />
      </div>
    );
  }

  const d = data ?? {
    verified_count: 0,
    data_quality_score: 100.0,
    verification_history: [],
  };
  const verifiedList = verified ?? [];

  return (
    <div>
      <TopBar
        breadcrumb={
          <>
            <span>Consumer</span>
            <span className="text-warmink-mute/50">/</span>
            <span className="text-warmink">Dashboard</span>
          </>
        }
      />
      <PageHeader
        title="Data Consumer dashboard"
        subtitle="Browse verified records, check data quality, and open audit trails. Every record carries a content hash."
        right={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => exportAllVerifiedLoansCsv(verifiedList)}
              disabled={verifiedList.length === 0}
            >
              <Download className="w-4 h-4" strokeWidth={1.75} />
              Export verified tape (CSV)
            </Button>
            <Button variant="primary" onClick={() => nav('/consumer/verified')}>
              <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
              Browse verified records
            </Button>
          </div>
        }
      />

      <div className="px-6 lg:px-10 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-warmink/12 border border-warmink/12">
          <Stat label="Verified records" value={verifiedList.length} tone="verified" />
          <div className="px-5 py-4 bg-parchment-lighter">
            <div className="text-2xs uppercase tracking-wide text-warmink-mute font-medium">
              Data-quality score
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-slab text-2xl text-verified tnum font-semibold">
                {d.data_quality_score.toFixed(1)}
              </span>
              <span className="text-sm text-warmink-mute">/ 100</span>
            </div>
            <div className="mt-2 h-1.5 bg-warmink/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-verified transition-all rounded-full"
                style={{ width: `${d.data_quality_score}%` }}
              />
            </div>
            {d.quality_breakdown && (
              <div className="mt-3 space-y-1.5">
                {([
                  { label: 'Completeness', value: d.quality_breakdown.completeness, weight: '40%', color: 'bg-emerald-500' },
                  { label: 'Accuracy', value: d.quality_breakdown.accuracy, weight: '35%', color: 'bg-sky-500' },
                  { label: 'Verification', value: d.quality_breakdown.verification, weight: '25%', color: 'bg-amber-500' },
                ] as const).map((dim) => (
                  <div key={dim.label} className="flex items-center gap-2">
                    <span className="text-2xs text-warmink-mute w-[80px] shrink-0">
                      {dim.label}
                      <span className="text-warmink-mute/50 ml-0.5">({dim.weight})</span>
                    </span>
                    <div className="flex-1 h-1 bg-warmink/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${dim.color} transition-all rounded-full`}
                        style={{ width: `${dim.value}%` }}
                      />
                    </div>
                    <span className="text-2xs font-mono tnum text-warmink-mute w-[38px] text-right">
                      {dim.value.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Stat
            label="Verified coverage"
            value={`${verifiedList.length > 0 ? ((verifiedList.length / Math.max(1, verifiedList.length)) * 100).toFixed(1) : '0.0'}%`}
            hint="of verified loan records on file"
          />
        </div>

        <Card>
          <CardHeader
            title="Verification history"
            subtitle="Most recently verified records in chronological order"
            right={<ScrollText className="w-4 h-4 text-warmink-mute" strokeWidth={1.75} />}
          />
          {d.verification_history.length === 0 && verifiedList.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="w-6 h-6" strokeWidth={1.5} />}
              title="No verified records yet — once a reviewer approves a loan, it appears here."
            />
          ) : (
            <ul className="divide-y divide-warmink/10 bg-parchment-lighter">
              {(d.verification_history.length > 0
                ? d.verification_history
                : verifiedList.slice(0, 6).map((v) => ({
                    loan_id: v.loan_id,
                    verified_by: v.verified_by,
                    verified_at: v.verified_at,
                  }))
              ).map((h, i) => (
                <li
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5"
                >
                  <button
                    onClick={() => nav(`/consumer/verified/${h.loan_id}`)}
                    className="flex items-center gap-3 hover:underline text-left"
                  >
                    <VerifiedStamp hash="" date="" size="sm" />
                    <span className="font-mono text-sm text-warmink font-medium">
                      {h.loan_id}
                    </span>
                  </button>
                  <div className="flex items-center gap-3 text-xs text-warmink-mute">
                    <span>Verified by {h.verified_by}</span>
                    <span className="font-mono text-2xs">{fmtDateTime(h.verified_at)}</span>
                    <Button
                      variant="ghost"
                      className="text-xs"
                      onClick={() => nav(`/consumer/audit/${h.loan_id}`)}
                    >
                      Audit trail
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Verified records"
            subtitle="The auditable dataset. Each row is hashed and traceable to its reviewer sign-off."
            right={
              <Button variant="ghost" onClick={() => nav('/consumer/verified')}>
                View all ({verifiedList.length})
              </Button>
            }
          />
          {verifiedList.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="w-6 h-6" strokeWidth={1.5} />}
              title="No verified records yet — once a reviewer approves a loan, it appears here."
            />
          ) : (
            <div className="overflow-x-auto thin-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-2xs uppercase tracking-wide text-warmink-mute border-b border-warmink/15">
                    <th className="text-left font-medium px-5 py-2.5">Loan</th>
                    <th className="text-left font-medium px-3 py-2.5">Type</th>
                    <th className="text-right font-medium px-3 py-2.5">Balance</th>
                    <th className="text-left font-medium px-3 py-2.5">Verified by</th>
                    <th className="text-left font-medium px-3 py-2.5">Verified at</th>
                    <th className="text-left font-medium px-3 py-2.5">Record Hash</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {verifiedList.slice(0, 8).map((v) => (
                    <tr
                      key={v.loan_id}
                      onClick={() => nav(`/consumer/verified/${v.loan_id}`)}
                      className="ledger-row hover:bg-warmink/5 cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <VerifiedStamp hash={v.record_hash} date={v.verified_at} size="sm" />
                          <span className="font-mono text-xs text-warmink font-medium">
                            {v.loan_id}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-warmink-soft">{v.canonical_data.loan_type}</td>
                      <td className="px-3 py-3 text-right font-mono tnum text-warmink">
                        {fmtMoney(v.canonical_data.current_balance)}
                      </td>
                      <td className="px-3 py-3 text-warmink-soft">{v.verified_by}</td>
                      <td className="px-3 py-3 font-mono text-2xs text-warmink-mute">
                        {fmtDate(v.verified_at)}
                      </td>
                      <td className="px-3 py-3 font-mono text-2xs text-warmink-mute">
                        {v.record_hash.slice(0, 14)}…
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button variant="ghost" className="text-xs">
                          Open detail
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
