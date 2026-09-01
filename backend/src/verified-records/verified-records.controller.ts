import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { VerifiedRecordsService } from './verified-records.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('verified-loans')
export class VerifiedRecordsController {
  constructor(private readonly verifiedService: VerifiedRecordsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('consumer', 'reviewer', 'operator')
  async getAll() {
    return this.verifiedService.getAll();
  }

  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('consumer', 'reviewer')
  async exportVerified() {
    return this.verifiedService.exportVerifiedData();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('consumer', 'reviewer', 'operator')
  async getOne(@Param('id') id: string) {
    return this.verifiedService.getOne(id);
  }
}
