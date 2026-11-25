import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { NOTIFICATIONS_QUEUE } from '../common/enums';

export interface EmailJob {
  to: string;
  subject: string;
  text: string;
  kind: string;
  ticketId?: string | null;
}

export interface EnqueueOptions {
  jobId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly queue: Queue<EmailJob>,
  ) {}

  enqueue(job: EmailJob, options: EnqueueOptions = {}): Promise<unknown> {
    return this.queue.add('send-email', job, {
      jobId: options.jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 200,
      removeOnFail: 100,
    });
  }
}
