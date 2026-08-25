import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import type { EnvConfig } from '../config/env.schema';

@Injectable()
export class CockroachDbService implements OnModuleDestroy {
  private readonly logger = new Logger(CockroachDbService.name);
  readonly pool: Pool;
  private schemaReady: Promise<void> | null = null;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    const url = this.config.get('COCKROACH_URL', { infer: true }) || 'postgresql://root@localhost:26257/cms_platform?sslmode=disable';
    this.pool = new Pool({
      connectionString: url,
      max: 10,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle CockroachDB client', err.stack);
    });
  }

  async ensureSchema(): Promise<void> {
    if (!this.schemaReady) {
      this.schemaReady = (async () => {
        try {
          await this.pool.query(`
            CREATE TABLE IF NOT EXISTS cms_users (
              id text PRIMARY KEY,
              email text UNIQUE NOT NULL,
              name text NOT NULL,
              password_hash text NOT NULL,
              role text NOT NULL DEFAULT 'AUTHOR',
              is_active boolean NOT NULL DEFAULT true,
              avatar_url text,
              bio text,
              preferred_topics jsonb,
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS categories (
              id text PRIMARY KEY,
              name text NOT NULL,
              slug text UNIQUE NOT NULL,
              description text,
              status text NOT NULL DEFAULT 'active',
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS articles (
              id text PRIMARY KEY,
              title text NOT NULL,
              slug text UNIQUE NOT NULL,
              description text,
              content text,
              author_id text NOT NULL,
              category_id text,
              cover_image text,
              status text NOT NULL DEFAULT 'draft',
              version int NOT NULL DEFAULT 1,
              word_count int NOT NULL DEFAULT 0,
              reading_time_minutes int NOT NULL DEFAULT 1,
              seo_title text,
              seo_description text,
              review_note text,
              tag_ids jsonb,
              scheduled_at timestamptz,
              published_at timestamptz,
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now(),
              deleted_at timestamptz
            );

            CREATE TABLE IF NOT EXISTS article_revisions (
              id text PRIMARY KEY,
              article_id text NOT NULL,
              version int NOT NULL,
              title text NOT NULL,
              content text,
              change_summary text,
              author_id text NOT NULL,
              created_at timestamptz NOT NULL DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS comments (
              id text PRIMARY KEY,
              article_id text NOT NULL,
              parent_id text,
              author_id text NOT NULL,
              author_name text NOT NULL,
              author_avatar text,
              body text NOT NULL,
              status text NOT NULL DEFAULT 'visible',
              moderation_note text,
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now(),
              deleted_at timestamptz
            );

            CREATE TABLE IF NOT EXISTS follows (
              id text PRIMARY KEY,
              follower_id text NOT NULL,
              target_type text NOT NULL,
              target_id text NOT NULL,
              created_at timestamptz NOT NULL DEFAULT now(),
              UNIQUE (follower_id, target_type, target_id)
            );

            CREATE TABLE IF NOT EXISTS bookmarks (
              id text PRIMARY KEY,
              user_id text NOT NULL,
              article_id text NOT NULL,
              created_at timestamptz NOT NULL DEFAULT now(),
              UNIQUE (user_id, article_id)
            );

            CREATE TABLE IF NOT EXISTS likes (
              id text PRIMARY KEY,
              user_id text NOT NULL,
              article_id text NOT NULL,
              created_at timestamptz NOT NULL DEFAULT now(),
              UNIQUE (user_id, article_id)
            );

            CREATE TABLE IF NOT EXISTS media_assets (
              id text PRIMARY KEY,
              uploader_id text NOT NULL,
              url text NOT NULL,
              filename text NOT NULL,
              mime_type text NOT NULL,
              size_bytes bigint NOT NULL,
              width int,
              height int,
              created_at timestamptz NOT NULL DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
              id text PRIMARY KEY,
              actor_id text,
              action text NOT NULL,
              resource text NOT NULL,
              result text NOT NULL,
              ip_address text,
              user_agent text,
              metadata jsonb,
              created_at timestamptz NOT NULL DEFAULT now()
            );
          `);

          this.logger.log('CockroachDB DDL Schema verified successfully.');
        } catch (err: any) {
          this.logger.warn(`CockroachDB Schema verification failed: ${err.message}`);
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
