// Спільна навігація для всіх сторінок проєкту «Підготовка до екзамену».
// Підключати одним рядком перед </body>:  <script src="/nav.js"></script>
// Щоб змінити пункти меню — правити тільки цей файл.
(function () {
  var PAGES = [
    { href: '/',              label: '🇩🇪 Основний',   paths: ['/', '/index.html'] },
    { href: '/index_ua.html', label: '🇺🇦 Українська', paths: ['/index_ua.html'] },
    { href: '/voice.html',    label: '🎴 Картки',      paths: ['/voice.html'] },
    { href: '/prep.html',     label: '📚 Питання',     paths: ['/prep.html'] }
  ];

  var css = ''
    + '.pnav{display:flex;gap:0;background:#0d0f17;border-bottom:1px solid #252a3a;'
    + 'overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}'
    + '.pnav::-webkit-scrollbar{display:none}'
    + '.pnav a,.pnav span{flex:1 0 auto;text-align:center;padding:9px 14px;font-size:12px;'
    + "font-weight:600;font-family:'Inter',system-ui,sans-serif;text-decoration:none;color:#64748b;"
    + 'white-space:nowrap;border-bottom:2px solid transparent;transition:color .15s}'
    + '.pnav a:hover{color:#e2e8f0}'
    + '.pnav .cur{color:#4f7fff;border-bottom-color:#4f7fff;cursor:default}';

  function currentPath() {
    var p = location.pathname;
    if (p.length > 1 && p.charAt(p.length - 1) === '/') p = p.slice(0, -1) || '/';
    return p;
  }

  function build() {
    if (document.querySelector('.pnav')) return;

    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);

    var here = currentPath();
    var nav = document.createElement('nav');
    nav.className = 'pnav';

    for (var i = 0; i < PAGES.length; i++) {
      var pg = PAGES[i];
      var isCur = pg.paths.indexOf(here) !== -1;
      var el = document.createElement(isCur ? 'span' : 'a');
      el.textContent = pg.label;
      if (isCur) el.className = 'cur';
      else el.href = pg.href;
      nav.appendChild(el);
    }

    document.body.insertBefore(nav, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
