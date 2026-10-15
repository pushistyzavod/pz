// CRM «Пушистый Завод» — интерфейс (без сборки и зависимостей).
// Маршруты: #/ — рабочий стол, #/deals/<вид>, #/deal/<id>, #/messages, #/clients, #/client/<id>, #/tasks, #/settings, #/more
(function () {
  'use strict';
  var app = document.getElementById('app');
  var ME = null, META = null, DASH = null, timer = null;

  // ---------- утилиты ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api(path, opts) {
    opts = opts || {};
    return fetch('/crm/api' + path, {
      method: opts.method || 'GET', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CRM': '1' },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (r.status === 401 && !opts.noAuth) { ME = null; showLogin(); throw new Error('Нужно войти'); }
        if (!r.ok) throw new Error(d.error || ('Ошибка ' + r.status));
        return d;
      });
    }, function () { throw new Error('Нет связи с сервером. Проверьте интернет.'); });
  }
  function toast(msg, err) {
    var t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, err ? 5000 : 2500);
  }
  var MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(d, withTime) {
    if (!d) return '—'; d = new Date(d); var now = new Date();
    var t = pad(d.getHours()) + ':' + pad(d.getMinutes());
    var day = new Date(d.getFullYear(), d.getMonth(), d.getDate()), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diff = Math.round((today - day) / 86400000);
    var s = diff === 0 ? 'сегодня' : diff === 1 ? 'вчера' : diff === -1 ? 'завтра' : d.getDate() + ' ' + MON[d.getMonth()] + (d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : '');
    return withTime === false ? s : s + ', ' + t;
  }
  function money(v) { return v == null || v === '' ? '—' : Number(v).toLocaleString('ru-RU') + ' ₽'; }
  function statusName(k) { var s = (META.statuses || []).filter(function (x) { return x[0] === k; })[0]; return s ? s[1] : k; }
  function badge(k) { return '<span class="st st-' + esc(k) + '">' + esc(statusName(k)) + '</span>'; }
  function userName(id) { var u = (META.users || []).filter(function (x) { return String(x.id) === String(id); })[0]; return u ? u.name : (id ? 'сотрудник' : 'не назначен'); }
  var SRC = { form: '🌐 Сайт', email: '✉️ Почта', telegram: '✈️ Telegram', max: '💬 MAX', manual: '✍️ Вручную' };
  function src(s) { return '<span class="src" title="' + esc(s && s.label) + '">' + esc(SRC[s && s.type] || (s && s.label) || '—') + '</span>'; }
  function phoneFmt(p) { p = String(p || ''); return p.length === 10 ? '+7 ' + p.slice(0, 3) + ' ' + p.slice(3, 6) + '-' + p.slice(6, 8) + '-' + p.slice(8) : p; }
  function isAdmin() { return ME && ME.role === 'admin'; }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function on(sel, ev, fn, root) { Array.prototype.forEach.call((root || document).querySelectorAll(sel), function (el) { el.addEventListener(ev, fn); }); }

  // ---------- вход ----------
  function showLogin() {
    clearInterval(timer);
    api('/setup', { noAuth: true }).then(function (s) { s.needed ? renderSetup() : renderLogin(); }, function () { renderLogin(); });
  }
  function renderLogin() {
    document.title = 'Вход — CRM';
    app.innerHTML = '<div class="login"><form class="card" id="lf"><h1>CRM «Пушистый Завод»</h1><p class="muted small">Войдите, чтобы работать с заявками</p>'
      + '<label>Почта</label><input name="email" type="email" autocomplete="username" required>'
      + '<label>Пароль</label><input name="password" type="password" autocomplete="current-password" required>'
      + '<button class="btn" type="submit">Войти</button><div class="err-text" id="le"></div></form></div>';
    qs('#lf').addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target, b = qs('button', f); b.disabled = true;
      api('/login', { method: 'POST', body: { email: f.email.value, password: f.password.value }, noAuth: true })
        .then(function (d) { ME = d.user; start(); }, function (err) { qs('#le').textContent = err.message; b.disabled = false; });
    });
  }
  function renderSetup() {
    document.title = 'Настройка — CRM';
    app.innerHTML = '<div class="login"><form class="card" id="sf"><h1>Первый запуск CRM</h1><p class="muted small">Создайте учётную запись администратора. Код настройки выдаёт разработчик.</p>'
      + '<label>Код настройки</label><input name="code" required autocomplete="off">'
      + '<label>Ваше имя</label><input name="name" required><label>Почта для входа</label><input name="email" type="email" required>'
      + '<label>Пароль (не короче 10 символов)</label><input name="password" type="password" minlength="10" autocomplete="new-password" required>'
      + '<button class="btn" type="submit">Создать и войти</button><div class="err-text" id="se"></div></form></div>';
    qs('#sf').addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target, b = qs('button', f); b.disabled = true;
      api('/setup', { method: 'POST', noAuth: true, body: { code: f.code.value.trim(), name: f.name.value, email: f.email.value, password: f.password.value } })
        .then(function (d) { ME = d.user; start(); }, function (err) { qs('#se').textContent = err.message; b.disabled = false; });
    });
  }

  // ---------- каркас ----------
  function shell(active, title, body, opts) {
    opts = opts || {};
    var nav = navItems().map(function (n) {
      return '<a href="' + n[3] + '" class="' + (n[0] === active ? 'on' : '') + '"><span class="ic">' + n[1] + '</span>' + esc(n[2])
        + (n[4] ? '<span class="cnt ' + (n[5] || '') + '">' + n[4] + '</span>' : '') + '</a>';
    }).join('');
    var D = DASH || {};
    var bottom = BOTTOM.map(function (n) {
      var cnt = n[4] ? (D[n[4]] || 0) : 0;
      var isOn = n[0] === active || (n[0] === 'more' && ['new', 'closed', 'messages', 'all', 'mine', 'clients', 'tasks', 'settings', 'more'].indexOf(active) >= 0);
      return '<a href="' + n[3] + '" class="' + (isOn ? 'on' : '') + '"><span class="ic">' + n[1] + '</span>' + n[2] + (cnt ? '<span class="cnt">' + cnt + '</span>' : '') + '</a>';
    }).join('');
    app.innerHTML = '<div class="layout"><aside class="side"><div class="brand"><img src="/prototype/images/logo.png" alt="">Пушистый Завод</div><nav class="nav">' + nav + '</nav>'
      + '<div class="me"><b>' + esc(ME.name) + '</b>' + (isAdmin() ? 'Администратор' : 'Сотрудник') + ' · <a href="#" id="logout">Выйти</a></div></aside>'
      + '<div class="main"><div class="top">' + (opts.back ? '<button class="btn ghost small back" onclick="history.back()">←</button>' : '')
      + '<h1>' + esc(title) + '</h1><div class="grow"></div>' + (opts.actions || '') + '</div><div class="content">' + body + '</div></div>'
      + '<nav class="bottom">' + bottom + '</nav></div>';
    var lo = qs('#logout'); if (lo) lo.addEventListener('click', logout);
    var unread = (DASH && DASH.unread) || 0;
    document.title = (unread ? '(' + unread + ') ' : '') + title + ' — CRM';
  }
  function logout(e) { if (e) e.preventDefault(); api('/logout', { method: 'POST' }).then(function () { ME = null; showLogin(); }, function () { ME = null; showLogin(); }); }
  function loading(active, title) { shell(active, title, '<div class="empty">Загрузка…</div>'); }
  function fail(err) { if (err && err.message !== 'Нужно войти') { var c = qs('.content'); if (c) c.innerHTML = '<div class="empty">' + esc(err.message) + '</div>'; toast(err.message, true); } }

  // ---------- шаги производства ----------
  var STEPS = [['new', '📥', 'Заявка'], ['calc', '🧮', 'Расчёт'], ['sample', '🧸', 'Образец'], ['production', '🏭', 'Партия в работе'], ['done', '✅', 'Готово']];
  // даты шагов хранятся как календарный день (полночь UTC) — читаем без сдвига часового пояса
  function dateOnly(d) { if (!d) return ''; d = new Date(d); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function localToday() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function day(d) { if (!d) return ''; d = new Date(d); return fmt(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12), false); }
  function daysSince(d) { if (!d) return ''; var x = new Date(d), start = new Date(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()); var n = Math.floor((new Date() - start) / 86400000); return n <= 0 ? 'сегодня' : n + ' дн.'; }
  function yes(text) { return '<span class="ok-chip">✅ ' + esc(text) + '</span>'; }
  function no(text) { return '<span class="no-chip">' + esc(text) + '</span>'; }
  function wait(text) { return '<span class="wait-chip">⏳ ' + esc(text) + '</span>'; }

  function navItems() {
    var c = (DASH && DASH.counts) || {}, D = DASH || {};
    var items = [
      ['dash', '🏠', 'Рабочий стол', '#/'],
      ['new', '📥', 'Новые заявки', '#/deals/new', c.new || 0],
      ['calc', '🧮', 'Ждут расчёт', '#/deals/calc', D.notCalculated || 0],
      ['sample', '🧸', 'Образцы', '#/deals/sample', c.sample || 0, 'grey'],
      ['production', '🏭', 'Партии в работе', '#/deals/production', c.production || 0, 'grey'],
      ['closed', '✅', 'Готовые', '#/deals/closed'],
      ['messages', '💬', 'Сообщения', '#/messages', D.unread || 0],
      isAdmin() ? ['all', '📋', 'Все заявки', '#/deals/all', D.unassigned || 0, 'grey'] : null,
      ['mine', '👤', 'Мои заявки', '#/deals/mine', D.mine || 0, 'grey'],
      ['clients', '👥', 'Клиенты', '#/clients'],
      ['tasks', '⏰', 'Задачи', '#/tasks', (D.tasks && D.tasks.length) || 0],
      ['settings', '⚙️', isAdmin() ? 'Сотрудники и настройки' : 'Настройки', '#/settings'],
    ];
    return items.filter(Boolean);
  }
  var BOTTOM = [['dash', '🏠', 'Главная', '#/'], ['calc', '🧮', 'Расчёт', '#/deals/calc', 'notCalculated'], ['sample', '🧸', 'Образцы', '#/deals/sample'], ['production', '🏭', 'В работе', '#/deals/production'], ['more', '☰', 'Ещё', '#/more', 'unread']];

  // ---------- рабочий стол: конвейер заказов ----------
  function pageDash() {
    loading('dash', 'Рабочий стол');
    refreshDash().then(function () {
      var c = DASH.counts || {};
      var flow = '<div class="flow">' + [
        ['#/deals/new', '📥', 'Новые заявки', c.new || 0, c.new ? 'Нужно ответить' : 'Все разобраны'],
        ['#/deals/calc', '🧮', 'Ждут расчёт', c.calc || 0, DASH.notCalculated ? 'Не посчитано: ' + DASH.notCalculated : 'Все посчитаны'],
        ['#/deals/sample', '🧸', 'Сигнальные образцы', c.sample || 0, DASH.samplesUnpaid ? 'Не оплачено: ' + DASH.samplesUnpaid : ''],
        ['#/deals/production', '🏭', 'Партии в работе', c.production || 0, DASH.productionUnpaid ? 'Не оплачено: ' + DASH.productionUnpaid : ''],
        ['#/deals/closed', '✅', 'Готово', c.done || 0, ''],
      ].map(function (x, i) {
        var hot = /Нужно|Не /.test(x[4]);
        return (i ? '<div class="arrow">→</div>' : '') + '<a class="fstep' + (hot ? ' hot' : '') + '" href="' + x[0] + '"><span class="fi">' + x[1] + '</span><b>' + x[3] + '</b><span class="fl">' + x[2] + '</span>' + (x[4] ? '<span class="fn">' + esc(x[4]) + '</span>' : '') + '</a>';
      }).join('') + '</div>';
      var stat = function (n, label, href) { return '<a class="stat' + (n ? ' hot' : '') + '" href="' + href + '"><b>' + (n || 0) + '</b><span>' + label + '</span></a>'; };
      var attention = '<div class="stats">' + stat(DASH.unread, 'Непрочитанные сообщения', '#/messages') + stat(DASH.notCalculated, 'Ждут расчёт стоимости', '#/deals/calc?calc=0')
        + stat(DASH.productionUnpaid, 'Партии без оплаты', '#/deals/production?paid=0') + (isAdmin() ? stat(DASH.unassigned, 'Без ответственного', '#/deals/all?unassigned=1') : '') + '</div>';
      var tasks = DASH.tasks.length ? DASH.tasks.map(taskRow).join('') : '<p class="muted small">На сегодня задач нет</p>';
      var body = flow + '<h3 class="sec">Требует внимания</h3>' + attention + '<div class="grid2"><div class="card"><h3>Последние обращения</h3>' + dealCards(DASH.recent, true) + '</div>'
        + '<div class="card"><h3>Задачи на сегодня и просроченные</h3><div id="dtasks">' + tasks + '</div></div></div>';
      shell('dash', 'Рабочий стол', body, { actions: '<button class="btn small" id="newdeal">+ Заявка</button>' });
      bindTasks(qs('#dtasks'), pageDash); qs('#newdeal').addEventListener('click', newDealModal);
    }, fail);
  }

  // ---------- списки по шагам ----------
  var VIEWS = {
    all: ['Все заявки', ''], mine: ['Мои заявки', ''], new: ['Новые заявки', 'Свежие обращения: ответьте клиенту и переведите на расчёт.'],
    calc: ['Ждут расчёт стоимости', 'Сначала — заявки, которые ещё не посчитали. Посчитали — отметьте в заявке «✅ Да, посчитали».'],
    sample: ['Сигнальные образцы', 'Клиенты, которые заказали образец: когда заказали, оплатили ли и готов ли образец.'],
    production: ['Партии в работе', 'Заказанные партии: когда заказали, когда оплатили и сколько дней в работе.'],
    closed: ['Готовые заказы', 'Завершённые партии с датами заказа, оплаты и завершения.'],
  };
  function query(name) { var m = location.hash.match(new RegExp('[?&]' + name + '=([^&]*)')); return m ? decodeURIComponent(m[1]) : ''; }
  function chip(href, label, onState) { return '<a class="chip' + (onState ? ' on' : '') + '" href="' + href + '">' + label + '</a>'; }
  function pageDeals(view, asMessages) {
    var active = asMessages ? 'messages' : view, title = asMessages ? 'Сообщения' : VIEWS[view][0];
    loading(active, title);
    var status = query('status'), term = query('q'), unassigned = query('unassigned'), calc = query('calc'), paid = query('paid');
    var p = '/deals?view=' + (asMessages ? 'messages' : view) + (status ? '&status=' + status : '') + (term ? '&q=' + encodeURIComponent(term) : '') + (unassigned ? '&unassigned=1' : '') + (calc ? '&calc=' + calc : '') + (paid ? '&paid=' + paid : '');
    api(p).then(function (d) {
      var base = '#/' + (asMessages ? 'messages' : 'deals/' + view), chips = '';
      if (view === 'all' || view === 'mine') chips = chip(base, 'Все в работе', !status && !unassigned) + META.statuses.filter(function (s) { return ['done', 'archive'].indexOf(s[0]) < 0; }).map(function (s) { return chip(base + '?status=' + s[0], esc(s[1]), status === s[0]); }).join('') + (isAdmin() && view === 'all' ? chip(base + '?unassigned=1', 'Без ответственного', !!unassigned) : '');
      if (view === 'calc') chips = chip(base, 'Все', !calc) + chip(base + '?calc=0', '⏳ Ещё не посчитали', calc === '0') + chip(base + '?calc=1', '✅ Посчитали', calc === '1');
      if (view === 'production') chips = chip(base, 'Все', !paid) + chip(base + '?paid=0', '❗ Не оплачено', paid === '0') + chip(base + '?paid=1', '✅ Оплачено', paid === '1');
      if (view === 'closed') chips = chip(base, '✅ Готово', status !== 'archive') + chip(base + '?status=archive', 'Отказ / архив', status === 'archive');
      var info = asMessages ? 'Сюда приходят заявки с сайта. Почта, Telegram и MAX подключаются следующими этапами.' : VIEWS[view][1];
      var body = (info ? '<p class="muted small" style="margin-bottom:12px">' + esc(info) + '</p>' : '')
        + '<form class="toolbar" id="sf"><input type="search" name="q" placeholder="Поиск: имя, телефон, почта, №" value="' + esc(term) + '"><button class="btn ghost">Найти</button></form>'
        + (chips ? '<div class="chips">' + chips + '</div>' : '')
        + (d.deals.length ? dealTable(d.deals, asMessages ? 'messages' : view) + '<div class="cards">' + dealCards(d.deals, false, view) + '</div>' : '<div class="empty">Здесь пока пусто</div>');
      shell(active, title, body, { actions: '<button class="btn small" id="newdeal">+ Заявка</button>' });
      qs('#sf').addEventListener('submit', function (e) { e.preventDefault(); location.hash = base + '?q=' + encodeURIComponent(e.target.q.value.trim()); });
      on('tr.row', 'click', function () { location.hash = '#/deal/' + this.getAttribute('data-id'); });
      qs('#newdeal').addEventListener('click', newDealModal);
    }).catch(fail);
  }
  function clientCell(d) {
    return '<div class="name">' + (d.unread ? '<span class="dot"></span> ' : '') + esc(d.client.name || 'Без имени') + (d.client.company ? ' <span class="muted small">· ' + esc(d.client.company) + '</span>' : '') + '</div><div class="small muted">' + esc(d.title) + (d.qty ? ' · ' + esc(d.qty) : '') + '</div>';
  }
  // колонки таблицы зависят от шага
  var COLS = {
    calc: [['Заявка от', function (d) { return day(d.createdAt); }], ['Посчитали?', function (d) { return d.calcDone ? yes('Да, ' + day(d.calcAt)) : wait('Ещё нет'); }], ['Сумма расчёта', function (d) { return d.calcAmount != null ? money(d.calcAmount) : '—'; }]],
    sample: [['Образец заказан', function (d) { return day(d.sampleOrderedAt) || '—'; }], ['Оплата образца', function (d) { return d.samplePaidAt ? yes(day(d.samplePaidAt)) : no('❗ Не оплачен'); }], ['Образец готов', function (d) { return d.sampleDoneAt ? yes(day(d.sampleDoneAt)) : wait('Шьём'); }]],
    production: [['Тираж', function (d) { return esc(d.qty || '—'); }], ['Заказали', function (d) { return day(d.orderedAt) || '—'; }], ['Оплатили', function (d) { return d.paidAt ? yes(day(d.paidAt)) : no('❗ Не оплачено'); }], ['Сумма', function (d) { return money(d.amount); }], ['В работе', function (d) { return daysSince(d.orderedAt); }]],
    closed: [['Тираж', function (d) { return esc(d.qty || '—'); }], ['Заказали', function (d) { return day(d.orderedAt) || '—'; }], ['Оплатили', function (d) { return day(d.paidAt) || '—'; }], ['Завершили', function (d) { return day(d.completedAt) || '—'; }], ['Сумма', function (d) { return money(d.amount); }]],
  };
  var DEFAULT_COLS = [['Последнее сообщение', function (d) { return '<div class="clip">' + (d.lastMessage ? esc(d.lastMessage.text) : '—') + '</div>'; }], ['Шаг', function (d) { return badge(d.status); }], ['Источник', function (d) { return src(d.source); }], ['Контакт', function (d) { return fmt(d.lastContactAt); }]];
  function dealTable(list, view) {
    var cols = COLS[view] || DEFAULT_COLS;
    return '<table class="table"><thead><tr><th>№</th><th>Клиент и заказ</th>' + cols.map(function (c) { return '<th>' + c[0] + '</th>'; }).join('') + '<th>Ответственный</th></tr></thead><tbody>'
      + list.map(function (d) {
        return '<tr class="row' + (d.unread ? ' unread' : '') + '" data-id="' + esc(d.id) + '"><td class="muted">' + esc(d.num) + '</td><td>' + clientCell(d) + '</td>'
          + cols.map(function (c) { return '<td class="small">' + c[1](d) + '</td>'; }).join('') + '<td class="small">' + esc(userName(d.assigneeId)) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  function stageLine(d, view) {
    if (view === 'calc') return d.calcDone ? yes('Посчитали ' + day(d.calcAt)) + (d.calcAmount != null ? ' <b>' + money(d.calcAmount) + '</b>' : '') : wait('Ещё не посчитали');
    if (view === 'sample') return 'Заказан: ' + (day(d.sampleOrderedAt) || '—') + ' · ' + (d.samplePaidAt ? yes('оплачен ' + day(d.samplePaidAt)) : no('❗ не оплачен')) + ' · ' + (d.sampleDoneAt ? yes('готов') : wait('шьём'));
    if (view === 'production') return 'Заказали: ' + (day(d.orderedAt) || '—') + ' · ' + (d.paidAt ? yes('оплатили ' + day(d.paidAt)) : no('❗ не оплачено')) + (d.amount != null ? ' · ' + money(d.amount) : '');
    if (view === 'closed') return 'Заказ ' + (day(d.orderedAt) || '—') + ' · оплата ' + (day(d.paidAt) || '—') + ' · готово ' + (day(d.completedAt) || '—');
    return '';
  }
  function dealCards(list, compact, view) {
    if (!list.length) return '<p class="muted small">Пока пусто</p>';
    return list.map(function (d) {
      var line = stageLine(d, view);
      return '<a class="dcard' + (d.unread ? ' unread' : '') + '" href="#/deal/' + esc(d.id) + '"><div class="l1">' + (d.unread ? '<span class="dot"></span>' : '') + '<span class="name">' + esc(d.client.name || 'Без имени') + '</span>' + badge(d.status) + '</div>'
        + (line ? '<div class="stage-line">' + line + '</div>' : '<div class="clip">' + (d.lastMessage ? esc(d.lastMessage.text) : esc(d.title)) + '</div>')
        + '<div class="l3"><span>№' + esc(d.num) + ' · ' + esc(d.title) + (d.qty ? ' · ' + esc(d.qty) : '') + '</span><span>' + (compact ? fmt(d.lastContactAt) : esc(userName(d.assigneeId))) + '</span></div></a>';
    }).join('');
  }

  // ---------- карточка заявки ----------
  var LOG = { deal_created: 'создал(а) заявку', deal_updated: 'изменил(а) заявку', comment_added: 'добавил(а) комментарий', task_created: 'поставил(а) задачу', task_done: 'выполнил(а) задачу', task_updated: 'изменил(а) задачу' };
  function changesText(d) {
    if (!d) return '';
    var out = [], L = META.labels || {};
    if (d.status) out.push('шаг: ' + statusName(d.status[0]) + ' → ' + statusName(d.status[1]));
    if (d.assignee) out.push('ответственный: ' + userName(d.assignee[0]) + ' → ' + userName(d.assignee[1]));
    if (d.amount) out.push('сумма заказа: ' + money(d.amount[1]));
    if (d.calcAmount) out.push('сумма расчёта: ' + money(d.calcAmount[1]));
    if (d.calcDone) out.push(d.calcDone[1] ? 'расчёт сделан' : 'расчёт не сделан');
    ['calcAt', 'sampleOrderedAt', 'samplePaidAt', 'sampleDoneAt', 'orderedAt', 'paidAt', 'completedAt'].forEach(function (f) { if (d[f]) out.push((L[f] || f) + ': ' + (d[f][1] ? day(d[f][1]) : 'убрано')); });
    if (d.qty) out.push('тираж: ' + (d.qty[1] || '—'));
    if (d.comm) out.push('коммуникация: ' + (META.comm[d.comm[1]] || '—'));
    if (d.title) out.push('название');
    if (d.orderDetails) out.push('детали заказа');
    if (d.text) out.push('«' + d.text + '»');
    return out.join('; ');
  }
  function dateField(id, label, value) { return '<div class="field"><label>' + label + '</label><input type="date" id="' + id + '" value="' + dateOnly(value) + '"></div>'; }
  function pageDeal(id) {
    loading('', 'Заявка');
    api('/deals/' + id).then(function (d) {
      var deal = d.deal, client = d.client || {};
      if (deal.unread) api('/deals/' + id + '/read', { method: 'POST' }).then(refreshDash, function () {});
      var curIdx = STEPS.map(function (s) { return s[0]; }).indexOf(deal.status);
      var archived = deal.status === 'archive';
      var canArchive = isAdmin();
      var stepper = '<div class="stepper">' + STEPS.map(function (s, i) {
        var cls = archived ? '' : i < curIdx ? 'past' : i === curIdx ? 'cur' : '';
        return '<button class="step ' + cls + '" data-step="' + s[0] + '"><span class="si">' + (i < curIdx && !archived ? '✓' : s[1]) + '</span><span class="sl">' + s[2] + '</span></button>';
      }).join('') + '</div>';
      var next = !archived && curIdx >= 0 && curIdx < STEPS.length - 1 ? STEPS[curIdx + 1] : null;
      var stepBar = stepper + '<div class="step-acts">' + (archived ? '<span class="st st-archive">Отказ / архив</span> <button class="btn small ghost" data-step="new">Вернуть в работу</button>'
        : (next ? '<button class="btn pink" data-step="' + next[0] + '">Следующий шаг: ' + next[1] + ' ' + next[2] + ' →</button>' : '<span class="ok-chip">✅ Заказ завершён</span>')
          + (canArchive ? ' <button class="btn small danger" data-step="archive">Отказ / в архив</button>' : '')) + '</div>';

      var stages = '<div class="stages">'
        + '<div class="stage' + (deal.status === 'calc' ? ' cur' : '') + '"><h3>🧮 Расчёт стоимости</h3><div class="field"><label>Посчитали стоимость?</label><div class="yesno"><button type="button" data-calc="0" class="' + (!deal.calcDone ? 'on' : '') + '">⏳ Ещё нет</button><button type="button" data-calc="1" class="' + (deal.calcDone ? 'on yes' : '') + '">✅ Да, посчитали</button></div></div>'
        + '<div class="two">' + dateField('f-calcAt', 'Когда посчитали', deal.calcAt) + '<div class="field"><label>Сумма расчёта, ₽</label><input id="f-calcAmount" inputmode="decimal" value="' + esc(deal.calcAmount == null ? '' : deal.calcAmount) + '"></div></div>'
        + '<div class="field"><label>Тираж</label><input id="f-qty" placeholder="Например: 500 шт" value="' + esc(deal.qty || '') + '"></div></div>'
        + '<div class="stage' + (deal.status === 'sample' ? ' cur' : '') + '"><h3>🧸 Сигнальный образец</h3><div class="three">' + dateField('f-sampleOrderedAt', 'Заказали образец', deal.sampleOrderedAt) + dateField('f-samplePaidAt', 'Оплатили образец', deal.samplePaidAt) + dateField('f-sampleDoneAt', 'Образец готов', deal.sampleDoneAt) + '</div></div>'
        + '<div class="stage' + (deal.status === 'production' ? ' cur' : '') + '"><h3>🏭 Партия</h3><div class="three">' + dateField('f-orderedAt', 'Заказали партию', deal.orderedAt) + dateField('f-paidAt', 'Оплатили партию', deal.paidAt)
        + '<div class="field"><label>Сумма заказа, ₽</label><input id="f-amount" inputmode="decimal" value="' + esc(deal.amount == null ? '' : deal.amount) + '"></div></div>'
        + '<div class="field"><label>Детали заказа</label><textarea id="f-details" rows="2">' + esc(deal.orderDetails || '') + '</textarea></div></div>'
        + '<div class="stage' + (deal.status === 'done' ? ' cur' : '') + '"><h3>✅ Завершение</h3>' + dateField('f-completedAt', 'Когда завершили', deal.completedAt) + '</div>'
        + '<button class="btn" id="save">Сохранить</button></div>';

      var feed = (deal.messages || []).map(function (m) { return { at: m.at, html: '<div class="msg ' + esc(m.dir) + '">' + esc(m.text) + '<span class="meta">' + (m.dir === 'in' ? (SRC[m.channel] || m.channel) + ' · ' : m.dir === 'note' ? 'Заметка · ' + esc(userName(m.userId)) + ' · ' : '') + fmt(m.at) + '</span></div>' }; })
        .concat((deal.comments || []).map(function (c) { return { at: c.at, html: '<div class="msg cmt">💬 ' + esc(c.text) + '<span class="meta">Комментарий · ' + esc(userName(c.userId)) + ' · ' + fmt(c.at) + '</span></div>' }; }))
        .sort(function (a, b) { return new Date(a.at) - new Date(b.at); }).map(function (x) { return x.html; }).join('');
      var commSel = '<select id="f-comm">' + Object.keys(META.comm).map(function (k) { return '<option value="' + k + '"' + (k === (deal.comm || '') ? ' selected' : '') + '>' + esc(META.comm[k] || '—') + '</option>'; }).join('') + '</select>';
      var asSel = isAdmin() ? '<select id="f-assignee"><option value="">Не назначен</option>' + META.users.map(function (u) { return '<option value="' + esc(u.id) + '"' + (String(u.id) === String(deal.assigneeId) ? ' selected' : '') + '>' + esc(u.name) + '</option>'; }).join('') + '</select>' : '<div>' + esc(userName(deal.assigneeId)) + '</div>';
      var phones = (client.phones || []).map(function (p) { return '<a href="tel:+7' + esc(p) + '">' + esc(phoneFmt(p)) + '</a>'; }).join('<br>') || '—';
      var emails = (client.emails || []).map(function (e) { return '<a href="mailto:' + esc(e) + '">' + esc(e) + '</a>'; }).join('<br>') || '—';
      var tasks = d.tasks.length ? d.tasks.map(taskRow).join('') : '<p class="muted small">Задач нет</p>';
      var hist = d.history.map(function (h) { return '<div class="hist">' + fmt(h.at) + ' · ' + esc(userName(h.userId)) + ' ' + esc(LOG[h.action] || h.action) + (h.details ? ': ' + esc(changesText(h.details)) : '') + '</div>'; }).join('') || '<p class="muted small">Изменений пока нет</p>';
      var other = d.otherDeals.length ? '<div class="field"><label>Другие заявки клиента</label>' + d.otherDeals.map(function (o) { return '<div><a href="#/deal/' + esc(o._id) + '">№' + esc(o.num) + ' ' + esc(o.title) + '</a> ' + badge(o.status) + '</div>'; }).join('') + '</div>' : '';

      var body = stepBar + '<div class="tabs"><button data-t="steps" class="on">Этапы</button><button data-t="feed">Переписка</button><button data-t="info">Клиент</button><button data-t="tasks">Задачи</button></div>'
        + '<div class="deal"><div class="stack"><div data-pane="steps" class="show">' + stages + '</div>'
        + '<div data-pane="feed"><h3 class="sec">Переписка и комментарии</h3><div class="feed">' + (feed || '<div class="empty">Сообщений пока нет</div>') + '</div>'
        + '<form class="reply" id="cf"><div class="row2"><textarea name="text" placeholder="Комментарий для команды (клиент его не увидит)" rows="2"></textarea><button class="btn" type="submit">Добавить</button></div>'
        + '<p class="muted small" style="margin-top:6px">Ответ клиенту из CRM появится после подключения почты, Telegram и MAX.</p></form></div></div>'
        + '<div class="stack"><div class="card panel" data-pane="info"><h3>Клиент</h3><dl class="kv"><dt>Имя</dt><dd><a href="#/client/' + esc(client._id) + '">' + esc(client.name || 'Без имени') + '</a></dd><dt>Компания</dt><dd>' + esc(client.company || '—') + '</dd>'
        + '<dt>Телефон</dt><dd>' + phones + '</dd><dt>Почта</dt><dd>' + emails + '</dd><dt>Откуда</dt><dd>' + esc((deal.source && deal.source.label) || '—') + '</dd><dt>Заявка от</dt><dd>' + fmt(deal.createdAt) + '</dd></dl>' + other
        + '<div class="field" style="margin-top:12px"><label>Ответственный</label>' + asSel + '</div><div class="field"><label>Общение</label>' + commSel + '</div><button class="btn small ghost" id="save2">Сохранить</button></div>'
        + '<div class="card" data-pane="tasks"><h3>Задачи и напоминания</h3><div id="tl">' + tasks + '</div><form id="tf" style="margin-top:10px"><input name="text" placeholder="Что сделать" required><label>Когда напомнить</label><input name="due" type="datetime-local"><button class="btn small" style="margin-top:10px">Добавить задачу</button></form></div>'
        + '<div class="card" data-pane="info"><h3>История изменений</h3>' + hist + '</div></div></div>';
      shell('', '№' + deal.num + ' · ' + (client.name || 'Без имени'), body, { back: true });

      var calcDone = !!deal.calcDone;
      on('[data-calc]', 'click', function () { calcDone = this.getAttribute('data-calc') === '1'; Array.prototype.forEach.call(document.querySelectorAll('[data-calc]'), function (b) { var y = b.getAttribute('data-calc') === '1'; b.classList.toggle('on', y === calcDone); b.classList.toggle('yes', y && calcDone); }); if (calcDone && !qs('#f-calcAt').value) qs('#f-calcAt').value = localToday(); });
      on('.tabs button', 'click', function () {
        var t = this.getAttribute('data-t');
        Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function (b) { b.classList.toggle('on', b.getAttribute('data-t') === t); });
        Array.prototype.forEach.call(document.querySelectorAll('[data-pane]'), function (p) { p.classList.toggle('show', p.getAttribute('data-pane') === t); });
      });
      if (window.innerWidth > 820) Array.prototype.forEach.call(document.querySelectorAll('[data-pane]'), function (p) { p.classList.add('show'); });

      function collect() {
        var b = { calcDone: calcDone, calcAmount: qs('#f-calcAmount').value, qty: qs('#f-qty').value, amount: qs('#f-amount').value, orderDetails: qs('#f-details').value, comm: qs('#f-comm').value };
        ['calcAt', 'sampleOrderedAt', 'samplePaidAt', 'sampleDoneAt', 'orderedAt', 'paidAt', 'completedAt'].forEach(function (f) { b[f] = qs('#f-' + f).value || null; });
        if (qs('#f-assignee')) b.assigneeId = qs('#f-assignee').value;
        return b;
      }
      function save(extra, msg) {
        var body = collect(); for (var k in extra) body[k] = extra[k];
        Array.prototype.forEach.call(document.querySelectorAll('#save,#save2,[data-step]'), function (b) { b.disabled = true; });
        api('/deals/' + id, { method: 'PATCH', body: body }).then(function () { toast(msg || 'Сохранено'); refreshDash(); pageDeal(id); }, function (e) { toast(e.message, true); pageDeal(id); });
      }
      qs('#save').addEventListener('click', function () { save({}); });
      qs('#save2').addEventListener('click', function () { save({}); });
      on('[data-step]', 'click', function () {
        var st = this.getAttribute('data-step'); if (st === deal.status) return;
        if (st === 'archive' && !confirm('Отправить заявку в отказ / архив?')) return;
        save({ status: st }, 'Шаг: ' + statusName(st));
      });

      var sending = false;
      qs('#cf').addEventListener('submit', function (e) {
        e.preventDefault(); if (sending) return; var t = e.target.text.value.trim(); if (!t) return;
        sending = true; qs('button', e.target).disabled = true; // защита от двойной отправки
        api('/deals/' + id + '/comments', { method: 'POST', body: { text: t } }).then(function () { pageDeal(id); }, function (err) { toast(err.message, true); sending = false; qs('button', e.target).disabled = false; });
      });
      qs('#tf').addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target; qs('button', f).disabled = true;
        api('/tasks', { method: 'POST', body: { dealId: id, text: f.text.value, dueAt: f.due.value ? new Date(f.due.value).toISOString() : null } })
          .then(function () { toast('Задача добавлена'); refreshDash(); pageDeal(id); }, function (err) { toast(err.message, true); qs('button', f).disabled = false; });
      });
      bindTasks(qs('#tl'), function () { pageDeal(id); });
    }).catch(fail);
  }

  // ---------- задачи ----------
  function taskRow(t) {
    var late = t.dueAt && !t.done && new Date(t.dueAt) < new Date();
    return '<div class="task' + (t.done ? ' done' : '') + '"><input type="checkbox" data-task="' + esc(t._id) + '"' + (t.done ? ' checked' : '') + '><div><div class="t">' + esc(t.text) + '</div>'
      + '<div class="due' + (late ? ' late' : '') + '">' + (t.dueAt ? (late ? 'Просрочено: ' : '') + fmt(t.dueAt) : 'Без срока')
      + (t.deal ? ' · <a href="#/deal/' + esc(t.deal._id) + '">№' + esc(t.deal.num) + '</a>' : t.dealId ? ' · <a href="#/deal/' + esc(t.dealId) + '">к заявке</a>' : '')
      + (isAdmin() && t.assigneeId && String(t.assigneeId) !== String(ME.id) ? ' · ' + esc(userName(t.assigneeId)) : '') + '</div></div></div>';
  }
  function bindTasks(root, after) {
    if (!root) return;
    on('input[data-task]', 'change', function () {
      var el = this; el.disabled = true;
      api('/tasks/' + el.getAttribute('data-task'), { method: 'PATCH', body: { done: el.checked } }).then(function () { refreshDash(); after(); }, function (e) { toast(e.message, true); el.disabled = false; });
    }, root);
  }
  function pageTasks() {
    loading('tasks', 'Задачи');
    var scope = query('scope'), state = query('state');
    api('/tasks?scope=' + (scope || 'mine') + '&state=' + (state || 'open')).then(function (d) {
      var chips = '<div class="chips"><a class="chip' + (scope !== 'all' ? ' on' : '') + '" href="#/tasks?state=' + state + '">Мои</a>' + (isAdmin() ? '<a class="chip' + (scope === 'all' ? ' on' : '') + '" href="#/tasks?scope=all&state=' + state + '">Все сотрудники</a>' : '')
        + '<a class="chip' + (state !== 'all' ? ' on' : '') + '" href="#/tasks?scope=' + scope + '">Открытые</a><a class="chip' + (state === 'all' ? ' on' : '') + '" href="#/tasks?scope=' + scope + '&state=all">Все</a></div>';
      var add = '<form class="card" id="tf" style="margin-bottom:14px"><h3>Новая задача</h3><input name="text" placeholder="Что сделать" required><label>Когда напомнить</label><input name="due" type="datetime-local">'
        + (isAdmin() ? '<label>Кому</label><select name="assignee">' + META.users.map(function (u) { return '<option value="' + esc(u.id) + '"' + (String(u.id) === String(ME.id) ? ' selected' : '') + '>' + esc(u.name) + '</option>'; }).join('') + '</select>' : '')
        + '<button class="btn small" style="margin-top:10px">Добавить</button></form>';
      shell('tasks', 'Задачи', add + chips + '<div class="card" id="tl">' + (d.tasks.length ? d.tasks.map(taskRow).join('') : '<p class="muted small">Задач нет</p>') + '</div>');
      bindTasks(qs('#tl'), pageTasks);
      qs('#tf').addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target; qs('button', f).disabled = true;
        api('/tasks', { method: 'POST', body: { text: f.text.value, dueAt: f.due.value ? new Date(f.due.value).toISOString() : null, assigneeId: f.assignee ? f.assignee.value : undefined } })
          .then(function () { toast('Задача добавлена'); refreshDash(); pageTasks(); }, function (err) { toast(err.message, true); qs('button', f).disabled = false; });
      });
    }).catch(fail);
  }

  // ---------- клиенты ----------
  function pageClients() {
    loading('clients', 'Клиенты'); var term = query('q');
    api('/clients' + (term ? '?q=' + encodeURIComponent(term) : '')).then(function (d) {
      var rows = d.clients.map(function (c) {
        return '<tr class="row" data-href="#/client/' + esc(c._id) + '"><td class="name">' + esc(c.name || 'Без имени') + '</td><td>' + esc(c.company || '—') + '</td><td>' + esc(phoneFmt((c.phones || [])[0]) || '—') + '</td><td>' + esc((c.emails || [])[0] || '—') + '</td><td>' + c.deals + '</td><td class="small muted">' + fmt(c.lastContactAt) + '</td></tr>';
      }).join('');
      var cards = d.clients.map(function (c) {
        return '<a class="dcard" href="#/client/' + esc(c._id) + '"><div class="l1"><span class="name">' + esc(c.name || 'Без имени') + '</span><span class="muted small">' + c.deals + ' заяв.</span></div><div class="small muted">' + esc([c.company, phoneFmt((c.phones || [])[0]), (c.emails || [])[0]].filter(Boolean).join(' · ') || '—') + '</div></a>';
      }).join('');
      var body = '<form class="toolbar" id="sf"><input type="search" name="q" placeholder="Поиск: имя, компания, телефон, почта" value="' + esc(term) + '"><button class="btn ghost">Найти</button></form>'
        + (d.clients.length ? '<table class="table"><thead><tr><th>Имя</th><th>Компания</th><th>Телефон</th><th>Почта</th><th>Заявок</th><th>Последний контакт</th></tr></thead><tbody>' + rows + '</tbody></table><div class="cards">' + cards + '</div>' : '<div class="empty">Клиентов нет</div>');
      shell('clients', 'Клиенты', body);
      qs('#sf').addEventListener('submit', function (e) { e.preventDefault(); location.hash = '#/clients?q=' + encodeURIComponent(e.target.q.value.trim()); });
      on('tr.row', 'click', function () { location.hash = this.getAttribute('data-href'); });
    }).catch(fail);
  }
  function pageClient(id) {
    loading('clients', 'Клиент');
    api('/clients/' + id).then(function (d) {
      var c = d.client;
      var body = '<div class="grid2"><form class="card" id="cf"><h3>Данные клиента</h3><label>Имя</label><input name="name" value="' + esc(c.name) + '"><label>Компания</label><input name="company" value="' + esc(c.company) + '">'
        + '<label>Телефоны (через запятую)</label><input name="phones" inputmode="tel" value="' + esc((c.phones || []).map(phoneFmt).join(', ')) + '"><label>Почта (через запятую)</label><input name="emails" value="' + esc((c.emails || []).join(', ')) + '">'
        + '<label>Заметка</label><textarea name="note">' + esc(c.note) + '</textarea><button class="btn small" style="margin-top:12px">Сохранить</button></form>'
        + '<div class="card"><h3>Заявки клиента</h3>' + dealCards(d.deals) + '</div></div>';
      shell('clients', c.name || 'Клиент', body, { back: true });
      qs('#cf').addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target; var split = function (v) { return v.split(',').map(function (x) { return x.trim(); }).filter(Boolean); };
        api('/clients/' + id, { method: 'PATCH', body: { name: f.name.value, company: f.company.value, note: f.note.value, phones: split(f.phones.value), emails: split(f.emails.value) } })
          .then(function () { toast('Сохранено'); pageClient(id); }, function (err) { toast(err.message, true); });
      });
    }).catch(fail);
  }

  // ---------- новая заявка ----------
  function modal(html, onReady) {
    var bg = document.createElement('div'); bg.className = 'modal-bg'; bg.innerHTML = '<div class="modal">' + html + '</div>';
    bg.addEventListener('click', function (e) { if (e.target === bg) bg.remove(); });
    document.body.appendChild(bg); onReady(bg, function () { bg.remove(); });
  }
  function newDealModal() {
    modal('<form id="nd"><h2>Новая заявка</h2><label>Имя клиента</label><input name="name"><label>Компания</label><input name="company"><label>Телефон</label><input name="phone" inputmode="tel"><label>Почта</label><input name="email" type="email">'
      + '<label>Что нужно (название заявки)</label><input name="title" placeholder="Например: маскоты 500 шт к выставке"><label>Комментарий</label><textarea name="text"></textarea>'
      + (isAdmin() ? '<label>Ответственный</label><select name="assignee"><option value="">Не назначен</option>' + META.users.map(function (u) { return '<option value="' + esc(u.id) + '">' + esc(u.name) + '</option>'; }).join('') + '</select>' : '')
      + '<div class="acts"><button type="button" class="btn ghost" data-close>Отмена</button><button class="btn">Создать</button></div></form>', function (root, close) {
      qs('[data-close]', root).addEventListener('click', close);
      qs('#nd', root).addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target; qs('button[type=submit],button:not([type])', f).disabled = true;
        api('/deals', { method: 'POST', body: { name: f.name.value, company: f.company.value, phone: f.phone.value, email: f.email.value, title: f.title.value, text: f.text.value, assigneeId: f.assignee ? f.assignee.value : undefined } })
          .then(function (d) { close(); toast('Заявка создана'); refreshDash(); location.hash = '#/deal/' + d.id; }, function (err) { toast(err.message, true); qs('button:not([type])', f).disabled = false; });
      });
    });
  }

  // ---------- настройки ----------
  var ACT = { login: 'вход', logout: 'выход', login_failed: 'неудачный вход', setup: 'первичная настройка', password_changed: 'смена пароля', user_created: 'добавлен сотрудник', user_updated: 'изменён сотрудник', client_updated: 'изменён клиент' };
  function pageSettings() {
    loading('settings', 'Настройки');
    var pwd = '<form class="card" id="pf"><h3>Смена пароля</h3><label>Текущий пароль</label><input name="current" type="password" autocomplete="current-password" required><label>Новый пароль (от 10 символов)</label><input name="password" type="password" minlength="10" autocomplete="new-password" required><button class="btn small" style="margin-top:12px">Сменить пароль</button></form>';
    var done = function (extra) {
      shell('settings', isAdmin() ? 'Сотрудники и настройки' : 'Настройки', '<div class="stack">' + (extra || '') + '<div class="grid2">' + pwd + '<div class="card"><h3>Установить на телефон</h3><p class="small muted">Откройте CRM в браузере телефона и выберите «На экран Домой» (iPhone: кнопка «Поделиться»; Android: меню ⋮). CRM откроется как приложение.</p></div></div></div>');
      qs('#pf').addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target;
        api('/me/password', { method: 'POST', body: { current: f.current.value, password: f.password.value } }).then(function () { toast('Пароль изменён'); f.reset(); }, function (err) { toast(err.message, true); });
      });
      if (isAdmin()) bindUsers();
    };
    if (!isAdmin()) return done();
    Promise.all([api('/users'), api('/log?limit=150')]).then(function (r) {
      var users = r[0].users.map(function (u) {
        return '<tr><td class="name">' + esc(u.name) + '</td><td>' + esc(u.email) + '</td><td>' + (u.role === 'admin' ? 'Администратор' : 'Сотрудник') + '</td><td>' + (u.active ? 'Активен' : '<span class="muted">Отключён</span>') + '</td>'
          + '<td style="white-space:nowrap">' + (String(u.id) !== String(ME.id) ? '<button class="btn ghost small" data-pass="' + esc(u.id) + '">Новый пароль</button> <button class="btn small ' + (u.active ? 'danger' : 'ghost') + '" data-act="' + esc(u.id) + '" data-on="' + (u.active ? '0' : '1') + '">' + (u.active ? 'Отключить' : 'Включить') + '</button>' : '<span class="muted small">это вы</span>') + '</td></tr>';
      }).join('');
      var logRows = r[1].items.map(function (h) {
        return '<div class="hist">' + fmt(h.at) + ' · ' + esc(userName(h.userId)) + ' — ' + esc(ACT[h.action] || LOG[h.action] || h.action) + (h.details ? ' ' + esc(changesText(h.details) || (h.details.email || '')) : '') + '</div>';
      }).join('') || '<p class="muted small">Записей нет</p>';
      done('<div class="card"><h3>Сотрудники</h3><div style="overflow-x:auto"><table class="table" style="display:table"><thead><tr><th>Имя</th><th>Почта</th><th>Роль</th><th>Статус</th><th></th></tr></thead><tbody>' + users + '</tbody></table></div>'
        + '<form id="uf" style="margin-top:14px"><h3>Добавить сотрудника</h3><div class="grid2"><div><label>Имя</label><input name="name" required></div><div><label>Почта для входа</label><input name="email" type="email" required></div>'
        + '<div><label>Роль</label><select name="role"><option value="staff">Сотрудник</option><option value="admin">Администратор</option></select></div><div><label>Пароль (от 10 символов)</label><input name="password" minlength="10" required autocomplete="new-password"></div></div>'
        + '<button class="btn small" style="margin-top:12px">Добавить</button></form></div><div class="card"><h3>Журнал действий</h3>' + logRows + '</div>');
    }).catch(fail);
  }
  function bindUsers() {
    qs('#uf').addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target;
      api('/users', { method: 'POST', body: { name: f.name.value, email: f.email.value, role: f.role.value, password: f.password.value } })
        .then(function () { toast('Сотрудник добавлен'); loadMeta().then(pageSettings); }, function (err) { toast(err.message, true); });
    });
    on('[data-act]', 'click', function () {
      api('/users/' + this.getAttribute('data-act'), { method: 'PATCH', body: { active: this.getAttribute('data-on') === '1' } }).then(function () { loadMeta().then(pageSettings); }, function (err) { toast(err.message, true); });
    });
    on('[data-pass]', 'click', function () {
      var id = this.getAttribute('data-pass'); var p = prompt('Новый пароль сотрудника (не короче 10 символов):'); if (!p) return;
      api('/users/' + id, { method: 'PATCH', body: { password: p } }).then(function () { toast('Пароль изменён, сотрудник вышел на всех устройствах'); }, function (err) { toast(err.message, true); });
    });
  }
  function pageMore() {
    var list = navItems().filter(function (n) { return ['dash', 'calc', 'sample', 'production'].indexOf(n[0]) < 0; });
    shell('more', 'Ещё', '<div class="cards">' + list.map(function (n) { return '<a class="dcard" href="' + n[3] + '"><div class="l1"><span class="name">' + n[1] + ' ' + esc(n[2]) + '</span>' + (n[4] ? '<span class="st st-new">' + n[4] + '</span>' : '') + '</div></a>'; }).join('')
      + '<a class="dcard" href="#" id="lo2"><div class="l1"><span class="name">🚪 Выйти</span></div></a></div><p class="muted small" style="margin-top:14px">' + esc(ME.name) + ' · ' + esc(ME.email) + '</p>');
    qs('#lo2').addEventListener('click', logout);
  }

  // ---------- данные и маршрутизация ----------
  function loadMeta() { return api('/meta').then(function (m) { META = m; }); }
  function refreshDash() { return api('/dashboard').then(function (d) { DASH = d; updateBadges(); return d; }); }
  function updateBadges() {
    var unread = (DASH && DASH.unread) || 0;
    document.title = document.title.replace(/^\(\d+\) /, '');
    if (unread) document.title = '(' + unread + ') ' + document.title;
  }
  function route() {
    if (!ME) return;
    var h = location.hash.replace(/^#/, '').split('?')[0] || '/';
    var m;
    if (h === '/' || h === '') return pageDash();
    if ((m = h.match(/^\/deals\/(all|mine|new|calc|sample|production|closed)$/))) return pageDeals(m[1]);
    if ((m = h.match(/^\/deal\/([a-f0-9]{24})$/))) return pageDeal(m[1]);
    if (h === '/messages') return pageDeals('all', true);
    if (h === '/clients') return pageClients();
    if ((m = h.match(/^\/client\/([a-f0-9]{24})$/))) return pageClient(m[1]);
    if (h === '/tasks') return pageTasks();
    if (h === '/settings') return pageSettings();
    if (h === '/more') return pageMore();
    location.hash = '#/';
  }
  function start() {
    Promise.all([loadMeta(), refreshDash()]).then(function () {
      route();
      clearInterval(timer);
      // каждую минуту обновляем счётчики; на рабочем столе — и сам экран
      timer = setInterval(function () {
        if (document.hidden) return;
        var before = DASH && DASH.unread;
        refreshDash().then(function () {
          var h = location.hash.replace(/^#/, '') || '/';
          if (h === '/' ) pageDash();
          else if (DASH.unread !== before) { var c = document.querySelectorAll('.cnt'); if (c.length) shellCounts(); }
        }, function () {});
      }, 60000);
    }, function (e) { if (e.message !== 'Нужно войти') app.innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
  }
  function shellCounts() { route(); }
  window.addEventListener('hashchange', route);
  api('/me', { noAuth: true }).then(function (d) { ME = d.user; start(); }, function () { showLogin(); });
})();
