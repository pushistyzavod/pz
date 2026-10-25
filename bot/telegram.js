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
const UPDATES = ['message', 'callback_query']; // нажатия кнопок под черновиками SEO-агента
const getUpdates = () => call('getUpdates', { timeout: 0, limit: 50, allowed_updates: UPDATES });

// Подтвердить обработку: Telegram забывает всё с update_id < offset
const confirmUpdates = (offset) => call('getUpdates', { offset, timeout: 0, limit: 1, allowed_updates: UPDATES });

const sendMessage = (chatId, text) =>
  call('sendMessage', { chat_id: chatId, text, link_preview_options: { is_disabled: true } });

async function downloadFile(fileId) {
  const file = await call('getFile', { file_id: fileId });
  const res = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`);
  if (!res.ok) throw new Error(`Не удалось скачать фото из Telegram: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Файл с подписью и кнопками (черновик статьи SEO-агента)
async function sendDocument(chatId, filename, buffer, caption, replyMarkup) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('caption', caption);
  if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup));
  form.append('document', new Blob([buffer], { type: 'text/html' }), filename);
  const res = await fetch(`${API}/sendDocument`, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram sendDocument: ${data.description || res.status}`);
  return data.result;
}

const answerCallback = (id, text) => call('answerCallbackQuery', { callback_query_id: id, text: text || '' });
const removeButtons = (chatId, messageId) => call('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } });

module.exports = { getUpdates, confirmUpdates, sendMessage, downloadFile, sendDocument, answerCallback, removeButtons };
