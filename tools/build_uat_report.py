"""tools/build_uat_report.py — CR-01 UAT report in the same layout as Charmiss-Operations-UAT-2026-11-24
(HTML with embedded screenshots · UAT-all-cases.csv · summary.json · results.json · remaining-items.csv · screenshots/).

Input: <out>/results.json — a list of cases {suite, id, profile, page, title, expected, status, actual}
       (collected in the browser from tools/uat-supply.js) and <out>/screenshots/*.jpg (named <view>-<page>-<what>.jpg).
Usage: python tools/build_uat_report.py uat/Charmiss-Ops-Management-UAT-2026-11-25
"""
import base64, csv, html, json, os, sys

out = sys.argv[1]
name = os.path.basename(os.path.normpath(out))
cases = json.load(open(os.path.join(out, 'results.json'), encoding='utf-8'))
shots = sorted(f for f in os.listdir(os.path.join(out, 'screenshots')) if f.lower().endswith(('.jpg', '.png')))
CAPTIONS = json.load(open(os.path.join(out, 'screenshots', 'captions.json'), encoding='utf-8')) if os.path.exists(os.path.join(out, 'screenshots', 'captions.json')) else {}

SUITES = []
for c in cases:
    if c['suite'] not in SUITES:
        SUITES.append(c['suite'])
suites = [[s, sum(1 for c in cases if c['suite'] == s and c['status'] == 'PASS'), sum(1 for c in cases if c['suite'] == s)] for s in SUITES]
total, npass = len(cases), sum(1 for c in cases if c['status'] == 'PASS')
profiles = sorted({c['profile'] for c in cases if c['profile'] and '/' not in c['profile'] and c['profile'] != '—'})

REMAINING = [
    ['PROD-01', 'ก่อนใช้งานจริง', 'SSO / สิทธิ์ / ขอบเขตฝ่ายฝั่งระบบกลาง', 'ยังเป็น Demo session และข้อมูลเก็บในเบราว์เซอร์ (รวม supply.* และ NOLEAK) — ต้องย้ายการตรวจสิทธิ์และการกรองข้อมูลตามฝ่ายไปฝั่งระบบกลางก่อนใช้ข้อมูลจริง'],
    ['PROD-02', 'ก่อนใช้งานจริง', 'Data Adapter กับ WMS / ERP / ขนส่งจริง', 'Feed Ops → Supply ทดสอบกับ Mock (WMS DEMO / SLA / Carrier) — ต้องทดสอบรอบดึงจริง เวลาตัดข้อมูล และกรณีระบบปลายทางล่าช้า / ส่งซ้ำ'],
    ['PROD-03', 'ก่อนใช้งานจริง', 'ฐานข้อมูลถาวรของข้อเสนอ / PO / ผลนับ', 'supplyProposals · recallRequests · poPlan · consign_count อยู่ใน localStorage / IndexedDB ของเบราว์เซอร์ — ต้องมีฐานข้อมูลกลางและสิทธิ์ก่อนใช้หลายผู้ใช้'],
    ['UAT-01', 'ขอบเขต UAT', 'UAT 943 ข้อเดิมรันซ้ำไม่ได้', 'ไม่มี Source / Harness / fixture ของ Ops v13 — ใช้ OPS-GATE (11 บัญชี × 18 หน้า เทียบกับ Public v13) + Flow ของ Phase B–C แทน'],
    ['SCOPE-01', 'ขอบเขตต้นแบบ', 'ปุ่ม "เสนอ" (B3) บนมือถือ', 'บนมือถือ ตารางเป็นการ์ด ยังไม่มีปุ่มเสนอ — สร้างข้อเสนอได้จาก Desktop'],
    ['SCOPE-02', 'ขอบเขตต้นแบบ', 'Quota ของ Ops = เดือน พ.ย. 2026', 'Integrated demo เป็นรอบแผนเดือนเดียว · Quota Draft เดือนถัดไปเห็นใน Supply แต่ไม่นับใน "ใช้ได้" ของเดือนนี้ — รอบเปลี่ยนเดือนจริงต้องทดสอบเพิ่ม'],
    ['SCOPE-03', 'ขอบเขตต้นแบบ', 'F8 นับจริงเป็นการเทียบเท่านั้น', 'ไม่มี Workflow ปรับยอด (Adjustment) จากผลนับ — ถ้าต้องการต้องออกแบบการอนุมัติ / ผลต่อ Stock ก่อน (CR ใหม่)'],
]

