import { ConfigService } from '@nestjs/config';
import { MailerService } from './mailer.service';

describe('MailerService', () => {
  it('logs mail locally when SMTP_HOST is empty', async () => {
    const config = {
      get: (key: string) => {
        if (key === 'SMTP_FROM') return 'HelpDeskPro <test@localhost>';
        return '';
      },
    } as ConfigService;

    const mailer = new MailerService(config);
    await expect(
      mailer.send({ to: 'agent@helpdesk.local', subject: 'Hello', text: 'Body' }),
    ).resolves.toBeUndefined();
  });
});
