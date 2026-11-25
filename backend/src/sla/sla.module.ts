import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SLA_QUEUE } from '../common/enums';
import { NotificationsModule } from '../notifications/notifications.module';
import { Ticket } from '../tickets/ticket.entity';
import { SlaController } from './sla.controller';
import { SlaProcessor } from './sla.processor';
import { SlaScheduler } from './sla.scheduler';
import { SlaService } from './sla.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket]), BullModule.registerQueue({ name: SLA_QUEUE }), NotificationsModule],
  controllers: [SlaController],
  providers: [SlaService, SlaProcessor, SlaScheduler],
  exports: [SlaService],
})
export class SlaModule {}
