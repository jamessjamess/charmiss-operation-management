/* supply-intake.js — CR-03 R1 · รับรายงาน Sales Out รายสัปดาห์ (Supply Setup › รับรายงาน Sales Out) + Run Rate ตามข้อมูลจริง.
   · One file = one consignment account × one or more weeks (CSV / XLSX). The column mapping and the partner-code → SKU table are
     kept per account (db.soIntakeConfig) and reused next time.
   · Key = account_id × week (Monday) × sku. Imports are APPENDED (never replace the whole table); a key that already exists is
     either replaced or skipped — the user chooses. Any row error (line + column) blocks the import.
   · Rows live in IndexedDB (Data.Store key 'so_intake'); Supply.intakeMerge() lays them over sales_out before the Ops feed,
     Supply.intakeRoll() moves the snapshot when a report reaches past it (the consignment lots are sold down FEFO).
   · Read-only toward Ops: nothing here touches orders, quota or the WMS. */
Object.assign(dict.th,{supIntake:'รับรายงาน Sales Out',inTitle:'รับรายงาน Sales Out รายสัปดาห์ (คู่ค้าฝากขาย)',inNote:'นำเข้าแบบเติมต่อท้าย — คีย์ = คู่ค้า × สัปดาห์ (วันจันทร์) × SKU · ข้อมูลซ้ำเลือกแทนที่หรือข้าม · Run Rate ของคู่ค้านั้นขยับตามสัปดาห์ล่าสุดที่รับแล้ว',inComplete:'ความครบของข้อมูล',inCompleteNote:'ได้รับหลังวัน{d}ของสัปดาห์ถัดไป = ส่งช้า · กดช่องที่ขาดเพื่ออัปโหลด',inOk:'ได้แล้ว',inLate:'ส่งช้า',inMissing:'ขาด',inPending:'รอ',inDue:'ครบกำหนด {d}',inHistoryData:'ข้อมูลเดิม',inRemCalc:'Remaining คำนวณ',inRemCalcTip:'คู่ค้านี้ไม่ส่งรายงานคงเหลือ — คงเหลือมาจากการคำนวณ ตรวจกับยอดนับจริง (F8) ที่หน้าฝากขาย',inStale:'ข้อมูล Sales Out ค้าง {n} สัปดาห์',inUpload:'อัปโหลดไฟล์',inAccount:'คู่ค้า',inFile:'ไฟล์ (CSV / XLSX)',inMapCols:'จับคู่คอลัมน์',inColDate:'วันที่ / สัปดาห์',inColCode:'รหัสสินค้า',inColQty:'จำนวน (ชิ้น)',inColValue:'ยอดขาย (บาท) — ไม่บังคับ',inNone:'— ไม่มี —',inCodeType:'รหัสในไฟล์',inCodePartner:'รหัสของคู่ค้า (แปลงด้วยตาราง)',inCodeSku:'SKU ของ Charmiss',inRound:'ปัดวันที่เป็นวันจันทร์ของสัปดาห์',inCheck:'ตรวจไฟล์',inRows:'{n} แถว',inSummary:'{w} สัปดาห์ · {s} SKU · {q} ชิ้น',inErrors:'พบ {n} จุดที่ต้องแก้ — นำเข้าไม่ได้จนกว่าจะแก้ไฟล์',inNoErr:'ไม่พบข้อผิดพลาด',inLine:'บรรทัด',inCol:'คอลัมน์',inProblem:'ปัญหา',inUnmapped:'รหัสที่ยังไม่ได้จับคู่',inAddMap:'เพิ่มในตาราง',inDup:'มี {n} คีย์ซ้ำกับข้อมูลเดิม',inReplace:'แทนที่ข้อมูลเดิม',inSkip:'ข้าม (เก็บข้อมูลเดิม)',inImport:'นำเข้า {n} แถว',inImported:'นำเข้าแล้ว: {n} แถว ({r} แทนที่ · {s} ข้าม)',inCancel:'ยกเลิก',inWarnOver:'ยอดขาย {sku} สัปดาห์ {w} ({q}) มากกว่าคงเหลือที่คำนวณ ({r}) — ตรวจการส่งของ / ยอดนับจริง',inMap:'ตารางแปลงรหัสสินค้าของคู่ค้า',inMapNote:'รหัสในไฟล์ของคู่ค้า → SKU · ใช้ทุกครั้งที่นำเข้าไฟล์ของคู่ค้านั้น',inCode:'รหัสคู่ค้า',inAdd:'เพิ่ม',inDel:'ลบ',inMapEmpty:'ยังไม่มีรหัส',inHistory:'ประวัติการรับไฟล์',inWhen:'เวลา',inWeeks:'สัปดาห์',inBy:'ผู้นำเข้า',inDelBatch:'ลบชุดนี้',inDelConfirm:'ลบข้อมูลชุด {id}? (ข้อมูลเดิมที่ชุดนี้เคยแทนที่จะไม่กลับมา — ข้อมูลประวัติเดิมของระบบจะกลับมาแทน)',inNoBatch:'ยังไม่มีไฟล์ที่นำเข้า',inReadOnly:'ดูได้อย่างเดียว — การนำเข้าต้องมีสิทธิ์ supply.import (Planner / Admin)',ve_date:'วันที่อ่านไม่ได้: {v}',ve_monday:'ไม่ใช่วันจันทร์: {v} (เปิด "ปัดวันที่เป็นวันจันทร์" หรือแก้ไฟล์)',ve_future:'สัปดาห์อยู่ในอนาคต: {v}',ve_code:'รหัส {v} ยังไม่ได้จับคู่ SKU',ve_sku:'ไม่มี SKU {v} ในรายการสินค้า',ve_qty:'จำนวนไม่ใช่ตัวเลข: {v}',ve_neg:'จำนวนติดลบ: {v}',ve_cols:'ต้องเลือกคอลัมน์วันที่ รหัส และจำนวน',ve_acc:'คู่ค้าต้องเป็นประเภทฝากขาย',soIntakeEvent:'รับรายงาน Sales Out',soIntakeDelEvent:'ลบชุดรายงาน Sales Out',soMapEvent:'แก้ตารางแปลงรหัสสินค้าคู่ค้า',supSettingsEvent:'เปลี่ยนการตั้งค่า Supply',inStaleBanner:'ข้อมูล Sales Out ค้าง (เกิน {w} สัปดาห์ก่อน AS OF):'});
Object.assign(dict.en,{supIntake:'Sales Out intake',inTitle:'Weekly Sales Out intake (consignment accounts)',inNote:'Imports are appended — key = account × week (Monday) × SKU · an existing key is replaced or skipped · that account\'s run rate moves to its latest received week',inComplete:'Data completeness',inCompleteNote:'Received after {d} of the following week = late · click a missing cell to upload',inOk:'Received',inLate:'Late',inMissing:'Missing',inPending:'Pending',inDue:'due {d}',inHistoryData:'history',inRemCalc:'Remaining calculated',inRemCalcTip:'This account sends no remaining report — remaining is calculated; compare with the shelf counts (F8) on the consignment page',inStale:'Sales Out {n} weeks stale',inUpload:'Upload a file',inAccount:'Account',inFile:'File (CSV / XLSX)',inMapCols:'Map the columns',inColDate:'Date / week',inColCode:'Product code',inColQty:'Quantity (units)',inColValue:'Sales value (THB) — optional',inNone:'— none —',inCodeType:'Codes in the file',inCodePartner:'Partner codes (mapped by the table)',inCodeSku:'Charmiss SKU',inRound:'Round dates to the Monday of the week',inCheck:'Check the file',inRows:'{n} rows',inSummary:'{w} weeks · {s} SKUs · {q} units',inErrors:'{n} problems to fix — nothing can be imported until the file is fixed',inNoErr:'No problems found',inLine:'Line',inCol:'Column',inProblem:'Problem',inUnmapped:'Codes not mapped yet',inAddMap:'Add to the table',inDup:'{n} keys already exist',inReplace:'Replace the existing data',inSkip:'Skip (keep the existing data)',inImport:'Import {n} rows',inImported:'Imported: {n} rows ({r} replaced · {s} skipped)',inCancel:'Cancel',inWarnOver:'{sku} sold {q} in week {w}, more than the calculated remaining ({r}) — check deliveries / the shelf count',inMap:'Partner product codes',inMapNote:'Code in the partner\'s file → SKU · used for every import from that account',inCode:'Partner code',inAdd:'Add',inDel:'Remove',inMapEmpty:'No codes yet',inHistory:'Import history',inWhen:'Time',inWeeks:'Weeks',inBy:'Imported by',inDelBatch:'Remove this batch',inDelConfirm:'Remove batch {id}? (data it replaced earlier does not come back — the system history comes back instead)',inNoBatch:'No file imported yet',inReadOnly:'View only — importing needs supply.import (Planner / Admin)',ve_date:'Unreadable date: {v}',ve_monday:'Not a Monday: {v} (turn on "Round dates" or fix the file)',ve_future:'Week in the future: {v}',ve_code:'Code {v} is not mapped to a SKU',ve_sku:'No SKU {v} in the product list',ve_qty:'Quantity is not a number: {v}',ve_neg:'Negative quantity: {v}',ve_cols:'Pick the date, code and quantity columns',ve_acc:'The account must be a consignment account',soIntakeEvent:'Sales Out report received',soIntakeDelEvent:'Sales Out batch removed',soMapEvent:'Partner product codes changed',supSettingsEvent:'Supply settings changed',inStaleBanner:'Sales Out stale (more than {w} weeks before AS OF):'});

