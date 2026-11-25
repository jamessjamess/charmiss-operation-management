#!/usr/bin/env python3
"""
generate_mock.py — reconciling mock data for the Charmiss Supply Chain Dashboard.

Run:  python tools/generate_mock.py            (writes ./data/*.csv + data/mock-bundle.js)

How the numbers stay consistent
-------------------------------
The script simulates 52 weeks forward, SKU by SKU, lot by lot (FEFO), starting from an opening stock.
Every movement it makes is written to a CSV row, and the stock it ends with is written to stock_lot.csv.
So for every SKU and every location:   Opening + In − Out = Closing   holds exactly
(the dashboard's selfCheck() rebuilds the opening from the snapshot and the flows and checks it).

Stock model (same as js/calc.js)
  WH            : + PO received + CN Good (any account) − Sales In (any account)
  Consignment   : + Sales In − Sales Out − CN (Good and Bad)       (accounts with is_consignment = Y)
  Outright      : Sales In = Sales Out (ownership passes on delivery), nothing remains at the account
  Total = WH + Σ Consignment

Scenarios written on purpose (all visible in Phase 1):
  * Viral surge SKUs (demand × 2.2 for the last 9 weeks, ordering stopped, open PO Delayed) → Stockout Risk
  * Ordering stopped at week 40                                                            → Reorder Now
  * Slow SKUs with a large MOQ, Discontinued SKUs with stock left                          → Overstock
  * One cushion over-pushed to Big C with an old lot                                       → Overstock + Expiry Risk at one account
  * Pairs with quota set too high (Sales In >> Sales Out) / too low
  * NPD launched in the last weeks, NPD with stock but no sales, NPD with only an open PO
  * A recall CN, damaged / near-expiry / slow-moving CNs, planned CNs ahead
"""
import csv, json, math, os, random, sys
from datetime import date, timedelta
from collections import defaultdict

SEED = 20261123
SNAP = date(2026, 11, 23)            # snapshot = AS OF default (a Monday) — stock_lot is the stock at the start of this day
WEEKS = 52
START = SNAP - timedelta(weeks=WEEKS)  # 2025-11-24 (Monday)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(HERE, '..', 'data')
rng = random.Random(SEED)

# ----------------------------------------------------------------------------------------------- masters
BRANDS = {"CM": "Charmiss", "CP": "Charmiss Pro", "TF": "Tofu Skincare", "JB": "Juicy Bloom"}
CATS = {
    "FD": dict(name="Cushion & Foundation", cost=(85, 140), sl=24, lines=["Airy Cushion", "Glow Skin Foundation", "Matte Cover Cushion", "Serum Foundation"]),
    "LP": dict(name="Lip", cost=(35, 60), sl=30, lines=["Glowy Lip Tint", "Velvet Matte Lip", "Juicy Lip Gloss", "Lip & Cheek Tint"]),
    "EY": dict(name="Eye", cost=(30, 55), sl=36, lines=["Slim Brow Pencil", "Waterproof Liner", "Curl Mascara", "Mini Eye Palette"]),
    "CH": dict(name="Cheek", cost=(40, 70), sl=36, lines=["Crystal Blush", "Cream Blush", "Highlighter Stick"]),
    "PW": dict(name="Powder", cost=(45, 80), sl=36, lines=["Oil Control Powder", "Loose Setting Powder", "Two-way Cake"]),
    "SK": dict(name="Skincare", cost=(60, 150), sl=24, lines=["Sunscreen SPF50", "Hydra Serum", "Cleansing Water", "Sleeping Mask", "Toner Pad"]),
}
MIX = {  # brand → category → number of SKUs (120 in total)
    "CM": {"FD": 10, "LP": 12, "EY": 6, "CH": 8, "PW": 6, "SK": 3},
    "CP": {"FD": 8, "LP": 4, "EY": 5, "CH": 2, "PW": 4, "SK": 2},
    "TF": {"LP": 6, "SK": 12, "FD": 3, "CH": 2, "PW": 1, "EY": 1},
    "JB": {"LP": 8, "CH": 6, "EY": 5, "FD": 2, "PW": 2, "SK": 2},
}
SHADES = ["01 Rose", "02 Coral", "03 Nude", "04 Berry", "05 Peach", "06 Brick", "07 Mauve", "08 Cherry",
          "N1 Ivory", "N2 Natural", "N3 Sand", "N4 Honey"]
