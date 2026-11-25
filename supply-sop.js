/* supply-sop.js — CR-03 Phase 3D · R7 the S&OP cycle.
   Action log (exception queue) · plan snapshots ("close the plan cycle", this cycle vs the previous one) · the plan lock day
   (a change to next month's quota after it gets a warning) · "my overdue actions" on the Ops home card · open actions for Supply Review.
   Ops-style page supSop (#/supply/sop) under SUPPLY PLANNING. Actions live in db.sopActions (Ops data, at most 2,000);
   snapshots in IndexedDB (at most 12). Same layering as the other Ops modules: globals are wrapped, nothing is edited in place.
   Supply Planning stays read-only — actions are follow-ups, nothing here changes stock, quota or orders. */
Object.assign(dict.th,{supSop:'รอบ S&OP · Action log',sopIntro:'รอบการตัดสินใจรายเดือน — Action log (คิวข้อยกเว้น) และ Snapshot แผน · Action ปิดเองไม่ได้ · Supply Planning ยังอ่านอย่างเดียว',
 sopTabActions:'Action log',sopTabSnaps:'Snapshot แผน',sopKOpen:'เปิดอยู่',sopKOverdue:'เกินกำหนด',sopKHigh:'ความรุนแรงสูง',sopKMine:'ของฉันที่เกินกำหนด',sopKGone:'เงื่อนไขหายแล้ว',
 sopFOpen:'เปิด / รับทราบ',sopFAll:'ทั้งหมด',sopFClosed:'ปิดแล้ว',sopFMine:'เฉพาะของฉัน',sopFAllTypes:'ทุกประเภท',sopFAllSev:'ทุกความรุนแรง',
 sopColId:'เลขที่',sopColType:'ประเภท',sopColWhat:'SKU / คู่ค้า',sopColSev:'ความรุนแรง',sopColOwner:'เจ้าของ',sopColDue:'ครบกำหนด',sopColStatus:'สถานะ',
 sopS_open:'เปิด',sopS_ack:'รับทราบ',sopS_done:'ทำแล้ว',sopS_dropped:'ไม่ทำ',sopSev_high:'สูง',sopSev_medium:'กลาง',sopSev_low:'ต่ำ',
 sopT_ew_wos:'WOS สูง (ฝากขาย)',sopT_ew_rgap:'ไม่ได้เติมของ (ฝากขาย)',sopT_ew_instock:'In-stock ต่ำ (ฝากขาย)',sopT_ew_dist:'Distribution gap',sopT_ew_swing:'WOS แกว่ง',sopT_ew_accum:'ของสะสมที่คู่ค้า',
 sopT_stockout:'เสี่ยงขาด',sopT_reorder:'ต้องสั่งผลิต',sopT_expiry:'เสี่ยงหมดอายุ',sopT_data:'ข้อมูล Sales Out ค้าง',sopT_proposal:'ข้อเสนอรออนุมัติ',sopT_manual:'จากที่ประชุม',
 sopAck:'รับทราบ',sopDone:'ทำแล้ว',sopDrop:'ไม่ทำ',sopGone:'เงื่อนไขหายแล้ว — ยืนยันปิด',sopGonePill:'เงื่อนไขหายแล้ว',sopOpenBtn:'เปิด',sopAdd:'เพิ่ม Action',sopSave:'บันทึก',sopAddNote:'เพิ่มบันทึก',
 sopReason:'เหตุผล (บังคับเมื่อไม่ทำ)',sopNoteL:'บันทึก',sopTitleL:'เรื่อง',sopGoPage:'ไปหน้าที่เกี่ยวข้อง',sopHistory:'ประวัติ',sopCreated:'สร้างเมื่อ',sopValue:'ค่าตอนแจ้ง',sopSource:'ที่มา',sopAuto:'อัตโนมัติ',sopManual:'เพิ่มเอง',
 sopNoRight:'บัญชีนี้ไม่ใช่เจ้าของรายการ',sopBadFlow:'เปลี่ยนสถานะแบบนี้ไม่ได้',sopNeedReason:'ต้องระบุเหตุผลเมื่อเลือกไม่ทำ',sopNeedTitle:'ต้องระบุเรื่อง',sopBadAcc:'คู่ค้านอกฝ่ายของบัญชีนี้',sopBadSku:'ไม่มี SKU นี้',
 sopActionEvent:'Action log: เปลี่ยนสถานะ',sopAutoEvent:'Action log: สร้างอัตโนมัติ',sopAddEvent:'Action log: เพิ่มเอง',sopNoteEvent:'Action log: บันทึก',sopCloseEvent:'ปิดรอบแผน (Snapshot)',sopLockEvent:'แก้ Quota เดือนถัดไปหลังวันปิดรับแก้แผน',
 sopAutoRef:'{n} รายการใหม่ · AS OF {w}',sopNone:'ไม่มีรายการ',sopCount:'{n} รายการ',
 sopClose:'ปิดรอบแผน',sopCloseNote:'บันทึก: AS OF · Projection ต่อ SKU 6 เดือน · Stockout Date · Quota ต่อคู่ (เดือนนี้ + 3 เดือน) · PO เปิด · ข้อเสนอ · ตั้งค่าที่ใช้ · เก็บล่าสุด {n} รอบ',sopClosed:'ปิดรอบแผนแล้ว: {id}',sopCapDrop:'เก็บได้ {n} รอบ — ลบรอบเก่าสุด {d} รอบ',
 sopSnapList:'Snapshot ที่บันทึก',sopSnapNone:'ยังไม่ได้ปิดรอบแผน',sopColCycle:'รอบ',sopColClosed:'ปิดเมื่อ',sopColBy:'โดย',sopColQuota:'Quota (คู่ × เดือน)',sopColPo:'PO เปิด',sopColProp:'ข้อเสนอ',sopColOpenAct:'Action เปิด',sopExport:'Export JSON',
 sopCompare:'เทียบรอบ',sopThis:'รอบนี้',sopPrev:'รอบก่อน',sopCmpSo:'Stockout Date เปลี่ยนเกิน {d} วัน',sopCmpQuota:'Quota ที่เปลี่ยน',sopCmpPo:'PO ที่เลื่อน / เพิ่ม / ไม่อยู่ในแผน',sopNeedTwo:'ต้องมีอย่างน้อย 2 รอบจึงเทียบได้',
 sopPo_moved:'เลื่อน',sopPo_added:'เพิ่ม',sopPo_gone:'ไม่อยู่ในแผนแล้ว',sopColFrom:'รอบก่อน',sopColTo:'รอบนี้',sopColDiff:'ต่าง',sopColMonth:'เดือน',sopNoChange:'ไม่มีการเปลี่ยน',sopNever:'ไม่ขาด',
 sopLock:'วันปิดรับแก้แผน: วันที่ {d} ของทุกเดือน',sopLockAfter:'เลยวันปิดรับแก้แผนแล้ว — การแก้ Quota เดือน {m} จะมีคำเตือนและบันทึกในประวัติ',sopLockBefore:'แก้ Quota เดือน {m} ได้ถึงวันที่ {d}',
 sopLockWarn:'เลยวันปิดรับแก้แผน (วันที่ {d}) — Quota เดือน {m} เปลี่ยนแล้ว แจ้ง Planner และบันทึกใน Action log',sopLockTag:'หลังวันปิดรับแก้แผน',b4MyOverdue:'Action ของฉันที่เกินกำหนด',sopOwnerAny:'—'});
