#!/usr/bin/env python3
"""CR-04 · builds the UAT report (HTML + CSV + JSON) from the compact text the browser keeps (tools/uat-run.js · UatRun.dump()).
    python tools/make_uat_report_cr04.py <raw-results.txt> [out-folder]
Format: '#suite|width|at|build' then 'id|P/F|detail' per line. Screenshots are linked from uat/CR-04-screenshots/."""
import csv, html, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'uat', 'CR-04-UAT-2026-11-26')
DATE = '26 พ.ย. 2026'
os.makedirs(OUT, exist_ok=True)


def load(path):
    out, cur = {}, None
    for line in io.open(path, encoding='utf-8').read().splitlines():
        if not line.strip():
            continue
        if line.startswith('#'):
            k, w, at, build = (line[1:].split('|') + ['', '', ''])[:4]
            cur = out[k] = {'width': int(w) if w.isdigit() else w, 'at': at, 'build': build, 'results': []}
        elif cur is not None:
            rid, st, info = (line.split('|', 2) + ['', ''])[:3]
            cur['results'].append({'id': rid, 'pass': st == 'P', 'info': info})
    return out


data = load(SRC)
SUITES = [
    ('cr04-1440', 'CR-04 ชุดใหม่ ที่ Desktop 1440px (ความสูงหน้าหลัก Director ≤ 1,800px)'),
    ('cr04-390', 'CR-04 ชุดใหม่ ที่มือถือ 390px (ปุ่มเสนอบนการ์ด · Bottom sheet · ป้ายย่อ · ความสูง ≤ 3,400px)'),
    ('grid-1024', 'CR-04 Supply Alert ไม่มีการ์ดค้างเดี่ยว ที่ 1024px'),
    ('cr04data', 'CR-04 ชุดที่เปลี่ยนข้อมูล · ปรับยอดฝากขายจากผลนับ (I8-c) · เลื่อนรอบแผน (I8-b)'),
    ('all', 'all(): Anchor CR-01 · เมนูตามสิทธิ์ · NOLEAK ×3 · ธีม · OPS-GATE + ชุด CR-04 (รันที่ความกว้างหน้าต่าง 1156px)'),
    ('phase3D', 'CR-03 3D · รอบ S&OP (ทดสอบย้อนหลัง)'),
    ('phase3C', 'CR-03 3C · Early warning · FVA (ทดสอบย้อนหลัง)'),
    ('phase3B', 'CR-03 3B · Run Rate OOS · ABC-XYZ · Safety Stock (ทดสอบย้อนหลัง)'),
    ('phase3A', 'CR-03 3A · Sales Out intake · เบิกออก (ทดสอบย้อนหลัง)'),
    ('phaseD-desktop', 'CR-01 Phase D · F1–F4 / F8 (Desktop)'),
    ('phaseD-390', 'CR-01 Phase D · F1–F4 / F8 (มือถือ 390px)'),
    ('mobile-390', 'มือถือ 390px ไม่ล้นแนวนอน (11 บัญชี · ทุกหน้า)'),
    ('flow', 'CR-01 Phase B · Data Adapter (Flow)'),
    ('phaseC', 'CR-01 Phase C · B1–B5 / F7 + NOLEAK ×3 หลังมีข้อเสนอ'),
]
rows = []
for key, title in SUITES:
    s = data.get(key)
    if not s:
        continue
    for r in s['results']:
        rows.append({'suite': title, 'key': key, 'id': r['id'], 'status': 'PASS' if r['pass'] else 'FAIL', 'detail': r.get('info', ''), 'width': s.get('width'), 'at': s.get('at'), 'build': s.get('build')})
total, passed = len(rows), sum(1 for r in rows if r['status'] == 'PASS')
suites = [(title, sum(1 for r in rows if r['key'] == key and r['status'] == 'PASS'), sum(1 for r in rows if r['key'] == key)) for key, title in SUITES if data.get(key)]
build = next((data[k].get('build') for k, _ in SUITES if data.get(k) and data[k].get('build')), '')

