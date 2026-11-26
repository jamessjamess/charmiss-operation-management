#!/usr/bin/env python3
"""CR-06 · builds the UAT report (HTML + CSV + JSON) from the compact text the browser keeps (tools/uat-run.js · UatRun.dump()).
    python tools/make_uat_report_cr06.py <raw-results.txt> [out-folder]
Format: '#suite|width|at|build' then 'id|P/F|detail' per line. Screenshots (before / after) are linked from uat/CR-06-screenshots/."""
import csv, html, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'uat', 'CR-06-UAT-2026-11-26')
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
    ('cr06-1440', 'CR-06 ชุดใหม่ ที่ 1440px (ทุกบทบาทสำหรับเมนู / สิทธิ์ · Director + ฝ่ายสำหรับ Drawer / NOLEAK)'),
    ('cr06-390', 'CR-06 ชุดใหม่ ที่ 390px (Drawer เมนูมือถือ · Drawer ออเดอร์ / SKU 360 เต็มจอ)'),
    ('all', 'all(): Anchor CR-01 · เมนูตามสิทธิ์ · NOLEAK ×3 · ธีม · OPS-GATE + cr04() + cr05() + cr06() (1440px)'),
    ('cr05-1440', 'CR-05 (ทดสอบย้อนหลัง) ที่ 1440px'),
    ('cr05-390', 'CR-05 (ทดสอบย้อนหลัง) ที่ 390px'),
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
DECISIONS = json.load(io.open(os.path.join(HERE, 'cr06_decisions.json'), encoding='utf-8'))['decisions']
OPEN = json.load(io.open(os.path.join(HERE, 'cr06_decisions.json'), encoding='utf-8'))['open']

