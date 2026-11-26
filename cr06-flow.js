/* cr06-flow.js — CR-06 · N1 work stays on the page · N2 the order's next step in its row (+ ขอโควตาเพิ่ม inside the SO modal) ·
   N3 one order drawer from every page · N4 SKU 360 from every SKU code · N5 cross-page links carry their context + "← กลับ" ·
   N6 one customer drawer · M3 one inbox (หน้าหลัก · แผงงานที่ต้องตัดสินใจ · แท็บข้อเสนอ read the same list). */
Object.assign(dict.th, {
  cr6Close: 'ปิด', cr6Back: '← กลับ', cr6From: 'มาจาก', cr6ClearCtx: 'ล้างตัวกรองที่พามา', cr6FullPage: 'เปิดหน้ารายละเอียดเต็ม', cr6Customer: 'ลูกค้า', cr6BackCustomer: '← ลูกค้า',
  cr6TL_order: 'รับออเดอร์', cr6TL_pay: 'ชำระเงิน', cr6TL_so: 'คำขอ SO (คิว SLA)', cr6TL_docs: 'SO / IV', cr6TL_ship: 'จัดส่ง / ส่งมอบ', cr6TL_done: 'ส่งถึง', cr6TL_return: 'คืนสินค้า / CN',
  cr6None: 'ยังไม่มี', cr6Lines: 'รายการสินค้า', cr6SoQueue: 'ดูคิวคำขอ SO →', cr6SoSent: 'ส่งคำขอ SO แล้ว', cr6SendSo: 'ส่งคำขอ SO', cr6Ship: 'บันทึกผล / ส่งมอบ', cr6Return: 'ขอคืนสินค้า',
  cr6GoShip: 'ไปบันทึกที่ จัดส่งและส่งมอบ →', cr6Orders: 'ออเดอร์', cr6Spend: 'ยอดซื้อสุทธิ', cr6Aov: 'เฉลี่ยต่อออเดอร์', cr6Last: 'ออเดอร์ล่าสุด', cr6MainCh: 'ช่องทางหลัก', cr6Recent: 'ออเดอร์ล่าสุด',
  cr6AllOrders: 'ดูออเดอร์ทั้งหมดของลูกค้า →', cr6MoreQuota: 'ขอโควตาเพิ่ม', cr6QuotaFrom: 'ขอจาก', cr6Central: 'ส่วนกลาง', cr6Qty: 'จำนวน', cr6Reason: 'เหตุผล', cr6SendReq: 'ส่งคำขอโควตา',
  cr6ReqSent: 'ส่งคำขอโควตาแล้ว · รอผู้อนุมัติ', cr6Inbox: 'รออนุมัติ', cr6Approve: 'อนุมัติ', cr6Reject: 'ไม่อนุมัติ', cr6RejectWhy: 'เหตุผลที่ไม่อนุมัติ', cr6ViewIn: 'ดูในหน้า',
  cr6K_alloc: 'คำขอ Quota', cr6K_issue: 'คำขอเบิกออก', cr6K_move: 'คำขอย้ายสต็อก', cr6K_prop: 'ข้อเสนอ Supply', cr6Done: 'บันทึกแล้ว', cr6SkuLinks: 'ดูต่อในหน้า', cr6NoSku: 'ไม่พบ SKU นี้ในข้อมูล Supply'
});
Object.assign(dict.en, {
  cr6Close: 'Close', cr6Back: '← Back', cr6From: 'From', cr6ClearCtx: 'Clear the filter it brought', cr6FullPage: 'Open the full detail page', cr6Customer: 'Customer', cr6BackCustomer: '← Customer',
  cr6TL_order: 'Order received', cr6TL_pay: 'Payment', cr6TL_so: 'SO request (SLA queue)', cr6TL_docs: 'SO / IV', cr6TL_ship: 'Shipping / handover', cr6TL_done: 'Delivered', cr6TL_return: 'Return / CN',
  cr6None: 'None yet', cr6Lines: 'Items', cr6SoQueue: 'SO request queue →', cr6SoSent: 'SO request sent', cr6SendSo: 'Send SO request', cr6Ship: 'Record / hand over', cr6Return: 'Request a return',
  cr6GoShip: 'Record it in Fulfilment & handover →', cr6Orders: 'Orders', cr6Spend: 'Net spend', cr6Aov: 'Per order', cr6Last: 'Last order', cr6MainCh: 'Main channel', cr6Recent: 'Recent orders',
  cr6AllOrders: 'All orders of this customer →', cr6MoreQuota: 'Request more quota', cr6QuotaFrom: 'From', cr6Central: 'Central pool', cr6Qty: 'Quantity', cr6Reason: 'Reason', cr6SendReq: 'Send quota request',
  cr6ReqSent: 'Quota request sent · waiting for approval', cr6Inbox: 'Waiting for approval', cr6Approve: 'Approve', cr6Reject: 'Reject', cr6RejectWhy: 'Reason for rejecting', cr6ViewIn: 'See it in',
  cr6K_alloc: 'Quota request', cr6K_issue: 'Stock issue request', cr6K_move: 'Stock move request', cr6K_prop: 'Supply proposal', cr6Done: 'Saved', cr6SkuLinks: 'Continue in', cr6NoSku: 'This SKU is not in the Supply data'
});

