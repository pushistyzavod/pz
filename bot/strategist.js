// Агент-стратег: раз в неделю смотрит замеры разведчика (bot/visibility.json), изучает,
// за счёт чего нейросети и поиск советуют конкурентов, и придумывает план на неделю:
// — темы статей, которые SEO-агент напишет сам (bot/strategy.json → agent.js);
// — задачи для владельца вне сайта (отзывы, каталоги, СМИ) с конкретными шагами.
// Только честные способы: без накрутки отзывов, спама и покупных ссылок —
// за них Яндекс и Google понижают сайт, а нейросети перестают ему доверять.
// Запуск: node bot/strategist.js         — составить план
//         node bot/strategist.js notify  — отправить план владельцу
const fs = require('fs');
const path = require('path');
const { ask, parseJson } = require('./gemini');

const FILE = path.join(__dirname, 'strategy.json');
const HISTORY = path.join(__dirname, 'visibility.json');

function visibilitySummary() {
  if (!fs.existsSync(HISTORY)) return 'Замеров ещё нет.';
  const history = JSON.parse(fs.readFileSync(HISTORY, 'utf8'));
  return history.slice(-3).map((h) => `${h.date}:\n${h.results.map((r) => `- ${r.q} → ${r.error ? 'ошибка' : r.rank > 0 ? r.rank + ' место' : 'нет в списке'}; советуют: ${(r.top || []).slice(0, 3).join(', ')}`).join('\n')}`).join('\n\n');
}

function siteSummary() {
  Object.keys(require.cache).filter((k) => k.includes(`${path.sep}generator${path.sep}`)).forEach((k) => delete require.cache[k]);
  const articles = require('../generator/data/articles');
  return articles.slice(0, 30).map((a) => `- ${a.h1plain || a.title}`).join('\n');
}

async function plan() {
  const previous = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : null;
  const system = 'Ты — стратег по продвижению B2B-сайта в Яндексе, Google и в ответах нейросетей (ChatGPT, Алиса, Gemini, Perplexity). Предлагаешь только честные методы: полезный контент, реальные отзывы клиентов, профили в каталогах, публикации в СМИ, партнёрства. Никакой накрутки, фейковых отзывов, спама и покупки ссылок.';
  const research = await ask({
    system,
    search: true,
    maxTokens: 6000,
    prompt: `Сайт: pushistyzavod.ru — фабрика «Пушистый Завод»: мягкие игрушки, маскоты, ПВХ-фигурки с логотипом для бизнеса, тираж от 100 шт, производство в Москве, Иваново, Улан-Удэ.

Замеры: на каком месте нейросеть советует нас по вопросам заказчиков:
${visibilitySummary()}

Найди в интернете, за счёт чего чаще советуют конкурентов (Играмир, Мякиши, Мария, Mimis, PlastIcon и других из замеров): где о них пишут — рейтинги и подборки, каталоги производителей, отзовики, карты, СМИ, маркетплейсы, vc.ru, отраслевые порталы. Для каждой площадки дай адрес. Отдельно: каких вопросов и тем заказчиков нет у нас на сайте, но они есть у конкурентов.`,
  });

  const { text } = await ask({
    system,
    fast: true,
    maxTokens: 6000,
    schema: {
      type: 'OBJECT',
      properties: {
        summary: { type: 'STRING', description: '2–3 предложения: что изменилось и главный вывод недели' },
        articleTopics: { type: 'ARRAY', items: { type: 'STRING' }, description: '3 темы статей для блога под слабые вопросы — не повторяют уже написанные' },
        ownerTasks: {
          type: 'ARRAY',
          items: { type: 'OBJECT', properties: { task: { type: 'STRING' }, why: { type: 'STRING' }, how: { type: 'STRING', description: 'конкретные шаги и ссылка на площадку' }, minutes: { type: 'INTEGER' } }, required: ['task', 'why', 'how', 'minutes'] },
          description: '3 задачи для владельца вне сайта на эту неделю, самые полезные первыми',
        },
      },
      required: ['summary', 'articleTopics', 'ownerTasks'],
    },
    prompt: `Исследование площадок и конкурентов:
${research.text}

Замеры видимости:
${visibilitySummary()}

Уже есть статьи на сайте:
${siteSummary()}

${previous ? `Задачи прошлой недели (не повторяй их дословно, предложи следующий шаг): ${previous.ownerTasks.map((t) => t.task).join('; ')}` : ''}

Составь план на неделю. Задачи владельцу — только реальные и выполнимые за 15–60 минут: заполнить профиль в каталоге, попросить отзыв у конкретного типа клиента, отправить кейс в конкретное издание и т.п.`,
  });
  const result = { date: new Date().toISOString().slice(0, 10), ...parseJson(text) };
  fs.writeFileSync(FILE, JSON.stringify(result, null, 2) + '\n');
  return result;
}

function message(s) {
  return `🧭 План продвижения на неделю — ${s.date}

${s.summary}

📌 Ваши задачи (вне сайта):
${s.ownerTasks.map((t, i) => `${i + 1}. ${t.task} (~${t.minutes} мин)\n   Зачем: ${t.why}\n   Как: ${t.how}`).join('\n\n')}

✍️ Статьи, которые агент напишет сам в ближайшие недели:
${s.articleTopics.map((t) => `• ${t}`).join('\n')}`.slice(0, 4000);
}

async function main() {
  if (process.argv[2] === 'notify') {
    const owner = String(process.env.TELEGRAM_ALLOWED_IDS || '').split(/[\s,;]+/).filter(Boolean)[0];
    await require('./telegram').sendMessage(owner, message(JSON.parse(fs.readFileSync(FILE, 'utf8'))));
    return;
  }
  console.log(message(await plan()));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });

module.exports = { plan, FILE };
