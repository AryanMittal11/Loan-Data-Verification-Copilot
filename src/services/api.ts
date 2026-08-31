import {
  loans,
  exceptions,
  recommendations,
  verifiedRecords,
  auditByLoan,
  importEvents,
  summary,
  operatorDashboard,
  reviewerDashboard,
  consumerDashboard,
} from '../mockData';
import type {
  LoanRecord,
  Exception,
  AIRecommendation,
  VerifiedRecord,
  AuditEvent,
  Summary,
  OperatorDashboard,
  ReviewerDashboard,
  ConsumerDashboard,
  ImportEvent,
  ExceptionStatus,
  ReviewerDecision,
  SourceSystem,
  LoanType,
  PaymentStatus,
  DocumentStatus,
} from '../types';

const BASE = import.meta.env.VITE_API_BASE ?? '';
const LATENCY = 180;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY));
}

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  if (!BASE) return delay(structuredCloneSafe(fallback));
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as T;
  } catch {
    return delay(structuredCloneSafe(fallback));
  }
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export const api = {
  getLoans: () => fetchJson<LoanRecord[]>('/loans', loans),
  getLoan: (id: string) =>
    fetchJson<LoanRecord | null>(`/loans/${id}`, loans.find((l) => l.loan_id === id) ?? null),
  getExceptions: () => fetchJson<Exception[]>('/exceptions', exceptions),
  getRecommendations: () => fetchJson<AIRecommendation[]>('/ai/recommendations', recommendations),
  getVerifiedLoans: () => fetchJson<VerifiedRecord[]>('/verified-loans', verifiedRecords),
  getVerifiedLoan: (id: string) =>
    fetchJson<VerifiedRecord | null>(
      `/verified-loans/${id}`,
      verifiedRecords.find((v) => v.loan_id === id) ?? null,
    ),
  getAudit: (loanId: string) =>
    fetchJson<AuditEvent[]>(`/audit/${loanId}`, auditByLoan[loanId] ?? []),
  getSummary: () => fetchJson<Summary>('/summary', summary),
  getOperatorDashboard: () =>
    fetchJson<OperatorDashboard>('/dashboard/operator', operatorDashboard),
  getReviewerDashboard: () =>
    fetchJson<ReviewerDashboard>('/dashboard/reviewer', reviewerDashboard),
  getConsumerDashboard: () =>
    fetchJson<ConsumerDashboard>('/dashboard/consumer', consumerDashboard),
  getImportEvents: () => fetchJson<ImportEvent[]>('/imports', importEvents),

  postExceptionDecision: async (id: string, status: ExceptionStatus, actor: string, comment?: string) => {
    const ex = exceptions.find((e) => e.id === id);
    if (ex) {
      ex.status = status;
      if (!auditByLoan[ex.loan_id]) auditByLoan[ex.loan_id] = [];
      auditByLoan[ex.loan_id].push({
        event_type: 'decision',
        entity_type: 'exception',
        entity_id: id,
        actor,
        timestamp: new Date().toISOString(),
        detail: `Exception ${status}${comment ? ` — ${comment}` : ''}`,
      });
      // update reviewer dashboard recent decisions
      reviewerDashboard.recent_decisions.unshift({
        loan_id: ex.loan_id,
        decision: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'correction_requested',
        actor,
        at: new Date().toISOString(),
      });
      if (reviewerDashboard.recent_decisions.length > 8) {
        reviewerDashboard.recent_decisions.pop();
      }
      reviewerDashboard.pending_decisions = exceptions.filter((e) => e.status === 'open').length;
    }
    return delay({ ok: true });
  },

  postAIAction: async (id: string, action: 'accept' | 'reject' | 'edit', edited?: string) => {
    const rec = recommendations.find((r) => r.id === id);
    if (rec) {
      rec.status = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'edited';
      if (action === 'edit' && edited) rec.suggested_correction = edited;

      const ex = exceptions.find((e) => e.id === rec.exception_id);
      if (ex && (action === 'accept' || action === 'edit')) {
        const textToApply = action === 'edit' && edited ? edited : rec.suggested_correction;
        const targetLoan = loans.find((l) => l.loan_id === ex.loan_id);
        if (targetLoan) {
          // Parse common field fix hints if applicable
          if (ex.field === 'interest_rate' && textToApply.includes('%')) {
            const num = parseFloat(textToApply.replace(/[^0-9.]/g, ''));
            if (!isNaN(num) && num > 0 && num < 25) targetLoan.interest_rate = num;
          } else if (ex.field === 'current_balance' && textToApply.includes('$')) {
            const num = parseFloat(textToApply.replace(/[^0-9.]/g, ''));
            if (!isNaN(num) && num > 0) targetLoan.current_balance = num;
          } else if (ex.field === 'servicer_name') {
            targetLoan.servicer_name = 'Cascade Servicing';
          }
        }
      }
    }
    return delay({ ok: true });
  },

  requestAIRec: async (loanId: string, exceptionId: string): Promise<AIRecommendation> => {
    const ex = exceptions.find((e) => e.id === exceptionId);
    const loan = loans.find((l) => l.loan_id === loanId);
    
    let explanation = `Validation rule '${ex?.rule_type ?? 'general'}' detected an anomaly in loan ${loanId}.`;
    let suggested = `Review origination tape documentation and confirm matching ledger values.`;
    
    if (ex?.field === 'interest_rate' || ex?.rule_type === 'rate_in_range') {
      explanation = `The reported interest rate (${loan?.interest_rate}%) is abnormally high for a conventional product and likely represents a misplaced decimal or typing error.`;
      suggested = `Adjust interest rate to 6.250% based on standard rate schedule for this origination window.`;
    } else if (ex?.field === 'current_balance' || ex?.rule_type === 'balance_under_principal') {
      explanation = `The current balance ($${loan?.current_balance?.toLocaleString()}) exceeds the original principal ($${loan?.original_principal?.toLocaleString()}), violating amortized balance constraints without documented negative amortization.`;
      suggested = `Recalculate balance using 36-month amortization schedule to $${((loan?.original_principal ?? 400000) * 0.96).toFixed(2)}.`;
    } else if (ex?.field === 'maturity_date' || ex?.rule_type === 'date_order') {
      explanation = `The maturity date is earlier than or inconsistent with the origination date and loan term.`;
      suggested = `Set maturity date exactly 360 months post-origination to 2053-09-01.`;
    } else if (ex?.field === 'servicer_name' || ex?.rule_type === 'servicer_present') {
      explanation = `Servicer name is blank on tape import.`;
      suggested = `Assign default primary master servicer 'Cascade Servicing' per loan tape metadata.`;
    }

    const newRec: AIRecommendation = {
      id: `REC-${Date.now().toString().slice(-6)}`,
      exception_id: exceptionId,
      prompt: `Analyze failure '${ex?.detail ?? ''}' on loan ${loanId}`,
      model: 'claude-3-5-sonnet',
      timestamp: new Date().toISOString(),
      suggested_correction: suggested,
      explanation,
      status: 'pending',
    };

    recommendations.push(newRec);
    if (!auditByLoan[loanId]) auditByLoan[loanId] = [];
    auditByLoan[loanId].push({
      event_type: 'ai_recommendation_generated',
      entity_type: 'recommendation',
      entity_id: newRec.id,
      actor: 'claude-3-5-sonnet',
      timestamp: newRec.timestamp,
      detail: `AI suggested fix: ${suggested}`,
    });

    return delay(newRec);
  },

  verifyRecord: async (
    loanId: string,
    actor: string,
    decision: Exclude<ReviewerDecision, null>,
    aiRef: string | null,
  ) => {
    const loan = loans.find((l) => l.loan_id === loanId);
    if (loan && !verifiedRecords.find((v) => v.loan_id === loanId)) {
      const hash =
        '0x' +
        Array.from(crypto.getRandomValues(new Uint8Array(20)))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      const rec: VerifiedRecord = {
        loan_id: loanId,
        canonical_data: structuredCloneSafe(loan),
        source_file_ref: 'tape_2026_08_encompass.csv',
        validation_result: 'pass',
        reviewer_decision: decision,
        ai_recommendation_ref: aiRef,
        verified_at: new Date().toISOString(),
        verified_by: actor,
        record_hash: hash,
      };
      verifiedRecords.unshift(rec);
      if (!auditByLoan[loanId]) auditByLoan[loanId] = [];
      auditByLoan[loanId].push({
        event_type: 'verified',
        entity_type: 'verified',
        entity_id: loanId,
        actor,
        timestamp: rec.verified_at,
        detail: `Record verified — hash ${hash.slice(0, 18)}…`,
      });
      // update consumer dashboard history
      consumerDashboard.verified_count = verifiedRecords.length;
      consumerDashboard.verification_history.unshift({
        loan_id: loanId,
        verified_at: rec.verified_at,
        verified_by: actor,
      });
      if (consumerDashboard.verification_history.length > 8) {
        consumerDashboard.verification_history.pop();
      }
      return delay(rec);
    }
    const existing = verifiedRecords.find((v) => v.loan_id === loanId);
    return delay(existing ?? null);
  },

  addComment: async (loanId: string, author: string, text: string) => {
    if (!auditByLoan[loanId]) auditByLoan[loanId] = [];
    auditByLoan[loanId].push({
      event_type: 'comment',
      entity_type: 'loan',
      entity_id: loanId,
      actor: author,
      timestamp: new Date().toISOString(),
      detail: text,
    });
    return delay({ ok: true });
  },

  exportRecord: async (loanId: string, actor: string) => {
    if (!auditByLoan[loanId]) auditByLoan[loanId] = [];
    auditByLoan[loanId].push({
      event_type: 'exported',
      entity_type: 'verified',
      entity_id: loanId,
      actor,
      timestamp: new Date().toISOString(),
      detail: 'Record exported as CSV',
    });
    return delay({ ok: true });
  },

  importCsvTape: async (
    fileName: string,
    sourceSystem: SourceSystem,
    csvContent: string,
    actor: string,
  ): Promise<ImportEvent> => {
    const lines = csvContent.trim().split(/\r?\n/).filter((l) => l.trim().length > 0 && !l.startsWith('#'));
    const rows = lines.length > 1 ? lines.slice(1) : [];

    let importedCount = 0;
    let flaggedCount = 0;
    let failedCount = 0;
    const failedRowsList: { row: number; loan_id: string | null; reason: string }[] = [];

    const now = new Date().toISOString();

    rows.forEach((line, idx) => {
      const rowNum = idx + 2;
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 10) {
        failedCount++;
        failedRowsList.push({
          row: rowNum,
          loan_id: cols[0] || null,
          reason: 'Missing required column structure',
        });
        return;
      }

      const [
        loan_id,
        borrower_id,
        loan_type,
        origination_date,
        maturity_date,
        original_principal,
        current_balance,
        interest_rate,
        term_months,
        borrower_state,
        payment_status,
        days_past_due,
        servicer_name,
        document_status,
      ] = cols;

      if (!loan_id || !borrower_id) {
        failedCount++;
        failedRowsList.push({
          row: rowNum,
          loan_id: loan_id || null,
          reason: 'loan_id or borrower_id is empty',
        });
        return;
      }

      const principal = parseFloat(original_principal) || 0;
      const balance = parseFloat(current_balance) || 0;
      const rate = parseFloat(interest_rate) || 0;
      const term = parseInt(term_months, 10) || 360;
      const dpd = parseInt(days_past_due, 10) || 0;

      const newLoan: LoanRecord = {
        loan_id,
        borrower_id,
        loan_type: (loan_type as LoanType) || 'Conventional',
        origination_date: origination_date || '2023-01-01',
        maturity_date: maturity_date || '2053-01-01',
        original_principal: principal,
        current_balance: balance,
        interest_rate: rate,
        term_months: term,
        borrower_state: borrower_state || 'TX',
        payment_status: (payment_status as PaymentStatus) || 'Current',
        days_past_due: dpd,
        servicer_name: servicer_name || 'Cascade Servicing',
        document_status: (document_status as DocumentStatus) || 'Complete',
        source_system: sourceSystem,
      };

      // Check if already in list
      if (!loans.find((l) => l.loan_id === loan_id)) {
        loans.push(newLoan);
      }

      importedCount++;

      // Initialize audit trail for this loan
      if (!auditByLoan[loan_id]) auditByLoan[loan_id] = [];
      auditByLoan[loan_id].push({
        event_type: 'uploaded',
        entity_type: 'loan',
        entity_id: loan_id,
        actor,
        timestamp: now,
        detail: `Loan tape file '${fileName}' received from ${sourceSystem}`,
      });
      auditByLoan[loan_id].push({
        event_type: 'imported',
        entity_type: 'loan',
        entity_id: loan_id,
        actor,
        timestamp: now,
        detail: `Row parsed: Principal $${principal.toLocaleString()}, balance $${balance.toLocaleString()}`,
      });

      // Business rule validation
      let hasException = false;

      if (balance > principal && principal > 0) {
        hasException = true;
        const exId = `EX-VAL-${Date.now().toString().slice(-4)}${idx}`;
        exceptions.push({
          id: exId,
          loan_id,
          rule_type: 'balance_under_principal',
          severity: 'high',
          status: 'open',
          detected_at: now,
          field: 'current_balance',
          detail: `Current balance ($${balance.toLocaleString()}) exceeds original principal ($${principal.toLocaleString()}).`,
        });
        recommendations.push({
          id: `REC-${Date.now().toString().slice(-4)}${idx}`,
          exception_id: exId,
          prompt: `Analyze balance exceeding principal on ${loan_id}`,
          model: 'claude-3-5-sonnet',
          timestamp: now,
          suggested_correction: `Recalculate balance to $${(principal * 0.95).toFixed(2)} based on regular monthly amortization.`,
          explanation: `Amortized loan balance cannot increase unless negative amortization is contracted.`,
          status: 'pending',
        });
        auditByLoan[loan_id].push({
          event_type: 'exception_created',
          entity_type: 'exception',
          entity_id: exId,
          actor: 'Validation Engine',
          timestamp: now,
          detail: `Rule balance_under_principal failed.`,
        });
      }

      if (rate > 15 || rate <= 0) {
        hasException = true;
        const exId = `EX-VAL-${Date.now().toString().slice(-4)}${idx}R`;
        exceptions.push({
          id: exId,
          loan_id,
          rule_type: 'rate_in_range',
          severity: 'high',
          status: 'open',
          detected_at: now,
          field: 'interest_rate',
          detail: `Interest rate (${rate}%) is outside valid conforming lending range [1.0% - 15.0%].`,
        });
        recommendations.push({
          id: `REC-${Date.now().toString().slice(-4)}${idx}R`,
          exception_id: exId,
          prompt: `Analyze interest rate outlier on ${loan_id}`,
          model: 'claude-3-5-sonnet',
          timestamp: now,
          suggested_correction: `Adjust interest rate to 6.125% per matching note index.`,
          explanation: `Interest rate appears entered with misplaced decimal point.`,
          status: 'pending',
        });
        auditByLoan[loan_id].push({
          event_type: 'exception_created',
          entity_type: 'exception',
          entity_id: exId,
          actor: 'Validation Engine',
          timestamp: now,
          detail: `Rule rate_in_range failed.`,
        });
      }

      if (hasException) {
        flaggedCount++;
      } else {
        auditByLoan[loan_id].push({
          event_type: 'validated',
          entity_type: 'loan',
          entity_id: loan_id,
          actor: 'Validation Engine',
          timestamp: now,
          detail: 'All automated validation checks passed cleanly.',
        });
      }
    });

    const event: ImportEvent = {
      id: `IMP-${Date.now().toString().slice(-6)}`,
      file_name: fileName,
      source_system: sourceSystem,
      uploaded_at: now,
      rows_imported: importedCount,
      rows_failed: failedCount,
      rows_flagged: flaggedCount,
      status: failedCount > 0 && importedCount === 0 ? 'failed' : 'parsed',
      failed_rows: failedRowsList,
    };

    importEvents.unshift(event);

    // Update operator dashboard
    operatorDashboard.validation.pass += importedCount - flaggedCount;
    operatorDashboard.validation.flagged += flaggedCount;
    operatorDashboard.validation.fail += failedCount;
    operatorDashboard.recent_imports.unshift(event);

    // Update reviewer dashboard
    reviewerDashboard.pending_decisions = exceptions.filter((e) => e.status === 'open').length;
    reviewerDashboard.by_severity.high = exceptions.filter((e) => e.severity === 'high' && e.status === 'open').length;
    reviewerDashboard.by_severity.medium = exceptions.filter((e) => e.severity === 'medium' && e.status === 'open').length;
    reviewerDashboard.by_severity.low = exceptions.filter((e) => e.severity === 'low' && e.status === 'open').length;

    return delay(event);
  },
};

export type ApiService = typeof api;
