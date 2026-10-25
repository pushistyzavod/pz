#!/usr/bin/env node
// Забирает новые сообщения из Telegram и готовит публикации.
// Ответы владельцу и подтверждение сообщений отправляет ack.js — уже после того,
// как изменения сайта сохранены в git. Если до этого что-то упадёт, сообщения
// останутся в очереди Telegram и будут обработаны следующим запуском.
const fs = require('fs');
const path = require('path');
const tg = require('./telegram');
const site = require('./publish');

const OUT = path.join(__dirname, '.out');
const MAX_POSTS_PER_RUN = 5;

const allowed = new Set(
  String(process.env.TELEGRAM_ALLOWED_IDS || '').split(/[\s,;]+/).filter(Boolean)
);

const HELP = `Я публикую новости на сайте pushistyzavod.ru.

Пришлите одно фото с подписью: о чём новость, в свободной форме. Чем больше фактов в подписи (что за изделие, для кого, тираж, сроки), тем точнее текст — цифры и названия я беру только из неё.

Я напишу уникальный текст, размещу его с фото в разделе «Новости» и сообщу поисковикам о новой странице. Новость появляется на сайте через несколько минут.

Команды:
/list — новости, опубликованные через бота
/delete адрес-новости — удалить новость
/agent — SEO-агент прямо сейчас подготовит статью и пришлёт на одобрение (обычно приходит по понедельникам)

Статьи агента: он присылает черновик файлом. Чтобы опубликовать — ответьте на это сообщение фотографией для обложки.`;

