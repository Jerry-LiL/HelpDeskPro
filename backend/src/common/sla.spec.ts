import { Priority, slaDueAt, SLA_MINUTES } from './enums';

describe('slaDueAt', () => {
  const created = new Date('2026-03-01T09:00:00.000Z');

  it.each([Priority.Low, Priority.Medium, Priority.High, Priority.Urgent])(
    'adds the %s window to the ticket creation time',
    (priority) => {
      const due = slaDueAt(created, priority);
      expect(due.getTime() - created.getTime()).toBe(SLA_MINUTES[priority] * 60_000);
    },
  );
});
