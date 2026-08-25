/**
 * ClickHouse Columnar Schemas
 * High-performance analytical engines (MergeTree, ReplacingMergeTree)
 * for real-time aggregation, audit streaming, and readership telemetry.
 */

export const CLICKHOUSE_SCHEMAS = {
  USER_SNAPSHOTS: `
    CREATE TABLE IF NOT EXISTS cms_platform.user_snapshots (
      id String,
      email String,
      name String,
      role String,
      is_active UInt8,
      avatar_url String,
      bio String,
      preferred_topics Array(String),
      created_at DateTime DEFAULT now(),
      updated_at DateTime DEFAULT now()
    ) ENGINE = ReplacingMergeTree(updated_at)
    PRIMARY KEY (id)
    ORDER BY (id);
  `,

  ARTICLE_SNAPSHOTS: `
    CREATE TABLE IF NOT EXISTS cms_platform.article_snapshots (
      id String,
      title String,
      slug String,
      description String,
      author_id String,
      category_id String,
      status String,
      version UInt32,
      word_count UInt32,
      reading_time_minutes UInt32,
      created_at DateTime DEFAULT now(),
      updated_at DateTime DEFAULT now()
    ) ENGINE = ReplacingMergeTree(updated_at)
    PRIMARY KEY (id)
    ORDER BY (id);
  `,

  AUDIT_EVENTS: `
    CREATE TABLE IF NOT EXISTS cms_platform.audit_events (
      id String,
      action String,
      user_id String,
      user_email String,
      resource_type String,
      resource_id String,
      ip_address String,
      user_agent String,
      status String,
      reference_id String,
      timestamp DateTime DEFAULT now()
    ) ENGINE = MergeTree()
    ORDER BY (timestamp, action);
  `,

  READ_TELEMETRY: `
    CREATE TABLE IF NOT EXISTS cms_platform.read_telemetry (
      event_id String,
      article_id String,
      reader_id String,
      duration_seconds UInt32,
      scroll_depth_percent UInt8,
      referrer String,
      timestamp DateTime DEFAULT now()
    ) ENGINE = MergeTree()
    ORDER BY (timestamp, article_id);
  `,
};
