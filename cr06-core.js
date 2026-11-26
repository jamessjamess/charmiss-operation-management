/* cr06-core.js — CR-06 · J1 menu by journey · R page names (TH / EN) · D7 old view ids keep working (redirects) ·
   DM master data read functions masterSku() / masterPartner() (every new surface reads product / partner data through them —
   Phase 2 swaps their source for Product Master / Partner Master without touching the pages).
   Loaded after cr05-pages.js. Page ids, access (page gate), numbers and formulas are unchanged. */

/* ---------------------------------------------------------------- R · page names (one rename for every text: menu · H1 · breadcrumb ·
   buttons "→ page" · tooltips · toasts · home) */
const CR6_RENAME = {
  th: [['คำสั่งซื้อและการชำระเงิน', 'คำสั่งซื้อ'], ['เปิด SO · MT/TT', 'คำขอเปิด SO (MT/TT)'], ['งานค้างและส่งมอบ', 'จัดส่งและส่งมอบ'], ['คืนสินค้า / Credit Note', 'คืนสินค้าและ CN'],
    ['เอกสารและระบบเชื่อมต่อ', 'เอกสาร SO / IV / CN'], ['ฝ่าย E-commerce', 'ร้านค้าออนไลน์'], ['สินค้าคงคลังและโควตา', 'สต็อกและโควตา'], ['ของเข้า & CN Calendar', 'ของเข้าและ CN'],
    ['Supply Review (Weekly/Monthly)', 'Supply Review'], ['ฝากขาย (Consignment)', 'ฝากขาย'], ['คู่ค้าและพื้นที่ขาย', 'คู่ค้าและช่องทางขาย'], ['รับรายงาน Sales Out', 'นำเข้า Sales Out'],
    ['ข้อมูล & ตั้งค่า Supply', 'ข้อมูลและพารามิเตอร์ Supply'], ['บัญชีและสิทธิ์ SSO', 'บัญชีและสิทธิ์'], ['รอบ S&OP · Action log', 'รอบ S&OP'], ['Stock & Projection', 'สต็อกและคาดการณ์']],
  en: [['Orders and payments', 'Orders'], ['Open SO · MT/TT', 'SO requests (MT/TT)'], ['Work queue & handover', 'Fulfilment & handover'], ['Returns / Credit notes', 'Returns & CN'],
    ['Documents and connections', 'Documents'], ['E-commerce team', 'Online stores'], ['Inventory and quota', 'Stock & quota'], ['Inbound & CN calendar', 'Inbound & CN'], ['Inbound & CN Calendar', 'Inbound & CN'],
    ['Supply Review (Weekly/Monthly)', 'Supply Review'], ['Partners & sales areas', 'Partners & channels'], ['Sales Out intake', 'Sales Out import'], ['Supply data & settings', 'Supply data & parameters'],
    ['SSO & access', 'Accounts & access'], ['S&OP cycle · action log', 'S&OP cycle'], ['Stock & Projection', 'Stock & projection'], ['Replenishment planning', 'Replenishment']]
};
const CR6_KEEP = new Set(['ecom']);   // the Ecom department label stays a department name
function cr6RenameAll(obj, pairs) { for (const k in obj) { const v = obj[k]; if (typeof v !== 'string' || CR6_KEEP.has(k)) continue; let s = v; pairs.forEach(([a, b]) => { if (s.includes(a)) s = s.split(a).join(b); }); obj[k] = s; } }
cr6RenameAll(dict.th, CR6_RENAME.th); cr6RenameAll(dict.en, CR6_RENAME.en);
if (window.I18N && I18N.dicts) { const D = I18N.dicts(); cr6RenameAll(D.TH, CR6_RENAME.th); cr6RenameAll(D.EN, CR6_RENAME.en); }
Object.assign(dict.th, {
  overview: 'หน้าหลัก', orders: 'คำสั่งซื้อ', payments: 'คำสั่งซื้อ', shipping: 'คำสั่งซื้อ', soRequests: 'คำขอเปิด SO (MT/TT)', workQueue: 'จัดส่งและส่งมอบ', returns: 'คืนสินค้าและ CN', opsReturns: 'คืนสินค้าและ CN',
  documents: 'เอกสาร SO / IV / CN', erp: 'ระบบเชื่อมต่อ', customers: 'ลูกค้า', ecommerce: 'ร้านค้าออนไลน์', supOverview: 'ภาพรวม Supply', supStock: 'สต็อกและคาดการณ์', supConsign: 'ฝากขาย',
  supExpiry: 'เสี่ยงหมดอายุ', supCalendar: 'ของเข้าและ CN', supReplen: 'วางแผนสั่งผลิต', supQuota: 'Quota vs Actual', supSop: 'รอบ S&OP', supProposals: 'ข้อเสนอรออนุมัติ', allocation: 'สต็อกและโควตา',
  stockoverview: 'สต็อกและโควตา', reports: 'รายงานขายและออเดอร์', supReview: 'Supply Review', catalog: 'สินค้า', partners: 'คู่ค้าและช่องทางขาย', supIntake: 'นำเข้า Sales Out',
  supSetup: 'ข้อมูลและพารามิเตอร์ Supply', access: 'บัญชีและสิทธิ์', audit: 'ประวัติการทำงาน',
  navO2C: 'ขายและส่งมอบ', navSupply: 'วางแผนและสต็อก', navReports: 'รายงาน', navData: 'จัดการข้อมูล', navAdmin: 'ผู้ดูแลระบบ',
  workQuota: 'โควตาการขาย', workActual: 'สต็อกคลัง (WMS)', cr6Issue: 'เบิกสินค้า', workConnections: 'ระบบเชื่อมต่อ', workDocuments: 'เอกสาร SO / IV / CN',
  cr6MasterEvent: 'แก้ข้อมูลหลัก (Master data)'
});
Object.assign(dict.en, {
  overview: 'Home', orders: 'Orders', payments: 'Orders', shipping: 'Orders', soRequests: 'SO requests (MT/TT)', workQueue: 'Fulfilment & handover', returns: 'Returns & CN', opsReturns: 'Returns & CN',
  documents: 'Documents', erp: 'Connections', customers: 'Customers', ecommerce: 'Online stores', supOverview: 'Supply overview', supStock: 'Stock & projection', supConsign: 'Consignment',
  supExpiry: 'Expiry risk', supCalendar: 'Inbound & CN', supReplen: 'Replenishment', supQuota: 'Quota vs Actual', supSop: 'S&OP cycle', supProposals: 'Proposals waiting', allocation: 'Stock & quota',
  stockoverview: 'Stock & quota', reports: 'Sales & order reports', supReview: 'Supply Review', catalog: 'Products', partners: 'Partners & channels', supIntake: 'Sales Out import',
  supSetup: 'Supply data & parameters', access: 'Accounts & access', audit: 'Activity log',
  navO2C: 'ORDER TO CASH', navSupply: 'SUPPLY CHAIN', navReports: 'REPORTS', navData: 'DATA MANAGEMENT', navAdmin: 'ADMIN',
  workQuota: 'Sales quota', workActual: 'Warehouse stock (WMS)', cr6Issue: 'Stock issues', workConnections: 'Connections', workDocuments: 'Documents SO / IV / CN',
  cr6MasterEvent: 'Master data changed'
});
if (window.I18N) I18N.add(
  { nav_overview: 'ภาพรวม Supply', nav_stock: 'สต็อกและคาดการณ์', nav_consign: 'ฝากขาย', nav_calendar: 'ของเข้าและ CN', nav_report: 'Supply Review', nav_data: 'ข้อมูลและพารามิเตอร์ Supply', nav_proposals: 'ข้อเสนอรออนุมัติ' },
  { nav_overview: 'Supply overview', nav_stock: 'Stock & projection', nav_consign: 'Consignment', nav_calendar: 'Inbound & CN', nav_report: 'Supply Review', nav_data: 'Supply data & parameters', nav_proposals: 'Proposals waiting' });

