// Шаблон SEO-посадочной страницы «Пушистый Завод»
const C = require('./data/config');

const esc = (s) => String(s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');

/* ---------- JSON-LD ---------- */
function jsonldOrganization() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': C.SITE + '/#org',
    name: 'Пушистый Завод — фабрика мягких игрушек и сувениров на заказ',
    url: C.SITE + '/',
    logo: C.SITE + '/prototype/images/logo.png',
    email: C.COMPANY.email,
    telephone: C.COMPANY.phoneTel,
    foundingDate: '2016',
    address: [
      { '@type': 'PostalAddress', streetAddress: 'Автозаводская ул., 23Б, корп. 2', addressLocality: 'Москва', addressCountry: 'RU', description: 'Офис продаж' },
      { '@type': 'PostalAddress', addressLocality: 'Москва', addressCountry: 'RU', description: 'Производство' },
      { '@type': 'PostalAddress', addressLocality: 'Иваново', addressRegion: 'Ивановская область', addressCountry: 'RU', description: 'Производство' },
      { '@type': 'PostalAddress', addressLocality: 'Улан-Удэ', addressRegion: 'Республика Бурятия', addressCountry: 'RU', description: 'Производство' },
    ],
    sameAs: [C.COMPANY.tg, C.COMPANY.vk, C.COMPANY.max],
  };
}

function jsonldLocalBusiness() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': C.SITE + '/#local',
    name: 'Фабрика «Пушистый Завод»',
    image: C.SITE + '/prototype/images/hero-main.webp',
    url: C.SITE + '/',
    telephone: C.COMPANY.phoneTel,
    email: C.COMPANY.email,
    priceRange: '₽₽',
    address: { '@type': 'PostalAddress', streetAddress: 'Автозаводская ул., 23Б, корп. 2', addressLocality: 'Москва', addressCountry: 'RU' },
    openingHoursSpecification: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '18:00' },
  };
}

function jsonldBreadcrumb(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1,
      name: it.label,
      ...(it.url ? { item: C.SITE + it.url } : {}),
    })),
  };
}

function jsonldFAQ(faq) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

function jsonldProduct(p) {
  const line = C.PRICE_LINES[p.priceKey] || C.PRICE_LINES.toy;
  const lowPrice = line.prices[line.prices.length - 1][1];
  const highPrice = line.prices[0][1];
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.h1plain,
    description: p.desc,
    image: C.SITE + p.image,
    brand: { '@type': 'Brand', name: 'Пушистый Завод' },
    manufacturer: { '@id': C.SITE + '/#org' },
    offers: {
      '@type': 'AggregateOffer',
      url: C.SITE + p.url,
      priceCurrency: 'RUB',
      lowPrice, highPrice,
      offerCount: line.prices.length,
      availability: 'https://schema.org/InStock',
      areaServed: 'RU',
    },
  };
}

function jsonldArticle(a) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.h1plain,
    description: a.desc,
    image: C.SITE + a.image,
    datePublished: a.date,
    dateModified: a.date,
    author: { '@type': 'Organization', name: 'Пушистый Завод', url: C.SITE + '/' },
    publisher: { '@id': C.SITE + '/#org' },
    mainEntityOfPage: C.SITE + a.url,
  };
}

