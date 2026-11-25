/* data.js — the 8 tables: schema, CSV validation (column + row errors), CSV templates, and the store for imported tables.
   Imported CSV text is kept in IndexedDB (sales tables are too big for localStorage); the mock CSVs stay untouched,
   so "Reset to Mock" only has to forget the imports. Nothing leaves the browser. */
(function (global) {
  'use strict';
  const TABLES = ['sku_master', 'account_master', 'stock_lot', 'sales_in', 'sales_out', 'cn', 'po_inbound', 'quota'];
  const SCHEMA = {
    sku_master: { cols: ['sku', 'name', 'brand', 'category', 'uom', 'unit_cost', 'std_price', 'shelf_life_months', 'moq', 'lead_time_days', 'safety_days', 'status'],
      required: ['sku', 'name', 'unit_cost', 'shelf_life_months', 'moq', 'lead_time_days'], num: ['unit_cost', 'std_price', 'shelf_life_months', 'moq', 'lead_time_days', 'safety_days'],
      enums: { status: ['Active', 'NPD', 'Discontinue'] }, unique: 'sku' },
    account_master: { cols: ['account_id', 'name', 'channel', 'sub_channel', 'is_consignment', 'min_shelf_life_pct', 'delivery_lead_days'],
      required: ['account_id', 'name', 'channel', 'is_consignment'], num: ['min_shelf_life_pct', 'delivery_lead_days'],
      enums: { channel: ['MT', 'TT', 'ECOM'], is_consignment: ['Y', 'N'] }, unique: 'account_id' },
    stock_lot: { cols: ['snapshot_date', 'sku', 'lot_no', 'location', 'qty', 'mfg_date', 'exp_date'], required: ['sku', 'location', 'qty', 'mfg_date', 'exp_date'],
      num: ['qty'], dates: ['snapshot_date', 'mfg_date', 'exp_date'], refs: { sku: 'sku', location: 'location' } },
    sales_in: { cols: ['date', 'sku', 'account_id', 'qty', 'value'], required: ['date', 'sku', 'account_id', 'qty'], num: ['qty', 'value'], dates: ['date'], refs: { sku: 'sku', account_id: 'account' } },
    sales_out: { cols: ['date', 'sku', 'account_id', 'qty', 'value'], required: ['date', 'sku', 'account_id', 'qty'], num: ['qty', 'value'], dates: ['date'], refs: { sku: 'sku', account_id: 'account' } },
    cn: { cols: ['cn_no', 'date', 'sku', 'account_id', 'qty', 'reason', 'condition', 'status'], required: ['cn_no', 'date', 'sku', 'account_id', 'qty', 'condition', 'status'],
      num: ['qty'], dates: ['date'], enums: { condition: ['Good', 'Bad'], status: ['Planned', 'Approved', 'Received', 'Cancelled'], reason: ['Slow-moving', 'Damaged', 'Near-expiry', 'Recall'] },
      refs: { sku: 'sku', account_id: 'account' } },
    po_inbound: { cols: ['po_no', 'sku', 'qty', 'order_date', 'eta_date', 'received_date', 'status', 'supplier'], required: ['po_no', 'sku', 'qty', 'eta_date', 'status'],
      num: ['qty'], dates: ['order_date', 'eta_date', 'received_date'], enums: { status: ['Planned', 'Confirmed', 'Shipped', 'Received', 'Delayed', 'Cancelled'] }, refs: { sku: 'sku' } },
    quota: { cols: ['month', 'sku', 'account_id', 'quota_qty'], required: ['month', 'sku', 'account_id', 'quota_qty'], num: ['quota_qty'], months: ['month'], refs: { sku: 'sku', account_id: 'account' } }
  };
  const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + 'T00:00:00Z'));
  const isNum = v => v !== '' && !isNaN(+String(v).replace(/,/g, ''));

  /** Validate one CSV for `table`. masters = { sku:Set, account:Set } of the current data (for warnings only).
      Returns { ok, rows, headers, missing, extra, errors:[{row, col, msg}], warnings:[…], errorCount }.
      Row numbers are the line numbers in the file (header = line 1). Any missing column or row error blocks the import. */
  function validate(table, text, masters) {
    const sc = SCHEMA[table];
    const res = Papa.parse(text.replace(/^﻿/, ''), { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.trim().replace(/^﻿/, '') });
    const headers = res.meta.fields || [];
    const missing = sc.required.filter(c => !headers.includes(c));
    const extra = headers.filter(h => !sc.cols.includes(h));
    const errors = [], warnings = [];
    let errorCount = 0;
    const push = (row, col, msg) => { errorCount++; if (errors.length < 200) errors.push({ row, col, msg }); };
    if (!missing.length) {
      const seen = new Set();
      res.data.forEach((r, k) => {
        const line = k + 2;
        for (const c of sc.required) if (String(r[c] ?? '').trim() === '') push(line, c, 'empty');
        for (const c of sc.num || []) { const v = String(r[c] ?? '').trim(); if (v !== '' && !isNum(v)) push(line, c, 'not_number:' + v); else if (v !== '' && +v.replace(/,/g, '') < 0) push(line, c, 'negative:' + v); }
        for (const c of sc.dates || []) { const v = String(r[c] ?? '').trim(); if (v !== '' && !isDate(v)) push(line, c, 'not_date:' + v); }
        for (const c of sc.months || []) { const v = String(r[c] ?? '').trim(); if (v !== '' && !/^\d{4}-\d{2}$/.test(v.slice(0, 7))) push(line, c, 'not_month:' + v); }
        for (const [c, list] of Object.entries(sc.enums || {})) { const v = String(r[c] ?? '').trim(); if (v !== '' && !list.includes(v)) push(line, c, 'not_in:' + v + '|' + list.join(' / ')); }
        if (sc.unique) { const v = String(r[sc.unique] ?? '').trim(); if (seen.has(v)) push(line, sc.unique, 'duplicate:' + v); seen.add(v); }
        // numbers written "1,234" → 1234 so calc.js reads them
        for (const c of sc.num || []) if (r[c] != null) r[c] = String(r[c]).replace(/,/g, '').trim();
      });
      if (masters) {
        let unknown = 0; const ex = new Set();
        res.data.forEach(r => {
          for (const [c, kind] of Object.entries(sc.refs || {})) {
            const v = String(r[c] ?? '').trim();
            if (kind === 'location' ? (v !== 'WH' && !masters.account.has(v)) : !masters[kind].has(v)) { unknown++; if (ex.size < 5) ex.add(v); }
          }
        });
        if (unknown) warnings.push({ msg: 'unknown_ref', n: unknown, ex: [...ex] });
      }
      if (!res.data.length) push(1, '', 'no_rows');
    }
    (res.errors || []).slice(0, 20).forEach(e => push((e.row ?? 0) + 2, '', 'parse:' + e.message));
    return { ok: !missing.length && errorCount === 0, rows: res.data, headers, missing, extra, errors, warnings, errorCount };
  }

  /** CSV template: the columns + 2 example rows from the data in use. */
  function template(table, rows) {
    const cols = SCHEMA[table].cols;
    return Papa.unparse({ fields: cols, data: (rows || []).slice(0, 2).map(r => cols.map(c => r[c] ?? '')) });
  }

  // ------------------------------------------------------------------ IndexedDB store { table → { text, file, at, rows } }
  let dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      try {
        const rq = indexedDB.open('charmiss-scm', 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore('tables');
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error);
      } catch (e) { rej(e); }
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const db = await idb();
    return new Promise((res, rej) => { const t = db.transaction('tables', mode), st = t.objectStore('tables'); const out = fn(st); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); });
  }
  // an import is also kept in memory, so it works for this visit even where IndexedDB is blocked (private window, some file:// setups)
  const mem = {};
  const Store = {
    async all() {
      let out = {};
      try {
        const db = await idb();
        out = await new Promise((res, rej) => {
          const o = {}, rq = db.transaction('tables').objectStore('tables').openCursor();
          rq.onsuccess = () => { const c = rq.result; if (c) { o[c.key] = c.value; c.continue(); } else res(o); };
          rq.onerror = () => rej(rq.error);
        });
      } catch (e) { out = {}; }
      return Object.assign(out, mem);
    },
    async put(table, value) { mem[table] = value; await tx('readwrite', st => st.put(value, table)); },     // throws when not saved for good
    async del(table) { delete mem[table]; try { await tx('readwrite', st => st.delete(table)); } catch (e) { /* nothing stored */ } },
    async clear() { Object.keys(mem).forEach(k => delete mem[k]); try { await tx('readwrite', st => st.clear()); } catch (e) { /* nothing stored */ } }
  };

  global.Data = { TABLES, SCHEMA, validate, template, Store };
})(window);
