/* cr04-lists.js — CR-04 · I10 one date format · R4 opsFilterBar + Date Range Picker (7 list pages) · R3 order stages as one tab row · R5 customer cards */
Object.assign(dict.th,{c5Pay:'ชำระ',c5Ship:'จัดส่ง',c5Doc:'เอกสาร',ofbSearch:'ค้นหา',ofbDate:'ช่วงวันที่',ofbType:'ช่องทาง',ofbPartner:'คู่ค้า',ofbPartnerPh:'คู่ค้า (พิมพ์ค้นหา)',ofbTypeAll:'ทั้งหมดในสิทธิ์ของคุณ',ofbMore:'ตัวกรองเพิ่มเติม',ofbFilters:'ตัวกรอง',ofbClear:'ล้างทั้งหมด',ofbFound:'พบ {n} รายการ',ofbDone:'เสร็จ',ofbSales:'พนักงานขาย',ofbArea:'พื้นที่ขาย',ofbDoc:'สถานะเอกสาร',ofbOrigin:'ช่องทางร้าน',ofbReason:'เหตุผล',ofbStatus:'สถานะ',ofbActor:'ผู้ทำ',ofbRemove:'ลบตัวกรอง {f}',
 drp_today:'วันนี้',drp_7d:'7 วัน',drp_30d:'30 วัน',drp_month:'เดือนนี้',drp_lastMonth:'เดือนก่อน',drp_plan:'รอบแผนนี้',drp_custom:'กำหนดเอง',drp_all:'ทุกวันที่',drp_pickStart:'เลือกวันเริ่ม',drp_pickEnd:'เลือกวันสิ้นสุด',drp_pick:'เลือกวันที่',drp_apply:'ใช้ช่วงนี้',drp_prev:'เดือนก่อนหน้า',drp_next:'เดือนถัดไป',
 st_all:'ทั้งหมด',st_confirm:'รอยืนยัน',st_pay:'รอชำระ / ตรวจชำระ',st_docs:'รอ SO / IV',st_pick:'รอจัดส่ง (หยิบ-แพ็ก)',st_transit:'ระหว่างขนส่ง',st_done:'ส่งสำเร็จ',st_closed:'คืน / ยกเลิก',
 ordNext:'งานถัดไป',ordState:'ชำระ · จัดส่ง · เอกสาร',ordDocNone:'ยังไม่มี SO',ordDocSO:'SO',ordDocIV:'IV',ordSum:'{n} รายการ · ฿{v}',ordDocNoSO:'ยังไม่มี SO',ordDocSOnoIV:'มี SO ยังไม่มี IV',ordDocIVdone:'มี IV แล้ว',
 cuTotal:'ลูกค้าทั้งหมด',cuNew:'ใหม่ในช่วงนี้ {n}',cuSpend:'ยอดซื้อรวม',cuSpendVs:'{d} เทียบช่วงก่อน',cuSpendNoPrev:'ช่วงก่อนไม่มียอด',cuAov:'ยอดเฉลี่ยต่อออเดอร์ (AOV)',cuAovSub:'{n} ออเดอร์ในช่วง',cuRepeat:'อัตราซื้อซ้ำ',cuRepeatSub:'{a}/{b} ราย · ซื้อ ≥ 2 ครั้งใน {d} วัน',cuQuiet:'ลูกค้าเงียบ',cuQuietSub:'ไม่มีออเดอร์ > {d} วัน',cuMainCh:'ช่องทางหลัก',cuDupPhone:'เบอร์ซ้ำ',cuDupTip:'ลูกค้ามากกว่า 1 รายใช้เบอร์นี้ — ตรวจสอบเพื่อรวมข้อมูล (ระบบไม่รวมให้อัตโนมัติ)',cuOrders:'ออเดอร์ (ช่วงนี้)',cuSpendCol:'ยอดซื้อรวม (ช่วงนี้)',cuFilterOn:'แสดง: {c}',cuFilterOff:'แสดงทั้งหมด',cuLast:'ออเดอร์ล่าสุด',cuNoCards:'ไม่มีลูกค้าในช่วงนี้'});
Object.assign(dict.en,{c5Pay:'Payment',c5Ship:'Shipping',c5Doc:'Docs',ofbSearch:'Search',ofbDate:'Date range',ofbType:'Channel',ofbPartner:'Partner',ofbPartnerPh:'Partner (type to search)',ofbTypeAll:'Everything you can access',ofbMore:'More filters',ofbFilters:'Filters',ofbClear:'Clear all',ofbFound:'{n} found',ofbDone:'Done',ofbSales:'Salesperson',ofbArea:'Sales area',ofbDoc:'Document status',ofbOrigin:'Store channel',ofbReason:'Reason',ofbStatus:'Status',ofbActor:'Actor',ofbRemove:'Remove filter {f}',
 drp_today:'Today',drp_7d:'7 days',drp_30d:'30 days',drp_month:'This month',drp_lastMonth:'Last month',drp_plan:'This plan period',drp_custom:'Custom',drp_all:'Any date',drp_pickStart:'Pick a start date',drp_pickEnd:'Pick an end date',drp_pick:'Pick a date',drp_apply:'Use this range',drp_prev:'Previous month',drp_next:'Next month',
 st_all:'All',st_confirm:'To confirm',st_pay:'Payment / check',st_docs:'Awaiting SO / IV',st_pick:'To ship (pick-pack)',st_transit:'In transit',st_done:'Delivered',st_closed:'Returned / cancelled',
 ordNext:'Next step',ordState:'Payment · shipping · documents',ordDocNone:'No SO yet',ordDocSO:'SO',ordDocIV:'IV',ordSum:'{n} orders · ฿{v}',ordDocNoSO:'No SO yet',ordDocSOnoIV:'SO without IV',ordDocIVdone:'IV issued',
 cuTotal:'Customers',cuNew:'{n} new in this range',cuSpend:'Total spend',cuSpendVs:'{d} vs the previous range',cuSpendNoPrev:'no spend in the previous range',cuAov:'Average order value (AOV)',cuAovSub:'{n} orders in range',cuRepeat:'Repeat rate',cuRepeatSub:'{a}/{b} customers · ≥ 2 orders in {d} days',cuQuiet:'Quiet customers',cuQuietSub:'no order for > {d} days',cuMainCh:'Main channel',cuDupPhone:'Shared phone',cuDupTip:'More than one customer uses this phone — check and merge by hand (never merged automatically)',cuOrders:'Orders (range)',cuSpendCol:'Spend (range)',cuFilterOn:'Showing: {c}',cuFilterOff:'Show all',cuLast:'Last order',cuNoCards:'No customers in this range'});

