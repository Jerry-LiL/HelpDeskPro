export type Role = 'customer' | 'agent' | 'admin';

export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  requesterId: string;
  requester: User;
  assigneeId: string | null;
  assignee: User | null;
  slaDueAt: string;
  slaBreachedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketPage {
  data: Ticket[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Comment {
  id: string;
  ticketId: string;
  authorId: string;
  author: User;
  body: string;
  internal: boolean;
  createdAt: string;
}

export interface Assignment {
  id: string;
  ticketId: string;
  assigneeId: string;
  assignee: User;
  assignedById: string;
  assignedBy: User;
  createdAt: string;
}

export interface SlaWindow {
  priority: Priority;
  minutes: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
