const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://tsyrenovtimur_db_user:JnBTOddzDCUMFQtd@mongo:27017/pushistyzavod?authSource=admin';

const blogArticleSchema = new mongoose.Schema({
  slug: String,
  image: String,
  localImage: String,
}, { collection: 'blogarticles' });

const BlogArticle = mongoose.model('BlogArticle', blogArticleSchema);

// Mapping: slug -> localImage
const imageMap = {
  'bik13hn5o1-pochemu-korporativnie-igrushki-eto-bolsh': '/images/blog/bik13hn5o1-pochemu-korporativnie-igrushki-eto-bolsh.png',
  '21sag09601-korporativnie-myagkie-igrushki-s-logotip': '/images/blog/21sag09601-korporativnie-myagkie-igrushki-s-logotip.PNG',
  '3i5l9hmvu1-suvenirnaya-produktsiya-zachem-ona-nuzhn': '/images/blog/3i5l9hmvu1-suvenirnaya-produktsiya-zachem-ona-nuzhn.PNG',
  'jtsz5fsau1-idei-korporativnih-podarkov-neobichnie-r': '/images/blog/jtsz5fsau1-idei-korporativnih-podarkov-neobichnie-r.PNG',
  'ptpayki4k1-korporativnie-podarki-2025-glavnie-trend': '/images/blog/ptpayki4k1-korporativnie-podarki-2025-glavnie-trend.png',
  'x19dac6nk1-brendirovanie-podarkov-kak-pushistii-zav': '/images/blog/x19dac6nk1-brendirovanie-podarkov-kak-pushistii-zav.png',
  'aibzvljb91-kak-vibrat-korporativnii-podarok-s-uchet': '/images/blog/aibzvljb91-kak-vibrat-korporativnii-podarok-s-uchet.png',
  'js8sc4ypb1-kak-brendirovannie-suveniri-pomogayut-ud': '/images/blog/js8sc4ypb1-kak-brendirovannie-suveniri-pomogayut-ud.png',
};

async function update() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    for (const [slug, localImage] of Object.entries(imageMap)) {
      const result = await BlogArticle.updateOne(
        { slug },
        { $set: { localImage } }
      );
      console.log(`  💾 ${slug}: ${result.modifiedCount > 0 ? 'updated' : 'already set'}`);
    }

    console.log('🎉 All localImage fields updated!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

update();