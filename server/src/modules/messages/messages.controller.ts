// server/src/modules/messages/messages.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { HighAssuranceAdminGuard } from '../../common/guards/admin-security.guard';
import { CurrentUser } from '../../common/decorators/security.decorators';
import type { AuthUser } from '../../domain/models';
import {
  CreateConversationDtoClass,
  SendMessageDtoClass,
  CreateBroadcastDtoClass,
  ArchiveConversationDtoClass,
} from './dto/messages.dto';

@ApiTags('messages')
@Controller('messages')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread messages and broadcast announcements count' })
  async getUnreadCount(@CurrentUser() user: AuthUser) {
    return this.messagesService.getUnreadCount(user.id);
  }

  @Get('recipients')
  @ApiOperation({ summary: 'Search and list potential message recipients (staff, authors, editors)' })
  async getRecipients(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
  ) {
    return this.messagesService.searchRecipients(user.id, search);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List user conversations with unread indicators and filtering' })
  async getUserConversations(
    @CurrentUser() user: AuthUser,
    @Query('type') type?: any,
    @Query('status') status?: any,
    @Query('isArchived') isArchived?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.getUserConversations(user.id, {
      type,
      status,
      isArchived: isArchived !== undefined ? isArchived === 'true' : undefined,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new direct thread, editorial inquiry, or support ticket' })
  async createConversation(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateConversationDtoClass,
  ) {
    return this.messagesService.createConversation(user, dto);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation details and full message history (BOLA protected)' })
  async getConversationDetail(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagesService.getConversationDetail(id, user);
  }

  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a reply message to an active conversation' })
  async addMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SendMessageDtoClass,
  ) {
    return this.messagesService.addMessage(id, user, dto);
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Update conversation read state' })
  async markRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagesService.updateReadState(id, user);
  }

  @Patch('conversations/:id/archive')
  @ApiOperation({ summary: 'Archive or unarchive a conversation' })
  async setArchived(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ArchiveConversationDtoClass,
  ) {
    return this.messagesService.setArchived(id, user, dto.isArchived);
  }

  @Post('broadcasts')
  @UseGuards(HighAssuranceAdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create and queue an administrative announcement broadcast (Admin only)' })
  async createBroadcast(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBroadcastDtoClass,
  ) {
    return this.messagesService.scheduleBroadcast(user, dto);
  }

  @Get('broadcasts')
  @ApiOperation({ summary: 'Get active broadcast announcements targeted to the current user' })
  async getUserBroadcasts(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.getUserBroadcasts(user, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post('broadcasts/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge/mark a broadcast announcement as read' })
  async markBroadcastRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagesService.markBroadcastRead(id, user);
  }
}