Object.assign(dict.en,{supSop:'S&OP cycle · action log',sopIntro:'The monthly decision cycle — action log (exception queue) and plan snapshots · actions never close by themselves · Supply Planning stays read-only',
 sopTabActions:'Action log',sopTabSnaps:'Plan snapshots',sopKOpen:'Open',sopKOverdue:'Overdue',sopKHigh:'High severity',sopKMine:'My overdue',sopKGone:'Condition gone',
 sopFOpen:'Open / acknowledged',sopFAll:'All',sopFClosed:'Closed',sopFMine:'Mine only',sopFAllTypes:'All types',sopFAllSev:'All severities',
 sopColId:'No.',sopColType:'Type',sopColWhat:'SKU / account',sopColSev:'Severity',sopColOwner:'Owner',sopColDue:'Due',sopColStatus:'Status',
 sopS_open:'Open',sopS_ack:'Acknowledged',sopS_done:'Done',sopS_dropped:'Not done',sopSev_high:'High',sopSev_medium:'Medium',sopSev_low:'Low',
 sopT_ew_wos:'High WOS (consignment)',sopT_ew_rgap:'Not replenished (consignment)',sopT_ew_instock:'Low in-stock (consignment)',sopT_ew_dist:'Distribution gap',sopT_ew_swing:'WOS swing',sopT_ew_accum:'Piling up at the account',
 sopT_stockout:'Stockout risk',sopT_reorder:'Reorder now',sopT_expiry:'Expiry risk',sopT_data:'Sales Out data stale',sopT_proposal:'Proposal waiting approval',sopT_manual:'From the meeting',
 sopAck:'Acknowledge',sopDone:'Done',sopDrop:'Not done',sopGone:'Condition gone — confirm close',sopGonePill:'Condition gone',sopOpenBtn:'Open',sopAdd:'Add action',sopSave:'Save',sopAddNote:'Add note',
 sopReason:'Reason (required for not done)',sopNoteL:'Note',sopTitleL:'Subject',sopGoPage:'Go to the page',sopHistory:'History',sopCreated:'Created',sopValue:'Value when raised',sopSource:'Source',sopAuto:'Automatic',sopManual:'Added by hand',
 sopNoRight:'This account is not the owner of the item',sopBadFlow:'That status change is not allowed',sopNeedReason:'A reason is required for not done',sopNeedTitle:'A subject is required',sopBadAcc:'The account is outside this department',sopBadSku:'No such SKU',
 sopActionEvent:'Action log: status changed',sopAutoEvent:'Action log: raised automatically',sopAddEvent:'Action log: added by hand',sopNoteEvent:'Action log: note',sopCloseEvent:'Plan cycle closed (snapshot)',sopLockEvent:'Next-month quota changed after the plan lock day',
 sopAutoRef:'{n} new · AS OF {w}',sopNone:'No items',sopCount:'{n} items',
 sopClose:'Close the plan cycle',sopCloseNote:'Keeps: AS OF · projection per SKU for 6 months · Stockout Date · quota per pair (this month + 3) · open POs · proposals · the settings used · the latest {n} cycles',sopClosed:'Plan cycle closed: {id}',sopCapDrop:'Keeps {n} cycles — the oldest {d} removed',
 sopSnapList:'Saved snapshots',sopSnapNone:'No plan cycle closed yet',sopColCycle:'Cycle',sopColClosed:'Closed',sopColBy:'By',sopColQuota:'Quota (pair × month)',sopColPo:'Open POs',sopColProp:'Proposals',sopColOpenAct:'Open actions',sopExport:'Export JSON',
 sopCompare:'Compare cycles',sopThis:'This cycle',sopPrev:'Previous cycle',sopCmpSo:'Stockout Date moved more than {d} days',sopCmpQuota:'Quota changed',sopCmpPo:'PO moved / added / no longer in the plan',sopNeedTwo:'At least 2 cycles are needed to compare',
 sopPo_moved:'Moved',sopPo_added:'Added',sopPo_gone:'No longer in the plan',sopColFrom:'Previous',sopColTo:'This cycle',sopColDiff:'Diff',sopColMonth:'Month',sopNoChange:'No change',sopNever:'No stockout',
 sopLock:'Plan lock day: the {d}th of every month',sopLockAfter:'Past the plan lock day — a change to the {m} quota gets a warning and is logged',sopLockBefore:'The {m} quota can change until the {d}th',
 sopLockWarn:'Past the plan lock day (the {d}th) — the {m} quota changed: tell the Planner and log it in the action log',sopLockTag:'after the plan lock day',b4MyOverdue:'My overdue actions',sopOwnerAny:'—'});

/* ---------------------------------------------------------------- permissions (7.2 mechanism) · menu · page gate */
Object.assign(fuActions,{'supply.sop.close':['ปิดรอบแผน S&OP (Snapshot)','Close the S&OP plan cycle (snapshot)'],'supply.action':['ทำงานใน Action log','Work the action log']});
SUP_RULES['supply.sop.close']={ceil:p=>['director','planner'].includes(p.role),def:p=>['director','planner'].includes(p.role)};
SUP_RULES['supply.action']={ceil:p=>['director','planner','manager'].includes(p.role),def:p=>['director','planner','manager'].includes(p.role)};
SUP_ICON.supSop='⚑';if(!SUP_PLAN.includes('supSop'))SUP_PLAN.push('supSop');   // the menu builds its Supply buttons from SUP_PLAN
['director','manager','planner'].forEach(r=>{if(!SUP_ROLE_PAGES[r].includes('supSop'))SUP_ROLE_PAGES[r].push('supSop')});
(SUP_NAV_GROUPS.find(g=>g[0]==='supplan')||[,,[]])[2].push('supSop');
const sopCanVisitBefore=supCanVisit;supCanVisit=function(v){if(v==='supSop')return Supply.isView(v)&&supPages().includes(v)&&fuCan('supply.view');return sopCanVisitBefore(v)};

