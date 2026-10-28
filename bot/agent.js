#!/usr/bin/env node
// SEO-агент блога: раз в неделю готовит статью и присылает владельцу в Telegram на одобрение.
//
//   node bot/agent.js          — выбрать тему, найти факты, написать, проверить, сохранить черновик
//   node bot/agent.js notify   — отправить подготовленные черновики владельцу (после git push)
//   node bot/agent.js --dry    — то же, что без аргументов, но ничего не отправлять (для проверки)
//
// Черновики лежат в bot/drafts/<id>.json. Публикует их poll.js, когда владелец
// отвечает на сообщение с черновиком фотографией — она становится обложкой.
const fs = require('fs');
const path = require('path');
const { ask, parseJson } = require('./gemini');
const site = require('./publish');

const ROOT = path.join(__dirname, '..');
const DRAFTS = path.join(__dirname, 'drafts');
const OUT = path.join(__dirname, '.out');
const C = require('../generator/data/config');

// Сайты конкурентов и магазинов игрушек/сувениров — не цитируем и не ссылаемся
const BLOCKED = /(igramir|linot|rkorova|myakishi|maria-toys|spi1|amadey-print|plasticon|logoshop|ruixing|blindboxwholesale|alibaba|aliexpress|ozon\.ru|wildberries|printmarket|promo-?suvenir|gifts?\.(ru|com)|podarki|suvenir)/i;

// Подтверждённые кейсы фабрики: только их цифры агент может называть от имени компании
const CASES = [
  '300 000 маскотов для сети «Пятёрочка» (федеральная акция, около 2 месяцев)',
  '100 000 игрушек — персонаж сока «Добрый» (промо, около 2 месяцев)',
  '13 000 Чебурашек для Международного фестиваля молодёжи 2026 в Екатеринбурге за 21 день; показаны в эфире Первого канала и в фоторепортаже РИА Новости',
  '10 000 талисманов ХК «Локомотив» (около 2 месяцев)',
  '10 000 маскотов для BMW',
  '20 000 маскотов Зевы',
  '6 000 промо-игрушек для «Детского мира» (45 дней)',
  '6 000 ABS-фигурок для Mindray',
  '7 000 и 3 000 игрушек — символ года для «Ростикс»',
  '3 000 персонажей для «Аэрофлота» (40 дней)',
  '3 000 ПВХ-брелоков для Яндекса',
  '1 500 мягких черепашек для Московского зоопарка',
  '600 маскотов Омчиков для чемпионата России по фигурному катанию (18 дней)',
  '400 талисманов для сети отелей; 350 персонажей для отеля Radisson (28 дней)',
  '100 персонажей Стрелка для Роскосмоса (28 дней)',
  'маскот ПСБ, ABS-фигурки для Тинькофф и «Киберпротекта», талисманы ХК «Авангард» и федерации спортивной гимнастики России',
];
const FACTS = `Факты о фабрике «${C.COMPANY.name}», которые можно использовать:
- Производство мягких игрушек, маскотов, ПВХ- и ABS-фигурок, брелоков, подушек, рюкзаков, тапочек с логотипом для бизнеса.
- Производства: ${C.COMPANY.factory}. Офис: ${C.COMPANY.officeAddress}.
- Минимальный тираж — 100 штук. Макет бесплатно за 2–4 дня, сигнальный образец около 10 дней, тираж 3–6 недель.
- Работа с юрлицами и ИП по договору, предоплата. Маркировка «Честный знак» на производстве.
- Подтверждённые кейсы:\n${CASES.map((c) => '  • ' + c).join('\n')}
Цен не называть. Других цифр о фабрике, клиентов, наград, сертификатов, гарантий и обещаний не придумывать.`;

