// Публикация новости на сайте точечно, без полной перегенерации:
// страница новости, фото, карточка в ленте news.html, запись в sitemap.xml.
// Данные новости хранятся в generator/data/news-posts.json, поэтому и полный
// запуск генератора (generate.js) их не потеряет.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROTO = path.join(ROOT, 'prototype');
const POSTS_FILE = path.join(ROOT, 'generator', 'data', 'news-posts.json');
const NEWS_HTML = path.join(PROTO, 'news.html');
const SITEMAP = path.join(PROTO, 'sitemap.xml');
const SITE = 'https://pushistyzavod.ru';

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const ALLOWED_TAGS = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'li', 'strong', 'em', 'blockquote', 'a']);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Заголовки, описания и FAQ от модели — в простой текст: шаблон генератора
// вставляет их в HTML и в атрибуты как есть, поэтому убираем < > и прямые кавычки
const plain = (s) => String(s).replace(/[<>]/g, '').replace(/"([^"]*)"/g, '«$1»').replace(/"/g, '').replace(/\s+/g, ' ').trim();
const readPosts = () => JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
const writePosts = (posts) => fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2) + '\n');

// Сегодняшняя дата по Москве
function today() {
  const [y, m, d] = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' }).split('-');
  return { iso: `${y}-${m}-${d}`, human: `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}` };
}

// Страницы сайта, на которые можно ссылаться из новости: адрес + <title>
function sitePages() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'generator', 'pages-manifest.json'), 'utf8'));
  return (manifest.landings || []).map((url) => {
    const file = path.join(PROTO, url, 'index.html');
    if (!fs.existsSync(file)) return null;
    const title = (fs.readFileSync(file, 'utf8').match(/<title>([^<]*)<\/title>/) || [])[1];
    return title ? { url, title: title.trim() } : null;
  }).filter(Boolean);
}

