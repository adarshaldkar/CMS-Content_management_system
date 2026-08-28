import { Pool } from 'pg';

async function testCategoryQuery() {
  const p = new Pool({ connectionString: 'postgresql://postgres:asd123@localhost:5432/cms_platform' });
  try {
    console.log('--- 1. Testing Categories table ---');
    const catRes = await p.query('SELECT id, name, slug FROM categories');
    console.log('Categories:', catRes.rows);

    console.log('\n--- 2. Testing Articles table ---');
    const artRes = await p.query('SELECT id, title, category_id, status FROM articles LIMIT 10');
    console.log('Articles sample:', artRes.rows);

    console.log('\n--- 3. Testing Filter by slug: "artificial-intelligence" ---');
    const query = `
      SELECT a.id, a.title, a.category_id, cat.name as category_name, cat.slug as category_slug
      FROM articles a
      LEFT JOIN categories cat ON cat.id::text = a.category_id::text
      WHERE (
        a.category_id IN (SELECT id::text FROM categories WHERE slug = ANY($1))
      )
    `;
    const filterRes = await p.query(query, [['artificial-intelligence']]);
    console.log(`Matched for 'artificial-intelligence': ${filterRes.rows.length}`);
    filterRes.rows.forEach(r => console.log(`  - [${r.category_slug}] ${r.title}`));

    console.log('\n--- 4. Testing All Category Slugs on Articles ---');
    const allArts = await p.query(`
      SELECT a.id, a.title, a.category_id, cat.name as category_name, cat.slug as category_slug
      FROM articles a
      LEFT JOIN categories cat ON cat.id::text = a.category_id::text
    `);
    allArts.rows.forEach(r => console.log(`  - Category: ${r.category_slug || 'NULL'} | Title: ${r.title}`));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await p.end();
  }
}

testCategoryQuery();
