import { RuleContext, RuleFailure, RuleFn } from './types';

export const ruleRegistry: Record<string, RuleFn> = {
  REQUIRED_FIELDS: (record: any, ctx: RuleContext): RuleFailure | null => {
    const required = ctx.config?.requiredFields || ['loan_id', 'borrower_id', 'original_principal'];
    for (const field of required) {
      const val = record[field] ?? record[toCamel(field)];
      if (val === undefined || val === null || val === '') {
        return {
          ruleCode: 'REQUIRED_FIELDS',
          loanId: record.loanId || record.loan_id,
          severity: 'high',
          field,
          detail: `Required field '${field}' is missing or blank.`,
        };
      }
    }
    return null;
  },

  DATE_FORMAT_LOGIC: (record: any, ctx: RuleContext): RuleFailure | null => {
    const orig = record.originationDate || record.origination_date;
    const mat = record.maturityDate || record.maturity_date;

    if (!orig || isNaN(Date.parse(orig))) {
      return {
        ruleCode: 'DATE_FORMAT_LOGIC',
        loanId: record.loanId || record.loan_id,
        severity: 'high',
        field: 'origination_date',
        detail: `Origination date '${orig}' is invalid or unparseable.`,
      };
    }

    if (mat && !isNaN(Date.parse(mat))) {
      if (new Date(mat) <= new Date(orig)) {
        return {
          ruleCode: 'DATE_FORMAT_LOGIC',
          loanId: record.loanId || record.loan_id,
          severity: 'high',
          field: 'maturity_date',
          detail: `Maturity date (${mat}) must be later than origination date (${orig}).`,
        };
      }
    }
    return null;
  },

  NUMERIC_RANGE: (record: any, ctx: RuleContext): RuleFailure[] => {
    const failures: RuleFailure[] = [];
    const loanId = record.loanId || record.loan_id;
    const principal = record.originalPrincipal ?? record.original_principal ?? 0;
    const balance = record.currentBalance ?? record.current_balance ?? 0;
    const rate = record.interestRate ?? record.interest_rate ?? 0;

    if (principal < 0) {
      failures.push({
        ruleCode: 'NUMERIC_RANGE',
        loanId,
        severity: 'high',
        field: 'original_principal',
        detail: `Original principal ($${principal}) cannot be negative.`,
      });
    }

    if (balance < 0) {
      failures.push({
        ruleCode: 'NUMERIC_RANGE',
        loanId,
        severity: 'high',
        field: 'current_balance',
        detail: `Current balance ($${balance}) cannot be negative.`,
      });
    }

    if (!ctx.config?.allowBalanceExceedingPrincipal && balance > principal && principal > 0) {
      failures.push({
        ruleCode: 'NUMERIC_RANGE',
        loanId,
        severity: 'high',
        field: 'current_balance',
        detail: `Current balance ($${balance.toLocaleString()}) exceeds original principal ($${principal.toLocaleString()}).`,
      });
    }

    const minRate = ctx.config?.interestRate?.min ?? 0.01;
    const maxRate = ctx.config?.interestRate?.max ?? 0.25;
    if (rate <= minRate || rate > maxRate) {
      failures.push({
        ruleCode: 'NUMERIC_RANGE',
        loanId,
        severity: 'high',
        field: 'interest_rate',
        detail: `Interest rate (${(rate * 100).toFixed(2)}%) is outside allowed range [${(minRate * 100)}% - ${(maxRate * 100)}%].`,
      });
    }

    return failures;
  },

  ENUM_LOOKUP: (record: any, ctx: RuleContext): RuleFailure | null => {
    const loanId = record.loanId || record.loan_id;
    const state = record.borrowerState || record.borrower_state;
    const allowedStates = ctx.config?.allowedStates || [];

    if (state && allowedStates.length > 0 && !allowedStates.includes(state)) {
      return {
        ruleCode: 'ENUM_LOOKUP',
        loanId,
        severity: 'medium',
        field: 'borrower_state',
        detail: `Borrower state '${state}' is invalid or outside allowed US state codes.`,
      };
    }
    return null;
  },

  DUPLICATE_LOAN_ID: (record: any, ctx: RuleContext): RuleFailure | null => {
    const loanId = record.loanId || record.loan_id;
    if (!loanId) return null;
    const matches = ctx.allRecords.filter((r) => (r.loanId || r.loan_id) === loanId);
    if (matches.length > 1) {
      return {
        ruleCode: 'DUPLICATE_LOAN_ID',
        loanId,
        severity: 'high',
        field: 'loan_id',
        detail: `Loan ID '${loanId}' appears ${matches.length} times in the ingested dataset.`,
      };
    }
    return null;
  },

  DUPLICATE_BORROWER_SIGNATURE: (record: any, ctx: RuleContext): RuleFailure | null => {
    const loanId = record.loanId || record.loan_id;
    const borrowerId = record.borrowerId || record.borrower_id;
    const principal = record.originalPrincipal ?? record.original_principal;
    const origDate = record.originationDate || record.origination_date;

    if (!borrowerId || !principal || !origDate) return null;

    const matches = ctx.allRecords.filter(
      (r) =>
        (r.borrowerId || r.borrower_id) === borrowerId &&
        (r.originalPrincipal ?? r.original_principal) === principal &&
        (r.originationDate || r.origination_date) === origDate,
    );

    if (matches.length > 1) {
      return {
        ruleCode: 'DUPLICATE_BORROWER_SIGNATURE',
        loanId,
        severity: 'high',
        field: 'borrower_id',
        detail: `Suspicious duplicate borrower signature found: Same borrower (${borrowerId}), principal ($${principal}), and origination date (${origDate}).`,
      };
    }
    return null;
  },

  CROSS_FILE_CONFLICT: (record: any, ctx: RuleContext): RuleFailure | null => {
    const loanId = record.loanId || record.loan_id;
    const servicerData = ctx.crossFileByLoanId?.get(loanId);

    if (servicerData) {
      const balance = record.currentBalance ?? record.current_balance;
      const servicerBalance = servicerData.current_balance ?? servicerData.currentBalance;
      if (servicerBalance !== undefined && Math.abs(balance - servicerBalance) > 0.01) {
        return {
          ruleCode: 'CROSS_FILE_CONFLICT',
          loanId,
          severity: 'high',
          field: 'current_balance',
          detail: `Loan tape balance ($${balance}) disagrees with servicer update balance ($${servicerBalance}).`,
        };
      }
    }
    return null;
  },

  STALE_RECORD: (record: any, ctx: RuleContext): RuleFailure | null => {
    const loanId = record.loanId || record.loan_id;
    const updatedAt = record.updatedAt || record.updated_at;
    if (updatedAt) {
      const ageDays = (ctx.now.getTime() - new Date(updatedAt).getTime()) / (1000 * 3600 * 24);
      const maxAge = ctx.config?.maxAgeDays || 180;
      if (ageDays > maxAge) {
        return {
          ruleCode: 'STALE_RECORD',
          loanId,
          severity: 'low',
          field: 'updated_at',
          detail: `Record last updated ${Math.round(ageDays)} days ago, exceeding freshness threshold of ${maxAge} days.`,
        };
      }
    }
    return null;
  },

  STATUS_CONSISTENCY: (record: any, ctx: RuleContext): RuleFailure | null => {
    const loanId = record.loanId || record.loan_id;
    const paymentStatus = record.paymentStatus || record.payment_status;
    const dpd = record.daysPastDue ?? record.days_past_due ?? 0;
    const balance = record.currentBalance ?? record.current_balance ?? 0;

    if (paymentStatus === 'Current' && dpd > 30) {
      return {
        ruleCode: 'STATUS_CONSISTENCY',
        loanId,
        severity: 'high',
        field: 'payment_status',
        detail: `Payment status is 'Current' but Days Past Due is ${dpd}.`,
      };
    }

    if ((paymentStatus === 'Paid Off' || paymentStatus === 'Closed') && balance > 0) {
      return {
        ruleCode: 'STATUS_CONSISTENCY',
        loanId,
        severity: 'high',
        field: 'current_balance',
        detail: `Loan status is '${paymentStatus}' but current balance remains positive ($${balance}).`,
      };
    }
    return null;
  },

  DOCUMENT_STATUS: (record: any, ctx: RuleContext): RuleFailure | null => {
    const loanId = record.loanId || record.loan_id;
    const docStatus = record.documentStatus || record.document_status;
    const allowed = ctx.config?.allowedDocumentStatuses || ['Complete'];

    if (!docStatus || !allowed.includes(docStatus)) {
      return {
        ruleCode: 'DOCUMENT_STATUS',
        loanId,
        severity: 'medium',
        field: 'document_status',
        detail: `Document status '${docStatus || 'Missing'}' is not complete.`,
      };
    }
    return null;
  },
};

function toCamel(str: string): string {
  return str.replace(/([-_][a-z])/gi, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
}
