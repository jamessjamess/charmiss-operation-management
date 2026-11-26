/* cr06-pages.js — CR-06 · M1 สต็อกและโควตา (โควตาการขาย · สต็อกคลัง · เบิกสินค้า) · M2 รอบ S&OP + ข้อเสนอรออนุมัติ · M4 ร้านค้าออนไลน์ ·
   M5 เอกสาร SO / IV / CN และระบบเชื่อมต่อ เป็น 2 หน้า · DM1 สินค้า · DM2 คู่ค้าและช่องทางขาย · DM3 · DM4 ข้อมูลและพารามิเตอร์ Supply (2 แท็บ).
   Every button / form that moved keeps its old handler (same id / data attribute) — so audit and permissions stay as they were. */
Object.assign(dict.th, {
  cr6AboutStock: 'สต็อกและโควตา = ตอนนี้มีเท่าไร ใช้ได้เท่าไร (ใช้ทำงานประจำวัน) · สต็อกและคาดการณ์ = จะพอถึงเมื่อไร (ใช้วางแผน)',
  cr6PropsTab: 'ข้อเสนอรออนุมัติ', cr6EcomQuota: 'โควต้าร้านค้าออนไลน์', cr6EcomQuotaGo: 'ดูโควต้าร้าน →', cr6EcomMoved: 'โควต้าของร้านอยู่ที่ สต็อกและโควตา · การตั้งค่าร้าน / จับคู่ SKU อยู่ที่ จัดการข้อมูล › คู่ค้าและช่องทางขาย',
  cr6AllStores: 'ทุกร้าน', cr6Store: 'ร้าน', cr6SettingsAt: 'ตั้งค่าร้าน / SKU (จัดการข้อมูล) →',
  cr6ConnTitle: 'สถานะระบบที่เชื่อมต่อ', cr6ConnSys: 'ระบบ', cr6ConnState: 'สถานะ', cr6ConnDetail: 'รายละเอียด', cr6ConnOpen: 'ไปที่',
  cr6SysEcom: 'ร้านค้าออนไลน์', cr6SysWms: 'WMS (คลัง)', cr6SysErp: 'ERP / SLA (SO · IV · CN)', cr6SysSso: 'SSO (เข้าระบบ)', cr6SysSupply: 'ข้อมูล Supply',
  cr6Mock: 'จำลอง', cr6ReadOnly: 'อ่านอย่างเดียว', cr6Ok: 'ปกติ', cr6Warn: 'ต้องตรวจ', cr6NoAccess: 'ไม่มีสิทธิ์ดูรายละเอียด',
  cr6EcomStat: 'เชื่อมต่อ {c}/{n} ร้าน · คิวรอนำเข้า {q}', cr6WmsStat: 'ข้อมูล WMS ณ {t} · {n} SKU', cr6ErpStat: 'เอกสาร {d} ฉบับ · คำขอ SO ในคิว {q}', cr6SsoStat: 'จำลอง Single Sign-On · ผู้ใช้ตอนนี้: {r}',
  cr6SupStat: 'ชุดข้อมูล {d} · selfCheck {s}', cr6SupWait: 'กำลังโหลดข้อมูล Supply…',
  cr6CatTabSku: 'สินค้า', cr6CatTabAlias: 'รหัสเทียบ', cr6Brand: 'แบรนด์ / Series', cr6AllBrands: 'ทุกแบรนด์', cr6Cat: 'หมวด', cr6Erp: 'รหัส ERP', cr6Barcode: 'Barcode', cr6Alias: 'รหัสเทียบ',
  cr6Status: 'สถานะ', cr6Lead: 'Lead time (วัน)', cr6Moq: 'MOQ', cr6SeeStock: 'ดูสต็อก', cr6Edit: 'แก้ไข', cr6Kind: 'ประเภทรหัส', cr6Code: 'รหัส', cr6Partner: 'คู่ค้า',
  cr6Kind_alias: 'รหัสเดิม (Ops)', cr6Kind_barcode: 'Barcode', cr6Kind_erp: 'รหัส ERP', cr6Kind_partner: 'รหัสของคู่ค้า', cr6St_Active: 'ขายอยู่', cr6St_NPD: 'NPD', cr6St_Inactive: 'เลิกขาย', cr6St_Clearance: 'เคลียร์สต็อก',
  cr6CatAbout: 'ข้อมูลสินค้าแก้ได้ที่หน้านี้ที่เดียว — หน้าอื่นอ่านผ่าน masterSku() · นำเข้า SKU master ของ Supply ยังทำที่ ข้อมูลและพารามิเตอร์ Supply (ผลแสดงที่นี่ทันที) · สต็อกดูได้จาก "ดูสต็อก" (SKU 360)',
  cr6PTabMT: 'คู่ค้า (MT)', cr6PTabTT: 'พื้นที่ขาย (TT)', cr6PTabStores: 'ร้านค้าออนไลน์', cr6PTabStock: 'ช่องทางสต็อก', cr6Managers: 'ผู้ดูแล (Manager)', cr6EditAccess: 'แก้ผู้ดูแลที่ บัญชีและสิทธิ์ →',
  cr6SupplyAcc: 'บัญชีใน Supply', cr6Allocated: 'โควตาที่จัดสรร', cr6Group: 'กลุ่ม', cr6StoreId: 'รหัสร้าน', cr6Mapped: 'จับคู่ SKU', cr6PAbout: 'คู่ค้า / ช่องทาง / ร้านแก้ได้ที่หน้านี้ · การผูกคู่ค้ากับผู้ใช้ (สิทธิ์) แก้ที่ บัญชีและสิทธิ์ · หน้าอื่นอ่านผ่าน masterPartner()',
  cr6IntakeAlias: 'รหัสคู่ค้าที่ใช้ตอนนำเข้า ดูรวมได้ที่ สินค้า › รหัสเทียบ →', cr6SetTabData: 'นำเข้าข้อมูล', cr6SetTabParam: 'พารามิเตอร์'
});
Object.assign(dict.en, {
  cr6AboutStock: 'Stock & quota = how much there is and how much can be used now (daily work) · Stock & projection = how long it lasts (planning)',
  cr6PropsTab: 'Proposals waiting', cr6EcomQuota: 'Online store quota', cr6EcomQuotaGo: 'Store quota →', cr6EcomMoved: 'Store quota lives in Stock & quota · store settings / SKU mapping live in Data management › Partners & channels',
  cr6AllStores: 'All stores', cr6Store: 'Store', cr6SettingsAt: 'Store / SKU settings (Data management) →',
  cr6ConnTitle: 'Connected systems', cr6ConnSys: 'System', cr6ConnState: 'State', cr6ConnDetail: 'Detail', cr6ConnOpen: 'Open',
  cr6SysEcom: 'Online stores', cr6SysWms: 'WMS (warehouse)', cr6SysErp: 'ERP / SLA (SO · IV · CN)', cr6SysSso: 'SSO (sign-in)', cr6SysSupply: 'Supply data',
  cr6Mock: 'Simulated', cr6ReadOnly: 'Read-only', cr6Ok: 'OK', cr6Warn: 'Check', cr6NoAccess: 'No access to the detail',
  cr6EcomStat: '{c}/{n} stores connected · {q} waiting to import', cr6WmsStat: 'WMS data as of {t} · {n} SKUs', cr6ErpStat: '{d} documents · {q} SO requests in the queue', cr6SsoStat: 'Simulated single sign-on · signed in: {r}',
  cr6SupStat: 'Dataset {d} · selfCheck {s}', cr6SupWait: 'Loading the Supply data…',
  cr6CatTabSku: 'Products', cr6CatTabAlias: 'Code map', cr6Brand: 'Brand / series', cr6AllBrands: 'All brands', cr6Cat: 'Category', cr6Erp: 'ERP code', cr6Barcode: 'Barcode', cr6Alias: 'Other codes',
  cr6Status: 'Status', cr6Lead: 'Lead time (days)', cr6Moq: 'MOQ', cr6SeeStock: 'Stock', cr6Edit: 'Edit', cr6Kind: 'Code type', cr6Code: 'Code', cr6Partner: 'Partner',
  cr6Kind_alias: 'Old Ops code', cr6Kind_barcode: 'Barcode', cr6Kind_erp: 'ERP code', cr6Kind_partner: 'Partner code', cr6St_Active: 'Selling', cr6St_NPD: 'NPD', cr6St_Inactive: 'Discontinued', cr6St_Clearance: 'Clearance',
  cr6CatAbout: 'Product data is edited here only — other pages read it through masterSku() · the Supply SKU master import stays in Supply data & parameters (shows here at once) · stock is one click away ("Stock", SKU 360)',
  cr6PTabMT: 'Partners (MT)', cr6PTabTT: 'Sales areas (TT)', cr6PTabStores: 'Online stores', cr6PTabStock: 'Stock channels', cr6Managers: 'Looked after by', cr6EditAccess: 'Edit in Accounts & access →',
  cr6SupplyAcc: 'Supply account', cr6Allocated: 'Allocated quota', cr6Group: 'Group', cr6StoreId: 'Store id', cr6Mapped: 'SKU mapping', cr6PAbout: 'Partners / channels / stores are edited here · who looks after a partner (access) is edited in Accounts & access · other pages read through masterPartner()',
  cr6IntakeAlias: 'Partner codes used by the import are listed in Products › Code map →', cr6SetTabData: 'Data import', cr6SetTabParam: 'Parameters'
});
if (window.I18N) I18N.add({ cr6_about_stock: dict.th.cr6AboutStock }, { cr6_about_stock: dict.en.cr6AboutStock });

