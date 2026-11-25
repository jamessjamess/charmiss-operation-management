# Charmiss Supply Chain Dashboard (HTML Prototype)

Web prototype สำหรับ Weekly / Monthly Report ของทีม Supply Chain — HTML + CSS + Vanilla JS (static, ไม่มี Backend / Database)
ใช้ Design System เดียวกับ KOL Tracker (`[Charmiss] - KOL & Affiliate/KOL Web Dev`)

| Phase | หน้า | สถานะ |
|---|---|---|
| 1 | Layout · Design System · Responsive · TH/EN · Light/Dark/System · Mock Data · `calc.js` · `selfCheck()` · **Overview** · **Stock & Projection** | ✅ เสร็จ |
| 2 | **Expiry Risk** · **Consignment** · **Inbound & CN Calendar** | ✅ เสร็จ |
| 3 | **Replenishment** (What-if, ใบเสนอสั่งผลิต) · **Quota vs Actual** · **Report** (Print A4 / Excel / JSON) · **Data & Settings** (Import CSV, Threshold) | ✅ เสร็จ |

## เปิดใช้งาน

- **ดับเบิลคลิก `index.html`** — เปิดได้เลย (อ่านข้อมูลจาก `data/mock-bundle.js`) ต้องต่ออินเทอร์เน็ตเพื่อโหลด Chart.js / SheetJS / PapaParse / ฟอนต์จาก CDN
- **Local server** — `python -m http.server 8780` ในโฟลเดอร์นี้ แล้วเปิด http://localhost:8780 (อ่าน `data/*.csv`)
- **GitHub Pages** — push ทั้งโฟลเดอร์ขึ้น repo → Settings › Pages › Deploy from branch (`main` / root) ใช้ได้ทันที ไม่ต้อง build

ลิงก์จำ Filter ไว้ใน URL เช่น `#/stock?asof=2026-11-16&view=M&ch=MT&rr=W&h=6&sku=TF-FD-003` — แชร์ลิงก์แล้วเห็นมุมมองเดียวกัน (รวม Drawer ของ SKU)

## โครงไฟล์

```
index.html            shell: sidebar · topbar (Global Filter) · drawer · modal
css/styles.css        design tokens (Light/Dark) · responsive ≥1200 / 768–1199 / <768
js/calc.js            ★ สูตรทั้งหมด (pure functions) — ทุกตัวเลขในทุกหน้ามาจากไฟล์นี้
js/app.js             โหลดข้อมูล · filter state ↔ URL · router · theme · ภาษา
js/charts.js          Chart.js theme + Chart card (สลับตาราง / ดาวน์โหลด PNG-Excel / ขยาย)
js/ui.js              format (฿, คั่นหลักพัน, DD MMM YYYY ค.ศ.) · multi-select · drawer · modal · toast
js/i18n.js            TH (ค่าเริ่มต้น) / EN
js/pages/overview.js  ภาพรวม
js/pages/stock.js     Stock & Projection + SKU drawer
js/pages/expiry.js    เสี่ยงหมดอายุ (KPI 1M/3M/6M · Heatmap · Aging · ตาราง Lot)
js/pages/consign.js   ฝากขาย (Sales In vs Out · Matrix SKU × คู่ค้า · แนะนำเรียกคืน)
js/pages/calendar.js  ของเข้า & CN Calendar (ปฏิทิน · Timeline PO · ตาราง PO/CN)
js/pages/replen.js    วางแผนสั่งผลิต (What-if · ตารางแก้จำนวนได้ · Excel ใบเสนอสั่งผลิต)
js/pages/quota.js     Quota vs Actual (KPI · Combo รายเดือน · Scatter · Account × SKU)
js/pages/report.js    รายงาน Weekly / Monthly (Print A4 แนวนอน · Excel · JSON · Commentary)
js/pages/settings.js  ข้อมูล & ตั้งค่า (Import CSV · Template · Reset to Mock · Self-check · Threshold)
js/data.js            Schema 8 ตาราง · ตรวจ CSV ทีละแถว · เก็บไฟล์ที่ Import ใน IndexedDB
data/*.csv            Mock data (8 ตาราง) · data/mock-bundle.js = CSV ชุดเดียวกันสำหรับเปิดแบบ file://
tools/generate_mock.py  สร้าง Mock data ใหม่: python tools/generate_mock.py
```