async function handle(message, updateId, state) {
  const text = (message.caption || message.text || '').trim();
  const command = text.split(/\s+/)[0].toLowerCase().replace(/@.*$/, '');

  if (command === '/start' || command === '/help') return HELP;

  if (command === '/list') {
    const posts = site.readPosts();
    if (!posts.length) return 'Через бота пока ничего не опубликовано.';
    return posts.slice(0, 20).map((p) => `${p.dateHuman} — ${p.h1plain}\n${site.SITE}/news/${p.slug}/\nудалить: /delete ${p.slug}`).join('\n\n');
  }

  if (command === '/agent') {
    state.runAgent = true;
    return 'Готовлю статью: выбираю тему, ищу факты, пишу и проверяю. Пришлю черновик на одобрение через 10–20 минут.';
  }

  if (command === '/delete') {
    const slug = (text.split(/\s+/)[1] || '').replace(/^.*\/news\//, '').replace(/\/+$/, '');
    if (!slug) return 'Укажите адрес новости: /delete adres-novosti. Список — команда /list.';
    if (!site.unpublish(slug)) return `Новость «${slug}» не найдена среди опубликованных через бота. Список — /list.`;
    state.changed = true;
    return `Новость «${slug}» удалена. С сайта она исчезнет через несколько минут.`;
  }

  if (!message.photo) return 'Пришлите фото с подписью — о чём новость. Подробнее: /help';

  // Фото ответом на черновик статьи SEO-агента — обложка и одобрение публикации
  const draftFile = draftForPhoto(message, text);
  if (draftFile) return publishDraft(draftFile, message, updateId, state);
  if (text.length < 10) return 'Добавьте к фото подпись: о чём новость, хотя бы одним предложением. Если это фото для статьи агента — ответьте им на сообщение с черновиком.';

  // Тот же update уже опубликован (прошлый запуск упал после публикации) — не дублируем
  const already = site.readPosts().find((p) => p.updateId === updateId);
  if (already) return `Новость опубликована: ${site.SITE}/news/${already.slug}/`;

  if (state.published >= MAX_POSTS_PER_RUN) {
    return `За один раз публикую не больше ${MAX_POSTS_PER_RUN} новостей. Пришлите эту ещё раз через несколько минут.`;
  }

  const { writeArticle, explainError } = require('./writer');
  const size = message.photo[message.photo.length - 1]; // самый крупный вариант
  const photo = await tg.downloadFile(size.file_id);

  let article;
  try {
    article = await writeArticle({ note: text, photo, pages: site.sitePages() });
  } catch (err) {
    return `Не получилось написать текст: ${explainError(err)}.`;
  }

  const result = site.publish({ article, photo, photoSize: size, updateId });
  state.changed = true;
  state.published += 1;
  state.urls.push(result.url);
  return `Готово: «${result.title}»\n\n${result.url}\n\nСтраница появится на сайте через несколько минут. Удалить: /delete ${result.slug}`;
}

// Черновик SEO-агента, к которому прислано фото: ответ на сообщение с файлом <id>.html,
// либо фото с подписью «опубликовать / ок / да», когда черновик в ожидании ровно один
function draftForPhoto(message, text) {
  const dir = path.join(__dirname, 'drafts');
  const reply = message.reply_to_message;
  const fname = reply && reply.document && reply.document.file_name;
  if (fname && /\.html$/.test(fname)) {
    const file = path.join(dir, fname.replace(/\.html$/, '.json'));
    if (fs.existsSync(file)) return file;
  }
  if (/^(опублик|публикуй|одобр|ок\b|ok\b|да\b|\+)/i.test(text) && fs.existsSync(dir)) {
    const pending = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
      .filter((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).status === 'pending');
    if (pending.length === 1) return path.join(dir, pending[0]);
  }
  return null;
}

async function publishDraft(file, message, updateId, state) {
  const draft = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (draft.status === 'published') return `Эта статья уже опубликована: ${site.SITE}/news/${draft.slug}/`;
  if (draft.status !== 'pending') return 'Этот черновик уже отклонён. Наберите /agent, чтобы получить новую статью.';
  // прошлый запуск мог упасть после публикации — не публикуем дважды
  const already = site.readPosts().find((p) => p.updateId === `agent-${draft.id}`);
  if (already) return `Статья опубликована: ${site.SITE}/news/${already.slug}/`;
  const size = message.photo[message.photo.length - 1];
  const photo = await tg.downloadFile(size.file_id);
  const result = site.publish({
    article: draft.article, photo, photoSize: size, updateId: `agent-${draft.id}`,
    category: 'Статьи', sources: draft.sources,
  });
  fs.writeFileSync(file, JSON.stringify({ ...draft, status: 'published', slug: result.slug, decidedAt: new Date().toISOString() }, null, 2) + '\n');
  state.changed = true;
  state.drafts = true;
  state.published += 1;
  state.urls.push(result.url);
  return `Статья опубликована с вашим фото: «${result.title}»\n\n${result.url}\n\nСтраница появится на сайте через несколько минут, Яндекс получит уведомление. Удалить: /delete ${result.slug}`;
}

// Кнопки под черновиком SEO-агента: agent:new|rej:<id>
async function handleAgentButton(cb, state) {
  const [, action, id] = String(cb.data || '').split(':');
  const file = path.join(__dirname, 'drafts', `${id}.json`);
  if (!id || !fs.existsSync(file)) return 'Черновик не найден — возможно, он уже обработан.';
  const draft = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (draft.status !== 'pending') {
    return draft.status === 'published' ? `Эта статья уже опубликована: ${site.SITE}/news/${draft.slug}/` : 'Этот черновик уже обработан.';
  }
  const save = (status, extra) => fs.writeFileSync(file, JSON.stringify({ ...draft, ...extra, status, decidedAt: new Date().toISOString() }, null, 2) + '\n');

  if (action === 'new') {
    save('rejected', { reason: 'другая тема' });
    state.drafts = true;
    state.runAgent = true;
    return 'Хорошо, беру другую тему. Новый черновик пришлю через 10–20 минут.';
  }
  save('rejected', { reason: 'отклонено' });
  state.drafts = true;
  return 'Черновик отклонён. Следующая статья придёт в понедельник, или наберите /agent, чтобы получить новую сейчас.';
}

async function main() {
  const state = { changed: false, published: 0, urls: [], replies: [], callbacks: [], offset: null, runAgent: false, drafts: false };
  const updates = await tg.getUpdates();

  for (const update of updates) {
    state.offset = update.update_id + 1;
    const cb = update.callback_query;
    if (cb) {
      let reply;
      if (!allowed.has(String(cb.from.id)) || !/^agent:/.test(cb.data || '')) reply = 'Доступ закрыт.';
      else {
        try { reply = await handleAgentButton(cb, state); } catch (err) { console.error(err); reply = `Ошибка: ${err.message}`; }
      }
      state.callbacks.push({ id: cb.id, chatId: cb.message && cb.message.chat.id, messageId: cb.message && cb.message.message_id });
      if (cb.message) state.replies.push({ chatId: cb.message.chat.id, text: reply });
      continue;
    }
    const message = update.message;
    if (!message || !message.from || message.chat.type !== 'private') continue;

    const userId = String(message.from.id);
    let reply;
    if (!allowed.has(userId)) {
      // Публиковать может только владелец. Свой ID он узнаёт из этого ответа.
      reply = `Доступ закрыт. Ваш Telegram ID: ${userId}\n\nЕсли вы владелец сайта, добавьте этот ID в TELEGRAM_ALLOWED_IDS в файле /opt/pz-bot/.env на сервере.`;
    } else {
      try {
        reply = await handle(message, update.update_id, state);
      } catch (err) {
        console.error(err);
        reply = `Ошибка: ${err.message}`;
      }
    }
    state.replies.push({ chatId: message.chat.id, text: reply });
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'state.json'), JSON.stringify(state, null, 2));

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${state.changed}\nurls=${state.urls.join(' ')}\nagent=${state.runAgent}\ndrafts=${state.drafts}\n`);
  }
  console.log(`Сообщений: ${updates.length}, опубликовано: ${state.published}, изменения на сайте: ${state.changed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