/* ---------------------------------------------------------------- storage */
const SOP_CAP=2000,SOP_SNAP_CAP=12,SOP_KEY='sop_snapshots',SOP_DUE={high:3,medium:7,low:14};
function sopActs(){db.sopActions||=[];return db.sopActions}
let sopSnaps=[];
Supply.sopReady=(async()=>{try{const all=await Data.Store.all(),v=all[SOP_KEY];if(Array.isArray(v))sopSnaps=v}catch(e){}})();
async function sopSnapSave(){try{await Data.Store.put(SOP_KEY,sopSnaps)}catch(e){toast(St('set_no_store'))}}
// "Reset to Mock" clears the imported tables only — the plan history stays · a fresh demo dataset starts without snapshots
const sopClearBefore=Data.Store.clear;Data.Store.clear=async function(){const keep=sopSnaps.slice(),r=await sopClearBefore.apply(this,arguments);if(keep.length){try{await Data.Store.put(SOP_KEY,keep)}catch(e){}}return r};
const sopResetBefore=supResetDataset;supResetDataset=async function(ds){try{await Data.Store.del(SOP_KEY)}catch(e){}sopSnaps=[];return sopResetBefore(ds)};
Supply.sopStats=()=>({snaps:sopSnaps.length,snapCap:SOP_SNAP_CAP,acts:sopActs().length,actCap:SOP_CAP});

/* ---------------------------------------------------------------- who sees / works what (NOLEAK: a Manager sees the own department; Director / Planner see all) */
const sopMgr=ch=>ch?'mgr-'+({MT:'mt',TT:'tt',ECOM:'ecom'}[ch]||String(ch).toLowerCase()):'';
function sopSeesAll(){return['director','planner'].includes(session?.role)}
function sopMine(a){const k=fuKey();return !!k&&(a.owner===k||a.coOwner===k)}
function sopVisible(a){if(!session||!fuCan('supply.view'))return false;if(sopSeesAll())return true;const lock=supLockChannel();return(!!lock&&lock!=='—'&&a.ch===lock)||sopMine(a)}
function sopCanWork(a){return sopVisible(a)&&fuCan('supply.action')&&(sopSeesAll()||sopMine(a))}
/** A7 default owners: consignment / quota / data → the department Manager · PO / stockout / reorder → Planner · expiry → Planner + Manager */
function sopOwner(type,ch){if(['stockout','reorder'].includes(type))return{owner:'planner'};if(type==='expiry')return{owner:'planner',coOwner:sopMgr(ch)};return{owner:sopMgr(ch)||'planner'}}
const sopName=id=>!id?'':(fuProfiles.find(x=>x.id===id)?.name||id);
const sopLink={supConsign:'supConsign',supStock:'supStock',supReplen:'supReplen',supExpiry:'supExpiry',supIntake:'supIntake',supProposals:'supProposals'};

/* ---------------------------------------------------------------- the conditions behind the automatic actions (every account, the latest AS OF) */
function sopConditions(){
 const A=Supply.App,DB=A.DB,S=A.S,as=Supply.defaultAsOf();
 const M=Calc.computeModel(DB,{asDn:as,view:'W',ch:[],acc:[],brand:[],cat:[],q:'',rr:S.rrBasis||'L4W',h:3},S,{});
 const E=Calc.earlyWarnOf(DB,M.rows,as,M.mask,S),out=[];
 for(const a of E.alerts)out.push({key:'ew|'+a.key,type:'ew_'+a.type,sev:a.sev,sku:a.sku,acc:a.accId,ch:DB.accounts[a.j].channel,link:'supConsign',val:a.val,thr:a.thr});
 for(const r of M.rows){
  if(r.status==='stockout')out.push({key:'stockout|'+r.sku,type:'stockout',sev:'high',sku:r.sku,acc:'',ch:'',link:'supStock',val:r.stockoutDn});
  else if(r.status==='reorder')out.push({key:'reorder|'+r.sku,type:'reorder',sev:'medium',sku:r.sku,acc:'',ch:'',link:'supReplen',val:r.orderByDn});
  if(r.expiry){let best=-1,bv=0;for(const L of r.lots)if(L.j>=0&&L.atRiskValue>bv){bv=L.atRiskValue;best=L.j}
   out.push({key:'expiry|'+r.sku,type:'expiry',sev:'medium',sku:r.sku,acc:best>=0?DB.accounts[best].account_id:'',ch:best>=0?DB.accounts[best].channel:'',link:'supExpiry',val:Math.round(r.riskValH||0)})}
 }
 for(const a of DB.accounts)if(a.is_consignment){const s=Calc.staleWeeks(DB,a.j,as);if(s>(S.staleW??2))out.push({key:'data|'+a.account_id,type:'data',sev:'medium',sku:'',acc:a.account_id,ch:a.channel,link:'supIntake',val:s})}
 for(const p of props())if(p.status==='submitted'){const ch=p.account?(DB.accounts.find(x=>x.account_id===p.account)?.channel||''):'';out.push({key:'prop|'+p.id,type:'proposal',sev:'medium',sku:p.sku,acc:p.account||'',ch,link:'supProposals',owner:p.owner,ref:p.id})}
 return{as,list:out}}

/* ---------------------------------------------------------------- sync: one open item per key · never closed by the system (condition gone → flag) */
let sopSyncKey='',sopSeqN=0;
const sopId=()=>'ACT-'+Date.now().toString(36).toUpperCase()+'-'+(++sopSeqN).toString(36).toUpperCase();
function sopSync(force){
 if(!session||!supReady())return false;
 const A=Supply.App,key=[A.feedKey,JSON.stringify(A.S),props().map(p=>p.id+':'+p.status).join(','),dateKey(Date.now())].join('|');
 if(!force&&key===sopSyncKey)return false;sopSyncKey=key;
 const{as,list}=sopConditions(),wk=Calc.iso(as),now=Date.now(),L=sopActs(),live=new Set(list.map(c=>c.key));let added=0,changed=0;
 for(const c of list){
  const open=L.find(a=>a.key===c.key&&(a.status==='open'||a.status==='ack'));
  if(open){if(open.condGone){open.condGone=false;changed++}if(open.lastSeen!==wk){open.lastSeen=wk;changed++}continue}
  if(L.some(a=>a.key===c.key&&a.closedWeek===wk))continue;   // closed this AS OF week → raised again from the next week if it is still true
  const o=c.owner?{owner:c.owner}:sopOwner(c.type,c.ch);
  L.unshift({id:sopId(),key:c.key,source:'auto',type:c.type,sev:c.sev,sku:c.sku,acc:c.acc,ch:c.ch,owner:o.owner,coOwner:o.coOwner||'',due:now+SOP_DUE[c.sev]*864e5,status:'open',link:c.link,ref:c.ref||'',
   val:c.val??null,thr:c.thr??null,week:wk,lastSeen:wk,created:now,createdBy:'system',updated:now,notes:[],history:[{at:now,by:'system',action:'open'}],condGone:false});added++}
 for(const a of L)if(a.source==='auto'&&(a.status==='open'||a.status==='ack')&&!live.has(a.key)&&!a.condGone){a.condGone=true;changed++}
 const trimmed=sopTrim();
 if(added)opsAudit('sopAutoEvent',tp('sopAutoRef',{n:added,w:wk}),[]);
 if(added||changed||trimmed)persist();return true}
