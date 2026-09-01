import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parse } from 'csv-parse/sync';
import { SourceFileType, SourceFileStatus } from '@prisma/client';

@Injectable()
export class IngestionService {
  constructor(private prisma: PrismaService) {}

  async processCsvUpload(
    file: Express.Multer.File,
    fileType: SourceFileType = SourceFileType.loan_tape,
    uploader: string = 'system',
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No CSV file provided for upload.');
    }

    const content = file.buffer.toString('utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const sourceFile = await this.prisma.sourceFile.create({
      data: {
        filename: file.originalname,
        type: fileType,
        uploadedBy: uploader,
        rowCount: records.length,
        status: SourceFileStatus.imported,
      },
    });

    let importedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < records.length; i++) {
      const rawRow = records[i];
      const rowNumber = i + 2;

      // Extract raw values
      const loanId = rawRow.loan_id || rawRow.loanId || rawRow.Loan_ID || null;

      // Save untamed raw record for audit lineage
      await this.prisma.loanRecordRaw.create({
        data: {
          sourceFileId: sourceFile.id,
          rowNumber,
          loanId: loanId ? String(loanId) : null,
          rawPayload: rawRow,
        },
      });

      if (fileType === SourceFileType.loan_tape || !fileType) {
        if (loanId) {
          const origPrincipal = parseFloat(rawRow.original_principal || rawRow.originalPrincipal || '0') || 0;
          const currBal = parseFloat(rawRow.current_balance || rawRow.currentBalance || '0') || 0;
          let rate = parseFloat(rawRow.interest_rate || rawRow.interestRate || '0') || 0;
          if (rate > 1 && rate <= 100) {
            // Normalize percentage if passed as whole integer e.g. 6.25 instead of 0.0625
            rate = rate / 100;
          }

          const term = parseInt(rawRow.term_months || rawRow.termMonths || '360', 10) || 360;
          const dpd = parseInt(rawRow.days_past_due || rawRow.daysPastDue || '0', 10) || 0;

          await this.prisma.loanRecord.upsert({
            where: { loanId: String(loanId) },
            update: {
              borrowerId: String(rawRow.borrower_id || rawRow.borrowerId || 'UNKNOWN'),
              loanType: String(rawRow.loan_type || rawRow.loanType || 'Conventional'),
              originationDate: String(rawRow.origination_date || rawRow.originationDate || ''),
              maturityDate: String(rawRow.maturity_date || rawRow.maturityDate || ''),
              originalPrincipal: origPrincipal,
              currentBalance: currBal,
              interestRate: rate,
              termMonths: term,
              borrowerState: String(rawRow.borrower_state || rawRow.borrowerState || ''),
              paymentStatus: String(rawRow.payment_status || rawRow.paymentStatus || 'Current'),
              daysPastDue: dpd,
              servicerName: String(rawRow.servicer_name || rawRow.servicerName || ''),
              documentStatus: String(rawRow.document_status || rawRow.documentStatus || 'Complete'),
              sourceSystem: String(rawRow.source_system || rawRow.sourceSystem || 'loan_tape'),
            },
            create: {
              loanId: String(loanId),
              borrowerId: String(rawRow.borrower_id || rawRow.borrowerId || 'UNKNOWN'),
              loanType: String(rawRow.loan_type || rawRow.loanType || 'Conventional'),
              originationDate: String(rawRow.origination_date || rawRow.originationDate || ''),
              maturityDate: String(rawRow.maturity_date || rawRow.maturityDate || ''),
              originalPrincipal: origPrincipal,
              currentBalance: currBal,
              interestRate: rate,
              termMonths: term,
              borrowerState: String(rawRow.borrower_state || rawRow.borrowerState || ''),
              paymentStatus: String(rawRow.payment_status || rawRow.paymentStatus || 'Current'),
              daysPastDue: dpd,
              servicerName: String(rawRow.servicer_name || rawRow.servicerName || ''),
              documentStatus: String(rawRow.document_status || rawRow.documentStatus || 'Complete'),
              sourceSystem: String(rawRow.source_system || rawRow.sourceSystem || 'loan_tape'),
            },
          });
          importedCount++;
        } else {
          failedCount++;
        }
      } else {
        importedCount++;
      }
    }

    return {
      id: sourceFile.id,
      filename: sourceFile.filename,
      type: sourceFile.type,
      uploaded_by: sourceFile.uploadedBy,
      uploaded_at: sourceFile.uploadedAt.toISOString(),
      row_count: sourceFile.rowCount,
      imported_count: importedCount,
      failed_count: failedCount,
      status: sourceFile.status,
    };
  }
}
