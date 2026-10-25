#!/usr/bin/env node
/**
 * Генератор SEO-посадочных страниц «Пушистый Завод».
 * Запуск: node generator/generate.js
 * Результат: prototype/<slug>/index.html для каждой страницы + sitemap.xml, robots.txt, 404.html, pages-manifest.json
 */
const fs = require('fs');
const path = require('path');
const C = require('./data/config');
const T = require('./template');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'prototype');

/* ---------- Сбор всех страниц ---------- */
const catalog = require('./data/catalog');
const gifts = require('./data/gifts');
const holidays = require('./data/holidays');
const industries = require('./data/industries');
const industries2 = require('./data/industries2');
const services = require('./data/services');
const plastic = require('./data/plastic');
const cities = require('./data/cities');
const articles = require('./data/articles');

// Основные (существующие) страницы сайта — для перелинковки и sitemap
const CORE = [
  { slug: 'home', url: '/', title: 'Главная', h1plain: 'Производство мягких игрушек и сувениров на заказ', linkLabel: 'Главная', linkDesc: 'Фабрика полного цикла: игрушки, маскоты, ПВХ-фигурки и мерч на заказ для бизнеса.', priority: '1.0' },
  { slug: 'soft-toys', url: '/soft-toys/', title: 'Мягкие игрушки на заказ', h1plain: 'Мягкие игрушки на заказ', linkLabel: 'Мягкие игрушки на заказ', linkDesc: 'Производство мягких игрушек с логотипом оптом от 100 штук — от макета до тиража.', priority: '0.9' },
  { slug: 'pvc-figures', url: '/pvc-figures/', title: 'Пластиковые фигурки из ПВХ', h1plain: 'Пластиковые фигурки из ПВХ на заказ', linkLabel: 'Пластиковые фигурки из ПВХ', linkDesc: 'Фигурки, брелоки, флешки и джибитсы из ПВХ по вашему дизайну — от 100 штук.', priority: '0.9' },
  { slug: 'soft-goods', url: '/soft-goods/', title: 'Мягкая продукция', h1plain: 'Мягкая продукция на заказ', linkLabel: 'Мягкая продукция', linkDesc: 'Рюкзаки, тапочки, подушки и аксессуары с вашим логотипом — производство оптом.', priority: '0.8' },
  { slug: 'works', url: '/works/', title: 'Наши работы', h1plain: 'Наши работы', linkLabel: 'Наши работы', linkDesc: 'Примеры произведённых игрушек и сувениров с тиражами и сроками.', priority: '0.8' },
  { slug: 'production', url: '/production/', title: 'Производство', h1plain: 'Наше производство', linkLabel: 'Наше производство', linkDesc: 'Производство в Москве, Иваново и Улан-Удэ: раскрой, пошив, вышивка, ОТК.', priority: '0.8' },
  { slug: 'news', url: '/news/', title: 'Новости и статьи', h1plain: 'Новости и статьи', linkLabel: 'Новости и статьи', linkDesc: 'Экспертные статьи о производстве игрушек и корпоративных сувениров.', priority: '0.6' },
  { slug: 'privacy', url: '/privacy/', title: 'Политика конфиденциальности', h1plain: 'Политика конфиденциальности', noindexSitemap: true, priority: '0.1' },
];

