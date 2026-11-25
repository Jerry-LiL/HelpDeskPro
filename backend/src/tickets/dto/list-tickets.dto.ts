import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Priority, TicketStatus } from '../../common/enums';

export class ListTicketsQuery {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'When true, only tickets with no assignee are returned.' })
  @IsOptional()
  @Transform(({ value }) => coerceBoolean(value))
  @IsBoolean()
  unassigned?: boolean;

  @ApiPropertyOptional({ description: 'When true, only tickets that have already breached SLA are returned.' })
  @IsOptional()
  @Transform(({ value }) => coerceBoolean(value))
  @IsBoolean()
  slaBreached?: boolean;

  @ApiPropertyOptional({ description: 'Case-insensitive match on title or description.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}

function coerceBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  return value as boolean;
}
