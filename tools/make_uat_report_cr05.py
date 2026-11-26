#!/usr/bin/env python3
"""CR-05 · builds the UAT report (HTML + CSV + JSON) from the compact text the browser keeps (tools/uat-run.js · UatRun.dump()).
    python tools/make_uat_report_cr05.py <raw-results.txt> [out-folder]
Format: '#suite|width|at|build' then 'id|P/F|detail' per line. Screenshots (before / after) are linked from uat/CR-05-screenshots/."""
import csv, html, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'uat', 'CR-05-UAT-2026-11-26')
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
    ('cr05-1440', 'CR-05 ชุดใหม่ ที่ 1440px (Director ทุกหน้า + Manager MT)'),
    ('cr05-1024', 'CR-05 ชุดใหม่ ที่ 1024px (Director ทุกหน้า + Planner)'),
    ('cr05-390', 'CR-05 ชุดใหม่ ที่ 390px (Director ทุกหน้า + Warehouse)'),
    ('all', 'all(): Anchor CR-01 · เมนูตามสิทธิ์ · NOLEAK ×3 · ธีม · OPS-GATE + cr04() + cr05() (1440px)'),
    ('cr04-1440', 'CR-04 (ทดสอบย้อนหลัง) ที่ 1440px'),
    ('cr04-390', 'CR-04 (ทดสอบย้อนหลัง) ที่ 390px'),
    ('cr04data', 'CR-04 ชุดที่เปลี่ยนข้อมูล (ทดสอบย้อนหลัง)'),
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

