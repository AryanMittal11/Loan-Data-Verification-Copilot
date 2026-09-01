import { Module } from '@nestjs/common';
import { VerifiedRecordsService } from './verified-records.service';
import { VerifiedRecordsController } from './verified-records.controller';

@Module({
  controllers: [VerifiedRecordsController],
  providers: [VerifiedRecordsService],
  exports: [VerifiedRecordsService],
})
export class VerifiedRecordsModule {}
