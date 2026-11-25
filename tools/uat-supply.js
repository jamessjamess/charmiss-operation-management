/* tools/uat-supply.js — CR-01 browser checks for the Supply part of Charmiss Ops (run in the DevTools console on the app page,
   or inject it). Not loaded by index.html. Each check returns plain data; SupUAT.all() runs everything.

   SUP-MENU-{role}   Supply menu per role (CR-01 7.3) + direct links to hidden pages refused
   SUP-NOLEAK-{mgr}  department-locked Managers: no other department's account / channel in Supply pages, charts, the SKU drawer
   SUP-ANCHOR        the CR-01 2.3 numbers on the Integrated demo (AS OF 23 Nov 2026 · Weekly · L4W · 3M · no filter)
   SUP-THEME         Light / Dark render every Supply page without errors
   Phase B · flow() · Phase C · phaseC() · Phase D · phaseD() — see each block */
(function (global) {
  'use strict';
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const errors = [];
  global.addEventListener('error', e => errors.push(String(e.message)));
  global.addEventListener('unhandledrejection', e => errors.push('rejection: ' + String(e.reason && e.reason.message || e.reason)));
  const PROFILES = [['director'], ['manager', 'mgr-mt'], ['manager', 'mgr-tt'], ['manager', 'mgr-ecom'], ['salesAdmin', 'sa-mt'], ['salesAdmin', 'sa-tt'],
    ['salesAdmin', 'sa-ecom'], ['admin'], ['finance'], ['warehouse'], ['planner']];
  const SUP = ['supOverview', 'supStock', 'supExpiry', 'supConsign', 'supCalendar', 'supReplen', 'supQuota', 'supProposals', 'supReview', 'supSetup', 'supIntake'];   // CR-03: + Intake
  /* CR-01 7.3 — the expected Supply menu per profile (CR-03: + Intake for Director / Manager MT (view) / Planner / Admin) */
  const EXPECT = {
    director: 'Overview,Stock,Expiry,Consign,Calendar,Replen,Quota,Proposals,Review,Intake',
    'mgr-mt': 'Overview,Stock,Expiry,Consign,Calendar,Quota,Proposals,Review,Intake', 'mgr-tt': 'Overview,Stock,Expiry,Calendar,Quota,Proposals,Review',
    'mgr-ecom': 'Overview,Stock,Expiry,Calendar,Quota,Proposals,Review', 'sa-mt': '', 'sa-tt': '', 'sa-ecom': '',
    admin: 'Setup,Intake', finance: 'Calendar,Review', warehouse: 'Expiry,Calendar', planner: 'Overview,Stock,Expiry,Consign,Calendar,Replen,Quota,Proposals,Review,Setup,Intake'
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

  /* ---------------------------------------------------------------- Phase D · F1 · F2 · F3 · F4 · F8 (run on a fresh Integrated demo)
     Run twice: on a desktop viewport and at 390 px — F2 / F3 check the layout of the size they run on.
     SUP-F1-CARD · SUP-F1-TABLE · SUP-F1-REPORT · SUP-F2 · SUP-F3 · SUP-F4 · SUP-F8-* · SUP-NOLEAK-sa-* · SUP-NOTAG */
  async function phaseD() {
    const res = [], App = global.App, Calc = global.Calc, U = global.U, St = global.St, mob = U.isMobile(), tag = mob ? ' (mobile)' : ' (desktop)';
    const step = (id, pass, info) => res.push(Object.assign({ id, pass: !!pass }, info || {}));
    if (global.supDataset() !== 'integrated' || !db.feedBase) return [{ id: 'SUP-PHASE-D', pass: false, info: 'needs a fresh Integrated demo' }];
    const F0 = { asDn: Calc.dn('2026-11-23'), view: 'W', rr: 'L4W', h: 3, ch: [], acc: [], brand: [], cat: [], q: '' };
    const go = async (v, ms) => { global.navigate(v); for (let k = 0; k < 40 && !(App.F && document.querySelector('#supRoot .pagehead')); k++) await wait(150); await wait(ms || 700); };
    await login('director'); await go('supQuota'); App.setF(F0); await wait(900);
    const DB = App.DB, M = App.model(), before = errors.length;
    // F1 — the card leads with MTD = the MTD point of the monthly series; Δ = MTD at the same day last month; the weekly figure is the sub-line
    const Q = Calc.quotaOf(DB, M, 3), mtd = Q.monthly.find(x => x.mtd), achM = Calc.achMtd(DB, M.rows, M.mask, M.asDn), achP = Calc.achMtd(DB, M.rows, M.mask, Calc.addMonths(M.asDn, -1));
    const card = document.querySelector('#supRoot .kpi'), ctxt = card ? card.innerText : '';
    step('SUP-F1-CARD', ctxt.includes(St('k_ach_mtd')) && ctxt.includes(U.pct(achM, 1)) && U.pct(achM, 1) === '94.1%' && Math.abs(achM - mtd.si / mtd.q * 100) < 0.05
      && ctxt.includes(U.n(Math.abs(achM - achP), 1) + ' pp') && ctxt.includes(St('vs_prev_mtd')) && ctxt.includes(St('k_sub_ach_wk', { p: U.pct(Q.kpi.achievement, 1) })),
      { card: ctxt.replace(/\n+/g, ' | '), mtd: +achM.toFixed(2), prevMtd: achP && +achP.toFixed(2) });
    // F1 — the Account × SKU table column is MTD (per pair: the same function on one account)
    const QD = global.Pages.quotaData(App, 3), pairs = QD.pairs.filter(p => p.achMtd != null);
    const one = j => DB.accounts.map((a, k) => k === j), bad1 = pairs.filter(p => Math.abs(Calc.achMtd(DB, [{ i: p.i }], one(p.j), M.asDn) - p.achMtd) > 0.01);
    const th = [...document.querySelectorAll('#qHost thead th')].map(x => x.innerText.replace(/[▲▼]/g, '').trim()), qc = document.querySelector('#qHost .ccard');
    const label = mob ? !!qc && qc.innerText.includes(St('k_ach_mtd_s')) : th.includes(St('k_ach_mtd'));   // phones: the card list
    step('SUP-F1-TABLE' + tag, pairs.length > 0 && !bad1.length && label && pairs.some(p => p.ach != null && Math.abs(p.ach - p.achMtd) > 1), { pairs: pairs.length, mismatch: bad1.length });
    await go('supReview', 1200);
    const rtxt = (document.querySelector('#supRoot .report') || {}).innerText || '';
    step('SUP-F1-REPORT', rtxt.includes(St('k_ach_mtd')) && rtxt.includes(U.pct(Calc.achMtd(DB, App.model().rows, App.model().mask, App.model().asDn), 1)));
    // F4 — DOC Δ is neutral (grey) on Supply overview and in Supply Review
    await go('supOverview', 1200);
    const docCard = [...document.querySelectorAll('#supRoot .kpi')].find(k => k.innerText.includes(St('k_doc'))), dEl = docCard && docCard.querySelector('.delta');
    const rDoc = () => [...document.querySelectorAll('#supRoot .report tr')].find(tr => tr.cells[0] && tr.cells[0].innerText.trim() === St('k_doc'));
    await go('supReview', 1200); const rd = rDoc(), rdEl = rd && rd.querySelector('.delta');
    step('SUP-F4', dEl && dEl.classList.contains('flat') && !/good|bad/.test(dEl.className) && (!rdEl || rdEl.classList.contains('flat')), { overview: dEl && dEl.outerHTML, review: rdEl && rdEl.outerHTML });
    // F2 — Sales In vs Sales Out per account: horizontal bars below 768 px, vertical above
    await go('supConsign', 1200);
    const ch = Object.values(global.Chart.instances || {}).find(c => c.canvas && c.canvas.closest('#card-inout'));
    const horiz = ch && ch.options.indexAxis === 'y';
    step('SUP-F2' + tag, ch && (mob ? horiz : !horiz) && ch.data.labels.length > 1, { indexAxis: ch && ch.options.indexAxis, labels: ch && ch.data.labels.length });
    // F3 — card lists on phones: 20 + "load more" (same order, filter resets to 20); desktop keeps the pager
    const mx = () => document.querySelector('#mxHost'), cards = () => [...mx().querySelectorAll('.ccard')].map(c => c.innerText.split('\n')[0]);
    if (mob) {
      const c20 = cards(), more = mx().querySelector('[data-more]');
      more && more.click(); await wait(150);
      const c40 = cards();
      App.setF(Object.assign({}, F0, { brand: ['Charmiss'] })); await wait(1000);   // a different row set (every consignment account is MT, so a channel filter would not change it)
      const M2 = App.model(), C2 = Calc.consignmentOf(DB, M2.rows, M2.asDn, M2.period, M2.mask, M2.S), cf = cards(), total = new Set(C2.pairs.map(p => p.i)).size;
      App.setF(F0); await wait(900);
      step('SUP-F3' + tag, c20.length === 20 && !!more && c40.length === 40 && c40.slice(0, 20).join('|') === c20.join('|') && cf.length === Math.min(20, total), { first: c20.length, afterMore: c40.length, filtered: cf.length });
    } else {
      const rows = mx().querySelectorAll('tbody tr').length;
      step('SUP-F3' + tag, rows > 0 && !mx().querySelector('[data-more]') && !!mx().querySelector('.pager'), { rows });
    }
    // F8 — counts shown next to the calculation (never replacing it), only up to AS OF and inside the scope; the import accepts the table
    const cc = App.raw.consign_count || [], cntCard = document.querySelector('#card-cnt');
    const calcOk = cc.every(r => { const i = DB.skuIdx.get(r.sku), j = DB.accIdx.get(r.account_id); return i != null && j != null; });
    const pairCalc = cc.map(r => Math.round(Calc.stockAt(DB, DB.skuIdx.get(r.sku), Calc.dn(r.date) + 1).cons[DB.accIdx.get(r.account_id)]));
    const lotsSum = cc.reduce((x, r) => x + DB.lots[DB.skuIdx.get(r.sku)].filter(L => L.j === DB.accIdx.get(r.account_id)).reduce((y, L) => y + L.qty, 0), 0);
    const shownN = cntCard ? (mob ? cntCard.querySelectorAll('.ccard').length : cntCard.querySelectorAll('tbody tr').length) : 0;
    const sumTxt = cntCard ? cntCard.querySelector('.cnt-sum').innerText : '';
    step('SUP-F8-SHOW', cc.length === 52 && calcOk && !!cntCard && sumTxt.includes(U.n(cc.length)) && shownN === Math.min(cc.length, mob ? 20 : 50), { counts: cc.length, shown: shownN, summary: sumTxt });
    const exp = cc.reduce((x, r, k) => x + (Number(r.qty) - pairCalc[k]), 0);
    step('SUP-F8-DIFF (= counted − calculated; calculation untouched)', sumTxt.includes((exp > 0 ? '+' : '') + U.n(exp)) && (DB.snapDn !== Calc.dn('2026-11-23') || Math.abs(lotsSum - pairCalc.reduce((x, y) => x + y, 0)) < 0.5), { diff: exp, calcAtCount: pairCalc.reduce((x, y) => x + y, 0), lots: Math.round(lotsSum) });
    App.setF(Object.assign({}, F0, { asDn: Calc.dn('2026-11-16') })); await wait(1000);
    const beforeCount = !document.querySelector('#card-cnt');
    App.setF(Object.assign({}, F0, { ch: ['TT'] })); await wait(1000);
    const otherCh = !document.querySelector('#card-cnt');
    App.setF(F0); await wait(900);
    step('SUP-F8-SCOPE (after AS OF / other channel → hidden)', beforeCount && otherCh);
    const masters = { sku: new Set(DB.skus.map(x => x.sku)), account: new Set(DB.accounts.map(a => a.account_id)) };
    const v1 = global.Data.validate('consign_count', 'date,account_id,sku,qty,source\n2026-11-22,A01,' + DB.skus[0].sku + ',12,Mer count\n', masters);
    const v2 = global.Data.validate('consign_count', 'date,account_id,sku,qty\n22/13/2026,A01,XX-1,-3\n', masters);
    step('SUP-F8-IMPORT (schema)', v1.ok && !v1.warnings.length && !v2.ok && v2.errorCount >= 2 && v2.warnings.some(w => w.msg === 'unknown_ref') && global.Data.TABLES.includes('consign_count'), { bad: v2.errors.map(e => e.col + ':' + e.msg) });
    // Sales Admins: no Supply page, no Supply card, nothing from Supply on the overview
    for (const u of ['sa-mt', 'sa-tt', 'sa-ecom']) {
      await login('salesAdmin', u); global.navigate('overview'); await wait(300);
      const refused = SUP.every(v => !global.workCanVisit(v) && global.navigate(v) === false);
      location.hash = '#/supply/consign'; await wait(300);
      const viaUrl = !document.querySelector('#supRoot');
      step('SUP-NOLEAK-' + u, refused && viaUrl && !document.querySelector('.sup-b4'), { refused, viaUrl });
    }
    // no internal "CR-01" tag on any rendered page
    await login('planner'); const tags = [];
    for (const v of SUP.concat(['overview', 'workQueue', 'allocation'])) { if (!global.workCanVisit(v)) continue; global.navigate(v); await wait(v.startsWith('sup') ? 900 : 120); if (/CR-01/.test(document.querySelector('#page').innerText)) tags.push(v); }
    step('SUP-NOTAG', !tags.length, { pages: tags });
    step('console errors (Phase D)', errors.length === before, { errors: errors.slice(before) });
    const a = await anchors(); step('SUP-ANCHOR (Phase D)', a.pass, { diff: a.diff, selfCheck: a.selfCheck });
    return res;
  }

  /* ---------------------------------------------------------------- CR-03 Phase 3A · R1 Sales Out intake + run-rate end · R2 non-sales issues
     (run on a fresh Integrated demo; desktop). CR3-VERSION · CR3-LEGACY · CR3-ANCHOR-NEW · CR3-SO-INTAKE-* · CR3-RR-END · CR3-STALE ·
     CR3-OTHER-OUT-* · CR3-PRPLAN · CR3-SC-10/11 · CR3-AUDIT · CR3-MENU-* · CR3-ANCHOR-AFTER */
  async function phase3A() {
    const res = [], App = global.App, Calc = global.Calc, step = (id, pass, info) => res.push(Object.assign({ id, pass: !!pass }, info || {}));
    if (global.supDataset() !== 'integrated' || !db.feedBase) return [{ id: 'CR3-3A', pass: false, info: 'needs a fresh Integrated demo' }];
    const before = errors.length, setS = patch => App.saveSettings(Object.assign({}, App.S, patch));
    const rrAll = (D, mode, as) => { D.rrEndMode = mode; return D.skus.map(s => D.accounts.map(a => Calc.runRate(D, s.i, a.j, as == null ? D.maxAsOf : as, 'L4W'))); };
    const upload = async (path, acc) => {
      global.navigate('supIntake'); for (let k = 0; k < 30 && !document.querySelector('#inFile'); k++) await wait(100);
      const blob = await fetch(path + '?v=' + Date.now()).then(r => r.blob()), f = new File([blob], path.split('/').pop());
      document.querySelector('#inAcc').value = acc; const inp = document.querySelector('#inFile'), dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; inp.dispatchEvent(new Event('change'));
      for (let k = 0; k < 30 && !document.querySelector('#inCheck'); k++) await wait(100);
    };
    const check = async () => { document.querySelector('#inCheck').click(); await wait(250); return inDraft && inDraft.preview; };
    const importNow = async mode => { if (mode) { inDraft.mode = mode; global.render(); await wait(100); } const n0 = inBatches().length; document.querySelector('#inGo').click(); for (let k = 0; k < 50 && inBatches().length === n0; k++) await wait(100); await global.Supply.ensureData(); return inBatches()[0]; };
    const inBatches = () => (typeof intake !== 'undefined' ? intake.batches : []);

    // 0) app version + methods on a fresh demo
    await login('planner'); global.navigate('supIntake'); await wait(400);
    const foot = (document.querySelector('#footBuild') || {}).innerText || '', side = (document.querySelector('.appver-side') || {}).innerText || '';
    const vb = document.querySelector('[data-appver]'); vb && vb.click(); await wait(150); const dlg = (document.querySelector('#modal') || {}).innerText || ''; document.querySelector('#modal').open && document.querySelector('#modal').close();
    step('CR3-VERSION', foot.includes('v' + APP_VERSION.number) && side.includes(APP_VERSION.number) && dlg.includes(APP_VERSION.number) && dlg.includes('8.0.0'), { foot, side });
    setS({ rrEndMode: 'history' }); const aL = await anchors(); setS({ rrEndMode: 'account' }); const aN = await anchors();
    step('CR3-LEGACY (old methods → CR-01 anchors)', aL.pass, { diff: aL.diff, selfCheck: aL.selfCheck });
    step('CR3-ANCHOR-NEW (new methods · 3A gives the same numbers)', aN.pass, { diff: aN.diff, got: aN.got });

    // 1) R1 intake — errors file (Watsons, SKU codes): every rule reports its line; nothing can be imported
    await login('planner');
    await upload('data/samples/sales-out-errors-example.csv', 'A02');
    let P = await check();
    const errLines = P ? P.errors.map(e => e.line + ':' + e.msg).join(' ') : '';
    const blocked1 = !!document.querySelector('#inGo[disabled]');
    inDraft.round = false; P = inValidate(inDraft); const withMonday = P.errors.some(e => e.line === 3 && e.msg === 've_monday');
    step('CR3-SO-INTAKE-ERRORS', blocked1 && /4:ve_future/.test(errLines) && /5:ve_date/.test(errLines) && /6:ve_sku/.test(errLines) && /7:ve_neg/.test(errLines) && /8:ve_qty/.test(errLines) && !/[23]:/.test(errLines) && withMonday, { errors: errLines });
    inDraft = null;
    // 2) partner codes: an unmapped code is an error with its line; adding it back clears it
    await upload('data/samples/sales-out-7eleven-A01-2026-11-23.csv', 'A01');
    P = await check(); const clean = P && P.errors.length === 0 && P.rows.length > 50;
    const code = String(inDraft.rows[0][inDraft.cols.code]), sku = inCfg('A01').map[code];
    inMapSet('A01', code, null); const P2 = inValidate(inDraft); inMapSet('A01', code, sku); const P3 = inValidate(inDraft);
    step('CR3-SO-INTAKE-MAP', clean && P2.errors.some(e => e.line === 2 && e.msg === 've_code') && P2.unmapped.includes(code) && P3.errors.length === 0, { rows: P.rows.length, code });
    // 3) append the new 7-Eleven week → run rate of 7-Eleven pairs moves, every other account stays (CR3-RR-END)
    const D0 = App.DB, rr0 = rrAll(D0, 'account'), rrH0 = rrAll(D0, 'history');
    inDraft.preview = P3; global.render(); await wait(100);
    const b = await importNow('replace'), D1 = App.DB, rr1 = rrAll(D1, 'account'), rrH1 = rrAll(D1, 'history');
    let moved = 0, movedOther = 0, movedHist = 0; const j01 = D1.accIdx.get('A01');
    D1.skus.forEach(s => D1.accounts.forEach(a => { const d = Math.abs(rr1[s.i][a.j] - rr0[s.i][a.j]) > 1e-9; if (a.j === j01) { if (d) moved++; } else if (d) movedOther++; if (Math.abs(rrH1[s.i][a.j] - rrH0[s.i][a.j]) > 1e-9) movedHist++; }));
    const st01 = inWeekStatus('A01', Calc.dn('2026-11-23')).k, st02 = inWeekStatus('A02', Calc.dn('2026-11-23')).k;
    step('CR3-SO-INTAKE (append)', b && b.rows === P3.rows.length && b.replaced === 0 && App.raw._intake && App.raw._intake.moved && Calc.iso(D1.snapDn) === '2026-11-30' && App.raw._intake.short === 0 && st01 === 'ok' && ['pending', 'missing'].includes(st02),
      { batch: b && b.id, rows: b && b.rows, snapshot: Calc.iso(D1.snapDn), A01: st01, A02: st02 });
    step('CR3-RR-END (only 7-Eleven moves · old method does not move)', moved > 40 && movedOther === 0 && movedHist === 0, { moved7Eleven: moved, movedOther, movedOldMethod: movedHist });
    // 4) stale label: threshold 0 → the other consignment accounts (1 week behind) are flagged on a Supply page, 7-Eleven is not
    setS({ staleW: 0 }); global.navigate('supConsign'); await wait(1500);
    const banner = (document.querySelector('.sup-stale') || {}).innerText || '';
    setS({ staleW: 2 }); App.rerender(); await wait(900); const banner2 = !!document.querySelector('.sup-stale');
    step('CR3-STALE', /Watsons/.test(banner) && !/7-Eleven/.test(banner) && !banner2, { banner });
    // 5) duplicates: Watsons week 16 Nov (already in the history) — skip keeps the old data, replace takes the file; removing the batch restores
    await upload('data/samples/sales-out-watsons-A02-2026-11-16.xlsx', 'A02'); P = await check();
    const dup = P ? P.dup : 0, bs = await importNow('skip');
    await upload('data/samples/sales-out-watsons-A02-2026-11-16.xlsx', 'A02'); await check();
    const fileQty = inDraft.preview.rows.reduce((x, r) => x + r.q, 0), br = await importNow('replace');
    const rawQty = App.raw.sales_out.filter(r => r.account_id === 'A02' && r.date === '2026-11-16').reduce((x, r) => x + (+r.qty), 0);
    const realConfirm = global.confirm; global.confirm = () => true; await inDeleteBatch(br.id); global.confirm = realConfirm; await global.Supply.ensureData();
    const baseQty = App.base.sales_out.filter(r => r.account_id === 'A02' && r.date === '2026-11-16').reduce((x, r) => x + (+r.qty), 0), backQty = App.raw.sales_out.filter(r => r.account_id === 'A02' && r.date === '2026-11-16').reduce((x, r) => x + (+r.qty), 0);
    step('CR3-SO-INTAKE-DUP (xlsx · skip / replace / remove)', dup > 20 && bs.rows === P.rows.length - dup && bs.skipped === dup && br.replaced === dup && Math.abs(rawQty - fileQty) < 0.5 && Math.abs(backQty - baseQty) < 0.5,
      { dup, skip: [bs.rows, bs.skipped], replace: br.replaced, fileQty, baseQty });
    // 6) R2 non-sales issue: request (warehouse) → no self-approval / approver right needed → approve (director) → WMS read → Supply
    const isku = App.DB.skus.slice().sort((a, b) => App.DB.lots[b.i].reduce((x, L) => x + (L.j < 0 ? L.qty : 0), 0) - App.DB.lots[a.i].reduce((x, L) => x + (L.j < 0 ? L.qty : 0), 0))[1].sku, ii = App.DB.skuIdx.get(isku);
    const whOf = D => D.lots[ii].reduce((x, L) => x + (L.j < 0 ? L.qty : 0), 0), soOf = D => D.cumSO[ii].reduce((x, c) => x + c[D.nWeeks], 0);
    const wh0 = whOf(App.DB), so0 = soOf(App.DB), rrI0 = rrAll(App.DB, 'account')[ii];
    await login('warehouse'); const rq = issueRequest({ type: 'pr', sku: isku, qty: 100, ref: 'UAT-PR-' + Date.now(), reason: 'UAT PR box' }), whApprove = issueApprove(rq.issue.id);
    await login('admin'); const own = issueRequest({ type: 'writeoff', sku: isku, qty: 5, ref: 'UAT-WO-' + Date.now(), reason: 'UAT damaged' }), ownApprove = issueApprove(own.issue.id), rj0 = issueReject(own.issue.id, ''), rj1 = (await login('director'), issueReject(own.issue.id, 'UAT not needed'));
    const lotsBefore = db.lots.filter(l => l.sku === isku).reduce((x, l) => x + l.qty, 0), ap = issueApprove(rq.issue.id), lotsAfter = db.lots.filter(l => l.sku === isku).reduce((x, l) => x + l.qty, 0);
    step('CR3-OTHER-OUT-APPROVAL', rq.ok && whApprove.ok === false && own.ok && ownApprove.error === 'issueSelf' && rj0.error === 'issueNeedReason' && rj1.ok && ap.ok && lotsBefore - lotsAfter === 100 && db.movements.some(m => m.ref.startsWith(rq.issue.id) && m.qty === -100),
      { ownApprove: ownApprove.error, reject: rj0.error });
    await login('warehouse'); global.wmsRefreshMock(); await global.Supply.ensureData();
    const D2 = App.DB, oo = (App.raw.other_out || []).filter(r => r.ref === rq.issue.id), rrI1 = rrAll(D2, 'account')[ii];
    step('CR3-OTHER-OUT (WH −100 · Sales Out and run rate unchanged)', Math.abs(whOf(D2) - (wh0 - 100)) < 0.5 && Math.abs(soOf(D2) - so0) < 0.5 && rrI1.every((x, k) => Math.abs(x - rrI0[k]) < 1e-9) && oo.length && oo.reduce((x, r) => x + r.qty, 0) === 100 && global.wmsRow(isku).onHand === whOf(D2),
      { sku: isku, wh: [wh0, whOf(D2)], wms: global.wmsRow(isku).onHand });
    await login('director'); global.navigate('supOverview'); await wait(1500);
    const M = App.model(), card = (document.querySelector('#card-oo') || {}).innerText || '';
    step('CR3-OTHER-OUT-VIEW (waterfall bar + month card)', M.waterfall.oo >= 100 && /PR \/ KOL/.test(card) && Calc.modelCheck(M).every(c => c.ok), { wfOO: M.waterfall.oo });
    // 7) PR plan in the projection (switch) — on: 6-month total lower by the plan; off: unchanged
    const pr = 3000, rowOn = () => App.model().rows.find(r => r.sku === isku);
    const off = rowOn().projAll[0]; setS({ prPlanOn: true, prPlan: { [isku]: pr } }); const on = rowOn().projAll[0]; setS({ prPlanOn: false }); const off2 = rowOn().projAll[0]; setS({ prPlan: {} });
    step('CR3-PRPLAN (switch prPlanOn · 1-month total)', on < off - pr * 0.8 && Math.abs(off2 - off) < 0.5, { off, on, off2 });
    // 8) selfCheck 10 / 11 and the audit trail
    const sc = App.sc.checks, scOk = id => (sc.find(c => c.id === id) || {}).ok;
    step('CR3-SC-10 (WH flow incl. other_out)', scOk('wh_flow')); step('CR3-SC-11 (Sales Out keys unique)', scOk('so_keys')); step('selfCheck 1–11', App.sc.ok, { failed: sc.filter(c => !c.ok).map(c => c.id) });
    const ev = new Set(db.logs.map(l => l.event));
    step('CR3-AUDIT', ['supSettingsEvent', 'soIntakeEvent', 'soIntakeDelEvent', 'soMapEvent', 'issueRequested', 'issueApproved', 'issueRejected'].every(e => ev.has(e)));
    // 9) who sees the intake page: Manager MT read-only (own accounts) · TT refused
    await login('manager', 'mgr-mt'); const okMt = global.navigate('supIntake') !== false; await wait(300);
    const mtView = okMt && !!document.querySelector('#inComplete') && !document.querySelector('#inUpload') && document.querySelectorAll('#inComplete tbody tr').length === App.DB.accounts.filter(a => a.is_consignment && a.channel === 'MT').length;
    await login('manager', 'mgr-tt'); const ttRef = global.navigate('supIntake') === false;
    step('CR3-MENU-INTAKE (MT view only · TT refused)', mtView && ttRef);
    // 10) nothing at AS OF 23 Nov moved (both methods)
    setS({ rrEndMode: 'history' }); const zL = await anchors(); setS({ rrEndMode: 'account' }); const zN = await anchors();
    step('CR3-ANCHOR-AFTER (AS OF 23 Nov · both methods)', zL.pass && zN.pass, { diff: zL.diff.concat(zN.diff) });
    step('console errors (3A)', errors.length === before, { errors: errors.slice(before) });
    return res;
  }

  global.SupUAT = {
    menu, noleak, anchors, theme, errors,
    opsGate, mobile, flow, phaseC, phaseD, phase3A,
    async all() {
      const out = [].concat(await anchors(), await menu(), await noleak('mgr-mt'), await noleak('mgr-tt'), await noleak('mgr-ecom'), await theme(), await opsGate());
      return { pass: out.filter(r => r.pass).length, of: out.length, failed: out.filter(r => !r.pass), consoleErrors: errors.slice() };
    }
  };
})(window);
