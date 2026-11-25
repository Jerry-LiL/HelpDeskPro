import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../common/enums';
import { commentEmail } from '../notifications/email.copy';
import { NotificationsService } from '../notifications/notifications.service';
import { TicketsService } from '../tickets/tickets.service';
import { User } from '../users/user.entity';
import { Comment } from './comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly comments: Repository<Comment>,
    private readonly tickets: TicketsService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(actor: User, ticketId: string): Promise<Comment[]> {
    await this.tickets.getFor(actor, ticketId);
    const rows = await this.comments.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });
    if (actor.role === Role.Customer) {
      return rows.filter((row) => !row.internal);
    }
    return rows;
  }

  async create(actor: User, ticketId: string, dto: CreateCommentDto): Promise<Comment> {
    const ticket = await this.tickets.getFor(actor, ticketId);
    const internal = dto.internal === true;
    if (internal && actor.role === Role.Customer) {
      throw new ForbiddenException('Customers cannot create internal notes');
    }

    const saved = await this.comments.save(
      this.comments.create({
        ticketId: ticket.id,
        authorId: actor.id,
        body: dto.body.trim(),
        internal,
      }),
    );
    const comment = await this.comments.findOneOrFail({ where: { id: saved.id } });
    await this.notify(actor, ticket.requester, ticket.assignee, ticket.id, ticket.ticketNumber, ticket.title, comment);
    return comment;
  }

  private async notify(
    author: User,
    requester: User,
    assignee: User | null,
    ticketId: string,
    ticketNumber: number,
    title: string,
    comment: Comment,
  ): Promise<void> {
    const recipients = new Set<string>();
    if (comment.internal) {
      if (assignee && assignee.id !== author.id) {
        recipients.add(assignee.email);
      }
    } else if (author.id === requester.id) {
      if (assignee) {
        recipients.add(assignee.email);
      }
    } else {
      recipients.add(requester.email);
      if (assignee && assignee.id !== author.id) {
        recipients.add(assignee.email);
      }
    }

    const message = commentEmail(ticketNumber, title, author.name, comment.body, comment.internal);
    await Promise.all(
      [...recipients].map((to) =>
        this.notifications.enqueue({
          to,
          kind: 'ticket.commented',
          ticketId,
          subject: message.subject,
          text: message.text,
        }),
      ),
    );
  }
}
