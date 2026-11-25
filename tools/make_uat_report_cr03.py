#!/usr/bin/env python3
"""CR-03 · builds the full UAT report (HTML + CSV + JSON) from the results the browser keeps in localStorage['uat.cr03']
(SupUAT.keep(suite, results) in tools/uat-supply.js). Usage:
    python tools/make_uat_report_cr03.py <results.json> [out-folder]
The input is the JSON object of localStorage['uat.cr03'] saved to a file. Screenshots are linked from uat/CR-03-Phase-3*-screenshots/."""
import csv, html, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'uat', 'CR-03-UAT-2026-11-25')
os.makedirs(OUT, exist_ok=True)
def load(path):
    """localStorage['uat.cr03'] as JSON, or the compact text export (#suite|width|at|build then id|P/F|detail per line)."""
    if path.lower().endswith('.json'):
        return json.load(io.open(path, encoding='utf-8'))
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

SUITES = [   # key in localStorage → title (order of the report)
    ('phase3D', 'CR-03 3D · รอบ S&OP: Action log · Snapshot แผน · วันปิดรับแก้แผน · Supply Review (R7)'),
    ('phase3C', 'CR-03 3C · Early warning ฝากขาย · FVA / Tracking signal (R5–R6)'),
    ('phase3B', 'CR-03 3B · Run Rate ไม่นับสัปดาห์ของขาด · ABC-XYZ · Safety Stock แบบสถิติ (R3–R4)'),
    ('phase3A', 'CR-03 3A · รับรายงาน Sales Out · เบิกออก (ไม่ใช่การขาย) · เลขเวอร์ชัน (R1–R2)'),
    ('all', 'Anchor CR-01 · เมนูตามสิทธิ์ · NOLEAK · ธีม · OPS-GATE (ชุดเดิม + เมนู S&OP)'),
    ('phaseD-desktop', 'CR-01 Phase D · F1–F4 / F8 (Desktop)'),
    ('phaseD-390', 'CR-01 Phase D · F1–F4 / F8 (มือถือ 390px)'),
    ('mobile-390', 'มือถือ 390px ไม่ล้นแนวนอน (11 บัญชี · ทุกหน้า)'),
    ('flow', 'CR-01 Phase B · Data Adapter (Flow)'),
    ('phaseC', 'CR-01 Phase C · B1–B5 / F7 + NOLEAK หลังมีข้อเสนอ'),
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

ANCHORS = [
    ('มูลค่า Stock · WH / ฝากขาย / รวม (หน่วย)', '฿50,091,183 · 514,864 / 136,418 / 651,282', 'เท่าเดิม'),
    ('Sell-through · MAPE · Bias · Fill · Achievement MTD', '17.8% · 13.5% · −4.2% · 93.1% · 94.1%', 'เท่าเดิม'),
    ('DOC', '73 วัน', '70 วัน'),
    ('สถานะ เสี่ยงขาด / สั่งผลิต / ค้าง / ปกติ / NPD (+ หมดอายุ)', '7 / 2 / 9 / 98 / 4 (+7)', '6 / 4 / 7 / 99 / 4 (+7)'),
    ('At-risk 3M', '฿547,597 (4,489 ชิ้น)', '฿726,866 (7,265 ชิ้น)'),
    ('แนะนำเรียกคืน', '฿519,974 · 11 คู่ · 7,194 ชิ้น', 'เท่าเดิม'),
    ('Quota Fit', '92% (107/116)', '95% (110/116)'),
    ('Lost sales 4W / 13W · SKU ที่มีสัปดาห์ขาด', '—', '฿2,020,669 / ฿3,071,760 · 21'),
    ('ABC-XYZ A / B / C / N / E', '—', '48 / 34 / 27 / 6 / 5'),
    ('Safety Stock รวม · มูลค่า Suggested Qty', '186,227 ชิ้น · ฿24,964,590', '167,765 ชิ้น · ฿42,971,040'),
    ('Early warning (In-stock % / WOS แดง / เหลือง / Reorder gap / Dist. gap / แกว่ง / สะสม / รายการ)', '—', '98.8 / 12 / 18 / 23 / 0 / 22 / 20 / 104'),
    ('FVA 3M (WAPE Naive / Quota / FVA) · Tracking signal (สูง / ต่ำ / ติดลบ 3 เดือน)', '—', '13.5 / 13.5 / 0.0 pp · 114 / 252 / 145'),
]
REMAINING = [
    ('CHG-1', 'เปลี่ยนตามคำขอ', 'หน้าแรกหลังล็อกอิน = หน้าหลัก ทุกบทบาท', 'เดิม v13 Director / Manager เปิดสินค้าคงคลังและโควตา · เริ่มชุดสาธิตใหม่ก็กลับหน้าหลัก · ลิงก์ Supply ที่เปิดในแท็บใหม่ยังพาไปหน้านั้นได้ครั้งแรก'),
    ('FIX-1', 'แก้บั๊กเดิม', 'เริ่ม Integrated demo ใหม่ตอน CDN ช้า → ตกเป็นชุด UAT', 'resume รอ DOMContentLoaded (supply-planning.js)'),
    ('CONF-1', 'ยืนยัน', 'Suggested Qty แบบใหม่บวก Safety Stock (d × (LT + 90) + SS − คงเหลือ)', 'มูลค่าเสนอสั่ง ฿25.0M → ฿43.0M — ถ้าไม่ต้องการให้บวก SS แก้ได้ทันที'),
    ('CONF-2', 'ยืนยัน', 'Lead Time ระดับ Supplier รวมหลาย SKU', 'σLT สูง (SS บาง SKU ~40 วัน) — ทางเลือก: ใช้ LT ประมาณเมื่อ SKU รับ PO ไม่ถึง 3 ครั้ง'),
    ('CONF-3', 'ยืนยัน', 'Tracking signal |TS| > 4 ขึ้นป้าย 366 / 953 คู่ (ชุดสาธิต)', 'ปรับเกณฑ์ได้ในหน้าตั้งค่า'),
    ('CONF-4', 'ยืนยัน', 'รอบเติมของจริงรายคู่ค้า (A4)', 'ตอนนี้ 2 สัปดาห์ทุกคู่ค้า — ใส่ค่าจริงได้ในหน้าตั้งค่า'),
    ('CONF-5', 'ยืนยัน', 'Action log สร้างอัตโนมัติ 121 รายการในชุดสาธิต', 'ถ้ามากไป ปรับเกณฑ์ Early warning / เลือกประเภทที่ไม่ต้องการสร้างได้ใน CR ถัดไป'),
    ('PROD-01', 'ก่อนใช้งานจริง', 'ข้อมูลอยู่ในเบราว์เซอร์', 'Action log (localStorage ≤ 2,000) · Snapshot (IndexedDB ≤ 12) · รายงาน Sales Out (IndexedDB) — ต้องย้ายไประบบกลางเมื่อเชื่อมระบบจริง'),
]

# ---------------------------------------------------------------- files
json.dump(rows, io.open(os.path.join(OUT, 'results.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
summary = {'cr': 'CR-03 Phase 3A–3D (+ CR-01 regression)', 'app': 'Charmiss Operations Management v8.4.0', 'build': build, 'dataset': 'Integrated demo · AS OF 2026-11-23',
           'total': total, 'pass': passed, 'fail': total - passed, 'suites': suites, 'anchors': ANCHORS, 'remainingItems': REMAINING}
json.dump(summary, io.open(os.path.join(OUT, 'summary.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
with io.open(os.path.join(OUT, 'UAT-all-cases.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['suite', 'id', 'status', 'viewport', 'run_at', 'detail'])
    for r in rows: w.writerow([r['suite'], r['id'], r['status'], r['width'], r['at'], r['detail']])
with io.open(os.path.join(OUT, 'remaining-items.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['id', 'type', 'item', 'note']); [w.writerow(x) for x in REMAINING]

# ---------------------------------------------------------------- HTML
shots = []
for ph in ['3A', '3B', '3C', '3D']:
    d = os.path.join(ROOT, 'uat', 'CR-03-Phase-%s-screenshots' % ph)
    if os.path.isdir(d):
        for fn in sorted(os.listdir(d)):
            if fn.lower().endswith(('.jpg', '.png')):
                shots.append((ph, '../CR-03-Phase-%s-screenshots/%s' % (ph, fn), fn))
e = html.escape
css = """body{font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","Tahoma",sans-serif;color:#23334a;background:#f3f6fb;margin:0}main{max-width:1200px;margin:auto;padding:32px 20px}
h1{font-size:30px;line-height:1.25;margin:0 0 6px}h2{margin:32px 0 10px;font-size:21px}section,.card{background:#fff;border:1px solid #dce4ef;border-radius:12px;padding:18px 20px;margin:14px 0}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.kpis div{background:#fff;border:1px solid #dce4ef;border-radius:12px;padding:14px 16px}.kpis small{display:block;color:#5b6b82}.kpis b{font-size:26px}
table{border-collapse:collapse;width:100%;font-size:13.5px}th,td{border-bottom:1px solid #e6ecf4;padding:7px 8px;text-align:left;vertical-align:top}th{background:#f6f8fb;color:#5b6b82;font-weight:600}
.pass{color:#067647;font-weight:700}.fail{color:#b42318;font-weight:700}.muted{color:#5b6b82}code{background:#f2f4f7;padding:1px 5px;border-radius:4px;font-size:12.5px}
details summary{cursor:pointer;font-weight:600}td.d{font-family:ui-monospace,Consolas,monospace;font-size:11.5px;color:#475467;word-break:break-all;max-width:560px}
.shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.shots figure{margin:0;background:#fff;border:1px solid #dce4ef;border-radius:10px;padding:8px}.shots img{width:100%;border-radius:6px;display:block}.shots figcaption{font-size:12px;color:#5b6b82;margin-top:4px}
@media(max-width:720px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}"""
h = ['<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CR-03 UAT · Charmiss Operations Management v8.4.0</title><style>%s</style></head><body><main>' % css]
h.append('<h1>CR-03 UAT — Charmiss Operations Management v8.4.0</h1><p class="muted">ยกระดับ Supply Planning ตามแนวปฏิบัติที่ดี · Phase 3A–3D ครบ · %s · build <code>%s</code> · 25 พ.ย. 2026</p>' % (e(summary['dataset']), e(build)))
h.append('<div class="kpis"><div><small>ทั้งหมด</small><b>%d</b></div><div><small>ผ่าน</small><b class="pass">%d</b></div><div><small>ไม่ผ่าน</small><b class="%s">%d</b></div><div><small>ชุดทดสอบ</small><b>%d</b></div></div>' % (total, passed, 'fail' if total - passed else 'pass', total - passed, len(suites)))
h.append('<h2>ผลแต่ละชุด</h2><section><table><thead><tr><th>ชุด</th><th>ผ่าน / ทั้งหมด</th></tr></thead><tbody>%s</tbody></table></section>' % ''.join('<tr><td>%s</td><td class="%s">%d / %d</td></tr>' % (e(t), 'pass' if p == n else 'fail', p, n) for t, p, n in suites))
h.append('<h2>Anchor (AS OF 23 พ.ย. 2026 · Weekly · L4W · 3M · ไม่กรอง)</h2><section><table><thead><tr><th>ตัวเลข</th><th>วิธีเดิมทั้งหมด (= CR-01)</th><th>วิธีใหม่ทั้งหมด (ค่าเริ่มต้น v8.4.0)</th></tr></thead><tbody>%s</tbody></table><p class="muted">ตรวจทุกชุดด้วย <code>SupUAT.anchors()</code> (วิธีเดิม) และ <code>SupUAT.anchors(\'new\')</code></p></section>' % ''.join('<tr><td>%s</td><td>%s</td><td>%s</td></tr>' % tuple(map(e, a)) for a in ANCHORS))
h.append('<h2>สิ่งที่ต้องยืนยัน / ก่อนใช้งานจริง</h2><section><table><thead><tr><th>#</th><th>ประเภท</th><th>เรื่อง</th><th>หมายเหตุ</th></tr></thead><tbody>%s</tbody></table></section>' % ''.join('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % tuple(map(e, x)) for x in REMAINING))
for key, title in SUITES:
    rs = [r for r in rows if r['key'] == key]
    if not rs: continue
    s = data[key]
    h.append('<h2>%s</h2><section><p class="muted">รันเมื่อ %s · Viewport %spx</p><table><thead><tr><th style="width:34%%">Case</th><th>ผล</th><th>รายละเอียด</th></tr></thead><tbody>%s</tbody></table></section>' % (
        e(title), e(str(s.get('at', ''))[:19].replace('T', ' ')), e(str(s.get('width', ''))),
        ''.join('<tr><td>%s</td><td class="%s">%s</td><td class="d">%s</td></tr>' % (e(r['id']), r['status'].lower(), r['status'], e(r['detail'])) for r in rs)))
if shots:
    h.append('<h2>ภาพหน้าจอ</h2>')
    for ph in ['3A', '3B', '3C', '3D']:
        lst = [x for x in shots if x[0] == ph]
        if lst:
            h.append('<section><h3 style="margin-top:0">Phase %s</h3><div class="shots">%s</div></section>' % (ph, ''.join('<figure><a href="%s"><img src="%s" alt="%s" loading="lazy"></a><figcaption>%s</figcaption></figure>' % (e(p), e(p), e(fn), e(fn)) for _, p, fn in lst)))
h.append('<p class="muted">ไฟล์ในโฟลเดอร์นี้: results.json · UAT-all-cases.csv · summary.json · remaining-items.csv · สร้างโดย tools/make_uat_report_cr03.py จาก localStorage[\'uat.cr03\']</p></main></body></html>')
io.open(os.path.join(OUT, 'CR-03-UAT-2026-11-25.html'), 'w', encoding='utf-8').write(''.join(h))
print('report:', OUT, '·', passed, '/', total)
