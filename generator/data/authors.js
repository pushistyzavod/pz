// Авторы статей блога — настоящие сотрудники (состав обновлён владельцем 28.10.2026).
// Фото кладём в prototype/images/authors/<id>.jpg; пока фото нет — аватар с инициалами.
const fs = require('fs');
const path = require('path');

const AUTHORS = [
  { id: 'yuliya-aberova', name: 'Юлия Аберова', role: 'модератор', color: '#ff6099' },
  { id: 'vasiliy-korenev', name: 'Василий Коренев', role: 'журналист', color: '#639aee' },
];

const PHOTOS = path.join(__dirname, '..', '..', 'prototype', 'images', 'authors');
const withPhoto = (a) => {
  const file = path.join(PHOTOS, `${a.id}.jpg`);
  return { ...a, photo: fs.existsSync(file) ? `/prototype/images/authors/${a.id}.jpg` : null };
};

// Статьи блога, написанные до появления авторов: авторы чередуются по дате
const FIXED = {
  'kak-zakazat-igrushki-s-logotipom': 'yuliya-aberova', 'tirazh-igrushek-kakoy-vygoden': 'vasiliy-korenev',
  'sroki-proizvodstva-igrushek': 'yuliya-aberova', 'pvh-ili-plush-chto-vybrat': 'vasiliy-korenev',
  'vyshivka-ili-pechat': 'yuliya-aberova', 'igrushki-dlya-marketpleysov': 'vasiliy-korenev',
  'promo-igrushki-roi': 'yuliya-aberova', 'maskot-dlya-brenda': 'vasiliy-korenev',
  'korporativny-merch-trendy': 'yuliya-aberova', 'chestny-znak-igrushki': 'vasiliy-korenev',
  'uhod-za-plyushevymi-igrushkami': 'yuliya-aberova',
};

// Автор статьи: явно заданный, иначе закреплённый за адресом статьи (не меняется между сборками)
function authorFor(slug, id) {
  const fixed = AUTHORS.find((a) => a.id === (id || FIXED[slug]));
  if (fixed) return withPhoto(fixed);
  let h = 0;
  for (const ch of String(slug)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return withPhoto(AUTHORS[h % AUTHORS.length]);
}

// Автор следующей публикации: по очереди — не тот, кто написал последнюю (posts — новые сверху)
function nextAuthorId(posts) {
  const last = posts.length ? authorFor(posts[0].slug, posts[0].author).id : null;
  const i = AUTHORS.findIndex((a) => a.id === last);
  return AUTHORS[(i + 1) % AUTHORS.length].id;
}

module.exports = { AUTHORS, authorFor, nextAuthorId };
