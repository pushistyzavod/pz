const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// .env loader (без внешних зависимостей).
// Раньше server.js читал только process.env, поэтому при обычном `npm start`
// переменные из .env не подхватывались: MONGO_URI = undefined -> падало
// подключение к базе, а статика искалась в несуществующей папке backend/public.
// ---------------------------------------------------------------------------
function loadEnvFile() {
  const candidates = [
    process.env.ENV_FILE,
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env'),
  ].filter(Boolean);

  const file = candidates.find((f) => fs.existsSync(f));
  if (!file) return null;

  const content = fs.readFileSync(file, 'utf8');
  content.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('=')) return;

    const eq = line.indexOf('=');
    if (eq === -1) return;

    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return; // пропускаем строки-заголовки вида "==== MongoDB ===="

    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  });

  return file;
}

const envFile = loadEnvFile();
if (envFile) console.log('⚙️  Загружен файл настроек:', envFile);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IN_DOCKER = fs.existsSync('/.dockerenv');

// ---------------------------------------------------------------------------
// Адрес MongoDB.
// В .env хост "mongo" — это имя сервиса Docker, локально его не существует,
// поэтому вне контейнера подставляем 127.0.0.1.
// ---------------------------------------------------------------------------
function resolveMongoUri() {
  const db = process.env.MONGO_DB || 'pushistyzavod';
  const port = process.env.MONGO_PORT || '27017';
  const local = `mongodb://127.0.0.1:${port}/${db}`;
  const uri = process.env.MONGO_URI;

  if (!uri) return local;
  if (!IN_DOCKER && /(?:@|\/\/)mongo(?::\d+)?(?:\/|$)/.test(uri)) return local;
  return uri;
}

const MONGO_URI = resolveMongoUri();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Tilda scripts need relaxed CSP
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// MongoDB connection.
// Ошибка подключения больше не роняет сайт: страницы отдаются как обычно,
// а заявки сохраняются в файл, чтобы ничего не потерялось.
// ---------------------------------------------------------------------------
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('✅ MongoDB connected:', MONGO_URI.replace(/\/\/[^@]*@/, '//***@')))
  .catch((err) => {
    console.warn('⚠️  MongoDB недоступна, сайт работает без базы:', err.message);
  });

mongoose.connection.on('error', (err) => {
  console.warn('⚠️  Ошибка MongoDB:', err.message);
});

const dbReady = () => mongoose.connection.readyState === 1;

const FALLBACK_DIR = path.join(__dirname, 'data');
function saveToFile(name, payload) {
  try {
    fs.mkdirSync(FALLBACK_DIR, { recursive: true });
    fs.appendFileSync(
      path.join(FALLBACK_DIR, name),
      JSON.stringify({ ...payload, savedAt: new Date().toISOString() }) + '\n',
      'utf8'
    );
    return true;
  } catch (e) {
    console.error('Не удалось сохранить заявку в файл:', e.message);
    return false;
  }
}

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
  const { formName, formPage, name, email, phone, message, comment, ...customFields } = req.body || {};

  const data = {
    formName: formName || req.body.formname || 'unnamed',
    formPage: formPage || req.body.tildaspec_formname || 'unknown',
    name: name || req.body.Name,
    email: email || req.body.Email,
    phone: phone || req.body.Phone,
    message: message || req.body.Message || req.body.comment,
    comment: comment || req.body.comment,
    customFields,
  };

  try {
    if (!dbReady()) {
      saveToFile('form-submissions.jsonl', data);
      console.log('📝 Заявка сохранена в файл (база недоступна)');
      return res.json({ status: 'success', message: 'Спасибо! Ваша заявка принята.' });
    }

    const submission = new FormSubmission(data);
    await submission.save();
    console.log('📝 Form submission saved:', submission._id);

    res.json({
      status: 'success',
      message: 'Спасибо! Ваша заявка принята.',
      id: submission._id,
    });
  } catch (error) {
    console.error('Form error:', error.message);
    saveToFile('form-submissions.jsonl', data);
    res.json({ status: 'success', message: 'Спасибо! Ваша заявка принята.' });
  }
});

// Alternative form endpoint for Tilda compatibility
app.post('/api/contact', async (req, res) => {
  const data = {
    name: req.body.Name || req.body.name,
    email: req.body.Email || req.body.email,
    phone: req.body.Phone || req.body.phone,
    message: req.body.Message || req.body.message || req.body.comment,
    source: req.body.source || 'website',
  };

  try {
    if (!dbReady()) {
      saveToFile('contacts.jsonl', data);
      return res.json({ status: 'success', message: 'Спасибо! Мы свяжемся с вами.' });
    }

    const contact = new Contact(data);
    await contact.save();
    console.log('📞 Contact saved:', contact._id);

    res.json({ status: 'success', message: 'Спасибо! Мы свяжемся с вами.' });
  } catch (error) {
    console.error('Contact error:', error.message);
    saveToFile('contacts.jsonl', data);
    res.json({ status: 'success', message: 'Спасибо! Мы свяжемся с вами.' });
  }
});

