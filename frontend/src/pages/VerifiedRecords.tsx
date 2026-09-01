import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { TopBar, PageHeader } from '@/components/TopBar';
import { Card, Button, EmptyState } from '@/components/ui';
import { VerifiedStamp } from '@/components/VerifiedStamp';
import { fmtMoney, fmtDate } from '@/utils/format';
import { exportAllVerifiedLoansCsv } from '@/utils/csv';
import type { VerifiedRecord } from '@/types';
import { ShieldCheck, Search, Download } from 'lucide-react';

export function VerifiedRecords() {
  const nav = useNavigate();
  const [records, setRecords] = useState<VerifiedRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRecords(await api.getVerifiedLoans());
    } catch {
      setRecords([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = records ?? [];
  const filtered = list.filter(
    (r) =>
      !search.trim() ||
      r.loan_id.toLowerCase().includes(search.toLowerCase()) ||
      r.canonical_data.borrower_id.toLowerCase().includes(search.toLowerCase()),
  );

  const handleExport = async () => {
    try {
      await api.exportVerifiedLoans();
      exportAllVerifiedLoansCsv(list);
    } catch {
      exportAllVerifiedLoansCsv(list);
    }
  };

  return (
    <div>
      <TopBar
        breadcrumb={
          <>
            <span>Consumer</span>
            <span className="text-warmink-mute/50">/</span>
            <span className="text-warmink">Verified records</span>
          </>
        }
      />
      <PageHeader
        title="Verified records"
        subtitle="The auditable dataset. Each record is canonical, hashed, and traceable to its source file and reviewer."
        right={
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={list.length === 0}
          >
            <Download className="w-4 h-4" strokeWidth={1.75} />
            Export verified dataset (CSV)
          </Button>
        }
      />

      <div className="px-6 lg:px-10 py-8 space-y-5">
        <Card>
          <div className="p-4 border-b border-warmink/12 bg-parchment-lighter">
            <div className="relative max-w-sm">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warmink-mute"
                strokeWidth={1.75}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by loan ID or borrower ID"
                className="w-full pl-9 pr-3 py-2 text-sm bg-parchment-light border border-warmink/20 focus:border-ink/40 outline-none"
              />
            </div>
          </div>
          {loading && !records ? (
            <div className="p-8 text-center text-sm text-warmink-mute">
              Loading verified records…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="w-6 h-6" strokeWidth={1.5} />}
              title={
                list.length > 0
                  ? 'No records match that search.'
                  : 'No verified records yet — once a reviewer approves a loan, it appears here.'
              }
            />
          ) : (
            <div className="overflow-x-auto thin-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-2xs uppercase tracking-wide text-warmink-mute border-b border-warmink/15">
                    <th className="text-left font-medium px-5 py-2.5">Loan</th>
                    <th className="text-left font-medium px-3 py-2.5">Borrower</th>
                    <th className="text-left font-medium px-3 py-2.5">Type</th>
                    <th className="text-right font-medium px-3 py-2.5">Principal</th>
                    <th className="text-right font-medium px-3 py-2.5">Balance</th>
                    <th className="text-left font-medium px-3 py-2.5">Rate</th>
                    <th className="text-left font-medium px-3 py-2.5">State</th>
                    <th className="text-left font-medium px-3 py-2.5">Verified</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v: VerifiedRecord) => (
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
                      <td className="px-3 py-3 font-mono text-xs text-warmink-soft">
                        {v.canonical_data.borrower_id}
                      </td>
                      <td className="px-3 py-3 text-warmink-soft">{v.canonical_data.loan_type}</td>
                      <td className="px-3 py-3 text-right font-mono tnum text-warmink">
                        {fmtMoney(v.canonical_data.original_principal)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tnum text-warmink">
                        {fmtMoney(v.canonical_data.current_balance)}
                      </td>
                      <td className="px-3 py-3 font-mono tnum text-warmink-soft">
                        {v.canonical_data.interest_rate ? (v.canonical_data.interest_rate > 1 ? v.canonical_data.interest_rate : v.canonical_data.interest_rate * 100).toFixed(3) : '0.000'}%
                      </td>
                      <td className="px-3 py-3 text-warmink-soft">
                        {v.canonical_data.borrower_state}
                      </td>
                      <td className="px-3 py-3 font-mono text-2xs text-warmink-mute">
                        {fmtDate(v.verified_at)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button variant="ghost" className="text-xs">
                          Open record
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