/* ---------------------------------------------------------------- storage (IndexedDB · in memory for this visit) */
const IN_KEY='so_intake';
let intake={batches:[],rows:[]},intakeRev=0,inLastMerged=null;
Supply.intakeReady=(async()=>{try{const all=await Data.Store.all(),v=all[IN_KEY];if(v&&Array.isArray(v.rows))intake={batches:v.batches||[],rows:v.rows}}catch(e){}})();
async function intakeSave(){intakeRev++;try{await Data.Store.put(IN_KEY,{batches:intake.batches,rows:intake.rows,at:new Date().toISOString()})}catch(e){toast(St('set_no_store'))}}
const inClearBefore=Data.Store.clear;Data.Store.clear=async function(){intake={batches:[],rows:[]};intakeRev++;return inClearBefore.apply(this,arguments)};
/* a fresh demo dataset starts without received reports */
const inResetBefore=supResetDataset;supResetDataset=async function(ds){try{await Data.Store.del(IN_KEY)}catch(e){}intake={batches:[],rows:[]};return inResetBefore(ds)};
const inFeedKeyBefore=Supply.feedKey;Supply.feedKey=function(){return(inFeedKeyBefore?inFeedKeyBefore():'')+'|in:'+intakeRev};
Supply.intakeStats=()=>({batches:intake.batches.length,rows:intake.rows.length});

