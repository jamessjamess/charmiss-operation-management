/* supply-feed.js — CR-01 Phase B · Data Adapter Ops → Supply (6.1–6.3) + F6 CN condition + F9 product lifecycle.
   READ-ONLY toward Ops: builds the 8 Supply tables (+ in_transit) from the Ops state; it never writes an order, a quota,
   a document or the WMS snapshot. Rebuilt from the state every time (not accumulated), so reading it twice gives the same tables
   and every Ops event id counts once (SUP-FEED-IDEMP).

   Time cut = the last WMS read (db.wmsSnapshot.asOf): WH, in-transit, Sales In and CN are all taken at that moment, so nothing is
   counted twice (a parcel is either on the WMS balance, in transit, or delivered). Events after the read show after "ดึงยอด WMS".

   Mapping (6.2)
     sales_in     ← orders Delivered (carrier event) · date = deliveredAt · IV required · outright (TT/ECOM) → also sales_out
     in_transit   ← orders whose IV is issued and that left the WMS (handover confirmed) and are not delivered at the cut
     cn           ← returns: request = Planned · credited (CN from SLA/ERP) = Approved · WMS receipt = Received + Good / Bad (F6)
     quota        ← Ops allocations of the planning month (2026-11): quota_qty = approved · reserved_qty = SO hold (จอง) ·
                    committed_qty = deducted at SO / IV (หักจริง, incl. the month-to-date history of the Integrated demo)
     stock_lot    ← WH = the WMS balance (lots FEFO from the Integrated-demo lots) · consignment lots rolled forward by the events
     sku_master   ← + lifecycle from the Ops product master (New / Active / Discontinue / Clearance, F9)
     other_out    ← CR-03 R2: approved non-sales stock issues (PR / KOL, sample, internal use, write-off) issued before the cut
   Only the Integrated demo is fed (the UAT seed uses other SKUs / partners). Orders that left the WMS before the dataset was built
   are part of the opening history and are not fed again. */
Object.assign(dict.th,{feedMeta:'ข้อมูล Ops ณ {t} · WMS version {v}',feedMetaNone:'ยังไม่มีธุรกรรม Ops หลังเริ่มชุดข้อมูล — ตัวเลขเท่ากับ Integrated demo',feedMetaEvents:'ธุรกรรม Ops: ส่งออกจากคลัง {i} · ส่งมอบแล้ว {d} · ระหว่างขนส่ง {r} · CN {c}',feedLatestTip:'AS OF ล่าสุดรวมธุรกรรม Ops ถึงรอบดึง WMS',feedUat:'ชุด UAT seed ไม่ผูกกับ Supply (คนละ SKU / คู่ค้า) — หน้า Supply แสดง Integrated demo',f6Reason:'เหตุผลสภาพเสีย (บังคับเมื่อมีของเสีย)',f6ReasonNeed:'มีสินค้าเสียหาย ต้องระบุเหตุผล',f6Cond:'สภาพ',lifecycle:'สถานะสินค้า (Supply)',lcNew:'New (สินค้าใหม่)',lcActive:'Active',lcDiscontinue:'Discontinue',lcClearance:'Clearance (ขายเคลียร์)',wmsLiveNote:'WMS DEMO (Integrated): ยอดใหม่ = ยอดเริ่ม − ของที่ส่งมอบขนส่งแล้ว + ของคืนสภาพดีที่ WMS รับแล้ว'});
Object.assign(dict.en,{feedMeta:'Ops data as of {t} · WMS version {v}',feedMetaNone:'No Ops transaction since the dataset started — numbers equal the Integrated demo',feedMetaEvents:'Ops transactions: goods issued {i} · delivered {d} · in transit {r} · CN {c}',feedLatestTip:'The latest AS OF includes the Ops transactions up to the last WMS read',feedUat:'The UAT seed is not linked to Supply (different SKUs / partners) — Supply pages show the Integrated demo',f6Reason:'Reason for damaged goods (required when any is damaged)',f6ReasonNeed:'Damaged goods need a reason',f6Cond:'Condition',lifecycle:'Product status (Supply)',lcNew:'New',lcActive:'Active',lcDiscontinue:'Discontinue',lcClearance:'Clearance',wmsLiveNote:'WMS DEMO (Integrated): new balance = opening − goods handed to carriers + good returns received by the WMS'});

