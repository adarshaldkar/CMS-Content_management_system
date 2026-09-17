// server/src/domain/conversation.model.ts

export type ConversationType =
  | 'DIRECT'
  | 'EDITORIAL_INQUIRY'
  | 'SUPPORT_TICKET'
  | 'SECURITY_BULLETIN'
  | 'DMCA_DISPUTE';

export type ConversationStatus = 'ACTIVE' | 'RESOLVED' | 'CLOSED' | 'ARCHIVED';

export type MessagePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type BroadcastTargetRole =
  | 'ALL'
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'EDITOR'
  | 'AUTHOR'
  | 'SUBSCRIBER'
  | 'USER';

export type BroadcastStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

export interface ConversationParticipant {
  conversationId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  lastReadMessageId: string | null;
  lastReadAt: Date | null;
  isArchived: boolean;
  isMuted: boolean;
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageAttachment {
  url: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  parentMessageId?: string | null;
  body: string;
  attachments?: MessageAttachment[];
  actionUrl?: string | null;
  actionLabel?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  subject: string;
  createdBy: string;
  createdByName?: string;
  status: ConversationStatus;
  priority: MessagePriority;
  metadata?: Record<string, any>;
  participants: ConversationParticipant[];
  lastMessage?: Message | null;
  lastMessageAt?: Date;
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Broadcast {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  targetRole: BroadcastTargetRole;
  priority: MessagePriority;
  actionUrl?: string | null;
  actionLabel?: string | null;
  status: BroadcastStatus;
  totalRecipients: number;
  processedRecipients?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BroadcastRecipientState {
  broadcastId: string;
  userId: string;
  isRead: boolean;
  readAt: Date | null;
  isDismissed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserBroadcastItem extends Broadcast {
  isRead: boolean;
  readAt: Date | null;
  isDismissed: boolean;
}

export interface CreateConversationDto {
  type: ConversationType;
  subject: string;
  recipientIds: string[];
  initialMessage: string;
  priority?: MessagePriority;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

export interface SendMessageDto {
  body: string;
  parentMessageId?: string;
  actionUrl?: string;
  actionLabel?: string;
  attachments?: MessageAttachment[];
}

export interface CreateBroadcastDto {
  title: string;
  body: string;
  targetRole?: BroadcastTargetRole;
  priority?: MessagePriority;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

export interface ConversationQueryFilters {
  type?: ConversationType;
  status?: ConversationStatus;
  isArchived?: boolean;
  unreadOnly?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}