/* ---------------------------------------------------------------- the Ops drawer (720 px · full screen on a phone · D4) */
let cr6DwStack = [];
function cr6Dw() {
  let w = document.getElementById('cr6Drawer');
  if (!w) {
    document.body.insertAdjacentHTML('beforeend', `<div id="cr6Drawer" class="cr6-dw" hidden><div class="cr6-dw-shade" data-cr6-dw-close="1"></div><aside class="cr6-dw-panel" role="dialog" aria-modal="true" aria-labelledby="cr6DwTitle"><div class="cr6-dw-head"><button type="button" class="quiet cr6-dw-back" data-cr6-dw-back="1" hidden></button><h2 id="cr6DwTitle"></h2><button type="button" class="c5-x" data-cr6-dw-close="1" aria-label="${t('cr6Close')}">×</button></div><div class="cr6-dw-body"></div></aside></div>`);
    w = document.getElementById('cr6Drawer');
  }
  return w;
}
function cr6DwOpen(o) {   // o: { key, title, html, back:{label, open} }
  const w = cr6Dw(); w.dataset.key = o.key || ''; w.querySelector('#cr6DwTitle').innerHTML = o.title;
  const body = w.querySelector('.cr6-dw-body'); body.innerHTML = o.html; body.scrollTop = 0;
  const bk = w.querySelector('[data-cr6-dw-back]'); bk.hidden = !o.back; if (o.back) { bk.textContent = o.back.label; bk.onclick = o.back.open; }
  w.hidden = false; document.documentElement.classList.add('cr6-lock'); cr6Decorate(body);
  if (typeof c5TextSweep === 'function') c5TextSweep(body);
}
function cr6DwClose() { const w = document.getElementById('cr6Drawer'); if (!w || w.hidden) return; w.hidden = true; document.documentElement.classList.remove('cr6-lock'); if (/^#o\//.test(location.hash)) history.replaceState(null, '', location.pathname + '#' + (view || 'orders')); }
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-cr6-dw-close]')) cr6DwClose(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !(document.querySelector('#modal') || {}).open) cr6DwClose(); });

/* who may ask for a return — the rule of the order page's return panel (invoiced · shipped / delivered · order, ship or pay rights) */
function cr6CanReturn(o) { const d = typeof orderDoc === 'function' ? orderDoc(o) : null; return typeof opsReturnForm === 'function' && workCanVisit('returns') && !!(d && d.invoice) && ['shipped', 'delivered'].includes(o.ship) && ((typeof canOrder === 'function' && canOrder()) || (typeof canShip === 'function' && canShip()) || (typeof canPay === 'function' && canPay())); }
/* ---------------------------------------------------------------- N3 · one order drawer (timeline: order → pay → SO request → SO / IV → ship → delivered → return / CN) */
function cr6Step(state, title, body) { return `<li class="cr6-tl ${state}"><b>${title}</b><div>${body}</div></li>`; }
function cr6OrderHTML(o, back) {
  const stage = typeof cr4OrderStage === 'function' ? cr4OrderStage(o) : '', order = ['confirm', 'pay', 'docs', 'pick', 'transit', 'done', 'closed'], at = order.indexOf(stage);
  const st = k => { const i = order.indexOf(k); return i < at ? 'done' : i === at ? 'now' : 'next'; };
  const lines = typeof getOrderLines === 'function' ? getOrderLines(o) : (o.lines || []), tot = typeof orderTotals === 'function' ? orderTotals(o) : { total: 0 };
  const doc = typeof orderDoc === 'function' ? orderDoc(o) : null, soR = (db.soRequests || []).filter(r => r.orderId === o.id).sort((a, b) => (b.time || 0) - (a.time || 0))[0];
  const rets = (db.returns || []).filter(r => r.orderId === o.id), p = masterPartner(o.partner) || { name: o.partner || '—' };
  const lab = k => (t(k) === k ? k : t(k)), when = x => x ? fmtDateTime(x) : '';
  const tl = [
    cr6Step('done', t('cr6TL_order'), `${esc(fmtDateTime(o.time))} · ${esc(lab(o.channel))}`),
    cr6Step(o.pay === 'confirmed' || o.pay === 'paid' || o.payment === 'cod' ? 'done' : st('pay'), t('cr6TL_pay'), `${esc(o.payment === 'cod' ? 'COD' : lab(o.payment || ''))} · ${esc(lab(o.pay || ''))}`),
    cr6Step(soR ? (doc ? 'done' : 'now') : (stage === 'docs' ? 'now' : (at > order.indexOf('docs') ? 'done' : 'next')), t('cr6TL_so'), soR ? `<span data-cr6-so-state>${esc(soR.id || '')} · ${esc(lab(soR.status || ''))}${soR.slaDue || soR.dueAt ? ' · SLA ' + esc(when(soR.slaDue || soR.dueAt)) : ''}</span>` : esc(t('cr6None'))),
    cr6Step(doc ? 'done' : st('docs'), t('cr6TL_docs'), doc ? `<span data-cr6-doc>SO ${esc(doc.so || '—')} · IV ${esc(doc.invoice || '—')}</span>` : esc(t('cr6None'))),
    cr6Step(['transit', 'done', 'closed'].includes(stage) ? 'done' : st('pick'), t('cr6TL_ship'), `${esc(lab(o.ship || ''))}${o.carrier ? ' · ' + esc(o.carrier) : ''}${o.tracking ? ' · ' + esc(o.tracking) : ''}`),
    cr6Step(['done', 'closed'].includes(stage) ? 'done' : 'next', t('cr6TL_done'), o.deliveredAt ? esc(when(o.deliveredAt)) : esc(lab(o.ship || ''))),
    cr6Step(rets.length ? 'done' : 'next', t('cr6TL_return'), rets.length ? rets.map(r => `<span data-cr6-ret>${esc(r.id)} · ${esc(lab(r.status || ''))}${r.cn || r.creditNo ? ' · CN ' + esc(r.cn || r.creditNo) : ''}</span>`).join('<br>') : esc(t('cr6None')))
  ].join('');
  const can = v => workCanVisit(v), acts = [];
  if (stage === 'docs' && !soR && can('soRequests') && typeof soRequestForm === 'function' && p && ['MT', 'TT'].includes((db.partners.find(x => x.id === o.partner) || {}).type)) acts.push(`<button type="button" class="primary" data-cr6-so="${esc(o.id)}">${t('cr6SendSo')}</button>`);
  if (soR && can('soRequests')) acts.push(`<button type="button" data-cr6-go="soRequests" data-cr6-ctx-order="${esc(o.id)}">${t('cr6SoQueue')}</button>`);
  if (stage === 'pick' && can('workQueue')) acts.push(`<button type="button" data-cr6-go="workQueue" data-cr6-ctx-order="${esc(o.id)}">${t('cr6GoShip')}</button>`);
  if (cr6CanReturn(o)) acts.push(`<button type="button" data-cr6-ret="${esc(o.id)}">${t('cr6Return')}</button>`);
  acts.push(`<button type="button" class="quiet" data-cr6-full="${esc(o.id)}">${t('cr6FullPage')}</button>`);
  return `<div class="cr6-ohead"><div><button type="button" class="text-link cr6-cust" data-cr6-cust="${esc(o.customer + '|' + (o.phone || ''))}">${esc(o.customer)}</button><small>${esc(o.phone || '')} · ${esc(p.name)}</small></div><div class="cr6-ototal"><b>฿${n(Math.round((tot.total || 0) * 100) / 100)}</b>${typeof cr4StateBadges === 'function' ? `<div>${cr4StateBadges(o)}</div>` : ''}</div></div>
    <ol class="cr6-tls">${tl}</ol>
    <h3>${t('cr6Lines')}</h3><div class="tablewrap"><table class="cr6-lines"><thead><tr><th>SKU</th><th class="num">${t('cr6Qty')}</th></tr></thead><tbody>${lines.map(l => `<tr><td><b>${esc(l.sku)}</b><small>${esc((masterSku(l.sku) || {}).name || '')}</small></td><td class="num">${n(l.qty)}</td></tr>`).join('')}</tbody></table></div>
    <div class="cr6-acts">${acts.join('')}</div>`;
}
function cr6OrderDrawer(id, opts) {
  const o = db.orders.find(x => x.id === id);
  if (!o || (typeof canAccessOrder === 'function' && !canAccessOrder(o))) { toast(t('noAccessOrder')); return; }
  if ((document.querySelector('#modal') || {}).open) document.querySelector('#modal').close();
  cr6DwOpen({ key: 'order:' + id, title: `${t('cr6Orders')} <span class="cr6-oid-t">${esc(id)}</span>`, html: cr6OrderHTML(o), back: opts && opts.back });
  if (!opts || !opts.noHash) history.replaceState(null, '', location.pathname + '#o/' + encodeURIComponent(id));
}
/* the drawer has its own URL (#o/<order>) — opened from a link or a pasted URL */
function cr6HashOrder() { const m = /^#o\/(.+)$/.exec(location.hash); if (m && session) { const id = decodeURIComponent(m[1]); if (!db.orders.some(o => o.id === id)) return; if (!['orders', 'payments', 'shipping'].includes(view) && workCanVisit('orders')) { view = 'orders'; selectedOrderId = null; render(); } cr6OrderDrawer(id, { noHash: true }); } }
window.addEventListener('hashchange', cr6HashOrder);

/* ---------------------------------------------------------------- N6 · one customer drawer */
function cr6CustomerDrawer(key, back) {
  const [name, phone] = key.split('|'), os = (typeof scopedOrders === 'function' ? scopedOrders() : db.orders).filter(o => o.customer === name && (!phone || (o.phone || '') === phone)).sort((a, b) => b.time - a.time);
  const live = os.filter(o => o.status !== 'cancelled'), cn = o => (db.returns || []).filter(r => r.orderId === o.id && r.status === 'credited').reduce((s, r) => s + (r.creditAmount || 0), 0);
  const spend = live.reduce((s, o) => s + (typeof orderTotals === 'function' ? orderTotals(o).total : 0) - cn(o), 0), ch = {};
  os.forEach(o => { ch[o.channel] = (ch[o.channel] || 0) + 1; }); const main = Object.entries(ch).sort((a, b) => b[1] - a[1])[0];
  const card = (l, v) => `<div class="kpi"><small>${l}</small><strong>${v}</strong></div>`;
  const html = `<div class="kpis cr6-ckpis">${card(t('cr6Orders'), n(os.length))}${card(t('cr6Spend'), '฿' + n(Math.round(spend * 100) / 100))}${card(t('cr6Aov'), '฿' + n(live.length ? Math.round(spend / live.length * 100) / 100 : 0))}${card(t('cr6Last'), os[0] ? esc(fmtDate(os[0].time)) : '—')}${card(t('cr6MainCh'), main ? esc(t(main[0]) === main[0] ? main[0] : t(main[0])) : '—')}</div>
    <p class="small">${esc(phone || '')}</p><h3>${t('cr6Recent')}</h3><div class="tablewrap"><table><thead><tr><th>${t('orderNo')}</th><th>${t('date')}</th><th class="num">฿</th><th>${t('status')}</th></tr></thead><tbody>${os.slice(0, 10).map(o => `<tr><td><button type="button" class="text-link" data-cr6-corder="${esc(o.id)}" data-cr6-ckey="${esc(key)}">${esc(o.id)}</button></td><td>${esc(fmtDate(o.time))}</td><td class="num">${n(Math.round((typeof orderTotals === 'function' ? orderTotals(o).total : 0) * 100) / 100)}</td><td>${typeof cr4StateBadges === 'function' ? cr4StateBadges(o) : esc(t(o.status))}</td></tr>`).join('')}</tbody></table></div>
    ${workCanVisit('orders') ? `<div class="cr6-acts"><button type="button" data-cr6-allorders="${esc(name)}">${t('cr6AllOrders')}</button></div>` : ''}`;
  cr6DwOpen({ key: 'cust:' + key, title: `${t('cr6Customer')} · ${esc(name)}`, html, back });
}

/* ---------------------------------------------------------------- N4 · SKU 360 from any SKU code (the CR-04 R7 drawer, on the page you are on)
   Only for roles that already open SKU 360 (ภาพรวม Supply / สต็อกและคาดการณ์) — access does not change. The department lock applies. */
function cr6Can360() { return workCanVisit('supOverview') || workCanVisit('supStock'); }
async function cr6Sku360(sku) {
  if (!window.Supply || !cr6Can360()) return;
  await Supply.ensureData(); const App = Supply.App;
  if (!App.DB.skuIdx.has(sku)) { toast(t('cr6NoSku')); return; }
  if (!App.F) { const lock = supLockChannel(); Supply.ctx.lockCh = lock; App.F = { asDn: Supply.defaultAsOf(), view: 'W', ch: lock ? [lock] : [], acc: [], brand: [], cat: [], q: '', rr: App.S.rrBasis || 'L4W', h: 3, rm: App.S.rrMode || 'sellout' }; }
  const keep = { q: App.F.q, brand: App.F.brand, cat: App.F.cat };
  App.F.q = ''; App.F.brand = []; App.F.cat = []; App._modelKey = null;
  try { App.openSku(sku); } finally { Object.assign(App.F, keep); App._modelKey = null; }
  const dr = document.querySelector('#supDrawer .drawer');
  if (dr && !dr.querySelector('.cr6-skulinks')) {
    const go = [['supStock', 'q'], ['allocation', 'sku'], ['supReplen', 'q'], ['supQuota', 'q'], ['catalog', 'sku']].filter(([v]) => workCanVisit(v));
    (dr.querySelector('.dr-body') || dr).insertAdjacentHTML('beforeend', `<div class="cr6-skulinks"><span>${t('cr6SkuLinks')}</span>${go.map(([v]) => `<button type="button" class="text-link" data-cr6-skugo="${v}" data-sku="${esc(sku)}">${esc(t(v))} →</button>`).join('')}</div>`);
  }
}

/* ---------------------------------------------------------------- order / customer / SKU codes become links (every table · drawer · modal) */
let cr6OrderIds = null, cr6OrderKey = '';
function cr6OrderSet() { const k = db.orders.length + ':' + (db.orders[0] || {}).id; if (k !== cr6OrderKey) { cr6OrderKey = k; cr6OrderIds = new Set(db.orders.map(o => o.id)); } return cr6OrderIds; }
let cr6SkuSet = null, cr6SkuKey = '';
function cr6Skus() { const S = cr6SupDB(), k = ((db.productMaster || []).length) + ':' + (S ? S.skus.length : 0); if (k !== cr6SkuKey) { cr6SkuKey = k; cr6SkuSet = new Set((db.productMaster || []).map(p => p.sku)); if (S) S.skus.forEach(s => cr6SkuSet.add(s.sku)); } return cr6SkuSet; }
function cr6Decorate(root) {
  if (!root || !session) return;
  const orders = cr6OrderSet(), skus = cr6Can360() ? cr6Skus() : null;
  root.querySelectorAll('td, .ccard, .cr6-lines td, .hm-witem small').forEach(cell => {
    if (cell.closest('select, option, button, a, label, .cr6-dw-head, .ta-box')) return;
    const w = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT), hits = [];
    while (w.nextNode()) { const tn = w.currentNode, v = tn.nodeValue.trim(); if (!v || v.length > 80) continue; if (tn.parentElement.closest('button, a, select, label, input, textarea')) continue; if (orders.has(v)) hits.push([tn, 'order', v]); else if (skus && skus.has(v)) hits.push([tn, 'sku', v]); else if (skus) { const m = /^([A-Z]{2}-[A-Z]{2}-\d{3}) · /.exec(v); if (m && skus.has(m[1])) { const rest = tn.splitText(tn.nodeValue.indexOf(m[1]) + m[1].length); hits.push([tn, 'sku', m[1]]); } } }   // "SKU · …" sub-lines (phone cards) link the code
    hits.forEach(([tn, kind, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'text-link ' + (kind === 'order' ? 'cr6-oid' : 'cr6-sku'); if (kind === 'order') b.dataset.cr6Order = v; else b.dataset.sku360 = v; b.textContent = tn.nodeValue; tn.replaceWith(b); });
  });
  // the customer of an order row (orders / payments / shipping) opens the customer drawer
  if (['orders', 'payments', 'shipping'].includes(view)) root.querySelectorAll('tr').forEach(tr => { const id = tr.querySelector('[data-order]')?.dataset.order; if (!id) return; const o = db.orders.find(x => x.id === id); const b = o && [...tr.querySelectorAll('td b')].find(x => x.textContent.trim() === o.customer && !x.closest('button')); if (b) b.outerHTML = `<button type="button" class="text-link cr6-cust" data-cr6-cust="${esc(o.customer + '|' + (o.phone || ''))}"><b>${esc(o.customer)}</b></button>`; });
  if (view === 'customers') root.querySelectorAll('.cu-table tbody tr').forEach(tr => { const b = tr.querySelector('td b'), ph = tr.querySelector('td small'); if (b && !b.closest('button')) b.outerHTML = `<button type="button" class="text-link cr6-cust" data-cr6-cust="${esc(b.textContent.trim() + '|' + (ph ? ph.textContent.trim() : ''))}"><b>${esc(b.textContent.trim())}</b></button>`; });
}
let cr6DecoQ = 0;
new MutationObserver(() => { if (cr6DecoQ) return; cr6DecoQ = setTimeout(() => { cr6DecoQ = 0; ['#page', '#main', '#modal[open]', '#supDrawer .drawer', '#cr6Drawer .cr6-dw-body'].forEach(s => { const r = document.querySelector(s); if (r) cr6Decorate(r); }); }, 30); }).observe(document.body, { childList: true, subtree: true });   // a timer, not a frame: a background tab never paints

/* clicks: order ids (old buttons included) → order drawer · customers → customer drawer · SKUs → SKU 360 */
document.addEventListener('click', e => {
  const el = e.target.closest && e.target.closest('[data-cr6-order], .order-id-link[data-order], #page [data-order], [data-open-order], [data-hm-order], [data-cr6-cust], [data-sku360], [data-cr6-corder], [data-cr6-so], [data-cr6-full], [data-cr6-ret], [data-cr6-allorders], [data-cr6-skugo], [data-go-sku]');
  if (!el || !session) return;
  const stop = () => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); };
  if (el.dataset.sku360 != null) { stop(); cr6Sku360(el.dataset.sku360); return; }
  if (el.dataset.goSku != null) { if (!cr6Can360()) return; stop(); cr6Sku360(el.dataset.goSku); return; }   // N4: Supply's own SKU links open SKU 360 in place too
  if (el.dataset.cr6Skugo) { stop(); const v = el.dataset.cr6Skugo, sku = el.dataset.sku; if (window.U && U.drawer) U.drawer.close(); cr6Go(v, { from: view, sku }); return; }
  if (el.dataset.cr6Cust) { stop(); const back = document.getElementById('cr6Drawer') && !document.getElementById('cr6Drawer').hidden && /^order:/.test(document.getElementById('cr6Drawer').dataset.key) ? null : null; cr6CustomerDrawer(el.dataset.cr6Cust, back); return; }
  if (el.dataset.cr6Corder) { stop(); const key = el.dataset.cr6Ckey; cr6OrderDrawer(el.dataset.cr6Corder, { back: { label: t('cr6BackCustomer'), open: () => cr6CustomerDrawer(key) } }); return; }
  if (el.dataset.cr6So) { stop(); cr6DwClose(); soRequestForm(el.dataset.cr6So); return; }
  if (el.dataset.cr6Full) { stop(); cr6DwClose(); openOrderWorkspace(el.dataset.cr6Full); return; }
  if (el.dataset.cr6Ret) { stop(); cr6DwClose(); opsReturnForm(el.dataset.cr6Ret); return; }
  if (el.dataset.cr6Allorders) { stop(); cr6DwClose(); cr6Go('orders', { from: view, q: el.dataset.cr6Allorders }); return; }
  if (el.closest('[data-cr6-stage]')) return;   // the N2 row buttons have their own handler
  const id = el.dataset.cr6Order || el.dataset.order || el.dataset.openOrder || el.dataset.hmOrder;
  if (id && db.orders.some(o => o.id === id)) { stop(); cr6OrderDrawer(id); }
}, true);