## Data model (`data/*.csv`)

| ตาราง | คอลัมน์ |
|---|---|
| sku_master | sku, name, brand, category, uom, unit_cost, std_price, shelf_life_months, moq, lead_time_days, safety_days, status (Active/NPD/Discontinue) |
| account_master | account_id, name, channel (MT/TT/ECOM), sub_channel, is_consignment (Y/N), min_shelf_life_pct, delivery_lead_days |
| stock_lot | **snapshot_date**, sku, lot_no, location (`WH` หรือ account_id), qty, mfg_date, exp_date |
| sales_in | date (วันจันทร์ของสัปดาห์), sku, account_id, qty, value |
| sales_out | date (วันจันทร์ของสัปดาห์), sku, account_id, qty, value |
| cn | cn_no, date, sku, account_id, qty, reason, condition (Good/Bad), status (Planned/Approved/Received) |
| po_inbound | po_no, sku, qty, order_date, eta_date, **received_date**, status (Planned/Confirmed/Shipped/Received/Delayed), supplier |
| quota | month (YYYY-MM), sku, account_id, quota_qty |

คอลัมน์ที่เพิ่มจาก Spec: `stock_lot.snapshot_date` (วันที่ของ Snapshot — ถ้าไม่มีจะใช้วันจันทร์หลังสัปดาห์สุดท้ายของยอดขาย) และ `po_inbound.received_date` (วันที่รับจริง ใช้คำนวณ Stock ย้อนหลังและ PO On-time % ใน Phase 2)

Mock data: 120 SKU (4 Brand · 6 Category) · 12 คู่ค้า (MT 7 รายฝากขาย · TT 2 · ECOM 3 ขายขาด) · Sales In/Out รายสัปดาห์ 52 สัปดาห์ · PO ล่วงหน้า 6 เดือน · CN รับแล้ว + วางแผน · Quota 18 เดือน
Scenario ที่ใส่ไว้: SKU ขายดีจาก TikTok จนเสี่ยงขาด (TF-SK-003, CM-FD-003, CP-PW-001, JB-SK-002) · หยุดสั่งตั้งแต่สัปดาห์ 40 · Overstock + ใกล้หมดอายุที่ Big C (TF-FD-003) · MOQ ใหญ่เกินยอดขาย (JB-FD-002 …) · Quota สูงเกิน / ต่ำเกิน · PO Delayed · NPD ทั้งที่เพิ่งเปิดขาย มีของแต่ยังไม่ขาย และมีแค่ PO · Recall CN

## สูตร (ทั้งหมดอยู่ใน `js/calc.js`)

**โมเดล Stock**
- WH = + PO received + CN Good (ทุกคู่ค้า) − Sales In (ทุกคู่ค้า)
- Consignment Remaining (คู่ค้าฝากขาย) = Opening + Sales In − Sales Out − CN
- คู่ค้าขายขาด (TT/ECOM): Sales In = Sales Out (กรรมสิทธิ์โอนตอนส่ง) จึงไม่มีของค้างที่คู่ค้า
- Total Stock = WH + Σ Consignment ⇒ ΔTotal = PO รับ + CN Good จากคู่ค้าขายขาด − Sales Out − CN Bad (Write-off)
- CN Good จากคู่ค้าฝากขาย = ย้ายของกลับ WH (Total ไม่เปลี่ยน) · CN Bad = ตัดออก (Write-off)
- Stock ณ AS OF ย้อนหลัง = Snapshot − ทุกการเคลื่อนไหวระหว่าง AS OF ถึงวัน Snapshot

**Run Rate / DOC**
- Run Rate (Sell-out) = ค่าเฉลี่ย Sales Out ต่อวัน: L4W = 4 สัปดาห์ · L3M = 13 · L6M = 26 · Weighted = 50% L4W + 30% L3M + 20% L6M (SKU ที่เพิ่งเริ่มขาย เฉลี่ยตั้งแต่สัปดาห์แรกที่ขาย)
- DOC = Stock ÷ Run Rate ต่อวัน · MOS = DOC ÷ 30 · DOC รวม (KPI) ถ่วงด้วยมูลค่า = Σ Stock × cost ÷ Σ Run Rate × cost
- Sell-through % = Sales Out ÷ (Consignment ต้นงวด + Sales In) — เฉพาะคู่ค้าฝากขาย

