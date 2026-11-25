# Charmiss Operations Management (Charmiss Ops) — Prototype 8.0

เว็บเดียวที่รวม **Commerce Operations** (OMS + Quota · ระบบบันทึก) กับ **Supply Planning** (ระบบวิเคราะห์และวางแผน) ตาม `Document/CR-01`
HTML + CSS + Vanilla JS · static (ไม่มี Backend) · ข้อมูลจำลองทั้งหมด · Deploy แบบ static ได้ (GitHub Pages)

| ฐาน | ที่มา |
|---|---|
| Commerce Operations | ไฟล์ HTML/CSS/JS ของ **Charmiss Operations Prototype 7.0 · Public Version 13** (mockup ที่ deploy อยู่ ไม่มี Source repo) — นำมาแก้ต่อโดยตรง |
| Supply Planning | **Charmiss Supply Chain Dashboard v3.3** (`supply/`) — `supply/calc.js` แก้เฉพาะส่วน Adapter / F5 / F9 (ทุกจุดมี `// CR-01`) |

## สถานะ (ตาม CR-01 ข้อ 10)

| Phase | ขอบเขต | สถานะ |
|---|---|---|
| A | ชื่อระบบ/ธีม (ข้อ 4) · เมนู (ข้อ 5) · บทบาทและสิทธิ์ (ข้อ 7) · ชุดสาธิต 2 ชุด (ข้อ 2.2) · หน้า Supply ใช้ธีม Ops | ✅ เสร็จ |
| B | Data Adapter Ops → Supply (ข้อ 6) + F5 In-transit · F6 CN Good/Bad · F9 Clearance · selfCheck 7–9 | ✅ เสร็จ |
| C | B1 ATP · B2 แผงอนุมัติ Quota · B3 ข้อเสนอ Supply · B4 การ์ด Supply Alert · B5 Review + งานค้าง · F7 ETA | ✅ เสร็จ — รอตรวจ |
| D | F1–F4 · F8 · UAT ทั้งหมด · README ฉบับเต็ม | รอ |

## เปิดใช้งาน
- ดับเบิลคลิก `index.html` (หน้า Supply อ่าน `data/mock-bundle.js`) หรือรัน `python -m http.server` ในโฟลเดอร์นี้ (อ่าน `data/*.csv`)
- หน้า Login: เลือกบทบาท → "จำลอง Single Sign-On" (Manager / Sales Admin เลือกฝ่ายเพิ่ม)
- ลิงก์ตรงหน้า Supply แชร์ได้: `index.html#/supply/stock?asof=2026-11-23&view=M&ch=MT&rr=L3M&h=6&sku=CM-FD-001` → หลังล็อกอินจะเปิดหน้านั้น (ถ้าไม่มีสิทธิ์จะถูกปฏิเสธ)

## เมนู (Sidebar จัดเป็นกลุ่ม Module พับ/กางได้)

ชื่อและลำดับเมนู Ops ทั้ง 14 รายการเหมือนเดิม (CR-01 5.1) แค่แทรกหัวกลุ่ม · กลุ่มที่ไม่มีเมนูที่เห็นได้จะไม่แสดง · กลุ่มของหน้าที่เปิดอยู่จะกางเสมอ · สถานะพับจำไว้ใน `localStorage['ops.navCollapsed']` · บนมือถือ (≤700px) ทุกกลุ่มเรียงเป็นแถบเลื่อนแนวนอนแถวเดียว

| กลุ่ม | เมนู |
|---|---|
| CORE | หน้าหลัก |
| SALES | คำสั่งซื้อและการชำระเงิน · ฝ่าย E-commerce · ลูกค้า |
| PRODUCTS & QUOTA | รายการสินค้า · สินค้าคงคลังและโควตา · คู่ค้าและพื้นที่ขาย |
| FULFILLMENT | เปิด SO · MT/TT · งานค้างและส่งมอบ · เอกสารและระบบเชื่อมต่อ |
| REPORTS & SYSTEM | รายงาน · บัญชีและสิทธิ์ SSO · ประวัติการทำงาน |
| AFTER-SALES | คืนสินค้า / Credit Note |
| SUPPLY MONITOR | ภาพรวม Supply · Stock & Projection · เสี่ยงหมดอายุ · ฝากขาย (Consignment) · ของเข้า & CN Calendar |
| SUPPLY PLANNING | วางแผนสั่งผลิต · Quota vs Actual · ข้อเสนอ Supply (Phase C) · Supply Review (Weekly/Monthly) |
| SUPPLY SETUP | ข้อมูล & ตั้งค่า Supply |