// Ближайшие поводы для B2B-подарков: статья к поводу выходит за 6–10 недель
function occasions(now) {
  const y = now.getFullYear();
  const list = [
    ['Новый год и символ года', `${y}-12-31`], ['23 февраля', `${y + 1}-02-23`], ['8 марта', `${y + 1}-03-08`],
    ['14 февраля', `${y + 1}-02-14`], ['выпускные', `${y + 1}-05-25`], ['День защиты детей', `${y + 1}-06-01`],
    ['День медицинского работника', `${y + 1}-06-21`], ['День строителя', `${y + 1}-08-09`], ['1 сентября', `${y + 1}-09-01`],
    ['День нефтяника', `${y + 1}-09-06`], ['День учителя', `${y + 1}-10-05`], ['День матери', `${y}-11-29`], ['Хэллоуин', `${y + 1}-10-31`],
  ];
  return list.map(([n, d]) => ({ n, days: Math.round((new Date(d) - now) / 864e5) }))
    .map((o) => (o.days < 0 ? { ...o, days: o.days + 365 } : o))
    .filter((o) => o.days > 20 && o.days < 110).sort((a, b) => a.days - b.days)
    .map((o) => `${o.n} — через ${o.days} дн.`).join('; ') || 'крупных поводов в ближайшие недели нет';
}

function readDrafts() {
  if (!fs.existsSync(DRAFTS)) return [];
  return fs.readdirSync(DRAFTS).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(DRAFTS, f), 'utf8')));
}

function existingTitles() {
  Object.keys(require.cache).filter((k) => k.includes(`${path.sep}generator${path.sep}`)).forEach((k) => delete require.cache[k]);
  const articles = require('../generator/data/articles');
  const titles = articles.map((a) => a.h1plain || a.title);
  readDrafts().forEach((d) => titles.push(`${d.article.h1} (${d.status === 'published' ? 'опубликовано' : 'черновик, ' + d.status})`));
  return titles;
}

// 1. Тема недели
// Вопросы, по которым нейросети ставят нас ниже 3-го места или не называют (из bot/visibility.js)
function weakAiQueries() {
  const file = path.join(__dirname, 'visibility.json');
  if (!fs.existsSync(file)) return '';
  const last = JSON.parse(fs.readFileSync(file, 'utf8')).pop();
  const weak = (last ? last.results : []).filter((r) => !r.error && (r.rank <= 0 || r.rank > 3));
  if (!weak.length) return '';
  return `По этим вопросам нейросети (ChatGPT, Алиса, Gemini) советуют конкурентов, а нас ставят низко или не называют — статья, которая прямо и полно отвечает на один из них, в приоритете:
${weak.map((r) => `- ${r.q} (${r.rank > 0 ? r.rank + ' место' : 'нас нет в ответе'}; советуют: ${(r.top || []).slice(0, 3).join(', ')})`).join('\n')}

`;
}

async function pickTopic(now) {
  const system = `Ты — SEO-редактор блога B2B-фабрики мягких игрушек и ПВХ-фигурок с логотипом (pushistyzavod.ru). Аудитория — маркетологи, HR, закупщики, ивент-агентства, владельцы брендов в России и СНГ. Цель блога — приводить из Яндекса и Google людей, которые выбирают подрядчика на брендированные игрушки, сувениры и маскотов, и отвечать на их вопросы так, чтобы ответы цитировали Алиса и ChatGPT.`;
  const prompt = `Сегодня ${now.toISOString().slice(0, 10)}. Ближайшие поводы: ${occasions(now)}.

Уже есть статьи (не повторяй их темы и углы):
${existingTitles().map((t) => '- ' + t).join('\n')}

${weakAiQueries()}Найди в интернете, что сейчас актуально для этой аудитории: изменения в законах и маркировке, тренды корпоративного мерча и промо, выставки и события, исследования рынка подарков, новые форматы (коллекционные фигурки, маскоты в соцсетях и т.п.). Предложи ОДНУ тему статьи недели, которая:
- отвечает на реальный поисковый запрос заказчика (по нему ищут в Яндексе), а не просто «новость ради новости»;
- даёт полезное и проверяемое содержание (цифры, правила, примеры, сроки);
- естественно ведёт к заказу игрушек, маскотов или ПВХ-сувениров;
- если близок повод из списка — лучше приурочить к нему.

Ответь строго JSON без пояснений:
{"topic":"тема","query":"главный поисковый запрос","angle":"чем статья полезнее конкурентов","whyNow":"почему актуально сейчас","type":"гид|сезон|тренд|закон|отрасль"}`;
  const { text } = await ask({ system, prompt, search: true, maxTokens: 4000 });
  return parseJson(text);
}

