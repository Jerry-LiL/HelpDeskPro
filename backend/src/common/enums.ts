export enum Role {
  Customer = 'customer',
  Agent = 'agent',
  Admin = 'admin',
}

export enum TicketStatus {
  Open = 'open',
  InProgress = 'in_progress',
  Waiting = 'waiting',
  Resolved = 'resolved',
  Closed = 'closed',
}

export enum Priority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Urgent = 'urgent',
}

export const OPEN_STATUSES: TicketStatus[] = [
  TicketStatus.Open,
  TicketStatus.InProgress,
  TicketStatus.Waiting,
];

/** Minutes an open ticket is allowed to sit before it counts as an SLA breach. */
export const SLA_MINUTES: Record<Priority, number> = {
  [Priority.Low]: 72 * 60,
  [Priority.Medium]: 24 * 60,
  [Priority.High]: 8 * 60,
  [Priority.Urgent]: 60,
};

export function slaDueAt(createdAt: Date, priority: Priority): Date {
  return new Date(createdAt.getTime() + SLA_MINUTES[priority] * 60_000);
}

export const NOTIFICATIONS_QUEUE = 'notifications';
export const SLA_QUEUE = 'sla';
