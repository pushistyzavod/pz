// Минимальный клиент Telegram Bot API (без зависимостей, fetch из Node 22)
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

async function call(method, params) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description || res.status}`);
  return data.result;
}

// Все накопившиеся сообщения. Подтверждаются отдельно (ack.js), после публикации.
const getUpdates = () => call('getUpdates', { timeout: 0, limit: 50, allowed_updates: ['message'] });

// Подтвердить обработку: Telegram забывает всё с update_id < offset
const confirmUpdates = (offset) => call('getUpdates', { offset, timeout: 0, limit: 1, allowed_updates: ['message'] });

const sendMessage = (chatId, text) =>
  call('sendMessage', { chat_id: chatId, text, link_preview_options: { is_disabled: true } });

async function downloadFile(fileId) {
  const file = await call('getFile', { file_id: fileId });
  const res = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`);
  if (!res.ok) throw new Error(`Не удалось скачать фото из Telegram: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

module.exports = { getUpdates, confirmUpdates, sendMessage, downloadFile };
