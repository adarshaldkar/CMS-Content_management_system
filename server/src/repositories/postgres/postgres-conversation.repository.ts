// server/src/repositories/postgres/postgres-conversation.repository.ts

import { Injectable, Logger } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import { PostgresService } from '../../database/postgres.service';
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

@Injectable()
export class PostgresConversationRepository implements IConversationRepository {
  private readonly logger = new Logger(PostgresConversationRepository.name);
  private ready: Promise<void> | null = null;

  constructor(private readonly postgres: PostgresService) {}

  private async ensureSchema(): Promise<void> {
    this.ready ??= this.postgres.pool
      .query(
        `
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS cms_conversations (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          type text NOT NULL,
          subject text NOT NULL,
          created_by text NOT NULL,
          created_by_name text NOT NULL,
          status text NOT NULL DEFAULT 'ACTIVE',
          priority text NOT NULL DEFAULT 'NORMAL',
          metadata jsonb,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          deleted_at timestamptz
        );

        CREATE TABLE IF NOT EXISTS cms_messages (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id uuid NOT NULL REFERENCES cms_conversations(id) ON DELETE CASCADE,
          sender_id text NOT NULL,
          sender_name text NOT NULL,
          sender_role text NOT NULL,
          parent_message_id uuid,
          body text NOT NULL,
          attachments jsonb,
          action_url text,
          action_label text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          deleted_at timestamptz
        );

        CREATE TABLE IF NOT EXISTS cms_conversation_participants (
          conversation_id uuid NOT NULL REFERENCES cms_conversations(id) ON DELETE CASCADE,
          user_id text NOT NULL,
          role text NOT NULL DEFAULT 'PARTICIPANT',
          last_read_message_id uuid,
          last_read_at timestamptz,
          is_archived boolean NOT NULL DEFAULT false,
          is_muted boolean NOT NULL DEFAULT false,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (conversation_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS cms_broadcasts (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          title text NOT NULL,
          body text NOT NULL,
          author_id text NOT NULL,
          author_name text NOT NULL,
          target_role text NOT NULL DEFAULT 'ALL',
          priority text NOT NULL DEFAULT 'NORMAL',
          action_url text,
          action_label text,
          status text NOT NULL DEFAULT 'QUEUED',
          total_recipients integer NOT NULL DEFAULT 0,
          processed_recipients integer NOT NULL DEFAULT 0,
          metadata jsonb,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS cms_broadcast_recipients (
          broadcast_id uuid NOT NULL REFERENCES cms_broadcasts(id) ON DELETE CASCADE,
          user_id text NOT NULL,
          is_read boolean NOT NULL DEFAULT false,
          read_at timestamptz,
          is_dismissed boolean NOT NULL DEFAULT false,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (broadcast_id, user_id)
        );

        CREATE INDEX IF NOT EXISTS idx_cms_conv_user ON cms_conversation_participants(user_id);
        CREATE INDEX IF NOT EXISTS idx_cms_conv_created ON cms_conversations(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_cms_msg_conv ON cms_messages(conversation_id, created_at ASC);
        CREATE INDEX IF NOT EXISTS idx_cms_bc_target ON cms_broadcasts(target_role, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_cms_bc_recip ON cms_broadcast_recipients(user_id, is_read);
      `,
      )
      .then(() => undefined);

    await this.ready;
  }