ANCHORS = [   # (figure, CR-01 old methods, CR-03 new methods = default) — CR-05 changes neither
    ('มูลค่า Stock', '฿50,091,183', '฿50,091,183'), ('DOC', '73 วัน', '70 วัน'),
    ('สถานะ เสี่ยงขาด / สั่งผลิต / ค้าง / ปกติ / NPD (+ หมดอายุ)', '7 / 2 / 9 / 98 / 4 (+7)', '6 / 4 / 7 / 99 / 4 (+7)'),
    ('At-risk 3M', '฿547,597 (4,489 ชิ้น)', '฿726,866 (7,265 ชิ้น)'), ('Quota Fit', '92% (107/116)', '95% (110/116)'),
    ('Achievement MTD', '94.1%', '94.1%'),
]
DECISIONS = [
    ('DC-0', 'เอกสาร CR-05 สถานะ "Draft — รอ James Approve" — James ส่งเอกสารมาให้เริ่มงานในโหมดรอบเดียว จึงถือเป็นการอนุมัติ'),
    ('D1–D10', 'ค่าเริ่มต้นตามเอกสาร CR-05 ข้อ 8 ทุกข้อ (25 แถว · Modal S/M/L · ไม่มี Eyebrow · Badge ข้อมูลจำลอง · ⓘ เกี่ยวกับหน้านี้ · ACT-YYMM-#### · ชื่อเมนูอังกฤษคงเดิม · Drawer มือถือ · การ์ด Quota Achievement MTD)'),
    ('DC-1 (D8)', 'หน้าที่สูงเกิน 4,000px ที่ 1440: ฝากขาย และ Supply Review (กราฟหลายชุด) — ความสูงจริงอยู่ในผล CR5-PAGE-HEIGHT ของชุด 1440'),
    ('DC-2 (D5)', '"ⓘ เกี่ยวกับหน้านี้" กางในครั้งแรกที่ Desktop / แท็บเล็ตกว้าง · ≤ 768px เริ่มแบบพับ (ข้อมูลแรกต้องอยู่ใน 400px — G4) · หลังจากนั้นจำสถานะต่อผู้ใช้ต่อหน้า (localStorage cr5.about.*)'),
    ('DC-3', 'รายการ "ตรวจ Quota กับ Actual WMS" (สินค้าคงคลังและโควตา) พับเป็นแถบเมื่อเกิน 25 แถว · จำสถานะต่อผู้ใช้'),
    ('DC-4 (G2)', 'ตารางที่กว้างกว่ากรอบใช้ทางเลือกของ G2 — ตรึงคอลัมน์แรก (+ ช่องติ๊ก) และคอลัมน์สุดท้ายพร้อมเงา · ไม่ได้ทำระบบคอลัมน์ P1 / P2 / P3 แยก (ดู OI-1)'),
    ('DC-5 (G2)', 'Card บนมือถือสร้างจากตารางเดิมแบบเดียวกันทุกหน้า: คอลัมน์แรกเป็นหัว Card · ที่เหลือเป็น ป้าย · ค่า · ปุ่มยังอยู่ในแถวของตัวเอง (ดู OI-2)'),
    ('DC-6 (G5)', 'แท่งกราฟ 26 สัปดาห์ (ภาพรวม Supply) ไม่นับเป็นพื้นที่กด 40px — เป็นเครื่องหมายบนกราฟ ข้อมูลเดียวกันอยู่ใน Tooltip / รายการ'),
    ('DC-7 (G5)', 'Build CSS ยกทุกขนาดตัวอักษรที่ต่ำกว่า 12px เป็น 12px (Selector ของตาราง / Card เป็น 11px) — แก้ที่ต้นทางครั้งเดียว ไม่แก้รายหน้า'),
    ('DC-8 (G9)', 'ปุ่มสีจางที่ซ้ำ ≥ 2 ปุ่มของบทบาทที่ไม่มีสิทธิ์ถูกซ่อน + หมายเหตุบรรทัดเดียว · ปุ่มของ Supply / ฟอร์ม / Pager / ตัวกรอง และช่องตัวเลขหน้าหลักที่ไม่มีลิงก์ (ข้อมูล ไม่ใช่ปุ่มทำงาน) ไม่ถูกซ่อน'),
    ('DC-9 (B6 · C3)', 'เมนูผู้ใช้: "สลับผู้ใช้" (ปุ่มเดิม #globalLogout) และ "ออกจากระบบ" — ใน Demo ทั้งสองกลับหน้าเลือกผู้ใช้ SSO · ทางลัดย้ายสต็อกชื่อ "ย้ายสต็อกด่วน (Director Override)"'),
    ('DC-10 (A5)', 'แผงงานที่ต้องตัดสินใจ: ≥ 1440px อยู่ขวาแบบไม่ติดจอ · ต่ำกว่านั้นเป็นแถบพับเหนือตาราง'),
    ('DC-11 (C4)', 'เลข Action เดิมที่ไม่ใช่ ACT-YYMM-#### ย้ายเลขอัตโนมัติตามลำดับที่สร้างในแต่ละเดือน · เก็บเลขเดิมใน oldId · แก้ ref ใน Audit ตามไปด้วย · ประวัติ / บันทึกอยู่ครบ'),
    ('DC-12 (G7)', 'วันที่ในประวัติเวอร์ชัน · Sidebar · หน้า Login ใช้ fmtDate เดียวกัน'),
    ('DC-13 (§9)', 'เลขเวอร์ชันใหม่ 1.5.0 · ประวัติ 8.5.0 → 1.4.0 · 8.4.0–8.1.0 → 1.3.4–1.3.1 · 8.0.0 → 1.1.0 · 7.0 → 1.0.0 พร้อม "(เดิม x)" / "(was x)" · 1.2 ว่างไว้ให้ CR-02'),
    ('DC-14 (Test)', 'ชุดทดสอบเดิมที่ปรับเฉพาะ Selector / ค่าคาดหวังตาม CR-05 (ไม่ลบข้อตรวจ): CR3-VERSION / 3B / 3C / 3D (เลขใหม่ §9) · SUP-F3 (25 → 50) · SUP-F8-SHOW (25 แถวทุกหน้าจอ · เดิมมือถือ 20 / Desktop 50) · CR4-HOME-ROLE (+ การ์ด ach) · CR4-HOME-MATCH ("—" เมื่อเดือนนี้ไม่มี IV / CN) · CR4-PLAN-PERIOD (ชิปอยู่ข้าง H1)'),
    ('DC-15 (Test)', 'CR5-NOLEAK ไม่นับชื่อที่เป็นช่องทางขายของออเดอร์ในสิทธิ์เอง (เช่น LINE OA / Facebook ของออเดอร์ TT) ที่บังเอิญซ้ำกับชื่อบัญชี Supply ของฝ่ายอื่น'),
    ('DC-16', 'Stock & Projection เปลี่ยนจาก 50 แถวคงที่ เป็น 25 / 50 / 100 (Component เดียวกับตารางอื่น) · Export ยังได้ทุกแถว'),
    ('DC-17 (A1)', 'บรรทัดสรุปของ Modal เตรียมคำขอ SO แสดงคู่ค้าที่ใช้โควตา (เช่น "Watsons · MT · 1 SKU · 80 ชิ้น") เพราะโควตาคิดต่อคู่ค้า — ชื่อลูกค้าอยู่ในช่องเลือกออเดอร์แล้ว'),
    ('DC-18 (G2)', 'ตาราง Heat map หมวด × เดือน (เสี่ยงหมดอายุ) ไม่เปลี่ยนเป็น Card บนมือถือ — เป็นตารางเมทริกซ์ จึงเลื่อนข้างในกรอบของตัวเองโดยตรึงคอลัมน์หมวดไว้'),
    ('DC-19 (G9)', 'หน้าเปิด SO ตอนว่าง: ปุ่ม "เตรียมคำขอ SO" ในสถานะว่างเป็นปุ่มรอง — ปุ่มหลักมีปุ่มเดียวที่หัวแผง'),
    ('แก้ระหว่างทดสอบ', 'ปุ่ม ☰ มือถือไม่เปิดเมนู (data-c5-nav ว่าง) · Breadcrumb ชื่อกลุ่มถูกบีบ 28px (กฎ nav span เดิม) · ⓘ ของหน้า Supply เป็นกล่องว่าง / ไอคอนขยายเต็มกว้าง — แก้แล้วทั้งหมดก่อนรอบทดสอบสุดท้าย'),
]
OPEN = [
    ('OI-1', 'G2 คอลัมน์ P1 / P2 / P3', 'ยังไม่ได้ทำระบบซ่อนคอลัมน์ตามความกว้าง + เมนู "คอลัมน์ที่แสดง ▾" ต่อทุกตาราง — ใช้การตรึงคอลัมน์แรก / สุดท้ายแทน (G2 อนุญาต) ทุกตารางผ่าน CR5-TABLE-FIT', 'ถ้าต้องการลดคอลัมน์จริง ให้ระบุ P1 ต่อหน้าในตาราง A3 แล้วทำใน CR ถัดไป'),
    ('OI-2', 'G2 Card มือถือ', 'Card เป็นแบบทั่วไป (หัว = คอลัมน์แรก · ป้าย · ค่า) ยังไม่ได้จัดเป็น "บรรทัดบน ตัวระบุ + สถานะ / กลาง P1 2–4 ค่า / ล่าง ปุ่มหลัก + ⋯" รายหน้า', 'ทำคู่กับ OI-1 เมื่อกำหนด P1 แล้ว'),
    ('OI-3', 'ภาพ "ก่อน"', 'ไม่มีภาพก่อนเริ่ม CR-05 เก็บไว้ — ภาพ "ก่อน" ถ่ายจากโค้ดปัจจุบันที่ปิดชั้น CR-05 (ไม่โหลด cr05-*.js และ CSS ส่วน CR-05) · ส่วนที่แก้ในไฟล์เดิม (การ์ด Achievement · ชิปสถานะออเดอร์ · ตัวแบ่งหน้า Supply 25) ยังเป็นแบบใหม่ในภาพนั้น', 'ตัวเลขก่อนเริ่มของ Reviewer อยู่ในเอกสาร CR-05 ข้อ 1'),
    ('PROD-01', 'ก่อนใช้งานจริง', 'ค่าที่ผู้ใช้เลือก (จำนวนแถว · ⓘ เกี่ยวกับหน้านี้ · แถบพับ · แท็บบัญชีและสิทธิ์) อยู่ในเบราว์เซอร์', 'ย้ายไปโปรไฟล์ผู้ใช้เมื่อเชื่อมระบบจริง'),
]