/* ---------------------------------------------------------------- N1 · the SO request stays on the page it was sent from */
function cr6Toast(msg, go, label) {
  toast(msg); const el = document.getElementById('toast'); if (!el || !go || !workCanVisit(go)) return;
  el.insertAdjacentHTML('beforeend', ` <button type="button" class="text-link cr6-toastgo" data-cr6-go="${go}">${esc(label)}</button>`);
}
if (typeof soRequestForm === 'function') {
  const cr6SoFormBefore = soRequestForm;
  soRequestForm = function (id) {
    const from = view, r = cr6SoFormBefore.apply(this, arguments), f = document.getElementById('soRequestForm');
    if (f) {
      f.onsubmit = e => { e.preventDefault(); const res = soSubmit(soModalDraft); if (!res.ok) { document.getElementById('soError').textContent = t(res.error); return; } document.getElementById('modal').close(); if (view !== from) view = from; render(); cr6Toast(t('cr6SoSent'), 'soRequests', t('cr6SoQueue')); };
      cr6QuotaInline();
    }
    return r;
  };
}
/* N2 · in the SO modal: a line short of quota offers "ขอโควตาเพิ่ม" — a quota (stock move) request sent from the same modal */
function cr6QuotaInline() {
  const m = document.getElementById('modal'), draft = typeof soModalDraft !== 'undefined' ? soModalDraft : null; if (!m || !draft || typeof requestStockMove !== 'function' || typeof canRequestStock !== 'function' || !canRequestStock()) return;
  const o = db.orders.find(x => x.id === (draft.orderId || draft.order || (draft.o && draft.o.id))); const rows = (draft.check && draft.check.rows) || draft.rows || [];
  const short = rows.filter(x => x && x.pass === false && (x.short || 0) > 0); if (!o || !short.length || m.querySelector('[data-cr6-moreq]')) return;
  const foot = m.querySelector('.c5-mfoot') || m.querySelector('.dialogactions'); if (!foot) return;
  foot.insertAdjacentHTML('afterbegin', `<button type="button" data-cr6-moreq="1">${t('cr6MoreQuota')}</button>`);
  const body = m.querySelector('.c5-mbody') || m.querySelector('form');
  const chans = typeof stockChannels === 'function' ? stockChannels() : [];
  foot.insertAdjacentHTML('beforebegin', `<div class="cr6-moreq" hidden><h3>${t('cr6MoreQuota')}</h3>${short.map(x => `<div class="cr6-moreq-row" data-sku="${esc(x.sku)}"><b>${esc(x.sku)}</b><label>${t('cr6Qty')}<input type="number" min="1" value="${Math.ceil(x.short)}" data-cr6-mq="qty"></label></div>`).join('')}<label>${t('cr6Reason')}<input data-cr6-mq="reason" maxlength="160" value="SO ${esc(o.id)}"></label><div class="cr6-acts"><button type="button" class="primary" data-cr6-mqsend="1">${t('cr6SendReq')}</button></div><p class="err" data-cr6-mqerr></p></div>`);
  m.querySelector('[data-cr6-moreq]').onclick = () => { const b = m.querySelector('.cr6-moreq'); b.hidden = !b.hidden; if (!b.hidden) b.scrollIntoView({ block: 'nearest' }); };
  m.querySelector('[data-cr6-mqsend]').onclick = () => {
    const reason = m.querySelector('[data-cr6-mq="reason"]').value.trim(), err = m.querySelector('[data-cr6-mqerr]'); let sent = 0, last = null;
    m.querySelectorAll('.cr6-moreq-row').forEach(rw => { const qty = +rw.querySelector('[data-cr6-mq="qty"]').value; const res = requestStockMove({ sku: rw.dataset.sku, from: typeof CENTRAL_STOCK !== 'undefined' ? CENTRAL_STOCK : '__central__', to: o.partner, qty, reason }); last = res; if (res && res.ok) sent++; });
    if (!sent) { err.textContent = t((last && last.error) || 'stockDenied'); return; }
    if (typeof persist === 'function') persist(); m.querySelector('.cr6-moreq').innerHTML = `<p class="cr6-ok">✓ ${t('cr6ReqSent')}</p>`; toast(t('cr6ReqSent'));
  };
}

