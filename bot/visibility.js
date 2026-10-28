// Агент-разведчик: раз в неделю задаёт нейросети (Gemini + поиск Google) вопросы,
// которые задают заказчики, и смотрит, на каком месте в ответе «Пушистый Завод»
// и кто стоит выше. История — bot/visibility.json, отчёт — владельцу в Telegram.
// Запуск: node bot/visibility.js         — проверить и сохранить
//         node bot/visibility.js notify  — отправить отчёт по последней проверке
const fs = require('fs');
const path = require('path');
const { ask } = require('./gemini');

const HISTORY = path.join(__dirname, 'visibility.json');
const US = /пушист|pushisty/i;

const QUERIES = [
  'Где заказать мягкие игрушки с логотипом компании?',
  'Посоветуй производителя корпоративных маскотов в России',
  'Какая фабрика шьёт мягкие игрушки на заказ оптом от 100 штук?',
  'Лучшие производители мягких игрушек на заказ для бизнеса в России',
  'Где заказать ПВХ-фигурки с логотипом?',
  'Кто делает игрушки-талисманы для мероприятий и фестивалей?',
  'Где заказать корпоративные подарки — мягкие игрушки с логотипом к Новому году?',
  'Фабрика мягких игрушек в Москве для корпоративных заказов',
];

// Место компании в ответе: номер пункта списка, где она упомянута (0 — нет в ответе)
function rankIn(text) {
  const items = text.split('\n').filter((l) => /^\s*(?:\*\*)?\d+[.)]/.test(l));
  const i = items.findIndex((l) => US.test(l));
  if (i >= 0) return { rank: i + 1, total: items.length };
  return { rank: US.test(text) ? -1 : 0, total: items.length }; // -1 — упомянута, но не в списке
}

// Названия компаний из пунктов списка: «1. **Рыжая Корова** — …» → «Рыжая Корова»
function names(text) {
  return text.split('\n').filter((l) => /^\s*(?:\*\*)?\d+[.)]/.test(l)).map((l) => l
    .replace(/^\s*(?:\*\*)?\d+[.)]\s*/, '').replace(/\*\*/g, '').split(/\s[—–-]\s|:|\(/)[0].trim().slice(0, 50));
}

async function check() {
  const results = [];
  for (const q of QUERIES) {
    try {
      const { text } = await ask({
        search: true,
        fast: true,
        system: 'Ты — ИИ-ассистент, который помогает пользователю. Отвечай как обычно отвечаешь людям.',
        prompt: `${q}\n\nПорекомендуй конкретные компании нумерованным списком (до 10 пунктов): название, сайт и почему её стоит рассмотреть.`,
        maxTokens: 4000,
      });
      results.push({ q, ...rankIn(text), top: names(text).slice(0, 5) });
    } catch (e) {
      results.push({ q, error: e.message });
    }
  }
  const history = fs.existsSync(HISTORY) ? JSON.parse(fs.readFileSync(HISTORY, 'utf8')) : [];
  history.push({ date: new Date().toISOString().slice(0, 10), results });
  fs.writeFileSync(HISTORY, JSON.stringify(history.slice(-26), null, 2) + '\n');
  return history;
}

const place = (r) => (r.error ? 'ошибка' : r.rank > 0 ? `${r.rank} место` : r.rank < 0 ? 'упомянуты' : 'нет');

function report(history) {
  const [prev, last] = history.slice(-2).length === 2 ? history.slice(-2) : [null, history[history.length - 1]];
  const lines = last.results.map((r) => {
    const before = prev && prev.results.find((p) => p.q === r.q);
    let delta = '';
    if (before && before.rank > 0 && r.rank > 0 && before.rank !== r.rank) delta = before.rank > r.rank ? ` ⬆️ было ${before.rank}` : ` ⬇️ было ${before.rank}`;
    else if (before && before.rank <= 0 && r.rank > 0) delta = ' 🆕';
    const leader = r.top && r.top[0] && r.rank !== 1 ? `\n   первые: ${r.top.slice(0, 3).join(', ')}` : '';
    return `${r.rank === 1 ? '🥇' : r.rank > 0 && r.rank <= 3 ? '✅' : r.rank > 0 ? '🟡' : '❌'} ${r.q}\n   → ${place(r)}${delta}${leader}`;
  });
  const ok = last.results.filter((r) => r.rank > 0);
  const avg = ok.length ? (ok.reduce((s, r) => s + r.rank, 0) / ok.length).toFixed(1) : '—';
  const rivals = {};
  last.results.forEach((r) => (r.top || []).forEach((n) => { if (!US.test(n)) rivals[n] = (rivals[n] || 0) + 1; }));
  const topRivals = Object.entries(rivals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, c]) => `${n} (${c})`).join(', ');
  return `🔎 Видимость в нейросетях — ${last.date}\n\nВ ответе: ${ok.length} из ${last.results.length} вопросов · среднее место: ${avg}\n\n${lines.join('\n\n')}\n\nЧаще всего советуют: ${topRivals || '—'}\n\nПроверка через Gemini с поиском Google; ChatGPT и Алиса отвечают похоже, но не один в один.`.slice(0, 4000);
}

async function main() {
  if (process.argv[2] === 'notify') {
    const owner = String(process.env.TELEGRAM_ALLOWED_IDS || '').split(/[\s,;]+/).filter(Boolean)[0];
    const history = JSON.parse(fs.readFileSync(HISTORY, 'utf8'));
    await require('./telegram').sendMessage(owner, report(history));
    return;
  }
  const history = await check();
  console.log(report(history));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });

module.exports = { QUERIES, check, report };
