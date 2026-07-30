const mongoose = require('mongoose');
const https = require('https');

// Локально база работает без авторизации, поэтому по умолчанию подключаемся без логина/пароля.
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pushistyzavod';


const blogArticleSchema = new mongoose.Schema({
  title: String,
  slug: String,
  url: String,
  image: String,
  description: String,
  htmlContent: String,
  pubDate: Date,
}, { timestamps: true, collection: 'blogarticles' });

const BlogArticle = mongoose.model('BlogArticle', blogArticleSchema);

function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    
    const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = content.match(/<link>([\s\S]*?)<\/link>/);
    const descMatch = content.match(/<description>([\s\S]*?)<\/description>/);
    const dateMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const enclosureMatch = content.match(/<enclosure[^>]+url="([^"]+)"/);
    const turboContentMatch = content.match(/<turbo:content>([\s\S]*?)<\/turbo:content>/);

    if (titleMatch && linkMatch) {
      const url = linkMatch[1].trim();
      const slug = url.split('/').pop();
      
      let htmlContent = '';
      if (turboContentMatch) {
        // Extract CDATA
        const cdata = turboContentMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
        // Extract just the content (skip header/figure already in html)
        const bodyParts = [];
        const tagRegex = /<(h[1-3][^>]*>|div[^>]*>|p[^>]*>|figure[^>]*>|header[^>]*>|ul[^>]*>|ol[^>]*>|li[^>]*>|img[^>]*>)/g;
        let tagMatch;
        const tags = [];
        while ((tagMatch = tagRegex.exec(cdata)) !== null) {
          tags.push(tagMatch[0]);
        }
        htmlContent = cdata;
      }

      items.push({
        title: titleMatch[1].trim(),
        slug: slug,
        url: url,
        image: enclosureMatch ? enclosureMatch[1] : '',
        description: descMatch ? descMatch[1].trim() : '',
        htmlContent: htmlContent,
        pubDate: dateMatch ? new Date(dateMatch[1].trim()) : new Date(),
      });
    }
  }
  return items;
}

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected');

    const rssUrl = 'https://pushistyzavod.ru/rss-feed-461488483431.xml';
    console.log('📥 Fetching RSS feed...');
    const xml = await fetchRSS(rssUrl);
    
    const articles = parseRSS(xml);
    console.log(`📄 Found ${articles.length} articles`);

    for (const article of articles) {
      await BlogArticle.findOneAndUpdate(
        { slug: article.slug },
        article,
        { upsert: true, new: true }
      );
      console.log(`  ✅ ${article.title}`);
    }

    console.log(`🎉 Saved ${articles.length} articles to MongoDB`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seed();