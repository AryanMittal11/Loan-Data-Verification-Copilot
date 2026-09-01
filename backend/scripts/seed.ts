import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Loan Data Verification Copilot database default users and rules...');

  // 1. Seed Default Role Users
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
    console.log('✅ Users seeded: operator@example.com, reviewer@example.com, consumer@example.com');
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
    console.log('✅ 10 Validation rules configured');
  }

  console.log('🚀 Default users and validation rules ready!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
