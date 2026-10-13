// Генерация текста новости через Gemini: фото + заметка владельца → готовая статья
const C = require('../generator/data/config');

// Модели по порядку: основная (старшая Pro, нужен оплаченный счёт Gemini)
// и запасные Flash — на случай перегрузки или закончившегося баланса.
const MODELS = [process.env.GEMINI_MODEL || 'gemini-pro-latest', 'gemini-flash-latest', 'gemini-3.5-flash'];
const endpoint = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const str = (description) => ({ type: 'STRING', description });
const ARTICLE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    slug: str('URL-адрес новости латиницей через дефис, 3–6 слов, транслит ключевой фразы'),
    title: str('SEO-заголовок для <title>, до 65 символов, с ключевой фразой в начале'),
    description: str('Meta description, 140–160 символов, с ключевой фразой и пользой для читателя'),
    h1: str('Заголовок страницы, до 80 символов, отличается от title'),
    shortTitle: str('Короткий заголовок для карточки в ленте и хлебных крошек, до 50 символов'),
    bodyHtml: str('Текст новости в HTML: только теги p, h2, h3, ul, ol, li, strong, a'),
    imageAlt: str('Описание фото для атрибута alt, до 120 символов'),
    faq: {
      type: 'ARRAY',
      description: '3 вопроса и ответа по теме новости',
      items: { type: 'OBJECT', properties: { q: str('Вопрос'), a: str('Ответ') }, required: ['q', 'a'] },
    },
  },
  required: ['slug', 'title', 'description', 'h1', 'shortTitle', 'bodyHtml', 'imageAlt', 'faq'],
};

function systemPrompt(pages) {
  return `Ты пишешь новости для сайта фабрики «${C.COMPANY.name}» (pushistyzavod.ru).

О компании: производство мягких игрушек, ПВХ-фигурок, маскотов и корпоративных подарков на заказ для бизнеса. Фабрика: ${C.COMPANY.factory}. Офис продаж: ${C.COMPANY.office}. Читатели — маркетологи, HR и закупщики компаний, которые выбирают подрядчика на партию брендированных игрушек или подарков.

Владелец присылает фото и короткую заметку о том, про что новость. Твоя задача — написать по ним готовую новость для раздела «Новости», которая хорошо ранжируется в Яндексе и Google и приводит потенциальных заказчиков.

Правда важнее объёма. Новость публикуется на сайте компании автоматически, без редактора, поэтому всё, что в ней сказано, читатель воспримет как официальное заявление фабрики:
- Опирайся только на заметку владельца, на то, что видно на фото, и на сведения о компании выше.
- Цифры, цены, сроки, тиражи, названия клиентов и брендов, награды, сертификаты бери только из заметки. Если в заметке их нет — пиши без них, не придумывай.
- Фото описывай так, как его увидел бы посетитель страницы. Если на фото чужой логотип или бренд, а в заметке он не назван, не называй его.
- Если заметка короткая, раскрой тему за счёт пользы для читателя: зачем такое изделие бизнесу, как его применяют, на что обратить внимание при заказе. Общие сведения о производстве игрушек допустимы, конкретные обещания от имени фабрики — нет.

Текст:
- Русский язык, живой деловой тон, без канцелярита и рекламных штампов. Объём 1800–3000 знаков.
- Первый абзац сразу сообщает суть новости и содержит ключевую фразу, по которой такую новость искал бы заказчик.
- 2–4 подзаголовка h2, списки там, где перечисление читается лучше абзаца.
- Вставь в текст 2–3 ссылки на подходящие по смыслу страницы сайта из списка ниже. Анкор — естественная фраза в предложении. Используй только адреса из списка, в точности как они записаны.
- Контакты, телефон и призыв оставить заявку не добавляй: форма заявки стоит на странице под текстом.
- В bodyHtml не вставляй само фото и заголовок h1 — их добавляет шаблон страницы.

Страницы сайта для внутренних ссылок (адрес — название):
${pages.map((p) => `${p.url} — ${p.title}`).join('\n')}`;
}

// Ошибка с текстом, который можно показать владельцу в Telegram.
// retryable — временный сбой: стоит повторить запрос или взять запасную модель.
class WriterError extends Error {
  constructor(message, retryable = false) {
    super(message);
    this.retryable = retryable;
  }
}

async function request(model, body) {
  let res;
  try {
    res = await fetch(endpoint(model), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY || '' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180000),
    });
  } catch (err) {
    throw new WriterError('нет связи с Gemini, попробуйте позже', true);
  }
  if (res.ok) return res.json();

  const detail = await res.json().then((d) => d.error && d.error.message, () => '');
  if (res.status === 400 && /API key/i.test(detail || '')) throw new WriterError('неверный ключ GEMINI_API_KEY');
  // 403 у Gemini бывает и временным, поэтому тоже повторяем
  if (res.status === 401 || res.status === 403) throw new WriterError('ключ GEMINI_API_KEY не принят или у него нет доступа к модели', true);
  if (res.status === 429) throw new WriterError('исчерпан лимит запросов Gemini, попробуйте позже', true);
  if (res.status >= 500) throw new WriterError('Gemini перегружен, попробуйте позже', true);
  throw new WriterError(`Gemini отклонил запрос (${res.status}): ${detail || 'без пояснения'}`);
}

async function writeArticle({ note, photo, pages }) {
  const body = {
    system_instruction: { parts: [{ text: systemPrompt(pages) }] },
    contents: [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data: photo.toString('base64') } },
          { text: `Заметка владельца о новости:\n\n${note}` },
        ],
      },
    ],
    generationConfig: { responseMimeType: 'application/json', responseSchema: ARTICLE_SCHEMA, maxOutputTokens: 16000 },
  };

  // Временные сбои повторяем сразу: бот запускается раз в несколько минут, ждать следующего запуска долго
  let data;
  let lastError;
  attempts: for (const model of MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        data = await request(model, body);
        break attempts;
      } catch (err) {
        if (!err.retryable) throw err;
        lastError = err;
        await new Promise((r) => setTimeout(r, attempt * 4000));
      }
    }
  }
  if (!data) throw lastError;

  if (data.promptFeedback && data.promptFeedback.blockReason) {
    throw new WriterError('Gemini отказался писать текст по этому фото или теме');
  }
  const candidate = (data.candidates || [])[0];
  const text = candidate && candidate.content && (candidate.content.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
  if (!candidate || candidate.finishReason !== 'STOP' || !text) {
    throw new WriterError('Gemini не вернул готовый текст, попробуйте ещё раз');
  }

  let article;
  try {
    article = JSON.parse(text);
  } catch (err) {
    throw new WriterError('Gemini вернул текст в неверном формате, попробуйте ещё раз');
  }
  const missing = ARTICLE_SCHEMA.required.filter((k) => k !== 'faq' && (typeof article[k] !== 'string' || !article[k].trim()));
  if (missing.length) throw new WriterError('Gemini вернул неполный текст, попробуйте ещё раз');
  if (!Array.isArray(article.faq)) article.faq = [];
  return article;
}

const explainError = (err) => (err instanceof WriterError ? err.message : `внутренняя ошибка (${err.message})`);

module.exports = { writeArticle, explainError };
