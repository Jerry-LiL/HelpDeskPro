import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Priority } from '../../common/enums';

export class CreateTicketDto {
  @ApiProperty({ example: 'VPN drops every few minutes' })
  @IsString()
  @MinLength(3)
  @MaxLength(140)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  description: string;

  @ApiPropertyOptional({ enum: Priority, default: Priority.Medium })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}
