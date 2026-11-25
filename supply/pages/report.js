/* pages/report.js — รายงาน Weekly / Monthly: built from the same calculations as the other pages, ready to print (A4 landscape) or export.
   KPI vs the previous period · Top risks (stockout / expiry / overstock) · PO arriving soon · planned CN · Quota highlights · Commentary.
   Commentary is kept in this browser (localStorage, one per report = view + period + filters) and goes out with Export JSON / Excel. */
(function (global) {
  'use strict';
  const t = global.St;   // CR-01: Supply translator (the global `t` belongs to the Ops shell)
  const Pages = global.Pages = global.Pages || {};
  const store = {
    get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    all() { const o = {}; try { for (let n = 0; n < localStorage.length; n++) { const k = localStorage.key(n); if (k.startsWith('scm.comment.')) o[k.slice(12)] = localStorage.getItem(k); } } catch (e) { /* blocked */ } return o; }
  };
  function fmtK(kind, v) {
    if (v == null || (typeof v === 'number' && !isFinite(v))) return '—';
    return kind === 'money' ? U.money(v) : kind === 'pct' ? U.pct(v, 1) : kind === 'days' ? U.n(v) + ' ' + t('days') : U.n(v);
  }
  function deltaK(r) {
    if (r.cur == null || r.prev == null) return '<span class="delta flat">—</span>';
    return Pages.delta(r.cur, r.prev, r.kind === 'money' ? 'rel' : r.kind === 'pct' ? 'pp' : r.kind === 'days' ? 'days' : 'abs', r.key === 'k_doc' ? 'none' : r.pol);   // CR-01 F4: DOC neutral
  }
  function filterText(M, DB) {
    const F = M.F, parts = [];
    if (F.ch.length) parts.push(t('f_channel') + ': ' + F.ch.join(', '));
    if (F.acc.length) parts.push(t('f_account') + ': ' + F.acc.map(id => (DB.accounts.find(a => a.account_id === id) || { name: id }).name).join(', '));
    if (F.brand.length) parts.push(t('f_brand') + ': ' + F.brand.join(', '));
    if (F.cat.length) parts.push(t('f_cat') + ': ' + F.cat.join(', '));
    if (F.q) parts.push(t('f_search') + ': "' + F.q + '"');
    return parts.length ? parts.join(' · ') : t('rp_all_data');
  }
  const keyOf = M => 'scm.comment.' + M.period.view + '.' + Calc.iso(M.period.p0) + '.' + Calc.iso(M.asDn) + (M.allMask && !M.F.brand.length && !M.F.cat.length && !M.F.q ? '' : '.' + [M.F.ch, M.F.acc, M.F.brand, M.F.cat, [M.F.q]].map(x => x.join('+')).join('|'));

  Pages.report = {
    render(main, App) {
      const M = App.model(), DB = App.DB, S = M.S;
      if (!M.rows.length) { main.innerHTML = Pages.pageHead(M, 'nav_report', 'q_report') + `<div class="card">${U.empty(t('empty'), t('empty_hint'), 'filter')}</div>`; return; }
      const R = Calc.reportOf(DB, M), Q = Pages.quotaData(App, 3);
      // CR-01 B5: operational status (Ops work queue / operations report, now) + this period's Supply proposals — scoped to the user
      const X = global.Supply && typeof global.Supply.reviewExtra === 'function' ? global.Supply.reviewExtra(M) : null;
      const over = Q.pairs.filter(p => p.cls === 'over').sort((a, b) => b.fit - a.fit).slice(0, 5);
      const under = Q.pairs.filter(p => p.cls === 'under' || p.cls === 'supply').sort((a, b) => a.fit - b.fit).slice(0, 5);
      const title = t(M.period.view === 'M' ? 'rp_title_m' : 'rp_title_w');
      const ck = keyOf(M), comment = store.get(ck);
      const made = new Date();
      const tbl = (head, rows, empty) => rows.length ? `<table class="tbl compact rp-t ${head[0] === t('col_sku') ? 'sku1' : 'date1'}"><thead><tr>${head.map((h, n) => `<th class="${n && h.num !== false ? 'num' : ''}">${U.esc(h.l || h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>` : `<div class="muted small rp-none">${U.esc(empty || t('none'))}</div>`;
      const nm = r => `<td><div class="cell2"><b title="${U.esc(r.name)}">${U.esc(r.name)}</b><span class="sub">${U.esc(r.sku)}</span></div></td>`;

      // CR-03 R7: Monthly = the S&OP cycle in 4 parts (demand · supply · pre-S&OP gap · exec summary) · Weekly keeps its format + the open actions
      const monthly = M.period.view === 'M', SOP = global.Supply && typeof global.Supply.sopInfo === 'function' ? global.Supply.sopInfo(M) : null;
      const classic = `          <section class="rp-sec"><h3>${t('rp_kpi')}</h3>
            <table class="tbl compact rp-t rp-kpi"><thead><tr><th>${t('col_metric')}</th><th class="num">${t('rp_now')}</th><th class="num">${t('rp_prev')}</th><th class="num">Δ</th></tr></thead>
            <tbody>${R.kpis.map(r => `<tr><td>${U.esc(t(r.key === 'k_ach' ? 'k_ach_mtd' : r.key))}</td><td class="num"><b>${fmtK(r.kind, r.cur)}</b></td><td class="num">${fmtK(r.kind, r.prev)}</td><td class="num">${deltaK(r)}</td></tr>`).join('')}</tbody></table>
            <div class="foot-note">${t('rp_kpi_note', { d: S.onTimeDays })}</div></section>

          <section class="rp-sec"><h3>${t('rp_risk')}</h3><div class="rp-grid3">
            <div><h4>${U.status('stockout')} / ${U.status('reorder')}</h4>${tbl([t('col_sku'), t('col_stockout'), t('col_action')], R.stockout.map(r => `<tr>${nm(r)}<td class="num ${r.status === 'stockout' ? 'late' : ''}">${U.date(r.stockoutDn)}</td><td class="num">${U.esc(U.actionText(r.action))}</td></tr>`))}</div>
            <div><h4>${U.status('expiry')}</h4>${tbl([t('col_sku'), t('k_risk_h', { h: '6M' })], R.expiry.map(r => `<tr>${nm(r)}<td class="num">${U.money(r.riskByH[2][1])}</td></tr>`))}</div>
            <div><h4>${U.status('overstock')}</h4>${tbl([t('col_sku'), 'DOC', t('rp_excess')], R.overstock.map(r => `<tr>${nm(r)}<td class="num">${U.days(r.doc)}</td><td class="num">${U.money(r.excessV)}</td></tr>`))}</div>
          </div></section>

          <section class="rp-sec rp-grid2">
            <div><h3>${t('rp_po_soon')}</h3>${tbl([t('col_eta'), t('col_sku'), t('col_qty'), t('col_status')], R.poSoon.slice(0, 10).map(e => `<tr><td>${U.dateShort(e.day)}</td>${nm(e)}<td class="num">${U.n(e.qty)}</td><td class="num">${Pages.poBadge(e.status)}</td></tr>`), t('no_events_list'))}
              ${R.poSoon.length > 10 ? `<div class="foot-note">${t('rp_more', { n: R.poSoon.length - 10 })}</div>` : ''}</div>
            <div><h3>${t('rp_cn_plan', { h: M.h + 'M' })}</h3>${tbl([t('col_date'), t('col_sku'), t('col_acc'), t('col_qty'), t('col_cond')], R.cnPlan.slice(0, 10).map(e => `<tr><td>${U.dateShort(e.day)}</td>${nm(e)}<td>${U.esc(e.acc)}</td><td class="num">${U.n(e.qty)}</td><td class="num">${e.good ? 'Good' : 'Bad'}</td></tr>`), t('no_events_list'))}
              ${R.cnPlan.length > 10 ? `<div class="foot-note">${t('rp_more', { n: R.cnPlan.length - 10 })}</div>` : ''}</div>
          </section>

          <section class="rp-sec"><h3>${t('rp_quota')}</h3>
            <div class="rp-line">${t('k_ach')} <b>${U.pct(R.kpis.find(x => x.key === 'k_ach').cur, 1)}</b> · MAPE (3M) <b>${U.pct(Q.kpi.mape, 1)}</b> · Bias <b>${Q.kpi.bias == null ? '—' : (Q.kpi.bias > 0 ? '+' : '') + U.pct(Q.kpi.bias, 1)}</b> · ${t('k_fill')} <b>${U.pct(Q.kpi.fillRate, 1)}</b></div>
            <div class="rp-grid2">
              <div><h4>${Pages.quotaBadge('over')}</h4>${tbl([t('col_sku'), t('col_acc'), 'Quota Fit'], over.map(p => `<tr>${nm(p)}<td>${U.esc(p.acc)}</td><td class="num">${U.pct(p.fit)}</td></tr>`))}</div>
              <div><h4>${Pages.quotaBadge('under')} / ${Pages.quotaBadge('supply')}</h4>${tbl([t('col_sku'), t('col_acc'), 'Quota Fit'], under.map(p => `<tr>${nm(p)}<td>${U.esc(p.acc)}</td><td class="num">${U.pct(p.fit)}</td></tr>`))}</div>
            </div></section>

          ${X ? `<section class="rp-sec rp-grid2"><div><h3>${U.esc(X.opsTitle)}</h3><table class="tbl compact"><tbody>${X.ops.map(o => `<tr><td>${U.esc(o.label)}</td><td class="num"><b>${U.n(o.value)}</b></td></tr>`).join('')}</tbody></table><div class="foot-note">${U.esc(X.opsNote)}</div></div>
            <div><h3>${U.esc(X.propsTitle)}</h3><div class="rp-line">${X.counts.map(c => `${U.esc(c.label)} <b>${U.n(c.value)}</b>`).join(' · ')}</div>${tbl([t('col_sku'), t('col_acc'), t('col_qty'), t('col_status')], X.rows.slice(0, 10).map(r => `<tr><td><div class="cell2"><b>${U.esc(r.type)}</b><span class="sub">${U.esc(r.id)} · ${U.esc(r.sku)}</span></div></td><td>${U.esc(r.account || '—')}</td><td class="num">${U.n(r.qty)}</td><td class="num">${U.esc(r.status)}</td></tr>`), t('none'))}</div></section>` : ''}`;
      const sevCls = s => s === 'high' ? 's-err' : s === 'medium' ? 'reorder' : 's-gray';
      const actRows = list => list.map(a => `<tr><td><div class="cell2"><b>${U.esc(a.type)}</b><span class="sub">${U.esc(a.id)}</span></div></td><td>${U.esc(a.what)}</td><td>${U.esc(a.owner)}</td><td class="num ${a.late ? 'late' : ''}">${U.date(Calc.dn(new Date(a.due + 7 * 3600000).toISOString().slice(0, 10)))}</td><td class="num"><span class="st ${sevCls(a.sev)}">${U.esc(a.sevTxt)}</span>${a.gone ? ' ✓' : ''}</td></tr>`);
      const actHead = [t('rp_act_type'), t('rp_act_what'), t('rp_act_owner'), t('rp_act_due'), t('rp_act_sev')];
      const actHTML = SOP ? `<section class="rp-sec" id="rp-actions"><h3>${t('rp_actions')}</h3><div class="rp-line">${U.esc(SOP.labels.open)} <b>${U.n(SOP.open)}</b> · ${U.esc(SOP.labels.overdue)} <b class="${SOP.overdue ? 'late' : ''}">${U.n(SOP.overdue)}</b> · ${U.esc(SOP.labels.high)} <b>${U.n(SOP.high)}</b> · ${U.esc(SOP.labels.gone)} <b>${U.n(SOP.gone)}</b></div>
        ${tbl(actHead, actRows(SOP.rows), t('none'))}</section>` : '';
      let sopHTML = '', sopX = null;
      if (monthly) {
        const FV = Pages.fvaData(App, 3), C = Calc.consignmentOf(DB, M.rows, M.asDn, M.period, M.mask, S), G = Calc.sopGapOf(DB, M, C), I = Calc.inboundOf(DB, M);
        const kk = key => R.kpis.find(x => x.key === key) || {}, fvaT = x => x == null ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + U.n(Math.abs(x), 1) + ' pp';
        const mon = Q.monthly.filter(x => !x.future).slice(-4), mlab = x => U.monthLabel(Calc.monthKey(x.m0)) + (x.mtd ? ' (MTD)' : '');
        const lost4 = M.rows.reduce((x, r) => x + (r.lost4V || 0), 0), lost13 = M.rows.reduce((x, r) => x + (r.lost13V || 0), 0), lostTop = M.rows.filter(r => r.lost13V > 0.5).sort((a, b) => b.lost13V - a.lost13V).slice(0, 5);
        const fvWorst = FV.byAcc.filter(g => g.fva != null).sort((a, b) => a.fva - b.fva).slice(0, 4);
        const aRows = M.rows.filter(r => r.cls && r.cls.abc === 'A' && r.rrTot > 0).map(r => ({ r, dos: [r.doc].concat(r.projAll.map(x => x / r.rrTot)) })).sort((a, b) => a.dos[1] - b.dos[1]).slice(0, 10);
        const delayed = I.po.filter(p => p.open && p.status === 'Delayed').sort((a, b) => b.value - a.value).slice(0, 8);
        const ssBy = ['A', 'B', 'C', 'N', 'E'].map(g => { const l = M.rows.filter(r => r.cls && (g.length === 1 && 'ABC'.includes(g) ? r.cls.abc === g : r.cls.group === g)); return { g, n: l.length, q: l.reduce((x, r) => x + (r.safetyQty || 0), 0), v: l.reduce((x, r) => x + (r.safetyQty || 0) * r.cost, 0) }; });
        const gap1 = G.rows.filter(x => x.first === 1).length;
        const optTxt = o => o.key === 'expedite' ? t('sop_opt_expedite', { po: o.po, d: U.dateShort(o.eta) }) : o.key === 'recall' ? t('sop_opt_recall', { a: o.acc, q: U.n(o.qty) }) : o.key === 'quota' ? t('sop_opt_quota', { f: U.pct(o.fit) }) : t('sop_opt_order', { q: U.n(o.qty) });
        const gapCell = m => `<td class="num ${m.gap < -0.5 ? 'late' : ''}">${m.gap < -0.5 ? '−' + U.n(-m.gap) : '<span class="muted">✓</span>'}</td>`;
        const tiles = [['k_stock_value', U.money(kk('k_stock_value').cur)], ['k_doc', kk('k_doc').cur == null ? '—' : U.n(kk('k_doc').cur) + ' ' + t('days')], ['k_stockout', U.n(kk('k_stockout').cur)],
          ['k_risk', U.money(kk('k_risk').cur)], ['k_ach_mtd', U.pct(kk('k_ach').cur, 1)], ['k_fva', fvaT(FV.total.fva)]];
        const decisions = [[t('sop_dec_prop'), SOP ? SOP.propWaiting : 0], [t('sop_dec_gap'), gap1], [t('sop_dec_high'), SOP ? SOP.high : 0], [t('sop_dec_gone'), SOP ? SOP.gone : 0]];
        sopX = { gap: G, FV, lost4, lost13, aRows, ssBy, decisions };
        sopHTML = `
          <section class="rp-sec" id="rp-sop-demand"><h3>1 · ${t('sop_demand')}</h3><div class="rp-grid2">
            <div><h4>${t('sop_so_vs_q')}</h4>${tbl([t('col_period'), 'Quota', t('l_so'), t('sop_so_q')], mon.map(x => `<tr><td>${U.esc(mlab(x))}</td><td class="num">${U.n(x.q)}</td><td class="num">${U.n(x.so)}</td><td class="num">${x.q > 0 ? U.pct(x.so / x.q * 100, 1) : '—'}</td></tr>`))}
              <h4>FVA (3M) ${fvaT(FV.total.fva)} <span class="muted small">WAPE Naive ${U.pct(FV.total.wapeN, 1)} · Quota ${U.pct(FV.total.wapeQ, 1)}</span></h4>${tbl([t('col_acc'), 'WAPE Naive', 'WAPE Quota', 'FVA'], fvWorst.map(g => `<tr><td>${U.esc(g.key)}</td><td class="num">${U.pct(g.wapeN, 1)}</td><td class="num">${U.pct(g.wapeQ, 1)}</td><td class="num ${g.fva < 0 ? 'late' : ''}">${fvaT(g.fva)}</td></tr>`))}</div>
            <div><h4>${t('sop_lost')} <span class="muted small">4W ${U.money(lost4)} · 13W ${U.money(lost13)}</span></h4>${tbl([t('col_sku'), 'OOS 13W', 'Lost 13W'], lostTop.map(r => `<tr>${nm(r)}<td class="num">${U.n(r.oosW13)}</td><td class="num">${U.money(r.lost13V)}</td></tr>`))}
              <h4>${t('sop_missing')}</h4>${tbl([t('col_acc'), t('col_week'), t('col_status')], (SOP ? SOP.missing : []).map(x => `<tr><td>${U.esc(x.acc)}</td><td>${U.date(x.week)}</td><td class="num"><span class="st ${x.k === 'missing' ? 's-err' : 'reorder'}">${U.esc(t('sop_ms_' + x.k))}</span></td></tr>`), t('sop_missing_none'))}</div>
          </div></section>
          <section class="rp-sec" id="rp-sop-supply"><h3>2 · ${t('sop_supply')}</h3><div class="rp-grid2">
            <div><h4>${t('sop_group_a')}</h4>${tbl([t('col_sku'), t('sop_dos_now'), 'DOS 1M', 'DOS 3M', 'DOS 6M', t('col_stockout')], aRows.map(x => `<tr>${nm(x.r)}${x.dos.map(d => `<td class="num ${d < 30 ? 'late' : ''}">${U.days(d)}</td>`).join('')}<td class="num">${U.date(x.r.stockoutDn)}</td></tr>`))}
              <h4>${t('sop_ss_group')}</h4>${tbl([t('col_grp'), 'SKU', t('sop_ss_units'), t('sop_ss_value')], ssBy.map(x => `<tr><td><b>${x.g}</b></td><td class="num">${U.n(x.n)}</td><td class="num">${U.n(x.q)}</td><td class="num">${U.money(x.v)}</td></tr>`))}</div>
            <div><h4>${U.status('stockout')} / ${U.status('reorder')}</h4>${tbl([t('col_sku'), t('col_stockout'), t('col_action')], R.stockout.map(r => `<tr>${nm(r)}<td class="num ${r.status === 'stockout' ? 'late' : ''}">${U.date(r.stockoutDn)}</td><td class="num">${U.esc(U.actionText(r.action))}</td></tr>`))}
              <h4>${t('rp_po_soon')}</h4>${tbl([t('col_eta'), t('col_sku'), t('col_qty'), t('col_status')], R.poSoon.slice(0, 8).map(e => `<tr><td>${U.dateShort(e.day)}</td>${nm(e)}<td class="num">${U.n(e.qty)}</td><td class="num">${Pages.poBadge(e.status)}</td></tr>`), t('no_events_list'))}
              <h4>${t('sop_po_late')}</h4>${tbl([t('col_eta'), t('col_sku'), t('col_qty'), t('sop_days_late')], delayed.map(e => `<tr><td>${U.dateShort(e.eta)}</td>${nm(e)}<td class="num">${U.n(e.qty)}</td><td class="num late">${U.n(e.late)}</td></tr>`), t('none'))}</div>
          </div></section>
          <section class="rp-sec" id="rp-sop-gap"><h3>3 · ${t('sop_gap')}</h3>
            <div class="rp-line">${G.tot.map((x, k) => `${t('sop_month_n', { n: k + 1 })} <b class="${x.n ? 'late' : ''}">${U.n(x.n)} SKU</b> · ${U.money(x.shortV)}`).join(' &nbsp;|&nbsp; ')}</div>
            ${tbl([t('col_sku'), t('col_grp'), t('sop_month_n', { n: 1 }), t('sop_month_n', { n: 2 }), t('sop_month_n', { n: 3 }), t('sop_options')], G.rows.slice(0, 12).map(x => `<tr>${nm(x)}<td class="num">${U.esc(x.group)}</td>${x.months.map(gapCell).join('')}<td class="num sop-opts">${x.opts.map(o => `<span class="chip">${U.esc(optTxt(o))}</span>`).join(' ')}</td></tr>`), t('sop_gap_none'))}
            ${G.rows.length > 12 ? `<div class="foot-note">${t('rp_more', { n: G.rows.length - 12 })}</div>` : ''}<div class="foot-note">${t('sop_gap_note')}</div></section>
          <section class="rp-sec" id="rp-sop-exec"><h3>4 · ${t('sop_exec')}</h3>
            <div class="sop-tiles">${tiles.map(([k, v]) => `<div><small>${U.esc(t(k))}</small><b>${v}</b></div>`).join('')}</div>
            <div class="rp-grid2"><div><h4>${t('sop_decisions')}</h4><table class="tbl compact"><tbody>${decisions.map(([l, v]) => `<tr><td>${U.esc(l)}</td><td class="num"><b class="${v ? 'late' : ''}">${U.n(v)}</b></td></tr>`).join('')}</tbody></table>
              <div class="foot-note">${SOP ? U.esc(SOP.lock.after ? t('sop_lock_after', { d: SOP.lock.day, m: SOP.lock.next }) : t('sop_lock_before', { d: SOP.lock.day, m: SOP.lock.next })) : ''}</div></div>
              <div><h4>${t('sop_prev_actions')} ${SOP && SOP.last ? `<span class="muted small">${t('sop_last_cycle', { id: SOP.last.id, d: U.date(SOP.last.asOf) })}</span>` : ''}</h4>
              ${SOP && SOP.last ? tbl(actHead, actRows(SOP.prevRows), t('none')) : `<div class="muted small rp-none">${t('sop_no_cycle')}</div>`}
              ${SOP ? `<div class="foot-note">${U.esc(SOP.labels.open)} ${U.n(SOP.open)} · ${U.esc(SOP.labels.overdue)} ${U.n(SOP.overdue)}</div>` : ''}</div></div></section>`;
      }

      main.innerHTML = `<div class="pagehead no-print"><div><h1 class="page">${U.esc(t('nav_report'))}</h1><div class="q">${U.esc(t('q_report'))}</div></div>
          <div class="card-tools">${U.seg('rpView', [['W', t('weekly')], ['M', t('monthly')]], M.period.view, '')}
          <button type="button" class="btn" id="rpPrint">${U.icon('report')}${t('rp_print')}</button>
          <button type="button" class="btn" id="rpXl">${U.icon('download')}Excel</button>
          <button type="button" class="btn" id="rpJson">${U.icon('download')}JSON</button></div></div>
        <article class="report card">
          <header class="rp-head"><div><div class="rp-kicker">Charmiss Ops · Supply Review</div><h2>${U.esc(title)}</h2><div class="rp-period">${Pages.periodText(M)}</div></div>
            <div class="rp-meta">${t('f_asof')} <b>${U.date(M.asDn)}</b><br>Run Rate <b>${M.basis === 'W' ? 'Weighted' : M.basis}</b> · ${t('f_h')} <b>${M.h}M</b><br>${U.esc(filterText(M, DB))}<br><span class="muted">${t('rp_made')} ${U.date(Calc.dn(made.toISOString().slice(0, 10)))} ${made.toTimeString().slice(0, 5)}</span></div></header>

          ${monthly ? sopHTML : classic + actHTML}

          <section class="rp-sec"><h3>${t('rp_comment')}</h3>
            <textarea class="ctl rp-ta no-print" id="rpTa" rows="6" placeholder="${U.esc(t('rp_comment_ph'))}">${U.esc(comment)}</textarea>
            <div class="rp-ta-print print-only">${U.esc(comment || '—').replace(/\n/g, '<br>')}</div>
            <div class="foot-note no-print" id="rpSaved">${comment ? t('rp_saved_local') : t('rp_local_note')}</div></section>
        </article>`;

      const ta = main.querySelector('#rpTa');
      ta.addEventListener('input', U.debounce(() => {
        const ok = store.set(ck, ta.value);
        main.querySelector('.rp-ta-print').innerHTML = U.esc(ta.value || '—').replace(/\n/g, '<br>');
        main.querySelector('#rpSaved').textContent = ok ? t('rp_saved_at', { t: new Date().toTimeString().slice(0, 5) }) : t('rp_not_saved');
      }, 400));
      main.querySelector('[data-seg="rpView"]').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b && b.dataset.v !== M.period.view) App.setF({ view: b.dataset.v }); });
      main.querySelector('#rpPrint').addEventListener('click', () => window.print());
      const meta = () => ({ report: title, view: M.period.view, period: { from: Calc.iso(M.period.p0), to: Calc.iso(M.period.p1 - 1), mtd: !!M.period.partial }, asOf: Calc.iso(M.asDn),
        runRate: M.basis, horizon: M.h + 'M', filters: filterText(M, DB), generated: made.toISOString() });
      main.querySelector('#rpJson').addEventListener('click', () => {
        const out = Object.assign(meta(), { kpis: R.kpis.map(r => ({ metric: t(r.key), now: r.cur, previous: r.prev })), operations: X ? X.ops.map(o => ({ item: o.label, value: o.value })) : undefined, proposals: X ? { counts: X.counts, list: X.rows } : undefined, commentary: ta.value,   // CR-01 B5
           actions: SOP ? { open: SOP.open, overdue: SOP.overdue, high: SOP.high, list: SOP.rows.map(a => ({ id: a.id, type: a.type, what: a.what, owner: a.owner, due: new Date(a.due).toISOString().slice(0, 10), severity: a.sev })) } : undefined,   // CR-03 R7
           sop: sopX ? { fva: sopX.FV.total, lostSales: { w4: Math.round(sopX.lost4), w13: Math.round(sopX.lost13) }, gap: sopX.gap.rows.map(x => ({ sku: x.sku, firstShortMonth: x.first, months: x.months.map(m => Math.round(m.gap)), options: x.opts.map(o => o.key) })), decisions: sopX.decisions } : undefined,
           allCommentaries: (global.Supply && global.Supply.ctx.lockCh) ? undefined : store.all() });   // CR-01 (7.3 NOLEAK): a department-locked account exports only its own commentary
        U.downloadURL(URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })), 'scm-report-' + M.period.view + '-' + Calc.iso(M.asDn) + '.json');
      });
      main.querySelector('#rpXl').addEventListener('click', () => {
        const m = meta();
        U.xlsx('scm-report-' + M.period.view + '-' + Calc.iso(M.asDn) + '.xlsx', [
          { name: 'KPI', rows: [[title], [Pages.periodText(M).replace(/<[^>]+>/g, '')], ['AS OF', m.asOf, 'Run Rate', m.runRate, 'Horizon', m.horizon], [m.filters], [], [t('col_metric'), t('rp_now'), t('rp_prev')], ...R.kpis.map(r => [t(r.key), r.cur == null ? '' : +(+r.cur).toFixed(2), r.prev == null ? '' : +(+r.prev).toFixed(2)])] },
          { name: 'Top Risk', rows: [['Type', 'SKU', t('col_name'), t('col_status'), t('col_stockout'), 'At-risk 6M ฿', 'DOC', t('rp_excess'), t('col_action')],
            ...R.stockout.map(r => ['Stockout / Reorder', r.sku, r.name, t('st_' + r.status), r.stockoutDn == null ? '' : Calc.iso(r.stockoutDn), '', isFinite(r.doc) ? Math.round(r.doc) : '', '', U.actionText(r.action)]),
            ...R.expiry.map(r => ['Expiry', r.sku, r.name, t('st_' + r.status), '', Math.round(r.riskByH[2][1]), '', '', U.actionText(r.action)]),
            ...R.overstock.map(r => ['Overstock', r.sku, r.name, t('st_' + r.status), '', '', isFinite(r.doc) ? Math.round(r.doc) : '', Math.round(r.excessV), U.actionText(r.action)])] },
          { name: 'PO 30 days', rows: [['PO', 'SKU', t('col_name'), t('col_qty'), t('col_value'), 'ETA', t('col_status')], ...R.poSoon.map(e => [e.no, e.sku, e.name, e.qty, Math.round(e.value), Calc.iso(e.day), e.status])] },
          { name: 'CN planned', rows: [['CN', 'SKU', t('col_name'), t('col_acc'), t('col_qty'), t('col_date'), 'Condition', 'Reason', t('col_status')], ...R.cnPlan.map(e => [e.no, e.sku, e.name, e.acc, e.qty, Calc.iso(e.day), e.good ? 'Good' : 'Bad', e.reason, e.status])] },
          { name: 'Quota', rows: [['Type', 'SKU', t('col_name'), t('col_acc'), 'Quota Fit %', 'Quota', t('q_expected')], ...over.map(p => [t('qc_over'), p.sku, p.name, p.acc, Math.round(p.fit), p.quota, Math.round(p.expected)]), ...under.map(p => [t('qc_' + p.cls), p.sku, p.name, p.acc, Math.round(p.fit), p.quota, Math.round(p.expected)])] },
          ...(X ? [{ name: 'Operations', rows: [[X.opsTitle], ...X.ops.map(o => [o.label, o.value]), [X.opsNote]] },   // CR-01 B5
            { name: 'Proposals', rows: [[X.propsTitle], ...X.counts.map(c => [c.label, c.value]), [], ['No.', 'Type', 'SKU', t('col_acc'), t('col_qty'), t('col_status')], ...X.rows.map(r => [r.id, r.type, r.sku, r.account, r.qty, r.status])] }] : []),
          ...(sopX ? [{ name: 'Pre-S&OP gap', rows: [['SKU', t('col_name'), t('col_grp'), 'M1', 'M2', 'M3', t('sop_options')], ...sopX.gap.rows.map(x => [x.sku, x.name, x.group, ...x.months.map(m => Math.round(m.gap)), x.opts.map(o => o.key).join(', ')])] }] : []),   // CR-03 R7
          ...(SOP ? [{ name: 'Actions', rows: [actHead, ...SOP.rows.map(a => [a.type, a.what, a.owner, new Date(a.due).toISOString().slice(0, 10), a.sevTxt])] }] : []),
          { name: 'Commentary', rows: [[title, m.period.from + ' – ' + m.period.to], [ta.value]] }
        ]);
      });
    }
  };
})(window);
