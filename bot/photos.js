// Обложки для статей SEO-агента: 3 варианта, сгенерированные нейросетью Gemini.
// Почему не фотостоки: бесплатные CC0-стоки давали случайные любительские кадры
// и чужих персонажей; сгенерированная обложка всегда по теме, уникальна и без
// вопросов к лицензии. На сайте под обложкой пишем, что это иллюстрация нейросети.
const { ask } = require('./gemini');

const W = 1200;
const H = 750;
const IMAGE_MODELS = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'];
const RULES = 'Photorealistic editorial photo for a Russian B2B business blog. Bright, clean, soft daylight, pastel pink and light blue accents, shallow depth of field, wide horizontal frame. Absolutely no text, letters, numbers, labels, signs, logos, brand names or watermarks anywhere in the image. No recognizable copyrighted cartoon characters, no famous mascots, no real company products. No close-up human faces.';

// 3 разные сцены по теме статьи (на английском — модели рисования так понятнее)
async function scenes(article) {
  const { text } = await ask({
    fast: true,
    system: 'Ты арт-директор делового блога фабрики мягких игрушек и ПВХ-фигурок для бизнеса.',
    prompt: `Статья: «${article.h1}». ${article.description}

Придумай 3 РАЗНЫЕ сцены для обложки (на английском, по 1–2 предложения): предметы и обстановка по теме статьи — мягкие игрушки, плюшевые маскоты, ПВХ-фигурки, подарки, упаковка, офис, мероприятие, рабочий стол и т.п. Персонажи — только придуманные милые животные, без известных героев. Не изображай «нашу фабрику» и конкретные компании.
Ответь JSON: {"scenes":["…","…","…"]}`,
    schema: { type: 'OBJECT', properties: { scenes: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['scenes'] },
    maxTokens: 1500,
  });
  return JSON.parse(text).scenes.slice(0, 3);
}

async function generate(scene) {
  for (const model of IMAGE_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY || '' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${scene}\n\n${RULES}` }] }],
          generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } },
        }),
        signal: AbortSignal.timeout(180000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const part = ((data.candidates || [])[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
      if (part) return Buffer.from((part.inlineData || part.inline_data).data, 'base64');
    } catch (e) { /* следующая модель */ }
  }
  return null;
}

// Кадрирование по центру в 1200×750 и сжатие в JPEG
async function toCover(buf) {
  const Jimp = require('jimp');
  const img = await Jimp.read(buf);
  img.cover(W, H).quality(84);
  return img.getBufferAsync(Jimp.MIME_JPEG);
}

async function pickPhotos(article) {
  let list;
  try { list = await scenes(article); } catch (e) { list = [`Cute plush toys and small vinyl figurines of invented animals arranged as corporate gifts on a bright office desk, related to: ${article.h1}`]; }
  while (list.length < 3) list.push(list[list.length - 1]);
  const out = [];
  for (const scene of list) {
    const raw = await generate(scene);
    if (!raw) continue;
    try {
      out.push({ buf: await toCover(raw), width: W, height: H, caption: 'Иллюстрация создана нейросетью.', url: '', scene });
    } catch (e) { /* пропускаем битую картинку */ }
  }
  return out;
}

module.exports = { pickPhotos };
