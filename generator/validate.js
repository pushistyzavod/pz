#!/usr/bin/env node
// Финальная валидация сгенерированных страниц: мета, H1, canonical, JSON-LD, изображения
const fs = require('fs');
const path = require('path');
const PROTO = path.join(__dirname, '..', 'prototype');

const pages = [];
(function walk(d) {
  fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const f = path.join(d, e.name);
    if (e.isDirectory() && !['images', 'img', 'css', 'js'].includes(e.name)) walk(f);
    else if (e.name === 'index.html' && d !== PROTO) pages.push(f);
  });
})(PROTO);

const titles = new Set();
const descs = new Set();
const missing = new Set();
const errors = [];

pages.forEach((f) => {
  const html = fs.readFileSync(f, 'utf8');
  const rel = path.relative(PROTO, f);
  const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  const d = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  const h1count = (html.match(/<h1[\s>]/g) || []).length;
  const can = (html.match(/rel="canonical" href="([^"]*)"/) || [])[1];
  if (!t) errors.push(rel + ': нет title'); else titles.add(t);
  if (!d) errors.push(rel + ': нет description'); else descs.add(d);
  if (h1count !== 1) errors.push(rel + ': H1 x' + h1count);
  if (!can) errors.push(rel + ': нет canonical');
  if (!html.includes('application/ld+json')) errors.push(rel + ': нет JSON-LD');
  (html.match(/src="(\/prototype\/images\/[^"]+)"/g) || []).forEach((m) => {
    const p = m.replace(/^src="/, '').replace(/"$/, '');
    const local = p.replace(/^\/prototype\//, '');
    if (!fs.existsSync(path.join(PROTO, local))) missing.add(p);
  });
});

console.log('Страниц:', pages.length, '| уник. title:', titles.size, '| уник. desc:', descs.size);
if (missing.size) { console.log('Отсутствующих изображений:', missing.size); [...missing].slice(0, 20).forEach((e) => console.log(' -', e)); }
else console.log('Изображения: все существуют');
if (errors.length) { console.log('ОШИБКИ (' + errors.length + '):'); [...new Set(errors)].slice(0, 40).forEach((e) => console.log(' -', e)); }
else console.log('Мета/H1/canonical/JSON-LD: все валидны');
