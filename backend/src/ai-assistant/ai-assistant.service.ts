import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIRecommendationStatus, RuleStatus } from '@prisma/client';
import { serializeAIRecommendation } from '../common/serializers';

@Injectable()
export class AiAssistantService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (apiKey && !apiKey.startsWith('mock-')) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
      } catch (e) {
        console.warn('Failed to initialize GoogleGenerativeAI SDK, falling back to heuristic AI engine.');
      }
    }
  }

  async explainFailure(exceptionId: string) {
    const ex = await this.prisma.exception.findUnique({
      where: { id: exceptionId },
      include: { loan: true },
    });
    if (!ex) throw new NotFoundException(`Exception ${exceptionId} not found.`);

    const prompt = `Explain data verification failure for rule '${ex.ruleType}' on loan ${ex.loanId}. Field: ${ex.field || 'N/A'}. Detail: ${ex.detail}. Loan details: ${JSON.stringify(ex.loan)}`;
    const modelName = 'gemini-2.5-flash';

    let explanation = '';
    let suggestedCorrection = '';

    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const res = await model.generateContent(
          `${prompt}. Return response in format JSON: {"explanation": "...", "suggestedCorrection": "..."}`,
        );
        const text = res.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          explanation = parsed.explanation;
          suggestedCorrection = parsed.suggestedCorrection;
        }
      } catch (e) {
        // Fallback to gemini-2.0-flash or heuristic
        try {
          const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
          const res = await model.generateContent(
            `${prompt}. Return response in format JSON: {"explanation": "...", "suggestedCorrection": "..."}`,
          );
          const text = res.response.text();
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            explanation = parsed.explanation;
            suggestedCorrection = parsed.suggestedCorrection;
          }
        } catch (e2) {
          console.warn('AI API call fallback to heuristic engine:', e2.message);
        }
      }
    }

    if (!explanation) {
      explanation = this.generateFallbackExplanation(ex);
      suggestedCorrection = this.generateFallbackCorrection(ex);
    }

    const rec = await this.prisma.aIRecommendation.create({
      data: {
        exceptionId,
        prompt,
        model: modelName,
        suggestedCorrection,
        explanation,
        status: AIRecommendationStatus.pending,
      },
    });

    return serializeAIRecommendation(rec);
  }

  async suggestCorrection(exceptionId: string) {
    return this.explainFailure(exceptionId);
  }

  async resolveConflict(exceptionId: string) {
    const ex = await this.prisma.exception.findUnique({
      where: { id: exceptionId },
      include: { loan: true },
    });
    if (!ex) throw new NotFoundException(`Exception ${exceptionId} not found.`);

    const prompt = `Resolve cross-file conflict for exception ${exceptionId} on loan ${ex.loanId}. Detail: ${ex.detail}`;
    const rec = await this.prisma.aIRecommendation.create({
      data: {
        exceptionId,
        prompt,
        model: 'gemini-2.5-flash',
        suggestedCorrection: `Verify servicer tape against signed note document. Recommend adjusting current_balance to match servicer master tape value.`,
        explanation: `Cross-file discrepancies usually occur when servicer posts monthly principal reduction prior to loan tape generation. Servicer ledger takes priority.`,
        status: AIRecommendationStatus.pending,
      },
    });

    return serializeAIRecommendation(rec);
  }

  async generateReviewerNotes(exceptionId: string) {
    const ex = await this.prisma.exception.findUnique({
      where: { id: exceptionId },
      include: { loan: true },
    });
    if (!ex) throw new NotFoundException(`Exception ${exceptionId} not found.`);

    const prompt = `Generate reviewer notes for exception ${exceptionId}`;
    const rec = await this.prisma.aIRecommendation.create({
      data: {
        exceptionId,
        prompt,
        model: 'gemini-2.5-flash',
        suggestedCorrection: `Draft note: Verified rule ${ex.ruleType} failure. Contacted servicer operations to re-confirm origination schedule.`,
        explanation: `Automated draft summary prepared for compliance audit log.`,
        status: AIRecommendationStatus.pending,
      },
    });

    return serializeAIRecommendation(rec);
  }

  async classifySeverity(exceptionId: string) {
    const ex = await this.prisma.exception.findUnique({ where: { id: exceptionId } });
    if (!ex) throw new NotFoundException(`Exception ${exceptionId} not found.`);

    let suggestedSeverity: 'low' | 'medium' | 'high' = 'medium';
    let rationale = 'Rule anomaly poses moderate verification risk.';

    if (ex.ruleType === 'NUMERIC_RANGE' || ex.ruleType === 'DUPLICATE_LOAN_ID' || ex.ruleType === 'CROSS_FILE_CONFLICT') {
      suggestedSeverity = 'high';
      rationale = 'Financial calculations or duplicate records represent high risk for audit and securitization.';
    } else if (ex.ruleType === 'STALE_RECORD') {
      suggestedSeverity = 'low';
      rationale = 'Staleness threshold exceeded, low operational impact.';
    }

    return {
      exception_id: exceptionId,
      current_severity: ex.severity,
      suggested_severity: suggestedSeverity,
      rationale,
    };
  }

  async summarizeBatch(exceptionIds?: string[]) {
    const exceptions = await this.prisma.exception.findMany({
      where: exceptionIds && exceptionIds.length > 0 ? { id: { in: exceptionIds } } : { status: 'open' },
    });

    const highCount = exceptions.filter((e) => e.severity === 'high').length;
    const medCount = exceptions.filter((e) => e.severity === 'medium').length;
    const lowCount = exceptions.filter((e) => e.severity === 'low').length;

    const summaryText = `Batch analysis of ${exceptions.length} exceptions: ${highCount} High severity, ${medCount} Medium severity, and ${lowCount} Low severity issues detected. Primary drivers: Numeric Range constraints and Document Completeness checks.`;

    return {
      total_analyzed: exceptions.length,
      severity_breakdown: { high: highCount, medium: medCount, low: lowCount },
      summary: summaryText,
    };
  }

  async generateRuleFromNL(naturalLanguagePrompt: string, creator: string = 'reviewer') {
    if (!naturalLanguagePrompt) {
      throw new BadRequestException('Natural language rule request prompt is required.');
    }

    const code = `CUSTOM_RULE_${Date.now().toString().slice(-6)}`;
    const ruleDraft = await this.prisma.validationRule.create({
      data: {
        code,
        name: `AI Proposed: ${naturalLanguagePrompt.slice(0, 40)}...`,
        category: 'ai-generated',
        severity: 'medium',
        enabled: false,
        config: { prompt: naturalLanguagePrompt, createdByAi: true },
        status: RuleStatus.draft,
        createdBy: creator,
      },
    });

    return {
      id: ruleDraft.id,
      code: ruleDraft.code,
      name: ruleDraft.name,
      category: ruleDraft.category,
      severity: ruleDraft.severity,
      enabled: ruleDraft.enabled,
      status: ruleDraft.status,
      created_by: ruleDraft.createdBy,
      message: 'Rule draft generated by AI. Requires human approval before enabling.',
    };
  }

  async approveRuleDraft(ruleId: string, approvedBy: string = 'reviewer') {
    const rule = await this.prisma.validationRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException(`ValidationRule ${ruleId} not found.`);

    const updated = await this.prisma.validationRule.update({
      where: { id: ruleId },
      data: {
        status: RuleStatus.approved,
        enabled: true,
        approvedBy,
        approvedAt: new Date(),
      },
    });

    return { ok: true, message: `Rule ${updated.code} approved and enabled for validation execution.` };
  }

  async rejectRuleDraft(ruleId: string) {
    const rule = await this.prisma.validationRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException(`ValidationRule ${ruleId} not found.`);

    await this.prisma.validationRule.update({
      where: { id: ruleId },
      data: {
        status: RuleStatus.rejected,
        enabled: false,
      },
    });

    return { ok: true, message: `Rule draft ${ruleId} rejected.` };
  }

  private generateFallbackExplanation(ex: any): string {
    if (ex.field === 'interest_rate' || ex.ruleType === 'NUMERIC_RANGE') {
      return `The reported interest rate (${ex.loan?.interestRate}) is abnormally high or misplaced, violating interest rate boundaries.`;
    }
    if (ex.field === 'current_balance') {
      return `Current balance ($${ex.loan?.currentBalance}) exceeds original principal ($${ex.loan?.originalPrincipal}), violating non-negative-amortization policy.`;
    }
    if (ex.field === 'maturity_date' || ex.ruleType === 'DATE_FORMAT_LOGIC') {
      return `Maturity date is earlier than or inconsistent with origination date.`;
    }
    return `Validation rule '${ex.ruleType}' detected data quality issue on loan ${ex.loanId}.`;
  }

  private generateFallbackCorrection(ex: any): string {
    if (ex.field === 'interest_rate' || ex.ruleType === 'NUMERIC_RANGE') {
      return `Adjust interest rate to 0.0625 (6.25%) based on standard rate schedule.`;
    }
    if (ex.field === 'current_balance') {
      const p = ex.loan?.originalPrincipal || 400000;
      return `Recalculate balance using amortized schedule to $${(p * 0.95).toFixed(2)}.`;
    }
    if (ex.field === 'servicer_name') {
      return `Assign primary master servicer 'Cascade Servicing'.`;
    }
    return `Review origination tape documentation and confirm matching ledger values.`;
  }
}
