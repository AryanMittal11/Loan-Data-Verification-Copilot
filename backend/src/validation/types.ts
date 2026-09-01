export interface RuleContext {
  sourceFileId?: string;
  allRecords: any[];
  rawByLoanId: Map<string, any[]>;
  crossFileByLoanId: Map<string, any>;
  now: Date;
  config: any;
}

export interface RuleFailure {
  ruleCode: string;
  loanId: string;
  severity: 'low' | 'medium' | 'high';
  field?: string;
  detail: string;
}

export type RuleFn = (record: any, ctx: RuleContext) => RuleFailure | RuleFailure[] | null;