/* N2 · the order's next step in its row (orders page): รอ SO/IV → ส่งคำขอ SO · รอจัดส่ง → บันทึกผล / ส่งมอบ · ส่งสำเร็จ → ขอคืนสินค้า */
function cr6RowSteps() {
  if (!['orders', 'payments', 'shipping'].includes(view)) return;
  document.querySelectorAll('#page tr').forEach(tr => {
    const id = tr.querySelector('[data-order]')?.dataset.order; if (!id || tr.querySelector('[data-cr6-stage]')) return;
    const o = db.orders.find(x => x.id === id); if (!o) return; const stage = cr4OrderStage(o), pt = (db.partners.find(x => x.id === o.partner) || {}).type;
    let btn = '';
    if (stage === 'docs' && ['MT', 'TT'].includes(pt) && workCanVisit('soRequests') && typeof soCanVisit === 'function' && soCanVisit() && ['director', 'admin', 'manager', 'salesAdmin'].includes(session.role) && !(db.soRequests || []).some(r => r.orderId === o.id && !['rejected', 'cancelled'].includes(r.status))) btn = `<button type="button" class="cr4-next" data-cr6-stage="so" data-id="${esc(id)}">${t('cr6SendSo')}</button>`;
    else if (stage === 'pick' && workCanVisit('workQueue')) btn = `<button type="button" class="cr4-next" data-cr6-stage="ship" data-id="${esc(id)}">${t('cr6Ship')}</button>`;
    else if (cr6CanReturn(o)) btn = `<button type="button" class="cr4-next" data-cr6-stage="return" data-id="${esc(id)}">${t('cr6Return')}</button>`;
    if (!btn) return;
    const cell = tr.querySelector('.cr4-next, .c5-wait')?.closest('td') || tr.cells[tr.cells.length - 2] || tr.lastElementChild;
    cell.insertAdjacentHTML('beforeend', btn);
  });
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-cr6-stage]'); if (!b) return; e.preventDefault(); e.stopPropagation();
  const id = b.dataset.id, s = b.dataset.cr6Stage;
  if (s === 'so') soRequestForm(id); else if (s === 'ship') cr6OrderDrawer(id); else if (s === 'return') opsReturnForm(id);
}, true);

