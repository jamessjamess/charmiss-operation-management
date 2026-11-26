/* calc.js — every number on every page comes from here.
   Pure functions only: no DOM, no globals except the `Calc` namespace it exports. Same inputs → same outputs.

   Stock model (ตรงกับ tools/generate_mock.py)
     WH (คลังเรา)            : + PO received + CN Good (จากทุกคู่ค้า) − Sales In (ทุกคู่ค้า)
     Consignment (ฝากขาย)     : + Sales In − Sales Out − CN (Good และ Bad)      — คู่ค้าที่ is_consignment = Y
     Outright (TT / ECOM)    : Sales In = Sales Out (ขายขาด กรรมสิทธิ์โอนตอนส่ง) จึงไม่มีของค้างที่คู่ค้า
     Total Stock            = WH + Σ Consignment   (ของฝากขายยังเป็น Stock ของเรา)
     ⇒ ΔTotal = PO received + CN Good จากคู่ค้าขายขาด − Sales Out (ทุกคู่ค้า) − CN Bad จากคู่ค้าฝากขาย (Write-off)
   CR-01 (6.2 / F5) In-transit (ระหว่างขนส่ง): IV ออก + WMS ตัดของออกแล้ว แต่ยังไม่ Delivered — ยังเป็นของเรา
     Total = WH + In-transit + Σ Consignment · WH ลดตอนของออกจากคลัง (goods issue) · Sales In ลงวันที่ Delivered

   Dates are "day numbers" (integer days since 1970-01-01, UTC) so the maths has no time-zone drift.
   Weekly sales rows are dated by the Monday that starts the week. AS OF is a Monday; stock "at AS OF" = start of that day. */
