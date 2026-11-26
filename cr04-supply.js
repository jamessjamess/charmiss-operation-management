/* cr04-supply.js — CR-04 on the Supply pages (display only — every number comes from the existing Calc functions)
   R10 lost-sales wording · R12 ABC-XYZ in words + 3 × 3 matrix · R11 VIEW BY / Horizon only where they act · R8 one "forecast method" chip
   · R7 SKU typeahead (code / old Ops code / barcode / partner code / name) + SKU 360 + Portfolio (฿ only + SKUs at risk per week) · R9 trend shown */
(function () {
const St = window.St, U = window.U;
I18N.add({
 c_lost: 'ยอดขายที่เสียโอกาส (ของขาด) · 4 สัปดาห์ล่าสุด', col_lost13: 'ยอดขายที่เสียโอกาส (ของขาด) 13W', sop_lost: 'ยอดขายที่เสียโอกาส (ของขาด)', wi_lost: 'ยอดขายที่เสียโอกาส (ของขาด) ภายใน {h}',
 dr_oos_sum: 'ของขาด {n} จาก 13 สัปดาห์ · ยอดขายที่เสียโอกาส (ของขาด) 13W {v} ({q} ชิ้น)', oos_tip: 'สัปดาห์ที่ของขาด ใน 13 สัปดาห์ก่อน AS OF (ฝากขาย: Remaining หมดตอนต้นหรือก่อนสิ้นสัปดาห์ · ขายขาด: WH พร้อมขายหมด) — ยอดที่ขายไม่ได้ = ยอดขายที่เสียโอกาส (ของขาด)',
 lost_how: 'ประมาณจาก ยอดขายเฉลี่ยช่วงที่มีของ × วันที่ของหมด · ไม่รวมโอกาสด้านอื่น (ราคา การวางสินค้า โปรโมชั่น)', lost_at_acc: 'ขาดที่คู่ค้า', lost_at_acc_do: 'เติมของ / ปรับ Quota', lost_at_wh: 'ขาดที่คลังเรา', lost_at_wh_do: 'สั่งผลิต / เร่ง PO', lost_pcs: 'ชิ้น',
 abc_A: 'ขายหลัก', abc_B: 'ขายรอง', abc_C: 'ขายน้อย', xyz_X: 'สม่ำเสมอ', xyz_Y: 'แกว่ง', xyz_Z: 'ไม่แน่นอน', abcS_A: 'หลัก', abcS_B: 'รอง', abcS_C: 'น้อย', grp_N: 'สินค้าใหม่', grp_E: 'เลิกขาย / เคลียร์',
 grp_cons: 'เป้าระดับบริการ {sl}% · Safety Stock {ss} · ทบทวน{rv}', ss_hi: 'สูง', ss_mid: 'กลาง', ss_lo: 'ต่ำ', ss_none: 'ไม่มี', rv_w: 'ทุกสัปดาห์', rv_2w: 'ทุก 2 สัปดาห์', rv_m: 'ทุกเดือน', rv_no: 'เมื่อเคลียร์หมด (ไม่สั่งเพิ่ม)',
 f_grp: 'กลุ่มสินค้า (ความสำคัญ × ความแน่นอน)', grp_all: 'ทุกกลุ่มสินค้า', mx_title: 'กลุ่มสินค้า: ความสำคัญ × ความแน่นอน', mx_tip: 'แถว = ความสำคัญ (ABC จากมูลค่า Sales Out 52 สัปดาห์) · คอลัมน์ = ความแน่นอนของยอด (XYZ จาก CV) · แต่ละช่อง: จำนวน SKU · มูลค่า Stock · เป้าระดับบริการ — กดช่องเพื่อกรอง',
 mx_sku: '{n} SKU', mx_other: 'สินค้าใหม่ {n} · เลิกขาย / เคลียร์ {e}', mx_filtered: 'กรองกลุ่ม {g}',
 f_h: 'ดูความเสี่ยงภายใน', h_changes: 'ตัวเลขที่เปลี่ยนเมื่อเลือก: {x}', v_changes: 'ตัวเลขที่เปลี่ยนเมื่อเลือก: {x}',
 hx_overview: 'At-risk หมดอายุ (การ์ด + Waterfall) · ช่วงของกราฟ Projection', hx_expiry: 'At-risk ภายในช่วงที่เลือก · ไฮไลต์คอลัมน์', hx_calendar: 'PO / CN ภายในช่วงที่เลือก', hx_quota: 'Coverage (ครอบคลุม Quota ภายในช่วงที่เลือก)',
 vx_overview: 'Sales Out ของงวด · Sell-through · Δ เทียบงวดก่อน · Waterfall', vx_consign: 'Sell-through · Sales Out ของงวด · Δ เทียบงวดก่อน', vx_quota: 'Quota Achievement ของงวด · Sell-through', vx_report: 'ตัวเลขของงวดในรายงาน (สัปดาห์ / เดือน)',
 fc_chip: 'คาดการณ์: {m}', fc_skip: 'ไม่นับช่วงของขาด', fc_title: 'วิธีคาดการณ์ยอดขาย', fc_rr: 'ยอดขายเฉลี่ย (Run Rate)', fc_unit: 'ชิ้น / สัปดาห์', fc_default: 'ค่าเริ่มต้นของบริษัทตั้งที่หน้า ข้อมูล & ตั้งค่า Supply',
 fc_L4W: 'ล่าสุด 4 สัปดาห์', fc_L3M: 'เฉลี่ย 3 เดือน', fc_L6M: 'เฉลี่ย 6 เดือน', fc_W: 'ผสม 50 / 30 / 20', fc_TR: 'แนวโน้ม (Trend)', fc_AUTO: 'อัตโนมัติ (เลือกวิธีที่แม่นที่สุดต่อ SKU)',
 fcd_L4W: 'ไวต่อการเปลี่ยนแปลง', fcd_L3M: 'สมดุล', fcd_L6M: 'นิ่ง เหมาะกับสินค้าขายสม่ำเสมอ', fcd_W: 'ถ่วงน้ำหนัก 4 สัปดาห์ / 3 เดือน / 6 เดือน', fcd_TR: 'เส้นแนวโน้ม 26 สัปดาห์ ค่อยๆ หน่วง (φ 0.95) ไม่ติดลบ เพดาน ±50%', fcd_AUTO: 'ทดสอบย้อนหลัง 8 จุด เลือกวิธี WAPE ต่ำสุด',
 fc_skipd: 'สัปดาห์ที่ของขาด (คู่ค้า / คลัง) ไม่นำมาเฉลี่ย', fc_example: 'ตัวอย่างจาก SKU จริง: {s}', fc_inuse: 'ใช้อยู่', fc_apply: 'ใช้วิธีนี้', fc_short: 'ข้อมูลไม่พอ', fc_wape: 'WAPE ย้อนหลัง', fc_picked: 'อัตโนมัติเลือก: {m}',
 col_trend: 'แนวโน้ม / เดือน', tr_down: 'ขาลงต่อเนื่อง', tr_tip: 'แนวโน้ม 26 สัปดาห์ {p}% ต่อเดือน · R² {r}', sopT_trend: 'ขาลงต่อเนื่อง',
 ta_hint: 'พิมพ์รหัส Supply · รหัส Ops เดิม · Barcode · รหัสคู่ค้า · ชื่อ', ta_one: 'เลือก 1 SKU', ta_all: 'กรองทุก SKU ที่ตรง “{q}” ({n})', ta_via_alias: 'รหัส Ops เดิม {c}', ta_via_barcode: 'Barcode {c}', ta_via_partner: 'รหัสคู่ค้า {c}', ta_none: 'ไม่พบ SKU',
 s360: 'SKU 360', s360_q: 'ภาพเดียวของ SKU นี้ — Projection รายสัปดาห์ · ROP / Safety Stock · ต่อคู่ค้า · Lot · ข้อเสนอ', s360_back: 'กลับภาพรวมหลาย SKU', s360_methods: 'ยอดขายเฉลี่ยตามแต่ละวิธี', s360_props: 'ข้อเสนอที่เกี่ยวข้อง', s360_none: 'ไม่มีข้อเสนอของ SKU นี้', s360_link: 'ดู SKU นี้',
 pf_title: 'จำนวน SKU ที่คาดว่าจะขาด / ต่ำกว่า ROP รายสัปดาห์', pf_tip: '26 สัปดาห์ข้างหน้า จาก Projection ของแต่ละ SKU (projectSku เดิม) — กดแท่งเพื่อดูรายชื่อ', pf_out: 'คาดว่าจะขาด', pf_rop: 'ต่ำกว่า ROP', pf_week: 'สัปดาห์ {d}', pf_list: 'SKU ในสัปดาห์ {d}', pf_valueonly: 'หลาย SKU แสดงเป็น ฿ เท่านั้น — เลือก 1 SKU เพื่อดูเป็นชิ้น'
}, {
 c_lost: 'Lost sales (stock-out) · last 4 weeks', col_lost13: 'Lost sales (stock-out) 13W', sop_lost: 'Lost sales (stock-out)', wi_lost: 'Lost sales (stock-out) within {h}',
 dr_oos_sum: 'Out of stock {n} of 13 weeks · lost sales (stock-out) 13W {v} ({q} units)',
 lost_how: 'Estimated as the in-stock sales rate × days out of stock · other lost opportunities (price, shelf, promotion) are not included', lost_at_acc: 'Out at the account', lost_at_acc_do: 'refill / adjust quota', lost_at_wh: 'Out in our warehouse', lost_at_wh_do: 'order production / expedite PO', lost_pcs: 'units',
 abc_A: 'Top seller', abc_B: 'Mid seller', abc_C: 'Low seller', xyz_X: 'steady', xyz_Y: 'variable', xyz_Z: 'erratic', abcS_A: 'Top', abcS_B: 'Mid', abcS_C: 'Low', grp_N: 'New product', grp_E: 'Clearance',
 grp_cons: 'Service level {sl}% · safety stock {ss} · review {rv}', ss_hi: 'high', ss_mid: 'medium', ss_lo: 'low', ss_none: 'none', rv_w: 'weekly', rv_2w: 'every 2 weeks', rv_m: 'monthly', rv_no: 'until cleared (no reorder)',
 f_grp: 'Product group (importance × predictability)', grp_all: 'All product groups', mx_title: 'Product groups: importance × predictability', mx_tip: 'Rows = importance (ABC on 52-week Sales Out value) · columns = predictability (XYZ on CV) · each cell: SKUs · stock value · service level — click a cell to filter',
 mx_sku: '{n} SKUs', mx_other: 'New {n} · clearance {e}', mx_filtered: 'Group {g}',
 f_h: 'Risk within', h_changes: 'Numbers that change: {x}', v_changes: 'Numbers that change: {x}',
 hx_overview: 'Expiry at risk (card + waterfall) · projection range', hx_expiry: 'At risk within the range · highlighted column', hx_calendar: 'PO / CN within the range', hx_quota: 'Coverage (quota covered within the range)',
 vx_overview: 'Sales Out of the period · sell-through · Δ vs previous · waterfall', vx_consign: 'Sell-through · Sales Out of the period · Δ vs previous', vx_quota: 'Quota achievement of the period · sell-through', vx_report: 'Period figures in the report (week / month)',
 fc_chip: 'Forecast: {m}', fc_skip: 'skip out-of-stock weeks', fc_title: 'Sales forecast method', fc_rr: 'Average sales (run rate)', fc_unit: 'units / week', fc_default: 'The company default is set on Data & Supply settings',
 fc_L4W: 'Last 4 weeks', fc_L3M: '3-month average', fc_L6M: '6-month average', fc_W: 'Blend 50 / 30 / 20', fc_TR: 'Trend', fc_AUTO: 'Automatic (most accurate per SKU)',
 fcd_L4W: 'reacts fast', fcd_L3M: 'balanced', fcd_L6M: 'stable, for steady sellers', fcd_W: 'weighted 4 weeks / 3 months / 6 months', fcd_TR: '26-week trend, damped (φ 0.95), never negative, capped ±50%', fcd_AUTO: 'back-tests 8 points, keeps the lowest WAPE',
 fc_skipd: 'weeks out of stock (account / warehouse) are left out of the average', fc_example: 'Example from a real SKU: {s}', fc_inuse: 'in use', fc_apply: 'Use this method', fc_short: 'not enough data', fc_wape: 'back-test WAPE', fc_picked: 'Automatic picked: {m}',
 col_trend: 'Trend / month', tr_down: 'Declining', tr_tip: '26-week trend {p}% per month · R² {r}', sopT_trend: 'Declining trend',
 ta_hint: 'Type a Supply code · old Ops code · barcode · partner code · name', ta_one: 'Focus 1 SKU', ta_all: 'Filter every SKU matching “{q}” ({n})', ta_via_alias: 'old Ops code {c}', ta_via_barcode: 'barcode {c}', ta_via_partner: 'partner code {c}', ta_none: 'No SKU found',
 s360: 'SKU 360', s360_q: 'One view of this SKU — weekly projection · ROP / safety stock · by account · lots · proposals', s360_back: 'Back to the portfolio', s360_methods: 'Run rate by method', s360_props: 'Related proposals', s360_none: 'No proposal for this SKU', s360_link: 'View this SKU',
 pf_title: 'SKUs expected out / below ROP per week', pf_tip: 'The next 26 weeks, from each SKU’s projection (projectSku) — click a bar for the list', pf_out: 'Expected out', pf_rop: 'Below ROP', pf_week: 'week of {d}', pf_list: 'SKUs in the week of {d}', pf_valueonly: 'Several SKUs show in ฿ only — focus 1 SKU for units'
});
I18N.add({ col_rr: 'ยอดขายเฉลี่ย (Run Rate)', rr_L4W: 'ล่าสุด 4 สัปดาห์ (L4W)', rr_L3M: 'เฉลี่ย 3 เดือน (L3M)', rr_L6M: 'เฉลี่ย 6 เดือน (L6M)', rr_W: 'ผสม 50 / 30 / 20', rr_TR: 'แนวโน้ม (Trend)', rr_AUTO: 'อัตโนมัติ', tr_pm: 'ต่อเดือน' },
 { col_rr: 'Average sales (run rate)', rr_L4W: 'Last 4 weeks (L4W)', rr_L3M: '3-month average (L3M)', rr_L6M: '6-month average (L6M)', rr_W: 'Blend 50 / 30 / 20', rr_TR: 'Trend', rr_AUTO: 'Automatic', tr_pm: 'per month' });   // R8 names
Object.assign(dict.th, { sopT_trend: 'ขาลงต่อเนื่อง · ทบทวนการสั่งผลิต / พิจารณาเรียกคืน' }); Object.assign(dict.en, { sopT_trend: 'Declining trend · review production / consider a recall' });

const App = window.App, Pages = window.Pages, Calc = window.Calc;
const VIEW_PAGES = ['overview', 'consign', 'quota', 'report'], H_PAGES = ['overview', 'expiry', 'calendar', 'quota'];
const RR_PAGES = ['overview', 'stock', 'expiry', 'consign', 'calendar', 'replen', 'quota', 'report'];

/* ---------------------------------------------------------------- R12 · ABC-XYZ in words */
const SS_LV = sl => sl <= 0 ? 'ss_none' : sl >= 97 ? 'ss_hi' : sl >= 93 ? 'ss_mid' : 'ss_lo', RV = g => g === 'E' ? 'rv_no' : g[0] === 'A' || g === 'N' ? 'rv_w' : g[0] === 'B' ? 'rv_2w' : 'rv_m';
function grpWords(g, short) { if (!g) return ''; if (g === 'N' || g === 'E') return St('grp_' + g); return (short ? St('abcS_' + g[0]) + '·' : St('abc_' + g[0]) + ' · ') + St('xyz_' + g[1]); }
function grpCons(g) { const sl = +(App.S['sl_' + g] ?? Calc.DEFAULT_SETTINGS['sl_' + g] ?? 0); return St('grp_cons', { sl: U.n(sl), ss: St(SS_LV(sl)), rv: St(RV(g)) }); }
const grpBadgeBefore = Pages.grpBadge;
Pages.grpBadge = r => {
  const c = r && r.cls; if (!c || !c.group) return '';
  const old = grpBadgeBefore(r), tip = (old.match(/title="([^"]*)"/) || [, ''])[1];
  return `<span class="grp g-${c.group[0]} grp-w" title="${c.group} · ${U.esc(grpCons(c.group))} · ${tip}" data-grp="${c.group}"><span class="gl">${U.esc(grpWords(c.group))}</span><span class="gs">${U.esc(grpWords(c.group, true))}</span></span>`;
};
const GRP_OPTS = ['', 'A', 'B', 'C', 'X', 'Y', 'Z', 'AX', 'AY', 'AZ', 'BX', 'BY', 'BZ', 'CX', 'CY', 'CZ', 'N', 'E'];
const grpOptLabel = g => !g ? St('grp_all') : g.length === 2 ? grpWords(g) + ' (' + g + ')' : 'ABC'.includes(g) ? St('abc_' + g) + ' (' + g + ')' : 'XYZ'.includes(g) ? St('xyz_' + g) + ' (' + g + ')' : St('grp_' + g) + ' (' + g + ')';
Pages.grpSelect = (id, cur) => `<select class="ctl grp-sel" id="${id}" aria-label="${U.esc(St('f_grp'))}" title="${U.esc(St('f_grp'))}">${GRP_OPTS.map(g => `<option value="${g}" ${g === (cur || '') ? 'selected' : ''}>${U.esc(grpOptLabel(g))}</option>`).join('')}</select>`;
/** the 3 × 3 matrix — SKUs / stock value / service level per cell · Σ cells = SKUs in A–C */
Pages.abcMatrix = (M, where, cur) => {
  const cell = {}; let nN = 0, nE = 0;
  for (const r of M.rows) { const g = r.cls && r.cls.group; if (!g) continue; if (g === 'N') { nN++; continue; } if (g === 'E') { nE++; continue; } const x = cell[g] || (cell[g] = { n: 0, v: 0 }); x.n++; x.v += r.totalSel * r.cost; }
  const tot = Object.values(cell).reduce((s, x) => s + x.n, 0);
  return `<section class="card abc-mx" id="card-abcmx" data-mx-where="${where}"><div class="card-head"><h3>${St('mx_title')} ${U.info(St('mx_tip'))}</h3><span class="muted small">${St('mx_sku', { n: U.n(tot) })}${cur ? ' · ' + St('mx_filtered', { g: cur }) : ''}</span></div>
    <div class="mx-grid" role="grid"><span></span>${'XYZ'.split('').map(z => `<span class="mx-h">${St('xyz_' + z)} <small>${z}</small></span>`).join('')}
    ${'ABC'.split('').map(a => `<span class="mx-h mx-r">${St('abc_' + a)} <small>${a}</small></span>${'XYZ'.split('').map(z => { const g = a + z, x = cell[g] || { n: 0, v: 0 }, sl = +(App.S['sl_' + g] ?? 0);
      return `<button type="button" class="mx-c g-${a}${cur === g ? ' on' : ''}" data-mx="${g}" data-mx-n="${x.n}" title="${U.esc(grpWords(g) + ' · ' + grpCons(g))}"><b>${St('mx_sku', { n: U.n(x.n) })}</b><span>${U.money(x.v)}</span><small>SL ${U.n(sl)}%</small></button>`; }).join('')}`).join('')}</div>
    <div class="small muted" style="margin-top:6px">${St('mx_other', { n: U.n(nN), e: U.n(nE) })}</div></section>`;
};
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-mx]'); if (!b) return;
  const where = b.closest('[data-mx-where]')?.dataset.mxWhere, g = b.dataset.mx;
  if (where === 'replen') { App.ui.rpGrp = App.ui.rpGrp === g ? '' : g; App.rerender(); return; }
  App.ui.grp = g; App.go('stock');
});

