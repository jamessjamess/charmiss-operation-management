/* cr05-pages.js — CR-05 page by page (display only): inventory & quota (B5 toolbar · A5 decisions panel · C6) · E-commerce (B3 shops as a table ·
   B1 quota table filter) · accounts & SSO (B1 tabs) · open SO (A1 modal · B2 · C6) · S&OP action detail (C9) · dropdown menus (G9 "⋯") */
Object.assign(dict.th,{c5ImpExp:'นำเข้า / ส่งออก',c5MoreMenu:'เพิ่มเติม',c5Decide:'งานที่ต้องตัดสินใจ',c5NoDecision:'ไม่มีคำขอย้ายสต็อกที่รอคุณตัดสินใจ',c5Watch:'ช่องทางที่ไม่มียอดว่าง (ติดตาม)',
 c5Shop:'ร้าน',c5Conn:'สถานะเชื่อมต่อ',c5ShopOrders:'ออเดอร์ในระบบ',c5Queue:'คิวรอนำเข้า',c5LastSync:'ซิงก์ล่าสุด',c5Actions:'การทำงาน',c5AllShops:'ทุกร้าน',c5SkuSearch:'ค้นหา SKU',
 c5TabUsers:'ผู้ใช้',c5TabRoles:'บทบาท',c5TabScope:'ฝ่ายและสิทธิ์',c5SoEmpty:'ยังไม่มีคำขอ SO ในรอบแผนนี้',c5SoReady:'มี {n} ออเดอร์รอเตรียมคำขอ',c5SoNone:'ยังไม่มีออเดอร์ที่พร้อมเตรียมคำขอ SO (ต้องยืนยันออเดอร์และชำระก่อน)',
 c5Left:'คงเหลือ',c5LeftSub:'อนุมัติ {q} · ใช้แล้ว {u}',c5Need:'ขอใช้',c5Check:'ผลตรวจ',c5Pass:'ผ่าน',c5Short:'ไม่พอ ขาด {n}',c5SoSum:'{p} · {t} · {k} SKU · {q} ชิ้น',c5SoRule:'กติกาโควตาของคู่ค้านี้'});
Object.assign(dict.en,{c5ImpExp:'Import / export',c5MoreMenu:'More',c5Decide:'Needs a decision',c5NoDecision:'No stock move request is waiting for you',c5Watch:'Channels with nothing free (watch)',
 c5Shop:'Shop',c5Conn:'Connection',c5ShopOrders:'Orders in system',c5Queue:'Import queue',c5LastSync:'Last sync',c5Actions:'Actions',c5AllShops:'All shops',c5SkuSearch:'Search SKU',
 c5TabUsers:'Users',c5TabRoles:'Roles',c5TabScope:'Departments & scope',c5SoEmpty:'No SO request in this plan period yet',c5SoReady:'{n} orders are ready for an SO request',c5SoNone:'No order is ready for an SO request yet (confirm and pay first)',
 c5Left:'Left',c5LeftSub:'approved {q} · used {u}',c5Need:'Requested',c5Check:'Check',c5Pass:'Pass',c5Short:'Short by {n}',c5SoSum:'{p} · {t} · {k} SKU · {q} pcs',c5SoRule:'Quota rule of this partner'});

/* ---------------------------------------------------------------- G9 · a dropdown that holds existing buttons (their own handlers keep working) */
function c5Dropdown(label,buttons,cls){buttons=buttons.filter(Boolean);if(!buttons.length)return null;const dd=document.createElement('div');dd.className='c5-dd '+(cls||'');
 dd.innerHTML=`<button type="button" class="c5-ddbtn" aria-haspopup="menu" aria-expanded="false">${esc(label)} ▾</button><div class="c5-ddmenu" role="menu" hidden></div>`;
 const m=dd.querySelector('.c5-ddmenu');buttons.forEach(b=>{b.classList.remove('primary');b.setAttribute('role','menuitem');m.appendChild(b)});return dd}
document.addEventListener('click',e=>{const b=e.target.closest?.('.c5-ddbtn');document.querySelectorAll('.c5-ddmenu').forEach(m=>{if(!b||m!==b.nextElementSibling){m.hidden=true;m.previousElementSibling?.setAttribute('aria-expanded','false')}});
 if(b){const m=b.nextElementSibling;m.hidden=!m.hidden;b.setAttribute('aria-expanded',String(!m.hidden))}else if(e.target.closest?.('.c5-ddmenu [role="menuitem"]'))document.querySelectorAll('.c5-ddmenu').forEach(m=>m.hidden=true)});

