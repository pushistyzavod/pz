// Автопубликация статей SEO-агента: если владелец не выбрал обложку за 2 дня,
// статья выходит с фото 1, а владельцу приходит ссылка (удалить — /delete <адрес>).
// Так статьи появляются каждую неделю, даже если кнопки остались без ответа.
// node bot/autopublish.js due — сколько черновиков пора публиковать (для проверки в GitHub)
const fs = require('fs');
const path = require('path');

const DRAFTS = path.join(__dirname, 'drafts');
const WAIT_DAYS = 2;

// Черновики в ожидании дольше WAIT_DAYS (дата — в начале id: 2026-11-16-…) и с готовыми обложками
function dueDrafts(now = new Date()) {
  if (!fs.existsSync(DRAFTS)) return [];
  return fs.readdirSync(DRAFTS).filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.json$/.test(f)).map((f) => {
    const d = JSON.parse(fs.readFileSync(path.join(DRAFTS, f), 'utf8'));
    return { ...d, id: d.id || f.replace(/\.json$/, '') };
  }).filter((d) => d.status === 'pending'
    && (d.photos || []).some((p) => fs.existsSync(path.join(DRAFTS, p.file)))
    && (now - new Date(d.id.slice(0, 10))) / 864e5 >= WAIT_DAYS)
    .sort((a, b) => a.id.localeCompare(b.id));
}

if (require.main === module && process.argv[2] === 'due') console.log(dueDrafts().length);

module.exports = { dueDrafts, WAIT_DAYS };
