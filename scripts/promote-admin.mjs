import pg from 'pg';

async function main() {
  const pool = new pg.Pool({ connectionString: 'postgresql://postgres:asd123@localhost:5432/cms_platform' });
  const res = await pool.query("UPDATE cms_users SET role = 'SUPER_ADMIN' WHERE email = 'admin@gazette.com'");
  console.log('Updated admin@gazette.com role to SUPER_ADMIN:', res.rowCount);
  await pool.end();
}

main().catch(console.error);
