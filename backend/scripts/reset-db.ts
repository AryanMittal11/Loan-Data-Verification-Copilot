import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing all loan records, raw lineage, exceptions, recommendations, verified records, and audit events...');

  // Delete all operational data
  await prisma.reviewAction.deleteMany({});
  await prisma.aIRecommendation.deleteMany({});
  await prisma.exception.deleteMany({});
  await prisma.verifiedRecord.deleteMany({});
  await prisma.loanRecordRaw.deleteMany({});
  await prisma.loanRecord.deleteMany({});
  await prisma.sourceFile.deleteMany({});
  await prisma.auditEvent.deleteMany({});

  console.log('✅ Operational data cleared cleanly.');

  // Seed default users if not present
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
    console.log('✅ Default role users ensured in database (operator@example.com, reviewer@example.com, consumer@example.com)');
  }

  // Seed validation rules
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
    console.log('✅ 10 Validation rules configured and ready for execution.');
  }

  console.log('✨ Database is now fresh and ready for user uploads!');
}

main()
  .catch((e) => {
    console.error('Reset error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