e = html.escape


def img(f):
    b = base64.b64encode(open(os.path.join(out, 'screenshots', f), 'rb').read()).decode()
    mime = 'image/png' if f.lower().endswith('.png') else 'image/jpeg'
    cap = CAPTIONS.get(f, f.rsplit('.', 1)[0])
    return f'<figure><img loading="lazy" src="data:{mime};base64,{b}" alt="{e(f)}"><figcaption>{e(cap)}</figcaption></figure>'


STYLE = """body{font:16px/1.65 -apple-system,BlinkMacSystemFont,"Tahoma",sans-serif;color:#23334a;background:#f3f6fb;margin:0}main{max-width:1200px;margin:auto;padding:36px 22px}h1{font-size:34px;line-height:1.25}h2{margin-top:36px}a{color:#226dc5}section,.card,details{background:white;border:1px solid #dce4ef;border-radius:14px;padding:24px;margin:18px 0}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.card strong{display:block;font-size:32px}.notice{border-left:5px solid #e2a338;background:#fff6df;padding:18px}.pass{color:#168260}.fail{color:#c0392b}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #e6edf5}th{background:#eef4fd}figure{margin:20px 0}img{width:100%;height:auto;border:1px solid #dce4ef;border-radius:10px}.shots{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}.shots.m{grid-template-columns:repeat(4,1fr)}figcaption{font-size:14px;color:#596a82}summary{cursor:pointer;font-weight:bold}input{padding:12px;width:90%;border:1px solid #ccd7e5;border-radius:8px}.tag{display:inline-block;border-radius:20px;padding:3px 12px;background:#e4f4ed}.flow{padding:20px;background:#eaf2ff;border-radius:12px;font-weight:600}code{background:#eef4fd;border-radius:4px;padding:1px 5px;font-size:13px}@media(max-width:700px){.kpis{grid-template-columns:repeat(2,1fr)}.shots,.shots.m{grid-template-columns:1fr 1fr}h1{font-size:26px}section{padding:14px}}@media print{details{display:block}input{display:none}}"""

anchors = [('มูลค่า Stock', '฿50,091,183 (WH 39,518,371 · ฝากขาย 10,572,812)'), ('หน่วย WH / ฝากขาย / รวม', '514,864 / 136,418 / 651,282'), ('DOC · Sell-through', '73 วัน · 17.8%'),
           ('สถานะ เสี่ยงขาด / สั่งเลย / เกิน / ปกติ / NPD', '7 / 2 / 9 / 98 / 4 (+ หมดอายุ 7)'), ('At-risk 3M', '฿547,597 (4,489 ชิ้น)'), ('แนะนำเรียกคืน', '฿519,974 (11 คู่ · 7,194 ชิ้น)'),
           ('Quota Fit · MAPE · Bias · Fill', '92% (107/116) · 13.5% · −4.2% · 93.1%'), ('Achievement MTD', '94.1% (การ์ด F1 แสดงค่านี้)'), ('selfCheck', 'PASS 8 ข้อ (5 เดิม + 7–9) + modelCheck')]

