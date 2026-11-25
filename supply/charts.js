/* charts.js — Chart.js setup, theme colours from the CSS tokens, and the chart card:
   every chart card has 3 buttons — table toggle · download (PNG / Excel) · expand. KPI cards have none. */
(function (global) {
  'use strict';
  const t = global.St;   // CR-01: Supply translator (the global `t` belongs to the Ops shell)
  const C = { reg: new Map(), cards: new Map() };

  /** Current colours from CSS variables (so Light / Dark / System all work). */
  C.col = function () {
    const cs = getComputedStyle(document.querySelector('.sup') || document.documentElement), v = n => cs.getPropertyValue(n).trim();   // CR-01: Supply tokens live on .sup
    return {
      text: v('--text'), text2: v('--text-2'), muted: v('--muted'), grid: v('--grid'), border: v('--border'), surface: v('--surface'), surface2: v('--surface-2'),
      wh: v('--c-wh'), cons: v('--c-cons'), it: v('--c-it') || '#0e9f9a', /* CR-01: in-transit series */ line: v('--c-line'), po: v('--c-po'), cn: v('--c-cn'), up: v('--c-up'), down: v('--c-down'),
      anchor: v('--c-anchor'), anchorStrong: v('--c-anchor-strong'), accent: v('--accent'), err: v('--err'), warn: v('--s-reorder'),
      status: { stockout: v('--s-stockout'), reorder: v('--s-reorder'), healthy: v('--s-healthy'), overstock: v('--s-overstock'), expiry: v('--s-expiry'), npd: v('--s-npd'), inactive: v('--s-npd') }
    };
  };
  C.alpha = (hex, a) => {
    const h = hex.replace('#', ''); if (h.length !== 6) return hex;
    return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
  };

  C.applyTheme = function () {
    if (!global.Chart) return;
    const c = C.col();
    Chart.defaults.font.family = 'Inter, "Noto Sans Thai", system-ui, -apple-system, "Segoe UI", sans-serif';   // CR-01: Ops font
    Chart.defaults.font.size = 12;
    Chart.defaults.color = c.muted;
    Chart.defaults.borderColor = c.grid;
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.tooltip.backgroundColor = c.surface;
    Chart.defaults.plugins.tooltip.titleColor = c.text;
    Chart.defaults.plugins.tooltip.bodyColor = c.text2;
    Chart.defaults.plugins.tooltip.borderColor = c.border;
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
    Chart.defaults.plugins.tooltip.usePointStyle = true;
    Chart.defaults.animation.duration = 250;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.responsive = true;
  };

  // ---------- plugins
  const bgFill = {          // fills the canvas with the card colour (so the PNG download is not transparent)
    id: 'bgFill',
    beforeDraw(chart) { const { ctx, width, height } = chart; ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = C.col().surface; ctx.fillRect(0, 0, width, height); ctx.restore(); }
  };
  const vLines = {          // options.plugins.vLines = [{ index, label, color, dash }]
    id: 'vLines',
    afterDatasetsDraw(chart, args, opts) {
      const lines = (opts && opts.lines) || [], x = chart.scales.x, area = chart.chartArea;
      if (!x) return;
      const ctx = chart.ctx; ctx.save();
      lines.forEach(l => {
        if (l.index == null || l.index < 0 || l.index >= chart.data.labels.length) return;
        const px = x.getPixelForValue(l.index);
        ctx.strokeStyle = l.color; ctx.lineWidth = 1.25; ctx.setLineDash(l.dash || []);
        ctx.beginPath(); ctx.moveTo(px, area.top + 12); ctx.lineTo(px, area.bottom); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle = l.color; ctx.font = '600 11px "Noto Sans Thai", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(l.label, Math.min(Math.max(px, area.left + 24), area.right - 24), area.top + 8);
      });
      ctx.restore();
    }
  };
  const barLabels = {       // options.plugins.barLabels = { labels: [...], ds } — text above each bar (ds = the dataset on top of a stack)
    id: 'barLabels',
    afterDatasetsDraw(chart, args, opts) {
      if (!opts || !opts.labels) return;
      const meta = chart.getDatasetMeta(opts.ds || 0), ctx = chart.ctx; ctx.save();
      ctx.font = '600 11px "Noto Sans Thai", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = C.col().text2;
      meta.data.forEach((bar, k) => { const s = opts.labels[k]; if (!s) return; const top = Math.min(bar.y, bar.base); ctx.fillText(s, bar.x, top - 6); });
      ctx.restore();
    }
  };
  const refLines = {        // options.plugins.refLines = { x: [80, 120] } — dashed reference lines on a numeric x axis (scatter)
    id: 'refLines',
    afterDatasetsDraw(chart, args, opts) {
      if (!opts || !opts.x || !chart.scales.x) return;
      const x = chart.scales.x, a = chart.chartArea, ctx = chart.ctx, col = C.col().muted; ctx.save();
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1; ctx.font = '600 11px "Noto Sans Thai", sans-serif';
      opts.x.forEach(v => { const px = x.getPixelForValue(v); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(px, a.top); ctx.lineTo(px, a.bottom); ctx.stroke(); ctx.setLineDash([]); ctx.fillText(v + '%', px + 4, a.top + 12); });
      ctx.restore();
    }
  };
  C.plugins = [bgFill, vLines, barLabels, refLines];

  /** Create (or replace) a chart on a canvas. */
  C.make = function (key, canvas, config) {
    C.kill(key);
    if (!global.Chart || !canvas) return null;
    config.plugins = (config.plugins || []).concat(C.plugins);
    const ch = new Chart(canvas.getContext('2d'), config);
    C.reg.set(key, ch);
    return ch;
  };
  C.kill = key => { const c = C.reg.get(key); if (c) { c.destroy(); C.reg.delete(key); } };
  C.killAll = () => { C.reg.forEach(c => c.destroy()); C.reg.clear(); C.cards.clear(); };

  // ---------- chart card
  /** HTML of a chart card. Bind it after it is in the page with C.bind(id, spec).
      o = { id, title, tip, tools (extra HTML, e.g. a unit toggle), legend (HTML), boxClass, foot (HTML) } */
  C.card = function (o) {
    return `<section class="card" id="card-${o.id}" data-card="${o.id}">
      <div class="card-head"><h3>${U.esc(o.title)} ${o.tip ? U.info(o.tip) : ''}</h3>
        <div class="card-tools">${o.tools || ''}
          <button type="button" class="icon-btn" data-card-act="table" title="${t('b_table')}" aria-label="${t('b_table')}">${U.icon('table')}</button>
          <span class="rel"><button type="button" class="icon-btn" data-card-act="download" title="${t('b_download')}" aria-label="${t('b_download')}">${U.icon('download')}</button></span>
          <button type="button" class="icon-btn" data-card-act="expand" title="${t('b_expand')}" aria-label="${t('b_expand')}">${U.icon('expand')}</button>
        </div></div>
      ${o.legend ? `<div class="legend">${o.legend}</div>` : ''}
      <div class="cbody" style="display:flex;flex-direction:column;flex:1;min-height:0">${o.body || `<div class="chart-box ${o.boxClass || ''}"><canvas></canvas></div>`}</div>
      <div class="ctable hidden"></div>
      ${o.foot ? `<div class="foot-note">${o.foot}</div>` : ''}
    </section>`;
  };
  /** spec = { build(canvas, big) → Chart config | null (non-canvas body), table() → {cols, rows}, filename, title, render(bodyEl, big) for custom bodies } */
  C.bind = function (id, spec) {
    C.cards.set(id, Object.assign({ mode: 'chart' }, spec));
    const card = document.getElementById('card-' + id); if (!card) return;
    if (spec.build) C.make(id, card.querySelector('.cbody canvas'), spec.build(false));
    if (spec.afterRender) spec.afterRender(card);
  };

  function tableHTML(tb) {
    return `<div class="tablewrap free"><table class="tbl compact"><thead><tr>${tb.cols.map((c, k) => `<th class="${k ? 'num' : ''}">${U.esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${tb.rows.map(r => `<tr>${r.map((v, k) => `<td class="${k ? 'num' : ''}">${typeof v === 'number' ? U.n(v) : U.esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-card-act]'); if (!b) return;
    const card = b.closest('[data-card]'); const id = card.dataset.card, spec = C.cards.get(id); if (!spec) return;
    const act = b.dataset.cardAct;
    if (act === 'table') {
      spec.mode = spec.mode === 'chart' ? 'table' : 'chart';
      const tbl = card.querySelector('.ctable'), body = card.querySelector('.cbody');
      if (spec.mode === 'table') { tbl.innerHTML = tableHTML(spec.table()); tbl.classList.remove('hidden'); body.classList.add('hidden'); }
      else { tbl.classList.add('hidden'); body.classList.remove('hidden'); }
      b.innerHTML = U.icon(spec.mode === 'table' ? 'chart' : 'table');
      b.title = t(spec.mode === 'table' ? 'b_chart' : 'b_table');
      b.classList.toggle('on', spec.mode === 'table');
    } else if (act === 'download') {
      const items = [];
      const ch = C.reg.get(id);
      if (ch) items.push({ label: t('b_png'), icon: 'chart', onClick: () => U.downloadURL(ch.toBase64Image('image/png', 1), (spec.filename || id) + '.png') });
      items.push({ label: t('b_xlsx'), icon: 'table', onClick: () => { const tb = spec.table(); U.xlsx((spec.filename || id) + '.xlsx', [{ name: spec.title || id, rows: [tb.cols, ...tb.rows] }]); } });
      U.menu(b, items);
    } else if (act === 'expand') {
      U.modal.open(`<div class="card-head"><h3>${U.esc(spec.title || '')}</h3><div class="card-tools"><button type="button" class="icon-btn lg" data-close aria-label="${t('b_close')}">${U.icon('close')}</button></div></div>
        ${spec.legendHTML ? `<div class="legend">${spec.legendHTML}</div>` : ''}
        <div class="chart-box" style="flex:1">${spec.build ? '<canvas></canvas>' : ''}</div>`, () => C.kill(id + '-big'));
      const box = document.querySelector('#supModal .chart-box');
      if (spec.build) C.make(id + '-big', box.querySelector('canvas'), spec.build(true));
      else if (spec.renderBig) spec.renderBig(box);
    }
  });

  // ---------- shared axis helpers
  C.tickMoney = v => U.moneyShort(v);
  C.tickQty = v => U.short(v);
  /** y range around the data (with ~8 % padding) — a tight band must not hug a zero axis */
  C.range = (vals, zeroOk) => {
    const xs = vals.filter(v => v != null && isFinite(v));
    if (!xs.length) return {};
    let lo = Math.min(...xs), hi = Math.max(...xs);
    if (zeroOk && lo >= 0 && lo < (hi - lo) * 1.5) lo = 0;
    const pad = (hi - lo || Math.abs(hi) || 1) * 0.08;
    return { min: lo === 0 ? 0 : lo - pad, max: hi + pad };
  };

  global.Charts = C;
})(window);