  private mapMessage(row: any): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderRole: row.sender_role,
      parentMessageId: row.parent_message_id || null,
      body: row.body,
      attachments: row.attachments || [],
      actionUrl: row.action_url || null,
      actionLabel: row.action_label || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at || null,
    };
  }

  async createConversation(
    dto: CreateConversationDto,
    creator: { id: string; name: string; role: string },
  ): Promise<Conversation> {
    await this.ensureSchema();
    const client = await this.postgres.pool.connect();

    try {
      await client.query('BEGIN');

      const convRes = await client.query(
        `INSERT INTO cms_conversations (
           type, subject, created_by, created_by_name, status, priority, metadata
         )
         VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6)
         RETURNING *`,
        [
          dto.type,
          dto.subject,
          creator.id,
          creator.name,
          dto.priority || 'NORMAL',
          dto.metadata ? JSON.stringify(dto.metadata) : null,
        ],
      );
      const convRow = convRes.rows[0];

      // Add initial message
      const msgRes = await client.query(
        `INSERT INTO cms_messages (
           conversation_id, sender_id, sender_name, sender_role, body, action_url, action_label
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          convRow.id,
          creator.id,
          creator.name,
          creator.role,
          dto.initialMessage,
          dto.actionUrl || null,
          dto.actionLabel || null,
        ],
      );
      const initialMsg = this.mapMessage(msgRes.rows[0]);

      // Add creator participant (marked as read up to initial message)
      const allUserIds = Array.from(new Set([creator.id, ...(dto.recipientIds || [])]));
      const participants: ConversationParticipant[] = [];

      for (const uid of allUserIds) {
        const isCreator = uid === creator.id;
        const partRes = await client.query(
          `INSERT INTO cms_conversation_participants (
             conversation_id, user_id, role, last_read_message_id, last_read_at
           )
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            convRow.id,
            uid,
            isCreator ? 'OWNER' : 'RECIPIENT',
            isCreator ? initialMsg.id : null,
            isCreator ? new Date() : null,
          ],
        );
        const p = partRes.rows[0];
        participants.push({
          conversationId: p.conversation_id,
          userId: p.user_id,
          lastReadMessageId: p.last_read_message_id,
          lastReadAt: p.last_read_at,
          isArchived: p.is_archived,
          isMuted: p.is_muted,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        });
      }

      await client.query('COMMIT');

      return {
        id: convRow.id,
        type: convRow.type,
        subject: convRow.subject,
        createdBy: convRow.created_by,
        createdByName: convRow.created_by_name,
        status: convRow.status,
        priority: convRow.priority,
        metadata: convRow.metadata,
        participants,
        lastMessage: initialMsg,
        lastMessageAt: initialMsg.createdAt,
        unreadCount: 0,
        createdAt: convRow.created_at,
        updatedAt: convRow.updated_at,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findUserConversations(
    userId: string,
    filters: ConversationQueryFilters = {},
  ): Promise<PaginatedResult<Conversation>> {
    await this.ensureSchema();
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const values: unknown[] = [userId];
    let query = `
      SELECT c.*, p.is_archived, p.is_muted, p.last_read_at, p.last_read_message_id,
             (
               SELECT count(*)::int
               FROM cms_messages m
               WHERE m.conversation_id = c.id
                 AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)
             ) as unread_count,
             (
               SELECT row_to_json(m)
               FROM (
                 SELECT * FROM cms_messages
                 WHERE conversation_id = c.id
                 ORDER BY created_at DESC
                 LIMIT 1
               ) m
             ) as last_message_json
      FROM cms_conversations c
      JOIN cms_conversation_participants p ON p.conversation_id = c.id AND p.user_id = $1
      WHERE c.deleted_at IS NULL
    `;

    if (filters.isArchived !== undefined) {
      values.push(filters.isArchived);
      query += ` AND p.is_archived = $${values.length}`;
    }

    if (filters.type) {
      values.push(filters.type);
      query += ` AND c.type = $${values.length}`;
    }

    if (filters.status) {
      values.push(filters.status);
      query += ` AND c.status = $${values.length}`;
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      query += ` AND (c.subject ILIKE $${values.length} OR c.created_by_name ILIKE $${values.length})`;
    }

    // Count
    const countRes = await this.postgres.pool.query(
      `SELECT count(*)::int as total FROM (${query}) q`,
      values,
    );
    const total = countRes.rows[0]?.total ?? 0;

    values.push(limit, offset);
    query += ` ORDER BY c.updated_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const dataRes = await this.postgres.pool.query(query, values);

    const items: Conversation[] = dataRes.rows.map((row) => ({
      id: row.id,
      type: row.type,
      subject: row.subject,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      status: row.status,
      priority: row.priority,
      metadata: row.metadata,
      participants: [
        {
          conversationId: row.id,
          userId,
          lastReadMessageId: row.last_read_message_id,
          lastReadAt: row.last_read_at,
          isArchived: row.is_archived,
          isMuted: row.is_muted,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      ],
      lastMessage: row.last_message_json ? this.mapMessage(row.last_message_json) : null,
      lastMessageAt: row.last_message_json?.created_at || row.updated_at,
      unreadCount: row.unread_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

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
    await this.ensureSchema();

    // If userId provided, check participant membership (BOLA protection)
    if (userId) {
      const partCheck = await this.postgres.pool.query(
        `SELECT * FROM cms_conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId],
      );
      if (partCheck.rows.length === 0) {
        return null;
      }
    }

    const convRes = await this.postgres.pool.query(
      `SELECT * FROM cms_conversations WHERE id = $1 AND deleted_at IS NULL`,
      [conversationId],
    );
    if (!convRes.rows[0]) return null;

    const row = convRes.rows[0];

    const partRes = await this.postgres.pool.query(
      `SELECT p.*, u.name as user_name, u.email as user_email, u.role as user_role
       FROM cms_conversation_participants p
       LEFT JOIN cms_users u ON u.id::text = p.user_id
       WHERE p.conversation_id = $1`,
      [conversationId],
    );

    const participants: ConversationParticipant[] = partRes.rows.map((p) => ({
      conversationId: p.conversation_id,
      userId: p.user_id,
      userName: p.user_name,
      userEmail: p.user_email,
      userRole: p.user_role,
      lastReadMessageId: p.last_read_message_id,
      lastReadAt: p.last_read_at,
      isArchived: p.is_archived,
      isMuted: p.is_muted,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    const lastMsgRes = await this.postgres.pool.query(
      `SELECT * FROM cms_messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [conversationId],
    );
    const lastMsg = lastMsgRes.rows[0] ? this.mapMessage(lastMsgRes.rows[0]) : null;

    return {
      id: row.id,
      type: row.type,
      subject: row.subject,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      status: row.status,
      priority: row.priority,
      metadata: row.metadata,
      participants,
      lastMessage: lastMsg,
      lastMessageAt: lastMsg?.createdAt || row.updated_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async addMessage(
    conversationId: string,
    sender: { id: string; name: string; role: string },
    dto: SendMessageDto,
  ): Promise<Message> {
    await this.ensureSchema();
    const client = await this.postgres.pool.connect();

    try {
      await client.query('BEGIN');

      const msgRes = await client.query(
        `INSERT INTO cms_messages (
           conversation_id, sender_id, sender_name, sender_role, parent_message_id,
           body, action_url, action_label, attachments
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          conversationId,
          sender.id,
          sender.name,
          sender.role,
          dto.parentMessageId || null,
          dto.body,
          dto.actionUrl || null,
          dto.actionLabel || null,
          dto.attachments ? JSON.stringify(dto.attachments) : null,
        ],
      );
      const msg = this.mapMessage(msgRes.rows[0]);

      // Update conversation updated_at
      await client.query(
        `UPDATE cms_conversations SET updated_at = now() WHERE id = $1`,
        [conversationId],
      );

      // Update sender's read bookmark to current message
      await client.query(
        `UPDATE cms_conversation_participants
         SET last_read_message_id = $1, last_read_at = now(), updated_at = now()
         WHERE conversation_id = $2 AND user_id = $3`,
        [msg.id, conversationId, sender.id],
      );

      await client.query('COMMIT');
      return msg;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findMessages(
    conversationId: string,
    options: { limit?: number; before?: Date } = {},
  ): Promise<Message[]> {
    await this.ensureSchema();
    const limit = Math.min(options.limit ?? 50, 100);
    const values: unknown[] = [conversationId];
    let query = `SELECT * FROM cms_messages WHERE conversation_id = $1 AND deleted_at IS NULL`;

    if (options.before) {
      values.push(options.before);
      query += ` AND created_at < $${values.length}`;
    }

    values.push(limit);
    query += ` ORDER BY created_at ASC LIMIT $${values.length}`;

    const res = await this.postgres.pool.query(query, values);
    return res.rows.map((row) => this.mapMessage(row));
  }

  async updateParticipantReadState(
    conversationId: string,
    userId: string,
    lastReadMessageId?: string,
  ): Promise<void> {
    await this.ensureSchema();
    if (lastReadMessageId) {
      await this.postgres.pool.query(
        `UPDATE cms_conversation_participants
         SET last_read_message_id = $1, last_read_at = now(), updated_at = now()
         WHERE conversation_id = $2 AND user_id = $3`,
        [lastReadMessageId, conversationId, userId],
      );
    } else {
      await this.postgres.pool.query(
        `UPDATE cms_conversation_participants
         SET last_read_at = now(), updated_at = now()
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId],
      );
    }
  }

  async setConversationArchived(
    conversationId: string,
    userId: string,
    isArchived: boolean,
  ): Promise<void> {
    await this.ensureSchema();
    await this.postgres.pool.query(
      `UPDATE cms_conversation_participants
       SET is_archived = $1, updated_at = now()
       WHERE conversation_id = $2 AND user_id = $3`,
      [isArchived, conversationId, userId],
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    await this.ensureSchema();
    const query = `
      SELECT (
        COALESCE(
          (
            SELECT count(*)::int
            FROM cms_messages m
            JOIN cms_conversation_participants p ON p.conversation_id = m.conversation_id
            WHERE p.user_id = $1
              AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)
              AND m.sender_id != $1
          ), 0
        )
        +
        COALESCE(
          (
            SELECT count(*)::int
            FROM cms_broadcast_recipients br
            WHERE br.user_id = $1 AND br.is_read = false
          ), 0
        )
      ) as total_unread
    `;

    const res = await this.postgres.pool.query(query, [userId]);
    return res.rows[0]?.total_unread ?? 0;
  }

  async createBroadcast(
    author: { id: string; name: string },
    dto: CreateBroadcastDto,
  ): Promise<Broadcast> {
    await this.ensureSchema();
    const res = await this.postgres.pool.query(
      `INSERT INTO cms_broadcasts (
         title, body, author_id, author_name, target_role, priority,
         action_url, action_label, status, metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'QUEUED', $9)
       RETURNING *`,
      [
        dto.title,
        dto.body,
        author.id,
        author.name,
        dto.targetRole || 'ALL',
        dto.priority || 'NORMAL',
        dto.actionUrl || null,
        dto.actionLabel || null,
        dto.metadata ? JSON.stringify(dto.metadata) : null,
      ],
    );
    const row = res.rows[0];
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      authorId: row.author_id,
      authorName: row.author_name,
      targetRole: row.target_role,
      priority: row.priority,
      actionUrl: row.action_url,
      actionLabel: row.action_label,
      status: row.status,
      totalRecipients: row.total_recipients,
      processedRecipients: row.processed_recipients,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findBroadcastById(broadcastId: string): Promise<Broadcast | null> {
    await this.ensureSchema();
    const res = await this.postgres.pool.query(
      `SELECT * FROM cms_broadcasts WHERE id = $1`,
      [broadcastId],
    );
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      authorId: row.author_id,
      authorName: row.author_name,
      targetRole: row.target_role,
      priority: row.priority,
      actionUrl: row.action_url,
      actionLabel: row.action_label,
      status: row.status,
      totalRecipients: row.total_recipients,
      processedRecipients: row.processed_recipients,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateBroadcastStatus(
    broadcastId: string,
    status: string,
    totalRecipients?: number,
  ): Promise<void> {
    await this.ensureSchema();
    if (totalRecipients !== undefined) {
      await this.postgres.pool.query(
        `UPDATE cms_broadcasts
         SET status = $1, total_recipients = $2, processed_recipients = $2, updated_at = now()
         WHERE id = $3`,
        [status, totalRecipients, broadcastId],
      );
    } else {
      await this.postgres.pool.query(
        `UPDATE cms_broadcasts SET status = $1, updated_at = now() WHERE id = $2`,
        [status, broadcastId],
      );
    }
  }

  async recordBroadcastRecipientBatch(
    broadcastId: string,
    userIds: string[],
  ): Promise<void> {
    await this.ensureSchema();
    if (userIds.length === 0) return;

    const values: string[] = [];
    const params: unknown[] = [broadcastId];

    for (const uid of userIds) {
      params.push(uid);
      values.push(`($1, $${params.length})`);
    }

    await this.postgres.pool.query(
      `INSERT INTO cms_broadcast_recipients (broadcast_id, user_id)
       VALUES ${values.join(', ')}
       ON CONFLICT (broadcast_id, user_id) DO NOTHING`,
      params,
    );
  }

  async findUserBroadcasts(
    userId: string,
    userRole: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<PaginatedResult<UserBroadcastItem>> {
    await this.ensureSchema();
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const query = `
      SELECT b.*, COALESCE(br.is_read, false) as is_read, br.read_at, COALESCE(br.is_dismissed, false) as is_dismissed
      FROM cms_broadcasts b
      LEFT JOIN cms_broadcast_recipients br ON br.broadcast_id = b.id AND br.user_id = $1
      WHERE b.status = 'COMPLETED'
        AND (b.target_role = 'ALL' OR b.target_role = $2)
        AND COALESCE(br.is_dismissed, false) = false
      ORDER BY b.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const countRes = await this.postgres.pool.query(
      `SELECT count(*)::int as total
       FROM cms_broadcasts b
       LEFT JOIN cms_broadcast_recipients br ON br.broadcast_id = b.id AND br.user_id = $1
       WHERE b.status = 'COMPLETED'
         AND (b.target_role = 'ALL' OR b.target_role = $2)
         AND COALESCE(br.is_dismissed, false) = false`,
      [userId, userRole],
    );
    const total = countRes.rows[0]?.total ?? 0;

    const dataRes = await this.postgres.pool.query(query, [userId, userRole, limit, offset]);

    const items: UserBroadcastItem[] = dataRes.rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      authorId: row.author_id,
      authorName: row.author_name,
      targetRole: row.target_role,
      priority: row.priority,
      actionUrl: row.action_url,
      actionLabel: row.action_label,
      status: row.status,
      totalRecipients: row.total_recipients,
      processedRecipients: row.processed_recipients,
      metadata: row.metadata,
      isRead: row.is_read,
      readAt: row.read_at,
      isDismissed: row.is_dismissed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async markBroadcastRead(broadcastId: string, userId: string): Promise<void> {
    await this.ensureSchema();
    await this.postgres.pool.query(
      `INSERT INTO cms_broadcast_recipients (broadcast_id, user_id, is_read, read_at)
       VALUES ($1, $2, true, now())
       ON CONFLICT (broadcast_id, user_id)
       DO UPDATE SET is_read = true, read_at = now(), updated_at = now()`,
      [broadcastId, userId],
    );
  }
}
