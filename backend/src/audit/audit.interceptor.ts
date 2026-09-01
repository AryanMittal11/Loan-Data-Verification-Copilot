import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const path = req.path || req.url;

    // Only intercept mutating routes or export endpoint
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) || path.includes('/export');
    if (!isMutating) {
      return next.handle();
    }

    const actor = req.user?.name || req.user?.email || 'system';

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          let eventType = 'action_performed';
          let entityType = 'system';
          let entityId = req.params?.id || req.params?.loanId || 'global';
          let metadata: any = { path, method };

          if (path.includes('/uploads')) {
            eventType = 'file_uploaded';
            entityType = 'source_file';
            entityId = responseBody?.id || responseBody?.filename || 'file';
          } else if (path.includes('/validations/run')) {
            eventType = 'validation_executed';
            entityType = 'validation_batch';
            entityId = req.body?.source_file_id || 'batch';
          } else if (path.includes('/ai/explain') || path.includes('/ai/suggest-correction') || path.includes('/ai/resolve-conflict')) {
            eventType = 'ai_recommendation_generated';
            entityType = 'recommendation';
            entityId = responseBody?.id || req.params?.id || 'rec';
          } else if (path.includes('/comment')) {
            eventType = 'reviewer_comment_added';
            entityType = 'exception';
            entityId = req.params?.id || 'ex';
          } else if (path.includes('/edit')) {
            eventType = 'field_edited';
            entityType = 'loan';
            entityId = responseBody?.loan_id || req.params?.id || 'loan';
            metadata.editedFields = req.body?.edited_fields || req.body;
          } else if (path.includes('/accept')) {
            eventType = 'reviewer_action_accepted';
            entityType = 'exception';
            entityId = req.params?.id || 'ex';
          } else if (path.includes('/decision')) {
            const decision = req.body?.decision;
            eventType = decision === 'approved' ? 'loan_approved' : 'loan_rejected';
            entityType = 'loan';
            entityId = req.params?.id || 'loan';
          } else if (path.includes('/export')) {
            eventType = 'verified_record_exported';
            entityType = 'verified';
            entityId = req.query?.loan_id || 'all_verified';
          }

          await this.auditService.appendEvent({
            eventType,
            entityType,
            entityId,
            actor,
            metadata,
          });
        } catch (e) {
          // Audit logging failure should not crash response
        }
      }),
    );
  }
}
