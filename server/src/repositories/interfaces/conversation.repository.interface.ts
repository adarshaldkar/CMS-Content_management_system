// server/src/repositories/interfaces/conversation.repository.interface.ts

import type {
  Conversation,
  Message,
  ConversationParticipant,
  Broadcast,
  BroadcastRecipientState,
  UserBroadcastItem,
  CreateConversationDto,
  SendMessageDto,
  CreateBroadcastDto,
  ConversationQueryFilters,
  PaginatedResult,
} from '../../domain/models';

export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');

export interface IConversationRepository {
  createConversation(
    dto: CreateConversationDto,
    creator: { id: string; name: string; role: string },
  ): Promise<Conversation>;

  findUserConversations(
    userId: string,
    filters?: ConversationQueryFilters,
  ): Promise<PaginatedResult<Conversation>>;

  findConversationById(
    conversationId: string,
    userId?: string,
  ): Promise<Conversation | null>;

  addMessage(
    conversationId: string,
    sender: { id: string; name: string; role: string },
    dto: SendMessageDto,
  ): Promise<Message>;

  findMessages(
    conversationId: string,
    options?: { limit?: number; before?: Date },
  ): Promise<Message[]>;

  updateParticipantReadState(
    conversationId: string,
    userId: string,
    lastReadMessageId?: string,
  ): Promise<void>;

  setConversationArchived(
    conversationId: string,
    userId: string,
    isArchived: boolean,
  ): Promise<void>;

  getUnreadCount(userId: string): Promise<number>;

  createBroadcast(
    author: { id: string; name: string },
    dto: CreateBroadcastDto,
  ): Promise<Broadcast>;

  findBroadcastById(broadcastId: string): Promise<Broadcast | null>;

  updateBroadcastStatus(
    broadcastId: string,
    status: string,
    totalRecipients?: number,
  ): Promise<void>;

  recordBroadcastRecipientBatch(
    broadcastId: string,
    userIds: string[],
  ): Promise<void>;

  findUserBroadcasts(
    userId: string,
    userRole: string,
    options?: { page?: number; limit?: number },
  ): Promise<PaginatedResult<UserBroadcastItem>>;

  markBroadcastRead(broadcastId: string, userId: string): Promise<void>;
}
