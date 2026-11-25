import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SLA_QUEUE } from '../common/enums';
import { SlaService } from './sla.service';

@Processor(SLA_QUEUE)
export class SlaProcessor extends WorkerHost {
  private readonly logger = new Logger(SlaProcessor.name);

  constructor(private readonly sla: SlaService) {
    super();
  }

  async process(job: Job): Promise<{ breached: number }> {
    const breached = await this.sla.scan();
    this.logger.log(`job ${job.id} marked ${breached} ticket(s)`);
    return { breached };
  }
}