- Global Filter ของ Supply (AS OF, VIEW BY, Channel, คู่ค้า, Brand, Category, ค้นหา, Run Rate, Horizon) อยู่เฉพาะหน้า Supply เป็นแถบติดด้านบน · มือถือเป็น Bottom sheet
- ชื่อที่แยกตาม 5.2: Ops "สต็อกสำรอง/Safety stock" → **Safety Units (Ecom)** · Supply "Safety" ใน Drawer → **Safety Days (ROP)** · "รายงาน" ของ SCM → **Supply Review** · "ภาพรวม" → **ภาพรวม Supply**
- ลิงก์ข้ามหน้า (5.3): Stock & Projection → สินค้าคงคลังและโควตา (สต็อก "ตอนนี้") · Quota vs Actual → สินค้าคงคลังและโควตา (อนุมัติ/จัดสรร, หน้านี้ไม่มีปุ่มแก้ Quota) · Calendar → คืนสินค้า / CN · Supply Review → งานค้างและส่งมอบ · Ops › Actual จาก WMS เพิ่มคอลัมน์ **Stockout Date (Supply)** กดแล้วเปิด Projection ของ SKU

## บทบาทและสิทธิ์ (CR-01 7.1–7.3)

บทบาทใหม่ **Supply Chain Planner** (`planner`) · สิทธิ์ใหม่ 9 ข้อต่อจาก 24 ข้อเดิม ใช้กลไกเพดาน (ceiling) / ค่าเริ่มต้น / Audit เดิมของหน้า "บัญชีและสิทธิ์ SSO" — Director ให้สิทธิ์ได้ภายในเพดานเท่านั้น และทุกการเปลี่ยนถูกบันทึกในประวัติการทำงาน

| บทบาท | หน้า Supply | ขอบเขต | supply.* ค่าเริ่มต้น |
|---|---|---|---|
| Director | ทุกหน้า (ไม่รวม Setup) | ทุกฝ่าย | view · export · approve.recall · approve.quota · approve.po |
| Manager MT | ภาพรวม · Stock · หมดอายุ · ฝากขาย · Calendar · Quota · ข้อเสนอ · Review | **MT** (Channel ล็อก) | view · export · approve.recall · approve.quota |
| Manager TT / Ecom | เหมือน MT ยกเว้นฝากขาย | **TT / ECOM** (ล็อก) | view · export · approve.quota |
| Sales Admin MT / TT / Ecom | ไม่เห็นเมนู Supply | ฝ่ายตัวเอง | — |
| Supply Chain Planner | ทุกหน้า + Setup | ทุกฝ่าย | view · export · comment · propose · settings · import |
| Admin | ข้อมูล & ตั้งค่า Supply | ทุกฝ่าย | settings · import (+ สลับชุดสาธิต) |
| ERP (finance) | Calendar · Review | ทุกฝ่าย | view |
| Warehouse | Calendar · หมดอายุ | ทุกฝ่าย | view |

- เมนูที่ไม่มีสิทธิ์**ไม่แสดง** และลิงก์ตรงถูกปฏิเสธด้วย Page gate เดิม ("ไม่มีสิทธิ์เข้าถึงหน้านี้")
- ไม่มี `supply.export` → ปุ่มดาวน์โหลดถูกลบ และคลิกถูกบล็อกอีกชั้น · ไม่มี `supply.comment` → Commentary อ่านอย่างเดียว · ไม่มี `supply.settings` / `supply.import` → ฟอร์ม Threshold / นำเข้า ถูกปิด
- **NOLEAK (ล็อกฝ่าย):** WH เป็นคลังกลาง ผู้ใช้ที่ล็อกฝ่ายเห็นเฉพาะส่วนที่ปันให้ฝ่ายตาม Run Rate (กติกาเดิมของ SCM) · ไม่เห็นชื่อคู่ค้า/ช่องทางของฝ่ายอื่นในตาราง กราฟ Drawer คำแนะนำ (เช่น ปลายทางเรียกคืนแสดงเป็น "ช่องทางที่ Run Rate สูงกว่า (นอกฝ่าย)") และ Export JSON ส่ง Commentary เฉพาะของฝ่ายตัวเอง
- Supply Planning อ่านอย่างเดียว: ไม่มีทางจอง/หัก Quota แก้ WMS หรือเปลี่ยนสถานะออเดอร์

## ชุดข้อมูลสาธิต 2 ชุด (CR-01 2.2)

เลือกที่ปุ่ม **เริ่มชุดสาธิตใหม่** (Sidebar ล่าง · Admin / Director) · ชื่อชุดที่ใช้อยู่แสดงที่ Footer

