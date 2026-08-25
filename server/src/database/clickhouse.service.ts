import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type ClickHouseClient } from '@clickhouse/client';
import type { EnvConfig } from '../config/env.schema';

@Injectable()
export class ClickHouseService implements OnModuleDestroy {
  private readonly logger = new Logger(ClickHouseService.name);
  readonly client: ClickHouseClient;
  private schemaReady: Promise<void> | null = null;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    const url = this.config.get('CLICKHOUSE_URL', { infer: true }) || 'http://localhost:8123';
    const username = this.config.get('CLICKHOUSE_USER', { infer: true }) || 'default';
    const password = this.config.get('CLICKHOUSE_PASSWORD', { infer: true }) || 'cms_dev_password';
    const database = this.config.get('CLICKHOUSE_DB', { infer: true }) || 'cms_platform';

    this.client = createClient({
      url,
      username,
      password,
      database,
      request_timeout: 5000,
    });
  }

  async ensureSchema(): Promise<void> {
    if (!this.schemaReady) {
      this.schemaReady = (async () => {
        try {
          // 1. Ensure database exists
          await this.client.command({
            query: `CREATE DATABASE IF NOT EXISTS cms_platform;`,
          });

          // 2. Analytical Audit Stream
          await this.client.command({
            query: `
              CREATE TABLE IF NOT EXISTS cms_platform.audit_events (
                id String,
                actor_id String,
                action LowCardinality(String),
                resource String,
                result LowCardinality(String),
                ip_address String,
                user_agent String,
                metadata String,
                created_at DateTime DEFAULT now()
              ) ENGINE = MergeTree()
              ORDER BY (action, created_at, id);
            `,
          });

          // 3. User Registry Snapshot
          await this.client.command({
            query: `
              CREATE TABLE IF NOT EXISTS cms_platform.user_snapshots (
                id String,
                email String,
                name String,
                role LowCardinality(String),
                is_active UInt8,
                avatar_url String,
                bio String,
                preferred_topics Array(String),
                created_at DateTime DEFAULT now(),
                updated_at DateTime DEFAULT now()
              ) ENGINE = ReplacingMergeTree(updated_at)
              ORDER BY id;
            `,
          });

          // 4. Article Readership & Content Stream
          await this.client.command({
            query: `
              CREATE TABLE IF NOT EXISTS cms_platform.article_snapshots (
                id String,
                title String,
                slug String,
                description String,
                author_id String,
                category_id String,
                status LowCardinality(String),
                version UInt32,
                word_count UInt32,
                reading_time_minutes UInt32,
                published_at Nullable(DateTime),
                created_at DateTime DEFAULT now(),
                updated_at DateTime DEFAULT now()
              ) ENGINE = ReplacingMergeTree(updated_at)
              ORDER BY (status, id);
            `,
          });

          // 5. Discussion Comments Stream
          await this.client.command({
            query: `
              CREATE TABLE IF NOT EXISTS cms_platform.comment_events (
                id String,
                article_id String,
                author_id String,
                author_name String,
                body String,
                status LowCardinality(String),
                created_at DateTime DEFAULT now()
              ) ENGINE = MergeTree()
              ORDER BY (article_id, created_at, id);
            `,
          });

          this.logger.log('ClickHouse Analytical Schemas verified successfully.');
        } catch (err: any) {
          this.logger.warn(`ClickHouse Schema verification failed: ${err.message}`);
        }
      })();
    }
    return this.schemaReady;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const ping = await this.client.ping();
      return ping.success;
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    await this.client.close();
  }
}
