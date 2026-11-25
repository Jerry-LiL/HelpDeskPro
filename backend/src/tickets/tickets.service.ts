import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageMeta, pageMeta } from '../common/page';
import { Priority, Role, TicketStatus, slaDueAt } from '../common/enums';
import { ticketCreatedEmail, ticketUpdatedEmail } from '../notifications/email.copy';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/user.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQuery } from './dto/list-tickets.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from './ticket.entity';

export interface TicketPage {
  data: Ticket[];
  meta: PageMeta;
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly tickets: Repository<Ticket>,
    private readonly notifications: NotificationsService,
  ) {}

  async create(requester: User, dto: CreateTicketDto): Promise<Ticket> {
    const priority = dto.priority ?? Priority.Medium;
    const created = this.tickets.create({
      title: dto.title.trim(),
      description: dto.description.trim(),
      priority,
      status: TicketStatus.Open,
      requesterId: requester.id,
      slaDueAt: slaDueAt(new Date(), priority),
      slaBreachedAt: null,
    });
    const saved = await this.tickets.save(created);
    const ticket = await this.requireById(saved.id);
    const message = ticketCreatedEmail(ticket);
    await this.notifications.enqueue({
      to: requester.email,
      kind: 'ticket.created',
      ticketId: ticket.id,
      subject: message.subject,
      text: message.text,
    });
    return ticket;
  }

  async list(actor: User, query: ListTicketsQuery): Promise<TicketPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.tickets
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.requester', 'requester')
      .leftJoinAndSelect('ticket.assignee', 'assignee')
      .orderBy('ticket.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (actor.role === Role.Customer) {
      qb.andWhere('ticket.requesterId = :requesterId', { requesterId: actor.id });
    }
    if (query.status) {
      qb.andWhere('ticket.status = :status', { status: query.status });
    }
    if (query.priority) {
      qb.andWhere('ticket.priority = :priority', { priority: query.priority });
    }
    if (query.assigneeId) {
      qb.andWhere('ticket.assigneeId = :assigneeId', { assigneeId: query.assigneeId });
    }
    if (query.unassigned === true) {
      qb.andWhere('ticket.assigneeId IS NULL');
    }
    if (query.slaBreached === true) {
      qb.andWhere('ticket.slaBreachedAt IS NOT NULL');
    } else if (query.slaBreached === false) {
      qb.andWhere('ticket.slaBreachedAt IS NULL');
    }
    if (query.q) {
      qb.andWhere('(ticket.title ILIKE :q OR ticket.description ILIKE :q)', { q: `%${query.q}%` });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: pageMeta(page, limit, total) };
  }

  async getFor(actor: User, id: string): Promise<Ticket> {
    const ticket = await this.findById(id);
    if (!ticket || (actor.role === Role.Customer && ticket.requesterId !== actor.id)) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  async update(actor: User, id: string, dto: UpdateTicketDto): Promise<Ticket> {
    if (actor.role === Role.Customer) {
      const visible = await this.findById(id);
      if (!visible || visible.requesterId !== actor.id) {
        throw new NotFoundException('Ticket not found');
      }
      throw new ForbiddenException('Customers cannot update ticket status or priority');
    }
    if (dto.status === undefined && dto.priority === undefined) {
      throw new BadRequestException('Provide a status or a priority');
    }

    const ticket = await this.requireById(id);
    const changes: string[] = [];

    if (dto.status && dto.status !== ticket.status) {
      changes.push(`Status changed from ${label(ticket.status)} to ${label(dto.status)}.`);
      ticket.status = dto.status;
    }
    if (dto.priority && dto.priority !== ticket.priority) {
      changes.push(`Priority changed from ${ticket.priority} to ${dto.priority}.`);
      ticket.priority = dto.priority;
      ticket.slaDueAt = slaDueAt(ticket.createdAt, dto.priority);
      if (ticket.slaDueAt.getTime() > Date.now()) {
        ticket.slaBreachedAt = null;
      }
    }

    const saved = await this.tickets.save(ticket);
    if (changes.length > 0) {
      const message = ticketUpdatedEmail(saved, changes.join(' '));
      await this.notifications.enqueue({
        to: saved.requester.email,
        kind: 'ticket.updated',
        ticketId: saved.id,
        subject: message.subject,
        text: message.text,
      });
    }
    return saved;
  }

  findById(id: string): Promise<Ticket | null> {
    return this.tickets.findOne({
      where: { id },
      relations: { requester: true, assignee: true },
    });
  }

  async requireById(id: string): Promise<Ticket> {
    const ticket = await this.findById(id);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  save(ticket: Ticket): Promise<Ticket> {
    return this.tickets.save(ticket);
  }
}

function label(status: TicketStatus): string {
  return status.replace('_', ' ');
}
