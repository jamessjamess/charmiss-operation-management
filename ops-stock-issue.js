/* ops-stock-issue.js — CR-03 R2 · เบิกออก (ไม่ใช่การขาย) / non-sales stock issues.
   Ops › สินค้าคงคลังและโควตา: a request (type · SKU · lot = FEFO or chosen · qty · reference · reason) → approved by whoever holds the
   new permission stock.issue.approve (Director / Admin by default, never the requester) → the approval posts the issue in the
   existing stock ledger (db.lots + db.movements, type issue-<type>) with an audit line. Rejecting needs a reason.
   The WMS DEMO of the Integrated demo reports the issue on its next read; supply-feed.js turns it into other_out — WH goes down,
   it is never Sales Out and never in the run rate. Ops rules unchanged: no quota is deducted, nothing is sold. */
const ISSUE_TYPES=['pr','sample','internal','writeoff','other'];
Object.assign(dict.th,{issueTitle:'เบิกออก (ไม่ใช่การขาย)',issueNew:'เบิกออก (ไม่ใช่การขาย)',issuePanel:'คำขอเบิกออก (ไม่ใช่การขาย)',issueNote:'PR / ตัวอย่าง / ใช้ภายใน / ของเสีย — ตัดออกจากคลังเมื่ออนุมัติ ไม่นับเป็นยอดขาย ไม่หัก Quota และไม่เข้า Run Rate · WMS เห็นในรอบดึงถัดไป',issue_pr:'PR / KOL',issue_sample:'ตัวอย่าง (Sample)',issue_internal:'ใช้ภายใน',issue_writeoff:'ของเสีย / Write-off',issue_other:'อื่นๆ',issueType:'ประเภท',issueLot:'Lot',issueFefo:'FEFO อัตโนมัติ (หมดอายุก่อนออกก่อน)',issueQty:'จำนวน',issueRef:'เลขอ้างอิง',issueReason:'เหตุผล',issueSubmit:'ส่งขออนุมัติ',issueApprove:'อนุมัติและตัดสต็อก',issueReject:'ปฏิเสธ',issueCancel:'ยกเลิกคำขอ',issueRejectReason:'เหตุผลที่ปฏิเสธ',issue_submitted:'รออนุมัติ',issue_issued:'ตัดสต็อกแล้ว',issue_rejected:'ปฏิเสธ',issue_cancelled:'ยกเลิก',issueRequested:'ขอเบิกออก (ไม่ใช่การขาย)',issueApproved:'อนุมัติเบิกออก (ไม่ใช่การขาย)',issueRejected:'ปฏิเสธคำขอเบิกออก',issueCancelled:'ยกเลิกคำขอเบิกออก',issueSelf:'ผู้ขออนุมัติคำขอของตัวเองไม่ได้',issueShort:'Lot / สต็อกที่ใช้ได้ไม่พอ',issueFree:'จำนวนนี้กระทบ Safety หรือโควต้าที่จัดสรรแล้ว ต้องจัดการโควต้าก่อน',issueDupRef:'เลขอ้างอิงซ้ำ',issueBad:'ตรวจประเภท SKU จำนวน เลขอ้างอิง และเหตุผล',issueNeedReason:'ต้องระบุเหตุผล',issueRequester:'ผู้ขอ',issueApprover:'ผู้อนุมัติ',issueMonth:'เบิกออกเดือนนี้',issueNone:'ยังไม่มีคำขอ'});
Object.assign(dict.en,{issueTitle:'Non-sales stock issue',issueNew:'Non-sales issue',issuePanel:'Non-sales stock issues',issueNote:'PR / samples / internal use / write-off — issued from stock when approved; never a sale, no quota deducted, not in the run rate · the WMS shows it on its next read',issue_pr:'PR / KOL',issue_sample:'Sample',issue_internal:'Internal use',issue_writeoff:'Damaged / write-off',issue_other:'Other',issueType:'Type',issueLot:'Lot',issueFefo:'FEFO (earliest expiry first)',issueQty:'Quantity',issueRef:'Reference',issueReason:'Reason',issueSubmit:'Submit for approval',issueApprove:'Approve and issue',issueReject:'Reject',issueCancel:'Cancel request',issueRejectReason:'Reason for rejecting',issue_submitted:'Waiting for approval',issue_issued:'Issued',issue_rejected:'Rejected',issue_cancelled:'Cancelled',issueRequested:'Non-sales issue requested',issueApproved:'Non-sales issue approved',issueRejected:'Non-sales issue rejected',issueCancelled:'Non-sales issue cancelled',issueSelf:'A requester cannot approve their own request',issueShort:'Not enough stock in usable lots',issueFree:'This quantity would cut into safety or allocated quota — resolve the quota first',issueDupRef:'Duplicate reference',issueBad:'Check type, SKU, quantity, reference and reason',issueNeedReason:'A reason is required',issueRequester:'Requested by',issueApprover:'Approved by',issueMonth:'Issued this month',issueNone:'No requests yet'});

