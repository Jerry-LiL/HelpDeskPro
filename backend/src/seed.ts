import { NestFactory } from '@nestjs/core';
import { AssignmentsService } from './assignments/assignments.service';
import { AppModule } from './app.module';
import { CommentsService } from './comments/comments.service';
import { Priority, Role } from './common/enums';
import { TicketsService } from './tickets/tickets.service';
import { UsersService } from './users/users.service';

const PASSWORD = 'password123';

async function seed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const users = app.get(UsersService);
  const tickets = app.get(TicketsService);
  const comments = app.get(CommentsService);
  const assignments = app.get(AssignmentsService);

  const admin = await ensureUser(users, 'admin@helpdesk.local', 'Asha Admin', Role.Admin);
  const agent = await ensureUser(users, 'agent@helpdesk.local', 'Rohan Agent', Role.Agent);
  await ensureUser(users, 'agent2@helpdesk.local', 'Meera Agent', Role.Agent);
  const customer = await ensureUser(users, 'customer@helpdesk.local', 'Kabir Customer', Role.Customer);

  const existing = await tickets.list(admin, { page: 1, limit: 1 });
  if (existing.meta.total === 0) {
    const samples: Array<{ title: string; description: string; priority: Priority }> = [
      { title: 'VPN drops on the office wifi', description: 'The client reconnects every few minutes after 10:00.', priority: Priority.Urgent },
      { title: 'Cannot reset payroll password', description: 'The reset email never arrives.', priority: Priority.High },
      { title: 'Laptop fan is loud', description: 'Started after the last OS update.', priority: Priority.Low },
      { title: 'Shared inbox missing a folder', description: 'The Finance folder disappeared for two people.', priority: Priority.Medium },
      { title: 'Badge does not open the side door', description: 'Works at the main entrance only.', priority: Priority.Medium },
      { title: 'Monitor flickers on HDMI', description: 'Second display drops signal when waking from sleep.', priority: Priority.Low },
      { title: 'Need access to the design drive', description: 'New hire starts Monday.', priority: Priority.High },
      { title: 'Printer on floor 3 jams', description: 'Tray 2 jams on envelopes.', priority: Priority.Low },
      { title: 'Slack alerts delayed', description: 'Incident channel posts arrive ten minutes late.', priority: Priority.Urgent },
      { title: 'Calendar shows the wrong timezone', description: 'Meetings render one hour ahead.', priority: Priority.Medium },
      { title: 'Expense report stuck in draft', description: 'Submit button does nothing in Firefox.', priority: Priority.Medium },
      { title: 'New starter laptop request', description: 'Need a 16GB machine by Friday.', priority: Priority.High },
    ];

    const opened = [];
    for (const sample of samples) {
      opened.push(await tickets.create(customer, sample));
    }

    await assignments.assign(admin, opened[0].id, agent.id);
    await comments.create(agent, opened[0].id, {
      body: 'I can reproduce this on the guest network. Checking the VPN gateway next.',
    });
    await comments.create(agent, opened[1].id, {
      body: 'Password reset mail is landing in spam. Asked the customer to check there.',
      internal: false,
    });
    await comments.create(admin, opened[1].id, {
      body: 'Vendor ticket is already open with the mail provider.',
      internal: true,
    });
  }

  await app.close();
  console.log('Seeded admin@helpdesk.local, agent@helpdesk.local, and customer@helpdesk.local');
  console.log(`Password for every seeded user: ${PASSWORD}`);
}

async function ensureUser(users: UsersService, email: string, name: string, role: Role) {
  const existing = await users.findByEmail(email);
  if (existing) {
    return existing;
  }
  return users.create({ email, name, password: PASSWORD }, role);
}

void seed();
