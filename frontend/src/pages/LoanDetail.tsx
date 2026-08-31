import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useApp } from '@/appContext';
import { TopBar, PageHeader } from '@/components/TopBar';
import { Card, CardHeader, Pill, Button, EmptyState } from '@/components/ui';
import { VerifiedStamp } from '@/components/VerifiedStamp';
import { fmtMoney, fmtPct, fmtDate, fmtDateTime } from '@/utils/format';
import type {
  LoanRecord,
  Exception,
  AIRecommendation,
  AuditEvent,
  VerifiedRecord,
  ReviewerDecision,
  AIStatus,
} from '@/types';
import {
  Sparkles,
  Check,
  X,
  Pencil,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  Clock,
  ArrowLeft,
  FileText,
  HelpCircle,
  Gavel,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const fieldLabels: Record<keyof LoanRecord, string> = {
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

const monoFields: Partial<Record<keyof LoanRecord, boolean>> = {
  loan_id: true,
  borrower_id: true,
  origination_date: true,
  maturity_date: true,
  original_principal: true,
  current_balance: true,
  interest_rate: true,
  term_months: true,
  days_past_due: true,
};

function fieldValue(field: keyof LoanRecord, loan: LoanRecord): string {
  const v = loan[field];
  if (field === 'original_principal' || field === 'current_balance')
    return fmtMoney(v as number);
  if (field === 'interest_rate') return fmtPct(v as number);
  if (field === 'term_months' || field === 'days_past_due') return String(v);
  return String(v);
}

export function LoanDetail() {
  const { loanId } = useParams<{ loanId: string }>();
  const nav = useNavigate();
  const { actor, switchRole } = useApp();
  const [loan, setLoan] = useState<LoanRecord | null>(null);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [recs, setRecs] = useState<AIRecommendation[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [verified, setVerified] = useState<VerifiedRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [stamping, setStamping] = useState(false);
  const [decision, setDecision] = useState<ReviewerDecision>(null);
  const [busy, setBusy] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!loanId) return;
    setLoading(true);
    const [l, exs, allRecs, aud, v] = await Promise.all([
      api.getLoan(loanId),
      api.getExceptions(),
      api.getRecommendations(),
      api.getAudit(loanId),
      api.getVerifiedLoan(loanId),
    ]);
    setLoan(l);
    const matchedExs = exs.filter((e) => e.loan_id === loanId);
    setExceptions(matchedExs);
    setRecs(allRecs.filter((r) => matchedExs.some((e) => e.id === r.exception_id)));
    setAudit(aud);
    setVerified(v);
    setLoading(false);
  }, [loanId]);

  useEffect(() => {
    load();
  }, [load]);

  const flaggedFields = new Set(exceptions.flatMap((e) => (e.field ? [e.field] : [])));
  const openExceptions = exceptions.filter((e) => e.status === 'open');

  const handleAIAction = async (recId: string, action: 'accept' | 'reject' | 'edit') => {
    if (action === 'edit') {
      setEditing(recId);
      const rec = recs.find((r) => r.id === recId);
      setEditText(rec?.suggested_correction ?? '');
      return;
    }
    setBusy(true);
    await api.postAIAction(recId, action);
    setRecs((rs) =>
      rs.map((r) =>
        r.id === recId
          ? { ...r, status: (action === 'accept' ? 'accepted' : 'rejected') as AIStatus }
          : r,
      ),
    );
    // Refresh loan data in case a field was corrected
    if (loanId) {
      const refreshedLoan = await api.getLoan(loanId);
      if (refreshedLoan) setLoan(refreshedLoan);
    }
    setBusy(false);
  };

  const saveEdit = async (recId: string) => {
    setBusy(true);
    await api.postAIAction(recId, 'edit', editText);
    setRecs((rs) =>
      rs.map((r) =>
        r.id === recId
          ? { ...r, status: 'edited' as AIStatus, suggested_correction: editText }
          : r,
      ),
    );
    setEditing(null);
    if (loanId) {
      const refreshedLoan = await api.getLoan(loanId);
      if (refreshedLoan) setLoan(refreshedLoan);
    }
    setBusy(false);
  };

  const requestAI = async () => {
    if (!loanId || exceptions.length === 0) return;
    setAiGenerating(true);
    const targetEx = exceptions[0];
    const newRec = await api.requestAIRec(loanId, targetEx.id);
    setRecs((prev) => [...prev, newRec]);
    const updatedAudit = await api.getAudit(loanId);
    setAudit(updatedAudit);
    setAiGenerating(false);
  };

  const submitDecision = async () => {
    if (!loanId || !decision) return;
    setBusy(true);
    for (const ex of exceptions) {
      await api.postExceptionDecision(
        ex.id,
        decision === 'approved'
          ? 'approved'
          : decision === 'rejected'
            ? 'rejected'
            : 'correction_requested',
        actor,
        comment || undefined,
      );
    }
    if (comment) {
      await api.addComment(loanId, actor, comment);
      setComment('');
    }
    if (decision === 'approved') {
      setStamping(true);
      const aiRef =
        recs.find((r) => r.status === 'accepted' || r.status === 'edited')?.id ?? null;
      const v = await api.verifyRecord(loanId, actor, 'approved', aiRef);
      setVerified(v);
      setTimeout(() => setStamping(false), 900);
    }
    setDecision(null);
    setBusy(false);
    setExceptions((es) =>
      es.map((e) => ({
        ...e,
        status:
          decision === 'approved'
            ? 'approved'
            : decision === 'rejected'
              ? 'rejected'
              : 'correction_requested',
      })),
    );
    const fresh = await api.getAudit(loanId);
    setAudit(fresh);
  };

  const addComment = async () => {
    if (!loanId || !comment.trim()) return;
    setBusy(true);
    await api.addComment(loanId, actor, comment);
    setComment('');
    const fresh = await api.getAudit(loanId);
    setAudit(fresh);
    setBusy(false);
  };

  if (loading && !loan) {
    return (
      <div>
        <TopBar breadcrumb={<span>Reviewer</span>} />
        <PageHeader title="Loan detail" subtitle="Loading loan records and validation history…" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div>
        <TopBar breadcrumb={<span>Reviewer</span>} />
        <PageHeader title="Loan not found" subtitle="The requested loan record does not exist." />
        <div className="px-6 lg:px-10 py-8">
          <Button variant="secondary" onClick={() => nav('/reviewer/queue')}>
            <ArrowLeft className="w-4 h-4" />
            Back to exception queue
          </Button>
        </div>
      </div>
    );
  }

  const canDecide = openExceptions.length > 0 && !verified;

  return (
    <div>
      <TopBar
        breadcrumb={
          <>
            <button
              onClick={() => nav('/reviewer/queue')}
              className="text-warmink-mute hover:text-warmink"
            >
              Reviewer
            </button>
            <span className="text-warmink-mute/50">/</span>
            <span className="font-mono text-warmink font-medium">{loan.loan_id}</span>
          </>
        }
      />
      <PageHeader
        title={
          <span className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xl font-normal text-warmink-soft">{loan.loan_id}</span>
            <span className="font-slab">{loan.loan_type} loan</span>
            {verified && (
              <VerifiedStamp
                hash={verified.record_hash}
                date={verified.verified_at}
                size="sm"
              />
            )}
          </span>
        }
        subtitle={`${loan.servicer_name} · ${loan.source_system} · Borrower ${loan.borrower_id}`}
        right={
          <Button variant="ghost" onClick={() => nav('/reviewer/queue')}>
            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
            Back to queue
          </Button>
        }
      />

      <div className="px-6 lg:px-10 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: loan fields and reviewer actions */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Loan record"
              subtitle="Failing fields are flagged in exception rust. Review values and consult AI assistance before making your decision."
              right={
                exceptions.length > 0 ? (
                  <Pill tone="exception">
                    {exceptions.length} exception{exceptions.length > 1 ? 's' : ''}
                  </Pill>
                ) : (
                  <Pill tone="verified">Passed all rules</Pill>
                )
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 bg-parchment-lighter">
              {(Object.keys(fieldLabels) as (keyof LoanRecord)[]).map((field, i) => {
                const flagged = flaggedFields.has(field);
                const mono = monoFields[field];
                return (
                  <div
                    key={field}
                    className={cn(
                      'flex flex-col gap-0.5 px-5 py-3',
                      i % 2 === 0 ? 'sm:border-r border-warmink/10' : '',
                      'border-b border-warmink/10 transition-colors',
                      flagged && 'bg-exception/10 border-l-2 border-l-exception',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xs uppercase tracking-wide text-warmink-mute font-medium">
                        {fieldLabels[field]}
                      </span>
                      {flagged && (
                        <span className="inline-flex items-center gap-1 text-2xs text-exception-dark font-medium">
                          <AlertTriangle className="w-3 h-3 text-exception" strokeWidth={2} />
                          Flagged
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm text-warmink mt-0.5',
                        mono && 'font-mono tnum',
                        flagged && 'text-exception-dark font-semibold',
                      )}
                    >
                      {fieldValue(field, loan)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Exceptions list */}
          {exceptions.length > 0 && (
            <Card>
              <CardHeader
                title="Exceptions on this loan"
                subtitle="Validation rules that fired during ingest"
              />
              <ul className="divide-y divide-warmink/10 bg-parchment-lighter">
                {exceptions.map((e) => (
                  <li key={e.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-warmink-mute font-medium">
                            {e.id}
                          </span>
                          <Pill
                            tone={
                              e.severity === 'high'
                                ? 'exception'
                                : e.severity === 'medium'
                                  ? 'pending'
                                  : 'neutral'
                            }
                          >
                            {e.severity}
                          </Pill>
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
                        </div>
                        <p className="mt-1.5 text-sm text-warmink-soft leading-relaxed">
                          {e.detail}
                        </p>
                        <p className="mt-1 text-2xs text-warmink-mute font-mono">
                          Rule: {e.rule_type} · detected {fmtDateTime(e.detected_at)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Reviewer decision - clearly separated from AI actions */}
          <Card surface="parchmentDim" className="border-2 border-warmink/30">
            <CardHeader
              title="Reviewer decision"
              subtitle="Your final call on this loan record. The AI assistant never decides on its own — human reviewer retains full authority."
              right={
                !canDecide && verified ? (
                  <Pill tone="verified">Record Verified</Pill>
                ) : undefined
              }
            />
            <div className="p-5 space-y-4">
              {canDecide ? (
                <>
                  <div className="flex flex-wrap gap-2.5">
                    <Button
                      variant={decision === 'approved' ? 'verified' : 'secondary'}
                      onClick={() => setDecision('approved')}
                      disabled={busy}
                    >
                      <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
                      Approve loan
                    </Button>
                    <Button
                      variant={decision === 'rejected' ? 'danger' : 'secondary'}
                      onClick={() => setDecision('rejected')}
                      disabled={busy}
                    >
                      <X className="w-4 h-4" strokeWidth={1.75} />
                      Reject loan
                    </Button>
                    <Button
                      variant={decision === 'correction_requested' ? 'primary' : 'secondary'}
                      onClick={() => setDecision('correction_requested')}
                      disabled={busy}
                    >
                      <Pencil className="w-4 h-4" strokeWidth={1.75} />
                      Request correction
                    </Button>
                  </div>

                  {decision && (
                    <div className="p-4 bg-parchment border border-warmink/20 space-y-3">
                      <p className="text-xs text-warmink font-medium">
                        {decision === 'approved'
                          ? 'Ready to approve and hash canonical loan dataset:'
                          : decision === 'rejected'
                            ? 'Confirming loan rejection (will be recorded in audit log):'
                            : 'Requesting correction from data operator / servicer:'}
                      </p>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Add decision comment (optional, recorded in the audit trail)"
                        rows={2}
                        className="w-full text-sm bg-parchment-lighter border border-warmink/20 px-3 py-2 focus:border-ink/40 outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant={
                            decision === 'approved'
                              ? 'verified'
                              : decision === 'rejected'
                                ? 'danger'
                                : 'primary'
                          }
                          onClick={submitDecision}
                          disabled={busy}
                        >
                          {decision === 'approved'
                            ? 'Verify record'
                            : decision === 'rejected'
                              ? 'Confirm reject'
                              : 'Send request'}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setDecision(null)}
                          disabled={busy}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : verified ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-verified" strokeWidth={1.75} />
                    <p className="text-sm text-warmink-soft">
                      This loan was verified by {verified.verified_by} on{' '}
                      {fmtDate(verified.verified_at)}.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      switchRole('consumer');
                      nav(`/consumer/verified/${loan.loan_id}`);
                    }}
                  >
                    View verified record
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-warmink-mute">
                  No open exceptions requiring decision on this loan.
                </p>
              )}
            </div>
          </Card>

          {/* Action History / Comments list */}
          <Card>
            <CardHeader
              title="Reviewer action history"
              subtitle="Comments and decisions recorded against this loan"
              right={<MessageSquare className="w-4 h-4 text-warmink-mute" strokeWidth={1.75} />}
            />
            <div className="p-5">
              <div className="flex gap-2 mb-4">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !decision) addComment();
                  }}
                  placeholder="Add a comment for the audit trail"
                  className="flex-1 text-sm bg-parchment-lighter border border-warmink/20 px-3 py-2 focus:border-ink/40 outline-none"
                />
                <Button
                  variant="secondary"
                  onClick={addComment}
                  disabled={busy || !comment.trim()}
                >
                  Add comment
                </Button>
              </div>
              {audit.filter(
                (a) => a.event_type === 'comment' || a.event_type === 'decision',
              ).length === 0 ? (
                <EmptyState
                  icon={<MessageSquare className="w-5 h-5" strokeWidth={1.5} />}
                  title="No comments or reviewer decisions yet."
                />
              ) : (
                <ul className="space-y-3 divide-y divide-warmink/10">
                  {audit
                    .filter((a) => a.event_type === 'comment' || a.event_type === 'decision')
                    .map((a, i) => (
                      <li key={i} className="flex gap-3 text-sm pt-3 first:pt-0">
                        <div className="shrink-0 mt-0.5">
                          {a.event_type === 'decision' ? (
                            <Gavel className="w-4 h-4 text-verified" strokeWidth={1.75} />
                          ) : (
                            <MessageSquare
                              className="w-4 h-4 text-warmink-mute"
                              strokeWidth={1.75}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium text-warmink">{a.actor}</span>
                            <span className="font-mono text-2xs text-warmink-mute">
                              {fmtDateTime(a.timestamp)}
                            </span>
                          </div>
                          <p className="text-warmink-soft mt-0.5">{a.detail}</p>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        {/* Right: AI assistant panel & Verified stamp */}
        <div className="space-y-6">
          {/* AI panel */}
          <Card surface="ink" className="relative overflow-hidden">
            <CardHeader
              title="AI assistant"
              subtitle="Failure explanation and suggested fix under human control"
              right={<Sparkles className="w-4 h-4 text-verified-light" strokeWidth={1.75} />}
            />
            <div className="p-5 space-y-5">
              {recs.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-paper/70">
                    No automated suggestion generated yet for this record.
                  </p>
                  <Button
                    variant="ink"
                    className="w-full text-xs"
                    disabled={aiGenerating}
                    onClick={requestAI}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-verified-light" />
                    {aiGenerating
                      ? 'Consulting Claude 3.5 Sonnet…'
                      : 'Ask AI assistant to analyze'}
                  </Button>
                </div>
              ) : (
                recs.map((rec) => (
                  <div key={rec.id} className="space-y-4">
                    <div>
                      <p className="text-2xs uppercase tracking-wide text-paper/40 mb-1.5 font-medium">
                        Plain-English Explanation
                      </p>
                      <p className="text-sm text-paper/90 leading-relaxed">
                        {rec.explanation}
                      </p>
                    </div>

                    <div className="border-t border-paper/10 pt-3">
                      <p className="text-2xs uppercase tracking-wide text-paper/40 mb-1.5 font-medium">
                        Suggested Correction
                      </p>
                      {editing === rec.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            className="w-full text-sm bg-ink-700 text-paper border border-paper/30 px-3 py-2 focus:border-verified-light outline-none resize-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="verified"
                              onClick={() => saveEdit(rec.id)}
                              disabled={busy}
                            >
                              <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                              Save edit
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setEditing(null)}
                              className="text-paper/70 hover:text-paper"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-paper/90 leading-relaxed bg-ink-700 border border-paper/15 px-3.5 py-3">
                          {rec.suggested_correction}
                        </p>
                      )}
                    </div>

                    {/* AI Suggestion Actions: Accept, Edit, Reject */}
                    {rec.status === 'pending' && editing !== rec.id ? (
                      <div className="border-t border-paper/10 pt-3 space-y-2">
                        <p className="text-2xs uppercase tracking-wide text-paper/50 font-medium">
                          Act on AI suggestion (Separate from final loan decision):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="verified"
                            className="text-xs py-1.5"
                            onClick={() => handleAIAction(rec.id, 'accept')}
                            disabled={busy}
                          >
                            <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                            Accept suggestion
                          </Button>
                          <Button
                            variant="secondary"
                            className="text-xs py-1.5 text-paper/85 border-paper/30 hover:border-paper hover:bg-paper/10"
                            onClick={() => handleAIAction(rec.id, 'edit')}
                            disabled={busy}
                          >
                            <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                            Edit suggestion
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-xs py-1.5 text-paper/60 hover:text-paper"
                            onClick={() => handleAIAction(rec.id, 'reject')}
                            disabled={busy}
                          >
                            <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                            Reject suggestion
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-paper/10 pt-3 flex items-center justify-between">
                        <Pill
                          tone={
                            rec.status === 'accepted'
                              ? 'verified'
                              : rec.status === 'rejected'
                                ? 'exception'
                                : 'pending'
                          }
                        >
                          Suggestion {rec.status}
                        </Pill>
                        {rec.status === 'edited' && editing !== rec.id && (
                          <Button
                            variant="ghost"
                            onClick={() => handleAIAction(rec.id, 'edit')}
                            className="text-paper/70 hover:text-paper text-xs py-1"
                          >
                            Edit again
                          </Button>
                        )}
                      </div>
                    )}

                    {/* AI Metadata */}
                    <div className="pt-2 border-t border-paper/10 text-2xs text-paper/40 font-mono">
                      Model: {rec.model} · {fmtDateTime(rec.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Signature Moment: The Verified Stamp */}
          {verified ? (
            <Card>
              <CardHeader title="Verification stamp" subtitle="Hashed and stamped into the ledger" />
              <div className="p-8 flex flex-col items-center gap-5">
                <div className="py-2">
                  <VerifiedStamp
                    hash={verified.record_hash}
                    date={verified.verified_at}
                    land={stamping}
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm text-warmink font-medium">
                    Signed off by {verified.verified_by}
                  </p>
                  <p className="font-mono text-2xs text-warmink-mute">
                    {fmtDateTime(verified.verified_at)}
                  </p>
                  <p className="font-mono text-2xs text-warmink-mute bg-parchment-lighter border border-warmink/15 px-2.5 py-1">
                    {verified.record_hash}
                  </p>
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    switchRole('consumer');
                    nav(`/consumer/verified/${loan.loan_id}`);
                  }}
                >
                  <FileText className="w-4 h-4" strokeWidth={1.75} />
                  Open in Consumer Ledger
                </Button>
              </div>
            </Card>
          ) : (
            <Card surface="parchmentDim">
              <CardHeader
                title="Awaiting verification"
                subtitle="Approval creates the cryptographic stamp"
                right={<Clock className="w-4 h-4 text-pending-dark" strokeWidth={1.75} />}
              />
              <div className="p-5 space-y-2">
                <p className="text-sm text-warmink-soft leading-relaxed">
                  When you approve this loan, a canonical record is created with a content hash
                  and written into the auditable dataset.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