/* ---------- Хабы ---------- */
const industriesAll = [...industries, ...industries2];
const hubDlyaBiznesa = {
  slug: 'dlya-biznesa',
  cluster: 'industries',
  url: '/dlya-biznesa/',
  title: 'Игрушки и сувениры для бизнеса по отраслям — производство на заказ',
  desc: 'Отраслевые решения «Пушистого Завода»: подарки и игрушки для банков, застройщиков, школ, отелей, IT и ещё 30+ отраслей. Опт от 100 шт.',
  h1: 'Игрушки и сувениры <span>по отраслям</span>',
  h1plain: 'Игрушки и сувениры для бизнеса по отраслям',
  sub: 'Мы знаем специфику 38 отраслей: от банковских брендбуков до детской сертификации. Выберите свою сферу — покажем решения и кейсы.',
  eyebrow: 'Отраслевые решения',
  introH2: 'Подарки, заточенные под вашу отрасль',
  intro: [
    'У каждой отрасли — свой повод, своя аудитория и свои ограничения: банкам нужна строгость брендбука, детсадам — сертификация 0+, застройщикам — эмоция нового дома. Мы производим игрушки и сувениры с учётом этой специфики больше 9 лет и 500+ проектов.',
    'Выберите отрасль ниже: на каждой странице — рабочие форматы, примеры из нашего портфолио, цены и сроки. Нет вашей сферы? Позвоните — скорее всего, мы уже делали что-то похожее.',
  ],
  crumbs: [{ url: '/', label: 'Главная' }, { label: 'Отраслевые решения' }],
  image: '/prototype/images/soft-toys-cutout.webp',
  imgAlt: 'Игрушки и сувениры для бизнеса по отраслям — Пушистый Завод',
  hubGroups: [
    { title: 'Финансы и страхование', slugs: ['dlya-bankov', 'dlya-strahovyh', 'dlya-it-kompaniy', 'dlya-telkoma'] },
    { title: 'Недвижимость и строительство', slugs: ['dlya-zastroyshchikov', 'dlya-zhk', 'dlya-stroitelnyh-kompaniy'] },
    { title: 'Нефтегаз и промышленность', slugs: ['dlya-neftyanyh-kompaniy', 'dlya-azs', 'dlya-goskompaniy'] },
    { title: 'Ритейл и FMCG', slugs: ['dlya-ritela', 'dlya-fmcg', 'dlya-tc', 'dlya-marketpleysov'] },
    { title: 'HoReCa и туризм', slugs: ['dlya-restoranov', 'dlya-koffeen', 'dlya-gostinits', 'dlya-turbiznesa', 'dlya-aviakompaniy'] },
    { title: 'Образование и дети', slugs: ['dlya-shkol', 'dlya-detskih-sadov', 'dlya-universitetov', 'dlya-detskih-centrov'] },
    { title: 'Медицина', slugs: ['dlya-mediciny', 'dlya-klinik'] },
    { title: 'Спорт и развлечения', slugs: ['dlya-sportivnyh-komand', 'dlya-fitnes-klubov', 'dlya-akvaparkov', 'dlya-kinoteatrov', 'dlya-zooparkov', 'dlya-muzeev'] },
    { title: 'События и маркетинг', slugs: ['dlya-agentstv', 'dlya-meropriyatiy', 'dlya-festivaley', 'vystavki-meropriyatiya'] },
    { title: 'Транспорт и логистика', slugs: ['dlya-avtodilerov', 'dlya-logistiki', 'dlya-delivery'] },
    { title: 'Издательства', slugs: ['dlya-izdatelstv'] },
  ],
  faq: [
    { q: 'Нет нашей отрасли в списке — возьмётесь?', a: 'Да: за 9 лет мы делали проекты для сотен ниш. Позвоните или напишите — пришлём примеры из похожих сфер и предложим форматы под вашу аудиторию.' },
    ...C.FAQ_COMMON.slice(0, 3),
  ],
  formName: 'Заявка: отраслевые решения',
  formHint: 'игрушки для нашей отрасли (укажите сферу)',
  formHint2: '',
  h1short: 'Отрасли',
};

/* ---------- Индекс по slug ---------- */
const landings = [...catalog, ...gifts, ...holidays, ...industriesAll, ...services, ...plastic, ...cities];

// Страницы, закрытые от индексации (noindex, follow) и убранные из sitemap:
// города-шаблоны без переходов из поиска. Список — data/noindex.json.
const NOINDEX = new Set(require('./data/noindex.json'));
const { stripHtml } = require('./strip-prices');
const { apply: applyIndustryFacts } = require('./industry-facts');
landings.forEach((p) => { if (NOINDEX.has(p.url)) p.noindex = true; });
// Отраслевые страницы без прямых кейсов: уникальные тексты (data/industry-texts.js)
const INDUSTRY_TEXTS = require('./data/industry-texts');
landings.forEach((p) => {
  const t = INDUSTRY_TEXTS[p.slug];
  if (!t) return;
  p.intro = t.intro;
  p.extra = { h2: `Идеи для ${p.sphere}`, paras: ['С чего обычно начинают. Любую идею доработаем под ваш бренд на бесплатном макете.'], list: t.ideas };
  p.faq = [...t.faq, ...C.FAQ_COMMON.slice(0, 3)];
  p.lean = true;
});
landings.forEach((p) => { if (p.cluster === 'cities') p.lean = true; });
// Ротация отзывов и кейсов: разные страницы показывают разные подборки (анти-дубли контента)
landings.forEach((p, i) => {
  if (!p.reviewOffset) p.reviewOffset = i % 5;
  if (p.caseOffset == null) p.caseOffset = i;
});