/* ---------------------------------------------------------------- merge + snapshot roll (called by host.js buildDB) */
const inWeekOf=d=>Calc.iso(Calc.monday(Calc.dn(d)));
Supply.intakeMerge=function(base){
 if(!base){inLastMerged=base;return base}
 if(!intake.rows.length){inLastMerged=base;return base}
 const keys=new Set(intake.rows.map(r=>r.a+'|'+r.w+'|'+r.s));
 const so=base.sales_out.filter(r=>!keys.has(r.account_id+'|'+inWeekOf(r.date)+'|'+r.sku)).concat(intake.rows.map(r=>({date:r.w,sku:r.s,account_id:r.a,qty:r.q,value:r.v,_intake:r.b})));
 inLastMerged=Object.assign({},base,{sales_out:so});return inLastMerged};
Supply.intakeRoll=function(raw,base){
 if(!raw||!base||!intake.rows.length)return raw;
 const b0=base.stock_lot&&base.stock_lot[0]&&base.stock_lot[0].snapshot_date;if(!b0)return raw;
 const after=intake.rows.filter(r=>r.w>=b0);if(!after.length)return raw;
 const cur=(raw.stock_lot[0]&&raw.stock_lot[0].snapshot_date)||b0,last=after.reduce((m,r)=>r.w>m?r.w:m,''),snap=[cur,Calc.iso(Calc.dn(last)+7)].sort().pop();
 const lots=raw.stock_lot.map(r=>Object.assign({},r,{snapshot_date:snap})),need={};
 after.forEach(r=>{const k=r.a+'|'+r.s;need[k]=(need[k]||0)+(+r.q||0)});
 let short=0;Object.entries(need).forEach(([k,q])=>{const[a,s]=k.split('|');lots.filter(L=>L.location===a&&L.sku===s&&+L.qty>0).sort((x,y)=>String(x.exp_date).localeCompare(String(y.exp_date))).forEach(L=>{if(q<=0)return;const d=Math.min(q,+L.qty);L.qty=+L.qty-d;q-=d});short+=q});
 return Object.assign({},raw,{stock_lot:lots.filter(L=>+L.qty>0),_history_end:raw._history_end||b0,_intake:{moved:snap!==b0,after:after.length,short:Math.round(short),snap}})};
/* selfCheck (11): no key twice in the reported Sales Out (history + received reports) — account × week × sku */
Supply.intakeChecks=function(){const seen=new Set();let dup=0,ex='';(inLastMerged?.sales_out||[]).forEach(r=>{const k=r.account_id+'|'+inWeekOf(r.date)+'|'+r.sku;if(seen.has(k)){dup++;if(!ex)ex=k}else seen.add(k)});return[{id:'so_keys',ok:dup===0,n:dup,total:seen.size,detail:ex}]};

/* ---------------------------------------------------------------- config per account (Ops db: mapping + partner codes) */
function inCfg(acc){db.soIntakeConfig||={};return db.soIntakeConfig[acc]||(db.soIntakeConfig[acc]={cols:null,codeType:acc==='A01'?'partner':'sku',round:true,map:{},remaining:acc!=='A01'})}
function inCan(){return fuCan('supply.import')}
function inAccounts(){const A=Supply.App.DB;if(!A)return[];const lock=supLockChannel();return A.accounts.filter(a=>a.is_consignment&&(!lock||a.channel===lock))}
function inToday(){return Calc.dn(dateKey(Date.now()))}
const inDay=d=>{const[y,m,dd]=Calc.iso(d).split('-');return new Date(Date.UTC(+y,+m-1,+dd)).toLocaleDateString(lang==='th'?'th-TH-u-ca-gregory':'en-GB',{day:'numeric',month:'short',timeZone:'UTC'})};
/* week status: received (history / on time) · late · missing · pending (not due yet) */
let inIdxSrc=null,inIdx=null;
function inHave(){if(inIdxSrc!==inLastMerged){inIdxSrc=inLastMerged;inIdx=new Set((inLastMerged?.sales_out||[]).map(r=>r.account_id+'|'+inWeekOf(r.date)))}return inIdx}
function inWeekStatus(acc,w){const S=Supply.App.S,due=w+7+(S.soLateDay||3)-1;
 if(inHave().has(acc+'|'+Calc.iso(w))){const b=intake.batches.filter(b=>b.a===acc&&b.weeks.includes(Calc.iso(w))).sort((x,y)=>x.at-y.at)[0];if(!b)return{k:'ok',hist:true};return{k:Calc.dn(dateKey(b.at))>due?'late':'ok',at:b.at}}
 return{k:inToday()>due?'missing':'pending',due}}

