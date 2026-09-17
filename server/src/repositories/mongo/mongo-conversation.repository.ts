// server/src/repositories/mongo/mongo-conversation.repository.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import type {
  IConversationRepository,
} from '../interfaces/conversation.repository.interface';
import type {
  Conversation,
  Message,
  ConversationParticipant,
  Broadcast,
  UserBroadcastItem,
  CreateConversationDto,
  SendMessageDto,
  CreateBroadcastDto,
  ConversationQueryFilters,
  PaginatedResult,
} from '../../domain/models';
import { ConversationSchemaClass, BroadcastSchemaClass } from './conversation.schema';

@Injectable()
export class MongoConversationRepository implements IConversationRepository {
  constructor(
    @InjectModel(ConversationSchemaClass.name)
    private readonly convModel: Model<ConversationSchemaClass>,
    @InjectModel(BroadcastSchemaClass.name)
    private readonly bcModel: Model<BroadcastSchemaClass>,
  ) {}

  async createConversation(
    dto: CreateConversationDto,
    creator: { id: string; name: string; role: string },
  ): Promise<Conversation> {
    const convId = crypto.randomUUID();
    const msgId = crypto.randomUUID();
    const now = new Date();

    const initialMsg: Message = {
      id: msgId,
      conversationId: convId,
      senderId: creator.id,
      senderName: creator.name,
      senderRole: creator.role,
      body: dto.initialMessage,
      actionUrl: dto.actionUrl || null,
      actionLabel: dto.actionLabel || null,
      createdAt: now,
      updatedAt: now,
    };

    const allUserIds = Array.from(new Set([creator.id, ...(dto.recipientIds || [])]));
    const participants: ConversationParticipant[] = allUserIds.map((uid) => {
      const isCreator = uid === creator.id;
      return {
        conversationId: convId,
        userId: uid,
        role: isCreator ? 'OWNER' : 'RECIPIENT',
        lastReadMessageId: isCreator ? msgId : null,
        lastReadAt: isCreator ? now : null,
        isArchived: false,
        isMuted: false,
        createdAt: now,
        updatedAt: now,
      };
    });

    const created = new this.convModel({
      id: convId,
      type: dto.type,
      subject: dto.subject,
      createdBy: creator.id,
      createdByName: creator.name,
      status: 'ACTIVE',
      priority: dto.priority || 'NORMAL',
      metadata: dto.metadata || {},
      participants,
      messages: [initialMsg],
    });
    const doc: any = await created.save();

    return {
      id: doc.id,
      type: doc.type as any,
      subject: doc.subject,
      createdBy: doc.createdBy,
      createdByName: doc.createdByName,
      status: doc.status as any,
      priority: doc.priority as any,
      metadata: doc.metadata,
      participants,
      lastMessage: initialMsg,
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: doc.createdAt || now,
      updatedAt: doc.updatedAt || now,
    };
  }