// Ссылки из поиска Google — промежуточные (vertexaisearch…/grounding-api-redirect): узнаём настоящий адрес
async function resolveUrl(url) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000) });
    const loc = res.headers.get('location');
    return loc && /^https?:\/\//.test(loc) ? loc : url;
  } catch (e) { return url; }
}

// 2. Факты по теме с источниками
async function research(topic) {
  const system = 'Ты — исследователь-фактчекер. Собираешь только проверяемые факты из надёжных источников на русском и английском: официальные сайты, госорганы, СМИ, отраслевые исследования. Не выдумываешь.';
  const prompt = `Тема статьи: «${topic.topic}». Поисковый запрос: «${topic.query}».

Не используй сайты производителей и продавцов игрушек, сувениров и подарков (это конкуренты) — бери СМИ, госорганы, отраслевые исследования, ассоциации, официальные сайты брендов о своих кампаниях.

Найди 8–15 конкретных фактов для статьи: цифры, даты, требования законов, примеры компаний и кампаний, данные исследований, практические правила. Для каждого факта укажи источник.
Формат — список строк: «— факт (Источник: название сайта)». Только то, что действительно нашёл. Если по пункту данных нет — не пиши его.`;
  const r = await ask({ system, prompt, search: true, maxTokens: 6000 });
  const seen = new Set();
  const sources = [];
  for (const s of r.sources) {
    const url = await resolveUrl(s.url);
    if (!/^https?:\/\//.test(url) || BLOCKED.test(url) || /\/(vakansii|vacancy|resume|job)\//i.test(url)) continue;
    // один источник с сайта — без повторов superjob.ru, superjob.ru, …
    const key = new URL(url).hostname.replace(/^(www|m|[a-z-]+)\.(?=[a-z0-9-]+\.[a-z]+$)/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ title: s.title || new URL(url).hostname, url });
  }
  return { notes: r.text, sources: sources.slice(0, 12) };
}

const str = (description) => ({ type: 'STRING', description });
const ARTICLE = {
  type: 'OBJECT',
  properties: {
    slug: str('URL латиницей через дефис, 3–6 слов, транслит главного запроса'),
    title: str('SEO-заголовок <title> до 65 символов, главный запрос в начале'),
    description: str('Meta description 140–160 символов: польза для читателя и запрос'),
    h1: str('Заголовок статьи до 80 символов, отличается от title'),
    shortTitle: str('Короткий заголовок для карточки, до 50 символов'),
    bodyHtml: str('Текст статьи в HTML: только p, h2, h3, ul, ol, li, strong, a, table, tr, th, td'),
    imageAlt: str('alt для обложки: описание фото по теме статьи, до 120 символов'),
    faq: { type: 'ARRAY', items: { type: 'OBJECT', properties: { q: str('Вопрос'), a: str('Ответ') }, required: ['q', 'a'] } },
    sourcesUsed: { type: 'ARRAY', items: { type: 'INTEGER' }, description: 'номера использованных источников из списка' },
  },
  required: ['slug', 'title', 'description', 'h1', 'shortTitle', 'bodyHtml', 'imageAlt', 'faq', 'sourcesUsed'],
};