/* ---------- Уникальные блоки для праздничных страниц (идеи + дедлайны) ---------- */
const HOLIDAY_EXTRA = {
  'novogodnie-podarki': ['Игрушка-символ года с логотипом на шарфе', 'Конфетница-игрушка с корпоративной открыткой', 'Подарочный набор: мини-игрушка + сладости', 'Коллекционный маскот лимитированной новогодней серии'],
  'podarki-na-8-marta': ['Нежная плюшевая игрушка с цветочным аксессуаром', 'Подушка-сердце с вышивкой логотипа', 'Подарочный набор для сотрудниц и клиенток', 'Плюшевые тюльпаны — «не вянущий» букет бренда'],
  'podarki-na-23-fevralya': ['Маскот в «мужском» образе: пилот, капитан, инженер', 'Подарочный набор коллегам с брендированной упаковкой', 'Игрушка-талисман с вышивкой даты и имени', 'ПВХ-брелоки в тематике 23 Февраля для всей команды'],
  'podarki-detyam-sotrudnikov': ['Мягкая игрушка с сертификацией 0+ для малышей', 'Новогодний набор для ребёнка сотрудника', 'Игрушка по детскому рисунку сотрудников', 'Рюкзачок или брелок с маскотом компании'],
  'podarki-klientam': ['Игрушка-талисман с фирменными цветами бренда', 'Подарочный набор к годовщине сотрудничества', 'Маскот-компаньон для стола или кресла клиента', 'Лимитированная серия с нумерацией для ключевых клиентов'],
  'podarki-partneram': ['Статусный маскот ручной отделки', 'Подарочный набор в деревянной коробке с гравировкой', 'Персонализированная игрушка с именной вышивкой', 'ПВХ-фигурка основателей или героя сделки'],
  'podarki-sotrudnikam': ['Welcome-игрушка для новичков команды', 'Маскот-талисман офиса в фирменных цветах', 'Игрушка-награда «лучшему за месяц»', 'Мерч-набор: брелок, подушка, мини-маскот'],
  'den-rozhdeniya-kompanii': ['Юбилейный маскот с вышивкой даты', 'Лимитированная серия игрушек к юбилею', 'Ретро-версия первого продукта компании в плюше', 'Подарочные наборы сотрудникам и партнёрам к дате'],
  'podarki-na-1-sentyabrya': ['Плюшевый талисман класса или школы', 'Рюкзаки и брелоки для первоклассников', 'Игрушки-награды для олимпиад и конкурсов', 'Маскот школы для актового дня 1 сентября'],
  'podarki-na-vypuskny': ['Игрушка-выпускник в мантии с логотипом школы', 'Мишка с вышивкой года выпуска', 'Брелоки-талисманы для всего класса', 'Подарочный набор «на память о детсаде/школе»'],
  'podarki-na-14-fevralya': ['Парные мишки с логотипом бренда', 'Плюшевое сердце с вышивкой', 'Набор «пара игрушек» для пар-сотрудников', 'Мини-брелоки-сердечки для промо-раздач ко Дню влюблённых'],
  'halloween-podarki': ['Тыквенные игрушки и монстрики с логотипом', 'ПВХ-фигурки привидений и вампиров', 'Хэллоуин-маскот для вечеринки компании', 'Тематические брелоки для октябрьских промо'],
  'den-materi-podarki': ['Нежная игрушка-мама с малышом', 'Подушка с тёплой вышивкой для мамы', 'Подарочный набор для сотрудниц-мам', 'Плюшевый букет — долговечная альтернатива цветам'],
  'vystavki-meropriyatiya': ['Мини-игрушки для раздачи у стенда', 'ПВХ-брелоки и значки с QR на лендинг', 'Маскот-фотозона для привлечения трафика', 'Коллекционная серия для многодневных ивентов'],
  'podarki-na-den-uchitelya': ['Игрушка-совушка с благодарностью учителю', 'Брелоки с символикой школы для педагогов', 'Маскот школы в подарок к празднику', 'Наборы для учительских коллективов'],
  'podarki-na-den-stroitelya': ['Маскот в каске — талисман стройки', 'Игрушки-техника: краны, экскаваторы из плюша', 'Брелоки-кирпичики для команды', 'Наградные игрушки для лучших бригад'],
  'podarki-na-den-neftyanika': ['Маскот-нефтяник в фирменной форме', 'Игрушка-капля нефти — талисман компании', 'ПВХ-фигурки вышек и трубопроводов', 'Наборы для вахтовиков и офиса'],
  'podarki-na-den-medika': ['Игрушка-доктор в халате с логотипом клиники', 'Плюшевое сердце с благодарностью', 'Маскот клиники для ресепшн и детских зон', 'Наборы для медперсонала к профессиональному дню'],
};
holidays.forEach((h) => {
  const ideas = HOLIDAY_EXTRA[h.slug];
  if (ideas && !h.extra) {
    h.extra = {
      h2: 'Идеи и форматы под заказ',
      paras: ['Производим любой из форматов ниже — или разработаем уникальную идею под ваш бренд. Стартовать лучше за 6–8 недель до даты: в сезон производственные слоты разбирают заранее, а дедлайн мы фиксируем в договоре.'],
      list: ideas,
    };
  }
});