/** 2,000 at most: the oldest closed items go first */
function sopTrim(){const L=sopActs();if(L.length<=SOP_CAP)return 0;const closed=L.filter(a=>a.status==='done'||a.status==='dropped').sort((a,b)=>a.updated-b.updated);let n=0;
 while(L.length>SOP_CAP&&closed.length){const x=closed.shift();L.splice(L.indexOf(x),1);n++}while(L.length>SOP_CAP){L.pop();n++}return n}

/* ---------------------------------------------------------------- work an item */
const SOP_FLOW={open:['ack','done','dropped'],ack:['done','dropped']};
function sopAct(id,to,reason){const a=sopActs().find(x=>x.id===id);if(!a||!sopVisible(a))return{ok:false,error:'denied'};if(!sopCanWork(a))return{ok:false,error:'sopNoRight'};if(opsCheck())return opsResult(opsCheck());
 if(!(SOP_FLOW[a.status]||[]).includes(to))return{ok:false,error:'sopBadFlow'};reason=String(reason||'').trim();if(to==='dropped'&&!reason)return{ok:false,error:'sopNeedReason'};
 const from=a.status,now=Date.now();a.status=to;a.updated=now;if(to==='done'||to==='dropped'){a.closedAt=now;a.closedWeek=Calc.iso(Supply.defaultAsOf());if(reason)a.reason=reason}
 a.history.push({at:now,by:stockActorName(),byId:stockActorId(),action:to,reason,gone:!!a.condGone});
 opsAudit('sopActionEvent',a.id+' · '+t('sopT_'+a.type)+' · '+[a.sku,a.acc].filter(Boolean).join(' · ')+' · '+from+' → '+to,a.acc?[a.acc]:[],{status:from},{status:to,reason:reason||null});persist();return{ok:true}}
function sopNote(id,text){const a=sopActs().find(x=>x.id===id);text=String(text||'').trim();if(!a||!sopVisible(a))return{ok:false,error:'denied'};if(!text)return{ok:true};if(!sopCanWork(a))return{ok:false,error:'sopNoRight'};if(opsCheck())return opsResult(opsCheck());
 a.notes.push({at:Date.now(),by:stockActorName(),byId:stockActorId(),text:text.slice(0,500)});a.updated=Date.now();opsAudit('sopNoteEvent',a.id,a.acc?[a.acc]:[]);persist();return{ok:true}}
/** an item added in the meeting — a Manager only for the own department */
function sopAdd(v){if(!fuCan('supply.action'))return{ok:false,error:'denied'};if(opsCheck())return opsResult(opsCheck());
 const title=String(v.title||'').trim(),DB=Supply.App.DB;if(!title)return{ok:false,error:'sopNeedTitle'};
 const sku=String(v.sku||'').trim();if(sku&&!DB.skuIdx.has(sku))return{ok:false,error:'sopBadSku'};
 const acc=String(v.acc||'').trim(),a=acc?DB.accounts.find(x=>x.account_id===acc):null,lock=supLockChannel(),own=!sopSeesAll();
 if(acc&&!a)return{ok:false,error:'sopBadAcc'};if(own&&a&&a.channel!==lock)return{ok:false,error:'sopBadAcc'};
 const ch=a?a.channel:(own?lock:''),sev=['high','medium','low'].includes(v.sev)?v.sev:'medium',owner=String(v.owner||'')||sopOwner('manual',ch).owner;
 if(own&&![fuKey(),'planner'].includes(owner))return{ok:false,error:'denied'};
 const now=Date.now(),due=Date.parse((v.due||dateKey(now+SOP_DUE[sev]*864e5))+'T17:00:00+07:00');
 const x={id:sopId(),key:null,source:'manual',type:'manual',title:title.slice(0,200),sev,sku,acc,ch,owner,coOwner:'',due,status:'open',link:sku?'supStock':acc&&a.is_consignment?'supConsign':'',ref:'',val:null,thr:null,
  week:Calc.iso(Supply.defaultAsOf()),created:now,createdBy:stockActorName(),updated:now,notes:[],history:[{at:now,by:stockActorName(),byId:stockActorId(),action:'open'}],condGone:false};
 sopActs().unshift(x);sopTrim();opsAudit('sopAddEvent',x.id+' · '+x.title,acc?[acc]:[]);persist();return{ok:true,id:x.id}}

/* ---------------------------------------------------------------- plan snapshots */
function sopLockInfo(){const S=Supply.App.S||{},day=Math.max(1,Math.min(28,+S.planLockDay||20)),now=dateKey(Date.now()),d=+now.slice(8,10),m0=Calc.monthStart(Calc.dn(now));return{day,after:d>day,next:Calc.monthKey(Calc.addMonths(m0,1))}}
async function sopClose(){if(!fuCan('supply.sop.close'))return{ok:false,error:'denied'};if(opsCheck())return opsResult(opsCheck());if(!supReady())await Supply.ensureData();   // an Ops write moves the feed key → wait for the rebuild
 const A=Supply.App,as=Supply.defaultAsOf(),M=Calc.computeModel(A.DB,{asDn:as,view:'W',ch:[],acc:[],brand:[],cat:[],q:'',rr:A.S.rrBasis||'L4W',h:3},A.S,{});
 sopSync(true);
 const label=Calc.monthKey(as),seq=sopSnaps.filter(s=>s.label===label).length+1,now=Date.now();
 const snap=Object.assign(Calc.planSnapshotOf(A.DB,M),{id:'SOP-'+label+'-'+String(seq).padStart(2,'0'),label,closedAt:now,by:stockActorName(),byId:stockActorId(),settings:JSON.parse(JSON.stringify(A.S)),
  proposals:props().filter(p=>['draft','submitted','approved'].includes(p.status)).map(p=>({id:p.id,type:p.type,sku:p.sku,account:p.account||'',period:p.period,qty:p.qty,status:p.status})),
  actionsOpen:sopActs().filter(a=>a.status==='open'||a.status==='ack').map(a=>a.id)});
 sopSnaps.unshift(snap);let dropped=0;while(sopSnaps.length>SOP_SNAP_CAP){sopSnaps.pop();dropped++}
 await sopSnapSave();opsAudit('sopCloseEvent',snap.id+' · AS OF '+Calc.iso(as)+(dropped?' · −'+dropped:''),[]);persist();return{ok:true,snap,dropped}}

