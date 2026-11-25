/* ui.js — formatting, icons and small DOM components shared by every page (multi-select, menu, drawer, modal, toast). */
(function (global) {
  'use strict';
  const t = global.St;   // CR-01: Supply translator (the global `t` belongs to the Ops shell)
  const U = {};

  // ------------------------------------------------------------------ formatting (thousand separators · ฿ · DD MMM YYYY · ค.ศ.)
  U.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.n = (x, d = 0) => (x == null || isNaN(x)) ? '—' : !isFinite(x) ? '∞' : Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  U.money = x => (x == null || isNaN(x)) ? '—' : (x < 0 ? '−฿' : '฿') + U.n(Math.abs(Math.round(x)));
  U.short = (x, d) => {
    if (x == null || isNaN(x)) return '—';
    const a = Math.abs(x), s = x < 0 ? '−' : '';
    if (a >= 1e9) return s + (a / 1e9).toFixed(d ?? 2) + 'B';
    if (a >= 1e6) return s + (a / 1e6).toFixed(d ?? (a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2)) + 'M';
    if (a >= 1e4) return s + (a / 1e3).toFixed(d ?? 0) + 'K';
    if (a >= 1e3) return s + (a / 1e3).toFixed(d ?? 1) + 'K';
    return s + U.n(a);
  };
  U.moneyShort = x => (x == null || isNaN(x)) ? '—' : (x < 0 ? '−฿' : '฿') + U.short(Math.abs(x));
  U.pct = (x, d = 0) => (x == null || isNaN(x)) ? '—' : U.n(x, d) + '%';
  U.date = d => { if (d == null || !isFinite(d)) return '—'; const x = new Date(d * 86400000); return String(x.getUTCDate()).padStart(2, '0') + ' ' + I18N.month(x.getUTCMonth()) + ' ' + x.getUTCFullYear(); };
  U.dateShort = d => { if (d == null || !isFinite(d)) return '—'; const x = new Date(d * 86400000); return String(x.getUTCDate()).padStart(2, '0') + ' ' + I18N.month(x.getUTCMonth()); };
  U.monthLabel = key => { const [y, m] = key.split('-'); return I18N.monthLong(+m - 1) + ' ' + y; };
  U.days = x => (x == null || isNaN(x)) ? '—' : !isFinite(x) ? '∞' : U.n(Math.round(x));
  U.rrUnit = { d: 1, w: 7, m: 30 };

  // ------------------------------------------------------------------ icons (stroke SVG, 20×20)
  const P = {
    overview: '<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="11" width="6" height="6" rx="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5"/>',
    stock: '<path d="M3 6.5 10 3l7 3.5v7L10 17l-7-3.5z"/><path d="M3 6.5 10 10l7-3.5M10 10v7"/>',
    expiry: '<path d="M6 2.5h8M6 17.5h8M6.5 2.5c0 4 7 4.5 7 7.5s-7 3.5-7 7.5M13.5 2.5c0 4-7 4.5-7 7.5s7 3.5 7 7.5"/>',
    consign: '<path d="M3 8h14l-1-4H4zM4 8v8.5h12V8M8 16.5v-4h4v4"/>',
    calendar: '<rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14M7 2.5v3M13 2.5v3"/>',
    replen: '<path d="M16 7a6.5 6.5 0 0 0-11.5-2M4 3v3h3M4 13a6.5 6.5 0 0 0 11.5 2M16 17v-3h-3"/>',
    quota: '<circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3.5"/><circle cx="10" cy="10" r=".6" class="fill"/>',
    report: '<path d="M5 2.5h7l3.5 3.5v11.5H5z"/><path d="M12 2.5V6h3.5M7.5 10h5M7.5 13h5"/>',
    data: '<ellipse cx="10" cy="5" rx="6" ry="2.5"/><path d="M4 5v10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5"/>',
    menu: '<path d="M3 5.5h14M3 10h14M3 14.5h14"/>', close: '<path d="M5 5l10 10M15 5 5 15"/>',
    info: '<circle cx="10" cy="10" r="7"/><path d="M10 9v4.5M10 6.5v.01"/>',
    table: '<rect x="3" y="4" width="14" height="12" rx="1.5"/><path d="M3 8h14M3 12h14M8 4v12"/>',
    chart: '<path d="M3 16.5h14M5.5 13.5V9M9.5 13.5V5.5M13.5 13.5v-6"/>',
    download: '<path d="M10 3v9.5M6 9l4 4 4-4M4 16.5h12"/>', expand: '<path d="M12 3.5h4.5V8M8 16.5H3.5V12M16.5 3.5 11 9M3.5 16.5 9 11"/>',
    left: '<path d="M12.5 4.5 7 10l5.5 5.5"/>', right: '<path d="M7.5 4.5 13 10l-5.5 5.5"/>', down: '<path d="M5 7.5 10 12.5 15 7.5"/>',
    search: '<circle cx="9" cy="9" r="5.5"/><path d="m13 13 4 4"/>', filter: '<path d="M3 4.5h14l-5.5 6.5v5l-3 1.5V11z"/>',
    theme: '<circle cx="10" cy="10" r="6.5"/><path d="M10 3.5a6.5 6.5 0 0 0 0 13z" class="fill"/>',
    globe: '<circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3c2 2 2.8 4.4 2.8 7s-.8 5-2.8 7c-2-2-2.8-4.4-2.8-7S8 5 10 3z"/>',
    check: '<path d="m4.5 10.5 3.5 3.5 7.5-8"/>', alert: '<path d="M10 3 2.5 16.5h15z"/><path d="M10 8v4M10 14.5v.01"/>',
    box: '<path d="M3 6.5 10 3l7 3.5v7L10 17l-7-3.5z"/>', tool: '<path d="M4 16 11 9M12.5 3.5a3.5 3.5 0 0 0 4 4l-2 2-4-4z"/>'
  };
  // CR-01: lock (department-locked filter) · proposal (Supply proposals menu)
  P.lock = '<rect x="4.5" y="9" width="11" height="8" rx="1.5"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>';
  P.proposal = '<path d="M4 3.5h12v10H9l-4 3v-3H4z"/><path d="M7 7.5h6M7 10.5h4"/>';
  U.icon = (name, cls) => `<svg class="${cls || 'i'}" viewBox="0 0 20 20" aria-hidden="true">${(P[name] || '').replace(/class="fill"/g, 'style="fill:currentColor;stroke:none"')}</svg>`;

  U.status = (key, tip) => `<span class="st ${key}" title="${U.esc(tip || '')}">${U.esc(t('st_' + key))}</span>`;
  U.badges = (r, S) => `<span class="badges">${U.status(r.status, t('st_' + r.status + '_tip', { d: r.status === 'reorder' ? S.reorderWindow : S.overstockDoc }))}${r.expiry ? U.status('expiry', t('st_expiry_tip', { d: S.expiryWindow })) : ''}</span>`;
  /** CR-01 (7.3 NOLEAK): a department-locked account never sees another department's channel or account as a destination. */
  U.lockCh = () => (global.Supply && global.Supply.ctx && global.Supply.ctx.lockCh) || null;
  U.maskTo = to => { const L = U.lockCh(); if (!L || !to) return to; const m = /^(MT|TT|ECOM)(\s*\(|$)/.exec(to); return (m && m[1] !== L) || U.foreignAcc(to) ? t('sup_other_ch') : to; };
  U.foreignAcc = name => { const L = U.lockCh(), DB = global.App && global.App.DB; if (!L || !DB) return false; const a = DB.accounts.find(x => x.name === name); return !!a && a.channel !== L; };
  U.actionText = a => {
    if (!a) return '—';
    if (a.key === 'act_order') return t('act_order', { qty: U.n(a.qty) });
    if (a.key === 'act_cn') return U.foreignAcc(a.from) ? t('act_other_dept') : t('act_cn', { from: a.from, to: U.maskTo(a.to) });   // CR-01: no other department named
    if (a.key === 'act_short_life' && U.lockCh()) return t('act_short_life_lock');       // CR-01: no other department named
    return t(a.key);
  };
  U.info = tip => `<span class="info" title="${U.esc(tip)}" tabindex="0" aria-label="${U.esc(tip)}">${U.icon('info')}</span>`;
  U.empty = (title, hint, icon) => `<div class="empty">${U.icon(icon || 'box', 'i')}<b>${U.esc(title)}</b>${hint ? U.esc(hint) : ''}</div>`;

  // ------------------------------------------------------------------ toast
  let toastT;
  U.toast = msg => {
    const el = document.getElementById('supToast'); if (!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600);
  };

  // ------------------------------------------------------------------ outside click / Esc registry (one open popover at a time)
  let openPop = null;
  function closePop() { if (openPop) { const p = openPop; openPop = null; p.close(); } }
  document.addEventListener('mousedown', e => { if (openPop && !openPop.root.contains(e.target)) closePop(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (openPop) { const f = openPop.focus; closePop(); if (f) f.focus(); return; }
    if (U.modal.isOpen()) { U.modal.close(); return; }
    if (U.drawer.isOpen()) U.drawer.close();
  });
  U.closePop = closePop;

  // ------------------------------------------------------------------ multi-select (button + checkbox list; search when > 7 options)
  /** U.multiSelect({ label, allLabel, options:[{value,label,sub}], value:[], onChange }) → { el, set(values), setOptions(opts) } */
  U.multiSelect = function (o) {
    const root = document.createElement('div'); root.className = 'msel';
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'msel-btn'; btn.setAttribute('aria-haspopup', 'listbox');
    root.appendChild(btn);
    let value = (o.value || []).slice(), options = o.options || [], pop = null, q = '';
    function label() {
      const n = value.length;
      btn.classList.toggle('set', n > 0);
      const txt = n === 0 ? o.allLabel : n === 1 ? (options.find(x => x.value === value[0]) || { label: value[0] }).label : t('n_selected', { n });
      btn.innerHTML = `<span>${U.esc(txt)}</span>${U.icon('down')}`;
      btn.title = o.label + ': ' + (n ? value.map(v => (options.find(x => x.value === v) || { label: v }).label).join(', ') : o.allLabel);
    }
    function list() {
      const ql = q.toLowerCase();
      const items = options.filter(x => !ql || x.label.toLowerCase().includes(ql) || String(x.value).toLowerCase().includes(ql));
      return items.length ? items.map(x => `<label><input type="checkbox" value="${U.esc(x.value)}" ${value.includes(x.value) ? 'checked' : ''}><span>${U.esc(x.label)}</span>${x.sub ? `<span class="sub">${U.esc(x.sub)}</span>` : ''}</label>`).join('')
        : `<div class="ms-empty">${t('no_match')}</div>`;
    }
    function open() {
      closePop();
      pop = document.createElement('div'); pop.className = 'msel-pop'; pop.setAttribute('role', 'listbox');
      pop.innerHTML = (options.length > 7 ? `<input class="ctl ms-search" type="search" placeholder="${t('search')}…">` : '') +
        `<div class="ms-list">${list()}</div><div class="ms-foot"><span class="small muted">${U.esc(o.allLabel)} = ${t('all')}</span><button type="button" class="btn ghost small" data-a="clear">${t('clear')}</button></div>`;
      root.appendChild(pop);
      const r = pop.getBoundingClientRect();
      if (r.right > window.innerWidth - 8 && window.innerWidth >= 768) pop.classList.add('right');
      const s = pop.querySelector('.ms-search');
      if (s) { s.addEventListener('input', () => { q = s.value; pop.querySelector('.ms-list').innerHTML = list(); }); s.focus(); }
      pop.addEventListener('change', e => {
        if (e.target.type !== 'checkbox') return;
        const v = e.target.value;
        value = e.target.checked ? [...value, v] : value.filter(x => x !== v);
        value = options.map(x => x.value).filter(x => value.includes(x));   // keep the options order
        if (value.length === options.length) { value = []; pop.querySelector('.ms-list').innerHTML = list(); }   // everything ticked = no filter
        label(); o.onChange(value.slice());
      });
      pop.addEventListener('click', e => {
        if (!e.target.closest('[data-a]')) return;
        value = []; pop.querySelector('.ms-list').innerHTML = list(); label(); o.onChange([]);   // nothing ticked = all
      });
      openPop = { root, focus: btn, close() { if (pop) { pop.remove(); pop = null; q = ''; } btn.setAttribute('aria-expanded', 'false'); } };
      btn.setAttribute('aria-expanded', 'true');
    }
    btn.addEventListener('click', () => { if (pop) closePop(); else open(); });
    label();
    return { el: root, set(v) { value = (v || []).slice(); label(); if (pop) pop.querySelector('.ms-list').innerHTML = list(); },
      setOptions(opts, all) { options = opts; if (all) o.allLabel = all; label(); }, setLabels(lbl, all) { o.label = lbl; o.allLabel = all; label(); } };
  };

  // ------------------------------------------------------------------ menu (download / theme)
  /** U.menu(anchorButton, [{label, on, onClick}], {up}) — opens under (or above) the button. */
  U.menu = function (btn, items, opt) {
    if (openPop && openPop.root === btn.parentElement) { closePop(); return; }
    closePop();
    const host = btn.parentElement; host.classList.add('rel');
    const pop = document.createElement('div'); pop.className = 'menu-pop' + (opt && opt.up ? ' up' : ''); pop.setAttribute('role', 'menu');
    items.forEach((it, k) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mi' + (it.on ? ' on' : ''); b.setAttribute('role', 'menuitem');
      b.innerHTML = (it.icon ? U.icon(it.icon) : '') + `<span>${U.esc(it.label)}</span>`;
      b.addEventListener('click', () => { closePop(); it.onClick(); });
      pop.appendChild(b); if (k === 0) setTimeout(() => b.focus(), 0);
    });
    host.appendChild(pop);
    openPop = { root: host, focus: btn, close() { pop.remove(); } };
  };

  // ------------------------------------------------------------------ drawer (right, 60 % · full screen on a phone)
  let drawerClose = null;
  U.drawer = {
    open(html, onClose) {
      const w = document.getElementById('supDrawer');
      w.querySelector('.drawer').innerHTML = html;
      w.classList.remove('hidden'); document.documentElement.classList.add('lock');
      drawerClose = onClose || null;
      const c = w.querySelector('[data-close]'); if (c) c.focus();
    },
    body() { return document.querySelector('#supDrawer .drawer'); },
    close() {
      const w = document.getElementById('supDrawer'); if (w.classList.contains('hidden')) return;
      w.classList.add('hidden'); document.documentElement.classList.remove('lock');
      const f = drawerClose; drawerClose = null; if (f) f();
    },
    isOpen() { return !document.getElementById('supDrawer').classList.contains('hidden'); }
  };
  U.modal = {
    open(html, onClose) {
      const w = document.getElementById('supModal');
      w.querySelector('.modal').innerHTML = html; w.classList.remove('hidden'); document.documentElement.classList.add('lock');
      U.modal._close = onClose;
    },
    close() {
      const w = document.getElementById('supModal'); if (w.classList.contains('hidden')) return;
      w.classList.add('hidden'); if (!U.drawer.isOpen()) document.documentElement.classList.remove('lock');
      if (U.modal._close) U.modal._close(); U.modal._close = null;
    },
    isOpen() { return !document.getElementById('supModal').classList.contains('hidden'); }
  };
  document.addEventListener('click', e => {
    if (e.target.closest('#supDrawer [data-close]') || e.target.matches('#supDrawer .drawer-overlay')) U.drawer.close();
    if (e.target.closest('#supModal [data-close]') || e.target.matches('#supModal .drawer-overlay')) U.modal.close();
  });

  // ------------------------------------------------------------------ Excel / file download
  U.xlsx = function (filename, sheets) {   // sheets: [{name, rows: [[...]]}]
    if (!global.XLSX) { U.toast('SheetJS not loaded'); return; }
    const wb = XLSX.utils.book_new();
    sheets.forEach(s => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.rows), s.name.slice(0, 31)));
    XLSX.writeFile(wb, filename);
  };
  U.downloadURL = (url, name) => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };

  U.debounce = (fn, ms) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; };
  U.isMobile = () => window.matchMedia('(max-width: 767px)').matches;

  // ------------------------------------------------------------------ data table (sort · pages · sticky header + first column · total row · card list on a phone)
  /** U.table(host, { key, cols:[{k,label,num,sticky,get,html,xl,sum,cls}], rows, card(r) → html, empty, pageSize, onRow(r), defaultSort:{key,dir}, total(label) })
      Sort and page are kept per `key` across re-renders. Returns { rows (sorted) }. */
  const TS = {};
  U.table = function (host, o) {
    const st = TS[o.key] || (TS[o.key] = { sort: o.defaultSort || null, page: 1 });
    const size = o.pageSize || 50;
    function sorted() {
      if (!st.sort) return o.rows.slice();
      const c = o.cols.find(x => x.k === st.sort.key); if (!c) return o.rows.slice();
      const d = st.sort.dir === 'desc' ? -1 : 1;
      return o.rows.slice().sort((a, b) => { const x = c.get(a), y = c.get(b);
        if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
        return (typeof x === 'string' ? x.localeCompare(y) : (x - y || 0)) * d; });
    }
    function draw() {
      const rows = sorted(), pages = Math.max(1, Math.ceil(rows.length / size));
      st.page = Math.min(Math.max(1, st.page), pages);
      const slice = rows.slice((st.page - 1) * size, st.page * size);
      let h;
      if (!rows.length) h = U.empty(o.empty || t('empty'), o.emptyHint || '', 'filter');
      else if (U.isMobile() && o.card) h = `<div class="clist">${slice.map((r, n) => o.cardDiv ? `<div class="ccard" data-row="${n}">${o.card(r)}</div>` : `<button type="button" class="ccard" data-row="${n}">${o.card(r)}</button>`).join('')}</div>`;
      else {
        const sumOf = c => rows.reduce((x, r) => x + (+c.get(r) || 0), 0);
        h = `<div class="tablewrap${o.free ? ' free' : ''}"><table class="tbl${o.compact ? ' compact' : ''}"><thead><tr>${o.cols.map(c => {
          const arr = st.sort && st.sort.key === c.k ? `<span class="arr">${st.sort.dir === 'asc' ? '▲' : '▼'}</span>` : '';
          return `<th data-sort="${c.k}" class="${c.nosort ? '' : 'sort'} ${c.num ? 'num' : ''} ${c.sticky ? 'sticky' : ''} ${c.hcls || ''}" scope="col">${U.esc(c.label)}${arr}</th>`; }).join('')}</tr></thead>
          <tbody>${slice.map((r, n) => `<tr class="${o.onRow ? 'click' : ''} ${o.rowCls ? o.rowCls(r) : ''}" ${o.onRow ? 'tabindex="0"' : ''} data-row="${n}">${o.cols.map(c =>
            `<td class="${c.num ? 'num' : ''} ${c.sticky ? 'sticky' : ''} ${c.cls ? c.cls(r) : ''}">${c.html ? c.html(r) : U.esc(c.get(r))}</td>`).join('')}</tr>`).join('')}</tbody>
          ${o.total ? `<tfoot><tr>${o.cols.map((c, k) => k === 0 ? `<td class="${c.sticky ? 'sticky' : ''}">${U.esc(o.total(rows))}</td>` : c.sum ? `<td class="num">${(c.fmt || U.n)(sumOf(c))}</td>` : '<td></td>').join('')}</tr></tfoot>` : ''}
          </table></div>`;
      }
      if (rows.length > size) h += `<div class="pager"><span>${t('rows_of', { a: U.n((st.page - 1) * size + 1), b: U.n(Math.min(rows.length, st.page * size)), n: U.n(rows.length) })}</span>
        <span class="pg"><button type="button" class="btn small" data-pg="-1" ${st.page <= 1 ? 'disabled' : ''}>${U.icon('left')}${t('page_prev')}</button><span class="tnum">${st.page} / ${pages}</span><button type="button" class="btn small" data-pg="1" ${st.page >= pages ? 'disabled' : ''}>${t('page_next')}${U.icon('right')}</button></span></div>`;
      host.innerHTML = h;
      host.querySelectorAll('th.sort').forEach(th => th.addEventListener('click', () => {
        const k = th.dataset.sort, s = st.sort, num = th.classList.contains('num');
        st.sort = !s || s.key !== k ? { key: k, dir: num ? 'desc' : 'asc' } : (s.dir === (num ? 'desc' : 'asc') ? { key: k, dir: num ? 'asc' : 'desc' } : (o.defaultSort || null));
        st.page = 1; draw();
      }));
      host.querySelectorAll('[data-pg]').forEach(b => b.addEventListener('click', () => { st.page += +b.dataset.pg; draw(); }));
      if (o.onRow) host.querySelectorAll('[data-row]').forEach(el => {
        const r = slice[+el.dataset.row];
        el.addEventListener('click', () => o.onRow(r));
        el.addEventListener('keydown', e => { if (e.key === 'Enter') o.onRow(r); });
      });
    }
    draw();
    return { rows: sorted(), reset() { st.page = 1; draw(); } };
  };
  /** Excel rows from table columns: header + one row per item (xl() if given, else get()). */
  U.xlRows = (cols, rows) => [cols.map(c => c.label), ...rows.map(r => cols.map(c => { const v = c.xl ? c.xl(r) : c.get(r); return typeof v === 'number' ? (isFinite(v) ? Math.round(v * 100) / 100 : '∞') : v; }))];
  U.seg = (id, opts, cur, cls) => `<div class="seg ${cls || 'sm'}" data-seg="${id}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${U.esc(l)}</button>`).join('')}</div>`;

  global.U = U;
})(window);
