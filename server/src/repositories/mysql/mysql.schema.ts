/**
 * MySQL Relational Table DDL Schemas
 * Standard MySQL 8.4 InnoDB relational definitions with strict schemas.
 */

export const MYSQL_SCHEMAS = {
  USERS_TABLE: `
    CREATE TABLE IF NOT EXISTS cms_users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      bio TEXT NULL,
      avatar_url VARCHAR(1024) NULL,
      preferred_topics JSON NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'AUTHOR',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      INDEX idx_mysql_user_email (email),
      INDEX idx_mysql_user_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  CATEGORIES_TABLE: `
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_mysql_cat_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  ARTICLES_TABLE: `
    CREATE TABLE IF NOT EXISTS articles (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(512) NOT NULL,
      slug VARCHAR(512) NOT NULL UNIQUE,
      description TEXT NULL,
      content LONGTEXT NULL,
      author_id VARCHAR(36) NOT NULL,
      category_id VARCHAR(36) NULL,
      cover_image VARCHAR(1024) NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'draft',
      version INT NOT NULL DEFAULT 1,
      word_count INT NOT NULL DEFAULT 0,
      reading_time_minutes INT NOT NULL DEFAULT 1,
      seo_title VARCHAR(512) NULL,
      seo_description TEXT NULL,
      review_note TEXT NULL,
      tag_ids JSON NULL,
      scheduled_at TIMESTAMP NULL,
      published_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      INDEX idx_mysql_art_status (status),
      INDEX idx_mysql_art_author (author_id),
      INDEX idx_mysql_art_category (category_id),
      INDEX idx_mysql_art_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  COMMENTS_TABLE: `
    CREATE TABLE IF NOT EXISTS comments (
      id VARCHAR(36) PRIMARY KEY,
      article_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      content TEXT NOT NULL,
      parent_id VARCHAR(36) NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
      is_hidden TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_mysql_comm_article (article_id),
      INDEX idx_mysql_comm_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  BOOKMARKS_TABLE: `
    CREATE TABLE IF NOT EXISTS bookmarks (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      article_id VARCHAR(36) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_mysql_user_article_bookmark (user_id, article_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  LIKES_TABLE: `
    CREATE TABLE IF NOT EXISTS likes (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      article_id VARCHAR(36) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_mysql_user_article_like (user_id, article_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  FOLLOWS_TABLE: `
    CREATE TABLE IF NOT EXISTS follows (
      id VARCHAR(36) PRIMARY KEY,
      follower_id VARCHAR(36) NOT NULL,
      following_id VARCHAR(36) NULL,
      category_slug VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_mysql_follower (follower_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  MEDIA_TABLE: `
    CREATE TABLE IF NOT EXISTS media_assets (
      id VARCHAR(36) PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      size_bytes BIGINT NOT NULL,
      url VARCHAR(1024) NOT NULL,
      uploaded_by VARCHAR(36) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  REVISIONS_TABLE: `
    CREATE TABLE IF NOT EXISTS article_revisions (
      id VARCHAR(36) PRIMARY KEY,
      article_id VARCHAR(36) NOT NULL,
      version INT NOT NULL,
      title VARCHAR(512) NOT NULL,
      content LONGTEXT NULL,
      created_by VARCHAR(36) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_mysql_rev_art (article_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  AUDIT_LOGS_TABLE: `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(36) PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      actor_id VARCHAR(36) NULL,
      user_email VARCHAR(255) NULL,
      resource_type VARCHAR(100) NOT NULL,
      resource_id VARCHAR(36) NULL,
      ip_address VARCHAR(100) NULL,
      user_agent VARCHAR(512) NULL,
      result VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
      metadata JSON NULL,
      reference_id VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_mysql_audit_action (action),
      INDEX idx_mysql_audit_created (created_at DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
};