/* ---------------------------------------------------------------- R8 · one forecast-method chip (rr + rm) · R11 · VIEW BY / Horizon only where they act */
const fcName = F => St('fc_' + (F.rr || 'L4W')) + ((F.rm || App.S.rrMode) === 'unconstrained' ? ' · ' + St('fc_skip') : '');
const pageHeadBefore = Pages.pageHead;
Pages.pageHead = function (M, titleKey, qKey, right) {
  let h = pageHeadBefore.call(this, M, titleKey, qKey, right);
  if (titleKey === 's360') h = h.replace('<div class="pagehead">', '<div class="pagehead keep-title">');   // CR-05: SKU 360 keeps its own title
  const pg = App.page, chip = RR_PAGES.includes(pg) ? `<button type="button" class="fc-chip" data-fc-open="1" aria-haspopup="dialog">${U.esc(St('fc_chip', { m: fcName(App.F) }))} ▾</button>` : '';
  h = h.replace(/Run Rate <b>[^<]*<\/b>/, chip || '');
  if (!H_PAGES.includes(pg)) h = h.replace(/<span class="dotsep">·<\/span>[^<]*<b>\d+M<\/b>/, ''); else h = h.replace(/(<span class="dotsep">·<\/span>)[^<]*(<b>\d+M<\/b>)/, `$1${U.esc(St('f_h'))} $2`);
  if (!VIEW_PAGES.includes(pg)) h = h.replace(/<div class="perchip">[^<]*<span class="dotsep">·<\/span>/, '<div class="perchip">');
  return h;
};
function fcExample(M) {
  const r = (Calc.skuIdxFocus != null && M.rows.find(x => x.i === Calc.skuIdxFocus)) || M.rows.slice().sort((a, b) => b.rrSel - a.rrSel)[0]; if (!r) return null;
  const DB = App.DB, u = (App.F.rm || App.S.rrMode) === 'unconstrained', S = M.S;
  const rate = b => { let x = 0; for (let j = 0; j < DB.accounts.length; j++) if (M.mask[j]) x += u ? Calc.runRateU(DB, r.i, j, M.asDn, b, S) : Calc.runRate(DB, r.i, j, M.asDn, b); return x * 7; };
  return { r, rows: Calc.RR_BASES.map(b => ({ b, w: rate(b) })), auto: Calc.autoPick(DB, r.i, M.asDn, S, u) };
}
function fcMethodsTable(M, X, cur) {
  return `<table class="fc-tbl"><thead><tr><th>${St('fc_title')}</th><th class="num">${St('fc_unit')}</th>${X.auto ? `<th class="num">${St('fc_wape')}</th>` : ''}</tr></thead><tbody>${X.rows.map(x => `<tr class="${x.b === cur ? 'on' : ''}"><td>${U.esc(St('fc_' + x.b))}${x.b === cur ? ` <span class="pill ok">${St('fc_inuse')}</span>` : ''}${x.b === 'AUTO' ? `<div class="small muted">${St('fc_picked', { m: St('fc_' + X.auto.pick) })}</div>` : ''}</td><td class="num">${U.n(x.w, 1)}</td>${X.auto ? `<td class="num">${X.auto.wape[x.b] != null ? U.n(X.auto.wape[x.b], 1) + '%' : '—'}</td>` : ''}</tr>`).join('')}</tbody></table>`;
}
function fcOpen(anchor) {
  if (typeof cr4PopClose === 'function') cr4PopClose();
  const M = App.model(), X = fcExample(M), cur = App.F.rr || 'L4W', u = (App.F.rm || App.S.rrMode) === 'unconstrained', el = cr4PopEl();
  el.className = 'cr4pop fc-pop';
  el.innerHTML = `<div class="ofb-pophead"><b>${St('fc_title')}</b><button type="button" data-drp-close="1" aria-label="${U.esc(t('close'))}">×</button></div>
    <div class="fc-list">${Calc.RR_BASES.map(b => `<label class="fc-opt"><input type="radio" name="fcM" value="${b}" ${b === cur ? 'checked' : ''}><span><b>${U.esc(St('fc_' + b))}</b><small>${U.esc(St('fcd_' + b))}</small></span></label>`).join('')}</div>
    <label class="fc-opt fc-skip"><input type="checkbox" id="fcSkip" ${u ? 'checked' : ''}><span><b>${St('fc_skip')}</b><small>${St('fc_skipd')}</small></span></label>
    ${X ? `<div class="fc-ex"><div class="small muted">${U.esc(St('fc_example', { s: X.r.sku + ' · ' + X.r.name }))}</div>${fcMethodsTable(M, X, cur)}</div>` : ''}
    <div class="small muted">${St('fc_default')}</div><div class="drp-foot"><button type="button" class="primary" data-fc-apply="1">${St('fc_apply')}</button></div>`;
  cr4PopPlace(el, ofbMobile() ? null : anchor, ofbMobile());
}
document.addEventListener('click', e => {
  const o = e.target.closest && e.target.closest('[data-fc-open],[data-fc-apply]'); if (!o) return;
  if (o.dataset.fcOpen) { fcOpen(o); return; }
  const m = document.querySelector('#cr4Pop input[name="fcM"]:checked')?.value || App.F.rr, sk = document.querySelector('#fcSkip')?.checked;
  cr4PopClose(); App.setF({ rr: m, rm: sk ? 'unconstrained' : 'sellout' });
});
/* the filter bar fields: hide what does not act on this page (values stay in the URL) + an (i) naming what changes */
function tidyFbar() {
  const root = document.getElementById('supRoot'), fb = document.getElementById('fbar'); if (!root || !fb) return;
  const pg = App.page; root.dataset.page = pg;
  const hF = fb.querySelector('#fH')?.closest('.fld'), vF = fb.querySelector('#fView')?.closest('.fld');
  if (hF) { const l = hF.querySelector('.lbl'); if (l) l.innerHTML = U.esc(St('f_h')) + (H_PAGES.includes(pg) ? ' ' + U.info(St('h_changes', { x: St('hx_' + pg) })) : ''); }
  if (vF) { const l = vF.querySelector('.lbl'); if (l) l.innerHTML = U.esc(St('f_view')) + (VIEW_PAGES.includes(pg) ? ' ' + U.info(St('v_changes', { x: St('vx_' + pg) })) : ''); }
  const rrSel = fb.querySelector('#fRR'); if (rrSel && !rrSel.querySelector('option[value="TR"]')) ['TR', 'AUTO'].forEach(k => rrSel.insertAdjacentHTML('beforeend', `<option value="${k}">${U.esc(St('fc_' + k))}</option>`));
  if (rrSel) rrSel.value = App.F.rr;
  const q = fb.querySelector('#fQ'); if (q && !q.dataset.ta) taAttach(q);
  // I10: AS OF through the same date picker (DD MMM YYYY) — the input stays (hidden) so the Supply handlers still read ISO
  const asof = fb.querySelector('#fAsof');
  if (asof) { if (!asof.dataset.cr4Date) { asof.dataset.cr4Date = '1'; asof.type = 'hidden'; const b = document.createElement('button'); b.type = 'button'; b.className = 'ctl ofb-datein asof-btn'; b.dataset.drpInput = '1'; b.setAttribute('aria-label', St('f_asof')); asof.after(b); b._inp = asof; }
    const b = asof.nextElementSibling; if (b && b.dataset.drpInput) b.textContent = '📅 ' + fmtDate(asof.value); }
}

