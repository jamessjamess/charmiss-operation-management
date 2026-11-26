/* cr04-period.js — CR-04 R6 · the plan period is one value (db.planPeriod) shared by FEED_MONTH, the Ops quota month, the SO quota check
   and the "This plan period" date preset · a chip on the pages that use it · another period opens read-only · I8-b roll to the next month */
Object.assign(dict.th,{ppChip:'รอบแผน: {m}',ppCurrent:'รอบปัจจุบัน',ppViewOther:'ดูรอบอื่น (อ่านอย่างเดียว)',ppViewing:'กำลังดูรอบ {m} — แก้ไขไม่ได้',ppBack:'กลับรอบปัจจุบัน',ppReadOnly:'กำลังดูรอบแผนอื่น — แก้ไขไม่ได้ (กลับรอบปัจจุบันก่อน)',
 ppRoll:'เลื่อนรอบแผนเป็นเดือนถัดไป',ppRollTitle:'เลื่อนรอบแผน {a} → {b}',ppRollNote:'จำลองการเปลี่ยนเดือน (ชุด Integrated demo) — มีผลทุกหน้าพร้อมกันและบันทึกประวัติการทำงาน',ppRollQuota:'Quota ที่จะเป็นรอบใหม่',ppRollQuotaV:'{n} รายการ ({a} ที่อนุมัติแล้วใน Ops + {b} จากแผน Supply) · {q} ชิ้น',
 ppRollUsed:'“ใช้ไป” ของรอบใหม่',ppRollUsedV:'เริ่มที่ 0 (ยอดใช้ไปของ {m} ปิดรอบ)',ppRollOpen:'รายการที่ค้าง',ppRollOpenV:'Quota Draft / รออนุมัติของ {m}: {d} · ข้อเสนอ Supply รออนุมัติ: {p}',ppRollAsOf:'AS OF ของ Supply ไม่เปลี่ยน (ยังเป็น {d})',ppRollBtn:'ยืนยันเลื่อนรอบ',ppRolled:'เลื่อนรอบแผนเป็น {m} แล้ว',ppRollEvent:'เลื่อนรอบแผน',ppRollDenied:'เลื่อนรอบแผนได้เฉพาะ Director / Admin บนชุด Integrated demo',
 ppMonthPanel:'Quota vs Actual · รอบ {m}',ppMonthNote:'รอบแผน (เดือนของ Quota) แยกจาก AS OF (วันตัดข้อมูลรายสัปดาห์) — AS OF ยังเป็น {d}',ppQuota:'Quota',ppSalesIn:'Sales In ถึง AS OF',ppAch:'Achievement',ppNoData:'ไม่มีข้อมูลของรอบนี้',ppDraftNext:'Quota Draft ของรอบนี้',mock2:'ข้อมูลจำลอง · ไม่มีการส่งข้อมูลเข้าระบบจริง'});
Object.assign(dict.en,{ppChip:'Plan period: {m}',ppCurrent:'Current period',ppViewOther:'View another period (read-only)',ppViewing:'Viewing {m} — read-only',ppBack:'Back to the current period',ppReadOnly:'Viewing another plan period — read-only (go back to the current period first)',
 ppRoll:'Roll the plan period to next month',ppRollTitle:'Roll the plan period {a} → {b}',ppRollNote:'Simulates the month change (Integrated demo) — every page switches at once and the audit log records it',ppRollQuota:'Quota that becomes current',ppRollQuotaV:'{n} lines ({a} already approved in Ops + {b} from the Supply plan) · {q} pcs',
 ppRollUsed:'“Used” in the new period',ppRollUsedV:'starts at 0 (what {m} used is closed)',ppRollOpen:'Still open',ppRollOpenV:'Quota drafts / waiting approval for {m}: {d} · Supply proposals waiting: {p}',ppRollAsOf:'Supply AS OF does not change (still {d})',ppRollBtn:'Roll the period',ppRolled:'Plan period is now {m}',ppRollEvent:'Plan period rolled',ppRollDenied:'Only a Director / Admin can roll the plan period, on the Integrated demo',
 ppMonthPanel:'Quota vs Actual · {m}',ppMonthNote:'The plan period (quota month) is separate from AS OF (the weekly data cut) — AS OF is still {d}',ppQuota:'Quota',ppSalesIn:'Sales In to AS OF',ppAch:'Achievement',ppNoData:'No data for this period',ppDraftNext:'Quota drafts of this period',mock2:'Simulated data · nothing is sent to live systems'});
