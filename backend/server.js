const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const nodemailer = require('nodemailer');
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

// ---------------------------------------------------------------------------
// Отправка заявок на почту через SMTP REG.RU (ящик noreply@pushistyzavod.ru).
// Настройки берутся из .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO.
// Если почта не настроена или отправка упала — заявка всё равно сохраняется,
// а клиент получает успешный ответ.
// ---------------------------------------------------------------------------
const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'sm42.hosting.reg.ru',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;',
  }[c]));
}

async function sendFormEmail(data) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP не настроен (нет SMTP_USER/SMTP_PASS), письмо не отправлено');
    return;
  }

  const to = process.env.MAIL_TO || 'info@pushistyzavod.ru';

  const fields = [
    ['Форма', data.formName],
    ['Страница', data.formPage],
    ['Имя', data.name],
    ['Телефон', data.phone],
    ['Email', data.email],
    ['Сообщение', data.message || data.comment],
  ];

  // Дополнительные нестандартные поля формы (product, city и т.п.)
  if (data.customFields && typeof data.customFields === 'object') {
    Object.entries(data.customFields).forEach(([k, v]) => {
      if (v && typeof v !== 'object') fields.push([k, v]);
    });
  }

  const rows = fields.filter(([, v]) => v !== undefined && v !== null && v !== '');
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  const html = `<h2>Новая заявка с сайта pushistyzavod.ru</h2>
<table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;border-color:#ddd">
${rows.map(([k, v]) => `<tr><td><b>${escapeHtml(k)}</b></td><td>${escapeHtml(v)}</td></tr>`).join('\n')}
</table>`;

  await mailTransporter.sendMail({
    from: `"Сайт Пушистый Завод" <${process.env.SMTP_USER}>`,
    to,
    subject: `Заявка с сайта: ${data.formName || 'форма'}${data.name ? ' — ' + data.name : ''}`,
    text,
    html,
  });
  console.log('📧 Заявка отправлена на', to);
}

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
    } else {
      const submission = new FormSubmission(data);
      await submission.save();
      console.log('📝 Form submission saved:', submission._id);
    }

    // Отправляем уведомление на почту; ошибка почты не влияет на ответ клиенту
    try {
      await sendFormEmail(data);
    } catch (mailErr) {
      console.error('📧 Ошибка отправки письма:', mailErr.message);
    }

    res.json({ status: 'success', message: 'Спасибо! Ваша заявка принята.' });
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
    } else {
      const contact = new Contact(data);
      await contact.save();
      console.log('📞 Contact saved:', contact._id);
    }

    try {
      await sendFormEmail({ formName: 'Форма обратной связи', ...data });
    } catch (mailErr) {
      console.error('📧 Ошибка отправки письма:', mailErr.message);
    }

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

// ---------------------------------------------------------------------------
// Сжатие ответов (gzip/deflate) для HTML/CSS/JS — критично для PageSpeed.
// ---------------------------------------------------------------------------
try {
  const compression = require('compression');
  app.use(compression());
  console.log('🗜  Gzip-сжатие включено');
} catch (e) {
  console.warn('⚠️  Пакет compression не установлен — ответы без gzip. Выполните: npm install');
}

// ---------------------------------------------------------------------------
// SEO: приоритетные маршруты ДО раздачи статики.
// В public/ (старый экспорт Тильды) лежат устаревшие robots.txt, sitemap.xml,
// 404.html и page*.html. Если express.static отработает раньше, поисковики
// получат старую карту сайта, старый robots и дубли страниц — поэтому все
// такие URL обрабатываем явно и до статики.
// ---------------------------------------------------------------------------

// Актуальные robots.txt и sitemap.xml — только из prototype/ (их генерирует генератор)
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').sendFile(path.join(prototypeDir, 'robots.txt'));
});
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').sendFile(path.join(prototypeDir, 'sitemap.xml'));
});
// Старый фид Тильды (фигурировал в старом robots.txt) — сводим на актуальную карту
app.get('/sitemap-feeds.xml', (req, res) => res.redirect(301, '/sitemap.xml'));

// /404.html — всегда новая брендированная страница и всегда со статусом 404
app.get('/404.html', (req, res) => {
  res.status(404).sendFile(path.join(prototypeDir, '404.html'));
});

// Дубли служебных URL прототипа → 301 на канонические адреса
app.get('/index.html', (req, res) => res.redirect(301, '/'));
app.get(/^\/prototype\/(.+\.html)$/, (req, res) => {
  let clean = '/' + req.params[0];
  if (clean.endsWith('/index.html')) clean = clean.slice(0, -'index.html'.length);
  if (clean === '/index.html') clean = '/';
  if (clean === '/404.html') {
    return res.status(404).sendFile(path.join(prototypeDir, '404.html'));
  }
  res.redirect(301, clean);
});