/* ---------------------------------------------------------------- J1 · the menu: Home · Order to Cash · Supply chain · Reports · Data management · Admin
   (CR4_NAV is replaced in place, so the breadcrumb (c5GroupOf), the phone drawer and the tests read the same list) */
CR4_NAV.splice(0, CR4_NAV.length,
  ['home', null, ['overview']],
  ['o2c', 'navO2C', ['orders', 'soRequests', 'workQueue', 'returns', 'documents', 'customers', 'ecommerce']],
  ['supply', 'navSupply', ['supOverview', 'supStock', 'supConsign', 'supExpiry', 'supCalendar', 'supReplen', 'supQuota', 'supSop', 'allocation']],
  ['reports', 'navReports', ['reports', 'supReview']],
  ['data', 'navData', ['catalog', 'partners', 'supIntake', 'supSetup', 'erp']],
  ['admin', 'navAdmin', ['access', 'audit']]);
CR4_NAV_CLOSED.splice(0, CR4_NAV_CLOSED.length, 'data', 'admin');   // CR-04 D2 · CR-06: DATA MANAGEMENT and ADMIN start folded
const CR6_GROUP_EN = { o2c: 'ORDER TO CASH', supply: 'SUPPLY CHAIN', reports: 'REPORTS', data: 'DATA MANAGEMENT', admin: 'ADMIN' };
/** the menu item that stands for the open view (merged ids light their new home) */
const CR6_HOME = { payments: 'orders', shipping: 'orders', stockoverview: 'allocation', supProposals: 'supSop' };
function cr6MenuView(v) { return CR6_HOME[v] || v; }
if (typeof C5_FAMILY !== 'undefined') { delete C5_FAMILY.erp; C5_FAMILY.supProposals = 'supSop'; }
supNavGroups = function () {
  const btn = {};
  workspaceNav().replace(/<button data-view="([^"]+)"[\s\S]*?<\/button>/g, (m, v) => { btn[v] = m; return m; });
  [...SUP_PLAN, 'supSetup', 'supIntake', 'supSop'].filter((v, i, a) => a.indexOf(v) === i && supCanVisit(v)).forEach(v => { btn[v] = `<button data-view="${v}"><span>${SUP_ICON[v] || '◈'}</span>${t(v)}</button>`; });
  if (!btn.supSop && workCanVisit('supSop')) btn.supSop = `<button data-view="supSop"><span>⚑</span>${t('supSop')}</button>`;
  if (workCanVisit('erp')) btn.erp = `<button data-view="erp"><span>⇄</span>${t('erp')}</button>`;   // M5: its own page
  delete btn.supProposals; delete btn.stockoverview;   // M1 · M2: merged into a tab
  const act = cr6MenuView(view);
  Object.keys(btn).forEach(v => { btn[v] = btn[v].replace(/^<button data-view="([^"]+)"(?: class="[^"]*")?/, `<button data-view="$1" class="${v === act ? 'active' : ''}" title="${esc(t(v))}"`); });
  const known = new Set(CR4_NAV.flatMap(g => g[2])), st = cr4NavState(), en = lang === 'en';
  const groups = CR4_NAV.concat([['other', 'OTHER', Object.keys(btn).filter(v => !known.has(v))]]);
  return groups.map(([id, label, views]) => {
    const items = views.filter(v => btn[v]); if (!items.length) return '';
    if (!label) return `<div class="navgroup navhome" data-group="${id}"><nav>${items.map(v => btn[v]).join('')}</nav></div>`;
    const active = items.includes(act), closed = st.closed.has(id) || (CR4_NAV_CLOSED.includes(id) && !st.opened.has(id)), open = active || !closed;
    return `<div class="navgroup${open ? '' : ' collapsed'}" data-group="${id}"><button type="button" class="navhead" data-navgroup="${id}" aria-expanded="${open}"><span class="cr6-gname"${!en && CR6_GROUP_EN[id] ? ` data-en="${CR6_GROUP_EN[id]}"` : ''}>${label === 'OTHER' ? 'OTHER' : t(label)}</span><i aria-hidden="true">⌃</i></button><nav>${items.map(v => btn[v]).join('')}</nav></div>`;
  }).join('');
};