/* permission (CR-03 A5): approver = Director / Admin by default and as the ceiling; the access page lists it with the other functions */
fuActions['stock.issue.approve']=['อนุมัติเบิกออก (ไม่ใช่การขาย)','Approve non-sales stock issues'];
const issueCeilBefore=fuCeiling;fuCeiling=function(p,a){if(a==='stock.issue.approve')return !!p&&['director','admin'].includes(p.role);return issueCeilBefore(p,a)};
const issueDefBefore=fuDefault;fuDefault=function(p,a){if(a==='stock.issue.approve')return fuCeiling(p,a);return issueDefBefore(p,a)};
function issueCanRequest(){return !!session&&['admin','warehouse','director'].includes(session.role)}
function issueCanApprove(){return typeof fuCan==='function'&&fuCan('stock.issue.approve')}

/* lots for an issue: the chosen lot first, then FEFO · write-off may take any lot with stock, other types only usable (grade A, not expired) lots */
function issuePlan(sku,qty,type,lotId){const lots=(db.lots||[]).filter(l=>l.sku===sku&&l.qty>0&&(type==='writeoff'||opsLotUsable(l))).sort((a,b)=>((b.id===lotId)-(a.id===lotId))||String(a.expiry).localeCompare(String(b.expiry))||a.id.localeCompare(b.id));
 const plan=[];let left=qty;for(const l of lots){const q=Math.min(left,l.qty);if(q>0){plan.push({lotId:l.id,lot:l.lot,qty:q});left-=q}if(!left)break}return left>0?null:plan}
function issueFreeOk(sku,qty,type){if(type==='writeoff')return true;return free(sku)-qty>=0}
function issueRequest(v){
 if(!issueCanRequest())return opsResult('denied');if(opsCheck())return opsResult(opsCheck());db.stockIssues||=[];
 const qty=Number(v.qty),ref=String(v.ref||'').trim(),m=opsMaster(v.sku);
 if(!ISSUE_TYPES.includes(v.type)||!m||!Number.isSafeInteger(qty)||qty<1||qty>1e7||!opsSafeText(ref,100)||!opsSafeText(v.reason,200))return opsResult('issueBad');
 if(db.stockIssues.some(x=>x.ref.toLowerCase()===ref.toLowerCase()&&!['rejected','cancelled'].includes(x.status)))return opsResult('issueDupRef');
 if(!issuePlan(v.sku,qty,v.type,v.lotId))return opsResult('issueShort');if(!issueFreeOk(v.sku,qty,v.type))return opsResult('issueFree');
 const x={id:'IS-'+String(Date.now()).slice(-8),type:v.type,sku:v.sku,lotId:v.lotId||'',qty,ref,reason:String(v.reason).trim(),status:'submitted',requestedById:stockActorId(),requestedBy:stockActorName(),requestedAt:Date.now()};
 db.stockIssues.unshift(x);opsAudit('issueRequested',x.id+' · '+x.sku+' · '+qty+' · '+t('issue_'+x.type),[],null,{...x});return{ok:true,issue:x}}
