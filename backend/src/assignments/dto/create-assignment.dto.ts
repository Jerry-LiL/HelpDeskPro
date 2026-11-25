import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({ description: 'Agent or admin who should own the ticket.' })
  @IsUUID()
  assigneeId: string;
}