/* ---------------------------------------------------------------- inventory & quota */
function c5Alloc(){if(!['allocation','stockoverview'].includes(view))return;const pg=$('#page');if(!pg)return;const $id=id=>document.getElementById(id);
 // B5: one primary (＋ สร้างการจัดสรร by H1) · ＋ ขอรับสต็อก · "นำเข้า / ส่งออก ▾" · "⋯"
 const imp=['opsImport','opsTemplate','opsMatrix'].map($id),more=['addStockChannel','newStockOverride'].map($id),req=$id('newStockRequest');
 const host=(imp.find(Boolean)||req||more.find(Boolean))?.parentElement;
 if(host&&!host.querySelector('.c5-dd')){const a=c5Dropdown(t('c5ImpExp'),imp),b=c5Dropdown('⋯ '+t('c5MoreMenu'),more,'c5-more');if(req){req.classList.remove('primary')}
  if(a)(req?req.after(a):host.prepend(a));if(b)(a||req||host.lastElementChild).after(b);host.classList.add('c5-toolrow')}
 // G1: no eyebrow / role label in the cockpit head
 pg.querySelectorAll('.eyebrow').forEach(e=>e.remove());pg.querySelectorAll('.ops-cockpit-head > .pill').forEach(p=>p.remove());
 // C6: the decisions panel says plainly when there is nothing · the list under it gets a title that says what it is
 const grid=pg.querySelector('.ops-cockpit-grid'),side=grid?.lastElementChild;
 if(side){side.querySelectorAll('.panel').forEach(p=>{const h=p.querySelector('.panelhead h2');const body=p.querySelector('.panelbody');
   if(h&&/ต้องตัดสินใจ|Needs action/.test(h.textContent)){p.classList.add('c5-decidepanel');const first=body?.querySelector('p');if(first&&first.textContent.trim()===t('noResults'))first.textContent=t('c5NoDecision')}
   else if(h&&/ติดตาม|watch/i.test(h.textContent))h.textContent=t('c5Watch')});
  c5DecidePlace()}
 c5FoldWms(pg)}
/* B1: the long "ตรวจ Quota กับ Actual WMS" list folds into one bar (count · short) — open it to check · state remembered */
function c5FoldWms(pg){const sec=[...pg.querySelectorAll(':scope > section.panel')].find(p=>(p.querySelector('.panelhead h2')?.textContent||'').includes(t('workActualCheck')));if(!sec||sec.closest('details'))return;const rows=sec.querySelectorAll('tbody tr').length;if(rows<=25)return;
 const short=sec.querySelectorAll('tbody .pill.bad').length,key='fold.wms.'+fuKey(),open=c5Store.get(key,false),d=document.createElement('details');d.className='c5-fold panel';d.open=!!open;
 d.innerHTML=`<summary><b>${esc(t('workActualCheck'))}</b> <span class="pill">${n(rows)} SKU</span>${short?` <span class="pill bad">${n(short)} ${esc(t('workActualShort'))}</span>`:''}</summary>`;sec.before(d);d.appendChild(sec);d.addEventListener('toggle',()=>{c5Store.set(key,d.open);if(d.open)sec.querySelectorAll('table').forEach(c5Sticky)})}
/* A5: ≥ 1440 px the panel stays on the right (not sticky) · below that it is a folded bar above the table */
function c5DecidePlace(){const grid=document.querySelector('#page .ops-cockpit-grid');if(!grid)return;let side=grid.querySelector(':scope > div:last-child')||document.querySelector('#page .c5-decide > div');if(!side)return;
 const wide=innerWidth>=1440;let det=document.querySelector('#page .c5-decide');
 if(wide){if(det&&det.contains(side)){grid.appendChild(side);det.remove()}grid.classList.remove('c5-onecol');return}
 if(!det){const n=+(side.querySelector('.c5-decidepanel .pill')?.textContent||0);det=document.createElement('details');det.className='c5-decide panel';det.innerHTML=`<summary><b>${t('c5Decide')}</b> <span class="pill ${n?'warn':''}">${n}</span></summary>`;grid.before(det)}
 if(!det.contains(side))det.appendChild(side);grid.classList.add('c5-onecol')}
addEventListener('resize',()=>{clearTimeout(c5DecidePlace.t);c5DecidePlace.t=setTimeout(()=>{if(['allocation','stockoverview'].includes(view))c5DecidePlace()},200)});

