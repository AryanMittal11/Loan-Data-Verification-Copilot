import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useApp } from '@/appContext';
import { TopBar, PageHeader } from '@/components/TopBar';
import { Card, CardHeader, Pill, Button } from '@/components/ui';
import { VerifiedStamp } from '@/components/VerifiedStamp';
import { fmtMoney, fmtPct, fmtDate, fmtDateTime } from '@/utils/format';
import { exportSingleVerifiedLoanCsv } from '@/utils/csv';
import type { VerifiedRecord } from '@/types';
import {
  FileText,
  Hash,
  ShieldCheck,
  Download,
  ScrollText,
  Sparkles,
  UserCheck,
  Check,
  Copy,
  ArrowLeft,
} from 'lucide-react';

const fieldLabels: Record<string, string> = {
  loan_id: 'Loan ID',
  borrower_id: 'Borrower ID',
  loan_type: 'Loan type',
  origination_date: 'Origination date',
  maturity_date: 'Maturity date',
  original_principal: 'Original principal',
  current_balance: 'Current balance',
  interest_rate: 'Interest rate',
  term_months: 'Term (months)',
  borrower_state: 'Borrower state',
  payment_status: 'Payment status',
  days_past_due: 'Days past due',
  servicer_name: 'Servicer',
  document_status: 'Document status',
  source_system: 'Source system',
};