**Projection** (คำนวณรายวัน 365 วัน แล้วอ่านค่าที่ +1/+3/+6 เดือน และรายสัปดาห์สำหรับกราฟ)
- WH(t) = WH(t−1) + PO (ตาม ETA) + CN Good − Sales In Plan · Sales In Plan = Quota เดือนนั้น ÷ วัน (คู่ค้าฝากขาย, ถ้ามี) ไม่งั้นใช้ Run Rate
- Rem(t) = Rem(t−1) + Sales In Plan − Run Rate − CN (ต่อคู่ค้า)
- Total = WH + Σ Rem ⇒ เท่ากับ Stock(m) = Stock(m−1) + PO − Run Rate × วัน − CN Bad
- ห้ามติดลบ: WH ไม่พอ → ส่งเฉลี่ยตามสัดส่วน · คู่ค้าไม่มีของ → ขายเท่าที่มี ส่วนที่ขาด = Lost Sales (แยกไว้)
- Stockout Date = วันแรกที่ Projected Total ≤ 0 (เกิน 365 วันใช้ Stock คงเหลือ ÷ Run Rate)

**Replenishment**
- ROP = Run Rate × (Lead Time + Safety Days)
- Order-by Date = Stockout Date − Lead Time − Safety Days − Delivery Lead Days (ใช้คู่ค้าที่ส่งนานที่สุดที่ขาย SKU นั้น)
- Suggested Order Qty = Run Rate × (Lead Time + 90 วัน) − (Total Stock + Open PO) → ปัดขึ้นเป็นทวีคูณ MOQ

**Expiry Risk (FEFO)**
- Sellable Deadline: ของที่อยู่คู่ค้าแล้ว = exp_date · ของที่ยังอยู่ WH = exp_date − shelf_life × min_shelf_life_pct
  (min_shelf_life_pct ของ WH = ค่าเฉลี่ยถ่วงด้วย Run Rate ของคู่ค้าที่ขาย SKU นั้น)
- ตัด Run Rate ของแต่ละที่เก็บออกจาก Lot ที่หมดอายุก่อน → At-risk Qty = ส่วนที่ยังขายไม่หมดเมื่อถึง Deadline · At-risk Value = Qty × unit_cost
- KPI At-risk Value นับ Lot ที่ Deadline อยู่ภายใน Horizon (1M/3M/6M) · Badge "เสี่ยงหมดอายุ" ดู 180 วัน

**Quota Fit** = Quota เดือน AS OF ÷ (Run Rate × วันในเดือน) → 80–120% = เหมาะสม (KPI = % SKU ที่เหมาะสม)

**หน้าเสี่ยงหมดอายุ (Phase 2)**
- KPI At-risk ภายใน 1M / 3M / 6M = Lot ที่ Sellable Deadline อยู่ภายในช่วงนั้น (รวมที่เลยแล้ว) และคาดว่ายังขายไม่หมด · การ์ดของ Horizon ที่เลือกมีกรอบ · "เลย Deadline แล้ว" = Deadline < AS OF
- Heatmap = มูลค่า Stock (หรือ At-risk) ตามหมวด × เดือนที่หมดอายุ: หมดแล้ว · 12 เดือนจาก AS OF · > 12 เดือน (สีเทา ไม่นับในสเกลสี)
- Stock Aging = มูลค่าตามจำนวนเดือนก่อนหมดอายุ: หมดแล้ว · < 3 · 3–6 · 6–12 · > 12 เดือน (WH / ฝากขาย)
- Action ต่อ Lot: หมดอายุแล้ว → Write-off · อยู่ที่คู่ค้า → เรียกคืน (CN) ไปช่องทางที่ Run Rate สูงกว่า (ไม่มี → โปรโมชั่นที่คู่ค้านั้น) · อยู่ WH และเลย Deadline → ส่ง TT/ECOM (รับอายุสั้น) / Clearance · อยู่ WH ยังไม่เลย → โปรโมชั่น
- ผลรวม At-risk ในตาราง Lot = KPI = ตัวเลข At-risk ในหน้าภาพรวม · ผลรวมมูลค่าทุก Lot = มูลค่า Stock รวม

