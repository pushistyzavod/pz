// Клиент Gemini для SEO-агента: запросы с поиском Google (grounding) и с JSON-схемой.
// Модели по порядку: основная и запасные — на случай перегрузки или лимита.
const MODELS = [process.env.GEMINI_MODEL || 'gemini-pro-latest', 'gemini-flash-latest'];
const endpoint = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

class GeminiError extends Error {
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
      signal: AbortSignal.timeout(300000),
    });
  } catch (err) {
    throw new GeminiError('нет связи с Gemini', true);
  }
  if (res.ok) return res.json();
  const detail = await res.json().then((d) => d.error && d.error.message, () => '');
  if (res.status === 400 && /API key/i.test(detail || '')) throw new GeminiError('неверный ключ GEMINI_API_KEY');
  if (res.status === 401 || res.status === 403 || res.status === 429 || res.status >= 500) {
    throw new GeminiError(`Gemini временно недоступен (${res.status})`, true);
  }
  throw new GeminiError(`Gemini отклонил запрос (${res.status}): ${detail || 'без пояснения'}`);
}

// Один вызов с повторами и запасными моделями.
// search: true — модель ищет в Google и возвращает источники (groundingChunks).
// schema — ответ строго в JSON по схеме (нельзя совмещать с поиском — ограничение Gemini).
async function ask({ system, prompt, search = false, schema = null, maxTokens = 16000 }) {
  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: maxTokens },
  };
  if (search) body.tools = [{ google_search: {} }];
  if (schema) Object.assign(body.generationConfig, { responseMimeType: 'application/json', responseSchema: schema });

  let data;
  let lastError;
  outer: for (const model of MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        data = await request(model, body);
        break outer;
      } catch (err) {
        if (!err.retryable) throw err;
        lastError = err;
        await new Promise((r) => setTimeout(r, attempt * 5000));
      }
    }
  }
  if (!data) throw lastError;
  const cand = (data.candidates || [])[0];
  const text = cand && cand.content && (cand.content.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
  if (!cand || !text || (cand.finishReason && cand.finishReason !== 'STOP')) {
    throw new GeminiError(`Gemini не вернул ответ (${(cand && cand.finishReason) || 'пусто'})`);
  }
  const chunks = (cand.groundingMetadata && cand.groundingMetadata.groundingChunks) || [];
  const sources = chunks.map((c) => c.web).filter(Boolean).map((w) => ({ title: w.title || '', url: w.uri }));
  return { text, sources };
}

// JSON из ответа модели (в т.ч. из блока ```json ... ```)
function parseJson(text) {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (m ? m[1] : text).trim();
  const start = raw.search(/[[{]/);
  return JSON.parse(raw.slice(start));
}

module.exports = { ask, parseJson, GeminiError };
