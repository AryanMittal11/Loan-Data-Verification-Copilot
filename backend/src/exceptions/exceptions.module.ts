import { Module } from '@nestjs/common';
import { ExceptionsService } from './exceptions.service';
import { ExceptionsController } from './exceptions.controller';
import { ValidationModule } from '../validation/validation.module';
import { VerifiedRecordsModule } from '../verified-records/verified-records.module';

@Module({
  imports: [ValidationModule, VerifiedRecordsModule],
  controllers: [ExceptionsController],
  providers: [ExceptionsService],
  exports: [ExceptionsService],
})
export class ExceptionsModule {}
