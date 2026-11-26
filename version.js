/* version.js — the one place for the app version (CR-03). Shown in the sidebar, the page footer and the login screen;
   clicking it opens the version history.
   Version rule (CR-05 §9) — Phase.Release.Fix:
     · first number  = Phase (Phase 1 = prototype / UAT = 1.x · Phase 2 = 2.x)
     · middle number = the CR release in order (CR-05 = 1.5 · the next CR = 1.6 · … CR-10 = 1.10, not a decimal).
       1.2 is left empty: CR-02 is not built yet — when it ships it takes the next free number at that time (e.g. 1.6), so numbers follow time.
     · last number   = a small fix after a release (1.5.1); a CR split into sub-phases uses it for the sub-phase (CR-03 3A–3D = 1.3.1–1.3.4).
   Release checklist: set APP_VERSION.number / label / date · add a history line on top (newest first) · set every ?v= in index.html to the
   same number so browsers load the new files · run SupUAT.cr05() (CR5-VERSION checks all of this). */
const APP_VERSION={
 number:'1.5.0',
 label:{th:'CR-05 · UX/UI ทั้งระบบ (Responsive · ความรก · ความชัดเจน)',en:'CR-05 · UX/UI clean-up (responsive · clutter · clarity)'},
 date:'2026-11-26',
 history:[
  ['1.5.0','2026-11-26',{th:'CR-05 — UX/UI ทั้งระบบ: แถบบนแถวเดียว + เมนูผู้ใช้ · Breadcrumb ตามกลุ่มเมนู · ส่วนหัวหน้า H1 + ⓘ เกี่ยวกับหน้านี้ · ตารางแบ่งหน้า 25/50/100 + ตรึงคอลัมน์ + Card บนมือถือ · Modal 3 ขนาด (ปุ่มล่างติดที่ · เต็มจอบนมือถือ) · เมนูมือถือแบบ Drawer · ตัวอักษร ≥ 12px และพื้นที่กด ≥ 40px · วันที่รูปแบบเดียว · เลข Action ACT-YYMM-#### · เลขเวอร์ชันแบบ Phase.Release.Fix',en:'CR-05 — UX/UI clean-up: one-row top bar + user menu · breadcrumb by menu group · page header H1 + ⓘ about this page · tables paged 25/50/100 + sticky columns + cards on phones · 3 modal sizes (fixed footer · full screen on phones) · drawer menu on phones · text ≥ 12 px and tap targets ≥ 40 px · one date format · action numbers ACT-YYMM-#### · Phase.Release.Fix version numbers'}],
  ['1.4.0','2026-11-25',{th:'CR-04 — หน้าหลักแบบ Command Center ตามบทบาท (งานของฉัน · ตัวเลขหลัก · สายงานภาพเดียว · 14 วันข้างหน้า) · เมนูเรียงตามลำดับงาน · หน้าคำสั่งซื้อแท็บชั้นเดียว 8 ขั้น · ตัวกรองแถวเดียว + ช่วงวันที่ 7 หน้า · การ์ดลูกค้า · รอบแผนปรับได้ (ดูย้อนหลังอ่านอย่างเดียว · เลื่อนรอบ) · SKU 360 · วิธีคาดการณ์ (Trend / อัตโนมัติ) · ยอดขายที่เสียโอกาส · ป้าย ABC-XYZ เป็นคำ · ปรับยอดฝากขายจากผลนับ · วันที่ ค.ศ. ทุกหน้า (เดิม 8.5.0)',en:'CR-04 — role-based home command center (my work · key numbers · flow strip · next 14 days) · menu in work order · one row of 8 order stages · one-row filter bar + date range on 7 pages · customer cards · adjustable plan period (read-only past view · roll) · SKU 360 · forecast methods (trend / automatic) · lost sales wording · ABC-XYZ in words · consignment count adjustment · Gregorian dates everywhere (was 8.5.0)'}],
  ['1.3.4','2026-11-25',{th:'CR-03 Phase 3D — รอบ S&OP: Action log (คิวข้อยกเว้น · สร้างอัตโนมัติ · ปิดเองไม่ได้) · Snapshot แผน + เทียบรอบ · วันปิดรับแก้แผน · Supply Review รายเดือน 4 ส่วน · Action ค้างใน Weekly Review และการ์ดหน้าหลัก · หน้าแรกหลังล็อกอิน = หน้าหลัก ทุกบทบาท (เดิม 8.4.0)',en:'CR-03 Phase 3D — S&OP cycle: action log (exception queue · raised automatically · never closed by the system) · plan snapshots + comparison · plan lock day · monthly Supply Review in 4 parts · open actions in the weekly review and on the home card · every role lands on the home page after sign-in (was 8.4.0)'}],
  ['1.3.3','2026-11-25',{th:'CR-03 Phase 3C — Early warning ฝากขาย (WOS · Reorder gap · In-stock · Distribution gap · Swing · ของสะสม) · FVA: Quota เทียบ Naive + Tracking signal · ข้อเสนอ Quota เริ่มจาก Naive เมื่อ FVA ติดลบต่อเนื่อง (เดิม 8.3.0)',en:'CR-03 Phase 3C — consignment early warning (WOS · reorder gap · in-stock · distribution gap · swing · piling up) · FVA: quota vs naive + tracking signal · quota proposals start from naive when FVA stays negative (was 8.3.0)'}],
  ['1.3.2','2026-11-25',{th:'CR-03 Phase 3B — Run Rate ไม่นับสัปดาห์ที่ของขาด + Lost sales · กลุ่ม ABC-XYZ · Safety Stock แบบสถิติจาก Lead Time จริง · selfCheck 12 (เดิม 8.2.0)',en:'CR-03 Phase 3B — run rate skipping out-of-stock weeks + lost sales · ABC-XYZ groups · statistical safety stock from actual lead times · selfCheck 12 (was 8.2.0)'}],
  ['1.3.1','2026-11-25',{th:'CR-03 Phase 3A — รับรายงาน Sales Out รายสัปดาห์ · Run Rate หยุดตามข้อมูลล่าสุดของแต่ละคู่ค้า · เบิกออกที่ไม่ใช่การขาย · selfCheck 10–11 · เลขเวอร์ชันในแอป (เดิม 8.1.0)',en:'CR-03 Phase 3A — weekly Sales Out intake · run rate ends at each account\'s latest data · non-sales stock issues · selfCheck 10–11 · app version shown in the app (was 8.1.0)'}],
  ['1.1.0','2026-11-25',{th:'CR-01 Phase A–D — รวม Commerce Operations + Supply Planning เป็น Charmiss Operations Management (เดิม 8.0.0)',en:'CR-01 Phase A–D — Commerce Operations + Supply Planning merged into Charmiss Operations Management (was 8.0.0)'}],
  ['1.0.0','2026-11-24',{th:'Charmiss Operations Prototype 7.0 · Public version 13 (ฐานเดิม) (เดิม 7.0)',en:'Charmiss Operations Prototype 7.0 · Public version 13 (the base) (was 7.0)'}]
 ]
};
/* called after every Ops render (supply-planning.js) and on the login screen */
function appVersionUI(){
 const v=APP_VERSION,en=typeof lang!=='undefined'&&lang==='en',lab=v.label[en?'en':'th'],fd=d=>typeof fmtDate==='function'?fmtDate(d):d;   // CR-05 G7: one date format
 const foot=document.getElementById('footBuild');if(foot&&!foot.querySelector('[data-appver]'))foot.innerHTML=`Charmiss Operations Management · <button type="button" class="linkish" data-appver title="${lab}">v${v.number}</button>`;
 const sf=document.querySelector('.sidebarfoot');if(sf&&!sf.querySelector('.appver-side'))sf.insertAdjacentHTML('beforeend',`<button type="button" class="appver-side" data-appver title="${lab}">Charmiss Ops v${v.number} · ${fd(v.date)}</button>`);
 const lb=document.querySelector('.loginbox');if(lb&&!lb.querySelector('.appver-login'))lb.insertAdjacentHTML('beforeend',`<p class="appver-login"><button type="button" class="linkish" data-appver>Charmiss Ops v${v.number}</button> · ${fd(v.date)}</p>`);
 document.querySelectorAll('[data-appver]').forEach(b=>b.onclick=appVersionDialog);
}
function appVersionDialog(){const en=typeof lang!=='undefined'&&lang==='en',k=en?'en':'th',fd=d=>typeof fmtDate==='function'?fmtDate(d):d;
 showModal(`<div class="dialogbody"><div class="between"><h2>Charmiss Operations Management</h2><button type="button" data-close aria-label="close">×</button></div><p><b>v${APP_VERSION.number}</b> · ${fd(APP_VERSION.date)} · ${APP_VERSION.label[k]}</p><div class="tablewrap"><table><thead><tr><th>${en?'Version':'เวอร์ชัน'}</th><th>${en?'Date':'วันที่'}</th><th>${en?'What changed':'สิ่งที่เปลี่ยน'}</th></tr></thead><tbody>${APP_VERSION.history.map(h=>`<tr><td><b>${h[0]}</b></td><td>${fd(h[1])}</td><td>${h[2][k]}</td></tr>`).join('')}</tbody></table></div></div>`,'appver');
 if(typeof bindClose==='function')bindClose()}