/* ---------------------------------------------------------------- the page */
let sopTab='actions',sopF={status:'open',type:'',sev:'',mine:false},sopCmpA=0,sopCmpB=1;
const sopSevPill=s=>`<span class="pill ${s==='high'?'bad':s==='medium'?'warn':''}">${t('sopSev_'+s)}</span>`;
const sopStPill=a=>`<span class="pill ${a.status==='done'?'ok':a.status==='dropped'?'':a.status==='ack'?'warn':'bad'}">${t('sopS_'+a.status)}</span>${a.condGone&&(a.status==='open'||a.status==='ack')?` <span class="pill ok">${t('sopGonePill')}</span>`:''}`;
function sopWhat(a){const DB=Supply.App.DB,acc=a.acc?(DB.accounts.find(x=>x.account_id===a.acc)?.name||a.acc):'';return [a.sku,acc].filter(Boolean).join(' · ')||'—'}
function sopValTxt(a){if(a.val==null)return'';const v=a.val;switch(a.type){case'ew_wos':return(isFinite(v)?n(Math.round(v*10)/10):'∞')+' wk';case'ew_rgap':return(isFinite(v)?n(v):'∞')+(lang==='th'?' วัน':' days');case'ew_instock':return Math.round(v)+'%';case'ew_swing':return(v>0?'+':'')+n(Math.round(v*10)/10)+' wk';case'ew_accum':return(v==null?'∞':n(Math.round(v*10)/10))+' wk';case'stockout':case'reorder':return v?actDate(v):'';case'expiry':return'฿'+n(v);case'data':return n(v)+' wk';default:return''}}
function sopRowBtns(a){if(!sopCanWork(a))return'';const b=[];if(a.status==='open')b.push(`<button data-sop-act="ack" data-sop="${a.id}">${t('sopAck')}</button>`);if(a.status==='open'||a.status==='ack'){b.push(`<button class="${a.condGone?'primary':''}" data-sop-act="done" data-sop="${a.id}">${a.condGone?t('sopGone'):t('sopDone')}</button>`);b.push(`<button class="quiet" data-sop-open="${a.id}" data-sop-drop="1">${t('sopDrop')}</button>`)}return b.join(' ')}
function supSopPage(){
 const App=Supply.App;if(!App.DB){Supply.ensureData().then(()=>{if(view==='supSop')render()});return`<section class="panel"><div class="panelbody">…</div></section>`}
 if(supReady())sopSync();else Supply.ensureData().then(()=>{if(view==='supSop'&&supReady()&&sopSync())render()});   // after an Ops write: draw now, sync once the data is rebuilt
 const L=sopActs().filter(sopVisible),now=Date.now(),isOpen=a=>a.status==='open'||a.status==='ack',op=L.filter(isOpen);
 const k=[['sopKOpen',op.length,''],['sopKOverdue',op.filter(a=>a.due<now).length,'bad'],['sopKHigh',op.filter(a=>a.sev==='high').length,''],['sopKMine',op.filter(a=>sopMine(a)&&a.due<now).length,''],['sopKGone',op.filter(a=>a.condGone).length,'']];
 const lk=sopLockInfo();
 let html=`<div class="banner"><span>⚑ &nbsp; ${t('sopIntro')}</span><span>${tp('sopLock',{d:lk.day})} · ${lk.after?tp('sopLockAfter',{m:lk.next}):tp('sopLockBefore',{m:lk.next,d:lk.day})}</span></div>
  <div class="orderTabs">${[['actions','sopTabActions'],['snaps','sopTabSnaps']].map(([x,l])=>`<button data-sop-tab="${x}" class="${sopTab===x?'selected':''}">${t(l)}</button>`).join('')}</div>`;
 if(sopTab==='snaps')return html+sopSnapsHTML();
 html+=`<div class="kpis sop-kpis">${k.map(([l,v,c])=>`<div class="kpi"><small>${t(l)}</small><strong class="${v&&c?c:''}">${n(v)}</strong></div>`).join('')}</div>`;
 const types=[...new Set(L.map(a=>a.type))];
 let rows=L.filter(a=>sopF.status==='all'||(sopF.status==='open'?isOpen(a):!isOpen(a)));if(sopF.type)rows=rows.filter(a=>a.type===sopF.type);if(sopF.sev)rows=rows.filter(a=>a.sev===sopF.sev);if(sopF.mine)rows=rows.filter(sopMine);
 const SEV={high:0,medium:1,low:2};rows.sort((a,b)=>(isOpen(b)-isOpen(a))||(SEV[a.sev]-SEV[b.sev])||(a.due-b.due));
 html+=`<section class="panel" id="sopActions"><div class="panelhead"><h2>${t('sopTabActions')}</h2><div class="between sop-tools">
   <select id="sopStatus">${[['open','sopFOpen'],['closed','sopFClosed'],['all','sopFAll']].map(([v,l])=>`<option value="${v}" ${sopF.status===v?'selected':''}>${t(l)}</option>`).join('')}</select>
   <select id="sopType"><option value="">${t('sopFAllTypes')}</option>${types.map(x=>`<option value="${x}" ${sopF.type===x?'selected':''}>${t('sopT_'+x)}</option>`).join('')}</select>
   <select id="sopSev"><option value="">${t('sopFAllSev')}</option>${['high','medium','low'].map(x=>`<option value="${x}" ${sopF.sev===x?'selected':''}>${t('sopSev_'+x)}</option>`).join('')}</select>
   <label class="check"><input type="checkbox" id="sopMine" ${sopF.mine?'checked':''}> ${t('sopFMine')}</label>
   ${fuCan('supply.action')?`<button class="primary" data-sop-add="1">${t('sopAdd')}</button>`:''}</div></div>
  ${rows.length?opsTable([t('sopColId'),t('sopColType'),t('sopColWhat'),t('sopColSev'),t('sopColOwner'),t('sopColDue'),t('sopColStatus'),t('actions')],rows.map(a=>`<tr data-sop-row="${a.id}"><td><button class="linkish" data-sop-open="${a.id}"><b>${esc(a.id)}</b></button><small>${a.source==='auto'?t('sopAuto'):t('sopManual')} · ${esc(dateKey(a.created))}</small></td>
   <td>${esc(a.type==='manual'?a.title:t('sopT_'+a.type))}${a.type==='manual'?`<small>${t('sopT_manual')}</small>`:sopValTxt(a)?`<small>${esc(sopValTxt(a))}</small>`:''}</td><td>${esc(sopWhat(a))}</td><td>${sopSevPill(a.sev)}</td>
   <td>${esc(sopName(a.owner))}${a.coOwner?`<small>+ ${esc(sopName(a.coOwner))}</small>`:''}</td><td class="${isOpen(a)&&a.due<now?'late':''}">${esc(dateKey(a.due))}</td><td>${sopStPill(a)}</td><td>${sopRowBtns(a)}</td></tr>`)):`<div class="empty">${t('sopNone')}</div>`}</section>`;
 return html}