// Blog articles API
app.get('/api/blog', async (req, res) => {
  try {
    if (!dbReady()) return res.json({ status: 'success', articles: [] });

    const articles = await BlogArticle.find().sort({ pubDate: -1 }).lean();
    res.json({ status: 'success', articles });
  } catch (error) {
    console.error('Blog fetch error:', error.message);
    res.json({ status: 'success', articles: [] });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mongo: dbReady() });
});

// ---------------------------------------------------------------------------
// Пути к статике.
// Ищем папки в нескольких местах, чтобы работало и в Docker (/app/public),
// и локально (<repo>/public), и при запуске из папки backend.
// ---------------------------------------------------------------------------
function resolveDir(envValue, folder, marker) {
  const candidates = [
    envValue && path.resolve(envValue),
    path.join(__dirname, folder),
    path.join(__dirname, '..', folder),
    path.join(process.cwd(), folder),
  ].filter(Boolean);

  return (
    candidates.find((dir) => fs.existsSync(path.join(dir, marker))) ||
    candidates.find((dir) => fs.existsSync(dir)) ||
    candidates[0]
  );
}

const staticDir = resolveDir(process.env.STATIC_DIR, 'public', 'index.html');
const prototypeDir = resolveDir(process.env.PROTOTYPE_DIR, 'prototype', 'index.html');

console.log('📁 Serving static from:', staticDir);
console.log('🆕 Serving new prototype from:', prototypeDir);

const staticOptions = {
  index: false, // let the "/" route serve the new prototype homepage
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
    if (filePath.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
  },
};

// Tilda export (старый сайт) + общие файлы
app.use(express.static(staticDir, staticOptions));

// Ассеты прототипа: доступны и по /prototype/..., и по короткому пути
// (/images/logo.png, /js/site.js) — раньше короткие пути отдавали 404.
app.use('/prototype', express.static(prototypeDir, staticOptions));
app.use(express.static(prototypeDir, staticOptions));

// Favicon, чтобы браузер не получал 404
app.get('/favicon.ico', (req, res) => {
  const icon = path.join(prototypeDir, 'images', 'logo.png');
  if (fs.existsSync(icon)) return res.type('png').sendFile(icon);
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Страницы
// ---------------------------------------------------------------------------
function sendPage(res, dir, file, next) {
  const full = path.join(dir, file);
  if (!fs.existsSync(full)) {
    console.warn('⚠️  Файл страницы не найден:', full);
    return next ? next() : res.status(404).type('html').send('<h1>404</h1>');
  }
  res.sendFile(full, (err) => {
    if (err && !res.headersSent) {
      console.error('Ошибка отдачи файла', full, err.message);
      res.status(500).type('html').send('<h1>500</h1>');
    }
  });
}

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
  app.get(route, (req, res, next) => sendPage(res, prototypeDir, file, next));
  // дублируем маршрут без .html (/works, /production, ...)
  if (route !== '/') {
    app.get(route.replace(/\.html$/, ''), (req, res, next) => sendPage(res, prototypeDir, file, next));
  }
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
  // /privacy уже занят страницей прототипа выше, поэтому пропускаем дубль
  if (route === '/privacy') return;
  app.get(route, (req, res, next) => sendPage(res, staticDir, file, next));
});

// 404 handler
app.use((req, res) => {
  const notFound = path.join(staticDir, '404.html');
  if (fs.existsSync(notFound)) return res.status(404).sendFile(notFound);
  res.status(404).type('html').send('<h1>404 — страница не найдена</h1><p><a href="/">На главную</a></p>');
});

// Общий обработчик ошибок, чтобы сервер не падал
app.use((err, req, res, next) => {
  console.error('Необработанная ошибка:', err.message);
  if (res.headersSent) return;
  res.status(500).type('html').send('<h1>500 — ошибка сервера</h1>');
});

process.on('unhandledRejection', (err) => {
  console.warn('⚠️  Unhandled rejection:', err && err.message ? err.message : err);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Порт ${PORT} уже занят. Освободите его или запустите с другим PORT, например: PORT=3001 npm start`);
    process.exit(1);
  }
  throw err;
});
