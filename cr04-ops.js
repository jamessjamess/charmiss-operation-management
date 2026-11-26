/* cr04-ops.js — CR-04 I8-a "เสนอ" on the phone cards · I8-c consignment count adjustment (request → approve → consign_adjust → Supply remaining)
   The adjustment never touches WMS Actual or quota; the Supply setting countAdjustOn (default on) switches its effect off (CR-01 anchors). */
Object.assign(dict.th,{caBtn:'ขอปรับยอดตามผลนับ',caTitle:'ขอปรับยอดฝากขายตามผลนับ',caNote:'ปรับ Remaining ของคู่นี้ใน Supply นับจากวันถัดจากวันที่นับ (ไม่แตะ WMS Actual และ Quota) · ผู้อนุมัติ: Director หรือ Manager MT (ผู้ขออนุมัติเองไม่ได้)',caReason:'เหตุผล (บังคับ)',caSend:'ส่งคำขอ',
 caPair:'คู่',caCountDate:'วันที่นับ',caCalc:'คำนวณ',caCounted:'นับจริง',caAdj:'ปรับ',caReq:'รออนุมัติ',caApproved:'อนุมัติแล้ว',caRejected:'ไม่อนุมัติ',caApprove:'อนุมัติปรับยอด',caReject:'ไม่อนุมัติ',caNeedReason:'กรุณาระบุเหตุผล',caOwn:'ผู้ขออนุมัติคำขอของตัวเองไม่ได้',caDenied:'ไม่มีสิทธิ์อนุมัติ (Director หรือ Manager MT)',caNoGap:'ผลต่างไม่เกินเกณฑ์ {p}%',caDup:'มีคำขอของคู่นี้รออนุมัติอยู่แล้ว',
 caEventReq:'ขอปรับยอดฝากขาย',caEventOk:'อนุมัติปรับยอดฝากขาย',caEventNo:'ไม่อนุมัติปรับยอดฝากขาย',caWork:'ปรับยอดฝากขายรออนุมัติ',caCol:'ปรับยอด',caOff:'ปิดการใช้ผลปรับยอดอยู่ (ตั้งค่า)',caDone:'ส่งคำขอปรับยอดแล้ว',caOk:'อนุมัติปรับยอดแล้ว — Supply คำนวณ Remaining ใหม่',caNo:'บันทึกไม่อนุมัติแล้ว'});
Object.assign(dict.en,{caBtn:'Request a count adjustment',caTitle:'Adjust consignment stock to the count',caNote:'Moves this pair’s remaining in Supply from the day after the count (WMS Actual and quota stay untouched) · approver: Director or Manager MT (not the requester)',caReason:'Reason (required)',caSend:'Send request',
 caPair:'Pair',caCountDate:'Count date',caCalc:'Calculated',caCounted:'Counted',caAdj:'Adjust',caReq:'Waiting approval',caApproved:'Approved',caRejected:'Rejected',caApprove:'Approve adjustment',caReject:'Reject',caNeedReason:'A reason is required',caOwn:'You cannot approve your own request',caDenied:'Only a Director or Manager MT can approve',caNoGap:'The gap is within {p}%',caDup:'This pair already has a request waiting',
 caEventReq:'Consignment adjustment requested',caEventOk:'Consignment adjustment approved',caEventNo:'Consignment adjustment rejected',caWork:'Consignment adjustment to approve',caCol:'Adjust',caOff:'Count adjustments are switched off (settings)',caDone:'Adjustment request sent',caOk:'Adjustment approved — Supply recalculates the remaining',caNo:'Rejection recorded'});
I18N.add({set_countAdjustOn:'ใช้ผลปรับยอดฝากขายจากผลนับ (consign_adjust)'},{set_countAdjustOn:'Apply consignment count adjustments (consign_adjust)'});
const CA_GAP=5;   // D5: a pair qualifies when |counted − calculated| > 5 % of the calculated remaining

/* ---------------------------------------------------------------- I8-a · the "เสนอ" button inside each phone card (same payload, same form as desktop) */
(()=>{const tb=U.table;U.table=function(host,o){const pc=o&&o.card&&(o.cols||[]).filter(c=>c.k==='prop'||c.k==='caadj');
 if(pc&&pc.length&&U.isMobile()){const card=o.card;o=Object.assign({},o,{cardDiv:true,card:r=>{const b=pc.map(c=>c.html(r)).join('');return card(r)+(b?`<div class="cc-prop">${b}</div>`:'')}})}return tb.call(this,host,o)};
 // a button inside a card must not also open the card's row (drawer): handle it first and stop there
 document.addEventListener('click',e=>{const b=e.target.closest?.('.cc-prop [data-propose],.cc-prop [data-ca-req]');if(!b)return;e.stopPropagation();e.preventDefault();
  if(b.dataset.caReq){caForm(JSON.parse(b.dataset.caReq));return}
  let v;try{v=JSON.parse(b.dataset.propose)}catch{return}const res=supPropose(v);toast(res.ok?(res.merged?tp('propMerged',{id:res.prop.id}):tp('propCreated',{id:res.prop.id})):(t(res.error)||res.error))},true)})();

