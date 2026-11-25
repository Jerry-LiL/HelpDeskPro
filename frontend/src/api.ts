import type { Assignment, AuthResponse, Comment, SlaWindow, Ticket, TicketPage, User } from './types';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const tokenKey = 'helpdesk.token';

export function readToken(): string | null {
  return localStorage.getItem(tokenKey);
}

export function writeToken(token: string | null): void {
  if (token) {
    localStorage.setItem(tokenKey, token);
  } else {
    localStorage.removeItem(tokenKey);
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = readToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : undefined;
  if (!response.ok) {
    throw new ApiError(messageFrom(body) ?? response.statusText, response.status);
  }
  return body as T;
}

function messageFrom(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || !('message' in body)) {
    return undefined;
  }
  const message = (body as { message: unknown }).message;
  if (Array.isArray(message)) {
    return message.map(String).join(' ');
  }
  if (typeof message === 'string') {
    return message;
  }
  return undefined;
}

export const client = {
  login: (email: string, password: string) =>
    api<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => api<User>('/auth/me'),
  tickets: (query: string) => api<TicketPage>(`/tickets${query}`),
  ticket: (id: string) => api<Ticket>(`/tickets/${id}`),
  updateTicket: (id: string, body: { status?: string; priority?: string }) =>
    api<Ticket>(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  comments: (id: string) => api<Comment[]>(`/tickets/${id}/comments`),
  addComment: (id: string, body: string, internal: boolean) =>
    api<Comment>(`/tickets/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body, internal }),
    }),
  assignments: (id: string) => api<Assignment[]>(`/tickets/${id}/assignments`),
  assign: (id: string, assigneeId: string) =>
    api<Assignment>(`/tickets/${id}/assignments`, {
      method: 'POST',
      body: JSON.stringify({ assigneeId }),
    }),
  users: (role?: string) => api<User[]>(role ? `/users?role=${role}` : '/users'),
  updateRole: (id: string, role: string) =>
    api<User>(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  slaPolicy: () => api<SlaWindow[]>('/sla/policy'),
  slaScan: () => api<{ breached: number }>('/sla/scan', { method: 'POST' }),
};
