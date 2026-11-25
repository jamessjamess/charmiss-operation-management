/* pages/expiry.js — เสี่ยงหมดอายุ: สินค้าไหนเสี่ยงขายไม่ทันวันหมดอายุ และมูลค่าความเสี่ยงเท่าไร
   Row 1: At-risk 1M / 3M / 6M + already past the deadline (the Horizon filter's card is outlined)
   Row 2: Heatmap Category × expiry month (2/3) | Stock Aging buckets (1/3) · Row 3: lots (FEFO) with the recommended action */
(function (global) {
  'use strict';
  const t = global.St;   // CR-01: Supply translator (the global `t` belongs to the Ops shell)
  const Pages = global.Pages = global.Pages || {};

  Pages.expiry = {
    render(main, App) {
      const M = App.model(), DB = App.DB, k = M.kpi, p = M.kpiPrev || {}, ui = App.ui;
      const vs = M.kpiPrev ? t('vs_prev', { p: t(M.period.view === 'M' ? 'prev_m' : 'prev_w') }) : t('no_prev');
      let html = Pages.pageHead(M, 'nav_expiry', 'q_expiry') + Pages.allocNote(M);
      if (!M.rows.length) { main.innerHTML = html + `<div class="card">${U.empty(t('empty'), t('empty_hint'), 'filter')}</div>`; return; }
      const lots = Calc.expiryLots(DB, M), as = M.asDn;
      const hIdx = { 1: 0, 3: 1, 6: 2 }[M.h];
      const nLots = days => lots.filter(L => L.atRisk > 0.5 && L.deadline <= as + days).length;

      html += `<div class="kpis k4">${[1, 3, 6].map((h, n) => {
        const d = Calc.addMonths(as, h) - as;
        return Pages.kpiCard(t('k_risk_h', { h: h + 'M' }), t('k_risk_h_tip', { h: h + 'M' }), U.money(k.riskBy[n][1]),
          t('k_risk_sub', { q: U.n(k.riskBy[n][0]), n: U.n(nLots(d)) }), Pages.delta(k.riskBy[n][1], p.riskBy && p.riskBy[n][1], 'rel', 'down'), vs, n === hIdx ? 'on' : '');
      }).join('')}
        ${Pages.kpiCard(t('k_past'), t('k_past_tip'), U.money(k.riskPast[1]), t('k_risk_sub', { q: U.n(k.riskPast[0]), n: U.n(nLots(-1)) }), Pages.delta(k.riskPast[1], p.riskPast && p.riskPast[1], 'rel', 'down'), vs)}
      </div>`;

      // Row 2 — heatmap (HTML) + aging (Chart.js)
      const c = Charts.col();
      ui.heatMetric = ui.heatMetric || 'value';
      ui.agingUnit = ui.agingUnit || 'v';
      html += `<div class="grid2">
        ${Charts.card({ id: 'heat', title: t('c_heat'), tip: t('c_heat_tip'), tools: U.seg('heatMetric', [['value', t('u_stock')], ['risk', t('u_risk')]], ui.heatMetric), body: '<div class="heat-host"></div>' })}
        ${Charts.card({ id: 'aging', title: t('c_aging'), tip: t('c_aging_tip'), tools: U.seg('agingUnit', [['v', t('u_value')], ['q', t('u_qty')]], ui.agingUnit),
          legend: `<span><i style="background:${Charts.alpha(c.wh, .85)}"></i>${t('l_wh')}</span><span><i style="background:${c.cons}"></i>${t('l_cons')}</span>` })}
      </div>`;

      // Row 3 — lots
      ui.lotView = ui.lotView || 'risk';
      const hDays = Calc.addMonths(as, M.h) - as;
      const riskLots = lots.filter(L => L.atRisk > 0.5 && L.deadline <= as + hDays);
      const shown = ui.lotView === 'risk' ? riskLots : lots;
      html += `<section class="card" id="card-lots"><div class="card-head"><h3>${t('c_lots')} ${U.info(t('c_lots_tip'))}</h3>
          <div class="card-tools">${U.seg('lotView', [['risk', t('lots_risk', { h: M.h + 'M' }) + ' · ' + U.n(riskLots.length)], ['all', t('lots_all') + ' · ' + U.n(lots.length)]], ui.lotView)}
          <button type="button" class="btn small" id="lotXlsx">${U.icon('download')}${t('export_xlsx')}</button></div></div>
          ${lots.some(L => L.est) ? `<div class="note">${U.icon('info')}<span>${t('dr_est_lots')}</span></div>` : ''}
          <div id="lotHost"></div></section>`;
      main.innerHTML = html;

      // heatmap
      const heat = Calc.expiryHeat(lots, as);
      const heatHost = main.querySelector('.heat-host');
      heatHost.innerHTML = heatHTML(heat, ui.heatMetric, c, as);
      Charts.bind('heat', { title: t('c_heat'), filename: 'expiry-heatmap', table: () => heatTable(heat, ui.heatMetric), renderBig: box => { box.innerHTML = heatHTML(heat, ui.heatMetric, c, as, true); } });
      // aging
      const aging = Calc.agingOf(lots);
      Charts.bind('aging', { title: t('c_aging'), filename: 'stock-aging', build: big => agingConfig(aging, ui.agingUnit, c, big),
        table: () => ({ cols: [t('col_bucket'), t('l_wh'), t('l_cons'), t('l_total'), t('col_atrisk_v')], rows: aging.map(b => [t('ag_' + b.key), Math.round(ui.agingUnit === 'v' ? b.whV : b.whQty), Math.round(ui.agingUnit === 'v' ? b.consV : b.consQty), Math.round(ui.agingUnit === 'v' ? b.value : b.qty), Math.round(b.riskV)]) }) });

      // lots table
      const loc = j => j < 0 ? 'WH' : DB.accounts[j].name;
      const cols = [
        { k: 'sku', label: t('col_sku'), sticky: true, get: L => L.sku, html: L => `<div class="cell2"><b title="${U.esc(L.name)}">${U.esc(L.name)}</b><span class="sub">${U.esc(L.sku)} · ${U.esc(L.category)}</span></div>` },
        { k: 'lot', label: t('col_lot'), get: L => L.lot_no, html: L => U.esc(L.lot_no) + (L.est ? ' <span class="est-badge">Est.</span>' : '') },
        { k: 'loc', label: t('col_loc'), get: L => loc(L.j) },
        { k: 'qty', label: t('col_qty'), num: true, sum: true, get: L => L.qty, html: L => U.n(L.qty) },
        { k: 'exp', label: t('col_exp'), get: L => L.exp, html: L => `<span class="${L.exp <= as ? 'late' : ''}">${U.date(L.exp)}</span>`, xl: L => Calc.iso(L.exp) },
        { k: 'deadline', label: t('col_deadline'), get: L => L.deadline, html: L => `<span class="${L.deadline < as ? 'late' : ''}">${U.date(L.deadline)}</span>`, xl: L => Calc.iso(L.deadline) },
        { k: 'sellout', label: t('col_sellout'), get: L => L.sellOutDn, html: L => L.sellOutDn ? U.date(L.sellOutDn) : `<span class="muted">${t('not_before')}</span>`, xl: L => L.sellOutDn ? Calc.iso(L.sellOutDn) : '' },
        { k: 'risk', label: t('col_atrisk'), num: true, sum: true, get: L => L.atRisk, html: L => L.atRisk > 0.5 ? U.n(L.atRisk) : '—', cls: L => L.atRisk > 0.5 ? 'heat-neg' : '' },
        { k: 'riskv', label: t('col_atrisk_v'), num: true, sum: true, fmt: U.money, get: L => L.atRiskValue, html: L => L.atRisk > 0.5 ? U.money(L.atRiskValue) : '—' },
        { k: 'action', label: t('col_action'), get: L => U.actionText(L.action) },
        ...Pages.propCol(L => L.j >= 0 && L.atRisk > 0.5 && L.action && L.action.key === 'act_cn' ? { type: 'recall', sku: L.sku, account: App.DB.accounts[L.j].account_id, qty: Math.round(L.atRisk), value: Math.round(L.atRiskValue), dest: L.action.to || 'Clearance', detail: 'expiry ' + L.lot_no } : null)   // CR-01 B3
      ];
      U.table(main.querySelector('#lotHost'), { key: 'lots', cols, rows: shown, defaultSort: { key: 'deadline', dir: 'asc' }, empty: t('no_risk_lots'),
        total: rows => t('total') + ' · ' + U.n(rows.length) + ' Lot', onRow: L => { App.ui.stockTab = 'all'; App.go('stock', { sku: L.sku }); },
        card: L => `<div class="top"><div class="cell2"><b>${U.esc(L.name)}</b><span class="sub">${U.esc(L.sku)} · ${U.esc(L.lot_no)} · ${U.esc(loc(L.j))}</span></div></div>
          <div class="nums"><div><span>${t('col_deadline')}</span><b class="${L.deadline < as ? 'late' : ''}">${U.dateShort(L.deadline)}</b></div><div><span>${t('col_qty')}</span><b>${U.n(L.qty)}</b></div>
          <div class="${L.atRisk > 0.5 ? 'heat-neg' : ''}"><span>${t('col_atrisk_v')}</span><b>${L.atRisk > 0.5 ? U.moneyShort(L.atRiskValue) : '—'}</b></div></div>
          <div class="act">${U.esc(U.actionText(L.action))}</div>` });
      main.querySelector('#lotXlsx').addEventListener('click', () => U.xlsx('expiry-lots-' + Calc.iso(as) + '.xlsx', [{ name: 'Lots', rows: U.xlRows(cols.concat([{ label: 'unit_cost', get: L => L.cost }]), shown) }]));

      Pages.bindSegs(main, App);
    }
  };

  // ------------------------------------------------------------------ heatmap (HTML table, colour = share of the largest cell)
  function heatHTML(H, metric, c, as, big) {
    const v = cell => metric === 'risk' ? cell.risk : cell.value;
    const last = H.cols.length - 1;              // "> 12 months" is a catch-all: grey, and kept out of the colour scale so the near months stay readable
    let max = 0; H.cells.forEach(row => row.forEach((x, n) => { if (n < last) max = Math.max(max, v(x)); }));
    const base = metric === 'risk' ? c.status.stockout : c.wh;
    const colTot = H.cols.map((_, n) => H.cats.reduce((x, cat) => x + v(H.cells.get(cat)[n]), 0));
    const label = col => col.key === 'past' ? t('h_past') : col.key === 'later' ? t('h_later') : (() => { const [y, m] = col.key.split('-'); return `${I18N.month(+m - 1)}<br><small>${y.slice(2)}</small>`; })();
    const td = (x, n) => {
      const val = v(x), a = max > 0 ? Math.min(1, val / max) : 0;
      const tip = `${U.money(x.value)} · At-risk ${U.money(x.risk)} · ${U.n(x.qty)} ${t('u_qty')}`;
      const style = val <= 0 ? '' : n === last ? `background:${c.surface2};color:${c.muted}` : `background:${Charts.alpha(base, 0.1 + 0.8 * a)};color:${a > 0.55 ? '#fff' : 'inherit'}`;
      return `<td class="hc${n === 0 && val > 0 ? ' past' : ''}" title="${U.esc(tip)}" style="${style}">${val > 0 ? U.short(val) : ''}</td>`;
    };
    if (!H.cats.length) return U.empty(t('empty'));
    return `<div class="tablewrap free heat${big ? ' big' : ''}"><table class="tbl compact heat-tbl"><thead><tr><th class="sticky">${t('col_cat')}</th>${H.cols.map(col => `<th class="num">${label(col)}</th>`).join('')}</tr></thead>
      <tbody>${H.cats.map(cat => `<tr><td class="sticky" title="${U.esc(cat)}">${U.esc(cat)}</td>${H.cells.get(cat).map(td).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><td class="sticky">${t('h_total')}</td>${colTot.map(x => `<td class="num" style="text-align:center">${x > 0 ? U.short(x) : ''}</td>`).join('')}</tr></tfoot></table></div>
      <div class="foot-note">${metric === 'risk' ? t('heat_note_risk') : t('heat_note_value')} · AS OF ${U.date(as)}</div>`;
  }
  function heatTable(H, metric) {
    const lab = col => col.key === 'past' ? t('h_past') : col.key === 'later' ? t('h_later') : col.key;
    return { cols: [t('col_cat'), ...H.cols.map(lab)], rows: H.cats.map(cat => [cat, ...H.cells.get(cat).map(x => Math.round(metric === 'risk' ? x.risk : x.value))]) };
  }

  // ------------------------------------------------------------------ aging (stacked bars WH | consignment)
  function agingConfig(A, unit, c, big) {
    const v = unit === 'v', fmt = v ? U.money : U.n;
    const tot = A.map(b => v ? b.value : b.qty), all = tot.reduce((x, y) => x + y, 0);
    return {
      type: 'bar',
      data: { labels: A.map(b => t('ag_' + b.key)), datasets: [
        { label: t('l_wh'), data: A.map(b => v ? b.whV : b.whQty), backgroundColor: Charts.alpha(c.wh, .85), stack: 's', borderRadius: 2, barPercentage: .7 },
        { label: t('l_cons'), data: A.map(b => v ? b.consV : b.consQty), backgroundColor: c.cons, stack: 's', borderRadius: 2, barPercentage: .7 }
      ] },
      options: {
        scales: { x: { stacked: true, grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, color: ctx => ctx.index === 0 ? c.err : c.muted } },
          y: { stacked: true, beginAtZero: true, grid: { color: c.grid }, ticks: { callback: v ? Charts.tickMoney : Charts.tickQty, maxTicksLimit: 6 } } },
        layout: { padding: { top: 20 } },
        plugins: { barLabels: { ds: 1, labels: tot.map(x => x > 0 ? (v ? U.moneyShort(x) : U.short(x)) : '') },
          tooltip: { mode: 'index', intersect: false, callbacks: { label: it => ' ' + it.dataset.label + ': ' + fmt(it.raw),
            footer: it => { const n = it[0].dataIndex; return `${U.pct(all ? tot[n] / all * 100 : 0, 1)} · At-risk ${U.money(A[n].riskV)}`; } } } }
      }
    };
  }
})(window);
