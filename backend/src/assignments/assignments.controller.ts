import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth, CurrentUser } from '../common/decorators';
import { Role } from '../common/enums';
import { User } from '../users/user.entity';
import { Assignment } from './assignment.entity';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@ApiTags('assignments')
@Controller('tickets/:ticketId/assignments')
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Get()
  @Auth(Role.Agent, Role.Admin)
  @ApiOperation({ summary: 'Assignment history for a ticket' })
  @ApiOkResponse({ type: Assignment, isArray: true })
  list(@CurrentUser() actor: User, @Param('ticketId', ParseUUIDPipe) ticketId: string): Promise<Assignment[]> {
    return this.assignments.list(actor, ticketId);
  }

  @Post()
  @Auth(Role.Agent, Role.Admin)
  @ApiOperation({ summary: 'Assign a ticket to an agent or admin' })
  @ApiCreatedResponse({ type: Assignment })
  create(
    @CurrentUser() actor: User,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: CreateAssignmentDto,
  ): Promise<Assignment> {
    return this.assignments.assign(actor, ticketId, dto.assigneeId);
  }
}
