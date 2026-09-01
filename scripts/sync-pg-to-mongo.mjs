import pg from 'pg';
import mongoose from 'mongoose';

async function syncPostgresToMongo() {
  console.log('🔄 Starting full PostgreSQL -> MongoDB replication...');

  const pgClient = new pg.Client({
    connectionString: 'postgresql://postgres:asd123@localhost:5432/cms_platform',
  });
  await pgClient.connect();

  await mongoose.connect(
    'mongodb+srv://adarshaldkar_db_user:13spWPljQOm3KLBW@cluster0.skpnev3.mongodb.net/cms_platform?retryWrites=true&w=majority',
  );

  const db = mongoose.connection.db;

  // A. Sync Users
  const usersRes = await pgClient.query('SELECT * FROM cms_users');
  console.log(`Found ${usersRes.rows.length} users in PostgreSQL.`);
  for (const u of usersRes.rows) {
    await db.collection('users').updateOne(
      { email: u.email },
      {
        $setOnInsert: { _id: u.id },
        $set: {
          id: u.id,
          email: u.email,
          name: u.name,
          passwordHash: u.password_hash,
          bio: u.bio,
          avatarUrl: u.avatar_url,
          preferredTopics: u.preferred_topics || [],
          role: u.role,
          isActive: u.is_active,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        },
      },
      { upsert: true },
    );
  }
  console.log('✅ Users replicated to MongoDB.');

  // B. Sync Categories
  const catRes = await pgClient.query('SELECT * FROM categories');
  console.log(`Found ${catRes.rows.length} categories in PostgreSQL.`);
  for (const c of catRes.rows) {
    await db.collection('categories').updateOne(
      { slug: c.slug },
      {
        $setOnInsert: { _id: c.id },
        $set: {
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        },
      },
      { upsert: true },
    );
  }
  console.log('✅ Categories replicated to MongoDB.');

  // C. Sync Articles
  const artRes = await pgClient.query('SELECT * FROM articles');
  console.log(`Found ${artRes.rows.length} articles in PostgreSQL.`);
  for (const a of artRes.rows) {
    await db.collection('articles').updateOne(
      { slug: a.slug },
      {
        $setOnInsert: { _id: a.id },
        $set: {
          id: a.id,
          title: a.title,
          slug: a.slug,
          description: a.description,
          content: a.content,
          authorId: a.author_id,
          categoryId: a.category_id,
          tagIds: a.tag_ids || [],
          coverImage: a.cover_image,
          status: a.status,
          seoTitle: a.seo_title,
          seoDescription: a.seo_description,
          scheduledAt: a.scheduled_at,
          reviewNote: a.review_note,
          wordCount: a.word_count || 0,
          readingTimeMinutes: a.reading_time_minutes || 1,
          canonicalUrl: a.canonical_url,
          socialImage: a.social_image,
          version: a.version || 1,
          publishedAt: a.published_at,
          createdAt: a.created_at,
          updatedAt: a.updated_at,
        },
      },
      { upsert: true },
    );
  }
  console.log('✅ Articles replicated to MongoDB.');

  // D. Sync Revisions
  const revRes = await pgClient.query('SELECT * FROM cms_article_revisions');
  console.log(`Found ${revRes.rows.length} revisions in PostgreSQL.`);
  for (const r of revRes.rows) {
    await db.collection('article_revisions').updateOne(
      { articleId: r.article_id, version: r.version },
      {
        $setOnInsert: { _id: r.id },
        $set: {
          id: r.id,
          articleId: r.article_id,
          version: r.version,
          title: r.title,
          description: r.description,
          content: r.content,
          changeSummary: r.change_summary,
          authorId: r.author_id,
          createdAt: r.created_at,
        },
      },
      { upsert: true },
    );
  }
  console.log('✅ Revisions replicated to MongoDB.');

  console.log('🎉 Full baseline replication completed successfully!');

  await pgClient.end();
  await mongoose.disconnect();
}

syncPostgresToMongo().catch(console.error);