/** Ops t() takes no parameters: tp('key', {a:1}) fills {a} placeholders. */
function tp(k,p){return t(k).replace(/\{(\w+)\}/g,(m,x)=>p&&p[x]!=null?p[x]:m)}
const FEED_MONTH='2026-11';                                       // the Ops planning period ("รอบแผน พฤศจิกายน 2026")
function feedOn(){return typeof db!=='undefined'&&db?.dataset==='integrated'&&!!db.feedBase}
const feedT=x=>Number(x)||0;

/* ---------------------------------------------------------------- seed: run once by the Integrated build (supply-planning.js) */
function supFeedSeed(base){
 const builtAt=db.datasetBuiltAt||Date.now(),snap=base.stock_lot[0]?.snapshot_date||'2026-11-23',accs=new Set(base.account_master.map(a=>a.account_id));
 const pending=db.allocations.find(a=>a.id==='AL-260014'&&a.status==='submitted');
 // Ops quota of the planning month = the Supply quota of that month (so selfCheck 9 holds and no anchor moves).
 // Demo allocations of Supply accounts are replaced; Ops-only channels (Direct / Social) keep theirs.
 db.retiredSeeds=db.allocations.filter(a=>accs.has(a.partner)).map(a=>a.id);   // demo quota the Ops modules would otherwise seed again on the next load
 db.allocations=db.allocations.filter(a=>!accs.has(a.partner));
 base.quota.filter(r=>r.month===FEED_MONTH&&+r.quota_qty>0&&accs.has(r.account_id)).forEach(r=>db.allocations.push({id:'AL-Q'+FEED_MONTH.replace('-','').slice(2)+'-'+r.account_id+'-'+r.sku,sku:r.sku,partner:r.account_id,qty:Math.round(+r.quota_qty),status:'approved',erp:'synced',note:L('Quota พ.ย. 2026 จากแผน Supply','Nov 2026 quota from the Supply plan'),time:builtAt,month:FEED_MONTH}));
 if(pending){const q=db.allocations.find(a=>a.partner===pending.partner&&a.sku===pending.sku);pending.qty=Math.max(100,Math.round((q?.qty||1000)*0.1/10)*10);pending.note=L('ขอเพิ่ม Quota (ตัวอย่างรออนุมัติ)','Quota top-up (pending example)');pending.month=FEED_MONTH;db.allocations.push(pending)}
 // month-to-date history: what the accounts already received this month counts as used quota in Ops too
 const open={};base.sales_in.forEach(r=>{if(r.date>=FEED_MONTH+'-01'&&r.date<snap&&accs.has(r.account_id)){const k=r.account_id+'|'+r.sku;open[k]=(open[k]||0)+Math.round(+r.qty)}});
 db.quotaOpening=open;db.wmsOpening=structuredClone(db.wmsSnapshot.rows);db.feedBase={builtAt,snap,month:FEED_MONTH}
}

/* ---------------------------------------------------------------- Ops side of the Integrated demo (Ops rules unchanged)
   · "ใช้ไป" includes the month-to-date history (Integrated only) · that history already left the WMS, so it is added back to the
     central free quota exactly like a WMS-acknowledged shipment (wmsFulfilledQuota) · the mock WMS of the Integrated demo returns a
     balance that reflects goods handed to carriers and good returns it received — Ops still only READS it (wmsApplySnapshot). */
let feedIdxKey='',feedIdx=null;
function feedIndex(){const key=(db.opsRevision||0)+':'+db.allocations.length+':'+Object.keys(db.quotaOpening||{}).length;if(key===feedIdxKey&&feedIdx)return feedIdx;
 const appr={};db.allocations.forEach(a=>{if(a.status==='approved'&&feedOpsMonth(a)){const k=a.partner+'|'+a.sku;appr[k]=(appr[k]||0)+a.qty}});
 const bySku={};Object.entries(db.quotaOpening||{}).forEach(([k,q])=>{const sku=k.split('|')[1];bySku[sku]=(bySku[sku]||0)+Math.min(q,appr[k]||0)});
 feedIdxKey=key;feedIdx={appr,bySku};return feedIdx}