// 3. Статья
async function write(topic, research, feedback) {
  const pages = site.sitePages();
  const system = `Ты пишешь статьи для блога фабрики «${C.COMPANY.name}» (pushistyzavod.ru). Статья публикуется от имени фабрики, поэтому всё сказанное о фабрике читатель примет за официальное заявление.

${FACTS}

Правила достоверности:
- Факты о рынке, законах, цифры и примеры других компаний бери только из блока «Найденные факты» и указывай номер источника в sourcesUsed. Если факта нет в блоке — не пиши его.
- Каждую цифру и исследование из «Найденных фактов» подписывай в тексте: «по данным Sostav», «как пишет РБК». Без подписи цифру не используй.
- О фабрике — только из списка выше. Нельзя писать «мы гарантируем», «лучшие цены», «мы первые», «высокотехнологичные», «массово производим», нельзя придумывать клиентов, цифры и технологии. Технологии и форматы с рынка (печать, гравировка, NFC и т.п.) описывай как рыночные, а не как услуги фабрики.

Текст:
- Русский, живой деловой тон, как пишет опытный редактор делового издания. Короткие предложения (до 20–25 слов), конкретика вместо оценок. Запрещены штампы: «колоссальный», «революция», «уникальный», «суровая реальность», «не секрет, что», «в современном мире», «идеально подходит», «настоящая магия», «эффективный инструмент». 1200–1600 слов без «воды».
- Не больше 2 упоминаний фабрики «Пушистый Завод» в тексте помимо кейсов. Статья прежде всего полезна читателю, а не реклама.
- Первый абзац сразу отвечает на запрос читателя и содержит главный запрос.
- 4–6 подзаголовков h2, где уместно — таблица и списки, хотя бы один практический чек-лист или пример расчёта.
- 1–2 подходящих кейса фабрики из списка, к месту.
- 3–4 ссылки на страницы сайта из списка ниже, анкор — естественная фраза. Только адреса из списка.
- Без контактов и призывов «оставьте заявку» — форма есть на странице. Без h1 и без фото в тексте.
- 5 вопросов-ответов в faq — короткие, точные, по теме.

Страницы сайта для ссылок:
${pages.map((p) => `${p.url} — ${p.title}`).join('\n')}`;
  const prompt = `Тема: «${topic.topic}». Главный запрос: «${topic.query}». Угол: ${topic.angle}. Почему сейчас: ${topic.whyNow}.

Найденные факты:
${research.notes}

Источники (номер — сайт):
${research.sources.map((s, i) => `${i} — ${s.title} ${s.url}`).join('\n')}

${feedback ? `\nИсправь замечания к прошлой версии:\n${feedback}` : ''}`;
  const { text } = await ask({ system, prompt, schema: ARTICLE, maxTokens: 20000 });
  return JSON.parse(text);
}

// 4. Проверка фактов: всё, что не подтверждено, убрать
async function factCheck(article, research) {
  const schema = {
    type: 'OBJECT',
    properties: {
      problems: { type: 'ARRAY', items: str('спорное утверждение и почему') },
      bodyHtml: str('исправленный bodyHtml целиком: неподтверждённое удалено или переписано, остальное без изменений, объём сохранить'),
      faq: { type: 'ARRAY', items: { type: 'OBJECT', properties: { q: str('Вопрос'), a: str('Ответ') }, required: ['q', 'a'] } },
    },
    required: ['problems', 'bodyHtml', 'faq'],
  };
  const system = `Ты — строгий фактчекер. Сверяешь статью с найденными фактами и с фактами о фабрике. Неподтверждённые цифры, даты, названия компаний, законы, обещания фабрики («гарантируем», «лучшие», «быстрее всех», цены) — удаляешь или переписываешь без них. Цифры без подписи источника в тексте — подписываешь («по данным …») по найденным фактам или удаляешь. Возможности фабрики сверх списка фактов (технологии, «массово», «высокотехнологичные», «любые») — удаляешь. Убираешь рекламные штампы и превосходные степени. Всё подтверждённое оставляешь, структуру, таблицы и ссылки не трогаешь.

${FACTS}`;
  const prompt = `Найденные факты:\n${research.notes}\n\nСтатья (HTML):\n${article.bodyHtml}\n\nВопросы-ответы (проверь так же строго, верни исправленные):\n${JSON.stringify(article.faq || [])}`;
  const { text } = await ask({ system, prompt, schema, maxTokens: 20000 });
  return JSON.parse(text);
}

