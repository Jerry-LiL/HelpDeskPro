import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth, CurrentUser } from '../common/decorators';
import { Role } from '../common/enums';
import { User } from '../users/user.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQuery } from './dto/list-tickets.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from './ticket.entity';
import { TicketPage, TicketsService } from './tickets.service';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  @Auth()
  @ApiOperation({ summary: 'Open a ticket' })
  @ApiCreatedResponse({ type: Ticket })
  create(@CurrentUser() actor: User, @Body() dto: CreateTicketDto): Promise<Ticket> {
    return this.tickets.create(actor, dto);
  }

  @Get()
  @Auth()
  @ApiOperation({
    summary: 'List tickets',
    description:
      'Offset pagination. Customers only see their own tickets. Agents and admins can filter by status, priority, assignee, SLA breach, and free text.',
  })
  @ApiOkResponse({ description: 'A page of tickets and the pagination meta.' })
  list(@CurrentUser() actor: User, @Query() query: ListTicketsQuery): Promise<TicketPage> {
    return this.tickets.list(actor, query);
  }

  @Get(':id')
  @Auth()
  @ApiOperation({ summary: 'Get a ticket' })
  @ApiOkResponse({ type: Ticket })
  get(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string): Promise<Ticket> {
    return this.tickets.getFor(actor, id);
  }

  @Patch(':id')
  @Auth(Role.Agent, Role.Admin)
  @ApiOperation({ summary: 'Update status or priority' })
  @ApiOkResponse({ type: Ticket })
  update(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
  ): Promise<Ticket> {
    return this.tickets.update(actor, id, dto);
  }
}
