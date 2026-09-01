import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useApp } from '@/appContext';
import { TopBar, PageHeader } from '@/components/TopBar';
import { Card, CardHeader, Pill, Button } from '@/components/ui';
import { VerifiedStamp } from '@/components/VerifiedStamp';
import { fmtMoney, fmtPct, fmtDate, fmtDateTime } from '@/utils/format';
import type {
  LoanRecord,
  Exception,
  AIRecommendation,
  AuditEvent,
  VerifiedRecord,
  ReviewerDecision,
} from '@/types';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  History,
  ShieldCheck,
  Send,
  AlertTriangle,
  FileCode,
  Sliders,
  Check,
  X,
  HelpCircle,
  Pencil,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { cn } from '@/utils/cn';

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
  servicer_name: 'Servicer name',
  document_status: 'Document status',
  source_system: 'Source system',
};

function formatValue(field: string, v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (field === 'original_principal' || field === 'current_balance') return fmtMoney(v as number);
  if (field === 'interest_rate') return fmtPct(v as number);
  if (field === 'origination_date' || field === 'maturity_date') return fmtDate(v as string);
  return String(v);
}

// Tracks which exception is getting AI-generated content and which AI type
interface AILoadingState {
  exceptionId: string;
  type: string;
}

export function LoanDetail() {
  const { loanId } = useParams<{ loanId: string }>();
  const nav = useNavigate();
  const { actor } = useApp();
  const [loan, setLoan] = useState<LoanRecord | null>(null);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [recsMap, setRecsMap] = useState<Record<string, AIRecommendation[]>>({});
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [verified, setVerified] = useState<VerifiedRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [decision, setDecision] = useState<ReviewerDecision | null>(null);
  const [stamping, setStamping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiLoading, setAiLoading] = useState<AILoadingState | null>(null);

  // Per-exception editing state
  const [editingException, setEditingException] = useState<string | null>(null);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');

  // Manual field editing (directly on exception without AI)
  const [manualEditException, setManualEditException] = useState<string | null>(null);
  const [manualEditValue, setManualEditValue] = useState('');

  // Expanded/collapsed exception cards
  const [expandedExceptions, setExpandedExceptions] = useState<Set<string>>(new Set());

  // Decision errors
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!loanId) return;
    setLoading(true);
    try {
      const [l, exsWithRecs, aud, v] = await Promise.all([
        api.getLoan(loanId).catch(() => null),
        api.getExceptions().catch(() => []),
        api.getAudit(loanId).catch(() => []),
        api.getVerifiedLoan(loanId).catch(() => null),
      ]);
      setLoan(l);

      // Filter exceptions for this loan
      const matchedExs = (exsWithRecs || []).filter((e: any) => e.loan_id === loanId);
      setExceptions(matchedExs);

      // Build recommendations map keyed by exception ID
      const rMap: Record<string, AIRecommendation[]> = {};
      for (const ex of matchedExs) {
        const exAny = ex as any;
        if (exAny.recommendations && Array.isArray(exAny.recommendations)) {
          rMap[ex.id] = exAny.recommendations;
        } else {
          rMap[ex.id] = [];
        }
      }
      setRecsMap(rMap);

      // Auto-expand all open exceptions
      const openIds = new Set(matchedExs.filter((e) => e.status === 'open').map((e) => e.id));
      setExpandedExceptions(openIds);

      setAudit(aud || []);
      setVerified(v);
    } catch (err) {
      console.error('Error loading loan details:', err);
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    load();
  }, [load]);

  const flaggedFields = new Set(exceptions.flatMap((e) => (e.field ? [e.field] : [])));
  const openExceptions = exceptions.filter((e) => e.status === 'open');

  const toggleExpand = (exId: string) => {
    setExpandedExceptions((prev) => {
      const next = new Set(prev);
      if (next.has(exId)) next.delete(exId);
      else next.add(exId);
      return next;
    });
  };

  // ─── AI Actions: per-exception ───────────────────────────────────

  const requestAIForException = async (
    exceptionId: string,
    type: 'explain' | 'suggest' | 'conflict' | 'notes',
  ) => {
    setAiLoading({ exceptionId, type });
    try {
      let newRec: AIRecommendation;
      if (type === 'suggest') {
        newRec = await api.requestAISuggestion(exceptionId);
      } else if (type === 'conflict') {
        newRec = await api.requestAIConflictResolution(exceptionId);
      } else if (type === 'notes') {
        newRec = await api.requestAIReviewerNotes(exceptionId);
      } else {
        newRec = await api.requestAIRec(loanId!, exceptionId);
      }
      // Append to this exception's recommendations
      setRecsMap((prev) => ({
        ...prev,
        [exceptionId]: [...(prev[exceptionId] || []), newRec],
      }));
    } catch (err: any) {
      alert(`AI error: ${err?.message || 'Failed to generate AI response.'}`);
    } finally {
      setAiLoading(null);
    }
  };

  // ─── Accept AI Recommendation ────────────────────────────────────

  const acceptAIRec = async (exceptionId: string, rec: AIRecommendation) => {
    setBusy(true);
    try {
      await api.postAIAction(exceptionId, 'accept', undefined, rec.id);
      await load();
    } catch (err: any) {
      alert(`Accept error: ${err?.message || 'Failed to accept AI recommendation.'}`);
    } finally {
      setBusy(false);
    }
  };

  // ─── Reject AI Recommendation ────────────────────────────────────

  const rejectAIRec = async (exceptionId: string) => {
    setBusy(true);
    try {
      await api.postAIAction(exceptionId, 'reject');
      await load();
    } catch (err: any) {
      alert(`Reject error: ${err?.message || 'Failed to reject exception.'}`);
    } finally {
      setBusy(false);
    }
  };

  // ─── Edit from AI recommendation (pre-fill suggested value) ──────

  const startEditFromAI = (ex: Exception, rec: AIRecommendation) => {
    setEditingException(ex.id);
    setEditField(ex.field || '');
    setEditValue(rec.suggested_correction || '');
    // Close manual edit if open
    setManualEditException(null);
  };

  // ─── Manual Edit (user enters value directly) ────────────────────

  const startManualEdit = (ex: Exception) => {
    setManualEditException(ex.id);
    setManualEditValue(
      ex.field && loan ? String(loan[ex.field as keyof LoanRecord] ?? '') : '',
    );
    // Close AI edit if open
    setEditingException(null);
  };

  const saveEdit = async (exceptionId: string, field: string, value: string) => {
    if (!field || !value.trim()) {
      alert('Both field name and value are required.');
      return;
    }
    setBusy(true);
    try {
      await api.postAIAction(exceptionId, 'edit', value.trim(), undefined, field);
      setEditingException(null);
      setManualEditException(null);
      await load();
    } catch (err: any) {
      alert(`Edit error: ${err?.message || 'Failed to save field edit.'}`);
    } finally {
      setBusy(false);
    }
  };

  // ─── Loan Decision ──────────────────────────────────────────────

  const submitDecision = async () => {
    if (!loanId || !decision) return;
    setBusy(true);
    setDecisionError(null);
    try {
      if (decision === 'approved') {
        if (openExceptions.length > 0) {
          setDecisionError(
            `Cannot approve loan: ${openExceptions.length} open exception(s) remain unresolved. Please resolve all exceptions first.`,
          );
          setBusy(false);
          return;
        }
        setStamping(true);
        const v = await api.verifyRecord(loanId, actor, 'approved');
        setVerified(v);
        setTimeout(() => setStamping(false), 900);
      } else {
        // Reject the loan — different API call that doesn't fetch verified record
        await api.rejectLoan(loanId);
      }
      if (comment.trim()) {
        await api.addComment(loanId, actor, comment.trim());
        setComment('');
      }
      await load();
    } catch (err: any) {
      setDecisionError(err?.message || 'Failed to post loan decision.');
    } finally {
      setBusy(false);
      setDecision(null);
    }
  };

  // ─── Loading / Not Found States ─────────────────────────────────

  if (loading && !loan) {
    return (
      <div>
        <TopBar breadcrumb={<span>Reviewer</span>} />
        <PageHeader title="Loan review" subtitle="Loading loan record details…" />
        <div className="px-6 lg:px-10 py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-warmink-mute" />
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div>
        <TopBar breadcrumb={<span>Reviewer</span>} />
        <PageHeader title="Loan record not found" subtitle={`No record found for ID: ${loanId}`} />
        <div className="px-6 lg:px-10 py-8">
          <Button variant="secondary" onClick={() => nav('/reviewer/queue')}>
            Return to Exception Queue
          </Button>
        </div>
      </div>
    );
  }

  const loanStatus = verified
    ? 'verified'
    : (loan as any).status === 'rejected'
      ? 'rejected'
      : openExceptions.length > 0
        ? 'flagged'
        : 'clean';

  return (
    <div>
      <TopBar
        breadcrumb={
          <>
            <button
              onClick={() => nav('/reviewer/queue')}
              className="text-warmink-mute hover:text-warmink"
            >
              Reviewer queue
            </button>
            <span className="text-warmink-mute/50">/</span>
            <span className="font-mono text-warmink font-medium">{loan.loan_id}</span>
          </>
        }
      />

      <PageHeader
        title={
          <span className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xl font-normal text-warmink-soft">
              {loan.loan_id}
            </span>
            <span className="font-slab">Loan detail & triage</span>
          </span>
        }
        subtitle={`Ingested via ${loan.source_system} · Borrower ${loan.borrower_id} · ${loan.borrower_state}`}
        right={
          <div className="flex items-center gap-2">
            <Pill
              tone={
                loanStatus === 'verified'
                  ? 'verified'
                  : loanStatus === 'rejected'
                    ? 'exception'
                    : loanStatus === 'flagged'
                      ? 'exception'
                      : 'pending'
              }
            >
              {loanStatus === 'verified'
                ? 'Verified & Sealed'
                : loanStatus === 'rejected'
                  ? 'Rejected'
                  : loanStatus === 'flagged'
                    ? `${openExceptions.length} Open Exception(s)`
                    : 'Passed Validation'}
            </Pill>
            {verified && (
              <Button
                variant="ghost"
                onClick={() => nav(`/consumer/verified/${loan.loan_id}`)}
              >
                <ShieldCheck className="w-4 h-4 text-verified" />
                View Ledger Record
              </Button>
            )}
          </div>
        }
      />

      <div className="px-6 lg:px-10 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column: Canonical Loan Record Fields & Exceptions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Exceptions Alert Banner */}
          {openExceptions.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-slab font-semibold text-sm">
                  {openExceptions.length} Validation Exception(s) Require Review
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Review flagged fields below, use AI suggestions per-exception, or manually edit field values before submitting final loan decision.
                </p>
              </div>
            </div>
          )}

          {/* Rejected Loan Banner */}
          {loanStatus === 'rejected' && (
            <div className="p-4 bg-red-50 border border-red-300 text-red-900 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-slab font-semibold text-sm">Loan Rejected</h4>
                <p className="text-xs text-red-800 mt-0.5">
                  This loan was rejected by an underwriter and will not appear in the Consumer Verified Ledger.
                </p>
              </div>
            </div>
          )}

          {/* Canonical Loan Fields Table */}
          <Card>
            <CardHeader
              title="Canonical Loan Record Fields"
              subtitle="Inspect loan attributes. Flagged fields requiring correction are highlighted."
              right={
                <span className="text-2xs font-mono text-warmink-mute">
                  Servicer: {loan.servicer_name}
                </span>
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 bg-parchment-lighter divide-y sm:divide-y-0 sm:divide-x divide-warmink/10">
              {(Object.keys(fieldLabels) as string[]).map((fKey) => {
                const isFlagged = flaggedFields.has(fKey);
                const exForField = exceptions.find((e) => e.field === fKey);
                return (
                  <div
                    key={fKey}
                    className={cn(
                      'p-4 flex flex-col justify-between transition-colors border-b border-warmink/10',
                      isFlagged && 'bg-amber-500/10 border-l-4 border-l-amber-600',
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xs uppercase tracking-wider font-mono text-warmink-mute">
                        {fieldLabels[fKey]}
                      </span>
                      {isFlagged && (
                        <Pill tone={exForField?.status === 'open' ? 'exception' : 'verified'}>
                          {exForField?.status === 'open'
                            ? exForField?.rule_type || 'Flagged'
                            : 'Resolved'}
                        </Pill>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold text-warmink">
                        {formatValue(fKey, loan[fKey as keyof LoanRecord])}
                      </span>
                    </div>
                    {exForField && exForField.status === 'open' && (
                      <p className="mt-1.5 text-3xs text-amber-900 font-sans leading-tight">
                        {exForField.detail}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ─── Exception Cards with Per-Exception AI & Edit ────── */}
          <Card>
            <CardHeader
              title="Flagged Exceptions & AI Copilot Analysis"
              subtitle="Review each exception individually. Use AI or manual editing to resolve."
            />
            {exceptions.length === 0 ? (
              <div className="p-6 text-center text-xs text-warmink-mute flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-verified" />
                No exceptions flagged for this loan record.
              </div>
            ) : (
              <div className="divide-y divide-warmink/10">
                {exceptions.map((ex) => {
                  const matchingRecs = recsMap[ex.id] || [];
                  const isExpanded = expandedExceptions.has(ex.id);
                  const isAILoadingThis = aiLoading?.exceptionId === ex.id;
                  const isOpen = ex.status === 'open';

                  return (
                    <div key={ex.id} className="bg-parchment-lighter">
                      {/* Exception Header (always visible, clickable to expand) */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(ex.id)}
                        className="w-full p-4 flex items-center justify-between gap-2 text-left hover:bg-parchment-light/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <Pill
                            tone={
                              isOpen
                                ? 'pending'
                                : ex.status === 'approved' || ex.status === 'correction_requested'
                                  ? 'verified'
                                  : 'neutral'
                            }
                          >
                            {ex.status === 'approved'
                              ? 'Resolved'
                              : ex.status === 'correction_requested'
                                ? 'Corrected'
                                : ex.status === 'rejected'
                                  ? 'Rejected'
                                  : 'Open'}
                          </Pill>
                          <Pill tone={ex.severity === 'high' ? 'exception' : 'pending'}>
                            {ex.severity}
                          </Pill>
                          <span className="text-xs font-mono text-warmink-mute truncate">
                            {ex.rule_type}
                          </span>
                          {ex.field && (
                            <span className="text-xs font-mono text-warmink font-semibold">
                              → {fieldLabels[ex.field] || ex.field}
                            </span>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-warmink-mute shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-warmink-mute shrink-0" />
                        )}
                      </button>

                      {/* Expanded Exception Detail */}
                      {isExpanded && (
                        <div className="px-5 pb-5 space-y-4">
                          {/* Rule Failure Detail */}
                          <div className="p-3 bg-paper border border-warmink/15 text-xs text-warmink">
                            <span className="font-semibold text-warmink-dark">
                              Rule Failure Detail:{' '}
                            </span>
                            {ex.detail}
                          </div>

                          {/* Exception ID */}
                          <div className="text-3xs font-mono text-warmink-mute">
                            Exception ID: {ex.id}
                          </div>

                          {/* Per-Exception AI Toolkit (only for open exceptions) */}
                          {isOpen && (
                            <div className="p-3 bg-ink/5 border border-warmink/15 space-y-2">
                              <span className="text-2xs uppercase tracking-wider font-mono text-warmink-mute flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-verified-light" /> AI Actions for
                                this exception:
                              </span>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="secondary"
                                  onClick={() => requestAIForException(ex.id, 'explain')}
                                  disabled={!!aiLoading || busy}
                                >
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  {isAILoadingThis && aiLoading?.type === 'explain'
                                    ? 'Analyzing…'
                                    : 'Explain'}
                                </Button>
                                <Button
                                  variant="secondary"
                                  onClick={() => requestAIForException(ex.id, 'suggest')}
                                  disabled={!!aiLoading || busy}
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  {isAILoadingThis && aiLoading?.type === 'suggest'
                                    ? 'Generating…'
                                    : 'Suggest Fix'}
                                </Button>
                                <Button
                                  variant="secondary"
                                  onClick={() => requestAIForException(ex.id, 'conflict')}
                                  disabled={!!aiLoading || busy}
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                  {isAILoadingThis && aiLoading?.type === 'conflict'
                                    ? 'Resolving…'
                                    : 'Resolve Conflict'}
                                </Button>
                                <Button
                                  variant="secondary"
                                  onClick={() => requestAIForException(ex.id, 'notes')}
                                  disabled={!!aiLoading || busy}
                                >
                                  <FileCode className="w-3.5 h-3.5" />
                                  {isAILoadingThis && aiLoading?.type === 'notes'
                                    ? 'Drafting…'
                                    : 'Reviewer Notes'}
                                </Button>
                              </div>
                              {isAILoadingThis && (
                                <p className="text-2xs text-verified-light font-mono animate-pulse pt-1 flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Gemini is analyzing tape lineage & generating response…
                                </p>
                              )}
                            </div>
                          )}

                          {/* AI Recommendations for this Exception */}
                          {matchingRecs.length > 0 && (
                            <div className="space-y-3">
                              <span className="text-2xs uppercase tracking-wider font-mono text-warmink-mute flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-verified-light" /> AI
                                Recommendations ({matchingRecs.length}):
                              </span>
                              {matchingRecs.map((rec) => (
                                <div
                                  key={rec.id}
                                  className="p-4 bg-paper border border-verified/30 space-y-3"
                                >
                                  <div className="flex items-center justify-between text-2xs flex-wrap gap-1">
                                    <span className="font-mono text-warmink-mute">
                                      Model: <strong>{rec.model}</strong>
                                    </span>
                                    <Pill
                                      tone={
                                        rec.status === 'accepted'
                                          ? 'verified'
                                          : rec.status === 'rejected'
                                            ? 'exception'
                                            : 'pending'
                                      }
                                    >
                                      {rec.status}
                                    </Pill>
                                  </div>

                                  {rec.explanation && (
                                    <p className="text-xs text-warmink leading-relaxed font-sans">
                                      {rec.explanation}
                                    </p>
                                  )}

                                  {rec.suggested_correction && (
                                    <div className="p-2 bg-verified/5 border border-verified/20 font-mono text-xs text-verified-dark">
                                      Suggested Fix:{' '}
                                      <strong>{rec.suggested_correction}</strong>
                                    </div>
                                  )}

                                  {/* Action buttons for pending AI recommendations on open exceptions */}
                                  {rec.status === 'pending' && isOpen && (
                                    <div className="flex items-center gap-2 pt-2 border-t border-warmink/10 flex-wrap">
                                      <Button
                                        variant="verified"
                                        onClick={() => acceptAIRec(ex.id, rec)}
                                        disabled={busy}
                                      >
                                        <Check className="w-3.5 h-3.5" /> Accept Fix
                                      </Button>
                                      <Button
                                        variant="secondary"
                                        onClick={() => startEditFromAI(ex, rec)}
                                        disabled={busy}
                                      >
                                        <Pencil className="w-3.5 h-3.5" /> Edit Value
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        onClick={() => rejectAIRec(ex.id)}
                                        disabled={busy}
                                      >
                                        <X className="w-3.5 h-3.5" /> Reject
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Inline Edit from AI (pre-filled from suggested_correction) */}
                          {editingException === ex.id && (
                            <div className="p-3 bg-parchment border border-warmink/20 space-y-2">
                              <label className="block text-2xs uppercase tracking-wider font-mono text-warmink-mute">
                                Edit Field: {fieldLabels[editField] || editField || 'Unknown'}
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  placeholder="Enter corrected value…"
                                  className="flex-1 px-3 py-1.5 text-xs font-mono bg-paper border border-warmink/20 focus:border-ink outline-none"
                                />
                                <Button
                                  variant="primary"
                                  onClick={() => saveEdit(ex.id, editField || ex.field || '', editValue)}
                                  disabled={busy || !editValue.trim()}
                                >
                                  Save Fix
                                </Button>
                                <Button variant="ghost" onClick={() => setEditingException(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Manual Edit for exceptions without AI recommendation */}
                          {manualEditException === ex.id && (
                            <div className="p-3 bg-parchment border border-blue-300/40 space-y-2">
                              <label className="block text-2xs uppercase tracking-wider font-mono text-warmink-mute">
                                Manually Edit: {fieldLabels[ex.field || ''] || ex.field || 'Field'}
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={manualEditValue}
                                  onChange={(e) => setManualEditValue(e.target.value)}
                                  placeholder="Enter corrected value…"
                                  className="flex-1 px-3 py-1.5 text-xs font-mono bg-paper border border-warmink/20 focus:border-ink outline-none"
                                />
                                <Button
                                  variant="primary"
                                  onClick={() =>
                                    saveEdit(ex.id, ex.field || '', manualEditValue)
                                  }
                                  disabled={busy || !manualEditValue.trim()}
                                >
                                  Apply Correction
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => setManualEditException(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Direct action buttons for open exceptions */}
                          {isOpen &&
                            editingException !== ex.id &&
                            manualEditException !== ex.id && (
                              <div className="flex items-center gap-2 pt-2 border-t border-warmink/10 flex-wrap">
                                <Button
                                  variant="secondary"
                                  onClick={() => startManualEdit(ex)}
                                  disabled={busy}
                                >
                                  <Pencil className="w-3.5 h-3.5" /> Manual Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => rejectAIRec(ex.id)}
                                  disabled={busy}
                                >
                                  <X className="w-3.5 h-3.5" /> Dismiss Exception
                                </Button>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar Column: Reviewer Decision Panel & Audit */}
        <div className="space-y-6">
          {/* Reviewer Decision & Signing Card */}
          <Card className="border-2 border-warmink/20">
            <CardHeader
              title="Reviewer Loan Decision"
              subtitle="Submit final underwriter decision to approve or reject loan"
            />
            <div className="p-5 space-y-4">
              {verified ? (
                <div className="space-y-3 text-center py-3 bg-verified/10 border border-verified/30 p-4">
                  <VerifiedStamp hash={verified.record_hash} date={verified.verified_at} land />
                  <p className="text-xs text-verified-dark font-semibold">
                    Loan Officially Approved & Sealed
                  </p>
                  <p className="text-3xs font-mono text-warmink-mute">
                    SHA-256 Hash: {verified.record_hash.slice(0, 24)}…
                  </p>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => nav(`/consumer/verified/${loan.loan_id}`)}
                  >
                    <ShieldCheck className="w-4 h-4" /> Open in Consumer Ledger
                  </Button>
                </div>
              ) : loanStatus === 'rejected' ? (
                <div className="space-y-3 text-center py-3 bg-red-50 border border-red-300 p-4">
                  <XCircle className="w-8 h-8 text-red-600 mx-auto" />
                  <p className="text-xs text-red-800 font-semibold">Loan Rejected</p>
                  <p className="text-3xs text-red-700">
                    This loan has been rejected and cannot be approved.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDecision('approved');
                        setDecisionError(null);
                      }}
                      className={cn(
                        'py-3 px-3 border text-xs font-semibold flex items-center justify-center gap-2 transition-all',
                        decision === 'approved'
                          ? 'bg-verified text-paper border-verified ring-2 ring-verified/30'
                          : 'bg-parchment-lighter text-warmink border-warmink/20 hover:border-verified',
                      )}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve Loan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDecision('rejected');
                        setDecisionError(null);
                      }}
                      className={cn(
                        'py-3 px-3 border text-xs font-semibold flex items-center justify-center gap-2 transition-all',
                        decision === 'rejected'
                          ? 'bg-red-700 text-paper border-red-700 ring-2 ring-red-300'
                          : 'bg-parchment-lighter text-warmink border-warmink/20 hover:border-red-600',
                      )}
                    >
                      <XCircle className="w-4 h-4" /> Reject Loan
                    </button>
                  </div>

                  {openExceptions.length > 0 && decision === 'approved' && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 text-amber-900 text-2xs space-y-1">
                      <p className="font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Open Exception
                        Notice:
                      </p>
                      <p>
                        {openExceptions.length} open exception(s) remain. Resolve all exceptions
                        before approving.
                      </p>
                    </div>
                  )}

                  {decisionError && (
                    <div className="p-2.5 bg-red-50 border border-red-300 text-red-900 text-2xs">
                      <p className="font-semibold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-red-700" /> Error:
                      </p>
                      <p>{decisionError}</p>
                    </div>
                  )}

                  {/* Comment Input */}
                  <div>
                    <label className="block text-2xs uppercase tracking-wider font-mono text-warmink-mute mb-1">
                      Reviewer Sign-Off Comment
                    </label>
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add compliance notes or rationale for decision…"
                      className="w-full p-2.5 bg-parchment-light border border-warmink/20 text-xs font-sans text-warmink placeholder:text-warmink-mute/50 focus:border-ink outline-none"
                    />
                  </div>

                  <Button
                    variant="primary"
                    className="w-full py-2.5"
                    onClick={submitDecision}
                    disabled={!decision || busy}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Submit Final Loan Decision
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Audit History Timeline */}
          <Card>
            <CardHeader
              title="Audit Event Timeline"
              subtitle="Chronological event history for this loan asset"
              right={<History className="w-4 h-4 text-warmink-mute" strokeWidth={1.75} />}
            />
            <div className="p-5 max-h-80 overflow-y-auto thin-scroll space-y-3">
              {audit.length === 0 ? (
                <p className="text-2xs text-warmink-mute">No audit events recorded yet.</p>
              ) : (
                <div className="relative border-l-2 border-warmink/20 pl-4 space-y-4">
                  {audit.map((ev, i) => (
                    <div key={i} className="relative text-2xs space-y-0.5">
                      <span className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-warmink" />
                      <div className="flex items-center justify-between font-mono text-warmink-mute">
                        <span className="font-semibold text-warmink uppercase">
                          {ev.event_type}
                        </span>
                        <span>{fmtDateTime(ev.timestamp)}</span>
                      </div>
                      <p className="text-warmink-soft font-sans">{ev.actor}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
