/* pages/quota.js — Quota vs Actual: Quota ที่ Sales ตั้งเหมาะสมไหม และ Supply รองรับได้แค่ไหน
   Row 1: Quota Achievement · Sell-through · MAPE · Bias · Supply Fill Rate · Row 2: monthly Quota vs Sales In vs Sales Out | scatter Quota Fit × Sell-through
   Row 3: Account × SKU with the fit badge and Quota Coverage */
(function (global) {
  'use strict';
  const Pages = global.Pages = global.Pages || {};
  const CLS = { over: 'overstock', ok: 'healthy', under: 'reorder', supply: 'stockout', nodata: 'npd' };
  const cache = { key: '', Q: null };
  Pages.quotaBadge = cls => `<span class="st ${CLS[cls]}">${U.esc(t('qc_' + cls))}</span>`;
  /** quotaOf is the heaviest calculation — cached per filter + window */
  Pages.quotaData = (App, win) => {
    const M = App.model(), key = App._modelKey + '|' + win;
    if (cache.key !== key) { cache.Q = Calc.quotaOf(App.DB, M, win); cache.key = key; }
    return cache.Q;
  };

  Pages.quota = {
    render(main, App) {
      const M = App.model(), DB = App.DB, S = M.S, ui = App.ui;
      ui.qWin = +ui.qWin || 3;
      let html = Pages.pageHead(M, 'nav_quota', 'q_quota') + Pages.allocNote(M);
      if (!M.rows.length) { main.innerHTML = html + `<div class="card">${U.empty(t('empty'), t('empty_hint'), 'filter')}</div>`; return; }
      const Q = Pages.quotaData(App, ui.qWin), k = Q.kpi;
      const achPrev = M.rowsPrev ? Calc.quotaAchievement(DB, M.rowsPrev, M.mask, M.periodPrev.p0, M.periodPrev.p1) : null;
      const vs = M.kpiPrev ? t('vs_prev', { p: t(M.period.view === 'M' ? 'prev_m' : 'prev_w') }) : t('no_prev');
      const winTxt = `${U.monthLabel(Calc.monthKey(Q.months[0]))} – ${U.monthLabel(Calc.monthKey(Q.months[Q.months.length - 1]))}`;
      const mtd = Q.monthly.find(x => x.mtd);
      const biasTxt = k.bias == null ? '—' : (k.bias > 0 ? '+' : k.bias < 0 ? '−' : '') + U.n(Math.abs(k.bias), 1) + '%';
      html += `<div class="toolbar"><span class="small muted">${t('q_window')}</span>${U.seg('qWin', [[3, t('q_win3')], [6, t('q_win6')]], ui.qWin)}<span class="small muted">${U.esc(winTxt)}</span></div>
        <div class="kpis k5">
        ${Pages.kpiCard(t('k_ach'), t('k_ach_tip'), U.pct(k.achievement, 1), t('k_sub_ach', { si: U.n(k.si), q: U.n(k.quota) }) + (M.period.view !== 'M' && mtd && mtd.q ? ' · ' + t('k_sub_ach_mtd', { p: U.pct(mtd.si / mtd.q * 100, 1) }) : ''), Pages.delta(k.achievement, achPrev, 'pp', 'up'), vs)}
        ${Pages.kpiCard(t('k_st'), t('k_st_tip'), U.pct(M.kpi.sellThrough, 1), t('k_sub_st_q'), Pages.delta(M.kpi.sellThrough, M.kpiPrev && M.kpiPrev.sellThrough, 'pp', 'up'), vs)}
        ${Pages.kpiCard(t('k_mape'), t('k_mape_tip'), U.pct(k.mape, 1), t('k_sub_mape', { n: ui.qWin }), '', winTxt)}
        ${Pages.kpiCard(t('k_bias'), t('k_bias_tip'), biasTxt, k.bias == null ? '' : t(k.bias > 0 ? 'k_sub_bias_hi' : 'k_sub_bias_lo'), '', winTxt)}
        ${Pages.kpiCard(t('k_fill'), t('k_fill_tip'), U.pct(k.fillRate, 1), t('k_sub_fill', { s: U.n(k.shortSupply), o: U.n(k.shortOrder), m: U.n(k.constrained) }), '', winTxt)}
      </div>`;

      // Row 2
      const c = Charts.col();
      ui.qUnit = ui.qUnit || 'v';
      const comboLegend = `<span><i style="background:${c.cons}"></i>${t('l_si')}</span><span><i style="background:${c.wh}"></i>${t('l_so')}</span><span><i class="line" style="background:${c.accent}"></i>Quota</span><span class="muted"><span class="est-badge">MTD</span> ${t('q_mtd_note')}</span>`;
      const colorOf = { over: c.status.overstock, ok: c.status.healthy, under: c.status.reorder, supply: c.status.stockout };
      const scLegend = ['over', 'ok', 'under', 'supply'].map(x => `<span><i style="background:${colorOf[x]};border-radius:50%;width:9px;height:9px"></i>${t('qc_' + x)} · ${U.n(Q.cnt[x] || 0)}</span>`).join('');
      html += `<div class="grid2 even">
        ${Charts.card({ id: 'qcombo', title: t('c_qcombo'), tip: t('c_qcombo_tip'), tools: U.seg('qUnit', [['v', t('u_value')], ['q', t('u_qty')]], ui.qUnit), legend: comboLegend, boxClass: 'h-row3' })}
        ${Charts.card({ id: 'qscatter', title: t('c_qscatter'), tip: t('c_qscatter_tip', { lo: S.fitLow, hi: S.fitHigh }), legend: scLegend, boxClass: 'h-row3' })}
      </div>`;

      // Row 3
      ui.qTab = ui.qTab || 'all';
      const tabs = ['all', 'over', 'ok', 'under', 'supply', 'nodata'];
      const rows = ui.qTab === 'all' ? Q.pairs : Q.pairs.filter(p => p.cls === ui.qTab);
      html += `<section class="card"><div class="card-head"><h3>${t('c_qtable')} ${U.info(t('c_qtable_tip', { h: M.h + 'M' }))}</h3>
        <div class="card-tools"><button type="button" class="btn small" id="qXlsx">${U.icon('download')}${t('export_xlsx')}</button></div></div>
        <div class="stabs">${tabs.map(x => { const n = x === 'all' ? Q.pairs.length : (Q.cnt[x] || 0);
          return `<button type="button" data-qtab="${x}" class="${ui.qTab === x ? 'on' : ''}${n ? '' : ' zero'}">${x === 'all' ? '' : `<span class="tdot" style="background:${colorOf[x] || c.status.npd}"></span>`}${t(x === 'all' ? 'tab_all' : 'qc_' + x)}<span class="n">${U.n(n)}</span></button>`; }).join('')}</div>
        <div id="qHost"></div></section>`;
      main.innerHTML = html;

      Charts.bind('qcombo', { title: t('c_qcombo'), filename: 'quota-vs-actual', legendHTML: comboLegend, build: big => comboConfig(Q, ui.qUnit, c, big),
        table: () => ({ cols: [t('col_period'), 'Quota', t('l_si'), t('l_so'), t('k_ach')], rows: Q.monthly.map(x => { const v = ui.qUnit === 'v';
          return [Calc.monthKey(x.m0) + (x.mtd ? ' (MTD)' : x.future ? ' (plan)' : ''), Math.round(v ? x.qV : x.q), x.future ? '' : Math.round(v ? x.siV : x.si), x.future ? '' : Math.round(v ? x.soV : x.so), x.future || !x.q ? '' : +(x.si / x.q * 100).toFixed(1)]; }) }) });
      const pts = Q.pairs.filter(p => p.fit != null && p.st != null);
      Charts.bind('qscatter', { title: t('c_qscatter'), filename: 'quota-fit-scatter', legendHTML: scLegend, build: big => scatterConfig(pts, colorOf, S, c, big),
        table: () => ({ cols: [t('col_sku'), t('col_acc'), 'Quota Fit %', 'Sell-through %', t('col_status')], rows: pts.map(p => [p.sku, p.acc, Math.round(p.fit), +p.st.toFixed(1), t('qc_' + p.cls)]) }) });

      const cols = [
        { k: 'acc', label: t('col_acc'), sticky: true, get: p => p.acc, html: p => `<div class="cell2"><b>${U.esc(p.acc)}</b><span class="sub">${p.channel} · ${p.consignment ? t('consign') : t('outright')}</span></div>` },
        { k: 'sku', label: t('col_sku'), get: p => p.sku, html: p => `<div class="cell2"><b title="${U.esc(p.name)}">${U.esc(p.name)}</b><span class="sub">${U.esc(p.sku)}</span></div>` },
        { k: 'quota', label: t('q_month'), num: true, sum: true, get: p => p.quota, html: p => p.quota ? U.n(p.quota) : '—' },
        { k: 'exp', label: t('q_expected'), num: true, sum: true, get: p => p.expected, html: p => U.n(p.expected) },
        { k: 'fit', label: 'Quota Fit', num: true, get: p => p.fit, html: p => p.fit == null ? '—' : U.pct(p.fit), xl: p => p.fit == null ? '' : Math.round(p.fit) },
        { k: 'cls', label: t('col_status'), get: p => p.cls, html: p => Pages.quotaBadge(p.cls), xl: p => t('qc_' + p.cls) },
        { k: 'ach', label: t('k_ach'), num: true, get: p => p.ach, html: p => U.pct(p.ach), xl: p => p.ach == null ? '' : Math.round(p.ach) },
        { k: 'st', label: 'Sell-through', num: true, get: p => p.st, html: p => p.st == null ? '—' : U.pct(p.st), xl: p => p.st == null ? '' : +p.st.toFixed(1) },
        { k: 'cov', label: t('q_cov', { h: M.h + 'M' }), num: true, get: p => p.coverage, html: p => p.coverage == null ? '—' : `<span class="${p.coverage < 100 ? 'late' : ''}">${U.pct(p.coverage)}</span>`, xl: p => p.coverage == null ? '' : Math.round(p.coverage) },
        { k: 'mape', label: 'MAPE', num: true, get: p => p.mape, html: p => U.pct(p.mape), xl: p => p.mape == null ? '' : Math.round(p.mape) },
        { k: 'bias', label: 'Bias', num: true, get: p => p.bias, html: p => p.bias == null ? '—' : (p.bias > 0 ? '+' : '') + U.pct(p.bias), xl: p => p.bias == null ? '' : Math.round(p.bias) }
      ];
      U.table(main.querySelector('#qHost'), { key: 'quota', cols, rows, defaultSort: { key: 'acc', dir: 'asc' }, empty: t('no_events_list'),
        onRow: p => { App.ui.stockTab = 'all'; App.go('stock', { sku: p.sku }); },
        card: p => `<div class="top"><div class="cell2"><b>${U.esc(p.name)}</b><span class="sub">${U.esc(p.sku)} · ${U.esc(p.acc)}</span></div>${Pages.quotaBadge(p.cls)}</div>
          <div class="nums"><div><span>Quota Fit</span><b>${p.fit == null ? '—' : U.pct(p.fit)}</b></div><div><span>${t('k_ach')}</span><b>${U.pct(p.ach)}</b></div><div><span>${t('q_cov', { h: M.h + 'M' })}</span><b>${p.coverage == null ? '—' : U.pct(p.coverage)}</b></div></div>` });
      main.querySelector('#qXlsx').addEventListener('click', () => U.xlsx('quota-vs-actual-' + Calc.iso(M.asDn) + '.xlsx', [{ name: 'Quota', rows: U.xlRows(cols, rows) }]));
      main.querySelectorAll('[data-qtab]').forEach(b => b.addEventListener('click', () => { ui.qTab = b.dataset.qtab; App.rerender(); }));
      Pages.bindSegs(main, App);
    }
  };

  function comboConfig(Q, unit, c, big) {
    const v = unit === 'v', X = Q.monthly, fmt = v ? U.money : U.n;
    const lab = x => { const [y, m] = Calc.monthKey(x.m0).split('-'); return I18N.month(+m - 1) + ' ' + y.slice(2) + (x.mtd ? '*' : ''); };
    const iNow = X.findIndex(x => x.mtd);
    return {
      type: 'bar',
      data: { labels: X.map(lab), datasets: [
        { label: t('l_si'), data: X.map(x => x.future ? null : v ? x.siV : x.si), backgroundColor: X.map(x => x.mtd ? Charts.alpha(c.cons, .5) : c.cons), borderRadius: 2, order: 2 },
        { label: t('l_so'), data: X.map(x => x.future ? null : v ? x.soV : x.so), backgroundColor: X.map(x => x.mtd ? Charts.alpha(c.wh, .5) : c.wh), borderRadius: 2, order: 2 },
        { type: 'line', label: 'Quota', data: X.map(x => v ? x.qV : x.q), borderColor: c.accent, backgroundColor: c.surface, borderWidth: 2, pointRadius: big ? 4 : 3,
          pointBackgroundColor: X.map(x => x.mtd || x.future ? c.surface : c.accent), segment: { borderDash: ctx => ctx.p1DataIndex >= iNow ? [5, 4] : undefined }, tension: .2, order: 1 }
      ] },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: big ? 16 : 8 } }, y: { beginAtZero: true, grid: { color: c.grid }, ticks: { callback: v ? Charts.tickMoney : Charts.tickQty, maxTicksLimit: 6 } } },
        plugins: { tooltip: { filter: it => it.raw != null, callbacks: { title: it => { const x = X[it[0].dataIndex]; return U.monthLabel(Calc.monthKey(x.m0)) + (x.mtd ? ' · MTD' : x.future ? ' · Plan' : ''); },
          label: it => ' ' + it.dataset.label + ': ' + fmt(it.raw), footer: it => { const x = X[it[0].dataIndex]; return !x.future && x.q ? t('k_ach') + ' ' + U.pct(x.si / x.q * 100, 1) : ''; } } },
          vLines: { lines: [{ index: iNow, label: 'MTD', color: c.muted }] } }
      }
    };
  }
  function scatterConfig(pts, colorOf, S, c, big) {
    const cap = 300;
    const ds = ['over', 'ok', 'under', 'supply'].map(cls => ({ label: t('qc_' + cls), data: pts.filter(p => p.cls === cls).map(p => ({ x: Math.min(cap, p.fit), y: p.st, p })),
      backgroundColor: Charts.alpha(colorOf[cls], .7), borderColor: colorOf[cls], pointRadius: big ? 5 : 3.5, pointHoverRadius: 7 }));
    return {
      type: 'scatter',
      data: { datasets: ds },
      options: {
        scales: { x: { min: 0, max: cap, grid: { color: c.grid }, title: { display: true, text: 'Quota Fit % (' + t('q_cap', { n: cap }) + ')' }, ticks: { callback: v => v + '%' } },
          y: { min: 0, max: 100, grid: { color: c.grid }, title: { display: true, text: 'Sell-through %' }, ticks: { callback: v => v + '%' } } },
        plugins: { refLines: { x: [S.fitLow, S.fitHigh] },
          tooltip: { callbacks: { label: it => { const p = it.raw.p; return ` ${p.sku} · ${p.acc} — Fit ${U.pct(p.fit)} · Sell-through ${U.pct(p.st)}`; } } } }
      }
    };
  }
})(window);