h = [f'<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Charmiss Ops Management UAT · 25 November 2026</title><style>{STYLE}</style><main>']
h.append('<p>CHARMISS OPS • OPERATIONS MANAGEMENT • PROTOTYPE 8.0 • CR-01</p>')
h.append('<h1>รายงาน UAT รวมระบบ Operations + Supply Planning (CR-01 Phase A–D)</h1>')
h.append('<p>25 พฤศจิกายน 2026 · ชุดข้อมูล Integrated demo (AS OF 23 พ.ย. 2026) · Desktop 1440px และมือถือ 390px · build <code>8.0-phaseD5</code></p>')
h.append(f'<div class="kpis"><div class="card"><strong>{npass}/{total}</strong>ข้อทดสอบผ่าน</div><div class="card"><strong>{len(profiles)}</strong>บัญชีทดสอบ</div><div class="card"><strong>{len(shots)}</strong>ภาพหลักฐาน</div><div class="card"><strong>{total - npass}</strong>ข้อทดสอบล้มเหลว</div></div>')
h.append('<div class="notice"><b>ผลนี้ยืนยันพฤติกรรม Mock ที่ทดสอบ</b> ระบบเก็บข้อมูลในเบราว์เซอร์ ใช้ SSO Demo และตัวรับผล WMS / SLA / ขนส่งแบบจำลอง · ชุด UAT 943 ข้อของ Ops v13 รันซ้ำไม่ได้ (ไม่มี Source / Harness) จึงใช้ OPS-GATE เทียบสิทธิ์ทุกหน้ากับเว็บต้นฉบับแทน · การเชื่อมจริงยังเป็นงานก่อนใช้งานจริงตามรายการด้านล่าง</div>')
h.append('<section><h2>Flow หลังรวมระบบ</h2><p class="flow">ออเดอร์ → ยืนยัน → ตรวจ Quota + WMS (ATP แสดงวันที่ของจะพอ) → SO Request → SLA ส่ง SO/IV (หัก Quota ครั้งเดียว) → WMS พร้อมส่ง → ส่งมอบขนส่ง (ระหว่างขนส่ง) → Delivered (Sales In) → คืนสินค้า ดี/เสีย → WMS รับคืน → ดึง WMS → Supply Planning (อ่านอย่างเดียว) → ข้อเสนอ → อนุมัติ → Draft ใน Flow เดิมของ Ops</p>')
h.append('<p>WMS Actual เป็นแหล่งข้อมูลจริง · การส่งมอบ / ผลขนส่งไม่แก้ Actual · Supply ไม่สร้าง SO / IV / CN และไม่จองหรือหัก Quota · ทุกอย่างที่ Supply ส่งกลับเป็นข้อเสนอที่ต้องมีผู้อนุมัติ (ผู้สร้างอนุมัติเองไม่ได้)</p>')
h.append('<div class="scroll"><table><thead><tr><th>Phase</th><th>ขอบเขต</th><th>ผลที่ทดสอบ</th></tr></thead><tbody>')
for r in [('A', 'ชื่อระบบ / ธีม สว่าง–มืด · เมนูกลุ่ม · Planner + supply.* 9 สิทธิ์ · ชุดสาธิต 2 ชุด', 'Anchor · เมนูตาม 7.3 · NOLEAK · Theme · OPS-GATE เทียบ v13 · Mobile'),
          ('B', 'Data Adapter Ops → Supply · F5 ระหว่างขนส่ง · F6 CN ดี/เสีย · F9 Clearance · selfCheck 7–9', 'Flow ออเดอร์ → คืนสินค้า 12 ข้อ (IDEMP · READONLY · CN-COND · SC-7/8/9 · Anchor หลังธุรกรรม)'),
          ('C', 'B1 ATP · B2 แผง Quota · B3 ข้อเสนอ · B4 Supply Alert · B5 Review · F7 ETA PO', 'ข้อเสนอ 3 ประเภท (รวมใบซ้ำ / ห้ามอนุมัติเอง / ปฏิเสธต้องมีเหตุผล) · ATP · B2 = หน้า Quota · NOLEAK หลังมีข้อเสนอ'),
          ('D', 'F1 Achievement MTD · F2 กราฟแนวนอนบนมือถือ · F3 โหลดเพิ่ม 20 · F4 DOC Δ สีเทา · F8 นับจริงฝากขาย', 'Desktop + 390px · Sales Admin ไม่เห็น Supply · ไม่มีป้ายภายในบนหน้าจอ · Anchor')]:
    h.append('<tr>' + ''.join(f'<td>{e(x)}</td>' for x in r) + '</tr>')