/* ---------- Анти-дубль отраслевых страниц: 4 ротируемых финала интро ---------- */
// В industries intro[1] заканчивается одинаковой «хвостовой» фразой — заменяем её
// на 4 варианта по индексу страницы: пары отраслей перестают быть близнецами.
const IND_SUFFIX = [
  'Производство полного цикла: делаем всё на своей фабрике, поэтому держим цены производителя и отвечаем за сроки договором.',
  'Тиражи от 100 штук до 100 000, бесплатный макет до старта, сигнальный образец — до партии. Проект ведёт персональный менеджер.',
  'Поможем выбрать формат под бюджет и повод: пришлите задачу — предложим 2–3 варианта с ценами и сроками за один рабочий день.',
  'Брендирование любой сложности — от вышивки до объёмной заливки ПВХ. Сертификаты ЕАС и «Честный знак» оформляем на фабрике.',
];
const IND_TAIL = / Тираж от 100 штук, брендирование любой сложности, сертификаты и маркировка «Честный знак», доставка по всей России точно к вашей дате\.$/;
landings.filter((p) => p.cluster === 'industries').forEach((p, i) => {
  if (p.intro && p.intro[1] && IND_TAIL.test(p.intro[1])) {
    p.intro[1] = p.intro[1].replace(IND_TAIL, ' ' + IND_SUFFIX[i % IND_SUFFIX.length]);
  }
});

const allPages = [...landings, hubDlyaBiznesa, ...articles];

const bySlug = {};
[...CORE, ...allPages].forEach((p) => { bySlug[p.slug] = p; });

// Статьи доступны и по slug 'news-<slug>' для relatedGroups
articles.forEach((a) => { bySlug[`news-${a.slug}`] = a; });

const all = { bySlug };

/* ---------- Валидация перелинковки ---------- */
let linkWarnings = 0;
allPages.forEach((p) => {
  (p.relatedGroups || []).forEach((g) => {
    g.pages.forEach((slug) => {
      if (!bySlug[slug]) { console.warn(`⚠️  Битая ссылка в related: ${p.slug} → ${slug}`); linkWarnings++; }
    });
  });
  (p.hubGroups || []).forEach((g) => {
    g.slugs.forEach((slug) => {
      if (!bySlug[slug]) { console.warn(`⚠️  Битая ссылка в хабе: ${p.slug} → ${slug}`); linkWarnings++; }
    });
  });
  (p.related || []).forEach((slug) => {
    if (!bySlug[slug]) { console.warn(`⚠️  Битая ссылка в статье: ${p.slug} → ${slug}`); linkWarnings++; }
  });
});