json.dump(rows, io.open(os.path.join(OUT, 'results.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
summary = {'cr': 'CR-05 (+ CR-01 / CR-03 / CR-04 regression)', 'app': 'Charmiss Operations Management v1.5.0', 'build': build, 'dataset': 'Integrated demo · AS OF 2026-11-23',
           'total': total, 'pass': passed, 'fail': total - passed, 'suites': suites, 'anchors': ANCHORS, 'decisions': DECISIONS, 'openIssues': OPEN}
json.dump(summary, io.open(os.path.join(OUT, 'summary.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
with io.open(os.path.join(OUT, 'UAT-all-cases.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['suite', 'id', 'status', 'viewport', 'run_at', 'detail'])
    for r in rows: w.writerow([r['suite'], r['id'], r['status'], r['width'], r['at'], r['detail']])
with io.open(os.path.join(OUT, 'open-issues.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['id', 'area', 'item', 'note']); [w.writerow(x) for x in OPEN]

# before / after pairs: uat/CR-05-screenshots/<nn>-<page>-<width>-before.jpg / -after.jpg
sd, pairs = os.path.join(ROOT, 'uat', 'CR-05-screenshots'), {}
if os.path.isdir(sd):
    for fn in sorted(os.listdir(sd)):
        if not fn.lower().endswith(('.jpg', '.png')): continue
        base = os.path.splitext(fn)[0]
        k, side = (base.rsplit('-', 1) + [''])[:2]
        if side not in ('before', 'after'): k, side = base, 'after'
        pairs.setdefault(k, {})[side] = '../CR-05-screenshots/' + fn
e = html.escape
css = """body{font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","Tahoma",sans-serif;color:#23334a;background:#f3f6fb;margin:0}main{max-width:1200px;margin:auto;padding:32px 20px}
h1{font-size:30px;line-height:1.25;margin:0 0 6px}h2{margin:32px 0 10px;font-size:21px}section{background:#fff;border:1px solid #dce4ef;border-radius:12px;padding:18px 20px;margin:14px 0;overflow-x:auto}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.kpis div{background:#fff;border:1px solid #dce4ef;border-radius:12px;padding:14px 16px}.kpis small{display:block;color:#5b6b82}.kpis b{font-size:26px}
table{border-collapse:collapse;width:100%;font-size:13.5px}th,td{border-bottom:1px solid #e6ecf4;padding:7px 8px;text-align:left;vertical-align:top}th{background:#f6f8fb;color:#5b6b82;font-weight:600}
.pass{color:#067647;font-weight:700}.fail{color:#b42318;font-weight:700}.muted{color:#5b6b82}code{background:#f2f4f7;padding:1px 5px;border-radius:4px;font-size:12.5px}
td.d{font-family:ui-monospace,Consolas,monospace;font-size:11.5px;color:#475467;word-break:break-all;max-width:560px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0 18px}.pair figure{margin:0;background:#fff;border:1px solid #dce4ef;border-radius:10px;padding:8px}.pair img{width:100%;border-radius:6px;display:block}.pair figcaption{font-size:12px;color:#5b6b82;margin-top:4px}.pair.narrow{grid-template-columns:repeat(2,minmax(0,280px))}
@media(max-width:720px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pair,.pair.narrow{grid-template-columns:1fr}}"""
h = ['<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CR-05 UAT · Charmiss Operations Management v1.5.0</title><style>%s</style></head><body><main>' % css]
h.append('<h1>CR-05 UAT — Charmiss Operations Management v1.5.0</h1><p class="muted">UX/UI ทั้งระบบ (Responsive · ความรก · ความชัดเจน) · %s · build <code>%s</code> · %s</p>' % (e(summary['dataset']), e(build), DATE))
h.append('<div class="kpis"><div><small>ทั้งหมด</small><b>%d</b></div><div><small>ผ่าน</small><b class="pass">%d</b></div><div><small>ไม่ผ่าน</small><b class="%s">%d</b></div><div><small>ชุดทดสอบ</small><b>%d</b></div></div>' % (total, passed, 'fail' if total - passed else 'pass', total - passed, len(suites)))
h.append('<h2>ผลแต่ละชุด</h2><section><table><thead><tr><th>ชุด</th><th>ผ่าน / ทั้งหมด</th></tr></thead><tbody>%s</tbody></table></section>' % ''.join('<tr><td>%s</td><td class="%s">%d / %d</td></tr>' % (e(t), 'pass' if p == n else 'fail', p, n) for t, p, n in suites))
h.append('<h2>Anchor (AS OF 23 พ.ย. 2026 · Weekly · L4W · 3M · ไม่กรอง)</h2><section><table><thead><tr><th>ตัวเลข</th><th>วิธีเดิม (= CR-01)</th><th>วิธีใหม่ CR-03 (ค่าเริ่มต้น)</th></tr></thead><tbody>%s</tbody></table><p class="muted">CR-05 เปลี่ยนเฉพาะการแสดงผล — <code>SupUAT.anchors()</code> / <code>anchors(\'new\')</code> ตรงทุกค่า (SUP-ANCHOR · CR3-ANCHOR-NEW · CR4-ANCHOR-STAY)</p></section>' % ''.join('<tr><td>%s</td><td>%s</td><td>%s</td></tr>' % tuple(map(e, a)) for a in ANCHORS))
h.append('<h2>CR-05 Decisions</h2><section><table><thead><tr><th>#</th><th>ตัดสินใจ</th></tr></thead><tbody>%s</tbody></table></section>' % ''.join('<tr><td>%s</td><td>%s</td></tr>' % tuple(map(e, x)) for x in DECISIONS))
h.append('<h2>CR-05 Open issues</h2><section><table><thead><tr><th>#</th><th>ส่วน</th><th>เรื่อง</th><th>หมายเหตุ</th></tr></thead><tbody>%s</tbody></table></section>' % ''.join('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % tuple(map(e, x)) for x in OPEN))
for key, title in SUITES:
    rs = [r for r in rows if r['key'] == key]
    if not rs: continue
    s = data[key]
    h.append('<h2>%s</h2><section><p class="muted">รันเมื่อ %s · Viewport %spx</p><table><thead><tr><th style="width:34%%">Case</th><th>ผล</th><th>รายละเอียด</th></tr></thead><tbody>%s</tbody></table></section>' % (
        e(title), e(str(s.get('at', ''))[:19].replace('T', ' ')), e(str(s.get('width', ''))),
        ''.join('<tr><td>%s</td><td class="%s">%s</td><td class="d">%s</td></tr>' % (e(r['id']), r['status'].lower(), r['status'], e(r['detail'])) for r in rs)))
if pairs:
    h.append('<h2>ภาพก่อน / หลัง</h2><section><p class="muted">"ก่อน" = โค้ดปัจจุบันที่ปิดชั้น CR-05 (ดู OI-3) · ภาพแสดงหน้าจอส่วนบน (Viewport) · Director · Integrated demo</p>')
    for k in sorted(pairs):
        p = pairs[k]
        figs = ''.join('<figure><a href="%s"><img src="%s" alt="%s" loading="lazy"></a><figcaption>%s</figcaption></figure>' % (e(p[s]), e(p[s]), e(k + ' ' + s), 'ก่อน' if s == 'before' else 'หลัง') for s in ('before', 'after') if s in p)
        h.append('<h3 style="font-size:15px;margin:14px 0 4px">%s</h3><div class="pair%s">%s</div>' % (e(k), ' narrow' if '-390' in k else '', figs))
    h.append('</section>')
h.append('<p class="muted">ไฟล์ในโฟลเดอร์นี้: raw/ · raw-results.txt · results.json · UAT-all-cases.csv · summary.json · open-issues.csv · สร้างโดย tools/make_uat_report_cr05.py</p></main></body></html>')
io.open(os.path.join(OUT, 'CR-05-UAT-2026-11-26.html'), 'w', encoding='utf-8').write(''.join(h))
print('report:', OUT, '·', passed, '/', total)