| ชุด | เนื้อหา |
|---|---|
| **UAT seed** | ข้อมูลเดิมของ Ops (6 SKU · คู่ค้าสาธิต) เหมือนเปิดเว็บครั้งแรก — ใช้รัน UAT เดิม |
| **Integrated demo** | Master จาก Supply (120 SKU · 15 คู่ค้า) · ออเดอร์ / โควตา / งานค้างของ Ops seed ย้ายมาอยู่บน SKU และ account_id ชุดเดียวกัน · WMS on-hand = Lot ของ WH ใน Supply ณ 23 พ.ย. 2026 (รวม 514,864 ชิ้น ตรงกับ Supply ทุก SKU) |

- Mapping ของ Integrated demo: SKU `11021→JB-FD-001 · 32160→JB-LP-007 · 16310→JB-CH-001 · 51001→CP-SK-001 · 12070→TF-FD-001 · 16160→CM-LP-004` · คู่ค้า `p1→A01 7-Eleven · p2→A03 Eveandboy · p6→A02 Watsons · p3→A08 Dealer · p4→A09 Wholesale · p5/ec-shopee→A10 Shopee · ec-lazada→A11 · ec-tiktok→A12 · ec-linecommerce→A13 · ec-lineoa→A14 · ec-web→A15` · ช่องทาง Direct/Social ของ Ops (Facebook, Instagram, Call) คงไว้
- **ร้าน Ecom ใหม่ (6.4): ใช้ทางเลือก A** — LINE Commerce (A13), LINE OA (A14), Web (A15) เพิ่มใน `account_master` โดยเริ่มประวัติหลัง AS OF (ไม่มีแถวยอดขาย/Quota/CN ย้อนหลัง) และเพิ่มตอนเขียนไฟล์ใน `tools/generate_mock.py` จึงไม่กระทบการสุ่ม → ตารางอื่น 7 ตารางเหมือนเดิมทุกไบต์ และ Anchor ไม่เปลี่ยน
- หน้า Supply ใน Phase A อ่านตาราง Supply 8 ตารางของ Integrated demo เสมอ (ทั้งสองชุด) จนกว่าจะมี Data Adapter ใน Phase B
- **บั๊กเดิมที่แก้:** ปุ่ม "เริ่มชุดสาธิตใหม่" ของ Ops v13 Error ทุกครั้ง (`initEcommerce → free() → wmsRow()` ทำงานก่อน `wmsInit()`) และทิ้ง db ครึ่งเดียว — ตอนนี้ล้าง db → โหลดหน้าใหม่ให้ทุกโมดูลสร้าง UAT seed แบบการเปิดครั้งแรก → (ถ้าเลือก) แปลงเป็น Integrated demo · ผู้ใช้ที่ล็อกอินอยู่ไม่ต้องล็อกอินใหม่

## Data Adapter Ops → Supply (CR-01 ข้อ 6 · Phase B) — `supply-feed.js`

อ่านอย่างเดียว: สร้างตาราง Supply ใหม่จากสถานะของ Ops ทุกครั้ง (ไม่สะสม) — ดึงซ้ำกี่ครั้งได้ตารางเท่าเดิม และ Event ID เดิมนับครั้งเดียว · ไม่เขียนออเดอร์ Quota เอกสาร หรือ WMS · ใช้กับชุด **Integrated demo** เท่านั้น (UAT seed คนละ SKU / คู่ค้า)

**ตัดข้อมูลที่รอบดึง WMS ล่าสุด** (`db.wmsSnapshot.asOf`): WH, ระหว่างขนส่ง, Sales In และ CN ตัดที่เวลาเดียวกัน ของชิ้นหนึ่งจึงอยู่ที่ใดที่หนึ่งเท่านั้น (ใน WMS / ระหว่างขนส่ง / ส่งถึงแล้ว) — ธุรกรรมหลังรอบดึงจะเห็นหลังกด "ดึงยอด WMS" · ทุกหน้า Supply แสดง "ข้อมูล Ops ณ <เวลา> · WMS version <n>" และจำนวนธุรกรรม

