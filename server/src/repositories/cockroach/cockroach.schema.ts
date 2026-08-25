/**
 * CockroachDB Distributed SQL Table Schemas
 * PostgreSQL-compatible distributed DDL definitions with UUID primary keys.
 */

export const COCKROACH_SCHEMAS = {
  USERS_TABLE: `
    CREATE TABLE IF NOT EXISTS cms_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email STRING NOT NULL UNIQUE,
      name STRING NOT NULL,
      password_hash STRING NOT NULL,
      bio STRING NULL,
      avatar_url STRING NULL,
      preferred_topics STRING NULL,
      role STRING NOT NULL DEFAULT 'AUTHOR',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ NULL
    );
  `,

  CATEGORIES_TABLE: `
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name STRING NOT NULL,
      slug STRING NOT NULL UNIQUE,
      description STRING NULL,
      status STRING NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,

  ARTICLES_TABLE: `
    CREATE TABLE IF NOT EXISTS articles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title STRING NOT NULL,
      slug STRING NOT NULL UNIQUE,
      description STRING NULL,
      content STRING NULL,
      author_id UUID NOT NULL,
      category_id UUID NULL,
      cover_image STRING NULL,
      status STRING NOT NULL DEFAULT 'draft',
      version INT8 NOT NULL DEFAULT 1,
      word_count INT8 NOT NULL DEFAULT 0,
      reading_time_minutes INT8 NOT NULL DEFAULT 1,
      seo_title STRING NULL,
      seo_description STRING NULL,
      review_note STRING NULL,
      tag_ids STRING NULL,
      scheduled_at TIMESTAMPTZ NULL,
      published_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ NULL
    );
  `,

  COMMENTS_TABLE: `
    CREATE TABLE IF NOT EXISTS comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      article_id UUID NOT NULL,
      user_id UUID NOT NULL,
      content STRING NOT NULL,
      parent_id UUID NULL,
      status STRING NOT NULL DEFAULT 'APPROVED',
      is_hidden BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,

  BOOKMARKS_TABLE: `
    CREATE TABLE IF NOT EXISTS bookmarks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      article_id UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT uq_crdb_user_article_bookmark UNIQUE (user_id, article_id)
    );
  `,

  LIKES_TABLE: `
    CREATE TABLE IF NOT EXISTS likes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      article_id UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT uq_crdb_user_article_like UNIQUE (user_id, article_id)
    );
  `,

  FOLLOWS_TABLE: `
    CREATE TABLE IF NOT EXISTS follows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      follower_id UUID NOT NULL,
      following_id UUID NULL,
      category_slug STRING NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,

  MEDIA_TABLE: `
    CREATE TABLE IF NOT EXISTS media_assets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      filename STRING NOT NULL,
      original_name STRING NOT NULL,
      mime_type STRING NOT NULL,
      size_bytes INT8 NOT NULL,
      url STRING NOT NULL,
      uploaded_by UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,

  REVISIONS_TABLE: `
    CREATE TABLE IF NOT EXISTS article_revisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      article_id UUID NOT NULL,
      version INT8 NOT NULL,
      title STRING NOT NULL,
      content STRING NULL,
      created_by UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,

  AUDIT_LOGS_TABLE: `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      action STRING NOT NULL,
      actor_id UUID NULL,
      user_email STRING NULL,
      resource_type STRING NOT NULL,
      resource_id UUID NULL,
      ip_address STRING NULL,
      user_agent STRING NULL,
      result STRING NOT NULL DEFAULT 'SUCCESS',
      metadata JSONB NULL,
      reference_id STRING NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,
};