/* ---------------------------------------------------------------- file → rows → checks */
let inDraft=null,inMapAcc='';
function inParseDay(v){if(v instanceof Date&&!isNaN(v))return Math.round((v.getTime()-v.getTimezoneOffset()*60000)/864e5);   // Excel dates can be a few seconds off midnight
 
 if(typeof v==='number'&&v>20000&&v<80000)return Math.floor(v)-25569;
 const s=String(v??'').trim(),ok=(y,mo,d)=>{const x=new Date(Date.UTC(y,mo-1,d));return x.getUTCFullYear()===y&&x.getUTCMonth()===mo-1&&x.getUTCDate()===d?Date.UTC(y,mo-1,d)/864e5:null};   // a real calendar day only
 let m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);if(m)return ok(+m[1],+m[2],+m[3]);
 m=/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/.exec(s);if(m){let y=+m[3];if(y<100)y+=2000;if(y>2400)y-=543;return ok(y,+m[2],+m[1])}return null}
function inGuess(h){const f=re=>h.find(x=>re.test(x))||'';return{date:f(/date|วันที่|สัปดาห์|week/i),code:f(/sku|code|รหัส|item|barcode/i),qty:f(/qty|จำนวน|ชิ้น|unit|ขายได้/i),value:f(/value|amount|บาท|baht|thb/i)}}
async function inReadFile(file){
 if(/\.xlsx?$/i.test(file.name)){const wb=XLSX.read(await file.arrayBuffer(),{cellDates:true}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:'',raw:true});return{headers:rows.length?Object.keys(rows[0]):[],rows}}
 const res=Papa.parse((await file.text()).replace(/^﻿/,''),{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim()});return{headers:res.meta.fields||[],rows:res.data}}
function inValidate(d){
 const A=Supply.App.DB,cfg=inCfg(d.acc),errors=[],agg=new Map(),unmapped=new Set(),skus=new Set(A.skus.map(s=>s.sku)),today=Calc.monday(inToday()),acc=A.accounts.find(a=>a.account_id===d.acc);
 const err=(line,col,msg,v)=>errors.push({line,col,msg,v:String(v??'')});
 if(!acc||!acc.is_consignment)err(1,'',('ve_acc'));
 if(!d.cols.date||!d.cols.code||!d.cols.qty){err(1,'','ve_cols');return{errors,rows:[],unmapped:[],dup:0,weeks:[]}}
 d.rows.forEach((r,k)=>{const line=k+2;if(Object.values(r).every(v=>String(v??'').trim()===''))return;
  const day=inParseDay(r[d.cols.date]);let w=null;
  if(day==null)err(line,d.cols.date,'ve_date',r[d.cols.date]);else{w=Calc.monday(day);if(w!==day&&!d.round)err(line,d.cols.date,'ve_monday',r[d.cols.date]);if(w>today)err(line,d.cols.date,'ve_future',Calc.iso(w))}
  const code=String(r[d.cols.code]??'').trim();let sku=null;
  if(d.codeType==='sku'){if(skus.has(code))sku=code;else err(line,d.cols.code,'ve_sku',code)}else{sku=cfg.map[code]||null;if(!sku){unmapped.add(code);err(line,d.cols.code,'ve_code',code)}}
  const qs=String(r[d.cols.qty]??'').replace(/,/g,'').trim(),q=Number(qs);
  if(qs===''||!isFinite(q))err(line,d.cols.qty,'ve_qty',r[d.cols.qty]);else if(q<0)err(line,d.cols.qty,'ve_neg',q);
  const vs=d.cols.value?String(r[d.cols.value]??'').replace(/,/g,'').trim():'',v=vs===''?null:Number(vs);
  if(w!=null&&sku&&qs!==''&&isFinite(q)&&q>=0){const key=Calc.iso(w)+'|'+sku,x=agg.get(key)||{w:Calc.iso(w),s:sku,q:0,v:0,hasV:false};x.q+=q;if(v!=null&&isFinite(v)){x.v+=v;x.hasV=true}agg.set(key,x)}});
 const rows=[...agg.values()],j=A.accIdx.get(d.acc);
 rows.forEach(x=>{if(!x.hasV){const i=A.skuIdx.get(x.s);x.v=Math.round(x.q*(i!=null&&j!=null?A.price[i][j]:0)*100)/100}});
 const have=new Set((inLastMerged?.sales_out||[]).filter(r=>r.account_id===d.acc).map(r=>inWeekOf(r.date)+'|'+r.sku));
 const dup=rows.filter(x=>have.has(x.w+'|'+x.s)).length,weeks=[...new Set(rows.map(x=>x.w))].sort();
 // warning (does not block): a new week sells more than the calculated remaining at the current snapshot
 const warn=[];rows.filter(x=>Calc.dn(x.w)>=A.snapDn).forEach(x=>{const i=A.skuIdx.get(x.s);if(i==null||j==null)return;const rem=Calc.stockAt(A,i,A.snapDn).cons[j];if(x.q>rem+0.5)warn.push({sku:x.s,w:x.w,q:x.q,r:Math.round(rem)})});
 return{errors,rows,unmapped:[...unmapped].filter(Boolean),dup,weeks,warn}}