| ตาราง Supply | จาก Ops | กติกา |
|---|---|---|
| `sales_in` | ออเดอร์ **Delivered** (Carrier event) | วันที่ = deliveredAt · ต้องมี IV · คู่ค้าขายขาด (TT/ECOM) ลง `sales_out` เท่ากันอัตโนมัติ |
| `in_transit` (ใหม่) | IV ออก + ส่งมอบขนส่งแล้ว (ออกจาก WMS) แต่ยังไม่ Delivered | ยังเป็นของเรา: **Total = WH + ระหว่างขนส่ง + ฝากขาย** · IV ที่ยังไม่ออกจากคลังยังนับใน WH (ไม่นับซ้ำ) |
| `cn` | คืนสินค้า / CN | คำขอ = Planned · CN จาก SLA/ERP = Approved · WMS รับคืน = **Received + Good / Bad** (F6) · ปฏิเสธ = Cancelled |
| `quota` | Quota ของ Ops เดือน **2026-11** (รอบแผนของ Ops) | `quota_qty` = อนุมัติแล้ว · `reserved_qty` = SO ที่ถือไว้ยังไม่หัก (จอง) · `committed_qty` = หักที่ SO / IV (รวมยอดต้นเดือน) |
| `stock_lot` | WMS Actual | WH = ยอด WMS (Lot แบบ FEFO จาก Lot เดิม) · Lot ที่คู่ค้าฝากขายเดินหน้าตามการส่งถึง / รับคืน · Snapshot = วันจันทร์ถัดจากรอบดึง WMS |
| `sku_master` | รายการสินค้า | + สถานะ New / Active / Discontinue / **Clearance** ที่ตั้งใน Ops (F9) |
| `account_master` · `po_inbound` · `sales_out` (MT) | — | ใช้ของ Integrated demo / Import CSV ตามเดิม (PO จาก B3 และแก้ ETA มาใน Phase C) |

- **ชุด Integrated demo (ตอนเริ่มชุด):** Quota ของ Ops เดือน พ.ย. 2026 = Quota ของ Supply เดือนเดียวกัน (953 คู่ อนุมัติแล้ว) · "ใช้ไปยกมา" = Sales In ต้นเดือนถึง 22 พ.ย. (168,591 ชิ้น) และนับกลับเข้า "ส่วนกลางโควตา" เหมือนของที่ WMS ส่งแล้ว · Quota สาธิตเดิมของช่องทาง Direct / Social คงไว้ · ตัวอย่างคำขอเพิ่ม Quota รออนุมัติ 1 ใบ (AL-260014)
- **WMS DEMO ของ Integrated demo:** ปุ่มดึงยอด WMS คืนยอด = ยอดเริ่ม − ของที่ส่งมอบขนส่งแล้ว + ของคืนสภาพดีที่ WMS รับแล้ว (จำลองระบบ WMS จริง) — Ops ยังแค่ **อ่าน** ผ่าน `wmsApplySnapshot` เดิม · ชุด UAT seed ใช้ WMS DEMO เดิม
- **ออเดอร์ที่ออกจากคลังก่อนเริ่มชุด** ถือเป็นประวัติเดิม ไม่ถูกนำเข้าซ้ำ
- Quota สาธิตของ Ops ที่ถูกแทนด้วย Quota จริงถูกจดไว้ใน `db.retiredSeeds` — ตัว Seed ตอนโหลดหน้าของโมดูล E-commerce (เดิมใช้รหัส `16160` / `16310`) จะไม่สร้างกลับมาอีก
- `account_master` ใช้ account_id ชุดเดียวกับคู่ค้าของ Ops (ตั้งตอนเริ่มชุด) · Safety Units (Ecom) ของ Ops เก็บแยกใน Product master ไม่ปนกับ Safety Days (ROP) ของ Supply
- **AS OF:** ถ้ามีธุรกรรม Ops แล้ว AS OF ล่าสุด = วันจันทร์ถัดจากรอบดึง WMS (เช่น 30 พ.ย. 2026) และเป็นค่าเริ่มต้น · AS OF 23 พ.ย. ยังให้ตัวเลข Anchor เดิมทุกค่า (ย้อนคำนวณจาก Snapshot ใหม่ได้ตรง)
- **Run Rate** คิดถึงสัปดาห์สุดท้ายของประวัติ Integrated demo เท่านั้น (สัปดาห์หลังจากนั้นมีแต่ธุรกรรมสาธิต — ถ้านับจะทำให้ Run Rate ตกผิดจริง)
- **selfCheck ใหม่ (6.3):** (7) WH ของ Supply = WMS Actual ทุก SKU · (8) Σ Sales In ของงวด = Σ ออเดอร์ Delivered ของงวด · (9) Quota จัดสรร / จอง / หักจริง = Ops ทุกคู่ค้า × SKU × เดือน — แสดงที่หน้า ข้อมูล & ตั้งค่า Supply และ Console

