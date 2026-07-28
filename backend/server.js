const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');


const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Tilda scripts need relaxed CSP
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Schemas
const formSubmissionSchema = new mongoose.Schema({
  formName: String,
  formPage: String,
  name: String,
  email: String,
  phone: String,
  message: String,
  comment: String,
  customFields: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const FormSubmission = mongoose.model('FormSubmission', formSubmissionSchema);

// Contact/callback schema
const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  message: String,
  source: String,
}, { timestamps: true });

const Contact = mongoose.model('Contact', contactSchema);

// Blog article schema
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

// API Routes - Handle Tilda form submissions
app.post('/api/form', async (req, res) => {
  try {
    const { formName, formPage, name, email, phone, message, comment, ...customFields } = req.body;
    
    const submission = new FormSubmission({
      formName: formName || req.body.formname || 'unnamed',
      formPage: formPage || req.body.tildaspec_formname || 'unknown',
      name: name || req.body.Name,
      email: email || req.body.Email,
      phone: phone || req.body.Phone,
      message: message || req.body.Message || req.body.comment,
      comment: comment || req.body.comment,
      customFields,
    });
    
    await submission.save();
    console.log('📝 Form submission saved:', submission._id);
    
    res.json({ 
      status: 'success', 
      message: 'Спасибо! Ваша заявка принята.',
      id: submission._id 
    });
  } catch (error) {
    console.error('Form error:', error);
    res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
  }
});

// Alternative form endpoint for Tilda compatibility
app.post('/api/contact', async (req, res) => {
  try {
    const contact = new Contact({
      name: req.body.Name || req.body.name,
      email: req.body.Email || req.body.email,
      phone: req.body.Phone || req.body.phone,
      message: req.body.Message || req.body.message || req.body.comment,
      source: req.body.source || 'website',
    });
    
    await contact.save();
    console.log('📞 Contact saved:', contact._id);
    
    res.json({ status: 'success', message: 'Спасибо! Мы свяжемся с вами.' });
  } catch (error) {
    console.error('Contact error:', error);
    res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
  }
});

// Blog articles API
app.get('/api/blog', async (req, res) => {
  try {
    const articles = await BlogArticle.find().sort({ pubDate: -1 }).lean();
    res.json({ status: 'success', articles });
  } catch (error) {
    console.error('Blog fetch error:', error);
    res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mongo: mongoose.connection.readyState === 1 });
});

// Serve static files (Tilda export + new landing).
// Locally the "public" folder lives at the repo root, in Docker it is mounted at /app/public.
// STATIC_DIR lets us override the path without breaking the container setup.
const staticDir = process.env.STATIC_DIR
  ? path.resolve(process.env.STATIC_DIR)
  : path.join(__dirname, 'public');
console.log('📁 Serving static from:', staticDir);

app.use(express.static(staticDir, {
  index: false, // let the "/" route serve the new prototype homepage
  setHeaders: (res, filePath) => {

    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));

// New B2B prototype site (folder "prototype" at repo root).
// PROTOTYPE_DIR lets us override the path (e.g. in Docker).
// Try common locations so it works both in Docker (mounted at /app/prototype)
// and locally (folder at the repo root, i.e. one level above /backend).
const prototypeCandidates = [
  process.env.PROTOTYPE_DIR && path.resolve(process.env.PROTOTYPE_DIR),
  path.join(__dirname, 'prototype'),        // Docker: /app/prototype
  path.join(__dirname, '..', 'prototype'),  // Local: <repo>/prototype
].filter(Boolean);

const prototypeDir =
  prototypeCandidates.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) ||
  prototypeCandidates[prototypeCandidates.length - 1];

console.log('🆕 Serving new prototype from:', prototypeDir);


// Serve prototype static assets (if any are added later, e.g. /prototype/img/...)
app.use('/prototype', express.static(prototypeDir));

const prototypePages = {
  '/': 'index.html',
  '/soft-toys.html': 'soft-toys.html',
  '/soft-goods.html': 'soft-goods.html',
  '/pvc-figures.html': 'pvc-figures.html',
  '/works.html': 'works.html',
  '/production.html': 'production.html',
  '/news.html': 'news.html',
  '/privacy.html': 'privacy.html',
};


Object.entries(prototypePages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(prototypeDir, file));
  });
});

// Route mapping (from htaccess)
const pageRoutes = {
  '/legacy': 'index.html',
  '/old': 'page40738358.html',
  '/main': 'page40738358.html',


  '/privacy': 'page40861203.html',
  '/happynewyear': 'page41124919.html',
  '/blog': 'page68079733.html',
  '/korporativnye-myagkie-igrushki-s-logotipom': 'page69512967.html',
  '/korporativnye-podarki-na-novyj-god': 'page69877857.html',
  '/korporativnye-podarki-na-8-marta': 'page69880855.html',
  '/korporativnye-podarki-na-23-fevralya': 'page69883579.html',
  '/korporativnye-novogodnie-podarki-detyam': 'page69886785.html',
  '/podarki-sotrudnikam-na-den-rozhdeniya-kompanii': 'page70261533.html',
  '/proizvodstvo-plastikovyh-igrushek-na-zakaz': 'page70664017.html',
  '/slider': 'page68731663.html',
};

// Serve pages
Object.entries(pageRoutes).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(staticDir, file));
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(staticDir, '404.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});