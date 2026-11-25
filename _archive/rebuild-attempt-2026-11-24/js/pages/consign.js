/* pages/consign.js — ฝากขาย: ของที่คู่ค้าแต่ละรายเหลือเท่าไร ขายเร็วแค่ไหน ควรเรียกคืนตัวไหน
   Row 1: 4 KPI · Row 2: Sales In vs Sales Out per account (combo, drill to one account over time)
   Row 3: Matrix SKU × account (Remaining / DOC / Sell-through) · Row 4: recall (CN) suggestions */
(function (global) {
  'use strict';
  const Pages = global.Pages = global.Pages || {};

  Pages.consign = {
    render(main, App) {
      const M = App.model(), DB = App.DB, S = M.S, ui = App.ui, A = DB.accounts;
      const C = Calc.consignmentOf(DB, M.rows, M.asDn, M.period, M.mask, S);
      let html = Pages.pageHead(M, 'nav_consign', 'q_consign');
      if (!M.rows.length || !C.accs.length) {
        main.innerHTML = html + `<div class="card">${U.empty(M.rows.length ? t('no_consign') : t('empty'), M.rows.length ? t('no_consign_hint') : t('empty_hint'), 'consign')}</div>`;
        return;
      }
      const Cp = M.rowsPrev ? Calc.consignmentOf(DB, M.rowsPrev, M.periodPrev.p1, M.periodPrev, M.mask, S) : null, kp = Cp ? Cp.kpi : {};
      const vs = Cp ? t('vs_prev', { p: t(M.period.view === 'M' ? 'prev_m' : 'prev_w') }) : t('no_prev');
      const k = C.kpi, soQty = C.byAcc.reduce((x, a) => x + a.so, 0), rec = C.pairs.filter(p => p.recall);
      html += `<div class="kpis k4">
        ${Pages.kpiCard(t('k_cons_value'), t('k_cons_value_tip'), U.money(k.value), t('k_sub_cons_val', { n: U.n(k.pairs), a: U.n(C.accs.length) }), Pages.delta(k.value, kp.value, 'rel', 'none'), vs)}
        ${Pages.kpiCard(t('k_cons_doc'), t('k_cons_doc_tip'), k.doc == null ? '—' : `${U.n(k.doc)}<small>${t('days')}</small>`, t('k_sub_cons_doc', { h: U.n(k.high), l: U.n(k.short) }), Pages.delta(k.doc, kp.doc, 'days', 'down'), vs)}
        ${Pages.kpiCard(t('k_st'), t('k_st_tip'), U.pct(k.sellThrough, 1), t('k_sub_st', { so: U.n(soQty) }), Pages.delta(k.sellThrough, kp.sellThrough, 'pp', 'up'), vs)}
        ${Pages.kpiCard(t('k_recall'), t('k_recall_tip', { d: S.consignDocHigh, s: C.stLow }), U.money(k.recallV), t('k_sub_recall', { n: U.n(k.recallN), q: U.n(rec.reduce((x, p) => x + p.recall.qty, 0)) }), Pages.delta(k.recallV, kp.recallV, 'rel', 'down'), vs)}
      </div>`;

      // Row 2 — Sales In vs Sales Out
      const c = Charts.col();
      ui.inoutUnit = ui.inoutUnit || 'v';
      if (ui.inoutAcc && !C.accs.some(j => A[j].account_id === ui.inoutAcc)) ui.inoutAcc = '';
      const accSel = `<select class="ctl" id="inoutAcc" aria-label="${t('f_account')}" style="height:28px;font-size:12px"><option value="">${t('all_accounts')}</option>${C.accs.map(j => `<option value="${A[j].account_id}" ${ui.inoutAcc === A[j].account_id ? 'selected' : ''}>${U.esc(A[j].name)}</option>`).join('')}</select>`;
      const legend = `<span><i style="background:${c.cons}"></i>${t('l_si')}</span><span><i style="background:${c.wh}"></i>${t('l_so')}</span><span><i class="line" style="background:${c.line}"></i>${t('l_rem')} (${t('right_axis')})</span>`;
      html += Charts.card({ id: 'inout', title: t('c_inout'), tip: t('c_inout_tip'), tools: accSel + U.seg('inoutUnit', [['v', t('u_value')], ['q', t('u_qty')]], ui.inoutUnit), legend });

      // Row 3 — matrix
      ui.mxMetric = ui.mxMetric || 'rem';
      const sw = (cls, l) => `<span><i class="${cls}"></i>${l}</span>`;
      html += `<section class="card" id="card-mx" style="margin-top:16px"><div class="card-head"><h3>${t('c_matrix')} ${U.info(t('c_matrix_tip', { h: S.consignDocHigh, l: S.consignDocLow, s: C.stLow }))}</h3>
        <div class="card-tools">${U.seg('mxMetric', [['rem', t('m_rem')], ['doc', t('m_doc')], ['st', t('m_st')]], ui.mxMetric)}<button type="button" class="btn small" id="mxXlsx">${U.icon('download')}${t('export_xlsx')}</button></div></div>
        <div class="legend">${sw('ps ps-out', t('ps_out'))}${sw('ps ps-low', t('ps_low', { d: S.consignDocLow }))}${sw('ps ps-high', t('ps_high', { d: S.consignDocHigh }))}<span>◆ ${t('st_expiry')}</span></div>
        <div id="mxHost"></div></section>`;

      // Row 4 — recall list
      html += `<section class="card" id="card-rc" style="margin-top:16px"><div class="card-head"><h3>${t('c_recall')} ${U.info(t('c_recall_tip', { k: S.cnKeepDays }))}</h3>
        <div class="card-tools"><button type="button" class="btn small" id="rcXlsx">${U.icon('download')}${t('export_xlsx')}</button></div></div><div id="rcHost"></div></section>`;
      main.innerHTML = html;

      // combo chart
      const acc = ui.inoutAcc ? A.find(a => a.account_id === ui.inoutAcc) : null;
      const series = acc ? Calc.consignSeries(DB, M.rows, M.asDn, M.period.view, [acc.j]) : null;
      Charts.bind('inout', { title: t('c_inout') + (acc ? ' · ' + acc.name : ''), filename: 'sales-in-out' + (acc ? '-' + acc.account_id : ''), legendHTML: legend,
        build: big => inoutConfig(C, series, ui.inoutUnit, c, big, M), table: () => inoutTable(C, series, ui.inoutUnit, M) });
      main.querySelector('#inoutAcc').addEventListener('change', e => { ui.inoutAcc = e.target.value; App.rerender(); });

      // matrix
      const groups = new Map();
      for (const p of C.pairs) {
        if (!groups.has(p.i)) groups.set(p.i, { i: p.i, sku: p.sku, name: p.name, brand: p.brand, cost: p.cost, cells: new Map(), rem: 0, remV: 0, rr: 0, so: 0, base: 0, worst: 9 });
        const g = groups.get(p.i); g.cells.set(p.j, p); g.rem += p.rem; g.remV += p.remV; g.rr += p.rr; g.so += p.so; g.base += p.open + p.si;
        g.worst = Math.min(g.worst, { out: 0, low: 1, high: 2, ok: 3 }[p.status]);
      }
      const metric = ui.mxMetric;
      const val = p => metric === 'rem' ? p.rem : metric === 'doc' ? p.doc : p.st;
      const fmtV = x => x == null ? '—' : metric === 'rem' ? U.n(x) : metric === 'doc' ? U.days(x) : U.pct(x);
      const cell = p => p ? `<span class="pc ps-${p.status}" title="${U.esc(`${p.acc}: ${t('m_rem')} ${U.n(p.rem)} · DOC ${U.days(p.doc)} · Sell-through ${U.pct(p.st)}${p.expiry ? ' · ' + t('st_expiry') + ' ' + U.money(p.riskV) : ''}`)}">${fmtV(val(p))}${p.expiry ? '<i class="xd">◆</i>' : ''}</span>` : '';
      const gTot = g => metric === 'rem' ? g.rem : metric === 'doc' ? (g.rr > 0 ? g.rem / g.rr : (g.rem > 0.5 ? Infinity : null)) : (g.base > 0 ? g.so / g.base * 100 : null);
      const mxCols = [
        { k: 'sku', label: t('col_sku'), sticky: true, get: g => g.sku, html: g => `<div class="cell2"><b title="${U.esc(g.name)}">${U.esc(g.name)}</b><span class="sub">${U.esc(g.sku)}</span></div>` },
        ...C.accs.map(j => ({ k: 'a' + j, label: A[j].name, num: true, get: g => g.cells.has(j) ? val(g.cells.get(j)) : null, html: g => cell(g.cells.get(j)), cls: () => 'pcell',
          xl: g => g.cells.has(j) ? (val(g.cells.get(j)) == null ? '' : isFinite(val(g.cells.get(j))) ? Math.round(val(g.cells.get(j)) * 10) / 10 : '∞') : '' })),
        { k: 'tot', label: t('h_total'), num: true, get: gTot, html: g => `<b>${fmtV(gTot(g))}</b>`, xl: g => { const x = gTot(g); return x == null ? '' : isFinite(x) ? Math.round(x * 10) / 10 : '∞'; } }
      ];
      const gRows = [...groups.values()];
      U.table(main.querySelector('#mxHost'), { key: 'mx', cols: mxCols, rows: gRows, defaultSort: { key: 'tot', dir: 'desc' }, compact: true,
        onRow: g => { App.ui.stockTab = 'all'; App.go('stock', { sku: g.sku }); },
        card: g => `<div class="top"><div class="cell2"><b>${U.esc(g.name)}</b><span class="sub">${U.esc(g.sku)} · ${t('h_total')} ${fmtV(gTot(g))}</span></div></div>
          <div class="pchips">${C.accs.filter(j => g.cells.has(j)).map(j => `<span class="pchip ps-${g.cells.get(j).status}">${U.esc(A[j].name)} <b>${fmtV(val(g.cells.get(j)))}</b>${g.cells.get(j).expiry ? ' ◆' : ''}</span>`).join('')}</div>` });
      main.querySelector('#mxXlsx').addEventListener('click', () => U.xlsx('consignment-matrix-' + metric + '.xlsx', [{ name: t('m_' + metric), rows: U.xlRows(mxCols.slice(0, 1).concat([{ label: t('col_name'), get: g => g.name }], mxCols.slice(1)), gRows) }]));

      // recall list
      const rcCols = [
        { k: 'sku', label: t('col_sku'), sticky: true, get: p => p.sku, html: p => `<div class="cell2"><b title="${U.esc(p.name)}">${U.esc(p.name)}</b><span class="sub">${U.esc(p.sku)}</span></div>` },
        { k: 'acc', label: t('col_acc'), get: p => p.acc },
        { k: 'rem', label: t('col_rem'), num: true, sum: true, get: p => p.rem, html: p => U.n(p.rem) },
        { k: 'doc', label: 'DOC', num: true, get: p => p.doc, html: p => `<span class="${p.doc > S.consignDocHigh ? 'pc ps-high' : ''}">${U.days(p.doc)}</span>`, xl: p => isFinite(p.doc) ? Math.round(p.doc) : '∞' },
        { k: 'st', label: t('col_st'), num: true, get: p => p.st, html: p => U.pct(p.st) },
        { k: 'risk', label: t('col_atrisk_v'), num: true, sum: true, fmt: U.money, get: p => p.riskV, html: p => p.riskV > 0 ? U.money(p.riskV) : '—' },
        { k: 'cn', label: t('col_cnqty'), num: true, sum: true, get: p => p.recall.qty, html: p => `<b>${U.n(p.recall.qty)}</b>` },
        { k: 'cnv', label: t('col_value'), num: true, sum: true, fmt: U.money, get: p => p.recall.value, html: p => U.money(p.recall.value) },
        { k: 'to', label: t('col_dest'), get: p => p.recall.to || t('clearance'), html: p => p.recall.to ? `→ ${U.esc(p.recall.to)}` : `<span class="muted">${t('clearance')}</span>` },
        { k: 'why', label: t('col_reason'), get: p => p.recall.reasons.map(r => t('rs_' + r)).join(', '), html: p => p.recall.reasons.map(r => `<span class="chip">${t('rs_' + r)}</span>`).join(' ') }
      ];
      U.table(main.querySelector('#rcHost'), { key: 'rc', cols: rcCols, rows: rec, defaultSort: { key: 'cnv', dir: 'desc' }, empty: t('no_recall'),
        total: rows => t('total') + ' · ' + U.n(rows.length), onRow: p => { App.ui.stockTab = 'all'; App.go('stock', { sku: p.sku }); },
        card: p => `<div class="top"><div class="cell2"><b>${U.esc(p.name)}</b><span class="sub">${U.esc(p.sku)} · ${U.esc(p.acc)}</span></div></div>
          <div class="nums"><div><span>${t('col_rem')}</span><b>${U.n(p.rem)}</b></div><div><span>DOC</span><b>${U.days(p.doc)}</b></div><div><span>${t('col_cnqty')}</span><b>${U.n(p.recall.qty)}</b></div></div>
          <div class="act">${p.recall.to ? '→ ' + U.esc(p.recall.to) : t('clearance')} · ${U.money(p.recall.value)} · ${p.recall.reasons.map(r => t('rs_' + r)).join(', ')}</div>` });
      main.querySelector('#rcXlsx').addEventListener('click', () => U.xlsx('cn-recall-' + Calc.iso(M.asDn) + '.xlsx', [{ name: 'Recall', rows: U.xlRows(rcCols, rec) }]));

      Pages.bindSegs(main, App);
    }
  };

  // ------------------------------------------------------------------ combo: bars In / Out + Remaining line (right axis)
  function inoutConfig(C, series, unit, c, big, M) {
    const v = unit === 'v', fmt = v ? U.money : U.n;
    const src = series ? series.map(p => ({ label: M.period.view === 'M' ? (() => { const [y, m] = p.month.split('-'); return I18N.month(+m - 1) + ' ' + y.slice(2); })() : U.dateShort(p.p0), si: v ? p.siV : p.si, so: v ? p.soV : p.so, rem: v ? p.remV : p.rem }))
      : C.byAcc.map(a => ({ label: a.name, si: v ? a.siV : a.si, so: v ? a.soV : a.so, rem: v ? a.remV : a.rem }));
    return {
      type: 'bar',
      data: { labels: src.map(x => x.label), datasets: [
        { label: t('l_si'), data: src.map(x => x.si), backgroundColor: c.cons, borderRadius: 2, barPercentage: .8, categoryPercentage: .7, order: 2 },
        { label: t('l_so'), data: src.map(x => x.so), backgroundColor: c.wh, borderRadius: 2, barPercentage: .8, categoryPercentage: .7, order: 2 },
        // accounts are categories → Remaining as markers only; over time (one account) → a line
        { type: 'line', label: t('l_rem'), data: src.map(x => x.rem), yAxisID: 'y1', borderColor: c.line, backgroundColor: series ? c.surface : c.line, borderWidth: 2,
          showLine: !!series, pointStyle: series ? 'circle' : 'rectRounded', pointRadius: series ? (big ? 4 : 3) : (big ? 9 : 7), pointBorderWidth: series ? 2 : 0, tension: .2, order: 1 }
      ] },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: { x: { grid: { display: false }, ticks: { autoSkip: !!series, maxRotation: 0, maxTicksLimit: big ? 24 : 12 } },
          y: { beginAtZero: true, grid: { color: c.grid }, ticks: { callback: v ? Charts.tickMoney : Charts.tickQty, maxTicksLimit: 6 } },
          y1: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { callback: v ? Charts.tickMoney : Charts.tickQty, maxTicksLimit: 6 } } },
        plugins: { tooltip: { callbacks: { label: it => ' ' + it.dataset.label + ': ' + fmt(it.raw) } } }
      }
    };
  }
  function inoutTable(C, series, unit, M) {
    const v = unit === 'v';
    if (series) return { cols: [t('col_period'), t('l_si'), t('l_so'), t('l_rem')], rows: series.map(p => [M.period.view === 'M' ? p.month : Calc.iso(p.p0), Math.round(v ? p.siV : p.si), Math.round(v ? p.soV : p.so), Math.round(v ? p.remV : p.rem)]) };
    return { cols: [t('col_acc'), t('l_si'), t('l_so'), t('l_rem'), 'DOC', 'Sell-through %'],
      rows: C.byAcc.map(a => [a.name, Math.round(v ? a.siV : a.si), Math.round(v ? a.soV : a.so), Math.round(v ? a.remV : a.rem), a.doc == null ? '' : Math.round(a.doc), a.st == null ? '' : +a.st.toFixed(1)]) };
  }
})(window);