/* ---------- Блоки ---------- */
function head(p, schemas) {
  const ogImage = C.SITE + p.image;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${C.SITE}${p.url}">
<meta name="robots" content="${p.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Пушистый Завод">
<meta property="og:locale" content="ru_RU">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${C.SITE}${p.url}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.title)}">
<meta name="twitter:description" content="${esc(p.desc)}">
<meta name="twitter:image" content="${ogImage}">
<link rel="icon" type="image/png" href="/prototype/images/favicon.png">
<link rel="apple-touch-icon" href="/prototype/images/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat+Alternates:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/prototype/css/landing.css">
${schemas.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
</head>
<body>
`;
}

function breadcrumbs(items) {
  return `<nav class="crumbs" aria-label="Хлебные крошки"><div class="container"><ol>` +
    items.map((it, i, arr) => {
      const last = i === arr.length - 1;
      return `<li>${last ? `<span aria-current="page">${esc(it.label)}</span>` : `<a href="${it.url}">${esc(it.label)}</a>`}</li>`;
    }).join('') +
    `</ol></div></nav>`;
}

function hero(p) {
  return `<section class="hero"><div class="container">
  <div>
    <span class="eyebrow">${esc(p.eyebrow)}</span>
    <h1>${p.h1}</h1>
    <p class="sub">${esc(p.sub)}</p>
    <div class="hero-cta">
      <a class="btn btn-primary" href="#cta">Получить расчёт</a>
      <a class="btn btn-ghost" href="#works">Примеры работ</a>
    </div>
    <div class="hero-facts">
      <span class="fact"><i>📦</i> Тираж от 100 шт</span>
      <span class="fact"><i>🎯</i> Образец ~10 дней</span>
      <span class="fact"><i>⏱</i> Тираж 3–6 недель</span>
      <span class="fact"><i>📄</i> Договор, УПД</span>
    </div>
  </div>
  <div class="hero-img"><img src="${p.image}" alt="${esc(p.imgAlt)}" width="480" height="340" fetchpriority="high" decoding="async"></div>
</div></section>`;
}

function introBlock(p) {
  return `<section><div class="container">
  <h2>${p.introH2}</h2>
  <div class="prose">${p.intro.map((t) => `<p>${t}</p>`).join('')}</div>
</div></section>`;
}

// Уникальный дополнительный блок страницы (extra): разводит похожие кластеры
// по search intent и убирает шаблонность
function extraBlock(p) {
  if (!p.extra) return '';
  const items = (p.extra.list || []).map((li) => `<li>${li}</li>`).join('');
  return `<section style="padding-top:0"><div class="container">
  <h2>${p.extra.h2}</h2>
  <div class="prose">${(p.extra.paras || []).map((t) => `<p>${t}</p>`).join('')}${items ? `<ul>${items}</ul>` : ''}</div>
</div></section>`;
}



const clOf = (p) => (C.H2.benefits[p.cluster] ? p.cluster : 'default');

function benefitsBlock(p) {
  const items = p.benefits || C.BENEFITS;
  const cl = clOf(p);
  return `<section class="soft"><div class="container">
  <h2>${C.H2.benefits[cl]}</h2>
  <p class="lead">${C.LEADS.benefits[cl]}</p>

  <div class="cards6">${items.map((b) => `<div class="card6"><div class="i">${b.i}</div><b>${b.b}</b><p>${b.p}</p></div>`).join('')}</div>
</div></section>`;
}

function statsBlock() {
  return `<section style="padding-top:0"><div class="container">
  <div class="stats">${C.STATS.map((s) => `<div class="stat"><b>${s.b}</b><span>${s.s}</span></div>`).join('')}</div>
</div></section>`;
}

function stepsBlock(p) {
  const steps = p.steps || C.STEPS_SOFT;
  const cl = clOf(p);
  const h2 = C.H2.steps[cl] || C.H2.steps.default;
  const lead = C.LEADS.steps[cl] || C.LEADS.steps.default;
  return `<section><div class="container">
  <h2>${h2}</h2>
  <p class="lead">${lead}</p>

  <div class="steps">${steps.map((s) => `<div class="step"><b>${s.b}</b><p>${s.p}</p><span class="t">${s.t}</span></div>`).join('')}</div>
</div></section>`;
}

// Ротация кейсов: берём топ-12 релевантных и сдвигаем окно по индексу страницы,
// чтобы разные страницы показывали разные подборки примеров (меньше дублей блоков).
function pickCases(p, n) {
  const tags = p.caseTags || ['toy'];
  const scored = C.CASES.map((c) => ({ c, score: c.tags.filter((t) => tags.includes(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const win = scored.slice(0, Math.max(n, 12));
  if (win.length > n && p.caseOffset) {
    const r = p.caseOffset % win.length;
    win.push(...win.splice(0, r));
  }
  const picked = win.slice(0, n).map((x) => x.c);

  // добираем любыми, если по тегам не хватило
  if (picked.length < n) {
    for (const c of C.CASES) {
      if (picked.length >= n) break;
      if (!picked.includes(c)) picked.push(c);
    }
  }
  return picked;
}

function worksBlock(p) {
  const cases = pickCases(p, 8);
  const cl = clOf(p);
  return `<section class="soft" id="works"><div class="container">
  <h2>${C.H2.works[cl] || C.H2.works.default}</h2>

  <p class="lead">Реальные тиражи, произведённые на нашей фабрике. Больше кейсов — в разделе <a href="/works.html" style="color:var(--blue);font-weight:600">«Наши работы»</a>.</p>
  <div class="works-grid">${cases.map((c) => `<div class="work"><div class="ph"><img src="/prototype/images/works/${c.img}" alt="${esc(c.cap)} — производство Пушистый Завод" loading="lazy" decoding="async"></div><div class="cap"><b>${esc(c.cap)}</b><span>Тираж: ${c.qty}</span></div></div>`).join('')}</div>
  <div class="works-more"><a class="btn btn-blue" href="/works.html">Все наши работы</a></div>
</div></section>`;
}

function priceBlock(p) {
  const line = C.PRICE_LINES[p.priceKey] || C.PRICE_LINES.toy;
  const rows = line.prices.map(([qty, price]) => `<tr><td>${qty.toLocaleString('ru-RU')} шт</td><td><b>от ${price.toLocaleString('ru-RU')} ₽/шт</b></td><td>от ${(qty * price).toLocaleString('ru-RU')} ₽</td></tr>`).join('');
  return `<section id="prices"><div class="container">
  <h2>Цены и тиражи</h2>
  <p class="lead">Ориентировочные цены на ${esc(line.label)} с брендированием. Точная смета — после брифа: зависит от материалов, сложности лекал и упаковки.</p>
  <table class="price-tbl"><thead><tr><th>Тираж</th><th>Цена за штуку</th><th>Стоимость партии</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="price-note">* В цену включены: материалы, брендирование (вышивка или печать), бирка, полиэтиленовая упаковка. Отдельно считаются: разработка персонажа «с нуля», пресс-форма для ПВХ, подарочная упаковка, доставка. Сигнальный образец вычитается из суммы тиража.</p>
</div></section>`;
}

function deliveryBlock(p) {
  const cityText = p.city
    ? `В ${p.cityPrep || p.city} партии отправляем транспортными компаниями СДЭК, Деловые Линии, ПЭК и ЖелДорЭкспедиция. Ориентировочный срок доставки — ${p.delivery}. Груз страхуем, трек-номер присылаем в день отгрузки.`
    : 'Отправляем партии по всей России: СДЭК, Деловые Линии, ПЭК, ЖелДорЭкспедиция. Срок доставки — 1–7 дней в зависимости от города. Груз страхуем, трек-номер присылаем в день отгрузки.';
  const cl = clOf(p);
  return `<section class="soft"><div class="container">
  <h2>${C.H2.delivery[cl] || C.H2.delivery.default}</h2>

  <div class="cards6">
    <div class="card6"><div class="i">💳</div><b>Оплата</b><p>Договор, счёт, безналичный расчёт, УПД. 70% предоплата, 30% перед отгрузкой. Постоянным клиентам — отсрочка платежа.</p></div>
    <div class="card6"><div class="i">⏱</div><b>Сроки</b><p>Макет — 2–4 дня, образец — ~10 дней, тираж — 2–5 недель. Дату отгрузки фиксируем в договоре и отвечаем за неё.</p></div>
    <div class="card6"><div class="i">🚚</div><b>Доставка</b><p>${cityText}</p></div>
  </div>
</div></section>`;
}

// Три отзыва с Яндекс Карт на страницу: сначала подходящие по теме страницы (tags),
// остальные — по кругу от хэша адреса, чтобы на разных страницах были разные отзывы
function reviewPick(url) {
  const n = C.REVIEWS.length;
  let h = 0;
  for (const ch of url) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  const rotate = (list) => list.map((_, i) => list[(h + i) % list.length]);
  const themed = rotate(C.REVIEWS.filter((r) => r.tags.some((t) => url.includes(t))));
  const all = rotate(C.REVIEWS);
  const out = [];
  for (const r of [...themed, ...all]) if (out.length < 3 && !out.includes(r)) out.push(r);
  return out;
}

function reviewCards(items) {
  const link = C.REVIEWS_URL.replace(/&/g, '&amp;');
  return items.map((r) => `<div class="review"><div class="rh"><img src="/prototype/images/reviews/${r.ava}" alt="${esc(r.name)} — отзыв на Яндекс Картах" width="48" height="48" loading="lazy" decoding="async"><div><b>${esc(r.name)}</b><span>${r.date} · <a href="${link}" target="_blank" rel="noopener">на Яндекс Картах →</a></span></div></div><div class="stars">★★★★★</div><p>«${esc(r.text)}»</p></div>`).join('');
}

function reviewsBlock(p) {
  const cl = clOf(p);
  return `<section><div class="container">
  <h2>${C.H2.reviews[cl] || C.H2.reviews.default}</h2>

  <p class="lead">Реальные отзывы клиентов с Яндекс Карт — по ссылке можно прочитать оригинал.</p>
  <div class="reviews-grid">${reviewCards(reviewPick(p.url))}</div>
</div></section>`;
}

function clientsBlock() {
  const logos = [1, 2, 3, 4, 5, 6].map((n) => `<img src="/prototype/images/clients/client-${n}.png" alt="Клиент фабрики Пушистый Завод" loading="lazy" decoding="async">`).join('');
  return `<section style="padding-top:0"><div class="container center">
  <div class="clients-row">${logos}</div>
  <div class="trust" style="margin-top:26px">${C.TRUST.map((t) => `<span>${t}</span>`).join('')}</div>
</div></section>`;
}

function faqBlock(p) {
  return `<section class="soft"><div class="container">
  <h2>Частые <span>вопросы</span></h2>
  <p class="lead">Собрали ответы на вопросы, которые задают чаще всего. Не нашли свой — позвоните ${C.COMPANY.phone}, расскажем.</p>
  <div class="faq">${p.faq.map((f) => `<details><summary>${esc(f.q)}</summary><div class="a">${esc(f.a)}</div></details>`).join('')}</div>
</div></section>`;
}

function relatedBlock(p, all) {
  const groups = p.relatedGroups || [];
  const html = groups.map((g) => {
    const links = g.pages.map((slug) => {
      const t = all.bySlug[slug];
      return t ? `<a class="rel" href="${t.url}"><b>${esc(t.linkLabel || t.h1plain)}</b><span>${esc(t.linkDesc || t.desc.slice(0, 72) + '…')}</span></a>` : '';
    }).join('');
    return `<h3>${esc(g.title)}</h3><div class="rel-grid">${links}</div>`;
  }).join('');
  return `<section><div class="container rel-wrap">
  <h2 style="margin-bottom:22px">Смотрите <span>также</span></h2>
  ${html}
</div></section>`;
}

function ctaBlock(p) {
  return `<section id="cta" style="padding-bottom:0"><div class="container">
  <div class="cta">
    <div>
      <h2>Получите расчёт <span>за 1 рабочий день</span></h2>
      <p>Оставьте заявку — обсудим задачу, предложим варианты под бюджет и пришлём смету со сроками. Бесплатно нарисуем макет будущего изделия.</p>
      <div class="contacts">
        <a href="tel:${C.COMPANY.phoneTel}">📞 ${C.COMPANY.phone}</a>
        <a href="${C.COMPANY.tg}" target="_blank" rel="noopener">Telegram</a>
        <a href="mailto:${C.COMPANY.email}">✉️ ${C.COMPANY.email}</a>
      </div>
    </div>
    <form data-api-form data-form-name="${esc(p.formName)}">
      <input type="text" name="name" placeholder="Ваше имя" required>
      <input type="tel" name="phone" placeholder="Телефон" required>
      <input type="email" name="email" placeholder="E-mail">
      <textarea name="product" rows="3" placeholder="Что изготовить? Например: ${esc(p.formHint)}"></textarea>
      <button class="btn btn-primary" type="submit">Получить расчёт</button>
      <small>Нажимая кнопку, вы соглашаетесь с <a href="/privacy.html">политикой конфиденциальности</a>. Ответим в течение рабочего дня.</small>
    </form>
  </div>
</div></section>`;
}

/* ---------- Блок городов (для /dostavka-po-rf/ — входная точка гео-кластера) ---------- */
function citiesBlock(all) {
  const seen = new Set();
  const cities = Object.values(all.bySlug).filter((t) => {
    if (!t || t.cluster !== 'cities' || !t.city || seen.has(t.slug)) return false;
    seen.add(t.slug);
    return true;
  }).sort((a, b) => String(a.city).localeCompare(String(b.city), 'ru'));
  if (!cities.length) return '';
  const links = cities.map((t) => `<a href="${t.url}" style="display:block;background:#fff;border:1px solid #eceef3;border-radius:12px;padding:11px 16px;font-size:14px;font-weight:600;color:#22242b;text-decoration:none">${esc(t.city)}</a>`).join('');
  return `<section><div class="container">
  <h2>Города <span>доставки</span></h2>
  <p class="lead">Отгружаем тиражи в 80+ городов России — от Калининграда до Владивостока. На странице каждого города: сроки, логистика и условия работы.</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px">${links}</div>
</div></section>`;
}

/* ---------- Сборка посадочной страницы ---------- */
function renderLanding(p, all) {

  const schemas = [
    jsonldOrganization(),
    jsonldLocalBusiness(),
    jsonldBreadcrumb(p.crumbs),
    jsonldFAQ(p.faq),
    p.schemaType === 'Service' ? null : jsonldProduct(p),
  ].filter(Boolean);
  if (p.schemaType === 'Service') {
    schemas.push({
      '@context': 'https://schema.org', '@type': 'Service',
      name: p.h1plain, description: p.desc, url: C.SITE + p.url,
      provider: { '@id': C.SITE + '/#org' },
      areaServed: p.city ? { '@type': 'City', name: p.city } : 'RU',
    });
  }

  return head(p, schemas)
    + breadcrumbs(p.crumbs)
    + hero(p)
    + introBlock(p)
    + extraBlock(p)
    + benefitsBlock(p)

    + statsBlock()
    + stepsBlock(p)
    + worksBlock(p)
    + priceBlock(p)
    + deliveryBlock(p)
    + reviewsBlock(p)
    + clientsBlock()
    + faqBlock(p)
    + relatedBlock(p, all)
    + (p.showCities ? citiesBlock(all) : '')
    + ctaBlock(p)
    + `<script src="/prototype/js/site.js?v=${ASSET_VERSION}" defer></script>\n</body>\n</html>\n`;
}

/* ---------- Хаб-страница ---------- */

function renderHub(p, all) {
  const schemas = [jsonldOrganization(), jsonldBreadcrumb(p.crumbs), jsonldFAQ(p.faq)];
  const groups = p.hubGroups.map((g) => {
    const cards = g.slugs.map((slug) => {
      const t = all.bySlug[slug];
      return t ? `<a class="hub" href="${t.url}"><b>${esc(t.h1plain)}</b><span>${esc(t.desc)}</span></a>` : '';
    }).join('');
    return `<section style="padding-top:34px"><div class="container"><h2>${esc(g.title)}</h2><div class="hub-grid">${cards}</div></div></section>`;
  }).join('');
  return head(p, schemas)
    + breadcrumbs(p.crumbs)
    + hero(p)
    + introBlock(p)
    + groups
    + faqBlock(p)
    + ctaBlock(p)
    + `<script src="/prototype/js/site.js?v=${ASSET_VERSION}" defer></script>\n</body>\n</html>\n`;
}

/* ---------- Статья блога ---------- */
function renderArticle(a, all) {
  const schemas = [jsonldOrganization(), jsonldBreadcrumb(a.crumbs), jsonldArticle(a), a.faq ? jsonldFAQ(a.faq) : null].filter(Boolean);
  const related = (a.related || []).map((slug) => {
    const t = all.bySlug[slug];
    return t ? `<a class="rel" href="${t.url}"><b>${esc(t.linkLabel || t.h1plain)}</b><span>${esc((t.desc || '').slice(0, 72))}…</span></a>` : '';
  }).join('');
  return head(a, schemas)
    + breadcrumbs(a.crumbs)
    + `<section class="hero" style="padding-bottom:20px"><div class="container">
  <div>
    <span class="eyebrow">${esc(a.eyebrow)}</span>
    <h1 style="font-size:36px">${a.h1}</h1>
    <div class="meta article" style="padding:0"><span class="cat">${esc(a.category)}</span><span>${a.dateHuman}</span><span>·</span><span>${a.readTime}</span></div>
  </div>
</div></section>`
    + `<section style="padding-top:26px"><div class="container"><div class="article">${a.body}${a.bodyExtra || ''}</div></div></section>`

    + (a.faq ? faqBlock(a) : '')
    + ctaBlock(a)
    + `<script src="/prototype/js/site.js?v=${ASSET_VERSION}" defer></script>\n</body>\n</html>\n`;
}

// Версия css/js в адресах (?v=…) — меняется при каждом изменении site.js, чтобы обновился кэш
const ASSET_VERSION = '20261017';

module.exports = { renderLanding, renderHub, renderArticle, jsonldOrganization, jsonldLocalBusiness, jsonldBreadcrumb, head, breadcrumbs, ctaBlock, reviewPick, reviewCards, esc, ASSET_VERSION };
