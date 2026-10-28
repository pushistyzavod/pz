// Авторы статей блога — настоящие сотрудники (подтверждено владельцем 28.10.2026).
// Фото кладём в prototype/images/authors/<id>.jpg; пока фото нет — аватар с инициалами.
const fs = require('fs');
const path = require('path');

const AUTHORS = [
  { id: 'anastasiya-pletneva', name: 'Анастасия Плетнева', role: 'пресс-служба', color: '#ff6099' },
  { id: 'david-turov', name: 'Давид Туров', role: 'журналист', color: '#639aee' },
  { id: 'anton-semenov', name: 'Антон Семенов', role: 'редактор', color: '#8d7ff0' },
];

const PHOTOS = path.join(__dirname, '..', '..', 'prototype', 'images', 'authors');
const withPhoto = (a) => {
  const file = path.join(PHOTOS, `${a.id}.jpg`);
  return { ...a, photo: fs.existsSync(file) ? `/prototype/images/authors/${a.id}.jpg` : null };
};

// Статьи блога, написанные до появления авторов: распределены поровну
const FIXED = {
  'kak-zakazat-igrushki-s-logotipom': 'anastasiya-pletneva', 'tirazh-igrushek-kakoy-vygoden': 'david-turov',
  'sroki-proizvodstva-igrushek': 'anton-semenov', 'pvh-ili-plush-chto-vybrat': 'anastasiya-pletneva',
  'vyshivka-ili-pechat': 'david-turov', 'igrushki-dlya-marketpleysov': 'anton-semenov',
  'promo-igrushki-roi': 'anastasiya-pletneva', 'maskot-dlya-brenda': 'david-turov',
  'korporativny-merch-trendy': 'anton-semenov', 'chestny-znak-igrushki': 'anastasiya-pletneva',
  'uhod-za-plyushevymi-igrushkami': 'david-turov',
};

// Автор статьи: явно заданный, иначе закреплённый за адресом статьи (не меняется между сборками)
function authorFor(slug, id) {
  const fixed = AUTHORS.find((a) => a.id === (id || FIXED[slug]));
  if (fixed) return withPhoto(fixed);
  let h = 0;
  for (const ch of String(slug)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return withPhoto(AUTHORS[h % AUTHORS.length]);
}

const randomAuthorId = () => AUTHORS[Math.floor(Math.random() * AUTHORS.length)].id;

module.exports = { AUTHORS, authorFor, randomAuthorId };
