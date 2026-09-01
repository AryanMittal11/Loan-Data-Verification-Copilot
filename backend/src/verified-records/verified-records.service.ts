import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { stableStringify } from '../common/stringify';
import { serializeVerifiedRecord, serializeLoanRecord } from '../common/serializers';
import { ExceptionStatus } from '@prisma/client';

@Injectable()
export class VerifiedRecordsService {
  constructor(private prisma: PrismaService) {}

  async createVerifiedRecord(loanId: string, verifier: string) {
    const loan = await this.prisma.loanRecord.findUnique({ where: { loanId } });
    if (!loan) throw new NotFoundException(`Loan ${loanId} not found.`);

    // Check verification invariant: no open blocking exceptions
    const openExceptions = await this.prisma.exception.findMany({
      where: {
        loanId,
        status: ExceptionStatus.open,
      },
    });

    if (openExceptions.length > 0) {
      throw new BadRequestException(
        `Cannot verify loan ${loanId}: ${openExceptions.length} open exception(s) remain unresolved.`,
      );
    }

    const verifiedAt = new Date().toISOString();
    const canonicalFields = serializeLoanRecord(loan);

    // Compute deterministic SHA-256 hash using stable stringify
    const finalPayload = {
      ...canonicalFields,
      verifier,
      timestamp: verifiedAt,
    };

    const canonicalJson = stableStringify(finalPayload);
    const recordHash = crypto.createHash('sha256').update(canonicalJson).digest('hex');

    const sourceFileRef = loan.sourceSystem || 'loan_tape.csv';
    const validationResult = { status: 'passed', exceptions_remaining: 0 };
    const reviewerDecision = loan.status === 'rejected' ? 'rejected' : 'approved';

    const verified = await this.prisma.verifiedRecord.upsert({
      where: { loanId },
      update: {
        canonicalData: canonicalFields,
        sourceFileRef,
        validationResult,
        reviewerDecision,
        verifiedAt: new Date(verifiedAt),
        verifiedBy: verifier,
        recordHash,
      },
      create: {
        loanId,
        canonicalData: canonicalFields,
        sourceFileRef,
        validationResult,
        reviewerDecision,
        verifiedAt: new Date(verifiedAt),
        verifiedBy: verifier,
        recordHash,
      },
    });

    return serializeVerifiedRecord(verified);
  }

  async getAll() {
    const verified = await this.prisma.verifiedRecord.findMany({
      orderBy: { verifiedAt: 'desc' },
    });
    return verified.map(serializeVerifiedRecord);
  }

  async getOne(loanId: string) {
    const existing = await this.prisma.verifiedRecord.findUnique({ where: { loanId } });
    if (existing) {
      return serializeVerifiedRecord(existing);
    }
    throw new NotFoundException(`Verified record for loan ${loanId} not found.`);
  }

  async exportVerifiedData() {
    const verifiedList = await this.prisma.verifiedRecord.findMany({
      orderBy: { verifiedAt: 'desc' },
    });

    return verifiedList.map(serializeVerifiedRecord);
  }
}
