/* pages/stock.js — Stock & Projection: one row per SKU (search · sort · pages of 50 · sticky header and SKU column · heat on projections)
   < 768px the table becomes a card list. Click / tap a SKU → drawer with the weekly projection, stock by account and lots. */
(function (global) {
  'use strict';
  const t = global.St;   // CR-01: Supply translator (the global `t` belongs to the Ops shell)
  const Pages = global.Pages = global.Pages || {};
  const PAGE = 50;
  const RANK = { stockout: 0, reorder: 1, overstock: 2, healthy: 3, npd: 4, inactive: 5 };

  function columns(M, ui) {
    const u = U.rrUnit[ui.rrUnit] || 7, hi = { 1: 'p1', 3: 'p3', 6: 'p6' }[M.h];
    return [
      { k: 'sku', label: t('col_sku'), sticky: true, get: r => r.sku, html: r => `<div class="cell2"><b title="${U.esc(r.name)}">${U.esc(r.name)}</b><span class="sub">${U.esc(r.sku)} · ${U.esc(r.brand)}</span></div>`, xl: r => r.sku },
      { k: 'status', label: t('col_status'), get: r => RANK[r.status] * 2 + (r.expiry ? 0 : 1), html: r => U.badges(r, M.S), xl: r => t('st_' + r.status) + (r.expiry ? ' + ' + t('st_expiry') : '') },
      { k: 'grp', label: t('col_grp'), get: r => r.cls ? r.cls.group : '', html: r => Pages.grpBadge(r) },   // CR-03 R4
      { k: 'wh', label: t('col_wh'), num: true, get: r => r.whSel, html: r => U.n(r.whSel), sum: true },
      { k: 'cons', label: t('col_cons'), num: true, get: r => r.consSel, html: r => U.n(r.consSel), sum: true },
      ...(App.DB && App.DB.hasIT ? [{ k: 'it', label: t('col_it'), num: true, get: r => r.itSel || 0, html: r => r.itSel > 0.5 ? U.n(r.itSel) : '<span class="muted">—</span>', sum: true }] : []),   // CR-01 (F5)
      { k: 'total', label: t('col_total'), num: true, get: r => r.totalSel, html: r => `<b>${U.n(r.totalSel)}</b>`, sum: true },
      { k: 'rr', label: t('col_rr') + ' ' + t('per_' + { d: 'day', w: 'week', m: 'month' }[ui.rrUnit]), num: true, get: r => r.rrSel * u, html: r => r.rrSel > 0 ? U.n(r.rrSel * u, ui.rrUnit === 'd' ? 1 : 0) : `<span class="muted">${t('no_sales')}</span>`, sum: true },
      { k: 'doc', label: t('col_doc'), num: true, get: r => r.docSel, html: r => U.days(r.docSel), xl: r => isFinite(r.docSel) ? Math.round(r.docSel) : '∞' },
      ...[['p1', 0], ['p3', 1], ['p6', 2]].map(([k, n]) => ({ k, label: t('col_' + k), num: true, hcol: k === hi, get: r => r.proj[n], heat: true, html: r => U.n(r.proj[n]), sum: true })),
      { k: 'stockout', label: t('col_stockout'), get: r => r.stockoutDn == null ? Infinity : r.stockoutDn,
        html: r => r.stockoutDn == null ? '<span class="muted">—</span>' : `<span class="${r.status === 'stockout' ? 'late' : ''}">${U.date(r.stockoutDn)}</span>`, xl: r => r.stockoutDn == null ? '' : U.date(r.stockoutDn) },
      { k: 'oos13', label: t('col_oos13'), tip: t('oos_tip'), num: true, get: r => r.oosW13 || 0, html: r => r.oosW13 ? `<span class="oosw">${r.oosW13}</span>` : '<span class="muted">0</span>' },   // CR-03 R3
      { k: 'lost13', label: t('col_lost13'), tip: t('oos_tip'), num: true, get: r => r.lost13V || 0, html: r => r.lost13V > 0.5 ? U.money(r.lost13V) : '<span class="muted">—</span>', sum: true, fmt: U.money, xl: r => Math.round(r.lost13V || 0) },
      { k: 'action', label: t('col_action'), get: r => U.actionText(r.action), html: r => U.esc(U.actionText(r.action)) }
    ];
  }
  function heatClass(r, v, S) {
    if (r.rrSel <= 0) return '';
    if (v < 0.5) return 'heat-neg';
    if (v < r.rrSel * r.safety) return 'heat-low';
    if (v / r.rrSel > S.overstockDoc) return 'heat-high';
    return '';
  }
  function tabRows(rows, tab) { return tab === 'all' ? rows : tab === 'expiry' ? rows.filter(r => r.expiry) : rows.filter(r => r.status === tab); }   // CR-03: rows after the group filter
  // CR-03 R4: ABC-XYZ group badge + filter (A / B / C = ABC · X / Y / Z = XYZ · N · E)
  const GRP_F = ['', 'A', 'B', 'C', 'X', 'Y', 'Z', 'N', 'E'];
  Pages.grpBadge = r => {
    const c = r.cls; if (!c || !c.group) return '';
    const tip = c.group === 'N' ? t('grp_tip_N', { w: c.hist }) : c.group === 'E' ? t('grp_tip_E') : t('grp_tip', { g: c.group, s: U.pct(c.share, 1), cv: c.cv == null ? '—' : c.cv.toFixed(2) });
    return `<span class="grp g-${c.group[0]}" title="${U.esc(tip)}">${c.group}</span>`;
  };
  Pages.grpMatch = (r, g) => !g || !!(r.cls && (r.cls.group === g || (g.length === 1 && r.cls.group.length === 2 && (r.cls.abc === g || r.cls.xyz === g))));
  Pages.grpSelect = (id, cur) => `<select class="ctl grp-sel" id="${id}" aria-label="${U.esc(t('f_grp'))}" title="${U.esc(t('f_grp'))}">${GRP_F.map(g => `<option value="${g}" ${g === (cur || '') ? 'selected' : ''}>${g ? t('col_grp') + ' ' + g : t('grp_all')}</option>`).join('')}</select>`;
  function sortRows(rows, cols, sort) {
    if (!sort) return rows.slice().sort((a, b) => RANK[a.status] - RANK[b.status] || (a.stockoutDn ?? 1e9) - (b.stockoutDn ?? 1e9) || b.totalSel * b.cost - a.totalSel * a.cost);
    const c = cols.find(x => x.k === sort.key) || cols[0], d = sort.dir === 'desc' ? -1 : 1;
    return rows.slice().sort((a, b) => { const x = c.get(a), y = c.get(b); return (typeof x === 'string' ? x.localeCompare(y) : (x - y || 0)) * d; });
  }

  Pages.stock = {
    render(main, App) {
      const M = App.model(), S = M.S, ui = App.ui;
      const tabs = ['all', 'stockout', 'reorder', 'overstock', 'expiry', 'healthy', 'npd'].concat(M.statusCount.inactive ? ['inactive'] : []);
      if (!tabs.includes(ui.stockTab)) ui.stockTab = 'all';
      const cols = columns(M, ui);
      const gRows = ui.grp ? M.rows.filter(r => Pages.grpMatch(r, ui.grp)) : M.rows;   // CR-03 R4: group filter
      const rows = sortRows(tabRows(gRows, ui.stockTab), cols, ui.sort);
      const pages = Math.max(1, Math.ceil(rows.length / PAGE));
      ui.pageNo = Math.min(Math.max(1, ui.pageNo), pages);
      const slice = rows.slice((ui.pageNo - 1) * PAGE, ui.pageNo * PAGE);
      const c = Charts.col();
      let html = Pages.pageHead(M, 'nav_stock', 'q_stock') + Pages.allocNote(M);
      html += `<div class="stabs" role="tablist">${tabs.map(k => {
        const n = ui.grp ? tabRows(gRows, k).length : k === 'all' ? M.rows.length : k === 'expiry' ? M.statusCount.expiry : M.statusCount[k];   // CR-03: counts follow the group filter
        return `<button type="button" role="tab" data-tab="${k}" class="${ui.stockTab === k ? 'on' : ''}${n ? '' : ' zero'}">${k === 'all' ? '' : `<span class="tdot" style="background:${c.status[k]}${k === 'expiry' ? ';border-radius:1px;transform:rotate(45deg)' : ''}"></span>`}${U.esc(k === 'all' ? t('tab_all') : t('st_' + k))}<span class="n">${U.n(n)}</span></button>`;
      }).join('')}</div>`;
      html += `<div class="toolbar"><input class="ctl search" type="search" id="tQ" placeholder="${t('tsearch')}" value="${U.esc(App.F.q)}" aria-label="${t('tsearch')}">
        <div class="seg sm" id="rrUnit" title="${t('rr_unit')}">${['d', 'w', 'm'].map(u => `<button type="button" data-v="${u}" class="${ui.rrUnit === u ? 'on' : ''}">Run Rate ${t('per_' + { d: 'day', w: 'week', m: 'month' }[u])}</button>`).join('')}</div>
        ${Pages.grpSelect('grpF', ui.grp)}<span class="spacer"></span><button type="button" class="btn" id="tXlsx">${U.icon('download')}${t('export_xlsx')}</button></div>`;

      if (!rows.length) html += `<div class="card">${U.empty(M.rows.length ? t('empty_tab') : t('empty'), M.rows.length ? '' : t('empty_hint'), 'filter')}</div>`;
      else if (U.isMobile()) html += `<div class="clist">${slice.map(r => cardHTML(r, M, ui)).join('')}</div>`;
      else html += tableHTML(slice, rows, cols, M, ui);
      if (rows.length) {
        const val = rows.reduce((x, r) => x + r.totalSel * r.cost, 0);
        html += `<div class="pager"><span>${t('rows_of', { a: U.n((ui.pageNo - 1) * PAGE + 1), b: U.n(Math.min(rows.length, ui.pageNo * PAGE)), n: U.n(rows.length) })} · ${t('col_value')} ${t('col_total')} <b class="tnum">${U.money(val)}</b></span>
          <span class="pg"><button type="button" class="btn small" data-pg="-1" ${ui.pageNo <= 1 ? 'disabled' : ''}>${U.icon('left')}${t('page_prev')}</button><span class="tnum">${ui.pageNo} / ${pages}</span><button type="button" class="btn small" data-pg="1" ${ui.pageNo >= pages ? 'disabled' : ''}>${t('page_next')}${U.icon('right')}</button></span></div>`;
      }
      main.innerHTML = html;

      main.querySelector('.stabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { ui.stockTab = b.dataset.tab; ui.pageNo = 1; App.rerender(); } });
      main.querySelector('#rrUnit').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { ui.rrUnit = b.dataset.v; App.rerender(); } });
      main.querySelector('#grpF').addEventListener('change', e => { ui.grp = e.target.value; ui.pageNo = 1; App.rerender(); });   // CR-03 R4
      const q = main.querySelector('#tQ');
      q.addEventListener('input', U.debounce(() => { App.setF({ q: q.value.trim() }); const n = document.getElementById('tQ'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 300));
      main.querySelector('#tXlsx').addEventListener('click', () => {
        U.xlsx('stock-projection-' + Calc.iso(M.asDn) + '.xlsx', [{ name: 'Stock & Projection', rows: [
          [t('col_sku'), t('col_name'), t('col_brand'), t('col_cat'), ...cols.slice(1).map(c => c.label), 'unit_cost', t('col_value')],
          ...rows.map(r => [r.sku, r.name, r.brand, r.category, ...cols.slice(1).map(c => c.xl ? c.xl(r) : (typeof c.get(r) === 'number' ? Math.round(c.get(r) * 10) / 10 : c.get(r))), r.cost, Math.round(r.totalSel * r.cost)])] }]);
      });
      main.querySelectorAll('[data-pg]').forEach(b => b.addEventListener('click', () => { ui.pageNo += +b.dataset.pg; App.rerender(); window.scrollTo(0, 0); }));
      main.querySelectorAll('th[data-sort]').forEach(th => th.addEventListener('click', () => {
        const k = th.dataset.sort, s = ui.sort;
        ui.sort = !s || s.key !== k ? { key: k, dir: th.classList.contains('num') ? 'desc' : 'asc' } : s.dir === 'asc' ? { key: k, dir: 'desc' } : s.dir === 'desc' && !th.classList.contains('num') ? null : { key: k, dir: 'asc' };
        App.rerender();
      }));
      main.querySelectorAll('[data-sku]').forEach(el => {
        el.addEventListener('click', () => App.openSku(el.dataset.sku));
        el.addEventListener('keydown', e => { if (e.key === 'Enter') App.openSku(el.dataset.sku); });
      });
    },
    openDrawer
  };

  function tableHTML(slice, rows, cols, M, ui) {
    const sum = k => rows.reduce((x, r) => x + (cols.find(c => c.k === k).get(r) || 0), 0);
    const rrSum = rows.reduce((x, r) => x + r.rrSel, 0), totSum = rows.reduce((x, r) => x + r.totalSel, 0);
    return `<div class="tablewrap"><table class="tbl"><thead><tr>${cols.map(c => {
      const s = ui.sort && ui.sort.key === c.k ? `<span class="arr">${ui.sort.dir === 'asc' ? '▲' : '▼'}</span>` : '';
      return `<th data-sort="${c.k}" class="sort ${c.num ? 'num' : ''} ${c.sticky ? 'sticky' : ''}${c.hcol ? ' hcol' : ''}" scope="col"${c.tip ? ` title="${U.esc(c.tip)}"` : ''}>${U.esc(c.label)}${s}</th>`;   // CR-03: + header tip
    }).join('')}</tr></thead>
      <tbody>${slice.map(r => `<tr class="click${App.ui.sku === r.sku ? ' sel' : ''}" tabindex="0" data-sku="${U.esc(r.sku)}">${cols.map(c =>
        `<td class="${c.num ? 'num' : ''} ${c.sticky ? 'sticky' : ''} ${c.heat ? heatClass(r, c.get(r), M.S) : ''}">${c.html(r)}</td>`).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr>${cols.map(c => {
        if (c.k === 'sku') return `<td class="sticky">${t('total')} · ${U.n(rows.length)} SKU</td>`;
        if (c.k === 'doc') return `<td class="num">${rrSum > 0 ? U.days(totSum / rrSum) : '—'}</td>`;
        if (c.sum) return `<td class="num">${c.fmt ? c.fmt(sum(c.k)) : U.n(sum(c.k))}</td>`;   // CR-03: money columns
        return '<td></td>';
      }).join('')}</tr></tfoot></table></div>`;
  }

  function cardHTML(r, M, ui) {
    const n = { 1: 0, 3: 1, 6: 2 }[M.h];
    return `<button type="button" class="ccard" data-sku="${U.esc(r.sku)}">
      <div class="top"><div class="cell2"><b>${U.esc(r.name)}</b><span class="sub">${U.esc(r.sku)} · ${U.esc(r.brand)}</span></div></div>
      <div style="margin:-2px 0 8px">${U.badges(r, M.S)} ${Pages.grpBadge(r)}${r.oosW13 ? ` <span class="oosw" title="${U.esc(t('oos_tip'))}">OOS ${r.oosW13}/13</span>` : ''}</div>
      <div class="nums"><div><span>${t('col_total')}</span><b>${U.n(r.totalSel)}</b></div><div><span>${t('col_doc')}</span><b>${U.days(r.docSel)}</b></div>
        <div class="${heatClass(r, r.proj[n], M.S)}"><span>Proj ${M.h}M</span><b>${U.n(r.proj[n])}</b></div></div>
      <div class="act">${U.esc(U.actionText(r.action))}${r.stockoutDn != null ? ` · ${t('col_stockout')} ${U.date(r.stockoutDn)}` : ''}</div></button>`;
  }

  // ------------------------------------------------------------------ drawer
  function openDrawer(App, sku) {
    const M = App.model(), r = M.rows.find(x => x.sku === sku), DB = App.DB;
    if (!r) { U.drawer.close(); App.ui.sku = null; return; }
    const D = Calc.skuDetail(DB, M, r), s = DB.skus[r.i], c = Charts.col();
    const rrW = r.rrSel * 7;
    const loc = j => j < 0 ? 'WH' : DB.accounts[j].name;   // CR-01: a locked account's drawer lists only its own department's accounts (filter below)
    const anyEst = r.lots.some(L => L.est);
    // CR-01 (7.3 NOLEAK): a department-locked account sees lots at its own accounts and its allocated share of the WH lots only
    const lotsOwn = U.lockCh() ? r.lots.filter(L => L.j < 0 || M.mask[L.j]).map(L => L.j < 0 ? Object.assign({}, L, { qty: L.qty * r.share, atRisk: L.atRisk * r.share, atRiskValue: L.atRiskValue * r.share }) : L) : r.lots;
    const lotsSorted = lotsOwn.slice().sort((a, b) => (a.j - b.j) || (a.exp - b.exp));
    const legend = `<span><i class="line" style="background:${c.wh}"></i>${t('l_stock')}</span><span><i style="background:${Charts.alpha(c.po, .75)}"></i>${t('l_po')}</span><span><i style="background:${Charts.alpha(c.cn, .8)}"></i>${t('l_cn')}</span>
      <span style="color:${c.warn}"><i class="dash"></i>${t('l_rop')}</span><span style="color:${c.err}"><i class="dash"></i>${t('l_safety')}</span><span class="muted"><span class="est-badge">Est.</span> = ${t('l_est')}</span>`;
    const SW = Calc.soWeeksOf(DB, M, r);   // CR-03 R3: weekly Sales Out with the out-of-stock weeks
    const soLegend = `<span><i style="background:${Charts.alpha(c.wh, .7)}"></i>${t('l_so_week')}</span><span><i style="background:${Charts.alpha(c.err, .75)}"></i>${t('l_oos')}</span><span><i class="line" style="background:${c.warn}"></i>${t('l_rru')}</span>`;
    const oosFoot = r.oosW13 ? t('dr_oos_sum', { n: r.oosW13, v: U.money(r.lost13V), q: U.n(r.lost13Q) }) : t('dr_oos_none');
    const html = `<div class="dr-head"><div class="cell2"><b>${U.esc(r.name)}</b><span class="sub">${U.esc(r.sku)} · ${U.esc(r.brand)} · ${U.esc(r.category)} · ${U.esc(s.status)}</span>
        <div style="margin-top:6px">${U.badges(r, M.S)} ${Pages.grpBadge(r)} <span class="chip">${U.esc(U.actionText(r.action))}</span></div></div>
        <button type="button" class="icon-btn lg" data-close aria-label="${t('b_close')}">${U.icon('close')}</button></div>
      <div class="dr-body">
        ${Pages.allocNote(M)}
        <div class="mini-kpis">
          <div><span>${t('dr_kpi_total')}</span><b>${U.n(r.totalSel)}</b></div>
          <div><span>Run Rate ${t('per_week')}</span><b>${U.n(rrW)}</b></div>
          <div><span>${t('col_doc')}</span><b>${U.days(r.docSel)} ${t('d_unit')}</b></div>
          <div><span>${t('dr_rop')}</span><b>${U.n(r.rop)}</b></div>
          <div><span>${t('dr_stockout')}</span><b class="${r.status === 'stockout' ? 'late' : ''}">${U.date(r.stockoutDn)}</b></div>
          <div><span>${t('dr_order_by')}</span><b class="${r.orderByDn != null && r.orderByDn < M.asDn ? 'late' : ''}">${U.date(r.orderByDn)}</b></div>
          <div><span>${t('dr_suggest')}</span><b>${U.n(r.suggestedQty)}</b></div>
          <div><span>${t('dr_open_po')}</span><b>${U.n(r.openPO)}</b></div>
        </div>
        <div class="small muted">${t('dr_lt')} ${U.n(r.lt)} ${t('days')} · ${t('dr_safety')} ${U.n(r.safety)} ${t('days')} · ${t('dr_moq')} ${U.n(r.moq)} · ${t('dr_status_level')}</div>
        ${Charts.card({ id: 'skuproj', title: t('dr_projection'), legend })}
        ${ssCard(r, M)}
        ${Charts.card({ id: 'skuso', title: t('dr_so_oos'), tip: t('oos_tip'), legend: soLegend, foot: oosFoot })}
        <section class="card"><div class="card-head"><h3>${t('dr_by_account')}</h3></div>
          <div class="tablewrap free"><table class="tbl compact"><thead><tr><th>${t('f_account')}</th><th class="num">${t('dr_rem')}</th><th class="num">${t('dr_rr_wk')}</th><th class="num">${t('col_doc')}</th><th class="num">${t('dr_st')}</th><th class="num">${t('dr_quota')}</th></tr></thead>
          <tbody><tr><td><div class="cell2"><b>WH</b><span class="sub">${t('wh')}${M.allMask ? '' : ' × ' + U.pct(r.share * 100)}</span></div></td><td class="num">${U.n(r.whSel)}</td><td class="num">—</td><td class="num">${r.rrTot > 0 ? U.days(r.wh / r.rrTot) : '—'}</td><td></td><td></td></tr>
          ${D.accounts.filter(a => a.sel || !U.lockCh()).map(a => `<tr style="${a.sel ? '' : 'opacity:.45'}"><td><div class="cell2"><b>${U.esc(a.name)}</b><span class="sub">${a.channel} · ${a.cons ? t('consign') : t('outright')}</span></div></td>
            <td class="num">${a.cons ? U.n(a.rem) : '—'}</td><td class="num">${U.n(a.rrDay * 7)}</td><td class="num">${a.cons ? U.days(a.doc) : '—'}</td>
            <td class="num">${a.sellThrough == null ? '—' : U.pct(a.sellThrough)}</td><td class="num">${a.quota ? U.n(a.quota) : '—'}</td></tr>`).join('')}</tbody></table></div></section>
        <section class="card"><div class="card-head"><h3>${t('dr_lots')}</h3></div>${anyEst ? `<div class="note">${U.icon('info')}<span>${t('dr_est_lots')}</span></div>` : ''}
          ${lotsSorted.length ? `<div class="tablewrap free"><table class="tbl compact"><thead><tr><th>Lot</th><th>${t('dr_loc')}</th><th class="num">${t('u_qty')}</th><th>${t('dr_exp')}</th><th>${t('dr_deadline')}</th><th>${t('dr_sellout')}</th><th class="num">${t('dr_atrisk')}</th><th class="num">${t('dr_atrisk')} ฿</th></tr></thead>
          <tbody>${lotsSorted.map(L => `<tr><td>${U.esc(L.lot_no)}${L.est ? ' <span class="est-badge">Est.</span>' : ''}</td><td>${U.esc(loc(L.j))}</td><td class="num">${U.n(L.qty)}</td><td>${U.date(L.exp)}</td>
            <td class="${L.deadline < M.asDn ? 'late' : ''}">${U.date(L.deadline)}</td><td>${L.sellOutDn ? U.date(L.sellOutDn) : '<span class="muted">—</span>'}</td>
            <td class="num ${L.atRisk > 0.5 ? 'heat-neg' : ''}">${L.atRisk > 0.5 ? U.n(L.atRisk) : '—'}</td><td class="num">${L.atRisk > 0.5 ? U.money(L.atRiskValue) : '—'}</td></tr>`).join('')}</tbody></table></div>` : U.empty(t('dr_no_lots'))}</section>
      </div>`;
    U.drawer.open(html, () => { Charts.kill('skuproj'); Charts.kill('skuso'); App.closeSku(); document.querySelectorAll('tr.sel').forEach(x => x.classList.remove('sel')); });
    Charts.bind('skuproj', { title: r.sku + ' · ' + t('dr_projection'), filename: 'projection-' + r.sku, legendHTML: legend, build: big => skuConfig(D, M, big),
      table: () => ({ cols: [t('col_week'), t('l_stock'), t('l_po'), t('l_cn'), t('l_rop'), t('l_safety'), 'Est.'], rows: D.weeks.map(w => [U.date(w.dn), Math.round(w.tot), Math.round(w.po), Math.round(w.cn), Math.round(D.rop), Math.round(D.safety), w.est ? 'Est.' : '']) }) });
    Charts.bind('skuso', { title: r.sku + ' · ' + t('dr_so_oos'), filename: 'sales-out-oos-' + r.sku, legendHTML: soLegend, build: big => soConfig(SW, big),   // CR-03 R3
      table: () => ({ cols: [t('col_week'), t('l_so_week'), t('l_oos'), t('l_rru')], rows: SW.map(w => [U.date(w.dn), Math.round(w.so), w.oos ? w.oos : '', Math.round(w.rrU)]) }) });
    document.querySelectorAll('tr.sel').forEach(x => x.classList.remove('sel'));
    const tr = document.querySelector(`tr[data-sku="${CSS.escape(sku)}"]`); if (tr) tr.classList.add('sel');
  }

  /** CR-03 R4: where the safety stock comes from — Z, d, σd, LT, σLT → SS and ROP (SKU level, every channel), or the old safety days. */
  function ssCard(r, M) {
    const x = r.ss3, L = r.lt3, f = (v, n) => v == null ? '—' : U.n(v, n);
    const ltNote = !L ? '' : L.src === 'sku' ? t('lt_src_sku', { n: L.n }) : L.src === 'supplier' ? t('lt_src_supplier', { s: L.supplier, n: L.n, o: L.own }) : t('lt_src_est', { m: M.S.ltMinN });
    if (!x) return `<section class="card ss-card"><div class="card-head"><h3>${t('dr_ss_title')}</h3>${Pages.grpBadge(r)}</div>
      <div class="small">${t('dr_ss_days', { d: U.n(r.safety), q: U.n(r.safetyQty) })}</div>
      ${L ? `<div class="small muted" style="margin-top:4px">${t('col_ltact')}: ${f(L.lt, 1)} ± ${f(L.sd, 1)} ${t('days')} · ${U.esc(ltNote)}</div>` : ''}</section>`;
    const rows = [[t('ss_group'), Pages.grpBadge(r)], [t('ss_sl'), U.pct(x.sl, 1)], [t('ss_z'), f(x.z, 3)], [t('ss_d'), f(x.d, 2)],
      [t('ss_sdd'), f(x.sdD, 2) + (x.sdAssumed ? ` <span class="est-badge" title="${U.esc(t('ss_sd_assumed'))}">Est.</span>` : '')],
      [t('ss_lt') + `<div class="small muted">${U.esc(ltNote)}</div>`, f(x.lt, 1) + (x.ltSrc === 'est' ? ` <span class="est-badge">${t('lt_est')}</span>` : '')], [t('ss_sdlt'), f(x.sdLT, 1)],
      [t('ss_ss'), `<b>${f(x.ss, 0)}</b>`], [t('ss_ssd'), f(x.ssDays, 1)], [t('ss_rop'), `<b>${f(r.rop, 0)}</b>`]];
    return `<section class="card ss-card"><div class="card-head"><h3>${t('dr_ss_title')}</h3></div>
      <div class="small muted" style="margin-bottom:6px">${t('dr_ss_formula')}${x.group === 'E' ? ' · ' + t('ss_e_zero') : ''}</div>
      <div class="tablewrap free"><table class="tbl compact ss-tbl"><tbody>${rows.map(([k, v]) => `<tr><td>${k}</td><td class="num">${v}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  /** CR-03 R3: weekly Sales Out (selected accounts) — out-of-stock weeks in red, the unconstrained run rate per week as a line. */
  function soConfig(W, big) {
    const c = Charts.col();
    return {
      type: 'bar',
      data: { labels: W.map(w => U.dateShort(w.dn)), datasets: [
        { label: t('l_so_week'), data: W.map(w => w.so), backgroundColor: W.map(w => w.oos ? Charts.alpha(c.err, .75) : Charts.alpha(c.wh, .7)), barPercentage: .8, order: 2 },
        { type: 'line', label: t('l_rru'), data: W.map(w => w.rrU), borderColor: c.warn, borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, fill: false, order: 1 }
      ] },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: big ? 14 : 7 } },
          y: { beginAtZero: true, grid: { color: c.grid }, ticks: { callback: Charts.tickQty, maxTicksLimit: 5 } } },
        plugins: { tooltip: { callbacks: { title: it => U.date(W[it[0].dataIndex].dn) + (W[it[0].dataIndex].oos ? ' · ' + t('l_oos') : ''), label: it => ' ' + it.dataset.label + ': ' + U.n(it.raw) } } }
      }
    };
  }

  function skuConfig(D, M, big) {
    const c = Charts.col(), W = D.weeks, i0 = W.findIndex(w => w.k === 0), fut = ctx => ctx.p1DataIndex > i0;
    return {
      type: 'bar',
      data: { labels: W.map(w => U.dateShort(w.dn)), datasets: [
        { type: 'line', label: t('l_stock'), data: W.map(w => w.tot), borderColor: c.wh, backgroundColor: Charts.alpha(c.wh, .12), fill: 'origin', borderWidth: 2, tension: .2, order: 1,
          pointRadius: big ? 3 : 2, pointBackgroundColor: W.map(w => w.est ? c.surface : c.wh), pointBorderColor: c.wh, segment: { borderDash: ctx => fut(ctx) ? [5, 4] : undefined } },
        { label: t('l_po'), data: W.map(w => w.po || null), backgroundColor: Charts.alpha(c.po, .75), barPercentage: .6, order: 2 },
        { label: t('l_cn'), data: W.map(w => w.cn || null), backgroundColor: Charts.alpha(c.cn, .8), barPercentage: .6, order: 2 },
        { type: 'line', label: t('l_rop'), data: W.map(() => D.rop), borderColor: c.warn, borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, fill: false, order: 0 },
        { type: 'line', label: t('l_safety'), data: W.map(() => D.safety), borderColor: c.err, borderDash: [2, 3], borderWidth: 1.5, pointRadius: 0, fill: false, order: 0 }
      ] },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: { x: { stacked: false, grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: big ? 18 : 8 } },
          y: { beginAtZero: true, grid: { color: c.grid }, ticks: { callback: Charts.tickQty, maxTicksLimit: 6 } } },
        plugins: {
          tooltip: { filter: it => it.raw != null, callbacks: { title: it => U.date(W[it[0].dataIndex].dn) + (W[it[0].dataIndex].est ? ' · Est.' : ''), label: it => ' ' + it.dataset.label + ': ' + U.n(it.raw) } },
          vLines: { lines: [{ index: i0, label: t('l_today'), color: c.muted }] }
        }
      }
    };
  }
})(window);
