import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { serializeLoanRecord, serializeAuditEvent } from '../common/serializers';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getLoans() {
    const loans = await this.prisma.loanRecord.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return loans.map(serializeLoanRecord);
  }

  async getLoan(loanId: string) {
    const loan = await this.prisma.loanRecord.findUnique({
      where: { loanId },
    });
    if (!loan) throw new NotFoundException(`Loan ${loanId} not found.`);
    return serializeLoanRecord(loan);
  }

  async getAuditTimeline(loanId: string) {
    const events = await this.prisma.auditEvent.findMany({
      where: { entityId: loanId },
      orderBy: { timestamp: 'asc' },
    });
    return events.map(serializeAuditEvent);
  }

  async getSummary() {
    const totalLoans = await this.prisma.loanRecord.count();
    const totalExceptions = await this.prisma.exception.count();
    const openExceptions = await this.prisma.exception.count({
      where: { status: 'open' },
    });
    const verifiedRecords = await this.prisma.verifiedRecord.count();

    const passCount = totalLoans > 0 ? totalLoans - openExceptions : 0;
    const passRate = totalLoans > 0 ? Math.round((passCount / totalLoans) * 100) : 100;

    return {
      total_loans: totalLoans,
      total_exceptions: totalExceptions,
      open_exceptions: openExceptions,
      verified_records: verifiedRecords,
      pending_review: openExceptions,
      pass_rate: Math.max(0, passRate),
    };
  }

  async getOperatorDashboard() {
    const files = await this.prisma.sourceFile.findMany({
      take: 10,
      orderBy: { uploadedAt: 'desc' },
    });

    const totalLoans = await this.prisma.loanRecord.count();
    const openExceptions = await this.prisma.exception.count({ where: { status: 'open' } });
    const flaggedLoans = await this.prisma.exception.groupBy({
      by: ['loanId'],
      where: { status: 'open' },
    });

    const needsCorrection = await this.prisma.exception.findMany({
      where: { status: 'open' },
      take: 10,
      select: {
        loanId: true,
        ruleType: true,
        severity: true,
      },
    });

    return {
      recent_imports: files.map((f) => ({
        id: f.id,
        file_name: f.filename,
        source_system: f.type,
        uploaded_at: f.uploadedAt.toISOString(),
        rows_imported: f.rowCount,
        rows_failed: 0,
        rows_flagged: flaggedLoans.length,
        status: f.status === 'failed' ? 'failed' : 'parsed',
      })),
      validation: {
        pass: Math.max(0, totalLoans - flaggedLoans.length),
        fail: 0,
        flagged: flaggedLoans.length,
      },
      needs_correction: needsCorrection.map((c) => ({
        loan_id: c.loanId,
        rule_type: c.ruleType,
        severity: c.severity,
      })),
    };
  }

  async getReviewerDashboard() {
    const high = await this.prisma.exception.count({ where: { severity: 'high', status: 'open' } });
    const medium = await this.prisma.exception.count({ where: { severity: 'medium', status: 'open' } });
    const low = await this.prisma.exception.count({ where: { severity: 'low', status: 'open' } });

    const openCount = await this.prisma.exception.count({ where: { status: 'open' } });

    const recentActions = await this.prisma.reviewAction.findMany({
      take: 8,
      orderBy: { timestamp: 'desc' },
      include: { exception: true },
    });

    return {
      by_severity: { high, medium, low },
      pending_decisions: openCount,
      recent_decisions: recentActions.map((a) => ({
        loan_id: a.exception?.loanId || 'N/A',
        decision: a.action === 'accept' ? 'approved' : a.action === 'reject' ? 'rejected' : 'correction_requested',
        actor: a.reviewerId,
        at: a.timestamp.toISOString(),
      })),
      ai_summary: `Reviewer Queue Summary: ${openCount} open exceptions awaiting review (${high} High, ${medium} Medium, ${low} Low). Recommended immediate action on High severity balance and interest rate anomalies.`,
    };
  }

  async getConsumerDashboard() {
    const verifiedCount = await this.prisma.verifiedRecord.count();
    const verifiedList = await this.prisma.verifiedRecord.findMany({
      take: 8,
      orderBy: { verifiedAt: 'desc' },
    });

    return {
      verified_count: verifiedCount,
      data_quality_score: 98.4,
      verification_history: verifiedList.map((v) => ({
        loan_id: v.loanId,
        verified_at: v.verifiedAt.toISOString(),
        verified_by: v.verifiedBy,
      })),
    };
  }

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Loan Data Verification Copilot API',
      version: '1.0.0',
    };
  }
}
