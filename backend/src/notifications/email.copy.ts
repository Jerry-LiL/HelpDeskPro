import { Ticket } from '../tickets/ticket.entity';

export interface EmailCopy {
  subject: string;
  text: string;
}

function ref(ticketNumber: number, title: string): string {
  return `HD-${ticketNumber}: ${title}`;
}

export function ticketCreatedEmail(ticket: Ticket): EmailCopy {
  return {
    subject: `[${ref(ticket.ticketNumber, ticket.title)}] We received your request`,
    text: [
      `Hi ${ticket.requester.name},`,
      '',
      `Your ticket ${ref(ticket.ticketNumber, ticket.title)} is open.`,
      `Priority: ${ticket.priority}.`,
      `We aim to respond by ${ticket.slaDueAt.toUTCString()}.`,
      '',
      ticket.description,
    ].join('\n'),
  };
}

export function ticketUpdatedEmail(ticket: Ticket, change: string): EmailCopy {
  return {
    subject: `[${ref(ticket.ticketNumber, ticket.title)}] Ticket updated`,
    text: [`Hi ${ticket.requester.name},`, '', change].join('\n'),
  };
}

export function commentEmail(
  ticketNumber: number,
  title: string,
  authorName: string,
  body: string,
  internal: boolean,
): EmailCopy {
  const prefix = internal ? 'Internal note' : 'New comment';
  return {
    subject: `[${ref(ticketNumber, title)}] ${prefix}`,
    text: [`${authorName} wrote:`, '', body].join('\n'),
  };
}

export function assignmentEmail(ticket: Ticket, assignedByName: string): EmailCopy {
  return {
    subject: `[${ref(ticket.ticketNumber, ticket.title)}] Assigned to you`,
    text: [
      `${assignedByName} assigned ${ref(ticket.ticketNumber, ticket.title)} to you.`,
      `Priority: ${ticket.priority}. SLA due ${ticket.slaDueAt.toUTCString()}.`,
      '',
      ticket.description,
    ].join('\n'),
  };
}

export function slaBreachedEmail(ticket: Ticket): EmailCopy {
  return {
    subject: `[${ref(ticket.ticketNumber, ticket.title)}] SLA breached`,
    text: [
      `${ref(ticket.ticketNumber, ticket.title)} is past its ${ticket.priority} SLA.`,
      `Due at ${ticket.slaDueAt.toUTCString()}.`,
      `Current status: ${ticket.status}.`,
    ].join('\n'),
  };
}