const PP_PAGES=['overview','orders','payments','shipping','allocation','stockoverview','soRequests','reports','supQuota','supProposals','supSop'];
FEED_MONTH=cr4PP();
/* the banner text "รอบแผน พฤศจิกายน 2026" was a constant — it now follows the plan period */
['th','en'].forEach(l=>Object.defineProperty(dict[l],'demoDate',{configurable:true,get(){const m=cr4PP();return l==='th'?'รอบแผน '+fmtDate(m+'-01','my'):'Plan period '+fmtDate(m+'-01','my')}}));

/* ---------------------------------------------------------------- data in read-only mode (the viewed month) */
const ppQuotaForBefore=quotaFor;quotaFor=function(pid,sku){if(!cr4Viewing())return ppQuotaForBefore(pid,sku);const m=cr4ViewPeriod;return db.allocations.filter(a=>a.partner===pid&&a.sku===sku&&a.status==='approved'&&a.month===m).reduce((x,a)=>x+a.qty,0)};
/* after a roll: documents of a closed period no longer count as this period's "used" */
const ppConsumedBefore=consumedFor;consumedFor=function(pid,sku){if(cr4Viewing())return 0;const v=ppConsumedBefore(pid,sku);if(!db.documents?.some(d=>d.planPeriod))return v;
 const old=db.documents.filter(d=>d.partner===pid&&d.planPeriod&&d.planPeriod!==FEED_MONTH&&quotaDeducted(d)).reduce((s,d)=>s+d.lines.filter(l=>l.sku===sku).reduce((x,l)=>x+l.qty,0),0);return Math.max(0,v-old)};
/* the Supply feed is always built from the current period, never from a period opened read-only */
const ppFeedRowsBefore=feedQuotaRows;feedQuotaRows=function(base){const v=cr4ViewPeriod;cr4ViewPeriod=null;try{return ppFeedRowsBefore(base)}finally{cr4ViewPeriod=v}};
const ppFeedChecksBefore=supplyFeedChecks;supplyFeedChecks=function(DB){const v=cr4ViewPeriod;cr4ViewPeriod=null;try{return ppFeedChecksBefore(DB)}finally{cr4ViewPeriod=v}};
/* every Ops write path asks opsCheck() first — read-only mode answers there */
const ppOpsCheckBefore=opsCheck;opsCheck=function(){return cr4Viewing()?t('ppReadOnly'):ppOpsCheckBefore()};
const ppProposeBefore=typeof supPropose==='function'?supPropose:null;if(ppProposeBefore)supPropose=function(v){return cr4Viewing()?{ok:false,error:'ppReadOnly'}:ppProposeBefore(v)};

/* ---------------------------------------------------------------- I8-b · roll the plan period to the next month */
function ppCanRoll(){return!!session&&['director','admin'].includes(session.role)&&typeof supDataset==='function'&&supDataset()==='integrated'&&feedOn()}
function ppRollPlan(){const old=cr4PP(),next=cr4AddMonth(old,1),base=Supply.App.base,accs=new Set((base?.account_master||[]).map(a=>a.account_id));
 const appr=db.allocations.filter(a=>a.month===next&&a.status==='approved'),have=new Set(appr.map(a=>a.partner+'|'+a.sku));
 const plan=(base?.quota||[]).filter(r=>r.month===next&&+r.quota_qty>0&&accs.has(r.account_id)&&!have.has(r.account_id+'|'+r.sku));
 return{old,next,appr,plan,qty:appr.reduce((s,a)=>s+a.qty,0)+plan.reduce((s,r)=>s+Math.round(+r.quota_qty),0),drafts:db.allocations.filter(a=>a.month===next&&['draft','submitted'].includes(a.status)).length,props:(typeof props==='function'?props():[]).filter(p=>p.status==='submitted').length}}
async function ppRoll(){if(!ppCanRoll())return{ok:false,error:'ppRollDenied'};if(opsCheck())return opsResult(opsCheck());await Supply.ensureData();const P=ppRollPlan();if(!Supply.App.base)return{ok:false,error:'dsFail'};
 db.documents.forEach(d=>{if(!d.planPeriod)d.planPeriod=P.old});
 const accs=new Set((Supply.App.base.account_master||[]).map(a=>a.account_id));   // only Supply accounts have monthly quota — Ops-only channels (Direct / Social) keep theirs as they are
 db.allocations.forEach(a=>{if(!a.month&&accs.has(a.partner)&&['approved','submitted','draft'].includes(a.status))a.month=P.old});
 P.plan.forEach(r=>db.allocations.push({id:'AL-Q'+P.next.replace('-','').slice(2)+'-'+r.account_id+'-'+r.sku,sku:r.sku,partner:r.account_id,qty:Math.round(+r.quota_qty),status:'approved',erp:'synced',note:L('Quota '+fmtMonth(P.next)+' จากแผน Supply (เลื่อนรอบ)','Quota '+fmtMonth(P.next)+' from the Supply plan (period roll)'),time:Date.now(),month:P.next}));
 db.quotaOpening={};db.planPeriod=P.next;FEED_MONTH=P.next;if(db.feedBase)db.feedBase.month=P.next;cr4ViewPeriod=null;
 opsAudit('ppRollEvent',P.old+' → '+P.next,[],{period:P.old},{period:P.next,approved:P.appr.length,seeded:P.plan.length,qty:P.qty});persist();return{ok:true,...P}}
