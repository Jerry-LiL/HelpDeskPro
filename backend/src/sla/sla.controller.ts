import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators';
import { Priority, Role } from '../common/enums';
import { SlaService } from './sla.service';

class SlaWindowDto {
  @ApiProperty({ enum: Priority })
  priority: Priority;

  @ApiProperty({ description: 'Minutes before an open ticket of this priority breaches.' })
  minutes: number;
}

class SlaScanResultDto {
  @ApiProperty()
  breached: number;
}

@ApiTags('sla')
@Controller('sla')
export class SlaController {
  constructor(private readonly sla: SlaService) {}

  @Get('policy')
  @Auth()
  @ApiOperation({ summary: 'SLA windows for each priority' })
  @ApiOkResponse({ type: SlaWindowDto, isArray: true })
  policy(): SlaWindowDto[] {
    return this.sla.policy();
  }

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @Auth(Role.Admin)
  @ApiOperation({
    summary: 'Run an SLA breach scan now',
    description: 'The same check the BullMQ repeatable job runs on a timer.',
  })
  @ApiOkResponse({ type: SlaScanResultDto })
  async scan(): Promise<SlaScanResultDto> {
    const breached = await this.sla.scan();
    return { breached };
  }
}
