import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth, CurrentUser } from '../common/decorators';
import { User } from '../users/user.entity';
import { Comment } from './comment.entity';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('comments')
@Controller('tickets/:ticketId/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  @Auth()
  @ApiOperation({ summary: 'List comments on a ticket' })
  @ApiOkResponse({ type: Comment, isArray: true })
  list(@CurrentUser() actor: User, @Param('ticketId', ParseUUIDPipe) ticketId: string): Promise<Comment[]> {
    return this.comments.list(actor, ticketId);
  }

  @Post()
  @Auth()
  @ApiOperation({ summary: 'Add a comment' })
  @ApiCreatedResponse({ type: Comment })
  create(
    @CurrentUser() actor: User,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<Comment> {
    return this.comments.create(actor, ticketId, dto);
  }
}
