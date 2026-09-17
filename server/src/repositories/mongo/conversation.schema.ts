// server/src/repositories/mongo/conversation.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversationDoc = ConversationSchemaClass & Document;
export type BroadcastDoc = BroadcastSchemaClass & Document;

@Schema({ collection: 'conversations', timestamps: true })
export class ConversationSchemaClass {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, required: true })
  subject: string;

  @Prop({ type: String, required: true })
  createdBy: string;

  @Prop({ type: String, required: true })
  createdByName: string;

  @Prop({ type: String, required: true, default: 'ACTIVE' })
  status: string;

  @Prop({ type: String, required: true, default: 'NORMAL' })
  priority: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop({ type: Array, default: [] })
  participants: Array<{
    conversationId?: string;
    userId: string;
    role: string;
    lastReadMessageId?: string | null;
    lastReadAt?: Date | null;
    isArchived?: boolean;
    isMuted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }>;

  @Prop({ type: Array, default: [] })
  messages: Array<{
    id: string;
    conversationId?: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    parentMessageId?: string | null;
    body: string;
    actionUrl?: string | null;
    actionLabel?: string | null;
    attachments?: any[];
    createdAt?: Date;
    updatedAt?: Date;
  }>;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;
}

export const ConversationSchema = SchemaFactory.createForClass(ConversationSchemaClass);
ConversationSchema.index({ 'participants.userId': 1, updatedAt: -1 });

@Schema({ collection: 'broadcasts', timestamps: true })
export class BroadcastSchemaClass {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  body: string;

  @Prop({ type: String, required: true })
  authorId: string;

  @Prop({ type: String, required: true })
  authorName: string;

  @Prop({ type: String, required: true, default: 'ALL' })
  targetRole: string;

  @Prop({ type: String, required: true, default: 'NORMAL' })
  priority: string;

  @Prop({ type: String, default: null })
  actionUrl?: string | null;

  @Prop({ type: String, default: null })
  actionLabel?: string | null;

  @Prop({ type: String, required: true, default: 'QUEUED' })
  status: string;

  @Prop({ type: Number, default: 0 })
  totalRecipients: number;

  @Prop({ type: Number, default: 0 })
  processedRecipients: number;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop({ type: Array, default: [] })
  recipients: Array<{
    userId: string;
    isRead: boolean;
    readAt?: Date | null;
    isDismissed?: boolean;
  }>;
}

export const BroadcastSchema = SchemaFactory.createForClass(BroadcastSchemaClass);
BroadcastSchema.index({ targetRole: 1, status: 1, createdAt: -1 });
