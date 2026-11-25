import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Priority, TicketStatus } from '../common/enums';
import { User } from '../users/user.entity';

@Entity('tickets')
@Index(['status', 'slaDueAt'])
export class Ticket {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Human-facing ticket number, shown as HD-<n>.' })
  @Column({ type: 'int', generated: 'increment' })
  ticketNumber: number;

  @ApiProperty()
  @Column()
  title: string;

  @ApiProperty()
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ enum: TicketStatus })
  @Column({ type: 'varchar', default: TicketStatus.Open })
  status: TicketStatus;

  @ApiProperty({ enum: Priority })
  @Column({ type: 'varchar' })
  priority: Priority;

  @ApiProperty()
  @Column({ type: 'uuid' })
  requesterId: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  assigneeId: string | null;

  @ApiPropertyOptional({ type: () => User, nullable: true })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigneeId' })
  assignee: User | null;

  @ApiProperty()
  @Column({ type: 'timestamptz' })
  slaDueAt: Date;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  slaBreachedAt: Date | null;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
