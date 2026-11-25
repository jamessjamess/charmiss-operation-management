/* Daily operations: persisted product master, scoped audit and shared helpers. */
const opsBaseProducts=structuredClone(seedProducts),opsDay=()=>dateKey(Date.now());
const L=(th,en)=>lang==='th'?th:en;
let opsStale=false,opsCatalogSearch='',opsInventorySKU='all',opsReportFrom='',opsReportTo='',opsReportStatus='all',opsMatrix=false,opsImportDraft=null,opsFormState=null,opsBatchLock=false;
function opsId(prefix){return prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)}
function opsGlobal(){return !!session&&['admin','director','finance'].includes(session.role)}
function opsWarehouse(){return !!session&&['admin','warehouse'].includes(session.role)}
function opsFresh(){let saved;try{saved=JSON.parse(storage.getItem('charmiss-stock-demo-v1')||'null')}catch{}return !opsStale&&(!saved||Number(saved.opsRevision||0)===Number(db.opsRevision||0))}
function opsCheck(){return opsFresh()?null:L('ข้อมูลเปลี่ยนจากอีกแท็บ กรุณาโหลดใหม่ก่อนทำรายการ','Data changed in another tab. Reload before proceeding.')}
function opsMaster(sku){return db.productMaster?.find(p=>p.sku===sku)}
function opsSafeText(v,max=120){return typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[<>\u0000-\u001f]/.test(v)}
function opsNumber(v){return typeof v==='number'&&Number.isFinite(v)}
function opsResult(error){return{ok:false,error}}
function opsInit(){
 if(!db.productMaster){seedProducts.splice(0,seedProducts.length,...structuredClone(opsBaseProducts));db.productMaster=seedProducts.map(p=>({sku:p[0],name:p[1],unit:'pcs',price:199,barcode:p[0],erpSku:'ERP-SKU-'+p[0],safety:p[3],active:true,shelfDays:p[4]}))}
 db.lots||=db.productMaster.filter(p=>opsBaseProducts.some(s=>s[0]===p.sku)).map(p=>{const seed=opsBaseProducts.find(s=>s[0]===p.sku);return{id:'LOT-OPEN-'+p.sku,sku:p.sku,lot:'OPEN-'+p.sku,expiry:opsAddDays(opsDay(),seed[4]),qty:seed[2],cost:0,grade:'A',opening:true}});
 db.movements||=[];db.goodsReceipts||=[];db.returns||=[];db.allocationBatches||=[];db.opsRevision||=0;
 seedProducts.splice(0,seedProducts.length,...db.productMaster.map(p=>{const lots=db.lots.filter(l=>l.sku===p.sku);return[p.sku,p.name,lots.reduce((s,l)=>s+l.qty,0),p.safety,Math.max(0,...lots.filter(l=>l.qty>0&&l.grade==='A').map(l=>opsDays(l.expiry)))]}));
 // Shipments from an older prototype have no lot ledger; retain a review flag.
 db.orders.forEach(o=>{if(['shipped','delivered'].includes(o.ship)&&!o.inventoryShipment)o.inventoryLegacyReview=true});
 persist();
}
function opsSyncProducts(){db.productMaster.forEach(m=>{let p=product(m.sku);if(!p){p=[m.sku,m.name,0,m.safety,m.shelfDays];seedProducts.push(p)}p[1]=m.name;p[2]=db.lots.filter(l=>l.sku===m.sku).reduce((s,l)=>s+l.qty,0);p[3]=m.safety;p[4]=Math.max(0,...db.lots.filter(l=>l.sku===m.sku&&l.qty>0&&l.grade==='A').map(l=>opsDays(l.expiry)))})}
const opsPersistBefore=persist;persist=function(){if(opsBatchLock)return;if(db.productMaster){db.opsRevision=(db.opsRevision||0)+1}opsPersistBefore()};
function opsAudit(event,ref,partnerIds=[],before=null,after=null){db.logs.unshift({event,ref,actor:session?.role||'system',actorId:stockActorId(),actorName:stockActorName(),partnerIds:[...new Set(partnerIds.filter(Boolean))],before:before===null?null:structuredClone(before),after:after===null?null:structuredClone(after),time:Date.now()});persist()}
function opsRefPartners(ref){const s=String(ref||''),ids=[];db.orders?.forEach(o=>{if(s.includes(o.id))ids.push(o.partner)});db.documents?.forEach(d=>{if([d.id,d.so,d.invoice].filter(Boolean).some(id=>s.includes(id)))ids.push(d.partner)});db.allocations?.forEach(a=>{if(s.includes(a.id))ids.push(a.partner)});[...(db.stockRequests||[]),...(db.stockTransfers||[])].forEach(r=>{if(s.includes(r.id))ids.push(r.from,r.to)});return [...new Set(ids.filter(x=>partner(x)))]}
log=function(event,ref){opsAudit(event,ref,opsRefPartners(ref))};
stockAudit=function(event,ref){opsAudit(event,ref,opsRefPartners(ref))};
orderEvent=function(o,key,detail=''){o.events||=[];const e={id:opsId('EV'),key,detail,actor:session?.role||'system',actorId:stockActorId(),actorName:stockActorName(),time:Date.now()};o.events.push(e);opsAudit(key,o.id+(detail?' · '+detail:''),[o.partner])};
function opsVisibleLog(x){if(opsGlobal())return true;const ids=x.partnerIds?.length?x.partnerIds:opsRefPartners(x.ref);if(ids.length)return ids.some(id=>visiblePartner(partner(id)));return x.actorId===stockActorId()}
function opsActor(x){return x.actorName||(x.actor==='manager'?L('Manager เดิม · ไม่ระบุกลุ่ม','Legacy Manager · group not recorded'):t(x.actor))}
function opsCSV(name,headers,rows){const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';const blob=new Blob(['\ufeff'+[headers,...rows].map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
function opsSaveProduct(v,editing=false){
 if(session?.role!=='admin')return opsResult(t('denied'));if(opsCheck())return opsResult(opsCheck());
 v={...v,barcode:String(v.barcode||'').trim(),erpSku:String(v.erpSku||'').trim()};const sku=String(v.sku||'').trim(),old=opsMaster(sku);
 if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/.test(sku)||!opsSafeText(v.name)||!opsSafeText(v.unit,20)||!opsSafeText(v.erpSku,60)||!opsSafeText(v.barcode,60)||!opsNumber(v.price)||v.price<0||v.price>1e7||Math.abs(Math.round(v.price*100)-v.price*100)>1e-6||!Number.isSafeInteger(v.safety)||v.safety<0||!Number.isSafeInteger(v.shelfDays)||v.shelfDays<1||v.shelfDays>3650)return opsResult(t('required'));
 if(editing?!old:!!old)return opsResult(L('SKU ซ้ำหรือไม่พบรายการเดิม','Duplicate or missing SKU'));
 if(db.productMaster.some(p=>p.sku!==sku&&(p.barcode===v.barcode||p.erpSku===v.erpSku)))return opsResult(L('Barcode หรือรหัส ERP ซ้ำ','Duplicate barcode or ERP SKU'));
 if(old&&v.safety>old.safety+Math.max(0,free(sku)))return opsResult(L('Safety ใหม่กระทบโควต้าที่จองไว้','Safety change would affect reserved quota'));
 const next={sku,name:v.name.trim(),unit:v.unit.trim(),price:v.price,barcode:v.barcode.trim(),erpSku:v.erpSku.trim(),safety:v.safety,active:!!v.active,shelfDays:v.shelfDays};const before=old?structuredClone(old):null;if(old)Object.assign(old,next);else db.productMaster.push(next);opsSyncProducts();opsAudit('opsProductSaved',sku,[],before,next);return{ok:true,product:next};
}
Object.assign(dict.th,{opsProductSaved:'บันทึกข้อมูลสินค้า',opsReceipt:'รับของเข้าคลัง',opsCount:'ตรวจนับ / ปรับยอด',opsDispatch:'ตัดสต็อกเมื่อจัดส่ง',opsReturn:'ขอคืนสินค้า',opsInspectReturn:'ตรวจรับคืนสินค้า',opsCredit:'อนุมัติ Credit Note / คืนยอด',opsBatch:'นำเข้าชุดจัดสรร',opsLegacy:'ตรวจสอบสต็อกการส่งเดิม',opsInventory:'รับเข้า / ตรวจนับ / Stock ledger',opsReturns:'คืนสินค้า / Credit Note',returns:'คืนสินค้า / Credit Note'});
Object.assign(dict.en,{opsProductSaved:'Product master saved',opsReceipt:'Goods receipt',opsCount:'Stock count / adjustment',opsDispatch:'Inventory dispatched',opsReturn:'Return requested',opsInspectReturn:'Return inspected',opsCredit:'Credit note approved / stock restored',opsBatch:'Allocation batch imported',opsLegacy:'Legacy shipment stock review',opsInventory:'Receipts / Counts / Stock ledger',opsReturns:'Returns / Credit notes',returns:'Returns / Credit notes'});