/* ---------------------------------------------------------------- E-commerce: B3 six shops as one small table · B1 the quota table gets a shop filter + SKU search */
function c5Ecom(){if(view!=='ecommerce')return;const grid=$('#page .ecom-channel-grid');if(grid&&!grid.dataset.c5){grid.dataset.c5='1';
  const rows=[...grid.querySelectorAll('.ecom-channel-card')].map(c=>{const st=[...c.querySelectorAll('.ecom-card-stats b')].map(b=>b.textContent),sync=(c.querySelector('.panelbody > p.small:not(:first-of-type)')||c.querySelectorAll('.panelbody p.small')[1]||{}).innerHTML||'';
   return{icon:c.querySelector('.ecom-icon')?.outerHTML||'',name:c.querySelector('.panelhead h2')?.textContent||'',sub:c.querySelector('.panelbody h3')?.textContent||'',pill:c.querySelector('.panelhead .pill')?.outerHTML||'',orders:st[0]||'0',queue:st[1]||'0',sync:sync.replace(/<br\s*\/?>/g,' · '),btns:[...c.querySelectorAll('button')].filter(b=>!b.hidden)}});
  const tbl=document.createElement('section');tbl.className='panel c5-shops';tbl.innerHTML=`<div class="tablewrap"><table><thead><tr><th>${t('c5Shop')}</th><th>${t('c5Conn')}</th><th class="num">${t('c5ShopOrders')}</th><th class="num">${t('c5Queue')}</th><th>${t('c5LastSync')}</th><th>${t('c5Actions')}</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td><span class="c5-shopname">${r.icon}<span><b>${esc(r.name)}</b><small>${esc(r.sub)}</small></span></span></td><td>${r.pill}</td><td class="num">${esc(r.orders)}</td><td class="num">${esc(r.queue)}</td><td><small class="c5-sync">${r.sync}</small></td><td data-c5-shopmenu="${i}"></td></tr>`).join('')}</tbody></table></div>`;
  grid.after(tbl);rows.forEach((r,i)=>{const cell=tbl.querySelector(`[data-c5-shopmenu="${i}"]`),dd=c5Dropdown('⋯',r.btns,'c5-more c5-right');if(dd)cell.appendChild(dd)});grid.hidden=true;grid.style.display='none';c5Tables(tbl)}
 // B1: shop filter + SKU search on "โควต้า Ecom แยกตามร้าน"
 const qp=[...document.querySelectorAll('#page section.panel')].find(p=>/โควต้า Ecom|Ecom quota/i.test(p.querySelector('.panelhead h2')?.textContent||''));const tb=qp?.querySelector('table');
 if(tb&&!qp.querySelector('.c5-tfilter')){const heads=[...tb.querySelectorAll('thead th')].map(th=>th.textContent.trim()),si=heads.findIndex(h=>/ร้าน|shop|ช่องทาง|channel/i.test(h)),shops=si<0?[]:[...new Set([...tb.tBodies[0].rows].map(r=>r.cells[si]?.textContent.trim()).filter(Boolean))];
  const bar=document.createElement('div');bar.className='c5-tfilter';bar.innerHTML=`${shops.length>1?`<select data-c5-tf="shop" aria-label="${t('c5Shop')}"><option value="">${t('c5AllShops')}</option>${shops.map(s=>`<option>${esc(s)}</option>`).join('')}</select>`:''}<input type="search" data-c5-tf="q" placeholder="${t('c5SkuSearch')}" aria-label="${t('c5SkuSearch')}">`;
  (qp.querySelector('.panelhead')||qp).after(bar);bar.dataset.si=si;const run=()=>{const shop=bar.querySelector('[data-c5-tf="shop"]')?.value||'',q=bar.querySelector('[data-c5-tf="q"]').value.trim().toLowerCase();
   [...tb.tBodies[0].rows].forEach(r=>{const ok=(!shop||r.cells[si]?.textContent.trim()===shop)&&(!q||r.textContent.toLowerCase().includes(q));if(ok)r.removeAttribute('data-c5-out');else r.setAttribute('data-c5-out','1')});
   const key=[...document.querySelectorAll('#page table')].indexOf(tb);c5Paginate(tb,(C5_FAMILY[view]||view)+':'+key+':'+[...tb.querySelectorAll('thead th')].map(th=>th.textContent.trim()).join('|').slice(0,80))};
  bar.addEventListener('input',run);bar.addEventListener('change',run)}}

/* ---------------------------------------------------------------- accounts & SSO: three tabs instead of one 7,000 px page */
const C5_ACC_TABS=[['users',/ผู้ใช้ปัจจุบัน|โครงสร้างฝ่ายขาย|current user|sales organi/i],['roles',/Director:|สิทธิ์และขอบเขต|งานประจำวัน|สิทธิ์รายฟังก์ชัน|permissions by function|daily tasks|roles and scope|Override/i],['scope',/ผู้จัดการรายช่องทาง|จุดหักโควตา|manager.*channel|quota deduct/i]];
let c5AccTab=null;
function c5Access(){if(view!=='access')return;const pg=$('#page');if(!pg||pg.querySelector('.c5-acctabs'))return;const secs=[...pg.children].filter(c=>c.matches('section,div')&&!c.classList.contains('c5-ro'));if(secs.length<3)return;
 try{c5AccTab=c5AccTab||sessionStorage.getItem('cr5.accTab')||'users'}catch{c5AccTab=c5AccTab||'users'}
 secs.forEach(s=>{const txt=(s.querySelector('h2')?.textContent||s.textContent).slice(0,120),m=C5_ACC_TABS.find(([,re])=>re.test(txt));s.dataset.c5Tab=m?m[0]:'users'});
 const bar=document.createElement('div');bar.className='orderTabs c5-acctabs';bar.setAttribute('role','tablist');bar.innerHTML=[['users','c5TabUsers'],['roles','c5TabRoles'],['scope','c5TabScope']].map(([k,l])=>`<button type="button" role="tab" data-c5-acc="${k}" class="${c5AccTab===k?'selected':''}" aria-selected="${c5AccTab===k}">${t(l)} <b>${secs.filter(s=>s.dataset.c5Tab===k).length}</b></button>`).join('');
 pg.prepend(bar);secs.forEach(s=>s.hidden=s.dataset.c5Tab!==c5AccTab)}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-c5-acc]');if(!b)return;c5AccTab=b.dataset.c5Acc;try{sessionStorage.setItem('cr5.accTab',c5AccTab)}catch{}document.querySelectorAll('#page [data-c5-tab]').forEach(s=>s.hidden=s.dataset.c5Tab!==c5AccTab);document.querySelectorAll('[data-c5-acc]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-selected',String(x===b))})});

/* ---------------------------------------------------------------- open SO · MT/TT: B2 notes → about · C6 empty state that says what to do */
function c5SoReadyOrders(){return db.orders.filter(o=>typeof soCanSubmit==='function'&&soCanSubmit(o)&&liveOrder(o)&&!orderDoc(o)&&!soActiveForOrder(o.id))}
function c5So(){if(view!=='soRequests')return;const pg=$('#page');if(!pg)return;
 const about=$('#c5About');pg.querySelectorAll('.panel > .panelbody > p').forEach(p=>{if(p.closest('.panel').querySelector('table')&&about){p.classList.add('c5-note');about.appendChild(p)}});
 const tbl=pg.querySelector('.panel table');const empty=pg.querySelector('.panel .empty');
 if(tbl&&!tbl.tBodies[0]?.rows.length&&empty&&!empty.dataset.c5so){empty.dataset.c5so='1';const n=c5SoReadyOrders().length,can=!!$('#soNew');
  empty.innerHTML=`<b>${t('c5SoEmpty')}</b><div class="muted">${n?tp('c5SoReady',{n:n}):t('c5SoNone')}</div>${n&&can?`<div><button type="button" data-c5-sonew="1">＋ ${t('soNew')}</button></div>`:''}`}}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-c5-sonew]'))$('#soNew')?.click()});
/* A1: the "เตรียมคำขอ SO" modal — SKU · คงเหลือ (approved · used) · ขอใช้ · ผลตรวจ — no sideways scroll · rules and the WMS code in ⓘ */
if(typeof soRequestForm==='function'){const c5SoForm=soRequestForm;soRequestForm=function(id){c5SoForm(id);const f=$('#soRequestForm'),p=typeof soModalDraft!=='undefined'?soModalDraft:null;if(!f||!p)return;
 const o=db.orders.find(x=>x.id===p.orderId),pt=o?partner(o.partner):null,old=f.querySelector('.tablewrap')||f.querySelector('table');
 if(old&&p.rows){const atp=[...f.querySelectorAll('table tbody tr')].map(tr=>tr.lastElementChild?.querySelector('.sup-atp')?.outerHTML||'');
  const wrap=document.createElement('div');wrap.className='tablewrap';wrap.innerHTML=`<table class="c5-sotable"><thead><tr><th>SKU</th><th class="num">${t('c5Left')}</th><th class="num">${t('c5Need')}</th><th>${t('c5Check')}</th></tr></thead><tbody>${p.rows.map((r,k)=>{const ok=r.actualPass!==false&&r.pass!==false,short=Math.max(0,(r.need||0)-Math.max(0,r.left||0));
   return`<tr><td><b>${esc(r.sku)}</b><small>${esc(opsMaster(r.sku)?.name||product(r.sku)?.[1]||'')}</small></td><td class="num"><b>${n(r.left)}</b><small>${tp('c5LeftSub',{q:n(r.quota),u:n(r.used)})}</small></td><td class="num">${n(r.need)}</td><td><span class="pill ${ok?'ok':'bad'}">${ok?t('c5Pass'):tp('c5Short',{n:n(short||r.short||0)})}</span>${r.actualPass===false?`<small>${t('workActualShort')}</small>`:''}${atp[k]||''}</td></tr>`}).join('')}</tbody></table>`;
  old.replaceWith(wrap)}
 // the summary line: partner · channel · SKUs · pieces · the quota rule and the WMS snapshot go to the tooltip
 const ps=[...f.querySelectorAll(':scope > p')];const rule=pt?t(quotaStageFor(pt.id)==='SO'?'quotaAtSO':'quotaAtIV'):'',wmsP=ps.find(x=>/WMS/.test(x.textContent)),sumP=ps.find(x=>pt&&x.textContent.includes(pt.name)),mock=ps.find(x=>x.textContent.trim()===t('soMockNotice'));
 const lines=(p.lines||[]);if(sumP&&pt)sumP.outerHTML=`<p class="c5-sosum"><b>${esc(tp('c5SoSum',{p:pt.name,t:pt.type,k:n(lines.length),q:n(lines.reduce((s,l)=>s+l.qty,0))}))}</b> <span class="c5-tip" title="${esc(t('c5SoRule')+': '+rule)}">ⓘ</span></p>`;
 const tipTxt=[mock?mock.textContent.trim():'',wmsP?wmsP.textContent.trim():''].filter(Boolean).join(' · ');mock?.remove();
 if(wmsP){wmsP.className='small muted';wmsP.textContent=tp('c5Wms',{t:fmtDateTime(db.wmsSnapshot?.asOf||Date.now())});wmsP.title=tipTxt}
 c5Modal('so-request')}}

/* ---------------------------------------------------------------- C9 · S&OP action detail: facts in two columns · status buttons in the fixed footer */
const c5ModalPageBefore=showModal;showModal=function(html,kind){c5ModalPageBefore(html,kind);if(kind!=='supply-sop')return;const m=$('#modal'),tb=m.querySelector('table');if(!tb||tb.closest('.c5-kvdone'))return;
 const rows=[...tb.querySelectorAll('tr')].filter(r=>r.cells.length===2);if(rows.length<4)return;const dl=document.createElement('dl');dl.className='c5-kv';
 rows.forEach(r=>{const dt=document.createElement('dt');dt.innerHTML=r.cells[0].innerHTML;const dd=document.createElement('dd');dd.innerHTML=r.cells[1].innerHTML;dl.append(dt,dd)});(tb.closest('.tablewrap')||tb).replaceWith(dl);dl.classList.add('c5-kvdone');m.classList.remove('c5-s','c5-l');m.classList.add('c5-m')};

/* ---------------------------------------------------------------- C4 · action numbers kept before CR-05 (ACT-<random>) get ACT-YYMM-#### in the order they were made · audit refs follow */
function c5ActMigrate(){if(typeof sopActs!=='function')return 0;const L=sopActs(),old=L.filter(a=>!/^ACT-\d{4}-\d{4,}$/.test(a.id));if(!old.length)return 0;
 const seq={};L.forEach(a=>{const m=/^ACT-(\d{4})-(\d{4,})$/.exec(a.id);if(m)seq[m[1]]=Math.max(seq[m[1]]||0,+m[2])});const map={};
 old.slice().sort((a,b)=>(a.created||0)-(b.created||0)).forEach(a=>{const ym=dateKey(a.created||Date.now()).slice(2,7).replace('-','');seq[ym]=(seq[ym]||0)+1;map[a.id]=(a.oldId=a.id,'ACT-'+ym+'-'+String(seq[ym]).padStart(4,'0'));a.id=map[a.oldId]});
 (db.logs||[]).forEach(l=>{if(typeof l.ref==='string')Object.keys(map).forEach(o=>{if(l.ref.includes(o))l.ref=l.ref.split(o).join(map[o])})});
 (db.sopActions||[]).forEach(a=>{if(a.ref&&map[a.ref])a.ref=map[a.ref]});persist();return old.length}

/* ---------------------------------------------------------------- wiring */
const c5PagesBind=bind;bind=function(){c5PagesBind();if(!session)return;c5Alloc();c5Ecom();c5Access();c5So()};
const c5PagesRender=render;render=function(){if(session&&!opsCheck())c5ActMigrate();c5PagesRender();if(session&&view==='soRequests')c5So()};