function ppRollForm(){if(!ppCanRoll())return toast(t('ppRollDenied'));Supply.ensureData().then(()=>{const P=ppRollPlan();
 showModal(`<form class="dialogbody" id="ppRollForm"><div class="between"><div><div class="eyebrow">${t('ppRoll').toUpperCase()}</div><h2>${tp('ppRollTitle',{a:fmtMonth(P.old),b:fmtMonth(P.next)})}</h2></div><button type="button" data-close aria-label="${t('close')}">×</button></div><p>${t('ppRollNote')}</p>
  ${opsTable(['',''],[[t('ppRollQuota'),tp('ppRollQuotaV',{n:n(P.appr.length+P.plan.length),a:n(P.appr.length),b:n(P.plan.length),q:n(P.qty)})],[t('ppRollUsed'),tp('ppRollUsedV',{m:fmtMonth(P.old)})],[t('ppRollOpen'),tp('ppRollOpenV',{m:fmtMonth(P.next),d:n(P.drafts),p:n(P.props)})],['AS OF',tp('ppRollAsOf',{d:Supply.App.DB?fmtDate(Supply.defaultAsOf()):'—'})]].map(([a,b])=>`<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`))}
  <div class="err" id="formError" role="alert"></div><div class="dialogactions"><button type="button" data-close>${t('cancel')}</button><button type="button" class="primary" data-pp-roll-go="1">${t('ppRollBtn')}</button></div></form>`,'pp-roll');bindClose()}).catch(()=>toast(t('dsFail')))}

/* ---------------------------------------------------------------- the chip + the period menu + the read-only bar */
function ppMenu(anchor){cr4PopClose();const el=cr4PopEl(),cur=cr4PP(),months=[];for(let k=-6;k<=1;k++)months.push(cr4AddMonth(cur,k));const sel=cr4PlanPeriod();
 el.className='cr4pop pp-pop';el.innerHTML=`<div class="ofb-pophead"><b>${t('ppCurrent')}: ${fmtMonth(cur)}</b><button type="button" data-drp-close="1" aria-label="${t('close')}">×</button></div><div class="ofb-poplabel">${t('ppViewOther')}</div><div class="pp-months">${months.map(m=>`<button type="button" data-pp-view="${m}" class="${m===sel?'on':''}${m===cur?' cur':''}">${fmtMonth(m)}${m===cur?' ●':''}</button>`).join('')}</div>${ppCanRoll()&&!cr4Viewing()?`<div class="drp-foot"><button type="button" data-pp-roll="1">↻ ${t('ppRoll')}</button></div>`:''}`;
 cr4PopPlace(el,ofbMobile()?null:anchor,ofbMobile())}
function ppChipHTML(){const m=cr4PlanPeriod();return`<button type="button" class="pp-chip${cr4Viewing()?' viewing':''}" data-pp-open="1" aria-haspopup="dialog">${esc(tp('ppChip',{m:fmtMonth(m)}))} ▾</button>`}
const PP_WRITE='#page button.primary,#modal button.primary,[data-approve],[data-reject],[data-release],[data-propose],[data-prop-act],[data-prop-save],[data-qd-send],[data-rcl-act],[data-stock-send],[data-stock-reject],[data-stock-cancel],[data-stock-receive],[data-stock-override],[data-issue-approve],[data-issue-reject],[data-issue-cancel],[data-ops-inspect],[data-ops-credit],[data-ops-reject-return],[data-fu-confirm],[data-fu-cancel],[data-fu-case],[data-fu-delivered],[data-fu-failed],[data-fu-exception],[data-sop-act],[data-sop-add],[data-sop-save],[data-sop-note],[data-sop-close],[data-sup-b2],[data-po-edit],#newOrder,#new,#addPartner,#bulkConfirmV3,#sync,#outage';
function ppLockUI(root){if(!cr4Viewing())return;(root||document).querySelectorAll(PP_WRITE).forEach(b=>{if(b.closest('#cr4Pop,.ofb,.pp-bar,.drp')||b.matches('[data-ofb-date],[data-drp-apply]'))return;b.disabled=true;b.title=t('ppReadOnly')})}
const ppBindBefore=bind;bind=function(){ppBindBefore();if(!session)return;
 // the blue banner keeps "ข้อมูลจำลอง" only · the chip sits on the pages that use the plan period
 const ban=document.querySelector('main .content > .banner');if(ban){const sp=ban.querySelectorAll('span')[1];if(sp){if(PP_PAGES.includes(view))sp.outerHTML=ppChipHTML();else sp.remove()}}
 const foot=document.querySelector('aside .sidebarfoot p');if(foot)foot.textContent=tp('ppChip',{m:fmtMonth(cr4PP())});
 if(cr4Viewing()){$('#page')?.insertAdjacentHTML('afterbegin',`<div class="banner warn pp-bar" role="status"><span>⚑ ${esc(tp('ppViewing',{m:fmtMonth(cr4ViewPeriod)}))}</span><button type="button" class="quiet" data-pp-back="1">${t('ppBack')}</button></div>`);ppLockUI(document)}};
