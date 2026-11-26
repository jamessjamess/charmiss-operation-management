/* tools/uat-run.js — CR-04 test runner for the browser console (not loaded by index.html).
   Loads tools/uat-supply.js, then UatRun.run(name, () => SupUAT.<suite>()) keeps the result in localStorage['uat.cr04.<name>']
   as compact text (#suite|width|at|build · id|P/F|detail) that tools/make_uat_report_cr04.py reads. UatRun.dump() = every suite kept. */
(function (global) {
  'use strict';
  const BUILD = (document.querySelector('script[src^="cr04-core.js"]') || {}).src?.split('v=')[1] || '';
  const compact = (name, r) => '#' + name + '|' + innerWidth + '|' + new Date().toISOString() + '|' + BUILD + '\n' +
    r.map(x => { const { id, pass, ...rest } = x; return String(id).replace(/\|/g, '/') + '|' + (pass ? 'P' : 'F') + '|' + JSON.stringify(rest).replace(/[\r\n|]/g, ' ').slice(0, 600); }).join('\n');
  const U = global.UatRun = {
    res: null, txt: '', t0: 0,
    async ready() { for (let k = 0; k < 80 && !(global.db && global.db.feedBase); k++) await new Promise(r => setTimeout(r, 250)); await new Promise(r => setTimeout(r, 800)); },
    async run(name, fn) {
      U.res = null; U.txt = ''; U.t0 = Date.now(); let r;
      try { r = await fn(); } catch (e) { r = [{ id: 'CRASH', pass: false, info: String(e && e.stack || e) }]; }
      U.res = r; U.txt = compact(name, r);
      try { global.SupUAT.keep(name, r); localStorage.setItem('uat.cr04.' + name, U.txt); } catch (e) { /* storage blocked */ }
      try { await fetch('http://127.0.0.1:8799/save?name=' + encodeURIComponent(name), { method: 'POST', body: U.txt }); } catch (e) { /* no local receiver: the text stays in localStorage */ }
      return r;
    },
    show() { return U.res ? ((Date.now() - U.t0) / 1000 | 0) + 's ' + U.res.filter(r => r.pass).length + '/' + U.res.length + '\n' + U.res.filter(r => !r.pass).map(r => '✗ ' + r.id + ' ' + JSON.stringify(r).slice(0, 600)).join('\n') : 'running… ' + ((Date.now() - U.t0) / 1000 | 0) + 's'; },
    dump() { const out = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('uat.cr04.')) out.push(localStorage.getItem(k)); } return out.join('\n'); }
  };
  const s = document.createElement('script'); s.src = 'tools/uat-supply.js?v=' + Date.now(); document.head.appendChild(s);
})(window);
