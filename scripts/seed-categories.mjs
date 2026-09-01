import pg from 'pg';
import mongoose from 'mongoose';
import crypto from 'crypto';

const categories = [
  { name: 'Technology', slug: 'technology', description: 'Computing, systems engineering, and hardware advances.' },
  { name: 'Artificial Intelligence', slug: 'artificial-intelligence', description: 'Machine learning, neural networks, and AI policy.' },
  { name: 'Artificial Intelligence', slug: 'ai', description: 'AI research and machine intelligence.' },
  { name: 'Cybersecurity', slug: 'cybersecurity', description: 'Zero-trust architecture, threat vectors, and cryptography.' },
  { name: 'Editorial Design', slug: 'editorial-design', description: 'Master typographic rhythm, print layouts, and digital publications.' },
  { name: 'Software Architecture', slug: 'software-architecture', description: 'Distributed systems, database replication, and resilient APIs.' },
  { name: 'Media & Society', slug: 'media-culture', description: 'Digital communications, journalistic ethics, and public interest.' },
  { name: 'Science', slug: 'science', description: 'Empirical discovery, fundamental research, and scientific inquiry.' },
  { name: 'Governance', slug: 'policy-governance', description: 'Technology regulations, antitrust, and open standards.' },
  { name: 'Governance', slug: 'governance', description: 'Digital governance and policy.' },
];

async function seed() {
  try {
    const c = new pg.Client('postgresql://postgres:asd123@localhost:5432/cms_platform');
    await c.connect();
    for (const cat of categories) {
      await c.query(
        'INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) ON CONFLICT (slug) DO UPDATE SET name = $1, description = $3',
        [cat.name, cat.slug, cat.description]
      );
    }
    await c.end();
    console.log('✅ PostgreSQL categories seeded successfully.');
  } catch (err) {
    console.warn('PostgreSQL seed warning:', err.message);
  }

  try {
    await mongoose.connect('mongodb+srv://adarshaldkar_db_user:13spWPljQOm3KLBW@cluster0.skpnev3.mongodb.net/cms_platform?retryWrites=true&w=majority');
    const db = mongoose.connection.db;
    for (const cat of categories) {
      await db.collection('categories').updateOne(
        { slug: cat.slug },
        {
          $setOnInsert: { _id: crypto.randomUUID() },
          $set: { name: cat.name, slug: cat.slug, description: cat.description, updatedAt: new Date() }
        },
        { upsert: true }
      );
    }
    await mongoose.disconnect();
    console.log('✅ MongoDB categories seeded successfully.');
  } catch (err) {
    console.warn('MongoDB seed warning:', err.message);
  }
}

seed();
