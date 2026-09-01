import pg from 'pg';
import mongoose from 'mongoose';

async function updateArticles() {
  const editorialTopics = [
    {
      title: 'Artificial Intelligence and the Frontier of Autonomous Cognition',
      slugPrefix: 'artificial-intelligence',
      category: 'ai',
      image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&auto=format&fit=crop&q=80',
      description: 'Machine learning breakthroughs, transformer reasoning architectures, and the emergence of verified AI workflows.',
    },
    {
      title: 'Zero-Trust Architectures and Threat Intelligence in Modern Infrastructure',
      slugPrefix: 'cybersecurity',
      category: 'cybersecurity',
      image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&auto=format&fit=crop&q=80',
      description: 'How distributed defense protocols protect mission-critical state against automated adversaries and state-level intrusions.',
    },
    {
      title: 'The Craft of Typographic Rhythm and Digital Newsroom Design',
      slugPrefix: 'editorial-design',
      category: 'editorial-design',
      image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200&auto=format&fit=crop&q=80',
      description: 'Examining font geometry, responsive grid systems, and the preservation of journalistic gravity in modern digital reading.',
    },
    {
      title: 'Zero-Buffer Dual-Database Persistence and High-Concurrency Synchronization',
      slugPrefix: 'software-architecture',
      category: 'software-architecture',
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
      description: 'Architecting high-availability CMS backends with PostgreSQL and MongoDB seamless multi-tenant switching.',
    },
    {
      title: 'Information Networks, Algorithmic Curation, and Societal Resilience',
      slugPrefix: 'media-culture',
      category: 'media-culture',
      image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=80',
      description: 'An investigative study on the feedback mechanics of recommendation feeds and public trust in independent reporting.',
    },
    {
      title: 'Quantum Telemetry and the Limits of Precision Astrometry',
      slugPrefix: 'science',
      category: 'science',
      image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&auto=format&fit=crop&q=80',
      description: 'Recent observations in astrophysics and laser interferometry reveal new insights into gravitational wave detection.',
    },
    {
      title: 'Platform Sovereignty and the Evolution of Transnational Governance',
      slugPrefix: 'policy-governance',
      category: 'policy-governance',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
      description: 'The legal and regulatory frameworks navigating artificial intelligence, data sovereignty, and digital monopolies.',
    },
    {
      title: 'Low-Latency Streaming Pipelines and Real-Time Event Brokers',
      slugPrefix: 'technology',
      category: 'technology',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
      description: 'How modern edge networks process millions of telemetry packets per second with verified delivery guarantees.',
    },
  ];

  try {
    const c = new pg.Client('postgresql://postgres:asd123@localhost:5432/cms_platform');
    await c.connect();

    const catRes = await c.query('SELECT id, slug FROM categories');
    const catMap = Object.fromEntries(catRes.rows.map((r) => [r.slug, r.id]));

    // Update Story of Pie to Science
    if (catMap['science']) {
      await c.query(
        `UPDATE articles 
         SET category_id = $1, 
             cover_image = 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1200&auto=format&fit=crop&q=80',
             description = 'An exploration into the mathematical history of pi, ancient approximations, and modern computation.'
         WHERE slug = 'story-of-pie'`,
        [catMap['science']]
      );
    }

    // Update published articles by distributing them
    const artsRes = await c.query(
      `SELECT id, slug, title FROM articles WHERE status = 'published' AND slug != 'story-of-pie' ORDER BY created_at DESC`
    );

    for (let i = 0; i < artsRes.rows.length; i++) {
      const art = artsRes.rows[i];
      if (art.slug.startsWith('artificial-intelligence')) {
        const catId = catMap['ai'] || catMap['artificial-intelligence'];
        await c.query(
          `UPDATE articles SET category_id = $1, cover_image = $2, description = $3 WHERE id = $4`,
          [
            catId,
            editorialTopics[0].image,
            editorialTopics[0].description,
            art.id,
          ]
        );
        continue;
      }

      const topic = editorialTopics[(i + 1) % editorialTopics.length];
      const catId = catMap[topic.category] || catMap[topic.category.replace(/-/g, '_')];
      if (catId) {
        await c.query(
          `UPDATE articles SET title = $1, description = $2, cover_image = $3, category_id = $4 WHERE id = $5`,
          [topic.title, topic.description, topic.image, catId, art.id]
        );
      }
    }

    await c.end();
    console.log('✅ PostgreSQL articles categorized & distributed with authentic topics.');
  } catch (err) {
    console.warn('PG update error:', err.message);
  }

  try {
    await mongoose.connect(
      'mongodb+srv://adarshaldkar_db_user:13spWPljQOm3KLBW@cluster0.skpnev3.mongodb.net/cms_platform?retryWrites=true&w=majority'
    );
    const db = mongoose.connection.db;

    const mongoCats = await db.collection('categories').find({}).toArray();
    const mongoCatMap = Object.fromEntries(mongoCats.map((r) => [r.slug, r._id]));

    if (mongoCatMap['science']) {
      await db.collection('articles').updateMany(
        { slug: 'story-of-pie' },
        {
          $set: {
            categoryId: mongoCatMap['science'],
            coverImage: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1200&auto=format&fit=crop&q=80',
            description: 'An exploration into the mathematical history of pi, ancient approximations, and modern computation.',
          },
        }
      );
    }

    const mongoArts = await db.collection('articles').find({ status: 'published', slug: { $ne: 'story-of-pie' } }).sort({ createdAt: -1 }).toArray();

    for (let i = 0; i < mongoArts.length; i++) {
      const art = mongoArts[i];
      if (art.slug.startsWith('artificial-intelligence')) {
        const catId = mongoCatMap['ai'] || mongoCatMap['artificial-intelligence'];
        await db.collection('articles').updateOne(
          { _id: art._id },
          {
            $set: {
              categoryId: catId,
              coverImage: editorialTopics[0].image,
              description: editorialTopics[0].description,
            },
          }
        );
        continue;
      }

      const topic = editorialTopics[(i + 1) % editorialTopics.length];
      const catId = mongoCatMap[topic.category] || mongoCatMap[topic.category.replace(/-/g, '_')];
      if (catId) {
        await db.collection('articles').updateOne(
          { _id: art._id },
          {
            $set: {
              title: topic.title,
              description: topic.description,
              coverImage: topic.image,
              categoryId: catId,
            },
          }
        );
      }
    }

    await mongoose.disconnect();
    console.log('✅ MongoDB articles categorized & distributed with authentic topics.');
  } catch (err) {
    console.warn('Mongo update error:', err.message);
  }
}

updateArticles();
