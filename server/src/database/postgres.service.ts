import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import type { EnvConfig } from '../config/env.schema';

export const PG_POOL = Symbol('PG_POOL');

@Injectable()
export class PostgresService implements OnModuleDestroy {
  private readonly logger = new Logger(PostgresService.name);
  readonly pool: Pool;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    this.pool = new Pool({
      connectionString: this.config.get('DATABASE_URL', { infer: true }),
      max: 10,
      connectionTimeoutMillis: 5000,
    });

    // Attach error handler to prevent idle client pool errors from crashing Node process
    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle PostgreSQL client', err.stack);
    });
  }

  private schemaReady: Promise<void> | null = null;

  async ensureSchema(): Promise<void> {
    if (this.schemaReady) return this.schemaReady;

    this.schemaReady = (async () => {
      try {
        await this.pool.query(`
          CREATE EXTENSION IF NOT EXISTS pgcrypto;
          CREATE TABLE IF NOT EXISTS cms_users (
            id text PRIMARY KEY,
            email text NOT NULL UNIQUE,
            name text NOT NULL,
            password_hash text NOT NULL,
            bio text,
            avatar_url text,
            preferred_topics text[] DEFAULT '{}',
            role text NOT NULL DEFAULT 'AUTHOR',
            is_active boolean NOT NULL DEFAULT true,
            is_email_verified boolean DEFAULT true,
            email_verification_token text,
            email_verification_expires_at timestamptz,
            accepted_terms_version text,
            accepted_terms_at timestamptz,
            notification_preferences jsonb,
            password_reset_token text,
            password_reset_expires_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            deleted_at timestamptz
          );
          CREATE TABLE IF NOT EXISTS categories (
            id text PRIMARY KEY,
            name text NOT NULL,
            slug text NOT NULL UNIQUE,
            description text,
            status text NOT NULL DEFAULT 'active',
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          );
          CREATE TABLE IF NOT EXISTS articles (
            id text PRIMARY KEY,
            title text NOT NULL,
            slug text NOT NULL UNIQUE,
            description text,
            content text,
            author_id text NOT NULL,
            category_id text,
            tag_ids text[] DEFAULT '{}',
            cover_image text,
            status text NOT NULL DEFAULT 'draft',
            version integer NOT NULL DEFAULT 1,
            word_count integer NOT NULL DEFAULT 0,
            reading_time_minutes integer NOT NULL DEFAULT 1,
            seo_title text,
            seo_description text,
            review_note text,
            scheduled_at timestamptz,
            published_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            deleted_at timestamptz
          );
        `);
        this.logger.log('PostgreSQL persistence core schema ensured.');
      } catch (err: any) {
        this.logger.warn(`PostgreSQL ensureSchema warning: ${err.message}`);
        this.schemaReady = null;
      }
    })();

    return this.schemaReady;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
