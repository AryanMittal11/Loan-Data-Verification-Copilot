import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExceptionStatus } from '@prisma/client';
import {
  serializeException,
  serializeLoanRecord,
  serializeAIRecommendation,
} from '../common/serializers';
import { ValidationService } from '../validation/validation.service';
import { VerifiedRecordsService } from '../verified-records/verified-records.service';

@Injectable()
export class ExceptionsService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
    private verifiedRecordsService: VerifiedRecordsService,
  ) {}

  async getQueue(filters?: { status?: string; severity?: string; ruleType?: string; search?: string }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status as ExceptionStatus;
    }

    if (filters?.severity) {
      where.severity = filters.severity;
    }

    if (filters?.ruleType) {
      where.ruleType = filters.ruleType;
    }

    if (filters?.search) {
      where.OR = [
        { loanId: { contains: filters.search, mode: 'insensitive' } },
        { detail: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const exceptions = await this.prisma.exception.findMany({
      where,
      orderBy: { detectedAt: 'desc' },
      include: {
        loan: true,
        recommendations: true,
      },
    });

    return exceptions.map((ex) => ({
      ...serializeException(ex),
      loan: serializeLoanRecord(ex.loan),
      recommendations: ex.recommendations.map(serializeAIRecommendation),
    }));
  }

  async getDetail(id: string) {
    const ex = await this.prisma.exception.findUnique({
      where: { id },
      include: {
        loan: true,
        recommendations: true,
        reviewActions: true,
      },
    });

    if (!ex) {
      throw new NotFoundException(`Exception with ID ${id} not found.`);
    }

    const auditEvents = await this.prisma.auditEvent.findMany({
      where: { entityId: ex.loanId },
      orderBy: { timestamp: 'asc' },
    });

    return {
      exception: serializeException(ex),
      loan: serializeLoanRecord(ex.loan),
      recommendations: ex.recommendations.map(serializeAIRecommendation),
      actions: ex.reviewActions,
      audit: auditEvents,
    };
  }

  async accept(id: string, aiRecommendationId?: string, comment?: string, actor: string = 'reviewer') {
    const ex = await this.prisma.exception.findUnique({
      where: { id },
      include: { loan: true, recommendations: true },
    });

    if (!ex) throw new NotFoundException(`Exception ${id} not found.`);

    let targetRec = null;
    if (aiRecommendationId) {
      targetRec = ex.recommendations.find((r) => r.id === aiRecommendationId);
    } else if (ex.recommendations.length > 0) {
      targetRec = ex.recommendations[ex.recommendations.length - 1];
    }

    // Apply correction ONLY to the target field of this exception
    await this.applyCorrectionToLoan(ex.loanId, ex.field, ex.ruleType, targetRec?.suggestedCorrection);

    if (targetRec) {
      await this.prisma.aIRecommendation.update({
        where: { id: targetRec.id },
        data: { status: 'accepted' },
      });
    }

    await this.prisma.exception.update({
      where: { id },
      data: { status: ExceptionStatus.approved },
    });

    await this.prisma.reviewAction.create({
      data: {
        exceptionId: id,
        reviewerId: actor,
        action: 'accept',
        comment: comment || 'Accepted AI recommendation',
      },
    });

    // Re-run validation to update exception statuses
    await this.validationService.runValidation();

    return { ok: true, message: `Exception ${id} accepted and canonical data updated.` };
  }

  async edit(id: string, field: string, value: any, comment?: string, actor: string = 'reviewer') {
    const ex = await this.prisma.exception.findUnique({ where: { id } });
    if (!ex) throw new NotFoundException(`Exception ${id} not found.`);

    const targetField = field || ex.field;
    if (!targetField) {
      throw new BadRequestException('Target field for edit must be specified.');
    }

    await this.applyCorrectionToLoan(ex.loanId, targetField, ex.ruleType, String(value));

    await this.prisma.exception.update({
      where: { id },
      data: { status: ExceptionStatus.corrected },
    });

    await this.prisma.reviewAction.create({
      data: {
        exceptionId: id,
        reviewerId: actor,
        action: 'edit',
        comment: comment || `Edited field ${targetField} to ${value}`,
        editedFields: { [targetField]: value },
      },
    });

    await this.validationService.runValidation();

    return { ok: true, message: `Field ${targetField} on loan ${ex.loanId} edited successfully.` };
  }

  async reject(id: string, comment?: string, actor: string = 'reviewer') {
    const ex = await this.prisma.exception.findUnique({ where: { id } });
    if (!ex) throw new NotFoundException(`Exception ${id} not found.`);

    await this.prisma.exception.update({
      where: { id },
      data: { status: ExceptionStatus.rejected },
    });

    await this.prisma.reviewAction.create({
      data: {
        exceptionId: id,
        reviewerId: actor,
        action: 'reject',
        comment: comment || 'Rejected exception',
      },
    });

    return { ok: true, message: `Exception ${id} rejected.` };
  }

  async addComment(id: string, comment: string, actor: string = 'reviewer') {
    const ex = await this.prisma.exception.findUnique({ where: { id } });
    if (!ex) throw new NotFoundException(`Exception ${id} not found.`);

    await this.prisma.reviewAction.create({
      data: {
        exceptionId: id,
        reviewerId: actor,
        action: 'comment',
        comment,
      },
    });

    return { ok: true, message: 'Comment added.' };
  }

  async loanDecision(loanId: string, decision: 'approved' | 'rejected', actor: string = 'reviewer') {
    const loan = await this.prisma.loanRecord.findUnique({ where: { loanId } });
    if (!loan) throw new NotFoundException(`Loan ${loanId} not found.`);

    if (decision === 'approved') {
      const openExceptions = await this.prisma.exception.findMany({
        where: { loanId, status: ExceptionStatus.open },
      });
      if (openExceptions.length > 0) {
        throw new BadRequestException(
          `Cannot approve loan ${loanId}: ${openExceptions.length} open exception(s) remain unresolved. Please resolve or reject exceptions first.`,
        );
      }

      await this.prisma.loanRecord.update({
        where: { loanId },
        data: { status: 'approved' },
      });

      // Create VerifiedRecord ONLY when loan decision is explicitly approved by Reviewer!
      const verified = await this.verifiedRecordsService.createVerifiedRecord(loanId, actor);
      return { ok: true, loan_id: loanId, decision: 'approved', verified_record: verified };
    } else {
      await this.prisma.loanRecord.update({
        where: { loanId },
        data: { status: 'rejected' },
      });
      return { ok: true, loan_id: loanId, decision: 'rejected' };
    }
  }

  private async applyCorrectionToLoan(loanId: string, field: string | null, ruleType?: string, textVal?: string) {
    if (!textVal) return;
    const updateData: any = {};
    const cleanText = textVal.trim();
    const targetField = field ? field.trim().toLowerCase() : null;

    if (targetField === 'interest_rate' || targetField === 'interestrate') {
      const num = parseFloat(cleanText.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) updateData.interestRate = num > 1 ? num / 100 : num;
    } else if (targetField === 'current_balance' || targetField === 'currentbalance') {
      const num = parseFloat(cleanText.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) updateData.currentBalance = num;
    } else if (targetField === 'original_principal' || targetField === 'originalprincipal') {
      const num = parseFloat(cleanText.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) updateData.originalPrincipal = num;
    } else if (targetField === 'term_months' || targetField === 'termmonths') {
      const num = parseInt(cleanText.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num)) updateData.termMonths = num;
    } else if (targetField === 'days_past_due' || targetField === 'dayspastdue') {
      const num = parseInt(cleanText.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num)) updateData.daysPastDue = num;
    } else if (targetField === 'document_status' || targetField === 'documentstatus') {
      updateData.documentStatus = cleanText;
    } else if (targetField === 'payment_status' || targetField === 'paymentstatus') {
      updateData.paymentStatus = cleanText;
    } else if (targetField === 'servicer_name' || targetField === 'servicername') {
      updateData.servicerName = cleanText;
    } else if (targetField === 'borrower_state' || targetField === 'borrowerstate') {
      updateData.borrowerState = cleanText.slice(0, 2).toUpperCase();
    } else if (targetField === 'origination_date' || targetField === 'originationdate') {
      updateData.originationDate = cleanText;
    } else if (targetField === 'maturity_date' || targetField === 'maturitydate') {
      updateData.maturityDate = cleanText;
    } else if (targetField === 'loan_type' || targetField === 'loantype') {
      updateData.loanType = cleanText;
    } else if (targetField === 'borrower_id' || targetField === 'borrowerid') {
      updateData.borrowerId = cleanText;
    } else {
      // Rule-type specific target field fallbacks if field is omitted
      if (ruleType === 'NUMERIC_RANGE' || ruleType === 'RATE_IN_RANGE') {
        const num = parseFloat(cleanText.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) updateData.interestRate = num > 1 ? num / 100 : num;
      } else if (ruleType === 'DOCUMENT_STATUS') {
        updateData.documentStatus = 'Complete';
      } else if (ruleType === 'STATUS_CONSISTENCY' || ruleType === 'DPD_STATUS_MATCH') {
        if (cleanText.toLowerCase().includes('current')) {
          updateData.paymentStatus = 'Current';
          updateData.daysPastDue = 0;
        }
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.loanRecord.update({
        where: { loanId },
        data: updateData,
      });
    }
  }
}
