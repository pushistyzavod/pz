// Цены на посадочных, в FAQ и описаниях сгенерированы и не совпадают с реальными
// ценами фабрики. Пока нет утверждённого прайса, конкретные суммы на этих страницах
// не показываем: вместо них — «рассчитаем стоимость за 1 рабочий день».
// Модуль используется шаблоном генератора и скриптом strip-prices.js для готовых страниц.

// сумма в рублях: «790 ₽», «от 5 000 ₽», «1 410 000 ₽/шт», «95 руб.»
const PRICE = /\d[\d\s ]*(?:[.,]\d+)?\s?(?:₽|руб\b)/;
// суммы штрафов по закону — это не наши цены, их оставляем
const KEEP = /штраф|конфискац/i;

const PRICE_ANSWER = 'Цена зависит от размера и сложности изделия, материалов, способа брендирования, упаковки и тиража: чем больше партия, тем ниже стоимость штуки. Точный расчёт пришлём за 1 рабочий день после брифа — оставьте заявку или позвоните.';
const SAMPLE_ANSWER = 'Стоимость образца зависит от изделия и его сложности — назовём её в расчёте вместе с ценой тиража.';

const hasPrice = (text) => PRICE.test(String(text)) && !KEEP.test(String(text));

// Убирает из предложения кусок с суммой: скобки с ценой или хвост после последнего
// двоеточия/запятой/тире перед суммой. Если до суммы почти ничего нет — null.
function cutPriceClause(sentence) {
  let s = sentence.replace(/\s*\([^()]*(?:₽|руб\b)[^()]*\)/g, '');
  if (!PRICE.test(s)) return s;
  const at = s.search(PRICE);
  const head = s.slice(0, at);
  const cut = Math.max(head.lastIndexOf(':'), head.lastIndexOf(','), head.lastIndexOf(' — '), head.lastIndexOf(' – '));
  if (cut < 15) return null;
  // «…брендированием: при тираже 500 штук — около 500 ₽» → «…брендированием.»
  const kept = s.slice(0, cut).replace(/[:,—–]?\s*при (?:тираже|объёме|заказе)[^.:;,—–]*$/, '');
  return kept.trim().replace(/[\s,:;—–-]+$/, '') + '.';
}

// Убирает из текста суммы в рублях: предложения целиком, а если от текста
// ничего бы не осталось — только кусок с ценой
function stripPriceSentences(text) {
  const s = String(text);
  if (!PRICE.test(s)) return s;
  const sentences = s.split(/(?<=[.!?…])\s+(?=[А-ЯЁA-Z«"(0-9])/);
  const kept = sentences.filter((x) => !PRICE.test(x) || KEEP.test(x));
  if (kept.length) return kept.join(' ').trim();
  return sentences.map((x) => (PRICE.test(x) && !KEEP.test(x) ? cutPriceClause(x) : x)).filter(Boolean).join(' ').trim();
}

// Вопросы именно о цене: на них отвечаем общим текстом, если без сумм ответ теряет смысл
const DIRECT_PRICE_QUESTION = /сколько стоит|^цена|какая цена|какие цены|какой бюджет|^бюджет|минимальная цена|самый дешёвый/i;
const SPLIT = /(?<=[.!?…])\s+(?=[А-ЯЁA-Z«"(0-9])/;

// Каждое предложение с суммой: убираем скобки с ценой, затем хвост с ценой; пустое — выбрасываем
function cleanSentences(text) {
  return String(text).split(SPLIT).map((x) => {
    if (!PRICE.test(x) || KEEP.test(x)) return x;
    const y = x.replace(/\s*\([^()]*(?:₽|руб\b)[^()]*\)/g, '');
    return PRICE.test(y) ? cutPriceClause(y) : y;
  }).filter(Boolean).join(' ').trim();
}

// Ответ FAQ без цен
function faqAnswer(question, answer) {
  if (!PRICE.test(String(answer))) return answer;
  // вопросы про образец: суммы и условия в сгенерированных ответах не подтверждены
  if (/образ/i.test(question)) return SAMPLE_ANSWER;
  if (DIRECT_PRICE_QUESTION.test(question)) {
    const left = stripPriceSentences(answer);
    return left.length >= 60 && /цен|стоим/i.test(left) ? left : PRICE_ANSWER;
  }
  // вопрос не про цену: сохраняем рекомендацию, убираем только сумму
  const clean = cleanSentences(answer);
  return clean.length >= 25 ? clean : PRICE_ANSWER;
}

const PRICE_LEAD = 'Стоимость рассчитываем под каждый заказ: она зависит от размера и сложности изделия, материалов, способа брендирования, упаковки и тиража. Чем больше тираж, тем ниже цена за штуку.';
const PRICE_CTA = '<p><a class="btn btn-primary" href="#cta">Получить расчёт за 1 рабочий день</a></p>';

module.exports = { PRICE, hasPrice, stripPriceSentences, faqAnswer, PRICE_LEAD, PRICE_CTA, SAMPLE_ANSWER };
