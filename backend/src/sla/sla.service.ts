import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { OPEN_STATUSES, Priority, SLA_MINUTES } from '../common/enums';
import { slaBreachedEmail } from '../notifications/email.copy';
import { NotificationsService } from '../notifications/notifications.service';
import { Ticket } from '../tickets/ticket.entity';

export interface SlaWindow {
  priority: Priority;
  minutes: number;
}

@Injectable()
export class SlaService {
  constructor(
    @InjectRepository(Ticket)
    private readonly tickets: Repository<Ticket>,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  policy(): SlaWindow[] {
    return (Object.values(Priority) as Priority[]).map((priority) => ({
      priority,
      minutes: SLA_MINUTES[priority],
    }));
  }

  /**
   * Mark open tickets that are past slaDueAt and queue one breach email each.
   * The row lock stops two overlapping scans from marking the same ticket.
   */
  async scan(): Promise<number> {
    const now = new Date();
    const ids = await this.dataSource.transaction(async (manager) => {
      const overdue = await manager
        .createQueryBuilder(Ticket, 'ticket')
        .setLock('pessimistic_write')
        .where('ticket.status IN (:...statuses)', { statuses: OPEN_STATUSES })
        .andWhere('ticket.slaDueAt < :now', { now })
        .andWhere('ticket.slaBreachedAt IS NULL')
        .getMany();

      for (const ticket of overdue) {
        await manager.update(Ticket, ticket.id, { slaBreachedAt: now });
      }
      return overdue.map((ticket) => ticket.id);
    });

    if (ids.length === 0) {
      return 0;
    }

    const breached = await this.tickets.find({
      where: { id: In(ids) },
      relations: { requester: true, assignee: true },
    });

    await Promise.all(
      breached.map((ticket) => {
        const recipient = ticket.assignee ?? ticket.requester;
        const message = slaBreachedEmail(ticket);
        return this.notifications.enqueue({
          to: recipient.email,
          kind: 'sla.breached',
          ticketId: ticket.id,
          subject: message.subject,
          text: message.text,
        });
      }),
    );

    return ids.length;
  }
}