### F5 In-transit · F6 CN Good / Bad · F9 Clearance
- **F5:** การ์ดมูลค่า Stock มีส่วน "ระหว่างขนส่ง" · Projection มีชั้นที่ 3 (ของถึงคู่ค้าตาม Delivery lead days ของคู่ค้า) · ตาราง Stock มีคอลัมน์ระหว่างขนส่ง · Waterfall และ selfCheck ข้อ 4 รวมระหว่างขนส่งใน Total (แสดงเมื่อมีของระหว่างขนส่ง)
- **F6:** คลังตรวจรับคืนต้องแยก ดี + เสีย ให้ครบจำนวน (เดิม) และ**ต้องใส่เหตุผลเมื่อมีของเสีย** (ใหม่) · หน้ารับคืนจาก WMS แสดงสภาพ · ฝั่ง Supply: Good = กลับเข้า WH · Bad = Write-off
- **F9:** Admin › รายการสินค้า › ตั้ง / แก้ไขสินค้า มีช่อง "สถานะสินค้า (Supply)" New / Active / Discontinue / Clearance (บันทึก Audit) · Clearance ไม่ขึ้นเสี่ยงขาด / สั่งผลิตเลย, Suggested Qty = 0, คำแนะนำ "ขายเคลียร์"

### calc.js ที่แก้ (ทุกจุดมี `// CR-01`)
`prepare` อ่าน `in_transit`, `quota.reserved_qty / committed_qty`, `_history_end` · `itAt()` ใหม่ · `stockAt` แยกระหว่างขนส่งออกจาก WH · `skuRow` / `projectSku` / `seriesOf` / `waterfallOf` / `skuDetail` / `replenList` / `selfCheck` (reconcile) รวมระหว่างขนส่ง · `runRate` หยุดที่ปลายประวัติ · สถานะ Clearance (`skuRow`, `recommend`, `replenList`) — สูตรเดิมทั้งหมดไม่เปลี่ยน เมื่อไม่มีธุรกรรม Ops ผลลัพธ์เท่าเดิมทุกตัว

## ประโยชน์ใหม่ B1–B5 และ F7 (Phase C) — `supply-actions.js`