export function VerifiedRecordDetail() {
  const { loanId } = useParams<{ loanId: string }>();
  const nav = useNavigate();
  const { actor } = useApp();
  const [record, setRecord] = useState<VerifiedRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [exported, setExported] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!loanId) return;
    setLoading(true);
    const r = await api.getVerifiedLoan(loanId);
    setRecord(r);
    setLoading(false);
  }, [loanId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    if (!record || !loanId) return;
    exportSingleVerifiedLoanCsv(record);
    await api.exportRecord(loanId, actor);
    setExported(true);
  };

  const copyHash = () => {
    if (!record?.record_hash) return;
    navigator.clipboard?.writeText(record.record_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !record) {
    return (
      <div>
        <TopBar breadcrumb={<span>Consumer</span>} />
        <PageHeader title="Verified record" subtitle="Loading verified dataset…" />
      </div>
    );
  }

  if (!record) {
    return (
      <div>
        <TopBar breadcrumb={<span>Consumer</span>} />
        <PageHeader title="Record not found" subtitle="This record has not been verified yet." />
        <div className="px-6 lg:px-10 py-8">
          <Button variant="secondary" onClick={() => nav('/consumer/verified')}>
            <ArrowLeft className="w-4 h-4" />
            Back to verified records
          </Button>
        </div>
      </div>
    );
  }

  const d = record.canonical_data;
  const monoValue = (field: string, v: unknown): string => {
    if (field === 'original_principal' || field === 'current_balance')
      return fmtMoney(v as number);
    if (field === 'interest_rate') return fmtPct(v as number);
    if (field === 'term_months' || field === 'days_past_due') return String(v);
    return String(v);
  };
  const isMono = (field: string) =>
    [
      'loan_id',
      'borrower_id',
      'origination_date',
      'maturity_date',
      'original_principal',
      'current_balance',
      'interest_rate',
      'term_months',
      'days_past_due',
    ].includes(field);

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
            <span className="font-mono text-warmink font-medium">{record.loan_id}</span>
          </>
        }
      />
      <PageHeader
        title={
          <span className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xl font-normal text-warmink-soft">
              {record.loan_id}
            </span>
            <span className="font-slab">Verified record</span>
          </span>
        }
        subtitle={`Canonical data from ${record.source_file_ref} · verified ${fmtDate(record.verified_at)} by ${record.verified_by}`}
        right={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => nav(`/consumer/audit/${record.loan_id}`)}
            >
              <ScrollText className="w-4 h-4" strokeWidth={1.75} />
              Audit trail
            </Button>
            <Button variant="primary" onClick={handleExport}>
              <Download className="w-4 h-4" strokeWidth={1.75} />
              {exported ? 'Export record again' : 'Export record'}
            </Button>
          </div>
        }
      />

      <div className="px-6 lg:px-10 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canonical data & Provenance */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Canonical data"
              subtitle="The verified, hashed representation of this loan record."
              right={<Pill tone="verified">Verified pass</Pill>}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 bg-parchment-lighter">
              {(Object.keys(fieldLabels) as string[]).map((field, i) => (
                <div
                  key={field}
                  className={`flex flex-col gap-0.5 px-5 py-3 border-b border-warmink/10 ${
                    i % 2 === 0 ? 'sm:border-r border-warmink/10' : ''
                  }`}
                >
                  <span className="text-2xs uppercase tracking-wide text-warmink-mute font-medium">
                    {fieldLabels[field]}
                  </span>
                  <span
                    className={`text-sm text-warmink font-medium ${isMono(field) ? 'font-mono tnum' : ''}`}
                  >
                    {monoValue(field, d[field as keyof typeof d])}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Provenance"
              subtitle="Where this record came from and the reviewer sign-off history"
            />
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 bg-parchment-lighter">
              <ProvenanceRow
                icon={FileText}
                label="Source file"
                value={record.source_file_ref}
                mono
              />
              <ProvenanceRow
                icon={ShieldCheck}
                label="Validation result"
                value={
                  record.validation_result === 'pass'
                    ? 'Passed all validation rules'
                    : 'Passed with notes'
                }
              />
              <ProvenanceRow
                icon={UserCheck}
                label="Reviewer decision"
                value={record.reviewer_decision.replace(/_/g, ' ')}
              />
              <ProvenanceRow icon={UserCheck} label="Verified by" value={record.verified_by} />
              <ProvenanceRow
                icon={Hash}
                label="Verified at"
                value={fmtDateTime(record.verified_at)}
                mono
              />
              <ProvenanceRow
                icon={Sparkles}
                label="AI recommendation ref"
                value={record.ai_recommendation_ref ?? 'None used'}
                mono={!!record.ai_recommendation_ref}
              />
            </div>
          </Card>
        </div>

        {/* Signature moment: The Stamp + Hash card */}
        <div className="space-y-6">
          <Card surface="parchmentDim" className="border-2 border-warmink/30">
            <CardHeader
              title="Record hash"
              subtitle="The cryptographic content fingerprint of this verified record"
            />
            <div className="p-8 flex flex-col items-center gap-6">
              <div className="relative py-3">
                <VerifiedStamp hash={record.record_hash} date={record.verified_at} land />
              </div>
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-2xs uppercase tracking-wide text-warmink-mute">
                  <span className="font-semibold">SHA-256 Record Hash</span>
                  <button
                    onClick={copyHash}
                    className="hover:text-warmink font-mono flex items-center gap-1 border border-warmink/20 px-2 py-0.5 bg-parchment text-warmink"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-verified" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy hash
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-xs text-warmink break-all leading-relaxed bg-parchment-lighter border border-warmink/20 p-3 select-all">
                  {record.record_hash}
                </p>
                <p className="text-2xs text-warmink-mute leading-relaxed">
                  Deterministic cryptographic fingerprint. Any alteration to the loan fields
                  produces a different hash.
                </p>
              </div>
            </div>
          </Card>

          {exported && (
            <Card>
              <CardHeader title="Export recorded" subtitle="Dataset exported to CSV" />
              <div className="p-5">
                <p className="text-sm text-warmink-soft flex items-center gap-2">
                  <Download className="w-4 h-4 text-verified" strokeWidth={1.75} />
                  Record exported by {actor}. Export event appended to immutable audit log.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ProvenanceRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-7 h-7 border border-warmink/15 bg-parchment">
        <Icon className="w-3.5 h-3.5 text-warmink-mute" strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-2xs uppercase tracking-wide text-warmink-mute font-medium">
          {label}
        </p>
        <p className={`text-sm text-warmink font-medium ${mono ? 'font-mono' : ''}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