/* a note in "ⓘ เกี่ยวกับหน้านี้" (made when the page has none) */
function cr6AboutNote(key, text) {
  let box = document.querySelector('#c5About');
  if (!box) {
    const row = document.querySelector('main .c5-h1row'); if (!row) return;
    box = document.createElement('div'); box.className = 'c5-about'; box.id = 'c5About'; box.hidden = true;
    (document.querySelector('main .pagehead') || row).after(box);
    row.insertAdjacentHTML('beforeend', `<button type="button" class="c5-aboutbtn" data-c5-about="about.${esc(fuKey())}.${esc(view)}" aria-expanded="false" aria-controls="c5About">ⓘ ${t('c5About')}</button>`);
  }
  if (!box.querySelector(`[data-cr6-note="${key}"]`)) box.insertAdjacentHTML('beforeend', `<div class="c5-note" data-cr6-note="${key}">${esc(text)}</div>`);
}

/* ---------------------------------------------------------------- M1 · สต็อกและโควตา: โควตาการขาย · สต็อกคลัง (WMS) · เบิกสินค้า */
let cr6StockTab = 'wms', cr6EcomStore = '';
document.addEventListener('click', e => {
  const r = e.target.closest && e.target.closest('[data-work-route]'); if (r && r.dataset.workRoute === 'stockoverview') cr6StockTab = 'wms';
  const b = e.target.closest && e.target.closest('[data-cr6-stocktab]');
  if (b) { e.preventDefault(); e.stopPropagation(); cr6StockTab = b.dataset.cr6Stocktab; if (view !== 'stockoverview') navigate('stockoverview'); render(); }
}, true);
function cr6StockTabs() {
  if (!['allocation', 'stockoverview'].includes(view)) return;
  const tabs = document.querySelector('#page .work-family-tabs'); if (!tabs) return;
  if (workCanVisit('stockoverview') && !tabs.querySelector('[data-cr6-stocktab]')) tabs.insertAdjacentHTML('beforeend', `<button data-cr6-stocktab="issue">${t('cr6Issue')}</button>`);
  const issue = view === 'stockoverview' && cr6StockTab === 'issue';
  tabs.querySelectorAll('button').forEach(b => { const on = b.dataset.cr6Stocktab ? issue : (b.dataset.workRoute === view && !issue); b.classList.toggle('selected', on); b.setAttribute('aria-current', on ? 'page' : 'false'); });
  if (view !== 'stockoverview') return;
  const page = document.querySelector('#page'), anchor = page.querySelector('#issueNew, [data-issue-approve], [data-issue-reject], .issue-panel');
  let panel = anchor; while (panel && panel.parentElement && panel.parentElement !== page) panel = panel.parentElement;
  [...page.children].forEach(el => { if (el === tabs || el.contains(tabs)) return; const isIssue = panel && el === panel; el.hidden = issue ? !isIssue : isIssue; });
}