function issueApprove(id){
 if(!issueCanApprove())return opsResult('denied');if(opsCheck())return opsResult(opsCheck());const x=(db.stockIssues||[]).find(i=>i.id===id);
 if(!x||x.status!=='submitted')return opsResult('issueBad');if(x.requestedById===stockActorId())return opsResult('issueSelf');
 const plan=issuePlan(x.sku,x.qty,x.type,x.lotId);if(!plan)return opsResult('issueShort');if(!issueFreeOk(x.sku,x.qty,x.type))return opsResult('issueFree');
 const before={...x};plan.forEach(p=>{const lot=db.lots.find(l=>l.id===p.lotId);lot.qty-=p.qty;opsMovement(x.sku,lot,-p.qty,'issue-'+x.type,x.id+' · '+x.ref)});
 Object.assign(x,{status:'issued',lots:plan,approvedById:stockActorId(),approvedBy:stockActorName(),approvedAt:Date.now(),issuedAt:Date.now()});opsSyncProducts();
 opsAudit('issueApproved',x.id+' · '+x.sku+' · '+x.qty,[],before,{...x});return{ok:true,issue:x}}
function issueReject(id,reason){
 if(!issueCanApprove())return opsResult('denied');if(opsCheck())return opsResult(opsCheck());const x=(db.stockIssues||[]).find(i=>i.id===id);
 if(!x||x.status!=='submitted')return opsResult('issueBad');if(!opsSafeText(reason,200))return opsResult('issueNeedReason');
 const before={...x};Object.assign(x,{status:'rejected',rejectReason:String(reason).trim(),approvedById:stockActorId(),approvedBy:stockActorName(),approvedAt:Date.now()});opsAudit('issueRejected',x.id+' · '+x.rejectReason,[],before,{...x});return{ok:true,issue:x}}
function issueCancel(id){const x=(db.stockIssues||[]).find(i=>i.id===id);if(!x||x.status!=='submitted')return opsResult('issueBad');if(x.requestedById!==stockActorId())return opsResult('denied');
 const before={...x};x.status='cancelled';opsAudit('issueCancelled',x.id,[],before,{...x});return{ok:true}}

/* UI on the inventory page (global / warehouse view) */
function issueForm(){if(!issueCanRequest())return;const lotOpts=sku=>`<option value="">${t('issueFefo')}</option>`+(db.lots||[]).filter(l=>l.sku===sku&&l.qty>0).sort((a,b)=>String(a.expiry).localeCompare(String(b.expiry))).map(l=>`<option value="${esc(l.id)}">${esc(l.lot)} · ${l.expiry} · ${n(l.qty)}</option>`).join('');
 const first=db.productMaster.find(p=>p.active)?.sku||'';
 const f=opsModal(t('issueTitle'),`<div class="formgrid"><label>${t('issueType')}<select name="type">${ISSUE_TYPES.map(k=>`<option value="${k}">${t('issue_'+k)}</option>`).join('')}</select></label><label>SKU<select name="sku" id="issueSku">${opsSkuOptions(first,true)}</select></label><label>${t('issueLot')}<select name="lotId" id="issueLot">${lotOpts(first)}</select></label><label>${t('issueQty')}<input type="number" name="qty" min="1" step="1" required></label><label>${t('issueRef')}<input name="ref" maxlength="100" required placeholder="PR-2026-12-001"></label><label class="full">${t('issueReason')}<input name="reason" maxlength="200" required placeholder="${esc(L('เช่น PR Box KOL รอบ ธ.ค.','e.g. December KOL PR box'))}"></label></div><p class="small">${t('issueNote')}</p>`,t('issueSubmit'),'ops-issue');
 $('#issueSku').onchange=e=>{$('#issueLot').innerHTML=lotOpts(e.target.value)};
 f.onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(f));opsFeedback(issueRequest({...v,qty:+v.qty}))}}
