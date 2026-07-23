const mongoose = require('mongoose');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://tsyrenovtimur_db_user:JnBTOddzDCUMFQtd@mongo:27017/pushistyzavod?authSource=admin';
const IMAGE_DIR = path.join(__dirname, '..', 'public', 'images', 'blog');

const blogArticleSchema = new mongoose.Schema({
  title: String,
  slug: String,
  url: String,
  image: String,
  localImage: String,
  description: String,
  htmlContent: String,
  pubDate: Date,
}, { timestamps: true, collection: 'blogarticles' });

const BlogArticle = mongoose.model('BlogArticle', blogArticleSchema);

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

async function sync() {
  try {
    // Connect to local MongoDB (for seeding)
    const localMongoUri = 'mongodb://localhost:27017/pushistyzavod';
    await mongoose.connect(localMongoUri);
    console.log('✅ Connected to local MongoDB');

    if (!fs.existsSync(IMAGE_DIR)) {
      fs.mkdirSync(IMAGE_DIR, { recursive: true });
    }

    const articles = await BlogArticle.find({});
    console.log(`📄 Processing ${articles.length} articles...`);

    for (const article of articles) {
      if (!article.image) continue;

      // Generate local filename from slug + original extension
      const ext = path.extname(new URL(article.image).pathname).split('?')[0] || '.png';
      const filename = article.slug + ext;
      const localPath = path.join(IMAGE_DIR, filename);
      const localUrl = '/images/blog/' + filename;

      // Download if not exists
      if (!fs.existsSync(localPath)) {
        try {
          await downloadFile(article.image, localPath);
          console.log(`  ⬇️  Downloaded: ${filename}`);
        } catch (err) {
          console.error(`  ❌ Failed: ${filename} - ${err.message}`);
          continue;
        }
      } else {
        console.log(`  ✓ Already exists: ${filename}`);
      }

      // Update MongoDB with localImage path
      await BlogArticle.updateOne(
        { _id: article._id },
        { $set: { localImage: localUrl } }
      );
      console.log(`  💾 Saved localImage: ${localUrl}`);
    }

    console.log('🎉 All images synced!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

sync();