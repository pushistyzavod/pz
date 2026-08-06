#!/usr/bin/env node
/**
 * Обновление основных страниц прототипа:
 *  - уникальные title/description (по SEO-STRUCTURE.md)
 *  - canonical, Open Graph, Twitter Cards
 *  - JSON-LD: Organization, LocalBusiness, BreadcrumbList
 *  - блоки внутренней перелинковки на новые посадочные страницы
 *  - news.html: статическая лента из 11 статей блога
 * Запуск: node generator/update-core.js
 */
const fs = require('fs');
const path = require('path');
const C = require('./data/config');
const T = require('./template');

const PROTO = path.join(__dirname, '..', 'prototype');

const catalog = require('./data/catalog');
const gifts = require('./data/gifts');
const holidays = require('./data/holidays');
const industries = require('./data/industries');
const industries2 = require('./data/industries2');
const services = require('./data/services');
const plastic = require('./data/plastic');
const cities = require('./data/cities');
const articles = require('./data/articles');
const all = [...catalog, ...gifts, ...holidays, ...industries, ...industries2, ...services, ...plastic, ...cities];
const bySlug = {};
all.forEach((p) => { bySlug[p.slug] = p; });

/* ---------- мета-данные основных страниц ---------- */
const PAGES = {
  'index.html': {
    url: '/',
    title: 'Производство мягких игрушек и сувениров на заказ оптом — фабрика «Пушистый Завод»',
    desc: 'Фабрика полного цикла: мягкие игрушки, рюкзаки, тапочки, ПВХ-фигурки, мягкие и пластиковые брелоки с вашим логотипом. Опт от 100 штук, работа с юрлицами, договор, отсрочка.',
    crumbs: [{ label: 'Главная' }],
    linksTitle: 'Направления производства',
    linksGroups: [
      { title: 'Корпоративные подарки', slugs: ['korporativnye-podarki', 'novogodnie-podarki', 'igrushki-s-logotipom', 'podarochnye-nabory', 'podarki-klientam', 'podarki-sotrudnikam'] },
      { title: 'Каталог продукции', slugs: ['mascots', 'symbol-goda', 'plyushevye-igrushki', 'pvc-brelki', 'plastic-figurki', 'plyushevye-brelki'] },
      { title: 'По отраслям', slugs: ['dlya-biznesa', 'dlya-bankov', 'dlya-zastroyshchikov', 'dlya-it-kompaniy', 'dlya-shkol', 'dlya-gostinits'] },
      { title: 'Города', slugs: ['igrushki-moskva', 'igrushki-spb', 'igrushki-novosibirsk', 'igrushki-ekb', 'igrushki-kazan', 'igrushki-ulan-ude'] },
    ],
  },
  'soft-toys.html': {
    url: '/soft-toys.html',
    title: 'Мягкие игрушки на заказ с логотипом оптом от 100 шт — «Пушистый Завод»',
    desc: 'Производство мягких игрушек на заказ для бизнеса: маскоты, символ года, брелоки, персонажи. Бесплатный макет, образец ~10 дней, тираж от 100 штук.',
    crumbs: [{ url: '/', label: 'Главная' }, { label: 'Мягкие игрушки' }],
    linksTitle: 'Каталог мягких игрушек',
    linksGroups: [
      { title: 'По типу', slugs: ['mascots', 'rostovye-maskoty', 'symbol-goda', 'plyushevye-igrushki', 'plyushevye-brelki', 'bolshie-igrushki', 'malenkiye-igrushki', 'konfetnitsy'] },
      { title: 'По исходникам', slugs: ['igrushki-po-personazhu', 'igrushki-po-foto', 'igrushki-po-eszkizu', 'plyushevyj-medved', 'igrushka-kapibara', 'igrushki-koty'] },
      { title: 'По задаче', slugs: ['igrushki-s-logotipom', 'igrushki-optom', 'igrushki-na-zakaz', 'promo-igrushki', 'reklamnye-igrushki', 'brendirovannye-igrushki'] },
    ],
  },
  'pvc-figures.html': {
    url: '/pvc-figures.html',
    title: 'Пластиковые фигурки из ПВХ на заказ — производство «Пушистый Завод»',
    desc: 'Пластиковые фигурки из ПВХ на заказ: брелоки, флешки, джибитсы, магниты с логотипом. 3D-модель, пресс-форма, тираж от 100 штук.',
    crumbs: [{ url: '/', label: 'Главная' }, { label: 'ПВХ-фигурки' }],
    linksTitle: 'Изделия из ПВХ',
    linksGroups: [
      { title: 'Фигурки', slugs: ['plastic-figurki', 'figurki-s-logotipom', 'figurki-po-personazhu', 'plastic-igrushki'] },
      { title: 'Мелочёвка', slugs: ['pvc-brelki', 'pvc-fleshki', 'dzhibitsy', 'magnity-pvc', 'pvc-znachki', 'plastic-suveniry'] },
      { title: 'Мягкая альтернатива', slugs: ['plyushevye-brelki', 'malenkiye-igrushki', 'plyushevye-igrushki'] },
    ],
  },
  'soft-goods.html': {
    url: '/soft-goods.html',
    title: 'Мягкая продукция на заказ: рюкзаки, тапочки, подушки оптом — «Пушистый Завод»',
    desc: 'Мягкая продукция на заказ для бизнеса: рюкзаки, тапочки, подушки, сумки и аксессуары с логотипом. Опт от 100 штук, производство в России.',
    crumbs: [{ url: '/', label: 'Главная' }, { label: 'Мягкая продукция' }],
    linksTitle: 'Мягкая продукция — категории',
    linksGroups: [
      { title: 'Продукция', slugs: ['podushki-s-logotipom', 'plyushevye-tapochki', 'poshiv-na-zakaz', 'konfetnitsy', 'podarochnye-nabory'] },
      { title: 'Для мерча', slugs: ['merch-na-zakaz', 'podarki-sotrudnikam', 'suvenirnaya-produkciya', 'suveniry-optom'] },
    ],
  },
  'works.html': {
    url: '/works.html',
    title: 'Наши работы — примеры произведённых игрушек и сувениров с тиражами',
    desc: 'Примеры работ фабрики «Пушистый Завод»: маскоты, талисманы, ПВХ-фигурки и игрушки с тиражами и сроками — от 100 до 300 000 штук.',
    crumbs: [{ url: '/', label: 'Главная' }, { label: 'Наши работы' }],
    linksTitle: 'Похожие решения',
    linksGroups: [
      { title: 'Популярные услуги', slugs: ['mascots', 'plastic-figurki', 'korporativnye-podarki', 'symbol-goda', 'pvc-brelki', 'podarochnye-nabory'] },
      { title: 'По отраслям', slugs: ['dlya-biznesa', 'dlya-bankov', 'dlya-sportivnyh-komand', 'dlya-it-kompaniy', 'dlya-ritela'] },
    ],
    ctaForm: { formName: 'Заявка: страница «Наши работы»', formHint: 'хотим игрушку как в кейсе про …, тираж 1000 шт' },
  },

  'production.html': {
    url: '/production.html',
    title: 'Производство «Пушистый Завод» — полный цикл: раскрой, пошив, брендирование',
    desc: 'Наше производство в Улан-Удэ: конструкторское бюро, раскрой, вышивка, пошив, ОТК. Полный цикл изготовления игрушек и сувениров на заказ.',
    crumbs: [{ url: '/', label: 'Главная' }, { label: 'Производство' }],
    linksTitle: 'Производство и услуги',
    linksGroups: [
      { title: 'Производство', slugs: ['proizvodstvo-igrushek', 'fabrika-igrushek', 'poshiv-igrushek', 'kontraktnoe-proizvodstvo', 'razrabotka-lekal', 'kontrol-kachestva'] },
      { title: 'Услуги', slugs: ['besplatny-maket', 'sig-obrazec', 'vyshivka-na-igrushkah', 'pechat-na-igrushkah', 'individualnaya-upakovka', 'dostavka-po-rf'] },
      { title: 'Документы', slugs: ['sertifikaciya-igrushek', 'markirovka-chestny-znak', 'nashivki-birki'] },
    ],
    ctaForm: { formName: 'Заявка: страница «Производство»', formHint: 'пошив игрушек на вашем производстве, 2000 шт' },
  },

  'news.html': {
    url: '/news.html',
    title: 'Новости и статьи о производстве сувениров на заказ — блог «Пушистый Завод»',
    desc: 'Экспертные статьи о производстве мягких игрушек, ПВХ-изделий и корпоративных подарков: сроки, цены, тиражи, маркировка, тренды мерча.',
    crumbs: [{ url: '/', label: 'Главная' }, { label: 'Новости и статьи' }],
  },
  'privacy.html': {
    url: '/privacy.html',
    title: 'Политика конфиденциальности — «Пушистый Завод»',
    desc: 'Политика конфиденциальности сайта pushistyzavod.ru: как мы собираем, используем и защищаем персональные данные.',
    crumbs: [{ url: '/', label: 'Главная' }, { label: 'Политика конфиденциальности' }],
  },
};

