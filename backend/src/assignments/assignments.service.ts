import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, TicketStatus } from '../common/enums';
import { assignmentEmail } from '../notifications/email.copy';
import { NotificationsService } from '../notifications/notifications.service';
import { TicketsService } from '../tickets/tickets.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { Assignment } from './assignment.entity';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignments: Repository<Assignment>,
    private readonly tickets: TicketsService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(actor: User, ticketId: string): Promise<Assignment[]> {
    if (actor.role === Role.Customer) {
      await this.tickets.getFor(actor, ticketId);
      throw new ForbiddenException('Customers cannot view assignment history');
    }
    await this.tickets.requireById(ticketId);
    return this.assignments.find({
      where: { ticketId },
      order: { createdAt: 'DESC' },
    });
  }

  async assign(actor: User, ticketId: string, assigneeId: string): Promise<Assignment> {
    if (actor.role === Role.Customer) {
      const ticket = await this.tickets.findById(ticketId);
      if (!ticket || ticket.requesterId !== actor.id) {
        throw new NotFoundException('Ticket not found');
      }
      throw new ForbiddenException('Customers cannot assign tickets');
    }

    const ticket = await this.tickets.requireById(ticketId);
    const assignee = await this.users.findById(assigneeId);
    if (!assignee) {
      throw new NotFoundException('Assignee not found');
    }
    if (assignee.role === Role.Customer) {
      throw new BadRequestException('Tickets can only be assigned to agents or admins');
    }
    if (ticket.assigneeId === assignee.id) {
      throw new BadRequestException('Ticket is already assigned to this user');
    }

    ticket.assigneeId = assignee.id;
    ticket.assignee = assignee;
    if (ticket.status === TicketStatus.Open) {
      ticket.status = TicketStatus.InProgress;
    }
    await this.tickets.save(ticket);

    const saved = await this.assignments.save(
      this.assignments.create({
        ticketId: ticket.id,
        assigneeId: assignee.id,
        assignedById: actor.id,
      }),
    );
    const row = await this.assignments.findOneOrFail({ where: { id: saved.id } });
    const message = assignmentEmail(ticket, actor.name);
    await this.notifications.enqueue({
      to: assignee.email,
      kind: 'ticket.assigned',
      ticketId: ticket.id,
      subject: message.subject,
      text: message.text,
    });
    return row;
  }
}
