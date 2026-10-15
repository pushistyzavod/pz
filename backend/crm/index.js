// CRM «Пушистого Завода»: клиенты, заявки, задачи, журнал действий.
// Встроена в сайт: API — /crm/api/*, интерфейс — prototype/crm/ (адрес /crm/).
// Пользователи: администратор и сотрудники. Вход — по почте и паролю, сессия в httpOnly-cookie.
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');

const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

// ---------- Справочники ----------
// Шаги работы с клиентом — как на производстве:
// заявка → расчёт стоимости → сигнальный образец → партия в работе → готово
const STATUSES = [
  ['new', 'Новая заявка'],
  ['calc', 'Расчёт стоимости'],
  ['sample', 'Сигнальный образец'],
  ['production', 'Партия в работе'],
  ['done', 'Готово'],
  ['archive', 'Отказ / Архив'],
];
const STATUS_KEYS = STATUSES.map((s) => s[0]);
const OPEN_STATUSES = ['new', 'calc', 'sample', 'production'];
// Сотрудник не отправляет заявки в архив — это делает администратор
const STAFF_STATUSES = ['new', 'calc', 'sample', 'production', 'done'];
// Прежние статусы (первая версия CRM) → новые шаги
const OLD_STATUS = { work: 'calc', wait_client: 'calc', talks: 'calc', order: 'production' };
// Даты и поля по шагам
const DATE_FIELDS = ['calcAt', 'sampleOrderedAt', 'samplePaidAt', 'sampleDoneAt', 'orderedAt', 'paidAt', 'completedAt'];
const FIELD_LABELS = {
  calcDone: 'расчёт сделан', calcAt: 'дата расчёта', calcAmount: 'сумма расчёта', qty: 'тираж',
  sampleOrderedAt: 'образец заказан', samplePaidAt: 'образец оплачен', sampleDoneAt: 'образец готов',
  orderedAt: 'партия заказана', paidAt: 'партия оплачена', completedAt: 'завершено',
};
const COMM = { new: 'Новое сообщение', wait_staff: 'Ждёт ответа сотрудника', wait_client: 'Ждёт ответа клиента', '': '' };

// ---------- Модели ----------
const User = mongoose.model('CrmUser', new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  passHash: String,
  active: { type: Boolean, default: true },
}, { timestamps: true, collection: 'crm_users' }));

const Session = mongoose.model('CrmSession', new Schema({
  tokenHash: { type: String, index: true },
  userId: ObjectId,
  expiresAt: { type: Date, index: { expires: 0 } },
  ip: String,
  ua: String,
}, { timestamps: true, collection: 'crm_sessions' }));

const Client = mongoose.model('CrmClient', new Schema({
  name: String,
  company: String,
  phones: [String],
  emails: [String],
  note: String,
}, { timestamps: true, collection: 'crm_clients' }));

const messageSchema = new Schema({
  dir: { type: String, enum: ['in', 'out', 'note'] },
  channel: String, // form | email | telegram | max | manual
  text: String,
  at: { type: Date, default: Date.now },
  userId: ObjectId,
  meta: Schema.Types.Mixed,
}, { _id: true });

const Deal = mongoose.model('CrmDeal', new Schema({
  num: { type: Number, index: true },
  title: String,
  clientId: { type: ObjectId, index: true },
  source: { type: { type: String }, label: String },
  status: { type: String, default: 'new', index: true },
  comm: { type: String, default: 'new' },
  unread: { type: Boolean, default: true },
  assigneeId: { type: ObjectId, index: true },
  amount: Number,
  orderDetails: String,
  messages: [messageSchema],
  comments: [{ userId: ObjectId, text: String, at: { type: Date, default: Date.now } }],
  lastContactAt: { type: Date, index: true },
  closedAt: Date,
  // расчёт стоимости
  calcDone: { type: Boolean, default: false },
  calcAt: Date,
  calcAmount: Number,
  qty: String,
  // сигнальный образец
  sampleOrderedAt: Date,
  samplePaidAt: Date,
  sampleDoneAt: Date,
  // партия
  orderedAt: Date,
  paidAt: Date,
  completedAt: Date,
  formSubmissionId: { type: ObjectId, index: true },
}, { timestamps: true, collection: 'crm_deals' }));

const Task = mongoose.model('CrmTask', new Schema({
  dealId: { type: ObjectId, index: true },
  text: String,
  dueAt: Date,
  assigneeId: { type: ObjectId, index: true },
  done: { type: Boolean, default: false },
  doneAt: Date,
  createdBy: ObjectId,
}, { timestamps: true, collection: 'crm_tasks' }));

