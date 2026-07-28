/*
 * Единый хедер и футер для всего сайта «Пушистый Завод».
 * Подключается на каждой странице: <script src="/prototype/js/site.js"></script>
 * Скрипт удаляет старые .topbar / header.nav / footer и вставляет одинаковые для всех страниц.
 */
(function () {
  var PHONE_TEL = '+79896051010';
  var PHONE_HUMAN = '+7 (989) 605-10-10';
  var EMAIL = 'pushistyzavod@mail.ru';

  // ---------- Общие стили хедера и футера ----------
  var css = ''
    + ':root{--sblue:#639aee;--spink:#ff6099;--sink:#22242b;--smuted:#6b6b76;--sline:#eceef3}'
    + 'body{padding-top:0}'
    // topbar
    + '.site-topbar{background:#1c1e25;color:#eceef3;font-size:13px;font-family:inherit}'
    + '.site-topbar .wrap{max-width:none;width:100%;margin:0;padding:9px 32px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;box-sizing:border-box}'
    + '.site-topbar .tb-left{display:flex;align-items:center;gap:8px;opacity:.9}'
    + '.site-topbar a{color:#eceef3;opacity:.8;text-decoration:none;transition:.15s}.site-topbar a:hover{opacity:1;color:#fff}'
    + '.site-topbar .tb-right{display:flex;gap:22px;align-items:center}'
    + '.site-topbar .tb-right a{display:inline-flex;align-items:center;gap:6px}'
    // header
    + '.site-header{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.9);backdrop-filter:saturate(180%) blur(12px);border-bottom:1px solid var(--sline);font-family:inherit;transition:box-shadow .2s,background .2s}'
    + '.site-header.scrolled{box-shadow:0 8px 30px -18px rgba(20,30,80,.35);background:rgba(255,255,255,.97)}'
    + '.site-header .wrap{max-width:none;width:100%;margin:0;padding:0 32px;display:flex;align-items:center;justify-content:space-between;gap:24px;height:78px;box-sizing:border-box}'

    + '.site-logo{font-weight:700;font-size:21px;letter-spacing:-.2px;display:inline-flex;align-items:center;gap:11px;color:var(--sink);text-decoration:none;white-space:nowrap;flex:0 0 auto;margin-right:auto}'
    + '.site-logo .dot{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,var(--sblue),var(--spink));display:inline-flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 6px 16px -6px rgba(255,96,153,.6)}'
    // menu (centered)
    + '.site-menu{display:flex;align-items:center;justify-content:center;gap:2px;font-weight:500;font-size:15px;min-width:0;flex-wrap:nowrap;flex:0 1 auto}'
    + '.site-menu>a,.site-mega-trigger{position:relative;color:#3a3d46;text-decoration:none;padding:10px 12px;border-radius:10px;transition:color .15s,background .15s;white-space:nowrap}'
    + '.site-menu>a:hover,.site-mega-trigger:hover{color:var(--sink);background:#f3f5fa}'
    + '.site-menu>a::after{content:"";position:absolute;left:12px;right:12px;bottom:5px;height:2px;border-radius:2px;background:var(--spink);transform:scaleX(0);transform-origin:left;transition:transform .2s}'
    + '.site-menu>a:hover::after{transform:scaleX(1)}'
    + '.site-menu>a.active{color:var(--sink);font-weight:600}'
    + '.site-menu>a.active::after{transform:scaleX(1)}'
    // right cta
    + '.site-cta{display:flex;gap:14px;align-items:center;flex:0 0 auto;margin-left:auto}'
    + '.site-contact{display:flex;flex-direction:column;align-items:flex-end;gap:5px;line-height:1.1;flex-shrink:0}'
    + '.site-phone{font-weight:700;font-size:16.5px;white-space:nowrap;color:var(--sink);text-decoration:none;letter-spacing:-.2px}'
    + '.site-phone:hover{color:var(--sblue)}'
    + '.site-contact .msgs{display:flex;gap:6px;align-items:center}'
    + '.site-contact .msg{width:30px;height:30px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;transition:.15s}'
    + '.site-contact .msg svg{width:17px;height:17px;fill:currentColor;display:block}'
    + '.site-contact .msg.tg{background:#e6f4fd;color:#229ed9}'
    + '.site-contact .msg.max{background:#ece8ff;color:#6b4eff}'
    + '.site-contact .msg.mail{background:#f0f1f5;color:#555}'
    + '.site-contact .msg:hover{transform:translateY(-2px);filter:brightness(.97)}'

    + '.site-btn{display:inline-flex;align-items:center;justify-content:center;padding:13px 22px;border-radius:30px;font-weight:600;font-size:14.5px;background:var(--spink);color:#fff;text-decoration:none;border:none;cursor:pointer;transition:.2s;box-shadow:0 10px 22px -12px rgba(255,96,153,.8);white-space:nowrap;flex-shrink:0;line-height:1}'
    + '.site-btn:hover{background:var(--sblue);box-shadow:0 10px 22px -12px rgba(99,154,238,.9);transform:translateY(-1px)}'
    + '.site-burger{display:none;font-size:24px;line-height:1;background:none;border:1px solid var(--sline);border-radius:10px;width:44px;height:44px;cursor:pointer;color:var(--sink)}'
    // mega
    + '.site-mega-wrap{position:relative;display:flex;align-items:center}'
    + '.site-mega-trigger{display:inline-flex;align-items:center;gap:7px;cursor:pointer;font-weight:500}'
    + '.site-mega-trigger .arr{font-size:10px;transition:.2s;opacity:.6}'
    + '.site-mega-wrap:hover .site-mega-trigger{color:var(--sink);background:#f3f5fa}'
    + '.site-mega-wrap:hover .site-mega-trigger .arr{transform:rotate(180deg)}'
    + '.site-mega{position:fixed;left:0;right:0;top:78px;background:#fff;border-top:1px solid var(--sline);box-shadow:0 30px 60px -24px rgba(20,30,80,.3);opacity:0;visibility:hidden;transform:translateY(10px);transition:.2s;z-index:110}'
    + '.site-mega-wrap:hover .site-mega{opacity:1;visibility:visible;transform:translateY(0)}'
    + '.site-mega .inner{max-width:1240px;margin:0 auto;padding:24px 28px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}'
    + '.site-mega .cat{display:flex;flex-direction:column;gap:5px;padding:22px 24px;border-radius:16px;background:#f7f9fd;border:1px solid transparent;transition:.18s;text-decoration:none}'
    + '.site-mega .cat:hover{background:#fff;border-color:var(--sblue);box-shadow:0 14px 30px -16px rgba(20,30,80,.4);transform:translateY(-3px)}'
    + '.site-mega .cat .i{font-size:30px}.site-mega .cat b{font-size:17px;color:var(--sink)}'
    + '.site-mega .cat span.d{font-size:13px;color:var(--smuted);line-height:1.4}.site-mega .cat span.m{font-size:13px;font-weight:600;color:var(--sblue);margin-top:6px}'
    // footer
    + '.site-footer{background:#1c1e25;color:#c4c7d2;padding:60px 0 26px;margin-top:80px;font-family:inherit}'
    + '.site-footer .wrap{max-width:1240px;margin:0 auto;padding:0 28px}'
    + '.site-footer .cols{display:grid;grid-template-columns:2fr 1fr 1fr 1.4fr;gap:34px}'
    + '.site-footer h4{color:#fff;margin:0 0 16px;font-size:15px;letter-spacing:.2px}'
    + '.site-footer a{display:block;padding:6px 0;opacity:.8;color:#c4c7d2;text-decoration:none;transition:.15s}.site-footer a:hover{opacity:1;color:#fff}'
    + '.site-footer .brand b{color:#fff;font-size:20px}.site-footer .brand p{margin-top:12px;font-size:14px;max-width:300px;line-height:1.6}'
    + '.site-footer .btn-inline{margin-top:14px;display:inline-flex;padding:11px 22px;border-radius:28px;background:var(--spink);color:#fff;font-weight:600}.site-footer .btn-inline:hover{background:var(--sblue);opacity:1}'
    + '.site-footer .sochead{color:#fff;font-size:13px;margin-top:16px;margin-bottom:8px;opacity:.9}'
    + '.site-footer .socials{display:flex;gap:10px;margin-bottom:4px}'
    + '.site-footer .socials a{width:42px;height:42px;padding:0;border-radius:11px;background:#2a2c34;display:inline-flex;align-items:center;justify-content:center;color:#e6e8ef;opacity:.92}'
    + '.site-footer .socials a svg{width:20px;height:20px;fill:currentColor;display:block}'
    + '.site-footer .socials a:hover{background:var(--spink);opacity:1;color:#fff;transform:translateY(-2px)}'


    + '.site-footer .legal{border-top:1px solid #33353f;margin-top:40px;padding-top:22px;font-size:13px;opacity:.7;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;line-height:1.6}'
    + '.site-footer .legal a{display:inline;padding:0;opacity:.7;text-decoration:underline}.site-footer .legal a:hover{opacity:1;color:#fff}'
    // adaptive: плавно сжимаем хедер, чтобы меню/телефон/кнопка не выходили за края
    + '@media(max-width:1300px){'
    + '  .site-header .wrap{gap:16px;padding:0 24px}'
    + '  .site-menu{font-size:14.5px}'
    + '  .site-menu>a,.site-mega-trigger{padding:10px 9px}'
    + '  .site-menu>a::after{left:9px;right:9px}'
    + '  .site-phone{font-size:15.5px}'
    + '  .site-btn{padding:12px 18px;font-size:14px}'
    + '}'
    + '@media(max-width:1180px){'
    + '  .site-header .wrap{gap:12px;padding:0 20px}'
    + '  .site-menu{font-size:14px}'
    + '  .site-menu>a,.site-mega-trigger{padding:9px 7px}'
    + '  .site-contact .msgs{display:none}'
    + '  .site-contact{gap:0}'
    + '  .site-btn{padding:11px 16px;font-size:13.5px}'
    + '}'
    // mobile drawer
    + '.site-menu.open{display:flex}'
    + '@media(max-width:1040px){'
    + '  .site-header .wrap{height:70px;gap:14px}'
    + '  .site-menu{position:fixed;top:70px;left:0;right:0;bottom:0;flex-direction:column;justify-content:flex-start;align-items:stretch;gap:2px;background:#fff;padding:18px 24px;transform:translateX(100%);transition:transform .25s;overflow-y:auto;box-shadow:-10px 0 40px -20px rgba(0,0,0,.3);display:flex}'
    + '  .site-menu.open{transform:translateX(0)}'
    + '  .site-menu>a,.site-mega-trigger{padding:15px 6px;font-size:17px;border-radius:8px}'
    + '  .site-menu>a::after{display:none}'
    + '  .site-mega-wrap{width:100%;flex-direction:column;align-items:stretch}'
    + '  .site-mega{position:static;opacity:1;visibility:visible;transform:none;box-shadow:none;border:none;background:transparent}'
    + '  .site-mega .inner{grid-template-columns:1fr;padding:0 0 8px;gap:8px}'
    + '  .site-mega .cat{padding:12px 14px;background:#f7f9fd}'
    + '  .site-mega-trigger .arr{margin-left:auto}'
    + '  .site-cta{margin-left:auto;gap:10px}.site-contact{display:none}'
    + '  .site-btn{padding:12px 20px;font-size:14px}'

    + '  .site-burger{display:inline-flex;align-items:center;justify-content:center}'
    + '  .site-topbar .tb-left{display:none}'
    + '  .site-footer .cols{grid-template-columns:1fr 1fr}'
    + '}'
    + '@media(max-width:560px){'
    + '  .site-header .wrap{padding:0 16px}.site-topbar .wrap{padding:8px 16px}'
    + '  .site-cta .site-btn{padding:11px 16px;font-size:13px}'
    + '  .site-footer .cols{grid-template-columns:1fr}'
    + '}';

  // ---------- Разметка ----------
  var topbar =
    '<div class="site-topbar"><div class="wrap">'
    + '<div class="tb-left">🏭 Собственное производство в РФ · Опт от 100 штук · Работаем с юрлицами по договору</div>'
    + '<div class="tb-right">'
    + '<span>Пн–Пт 9:00–18:00 (МСК)</span>'
    + '<a href="mailto:' + EMAIL + '">✉️ ' + EMAIL + '</a>'
    + '</div></div></div>';


  var header =
    '<header class="site-header"><div class="wrap">'
    + '<a class="site-logo" href="/"><span class="dot">🧸</span>Пушистый&nbsp;Завод</a>'
    + '<nav class="site-menu">'
    + '<a href="/" data-m="home">Главная</a>'
    + '<div class="site-mega-wrap">'
    + '  <a href="/#products" class="site-mega-trigger" data-m="products">Что производим <span class="arr">▼</span></a>'
    + '  <div class="site-mega"><div class="inner">'
    + '    <a class="cat" href="/soft-toys.html"><span class="i">🧸</span><b>Мягкие игрушки</b><span class="d">Маскоты, символ года, брелоки, персонажи</span><span class="m">Перейти →</span></a>'
    + '    <a class="cat" href="/pvc-figures.html"><span class="i">🧩</span><b>Пластиковые фигурки из ПВХ</b><span class="d">Фигурки, брелоки, флешки, джибитсы</span><span class="m">Перейти →</span></a>'
    + '    <a class="cat" href="/soft-goods.html"><span class="i">🎒</span><b>Мягкая продукция</b><span class="d">Рюкзаки, тапочки, подушки, аксессуары</span><span class="m">Перейти →</span></a>'
    + '  </div></div>'
    + '</div>'
    + '<a href="/works.html" data-m="works">Наши работы</a>'
    + '<a href="/production.html" data-m="production">Производство</a>'
    + '<a href="/news.html" data-m="news">Новости</a>'
    + '<a href="/#cta" data-m="contacts">Контакты</a>'
    + '</nav>'
    + '<div class="site-cta">'
    + '<div class="site-contact">'
    + '  <a class="site-phone" href="tel:' + PHONE_TEL + '">' + PHONE_HUMAN + '</a>'
    + '  <div class="msgs">'
    + '    <a class="msg tg" href="https://t.me/pushistyzavod" target="_blank" rel="noopener" title="Написать в Telegram" aria-label="Telegram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg></a>'
    + '    <a class="msg max" href="https://max.ru/pushistyzavod" target="_blank" rel="noopener" title="Написать в MAX" aria-label="MAX"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20V4h3.2l4.8 8 4.8-8H21v16h-3.4v-9.6L12 18h-.6L6.4 10.4V20z"/></svg></a>'
    + '    <a class="msg mail" href="mailto:' + EMAIL + '" title="Написать на почту" aria-label="E-mail"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg></a>'
    + '  </div>'

    + '</div>'
    + '<a class="site-btn" href="/#cta">Рассчитать заказ</a>'
    + '<button class="site-burger" aria-label="Меню">☰</button>'
    + '</div>'

    + '</div></header>';

  var year = new Date().getFullYear();
  var footer =
    '<footer class="site-footer"><div class="wrap">'
    + '<div class="cols">'
    + '  <div class="brand"><b>🏭 Пушистый Завод</b><p>Фабрика полного цикла по производству мягких и пластиковых изделий на заказ для бизнеса. Опт от 100 штук, работа с юрлицами по договору.</p></div>'
    + '  <div><h4>Продукция</h4>'
    + '    <a href="/soft-toys.html">Мягкие игрушки</a>'
    + '    <a href="/pvc-figures.html">Пластиковые фигурки из ПВХ</a>'
    + '    <a href="/soft-goods.html">Мягкая продукция</a>'
    + '  </div>'
    + '  <div><h4>Компания</h4>'
    + '    <a href="/production.html">Наше производство</a>'
    + '    <a href="/works.html">Наши работы</a>'
    + '    <a href="/news.html">Новости</a>'
    + '    <a href="/privacy.html">Политика конфиденциальности</a>'
    + '  </div>'
    + '  <div><h4>Контакты</h4>'
    + '    <a href="tel:' + PHONE_TEL + '">' + PHONE_HUMAN + '</a>'
    + '    <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>'
    + '    <div class="sochead">Мы в мессенджерах и соцсетях:</div>'
    + '    <div class="socials">'
    + '      <a href="https://t.me/pushistyzavod" target="_blank" rel="noopener" title="Telegram" aria-label="Telegram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg></a>'
    + '      <a href="https://max.ru/pushistyzavod" target="_blank" rel="noopener" title="MAX" aria-label="MAX"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20V4h3.2l4.8 8 4.8-8H21v16h-3.4v-9.6L12 18h-.6L6.4 10.4V20z"/></svg></a>'
    + '      <a href="https://vk.com/pushistyzavod" target="_blank" rel="noopener" title="ВКонтакте" aria-label="ВКонтакте"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.16 16.6c-5.46 0-8.86-3.79-9-10.1h2.74c.1 4.63 2.18 6.6 3.79 7V6.5h2.62v3.98c1.56-.17 3.2-1.98 3.75-3.98h2.6c-.42 2.46-2.2 4.27-3.45 5.02 1.25.6 3.28 2.19 4.06 4.58h-2.86c-.6-1.9-2.08-3.36-4.1-3.56v3.56z"/></svg></a>'
    + '    </div>'

    + '    <a class="btn-inline" href="/#cta">Оставить заявку</a>'
    + '  </div>'

    + '</div>'
    + '<div class="legal">'
    + '  <span>© ' + year + ' Пушистый Завод. Производство на заказ. Все права защищены.</span>'
    + '  <span>ИП Иванов И.И. · ИНН 000000000000 · ОГРНИП 000000000000000 · <a href="/privacy.html">Политика конфиденциальности</a></span>'
    + '</div>'
    + '</div></footer>';

  function inject() {
    // 1) стиль
    if (!document.getElementById('site-chrome-css')) {
      var st = document.createElement('style');
      st.id = 'site-chrome-css';
      st.textContent = css;
      document.head.appendChild(st);
    }

    // 2) удаляем старые (разные на каждой странице) шапки/подвалы
    document.querySelectorAll('.topbar, header.nav, footer:not(.site-footer), .site-topbar, .site-header, .site-footer')
      .forEach(function (el) { el.parentNode && el.parentNode.removeChild(el); });

    // 3) вставляем единые
    document.body.insertAdjacentHTML('afterbegin', topbar + header);
    document.body.insertAdjacentHTML('beforeend', footer);

    // 4) активный пункт меню
    var path = location.pathname;
    var key = 'home';
    if (/soft-toys|pvc-figures|soft-goods/.test(path)) key = 'products';
    else if (/works/.test(path)) key = 'works';
    else if (/production/.test(path)) key = 'production';
    else if (/news/.test(path)) key = 'news';
    var act = document.querySelector('.site-menu [data-m="' + key + '"]');
    if (act) act.classList.add('active');

    // 5) тень при скролле
    var hdr = document.querySelector('.site-header');
    function onScroll() { hdr.classList.toggle('scrolled', window.scrollY > 8); }
    window.addEventListener('scroll', onScroll); onScroll();

    // 6) бургер (мобильное меню-шторка)
    var burger = document.querySelector('.site-burger');
    var menu = document.querySelector('.site-menu');
    if (burger && menu) {
      burger.addEventListener('click', function () {
        var open = menu.classList.toggle('open');
        burger.innerHTML = open ? '✕' : '☰';
        document.body.style.overflow = open ? 'hidden' : '';
      });
      // закрываем при переходе по ссылке
      menu.querySelectorAll('a[href]').forEach(function (a) {
        a.addEventListener('click', function () {
          menu.classList.remove('open'); burger.innerHTML = '☰'; document.body.style.overflow = '';
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