/* ---------------------------------------------------------------- M4 · the Ecom quota table moves to สต็อกและโควตา (filter: Ecom / a store) */
function cr6EcomQuotaPanel() {
  if (view !== 'allocation' || !workCanVisit('ecommerce') || typeof ecomStockRows !== 'function') return '';
  if (typeof stockGroupFilter === 'undefined' || (stockGroupFilter !== 'EC' && !cr6EcomStore)) return '';
  const chans = governedEcomConnections().filter(c => !cr6EcomStore || c.id === cr6EcomStore);
  const rows = chans.flatMap(c => ecomStockRows(c.id).map(r => ({ c, r })));
  return `<section class="panel cr6-ecomquota" id="cr6EcomQuota"><div class="panelhead"><h2>${t('cr6EcomQuota')}</h2><label class="cr6-inline">${t('cr6Store')} <select id="cr6EcomStore"><option value="">${t('cr6AllStores')}</option>${governedEcomConnections().map(c => `<option value="${c.id}" ${c.id === cr6EcomStore ? 'selected' : ''}>${esc(ecomDefinition(c.id).name)}</option>`).join('')}</select></label></div>
    <div class="tablewrap"><table><thead><tr>${['channel', 'product', 'approvedPool', 'usedDocs', 'ecomPendingDemand', 'ecomSaleable', 'ecomPublishStock'].map(k => `<th>${t(k)}</th>`).join('')}</tr></thead><tbody>${rows.map(({ c, r }) => `<tr data-cr6-store="${c.id}"><td>${esc(ecomDefinition(c.id).name)}<small>${esc(c.storeName)}</small></td><td><b>${esc(r.sku)}</b><small>${esc((masterSku(r.sku) || {}).name || '')}</small></td><td class="num" data-cr6-q="${r.quota}">${n(r.quota)}</td><td class="num">${n(r.used)}</td><td class="num">${n(r.demand)}</td><td class="num"><b style="color:var(--green)">${n(r.saleable)}</b></td><td class="num">${r.published === null ? '—' : n(r.published)}</td></tr>`).join('')}</tbody></table></div><div class="listmeta">${t('ecomStockHint')}</div></section>`;
}
document.addEventListener('change', e => { if (e.target.id === 'cr6EcomStore') { cr6EcomStore = e.target.value; render(); } });
function cr6Ecom() {
  if (view !== 'ecommerce') return;
  const page = document.querySelector('#page'); if (!page) return;
  page.querySelectorAll('.panel').forEach(p => { const h = p.querySelector('.panelhead h2'); if (h && h.textContent.trim() === t('ecomStockPool')) p.remove(); });
  if (!page.querySelector('[data-cr6-ecomquota]')) {
    const tb = page.querySelector('.toolbar');
    if (tb) tb.insertAdjacentHTML('beforeend', `<button type="button" data-cr6-ecomquota="1">${t('cr6EcomQuotaGo')}</button>`);
    cr6AboutNote('ecom', t('cr6EcomMoved'));
  }
  page.querySelectorAll('[data-ecom-settings]').forEach(b => { if (!b.dataset.cr6) { b.dataset.cr6 = '1'; if (b.closest('.c5-ddmenu, .ecom-channel-card')) b.textContent = t('cr6SettingsAt'); } });
}
document.addEventListener('click', e => {
  const q = e.target.closest && e.target.closest('[data-cr6-ecomquota]');
  if (q) { e.preventDefault(); const store = typeof ecomChannelFilter !== 'undefined' && ecomChannelFilter !== 'all' ? ecomChannelFilter : ''; cr6Go('allocation', { from: view, ecomStore: store || '*' }); return; }
  const s = e.target.closest && e.target.closest('#page [data-ecom-settings]');
  if (s && view === 'ecommerce') { e.preventDefault(); e.stopPropagation(); const id = s.dataset.ecomSettings; cr6PartnerTab = 'stores'; cr6Go('partners', { from: view, store: id }); setTimeout(() => { if (view === 'partners' && typeof ecomSettings === 'function') ecomSettings(id); }, 60); }
}, true);