/* ---------------------------------------------------------------- I8-c · request → approve → consign_adjust */
function caList(){db.consignAdjust||=[];return db.consignAdjust}
function caCanRequest(){return!!session&&(fuCan('supply.import')||fuCan('supply.propose')||session.role==='director'||(session.role==='manager'&&orgSessionGroup()==='MT'))}
function caCanApprove(){return!!session&&(session.role==='director'||(session.role==='manager'&&orgSessionGroup()==='MT'))}
function caVisible(x){const p=partner(x.account);return!p||visiblePartner(p)}
function caRequest(v){if(!caCanRequest())return{ok:false,error:'denied'};if(opsCheck())return opsResult(opsCheck());
 const reason=String(v.reason||'').trim().slice(0,200),counted=Math.round(+v.counted),calc=Math.round(+v.calc);if(!reason)return{ok:false,error:'caNeedReason'};
 if(!(calc>0?Math.abs(counted-calc)/calc*100>CA_GAP:counted!==calc))return{ok:false,error:'caNoGap'};
 if(caList().some(x=>x.status==='requested'&&x.account===v.account&&x.sku===v.sku))return{ok:false,error:'caDup'};
 const x={id:'CA-'+Date.now().toString(36).toUpperCase(),date:String(v.date).slice(0,10),account:v.account,sku:v.sku,qty:counted-calc,counted,calc,reason,status:'requested',by:stockActorId(),byName:stockActorName(),at:Date.now()};
 caList().unshift(x);opsAudit('caEventReq',x.id+' · '+x.account+' · '+x.sku+' · '+(x.qty>0?'+':'')+x.qty,[x.account],null,{qty:x.qty,reason});persist();return{ok:true,x}}
function caDecide(id,ok,why){const x=caList().find(a=>a.id===id);if(!x||x.status!=='requested')return{ok:false,error:'required'};if(!caCanApprove())return{ok:false,error:'caDenied'};if(x.by===stockActorId())return{ok:false,error:'caOwn'};if(opsCheck())return opsResult(opsCheck());
 if(!ok&&!String(why||'').trim())return{ok:false,error:'caNeedReason'};
 x.status=ok?'approved':'rejected';x.decidedBy=stockActorId();x.decidedName=stockActorName();x.decidedAt=Date.now();if(!ok)x.rejectReason=String(why).trim().slice(0,200);
 opsAudit(ok?'caEventOk':'caEventNo',x.id+' · '+x.account+' · '+x.sku,[x.account],{status:'requested'},{status:x.status,qty:x.qty});persist();return{ok:true,x}}
function caForm(v){if(!caCanRequest())return toast(t('denied'));const acc=Supply.App.DB?.accounts.find(a=>a.account_id===v.account);
 showModal(`<form class="dialogbody" id="caForm"><div class="between"><div><div class="eyebrow">F8</div><h2>${t('caTitle')}</h2></div><button type="button" data-close aria-label="${t('close')}">×</button></div><p>${t('caNote')}</p>
  ${opsTable([t('caPair'),t('caCountDate'),t('caCalc'),t('caCounted'),t('caAdj')],[`<tr><td><b>${esc(v.sku)}</b><small>${esc(acc?.name||v.account)}</small></td><td>${fmtDate(v.date)}</td><td>${n(v.calc)}</td><td>${n(v.counted)}</td><td><b>${v.counted-v.calc>0?'+':''}${n(v.counted-v.calc)}</b></td></tr>`])}
  <label>${t('caReason')}<textarea name="reason" required maxlength="200" rows="2"></textarea></label><div class="err" id="formError" role="alert"></div>
  <div class="dialogactions"><button type="button" data-close>${t('cancel')}</button><button type="button" class="primary" data-ca-send="${esc(JSON.stringify(v))}">${t('caSend')}</button></div></form>`,'ca-form');bindClose()}