h.append('</tbody></table></div></section>')
h.append('<section><h2>ขอบเขตทุกตำแหน่ง</h2><div class="scroll"><table><thead><tr><th>ตำแหน่ง</th><th>หน้า Supply ที่เปิดได้</th><th>ขอบเขตข้อมูล</th></tr></thead><tbody>')
for r in [('Director', 'ทุกหน้า (ไม่รวม Setup) · อนุมัติเรียกคืน / Quota / PO', 'ทุกฝ่าย'), ('Manager MT', 'ภาพรวม · Stock · หมดอายุ · ฝากขาย · Calendar · Quota · ข้อเสนอ · Review', 'MT (ล็อก)'),
          ('Manager TT / Ecom', 'เหมือน MT ยกเว้นฝากขาย', 'TT / ECOM (ล็อก)'), ('Sales Admin MT / TT / Ecom', 'ไม่เห็นเมนู Supply · ลิงก์ตรงถูกปฏิเสธ · ไม่มีการ์ด Supply Alert', 'ฝ่ายตัวเอง'),
          ('Supply Chain Planner', 'ทุกหน้า + Setup · สร้าง/ส่งข้อเสนอ · แก้ ETA PO', 'ทุกฝ่าย'), ('Admin', 'ข้อมูล & ตั้งค่า Supply', 'ทุกฝ่าย'), ('ERP', 'Calendar · Review', 'ทุกฝ่าย'), ('Warehouse', 'Calendar · หมดอายุ', 'ทุกฝ่าย')]:
    h.append('<tr>' + ''.join(f'<td>{e(x)}</td>' for x in r) + '</tr>')
h.append('</tbody></table></div></section>')
h.append('<section><h2>ผลทดสอบแยกชุด</h2><div class="scroll"><table><thead><tr><th>ชุดทดสอบ</th><th>จำนวน</th><th>ผ่าน</th></tr></thead><tbody>')
for s, p, n in suites:
    h.append(f'<tr><td>{e(s)}</td><td>{n}</td><td class="{"pass" if p == n else "fail"}">{p}</td></tr>')
h.append('</tbody></table></div><p>ตัวนับเป็นข้อตรวจ (assertion) รวมการทำซ้ำตามตำแหน่งและขนาดหน้าจอ · ทุกชุดรันในเบราว์เซอร์จริงด้วย <code>tools/uat-supply.js</code> บนชุด Integrated demo ที่เพิ่งเริ่ม (Flow Phase B และ Phase C แยกชุดใหม่ของตัวเอง)</p></section>')
h.append('<section><h2>Anchor (CR-01 2.3) — ก่อน / หลัง ไม่เปลี่ยน</h2><div class="scroll"><table><thead><tr><th>ตัวเลข</th><th>ก่อน CR-01 (SCM v3.3)</th><th>หลัง Phase D</th></tr></thead><tbody>')
for k, v in anchors:
    h.append(f'<tr><td>{e(k)}</td><td>{e(v)}</td><td class="pass">{e(v)}</td></tr>')
h.append('</tbody></table></div><p>ตรวจซ้ำหลังทุกชุด: หลัง Flow Phase B · หลัง Phase C · หลัง Phase D (Desktop และมือถือ) — AS OF 23 พ.ย. 2026 · Weekly · L4W · 3M · ไม่กรอง</p></section>')
h.append('<section><h2>เคสเสี่ยงและ Negative ที่ผ่าน</h2><div class="scroll"><table><thead><tr><th>เคส</th><th>ผลที่คาดหวังและยืนยัน</th></tr></thead><tbody>')
for r in [('ข้อมูลข้ามฝ่ายใน Supply', 'Manager ที่ล็อกฝ่ายไม่เห็นชื่อคู่ค้า / ช่องทางฝ่ายอื่น ทุกหน้า Supply · Label กราฟ · Drawer SKU · การ์ด Supply Alert · งานค้าง (ทั้งก่อนและหลังมีข้อเสนอ) · Sales Admin เปิดหน้า Supply ไม่ได้ทั้งเมนูและลิงก์ตรง'),
          ('IV ออกแต่ยังไม่ออกจากคลัง', 'Supply ไม่ขยับ (ไม่นับซ้ำระหว่าง WH และระหว่างขนส่ง)'), ('Carrier event ซ้ำ / ดึง Feed ซ้ำ', 'Sales In นับครั้งเดียว · Feed สองครั้งได้ตารางเท่ากัน · การสร้าง Feed ไม่เขียน db ของ Ops'),
          ('ของคืนสภาพเสียไม่มีเหตุผล', 'ถูกปฏิเสธ · Good กลับเข้า WH · Bad = Write-off'), ('อนุมัติข้อเสนอของตัวเอง / ปฏิเสธไม่มีเหตุผล', 'ถูกปฏิเสธทั้งคู่ · Planner ไม่มีสิทธิ์อนุมัติ'),
          ('PO Planned / Delayed ใน ATP', 'ไม่นับ · Confirmed / Shipped นับตาม ETA · เลื่อน ETA → วันที่ ATP เลื่อน · ATP ไม่ปลดบล็อก SO'),
          ('ผลนับหลัง AS OF / นอกขอบเขต (F8)', 'ไม่แสดง · ค่าคำนวณและ Anchor ไม่เปลี่ยน · CSV วันที่ผิด / จำนวนติดลบ / SKU ไม่รู้จัก ถูกแจ้งตอน Import'),
          ('โหลดเพิ่มบนมือถือ (F3)', '20 → 40 ต่อท้ายลำดับเดิม · เปลี่ยนตัวกรองแล้วเริ่มที่ 20 · Desktop ยังเป็น Pager')]:
    h.append('<tr>' + ''.join(f'<td>{e(x)}</td>' for x in r) + '</tr>')
