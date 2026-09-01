import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExceptionStatus } from '@prisma/client';
import {
  serializeException,
  serializeLoanRecord,
  serializeAIRecommendation,
} from '../common/serializers';
import { ValidationService } from '../validation/validation.service';

@Injectable()
export class ExceptionsService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
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

    // Apply correction to loan canonical record
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

    // Re-run validation to resolve exception
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

    await this.prisma.loanRecord.update({
      where: { loanId },
      data: { status: decision },
    });

    return { ok: true, loan_id: loanId, decision };
  }

  private async applyCorrectionToLoan(loanId: string, field: string | null, ruleType?: string, textVal?: string) {
    const updateData: any = {};
    const cleanText = textVal ? textVal.trim() : '';

    if (field === 'interest_rate' || ruleType === 'NUMERIC_RANGE' || cleanText.includes('%')) {
      const num = parseFloat(cleanText.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) {
        updateData.interestRate = num > 1 ? num / 100 : num;
      } else {
        updateData.interestRate = 0.0625;
      }
    } else if (field === 'current_balance' || cleanText.includes('$')) {
      const num = parseFloat(cleanText.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) {
        updateData.currentBalance = num;
      }
    } else if (field === 'document_status' || ruleType === 'DOCUMENT_STATUS' || cleanText.includes('Complete')) {
      updateData.documentStatus = 'Complete';
    } else if (field === 'servicer_name') {
      updateData.servicerName = cleanText || 'Cascade Servicing';
    } else if (field === 'borrower_state') {
      updateData.borrowerState = cleanText.slice(0, 2).toUpperCase() || 'CA';
    } else if (field === 'origination_date') {
      updateData.originationDate = cleanText || '2024-01-01';
    } else if (field === 'maturity_date' || ruleType === 'DATE_FORMAT_LOGIC') {
      updateData.maturityDate = cleanText || '2054-01-01';
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.loanRecord.update({
        where: { loanId },
        data: updateData,
      });
    }
  }
}
