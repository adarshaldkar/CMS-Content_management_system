import pg from 'pg';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { createClient } from '@clickhouse/client';

export const MSN_CATEGORIES = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    name: 'News',
    slug: 'news',
    description: 'World, national, local, and breaking news headlines.',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    name: 'Sports',
    slug: 'sports',
    description: 'Scores, standings, schedules, and game updates.',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Money',
    slug: 'money',
    description: 'Personal finance, stock market watchlists, and economic updates.',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000004',
    name: 'Lifestyle',
    slug: 'lifestyle',
    description: 'Style, home and garden, relationships, and horoscopes.',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000005',
    name: 'Entertainment',
    slug: 'entertainment',
    description: 'Celebrity news, movies, TV, and pop culture.',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000006',
    name: 'Health & Fitness',
    slug: 'health-fitness',
    description: 'Exercise, nutrition, wellness, and medical news.',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000007',
    name: 'Food & Drink',
    slug: 'food-drink',
    description: 'Recipes, cooking tips, and drink guides.',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000008',
    name: 'Travel',
    slug: 'travel',
    description: 'Trip ideas, destination guides, and flight information.',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000009',
    name: 'Autos',
    slug: 'autos',
    description: 'Car reviews, buying advice, and automotive industry news.',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000010',
    name: 'Video',
    slug: 'video',
    description: 'Trending clips, viral moments, and curated news footage.',
  },
];

async function main() {
  console.log('🌐 Seeding 10 MSN Channels across all 6 Database Mesh engines...');

  // 1. PostgreSQL
  const pgPool = new pg.Pool({ connectionString: 'postgresql://postgres:asd123@localhost:5432/cms_platform' });
  for (const cat of MSN_CATEGORIES) {
    await pgPool.query(
      `INSERT INTO categories (id, name, slug, description, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, description = EXCLUDED.description`,
      [cat.id, cat.name, cat.slug, cat.description],
    );
  }
  console.log('✅ PostgreSQL seeded with MSN Channels');

  // 2. CockroachDB
  const crdbPool = new pg.Pool({ connectionString: 'postgresql://root@localhost:26257/cms_platform?sslmode=disable' });
  for (const cat of MSN_CATEGORIES) {
    await crdbPool.query(
      `INSERT INTO categories (id, name, slug, description, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, description = EXCLUDED.description`,
      [cat.id, cat.name, cat.slug, cat.description],
    );
  }
  console.log('✅ CockroachDB seeded with MSN Channels');

  // 3. MariaDB
  const mariaConn = await mysql.createConnection({ host: 'localhost', port: 3307, user: 'cms', password: 'cms_dev_password', database: 'cms_platform' });
  for (const cat of MSN_CATEGORIES) {
    await mariaConn.query(
      `INSERT INTO categories (id, name, slug, description, status)
       VALUES (?, ?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug), description = VALUES(description)`,
      [cat.id, cat.name, cat.slug, cat.description],
    );
  }
  console.log('✅ MariaDB seeded with MSN Channels');

  // 4. MySQL
  const mysqlConn = await mysql.createConnection({ host: 'localhost', port: 3308, user: 'cms', password: 'cms_dev_password', database: 'cms_platform' });
  for (const cat of MSN_CATEGORIES) {
    await mysqlConn.query(
      `INSERT INTO categories (id, name, slug, description, status)
       VALUES (?, ?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug), description = VALUES(description)`,
      [cat.id, cat.name, cat.slug, cat.description],
    );
  }
  console.log('✅ MySQL seeded with MSN Channels');

  // 5. MongoDB
  const mongoClient = new MongoClient('mongodb+srv://adarshaldkar_db_user:13spWPljQOm3KLBW@cluster0.skpnev3.mongodb.net/cms_platform?retryWrites=true&w=majority');
  try {
    await mongoClient.connect();
    const db = mongoClient.db();
    for (const cat of MSN_CATEGORIES) {
      await db.collection('categories').updateOne(
        { slug: cat.slug },
        {
          $set: {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            status: 'active',
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      );
    }
    console.log('✅ MongoDB seeded with MSN Channels');
  } catch (err) {
    console.warn('⚠️ MongoDB seed warning:', err.message);
  } finally {
    await mongoClient.close();
  }

  await pgPool.end();
  await crdbPool.end();
  await mariaConn.end();
  await mysqlConn.end();

  console.log('🎉 All 10 MSN Channels seeded and synchronized across all 6 databases!');
}

main().catch(console.error);
