/* pages/calendar.js — ของเข้า & CN Calendar: PO จะเข้าเมื่อไร CN จะคืนเมื่อไร
   Row 1: 4 KPI · Row 2: month calendar (phone = list by day) | the chosen day · Row 3: PO timeline (Order → ETA, Delayed red) · Row 4: PO / CN table */
(function (global) {
  'use strict';
  const t = global.St;   // CR-01: Supply translator (the global `t` belongs to the Ops shell)
  const Pages = global.Pages = global.Pages || {};
  const PO_ST = { Planned: 's-gray', Confirmed: 's-info', Shipped: 's-ok', Received: 's-muted', Delayed: 's-err' };
  const CN_ST = { Planned: 's-gray', Approved: 's-info', Received: 's-muted' };
  const badge = (cls, txt) => `<span class="st ${cls}">${U.esc(txt)}</span>`;
  Pages.poBadge = s => badge(PO_ST[s] || 's-gray', s);

  Pages.calendar = {
    render(main, App) {
      const M = App.model(), DB = App.DB, S = M.S, ui = App.ui, as = M.asDn;
      let html = Pages.pageHead(M, 'nav_calendar', 'q_calendar');
      if (!M.rows.length) { main.innerHTML = html + `<div class="card">${U.empty(t('empty'), t('empty_hint'), 'filter')}</div>`; return; }
      const I = Calc.inboundOf(DB, M), k = I.kpi;
      html += `<div class="note">${U.icon('info')}<span>${t('po_doc_note')}</span></div>`;
      const until = t('until', { d: U.date(I.hEnd - 1) });
      html += `<div class="kpis k4">
        ${Pages.kpiCard(t('k_po_in', { h: M.h + 'M' }), t('k_po_in_tip', { h: M.h + 'M' }), U.money(k.poV), t('k_sub_po_in', { n: U.n(k.poN), q: U.n(k.poQty) }), '', until)}
        ${Pages.kpiCard(t('k_cn_in', { h: M.h + 'M' }), t('k_cn_in_tip', { h: M.h + 'M' }), `${U.n(k.cnQty)}<small>${t('u_qty')}</small>`, t('k_sub_cn_in', { n: U.n(k.cnN), g: U.n(k.cnGood), b: U.n(k.cnBad), v: U.moneyShort(k.cnBadV) }), '', until)}
        ${Pages.kpiCard(t('k_delay'), t('k_delay_tip'), `${U.n(k.delayN)}<small>PO</small>`, t('k_sub_delay', { v: U.money(k.delayV), q: U.n(k.delayQty) }), '', t('asof_note', { d: U.date(as) }))}
        ${Pages.kpiCard(t('k_ontime'), t('k_ontime_tip', { d: S.onTimeDays }), U.pct(k.onTime, 1), t('k_sub_ontime', { ok: U.n(k.onTimeOk), n: U.n(k.onTimeN), d: S.onTimeDays }), Pages.delta(k.onTime, k.onTimePrev, 'pp', 'up'), t('vs_prev_90', { d: S.onTimeDays }))}
      </div>`;

      // ---------- Row 2: calendar + day
      ui.calShow = ui.calShow || 'all';
      const mk = ui.calMonth || Calc.monthKey(as);
      const m0 = Calc.dn(mk + '-01'), m1 = Calc.addMonths(m0, 1);
      const evs = I.po.concat(I.cn).filter(e => (ui.calShow === 'all' || ui.calShow === e.type) && e.day >= m0 && e.day < m1);
      const byDay = Calc.eventsByDay(evs);
      if (ui.calDay == null || ui.calDay < m0 || ui.calDay >= m1) {
        const days = [...byDay.keys()].sort((a, b) => a - b);
        ui.calDay = days.find(d => d >= as) ?? days[0] ?? Math.min(Math.max(as, m0), m1 - 1);
      }
      const [y, m] = mk.split('-');
      const c = Charts.col();
      const legend = `<span><i style="background:${c.po}"></i>${t('l_po_open')}</span><span><i style="background:${c.status.stockout}"></i>${t('l_po_delay')}</span><span><i style="background:${c.anchor}"></i>${t('l_po_rec')}</span><span><i style="background:${c.cn}"></i>${t('l_cn')}</span>`;
      const calTools = `<button type="button" class="icon-btn" data-cal="-1" aria-label="${t('prev_month')}">${U.icon('left')}</button><b class="cal-m">${I18N.monthLong(+m - 1)} ${y}</b>
        <button type="button" class="icon-btn" data-cal="1" aria-label="${t('next_month')}">${U.icon('right')}</button>${U.seg('calShow', [['all', t('all')], ['po', 'PO'], ['cn', 'CN']], ui.calShow)}`;
      html += `<div class="grid2">
        ${Charts.card({ id: 'cal', title: t('c_cal'), tip: t('c_cal_tip'), tools: calTools, legend, body: `<div id="calHost">${U.isMobile() ? calList(byDay, as) : calGrid(m0, m1, byDay, as, ui.calDay)}</div>` })}
        <section class="card" id="card-day"><div class="card-head"><h3>${t('c_day', { d: U.date(ui.calDay) })}</h3></div>${dayList(byDay.get(ui.calDay), as)}</section>
      </div>`;

      // ---------- Row 3: Gantt
      ui.ganttRec = ui.ganttRec || 'open';
      const gRows = I.po.filter(p => p.open || (ui.ganttRec === 'rec' && p.rec >= as - 90)).sort((a, b) => a.day - b.day || a.order - b.order);
      const gLegend = ['Planned', 'Confirmed', 'Shipped', 'Delayed'].concat(ui.ganttRec === 'rec' ? ['Received'] : []).map(s => `<span><i class="gb g-${s}"></i>${s}</span>`).join('');
      html += Charts.card({ id: 'gantt', title: t('c_gantt'), tip: t('c_gantt_tip'), tools: U.seg('ganttRec', [['open', t('g_open') + ' · ' + U.n(I.po.filter(p => p.open).length)], ['rec', t('g_rec')]], ui.ganttRec),
        legend: gLegend, body: `<div id="ganttHost">${gantt(gRows, as, ui.ganttAll)}</div>` });

      // ---------- Row 4: PO / CN table
      ui.evTab = ui.evTab || 'po'; ui.evOpen = ui.evOpen || 'open';
      const list = (ui.evTab === 'po' ? I.po : I.cn).filter(e => ui.evOpen === 'all' || e.open);
      html += `<section class="card" style="margin-top:16px"><div class="card-head"><h3>${t('c_evtable')}</h3><div class="card-tools">
        ${U.seg('evTab', [['po', 'PO · ' + U.n(I.po.filter(e => ui.evOpen === 'all' || e.open).length)], ['cn', 'CN · ' + U.n(I.cn.filter(e => ui.evOpen === 'all' || e.open).length)]], ui.evTab)}
        ${U.seg('evOpen', [['open', t('f_open')], ['all', t('f_all')]], ui.evOpen)}
        <button type="button" class="btn small" id="evXlsx">${U.icon('download')}${t('export_xlsx')}</button></div></div><div id="evHost"></div></section>`;
      main.innerHTML = html;

      Charts.bind('cal', { title: t('c_cal'), filename: 'calendar-' + mk, legendHTML: legend,
        table: () => ({ cols: [t('col_date'), 'PO', 'PO ' + t('u_qty'), 'CN', 'CN ' + t('u_qty')], rows: [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([d, x]) => [U.date(d), x.po.length, Math.round(x.poQty), x.cn.length, Math.round(x.cnQty)]) }),
        renderBig: box => { box.innerHTML = calGrid(m0, m1, byDay, as, ui.calDay); box.style.overflow = 'auto'; } });
      Charts.bind('gantt', { title: t('c_gantt'), filename: 'po-timeline',
        table: () => ({ cols: ['PO', t('col_sku'), t('col_qty'), t('col_order'), t('col_eta'), t('col_status')], rows: gRows.map(p => [p.no, p.sku, p.qty, Calc.iso(p.order), Calc.iso(p.eta), p.status]) }),
        renderBig: box => { box.innerHTML = gantt(gRows, as, true); box.style.overflow = 'auto'; } });

      main.querySelectorAll('[data-cal]').forEach(b => b.addEventListener('click', () => {
        ui.calMonth = Calc.monthKey(Calc.addMonths(m0, +b.dataset.cal)); ui.calDay = null; App.rerender();
      }));
      main.querySelectorAll('[data-day]').forEach(b => b.addEventListener('click', () => { ui.calDay = +b.dataset.day; App.rerender(); }));
      const ga = main.querySelector('[data-gantt-all]'); if (ga) ga.addEventListener('click', () => { ui.ganttAll = !ui.ganttAll; App.rerender(); });
      const ca = main.querySelector('[data-cal-all]'); if (ca) ca.addEventListener('click', () => { ui.calListAll = true; App.rerender(); });
      main.querySelectorAll('[data-go-sku]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); App.ui.stockTab = 'all'; App.go('stock', { sku: b.dataset.goSku }); }));

      const cols = ui.evTab === 'po' ? poCols(as) : cnCols();
      U.table(main.querySelector('#evHost'), { key: 'ev-' + ui.evTab, cols, rows: list, defaultSort: { key: 'day', dir: ui.evOpen === 'open' ? 'asc' : 'desc' }, empty: t('no_events_list'),
        total: rows => t('total') + ' · ' + U.n(rows.length), onRow: e => { App.ui.stockTab = 'all'; App.go('stock', { sku: e.sku }); },
        card: e => `<div class="top"><div class="cell2"><b>${U.esc(e.name)}</b><span class="sub">${U.esc(e.no)} · ${U.esc(e.sku)}${e.acc ? ' · ' + U.esc(e.acc) : ''}</span></div>${e.type === 'po' ? Pages.poBadge(e.status) : badge(CN_ST[e.status] || 's-gray', e.status)}</div>
          <div class="nums"><div><span>${e.type === 'po' ? t('col_eta') : t('col_date')}</span><b>${U.dateShort(e.day)}</b></div><div><span>${t('col_qty')}</span><b>${U.n(e.qty)}</b></div><div><span>${t('col_value')}</span><b>${U.moneyShort(e.value)}</b></div></div>
          ${e.type === 'cn' ? `<div class="act">${U.esc(e.reason)} · ${e.good ? 'Good' : 'Bad'}</div>` : e.late > 0 ? `<div class="act late">${t('late_days', { d: e.late })}</div>` : ''}` });
      main.querySelector('#evXlsx').addEventListener('click', () => U.xlsx((ui.evTab === 'po' ? 'po-' : 'cn-') + Calc.iso(as) + '.xlsx', [{ name: ui.evTab.toUpperCase(), rows: U.xlRows(cols, list) }]));
      Pages.bindSegs(main, App);
    }
  };

  // ------------------------------------------------------------------ month grid (Monday first)
  function calGrid(m0, m1, byDay, as, sel) {
    const start = Calc.monday(m0), end = Calc.monday(m1 - 1) + 7;
    const wd = t('weekdays').split(',');
    let h = `<div class="cal">${wd.map(d => `<div class="cal-h">${d}</div>`).join('')}`;
    for (let d = start; d < end; d++) {
      const x = byDay.get(d), inM = d >= m0 && d < m1;
      const poCls = x && x.po.length ? (x.delayed ? 'ev-delay' : x.po.every(p => !p.open) ? 'ev-rec' : 'ev-po') : '';
      h += `<button type="button" class="cal-d${inM ? '' : ' out'}${d === as ? ' today' : ''}${d === sel ? ' sel' : ''}" data-day="${d}" ${inM ? '' : 'tabindex="-1"'} aria-label="${U.date(d)}">
        <span class="dn">${new Date(d * 86400000).getUTCDate()}</span>${d === as ? `<span class="tag">${t('today_tag')}</span>` : ''}
        ${x && inM && x.po.length ? `<span class="ev ${poCls}">PO ${x.po.length} · ${U.short(x.poQty)}</span>` : ''}
        ${x && inM && x.cn.length ? `<span class="ev ev-cn">CN ${x.cn.length} · ${U.short(x.cnQty)}</span>` : ''}</button>`;
    }
    return h + '</div>';
  }
  /** phone: only the days that have something, as a list */
  function calList(byDay, as) {
    const all = [...byDay.keys()].sort((a, b) => a - b);
    // the AS OF month opens at AS OF (what is coming); the earlier days are one tap away
    const cut = !App.ui.calListAll && all.some(d => d < as) && all.some(d => d >= as);
    const days = cut ? all.filter(d => d >= as) : all;
    if (!days.length) return U.empty(t('no_events_month'), '', 'calendar');
    return (cut ? `<button type="button" class="btn small ghost" data-cal-all style="margin-bottom:8px">${t('show_earlier', { n: all.length - days.length })}</button>` : '') + `<div class="cal-list">${days.map(d => `<div class="cl-day${d === as ? ' today' : ''}"><div class="cl-h">${U.date(d)}${d === as ? ` <span class="chip">${t('today_tag')}</span>` : ''}</div>${dayRows(byDay.get(d), as)}</div>`).join('')}</div>`;
  }
  function dayList(x, as) { return x ? `<div class="day-list">${dayRows(x, as)}</div>` : U.empty(t('no_events'), '', 'calendar'); }
  function dayRows(x, as) {
    return x.po.map(p => `<button type="button" class="ev-row" data-go-sku="${U.esc(p.sku)}"><span class="ev-ic ${p.status === 'Delayed' ? 'ev-delay' : p.open ? 'ev-po' : 'ev-rec'}">PO</span>
        <span class="nm"><b>${U.esc(p.name)}</b><span>${U.esc(p.no)} · ${U.esc(p.supplier)}${p.late > 0 ? ` · <span class="late">${t('late_days', { d: p.late })}</span>` : ''}</span></span>
        <span class="mt"><b>${U.n(p.qty)}</b>${Pages.poBadge(p.status)}</span></button>`).join('') +
      x.cn.map(e => `<button type="button" class="ev-row" data-go-sku="${U.esc(e.sku)}"><span class="ev-ic ev-cn">CN</span>
        <span class="nm"><b>${U.esc(e.name)}</b><span>${U.esc(e.no)} · ${U.esc(e.acc)} · ${U.esc(e.reason)} · ${e.good ? 'Good' : 'Bad'}</span></span>
        <span class="mt"><b>${U.n(e.qty)}</b>${badge(CN_ST[e.status] || 's-gray', e.status)}</span></button>`).join('');
  }

  // ------------------------------------------------------------------ Gantt (HTML): Order → ETA (received: → received date)
  function gantt(rows, as, all) {
    if (!rows.length) return U.empty(t('no_events_list'), '', 'calendar');
    const t0 = Math.min(as - 14, ...rows.map(p => p.order)), t1 = Math.max(as + 30, ...rows.map(p => (p.rec ?? p.day))) + 7, span = t1 - t0;
    const pct = d => ((d - t0) / span * 100).toFixed(3) + '%';
    const months = []; for (let m = Calc.addMonths(Calc.monthStart(t0), 1); m < t1; m = Calc.addMonths(m, 1)) months.push(m);
    const shown = all ? rows : rows.slice(0, 12);
    const axis = `<div class="gt-axis"><div class="gt-lab"></div><div class="gt-track">${months.map(m => { const [, mm] = Calc.monthKey(m).split('-'); const yy = Calc.monthKey(m).slice(2, 4); return `<span class="gt-tick" style="left:${pct(m)}">${I18N.month(+mm - 1)} ${yy}</span>`; }).join('')}
      <span class="gt-asof" style="left:${pct(as)}">${t('today_tag')}</span></div></div>`;
    const body = shown.map(p => {
      const end = p.rec ?? p.day, w = Math.max(0.6, (end - p.order) / span * 100);
      const tip = `${p.no} · ${p.sku} · ${U.n(p.qty)} ${t('u_qty')} · Order ${U.date(p.order)} → ${p.rec ? t('col_rec') + ' ' + U.date(p.rec) : 'ETA ' + U.date(p.day)} · ${p.status}${p.late > 0 ? ' · ' + t('late_days', { d: p.late }) : ''}`;
      return `<div class="gt-row"><div class="gt-lab"><button type="button" class="link-btn" data-go-sku="${U.esc(p.sku)}" title="${U.esc(p.name)}"><b>${U.esc(p.sku)}</b> <span>${U.esc(p.no)}</span></button></div>
        <div class="gt-track">${months.map(m => `<i class="gt-grid" style="left:${pct(m)}"></i>`).join('')}<i class="gt-now" style="left:${pct(as)}"></i>
        <span class="gbar g-${p.status}" style="left:${pct(p.order)};width:${w.toFixed(3)}%" title="${U.esc(tip)}">${w > 7 ? U.short(p.qty) : ''}</span></div></div>`;
    }).join('');
    return `<div class="gantt">${axis}<div class="gt-body${all ? ' all' : ''}">${body}</div></div>` +
      (rows.length > 12 ? `<div class="pager"><span>${t('rows_of', { a: 1, b: U.n(shown.length), n: U.n(rows.length) })}</span><button type="button" class="btn small" data-gantt-all>${all ? t('show_less') : t('show_all', { n: U.n(rows.length) })}</button></div>` : '');
  }

  // ------------------------------------------------------------------ table columns
  function poCols(as) {
    return [
      { k: 'no', label: t('col_po'), sticky: true, get: e => e.no, html: e => `<div class="cell2"><b>${U.esc(e.no)}</b><span class="sub">${U.esc(e.supplier)}</span></div>` },
      { k: 'sku', label: t('col_sku'), get: e => e.sku, html: e => `<div class="cell2"><b title="${U.esc(e.name)}">${U.esc(e.name)}</b><span class="sub">${U.esc(e.sku)}</span></div>` },
      { k: 'qty', label: t('col_qty'), num: true, sum: true, get: e => e.qty, html: e => U.n(e.qty) },
      { k: 'value', label: t('col_value'), num: true, sum: true, fmt: U.money, get: e => e.value, html: e => U.money(e.value) },
      { k: 'order', label: t('col_order'), get: e => e.order, html: e => U.date(e.order), xl: e => Calc.iso(e.order) },
      { k: 'day', label: t('col_eta'), get: e => e.eta, html: e => `<span class="${e.open && e.status === 'Delayed' ? 'late' : ''}">${U.date(e.open ? e.day : e.eta)}</span>`, xl: e => Calc.iso(e.open ? e.day : e.eta) },
      { k: 'rec', label: t('col_rec'), get: e => e.rec, html: e => e.rec ? U.date(e.rec) : '—', xl: e => e.rec ? Calc.iso(e.rec) : '' },
      { k: 'status', label: t('col_status'), get: e => e.status, html: e => Pages.poBadge(e.status) },
      { k: 'ontime', label: t('col_ontime'), get: e => e.late, html: e => e.onTime === true ? `<span class="good-t">${t('ontime_yes')}</span>` : e.late > 0 ? `<span class="late">${t('late_days', { d: e.late })}</span>` : '—',
        xl: e => e.onTime === true ? 'on-time' : e.late > 0 ? e.late : '' }
    ];
  }
  function cnCols() {
    return [
      { k: 'no', label: t('col_cn'), sticky: true, get: e => e.no, html: e => `<b>${U.esc(e.no)}</b>` },
      { k: 'day', label: t('col_date'), get: e => e.day, html: e => U.date(e.day), xl: e => Calc.iso(e.day) },
      { k: 'sku', label: t('col_sku'), get: e => e.sku, html: e => `<div class="cell2"><b title="${U.esc(e.name)}">${U.esc(e.name)}</b><span class="sub">${U.esc(e.sku)}</span></div>` },
      { k: 'acc', label: t('col_acc'), get: e => e.acc, html: e => `${U.esc(e.acc)} <span class="chip">${e.consignment ? t('consign') : t('outright')}</span>` },
      { k: 'qty', label: t('col_qty'), num: true, sum: true, get: e => e.qty, html: e => U.n(e.qty) },
      { k: 'value', label: t('col_value'), num: true, sum: true, fmt: U.money, get: e => e.value, html: e => U.money(e.value) },
      { k: 'reason', label: t('col_reason'), get: e => e.reason },
      { k: 'cond', label: t('col_cond'), get: e => e.good ? 'Good' : 'Bad', html: e => badge(e.good ? 's-ok' : 's-dark', e.good ? 'Good' : 'Bad') },
      { k: 'status', label: t('col_status'), get: e => e.status, html: e => badge(CN_ST[e.status] || 's-gray', e.status) }
    ];
  }
})(window);