/* ---------------------------------------------------------------- M3 · one inbox (the home list rules) — home · แผงงานที่ต้องตัดสินใจ · แท็บข้อเสนอ */
function cr6Inbox() {
  const me = typeof stockActorId === 'function' ? stockActorId() : '', out = [];
  if (typeof canApprove === 'function' && canApprove()) db.allocations.filter(a => a.status === 'submitted' && visiblePartner(partner(a.partner)) && a.requesterId !== me).forEach(a => out.push({ kind: 'alloc', id: a.id, page: 'allocation', sub: `${(masterPartner(a.partner) || { name: a.partner }).name} · ${a.sku} · ${n(a.qty)}` }));
  if (typeof props === 'function' && typeof propCanApprove === 'function') props().filter(propCanApprove).forEach(p => out.push({ kind: 'prop', id: p.id, page: 'supSop', sub: `${t(PROP[p.type].label)} · ${p.sku} · ${n(p.qty)}` }));
  if (typeof issueCanApprove === 'function' && issueCanApprove()) (db.stockIssues || []).filter(i => i.status === 'submitted' && i.requestedById !== me).forEach(i => out.push({ kind: 'issue', id: i.id, page: 'stockoverview', sub: `${i.sku} · ${n(i.qty)}` }));
  (db.stockRequests || []).filter(x => x.status === 'requested' && typeof ownsStockChannel === 'function' && ownsStockChannel(x.from) && x.requesterId !== me).forEach(x => out.push({ kind: 'move', id: x.id, page: 'allocation', sub: `${x.sku} · ${n(x.qty)}` }));
  return out;
}
cr6PropsWaiting = function () { return cr6Inbox().filter(x => x.kind === 'prop'); };
function cr6InboxDecide(item, ok, reason) {
  let r = { ok: true };
  if (item.kind === 'alloc') { if (typeof changeAllocation === 'function') changeAllocation(item.id, ok ? 'approved' : 'rejected'); }
  else if (item.kind === 'issue') r = ok ? issueApprove(item.id) : issueReject(item.id, reason);
  else if (item.kind === 'move') r = ok ? sendStockRequest(item.id) : rejectStockRequest(item.id);
  else if (item.kind === 'prop') r = supPropAct(item.id, ok ? 'approve' : 'reject', reason);
  if (typeof persist === 'function') persist(); return r || { ok: true };
}
function cr6InboxDrawer(item) {
  cr6DwOpen({ key: 'inbox:' + item.id, title: `${t('cr6K_' + item.kind)} · ${esc(item.id)}`, html: `<p>${esc(item.sub)}</p><label class="cr6-why">${t('cr6RejectWhy')}<input data-cr6-why maxlength="160"></label><div class="cr6-acts"><button type="button" class="primary" data-cr6-dec="1">${t('cr6Approve')}</button><button type="button" data-cr6-dec="0">${t('cr6Reject')}</button>${workCanVisit(item.page) ? `<button type="button" class="quiet" data-cr6-go="${item.page}">${t('cr6ViewIn')} ${esc(t(item.page))} →</button>` : ''}</div><p class="err" data-cr6-decerr></p>` });
  const body = document.querySelector('#cr6Drawer .cr6-dw-body');
  body.querySelectorAll('[data-cr6-dec]').forEach(b => b.onclick = () => {
    const ok = b.dataset.cr6Dec === '1', why = body.querySelector('[data-cr6-why]').value.trim();
    if (!ok && !why && ['issue', 'prop'].includes(item.kind)) { body.querySelector('[data-cr6-decerr]').textContent = t('cr6RejectWhy'); return; }
    const r = cr6InboxDecide(item, ok, why); if (r && r.ok === false) { body.querySelector('[data-cr6-decerr]').textContent = t(r.error || 'stockDenied'); return; }
    cr6DwClose(); render(); toast(t('cr6Done'));
  });
}
function cr6InboxMarks() {
  if (!session) return; const box = cr6Inbox();
  if (view === 'overview') {
    const head = document.querySelector('#page .hm-work .hm-whead, #page .hm-work h2, #page .hm-work');
    if (head && !document.querySelector('[data-cr6-inboxn]')) head.insertAdjacentHTML(head.matches('.hm-work') ? 'afterbegin' : 'beforeend', ` <span class="pill warn cr6-inboxn" data-cr6-inboxn="${box.length}">${t('cr6Inbox')} ${n(box.length)}</span>`);
    document.querySelectorAll('#page .hm-witem[data-hm-src="approve"]').forEach(w => { const it = box.find(x => w.textContent.includes(x.id)); if (it) { w.dataset.cr6Inbox = it.id; } });
  }
  if (view === 'allocation' || view === 'stockoverview') {
    const mine = box.filter(x => x.page === 'allocation' || x.page === 'stockoverview'), panel = document.querySelector('#page .c5-decide') || [...document.querySelectorAll('#page .panel, #page details')].find(p => /งานที่ต้องตัดสินใจ|Decisions/.test((p.querySelector('h2, h3, summary') || {}).textContent || ''));
    if (panel && !panel.querySelector('.cr6-inbox')) {
      const list = `<div class="cr6-inbox" data-cr6-inbox-n="${mine.length}">${mine.length ? mine.map(x => `<button type="button" class="cr6-inbox-it" data-cr6-inbox="${esc(x.id)}"><b>${t('cr6K_' + x.kind)} · ${esc(x.id)}</b><small>${esc(x.sub)}</small></button>`).join('') : ''}</div>`;
      const sum = panel.querySelector('summary') || panel.querySelector('.panelhead');
      if (sum) { const c = sum.querySelector('.pill, b, .cr6-count'); if (c && /^\(?\d+\)?$/.test(c.textContent.trim())) c.textContent = n(mine.length); }
      (panel.querySelector('.panelbody') || panel).insertAdjacentHTML('afterbegin', list);
    }
  }
}
document.addEventListener('click', e => {
  const w = e.target.closest && e.target.closest('[data-cr6-inbox]'); if (!w || !session) return;
  const it = cr6Inbox().find(x => x.id === w.dataset.cr6Inbox); if (!it) return;
  if (it.kind === 'prop') return;   // proposals keep their own decision modal (data-prop-open) — same audit as before
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); cr6InboxDrawer(it);
}, true);

