import pg from 'pg';
import argon2 from 'argon2';

async function seedAdmin() {
  const client = new pg.Client({
    connectionString: 'postgresql://postgres:asd123@localhost:5432/cms_platform',
  });

  await client.connect();

  const hash = await argon2.hash('Password123!', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // 1. Promote existing accounts
  await client.query(`
    UPDATE cms_users
    SET role = 'SUPER_ADMIN', is_active = true
    WHERE email IN ('studywithmeadarsh@gmail.com', 'adarshaldkar@gmail.com');
  `);

  // 2. Create / update admin@gazette.io with SUPER_ADMIN role
  await client.query(`
    INSERT INTO cms_users (email, name, password_hash, role, is_active)
    VALUES ('admin@gazette.io', 'Editorial Administrator', '${hash}', 'SUPER_ADMIN', true)
    ON CONFLICT (email) DO UPDATE
    SET password_hash = '${hash}', role = 'SUPER_ADMIN', is_active = true;
  `);

  console.log('✅ Admin accounts configured successfully:');
  console.log('1. admin@gazette.io (Password: Password123!) -> SUPER_ADMIN');
  console.log('2. studywithmeadarsh@gmail.com -> SUPER_ADMIN');
  console.log('3. adarshaldkar@gmail.com -> SUPER_ADMIN');

  await client.end();
}

seedAdmin().catch(console.error);
