/* pages/ops.js — CR-01 Phase 1 · Commerce Operations pages.
   หน้าหลัก (home) works now: welcome + Supply Alert card (B4).
   The other 13 Commerce Operations pages and "ข้อเสนอ Supply" are placeholders that state what each page will do —
   they are rebuilt from the UAT spec (Charmiss-Operations-UAT-2026-11-24, 943 cases) in Phase 2 / 3. */
(function (global) {
  'use strict';
  const Pages = global.Pages = global.Pages || {};

  I18N.add({
    nav_home: 'หน้าหลัก', nav_orders: 'คำสั่งซื้อและการชำระเงิน', nav_ecommerce: 'ฝ่าย E-commerce', nav_customers: 'ลูกค้า', nav_catalog: 'รายการสินค้า',
    nav_stockquota: 'สินค้าคงคลังและโควตา', nav_partners: 'คู่ค้าและพื้นที่ขาย', nav_so: 'เปิด SO · MT/TT', nav_workqueue: 'งานค้างและส่งมอบ',
    nav_documents: 'เอกสารและระบบเชื่อมต่อ', nav_reports: 'รายงาน', nav_access: 'บัญชีและสิทธิ์ SSO', nav_audit: 'ประวัติการทำงาน', nav_returns: 'คืนสินค้า / Credit Note',
    nav_proposals: 'ข้อเสนอ Supply',
    grp_ops: 'Commerce Operations', grp_supply: 'Supply Planning', grp_setup: 'Supply Setup',
    ph_badge: 'Phase {n}', ph_title: 'หน้านี้จะสร้างใน Phase {n}', ph_hint: 'สร้างใหม่ตาม Spec จากรายงาน UAT 24 พ.ย. 2026 (943 ข้อ) — ระหว่างนี้แสดงขอบเขตงานของหน้า',
    ph_scope: 'ขอบเขตของหน้านี้', ph_rules: 'กติกาที่ต้องคงไว้',
    deny_title: 'ไม่มีสิทธิ์เข้าหน้านี้', deny_hint: 'บัญชี {p} ไม่มีสิทธิ์เปิดหน้านี้ (Page gate) — เลือกเมนูที่แสดงอยู่ด้านซ้าย',
    home_hello: 'สวัสดี {p}', home_sub: 'Charmiss Operations Management · ระบบบันทึก (Commerce Operations) + ระบบวางแผน (Supply Planning) ในที่เดียว',
    home_scope: 'ขอบเขตข้อมูล: {s}', home_scope_all: 'ทุกฝ่าย', home_alert: 'Supply Alert', home_alert_tip: 'นับตามขอบเขตฝ่ายของบัญชีนี้ · ณ AS OF ล่าสุด · Run Rate L4W · Horizon 3M',
    home_a_stockout: 'SKU เสี่ยงขาด', home_a_reorder: 'ต้องสั่งผลิตภายใน 30 วัน', home_a_risk: 'เสี่ยงหมดอายุ (3M)', home_a_recall: 'แนะนำเรียกคืน (CN)',
    home_go: 'ดูรายละเอียด', home_menu: 'เมนูของบัญชีนี้', home_ops_n: '{n} หน้า Commerce Operations', home_sup_n: '{n} หน้า Supply Planning',
    home_phase: 'สถานะการสร้าง (CR-01)', home_p1: 'Phase 1 — Shell, ธีม, บัญชีและสิทธิ์, Supply Planning ครบทุกหน้า', home_p2: 'Phase 2 — Commerce Operations: ออเดอร์ → Quota + WMS → SO/IV → ส่งมอบ → CN',
    home_p3: 'Phase 3 — เชื่อมข้อมูลและประโยชน์ใหม่: ATP, แผงอนุมัติ Quota, ข้อเสนอ Supply', home_p4: 'Phase 4 — เติมส่วนที่ยังไม่ครบ + UAT ทั้งระบบ',
    done_tag: 'เสร็จ', next_tag: 'ถัดไป', later_tag: 'รอ',
    app_title: 'Charmiss Ops', app_sub: 'Operations Management', nav_overview: 'ภาพรวม Supply', nav_report: 'Supply Review', nav_data: 'ข้อมูล & ตั้งค่า Supply', dr_safety: 'Safety Days',
    sso_demo: 'SSO DEMO', switch_user: 'เปลี่ยนบัญชีทดสอบ', demo_note: 'ข้อมูลจำลอง · ไม่มีการส่งข้อมูลเข้าระบบจริง', scope_locked: 'ล็อกตามฝ่าย', footer: 'Charmiss Operations Management · Prototype 8.0 · CR-01 Phase 1'
  }, {
    nav_home: 'Home', nav_orders: 'Orders & Payments', nav_ecommerce: 'E-commerce', nav_customers: 'Customers', nav_catalog: 'Products',
    nav_stockquota: 'Stock & Quota', nav_partners: 'Partners & Areas', nav_so: 'Open SO · MT/TT', nav_workqueue: 'Work Queue & Handover',
    nav_documents: 'Documents & Integrations', nav_reports: 'Reports', nav_access: 'Accounts & SSO Access', nav_audit: 'Activity Log', nav_returns: 'Returns / Credit Note',
    nav_proposals: 'Supply Proposals',
    grp_ops: 'Commerce Operations', grp_supply: 'Supply Planning', grp_setup: 'Supply Setup',
    ph_badge: 'Phase {n}', ph_title: 'This page is built in Phase {n}', ph_hint: 'Rebuilt from the UAT report of 24 Nov 2026 (943 cases) — until then this shows the page scope',
    ph_scope: 'Page scope', ph_rules: 'Rules to keep',
    deny_title: 'No access to this page', deny_hint: '{p} cannot open this page (page gate) — use the menu on the left',
    home_hello: 'Hello {p}', home_sub: 'Charmiss Operations Management · system of record (Commerce Operations) + planning (Supply Planning) in one place',
    home_scope: 'Data scope: {s}', home_scope_all: 'All departments', home_alert: 'Supply Alert', home_alert_tip: 'Counted within this account’s department · latest AS OF · Run Rate L4W · Horizon 3M',
    home_a_stockout: 'Stockout-risk SKUs', home_a_reorder: 'Order within 30 days', home_a_risk: 'Expiry risk (3M)', home_a_recall: 'Suggested recall (CN)',
    home_go: 'Details', home_menu: 'Menus for this account', home_ops_n: '{n} Commerce Operations pages', home_sup_n: '{n} Supply Planning pages',
    home_phase: 'Build status (CR-01)', home_p1: 'Phase 1 — Shell, theme, accounts & permissions, all Supply Planning pages', home_p2: 'Phase 2 — Commerce Operations: order → quota + WMS → SO/IV → handover → CN',
    home_p3: 'Phase 3 — Data link and new benefits: ATP, quota approval panel, supply proposals', home_p4: 'Phase 4 — Remaining gaps + full-system UAT',
    done_tag: 'Done', next_tag: 'Next', later_tag: 'Later',
    app_title: 'Charmiss Ops', app_sub: 'Operations Management', nav_overview: 'Supply Overview', nav_report: 'Supply Review', nav_data: 'Supply Data & Settings', dr_safety: 'Safety Days',
    sso_demo: 'SSO DEMO', switch_user: 'Switch test account', demo_note: 'Mock data · nothing is sent to real systems', scope_locked: 'Locked to department', footer: 'Charmiss Operations Management · Prototype 8.0 · CR-01 Phase 1'
  });

  // ---- what each placeholder page will do (TH / EN) — from the UAT report ----
  const SPEC = {
    orders: [2, ['รับออเดอร์ MT / TT / Ecom และยืนยันการชำระเงิน', 'ตรวจ Quota + WMS Actual ก่อนส่ง SO Request (ผลตรวจหมดอายุเมื่อ WMS version เปลี่ยน)', 'ดูสถานะออเดอร์ตั้งแต่สร้างจนส่งมอบ'],
      ['Quota หักที่ SO หรือ IV ครั้งเดียว', 'ไม่สร้าง SO / IV / CN ทางการในแอป'],
      ['Take MT / TT / Ecom orders and confirm payment', 'Check quota + WMS Actual before the SO request (a check expires when the WMS version changes)', 'Track each order from creation to handover'],
      ['Quota is deducted once, at SO or IV', 'No official SO / IV / CN is created in the app']],
    ecommerce: [2, ['ร้านออนไลน์ 6 ร้าน: TikTok, Lazada, Shopee, LINE Commerce, LINE OA, Web', 'แบ่งจำนวนเสนอขายจาก WMS − Safety Units (Ecom) ไม่ให้เกินของจริง', 'Sync จำนวนกับร้าน (ร้านที่ตัดการเชื่อมต่อ = 0)'],
      ['WMS ลดลง → ลดจำนวนที่เผยแพร่ทันที · WMS เพิ่มไม่เผยแพร่เองอัตโนมัติ'],
      ['6 online stores: TikTok, Lazada, Shopee, LINE Commerce, LINE OA, Web', 'Split the offer from WMS − Safety Units (Ecom), never above real stock', 'Sync quantities to stores (disconnected store = 0)'],
      ['WMS drop lowers published units at once · a WMS increase is not published automatically']],
    customers: [2, ['รายชื่อลูกค้า / ร้านค้าตามฝ่าย', 'ประวัติออเดอร์ต่อลูกค้า'], ['ฝ่ายขายเห็นเฉพาะลูกค้าของฝ่ายตัวเอง'],
      ['Customers / stores by department', 'Order history per customer'], ['Sales sees only its own department’s customers']],
    catalog: [2, ['รายการสินค้า (SKU) ใช้รหัสชุดเดียวกับ Supply Planning', 'สถานะสินค้า New / Active / Discontinue / Clearance'], ['รหัส SKU ชุดเดียวทั้งระบบ (อนาคตมาจาก Product Master)'],
      ['Product list (SKU) with the same codes as Supply Planning', 'Status New / Active / Discontinue / Clearance'], ['One SKU code set across the system (Product Master later)']],
    stockquota: [2, ['สต็อก "ตอนนี้": WMS Actual, Reserved, Safety Units, Available', 'ขอ / ส่ง / อนุมัติ / Override Quota ตาม Account × SKU × เดือน', 'Phase 3: แผงข้อมูลประกอบการอนุมัติ (Quota Fit, MAPE, Coverage) + คอลัมน์ Stockout Date'],
      ['Override เฉพาะ Director', 'WMS Actual แก้จากแอปไม่ได้'],
      ['Stock "now": WMS Actual, Reserved, Safety Units, Available', 'Request / send / approve / override quota by account × SKU × month', 'Phase 3: approval panel (Quota Fit, MAPE, Coverage) + Stockout Date column'],
      ['Override by Director only', 'WMS Actual cannot be edited from the app']],
    partners: [2, ['คู่ค้า MT / TT และพื้นที่ขาย', 'ระบุคู่ค้าฝากขาย (Consignment) / ขายขาด'], ['ใช้ account_id ชุดเดียวกับ Supply Planning'],
      ['MT / TT partners and sales areas', 'Consignment / outright flag'], ['Same account_id set as Supply Planning']],
    so: [2, ['Prepare → Confirm (จอง Quota) → ส่ง SLA', 'รอ SLA ตอบรับ SO / IV · Retry ใช้คำขอและการจองเดิม', 'Phase 3: เมื่อ WMS ไม่พอ แสดง "ของจะพอวันที่…" (ATP)'],
      ['ยืนยันซ้ำไม่จองซ้ำ · IV มาก่อน SO ไม่ได้ · ยกเลิก SO ทางการจากแอปไม่ได้'],
      ['Prepare → Confirm (reserve quota) → send to SLA', 'Wait for SLA SO / IV acknowledgement · retry reuses the same request and reservation', 'Phase 3: when WMS is short, show "available on …" (ATP)'],
      ['Repeated confirm never reserves twice · IV cannot arrive before SO · official SO cannot be cancelled from the app']],
    workqueue: [2, ['คิวงานค้างตามขั้นตอน มีผู้รับผิดชอบ วันครบกำหนด ความสำคัญ', 'ใบส่งมอบขนส่ง 1–100 ออเดอร์ / ขนส่งเดียว + หลักฐานผู้รับมอบ', 'สถานะจาก WMS (หยิบ / แพ็ก / ชั่ง) และผลขนส่ง', 'Phase 3: งานประเภท "ข้อเสนอ Supply"'],
      ['ไม่มีคำสั่งหยิบ / แพ็กในแอป · ผลขนส่งไม่แก้ Actual หรือ Quota · ใบส่งมอบซ้ำ / ข้ามฝ่ายถูกบล็อก'],
      ['Work queue by step with owner, due date, priority', 'Carrier handover of 1–100 orders / one carrier + receiver proof', 'WMS status (pick / pack / weigh) and delivery results', 'Phase 3: "Supply proposal" case type'],
      ['No pick / pack commands in the app · delivery results never change Actual or quota · duplicate / cross-department handovers are blocked']],
    documents: [2, ['ติดตาม SO / IV / CN จาก SLA และสถานะการเชื่อมต่อ WMS / ขนส่ง', 'แหล่งข้อมูลจำลองและเวอร์ชัน'], ['Event ซ้ำไม่มีผลซ้ำ · payload ต่างแต่เลขเดิมถูกปฏิเสธ'],
      ['Track SO / IV / CN from SLA and WMS / carrier links', 'Mock data sources and versions'], ['Replayed events have no effect · same id with a different payload is rejected']],
    reports: [2, ['รายงานปฏิบัติการ: ต้องตรวจโควตาใหม่, รอยืนยันออเดอร์, ติดตามขนส่ง, ใบส่งมอบรอยืนยัน, WMS แจ้งปัญหา', 'ส่งออก CSV ตามสิทธิ์'], ['ข้อมูลตามขอบเขตฝ่าย'],
      ['Operations report: quota re-check, orders to confirm, shipments to follow, handovers to confirm, WMS issues', 'CSV export by permission'], ['Data within the department scope']],
    access: [2, ['บัญชีและบทบาท (SSO Demo) 11 บทบาท รวม Supply Chain Planner', 'สิทธิ์รายฟังก์ชัน 24 + 9 สิทธิ์ Supply ให้ / ถอนได้ในเพดานตำแหน่ง'], ['ให้สิทธิ์เกินตำแหน่งไม่ได้ · มี Audit ทุกครั้ง'],
      ['Accounts and roles (SSO Demo), 11 roles incl. Supply Chain Planner', '24 function permissions + 9 Supply permissions, granted / revoked within the role ceiling'], ['No grant above the role ceiling · every change is audited']],
    audit: [2, ['ประวัติการทำงานทุกการกระทำ: ผู้ทำ เวลา ก่อน / หลัง'], ['แก้ไขหรือลบประวัติไม่ได้'], ['Every action: who, when, before / after'], ['History cannot be edited or deleted']],
    returns: [2, ['คำขอคืนสินค้า (จากคู่ค้า หรือจากข้อเสนอเรียกคืนที่อนุมัติแล้ว)', 'รับคืนที่คลัง: ระบุสภาพ Good / Bad (บังคับ)', 'ติดตาม CN จาก SLA'],
      ['CN ทางการมาจาก SLA · Good กลับเข้าขายได้ · Bad = Write-off'],
      ['Return requests (from partners or from an approved recall proposal)', 'Warehouse receipt with condition Good / Bad (required)', 'Track the CN from SLA'],
      ['The official CN comes from SLA · Good is sellable again · Bad = write-off']],
    proposals: [3, ['ข้อเสนอ 3 แบบ: เรียกคืน (CN) · Quota เดือนถัดไป · แผนสั่งผลิต (PO)', 'Draft → Submitted → Approved / Rejected (ต้องมีเหตุผล) → Done', 'เมื่ออนุมัติ: สร้าง Draft ปลายทางใน Commerce Operations'],
      ['ผู้สร้างอนุมัติเองไม่ได้ · ข้อเสนอซ้ำรวมเป็นใบเดียว · ไม่หัก Quota / ไม่แก้ WMS'],
      ['3 kinds: recall (CN) · next-month quota · production plan (PO)', 'Draft → Submitted → Approved / Rejected (reason required) → Done', 'On approval: creates the target draft in Commerce Operations'],
      ['Creators cannot approve their own · duplicates merge into one · never deducts quota or changes WMS']]
  };

  function placeholder(id) {
    return {
      render(main) {
        const s = SPEC[id], en = I18N.lang === 'en';
        const scope = en ? s[3] : s[1], rules = en ? s[4] : s[2];
        main.innerHTML = `<div class="pagehead"><div><div class="crumb">CHARMISS / ${U.esc(t('nav_' + id).toUpperCase())}</div><h1 class="page">${U.esc(t('nav_' + id))}</h1></div></div>
          <div class="note">${U.icon('info')}<span>${U.esc(t('demo_note'))}</span></div>
          <section class="card ph-card"><div class="ph-head"><span class="ph-pill">${U.esc(t('ph_badge', { n: s[0] }))}</span><b>${U.esc(t('ph_title', { n: s[0] }))}</b></div>
            <div class="muted small">${U.esc(t('ph_hint'))}</div>
            <div class="ph-cols"><div><h3>${U.esc(t('ph_scope'))}</h3><ul>${scope.map(x => `<li>${U.esc(x)}</li>`).join('')}</ul></div>
            <div><h3>${U.esc(t('ph_rules'))}</h3><ul>${rules.map(x => `<li>${U.esc(x)}</li>`).join('')}</ul></div></div></section>`;
      }
    };
  }
  Object.keys(SPEC).forEach(id => { Pages[id] = placeholder(id); });
  Pages.phaseOf = id => (SPEC[id] ? SPEC[id][0] : null);

  /** Page gate: shown when a page is opened by link without access. */
  Pages.denied = { render(main) { main.innerHTML = U.empty(t('deny_title'), t('deny_hint', { p: Auth.name() }), 'alert'); } };

  // ---- หน้าหลัก ----
  Pages.home = {
    render(main, App) {
      const P = Auth.profile, en = I18N.lang === 'en';
      const scopeTxt = P.scope ? P.scope : t('home_scope_all');
      let alert = '';
      if (Auth.can('supply.view')) {
        // B4: fixed basis so the card does not move with the Supply filters: latest AS OF, L4W, 3M, the department's channel
        const F = { asDn: App.DB.maxAsOf, view: 'W', ch: P.scope ? [P.scope] : [], acc: [], brand: [], cat: [], q: '', rr: 'L4W', h: 3 };
        const M = Calc.computeModel(App.DB, F, App.S, {});
        const rows = M.rows, cnt = s => rows.filter(r => r.status === s).length;
        const risk = M.kpi ? M.kpi.riskValue : null;
        const link = (pg, label) => Auth.canPage(pg) ? `<a href="#/${pg}" data-nav="${pg}" class="small">${U.esc(label)} →</a>` : '';
        const C = Auth.canPage('consign') ? Calc.consignmentOf(App.DB, M.rows, M.asDn, M.period, M.mask, App.S) : null;
        const recall = C && C.kpi ? C.kpi.recallV : null;
        alert = `<section class="card"><div class="card-head"><h3>${U.esc(t('home_alert'))} ${U.info(t('home_alert_tip'))}</h3><span class="muted small">${t('f_asof')} ${U.date(F.asDn)}</span></div>
          <div class="kpis k4 flat" style="margin-bottom:0">
            <div class="kpi"><div class="l">${U.esc(t('home_a_stockout'))}</div><div class="v">${U.n(cnt('stockout'))}</div><div class="s">${link('stock', t('home_go'))}</div></div>
            <div class="kpi"><div class="l">${U.esc(t('home_a_reorder'))}</div><div class="v">${U.n(cnt('reorder'))}</div><div class="s">${link('replen', t('home_go')) || link('stock', t('home_go'))}</div></div>
            <div class="kpi"><div class="l">${U.esc(t('home_a_risk'))}</div><div class="v">${U.money(risk)}</div><div class="s">${link('expiry', t('home_go'))}</div></div>
            ${recall != null ? `<div class="kpi"><div class="l">${U.esc(t('home_a_recall'))}</div><div class="v">${U.money(recall)}</div><div class="s">${link('consign', t('home_go'))}</div></div>` : ''}
          </div></section>`;
      }
      const nOps = P.pages.filter(p => Auth.OPS.includes(p)).length, nSup = P.pages.filter(p => Auth.SUPPLY.includes(p)).length;
      const ph = [['home_p1', 'done'], ['home_p2', 'next'], ['home_p3', 'later'], ['home_p4', 'later']];
      main.innerHTML = `<div class="pagehead"><div><div class="crumb">CHARMISS / HOME</div><h1 class="page">${U.esc(t('home_hello', { p: Auth.name() }))}</h1><div class="q">${U.esc(t('home_sub'))}</div></div>
          <div class="perchip">${U.esc(t('home_scope', { s: scopeTxt }))}</div></div>
        <div class="note">${U.icon('info')}<span>${U.esc(t('demo_note'))}</span></div>
        ${alert}
        <div class="grid2 even" style="margin-top:16px">
          <section class="card"><div class="card-head"><h3>${U.esc(t('home_menu'))}</h3></div>
            <ul class="plain"><li>${U.esc(t('home_ops_n', { n: nOps }))}</li><li>${U.esc(t('home_sup_n', { n: nSup }))}</li></ul></section>
          <section class="card"><div class="card-head"><h3>${U.esc(t('home_phase'))}</h3></div>
            <ul class="plain phase-list">${ph.map(([k, s]) => `<li><span class="ph-tag ${s}">${U.esc(t(s + '_tag'))}</span>${U.esc(t(k))}</li>`).join('')}</ul></section>
        </div>`;
      void en;
    }
  };
})(window);
