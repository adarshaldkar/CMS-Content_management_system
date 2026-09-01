import mongoose from 'mongoose';

async function checkMongo() {
  await mongoose.connect(
    'mongodb+srv://adarshaldkar_db_user:13spWPljQOm3KLBW@cluster0.skpnev3.mongodb.net/cms_platform?retryWrites=true&w=majority',
  );

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('MongoDB Collections found:', collections.map((c) => c.name));

  for (const c of collections) {
    const count = await mongoose.connection.db.collection(c.name).countDocuments();
    console.log(`- ${c.name}: ${count} documents`);
    if (count > 0 && c.name.includes('article')) {
      const sample = await mongoose.connection.db.collection(c.name).find().limit(2).toArray();
      console.log('Sample article:', sample.map((s) => ({ title: s.title, status: s.status })));
    }
  }

  await mongoose.disconnect();
}

checkMongo().catch(console.error);
