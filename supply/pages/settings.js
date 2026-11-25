/* pages/settings.js — ข้อมูล & ตั้งค่า
   Data: one row per table — rows, source (Mock / imported file), CSV template, Import CSV (column + row checks before anything changes), Reset to Mock.
   Self-check: the reconciliation checks. Settings: every threshold the calculations use + the default Run Rate basis. */
(function (global) {
  'use strict';
  const t = global.St;   // CR-01: Supply translator (the global `t` belongs to the Ops shell)
  const Pages = global.Pages = global.Pages || {};
  const GROUPS = [
    ['set_g_stock', [['overstockDoc', 'days'], ['reorderWindow', 'days'], ['coverDays', 'days'], ['projectionDays', 'days']]],
    ['set_g_expiry', [['expiryWindow', 'days']]],
    ['set_g_quota', [['fitHigh', '%'], ['fitLow', '%']]],
    ['set_g_consign', [['consignDocHigh', 'days'], ['consignDocLow', 'days'], ['stLowW', '%'], ['stLowM', '%'], ['cnKeepDays', 'days']]],
    ['set_g_inbound', [['onTimeDays', 'days']]],
    ['set_g_cr03', [['staleW', 'w'], ['soCompleteW', 'w'], ['soLateDay', 'd']]]   // CR-03 R1 thresholds
  ];
  const OO_TYPES = ['pr', 'sample', 'internal', 'writeoff', 'other'];   // CR-03 R2
  const errText = e => {
    const [code, rest] = String(e.msg).split(/:(.*)/s);
    if (code === 'not_in') { const [v, l] = rest.split('|'); return t('ve_not_in', { v, l }); }
    return t('ve_' + code, { v: rest || '' });
  };

  Pages.data = {
    render(main, App) {
      const sc = App.sc, M = App.model(), mc = Calc.modelCheck(M), S = App.S, D = Calc.DEFAULT_SETTINGS;
      const checks = sc.checks.concat(mc.map(c => Object.assign({ n: c.ok ? 0 : 1 }, c)));
      const allOk = sc.ok && mc.every(c => c.ok);
      const anyImport = Data.TABLES.some(n => App.sources[n] && App.sources[n].type === 'import');
      main.innerHTML = `<div class="pagehead"><div><h1 class="page">${U.esc(t('nav_data'))}</h1><div class="q">${U.esc(t('q_data'))}</div></div>
          <div class="perchip">${t('sc_snapshot', { d: U.date(App.DB.snapDn), w: App.DB.nWeeks })}</div></div>
        <section class="card"><div class="card-head"><h3>${t('set_data')} ${U.info(t('set_data_tip'))}</h3>
          <div class="card-tools"><button type="button" class="btn small" id="resetAll" ${anyImport ? '' : 'disabled'}>${t('set_reset_all')}</button></div></div>
          <div class="tablewrap free"><table class="tbl compact"><thead><tr><th>Table</th><th class="num">Rows</th><th>${t('set_source')}</th><th></th></tr></thead><tbody>
          ${Data.TABLES.map(n => { const s = App.sources[n] || { type: 'mock' };
            return `<tr><td><b>${n}</b><div class="small muted">${Data.SCHEMA[n].cols.join(', ')}</div></td><td class="num">${U.n((App.raw[n] || []).length)}</td>
              <td>${s.type === 'import' ? `<span class="st s-info">Import</span> <span class="small">${U.esc(s.file || '')} · ${U.esc((s.at || '').slice(0, 16).replace('T', ' '))}</span>` : '<span class="st s-gray">Mock</span>'}</td>
              <td class="num"><span class="set-actions"><button type="button" class="btn small ghost" data-tpl="${n}">${U.icon('download')}${t('set_template')}</button>
                <label class="btn small">${U.icon('table')}${t('set_import')}<input type="file" accept=".csv,text/csv" data-imp="${n}" hidden></label>
                ${s.type === 'import' ? `<button type="button" class="btn small ghost" data-reset="${n}">${t('set_reset')}</button>` : ''}</span></td></tr>`; }).join('')}
          </tbody></table></div>
          <div class="foot-note">${t('set_data_note')}</div></section>

        <div class="grid2" style="margin-top:16px">
          <section class="card"><div class="card-head"><h3>${t('sc_title')}</h3><span class="st ${allOk ? 'healthy' : 'stockout'}">${t(allOk ? 'sc_ok' : 'sc_fail')}</span></div>
            <div class="tablewrap free"><table class="tbl compact sc-table"><thead><tr><th>${t('sc_col_check')}</th><th>${t('sc_col_result')}</th><th>${t('sc_col_detail')}</th></tr></thead>
            <tbody>${checks.map(c => `<tr><td style="white-space:normal">${U.esc(t('sc_' + c.id))}</td><td class="${c.ok ? 'ok' : 'bad'}">${c.ok ? '✓ PASS' : '✗ ' + U.n(c.n)}</td>
              <td class="muted" style="white-space:normal">${c.total != null ? U.n(c.total) + ' checked' : ''}${c.detail ? ' · ' + U.esc(c.detail) : ''}</td></tr>`).join('')}</tbody></table></div>
            <div class="foot-note">Console: <code>Calc.selfCheck(App.DB)</code></div></section>
          <section class="card"><div class="card-head"><h3>${t('set_title')}</h3><div class="card-tools"><button type="button" class="btn small ghost" id="setDefault">${t('set_defaults')}</button><button type="button" class="btn small primary" id="setSave">${t('set_save')}</button></div></div>
            <form id="setForm" class="set-form" onsubmit="return false">
              <div class="set-g"><h4>${t('set_g_rr')}</h4>
                <label class="set-row"><span>${t('set_rrBasis')}</span><select class="ctl" name="rrBasis">${['L4W', 'L3M', 'L6M', 'W'].map(k => `<option value="${k}" ${S.rrBasis === k ? 'selected' : ''}>${t('rr_' + k)}</option>`).join('')}</select></label>
                <label class="set-row"><span>${t('set_useQuota')}</span><input type="checkbox" name="useQuotaForSalesIn" ${S.useQuotaForSalesIn ? 'checked' : ''}></label></div>
              <div class="set-g"><h4>${t('set_g_method')}</h4>
                <label class="set-row"><span>${t('set_rrEndMode')}<small class="muted"> · ${t('set_default')} ${t('rr_end_' + D.rrEndMode)}</small></span><select class="ctl" name="rrEndMode">${['account', 'history'].map(k => `<option value="${k}" ${S.rrEndMode === k ? 'selected' : ''}>${t('rr_end_' + k)}</option>`).join('')}</select></label>
                <label class="set-row"><span>${t('set_prPlanOn')}</span><input type="checkbox" name="prPlanOn" ${S.prPlanOn ? 'checked' : ''}></label>
                <div class="set-row set-pr"><span>${t('set_prPlan')}</span><span class="set-pr-list">${Object.entries(S.prPlan || {}).map(([k, q]) => `<span class="chip">${U.esc(k)} · ${U.n(q)} <button type="button" class="icon-btn" data-pr-del="${U.esc(k)}" aria-label="×">×</button></span>`).join('')}
                  <span class="set-pr-add"><select class="ctl" id="prSku">${App.DB.skus.map(s => `<option value="${s.sku}">${s.sku}</option>`).join('')}</select><input class="ctl" type="number" id="prQty" min="0" step="1" placeholder="0"><button type="button" class="btn small" id="prAdd">${t('set_add')}</button></span></span></div>
                <div class="set-row"><span></span><button type="button" class="btn small ghost" id="setLegacy">${t('set_legacy')}</button></div></div>
              ${GROUPS.map(([g, list]) => `<div class="set-g"><h4>${t(g)}</h4>${list.map(([k, u]) => `<label class="set-row"><span>${t('set_' + k)}<small class="muted"> · ${t('set_default')} ${D[k]}</small></span>
                <span class="set-in"><input class="ctl" type="number" name="${k}" value="${S[k]}" min="0" step="1"><em>${u === '%' ? '%' : u === 'w' ? t('weeks_u') : u === 'd' ? t('day_u') : t('days')}</em></span></label>`).join('')}</div>`).join('')}
            </form><div class="foot-note">${t('set_note')}</div></section>
        </div>
        <section class="card" id="card-storage" style="margin-top:16px"><div class="card-head"><h3>${t('set_storage')}</h3></div><div class="tablewrap free"><table class="tbl compact"><tbody id="storageRows"><tr><td>…</td></tr></tbody></table></div></section>`;   // CR-03 (2.5)

      // templates / imports / resets
      main.querySelectorAll('[data-tpl]').forEach(b => b.addEventListener('click', () => {
        const n = b.dataset.tpl, csv = Data.template(n, App.raw[n]);
        U.downloadURL(URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })), n + '_template.csv');
      }));
      main.querySelectorAll('[data-imp]').forEach(inp => inp.addEventListener('change', () => { const f = inp.files[0]; inp.value = ''; if (f) importFile(App, inp.dataset.imp, f); }));
      main.querySelectorAll('[data-reset]').forEach(b => b.addEventListener('click', async () => { await Data.Store.del(b.dataset.reset); await App.reloadData(); U.toast(t('set_reset_done', { n: b.dataset.reset })); }));
      main.querySelector('#resetAll').addEventListener('click', async () => { await Data.Store.clear(); await App.reloadData(); U.toast(t('set_reset_all_done')); });

      // settings
      const form = main.querySelector('#setForm');
      main.querySelector('#setSave').addEventListener('click', () => {
        const next = Object.assign({}, App.S);
        let bad = '';
        form.querySelectorAll('input[type=number][name]').forEach(inp => { const v = +inp.value; if (inp.value === '' || !isFinite(v) || v < 0) bad = inp.name; else next[inp.name] = v; });   // CR-03: [name] (the PR-plan qty box is not a setting)
        if (bad) { U.toast(t('set_bad', { k: t('set_' + bad) })); return; }
        if (next.fitLow >= next.fitHigh) { U.toast(t('set_bad_fit')); return; }
        next.rrBasis = form.rrBasis.value; next.useQuotaForSalesIn = form.useQuotaForSalesIn.checked;
        next.rrEndMode = form.rrEndMode.value; next.prPlanOn = form.prPlanOn.checked;   // CR-03
        if (!(next.soLateDay >= 1 && next.soLateDay <= 7)) { U.toast(t('set_bad_day')); return; }   // CR-03
        const rrChanged = next.rrBasis !== App.S.rrBasis;
        App.saveSettings(next);
        if (rrChanged) App.setF({ rr: next.rrBasis });
        U.toast(t('set_saved'));
      });
      // CR-03: old methods in one click (anchors of CR-01) · the PR plan edits save at once (audited by supply-intake.js)
      main.querySelector('#setLegacy').addEventListener('click', () => { App.saveSettings(Object.assign({}, App.S, { rrEndMode: 'history', prPlanOn: false })); U.toast(t('set_saved')); });
      main.querySelector('#prAdd').addEventListener('click', () => { const k = main.querySelector('#prSku').value, q = +main.querySelector('#prQty').value; if (!k || !(q >= 0)) return; const m = Object.assign({}, App.S.prPlan || {}); if (q > 0) m[k] = q; else delete m[k]; App.saveSettings(Object.assign({}, App.S, { prPlan: m })); U.toast(t('set_saved')); });
      main.querySelectorAll('[data-pr-del]').forEach(b => b.addEventListener('click', () => { const m = Object.assign({}, App.S.prPlan || {}); delete m[b.dataset.prDel]; App.saveSettings(Object.assign({}, App.S, { prPlan: m })); }));
      storageInfo(main);
      main.querySelector('#setDefault').addEventListener('click', () => { App.saveSettings(Object.assign({}, Calc.DEFAULT_SETTINGS)); App.setF({ rr: Calc.DEFAULT_SETTINGS.rrBasis }); U.toast(t('set_saved')); });
    }
  };

  /** CR-03 (2.5): how much browser storage the app uses (localStorage is about 5 MB per site; IndexedDB is far larger). */
  function storageInfo(main) {
    let ls = 0; try { for (let k = 0; k < localStorage.length; k++) { const key = localStorage.key(k); ls += (key.length + (localStorage.getItem(key) || '').length) * 2; } } catch (e) { /* blocked */ }
    const kb = b => b >= 1073741824 ? U.n(b / 1073741824, 1) + ' GB' : b >= 1048576 ? U.n(b / 1048576, 1) + ' MB' : U.n(b / 1024, 0) + ' KB', st = typeof Supply.intakeStats === 'function' ? Supply.intakeStats() : { batches: 0, rows: 0 };
    const draw = est => { const el = main.querySelector('#storageRows'); if (!el) return;
      el.innerHTML = `<tr><td>${t('st_ls')}</td><td class="num">${t('st_used', { u: kb(ls) })}</td></tr>
        <tr><td>${t('st_idb')}<div class="small muted">${t('st_intake', { b: U.n(st.batches), r: U.n(st.rows) })}</div></td><td class="num">${est && est.usage != null ? t('st_used', { u: kb(est.usage) }) + (est.quota ? ' · ' + t('st_of', { q: kb(est.quota) }) : '') : '—'}</td></tr>`; };
    draw(null);
    try { navigator.storage.estimate().then(draw).catch(() => {}); } catch (e) { /* not supported */ }
  }

  /** Read → validate → show the result. Nothing changes until "Import" is pressed on a file without errors. */
  function importFile(App, table, file) {
    const rd = new FileReader();
    rd.onload = () => {
      const text = String(rd.result);
      const masters = { sku: new Set(App.DB.skus.map(s => s.sku)), account: new Set(App.DB.accounts.map(a => a.account_id)) };
      const v = Data.validate(table, text, table === 'sku_master' || table === 'account_master' ? null : masters);
      const errs = v.errors.slice(0, 50).map(e => `<tr><td class="num">${e.row}</td><td>${U.esc(e.col)}</td><td style="white-space:normal">${U.esc(errText(e))}</td></tr>`).join('');
      U.modal.open(`<div class="card-head"><h3>${t('set_imp_title', { n: table })}</h3><div class="card-tools"><button type="button" class="icon-btn lg" data-close aria-label="${t('b_close')}">${U.icon('close')}</button></div></div>
        <div class="imp-body">
          <p><b>${U.esc(file.name)}</b> · ${U.n(v.rows.length)} ${t('set_rows')} · ${U.n(file.size / 1024, 0)} KB</p>
          ${v.missing.length ? `<div class="note bad">${U.icon('alert')}<span>${t('set_missing', { c: v.missing.join(', ') })}</span></div>` : ''}
          ${v.extra.length ? `<div class="note">${U.icon('info')}<span>${t('set_extra', { c: v.extra.join(', ') })}</span></div>` : ''}
          ${v.warnings.map(w => `<div class="note">${U.icon('info')}<span>${t('set_warn_ref', { n: U.n(w.n), ex: w.ex.join(', ') })}</span></div>`).join('')}
          ${v.errorCount ? `<div class="note bad">${U.icon('alert')}<span>${t('set_errors', { n: U.n(v.errorCount) })}</span></div>
            <div class="tablewrap free" style="max-height:360px"><table class="tbl compact"><thead><tr><th class="num">${t('set_line')}</th><th>${t('set_col')}</th><th>${t('set_problem')}</th></tr></thead><tbody>${errs}</tbody></table></div>
            ${v.errorCount > 50 ? `<div class="foot-note">${t('set_more_err', { n: U.n(v.errorCount - 50) })}</div>` : ''}`
            : v.ok ? `<div class="note good">${U.icon('check')}<span>${t('set_ok')}</span></div>` : ''}
        </div>
        <div class="imp-foot"><button type="button" class="btn" data-close>${t('set_cancel')}</button><button type="button" class="btn primary" id="impGo" ${v.ok ? '' : 'disabled'}>${t('set_import_go', { n: U.n(v.rows.length) })}</button></div>`);
      const go = document.getElementById('impGo');
      if (go) go.addEventListener('click', async () => {
        go.disabled = true;
        try {
          await Data.Store.put(table, { text, file: file.name, at: new Date().toISOString(), rows: v.rows.length });
        } catch (e) { U.toast(t('set_no_store')); }
        U.modal.close();
        await App.reloadData();
        U.toast(t('set_imported', { n: table, r: U.n(v.rows.length) }) + (App.sc.ok ? '' : ' · ' + t('sc_badge_fail')));
      });
    };
    rd.readAsText(file, 'utf-8');
  }
})(window);