  async findUserConversations(
    userId: string,
    filters: ConversationQueryFilters = {},
  ): Promise<PaginatedResult<Conversation>> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const query: any = {
      deletedAt: null,
      'participants.userId': userId,
    };

    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { subject: { $regex: filters.search, $options: 'i' } },
        { createdByName: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [docs, total] = await Promise.all([
      this.convModel
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.convModel.countDocuments(query),
    ]);

    const items: Conversation[] = (docs as any[]).map((d: any) => {
      const part = d.participants?.find((p: any) => p.userId === userId);
      const lastMsg = d.messages?.[d.messages.length - 1] || null;
      let unreadCount = 0;
      if (part && d.messages) {
        const lastRead = part.lastReadAt ? new Date(part.lastReadAt).getTime() : 0;
        unreadCount = d.messages.filter((m: any) => new Date(m.createdAt).getTime() > lastRead).length;
      }

      return {
        id: d.id,
        type: d.type,
        subject: d.subject,
        createdBy: d.createdBy,
        createdByName: d.createdByName,
        status: d.status,
        priority: d.priority,
        metadata: d.metadata,
        participants: d.participants,
        lastMessage: lastMsg,
        lastMessageAt: lastMsg?.createdAt || d.updatedAt,
        unreadCount,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findConversationById(
    conversationId: string,
    userId?: string,
  ): Promise<Conversation | null> {
    const query: any = { id: conversationId, deletedAt: null };
    if (userId) {
      query['participants.userId'] = userId;
    }

    const d: any = await this.convModel.findOne(query).lean();
    if (!d) return null;

    const lastMsg = d.messages?.[d.messages.length - 1] || null;

    return {
      id: d.id,
      type: d.type,
      subject: d.subject,
      createdBy: d.createdBy,
      createdByName: d.createdByName,
      status: d.status,
      priority: d.priority,
      metadata: d.metadata,
      participants: d.participants,
      lastMessage: lastMsg,
      lastMessageAt: lastMsg?.createdAt || d.updatedAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  async addMessage(
    conversationId: string,
    sender: { id: string; name: string; role: string },
    dto: SendMessageDto,
  ): Promise<Message> {
    const msgId = crypto.randomUUID();
    const now = new Date();

    const msg: Message = {
      id: msgId,
      conversationId,
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      parentMessageId: dto.parentMessageId || null,
      body: dto.body,
      actionUrl: dto.actionUrl || null,
      actionLabel: dto.actionLabel || null,
      attachments: dto.attachments || [],
      createdAt: now,
      updatedAt: now,
    };

    await this.convModel.updateOne(
      { id: conversationId },
      {
        $push: { messages: msg },
        $set: {
          updatedAt: now,
          'participants.$[elem].lastReadMessageId': msgId,
          'participants.$[elem].lastReadAt': now,
          'participants.$[elem].updatedAt': now,
        },
      },
      {
        arrayFilters: [{ 'elem.userId': sender.id }],
      },
    );

    return msg;
  }

  async findMessages(
    conversationId: string,
    options: { limit?: number; before?: Date } = {},
  ): Promise<Message[]> {
    const d: any = await this.convModel.findOne({ id: conversationId }).lean();
    if (!d || !d.messages) return [];

    let list: Message[] = d.messages;
    if (options.before) {
      const bTime = new Date(options.before).getTime();
      list = list.filter((m) => new Date(m.createdAt).getTime() < bTime);
    }

    const limit = options.limit ?? 50;
    return list.slice(0, limit);
  }

  async updateParticipantReadState(
    conversationId: string,
    userId: string,
    lastReadMessageId?: string,
  ): Promise<void> {
    const now = new Date();
    await this.convModel.updateOne(
      { id: conversationId, 'participants.userId': userId },
      {
        $set: {
          'participants.$.lastReadMessageId': lastReadMessageId || null,
          'participants.$.lastReadAt': now,
          'participants.$.updatedAt': now,
        },
      },
    );
  }

  async setConversationArchived(
    conversationId: string,
    userId: string,
    isArchived: boolean,
  ): Promise<void> {
    await this.convModel.updateOne(
      { id: conversationId, 'participants.userId': userId },
      {
        $set: {
          'participants.$.isArchived': isArchived,
          'participants.$.updatedAt': new Date(),
        },
      },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    const convs: any[] = await this.convModel
      .find({ 'participants.userId': userId, deletedAt: null })
      .lean();

    let total = 0;
    for (const c of convs) {
      const part = c.participants?.find((p: any) => p.userId === userId);
      if (part && c.messages) {
        const lastRead = part.lastReadAt ? new Date(part.lastReadAt).getTime() : 0;
        total += c.messages.filter(
          (m: any) => m.senderId !== userId && new Date(m.createdAt).getTime() > lastRead,
        ).length;
      }
    }

    const bcCount = await this.bcModel.countDocuments({
      status: 'COMPLETED',
      'recipients.userId': userId,
      'recipients.isRead': false,
    });

    return total + bcCount;
  }

  async createBroadcast(
    author: { id: string; name: string },
    dto: CreateBroadcastDto,
  ): Promise<Broadcast> {
    const bcId = crypto.randomUUID();
    const created = new this.bcModel({
      id: bcId,
      title: dto.title,
      body: dto.body,
      authorId: author.id,
      authorName: author.name,
      targetRole: dto.targetRole || 'ALL',
      priority: dto.priority || 'NORMAL',
      actionUrl: dto.actionUrl || null,
      actionLabel: dto.actionLabel || null,
      status: 'QUEUED',
      totalRecipients: 0,
      processedRecipients: 0,
      metadata: dto.metadata || {},
      recipients: [],
    });
    const doc: any = await created.save();

    return {
      id: doc.id,
      title: doc.title,
      body: doc.body,
      authorId: doc.authorId,
      authorName: doc.authorName,
      targetRole: doc.targetRole as any,
      priority: doc.priority as any,
      actionUrl: doc.actionUrl,
      actionLabel: doc.actionLabel,
      status: doc.status as any,
      totalRecipients: doc.totalRecipients,
      processedRecipients: doc.processedRecipients,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findBroadcastById(broadcastId: string): Promise<Broadcast | null> {
    const doc: any = await this.bcModel.findOne({ id: broadcastId }).lean();
    if (!doc) return null;
    return {
      id: doc.id,
      title: doc.title,
      body: doc.body,
      authorId: doc.authorId,
      authorName: doc.authorName,
      targetRole: doc.targetRole,
      priority: doc.priority,
      actionUrl: doc.actionUrl,
      actionLabel: doc.actionLabel,
      status: doc.status,
      totalRecipients: doc.totalRecipients,
      processedRecipients: doc.processedRecipients,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async updateBroadcastStatus(
    broadcastId: string,
    status: string,
    totalRecipients?: number,
  ): Promise<void> {
    const update: any = { status };
    if (totalRecipients !== undefined) {
      update.totalRecipients = totalRecipients;
      update.processedRecipients = totalRecipients;
    }
    await this.bcModel.updateOne({ id: broadcastId }, { $set: update });
  }

  async recordBroadcastRecipientBatch(
    broadcastId: string,
    userIds: string[],
  ): Promise<void> {
    const items = userIds.map((uid) => ({
      userId: uid,
      isRead: false,
      isDismissed: false,
    }));
    await this.bcModel.updateOne(
      { id: broadcastId },
      { $push: { recipients: { $each: items } } },
    );
  }

  async findUserBroadcasts(
    userId: string,
    userRole: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<PaginatedResult<UserBroadcastItem>> {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const query: any = {
      status: 'COMPLETED',
      $or: [{ targetRole: 'ALL' }, { targetRole: userRole }],
    };

    const [docs, total] = await Promise.all([
      this.bcModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.bcModel.countDocuments(query),
    ]);

    const items: UserBroadcastItem[] = (docs as any[]).map((d: any) => {
      const recip = d.recipients?.find((r: any) => r.userId === userId);
      return {
        id: d.id,
        title: d.title,
        body: d.body,
        authorId: d.authorId,
        authorName: d.authorName,
        targetRole: d.targetRole,
        priority: d.priority,
        actionUrl: d.actionUrl,
        actionLabel: d.actionLabel,
        status: d.status,
        totalRecipients: d.totalRecipients,
        processedRecipients: d.processedRecipients,
        metadata: d.metadata,
        isRead: recip?.isRead ?? false,
        readAt: recip?.readAt ?? null,
        isDismissed: recip?.isDismissed ?? false,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async markBroadcastRead(broadcastId: string, userId: string): Promise<void> {
    const now = new Date();
    await this.bcModel.updateOne(
      { id: broadcastId, 'recipients.userId': userId },
      {
        $set: {
          'recipients.$.isRead': true,
          'recipients.$.readAt': now,
        },
      },
    );
  }
}
