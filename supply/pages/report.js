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
    return Pages.delta(r.cur, r.prev, r.kind === 'money' ? 'rel' : r.kind === 'pct' ? 'pp' : r.kind === 'days' ? 'days' : 'abs', r.pol);
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

      main.innerHTML = `<div class="pagehead no-print"><div><h1 class="page">${U.esc(t('nav_report'))}</h1><div class="q">${U.esc(t('q_report'))}</div></div>
          <div class="card-tools">${U.seg('rpView', [['W', t('weekly')], ['M', t('monthly')]], M.period.view, '')}
          <button type="button" class="btn" id="rpPrint">${U.icon('report')}${t('rp_print')}</button>
          <button type="button" class="btn" id="rpXl">${U.icon('download')}Excel</button>
          <button type="button" class="btn" id="rpJson">${U.icon('download')}JSON</button></div></div>
        <article class="report card">
          <header class="rp-head"><div><div class="rp-kicker">Charmiss Ops · Supply Review</div><h2>${U.esc(title)}</h2><div class="rp-period">${Pages.periodText(M)}</div></div>
            <div class="rp-meta">${t('f_asof')} <b>${U.date(M.asDn)}</b><br>Run Rate <b>${M.basis === 'W' ? 'Weighted' : M.basis}</b> · ${t('f_h')} <b>${M.h}M</b><br>${U.esc(filterText(M, DB))}<br><span class="muted">${t('rp_made')} ${U.date(Calc.dn(made.toISOString().slice(0, 10)))} ${made.toTimeString().slice(0, 5)}</span></div></header>

          <section class="rp-sec"><h3>${t('rp_kpi')}</h3>
            <table class="tbl compact rp-t rp-kpi"><thead><tr><th>${t('col_metric')}</th><th class="num">${t('rp_now')}</th><th class="num">${t('rp_prev')}</th><th class="num">Δ</th></tr></thead>
            <tbody>${R.kpis.map(r => `<tr><td>${U.esc(t(r.key))}</td><td class="num"><b>${fmtK(r.kind, r.cur)}</b></td><td class="num">${fmtK(r.kind, r.prev)}</td><td class="num">${deltaK(r)}</td></tr>`).join('')}</tbody></table>
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
            <div><h3>${U.esc(X.propsTitle)}</h3><div class="rp-line">${X.counts.map(c => `${U.esc(c.label)} <b>${U.n(c.value)}</b>`).join(' · ')}</div>${tbl([t('col_sku'), t('col_acc'), t('col_qty'), t('col_status')], X.rows.slice(0, 10).map(r => `<tr><td><div class="cell2"><b>${U.esc(r.type)}</b><span class="sub">${U.esc(r.id)} · ${U.esc(r.sku)}</span></div></td><td>${U.esc(r.account || '—')}</td><td class="num">${U.n(r.qty)}</td><td class="num">${U.esc(r.status)}</td></tr>`), t('none'))}</div></section>` : ''}

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
          { name: 'Commentary', rows: [[title, m.period.from + ' – ' + m.period.to], [ta.value]] }
        ]);
      });
    }
  };
})(window);
