process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://helpdesk:helpdesk@localhost:5432/helpdesk_test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.SMTP_HOST = '';
process.env.SMTP_FROM = 'HelpDeskPro <test@localhost>';
process.env.SLA_SCAN_INTERVAL_MS = '86400000';
process.env.SYNCHRONIZE = 'true';
process.env.WEB_ORIGIN = 'http://localhost:5173';
