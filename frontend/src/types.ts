export type Role = 'operator' | 'reviewer' | 'consumer';

export type LoanType =
  | 'Conventional'
  | 'FHA'
  | 'VA'
  | 'USDA'
  | 'Jumbo'
  | 'HELOC';

export type PaymentStatus =
  | 'Current'
  | '30 DPD'
  | '60 DPD'
  | '90+ DPD'
  | 'Default';

export type DocumentStatus =
  | 'Complete'
  | 'Missing'
  | 'Pending Review';

export type SourceSystem =
  | 'Encompass'
  | 'Byte'
  | 'Calyx Point'
  | 'MortgageCadence'
  | 'LendingQB';

export interface LoanRecord {
  loan_id: string;
  borrower_id: string;
  loan_type: LoanType;
  origination_date: string;
  maturity_date: string;
  original_principal: number;
  current_balance: number;
  interest_rate: number;
  term_months: number;
  borrower_state: string;
  payment_status: PaymentStatus;
  days_past_due: number;
  servicer_name: string;
  document_status: DocumentStatus;
  source_system: SourceSystem;
}

export type ExceptionSeverity = 'low' | 'medium' | 'high';
export type ExceptionStatus =
  | 'open'
  | 'approved'
  | 'rejected'
  | 'correction_requested';

export type RuleType =
  | 'date_order'
  | 'balance_under_principal'
  | 'rate_in_range'
  | 'term_consistent'
  | 'document_complete'
  | 'dpd_status_match'
  | 'servicer_present';

export interface Exception {
  id: string;
  loan_id: string;
  rule_type: RuleType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  detected_at: string;
  field?: string;
  detail: string;
}

export type AIStatus = 'pending' | 'accepted' | 'rejected' | 'edited';

export interface AIRecommendation {
  id: string;
  exception_id: string;
  prompt: string;
  model: string;
  timestamp: string;
  suggested_correction: string;
  explanation: string;
  status: AIStatus;
}

export type ReviewerDecision =
  | 'approved'
  | 'rejected'
  | 'correction_requested'
  | null;

export interface VerifiedRecord {
  loan_id: string;
  canonical_data: LoanRecord;
  source_file_ref: string;
  validation_result: 'pass' | 'pass_with_notes';
  reviewer_decision: Exclude<ReviewerDecision, null>;
  ai_recommendation_ref: string | null;
  verified_at: string;
  verified_by: string;
  record_hash: string;
}

export type AuditEventType =
  | 'uploaded'
  | 'imported'
  | 'validated'
  | 'exception_created'
  | 'ai_recommendation_generated'
  | 'comment'
  | 'decision'
  | 'verified'
  | 'exported';

export interface AuditEvent {
  event_type: AuditEventType;
  entity_type: 'loan' | 'exception' | 'recommendation' | 'verified';
  entity_id: string;
  actor: string;
  timestamp: string;
  detail?: string;
}

export interface Summary {
  total_loans: number;
  total_exceptions: number;
  open_exceptions: number;
  verified_records: number;
  pending_review: number;
  pass_rate: number;
}

export interface OperatorDashboard {
  recent_imports: ImportEvent[];
  validation: { pass: number; fail: number; flagged: number };
  needs_correction: { loan_id: string; rule_type: RuleType; severity: ExceptionSeverity }[];
}

export interface ImportEvent {
  id: string;
  file_name: string;
  source_system: SourceSystem;
  uploaded_at: string;
  rows_imported: number;
  rows_failed: number;
  rows_flagged: number;
  status: 'parsed' | 'failed';
  failed_rows?: { row: number; loan_id: string | null; reason: string }[];
}

export interface ReviewerDashboard {
  by_severity: { high: number; medium: number; low: number };
  pending_decisions: number;
  recent_decisions: {
    loan_id: string;
    decision: Exclude<ReviewerDecision, null>;
    actor: string;
    at: string;
  }[];
  ai_summary: string;
}

export interface ConsumerDashboard {
  verified_count: number;
  data_quality_score: number;
  verification_history: { loan_id: string; verified_at: string; verified_by: string }[];
}

export interface LoanDetail {
  loan: LoanRecord;
  exceptions: Exception[];
  recommendations: AIRecommendation[];
  comments: { id: string; author: string; text: string; at: string }[];
  audit: AuditEvent[];
  verified: VerifiedRecord | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  organization?: string;
  token?: string;
}

export interface AuthCredentials {
  email: string;
  password?: string;
  role: Role;
}

export interface RegisterData {
  name: string;
  email: string;
  password?: string;
  role: Role;
  organization?: string;
}