**หน้าฝากขาย (Phase 2)** — เฉพาะคู่ค้า is_consignment = Y ที่อยู่ในตัวกรอง
- ต่อคู่ SKU × คู่ค้า: Remaining · DOC = Remaining ÷ Run Rate ของคู่ค้า · Sell-through = Sales Out ÷ (ต้นงวด + Sales In)
- สถานะคู่: ของหมด (Remaining 0 แต่ยังมี Run Rate / Quota) · ใกล้หมด (DOC < 14 วัน) · ค้างมาก (DOC > 120 วัน หรือ Sell-through < 5% ต่อสัปดาห์ / 20% ต่อเดือน) · ◆ = มีของเสี่ยงหมดอายุภายใน 180 วัน
- แนะนำเรียกคืน (CN) เมื่อค้างมากหรือเสี่ยงหมดอายุ: จำนวน = Remaining − Run Rate × 45 วัน (อย่างน้อยเท่าของที่เสี่ยงหมดอายุ) → ปลายทาง = คู่ค้า/ช่องทางที่ Run Rate สูงสุด (ช่องทางเดียวกันแสดงชื่อคู่ค้า) ไม่มี → Clearance
- กราฟ Sales In vs Sales Out: เทียบทุกคู่ค้าในงวดที่เลือก หรือเลือกคู่ค้าเพื่อดู 12 งวดย้อนหลัง (ตาม VIEW BY) · Remaining = ณ สิ้นงวด
- มูลค่าฝากขาย = ส่วน "ฝากขาย" ในหน้าภาพรวม · Sell-through = KPI หน้าภาพรวม (ตัวเดียวกัน)

**หน้าของเข้า & CN Calendar (Phase 2)**
- สถานะ ณ AS OF: PO ที่รับหลัง AS OF ถือว่ายังเปิดอยู่ (เลย ETA = Delayed) · CN ที่รับหลัง AS OF = Approved
- วันที่บนปฏิทิน: PO รับแล้ว = วันรับจริง · PO เปิด = ETA (เลยกำหนดแล้วอยู่ที่ AS OF) · CN = วันที่ใน CN
- KPI: PO เข้าภายใน Horizon · CN คืนภายใน Horizon (Good / Bad) · PO Delayed ตอนนี้ · PO On-time % = PO ที่รับใน 90 วันล่าสุดที่รับไม่เกิน ETA (เทียบ 90 วันก่อนหน้า)
- Timeline PO: แท่งจากวันสั่งถึง ETA (ที่รับแล้วถึงวันรับจริง) · แดง = Delayed

**สถานะ SKU** (1 สถานะต่อ SKU, เสี่ยงหมดอายุซ้อนได้)
เสี่ยงขาด: Stockout Date ≤ AS OF + Lead Time + Safety → สั่งผลิตเลย: Order-by ≤ AS OF + 30 วัน → สต็อกเกิน: DOC > 180 วัน → ปกติ
NPD ที่ยังไม่มียอดขาย = สถานะเทา · Discontinue ไม่ขึ้น "เสี่ยงขาด / สั่งผลิตเลย"
Threshold ทั้งหมด (ค่าเริ่มต้นใน `Calc.DEFAULT_SETTINGS`) แก้ได้ที่หน้า **ข้อมูล & ตั้งค่า** — เก็บใน localStorage ของเบราว์เซอร์นั้น

**หน้าวางแผนสั่งผลิต (Phase 3)**
- ตาราง "ถึงจุดสั่ง" = สถานะเสี่ยงขาด / สั่งผลิตเลย หรือ Stock + Open PO ≤ ROP (ไม่รวม Discontinue) · สลับดู Suggested > 0 / ทั้งหมดได้
- จำนวนที่จะสั่งเริ่มจาก Suggested Qty แก้ได้ (เก็บใน localStorage · ไม่ใช่ทวีคูณ MOQ จะขึ้นกรอบเตือน) → Excel "ใบเสนอสั่งผลิต" เฉพาะแถวที่จำนวน > 0 พร้อม Supplier ล่าสุด, Order-by และวันที่คาดว่าเข้าถ้าสั่งวันนี้
- What-if: Run Rate × (1 ± %) ใช้กับทุกสูตร (Projection, DOC, ROP, Order-by, Suggested, สถานะ และแผน Quota ส่งคู่ค้า) · Lead Time ± วัน ใช้กับ ROP / Order-by / Suggested / เกณฑ์เสี่ยงขาด และเลื่อน ETA ของ PO ที่ยัง Planned · ไม่บันทึกลงลิงก์
- Lost Sales ในตารางเทียบ = มูลค่าที่ขายไม่ได้ภายใน Horizon ถ้าไม่สั่งเพิ่ม (คิดจากราคาขายเฉลี่ยของคู่ค้า)

