/* pages/replen.js — วางแผนสั่งผลิต: ต้องสั่งผลิตตัวไหน เท่าไร ภายในวันไหน
   Row 1: What-if (Run Rate ± % · Lead Time ± days) beside Base vs What-if projection · Row 2: SKUs at the reorder point with an editable Suggested Qty
   → Excel "ใบเสนอสั่งผลิต". What-if is not saved in the link; edited quantities are kept in this browser. */
(function (global) {
  'use strict';
  const Pages = global.Pages = global.Pages || {};
  let edits = {};
  try { edits = JSON.parse(localStorage.getItem('scm.orderEdits') || '{}'); } catch (e) { edits = {}; }
  const saveEdits = () => { try { localStorage.setItem('scm.orderEdits', JSON.stringify(edits)); } catch (e) { /* kept for this visit */ } };
  const wiCache = { key: '', M: null };

  /** The model with the What-if applied (Run Rate × (1 + rr%) and Lead Time + lt days) — cached per filter + What-if. */
  function whatIf(App, wi) {
    if (!wi.rr && !wi.lt) return App.model();
    const key = App._modelKey + '|' + wi.rr + '|' + wi.lt;
    if (wiCache.key !== key) {
      App.model();
      wiCache.M = Calc.computeModel(App.DB, Object.assign({}, App.F, { rrMult: 1 + wi.rr / 100, ltAdd: wi.lt }), App.S, {});
      wiCache.key = App._modelKey + '|' + wi.rr + '|' + wi.lt;
    }
    return wiCache.M;
  }
  function summary(M) {
    const due = Calc.replenList(M, 'due');
    const hIdx = { 1: 0, 3: 1, 6: 2 }[M.h];
    return { due: due.length, stockout: M.rows.filter(r => r.status === 'stockout').length,
      sugV: M.rows.reduce((x, r) => x + r.suggestedQty * r.cost, 0), lost: M.rows.reduce((x, r) => x + (r.lostSelH || 0), 0),
      stockH: M.rows.reduce((x, r) => x + r.proj[hIdx] * r.cost, 0) };
  }

  Pages.replen = {
    render(main, App) {
      const ui = App.ui, wi = ui.whatIf || (ui.whatIf = { rr: 0, lt: 0 }), base = App.model();
      let html = Pages.pageHead(base, 'nav_replen', 'q_replen') + Pages.allocNote(base);
      if (!base.rows.length) { main.innerHTML = html + `<div class="card">${U.empty(t('empty'), t('empty_hint'), 'filter')}</div>`; return; }
      const c = Charts.col();
      const legend = `<span><i class="line" style="background:${c.anchorStrong}"></i>${t('wi_base')}</span><span><i class="line" style="background:${c.wh}"></i>${t('wi_whatif')}</span>`;
      html += `<div class="grid2">
        ${Charts.card({ id: 'wiproj', title: t('c_wiproj'), tip: t('c_wiproj_tip'), legend })}
        <section class="card wi-card"><div class="card-head"><h3>${t('c_whatif')} ${U.info(t('c_whatif_tip'))}</h3><button type="button" class="btn small ghost" id="wiReset">${t('wi_reset')}</button></div>
          <label class="wi-row"><span>${t('wi_rr')} <b id="wiRrV"></b></span><input type="range" id="wiRr" min="-50" max="100" step="5" value="${wi.rr}"></label>
          <label class="wi-row"><span>${t('wi_lt')} <b id="wiLtV"></b></span><input type="range" id="wiLt" min="-30" max="60" step="5" value="${wi.lt}"></label>
          <div id="wiSum"></div></section>
      </div>`;
      ui.rpMode = ui.rpMode || 'due';
      html += `<section class="card"><div class="card-head"><h3>${t('c_replen')} ${U.info(t('c_replen_tip', { d: base.S.coverDays }))}</h3>
        <div class="card-tools"><span id="rpSeg"></span><button type="button" class="btn small ghost" id="rpClear">${t('rp_clear')}</button>
        <button type="button" class="btn small primary" id="rpXlsx">${U.icon('download')}${t('rp_export')}</button></div></div>
        <div id="wiBanner"></div><div id="rpHost"></div><div class="foot-note" id="rpFoot"></div></section>`;
      main.innerHTML = html;

      const rr = main.querySelector('#wiRr'), lt = main.querySelector('#wiLt');
      const labels = () => {
        main.querySelector('#wiRrV').textContent = (+rr.value > 0 ? '+' : '') + rr.value + '%';
        main.querySelector('#wiLtV').textContent = (+lt.value > 0 ? '+' : '') + lt.value + ' ' + t('days');
      };
      const recalc = U.debounce(() => { wi.rr = +rr.value; wi.lt = +lt.value; results(); }, 120);
      [rr, lt].forEach(el => el.addEventListener('input', () => { labels(); recalc(); }));
      main.querySelector('#wiReset').addEventListener('click', () => { rr.value = 0; lt.value = 0; labels(); wi.rr = 0; wi.lt = 0; results(); });
      main.querySelector('#rpClear').addEventListener('click', () => { edits = {}; saveEdits(); results(); });
      labels();

      // everything below the sliders is redrawn on every What-if change (the sliders keep their place and focus)
      function results() {
        const W = whatIf(App, wi), active = !!(wi.rr || wi.lt);
        const sb = summary(base), sw = summary(W);
        const row = (lab, a, b, fmt, pol) => {
          const d = b - a, cls = !active || Math.abs(d) < 0.5 ? 'flat' : (d > 0) === (pol === 'up') ? 'good' : 'bad';
          return `<tr><td>${lab}</td><td class="num">${fmt(a)}</td><td class="num"><b>${active ? fmt(b) : '—'}</b></td><td class="num"><span class="delta ${cls}">${active && Math.abs(d) >= 0.5 ? (d > 0 ? '▲ ' : '▼ ') + fmt(Math.abs(d)) : ''}</span></td></tr>`;
        };
        main.querySelector('#wiSum').innerHTML = `<table class="tbl compact wi-tbl"><thead><tr><th></th><th class="num">${t('wi_base')}</th><th class="num">${t('wi_whatif')}</th><th class="num">Δ</th></tr></thead><tbody>
          ${row(t('wi_due'), sb.due, sw.due, U.n, 'down')}${row(t('k_stockout'), sb.stockout, sw.stockout, U.n, 'down')}
          ${row(t('wi_sug'), sb.sugV, sw.sugV, U.moneyShort, 'none')}${row(t('wi_lost', { h: base.h + 'M' }), sb.lost, sw.lost, U.moneyShort, 'down')}
          ${row(t('wi_stockh', { h: base.h + 'M' }), sb.stockH, sw.stockH, U.moneyShort, 'none')}</tbody></table>`;
        main.querySelector('#wiBanner').innerHTML = active ? `<div class="note wi-on">${U.icon('alert')}<span>${t('wi_banner', { rr: (wi.rr > 0 ? '+' : '') + wi.rr + '%', lt: (wi.lt > 0 ? '+' : '') + wi.lt })}</span></div>` : '';
        // chart
        const pb = Calc.projWeekly(base), pw = Calc.projWeekly(W);
        Charts.bind('wiproj', { title: t('c_wiproj'), filename: 'what-if-projection', legendHTML: legend, build: big => wiConfig(pb, pw, active, base, c, big),
          table: () => ({ cols: [t('col_week'), t('wi_base'), t('wi_whatif')], rows: pb.map((p, n) => [U.date(p.dn), Math.round(p.value), Math.round(pw[n].value)]) }) });
        // mode tabs + table
        const cnt = m => Calc.replenList(W, m).length;
        main.querySelector('#rpSeg').innerHTML = U.seg('rpMode', [['due', t('rp_due') + ' · ' + cnt('due')], ['suggest', t('rp_suggest') + ' · ' + cnt('suggest')], ['all', t('f_all') + ' · ' + W.rows.length]], ui.rpMode);
        main.querySelector('#rpSeg [data-seg]').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { ui.rpMode = b.dataset.v; results(); } });
        drawTable(App, W);
      }
      results();
    }
  };

  function qtyOf(r) { return edits[r.sku] != null ? edits[r.sku] : r.suggestedQty; }
  function supplierOf(DB, i) { const l = DB.po[i]; return l.length ? l[l.length - 1].supplier : ''; }

  function drawTable(App, W) {
    const DB = App.DB, host = document.getElementById('rpHost'), as = W.asDn;
    const list = Calc.replenList(W, App.ui.rpMode);
    const cols = [
      { k: 'sku', label: t('col_sku'), sticky: true, get: r => r.sku, html: r => `<div class="cell2"><button type="button" class="link-btn" data-go-sku="${U.esc(r.sku)}"><b>${U.esc(r.name)}</b></button><span class="sub">${U.esc(r.sku)} · ${U.esc(supplierOf(DB, r.i))}</span></div>`, xl: r => r.sku },
      { k: 'status', label: t('col_status'), get: r => ({ stockout: 0, reorder: 1, overstock: 2, healthy: 3, npd: 4, inactive: 5 }[r.status]), html: r => U.badges(r, W.S), xl: r => t('st_' + r.status) },
      { k: 'orderby', label: t('col_orderby'), get: r => r.orderByDn, html: r => r.orderByDn == null ? '—' : `<span class="${r.orderByDn < as ? 'late' : ''}">${U.date(r.orderByDn)}</span>`, xl: r => r.orderByDn == null ? '' : Calc.iso(r.orderByDn) },
      { k: 'sug', label: t('rp_sug'), num: true, get: r => r.suggestedQty, html: r => U.n(r.suggestedQty) },
      { k: 'qty', label: t('rp_qty'), num: true, sum: true, nosort: false, get: r => qtyOf(r), html: r => qtyInput(r), xl: r => qtyOf(r) },
      { k: 'value', label: t('col_value'), num: true, sum: true, fmt: U.money, get: r => qtyOf(r) * r.cost, html: r => `<span data-val="${U.esc(r.sku)}">${U.money(qtyOf(r) * r.cost)}</span>` },
      { k: 'rr', label: t('col_rr') + ' ' + t('per_month'), num: true, get: r => r.rrTot * 30, html: r => U.n(r.rrTot * 30) },
      { k: 'pos', label: t('rp_pos'), num: true, get: r => r.totalAll + r.openPO, html: r => `<span title="${U.esc(t('rp_pos_tip', { s: U.n(r.totalAll), p: U.n(r.openPO) }))}">${U.n(r.totalAll + r.openPO)}</span>` },
      { k: 'rop', label: 'ROP', num: true, get: r => r.rop, html: r => `<span class="${r.totalAll + r.openPO <= r.rop ? 'late' : ''}">${U.n(r.rop)}</span>` },
      { k: 'lt', label: t('dr_lt'), num: true, get: r => r.lt + (W.F.ltAdd || 0), html: r => U.n(r.lt + (W.F.ltAdd || 0)) },
      { k: 'moq', label: 'MOQ', num: true, get: r => r.moq, html: r => U.n(r.moq) }
    ];
    const tb = U.table(host, { key: 'rp-' + App.ui.rpMode, cols, rows: list, cardDiv: true, defaultSort: { key: 'orderby', dir: 'asc' }, empty: t('rp_empty'),
      total: rows => t('total') + ' · ' + U.n(rows.length) + ' SKU',
      card: r => `<div class="top"><div class="cell2"><b>${U.esc(r.name)}</b><span class="sub">${U.esc(r.sku)} · MOQ ${U.n(r.moq)}</span></div>${U.badges(r, W.S)}</div>
        <div class="nums"><div><span>${t('col_orderby')}</span><b class="${r.orderByDn != null && r.orderByDn < as ? 'late' : ''}">${r.orderByDn == null ? '—' : U.dateShort(r.orderByDn)}</b></div>
        <div><span>ROP</span><b>${U.n(r.rop)}</b></div><div><span>${t('rp_pos')}</span><b>${U.n(r.totalAll + r.openPO)}</b></div></div>
        <div class="rp-mrow"><span>${t('rp_qty')}</span>${qtyInput(r)}<b data-val="${U.esc(r.sku)}">${U.money(qtyOf(r) * r.cost)}</b></div>` });
    const foot = () => {
      const rows = tb.rows, q = rows.reduce((x, r) => x + qtyOf(r), 0), v = rows.reduce((x, r) => x + qtyOf(r) * r.cost, 0), n = rows.filter(r => qtyOf(r) > 0).length, ed = rows.filter(r => edits[r.sku] != null).length;
      document.getElementById('rpFoot').innerHTML = t('rp_foot', { n: U.n(n), q: U.n(q), v: U.money(v), e: U.n(ed) });
      const tf = host.querySelector('tfoot tr'); if (tf) { const cells = tf.children, qi = cols.findIndex(c => c.k === 'qty'); cells[qi].textContent = U.n(q); cells[qi + 1].textContent = U.money(v); }
    };
    foot();
    host.oninput = e => {
      const inp = e.target.closest('input.qin'); if (!inp) return;
      const r = list.find(x => x.sku === inp.dataset.sku); if (!r) return;
      const v = Math.max(0, Math.round(+inp.value || 0));
      if (v === r.suggestedQty) delete edits[r.sku]; else edits[r.sku] = v;
      saveEdits();
      inp.classList.toggle('edited', edits[r.sku] != null);
      inp.classList.toggle('bad', v % r.moq !== 0);
      inp.title = v % r.moq !== 0 ? t('rp_moq_warn', { m: U.n(r.moq) }) : '';
      host.querySelectorAll(`[data-val="${CSS.escape(r.sku)}"]`).forEach(el => { el.textContent = U.money(v * r.cost); });
      foot();
    };
    host.querySelectorAll('[data-go-sku]').forEach(b => b.addEventListener('click', () => { App.ui.stockTab = 'all'; App.go('stock', { sku: b.dataset.goSku }); }));
    document.getElementById('rpXlsx').onclick = () => {
      const rows = tb.rows.filter(r => qtyOf(r) > 0);
      if (!rows.length) { U.toast(t('rp_none')); return; }
      const wi = App.ui.whatIf;
      const head = [[t('rp_doc_title')], [t('f_asof'), Calc.iso(as)], [t('rp_doc_made'), new Date().toLocaleString('en-GB')], ['Run Rate', W.basis + (wi.rr ? ` (What-if ${wi.rr > 0 ? '+' : ''}${wi.rr}%)` : '')],
        [t('dr_lt'), wi.lt ? `What-if ${wi.lt > 0 ? '+' : ''}${wi.lt} ${t('days')}` : t('rp_doc_lt_std')], []];
      const hdr = ['SKU', t('col_name'), t('col_brand'), 'Supplier', t('rp_qty'), 'MOQ', 'unit_cost', t('col_value'), t('col_orderby'), t('rp_doc_eta'), t('col_status'), 'Run Rate/' + t('per_month').replace('/', ''), 'Stock + Open PO', 'ROP', t('rp_sug')];
      const body = rows.map(r => [r.sku, r.name, r.brand, supplierOf(DB, r.i), qtyOf(r), r.moq, r.cost, Math.round(qtyOf(r) * r.cost * 100) / 100,
        r.orderByDn == null ? '' : Calc.iso(r.orderByDn), Calc.iso(Math.max(as, Calc.dn(new Date().toISOString().slice(0, 10))) + Math.round(r.lt + (W.F.ltAdd || 0))), t('st_' + r.status),
        Math.round(r.rrTot * 30), Math.round(r.totalAll + r.openPO), Math.round(r.rop), r.suggestedQty]);
      const tot = ['', t('total'), '', '', rows.reduce((x, r) => x + qtyOf(r), 0), '', '', Math.round(rows.reduce((x, r) => x + qtyOf(r) * r.cost, 0) * 100) / 100];
      U.xlsx('ใบเสนอสั่งผลิต-' + Calc.iso(as) + '.xlsx', [{ name: 'ใบเสนอสั่งผลิต', rows: head.concat([hdr], body, [tot]) }]);
    };
  }
  function qtyInput(r) {
    const v = qtyOf(r), bad = v % r.moq !== 0;
    return `<input class="ctl qin${edits[r.sku] != null ? ' edited' : ''}${bad ? ' bad' : ''}" type="number" inputmode="numeric" min="0" step="${r.moq}" value="${v}" data-sku="${U.esc(r.sku)}" aria-label="${U.esc(t('rp_qty') + ' ' + r.sku)}"${bad ? ` title="${U.esc(t('rp_moq_warn', { m: U.n(r.moq) }))}"` : ''}>`;
  }

  function wiConfig(pb, pw, active, M, c, big) {
    const i3 = Math.round((Calc.addMonths(M.asDn, M.h) - M.asDn) / 7);
    return {
      type: 'line',
      data: { labels: pb.map(p => U.dateShort(p.dn)), datasets: [
        { label: t('wi_base'), data: pb.map(p => p.value), borderColor: c.anchorStrong, borderDash: active ? [5, 4] : [], borderWidth: 2, pointRadius: 0, fill: false, tension: .25 },
        ...(active ? [{ label: t('wi_whatif'), data: pw.map(p => p.value), borderColor: c.wh, backgroundColor: Charts.alpha(c.wh, .12), borderWidth: 2.5, pointRadius: 0, fill: 'origin', tension: .25 }] : [])
      ] },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, maxTicksLimit: big ? 18 : 9 } }, y: { beginAtZero: true, grid: { color: c.grid }, ticks: { callback: Charts.tickMoney, maxTicksLimit: 6 } } },
        plugins: { tooltip: { callbacks: { title: it => U.date(pb[it[0].dataIndex].dn) + ' · Est.', label: it => ' ' + it.dataset.label + ': ' + U.money(it.raw) } },
          vLines: { lines: [{ index: i3 < pb.length ? i3 : null, label: M.h + 'M', color: c.accent, dash: [4, 4] }] } }
      }
    };
  }
})(window);
