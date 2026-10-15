// Канал «Почта» для CRM: корпоративный ящик через IMAP (входящие и «Отправленные») и SMTP (ответы).
// - каждую минуту забирает новые письма; при первом запуске начинает «с этого момента», старые письма не трогает;
// - письмо клиента → заявка (или в существующую — по цепочке писем или по адресу клиента);
// - письма, отправленные из обычной почты клиентам из CRM, тоже попадают в историю;
// - ответ из CRM уходит с корпоративного адреса, в цепочку (Re:), и сохраняется в «Отправленных» ящика.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const MailComposer = require('nodemailer/lib/mail-composer');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

const FILES_DIR = path.join(__dirname, '..', 'data', 'crm-files');
const MAX_FILE = 20 * 1024 * 1024; // вложения крупнее не сохраняем
const MAX_SEND = 15 * 1024 * 1024; // суммарный размер вложений в ответе

module.exports = function mailChannel({ api, Deal, Client, Counter, log, findOrCreateClient, addInbound, loadDeal, adminOnly, str, normEmail }) {
  const user = process.env.SMTP_USER; const pass = process.env.SMTP_PASS;
  const enabled = !!(user && pass) && process.env.CRM_MAIL !== 'off';
  const address = normEmail(user);
  const state = { enabled, address, lastSync: null, lastError: null, received: 0, skipped: 0, running: false };

  const imapOpts = () => ({
    host: process.env.IMAP_HOST || 'imap.mail.ru', port: Number(process.env.IMAP_PORT) || 993, secure: true,
    auth: { user, pass }, logger: false, socketTimeout: 60000,
  });
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mail.ru', port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT || 465) === 465, auth: { user, pass },
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
  });

  // ---------- разбор писем ----------
  // Убираем цитату предыдущего письма, чтобы в CRM был только новый текст
  function stripQuote(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const out = [];
    for (const l of lines) {
      if (/^-{2,}\s*(Original Message|Исходное сообщение|Пересылаемое сообщение)/i.test(l)) break;
      if (/^(On .{5,120} wrote:|.{5,160}(пишет|написал\(а\)|написал|написала):)\s*$/i.test(l.trim())) break;
      if (/^>/.test(l)) continue;
      out.push(l);
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function saveAttachments(parsed) {
    const list = [];
    for (const a of parsed.attachments || []) {
      if (!a.content || a.related) continue; // картинки из подписи и т.п. пропускаем
      if (a.size > MAX_FILE) { list.push({ name: a.filename || 'файл', size: a.size, type: a.contentType, skipped: true }); continue; }
      const id = crypto.randomBytes(16).toString('hex');
      fs.mkdirSync(FILES_DIR, { recursive: true });
      fs.writeFileSync(path.join(FILES_DIR, id), a.content);
      list.push({ id, name: a.filename || 'вложение', size: a.size, type: a.contentType });
    }
    return list;
  }
  const isBulk = (p) => {
    const h = p.headers;
    const auto = String(h.get('auto-submitted') || '').toLowerCase();
    // mailparser складывает заголовки List-* в один заголовок «list»
    return (auto && auto !== 'no') || h.has('list') || h.has('list-unsubscribe') || h.has('list-id') || /bulk|list|junk/i.test(String(h.get('precedence') || ''));
  };
  const addrList = (x) => (x && x.value ? x.value.map((v) => normEmail(v.address)).filter(Boolean) : []);

  async function findThreadDeal(parsed) {
    const ids = [parsed.inReplyTo].concat(Array.isArray(parsed.references) ? parsed.references : parsed.references ? [parsed.references] : []).filter(Boolean);
    if (!ids.length) return null;
    return Deal.findOne({ 'messages.meta.messageId': { $in: ids } }).sort({ lastContactAt: -1 });
  }

  async function handleInbound(parsed) {
    const from = parsed.from && parsed.from.value && parsed.from.value[0];
    const email = normEmail(from && from.address);
    if (!email || email === address) { state.skipped++; return; } // свои письма (например, уведомления о заявках с сайта)
    if (isBulk(parsed)) { state.skipped++; return; } // рассылки и автоответы
    const messageId = parsed.messageId;
    if (messageId && await Deal.exists({ 'messages.meta.messageId': messageId })) return;
    const meta = {
      messageId, subject: str(parsed.subject, 500), from: email, fromName: str(from.name, 200),
      to: addrList(parsed.to), cc: addrList(parsed.cc), inReplyTo: parsed.inReplyTo || null,
      references: Array.isArray(parsed.references) ? parsed.references : parsed.references ? [parsed.references] : [],
      attachments: saveAttachments(parsed),
    };
    const text = stripQuote(parsed.text || (parsed.html ? String(parsed.html).replace(/<[^>]+>/g, ' ') : '')) || '(пустое письмо)';
    const at = parsed.date || new Date();
    const thread = await findThreadDeal(parsed);
    if (thread) {
      thread.messages.push({ dir: 'in', channel: 'email', text: str(text, 20000), at, meta });
      thread.unread = true; thread.comm = 'new';
      if (!thread.lastContactAt || at > thread.lastContactAt) thread.lastContactAt = at;
      await thread.save();
    } else {
      const client = await findOrCreateClient({ name: from.name || email.split('@')[0], email });
      await addInbound({ client, channel: 'email', sourceLabel: 'Почта', title: str(parsed.subject, 200) || 'Письмо', text, at, meta });
    }
    state.received++;
  }

  // Письмо, отправленное из обычной почты (не из CRM), — в историю клиента
  async function handleSent(parsed) {
    const messageId = parsed.messageId;
    if (messageId && await Deal.exists({ 'messages.meta.messageId': messageId })) return; // уже есть (отправлено из CRM)
    const to = addrList(parsed.to).concat(addrList(parsed.cc)).filter((e) => e !== address);
    if (!to.length) return;
    let deal = await findThreadDeal(parsed);
    if (!deal) {
      const client = await Client.findOne({ emails: { $in: to } });
      if (!client) return; // письма людям, которых нет в CRM, не тащим
      deal = await Deal.findOne({ clientId: client._id }).sort({ lastContactAt: -1 });
      if (!deal) return;
    }
    const at = parsed.date || new Date();
    deal.messages.push({ dir: 'out', channel: 'email', text: str(stripQuote(parsed.text || ''), 20000) || '(без текста)', at,
      meta: { messageId, subject: str(parsed.subject, 500), to, via: 'mailbox', status: 'sent', attachments: saveAttachments(parsed) } });
    if (!deal.lastContactAt || at > deal.lastContactAt) deal.lastContactAt = at;
    deal.comm = 'wait_client';
    await deal.save();
  }

  let sentPath = null;
  async function findSent(client) {
    if (sentPath) return sentPath;
    const boxes = await client.list();
    const box = boxes.find((b) => b.specialUse === '\\Sent') || boxes.find((b) => /^(sent|отправленные)$/i.test(b.name));
    sentPath = box ? box.path : null;
    return sentPath;
  }

  async function syncBox(client, box, key, handler) {
    const lock = await client.getMailboxLock(box);
    try {
      const mb = client.mailbox;
      const st = await Counter.findById(key);
      const validity = String(mb.uidValidity);
      if (!st || st.validity !== validity) {
        // первый запуск (или ящик пересоздан): начинаем с текущего момента
        await Counter.findByIdAndUpdate(key, { seq: mb.uidNext - 1, validity }, { upsert: true });
        return;
      }
      let last = st.seq;
      if (mb.uidNext - 1 <= last) return;
      for await (const msg of client.fetch(`${last + 1}:*`, { uid: true, source: true }, { uid: true })) {
        if (msg.uid <= last) continue;
        try {
          const parsed = await simpleParser(msg.source);
          await handler(parsed);
        } catch (e) { console.warn('CRM почта: письмо не обработано', box, msg.uid, e.message); }
        last = msg.uid;
        await Counter.findByIdAndUpdate(key, { seq: last, validity });
      }
    } finally { lock.release(); }
  }

  async function sync() {
    if (!enabled || state.running) return;
    state.running = true;
    const client = new ImapFlow(imapOpts());
    try {
      await client.connect();
      await syncBox(client, 'INBOX', 'mail_inbox', handleInbound);
      const sent = await findSent(client);
      if (sent) await syncBox(client, sent, 'mail_sent', handleSent);
      state.lastSync = new Date(); state.lastError = null;
    } catch (e) {
      state.lastError = e.responseText || e.message;
      console.warn('CRM почта: ошибка синхронизации:', state.lastError);
    } finally {
      state.running = false;
      try { await client.logout(); } catch (e) { /* соединение уже закрыто */ }
    }
  }

  // Положить отправленное письмо в «Отправленные», если почтовый сервис не сделал это сам
  async function storeInSent(raw, messageId) {
    const client = new ImapFlow(imapOpts());
    try {
      await client.connect();
      const sent = await findSent(client); if (!sent) return;
      const lock = await client.getMailboxLock(sent);
      try {
        const found = await client.search({ header: { 'message-id': messageId } }, { uid: true });
        if (!found || !found.length) await client.append(sent, raw, ['\\Seen']);
      } finally { lock.release(); }
    } catch (e) { console.warn('CRM почта: не удалось сохранить в «Отправленные»:', e.message); }
    finally { try { await client.logout(); } catch (e) { /* */ } }
  }

  async function sendMessage(deal, m) {
    const meta = m.meta || {};
    const files = (meta.attachments || []).filter((a) => a.id).map((a) => ({ filename: a.name, contentType: a.type, path: path.join(FILES_DIR, a.id) }));
    const mail = {
      from: { name: 'Пушистый Завод', address: user }, to: meta.to, cc: meta.cc && meta.cc.length ? meta.cc : undefined,
      subject: meta.subject, text: m.text, messageId: meta.messageId,
      inReplyTo: meta.inReplyTo || undefined, references: meta.references && meta.references.length ? meta.references : undefined,
      attachments: files,
    };
    const raw = await new MailComposer(mail).compile().build();
    await transporter.sendMail({ envelope: { from: user, to: [].concat(meta.to, meta.cc || []) }, raw });
    setTimeout(() => storeInSent(raw, meta.messageId), 5000);
  }

  // ---------- маршруты ----------
  api.get('/channels', async (req, res) => {
    res.json({ email: { enabled: state.enabled, address: state.address, lastSync: state.lastSync, lastError: state.lastError, received: state.received, skipped: state.skipped } });
  });

  const recentKeys = new Map(); // защита от повторной отправки (двойной клик, повтор запроса)
  setInterval(() => { const now = Date.now(); for (const [k, t] of recentKeys) if (now - t > 10 * 60 * 1000) recentKeys.delete(k); }, 60000).unref();

  api.post('/deals/:id/reply', async (req, res) => {
    if (!enabled) return res.status(400).json({ error: 'Почта не подключена' });
    const deal = await loadDeal(req, res); if (!deal) return;
    const b = req.body || {};
    const key = str(b.key, 100);
    if (!key) return res.status(400).json({ error: 'Некорректный запрос' });
    if (recentKeys.has(key) || deal.messages.some((m) => m.meta && m.meta.key === key)) return res.json({ ok: true, duplicate: true });
    recentKeys.set(key, Date.now());
    const text = str(b.text, 50000); if (!text) return res.status(400).json({ error: 'Пустое письмо' });
    const to = [].concat(b.to || []).map(normEmail).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e));
    if (!to.length) return res.status(400).json({ error: 'Укажите адрес получателя' });
    const cc = [].concat(b.cc || []).map(normEmail).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e));
    // вложения: base64 из интерфейса → файлы
    const atts = []; let total = 0;
    for (const f of [].concat(b.attachments || []).slice(0, 10)) {
      const buf = Buffer.from(String(f.data || ''), 'base64'); total += buf.length;
      if (total > MAX_SEND) return res.status(400).json({ error: 'Вложения больше 15 МБ — отправьте ссылкой' });
      const id = crypto.randomBytes(16).toString('hex');
      fs.mkdirSync(FILES_DIR, { recursive: true }); fs.writeFileSync(path.join(FILES_DIR, id), buf);
      atts.push({ id, name: str(f.name, 200) || 'файл', size: buf.length, type: str(f.type, 100) || 'application/octet-stream' });
    }
    // цепочка: отвечаем на последнее письмо клиента
    const lastIn = [...deal.messages].reverse().find((m) => m.channel === 'email' && m.meta && m.meta.messageId);
    const baseSubject = str(b.subject, 300) || (lastIn && lastIn.meta.subject) || deal.title || 'Пушистый Завод';
    // тема: «Re: …» без повторов «Re: Re: Re:»
    const subject = str(b.subject, 300) ? baseSubject.replace(/^(\s*re\s*:\s*){2,}/i, 'Re: ') : 'Re: ' + baseSubject.replace(/^(\s*(re|ответ)\s*:\s*)+/i, '');
    const refs = lastIn ? [].concat(lastIn.meta.references || [], lastIn.meta.messageId).filter(Boolean).slice(-20) : [];
    const domain = (user.split('@')[1] || 'pushistyzavod.ru');
    const meta = { key, to, cc, subject, messageId: `<crm.${crypto.randomBytes(12).toString('hex')}@${domain}>`, inReplyTo: lastIn ? lastIn.meta.messageId : null, references: refs, status: 'sending', attachments: atts, via: 'crm' };
    deal.messages.push({ dir: 'out', channel: 'email', text, at: new Date(), userId: req.user._id, meta });
    await deal.save();
    const m = deal.messages[deal.messages.length - 1];
    try {
      await sendMessage(deal, m);
      m.meta = { ...m.meta, status: 'sent' }; deal.comm = 'wait_client'; deal.lastContactAt = new Date();
      if (deal.status === 'new') deal.status = 'calc';
      await deal.save();
      await log(req, 'email_sent', 'deal', deal._id, { text: 'письмо: ' + subject });
      res.json({ ok: true, status: 'sent' });
    } catch (e) {
      m.meta = { ...m.meta, status: 'error', error: e.response || e.message }; await deal.save();
      await log(req, 'email_failed', 'deal', deal._id, { text: e.message });
      res.json({ ok: false, status: 'error', error: 'Письмо не отправлено: ' + (e.response || e.message) });
    }
  });

  api.post('/deals/:id/messages/:mid/retry', async (req, res) => {
    const deal = await loadDeal(req, res); if (!deal) return;
    const m = deal.messages.id(req.params.mid);
    if (!m || m.channel !== 'email' || !m.meta || m.meta.status !== 'error') return res.status(400).json({ error: 'Повторить можно только неотправленное письмо' });
    m.meta = { ...m.meta, status: 'sending' }; await deal.save();
    try {
      await sendMessage(deal, m);
      m.meta = { ...m.meta, status: 'sent', error: null }; deal.comm = 'wait_client'; deal.lastContactAt = new Date(); await deal.save();
      await log(req, 'email_sent', 'deal', deal._id, { text: 'повторно: ' + m.meta.subject });
      res.json({ ok: true });
    } catch (e) {
      m.meta = { ...m.meta, status: 'error', error: e.response || e.message }; await deal.save();
      res.json({ ok: false, error: 'Снова не отправлено: ' + (e.response || e.message) });
    }
  });

  // Вложение — только тем, у кого есть доступ к заявке
  api.get('/files/:fid', async (req, res) => {
    const fid = String(req.params.fid);
    if (!/^[a-f0-9]{32}$/.test(fid)) return res.status(404).end();
    const scope = req.isAdmin ? {} : { assigneeId: req.user._id };
    const deal = await Deal.findOne({ ...scope, 'messages.meta.attachments.id': fid }, { messages: 1 });
    if (!deal) return res.status(404).json({ error: 'Файл не найден' });
    let att = null;
    for (const m of deal.messages) for (const a of (m.meta && m.meta.attachments) || []) if (a.id === fid) att = a;
    const file = path.join(FILES_DIR, fid);
    if (!att || !fs.existsSync(file)) return res.status(404).json({ error: 'Файл не найден' });
    const inline = /^image\/(png|jpe?g|gif|webp)$/i.test(att.type || '');
    res.set('Content-Type', inline ? att.type : 'application/octet-stream');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(att.name || 'file')}`);
    fs.createReadStream(file).pipe(res);
  });

  if (enabled) {
    setTimeout(sync, 10000);
    setInterval(sync, 60000).unref();
    console.log('✉️  CRM: почта подключена —', address);
  }
  return { state, sync };
};