| | ที่ไหน | ทำอะไร |
|---|---|---|
| **B1 ATP** | เปิด SO · MT/TT (ฟอร์มขอ SO) · หน้าออเดอร์ · สินค้าคงคลังและโควตา › ตรวจ Actual | แถวที่ "WMS ไม่พอ" แสดง **ของจะพอวันที่…** + เลข PO / CN ที่ทำให้พอ + ลิงก์ Stock & Projection (เฉพาะคนที่เปิดหน้า Supply ได้) · สูตร: วันแรกที่ `WMS ใช้ได้ − Safety Units − ยอดจอง/หักที่ยังไม่ส่ง (= workPhysicalAvailable ของ Ops) + PO Confirmed/Shipped + CN Good ที่ Approved` ≥ จำนวนที่ขอ · มองไป 6 เดือน ไม่มี → "ยังไม่มีแผนของเข้า" · **แสดงผลอย่างเดียว** ไม่จอง ไม่ปลดบล็อก · ไม่นับ PO Planned / Delayed · คำนวณใหม่ทุกครั้งที่เปิด จึงเปลี่ยนทันทีเมื่อ WMS version หรือ ETA เปลี่ยน |
| **B2 แผง Quota** | ฟอร์ม ขอรับสต็อก / Director Override (ตามช่อง SKU · ช่องทาง · จำนวน) · ปุ่ม "◈ Supply" ข้างปุ่ม "ส่งให้ผู้ขอ" · Quota Draft | Run Rate (Sell-out) · Quota Fit เดือนนี้ (+ หลังคำขอนี้) · MAPE / Bias 3M · Coverage 1/3/6M · Stockout Date · สถานะ SKU — **ใช้ `Calc.quotaOf` ชุดเดียวกับหน้า Quota vs Actual** (AS OF / ขอบเขตฝ่าย / Run Rate เดียวกัน) · เตือน (ไม่บล็อก): Fit > 120% "ตั้งสูงกว่ายอดขายจริง…" · Coverage < 100% "Supply ไม่พอตาม Quota นี้" |
| **B3 ข้อเสนอ Supply** | ปุ่ม "เสนอ" ในตาราง ฝากขาย (แนะนำเรียกคืน) · เสี่ยงหมดอายุ (Lot ที่แนะนำ CN) · Quota vs Actual (Quota เดือนถัดไป = Run Rate × วัน = Fit 100%) · วางแผนสั่งผลิต (จำนวนสั่งที่ปัดตาม MOQ) · เมนู Supply › ข้อเสนอ Supply · งานค้างและส่งมอบ (ส่วน "ข้อเสนอ Supply") | Draft → ส่งขออนุมัติ → อนุมัติ / ปฏิเสธ (ต้องมีเหตุผล) → Done · **รวมใบซ้ำ** (ประเภท + SKU + คู่ค้า + งวด) · **ผู้สร้างอนุมัติเองไม่ได้** · ทุกขั้นบันทึกใน ประวัติการทำงาน · มีผู้รับผิดชอบ / ครบกำหนด / ความสำคัญ / บันทึก · ผู้อนุมัติ: เรียกคืน = Director หรือ Manager MT · Quota = Manager ฝ่ายนั้น (หรือ Director) · PO = Director |
| ปลายทางเมื่ออนุมัติ | | เรียกคืน → **คำขอเรียกคืน (Draft)** ในหน้าคืนสินค้า / CN (ฝ่ายขายกดยืนยันส่ง → Done) และเป็น CN Planned ฝั่ง Supply · Quota → **Quota Draft เดือนถัดไป** ในหน้าสินค้าคงคลังและโควตา (ไม่นับใน Quota เดือนนี้ · ส่งขออนุมัติ → Done · Admin อนุมัติตาม Flow เดิม → เป็น Quota ของเดือนนั้นฝั่ง Supply) · PO → `po_inbound` **Planned** (เห็นใน Projection ไม่นับ ATP · Planner ยืนยันเป็น Confirmed → Done) + ปุ่ม Export ใบเสนอสั่งผลิต |
| **B4 Supply Alert** | หน้าหลัก (ใต้ตัวเลขยอดขาย) | เสี่ยงขาด · สั่งผลิตภายใน 30 วัน · เสี่ยงหมดอายุ 3M (มูลค่า) · ข้อเสนอรออนุมัติ — กดไปหน้าที่เกี่ยวข้อง (ถ้ามีสิทธิ์) · นับตามขอบเขตฝ่าย · ไม่แสดงถ้าไม่มี `supply.view` |
| **B5 Supply Review** | Supply Review | + "สถานะปฏิบัติการ" (งานที่ต้องติดตาม · เกินกำหนด · ต้องตรวจโควตาใหม่ · ใบส่งมอบรอยืนยัน · WMS แจ้งปัญหา — ตัวเลข ณ ตอนนี้ ตามขอบเขตผู้ใช้) + "ข้อเสนอ Supply ในงวดนี้" (สร้าง / อนุมัติ / ปฏิเสธ + รายการ) · รวมใน Print A4 · Excel (ชีต Operations / Proposals) · JSON |
| **F7 ETA PO** | Supply › ของเข้า & CN Calendar และ › วางแผนสั่งผลิต (การ์ด "PO ที่ยังไม่รับเข้า" — ผู้มี `supply.import` = Planner / Admin) | แก้ ETA · สถานะ Planned / Confirmed / Shipped / Delayed / Received / Cancelled · เหตุผล (บังคับเมื่อ Delayed หรือเลื่อน ETA ออกไป) · มีประวัติการแก้ + Audit · Projection / Calendar / ATP ใช้ค่าใหม่ทันที · Received ได้เฉพาะชุด Integrated demo (WMS DEMO รับเข้าในรอบดึงถัดไป และเพิ่ม Lot ใหม่ใน Supply) |

- ข้อมูล Phase C อยู่ใน db ของ Ops: `supplyProposals` · `recallRequests` · `poPlan` (`edits` + `added`) · Quota Draft = รายการใน `allocations` ที่มี `month` เดือนถัดไป + `proposalId` — Feed (supply-feed.js) นำไปลงตาราง Supply (PO / CN Planned / Quota เดือนอื่น) · ชุด UAT seed ใช้ได้เฉพาะการแก้ PO
- ใน Integrated demo Quota ของ Ops = เดือน พ.ย. 2026 เท่านั้น: Quota Draft เดือนอื่นไม่ถูกนับใน "ใช้ได้" / "ส่วนกลางโควตา" ของเดือนนี้
- ปุ่ม "เสนอ" อยู่ในตารางแบบ Desktop (บนมือถือ ตารางเป็นการ์ด — ยังไม่มีปุ่ม)

## ธีม (CR-01 ข้อ 4)
ธีม Ops (Sidebar กรมท่า · ปุ่มฟ้า · Card ขาว) ทั้งระบบ + **สว่าง / มืด / ตามระบบ** ที่ Header (`localStorage['ops.theme']`) · โหมดมืดของ Ops สร้างจากกฎสีของธีมสว่างโดย `tools/build_css.py` · สีสถานะ (แดง/ส้ม/ม่วง/เขียว/เทา/ดำ) และสีกราฟของ Supply คงเดิม · ปีเป็น ค.ศ.