/* CR-01 Phase C: Ops quota is one planning month — a next-month Quota Draft (B3) never counts in this month's quota or free pool */
const feedOpsMonth=a=>!feedOn()||!a.month||a.month===FEED_MONTH;
const feedQuotaForBefore=quotaFor;quotaFor=function(pid,sku){if(!feedOn())return feedQuotaForBefore(pid,sku);return db.allocations.filter(a=>a.partner===pid&&a.sku===sku&&a.status==='approved'&&feedOpsMonth(a)).reduce((x,a)=>x+a.qty,0)};
used=sku=>db.allocations.filter(a=>a.sku===sku&&['submitted','approved'].includes(a.status)&&feedOpsMonth(a)).reduce((x,a)=>x+a.qty,0);
const feedConsumedBefore=consumedFor;consumedFor=function(pid,sku){return feedConsumedBefore(pid,sku)+(feedOn()?(db.quotaOpening?.[pid+'|'+sku]||0):0)};
const feedFreeBefore=free;free=function(sku){return feedFreeBefore(sku)+(feedOn()?(feedIndex().bySku[sku]||0):0)};
function feedShipped(o){return feedOn()&&feedT(o.shippedAt)>db.feedBase.builtAt}
/* F7: a PO the Planner marks Received (Integrated demo) is a goods receipt the mock WMS reports on its next read */
function feedPoReceipts(T){return Object.entries(db.poPlan?.edits||{}).filter(([,e])=>e.status==='Received'&&feedT(e.receivedAt)>db.feedBase.builtAt&&feedT(e.receivedAt)<=T).map(([po,e])=>({po,...e}))}
function feedWmsMoves(T){const out={},back={},orders=[];
 db.orders.forEach(o=>{if(!feedShipped(o)||feedT(o.shippedAt)>T||!orderDoc(o)?.invoice)return;orders.push(o);getOrderLines(o).forEach(l=>{out[l.sku]=(out[l.sku]||0)+l.qty})});
 const ids=new Set(orders.map(o=>o.id));
 db.returns.forEach(r=>{if(!ids.has(r.orderId)||!r.wmsReceiptAt||feedT(r.wmsReceiptAt)>T)return;r.lines.forEach(l=>{back[l.sku]=(back[l.sku]||0)+(l.good||0)})});
 feedPoReceipts(T).forEach(e=>{if(e.sku)back[e.sku]=(back[e.sku]||0)+(+e.qty||0)});
 feedIssues(T).forEach(x=>{out[x.sku]=(out[x.sku]||0)+x.qty});   // CR-03 R2: non-sales issues leave the WMS too
 return{out,back,orders}}
/* CR-03 R2: non-sales stock issues approved after the dataset was built and issued by time T (ops-stock-issue.js) */
function feedIssues(T){return(db.stockIssues||[]).filter(x=>x.status==='issued'&&feedT(x.issuedAt)>feedT(db.feedBase?.builtAt)&&feedT(x.issuedAt)<=T)}
const feedWmsBefore=wmsRefreshMock;wmsRefreshMock=function(outage=false){
 if(!feedOn()||outage)return feedWmsBefore(outage);if(!wmsCanRead())return{ok:false,error:'denied'};
 const now=Date.now(),{out,back,orders}=feedWmsMoves(now),open=new Map(db.wmsOpening.map(r=>[r.sku,r]));
 const rows=db.productMaster.map(m=>{const r=open.get(m.sku)||wmsRow(m.sku),onHand=Math.max(0,r.onHand-(out[m.sku]||0)+(back[m.sku]||0));return{sku:m.sku,onHand,usable:Math.min(onHand,Math.max(0,r.usable-(out[m.sku]||0)+(back[m.sku]||0))),shelfDays:r.shelfDays}});
 const fulfilled=(db.wmsSnapshot.fulfilledOrders||[]).filter(f=>{const o=db.orders.find(x=>x.id===f.orderId);return o&&['shipped','delivered'].includes(o.ship)&&orderDoc(o)?.invoice&&f.partner===o.partner&&JSON.stringify(f.lines)===JSON.stringify(getOrderLines(o))});
 orders.forEach(o=>{if(['shipped','delivered'].includes(o.ship)&&!fulfilled.some(f=>f.orderId===o.id))fulfilled.push({orderId:o.id,partner:o.partner,lines:structuredClone(getOrderLines(o)),quotaUsed:!!orderDoc(o)})});
 return wmsApplySnapshot({source:'WMS DEMO',version:'WMS-MOCK-'+now,asOf:now,rows,fulfilledOrders:fulfilled})};

