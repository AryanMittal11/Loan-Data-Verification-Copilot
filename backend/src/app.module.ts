import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { IngestionModule } from './ingestion/ingestion.module';
import { ValidationModule } from './validation/validation.module';
import { ExceptionsModule } from './exceptions/exceptions.module';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';
import { VerifiedRecordsModule } from './verified-records/verified-records.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditModule,
    IngestionModule,
    ValidationModule,
    ExceptionsModule,
    AiAssistantModule,
    VerifiedRecordsModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