## Anchor (Integrated demo · AS OF 23 พ.ย. 2026 · Weekly · L4W · 3M · ไม่กรอง) — ตรงทุกค่า
มูลค่า Stock ฿50,091,183 (WH ฿39,518,371 · ฝากขาย ฿10,572,812) · หน่วย 514,864 / 136,418 / 651,282 · DOC 73 วัน · Sell-through 17.8% · สถานะ 7 / 2 / 9 / 98 / 4 (+ หมดอายุ 7) · At-risk 3M ฿547,597 (4,489 ชิ้น) · แนะนำเรียกคืน ฿519,974 (11 คู่, 7,194 ชิ้น) · Quota Fit 92% (107/116) · MAPE 13.5% · Bias −4.2% · Fill Rate 93.1% · Achievement MTD 94.1% · selfCheck PASS ทั้ง 5 ข้อ

## การทดสอบ
`tools/uat-supply.js` — รันใน DevTools ของหน้าเว็บ (หรือแทรก `<script src="tools/uat-supply.js">`) แล้วเรียก `await SupUAT.all()`

| ชุด | ตรวจอะไร |
|---|---|
| SUP-ANCHOR | ตัวเลข 2.3 ทุกค่า + selfCheck + modelCheck |
| SUP-MENU-{11 บัญชี} | เมนู Supply ตาม 7.3 + ลิงก์ตรงที่ไม่มีสิทธิ์ถูกปฏิเสธ |
| SUP-NOLEAK-mgr-{mt,tt,ecom} | ทุกหน้า Supply + Label กราฟ + Drawer SKU ไม่มีชื่อคู่ค้า/ช่องทางฝ่ายอื่น |
| SUP-THEME-{light,dark} | ทุกหน้า Supply ไม่มี Error |
| OPS-GATE-{11 บัญชี} | ทุกหน้า Ops เปิดได้/ถูกปฏิเสธ **ตรงกับเว็บต้นฉบับ v13** และไม่มี Error / "undefined" |
| SUP-MOBILE (`SupUAT.mobile()`) | ตั้ง Viewport 390px ก่อน — ทุกหน้าไม่ล้นแนวนอน |
| **Phase C** `SupUAT.phaseC()` (Integrated demo) | SUP-PROP-MERGE · SUP-PROP-SELF · SUP-PROP-REJECT · SUP-PROP-recall / quota / po · ปลายทาง → Done + Quota เดือนถัดไปถึง Supply · SUP-ETA (ประวัติ / เหตุผล) · ATP (Planned ไม่นับ · Confirmed / Shipped นับ · ETA เลื่อน → วันที่เลื่อน) · SUP-ATP-MT / TT (ฟอร์ม SO) / Ecom (หน้าออเดอร์) ไม่ปลดบล็อก · SUP-B2-MATCH · SUP-B4 · SUP-B5 · selfCheck 1–9 · Anchor ที่ AS OF 23 พ.ย. |
| **Phase B** `SupUAT.flow()` (ต้องเป็น Integrated demo ที่เพิ่งเริ่ม) | ออเดอร์ 7-Eleven 40 ชิ้น → SO/IV (SLA) → WMS พร้อมส่ง → ส่งมอบขนส่ง → ดึง WMS → Delivered → ดึง WMS → คืน 30 (ดี 25 / เสีย 5) → WMS รับคืน → ดึง WMS · ตรวจ SUP-FEED-DELIVERED (IV ยังไม่ออกจากคลัง = ไม่ขยับ · ระหว่างขนส่ง · Sales In / Remaining) · SUP-FEED-IDEMP · SUP-READONLY · SUP-CN-COND · SUP-SC-7/8/9 · selfCheck 1–9 · Anchor ที่ AS OF 23 พ.ย. หลังทำธุรกรรม |

> ชุด UAT 943 ข้อของ Ops เดิมรันซ้ำไม่ได้ (ไม่มี Source / Harness / fixture) — ใช้ OPS-GATE เทียบกับเว็บต้นฉบับแทนในตอนนี้

