import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column()
  to: string;

  @ApiProperty()
  @Column()
  subject: string;

  @ApiProperty()
  @Column({ type: 'text' })
  body: string;

  @ApiProperty({ example: 'ticket.created' })
  @Column()
  kind: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  ticketId: string | null;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