/* ---------------------------------------------------------------- R7 · SKU typeahead + SKU 360 + Portfolio */
let taIdx = null, taKey = '';
function taIndex() {
  const DB = App.DB; if (!DB) return [];
  const key = App.feedKey + '|' + (db.productMaster || []).length + '|' + JSON.stringify(db.soIntakeConfig || {}).length; if (taIdx && taKey === key) return taIdx;
  const alias = typeof SUP_SKU_ALIAS !== 'undefined' ? SUP_SKU_ALIAS : {}, pm = db.productMaster || [];
  taIdx = DB.skus.map(s => {
    const via = [];
    Object.entries(alias).forEach(([o, n]) => { if (n === s.sku) via.push(['alias', o]); });
    pm.filter(p => p.sku === s.sku && p.barcode).forEach(p => via.push(['barcode', String(p.barcode)]));
    Object.values(db.soIntakeConfig || {}).forEach(c => Object.entries(c.map || {}).forEach(([code, sku]) => { if (sku === s.sku) via.push(['partner', code]); }));
    s.alt = via.map(v => v[1].toLowerCase()).join(' ');   // the model's search also matches these (calc.js)
    return { s, via, text: (s.sku + ' ' + s.name + ' ' + s.alt).toLowerCase() };
  });
  taKey = key; return taIdx;
}
function taMatches(q) { q = q.toLowerCase().trim(); if (!q) return []; return taIndex().filter(x => x.text.includes(q)); }
function taAttach(q) {
  q.dataset.ta = '1'; q.setAttribute('placeholder', St('ta_hint')); q.setAttribute('autocomplete', 'off');
  const box = document.createElement('div'); box.className = 'ta-box hidden'; box.setAttribute('role', 'listbox'); q.parentElement.style.position = 'relative'; q.after(box);
  const show = () => {
    const v = q.value.trim(), L = taMatches(v); if (!v) { box.classList.add('hidden'); return; }
    box.innerHTML = L.length ? `<button type="button" class="ta-all" data-ta-all="${U.esc(v)}">${U.esc(St('ta_all', { q: v, n: L.length }))}</button>${L.slice(0, 8).map(x => { const hit = x.via.find(w => w[1].toLowerCase().includes(v.toLowerCase())); return `<button type="button" class="ta-it" data-ta-one="${U.esc(x.s.sku)}" role="option"><b>${U.esc(x.s.sku)}</b> <span>${U.esc(x.s.name)}</span>${hit ? `<small>${U.esc(St('ta_via_' + hit[0], { c: hit[1] }))}</small>` : ''}<em>${St('ta_one')}</em></button>`; }).join('')}` : `<div class="ta-none">${St('ta_none')}</div>`;
    box.classList.remove('hidden');
  };
  q.addEventListener('input', show); q.addEventListener('focus', show);
  q.addEventListener('keydown', e => { if (e.key === 'Escape') box.classList.add('hidden'); if (e.key === 'Enter') { const L = taMatches(q.value); if (L.length === 1) { e.preventDefault(); taPick(L[0].s.sku, q, box); } } });
  box.addEventListener('mousedown', e => e.preventDefault());
  box.addEventListener('click', e => { const one = e.target.closest('[data-ta-one]'), all = e.target.closest('[data-ta-all]'); if (one) taPick(one.dataset.taOne, q, box); else if (all) { box.classList.add('hidden'); q.value = all.dataset.taAll; App.setF({ q: all.dataset.taAll }); } });
  document.addEventListener('click', e => { if (!e.target.closest('.ta-box') && e.target !== q) box.classList.add('hidden'); });
}
window.cr4SkuSearch = q => taMatches(q).map(x => x.s.sku);   // the same search the typeahead uses (tests · other pages)
function taPick(sku, q, box) { box.classList.add('hidden'); q.value = sku; if (App.page !== 'overview') { App.F.q = sku; App.go('overview'); } else App.setF({ q: sku }); }
/** the SKU the overview focuses on: the filter leaves one SKU, or the search is exactly one SKU code */
function focusRow(M) { if (M.rows.length === 1) return M.rows[0]; const q = (App.F.q || '').trim().toLowerCase(); return q ? M.rows.find(r => r.sku.toLowerCase() === q) || null : null; }
function sku360(main, r, M) {
  const DB = App.DB, s = DB.skus[r.i], T = Calc.skuTrend(DB, r.i, M.asDn, M.mask), X = (Calc.skuIdxFocus = r.i, fcExample(M)); Calc.skuIdxFocus = null;
  const rel = (typeof props === 'function' ? props() : []).filter(p => p.sku === r.sku && (typeof propVisible !== 'function' || propVisible(p)));
  const trendTxt = T.ok ? `${T.pctM >= 0 ? '▲' : '▼'} ${U.n(Math.abs(T.pctM), 1)}%${St('per_month')} · R² ${U.n(T.r2, 2)}${T.down ? ` <span class="st reorder">${St('tr_down')}</span>` : ''}` : `<span class="muted">${St('fc_short')}</span>`;
  main.innerHTML = Pages.pageHead(M, 's360', 's360_q') + `<div class="s360-top"><div class="cell2"><b>${U.esc(s.name)}</b><span class="sub">${U.esc(s.sku)} · ${U.esc(s.brand)} · ${U.esc(s.category)}</span></div>${U.badges(r, M.S)} ${Pages.grpBadge(r)}<span class="s360-trend">${trendTxt}</span><button type="button" class="btn small ghost" data-s360-back="1">${St('s360_back')}</button></div>
    <div class="kpis k4 s360-kpis">${Pages.kpiCard(St('col_stockout') || 'Stockout', '', r.stockoutDn == null ? '—' : U.date(r.stockoutDn), '', '', '')}${Pages.kpiCard(St('col_orderby') || 'Order-by', '', r.orderByDn == null ? '—' : U.date(r.orderByDn), '', '', '')}${Pages.kpiCard('ROP', '', U.n(r.rop), St('lost_pcs'), '', '')}${Pages.kpiCard(St('fc_rr'), '', U.n(r.rrSel * 7, 1), St('fc_unit'), '', '')}</div>
    <div class="grid2 even"><section class="card"><div class="card-head"><h3>${St('s360_methods')}</h3></div>${X ? fcMethodsTable(M, X, App.F.rr || 'L4W') : ''}</section>
    <section class="card"><div class="card-head"><h3>${St('s360_props')}</h3></div>${rel.length ? `<div class="alist">${rel.slice(0, 8).map(p => `<button type="button" class="lost-item" data-prop-open="${U.esc(p.id)}"><span class="cell2"><b>${U.esc(p.id)}</b><span class="sub">${U.esc(t(PROP[p.type].label))} · ${U.n(p.qty)}</span></span><span>${U.esc(t('propS_' + p.status))}</span></button>`).join('')}</div>` : U.empty(St('s360_none'), '', 'check')}</section></div>
    <div id="s360Body" class="s360-body"></div>`;
  // the SKU drawer of Stock & Projection, drawn inline (same components, same numbers)
  const body = main.querySelector('#s360Body'), open = U.drawer.open, bodyFn = U.drawer.body;
  U.drawer.open = html => { body.innerHTML = html; }; U.drawer.body = () => body;
  in360 = true; try { Pages.stock.openDrawer(App, r.sku); } finally { U.drawer.open = open; U.drawer.body = bodyFn; in360 = false; }
}
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-s360-back]')) { App.setF({ q: '' }); const q = document.getElementById('fQ'); if (q) q.value = ''; } });
/** Portfolio: SKUs expected out / below ROP in each of the next 26 weeks — counted from each SKU's own projection (r._p.totA) */
Pages.portfolioRisk = M => {
  const W = [];
  for (let k = 1; k <= 26; k++) { const tt = 7 * k - 1, out = [], low = []; for (const r of M.rows) { const P = r._p; if (!P || !(r.rrTot > 0)) continue; const v = P.totA[Math.min(P.totA.length - 1, tt)]; if (v < 0.5) out.push(r); else if (v < r.rop) low.push(r); } W.push({ k, dn: M.asDn + 7 * k, out, low }); }
  return W;
};
let pfSel = null;
function portfolioCard(M) {
  const W = Pages.portfolioRisk(M), mx = Math.max(1, ...W.map(w => w.out.length + w.low.length)), sel = pfSel != null ? W.find(w => w.k === pfSel) : null;
  return `<section class="card pf-card" id="card-pf"><div class="card-head"><h3>${St('pf_title')} ${U.info(St('pf_tip'))}</h3><span class="muted small"><i class="pf-key out"></i>${St('pf_out')} <i class="pf-key low"></i>${St('pf_rop')}</span></div>
    <div class="pf-bars">${W.map(w => `<button type="button" class="pf-bar${pfSel === w.k ? ' on' : ''}" data-pf="${w.k}" data-pf-out="${w.out.length}" data-pf-low="${w.low.length}" title="${U.esc(St('pf_week', { d: U.date(w.dn) }))} · ${St('pf_out')} ${w.out.length} · ${St('pf_rop')} ${w.low.length}"><span class="pf-low" style="height:${w.low.length / mx * 100}%"></span><span class="pf-out" style="height:${w.out.length / mx * 100}%"></span></button>`).join('')}</div>
    <div class="pf-axis"><span>${U.date(W[0].dn)}</span><span>${U.date(W[12].dn)}</span><span>${U.date(W[25].dn)}</span></div>
    ${sel ? `<div class="pf-list"><b>${St('pf_list', { d: U.date(sel.dn) })}</b>${[...sel.out.map(r => [r, 'out']), ...sel.low.map(r => [r, 'low'])].slice(0, 20).map(([r, k]) => `<button type="button" class="lost-item" data-go-sku="${U.esc(r.sku)}"><span class="cell2"><b>${U.esc(r.name)}</b><span class="sub">${U.esc(r.sku)}</span></span><span class="st ${k === 'out' ? 'stockout' : 'reorder'}">${St(k === 'out' ? 'pf_out' : 'pf_rop')}</span></button>`).join('')}</div>` : ''}</section>`;
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-pf]'); if (!b) return; pfSel = pfSel === +b.dataset.pf ? null : +b.dataset.pf; const c = document.getElementById('card-pf'); if (c) c.outerHTML = portfolioCard(App.model()); });