function sopSnapsHTML(){
 const can=fuCan('supply.sop.close'),lock=supLockChannel(),own=lock&&lock!=='—'?new Set(Supply.App.DB.accounts.filter(a=>a.channel===lock).map(a=>a.account_id)):null;
 let html=`<section class="panel" id="sopSnaps"><div class="panelhead"><h2>${t('sopSnapList')}</h2>${can?`<button class="primary" data-sop-close="1">${t('sopClose')}</button>`:''}</div><div class="panelbody"><p class="muted small">${tp('sopCloseNote',{n:SOP_SNAP_CAP})}</p></div>
  ${sopSnaps.length?opsTable([t('sopColCycle'),'AS OF',t('sopColClosed'),t('sopColBy'),'SKU',t('sopColQuota'),t('sopColPo'),t('sopColProp'),t('sopColOpenAct'),''],sopSnaps.map(s=>`<tr><td><b>${esc(s.id)}</b></td><td>${actDate(s.asOf)}</td><td>${esc(ecomTime(s.closedAt))}</td><td>${esc(s.by)}</td><td>${n(s.skus.length)}</td><td>${n(Object.keys(s.quota).length)}</td><td>${n(Object.keys(s.po).length)}</td><td>${n(s.proposals.length)}</td><td>${n(s.actionsOpen.length)}</td><td>${can?`<button class="quiet" data-sop-export="${esc(s.id)}">${t('sopExport')}</button>`:''}</td></tr>`)):`<div class="empty">${t('sopSnapNone')}</div>`}</section>`;
 if(sopSnaps.length<2)return html+`<section class="panel"><div class="panelbody"><p class="muted">${t('sopNeedTwo')}</p></div></section>`;
 sopCmpA=Math.min(sopCmpA,sopSnaps.length-1);sopCmpB=Math.min(sopCmpB,sopSnaps.length-1);if(sopCmpA===sopCmpB)sopCmpB=sopCmpA===0?1:0;
 const A=sopSnaps[sopCmpA],B=sopSnaps[sopCmpB],days=+(Supply.App.S.sopMoveDays||14),C=Calc.comparePlans(A,B,days);
 const quota=own?C.quota.filter(q=>own.has(q.acc)):C.quota,accName=id=>Supply.App.DB.accounts.find(a=>a.account_id===id)?.name||id;   // NOLEAK: own department's quota only
 const sel=(id,cur)=>`<select id="${id}">${sopSnaps.map((s,i)=>`<option value="${i}" ${i===cur?'selected':''}>${esc(s.id)} · ${actDate(s.asOf)}</option>`).join('')}</select>`;
 const dd=x=>x==null?'—':(x>0?'+':'')+n(x);
 html+=`<section class="panel" id="sopCompare"><div class="panelhead"><h2>${t('sopCompare')}</h2><div class="between sop-tools"><label>${t('sopThis')} ${sel('sopA',sopCmpA)}</label><label>${t('sopPrev')} ${sel('sopB',sopCmpB)}</label></div></div>
  <div class="panelbody"><h3>${tp('sopCmpSo',{d:days})} <span class="pill">${n(C.so.length)}</span></h3></div>${C.so.length?opsTable(['SKU',t('sopColFrom'),t('sopColTo'),t('sopColDiff')],C.so.slice(0,50).map(x=>`<tr><td><button class="linkish" data-sup-sku="${esc(x.sku)}">${esc(x.sku)}</button></td><td>${x.from==null?t('sopNever'):actDate(x.from)}<small>${esc(St('st_'+x.stFrom))}</small></td><td>${x.to==null?t('sopNever'):actDate(x.to)}<small>${esc(St('st_'+x.stTo))}</small></td><td class="${x.d!=null&&x.d<0?'late':''}">${x.d==null?'—':dd(x.d)+(lang==='th'?' วัน':' d')}</td></tr>`)):`<div class="panelbody"><p class="muted">${t('sopNoChange')}</p></div>`}
  <div class="panelbody"><h3>${t('sopCmpQuota')} <span class="pill">${n(quota.length)}</span></h3></div>${quota.length?opsTable(['SKU',t('partner'),t('sopColMonth'),t('sopColFrom'),t('sopColTo'),t('sopColDiff')],quota.slice(0,50).map(x=>`<tr><td>${esc(x.sku)}</td><td>${esc(accName(x.acc))}</td><td>${esc(x.month)}</td><td>${n(x.from)}</td><td>${n(x.to)}</td><td>${dd(x.to-x.from)}</td></tr>`)):`<div class="panelbody"><p class="muted">${t('sopNoChange')}</p></div>`}
  <div class="panelbody"><h3>${t('sopCmpPo')} <span class="pill">${n(C.po.length)}</span></h3></div>${C.po.length?opsTable(['PO','SKU',t('sopColType'),t('sopColFrom'),t('sopColTo'),t('sopColDiff')],C.po.slice(0,50).map(x=>`<tr><td><b>${esc(x.po)}</b></td><td>${esc(x.sku)}</td><td>${t('sopPo_'+x.kind)}</td><td>${x.from==null?'—':actDate(x.from)}${x.qtyFrom!=null&&x.qtyFrom!==x.qty?`<small>${n(x.qtyFrom)}</small>`:''}</td><td>${x.to==null?'—':actDate(x.to)}<small>${n(x.qty)}</small></td><td>${x.d==null?'—':dd(x.d)+(lang==='th'?' วัน':' d')}</td></tr>`)):`<div class="panelbody"><p class="muted">${t('sopNoChange')}</p></div>`}</section>`;
 return html}