const Log = mongoose.model('CrmLog', new Schema({
  userId: ObjectId,
  action: String,
  entity: String,
  entityId: ObjectId,
  details: Schema.Types.Mixed,
  ip: String,
  at: { type: Date, default: Date.now, index: true },
}, { collection: 'crm_log' }));

const Counter = mongoose.model('CrmCounter', new Schema({ _id: String, seq: Number }, { collection: 'crm_counters' }));

// ---------- Вспомогательное ----------
const nextNum = async () => (await Counter.findByIdAndUpdate('deal', { $inc: { seq: 1 } }, { new: true, upsert: true })).seq;
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const normPhone = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.length >= 10 ? d.slice(-10) : d; };
const normEmail = (e) => String(e || '').trim().toLowerCase();
const clientIp = (req) => String(req.headers['x-real-ip'] || req.ip || '');
const str = (v, max = 5000) => (v === undefined || v === null ? '' : String(v)).trim().slice(0, max);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function checkPassword(password, stored) {
  const [kind, salt, hash] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const test = crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 });
  const want = Buffer.from(hash, 'hex');
  return want.length === test.length && crypto.timingSafeEqual(want, test);
}
const passwordProblem = (p) => (String(p || '').length < 10 ? 'Пароль должен быть не короче 10 символов' : null);

// Код первичной настройки: выводится из секрета сервера, известен только тем, у кого есть доступ к серверу
const setupCode = () => crypto.createHmac('sha256', String(process.env.SMTP_PASS || process.env.MONGO_URI || 'pz')).update('pz-crm-setup').digest('hex').slice(0, 12);

async function log(req, action, entity, entityId, details) {
  try {
    await Log.create({ userId: req.user && req.user._id, action, entity, entityId, details, ip: clientIp(req) });
  } catch (e) { console.warn('CRM: журнал не записан:', e.message); }
}

