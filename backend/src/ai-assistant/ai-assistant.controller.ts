import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
export class AiAssistantController {
  constructor(private readonly aiService: AiAssistantService) {}

  @Post('exceptions/:id/ai/explain')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('reviewer', 'operator')
  async explain(@Param('id') id: string) {
    return this.aiService.explainFailure(id);
  }

  @Post('exceptions/:id/ai/suggest-correction')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('reviewer')
  async suggestCorrection(@Param('id') id: string) {
    return this.aiService.suggestCorrection(id);
  }

  @Post('exceptions/:id/ai/resolve-conflict')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('reviewer')
  async resolveConflict(@Param('id') id: string) {
    return this.aiService.resolveConflict(id);
  }

  @Post('exceptions/:id/ai/reviewer-notes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('reviewer')
  async reviewerNotes(@Param('id') id: string) {
    return this.aiService.generateReviewerNotes(id);
  }

  @Post('exceptions/:id/ai/classify-severity')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('reviewer')
  async classifySeverity(@Param('id') id: string) {
    return this.aiService.classifySeverity(id);
  }

  @Post('ai/summarize-batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('reviewer')
  async summarizeBatch(@Body('exception_ids') exceptionIds?: string[]) {
    return this.aiService.summarizeBatch(exceptionIds);
  }

  @Post('ai/generate-rule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('reviewer')
  async generateRule(
    @Body('prompt') prompt: string,
    @Req() req?: any,
  ) {
    const creator = req?.user?.name || req?.user?.email || 'reviewer';
    return this.aiService.generateRuleFromNL(prompt, creator);
  }

  @Post('ai/rules/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('reviewer')
  async approveRule(
    @Param('id') id: string,
    @Req() req?: any,
  ) {
    const actor = req?.user?.name || req?.user?.email || 'reviewer';
    return this.aiService.approveRuleDraft(id, actor);
  }

  @Post('ai/rules/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('reviewer')
  async rejectRule(@Param('id') id: string) {
    return this.aiService.rejectRuleDraft(id);
  }
}
