import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { serializeAuditEvent } from '../common/serializers';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async appendEvent(params: {
    eventType: string;
    entityType: string;
    entityId: string;
    actor: string;
    metadata?: any;
  }) {
    const event = await this.prisma.auditEvent.create({
      data: {
        eventType: params.eventType,
        entityType: params.entityType,
        entityId: params.entityId,
        actor: params.actor || 'system',
        metadata: params.metadata ? params.metadata : undefined,
      },
    });
    return serializeAuditEvent(event);
  }

  async getLoanTimeline(loanId: string) {
    const events = await this.prisma.auditEvent.findMany({
      where: {
        OR: [
          { entityId: loanId },
          { metadata: { path: ['loan_id'], equals: loanId } },
        ],
      },
      orderBy: { timestamp: 'asc' },
    });
    return events.map(serializeAuditEvent);
  }
}
