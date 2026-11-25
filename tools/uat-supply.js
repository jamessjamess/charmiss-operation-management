/* tools/uat-supply.js — CR-01 browser checks for the Supply part of Charmiss Ops (run in the DevTools console on the app page,
   or inject it). Not loaded by index.html. Each check returns plain data; SupUAT.all() runs everything.

   SUP-MENU-{role}   Supply menu per role (CR-01 7.3) + direct links to hidden pages refused
   SUP-NOLEAK-{mgr}  department-locked Managers: no other department's account / channel in Supply pages, charts, the SKU drawer
   SUP-ANCHOR        the CR-01 2.3 numbers on the Integrated demo (AS OF 23 Nov 2026 · Weekly · L4W · 3M · no filter)
   SUP-THEME         Light / Dark render every Supply page without errors */
(function (global) {
  'use strict';
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const errors = [];
  global.addEventListener('error', e => errors.push(String(e.message)));
  global.addEventListener('unhandledrejection', e => errors.push('rejection: ' + String(e.reason && e.reason.message || e.reason)));
  const PROFILES = [['director'], ['manager', 'mgr-mt'], ['manager', 'mgr-tt'], ['manager', 'mgr-ecom'], ['salesAdmin', 'sa-mt'], ['salesAdmin', 'sa-tt'],
    ['salesAdmin', 'sa-ecom'], ['admin'], ['finance'], ['warehouse'], ['planner']];
  const SUP = ['supOverview', 'supStock', 'supExpiry', 'supConsign', 'supCalendar', 'supReplen', 'supQuota', 'supProposals', 'supReview', 'supSetup'];
  /* CR-01 7.3 — the expected Supply menu per profile */
  const EXPECT = {
    director: 'Overview,Stock,Expiry,Consign,Calendar,Replen,Quota,Proposals,Review',
    'mgr-mt': 'Overview,Stock,Expiry,Consign,Calendar,Quota,Proposals,Review', 'mgr-tt': 'Overview,Stock,Expiry,Calendar,Quota,Proposals,Review',
    'mgr-ecom': 'Overview,Stock,Expiry,Calendar,Quota,Proposals,Review', 'sa-mt': '', 'sa-tt': '', 'sa-ecom': '',
    admin: 'Setup', finance: 'Calendar,Review', warehouse: 'Expiry,Calendar', planner: 'Overview,Stock,Expiry,Consign,Calendar,Replen,Quota,Proposals,Review,Setup'
  };
  const ANCHOR = { stockValue: 50091183, whV: 39518371, consV: 10572812, units: '514864/136418/651282', doc: 73, sellThrough: 17.8,
    status: '7/2/9/98/4/+7', risk3M: '547597/4489', recall: '519974/11/7194', quotaFit: '92/107/116', mape: 13.5, bias: -4.2, fill: 93.1, achMTD: 94.1 };

  async function login(role, userId) {
    if (typeof session !== 'undefined' && session) { if (typeof global.logoutForUserSwitch === 'function') global.logoutForUserSwitch(); global.render(); await wait(80); }
    const sel = document.querySelector('#loginRole'); sel.value = role; sel.dispatchEvent(new Event('change'));
    if (userId) document.querySelector('#managerLoginUser').value = userId;
    document.querySelector('#login').click(); await wait(150);
  }
  const esc = s => s.replace(/[.*+?^${}()|[\]\\']/g, '\\$&');
  const word = s => new RegExp('(^|[^A-Za-z])' + esc(s) + '($|[^A-Za-z])');

  async function menu() {
    const res = [];
    for (const [r, u] of PROFILES) {
      await login(r, u);
      const sup = [...document.querySelectorAll('aside nav button[data-view]')].map(b => b.dataset.view).filter(v => v.startsWith('sup')).map(v => v.slice(3)).join(',');
      const refused = SUP.filter(v => !sup.split(',').includes(v.slice(3))).every(v => global.navigate(v) === false);
      res.push({ id: 'SUP-MENU-' + (u || r), pass: sup === EXPECT[u || r] && refused, menu: sup, refused });
    }
    return res;
  }

  async function noleak(userId) {
    await login('manager', userId);
    const App = global.App; await global.Supply.ensureData();
    const lock = global.supLockChannel();
    const foreign = App.DB.accounts.filter(a => a.channel !== lock).map(a => a.name).filter(n => n.length > 3);
    const foreignCh = ['MT', 'TT', 'ECOM'].filter(c => c !== lock);
    const hits = [];
    const scan = (where, txt) => {
      foreign.forEach(n => { if (word(n).test(txt)) hits.push(where + ': ' + n); });
      foreignCh.forEach(c => { if (word(c).test(txt)) hits.push(where + ': ' + c); });
    };
    for (const v of SUP.filter(v => global.workCanVisit(v))) {
      global.navigate(v); await wait(v === 'supProposals' ? 200 : 1100);
      scan(v, (document.querySelector('#supRoot') || document.querySelector('#page')).innerText);   // the proposals page (Phase C) is an Ops-style page
      Object.values(global.Chart.instances || {}).forEach(c => scan(v + ' chart', [...(c.data.labels || []), ...(c.data.datasets || []).map(d => d.label || '')].join(' | ')));
      if (v === 'supStock') {                       // open the SKU drawer of the first row too
        const sku = App.model().rows[0].sku; App.openSku(sku); await wait(500);
        scan('drawer ' + sku, document.querySelector('#supDrawer').innerText); App.closeSku(); global.U.drawer.close();
      }
    }
    global.navigate('overview'); await wait(400); const card = document.querySelector('.sup-b4'); if (card) scan('B4 card', card.innerText);
    global.navigate('workQueue'); await wait(150); scan('work queue', document.querySelector('#page').innerText.split(String.fromCharCode(10)).filter(l => /SPR-/.test(l)).join(' '));
    return { id: 'SUP-NOLEAK-' + userId, pass: hits.length === 0, lock, hits: [...new Set(hits)].slice(0, 20) };
  }

  async function anchors() {
    await login('director'); global.navigate('supOverview');
    const App = global.App, Calc = global.Calc;
    for (let k = 0; k < 50 && !(App.F && App.DB && document.querySelector('#supRoot .kpi')); k++) await wait(200);   // data loaded and page drawn
    App.setF({ asDn: Calc.dn('2026-11-23'), view: 'W', rr: 'L4W', h: 3, ch: [], acc: [], brand: [], cat: [], q: '' });
    const M = App.model(), k = M.kpi, S = M.S;
    const wh = M.rows.reduce((x, r) => x + r.whSel, 0), cons = M.rows.reduce((x, r) => x + r.consSel, 0);
    const whV = M.rows.reduce((x, r) => x + r.whSel * r.cost, 0), cV = M.rows.reduce((x, r) => x + r.consSel * r.cost, 0);
    const C = Calc.consignmentOf(App.DB, M.rows, M.asDn, M.period, M.mask, S), rec = C.pairs.filter(p => p.recall);
    const Q = Calc.quotaOf(App.DB, M, 3), mtd = Q.monthly.find(x => x.mtd), sc = M.statusCount;
    const got = { stockValue: Math.round(k.stockValue), whV: Math.round(whV), consV: Math.round(cV), units: [wh, cons, wh + cons].map(Math.round).join('/'),
      doc: Math.round(k.doc), sellThrough: +k.sellThrough.toFixed(1), status: [sc.stockout, sc.reorder, sc.overstock, sc.healthy, sc.npd].join('/') + '/+' + sc.expiry,
      risk3M: Math.round(k.riskBy[1][1]) + '/' + Math.round(k.riskBy[1][0]), recall: Math.round(C.kpi.recallV) + '/' + rec.length + '/' + Math.round(rec.reduce((x, p) => x + p.recall.qty, 0)),
      quotaFit: Math.round(k.quotaFit) + '/' + k.quotaFitOk + '/' + k.quotaFitN, mape: +Q.kpi.mape.toFixed(1), bias: +Q.kpi.bias.toFixed(1), fill: +Q.kpi.fillRate.toFixed(1), achMTD: +(mtd.si / mtd.q * 100).toFixed(1) };
    const diff = Object.keys(ANCHOR).filter(key => String(ANCHOR[key]) !== String(got[key]));
    return { id: 'SUP-ANCHOR', pass: diff.length === 0 && App.sc.ok && Calc.modelCheck(M).every(c => c.ok), selfCheck: App.sc.checks.map(c => c.id + ':' + (c.ok ? 'PASS' : 'FAIL')).join(' '), diff, got };
  }

  async function theme() {
    await login('planner'); const res = [];
    for (const m of ['light', 'dark']) {
      const s = document.querySelector('#themeSel'); s.value = m; s.dispatchEvent(new Event('change')); await wait(200);
      const before = errors.length;
      for (const v of SUP) { global.navigate(v); await wait(v === 'supOverview' ? 1500 : 700); }
      res.push({ id: 'SUP-THEME-' + m, pass: document.documentElement.dataset.theme === m && errors.length === before, errors: errors.slice(before) });
    }
    return res;
  }

  /* OPS-GATE-{role}: every Ops page opens or is refused exactly as in Ops 7.0 (matrix taken from the original public build),
     with no error and no "undefined / NaN" on the page. The Planner row is new (CR-01). */
  const OPS = ['overview', 'orders', 'payments', 'shipping', 'ecommerce', 'customers', 'catalog', 'allocation', 'stockoverview', 'partners', 'soRequests', 'workQueue', 'documents', 'erp', 'reports', 'access', 'audit', 'returns'];
  const OPS_DENIED = { director: '', 'mgr-mt': 'ecommerce,stockoverview', 'mgr-tt': 'ecommerce,stockoverview', 'mgr-ecom': 'stockoverview,soRequests',
    'sa-mt': 'ecommerce,stockoverview', 'sa-tt': 'ecommerce,stockoverview', 'sa-ecom': 'stockoverview,soRequests', admin: '', finance: 'ecommerce,customers',
    warehouse: 'ecommerce,customers,soRequests,reports', planner: 'ecommerce,customers,stockoverview,soRequests' };
  async function opsGate() {
    const res = [];
    for (const [r, u] of PROFILES) {
      await login(r, u);
      const denied = [], broken = [];
      for (const v of OPS) {
        const before = errors.length; let ok;
        try { ok = global.navigate(v); } catch (e) { broken.push(v + ': ' + e.message); continue; }
        await wait(30);
        if (ok === false) { denied.push(v); continue; }
        const txt = (document.querySelector('#page') || {}).innerText || '';
        if (errors.length > before || /undefined|NaN|\[object Object\]/.test(txt)) broken.push(v);
      }
      res.push({ id: 'OPS-GATE-' + (u || r), pass: denied.join(',') === OPS_DENIED[u || r] && !broken.length, denied: denied.join(','), broken });
    }
    return res;
  }
  /* SUP-MOBILE: no horizontal overflow on any page the profile can open (run with the viewport at 390 px) */
  async function mobile(profiles) {
    const res = [];
    for (const [r, u] of (profiles || PROFILES)) {
      await login(r, u);
      const over = [];
      for (const v of OPS.concat(SUP)) {
        if (!global.workCanVisit(v)) continue;
        global.navigate(v); await wait(v.startsWith('sup') ? 900 : 50);
        if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) over.push(v);
      }
      res.push({ id: 'SUP-MOBILE-' + (u || r), pass: !over.length && document.documentElement.clientWidth <= 400, width: document.documentElement.clientWidth, overflow: over });
    }
    return res;
  }

  /* ---------------------------------------------------------------- Phase B · Data Adapter (run on a fresh Integrated demo)
     SUP-FLOW: order → SO / IV (SLA) → WMS ready → handover → WMS read → Delivered → WMS read → return (Good / Bad) → WMS receipt → WMS read
     SUP-FEED-DELIVERED · SUP-FEED-IDEMP · SUP-READONLY · SUP-CN-COND · SUP-SC-7/8/9 · SUP-ANCHOR after the flow (AS OF 23 Nov unchanged) */
  const okr = (r, step) => { if (!r || r.ok === false) throw new Error(step + ': ' + JSON.stringify(r && (r.error || r))); return r; };
  async function supplyAt(asDn) {           // unfiltered model at an AS OF (default: the latest), after the feed has been rebuilt
    await global.Supply.ensureData();
    const App = global.App, Calc = global.Calc;
    if (asDn == null) asDn = App.DB.maxAsOf;
    const F = { asDn, view: 'W', ch: [], acc: [], brand: [], cat: [], q: '', rr: 'L4W', h: 3 };
    return Calc.computeModel(App.DB, F, App.S, {});
  }
  const rowOf = (M, sku) => M.rows.find(r => r.sku === sku);
  const scAll = () => global.App.sc.checks.map(c => c.id + ':' + (c.ok ? 'PASS' : 'FAIL')).join(' ');
  async function flow() {
    const res = [], App = global.App, Calc = global.Calc, step = (id, pass, info) => res.push(Object.assign({ id, pass: !!pass }, info || {}));
    if (global.supDataset() !== 'integrated' || !db.feedBase) return [{ id: 'SUP-FLOW', pass: false, info: 'needs a fresh Integrated demo' }];
    const acc = 'A01', qty = 40;                                            // 7-Eleven (MT, consignment)
    await global.Supply.ensureData();
    await login('salesAdmin', 'sa-mt');
    const sku = db.productMaster.map(m => m.sku).find(s => global.opsMaster(s)?.active && global.quotaFor(acc, s) - global.consumedFor(acc, s) >= 80 && free(s) >= 80 && global.workPhysicalAvailable(s) >= 80);
    const base = await supplyAt(), b = rowOf(base, sku), j = App.DB.accIdx.get(acc), anchorAs = Calc.dn('2026-11-23');
    const wh0 = b.wh, cons0 = b.cons[j], tot0 = b.totalAll, wms0 = global.wmsRow(sku).onHand;
    // 1) order → confirm → quota check → SO request (Sales Admin MT)
    const now = Date.now(), id = 'OR-UAT-' + String(now).slice(-6);
    db.orders.unshift({ id, customer: 'UAT Supply flow', phone: '080-000-0000', address: 'Demo', billingAddress: 'Demo', partner: acc, channel: 'originManual', payment: 'cod', pay: 'unpaid',
      lines: [{ sku, qty, price: 199 }], sku, qty, price: 199, vat: 7, confirmed: false, status: 'orderPending', ship: 'toShip', tracking: '', salesOwner: partner(acc).sales,
      externalId: 'UAT-' + id, tags: ['MT'], internalNote: '', events: [], packed: {}, time: now });
    const o = () => db.orders.find(x => x.id === id);
    global.orderEvent(o(), 'eventCreated'); global.persist();
    okr(global.orderTransition(o(), 'confirm'), 'confirm'); okr(global.orderTransition(o(), 'quota'), 'quota');
    const prev = okr(global.soPrepare(id), 'soPrepare'); okr(global.soSubmit(prev), 'soSubmit');
    // 2) SLA acknowledges SO and IV (ERP)
    await login('finance');
    const so = global.soActiveForOrder(id); okr(global.soReadResult(so.id, 'SO'), 'ackSO'); okr(global.soReadResult(so.id, 'IV'), 'ackIV');
    // 3) WMS ready → handover → WMS read (Warehouse)
    await login('warehouse');
    okr(global.fuMockWMS(id, 'ready'), 'wmsReady'); const pm = okr(global.fuPrepareManifest([id]), 'prepManifest'); const m = okr(global.fuCreateManifest(pm), 'manifest').manifest;
    const ivOnly = await supplyAt();                         // IV issued, not left the WMS yet → nothing moves in Supply
    step('SUP-FEED-DELIVERED (IV, not shipped)', (App.DB.it[App.DB.skuIdx.get(sku)] || []).length === 0 && Math.abs(rowOf(ivOnly, sku).wh - wh0) < 0.5);
    okr(global.fuConfirmManifest(m.id, { receiver: 'UAT carrier', reference: 'UAT-' + id }), 'handover');
    okr(global.wmsRefreshMock(), 'wmsRead1');
    let M = await supplyAt(), r = rowOf(M, sku);
    step('SUP-FEED-DELIVERED (in transit)', Math.abs(r.itAll - qty) < 0.5 && Math.abs(r.wh - (wh0 - qty)) < 0.5 && Math.abs(r.totalAll - tot0) < 0.5 && Math.abs(global.wmsRow(sku).onHand - (wms0 - qty)) < 0.5,
      { sku, asOf: Calc.iso(M.asDn), it: r.itAll, wh: [wh0, r.wh], total: [tot0, r.totalAll], sc: scAll() });
    // 4) carrier delivered → WMS read
    okr(global.fuMockCarrier(id, 'delivered'), 'delivered'); okr(global.wmsRefreshMock(), 'wmsRead2');
    M = await supplyAt(); r = rowOf(M, sku);
    const i = App.DB.skuIdx.get(sku), siWeek = App.DB.cumSI[i][j][App.DB.nWeeks] - App.DB.cumSI[i][j][App.DB.wk(anchorAs)];
    step('SUP-FEED-DELIVERED (Sales In / Remaining)', Math.abs(r.itAll) < 0.5 && Math.abs(r.cons[j] - (cons0 + qty)) < 0.5 && Math.abs(siWeek - qty) < 0.5 && Math.abs(r.totalAll - tot0) < 0.5,
      { salesIn: siWeek, remaining: [cons0, r.cons[j]], sc: scAll() });
    // 5) idempotent: the same carrier event again and the feed read twice change nothing; building the feed never writes Ops
    const before = JSON.stringify(db), f1 = JSON.stringify(global.supplyFeed(App.base).raw), f2 = JSON.stringify(global.supplyFeed(App.base).raw), after = JSON.stringify(db);
    const again = global.fuReceiveCarrier((db.carrierEvents || []).filter(e => e.orderId === id).map(e => { const x = Object.assign({}, e); delete x.payload; return x; })[0]);
    M = await supplyAt();
    const siAgain = App.DB.cumSI[i][j][App.DB.nWeeks] - App.DB.cumSI[i][j][App.DB.wk(anchorAs)];
    step('SUP-FEED-IDEMP', f1 === f2 && Math.abs(siAgain - qty) < 0.5 && again && (again.already || again.ok === false), { replay: again });
    step('SUP-READONLY', before === after);
    // 6) return 30 (Good 25 / Bad 5): request (Sales Admin) → inspect (Warehouse; Bad needs a reason) → WMS receipt → WMS read
    await login('salesAdmin', 'sa-mt');
    const rq = okr(global.opsReturnRequest(o(), [{ sku, qty: 30 }], 'UAT slow seller'), 'returnRequest').return;
    await login('warehouse');
    const noReason = global.opsInspectReturn(rq.id, [{ sku, good: 25, damaged: 5 }], '');
    okr(global.opsInspectReturn(rq.id, [{ sku, good: 25, damaged: 5 }], 'UAT dented box'), 'inspect');
    okr(global.wmsAcknowledgeReturn(rq.id, 'WMS-RET-' + id), 'wmsReturn'); okr(global.wmsRefreshMock(), 'wmsRead3');
    M = await supplyAt(); r = rowOf(M, sku);
    const cnRows = (App.DB.cn[i] || []).filter(c => c.cn_no === rq.id);
    step('SUP-CN-COND', noReason && noReason.ok === false && cnRows.some(c => c.good && c.qty === 25 && c.status === 'Received') && cnRows.some(c => !c.good && c.qty === 5));
    step('SUP-FLOW (CN Good → WH up, consignment down)', Math.abs(r.wh - (wh0 - qty + 25)) < 0.5 && Math.abs(r.cons[j] - (cons0 + qty - 30)) < 0.5 && Math.abs(r.totalAll - (tot0 - 5)) < 0.5,
      { wh: [wh0, r.wh], remaining: [cons0, r.cons[j]], total: [tot0, r.totalAll] });
    ['wms', 'delivered', 'quota_ops'].forEach(id2 => { const c = App.sc.checks.find(x => x.id === id2); step('SUP-SC-' + { wms: 7, delivered: 8, quota_ops: 9 }[id2], c && c.ok, { n: c && c.n, of: c && c.total }); });
    step('selfCheck 1–9', App.sc.ok, { checks: scAll() });
    // 7) AS OF 23 Nov (before every event) still gives the CR-01 anchors
    const a = await anchors(); step('SUP-ANCHOR (after the flow)', a.pass, { diff: a.diff });
    return res;
  }

  /* ---------------------------------------------------------------- Phase C · B1–B5 + F7 (run on a fresh Integrated demo)
     SUP-PROP-{recall,quota,po} · SUP-PROP-MERGE · SUP-PROP-SELF · SUP-PROP-REJECT · SUP-ETA · SUP-ATP-{MT,TT,Ecom} · SUP-B2-MATCH · SUP-B4 · SUP-B5 */
  async function phaseC() {
    const res = [], App = global.App, Calc = global.Calc, step = (id, pass, info) => res.push(Object.assign({ id, pass: !!pass }, info || {}));
    if (global.supDataset() !== 'integrated' || !db.feedBase) return [{ id: 'SUP-PHASE-C', pass: false, info: 'needs a fresh Integrated demo' }];
    const S = global.Supply, act = (id, a, arg) => global.supPropAct(id, a, arg);
    await login('planner'); global.navigate('supQuota'); await S.ensureData();
    for (let k = 0; k < 40 && !App.F; k++) await wait(200);
    const DB = App.DB, nextM = Calc.monthKey(Calc.addMonths(Calc.monthStart(Calc.dn(dateKey(Date.now()))), 1));
    // a recall candidate (consignment), a quota pair of A01 (MT) and a SKU to plan
    const M0 = App.model(), C = Calc.consignmentOf(DB, M0.rows, M0.asDn, M0.period, M0.mask, M0.S), rc = C.pairs.find(p => p.recall && DB.accounts[p.j].channel === 'MT');
    const qSku = DB.skus.find(s => (DB.quota[s.i].get('2026-11') || [])[DB.accIdx.get('A01')] > 0).sku, poSku = (M0.rows.find(r => r.suggestedQty > 0 && global.supAtpSources(r.sku).length === 0) || M0.rows.find(r => r.suggestedQty > 0)).sku;   // no other inbound, so the ATP date can only come from this PO
    // 1) create · merge · submit (Planner)
    const pr = global.supPropose({ type: 'recall', sku: rc.sku, account: DB.accounts[rc.j].account_id, qty: Math.round(rc.recall.qty), value: Math.round(rc.recall.value), dest: rc.recall.to || 'Clearance' });
    const pq1 = global.supPropose({ type: 'quota', sku: qSku, account: 'A01', period: nextM, qty: 500 }), pq2 = global.supPropose({ type: 'quota', sku: qSku, account: 'A01', period: nextM, qty: 600 });
    const pp = global.supPropose({ type: 'po', sku: poSku, qty: 1000, value: 1, lt: 30 });
    step('SUP-PROP-MERGE', pq1.ok && pq2.ok && pq2.merged && pq2.prop.id === pq1.prop.id && pq2.prop.qty === 600 && db.supplyProposals.filter(p => p.key === pq1.prop.key).length === 1);
    [pr, pq1, pp].forEach(x => act(x.prop.id, 'submit'));
    const planApprove = act(pp.prop.id, 'approve');                                        // the Planner has no approve right
    // 2) creators never approve their own · reject needs a reason (Director, who may also propose once allowed)
    await login('director');
    global.fuSetPermission('director', 'supply.propose', true);
    const own = global.supPropose({ type: 'po', sku: M0.rows.find(r => r.sku !== poSku).sku, qty: 500, lt: 20 }); act(own.prop.id, 'submit');
    const selfApprove = act(own.prop.id, 'approve');
    step('SUP-PROP-SELF', planApprove.ok === false && selfApprove.ok === false && selfApprove.error === 'propSelf');
    await login('planner'); const p4 = global.supPropose({ type: 'po', sku: M0.rows[3].sku, qty: 300, lt: 15 }); act(p4.prop.id, 'submit');
    await login('director');
    const rj0 = act(p4.prop.id, 'reject', ''), rj1 = act(p4.prop.id, 'reject', 'UAT not needed this month');
    step('SUP-PROP-REJECT', rj0.ok === false && rj1.ok && rj1.prop.status === 'rejected' && db.logs.some(l => l.event === 'propEvent' && l.ref.includes(p4.prop.id + ' · rejected')));
    // 3) approvals → drafts downstream (Director: recall + PO · Manager MT: quota of its own account)
    const ar = act(pr.prop.id, 'approve'), ap = act(pp.prop.id, 'approve');
    await login('manager', 'mgr-mt'); const aq = act(pq1.prop.id, 'approve');
    await S.ensureData();
    const rcl = (db.recallRequests || []).find(r => r.proposalId === pr.prop.id), qd = db.allocations.find(a => a.proposalId === pq1.prop.id), poNo = ar && ap.prop.downstream.id;
    step('SUP-PROP-recall', ar.ok && rcl && rcl.status === 'draft' && App.raw.cn.some(c => c.cn_no === rcl.id && c.status === 'Planned'));
    step('SUP-PROP-quota (draft, not in this month)', aq.ok && qd && qd.status === 'draft' && qd.month === nextM && global.quotaFor('A01', qSku) === Math.round(DB.quota[DB.skuIdx.get(qSku)].get('2026-11')[DB.accIdx.get('A01')]));
    step('SUP-PROP-po (Planned)', ap.ok && App.raw.po_inbound.some(p => p.po_no === poNo && p.status === 'Planned'));
    // 4) the drafts go on through the usual Ops flows → the proposals become Done; an approved next-month quota reaches Supply
    await login('salesAdmin', 'sa-mt');
    const r1 = global.supRecallAct(rcl.id, 'requested'), r2 = global.supQuotaDraftSend(qd.id);
    await login('admin'); global.changeAllocation(qd.id, 'approved');
    await S.ensureData();
    const qi = DB.skuIdx.get(qSku), decQ = App.DB.quota[qi].get(nextM), propsDone = [pr, pq1].every(x => db.supplyProposals.find(p => p.id === x.prop.id).status === 'done');
    step('SUP-PROP-downstream', r1.ok && r2.ok && propsDone && decQ && Math.abs(decQ[App.DB.accIdx.get('A01')] - 600) < 0.5 && App.sc.checks.find(c => c.id === 'quota_ops').ok, { dec: decQ && decQ[App.DB.accIdx.get('A01')] });
    // 5) ATP: Planned PO is not counted; Confirmed (F7) is, and the date follows the ETA
    await login('planner');
    const pi = App.DB.skuIdx.get(poSku), base = global.workPhysicalAvailable(poSku), need = base + 600;
    await S.ensureData(); const atp0 = global.supAtp(poSku, need);
    const eta = Calc.iso(Calc.dn(dateKey(Date.now())) + 20), noReason = global.supPoSave(poNo, { eta: Calc.iso(Calc.dn(eta) + 30), status: 'Planned', reason: '' });
    const ok1 = global.supPoSave(poNo, { eta, status: 'Confirmed', reason: '' });
    await S.ensureData(); const atp1 = global.supAtp(poSku, need);
    const ok2 = global.supPoSave(poNo, { eta: Calc.iso(Calc.dn(eta) + 10), status: 'Delayed', reason: 'UAT supplier late' });
    await S.ensureData(); const atp2 = global.supAtp(poSku, need), hist = db.poPlan.edits[poNo].history.length;
    const ok3 = global.supPoSave(poNo, { eta: Calc.iso(Calc.dn(eta) + 10), status: 'Shipped', reason: 'UAT on the way' });
    await S.ensureData(); const atp3 = global.supAtp(poSku, need), p5 = App.DB.po[pi].find(p => p.po_no === poNo);
    step('SUP-ETA', noReason.ok === false && ok1.ok && ok2.ok && ok3.ok && hist === 2 && p5 && p5.status === 'Shipped' && p5.eta === Calc.dn(eta) + 10 && db.supplyProposals.find(p => p.id === pp.prop.id).status === 'done', { history: hist });
    step('SUP-ATP (Planned ignored · Confirmed / Shipped counted · ETA moves the date)', !atp0.date && atp1.date === Calc.dn(eta) && !atp2.date && atp3.date === Calc.dn(eta) + 10, { atp0, atp1: atp1.date && Calc.iso(atp1.date), atp3: atp3.date && Calc.iso(atp3.date) });
    // 6) ATP on the SO form for MT / TT and on the order page for Ecom (WMS short → the date shows, nothing is unblocked)
    const mkOrder = async (role, user, acc, tag) => {
      await login(role, user);
      const id = 'OR-UAT-' + tag + String(Date.now()).slice(-5);
      db.orders.unshift({ id, customer: 'UAT ATP', phone: '080', address: 'Demo', billingAddress: 'Demo', partner: acc, channel: 'originManual', payment: 'cod', pay: 'unpaid', lines: [{ sku: poSku, qty: need, price: 100 }], sku: poSku, qty: need, price: 100, vat: 7, confirmed: false, status: 'orderPending', ship: 'toShip', tracking: '', salesOwner: partner(acc).sales, externalId: 'UAT-' + id, tags: [partner(acc).type], internalNote: '', events: [], packed: {}, time: Date.now() });
      global.orderEvent(db.orders[0], 'eventCreated'); global.persist(); global.orderTransition(db.orders[0], 'confirm');
      return id;
    };
    for (const [role, user, acc, tag] of [['salesAdmin', 'sa-mt', 'A01', 'MT'], ['salesAdmin', 'sa-tt', 'A08', 'TT'], ['salesAdmin', 'sa-ecom', 'A10', 'EC']]) {
      const id = await mkOrder(role, user, acc, tag);
      let shown = false, blocked = true;
      if (tag !== 'EC') { global.soRequestForm(id); await wait(150); shown = !!document.querySelector('#modal .sup-atp'); blocked = !!document.querySelector('#soRequestForm button[type="submit"][disabled]'); document.querySelector('#modal').close(); }
      else { const html = global.orderWorkspace(db.orders.find(o => o.id === id)); shown = /sup-atp/.test(html); }
      step('SUP-ATP-' + tag, shown && blocked, { order: id });
    }
    // 7) B2 = Quota vs Actual for the same account × SKU (same filter, AS OF, formulas)
    await login('manager', 'mgr-mt'); global.navigate('supQuota'); for (let k = 0; k < 40 && !document.querySelector('#qHost'); k++) await wait(200);
    const b2 = global.supB2('A01', qSku, 0), Q = global.Pages.quotaData(App, 3), pq = Q.pairs.find(p => p.sku === qSku && p.accId === 'A01');
    step('SUP-B2-MATCH', b2 && pq && (b2.fit == null ? pq.fit == null : Math.abs(b2.fit - pq.fit) < 0.01) && (pq.mape == null || Math.abs(b2.mape - pq.mape) < 0.01) && (pq.coverage == null || Math.abs(b2.cov[1] - pq.coverage) < 0.01), { b2: { fit: b2.fit, mape: b2.mape, cov3: b2.cov[1] }, page: { fit: pq.fit, mape: pq.mape, cov3: pq.coverage } });
    // 8) B4 card in the Manager's scope · 9) B5 sections in Supply Review
    global.navigate('overview'); await wait(400);
    const card = document.querySelector('.sup-b4'), Mm = App.model();
    step('SUP-B4', card && card.innerText.includes(String(Mm.statusCount.stockout)) && /MT/.test(card.innerText));
    await login('planner'); global.navigate('supReview'); await wait(1500);
    const txt = document.querySelector('#supRoot .report')?.innerText || '';
    step('SUP-B5', txt.includes(t('b5Ops')) && txt.includes(t('b5Props')) && /SPR-/.test(txt));
    step('selfCheck 1–9 (after Phase C)', App.sc.ok, { checks: App.sc.checks.filter(c => !c.ok).map(c => c.id) });
    const a = await anchors(); step('SUP-ANCHOR (after Phase C)', a.pass, { diff: a.diff });
    return res;
  }

  global.SupUAT = {
    menu, noleak, anchors, theme, errors,
    opsGate, mobile, flow, phaseC,
    async all() {
      const out = [].concat(await anchors(), await menu(), await noleak('mgr-mt'), await noleak('mgr-tt'), await noleak('mgr-ecom'), await theme(), await opsGate());
      return { pass: out.filter(r => r.pass).length, of: out.length, failed: out.filter(r => !r.pass), consoleErrors: errors.slice() };
    }
  };
})(window);
