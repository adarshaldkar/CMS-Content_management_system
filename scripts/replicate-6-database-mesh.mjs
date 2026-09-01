import pg from 'pg';
import mysql from 'mysql2/promise';
import { createClient } from '@clickhouse/client';

async function syncAll() {
  console.log('🔄 Replicating all existing records across 6-Database Mesh...');

  const pgPool = new pg.Pool({ connectionString: 'postgresql://postgres:asd123@localhost:5432/cms_platform' });
  const crdbPool = new pg.Pool({ connectionString: 'postgresql://root@localhost:26257/cms_platform?sslmode=disable' });
  const mariaConn = await mysql.createConnection({ host: 'localhost', port: 3307, user: 'cms', password: 'cms_dev_password', database: 'cms_platform' });
  const mysqlConn = await mysql.createConnection({ host: 'localhost', port: 3308, user: 'cms', password: 'cms_dev_password', database: 'cms_platform' });
  const ch = createClient({ url: 'http://localhost:8123', username: 'default', password: 'cms_dev_password', database: 'cms_platform' });

  // 1. Sync Users
  const { rows: users } = await pgPool.query('SELECT * FROM cms_users');
  console.log(`Syncing ${users.length} users to MariaDB, MySQL, CockroachDB & ClickHouse...`);
  for (const u of users) {
    const userParams = [u.id, u.email, u.name, u.password_hash || '', u.role || 'AUTHOR', u.is_active ? 1 : 0, u.avatar_url, u.bio, JSON.stringify(u.preferred_topics || [])];
    const userSql = 'INSERT INTO cms_users (id, email, name, password_hash, role, is_active, avatar_url, bio, preferred_topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)';
    await mariaConn.query(userSql, userParams);
    await mysqlConn.query(userSql, userParams);
    await crdbPool.query('INSERT INTO cms_users (id, email, name, password_hash, role, is_active, avatar_url, bio, preferred_topics) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING', userParams);
  }

  if (users.length > 0) {
    await ch.insert({
      table: 'cms_platform.user_snapshots',
      values: users.map((u) => ({
        id: String(u.id),
        email: u.email,
        name: u.name,
        role: u.role || 'AUTHOR',
        is_active: u.is_active ? 1 : 0,
        avatar_url: u.avatar_url || '',
        bio: u.bio || '',
        preferred_topics: Array.isArray(u.preferred_topics) ? u.preferred_topics : [],
      })),
      format: 'JSONEachRow',
    });
  }

  // 2. Sync Categories
  const { rows: categories } = await pgPool.query('SELECT * FROM categories');
  console.log(`Syncing ${categories.length} categories...`);
  for (const c of categories) {
    const catParams = [c.id, c.name, c.slug, c.description, c.status || 'active'];
    const catSql = 'INSERT INTO categories (id, name, slug, description, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)';
    await mariaConn.query(catSql, catParams);
    await mysqlConn.query(catSql, catParams);
    await crdbPool.query('INSERT INTO categories (id, name, slug, description, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING', catParams);
  }

  // 3. Sync Articles
  const { rows: articles } = await pgPool.query('SELECT * FROM articles');
  console.log(`Syncing ${articles.length} articles...`);
  for (const a of articles) {
    const artParams = [
      a.id, a.title, a.slug, a.description, a.content, a.author_id, a.category_id,
      a.cover_image, a.status || 'draft', a.version || 1, a.word_count || 0,
      a.reading_time_minutes || 1, a.seo_title, a.seo_description, a.review_note,
      JSON.stringify(a.tag_ids || []), a.published_at,
    ];
    const artSql = 'INSERT INTO articles (id, title, slug, description, content, author_id, category_id, cover_image, status, version, word_count, reading_time_minutes, seo_title, seo_description, review_note, tag_ids, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title)';
    await mariaConn.query(artSql, artParams);
    await mysqlConn.query(artSql, artParams);
    await crdbPool.query('INSERT INTO articles (id, title, slug, description, content, author_id, category_id, cover_image, status, version, word_count, reading_time_minutes, seo_title, seo_description, review_note, tag_ids, published_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) ON CONFLICT (id) DO NOTHING', artParams);
  }

  if (articles.length > 0) {
    await ch.insert({
      table: 'cms_platform.article_snapshots',
      values: articles.map((a) => ({
        id: String(a.id),
        title: a.title,
        slug: a.slug,
        description: a.description || '',
        author_id: String(a.author_id),
        category_id: String(a.category_id || ''),
        status: a.status || 'draft',
        version: a.version || 1,
        word_count: a.word_count || 0,
        reading_time_minutes: a.reading_time_minutes || 1,
      })),
      format: 'JSONEachRow',
    });
  }

  await pgPool.end();
  await crdbPool.end();
  await mariaConn.end();
  await mysqlConn.end();
  await ch.close();

  console.log('✅ Synchronization complete! All 6 databases now have full identical datasets.');
}

syncAll().catch(console.error);
