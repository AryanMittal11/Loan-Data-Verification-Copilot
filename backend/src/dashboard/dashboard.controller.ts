import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('loans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator', 'reviewer', 'consumer')
  async getLoans() {
    return this.dashboardService.getLoans();
  }

  @Get('loans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator', 'reviewer', 'consumer')
  async getLoan(@Param('id') id: string) {
    return this.dashboardService.getLoan(id);
  }

  @Get('audit/:loanId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator', 'reviewer', 'consumer')
  async getAudit(@Param('loanId') loanId: string) {
    return this.dashboardService.getAuditTimeline(loanId);
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator', 'reviewer', 'consumer')
  async getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('dashboard/operator')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator', 'reviewer')
  async getOperatorDashboard() {
    return this.dashboardService.getOperatorDashboard();
  }

  @Get('dashboard/reviewer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('reviewer')
  async getReviewerDashboard() {
    return this.dashboardService.getReviewerDashboard();
  }

  @Get('dashboard/consumer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('consumer', 'reviewer')
  async getConsumerDashboard() {
    return this.dashboardService.getConsumerDashboard();
  }

  @Get('health')
  getHealth() {
    return this.dashboardService.getHealth();
  }
}