const words = (html) => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter((w) => /[А-Яа-яЁёA-Za-z0-9]/.test(w)).length;
function quality(a) {
  const issues = [];
  const w = words(a.bodyHtml);
  if (w < 900) issues.push(`текст короткий (${w} слов), нужно 1200–1600`);
  if ((a.bodyHtml.match(/<h2/g) || []).length < 4) issues.push('нужно 4–6 подзаголовков h2');
  if ((a.bodyHtml.match(/<a href="\//g) || []).length < 2) issues.push('нужно 3–4 ссылки на страницы сайта');
  if (/₽|руб\./.test(a.bodyHtml) && /наш|фабрик/i.test(a.bodyHtml)) issues.push('проверить: в тексте есть цены');
  if ((a.faq || []).length < 4) issues.push('нужно 5 вопросов-ответов');
  return issues;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Черновик в виде самостоятельной HTML-страницы — открывается на телефоне из Telegram
function previewHtml(d) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.article.h1)}</title>
<style>body{font:17px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#22242b;max-width:760px;margin:0 auto;padding:18px}img{width:100%;border-radius:16px}h1{font-size:26px;line-height:1.25}h2{font-size:21px;margin-top:28px}table{border-collapse:collapse;width:100%;font-size:15px}td,th{border:1px solid #ddd;padding:6px 8px;text-align:left}.m{color:#6b6b76;font-size:14px}.box{background:#f4f7fd;border-radius:12px;padding:12px 16px;margin:16px 0}a{color:#4c8de1}</style></head><body>
<p class="m">ЧЕРНОВИК · ${esc(d.topic.type || '')} · ${d.words} слов · запрос: «${esc(d.topic.query)}»</p>
<div class="box"><b>Почему эта тема:</b> ${esc(d.topic.whyNow)}<br><b>Title:</b> ${esc(d.article.title)}<br><b>Description:</b> ${esc(d.article.description)}</div>
<div class="box"><b>Обложка:</b> выберите фото 1, 2 или 3 кнопкой под сообщением — статья опубликуется с ним. Или ответьте на сообщение своим фото.</div>
<h1>${esc(d.article.h1)}</h1>${d.article.bodyHtml}
<h2>Частые вопросы</h2>${d.article.faq.map((f) => `<p><b>${esc(f.q)}</b><br>${esc(f.a)}</p>`).join('')}
${d.sources.length ? `<h2>Источники</h2><ul>${d.sources.map((s) => `<li><a href="${esc(s.url)}">${esc(s.title)}</a></li>`).join('')}</ul>` : ''}
${d.problems.length ? `<div class="box"><b>Фактчекер убрал или смягчил:</b><ul>${d.problems.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}
</body></html>`;
}

async function makeDraft() {
  const now = new Date();
  console.log('1/4 Выбираю тему…');
  const topic = await pickTopic(now);
  console.log('   ', topic.topic, '|', topic.query);
  console.log('2/4 Ищу факты…');
  const res = await research(topic);
  console.log('    источников:', res.sources.length);
  console.log('3/4 Пишу статью…');
  let article = await write(topic, res);
  let issues = quality(article);
  if (issues.length) { console.log('    доработка:', issues.join('; ')); article = await write(topic, res, issues.join('\n')); }
  console.log('4/4 Проверяю факты…');
  let fc = await factCheck(article, res);
  if (words(fc.bodyHtml || '') < 900 && fc.problems && fc.problems.length) {
    console.log('    после проверки текст короткий — переписываю с замечаниями');
    article = await write(topic, res, 'Фактчекер нашёл проблемы, в новой версии их быть не должно:\n' + fc.problems.join('\n'));
    fc = await factCheck(article, res);
  }
  if (fc.bodyHtml && words(fc.bodyHtml) >= 600) article.bodyHtml = fc.bodyHtml;
  if (Array.isArray(fc.faq) && fc.faq.length >= 3) article.faq = fc.faq;

  console.log('Рисую 3 варианта обложки…');
  const { pickPhotos } = require('./photos');
  let photos = [];
  try { photos = await pickPhotos(article); } catch (e) { console.log('    обложки не получились:', e.message); }
  console.log('    фото:', photos.length);

  const id = `${now.toISOString().slice(0, 10)}-${String(article.slug).toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 40).replace(/-+$/, '')}`;
  fs.mkdirSync(DRAFTS, { recursive: true });
  const used = new Set((article.sourcesUsed || []).filter((n) => res.sources[n]));
  const draft = {
    id, created: now.toISOString(), status: 'pending', topic,
    article: { slug: article.slug, title: article.title, description: article.description, h1: article.h1, shortTitle: article.shortTitle, bodyHtml: article.bodyHtml, imageAlt: article.imageAlt, faq: (article.faq || []).slice(0, 6) },
    sources: (used.size ? [...used].map((n) => res.sources[n]) : res.sources).slice(0, 8),
    photos: [],
    problems: fc.problems || [], words: words(article.bodyHtml),
  };
  photos.forEach((ph, i) => {
    fs.writeFileSync(path.join(DRAFTS, `${id}-${i + 1}.jpg`), ph.buf);
    draft.photos.push({ file: `${id}-${i + 1}.jpg`, width: ph.width, height: ph.height, caption: ph.caption, url: ph.url });
  });
  fs.writeFileSync(path.join(DRAFTS, id + '.json'), JSON.stringify(draft, null, 2) + '\n');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${id}.html`), previewHtml(draft));
  fs.writeFileSync(path.join(OUT, 'agent.json'), JSON.stringify({ toNotify: [id] }));
  console.log(`Черновик ${id}: «${draft.article.h1}», ${draft.words} слов, источников ${draft.sources.length}, правок фактчекера ${draft.problems.length}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'drafted=true\n');
  return draft;
}

async function notify() {
  const tg = require('./telegram');
  const file = path.join(OUT, 'agent.json');
  if (!fs.existsSync(file)) return console.log('Нечего отправлять');
  const owner = String(process.env.TELEGRAM_ALLOWED_IDS || '').split(/[\s,;]+/).filter(Boolean)[0];
  for (const id of JSON.parse(fs.readFileSync(file, 'utf8')).toNotify) {
    const d = JSON.parse(fs.readFileSync(path.join(DRAFTS, id + '.json'), 'utf8'));
    const html = fs.existsSync(path.join(OUT, id + '.html')) ? fs.readFileSync(path.join(OUT, id + '.html')) : Buffer.from(previewHtml(d));
    const photos = (d.photos || []).filter((p) => fs.existsSync(path.join(DRAFTS, p.file)));
    if (photos.length) {
      await tg.sendMediaGroup(owner, photos.map((p, i) => ({ buf: fs.readFileSync(path.join(DRAFTS, p.file)), caption: `Фото ${i + 1}` })));
    }
    const caption = `📝 Статья недели для блога\n\n«${d.article.h1}»\n\nЗапрос: ${d.topic.query}\n${d.words} слов · источников: ${d.sources.length}\n\nОткройте файл и прочитайте статью. ${photos.length ? 'Выберите обложку кнопкой — статья сразу опубликуется.' : 'Фото не подобрались: ответьте на это сообщение своим фото, чтобы опубликовать.'}`.slice(0, 1020);
    // имя файла = id черновика: по нему бот узнаёт статью, если владелец ответит своим фото
    const choose = photos.map((p, i) => ({ text: `✅ Фото ${i + 1}`, callback_data: `agent:p${i + 1}:${id}`.slice(0, 64) }));
    await tg.sendDocument(owner, `${id}.html`, html, caption, {
      inline_keyboard: [...(choose.length ? [choose] : []), [{ text: '🔄 Другую тему', callback_data: `agent:new:${id}`.slice(0, 64) }, { text: '✖️ Не принимаю', callback_data: `agent:rej:${id}`.slice(0, 64) }]],
    });
    console.log('Отправлено владельцу:', id);
  }
  fs.unlinkSync(file);
}

// Подобрать 3 фото к уже готовому черновику и отправить его владельцу заново: node bot/agent.js photos <id>
async function addPhotos(id) {
  const file = path.join(DRAFTS, `${id}.json`);
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { pickPhotos } = require('./photos');
  const photos = await pickPhotos(d.article);
  d.photos = photos.map((ph, i) => {
    fs.writeFileSync(path.join(DRAFTS, `${id}-${i + 1}.jpg`), ph.buf);
    return { file: `${id}-${i + 1}.jpg`, width: ph.width, height: ph.height, caption: ph.caption, url: ph.url };
  });
  fs.writeFileSync(file, JSON.stringify(d, null, 2) + '\n');
  fs.mkdirSync(OUT, { recursive: true });
  const queue = path.join(OUT, 'agent.json');
  const list = fs.existsSync(queue) ? JSON.parse(fs.readFileSync(queue, 'utf8')).toNotify : [];
  fs.writeFileSync(queue, JSON.stringify({ toNotify: [...new Set([...list, id])] }));
  console.log(`${id}: обложек ${d.photos.length}`);
}

if (require.main === module) {
  const mode = process.argv[2];
  (mode === 'notify' ? notify() : mode === 'photos' ? addPhotos(process.argv[3]) : makeDraft()).catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { readDrafts, DRAFTS };