/* ---------------------------------------------------------------- D7 · old view ids keep working
   #supProposals → รอบ S&OP tab "ข้อเสนอรออนุมัติ" · #stockoverview → สต็อกและโควตา tab "สต็อกคลัง" (same id, new home in the menu) */
const cr6VisitBefore = workCanVisit;
workCanVisit = function (v) { if (v === 'supSop') return cr6VisitBefore('supSop') || cr6VisitBefore('supProposals'); return cr6VisitBefore(v); };   // M2: who saw the proposals page sees its tab
function cr6SopOwn() { return cr6VisitBefore('supSop'); }
const cr6NavBefore = navigate;
navigate = function (v) {
  if (v === 'supProposals' && workCanVisit('supSop')) { sopTab = 'props'; v = 'supSop'; }
  else if (v === 'supSop' && !cr6SopOwn()) sopTab = 'props';
  return cr6NavBefore(v);
};
const cr6RenderBefore = render;
render = function () {
  if (session && view === 'supProposals' && workCanVisit('supSop')) { view = 'supSop'; sopTab = 'props'; if (/^#\/supply\/proposals/.test(location.hash)) history.replaceState(null, '', location.pathname + '#/supply/sop'); }
  if (session && view === 'supSop' && !cr6SopOwn()) sopTab = 'props';
  cr6RenderBefore();
};

/* ---------------------------------------------------------------- DM · master data read functions (one place for product / partner data)
   Edits are kept in db.master (with who / when) and written into the tables every page already reads (db.productMaster ·
   the Ops product list · the Supply SKU and account tables), so a change shows everywhere at once. */
function cr6M() { if (!db.master) db.master = {}; db.master.sku = db.master.sku || {}; db.master.partner = db.master.partner || {}; return db.master; }
function cr6SupDB() { return window.Supply && Supply.App && Supply.App.DB ? Supply.App.DB : null; }
function masterSku(id) {
  if (!id) return null;
  const pm = (db.productMaster || []).find(p => p.sku === id), S = cr6SupDB(), ss = S && S.skuIdx && S.skuIdx.has(id) ? S.skus[S.skuIdx.get(id)] : null, ov = cr6M().sku[id] || {};
  if (!pm && !ss) return null;
  const aliases = [];
  const al = Object.assign({}, typeof SUP_SKU_ALIAS !== 'undefined' ? SUP_SKU_ALIAS : {}, db.skuAlias || {});
  Object.entries(al).forEach(([o, n]) => { if (n === id) aliases.push({ kind: 'alias', code: o }); });
  if (pm && pm.barcode) aliases.push({ kind: 'barcode', code: String(pm.barcode) });
  if (pm && pm.erpSku) aliases.push({ kind: 'erp', code: String(pm.erpSku) });
  Object.entries(db.soIntakeConfig || {}).forEach(([acc, c]) => Object.entries((c && c.map) || {}).forEach(([code, sku]) => { if (sku === id) aliases.push({ kind: 'partner', code, partner: acc }); }));
  return {
    sku: id, name: ov.name || (pm && pm.name) || (ss && ss.name) || id, brand: ov.brand || (pm && pm.brand) || (ss && ss.brand) || '', category: (pm && pm.category) || (ss && ss.category) || '',
    erp: (pm && pm.erpSku) || '', barcode: (pm && pm.barcode) ? String(pm.barcode) : '', status: (pm && pm.status) || (ss && ss.status) || '', active: pm ? pm.active !== false : true,
    leadTime: ss ? ss.lead_time_days : null, moq: ss ? ss.moq : null, unit: (pm && pm.unit) || (ss && ss.uom) || '', price: pm ? pm.price : (ss ? ss.std_price : null), aliases, inOps: !!pm, inSupply: !!ss
  };
}
function masterSkuList() { const ids = new Set((db.productMaster || []).map(p => p.sku)); const S = cr6SupDB(); if (S) S.skus.forEach(s => ids.add(s.sku)); return [...ids].sort().map(masterSku).filter(Boolean); }
function masterPartner(id) {
  const p = db.partners.find(x => x.id === id); if (!p) return null;
  const S = cr6SupDB(), acc = S && S.accIdx && S.accIdx.has(id) ? S.accounts[S.accIdx.get(id)] : null;
  const managers = (db.channelUsers || []).filter(u => (u.channelIds || []).includes(id)).map(u => u.name);   // who looks after the partner (edited in บัญชีและสิทธิ์ — D6)
  return { id, name: p.name, type: p.type, channel: p.channel, area: p.area, sales: p.sales, consignment: !!p.consignment, account: acc ? acc.account_id : null, supplyChannel: acc ? acc.channel : null, managers };
}
/** a master edit — kept with who / when, written into every table the pages read, audited */
function masterSkuSet(id, patch) {
  const m = cr6M(), prev = m.sku[id] || {}, pm = (db.productMaster || []).find(p => p.sku === id);
  if (!prev.orig) prev.orig = { name: pm ? pm.name : (masterSku(id) || {}).name, brand: pm ? pm.brand : (masterSku(id) || {}).brand };
  m.sku[id] = Object.assign(prev, patch, { at: Date.now(), by: session ? session.role : '' });
  if (pm) { if (patch.name) pm.name = patch.name; if (patch.brand) pm.brand = patch.brand; }
  const sp = typeof seedProducts !== 'undefined' ? seedProducts.find(p => p[0] === id) : null; if (sp && patch.name) sp[1] = patch.name;
  cr6ApplySupply(true); if (typeof log === 'function') log('cr6MasterEvent', id + ' · ' + Object.keys(patch).join(', ')); persist(); return masterSku(id);
}
function masterSkuReset(id) { const m = cr6M(), o = m.sku[id]; if (!o) return; const orig = o.orig || {}; masterSkuSet(id, { name: orig.name, brand: orig.brand }); delete m.sku[id]; cr6ApplySupply(true); persist(); }
function masterPartnerSet(id, patch) {
  const m = cr6M(), p = db.partners.find(x => x.id === id); if (!p) return null;
  const prev = m.partner[id] || { orig: { name: p.name } }; m.partner[id] = Object.assign(prev, patch, { at: Date.now(), by: session ? session.role : '' });
  if (patch.name) p.name = patch.name; cr6ApplySupply(true); if (typeof log === 'function') log('cr6MasterEvent', id + ' · ' + Object.keys(patch).join(', ')); persist(); return masterPartner(id);
}
function masterPartnerReset(id) { const m = cr6M(), o = m.partner[id]; if (!o) return; masterPartnerSet(id, { name: o.orig.name }); delete m.partner[id]; cr6ApplySupply(true); persist(); }
/* the Supply tables are rebuilt from the CSV files after every Ops change — put the master edits back before the model is computed */
let cr6SupApplied = null;
function cr6ApplySupply(force) {
  const S = cr6SupDB(); if (!S || (!force && cr6SupApplied === S)) return; cr6SupApplied = S; const m = cr6M();
  Object.entries(m.sku).forEach(([id, o]) => { if (!S.skuIdx || !S.skuIdx.has(id)) return; const s = S.skus[S.skuIdx.get(id)]; if (o.name) s.name = o.name; if (o.brand) s.brand = o.brand; });
  Object.entries(m.partner).forEach(([id, o]) => { if (!S.accIdx || !S.accIdx.has(id)) return; if (o.name) S.accounts[S.accIdx.get(id)].name = o.name; });
  if (force && Supply.App) Supply.App._modelKey = null;   // the next model() reads the new names
}
if (window.Supply && Supply.App) { const cr6ModelBefore = Supply.App.model; Supply.App.model = function () { cr6ApplySupply(false); return cr6ModelBefore.apply(this, arguments); }; }

/* a typed / pasted Ops hash (#stockoverview · #allocation?from=… · #erp) opens that page — old ids land on their new home (D7) */
window.addEventListener('hashchange', () => {
  if (!session) return; const m = /^#([a-zA-Z]+)(?:\?.*)?$/.exec(location.hash); if (!m) return;
  const v = m[1]; if (v === view || !(typeof OPS_VIEWS_CR6 !== 'undefined' ? OPS_VIEWS_CR6 : []).includes(v)) return;
  if (navigate(v) !== false) render();
});
const OPS_VIEWS_CR6 = ['overview', 'orders', 'payments', 'shipping', 'ecommerce', 'customers', 'catalog', 'allocation', 'stockoverview', 'partners', 'soRequests', 'workQueue', 'documents', 'erp', 'reports', 'access', 'audit', 'returns'];

/* ---------------------------------------------------------------- asked during CR-06 (26 พ.ย. 2026): ผู้ดูแลระบบ (Admin) opens every page — view only.
   Admin already had every Ops page; it gets the Supply pages + the "view Supply" right. Action rights (approve · propose · export …) stay as they were. */
if (typeof SUP_ROLE_PAGES !== 'undefined') SUP_ROLE_PAGES.admin = [...new Set([...SUP_PLAN, 'supSop', 'supIntake', 'supSetup'])];
if (typeof SUP_RULES !== 'undefined' && SUP_RULES['supply.view']) {
  const r = SUP_RULES['supply.view'], c0 = r.ceil, d0 = r.def;
  r.ceil = p => p.role === 'admin' || c0(p); r.def = p => p.role === 'admin' || d0(p);
}