ANCHORS = [   # (figure, CR-01 old methods, CR-03 new methods = default, Trend, Automatic)
    ('มูลค่า Stock', '฿50,091,183', '฿50,091,183', '฿50,091,183', '฿50,091,183'),
    ('DOC', '73 วัน', '70 วัน', '68 วัน', '71 วัน'),
    ('สถานะ เสี่ยงขาด / สั่งผลิต / ค้าง / ปกติ / NPD (+ หมดอายุ)', '7 / 2 / 9 / 98 / 4 (+7)', '6 / 4 / 7 / 99 / 4 (+7)', '6 / 7 / 6 / 97 / 4 (+7)', '6 / 6 / 7 / 97 / 4 (+7)'),
    ('At-risk 3M', '฿547,597 (4,489 ชิ้น)', '฿726,866 (7,265 ชิ้น)', '฿631,836 (5,331 ชิ้น)', '฿634,615 (5,386 ชิ้น)'),
    ('Quota Fit', '92% (107/116)', '95% (110/116)', '94% (109/116)', '98% (114/116)'),
    ('ยอดขายที่เสียโอกาส (ของขาด) 4W', '—', '฿2,020,669', '฿2,151,663', '฿1,608,488'),
    ('Safety Stock รวม · มูลค่า Suggested Qty', '186,227 ชิ้น · ฿24,964,590', '167,765 ชิ้น · ฿42,971,040', '170,705 ชิ้น · ฿44,843,320', '164,842 ชิ้น · ฿38,938,860'),
    ('ยอดขายเฉลี่ยรวม (ชิ้น / สัปดาห์)', '—', '63,742', '65,600', '62,377'),
]
AUTO_SHARE = 'อัตโนมัติเลือก (120 SKU): ล่าสุด 4 สัปดาห์ 45 · เฉลี่ย 3 เดือน 31 · แนวโน้ม 27 · ผสม 50/30/20 17 · ขาลงต่อเนื่อง 1 SKU (→ Action 1 รายการ)'
DECISIONS = [
    ('D1–D14', 'ค่าเริ่มต้นตามเอกสาร CR-04 ข้อ 8 ทุกข้อ'),
    ('DC-1', 'ERP เห็นการ์ด "IV − CN วันนี้" ตาม R2-3 (เป็นยอดเอกสาร ERP) แต่ไม่เห็นการ์ดยอดขาย / แผง E-commerce / "ดูเพิ่ม"'),
    ('DC-2', '"รอบประชุม S&OP" ใน 14 วันข้างหน้า = วันปิดรับแก้แผน (วันที่ 20) — ปิดรอบในหน้ารอบ S&OP วันนั้น ไม่มีค่าตั้งวันประชุมแยก'),
    ('DC-3', 'PO / CN ใน 14 วันข้างหน้า นับจาก AS OF ของ Supply (ปฏิทินเดียวกับหน้าของเข้า) · วันปิดรับแก้แผนนับจากวันนี้'),
    ('DC-4', 'หน้ารายงานเริ่มที่ "วันนี้" (ปิดยอด IV − CN รายวันเหมือนเดิม) · หน้ารายการอื่นเริ่มที่ "รอบแผนนี้" (D8) · งานค้างเริ่ม "ทุกวันที่"'),
    ('DC-5', 'แถบสายงาน Order → Cash นับทุกออเดอร์ในสิทธิ์ และกดแล้วเปิดหน้าคำสั่งซื้อที่ "ทุกวันที่" ให้ตัวเลขตรงกับแท็บ'),
    ('DC-6', 'ลูกค้าทั้งหมด = ลูกค้าที่มีออเดอร์ในช่วง (รวมที่ยกเลิก) · ยอดซื้อรวม / AOV ไม่รวมยกเลิก และหัก CN ที่ออกแล้ว'),
    ('DC-7', 'Trend: Run Rate = ค่าเฉลี่ย 13 สัปดาห์ข้างหน้าของเส้นแนวโน้ม · Projection / Stockout Date ใช้ค่ารายสัปดาห์ (ดู Open issue OI-1)'),
    ('DC-8', 'อัตโนมัติเลือกจาก 4 วิธี (4 สัปดาห์ · 3 เดือน · ผสม · แนวโน้ม) ตามสวิตช์ "ไม่นับช่วงของขาด" ที่ใช้อยู่'),
    ('DC-9', 'ป้าย "ขาลงต่อเนื่อง" คิดจากยอด Sales Out รวมทุกคู่ค้าของ SKU → Action ประเภทใหม่ (เจ้าของ Planner)'),
    ('DC-10', 'ผู้ขอปรับยอดฝากขาย: Planner / Director / Manager MT · ผู้อนุมัติ: Director / Manager MT (D6) ที่ไม่ใช่ผู้ขอ'),
    ('DC-11', 'Calc.LEGACY_METHODS เพิ่ม countAdjustOn: false — "ใช้วิธีเดิมทั้งหมด" และ anchors() ได้ตัวเลข CR-01 แม้มีรายการปรับ'),
    ('DC-12', 'เลื่อนรอบแผน: Quota ของเดือนใหม่ = แผน Supply (quota.csv) ทุกคู่ที่ยังไม่มี Quota อนุมัติใน Ops · Quota ของบัญชี Supply ที่ไม่มีเดือนได้เดือนเดิม · ช่องทาง Ops-only (Direct / Social) คงเดิม · เอกสารของรอบเดิมไม่นับเป็น "ใช้ไป"'),
    ('DC-13', 'ช่อง AS OF ของ Supply และช่องวันที่ในฟอร์ม Ops ใช้ปฏิทินเดียวกัน (โหมดวันเดียว) แสดง DD MMM YYYY · ค่าที่ส่งยังเป็น ISO'),
    ('DC-14', 'ป้ายรหัส ABC-XYZ เก็บใน Tooltip / data-grp / Export · ตัวกรองกลุ่มมีทั้ง A/B/C, X/Y/Z และ 9 ช่อง'),
    ('DC-15', 'ชุดทดสอบเดิมที่ปรับเฉพาะค่าคาดหวังตาม CR-04: EXPECT (ลำดับเมนู R1) · CR3-ACTION-AUTO (+ Action ขาลงต่อเนื่อง R9) · CR3-OOS-VIEW (ชื่อคอลัมน์ R10) · CR3-ABC-FILTER (อ่านรหัสจาก data-grp R12) · NEW_METHODS + countAdjustOn: true'),
]
OPEN = [
    ('OI-1', 'R9 Trend', 'ROP / Safety Stock / Suggested Qty ใช้ค่าเฉลี่ย 13 สัปดาห์ของเส้นแนวโน้ม (ค่าคงที่) ส่วน Projection / Stockout Date ใช้ค่ารายสัปดาห์', 'ให้ ROP ใช้ค่ารายสัปดาห์ต้องแก้สูตร Safety Stock (CR-03) — เสนอทำใน CR ถัดไปเพื่อไม่ให้ Anchor เปลี่ยน'),
    ('OI-2', 'R9 Trend', 'ไม่นับสัปดาห์โปรโมชั่น: เตรียมฟิลด์ DB.promo แล้ว แต่ยังไม่มีแหล่งข้อมูล', 'ต้องมีตาราง promo (SKU × คู่ค้า × สัปดาห์)'),
    ('OI-3', 'I10', 'ช่องวันที่ในฟอร์ม (หมดอายุ Lot · ETA PO · กำหนดเสร็จ) เปลี่ยนเป็นปุ่มเปิดปฏิทิน — ช่องบังคับไม่ใช้การเตือนของเบราว์เซอร์แล้ว ใช้การตรวจของฟังก์ชันบันทึกเดิม', 'ตรวจแล้วทุกฟอร์มยังปฏิเสธค่าว่างตามเดิม'),
    ('PROD-01', 'ก่อนใช้งานจริง', 'ตัวกรอง (sessionStorage) · คำขอปรับยอดฝากขาย (localStorage) · รอบแผน (db.planPeriod) อยู่ในเบราว์เซอร์', 'ต้องย้ายไประบบกลางเมื่อเชื่อมระบบจริง'),
]