SIZES = ["30ml", "50ml", "100ml", "15g", "200ml"]
SUPPLIERS = {"CM": "Siam Cosmetic OEM", "CP": "K-Beauty Lab Co.", "TF": "Asia Formula Co.", "JB": "Bangkok Pack & Fill"}

# account_id, name, channel, sub_channel, consignment, min shelf life %, delivery lead days, demand weight, listing prob
ACCOUNTS = [
    ("A01", "7-Eleven", "MT", "CVS", "Y", 0.67, 5, 0.16, 0.45),
    ("A02", "Watsons", "MT", "Drugstore", "Y", 0.60, 7, 0.12, 0.80),
    ("A03", "Eveandboy", "MT", "Beauty Store", "Y", 0.50, 7, 0.10, 0.75),
    ("A04", "Boots", "MT", "Drugstore", "Y", 0.60, 7, 0.05, 0.50),
    ("A05", "Tops", "MT", "Supermarket", "Y", 0.50, 5, 0.03, 0.40),
    ("A06", "Big C", "MT", "Hypermarket", "Y", 0.50, 7, 0.05, 0.50),
    ("A07", "Lotus's", "MT", "Hypermarket", "Y", 0.50, 7, 0.05, 0.50),
    ("A08", "Dealer", "TT", "Dealer", "N", 0.40, 10, 0.08, 0.70),
    ("A09", "Wholesale", "TT", "Wholesale", "N", 0.40, 10, 0.06, 0.60),
    ("A10", "Shopee", "ECOM", "Marketplace", "N", 0.30, 2, 0.14, 0.95),
    ("A11", "Lazada", "ECOM", "Marketplace", "N", 0.30, 2, 0.07, 0.85),
    ("A12", "TikTok Shop", "ECOM", "Social Commerce", "N", 0.30, 2, 0.09, 0.85),
]
ACC = {a[0]: a for a in ACCOUNTS}
PRICE_FACTOR = {"MT": 0.62, "TT": 0.50, "ECOM": 0.80}
SEAS = {1: .95, 2: .95, 3: 1.0, 4: 1.06, 5: .95, 6: .90, 7: .95, 8: 1.0, 9: 1.0, 10: 1.05, 11: 1.15, 12: 1.2}


def round_to(x, m):
    return int(m * max(0, round(x / m)))


def month_add(d, n):
    y, m = d.year + (d.month - 1 + n) // 12, (d.month - 1 + n) % 12 + 1
    return date(y, m, 1)


def days_in_month(d):
    return (month_add(d, 1) - date(d.year, d.month, 1)).days


def double_day_in_week(ws):  # 9.9, 10.10, 11.11, 12.12 … mega-sale days for ECOM
    for i in range(7):
        d = ws + timedelta(days=i)
        if d.month == d.day:
            return True
    return False


