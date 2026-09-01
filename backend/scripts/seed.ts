import { PrismaClient, Role, SourceFileType, SourceFileStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stableStringify } from '../src/common/stringify';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Loan Data Verification Copilot database...');

  // 1. Seed Users
  const usersPath = path.join(__dirname, '..', 'fixtures', 'users.json');
  if (fs.existsSync(usersPath)) {
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    for (const u of usersData) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          role: u.role as Role,
          passwordHash,
          organization: u.organization,
        },
        create: {
          name: u.name,
          email: u.email,
          role: u.role as Role,
          passwordHash,
          organization: u.organization,
        },
      });
    }
    console.log('✅ Users seeded: operator, reviewer, consumer');
  }

  // 2. Seed Validation Rules
  const rulesPath = path.join(__dirname, '..', 'config', 'validation_rules.json');
  if (fs.existsSync(rulesPath)) {
    const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
    for (const rule of rules) {
      await prisma.validationRule.upsert({
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
    console.log('✅ Validation rules seeded');
  }

  // 3. Seed Loan Tape CSV
  const csvPath = path.join(__dirname, '..', 'fixtures', 'loan_tape.csv');
  if (fs.existsSync(csvPath)) {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });

    const sourceFile = await prisma.sourceFile.create({
      data: {
        filename: 'loan_tape.csv',
        type: SourceFileType.loan_tape,
        uploadedBy: 'operator@example.com',
        rowCount: records.length,
        status: SourceFileStatus.imported,
      },
    });

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const loanId = row.loan_id;

      await prisma.loanRecordRaw.create({
        data: {
          sourceFileId: sourceFile.id,
          rowNumber: i + 2,
          loanId,
          rawPayload: row,
        },
      });

      if (loanId) {
        let rate = parseFloat(row.interest_rate) || 0;
        const principal = parseFloat(row.original_principal) || 0;
        const balance = parseFloat(row.current_balance) || 0;

        await prisma.loanRecord.upsert({
          where: { loanId },
          update: {
            borrowerId: row.borrower_id,
            loanType: row.loan_type,
            originationDate: row.origination_date,
            maturityDate: row.maturity_date,
            originalPrincipal: principal,
            currentBalance: balance,
            interestRate: rate,
            termMonths: parseInt(row.term_months, 10) || 360,
            borrowerState: row.borrower_state,
            paymentStatus: row.payment_status,
            daysPastDue: parseInt(row.days_past_due, 10) || 0,
            servicerName: row.servicer_name,
            documentStatus: row.document_status,
            sourceSystem: row.source_system,
          },
          create: {
            loanId,
            borrowerId: row.borrower_id,
            loanType: row.loan_type,
            originationDate: row.origination_date,
            maturityDate: row.maturity_date,
            originalPrincipal: principal,
            currentBalance: balance,
            interestRate: rate,
            termMonths: parseInt(row.term_months, 10) || 360,
            borrowerState: row.borrower_state,
            paymentStatus: row.payment_status,
            daysPastDue: parseInt(row.days_past_due, 10) || 0,
            servicerName: row.servicer_name,
            documentStatus: row.document_status,
            sourceSystem: row.source_system,
          },
        });

        // Audit events for import
        await prisma.auditEvent.create({
          data: {
            eventType: 'file_uploaded',
            entityType: 'source_file',
            entityId: sourceFile.id,
            actor: 'operator@example.com',
            metadata: { filename: 'loan_tape.csv' },
          },
        });

        await prisma.auditEvent.create({
          data: {
            eventType: 'loan_record_imported',
            entityType: 'loan',
            entityId: loanId,
            actor: 'system',
            metadata: { rowNumber: i + 2 },
          },
        });
      }
    }
    console.log(`✅ Ingested ${records.length} loans from loan_tape.csv`);
  }

  // 4. Create Initial Verified Record for Clean Loan
  const cleanLoan = await prisma.loanRecord.findUnique({ where: { loanId: 'LN-1001' } });
  if (cleanLoan) {
    const verifiedAt = new Date().toISOString();
    const canonicalData = {
      loan_id: cleanLoan.loanId,
      borrower_id: cleanLoan.borrowerId,
      loan_type: cleanLoan.loanType,
      origination_date: cleanLoan.originationDate,
      maturity_date: cleanLoan.maturityDate,
      original_principal: cleanLoan.originalPrincipal,
      current_balance: cleanLoan.currentBalance,
      interest_rate: cleanLoan.interestRate,
      term_months: cleanLoan.termMonths,
      borrower_state: cleanLoan.borrowerState,
      payment_status: cleanLoan.paymentStatus,
      days_past_due: cleanLoan.daysPastDue,
      servicer_name: cleanLoan.servicerName,
      document_status: cleanLoan.documentStatus,
      source_system: cleanLoan.sourceSystem,
    };

    const finalPayload = {
      ...canonicalData,
      verifier: 'reviewer@example.com',
      timestamp: verifiedAt,
    };

    const canonicalJson = stableStringify(finalPayload);
    const recordHash = crypto.createHash('sha256').update(canonicalJson).digest('hex');

    await prisma.verifiedRecord.upsert({
      where: { loanId: 'LN-1001' },
      update: {
        canonicalData,
        sourceFileRef: 'loan_tape.csv',
        validationResult: { status: 'passed', exceptions_remaining: 0 },
        reviewerDecision: 'approved',
        verifiedAt: new Date(verifiedAt),
        verifiedBy: 'reviewer@example.com',
        recordHash,
      },
      create: {
        loanId: 'LN-1001',
        canonicalData,
        sourceFileRef: 'loan_tape.csv',
        validationResult: { status: 'passed', exceptions_remaining: 0 },
        reviewerDecision: 'approved',
        verifiedAt: new Date(verifiedAt),
        verifiedBy: 'reviewer@example.com',
        recordHash,
      },
    });

    await prisma.auditEvent.create({
      data: {
        eventType: 'verified_record_created',
        entityType: 'verified',
        entityId: 'LN-1001',
        actor: 'reviewer@example.com',
        metadata: { recordHash },
      },
    });
    console.log('✅ Initial verified record created for LN-1001 with SHA-256 hash');
  }

  console.log('🚀 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
