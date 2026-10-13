// Генерация текста новости через Claude: фото + заметка владельца → готовая статья
const Anthropic = require('@anthropic-ai/sdk');
const { z } = require('zod');
const { betaZodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const C = require('../generator/data/config');

const ArticleSchema = z.object({
  slug: z.string().describe('URL-адрес новости латиницей через дефис, 3–6 слов, транслит ключевой фразы'),
  title: z.string().describe('SEO-заголовок для <title>, до 65 символов, с ключевой фразой в начале'),
  description: z.string().describe('Meta description, 140–160 символов, с ключевой фразой и пользой для читателя'),
  h1: z.string().describe('Заголовок страницы, до 80 символов, отличается от title'),
  shortTitle: z.string().describe('Короткий заголовок для карточки в ленте и хлебных крошек, до 50 символов'),
  bodyHtml: z.string().describe('Текст новости в HTML: только теги p, h2, h3, ul, ol, li, strong, a'),
  imageAlt: z.string().describe('Описание фото для атрибута alt, до 120 символов'),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).describe('3 вопроса и ответа по теме новости'),
});

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

async function writeArticle({ note, photo, pages }) {
  const client = new Anthropic();

  const response = await client.beta.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    // При отказе модели запрос автоматически повторяется на резервной
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high', format: betaZodOutputFormat(ArticleSchema) },
    system: systemPrompt(pages),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photo.toString('base64') } },
          { type: 'text', text: `Заметка владельца о новости:\n\n${note}` },
        ],
      },
    ],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('модель отказалась писать текст по этой теме');
  }
  if (response.stop_reason === 'max_tokens' || !response.parsed_output) {
    throw new Error('модель не вернула готовый текст, попробуйте ещё раз');
  }
  return response.parsed_output;
}

// Понятное владельцу описание ошибки API
function explainError(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'неверный ключ ANTHROPIC_API_KEY в секретах GitHub';
  if (err instanceof Anthropic.PermissionDeniedError) return 'у ключа ANTHROPIC_API_KEY нет доступа к модели';
  if (err instanceof Anthropic.RateLimitError) return 'превышен лимит запросов к Claude, попробуйте позже';
  if (err instanceof Anthropic.BadRequestError) return `Claude отклонил запрос: ${err.message}`;
  if (err instanceof Anthropic.APIConnectionError) return 'нет связи с Claude, попробуйте позже';
  if (err instanceof Anthropic.APIError) return `ошибка Claude (${err.status}), попробуйте позже`;
  return err.message;
}

module.exports = { writeArticle, explainError };