**หน้า Quota vs Actual (Phase 3)**
- Quota Achievement % = Sales In ÷ Quota ของงวด (Quota รายเดือนเฉลี่ยเป็นรายวัน จึงเทียบรายสัปดาห์ / MTD ได้)
- Quota Fit % = Quota เดือน AS OF ÷ (Run Rate × วันในเดือน) → > 120 ตั้งสูงเกิน · 80–120 เหมาะสม · < 80 ตั้งต่ำเกิน · ถ้า SKU ของไม่พอ (เสี่ยงขาด หรือ WH < 1 สัปดาห์ของ Run Rate) และ Fit ≤ 120 = **ขายดีแต่ Supply ไม่พอ**
- MAPE = Σ|Quota − Sales Out| ÷ Σ Sales Out (ถ่วงด้วยยอดขาย) · Bias = Σ(Quota − Sales Out) ÷ Σ Sales Out · ช่วง 3 / 6 เดือนที่จบแล้ว · ยอดรายสัปดาห์แบ่งเข้าเดือนตามจำนวนวัน
- Supply Fill Rate % = Sales In ÷ Quota เฉพาะ SKU-เดือนที่ WH ต่ำสุด (ต้นสัปดาห์) < Sales In 1 สัปดาห์ · ส่วนที่ไม่ได้ส่ง = "Supply ไม่พอ" (เดือนที่ของไม่พอ) / "คู่ค้าไม่สั่ง" (เดือนที่ WH มีของ)
- Quota Coverage % = (WH + PO ที่ ETA อยู่ใน Horizon) ÷ Quota ของ Horizon นับจาก AS OF (ระดับ SKU, ปันส่วนตามตัวกรอง)
- Scatter: X = Quota Fit (ตัดที่ 300%), Y = Sell-through ของคู่ค้าฝากขาย · Combo: 12 เดือนย้อนหลัง + เดือนนี้ (MTD, Quota ตามวันที่ผ่านไป) + Quota 3 เดือนข้างหน้า

**หน้ารายงาน (Phase 3)**
- ใช้ AS OF / VIEW BY / ตัวกรองเดียวกับทุกหน้า · KPI 11 ตัวเทียบช่วงก่อน (สีลูกศรตามทิศดี/ไม่ดี) · Top Risk 3 กลุ่ม · PO เข้าใน 30 วัน · CN ที่วางแผนใน Horizon · Quota Highlight · Commentary
- Commentary เก็บใน localStorage แยกตาม VIEW BY + งวด + ตัวกรอง · Export JSON (รายงานนี้ + Commentary ทุกงวด) และ Excel 6 ชีต · Print / PDF เป็น A4 แนวนอน (ซ่อนเมนู/ตัวกรอง)

**หน้าข้อมูล & ตั้งค่า (Phase 3)**
- Import CSV ทีละตาราง: ตรวจคอลัมน์ที่ต้องมี, ค่าว่าง, ตัวเลข, ติดลบ, วันที่ YYYY-MM-DD, เดือน YYYY-MM, ค่าที่อนุญาต (status / channel / Y-N / Good-Bad), รหัสซ้ำใน Master → บอกเป็นบรรทัด · มี Error = นำเข้าไม่ได้ · SKU/คู่ค้าที่ไม่อยู่ใน Master = คำเตือน (Self-check จะแจ้ง)
- ไฟล์ที่ Import เก็บใน IndexedDB ของเบราว์เซอร์ (ไม่ส่งออกไปไหน) · Reset to Mock รายตาราง / ทั้งหมด · Template = หัวคอลัมน์ + 2 แถวตัวอย่าง (UTF-8 BOM เปิดใน Excel ได้)