/* ---------------------------------------------------------------- N5 · cross-page links carry context; the target shows "มาจาก …  ✕" and "← กลับ" */
let cr6Ctx = null, cr6Going = false;
function cr6Snap() {
  const ofbId = typeof ofbPageOf === 'function' ? ofbPageOf(view) : null;
  return { view, hash: location.hash, scroll: window.scrollY, label: t(cr6MenuView(view)) + (selectedOrderId ? ' · ' + selectedOrderId : ''), tabs: { sopTab: typeof sopTab !== 'undefined' ? sopTab : null, cr6StockTab, cr6CatTab, cr6PartnerTab, stockGroupFilter: typeof stockGroupFilter !== 'undefined' ? stockGroupFilter : null, cr6EcomStore, orderTab: typeof orderTab !== 'undefined' ? orderTab : null }, ofb: ofbId ? { id: ofbId, st: JSON.stringify(ofbState(ofbId)) } : null };
}
function cr6Go(v, ctx) {
  ctx = ctx || {}; const snap = cr6Snap();
  if (ctx.ecomStore != null) { stockGroupFilter = 'EC'; cr6EcomStore = ctx.ecomStore === '*' ? '' : ctx.ecomStore; }
  if (ctx.store) cr6PartnerTab = 'stores';
  cr6Going = true; let ok; try { ok = navigate(v); } finally { cr6Going = false; }
  if (ok === false) return false;
  // the context goes into the target page's own filter (and its URL)
  if (ctx.sku && Supply.isView && Supply.isView(v)) { cr6PendQ = ctx.sku; history.replaceState(null, '', location.pathname + '#/supply/' + Supply.PAGE_OF[v] + '?q=' + encodeURIComponent(ctx.sku)); }
  if (ctx.sku && v === 'allocation') cr6AllocSearch(ctx.sku);
  if (ctx.sku && v === 'catalog') cr6CatQ = ctx.sku;
  if (ctx.q && ['orders', 'customers'].includes(v) && typeof ofbState === 'function') { const s = ofbState(ofbPageOf(v)); s.q = ctx.q; s.d = 'all'; if (typeof ofbApply === 'function') ofbApply(ofbPageOf(v)); }
  if (ctx.order && typeof ofbState === 'function' && ofbPageOf(v)) { const s = ofbState(ofbPageOf(v)); s.q = ctx.order; s.d = 'all'; if (typeof ofbApply === 'function') ofbApply(ofbPageOf(v)); }
  if (ctx.order && v === 'soRequests') cr6SoFocus = ctx.order;
  cr6Ctx = { view: v, from: snap, ctx, label: snap.label + (ctx.sku ? ' · ' + ctx.sku : ctx.order ? ' · ' + ctx.order : ctx.store ? ' · ' + ctx.store : ctx.ecomStore && ctx.ecomStore !== '*' ? ' · ' + ctx.ecomStore : ctx.q ? ' · ' + ctx.q : '') };
  if (!location.hash.includes('from=') && !/^#\/supply\//.test(location.hash)) history.replaceState(null, '', location.pathname + '#' + v + '?from=' + encodeURIComponent(snap.view) + (ctx.sku ? '&sku=' + encodeURIComponent(ctx.sku) : '') + (ctx.order ? '&order=' + encodeURIComponent(ctx.order) : '') + (ctx.store || ctx.ecomStore ? '&store=' + encodeURIComponent(ctx.store || ctx.ecomStore) : ''));
  render(); window.scrollTo(0, 0); return true;
}
let cr6SoFocus = '', cr6PendQ = '';
function cr6AllocSearch(sku) {
  const el = document.querySelector('#page input[type="search"], #page #stockSearch, #page #governanceSearch');
  if (typeof stockSearch !== 'undefined') { try { stockSearch = sku; } catch (e) { /* not a let */ } }
  if (el) { el.value = sku; el.dispatchEvent(new Event('input', { bubbles: true })); }
}
function cr6Chip() {
  document.querySelectorAll('.cr6-from').forEach(x => x.remove());
  if (!cr6Ctx || cr6MenuView(view) !== cr6MenuView(cr6Ctx.view)) return;
  const at = document.querySelector('main .pagehead') || document.querySelector('#page'); if (!at) return;
  at.insertAdjacentHTML('afterend', `<div class="cr6-from" role="status"><span>${t('cr6From')}: <b>${esc(cr6Ctx.label)}</b></span><button type="button" class="quiet" data-cr6-ctxclear="1" aria-label="${t('cr6ClearCtx')}" title="${t('cr6ClearCtx')}">✕</button><button type="button" data-cr6-back="1">${t('cr6Back')}</button></div>`);
}
function cr6GoBack() {
  const c = cr6Ctx; if (!c) return; const s = c.from; cr6Ctx = null;
  Object.entries(s.tabs).forEach(([k, v]) => { if (v == null) return; try { if (k === 'sopTab') sopTab = v; else if (k === 'cr6StockTab') cr6StockTab = v; else if (k === 'cr6CatTab') cr6CatTab = v; else if (k === 'cr6PartnerTab') cr6PartnerTab = v; else if (k === 'stockGroupFilter') stockGroupFilter = v; else if (k === 'cr6EcomStore') cr6EcomStore = v; else if (k === 'orderTab') orderTab = v; } catch (e) { /* read-only */ } });
  cr6Going = true; try { navigate(s.view); } finally { cr6Going = false; }
  if (s.ofb) { Object.assign(ofbState(s.ofb.id), JSON.parse(s.ofb.st)); if (typeof ofbApply === 'function') ofbApply(s.ofb.id); }
  if (s.hash && s.hash !== location.hash) history.replaceState(null, '', location.pathname + s.hash);
  render(); const y = s.scroll; setTimeout(() => window.scrollTo(0, y), 60);
}
document.addEventListener('click', e => {
  if (e.target.closest && e.target.closest('[data-cr6-back]')) { e.preventDefault(); cr6GoBack(); return; }
  if (e.target.closest && e.target.closest('[data-cr6-ctxclear]')) { e.preventDefault(); const c = cr6Ctx; cr6Ctx = null; if (c && c.ctx.sku && c.view === 'allocation') cr6AllocSearch(''); if (c && (c.ctx.ecomStore != null)) { cr6EcomStore = ''; } if (c && c.ctx.sku && window.Supply && Supply.App && Supply.App.F && Supply.isView(c.view)) Supply.App.setF({ q: '' }); render(); }
});
/* the Supply pages' "→ สต็อกและโควตา" links carry the SKU filter (N5) */
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('#main [data-xview], #main [data-view], #main [data-go], #main a[href^="#allocation"], #main [data-ops-go]'); if (!a || !session || !window.Supply || !Supply.isView(view)) return;
  const v = a.dataset.xview || a.dataset.view || a.dataset.go || a.dataset.opsGo || (a.getAttribute('href') || '').slice(1); if (!v || Supply.isView(v) || !workCanVisit(v)) return;
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); const q = Supply.App && Supply.App.F ? Supply.App.F.q : ''; cr6Go(v, { from: view, sku: q && cr6Skus().has(q) ? q : '' });
}, true);
/* menu navigation clears the context */
const cr6FlowNav = navigate;
navigate = function (v) { if (!cr6Going) cr6Ctx = null; return cr6FlowNav(v); };