/* the SKU drawer (Stock, Expiry, Consignment, Replenishment tables) gets the run rate by method + a link to SKU 360 */
let in360 = false;
const drawerBefore = Pages.stock.openDrawer;
Pages.stock.openDrawer = function (A, sku) {
  drawerBefore.call(this, A, sku); if (in360) return;
  const M = A.model(), r = M.rows.find(x => x.sku === sku), body = U.drawer.body(); if (!r || !body || !document.getElementById('supDrawer') || document.getElementById('supDrawer').classList.contains('hidden')) return;
  Calc.skuIdxFocus = r.i; const X = fcExample(M); Calc.skuIdxFocus = null;
  const T = Calc.skuTrend(A.DB, r.i, M.asDn, M.mask);
  (body.querySelector('.dr-body') || body).insertAdjacentHTML('beforeend', `<section class="card"><div class="card-head"><h3>${St('s360_methods')}</h3>${T.ok ? `<span class="muted small" title="${U.esc(St('tr_tip', { p: U.n(T.pctM, 1), r: U.n(T.r2, 2) }))}">${T.pctM >= 0 ? '▲' : '▼'} ${U.n(Math.abs(T.pctM), 1)}%${St('per_month')}${T.down ? ' · ' + St('tr_down') : ''}</span>` : ''}</div>${X ? fcMethodsTable(M, X, A.F.rr || 'L4W') : ''}</section>`);
  const head = body.querySelector('.drawer-head, .dr-head, h2'); if (head && workCanVisit('supOverview')) head.insertAdjacentHTML('afterend', `<button type="button" class="btn small ghost s360-link" data-s360="${U.esc(sku)}">${St('s360_link')} ↗</button>`);
};
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-s360]'); if (!b) return; if (U.drawer.isOpen()) U.drawer.close(); window.cr4OpenSku360(b.dataset.s360); });
/* ---------------------------------------------------------------- page hooks */
const ovBefore = Pages.overview.render;
Pages.overview.render = function (main, A) {
  const M = A.model(), f = focusRow(M);
  if (f && A.DB) { sku360(main, f, M); tidyFbar(); return; }
  if (M.rows.length > 1 && A.ui.projUnit === 'q') A.ui.projUnit = 'v';   // R7: several SKUs → ฿ only
  ovBefore.call(this, main, A);
  if (M.rows.length > 1) { const seg = main.querySelector('[data-unit="projUnit"] [data-v="q"]'); if (seg) { seg.disabled = true; seg.title = St('pf_valueonly'); } }
  if (M.rows.length) main.insertAdjacentHTML('beforeend', `<div class="grid2 even" style="margin-top:16px">${Pages.abcMatrix(M, 'overview', '')}${portfolioCard(M)}</div>`);
  tidyFbar();
};
const rpBefore = Pages.replen.render;
Pages.replen.render = function (main, A) { rpBefore.call(this, main, A); const M = A.model(); if (M.rows.length) { const head = main.querySelector('.pagehead'); (head || main).insertAdjacentHTML(head ? 'afterend' : 'afterbegin', Pages.abcMatrix(M, 'replen', A.ui.rpGrp || '')); } tidyFbar(); };
Object.keys(Pages).forEach(k => { const P = Pages[k]; if (!P || typeof P.render !== 'function' || k === 'overview' || k === 'replen') return; const b = P.render; P.render = function (main, A) { b.call(this, main, A); tidyFbar(); }; });
/* "ดู SKU นี้" from a Supply table row: data-go-sku already opens the SKU; from Ops tables (allocation / stock) → SKU 360 */
window.cr4OpenSku360 = sku => { if (!workCanVisit('supOverview')) return; App.ui.sku = null; if (App.F && App.page === 'overview' && Supply.isView(view)) { App.setF({ q: sku }); return; } if (App.F) App.F.q = sku; history.replaceState(null, '', location.pathname + location.search + '#/supply/overview?q=' + encodeURIComponent(sku)); navigate('supOverview'); };

/* ---------------------------------------------------------------- R9 · the trend badge raises one S&OP action per SKU ("ขาลงต่อเนื่อง") */
if (typeof sopConditions === 'function') {
  const condBefore = sopConditions;
  sopConditions = function () {
    const R = condBefore(), DB = Supply.App.DB;
    DB.skus.forEach((s, i) => { const T = Calc.skuTrend(DB, i, R.as, null); if (T.ok && T.down && T.level > 0) R.list.push({ key: 'trend|' + s.sku, type: 'trend', sev: 'medium', sku: s.sku, acc: '', ch: '', link: 'supStock', val: Math.round(T.pctM * 10) / 10 }); });
    return R;
  };
}
})();
