import type { LoanRecord, VerifiedRecord } from '@/types';

export function loanToCsvRow(l: LoanRecord): string {
  return [
    l.loan_id,
    l.borrower_id,
    l.loan_type,
    l.origination_date,
    l.maturity_date,
    l.original_principal,
    l.current_balance,
    l.interest_rate,
    l.term_months,
    l.borrower_state,
    l.payment_status,
    l.days_past_due,
    `"${l.servicer_name.replace(/"/g, '""')}"`,
    l.document_status,
    `"${l.source_system.replace(/"/g, '""')}"`,
  ].join(',');
}

export const CSV_HEADER =
  'loan_id,borrower_id,loan_type,origination_date,maturity_date,original_principal,current_balance,interest_rate,term_months,borrower_state,payment_status,days_past_due,servicer_name,document_status,source_system';

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSingleVerifiedLoanCsv(record: VerifiedRecord): void {
  const d = record.canonical_data;
  const content = [
    `# Loan Data Verification Copilot - Verified Record`,
    `# Record Hash: ${record.record_hash}`,
    `# Verified At: ${record.verified_at}`,
    `# Verified By: ${record.verified_by}`,
    `# Reviewer Decision: ${record.reviewer_decision}`,
    `# Source File: ${record.source_file_ref}`,
    `# AI Recommendation Ref: ${record.ai_recommendation_ref ?? 'None'}`,
    '',
    CSV_HEADER,
    loanToCsvRow(d),
  ].join('\n');

  downloadCsv(`${record.loan_id}_verified.csv`, content);
}

export function exportAllVerifiedLoansCsv(records: VerifiedRecord[]): void {
  const rows = records.map((r) => loanToCsvRow(r.canonical_data));
  const content = [
    `# Intain Verified Loan Tape Export`,
    `# Exported: ${new Date().toISOString()}`,
    `# Total Verified Records: ${records.length}`,
    '',
    CSV_HEADER,
    ...rows,
  ].join('\n');

  downloadCsv(`verified_loan_tape_${new Date().toISOString().slice(0, 10)}.csv`, content);
}

export const SAMPLE_TAPES = {
  clean: {
    filename: 'tape_2026_clean_conforming.csv',
    content: `${CSV_HEADER}
LN-200301,BR-99011,Conventional,2023-01-15,2053-01-15,450000,432100.00,5.875,360,TX,Current,0,Cascade Servicing,Complete,Encompass
LN-200302,BR-99012,FHA,2023-02-10,2053-02-10,310000,302500.50,5.500,360,FL,Current,0,Heartland Mortgage,Complete,Byte
LN-200303,BR-99013,VA,2023-03-01,2053-03-01,520000,511000.00,5.250,360,VA,Current,0,Cascade Servicing,Complete,Calyx Point
LN-200304,BR-99014,Conventional,2023-04-18,2043-04-18,280000,271900.00,6.125,240,NC,Current,0,Summit Capital,Complete,MortgageCadence
LN-200305,BR-99015,Jumbo,2023-05-20,2053-05-20,950000,942000.00,6.500,360,CA,Current,0,Summit Capital,Complete,Encompass`,
  },
  flagged: {
    filename: 'tape_2026_q3_exceptions_batch.csv',
    content: `${CSV_HEADER}
LN-300401,BR-88101,Conventional,2023-08-15,2053-08-15,400000,435000.00,6.250,360,IL,Current,0,Cascade Servicing,Complete,Encompass
LN-300402,BR-88102,FHA,2023-09-01,2021-09-01,290000,285000.00,5.750,360,OH,Current,0,Heartland Mortgage,Complete,Byte
LN-300403,BR-88103,VA,2023-07-10,2053-07-10,360000,350000.00,18.500,360,GA,Current,0,Cascade Servicing,Pending Review,Calyx Point
LN-300404,BR-88104,Conventional,2023-06-12,2043-06-12,250000,240000.00,6.000,240,AZ,Current,45,Heartland Mortgage,Complete,MortgageCadence
LN-300405,BR-88105,Jumbo,,2053-11-01,880000,875000.00,6.750,360,WA,Current,0,,Complete,Encompass`,
  },
};