/* ---------- хелперы ---------- */
function metaBlock(p) {
  const schemas = [
    T.jsonldOrganization(),
    T.jsonldLocalBusiness(),
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: p.crumbs.map((it, i) => ({
        '@type': 'ListItem', position: i + 1, name: it.label,
        ...(it.url ? { item: C.SITE + it.url } : {}),
      })),
    },
  ];
  if (p.url === '/') {
    schemas.push({
      '@context': 'https://schema.org', '@type': 'WebSite',
      url: C.SITE + '/', name: 'Пушистый Завод',
      publisher: { '@id': C.SITE + '/#org' },
    });
  }
  return `<link rel="canonical" href="${C.SITE}${p.url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Пушистый Завод">
<meta property="og:locale" content="ru_RU">
<meta property="og:title" content="${T.esc(p.title)}">
<meta property="og:description" content="${T.esc(p.desc)}">
<meta property="og:url" content="${C.SITE}${p.url}">
<meta property="og:image" content="${C.SITE}/prototype/images/hero-main.webp">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${T.esc(p.title)}">
<meta name="twitter:description" content="${T.esc(p.desc)}">
<meta name="twitter:image" content="${C.SITE}/prototype/images/hero-main.webp">
${schemas.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
`;
}

function linksBlock(p) {
  if (!p.linksGroups) return '';
  const groups = p.linksGroups.map((g) => {
    const links = g.slugs.map((slug) => {
      const t = bySlug[slug] || (slug === 'dlya-biznesa' ? { url: '/dlya-biznesa/', h1plain: 'Все отрасли', desc: 'Подарки и игрушки для 38 отраслей бизнеса.' } : null);
      if (!t) return '';
      const label = t.linkLabel || t.h1plain;
      return `<a href="${t.url}" style="display:block;background:#fff;border:1px solid #eceef3;border-radius:14px;padding:14px 18px;font-size:14px;font-weight:600;color:#22242b;transition:.15s" onmouseover="this.style.borderColor='#639aee'" onmouseout="this.style.borderColor='#eceef3'">${T.esc(label)} →</a>`;
    }).join('');
    return `<div><h3 style="font-size:16px;margin:0 0 12px;color:#6b6b76">${T.esc(g.title)}</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">${links}</div></div>`;
  }).join('');
  return `

<!-- SEO: внутренняя перелинковка (генерируется generator/update-core.js) -->
<section style="padding:0 0 60px">
  <div class="container" style="display:flex;flex-direction:column;gap:26px">
    <h2 style="margin:0">${T.esc(p.linksTitle)}</h2>
    ${groups}
  </div>
</section>`;
}