/* ---------------------------------------------------------------- M2 · รอบ S&OP: ข้อเสนอรออนุมัติ · Action log · Snapshot แผน */
function cr6PropsWaiting() { return typeof props === 'function' ? props().filter(p => p.status === 'submitted' && propVisible(p)) : []; }
const cr6SopPageBefore = supSopPage;
supSopPage = function () {
  const own = cr6SopOwn(); if (!own) sopTab = 'props';
  const tabs = () => { const nn = cr6PropsWaiting().length; return `<div class="orderTabs">${[['props', 'cr6PropsTab'], ...(own ? [['actions', 'sopTabActions'], ['snaps', 'sopTabSnaps']] : [])].map(([x, l]) => `<button data-sop-tab="${x}" class="${sopTab === x ? 'selected' : ''}">${t(l)}${x === 'props' && nn ? ` <span class="pill warn">${n(nn)}</span>` : ''}</button>`).join('')}</div>`; };
  const swap = h => { const i = h.indexOf('<div class="orderTabs">'); if (i < 0) return h; const j = h.indexOf('</div>', i); return h.slice(0, i) + tabs() + h.slice(j + 6); };
  if (sopTab === 'props') {
    let head = '';
    if (own) { sopTab = 'snaps'; let h; try { h = cr6SopPageBefore(); } finally { sopTab = 'props'; } const i = h.indexOf('<div class="orderTabs">'); head = i < 0 ? '' : swap(h.slice(0, h.indexOf('</div>', i) + 6)); }
    else head = tabs();
    return head + supProposalsPage();
  }
  return swap(cr6SopPageBefore());
};