/* ---------------------------------------------------------------- F6 · condition Good / Bad + reason when the warehouse receives a return */
const feedInspectBefore=opsInspectReturn;opsInspectReturn=function(id,lines,reason){if(Array.isArray(lines)&&lines.some(l=>Number(l.damaged)>0)&&!opsSafeText(reason,200))return opsResult(t('f6ReasonNeed'));const res=feedInspectBefore(id,lines);if(res?.ok){const r=db.returns.find(r=>r.id===id);if(r){r.badReason=lines.some(l=>Number(l.damaged)>0)?String(reason).trim():'';r.condition=r.lines.map(l=>l.sku+': Good '+l.good+' / Bad '+l.damaged).join(' · ');persist()}}return res};
const feedInspectFormBefore=opsInspectForm;opsInspectForm=function(id){feedInspectFormBefore(id);const f=$('#modal form');const r=db.returns.find(r=>r.id===id);if(!f||!r)return;const actions=f.querySelector('.dialogactions');(actions||f).insertAdjacentHTML('beforebegin',`<label class="full">${t('f6Reason')}<input id="f6Reason" maxlength="200" placeholder="${esc(L('เช่น กล่องบุบ / ซีลขาด / หมดอายุ','e.g. dented box / broken seal / expired'))}" value="${esc(r.badReason||'')}"></label>`);f.onsubmit=e=>{e.preventDefault();const lines=r.lines.map((l,i)=>({sku:l.sku,good:+document.querySelector(`[data-rma-good="${i}"]`).value,damaged:+document.querySelector(`[data-rma-bad="${i}"]`).value}));opsFeedback(opsInspectReturn(id,lines,$('#f6Reason')?.value||''))}};
const feedReturnPanelBefore=wmsReturnPanel;wmsReturnPanel=function(){let html=feedReturnPanelBefore();db.returns.filter(r=>r.condition&&visiblePartner(partner(r.partner))).forEach(r=>{html=html.replace(`<b>${esc(r.id)}</b>`,`<b>${esc(r.id)}</b> · <span class="pill ${r.lines.some(l=>l.damaged>0)?'warn':'ok'}">${t('f6Cond')}: ${esc(r.condition)}${r.badReason?' · '+esc(r.badReason):''}</span>`)});return html};

/* ---------------------------------------------------------------- F9 · product lifecycle (Admin › รายการสินค้า › ตั้ง / แก้ไขสินค้า) */
const FEED_LC=['New','Active','Discontinue','Clearance'];
const feedProductFormBefore=opsProductForm;opsProductForm=function(sku=null){feedProductFormBefore(sku);const f=$('#modal form');if(!f||session?.role!=='admin')return;const m=opsMaster(sku),cur=m?.lifecycle||(m?.status==='NPD'?'New':m?.status)||'Active';const grid=f.querySelector('.formgrid');(grid||f).insertAdjacentHTML('beforeend',`<label>${t('lifecycle')}<select id="feedLifecycle">${FEED_LC.map(v=>`<option value="${v}" ${v===cur?'selected':''}>${t('lc'+v)}</option>`).join('')}</select></label>`);const submit=f.onsubmit;f.onsubmit=e=>{const lc=$('#feedLifecycle')?.value;const key=sku||f.querySelector('[name="sku"]')?.value?.trim();submit&&submit.call(f,e);const p=opsMaster(key);if(p&&FEED_LC.includes(lc)&&p.lifecycle!==lc){const before=p.lifecycle||null;p.lifecycle=lc;opsAudit('feedLifecycleEvent',key+' · '+lc,[],before,lc);persist();render()}}};
Object.assign(dict.th,{feedLifecycleEvent:'เปลี่ยนสถานะสินค้า (Supply)'});Object.assign(dict.en,{feedLifecycleEvent:'Product status changed (Supply)'});

