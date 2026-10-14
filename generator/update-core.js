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
    desc: 'Наши производства в Москве, Иваново и Улан-Удэ: конструкторское бюро, раскрой, вышивка, пошив, ОТК. Полный цикл изготовления игрушек и сувениров на заказ.',
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
  // удаляем старые canonical/og/twitter/robots, если были
  out = out.replace(/\s*<link rel="canonical"[^>]*>/g, '');
  out = out.replace(/\s*<meta property="og:[^"]*"[^>]*>/g, '');
  out = out.replace(/\s*<meta name="twitter:[^"]*"[^>]*>/g, '');
  out = out.replace(/\s*<meta name="robots"[^>]*>/g, '');
  // удаляем ранее вставленные наши JSON-LD (иначе при каждом прогоне они копятся дублями)
  out = out.replace(/\s*<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"(Organization|LocalBusiness|BreadcrumbList|WebSite)"[\s\S]*?<\/script>/g, '');
  // вставляем блок перед </head>
  out = out.replace('</head>', metaBlock(p) + '</head>');
  return out;
}

/* ---------- news.html: статическая лента ---------- */
function buildNewsCards() {
  const emoji = ['📋', '💰', '⏱', '🧩', '🧵', '🛒', '📈', '🎭', '🔥', '🏷', '🧸'];
  return articles.map((a, i) => `      <a class="post" href="${a.url}">
        ${a.photo
    ? `<div class="ph" style="background-image:url('${a.photo.src}')" role="img" aria-label="${T.esc(a.photo.alt)}"></div>`
    : `<div class="ph">${emoji[i % emoji.length]}</div>`}
        <div class="body">
          <div class="tagline"><span class="cat">${T.esc(a.category)}</span><span>${a.dateHuman}</span></div>
          <h3>${T.esc(a.h1plain)}</h3>
          <p>${T.esc(a.desc)}</p>
          <span class="more">Читать →</span>
        </div>
      </a>`).join('\n');
}

const NEWS_INTRO = `
<!-- SEO: вводный текст блога (генерируется generator/update-core.js) -->
<section style="padding:0 0 40px">
  <div class="container">
    <p style="max-width:860px;color:#4a4e58;line-height:1.7;font-size:16px">В блоге фабрики «Пушистый Завод» мы делимся практикой производства мягких игрушек, ПВХ-фигурок и корпоративных подарков: как выбрать тираж и способ брендирования, сколько реально занимает производство, как работает маркировка «Честный знак» и как посчитать отдачу от промо-раздач. Каждая статья — ответы на вопросы, которые мы слышим от клиентов каждую неделю.</p>
    <p style="max-width:860px;color:#4a4e58;line-height:1.7;font-size:16px">Материалы пишут производственники, а не копирайтеры: внутри — конкретные цифры, чек-листы и ошибки, которых легко избежать. Не нашли ответ на свой вопрос — позвоните, расскажем по телефону.</p>
  </div>
</section>`;

function patchNews(html) {
  // статическая лента вместо JS-загрузки из Mongo
  html = html.replace(
    /<div class="grid" id="feed">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/,
    `<div class="grid" id="feed">\n${buildNewsCards()}\n    </div>\n  </div>\n</section>`
  );
  // вводный текст перед лентой (идемпотентно)
  html = html.replace(/\n*<!-- SEO: вводный текст блога \(генерируется generator\/update-core\.js\) -->[\s\S]*?<\/section>/, '');
  html = html.replace(/(<div class="grid" id="feed">)/, NEWS_INTRO + '\n$1');

  // удаляем JS-загрузчик ленты (больше не нужен)
  html = html.replace(/<script>\s*\(function\(\)\{\s*var feed=document\.getElementById\('feed'\);[\s\S]*?\}\)\(\);\s*<\/script>/, '');
  return html;
}