function sopDetail(id,drop){const a=sopActs().find(x=>x.id===id);if(!a||!sopVisible(a))return;const can=sopCanWork(a),open=a.status==='open'||a.status==='ack',time=x=>new Date(x).toLocaleString(lang==='th'?'th-TH-u-ca-gregory':'en-GB',{timeZone:'Asia/Bangkok',hour12:false});
 const go=sopLink[a.link]&&workCanVisit(a.link)?`<button type="button" data-sop-go="${a.link}" data-sop-sku="${esc(a.sku||'')}">${t('sopGoPage')} ↗</button>`:'';
 showModal(`<form class="dialogbody" id="sopForm"><div class="between"><div><div class="eyebrow">${t('supSop').toUpperCase()}</div><h2>${esc(a.id)} · ${esc(a.type==='manual'?a.title:t('sopT_'+a.type))}</h2></div><button type="button" data-close>×</button></div>
  ${opsTable([t('detail'),''],[[t('sopColStatus'),sopStPill(a)],[t('sopColSev'),sopSevPill(a.sev)],[t('sopColWhat'),esc(sopWhat(a))],[t('sopValue'),esc(sopValTxt(a)||'—')],[t('sopColOwner'),esc(sopName(a.owner))+(a.coOwner?' + '+esc(sopName(a.coOwner)):'')],[t('sopColDue'),esc(dateKey(a.due))],[t('sopSource'),a.source==='auto'?t('sopAuto'):t('sopManual')+' · '+esc(a.createdBy)],[t('sopCreated'),esc(time(a.created))],...(a.reason?[[t('sopReason'),esc(a.reason)]]:[])].map(([x,y])=>`<tr><td>${x}</td><td>${y}</td></tr>`))}
  ${can?`<div class="formgrid"><label class="full">${t('sopNoteL')}<input name="note" maxlength="500"></label>${open?`<label class="full">${t('sopReason')}<input name="reason" maxlength="200" ${drop?'autofocus':''}></label>`:''}</div>`:''}
  <b class="small">${t('sopHistory')}</b><ul class="small">${a.history.map(h=>`<li>${esc(time(h.at))} · ${esc(h.by)} · ${esc(t('sopS_'+h.action)||h.action)}${h.reason?' · '+esc(h.reason):''}${h.gone?' · '+t('sopGonePill'):''}</li>`).join('')}${a.notes.map(x=>`<li>📝 ${esc(time(x.at))} · ${esc(x.by)} · ${esc(x.text)}</li>`).join('')}</ul>
  <div class="err" id="formError" role="alert"></div><div class="dialogactions"><button type="button" data-close>${t('close')}</button>${go}${can?`<button type="button" data-sop-note="${a.id}">${t('sopAddNote')}</button>`:''}
  ${can&&a.status==='open'?`<button type="button" data-sop-act="ack" data-sop="${a.id}">${t('sopAck')}</button>`:''}${can&&open?`<button type="button" data-sop-act="dropped" data-sop="${a.id}">${t('sopDrop')}</button><button type="button" class="primary" data-sop-act="done" data-sop="${a.id}">${a.condGone?t('sopGone'):t('sopDone')}</button>`:''}</div></form>`,'supply-sop');bindClose()}
function sopAddForm(){const DB=Supply.App.DB,lock=supLockChannel(),own=!sopSeesAll(),accs=DB.accounts.filter(a=>!own||a.channel===lock),owners=own?[fuKey(),'planner']:['planner','director','mgr-mt','mgr-tt','mgr-ecom'];
 showModal(`<form class="dialogbody" id="sopAddForm"><div class="between"><h2>${t('sopAdd')}</h2><button type="button" data-close>×</button></div><div class="formgrid">
  <label class="full">${t('sopTitleL')}<input name="title" maxlength="200" required></label>
  <label>SKU<input name="sku" list="sopSkuList" maxlength="40"><datalist id="sopSkuList">${DB.skus.map(s=>`<option value="${esc(s.sku)}">${esc(s.name)}</option>`).join('')}</datalist></label>
  <label>${t('partner')}<select name="acc"><option value="">—</option>${accs.map(a=>`<option value="${a.account_id}">${esc(a.name)}</option>`).join('')}</select></label>
  <label>${t('sopColSev')}<select name="sev">${['high','medium','low'].map(x=>`<option value="${x}" ${x==='medium'?'selected':''}>${t('sopSev_'+x)}</option>`).join('')}</select></label>
  <label>${t('sopColOwner')}<select name="owner">${owners.map(x=>`<option value="${x}">${esc(sopName(x))}</option>`).join('')}</select></label>
  <label>${t('sopColDue')}<input type="date" name="due" value="${dateKey(Date.now()+7*864e5)}"></label></div>
  <div class="err" id="formError" role="alert"></div><div class="dialogactions"><button type="button" data-close>${t('close')}</button><button type="button" class="primary" data-sop-save="1">${t('sopSave')}</button></div></form>`,'supply-sop');bindClose()}

/* ---------------------------------------------------------------- the plan lock day on next month's quota (B3 proposal · quota draft) */
const sopProposeBefore=supPropose;supPropose=function(v){const r=sopProposeBefore(v);
 if(r&&r.ok&&v&&v.type==='quota'){const L=sopLockInfo();if(L.after&&String(r.prop.period)===L.next){r.lockWarn=true;r.prop.lockWarn=true;r.prop.history.push({at:Date.now(),by:'system',action:t('sopLockTag')});opsAudit('sopLockEvent',r.prop.id+' · '+r.prop.sku+' · '+L.next,r.prop.account?[r.prop.account]:[]);persist();setTimeout(()=>toast(tp('sopLockWarn',{d:L.day,m:L.next})),1600)}}
 return r};
const sopDraftPanelBefore=supQuotaDraftPanel;supQuotaDraftPanel=function(){const html=sopDraftPanelBefore();const L=sopLockInfo();
 if(!html||!L.after||!db.allocations.some(a=>a.proposalId&&a.month===L.next&&['draft','submitted'].includes(a.status)))return html;
 return html.replace('<section class="panel">',`<section class="panel"><div class="banner warn sop-lock"><span>⚑ ${esc(tp('sopLockWarn',{d:L.day,m:L.next}))}</span></div>`)};
const sopDraftSendBefore=supQuotaDraftSend;supQuotaDraftSend=function(id){const a=db.allocations.find(x=>x.id===id),r=sopDraftSendBefore(id);const L=sopLockInfo();
 if(r&&r.ok!==false&&a&&L.after&&a.month===L.next){a.lockWarn=true;opsAudit('sopLockEvent',a.id+' · '+a.sku+' · '+L.next,[a.partner]);persist();setTimeout(()=>toast(tp('sopLockWarn',{d:L.day,m:L.next})),1600)}return r};

