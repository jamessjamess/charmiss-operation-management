# Charmiss Operations Management (Charmiss Ops) — Prototype 8.0

เว็บเดียวที่รวม **Commerce Operations** (OMS + Quota: ระบบบันทึก) กับ **Supply Planning** (ระบบวิเคราะห์และวางแผน) ตาม `Document/CR-01`
HTML + CSS + Vanilla JS · static (ไม่มี Backend / Database) · ข้อมูลจำลองทั้งหมด

> Ops เดิม (Public v13) ไม่มี Source code ใน Drive — CR-01 จึงเปลี่ยนเป็น **สร้างใหม่ตาม Spec** โดยใช้รายงาน UAT 24 พ.ย. 2026 (943 ข้อ) เป็นเกณฑ์ตรวจรับ
> และใช้ Supply Chain Dashboard v3.3 เป็นฐานของ Supply Planning (สูตร `js/calc.js` ไม่ถูกแก้)

## สถานะ

| Phase | ขอบเขต | สถานะ |
|---|---|---|
| 1 | Shell + ธีม Ops · เมนู 3 กลุ่ม · บัญชีทดสอบ 11 บทบาท (SSO Demo) · Page gate · ล็อกฝ่าย · สิทธิ์ Export · Supply Planning ครบ 9 หน้า · หน้าหลัก + Supply Alert (B4) | ✅ เสร็จ |
| 2 | Commerce Operations: ออเดอร์ → ตรวจ Quota + WMS → SO Request → SLA (SO/IV) → WMS → ใบส่งมอบ → ขนส่ง → คืนสินค้า/CN · สิทธิ์ 24 ข้อ · Audit | ถัดไป |
| 3 | Data Adapter Ops → Supply (Delivered = Sales In, In-transit, CN Good/Bad) · ATP (B1) · แผงอนุมัติ Quota (B2) · ข้อเสนอ Supply (B3) · Supply Review + งานค้าง (B5) | รอ |
| 4 | F1–F9 · UAT ทั้งระบบ (เกณฑ์ 943 ข้อ + SUP-*) | รอ |

หน้า Commerce Operations ที่มีป้าย **P2** / ข้อเสนอ Supply ที่มีป้าย **P3** ตอนนี้แสดง "ขอบเขตของหน้า + กติกาที่ต้องคงไว้"

## เปิดใช้งาน
- ดับเบิลคลิก `index.html` (ใช้ `data/mock-bundle.js`) หรือรัน `python -m http.server` ในโฟลเดอร์นี้ (อ่าน `data/*.csv`)
- เลือก **บัญชีทดสอบ** ที่มุมขวาบน (SSO DEMO) — จำไว้ใน localStorage `opm.profile`

## บัญชีและสิทธิ์ (`js/auth.js`)

| บัญชี | ขอบเขต | Supply Planning | Export |
|---|---|---|---|
| Director | ทุกฝ่าย | ทุกหน้า (ไม่รวม Setup) | ✔ |
| Manager · MT | MT (ล็อก) | ภาพรวม, Stock, หมดอายุ, ฝากขาย, Calendar, Quota, ข้อเสนอ, Review | ✔ |
| Manager · TT / Ecom | TT / ECOM (ล็อก) | เหมือน MT ยกเว้นฝากขาย | ✔ |
| Sales Admin · MT / TT / Ecom | ฝ่ายตัวเอง | ไม่เห็น (ATP มาใน Phase 3) | — |
| Supply Chain Planner | ทุกฝ่าย | ทุกหน้า + ข้อมูล & ตั้งค่า | ✔ |
| Admin | ทุกฝ่าย | ข้อมูล & ตั้งค่า Supply | — |
| ERP / Finance | ทุกฝ่าย | Calendar, Supply Review | — |
| Warehouse | ทุกฝ่าย | Calendar, เสี่ยงหมดอายุ | — |

- หน้าที่ไม่มีสิทธิ์ **ไม่แสดงในเมนู** และเปิดลิงก์ตรงจะเจอ "ไม่มีสิทธิ์เข้าหน้านี้"
- บัญชีที่ล็อกฝ่าย: ตัวกรอง Channel ถูกล็อก (`lockScope()`), คู่ค้าฝ่ายอื่นถูกตัดออกจาก URL และตัวเลือก
- ไม่มีสิทธิ์ Export: ปุ่มดาวน์โหลดถูกลบ และคลิกถูกบล็อกอีกชั้น (capture listener)
- Supply Planning อ่านอย่างเดียว — ไม่มีทางจอง/หัก Quota หรือแก้ WMS

## ตัวเลข Anchor (Director · AS OF 23 พ.ย. 2026 · Weekly · L4W · 3M) — ตรวจแล้วตรงกับ SCM v3.3
มูลค่า Stock ฿50,091,183 · DOC 73 วัน · Sell-through 17.8% · สถานะ 7 / 2 / 9 / 98 / 4 (+ หมดอายุ 7) · At-risk 3M ฿547,597 · ฝากขาย ฿10,572,812 · แนะนำเรียกคืน ฿519,974 · Quota Fit 92% · MAPE 13.5% · Bias −4.2% · Fill Rate 93.1% · selfCheck PASS

## โครงไฟล์
```
index.html               Shell: side menu · user bar (SSO Demo) · Supply filter bar · footer
css/styles.css           ธีมเดิม + บล็อก "CR-01 · Ops theme" ท้ายไฟล์ (สีสถานะ/กราฟคงเดิม)
js/i18n.js               TH/EN (+ I18N.add สำหรับโมดูลใหม่)
js/auth.js               ใหม่ — บัญชีทดสอบ, หน้าที่เปิดได้, สิทธิ์ Supply, ขอบเขตฝ่าย
js/calc.js               สูตร Supply (ไม่แก้)
js/data.js · ui.js · charts.js
js/pages/ops.js          ใหม่ — หน้าหลัก + หน้า Commerce Operations (P2) + ข้อเสนอ Supply (P3) + Page gate
js/pages/*.js            หน้า Supply Planning 9 หน้า (เดิม)
data/*.csv · mock-bundle.js · tools/generate_mock.py
README-supply-formulas.md  สูตรและข้อตัดสินใจของ Supply Planning (README เดิมของ SCM)
```

## ชื่อที่เปลี่ยน
ภาพรวม → **ภาพรวม Supply** · รายงาน → **Supply Review** · ข้อมูล & ตั้งค่า → **ข้อมูล & ตั้งค่า Supply** · Safety (วัน) → **Safety Days**
(Safety Units (Ecom) ของ Commerce Operations จะมาใน Phase 2)