/* ---------- FAQ для основных страниц (production, works) ---------- */
const CORE_FAQ = {
  'production.html': [
    { q: 'Где находится производство?', a: 'Производство — в Москве, Иваново и Улан-Удэ: конструкторское бюро, раскрой, пошив, вышивка, набивка, ОТК и склад. Офис продаж — в Москве. Приезжайте на экскурсию или покажем цеха по видеозвонку.' },
    { q: 'Какая максимальная мощность фабрики?', a: 'До 100 000 изделий в месяц без привлечения субподряда: собственные раскройные столы, швейные линии и вышивальные машины. Большие тиражи планируем слотами — бронируйте дату заранее.' },
    { q: 'Можно ли посмотреть производство до заказа?', a: 'Да: организуем видео-трансляцию с цехов или приезжайте на производство лично — в Москве, Иваново или Улан-Удэ. Также бесплатно делаем макет будущего изделия — вы видите результат до любых обязательств.' },
    { q: 'Работаете ли с чужими лекалами и техкартами?', a: 'Да, принимаем готовые лекала и техзадания — шьём по ним без изменений или адаптируем под наши материалы. Контрактное производство с NDA — стандартная практика.' },
    { q: 'Как контролируется качество партии?', a: 'Многоступенчатый ОТК: входной контроль ткани и фурнитуры, проверка швов и симметрии на участке, финальный осмотр каждого изделия перед упаковкой. К отгрузке прикладываем фотоотчёт.' },
  ],
  'works.html': [
    { q: 'Покажете похожий проект под нашу задачу?', a: 'Да: за 9 лет произведено сотни проектов — от маскотов банков до коллекционных ПВХ-серий. Напишите, какая у вас задача, и мы пришлём примеры из портфолио с тиражами и сроками.' },
    { q: 'Можно повторить игрушку из кейса с нашим логотипом?', a: 'Да, если это наш авторский образец: заменим цвета и брендирование. Чужие бренд-персонажи не копируем — но создадим похожего по духу героя специально для вас.' },
    { q: 'Какие тиражи на примерах работ?', a: 'От 100 штук (малые серии и welcome-паки) до 300 000 (федеральные FMCG-акции). На карточках кейсов указаны реальные тиражи и сроки производства.' },
    { q: 'Как попасть в раздел «Наши работы»?', a: 'Все интересные проекты публикуем с согласия клиента. Если хотите кейс с вашим брендом — скажите менеджеру: за публикацию даём бонус к следующему тиражу.' },
  ],
  'news.html': [
    { q: 'О чём статьи в блоге?', a: 'О производстве сувениров на заказ: как выбрать тираж и не переплатить, сколько реально занимает производство, как работает маркировка «Честный знак», как посчитать отдачу от промо-раздач и какой мерч сейчас в тренде.' },
    { q: 'Кто пишет статьи?', a: 'Материалы готовят производственники фабрики «Пушистый Завод», а не копирайтеры: внутри — реальные цифры из проектов, чек-листы и разборы ошибок, которых легко избежать.' },
    { q: 'Как заказать партию после статьи?', a: 'Оставьте заявку в форме на сайте или позвоните +7 (989) 605-10-10: менеджер уточнит задачу, бесплатно нарисует макет и пришлёт смету со сроками за 1 рабочий день.' },
    { q: 'Как часто выходят новые статьи?', a: 'Пополняем блог по мере накопления практики: раз в 2–3 недели выходят разборы, гиды и ответы на частые вопросы клиентов. Сезонные материалы (Новый год, 23 Февраля, 8 Марта) — заранее, чтобы вы успели к дате.' },
  ],
};

function faqCoreBlock(items) {
  const qa = items.map((f) => `<details style="background:#fff;border:1px solid #eceef3;border-radius:14px;padding:16px 20px"><summary style="font-weight:600;cursor:pointer;font-size:15.5px">${T.esc(f.q)}</summary><p style="margin:10px 0 0;color:#6b6b76;line-height:1.6;font-size:14.5px">${T.esc(f.a)}</p></details>`).join('\n      ');
  return `

<!-- SEO: FAQ (генерируется generator/update-core.js) -->
<section style="padding:0 0 60px">
  <div class="container">
    <h2 style="margin:0 0 22px">Частые вопросы</h2>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${qa}
    </div>
  </div>
</section>`;
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

  // блок перелинковки на основных страницах отключён (по решению заказчика):
  // SEO-рубрики не показываем на основных страницах, сами посадочные страницы работают.
  // Старый блок, если был вставлен ранее, — удаляем.
  html = html.replace(/\n*<!-- SEO: внутренняя перелинковка \(генерируется generator\/update-core\.js\) -->[\s\S]*?<\/section>/, '\n');

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

  // FAQ для production/works: удаляем старый, вставляем актуальный
  html = html.replace(/\n*<!-- SEO: FAQ \(генерируется generator\/update-core\.js\) -->[\s\S]*?<\/section>\s*(?=<script src="\/prototype\/js\/site\.js")/, '\n');
  if (CORE_FAQ[file]) {
    const block = faqCoreBlock(CORE_FAQ[file]);
    const scriptRe3 = /<script src="\/prototype\/js\/site\.js[^"]*"><\/script>/;
    if (scriptRe3.test(html)) html = html.replace(scriptRe3, (m) => block + '\n' + m);
    else html = html.replace('</body>', block + '\n</body>');
  }

  if (file === 'news.html') html = patchNews(html);



  fs.writeFileSync(full, html, 'utf8');
  patched++;
  console.log('✅', file);
});

console.log(`\nГотово: обновлено ${patched} основных страниц`);
