/* pages/overview.js — ภาพรวม
   Row 1: 6 KPI (no buttons) · Row 2: Stock Projection (2/3) | SKU status donut (1/3) · Row 3: Stock movement waterfall | Top 10 actions */
(function (global) {
  'use strict';
  const t = global.St;   // CR-01: Supply translator (the global `t` belongs to the Ops shell)
  const Pages = global.Pages = global.Pages || {};

  /** Δ vs the previous period. polarity: 'up' = higher is better · 'down' = lower is better · 'none' = neutral (grey). */
  function delta(cur, prev, kind, polarity) {
    if (cur == null || prev == null || !isFinite(cur) || !isFinite(prev)) return `<span class="delta flat">—</span>`;
    const diff = cur - prev;
    let txt, size = Math.abs(diff);
    if (kind === 'rel') { if (prev === 0) return `<span class="delta flat">—</span>`; size = Math.abs(diff / prev * 100); txt = U.n(size, 1) + '%'; }
    else if (kind === 'pp') txt = U.n(size, 1) + ' pp';
    else if (kind === 'days') txt = U.n(size) + ' ' + t('days');
    else if (kind === 'money') txt = U.moneyShort(size);
    else txt = U.n(size);
    const flat = kind === 'rel' ? size < 0.05 : size < 0.5;
    const arrow = flat ? '■' : diff > 0 ? '▲' : '▼';
    const cls = flat || polarity === 'none' ? 'flat' : (diff > 0) === (polarity === 'up') ? 'good' : 'bad';
    return `<span class="delta ${cls}">${arrow} ${txt}</span>`;
  }

  function periodText(M) {
    const p = M.period;
    if (p.view === 'M') {
      const [y, m] = p.month.split('-');
      return t('period_m', { m: I18N.monthLong(+m - 1) + ' ' + y, a: U.dateShort(p.p0), b: U.date(p.p1 - 1) }) + (p.partial ? ` <span class="est-badge">${t('mtd')}</span>` : '');
    }
    return t('period_w', { a: U.dateShort(p.p0), b: U.date(p.p1 - 1) });
  }
  Pages.periodText = periodText;
  Pages.pageHead = function (M, titleKey, qKey, right) {
    return `<div class="pagehead"><div><h1 class="page">${U.esc(t(titleKey))}</h1><div class="q">${U.esc(t(qKey))}</div></div>
      <div class="perchip">${periodText(M)}<span class="dotsep">·</span>${t('f_asof')} <b>${U.date(M.asDn)}</b><span class="dotsep">·</span>Run Rate <b>${M.basis === 'W' ? 'Weighted' : M.basis}</b><span class="dotsep">·</span>${t('f_h')} <b>${M.h}M</b>${right || ''}</div></div>`;
  };
  Pages.allocNote = M => M.allMask ? '' : `<div class="note">${U.icon('info')}<span>${t('alloc_note')} · ${t('status_note')}</span></div>`;

  function kpiCard(label, tip, value, sub, d, vs, cls) {
    return `<div class="kpi ${cls || ''}"><div class="l">${U.esc(label)} ${U.info(tip)}</div><div class="v">${value}</div><div class="s">${sub}</div><div class="d">${d || ''}<span>${U.esc(vs || '')}</span></div></div>`;
  }
  Pages.kpiCard = kpiCard;
  Pages.delta = delta;
  /** every U.seg(id, …) on the page writes App.ui[id] and re-renders */
  Pages.bindSegs = (main, App) => main.querySelectorAll('[data-seg]').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b || b.classList.contains('on')) return;
    App.ui[seg.dataset.seg] = b.dataset.v; App.rerender();
  }));

  Pages.overview = {
    render(main, App) {
      const M = App.model(), k = M.kpi, p = M.kpiPrev || {}, S = M.S;
      const vs = M.kpiPrev ? t('vs_prev', { p: t(M.period.view === 'M' ? 'prev_m' : 'prev_w') }) : t('no_prev');
      let html = Pages.pageHead(M, 'nav_overview', 'q_overview') + Pages.allocNote(M);
      if (!M.rows.length) { main.innerHTML = html + `<div class="card">${U.empty(t('empty'), t('empty_hint'), 'filter')}</div>`; return; }
      const whV = M.rows.reduce((x, r) => x + r.whSel * r.cost, 0), cV = M.rows.reduce((x, r) => x + r.consSel * r.cost, 0);
      const itV = M.rows.reduce((x, r) => x + (r.itSel || 0) * r.cost, 0);   // CR-01 (F5): 3rd segment of the stock value
      const soQty = M.rows.reduce((x, r) => x + Calc.flowsSku(App.DB, r.i, M.period.p0, M.period.p1, M.mask, 1).soCons, 0);
      const riskQ = M.rows.reduce((x, r) => x + (r.riskQtyH || 0), 0);
      // CR-01 F4: the DOC Δ is neutral (grey) — DOC up can be good (restock) or bad (piling up); good / bad is on the Overstock and Stockout cards
      html += `<div class="kpis">
        ${kpiCard(t('k_stock_value'), t('k_stock_tip'), U.money(k.stockValue), t('k_sub_stock', { wh: U.moneyShort(whV), c: U.moneyShort(cV) }) + (itV > 0.5 ? ' · ' + t('k_it') + ' ' + U.moneyShort(itV) : ''), delta(k.stockValue, p.stockValue, 'rel', 'none'), vs)}
        ${kpiCard(t('k_doc'), t('k_doc_tip'), k.doc == null ? '—' : `${U.n(k.doc)}<small>${t('days')}</small>`, t('k_sub_doc', { m: k.doc == null ? '—' : U.n(k.doc / 30, 1) }), delta(k.doc, p.doc, 'days', 'none'), vs)}
        ${kpiCard(t('k_st'), t('k_st_tip'), U.pct(k.sellThrough, 1), t('k_sub_st', { so: U.n(soQty) }), delta(k.sellThrough, p.sellThrough, 'pp', 'up'), vs)}
        ${kpiCard(t('k_stockout'), t('k_stockout_tip'), `${U.n(k.stockoutSku)}<small>SKU</small>`, t('k_sub_stockout', { n: U.n(k.skuCount), r: U.n(M.statusCount.reorder) }), delta(k.stockoutSku, p.stockoutSku, 'abs', 'down'), vs)}
        ${kpiCard(t('k_risk'), t('k_risk_tip'), U.money(k.riskValue), t('k_sub_risk', { h: M.h + 'M', q: U.n(riskQ) }), delta(k.riskValue, p.riskValue, 'rel', 'down'), vs)}
        ${kpiCard(t('k_fit'), t('k_fit_tip', { lo: S.fitLow, hi: S.fitHigh }), U.pct(k.quotaFit), t('k_sub_fit', { ok: U.n(k.quotaFitOk), n: U.n(k.quotaFitN) }), delta(k.quotaFit, p.quotaFit, 'pp', 'up'), vs)}
      </div>`;

      // Row 2
      const unitSeg = (key, cur) => `<div class="seg sm" data-unit="${key}"><button type="button" data-v="v" class="${cur === 'v' ? 'on' : ''}">${t('u_value')}</button><button type="button" data-v="q" class="${cur === 'q' ? 'on' : ''}">${t('u_qty')}</button></div>`;
      const c = Charts.col();
      const projLegend = `<span><i style="background:${Charts.alpha(c.wh, .6)}"></i>${t('l_wh')}</span><span><i style="background:${Charts.alpha(c.cons, .85)}"></i>${t('l_cons')}</span>${App.DB.hasIT ? `<span><i style="background:${Charts.alpha(c.it, .6)}"></i>${t('l_it')}</span>` : ''}
        <span><i class="line" style="background:${c.line}"></i>${t('l_sellout')}</span><span><i class="tri"></i>${t('l_po')}</span><span><i class="dia" style="background:${c.cn}"></i>${t('l_cn')}</span>
        <span style="color:${c.muted}"><i class="dash"></i>${t('l_est')} <span class="est-badge">Est.</span></span>`;
      const keys = Calc.STATUS_ORDER.filter(s => s !== 'inactive' || M.statusCount.inactive);
      const nSku = M.rows.length;
      const donutBody = `<div class="donut-wrap"><div class="donut-box"><canvas></canvas><div class="donut-center"><div><b>${U.n(nSku)}</b><span>SKU</span></div></div></div>
        <div class="slist">${keys.map(s => `<button type="button" class="srow${M.statusCount[s] ? '' : ' zero'}" data-go-tab="${s}" title="${U.esc(t('st_' + s + '_tip', { d: s === 'reorder' ? S.reorderWindow : S.overstockDoc }))}"><span class="sw" style="background:${c.status[s]}"></span><span>${U.esc(t('st_' + s))}</span><span class="n">${U.n(M.statusCount[s])}</span><span class="p">${U.pct(nSku ? M.statusCount[s] / nSku * 100 : 0)}</span></button>`).join('')}
        <button type="button" class="srow${M.statusCount.expiry ? '' : ' zero'}" data-go-tab="expiry" title="${U.esc(t('st_expiry_tip', { d: S.expiryWindow }))}" style="border-top:1px dashed var(--border);border-radius:0 0 8px 8px;margin-top:2px"><span class="sw" style="background:${c.status.expiry};transform:rotate(45deg) scale(.85)"></span><span>${U.esc(t('st_expiry'))} <span class="small muted">(${t('more')})</span></span><span class="n">${U.n(M.statusCount.expiry)}</span><span class="p">${U.pct(nSku ? M.statusCount.expiry / nSku * 100 : 0)}</span></button></div></div>`;
      html += `<div class="grid2">
        ${Charts.card({ id: 'proj', title: t('c_projection'), tip: t('c_projection_tip'), tools: unitSeg('projUnit', App.ui.projUnit), legend: projLegend })}
        ${Charts.card({ id: 'status', title: t('c_status'), tip: t('c_status_tip'), body: donutBody })}
      </div>`;

      // Row 3
      const wfLegend = `<span><i style="background:${c.anchor}"></i>${t('wf_open')} / ${t('wf_close')}</span><span><i style="background:${c.up}"></i>+</span><span><i style="background:${c.down}"></i>−</span>`;
      const acts = M.actions.slice(0, 10);
      const actBody = acts.length ? `<div class="alist">${acts.map((r, n) => actionRow(r, n, M)).join('')}</div>` : U.empty(t('none'), '', 'check');
      html += `<div class="grid2 even">
        ${Charts.card({ id: 'wf', title: t('c_waterfall'), tip: t('c_waterfall_tip'), tools: unitSeg('wfUnit', App.ui.wfUnit), legend: wfLegend, boxClass: 'h-row3', foot: `${periodText(M)} · ${t('y_not_zero')}` })}
        <section class="card" id="card-actions"><div class="card-head"><h3>${t('c_actions')} ${U.info(t('c_actions_tip'))}</h3>
          <div class="card-tools"><button type="button" class="btn ghost small" data-nav-stock>${t('nav_stock')} ${U.icon('right')}</button></div></div>${actBody}</section>
      </div>`;
      // CR-03 R2: non-sales issues month-to-date (AS OF), by type — they lower WH but are never Sales Out
      const oo = Calc.otherOutOf(App.DB, M.rows, M.mask, Calc.monthStart(M.asDn), M.asDn), ooT = ['pr', 'sample', 'internal', 'writeoff', 'other'];
      // CR-03 R3: lost sales of the last 4 weeks (out-of-stock weeks × the run rate without them), largest SKUs first
      const lostRows = M.rows.filter(r => r.lost4V > 0.5).sort((x, y) => y.lost4V - x.lost4V), lostV = lostRows.reduce((x, r) => x + r.lost4V, 0), lostQ = lostRows.reduce((x, r) => x + r.lost4Q, 0);
      html += `<div class="grid2 even" style="margin-top:16px"><section class="card" id="card-oo"><div class="card-head"><h3>${t('c_oo')} ${U.info(t('c_oo_tip'))}</h3><span class="muted small">${U.dateShort(Calc.monthStart(M.asDn))} – ${U.dateShort(M.asDn - 1)}</span></div>
        <div class="oo-row">${ooT.map(k => { const x = oo.byType[k] || { qty: 0, value: 0 }; return `<div class="oo-item${x.qty ? '' : ' zero'}"><span>${t('oo_' + k)}</span><b>${U.n(x.qty)}</b><small>${U.money(x.value)}</small></div>`; }).join('')}
        <div class="oo-item tot"><span>${t('oo_total')}</span><b>${U.n(oo.qty)}</b><small>${U.money(oo.value)}</small></div></div></section>
        <section class="card" id="card-lost"><div class="card-head"><h3>${t('c_lost')} ${U.info(t('c_lost_tip'))}</h3><span class="muted small">${U.dateShort(M.asDn - 28)} – ${U.dateShort(M.asDn - 1)}</span></div>
          ${lostRows.length ? `<div class="lost-head"><b>${U.money(lostV)}</b><span class="muted small">${t('lost_sub', { q: U.n(lostQ), n: U.n(lostRows.length) })}</span></div>
          <div class="small muted" style="margin:6px 0 4px">${t('lost_top')}</div><div class="lost-list">${lostRows.slice(0, 5).map(r => `<button type="button" class="lost-item" data-go-sku="${U.esc(r.sku)}"><span class="cell2"><b>${U.esc(r.name)}</b><span class="sub">${U.esc(r.sku)} · OOS ${r.oosW13}/13</span></span><b class="tnum">${U.money(r.lost4V)}</b></button>`).join('')}</div>`
          : U.empty(t('lost_none'), '', 'check')}</section></div>`;
      main.innerHTML = html;

      // bind charts
      Charts.bind('proj', { title: t('c_projection'), filename: 'stock-projection', legendHTML: projLegend, build: big => projConfig(M, App.ui.projUnit, big), table: () => projTable(M, App.ui.projUnit) });
      Charts.bind('status', { title: t('c_status'), filename: 'sku-status', build: big => donutConfig(M, keys, App, big),
        table: () => ({ cols: [t('col_status'), t('col_count'), '%'], rows: keys.map(s => [t('st_' + s), M.statusCount[s], +(nSku ? M.statusCount[s] / nSku * 100 : 0).toFixed(1)]).concat([[t('st_expiry') + ' (overlap)', M.statusCount.expiry, +(nSku ? M.statusCount.expiry / nSku * 100 : 0).toFixed(1)]]) }) });
      Charts.bind('wf', { title: t('c_waterfall'), filename: 'stock-movement', legendHTML: wfLegend, build: big => wfConfig(M, App.ui.wfUnit, big), table: () => wfTable(M, App.ui.wfUnit) });

      main.querySelectorAll('[data-unit]').forEach(seg => seg.addEventListener('click', e => {
        const b = e.target.closest('[data-v]'); if (!b) return;
        App.ui[seg.dataset.unit] = b.dataset.v; App.rerender();
      }));
      main.querySelectorAll('[data-go-tab]').forEach(b => b.addEventListener('click', () => App.go('stock', { stockTab: b.dataset.goTab, sku: null })));
      main.querySelectorAll('[data-go-sku]').forEach(b => b.addEventListener('click', () => { App.ui.stockTab = 'all'; App.go('stock', { sku: b.dataset.goSku }); }));
      const ns = main.querySelector('[data-nav-stock]'); if (ns) ns.addEventListener('click', () => App.go('stock', { stockTab: 'all', sku: null }));
    }
  };

  function actionRow(r, n, M) {
    const as = M.asDn;
    let metric;
    if (r.status === 'stockout') metric = t('m_stockout_in', { d: U.n(Math.max(0, r.stockoutDn - as)) });
    else if (r.status === 'reorder') metric = r.orderByDn < as ? `<span class="late">${t('m_order_late', { d: U.n(as - r.orderByDn) })}</span>` : t('m_order_by', { date: U.date(r.orderByDn) });
    else if (r.expiry) metric = t('m_risk_val', { v: U.moneyShort(r.riskByH[2][1]) });
    else metric = t('m_excess', { v: U.moneyShort(Math.max(0, (r.totalSel - r.rrSel * M.S.overstockDoc) * r.cost)) });
    return `<button type="button" class="arow" data-go-sku="${U.esc(r.sku)}"><span class="rk">${n + 1}</span>
      <span class="nm"><b title="${U.esc(r.name)}">${U.esc(r.name)}</b><span>${U.esc(r.sku)} · ${U.esc(U.actionText(r.action))}</span></span>
      <span class="mt">${U.badges(r, M.S)}<b>${metric}</b></span></button>`;
  }

  // ------------------------------------------------------------------ projection (stacked area WH | consignment + sell-out line + PO / CN markers)
  function projConfig(M, unit, big) {
    const c = Charts.col(), pts = M.series, v = unit === 'v', fmt = v ? U.money : (x => U.n(x));
    const i0 = pts.findIndex(p => p.k === 0);
    const iH = i0 + Math.round((Calc.addMonths(M.asDn, M.h) - M.asDn) / 7);
    const wh = pts.map(p => v ? p.whV : p.wh), cons = pts.map(p => v ? p.consV : p.cons), out = pts.map(p => v ? p.outV : p.out);
    const poQ = pts.map(p => v ? p.poV : p.po), cnQ = pts.map(p => v ? p.cnV : p.cn);
    const it = pts.map(p => v ? (p.itV || 0) : (p.it || 0)), hasIt = it.some(x => x > 0.5);   // CR-01 (F5): in-transit = 3rd stacked layer
    const top = wh.map((x, k) => x + cons[k] + it[k]);
    const fut = ctx => ctx.p1DataIndex > i0;
    return {
      type: 'line',
      data: { labels: pts.map(p => U.dateShort(p.dn)), datasets: [
        { label: t('l_wh'), data: wh, stack: 's', fill: 'origin', borderColor: c.wh, backgroundColor: Charts.alpha(c.wh, .55), borderWidth: 1.5, pointRadius: 0, tension: .25, order: 3,
          segment: { borderDash: ctx => fut(ctx) ? [5, 4] : undefined, backgroundColor: ctx => fut(ctx) ? Charts.alpha(c.wh, .22) : undefined } },
        { label: t('l_cons'), data: cons, stack: 's', fill: '-1', borderColor: c.cons, backgroundColor: Charts.alpha(c.cons, .8), borderWidth: 1.5, pointRadius: 0, tension: .25, order: 3,
          segment: { borderDash: ctx => fut(ctx) ? [5, 4] : undefined, backgroundColor: ctx => fut(ctx) ? Charts.alpha(c.cons, .35) : undefined } },
        ...(hasIt ? [{ label: t('l_it'), data: it, stack: 's', fill: '-1', borderColor: c.it, backgroundColor: Charts.alpha(c.it, .6), borderWidth: 1.5, pointRadius: 0, tension: .25, order: 3,
          segment: { borderDash: ctx => fut(ctx) ? [5, 4] : undefined, backgroundColor: ctx => fut(ctx) ? Charts.alpha(c.it, .3) : undefined } }] : []),
        { label: t('l_sellout'), data: out, yAxisID: 'y1', stack: 'o', borderColor: c.line, borderWidth: 2, pointRadius: 0, fill: false, tension: .25, order: 1,
          segment: { borderDash: ctx => fut(ctx) ? [5, 4] : undefined } },
        // markers only for what is still to come (history receipts are already inside the actual stock line; full detail in the table view)
        { label: t('l_po'), data: poQ.map((q, k) => q > 0.5 && pts[k].k > 0 ? top[k] : null), _raw: poQ, stack: 'p', showLine: false, pointStyle: 'triangle', pointRadius: big ? 8 : 6, pointHoverRadius: 9, backgroundColor: c.po, borderColor: c.surface, borderWidth: 1, order: 0 },
        { label: t('l_cn'), data: cnQ.map((q, k) => q > 0.5 && pts[k].k > 0 ? top[k] : null), _raw: cnQ, stack: 'c', showLine: false, pointStyle: 'rectRot', pointRadius: big ? 7 : 5, pointHoverRadius: 8, backgroundColor: c.cn, borderColor: c.surface, borderWidth: 1, order: 0 }
      ] },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: big ? 20 : 9 } },
          y: { stacked: true, beginAtZero: true, grid: { color: c.grid }, ticks: { callback: v ? Charts.tickMoney : Charts.tickQty, maxTicksLimit: 6 } },
          y1: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { callback: v ? Charts.tickMoney : Charts.tickQty, maxTicksLimit: 6 } }
        },
        plugins: {
          tooltip: {
            filter: it => it.raw != null,
            callbacks: {
              title: items => { const p = pts[items[0].dataIndex]; return U.date(p.dn) + (p.est ? ' · Est.' : ''); },
              label: it => { const ds = it.dataset, val = ds._raw ? ds._raw[it.dataIndex] : it.raw; return ' ' + ds.label + ': ' + fmt(val); },
              footer: items => t('l_total') + ': ' + fmt(top[items[0].dataIndex])
            }
          },
          vLines: { lines: [{ index: i0, label: t('l_today'), color: c.muted }, { index: iH < pts.length ? iH : null, label: M.h + 'M', color: c.accent, dash: [4, 4] }] }
        }
      }
    };
  }
  function projTable(M, unit) {
    const v = unit === 'v';
    // CR-01 (F5): + in-transit column; Total = WH + consignment + in-transit
    return { cols: [t('col_week'), t('l_wh'), t('l_cons'), t('l_it'), t('l_total'), t('l_sellout'), t('l_po'), t('l_cn'), 'Est.'],
      rows: M.series.map(p => [U.date(p.dn), Math.round(v ? p.whV : p.wh), Math.round(v ? p.consV : p.cons), Math.round(v ? p.itV || 0 : p.it || 0), Math.round(v ? p.whV + p.consV + (p.itV || 0) : p.wh + p.cons + (p.it || 0)),
        Math.round(v ? p.outV : p.out), Math.round(v ? p.poV : p.po), Math.round(v ? p.cnV : p.cn), p.est ? 'Est.' : '']) };
  }

  // ------------------------------------------------------------------ donut
  function donutConfig(M, keys, App, big) {
    const c = Charts.col();
    return {
      type: 'doughnut',
      data: { labels: keys.map(s => t('st_' + s)), datasets: [{ data: keys.map(s => M.statusCount[s]), backgroundColor: keys.map(s => c.status[s]), borderColor: c.surface, borderWidth: 2, hoverOffset: 4 }] },
      options: {
        cutout: '68%', layout: { padding: big ? 24 : 4 },
        plugins: { legend: { display: !!big, position: 'right', labels: { color: c.text2, usePointStyle: true, boxWidth: 10 } },
          tooltip: { callbacks: { label: it => ` ${it.label}: ${U.n(it.raw)} SKU` } } },
        onClick: (e, els) => { if (els.length) { U.modal.close(); App.go('stock', { stockTab: keys[els[0].index], sku: null }); } }
      }
    };
  }

  // ------------------------------------------------------------------ waterfall
  function wfSteps(M, unit) {
    const w = M.waterfall, v = unit === 'v', g = k => v ? w[k + 'V'] : w[k];
    const steps = [['wf_open', g('open'), 'anchor'], ['wf_po', g('po'), 'up'], ['wf_cn', g('cnGood'), 'up'], ['wf_so', -g('so'), 'down'], ['wf_wo', -g('wo'), 'down'], ['wf_oo', -(g('oo') || 0), 'down']];   // CR-03 R2: + non-sales issues
    if (!M.allMask && Math.abs(g('adj')) >= 0.5) steps.push(['wf_adj', g('adj'), 'adj']);
    steps.push(['wf_close', g('close'), 'close']);
    return steps;
  }
  function wfConfig(M, unit, big) {
    const c = Charts.col(), v = unit === 'v', steps = wfSteps(M, unit), fmtS = v ? U.moneyShort : U.short;
    let run = 0; const segs = [];
    for (const [, val, kind] of steps) {
      if (kind === 'anchor' || kind === 'close') { segs.push([null, val]); run = val; }
      else { const a = run, b = run + val; segs.push([Math.min(a, b), Math.max(a, b)]); run = b; }
    }
    const ends = segs.flatMap(s => s).filter(x => x != null);
    const lo = Math.min(...ends), hi = Math.max(...ends), span = Math.max(hi - lo, Math.abs(hi) * 0.02, 1);
    const yMin = Math.max(0, lo - span * 1.5);
    const data = segs.map(s => s[0] == null ? [yMin, s[1]] : s);
    const colorOf = k => ({ anchor: c.anchor, close: c.anchorStrong, up: c.up, down: c.down, adj: Charts.alpha(c.anchor, .5) }[k]);
    return {
      type: 'bar',
      data: { labels: steps.map(s => t(s[0])), datasets: [{ data, backgroundColor: steps.map(s => colorOf(s[2])), borderColor: steps.map(s => s[2] === 'close' ? c.text2 : 'transparent'),
        borderWidth: steps.map(s => s[2] === 'close' ? 1.5 : 0), borderSkipped: false, borderRadius: 3, barPercentage: .72, categoryPercentage: .9 }] },
      options: {
        scales: {
          x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, font: { weight: 600 }, callback(val) { const l = this.getLabelForValue(val); return big || l.length < 12 ? l : l.split(' '); } } },
          y: { min: yMin, grid: { color: c.grid }, ticks: { callback: v ? Charts.tickMoney : Charts.tickQty, maxTicksLimit: 6 } }
        },
        layout: { padding: { top: 18 } },
        plugins: {
          barLabels: { labels: steps.map(s => (s[2] === 'anchor' || s[2] === 'close' ? '' : s[1] >= 0 ? '+' : '−') + fmtS(Math.abs(s[1]))) },
          tooltip: { callbacks: { label: it => ' ' + (v ? U.money(steps[it.dataIndex][1]) : U.n(steps[it.dataIndex][1]) + ' ' + t('u_qty')) } }
        }
      }
    };
  }
  function wfTable(M, unit) {
    return { cols: [t('col_item'), unit === 'v' ? t('col_value') + ' (฿)' : t('u_qty')], rows: wfSteps(M, unit).map(s => [t(s[0]), Math.round(s[1])]) };
  }
})(window);