/* ---------------------------------------------------------------- M5 · เอกสาร SO / IV / CN (documents only) · ระบบเชื่อมต่อ (every connected system in one place) */
const cr6DocBefore = workDocPage;
workDocPage = function () {
  if (view === 'erp') return cr6ConnectionsPage();
  const h = cr6DocBefore(), i = h.indexOf('<div class="orderTabs work-family-tabs">');
  return i < 0 ? h : h.slice(0, i) + h.slice(h.indexOf('</div>', i) + 6);
};
function cr6ConnRows() {
  const rows = [], can = v => workCanVisit(v);
  if (typeof governedEcomConnections === 'function') {
    const all = (db.ecomConnections || []), vis = can('ecommerce') ? governedEcomConnections() : [], q = (db.ecomQueue || []).filter(x => typeof ecomQueueState === 'function' && ecomQueueState(x) === 'ecomQueued').length;
    rows.push({ id: 'ecom', sys: t('cr6SysEcom'), state: t('cr6Mock'), ok: true, detail: can('ecommerce') ? tp('cr6EcomStat', { c: n(vis.filter(c => c.status === 'connected').length), n: n(vis.length), q: n(q) }) : tp('cr6EcomStat', { c: n(all.filter(c => c.status === 'connected').length), n: n(all.length), q: '—' }), go: can('ecommerce') ? 'ecommerce' : '' });
  }
  const w = db.wmsSnapshot || {};
  rows.push({ id: 'wms', sys: t('cr6SysWms'), state: t('cr6ReadOnly'), ok: !!w.version, detail: tp('cr6WmsStat', { t: w.readAt ? fmtDateTime(w.readAt) : (w.asOf ? fmtDate(w.asOf) : '—'), n: n((w.rows || []).length) }), tip: w.version || '', go: typeof wmsCanRead === 'function' && wmsCanRead() ? 'stockoverview' : '' });
  rows.push({ id: 'erp', sys: t('cr6SysErp'), state: t('cr6ReadOnly'), ok: true, detail: tp('cr6ErpStat', { d: n((db.documents || []).length), q: n((db.soRequests || []).filter(r => !['done', 'closed', 'cancelled', 'rejected'].includes(r.status)).length) }), go: 'documents' });
  rows.push({ id: 'sso', sys: t('cr6SysSso'), state: t('cr6Mock'), ok: !!session, detail: tp('cr6SsoStat', { r: session ? t(session.role) : '—' }), go: can('access') ? 'access' : '' });
  const App = window.Supply && Supply.App, sc = App && App.sc;
  rows.push({ id: 'supply', sys: t('cr6SysSupply'), state: sc ? (sc.ok ? t('cr6Ok') : t('cr6Warn')) : '—', ok: !sc || sc.ok, detail: App && App.DB ? tp('cr6SupStat', { d: typeof supDataset === 'function' ? supDataset() : '—', s: sc ? `${sc.checks.filter(c => c.ok).length}/${sc.checks.length}` : '—' }) : t('cr6SupWait'), go: can('supSetup') ? 'supSetup' : '' });
  return rows;
}
function cr6ConnectionsPage() {
  if (window.Supply && !(Supply.App && Supply.App.DB)) Supply.ensureData().then(() => { if (view === 'erp') render(); });
  const rows = cr6ConnRows();
  return `<section class="panel" id="cr6Conn"><div class="panelhead"><h2>${t('cr6ConnTitle')}</h2><span class="pill warn">MOCK</span></div><div class="tablewrap"><table><thead><tr><th>${t('cr6ConnSys')}</th><th>${t('cr6ConnState')}</th><th>${t('cr6ConnDetail')}</th><th>${t('cr6ConnOpen')}</th></tr></thead><tbody>${rows.map(r => `<tr data-cr6-sys="${r.id}"><td><b>${esc(r.sys)}</b></td><td><span class="pill ${r.ok ? 'ok' : 'warn'}">${esc(r.state)}</span></td><td${r.tip ? ` title="${esc(r.tip)}"` : ''}>${esc(r.detail)}</td><td>${r.go ? `<button type="button" class="text-link" data-cr6-go="${r.go}">${esc(t(r.go))} →</button>` : '—'}</td></tr>`).join('')}</tbody></table></div></section>` + workConnectionsPage();
}
document.addEventListener('click', e => { const g = e.target.closest && e.target.closest('[data-cr6-go]'); if (g) { e.preventDefault(); cr6DwClose && cr6DwClose(); cr6Go(g.dataset.cr6Go, { from: view, order: g.dataset.cr6CtxOrder || '' }); } });

