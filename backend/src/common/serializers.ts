export function serializeLoanRecord(loan: any) {
  if (!loan) return null;
  return {
    loan_id: loan.loanId,
    borrower_id: loan.borrowerId,
    loan_type: loan.loanType,
    origination_date: loan.originationDate,
    maturity_date: loan.maturityDate,
    original_principal: loan.originalPrincipal,
    current_balance: loan.currentBalance,
    interest_rate: loan.interestRate,
    term_months: loan.termMonths,
    borrower_state: loan.borrowerState,
    payment_status: loan.paymentStatus,
    days_past_due: loan.daysPastDue,
    servicer_name: loan.servicerName,
    document_status: loan.documentStatus,
    source_system: loan.sourceSystem,
  };
}

export function serializeException(ex: any) {
  if (!ex) return null;
  return {
    id: ex.id,
    loan_id: ex.loanId,
    rule_type: ex.ruleType,
    severity: ex.severity,
    status: ex.status,
    detected_at: ex.detectedAt instanceof Date ? ex.detectedAt.toISOString() : ex.detectedAt,
    field: ex.field || undefined,
    detail: ex.detail,
  };
}

export function serializeAIRecommendation(rec: any) {
  if (!rec) return null;
  return {
    id: rec.id,
    exception_id: rec.exceptionId,
    prompt: rec.prompt,
    model: rec.model,
    timestamp: rec.timestamp instanceof Date ? rec.timestamp.toISOString() : rec.timestamp,
    suggested_correction: rec.suggestedCorrection,
    explanation: rec.explanation || undefined,
    status: rec.status,
  };
}

export function serializeVerifiedRecord(v: any) {
  if (!v) return null;
  return {
    loan_id: v.loanId,
    canonical_data: typeof v.canonicalData === 'string' ? JSON.parse(v.canonicalData) : v.canonicalData,
    source_file_ref: v.sourceFileRef,
    validation_result: typeof v.validationResult === 'string' ? JSON.parse(v.validationResult) : v.validationResult,
    reviewer_decision: v.reviewerDecision,
    ai_recommendation_ref: v.aiRecommendationRef || null,
    verified_at: v.verifiedAt instanceof Date ? v.verifiedAt.toISOString() : v.verifiedAt,
    verified_by: v.verifiedBy,
    record_hash: v.recordHash,
  };
}

export function serializeAuditEvent(evt: any) {
  if (!evt) return null;
  return {
    event_type: evt.eventType,
    entity_type: evt.entityType,
    entity_id: evt.entityId,
    actor: evt.actor,
    timestamp: evt.timestamp instanceof Date ? evt.timestamp.toISOString() : evt.timestamp,
    metadata: evt.metadata ? (typeof evt.metadata === 'string' ? JSON.parse(evt.metadata) : evt.metadata) : undefined,
  };
}
