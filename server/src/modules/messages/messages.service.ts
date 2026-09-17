// server/src/modules/messages/messages.service.ts

import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '../../bull/bull-queue.constants';
import {
  CONVERSATION_REPOSITORY,
  type IConversationRepository,
} from '../../repositories/interfaces/conversation.repository.interface';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../repositories/interfaces/user.repository.interface';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import {
  AuditEventType,
  type AuthUser,
  type Conversation,
  type Message,
  type Broadcast,
  type UserBroadcastItem,
  type CreateConversationDto,
  type SendMessageDto,
  type CreateBroadcastDto,
  type ConversationQueryFilters,
  type PaginatedResult,
} from '../../domain/models';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly convRepo: IConversationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    private readonly redisService: RedisService,
    private readonly auditService: AuditService,
    @InjectQueue(QUEUE_NAMES.BROADCAST_FANOUT)
    private readonly broadcastQueue: Queue,
  ) {}

  /**
   * Sanitizes markdown text by stripping script tags and hazardous protocols
   */
  private sanitizeContent(text: string): string {
    if (!text) return '';
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/onload=/gi, 'data-onload=')
      .replace(/onerror=/gi, 'data-onerror=');
  }

  /**
   * Publish real-time messaging event to Redis
   */
  private async publishRealtimeEvent(channel: string, event: Record<string, any>): Promise<void> {
    if (this.redisService.isHealthy()) {
      const client = this.redisService.getClient();
      if (client) {
        try {
          await client.publish(channel, JSON.stringify(event));
        } catch (err: any) {
          this.logger.warn(`Redis message pub/sub error: ${err.message}`);
        }
      }
    }
  }

  async createConversation(
    creator: AuthUser,
    dto: CreateConversationDto,
  ): Promise<Conversation> {
    // 1. Verify recipient users exist
    const recipientIds = dto.recipientIds || [];
    for (const rid of recipientIds) {
      const recipient = await this.userRepo.findById(rid);
      if (!recipient) {
        throw new NotFoundException(`Recipient with ID '${rid}' not found.`);
      }
    }

    // 2. Sanitize initial message
    const sanitizedInitial = this.sanitizeContent(dto.initialMessage);

    // 3. Create conversation & initial message in persistence mesh
    const conversation = await this.convRepo.createConversation(
      {
        ...dto,
        initialMessage: sanitizedInitial,
      },
      {
        id: creator.id,
        name: creator.name,
        role: creator.role,
      },
    );

    // 4. Emit real-time event for recipients
    for (const rid of recipientIds) {
      await this.publishRealtimeEvent(`channel:inbox:${rid}`, {
        type: 'NEW_CONVERSATION',
        conversationId: conversation.id,
        subject: conversation.subject,
        fromName: creator.name,
        createdAt: conversation.createdAt,
      });
    }

    // 5. Audit log
    await this.auditService.log({
      actorId: creator.id,
      action: AuditEventType.SYSTEM_ALERT,
      resource: `Conversation:${conversation.id}`,
      result: 'SUCCESS',
      metadata: {
        type: conversation.type,
        recipientsCount: recipientIds.length,
      },
    });

    return conversation;
  }

  async getUserConversations(
    userId: string,
    filters?: ConversationQueryFilters,
  ): Promise<PaginatedResult<Conversation>> {
    return this.convRepo.findUserConversations(userId, filters);
  }

  async getConversationDetail(
    conversationId: string,
    user: AuthUser,
  ): Promise<Conversation & { messages: Message[] }> {
    // 1. BOLA Check: verify user is a valid participant of this conversation
    const conversation = await this.convRepo.findConversationById(conversationId, user.id);
    if (!conversation) {
      throw new ForbiddenException('Access denied: You are not a participant in this conversation.');
    }

    // 2. Fetch full message thread
    const messages = await this.convRepo.findMessages(conversationId, { limit: 100 });

    // 3. Automatically update user's read bookmark
    const latestMsg = messages[messages.length - 1];
    if (latestMsg) {
      await this.convRepo.updateParticipantReadState(conversationId, user.id, latestMsg.id);
    }

    return {
      ...conversation,
      messages,
    };
  }

  async addMessage(
    conversationId: string,
    sender: AuthUser,
    dto: SendMessageDto,
  ): Promise<Message> {
    // 1. BOLA Check: verify sender participates in conversation
    const conversation = await this.convRepo.findConversationById(conversationId, sender.id);
    if (!conversation) {
      throw new ForbiddenException('Access denied: You are not a participant in this conversation.');
    }

    if (conversation.status === 'CLOSED') {
      throw new ForbiddenException('This conversation is closed and cannot receive new replies.');
    }

    // 2. Sanitize message body
    const sanitizedBody = this.sanitizeContent(dto.body);

    // 3. Add message to persistence mesh
    const message = await this.convRepo.addMessage(
      conversationId,
      {
        id: sender.id,
        name: sender.name,
        role: sender.role,
      },
      {
        ...dto,
        body: sanitizedBody,
      },
    );

    // 4. Notify other participants in real-time
    const otherParticipants = conversation.participants.filter((p) => p.userId !== sender.id);
    for (const p of otherParticipants) {
      await this.publishRealtimeEvent(`channel:inbox:${p.userId}`, {
        type: 'NEW_MESSAGE',
        conversationId,
        messageId: message.id,
        senderName: sender.name,
        createdAt: message.createdAt,
      });
    }

    return message;
  }

  async updateReadState(conversationId: string, user: AuthUser): Promise<{ success: boolean }> {
    const conversation = await this.convRepo.findConversationById(conversationId, user.id);
    if (!conversation) {
      throw new ForbiddenException('Access denied: You are not a participant in this conversation.');
    }

    await this.convRepo.updateParticipantReadState(conversationId, user.id);
    return { success: true };
  }

  async setArchived(
    conversationId: string,
    user: AuthUser,
    isArchived: boolean,
  ): Promise<{ success: boolean }> {
    const conversation = await this.convRepo.findConversationById(conversationId, user.id);
    if (!conversation) {
      throw new ForbiddenException('Access denied: You are not a participant in this conversation.');
    }

    await this.convRepo.setConversationArchived(conversationId, user.id, isArchived);
    return { success: true };
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.convRepo.getUnreadCount(userId);
    return { unreadCount };
  }

  async scheduleBroadcast(
    author: AuthUser,
    dto: CreateBroadcastDto,
  ): Promise<Broadcast> {
    const sanitizedBody = this.sanitizeContent(dto.body);

    // 1. Create Broadcast entity in QUEUED state
    const broadcast = await this.convRepo.createBroadcast(
      { id: author.id, name: author.name },
      { ...dto, body: sanitizedBody },
    );

    // 2. Enqueue async BullMQ job for non-blocking audience fan-out
    await this.broadcastQueue.add(
      JOB_NAMES.DISPATCH_BROADCAST_BATCH,
      {
        broadcastId: broadcast.id,
        targetRole: broadcast.targetRole,
        authorId: author.id,
        title: broadcast.title,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 100,
        removeOnFail: false,
      },
    );

    this.logger.log(`[MessagesService] Broadcast ${broadcast.id} queued for asynchronous delivery.`);
    return broadcast;
  }

  async getUserBroadcasts(
    user: AuthUser,
    options?: { page?: number; limit?: number },
  ): Promise<PaginatedResult<UserBroadcastItem>> {
    return this.convRepo.findUserBroadcasts(user.id, user.role, options);
  }

  async markBroadcastRead(broadcastId: string, user: AuthUser): Promise<{ success: boolean }> {
    await this.convRepo.markBroadcastRead(broadcastId, user.id);
    return { success: true };
  }
}
