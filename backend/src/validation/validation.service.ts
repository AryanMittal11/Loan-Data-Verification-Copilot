import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ruleRegistry } from './registry';
import { RuleContext, RuleFailure } from './types';
import * as fs from 'fs';
import * as path from 'path';
import { ExceptionStatus, ExceptionSeverity } from '@prisma/client';
import { serializeException } from '../common/serializers';

@Injectable()
export class ValidationService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedRulesFromConfig();
  }

  async seedRulesFromConfig() {
    try {
      const configPath = path.join(process.cwd(), 'config', 'validation_rules.json');
      if (fs.existsSync(configPath)) {
        const rules = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        for (const rule of rules) {
          await this.prisma.validationRule.upsert({
            where: { code: rule.code },
            update: {
              name: rule.name,
              category: rule.category,
              severity: rule.severity || 'medium',
              enabled: rule.enabled ?? true,
              config: rule.config,
            },
            create: {
              code: rule.code,
              name: rule.name,
              category: rule.category,
              severity: rule.severity || 'medium',
              enabled: rule.enabled ?? true,
              config: rule.config,
              status: 'approved',
              createdBy: 'system',
            },
          });
        }
      }
    } catch (e) {
      console.error('Failed to seed rules from config:', e);
    }
  }

  async runValidation(sourceFileId?: string) {
    const activeRules = await this.prisma.validationRule.findMany({
      where: { enabled: true, status: 'approved' },
    });

    const allRecords = await this.prisma.loanRecord.findMany();

    // Map raw records & cross file updates
    const rawRecords = await this.prisma.loanRecordRaw.findMany();
    const rawByLoanId = new Map<string, any[]>();
    for (const raw of rawRecords) {
      if (raw.loanId) {
        if (!rawByLoanId.has(raw.loanId)) rawByLoanId.set(raw.loanId, []);
        rawByLoanId.get(raw.loanId).push(raw.rawPayload);
      }
    }

    const crossFileByLoanId = new Map<string, any>();

    const context: RuleContext = {
      sourceFileId,
      allRecords,
      rawByLoanId,
      crossFileByLoanId,
      now: new Date(),
      config: {},
    };

    const newExceptions: any[] = [];

    for (const record of allRecords) {
      for (const dbRule of activeRules) {
        const ruleFn = ruleRegistry[dbRule.code];
        if (!ruleFn) continue;

        context.config = typeof dbRule.config === 'string' ? JSON.parse(dbRule.config) : dbRule.config;
        const result = ruleFn(record, context);

        if (result) {
          const failures = Array.isArray(result) ? result : [result];
          for (const fail of failures) {
            newExceptions.push({
              loanId: fail.loanId,
              ruleId: dbRule.id,
              ruleType: fail.ruleCode,
              severity: (fail.severity as ExceptionSeverity) || ExceptionSeverity.medium,
              status: ExceptionStatus.open,
              sourceFileId,
              field: fail.field || null,
              detail: fail.detail,
            });
          }
        }
      }
    }

    // 1. Create newly detected open exceptions
    for (const ex of newExceptions) {
      const existing = await this.prisma.exception.findFirst({
        where: {
          loanId: ex.loanId,
          ruleType: ex.ruleType,
          field: ex.field,
          status: ExceptionStatus.open,
        },
      });

      if (!existing) {
        await this.prisma.exception.create({
          data: ex,
        });
      }
    }

    // 2. Auto-resolve existing open exceptions if rule validation now passes after correction
    const openDbExceptions = await this.prisma.exception.findMany({
      where: { status: ExceptionStatus.open },
    });

    for (const openEx of openDbExceptions) {
      const stillFails = newExceptions.some(
        (newEx) =>
          newEx.loanId === openEx.loanId &&
          newEx.ruleType === openEx.ruleType &&
          (newEx.field === openEx.field || (!newEx.field && !openEx.field)),
      );
      if (!stillFails) {
        await this.prisma.exception.update({
          where: { id: openEx.id },
          data: { status: ExceptionStatus.approved },
        });
      }
    }

    const currentExceptions = await this.prisma.exception.findMany({
      where: { status: ExceptionStatus.open },
    });

    return {
      status: 'completed',
      total_loans_evaluated: allRecords.length,
      rules_executed: activeRules.length,
      exceptions_generated: newExceptions.length,
      open_exceptions: currentExceptions.map(serializeException),
    };
  }
}
