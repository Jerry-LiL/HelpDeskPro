import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NOTIFICATIONS_QUEUE } from '../common/enums';
import { EmailProcessor } from './email.processor';
import { MailerService } from './mailer.service';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  providers: [NotificationsService, MailerService, EmailProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
