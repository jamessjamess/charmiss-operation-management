/* supply/host.js — CR-01 · runs the Supply Planning pages (moved from the Supply Chain Dashboard v3.3) inside the
   Charmiss Ops shell. It replaces the SCM app.js shell: the Ops sidebar / header / login stay as they are; this file owns
   the Supply filter bar, the Supply part of the URL, the data loading and the page render.

   URL  #/supply/<page>?asof=2026-11-23&view=M&ch=MT&acc=A01&brand=…&cat=…&q=…&rr=L3M&h=6&sku=CM-LP-001  (same query as SCM)
   Ops view ids  supOverview · supStock · supExpiry · supConsign · supCalendar · supReplen · supQuota · supProposals · supReview · supSetup
   Formulas stay in calc.js (not edited). Permissions and the department lock come from supply-planning.js through Supply.ctx. */
(function (global) {
  'use strict';
  const t = global.St;
  const TABLES = Data.TABLES;
  const VIEW_OF = { overview: 'supOverview', stock: 'supStock', expiry: 'supExpiry', consign: 'supConsign', calendar: 'supCalendar',
    replen: 'supReplen', quota: 'supQuota', proposals: 'supProposals', report: 'supReview', data: 'supSetup' };
  const PAGE_OF = Object.fromEntries(Object.entries(VIEW_OF).map(([p, v]) => [v, p]));
  const DEF_F = { view: 'W', ch: [], acc: [], brand: [], cat: [], q: '', rr: 'L4W', h: 3 };
  /** What the signed-in user may do — filled by supply-planning.js on every mount. */
  const ctx = { can: () => false, lockCh: null };

  const App = {
    DB: null, raw: null, sc: null, sources: {}, S: Object.assign({}, Calc.DEFAULT_SETTINGS, loadSettings()),
    page: 'overview', F: null, ui: { sku: null, stockTab: 'all', sort: null, pageNo: 1, rrUnit: 'w', projUnit: 'v', wfUnit: 'v' },
    _model: null, _modelKey: '', loadedAt: null,
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
      Object.assign(App.F, patch); enforceScope();
      if (!opt || !opt.keepPage) App.ui.pageNo = 1;
      writeHash(false); syncFilters(); renderPage();
    },
    /** A link to another Supply page goes through the Ops router (menu highlight, page gate, header). */
    go(page, extra) {
      Object.assign(App.ui, extra || {});
      const v = VIEW_OF[page];
      if (typeof global.navigate === 'function' && global.navigate(v) !== false) return;
      App.ui.sku = null;
    },
    openSku(sku) { App.ui.sku = sku; writeHash(false); if (global.Pages.stock.openDrawer) global.Pages.stock.openDrawer(App, sku); },
    closeSku() { App.ui.sku = null; writeHash(false); },
    rerender: () => renderPage(),
    saveSettings(S) {
      App.S = Object.assign({}, Calc.DEFAULT_SETTINGS, S);
      try { localStorage.setItem('scm.settings', JSON.stringify(App.S)); } catch (e) { /* storage blocked: kept for this visit */ }
      App._modelKey = ''; renderPage();
    },
    async reloadData() {
      App.base = await loadRaw();
      buildDB();
      if (App.F) App.F.asDn = Math.max(App.DB.minAsOf, Math.min(App.F.asDn, App.DB.maxAsOf));
      buildFilters(); writeHash(false); renderPage();
    }
  };
  function loadSettings() { try { return JSON.parse(localStorage.getItem('scm.settings') || '{}'); } catch (e) { return {}; } }
  global.App = App;
  global.Pages = global.Pages || {};

  // ------------------------------------------------------------------ data (loaded on the first Supply page, then kept)
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
    if (!texts) {
      if (!global.SCM_BUNDLE) await loadScript('data/mock-bundle.js');
      texts = TABLES.map(n => global.SCM_BUNDLE[n]);
    }
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
  /** CR-01 Phase B: App.base = the Integrated-demo tables (CSV / bundle + imports); App.raw = App.base + the Ops feed (supply-feed.js).
      The DB is rebuilt whenever the feed key changes (any Ops save or a new WMS read) — read-only, the same state gives the same tables. */
  function buildDB() {
    const f = typeof Supply.feed === 'function' ? Supply.feed(App.base) : null;
    App.feedMeta = f ? f.meta : null;
    App.raw = f ? f.raw : App.base;
    App.DB = Calc.prepare(App.raw);
    App.sc = Calc.selfCheck(App.DB);
    if (typeof Supply.feedChecks === 'function') {                       // selfCheck 7–9 (Ops ↔ Supply)
      App.sc.checks = App.sc.checks.concat(Supply.feedChecks(App.DB));
      App.sc.ok = App.sc.checks.every(c => c.ok);
    }
    App.feedKey = typeof Supply.feedKey === 'function' ? Supply.feedKey() : '';
    App._modelKey = ''; App.loadedAt = Date.now();
    console.groupCollapsed('%cCharmiss Ops · Supply selfCheck: ' + (App.sc.ok ? 'PASS' : 'FAIL'), 'color:' + (App.sc.ok ? '#067647' : '#b42318') + ';font-weight:700');
    console.table(App.sc.checks.map(c => ({ check: c.id, ok: c.ok, problems: c.n, of: c.total, detail: c.detail })));
    console.groupEnd();
  }
  let loading = null;
  function ensureData() {
    if (App.DB) {
      if (typeof Supply.feedKey === 'function' && Supply.feedKey() !== App.feedKey) {   // Ops changed since the last build
        const wasLatest = App.F && App.F.asDn >= App.DB.maxAsOf;
        buildDB();
        if (App.F) App.F.asDn = wasLatest ? defaultAsOf() : Math.max(App.DB.minAsOf, Math.min(App.F.asDn, App.DB.maxAsOf));
      }
      return Promise.resolve();
    }
    if (!loading) loading = (async () => {
      App.base = await loadRaw();
      buildDB();
    })().catch(err => { loading = null; throw err; });
    return loading;
  }

  // ------------------------------------------------------------------ URL ⇄ state
  function defaultAsOf() {
    if (App.feedMeta && App.feedMeta.hasEvents) return App.DB.maxAsOf;   // CR-01: with Ops transactions the latest AS OF includes them
    const today = Calc.dn(new Date().toISOString().slice(0, 10));
    return Math.max(App.DB.minAsOf, Math.min(Calc.monday(today), App.DB.maxAsOf));
  }
  function parseHash(h) {
    const m = String(h || '').match(/^#\/supply\/([a-z]+)(?:\?(.*))?$/);
    return m ? { page: m[1], qs: m[2] || '' } : null;
  }
  function readHash() {
    const ph = parseHash(location.hash), p = new URLSearchParams(ph ? ph.qs : '');
    const list = k => (p.get(k) || '').split(',').map(decodeURIComponent).filter(Boolean);
    let as = Calc.dn(p.get('asof'));
    as = as == null ? defaultAsOf() : Math.max(App.DB.minAsOf, Math.min(Calc.monday(as), App.DB.maxAsOf));
    App.F = { asDn: as, view: p.get('view') === 'M' ? 'M' : 'W', ch: list('ch'), acc: list('acc'), brand: list('brand'), cat: list('cat'),
      q: p.get('q') || '', rr: ['L4W', 'L3M', 'L6M', 'W'].includes(p.get('rr')) ? p.get('rr') : App.S.rrBasis || 'L4W', h: [1, 3, 6].includes(+p.get('h')) ? +p.get('h') : 3 };
    App.ui.sku = p.get('sku') || null;
  }
  function hashFor(page) {
    const F = App.F, p = [];
    if (F.asDn !== defaultAsOf()) p.push('asof=' + Calc.iso(F.asDn));
    if (F.view !== DEF_F.view) p.push('view=' + F.view);
    ['ch', 'acc', 'brand', 'cat'].forEach(k => { if (F[k].length && !(k === 'ch' && ctx.lockCh)) p.push(k + '=' + F[k].map(encodeURIComponent).join(',')); });
    if (F.q) p.push('q=' + encodeURIComponent(F.q));
    if (F.rr !== (App.S.rrBasis || DEF_F.rr)) p.push('rr=' + F.rr);
    if (F.h !== DEF_F.h) p.push('h=' + F.h);
    if (App.ui.sku && page === 'stock') p.push('sku=' + encodeURIComponent(App.ui.sku));
    return '#/supply/' + page + (p.length ? '?' + p.join('&') : '');
  }
  function writeHash(push) {
    if (!App.F || !document.getElementById('supRoot')) return;
    const h = hashFor(App.page);
    if (location.hash !== h) history[push ? 'pushState' : 'replaceState'](null, '', h);
  }

  // ------------------------------------------------------------------ department lock (CR-01 7.3): a locked user only ever sees the share of their channel
  function enforceScope() {
    if (!App.F) return;
    if (ctx.lockCh) {
      App.F.ch = [ctx.lockCh];
      const ok = new Set(App.DB.accounts.filter(a => a.channel === ctx.lockCh).map(a => a.account_id));
      App.F.acc = App.F.acc.filter(a => ok.has(a));
    }
  }

  // ------------------------------------------------------------------ the Supply filter bar (AS OF · VIEW BY · Channel · คู่ค้า · Brand · Category · ค้นหา · Run Rate · Horizon)
  const FB = {};
  function buildFilters() {
    const fbar = document.getElementById('fbar'), DB = App.DB; if (!fbar) return;
    const lock = ctx.lockCh;
    fbar.innerHTML = `
      <div class="sh-head"><b>${t('filters')}</b><button type="button" class="btn small primary" data-sheet-close>${t('done')}</button></div>
      <div class="fld"><label for="fAsof">${t('f_asof')}</label><div class="asof">
        <button type="button" class="icon-btn" id="fPrev" title="${t('prev_week')}" aria-label="${t('prev_week')}">${U.icon('left')}</button>
        <input class="ctl" type="date" id="fAsof" step="7" min="${Calc.iso(DB.minAsOf)}" max="${Calc.iso(DB.maxAsOf)}">
        <button type="button" class="icon-btn" id="fNext" title="${t('next_week')}" aria-label="${t('next_week')}">${U.icon('right')}</button></div></div>
      <div class="fld"><span class="lbl">${t('f_view')}</span><div class="seg" id="fView"><button type="button" data-v="W">${t('weekly')}</button><button type="button" data-v="M">${t('monthly')}</button></div></div>
      <div class="fld"><span class="lbl">${t('f_channel')}</span><div id="fCh">${lock ? `<span class="lockchip" title="${U.esc(t('sup_locked_tip'))}">${U.icon('lock')}${U.esc(lock)}</span>` : ''}</div></div>
      <div class="fld"><span class="lbl">${t('f_account')}</span><div id="fAcc"></div></div>
      <div class="fld"><span class="lbl">${t('f_brand')}</span><div id="fBrand"></div></div>
      <div class="fld"><span class="lbl">${t('f_cat')}</span><div id="fCat"></div></div>
      <div class="fld grow"><label for="fQ">${t('f_search')}</label><input class="ctl" type="search" id="fQ" placeholder="${t('tsearch')}" autocomplete="off"></div>
      <div class="fld" title="${U.esc(t('rr_tip'))}"><label for="fRR">${t('f_rr')}</label><select class="ctl" id="fRR">${['L4W', 'L3M', 'L6M', 'W'].map(k => `<option value="${k}">${t('rr_' + k)}</option>`).join('')}</select></div>
      <div class="fld"><span class="lbl">${t('f_h')}</span><div class="seg" id="fH">${[1, 3, 6].map(h => `<button type="button" data-v="${h}">${h}M</button>`).join('')}</div></div>
      <button type="button" class="btn ghost fclear" id="fClear">${t('clear_all')}</button>`;
    const uniq = k => [...new Set(DB.skus.map(s => s[k]))].sort();
    const chans = [...new Set(DB.accounts.map(a => a.channel))];
    FB.ch = lock ? null : U.multiSelect({ label: t('f_channel'), allLabel: t('all'), options: chans.map(c => ({ value: c, label: c })), value: App.F.ch, onChange: v => App.setF({ ch: v, acc: App.F.acc.filter(a => accAllowed(a, v)) }) });
    FB.acc = U.multiSelect({ label: t('f_account'), allLabel: t('all'), options: accOptions(App.F.ch), value: App.F.acc, onChange: v => App.setF({ acc: v }) });
    FB.brand = U.multiSelect({ label: t('f_brand'), allLabel: t('all'), options: uniq('brand').map(b => ({ value: b, label: b })), value: App.F.brand, onChange: v => App.setF({ brand: v }) });
    FB.cat = U.multiSelect({ label: t('f_cat'), allLabel: t('all'), options: uniq('category').map(b => ({ value: b, label: b })), value: App.F.cat, onChange: v => App.setF({ cat: v }) });
    if (FB.ch) fbar.querySelector('#fCh').appendChild(FB.ch.el);
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
    syncFilters();
  }
  function accAllowed(id, chans) { const a = App.DB.accounts.find(x => x.account_id === id); return !chans.length || (a && chans.includes(a.channel)); }
  function accOptions(chans) {
    return App.DB.accounts.filter(a => !chans.length || chans.includes(a.channel))
      .map(a => ({ value: a.account_id, label: a.name, sub: a.channel + (a.is_consignment ? ' · ' + t('consign') : '') }));
  }
  function syncFilters() {
    const F = App.F, fbar = document.getElementById('fbar'); if (!FB.acc || !fbar || !fbar.querySelector('#fAsof')) return;
    fbar.querySelector('#fAsof').value = Calc.iso(F.asDn);
    fbar.querySelector('#fPrev').disabled = F.asDn <= App.DB.minAsOf;
    fbar.querySelector('#fNext').disabled = F.asDn >= App.DB.maxAsOf;
    fbar.querySelectorAll('#fView button').forEach(b => b.classList.toggle('on', b.dataset.v === F.view));
    fbar.querySelectorAll('#fH button').forEach(b => b.classList.toggle('on', +b.dataset.v === F.h));
    fbar.querySelector('#fRR').value = F.rr;
    const q = fbar.querySelector('#fQ'); if (document.activeElement !== q) q.value = F.q;
    if (FB.ch) FB.ch.set(F.ch);
    FB.acc.setOptions(accOptions(F.ch)); FB.acc.set(F.acc); FB.brand.set(F.brand); FB.cat.set(F.cat);
    const n = ['acc', 'brand', 'cat'].filter(k => F[k].length).length + (F.ch.length && !ctx.lockCh ? 1 : 0) + (F.q ? 1 : 0);
    fbar.querySelector('#fClear').classList.toggle('hidden', n === 0);
    const fb = document.getElementById('filterBtn');
    if (fb) fb.innerHTML = U.icon('filter') + `<span>${t('filters')}</span>` + (n ? `<span class="badge">${n}</span>` : '');
  }
  function openSheet(on) {
    const fbar = document.getElementById('fbar'); if (!fbar && on) return;
    if (fbar) fbar.classList.toggle('open', on);
    document.getElementById('sheetOverlay').classList.toggle('hidden', !on);
    document.documentElement.classList.toggle('lock', on);
    const tb = document.getElementById('supTopbar'); if (tb) tb.classList.toggle('sheet', on);
  }
  document.addEventListener('click', e => {
    if (e.target.closest('#filterBtn')) openSheet(true);
    if (e.target.matches('#sheetOverlay') || e.target.closest('[data-sheet-close]')) openSheet(false);
  });

  // ------------------------------------------------------------------ export permission (CR-01 7.2 supply.export): no button, and a click can never run
  const EXPORT_SEL = '[data-card-act="download"],#tXlsx,#lotXlsx,#mxXlsx,#rcXlsx,#evXlsx,#qXlsx,#rpXlsx,#rpXl,#rpJson';
  document.addEventListener('click', e => {
    if (!document.getElementById('supRoot') && !e.target.closest('#supDrawer,#supModal')) return;
    if (!ctx.can('supply.export') && e.target.closest(EXPORT_SEL)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  function stripDenied(host) {
    if (!ctx.can('supply.export')) host.querySelectorAll(EXPORT_SEL).forEach(b => b.remove());
  }

  // ------------------------------------------------------------------ render
  function renderPage() {
    const main = document.getElementById('main'); if (!main || !App.DB) return;
    U.closePop();
    Charts.killAll(); Charts.applyTheme();
    const pg = global.Pages[App.page] || global.Pages.overview;
    const tt = document.getElementById('supTopTitle'); if (tt) tt.textContent = t('nav_' + App.page);
    try { pg.render(main, App); }
    catch (err) { console.error(err); main.innerHTML = U.empty(t('load_fail'), String(err && err.message || err), 'alert'); }
    stripDenied(main);
    if (typeof Supply.afterRender === 'function') Supply.afterRender(main, App);
    if (App.ui.sku && App.page === 'stock') App.openSku(App.ui.sku);
    else if (U.drawer.isOpen()) U.drawer.close();
    lastMobile = U.isMobile();
  }
  let lastMobile = null;
  window.addEventListener('resize', U.debounce(() => { if (App.DB && document.getElementById('supRoot') && U.isMobile() !== lastMobile) renderPage(); }, 150));

  /** The page body the Ops shell puts inside #page for a Supply view. */
  function shellHTML() {
    return `<div class="sup" id="supRoot">
      <div class="topbar" id="supTopbar">
        <div class="tb-mobile"><b id="supTopTitle"></b><button type="button" class="btn" id="filterBtn"></button></div>
        <div class="tb-row"><div class="fbar" id="fbar"></div></div>
      </div>
      <div class="sup-meta" id="supMeta"></div>
      <div id="main"><div class="loading"><div><div class="spinner"></div><span>${U.esc(t('loading'))}</span></div></div></div>
    </div>`;
  }

  /** Called by the Ops bind() for a Supply view: load the data once, build the filter bar, render the page. */
  let pendingPush = false;
  function mount(view, opts) {
    if (!document.getElementById('supRoot')) return;
    App.page = PAGE_OF[view] || 'overview';
    if (typeof global.lang === 'string' || typeof lang === 'string') I18N.setLang(typeof lang === 'string' ? lang : global.lang);   // follow the Ops language
    if (opts && opts.push) pendingPush = true;
    ensureData().then(() => {
      if (!document.getElementById('supRoot') || PAGE_OF[currentView()] !== App.page) return;
      const ph = parseHash(location.hash), keepSku = App.ui.sku;
      if (!App.F) readHash();
      else if (ph && ph.page === App.page && ph.qs !== (hashFor(App.page).split('?')[1] || '')) readHash();
      if (!App.ui.sku && keepSku && App.page === 'stock') App.ui.sku = keepSku;   // a link from an Ops page (e.g. Stockout Date) opens that SKU
      enforceScope();
      buildFilters();
      renderMeta();
      renderPage();
      writeHash(pendingPush); pendingPush = false;
    }).catch(err => {
      console.error(err);
      const main = document.getElementById('main');
      if (main) main.innerHTML = U.empty(t('load_fail'), t('load_fail_hint'), 'alert');
    });
  }
  function currentView() { try { return view; } catch (e) { return global.view; } }   // the Ops router state (global let `view`)
  function renderMeta() {
    const el = document.getElementById('supMeta'); if (!el || !App.DB) return;
    el.innerHTML = typeof Supply.metaHTML === 'function' ? Supply.metaHTML(App) : '';
  }

  /** Back / forward between Supply pages (or a pasted link while signed in). */
  window.addEventListener('popstate', () => {
    const ph = parseHash(location.hash);
    if (!ph || !VIEW_OF[ph.page]) return;
    if (App.DB) readHash();
    if (typeof global.navigate === 'function') global.navigate(VIEW_OF[ph.page], { fromHash: true });
  });

  /** CR-01 Phase C (B3): a "เสนอ" column for the tables a proposal starts from — only for accounts with supply.propose.
      fn(row) → payload { type: 'recall' | 'quota' | 'po', sku, account?, qty, value?, dest?, detail? } or null for no button on that row. */
  global.Pages.propCol = fn => (ctx.can('supply.propose') ? [{ k: 'prop', label: t('prop_col'), nosort: true, noxl: true, get: () => '',
    html: r => { const p = fn(r); return p && p.qty > 0 ? `<button type="button" class="btn small" data-propose="${U.esc(JSON.stringify(p))}" title="${U.esc(t('prop_tip'))}">${U.icon('proposal')}${t('prop_btn')}</button>` : ''; } }] : []);

  const Supply = global.Supply = {
    App, VIEW_OF, PAGE_OF, ctx, shellHTML, mount, ensureData, parseHash, renderPage, openSheet, defaultAsOf: () => defaultAsOf(),   // CR-01 Phase C
    isView: v => !!PAGE_OF[v],
    clearHash() { if (parseHash(location.hash)) history.replaceState(null, '', location.pathname + location.search); },
    refreshTheme() { if (document.getElementById('supRoot') && App.DB) renderPage(); },
    metaHTML: null, afterRender: null
  };
})(window);