/* ---------------------------------------------------------------- I10 · one helper for dates on Ops pages (Gregorian year, DD MMM YYYY) */
(()=>{const P=Date.prototype,ld=P.toLocaleDateString,ls=P.toLocaleString,ops=l=>l==='th-TH'||l==='en-GB';
 P.toLocaleDateString=function(l,o){return ops(l)&&!(o&&(o.month||o.dateStyle||o.weekday))&&!isNaN(this)?fmtDate(this.getTime()):ld.call(this,l,o)};
 P.toLocaleString=function(l,o){return ops(l)&&!(o&&(o.month||o.dateStyle||o.hour||o.weekday))&&!isNaN(this)?fmtDateTime(this.getTime()):ls.call(this,l,o)}})();
/** ISO dates printed as text in Ops tables (dateKey(...)) → DD MMM YYYY · never inside Supply pages, inputs or code */
function cr4DateSweep(root){if(!root||root.closest?.('.sup'))return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:x=>/\b\d{4}-\d{2}-\d{2}\b/.test(x.nodeValue)&&!x.parentElement.closest('.sup,script,style,textarea,pre,code,option,[data-raw-date]')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}),list=[];
 while(w.nextNode())list.push(w.currentNode);list.forEach(x=>{x.nodeValue=x.nodeValue.replace(/\b(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::\d{2})?)?\b/g,(m,d,tm)=>fmtDate(d)+(tm?' '+tm:''))})}
/** date fields in Ops forms: the picker (single mode) instead of the browser's mm/dd/yyyy box — the form still posts ISO */
function cr4DateInputs(root){(root||document).querySelectorAll('input[type="date"]:not([data-cr4-date])').forEach(inp=>{if(inp.closest('.sup'))return;inp.dataset.cr4Date='1';inp.type='hidden';
 const b=document.createElement('button');b.type='button';b.className='ofb-datein';b.dataset.drpInput='1';b.disabled=inp.disabled;b.setAttribute('aria-label',(inp.getAttribute('aria-label')||inp.name||'')+' · '+t('drp_pick'));b.textContent='📅 '+(inp.value?fmtDate(inp.value):t('drp_pick'));inp.after(b);b._inp=inp})}

/* ---------------------------------------------------------------- dates: presets + plan period */
function cr4AddDays(iso,k){const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+k);return d.toISOString().slice(0,10)}
function cr4MonthEnd(ym){const d=new Date(Date.UTC(+ym.slice(0,4),+ym.slice(5,7),0,12));return d.toISOString().slice(0,10)}
function cr4AddMonth(ym,k){const d=new Date(Date.UTC(+ym.slice(0,4),+ym.slice(5,7)-1+k,1,12));return d.toISOString().slice(0,7)}
const DRP_PRESETS=['today','7d','30d','month','lastMonth','plan'];
function cr4Preset(k){const td=opsDay(),ym=td.slice(0,7);switch(k){case'today':return[td,td];case'7d':return[cr4AddDays(td,-6),td];case'30d':return[cr4AddDays(td,-29),td];case'month':return[ym+'-01',cr4MonthEnd(ym)];
 case'lastMonth':{const p=cr4AddMonth(ym,-1);return[p+'-01',cr4MonthEnd(p)]}case'plan':{const p=cr4PlanPeriod();return[p+'-01',cr4MonthEnd(p)]}default:return['','']}}
function cr4Range(s){return s.d==='custom'?[s.from||'',s.to||'']:cr4Preset(s.d)}
function cr4InRange(day,s){const[a,b]=cr4Range(s);return(!a||day>=a)&&(!b||day<=b)}

/* ---------------------------------------------------------------- R4 · filter state (URL + sessionStorage per page) */
const OFB_PAGES={orders:['orders','payments','shipping'],customers:['customers'],documents:['documents'],workQueue:['workQueue'],returns:['returns'],reports:['reports'],audit:['audit']};
const OFB_DEF={orders:{q:'',d:'plan',type:'all',partner:'all',sales:'all',area:'all',doc:'all',origin:'all',sort:'date',dir:'desc',tab:'all'},customers:{q:'',d:'plan',type:'all',partner:'all',card:'',sort:'spend',dir:'desc'},
 documents:{q:'',d:'plan',type:'all',partner:'all',kind:'all'},workQueue:{q:'',d:'all',type:'all',partner:'all',reason:'all'},returns:{q:'',d:'plan',type:'all',partner:'all',status:'all'},reports:{d:'today',type:'all',partner:'all',status:'all'},audit:{q:'',d:'plan',actor:'all'}};
