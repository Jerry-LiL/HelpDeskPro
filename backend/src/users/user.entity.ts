import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../common/enums';

@Entity('users')
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ unique: true })
  email: string;

  @ApiProperty()
  @Column()
  name: string;

  @ApiProperty({ enum: Role })
  @Column({ type: 'varchar' })
  role: Role;

  @ApiHideProperty()
  @Exclude()
  @Column()
  passwordHash: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