# ----------------------------------------------------------------------------------------------- SKUs
skus = []
n = 0
for bcode, cats in MIX.items():
    for ccode, cnt in cats.items():
        c = CATS[ccode]
        for i in range(cnt):
            n += 1
            line = c["lines"][i % len(c["lines"])]
            if ccode == "SK":
                variant = SIZES[(i // len(c["lines"])) % len(SIZES)]
            else:
                variant = SHADES[(i * 5 + n) % len(SHADES)]
            cost = round(rng.uniform(*c["cost"]), 2)
            price = int(round(cost * rng.uniform(2.8, 3.6) / 10.0)) * 10 - 1
            d = min(3500, max(40, math.exp(rng.gauss(math.log(330), 0.8))))
            moq = next((m for m in (1000, 2000, 3000, 5000, 10000) if m >= d * 6), 10000)
            skus.append(dict(
                sku=f"{bcode}-{ccode}-{len([s for s in skus if s['sku'].startswith(bcode + '-' + ccode)]) + 1:03d}",
                name=f"{BRANDS[bcode]} {line} {variant}", brand=BRANDS[bcode], bcode=bcode, category=c["name"], ccode=ccode,
                uom="pcs", unit_cost=cost, std_price=price, shelf_life_months=c["sl"], moq=moq,
                lead_time_days=rng.choice([45, 60, 60, 75, 90, 105]), safety_days=rng.choice([14, 21, 21, 30]),
                status="Active", d=d, slope=rng.uniform(-0.25, 0.3), idx=n))

# ---------- scenario assignment (deterministic)
pool = list(range(len(skus)))
rng.shuffle(pool)
take = lambda k: [pool.pop() for _ in range(k)]
NPD_LAUNCHED, NPD_STOCK, NPD_PO = take(4), take(2), take(2)
DISCONTINUE = take(5)
SURGE = take(4)
STOP40 = take(5)
SLOW_BIG_MOQ = take(3)
for i in NPD_LAUNCHED + NPD_STOCK + NPD_PO:
    skus[i]["status"] = "NPD"
for i in DISCONTINUE:
    skus[i]["status"] = "Discontinue"; skus[i]["d"] = rng.uniform(40, 110)
for i in SLOW_BIG_MOQ:
    skus[i]["d"] = rng.uniform(45, 90); skus[i]["moq"] = 10000
for i in SURGE:
    skus[i]["d"] = max(skus[i]["d"], 500)
for i in NPD_LAUNCHED:
    skus[i]["launch_w"] = rng.randint(42, 47)
for i in NPD_STOCK + NPD_PO:
    skus[i]["launch_w"] = 999  # not launched yet

# listing per SKU
for s in skus:
    lst = [a[0] for a in ACCOUNTS if rng.random() < a[8]]
    for must in ("A10", "A02"):
        if must not in lst:
            lst.append(must)
    w = {a: ACC[a][7] * rng.uniform(0.6, 1.4) for a in lst}
    tot = sum(w.values())
    s["share"] = {a: w[a] / tot for a in sorted(lst)}

# Big C overstock + old lot (needs Big C listed)
BIGC = next(i for i in pool if skus[i]["ccode"] == "FD")
pool.remove(BIGC)
s = skus[BIGC]
s["d"] = max(s["d"], 700)
s["share"]["A06"] = 0.0
tot = sum(s["share"].values()); s["share"] = {a: v / tot * 0.96 for a, v in sorted(s["share"].items())}
s["share"]["A06"] = 0.04   # Big C sells little of it …
RECALL = pool.pop()
OLD_LOT = set(rng.sample(pool, 18))   # opening lot already old → near-expiry CNs during the year, expiry risk at AS OF
for i in DISCONTINUE:
    skus[i]["slope"] = -0.3

# quota fit per consignment pair: normal ~1.0 · over (Sales In follows quota) · under (partner orders more) · capped (Sales In follows a low quota)
pair_kind = {}
pairs = [(i, a) for i in pool for a in skus[i]["share"] if ACC[a][4] == "Y"]
rng.shuffle(pairs)
for k, p in enumerate(pairs):
    pair_kind[p] = "over" if k < 7 else "under" if k < 11 else "capped" if k < 14 else "normal"
pair_kind[(BIGC, "A06")] = "bigc"
fit = {}
for i, s in enumerate(skus):
    for a in s["share"]:
        kind = pair_kind.get((i, a), "normal")
        fit[(i, a)] = {"over": rng.uniform(1.7, 2.0), "under": rng.uniform(0.55, 0.65), "capped": rng.uniform(0.5, 0.6),
                       "bigc": 1.0, "normal": rng.uniform(0.92, 1.08)}[kind]
        if ACC[a][4] == "N":
            fit[(i, a)] = rng.uniform(0.9, 1.12)
for i in SURGE:
    for a in skus[i]["share"]:
        fit[(i, a)] = rng.uniform(0.9, 1.0)

# ----------------------------------------------------------------------------------------------- simulation
rows_sales_in, rows_sales_out, rows_cn, rows_po, rows_lot, rows_quota = [], [], [], [], [], []
cn_seq = [0]
po_seq = [0]
opening_check = {}   # (sku, loc) → opening qty, to verify the reconciliation at the end


def new_cn(dt, sku, acc, qty, reason, cond, status="Received"):
    cn_seq[0] += 1
    rows_cn.append(dict(cn_no=f"CN{dt:%y%m}-{cn_seq[0]:04d}", date=dt.isoformat(), sku=sku, account_id=acc, qty=int(qty),
                        reason=reason, condition=cond, status=status))


def demand_mult(s, w, ws):
    m = SEAS[ws.month] * (1 + s["slope"] * (w / WEEKS - 0.5))
    lw = s.get("launch_w")
    if lw is not None:
        if w < lw:
            return 0.0
        m *= min(1.0, 0.45 + 0.15 * (w - lw))
    return m


for i, s in enumerate(skus):
    sku, sl_days = s["sku"], s["shelf_life_months"] * 30.44
    lots = defaultdict(list)   # loc → [lot_no, mfg, exp, qty]
    lot_seq = [0]

    def mk_lot(mfg):
        lot_seq[0] += 1
        return f"L{mfg:%y%m}-{s['idx']:03d}{lot_seq[0]:02d}"

    def put(loc, lot_no, mfg, exp, q):
        if q <= 0:
            return
        for L in lots[loc]:
            if L[0] == lot_no:
                L[3] += q; return
        lots[loc].append([lot_no, mfg, exp, q])

    def take(loc, q, dt, min_pct=0.0, newest=False):
        """FEFO out of `loc` (newest=True: latest expiry first): only lots not expired and with ≥ min_pct of shelf life left."""
        got = []
        for L in sorted(lots[loc], key=lambda L: (L[2], L[1]), reverse=newest):
            if q <= 0:
                break
            if L[3] <= 0 or (L[2] - dt).days < min_pct * sl_days or L[2] <= dt:
                continue
            k = min(q, L[3]); L[3] -= k; q -= k; got.append((L, k))
        lots[loc] = [L for L in lots[loc] if L[3] > 0]
        return got

    def avail(loc, dt, min_pct=0.0):
        return sum(L[3] for L in lots[loc] if (L[2] - dt).days >= min_pct * sl_days and L[2] > dt)

    def qty(loc):
        return sum(L[3] for L in lots[loc])

    shares, d = s["share"], s["d"]
    cons_accs = [a for a in shares if ACC[a][4] == "Y"]
    out_accs = [a for a in shares if ACC[a][4] == "N"]
    launched = s.get("launch_w") is None
    old_accs = set()

    # ---------- opening stock at START
    if launched and s["status"] != "NPD":
        cover = rng.uniform(70, 100) if s["status"] == "Discontinue" else rng.uniform(7, 12)
        if i in SLOW_BIG_MOQ:
            cover = rng.uniform(85, 110)
        mfgA = START - timedelta(days=rng.randint(90, 260))
        if i in OLD_LOT:
            mfgA = START - timedelta(days=int(sl_days) - rng.randint(400, 520))
        mfgB = START - timedelta(days=rng.randint(15, 60))
        if i == BIGC:
            mfgA = date(2025, 3, 10)   # exp ≈ Mar 2027 → ~4 months left at AS OF
        expA = mfgA + timedelta(days=int(sl_days)); expB = mfgB + timedelta(days=int(sl_days))
        lotA, lotB = mk_lot(mfgA), mk_lot(mfgB)
        whq = int(d * cover)
        if i == BIGC:
            whq = int(d * 24)
        put("WH", lotA, mfgA, expA, int(whq * 0.55)); put("WH", lotB, mfgB, expB, whq - int(whq * 0.55))
        for a in cons_accs:
            wk = d * shares[a]
            cq = int(wk * (3 if a == "A01" else 5))
            put(a, lotA, mfgA, expA, cq)
        if i in OLD_LOT and cons_accs:
            # a slow leftover lot from last year at 1–2 accounts → part of it is returned as Near-expiry during the year
            for a in rng.sample(cons_accs, min(2, len(cons_accs))):
                old_accs.add(a)
                exp0 = START + timedelta(days=rng.randint(150, 330))
                mfg0 = exp0 - timedelta(days=int(sl_days))
                put(a, mk_lot(mfg0), mfg0, exp0, int(d * shares[a] * rng.uniform(18, 30)))
    for loc in ["WH"] + list(shares):
        opening_check[(sku, loc)] = qty(loc)

    open_pos = []  # dicts with received (actual date) — removed once received in the simulation
    so_hist = []   # weekly total sell-out
    stop_w = 43 if i in SURGE else 40 if i in STOP40 else None
    surge_from = 43 if i in SURGE else None

    def place_po(dt, q, promised, actual):
        po_seq[0] += 1
        po = dict(po_no=f"PO{dt:%y%m}-{po_seq[0]:04d}", sku=sku, qty=int(q), order_date=dt, promised=promised, actual=actual)
        open_pos.append(po); rows_po.append(po)
        return po

    # NPD supply
    if i in NPD_LAUNCHED:
        lw = s["launch_w"]; dt = START + timedelta(weeks=lw - 2)
        place_po(dt - timedelta(days=s["lead_time_days"]), s["moq"] * 2, dt, dt)
    if i in NPD_STOCK:
        dt = START + timedelta(weeks=rng.randint(49, 51))
        place_po(dt - timedelta(days=s["lead_time_days"]), s["moq"], dt, dt)
    if i in NPD_PO:
        dt = SNAP + timedelta(days=rng.randint(20, 60))
        place_po(SNAP - timedelta(days=rng.randint(10, 30)), s["moq"], dt, dt)

    for w in range(WEEKS):
        ws = START + timedelta(weeks=w)
        we = ws + timedelta(days=7)
        mult = demand_mult(s, w, ws)
        if surge_from is not None and w >= surge_from:
            mult *= 2.2

        # 1) PO received this week → a new lot in WH
        for po in [p for p in open_pos if ws <= p["actual"] < we]:
            mfg = po["actual"] - timedelta(days=rng.randint(10, 25))
            put("WH", mk_lot(mfg), mfg, mfg + timedelta(days=int(sl_days)), po["qty"])
            open_pos.remove(po)

        # 2) CN (returns) before the sales of the week
        cdt = lambda: ws + timedelta(days=rng.randint(0, 6))
        for a in cons_accs:
            for L in list(lots[a]):
                if (L[2] - ws).days < 75 and L[3] > 0 and not (i == BIGC and a == "A06"):
                    q = L[3]; L[3] = 0
                    new_cn(cdt(), sku, a, q, "Near-expiry", "Bad")
            lots[a] = [L for L in lots[a] if L[3] > 0]
            rem = qty(a)
            if rem > 20 and rng.random() < 0.01:
                q = max(1, int(rem * rng.uniform(0.005, 0.02)))
                got = take(a, q, ws - timedelta(days=9999))
                if got:
                    new_cn(cdt(), sku, a, sum(k for _, k in got), "Damaged", "Bad")
            wk = d * shares[a] * max(mult, 0.2)
            kind = pair_kind.get((i, a), "normal")
            p_slow = 0.0 if kind == "bigc" or a in old_accs else 0.06 if kind == "over" else 0.25
            if rem > wk * 16 and rng.random() < p_slow:
                q = int(rem - wk * 8)
                got = take(a, q, ws, 0.0, newest=True)   # the account sends back its newest stock and keeps selling the old
                if got:
                    for L, k in got:
                        put("WH", L[0], L[1], L[2], k)
                    new_cn(cdt(), sku, a, sum(k for _, k in got), "Slow-moving", "Good")
            if i == RECALL and w == 30:
                q = qty(a)
                if q > 0:
                    lots[a] = []
                    new_cn(cdt(), sku, a, q, "Recall", "Bad")
        for a in out_accs:
            if ACC[a][2] == "TT" and rng.random() < 0.012 and mult > 0:
                q = int(d * shares[a] * rng.uniform(1, 3))
                if q > 0 and lots["WH"]:
                    L = max(lots["WH"], key=lambda L: L[1])
                    put("WH", L[0], L[1], L[2], q)
                    new_cn(cdt(), sku, a, q, "Slow-moving", "Good")
            if ACC[a][2] == "ECOM" and rng.random() < 0.01 and mult > 0:
                new_cn(cdt(), sku, a, rng.randint(1, 6), "Damaged", "Bad")   # customer return, written off on arrival (no stock effect)

        # 3) Sales In to consignment accounts (every 2nd week) — limited by WH lots fresh enough for the account
        if w % 2 == 0:
            for a in cons_accs:
                wk = d * shares[a] * mult
                kind = pair_kind.get((i, a), "normal")
                if kind == "bigc" and w <= 6:
                    want = round_to(d * 1.2, 12)      # … but was pushed 4 big deliveries of the oldest lot
                elif kind in ("over", "capped"):
                    want = round_to(d * shares[a] * demand_mult(s, w, ws) * 2 * fit[(i, a)], 12)
                else:
                    cover = 3 if a == "A01" else 5
                    want = round_to(wk * (2 + cover) - qty(a), 12)
                if want <= 0 or mult == 0:
                    continue
                got = take("WH", want, ws, ACC[a][5])
                q = sum(k for _, k in got)
                for L, k in got:
                    put(a, L[0], L[1], L[2], k)
                if q > 0:
                    rows_sales_in.append(dict(date=ws.isoformat(), sku=sku, account_id=a, qty=q,
                                              value=int(round(q * s["std_price"] * PRICE_FACTOR[ACC[a][2]]))))

        # 4) Sales Out
        tot_out = 0
        for a in shares:
            mean = d * shares[a] * mult
            if ACC[a][2] == "ECOM" and double_day_in_week(ws):
                mean *= 1.5
            dem = 0 if mean <= 0 else max(0, int(round(rng.gauss(mean, math.sqrt(mean) * 1.2 + mean * 0.1))))
            if dem <= 0:
                continue
            if ACC[a][4] == "Y":
                got = take(a, dem, ws)
            else:
                got = take("WH", dem, ws, ACC[a][5])   # outright: ships from WH, Sales In = Sales Out
            q = sum(k for _, k in got)
            if q <= 0:
                continue
            val = int(round(q * s["std_price"] * PRICE_FACTOR[ACC[a][2]]))
            rows_sales_out.append(dict(date=ws.isoformat(), sku=sku, account_id=a, qty=q, value=val))
            if ACC[a][4] == "N":
                rows_sales_in.append(dict(date=ws.isoformat(), sku=sku, account_id=a, qty=q, value=val))
            tot_out += q
        so_hist.append(tot_out)

        # 5) Ordering policy (periodic review): position below (LT + safety + 28 days) of cover → order up to LT + 90 days
        if s["status"] == "Discontinue" or (stop_w is not None and w >= stop_w) or (not launched and w < s.get("launch_w", 0)):
            continue
        recent = [x for x in so_hist[-8:] if x > 0]
        if not recent:
            continue
        rate = sum(recent) / (len(recent) * 7.0)
        position = qty("WH") + sum(qty(a) for a in cons_accs) + sum(p["qty"] for p in open_pos)
        lt, sf = s["lead_time_days"], s["safety_days"]
        if position < rate * (lt + sf + 28):
            need = rate * (lt + 90 + sf) - position
            q = max(s["moq"], int(math.ceil(need / s["moq"])) * s["moq"])
            od = ws + timedelta(days=rng.randint(0, 4))
            promised = od + timedelta(days=lt)
            r = rng.random()
            delay = rng.randint(-4, 3) if r < 0.75 else rng.randint(6, 25)
            place_po(od, q, promised, promised + timedelta(days=delay))

    # ---------- snapshot (start of SNAP)
    for loc, L in lots.items():
        for lot_no, mfg, exp, q in L:
            if q > 0:
                rows_lot.append(dict(snapshot_date=SNAP.isoformat(), sku=sku, lot_no=lot_no, location=loc, qty=int(q),
                                     mfg_date=mfg.isoformat(), exp_date=exp.isoformat()))

    # ---------- planned POs ahead for ~1 in 4 healthy SKUs (plans already in the system)
    if s["status"] == "Active" and i not in SURGE + STOP40 + SLOW_BIG_MOQ and rng.random() < 0.25:
        od = SNAP + timedelta(days=rng.randint(7, 70))
        eta = od + timedelta(days=s["lead_time_days"])
        po_seq[0] += 1
        rows_po.append(dict(po_no=f"PO{od:%y%m}-{po_seq[0]:04d}", sku=sku, qty=s["moq"] * rng.choice([1, 2]), order_date=od,
                            promised=eta, actual=eta, planned=True))

    # ---------- planned / approved CN ahead
    for a in cons_accs:
        for lot_no, mfg, exp, q in lots[a]:
            left = (exp - SNAP).days
            if 75 <= left <= 165 and q > 0:
                dt = exp - timedelta(days=75)
                new_cn(dt, sku, a, max(1, int(q * 0.6)), "Near-expiry", "Bad", "Planned" if (dt - SNAP).days > 30 else "Approved")
        if pair_kind.get((i, a)) == "over" and qty(a) > 0:
            dt = SNAP + timedelta(days=rng.randint(10, 60))
            new_cn(dt, sku, a, int(qty(a) * 0.3), "Slow-moving", "Good", "Approved" if (dt - SNAP).days <= 21 else "Planned")
    if i == BIGC:
        new_cn(SNAP + timedelta(days=21), sku, "A06", int(qty("A06") * 0.4), "Slow-moving", "Good", "Approved")

    # ---------- quota (month × SKU × account): history 12 months + 6 months ahead
    m0 = date(2025, 12, 1)
    for k in range(18):
        mm = month_add(m0, k)
        mid_w = max(0, min(WEEKS, ((mm - START).days + 14) // 7))
        lw = s.get("launch_w")
        if lw == 999:
            lw = 54 + (i % 3) * 4     # NPD not launched: launch 1–3 months after AS OF
            if (mm - START).days // 7 < lw:
                continue
            base_mult = SEAS[mm.month] * 0.6
        else:
            base_mult = demand_mult(s, mid_w, mm) if mid_w < WEEKS else SEAS[mm.month] * (1 + s["slope"] * 0.5)
            if lw is not None and (mm - START).days // 7 < lw - 1:
                continue
            if s["status"] == "Discontinue" and mm > SNAP:
                continue
        if i in SURGE and mm >= date(2026, 10, 1):
            base_mult *= 1.6
        for a in s["share"]:
            q = round_to(s["d"] * s["share"][a] * days_in_month(mm) / 7.0 * base_mult * fit[(i, a)] * rng.gauss(1, 0.05), 12)
            if q > 0:
                rows_quota.append(dict(month=f"{mm:%Y-%m}", sku=sku, account_id=a, quota_qty=q))

# ---------- PO status / dates as the system would show them at SNAP
po_out = []
surge_skus = {skus[i]["sku"] for i in SURGE}
extra_delayed = 0
for po in sorted(rows_po, key=lambda p: (p["order_date"], p["po_no"])):
    od, promised, actual = po["order_date"], po["promised"], po["actual"]
    if po.get("planned"):
        status, eta, rec = "Planned", promised, ""
    elif actual < SNAP:
        status, eta, rec = "Received", promised, actual.isoformat()
    else:
        if po["sku"] in surge_skus:
            status, eta = "Delayed", max(actual, SNAP) + timedelta(days=45)
        elif promised < SNAP:
            status, eta = "Delayed", actual if actual >= SNAP else SNAP + timedelta(days=7)
        elif extra_delayed < 3 and (promised - SNAP).days > 20 and rng.random() < 0.3:
            status, eta = "Delayed", promised + timedelta(days=rng.randint(20, 35)); extra_delayed += 1
        elif (promised - SNAP).days <= 21:
            status, eta = "Shipped", promised
        else:
            status, eta = "Confirmed", promised
        rec = ""
    s = next(x for x in skus if x["sku"] == po["sku"])
    po_out.append(dict(po_no=po["po_no"], sku=po["sku"], qty=po["qty"], order_date=od.isoformat(), eta_date=eta.isoformat(),
                       received_date=rec, status=status, supplier=SUPPLIERS[s["bcode"]]))

# ----------------------------------------------------------------------------------------------- reconciliation check
flows = defaultdict(int)  # (sku, loc) → net in during the 52 weeks
for r in rows_sales_in:
    flows[(r["sku"], "WH")] -= r["qty"]
    if ACC[r["account_id"]][4] == "Y":
        flows[(r["sku"], r["account_id"])] += r["qty"]
for r in rows_sales_out:
    if ACC[r["account_id"]][4] == "Y":
        flows[(r["sku"], r["account_id"])] -= r["qty"]
for r in rows_cn:
    if r["status"] != "Received":
        continue
    if ACC[r["account_id"]][4] == "Y":
        flows[(r["sku"], r["account_id"])] -= r["qty"]
    if r["condition"] == "Good":
        flows[(r["sku"], "WH")] += r["qty"]
for p in po_out:
    if p["status"] == "Received":
        flows[(p["sku"], "WH")] += p["qty"]
closing = defaultdict(int)
for r in rows_lot:
    closing[(r["sku"], r["location"])] += r["qty"]
bad = 0
for key in set(list(closing) + list(flows) + list(opening_check)):
    sku, loc = key
    if loc != "WH" and ACC[loc][4] == "N":
        continue
    if opening_check.get(key, 0) + flows.get(key, 0) != closing.get(key, 0):
        bad += 1
        if bad < 5:
            print("MISMATCH", key, opening_check.get(key, 0), flows.get(key, 0), closing.get(key, 0))
print("reconciliation:", "OK" if bad == 0 else f"{bad} mismatches")

# CR-01 (6.4): Ops has 6 online stores; the SCM mock had 3. LINE Commerce, LINE OA and Web join account_master as
# outright ECOM accounts whose history starts AFTER the AS OF date (option A) — no sales/quota/CN rows here, and they are
# added only at write time so the random draws (and so every anchor number) stay exactly the same.
NEW_ECOM = [
    ("A13", "LINE Commerce", "ECOM", "Social Commerce", "N", 0.30, 2),
    ("A14", "LINE OA", "ECOM", "Social Commerce", "N", 0.30, 2),
    ("A15", "Web", "ECOM", "Brand.com", "N", 0.30, 2),
]

# ----------------------------------------------------------------------------------------------- write
os.makedirs(OUT, exist_ok=True)
TABLES = {
    "sku_master": (["sku", "name", "brand", "category", "uom", "unit_cost", "std_price", "shelf_life_months", "moq",
                    "lead_time_days", "safety_days", "status"], skus),
    "account_master": (["account_id", "name", "channel", "sub_channel", "is_consignment", "min_shelf_life_pct", "delivery_lead_days"],
                       [dict(account_id=a[0], name=a[1], channel=a[2], sub_channel=a[3], is_consignment=a[4],
                             min_shelf_life_pct=a[5], delivery_lead_days=a[6]) for a in ACCOUNTS + NEW_ECOM]),
    "stock_lot": (["snapshot_date", "sku", "lot_no", "location", "qty", "mfg_date", "exp_date"],
                  sorted(rows_lot, key=lambda r: (r["sku"], r["location"], r["exp_date"]))),
    "sales_in": (["date", "sku", "account_id", "qty", "value"], sorted(rows_sales_in, key=lambda r: (r["date"], r["sku"], r["account_id"]))),
    "sales_out": (["date", "sku", "account_id", "qty", "value"], sorted(rows_sales_out, key=lambda r: (r["date"], r["sku"], r["account_id"]))),
    "cn": (["cn_no", "date", "sku", "account_id", "qty", "reason", "condition", "status"], sorted(rows_cn, key=lambda r: (r["date"], r["cn_no"]))),
    "po_inbound": (["po_no", "sku", "qty", "order_date", "eta_date", "received_date", "status", "supplier"], po_out),
    "quota": (["month", "sku", "account_id", "quota_qty"], sorted(rows_quota, key=lambda r: (r["month"], r["sku"], r["account_id"]))),
}
bundle = {}
for name, (cols, rows) in TABLES.items():
    path = os.path.join(OUT, name + ".csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        wr = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore", lineterminator="\n")
        wr.writeheader()
        for r in rows:
            wr.writerow(r)
    with open(path, encoding="utf-8") as f:
        bundle[name] = f.read()
    print(f"{name:15s} {len(rows):7d} rows  {os.path.getsize(path) / 1024:8.1f} KB")
with open(os.path.join(OUT, "mock-bundle.js"), "w", encoding="utf-8") as f:
    f.write("/* Generated by tools/generate_mock.py — the same CSV text as data/*.csv, for opening index.html straight from disk (file://). */\n")
    f.write("window.SCM_BUNDLE = " + json.dumps(bundle, ensure_ascii=False) + ";\n")
print("scenarios:", {"surge": [skus[i]["sku"] for i in SURGE], "stop40": [skus[i]["sku"] for i in STOP40],
                     "slow_big_moq": [skus[i]["sku"] for i in SLOW_BIG_MOQ], "bigc": skus[BIGC]["sku"], "recall": skus[RECALL]["sku"],
                     "npd_launched": [skus[i]["sku"] for i in NPD_LAUNCHED], "npd_stock": [skus[i]["sku"] for i in NPD_STOCK],
                     "npd_po": [skus[i]["sku"] for i in NPD_PO], "discontinue": [skus[i]["sku"] for i in DISCONTINUE]})