const OFB={};
function ofbPageOf(v){return Object.keys(OFB_PAGES).find(k=>OFB_PAGES[k].includes(v))||null}
function ofbFromHash(id){const m=location.hash.match(/^#([A-Za-z]+)\?(.*)$/);if(!m||ofbPageOf(m[1])!==id)return null;const o={};new URLSearchParams(m[2]).forEach((v,k)=>{if(k in OFB_DEF[id]||k==='from'||k==='to')o[k]=v});return o}
function ofbState(id){if(!OFB[id]){const s={...OFB_DEF[id],from:'',to:''};try{Object.assign(s,JSON.parse(sessionStorage.getItem('ofb.'+id)||'{}'))}catch{}const u=ofbFromHash(id);if(u)Object.assign(s,u);OFB[id]=s}return OFB[id]}
function ofbSave(id){const s=OFB[id];if(!s)return;try{sessionStorage.setItem('ofb.'+id,JSON.stringify(s))}catch{}if(ofbPageOf(view)!==id||selectedOrderId)return;const d=OFB_DEF[id],p=new URLSearchParams();
 Object.keys(s).forEach(k=>{if(k==='from'||k==='to'){if(s.d==='custom'&&s[k])p.set(k,s[k])}else if(s[k]!==d[k]&&s[k]!==''&&s[k]!=null)p.set(k,s[k])});const h='#'+view+(String(p)?'?'+p:'');if(location.hash!==h)history.replaceState(null,'',location.pathname+location.search+h)}
function ofbReset(id,key){const s=ofbState(id),d=OFB_DEF[id];if(key){if(key==='d'){s.d=d.d;s.from=s.to=''}else s[key]=d[key];if(key==='type')s.partner='all'}else{Object.assign(s,{...d,from:'',to:'',sort:s.sort,dir:s.dir,tab:s.tab})}}
function ofbScopePartners(type){return db.partners.filter(visiblePartner).filter(p=>!type||type==='all'||p.type===type)}
function ofbTypeLabel(v){return v==='all'?t('ofbTypeAll'):v==='EC'?'E-commerce':v}

/** the one filter bar: search (wide) · date range · channel · partner (typeahead) · "More filters (n)" · active chips · found count.
    cfg: {id, q:placeholder|false, date:true|false, type:true|false, partner:true|false, more:[{key,label,opts:[[v,text]]}], count} */
function opsFilterBar(cfg){const id=cfg.id,s=ofbState(id),d=OFB_DEF[id],more=cfg.more||[],moreN=more.filter(f=>s[f.key]!==d[f.key]).length;
 const types=cfg.type?workGroupChoices():[],ps=cfg.partner?ofbScopePartners(s.type):[],pName=s.partner!=='all'?(partner(s.partner)?.name||s.partner):'',[a,b]=cfg.date?cr4Range(s):['',''];
 const dateTxt=s.d==='custom'?fmtRange(a,b):s.d==='all'?t('drp_all'):t('drp_'+s.d)+' · '+fmtRange(a,b);
 const chips=[];if(cfg.q!==false&&s.q)chips.push(['q',`“${s.q}”`]);if(cfg.date&&s.d!==d.d)chips.push(['d',dateTxt]);if(cfg.type&&s.type!=='all')chips.push(['type',`${t('ofbType')}: ${ofbTypeLabel(s.type)}`]);if(cfg.partner&&s.partner!=='all')chips.push(['partner',`${t('ofbPartner')}: ${pName}`]);
 more.forEach(f=>{if(s[f.key]!==d[f.key])chips.push([f.key,`${f.label}: ${(f.opts.find(o=>o[0]===s[f.key])||[,s[f.key]])[1]}`])});
 const nAll=chips.length;
 return`<div class="ofb" data-ofb="${id}"><div class="ofb-row">${cfg.q!==false?`<input type="search" class="ofb-q" data-ofb-q="${id}" value="${esc(s.q||'')}" placeholder="${esc(cfg.q||t('ofbSearch'))}" aria-label="${t('ofbSearch')}">`:''}
  ${cfg.date?`<button type="button" class="ofb-date ofb-desk" data-ofb-date="${id}" aria-haspopup="dialog" title="${t('ofbDate')}">📅 <span>${esc(dateTxt)}</span> ▾</button>`:''}
  ${cfg.type&&types.length>1?`<select class="ofb-type ofb-desk" data-ofb-key="type" aria-label="${t('ofbType')}"><option value="all">${t('ofbTypeAll')}</option>${types.map(v=>`<option value="${v}" ${s.type===v?'selected':''}>${ofbTypeLabel(v)}</option>`).join('')}</select>`:''}
  ${cfg.partner&&ps.length>1?`<input class="ofb-partner ofb-desk" data-ofb-partner="${id}" list="ofbPl-${id}" value="${esc(pName)}" placeholder="${t('ofbPartnerPh')}" aria-label="${t('ofbPartner')}"><datalist id="ofbPl-${id}">${ps.map(p=>`<option value="${esc(p.name)}"></option>`).join('')}</datalist>`:''}
  ${more.length?`<button type="button" class="ofb-morebtn ofb-desk${moreN?' on':''}" data-ofb-more="${id}" aria-haspopup="dialog">${t('ofbMore')} (${moreN})</button>`:''}
  <button type="button" class="ofb-mobile${nAll?' on':''}" data-ofb-sheet="${id}" aria-haspopup="dialog">☰ ${t('ofbFilters')} (${nAll})</button></div>
  <div class="ofb-chips">${chips.map(([k,txt])=>`<span class="ofb-chip">${esc(txt)}<button type="button" data-ofb-chip="${k}" aria-label="${esc(tp('ofbRemove',{f:txt}))}">×</button></span>`).join('')}${chips.length?`<button type="button" class="ofb-clear" data-ofb-clear="${id}">${t('ofbClear')}</button>`:''}<span class="ofb-count">${tp('ofbFound',{n:n(cfg.count??0)})}</span></div></div>`}
const OFB_CFG={};   // the latest cfg per page (the popovers rebuild from it)
function ofbBar(cfg){OFB_CFG[cfg.id]=cfg;return opsFilterBar(cfg)}
function ofbApply(id){ofbSave(id);const f=document.activeElement,qFocus=f&&f.matches?.('[data-ofb-q]')?f.selectionStart:null;render();if(qFocus!=null){const q=document.querySelector(`[data-ofb-q="${id}"]`);if(q){q.focus();try{q.setSelectionRange(qFocus,qFocus)}catch{}}}}
function ofbSortTh(id,key,label,num){const s=ofbState(id),on=s.sort===key;return`<th class="${num?'num':''}"><button type="button" class="ofb-th${on?' on':''}" data-ofb-sort="${key}" data-ofb-id="${id}" aria-sort="${on?(s.dir==='asc'?'ascending':'descending'):'none'}">${esc(label)} <i aria-hidden="true">${on?(s.dir==='asc'?'↑':'↓'):'↕'}</i></button></th>`}
function ofbSortRows(rows,s,get){const k=get[s.sort];if(!k)return rows;const m=s.dir==='asc'?1:-1;return rows.slice().sort((x,y)=>{const a=k(x),b=k(y);return(typeof a==='string'?a.localeCompare(b):a-b)*m})}

/* ---------------------------------------------------------------- popovers: date range picker · more filters · mobile bottom sheet */
let drp=null,ofbPopId=null;
const ofbMobile=()=>matchMedia('(max-width:700px)').matches;
function cr4PopEl(){let el=$('#cr4Pop');if(!el){el=document.createElement('div');el.id='cr4Pop';el.setAttribute('role','dialog');document.body.appendChild(el)}return el}
function cr4PopClose(){const el=$('#cr4Pop');if(el){el.remove()}$('#cr4PopShade')?.remove();drp=null;ofbPopId=null}
function cr4PopPlace(el,anchor,sheet){if(sheet||!anchor){el.classList.add('sheet');if(!$('#cr4PopShade')){const sh=document.createElement('div');sh.id='cr4PopShade';sh.onclick=cr4PopClose;document.body.appendChild(sh)}return}
 const r=anchor.getBoundingClientRect(),w=el.offsetWidth,left=Math.max(8,Math.min(r.left,innerWidth-w-8));el.style.left=left+'px';el.style.top=(r.bottom+6+scrollY)+'px'}
function drpMonth(ym){const first=new Date(ym+'-01T12:00:00Z'),lead=(first.getUTCDay()+6)%7,days=+cr4MonthEnd(ym).slice(8,10),td=opsDay(),[a,b]=[drp.a,drp.b],dows=lang==='th'?['จ','อ','พ','พฤ','ศ','ส','อา']:['Mo','Tu','We','Th','Fr','Sa','Su'];
 let h=`<div class="drp-m"><div class="drp-mt">${fmtMonth(ym)}</div><div class="drp-g">${dows.map(x=>`<span class="drp-dow">${x}</span>`).join('')}${'<span></span>'.repeat(lead)}`;
 for(let i=1;i<=days;i++){const iso=ym+'-'+String(i).padStart(2,'0'),off=(drp.min&&iso<drp.min)||(drp.max&&iso>drp.max),sel=iso===a||iso===b,inR=a&&b&&iso>a&&iso<b;
  h+=`<button type="button" class="drp-d${sel?' sel':''}${inR?' in':''}${iso===td?' td':''}" data-drp-day="${iso}" ${off?'disabled':''} aria-label="${fmtDate(iso)}">${i}</button>`}
 return h+`</div></div>`}
function drpRender(){const el=cr4PopEl(),sheet=ofbMobile();el.className='cr4pop drp';el.innerHTML=`${drp.single?'':`<div class="drp-pre">${DRP_PRESETS.map(k=>`<button type="button" data-drp-preset="${k}" class="${drp.preset===k?'on':''}">${t('drp_'+k)}</button>`).join('')}${drp.allowAll?`<button type="button" data-drp-preset="all" class="${drp.preset==='all'?'on':''}">${t('drp_all')}</button>`:''}</div>`}
  <div class="drp-cal"><button type="button" class="drp-nav" data-drp-nav="-1" aria-label="${t('drp_prev')}">‹</button>${drpMonth(drp.ym)}${sheet?'':drpMonth(cr4AddMonth(drp.ym,1))}<button type="button" class="drp-nav" data-drp-nav="1" aria-label="${t('drp_next')}">›</button></div>
  <div class="drp-foot"><span class="muted">${drp.single?t('drp_pick'):drp.a&&!drp.b?t('drp_pickEnd'):drp.a&&drp.b?esc(fmtRange(drp.a,drp.b)):t('drp_pickStart')}</span>${drp.single?'':`<button type="button" class="primary" data-drp-apply="1" ${drp.a&&drp.b?'':'disabled'}>${t('drp_apply')}</button>`}<button type="button" data-drp-close="1">${t('close')}</button></div>`;
 cr4PopPlace(el,drp.anchor,sheet)}
function drpOpen(o){cr4PopClose();const a=o.a||'',ym=(a||opsDay()).slice(0,7);drp={...o,ym:o.single?ym:cr4AddMonth(ym,a&&a.slice(0,7)===opsDay().slice(0,7)&&!o.b?0:0)};drpRender()}
function ofbMoreRender(id,sheet){const cfg=OFB_CFG[id];if(!cfg)return;const s=ofbState(id),el=cr4PopEl(),types=cfg.type?workGroupChoices():[],ps=cfg.partner?ofbScopePartners(s.type):[];ofbPopId=id;el.className='cr4pop ofb-pop';
 const sel=(key,label,opts)=>`<label>${esc(label)}<select data-ofb-key="${key}" data-ofb-id="${id}">${opts.map(([v,txt])=>`<option value="${esc(v)}" ${s[key]===v?'selected':''}>${esc(txt)}</option>`).join('')}</select></label>`;
 el.innerHTML=`<div class="ofb-pophead"><b>${sheet?t('ofbFilters'):t('ofbMore')}</b><button type="button" data-drp-close="1" aria-label="${t('close')}">×</button></div><div class="ofb-popbody">
  ${sheet&&cfg.date?`<div class="ofb-poplabel">${t('ofbDate')}</div><div class="drp-pre">${DRP_PRESETS.map(k=>`<button type="button" data-ofb-preset="${k}" data-ofb-id="${id}" class="${s.d===k?'on':''}">${t('drp_'+k)}</button>`).join('')}${cfg.date==='all'?`<button type="button" data-ofb-preset="all" data-ofb-id="${id}" class="${s.d==='all'?'on':''}">${t('drp_all')}</button>`:''}<button type="button" data-ofb-date="${id}" class="${s.d==='custom'?'on':''}">${t('drp_custom')}</button></div>`:''}
  ${sheet&&types.length>1?sel('type',t('ofbType'),[['all',t('ofbTypeAll')],...types.map(v=>[v,ofbTypeLabel(v)])]):''}
  ${sheet&&ps.length>1?sel('partner',t('ofbPartner'),[['all',t('ofbTypeAll')],...ps.map(p=>[p.id,p.name])]):''}
  ${(cfg.more||[]).map(f=>sel(f.key,f.label,f.opts)).join('')}</div><div class="drp-foot"><button type="button" class="primary" data-drp-close="1">${t('ofbDone')}</button></div>`;
 cr4PopPlace(el,sheet?null:document.querySelector(`[data-ofb-more="${id}"]`),sheet)}
function ofbIdOf(el){return el.dataset.ofbId||el.closest('[data-ofb]')?.dataset.ofb||ofbPopId}
document.addEventListener('click',e=>{const el=e.target.closest?.('[data-ofb-date],[data-ofb-more],[data-ofb-sheet],[data-ofb-chip],[data-ofb-clear],[data-ofb-sort],[data-ofb-preset],[data-drp-preset],[data-drp-day],[data-drp-nav],[data-drp-apply],[data-drp-close],[data-drp-input]');
 const pop=$('#cr4Pop');if(!el){if(pop&&!e.target.closest('#cr4Pop'))cr4PopClose();return}
 if(el.dataset.drpClose){cr4PopClose();return}
 if(el.dataset.drpInput){const inp=el._inp||el.previousElementSibling;if(!inp)return;drpOpen({single:true,a:inp.value,anchor:el,min:inp.min||'',max:inp.max||'',cb:v=>{inp.value=v;el.textContent='📅 '+fmtDate(v);inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}))}});return}
 if(el.dataset.ofbDate){const id=el.dataset.ofbDate,s=ofbState(id),[a,b]=cr4Range(s);drpOpen({a,b,preset:s.d,allowAll:OFB_CFG[id]?.date==='all',anchor:ofbMobile()?null:el,cb:(x,y,p)=>{s.d=p||'custom';s.from=p?'':x;s.to=p?'':y;ofbApply(id)}});return}
 if(el.dataset.ofbMore){cr4PopClose();ofbMoreRender(el.dataset.ofbMore,false);return}
 if(el.dataset.ofbSheet){cr4PopClose();ofbMoreRender(el.dataset.ofbSheet,true);return}
 if(el.dataset.ofbPreset){const id=ofbIdOf(el),s=ofbState(id);s.d=el.dataset.ofbPreset;s.from=s.to='';cr4PopClose();ofbApply(id);return}
 if(el.dataset.ofbChip){const id=ofbIdOf(el);ofbReset(id,el.dataset.ofbChip);ofbApply(id);return}
 if(el.dataset.ofbClear){ofbReset(el.dataset.ofbClear);ofbApply(el.dataset.ofbClear);return}
 if(el.dataset.ofbSort){const id=el.dataset.ofbId,s=ofbState(id),k=el.dataset.ofbSort;if(s.sort===k)s.dir=s.dir==='asc'?'desc':'asc';else{s.sort=k;s.dir=['customer','id','name'].includes(k)?'asc':'desc'}ofbApply(id);return}
 if(!drp)return;
 if(el.dataset.drpPreset){const p=el.dataset.drpPreset,[a,b]=cr4Preset(p),cb=drp.cb;cr4PopClose();cb(a,b,p);return}
 if(el.dataset.drpNav){drp.ym=cr4AddMonth(drp.ym,+el.dataset.drpNav);drpRender();return}
 if(el.dataset.drpDay){const v=el.dataset.drpDay;if(drp.single){const cb=drp.cb;cr4PopClose();cb(v);return}if(!drp.a||drp.b){drp.a=v;drp.b=''}else if(v<drp.a){drp.b=drp.a;drp.a=v}else drp.b=v;drp.preset='custom';drpRender();return}
 if(el.dataset.drpApply&&drp.a&&drp.b){const{a,b,cb}=drp;cr4PopClose();cb(a,b,'')}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#cr4Pop'))cr4PopClose()});
let ofbTimer=null;
document.addEventListener('input',e=>{const q=e.target.closest?.('[data-ofb-q]');if(!q)return;clearTimeout(ofbTimer);ofbTimer=setTimeout(()=>{const id=q.dataset.ofbQ;ofbState(id).q=q.value.trim();ofbApply(id)},250)});
document.addEventListener('change',e=>{const el=e.target;if(el.matches?.('[data-ofb-key]')){const id=ofbIdOf(el);if(!id)return;const s=ofbState(id);s[el.dataset.ofbKey]=el.value;if(el.dataset.ofbKey==='type')s.partner='all';const keepPop=!!el.closest('#cr4Pop');ofbApply(id);if(keepPop)ofbMoreRender(id,ofbMobile()&&!!$('#cr4PopShade')||$('#cr4Pop')?.classList.contains('sheet'));return}
 if(el.matches?.('[data-ofb-partner]')){const id=el.dataset.ofbPartner,s=ofbState(id),v=el.value.trim(),p=ofbScopePartners(s.type).find(x=>x.name===v||x.id===v);s.partner=p?p.id:'all';if(!p)el.value='';ofbApply(id)}});

/* ---------------------------------------------------------------- R3 · orders: one tab row by stage (+ R4 bar) */
const CR4_TABS=['all',...CR4_STAGES];
let cr4OrderTabPending=null;
function cr4OrderRoleTab(){return session?.role==='finance'?'pay':session?.role==='warehouse'?'pick':'all'}
function cr4SetOrderTab(tab){if(CR4_TABS.includes(tab))cr4OrderTabPending=tab}
function cr4OrderTab(){const s=ofbState('orders');if(!CR4_TABS.includes(s.tab))s.tab=cr4OrderRoleTab();return s.tab}
function cr4OrderBase(){const s=ofbState('orders'),q=(s.q||'').toLowerCase();
 return scopedOrders().filter(o=>{const p=partner(o.partner)||{},d=orderDoc(o);if(!cr4InRange(dateKey(o.time),s))return false;if(s.type!=='all'&&p.type!==s.type)return false;if(s.partner!=='all'&&p.id!==s.partner)return false;
  if(s.sales!=='all'&&p.sales!==s.sales)return false;if(s.area!=='all'&&p.area!==s.area)return false;if(s.origin!=='all'&&o.channel!==s.origin)return false;
  if(s.doc!=='all'&&!((s.doc==='none'&&!d)||(s.doc==='so'&&d&&!d.invoice)||(s.doc==='invoice'&&!!d?.invoice)))return false;
  return!q||[o.id,o.externalId,o.customer,o.phone,o.tracking,p.name,p.sales,p.area,o.internalNote,...getOrderLines(o).map(l=>l.sku),d?.so||'',d?.invoice||''].join(' ').toLowerCase().includes(q)})}
const CR4_ORDER_SORT={id:o=>o.id,customer:o=>o.customer||'',qty:o=>getOrderLines(o).reduce((s,l)=>s+l.qty,0),total:o=>orderSum(o),date:o=>o.time};
filteredDetailedOrders=function(){const s=ofbState('orders'),tab=cr4OrderTab();let os=cr4OrderBase();if(tab!=='all')os=os.filter(o=>cr4OrderStage(o)===tab);return ofbSortRows(os,s,CR4_ORDER_SORT)};
function cr4StateBadges(o){const d=orderDoc(o),lv=(ok,bad)=>ok?'ok':bad?'bad':'warn';   // CR-05 C8: each chip says what it is · colour by level (wait yellow · done green · problem red)
 return`<span class="pill ${lv(paymentOK(o))}" title="${t('paymentStatus')}">${t('c5Pay')}: ${o.payment==='cod'?'COD':t(o.pay)}</span> <span class="pill ${lv(o.ship==='delivered',o.ship==='returned')}" title="${t('shipmentStatus')}">${t('c5Ship')}: ${t(o.ship)}</span> <span class="pill ${lv(!!d?.invoice)}" title="${t('ERPDocuments')}">${t('c5Doc')}: ${d?.invoice?esc(d.invoice):d?esc(d.so):t('ordDocNone')}</span>`}
const cr4OrderTableBefore=orderTableV3;
orderTableV3=function(os,compact=false){if(compact)return cr4OrderTableBefore(os,true);const cols=visibleOrderColumns.filter(k=>['channel','partner','sales','quota','tracking'].includes(k)),id='orders';
 return`<div class="tablewrap order-table-scroll"><table class="detailed-order-table cr4-orders"><thead><tr><th><input type="checkbox" id="selectVisibleOrders" aria-label="${t('selection')} ${t('all')}" ${os.length&&os.every(o=>orderSelection.has(o.id))?'checked':''}></th>${ofbSortTh(id,'id',t('orderNo'))}${ofbSortTh(id,'customer',t('customer'))}${ofbSortTh(id,'qty',t('orderQty'),1)}${ofbSortTh(id,'total',t('orderTotal'),1)}<th>${t('ordState')}</th><th>${t('ordNext')}</th>${cols.map(k=>`<th>${t(orderColumnKeys[k])}</th>`).join('')}${ofbSortTh(id,'date',t('orderDate'))}</tr></thead><tbody>${os.map(o=>{const p=partner(o.partner),ql=orderQuotaLabel(o),plan=orderActionPlan(o),data={channel:`<span class="channelDot">${t(o.channel).slice(0,1)}</span>${t(o.channel)}`,partner:`<b>${esc(p.name)}</b><small>${p.type} · ${esc(p.channel)}</small>`,sales:`${esc(p.sales)}<small>${esc(p.area)}</small>`,quota:`<span class="pill ${ql==='quotaReserved'||ql==='quotaPassed'?'ok':ql==='quotaBlocked'?'bad':'warn'}">${t(ql)}</span>`,tracking:o.tracking?`<b>${esc(o.tracking)}</b><small>${esc(o.carrier)}</small>`:`—<small>${esc(o.carrier||'')}</small>`};
  return`<tr ${orderSelection.has(o.id)?'class="selected-row"':''}><td><input type="checkbox" data-order-select="${o.id}" aria-label="${t('selection')} ${o.id}" ${orderSelection.has(o.id)?'checked':''}></td><td><button class="text-link order-id-link" data-order="${o.id}">${o.id}</button><small>${esc(o.externalId||'')}</small></td><td><b>${esc(o.customer)}</b><small>${esc(o.phone)}</small></td><td class="num">${n(getOrderLines(o).reduce((s,l)=>s+l.qty,0))}<small>${getOrderLines(o).length} ${t('skuCount')}</small></td><td class="num"><b>${money(orderSum(o))}</b><small>VAT ${o.vat}%</small></td><td class="cr4-badges">${cr4StateBadges(o)}</td><td>${plan.action&&plan.allowed?`<button class="cr4-next" data-order="${o.id}">${t(plan.label)}</button>`:`<span class="c5-wait">${plan.action?'⏳ ':''}${t(plan.label)}</span>`}</td>${cols.map(k=>`<td>${data[k]}</td>`).join('')}<td>${fmtDate(o.time)}</td></tr>`}).join('')}</tbody></table>${os.length?'':`<div class="empty">${t('noResults')}</div>`}</div>`};
function cr4OrderPage(){const s=ofbState('orders'),tab=cr4OrderTab(),base=cr4OrderBase(),cnt=cr4StageCounts(base),rows=filteredDetailedOrders(),ps=ofbScopePartners(s.type);
 const more=[{key:'sales',label:t('ofbSales'),opts:[['all',t('all')],...[...new Set(ps.map(p=>p.sales))].map(v=>[v,v])]},{key:'area',label:t('ofbArea'),opts:[['all',t('all')],...[...new Set(ps.map(p=>p.area))].map(v=>[v,v])]},
  {key:'doc',label:t('ofbDoc'),opts:[['all',t('all')],['none',t('ordDocNoSO')],['so',t('ordDocSOnoIV')],['invoice',t('ordDocIVdone')]]},{key:'origin',label:t('ofbOrigin'),opts:[['all',t('all')],...workOrigins().map(v=>[v,t(v)])]}];
 return ofbBar({id:'orders',q:t('orderSearchDetailed'),date:'all',type:true,partner:true,more,count:rows.length})+
  `<div class="orderTabs cr4-tabs" role="tablist">${CR4_TABS.map(k=>`<button type="button" role="tab" data-cr4-tab="${k}" class="${tab===k?'selected':''}" aria-selected="${tab===k}">${t('st_'+k)} <b>${n(cnt[k])}</b></button>`).join('')}</div>
  <div class="toolbar list-action-bar"><span id="orderSelectedSummary">${rows.filter(o=>orderSelection.has(o.id)).length} ${t('selectedCount')}</span><button id="bulkConfirmV3" ${!canOrder()?'disabled':''}>${t('batchConfirm')}</button><button id="exportOrdersV3">↓ ${t('orderExport')}</button><details class="column-menu"><summary>${t('columns')} ▾</summary><div>${['channel','partner','sales','quota','tracking'].map(k=>`<label><input type="checkbox" data-col="${k}" ${visibleOrderColumns.includes(k)?'checked':''}>${t(orderColumnKeys[k])}</label>`).join('')}</div></details></div>
  <section class="panel cr4-ordpanel"><div class="panelhead"><h2 id="cr4StageHead">${t('st_'+tab)}</h2><span class="muted">${tp('ordSum',{n:n(rows.length),v:money(rows.reduce((x,o)=>x+orderSum(o),0))})}</span></div><div id="orderGridV3">${orderTableV3(rows)}</div></section><p class="small">${t('orderPolicy')}</p>`}
const cr4ListBefore=orderListV3;orderListV3=function(){workNormalizeFilters();orderTab='all';return cr4OrderPage()};

/* ---------------------------------------------------------------- R5 · customers: 5 cards + table (orderTotals − credited CN, scope + range) */
const CU_QUIET=60,CU_REPEAT=90;
function cr4CustNet(o){if(o.status==='cancelled')return 0;const cn=(db.returns||[]).filter(r=>r.orderId===o.id&&r.status==='credited').reduce((s,r)=>s+(r.creditAmount||0),0);return Math.round((orderTotals(o).total-cn)*100)/100}
function cr4CustData(){const s=ofbState('customers'),q=(s.q||'').toLowerCase(),[a,b]=cr4Range(s),td=opsDay();
 const all=scopedOrders().filter(o=>{const p=partner(o.partner)||{};return(s.type==='all'||p.type===s.type)&&(s.partner==='all'||p.id===s.partner)});
 const C={};all.forEach(o=>{const k=o.customer+'|'+o.phone;(C[k]||=(C[k]={key:k,name:o.customer,phone:o.phone,all:[]})).all.push(o)});
 const phones={};Object.values(C).forEach(c=>{(phones[c.phone]||=new Set()).add(c.name)});
 const inR=o=>cr4InRange(dateKey(o.time),s),live=o=>o.status!=='cancelled';
 const len=a&&b?Math.round((Date.parse(b)-Date.parse(a))/864e5)+1:0,pa=len?cr4AddDays(a,-len):'',pb=len?cr4AddDays(a,-1):'';
 let list=Object.values(C).map(c=>{const r=c.all.filter(inR),rl=r.filter(live),first=c.all.reduce((m,o)=>Math.min(m,o.time),Infinity),last=c.all.reduce((m,o)=>Math.max(m,o.time),0),ch={};c.all.forEach(o=>ch[o.channel]=(ch[o.channel]||0)+1);
  const rec=c.all.filter(o=>live(o)&&dateKey(o.time)>=cr4AddDays(td,-(CU_REPEAT-1)));
  return{...c,orders:rl.length,any:r.length>0,spend:rl.reduce((x,o)=>x+cr4CustNet(o),0),prev:len?c.all.filter(o=>live(o)&&dateKey(o.time)>=pa&&dateKey(o.time)<=pb).reduce((x,o)=>x+cr4CustNet(o),0):0,
   isNew:r.length>0&&cr4InRange(dateKey(first),s),last,recent:rec.length,repeat:rec.length>=2,quiet:dateKey(last)<cr4AddDays(td,-CU_QUIET),dup:(phones[c.phone]?.size||0)>1,main:Object.entries(ch).sort((x,y)=>y[1]-x[1])[0]?.[0]||''}});
 if(q)list=list.filter(c=>[c.name,c.phone,...c.all.map(o=>o.id)].join(' ').toLowerCase().includes(q));
 const inRange=list.filter(c=>c.any),spend=inRange.reduce((x,c)=>x+c.spend,0),orders=inRange.reduce((x,c)=>x+c.orders,0),prev=list.reduce((x,c)=>x+c.prev,0),rb=list.filter(c=>c.recent>0);
 const K={total:inRange.length,newN:inRange.filter(c=>c.isNew).length,spend,prev,delta:prev>0?(spend-prev)/prev*100:null,aov:orders?spend/orders:null,orders,repeat:rb.length?list.filter(c=>c.repeat).length/rb.length*100:null,repA:list.filter(c=>c.repeat).length,repB:rb.length,quiet:list.filter(c=>c.quiet).length};
 const pick={total:c=>c.any,spend:c=>c.any,aov:c=>c.any,repeat:c=>c.repeat,quiet:c=>c.quiet}[s.card]||(c=>c.any);
 return{K,rows:list.filter(pick)}}
function cr4CustomerPage(){const s=ofbState('customers'),D=cr4CustData(),K=D.K,thb=v=>v==null?'—':'฿'+money(Math.round(v*100)/100);
 const rows=ofbSortRows(D.rows,s,{customer:c=>c.name,orders:c=>c.orders,spend:c=>c.spend,aov:c=>c.orders?c.spend/c.orders:0,last:c=>c.last});
 const card=(k,label,val,sub)=>`<button type="button" class="hm-card cu-card${s.card===k?' on':''}" data-cu-card="${k}" aria-pressed="${s.card===k}"><small>${label}</small><strong>${val}</strong><em>${sub}</em></button>`;
 const dTxt=K.delta==null?t('cuSpendNoPrev'):tp('cuSpendVs',{d:(K.delta>=0?'▲ ':'▼ ')+n(Math.abs(Math.round(K.delta*10)/10))+'%'});
 return ofbBar({id:'customers',q:t('ofbSearch')+' · '+t('customer')+' / '+t('customerPhone'),date:'all',type:true,partner:true,count:rows.length})+
  `<div class="hm-pulse cu-cards">${card('total',t('cuTotal'),n(K.total),tp('cuNew',{n:n(K.newN)}))}${card('spend',t('cuSpend'),thb(K.spend),dTxt)}${card('aov',t('cuAov'),thb(K.aov),tp('cuAovSub',{n:n(K.orders)}))}${card('repeat',t('cuRepeat'),K.repeat==null?'—':n(Math.round(K.repeat*10)/10)+'%',tp('cuRepeatSub',{a:n(K.repA),b:n(K.repB),d:CU_REPEAT}))}${card('quiet',t('cuQuiet'),n(K.quiet),tp('cuQuietSub',{d:CU_QUIET}))}</div>`+
  `${s.card?`<div class="cu-filter"><span>${tp('cuFilterOn',{c:t({total:'cuTotal',spend:'cuSpend',aov:'cuAov',repeat:'cuRepeat',quiet:'cuQuiet'}[s.card])})}</span><button type="button" class="quiet" data-cu-card="">${t('cuFilterOff')}</button></div>`:''}
  <section class="panel"><div class="tablewrap"><table class="cu-table"><thead><tr>${ofbSortTh('customers','customer',t('customer'))}<th>${t('customerPhone')}</th>${ofbSortTh('customers','orders',t('cuOrders'),1)}${ofbSortTh('customers','spend',t('cuSpendCol'),1)}${ofbSortTh('customers','aov','AOV',1)}<th>${t('cuMainCh')}</th>${ofbSortTh('customers','last',t('cuLast'))}<th>${t('actions')}</th></tr></thead><tbody>${rows.map(c=>`<tr data-cu-row="${esc(c.key)}"><td><b>${esc(c.name)}</b>${c.dup?` <span class="pill warn cu-dup" title="${esc(t('cuDupTip'))}">${t('cuDupPhone')}</span>`:''}</td><td>${esc(c.phone)}</td><td class="num">${n(c.orders)}</td><td class="num" data-cu-spend="${c.spend}">${money(Math.round(c.spend*100)/100)}</td><td class="num">${c.orders?money(Math.round(c.spend/c.orders*100)/100):'—'}</td><td>${esc(t(c.main))}</td><td>${fmtDate(c.last)}</td><td><button data-customer="${esc(c.name)}">${t('customerDetail')}</button></td></tr>`).join('')}</tbody></table>${rows.length?'':`<div class="empty">${t('cuNoCards')}</div>`}</div></section>`}
const cr4CustBefore=customerPage;customerPage=function(){return workCanVisit('customers')?cr4CustomerPage():cr4CustBefore()};
document.addEventListener('click',e=>{const el=e.target.closest?.('[data-cu-card]');if(!el||view!=='customers')return;const s=ofbState('customers'),k=el.dataset.cuCard;s.card=s.card===k?'':k;if(k==='spend'){s.sort='spend';s.dir='desc'}if(k==='aov'){s.sort='aov';s.dir='desc'}ofbApply('customers')});

/* ---------------------------------------------------------------- the other list pages: documents · work queue · returns · reports · audit */
function cr4PartnerOk(pid,s){const p=partner(pid);return!!p&&(s.type==='all'||p.type===s.type)&&(s.partner==='all'||p.id===s.partner)}
// documents (เอกสารและระบบเชื่อมต่อ)
const cr4DocRowsBefore=workDocRows;workDocRows=function(){const s=ofbState('documents'),q=(s.q||'').toLowerCase();workDocSearch='';workDocPartner='all';
 return cr4DocRowsBefore().filter(d=>cr4PartnerOk(d.partner,s)&&cr4InRange(dateKey(d.invoiceTime||d.time||0),s)&&(s.kind==='all'||(s.kind==='so'&&!d.invoice)||(s.kind==='invoice'&&!!d.invoice))&&(!q||[d.so,d.invoice,d.ref,d.externalSource,d.orderId,partner(d.partner)?.name].join(' ').toLowerCase().includes(q)))};
const cr4DocPageBefore=workDocPage;workDocPage=function(){let h=cr4DocPageBefore();if(view!=='documents')return h;h=h.replace(/<input id="workDocSearch"[^>]*>/,'').replace(/<select id="workDocPartner"[\s\S]*?<\/select>/,'');
 const bar=ofbBar({id:'documents',q:'SO / IV / CN / '+t('orderNo'),date:'all',type:true,partner:true,more:[{key:'kind',label:t('ofbDoc'),opts:[['all',t('all')],['so',t('ordDocSOnoIV')],['invoice',t('ordDocIVdone')]]}],count:workDocRows().length});
 return h.replace(/(<section class="panel"><div class="panelhead"><h2>)/,bar+'$1')};
// work queue (งานค้างและส่งมอบ › queue)
const cr4FuPageBefore=fuQueuePage;fuQueuePage=function(){if(fuTab!=='queue'||!fuCan('operations.view'))return cr4FuPageBefore();const s=ofbState('workQueue'),keep=fuReportData,all=keep().tasks;fuQuery=s.q||'';fuReasonFilter=s.reason||'all';
 fuReportData=function(){const r=keep();return{...r,tasks:r.tasks.filter(x=>cr4PartnerOk(x.o.partner,s)&&cr4InRange(dateKey(x.o.time),s))}};let h;try{h=cr4FuPageBefore()}finally{fuReportData=keep}
 const shown=all.filter(x=>cr4PartnerOk(x.o.partner,s)&&cr4InRange(dateKey(x.o.time),s)&&(fuReasonFilter==='all'||x.reason===fuReasonFilter)&&JSON.stringify([x.o.id,x.o.customer,x.reason]).toLowerCase().includes(fuQuery.toLowerCase())).length;
 const bar=ofbBar({id:'workQueue',q:t('search'),date:'all',type:true,partner:true,more:[{key:'reason',label:t('ofbReason'),opts:[['all',t('all')],...[...new Set(all.map(r=>r.reason))].map(r=>[r,t('fuReason_'+r)])]}],count:shown});
 return h.replace(/<div class="panelbody tools"><input id="fuQuery"[\s\S]*?<\/select><\/div>/,`<div class="panelbody">${bar}</div>`)};
// returns / CN
const cr4RetBefore=opsReturnsPage;opsReturnsPage=function(){const s=ofbState('returns'),q=(s.q||'').toLowerCase(),keep=db.returns;
 const rows=(keep||[]).filter(r=>cr4PartnerOk(r.partner,s)&&cr4InRange(dateKey(r.time||r.createdAt||r.creditTime||0),s)&&(s.status==='all'||r.status===s.status)&&(!q||[r.id,r.orderId,r.reason,r.creditNo].join(' ').toLowerCase().includes(q)));
 db.returns=rows;let h;try{h=cr4RetBefore()}finally{db.returns=keep}
 const bar=ofbBar({id:'returns',q:t('ref')+' / '+t('orderNo')+' / CN',date:'all',type:true,partner:true,more:[{key:'status',label:t('ofbStatus'),opts:[['all',t('all')],...['requested','inspected','credited','rejected'].map(v=>[v,opsRmaState(v)])]}],count:rows.filter(r=>visiblePartner(partner(r.partner))).length});
 return bar+h};
// reports: the date range drives opsReportFrom / opsReportTo (the report function is unchanged)
function cr4ReportSync(){const s=ofbState('reports'),[a,b]=cr4Range(s);opsReportFrom=a;opsReportTo=b;opsReportStatus=s.status||'all'}
opsReportControls=function(){cr4ReportSync();const s=ofbState('reports');return ofbBar({id:'reports',q:false,date:'all',type:false,partner:false,more:[{key:'status',label:t('status'),opts:['all','draft','confirmed','invoiced','shipped','delivered','returned','cancelled'].map(v=>[v,v==='all'?t('all'):opsStatusLabel(v)])}],count:opsReportData().rows.length})+`<div class="ops-report-controls cr4-report-tools"><button id="opsReportExport" class="primary">${t('export')}</button><button id="opsReportPrint">${L('พิมพ์ / PDF','Print / PDF')}</button></div>`};
const cr4RepPageBefore=opsReportPage;opsReportPage=function(){cr4ReportSync();return cr4RepPageBefore()};
// audit (ประวัติการทำงาน)
const cr4AuditBefore=opsAuditPage;opsAuditPage=function(){const s=ofbState('audit'),q=(s.q||'').toLowerCase(),keep=db.logs,vis=keep.filter(opsVisibleLog),actors=[...new Set(vis.map(x=>opsActor(x)))];
 const rows=keep.filter(x=>cr4InRange(dateKey(x.time||0),s)&&(s.actor==='all'||opsActor(x)===s.actor)&&(!q||[t(x.event),x.ref,opsActor(x),x.actorId].join(' ').toLowerCase().includes(q)));db.logs=rows;let h;try{h=cr4AuditBefore()}finally{db.logs=keep}
 return ofbBar({id:'audit',q:t('event')+' / '+t('ref')+' / '+t('actor'),date:'all',type:false,partner:false,more:[{key:'actor',label:t('ofbActor'),opts:[['all',t('all')],...actors.map(a=>[a,a])]}],count:rows.filter(opsVisibleLog).length})+h};

/* ---------------------------------------------------------------- wiring: page (strip the 2nd tab level) · navigate (stage tab by role / old links) · bind */
const cr4PageBefore=page;page=function(){let h=cr4PageBefore();if(session&&['orders','payments','shipping'].includes(view)&&!selectedOrderId)h=h.replace(/<div class="orderTabs work-family-tabs">[\s\S]*?<\/div>/,'');return h};
const cr4NavBefore=navigate;navigate=function(v,...rest){const fam=['orders','payments','shipping'],was=view;
 if(fam.includes(v)&&(!fam.includes(was)||cr4OrderTabPending||v!=='orders')){const s=ofbState('orders');s.tab=cr4OrderTabPending||(v==='payments'?'pay':v==='shipping'?'pick':fam.includes(was)?s.tab:cr4OrderRoleTab());cr4OrderTabPending=null}
 cr4PopClose();const r=cr4NavBefore(v,...rest);const id=ofbPageOf(view);if(!id&&/^#[A-Za-z]+(\?|$)/.test(location.hash)&&!location.hash.startsWith('#order/'))history.replaceState(null,'',location.pathname+location.search);return r};
const cr4BindBefore=bind;bind=function(){cr4BindBefore();if(!session)return;const id=ofbPageOf(view);if(id)ofbSave(id);
 document.querySelectorAll('[data-cr4-tab]').forEach(b=>b.onclick=()=>{ofbState('orders').tab=b.dataset.cr4Tab;orderSelection.clear();ofbApply('orders')});
 const pg=$('#page');if(pg&&!Supply.isView?.(view)){cr4DateSweep(pg);cr4DateInputs(pg)}};
const cr4ModalBefore=showModal;showModal=function(html,kind){cr4ModalBefore(html,kind);const m=$('#modal');if(m){cr4DateSweep(m);cr4DateInputs(m)}};
const cr4LogoutBefore=logoutForUserSwitch;logoutForUserSwitch=function(){cr4PopClose();Object.keys(OFB).forEach(k=>delete OFB[k]);try{Object.keys(OFB_DEF).forEach(k=>sessionStorage.removeItem('ofb.'+k))}catch{}hmShowAll=false;return cr4LogoutBefore()};
/* deep link to an Ops list page with its filters (first sign-in of a page load, like the Supply pages) */
const cr4LoginBefore=login;login=function(){cr4LoginBefore();const b=$('#login');if(!b)return;const h=b.onclick;b.onclick=()=>{const hash=location.hash,m=hash.match(/^#([A-Za-z]+)(\?|$)/),deep=m&&typeof supDeepUsed!=='undefined'&&!supDeepUsed&&ofbPageOf(m[1]);h&&h();
 if(deep&&session&&workCanVisit(m[1])){Object.keys(OFB).forEach(k=>delete OFB[k]);history.replaceState(null,'',location.pathname+location.search+hash);navigate(m[1])}}};
