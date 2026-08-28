import { Pool } from 'pg';

async function testBackendFilter() {
  const p = new Pool({ connectionString: 'postgresql://postgres:asd123@localhost:5432/cms_platform' });
  const slugs = ['artificial-intelligence'];

  const values = [];
  const clauses = ['a.deleted_at IS NULL'];

  // Status
  values.push('published');
  clauses.push(`a.status = $${values.length}`);

  // categorySlugs
  values.push(slugs);
  clauses.push(
    `(
      a.category_id IN (SELECT id::text FROM categories WHERE slug = ANY($${values.length}))
      OR a.id IN (
        SELECT a2.id FROM articles a2
        JOIN categories cat ON cat.slug = ANY($${values.length})
        WHERE (a2.title ILIKE '%' || cat.name || '%'
               OR a2.description ILIKE '%' || cat.name || '%')
          AND a2.category_id IS NULL
          AND a2.deleted_at IS NULL
      )
    )`
  );

  const sql = `
    SELECT a.id, a.title, a.category_id, cat.name as category_name, cat.slug as category_slug
    FROM articles a
    LEFT JOIN categories cat ON cat.id::text = a.category_id::text
    WHERE ${clauses.join(' AND ')}
  `;

  console.log('Running SQL:\n', sql);
  console.log('Values:', values);

  const res = await p.query(sql, values);
  console.log(`\nResult Count: ${res.rows.length}`);
  res.rows.forEach((r) => console.log(`  - [${r.category_slug}] ${r.title}`));

  await p.end();
}

testBackendFilter();