async function inImport(){const d=inDraft,P=d&&d.preview;if(!d||!P||P.errors.length||!inCan())return;
 const mode=P.dup?(d.mode||'replace'):'replace',have=new Set((inLastMerged?.sales_out||[]).filter(r=>r.account_id===d.acc).map(r=>inWeekOf(r.date)+'|'+r.sku));
 const id='SOI-'+String(Date.now()).slice(-8);let replaced=0,skipped=0;const add=[];
 P.rows.forEach(x=>{const k=x.w+'|'+x.s;if(have.has(k)){if(mode==='skip'){skipped++;return}replaced++}add.push({b:id,a:d.acc,w:x.w,s:x.s,q:x.q,v:x.v})});
 const keys=new Set(add.map(r=>r.a+'|'+r.w+'|'+r.s));intake.rows=intake.rows.filter(r=>!keys.has(r.a+'|'+r.w+'|'+r.s)).concat(add);
 const b={id,a:d.acc,file:d.file,at:Date.now(),by:stockActorName(),weeks:[...new Set(add.map(r=>r.w))].sort(),rows:add.length,replaced,skipped,qty:add.reduce((x,r)=>x+r.q,0)};intake.batches.unshift(b);
 await intakeSave();const cfg=inCfg(d.acc);cfg.cols={...d.cols};cfg.codeType=d.codeType;cfg.round=d.round;
 opsAudit('soIntakeEvent',id+' · '+d.acc+' · '+d.file+' · '+b.weeks.join(', '),[d.acc],null,{rows:b.rows,replaced,skipped,qty:b.qty,mode});
 inDraft=null;await Supply.ensureData();render();toast(tp('inImported',{n:n(b.rows),r:n(replaced),s:n(skipped)}))}
async function inDeleteBatch(id){if(!inCan())return;const b=intake.batches.find(x=>x.id===id);if(!b||!confirm(tp('inDelConfirm',{id})))return;
 intake.rows=intake.rows.filter(r=>r.b!==id);intake.batches=intake.batches.filter(x=>x.id!==id);await intakeSave();
 opsAudit('soIntakeDelEvent',id+' · '+b.a+' · '+b.file,[b.a],{rows:b.rows,weeks:b.weeks},null);await Supply.ensureData();render()}
function inMapSet(acc,code,sku){if(!inCan()||!opsSafeText(code,60))return;const cfg=inCfg(acc),before=cfg.map[code]||null;if(sku)cfg.map[code]=sku;else delete cfg.map[code];
 opsAudit('soMapEvent',acc+' · '+code+' → '+(sku||'—'),[acc],before,sku||null);persist()}

