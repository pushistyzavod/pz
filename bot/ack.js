#!/usr/bin/env node
// Отправляет ответы владельцу и подтверждает обработанные сообщения в Telegram.
// Запускается после poll.js и после сохранения изменений сайта в git.
const fs = require('fs');
const path = require('path');
const tg = require('./telegram');

async function main() {
  const file = path.join(__dirname, '.out', 'state.json');
  if (!fs.existsSync(file)) return;
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));

  for (const reply of state.replies) {
    try {
      await tg.sendMessage(reply.chatId, reply.text.slice(0, 4000));
    } catch (err) {
      console.error('Не удалось отправить ответ:', err.message);
    }
  }
  if (state.offset) await tg.confirmUpdates(state.offset);
  console.log(`Ответов отправлено: ${state.replies.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
