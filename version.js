/* version.js — the one place for the app version (CR-03). Shown in the sidebar, the page footer and the login screen;
   clicking it opens the version history. Release checklist: bump APP_VERSION.number + add a history line, and set every
   ?v= in index.html to the same number so browsers load the new files. */
const APP_VERSION={
 number:'8.1.0',
 label:{th:'CR-03 · Phase 3A',en:'CR-03 · Phase 3A'},
 date:'2026-11-25',
 history:[
  ['8.1.0','2026-11-25',{th:'CR-03 Phase 3A — รับรายงาน Sales Out รายสัปดาห์ · Run Rate หยุดตามข้อมูลล่าสุดของแต่ละคู่ค้า · เบิกออกที่ไม่ใช่การขาย · selfCheck 10–11 · เลขเวอร์ชันในแอป',en:'CR-03 Phase 3A — weekly Sales Out intake · run rate ends at each account\'s latest data · non-sales stock issues · selfCheck 10–11 · app version shown in the app'}],
  ['8.0.0','2026-11-25',{th:'CR-01 Phase A–D — รวม Commerce Operations + Supply Planning เป็น Charmiss Operations Management',en:'CR-01 Phase A–D — Commerce Operations + Supply Planning merged into Charmiss Operations Management'}],
  ['7.0','2026-11-24',{th:'Charmiss Operations Prototype 7.0 · Public version 13 (ฐานเดิม)',en:'Charmiss Operations Prototype 7.0 · Public version 13 (the base)'}]
 ]
};
/* called after every Ops render (supply-planning.js) and on the login screen */
function appVersionUI(){
 const v=APP_VERSION,en=typeof lang!=='undefined'&&lang==='en',lab=v.label[en?'en':'th'];
 const foot=document.getElementById('footBuild');if(foot&&!foot.querySelector('[data-appver]'))foot.innerHTML=`Charmiss Operations Management · <button type="button" class="linkish" data-appver title="${lab}">v${v.number}</button>`;
 const sf=document.querySelector('.sidebarfoot');if(sf&&!sf.querySelector('.appver-side'))sf.insertAdjacentHTML('beforeend',`<button type="button" class="appver-side" data-appver title="${lab}">Charmiss Ops v${v.number} · ${v.date}</button>`);
 const lb=document.querySelector('.loginbox');if(lb&&!lb.querySelector('.appver-login'))lb.insertAdjacentHTML('beforeend',`<p class="appver-login"><button type="button" class="linkish" data-appver>Charmiss Ops v${v.number}</button> · ${v.date}</p>`);
 document.querySelectorAll('[data-appver]').forEach(b=>b.onclick=appVersionDialog);
}
function appVersionDialog(){const en=typeof lang!=='undefined'&&lang==='en',k=en?'en':'th';
 showModal(`<div class="dialogbody"><div class="between"><h2>Charmiss Operations Management</h2><button type="button" data-close aria-label="close">×</button></div><p><b>v${APP_VERSION.number}</b> · ${APP_VERSION.date} · ${APP_VERSION.label[k]}</p><div class="tablewrap"><table><thead><tr><th>${en?'Version':'เวอร์ชัน'}</th><th>${en?'Date':'วันที่'}</th><th>${en?'What changed':'สิ่งที่เปลี่ยน'}</th></tr></thead><tbody>${APP_VERSION.history.map(h=>`<tr><td><b>${h[0]}</b></td><td>${h[1]}</td><td>${h[2][k]}</td></tr>`).join('')}</tbody></table></div></div>`,'appver');
 if(typeof bindClose==='function')bindClose()}
