#!/usr/bin/env node
/**
 * Убирает сгенерированные цены с готовых страниц prototype/ (кроме основных
 * разделов и статей блога): таблицу «Цены и тиражи», суммы в FAQ, описаниях,
 * тексте и разметке Product (AggregateOffer с lowPrice/highPrice).
 * Запуск: node strip-prices.js [--dry]  — с --dry только показывает изменения.
 */
const fs = require('fs');
const path = require('path');
const NP = require('./no-prices');

const PROTO = path.join(__dirname, '..', 'prototype');
const DRY = process.argv.includes('--dry');
// основные разделы сделаны вручную (в «Мягких игрушках» — настоящая таблица цен), статьи — отдельно
const SKIP = (rel) => !rel.includes('/');

const changed = new Map(); // было → стало (для проверки)
const note = (a, b) => { if (a !== b) changed.set(a.trim(), b.trim()); };
const stats = { pages: 0, tables: 0, faq: 0, product: 0, meta: 0, text: 0 };

function fixJsonLd(json) {
  const o = JSON.parse(json);
  if (o['@type'] === 'Product') return null; // цены в AggregateOffer — блок убираем целиком
  if (o['@type'] === 'FAQPage') {
    o.mainEntity.forEach((q) => {
      const a = q.acceptedAnswer.text; const b = NP.faqAnswer(q.name, a);
      if (a !== b) { q.acceptedAnswer.text = b; }
    });
  }
  if (typeof o.description === 'string') o.description = NP.stripPriceSentences(o.description);
  return JSON.stringify(o);
}

// Убирает сгенерированные цены из готового HTML страницы
function stripHtml(html) {
  // 1. Таблица «Цены и тиражи»
  html = html.replace(/(<section id="prices"><div class="container">\s*<h2>[^<]*<\/h2>\s*)<p class="lead">[^<]*<\/p>\s*<table class="price-tbl">[\s\S]*?<\/table>/, (m, head) => {
    stats.tables++;
    return `${head}<p class="lead">${NP.PRICE_LEAD}</p>\n  ${NP.PRICE_CTA}`;
  });

  // 1б. Строки таблиц с суммами (таблицы цен в статьях); пустые таблицы и подписи к ним убираем
  html = html.replace(/<tr>(?:(?!<\/tr>)[\s\S])*?<\/tr>/g, (row) => {
    const text = row.replace(/<[^>]+>/g, ' ');
    if (!NP.hasPrice(text) || /<th/.test(row)) return row;
    stats.text++; note(text, '(строка таблицы удалена)');
    return '';
  });
  html = html.replace(/(?:<p>[^<]*:\s*<\/p>\s*)?<table[^>]*>\s*(?:<thead>)?\s*<tr>(?:(?!<\/tr>)[\s\S])*?<\/tr>\s*(?:<\/thead>)?\s*(?:<tbody>\s*<\/tbody>)?\s*<\/table>/g, (m) => { note(m.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), '(пустая таблица удалена)'); return ''; });

  // 1в. Подсказки в полях формы: пример бюджета клиенты принимают за нашу цену
  html = html.replace(/(placeholder="[^"]*?),\s*(?:бюджет\s*)?(?:до\s*)?\d[\d\s]*\s?₽\/шт(")/g, (m, a, b) => { stats.text++; note(m, a + b); return a + b; });

  // 2. FAQ на странице
  html = html.replace(/<details><summary>([^<]*)<\/summary><div class="a">([^<]*)<\/div><\/details>/g, (m, q, a) => {
    const b = NP.faqAnswer(q, a);
    if (b === a) return m;
    stats.faq++; note(a, b);
    return `<details><summary>${q}</summary><div class="a">${b}</div></details>`;
  });

  // 3. Разметка JSON-LD
  html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>\n?/g, (m, json) => {
    const fixed = fixJsonLd(json);
    if (fixed === null) { stats.product++; return ''; }
    return fixed === json ? m : m.replace(json, fixed);
  });

  // 4. Описания для поисковиков и соцсетей
  html = html.replace(/(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")([^"]*)(")/g, (m, a, text, c) => {
    const b = NP.stripPriceSentences(text);
    if (b !== text) { stats.meta++; note(text, b); }
    return a + b + c;
  });

  // 5. Остальной текст страницы (кроме подсказок в полях формы — там пример бюджета клиента)
  const [head, ...rest] = html.split('</head>');
  let body = rest.join('</head>');
  body = body.replace(/>([^<>]*)</g, (m, text) => {
    if (!NP.hasPrice(text)) return m;
    // про образец сгенерированы и цена, и условия («вычитается», «бесплатен») — заменяем целиком
    const b = /^\s*Стоимость образца/.test(text) ? NP.SAMPLE_ANSWER : NP.stripPriceSentences(text);
    if (b === text) return m;
    stats.text++; note(text, b);
    return '>' + (b ? ' ' + b : '') + '<';
  });
  html = head + '</head>' + body;

  return html;
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    if (!e.name.endsWith('.html')) continue;
    const rel = path.relative(PROTO, full);
    if (SKIP(rel)) continue;
    const orig = fs.readFileSync(full, 'utf8');
    let html = orig;
    html = stripHtml(html);
    if (html !== orig) {
      stats.pages++;
      if (!DRY) fs.writeFileSync(full, html, 'utf8');
    }
  }
}

if (require.main === module) {
  walk(PROTO);
  console.log((DRY ? '[проверка] ' : '') + 'Страниц изменено: ' + stats.pages, stats);
  if (process.argv.includes('--show')) for (const [a, b] of changed) console.log('\n— БЫЛО: ' + a + '\n  СТАЛО: ' + (b || '(удалено)'));
}

module.exports = { stripHtml };
