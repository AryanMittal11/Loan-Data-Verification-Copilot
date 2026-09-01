import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ExceptionsService } from './exceptions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
export class ExceptionsController {
  constructor(private readonly exceptionsService: ExceptionsService) {}

  @Get('exceptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('operator', 'reviewer', 'consumer')
  async getQueue(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('rule_type') ruleType?: string,
    @Query('search') search?: string,
  ) {
    return this.exceptionsService.getQueue({ status, severity, ruleType, search });
  }

  @Get('exceptions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('reviewer', 'operator')
  async getDetail(@Param('id') id: string) {
    return this.exceptionsService.getDetail(id);
  }

  @Post('exceptions/:id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('reviewer')
  async accept(
    @Param('id') id: string,
    @Body('ai_recommendation_id') aiRecId?: string,
    @Body('comment') comment?: string,
    @Req() req?: any,
  ) {
    const actor = req?.user?.name || req?.user?.email || 'reviewer';
    return this.exceptionsService.accept(id, aiRecId, comment, actor);
  }

  @Post('exceptions/:id/edit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('reviewer')
  async edit(
    @Param('id') id: string,
    @Body('field') field: string,
    @Body('value') value: any,
    @Body('comment') comment?: string,
    @Req() req?: any,
  ) {
    const actor = req?.user?.name || req?.user?.email || 'reviewer';
    return this.exceptionsService.edit(id, field, value, comment, actor);
  }

  @Post('exceptions/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('reviewer')
  async reject(
    @Param('id') id: string,
    @Body('comment') comment?: string,
    @Req() req?: any,
  ) {
    const actor = req?.user?.name || req?.user?.email || 'reviewer';
    return this.exceptionsService.reject(id, comment, actor);
  }

  @Post('exceptions/:id/comment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('reviewer')
  async comment(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @Req() req?: any,
  ) {
    const actor = req?.user?.name || req?.user?.email || 'reviewer';
    return this.exceptionsService.addComment(id, comment, actor);
  }

  @Post('loans/:id/decision')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('reviewer')
  async loanDecision(
    @Param('id') loanId: string,
    @Body('decision') decision: 'approved' | 'rejected',
    @Req() req?: any,
  ) {
    const actor = req?.user?.name || req?.user?.email || 'reviewer';
    return this.exceptionsService.loanDecision(loanId, decision, actor);
  }
}