(function (global) {
  'use strict';
  const t = global.St;   // CR-01: Supply translator (the global `t` belongs to the Ops shell)

  const DAY = 86400000;
  const DEFAULT_SETTINGS = {
    fitHigh: 120,          // Quota Fit > 120 % → ตั้งสูงเกิน
    fitLow: 80,            // Quota Fit < 80 %  → ตั้งต่ำเกิน
    coverDays: 90,         // Suggested Order Qty covers Lead Time + 90 days
    overstockDoc: 180,     // DOC > 180 days → Overstock
    reorderWindow: 30,     // Order-by Date within 30 days → Reorder Now
    expiryWindow: 180,     // Expiry Risk badge looks 180 days ahead
    projectionDays: 365,
    trendPhi: 0.95, trendCap: 50, trendMinW: 12,
    countAdjustOn: true,   // CR-04 I8-c: approved consignment count adjustments (consign_adjust) move the account's remaining from the day after the count   // CR-04 R9: damped trend φ per week · max change ±% within 26 weeks · weeks of data needed   // daily projection length (stockout dates beyond it are extrapolated)
    useQuotaForSalesIn: true, // WH → consignment plan = Quota of the month (else Sell-out Run Rate)
    rrBasis: 'L4W',
    // Phase 2 — consignment & inbound
    consignDocHigh: 120,   // DOC at an account > 120 days → stock sits there (recall candidate)
    consignDocLow: 14,     // DOC at an account < 14 days → about to run out there
    stLowW: 5,             // Sell-through below 5 % in a week …
    stLowM: 20,            // … or below 20 % in a month → slow at that account
    cnKeepDays: 45,        // a recall leaves 45 days of the account's run rate on its shelf
    onTimeDays: 90,        // PO On-time % looks at POs received in the last 90 days
    // CR-03 (3A) — a method switch keeps the CR-01 behaviour selectable ('history'); thresholds editable on the settings page
    rrEndMode: 'account',  // CR-03 R1: run rate ends at each account's latest data week · 'history' = one end for all (CR-01)
    staleW: 2,             // CR-03 R1: an account whose Sales Out ends more than 2 weeks before AS OF is flagged "stale"
    soCompleteW: 8,        // CR-03 R1: weeks in the Sales Out completeness table
    soLateDay: 3,          // CR-03 R1: a weekly report is late when received after day 3 (Wednesday) of the following week
    prPlanOn: false,       // CR-03 R2: take a monthly PR / KOL issue plan per SKU off WH in the projection
    prPlan: {},            // CR-03 R2: { sku: units per month }
    // CR-03 (3B)
    rrMode: 'unconstrained',   // CR-03 R3: run rate skips out-of-stock weeks · 'sellout' = every week counts (CR-01)
    oosUnits: 0,               // CR-03 R3: a consignment week is out of stock when Remaining at the week start ≤ this (or < 1 day of sales)
    oosEnd: true,              // CR-03 R3: … and also when it ran out by the end of the week (stock at the next week start ≤ the same line)
    safetyMode: 'statistical', // CR-03 R4: SS = Z × √(LT × σd² + d² × σLT²) · 'days' = Run Rate × safety_days (CR-01)
    abcA: 80, abcB: 95,        // CR-03 R4: cumulative % of 52-week Sales Out value (cost) → A / B / C
    xyzX: 0.5, xyzY: 1.0,      // CR-03 R4: CV of weekly demand (26 weeks) → X / Y / Z
    npdW: 8,                   // CR-03 R4: fewer weeks since the first sale → group N
    ltMinN: 3,                 // CR-03 R4: receipts needed for an actual lead time (SKU, else supplier, else lead_time_days)
    sl_AX: 98, sl_AY: 97, sl_AZ: 95, sl_BX: 97, sl_BY: 95, sl_BZ: 92, sl_CX: 95, sl_CY: 92, sl_CZ: 90, sl_N: 95, sl_E: 0,   // CR-03 R4: service level %
    // CR-03 (3C)
    replenCycleW: 2,           // CR-03 R5: weeks between deliveries to a consignment account (A4) — replenCycle: { account_id: weeks } overrides
    replenCycle: {},
    wosYellowX: 4, wosRedX: 5, // CR-03 R5: WOS at the account ≥ cycle × 4 → yellow · ≥ cycle × 5 → red
    reorderGapX: 2,            // CR-03 R5: no Sales In for more than cycle × 2 weeks (pair with a run rate)
    inStockMin: 90,            // CR-03 R5: in-stock rate below 90 % (13 weeks)
    swingW: 3,                 // CR-03 R5: WOS moved more than 3 weeks in a week
    sisoGapW: 4,               // CR-03 R5: Sales In − Sales Out of 13 weeks above 4 weeks of Sales Out → piling up
    tsLimit: 4,                // CR-03 R6: |tracking signal| above 4 → quota set high / low every month
    fvaNegM: 3,                // CR-03 R6: FVA negative this many months in a row → a quota proposal starts from Naive
    fvaProposal: true,         // CR-03 R6: switch — 'false' = the CR-01 proposal (run rate × days) for every pair
    // CR-03 (3D)
    planLockDay: 20,           // CR-03 R7: after this day of the month a change to next month's quota gets a warning (A6)
    sopMoveDays: 14            // CR-03 R7: plan comparison — Stockout Date moved more than 14 days
  };
  const CR3_GROUPS = ['AX', 'AY', 'AZ', 'BX', 'BY', 'BZ', 'CX', 'CY', 'CZ', 'N', 'E'];   // CR-03 R4
  /** CR-03: every method switch set to its CR-01 behaviour ("ใช้วิธีเดิมทั้งหมด") — the CR-01 anchors come back exactly. */
  const LEGACY_METHODS = { rrEndMode: 'history', prPlanOn: false, rrMode: 'sellout', safetyMode: 'days', fvaProposal: false, countAdjustOn: false };   // CR-04: + countAdjustOn
  const STATUS_ORDER = ['stockout', 'reorder', 'overstock', 'healthy', 'npd', 'inactive'];
  const RR_WEIGHTS = { L4W: [[4, 1]], L3M: [[13, 1]], L6M: [[26, 1]], W: [[4, 0.5], [13, 0.3], [26, 0.2]] };
  const RR_BASES = ['L4W', 'L3M', 'L6M', 'W', 'TR', 'AUTO'];   // CR-04 R8 / R9: + Trend · Auto
  // ------------------------------------------------------------------ CR-04 R9: trend (damped OLS) + automatic method per SKU
  const TREND = { phi: 0.95, cap: 50, minW: 12, n: 26, ahead: 13, H: 53 };
  const AUTO_SET = ['L4W', 'L3M', 'W', 'TR'];
  /** CR-04 R9: damped linear trend of a weekly series (null = a week left out: out of stock / promotion).
      OLS of the usable weeks against time → level at the last week · forecast h weeks ahead = level + slope × Σ φ^k (k = 1..h),
      never below 0, kept within ± cap % of the level · fewer than minW usable weeks → not ok (the caller falls back to 3 months).
      pctM = slope × 4.345 ÷ mean (per month) · down = "ขาลงต่อเนื่อง" (≤ −5 % per month and R² ≥ 0.3). */
  function trendOf(ys, opt) {
    const o = Object.assign({}, TREND, opt || {}), pts = [];
    ys.forEach((y, k) => { if (y != null && isFinite(y)) pts.push([k, +y]); });
    if (pts.length < o.minW) return { ok: false, n: pts.length };
    const N = pts.length; let mx = 0, my = 0; for (const [x, y] of pts) { mx += x; my += y; } mx /= N; my /= N;
    let sxy = 0, sxx = 0, syy = 0; for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) * (x - mx); syy += (y - my) * (y - my); }
    const b = sxx > 0 ? sxy / sxx : 0, a = my - b * mx, level = Math.max(0, a + b * (ys.length - 1)), r2 = sxx > 0 && syy > 0 ? sxy * sxy / (sxx * syy) : 0;
    const lo = level * (1 - o.cap / 100), hi = level * (1 + o.cap / 100), f = new Float64Array(o.H);
    let cum = 0, d = 1;
    for (let h = 0; h < o.H; h++) { d *= o.phi; cum += d; f[h] = Math.max(0, Math.min(hi, Math.max(lo, level + b * cum))); }
    const pctM = my > 0 ? b * 4.345 / my * 100 : 0;
    return { ok: true, n: N, a, b, level, r2, pctM, f, down: pctM <= -5 && r2 >= 0.3 };
  }
  function trendOpt(DB) { const S = DB._trS || DEFAULT_SETTINGS; return { phi: +S.trendPhi || TREND.phi, cap: S.trendCap == null ? TREND.cap : +S.trendCap, minW: +S.trendMinW || TREND.minW }; }
  /** the weekly Sales Out of one SKU × account that the trend reads: up to 26 weeks before the run-rate end, out-of-stock weeks left out (rrMode unconstrained) */
  function trendSeries(DB, i, j, asDn, S, u) {
    const cap = u ? rrCap(DB, j) : (DB.rrEndMode === 'account' && DB.rrEndA ? DB.rrEndA[j] : DB.rrEndW);
    const wEnd = clamp(Math.min(DB.wk(asDn), cap ?? Infinity), 0, DB.nWeeks), f = DB.firstSale[i][j];
    if (f < 0 || f >= wEnd) return null;
    const so = DB.so[i][j], fl = u ? oosOf(DB, i, S).flags[j] : null, promo = DB.promo && DB.promo[i] && DB.promo[i][j], ys = [];   // promo: field reserved (no data yet)
    for (let w = Math.max(f, wEnd - TREND.n); w < wEnd; w++) ys.push((fl && fl[w]) || (promo && promo[w]) ? null : so[w]);
    return ys;
  }
  /** CR-04 R9: Trend run rate per day = the mean of the next 13 weeks of the damped forecast ÷ 7 (too little data → 3-month average + flag). */
  function trendRate(DB, i, j, asDn, S, u) {
    const C = DB._tr || (DB._tr = new Map()), key = i + '|' + j + '|' + asDn + '|' + (u ? 'u' + ((S && S.oosUnits) || 0) + (S && S.oosEnd === false ? '' : 'e') : '');
    let r = C.get(key); if (r) return r;
    const ys = trendSeries(DB, i, j, asDn, S, u), T = ys ? trendOf(ys, trendOpt(DB)) : { ok: false, n: 0 };
    if (!T.ok) r = { rate: u ? runRateU(DB, i, j, asDn, 'L3M', S) : runRate(DB, i, j, asDn, 'L3M'), short: true, T };
    else { let x = 0; for (let k = 0; k < TREND.ahead; k++) x += T.f[k]; r = { rate: x / TREND.ahead / 7, short: false, T }; }
    C.set(key, r); return r;
  }
  /** CR-04 R9: "อัตโนมัติ" — back-test 8 points (each forecasting the next 4 weeks of the SKU, every account) and keep the method with the lowest WAPE. */
  function autoPick(DB, i, asDn, S, u) {
    const C = DB._auto || (DB._auto = new Map()), key = i + '|' + asDn + '|' + (u ? 'u' : '');
    let r = C.get(key); if (r) return r;
    const nA = DB.accounts.length, wE = clamp(DB.wk(asDn), 0, DB.nWeeks), wape = {}, pts = [];
    for (let k = 0; k < 8; k++) { const o = wE - 4 - k; if (o >= 13) pts.push(o); }
    for (const m of AUTO_SET) {
      let err = 0, act = 0;
      for (const o of pts) {
        const oDn = DB.startDn + 7 * o; let F = 0, A = 0;
        for (let j = 0; j < nA; j++) { F += (u ? runRateU(DB, i, j, oDn, m, S) : runRate(DB, i, j, oDn, m)) * 28; for (let w = o; w < o + 4; w++) A += DB.so[i][j][w]; }
        err += Math.abs(F - A); act += A;
      }
      wape[m] = act > 0 ? err / act * 100 : null;
    }
    let pick = 'L3M', best = Infinity;
    for (const m of AUTO_SET) if (wape[m] != null && wape[m] < best - 1e-9) { best = wape[m]; pick = m; }
    r = { pick, wape, points: pts.length }; C.set(key, r); return r;
  }
  /** CR-04 R9: the trend of one SKU (selected accounts, weekly Sales Out) for the ▲ / ▼ % per month indicator and the "ขาลงต่อเนื่อง" badge */
  function skuTrend(DB, i, asDn, mask) {
    const C = DB._skuTr || (DB._skuTr = new Map()), key = i + '|' + asDn + '|' + (mask ? Array.from(mask, x => x ? 1 : 0).join('') : '*');
    let r = C.get(key); if (r) return r;
    const wEnd = clamp(Math.min(DB.wk(asDn), DB.rrEndW ?? Infinity), 0, DB.nWeeks), ys = [];
    let f = Infinity; for (let j = 0; j < DB.accounts.length; j++) if ((!mask || mask[j]) && DB.firstSale[i][j] >= 0) f = Math.min(f, DB.firstSale[i][j]);
    if (isFinite(f)) for (let w = Math.max(f, wEnd - TREND.n); w < wEnd; w++) { let x = 0; for (let j = 0; j < DB.accounts.length; j++) if (!mask || mask[j]) x += DB.so[i][j][w]; ys.push(x); }
    r = trendOf(ys, trendOpt(DB)); C.set(key, r); return r;
  }

  // ------------------------------------------------------------------ date helpers
  function dn(iso) {                       // 'YYYY-MM-DD' → day number (null when blank / invalid)
    if (!iso) return null;
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(iso).trim());
    if (!m) return null;
    return Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY;
  }
  function iso(d) { return new Date(d * DAY).toISOString().slice(0, 10); }
  function ymd(d) { const x = new Date(d * DAY); return [x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()]; }
  function monday(d) { return d - (((d + 3) % 7) + 7) % 7; }                     // Monday on or before d
  function firstMondayOnOrAfter(d) { const m = monday(d); return m === d ? d : m + 7; }
  function addMonths(d, n) {                // same day-of-month n months later (clamped to month end)
    const [y, m, dd] = ymd(d);
    const last = new Date(Date.UTC(y, m + n + 1, 0)).getUTCDate();
    return Date.UTC(y, m + n, Math.min(dd, last)) / DAY;
  }
  function monthKey(d) { const [y, m] = ymd(d); return y + '-' + String(m + 1).padStart(2, '0'); }
  function monthStart(d) { const [y, m] = ymd(d); return Date.UTC(y, m, 1) / DAY; }
  function daysInMonth(d) { const [y, m] = ymd(d); return new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); }

  const num = v => (v === '' || v == null || isNaN(+v)) ? 0 : +v;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // ------------------------------------------------------------------ prepare: CSV rows → indexed DB
  /** raw = { sku_master:[{…}], account_master, stock_lot, sales_in, sales_out, cn, po_inbound, quota } (strings from CSV) */
  function prepare(raw) {
    const issues = [];
    const skus = (raw.sku_master || []).filter(r => r.sku).map((r, i) => ({
      i, sku: String(r.sku).trim(), name: r.name || r.sku, brand: r.brand || '-', category: r.category || '-', uom: r.uom || 'pcs',
      unit_cost: num(r.unit_cost), std_price: num(r.std_price), shelf_life_months: num(r.shelf_life_months) || 24,
      moq: Math.max(1, num(r.moq)), lead_time_days: num(r.lead_time_days), safety_days: num(r.safety_days),
      status: (r.status || 'Active').trim(), safety_units: num(r.safety_units)   // CR-03 R3: WH units kept back (Ops safety) — outright OOS test
    }));
    const accounts = (raw.account_master || []).filter(r => r.account_id).map((r, j) => {
      let p = num(r.min_shelf_life_pct); if (p > 1) p /= 100;
      return { j, account_id: String(r.account_id).trim(), name: r.name || r.account_id, channel: (r.channel || '').trim().toUpperCase(),
        sub_channel: r.sub_channel || '', is_consignment: /^y/i.test(String(r.is_consignment || '')), min_shelf_life_pct: p,
        delivery_lead_days: num(r.delivery_lead_days), sales: String(r.sales || '').trim() };   // CR-03 R6: + Sales owner (from the Ops partner master)
    });
    const skuIdx = new Map(skus.map(s => [s.sku, s.i]));
    const accIdx = new Map(accounts.map(a => [a.account_id, a.j]));
    const nS = skus.length, nA = accounts.length;

    // date range of the weekly data
    let minD = Infinity, maxD = -Infinity;
    for (const t of ['sales_in', 'sales_out']) for (const r of raw[t] || []) { const d = dn(r.date); if (d != null) { if (d < minD) minD = d; if (d > maxD) maxD = d; } }
    let snapDn = null;
    for (const r of raw.stock_lot || []) { const d = dn(r.snapshot_date); if (d != null) { snapDn = d; break; } }
    if (!isFinite(minD)) { minD = monday(snapDn || dn(new Date().toISOString())) - 7 * 52; maxD = minD; }
    const startDn = monday(minD);
    if (snapDn == null) snapDn = monday(maxD) + 7;           // no snapshot_date column → the Monday after the last week
    const nWeeks = Math.max(1, Math.round((snapDn - startDn) / 7));
    const wk = d => Math.floor((d - startDn) / 7);
    // CR-01 (6.1): weeks the Ops feed appends after the Integrated-demo history carry only the demo transactions, so the
    // sell-out run rate stops at the end of that history (raw._history_end, set by the feed; absent → every week counts)
    const hEnd = dn(raw._history_end), rrEndW = hEnd == null ? nWeeks : Math.max(1, Math.min(nWeeks, Math.round((hEnd - startDn) / 7)));
    // CR-03 R1: the end of each account's own sell-out data — consignment: the last week that has a Sales Out report;
    // outright: the last full week before the WMS read (raw._wms_cut, set by the feed; without it the last week with sales out).
    const lastSOW = new Int32Array(nA).fill(-1);
    for (const r of raw.sales_out || []) {
      const j = accIdx.get(String(r.account_id || '').trim()), d = dn(r.date); if (j == null || d == null) continue;
      const w = wk(d); if (w >= 0 && w < nWeeks && w > lastSOW[j]) lastSOW[j] = w;
    }
    const cutD = dn(raw._wms_cut);
    const rrEndA = Int32Array.from(accounts, a => (!a.is_consignment && cutD != null) ? clamp(wk(monday(cutD)), 0, nWeeks) : (lastSOW[a.j] >= 0 ? lastSOW[a.j] + 1 : rrEndW));

    const mk = () => Array.from({ length: nS }, () => Array.from({ length: nA }, () => new Float64Array(nWeeks)));
    const so = mk(), soV = mk(), si = mk(), siV = mk();
    const refErr = (t, r) => { if (issues.length < 400) issues.push({ table: t, row: r }); };
    function addWeekly(t, A, V) {
      (raw[t] || []).forEach((r, k) => {
        const i = skuIdx.get(String(r.sku || '').trim()), j = accIdx.get(String(r.account_id || '').trim()), d = dn(r.date);
        if (i == null || j == null || d == null) { refErr(t, k + 2); return; }
        const w = wk(d); if (w < 0 || w >= nWeeks) return;          // after the snapshot → ignored
        A[i][j][w] += num(r.qty); V[i][j][w] += num(r.value);
      });
    }
    addWeekly('sales_out', so, soV); addWeekly('sales_in', si, siV);

    // prefix sums (cum[w] = Σ weeks < w) and the first week with sell-out per SKU × account
    const cumSO = so.map(a => a.map(cum)), cumSI = si.map(a => a.map(cum));
    function cum(arr) { const c = new Float64Array(arr.length + 1); for (let w = 0; w < arr.length; w++) c[w + 1] = c[w] + arr[w]; return c; }
    const firstSale = so.map(a => a.map(arr => { for (let w = 0; w < arr.length; w++) if (arr[w] > 0) return w; return -1; }));
    // average net price per unit (for lost-sales value); fallback 65 % of std price
    const price = skus.map(s => accounts.map(a => {
      const q = cumSO[s.i][a.j][nWeeks], v = soV[s.i][a.j].reduce((x, y) => x + y, 0);
      return q > 0 ? v / q : s.std_price * 0.65;
    }));

    const lots = skus.map(() => []), po = skus.map(() => []), cn = skus.map(() => []), quota = skus.map(() => new Map());
    const quotaRes = skus.map(() => new Map()), quotaCom = skus.map(() => new Map()), it = skus.map(() => []);   // CR-01 (6.2): quota จอง / หักจริง · in-transit
    (raw.stock_lot || []).forEach((r, k) => {
      const i = skuIdx.get(String(r.sku || '').trim()); const loc = String(r.location || '').trim();
      const j = loc === 'WH' ? -1 : accIdx.get(loc);
      if (i == null || j == null) { refErr('stock_lot', k + 2); return; }
      const q = num(r.qty); if (q <= 0) return;
      lots[i].push({ lot_no: r.lot_no || '-', j, qty: q, mfg: dn(r.mfg_date), exp: dn(r.exp_date) });
    });
    (raw.po_inbound || []).forEach((r, k) => {
      const i = skuIdx.get(String(r.sku || '').trim());
      if (i == null) { refErr('po_inbound', k + 2); return; }
      const status = (r.status || 'Planned').trim();
      po[i].push({ po_no: r.po_no, qty: num(r.qty), order: dn(r.order_date), eta: dn(r.eta_date),
        rec: status === 'Received' ? (dn(r.received_date) ?? dn(r.eta_date)) : null, status, supplier: r.supplier || '' });
    });
    (raw.cn || []).forEach((r, k) => {
      const i = skuIdx.get(String(r.sku || '').trim()), j = accIdx.get(String(r.account_id || '').trim());
      if (i == null || j == null) { refErr('cn', k + 2); return; }
      cn[i].push({ cn_no: r.cn_no, dn: dn(r.date), j, qty: num(r.qty), reason: r.reason || '', good: /^good/i.test(r.condition || ''), status: (r.status || 'Planned').trim() });
    });
    (raw.quota || []).forEach((r, k) => {
      const i = skuIdx.get(String(r.sku || '').trim()), j = accIdx.get(String(r.account_id || '').trim());
      const m = String(r.month || '').slice(0, 7);
      if (i == null || j == null || !/^\d{4}-\d{2}$/.test(m)) { refErr('quota', k + 2); return; }
      if (!quota[i].has(m)) quota[i].set(m, new Float64Array(nA));
      quota[i].get(m)[j] += num(r.quota_qty);
      // CR-01 (6.2): reserved_qty (จอง) / committed_qty (หักจริง) come from Ops for the months Ops owns; absent → not tracked
      if (r.reserved_qty != null && r.reserved_qty !== '') { if (!quotaRes[i].has(m)) quotaRes[i].set(m, new Float64Array(nA)); quotaRes[i].get(m)[j] += num(r.reserved_qty); }
      if (r.committed_qty != null && r.committed_qty !== '') { if (!quotaCom[i].has(m)) quotaCom[i].set(m, new Float64Array(nA)); quotaCom[i].get(m)[j] += num(r.committed_qty); }
    });
    // CR-01 (6.2 / F5): in_transit = goods issued (left the WMS) on ship_date, not delivered yet; delivered_date is set once it arrived
    (raw.in_transit || []).forEach((r, k) => {
      const i = skuIdx.get(String(r.sku || '').trim()), j = accIdx.get(String(r.account_id || '').trim()), ship = dn(r.ship_date);
      if (i == null || j == null || ship == null) { refErr('in_transit', k + 2); return; }
      const q = num(r.qty); if (q <= 0) return;
      it[i].push({ ref: r.iv_no || r.order_id || '', order: r.order_id || '', j, qty: q, ship, del: dn(r.delivered_date) });
    });
    // CR-03 R2: stock that left for something other than a sale (PR / KOL, sample, internal use, write-off) — never Sales Out
    const oo = skus.map(() => []);
    (raw.other_out || []).forEach((r, k) => {
      const i = skuIdx.get(String(r.sku || '').trim()), loc = String(r.location || 'WH').trim(), j = loc === 'WH' ? -1 : accIdx.get(loc), d = dn(r.date);
      if (i == null || j == null || d == null) { refErr('other_out', k + 2); return; }
      const q = num(r.qty); if (q <= 0) return;
      oo[i].push({ dn: d, j, qty: q, type: String(r.type || 'other').trim(), ref: r.ref || '', lot: r.lot || '' });
    });
    // CR-04 I8-c: approved shelf-count adjustments of a consignment account (± units, effective the day after the count)
    const adj = skus.map(() => []);
    (raw.consign_adjust || []).forEach((r, k) => {
      const i = skuIdx.get(String(r.sku || '').trim()), j = accIdx.get(String(r.account_id || '').trim()), d = dn(r.date), q = Number(r.qty);
      if (i == null || j == null || d == null || !isFinite(q)) { refErr('consign_adjust', k + 2); return; }
      if (q) adj[i].push({ dn: d + 1, j, qty: q, ref: r.ref || '' });
    });
    po.forEach(l => l.sort((a, b) => (a.eta ?? 0) - (b.eta ?? 0)));
    cn.forEach(l => l.sort((a, b) => a.dn - b.dn));

    return { skus, accounts, skuIdx, accIdx, startDn, snapDn, nWeeks, wk, so, soV, si, siV, cumSO, cumSI, firstSale, price, lots, po, cn, quota, issues,
      quotaRes, quotaCom, it, hasIT: it.some(l => l.length > 0), rrEndW, historyEndDn: hEnd,   // CR-01
      oo, hasOO: oo.some(l => l.length > 0), adj, hasAdj: adj.some(l => l.length > 0), adjOn: true, rrEndA, lastSOW, rrEndMode: 'history',   // CR-04 I8-c: + adj   // CR-03: other_out · per-account run-rate end (mode set by computeModel)
      minAsOf: startDn + 28, maxAsOf: snapDn };
  }

  // ------------------------------------------------------------------ stock at a date (rollback from the snapshot)
  /** WH and consignment per account at the START of day asDn.
      Snapshot − every movement in [asDn, snapshot)  — so stock at any past Monday reconciles with the flows by construction. */
  /** CR-01 (F5): in-transit per account at the START of day d (issued before d, not delivered before d) — null when the SKU has none. */
  function itAt(DB, i, d) {
    const L = DB.it && DB.it[i]; if (!L || !L.length) return null;
    const a = new Float64Array(DB.accounts.length);
    for (const x of L) if (x.ship < d && (x.del == null || x.del >= d)) a[x.j] += x.qty;
    return a;
  }
  const sumArr = a => { let x = 0; if (a) for (let k = 0; k < a.length; k++) x += a[k]; return x; };   // CR-01
  function stockAt(DB, i, asDn) {
    const nA = DB.accounts.length, cons = new Float64Array(nA);
    let wh = 0;
    for (const L of DB.lots[i]) { if (L.j < 0) wh += L.qty; else cons[L.j] += L.qty; }
    const adj = DB.adjOn !== false && DB.adj && DB.adj[i] && DB.adj[i].length ? DB.adj[i] : null;   // CR-04 I8-c
    if (adj) for (const x of adj) if (x.dn <= DB.snapDn) cons[x.j] += x.qty;
    asDn = Math.min(asDn, DB.snapDn);
    if (asDn === DB.snapDn) return { wh, cons, it: itAt(DB, i, asDn) };   // CR-01: + it
    const wa = Math.max(0, DB.wk(asDn)), wb = DB.nWeeks;
    for (let j = 0; j < nA; j++) {
      const siQ = DB.cumSI[i][j][wb] - DB.cumSI[i][j][wa], soQ = DB.cumSO[i][j][wb] - DB.cumSO[i][j][wa];
      wh += siQ;                                           // undo: WH shipped it out
      if (DB.accounts[j].is_consignment) cons[j] -= siQ - soQ;
    }
    for (const p of DB.po[i]) if (p.rec != null && p.rec >= asDn && p.rec < DB.snapDn) wh -= p.qty;
    for (const c of DB.cn[i]) {
      if (c.status !== 'Received' || c.dn < asDn || c.dn >= DB.snapDn) continue;
      if (DB.accounts[c.j].is_consignment) cons[c.j] += c.qty;
      if (c.good) wh -= c.qty;
    }
    for (const x of (DB.oo && DB.oo[i]) || []) {                         // CR-03 R2: put back what was issued (not sold) after AS OF
      if (x.dn < asDn || x.dn >= DB.snapDn) continue;
      if (x.j < 0) wh += x.qty; else cons[x.j] += x.qty;
    }
    if (adj) for (const x of adj) if (x.dn > asDn && x.dn <= DB.snapDn) cons[x.j] -= x.qty;   // CR-04 I8-c: an adjustment after AS OF is not there yet
    // CR-01 (F5): the rollback above books a shipment out of WH on its Sales In (delivery) date, so it gives WH + In-transit.
    // WH really dropped at goods issue: put the snapshot's in-transit back and take the in-transit at AS OF out.
    const itA = itAt(DB, i, asDn);
    if (DB.it && DB.it[i] && DB.it[i].length) wh += sumArr(itAt(DB, i, DB.snapDn)) - sumArr(itA);
    return { wh, cons, it: itA };
  }

  // ------------------------------------------------------------------ run rate (sell-out per day)
  /** Run Rate = average Sales Out per day over the basis window before AS OF.
      L4W = 4 weeks · L3M = 13 weeks · L6M = 26 weeks · W (Weighted) = 50 % L4W + 30 % L3M + 20 % L6M.
      A SKU × account that started selling inside the window is averaged over the weeks since its first sale (NPD). */
  function runRate(DB, i, j, asDn, basis) {
    if (basis === 'TR') return trendRate(DB, i, j, asDn, null, false).rate;                  // CR-04 R9
    if (basis === 'AUTO') return runRate(DB, i, j, asDn, autoPick(DB, i, asDn, null, false).pick);   // CR-04 R9
    const cap = DB.rrEndMode === 'account' && DB.rrEndA ? DB.rrEndA[j] : DB.rrEndW;   // CR-03 R1: per-account end (switch rrEndMode)
    const wEnd = clamp(Math.min(DB.wk(asDn), cap ?? Infinity), 0, DB.nWeeks), f = DB.firstSale[i][j];   // CR-01: ≤ end of history
    if (f < 0 || f >= wEnd) return 0;
    const c = DB.cumSO[i][j];
    let out = 0;
    for (const [n, wgt] of (RR_WEIGHTS[basis] || RR_WEIGHTS.L4W)) {
      const w0 = Math.max(wEnd - n, f), weeks = wEnd - w0;
      out += wgt * (weeks > 0 ? (c[wEnd] - c[w0]) / (weeks * 7) : 0);
    }
    return out;
  }

  // ------------------------------------------------------------------ CR-03 R3: out-of-stock weeks + unconstrained run rate
  /** CR-03: the week the account's run rate stops at (rrEndMode 'account' → that account's data end, else the end of history). */
  function rrCap(DB, j) { return DB.rrEndMode === 'account' && DB.rrEndA ? DB.rrEndA[j] : DB.rrEndW; }
  /** CR-03: stock at the start of every week of the data (cached on the DB — the DB is rebuilt whenever the data changes). */
  function weekStock(DB, i) {
    const C = DB._wkSt || (DB._wkSt = []);
    if (!C[i]) { const a = []; for (let w = 0; w < DB.nWeeks; w++) a.push(stockAt(DB, i, DB.startDn + 7 * w)); C[i] = a; }
    return C[i];
  }
  /** CR-03 R3: out-of-stock flags per account × week of one SKU, plus prefix counts / sums of the in-stock weeks.
        consignment       : Remaining at the week start ≤ oosUnits, or below one day of the account's sales (26-week average before the week)
        outright / ECOM   : WH available (WH − safety units of the Ops product master) at the week start ≤ 0
        oosEnd (setting)  : also a week that ran out before it ended — Remaining / WH available at the next week start ≤ the same line
      A week counts only when the account sold the SKU in the 26 weeks before it (a product not on sale yet is not out of stock). */
  function oosOf(DB, i, S) {
    const u = +(S && S.oosUnits) || 0, endOn = !S || S.oosEnd !== false, key = 'u' + u + (endOn ? 'e' : '');
    if (!DB._oos || DB._oos.key !== key) DB._oos = { key, f: [] };
    if (DB._oos.f[i]) return DB._oos.f[i];
    const nA = DB.accounts.length, nW = DB.nWeeks, st = weekStock(DB, i), su = DB.skus[i].safety_units || 0;
    const stEnd = w => w + 1 < nW ? st[w + 1] : (DB._wkEnd || (DB._wkEnd = []))[i] || (DB._wkEnd[i] = stockAt(DB, i, DB.startDn + 7 * nW));
    const flags = [], cntN = [], sumN = [];
    for (let j = 0; j < nA; j++) {
      const c = DB.cumSO[i][j], so = DB.so[i][j], cons = DB.accounts[j].is_consignment, fs = DB.firstSale[i][j];
      const f = new Uint8Array(nW), cn = new Int32Array(nW + 1), sn = new Float64Array(nW + 1);
      for (let w = 0; w < nW; w++) {
        const w0 = Math.max(0, w - 26), prior = c[w] - c[w0];
        let o = 0;
        if (prior > 0) {
          if (cons) { const rem = st[w].cons[j], d1 = prior / ((w - Math.max(w0, fs)) * 7); o = (rem <= u + 1e-9 || rem < d1 || (endOn && stEnd(w).cons[j] <= u + 1e-9)) ? 1 : 0; }
          else o = (st[w].wh - su <= 1e-9 || (endOn && stEnd(w).wh - su <= 1e-9)) ? 1 : 0;
        }
        f[w] = o; cn[w + 1] = cn[w] + (o ? 0 : 1); sn[w + 1] = sn[w] + (o ? 0 : so[w]);
      }
      flags.push(f); cntN.push(cn); sumN.push(sn);
    }
    return (DB._oos.f[i] = { flags, cntN, sumN });
  }
  /** CR-03 R3: Run Rate (unconstrained) = Σ Sales Out of the in-stock weeks in the window ÷ the number of in-stock weeks (per day).
      Fewer than 2 in-stock weeks → the window grows back 4 weeks at a time (at most 26 weeks); still fewer → the sell-out Run Rate.
      Never below the sell-out Run Rate — demand is at least what was sold (an out-of-stock week can still sell before / after the gap).
      A window with no out-of-stock week gives exactly the sell-out Run Rate. Same bases (L4W / L3M / L6M / Weighted) and end week as runRate. */
  function runRateU(DB, i, j, asDn, basis, S) {
    if (basis === 'TR') return trendRate(DB, i, j, asDn, S, true).rate;                       // CR-04 R9
    if (basis === 'AUTO') return runRateU(DB, i, j, asDn, autoPick(DB, i, asDn, S, true).pick, S);   // CR-04 R9
    const wEnd = clamp(Math.min(DB.wk(asDn), rrCap(DB, j) ?? Infinity), 0, DB.nWeeks), f = DB.firstSale[i][j];
    if (f < 0 || f >= wEnd) return 0;
    const c = DB.cumSO[i][j], O = oosOf(DB, i, S), cn = O.cntN[j], sn = O.sumN[j], lo = Math.max(f, wEnd - 26);
    let out = 0;
    for (const [n, wgt] of (RR_WEIGHTS[basis] || RR_WEIGHTS.L4W)) {
      const w0 = Math.max(wEnd - n, f), weeks = wEnd - w0;
      const old = weeks > 0 ? (c[wEnd] - c[w0]) / (weeks * 7) : 0;
      if (cn[wEnd] - cn[w0] === weeks) { out += wgt * old; continue; }        // no out-of-stock week → the sell-out rate
      let a = w0;
      while (cn[wEnd] - cn[a] < 2 && a > lo) a = Math.max(lo, a - 4);
      const k = cn[wEnd] - cn[a];
      out += wgt * (k >= 2 ? Math.max(old, (sn[wEnd] - sn[a]) / (k * 7)) : old);
    }
    return out;
  }
  const popcount = x => { let n = 0; while (x) { x &= x - 1; n++; } return n; };
  /** CR-03 R3: out-of-stock weeks and lost sales of one SKU row — the 13 weeks before AS OF (the last 4 for the Overview card),
      each account up to its run-rate end. oosBits[j] bit k = week (AS OF − 13 + k) out of stock · oosW13 = weeks with any selected account out.
      Lost sales per SKU × account = max(0, unconstrained Run Rate × out-of-stock days − Sales Out of those weeks), valued at the account's net price
      (per pair over the window, so a strong week after a delivery offsets a weak one). */
  function cr3Oos(DB, i, ctx, out, rr) {
    const nA = DB.accounts.length, S = ctx.S, mask = ctx.mask, O = oosOf(DB, i, S), wE = clamp(DB.wk(ctx.asDn), 0, DB.nWeeks), w13 = wE - 13;
    const bits = new Int32Array(nA), ru = new Float64Array(nA), plain = !ctx.rrMult || ctx.rrMult === 1;
    let any = 0, q13 = 0, v13 = 0, q4 = 0, v4 = 0, q4c = 0, v4c = 0, q4w = 0, v4w = 0;   // CR-04 R10: + at the account (consignment) / at our warehouse (outright)
    for (let j = 0; j < nA; j++) {
      ru[j] = ctx.rrU && plain ? rr[j] : runRateU(DB, i, j, ctx.asDn, ctx.basis, S);
      const end = Math.min(wE, rrCap(DB, j) ?? wE), fl = O.flags[j], so = DB.so[i][j], p = DB.price[i][j];
      let n13 = 0, s13 = 0, n4 = 0, s4 = 0;
      for (let w = Math.max(0, w13); w < end; w++) if (fl[w]) {
        bits[j] |= 1 << (w - w13); n13++; s13 += so[w];
        if (w >= wE - 4) { n4++; s4 += so[w]; }
      }
      if (mask[j]) {
        const l13 = Math.max(0, ru[j] * 7 * n13 - s13), l4 = Math.max(0, ru[j] * 7 * n4 - s4);
        q13 += l13; v13 += l13 * p; q4 += l4; v4 += l4 * p;
        if (DB.accounts[j].is_consignment) { q4c += l4; v4c += l4 * p; } else { q4w += l4; v4w += l4 * p; }   // CR-04 R10
      }
      if (mask[j]) any |= bits[j];
    }
    out.oosBits = bits; out.oosW13 = popcount(any); out.rrU = ru;
    out.lost13Q = q13; out.lost13V = v13; out.lost4Q = q4; out.lost4V = v4;
    out.lost4C = [q4c, v4c]; out.lost4W = [q4w, v4w];   // CR-04 R10
  }
  /** CR-03 R3: weekly Sales Out of the selected accounts for the 26 weeks before AS OF, out-of-stock weeks marked (the SKU drawer chart). */
  function soWeeksOf(DB, M, row) {
    const wE = clamp(DB.wk(M.asDn), 0, DB.nWeeks), O = oosOf(DB, row.i, M.S), nA = DB.accounts.length, out = [];
    let ruW = 0; for (let j = 0; j < nA; j++) if (M.mask[j]) ruW += (row.rrU ? row.rrU[j] : 0) * 7;
    for (let w = Math.max(0, wE - 26); w < wE; w++) {
      let so = 0, oos = 0;
      for (let j = 0; j < nA; j++) if (M.mask[j]) { so += DB.so[row.i][j][w]; if (w < Math.min(wE, rrCap(DB, j) ?? wE) && O.flags[j][w]) oos++; }
      out.push({ dn: DB.startDn + 7 * w, so, oos, rrU: ruW });
    }
    return out;
  }

  // ------------------------------------------------------------------ CR-03 R4: ABC-XYZ, actual lead time, statistical safety stock
  /** CR-03 R4: ABC-XYZ of every SKU at AS OF (cached for the last few AS OF × switch × threshold sets).
        ABC — Sales Out value at cost over the 52 weeks before AS OF (all accounts), largest first: the SKU whose running share
              before it is < abcA % → A, < abcB % → B, else C · N and E SKUs are not ranked, so A + B + C = 100 %
        XYZ — CV (sample SD ÷ mean) of the weekly demand of all accounts over the 26 weeks before AS OF (from the first sale when later).
              An account's week after its data end, and — with rrMode 'unconstrained' — its out-of-stock week, count as the average
              of its in-stock weeks in the window · CV ≤ xyzX → X, ≤ xyzY → Y, else (or no demand) Z
        N   — fewer than npdW weeks since the first sale (any account) · E — Clearance / Discontinue (E wins) */
  function abcxyzOf(DB, asDn, S) {
    S = Object.assign({}, DEFAULT_SETTINGS, S || {});
    const key = [asDn, S.rrMode, DB.rrEndMode, S.abcA, S.abcB, S.xyzX, S.xyzY, S.npdW, S.oosUnits, S.oosEnd].join('|');
    const cache = DB._abc || (DB._abc = new Map());
    if (cache.has(key)) return cache.get(key);
    const nA = DB.accounts.length, wE = clamp(DB.wk(asDn), 0, DB.nWeeks), fill = S.rrMode === 'unconstrained';
    const rows = DB.skus.map(s => {
      const i = s.i;
      let first = Infinity; for (let j = 0; j < nA; j++) { const f = DB.firstSale[i][j]; if (f >= 0 && f < first) first = f; }
      const hist = first < wE ? wE - first : 0;
      let value = 0; for (let j = 0; j < nA; j++) value += (DB.cumSO[i][j][wE] - DB.cumSO[i][j][Math.max(0, wE - 52)]) * s.unit_cost;
      // weekly demand over the XYZ window
      const w0 = Math.max(wE - 26, first === Infinity ? wE : first), n = wE - w0, d = new Float64Array(Math.max(0, n));
      if (n > 0) {
        const O = fill ? oosOf(DB, i, S) : null;
        for (let j = 0; j < nA; j++) {
          const so = DB.so[i][j], end = Math.min(wE, Math.max(w0, rrCap(DB, j) ?? wE));
          let k = 0, sum = 0, all = 0; for (let w = w0; w < end; w++) { all += so[w]; if (!(O && O.flags[j][w])) { k++; sum += so[w]; } }
          const avg = k ? sum / k : (end > w0 ? all / (end - w0) : 0), useFill = !!O && k > 0;   // every week out of stock → keep the actual weeks
          for (let w = w0; w < wE; w++) d[w - w0] += (w >= end || (useFill && O.flags[j][w])) ? avg : so[w];
        }
      }
      let mean = 0; for (const x of d) mean += x; mean = n ? mean / n : 0;
      let v = 0; for (const x of d) v += (x - mean) * (x - mean);
      const sdW = n >= 2 ? Math.sqrt(v / (n - 1)) : mean;              // under 2 weeks: assume CV 1 (only N SKUs have so little history)
      const cv = mean > 0 ? sdW / mean : null;
      const E = s.status === 'Clearance' || s.status === 'Discontinue', N = !E && hist < S.npdW;
      return { i, sku: s.sku, value, hist, weeks: n, mean, sdW, cv, sdAssumed: n < 2,
        xyz: cv == null ? 'Z' : cv <= S.xyzX ? 'X' : cv <= S.xyzY ? 'Y' : 'Z', abc: null, share: 0, cumBefore: 0, group: E ? 'E' : N ? 'N' : null };
    });
    const ranked = rows.filter(r => !r.group).sort((a, b) => b.value - a.value || a.i - b.i);
    const total = ranked.reduce((x, r) => x + r.value, 0);
    let cum = 0;
    for (const r of ranked) {
      r.share = total > 0 ? r.value / total * 100 : 0; r.cumBefore = cum;
      r.abc = total > 0 && cum < S.abcA ? 'A' : total > 0 && cum < S.abcB ? 'B' : 'C';
      r.group = r.abc + r.xyz; cum += r.share;
    }
    const tot = { value: total };
    for (const g of ['A', 'B', 'C']) { const l = ranked.filter(r => r.abc === g); tot[g] = { n: l.length, value: l.reduce((x, r) => x + r.value, 0), share: l.reduce((x, r) => x + r.share, 0) }; }
    for (const g of ['N', 'E']) tot[g] = { n: rows.filter(r => r.group === g).length };
    const res = { rows, tot, asDn };
    cache.set(key, res); if (cache.size > 6) cache.delete(cache.keys().next().value);
    return res;
  }
  /** CR-03 R4: lead time from the received POs before AS OF (order_date → received_date): the SKU's own when it has ≥ ltMinN receipts,
      else its supplier's (every SKU of the supplier), else lead_time_days with σLT = 0 (src 'est' → label "LT estimated"). */
  function leadTimeOf(DB, i, asDn, S) {
    const minN = Math.max(2, +(S && S.ltMinN) || DEFAULT_SETTINGS.ltMinN), key = asDn + '|' + minN;
    if (!DB._lt || DB._lt.key !== key) {
      const ok = p => p.rec != null && p.order != null && p.rec < asDn && p.status !== 'Cancelled';
      const bySup = new Map();
      DB.po.forEach(l => l.forEach(p => { if (ok(p) && p.supplier) { if (!bySup.has(p.supplier)) bySup.set(p.supplier, []); bySup.get(p.supplier).push(p.rec - p.order); } }));
      DB._lt = { key, ok, bySup, res: [] };
    }
    const C = DB._lt;
    if (C.res[i]) return C.res[i];
    const stat = l => { const n = l.length, m = l.reduce((x, y) => x + y, 0) / n; return { lt: m, sd: n > 1 ? Math.sqrt(l.reduce((x, y) => x + (y - m) * (y - m), 0) / (n - 1)) : 0, n }; };
    const own = DB.po[i].filter(C.ok).map(p => p.rec - p.order);
    const cnt = new Map(); DB.po[i].forEach(p => { if (p.supplier) cnt.set(p.supplier, (cnt.get(p.supplier) || 0) + 1); });
    const sup = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0];
    let r;
    if (own.length >= minN) r = Object.assign(stat(own), { src: 'sku' });
    else if (sup && (C.bySup.get(sup[0]) || []).length >= minN) r = Object.assign(stat(C.bySup.get(sup[0])), { src: 'supplier', supplier: sup[0], own: own.length });
    else r = { lt: DB.skus[i].lead_time_days, sd: 0, n: own.length, src: 'est' };
    return (C.res[i] = r);
  }
  /** CR-03 R4: inverse of the standard normal CDF (Acklam) — service level 0.95 → Z 1.645. */
  function zOf(p) {
    if (!(p > 0)) return 0; if (p >= 1) return 3.719;
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239],
      b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572],
      c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
      d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416], pl = 0.02425;
    let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  /** CR-03 R4: statistical safety stock of one SKU.  SS = Z × √(LT × σd² + d² × σLT²)  (units; SS days = SS ÷ d)
        d = Run Rate per day (every account, the run-rate method in use) · σd = SD of weekly demand ÷ √7 (abcxyzOf) · LT, σLT = leadTimeOf
        Z from the group's service level (+ What-if pp) · group E → 0 % → SS 0 · no run rate → SS 0 */
  function safetyStatOf(cls, LT, d, S, ctx) {
    ctx = ctx || {};
    const g = cls ? cls.group : 'N', base = +S['sl_' + g];
    const sl = base > 0 ? clamp(base + (ctx.slAdd || 0), 0, 99.9) : 0;
    const z = sl > 0 ? Math.max(0, zOf(sl / 100)) : 0;
    const sdD = (cls ? cls.sdW : 0) / Math.sqrt(7) * (ctx.rrMult || 1);
    const lt = Math.max(0, LT.lt * (ctx.ltMult || 1) + (ctx.ltAdd || 0));
    const ss = d > 0 ? z * Math.sqrt(lt * sdD * sdD + d * d * LT.sd * LT.sd) : 0;
    return { group: g, sl, z, d, sdD, lt, ltBase: LT.lt, sdLT: LT.sd, ltN: LT.n, ltSrc: LT.src, supplier: LT.supplier || '', sdAssumed: !!(cls && cls.sdAssumed), ss, ssDays: d > 0 ? ss / d : 0 };
  }

  // ------------------------------------------------------------------ lots at a date
  /** Lots on hand at AS OF. At the snapshot date they are the stock_lot rows.
      For an earlier AS OF the lot split is ESTIMATED (flag est): per location the quantity is the rolled-back stock;
      lots made after AS OF are dropped, the extra goes to the earliest-expiring lot (FEFO in reverse), a shortfall comes off the latest lots. */
  function lotsAt(DB, i, asDn, st) {
    const snap = DB.lots[i];
    if (asDn >= DB.snapDn) return snap.map(L => Object.assign({}, L));
    const s = DB.skus[i], slDays = s.shelf_life_months * 30.4375, out = [];
    const locs = new Set([-1]);
    snap.forEach(L => locs.add(L.j)); st.cons.forEach((q, j) => { if (q > 0.5) locs.add(j); });
    const earliestExp = snap.length ? Math.min(...snap.map(L => L.exp)) : asDn + slDays * 0.5;
    for (const j of locs) {
      const target = Math.max(0, j < 0 ? st.wh : st.cons[j]);
      const ls = snap.filter(L => L.j === j && L.mfg != null && L.mfg < asDn).map(L => Object.assign({}, L, { est: true })).sort((a, b) => a.exp - b.exp);
      let sum = ls.reduce((x, L) => x + L.qty, 0);
      if (target > sum + 0.5) {
        if (ls.length) ls[0].qty += target - sum;
        else ls.push({ lot_no: '(est.)', j, qty: target - sum, mfg: Math.round(earliestExp - slDays), exp: Math.round(earliestExp), est: true });
      } else if (target < sum - 0.5) {
        let cut = sum - target;
        for (let k = ls.length - 1; k >= 0 && cut > 0; k--) { const d = Math.min(cut, ls[k].qty); ls[k].qty -= d; cut -= d; }
      }
      ls.forEach(L => { if (L.qty > 0.5) out.push(L); });
    }
    return out;
  }

  // ------------------------------------------------------------------ expiry risk (FEFO)
  /** Sellable Deadline
        lot already at the account → exp_date
        lot still in WH (must still be shipped to an account) → exp_date − shelf_life × min_shelf_life_pct
          (min_shelf_life_pct = the run-rate-weighted % of the accounts that sell the SKU, e.g. 7-Eleven 67 %:
           a lot must have ≥ 67 % of its life left when it arrives — so the last day it can go is exp − 67 % × shelf life)
      FEFO per location: the location's run rate is taken from the lot that expires first; what is still unsold at its deadline is At-risk.
      At-risk Value = At-risk Qty × unit_cost. Each lot gets: deadline, sellOutDn (expected sold-out date, null = not before deadline), atRisk. */
  function expiryRisk(DB, i, lots, rr, asDn) {
    const s = DB.skus[i], slDays = s.shelf_life_months * 30.4375;
    let wsum = 0, psum = 0;
    rr.forEach((r, j) => { wsum += r; psum += r * DB.accounts[j].min_shelf_life_pct; });
    const pWH = wsum > 0 ? psum / wsum : DB.accounts.length ? DB.accounts.reduce((x, a) => x + a.min_shelf_life_pct, 0) / DB.accounts.length : 0.5;
    const rrTot = wsum;
    const byLoc = new Map();
    for (const L of lots) { if (!byLoc.has(L.j)) byLoc.set(L.j, []); byLoc.get(L.j).push(L); }
    const out = [];
    for (const [j, ls] of byLoc) {
      const rate = j < 0 ? rrTot : rr[j];
      ls.sort((a, b) => a.exp - b.exp);
      let cursor = 0;                                   // days after AS OF when the location starts selling this lot
      for (const L of ls) {
        const deadline = j < 0 ? Math.floor(L.exp - slDays * pWH) : L.exp;
        const window = Math.max(0, deadline - asDn - cursor);
        const sold = rate > 0 ? Math.min(L.qty, rate * window) : 0;
        if (rate > 0) cursor += sold / rate;
        const atRisk = Math.max(0, L.qty - sold);
        out.push(Object.assign({}, L, { deadline, atRisk, atRiskValue: atRisk * s.unit_cost,
          sellOutDn: atRisk < 0.5 && rate > 0 ? Math.round(asDn + cursor) : null }));
      }
    }
    return out;
  }

  // ------------------------------------------------------------------ projection (daily, then read at month ends / weeks)
  /** Daily projection from AS OF, one SKU, every account.
        WH(t)  = WH(t−1) + PO (ETA) + CN Good − Sales In Plan        Sales In Plan = Quota of the month ÷ days (consignment, if set) else Run Rate
        Rem(t) = Rem(t−1) + Sales In Plan − Sell-out Run Rate − CN    (per consignment account)
        Total  = WH + Σ Rem  ⇒ Total(t) = Total(t−1) + PO − Run Rate − CN Bad   (same as the monthly formula, worked day by day)
      Nothing goes below 0: a short WH ships pro-rata, a short account sells what it has — the rest is Lost Sales (kept apart).
      opts: { asDn, H, wh0, cons0, rr, mask (Uint8Array), useQuota, qMult (What-if: scales the quota plan like the run rate), ltShift (What-if: days added to Planned POs) } */
  function projectSku(DB, i, o) {
    const nA = DB.accounts.length, H = o.H, as = o.asDn, A = DB.accounts;
    const rr = Float64Array.from(o.rr);
    const po = new Float64Array(H), poSel = new Float64Array(H);
    for (const p of DB.po[i]) {
      if (p.status === 'Cancelled') continue;
      if (p.rec != null && p.rec < as) continue;                      // already in stock at AS OF
      const t = Math.max(p.eta ?? as, as) - as + (o.ltShift || 0) * (p.status === 'Planned' ? 1 : 0);
      if (t >= 0 && t < H) po[t] += p.qty;
    }
    const cnEv = [];
    for (const c of DB.cn[i]) {
      if (/cancel|reject/i.test(c.status) || (c.status === 'Received' && c.dn < as)) continue;
      const t = Math.max(c.dn, as) - as;
      if (t < H) cnEv.push({ t, j: c.j, qty: c.qty, good: c.good });
    }
    // quota per day for each month touched by the horizon
    const months = [];
    for (let m = monthStart(as); m < as + H; m = addMonths(m, 1)) {
      const q = DB.quota[i].get(monthKey(m)), days = daysInMonth(m);
      months.push({ t0: Math.max(0, m - as), t1: Math.min(H, addMonths(m, 1) - as), perDay: q ? Float64Array.from(q, x => x / days) : null });
    }
    const isC = A.map(a => a.is_consignment);
    // CR-01 (F5): units in transit at AS OF arrive at the account after its delivery lead days (at least the next day)
    const itEv = []; let itRem = 0, itSelRem = 0;
    for (const x of (DB.it && DB.it[i]) || []) {
      if (!(x.ship < as && (x.del == null || x.del >= as))) continue;
      const t = Math.max(0, (x.del != null ? x.del : x.ship + (A[x.j].delivery_lead_days || 1)) - as);
      itEv.push({ t, j: x.j, qty: x.qty }); itRem += x.qty; if (o.mask[x.j]) itSelRem += x.qty;
    }
    itEv.sort((a, b) => a.t - b.t);
    const itSelA = new Float64Array(H); let ki = 0;
    let wh = o.wh0;
    const cons = Float64Array.from(o.cons0, x => Math.max(0, x));
    wh = Math.max(0, wh);
    const whA = new Float64Array(H), consSelA = new Float64Array(H), totA = new Float64Array(H);
    const lostSel = new Float64Array(H);                                 // cumulative lost sales (selected accounts)
    let lostAll = 0, lostSelCum = 0, writeOff = 0, unfilledIn = 0, stockoutT = -1, k = 0;
    const plan = new Float64Array(nA);
    const rrTot = rr.reduce((x, y) => x + y, 0);
    const rrW = o.rrW, rrT = rrW ? new Float64Array(nA) : rr;            // CR-04 R9: a week-by-week forecast (Trend) — absent = the constant run rate
    let mi = 0;
    for (let t = 0; t < H; t++) {
      if (rrW) { const wk = Math.floor(t / 7); for (let j = 0; j < nA; j++) { const a = rrW[j]; rrT[j] = a ? a[Math.min(a.length - 1, wk)] : rr[j]; } }
      while (mi < months.length - 1 && t >= months[mi].t1) mi++;
      const perDay = months[mi] && months[mi].perDay;
      wh += po[t];
      if (o.prDaily) wh -= Math.min(Math.max(wh, 0), o.prDaily);          // CR-03 R2: planned PR / KOL issues (switch prPlanOn)
      while (k < cnEv.length && cnEv[k].t === t) {
        const c = cnEv[k++];
        if (isC[c.j]) { const q = Math.min(c.qty, cons[c.j]); cons[c.j] -= q; if (c.good) wh += q; else writeOff += q; }
        else if (c.good) wh += c.qty;                                    // outright goods coming back → our stock again
      }
      while (ki < itEv.length && itEv[ki].t <= t) {                      // CR-01 (F5): an in-transit parcel arrives
        const x = itEv[ki++]; itRem -= x.qty; if (o.mask[x.j]) itSelRem -= x.qty;
        if (isC[x.j]) cons[x.j] += x.qty;                                // consignment: on the account's shelf now · outright: sold, leaves our stock
      }
      let need = 0;
      for (let j = 0; j < nA; j++) {
        plan[j] = isC[j] ? ((o.useQuota && perDay && perDay[j] > 0) ? perDay[j] * (o.qMult || 1) : rrT[j]) : rrT[j];
        need += plan[j];
      }
      const f = need > 0 ? Math.min(1, wh / need) : 0;
      for (let j = 0; j < nA; j++) {
        const q = plan[j] * f; wh -= q;
        if (isC[j]) { cons[j] += q; unfilledIn += plan[j] - q; }
        else { const l = plan[j] - q; lostAll += l; if (o.mask[j]) lostSelCum += l * DB.price[i][j]; }
      }
      for (let j = 0; j < nA; j++) if (isC[j] && rrT[j] > 0) {
        const s = Math.min(rrT[j], cons[j]); cons[j] -= s;
        const l = rrT[j] - s; lostAll += l; if (o.mask[j]) lostSelCum += l * DB.price[i][j];
      }
      if (wh < 1e-9) wh = 0;
      let cs = 0, ca = 0;
      for (let j = 0; j < nA; j++) { ca += cons[j]; if (o.mask[j]) cs += cons[j]; }
      whA[t] = wh; consSelA[t] = cs; totA[t] = wh + ca + itRem; lostSel[t] = lostSelCum; itSelA[t] = itSelRem;   // CR-01: + in-transit
      if (stockoutT < 0 && rrTot > 0 && wh + ca + itRem < 0.5) stockoutT = t;
    }
    let stockoutDn = null;
    if (rrTot > 0) {
      if (stockoutT >= 0) stockoutDn = as + stockoutT;
      else stockoutDn = as + H + Math.floor(totA[H - 1] / rrTot);   // beyond the horizon: no more PO assumed
    }
    return { whA, consSelA, totA, itSelA, lostSel, lostAll, writeOff, unfilledIn, stockoutDn, consEnd: cons };   // CR-01: + itSelA
  }

  // ------------------------------------------------------------------ filters
  function accountMask(DB, F) {
    const m = new Uint8Array(DB.accounts.length);
    DB.accounts.forEach((a, j) => {
      m[j] = ((!F.ch || !F.ch.length || F.ch.includes(a.channel)) && (!F.acc || !F.acc.length || F.acc.includes(a.account_id))) ? 1 : 0;
    });
    return m;
  }
  const isAllMask = m => m.every(x => x === 1);

  /** A SKU belongs to the selected accounts when it sold there in the last 26 weeks, has stock there, or has a quota there from AS OF on. */
  function carriedBy(DB, i, mask, asDn) {
    if (isAllMask(mask)) return true;
    const wEnd = clamp(DB.wk(asDn), 0, DB.nWeeks), w0 = Math.max(0, wEnd - 26);
    for (let j = 0; j < mask.length; j++) {
      if (!mask[j]) continue;
      if (DB.cumSO[i][j][wEnd] - DB.cumSO[i][j][w0] > 0 || DB.cumSI[i][j][wEnd] - DB.cumSI[i][j][w0] > 0) return true;
    }
    for (const L of DB.lots[i]) if (L.j >= 0 && mask[L.j]) return true;
    const mk = monthKey(asDn);
    for (const [m, q] of DB.quota[i]) if (m >= mk) for (let j = 0; j < mask.length; j++) if (mask[j] && q[j] > 0) return true;
    return false;
  }

  function skuMatches(s, F) {
    if (F.brand && F.brand.length && !F.brand.includes(s.brand)) return false;
    if (F.cat && F.cat.length && !F.cat.includes(s.category)) return false;
    if (F.q) { const q = F.q.toLowerCase().trim(); if (q && !(s.sku.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.alt && s.alt.includes(q)))) return false; }   // CR-04 R7: + alt codes
    return true;
  }

  // ------------------------------------------------------------------ one SKU row
  /** Everything a page needs about one SKU at AS OF.
      Numbers marked "Sel" follow the Channel / Account filter:
        WH is the central stock of every channel, so under a filter it is allocated by Run Rate share:
        WH × (Run Rate of the selected accounts ÷ Run Rate of all accounts).  Σ over channels = the whole.
      Status, Stockout Date, Order-by Date and Suggested Qty are SKU-level (every channel) — a stockout is a SKU event. */
  function skuRow(DB, i, ctx) {
    const s = DB.skus[i], A = DB.accounts, nA = A.length, as = ctx.asDn, S = ctx.S, mask = ctx.mask;
    const st = stockAt(DB, i, as);
    const rr = new Float64Array(nA);
    for (let j = 0; j < nA; j++) rr[j] = (ctx.rrU ? runRateU(DB, i, j, as, ctx.basis, S) : runRate(DB, i, j, as, ctx.basis)) * (ctx.rrMult || 1);   // What-if: Run Rate ± % · CR-03 R3: switch rrMode
    const rrTot = rr.reduce((x, y) => x + y, 0);
    let rrSel = 0; for (let j = 0; j < nA; j++) if (mask[j]) rrSel += rr[j];
    let rrW = null, rrM = null;                                          // CR-04 R9: Trend / Auto → week-by-week forecast in the projection
    if (ctx.basis === 'TR' || ctx.basis === 'AUTO') {
      const ap = ctx.basis === 'AUTO' ? autoPick(DB, i, as, S, !!ctx.rrU) : null, useTr = !ap || ap.pick === 'TR';
      if (useTr) { rrW = []; for (let j = 0; j < nA; j++) { const R = trendRate(DB, i, j, as, S, !!ctx.rrU); rrW.push(R.short || !(rr[j] > 0) ? null : Float64Array.from(R.T.f, v => v / 7 * (ctx.rrMult || 1))); } }
      rrM = { basis: ctx.basis, pick: ap ? ap.pick : 'TR', wape: ap ? ap.wape : null };
    }
    // WH share for the filter (no run rate → share of accounts that carry it)
    let share = 1;
    if (!ctx.allMask) {
      if (rrTot > 0) share = rrSel / rrTot;
      else {
        let all = 0, sel = 0;
        for (let j = 0; j < nA; j++) { const has = st.cons[j] > 0 || [...DB.quota[i].values()].some(q => q[j] > 0); if (has) { all++; if (mask[j]) sel++; } }
        share = all ? sel / all : 0;
      }
    }
    const consAll = st.cons.reduce((x, y) => x + y, 0);
    let consSel = 0; for (let j = 0; j < nA; j++) if (mask[j]) consSel += st.cons[j];
    // CR-01 (F5): in-transit belongs to its destination account (like consignment) and is part of Total
    const itAll = sumArr(st.it); let itSel = 0; if (st.it) for (let j = 0; j < nA; j++) if (mask[j]) itSel += st.it[j];
    const totalAll = st.wh + consAll + itAll;
    const whSel = st.wh * share, totalSel = whSel + consSel + itSel;

    const out = { i, sku: s.sku, name: s.name, brand: s.brand, category: s.category, skuStatus: s.status, cost: s.unit_cost,
      lt: s.lead_time_days, safety: s.safety_days, moq: s.moq, share,
      wh: st.wh, cons: st.cons, consAll, totalAll, whSel, consSel, totalSel, rr, rrTot, rrSel, it: st.it, itAll, itSel,   // CR-01: it*
      doc: rrTot > 0 ? totalAll / rrTot : (totalAll > 0 ? Infinity : 0),
      docSel: rrSel > 0 ? totalSel / rrSel : (totalSel > 0 ? Infinity : 0) };
    out.valueSel = totalSel * s.unit_cost;

    if (ctx.light) return out;      // stock-only row (period openings, history series)

    // projection
    const H = S.projectionDays;
    const P = projectSku(DB, i, { asDn: as, H, wh0: st.wh, cons0: st.cons, rr, rrW, mask, useQuota: S.useQuotaForSalesIn, qMult: ctx.rrMult, ltShift: ctx.ltAdd,   // CR-04 R9: + rrW
      prDaily: S.prPlanOn && S.prPlan ? (+S.prPlan[s.sku] || 0) / 30.4375 : 0 });   // CR-03 R2: + planned PR issues
    out._p = P; if (rrM) out.rrMethod = rrM;   // CR-04 R9
    out.proj = [1, 3, 6].map(m => { const t = Math.min(H, addMonths(as, m) - as) - 1; return P.whA[t] * share + P.consSelA[t] + P.itSelA[t]; });   // CR-01: + in-transit
    out.projAll = [1, 3, 6].map(m => P.totA[Math.min(H, addMonths(as, m) - as) - 1]);
    out.hDays = addMonths(as, ctx.h) - as;
    out.lostSelH = P.lostSel[out.hDays - 1];
    const noReorder = s.status === 'Discontinue' || s.status === 'Clearance';   // CR-01 (F9): Clearance = sell what is left, never re-order
    out.stockoutDn = noReorder && rrTot === 0 ? null : P.stockoutDn;

    // CR-03 R3: out-of-stock weeks and lost sales of the last 13 weeks (each account up to its run-rate end; lost = unconstrained rate × 7 − Sales Out)
    cr3Oos(DB, i, ctx, out, rr);
    // CR-03 R4: ABC-XYZ, actual lead time and — with safetyMode 'statistical' — the statistical safety stock instead of Run Rate × safety_days
    out.cls = ctx.cls ? ctx.cls.rows[i] : null;
    out.lt3 = leadTimeOf(DB, i, as, S);
    const SSx = ctx.stat ? safetyStatOf(out.cls, out.lt3, rrTot, S, ctx) : null;
    out.ss3 = SSx;
    const ltBase = SSx ? SSx.ltBase : s.lead_time_days, sDays = SSx ? SSx.ssDays : s.safety_days;
    if (SSx) { out.lt = ltBase; out.safety = sDays; }

    // reorder maths (SKU level)
    const lt = ltBase * (ctx.ltMult || 1) + (ctx.ltAdd || 0);                 // What-if: Lead Time ± days
    let maxDL = 0; for (let j = 0; j < nA; j++) if (rr[j] > 0 || st.cons[j] > 0) maxDL = Math.max(maxDL, A[j].delivery_lead_days);
    out.maxDL = maxDL;
    out.openPO = DB.po[i].reduce((x, p) => x + ((p.status !== 'Cancelled' && (p.rec == null || p.rec >= as)) ? p.qty : 0), 0);
    out.rop = rrTot * (lt + sDays);                                          // ROP = Run Rate × (Lead Time + Safety Days) · CR-03: = d × LT + SS
    out.safetyQty = rrTot * sDays;
    out.orderByDn = out.stockoutDn == null || noReorder ? null : Math.floor(out.stockoutDn - lt - sDays - maxDL);   // CR-01: + Clearance   // Order-by = Stockout − LT − Safety − Delivery
    const need = rrTot * (lt + S.coverDays) + (SSx ? SSx.ss : 0) - (totalAll + out.openPO);   // Suggested = RR × (LT + cover) − (Total + Open PO) → MOQ multiple · CR-03: + SS
    out.suggestedQty = noReorder || need <= 0 ? 0 : Math.ceil(need / s.moq) * s.moq;   // CR-01: + Clearance

    // expiry (FEFO)
    const lots = expiryRisk(DB, i, lotsAt(DB, i, as, st), rr, as);
    out.lots = lots;
    const riskIn = (days, sel) => lots.reduce((x, L) => {
      if (L.deadline > as + days || L.atRisk <= 0) return x;
      const w = sel ? (L.j < 0 ? share : (mask[L.j] ? 1 : 0)) : 1;
      return [x[0] + L.atRisk * w, x[1] + L.atRiskValue * w];
    }, [0, 0]);
    [out.riskQtyH, out.riskValH] = riskIn(out.hDays, true);
    out.riskByH = [1, 3, 6].map(m => riskIn(addMonths(as, m) - as, true));
    out.riskPast = riskIn(-1, true);                                   // sellable deadline already passed
    const [rq] = riskIn(S.expiryWindow, false);
    out.expiry = rq > 0.5;

    // status (one per SKU; Expiry Risk is a second badge that can sit with any of them)
    let status;
    const disc = noReorder;   // CR-01 (F9): Clearance never shows Stockout Risk / Reorder Now
    if (rrTot === 0 && s.status === 'NPD') status = 'npd';
    else if (rrTot === 0 && totalAll < 0.5) status = 'inactive';
    else if (!disc && out.stockoutDn != null && out.stockoutDn <= as + lt + sDays) status = 'stockout';   // CR-03: sDays = safety_days or SS days
    else if (!disc && out.orderByDn != null && out.orderByDn <= as + S.reorderWindow) status = 'reorder';
    else if (out.doc > S.overstockDoc) status = 'overstock';
    else status = 'healthy';
    out.status = status;

    // quota fit for the AS OF month (selected accounts): Quota ÷ (Sell-out Run Rate × days in month)
    const q = DB.quota[i].get(monthKey(as));
    let qSel = 0; if (q) for (let j = 0; j < nA; j++) if (mask[j]) qSel += q[j];
    out.quotaMonth = qSel;
    out.quotaFit = qSel > 0 && rrSel > 0 ? qSel / (rrSel * daysInMonth(as)) * 100 : null;

    out.action = recommend(DB, out, ctx);
    return out;
  }

  /** Recommended Action (one per SKU). Returns { key, params } — words live in i18n. */
  function recommend(DB, r, ctx) {
    const A = DB.accounts, s = DB.skus[r.i];
    if (r.status === 'stockout') return r.openPO > 0 ? { key: 'act_expedite' } : { key: 'act_urgent' };
    if (r.status === 'reorder') return { key: 'act_order', qty: r.suggestedQty };
    if (r.status === 'npd') return { key: 'act_npd' };
    if (r.status === 'inactive') return { key: 'act_none' };
    // slow stock at an account while another account sells faster → bring it back (CN) and sell there
    let worst = -1, worstDoc = 0;
    r.cons.forEach((q, j) => { if (A[j].is_consignment && q > 0) { const d = r.rr[j] > 0 ? q / r.rr[j] : Infinity; if (d > worstDoc) { worstDoc = d; worst = j; } } });
    const fastest = r.rr.reduce((b, x, j) => (x > (b < 0 ? -1 : r.rr[b]) && j !== worst ? j : b), -1);
    if ((r.status === 'overstock' || r.expiry) && worst >= 0 && worstDoc > ctx.S.overstockDoc && fastest >= 0)
      return { key: 'act_cn', from: A[worst].name, to: A[fastest].channel === A[worst].channel ? A[fastest].name : A[fastest].channel };
    if (s.status === 'Clearance' && r.totalAll > 0) return { key: 'act_clearance' };   // CR-01 (F9)
    if (s.status === 'Discontinue' && r.totalAll > 0) return { key: 'act_clear' };
    if (r.status === 'overstock' || r.expiry) return { key: 'act_promo' };
    return { key: 'act_ok' };
  }

  // ------------------------------------------------------------------ period (VIEW BY)
  /** Weekly  : the week before AS OF (Mon–Sun); previous = the week before that.
      Monthly : the retail month of the last complete week (weeks whose Monday falls in the month), to AS OF — MTD when the month is not over;
                previous = the whole retail month before. */
  function periodOf(DB, asDn, view) {
    if (view !== 'M') return { p0: asDn - 7, p1: asDn, prev0: asDn - 14, prev1: asDn - 7, partial: false, view: 'W' };
    const last = asDn - 7;
    const p0 = Math.max(firstMondayOnOrAfter(monthStart(last)), DB.startDn);
    const prev0 = Math.max(firstMondayOnOrAfter(addMonths(monthStart(last), -1)), DB.startDn);
    return { p0, p1: asDn, prev0, prev1: p0, partial: monthStart(asDn) === monthStart(last), view: 'M', month: monthKey(last) };
  }

  // ------------------------------------------------------------------ flows in a period (selected accounts, allocated WH)
  function flowsSku(DB, i, a, b, mask, share) {
    const nA = DB.accounts.length, wa = clamp(DB.wk(a), 0, DB.nWeeks), wb = clamp(DB.wk(b), 0, DB.nWeeks);
    const f = { so: 0, si: 0, siCons: 0, soCons: 0, poRec: 0, cnGoodOut: 0, cnGoodCons: 0, writeOff: 0, cnBadOut: 0, oo: 0 };   // CR-03: + oo
    for (let j = 0; j < nA; j++) {
      if (!mask[j]) continue;
      const so = DB.cumSO[i][j][wb] - DB.cumSO[i][j][wa], si = DB.cumSI[i][j][wb] - DB.cumSI[i][j][wa];
      f.so += so; f.si += si;
      if (DB.accounts[j].is_consignment) { f.siCons += si; f.soCons += so; }
    }
    for (const p of DB.po[i]) if (p.rec != null && p.rec >= a && p.rec < b) f.poRec += p.qty * share;
    for (const c of DB.cn[i]) {
      if (c.status !== 'Received' || c.dn < a || c.dn >= b || !mask[c.j]) continue;
      const cons = DB.accounts[c.j].is_consignment;
      if (cons) { if (c.good) f.cnGoodCons += c.qty; else f.writeOff += c.qty; }
      else if (c.good) f.cnGoodOut += c.qty; else f.cnBadOut += c.qty;
    }
    for (const x of (DB.oo && DB.oo[i]) || []) if (x.dn >= a && x.dn < b && (x.j < 0 || mask[x.j])) f.oo += x.qty * (x.j < 0 ? share : 1);   // CR-03 R2
    return f;
  }

  // ------------------------------------------------------------------ the whole model for a filter state
  /** F = { asDn, view:'W'|'M', ch:[], acc:[], brand:[], cat:[], q:'', rr:'L4W'|'L3M'|'L6M'|'W', h:1|3|6 }
      opts = { prev:true → also KPIs of the previous period (for the Δ arrows), series:true → weekly chart series } */
  function computeModel(DB, F, S, opts) {
    S = Object.assign({}, DEFAULT_SETTINGS, S || {});
    opts = opts || {};
    DB.rrEndMode = S.rrEndMode;                                          // CR-03 R1: the run-rate end follows the setting
    { const on = S.countAdjustOn !== false; if (DB.hasAdj && DB.adjOn !== on) { DB._wkSt = null; DB._oos = null; DB._wkEnd = null; DB._trK = null; } DB.adjOn = on; }   // CR-04 I8-c: the switch (stock caches follow it)
    { const tk = [S.trendPhi, S.trendCap, S.trendMinW, S.rrEndMode].join(','); if (DB._trK !== tk) { DB._trK = tk; DB._tr = new Map(); DB._auto = new Map(); DB._skuTr = new Map(); } DB._trS = S; }   // CR-04 R9
    if (F.rm === 'sellout' || F.rm === 'unconstrained') S.rrMode = F.rm;   // CR-03 R3: the filter bar can switch the run-rate method
    const asDn = clamp(monday(F.asDn), DB.minAsOf, DB.maxAsOf);
    const mask = accountMask(DB, F), allMask = isAllMask(mask);
    const basis = F.rr || S.rrBasis, h = +F.h || 3;
    const ctx = { asDn, S, mask, allMask, basis, h, rrMult: F.rrMult, ltMult: F.ltMult, ltAdd: F.ltAdd,
      rrU: S.rrMode === 'unconstrained', stat: S.safetyMode === 'statistical', slAdd: F.slAdd, cls: abcxyzOf(DB, asDn, S) };   // CR-03 R3 / R4
    const skuSet = DB.skus.filter(s => skuMatches(s, F) && carriedBy(DB, s.i, mask, asDn)).map(s => s.i);
    const rows = skuSet.map(i => skuRow(DB, i, ctx));
    const period = periodOf(DB, asDn, F.view);
    const kpi = kpisOf(DB, rows, period, ctx);
    const model = { asDn, period, mask, allMask, basis, h, rows, kpi, S, F };
    if (opts.prev) {
      const pAs = period.prev1;
      if (pAs >= DB.minAsOf - 28) {
        const pctx = Object.assign({}, ctx, { asDn: pAs, cls: abcxyzOf(DB, pAs, S) });   // CR-03: the groups as at that AS OF
        const prow = skuSet.map(i => skuRow(DB, i, pctx));
        model.periodPrev = { p0: period.prev0, p1: period.prev1, view: period.view };
        model.kpiPrev = kpisOf(DB, prow, model.periodPrev, pctx);
        model.rowsPrev = prow;
      }
    }
    if (opts.series) {
      model.series = seriesOf(DB, rows, ctx);
      model.waterfall = waterfallOf(DB, rows, period, ctx);
    }
    model.statusCount = STATUS_ORDER.reduce((o, k) => (o[k] = rows.filter(r => r.status === k).length, o), {});
    model.statusCount.expiry = rows.filter(r => r.expiry).length;
    model.actions = actionList(rows, asDn);
    return model;
  }

  /** Overview KPIs. Every one is a sum / ratio over the same rows the Stock table shows. */
  function kpisOf(DB, rows, period, ctx) {
    let val = 0, rrVal = 0, so = 0, base = 0, stockout = 0, risk = 0, fitN = 0, fitOk = 0;
    const riskBy = [[0, 0], [0, 0], [0, 0]], riskPast = [0, 0];       // [qty, value] within 1M / 3M / 6M · deadline already passed
    for (const r of rows) {
      (r.riskByH || []).forEach((x, n) => { riskBy[n][0] += x[0]; riskBy[n][1] += x[1]; });
      if (r.riskPast) { riskPast[0] += r.riskPast[0]; riskPast[1] += r.riskPast[1]; }
      val += r.totalSel * r.cost;
      rrVal += r.rrSel * r.cost;
      const open = stockAt(DB, r.i, period.p0);
      let openCons = 0; open.cons.forEach((q, j) => { if (ctx.mask[j] && DB.accounts[j].is_consignment) openCons += q; });
      const f = flowsSku(DB, r.i, period.p0, period.p1, ctx.mask, 1);
      so += f.soCons; base += openCons + f.siCons;                 // Sell-through = Sales Out ÷ (Opening Consignment + Sales In)
      if (r.status === 'stockout') stockout++;
      risk += r.riskValH || 0;
      if (r.quotaFit != null) { fitN++; if (r.quotaFit >= ctx.S.fitLow && r.quotaFit <= ctx.S.fitHigh) fitOk++; }
    }
    return {
      stockValue: val,
      doc: rrVal > 0 ? val / rrVal : null,                           // value-weighted DOC = Σ stock × cost ÷ Σ run rate × cost
      sellThrough: base > 0 ? so / base * 100 : null,
      stockoutSku: stockout,
      riskValue: risk, riskBy, riskPast,
      quotaFit: fitN ? fitOk / fitN * 100 : null, quotaFitN: fitN, quotaFitOk: fitOk,
      skuCount: rows.length
    };
  }

  /** Weekly series for the Overview projection chart: 12 weeks actual + 26 weeks projected. */
  function seriesOf(DB, rows, ctx) {
    const as = ctx.asDn, back = 12, fwd = 26, pts = [];
    for (let k = -back; k <= fwd; k++) {
      const d = as + 7 * k;
      const p = { k, dn: d, est: k > 0, wh: 0, cons: 0, whV: 0, consV: 0, out: 0, outV: 0, po: 0, poV: 0, cn: 0, cnV: 0, it: 0, itV: 0 };   // CR-01: + it
      pts.push(p);
    }
    for (const r of rows) {
      const c = r.cost;
      for (const p of pts) {
        let wh, cons, it = 0;
        if (p.k < 0) {
          if (p.dn < DB.startDn) { p.na = true; continue; }
          const st = stockAt(DB, r.i, p.dn);
          wh = st.wh * r.share; cons = 0; st.cons.forEach((q, j) => { if (ctx.mask[j]) cons += q; });
          if (st.it) st.it.forEach((q, j) => { if (ctx.mask[j]) it += q; });   // CR-01
        } else if (p.k === 0) {
          wh = r.whSel; cons = r.consSel; it = r.itSel;
        } else {
          const t = 7 * p.k - 1;
          wh = r._p.whA[t] * r.share; cons = r._p.consSelA[t]; it = r._p.itSelA[t];
          p.out += r.rrSel * 7; p.outV += r.rrSel * 7 * c;
        }
        if (p.k <= 0) {      // actual movements of the week that ends at this point
          const f = flowsSku(DB, r.i, p.dn - 7, p.dn, ctx.mask, r.share);
          p.out += f.so; p.outV += f.so * c; p.po += f.poRec; p.poV += f.poRec * c;
          p.cn += f.cnGoodCons + f.cnGoodOut; p.cnV += (f.cnGoodCons + f.cnGoodOut) * c;
        }
        p.wh += wh; p.cons += cons; p.whV += wh * c; p.consV += cons * c; p.it += it; p.itV += it * c;   // CR-01
      }
      // future inbound markers: PO by ETA (allocated) and CN coming back (selected accounts)
      for (const po of DB.po[r.i]) {
        if (po.status === 'Cancelled' || (po.rec != null && po.rec < as)) continue;
        const k = Math.floor((Math.max(po.eta, as) - as) / 7) + 1;
        if (k >= 1 && k <= fwd) { const p = pts[back + k]; p.po += po.qty * r.share; p.poV += po.qty * r.share * c; }
      }
      for (const cn of DB.cn[r.i]) {
        if (!ctx.mask[cn.j] || /cancel|reject/i.test(cn.status) || (cn.status === 'Received' && cn.dn < as)) continue;
        const k = Math.floor((Math.max(cn.dn, as) - as) / 7) + 1;
        if (k >= 1 && k <= fwd && cn.good) { const p = pts[back + k]; p.cn += cn.qty; p.cnV += cn.qty * c; }
      }
    }
    return pts.filter(p => !p.na);
  }

  /** Waterfall of Total Stock over the period: Opening → +PO received → +CN Good (returns of outright sales) → −Sales Out → −Write-off (CN Bad) → Closing.
      CN Good from a consignment account only moves stock account → WH, so it does not change Total and is not a bar.
      Under a Channel / Account filter the WH part is allocated; the bar "WH allocation" closes the gap so the chart still adds up. */
  function waterfallOf(DB, rows, period, ctx) {
    const w = { open: 0, po: 0, cnGood: 0, so: 0, wo: 0, close: 0, adj: 0, openV: 0, poV: 0, cnGoodV: 0, soV: 0, woV: 0, closeV: 0, adjV: 0, oo: 0, ooV: 0 };   // CR-03: + oo
    for (const r of rows) {
      const c = r.cost;
      const o = stockAt(DB, r.i, period.p0);
      let oc = 0; o.cons.forEach((q, j) => { if (ctx.mask[j]) oc += q; });
      if (o.it) o.it.forEach((q, j) => { if (ctx.mask[j]) oc += q; });   // CR-01 (F5): opening Total includes in-transit
      const open = o.wh * r.share + oc, close = r.totalSel;
      const f = flowsSku(DB, r.i, period.p0, period.p1, ctx.mask, r.share);
      const adj = close - (open + f.poRec + f.cnGoodOut - f.so - f.writeOff - f.oo);   // CR-03: − other_out
      w.open += open; w.po += f.poRec; w.cnGood += f.cnGoodOut; w.so += f.so; w.wo += f.writeOff; w.close += close; w.adj += adj;
      w.oo += f.oo; w.ooV += f.oo * c;                                   // CR-03 R2
      w.openV += open * c; w.poV += f.poRec * c; w.cnGoodV += f.cnGoodOut * c; w.soV += f.so * c; w.woV += f.writeOff * c; w.closeV += close * c; w.adjV += adj * c;
    }
    return w;
  }

  /** Top actions: Stockout Risk (largest lost sales first) → Reorder Now (earliest order-by) → Expiry Risk (largest at-risk value) → Overstock (largest excess value). */
  function actionList(rows, asDn) {
    const rank = r => r.status === 'stockout' ? 0 : r.status === 'reorder' ? 1 : r.expiry ? 2 : r.status === 'overstock' ? 3 : 9;
    const weight = r => r.status === 'stockout' ? -(r.lostSelH || 0) : r.status === 'reorder' ? (r.orderByDn ?? 0) - asDn
      : r.expiry ? -(r.riskValH || 0) : -((r.totalSel - r.rrSel * 180) * r.cost);
    return rows.filter(r => rank(r) < 9).sort((a, b) => rank(a) - rank(b) || weight(a) - weight(b));
  }

  // ------------------------------------------------------------------ selfCheck
  /** Reconciliation and data checks. Returns { ok, checks:[{id, ok, n, detail}] } — shown in the console and on the Data page. */
  function selfCheck(DB) {
    const checks = [], A = DB.accounts, nA = A.length;
    const add = (id, bad, total, detail) => checks.push({ id, ok: bad === 0, n: bad, total, detail: detail || '' });

    // 1) references
    add('refs', DB.issues.length, null, DB.issues.slice(0, 5).map(x => x.table + ' row ' + x.row).join(', '));

    // 2) outright accounts: Sales In = Sales Out every week
    let bad = 0, tot = 0;
    for (let i = 0; i < DB.skus.length; i++) for (let j = 0; j < nA; j++) {
      if (A[j].is_consignment) continue;
      for (let w = 0; w < DB.nWeeks; w++) { tot++; if (Math.abs(DB.si[i][j][w] - DB.so[i][j][w]) > 0.5) bad++; }
    }
    add('outright', bad, tot);

    // 3) Opening + In − Out = Closing for every SKU, every week, at WH, each account and Total.
    //    Total is checked through two independent paths: (WH + Σ accounts) vs (PO + CN Good outright − Sales Out − CN Bad consignment).
    let neg = 0, recon = 0, pairs = 0, worst = '';
    let whBad = 0, whWorst = '';                                          // CR-03 (10)
    for (let i = 0; i < DB.skus.length; i++) {
      let prev = stockAt(DB, i, DB.startDn);
      for (let w = 0; w < DB.nWeeks; w++) {
        const a = DB.startDn + 7 * w, b = a + 7;
        const next = stockAt(DB, i, b);
        { // CR-03 (10): WH opening + PO received + CN Good back − goods issued (delivered + change in transit) − other_out = WH closing
          let rec = 0, cnG = 0, out = sumArr(next.it) - sumArr(prev.it), oo = 0;
          for (const p of DB.po[i]) if (p.rec != null && p.rec >= a && p.rec < b) rec += p.qty;
          for (const c of DB.cn[i]) if (c.status === 'Received' && c.good && c.dn >= a && c.dn < b) cnG += c.qty;
          for (let j = 0; j < nA; j++) out += DB.si[i][j][w];
          for (const x of (DB.oo && DB.oo[i]) || []) if (x.j < 0 && x.dn >= a && x.dn < b) oo += x.qty;
          if (Math.abs(prev.wh + rec + cnG - out - oo - next.wh) > 0.5) { whBad++; if (!whWorst) whWorst = DB.skus[i].sku + ' wk ' + iso(a); }
        }
        if (next.wh < -0.5) neg++;
        next.cons.forEach(q => { if (q < -0.5) neg++; });
        const f = flowsSku(DB, i, a, b, new Uint8Array(nA).fill(1), 1);
        const totPrev = prev.wh + prev.cons.reduce((x, y) => x + y, 0) + sumArr(prev.it), totNext = next.wh + next.cons.reduce((x, y) => x + y, 0) + sumArr(next.it);   // CR-01: + in-transit
        let adjQ = 0; if (DB.adjOn !== false) for (const x of (DB.adj && DB.adj[i]) || []) if (x.dn > a && x.dn <= b) adjQ += x.qty;   // CR-04 I8-c: count adjustments are part of the balance
        const expect = totPrev + f.poRec + f.cnGoodOut - f.so - f.writeOff - f.oo + adjQ;   // CR-03: − other_out
        pairs++;
        if (Math.abs(expect - totNext) > 0.5) { recon++; if (!worst) worst = DB.skus[i].sku + ' wk ' + iso(a); }
        prev = next;
      }
    }
    add('negative', neg, null);
    add('reconcile', recon, pairs, worst);

    // 4) lots
    let lotBad = 0;
    DB.lots.forEach(ls => ls.forEach(L => {
      if (!(L.qty > 0) || L.exp == null || L.mfg == null || L.exp <= L.mfg) lotBad++;
      else if (L.j >= 0 && !A[L.j].is_consignment) lotBad++;           // outright accounts hold no stock of ours
    }));
    add('lots', lotBad, DB.lots.reduce((x, l) => x + l.length, 0));
    add('wh_flow', whBad, pairs, whWorst);                                // CR-03 (10)

    // CR-03 (12): ABC at the latest AS OF — the A + B + C value shares add up to 100 % · every SKU has one group
    { const R = abcxyzOf(DB, DB.maxAsOf, DEFAULT_SETTINGS), T = R.tot, sh = T.A.share + T.B.share + T.C.share;
      const noGroup = R.rows.filter(r => !CR3_GROUPS.includes(r.group)).length;
      add('abc', (T.value > 0 && Math.abs(sh - 100) > 0.01 ? 1 : 0) + noGroup, R.rows.length,
        `A ${T.A.n} · ${T.A.share.toFixed(1)}% / B ${T.B.n} · ${T.B.share.toFixed(1)}% / C ${T.C.n} · ${T.C.share.toFixed(1)}% / N ${T.N.n} / E ${T.E.n}`); }

    const ok = checks.every(c => c.ok);
    return { ok, checks, snapshot: iso(DB.snapDn), weeks: DB.nWeeks };
  }

  /** Cross-page check for one model: KPI Total Stock = Σ table rows, waterfall closes, status counts add up. */
  function modelCheck(M) {
    const sum = M.rows.reduce((x, r) => x + r.totalSel * r.cost, 0);
    const out = [{ id: 'kpi_vs_table', ok: Math.abs(sum - M.kpi.stockValue) < 1 }];
    if (M.waterfall) {
      const w = M.waterfall;
      out.push({ id: 'waterfall', ok: Math.abs(w.openV + w.poV + w.cnGoodV - w.soV - w.woV - (w.ooV || 0) + w.adjV - w.closeV) < 1 && Math.abs(w.closeV - M.kpi.stockValue) < 1 });   // CR-03: − other_out
    }
    const n = STATUS_ORDER.reduce((x, k) => x + M.statusCount[k], 0);
    out.push({ id: 'status_count', ok: n === M.rows.length });
    return out;
  }

  /** SKU detail (drawer): weekly projection with PO / CN bars + per-account table. Uses the row already computed. */
  function skuDetail(DB, M, row) {
    const as = M.asDn, weeks = [];
    for (let k = -8; k <= 26; k++) {
      const d = as + 7 * k;
      if (d < DB.startDn) continue;
      let tot;
      if (k < 0) { const st = stockAt(DB, row.i, d); let c = 0; st.cons.forEach((q, j) => { if (M.mask[j]) c += q; }); if (st.it) st.it.forEach((q, j) => { if (M.mask[j]) c += q; }); tot = st.wh * row.share + c; }   // CR-01: + it
      else if (k === 0) tot = row.totalSel;
      else { const t = 7 * k - 1; tot = row._p.whA[t] * row.share + row._p.consSelA[t] + row._p.itSelA[t]; }   // CR-01: + it
      weeks.push({ k, dn: d, tot, po: 0, cn: 0, est: k > 0 });
    }
    const idx = new Map(weeks.map((w, n) => [w.k, n]));
    // a movement on day d shows on the point at the end of its week: k = ⌊(d − AS OF) / 7⌋ + 1
    for (const p of DB.po[row.i]) {
      if (p.status === 'Cancelled') continue;
      const d = (p.rec != null && p.rec < as) ? p.rec : Math.max(p.eta, as);   // received before AS OF → actual date, else ETA
      const k = Math.floor((d - as) / 7) + 1;
      if (idx.has(k)) weeks[idx.get(k)].po += p.qty * row.share;
    }
    for (const c of DB.cn[row.i]) {
      if (!M.mask[c.j] || /cancel|reject/i.test(c.status)) continue;
      const d = (c.status === 'Received' && c.dn < as) ? c.dn : Math.max(c.dn, as);
      const k = Math.floor((d - as) / 7) + 1;
      if (idx.has(k)) weeks[idx.get(k)].cn += c.qty;
    }
    const per = periodOf(DB, as, M.F.view);
    const accounts = DB.accounts.map((a, j) => {
      const f = flowsSku(DB, row.i, per.p0, per.p1, Uint8Array.from(DB.accounts, (_, x) => x === j ? 1 : 0), 1);
      const open = stockAt(DB, row.i, per.p0).cons[j];
      const q = DB.quota[row.i].get(monthKey(as));
      return { j, id: a.account_id, name: a.name, channel: a.channel, cons: a.is_consignment, sel: !!M.mask[j],
        rem: row.cons[j], rrDay: row.rr[j], doc: row.rr[j] > 0 ? row.cons[j] / row.rr[j] : (row.cons[j] > 0 ? Infinity : null),
        sellThrough: a.is_consignment && open + f.si > 0 ? f.so / (open + f.si) * 100 : null, so: f.so, si: f.si, quota: q ? q[j] : 0 };
    }).filter(r => r.rem > 0 || r.rrDay > 0 || r.quota > 0 || r.so > 0);
    return { weeks, accounts, rop: row.rrSel * (row.lt + row.safety), safety: row.rrSel * row.safety };
  }

  // ================================================================== Phase 2
  const oneMask = (n, j) => { const m = new Uint8Array(n); m[j] = 1; return m; };
  /** the fastest other outlet of a SKU (by run rate), for "recall (CN) → sell at …" */
  function bestOutlet(DB, r, notJ) {
    let best = -1;
    r.rr.forEach((x, j) => { if (j !== notJ && x > 0 && (best < 0 || x > r.rr[best])) best = j; });
    if (best < 0 || (notJ >= 0 && r.rr[best] <= r.rr[notJ])) return null;
    const A = DB.accounts, same = notJ >= 0 && A[best].channel === A[notJ].channel;
    return { j: best, label: same ? A[best].name : A[best].channel + ' (' + A[best].name + ')', rr: r.rr[best] };
  }

  // ------------------------------------------------------------------ Expiry Risk
  /** Recommended action for one lot. */
  function lotAction(DB, r, L, as) {
    if (L.atRisk < 0.5) return { key: 'act_ok' };
    if (L.exp <= as) return { key: 'act_writeoff' };                                   // already expired
    if (L.j >= 0) {
      const b = bestOutlet(DB, r, L.j);
      return b ? { key: 'act_cn', from: DB.accounts[L.j].name, to: b.label } : { key: 'act_promo_at', at: DB.accounts[L.j].name };
    }
    return L.deadline < as ? { key: 'act_short_life' } : { key: 'act_promo' };       // WH: past its deadline for most accounts → TT / ECOM / clearance
  }
  /** Every lot of the filtered SKUs at AS OF. WH lots count by the filter share (qty × share), lots at unselected accounts drop out —
      so Σ At-risk here = the At-risk KPI on Overview. */
  function expiryLots(DB, M) {
    const as = M.asDn, out = [];
    for (const r of M.rows) for (const L of r.lots) {
      const w = L.j < 0 ? r.share : (M.mask[L.j] ? 1 : 0);
      if (w <= 0) continue;
      const qty = L.qty * w, atRisk = L.atRisk * w;
      out.push({ i: r.i, sku: r.sku, name: r.name, brand: r.brand, category: r.category, cost: r.cost, lot_no: L.lot_no, j: L.j, est: !!L.est,
        qty, value: qty * r.cost, exp: L.exp, mfg: L.mfg, deadline: L.deadline, sellOutDn: L.sellOutDn, atRisk, atRiskValue: atRisk * r.cost,
        daysToExp: L.exp - as, action: lotAction(DB, r, L, as) });
    }
    return out;
  }
  /** Stock Aging: months left before expiry — expired · < 3 · 3–6 · 6–12 · > 12 (split WH / consignment). */
  const AGING = [{ key: 'expired', max: 0 }, { key: 'lt3', max: 91 }, { key: 'm3_6', max: 183 }, { key: 'm6_12', max: 365 }, { key: 'gt12', max: Infinity }];
  function agingOf(lots) {
    const b = AGING.map(a => ({ key: a.key, qty: 0, value: 0, whQty: 0, whV: 0, consQty: 0, consV: 0, riskQty: 0, riskV: 0 }));
    for (const L of lots) {
      const x = b[L.daysToExp <= 0 ? 0 : AGING.findIndex((a, n) => n > 0 && L.daysToExp < a.max)];
      x.qty += L.qty; x.value += L.value; x.riskQty += L.atRisk; x.riskV += L.atRiskValue;
      if (L.j < 0) { x.whQty += L.qty; x.whV += L.value; } else { x.consQty += L.qty; x.consV += L.value; }
    }
    return b;
  }
  /** Heatmap Category × expiry month (value at cost): already expired · the 12 months from AS OF · later. cell = { value, risk } */
  function expiryHeat(lots, as) {
    const m0 = monthStart(as), cols = [{ key: 'past' }];
    for (let k = 0; k < 12; k++) cols.push({ key: monthKey(addMonths(m0, k)) });
    cols.push({ key: 'later' });
    const idx = new Map(cols.map((c, n) => [c.key, n]));
    const cats = [...new Set(lots.map(L => L.category))].sort();
    const cells = new Map(cats.map(c => [c, cols.map(() => ({ value: 0, risk: 0, qty: 0 }))]));
    for (const L of lots) {
      const key = L.exp < as ? 'past' : idx.has(monthKey(L.exp)) ? monthKey(L.exp) : 'later';
      const c = cells.get(L.category)[idx.get(key)];
      c.value += L.value; c.risk += L.atRiskValue; c.qty += L.qty;
    }
    return { cols, cats, cells };
  }

  // ------------------------------------------------------------------ Consignment
  /** SKU × consignment account pairs (selected accounts) at AS OF, with the period's flows.
        Remaining · DOC = Remaining ÷ account run rate · Sell-through = Sales Out ÷ (opening + Sales In) in the period
        status: out (nothing left, still selling) · low (DOC < 14) · high (DOC > 120 or sell-through below 5 % / week · 20 % / month) · ok
      Recall (CN) suggestion when status = high or lots at the account miss their deadline:
        CN qty = Remaining − Run Rate × 45 days (at least the at-risk qty) → to the outlet with the highest run rate. */
  function consignmentOf(DB, rows, asDn, period, mask, S) {
    S = Object.assign({}, DEFAULT_SETTINGS, S || {});
    const A = DB.accounts, nA = A.length;
    const accs = A.filter(a => a.is_consignment && mask[a.j]).map(a => a.j);
    const stLow = period.view === 'M' ? S.stLowM : S.stLowW;
    const pairs = [], byAcc = new Map(accs.map(j => [j, { j, id: A[j].account_id, name: A[j].name, rem: 0, remV: 0, rrV: 0, si: 0, so: 0, siV: 0, soV: 0, open: 0, n: 0, high: 0, low: 0, out: 0 }]));
    const mk = monthKey(asDn);
    for (const r of rows) {
      const opening = stockAt(DB, r.i, period.p0).cons, q = DB.quota[r.i].get(mk);
      for (const j of accs) {
        const rem = r.cons[j], rr = r.rr[j];
        const f = flowsSku(DB, r.i, period.p0, period.p1, oneMask(nA, j), 1);
        const quota = q ? q[j] : 0;
        if (rem < 0.5 && rr <= 0 && f.si <= 0 && f.so <= 0 && opening[j] < 0.5 && !quota) continue;     // not carried there
        const doc = rr > 0 ? rem / rr : (rem > 0.5 ? Infinity : null);
        const base = opening[j] + f.si, st = base > 0 ? f.so / base * 100 : null;
        let riskQty = 0, riskV = 0;
        for (const L of r.lots || []) if (L.j === j && L.atRisk > 0.5 && L.deadline <= asDn + S.expiryWindow) { riskQty += L.atRisk; riskV += L.atRiskValue; }
        let status = 'ok';
        if (rem < 0.5 && (rr > 0 || quota > 0)) status = 'out';
        else if (doc != null && doc < S.consignDocLow) status = 'low';
        else if (rem > 0.5 && ((doc != null && doc > S.consignDocHigh) || (st != null && st < stLow))) status = 'high';
        const p = { i: r.i, sku: r.sku, name: r.name, brand: r.brand, category: r.category, cost: r.cost, j, acc: A[j].name, rem, remV: rem * r.cost, rr, doc,
          open: opening[j], si: f.si, so: f.so, siV: f.si * r.cost, soV: f.so * r.cost, st, quota, riskQty, riskV, status, expiry: riskQty > 0.5,
          oosW: r.oosBits ? popcount(r.oosBits[j]) : 0, oosBits: r.oosBits ? r.oosBits[j] : 0 };   // CR-03 R3: out-of-stock weeks (13W) at this account
        if ((status === 'high' || p.expiry) && rem > 0.5) {
          const cn = Math.min(rem, Math.max(rem - rr * S.cnKeepDays, riskQty));
          if (cn >= 1) {
            const b = bestOutlet(DB, r, j);
            p.recall = { qty: cn, value: cn * r.cost, to: b ? b.label : null, toRr: b ? b.rr : 0,
              reasons: [doc != null && doc > S.consignDocHigh ? 'doc' : null, st != null && st < stLow ? 'st' : null, p.expiry ? 'exp' : null].filter(Boolean) };
          }
        }
        pairs.push(p);
        const a = byAcc.get(j);
        a.rem += rem; a.remV += p.remV; a.rrV += rr * r.cost; a.si += f.si; a.so += f.so; a.siV += p.siV; a.soV += p.soV; a.open += opening[j]; a.n++;
        if (status === 'high') a.high++; if (status === 'low') a.low++; if (status === 'out') a.out++;
      }
    }
    const accList = [...byAcc.values()].map(a => Object.assign(a, { doc: a.rrV > 0 ? a.remV / a.rrV : null, st: a.open + a.si > 0 ? a.so / (a.open + a.si) * 100 : null }));
    const tot = accList.reduce((x, a) => ({ remV: x.remV + a.remV, rrV: x.rrV + a.rrV, so: x.so + a.so, base: x.base + a.open + a.si }), { remV: 0, rrV: 0, so: 0, base: 0 });
    const rec = pairs.filter(p => p.recall);
    return { accs, pairs, byAcc: accList, stLow,
      kpi: { value: tot.remV, doc: tot.rrV > 0 ? tot.remV / tot.rrV : null, sellThrough: tot.base > 0 ? tot.so / tot.base * 100 : null,
        recallN: rec.length, recallV: rec.reduce((x, p) => x + p.recall.value, 0), pairs: pairs.length, high: pairs.filter(p => p.status === 'high').length,
        short: pairs.filter(p => p.status === 'low' || p.status === 'out').length } };
  }
  /** The last n periods (VIEW BY) ending at AS OF — weeks, or retail months (the last one MTD). */
  function periodsBack(DB, asDn, view, n) {
    const out = [];
    if (view !== 'M') { for (let k = n - 1; k >= 0; k--) { const p1 = asDn - 7 * k; if (p1 - 7 >= DB.startDn) out.push({ p0: p1 - 7, p1 }); } return out; }
    const last = monthStart(asDn - 7);
    for (let k = n - 1; k >= 0; k--) {
      const ms = addMonths(last, -k), p0 = firstMondayOnOrAfter(ms), p1 = Math.min(asDn, firstMondayOnOrAfter(addMonths(ms, 1)));
      if (p0 >= DB.startDn && p1 > p0) out.push({ p0, p1, month: monthKey(ms) });
    }
    return out;
  }
  /** Sales In / Sales Out per period and the Remaining at each period end — for the selected consignment accounts (js). */
  function consignSeries(DB, rows, asDn, view, js) {
    const nA = DB.accounts.length, m = new Uint8Array(nA); js.forEach(j => { m[j] = 1; });
    return periodsBack(DB, asDn, view, 12).map(p => {
      const x = Object.assign({ si: 0, so: 0, siV: 0, soV: 0, rem: 0, remV: 0 }, p);
      for (const r of rows) {
        const f = flowsSku(DB, r.i, p.p0, p.p1, m, 1), st = stockAt(DB, r.i, p.p1);
        let rem = 0; js.forEach(j => { rem += st.cons[j]; });
        x.si += f.si; x.so += f.so; x.siV += f.si * r.cost; x.soV += f.so * r.cost; x.rem += rem; x.remV += rem * r.cost;
      }
      return x;
    });
  }

  // ------------------------------------------------------------------ Inbound & CN
  /** PO status as it stood at AS OF (a PO received after AS OF was still open then). */
  function poStatusAt(p, as) {
    if (p.rec != null && p.rec < as) return 'Received';
    if (p.status === 'Received') return p.eta < as ? 'Delayed' : 'Confirmed';
    if (p.status !== 'Delayed' && p.status !== 'Cancelled' && p.eta != null && p.eta < as) return 'Delayed';
    return p.status;
  }
  function cnStatusAt(c, as) { return c.status === 'Received' ? (c.dn < as ? 'Received' : 'Approved') : c.status; }
  /** PO and CN events of the filtered SKUs (CN only for the selected accounts). PO quantities are whole documents (not allocated).
        PO day = received date, or ETA while open (an overdue open PO sits on AS OF) · On-time = received on or before ETA.
        KPIs: PO arriving within the horizon · CN coming back within the horizon · PO Delayed now · On-time % of the last 90 days (vs the 90 before). */
  function inboundOf(DB, M) {
    const as = M.asDn, S = M.S, A = DB.accounts, hEnd = addMonths(as, M.h), po = [], cn = [];
    for (const r of M.rows) {
      for (const p of DB.po[r.i]) {
        if (p.status === 'Cancelled') continue;
        const st = poStatusAt(p, as), open = st !== 'Received';
        const day = open ? Math.max(p.eta ?? as, as) : p.rec;
        po.push({ type: 'po', i: r.i, sku: r.sku, name: r.name, cost: r.cost, no: p.po_no, qty: p.qty, value: p.qty * r.cost, order: p.order, eta: p.eta, rec: open ? null : p.rec,
          day, status: st, open, supplier: p.supplier, late: open ? Math.max(0, as - p.eta) : p.rec - p.eta, onTime: open ? null : p.rec <= p.eta });
      }
      for (const c of DB.cn[r.i]) {
        if (!M.mask[c.j] || /cancel|reject/i.test(c.status)) continue;
        const st = cnStatusAt(c, as);
        cn.push({ type: 'cn', i: r.i, sku: r.sku, name: r.name, cost: r.cost, no: c.cn_no, qty: c.qty, value: c.qty * r.cost, day: c.dn, status: st, open: st !== 'Received',
          j: c.j, acc: A[c.j].name, consignment: A[c.j].is_consignment, reason: c.reason, good: c.good });
      }
    }
    const inH = e => e.open && e.day >= as && e.day < hEnd;
    const poH = po.filter(inH), cnH = cn.filter(inH), delayed = po.filter(p => p.open && p.status === 'Delayed');
    const win = (a, b) => po.filter(p => !p.open && p.rec >= a && p.rec < b);
    const cur = win(as - S.onTimeDays, as), prev = win(as - 2 * S.onTimeDays, as - S.onTimeDays);
    const pct = l => l.length ? l.filter(p => p.onTime).length / l.length * 100 : null;
    return { po, cn, hEnd,
      kpi: { poN: poH.length, poQty: sum(poH, 'qty'), poV: sum(poH, 'value'),
        cnN: cnH.length, cnQty: sum(cnH, 'qty'), cnGood: sum(cnH.filter(c => c.good), 'qty'), cnBad: sum(cnH.filter(c => !c.good), 'qty'), cnBadV: sum(cnH.filter(c => !c.good), 'value'),
        delayN: delayed.length, delayQty: sum(delayed, 'qty'), delayV: sum(delayed, 'value'),
        onTime: pct(cur), onTimeN: cur.length, onTimeOk: cur.filter(p => p.onTime).length, onTimePrev: pct(prev) } };
  }
  const sum = (l, k) => l.reduce((x, e) => x + e[k], 0);
  /** events → Map(day → { po:[…], cn:[…], poQty, cnQty, delayed }) */
  function eventsByDay(events) {
    const m = new Map();
    for (const e of events) {
      if (!m.has(e.day)) m.set(e.day, { po: [], cn: [], poQty: 0, poV: 0, cnQty: 0, delayed: 0 });
      const d = m.get(e.day);
      if (e.type === 'po') { d.po.push(e); d.poQty += e.qty; d.poV += e.value; if (e.status === 'Delayed') d.delayed++; } else { d.cn.push(e); d.cnQty += e.qty; }
    }
    return m;
  }

  // ================================================================== Phase 3
  // ------------------------------------------------------------------ Replenishment
  /** SKUs for the order proposal.  due = at the reorder point: Stockout Risk / Reorder Now, or Stock + Open PO ≤ ROP
      suggest = every SKU with Suggested Qty > 0 · all = every row */
  function replenList(M, mode) {
    const due = r => r.skuStatus !== 'Discontinue' && r.skuStatus !== 'Clearance' && r.rrTot > 0 && (r.status === 'stockout' || r.status === 'reorder' || r.totalAll + r.openPO <= r.rop);   // CR-01 (F9): Clearance is never re-ordered
    return M.rows.filter(r => mode === 'all' ? true : mode === 'suggest' ? r.suggestedQty > 0 : due(r));
  }
  /** Weekly total stock (all channels, the filter's allocation) for the next 26 weeks — Base vs What-if chart. */
  function projWeekly(M, weeks) {
    const out = [];
    for (let k = 0; k <= (weeks || 26); k++) {
      let q = 0, v = 0;
      for (const r of M.rows) {
        const x = k === 0 ? r.totalSel : r._p.whA[7 * k - 1] * r.share + r._p.consSelA[7 * k - 1] + r._p.itSelA[7 * k - 1];   // CR-01: + in-transit
        q += x; v += x * r.cost;
      }
      out.push({ k, dn: M.asDn + 7 * k, qty: q, value: v });
    }
    return out;
  }

  // ------------------------------------------------------------------ Quota vs Actual
  /** Sales In / Sales Out of a calendar month, from the weekly rows (a week across two months is split by days).
      Only weeks before `until` count (the month of AS OF is month-to-date). Returns { si, so, days covered }. */
  function monthFlows(DB, i, mask, m0, until) {
    const m1 = Math.min(addMonths(m0, 1), until), nA = DB.accounts.length;
    let si = 0, so = 0;
    if (m1 <= m0) return { si, so, days: 0 };
    const w0 = Math.max(0, Math.floor((m0 - DB.startDn) / 7)), w1 = Math.min(DB.nWeeks - 1, Math.floor((m1 - 1 - DB.startDn) / 7));
    for (let w = w0; w <= w1; w++) {
      const ws = DB.startDn + 7 * w, ov = Math.min(ws + 7, m1) - Math.max(ws, m0);
      if (ov <= 0) continue;
      for (let j = 0; j < nA; j++) if (mask[j]) { si += DB.si[i][j][w] * ov / 7; so += DB.so[i][j][w] * ov / 7; }
    }
    return { si, so, days: m1 - m0 };
  }
  /** Quota of the days [a, b) — each month's quota spread evenly over its days (so a week or an MTD can be compared with it). */
  function quotaDays(DB, i, mask, a, b) {
    let q = 0;
    for (let m = monthStart(a); m < b; m = addMonths(m, 1)) {
      const arr = DB.quota[i].get(monthKey(m)); if (!arr) continue;
      const lo = Math.max(a, m), hi = Math.min(b, addMonths(m, 1)); if (hi <= lo) continue;
      let s = 0; for (let j = 0; j < arr.length; j++) if (mask[j]) s += arr[j];
      q += s * (hi - lo) / daysInMonth(m);
    }
    return q;
  }
  /** Quota analysis for the filter (selected accounts).
        Quota Achievement % = Sales In ÷ Quota (period, quota spread by day)
        Quota Fit %         = Quota of the AS OF month ÷ (Sell-out Run Rate × days in month) → > 120 ตั้งสูงเกิน · 80–120 เหมาะสม · < 80 ตั้งต่ำเกิน
        MAPE / Bias         = over the last `win` complete months, Quota vs actual Sales Out:
                              MAPE = Σ|Quota − Sales Out| ÷ Σ Sales Out (weighted by sales, so tiny SKUs do not dominate) · Bias = Σ(Quota − Sales Out) ÷ Σ Sales Out
        Supply Fill Rate %  = Sales In ÷ Quota in the SKU-months where WH ran short (lowest WH at a week start < one week of Sales In);
                              the quota not shipped is split into "Supply ไม่พอ" (short months) and "คู่ค้าไม่สั่ง" (WH had stock)
        Quota Coverage %    = (WH + PO arriving within the horizon) ÷ Quota of the horizon from AS OF (SKU, the filter's allocation)
      Pair class: over (Fit > 120) · supply (Fit ≤ 120 but the SKU is short: Stockout Risk or WH < 1 week of run rate) · under (Fit < 80) · ok */
  function quotaOf(DB, M, win) {
    const as = M.asDn, S = M.S, A = DB.accounts, nA = A.length, mask = M.mask, per = M.period;
    const cur = monthStart(as), dimCur = daysInMonth(as), hEnd = addMonths(as, M.h);
    const months = []; for (let k = win; k >= 1; k--) months.push(addMonths(cur, -k));
    const k = { si: 0, q: 0, absErr: 0, sumA: 0, sumQ: 0, fillSI: 0, fillQ: 0, shortSupply: 0, shortOrder: 0, constrained: 0 };
    const pairs = [], monthly = [];
    for (let m = -12; m <= 3; m++) {
      const m0 = addMonths(cur, m);
      if (m0 < DB.startDn) continue;                 // the data starts inside that month → a half month would look like a drop
      monthly.push({ m0, q: 0, si: 0, so: 0, qV: 0, siV: 0, soV: 0, mtd: m === 0, future: m > 0 });
    }
    for (const r of M.rows) {
      const i = r.i, c = r.cost;
      // period achievement
      const f = flowsSku(DB, i, per.p0, per.p1, mask, 1);
      k.si += f.si; k.q += quotaDays(DB, i, mask, per.p0, per.p1);
      // monthly series (quota of the MTD month spread to the days covered, so it compares like with like)
      for (const x of monthly) {
        const key = monthKey(x.m0), arr = DB.quota[i].get(key);
        let q = 0; if (arr) for (let j = 0; j < nA; j++) if (mask[j]) q += arr[j];
        if (x.future) { x.q += q; x.qV += q * c; continue; }
        const fl = monthFlows(DB, i, mask, x.m0, as);
        if (x.mtd) q = q * fl.days / daysInMonth(x.m0);
        x.q += q; x.qV += q * c; x.si += fl.si; x.so += fl.so; x.siV += fl.si * c; x.soV += fl.so * c;
      }
      // accuracy + supply fill over the window, per pair
      const pairAcc = new Map();
      for (const m0 of months) {
        const key = monthKey(m0), arr = DB.quota[i].get(key), m1 = addMonths(m0, 1);
        // was WH short this month? lowest WH at a week start vs one week of Sales In (all accounts)
        let whMin = Infinity; for (let d = firstMondayOnOrAfter(m0); d < m1 && d <= as; d += 7) whMin = Math.min(whMin, stockAt(DB, i, d).wh);
        const all = monthFlows(DB, i, new Uint8Array(nA).fill(1), m0, as);
        const short = isFinite(whMin) && all.si > 0 && whMin < all.si / (daysInMonth(m0) / 7);
        if (short) k.constrained++;
        for (let j = 0; j < nA; j++) {
          if (!mask[j]) continue;
          const q = arr ? arr[j] : 0, fl = monthFlows(DB, i, oneMask(nA, j), m0, as);
          if (q <= 0 && fl.so <= 0) continue;
          k.absErr += Math.abs(q - fl.so); k.sumA += fl.so; k.sumQ += q;
          const pa = pairAcc.get(j) || { abs: 0, a: 0, q: 0 }; pa.abs += Math.abs(q - fl.so); pa.a += fl.so; pa.q += q; pairAcc.set(j, pa);
          const gap = Math.max(0, q - fl.si);
          if (short) { k.fillSI += Math.min(fl.si, q); k.fillQ += q; k.shortSupply += gap; } else k.shortOrder += gap;
        }
      }
      // coverage (SKU): WH + PO within the horizon vs the quota of the horizon
      let po = 0; for (const p of DB.po[i]) if (p.status !== 'Cancelled' && (p.rec == null || p.rec >= as) && Math.max(p.eta ?? as, as) < hEnd) po += p.qty;
      const qH = quotaDays(DB, i, mask, as, hEnd), avail = r.wh * r.share + po * r.share;
      const coverage = qH > 0 ? avail / qH * 100 : null;
      const short = r.status === 'stockout' || r.wh < r.rrTot * 7;
      // pairs (AS OF month)
      const qa = DB.quota[i].get(monthKey(as)), opening = stockAt(DB, i, per.p0).cons;
      for (let j = 0; j < nA; j++) {
        if (!mask[j]) continue;
        const q = qa ? qa[j] : 0, rr = r.rr[j];
        const pf = flowsSku(DB, i, per.p0, per.p1, oneMask(nA, j), 1);
        if (q <= 0 && rr <= 0 && pf.si <= 0) continue;
        const exp = rr * dimCur, fit = exp > 0 && q > 0 ? q / exp * 100 : null;
        const qp = quotaDays(DB, i, oneMask(nA, j), per.p0, per.p1);
        const base = opening[j] + pf.si, st = A[j].is_consignment && base > 0 ? pf.so / base * 100 : null;
        const cls = fit == null ? 'nodata' : fit > S.fitHigh ? 'over' : short ? 'supply' : fit < S.fitLow ? 'under' : 'ok';
        const pa = pairAcc.get(j);
        pairs.push({ i, j, sku: r.sku, name: r.name, brand: r.brand, cost: c, acc: A[j].name, accId: A[j].account_id, channel: A[j].channel, consignment: A[j].is_consignment,
          quota: q, expected: exp, fit, cls, si: pf.si, so: pf.so, quotaPeriod: qp, ach: qp > 0 ? pf.si / qp * 100 : null, st, rem: r.cons[j], coverage, skuStatus: r.status,
          achMtd: (() => { const fm = monthFlows(DB, i, oneMask(nA, j), cur, as), qm = q * fm.days / dimCur; return qm > 0 ? fm.si / qm * 100 : null; })(),   // CR-01 F1
          mape: pa && pa.a > 0 ? pa.abs / pa.a * 100 : null, bias: pa && pa.a > 0 ? (pa.q - pa.a) / pa.a * 100 : null });
      }
    }
    const cnt = pairs.reduce((o, p) => (o[p.cls] = (o[p.cls] || 0) + 1, o), {});
    return { months, monthly, pairs, cnt,
      kpi: { achievement: k.q > 0 ? k.si / k.q * 100 : null, si: k.si, quota: k.q, mape: k.sumA > 0 ? k.absErr / k.sumA * 100 : null, bias: k.sumA > 0 ? (k.sumQ - k.sumA) / k.sumA * 100 : null,
        fillRate: k.fillQ > 0 ? k.fillSI / k.fillQ * 100 : null, shortSupply: k.shortSupply, shortOrder: k.shortOrder, constrained: k.constrained } };
  }
  /** Quota Achievement of a period only (for the report's "previous period" column). */
  /** CR-01 F1: Quota Achievement month-to-date at AS OF — the calendar month of AS OF, Sales In prorated by day, quota spread by day
      (the same numbers as the MTD point of the monthly series). The weekly figure swings because MT delivers every two weeks. */
  function achMtd(DB, rows, mask, as) {   // CR-01 F1
    const m0 = monthStart(as), dim = daysInMonth(as); let si = 0, q = 0;
    for (const r of rows) {
      const fl = monthFlows(DB, r.i, mask, m0, as), arr = DB.quota[r.i].get(monthKey(m0));
      let qq = 0; if (arr) for (let j = 0; j < arr.length; j++) if (mask[j]) qq += arr[j];
      si += fl.si; q += qq * fl.days / dim;
    }
    return q > 0 ? si / q * 100 : null;
  }
  function quotaAchievement(DB, rows, mask, a, b) {
    let si = 0, q = 0;
    for (const r of rows) { si += flowsSku(DB, r.i, a, b, mask, 1).si; q += quotaDays(DB, r.i, mask, a, b); }
    return q > 0 ? si / q * 100 : null;
  }

  // ------------------------------------------------------------------ Report
  /** Everything the Weekly / Monthly report shows, from the same functions as the pages. */
  function reportOf(DB, M) {
    const S = M.S, as = M.asDn, k = M.kpi, p = M.kpiPrev || {};
    const C = consignmentOf(DB, M.rows, as, M.period, M.mask, S);
    const Cp = M.rowsPrev ? consignmentOf(DB, M.rowsPrev, M.periodPrev.p1, M.periodPrev, M.mask, S) : null;
    const I = inboundOf(DB, M);
    const Mp = M.rowsPrev ? Object.assign({}, M, { asDn: M.periodPrev.p1, rows: M.rowsPrev, period: Object.assign({}, M.periodPrev, { view: M.period.view }) }) : null;
    const Ip = Mp ? inboundOf(DB, Mp) : null;
    const ach = achMtd(DB, M.rows, M.mask, as);                       // CR-01 F1: MTD …
    const achP = achMtd(DB, M.rows, M.mask, addMonths(as, -1));       // CR-01 F1: … vs MTD at the same day of the previous month
    const kpis = [
      { key: 'k_stock_value', cur: k.stockValue, prev: p.stockValue, kind: 'money', pol: 'none' },
      { key: 'k_doc', cur: k.doc, prev: p.doc, kind: 'days', pol: 'down' },
      { key: 'k_st', cur: k.sellThrough, prev: p.sellThrough, kind: 'pct', pol: 'up' },
      { key: 'k_stockout', cur: k.stockoutSku, prev: p.stockoutSku, kind: 'num', pol: 'down' },
      { key: 'k_risk', cur: k.riskValue, prev: p.riskValue, kind: 'money', pol: 'down' },
      { key: 'k_fit', cur: k.quotaFit, prev: p.quotaFit, kind: 'pct', pol: 'up' },
      { key: 'k_ach', cur: ach, prev: achP, kind: 'pct', pol: 'up' },
      { key: 'k_cons_value', cur: C.kpi.value, prev: Cp && Cp.kpi.value, kind: 'money', pol: 'none' },
      { key: 'k_recall', cur: C.kpi.recallV, prev: Cp && Cp.kpi.recallV, kind: 'money', pol: 'down' },
      { key: 'k_delay', cur: I.kpi.delayN, prev: Ip && Ip.kpi.delayN, kind: 'num', pol: 'down' },
      { key: 'k_ontime', cur: I.kpi.onTime, prev: I.kpi.onTimePrev, kind: 'pct', pol: 'up' }
    ];
    const top = n => l => l.slice(0, n);
    const excess = r => Math.max(0, (r.totalSel - r.rrSel * S.overstockDoc) * r.cost);
    return {
      kpis,
      stockout: top(8)(M.rows.filter(r => r.status === 'stockout' || r.status === 'reorder').sort((a, b) => (a.status === 'stockout' ? 0 : 1) - (b.status === 'stockout' ? 0 : 1) || (a.stockoutDn ?? 1e9) - (b.stockoutDn ?? 1e9))),
      expiry: top(8)(M.rows.filter(r => r.riskByH[2][1] > 0).sort((a, b) => b.riskByH[2][1] - a.riskByH[2][1])),
      overstock: top(8)(M.rows.filter(r => r.status === 'overstock').sort((a, b) => excess(b) - excess(a))).map(r => Object.assign(r, { excessV: excess(r) })),
      poSoon: I.po.filter(e => e.open && e.day < as + 30).sort((a, b) => a.day - b.day),
      cnPlan: I.cn.filter(e => e.open && e.day < addMonths(as, M.h)).sort((a, b) => a.day - b.day),
      recall: C.pairs.filter(x => x.recall).sort((a, b) => b.recall.value - a.recall.value).slice(0, 8),
      inbound: I.kpi
    };
  }

  /** CR-03 R1: weeks the account's sell-out data ends before AS OF (0 = up to date). */
  function staleWeeks(DB, j, asDn) { return DB.rrEndA ? Math.max(0, clamp(DB.wk(asDn), 0, DB.nWeeks) - DB.rrEndA[j]) : 0; }
  /** CR-03 R2: other_out in [a, b) for the rows / account mask (WH issues × the row's WH share), by type. */
  function otherOutOf(DB, rows, mask, a, b) {
    const out = { qty: 0, value: 0, byType: {}, n: 0 };
    for (const r of rows) for (const x of (DB.oo && DB.oo[r.i]) || []) {
      if (x.dn < a || x.dn >= b || (x.j >= 0 && !mask[x.j])) continue;
      const q = x.qty * (x.j < 0 ? (r.share ?? 1) : 1), t = out.byType[x.type] || (out.byType[x.type] = { qty: 0, value: 0, n: 0 });
      t.qty += q; t.value += q * r.cost; t.n++; out.qty += q; out.value += q * r.cost; out.n++;
    }
    return out;
  }

  // ================================================================== CR-03 (3C) R5 · early warning at the consignment accounts
  /** CR-03 R5: weeks between deliveries to an account — the per-account setting, else the default (A4). */
  function replenCycle(S, accId) { const m = (S && S.replenCycle) || {}; return +m[accId] > 0 ? +m[accId] : (+(S && S.replenCycleW) || DEFAULT_SETTINGS.replenCycleW); }
  /** CR-03: stock at the start of week w (w = nWeeks → the snapshot). */
  function stockStart(DB, i, w) { return w < DB.nWeeks ? weekStock(DB, i)[w] : ((DB._wkEnd || (DB._wkEnd = []))[i] || (DB._wkEnd[i] = stockAt(DB, i, DB.startDn + 7 * DB.nWeeks))); }
  /** CR-03 R5: early-warning measures per SKU × consignment account (selected accounts) at AS OF — pre-set thresholds only.
        WOS              = Remaining ÷ average weekly Sales Out of the last 4 weeks (up to the account's data end)
                           ≥ cycle × wosYellowX → yellow · ≥ cycle × wosRedX → red (stock and no sales = red)
        Reorder gap      = days since the pair's last Sales In week — pairs with a run rate · > cycle × reorderGapX weeks
        In-stock rate    = weeks of the last 13 with Remaining > 0 at the week start — pairs on sale (Sales In or quota in 26 weeks),
                           from the week after their first delivery · < inStockMin %
        Distribution gap = on sale, nothing left, no quota left this month and no open order (in transit / reserved SO)
        Swing            = |WOS − WOS a week earlier| > swingW weeks (no sales counts as 52)
        Sell-in vs sell-out = Σ Sales In − Σ Sales Out of 13 weeks > sisoGapW weeks of Sales Out → stock piling up at the account
      One alert per pair and type with a stable key "type|SKU|account" (the action log keeps one item per key until it is closed). */
  function earlyWarnOf(DB, rows, asDn, mask, S) {
    S = Object.assign({}, DEFAULT_SETTINGS, S || {});
    const A = DB.accounts, nA = A.length, wE = clamp(DB.wk(asDn), 0, DB.nWeeks), accs = A.filter(a => a.is_consignment && mask[a.j]).map(a => a.j);
    const mk = monthKey(asDn), m0 = monthStart(asDn), qMonths = [];
    for (let m = monthStart(asDn - 182); m <= m0; m = addMonths(m, 1)) qMonths.push(monthKey(m));
    const CAP = 52, pairs = [], alerts = [];
    const byAcc = new Map(accs.map(j => [j, { j, id: A[j].account_id, name: A[j].name, cycle: replenCycle(S, A[j].account_id), rem: 0, remV: 0, so4: 0, so4V: 0,
      inW: 0, allW: 0, n: 0, red: 0, yellow: 0, rgap: 0, instock: 0, dist: 0, swing: 0, accum: 0, siQ: 0, soQ: 0 }]));
    const wosOf = (rem, so4) => so4 > 0 ? rem / so4 : (rem > 0.5 ? Infinity : 0);
    for (const r of rows) {
      const i = r.i;
      for (const j of accs) {
        const acc = byAcc.get(j), cyc = acc.cycle, si = DB.si[i][j], cSO = DB.cumSO[i][j], cSI = DB.cumSI[i][j], id = A[j].account_id;
        const e = clamp(Math.min(wE, rrCap(DB, j) ?? wE), 0, wE), rem = r.cons[j];
        const qa = DB.quota[i].get(mk), q = qa ? qa[j] : 0;
        const onSale = cSI[wE] - cSI[Math.max(0, wE - 26)] > 0 || qMonths.some(k => { const x = DB.quota[i].get(k); return x && x[j] > 0; });
        if (!onSale && rem < 0.5) continue;                                     // not carried there
        const avg = (a, b) => b > a ? (cSO[b] - cSO[a]) / (b - a) : 0;
        const so4 = avg(Math.max(0, e - 4), e), wos = wosOf(rem, so4);
        const remP = wE >= 1 ? stockStart(DB, i, wE - 1).cons[j] : rem, wosP = wosOf(remP, avg(Math.max(0, e - 5), Math.max(0, e - 1)));
        const red = wos >= cyc * S.wosRedX && rem > 0.5, yellow = !red && wos >= cyc * S.wosYellowX && rem > 0.5;
        // reorder gap
        let lastSI = -1; for (let w = wE - 1; w >= 0; w--) if (si[w] > 0) { lastSI = w; break; }
        const rgapD = r.rr[j] > 0 ? (lastSI >= 0 ? asDn - (DB.startDn + 7 * lastSI) : Infinity) : null, rgap = rgapD != null && rgapD > cyc * S.reorderGapX * 7;
        // in-stock rate (13 weeks, from the week after the first delivery)
        let fSI = -1; for (let w = 0; w < wE; w++) if (si[w] > 0) { fSI = w; break; }
        let inW = 0, allW = 0;
        if (onSale) for (let w = Math.max(0, wE - 13, fSI + 1); w < wE; w++) { allW++; if (stockStart(DB, i, w).cons[j] > 0.5) inW++; }
        const instock = allW ? inW / allW * 100 : null, lowIn = instock != null && instock < S.inStockMin;
        // distribution gap: on sale · nothing left · no quota left · no open order
        const rs = DB.quotaRes[i].get(mk), cm = DB.quotaCom[i].get(mk), res = rs ? rs[j] : 0, com = cm ? cm[j] : 0;
        const left = rs || cm ? q - res - com : q - monthFlows(DB, i, oneMask(nA, j), m0, asDn).si;
        const open = res > 0.5 || (r.it ? r.it[j] > 0.5 : false), dist = onSale && rem < 0.5 && !(left > 0.5 || open);
        // swing · sell-in vs sell-out (13 weeks)
        const dW = (wos === Infinity && wosP === Infinity) ? 0 : Math.min(wos, CAP) - Math.min(wosP, CAP), swing = Math.abs(dW) > S.swingW;
        const siQ = cSI[wE] - cSI[Math.max(0, wE - 13)], soQ = cSO[e] - cSO[Math.max(0, e - 13)], wk13 = e - Math.max(0, e - 13), soW = wk13 ? soQ / wk13 : 0;
        const gapQ = siQ - soQ, accum = gapQ > 0.5 && (soW > 0 ? gapQ / soW > S.sisoGapW : true);
        const p = { i, j, key: i + '|' + j, sku: r.sku, name: r.name, cost: r.cost, acc: A[j].name, accId: id, cycle: cyc, onSale, rem, so4, wos, wosP, dWos: dW, lvl: red ? 'red' : yellow ? 'yellow' : 'ok',
          rgapD, rgap, inW, allW, instock, lowIn, quotaLeft: left, open, dist, swing, siQ, soQ, gapQ, gapV: gapQ * r.cost, gapW: soW > 0 ? gapQ / soW : null, accum };
        pairs.push(p);
        const add = (type, sev, val, thr) => alerts.push({ key: type + '|' + r.sku + '|' + id, type, sev, i, j, sku: r.sku, name: r.name, acc: A[j].name, accId: id, val, thr });
        if (red) add('wos', 'high', wos, cyc * S.wosRedX); else if (yellow) add('wos', 'medium', wos, cyc * S.wosYellowX);
        if (rgap) add('rgap', 'medium', rgapD, cyc * S.reorderGapX * 7);
        if (lowIn) add('instock', instock < S.inStockMin - 20 ? 'high' : 'medium', instock, S.inStockMin);
        if (dist) add('dist', 'high', 0, 0);
        if (swing) add('swing', 'low', dW, S.swingW);
        if (accum) add('accum', 'medium', p.gapW, S.sisoGapW);
        acc.n++; acc.rem += rem; acc.remV += rem * r.cost; acc.so4 += so4; acc.so4V += so4 * r.cost; acc.inW += inW; acc.allW += allW; acc.siQ += siQ; acc.soQ += soQ;
        if (red) acc.red++; if (yellow) acc.yellow++; if (rgap) acc.rgap++; if (lowIn) acc.instock++; if (dist) acc.dist++; if (swing) acc.swing++; if (accum) acc.accum++;
      }
    }
    const accList = [...byAcc.values()].map(a => Object.assign(a, { wos: a.so4V > 0 ? a.remV / a.so4V : null, instockRate: a.allW ? a.inW / a.allW * 100 : null }));
    const inW = accList.reduce((x, a) => x + a.inW, 0), allW = accList.reduce((x, a) => x + a.allW, 0), cnt = k => pairs.filter(p => p[k]).length;
    return { pairs, alerts, byAcc: accList, accs,
      kpi: { instock: allW ? inW / allW * 100 : null, inW, allW, red: pairs.filter(p => p.lvl === 'red').length, yellow: pairs.filter(p => p.lvl === 'yellow').length,
        rgap: cnt('rgap'), lowIn: cnt('lowIn'), dist: cnt('dist'), swing: cnt('swing'), accum: cnt('accum'), alerts: alerts.length, pairs: pairs.length } };
  }
  /** CR-03 R5: cumulative Sales In vs Sales Out over the 13 weeks before AS OF (accounts js, the rows) + WOS at each week end. */
  function ewSeriesOf(DB, rows, asDn, js) {
    const wE = clamp(DB.wk(asDn), 0, DB.nWeeks), out = [];
    let cSI = 0, cSO = 0;
    for (let w = Math.max(0, wE - 13); w < wE; w++) {
      let si = 0, so = 0, rem = 0, so4 = 0;
      for (const r of rows) {
        const st = stockStart(DB, r.i, w + 1);
        for (const j of js) {
          si += DB.si[r.i][j][w]; so += DB.so[r.i][j][w]; rem += st.cons[j];
          const c = DB.cumSO[r.i][j], e = Math.min(w + 1, rrCap(DB, j) ?? w + 1), b = Math.max(0, e - 4); so4 += e > b ? (c[e] - c[b]) / (e - b) : 0;
        }
      }
      cSI += si; cSO += so;
      out.push({ dn: DB.startDn + 7 * w, si, so, cumSI: cSI, cumSO: cSO, rem, wos: so4 > 0 ? rem / so4 : null });
    }
    return out;
  }

  // ================================================================== CR-03 (3C) R6 · Forecast Value Added
  /** CR-03 R6: does the Sales quota beat a naive forecast? (selected accounts · the rows of the model)
        Naive   = Run Rate L3M as at the first day of the month (without out-of-stock weeks when rrMode says so) × days in the month
        Actual  = Sales Out of the month · pair-months where the quota or the actual is above 0 (the same set as MAPE on this page)
        WAPE    = Σ|F − A| ÷ Σ A over the window (3 / 6 complete months) · FVA (pp) = WAPE(Naive) − WAPE(Quota) — positive: the quota is better
        Tracking signal (6 months) = Σ(Quota − A) ÷ MAD (mean |Quota − A|) · |TS| > tsLimit → set high / low every month
        negRun  = the pair's monthly FVA was below 0 in each of the last fvaNegM months → the next-month proposal starts from Naive
      Grouped by account, by Sales owner (Ops partner master) and by ABC-XYZ group. */
  function fvaOf(DB, M, win, S) {
    S = Object.assign({}, DEFAULT_SETTINGS, M.S || {}, S || {});
    const as = M.asDn, cur = monthStart(as), nA = DB.accounts.length, A = DB.accounts, nM = Math.max(win, 6, S.fvaNegM);
    const months = []; for (let k = nM; k >= 1; k--) { const m = addMonths(cur, -k); if (m >= DB.startDn) months.push(m); }
    const unc = S.rrMode === 'unconstrained', rrF = (i, j, d) => unc ? runRateU(DB, i, j, d, 'L3M', S) : runRate(DB, i, j, d, 'L3M');
    const nxt = addMonths(cur, 1), dimN = daysInMonth(nxt), lastW = months.slice(-win), last6 = months.slice(-6), lastNeg = months.slice(-S.fvaNegM);
    const pairs = [];
    for (const r of M.rows) {
      const i = r.i;
      for (let j = 0; j < nA; j++) {
        if (!M.mask[j]) continue;
        const pm = [];
        for (const m0 of months) {
          const qa = DB.quota[i].get(monthKey(m0)), q = qa ? qa[j] : 0, a = monthFlows(DB, i, oneMask(nA, j), m0, as).so;
          if (q <= 0 && a <= 0) continue;
          pm.push({ m0, q, a, n: rrF(i, j, m0) * daysInMonth(m0) });
        }
        if (!pm.length) continue;
        const sumOf = (list, f) => list.reduce((x, y) => x + f(y), 0), inW = pm.filter(x => lastW.includes(x.m0)), in6 = pm.filter(x => last6.includes(x.m0));
        const sa = sumOf(inW, x => x.a), absN = sumOf(inW, x => Math.abs(x.n - x.a)), absQ = sumOf(inW, x => Math.abs(x.q - x.a));
        const mad = in6.length ? sumOf(in6, x => Math.abs(x.q - x.a)) / in6.length : 0, ts = mad > 0 ? sumOf(in6, x => x.q - x.a) / mad : 0;
        const monthly = pm.map(x => ({ m0: x.m0, q: x.q, a: x.a, n: x.n, fva: x.a > 0 ? (Math.abs(x.n - x.a) - Math.abs(x.q - x.a)) / x.a * 100 : (Math.abs(x.n) - Math.abs(x.q) >= 0 ? 0 : -100) }));
        const negRun = lastNeg.length === S.fvaNegM && lastNeg.every(m => { const x = monthly.find(y => y.m0 === m); return x && x.fva < 0; });
        const wapeN = sa > 0 ? absN / sa * 100 : null, wapeQ = sa > 0 ? absQ / sa * 100 : null;
        pairs.push({ i, j, sku: r.sku, name: r.name, cost: r.cost, acc: A[j].name, accId: A[j].account_id, sales: A[j].sales || '—', group: r.cls ? r.cls.group : '—', channel: A[j].channel,
          sa, absN, absQ, wapeN, wapeQ, fva: wapeN != null ? wapeN - wapeQ : null, ts, mad, tsCls: ts > S.tsLimit ? 'high' : ts < -S.tsLimit ? 'low' : 'ok', n6: in6.length, monthly, negRun,
          naiveNext: rrF(i, j, as) * dimN });
      }
    }
    const agg = (list, keyF) => {
      const m = new Map();
      for (const p of list) {
        const k = keyF(p), g = m.get(k) || { key: k, n: 0, sa: 0, absN: 0, absQ: 0, high: 0, low: 0, neg: 0 };
        g.n++; g.sa += p.sa; g.absN += p.absN; g.absQ += p.absQ; if (p.tsCls === 'high') g.high++; if (p.tsCls === 'low') g.low++; if (p.negRun) g.neg++; m.set(k, g);
      }
      return [...m.values()].map(g => Object.assign(g, { wapeN: g.sa > 0 ? g.absN / g.sa * 100 : null, wapeQ: g.sa > 0 ? g.absQ / g.sa * 100 : null }))
        .map(g => Object.assign(g, { fva: g.wapeN != null ? g.wapeN - g.wapeQ : null }));
    };
    const total = agg(pairs, () => 'all')[0] || { n: 0, sa: 0, absN: 0, absQ: 0, wapeN: null, wapeQ: null, fva: null, high: 0, low: 0, neg: 0 };
    return { months: lastW, months6: last6, pairs, total, byAcc: agg(pairs, p => p.acc), bySales: agg(pairs, p => p.sales), byGroup: agg(pairs, p => p.group), next: monthKey(nxt) };
  }

  // ================================================================== CR-03 (3D) R7 · S&OP
  /** CR-03 R7: Pre-S&OP gap per SKU (every channel of the model rows) for month 1, 2, 3 from AS OF:
        Demand = the Sales In plan of the month — what WH has to ship (quota ÷ days for a consignment account with a quota, else its run rate)
        Supply = WH carried in (never below 0) + open PO arriving (ETA, Planned included) + CN Good coming back in the month
        Gap    = Supply − Demand (below 0 = short) · options for a short SKU: expedite an open PO due later · recall / move stock sitting at
                 an account (consignment recall list C) · adjust the quota (Fit above fitHigh) · otherwise order now
      Clearance / Discontinue SKUs are left out (never re-ordered). */
  function sopGapOf(DB, M, C) {
    const as = M.asDn, S = M.S, A = DB.accounts, nA = A.length, b = [0, 1, 2, 3].map(k => addMonths(as, k)), out = [], tot = [0, 1, 2].map(() => ({ short: 0, shortV: 0, n: 0 }));
    const recall = new Map(); if (C) for (const p of C.pairs) if (p.recall) { const l = recall.get(p.i) || []; l.push({ acc: p.acc, qty: p.recall.qty }); recall.set(p.i, l); }
    for (const r of M.rows) {
      if (r.skuStatus === 'Discontinue' || r.skuStatus === 'Clearance' || r.rrTot <= 0) continue;
      const i = r.i, months = []; let bal = Math.max(0, r.wh), first = -1;
      for (let k = 0; k < 3; k++) {
        let dem = 0, po = 0, cn = 0;
        for (let d = b[k]; d < b[k + 1]; d++) {
          const q = S.useQuotaForSalesIn ? DB.quota[i].get(monthKey(d)) : null, dim = daysInMonth(d);
          for (let j = 0; j < nA; j++) dem += A[j].is_consignment && q && q[j] > 0 ? q[j] / dim : r.rr[j];
        }
        for (const p of DB.po[i]) { if (p.status === 'Cancelled' || (p.rec != null && p.rec < as)) continue; const d = Math.max(p.eta ?? as, as); if (d >= b[k] && d < b[k + 1]) po += p.qty; }
        for (const c of DB.cn[i]) { if (!c.good || /cancel|reject/i.test(c.status) || (c.status === 'Received' && c.dn < as)) continue; const d = Math.max(c.dn, as); if (d >= b[k] && d < b[k + 1]) cn += c.qty; }
        const avail = bal + po + cn, gap = avail - dem;
        months.push({ k: k + 1, from: b[k], dem, po, cn, avail, gap });
        if (gap < -0.5) { if (first < 0) first = k; tot[k].short -= gap; tot[k].shortV -= gap * r.cost; tot[k].n++; }
        bal = Math.max(0, gap);
      }
      if (first < 0) continue;
      const later = DB.po[i].filter(p => p.status !== 'Cancelled' && p.status !== 'Received' && (p.rec == null || p.rec >= as) && Math.max(p.eta ?? as, as) >= b[first + 1]).sort((x, y) => (x.eta ?? 0) - (y.eta ?? 0))[0];
      const opts = [];
      if (later) opts.push({ key: 'expedite', po: later.po_no, eta: later.eta });
      for (const x of recall.get(i) || []) opts.push({ key: 'recall', acc: x.acc, qty: x.qty });
      if (r.quotaFit != null && r.quotaFit > S.fitHigh) opts.push({ key: 'quota', fit: r.quotaFit });
      if (!opts.length) opts.push({ key: 'order', qty: r.suggestedQty });
      out.push({ i, sku: r.sku, name: r.name, cost: r.cost, group: r.cls ? r.cls.group : '', first: first + 1, short: -Math.min(...months.map(m => Math.min(0, m.gap))), months, opts });
    }
    out.sort((x, y) => x.first - y.first || y.short * y.cost - x.short * x.cost);
    return { rows: out, tot, bounds: b };
  }
  /** CR-03 R7: what a closed plan cycle keeps — projection (month 1–6 Total), Stockout Date, status and safety stock per SKU,
      quota per SKU × account for the AS OF month and the next 3, and the open POs (no., SKU, qty, ETA, status). */
  function planSnapshotOf(DB, M) {
    const as = M.asDn, H = M.S.projectionDays, m0 = monthStart(as), quota = {}, po = {};
    const skus = M.rows.map(r => ({ sku: r.sku, proj: [1, 2, 3, 4, 5, 6].map(m => Math.round(r._p.totA[Math.min(H, addMonths(as, m) - as) - 1])), so: r.stockoutDn, st: r.status,
      ss: Math.round(r.safetyQty || 0), rr: Math.round(r.rrTot * 100) / 100, grp: r.cls ? r.cls.group : '' }));
    for (const r of M.rows) {
      for (let k = 0; k <= 3; k++) { const mk = monthKey(addMonths(m0, k)), q = DB.quota[r.i].get(mk); if (q) q.forEach((x, j) => { if (x > 0) quota[r.sku + '|' + DB.accounts[j].account_id + '|' + mk] = Math.round(x); }); }
      for (const p of DB.po[r.i]) if (p.status !== 'Cancelled' && (p.rec == null || p.rec >= as)) po[p.po_no] = { sku: r.sku, qty: p.qty, eta: p.eta, status: p.status };
    }
    return { asOf: as, skus, quota, po };
  }
  /** CR-03 R7: this cycle (a) vs the previous one (b) — Stockout Date moved more than `days` (or appeared / went away), quota changed, PO moved / added / gone. */
  function comparePlans(a, b, days) {
    const prev = new Map(b.skus.map(x => [x.sku, x])), so = [];
    for (const x of a.skus) {
      const y = prev.get(x.sku); if (!y) continue;
      if (x.so == null && y.so == null) continue;
      const d = x.so != null && y.so != null ? x.so - y.so : null;
      if (d == null || Math.abs(d) > days) so.push({ sku: x.sku, from: y.so, to: x.so, d, stFrom: y.st, stTo: x.st });
    }
    const keys = new Set(Object.keys(a.quota).concat(Object.keys(b.quota))), quota = [];
    for (const k of keys) { const f = b.quota[k] || 0, t2 = a.quota[k] || 0; if (f !== t2) { const [sku, acc, month] = k.split('|'); quota.push({ sku, acc, month, from: f, to: t2 }); } }
    const pk = new Set(Object.keys(a.po).concat(Object.keys(b.po))), po = [];
    for (const k of pk) {
      const x = a.po[k], y = b.po[k];
      if (x && y) { if (x.eta !== y.eta || x.qty !== y.qty) po.push({ po: k, sku: x.sku, kind: 'moved', from: y.eta, to: x.eta, d: x.eta != null && y.eta != null ? x.eta - y.eta : null, qty: x.qty, qtyFrom: y.qty }); }
      else if (x) po.push({ po: k, sku: x.sku, kind: 'added', to: x.eta, qty: x.qty });
      else po.push({ po: k, sku: y.sku, kind: 'gone', from: y.eta, qty: y.qty });
    }
    so.sort((p, q) => Math.abs(q.d ?? 1e9) - Math.abs(p.d ?? 1e9)); quota.sort((p, q) => Math.abs(q.to - q.from) - Math.abs(p.to - p.from)); po.sort((p, q) => Math.abs(q.d ?? 0) - Math.abs(p.d ?? 0));
    return { so, quota, po };
  }

  global.Calc = {
    trendOf, trendRate, autoPick, skuTrend, RR_BASES, TREND, AUTO_SET,   // CR-04 R8 / R9
    sopGapOf, planSnapshotOf, comparePlans,   // CR-03 (3D)
    earlyWarnOf, ewSeriesOf, replenCycle, fvaOf,   // CR-03 (3C)
    staleWeeks, otherOutOf,   // CR-03
    runRateU, oosOf, abcxyzOf, leadTimeOf, zOf, safetyStatOf, soWeeksOf, rrCap, CR3_GROUPS, LEGACY_METHODS,   // CR-03 (3B)
    replenList, projWeekly, monthFlows, quotaDays, quotaOf, quotaAchievement, achMtd, reportOf,   // CR-01 F1: + achMtd
    DEFAULT_SETTINGS, STATUS_ORDER, DAY, AGING,
    expiryLots, agingOf, expiryHeat, consignmentOf, periodsBack, consignSeries, poStatusAt, cnStatusAt, inboundOf, eventsByDay, bestOutlet,
    dn, iso, monday, addMonths, monthKey, monthStart, daysInMonth, firstMondayOnOrAfter,
    prepare, stockAt, itAt, runRate, lotsAt, expiryRisk, projectSku, skuRow, recommend, periodOf, flowsSku,   // CR-01: + itAt
    computeModel, kpisOf, seriesOf, waterfallOf, actionList, selfCheck, modelCheck, skuDetail, accountMask
  };
})(typeof window !== 'undefined' ? window : globalThis);