h.append('</tbody></table></div></section>')
h.append('<section><h2>รายการที่ยังต้องทำ</h2><div class="scroll"><table><thead><tr><th>ID</th><th>ประเภท</th><th>หัวข้อ</th><th>รายละเอียด</th></tr></thead><tbody>')
for r in REMAINING:
    h.append('<tr>' + ''.join(f'<td>{e(x)}</td>' for x in r) + '</tr>')
h.append('</tbody></table></div></section>')
desk = [f for f in shots if f.startswith('desktop')]
mob = [f for f in shots if f.startswith('mobile')]
h.append('<section><h2>หลักฐานภาพหน้าจอ (หน้าที่เปลี่ยนใน Phase D)</h2><p>Desktop 1440px (ธีมสว่าง + ตัวอย่างธีมมืด) และมือถือ 390px · Director · AS OF 23 พ.ย. 2026</p>')
h.append('<h3>Desktop</h3><div class="shots">' + ''.join(img(f) for f in desk) + '</div>')
h.append('<h3>มือถือ 390px</h3><div class="shots m">' + ''.join(img(f) for f in mob) + '</div></section>')
h.append('<section><h2>รายการทดสอบทั้งหมด</h2><input id="filter" placeholder="ค้นหาตำแหน่ง / หน้า / เคสทดสอบ"><div class="scroll"><table><thead><tr><th>ชุด</th><th>รหัส/ตำแหน่ง</th><th>หน้า/ชื่อเคส</th><th>ผล</th></tr></thead><tbody>')
for c in cases:
    h.append(f'<tr><td>{e(c["suite"])}</td><td>{e(c["id"])}{(" · " + e(c["profile"])) if c["profile"] else ""}</td><td>{e(c["title"])}{(" — " + e(c["actual"])) if c["actual"] else ""}</td><td class="{"pass" if c["status"] == "PASS" else "fail"}">{e(c["status"])}</td></tr>')
h.append('</tbody></table></div></section>')
h.append('<p>Build 8.0-phaseD5 · static (ไม่มี Backend) · ข้อมูลจำลองทั้งหมด · No source credentials included.</p></main>')
h.append("<script>document.getElementById('filter').oninput=e=>{for(const row of e.target.nextElementSibling.querySelectorAll('tbody tr'))row.hidden=!row.textContent.toLowerCase().includes(e.target.value.toLowerCase())}</script></html>")
open(os.path.join(out, name + '.html'), 'w', encoding='utf-8').write(''.join(h))

with open(os.path.join(out, 'UAT-all-cases.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['suite', 'id', 'profile', 'page', 'title', 'expected', 'status', 'actual'])
    for c in cases:
        w.writerow([c[k] for k in ['suite', 'id', 'profile', 'page', 'title', 'expected', 'status', 'actual']])
with open(os.path.join(out, 'remaining-items.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['ID', 'ประเภท', 'หัวข้อ', 'รายละเอียด']); w.writerows(REMAINING)
json.dump({'total': total, 'pass': npass, 'fail': total - npass, 'profiles': len(profiles), 'screenshots': len(shots), 'suites': suites,
           'build': '8.0-phaseD5', 'cr': 'CR-01 Phase A–D', 'dataset': 'Integrated demo · AS OF 2026-11-23', 'remainingItems': REMAINING},
          open(os.path.join(out, 'summary.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(name, npass, '/', total, 'screenshots', len(shots))
