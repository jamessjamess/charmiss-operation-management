/* tools/uat-cr05-probe.js — CR-05 page measurements (browser console; also used by SupUAT.cr05). C5Probe.page() measures the open page:
   height · first content top · tables that scroll sideways without sticky first/last column · visible text under 11 / 12 px · ISO / dd/mm/yyyy dates ·
   internal codes · disabled buttons · tap targets under 40 px (≤ 768 px) · page header (eyebrow · breadcrumb · titles equal to H1 · full-width bars
   before the content) · tables still in table form on a phone. C5Probe.all(views) visits each page the signed-in role can open. */
(function (global) {
  'use strict';
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const vis = el => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0; };
  const FIRST = '#page .hm-work, #page .ofb, #page table, #page .kpis, #page .kpi, #page .hm-card, #page .panel, #page .card, #page .clist, #page .ccard, #page .cr4-tabs, #main .kpis, #main .card, #main table, #main .clist, #main > :not(.pagehead):not(.note):not(.loading)';
  const BARS = '.banner, .note, .notice, .pp-bar, .sup-meta, .callout, .c5-ro';
  const word = s => s.replace(/[^\p{L}\p{N}&]+/gu, ' ').trim().toLowerCase();
  function textNodes(root) { const out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: x => x.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP }); while (w.nextNode()) out.push(w.currentNode); return out; }
  function page() {
    const main = document.querySelector('main'), W = innerWidth, res = { view: typeof view !== 'undefined' ? view : '', w: W, height: document.documentElement.scrollHeight };
    const first = [...document.querySelectorAll(FIRST)].filter(vis).map(e => e.getBoundingClientRect().top + scrollY).sort((a, b) => a - b)[0];
    res.first = first == null ? null : Math.round(first);
    res.hs = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    res.wide = [...document.querySelectorAll('main .tablewrap, main .tbl-wrap, #modal[open] .tablewrap')].filter(vis).filter(w => w.scrollWidth > w.clientWidth + 4).filter(w => { const t = w.querySelector('table'); return !(t && (t.classList.contains('c5-sticky') || t.querySelector('th.sticky, td.sticky'))); }).map(w => (w.querySelector('th') || {}).textContent + ' ' + w.scrollWidth + '/' + w.clientWidth).slice(0, 5);
    const small = [], tiny = [], dates = [], tech = [];
    for (const n of textNodes(main)) {
      const el = n.parentElement; if (!vis(el) || el.closest('.c5-umenu[hidden], option, script, style')) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize), inT = !!el.closest('table, .card, .ccard, .clist, .kpi, .hm-card, .pill, .st, .grp, .chip, .drp');
      if (fs < 11) tiny.push(n.nodeValue.trim().slice(0, 20) + ':' + fs); else if (fs < 12 && !inT) small.push(n.nodeValue.trim().slice(0, 20) + ':' + fs);
      const s = n.nodeValue;
      if (/\b20\d\d-\d\d-\d\d\b|\b\d\d\/\d\d\/20\d\d\b/.test(s)) dates.push(s.trim().slice(0, 40));
      if (/(INTEGRATED|MIGRATION)-\d{10,}/.test(s)) tech.push(s.trim().slice(0, 40));
    }
    res.tiny = tiny.length; res.small = small.length; res.smallEx = [...new Set(small)].slice(0, 4); res.tinyEx = [...new Set(tiny)].slice(0, 4);
    res.dates = dates.slice(0, 3); res.tech = tech.slice(0, 2);
    const dis = [...main.querySelectorAll('button:disabled')].filter(vis);
    res.disabled = dis.length;
    res.disabledNoTip = dis.filter(b => +getComputedStyle(b).opacity < 0.9 && !b.matches('[data-c5-pg], [data-pg], [data-c5-keep], .pf-bar') && !b.title && !b.closest('[title]')).map(b => b.textContent.trim().slice(0, 16)).slice(0, 8);   // faded buttons (a full-colour number tile without a link is not one)
    if (W <= 768) res.tap = [...main.querySelectorAll('button:not(.pf-bar), select, a[href], input:not([type=hidden])')].filter(vis).filter(e => { const r = e.getBoundingClientRect(), box = e.closest('label, td.c5-tap, th.c5-tap'); const R = box ? box.getBoundingClientRect() : r; return Math.max(r.width, R.width) < 40 || Math.max(r.height, R.height) < 40; }).map(e => (e.textContent || e.value || e.type).trim().slice(0, 14)).slice(0, 6);
    // G1 · C1 — page header
    const h1 = [...main.querySelectorAll('h1')].filter(vis)[0]; res.h1 = h1 ? h1.textContent.trim() : '';
    res.eyebrow = [...main.querySelectorAll('.eyebrow')].filter(vis).length + (/CHARMISS\s*\/\s*[A-Z]{3,}/.test(main.innerText) ? 1 : 0);
    res.dupTitle = res.h1 ? [...main.querySelectorAll('h2, h3, .panelhead b, #supTopTitle, .sticky-title')].filter(vis).filter(e => e !== h1 && word(e.textContent) === word(res.h1)).map(e => e.tagName).slice(0, 3) : [];
    const mw = ((document.querySelector('main .content') || main).clientWidth) * 0.8;
    res.bars = [...main.querySelectorAll(BARS + ', .c5-about')].filter(e => !e.parentElement.closest('.c5-about')).filter(vis).filter(e => { const r = e.getBoundingClientRect(); return r.width >= mw && (first == null || r.top + scrollY < first); }).length;   // the open "about this page" panel counts once
    const cr = document.querySelector('.c5-crumb'); res.crumbGrp = cr ? word((cr.querySelector('.c5-grp') || {}).textContent || '') : null; res.crumbPage = cr ? ((cr.querySelector('b') || {}).textContent || '').trim() : null;
    const act = document.querySelector('aside nav button.active'), head = act && act.closest('.navgroup') && act.closest('.navgroup').querySelector('.navhead');
    res.navGrp = head ? word(head.textContent) : '';
    // G8 — the generic "no match" text (the sweep runs with no user filter)
    res.noRes = typeof global.t === 'function' && main.innerText.includes(global.t('noResults'));
    // G2 — list tables in table form on a phone
    res.tblMode = W <= 640 ? [...main.querySelectorAll('table.c5-ct')].filter(vis).filter(t => getComputedStyle(t).display === 'table').length : 0;
    return res;
  }
  async function all(views, settle) {
    const out = [];
    for (const v of views) { if (!global.workCanVisit(v)) continue; if (global.navigate(v) === false) continue; await wait(v.startsWith('sup') ? (settle || 1400) : 300); global.scrollTo(0, 0); out.push(page()); }
    return out;
  }
  global.C5Probe = { page, all, vis };
})(window);
