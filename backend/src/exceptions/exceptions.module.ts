import { Module } from '@nestjs/common';
import { ExceptionsService } from './exceptions.service';
import { ExceptionsController } from './exceptions.controller';
import { ValidationModule } from '../validation/validation.module';

@Module({
  imports: [ValidationModule],
  controllers: [ExceptionsController],
  providers: [ExceptionsService],
  exports: [ExceptionsService],
})
export class ExceptionsModule {}