/* ---------------------------------------------------------------- B4: + my overdue actions · Supply Review: open actions + the latest cycle */
const sopB4Before=supAlertCard;supAlertCard=function(){const html=sopB4Before();if(!html||!html.includes('sup-b4-row')||!workCanVisit('supSop'))return html;sopSync();
 const now=Date.now(),mine=sopActs().filter(a=>(a.status==='open'||a.status==='ack')&&sopMine(a)&&a.due<now).length;
 return html.replace(/<\/div><\/section>$/,`<button type="button" class="sup-b4-item ${mine?'bad':''}" data-sop-mine="1"><small>${t('b4MyOverdue')}</small><b>${n(mine)}</b></button></div></section>`)};
Supply.sopInfo=function(M){if(!session)return null;sopSync();const now=Date.now(),L=sopActs().filter(sopVisible),open=L.filter(a=>a.status==='open'||a.status==='ack'),last=sopSnaps[0]||null;
 const prev=last?open.filter(a=>a.created<last.closedAt):[],row=a=>({id:a.id,type:a.type==='manual'?a.title:t('sopT_'+a.type),what:sopWhat(a),owner:sopName(a.owner)+(a.coOwner?' + '+sopName(a.coOwner):''),due:a.due,late:a.due<now,sev:a.sev,sevTxt:t('sopSev_'+a.sev),status:t('sopS_'+a.status),gone:!!a.condGone});
 const accs=typeof inAccounts==='function'?inAccounts():[],w1=Calc.monday(Calc.dn(dateKey(now))),missing=[];
 for(const a of accs)for(let k=1;k<=4;k++){const w=w1-7*k,st=inWeekStatus(a.account_id,w);if(st.k==='missing'||st.k==='late')missing.push({acc:a.name,week:w,k:st.k})}
 const byOpen=(a,b)=>({high:0,medium:1,low:2}[a.sev]-{high:0,medium:1,low:2}[b.sev])||a.due-b.due;
 return{open:open.length,overdue:open.filter(a=>a.due<now).length,high:open.filter(a=>a.sev==='high').length,gone:open.filter(a=>a.condGone).length,rows:open.slice().sort(byOpen).slice(0,10).map(row),
  prev:prev.length,prevRows:prev.slice().sort(byOpen).slice(0,8).map(row),last:last?{id:last.id,closedAt:last.closedAt,by:last.by,asOf:last.asOf}:null,lock:sopLockInfo(),missing,
  propWaiting:props().filter(p=>p.status==='submitted'&&propVisible(p)).length,labels:{open:t('sopKOpen'),overdue:t('sopKOverdue'),high:t('sopKHigh'),gone:t('sopKGone')}}};

/* ---------------------------------------------------------------- wiring */
const sopPageBefore=page;page=function(){if(view==='supSop')return supCanVisit(view)?supSopPage():`<section class="panel"><div class="empty">${t('workDenied')}</div></section>`;return sopPageBefore()};
const sopBindBefore=bind;bind=function(){sopBindBefore();if(view!=='supSop'||!supCanVisit(view))return;if(location.hash!=='#/supply/sop')history.replaceState(null,'','#/supply/sop');
 const on=(sel,f)=>{const el=$(sel);if(el)el.onchange=f};
 on('#sopStatus',e=>{sopF.status=e.target.value;render()});on('#sopType',e=>{sopF.type=e.target.value;render()});on('#sopSev',e=>{sopF.sev=e.target.value;render()});on('#sopMine',e=>{sopF.mine=e.target.checked;render()});
 on('#sopA',e=>{sopCmpA=+e.target.value;render()});on('#sopB',e=>{sopCmpB=+e.target.value;render()})};
document.addEventListener('click',async e=>{const el=e.target.closest?.('[data-sop-tab],[data-sop-act],[data-sop-open],[data-sop-add],[data-sop-save],[data-sop-note],[data-sop-close],[data-sop-export],[data-sop-go],[data-sop-mine]');if(!el)return;
 const done=(res,msg)=>{if(res&&res.ok===false){const m=t(res.error)||res.error;const fe=$('#modal[open] #formError');if(fe)fe.textContent=m;else toast(m);return false}if($('#modal').open)$('#modal').close();render();if(msg)toast(msg);return true};
 if(el.dataset.sopTab){sopTab=el.dataset.sopTab;render();return}
 if(el.dataset.sopMine){sopF={status:'open',type:'',sev:'',mine:true};sopTab='actions';navigate('supSop');return}
 if(el.dataset.sopOpen){sopDetail(el.dataset.sopOpen,!!el.dataset.sopDrop);return}
 if(el.dataset.sopAdd){sopAddForm();return}
 if(el.dataset.sopSave){done(sopAdd(Object.fromEntries(new FormData($('#sopAddForm')))));return}
 if(el.dataset.sopNote){const v=$('#sopForm [name="note"]')?.value;done(sopNote(el.dataset.sopNote,v));return}
 if(el.dataset.sopAct){const f=$('#sopForm'),note=f?.querySelector('[name="note"]')?.value,reason=f?.querySelector('[name="reason"]')?.value;
  if(el.dataset.sopAct==='dropped'&&!String(reason||'').trim()){if(!f){sopDetail(el.dataset.sop,true);return}const fe=$('#formError');if(fe)fe.textContent=t('sopNeedReason');return}
  if(note){const r=sopNote(el.dataset.sop,note);if(r.ok===false){done(r);return}}done(sopAct(el.dataset.sop,el.dataset.sopAct,reason));return}
 if(el.dataset.sopClose){el.disabled=true;const r=await sopClose();el.disabled=false;done(r,r.ok?tp('sopClosed',{id:r.snap.id})+(r.dropped?' · '+tp('sopCapDrop',{n:SOP_SNAP_CAP,d:r.dropped}):''):'');return}
 if(el.dataset.sopExport){const s=sopSnaps.find(x=>x.id===el.dataset.sopExport);if(s&&fuCan('supply.sop.close'))U.downloadURL(URL.createObjectURL(new Blob([JSON.stringify(s,null,2)],{type:'application/json'})),s.id+'.json');return}
 if(el.dataset.sopGo){if($('#modal').open)$('#modal').close();if(el.dataset.sopSku&&el.dataset.sopGo==='supStock')Supply.App.ui.sku=el.dataset.sopSku;navigate(el.dataset.sopGo);return}
});
