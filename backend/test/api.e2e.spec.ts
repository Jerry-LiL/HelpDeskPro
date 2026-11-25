import { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { NOTIFICATIONS_QUEUE, Priority, Role, SLA_QUEUE, TicketStatus } from '../src/common/enums';
import { Notification } from '../src/notifications/notification.entity';
import { Ticket } from '../src/tickets/ticket.entity';
import { UsersService } from '../src/users/users.service';

const PASSWORD = 'password123';

describe('HelpDeskPro API', () => {
  let app: INestApplication;
  let mailQueue: Queue;
  let slaQueue: Queue;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    mailQueue = app.get(getQueueToken(NOTIFICATIONS_QUEUE));
    slaQueue = app.get(getQueueToken(SLA_QUEUE));
  });

  beforeEach(async () => {
    const db = app.get(DataSource);
    await db.query(
      'TRUNCATE TABLE notifications, comments, assignments, tickets, users RESTART IDENTITY CASCADE',
    );
    await mailQueue.drain(true);
    await slaQueue.drain(true);
  });

  afterAll(async () => {
    await mailQueue.obliterate({ force: true }).catch(() => undefined);
    await slaQueue.obliterate({ force: true }).catch(() => undefined);
    await app.close();
  });

  it('answers the health check and publishes Swagger for every route', async () => {
    await request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });

    const docs = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const paths = Object.keys(docs.body.paths);
    for (const path of [
      '/health',
      '/auth/register',
      '/auth/login',
      '/auth/me',
      '/users',
      '/users/{id}/role',
      '/tickets',
      '/tickets/{id}',
      '/tickets/{ticketId}/comments',
      '/tickets/{ticketId}/assignments',
      '/sla/policy',
      '/sla/scan',
    ]) {
      expect(paths).toContain(path);
    }
  });

  it('registers a customer, logs in, and rejects a bad password', async () => {
    const created = await register('kabir@example.com', 'Kabir');
    expect(created.user.role).toBe(Role.Customer);
    expect(JSON.stringify(created)).not.toContain('passwordHash');

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set(bearer(created.accessToken))
      .expect(200);
    expect(me.body.email).toBe('kabir@example.com');

    const loggedIn = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'kabir@example.com', password: PASSWORD })
      .expect(200);
    expect(loggedIn.body.accessToken).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'kabir@example.com', password: 'wrong-password' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'kabir@example.com', name: 'Kabir', password: PASSWORD })
      .expect(409);

    await request(app.getHttpServer()).get('/tickets').expect(401);
  });

  it('keeps customers on their own tickets and lets agents page through the queue', async () => {
    const customer = await register('customer@example.com', 'Kabir');
    const other = await register('other@example.com', 'Other');
    const agent = await staff(Role.Agent, 'agent@example.com', 'Rohan');

    await request(app.getHttpServer())
      .post('/tickets')
      .set(bearer(customer.accessToken))
      .send({ title: 'VPN drops', description: 'It reconnects every few minutes.', priority: Priority.High })
      .expect(201);

    const hidden = await request(app.getHttpServer())
      .post('/tickets')
      .set(bearer(other.accessToken))
      .send({ title: 'Badge reader', description: 'Side door will not open.' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/tickets/${hidden.body.id}`)
      .set(bearer(customer.accessToken))
      .expect(404);

    const ownList = await request(app.getHttpServer())
      .get('/tickets')
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(ownList.body.data).toHaveLength(1);
    expect(ownList.body.meta.total).toBe(1);

    for (let i = 0; i < 12; i += 1) {
      await request(app.getHttpServer())
        .post('/tickets')
        .set(bearer(other.accessToken))
        .send({ title: `Printer jam ${i}`, description: 'Tray two jams on envelopes.' })
        .expect(201);
    }

    const page = await request(app.getHttpServer())
      .get('/tickets?page=2&limit=10')
      .set(bearer(agent.accessToken))
      .expect(200);
    expect(page.body.data).toHaveLength(4);
    expect(page.body.meta).toMatchObject({ page: 2, limit: 10, total: 14, totalPages: 2 });

    const search = await request(app.getHttpServer())
      .get('/tickets')
      .query({ q: 'badge' })
      .set(bearer(agent.accessToken))
      .expect(200);
    expect(search.body.data).toHaveLength(1);
    expect(search.body.data[0].title).toBe('Badge reader');

    const unassigned = await request(app.getHttpServer())
      .get('/tickets')
      .query({ unassigned: true, priority: Priority.High })
      .set(bearer(agent.accessToken))
      .expect(200);
    expect(unassigned.body.data.every((ticket: { assigneeId: string | null }) => ticket.assigneeId === null)).toBe(
      true,
    );
    expect(unassigned.body.meta.total).toBe(1);
  });

  it('hides internal notes from customers and records assignment history', async () => {
    const customer = await register('notes@example.com', 'Kabir');
    const agent = await staff(Role.Agent, 'notes-agent@example.com', 'Rohan');
    const admin = await staff(Role.Admin, 'notes-admin@example.com', 'Asha');

    const opened = await request(app.getHttpServer())
      .post('/tickets')
      .set(bearer(customer.accessToken))
      .send({ title: 'Payroll password', description: 'Reset mail never arrives.', priority: Priority.Urgent })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/tickets/${opened.body.id}/comments`)
      .set(bearer(customer.accessToken))
      .send({ body: 'I checked spam already.', internal: true })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/tickets/${opened.body.id}/comments`)
      .set(bearer(agent.accessToken))
      .send({ body: 'Vendor ticket is open.', internal: true })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/tickets/${opened.body.id}/comments`)
      .set(bearer(agent.accessToken))
      .send({ body: 'Please try the reset link once more.' })
      .expect(201);

    const asCustomer = await request(app.getHttpServer())
      .get(`/tickets/${opened.body.id}/comments`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(asCustomer.body).toHaveLength(1);
    expect(asCustomer.body[0].body).toBe('Please try the reset link once more.');

    const asAgent = await request(app.getHttpServer())
      .get(`/tickets/${opened.body.id}/comments`)
      .set(bearer(agent.accessToken))
      .expect(200);
    expect(asAgent.body).toHaveLength(2);

    await request(app.getHttpServer())
      .post(`/tickets/${opened.body.id}/assignments`)
      .set(bearer(customer.accessToken))
      .send({ assigneeId: agent.user.id })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/tickets/${opened.body.id}/assignments`)
      .set(bearer(admin.accessToken))
      .send({ assigneeId: customer.user.id })
      .expect(400);

    const assigned = await request(app.getHttpServer())
      .post(`/tickets/${opened.body.id}/assignments`)
      .set(bearer(admin.accessToken))
      .send({ assigneeId: agent.user.id })
      .expect(201);
    expect(assigned.body.assignee.email).toBe('notes-agent@example.com');
    expect(JSON.stringify(assigned.body)).not.toContain('passwordHash');

    const ticket = await request(app.getHttpServer())
      .get(`/tickets/${opened.body.id}`)
      .set(bearer(agent.accessToken))
      .expect(200);
    expect(ticket.body.assigneeId).toBe(agent.user.id);
    expect(ticket.body.status).toBe(TicketStatus.InProgress);

    const history = await request(app.getHttpServer())
      .get(`/tickets/${opened.body.id}/assignments`)
      .set(bearer(agent.accessToken))
      .expect(200);
    expect(history.body).toHaveLength(1);

    const mail = await waitForNotification({ kind: 'ticket.assigned', to: 'notes-agent@example.com' });
    expect(mail.subject).toContain('HD-');
    expect(mail.ticketId).toBe(opened.body.id);

    await waitForNotification({ kind: 'ticket.created', to: 'notes@example.com' });
    await waitForNotification({ kind: 'ticket.commented', to: 'notes@example.com' });
  });

  it('recomputes the SLA window when priority changes and scans for breaches', async () => {
    const customer = await register('sla@example.com', 'Kabir');
    const agent = await staff(Role.Agent, 'sla-agent@example.com', 'Rohan');
    const admin = await staff(Role.Admin, 'sla-admin@example.com', 'Asha');

    const opened = await request(app.getHttpServer())
      .post('/tickets')
      .set(bearer(customer.accessToken))
      .send({ title: 'Slack alerts delayed', description: 'Posts arrive ten minutes late.', priority: Priority.Urgent })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/tickets/${opened.body.id}/assignments`)
      .set(bearer(agent.accessToken))
      .send({ assigneeId: agent.user.id })
      .expect(201);

    const tickets = app.get<Repository<Ticket>>(getRepositoryToken(Ticket));
    await tickets.update({ id: opened.body.id }, { slaDueAt: new Date(Date.now() - 60_000) });

    const first = await request(app.getHttpServer())
      .post('/sla/scan')
      .set(bearer(admin.accessToken))
      .expect(200);
    expect(first.body.breached).toBe(1);

    const second = await request(app.getHttpServer())
      .post('/sla/scan')
      .set(bearer(admin.accessToken))
      .expect(200);
    expect(second.body.breached).toBe(0);

    const breached = await request(app.getHttpServer())
      .get(`/tickets/${opened.body.id}`)
      .set(bearer(agent.accessToken))
      .expect(200);
    expect(breached.body.slaBreachedAt).toBeTruthy();

    await waitForNotification({ kind: 'sla.breached', to: 'sla-agent@example.com' });

    await request(app.getHttpServer()).post('/sla/scan').set(bearer(agent.accessToken)).expect(403);
    await request(app.getHttpServer()).get('/sla/policy').set(bearer(agent.accessToken)).expect(200);

    const lowered = await request(app.getHttpServer())
      .patch(`/tickets/${opened.body.id}`)
      .set(bearer(agent.accessToken))
      .send({ priority: Priority.Low })
      .expect(200);
    expect(lowered.body.slaBreachedAt).toBeNull();
    expect(lowered.body.priority).toBe(Priority.Low);
    const due = new Date(lowered.body.slaDueAt).getTime();
    const created = new Date(lowered.body.createdAt).getTime();
    expect(due - created).toBe(72 * 60 * 60_000);

    await tickets.update(
      { id: opened.body.id },
      { status: TicketStatus.Resolved, slaDueAt: new Date(Date.now() - 60_000), slaBreachedAt: null },
    );
    const skipped = await request(app.getHttpServer())
      .post('/sla/scan')
      .set(bearer(admin.accessToken))
      .expect(200);
    expect(skipped.body.breached).toBe(0);

    const queue = await request(app.getHttpServer())
      .get('/tickets')
      .query({ slaBreached: false })
      .set(bearer(agent.accessToken))
      .expect(200);
    expect(queue.body.meta.total).toBe(1);
  });

  it('lets an admin change roles and refuses to demote the last admin', async () => {
    const customer = await register('promote@example.com', 'Kabir');
    const admin = await staff(Role.Admin, 'only-admin@example.com', 'Asha');

    await request(app.getHttpServer())
      .patch(`/users/${customer.user.id}/role`)
      .set(bearer(customer.accessToken))
      .send({ role: Role.Agent })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/users/${admin.user.id}/role`)
      .set(bearer(admin.accessToken))
      .send({ role: Role.Agent })
      .expect(400);

    const promoted = await request(app.getHttpServer())
      .patch(`/users/${customer.user.id}/role`)
      .set(bearer(admin.accessToken))
      .send({ role: Role.Agent })
      .expect(200);
    expect(promoted.body.role).toBe(Role.Agent);

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(me.body.role).toBe(Role.Agent);

    const staffList = await request(app.getHttpServer())
      .get('/users')
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(staffList.body.some((user: { email: string }) => user.email === 'promote@example.com')).toBe(true);
    expect(staffList.body.some((user: { role: string }) => user.role === Role.Customer)).toBe(false);
  });

  async function register(email: string, name: string) {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, name, password: PASSWORD })
      .expect(201);
    return res.body as { accessToken: string; user: { id: string; email: string; role: string } };
  }

  async function staff(role: Role, email: string, name: string) {
    const users = app.get(UsersService);
    const user = await users.create({ email, name, password: PASSWORD }, role);
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password: PASSWORD }).expect(200);
    return { accessToken: res.body.accessToken as string, user };
  }

  async function waitForNotification(where: { kind: string; to: string }): Promise<Notification> {
    const repo = app.get<Repository<Notification>>(getRepositoryToken(Notification));
    const started = Date.now();
    while (Date.now() - started < 8000) {
      const found = await repo.findOne({ where });
      if (found) {
        return found;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`No ${where.kind} notification for ${where.to}`);
  }
});

function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