## Global Filter
- AS OF = วันจันทร์ (Stock ณ ต้นวัน) ค่าเริ่มต้น = วันจันทร์ล่าสุดที่มีข้อมูล
- VIEW BY: Weekly = สัปดาห์ จ.–อา. ก่อน AS OF · Monthly = เดือนของสัปดาห์ล่าสุด (สัปดาห์ที่วันจันทร์อยู่ในเดือนนั้น) ถ้ายังไม่จบเดือนจะขึ้น **MTD** — ลูกศร Δ เทียบกับช่วงก่อนหน้า
- Channel / Account: WH เป็นคลังกลาง จึงปันส่วนตามสัดส่วน Run Rate ของคู่ค้าที่เลือก (ผลรวมทุกช่องทาง = ทั้งหมดพอดี) · สถานะ / Stockout / Order-by คิดระดับ SKU ทุกช่องทาง
- ลูกศร Δ ดูทิศดี/ไม่ดี: DOC, SKU เสี่ยงขาด, At-risk ลดลง = เขียว ▼ · Sell-through, Quota Fit เพิ่ม = เขียว ▲ · มูลค่า Stock = เทา (กลาง)

## Self-check
`Calc.selfCheck(App.DB)` รันทุกครั้งที่โหลด แสดงใน Console และหน้า **ข้อมูล & ตั้งค่า**:
1. SKU / คู่ค้าในทุกตารางมีใน Master
2. คู่ค้าขายขาด: Sales In = Sales Out ทุกสัปดาห์
3. Stock ย้อนหลังไม่ติดลบ (WH และทุกคู่ค้า ทุกสัปดาห์)
4. Opening + In − Out = Closing ทุก SKU ทุกสัปดาห์ (Total คิด 2 ทางต้องตรงกัน)
5. Lot ถูกต้อง
6. KPI มูลค่า Stock = ผลรวมตาราง Stock & Projection · Waterfall ปิดยอด = KPI · จำนวน SKU ทุกสถานะ = จำนวน SKU

## ข้อตัดสินใจที่ต่างจาก Spec
- **Sellable Deadline** Spec เขียน `exp − shelf_life × (1 − min_pct)` แต่ min_shelf_life_pct = "อายุคงเหลือขั้นต่ำ" (7-11 = 67%) ⇒ วันสุดท้ายที่ส่งได้ = `exp − shelf_life × min_pct` จึงใช้สูตรนี้
- **AS OF ย้อนหลัง**: Stock รวมถูกต้องตามกระทบยอด แต่การแยก Lot เป็นค่าประมาณจาก Snapshot (มีป้าย Est.)
- **Waterfall**: CN Good จากคู่ค้าฝากขายไม่เป็นแท่ง (ไม่เปลี่ยน Total) · เมื่อกรองคู่ค้าจะมีแท่ง "ปันส่วน WH" ปิดยอด · แกน Y ไม่เริ่มที่ 0 เพื่อให้เห็นการเคลื่อนไหว
- **PO ในหน้าปฏิทิน** แสดงเต็มจำนวนตามเอกสาร (ไม่ปันส่วนตามช่องทาง) ส่วน CN แสดงเฉพาะคู่ค้าที่เลือก
- **Mock data**: MT ส่งของ (Sales In) ทุก 2 สัปดาห์ — ในมุมมอง Weekly บางสัปดาห์ Sales In ของ MT จึงเป็น 0 (ข้อมูลจริงไม่ใช่บั๊ก) ดู Monthly จะเห็นครบ
- Threshold ใหม่ของ Phase 2 (`consignDocHigh` 120, `consignDocLow` 14, `stLowW` 5, `stLowM` 20, `cnKeepDays` 45, `onTimeDays` 90) แก้ได้ที่หน้า ข้อมูล & ตั้งค่า

- **MAPE** คิดแบบถ่วงน้ำหนักตามยอดขาย (WAPE) เพื่อไม่ให้ SKU ยอดน้อยทำให้ค่าเพี้ยน
- **Quota Achievement รายสัปดาห์** ใน Mock data จะขึ้นลงมาก เพราะ MT ส่งของทุก 2 สัปดาห์ — การ์ดจึงแสดง "เดือนนี้ (MTD)" ประกอบ
- **Cache**: `index.html` ใส่ `?v=3.3` ท้ายไฟล์ JS/CSS — เมื่อแก้โค้ดแล้ว Deploy ให้เปลี่ยนเลขนี้ เพื่อไม่ให้เบราว์เซอร์ใช้ไฟล์เก่า