// Ограничение попыток входа: 10 за 15 минут с одного IP
const loginHits = new Map();
function loginAllowed(ip) {
  const now = Date.now();
  const list = (loginHits.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  loginHits.set(ip, list);
  if (list.length >= 10) return false;
  list.push(now);
  return true;
}
setInterval(() => { const now = Date.now(); for (const [ip, l] of loginHits) if (!l.some((t) => now - t < 15 * 60 * 1000)) loginHits.delete(ip); }, 15 * 60 * 1000).unref();

// ---------- Клиенты и заявки из каналов ----------
async function findOrCreateClient({ name, phone, email, company }) {
  const p = normPhone(phone); const e = normEmail(email);
  let client = null;
  if (p) client = await Client.findOne({ phones: p });
  if (!client && e) client = await Client.findOne({ emails: e });
  if (!client) {
    client = await Client.create({ name: str(name, 200) || 'Без имени', company: str(company, 200), phones: p ? [p] : [], emails: e ? [e] : [] });
    return client;
  }
  let changed = false;
  if (p && !client.phones.includes(p)) { client.phones.push(p); changed = true; }
  if (e && !client.emails.includes(e)) { client.emails.push(e); changed = true; }
  if ((!client.name || client.name === 'Без имени') && name) { client.name = str(name, 200); changed = true; }
  if (changed) await client.save();
  return client;
}

// Входящее обращение: к открытой заявке клиента или новая заявка
async function addInbound({ client, channel, sourceLabel, title, text, at, meta, formSubmissionId }) {
  const when = at ? new Date(at) : new Date();
  const msg = { dir: 'in', channel, text: str(text, 20000), at: when, meta };
  let deal = await Deal.findOne({ clientId: client._id, status: { $in: OPEN_STATUSES } }).sort({ lastContactAt: -1 });
  if (deal) {
    deal.messages.push(msg);
    deal.comm = 'new'; deal.unread = true;
    if (!deal.lastContactAt || when > deal.lastContactAt) deal.lastContactAt = when;
    await deal.save();
    return { deal, created: false };
  }
  deal = await Deal.create({
    num: await nextNum(), title: str(title, 300) || 'Обращение', clientId: client._id,
    source: { type: channel, label: str(sourceLabel, 200) }, status: 'new', comm: 'new', unread: true,
    messages: [msg], lastContactAt: when, formSubmissionId, createdAt: when,
  });
  return { deal, created: true };
}

function formText(data) {
  const parts = [];
  const custom = data.customFields && typeof data.customFields === 'object' ? data.customFields : {};
  if (custom.product) parts.push('Что изготовить: ' + custom.product);
  if (data.message && data.message !== 'Интересует: ' + custom.product) parts.push(String(data.message));
  if (data.comment && data.comment !== data.message) parts.push(String(data.comment));
  for (const [k, v] of Object.entries(custom)) if (k !== 'product' && v && typeof v !== 'object') parts.push(`${k}: ${v}`);
  const contacts = [data.phone && 'Телефон: ' + data.phone, data.email && 'Почта: ' + data.email].filter(Boolean).join(' · ');
  return [parts.join('\n') || 'Заявка с сайта без комментария', contacts, data.formPage && 'Страница: ' + data.formPage].filter(Boolean).join('\n');
}

// Заявка с формы сайта → клиент + заявка в CRM
async function onFormSubmission(data, submission) {
  if (mongoose.connection.readyState !== 1) return;
  const exists = submission && await Deal.findOne({ formSubmissionId: submission._id });
  if (exists) return;
  const client = await findOrCreateClient({ name: data.name, phone: data.phone, email: data.email });
  await addInbound({
    client, channel: 'form', sourceLabel: data.formName || 'Форма сайта', title: data.formName || 'Заявка с сайта',
    text: formText(data), at: submission && submission.createdAt, formSubmissionId: submission && submission._id,
    meta: { page: data.formPage },
  });
}

// Перенос заявок, накопленных до запуска CRM (один раз)
async function importForms(FormSubmission) {
  if (!FormSubmission || mongoose.connection.readyState !== 1) return;
  const done = await Counter.findById('forms_imported');
  if (done) return;
  const list = await FormSubmission.find().sort({ createdAt: 1 }).lean();
  let n = 0;
  for (const s of list) {
    try { await onFormSubmission(s, s); n++; } catch (e) { console.warn('CRM: заявка не перенесена', s._id, e.message); }
  }
  await Counter.create({ _id: 'forms_imported', seq: n });
  console.log(`📥 CRM: перенесено заявок с сайта: ${n}`);
}

// ---------- Представление для интерфейса ----------
const userView = (u) => u && ({ id: u._id, name: u.name, email: u.email, role: u.role, active: u.active });

async function dealsView(deals) {
  const clientIds = [...new Set(deals.map((d) => String(d.clientId)).filter(Boolean))];
  const clients = await Client.find({ _id: { $in: clientIds } }).lean();
  const byId = Object.fromEntries(clients.map((c) => [String(c._id), c]));
  return deals.map((d) => {
    const c = byId[String(d.clientId)] || {};
    const last = (d.messages || []).filter((m) => m.dir !== 'note').slice(-1)[0];
    return {
      id: d._id, num: d.num, title: d.title, status: d.status, comm: d.comm, unread: d.unread,
      source: d.source, assigneeId: d.assigneeId, amount: d.amount,
      client: { id: c._id, name: c.name, company: c.company, phone: (c.phones || [])[0], email: (c.emails || [])[0] },
      lastMessage: last ? { dir: last.dir, channel: last.channel, text: String(last.text || '').slice(0, 160), at: last.at } : null,
      lastContactAt: d.lastContactAt, createdAt: d.createdAt,
      calcDone: d.calcDone, calcAt: d.calcAt, calcAmount: d.calcAmount, qty: d.qty,
      sampleOrderedAt: d.sampleOrderedAt, samplePaidAt: d.samplePaidAt, sampleDoneAt: d.sampleDoneAt,
      orderedAt: d.orderedAt, paidAt: d.paidAt, completedAt: d.completedAt,
    };
  });
}

// ---------- Маршруты ----------
module.exports = function mountCrm(app, { FormSubmission } = {}) {
  const api = express.Router();
  // Express 4 не ловит ошибки async-обработчиков — оборачиваем, чтобы ошибка уходила в обработчик, а не вешала запрос
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  for (const m of ['get', 'post', 'patch', 'use']) {
    const orig = api[m].bind(api);
    api[m] = (...args) => orig(...args.map((a) => (typeof a === 'function' && a.length < 4 ? wrap(a) : a)));
  }
  api.use(express.json({ limit: '1mb' }));
  api.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  const dbOk = (req, res, next) => (mongoose.connection.readyState === 1 ? next() : res.status(503).json({ error: 'База данных недоступна, попробуйте через минуту' }));
  api.use(dbOk);

  // Изменяющие запросы — только из интерфейса CRM (заголовок X-CRM) — защита от подделки запросов
  api.use((req, res, next) => {
    if (req.method !== 'GET' && req.get('X-CRM') !== '1') return res.status(400).json({ error: 'Некорректный запрос' });
    next();
  });

  const cookieOpts = (req) => ({ httpOnly: true, sameSite: 'strict', secure: req.secure || req.get('x-forwarded-proto') === 'https', path: '/crm', maxAge: 30 * 24 * 3600 * 1000 });

  async function startSession(req, res, user) {
    const token = crypto.randomBytes(32).toString('hex');
    await Session.create({ tokenHash: sha256(token), userId: user._id, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), ip: clientIp(req), ua: str(req.get('user-agent'), 300) });
    res.cookie('pz_crm', token, cookieOpts(req));
  }

  // --- первичная настройка: создание администратора, пока пользователей нет ---
  api.get('/setup', async (req, res) => res.json({ needed: (await User.countDocuments()) === 0 }));
  api.post('/setup', async (req, res) => {
    if ((await User.countDocuments()) > 0) return res.status(403).json({ error: 'Настройка уже выполнена' });
    if (!loginAllowed(clientIp(req))) return res.status(429).json({ error: 'Слишком много попыток, подождите 15 минут' });
    const { code, name, email, password } = req.body || {};
    const a = Buffer.from(String(code || '')); const b = Buffer.from(setupCode());
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(403).json({ error: 'Неверный код настройки' });
    const problem = passwordProblem(password); if (problem) return res.status(400).json({ error: problem });
    if (!normEmail(email).includes('@')) return res.status(400).json({ error: 'Укажите почту' });
    const user = await User.create({ name: str(name, 100) || 'Администратор', email: normEmail(email), role: 'admin', passHash: hashPassword(password) });
    req.user = user; await log(req, 'setup', 'user', user._id, { email: user.email });
    await startSession(req, res, user);
    res.json({ user: userView(user) });
  });

  // --- вход и выход ---
  api.post('/login', async (req, res) => {
    if (!loginAllowed(clientIp(req))) return res.status(429).json({ error: 'Слишком много попыток входа, подождите 15 минут' });
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: normEmail(email), active: true });
    if (!user || !checkPassword(password, user.passHash)) {
      await log({ user: null, headers: req.headers, ip: req.ip }, 'login_failed', 'user', user && user._id, { email: normEmail(email) });
      return res.status(401).json({ error: 'Неверная почта или пароль' });
    }
    req.user = user; await log(req, 'login', 'user', user._id);
    await startSession(req, res, user);
    res.json({ user: userView(user) });
  });

  // --- всё остальное — только после входа ---
  api.use(async (req, res, next) => {
    const token = (String(req.headers.cookie || '').match(/(?:^|;\s*)pz_crm=([a-f0-9]{64})/) || [])[1];
    if (!token) return res.status(401).json({ error: 'Нужно войти' });
    const s = await Session.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } });
    const user = s && await User.findOne({ _id: s.userId, active: true });
    if (!user) return res.status(401).json({ error: 'Нужно войти' });
    req.user = user; req.sessionDoc = s; req.isAdmin = user.role === 'admin';
    next();
  });
  const adminOnly = (req, res, next) => (req.isAdmin ? next() : res.status(403).json({ error: 'Только для администратора' }));

  api.post('/logout', async (req, res) => {
    await Session.deleteOne({ _id: req.sessionDoc._id }); await log(req, 'logout', 'user', req.user._id);
    res.clearCookie('pz_crm', { path: '/crm' }); res.json({ ok: true });
  });
  api.get('/me', (req, res) => res.json({ user: userView(req.user) }));
  api.post('/me/password', async (req, res) => {
    const { current, password } = req.body || {};
    if (!checkPassword(current, req.user.passHash)) return res.status(400).json({ error: 'Текущий пароль неверный' });
    const problem = passwordProblem(password); if (problem) return res.status(400).json({ error: problem });
    req.user.passHash = hashPassword(password); await req.user.save();
    await Session.deleteMany({ userId: req.user._id, _id: { $ne: req.sessionDoc._id } }); // выйти на других устройствах
    await log(req, 'password_changed', 'user', req.user._id); res.json({ ok: true });
  });

  api.get('/meta', async (req, res) => {
    const users = await User.find({ active: true }).sort({ role: 1, name: 1 }).lean();
    res.json({ statuses: STATUSES, staffStatuses: STAFF_STATUSES, comm: COMM, labels: FIELD_LABELS, users: users.map(userView) });
  });

  // Доступ сотрудника — только к своим заявкам
  const dealScope = (req) => (req.isAdmin ? {} : { assigneeId: req.user._id });
  async function loadDeal(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: 'Заявка не найдена' }); return null; }
    const deal = await Deal.findOne({ _id: req.params.id, ...dealScope(req) });
    if (!deal) { res.status(404).json({ error: 'Заявка не найдена или нет доступа' }); return null; }
    return deal;
  }

  api.get('/dashboard', async (req, res) => {
    const scope = dealScope(req);
    const counts = await Deal.aggregate([{ $match: scope }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
    const unread = await Deal.countDocuments({ ...scope, unread: true });
    const mine = await Deal.countDocuments({ assigneeId: req.user._id, status: { $in: OPEN_STATUSES } });
    const unassigned = req.isAdmin ? await Deal.countDocuments({ assigneeId: null, status: { $in: OPEN_STATUSES } }) : 0;
    const notCalculated = await Deal.countDocuments({ ...scope, status: 'calc', calcDone: { $ne: true } });
    const samplesUnpaid = await Deal.countDocuments({ ...scope, status: 'sample', samplePaidAt: null });
    const productionUnpaid = await Deal.countDocuments({ ...scope, status: 'production', paidAt: null });
    const waitingLong = await Deal.countDocuments({ ...scope, status: { $in: OPEN_STATUSES }, comm: { $in: ['new', 'wait_staff'] }, lastContactAt: { $lt: new Date(Date.now() - 24 * 3600 * 1000) } });
    const taskScope = req.isAdmin ? {} : { assigneeId: req.user._id };
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
    const tasks = await Task.find({ ...taskScope, done: false, dueAt: { $lte: endOfDay } }).sort({ dueAt: 1 }).limit(20).lean();
    const recent = await Deal.find({ ...scope, status: { $in: OPEN_STATUSES } }).sort({ lastContactAt: -1 }).limit(8).lean();
    res.json({ counts: Object.fromEntries(counts.map((c) => [c._id, c.n])), unread, mine, unassigned, waitingLong, notCalculated, samplesUnpaid, productionUnpaid, tasks, recent: await dealsView(recent) });
  });

  api.get('/deals', async (req, res) => {
    const q = { ...dealScope(req) };
    const view = String(req.query.view || 'all');
    if (view === 'mine') q.assigneeId = req.user._id;
    if (view === 'new') q.status = 'new';
    if (view === 'calc') { q.status = 'calc'; if (req.query.calc === '0') q.calcDone = { $ne: true }; if (req.query.calc === '1') q.calcDone = true; }
    if (view === 'sample') q.status = 'sample';
    if (view === 'production') { q.status = 'production'; if (req.query.paid === '0') q.paidAt = null; if (req.query.paid === '1') q.paidAt = { $ne: null }; }
    if (view === 'closed') q.status = req.query.status === 'archive' ? 'archive' : 'done';
    if (view === 'all' || view === 'mine' || view === 'messages') q.status = q.status || { $in: OPEN_STATUSES };
    if (req.query.status && STATUS_KEYS.includes(req.query.status) && view !== 'closed') q.status = req.query.status;
    if (view === 'messages') q['messages.0'] = { $exists: true };
    if (req.query.unassigned === '1' && req.isAdmin) q.assigneeId = null;
    const term = str(req.query.q, 100);
    if (term) {
      const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const digits = normPhone(term);
      const clients = await Client.find({ $or: [{ name: rx }, { company: rx }, { emails: rx }, ...(digits.length >= 4 ? [{ phones: new RegExp(digits) }] : [])] }, { _id: 1 }).limit(200).lean();
      const or = [{ title: rx }, { clientId: { $in: clients.map((c) => c._id) } }];
      if (/^\d+$/.test(term)) or.push({ num: Number(term) });
      q.$or = or;
    }
    const sort = view === 'closed' ? { completedAt: -1, updatedAt: -1 } : view === 'production' ? { orderedAt: 1 } : view === 'sample' ? { sampleOrderedAt: 1 } : view === 'calc' ? { calcDone: 1, createdAt: 1 } : { unread: -1, lastContactAt: -1 };
    const deals = await Deal.find(q).sort(sort).limit(500).lean();
    res.json({ deals: await dealsView(deals) });
  });

  api.post('/deals', async (req, res) => {
    const b = req.body || {};
    if (!str(b.name) && !str(b.phone) && !str(b.email)) return res.status(400).json({ error: 'Укажите имя, телефон или почту клиента' });
    const client = await findOrCreateClient({ name: b.name, phone: b.phone, email: b.email, company: b.company });
    const deal = await Deal.create({
      num: await nextNum(), title: str(b.title, 300) || 'Новая заявка', clientId: client._id,
      source: { type: 'manual', label: str(b.source, 100) || 'Добавлена вручную' }, status: 'new', comm: '', unread: false,
      assigneeId: req.isAdmin ? (mongoose.isValidObjectId(b.assigneeId) ? b.assigneeId : null) : req.user._id,
      messages: str(b.text) ? [{ dir: 'note', channel: 'manual', text: str(b.text, 20000), userId: req.user._id }] : [],
      lastContactAt: new Date(),
    });
    await log(req, 'deal_created', 'deal', deal._id, { num: deal.num });
    res.json({ id: deal._id });
  });

  api.get('/deals/:id', async (req, res) => {
    const deal = await loadDeal(req, res); if (!deal) return;
    const client = await Client.findById(deal.clientId).lean();
    const tasks = await Task.find({ dealId: deal._id }).sort({ done: 1, dueAt: 1 }).lean();
    const history = await Log.find({ entity: 'deal', entityId: deal._id }).sort({ at: -1 }).limit(100).lean();
    const otherDeals = client ? await Deal.find({ clientId: client._id, _id: { $ne: deal._id }, ...dealScope(req) }, { num: 1, title: 1, status: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean() : [];
    res.json({ deal, client, tasks, history, otherDeals });
  });

  api.patch('/deals/:id', async (req, res) => {
    const deal = await loadDeal(req, res); if (!deal) return;
    const b = req.body || {}; const changes = {};
    const today = new Date();
    // даты шагов — календарные дни по Москве, хранятся как полночь UTC
    const todayDay = new Date(new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' }) + 'T00:00:00Z');
    const autoSet = new Set(); // даты, поставленные автоматически при переходе на шаг
    if (b.status !== undefined) {
      if (!STATUS_KEYS.includes(b.status)) return res.status(400).json({ error: 'Неизвестный шаг' });
      if (!req.isAdmin && !STAFF_STATUSES.includes(b.status)) return res.status(403).json({ error: 'В архив заявку отправляет администратор' });
      if (b.status !== deal.status) {
        changes.status = [deal.status, b.status]; deal.status = b.status;
        deal.closedAt = ['done', 'archive'].includes(b.status) ? today : null;
        const auto = { sample: 'sampleOrderedAt', production: 'orderedAt', done: 'completedAt' }[b.status];
        if (auto && !deal[auto] && !b[auto]) { deal[auto] = todayDay; autoSet.add(auto); changes[auto] = [null, todayDay.toISOString().slice(0, 10)]; }
      }
    }
    if (b.calcDone !== undefined && !!b.calcDone !== !!deal.calcDone) {
      changes.calcDone = [!!deal.calcDone, !!b.calcDone]; deal.calcDone = !!b.calcDone;
      if (deal.calcDone && !deal.calcAt && !b.calcAt) { deal.calcAt = todayDay; autoSet.add('calcAt'); changes.calcAt = [null, todayDay.toISOString().slice(0, 10)]; }
    }
    for (const f of DATE_FIELDS) {
      if (b[f] === undefined || (autoSet.has(f) && !b[f])) continue;
      const v = b[f] ? new Date(String(b[f]).slice(0, 10) + 'T00:00:00Z') : null;
      if (v && isNaN(v)) return res.status(400).json({ error: 'Неверная дата: ' + FIELD_LABELS[f] });
      const before = deal[f] ? deal[f].toISOString().slice(0, 10) : null; const after = v ? v.toISOString().slice(0, 10) : null;
      if (before !== after) { changes[f] = [before, after]; deal[f] = v; }
    }
    if (b.calcAmount !== undefined) {
      const v = b.calcAmount === '' || b.calcAmount === null ? null : Number(String(b.calcAmount).replace(/\s/g, '').replace(',', '.'));
      if (v !== null && (!isFinite(v) || v < 0)) return res.status(400).json({ error: 'Сумма расчёта указана неверно' });
      if (v !== (deal.calcAmount == null ? null : deal.calcAmount)) { changes.calcAmount = [deal.calcAmount, v]; deal.calcAmount = v; }
    }
    if (b.qty !== undefined && str(b.qty, 100) !== (deal.qty || '')) { changes.qty = [deal.qty || '', str(b.qty, 100)]; deal.qty = str(b.qty, 100); }
    if (b.assigneeId !== undefined) {
      if (!req.isAdmin) return res.status(403).json({ error: 'Назначать ответственного может администратор' });
      const id = b.assigneeId && mongoose.isValidObjectId(b.assigneeId) ? b.assigneeId : null;
      if (id && !(await User.exists({ _id: id, active: true }))) return res.status(400).json({ error: 'Сотрудник не найден' });
      if (String(id) !== String(deal.assigneeId)) { changes.assignee = [deal.assigneeId, id]; deal.assigneeId = id; }
    }
    if (b.comm !== undefined && b.comm in COMM && b.comm !== deal.comm) { changes.comm = [deal.comm, b.comm]; deal.comm = b.comm; }
    if (b.title !== undefined && str(b.title, 300) !== deal.title) { changes.title = [deal.title, str(b.title, 300)]; deal.title = str(b.title, 300); }
    if (b.amount !== undefined) {
      const v = b.amount === '' || b.amount === null ? null : Number(String(b.amount).replace(/\s/g, '').replace(',', '.'));
      if (v !== null && (!isFinite(v) || v < 0)) return res.status(400).json({ error: 'Сумма указана неверно' });
      if (v !== deal.amount) { changes.amount = [deal.amount, v]; deal.amount = v; }
    }
    if (b.orderDetails !== undefined && str(b.orderDetails, 20000) !== (deal.orderDetails || '')) { changes.orderDetails = true; deal.orderDetails = str(b.orderDetails, 20000); }
    if (!Object.keys(changes).length) return res.json({ ok: true });
    await deal.save(); await log(req, 'deal_updated', 'deal', deal._id, changes);
    res.json({ ok: true });
  });

  api.post('/deals/:id/read', async (req, res) => {
    const deal = await loadDeal(req, res); if (!deal) return;
    if (deal.unread) { deal.unread = false; if (deal.comm === 'new') deal.comm = 'wait_staff'; await deal.save(); }
    res.json({ ok: true });
  });

  api.post('/deals/:id/comments', async (req, res) => {
    const deal = await loadDeal(req, res); if (!deal) return;
    const text = str((req.body || {}).text, 10000); if (!text) return res.status(400).json({ error: 'Пустой комментарий' });
    deal.comments.push({ userId: req.user._id, text }); await deal.save();
    await log(req, 'comment_added', 'deal', deal._id, { text: text.slice(0, 200) });
    res.json({ ok: true });
  });

  // --- клиенты ---
  async function clientAllowed(req, clientId) {
    if (req.isAdmin) return true;
    return !!(await Deal.exists({ clientId, assigneeId: req.user._id }));
  }
  api.get('/clients', async (req, res) => {
    const q = {};
    if (!req.isAdmin) q._id = { $in: await Deal.distinct('clientId', { assigneeId: req.user._id }) };
    const term = str(req.query.q, 100);
    if (term) {
      const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); const digits = normPhone(term);
      q.$or = [{ name: rx }, { company: rx }, { emails: rx }, ...(digits.length >= 4 ? [{ phones: new RegExp(digits) }] : [])];
    }
    const clients = await Client.find(q).sort({ updatedAt: -1 }).limit(300).lean();
    const counts = await Deal.aggregate([{ $match: { clientId: { $in: clients.map((c) => c._id) } } }, { $group: { _id: '$clientId', n: { $sum: 1 }, last: { $max: '$lastContactAt' } } }]);
    const byId = Object.fromEntries(counts.map((c) => [String(c._id), c]));
    res.json({ clients: clients.map((c) => ({ ...c, deals: (byId[String(c._id)] || {}).n || 0, lastContactAt: (byId[String(c._id)] || {}).last })) });
  });
  api.get('/clients/:id', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id) || !(await clientAllowed(req, req.params.id))) return res.status(404).json({ error: 'Клиент не найден' });
    const client = await Client.findById(req.params.id).lean(); if (!client) return res.status(404).json({ error: 'Клиент не найден' });
    const deals = await Deal.find({ clientId: client._id, ...dealScope(req) }).sort({ createdAt: -1 }).lean();
    res.json({ client, deals: await dealsView(deals) });
  });
  api.patch('/clients/:id', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id) || !(await clientAllowed(req, req.params.id))) return res.status(404).json({ error: 'Клиент не найден' });
    const client = await Client.findById(req.params.id); if (!client) return res.status(404).json({ error: 'Клиент не найден' });
    const b = req.body || {}; const changes = {};
    for (const k of ['name', 'company', 'note']) if (b[k] !== undefined && str(b[k], 5000) !== (client[k] || '')) { changes[k] = true; client[k] = str(b[k], 5000); }
    if (Array.isArray(b.phones)) { client.phones = [...new Set(b.phones.map(normPhone).filter(Boolean))].slice(0, 10); changes.phones = true; }
    if (Array.isArray(b.emails)) { client.emails = [...new Set(b.emails.map(normEmail).filter((e) => e.includes('@')))].slice(0, 10); changes.emails = true; }
    await client.save(); await log(req, 'client_updated', 'client', client._id, changes);
    res.json({ ok: true });
  });

  // --- задачи ---
  api.get('/tasks', async (req, res) => {
    const q = req.isAdmin && req.query.scope === 'all' ? {} : { assigneeId: req.user._id };
    if (req.query.state !== 'all') q.done = false;
    const tasks = await Task.find(q).sort({ done: 1, dueAt: 1 }).limit(300).lean();
    const deals = await Deal.find({ _id: { $in: tasks.map((t) => t.dealId).filter(Boolean) } }, { num: 1, title: 1 }).lean();
    const byId = Object.fromEntries(deals.map((d) => [String(d._id), d]));
    res.json({ tasks: tasks.map((t) => ({ ...t, deal: byId[String(t.dealId)] || null })) });
  });
  api.post('/tasks', async (req, res) => {
    const b = req.body || {}; const text = str(b.text, 1000); if (!text) return res.status(400).json({ error: 'Опишите задачу' });
    let dealId = null;
    if (b.dealId) { req.params.id = b.dealId; const deal = await loadDeal(req, res); if (!deal) return; dealId = deal._id; }
    const assigneeId = req.isAdmin && mongoose.isValidObjectId(b.assigneeId) ? b.assigneeId : req.user._id;
    const dueAt = b.dueAt ? new Date(b.dueAt) : null;
    if (dueAt && isNaN(dueAt)) return res.status(400).json({ error: 'Неверная дата' });
    const task = await Task.create({ dealId, text, dueAt, assigneeId, createdBy: req.user._id });
    await log(req, 'task_created', dealId ? 'deal' : 'task', dealId || task._id, { text: text.slice(0, 200) });
    res.json({ id: task._id });
  });
  api.patch('/tasks/:id', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Задача не найдена' });
    const task = await Task.findOne({ _id: req.params.id, ...(req.isAdmin ? {} : { assigneeId: req.user._id }) });
    if (!task) return res.status(404).json({ error: 'Задача не найдена' });
    const b = req.body || {};
    if (b.done !== undefined) { task.done = !!b.done; task.doneAt = task.done ? new Date() : null; }
    if (b.text !== undefined) task.text = str(b.text, 1000) || task.text;
    if (b.dueAt !== undefined) task.dueAt = b.dueAt ? new Date(b.dueAt) : null;
    await task.save(); await log(req, task.done ? 'task_done' : 'task_updated', task.dealId ? 'deal' : 'task', task.dealId || task._id, { text: task.text.slice(0, 200) });
    res.json({ ok: true });
  });

  // --- сотрудники и журнал (администратор) ---
  api.get('/users', adminOnly, async (req, res) => res.json({ users: (await User.find().sort({ role: 1, name: 1 }).lean()).map(userView) }));
  api.post('/users', adminOnly, async (req, res) => {
    const b = req.body || {}; const email = normEmail(b.email);
    if (!email.includes('@')) return res.status(400).json({ error: 'Укажите почту' });
    const problem = passwordProblem(b.password); if (problem) return res.status(400).json({ error: problem });
    if (await User.exists({ email })) return res.status(400).json({ error: 'Пользователь с такой почтой уже есть' });
    const user = await User.create({ name: str(b.name, 100) || email, email, role: b.role === 'admin' ? 'admin' : 'staff', passHash: hashPassword(b.password) });
    await log(req, 'user_created', 'user', user._id, { email, role: user.role });
    res.json({ user: userView(user) });
  });
  api.patch('/users/:id', adminOnly, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Не найден' });
    const user = await User.findById(req.params.id); if (!user) return res.status(404).json({ error: 'Не найден' });
    const b = req.body || {}; const changes = {};
    if (String(user._id) === String(req.user._id) && (b.active === false || b.role === 'staff')) return res.status(400).json({ error: 'Нельзя отключить или понизить себя' });
    if (b.name !== undefined) { user.name = str(b.name, 100) || user.name; changes.name = true; }
    if (b.role !== undefined) { user.role = b.role === 'admin' ? 'admin' : 'staff'; changes.role = user.role; }
    if (b.active !== undefined) { user.active = !!b.active; changes.active = user.active; if (!user.active) await Session.deleteMany({ userId: user._id }); }
    if (b.password) { const p = passwordProblem(b.password); if (p) return res.status(400).json({ error: p }); user.passHash = hashPassword(b.password); changes.password = true; await Session.deleteMany({ userId: user._id }); }
    await user.save(); await log(req, 'user_updated', 'user', user._id, changes);
    res.json({ user: userView(user) });
  });
  api.get('/log', adminOnly, async (req, res) => {
    const items = await Log.find().sort({ at: -1 }).limit(Math.min(500, Number(req.query.limit) || 200)).lean();
    res.json({ items });
  });

  api.use((err, req, res, next) => { console.error('CRM:', err.message); res.status(500).json({ error: 'Ошибка сервера CRM' }); });
  app.use('/crm/api', api);

  const boot = async () => {
    for (const [from, to] of Object.entries(OLD_STATUS)) {
      const r = await Deal.updateMany({ status: from }, { $set: { status: to } });
      if (r.modifiedCount) console.log(`CRM: статус «${from}» → «${to}»: ${r.modifiedCount}`);
    }
    await importForms(FormSubmission);
  };
  mongoose.connection.once('open', () => { boot().catch((e) => console.warn('CRM boot:', e.message)); });
  if (mongoose.connection.readyState === 1) boot().catch((e) => console.warn('CRM boot:', e.message));

  return { onFormSubmission: (data, submission) => onFormSubmission(data, submission).catch((e) => console.warn('CRM: заявка не создана:', e.message)) };
};

module.exports.setupCode = setupCode;