/* ---------- Рендер ---------- */
function writePage(urlPath, html) {
  const dir = urlPath === '/'
    ? OUT
    : path.join(OUT, urlPath.replace(/^\//, '').replace(/\/$/, ''));
  fs.mkdirSync(dir, { recursive: true });
  // Цены в данных генератора не утверждены владельцем — на страницы их не выводим (см. no-prices.js)
  // отраслевые страницы — тексты и примеры по реальным работам (industry-facts.js)
  fs.writeFileSync(path.join(dir, 'index.html'), applyIndustryFacts(stripHtml(html), urlPath), 'utf8');
}

let count = 0;
landings.forEach((p) => { writePage(p.url, T.renderLanding(p, all)); count++; });
writePage(hubDlyaBiznesa.url, T.renderHub(hubDlyaBiznesa, all)); count++;
articles.forEach((a) => { writePage(a.url, T.renderArticle(a, all)); count++; });

/* ---------- 404 ---------- */
const page404 = {
  title: '404 — страница не найдена | Пушистый Завод',
  desc: 'Страница не найдена. Перейдите на главную или в каталог продукции фабрики «Пушистый Завод».',
  url: '/404.html',
  image: '/prototype/images/hero-toy.webp',
};
const html404 = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${page404.title}</title>
<meta name="description" content="${page404.desc}">
<meta name="robots" content="noindex, follow">
<link rel="icon" type="image/png" href="/prototype/images/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat+Alternates:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/prototype/css/landing.css">
</head>
<body>
<section class="hero" style="min-height:70vh;display:flex;align-items:center"><div class="container center" style="text-align:center">
  <div style="font-size:110px;font-weight:700;line-height:1;background:linear-gradient(100deg,#639aee,#8d7ff0,#ff6099);-webkit-background-clip:text;background-clip:text;color:transparent">404</div>
  <h1 style="font-size:32px;margin:10px 0 14px">Страница не найдена</h1>
  <p class="sub" style="margin:0 auto 28px;max-width:520px">Похоже, такой страницы нет или она переехала. Зато у нас есть 200+ полезных страниц про игрушки и подарки — начните с главной.</p>
  <div class="hero-cta" style="justify-content:center">
    <a class="btn btn-primary" href="/">На главную</a>
    <a class="btn btn-ghost" href="/korporativnye-podarki/">Корпоративные подарки</a>
    <a class="btn btn-ghost" href="/works/">Наши работы</a>
  </div>
</div></section>
<script src="/prototype/js/site.js?v=20261029" defer></script>
</body>
</html>
`;
fs.writeFileSync(path.join(OUT, '404.html'), html404, 'utf8');

/* ---------- robots.txt ---------- */
const robots = `# robots.txt для pushistyzavod.ru
User-agent: *
Allow: /
Disallow: /api/
Disallow: /crm/
Disallow: /prototype/crm/
Disallow: /legacy
Disallow: /old
Disallow: /main
Disallow: /slider
Disallow: /header
Disallow: /footer
Disallow: /page*.html
Disallow: /files/
Disallow: /tilda/
Disallow: *?*
Allow: /prototype/css/
Allow: /prototype/js/
Allow: /prototype/images/

User-agent: Yandex
Allow: /
Disallow: /api/
Disallow: /crm/
Disallow: /prototype/crm/
Disallow: /legacy
Disallow: /old
Disallow: /main
Disallow: /slider
Disallow: /header
Disallow: /footer
Disallow: /page*.html
Disallow: /files/
Disallow: /tilda/
Disallow: *?*
Allow: /prototype/css/
Allow: /prototype/js/
Allow: /prototype/images/

Sitemap: ${C.SITE}/sitemap.xml
`;
fs.writeFileSync(path.join(OUT, 'robots.txt'), robots, 'utf8');

/* ---------- sitemap.xml ---------- */
const today = new Date().toISOString().slice(0, 10);
function urlEntry(loc, priority, changefreq, lastmod) {
  return `  <url>
    <loc>${C.SITE}${loc}</loc>
    <lastmod>${lastmod || today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}
const smUrls = [];
CORE.filter((c) => !c.noindexSitemap).forEach((c) => smUrls.push(urlEntry(c.url, c.priority, 'weekly')));
landings.filter((p) => !p.noindex).forEach((p) => smUrls.push(urlEntry(p.url, p.cluster === 'cities' ? '0.6' : '0.8', 'monthly')));
smUrls.push(urlEntry('/kontakty/', '0.8', 'monthly')); // страницу собирает contacts.js
smUrls.push(urlEntry(hubDlyaBiznesa.url, '0.8', 'monthly'));
articles.forEach((a) => smUrls.push(urlEntry(a.url, '0.6', 'monthly', a.date)));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${smUrls.join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap, 'utf8');

/* ---------- pages-manifest.json (для server.js) ---------- */
const manifest = {
  generated: today,
  landings: landings.map((p) => p.url),
  hubs: [hubDlyaBiznesa.url],
  articles: articles.map((a) => a.url),
  core: CORE.map((c) => c.url),
  counts: {
    landings: landings.length,
    hubs: 1,
    articles: articles.length,
    core: CORE.length,
    total: count + CORE.length,
  },
};
fs.writeFileSync(path.join(__dirname, 'pages-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

/* ---------- Итог ---------- */
console.log('✅ Генерация завершена');
console.log(`   Посадочных страниц: ${landings.length}`);
console.log(`   Хабов: 1 (/dlya-biznesa/)`);
console.log(`   Статей блога: ${articles.length}`);
console.log(`   Основных страниц (существующие): ${CORE.length}`);
console.log(`   Всего URL в sitemap: ${smUrls.length}`);
if (linkWarnings) console.log(`   ⚠️  Предупреждений по ссылкам: ${linkWarnings}`);
