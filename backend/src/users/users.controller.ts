import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth, CurrentUser } from '../common/decorators';
import { Role } from '../common/enums';
import { ListUsersQuery, UpdateRoleDto } from './dto/update-role.dto';
import { User } from './user.entity';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Auth(Role.Agent, Role.Admin)
  @ApiOperation({
    summary: 'List users',
    description:
      'Agents receive the assignee pool (agents and admins). Admins can list every user, optionally filtered by role.',
  })
  @ApiOkResponse({ type: User, isArray: true })
  list(@CurrentUser() actor: User, @Query() query: ListUsersQuery): Promise<User[]> {
    if (actor.role === Role.Agent) {
      if (query.role === Role.Customer) {
        return Promise.resolve([]);
      }
      if (query.role === Role.Agent || query.role === Role.Admin) {
        return this.users.list(query.role);
      }
      return this.listStaff();
    }
    return this.users.list(query.role);
  }

  @Patch(':id/role')
  @Auth(Role.Admin)
  @ApiOperation({ summary: 'Change a user role' })
  @ApiOkResponse({ type: User })
  updateRole(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<User> {
    return this.users.updateRole(actor, id, dto.role);
  }

  private async listStaff(): Promise<User[]> {
    const [agents, admins] = await Promise.all([
      this.users.list(Role.Agent),
      this.users.list(Role.Admin),
    ]);
    return [...admins, ...agents].sort((a, b) => a.name.localeCompare(b.name));
  }
}
