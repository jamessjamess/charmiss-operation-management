/* tools/uat-supply.js — CR-01 browser checks for the Supply part of Charmiss Ops (run in the DevTools console on the app page,
   or inject it). Not loaded by index.html. Each check returns plain data; SupUAT.all() runs everything.

   SUP-MENU-{role}   Supply menu per role (CR-01 7.3) + direct links to hidden pages refused
   SUP-NOLEAK-{mgr}  department-locked Managers: no other department's account / channel in Supply pages, charts, the SKU drawer
   SUP-ANCHOR        the CR-01 2.3 numbers on the Integrated demo (AS OF 23 Nov 2026 · Weekly · L4W · 3M · no filter) — every CR-03 method switch old
   CR3-ANCHOR-NEW    anchors('new'): the same view with every CR-03 method new (README › CR-03 anchors)
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
  const SUP = ['supOverview', 'supStock', 'supExpiry', 'supConsign', 'supCalendar', 'supReplen', 'supQuota', 'supProposals', 'supReview', 'supSop', 'supSetup', 'supIntake'];   // CR-03: + Intake · + S&OP
  /* CR-01 7.3 — the expected Supply menu per profile (CR-03: + Intake for Director / Manager MT (view) / Planner / Admin) */
  const EXPECT = {
    director: 'Overview,Stock,Expiry,Consign,Calendar,Replen,Quota,Proposals,Sop,Review,Intake',
    'mgr-mt': 'Overview,Stock,Expiry,Consign,Calendar,Quota,Proposals,Sop,Review,Intake', 'mgr-tt': 'Overview,Stock,Expiry,Calendar,Quota,Proposals,Sop,Review',
    'mgr-ecom': 'Overview,Stock,Expiry,Calendar,Quota,Proposals,Sop,Review', 'sa-mt': '', 'sa-tt': '', 'sa-ecom': '',
    admin: 'Intake,Setup', finance: 'Calendar,Review', warehouse: 'Expiry,Calendar', planner: 'Overview,Stock,Expiry,Consign,Calendar,Replen,Quota,Proposals,Sop,Review,Intake,Setup'   // CR-03 R7: + Sop · CR-04 R1: menu order (S&OP before Review · Intake in DATA · Setup in ADMIN)
  };
  const ANCHOR = { stockValue: 50091183, whV: 39518371, consV: 10572812, units: '514864/136418/651282', doc: 73, sellThrough: 17.8,
    status: '7/2/9/98/4/+7', risk3M: '547597/4489', recall: '519974/11/7194', quotaFit: '92/107/116', mape: 13.5, bias: -4.2, fill: 93.1, achMTD: 94.1 };
  /* CR-03 (3B): every new method — R1 run-rate end per account · R3 run rate without out-of-stock weeks · R4 statistical safety stock (+ the R3 / R4 figures) */
  const NEW_METHODS = { rrEndMode: 'account', rrMode: 'unconstrained', safetyMode: 'statistical', prPlanOn: false, fvaProposal: true, countAdjustOn: true };   // CR-04: + countAdjustOn (default on)
  const ANCHOR_NEW = Object.assign({}, ANCHOR, { doc: 70, status: '6/4/7/99/4/+7', risk3M: '726866/7265', quotaFit: '95/110/116',
    lost4: 2020669, lost13: 3071760, oosSku: 21, abc: '48/34/27/6/5', ssUnits: 167765, sugValue: 42971040,
    /* CR-03 (3C) */ ew: '98.8/12/18/23/0/22/20/104', fva3: '13.5/13.5/0.0', ts: '114/252/145' });

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

  /** opt: none → every CR-03 method switch old → the CR-01 anchors · 'new' → every method new → ANCHOR_NEW · { switches } → those, CR-01 anchors expected */
  async function anchors(opt) {
    await login('director'); global.navigate('supOverview');
    const App = global.App, Calc = global.Calc, isNew = opt === 'new';
    for (let k = 0; k < 50 && !(App.F && App.DB && document.querySelector('#supRoot .kpi')); k++) await wait(200);   // data loaded and page drawn
    App.setF({ asDn: Calc.dn('2026-11-23'), view: 'W', rr: 'L4W', h: 3, ch: [], acc: [], brand: [], cat: [], q: '' });
    const SS = Object.assign({}, App.S, isNew ? NEW_METHODS : (opt && typeof opt === 'object' ? opt : Calc.LEGACY_METHODS)), want = isNew ? ANCHOR_NEW : ANCHOR;   // CR-03
    const M = Calc.computeModel(App.DB, Object.assign({}, App.F, { rm: SS.rrMode }), SS, { prev: true, series: true }), k = M.kpi, S = M.S;
    const wh = M.rows.reduce((x, r) => x + r.whSel, 0), cons = M.rows.reduce((x, r) => x + r.consSel, 0);
    const whV = M.rows.reduce((x, r) => x + r.whSel * r.cost, 0), cV = M.rows.reduce((x, r) => x + r.consSel * r.cost, 0);
    const C = Calc.consignmentOf(App.DB, M.rows, M.asDn, M.period, M.mask, S), rec = C.pairs.filter(p => p.recall);
    const Q = Calc.quotaOf(App.DB, M, 3), mtd = Q.monthly.find(x => x.mtd), sc = M.statusCount;
    const got = { stockValue: Math.round(k.stockValue), whV: Math.round(whV), consV: Math.round(cV), units: [wh, cons, wh + cons].map(Math.round).join('/'),
      doc: Math.round(k.doc), sellThrough: +k.sellThrough.toFixed(1), status: [sc.stockout, sc.reorder, sc.overstock, sc.healthy, sc.npd].join('/') + '/+' + sc.expiry,
      risk3M: Math.round(k.riskBy[1][1]) + '/' + Math.round(k.riskBy[1][0]), recall: Math.round(C.kpi.recallV) + '/' + rec.length + '/' + Math.round(rec.reduce((x, p) => x + p.recall.qty, 0)),
      quotaFit: Math.round(k.quotaFit) + '/' + k.quotaFitOk + '/' + k.quotaFitN, mape: +Q.kpi.mape.toFixed(1), bias: +Q.kpi.bias.toFixed(1), fill: +Q.kpi.fillRate.toFixed(1), achMTD: +(mtd.si / mtd.q * 100).toFixed(1) };
    if (isNew) { const T = Calc.abcxyzOf(App.DB, M.asDn, S).tot, sumR = f => Math.round(M.rows.reduce((x, r) => x + f(r), 0));   // CR-03 (3B)
      Object.assign(got, { lost4: sumR(r => r.lost4V), lost13: sumR(r => r.lost13V), oosSku: M.rows.filter(r => r.oosW13 > 0).length, abc: [T.A.n, T.B.n, T.C.n, T.N.n, T.E.n].join('/'),
        ssUnits: sumR(r => r.safetyQty), sugValue: sumR(r => r.suggestedQty * r.cost) });
      const E = Calc.earlyWarnOf(App.DB, M.rows, M.asDn, M.mask, S).kpi, FV = Calc.fvaOf(App.DB, M, 3, S).total;   // CR-03 (3C)
      Object.assign(got, { ew: [E.instock.toFixed(1), E.red, E.yellow, E.rgap, E.dist, E.swing, E.accum, E.alerts].join('/'), fva3: [FV.wapeN, FV.wapeQ, FV.fva].map(x => x.toFixed(1)).join('/'), ts: [FV.high, FV.low, FV.neg].join('/') }); }
    const diff = Object.keys(want).filter(key => String(want[key]) !== String(got[key]));
    return { id: isNew ? 'CR3-ANCHOR-NEW' : 'SUP-ANCHOR', pass: diff.length === 0 && App.sc.ok && Calc.modelCheck(M).every(c => c.ok), selfCheck: App.sc.checks.map(c => c.id + ':' + (c.ok ? 'PASS' : 'FAIL')).join(' '), diff, got };
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
    if (global.SupUAT._proto() === 'file:') return [{ id: 'CR3-3A', pass: false, info: 'run via http server (python -m http.server)' }];   // CR-04 I9: the sample files are read with fetch
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
    const R3R4_OLD = { rrMode: 'sellout', safetyMode: 'days', prPlanOn: false };   // CR-03 (3B): the 3A checks keep R3 / R4 on their old methods
    const aL = await anchors(Object.assign({ rrEndMode: 'history' }, R3R4_OLD)), aN = await anchors(Object.assign({ rrEndMode: 'account' }, R3R4_OLD));
    step('CR3-LEGACY (old methods → CR-01 anchors)', aL.pass, { diff: aL.diff, selfCheck: aL.selfCheck });
    step('CR3-ANCHOR-NEW (R1 new · 3A gives the same numbers)', aN.pass, { diff: aN.diff, got: aN.got });

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
    const zL = await anchors(Object.assign({ rrEndMode: 'history' }, R3R4_OLD)), zN = await anchors(Object.assign({ rrEndMode: 'account' }, R3R4_OLD));
    step('CR3-ANCHOR-AFTER (AS OF 23 Nov · both methods)', zL.pass && zN.pass, { diff: zL.diff.concat(zN.diff) });
    step('console errors (3A)', errors.length === before, { errors: errors.slice(before) });
    return res;
  }

  /* ---------------------------------------------------------------- CR-03 Phase 3B · R3 run rate without out-of-stock weeks · R4 ABC-XYZ + statistical safety stock
     (run on a fresh Integrated demo; desktop). CR3-3B-VERSION · CR3-LEGACY · CR3-ANCHOR-NEW · CR3-DEFAULTS · CR3-OOS · CR3-OOS-VIEW · CR3-ABCXYZ ·
     CR3-ABC-FILTER · CR3-SS (3 SKUs by hand) · CR3-SL-WHATIF · CR3-SETTINGS · CR3-SC-12 */
  async function phase3B() {
    const res = [], App = global.App, Calc = global.Calc, step = (id, pass, info) => res.push(Object.assign({ id, pass: !!pass }, info || {}));
    if (global.supDataset() !== 'integrated' || !db.feedBase) return [{ id: 'CR3-3B', pass: false, info: 'needs a fresh Integrated demo' }];
    const before = errors.length, setS = patch => App.saveSettings(Object.assign({}, App.S, patch)), D = () => App.DB, as = Calc.dn('2026-11-23');
    await login('planner'); global.navigate('supStock'); await wait(1200);
    const foot = (document.querySelector('#footBuild') || {}).innerText || '';
    step('CR3-3B-VERSION', APP_VERSION.history.some(h => h[0] === '8.2.0') && foot.includes('v' + APP_VERSION.number) && APP_VERSION.history.some(h => h[0] === '8.1.0'), { foot });   // later releases keep 8.2.0 in the history
    // 1) anchors — every old method = CR-01 · every new method = README
    const aL = await anchors(), aN = await anchors('new');
    step('CR3-LEGACY (every switch old → CR-01 anchors)', aL.pass, { diff: aL.diff, selfCheck: aL.selfCheck });
    step('CR3-ANCHOR-NEW (every switch new → README anchors)', aN.pass, { diff: aN.diff, got: aN.got });
    // 2) defaults after approval (A2): new methods on · the filter bar switch follows the setting and changes the model
    await login('planner'); global.navigate('supStock'); await wait(1200);
    const sel = document.querySelector('#fRM'), M0 = App.model(), defOk = Calc.DEFAULT_SETTINGS.rrMode === 'unconstrained' && Calc.DEFAULT_SETTINGS.safetyMode === 'statistical' && App.S.rrMode === 'unconstrained' && sel && sel.value === 'unconstrained';
    sel.value = 'sellout'; sel.dispatchEvent(new Event('change')); await wait(400);
    const M1 = App.model(), d0 = D(), sumOld = M1.rows.reduce((x, r) => x + d0.accounts.reduce((y, a) => y + Calc.runRate(d0, r.i, a.j, M1.asDn, M1.basis), 0), 0), sumM1 = M1.rows.reduce((x, r) => x + r.rrTot, 0);
    const hashOk = /rm=sellout/.test(location.hash);
    sel.value = 'unconstrained'; sel.dispatchEvent(new Event('change')); await wait(300);
    step('CR3-DEFAULTS (A2 new on · filter switch)', defOk && Math.abs(sumOld - sumM1) < 1e-6 && M0.rows.reduce((x, r) => x + r.rrTot, 0) > sumM1 && hashOk && !/rm=/.test(location.hash), { rrNew: Math.round(M0.rows.reduce((x, r) => x + r.rrTot, 0)), rrOld: Math.round(sumM1) });
    // 3) R3: a pair with an out-of-stock week in its window → unconstrained ≥ sell-out (> for most) · no out-of-stock week → exactly the same · lost sales only where out of stock
    const DB = D(), S = App.S; DB.rrEndMode = 'account'; const wE = DB.wk(as); let same = 0, diffNo = 0, up = 0, down = 0, eq = 0, upEx = null;
    for (const sk of DB.skus) for (const a of DB.accounts) { const o = Calc.runRate(DB, sk.i, a.j, as, 'L4W'), u = Calc.runRateU(DB, sk.i, a.j, as, 'L4W', S); if (!o && !u) continue;
      const O = Calc.oosOf(DB, sk.i, S), end = Math.min(wE, Calc.rrCap(DB, a.j)); let any = 0; for (let w = Math.max(0, end - 4, DB.firstSale[sk.i][a.j]); w < end; w++) if (O.flags[a.j][w]) any = 1;
      if (!any) { if (o === u) same++; else diffNo++; } else if (u > o + 1e-12) { up++; if (!upEx) upEx = sk.sku + ' @ ' + a.name + ': ' + (o * 7).toFixed(1) + ' → ' + (u * 7).toFixed(1) + '/wk'; } else if (u < o - 1e-12) down++; else eq++; }
    const MN = await (async () => { const SS = Object.assign({}, App.S, NEW_METHODS); return Calc.computeModel(App.DB, { asDn: as, view: 'W', ch: [], acc: [], brand: [], cat: [], q: '', rr: 'L4W', h: 3, rm: 'unconstrained' }, SS, {}); })();
    const lostNoOos = MN.rows.filter(r => !r.oosW13 && r.lost13V > 0.5).length, lostTot = MN.rows.reduce((x, r) => x + r.lost13V, 0);
    step('CR3-OOS (R3 · up where out of stock · same where not · lost sales)', up > 20 && down === 0 && diffNo === 0 && same > 800 && lostTot > 0 && lostNoOos === 0, { same, up, equalFloor: eq, down, example: upEx, lost13: Math.round(lostTot) });
    // 4) where it shows: Stock columns · drawer chart + SS table · Overview card · consignment matrix metric
    global.navigate('supStock'); await wait(1200);
    const ths = [...document.querySelectorAll('#supRoot table.tbl thead th')].map(th => th.innerText).join('|');
    const rOos = App.model().rows.filter(r => r.oosW13 > 0).sort((a, b) => b.lost13V - a.lost13V)[0]; App.openSku(rOos.sku); await wait(700);
    const dr = document.querySelector('#supDrawer'), drOk = !!dr.querySelector('#card-skuso canvas') && /Safety Stock|safety stock/.test(dr.innerText) && !!dr.querySelector('.ss-tbl') && dr.querySelector('.grp') != null;
    const soW = Calc.soWeeksOf(App.DB, App.model(), App.model().rows.find(r => r.sku === rOos.sku)), oosMarked = soW.filter(w => w.oos).length > 0;
    App.closeSku(); global.U.drawer.close();
    global.navigate('supOverview'); await wait(1500);
    const card = (document.querySelector('#card-lost') || {}).innerText || '', lost4 = App.model().rows.reduce((x, r) => x + r.lost4V, 0);
    global.navigate('supConsign'); await wait(1200); const seg = document.querySelector('[data-seg="mxMetric"] [data-v="oos"]'); seg && seg.click(); await wait(500);
    const mxOk = !!seg && App.ui.mxMetric === 'oos' && /\d/.test((document.querySelector('#mxHost') || {}).innerText || ''); App.ui.mxMetric = 'rem';
    step('CR3-OOS-VIEW (stock columns · drawer · overview card · matrix)', /OOS/.test(ths) && /Lost sales|ยอดขายที่เสียโอกาส/.test(ths) && /กลุ่ม|Group/.test(ths) && drOk && oosMarked && card.includes(global.U.money(lost4)) && mxOk, { sku: rOos.sku, card: card.slice(0, 60) });
    // 5) R4 ABC-XYZ: shares · the line at 80 / 95 % · NPD → N · Discontinue / Clearance → E (SS 0)
    const C = Calc.abcxyzOf(App.DB, as, App.S), T = C.tot, ranked = C.rows.filter(r => r.abc).sort((a, b) => b.value - a.value);
    const lastA = ranked.filter(r => r.abc === 'A').pop(), firstB = ranked.find(r => r.abc === 'B'), firstC = ranked.find(r => r.abc === 'C');
    const nOk = C.rows.filter(r => r.group === 'N').every(r => r.hist < App.S.npdW) && C.rows.filter(r => r.hist < App.S.npdW && !['Clearance', 'Discontinue'].includes(App.DB.skus[r.i].status)).every(r => r.group === 'N');
    const clSku = App.DB.skus.find(x => x.status === 'Active' && C.rows[x.i].group && C.rows[x.i].group[0] === 'A').sku;
    opsMaster(clSku).lifecycle = 'Clearance'; persist(); await global.Supply.ensureData();   // F9 lifecycle → Supply status (persist moves the Ops revision)
    const C2 = Calc.abcxyzOf(App.DB, as, App.S), rowCl = Calc.computeModel(App.DB, { asDn: as, view: 'W', ch: [], acc: [], brand: [], cat: [], q: clSku, rr: 'L4W', h: 3 }, App.S, {}).rows[0];
    const eOk = C2.rows[App.DB.skuIdx.get(clSku)].group === 'E' && rowCl && rowCl.ss3 && rowCl.ss3.ss === 0 && rowCl.ss3.sl === 0 && C2.rows.filter(r => r.group === 'E').every(r => ['Clearance', 'Discontinue'].includes(App.DB.skus[r.i].status));
    delete opsMaster(clSku).lifecycle; persist(); await global.Supply.ensureData();
    step('CR3-ABCXYZ (A ≤ 80 % line · B ≤ 95 % · N · E · SS 0 for E)', Math.abs(T.A.share + T.B.share + T.C.share - 100) < 1e-6 && lastA.cumBefore < App.S.abcA && firstB.cumBefore >= App.S.abcA && firstB.cumBefore < App.S.abcB && (!firstC || firstC.cumBefore >= App.S.abcB) && nOk && eOk,
      { groups: [T.A.n, T.B.n, T.C.n, T.N.n, T.E.n].join('/'), shares: [T.A.share, T.B.share, T.C.share].map(x => x.toFixed(1)).join('/'), clearanceSku: clSku });
    // 6) group filter on Stock and Replen
    global.navigate('supStock'); await wait(1000); const gs = document.querySelector('#grpF'); gs.value = 'E'; gs.dispatchEvent(new Event('change')); await wait(500);
    const shownE = [...document.querySelectorAll('#supRoot table.tbl tbody tr .grp, #supRoot .clist .grp')].map(x => x.dataset.grp || x.innerText), nE = App.model().rows.filter(r => r.cls && r.cls.group === 'E').length;
    App.ui.grp = ''; global.navigate('supReplen'); await wait(1200); const rg = document.querySelector('#rpGrp'); App.ui.rpMode = 'all'; rg.value = 'B'; rg.dispatchEvent(new Event('change')); await wait(500);
    const rpGrps = [...document.querySelectorAll('#rpHost .grp')].map(x => x.dataset.grp || x.innerText); App.ui.rpGrp = '';
    step('CR3-ABC-FILTER (Stock E · Replen B)', shownE.length === nE && shownE.every(g => g === 'E') && rpGrps.length > 0 && rpGrps.every(g => g[0] === 'B'), { stockE: shownE.length, replenB: rpGrps.length });
    // 7) R4 safety stock by hand — 3 SKUs: own lead time · supplier lead time · estimated lead time (no out-of-stock week in the XYZ window, so σ is plain)
    const Mh = Calc.computeModel(App.DB, { asDn: as, view: 'W', ch: [], acc: [], brand: [], cat: [], q: '', rr: 'L4W', h: 3, rm: 'unconstrained' }, App.S, {}), Dh = App.DB, wEh = Dh.wk(as);
    const ZT = { 98: 2.0537, 97: 1.8808, 95: 1.6449, 92: 1.4051, 90: 1.2816 };
    const plain = r => { const O = Calc.oosOf(Dh, r.i, App.S); return Dh.accounts.every(a => { for (let w = wEh - 26; w < wEh; w++) if (O.flags[a.j][w]) return false; return true; }); };
    const hand = r => { const sd = l => { const m = l.reduce((x, y) => x + y, 0) / l.length; return [m, Math.sqrt(l.reduce((x, y) => x + (y - m) ** 2, 0) / (l.length - 1))]; };
      const wk = []; for (let w = wEh - 26; w < wEh; w++) wk.push(Dh.accounts.reduce((x, a) => x + Dh.so[r.i][a.j][w], 0));
      const [, sdW] = sd(wk), ok = p => p.rec != null && p.order != null && p.rec < as && p.status !== 'Cancelled';
      let lt, sdLT; const own = Dh.po[r.i].filter(ok).map(p => p.rec - p.order);
      if (r.lt3.src === 'sku') [lt, sdLT] = sd(own); else if (r.lt3.src === 'supplier') { const l = []; Dh.po.forEach(x => x.forEach(p => { if (ok(p) && p.supplier === r.lt3.supplier) l.push(p.rec - p.order); })); [lt, sdLT] = sd(l); } else { lt = Dh.skus[r.i].lead_time_days; sdLT = 0; }
      const z = ZT[App.S['sl_' + r.cls.group]], d = r.rrTot, sdD = sdW / Math.sqrt(7), ss = z * Math.sqrt(lt * sdD * sdD + d * d * sdLT * sdLT);
      return { sku: r.sku, src: r.lt3.src, group: r.cls.group, z, d: +d.toFixed(2), sdD: +sdD.toFixed(2), lt: +lt.toFixed(1), sdLT: +sdLT.toFixed(1), ss: Math.round(ss), app: Math.round(r.ss3.ss), rop: Math.round(d * lt + ss), appRop: Math.round(r.rop) }; };
    const pick = src => Mh.rows.find(r => r.lt3.src === src && r.rrTot > 0 && r.cls && r.cls.group.length === 2 && plain(r));
    const H = ['sku', 'supplier', 'est'].map(pick).filter(Boolean).map(hand);
    const estDrawer = (() => { const r = pick('est'); return r ? r.sku : null; })();
    let badge = false; if (estDrawer) { global.navigate('supStock'); await wait(900); App.openSku(estDrawer); await wait(600); badge = /LT ประมาณ|LT estimated/.test(document.querySelector('#supDrawer').innerText); App.closeSku(); global.U.drawer.close(); }
    step('CR3-SS (3 SKUs by hand · actual vs estimated LT)', H.length === 3 && H.every(h => Math.abs(h.ss - h.app) <= 1 && Math.abs(h.rop - h.appRop) <= 1) && badge, { hand: H, estBadge: badge });
    // 8) What-if service level ±pp (statistical) — off with the old safety days
    const sumSS = M => M.rows.reduce((x, r) => x + r.safetyQty, 0);
    const base = Calc.computeModel(App.DB, App.F, App.S, {}), plus = Calc.computeModel(App.DB, Object.assign({}, App.F, { slAdd: 1 }), App.S, {}), minus = Calc.computeModel(App.DB, Object.assign({}, App.F, { slAdd: -5 }), App.S, {});
    global.navigate('supReplen'); await wait(1200); const slOn = !!document.querySelector('#wiSl:not([disabled])');
    setS({ safetyMode: 'days' }); global.navigate('supStock'); global.navigate('supReplen'); await wait(1200); const slOff = !!document.querySelector('#wiSl[disabled]'); setS({ safetyMode: 'statistical' });
    step('CR3-SL-WHATIF (+1 pp more SS · −5 pp less · slider off with safety days)', sumSS(plus) > sumSS(base) && sumSS(minus) < sumSS(base) && slOn && slOff, { ss: [sumSS(minus), sumSS(base), sumSS(plus)].map(Math.round) });
    // 9) settings: thresholds editable + audited · "use every old method" sets every switch (and the filter) back
    const n0 = db.logs.filter(l => l.event === 'supSettingsEvent').length;
    setS({ abcA: 70 }); const A70 = Calc.abcxyzOf(App.DB, as, App.S).tot.A.n; setS({ abcA: 80 });
    const logged = db.logs.filter(l => l.event === 'supSettingsEvent').slice(0, 2).every(l => /abcA/.test(l.ref) && l.before && l.after && l.before.abcA !== l.after.abcA);   // newest first
    global.navigate('supSetup'); await wait(1200); document.querySelector('#setLegacy').click(); await wait(400);
    const legacy = ['rrEndMode', 'rrMode', 'safetyMode', 'prPlanOn'].every(k => App.S[k] === Calc.LEGACY_METHODS[k]) && App.F.rm === 'sellout';
    setS(NEW_METHODS); App.setF({ rm: 'unconstrained' });
    step('CR3-SETTINGS (threshold + audit · old-method button)', A70 < T.A.n && db.logs.filter(l => l.event === 'supSettingsEvent').length >= n0 + 3 && logged && legacy, { A70, A80: T.A.n });
    // 10) selfCheck 12 and 1–12
    const sc = App.sc.checks;
    step('CR3-SC-12 (ABC = 100 % · every SKU grouped)', (sc.find(c => c.id === 'abc') || {}).ok, { detail: (sc.find(c => c.id === 'abc') || {}).detail });
    step('selfCheck 1–12', App.sc.ok && sc.length >= 11 && sc.some(c => c.id === 'abc'), { failed: sc.filter(c => !c.ok).map(c => c.id) });
    step('console errors (3B)', errors.length === before, { errors: errors.slice(before) });
    return res;
  }

  /* ---------------------------------------------------------------- CR-03 Phase 3C · R5 consignment early warning · R6 FVA
     (run on a fresh Integrated demo; desktop). CR3-3C-VERSION · CR3-LEGACY · CR3-ANCHOR-NEW · CR3-EW (by hand) · CR3-EW-DIST · CR3-EW-VIEW ·
     CR3-EW-CYCLE · CR3-FVA (2 pairs by hand) · CR3-FVA-MAPE · CR3-FVA-VIEW · CR3-FVA-NOLEAK · CR3-B3-NAIVE · CR3-SETTINGS-3C */
  async function phase3C() {
    const res = [], App = global.App, Calc = global.Calc, step = (id, pass, info) => res.push(Object.assign({ id, pass: !!pass }, info || {}));
    if (global.supDataset() !== 'integrated' || !db.feedBase) return [{ id: 'CR3-3C', pass: false, info: 'needs a fresh Integrated demo' }];
    const before = errors.length, setS = patch => App.saveSettings(Object.assign({}, App.S, patch)), as = Calc.dn('2026-11-23');
    const F0 = { asDn: as, view: 'W', ch: [], acc: [], brand: [], cat: [], q: '', rr: 'L4W', h: 3 }, near = (a, b, e) => Math.abs(a - b) <= (e || 1e-6) || (a === Infinity && b === Infinity);
    await login('planner'); global.navigate('supConsign'); await wait(1200);
    const foot = (document.querySelector('#footBuild') || {}).innerText || '';
    step('CR3-3C-VERSION', APP_VERSION.history.some(h => h[0] === '8.3.0') && foot.includes('v' + APP_VERSION.number) && APP_VERSION.history.some(h => h[0] === '8.2.0'), { foot });
    const aL = await anchors(), aN = await anchors('new');
    step('CR3-LEGACY (every switch old → CR-01 anchors)', aL.pass, { diff: aL.diff });
    step('CR3-ANCHOR-NEW (every switch new → README anchors incl. 3C)', aN.pass, { diff: aN.diff, got: { ew: aN.got.ew, fva3: aN.got.fva3, ts: aN.got.ts } });
    await login('planner');
    // 1) R5 by hand — every measure of one pair per alert type, straight from the weekly arrays and the stock rollback
    const D = App.DB, S = App.S, M = Calc.computeModel(D, F0, S, {}), E = Calc.earlyWarnOf(D, M.rows, as, M.mask, S), wE = D.wk(as);
    const hand = p => { const i = p.i, j = p.j, so = D.so[i][j], si = D.si[i][j], end = Math.min(wE, Calc.rrCap(D, j)), sum = (a, w0, w1) => { let x = 0; for (let w = Math.max(0, w0); w < w1; w++) x += a[w]; return x; };
      const rem = Calc.stockAt(D, i, as).cons[j], so4 = sum(so, end - 4, end) / 4, wos = so4 > 0 ? rem / so4 : rem > 0.5 ? Infinity : 0;
      const row = M.rows.find(r => r.i === i); let last = -1; for (let w = wE - 1; w >= 0; w--) if (si[w] > 0) { last = w; break; }
      const rgapD = row.rr[j] > 0 ? (last >= 0 ? as - (D.startDn + 7 * last) : Infinity) : null;
      let f = -1; for (let w = 0; w < wE; w++) if (si[w] > 0) { f = w; break; } let inW = 0, allW = 0;
      for (let w = Math.max(0, wE - 13, f + 1); w < wE; w++) { allW++; if (Calc.stockAt(D, i, D.startDn + 7 * w).cons[j] > 0.5) inW++; }
      const remP = Calc.stockAt(D, i, as - 7).cons[j], so4P = sum(so, end - 5, end - 1) / 4, wosP = so4P > 0 ? remP / so4P : remP > 0.5 ? Infinity : 0;
      const siQ = sum(si, wE - 13, wE), soQ = sum(so, end - 13, end);
      return near(p.wos, wos, 1e-9) && near(p.rgapD ?? -1, rgapD ?? -1) && p.inW === inW && p.allW === allW && near(p.wosP, wosP, 1e-9) && near(p.siQ, siQ) && near(p.soQ, soQ); };
    const pick = f => E.pairs.find(f), ex = { wos: pick(p => p.lvl === 'red'), rgap: pick(p => p.rgap), instock: pick(p => p.lowIn), swing: pick(p => p.swing), accum: pick(p => p.accum) };
    const handOk = Object.values(ex).every(p => p && hand(p));
    const keys = E.alerts.map(a => a.key), uniq = new Set(keys).size === keys.length, again = Calc.earlyWarnOf(D, M.rows, as, M.mask, S).alerts.map(a => a.key).join(',') === keys.join(',');
    const flagsOk = E.alerts.filter(a => a.type === 'wos').length === E.kpi.red + E.kpi.yellow && E.alerts.filter(a => a.type === 'rgap').length === E.kpi.rgap && E.alerts.filter(a => a.type === 'accum').length === E.kpi.accum;
    step('CR3-EW (WOS · reorder gap · in-stock · swing · piling up by hand · one alert per pair × type)', handOk && uniq && again && flagsOk,
      { pairs: Object.fromEntries(Object.entries(ex).map(([k, p]) => [k, p ? p.sku + ' @ ' + p.acc : null])), kpi: E.kpi });
    // 2) distribution gap: a pair with nothing left — quota left → no gap; take the month's quota away → gap
    const z = E.pairs.find(p => p.onSale && p.rem < 0.5 && !p.open && p.quotaLeft > 0.5);
    let distOk = false, distInfo = null;
    if (z) { const mk = Calc.monthKey(as), arr = D.quota[z.i].get(mk), keep = arr[z.j]; arr[z.j] = 0;
      const z2 = Calc.earlyWarnOf(D, M.rows, as, M.mask, S).pairs.find(p => p.key === z.key); arr[z.j] = keep;
      distOk = !z.dist && z2 && z2.dist && Calc.earlyWarnOf(D, M.rows, as, M.mask, S).alerts.some(a => a.key === 'dist|' + z.sku + '|' + z.accId) === false; distInfo = z.sku + ' @ ' + z.acc; }
    step('CR3-EW-DIST (no stock + no quota left + no open order → gap)', distOk, { pair: distInfo });
    // 3) on the consignment page: 4 cards · chart · alert list · matrix metrics
    global.navigate('supConsign'); await wait(1300);
    const kp = document.querySelectorAll('.ew-kpis .kpi').length, cv = !!document.querySelector('#card-ewcum canvas'), ewTxt = (document.querySelector('#ewHost') || {}).innerText || '';
    const mx = []; for (const m of ['wos', 'instock', 'rgap']) { const b = document.querySelector(`[data-seg="mxMetric"] [data-v="${m}"]`); if (b) { b.click(); await wait(400); mx.push(App.ui.mxMetric === m && /\d/.test((document.querySelector('#mxHost') || {}).innerText || '')); } else mx.push(false); }
    App.ui.mxMetric = 'rem';
    step('CR3-EW-VIEW (4 cards · cumulative chart · alerts · matrix WOS / in-stock / gap)', kp === 4 && cv && ewTxt.includes(E.alerts[0].name) && mx.every(Boolean), { cards: kp, matrix: mx });
    // 4) A4 replenishment cycle per account changes that account only · audited
    const tops = D.accounts.find(a => a.name === 'Tops'), redOf = (Ex, j) => Ex.pairs.filter(p => p.j === j && p.lvl === 'red').length, othersOf = Ex => Ex.pairs.filter(p => p.j !== tops.j).map(p => p.lvl).join();
    const n0 = db.logs.filter(l => l.event === 'supSettingsEvent').length;
    setS({ replenCycle: { [tops.account_id]: 1 } }); const E1 = Calc.earlyWarnOf(App.DB, Calc.computeModel(App.DB, F0, App.S, {}).rows, as, M.mask, App.S); setS({ replenCycle: {} });
    const audited = db.logs.filter(l => l.event === 'supSettingsEvent').length >= n0 + 2 && /replenCycle/.test(db.logs.find(l => l.event === 'supSettingsEvent').ref);
    step('CR3-EW-CYCLE (Tops cycle 1 week → more red at Tops only · audit)', redOf(E1, tops.j) > redOf(E, tops.j) && othersOf(E1) === othersOf(E) && audited, { topsRed: [redOf(E, tops.j), redOf(E1, tops.j)] });
    // 5) R6 by hand — 2 pairs: WAPE naive / quota, FVA, tracking signal
    const FV = Calc.fvaOf(D, M, 3, S), Q = Calc.quotaOf(D, M, 3), nA = D.accounts.length, one = j => { const m = new Uint8Array(nA); m[j] = 1; return m; };
    const handF = p => { const cur = Calc.monthStart(as), ms = k => Calc.addMonths(cur, -k), pm = [];
      for (let k = 6; k >= 1; k--) { const m0 = ms(k), qa = D.quota[p.i].get(Calc.monthKey(m0)), q = qa ? qa[p.j] : 0, a = Calc.monthFlows(D, p.i, one(p.j), m0, as).so; if (q <= 0 && a <= 0) continue;
        pm.push({ k, q, a, n: Calc.runRateU(D, p.i, p.j, m0, 'L3M', S) * Calc.daysInMonth(m0) }); }
      const w = pm.filter(x => x.k <= 3), sa = w.reduce((x, y) => x + y.a, 0), wN = w.reduce((x, y) => x + Math.abs(y.n - y.a), 0) / sa * 100, wQ = w.reduce((x, y) => x + Math.abs(y.q - y.a), 0) / sa * 100;
      const mad = pm.reduce((x, y) => x + Math.abs(y.q - y.a), 0) / pm.length, ts = pm.reduce((x, y) => x + y.q - y.a, 0) / mad;
      return { sku: p.sku, acc: p.acc, wN: +wN.toFixed(2), wQ: +wQ.toFixed(2), fva: +(wN - wQ).toFixed(2), ts: +ts.toFixed(2), ok: near(p.wapeN, wN, 1e-6) && near(p.wapeQ, wQ, 1e-6) && near(p.ts, ts, 1e-6) }; };
    const fp = [FV.pairs.filter(p => p.acc === '7-Eleven').sort((a, b) => b.sa - a.sa)[0], FV.pairs.filter(p => p.acc === 'Shopee').sort((a, b) => b.sa - a.sa)[0]].map(handF);
    step('CR3-FVA (2 pairs by hand · WAPE naive / quota · FVA · tracking signal)', fp.every(x => x.ok), { hand: fp });
    step('CR3-FVA-MAPE (WAPE quota 3M = MAPE on the page)', near(FV.total.wapeQ, Q.kpi.mape, 1e-9), { wapeQ: FV.total.wapeQ, mape: Q.kpi.mape, fva: FV.total.fva });
    // 6) on the Quota page: FVA card · table by account / Sales / group · scatter · pair columns
    global.navigate('supQuota'); await wait(1500);
    const card = [...document.querySelectorAll('#supRoot .kpis .kpi')].some(k => /FVA/.test(k.innerText)), segs = {};
    for (const b of ['acc', 'sales', 'group']) { const el = document.querySelector(`[data-seg="fvaBy"] [data-v="${b}"]`); if (el && !el.classList.contains('on')) { el.click(); await wait(600); } segs[b] = ((document.querySelector('#fvaHost') || {}).innerText || '').length > 20; }
    const scat = !!document.querySelector('#card-qfva canvas'), qTh = ((document.querySelector('#qHost') || {}).innerText || '');
    App.ui.fvaBy = 'acc';
    step('CR3-FVA-VIEW (card · by account / Sales / group · scatter · pair FVA + tracking signal)', card && Object.values(segs).every(Boolean) && scat && /FVA/.test(qTh) && /Tracking signal/.test(qTh), { segs });
    // 7) NOLEAK: a Manager sees only the Sales owners / accounts of the own department
    const salesOf = ch => [...new Set(D.accounts.filter(a => a.channel === ch).map(a => a.sales).filter(Boolean))];
    const leak = async (user, own) => { await login('manager', user); global.navigate('supQuota'); await wait(1500); const hits = [];
      for (const b of ['acc', 'sales']) { const el = document.querySelector(`[data-seg="fvaBy"] [data-v="${b}"]`); if (el && !el.classList.contains('on')) { el.click(); await wait(600); }
        const txt = (document.querySelector('#card-fva') || {}).innerText || ''; ['MT', 'TT', 'ECOM'].filter(c => c !== own).forEach(c => salesOf(c).forEach(n => { if (!salesOf(own).includes(n) && txt.includes(n)) hits.push(b + ': ' + n); })); }
      App.ui.fvaBy = 'acc'; return hits; };
    const lMt = await leak('mgr-mt', 'MT'), lTt = await leak('mgr-tt', 'TT');
    step('CR3-FVA-NOLEAK (Manager MT / TT · Sales owners of the own department only)', !lMt.length && !lTt.length, { mt: lMt, tt: lTt });
    // 8) B3: FVA below 0 three months running → the next-month proposal starts from Naive (switch fvaProposal)
    await login('planner');
    const neg = FV.pairs.filter(p => p.negRun && p.naiveNext > 1 && p.channel === 'MT').sort((a, b) => b.sa - a.sa)[0];
    const propOf = async () => { global.navigate('supQuota'); for (let k = 0; k < 30 && !App.F; k++) await wait(100); await wait(600); App.ui.qTab = 'all'; App.setF({ q: neg.sku }); await wait(700);
      const b = [...document.querySelectorAll('#qHost [data-propose]')].map(x => JSON.parse(x.dataset.propose)).find(x => x.sku === neg.sku && x.account === neg.accId); return b; };
    const pOn = await propOf(); setS({ fvaProposal: false }); const pOff = await propOf(); setS({ fvaProposal: true }); App.setF({ q: '' });
    const qp = Calc.quotaOf(App.DB, Calc.computeModel(App.DB, F0, App.S, {}), 3).pairs.find(x => x.i === neg.i && x.j === neg.j), nm = Calc.addMonths(Calc.monthStart(as), 1);
    const cr01 = Math.round(qp.expected / Calc.daysInMonth(as) * Calc.daysInMonth(nm));
    step('CR3-B3-NAIVE (negative FVA 3 months → Naive + reason · switch off → CR-01 quantity)', pOn && pOn.qty === Math.round(neg.naiveNext) && /Naive/.test(pOn.detail) && pOff && pOff.qty === cr01 && /^fit /.test(pOff.detail),
      { pair: neg.sku + ' @ ' + neg.acc, on: pOn && [pOn.qty, pOn.detail], off: pOff && [pOff.qty, pOff.detail] });
    // 9) settings: thresholds + per-account cycle on the page · the old-method button turns the proposal switch off
    global.navigate('supSetup'); await wait(1200);
    const hasEw = !!document.querySelector('input[name="wosRedX"]') && !!document.querySelector('input[name="tsLimit"]') && document.querySelectorAll('[data-rc]').length === D.accounts.filter(a => a.is_consignment).length && !!document.querySelector('input[name="fvaProposal"]');
    document.querySelector('#setLegacy').click(); await wait(400); const legacyOff = App.S.fvaProposal === false; setS(NEW_METHODS); App.setF({ rm: 'unconstrained' });
    step('CR3-SETTINGS-3C (R5 / R6 thresholds · cycle per account · old-method button)', hasEw && legacyOff && App.S.fvaProposal === true);
    step('selfCheck 1–12', App.sc.ok, { failed: App.sc.checks.filter(c => !c.ok).map(c => c.id) });
    step('console errors (3C)', errors.length === before, { errors: errors.slice(before) });
    return res;
  }

  /* ---------------------------------------------------------------- CR-03 Phase 3D · R7 S&OP cycle (run on a fresh Integrated demo; desktop)
     CR3-3D-VERSION · CR3-LEGACY · CR3-ANCHOR-NEW · CR3-MENU-SOP · CR3-ACTION-AUTO · CR3-ACTION-FLOW · CR3-ACTION-NOCLOSE · CR3-ACTION-MANUAL ·
     CR3-ACTION-NOLEAK · CR3-ACTION-B4 · CR3-SNAPSHOT · CR3-SNAPSHOT-CAP · CR3-LOCK · CR3-REVIEW-MONTHLY · CR3-REVIEW-WEEKLY · CR3-GAP · CR3-STORAGE */
  async function phase3D() {
    const res = [], App = global.App, Calc = global.Calc, step = (id, pass, info) => res.push(Object.assign({ id, pass: !!pass }, info || {}));
    if (global.supDataset() !== 'integrated' || !db.feedBase) return [{ id: 'CR3-3D', pass: false, info: 'needs a fresh Integrated demo' }];
    const before = errors.length, setS = patch => App.saveSettings(Object.assign({}, App.S, patch)), acts = () => db.sopActions || [], isOpen = a => a.status === 'open' || a.status === 'ack';
    await login('planner'); global.navigate('supSop'); await wait(1500);
    const foot = (document.querySelector('#footBuild') || {}).innerText || '';
    step('CR3-3D-VERSION', APP_VERSION.history.some(h => h[0] === '8.4.0') && foot.includes('v' + APP_VERSION.number), { foot });
    const aL = await anchors(), aN = await anchors('new');
    step('CR3-LEGACY (every switch old → CR-01 anchors)', aL.pass, { diff: aL.diff });
    step('CR3-ANCHOR-NEW (every switch new → README anchors)', aN.pass, { diff: aN.diff });
    // 1) menu: Director / Planner / every Manager see the page · Sales Admin / Finance / Warehouse / Admin are refused
    const seen = {};
    for (const [r, u] of [['director'], ['planner'], ['manager', 'mgr-tt'], ['salesAdmin', 'sa-mt'], ['finance'], ['warehouse'], ['admin']]) { await login(r, u); seen[u || r] = global.workCanVisit('supSop') && !!document.querySelector('aside nav button[data-view="supSop"]'); }
    step('CR3-MENU-SOP', seen.director && seen.planner && seen['mgr-tt'] && !seen['sa-mt'] && !seen.finance && !seen.warehouse && !seen.admin, { seen });
    // 2) automatic actions: one open item per condition key · a second sync adds nothing · A7 owners
    await login('planner'); global.navigate('supSop'); await wait(1500);
    const D = App.DB, S = App.S, as = global.Supply.defaultAsOf(), M = Calc.computeModel(D, { asDn: as, view: 'W', ch: [], acc: [], brand: [], cat: [], q: '', rr: S.rrBasis || 'L4W', h: 3 }, S, {}), E = Calc.earlyWarnOf(D, M.rows, as, M.mask, S);
    const open = acts().filter(isOpen), keys = open.filter(a => a.key).map(a => a.key), uniq = new Set(keys).size === keys.length;
    const want = E.alerts.length + M.rows.filter(r => r.status === 'stockout' || r.status === 'reorder').length + M.rows.filter(r => r.expiry).length
      + D.skus.filter((x, i) => { const T = Calc.skuTrend(D, i, as, null); return T.ok && T.down && T.level > 0; }).length;   // CR-04 R9: + one "ขาลงต่อเนื่อง" action per declining SKU
    const n0 = acts().length; sopSync(true); const n1 = acts().length;
    const ew = open.find(a => a.type.startsWith('ew_')), so = open.find(a => a.type === 'stockout'), ex = open.find(a => a.type === 'expiry' && a.ch);
    const owners = ew && ew.owner === 'mgr-mt' && so && so.owner === 'planner' && (!ex || (ex.owner === 'planner' && ex.coOwner === 'mgr-' + ex.ch.toLowerCase()));
    step('CR3-ACTION-AUTO (one per condition · no duplicate · owners A7)', open.length === want && uniq && n1 === n0 && owners && E.alerts.every(a => keys.includes('ew|' + a.key)), { open: open.length, want, again: n1 - n0, ew: ew && ew.owner, stockout: so && so.owner, expiry: ex && [ex.owner, ex.coOwner] });
    // 3) status flow: open → acknowledged → done · not done needs a reason · no way back · every change audited (before / after)
    const a1 = open.find(a => a.type === 'reorder'), a2 = open.find(a => a.type === 'stockout'), logs0 = db.logs.filter(l => l.event === 'sopActionEvent').length;
    const r1 = sopAct(a1.id, 'ack'), r2 = sopAct(a1.id, 'done'), r3 = sopAct(a1.id, 'ack'), r4 = sopAct(a2.id, 'dropped', ''), r5 = sopAct(a2.id, 'dropped', 'UAT — handled in the meeting');
    const lg = db.logs.filter(l => l.event === 'sopActionEvent'), audited = lg.length === logs0 + 3 && lg[0].before && lg[0].after && lg[0].after.status === 'dropped';
    sopSync(true); const back = acts().filter(a => a.key === a1.key);   // closed this week → not raised again before next week
    step('CR3-ACTION-FLOW (ack → done · reason for not done · no going back · audit)', r1.ok && r2.ok && r3.error === 'sopBadFlow' && r4.error === 'sopNeedReason' && r5.ok && audited && back.length === 1 && back[0].status === 'done', { audit: lg.length - logs0 });
    // 4) never closed by the system: the condition goes away (thresholds raised) → flagged, still open · confirm close works
    const wos0 = acts().filter(a => a.type === 'ew_wos' && isOpen(a)).length;
    setS({ wosYellowX: 40, wosRedX: 50 }); await global.Supply.ensureData(); sopSync(true);   // only stock with no sales stays red
    const wos = acts().filter(a => a.type === 'ew_wos' && isOpen(a)), goneL = wos.filter(a => a.condGone), gone = goneL.length > 0 && wos.length === wos0;
    global.navigate('supSop'); await wait(900); const pill = !!document.querySelector('#page .pill.ok') && /เงื่อนไขหายแล้ว|Condition gone/.test(document.querySelector('#page').innerText);
    const rc = sopAct(goneL[0].id, 'done'); setS({ wosYellowX: 4, wosRedX: 5 }); await global.Supply.ensureData(); sopSync(true);
    const still = acts().filter(a => a.type === 'ew_wos' && isOpen(a)), back2 = still.every(a => !a.condGone) && still.length === wos0 - 1;
    step('CR3-ACTION-NOCLOSE (condition gone → flagged, still open · confirm close)', gone && pill && rc.ok && back2, { open: wos0, flagged: goneL.length, after: still.length });
    // 5) added in the meeting: Planner any account · Manager MT only MT (TT refused)
    const m1 = sopAdd({ title: 'UAT: check the 7-Eleven promo', sku: 'CM-FD-001', acc: 'A01', sev: 'high', owner: 'mgr-mt' });
    await login('manager', 'mgr-mt'); const m2 = sopAdd({ title: 'UAT: TT account', acc: 'A08', sev: 'low' }), m3 = sopAdd({ title: 'UAT: Watsons shelf', acc: 'A02', sev: 'medium' });
    const mtSees = acts().filter(sopVisible), mtOk = mtSees.some(a => a.id === m1.id) && mtSees.some(a => a.id === m3.id) && mtSees.every(a => a.ch === 'MT' || sopMine(a));
    await login('manager', 'mgr-tt'); const ttSees = acts().filter(sopVisible), ttOk = !ttSees.some(a => a.id === m1.id || a.id === m3.id) && ttSees.every(a => a.ch === 'TT' || sopMine(a));
    const ttWork = sopAct(m3.id, 'ack');
    step('CR3-ACTION-MANUAL (Planner · Manager own department only)', m1.ok && m2.error === 'sopBadAcc' && m3.ok && db.logs.some(l => l.event === 'sopAddEvent' && l.ref.startsWith(m1.id)), { tt: m2.error });
    step('CR3-ACTION-NOLEAK (Manager MT / TT see own department · cannot work others)', mtOk && ttOk && ttWork.error === 'denied', { mt: mtSees.length, tt: ttSees.length });
    // 6) Ops home card: my overdue actions (Manager MT) → the page, filtered to mine
    const m1a = acts().find(a => a.id === m1.id); m1a.due = Date.now() - 2 * 864e5; persist();
    await login('manager', 'mgr-mt'); global.navigate('overview'); await wait(900);
    const b4 = document.querySelector('[data-sop-mine]'), b4n = b4 ? +b4.querySelector('b').innerText.replace(/\D/g, '') : 0; b4 && b4.click(); await wait(1200);
    const rowsShown = [...document.querySelectorAll('#sopActions [data-sop-row]')].map(x => x.dataset.sopRow);
    step('CR3-ACTION-B4 (home card · my overdue → the page)', b4n >= 1 && location.hash === '#/supply/sop' && rowsShown.includes(m1.id) && document.querySelector('#sopMine').checked, { b4: b4n });
    // 7) plan snapshot: close → move a PO + a Stockout Date → close again → compare
    await login('planner'); global.navigate('supSop'); await wait(800);
    const c1 = await sopClose();
    const rs = Calc.computeModel(App.DB, { asDn: as, view: 'W', ch: [], acc: [], brand: [], cat: [], q: '', rr: S.rrBasis || 'L4W', h: 3 }, App.S, {}).rows.filter(r => r.stockoutDn != null && r.rrTot > 0 && App.DB.po[r.i].some(p => p.status !== 'Received' && p.status !== 'Cancelled' && (p.rec == null || p.rec >= as) && p.eta > as && p.eta < r.stockoutDn));
    const tr = rs[0], po = App.DB.po[tr.i].find(p => p.status !== 'Received' && p.status !== 'Cancelled' && (p.rec == null || p.rec >= as) && p.eta > as && p.eta < tr.stockoutDn);
    const eta2 = Calc.iso(po.eta + 60), pr = supPoSave(po.po_no, { eta: eta2, status: po.status === 'Planned' ? 'Planned' : 'Delayed', reason: 'UAT: supplier delay' }); await global.Supply.ensureData();   // supPoSave persists → the feed key moves
    setS({ rrBasis: 'L6M' }); App.setF && App.F && App.setF({ rr: 'L6M' });   // the settings used change too (run rate L6M) → Stockout Dates move
    const c2 = await sopClose(), cmp = Calc.comparePlans(c2.snap, c1.snap, App.S.sopMoveDays); setS({ rrBasis: 'L4W' }); App.F && App.setF({ rr: 'L4W' });
    const q2 = JSON.parse(JSON.stringify(c2.snap)), qk = Object.keys(q2.quota)[0]; q2.quota[qk] += 50; const cq = Calc.comparePlans(q2, c2.snap, 14);
    sopTab = 'snaps'; global.navigate('supSop'); await wait(1000); const cmpUi = !!document.querySelector('#sopCompare') && document.querySelector('#sopCompare').innerText.includes(po.po_no);
    step('CR3-SNAPSHOT (close · PO moved + Stockout Date > 14 days · quota change · compare on the page)', c1.ok && c2.ok && pr.ok !== false && cmp.po.some(x => x.po === po.po_no && x.kind === 'moved' && x.d === 60) && cmp.so.length > 0 && c2.snap.settings.rrBasis === 'L6M' && cq.quota.length === 1 && cq.quota[0].to - cq.quota[0].from === 50 && cmpUi && db.logs.some(l => l.event === 'sopCloseEvent'),
      { sku: tr.sku, po: po.po_no, so: cmp.so.length, poCh: cmp.po.length });
    // 8) at most 12 cycles (oldest out) · kept in IndexedDB · JSON export for Planner / Director
    const cl = []; for (let k = 0; k < 11; k++) cl.push((await sopClose()).ok);
    const stored = (await Data.Store.all()).sop_snapshots || [], exportBtn = !!document.querySelector('[data-sop-export]') || (global.navigate('supSop'), await wait(600), !!document.querySelector('[data-sop-export]'));
    step('CR3-SNAPSHOT-CAP (12 cycles · IndexedDB · export)', sopSnaps.length === 12 && stored.length === 12 && !sopSnaps.some(x => x.id === c1.snap.id) && exportBtn, { kept: sopSnaps.length, stored: stored.length });
    sopTab = 'actions';
    // 9) plan lock day (A6 = 20): after it a next-month quota proposal / draft carries a warning and an audit entry · before it, none
    const nxt = Calc.monthKey(Calc.addMonths(Calc.monthStart(Calc.dn(dateKey(Date.now()))), 1)), day = +dateKey(Date.now()).slice(8, 10);
    const qsku = 'CM-FD-002', pA = supPropose({ type: 'quota', sku: qsku, account: 'A02', period: nxt, qty: 120, detail: 'UAT lock' });
    setS({ planLockDay: 28 }); const pB = supPropose({ type: 'quota', sku: 'CM-FD-004', account: 'A02', period: nxt, qty: 80, detail: 'UAT lock' }); setS({ planLockDay: 20 });
    step('CR3-LOCK (after day 20 → warning + audit · lock day 28 → none)', day > 20 ? (pA.ok && pA.lockWarn && db.logs.some(l => l.event === 'sopLockEvent' && l.ref.startsWith(pA.prop.id)) && pB.ok && !pB.lockWarn) : (pA.ok && !pA.lockWarn), { today: day, a: pA.lockWarn, b: pB.lockWarn });
    // 10) Supply Review: Monthly = 4 S&OP parts · Weekly = + open actions
    global.navigate('supReview'); await wait(1200); const wk = !!document.querySelector('#rp-actions');
    App.setF({ view: 'M' }); await wait(1500);
    const parts = ['#rp-sop-demand', '#rp-sop-supply', '#rp-sop-gap', '#rp-sop-exec'].map(x => !!document.querySelector(x)), tiles = document.querySelectorAll('#rp-sop-exec .sop-tiles > div').length;
    const prevAct = /รอบล่าสุด|Latest cycle/.test((document.querySelector('#rp-sop-exec') || {}).innerText || ''), rtxt = (document.querySelector('.report') || {}).innerText || '';
    App.setF({ view: 'W' });
    step('CR3-REVIEW-MONTHLY (demand · supply · pre-S&OP gap · exec summary)', parts.every(Boolean) && tiles === 6 && prevAct && !/undefined|NaN/.test(rtxt), { parts, tiles });
    step('CR3-REVIEW-WEEKLY (format kept + open actions)', wk);
    // 11) pre-S&OP gap by hand (first short SKU, month 1)
    const Mm = Calc.computeModel(App.DB, { asDn: as, view: 'W', ch: [], acc: [], brand: [], cat: [], q: '', rr: S.rrBasis || 'L4W', h: 3 }, App.S, {}), G = Calc.sopGapOf(App.DB, Mm, null), g = G.rows[0];
    let hOk = false, hand = null;
    if (g) { const r = Mm.rows.find(x => x.i === g.i), b1 = Calc.addMonths(as, 1), Dd = App.DB; let dem = 0, po2 = 0, cn = 0;
      for (let d = as; d < b1; d++) { const q = Dd.quota[r.i].get(Calc.monthKey(d)), dim = Calc.daysInMonth(d); Dd.accounts.forEach(a => { dem += a.is_consignment && q && q[a.j] > 0 ? q[a.j] / dim : r.rr[a.j]; }); }
      Dd.po[r.i].forEach(p => { if (p.status === 'Cancelled' || (p.rec != null && p.rec < as)) return; const d = Math.max(p.eta ?? as, as); if (d < b1) po2 += p.qty; });
      Dd.cn[r.i].forEach(c => { if (!c.good || /cancel|reject/i.test(c.status) || (c.status === 'Received' && c.dn < as)) return; if (Math.max(c.dn, as) < b1) cn += c.qty; });
      const gap = Math.max(0, r.wh) + po2 + cn - dem; hand = { sku: g.sku, gap: Math.round(gap), app: Math.round(g.months[0].gap) }; hOk = Math.abs(gap - g.months[0].gap) < 1e-6 && g.opts.length > 0; }
    step('CR3-GAP (month 1 by hand · options)', hOk, { hand, rows: G.rows.length });
    // 12) storage card shows the snapshots / action log against their caps
    global.navigate('supSetup'); await wait(1200); const st = (document.querySelector('#card-storage') || {}).innerText || '';
    step('CR3-STORAGE (snapshots 12 · action log 2,000 shown)', /12 \/ 12/.test(st) && /2,000/.test(st), { text: st.replace(/\s+/g, ' ').slice(0, 200) });
    step('selfCheck 1–12', App.sc.ok, { failed: App.sc.checks.filter(c => !c.ok).map(c => c.id) });
    // 13) default page after sign-in = หน้าหลัก (every role) · a Supply link opened in a new tab still opens that page once
    const land = []; for (const [r, u] of [['director'], ['manager', 'mgr-mt'], ['planner']]) { await login(r, u); land.push((u || r) + ':' + view); }
    global.logoutForUserSwitch(); global.render(); await wait(120); supDeepUsed = false; history.replaceState(null, '', '#/supply/quota');
    let sel = document.querySelector('#loginRole'); sel.value = 'director'; sel.dispatchEvent(new Event('change')); document.querySelector('#login').click(); await wait(900); const deep = view;
    global.logoutForUserSwitch(); global.render(); await wait(120); history.replaceState(null, '', '#/supply/quota');
    sel = document.querySelector('#loginRole'); sel.value = 'director'; sel.dispatchEvent(new Event('change')); document.querySelector('#login').click(); await wait(600); const again = view;
    step('CR3-DEFAULT-PAGE (sign-in → หน้าหลัก · link in a new tab → that page once)', land.every(x => x.endsWith(':overview')) && deep === 'supQuota' && again === 'overview', { land, deep, again });
    step('console errors (3D)', errors.length === before, { errors: errors.slice(before) });
    return res;
  }

  /** CR-03: keep a suite's results across demo resets (localStorage 'uat.cr03') for the UAT report */
  function keep(suite, list, extra) {
    let o = {}; try { o = JSON.parse(localStorage.getItem('uat.cr03') || '{}'); } catch (e) { o = {}; }
    o[suite] = Object.assign({ at: new Date().toISOString(), width: global.innerWidth, build: (document.querySelector('script[src*="calc.js"]') || {}).src?.split('v=')[1] || '' }, extra || {},
      { results: list.map(r => ({ id: r.id, pass: !!r.pass, info: JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'id' && k !== 'pass'))).slice(0, 400) })) });
    localStorage.setItem('uat.cr03', JSON.stringify(o)); return list.filter(r => r.pass).length + '/' + list.length;
  }
  /* ---------------------------------------------------------------- CR-04 · SupUAT.cr04() (fresh Integrated demo · 1440 px; run again at 390 px for the
     mobile checks) and SupUAT.cr04data() (changes the data: count adjustment + plan-period roll — run last, then start a fresh demo) */
  const num = s => { const m = String(s == null ? '' : s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : NaN; };
  async function homeReady() { for (let k = 0; k < 40; k++) { if (view === 'overview' && !document.querySelector('.hm-card.skel') && !(document.querySelector('#hmAlert') && !document.querySelector('#hmAlert').children.length)) return; await wait(200); } }
  const cardVal = id => num(document.querySelector(`[data-hm-card="${id}"] strong`)?.innerText);
  async function supReady(v) { global.navigate(v); for (let k = 0; k < 50 && !(document.querySelector('#main') && document.querySelector('#main').children.length && global.App.DB && global.App.F); k++) await wait(200); await wait(400); }
  async function supF() { for (let k = 0; k < 50 && !(global.App.F && global.App.DB); k++) await wait(200); }
  async function cr04() {
    const res = [], App = global.App, Calc = global.Calc, St = global.St, step = (id, pass, info) => res.push(Object.assign({ id, pass: !!pass }, info || {}));
    if (global.supDataset() !== 'integrated' || !db.feedBase) return [{ id: 'CR4', pass: false, info: 'needs a fresh Integrated demo' }];
    const before = errors.length, W = innerWidth, phone = W <= 700, today = opsDay();
    try { localStorage.removeItem('ops.navCollapsed'); localStorage.removeItem('ops.navOpened'); } catch (e) { /* storage blocked */ }

    // CR4-LANDING — every profile lands on หน้าหลัก · a deep link (first sign-in of a page load) still opens its page, once
    const land = [];
    for (const [r, u] of PROFILES) { await login(r, u); land.push((u || r) + ':' + view); }
    global.logoutForUserSwitch(); global.render(); await wait(80);
    history.replaceState(null, '', location.pathname + '#/supply/quota'); supDeepUsed = false; await login('manager', 'mgr-mt'); await wait(300); const deepSup = view;
    global.logoutForUserSwitch(); global.render(); await wait(80);
    history.replaceState(null, '', location.pathname + '#customers?d=7d'); supDeepUsed = false; await login('director'); await wait(200); const deepOps = view + ':' + global.ofbState('customers').d;
    await login('director'); const again = view;
    step('CR4-LANDING', land.every(x => x.endsWith(':overview')) && deepSup === 'supQuota' && deepOps === 'customers:7d' && again === 'overview', { land: land.filter(x => !x.endsWith(':overview')), deepSup, deepOps, again });

    // CR4-MENU-ORDER · CR4-GATE
    const ORDER = CR4_NAV.map(g => g[0]), mo = [];
    for (const [r, u] of PROFILES) {
      await login(r, u); const groups = [...document.querySelectorAll('aside .navgroup')].map(g => g.dataset.group);
      const okOrder = groups.every((g, k) => k === 0 || ORDER.indexOf(groups[k - 1]) < ORDER.indexOf(g)), homeFirst = groups[0] === 'home' && !document.querySelector('aside .navgroup[data-group="home"] .navhead');
      const closed = ['data', 'admin'].every(g => { const el = document.querySelector(`aside .navgroup[data-group="${g}"]`); return !el || el.classList.contains('collapsed'); });
      mo.push({ who: u || r, ok: okOrder && homeFirst && closed, groups: groups.join('>') });
    }
    await login('admin'); global.navigate('audit'); await wait(80); const curOpen = !document.querySelector('aside .navgroup[data-group="admin"]').classList.contains('collapsed');
    const m = await menu(), g = await opsGate();
    step('CR4-MENU-ORDER', mo.every(x => x.ok) && curOpen && m.every(x => x.pass), { bad: mo.filter(x => !x.ok), curOpen, ids: m.filter(x => !x.pass).map(x => x.id) });
    step('CR4-GATE', g.every(x => x.pass) && m.every(x => x.pass), { fail: g.filter(x => !x.pass).map(x => x.id + ' ' + x.denied + ' ' + (x.broken || []).join(',')) });

    // CR4-HOME-ROLE — the R2-3 cards per role · Warehouse / ERP no sales or E-commerce · nothing the role cannot act on
    const EXP = { director: 'netMtd,backlog,stock,stockout,expiry,lost', 'mgr-mt': 'salesMtd,quotaLeft,backlog,instock,fva', 'mgr-tt': 'salesMtd,quotaLeft,backlog,stockout,fva', 'mgr-ecom': 'salesMtd,quotaLeft,backlog,stockout,fva',
      'sa-mt': 'ordersToday,payWait,blocked,quotaLeft', 'sa-tt': 'ordersToday,payWait,blocked,quotaLeft', 'sa-ecom': 'ordersToday,payWait,blocked,quotaLeft', warehouse: 'manifest,returns,issue,po7,lot90', finance: 'payCheck,sla,cn,ivcn',
      planner: 'soComplete,actions,propWait,order30,poDelay,sc', admin: 'sc,storage,ds' };
    const hr = [];
    for (const [r, u] of PROFILES) {
      await login(r, u); await homeReady(); const p = document.querySelector('#page'), ids = [...p.querySelectorAll('.hm-card')].map(c => c.dataset.hmCard).join(',');
      const salesTxt = /ยอดขาย|Net sales|ออเดอร์วันนี้|Orders today/.test([...p.querySelectorAll('.hm-card small')].map(x => x.innerText).join('|'));
      const ecom = !!p.querySelector('.ecom-home-panel'), more = !!p.querySelector('.hm-more'), canProp = Object.values(PROP).some(x => global.fuCan(x.perm)), propItem = !!p.querySelector('.sup-b4-item[data-b4-go="supProposals"]');
      const dead = [...p.querySelectorAll('.hm-card:not([disabled]),.sup-b4-item:not([disabled])')].filter(c => { const v = (c.getAttribute('data-hm-go') || c.getAttribute('data-b4-go') || '').split('|')[0].split(':')[0]; return v && !global.workCanVisit(v); }).length;
      const noSales = ['warehouse', 'finance'].includes(r);
      hr.push({ who: u || r, ids, ok: ids === EXP[u || r] && (!noSales || (!salesTxt && !ecom && !more)) && (canProp || !propItem) && dead === 0 });
    }
    step('CR4-HOME-ROLE', hr.every(x => x.ok), { bad: hr.filter(x => !x.ok) });

    // CR4-HOME-MATCH — every home number = the source page (same function, same filter) · ≥ 12 numbers, Ops + Supply
    const mt = [], cmp = (k, home, page, tol) => mt.push({ k, home, page, ok: isFinite(home) && isFinite(page) && Math.abs(home - page) <= (tol == null ? 0.5 : tol) });
    await login('director'); await homeReady();
    const H = { netMtd: cardVal('netMtd'), backlog: cardVal('backlog'), stock: cardVal('stock'), stockout: cardVal('stockout'), expiry: cardVal('expiry'), lost: cardVal('lost'), alertOut: num(document.querySelector('.sup-b4-item[data-b4-go="supStock:stockout"] b')?.innerText) };
    global.navigate('workQueue'); await wait(150); cmp('backlog = งานค้าง (ทั้งหมด)', H.backlog, num(document.querySelector('.fu-kpis .panel h2')?.innerText));
    const rs = global.ofbState('reports'); rs.d = 'custom'; rs.from = today.slice(0, 8) + '01'; rs.to = today; global.navigate('reports'); await wait(150); cmp('net MTD = รายงาน', H.netMtd, Math.round(global.opsReportData().net));
    global.ofbReset('reports'); await supReady('supOverview'); const M0 = App.model();
    cmp('Stock value', H.stock, Math.round(M0.kpi.stockValue)); cmp('SKU stockout', H.stockout, M0.statusCount.stockout); cmp('Supply Alert stockout', H.alertOut, M0.statusCount.stockout);
    cmp('Expiry 3M', H.expiry, Math.round(M0.kpi.riskBy[1][1])); cmp('Lost sales 4W', H.lost, Math.round(M0.rows.reduce((x, r) => x + (r.lost4V || 0), 0)));
    await login('manager', 'mgr-mt'); await homeReady(); const HM = { ql: cardVal('quotaLeft'), ins: cardVal('instock'), fva: cardVal('fva') };
    global.navigate('allocation'); await wait(250);
    const qPanel = [...document.querySelectorAll('#page .panel')].find(s => [...s.querySelectorAll('th')].some(th => th.innerText.trim() === t('workQuotaLeft')));
    cmp('Quota left = สินค้าคงคลังและโควตา', HM.ql, qPanel ? [...qPanel.querySelectorAll('tbody tr')].reduce((x, tr) => x + num(tr.children[1]?.innerText), 0) : NaN);
    await supReady('supConsign'); const MC = App.model(); cmp('In-stock rate (MT)', HM.ins, Math.round(Calc.earlyWarnOf(App.DB, MC.rows, MC.asDn, MC.mask, MC.S).kpi.instock * 10) / 10, 0.05);
    await supReady('supQuota'); const fv = global.Pages.fvaData(App, 3).total; cmp('FVA (MT)', HM.fva, Math.round(fv.fva * 10) / 10, 0.05);
    await login('planner'); await homeReady(); const HP = { prop: cardVal('propWait'), delay: cardVal('poDelay') };
    cmp('Proposals waiting', HP.prop, global.props().filter(p => p.status === 'submitted' && global.propVisible(p)).length);
    await supReady('supCalendar'); cmp('PO delayed', HP.delay, Calc.inboundOf(App.DB, App.model()).kpi.delayN);
    await login('warehouse'); await homeReady(); const HW = cardVal('manifest'); global.navigate('workQueue'); await wait(150); cmp('Handover to confirm = งานค้างและส่งมอบ', HW, num(document.querySelectorAll('.fu-kpis .panel h2')[2]?.innerText));
    await login('finance'); await homeReady(); cmp('IV − CN today', cardVal('ivcn'), Math.round(global.orgTodaySales()));
    step('CR4-HOME-MATCH', mt.length >= 12 && mt.every(x => x.ok), { n: mt.length, bad: mt.filter(x => !x.ok) });

    // CR4-FLOW-STRIP — each Order → Cash box = the order tab it opens · Supply PO 14 days = the calendar function
    await login('director'); await homeReady(); const fl = [];
    for (const k of ['confirm', 'pay', 'docs', 'pick']) {
      await login('director'); await homeReady(); const b = document.querySelector(`[data-flow="order"] [data-flow-step="${k}"]`), v = num(b?.querySelector('b')?.innerText); b?.click(); await wait(150);
      const sel = document.querySelector('[data-cr4-tab].selected'); fl.push({ k, home: v, tab: sel?.dataset.cr4Tab, page: num(sel?.querySelector('b')?.innerText), ok: view === 'orders' && sel?.dataset.cr4Tab === k && num(sel?.querySelector('b')?.innerText) === v });
    }
    await login('director'); await homeReady(); const poBox = num(document.querySelector('[data-flow="supply"] [data-flow-step="po"] b')?.innerText);
    document.querySelector('[data-flow="supply"] [data-flow-step="po"]')?.click(); await wait(800); await supF(); await wait(300); const MI = App.model(), poPage = Calc.inboundOf(App.DB, MI).po.filter(p => p.open && p.day >= MI.asDn && p.day < MI.asDn + 14).length;
    step('CR4-FLOW-STRIP', fl.every(x => x.ok) && poBox === poPage && view === 'supCalendar', { fl: fl.filter(x => !x.ok), poBox, poPage });

    // CR4-MYWORK — one item per source, only for the role that acts on it · creator never sees their own approval · sorted · opens the item
    await login('planner'); await supReady('supOverview'); const M1 = App.model(), sku1 = M1.rows[5].sku;
    const pr = global.supPropose({ type: 'po', sku: sku1, qty: 400, lt: 20 }); global.supPropAct(pr.prop.id, 'submit');
    const act = global.sopAdd({ title: 'UAT CR-04 my work', sku: sku1, acc: 'A01', sev: 'high', owner: 'mgr-mt' }); const a = global.sopActs().find(x => x.id === act.id); if (a) { a.due = Date.now() - 2 * 864e5; global.persist(); }
    await homeReady(); const plannerSeesOwn = !!document.querySelector(`#page [data-prop-open="${pr.prop.id}"]`);
    await login('warehouse'); const isku = App.DB.skus.map(s => s.sku).find(s => global.issueFreeOk(s, 10, 'pr')) || App.DB.skus[2].sku, iq = global.issueRequest({ type: 'pr', sku: isku, qty: 10, ref: 'UAT-CR4-' + Date.now(), reason: 'UAT CR-04' }); await homeReady(); const whSeesOwn = !!document.querySelector('#page .hm-witem[data-hm-src="approve"]') && [...document.querySelectorAll('#page .hm-witem')].some(x => x.innerText.includes(iq.issue?.id || '¤'));
    const mtOrder = db.orders.find(o => partner(o.partner)?.type === 'MT' && global.liveOrder(o) && !global.orderDoc(o));
    if (mtOrder) { const l = global.getOrderLines(mtOrder)[0]; mtOrder.quotaCheck = { pass: false, rows: [{ sku: l.sku, need: l.qty, quota: 0, used: 0, left: 0, short: l.qty, pass: false }], time: Date.now(), actor: 'uat' }; global.persist(); }
    const hmIds = () => [...document.querySelectorAll('#page .hm-witem')].map(x => (x.getAttribute('data-prop-open') || x.getAttribute('data-sop-open') || x.getAttribute('data-hm-order') || x.getAttribute('data-hm-go') || '') + '|' + x.innerText.replace(/\s+/g, ' '));
    await login('director'); await homeReady(); hmShowAll = true; global.render(); await homeReady(); const dir = hmIds();
    const sorted = (D => D.work.every((w, k) => k === 0 || D.work[k - 1].sev < w.sev || (D.work[k - 1].sev === w.sev && (D.work[k - 1].due ?? 9e15) <= (w.due ?? 9e15))))(global.homeData());
    const dirProp = dir.some(x => x.startsWith(pr.prop.id + '|')), dirIssue = dir.some(x => x.includes(iq.issue?.id || '¤'));
    document.querySelector(`#page [data-prop-open="${pr.prop.id}"]`)?.click(); await wait(200); const opened = !!document.querySelector('#modal[open]') && document.querySelector('#modal').innerText.includes(pr.prop.id); if (document.querySelector('#modal[open]')) document.querySelector('#modal').close();
    hmShowAll = false;
    await login('manager', 'mgr-mt'); await homeReady(); hmShowAll = true; global.render(); await homeReady(); const mtW = hmIds(), mtAct = mtW.some(x => x.startsWith(act.id + '|')); hmShowAll = false;
    await login('manager', 'mgr-tt'); await homeReady(); const ttAct = hmIds().some(x => x.startsWith(act.id + '|'));
    await login('salesAdmin', 'sa-mt'); await homeReady(); hmShowAll = true; global.render(); await homeReady(); const saMt = mtOrder ? hmIds().some(x => x.startsWith(mtOrder.id + '|') && x.includes(t('hmW_blocked'))) : true; hmShowAll = false;
    await login('salesAdmin', 'sa-tt'); await homeReady(); const saTt = mtOrder ? hmIds().some(x => x.startsWith(mtOrder.id + '|')) : false;
    step('CR4-MYWORK', dirProp && !plannerSeesOwn && dirIssue && !whSeesOwn && mtAct && !ttAct && saMt && !saTt && sorted && opened, { dirProp, plannerSeesOwn, dirIssue, whSeesOwn, mtAct, ttAct, saMt, saTt, sorted, opened });

    // CR4-NOLEAK — the home page of every department-scoped profile (same rule as noleak())
    const nl = [];
    for (const [r, u] of PROFILES.filter(([r]) => ['manager', 'salesAdmin'].includes(r))) {
      await login(r, u); await homeReady(); document.querySelectorAll('#page details').forEach(d => d.open = true); await wait(50);
      const own = { MT: 'MT', TT: 'TT', Ecom: 'ECOM' }[global.orgSessionGroup()], foreign = App.DB.accounts.filter(x => x.channel !== own).map(x => x.name).filter(x => x.length > 3), txt = document.querySelector('#page').innerText;
      const hits = foreign.filter(x => word(x).test(txt)).concat(['MT', 'TT', 'ECOM'].filter(c => c !== own && word(c).test(txt)));
      nl.push({ who: u, hits });
    }
    step('CR4-NOLEAK', nl.every(x => !x.hits.length), { hits: nl.filter(x => x.hits.length) });

    // CR4-DATASET — UAT seed: no Supply number on the home page, a box instead · Integrated: the numbers
    await login('director'); await homeReady(); const integ = !!document.querySelector('[data-hm-card="stock"]') && !!document.querySelector('#page .sup-b4') && !document.querySelector('.hm-supinfo');
    const keepDs = db.dataset; db.dataset = 'uat'; global.render(); await wait(300);
    const pg = document.querySelector('#page'), uat = !pg.querySelector('[data-hm-card="stock"],[data-hm-card="expiry"],[data-hm-card="lost"]') && !pg.querySelector('.sup-b4') && !pg.querySelector('[data-flow="supply"]') && !!pg.querySelector('.hm-supinfo [data-hm-ds]') && !/AS OF/.test(pg.querySelector('.hm-head')?.innerText || '');
    db.dataset = keepDs; global.render(); await global.Supply.ensureData(); await homeReady();
    step('CR4-DATASET', integ && uat, { integ, uat });

    // CR4-ALERT-GRID — every row of the Supply Alert is full (no empty cell, no lone card next to space) at this width
    const ag = [];
    for (const [r, u] of [['director'], ['manager', 'mgr-mt'], ['warehouse'], ['planner']]) {
      await login(r, u); await homeReady(); const row = document.querySelector('#page .sup-b4-row'); if (!row) { ag.push({ who: u || r, ok: true, none: true }); continue; }
      const c = +row.dataset.cols || 1, rowsBy = {}; [...row.children].forEach(x => { const top = Math.round(x.offsetTop); const sp = +(String(x.style.gridColumn).match(/span (\d+)/) || [, 1])[1]; rowsBy[top] = (rowsBy[top] || 0) + sp; });
      ag.push({ who: u || r, cols: c, rows: Object.values(rowsBy), ok: Object.values(rowsBy).every(s => s === c) });
    }
    step('CR4-ALERT-GRID', ag.every(x => x.ok), { width: W, ag });

    // CR4-HEIGHT — Director home (ดูเพิ่ม folded): ≤ 1,800 px at 1440 · ≤ 3,400 px at 390
    await login('director'); await homeReady(); await wait(300); const hgt = document.documentElement.scrollHeight, lim = W >= 1200 ? 1800 : W <= 420 ? 3400 : null;
    step('CR4-HEIGHT', lim == null || hgt <= lim, { width: W, height: hgt, limit: lim });

    // CR4-SCOPE01 — "เสนอ" on the phone cards of Replenishment / Consignment / Quota vs Actual (desktop: the table column)
    await login('planner'); const sc = [];
    for (const v of ['supReplen', 'supConsign', 'supQuota']) { await supReady(v); await wait(300); const btns = document.querySelectorAll(phone ? '#main .cc-prop [data-propose], #main td [data-propose]' : '#main [data-propose]'); sc.push({ v, n: btns.length }); }
    let made = null; { await supReady('supReplen'); await wait(300); const b = document.querySelector(phone ? '#main .cc-prop [data-propose]' : '#main [data-propose]'); const n0 = global.props().length; document.querySelector('#toast').textContent = ''; b?.click(); await wait(200); made = global.props().length - n0 === 1 || /SPR-/.test(document.querySelector('#toast').textContent) ? 1 : 0; }
    step('CR4-SCOPE01', sc.every(x => x.n > 0) && made === 1, { phone, sc, made });

    // CR4-ORDER-TABS
    await login('director'); global.navigate('orders'); await wait(150); global.ofbState('orders').d = 'all'; global.ofbApply('orders'); await wait(100);
    const tabs = [...document.querySelectorAll('[data-cr4-tab]')], cnt = Object.fromEntries(tabs.map(b => [b.dataset.cr4Tab, num(b.querySelector('b').innerText)]));
    const sumOk = CR4_STAGES.reduce((x, k) => x + cnt[k], 0) === cnt.all, ot = [];
    for (const k of CR4_TABS) { document.querySelector(`[data-cr4-tab="${k}"]`).click(); await wait(80); ot.push({ k, ok: document.querySelector('#cr4StageHead')?.innerText === t('st_' + k) && global.filteredDetailedOrders().every(o => k === 'all' || global.cr4OrderStage(o) === k) && global.filteredDetailedOrders().length === cnt[k] }); }
    global.navigate('payments'); await wait(80); const payTab = document.querySelector('[data-cr4-tab].selected')?.dataset.cr4Tab;
    global.navigate('shipping'); await wait(80); const shipTab = document.querySelector('[data-cr4-tab].selected')?.dataset.cr4Tab;
    await login('finance'); global.navigate('orders'); await wait(80); const erpTab = document.querySelector('[data-cr4-tab].selected')?.dataset.cr4Tab;
    await login('warehouse'); global.navigate('orders'); await wait(80); const whTab = document.querySelector('[data-cr4-tab].selected')?.dataset.cr4Tab;
    step('CR4-ORDER-TABS', tabs.length === 8 && sumOk && ot.every(x => x.ok) && payTab === 'pay' && shipTab === 'pick' && erpTab === 'pay' && whTab === 'pick' && !document.querySelector('.work-family-tabs'), { n: tabs.length, sumOk, bad: ot.filter(x => !x.ok).map(x => x.k), payTab, shipTab, erpTab, whTab });

    // CR4-FILTER — one bar on 7 pages · presets · chips · column sort · URL · bottom sheet on a phone · options only in scope
    await login('director'); const bars = [];
    for (const v of ['orders', 'customers', 'documents', 'workQueue', 'returns', 'reports', 'audit']) { if (v === 'workQueue') fuTab = 'queue'; global.navigate(v); await wait(120); bars.push(v + ':' + document.querySelectorAll('#page .ofb').length); }
    const ad = (d, k) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + k); return x.toISOString().slice(0, 10); }, me = ym => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0, 12)).toISOString().slice(0, 10);
    const ym = today.slice(0, 7), pm = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 2, 1, 12)).toISOString().slice(0, 7), pp = global.cr4PlanPeriod();
    const presetsOk = JSON.stringify(['today', '7d', '30d', 'month', 'lastMonth', 'plan'].map(global.cr4Preset)) === JSON.stringify([[today, today], [ad(today, -6), today], [ad(today, -29), today], [ym + '-01', me(ym)], [pm + '-01', me(pm)], [pp + '-01', me(pp)]]);
    global.navigate('orders'); await wait(100); const so = global.ofbState('orders'); so.d = 'plan'; so.type = 'MT'; so.q = 'OR'; global.ofbApply('orders'); await wait(100);
    const chips2 = document.querySelectorAll('.ofb-chip').length, urlOk = /type=MT/.test(location.hash) && /q=OR/.test(location.hash);
    document.querySelector('[data-ofb-chip="q"]')?.click(); await wait(100); const chips1 = document.querySelectorAll('.ofb-chip').length;
    document.querySelector('[data-ofb-clear]')?.click(); await wait(100); const chips0 = document.querySelectorAll('.ofb-chip').length;
    global.ofbState('orders').d = 'all'; global.ofbApply('orders'); await wait(80);
    document.querySelector('[data-ofb-sort="total"]')?.click(); await wait(80); const t1 = global.filteredDetailedOrders().map(o => orderSum(o)); const desc = t1.every((x, k) => k === 0 || t1[k - 1] >= x);
    document.querySelector('[data-ofb-sort="total"]')?.click(); await wait(80); const t2 = global.filteredDetailedOrders().map(o => orderSum(o)); const asc = t2.every((x, k) => k === 0 || t2[k - 1] <= x);
    let sheet = null; if (phone) { document.querySelector('[data-ofb-sheet="orders"]')?.click(); await wait(80); sheet = !!document.querySelector('#cr4Pop.sheet'); global.cr4PopClose(); }
    await login('salesAdmin', 'sa-mt'); global.navigate('orders'); await wait(100); const dl = [...document.querySelectorAll('#ofbPl-orders option')].map(o => o.value), mtNames = db.partners.filter(global.visiblePartner).map(p => p.name);
    const scopeOk = dl.every(x => mtNames.includes(x)) && !db.partners.filter(p => !global.visiblePartner(p)).some(p => dl.includes(p.name));
    step('CR4-FILTER', bars.every(x => x.endsWith(':1')) && presetsOk && chips2 === 2 && chips1 === 1 && chips0 === 0 && urlOk && desc && asc && (phone ? sheet : true) && scopeOk, { bars, presetsOk, chips: [chips2, chips1, chips0], urlOk, desc, asc, sheet, scopeOk });

    // CR4-CUSTOMER-CARDS — cards = a hand count of the orders in scope · spend = Σ the table column · the range changes them · a card filters · shared phone
    await login('director'); global.navigate('customers'); await wait(150);
    const cs = global.ofbState('customers'), [ca, cb] = global.cr4Range(cs), inR = o => { const d = dateKey(o.time); return (!ca || d >= ca) && (!cb || d <= cb); };
    const os = global.scopedOrders().filter(inR), cust = new Set(os.map(o => o.customer + '|' + o.phone)), live = os.filter(o => o.status !== 'cancelled');
    const spendHand = live.reduce((x, o) => x + global.orderTotals(o).total - (db.returns || []).filter(r => r.orderId === o.id && r.status === 'credited').reduce((s, r) => s + (r.creditAmount || 0), 0), 0);
    const card = k => num(document.querySelector(`[data-cu-card="${k}"] strong`)?.innerText), colSum = [...document.querySelectorAll('[data-cu-spend]')].reduce((x, td) => x + +td.dataset.cuSpend, 0);
    const c1 = { total: card('total'), spend: card('spend'), aov: card('aov') };
    const handOk = c1.total === cust.size && Math.abs(c1.spend - spendHand) < 0.02 && Math.abs(colSum - spendHand) < 0.02 && Math.abs(c1.aov - (live.length ? spendHand / live.length : 0)) < 0.02;
    cs.d = 'lastMonth'; global.ofbApply('customers'); await wait(100); const changed = card('total') !== c1.total || card('spend') !== c1.spend;
    global.ofbReset('customers'); global.ofbApply('customers'); await wait(80); document.querySelector('[data-cu-card="quiet"]')?.click(); await wait(100);
    const quietRows = document.querySelectorAll('.cu-table tbody tr').length, quietCard = card('quiet'); document.querySelector('[data-cu-card="quiet"]')?.click(); await wait(80);
    const dup = [...document.querySelectorAll('.cu-table tbody tr')].filter(tr => tr.querySelector('.cu-dup')).map(tr => tr.querySelector('b').innerText);
    step('CR4-CUSTOMER-CARDS', handOk && changed && quietRows === quietCard && dup.includes('Demo Beauty Co.') && dup.includes('Demo MT Quota Check'), { c1, spendHand: Math.round(spendHand * 100) / 100, colSum: Math.round(colSum * 100) / 100, customers: cust.size, changed, quietRows, quietCard, dup });

    // CR4-PLAN-PERIOD — the chip only where the plan period is used · another period = read-only · back · one shared value
    await login('director'); const chip = {};
    for (const v of ['overview', 'orders', 'allocation', 'reports', 'supQuota', 'supProposals', 'supSop', 'customers', 'audit', 'access']) { global.navigate(v); await wait(v.startsWith('sup') ? 900 : 120); chip[v] = !!document.querySelector('main .content > .banner .pp-chip'); }
    const chipOk = ['overview', 'orders', 'allocation', 'reports', 'supQuota', 'supProposals', 'supSop'].every(v => chip[v]) && ['customers', 'audit', 'access'].every(v => !chip[v]);
    global.navigate('allocation'); await wait(150); const pair = db.allocations.find(x => x.status === 'approved' && (!x.month || x.month === FEED_MONTH)), qNow = pair ? global.quotaFor(pair.partner, pair.sku) : 0;
    cr4ViewPeriod = global.cr4AddMonth(global.cr4PP(), -1); global.render(); await wait(150);
    const ro = { bar: !!document.querySelector('.pp-bar'), btns: [...document.querySelectorAll('#page button.primary')].every(b => b.disabled), refuse: global.opsCheck() === t('ppReadOnly'), quota: pair ? global.quotaFor(pair.partner, pair.sku) : 0, preset: global.cr4Preset('plan')[0].slice(0, 7) };
    document.querySelector('[data-pp-back]')?.click(); await wait(120);
    const back = { bar: !document.querySelector('.pp-bar'), check: global.opsCheck() == null, quota: pair ? global.quotaFor(pair.partner, pair.sku) : 0 };
    step('CR4-PLAN-PERIOD', chipOk && ro.bar && ro.btns && ro.refuse && ro.quota === 0 && ro.preset === global.cr4AddMonth(global.cr4PP(), -1) && back.bar && back.check && back.quota === qNow && FEED_MONTH === global.cr4PP(), { chip, ro, back, FEED_MONTH, pp: global.cr4PP() });

    // CR4-DATE-FORMAT — no Buddhist year and no mm/dd/yyyy on any Ops page of the 11 accounts
    const df = [], BE = /\d{1,2}[\/\s.][^\s\d]{0,6}[\/\s.]?25[6-7]\d\b|\b\d{1,2}\/\d{1,2}\/25[6-7]\d\b/, MDY = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/;
    for (const [r, u] of PROFILES) { await login(r, u); for (const v of OPS) { if (global.navigate(v) === false) continue; await wait(40); const p = document.querySelector('#page'), tx = p ? p.innerText : ''; const vis = p ? [...p.querySelectorAll('input[type="date"]')].length : 0; if (BE.test(tx) || MDY.test(tx) || vis) df.push((u || r) + ':' + v + (vis ? ' (date input)' : '') + ' ' + ((tx.match(BE) || tx.match(MDY) || [''])[0])); } }
    step('CR4-DATE-FORMAT', df.length === 0, { bad: df.slice(0, 12), helper: global.fmtDate('2026-11-25') + ' / ' + (lang === 'th' ? 'TH' : 'EN') });

    // CR4-SKU-SEARCH — old Ops code · barcode · partner code · name → the SKU · "เลือก 1 SKU" → SKU 360 (shareable) · same numbers as the drawer
    await login('planner'); await supReady('supOverview');
    global.inCfg('A01').map['UAT-PC-001'] = 'JB-FD-001'; const pmB = (db.productMaster || []).find(p => p.barcode && App.DB.skuIdx.has(p.sku));
    const sr = { alias: global.cr4SkuSearch('11021').includes('JB-FD-001'), partner: global.cr4SkuSearch('UAT-PC-001').includes('JB-FD-001'), barcode: pmB ? global.cr4SkuSearch(String(pmB.barcode)).includes(pmB.sku) : null, name: global.cr4SkuSearch(App.DB.skus[0].name.slice(0, 12)).includes(App.DB.skus[0].sku) };
    delete global.inCfg('A01').map['UAT-PC-001'];
    const fq = document.querySelector('#fQ'); fq.value = '11021'; fq.dispatchEvent(new Event('input')); await wait(80); document.querySelector('.ta-box [data-ta-one="JB-FD-001"]')?.click(); await wait(1200);
    const s360 = { h1: document.querySelector('#main .pagehead h1')?.innerText, hash: location.hash, inline: !!document.querySelector('#s360Body .dr-head') };
    const R = App.model().rows.find(r => r.sku === 'JB-FD-001'), kp = [...document.querySelectorAll('.s360-kpis .kpi .v')].map(x => x.innerText.trim());
    const sameNums = R && kp[0] === (R.stockoutDn == null ? '—' : global.U.date(R.stockoutDn)) && num(kp[2]) === Math.round(R.rop);
    App.setF({ q: '' }); await wait(600);
    step('CR4-SKU-SEARCH', sr.alias && sr.partner && sr.barcode !== false && sr.name && s360.h1 === St('s360') && /q=JB-FD-001/.test(s360.hash) && s360.inline && sameNums, { sr, s360, kp });

    // CR4-PORTFOLIO — several SKUs: ฿ only · SKUs expected out / below ROP per week = a hand count from each SKU's projection (3 weeks)
    await supReady('supOverview'); const MP = App.model(), qBtn = document.querySelector('[data-unit="projUnit"] [data-v="q"]');
    const hand = k => { let o = 0, l = 0; for (const r of MP.rows) { if (!r._p || !(r.rrTot > 0)) continue; const v = r._p.totA[Math.min(r._p.totA.length - 1, 7 * k - 1)]; if (v < 0.5) o++; else if (v < r.rop) l++; } return o + '/' + l; };
    const pfw = [1, 8, 20].map(k => { const b = document.querySelector(`[data-pf="${k}"]`); return { k, page: b ? b.dataset.pfOut + '/' + b.dataset.pfLow : '', hand: hand(k) }; });
    step('CR4-PORTFOLIO', App.ui.projUnit === 'v' && qBtn && qBtn.disabled && pfw.every(x => x.page === x.hand), { pfw, projUnit: App.ui.projUnit });

    // CR4-RR-UX — 6 methods + "skip out-of-stock" · the chip names the method · the popover example = runRate · old links (rr= · rm=)
    document.querySelector('.fc-chip')?.click(); await wait(100); const pop = document.querySelector('#cr4Pop');
    const radios = pop ? pop.querySelectorAll('input[name="fcM"]').length : 0, skip = !!(pop && pop.querySelector('#fcSkip')), chipTxt = document.querySelector('.fc-chip')?.innerText || '';
    const exName = (pop?.querySelector('.fc-ex .small')?.innerText || ''), exRows = [...(pop?.querySelectorAll('.fc-tbl tbody tr') || [])].map(tr => num(tr.children[1]?.innerText));
    const Mx = App.model(), xr = Mx.rows.slice().sort((p, q) => q.rrSel - p.rrSel)[0], u = (App.F.rm || App.S.rrMode) === 'unconstrained';
    const hand2 = Calc.RR_BASES.map(b => { let x = 0; for (let j = 0; j < App.DB.accounts.length; j++) if (Mx.mask[j]) x += u ? Calc.runRateU(App.DB, xr.i, j, Mx.asDn, b, Mx.S) : Calc.runRate(App.DB, xr.i, j, Mx.asDn, b); return Math.round(x * 7 * 10) / 10; });
    global.cr4PopClose();
    history.replaceState(null, '', location.pathname + '#/supply/stock?rr=L3M&rm=sellout'); global.navigate('supStock'); await wait(1200); const link = App.F.rr + '/' + App.F.rm;
    App.setF({ rr: App.S.rrBasis || 'L4W', rm: App.S.rrMode }); await wait(500);
    step('CR4-RR-UX', radios === 6 && skip && chipTxt.includes(St('fc_' + (App.S.rrBasis || 'L4W'))) && exName.includes(xr.sku) && exRows.every((v, k) => Math.abs(v - hand2[k]) <= 0.11) && link === 'L3M/sellout', { radios, skip, chipTxt, exRows, hand2, link });

    // CR4-TREND — synthetic series (−3 % / week · flat · steep fall · steep rise · 10 weeks) + the "declining" action, one per SKU
    const T = Calc.trendOf, dec = Array.from({ length: 26 }, (x, k) => 1000 * Math.pow(0.97, k)), avg = a => a.reduce((x, y) => x + y, 0) / a.length;
    const tDec = T(dec), tFlat = T(Array(26).fill(500)), tFall = T(Array.from({ length: 26 }, (x, k) => Math.max(0, 1000 - 60 * k))), tRise = T(Array.from({ length: 26 }, (x, k) => 100 + 100 * k)), tShort = T(Array(10).fill(50));
    const trOk = { dec: avg(Array.from(tDec.f).slice(0, 13)) < avg(dec.slice(13)), flat: Math.abs(avg(Array.from(tFlat.f).slice(0, 13)) - 500) < 5, neg: Array.from(tFall.f).every(x => x >= 0), cap: Array.from(tRise.f).every(x => x <= tRise.level * 1.5 + 1e-6 && x >= tRise.level * 0.5 - 1e-6), short: tShort.ok === false, down: tDec.down === true };
    let fb = null; { const D = App.DB, as = App.model().asDn, wE = D.wk(as); outer: for (let i = 0; i < D.skus.length; i++) for (let j = 0; j < D.accounts.length; j++) { const f = D.firstSale[i][j]; if (f >= 0 && wE - f >= 1 && wE - f < 12) { const r = Calc.trendRate(D, i, j, as, null, false); fb = { sku: D.skus[i].sku, short: r.short, same: Math.abs(r.rate - Calc.runRate(D, i, j, as, 'L3M')) < 1e-9 }; break outer; } } }
    global.sopSync(true); const trActs = global.sopActs().filter(a => a.type === 'trend' && (a.status === 'open' || a.status === 'ack')), trSkus = App.DB.skus.filter((s, i) => { const x = Calc.skuTrend(App.DB, i, global.Supply.defaultAsOf(), null); return x.ok && x.down && x.level > 0; }).map(s => s.sku);
    const oneEach = new Set(trActs.map(a => a.sku)).size === trActs.length && trSkus.every(s => trActs.some(a => a.sku === s));
    step('CR4-TREND', Object.values(trOk).every(Boolean) && (!fb || (fb.short && fb.same)) && oneEach, { trOk, fallback: fb, actions: trActs.length, declining: trSkus.length });

    // CR4-AUTO — the back-test by hand for 2 SKUs = autoPick · the method kept = the lowest WAPE · share of each method (README)
    const D2 = App.DB, as2 = App.model().asDn, wE2 = D2.wk(as2), au = [];
    for (const i of D2.skus.map((s, i) => i).filter(i => D2.accounts.some((a, j) => D2.firstSale[i][j] >= 0 && D2.firstSale[i][j] < wE2 - 30)).slice(0, 2)) {
      const hw = {}; for (const mth of Calc.AUTO_SET) { let err = 0, actl = 0; for (let k = 0; k < 8; k++) { const o = wE2 - 4 - k; if (o < 13) continue; let F = 0, A = 0; for (let j = 0; j < D2.accounts.length; j++) { F += Calc.runRate(D2, i, j, D2.startDn + 7 * o, mth) * 28; for (let w = o; w < o + 4; w++) A += D2.so[i][j][w]; } err += Math.abs(F - A); actl += A; } hw[mth] = actl > 0 ? err / actl * 100 : null; }
      const ap = Calc.autoPick(D2, i, as2, null, false), best = Calc.AUTO_SET.filter(x => hw[x] != null).sort((p, q) => hw[p] - hw[q])[0];
      au.push({ sku: D2.skus[i].sku, ok: Calc.AUTO_SET.every(x => (hw[x] == null && ap.wape[x] == null) || Math.abs(hw[x] - ap.wape[x]) < 1e-6) && ap.pick === best, pick: ap.pick, wape: hw });
    }
    const share = {}; D2.skus.forEach((s, i) => { const p = Calc.autoPick(D2, i, as2, null, false).pick; share[p] = (share[p] || 0) + 1; });
    step('CR4-AUTO', au.length === 2 && au.every(x => x.ok), { au, share });

    // CR4-LOST-LABEL — TH: no "Lost sales" left on the pages · the two parts add up to the old total
    const keepLang = lang; global.setLang('th'); await supReady('supOverview'); const ovTxt = document.querySelector('#main').innerText;
    const parts = [...document.querySelectorAll('[data-lost-part] b')].map(b => num(b.innerText)), tot = num(document.querySelector('#card-lost .lost-head b')?.innerText);
    await supReady('supStock'); const stTxt = document.querySelector('#main').innerText; await supReady('supReview'); const rvTxt = document.querySelector('#main').innerText;
    if (keepLang !== 'th') global.setLang(keepLang);
    step('CR4-LOST-LABEL', !/Lost sales/i.test(ovTxt + stTxt + rvTxt) && parts.length === 2 && Math.abs(parts[0] + parts[1] - tot) <= 1, { parts, tot });

    // CR4-CONTROLS — VIEW BY / Horizon only where they act · none on Stock & Projection · values stay · (i) lists what changes
    const vis = sel => { const f = document.querySelector(sel)?.closest('.fld'); return !!f && getComputedStyle(f).display !== 'none'; }, ctl = {};
    await supReady('supOverview'); App.setF({ view: 'M', h: 6 }); await wait(300);
    for (const v of ['supOverview', 'supStock', 'supExpiry', 'supConsign', 'supCalendar', 'supReplen', 'supQuota', 'supReview']) { await supReady(v); ctl[v] = (vis('#fView') ? 'V' : '') + (vis('#fH') ? 'H' : ''); }
    await supReady('supOverview'); const kept = App.F.view === 'M' && App.F.h === 6, info = !!document.querySelector('#fbar #fView')?.closest('.fld')?.querySelector('.info') && !!document.querySelector('#fbar #fH')?.closest('.fld')?.querySelector('.info');
    App.setF({ view: 'W', h: 3 }); await wait(300);
    const ctlOk = ctl.supOverview === 'VH' && ctl.supStock === '' && ctl.supExpiry === 'H' && ctl.supConsign === 'V' && ctl.supCalendar === 'H' && ctl.supReplen === '' && ctl.supQuota === 'VH' && ctl.supReview === 'V';
    step('CR4-CONTROLS', ctlOk && kept && info, { ctl, kept, info });

    // CR4-ABC-LABEL — words in every table (short on a phone) · Σ matrix = the A–C SKUs · a cell filters
    await supReady('supStock'); const badge = document.querySelector('#main .grp-w'), shown = badge ? (phone ? badge.querySelector('.gs') : badge.querySelector('.gl')).innerText : '';
    await supReady('supReplen'); await wait(300); const MR = App.model(), mxSum = [...document.querySelectorAll('#card-abcmx [data-mx]')].reduce((x, b) => x + +b.dataset.mxN, 0), ac = MR.rows.filter(r => r.cls && r.cls.group && r.cls.group.length === 2).length;
    const cellB = document.querySelector('#card-abcmx [data-mx="AX"]'); cellB?.click(); await wait(400); const filt = App.ui.rpGrp === 'AX' && Calc.replenList(App.model(), App.ui.rpMode).filter(r => global.Pages.grpMatch(r, 'AX')).every(r => r.cls.group === 'AX');
    App.ui.rpGrp = ''; App.rerender(); await wait(200);
    step('CR4-ABC-LABEL', /ขาย|Top|Mid|Low|สินค้าใหม่|New|เลิกขาย|Clearance|หลัก|รอง|น้อย/.test(shown) && !/^[ABC][XYZ]$/.test(shown.trim()) && mxSum === ac && filt, { shown, mxSum, ac, filt });

    // CR4-ANCHOR-STAY · CR4-FILE-PROTOCOL · console
    const a1 = await anchors(), a2 = await anchors('new');
    step('CR4-ANCHOR-STAY', a1.pass && a2.pass, { old: a1.diff, new: a2.diff });
    const keepP = global.SupUAT._proto; global.SupUAT._proto = () => 'file:'; const fp = await phase3A(); global.SupUAT._proto = keepP;
    step('CR4-FILE-PROTOCOL', fp.length === 1 && fp[0].pass === false && /http server/.test(fp[0].info || ''), { got: fp[0] });
    step('CR4-CONSOLE', errors.length === before, { errors: errors.slice(before) });
    await login('director');
    return res;
  }

  /* CR4-COUNT-ADJ · CR4-ROLLOVER — they change the data (run last; start a fresh Integrated demo afterwards) */
  async function cr04data() {
    const res = [], App = global.App, Calc = global.Calc, step = (id, pass, info) => res.push(Object.assign({ id, pass: !!pass }, info || {}));
    if (global.supDataset() !== 'integrated' || !db.feedBase) return [{ id: 'CR4-DATA', pass: false, info: 'needs a fresh Integrated demo' }];
    const before = errors.length;
    // I8-c — request (reason required) → approve (Director / Manager MT, never the requester) → only that pair's remaining moves · WMS / quota untouched · switch off → CR-01 anchors
    await login('planner'); if (App.S.countAdjustOn === false) App.saveSettings(Object.assign({}, App.S, { countAdjustOn: true }));   // the default (an earlier "use old methods" test may have saved it off)
    await supReady('supConsign'); for (let k = 0; k < 50 && !document.querySelector('#cntHost [data-ca-req]'); k++) await wait(200);
    const reqs = [...document.querySelectorAll('#cntHost [data-ca-req]')].map(b => JSON.parse(b.dataset.caReq));
    if (reqs.length < 2) step('CR4-COUNT-ADJ', false, { info: 'needs two count pairs above 5 %', n: reqs.length });
    else {
      const v = reqs[0], o = reqs[1], DB = App.DB, i = DB.skuIdx.get(v.sku), j = DB.accIdx.get(v.account), d = Calc.dn(v.date), i2 = DB.skuIdx.get(o.sku), j2 = DB.accIdx.get(o.account), d2 = Calc.dn(o.date);
      const rem0 = Calc.stockAt(DB, i, d + 1).cons[j], other0 = Calc.stockAt(DB, i2, d2 + 1).cons[j2], wms0 = JSON.stringify(db.wmsSnapshot.rows), q0 = global.quotaFor(v.account, v.sku);
      const noReason = global.caRequest(Object.assign({}, v, { reason: '' })), r1 = global.caRequest(Object.assign({}, v, { reason: 'UAT shelf count' }));
      const plannerApprove = global.caDecide(r1.x.id, true);
      await login('director'); const r2 = global.caRequest(Object.assign({}, o, { reason: 'UAT own' })), own = global.caDecide(r2.x.id, true);
      await login('manager', 'mgr-mt'); const ok = global.caDecide(r1.x.id, true), rej = global.caDecide(r2.x.id, false, 'UAT keep');
      await global.Supply.ensureData(); await supReady('supOverview'); const DB2 = App.DB;
      const rem1 = Calc.stockAt(DB2, i, d + 1).cons[j], other1 = Calc.stockAt(DB2, i2, d2 + 1).cons[j2], wms1 = JSON.stringify(db.wmsSnapshot.rows), q1 = global.quotaFor(v.account, v.sku);
      const audit = db.logs.some(l => l.event === 'caEventOk' && l.ref.startsWith(r1.x.id)), sc3 = (App.sc.checks.find(c => c.id === 'reconcile') || {}).ok;
      App.saveSettings(Object.assign({}, App.S, { countAdjustOn: false })); App.model(); const remOff = Calc.stockAt(App.DB, i, d + 1).cons[j];
      const an = await anchors(); App.saveSettings(Object.assign({}, App.S, { countAdjustOn: true })); App.model();
      step('CR4-COUNT-ADJ', noReason.ok === false && r1.ok && plannerApprove.ok === false && own.error === 'caOwn' && ok.ok && rej.ok && Math.abs(rem1 - v.counted) < 0.5 && Math.abs(other1 - other0) < 0.5 && wms1 === wms0 && q1 === q0 && audit && sc3 && Math.abs(remOff - rem0) < 0.5 && an.pass,
        { pair: v.account + '·' + v.sku, rem0: Math.round(rem0), rem1: Math.round(rem1), counted: v.counted, other: [Math.round(other0), Math.round(other1)], plannerApprove: plannerApprove.error, own: own.error, audit, sc3, remOff: Math.round(remOff), anchors: an.pass });
    }
    // I8-b — roll the plan period: next month's quota is current · used starts at 0 · feed / Supply on the new month · selfCheck · AS OF 23 Nov keeps the anchors
    await login('director'); await global.Supply.ensureData(); const old = global.cr4PP(), plan = global.ppRollPlan(), r = await global.ppRoll();
    const row = plan.plan[0], qNew = row ? global.quotaFor(row.account_id, row.sku) : null, used = row ? global.consumedFor(row.account_id, row.sku) : null;
    await global.Supply.ensureData(); await supReady('supOverview'); const DB3 = App.DB, i3 = row ? DB3.skuIdx.get(row.sku) : null, j3 = row ? DB3.accIdx.get(row.account_id) : null, sq = row && DB3.quota[i3].get(plan.next) ? DB3.quota[i3].get(plan.next)[j3] : null;
    global.navigate('orders'); await wait(150); const chipTxt = document.querySelector('.pp-chip')?.innerText || '', planPreset = global.cr4Preset('plan')[0].slice(0, 7);
    const scOk = App.sc.ok, an2 = await anchors(), denied = (await login('manager', 'mgr-mt'), await global.ppRoll());
    step('CR4-ROLLOVER', r.ok && db.planPeriod === plan.next && FEED_MONTH === plan.next && db.feedBase.month === plan.next && row && qNew === Math.round(+row.quota_qty) && used === 0 && Math.abs(sq - qNew) < 0.5 && chipTxt.includes(fmtMonth(plan.next)) && planPreset === plan.next && scOk && an2.pass && denied.ok === false && db.logs.some(l => l.event === 'ppRollEvent'),
      { old, next: plan.next, seeded: plan.plan.length, approved: plan.appr.length, qNew, used, supplyQuota: sq, chipTxt, scOk, sc: App.sc.checks.filter(c => !c.ok).map(c => c.id), anchors: an2.pass, denied: denied.error });
    step('CR4-DATA-CONSOLE', errors.length === before, { errors: errors.slice(before) });
    return res;
  }

  global.SupUAT = {
    keep, menu, noleak, anchors, theme, errors,
    opsGate, mobile, flow, phaseC, phaseD, phase3A, phase3B, phase3C, phase3D, cr04, cr04data, login,   // CR-04
    _proto: () => location.protocol,   // CR-04 I9: the page protocol (a test can pretend file://)
    async all() {
      const out = [].concat(await anchors(), await menu(), await noleak('mgr-mt'), await noleak('mgr-tt'), await noleak('mgr-ecom'), await theme(), await opsGate(), await cr04());   // CR-04: + cr04()
      return { pass: out.filter(r => r.pass).length, of: out.length, failed: out.filter(r => !r.pass), consoleErrors: errors.slice(), results: out };   // CR-03: + every result (UAT report)
    }
  };
})(window);