/* ---------------------------------------------------------------- DM1 · สินค้า (Product master): one list · brand filter · any code · code map · no stock columns */
let cr6CatTab = 'sku', cr6CatQ = '', cr6CatBrand = '';
catalogPage = function () {
  if (window.Supply && !cr6SupDB()) Supply.ensureData().then(() => { if (view === 'catalog') render(); });
  const all = masterSkuList(), brands = [...new Set(all.map(m => m.brand).filter(Boolean))].sort();
  const q = cr6CatQ.trim().toLowerCase(), hit = m => !q || [m.sku, m.name, m.brand, m.erp, m.barcode, ...m.aliases.map(a => a.code)].join(' ').toLowerCase().includes(q);
  const list = all.filter(m => (!cr6CatBrand || m.brand === cr6CatBrand) && hit(m)), admin = session.role === 'admin';
  const tabs = `<div class="orderTabs">${[['sku', 'cr6CatTabSku'], ['alias', 'cr6CatTabAlias']].map(([x, l]) => `<button data-cr6-cattab="${x}" class="${cr6CatTab === x ? 'selected' : ''}">${t(l)}</button>`).join('')}</div>`;
  const tools = `<div class="toolbar cr6-cattools"><input type="search" id="cr6CatQ" value="${esc(cr6CatQ)}" placeholder="SKU / ${t('cr6Barcode')} / ${t('cr6Erp')} / ${t('cr6Alias')}" aria-label="${t('search')}"><select id="cr6CatBrand" aria-label="${t('cr6Brand')}"><option value="">${t('cr6AllBrands')}</option>${brands.map(b => `<option ${b === cr6CatBrand ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>${admin ? `<button class="primary" id="opsNewProduct">＋ ${L('ตั้งสินค้า', 'New product')}</button>` : ''}</div>`;
  const st = s => t('cr6St_' + s) === 'cr6St_' + s ? s : t('cr6St_' + s);
  if (cr6CatTab === 'alias') {
    const rows = list.flatMap(m => m.aliases.map(a => ({ m, a })));
    return tabs + `<section class="panel"><div class="panelhead"><h2>${t('cr6CatTabAlias')}</h2><span class="pill">${n(rows.length)}</span></div><div class="panelbody">${tools}</div><div class="tablewrap"><table><thead><tr><th>SKU</th><th>${t('productName')}</th><th>${t('cr6Kind')}</th><th>${t('cr6Code')}</th><th>${t('cr6Partner')}</th></tr></thead><tbody>${rows.map(({ m, a }) => `<tr><td><b>${esc(m.sku)}</b></td><td>${esc(m.name)}</td><td>${t('cr6Kind_' + a.kind)}</td><td>${esc(a.code)}</td><td>${a.partner ? esc((masterPartner(a.partner) || { name: a.partner }).name) : '—'}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  return tabs + `<section class="panel"><div class="panelhead"><h2>${t('cr6CatTabSku')}</h2><span class="pill">${n(list.length)} / ${n(all.length)}</span></div><div class="panelbody">${tools}</div><div class="tablewrap"><table class="cr6-cat"><thead><tr><th>SKU / ${t('productName')}</th><th>${t('cr6Brand')}</th><th>${t('cr6Cat')}</th><th>${t('cr6Erp')} / ${t('cr6Barcode')}</th><th>${t('cr6Alias')}</th><th>${t('cr6Status')}</th><th class="num">${t('cr6Lead')}</th><th class="num">${t('cr6Moq')}</th><th>${t('actions')}</th></tr></thead><tbody>${list.map(m => `<tr data-cr6-sku="${esc(m.sku)}"><td><b>${esc(m.sku)}</b><small data-cr6-name>${esc(m.name)}</small></td><td>${esc(m.brand || '—')}</td><td>${esc(m.category || '—')}</td><td>${esc(m.erp || '—')}<small>${esc(m.barcode || '—')}</small></td><td>${m.aliases.filter(a => a.kind === 'alias' || a.kind === 'partner').map(a => esc(a.code)).join(', ') || '—'}</td><td><span class="pill ${m.active ? 'ok' : ''}">${esc(st(m.status || 'Active'))}</span></td><td class="num">${m.leadTime == null ? '—' : n(m.leadTime)}</td><td class="num">${m.moq == null ? '—' : n(m.moq)}</td><td><button type="button" data-sku360="${esc(m.sku)}">${t('cr6SeeStock')}</button>${admin ? ` <button type="button" data-ops-edit-product="${esc(m.sku)}">${t('cr6Edit')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div></section>`;
};
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-cr6-cattab]'); if (b) { cr6CatTab = b.dataset.cr6Cattab; render(); } });
document.addEventListener('input', e => { if (e.target.id === 'cr6CatQ') { cr6CatQ = e.target.value; const pos = e.target.selectionStart; render(); const el = document.querySelector('#cr6CatQ'); if (el) { el.focus(); el.setSelectionRange(pos, pos); } } });
document.addEventListener('change', e => { if (e.target.id === 'cr6CatBrand') { cr6CatBrand = e.target.value; render(); } });
/* a product edit (admin · the existing form) is a master edit: the name goes to every page at once */
if (typeof opsSaveProduct === 'function') { const cr6SaveBefore = opsSaveProduct; opsSaveProduct = function (raw, isEdit) { const r = cr6SaveBefore.apply(this, arguments); if (raw && raw.sku && (!r || r.ok !== false)) { const pm = (db.productMaster || []).find(p => p.sku === raw.sku); if (pm) { cr6M().sku[raw.sku] = Object.assign(cr6M().sku[raw.sku] || { orig: {} }, { name: pm.name, at: Date.now(), by: session.role }); cr6ApplySupply(true); } } return r; }; }

/* ---------------------------------------------------------------- DM2 · คู่ค้าและช่องทางขาย: คู่ค้า (MT) · พื้นที่ขาย (TT) · ร้านค้าออนไลน์ · ช่องทางสต็อก */
let cr6PartnerTab = 'MT';
partnersPage = function () {
  const ps = db.partners.filter(visiblePartner), canStores = workCanVisit('ecommerce') && typeof governedEcomConnections === 'function', director = typeof isStockDirector === 'function' && isStockDirector();
  const tabsL = [['MT', 'cr6PTabMT'], ['TT', 'cr6PTabTT'], ...(canStores ? [['stores', 'cr6PTabStores']] : []), ['stock', 'cr6PTabStock']];
  if (!tabsL.some(x => x[0] === cr6PartnerTab)) cr6PartnerTab = 'MT';
  const tabs = `<div class="orderTabs">${tabsL.map(([x, l]) => `<button data-cr6-ptab="${x}" class="${cr6PartnerTab === x ? 'selected' : ''}">${t(l)}</button>`).join('')}</div>`;
  const alloc = id => db.allocations.filter(a => a.partner === id && ['submitted', 'approved'].includes(a.status)).reduce((s, a) => s + a.qty, 0);
  const head = (title, btn) => `<div class="panelhead"><h2>${title}</h2><div class="tools">${btn || ''}</div></div>`;
  const add = typeof canApprove === 'function' && canApprove() ? `<button class="primary" id="addPartner">＋ ${t('addPartner')}</button>` : '';
  if (cr6PartnerTab === 'stores') {
    const C = governedEcomConnections(), manage = typeof canManageEcom === 'function' && canManageEcom();
    return tabs + `<section class="panel">${head(t('cr6PTabStores'))}<div class="tablewrap"><table><thead><tr><th>${t('cr6Store')}</th><th>${t('cr6StoreId')}</th><th>${t('cr6ConnState')}</th><th>${t('cr6Partner')}</th><th class="num">${t('cr6Mapped')}</th><th>${t('actions')}</th></tr></thead><tbody>${C.map(c => { const m = Object.values(c.mapping || {}), d = ecomDefinition(c.id); return `<tr data-cr6-store="${c.id}"><td><b>${esc(d.name)}</b><small>${esc(c.storeName)}</small></td><td>${esc(c.storeId || '—')}</td><td><span class="pill ${c.status === 'connected' ? 'ok' : 'warn'}">${esc(t(c.status) === c.status ? c.status : t(c.status))}</span></td><td>${esc((masterPartner(c.partner) || { name: c.partner || '—' }).name)}</td><td class="num">${n(m.filter(Boolean).length)} / ${n(m.length)}</td><td>${manage ? `<button type="button" data-cr6-storeset="${c.id}">${t('ecomSettings')}</button>` : '—'}</td></tr>`; }).join('')}</tbody></table></div></section>`;
  }
  if (cr6PartnerTab === 'stock') {
    const groups = typeof stockGroups !== 'undefined' ? stockGroups : ['MT', 'TT', 'EC', 'DIRECT'];
    return tabs + `<section class="panel">${head(t('cr6PTabStock'), director ? `<button class="primary" id="addStockChannel">＋ ${t('addStockChannel')}</button>` : '')}<div class="tablewrap"><table><thead><tr><th>${t('cr6Partner')}</th><th>${t('cr6Group')}</th><th>${t('channel')}</th><th>${t('sales')}</th><th class="num">${t('cr6Allocated')}</th></tr></thead><tbody>${groups.flatMap(g => ps.filter(p => p.type === g)).map(p => `<tr><td><b>${esc(masterPartner(p.id).name)}</b><small>${esc(p.id)}</small></td><td>${esc(typeof t === 'function' && t('group' + p.type) !== 'group' + p.type ? t('group' + p.type) : p.type)}</td><td>${esc(p.channel || '—')}</td><td>${esc(p.sales || '—')}</td><td class="num">${n(alloc(p.id))}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  const list = ps.filter(p => p.type === cr6PartnerTab).map(p => masterPartner(p.id));
  const tt = cr6PartnerTab === 'TT';
  return tabs + `<section class="panel">${head(t(tt ? 'cr6PTabTT' : 'cr6PTabMT'), add)}<div class="panelbody"><p class="small">◇ ${t(tt ? 'ttPath' : 'mtPath')}</p></div><div class="tablewrap"><table><thead><tr><th>${t('cr6Partner')}</th><th>${t(tt ? 'area' : 'channel')}</th><th>${t(tt ? 'sales' : 'area')}</th>${tt ? '' : `<th>${t('cr6SupplyAcc')}</th>`}<th>${t('cr6Managers')}</th><th class="num">${t('cr6Allocated')}</th></tr></thead><tbody>${list.map(p => `<tr data-cr6-partner="${esc(p.id)}"><td><b>${esc(p.name)}</b><small>${esc(p.id)}${p.consignment ? ' · ' + t('consign') : ''}</small></td><td>${esc(tt ? p.area : p.channel)}</td><td>${esc(tt ? p.sales : p.area)}</td>${tt ? '' : `<td>${p.account ? esc(p.account) : '—'}</td>`}<td>${esc(p.managers.join(', ') || '—')}${workCanVisit('access') ? ` <button type="button" class="text-link" data-cr6-go="access">${t('cr6EditAccess')}</button>` : ''}</td><td class="num">${n(alloc(p.id))}</td></tr>`).join('')}</tbody></table></div></section>`;
};
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-cr6-ptab]'); if (b) { cr6PartnerTab = b.dataset.cr6Ptab; render(); return; }
  const s = e.target.closest && e.target.closest('[data-cr6-storeset]'); if (s && typeof ecomSettings === 'function') ecomSettings(s.dataset.cr6Storeset);
});

/* ---------------------------------------------------------------- wiring (after the CR-05 page pieces) */
const cr6PagesBind = bind;
bind = function () {
  cr6PagesBind(); if (!session) return;
  cr6StockTabs(); cr6Ecom();
  if (view === 'allocation' && !document.querySelector('#cr6EcomQuota')) { const html = cr6EcomQuotaPanel(); if (html) { const tabs = document.querySelector('#page .work-family-tabs'); (tabs || document.querySelector('#page')).insertAdjacentHTML(tabs ? 'afterend' : 'afterbegin', html); const tb = document.querySelector('#cr6EcomQuota table'); if (tb && typeof c5Tables === 'function') c5Tables(document.querySelector('#cr6EcomQuota'), 'cr6ecom:'); } }
  if (view === 'catalog') { const sb = document.querySelector('#cr6CatQ'); if (sb && document.activeElement !== sb && cr6CatQ) { /* keep */ } }
  if (view === 'partners' && $('#addStockChannel')) $('#addStockChannel').onclick = addStockChannelForm;
  if (view === 'supIntake' && !document.querySelector('[data-cr6-intake]')) { const pg = document.querySelector('#page'); if (pg) pg.insertAdjacentHTML('afterbegin', `<p class="c5-ro" data-cr6-intake="1"><button type="button" class="text-link" data-cr6-alias="1">${t('cr6IntakeAlias')}</button></p>`); }
};
document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('[data-cr6-alias]'); if (a) { cr6CatTab = 'alias'; cr6Go('catalog', { from: view }); } });
const cr6PagesRender = render;
render = function () {
  cr6PagesRender(); if (!session) return;
  if (['allocation', 'stockoverview'].includes(view)) cr6AboutNote('stock', t('cr6AboutStock'));
  if (view === 'catalog') cr6AboutNote('cat', t('cr6CatAbout'));
  if (view === 'partners') cr6AboutNote('partners', t('cr6PAbout'));
};
/* Supply pages: สต็อกและคาดการณ์ gets the same "which stock page" note · DM4 two tabs on ข้อมูลและพารามิเตอร์ Supply */
let cr6SetTab = 'data';
if (window.Supply) {
  const cr6AfterBefore = Supply.afterRender;
  Supply.afterRender = function (main, A) {
    if (cr6AfterBefore) cr6AfterBefore.call(this, main, A);
    if (view === 'supStock') cr6AboutNote('stock', t('cr6AboutStock'));
    if (view === 'supSetup') cr6SetupTabs(main);
  };
}
function cr6SetupTabs(main) {
  if (!main) return; const head = main.querySelector(':scope > .pagehead'); if (!head) return;
  const kids = [...main.children].filter(x => x !== head && !x.classList.contains('cr6-settabs'));
  const param = kids.flatMap(k => k.classList.contains('grid2') ? [...k.children] : [k]).find(c => /Threshold|ตั้งค่า|Settings/.test((c.querySelector('h3') || {}).textContent || '') && c.querySelector('input, select'));
  let bar = main.querySelector('.cr6-settabs'); if (!bar) { head.insertAdjacentHTML('afterend', `<div class="orderTabs cr6-settabs">${[['data', 'cr6SetTabData'], ['param', 'cr6SetTabParam']].map(([x, l]) => `<button type="button" data-cr6-settab="${x}">${t(l)}</button>`).join('')}</div>`); bar = main.querySelector('.cr6-settabs'); }
  bar.querySelectorAll('button').forEach(b => b.classList.toggle('selected', b.dataset.cr6Settab === cr6SetTab));
  kids.forEach(k => {
    if (k.classList.contains('grid2') && param && k.contains(param)) { [...k.children].forEach(c => { c.hidden = cr6SetTab === 'param' ? c !== param : c === param; }); k.classList.toggle('cr6-solo', true); k.hidden = false; }
    else k.hidden = cr6SetTab === 'param';
  });
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-cr6-settab]'); if (b) { cr6SetTab = b.dataset.cr6Settab; cr6SetupTabs(document.querySelector('#main')); } });
