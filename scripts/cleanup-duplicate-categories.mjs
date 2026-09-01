import pg from 'pg';
import { MongoClient } from 'mongodb';
import mysql from 'mysql2/promise';

const postgresUrl = process.env.DATABASE_URL || 'postgresql://postgres:asd123@localhost:5432/cms_platform';
const mongoUri = process.env.MONGO_URI || 'mongodb+srv://adarshaldkar_db_user:13spWPljQOm3KLBW@cluster0.skpnev3.mongodb.net/cms_platform?retryWrites=true&w=majority';
const mariadbUrl = process.env.MARIADB_URL || 'mysql://cms:cms_dev_password@localhost:3307/cms_platform';
const mysqlUrl = process.env.MYSQL_URL || 'mysql://cms:cms_dev_password@localhost:3308/cms_platform';
const cockroachUrl = process.env.COCKROACH_URL || 'postgresql://root@localhost:26257/cms_platform?sslmode=disable';

async function cleanupPostgresLike(url, dbName) {
  console.log(`[${dbName}] Cleaning up duplicate and timestamped categories...`);
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    await client.query("DELETE FROM categories WHERE name LIKE 'GovTech %' OR name LIKE 'Health care%' OR (name = 'Artificial Intelligence' AND slug = 'ai') OR (name = 'Governance' AND slug = 'policy-governance')");
    console.log(`[${dbName}] Cleanup successful.`);
  } catch (err) {
    console.error(`[${dbName}] Error:`, err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

async function cleanupMysqlLike(url, dbName) {
  console.log(`[${dbName}] Cleaning up duplicate and timestamped categories...`);
  try {
    const conn = await mysql.createConnection(url);
    await conn.query("DELETE FROM categories WHERE name LIKE 'GovTech %' OR name LIKE 'Health care%' OR (name = 'Artificial Intelligence' AND slug = 'ai') OR (name = 'Governance' AND slug = 'policy-governance')");
    await conn.end();
    console.log(`[${dbName}] Cleanup successful.`);
  } catch (err) {
    console.error(`[${dbName}] Error:`, err.message);
  }
}

async function cleanupMongo() {
  console.log('[MongoDB] Cleaning up duplicate and timestamped categories...');
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db();
    await db.collection('categories').deleteMany({
      $or: [
        { name: { $regex: /^GovTech \d+/ } },
        { name: { $regex: /^Health care/ } },
        { name: 'Artificial Intelligence', slug: 'ai' },
        { name: 'Governance', slug: 'policy-governance' },
      ],
    });
    console.log('[MongoDB] Cleanup successful.');
  } catch (err) {
    console.error('[MongoDB] Error:', err.message);
  } finally {
    await client.close().catch(() => {});
  }
}

async function main() {
  await cleanupPostgresLike(postgresUrl, 'PostgreSQL');
  await cleanupPostgresLike(cockroachUrl, 'CockroachDB');
  await cleanupMysqlLike(mariadbUrl, 'MariaDB');
  await cleanupMysqlLike(mysqlUrl, 'MySQL');
  await cleanupMongo();
  console.log('All database cleanups complete!');
}

main().catch(console.error);
