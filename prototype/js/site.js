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
    + '.site-topbar .tb-right{display:flex;gap:22px;align-items:center;flex-wrap:nowrap}'
    + '.site-topbar .tb-right a{display:inline-flex;align-items:center;gap:6px}'
    + '.site-topbar .tb-right span,.site-topbar .tb-right a{white-space:nowrap}'
    // header
    + '.site-header{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.9);backdrop-filter:saturate(180%) blur(12px);border-bottom:1px solid var(--sline);font-family:inherit;transition:box-shadow .2s,background .2s}'
    + '.site-header.scrolled{box-shadow:0 8px 30px -18px rgba(20,30,80,.35);background:rgba(255,255,255,.97)}'
    + '.site-header .wrap{max-width:none;width:100%;margin:0;padding:0 32px;display:flex;align-items:center;justify-content:space-between;gap:24px;height:78px;box-sizing:border-box}'

    + '.site-logo{font-weight:700;font-size:21px;letter-spacing:-.2px;display:inline-flex;align-items:center;gap:11px;color:var(--sink);text-decoration:none;white-space:nowrap;flex:0 0 auto;margin-right:auto}'
    + '.site-logo .logo-pic{height:46px;width:auto;display:block;object-fit:contain}'
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
    + '.site-contact .msg{width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;transition:.15s;overflow:hidden;box-shadow:0 2px 7px -1px rgba(20,30,80,.25)}'
    + '.site-contact .msg img{width:100%;height:100%;object-fit:cover;display:block;border-radius:50%}'
    + '.site-contact .msg:hover{transform:translateY(-2px);filter:brightness(1.06)}'

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
    + '.site-mega .cat .i{height:62px;display:flex;align-items:flex-end}.site-mega .cat .i img{height:62px;width:auto;max-width:100px;object-fit:contain;object-position:bottom left;filter:drop-shadow(0 5px 7px rgba(30,45,85,.2))}.site-mega .cat b{font-size:17px;color:var(--sink)}'
    + '.site-mega .cat span.d{font-size:13px;color:var(--smuted);line-height:1.4}.site-mega .cat span.m{font-size:13px;font-weight:600;color:var(--sblue);margin-top:6px}'
    // footer
    + '.site-footer{background:#1c1e25;color:#c4c7d2;padding:60px 0 26px;margin-top:80px;font-family:inherit}'
    + '.site-footer .wrap{max-width:1240px;margin:0 auto;padding:0 28px}'
    + '.site-footer .cols{display:grid;grid-template-columns:2fr 1fr 1fr 1.4fr;gap:34px}'
    + '.site-footer h4{color:#fff;margin:0 0 16px;font-size:15px;letter-spacing:.2px}'
    + '.site-footer a{display:block;padding:6px 0;opacity:.8;color:#c4c7d2;text-decoration:none;transition:.15s}.site-footer a:hover{opacity:1;color:#fff}'
    + '.site-footer .brand b{color:#fff;font-size:20px}.site-footer .brand p{margin-top:12px;font-size:14px;max-width:300px;line-height:1.6}'
    + '.site-footer .brand .flogo{height:64px;width:auto;display:block;object-fit:contain;margin-bottom:14px}'
    + '.site-footer .btn-inline{margin-top:14px;display:inline-flex;padding:11px 22px;border-radius:28px;background:var(--spink);color:#fff;font-weight:600}.site-footer .btn-inline:hover{background:var(--sblue);opacity:1}'
    + '.site-footer .sochead{color:#fff;font-size:13px;margin-top:16px;margin-bottom:8px;opacity:.9}'
    + '.site-footer .socials{display:flex;gap:10px;margin-bottom:4px}'
    + '.site-footer .socials a{width:42px;height:42px;padding:0;border-radius:50%;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;opacity:.92;transition:.15s;box-shadow:0 3px 9px -2px rgba(0,0,0,.4)}'
    + '.site-footer .socials a img{width:100%;height:100%;object-fit:cover;display:block;border-radius:50%}'
    + '.site-footer .socials a:hover{opacity:1;transform:translateY(-2px)}'
    // лайтбокс приближения фото в «Примеры работ» (только десктоп)
    + '.wlbox{position:fixed;inset:0;z-index:400;background:rgba(15,18,30,.9);display:flex;align-items:center;justify-content:center;padding:34px;opacity:0;visibility:hidden;transition:.22s}'
    + '.wlbox.open{opacity:1;visibility:visible}'
    + '.wlbox .wl-in{max-width:min(860px,100%);max-height:100%;display:flex;flex-direction:column;align-items:center;gap:14px;transform:scale(.94);transition:transform .22s}'
    + '.wlbox.open .wl-in{transform:scale(1)}'
    + '.wlbox img{max-width:100%;max-height:78vh;object-fit:contain;border-radius:16px;background:#fff;box-shadow:0 30px 70px -20px rgba(0,0,0,.55)}'
    + '.wlbox .wl-cap{color:#fff;font-size:15px;font-weight:600;text-align:center;opacity:.95}'
    + '.wlbox .wl-close{position:absolute;top:16px;right:16px;width:44px;height:44px;border-radius:50%;border:none;background:rgba(255,255,255,.14);color:#fff;font-size:22px;cursor:pointer;line-height:1;transition:.15s}'
    + '.wlbox .wl-close:hover{background:var(--spink)}'
    + '@media(max-width:900px){.wlbox{display:none}}'
    // cookie-баннер (согласие на использование cookie) — тонкая плашка внизу
    + '.ckbox{position:fixed;left:0;right:0;bottom:0;z-index:500;background:rgba(28,30,37,.97);color:#c4c7d2;padding:10px 18px;display:flex;align-items:center;justify-content:center;gap:8px 16px;flex-wrap:wrap;font-size:12.5px;line-height:1.45;text-align:center;transform:translateY(100%);opacity:0;visibility:hidden;transition:.3s;font-family:inherit}'
    + '.ckbox.show{transform:translateY(0);opacity:1;visibility:visible}'
    + '.ckbox a{color:#9ec2f5;text-decoration:underline;white-space:nowrap}'
    + '.ckbox .ck-ok{padding:7px 20px;border-radius:20px;border:none;background:var(--spink);color:#fff;font-weight:600;font-size:12.5px;cursor:pointer;font-family:inherit;transition:.15s;white-space:nowrap}'
    + '.ckbox .ck-ok:hover{background:var(--sblue)}'
    + '@media(max-width:560px){.ckbox{font-size:11.5px;padding:8px 12px;gap:6px 10px}.ckbox .ck-ok{padding:6px 16px;font-size:11.5px}}'


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
    // mobile drawer — выезжающее меню справа
    + '.site-backdrop{position:fixed;inset:0;background:rgba(15,18,30,.5);z-index:290;opacity:0;visibility:hidden;transition:.25s}'
    + '.site-backdrop.open{opacity:1;visibility:visible}'
    + '.site-drawer{position:fixed;top:0;right:0;bottom:0;width:min(86%,360px);background:#fff;z-index:300;transform:translateX(105%);transition:transform .3s cubic-bezier(.22,.8,.3,1);display:flex;flex-direction:column;box-shadow:-16px 0 50px -20px rgba(20,30,80,.45)}'
    + '.site-drawer.open{transform:translateX(0)}'
    + '.site-drawer .d-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--sline)}'
    + '.site-drawer .d-head img{height:34px;width:auto}'
    + '.site-drawer .d-close{width:40px;height:40px;border-radius:50%;border:1px solid var(--sline);background:#f4f5fb;font-size:17px;line-height:1;cursor:pointer;color:var(--sink)}'
    + '.site-drawer nav{flex:1;overflow-y:auto;padding:8px 18px 18px}'
    + '.site-drawer nav a{display:flex;align-items:center;justify-content:space-between;padding:14px 4px;font-size:17px;font-weight:600;color:var(--sink);text-decoration:none;border-bottom:1px solid #f0f1f6}'
    + '.site-drawer nav a.d-label{color:var(--smuted);font-size:12.5px;text-transform:uppercase;letter-spacing:.06em;border-bottom:none;padding:16px 4px 4px;font-weight:600;cursor:default}'
    + '.site-drawer nav a.sub{padding-left:6px;font-size:15.5px;font-weight:500;color:#41454f;gap:12px;justify-content:flex-start}'
    + '.site-drawer nav a.sub img{height:34px;width:auto;object-fit:contain}'
    + '.site-drawer .d-foot{padding:16px 18px 22px;border-top:1px solid var(--sline);display:flex;flex-direction:column;gap:13px}'
    + '.site-drawer .d-phone{font-weight:700;font-size:18px;color:var(--sink);text-decoration:none}'
    + '.site-drawer .d-msgs{display:flex;gap:10px}'
    + '.site-drawer .d-msgs a{width:38px;height:38px;border-radius:50%;overflow:hidden;box-shadow:0 2px 7px -1px rgba(20,30,80,.25);display:block}'
    + '.site-drawer .d-msgs img{width:100%;height:100%;object-fit:cover;display:block}'
    + '.site-drawer .d-btn{display:inline-flex;align-items:center;justify-content:center;padding:14px;border-radius:28px;background:var(--spink);color:#fff;font-weight:600;font-size:15px;text-decoration:none;box-shadow:0 10px 22px -12px rgba(255,96,153,.8)}'
    + '@media(max-width:1040px){'
    + '  .site-header .wrap{height:70px;gap:14px}'
    + '  .site-logo .logo-pic{height:38px}'
    + '  .site-menu{display:none}'
    + '  .site-cta{margin-left:auto;gap:10px}.site-contact{display:none}'
    + '  .site-cta .site-btn{display:none}'
    + '  .site-burger{display:inline-flex;align-items:center;justify-content:center}'
    + '  .site-topbar .tb-left{display:none}'
    + '  .site-footer .cols{grid-template-columns:1fr 1fr}'
    + '}'
    + '@media(max-width:560px){'
    + '  .site-header .wrap{padding:0 16px}.site-topbar .wrap{padding:8px 12px}'
    + '  .site-topbar .tb-right{gap:12px;font-size:12px}'
    + '  .site-cta .site-btn{padding:11px 16px;font-size:13px}'
    + '  .site-footer .cols{grid-template-columns:1fr}'
    + '  .site-logo{font-size:17px;gap:8px}.site-logo .logo-pic{height:32px}'
    + '  .site-mega .inner{padding:16px}'
    + '}'
    + '@media(max-width:380px){'
    + '  .site-topbar .tb-right{gap:8px;font-size:11px}'
    + '}';

  // ---------- Разметка ----------
  var topbar =
    '<div class="site-topbar"><div class="wrap">'
    + '<div class="tb-left">Собственное производство в РФ · Опт от 100 штук · Работаем с юрлицами по договору</div>'
    + '<div class="tb-right">'
    + '<span>Пн–Пт 9:00–18:00 (МСК)</span>'
    + '<a href="mailto:' + EMAIL + '">✉️ ' + EMAIL + '</a>'
    + '</div></div></div>';


  var header =
    '<header class="site-header"><div class="wrap">'
    + '<a class="site-logo" href="/"><img class="logo-pic" src="/prototype/images/logo.png" alt="Пушистый Завод">Пушистый&nbsp;Завод</a>'
    + '<nav class="site-menu">'
    + '<a href="/" data-m="home">Главная</a>'
    + '<div class="site-mega-wrap">'
    + '  <a href="/#products" class="site-mega-trigger" data-m="products">Что производим <span class="arr">▼</span></a>'
    + '  <div class="site-mega"><div class="inner">'
    + '    <a class="cat" href="/soft-toys.html"><span class="i"><img src="/prototype/images/soft-toys-cutout.png" alt="Мягкие игрушки" loading="lazy" decoding="async"></span><b>Мягкие игрушки</b><span class="d">Маскоты, символ года, брелоки, персонажи</span><span class="m">Перейти →</span></a>'
    + '    <a class="cat" href="/pvc-figures.html"><span class="i"><img src="/prototype/images/pvc-figures-cutout.png" alt="Пластиковые фигурки из ПВХ" loading="lazy" decoding="async"></span><b>Пластиковые фигурки из ПВХ</b><span class="d">Фигурки, брелоки, флешки, джибитсы</span><span class="m">Перейти →</span></a>'
    + '    <a class="cat" href="/soft-goods.html"><span class="i"><img src="/prototype/images/soft-goods-cutout.png" alt="Мягкая продукция" loading="lazy" decoding="async"></span><b>Мягкая продукция</b><span class="d">Рюкзаки, тапочки, подушки, аксессуары</span><span class="m">Перейти →</span></a>'
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
    + '    <a class="msg tg" href="https://t.me/pushistyzavod" target="_blank" rel="noopener" title="Написать в Telegram" aria-label="Telegram"><img src="/prototype/images/icons/telegram.png" alt="Telegram"></a>'
    + '    <a class="msg max" href="https://max.ru/pushistyzavod" target="_blank" rel="noopener" title="Написать в MAX" aria-label="MAX"><img src="/prototype/images/icons/max.png" alt="MAX"></a>'
    + '    <a class="msg vk" href="https://vk.com/pushistyzavod" target="_blank" rel="noopener" title="Мы во ВКонтакте" aria-label="ВКонтакте"><img src="/prototype/images/icons/vk.png" alt="ВКонтакте"></a>'
    + '    <a class="msg mail" href="mailto:' + EMAIL + '" title="Написать на почту" aria-label="E-mail"><img src="/prototype/images/icons/mail.png" alt="E-mail"></a>'
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
    + '  <div class="brand"><img class="flogo" src="/prototype/images/logo.png" alt="Пушистый Завод"><b>Пушистый Завод</b><p>Фабрика полного цикла по производству мягких и пластиковых изделий на заказ для бизнеса. Опт от 100 штук, работа с юрлицами по договору.</p></div>'
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
    + '      <a href="https://t.me/pushistyzavod" target="_blank" rel="noopener" title="Telegram" aria-label="Telegram"><img src="/prototype/images/icons/telegram.png" alt="Telegram"></a>'
    + '      <a href="https://max.ru/pushistyzavod" target="_blank" rel="noopener" title="MAX" aria-label="MAX"><img src="/prototype/images/icons/max.png" alt="MAX"></a>'
    + '      <a href="https://vk.com/pushistyzavod" target="_blank" rel="noopener" title="ВКонтакте" aria-label="ВКонтакте"><img src="/prototype/images/icons/vk.png" alt="ВКонтакте"></a>'
    + '      <a href="mailto:' + EMAIL + '" title="Написать на почту" aria-label="E-mail"><img src="/prototype/images/icons/mail.png" alt="E-mail"></a>'
    + '    </div>'

    + '    <a class="btn-inline" href="/#cta">Оставить заявку</a>'
    + '  </div>'

    + '</div>'
    + '<div class="legal">'
    + '  <span>© ' + year + ' Пушистый Завод. Производство на заказ. Все права защищены.</span>'
    + '  <span>ИП Цыренов Тимур Борисович · ИНН 031320564462 · ОГРНИП 323030000049231 · <a href="/privacy.html">Политика конфиденциальности</a></span>'
    + '</div>'
    + '</div></footer>';

  var drawer =
    '<div class="site-backdrop"></div>'
    + '<aside class="site-drawer">'
    + '<div class="d-head"><img src="/prototype/images/logo.png" alt="Пушистый Завод"><button class="d-close" aria-label="Закрыть меню">✕</button></div>'
    + '<nav>'
    + '<a href="/">Главная</a>'
    + '<a class="d-label">Что производим</a>'
    + '<a class="sub" href="/soft-toys.html"><img src="/prototype/images/soft-toys-cutout.png" alt="">Мягкие игрушки</a>'
    + '<a class="sub" href="/pvc-figures.html"><img src="/prototype/images/pvc-figures-cutout.png" alt="">Пластиковые фигурки из ПВХ</a>'
    + '<a class="sub" href="/soft-goods.html"><img src="/prototype/images/soft-goods-cutout.png" alt="">Мягкая продукция</a>'
    + '<a href="/works.html">Наши работы</a>'
    + '<a href="/production.html">Производство</a>'
    + '<a href="/news.html">Новости</a>'
    + '<a href="/#cta">Контакты</a>'
    + '</nav>'
    + '<div class="d-foot">'
    + '<a class="d-phone" href="tel:' + PHONE_TEL + '">' + PHONE_HUMAN + '</a>'
    + '<div class="d-msgs">'
    + '<a href="https://t.me/pushistyzavod" target="_blank" rel="noopener" aria-label="Telegram"><img src="/prototype/images/icons/telegram.png" alt="Telegram"></a>'
    + '<a href="https://max.ru/pushistyzavod" target="_blank" rel="noopener" aria-label="MAX"><img src="/prototype/images/icons/max.png" alt="MAX"></a>'
    + '<a href="https://vk.com/pushistyzavod" target="_blank" rel="noopener" aria-label="ВКонтакте"><img src="/prototype/images/icons/vk.png" alt="ВКонтакте"></a>'
    + '<a href="mailto:' + EMAIL + '" aria-label="E-mail"><img src="/prototype/images/icons/mail.png" alt="E-mail"></a>'
    + '</div>'
    + '<a class="d-btn" href="/#cta">Рассчитать заказ</a>'
    + '</div>'
    + '</aside>';

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
    document.body.insertAdjacentHTML('beforeend', drawer);
    document.body.insertAdjacentHTML('beforeend',
      '<div class="wlbox" id="wlbox"><button class="wl-close" aria-label="Закрыть">✕</button><div class="wl-in"><img id="wlImg" src="" alt=""><div class="wl-cap" id="wlCap"></div></div></div>');

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

    // 6) бургер — выезжающее мобильное меню
    var burger = document.querySelector('.site-burger');
    var drawerEl = document.querySelector('.site-drawer');
    var backdrop = document.querySelector('.site-backdrop');
    function setMenu(open) {
      drawerEl.classList.toggle('open', open);
      backdrop.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      burger.innerHTML = open ? '✕' : '☰';
    }
    if (burger && drawerEl && backdrop) {
      burger.addEventListener('click', function () { setMenu(!drawerEl.classList.contains('open')); });
      backdrop.addEventListener('click', function () { setMenu(false); });
      drawerEl.querySelector('.d-close').addEventListener('click', function () { setMenu(false); });
      // Закрываем меню по клику на ЛЮБУЮ ссылку дровера:
      // раньше обработчик стоял только на nav a[], поэтому кнопка
      // «Рассчитать заказ» (.d-btn в подвале дровера) меню не закрывала.
      drawerEl.querySelectorAll('a[href]').forEach(function (a) {
        a.addEventListener('click', function () { setMenu(false); });
      });
    }

    // 7) приближение фото в блоках «Примеры работ» (десктоп)
    var wl = document.getElementById('wlbox');
    var wlImg = document.getElementById('wlImg');
    var wlCap = document.getElementById('wlCap');
    function wlClose() { wl.classList.remove('open'); document.body.style.overflow = ''; }
    document.querySelectorAll('.works-grid .work').forEach(function (w) {
      w.style.cursor = 'zoom-in';
      w.addEventListener('click', function () {
        if (window.innerWidth <= 900) return;
        var img = w.querySelector('.ph img');
        if (!img) return;
        wlImg.src = img.src; wlImg.alt = img.alt || '';
        var t = w.querySelector('.cap b');
        wlCap.textContent = t ? t.textContent : '';
        wl.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });
    wl.querySelector('.wl-close').addEventListener('click', wlClose);
    wl.addEventListener('click', function (e) { if (e.target === wl) wlClose(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && wl.classList.contains('open')) wlClose(); });
  }

  // ---------- Отправка форм на бэкенд ----------
  // Раньше формы просто показывали alert («демо-макет») и заявки никуда не уходили.
  function initForms() {
    var forms = document.querySelectorAll('form[data-api-form]');
    Array.prototype.forEach.call(forms, function (form) {
      if (form.dataset.bound === '1') return;
      form.dataset.bound = '1';

      var status = document.createElement('div');
      status.style.cssText = 'margin-top:12px;font-size:13.5px;line-height:1.4;display:none';
      form.appendChild(status);

      function show(text, ok) {
        status.textContent = text;
        status.style.color = ok ? '#1a9c5b' : '#d93025';
        status.style.display = 'block';
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var btn = form.querySelector('button[type="submit"], button:not([type])');
        var oldText = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = 'Отправляем…'; }

        var payload = {
          formName: form.getAttribute('data-form-name') || 'Форма сайта',
          formPage: location.pathname,
        };
        Array.prototype.forEach.call(form.elements, function (el) {
          if (!el.name || el.type === 'submit') return;
          payload[el.name] = el.value;
        });
        if (payload.product) {
          payload.message = 'Интересует: ' + payload.product;
        }

        fetch('/api/form', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d && d.status === 'success') {
              show(d.message || 'Спасибо! Заявка отправлена — свяжемся с вами.', true);
              form.reset();
              // Цель Яндекс.Метрики: успешная отправка заявки (конверсия)
              try { if (window.ym) window.ym(95445006, 'reachGoal', 'form_success'); } catch (e) {}
            } else {
              show('Не удалось отправить. Позвоните нам: ' + PHONE_HUMAN, false);
            }
          })
          .catch(function () {
            show('Нет связи с сервером. Позвоните нам: ' + PHONE_HUMAN, false);
          })
          .then(function () {
            if (btn) { btn.disabled = false; btn.innerHTML = oldText; }
          });
      });
    });
  }

  // ---------- Яндекс.Метрика (счётчик 95445006) ----------
  // tag.js подгружается асинхронно и не блокирует рендер страницы.
  function initMetrika() {
    var MID = 95445006;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=' + MID, 'ym');
    window.ym(MID, 'init', {
      clickmap: true,        // карта кликов
      trackLinks: true,      // отслеживание переходов по ссылкам
      accurateTrackBounce: true, // точный показатель отказов
      webvisor: true         // вебвизор (запись действий посетителей)
    });
  }

  // ---------- Cookie-баннер (уведомление об использовании cookie) ----------
  // Показывается один раз; согласие запоминается в localStorage.
  function initCookie() {
    try { if (localStorage.getItem('ckConsent') === '1') return; } catch (e) {}
    var el = document.createElement('div');
    el.className = 'ckbox';
    el.setAttribute('role', 'dialog');
    el.innerHTML =
      '<span>🍪 Мы используем cookie и Яндекс.Метрику для анализа посещаемости и улучшения сайта. '
      + 'Продолжая пользоваться сайтом, вы соглашаетесь с <a href="/privacy.html">Политикой конфиденциальности</a>.</span>'
      + '<button class="ck-ok" type="button">Принять</button>';
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('show'); }, 900);
    el.querySelector('.ck-ok').addEventListener('click', function () {
      try { localStorage.setItem('ckConsent', '1'); } catch (e) {}
      el.classList.remove('show');
      setTimeout(function () { el.parentNode && el.parentNode.removeChild(el); }, 350);
    });
  }

  function start() {
    inject();
    initForms();
    initMetrika();
    initCookie();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