/* ---------------------------------------------------------------- page (Ops style, like the proposals page) */
function supIntakePage(){
 const App=Supply.App;if(!App.DB){Supply.ensureData().then(()=>{if(view==='supIntake')render()});return `<section class="panel"><div class="panelbody">…</div></section>`}
 const S=App.S,accs=inAccounts(),can=inCan(),W=Math.max(1,Math.min(26,S.soCompleteW||8)),w1=Calc.monday(inToday()),weeks=Array.from({length:W},(_,k)=>w1-7*(W-1-k));
 const dayName=['','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์','อาทิตย์'][S.soLateDay||3],dayEn=['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][S.soLateDay||3];
 const cell=(a,w)=>{const st=inWeekStatus(a.account_id,w),cls={ok:'ok',late:'warn',missing:'bad',pending:''}[st.k],tip=st.k==='pending'||st.k==='missing'?tp('inDue',{d:inDay(st.due)}):st.hist?t('inHistoryData'):st.at?ecomTime(st.at):'';
  const lab=t({ok:'inOk',late:'inLate',missing:'inMissing',pending:'inPending'}[st.k]);
  return `<td>${can&&st.k!=='ok'&&st.k!=='late'?`<button type="button" class="pill ${cls} in-cell" data-in-acc="${a.account_id}" data-in-week="${Calc.iso(w)}" title="${esc(tip)}">${lab}</button>`:`<span class="pill ${cls}" title="${esc(tip)}">${lab}</span>`}</td>`};
 const asLatest=App.DB.maxAsOf,stale=a=>Calc.staleWeeks(App.DB,a.j,asLatest);
 const accCell=a=>`<td><b>${esc(a.name)}</b><small>${a.account_id}${inCfg(a.account_id).remaining?'':` · <span class="pill" title="${esc(t('inRemCalcTip'))}">${t('inRemCalc')}</span>`}${stale(a)>(S.staleW??2)?` · <span class="pill bad">${tp('inStale',{n:stale(a)})}</span>`:''}</small></td>`;
 let html=`<div class="banner"><span>⇪ &nbsp; ${t('inTitle')}</span><span>${t('inNote')}</span></div>`;
 html+=`<section class="panel" id="inComplete"><div class="panelhead"><h2>${t('inComplete')}</h2><span class="muted small">${tp('inCompleteNote',{d:lang==='th'?dayName:dayEn})}</span></div>${opsTable([t('inAccount'),...weeks.map(w=>inDay(w))],accs.map(a=>`<tr>${accCell(a)}${weeks.map(w=>cell(a,w)).join('')}</tr>`))}</section>`;
 if(can)html+=inUploadPanel(accs)+inMapPanel(accs);else html+=`<section class="panel"><div class="panelbody"><p class="muted">${t('inReadOnly')}</p></div></section>`;
 const bl=intake.batches.filter(b=>accs.some(a=>a.account_id===b.a));
 html+=`<section class="panel" id="inHistory"><div class="panelhead"><h2>${t('inHistory')}</h2><span class="pill">${n(bl.length)}</span></div>${bl.length?opsTable([t('inWhen'),t('inAccount'),t('inFile'),t('inWeeks'),t('inRows').replace('{n} ',''),t('inBy'),''],bl.map(b=>`<tr><td>${ecomTime(b.at)}<small>${b.id}</small></td><td>${esc(App.DB.accounts.find(a=>a.account_id===b.a)?.name||b.a)}</td><td>${esc(b.file)}</td><td>${b.weeks.map(w=>inDay(Calc.dn(w))).join(', ')}</td><td>${n(b.rows)}<small>${n(b.qty)} · ${n(b.replaced)} / ${n(b.skipped)}</small></td><td>${esc(b.by)}</td><td>${can?`<button class="quiet" data-in-del="${b.id}">${t('inDelBatch')}</button>`:''}</td></tr>`)):`<div class="panelbody"><p class="muted">${t('inNoBatch')}</p></div>`}</section>`;
 return html}
function inUploadPanel(accs){const d=inDraft,opt=(v,sel)=>`<option value="${esc(v)}" ${v===sel?'selected':''}>${esc(v)}</option>`;
 let h=`<section class="panel" id="inUpload"><div class="panelhead"><h2>${t('inUpload')}</h2></div><div class="panelbody"><div class="formgrid"><label>${t('inAccount')}<select id="inAcc">${accs.map(a=>`<option value="${a.account_id}" ${d?.acc===a.account_id?'selected':''}>${esc(a.name)} (${a.account_id})</option>`).join('')}</select></label><label>${t('inFile')}<input type="file" id="inFile" accept=".csv,.xlsx,.xls,text/csv"></label></div>`;
 if(d){const cols=d.cols;
  h+=`<p class="small"><b>${esc(d.file)}</b> · ${tp('inRows',{n:n(d.rows.length)})}${d.week?` · ${t('inWeeks')} ${inDay(Calc.dn(d.week))}`:''}</p><h3 style="margin:14px 0 8px">${t('inMapCols')}</h3><div class="formgrid">
   ${[['date','inColDate'],['code','inColCode'],['qty','inColQty'],['value','inColValue']].map(([k,l])=>`<label>${t(l)}<select data-in-col="${k}">${k==='value'?`<option value="">${t('inNone')}</option>`:''}${d.headers.map(x=>opt(x,cols[k])).join('')}</select></label>`).join('')}
   <label>${t('inCodeType')}<select id="inCodeType"><option value="partner" ${d.codeType==='partner'?'selected':''}>${t('inCodePartner')}</option><option value="sku" ${d.codeType==='sku'?'selected':''}>${t('inCodeSku')}</option></select></label>
   <label class="checkline"><input type="checkbox" id="inRound" ${d.round?'checked':''}> ${t('inRound')}</label></div>
   <div class="dialogactions" style="justify-content:flex-start"><button class="primary" id="inCheck">${t('inCheck')}</button><button class="quiet" id="inCancel">${t('inCancel')}</button></div>`;
  const P=d.preview;
  if(P){const qty=P.rows.reduce((x,r)=>x+r.q,0);
   h+=`<div class="in-preview"><p><b>${tp('inSummary',{w:n(P.weeks.length),s:n(new Set(P.rows.map(r=>r.s)).size),q:n(qty)})}</b> · ${P.weeks.map(w=>inDay(Calc.dn(w))).join(', ')}</p>`;
   if(P.errors.length){h+=`<p class="err">${tp('inErrors',{n:n(P.errors.length)})}</p>${opsTable([t('inLine'),t('inCol'),t('inProblem')],P.errors.slice(0,50).map(e=>`<tr><td>${e.line}</td><td>${esc(e.col)}</td><td>${esc(tp(e.msg,{v:e.v}))}</td></tr>`))}`;
    if(P.unmapped.length&&d.codeType==='partner')h+=`<h3 style="margin:14px 0 8px">${t('inUnmapped')}</h3><div class="in-unmapped">${P.unmapped.slice(0,30).map(c=>`<span class="in-um"><code>${esc(c)}</code><select data-in-um="${esc(c)}"><option value="">SKU…</option>${Supply.App.DB.skus.map(s=>`<option value="${s.sku}">${s.sku} · ${esc(s.name)}</option>`).join('')}</select></span>`).join('')}</div>`}
   else h+=`<p class="pill ok">${t('inNoErr')}</p>`;
   P.warn.slice(0,10).forEach(x=>{h+=`<p class="small warn-text">⚠ ${esc(tp('inWarnOver',{sku:x.sku,w:inDay(Calc.dn(x.w)),q:n(x.q),r:n(x.r)}))}</p>`});
   if(P.dup)h+=`<p><b>${tp('inDup',{n:n(P.dup)})}</b></p><label class="checkline"><input type="radio" name="inMode" value="replace" ${(d.mode||'replace')==='replace'?'checked':''}> ${t('inReplace')}</label><label class="checkline"><input type="radio" name="inMode" value="skip" ${d.mode==='skip'?'checked':''}> ${t('inSkip')}</label>`;
   h+=`<div class="dialogactions" style="justify-content:flex-start"><button class="primary" id="inGo" ${P.errors.length?'disabled':''}>${tp('inImport',{n:n(P.dup&&d.mode==='skip'?P.rows.length-P.dup:P.rows.length)})}</button></div></div>`}}
 return h+`</div></section>`}
function inMapPanel(accs){if(!inMapAcc||!accs.some(a=>a.account_id===inMapAcc))inMapAcc=accs[0]?.account_id||'';const cfg=inCfg(inMapAcc),A=Supply.App.DB,rows=Object.entries(cfg.map).sort((a,b)=>a[0].localeCompare(b[0]));
 return `<section class="panel" id="inMapPanel"><div class="panelhead"><h2>${t('inMap')}</h2><select id="inMapAcc">${accs.map(a=>`<option value="${a.account_id}" ${a.account_id===inMapAcc?'selected':''}>${esc(a.name)}</option>`).join('')}</select></div><div class="panelbody"><p class="small">${t('inMapNote')}</p>
  <div class="formgrid"><label>${t('inCode')}<input id="inMapCode" maxlength="60"></label><label>SKU<select id="inMapSku">${A.skus.map(s=>`<option value="${s.sku}">${s.sku} · ${esc(s.name)}</option>`).join('')}</select></label><label>&nbsp;<button id="inMapAdd">${t('inAdd')}</button></label></div></div>
  ${rows.length?opsTable([t('inCode'),'SKU',''],rows.map(([c,s])=>`<tr><td><code>${esc(c)}</code></td><td>${esc(s)}<small>${esc(A.skus.find(k=>k.sku===s)?.name||'')}</small></td><td><button class="quiet" data-in-unmap="${esc(c)}">${t('inDel')}</button></td></tr>`)):`<div class="panelbody"><p class="muted">${t('inMapEmpty')}</p></div>`}</section>`}
function inBind(){
 const startDraft=async(file,acc,week)=>{const r=await inReadFile(file),cfg=inCfg(acc),g=inGuess(r.headers),cols=cfg.cols&&r.headers.includes(cfg.cols.date)?{...cfg.cols}:g;
  inDraft={acc,file:file.name,headers:r.headers,rows:r.rows,cols,codeType:cfg.codeType,round:cfg.round,week,preview:null,mode:'replace'};render()};
 $('#inFile')?.addEventListener('change',e=>{const f=e.target.files[0];if(f)startDraft(f,$('#inAcc').value,e.target.dataset.week||null)});
 $('#inAcc')?.addEventListener('change',e=>{if(inDraft){inDraft.acc=e.target.value;const c=inCfg(inDraft.acc);inDraft.codeType=c.codeType;inDraft.preview=null;render()}});
 document.querySelectorAll('[data-in-col]').forEach(s=>s.onchange=()=>{inDraft.cols[s.dataset.inCol]=s.value;inDraft.preview=null});
 $('#inCodeType')&&($('#inCodeType').onchange=e=>{inDraft.codeType=e.target.value;inDraft.preview=null});
 $('#inRound')&&($('#inRound').onchange=e=>{inDraft.round=e.target.checked;inDraft.preview=null});
 $('#inCheck')&&($('#inCheck').onclick=()=>{document.querySelectorAll('[data-in-col]').forEach(s=>inDraft.cols[s.dataset.inCol]=s.value);inDraft.preview=inValidate(inDraft);render()});
 $('#inCancel')&&($('#inCancel').onclick=()=>{inDraft=null;render()});
 document.querySelectorAll('input[name="inMode"]').forEach(r=>r.onchange=()=>{inDraft.mode=r.value;render()});
 $('#inGo')&&($('#inGo').onclick=e=>{e.target.disabled=true;inImport()});
 document.querySelectorAll('[data-in-um]').forEach(s=>s.onchange=()=>{if(!s.value)return;inMapSet(inDraft.acc,s.dataset.inUm,s.value);inDraft.preview=inValidate(inDraft);render()});
 document.querySelectorAll('[data-in-acc]').forEach(b=>b.onclick=()=>{const acc=b.dataset.inAcc;if(!inDraft||inDraft.acc!==acc)inDraft=null;$('#inAcc').value=acc;inDraft&&(inDraft.week=b.dataset.inWeek);$('#inUpload').scrollIntoView({behavior:'smooth',block:'start'});const fi=$('#inFile');fi.dataset.week=b.dataset.inWeek;fi.click()});
 $('#inMapAcc')&&($('#inMapAcc').onchange=e=>{inMapAcc=e.target.value;render()});
 $('#inMapAdd')&&($('#inMapAdd').onclick=()=>{const c=$('#inMapCode').value.trim();if(c){inMapSet(inMapAcc,c,$('#inMapSku').value);render()}});
 document.querySelectorAll('[data-in-unmap]').forEach(b=>b.onclick=()=>{inMapSet(inMapAcc,b.dataset.inUnmap,null);render()});
 document.querySelectorAll('[data-in-del]').forEach(b=>b.onclick=()=>inDeleteBatch(b.dataset.inDel));
 const tw=document.querySelector('#inComplete .tablewrap');if(tw)tw.scrollLeft=tw.scrollWidth}   // phones: open on the latest weeks

/* ---------------------------------------------------------------- menu · gate · routing */
SUP_ICON.supIntake='⇪';
SUP_ROLE_PAGES.director=[...SUP_PLAN,'supIntake'];SUP_ROLE_PAGES.manager.push('supIntake');SUP_ROLE_PAGES.planner.push('supIntake');SUP_ROLE_PAGES.admin.push('supIntake');
(SUP_NAV_GROUPS.find(g=>g[0]==='supset')||[,,[]])[2].push('supIntake');
const inPagesBefore=supPages;supPages=function(){const l=inPagesBefore(),lock=supLockChannel();return lock&&lock!=='MT'?l.filter(v=>v!=='supIntake'):l};   // only MT has consignment accounts
const inCanVisitBefore=supCanVisit;supCanVisit=function(v){if(v==='supIntake')return Supply.isView(v)&&supPages().includes(v)&&(fuCan('supply.import')||fuCan('supply.view'));return inCanVisitBefore(v)};
const inPageBefore=page;page=function(){if(view==='supIntake')return supCanVisit(view)?supIntakePage():`<section class="panel"><div class="empty">${t('workDenied')}</div></section>`;return inPageBefore()};
const inBindBefore=bind;bind=function(){inBindBefore();if(view==='supIntake'&&supCanVisit(view)){if(location.hash!=='#/supply/intake')history.replaceState(null,'','#/supply/intake');inBind()}};

/* ---------------------------------------------------------------- R1 4.2 · "stale" label on every Supply page + settings audit */
const inAfterBefore=Supply.afterRender;Supply.afterRender=function(main){inAfterBefore&&inAfterBefore(main);
 const App=Supply.App;if(!App.DB||!App.F||!main)return;const M=App.model(),W=App.S.staleW??2;
 const list=App.DB.accounts.filter(a=>M.mask[a.j]&&(a.is_consignment||App.DB.lastSOW[a.j]>=0)).map(a=>[a,Calc.staleWeeks(App.DB,a.j,M.asDn)]).filter(([,s])=>s>W);
 main.querySelector('.sup-stale')?.remove();
 if(list.length)main.insertAdjacentHTML('afterbegin',`<div class="note sup-stale">${U.icon('alert')}<span>${esc(tp('inStaleBanner',{w:W}))} ${list.map(([a,s])=>`<b>${esc(a.name)}</b> ${esc(tp('inStale',{n:s}))}`).join(' · ')}</span></div>`)};
const inSaveBefore=Supply.App.saveSettings;Supply.App.saveSettings=function(next){const before=JSON.parse(JSON.stringify(Supply.App.S));const r=inSaveBefore.call(this,next);
 const ch=Object.keys(Object.assign({},before,Supply.App.S)).filter(k=>JSON.stringify(before[k])!==JSON.stringify(Supply.App.S[k]));
 if(ch.length&&session){const pick=o=>Object.fromEntries(ch.map(k=>[k,o[k]]));opsAudit('supSettingsEvent',ch.join(', '),[],pick(before),pick(Supply.App.S))}return r};

/* ---------------------------------------------------------------- Integrated demo: 7-Eleven sends its own item codes — the table is ready */
const inSeedBefore=supFeedSeed;supFeedSeed=function(base){inSeedBefore(base);db.soIntakeConfig={};const idx=new Map(base.sku_master.map((s,k)=>[s.sku,k]));
 const a01=[...new Set(base.sales_out.filter(r=>r.account_id==='A01').map(r=>r.sku))].sort(),cfg=inCfg('A01');
 a01.forEach(s=>{cfg.map[String(71100000+(idx.get(s)+1)*13)]=s})};