/* ---------- CTA + форма для страниц без формы (works, production) ---------- */
function formBlock(p) {
  const f = p.ctaForm;
  const inp = 'width:100%;padding:14px 18px;border:1px solid #dfe3ec;border-radius:12px;font-size:15px;font-family:inherit;box-sizing:border-box';
  return `

<!-- SEO: CTA + форма заявки (генерируется generator/update-core.js) -->
<section id="cta" style="padding:0 0 70px">
  <div class="container">
    <div style="display:grid;grid-template-columns:1.1fr 1fr;gap:44px;align-items:center;background:linear-gradient(120deg,#eef4ff,#f7f0ff);border-radius:28px;padding:44px" class="cta-grid">
      <div>
        <h2 style="margin:0 0 14px">Получите расчёт <span style="color:#639aee">за 1 рабочий день</span></h2>
        <p style="color:#6b6b76;line-height:1.6;margin:0 0 18px">Оставьте заявку — обсудим задачу, предложим варианты под бюджет и пришлём смету со сроками. Бесплатно нарисуем макет будущего изделия.</p>
        <div style="display:flex;flex-wrap:wrap;gap:14px;font-size:15px;font-weight:600">
          <a href="tel:${C.COMPANY.phoneTel}" style="color:#22242b;text-decoration:none">📞 ${C.COMPANY.phone}</a>
          <a href="${C.COMPANY.tg}" target="_blank" rel="noopener" style="color:#639aee;text-decoration:none">Telegram</a>
          <a href="${C.COMPANY.wa}" target="_blank" rel="noopener" style="color:#639aee;text-decoration:none">WhatsApp</a>
          <a href="mailto:${C.COMPANY.email}" style="color:#22242b;text-decoration:none">✉️ ${C.COMPANY.email}</a>
        </div>
      </div>
      <form data-api-form data-form-name="${T.esc(f.formName)}" style="display:flex;flex-direction:column;gap:12px;background:#fff;border-radius:20px;padding:26px;box-shadow:0 18px 44px -20px rgba(20,30,80,.25)">
        <input type="text" name="name" placeholder="Ваше имя" required style="${inp}">
        <input type="tel" name="phone" placeholder="Телефон" required style="${inp}">
        <input type="email" name="email" placeholder="E-mail" style="${inp}">
        <textarea name="product" rows="3" placeholder="Что изготовить? Например: ${T.esc(f.formHint)}" style="${inp};resize:vertical"></textarea>
        <button type="submit" style="display:inline-flex;align-items:center;justify-content:center;padding:15px 30px;border-radius:32px;font-weight:600;font-size:15px;background:#ff6099;color:#fff;border:none;cursor:pointer;font-family:inherit">Получить расчёт</button>
        <small style="color:#6b6b76;font-size:12.5px;line-height:1.5">Нажимая кнопку, вы соглашаетесь с <a href="/privacy.html">политикой конфиденциальности</a>. Ответим в течение рабочего дня.</small>
      </form>
    </div>
  </div>
  <style>@media(max-width:900px){.cta-grid{grid-template-columns:1fr!important;padding:26px!important}}</style>
</section>`;
}

