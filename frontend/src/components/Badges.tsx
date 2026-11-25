import type { Priority, TicketStatus } from '../types';

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`badge status-${status}`}>{status.replace('_', ' ')}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`badge priority-${priority}`}>{priority}</span>;
}

export function ticketLabel(ticketNumber: number): string {
  return `HD-${ticketNumber}`;
}
