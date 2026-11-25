import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { SLA_QUEUE } from '../common/enums';

@Injectable()
export class SlaScheduler implements OnModuleInit {
  private readonly logger = new Logger(SlaScheduler.name);

  constructor(
    @InjectQueue(SLA_QUEUE)
    private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const parsed = Number(this.config.get('SLA_SCAN_INTERVAL_MS') ?? 60_000);
    const every = Number.isFinite(parsed) && parsed >= 1000 ? parsed : 60_000;
    await this.queue.add(
      'scan',
      {},
      {
        repeat: { every },
        jobId: 'sla-scan',
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    );
    this.logger.log(`SLA scan scheduled every ${every}ms`);
  }
}
