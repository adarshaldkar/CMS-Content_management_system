import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PostgresService } from '../../database/postgres.service';
import {
  NewsletterSubscriber,
  NewsletterCampaign,
  SubscriberStatus,
  CampaignStatus,
  DigestFrequency,
  SubscriberQueryFilters,
  NewsletterStats,
} from '../../domain/models';
import { INewsletterRepository } from '../interfaces/newsletter.repository.interface';

@Injectable()
export class PostgresNewsletterRepository
  implements INewsletterRepository, OnModuleInit
{
  private readonly logger = new Logger(PostgresNewsletterRepository.name);

  constructor(private readonly postgres: PostgresService) {}

  async onModuleInit(): Promise<void> {
    await this.initSchema();
  }

  private async initSchema(): Promise<void> {
    try {
      await this.postgres.pool.query(`
        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'PENDING_VERIFICATION',
          topics JSONB DEFAULT '[]'::jsonb,
          frequency VARCHAR(32) NOT NULL DEFAULT 'DAILY',
          verification_token_hash VARCHAR(128),
          verification_token_expires_at TIMESTAMPTZ,
          unsubscribe_token_hash VARCHAR(128) NOT NULL,
          bounce_count INT NOT NULL DEFAULT 0,
          verified_at TIMESTAMPTZ,
          unsubscribed_at TIMESTAMPTZ,
          last_bounced_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
        CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_verify_hash ON newsletter_subscribers(verification_token_hash);
        CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_unsub_hash ON newsletter_subscribers(unsubscribe_token_hash);
        CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status);

        CREATE TABLE IF NOT EXISTS newsletter_campaigns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          subject VARCHAR(255) NOT NULL,
          preview_text TEXT,
          content_html TEXT NOT NULL,
          target_topics JSONB DEFAULT '[]'::jsonb,
          status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
          total_recipients INT NOT NULL DEFAULT 0,
          delivered_count INT NOT NULL DEFAULT 0,
          failed_count INT NOT NULL DEFAULT 0,
          scheduled_at TIMESTAMPTZ,
          sent_at TIMESTAMPTZ,
          author_id UUID REFERENCES cms_users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_status ON newsletter_campaigns(status);
        CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_created ON newsletter_campaigns(created_at DESC);
      `);
      this.logger.log('Postgres Newsletter schemas verified successfully.');
    } catch (err) {
      this.logger.warn(`Failed to initialize newsletter tables: ${(err as Error).message}`);
    }
  }

  private mapSubscriberRow(row: any): NewsletterSubscriber {
    return {
      id: row.id,
      email: row.email,
      status: row.status as SubscriberStatus,
      topics: Array.isArray(row.topics) ? row.topics : JSON.parse(row.topics || '[]'),
      frequency: row.frequency as DigestFrequency,
      verificationTokenHash: row.verification_token_hash || null,
      verificationTokenExpiresAt: row.verification_token_expires_at
        ? new Date(row.verification_token_expires_at)
        : null,
      unsubscribeTokenHash: row.unsubscribe_token_hash,
      bounceCount: parseInt(row.bounce_count, 10) || 0,
      verifiedAt: row.verified_at ? new Date(row.verified_at) : null,
      unsubscribedAt: row.unsubscribed_at ? new Date(row.unsubscribed_at) : null,
      lastBouncedAt: row.last_bounced_at ? new Date(row.last_bounced_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapCampaignRow(row: any): NewsletterCampaign {
    return {
      id: row.id,
      subject: row.subject,
      previewText: row.preview_text || '',
      contentHtml: row.content_html,
      targetTopics: Array.isArray(row.target_topics)
        ? row.target_topics
        : JSON.parse(row.target_topics || '[]'),
      status: row.status as CampaignStatus,
      totalRecipients: parseInt(row.total_recipients, 10) || 0,
      deliveredCount: parseInt(row.delivered_count, 10) || 0,
      failedCount: parseInt(row.failed_count, 10) || 0,
      scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : null,
      sentAt: row.sent_at ? new Date(row.sent_at) : null,
      authorId: row.author_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async findSubscriberByEmail(email: string): Promise<NewsletterSubscriber | null> {
    const res = await this.postgres.pool.query(
      `SELECT * FROM newsletter_subscribers WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email.trim()],
    );
    return res.rows.length > 0 ? this.mapSubscriberRow(res.rows[0]) : null;
  }

  async findSubscriberById(id: string): Promise<NewsletterSubscriber | null> {
    const res = await this.postgres.pool.query(
      `SELECT * FROM newsletter_subscribers WHERE id = $1 LIMIT 1`,
      [id],
    );
    return res.rows.length > 0 ? this.mapSubscriberRow(res.rows[0]) : null;
  }

  async findSubscriberByVerifyTokenHash(hash: string): Promise<NewsletterSubscriber | null> {
    const res = await this.postgres.pool.query(
      `SELECT * FROM newsletter_subscribers WHERE verification_token_hash = $1 LIMIT 1`,
      [hash],
    );
    return res.rows.length > 0 ? this.mapSubscriberRow(res.rows[0]) : null;
  }

  async findSubscriberByUnsubscribeTokenHash(hash: string): Promise<NewsletterSubscriber | null> {
    const res = await this.postgres.pool.query(
      `SELECT * FROM newsletter_subscribers WHERE unsubscribe_token_hash = $1 LIMIT 1`,
      [hash],
    );
    return res.rows.length > 0 ? this.mapSubscriberRow(res.rows[0]) : null;
  }

  async createSubscriber(
    sub: Omit<NewsletterSubscriber, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<NewsletterSubscriber> {
    const res = await this.postgres.pool.query(
      `INSERT INTO newsletter_subscribers (
        email, status, topics, frequency,
        verification_token_hash, verification_token_expires_at,
        unsubscribe_token_hash, bounce_count, verified_at,
        unsubscribed_at, last_bounced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        sub.email.toLowerCase().trim(),
        sub.status,
        JSON.stringify(sub.topics || []),
        sub.frequency || DigestFrequency.DAILY,
        sub.verificationTokenHash,
        sub.verificationTokenExpiresAt,
        sub.unsubscribeTokenHash,
        sub.bounceCount || 0,
        sub.verifiedAt,
        sub.unsubscribedAt,
        sub.lastBouncedAt,
      ],
    );
    return this.mapSubscriberRow(res.rows[0]);
  }

  async updateSubscriber(
    id: string,
    updates: Partial<NewsletterSubscriber>,
  ): Promise<NewsletterSubscriber | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(updates.status);
    }
    if (updates.topics !== undefined) {
      fields.push(`topics = $${idx++}`);
      values.push(JSON.stringify(updates.topics));
    }
    if (updates.frequency !== undefined) {
      fields.push(`frequency = $${idx++}`);
      values.push(updates.frequency);
    }
    if (updates.verificationTokenHash !== undefined) {
      fields.push(`verification_token_hash = $${idx++}`);
      values.push(updates.verificationTokenHash);
    }
    if (updates.verificationTokenExpiresAt !== undefined) {
      fields.push(`verification_token_expires_at = $${idx++}`);
      values.push(updates.verificationTokenExpiresAt);
    }
    if (updates.unsubscribeTokenHash !== undefined) {
      fields.push(`unsubscribe_token_hash = $${idx++}`);
      values.push(updates.unsubscribeTokenHash);
    }
    if (updates.bounceCount !== undefined) {
      fields.push(`bounce_count = $${idx++}`);
      values.push(updates.bounceCount);
    }
    if (updates.verifiedAt !== undefined) {
      fields.push(`verified_at = $${idx++}`);
      values.push(updates.verifiedAt);
    }
    if (updates.unsubscribedAt !== undefined) {
      fields.push(`unsubscribed_at = $${idx++}`);
      values.push(updates.unsubscribedAt);
    }
    if (updates.lastBouncedAt !== undefined) {
      fields.push(`last_bounced_at = $${idx++}`);
      values.push(updates.lastBouncedAt);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);
    const res = await this.postgres.pool.query(
      `UPDATE newsletter_subscribers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return res.rows.length > 0 ? this.mapSubscriberRow(res.rows[0]) : null;
  }

  async findSubscribers(filters: SubscriberQueryFilters): Promise<{
    items: NewsletterSubscriber[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters.status) {
      whereClauses.push(`status = $${idx++}`);
      values.push(filters.status);
    }

    if (filters.search) {
      whereClauses.push(`email ILIKE $${idx++}`);
      values.push(`%${filters.search.trim()}%`);
    }

    if (filters.topic) {
      whereClauses.push(`topics @> $${idx++}::jsonb`);
      values.push(JSON.stringify([filters.topic]));
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await this.postgres.pool.query(
      `SELECT COUNT(*)::int as count FROM newsletter_subscribers ${whereSql}`,
      values,
    );
    const total = countRes.rows[0]?.count || 0;

    const dataRes = await this.postgres.pool.query(
      `SELECT * FROM newsletter_subscribers ${whereSql} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    );

    return {
      items: dataRes.rows.map((r) => this.mapSubscriberRow(r)),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findActiveSubscribersForBroadcast(topics?: string[]): Promise<NewsletterSubscriber[]> {
    if (!topics || topics.length === 0) {
      const res = await this.postgres.pool.query(
        `SELECT * FROM newsletter_subscribers WHERE status = $1 ORDER BY created_at ASC`,
        [SubscriberStatus.ACTIVE],
      );
      return res.rows.map((r) => this.mapSubscriberRow(r));
    }

    // Match subscribers who subscribed to ANY of the target topics, OR have empty topics (meaning all)
    const res = await this.postgres.pool.query(
      `SELECT * FROM newsletter_subscribers 
       WHERE status = $1 
         AND (topics = '[]'::jsonb OR topics ?| $2)
       ORDER BY created_at ASC`,
      [SubscriberStatus.ACTIVE, topics],
    );
    return res.rows.map((r) => this.mapSubscriberRow(r));
  }

  async getSubscriberStats(): Promise<NewsletterStats> {
    const res = await this.postgres.pool.query(`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::int as active,
        COUNT(*) FILTER (WHERE status = 'PENDING_VERIFICATION')::int as pending,
        COUNT(*) FILTER (WHERE status = 'UNSUBSCRIBED')::int as unsubscribed,
        COUNT(*) FILTER (WHERE status IN ('BOUNCED', 'COMPLAINED'))::int as bounced
      FROM newsletter_subscribers
    `);

    const campaignRes = await this.postgres.pool.query(`
      SELECT COUNT(*)::int as sent_count FROM newsletter_campaigns WHERE status = 'SENT'
    `);

    const row = res.rows[0] || {};
    return {
      totalSubscribers: row.total || 0,
      activeSubscribers: row.active || 0,
      pendingVerification: row.pending || 0,
      unsubscribed: row.unsubscribed || 0,
      bounced: row.bounced || 0,
      totalCampaignsSent: campaignRes.rows[0]?.sent_count || 0,
    };
  }

  async createCampaign(
    c: Omit<NewsletterCampaign, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<NewsletterCampaign> {
    const res = await this.postgres.pool.query(
      `INSERT INTO newsletter_campaigns (
        subject, preview_text, content_html, target_topics,
        status, total_recipients, delivered_count, failed_count,
        scheduled_at, sent_at, author_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        c.subject,
        c.previewText || '',
        c.contentHtml,
        JSON.stringify(c.targetTopics || []),
        c.status || CampaignStatus.DRAFT,
        c.totalRecipients || 0,
        c.deliveredCount || 0,
        c.failedCount || 0,
        c.scheduledAt,
        c.sentAt,
        c.authorId || null,
      ],
    );
    return this.mapCampaignRow(res.rows[0]);
  }

  async findCampaignById(id: string): Promise<NewsletterCampaign | null> {
    const res = await this.postgres.pool.query(
      `SELECT * FROM newsletter_campaigns WHERE id = $1 LIMIT 1`,
      [id],
    );
    return res.rows.length > 0 ? this.mapCampaignRow(res.rows[0]) : null;
  }

  async updateCampaign(
    id: string,
    updates: Partial<NewsletterCampaign>,
  ): Promise<NewsletterCampaign | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.subject !== undefined) {
      fields.push(`subject = $${idx++}`);
      values.push(updates.subject);
    }
    if (updates.previewText !== undefined) {
      fields.push(`preview_text = $${idx++}`);
      values.push(updates.previewText);
    }
    if (updates.contentHtml !== undefined) {
      fields.push(`content_html = $${idx++}`);
      values.push(updates.contentHtml);
    }
    if (updates.targetTopics !== undefined) {
      fields.push(`target_topics = $${idx++}`);
      values.push(JSON.stringify(updates.targetTopics));
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(updates.status);
    }
    if (updates.totalRecipients !== undefined) {
      fields.push(`total_recipients = $${idx++}`);
      values.push(updates.totalRecipients);
    }
    if (updates.deliveredCount !== undefined) {
      fields.push(`delivered_count = $${idx++}`);
      values.push(updates.deliveredCount);
    }
    if (updates.failedCount !== undefined) {
      fields.push(`failed_count = $${idx++}`);
      values.push(updates.failedCount);
    }
    if (updates.scheduledAt !== undefined) {
      fields.push(`scheduled_at = $${idx++}`);
      values.push(updates.scheduledAt);
    }
    if (updates.sentAt !== undefined) {
      fields.push(`sent_at = $${idx++}`);
      values.push(updates.sentAt);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);
    const res = await this.postgres.pool.query(
      `UPDATE newsletter_campaigns SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return res.rows.length > 0 ? this.mapCampaignRow(res.rows[0]) : null;
  }

  async transitionCampaignStatus(
    id: string,
    fromStatus: NewsletterCampaign['status'],
    toStatus: NewsletterCampaign['status'],
    updates: Partial<NewsletterCampaign> = {},
  ): Promise<NewsletterCampaign | null> {
    const fields: string[] = ['status = $2'];
    const values: any[] = [id, toStatus];
    let idx = 3;

    const upserts: Array<[string, any]> = [
      ['subject', updates.subject],
      ['preview_text', updates.previewText],
      ['content_html', updates.contentHtml],
      ['target_topics', updates.targetTopics ? JSON.stringify(updates.targetTopics) : undefined],
      ['total_recipients', updates.totalRecipients],
      ['delivered_count', updates.deliveredCount],
      ['failed_count', updates.failedCount],
      ['scheduled_at', updates.scheduledAt],
      ['sent_at', updates.sentAt],
    ];
    for (const [col, val] of upserts) {
      if (val !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(val);
      }
    }
    fields.push('updated_at = CURRENT_TIMESTAMP');

    values.push(fromStatus);
    const res = await this.postgres.pool.query(
      `UPDATE newsletter_campaigns
         SET ${fields.join(', ')}
       WHERE id = $1 AND status = $${idx}
       RETURNING *`,
      values,
    );
    return res.rows.length > 0 ? this.mapCampaignRow(res.rows[0]) : null;
  }

  async findCampaigns(
    limit = 20,
    page = 1,
  ): Promise<{
    items: NewsletterCampaign[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(100, limit));
    const offset = (safePage - 1) * safeLimit;

    const countRes = await this.postgres.pool.query(
      `SELECT COUNT(*)::int as count FROM newsletter_campaigns`,
    );
    const total = countRes.rows[0]?.count || 0;

    const dataRes = await this.postgres.pool.query(
      `SELECT * FROM newsletter_campaigns ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [safeLimit, offset],
    );

    return {
      items: dataRes.rows.map((r) => this.mapCampaignRow(r)),
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }
}