/* ---------------------------------------------------------------- the feed */
function feedReserved(pid,sku){return typeof soHold==='function'?soHold(pid,sku):0}
function feedQuotaRows(base){const rows=[];const accs=base.account_master.map(a=>a.account_id),skus=base.sku_master.map(s=>s.sku);
 for(const a of accs)for(const s of skus){const q=quotaFor(a,s),res=feedReserved(a,s),com=Math.max(0,consumedFor(a,s)-res);if(q>0||res>0||com>0)rows.push({month:db.feedBase.month,sku:s,account_id:a,quota_qty:q,reserved_qty:res,committed_qty:com})}return rows}
/* other months: an approved Ops quota (e.g. a next-month draft from a Supply proposal) replaces the plan of that account × SKU × month */
function feedOtherMonths(){const m={};db.allocations.forEach(a=>{if(a.status!=='approved'||!a.month||a.month===FEED_MONTH)return;const k=a.month+'|'+a.partner+'|'+a.sku;m[k]=(m[k]||0)+a.qty});return m}
/* F7 + B3: PO edits (ETA / status / delay reason / receipt) and Planned POs from approved proposals, over the imported po_inbound */
function feedPoRows(base,cut){const P=db.poPlan;if(!P||(!Object.keys(P.edits||{}).length&&!(P.added||[]).length))return null;const edits=P.edits||{},day=ts=>dateKey(ts);
 const fix=r=>{const e=edits[r.po_no];if(!e)return r;const x={...r,eta_date:e.eta||r.eta_date,status:e.status||r.status};if(e.status==='Received'){if(feedOn()&&feedT(e.receivedAt)<=feedT(cut)){x.received_date=e.receivedDate;x.status='Received'}else{x.status='Shipped';x.eta_date=e.receivedDate||x.eta_date}}return x};
 return base.po_inbound.map(fix).concat((P.added||[]).map(fix))}
/* B3 recall: a recall request (draft / requested) is a planned CN back from that account */
function feedRecallRows(base){const A=new Map(base.account_master.map(a=>[a.account_id,a]));return(db.recallRequests||[]).filter(r=>['draft','requested'].includes(r.status)&&A.has(r.partner)).map(r=>({cn_no:r.id,date:dateKey(feedT(r.time)+Math.max(3,+(A.get(r.partner)?.delivery_lead_days)||3)*86400000),sku:r.sku,account_id:r.partner,qty:r.qty,reason:'Recall · '+(r.dest||'Supply'),condition:'Good',status:'Planned'}))}
function feedLots(base,events,accType){
 const wh=new Map(),acc=new Map(),key=(loc,sku)=>loc+'|'+sku,put=(m,k,L)=>{if(!m.has(k))m.set(k,[]);const a=m.get(k),x=a.find(y=>y.lot_no===L.lot_no);if(x)x.qty+=L.qty;else a.push({...L})};
 base.stock_lot.forEach(r=>{const L={lot_no:r.lot_no,qty:+r.qty,mfg:r.mfg_date,exp:r.exp_date};if(r.location==='WH')put(wh,r.sku,L);else put(acc,key(r.location,r.sku),L)});
 const take=(arr,qty,prefer)=>{const out=[];if(!arr)return out;const order=arr.slice().sort((a,b)=>((prefer&&prefer.has(b.lot_no))-(prefer&&prefer.has(a.lot_no)))||String(a.exp).localeCompare(String(b.exp)));for(const L of order){if(qty<=0)break;const q=Math.min(qty,L.qty);if(q<=0)continue;L.qty-=q;qty-=q;out.push({...L,qty:q})}return out};
 const parcels=new Map();
 for(const e of events){
  if(e.kind==='issue'){const p=[];e.lines.forEach(l=>take(wh.get(l.sku),l.qty).forEach(x=>p.push({...x,sku:l.sku})));parcels.set(e.order.id,p)}
  else if(e.kind==='receive'){put(wh,e.sku,{...e.lot,qty:e.qty})}
  else if(e.kind==='otherout'){take(wh.get(e.sku),e.qty,e.lots)}   // CR-03 R2: the issued lot first, then FEFO
  else if(e.kind==='deliver'){if(accType(e.order.partner)==='C')(parcels.get(e.order.id)||[]).forEach(x=>put(acc,key(e.order.partner,x.sku),x))}
  else if(e.kind==='return'){const pref=new Set((parcels.get(e.ret.orderId)||[]).map(x=>x.lot_no));e.ret.lines.forEach(l=>{const good=l.good||0,bad=l.damaged||0;
   if(accType(e.ret.partner)==='C'){const got=take(acc.get(key(e.ret.partner,l.sku)),good+bad,pref);let g=good;got.forEach(x=>{const q=Math.min(g,x.qty);if(q>0){put(wh,l.sku,{...x,qty:q});g-=q}})}
   else{let g=good;(parcels.get(e.ret.orderId)||[]).filter(x=>x.sku===l.sku).forEach(x=>{const q=Math.min(g,x.qty);if(q>0){put(wh,l.sku,{lot_no:x.lot_no,qty:q,mfg:x.mfg,exp:x.exp});g-=q}})}})}
 }
 return{wh,acc}}
