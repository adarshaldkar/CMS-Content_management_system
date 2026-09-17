import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mysql, { type Pool } from 'mysql2/promise';
import type { EnvConfig } from '../config/env.schema';

@Injectable()
export class MySqlService implements OnModuleDestroy {
  private readonly logger = new Logger(MySqlService.name);
  readonly pool: Pool;
  private schemaReady: Promise<void> | null = null;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    const url = this.config.get('MYSQL_URL', { infer: true }) || 'mysql://cms:cms_dev_password@localhost:3308/cms_platform';
    this.pool = mysql.createPool({
      uri: url,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }

  async ensureSchema(): Promise<void> {
    if (!this.schemaReady) {
      this.schemaReady = (async () => {
        try {
          await this.pool.query(`
            CREATE TABLE IF NOT EXISTS cms_users (
              id VARCHAR(36) PRIMARY KEY,
              email VARCHAR(255) UNIQUE NOT NULL,
              name VARCHAR(255) NOT NULL,
              password_hash VARCHAR(255) NOT NULL,
              role VARCHAR(50) NOT NULL DEFAULT 'AUTHOR',
              is_active BOOLEAN NOT NULL DEFAULT TRUE,
              avatar_url TEXT,
              bio TEXT,
              preferred_topics JSON,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
          `);

          await this.pool.query(`
            CREATE TABLE IF NOT EXISTS categories (
              id VARCHAR(36) PRIMARY KEY,
              name VARCHAR(100) NOT NULL,
              slug VARCHAR(100) UNIQUE NOT NULL,
              description TEXT,
              status VARCHAR(20) NOT NULL DEFAULT 'active',
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
          `);

          await this.pool.query(`
            CREATE TABLE IF NOT EXISTS articles (
              id VARCHAR(36) PRIMARY KEY,
              title VARCHAR(255) NOT NULL,
              slug VARCHAR(255) UNIQUE NOT NULL,
              description TEXT,
              content LONGTEXT,
              author_id VARCHAR(36) NOT NULL,
              category_id VARCHAR(36),
              cover_image TEXT,
              status VARCHAR(30) NOT NULL DEFAULT 'draft',
              version INT NOT NULL DEFAULT 1,
              word_count INT NOT NULL DEFAULT 0,
              reading_time_minutes INT NOT NULL DEFAULT 1,
              seo_title VARCHAR(255),
              seo_description TEXT,
              review_note TEXT,
              tag_ids JSON,
              scheduled_at TIMESTAMP NULL,
              published_at TIMESTAMP NULL,
              publishing_slot_id VARCHAR(36) NULL,
              auto_dispatched BOOLEAN NOT NULL DEFAULT FALSE,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              deleted_at TIMESTAMP NULL
            );
          `);

          try {
            await this.pool.query('ALTER TABLE articles ADD COLUMN publishing_slot_id VARCHAR(36) NULL');
          } catch {}
          try {
            await this.pool.query('ALTER TABLE articles ADD COLUMN auto_dispatched BOOLEAN NOT NULL DEFAULT FALSE');
          } catch {}

          await this.pool.query(`
            CREATE TABLE IF NOT EXISTS article_revisions (
              id VARCHAR(36) PRIMARY KEY,
              article_id VARCHAR(36) NOT NULL,
              version INT NOT NULL,
              title VARCHAR(255) NOT NULL,
              content LONGTEXT,
              change_summary TEXT,
              author_id VARCHAR(36) NOT NULL,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);

          await this.pool.query(`
            CREATE TABLE IF NOT EXISTS comments (
              id VARCHAR(36) PRIMARY KEY,
              article_id VARCHAR(36) NOT NULL,
              parent_id VARCHAR(36),
              author_id VARCHAR(36) NOT NULL,
              author_name VARCHAR(255) NOT NULL,
              author_avatar TEXT,
              body TEXT NOT NULL,
              status VARCHAR(30) NOT NULL DEFAULT 'visible',
              moderation_note TEXT,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              deleted_at TIMESTAMP NULL
            );
          `);

          await this.pool.query(`
            CREATE TABLE IF NOT EXISTS follows (
              id VARCHAR(36) PRIMARY KEY,
              follower_id VARCHAR(36) NOT NULL,
              target_type VARCHAR(20) NOT NULL,
              target_id VARCHAR(100) NOT NULL,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY uq_follows (follower_id, target_type, target_id)
            );
          `);

          await this.pool.query(`
            CREATE TABLE IF NOT EXISTS bookmarks (
              id VARCHAR(36) PRIMARY KEY,
              user_id VARCHAR(36) NOT NULL,
              article_id VARCHAR(36) NOT NULL,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY uq_bookmarks (user_id, article_id)
            );
          `);

          await this.pool.query(`
            CREATE TABLE IF NOT EXISTS likes (
              id VARCHAR(36) PRIMARY KEY,
              user_id VARCHAR(36) NOT NULL,
              article_id VARCHAR(36) NOT NULL,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY uq_likes (user_id, article_id)
            );
          `);

          await this.pool.query(`
            CREATE TABLE IF NOT EXISTS media_assets (
              id VARCHAR(36) PRIMARY KEY,
              uploader_id VARCHAR(36) NOT NULL,
              url TEXT NOT NULL,
              filename VARCHAR(255) NOT NULL,
              mime_type VARCHAR(100) NOT NULL,
              size_bytes BIGINT NOT NULL,
              width INT,
              height INT,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);

          await this.pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
              id VARCHAR(36) PRIMARY KEY,
              actor_id VARCHAR(36),
              action VARCHAR(100) NOT NULL,
              resource VARCHAR(255) NOT NULL,
              result VARCHAR(50) NOT NULL,
              ip_address VARCHAR(100),
              user_agent TEXT,
              metadata JSON,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);

          await this.pool.query(`
            CREATE TABLE IF NOT EXISTS cms_publishing_slots (
              id VARCHAR(36) PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              slug VARCHAR(255) UNIQUE NOT NULL,
              dispatch_time VARCHAR(20) NOT NULL,
              timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
              days_active VARCHAR(50) NOT NULL DEFAULT 'ALL',
              max_articles_per_slot INT NOT NULL DEFAULT 5,
              stagger_minutes INT NOT NULL DEFAULT 5,
              is_active BOOLEAN NOT NULL DEFAULT TRUE,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
          `);

          await this.pool.query(`
            CREATE TABLE IF NOT EXISTS cms_author_slot_assignments (
              id VARCHAR(36) PRIMARY KEY,
              author_id VARCHAR(36) UNIQUE NOT NULL,
              slot_id VARCHAR(36) NOT NULL,
              auto_publish_enabled BOOLEAN NOT NULL DEFAULT TRUE,
              daily_quota INT NOT NULL DEFAULT 2,
              assigned_by VARCHAR(36),
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_mysql_assignment_slot (slot_id)
            );
          `);

          this.logger.log('MySQL DDL Schema verified successfully.');
        } catch (err: any) {
          this.logger.warn(`MySQL Schema verification failed: ${err.message}`);
        }
      })();
    }
    return this.schemaReady;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