json.dump(rows, io.open(os.path.join(OUT, 'results.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
summary = {'cr': 'CR-04 (+ CR-01 / CR-03 regression)', 'app': 'Charmiss Operations Management v8.5.0', 'build': build, 'dataset': 'Integrated demo · AS OF 2026-11-23',
           'total': total, 'pass': passed, 'fail': total - passed, 'suites': suites, 'anchors': ANCHORS, 'autoShare': AUTO_SHARE, 'decisions': DECISIONS, 'openIssues': OPEN}
json.dump(summary, io.open(os.path.join(OUT, 'summary.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
with io.open(os.path.join(OUT, 'UAT-all-cases.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['suite', 'id', 'status', 'viewport', 'run_at', 'detail'])
    for r in rows: w.writerow([r['suite'], r['id'], r['status'], r['width'], r['at'], r['detail']])
with io.open(os.path.join(OUT, 'open-issues.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['id', 'area', 'item', 'note']); [w.writerow(x) for x in OPEN]

shots, sd = [], os.path.join(ROOT, 'uat', 'CR-04-screenshots')
if os.path.isdir(sd):
    shots = ['../CR-04-screenshots/' + fn for fn in sorted(os.listdir(sd)) if fn.lower().endswith(('.jpg', '.png'))]
e = html.escape
css = """body{font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","Tahoma",sans-serif;color:#23334a;background:#f3f6fb;margin:0}main{max-width:1200px;margin:auto;padding:32px 20px}
h1{font-size:30px;line-height:1.25;margin:0 0 6px}h2{margin:32px 0 10px;font-size:21px}section{background:#fff;border:1px solid #dce4ef;border-radius:12px;padding:18px 20px;margin:14px 0;overflow-x:auto}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.kpis div{background:#fff;border:1px solid #dce4ef;border-radius:12px;padding:14px 16px}.kpis small{display:block;color:#5b6b82}.kpis b{font-size:26px}
table{border-collapse:collapse;width:100%;font-size:13.5px}th,td{border-bottom:1px solid #e6ecf4;padding:7px 8px;text-align:left;vertical-align:top}th{background:#f6f8fb;color:#5b6b82;font-weight:600}
.pass{color:#067647;font-weight:700}.fail{color:#b42318;font-weight:700}.muted{color:#5b6b82}code{background:#f2f4f7;padding:1px 5px;border-radius:4px;font-size:12.5px}
td.d{font-family:ui-monospace,Consolas,monospace;font-size:11.5px;color:#475467;word-break:break-all;max-width:560px}
.shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}.shots figure{margin:0;background:#fff;border:1px solid #dce4ef;border-radius:10px;padding:8px}.shots img{width:100%;border-radius:6px;display:block}.shots figcaption{font-size:12px;color:#5b6b82;margin-top:4px}
@media(max-width:720px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}"""
h = ['<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CR-04 UAT · Charmiss Operations Management v8.5.0</title><style>%s</style></head><body><main>' % css]
h.append('<h1>CR-04 UAT — Charmiss Operations Management v8.5.0</h1><p class="muted">หน้าหลักแบบ Command Center + จัดลำดับเมนูใหม่ + รวมปัญหาที่พบ · %s · build <code>%s</code> · %s</p>' % (e(summary['dataset']), e(build), DATE))
h.append('<div class="kpis"><div><small>ทั้งหมด</small><b>%d</b></div><div><small>ผ่าน</small><b class="pass">%d</b></div><div><small>ไม่ผ่าน</small><b class="%s">%d</b></div><div><small>ชุดทดสอบ</small><b>%d</b></div></div>' % (total, passed, 'fail' if total - passed else 'pass', total - passed, len(suites)))
h.append('<h2>ผลแต่ละชุด</h2><section><table><thead><tr><th>ชุด</th><th>ผ่าน / ทั้งหมด</th></tr></thead><tbody>%s</tbody></table></section>' % ''.join('<tr><td>%s</td><td class="%s">%d / %d</td></tr>' % (e(t), 'pass' if p == n else 'fail', p, n) for t, p, n in suites))
h.append('<h2>Anchor (AS OF 23 พ.ย. 2026 · Weekly · 3M · ไม่กรอง)</h2><section><table><thead><tr><th>ตัวเลข</th><th>วิธีเดิม (= CR-01)</th><th>วิธีใหม่ CR-03 (ค่าเริ่มต้น)</th><th>แนวโน้ม (Trend)</th><th>อัตโนมัติ</th></tr></thead><tbody>%s</tbody></table><p class="muted">CR-04 ไม่เปลี่ยน <code>SupUAT.anchors()</code> และ <code>anchors(\'new\')</code> · Trend / อัตโนมัติ เป็นตัวเลือก (D12) · %s</p></section>' % (''.join('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % tuple(map(e, a)) for a in ANCHORS), e(AUTO_SHARE)))
h.append('<h2>CR-04 Decisions</h2><section><table><thead><tr><th>#</th><th>ตัดสินใจ</th></tr></thead><tbody>%s</tbody></table></section>' % ''.join('<tr><td>%s</td><td>%s</td></tr>' % tuple(map(e, x)) for x in DECISIONS))
h.append('<h2>CR-04 Open issues</h2><section><table><thead><tr><th>#</th><th>ส่วน</th><th>เรื่อง</th><th>หมายเหตุ</th></tr></thead><tbody>%s</tbody></table></section>' % ''.join('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % tuple(map(e, x)) for x in OPEN))
for key, title in SUITES:
    rs = [r for r in rows if r['key'] == key]
    if not rs: continue
    s = data[key]
    h.append('<h2>%s</h2><section><p class="muted">รันเมื่อ %s · Viewport %spx</p><table><thead><tr><th style="width:34%%">Case</th><th>ผล</th><th>รายละเอียด</th></tr></thead><tbody>%s</tbody></table></section>' % (
        e(title), e(str(s.get('at', ''))[:19].replace('T', ' ')), e(str(s.get('width', ''))),
        ''.join('<tr><td>%s</td><td class="%s">%s</td><td class="d">%s</td></tr>' % (e(r['id']), r['status'].lower(), r['status'], e(r['detail'])) for r in rs)))
if shots:
    h.append('<h2>ภาพหน้าหลักทุกบทบาท</h2><section><div class="shots">%s</div></section>' % ''.join('<figure><a href="%s"><img src="%s" alt="%s" loading="lazy"></a><figcaption>%s</figcaption></figure>' % (e(p), e(p), e(p.split('/')[-1]), e(p.split('/')[-1])) for p in shots))
h.append('<p class="muted">ไฟล์ในโฟลเดอร์นี้: raw-results.txt · results.json · UAT-all-cases.csv · summary.json · open-issues.csv · สร้างโดย tools/make_uat_report_cr04.py</p></main></body></html>')
io.open(os.path.join(OUT, 'CR-04-UAT-2026-11-26.html'), 'w', encoding='utf-8').write(''.join(h))
print('report:', OUT, '·', passed, '/', total)