function supplyFeed(base){
 if(!base)return null;
 if(!feedOn()){const po=feedPoRows(base,0);return po?{raw:Object.assign({},base,{po_inbound:po}),meta:null}:null}
 const B=db.feedBase,cut=db.wmsSnapshot.asOf,A=new Map(base.account_master.map(a=>[a.account_id,a])),accType=id=>/^y/i.test(A.get(id)?.is_consignment||'')?'C':'O';
 const orders=db.orders.filter(o=>A.has(o.partner)&&feedShipped(o)&&feedT(o.shippedAt)<=cut&&orderDoc(o)?.invoice);
 const ids=new Set(orders.map(o=>o.id)),returns=db.returns.filter(r=>ids.has(r.orderId)&&A.has(r.partner)&&feedT(r.time)<=cut);
 const raw=Object.assign({},base);
 raw.sku_master=base.sku_master.map(s=>{const m=opsMaster(s.sku),lc=m?.lifecycle,x=m&&m.safety!=null?{...s,safety_units:m.safety}:s;return lc?{...x,status:lc==='New'?'NPD':lc}:x});   // CR-03 R3: + safety_units (Ops safety) for the outright out-of-stock test
 raw.account_master=base.account_master.map(a=>{const pt=db.partners?.find(x=>x.id===a.account_id);return pt&&pt.sales?{...a,sales:pt.sales}:a});   // CR-03 R6: + the Sales owner of the partner (FVA by Sales)
 const other=feedOtherMonths();
 raw.quota=base.quota.filter(r=>r.month!==B.month&&!(other[r.month+'|'+r.account_id+'|'+r.sku]>0)).concat(feedQuotaRows(base),Object.entries(other).map(([k,q])=>{const[month,account_id,sku]=k.split('|');return{month,sku,account_id,quota_qty:q}}));
 raw.po_inbound=feedPoRows(base,cut)||base.po_inbound;
 const si=[],so=[],it=[],cn=[],day=ts=>dateKey(ts),delivered=o=>o.deliveredAt&&feedT(o.deliveredAt)<=cut;
 orders.forEach(o=>{const iv=orderDoc(o).invoice;getOrderLines(o).forEach(l=>{
  it.push({iv_no:iv,order_id:o.id,sku:l.sku,account_id:o.partner,qty:l.qty,ship_date:day(o.shippedAt),delivered_date:delivered(o)?day(o.deliveredAt):''});
  if(delivered(o)){const row={date:day(o.deliveredAt),sku:l.sku,account_id:o.partner,qty:l.qty,value:Math.round(l.qty*l.price*100)/100};si.push(row);if(accType(o.partner)==='O')so.push({...row})}})});
 returns.forEach(r=>{const recv=r.wmsReceiptAt&&feedT(r.wmsReceiptAt)<=cut,status=r.status==='rejected'?'Cancelled':recv?'Received':r.status==='credited'?'Approved':'Planned';
  const date=recv?day(r.wmsReceiptAt):day(Math.max(feedT(r.time),cut)+Math.max(3,+(A.get(r.partner)?.delivery_lead_days)||3)*86400000);
  r.lines.forEach(l=>{const inspected=Number.isFinite(l.good)&&l.good!==null,parts=inspected?[['Good',l.good||0,r.reason],['Bad',l.damaged||0,r.badReason||r.reason]]:[['Good',l.qty,r.reason]];
   parts.forEach(([cond,q,why])=>{if(q>0)cn.push({cn_no:r.creditNo||r.id,date,sku:l.sku,account_id:r.partner,qty:q,reason:why||'',condition:cond,status})})})});
 cn.push(...feedRecallRows(base));
 const receipts=feedPoReceipts(cut),hasEvents=orders.length>0||returns.length>0||receipts.length>0;
 const issues=feedIssues(cut);raw._wms_cut=day(cut);   // CR-03: R1 outright run-rate end = the WMS read · R2 other_out
 raw.other_out=(base.other_out||[]).concat(issues.flatMap(x=>(x.lots||[{lot:'',qty:x.qty}]).map(l=>({date:day(x.issuedAt),sku:x.sku,lot:l.lot,location:'WH',qty:l.qty,type:x.type,ref:x.id}))));
 const meta={cut,wmsVersion:db.wmsSnapshot.version,builtAt:B.builtAt,hasEvents:hasEvents||issues.length>0,issued:orders.length,delivered:orders.filter(delivered).length,inTransit:orders.filter(o=>!delivered(o)).length,cn:returns.length,history:B.snap,otherOut:issues.length};
 if(!hasEvents&&!issues.length){raw.in_transit=[];if(cn.length)raw.cn=base.cn.concat(cn);return{raw,meta}}
 // events in time order → lots (FEFO) at the new snapshot = the Monday after the WMS read
 const ev=[];orders.forEach(o=>{ev.push({kind:'issue',t:feedT(o.shippedAt),order:o,lines:getOrderLines(o)});if(delivered(o))ev.push({kind:'deliver',t:feedT(o.deliveredAt),order:o})});
 returns.forEach(r=>{if(r.wmsReceiptAt&&feedT(r.wmsReceiptAt)<=cut&&r.status!=='rejected')ev.push({kind:'return',t:feedT(r.wmsReceiptAt),ret:r})});
 const shelf=new Map(base.sku_master.map(k=>[k.sku,+k.shelf_life_months||24]));
 issues.forEach(x=>ev.push({kind:'otherout',t:feedT(x.issuedAt),sku:x.sku,qty:x.qty,lots:new Set((x.lots||[]).map(l=>l.lot))}));   // CR-03 R2
 receipts.forEach(e=>ev.push({kind:'receive',t:feedT(e.receivedAt),sku:e.sku,qty:+e.qty,lot:{lot_no:'PO-'+e.po,mfg:e.receivedDate,exp:Calc.iso(Calc.dn(e.receivedDate)+Math.round((shelf.get(e.sku)||24)*30.4))}}));
 ev.sort((a,b)=>a.t-b.t);
 const L=feedLots(base,ev,accType),snap=Calc.iso(Calc.monday(Calc.dn(day(cut)))+7),lots=[];
 L.wh.forEach((arr,sku)=>arr.forEach(x=>{if(x.qty>0)lots.push({snapshot_date:snap,sku,lot_no:x.lot_no,location:'WH',qty:x.qty,mfg_date:x.mfg,exp_date:x.exp})}));
 L.acc.forEach((arr,k)=>{const[loc,sku]=k.split('|');arr.forEach(x=>{if(x.qty>0)lots.push({snapshot_date:snap,sku,lot_no:x.lot_no,location:loc,qty:x.qty,mfg_date:x.mfg,exp_date:x.exp})})});
 raw.stock_lot=lots;raw.sales_in=base.sales_in.concat(si);raw.sales_out=base.sales_out.concat(so);raw.cn=base.cn.concat(cn);raw.in_transit=it;raw._history_end=B.snap;
 meta.snapshot=snap;return{raw,meta}
}
/* A key that changes whenever the feed could change: dataset, every Ops save (revision) and the WMS read. */
function supplyFeedKey(){return feedOn()?['ops',db.datasetBuiltAt,db.opsRevision||0,db.wmsSnapshot?.version].join(':'):'base:'+(db?.poPlan?.rev||0)}

