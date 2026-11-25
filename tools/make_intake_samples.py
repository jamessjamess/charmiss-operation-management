"""tools/make_intake_samples.py — CR-03 R1 demo files for Supply Setup › รับรายงาน Sales Out (data/samples/).

  sales-out-7eleven-A01-2026-11-23.csv   7-Eleven weekly report, 7-Eleven item codes (mapped by the table the Integrated demo
                                         seeds: code = 71100000 + (row of the SKU in sku_master + 1) × 13), Thai headers, dd/mm/yyyy
  sales-out-watsons-A02-2026-11-16.xlsx  Watsons, Charmiss SKUs, a week already in the history → tests Replace / Skip
  sales-out-errors-example.csv           wrong date, not a Monday, future week, unknown code, negative / text quantity

Quantities follow the account's last 4 weeks (± 15 %) and never exceed the remaining at the snapshot, so importing them keeps
every CR-01 anchor at AS OF 23 Nov 2026 unchanged. Deterministic (fixed seed)."""
import csv, os, random
from collections import defaultdict

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DATA = os.path.join(ROOT, 'data')
OUT = os.path.join(DATA, 'samples')
os.makedirs(OUT, exist_ok=True)
rnd = random.Random(20261123)


def read(name):
    with open(os.path.join(DATA, name), encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))


skus = read('sku_master.csv')
idx = {s['sku']: k for k, s in enumerate(skus)}
name = {s['sku']: s['name'] for s in skus}
so = read('sales_out.csv')
lots = read('stock_lot.csv')
snap = lots[0]['snapshot_date']


def last4(acc):
    weeks = sorted({r['date'] for r in so if r['account_id'] == acc})[-4:]
    q, v = defaultdict(float), defaultdict(float)
    for r in so:
        if r['account_id'] == acc and r['date'] in weeks:
            q[r['sku']] += float(r['qty']); v[r['sku']] += float(r['value'] or 0)
    return weeks, {k: q[k] / 4 for k in q}, {k: (v[k] / q[k] if q[k] else 0) for k in q}


def remaining(acc):
    rem = defaultdict(float)
    for r in lots:
        if r['location'] == acc:
            rem[r['sku']] += float(r['qty'])
    return rem


# 1) 7-Eleven — the new week (Monday = the snapshot)
weeks, avg, price = last4('A01')
rem = remaining('A01')
rows = []
for sku in sorted(avg):
    q = int(round(avg[sku] * rnd.uniform(0.85, 1.15)))
    q = max(0, min(q, int(rem.get(sku, 0))))
    code = 71100000 + (idx[sku] + 1) * 13
    d = snap.split('-')
    rows.append([f'{d[2]}/{d[1]}/{d[0]}', code, name[sku], q, round(q * price[sku], 2)])
with open(os.path.join(OUT, 'sales-out-7eleven-A01-2026-11-23.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['สัปดาห์ (เริ่มวันจันทร์)', 'รหัสสินค้า 7-11', 'ชื่อสินค้า', 'ขายได้ (ชิ้น)', 'ยอดขาย (บาท)']); w.writerows(rows)

# 2) Watsons — a week already in the history (16 Nov): the same SKUs, slightly different numbers → Replace / Skip
from openpyxl import Workbook
import datetime
wk = sorted({r['date'] for r in so if r['account_id'] == 'A02'})[-1]
wb = Workbook(); ws = wb.active; ws.title = 'Sales Out'
ws.append(['Week start', 'SKU', 'Description', 'Units sold', 'Sales (THB)'])
y, m, dd = map(int, wk.split('-'))
for r in sorted((r for r in so if r['account_id'] == 'A02' and r['date'] == wk), key=lambda r: r['sku']):
    q = max(0, int(float(r['qty'])) + rnd.choice([-2, -1, 0, 0, 0, 1, 2]))
    p = float(r['value']) / float(r['qty']) if float(r['qty']) else 0
    ws.append([datetime.datetime(y, m, dd), r['sku'], name[r['sku']], q, round(q * p, 2)])
for c in ws['A'][1:]:
    c.number_format = 'yyyy-mm-dd'
wb.save(os.path.join(OUT, 'sales-out-watsons-A02-2026-11-16.xlsx'))

# 3) a file with mistakes (each line shows one rule)
with open(os.path.join(OUT, 'sales-out-errors-example.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['date', 'sku', 'qty'])
    w.writerows([['2026-11-16', 'CM-CH-001', 12],      # fine
                 ['2026-11-18', 'CM-CH-002', 5],       # Wednesday (fine only with "round to Monday")
                 ['2027-01-04', 'CM-CH-003', 8],       # future week
                 ['16/13/2026', 'CM-CH-004', 3],       # unreadable date
                 ['2026-11-16', 'XX-NOPE-01', 4],      # unknown SKU
                 ['2026-11-16', 'CM-CH-005', -6],      # negative
                 ['2026-11-16', 'CM-CH-006', 'สิบ']])  # not a number
print('samples:', os.listdir(OUT), 'A01 rows', len(rows), 'units', sum(r[3] for r in rows))
