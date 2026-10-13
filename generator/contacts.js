#!/usr/bin/env node
/**
 * Страница «Контакты» → prototype/kontakty/index.html
 * Все данные берутся из data/config.js (COMPANY). Точные адреса офиса и фабрики
 * и режим работы пока не указаны — когда появятся, добавьте их в COMPANY и сюда.
 */
const fs = require('fs');
const path = require('path');
const C = require('./data/config');
const T = require('./template');

const OUT = path.join(__dirname, '..', 'prototype', 'kontakty');
const co = C.COMPANY;

const page = {
  url: '/kontakty/',
  title: 'Контакты фабрики «Пушистый Завод» — телефон, почта, реквизиты',
  desc: 'Контакты фабрики мягких игрушек и сувениров «Пушистый Завод»: телефон, почта, мессенджеры, реквизиты. Офис продаж в Москве, производство в Улан-Удэ.',
  image: '/prototype/images/hero-main.webp',
  formName: 'Заявка: страница «Контакты»',
  formHint: 'маскот 25 см с логотипом, тираж 1000 шт',
};
const crumbs = [{ url: '/', label: 'Главная' }, { label: 'Контакты' }];

const contactPage = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: page.title,
  url: C.SITE + page.url,
  mainEntity: { '@id': C.SITE + '/#org' },
};

const body = `
<h2>Как с нами связаться</h2>
<ul>
  <li><strong>Телефон:</strong> <a href="tel:${co.phoneTel}">${co.phone}</a></li>
  <li><strong>Почта:</strong> <a href="mailto:${co.email}">${co.email}</a></li>
  <li><strong>Telegram:</strong> <a href="${co.tg}" target="_blank" rel="noopener">написать в Telegram</a></li>
  <li><strong>MAX:</strong> <a href="${co.max}" target="_blank" rel="noopener">написать в MAX</a></li>
  <li><strong>ВКонтакте:</strong> <a href="${co.vk}" target="_blank" rel="noopener">vk.com/pushistyzavod</a></li>
</ul>
<p>На заявки и письма отвечаем в течение рабочего дня. Расчёт стоимости и сроков присылаем за один рабочий день.</p>

<h2>Где мы находимся</h2>
<ul>
  <li><strong>Офис продаж:</strong> Москва</li>
  <li><strong>Производство:</strong> ${co.factory}</li>
</ul>
<p>Готовые партии отправляем по России и в страны СНГ. Как устроена фабрика и что на ней делают — на странице <a href="/production.html">«Производство»</a>, примеры готовых изделий с тиражами — в разделе <a href="/works.html">«Наши работы»</a>.</p>

<h2>Реквизиты</h2>
<table>
  <tr><th>Наименование</th><td>${co.legal}</td></tr>
  <tr><th>ИНН</th><td>${co.inn}</td></tr>
  <tr><th>ОГРНИП</th><td>${co.ogrnip}</td></tr>
</table>
<p>Работаем с юридическими лицами по договору, оплата по безналичному расчёту.</p>

<h2>Что прислать для расчёта</h2>
<ul>
  <li>что нужно изготовить: игрушка, маскот, ПВХ-фигурка, брелок или другое изделие;</li>
  <li>тираж и желаемый срок;</li>
  <li>логотип, эскиз или фото персонажа, если они уже есть.</li>
</ul>
<p>Если эскиза нет, достаточно описать задачу словами — макет нарисуем сами.</p>
`;

const html = T.head(page, [T.jsonldOrganization(), T.jsonldBreadcrumb(crumbs), contactPage])
  + T.breadcrumbs(crumbs)
  + `<section class="hero" style="padding-bottom:20px"><div class="container">
  <div>
    <span class="eyebrow">Контакты</span>
    <h1 style="font-size:36px">Контакты <span>фабрики «Пушистый Завод»</span></h1>
  </div>
</div></section>`
  + `<section style="padding-top:26px"><div class="container"><div class="article">${body}</div></div></section>`
  + T.ctaBlock(page)
  + `<script src="/prototype/js/site.js?v=${T.ASSET_VERSION}" defer></script>\n</body>\n</html>\n`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');
console.log('✅ Контакты: prototype/kontakty/index.html');