/* ---------------------------------------------------------------- selfCheck 7–9 (Ops ↔ Supply) */
function supplyFeedChecks(DB){
 const add=(id,bad,total,detail)=>({id,ok:bad===0,n:bad,total,detail:detail||''});
 if(!feedOn())return['wms','delivered','quota_ops'].map(id=>({...add(id,0,null,t('feedUat')),skipped:true}));
 const out=[];
 // 7) WH on-hand of Supply (at the snapshot) = WMS Actual of Ops, every SKU
 let bad=0,worst='';DB.skus.forEach(s=>{let wh=0;DB.lots[s.i].forEach(L=>{if(L.j<0)wh+=L.qty});const w=db.wmsSnapshot.rows.find(r=>r.sku===s.sku);if(!w||Math.abs(w.onHand-wh)>0.5){bad++;if(!worst)worst=s.sku+' '+Math.round(wh)+' vs '+(w?w.onHand:'—')}});
 out.push(add('wms',bad,DB.skus.length,worst));
 // 8) Σ Sales In of the fed weeks = Σ qty of the Ops orders Delivered in that window, every SKU × account
 const B=db.feedBase,cut=db.wmsSnapshot.asOf,w0=Math.max(0,DB.wk(Calc.dn(B.snap))),ops={};
 db.orders.forEach(o=>{if(DB.accIdx.has(o.partner)&&feedShipped(o)&&feedT(o.shippedAt)<=cut&&orderDoc(o)?.invoice&&o.deliveredAt&&feedT(o.deliveredAt)<=cut)getOrderLines(o).forEach(l=>{const k=l.sku+'|'+o.partner;ops[k]=(ops[k]||0)+l.qty})});
 bad=0;worst='';let pairs=0;DB.skus.forEach(s=>DB.accounts.forEach(a=>{const sup=DB.cumSI[s.i][a.j][DB.nWeeks]-DB.cumSI[s.i][a.j][Math.min(w0,DB.nWeeks)],o=ops[s.sku+'|'+a.account_id]||0;if(sup||o){pairs++;if(Math.abs(sup-o)>0.5){bad++;if(!worst)worst=s.sku+' · '+a.account_id+' '+sup+' vs '+o}}}));
 out.push(add('delivered',bad,pairs,worst));
 // 9) Quota allocated / reserved / committed of the Ops month = Ops, every account × SKU
 bad=0;worst='';pairs=0;const m=B.month;DB.accounts.forEach(a=>DB.skus.forEach(s=>{const q=DB.quota[s.i].get(m),r=DB.quotaRes[s.i].get(m),c=DB.quotaCom[s.i].get(m),sq=q?q[a.j]:0,sr=r?r[a.j]:0,sc=c?c[a.j]:0,oq=quotaFor(a.account_id,s.sku),or=feedReserved(a.account_id,s.sku),oc=Math.max(0,consumedFor(a.account_id,s.sku)-or);if(sq||sr||sc||oq||or||oc){pairs++;if(Math.abs(sq-oq)>0.5||Math.abs(sr-or)>0.5||Math.abs(sc-oc)>0.5){bad++;if(!worst)worst=a.account_id+' · '+s.sku}}}));
 const other=feedOtherMonths();Object.entries(other).forEach(([k,q])=>{const[mo,acc,sku]=k.split('|'),i=DB.skuIdx.get(sku),j=DB.accIdx.get(acc);if(i==null||j==null)return;pairs++;const a=DB.quota[i].get(mo);if(!a||Math.abs(a[j]-q)>0.5){bad++;if(!worst)worst=acc+' · '+sku+' · '+mo}});
 out.push(add('quota_ops',bad,pairs,worst));
 return out
}
Supply.feed=supplyFeed;Supply.feedKey=supplyFeedKey;Supply.feedChecks=supplyFeedChecks;
