// server/src/repositories/seamless/seamless-conversation.repository.ts

import { Injectable, Logger } from '@nestjs/common';
import type {
  IConversationRepository,
} from '../interfaces/conversation.repository.interface';
import { PostgresConversationRepository } from '../postgres/postgres-conversation.repository';
import { MongoConversationRepository } from '../mongo/mongo-conversation.repository';
import type {
  Conversation,
  Message,
  Broadcast,
  UserBroadcastItem,
  CreateConversationDto,
  SendMessageDto,
  CreateBroadcastDto,
  ConversationQueryFilters,
  PaginatedResult,
} from '../../domain/models';

@Injectable()
export class SeamlessConversationRepository implements IConversationRepository {
  private readonly logger = new Logger(SeamlessConversationRepository.name);

  constructor(
    private readonly postgresRepo: PostgresConversationRepository,
    private readonly mongoRepo: MongoConversationRepository,
  ) {}

  private getPrimary(): IConversationRepository {
    const active = (process.env.ACTIVE_DATABASE || 'postgres').toLowerCase();
    return active === 'mongodb' ? this.mongoRepo : this.postgresRepo;
  }

  private getSecondary(): IConversationRepository {
    const active = (process.env.ACTIVE_DATABASE || 'postgres').toLowerCase();
    return active === 'mongodb' ? this.postgresRepo : this.mongoRepo;
  }

  async createConversation(
    dto: CreateConversationDto,
    creator: { id: string; name: string; role: string },
  ): Promise<Conversation> {
    const primary = this.getPrimary();
    const result = await primary.createConversation(dto, creator);

    // Asynchronous peer sync
    this.getSecondary()
      .createConversation(dto, creator)
      .catch((err) => this.logger.debug(`Secondary peer conversation sync note: ${err.message}`));

    return result;
  }

  async findUserConversations(
    userId: string,
    filters?: ConversationQueryFilters,
  ): Promise<PaginatedResult<Conversation>> {
    try {
      return await this.getPrimary().findUserConversations(userId, filters);
    } catch (err: any) {
      this.logger.warn(`Primary conversations query failed, falling back to secondary: ${err.message}`);
      return this.getSecondary().findUserConversations(userId, filters);
    }
  }

  async findConversationById(
    conversationId: string,
    userId?: string,
  ): Promise<Conversation | null> {
    try {
      return await this.getPrimary().findConversationById(conversationId, userId);
    } catch (err: any) {
      this.logger.warn(`Primary conversation lookup failed, falling back to secondary: ${err.message}`);
      return this.getSecondary().findConversationById(conversationId, userId);
    }
  }

  async addMessage(
    conversationId: string,
    sender: { id: string; name: string; role: string },
    dto: SendMessageDto,
  ): Promise<Message> {
    const primary = this.getPrimary();
    const result = await primary.addMessage(conversationId, sender, dto);

    // Asynchronous peer sync
    this.getSecondary()
      .addMessage(conversationId, sender, dto)
      .catch((err) => this.logger.debug(`Secondary peer message sync note: ${err.message}`));

    return result;
  }

  async findMessages(
    conversationId: string,
    options?: { limit?: number; before?: Date },
  ): Promise<Message[]> {
    try {
      return await this.getPrimary().findMessages(conversationId, options);
    } catch (err: any) {
      this.logger.warn(`Primary messages lookup failed, falling back to secondary: ${err.message}`);
      return this.getSecondary().findMessages(conversationId, options);
    }
  }

  async updateParticipantReadState(
    conversationId: string,
    userId: string,
    lastReadMessageId?: string,
  ): Promise<void> {
    await this.getPrimary().updateParticipantReadState(conversationId, userId, lastReadMessageId);
    this.getSecondary()
      .updateParticipantReadState(conversationId, userId, lastReadMessageId)
      .catch(() => {});
  }

  async setConversationArchived(
    conversationId: string,
    userId: string,
    isArchived: boolean,
  ): Promise<void> {
    await this.getPrimary().setConversationArchived(conversationId, userId, isArchived);
    this.getSecondary()
      .setConversationArchived(conversationId, userId, isArchived)
      .catch(() => {});
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.getPrimary().getUnreadCount(userId);
    } catch (err: any) {
      return this.getSecondary().getUnreadCount(userId);
    }
  }

  async createBroadcast(
    author: { id: string; name: string },
    dto: CreateBroadcastDto,
  ): Promise<Broadcast> {
    const primary = this.getPrimary();
    const result = await primary.createBroadcast(author, dto);

    this.getSecondary()
      .createBroadcast(author, dto)
      .catch((err) => this.logger.debug(`Secondary peer broadcast sync note: ${err.message}`));

    return result;
  }

  async findBroadcastById(broadcastId: string): Promise<Broadcast | null> {
    try {
      return await this.getPrimary().findBroadcastById(broadcastId);
    } catch (err: any) {
      return this.getSecondary().findBroadcastById(broadcastId);
    }
  }

  async updateBroadcastStatus(
    broadcastId: string,
    status: string,
    totalRecipients?: number,
  ): Promise<void> {
    await this.getPrimary().updateBroadcastStatus(broadcastId, status, totalRecipients);
    this.getSecondary()
      .updateBroadcastStatus(broadcastId, status, totalRecipients)
      .catch(() => {});
  }

  async recordBroadcastRecipientBatch(
    broadcastId: string,
    userIds: string[],
  ): Promise<void> {
    await this.getPrimary().recordBroadcastRecipientBatch(broadcastId, userIds);
    this.getSecondary()
      .recordBroadcastRecipientBatch(broadcastId, userIds)
      .catch(() => {});
  }

  async findUserBroadcasts(
    userId: string,
    userRole: string,
    options?: { page?: number; limit?: number },
  ): Promise<PaginatedResult<UserBroadcastItem>> {
    try {
      return await this.getPrimary().findUserBroadcasts(userId, userRole, options);
    } catch (err: any) {
      return this.getSecondary().findUserBroadcasts(userId, userRole, options);
    }
  }

  async markBroadcastRead(broadcastId: string, userId: string): Promise<void> {
    await this.getPrimary().markBroadcastRead(broadcastId, userId);
    this.getSecondary()
      .markBroadcastRead(broadcastId, userId)
      .catch(() => {});
  }
}