const ppModalBefore=showModal;showModal=function(html,kind){ppModalBefore(html,kind);if(cr4Viewing()&&kind!=='pp-roll')ppLockUI($('#modal'))};
const ppLogoutBefore=logoutForUserSwitch;logoutForUserSwitch=function(){cr4ViewPeriod=null;return ppLogoutBefore()};
document.addEventListener('click',async e=>{const el=e.target.closest?.('[data-pp-open],[data-pp-view],[data-pp-back],[data-pp-roll],[data-pp-roll-go]');if(!el||!session)return;
 if(el.dataset.ppOpen){ppMenu(el);return}
 if(el.dataset.ppView){const m=el.dataset.ppView;cr4ViewPeriod=m===cr4PP()?null:m;cr4PopClose();render();return}
 if(el.dataset.ppBack){cr4ViewPeriod=null;render();return}
 if(el.dataset.ppRoll){cr4PopClose();ppRollForm();return}
 if(el.dataset.ppRollGo){el.disabled=true;const r=await ppRoll();el.disabled=false;if(r.ok===false){const fe=$('#formError');if(fe)fe.textContent=t(r.error)||r.error;return}$('#modal').close();render();toast(tp('ppRolled',{m:fmtMonth(r.next)}))}});

/* ---------------------------------------------------------------- Supply › Quota vs Actual: the viewed period (AS OF unchanged) */
if(window.Pages?.quota){const ppQRender=Pages.quota.render;Pages.quota.render=function(main,App){ppQRender.call(this,main,App);if(!cr4Viewing()||!App.DB)return;
 const M=App.model(),DB=App.DB,m=cr4ViewPeriod,m0=Calc.dn(m+'-01'),end=Math.min(Calc.addMonths(m0,1),M.asDn),rows=[];
 DB.accounts.forEach(a=>{if(!M.mask[a.j])return;const mk=DB.accounts.map((x,j)=>j===a.j);let q=0,si=0;M.rows.forEach(r=>{const arr=DB.quota[r.i].get(m);if(arr)q+=arr[a.j]||0;if(end>m0)si+=Calc.monthFlows(DB,r.i,mk,m0,end).si});if(q||si)rows.push({a,q,si})});
 const tq=rows.reduce((s,x)=>s+x.q,0),ts=rows.reduce((s,x)=>s+x.si,0),drafts=db.allocations.filter(a=>a.month===m&&['draft','submitted'].includes(a.status)&&visiblePartner(partner(a.partner)));
 const html=`<section class="card pp-qpanel"><div class="card-head"><h3>${esc(tp('ppMonthPanel',{m:fmtMonth(m)}))}</h3><span class="muted small">${esc(tp('ppMonthNote',{d:fmtDate(M.asDn)}))}</span></div>${rows.length?`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Account</th><th class="num">${t('ppQuota')}</th><th class="num">${t('ppSalesIn')}</th><th class="num">${t('ppAch')}</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.a.name)}</td><td class="num">${n(Math.round(x.q))}</td><td class="num">${n(Math.round(x.si))}</td><td class="num">${x.q?n(Math.round(x.si/x.q*1000)/10)+'%':'—'}</td></tr>`).join('')}<tr class="tot"><td><b>Σ</b></td><td class="num"><b>${n(Math.round(tq))}</b></td><td class="num"><b>${n(Math.round(ts))}</b></td><td class="num"><b>${tq?n(Math.round(ts/tq*1000)/10)+'%':'—'}</b></td></tr></tbody></table></div>`:`<div class="empty">${t('ppNoData')}</div>`}${drafts.length?`<p class="small muted">${t('ppDraftNext')}: ${drafts.map(a=>esc(a.id)+' · '+esc(a.sku)+' · '+n(a.qty)).join(' · ')}</p>`:''}</section>`;
 main.insertAdjacentHTML('afterbegin',html)}}
