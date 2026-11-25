/* app.js — data loading, the global filter state (kept in the URL), router, side menu, theme and language.
   Pages live in js/pages/*.js and register themselves on window.Pages = { id: { render(main, App), phase } }. */
(function (global) {
  'use strict';
  const TABLES = Data.TABLES;
  // CR-01: three menu groups; each profile sees only its pages (Auth)
  U.addIcons({
    home: '<path d="M3 9.5 10 3.5l7 6V17H12.5v-4.5h-5V17H3z"/>',
    orders: '<path d="M2.5 3.5h2l2 9.5h9l1.5-7H6"/><circle cx="8" cy="16" r="1.2"/><circle cx="14.5" cy="16" r="1.2"/>',
    ecommerce: '<rect x="3" y="3.5" width="14" height="11" rx="1.5"/><path d="M7 17.5h6M10 14.5v3M6 9.5l2.5-2 2 2 3.5-3"/>',
    customers: '<circle cx="8" cy="7" r="3"/><path d="M2.5 17c.5-3 2.7-4.5 5.5-4.5s5 1.5 5.5 4.5M13 4.2a3 3 0 0 1 0 5.6M15 12.8c1.4.6 2.3 2 2.5 4.2"/>',
    catalog: '<path d="M3 3h7l7 7-7 7-7-7z"/><circle cx="7" cy="7" r="1.2"/>',
    stockquota: '<path d="M3 6.5 10 3l7 3.5v7L10 17l-7-3.5z"/><path d="M3 6.5 10 10l7-3.5M10 10v7"/>',
    partners: '<path d="M2.5 10.5 6 7l3 1.5 3-2.5 5.5 4.5M6 11.5l2.5 2.5M9 10.5l3 3M12.5 9.5l2.5 2.5"/>',
    so: '<path d="M3 10h11M10.5 6l4 4-4 4M17 4v12"/>',
    workqueue: '<path d="M7 5h10M7 10h10M7 15h10"/><path d="m2.5 5 1 1 2-2M2.5 10l1 1 2-2M2.5 15l1 1 2-2"/>',
    documents: '<path d="M5 2.5h7l3.5 3.5v11.5H5z"/><path d="M12 2.5V6h3.5"/><path d="M8 12h4M10 10v4"/>',
    reports: '<path d="M3 16.5h14M5.5 13.5V9M9.5 13.5V5.5M13.5 13.5v-6"/>',
    access: '<path d="M10 2.5 4 5v4.5c0 4 2.6 6.6 6 8 3.4-1.4 6-4 6-8V5z"/><path d="m7.5 10 2 2 3.5-4"/>',
    audit: '<circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/>',
    returns: '<path d="M7.5 5 3.5 9l4 4"/><path d="M3.5 9H12a4.5 4.5 0 0 1 0 9H8"/>',
    proposals: '<path d="M3 11.5 5 4h10l2 7.5V16H3z"/><path d="M3 11.5h4.5l1 2h3l1-2H17"/>',
    user: '<circle cx="10" cy="7" r="3.5"/><path d="M3.5 17.5c.8-3.3 3.3-5 6.5-5s5.7 1.7 6.5 5"/>'
  });
  const ICON_OF = { overview: 'overview', stock: 'stock', expiry: 'expiry', consign: 'consign', calendar: 'calendar', replen: 'replen', quota: 'quota', report: 'report', data: 'data' };
  const GROUPS = [['ops', Auth.OPS], ['supply', Auth.SUPPLY], ['setup', Auth.SETUP]];
  const DEF_F = { view: 'W', ch: [], acc: [], brand: [], cat: [], q: '', rr: 'L4W', h: 3 };

  const App = {
    DB: null, raw: null, sc: null, sources: {}, S: Object.assign({}, Calc.DEFAULT_SETTINGS, loadSettings()),
    page: 'home', F: null, ui: { sku: null, stockTab: 'all', sort: null, pageNo: 1, rrUnit: 'w', projUnit: 'v', wfUnit: 'v' },
    _model: null, _modelKey: '',
    /** The model for the current filters (cached until a filter changes). */
    model() {
      const key = JSON.stringify(App.F) + JSON.stringify(App.S);
      if (key !== App._modelKey) {
        const t0 = performance.now();
        App._model = Calc.computeModel(App.DB, App.F, App.S, { prev: true, series: true });
        App._modelKey = key;
        App._model.ms = Math.round(performance.now() - t0);
      }
      return App._model;
    },
    setF(patch, opt) {
      Object.assign(App.F, patch); lockScope();
      if (!opt || !opt.keepPage) App.ui.pageNo = 1;
      writeHash(false); syncFilters(); render();
    },
    go(page, extra) {
      App.page = page; Object.assign(App.ui, extra || {});
      writeHash(true); render(); window.scrollTo(0, 0);
      document.getElementById('shell').classList.remove('navopen'); document.getElementById('navOverlay').classList.add('hidden');
    },
    openSku(sku) { App.ui.sku = sku; writeHash(false); if (global.Pages.stock.openDrawer) global.Pages.stock.openDrawer(App, sku); },
    closeSku() { App.ui.sku = null; writeHash(false); },
    rerender: () => render(),
    /** Threshold settings (Data & Settings page) → localStorage, then every number is recomputed. */
    saveSettings(S) {
      App.S = Object.assign({}, Calc.DEFAULT_SETTINGS, S);
      try { localStorage.setItem('scm.settings', JSON.stringify(App.S)); } catch (e) { /* storage blocked: kept for this visit */ }
      App._modelKey = ''; render();
    },
    /** Reload every table (mock CSV + imports in IndexedDB) and rebuild the DB — after an import or Reset to Mock. */
    async reloadData() {
      App.raw = await loadRaw();
      App.DB = Calc.prepare(App.raw);
      App.sc = Calc.selfCheck(App.DB);
      App._modelKey = '';
      App.F.asDn = Math.max(App.DB.minAsOf, Math.min(App.F.asDn, App.DB.maxAsOf));
      buildFilters(); writeHash(false); render();
    }
  };
  function loadSettings() { try { return JSON.parse(localStorage.getItem('scm.settings') || '{}'); } catch (e) { return {}; } }
  global.App = App;
  global.Pages = global.Pages || {};

  // ------------------------------------------------------------------ data
  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error(src)); document.head.appendChild(s); });
  }
  async function loadRaw() {
    const parse = text => Papa.parse(text.replace(/^﻿/, ''), { header: true, skipEmptyLines: true, transformHeader: h => h.trim() }).data;
    let texts = null;
    if (location.protocol !== 'file:') {
      try {
        texts = await Promise.all(TABLES.map(n => fetch('data/' + n + '.csv', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(n); return r.text(); })));
      } catch (e) { texts = null; }
    }
    if (!texts) {                                   // opened from disk (file://) or CSV fetch failed → the same data as one JS file
      if (!global.SCM_BUNDLE) await loadScript('data/mock-bundle.js');
      texts = TABLES.map(n => global.SCM_BUNDLE[n]);
    }
    // tables imported on the Data page replace the mock ones
    const imports = await Data.Store.all();
    App.sources = {};
    TABLES.forEach((n, k) => {
      const imp = imports[n];
      if (imp && imp.text) { texts[k] = imp.text; App.sources[n] = { type: 'import', file: imp.file, at: imp.at }; }
      else App.sources[n] = { type: 'mock' };
    });
    const raw = {}; TABLES.forEach((n, k) => { raw[n] = parse(texts[k] || ''); });
    return raw;
  }

  // ------------------------------------------------------------------ URL ⇄ state   #/stock?asof=2026-11-23&view=M&ch=MT&rr=W&h=6&sku=CM-LP-001
  function defaultAsOf() {
    const today = Calc.dn(new Date().toISOString().slice(0, 10));
    return Math.max(App.DB.minAsOf, Math.min(Calc.monday(today), App.DB.maxAsOf));
  }
  function readHash() {
    const h = location.hash.replace(/^#\/?/, ''), [path, qs] = h.split('?');
    const p = new URLSearchParams(qs || '');
    const list = k => (p.get(k) || '').split(',').map(decodeURIComponent).filter(Boolean);
    App.page = global.Pages[path] ? path : Auth.firstPage();
    let as = Calc.dn(p.get('asof'));
    as = as == null ? defaultAsOf() : Math.max(App.DB.minAsOf, Math.min(Calc.monday(as), App.DB.maxAsOf));
    App.F = { asDn: as, view: p.get('view') === 'M' ? 'M' : 'W', ch: list('ch'), acc: list('acc'), brand: list('brand'), cat: list('cat'),
      q: p.get('q') || '', rr: ['L4W', 'L3M', 'L6M', 'W'].includes(p.get('rr')) ? p.get('rr') : App.S.rrBasis || 'L4W', h: [1, 3, 6].includes(+p.get('h')) ? +p.get('h') : 3 };
    App.ui.sku = p.get('sku') || null;
    lockScope();
  }
  /** CR-01: a department-scoped profile (Manager / Sales Admin) only ever filters its own channel — no data from other departments. */
  function lockScope() {
    const sc = Auth.scope; if (!sc || !App.F || !App.DB) return;
    App.F.ch = [sc];
    App.F.acc = App.F.acc.filter(id => { const a = App.DB.accounts.find(x => x.account_id === id); return a && a.channel === sc; });
  }
  function writeHash(push) {
    const F = App.F, p = [];
    if (F.asDn !== defaultAsOf()) p.push('asof=' + Calc.iso(F.asDn));
    if (F.view !== DEF_F.view) p.push('view=' + F.view);
    ['ch', 'acc', 'brand', 'cat'].forEach(k => { if (F[k].length) p.push(k + '=' + F[k].map(encodeURIComponent).join(',')); });
    if (F.q) p.push('q=' + encodeURIComponent(F.q));
    if (F.rr !== (App.S.rrBasis || DEF_F.rr)) p.push('rr=' + F.rr);
    if (F.h !== DEF_F.h) p.push('h=' + F.h);
    if (App.ui.sku) p.push('sku=' + encodeURIComponent(App.ui.sku));
    const h = '#/' + App.page + (p.length ? '?' + p.join('&') : '');
    if (location.hash !== h) history[push ? 'pushState' : 'replaceState'](null, '', h);
  }
  window.addEventListener('popstate', () => { if (!App.DB) return; readHash(); syncFilters(); render(); });

  // ------------------------------------------------------------------ side menu
  function renderNav() {
    document.getElementById('brandTitle').textContent = t('app_title');
    document.getElementById('brandSub').textContent = t('app_sub');
    document.getElementById('nav').innerHTML = GROUPS.map(([g, ids]) => {
      const vis = ids.filter(id => Auth.canPage(id));
      if (!vis.length) return '';
      return `<div class="sn-grp">${U.esc(t('grp_' + g))}</div>` + vis.map(id => {
        const ph = global.Pages.phaseOf ? global.Pages.phaseOf(id) : null;
        return `<a class="sn-item${App.page === id ? ' active' : ''}" href="#/${id}" data-nav="${id}" title="${U.esc(t('nav_' + id))}">${U.icon(ICON_OF[id] || id)}<span class="lb">${U.esc(t('nav_' + id))}</span>${ph ? `<span class="ph">P${ph}</span>` : ''}</a>`;
      }).join('');
    }).join('');
    const sc = App.sc;
    document.getElementById('snBottom').innerHTML = `
      ${sc && Auth.canPage('data') ? `<a class="sn-item" href="#/data" data-nav="data" title="${U.esc(t(sc.ok ? 'sc_badge_ok' : 'sc_badge_fail'))}">${U.icon(sc.ok ? 'check' : 'alert')}<span class="lb">${U.esc(t(sc.ok ? 'sc_badge_ok' : 'sc_badge_fail'))}</span><span class="sc-dot${sc.ok ? '' : ' bad'}"></span></a>` : ''}
      <button type="button" class="sn-item" id="langBtn" title="${U.esc(t('lang_switch'))}">${U.icon('globe')}<span class="lb">${U.esc(t('lang_switch'))}</span></button>
      <span class="rel"><button type="button" class="sn-item" id="themeBtn" title="${U.esc(t('theme'))}">${U.icon('theme')}<span class="lb">${U.esc(t('theme'))}: ${U.esc(t('theme_' + themeMode()))}</span></button></span>`;
    document.getElementById('navOpen').innerHTML = U.icon('menu');
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-nav]');
    if (a) { e.preventDefault(); App.ui.sku = null; App.go(a.dataset.nav); return; }
    if (e.target.closest('#langBtn')) { I18N.setLang(I18N.lang === 'th' ? 'en' : 'th'); buildFilters(); render(); return; }
    if (e.target.closest('#themeBtn')) {
      const b = e.target.closest('#themeBtn');
      U.menu(b, ['light', 'dark', 'system'].map(m => ({ label: t('theme_' + m), on: themeMode() === m, onClick: () => setTheme(m) })), { up: true });
      return;
    }
    if (e.target.closest('#navOpen')) { document.getElementById('shell').classList.add('navopen'); document.getElementById('navOverlay').classList.remove('hidden'); }
    if (e.target.matches('#navOverlay')) { document.getElementById('shell').classList.remove('navopen'); e.target.classList.add('hidden'); }
    if (e.target.closest('#filterBtn')) openSheet(true);
    if (e.target.matches('#sheetOverlay') || e.target.closest('[data-sheet-close]')) openSheet(false);
  });

  // ------------------------------------------------------------------ theme
  function themeMode() { try { return localStorage.getItem('scm.theme') || 'system'; } catch (e) { return 'system'; } }
  function applyTheme() {
    const m = themeMode(), dark = m === 'dark' || (m === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
  function setTheme(m) { try { localStorage.setItem('scm.theme', m); } catch (e) { /* ignore */ } applyTheme(); render(); }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (themeMode() === 'system') { applyTheme(); render(); } });

  // ------------------------------------------------------------------ global filter bar (built once, values synced from the state)
  const FB = {};
  function buildFilters() {
    const fbar = document.getElementById('fbar'), DB = App.DB;
    fbar.innerHTML = `
      <div class="sh-head"><b>${t('filters')}</b><button type="button" class="btn small primary" data-sheet-close>${t('done')}</button></div>
      <div class="fld"><label for="fAsof">${t('f_asof')}</label><div class="asof">
        <button type="button" class="icon-btn" id="fPrev" title="${t('prev_week')}" aria-label="${t('prev_week')}">${U.icon('left')}</button>
        <input class="ctl" type="date" id="fAsof" step="7" min="${Calc.iso(DB.minAsOf)}" max="${Calc.iso(DB.maxAsOf)}">
        <button type="button" class="icon-btn" id="fNext" title="${t('next_week')}" aria-label="${t('next_week')}">${U.icon('right')}</button></div></div>
      <div class="fld"><span class="lbl">${t('f_view')}</span><div class="seg" id="fView"><button type="button" data-v="W">${t('weekly')}</button><button type="button" data-v="M">${t('monthly')}</button></div></div>
      <div class="fld"><span class="lbl">${t('f_channel')}</span><div id="fCh"></div></div>
      <div class="fld"><span class="lbl">${t('f_account')}</span><div id="fAcc"></div></div>
      <div class="fld"><span class="lbl">${t('f_brand')}</span><div id="fBrand"></div></div>
      <div class="fld"><span class="lbl">${t('f_cat')}</span><div id="fCat"></div></div>
      <div class="fld grow"><label for="fQ">${t('f_search')}</label><input class="ctl" type="search" id="fQ" placeholder="${t('tsearch')}" autocomplete="off"></div>
      <div class="fld" title="${U.esc(t('rr_tip'))}"><label for="fRR">${t('f_rr')}</label><select class="ctl" id="fRR">${['L4W', 'L3M', 'L6M', 'W'].map(k => `<option value="${k}">${t('rr_' + k)}</option>`).join('')}</select></div>
      <div class="fld"><span class="lbl">${t('f_h')}</span><div class="seg" id="fH">${[1, 3, 6].map(h => `<button type="button" data-v="${h}">${h}M</button>`).join('')}</div></div>
      <button type="button" class="btn ghost fclear" id="fClear">${t('clear_all')}</button>`;
    const uniq = k => [...new Set(DB.skus.map(s => s[k]))].sort();
    const chans = [...new Set(DB.accounts.map(a => a.channel))];
    FB.ch = U.multiSelect({ label: t('f_channel'), allLabel: t('all'), options: chans.map(c => ({ value: c, label: c })), value: App.F.ch, onChange: v => App.setF({ ch: v, acc: App.F.acc.filter(a => accAllowed(a, v)) }) });
    FB.acc = U.multiSelect({ label: t('f_account'), allLabel: t('all'), options: accOptions(App.F.ch), value: App.F.acc, onChange: v => App.setF({ acc: v }) });
    FB.brand = U.multiSelect({ label: t('f_brand'), allLabel: t('all'), options: uniq('brand').map(b => ({ value: b, label: b })), value: App.F.brand, onChange: v => App.setF({ brand: v }) });
    FB.cat = U.multiSelect({ label: t('f_cat'), allLabel: t('all'), options: uniq('category').map(b => ({ value: b, label: b })), value: App.F.cat, onChange: v => App.setF({ cat: v }) });
    if (Auth.scope) fbar.querySelector('#fCh').innerHTML = `<span class="lockchip" title="${U.esc(t('scope_locked'))}">${U.icon('access')}${U.esc(Auth.scope)}</span>`;
    else fbar.querySelector('#fCh').appendChild(FB.ch.el);
    fbar.querySelector('#fAcc').appendChild(FB.acc.el);
    fbar.querySelector('#fBrand').appendChild(FB.brand.el); fbar.querySelector('#fCat').appendChild(FB.cat.el);
    const asof = fbar.querySelector('#fAsof');
    asof.addEventListener('change', () => { const d = Calc.dn(asof.value); if (d != null) App.setF({ asDn: Math.max(DB.minAsOf, Math.min(Calc.monday(d), DB.maxAsOf)) }); });
    fbar.querySelector('#fPrev').addEventListener('click', () => App.setF({ asDn: Math.max(DB.minAsOf, App.F.asDn - 7) }));
    fbar.querySelector('#fNext').addEventListener('click', () => App.setF({ asDn: Math.min(DB.maxAsOf, App.F.asDn + 7) }));
    fbar.querySelector('#fView').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) App.setF({ view: b.dataset.v }); });
    fbar.querySelector('#fH').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) App.setF({ h: +b.dataset.v }); });
    fbar.querySelector('#fRR').addEventListener('change', e => App.setF({ rr: e.target.value }));
    const q = fbar.querySelector('#fQ');
    q.addEventListener('input', U.debounce(() => App.setF({ q: q.value.trim() }), 250));
    fbar.querySelector('#fClear').addEventListener('click', () => App.setF({ ch: [], acc: [], brand: [], cat: [], q: '' }));
    renderNav(); syncFilters();
  }
  function accAllowed(id, chans) { const a = App.DB.accounts.find(x => x.account_id === id); return !chans.length || (a && chans.includes(a.channel)); }
  function accOptions(chans) {
    return App.DB.accounts.filter(a => !chans.length || chans.includes(a.channel))
      .map(a => ({ value: a.account_id, label: a.name, sub: a.channel + (a.is_consignment ? ' · ' + t('consign') : '') }));
  }
  function syncFilters() {
    const F = App.F, fbar = document.getElementById('fbar'); if (!FB.ch) return;
    fbar.querySelector('#fAsof').value = Calc.iso(F.asDn);
    fbar.querySelector('#fPrev').disabled = F.asDn <= App.DB.minAsOf;
    fbar.querySelector('#fNext').disabled = F.asDn >= App.DB.maxAsOf;
    fbar.querySelectorAll('#fView button').forEach(b => b.classList.toggle('on', b.dataset.v === F.view));
    fbar.querySelectorAll('#fH button').forEach(b => b.classList.toggle('on', +b.dataset.v === F.h));
    fbar.querySelector('#fRR').value = F.rr;
    const q = fbar.querySelector('#fQ'); if (document.activeElement !== q) q.value = F.q;
    if (!Auth.scope) FB.ch.set(F.ch); FB.acc.setOptions(accOptions(F.ch)); FB.acc.set(F.acc); FB.brand.set(F.brand); FB.cat.set(F.cat);
    const n = ['ch', 'acc', 'brand', 'cat'].filter(k => F[k].length && !(k === 'ch' && Auth.scope)).length + (F.q ? 1 : 0);
    fbar.querySelector('#fClear').classList.toggle('hidden', n === 0);
    document.getElementById('filterBtn').innerHTML = U.icon('filter') + `<span>${t('filters')}</span>` + (n ? `<span class="badge">${n}</span>` : '');
  }
  function openSheet(on) {
    document.getElementById('fbar').classList.toggle('open', on);
    document.getElementById('sheetOverlay').classList.toggle('hidden', !on);
    document.documentElement.classList.toggle('lock', on);
    document.getElementById('topbar').classList.toggle('sheet', on);   // above the overlay (the sheet lives inside the sticky top bar)
  }

  // ------------------------------------------------------------------ render
  let lastMobile = null;
  function render() {
    if (!App.DB) return;
    renderNav();
    U.closePop();
    Charts.killAll(); Charts.applyTheme();
    const main = document.getElementById('main'), allowed = Auth.canPage(App.page);
    const pg = !allowed ? global.Pages.denied : (global.Pages[App.page] || global.Pages.home);
    const supply = allowed && Auth.isSupplyPage(App.page) && App.page !== 'proposals';   // proposals = placeholder until Phase 3
    document.getElementById('shell').classList.toggle('no-fbar', !supply);
    document.body.classList.toggle('no-export', !Auth.can('supply.export'));
    renderUserBar();
    document.getElementById('topTitle').textContent = t('nav_' + App.page);
    document.title = t('nav_' + App.page) + ' · Charmiss Ops';
    try { pg.render(main, App); }
    catch (err) { console.error(err); main.innerHTML = U.empty(t('load_fail'), String(err && err.message || err), 'alert'); }
    if (!Auth.can('supply.export')) main.querySelectorAll(EXPORT_SEL).forEach(b => b.remove());
    if (allowed && App.ui.sku && App.page === 'stock') App.openSku(App.ui.sku);
    else if (U.drawer.isOpen() && App.page !== 'stock') U.drawer.close();
    lastMobile = U.isMobile();
  }
  // ------------------------------------------------------------------ CR-01: user bar (SSO Demo profile), export permission
  const EXPORT_SEL = '[data-card-act="download"],#tXlsx,#lotXlsx,#mxXlsx,#rcXlsx,#evXlsx,#qXlsx,#rpXlsx,#rpXl,#rpJson';
  document.addEventListener('click', e => {           // capture: an export without permission never runs, even if a button is left in the page
    if (!Auth.can('supply.export') && e.target.closest(EXPORT_SEL)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  function renderUserBar() {
    const ft = document.getElementById('appfoot'); if (ft) ft.textContent = t('footer');
    const el = document.getElementById('userbar'); if (!el) return;
    const P = Auth.profile;
    el.innerHTML = `<div class="ub-crumb"><span>Charmiss Ops</span><span class="dotsep">/</span><b>${U.esc(t('nav_' + App.page))}</b></div>
      <div class="ub-right"><span class="sso-badge">${U.esc(t('sso_demo'))}</span>
        <span class="avatar" aria-hidden="true">${U.esc(Auth.initials())}</span>
        <label class="ub-sel" title="${U.esc(t('switch_user'))}"><span class="sr">${U.esc(t('switch_user'))}</span>
          <select class="ctl" id="profileSel">${Auth.PROFILES.map(p => `<option value="${p.id}"${p.id === P.id ? ' selected' : ''}>${U.esc(Auth.name(p))}</option>`).join('')}</select></label></div>`;
    el.querySelector('#profileSel').addEventListener('change', ev => switchProfile(ev.target.value));
  }
  function switchProfile(id) {
    Auth.set(id);
    if (!Auth.scope && App.F) { /* leaving a locked profile: start from all channels */ App.F.ch = []; App.F.acc = []; }
    lockScope();
    if (!Auth.canPage(App.page)) App.page = Auth.firstPage();
    App.ui.sku = null; App._modelKey = '';
    buildFilters(); writeHash(false); render(); window.scrollTo(0, 0);
  }
  window.addEventListener('resize', U.debounce(() => { if (App.DB && U.isMobile() !== lastMobile) render(); }, 150));

  // ------------------------------------------------------------------ boot
  async function boot() {
    I18N.setLang(I18N.lang);
    document.getElementById('loadingText').textContent = t('loading');
    try {
      App.raw = await loadRaw();
      App.DB = Calc.prepare(App.raw);
      App.sc = Calc.selfCheck(App.DB);
      // Self-check in the console (and on the Data page)
      console.groupCollapsed('%cCharmiss SCM selfCheck: ' + (App.sc.ok ? 'PASS' : 'FAIL'), 'color:' + (App.sc.ok ? '#067647' : '#b42318') + ';font-weight:700');
      console.table(App.sc.checks.map(c => ({ check: c.id, ok: c.ok, problems: c.n, of: c.total, detail: c.detail })));
      console.groupEnd();
    } catch (err) {
      console.error(err);
      document.getElementById('main').innerHTML = U.empty(t('load_fail'), t('load_fail_hint'), 'alert');
      return;
    }
    readHash(); buildFilters(); writeHash(false); render();
    const M = App.model(), mc = Calc.modelCheck(M);
    console.log('model', M.ms + ' ms ·', M.rows.length, 'SKU · cross-page checks', mc.map(c => c.id + ':' + (c.ok ? 'ok' : 'FAIL')).join(' '));
  }
  document.addEventListener('DOMContentLoaded', boot);
})(window);