/* ---------------------------------------------------------------- wiring */
const cr6FlowBind = bind;
bind = function () { cr6FlowBind(); if (!session) return; cr6RowSteps(); cr6InboxMarks(); const pg = document.getElementById('page'); if (pg) cr6Decorate(pg); if (view === 'soRequests' && cr6SoFocus) { const tr = [...document.querySelectorAll('#page tr')].find(x => x.textContent.includes(cr6SoFocus)); if (tr) tr.classList.add('cr6-focus'); } };
const cr6FlowRender = render;
render = function () { cr6FlowRender(); if (!session) return; cr6Chip(); if (/^#o\//.test(location.hash) && document.getElementById('cr6Drawer')?.hidden !== false) cr6HashOrder(); };
if (window.Supply) { const cr6FlowAfter = Supply.afterRender; Supply.afterRender = function (main, A) { if (cr6FlowAfter) cr6FlowAfter.call(this, main, A); cr6Decorate(main); cr6Chip(); if (cr6PendQ && A && A.F) { const q = cr6PendQ; cr6PendQ = ''; if (A.F.q !== q) A.setF({ q }); } }; }

/* ---------------------------------------------------------------- the left menu folds to an icon rail on a desktop (asked during CR-06) · remembered per browser ·
   phones keep the ☰ drawer · every item keeps its name as a tooltip */
Object.assign(dict.th, { cr6Fold: 'พับเมนู', cr6Unfold: 'กางเมนู' }); Object.assign(dict.en, { cr6Fold: 'Fold the menu', cr6Unfold: 'Unfold the menu' });
function cr6SideFolded() { try { return localStorage.getItem('cr6.sideFold') === '1'; } catch (e) { return false; } }
function cr6SideApply() {
  const on = cr6SideFolded(); document.body.classList.toggle('cr6-fold', on);
  const b = document.querySelector('.cr6-sidebtn'); if (b) { b.textContent = on ? '»' : '«'; b.title = t(on ? 'cr6Unfold' : 'cr6Fold'); b.setAttribute('aria-label', b.title); b.setAttribute('aria-expanded', String(!on)); }
}
function cr6SideButton() {
  const left = document.querySelector('header .c5-left'); if (!left || left.querySelector('.cr6-sidebtn')) { cr6SideApply(); return; }
  left.insertAdjacentHTML('afterbegin', '<button type="button" class="quiet cr6-sidebtn" data-cr6-side="1"></button>'); cr6SideApply();
}
document.addEventListener('click', e => { if (!(e.target.closest && e.target.closest('[data-cr6-side]'))) return; try { localStorage.setItem('cr6.sideFold', cr6SideFolded() ? '0' : '1'); } catch (x) { /* storage blocked: this page only */ document.body.classList.toggle('cr6-fold'); } cr6SideApply(); });
const cr6SideRender = render;
render = function () { cr6SideRender(); if (session) cr6SideButton(); };
