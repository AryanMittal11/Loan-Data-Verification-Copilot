import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ValidationService } from './validation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('validations')
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  @Post('run')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator', 'reviewer')
  async runValidation(@Body('source_file_id') sourceFileId?: string) {
    return this.validationService.runValidation(sourceFileId);
  }
}