function patchHead(html, p) {

  let out = html;
  // title
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${T.esc(p.title)}</title>`);
  // description
  out = out.replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${T.esc(p.desc)}">`);
  // удаляем старые canonical/og, если были
  out = out.replace(/\s*<link rel="canonical"[^>]*>/g, '');
  out = out.replace(/\s*<meta property="og:[^"]*"[^>]*>/g, '');
  out = out.replace(/\s*<meta name="twitter:[^"]*"[^>]*>/g, '');
  // вставляем блок перед </head>
  out = out.replace('</head>', metaBlock(p) + '</head>');
  return out;
}

/* ---------- news.html: статическая лента ---------- */
function buildNewsCards() {
  const emoji = ['📋', '💰', '⏱', '🧩', '🧵', '🛒', '📈', '🎭', '🔥', '🏷', '🧸'];
  return articles.map((a, i) => `      <a class="post" href="${a.url}">
        <div class="ph">${emoji[i % emoji.length]}</div>
        <div class="body">
          <div class="tagline"><span class="cat">${T.esc(a.category)}</span><span>${a.dateHuman}</span></div>
          <h3>${T.esc(a.h1plain)}</h3>
          <p>${T.esc(a.desc)}</p>
          <span class="more">Читать →</span>
        </div>
      </a>`).join('\n');
}

function patchNews(html) {
  // статическая лента вместо JS-загрузки из Mongo
  html = html.replace(
    /<div class="grid" id="feed">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/,
    `<div class="grid" id="feed">\n${buildNewsCards()}\n    </div>\n  </div>\n</section>`
  );
  // удаляем JS-загрузчик ленты (больше не нужен)
  html = html.replace(/<script>\s*\(function\(\)\{\s*var feed=document\.getElementById\('feed'\);[\s\S]*?\}\)\(\);\s*<\/script>/, '');
  return html;
}

/* ---------- прогон ---------- */
let patched = 0;
Object.entries(PAGES).forEach(([file, p]) => {
  const full = path.join(PROTO, file);
  if (!fs.existsSync(full)) { console.warn('⚠️  Нет файла:', file); return; }
  let html = fs.readFileSync(full, 'utf8');

  // устаревшие ссылки на старый блог Тильды → актуальный раздел новостей
  html = html.replace(/href="\/blog"/g, 'href="/news.html"');

  // идемпотентность: если canonical уже есть — пропускаем мета (кроме повторного прогона)
  html = patchHead(html, p);

  // блок перелинковки: удаляем старый (если был) и вставляем новый перед site.js
  html = html.replace(/\n*<!-- SEO: внутренняя перелинковка \(генерируется generator\/update-core\.js\) -->[\s\S]*?<\/section>\s*(?=<script src="\/prototype\/js\/site\.js")/, '\n');
  if (p.linksGroups) {
    const block = linksBlock(p);
    const scriptRe = /<script src="\/prototype\/js\/site\.js[^"]*"><\/script>/;
    if (scriptRe.test(html)) {
      html = html.replace(scriptRe, (m) => block + '\n' + m);
    } else {
      html = html.replace('</body>', block + '\n</body>');
    }
  }

  // CTA + форма (если странице нужна): удаляем старый блок и вставляем новый
  html = html.replace(/\n*<!-- SEO: CTA \+ форма заявки \(генерируется generator\/update-core\.js\) -->[\s\S]*?<\/section>\s*(?=<script src="\/prototype\/js\/site\.js")/, '\n');
  if (p.ctaForm) {
    const block = formBlock(p);
    const scriptRe2 = /<script src="\/prototype\/js\/site\.js[^"]*"><\/script>/;
    if (scriptRe2.test(html)) {
      html = html.replace(scriptRe2, (m) => block + '\n' + m);
    } else {
      html = html.replace('</body>', block + '\n</body>');
    }
  }


  // works.html: пустой src у превью лайтбокса — лишний запрос и пустой alt
  if (file === 'works.html') {
    html = html.replace(
      '<img id="lbImg" src="" alt="">',
      '<img id="lbImg" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Увеличенное фото примера работы — Пушистый Завод">'
    );
  }

  if (file === 'news.html') html = patchNews(html);


  fs.writeFileSync(full, html, 'utf8');
  patched++;
  console.log('✅', file);
});

console.log(`\nГотово: обновлено ${patched} основных страниц`);