// Оставляем в тексте модели только безопасную разметку и ссылки на свои страницы
function sanitizeBody(html, allowedUrls) {
  let out = String(html)
    .replace(/<(script|style|iframe|object)[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  out = out.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, (whole, text) => {
    const href = (whole.match(/href\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
    const clean = href.replace(SITE, '').split(/[?#]/)[0];
    return allowedUrls.has(clean) ? `<a href="${clean}">${text}</a>` : text;
  });

  return out.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (whole, slash, tag, attrs) => {
    tag = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (tag === 'a' && !slash) return whole;
    return `<${slash}${tag}>`;
  }).trim();
}

function uniqueSlug(raw, posts) {
  const base = String(raw).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '') || 'novost';
  const taken = (s) => posts.some((p) => p.slug === s) || fs.existsSync(path.join(PROTO, 'news', s));
  let slug = base;
  for (let i = 2; taken(slug); i++) slug = `${base}-${i}`;
  return slug;
}

// Версии css/js (?v=...) берём с уже опубликованной страницы, а не из шаблона:
// на проде они новее, чем в generator/template.js
function syncAssetVersions(html) {
  const sample = fs.readdirSync(path.join(PROTO, 'news'))
    .map((d) => path.join(PROTO, 'news', d, 'index.html'))
    .filter((f) => fs.existsSync(f))
    .map((f) => fs.readFileSync(f, 'utf8'))
    .find((h) => /\?v=\d+/.test(h));
  if (!sample) return html;
  const live = {};
  for (const m of sample.matchAll(/(\/prototype\/(?:css|js)\/[\w.-]+)\?v=(\d+)/g)) live[m[1]] = m[2];
  return html.replace(/(\/prototype\/(?:css|js)\/[\w.-]+)\?v=(\d+)/g, (whole, asset) => (live[asset] ? `${asset}?v=${live[asset]}` : whole));
}

function card(post) {
  return `      <!-- bot:${post.slug} -->
      <a class="post" href="/news/${post.slug}/">
        <div class="ph" style="background-image:url('${post.photo.src}')" role="img" aria-label="${esc(post.photo.alt)}"></div>
        <div class="body">
          <div class="tagline"><span class="cat">${esc(post.category)}</span><span>${post.dateHuman}</span></div>
          <h3>${esc(post.h1plain)}</h3>
          <p>${esc(post.desc)}</p>
          <span class="more">Читать →</span>
        </div>
      </a>
      <!-- /bot:${post.slug} -->
`;
}

function renderPage(slug) {
  // articles.js читает news-posts.json при загрузке, поэтому сбрасываем кэш модулей генератора
  Object.keys(require.cache).filter((k) => k.includes(`${path.sep}generator${path.sep}`)).forEach((k) => delete require.cache[k]);
  const T = require('../generator/template');
  const articles = require('../generator/data/articles');
  const bySlug = {};
  articles.forEach((a) => { bySlug[`news-${a.slug}`] = a; });
  const article = articles.find((a) => a.slug === slug);
  return syncAssetVersions(T.renderArticle(article, { bySlug }));
}

function publish({ article, photo, photoSize, updateId }) {
  const posts = readPosts();
  const slug = uniqueSlug(article.slug, posts);
  const date = today();
  const allowedUrls = new Set(sitePages().map((p) => p.url));

  const photoSrc = `/prototype/images/news/${slug}.jpg`;
  const alt = plain(article.imageAlt).slice(0, 160);
  const body = sanitizeBody(article.bodyHtml, allowedUrls);
  // Горизонтальное фото — на всю ширину текста; вертикальное и квадратное — уже и по центру,
  // иначе оно занимает весь экран и текст уезжает вниз
  const photoStyle = photoSize.width > photoSize.height * 1.15
    ? 'width:100%;height:auto;border-radius:20px'
    : 'display:block;width:100%;max-width:460px;height:auto;margin:0 auto;border-radius:20px';
  const words = body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

  const post = {
    slug,
    updateId,
    title: plain(article.title),
    desc: plain(article.description),
    h1: plain(article.h1),
    h1plain: plain(article.shortTitle),
    eyebrow: 'Новости',
    category: 'Новости',
    date: date.iso,
    dateHuman: date.human,
    readTime: `${Math.max(1, Math.round(words / 180))} мин чтения`,
    image: photoSrc,
    photo: { src: photoSrc, alt, width: photoSize.width, height: photoSize.height },
    body: `<p><img src="${photoSrc}" alt="${esc(alt)}" width="${photoSize.width}" height="${photoSize.height}" style="${photoStyle}" fetchpriority="high" decoding="async"></p>\n${body}`,
    faq: (article.faq || []).slice(0, 5).map((f) => ({ q: plain(f.q), a: plain(f.a) })),
    // «Читайте также»: три последние новости и статьи
    related: [...posts.slice(0, 3).map((p) => `news-${p.slug}`), 'news-kak-zakazat-igrushki-s-logotipom', 'news-maskot-dlya-brenda', 'news-tirazh-igrushek-kakoy-vygoden'].slice(0, 3),
  };

  writePosts([post, ...posts]);

  fs.mkdirSync(path.join(PROTO, 'images', 'news'), { recursive: true });
  fs.writeFileSync(path.join(PROTO, 'images', 'news', `${slug}.jpg`), photo);

  fs.mkdirSync(path.join(PROTO, 'news', slug), { recursive: true });
  fs.writeFileSync(path.join(PROTO, 'news', slug, 'index.html'), renderPage(slug));

  // Карточка — первой в ленте
  const news = fs.readFileSync(NEWS_HTML, 'utf8');
  const feedOpen = /<div class="grid" id="feed">\n/;
  if (!feedOpen.test(news)) throw new Error('в news.html не найдена лента (id="feed")');
  fs.writeFileSync(NEWS_HTML, news.replace(feedOpen, (m) => m + card(post)));

  const sitemap = fs.readFileSync(SITEMAP, 'utf8');
  const entry = `  <url>\n    <loc>${SITE}/news/${slug}/</loc>\n    <lastmod>${date.iso}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
  fs.writeFileSync(SITEMAP, sitemap.replace('</urlset>', entry + '</urlset>'));

  return { slug, url: `${SITE}/news/${slug}/`, title: post.title };
}

// Удалить новость, опубликованную ботом
function unpublish(slug) {
  const posts = readPosts();
  if (!posts.some((p) => p.slug === slug)) return false;
  writePosts(posts.filter((p) => p.slug !== slug));

  fs.rmSync(path.join(PROTO, 'news', slug), { recursive: true, force: true });
  fs.rmSync(path.join(PROTO, 'images', 'news', `${slug}.jpg`), { force: true });

  const news = fs.readFileSync(NEWS_HTML, 'utf8');
  fs.writeFileSync(NEWS_HTML, news.replace(new RegExp(`      <!-- bot:${slug} -->[\\s\\S]*?<!-- /bot:${slug} -->\\n`), ''));

  const sitemap = fs.readFileSync(SITEMAP, 'utf8');
  fs.writeFileSync(SITEMAP, sitemap.replace(new RegExp(`  <url>\\n    <loc>${SITE}/news/${slug}/</loc>[\\s\\S]*?</url>\\n`), ''));
  return true;
}

module.exports = { publish, unpublish, readPosts, sitePages, SITE };