json.dump(rows, io.open(os.path.join(OUT, 'results.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
summary = {'cr': 'CR-06 (+ CR-01 / CR-03 / CR-04 / CR-05 regression)', 'app': 'Charmiss Operations Management v1.6.0', 'build': build, 'dataset': 'Integrated demo · AS OF 2026-11-23',
           'total': total, 'pass': passed, 'fail': total - passed, 'suites': suites, 'anchors': ANCHORS, 'decisions': DECISIONS, 'openIssues': OPEN}
json.dump(summary, io.open(os.path.join(OUT, 'summary.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
with io.open(os.path.join(OUT, 'UAT-all-cases.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['suite', 'id', 'status', 'viewport', 'run_at', 'detail'])
    for r in rows: w.writerow([r['suite'], r['id'], r['status'], r['width'], r['at'], r['detail']])
with io.open(os.path.join(OUT, 'open-issues.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['id', 'area', 'item', 'note']); [w.writerow(x) for x in OPEN]

# before / after pairs: uat/CR-06-screenshots/<nn>-<page>-<width>-before.jpg / -after.jpg
sd, pairs = os.path.join(ROOT, 'uat', 'CR-05-screenshots'), {}
if os.path.isdir(sd):
    for fn in sorted(os.listdir(sd)):
        if not fn.lower().endswith(('.jpg', '.png')): continue
        base = os.path.splitext(fn)[0]
        k, side = (base.rsplit('-', 1) + [''])[:2]
        if side not in ('before', 'after'): k, side = base, 'after'
        pairs.setdefault(k, {})[side] = '../CR-05-screenshots/' + fn
acc_rows = []
ap = os.path.join(OUT, 'raw', 'access-table.txt')
if os.path.exists(ap):
    acc_rows = [l.split('|') for l in io.open(ap, encoding='utf-8').read().splitlines() if l.count('|') == 4]
    with io.open(os.path.join(OUT, 'access-before-after.csv'), 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f); w.writerow(['profile', 'view', 'v1.5 access', 'v1.6 access', 'v1.6 reached from']); [w.writerow(r) for r in acc_rows]
e = html.escape
css = """body{font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","Tahoma",sans-serif;color:#23334a;background:#f3f6fb;margin:0}main{max-width:1200px;margin:auto;padding:32px 20px}
h1{font-size:30px;line-height:1.25;margin:0 0 6px}h2{margin:32px 0 10px;font-size:21px}section{background:#fff;border:1px solid #dce4ef;border-radius:12px;padding:18px 20px;margin:14px 0;overflow-x:auto}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.kpis div{background:#fff;border:1px solid #dce4ef;border-radius:12px;padding:14px 16px}.kpis small{display:block;color:#5b6b82}.kpis b{font-size:26px}
table{border-collapse:collapse;width:100%;font-size:13.5px}th,td{border-bottom:1px solid #e6ecf4;padding:7px 8px;text-align:left;vertical-align:top}th{background:#f6f8fb;color:#5b6b82;font-weight:600}
.pass{color:#067647;font-weight:700}.fail{color:#b42318;font-weight:700}.muted{color:#5b6b82}code{background:#f2f4f7;padding:1px 5px;border-radius:4px;font-size:12.5px}
td.d{font-family:ui-monospace,Consolas,monospace;font-size:11.5px;color:#475467;word-break:break-all;max-width:560px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0 18px}.pair figure{margin:0;background:#fff;border:1px solid #dce4ef;border-radius:10px;padding:8px}.pair img{width:100%;border-radius:6px;display:block}.pair figcaption{font-size:12px;color:#5b6b82;margin-top:4px}.pair.narrow{grid-template-columns:repeat(2,minmax(0,280px))}
@media(max-width:720px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pair,.pair.narrow{grid-template-columns:1fr}}"""
h = ['<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CR-06 UAT · Charmiss Operations Management v1.6.0</title><style>%s</style></head><body><main>' % css]
h.append('<h1>CR-06 UAT — Charmiss Operations Management v1.6.0</h1><p class="muted">เมนูตาม Journey · ชื่อหน้าใหม่ · รวมหน้าที่ซ้ำ · Data Management · %s · build <code>%s</code> · %s</p>' % (e(summary['dataset']), e(build), DATE))
h.append('<div class="kpis"><div><small>ทั้งหมด</small><b>%d</b></div><div><small>ผ่าน</small><b class="pass">%d</b></div><div><small>ไม่ผ่าน</small><b class="%s">%d</b></div><div><small>ชุดทดสอบ</small><b>%d</b></div></div>' % (total, passed, 'fail' if total - passed else 'pass', total - passed, len(suites)))
h.append('<h2>ผลแต่ละชุด</h2><section><table><thead><tr><th>ชุด</th><th>ผ่าน / ทั้งหมด</th></tr></thead><tbody>%s</tbody></table></section>' % ''.join('<tr><td>%s</td><td class="%s">%d / %d</td></tr>' % (e(t), 'pass' if p == n else 'fail', p, n) for t, p, n in suites))
h.append('<h2>Anchor (AS OF 23 พ.ย. 2026 · Weekly · L4W · 3M · ไม่กรอง)</h2><section><table><thead><tr><th>ตัวเลข</th><th>วิธีเดิม (= CR-01)</th><th>วิธีใหม่ CR-03 (ค่าเริ่มต้น)</th></tr></thead><tbody>%s</tbody></table><p class="muted">CR-06 เปลี่ยนเมนู / ชื่อ / ที่อยู่ของหน้า — ไม่เปลี่ยนตัวเลข — <code>SupUAT.anchors()</code> / <code>anchors(\'new\')</code> ตรงทุกค่า (SUP-ANCHOR · CR3-ANCHOR-NEW · CR4-ANCHOR-STAY)</p></section>' % ''.join('<tr><td>%s</td><td>%s</td><td>%s</td></tr>' % tuple(map(e, a)) for a in ANCHORS))
h.append('<h2>CR-06 Decisions</h2><section><table><thead><tr><th>#</th><th>ตัดสินใจ</th></tr></thead><tbody>%s</tbody></table></section>' % ''.join('<tr><td>%s</td><td>%s</td></tr>' % tuple(map(e, x)) for x in DECISIONS))
h.append('<h2>CR-06 Open issues</h2><section><table><thead><tr><th>#</th><th>ส่วน</th><th>เรื่อง</th><th>หมายเหตุ</th></tr></thead><tbody>%s</tbody></table></section>' % ''.join('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % tuple(map(e, x)) for x in OPEN))
for key, title in SUITES:
    rs = [r for r in rows if r['key'] == key]
    if not rs: continue
    s = data[key]
    h.append('<h2>%s</h2><section><p class="muted">รันเมื่อ %s · Viewport %spx</p><table><thead><tr><th style="width:34%%">Case</th><th>ผล</th><th>รายละเอียด</th></tr></thead><tbody>%s</tbody></table></section>' % (
        e(title), e(str(s.get('at', ''))[:19].replace('T', ' ')), e(str(s.get('width', ''))),
        ''.join('<tr><td>%s</td><td class="%s">%s</td><td class="d">%s</td></tr>' % (e(r['id']), r['status'].lower(), r['status'], e(r['detail'])) for r in rs)))
if pairs:
    h.append('<h2>ภาพเมนูทุกบทบาท · Drawer ออเดอร์ / SKU 360</h2><section><p class="muted">Integrated demo · เดสก์ท็อป 1440px และมือถือ 390px</p>')
    for k in sorted(pairs):
        p = pairs[k]
        figs = ''.join('<figure><a href="%s"><img src="%s" alt="%s" loading="lazy"></a><figcaption>%s</figcaption></figure>' % (e(p[s]), e(p[s]), e(k + ' ' + s), 'ก่อน' if s == 'before' else 'หลัง') for s in ('before', 'after') if s in p)
        h.append('<h3 style="font-size:15px;margin:14px 0 4px">%s</h3><div class="pair%s">%s</div>' % (e(k), ' narrow' if '-390' in k else '', figs))
    h.append('</section>')
if acc_rows:
    profs = list(dict.fromkeys(r[0] for r in acc_rows)); views = list(dict.fromkeys(r[1] for r in acc_rows)); cell = {(r[0], r[1]): r for r in acc_rows}
    def mark(r):
        if not r: return ''
        a, b, c = r[2], r[3], r[4]
        return ('✓' if b == 'Y' else '—') + ('' if a == b else ' (เดิม ' + ('✓' if a == 'Y' else '—') + ')') + (' · เมนู' if c == 'menu' else '')
    h.append('<h2>ตารางเทียบสิทธิ์ก่อน (v1.5) / หลัง (v1.6)</h2><section><p class="muted">✓ เข้าได้ · — เข้าไม่ได้ · "เมนู" = ไปถึงได้จากเมนูหรือแท็บของหน้าที่รวมแล้ว · ไฟล์ access-before-after.csv</p><table><thead><tr><th>หน้า</th>%s</tr></thead><tbody>%s</tbody></table></section>' % (''.join('<th>%s</th>' % e(p) for p in profs), ''.join('<tr><td>%s</td>%s</tr>' % (e(v), ''.join('<td>%s</td>' % e(mark(cell.get((p, v)))) for p in profs)) for v in views)))
h.append('<p class="muted">ไฟล์ในโฟลเดอร์นี้: raw/ · raw-results.txt · results.json · UAT-all-cases.csv · summary.json · open-issues.csv · สร้างโดย tools/make_uat_report_cr06.py</p></main></body></html>')
io.open(os.path.join(OUT, 'CR-06-UAT-2026-11-26.html'), 'w', encoding='utf-8').write(''.join(h))
print('report:', OUT, '·', passed, '/', total)
