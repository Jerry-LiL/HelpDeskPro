import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { NOTIFICATIONS_QUEUE } from '../common/enums';
import { MailerService } from './mailer.service';
import { Notification } from './notification.entity';
import { EmailJob } from './notifications.service';

@Processor(NOTIFICATIONS_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly mailer: MailerService,
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {
    super();
  }

  async process(job: Job<EmailJob>): Promise<void> {
    await this.mailer.send(job.data);
    await this.notifications.save(
      this.notifications.create({
        to: job.data.to,
        subject: job.data.subject,
        body: job.data.text,
        kind: job.data.kind,
        ticketId: job.data.ticketId ?? null,
      }),
    );
    this.logger.log(`sent ${job.data.kind} to ${job.data.to}`);
  }
}
