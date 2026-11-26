/* pages/consign.js — ฝากขาย: ของที่คู่ค้าแต่ละรายเหลือเท่าไร ขายเร็วแค่ไหน ควรเรียกคืนตัวไหน
   Row 1: 4 KPI · Row 2: Sales In vs Sales Out per account (combo, drill to one account over time)
   Row 3: Matrix SKU × account (Remaining / DOC / Sell-through) · Row 4: recall (CN) suggestions
   Row 5 (CR-01 F8): calculated remaining vs shelf count (consign_count) — side by side, the count never overwrites the calculation */
(function (global) {
  'use strict';
  const t = global.St;   // CR-01: Supply translator (the global `t` belongs to the Ops shell)
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
      // CR-03 R5: early warning per SKU × account (pre-set thresholds) — 4 cards · cumulative In vs Out + WOS · alert list · matrix metrics
      const EW = Calc.earlyWarnOf(DB, M.rows, M.asDn, M.mask, S), ek = EW.kpi, ewMap = new Map(EW.pairs.map(x => [x.key, x]));
      const EWp = M.rowsPrev ? Calc.earlyWarnOf(DB, M.rowsPrev, M.periodPrev.p1, M.mask, S).kpi : {};
      const cyc = Calc.replenCycle(S, ''), cycTxt = EW.byAcc.some(a => a.cycle !== cyc) ? t('ew_cycle_mixed') : U.n(cyc);
      html += `<div class="kpis k4 ew-kpis">
        ${Pages.kpiCard(t('k_instock'), t('k_instock_tip', { m: S.inStockMin }), U.pct(ek.instock, 1), t('k_sub_instock', { n: U.n(ek.lowIn), m: S.inStockMin }), Pages.delta(ek.instock, EWp.instock, 'pp', 'up'), vs)}
        ${Pages.kpiCard(t('k_wos_red'), t('k_wos_red_tip', { y: S.wosYellowX, r: S.wosRedX }), `${U.n(ek.red)}<small>${t('pairs_u')}</small>`, t('k_sub_wos', { y: U.n(ek.yellow), c: cycTxt }), Pages.delta(ek.red, EWp.red, 'abs', 'down'), vs)}
        ${Pages.kpiCard(t('k_rgap'), t('k_rgap_tip', { x: S.reorderGapX }), `${U.n(ek.rgap)}<small>${t('pairs_u')}</small>`, t('k_sub_rgap', { d: cycTxt === U.n(cyc) ? U.n(cyc * S.reorderGapX * 7) : t('ew_cycle_mixed') }), Pages.delta(ek.rgap, EWp.rgap, 'abs', 'down'), vs)}
        ${Pages.kpiCard(t('k_dist'), t('k_dist_tip'), `${U.n(ek.dist)}<small>${t('pairs_u')}</small>`, t('k_sub_dist', { s: U.n(ek.swing), a: U.n(ek.accum) }), Pages.delta(ek.dist, EWp.dist, 'abs', 'down'), vs)}
      </div>`;

      // Row 2 — Sales In vs Sales Out
      const c = Charts.col();
      ui.inoutUnit = ui.inoutUnit || 'v';
      if (ui.inoutAcc && !C.accs.some(j => A[j].account_id === ui.inoutAcc)) ui.inoutAcc = '';
      const accSel = `<select class="ctl" id="inoutAcc" aria-label="${t('f_account')}" style="height:28px;font-size:12px"><option value="">${t('all_accounts')}</option>${C.accs.map(j => `<option value="${A[j].account_id}" ${ui.inoutAcc === A[j].account_id ? 'selected' : ''}>${U.esc(A[j].name)}</option>`).join('')}</select>`;
      const legend = `<span><i style="background:${c.cons}"></i>${t('l_si')}</span><span><i style="background:${c.wh}"></i>${t('l_so')}</span><span><i class="line" style="background:${c.line}"></i>${t('l_rem')} (${t('right_axis')})</span>`;
      html += Charts.card({ id: 'inout', title: t('c_inout'), tip: t('c_inout_tip'), tools: accSel + U.seg('inoutUnit', [['v', t('u_value')], ['q', t('u_qty')]], ui.inoutUnit), legend });
      // CR-03 R5: cumulative Sales In vs Sales Out (13 weeks) + WOS for one account (or every selected one) · the alert list
      if (ui.ewAcc && !C.accs.some(j => A[j].account_id === ui.ewAcc)) ui.ewAcc = '';
      const ewSel = `<select class="ctl" id="ewAcc" aria-label="${t('f_account')}" style="height:28px;font-size:12px"><option value="">${t('all_accounts')}</option>${C.accs.map(j => `<option value="${A[j].account_id}" ${ui.ewAcc === A[j].account_id ? 'selected' : ''}>${U.esc(A[j].name)}</option>`).join('')}</select>`;
      const ewLegend = `<span><i class="line" style="background:${c.cons}"></i>${t('l_cum_si')}</span><span><i class="line" style="background:${c.wh}"></i>${t('l_cum_so')}</span><span style="color:${c.warn}"><i class="dash"></i>${t('l_wos')} (${t('right_axis')})</span>`;
      ui.ewType = ui.ewType || 'all';
      const EWT = ['wos', 'rgap', 'instock', 'dist', 'swing', 'accum'], ewCnt = x => EW.alerts.filter(a => a.type === x).length;
      html += `<div class="grid2 even" style="margin-top:16px">
        ${Charts.card({ id: 'ewcum', title: t('c_ewcum'), tip: t('c_ewcum_tip', { y: S.wosYellowX, r: S.wosRedX }), tools: ewSel, legend: ewLegend, boxClass: 'h-row3' })}
        <section class="card" id="card-ew"><div class="card-head"><h3>${t('c_alerts')} ${U.info(t('c_alerts_tip'))}</h3><span class="muted small">${t('k_sub_alerts', { n: U.n(EW.alerts.length), p: U.n(ek.pairs) })}</span></div>
          <div class="stabs ew-tabs">${['all'].concat(EWT).map(x => { const n = x === 'all' ? EW.alerts.length : ewCnt(x); return `<button type="button" data-ewtab="${x}" class="${ui.ewType === x ? 'on' : ''}${n ? '' : ' zero'}">${t(x === 'all' ? 'tab_all' : 'ew_' + x)}<span class="n">${U.n(n)}</span></button>`; }).join('')}</div>
          <div id="ewHost"></div></section>
      </div>`;

      // Row 3 — matrix
      ui.mxMetric = ui.mxMetric || 'rem';
      const sw = (cls, l) => `<span><i class="${cls}"></i>${l}</span>`;
      html += `<section class="card" id="card-mx" style="margin-top:16px"><div class="card-head"><h3>${t('c_matrix')} ${U.info(t('c_matrix_tip', { h: S.consignDocHigh, l: S.consignDocLow, s: C.stLow }))}</h3>
        <div class="card-tools">${U.seg('mxMetric', [['rem', t('m_rem')], ['doc', t('m_doc')], ['st', t('m_st')], ['oos', t('m_oos')], ['wos', t('m_wos')], ['instock', t('m_instock')], ['rgap', t('m_rgap')]], ui.mxMetric)}<button type="button" class="btn small" id="mxXlsx">${U.icon('download')}${t('export_xlsx')}</button></div></div>
        <div class="legend">${sw('ps ps-out', t('ps_out'))}${sw('ps ps-low', t('ps_low', { d: S.consignDocLow }))}${sw('ps ps-high', t('ps_high', { d: S.consignDocHigh }))}<span>◆ ${t('st_expiry')}</span></div>
        <div id="mxHost"></div></section>`;

      // Row 4 — recall list
      html += `<section class="card" id="card-rc" style="margin-top:16px"><div class="card-head"><h3>${t('c_recall')} ${U.info(t('c_recall_tip', { k: S.cnKeepDays }))}</h3>
        <div class="card-tools"><button type="button" class="btn small" id="rcXlsx">${U.icon('download')}${t('export_xlsx')}</button></div></div><div id="rcHost"></div></section>`;

      // Row 5 — CR-01 F8: calculated vs counted (only pairs inside the user's scope with a count on or before AS OF)
      const cnt = countRows(App, M);
      if (cnt.length) {
        const sm = cnt.reduce((x, r) => { x[r.cls]++; x.d += r.diff; x.v += r.diffV; return x; }, { ok: 0, chk: 0, big: 0, d: 0, v: 0 });
        html += `<section class="card" id="card-cnt" style="margin-top:16px"><div class="card-head"><h3>${t('c_count')} ${U.info(t('c_count_tip'))}</h3>
          <div class="card-tools"><button type="button" class="btn small" id="cntXlsx">${U.icon('download')}${t('export_xlsx')}</button></div></div>
          <div class="foot-note cnt-sum" style="margin:0 0 8px">${t('k_sub_count', { n: U.n(cnt.length), ok: U.n(sm.ok), chk: U.n(sm.chk), big: U.n(sm.big), d: (sm.d > 0 ? '+' : '') + U.n(sm.d), v: U.money(sm.v) })}</div>
          <div id="cntHost"></div></section>`;
      }
      main.innerHTML = html;

      // combo chart
      const acc = ui.inoutAcc ? A.find(a => a.account_id === ui.inoutAcc) : null;
      const series = acc ? Calc.consignSeries(DB, M.rows, M.asDn, M.period.view, [acc.j]) : null;
      Charts.bind('inout', { title: t('c_inout') + (acc ? ' · ' + acc.name : ''), filename: 'sales-in-out' + (acc ? '-' + acc.account_id : ''), legendHTML: legend,
        build: big => inoutConfig(C, series, ui.inoutUnit, c, big, M), table: () => inoutTable(C, series, ui.inoutUnit, M) });
      main.querySelector('#inoutAcc').addEventListener('change', e => { ui.inoutAcc = e.target.value; App.rerender(); });
      // CR-03 R5
      const ewJs = ui.ewAcc ? [DB.accIdx.get(ui.ewAcc)] : C.accs, ewS = Calc.ewSeriesOf(DB, M.rows, M.asDn, ewJs), ewA = ui.ewAcc ? A.find(a => a.account_id === ui.ewAcc) : null;
      const ewCycle = ewA ? Calc.replenCycle(S, ewA.account_id) : null;
      Charts.bind('ewcum', { title: t('c_ewcum') + (ewA ? ' · ' + ewA.name : ''), filename: 'sell-in-vs-sell-out' + (ewA ? '-' + ewA.account_id : ''), legendHTML: ewLegend,
        build: big => ewConfig(ewS, c, big, ewCycle ? [ewCycle * S.wosYellowX, ewCycle * S.wosRedX] : null),
        table: () => ({ cols: [t('col_week'), t('l_si'), t('l_so'), t('l_cum_si'), t('l_cum_so'), t('l_wos')], rows: ewS.map(w => [Calc.iso(w.dn), Math.round(w.si), Math.round(w.so), Math.round(w.cumSI), Math.round(w.cumSO), w.wos == null ? '' : +w.wos.toFixed(1)]) }) });
      main.querySelector('#ewAcc').addEventListener('change', e => { ui.ewAcc = e.target.value; App.rerender(); });
      main.querySelectorAll('[data-ewtab]').forEach(b => b.addEventListener('click', () => { ui.ewType = b.dataset.ewtab; App.rerender(); }));
      const SEV = { high: 0, medium: 1, low: 2 }, sevChip = a => `<span class="st ${a.sev === 'high' ? 's-err' : a.sev === 'medium' ? 'reorder' : 's-gray'}">${t('sev_' + a.sev)}</span>`;
      const ewVal = a => a.type === 'wos' ? (isFinite(a.val) ? U.n(a.val, 1) : '∞') + ' ' + t('weeks_u') : a.type === 'rgap' ? (isFinite(a.val) ? U.n(a.val) : '∞') + ' ' + t('days') : a.type === 'instock' ? U.pct(a.val) : a.type === 'swing' ? (a.val > 0 ? '+' : '') + U.n(a.val, 1) + ' ' + t('weeks_u') : a.type === 'accum' ? (a.val == null ? '∞' : U.n(a.val, 1)) + ' ' + t('weeks_u') : '—';
      const ewThr = a => a.type === 'wos' ? '≥ ' + U.n(a.thr) + ' ' + t('weeks_u') : a.type === 'rgap' ? '> ' + U.n(a.thr) + ' ' + t('days') : a.type === 'instock' ? '< ' + U.n(a.thr) + '%' : a.type === 'swing' ? '± ' + U.n(a.thr) + ' ' + t('weeks_u') : a.type === 'accum' ? '> ' + U.n(a.thr) + ' ' + t('weeks_u') : t('ew_dist_rule');
      const ewRows = ui.ewType === 'all' ? EW.alerts : EW.alerts.filter(a => a.type === ui.ewType);
      const ewCols = [
        { k: 'sev', label: t('col_sev'), get: a => SEV[a.sev], html: sevChip, xl: a => t('sev_' + a.sev) },
        { k: 'type', label: t('col_type'), get: a => t('ew_' + a.type), html: a => `<div class="cell2"><b>${U.esc(t('ew_' + a.type))}</b><span class="sub">${U.esc(ewVal(a))} · ${U.esc(ewThr(a))}</span></div>`, xl: a => t('ew_' + a.type) },
        { k: 'sku', label: t('col_sku'), get: a => a.sku, html: a => `<div class="cell2"><b title="${U.esc(a.name)}">${U.esc(a.name)}</b><span class="sub">${U.esc(a.sku)} · ${U.esc(a.acc)}</span></div>` },
        { k: 'val', label: t('col_val'), num: true, get: a => isFinite(a.val) ? a.val : 1e9, html: ewVal, xl: ewVal },
        { k: 'acc', label: t('col_acc'), get: a => a.acc },
        { k: 'thr', label: t('col_thr'), get: a => a.thr, html: a => `<span class="muted">${U.esc(ewThr(a))}</span>`, xl: ewThr }
      ];
      U.table(main.querySelector('#ewHost'), { key: 'ew-' + ui.ewType, cols: ewCols, rows: ewRows, defaultSort: { key: 'sev', dir: 'asc' }, compact: true, empty: t('no_alerts'),
        total: rows => t('total') + ' · ' + U.n(rows.length), onRow: a => { App.ui.stockTab = 'all'; App.go('stock', { sku: a.sku }); },
        card: a => `<div class="top"><div class="cell2"><b>${U.esc(a.name)}</b><span class="sub">${U.esc(a.sku)} · ${U.esc(a.acc)}</span></div>${sevChip(a)}</div>
          <div class="act">${U.esc(t('ew_' + a.type))} · ${U.esc(ewVal(a))} <span class="muted">(${U.esc(ewThr(a))})</span></div>` });

      // matrix
      const groups = new Map();
      for (const p of C.pairs) {
        if (!groups.has(p.i)) groups.set(p.i, { i: p.i, sku: p.sku, name: p.name, brand: p.brand, cost: p.cost, cells: new Map(), rem: 0, remV: 0, rr: 0, so: 0, base: 0, worst: 9 });
        const g = groups.get(p.i); g.cells.set(p.j, p); g.rem += p.rem; g.remV += p.remV; g.rr += p.rr; g.so += p.so; g.base += p.open + p.si;
        g.worst = Math.min(g.worst, { out: 0, low: 1, high: 2, ok: 3 }[p.status]);
      }
      const metric = ui.mxMetric;
      const oosAny = g => { let b = 0; g.cells.forEach(p => { b |= p.oosBits || 0; }); let n = 0; while (b) { b &= b - 1; n++; } return n; };   // CR-03: weeks with any account out
      const ewOf = p => ewMap.get(p.i + '|' + p.j) || {};   // CR-03 R5: + WOS / in-stock % / reorder gap (days)
      const val = p => metric === 'oos' ? p.oosW : metric === 'wos' ? ewOf(p).wos : metric === 'instock' ? ewOf(p).instock : metric === 'rgap' ? ewOf(p).rgapD : metric === 'rem' ? p.rem : metric === 'doc' ? p.doc : p.st;   // CR-03 R3: + OOS weeks (13W)
      const fmtV = x => x == null ? '—' : metric === 'wos' ? (isFinite(x) ? U.n(x, 1) : '∞') : metric === 'rgap' ? (isFinite(x) ? U.n(x) : '∞') : metric === 'oos' ? U.n(x) : metric === 'rem' ? U.n(x) : metric === 'doc' ? U.days(x) : U.pct(x);
      const cell = p => p ? `<span class="pc ps-${p.status}" title="${U.esc(`${p.acc}: ${t('m_rem')} ${U.n(p.rem)} · DOC ${U.days(p.doc)} · Sell-through ${U.pct(p.st)}${p.expiry ? ' · ' + t('st_expiry') + ' ' + U.money(p.riskV) : ''}`)}">${fmtV(val(p))}${p.expiry ? '<i class="xd">◆</i>' : ''}</span>` : '';
      const ewTot = g => { let rem = 0, so4 = 0, inW = 0, allW = 0, gap = null; g.cells.forEach(p => { const e = ewOf(p); rem += e.rem || 0; so4 += e.so4 || 0; inW += e.inW || 0; allW += e.allW || 0; if (e.rgapD != null) gap = gap == null ? e.rgapD : Math.max(gap, e.rgapD); });
        return metric === 'wos' ? (so4 > 0 ? rem / so4 : rem > 0.5 ? Infinity : null) : metric === 'instock' ? (allW ? inW / allW * 100 : null) : gap; };
      const gTot = g => ['wos', 'instock', 'rgap'].includes(metric) ? ewTot(g) : metric === 'oos' ? oosAny(g) : metric === 'rem' ? g.rem : metric === 'doc' ? (g.rr > 0 ? g.rem / g.rr : (g.rem > 0.5 ? Infinity : null)) : (g.base > 0 ? g.so / g.base * 100 : null);
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
        { k: 'to', label: t('col_dest'), get: p => U.maskTo(p.recall.to) || t('clearance'), html: p => p.recall.to ? `→ ${U.esc(U.maskTo(p.recall.to))}` : `<span class="muted">${t('clearance')}</span>` },   // CR-01: U.maskTo (NOLEAK)
        ...Pages.propCol(p => ({ type: 'recall', sku: p.sku, account: App.DB.accounts[p.j].account_id, qty: Math.round(p.recall.qty), value: Math.round(p.recall.value), dest: p.recall.to || 'Clearance', detail: p.recall.reasons.join(',') })),   // CR-01 B3
        { k: 'why', label: t('col_reason'), get: p => p.recall.reasons.map(r => t('rs_' + r)).join(', '), html: p => p.recall.reasons.map(r => `<span class="chip">${t('rs_' + r)}</span>`).join(' ') }
      ];
      U.table(main.querySelector('#rcHost'), { key: 'rc', cols: rcCols, rows: rec, defaultSort: { key: 'cnv', dir: 'desc' }, empty: t('no_recall'),
        total: rows => t('total') + ' · ' + U.n(rows.length), onRow: p => { App.ui.stockTab = 'all'; App.go('stock', { sku: p.sku }); },
        card: p => `<div class="top"><div class="cell2"><b>${U.esc(p.name)}</b><span class="sub">${U.esc(p.sku)} · ${U.esc(p.acc)}</span></div></div>
          <div class="nums"><div><span>${t('col_rem')}</span><b>${U.n(p.rem)}</b></div><div><span>DOC</span><b>${U.days(p.doc)}</b></div><div><span>${t('col_cnqty')}</span><b>${U.n(p.recall.qty)}</b></div></div>
          <div class="act">${p.recall.to ? '→ ' + U.esc(U.maskTo(p.recall.to)) : t('clearance')} · ${U.money(p.recall.value)} · ${p.recall.reasons.map(r => t('rs_' + r)).join(', ')}</div>` });
      main.querySelector('#rcXlsx').addEventListener('click', () => U.xlsx('cn-recall-' + Calc.iso(M.asDn) + '.xlsx', [{ name: 'Recall', rows: U.xlRows(rcCols, rec) }]));

      // calculated vs counted (CR-01 F8)
      if (cnt.length) {
        const chip = r => `<span class="st ${r.cls === 'ok' ? 's-ok' : r.cls === 'chk' ? 'reorder' : 's-err'}">${t('cnt_' + r.cls)}</span>`;
        const sgn = x => (x > 0 ? '+' : '') + U.n(x);
        const cntCols = [
          { k: 'sku', label: t('col_sku'), sticky: true, get: r => r.sku, html: r => `<div class="cell2"><b title="${U.esc(r.name)}">${U.esc(r.name)}</b><span class="sub">${U.esc(r.sku)}</span></div>` },
          { k: 'acc', label: t('col_acc'), get: r => r.acc },
          { k: 'date', label: t('col_count_date'), get: r => r.d, html: r => U.date(r.d), xl: r => Calc.iso(r.d) },
          { k: 'calc', label: t('col_calc'), num: true, sum: true, get: r => r.calc, html: r => U.n(r.calc) },
          { k: 'cnt', label: t('col_counted'), num: true, sum: true, get: r => r.qty, html: r => `<b>${U.n(r.qty)}</b>` },
          { k: 'diff', label: t('col_diff'), num: true, sum: true, get: r => r.diff, html: r => sgn(r.diff) },
          { k: 'pct', label: t('col_diff_pct'), num: true, get: r => r.pct, html: r => r.pct == null ? '—' : (r.pct > 0 ? '+' : '') + U.pct(r.pct, 1), xl: r => r.pct == null ? '' : Math.round(r.pct * 10) / 10 },
          { k: 'diffv', label: t('col_diff_v'), num: true, sum: true, fmt: U.money, get: r => r.diffV, html: r => U.money(r.diffV) },
          { k: 'cls', label: t('col_status'), get: r => ({ ok: 0, chk: 1, big: 2 })[r.cls], html: chip, xl: r => t('cnt_' + r.cls) },
          { k: 'src', label: t('col_src'), get: r => r.src },
          ...(Pages.cntAdjCol ? Pages.cntAdjCol(M) : [])   // CR-04 I8-c: ขอปรับยอดตามผลนับ
        ];
        U.table(main.querySelector('#cntHost'), { key: 'cnt', cols: cntCols, rows: cnt, defaultSort: { key: 'cls', dir: 'desc' }, compact: true,
          total: rows => t('total') + ' · ' + U.n(rows.length), onRow: r => { App.ui.stockTab = 'all'; App.go('stock', { sku: r.sku }); },
          card: r => `<div class="top"><div class="cell2"><b>${U.esc(r.name)}</b><span class="sub">${U.esc(r.sku)} · ${U.esc(r.acc)} · ${U.date(r.d)}</span></div>${chip(r)}</div>
            <div class="nums"><div><span>${t('col_calc')}</span><b>${U.n(r.calc)}</b></div><div><span>${t('col_counted')}</span><b>${U.n(r.qty)}</b></div><div><span>${t('col_diff')} ${sgn(r.diff)}</span><b>${r.pct == null ? '—' : (r.pct > 0 ? '+' : '') + U.pct(r.pct, 1)}</b></div></div>` });
        main.querySelector('#cntXlsx').addEventListener('click', () => U.xlsx('consign-count-vs-calc-' + Calc.iso(M.asDn) + '.xlsx', [{ name: 'Count vs calc', rows: U.xlRows(cntCols.slice(0, 1).concat([{ label: t('col_name'), get: r => r.name }], cntCols.slice(1)), cnt) }]));
      }

      Pages.bindSegs(main, App);
    }
  };

  // ------------------------------------------------------------------ CR-01 F8: shelf count vs calculated remaining
  // The latest count per SKU × account on or before AS OF, inside the page scope (SKU filters + account mask / locked channel).
  // A count is taken at the end of its day → compared with the calculated remaining at the start of the next day.
  // Read-only: the calculated stock (and every anchor) stays as it is; the count is only shown next to it.
  const CNT_OK = 2, CNT_CHK = 10;   // |diff %| ≤ 2 → match · ≤ 10 → check · above → big gap
  function countRows(App, M) {
    const DB = App.DB, list = (App.raw && App.raw.consign_count) || [], inRows = new Set(M.rows.map(r => r.i)), last = new Map();
    for (const r of list) {
      const i = DB.skuIdx.get(String(r.sku || '').trim()), j = DB.accIdx.get(String(r.account_id || '').trim()), d = Calc.dn(r.date), q = Number(r.qty);
      if (i == null || j == null || d == null || !isFinite(q) || d > M.asDn || !inRows.has(i) || !M.mask[j]) continue;
      const k = i + '|' + j, p = last.get(k);
      if (!p || d >= p.d) last.set(k, { i, j, d, qty: q, src: String(r.source || '').trim() });
    }
    return [...last.values()].map(c => {
      const s = DB.skus[c.i], calc = Math.round(Calc.stockAt(DB, c.i, c.d + 1).cons[c.j]), diff = c.qty - calc;
      const pct = calc > 0 ? diff / calc * 100 : (diff === 0 ? 0 : null), a = Math.abs(pct == null ? Infinity : pct);
      return Object.assign(c, { sku: s.sku, name: s.name, acc: DB.accounts[c.j].name, calc, diff, pct, diffV: diff * s.unit_cost, cls: a <= CNT_OK ? 'ok' : a <= CNT_CHK ? 'chk' : 'big' });
    });
  }

  // ------------------------------------------------------------------ CR-03 R5: cumulative Sales In vs Sales Out (13 weeks) + WOS (right axis, yellow / red lines for one account)
  function ewConfig(W, c, big, lines) {
    return {
      type: 'line',
      data: { labels: W.map(w => U.dateShort(w.dn)), datasets: [
        { label: t('l_cum_si'), data: W.map(w => w.cumSI), borderColor: c.cons, backgroundColor: Charts.alpha(c.cons, .12), fill: false, borderWidth: 2, pointRadius: big ? 3 : 2, tension: .2 },
        { label: t('l_cum_so'), data: W.map(w => w.cumSO), borderColor: c.wh, backgroundColor: Charts.alpha(c.wh, .12), fill: false, borderWidth: 2, pointRadius: big ? 3 : 2, tension: .2 },
        { label: t('l_wos'), data: W.map(w => w.wos == null ? null : Math.min(w.wos, 52)), yAxisID: 'y1', borderColor: c.warn, borderDash: [6, 4], borderWidth: 1.5, pointRadius: big ? 3 : 2, fill: false, tension: .2 },
        ...(lines || []).map((v, n) => ({ label: n ? 'WOS ' + t('ew_red') : 'WOS ' + t('ew_yellow'), data: W.map(() => v), yAxisID: 'y1', borderColor: n ? c.err : c.status.reorder, borderDash: [2, 3], borderWidth: 1, pointRadius: 0, fill: false }))
      ] },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: big ? 14 : 7 } },
          y: { beginAtZero: true, grid: { color: c.grid }, ticks: { callback: Charts.tickQty, maxTicksLimit: 6 } },
          y1: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { maxTicksLimit: 6, callback: v => v + 'w' } } },
        plugins: { tooltip: { callbacks: { label: it => ' ' + it.dataset.label + ': ' + (it.dataset.yAxisID === 'y1' ? U.n(it.raw, 1) + ' ' + t('weeks_u') : U.n(it.raw)) } } }
      }
    };
  }

  // ------------------------------------------------------------------ combo: bars In / Out + Remaining line (right axis)
  function inoutConfig(C, series, unit, c, big, M) {
    const v = unit === 'v', fmt = v ? U.money : U.n;
    const src = series ? series.map(p => ({ label: M.period.view === 'M' ? (() => { const [y, m] = p.month.split('-'); return I18N.month(+m - 1) + ' ' + y.slice(2); })() : U.dateShort(p.p0), si: v ? p.siV : p.si, so: v ? p.soV : p.so, rem: v ? p.remV : p.rem }))
      : C.byAcc.map(a => ({ label: a.name, si: v ? a.siV : a.si, so: v ? a.soV : a.so, rem: v ? a.remV : a.rem }));
    // CR-01 F2: per account on a phone (< 768 px) → horizontal bars, account names on the Y axis so they never overlap
    if (!series && !big && U.isMobile()) return {
      type: 'bar',
      data: { labels: src.map(x => x.label), datasets: [
        { label: t('l_si'), data: src.map(x => x.si), backgroundColor: c.cons, borderRadius: 2, barPercentage: .8, categoryPercentage: .75, order: 2 },
        { label: t('l_so'), data: src.map(x => x.so), backgroundColor: c.wh, borderRadius: 2, barPercentage: .8, categoryPercentage: .75, order: 2 },
        { type: 'line', label: t('l_rem'), data: src.map(x => x.rem), xAxisID: 'x1', indexAxis: 'y', showLine: false, pointStyle: 'rectRounded', pointRadius: 6, backgroundColor: c.line, borderColor: c.line, order: 1 }
      ] },
      options: {
        indexAxis: 'y', interaction: { mode: 'index', intersect: false, axis: 'y' },
        scales: { y: { grid: { display: false }, ticks: { autoSkip: false } },
          x: { beginAtZero: true, grid: { color: c.grid }, ticks: { callback: v ? Charts.tickMoney : Charts.tickQty, maxTicksLimit: 4 } },
          x1: { position: 'top', beginAtZero: true, grid: { display: false }, ticks: { callback: v ? Charts.tickMoney : Charts.tickQty, maxTicksLimit: 4 } } },
        plugins: { tooltip: { callbacks: { label: it => ' ' + it.dataset.label + ': ' + fmt(it.raw) } } }
      }
    };
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