function issueRejectForm(id){const f=opsModal(t('issueReject')+' · '+esc(id),`<label class="full">${t('issueRejectReason')}<input name="reason" maxlength="200" required></label>`,t('issueReject'),'ops-issue-reject');f.onsubmit=e=>{e.preventDefault();opsFeedback(issueReject(id,new FormData(f).get('reason')))}}
function issuePanel(){const list=db.stockIssues||[],me=stockActorId(),pill=s=>`<span class="pill ${s==='issued'?'ok':s==='submitted'?'warn':''}">${t('issue_'+s)}</span>`;
 const month=dateKey(Date.now()).slice(0,7),mo={};list.filter(x=>x.status==='issued'&&dateKey(x.issuedAt).slice(0,7)===month).forEach(x=>{mo[x.type]=(mo[x.type]||0)+x.qty});
 const act=x=>x.status!=='submitted'?'':[issueCanApprove()&&x.requestedById!==me?`<button class="primary" data-issue-approve="${x.id}">${t('issueApprove')}</button> <button data-issue-reject="${x.id}">${t('issueReject')}</button>`:'',x.requestedById===me?`<button class="quiet" data-issue-cancel="${x.id}">${t('issueCancel')}</button>`:''].join(' ');
 return `<section class="panel" id="issuePanel"><div class="panelhead"><h2>${t('issuePanel')}</h2><div class="tools">${ISSUE_TYPES.filter(k=>mo[k]).map(k=>`<span class="pill">${t('issue_'+k)} ${n(mo[k])}</span>`).join(' ')||`<span class="muted small">${t('issueMonth')}: 0</span>`}${issueCanRequest()?`<button id="issueNew" class="primary">＋ ${t('issueNew')}</button>`:''}</div></div><div class="panelbody"><p class="small">${t('issueNote')}</p></div>
 ${list.length?opsTable([t('ref'),t('issueType'),'SKU / Lot',t('issueQty'),t('issueReason'),t('issueRequester'),t('status'),''],list.map(x=>`<tr><td><b>${esc(x.id)}</b><small>${esc(x.ref)} · ${ecomTime(x.requestedAt)}</small></td><td>${t('issue_'+x.type)}</td><td>${esc(x.sku)}<small>${esc((x.lots||[]).map(l=>l.lot+' × '+n(l.qty)).join(', ')||(x.lotId?db.lots.find(l=>l.id===x.lotId)?.lot||'':t('issueFefo')))}</small></td><td>${n(x.qty)}</td><td>${esc(x.reason)}${x.rejectReason?`<small>${t('issueRejectReason')}: ${esc(x.rejectReason)}</small>`:''}</td><td>${esc(x.requestedBy)}${x.approvedBy?`<small>${t('issueApprover')}: ${esc(x.approvedBy)}</small>`:''}</td><td>${pill(x.status)}</td><td>${act(x)}</td></tr>`)):`<div class="panelbody"><p class="muted">${t('issueNone')}</p></div>`}</section>`}
/* the v13 inventory page is the WMS Actual view (later modules wrap opsInventoryPage): the panel goes before the movement ledger when there is one, else at the end */
const issueInvBefore=opsInventoryPage;opsInventoryPage=function(){const html=issueInvBefore();if(!opsGlobal()&&!opsWarehouse())return html;
 const k=html.indexOf('<section class="panel"><div class="panelhead"><h2>Stock movement ledger</h2>');return k<0?html+issuePanel():html.slice(0,k)+issuePanel()+html.slice(k)};
const issueBindBefore=bind;bind=function(){issueBindBefore();if(view!=='stockoverview')return;
 if($('#issueNew'))$('#issueNew').onclick=issueForm;
 document.querySelectorAll('[data-issue-approve]').forEach(b=>b.onclick=()=>opsFeedback(issueApprove(b.dataset.issueApprove),false));
 document.querySelectorAll('[data-issue-reject]').forEach(b=>b.onclick=()=>issueRejectForm(b.dataset.issueReject));
 document.querySelectorAll('[data-issue-cancel]').forEach(b=>b.onclick=()=>opsFeedback(issueCancel(b.dataset.issueCancel),false))};

/* Integrated demo: one PR / KOL request waiting for approval, so the flow can be tried at once (nothing is issued) */
const issueSeedBefore=supFeedSeed;supFeedSeed=function(base){issueSeedBefore(base);const wh={};base.stock_lot.filter(r=>r.location==='WH').forEach(r=>{wh[r.sku]=(wh[r.sku]||0)+(+r.qty)});
 const sku=Object.entries(wh).sort((a,b)=>b[1]-a[1])[0]?.[0];if(!sku)return;
 db.stockIssues=[{id:'IS-DEMO-001',type:'pr',sku,lotId:'',qty:100,ref:'PR-2026-12-KOL01',reason:L('PR Box KOL รอบ ธ.ค. 2026 (ตัวอย่างรออนุมัติ)','December 2026 KOL PR box (pending example)'),status:'submitted',requestedById:'role-warehouse',requestedBy:t('warehouse'),requestedAt:db.feedBase.builtAt}]};