// Старые page*.html из экспорта Тильды → 301 на соответствующие новые страницы.
// Эти URL уже известны поисковикам (были в старом sitemap.xml) — переносим вес.
const legacyFileRedirects = {
  '/page40738358.html': '/',                          // старая главная
  '/page40861203.html': '/privacy.html',              // политика конфиденциальности
  '/page41124919.html': '/novogodnie-podarki/',       // happynewyear
  '/page68079733.html': '/news.html',                 // блог
  '/page69512967.html': '/igrushki-s-logotipom/',     // корпоративные мягкие игрушки с логотипом
  '/page69877857.html': '/novogodnie-podarki/',       // подарки на Новый год
  '/page69880855.html': '/podarki-na-8-marta/',       // подарки на 8 марта
  '/page69883579.html': '/podarki-na-23-fevralya/',   // подарки на 23 февраля
  '/page69886785.html': '/podarki-detyam-sotrudnikov/', // новогодние подарки детям
  '/page70261533.html': '/den-rozhdeniya-kompanii/',  // подарки на день рождения компании
  '/page70664017.html': '/plastic-igrushki/',         // производство пластиковых игрушек
  '/page68731663.html': '/works.html',                // slider (наши работы)
  '/page69516079.html': '/',                          // служебный header Тильды
  '/page69516455.html': '/',                          // служебный footer Тильды
  '/page71447431.html': '/',                          // служебная страница Тильды
};
Object.entries(legacyFileRedirects).forEach(([from, to]) => {
  app.get(from, (req, res) => res.redirect(301, to));
});

// ---------------------------------------------------------------------------
// SEO: 301-редиректы со старых «красивых» URL Тильды на новые посадочные.
// Убирает дубли контента и переносит ссылочный вес на актуальные URL.
// ---------------------------------------------------------------------------
const legacyRedirects = {
  '/korporativnye-myagkie-igrushki-s-logotipom': '/igrushki-s-logotipom/',
  '/korporativnye-podarki-detyam': '/podarki-detyam-sotrudnikov/',
  '/proizvodstvo-plastikovyh-figurok': '/plastic-figurki/',
  '/korporativnye-podarki-na-novyj-god': '/novogodnie-podarki/',

  '/korporativnye-podarki-na-8-marta': '/podarki-na-8-marta/',
  '/korporativnye-podarki-na-23-fevralya': '/podarki-na-23-fevralya/',
  '/korporativnye-novogodnie-podarki-detyam': '/podarki-detyam-sotrudnikov/',
  '/podarki-sotrudnikam-na-den-rozhdeniya-kompanii': '/den-rozhdeniya-kompanii/',
  '/proizvodstvo-plastikovyh-igrushek-na-zakaz': '/plastic-igrushki/',
  '/happynewyear': '/novogodnie-podarki/',
  '/blog': '/news.html',
  '/slider': '/works.html',
  '/main': '/',
  '/old': '/',
  '/legacy': '/',
  '/header': '/',
  '/footer': '/',
};
Object.entries(legacyRedirects).forEach(([from, to]) => {
  app.get(from, (req, res) => res.redirect(301, to));
  // вариант со слешем на конце — туда же, без двойных редиректов
  app.get(from + '/', (req, res) => res.redirect(301, to));
});

// ---------------------------------------------------------------------------
// Основные страницы сайта. Канонический URL — с .html.
// Варианты без .html и со слешем → 301 на канонический (никаких дублей).
// Маршруты объявлены ДО статики: иначе express.static перехватывает /news
// (существует директория prototype/news/) и уводит в цепочку 301→404.
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
  if (route === '/') {
    app.get('/', (req, res, next) => sendPage(res, prototypeDir, file, next));
    return;
  }
  app.get(route, (req, res, next) => sendPage(res, prototypeDir, file, next));
  const bare = route.replace(/\.html$/, '');
  app.get(bare, (req, res) => res.redirect(301, route));
  app.get(bare + '/', (req, res) => res.redirect(301, route));
});

const staticOptions = {
  index: false, // главная "/" обслуживается маршрутом выше
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
    if (filePath.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
    // Кэширование: статические ассеты — 30 дней, HTML — ревалидация по ETag
    if (/\.(?:png|jpe?g|webp|gif|svg|ico|css|js|woff2?|ttf|mp4|webm|pdf)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    } else if (/\.html?$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
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
// SEO-посадочные страницы (генерируются generator/generate.js):

// /mascots, /mascots/ → prototype/mascots/index.html (чистые URL без .html)
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const clean = decodeURIComponent(req.path).replace(/\/+$/, '');
  if (!clean || clean.includes('..') || path.extname(clean)) return next();
  const file = path.join(prototypeDir, clean, 'index.html');
  if (fs.existsSync(file)) return res.sendFile(file);
  next();
});

// 404 handler
app.use((req, res) => {
  const notFoundProto = path.join(prototypeDir, '404.html');
  if (fs.existsSync(notFoundProto)) return res.status(404).sendFile(notFoundProto);
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