## โครงไฟล์
```
index.html                 Shell เดิมของ Ops + โมดูล Supply + overlays ของ Supply (.sup)
style.css                  GENERATED — Ops 7.0 (แยกจาก .sup) + โหมดมืด + ส่วนเพิ่ม CR-01
app.js … work-operations.js  ไฟล์ Ops 7.0 (แก้เฉพาะจุดที่มี /* CR-01 */ — ดูด้านล่าง)
supply-feed.js             ใหม่ (Phase B) — Data Adapter Ops → Supply · selfCheck 7–9 · WMS DEMO ของ Integrated · F6 · F9
supply-planning.js         ใหม่ — เมนูกลุ่ม · Planner · supply.* · Page gate · ธีม · ชุดสาธิต · ลิงก์ข้ามหน้า
supply-actions.js          ใหม่ (Phase C) — B1 ATP · B2 แผง Quota · B3 ข้อเสนอ Supply · B4 Supply Alert · B5 · F7 แก้ PO
supply/host.js             ใหม่ — รันหน้า Supply ใน Shell ของ Ops (Filter, URL, โหลดข้อมูล, สิทธิ์ Export)
supply/*.js, supply/pages/*.js   SCM v3.3 (calc.js ไม่แก้ · หน้าแก้เฉพาะ CR-01)
supply/supply.css          GENERATED — CSS ของ SCM อยู่ใต้ .sup + Token ของ Ops
supply/README-supply.md    สูตรและข้อตัดสินใจของ Supply (README เดิมของ SCM)
data/*.csv · mock-bundle.js  ตาราง Supply 8 ตาราง (Integrated demo)
tools/generate_mock.py     สร้างข้อมูล (+ ร้าน Ecom 3 ร้าน)
tools/build_css.py · tools/src/   สร้าง style.css / supply/supply.css จากต้นฉบับ
tools/uat-supply.js        ชุดตรวจในเบราว์เซอร์
_archive/                  งานรอบก่อน (สร้าง Ops ใหม่จาก Spec) — เก็บไว้อ้างอิง ลบได้
```

### จุดที่แก้ในไฟล์ Ops เดิม (ทั้งหมดมีคำว่า CR-01 หรือเห็นได้จาก diff)
- `app.js` ชื่อ Sidebar/Footer · Sidebar เรียก `supNavGroups()` · `crPid()` / `crSku()` (alias ของชุด Integrated) · ค่าเริ่มต้น SKU ของฟอร์มจัดสรร
- `documents.js`, `order-workspace.js`, `stock-governance.js`, `ecommerce.js` ค่าเริ่มต้นที่ระบุ `p6` / `16160` / `11021` / `ec-*` ผ่าน `crPid()` / `crSku()` (UAT seed ได้ค่าเดิมทุกตัว)
- ไฟล์ Ops อื่นไม่ถูกแก้ · ส่วนเพิ่มทั้งหมดอยู่ใน `supply-planning.js` โดยครอบฟังก์ชันเดิมแบบเดียวกับโมดูลอื่นของ Ops

### จุดที่แก้ในโมดูล Supply (SCM v3.3)
- `i18n.js` ตัวแปลภาษาเป็น `window.St` (Ops ใช้ `t` อยู่แล้ว) + `I18N.add()` + ข้อความ CR-01 · ไฟล์อื่นผูก `const t = global.St`
- `ui.js` / `charts.js` id ของ overlay เป็น `supDrawer` / `supModal` / `supToast` · กราฟอ่านสีจาก `.sup` · `U.maskTo()` / `U.foreignAcc()` (NOLEAK)
- `pages/stock.js` Drawer ของผู้ใช้ที่ล็อกฝ่ายแสดงเฉพาะคู่ค้าและ Lot ของฝ่าย (Lot ที่ WH × สัดส่วนที่ปันให้) · `pages/consign.js` ปลายทางเรียกคืนผ่าน `U.maskTo()` · `pages/report.js` Export JSON ไม่แนบ Commentary ฝ่ายอื่น
- `calc.js` แก้เฉพาะ Adapter / F5 / F9 ใน Phase B (ดูหัวข้อ Data Adapter) · Phase A มีแค่บรรทัดผูก `t`
- `host.js` (Phase B) `App.base` = ตาราง Integrated demo · `App.raw` = base + Feed · สร้าง DB ใหม่เมื่อ Ops เปลี่ยน (Feed key) · selfCheck รวมข้อ 7–9
- `pages/overview.js` · `stock.js` · `quota.js` (Phase B) ระหว่างขนส่ง (การ์ด / กราฟชั้นที่ 3 / คอลัมน์) · คอลัมน์ จอง (SO) / หักแล้ว / คงเหลือ ของเดือนที่ Ops ดูแล

### สร้าง CSS ใหม่
แก้ `tools/src/*.css` แล้วรัน `python tools/build_css.py` · ทุกครั้งที่แก้ไฟล์ให้เปลี่ยน `?v=` ใน `index.html`