function caDecideForm(id){const x=caList().find(a=>a.id===id);if(!x)return;
 showModal(`<form class="dialogbody" id="caDecideForm"><div class="between"><div><div class="eyebrow">F8 · ${esc(x.id)}</div><h2>${t('caTitle')}</h2></div><button type="button" data-close aria-label="${t('close')}">×</button></div><p>${t('caNote')}</p>
  ${opsTable([t('caPair'),t('caCountDate'),t('caCalc'),t('caCounted'),t('caAdj')],[`<tr><td><b>${esc(x.sku)}</b><small>${esc(partner(x.account)?.name||x.account)}</small></td><td>${fmtDate(x.date)}</td><td>${n(x.calc)}</td><td>${n(x.counted)}</td><td><b>${x.qty>0?'+':''}${n(x.qty)}</b></td></tr>`])}
  <p><b>${t('caReason')}:</b> ${esc(x.reason)}<br><small class="muted">${esc(x.byName||x.by)} · ${fmtDateTime(x.at)}</small></p>
  <label>${t('reject')} — ${t('caReason')}<textarea name="why" maxlength="200" rows="2"></textarea></label><div class="err" id="formError" role="alert"></div>
  <div class="dialogactions"><button type="button" data-close>${t('close')}</button>${caCanApprove()&&x.status==='requested'&&x.by!==stockActorId()?`<button type="button" data-ca-no="${esc(x.id)}">${t('caReject')}</button><button type="button" class="primary" data-ca-ok="${esc(x.id)}">${t('caApprove')}</button>`:''}</div></form>`,'ca-decide');bindClose()}
/* the column on Consignment › calculated vs counted (only pairs whose gap is above 5 %) */
Pages.cntAdjCol=M=>caCanRequest()||caCanApprove()?[{k:'caadj',label:t('caCol'),nosort:true,noxl:true,get:()=>'',html:r=>{const DB=Supply.App.DB,acc=DB.accounts[r.j].account_id,p=caList().find(x=>x.account===acc&&x.sku===r.sku&&x.status==='requested');
 if(p)return`<button type="button" class="btn small" data-ca-open="${esc(p.id)}">${t('caReq')}</button>`;
 const big=r.calc>0?Math.abs(r.diff)/r.calc*100>CA_GAP:r.diff!==0;if(!big||!caCanRequest())return'';
 return`<button type="button" class="btn small" data-ca-req="${esc(JSON.stringify({date:Calc.iso(r.d),account:acc,sku:r.sku,counted:r.qty,calc:r.calc}))}">${t('caBtn')}</button>`}}]:[];
document.addEventListener('click',e=>{const el=e.target.closest?.('[data-ca-req],[data-ca-send],[data-ca-open],[data-ca-ok],[data-ca-no]');if(!el||el.closest('.cc-prop'))return;e.stopPropagation();
 const done=(r,msg)=>{if(r.ok===false){const fe=$('#modal[open] #formError');if(fe)fe.textContent=t(r.error)||r.error;else toast(t(r.error)||r.error);return}if($('#modal').open)$('#modal').close();render();toast(msg)};
 if(el.dataset.caReq){caForm(JSON.parse(el.dataset.caReq));return}
 if(el.dataset.caOpen){caDecideForm(el.dataset.caOpen);return}
 if(el.dataset.caSend){const v=JSON.parse(el.dataset.caSend);v.reason=$('#caForm [name="reason"]')?.value;done(caRequest(v),t('caDone'));return}
 if(el.dataset.caOk){done(caDecide(el.dataset.caOk,true),t('caOk'));return}
 if(el.dataset.caNo){done(caDecide(el.dataset.caNo,false,$('#caDecideForm [name="why"]')?.value),t('caNo'))}},true);
/* Supply reads the approved adjustments as the table consign_adjust (Integrated demo feed) */
const caFeedBefore=supplyFeed;supplyFeed=function(base){const r=caFeedBefore(base);if(r&&r.raw&&feedOn()){const L=caList().filter(x=>x.status==='approved');if(L.length)r.raw=Object.assign({},r.raw,{consign_adjust:L.map(x=>({date:x.date,account_id:x.account,sku:x.sku,qty:x.qty,ref:x.id}))})}return r};
Supply.feed=supplyFeed;Supply.feedChecks=supplyFeedChecks;   // Supply keeps references: give it the wrapped functions (R6 read-only guard · I8-c)
/* home › My work: adjustments waiting for this approver */
const caHomeBefore=homeData;homeData=function(P){const D=caHomeBefore(P);if(caCanApprove())caList().filter(x=>x.status==='requested'&&x.by!==stockActorId()&&caVisible(x)).forEach(x=>D.work.push({src:'approve',sev:1,due:x.at+864e5,title:t('caWork'),sub:`${x.id} · ${x.sku} · ${partner(x.account)?.name||x.account} · ${x.qty>0?'+':''}${n(x.qty)}`,go:`data-ca-open="${esc(x.id)}"`}));
 D.work.sort((a,b)=>a.sev-b.sev||(a.due??9e15)-(b.due??9e15));return D};
