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
/delete адрес-новости — удалить новость`;

async function handle(message, updateId, state) {
  const text = (message.caption || message.text || '').trim();
  const command = text.split(/\s+/)[0].toLowerCase().replace(/@.*$/, '');

  if (command === '/start' || command === '/help') return HELP;

  if (command === '/list') {
    const posts = site.readPosts();
    if (!posts.length) return 'Через бота пока ничего не опубликовано.';
    return posts.slice(0, 20).map((p) => `${p.dateHuman} — ${p.h1plain}\n${site.SITE}/news/${p.slug}/\nудалить: /delete ${p.slug}`).join('\n\n');
  }

  if (command === '/delete') {
    const slug = (text.split(/\s+/)[1] || '').replace(/^.*\/news\//, '').replace(/\/+$/, '');
    if (!slug) return 'Укажите адрес новости: /delete adres-novosti. Список — команда /list.';
    if (!site.unpublish(slug)) return `Новость «${slug}» не найдена среди опубликованных через бота. Список — /list.`;
    state.changed = true;
    return `Новость «${slug}» удалена. С сайта она исчезнет через несколько минут.`;
  }

  if (!message.photo) return 'Пришлите фото с подписью — о чём новость. Подробнее: /help';
  if (text.length < 10) return 'Добавьте к фото подпись: о чём новость, хотя бы одним предложением.';

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

async function main() {
  const state = { changed: false, published: 0, urls: [], replies: [], offset: null };
  const updates = await tg.getUpdates();

  for (const update of updates) {
    state.offset = update.update_id + 1;
    const message = update.message;
    if (!message || !message.from || message.chat.type !== 'private') continue;

    const userId = String(message.from.id);
    let reply;
    if (!allowed.has(userId)) {
      // Публиковать может только владелец. Свой ID он узнаёт из этого ответа.
      reply = `Доступ закрыт. Ваш Telegram ID: ${userId}\n\nЕсли вы владелец сайта, добавьте этот ID в секрет TELEGRAM_ALLOWED_IDS в настройках репозитория на GitHub.`;
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
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${state.changed}\nurls=${state.urls.join(' ')}\n`);
  }
  console.log(`Сообщений: ${updates.length}, опубликовано: ${state.published}, изменения на сайте: ${state.changed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
