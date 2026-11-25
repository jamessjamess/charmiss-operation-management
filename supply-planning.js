/* supply-planning.js — CR-01 · Charmiss Operations Management.
   Adds the SUPPLY PLANNING / SUPPLY SETUP menu groups (pages moved from the Supply Chain Dashboard v3.3, run by supply/host.js)
   to the Ops shell, the Supply Chain Planner role, the 9 supply.* function permissions on the existing ceiling mechanism,
   Light / Dark / System for the whole app, and the two demo datasets (UAT seed · Integrated demo).
   Same layering as the other Ops modules: every hook keeps the function it wraps (…Before) and calls it first.
   Supply Planning is read-only: nothing here reserves / deducts quota, edits WMS or changes an order status. */
Object.assign(dict.th,{workspace:'Charmiss Ops',supOverview:'ภาพรวม Supply',supStock:'Stock & Projection',supExpiry:'เสี่ยงหมดอายุ',supConsign:'ฝากขาย (Consignment)',supCalendar:'ของเข้า & CN Calendar',supReplen:'วางแผนสั่งผลิต',supQuota:'Quota vs Actual',supProposals:'ข้อเสนอ Supply',supReview:'Supply Review (Weekly/Monthly)',supSetup:'ข้อมูล & ตั้งค่า Supply',planner:'Supply Chain Planner',supEyebrow:'SUPPLY PLANNING',supSetupEyebrow:'SUPPLY SETUP',themeLabel:'ธีม',themeLight:'สว่าง',themeDark:'มืด',themeSystem:'ตามระบบ',dsLabel:'ชุดข้อมูล',dsUat:'UAT seed',dsIntegrated:'Integrated demo',dsUatDesc:'ชุดเดิมของ Ops (6 SKU · คู่ค้าสาธิต) ใช้รัน UAT เดิม — หน้า Supply แสดงตาราง Supply ของ Integrated demo โดยไม่มีข้อมูลจาก Ops (SKU / คู่ค้าคนละชุด)',dsIntegratedDesc:'Master และประวัติ 52 สัปดาห์จาก Supply (120 SKU · 15 คู่ค้า) · ออเดอร์ / โควตา / งานค้างของ Ops ย้ายมาอยู่บน SKU และคู่ค้าชุดเดียวกัน · WMS on-hand = สต็อก WH ของ Supply ณ 23 พ.ย. 2026',dsChoose:'เลือกชุดข้อมูลสาธิต',dsStart:'เริ่มชุดนี้',dsBuilding:'กำลังสร้างชุดข้อมูล…',dsDone:'เริ่มชุดสาธิตใหม่แล้ว',dsFail:'สร้างชุด Integrated demo ไม่สำเร็จ: อ่านตาราง Supply ไม่ได้',supSoon:'มาใน Phase C',supReadOnlyNote:'Supply Planning อ่านอย่างเดียว · ทุกอย่างที่ส่งกลับเป็น "ข้อเสนอ" ที่ต้องมีคนอนุมัติ',supPermGroup:'Supply Planning'});
Object.assign(dict.en,{workspace:'Charmiss Ops',supOverview:'Supply overview',supStock:'Stock & Projection',supExpiry:'Expiry risk',supConsign:'Consignment',supCalendar:'Inbound & CN calendar',supReplen:'Replenishment planning',supQuota:'Quota vs Actual',supProposals:'Supply proposals',supReview:'Supply Review (Weekly/Monthly)',supSetup:'Supply data & settings',planner:'Supply Chain Planner',supEyebrow:'SUPPLY PLANNING',supSetupEyebrow:'SUPPLY SETUP',themeLabel:'Theme',themeLight:'Light',themeDark:'Dark',themeSystem:'System',dsLabel:'Dataset',dsUat:'UAT seed',dsIntegrated:'Integrated demo',dsUatDesc:'The original Ops data (6 SKUs · demo partners) for the existing UAT — Supply pages show the Integrated demo Supply tables without Ops data (different SKUs / partners)',dsIntegratedDesc:'Master data and 52 weeks of history from Supply (120 SKUs · 15 accounts) · Ops orders / quota / work items moved onto the same SKUs and accounts · WMS on-hand = Supply WH stock on 23 Nov 2026',dsChoose:'Choose a demo dataset',dsStart:'Start this dataset',dsBuilding:'Building the dataset…',dsDone:'Demo dataset restarted',dsFail:'Could not build the Integrated demo: the Supply tables did not load',supSoon:'Coming in Phase C',supReadOnlyNote:'Supply Planning is read-only · anything it sends back is a proposal that needs an approver',supPermGroup:'Supply Planning'});

/* ---------------------------------------------------------------- 7.1 · Supply Chain Planner */
if(!roles.includes('planner'))roles.push('planner');
if(!fuProfiles.some(p=>p.id==='planner'))fuProfiles.push({id:'planner',role:'planner',name:'Supply Chain Planner'});

/* ---------------------------------------------------------------- 7.2 · 9 function permissions, same ceiling / default / audit mechanism */
Object.assign(fuActions,{
 'supply.view':['ดูหน้า Supply Planning','View Supply Planning'],'supply.export':['ส่งออกข้อมูล Supply','Export Supply data'],'supply.comment':['เขียน Commentary ใน Supply Review','Write Supply Review commentary'],
 'supply.propose':['สร้างข้อเสนอ Supply','Create Supply proposals'],'supply.approve.recall':['อนุมัติข้อเสนอเรียกคืน CN','Approve CN recall proposals'],'supply.approve.quota':['อนุมัติข้อเสนอ Quota เดือนถัดไป','Approve next-month quota proposals'],
 'supply.approve.po':['อนุมัติแผนสั่งผลิต (PO)','Approve production (PO) proposals'],'supply.settings':['แก้ Threshold ของ Supply','Change Supply thresholds'],'supply.import':['นำเข้าข้อมูล Supply','Import Supply data']
});
/* ceiling = the most a Director may grant · default = what the role has out of the box (CR-01 7.3) */
const SUP_RULES={
 'supply.view':{ceil:p=>['director','manager','planner','finance','warehouse'].includes(p.role),def:p=>['director','manager','planner','finance','warehouse'].includes(p.role)},
 'supply.export':{ceil:p=>['director','manager','planner','finance','warehouse'].includes(p.role),def:p=>['director','manager','planner'].includes(p.role)},
 'supply.comment':{ceil:p=>['director','manager','planner'].includes(p.role),def:p=>p.role==='planner'},
 'supply.propose':{ceil:p=>['director','manager','planner'].includes(p.role),def:p=>p.role==='planner'},
 'supply.approve.recall':{ceil:p=>p.role==='director'||(p.role==='manager'&&p.group==='MT'),def:p=>p.role==='director'||(p.role==='manager'&&p.group==='MT')},
 'supply.approve.quota':{ceil:p=>['director','manager'].includes(p.role),def:p=>['director','manager'].includes(p.role)},
 'supply.approve.po':{ceil:p=>p.role==='director',def:p=>p.role==='director'},
 'supply.settings':{ceil:p=>['planner','admin'].includes(p.role),def:p=>['planner','admin'].includes(p.role)},
 'supply.import':{ceil:p=>['planner','admin'].includes(p.role),def:p=>['planner','admin'].includes(p.role)}
};
const supCeilingBefore=fuCeiling;fuCeiling=function(p,a){if(String(a).startsWith('supply.'))return !!p&&!!SUP_RULES[a]&&SUP_RULES[a].ceil(p);return supCeilingBefore(p,a)};
const supDefaultBefore=fuDefault;fuDefault=function(p,a){if(String(a).startsWith('supply.'))return fuCeiling(p,a)&&SUP_RULES[a].def(p);return supDefaultBefore(p,a)};

/* ---------------------------------------------------------------- 7.3 · which Supply pages each role sees (menu hidden, direct link refused) */
const SUP_PLAN=['supOverview','supStock','supExpiry','supConsign','supCalendar','supReplen','supQuota','supProposals','supReview'];
const SUP_ICON={supOverview:'◈',supStock:'▨',supExpiry:'◔',supConsign:'⌂',supCalendar:'▭',supReplen:'↻',supQuota:'◉',supProposals:'✎',supReview:'◧',supSetup:'⚙'};
const SUP_ROLE_PAGES={director:SUP_PLAN,manager:['supOverview','supStock','supExpiry','supConsign','supCalendar','supQuota','supProposals','supReview'],planner:[...SUP_PLAN,'supSetup'],admin:['supSetup'],finance:['supCalendar','supReview'],warehouse:['supCalendar','supExpiry'],salesAdmin:[]};
function supLockChannel(){if(!session||!['manager','salesAdmin'].includes(session.role))return null;return{MT:'MT',TT:'TT',Ecom:'ECOM'}[orgSessionGroup()]||'—'}
function supPages(){if(!workIdentityValid())return[];let list=SUP_ROLE_PAGES[session.role]||[];if(supLockChannel()&&supLockChannel()!=='MT')list=list.filter(v=>v!=='supConsign');return list}
function supCanVisit(v){if(!Supply.isView(v)||!supPages().includes(v))return false;if(v==='supSetup')return fuCan('supply.settings')||fuCan('supply.import');return fuCan('supply.view')}
const supVisitBefore=workCanVisit;workCanVisit=function(v){return Supply.isView(v)?supCanVisit(v):supVisitBefore(v)};

/* ---------------------------------------------------------------- 5.1 · Sidebar grouped into modules (collapsible, like the SLA Tracking menu).
   The 14 Commerce Operations items keep their names and their order; only group headers are added between them.
   A group with no visible item is not shown; the group holding the current page is always open. */
const SUP_NAV_GROUPS=[
 ['core',{th:'CORE',en:'CORE'},['overview']],
 ['sales',{th:'SALES',en:'SALES'},['orders','ecommerce','customers']],
 ['stock',{th:'PRODUCTS & QUOTA',en:'PRODUCTS & QUOTA'},['catalog','allocation','partners']],
 ['fulfil',{th:'FULFILLMENT',en:'FULFILLMENT'},['soRequests','workQueue','documents']],
 ['system',{th:'REPORTS & SYSTEM',en:'REPORTS & SYSTEM'},['reports','access','audit']],
 ['after',{th:'AFTER-SALES',en:'AFTER-SALES'},['returns']],
 ['supmon',{th:'SUPPLY MONITOR',en:'SUPPLY MONITOR'},['supOverview','supStock','supExpiry','supConsign','supCalendar']],
 ['supplan',{th:'SUPPLY PLANNING',en:'SUPPLY PLANNING'},['supReplen','supQuota','supProposals','supReview']],
 ['supset',{th:'SUPPLY SETUP',en:'SUPPLY SETUP'},['supSetup']]
];
function supNavCollapsed(){try{return JSON.parse(storage.getItem('ops.navCollapsed')||'[]')}catch{return[]}}
function supNavGroups(){
 const btn={},order=[];workspaceNav().replace(/<button data-view="([^"]+)"[\s\S]*?<\/button>/g,(m,v)=>{btn[v]=m;order.push(v);return m});
 [...SUP_PLAN,'supSetup','supIntake'].filter(supCanVisit).forEach(v=>{   // CR-03: + supIntake
btn[v]=`<button data-view="${v}" class="${view===v?'active':''}"><span>${SUP_ICON[v]}</span>${t(v)}</button>`});
 const known=new Set(SUP_NAV_GROUPS.flatMap(g=>g[2])),groups=SUP_NAV_GROUPS.concat([['other',{th:'OTHER',en:'OTHER'},order.filter(v=>!known.has(v))]]),closed=supNavCollapsed();
 return groups.map(([id,label,views])=>{const items=views.filter(v=>btn[v]);if(!items.length)return '';const active=items.some(v=>/class="active"/.test(btn[v])),open=active||!closed.includes(id);
  return `<div class="navgroup${open?'':' collapsed'}" data-group="${id}"><button type="button" class="navhead" data-navgroup="${id}" aria-expanded="${open}"><span>${label[lang]||label.en}</span><i aria-hidden="true">⌃</i></button><nav>${items.map(v=>btn[v]).join('')}</nav></div>`}).join('')
}
document.addEventListener('click',e=>{const h=e.target.closest?.('[data-navgroup]');if(!h)return;const g=h.closest('.navgroup'),id=h.dataset.navgroup,closed=new Set(supNavCollapsed());g.classList.toggle('collapsed');const open=!g.classList.contains('collapsed');h.setAttribute('aria-expanded',open);open?closed.delete(id):closed.add(id);storage.setItem('ops.navCollapsed',JSON.stringify([...closed]))});

/* ---------------------------------------------------------------- pages */
function supProposalsPage(){const types=[['recall','supply.approve.recall'],['quota','supply.approve.quota'],['po','supply.approve.po']];return `<div class="banner"><span>✎ &nbsp; ${esc(St('prop_soon_t'))}</span><span>${t('supSoon')}</span></div><div class="cards">${types.map(([k])=>`<section class="card"><div class="between"><span class="pill">${k.toUpperCase()}</span></div><h2>${esc(St('prop_t_'+k))}</h2><p>${esc(St('prop_d_'+k))}</p></section>`).join('')}</div><section class="panel" style="margin-top:20px"><div class="panelbody"><p style="margin:0">${esc(St('prop_soon_d'))}</p><p class="muted" style="margin:8px 0 0">${t('supReadOnlyNote')}</p></div></section>`}
const supPageBefore=page;page=function(){if(Supply.isView(view)){if(!supCanVisit(view))return `<section class="panel"><div class="empty">${t('workDenied')}</div></section>`;return view==='supProposals'?supProposalsPage():Supply.shellHTML()}return supPageBefore()};

/* navigate(v, {fromHash}) — a Supply page opened from the menu adds a history entry; back / forward / a pasted link replaces it */
let supPush=false;
const supNavigateBefore=navigate;navigate=function(v,opts){supPush=Supply.isView(v)&&!(opts&&opts.fromHash);const ok=supNavigateBefore(v);if(ok===false)supPush=false;return ok};

/* render: header text for Supply pages, theme switch, dataset in the footer; leaving Supply drops the Supply URL */
function supUserKey(){return session?(session.role+':'+(session.userId||'')):''}
/* another user signed in → the Supply filters and open SKU of the previous user are dropped (never carried across accounts) */
function supUserChanged(){const key=supUserKey();if(Supply.ctx.user===key)return;Supply.ctx.user=key;Supply.App.F=null;Object.assign(Supply.App.ui,{sku:null,stockTab:'all',sort:null,pageNo:1})}
const supRenderBefore=render;render=function(){supApplyTheme();supUserChanged();supRenderBefore();if(!session)return;if(!Supply.isView(view))Supply.clearHash();supDecorate()};
function supDecorate(){
 const tools=$('header .tools');
 if(tools&&!$('#themeSel')){const m=supThemeMode();tools.insertAdjacentHTML('afterbegin',`<select id="themeSel" aria-label="${t('themeLabel')}">${['light','dark','system'].map(k=>`<option value="${k}" ${m===k?'selected':''}>${t('themeLabel')} · ${t('theme'+k[0].toUpperCase()+k.slice(1))}</option>`).join('')}</select>`);$('#themeSel').onchange=e=>{storage.setItem('ops.theme',e.target.value);supApplyTheme();render()}}
 const foot=$('#footBuild');if(foot&&!$('#footDataset'))foot.insertAdjacentHTML('afterend',`<span id="footDataset">${t('dsLabel')}: <b>${t(supDataset()==='integrated'?'dsIntegrated':'dsUat')}</b></span>`);
 if(view==='stockoverview')supStockoutColumn();
 if(typeof appVersionUI==='function')appVersionUI();   // CR-03: app version in the sidebar + footer
 if(Supply.isView(view)&&supCanVisit(view)){I18N.setLang(lang);const page=Supply.PAGE_OF[view],eb=$('.pagehead .eyebrow'),sub=$('.pagehead .heading .muted');if(eb)eb.textContent='CHARMISS / '+(['supSetup','supIntake'].includes(view)?t('supSetupEyebrow'):t('supEyebrow'));if(sub)sub.textContent=St('q_'+page)}
}
/* bind: mount the Supply page into the shell the Ops render just drew; the reset button picks a dataset */
const supBindBefore=bind;bind=function(){supBindBefore();if($('#reset')&&!$('#reset').disabled)$('#reset').onclick=supDatasetForm;if(Supply.isView(view)&&view!=='supProposals'&&$('#supRoot')){Supply.ctx.can=a=>fuCan(a);Supply.ctx.lockCh=supLockChannel();Supply.mount(view,{push:supPush})}else if(view==='supProposals'&&supCanVisit(view)&&location.hash!=='#/supply/proposals')history[supPush?'pushState':'replaceState'](null,'','#/supply/proposals');supPush=false};

/* login: the default page is หน้าหลัก (overview) · a pasted Supply link opened in a new tab still opens that page right after sign-in
   (or is refused by the page gate) — once per page load and never on a reload, so a hash left over from the last session does not win (CR-03) */
let supDeepUsed=(()=>{try{return performance.getEntriesByType('navigation')[0]?.type==='reload'}catch{return false}})();
const supLoginBefore=login;login=function(){supLoginBefore();if(typeof appVersionUI==='function')appVersionUI();   // CR-03: version on the login screen
 const b=$('#login');if(!b||!b.onclick)return;const go=b.onclick;b.onclick=()=>{const hash=location.hash,ph=Supply.parseHash(hash),deep=ph&&!supDeepUsed;supDeepUsed=true;go();if(!session)return;
  if(deep&&Supply.VIEW_OF[ph.page]){history.replaceState(null,'',hash);if(navigate(Supply.VIEW_OF[ph.page],{fromHash:true})===false)Supply.clearHash()}
  else{if(ph)Supply.clearHash();if(view!=='overview')navigate('overview')}}};

/* ---------------------------------------------------------------- 4 · Light / Dark / System for the whole app (one token set) */
function supThemeMode(){const m=storage.getItem('ops.theme');return ['light','dark','system'].includes(m)?m:'system'}
function supApplyTheme(){const m=supThemeMode(),dark=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches),v=dark?'dark':'light';if(document.documentElement.getAttribute('data-theme')!==v)document.documentElement.setAttribute('data-theme',v)}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(supThemeMode()==='system'){supApplyTheme();if(session)render()}});

/* ---------------------------------------------------------------- 2.2 · two demo datasets */
function supDataset(){return db?.dataset==='integrated'?'integrated':'uat'}
function supDatasetForm(){if(!isStockDirector())return toast(t('denied'));const cur=supDataset();showModal(`<form class="dialogbody" id="dsForm"><div class="between"><div><div class="eyebrow">${t('reset').toUpperCase()}</div><h2>${t('dsChoose')}</h2></div><button type="button" data-close aria-label="${t('close')}">×</button></div>${[['uat','dsUat','dsUatDesc'],['integrated','dsIntegrated','dsIntegratedDesc']].map(([v,l,d])=>`<label class="dsopt"><input type="radio" name="ds" value="${v}" ${v===cur?'checked':''}><span><b>${t(l)}</b><small>${t(d)}</small></span></label>`).join('')}<p class="muted">${t('confirmReset')}</p><div class="err" id="formError" role="alert"></div><div class="dialogactions"><button type="button" data-close>${t('cancel')}</button><button class="primary" type="submit">${t('dsStart')} →</button></div></form>`,'dataset');bindClose();$('#dsForm').onsubmit=async e=>{e.preventDefault();const ds=new FormData(e.target).get('ds');const btn=e.target.querySelector('.primary');btn.disabled=true;btn.textContent=t('dsBuilding');try{await supResetDataset(ds)}catch(err){console.error(err);btn.disabled=false;btn.textContent=t('dsStart')+' →';$('#formError').textContent=t('dsFail')}}}
/* Both datasets start from a first-visit build: the Ops 7.0 in-page reset (db=initial(); initCommerce()) throws in v13 because
   initEcommerce → free() → wmsRow() runs before wmsInit(), and leaves a half-built db. So: clear the stored db, keep the signed-in
   user for this tab, reload → every module builds the UAT seed exactly as on a first visit → the Integrated demo is applied on top. */
const SUP_PENDING='ops.pendingDataset',SUP_RESUME='ops.resumeSession';
async function supResetDataset(ds){
 if(ds==='integrated')await Supply.ensureData();   // fail here (dialog stays open) if the Supply tables cannot load
 try{sessionStorage.setItem(SUP_RESUME,JSON.stringify({session,view}));sessionStorage.setItem(SUP_PENDING,ds)}catch{}
 try{localStorage.removeItem('charmiss-stock-demo-v1')}catch{}
 location.reload()
}
async function supResumeAfterReset(){
 let pending=null,resume=null;try{pending=sessionStorage.getItem(SUP_PENDING);resume=JSON.parse(sessionStorage.getItem(SUP_RESUME)||'null');sessionStorage.removeItem(SUP_PENDING);sessionStorage.removeItem(SUP_RESUME)}catch{}
 if(!pending)return;
 if(resume?.session&&roles.includes(resume.session.role)){session=resume.session;view='overview';Supply.clearHash()}   // CR-03: a fresh demo opens หน้าหลัก
 if(pending==='integrated'){try{await Supply.ensureData();supIntegrate(Supply.App.base);supWmsFromLots();if(typeof supFeedSeed==='function')supFeedSeed(Supply.App.base);seedProducts.splice(0,seedProducts.length);opsSyncProducts()}catch(err){console.error(err);render();return toast(t('dsFail'))}}
 if(session)opsAudit('dsResetEvent',t(pending==='integrated'?'dsIntegrated':'dsUat'),[],null,pending);
 persist();render();toast(t('dsDone')+' · '+t(pending==='integrated'?'dsIntegrated':'dsUat'))
}
/* The Ops demo SKUs / partners → the Supply master (one SKU + account_id set, CR-01 6.2 / 6.4). Every id is replaced as a whole JSON string,
   so record ids that merely contain an old code (e.g. AL-DIRECT-…-16160) keep their name and their guards still find them. */
const SUP_SKU_ALIAS={'11021':'JB-FD-001','32160':'JB-LP-007','16310':'JB-CH-001','51001':'CP-SK-001','12070':'TF-FD-001','16160':'CM-LP-004'};
const SUP_PARTNER_ALIAS={p1:'A01',p2:'A03',p6:'A02',p3:'A08',p4:'A09',p5:'A10','ec-shopee':'A10','ec-lazada':'A11','ec-tiktok':'A12','ec-linecommerce':'A13','ec-lineoa':'A14','ec-web':'A15'};
function supIntegrate(raw){
 let s=JSON.stringify(db);for(const [a,b] of Object.entries({...SUP_SKU_ALIAS,...SUP_PARTNER_ALIAS}))s=s.split('"'+a+'"').join('"'+b+'"');db=JSON.parse(s);
 const old={};db.partners.forEach(p=>{old[p.id]={...(old[p.id]||{}),...p}});
 const type={MT:'MT',TT:'TT',ECOM:'EC'},group={MT:'MT',TT:'TT',ECOM:'Ecom'};
 db.partners=raw.account_master.map(a=>{const o=old[a.account_id]||{},p={...o,id:a.account_id,type:type[a.channel],name:a.name,channel:a.sub_channel,area:o.area||(a.channel==='ECOM'?'Online':'National'),sales:o.sales||(a.channel==='MT'?'Key Account · '+a.name:a.channel==='TT'?'Sales · '+a.name:'E-commerce'),shelf:Math.round(+a.min_shelf_life_pct*365),consignment:a.is_consignment==='Y'};return p}).concat(db.partners.filter(p=>p.type==='DIRECT'&&!raw.account_master.some(a=>a.account_id===p.id)));
 db.channelUsers.forEach(u=>{const g=orgGroupForUser(u.id),ids=raw.account_master.filter(a=>group[a.channel]===g).map(a=>a.account_id);u.channelIds=[...new Set([...(u.channelIds||[]),...ids])].filter(id=>db.partners.some(p=>p.id===id))});
 const wh={};raw.stock_lot.filter(r=>r.location==='WH').forEach(r=>{wh[r.sku]=(wh[r.sku]||0)+(+r.qty)});
 db.productMaster=raw.sku_master.map(k=>({sku:k.sku,name:k.name,unit:k.uom||'pcs',price:+k.std_price,barcode:k.sku,erpSku:'ERP-SKU-'+k.sku,safety:Math.round((wh[k.sku]||0)*0.05/10)*10,active:k.status!=='Discontinue',shelfDays:Math.round(+k.shelf_life_months*30.4),brand:k.brand,category:k.category,status:k.status}));
 db.lots=raw.stock_lot.filter(r=>r.location==='WH').map(r=>({id:'LOT-'+r.sku+'-'+r.lot_no,sku:r.sku,lot:r.lot_no,expiry:r.exp_date,qty:+r.qty,cost:+(raw.sku_master.find(k=>k.sku===r.sku)?.unit_cost||0),grade:'A',opening:true,mfg:r.mfg_date}));
 /* the seeded quota requests were sized for the 6-SKU demo stock: keep each SKU's active total within 80% of what it can allocate */
 const cap=sku=>{const m=db.productMaster.find(p=>p.sku===sku);return m?Math.max(0,(wh[sku]||0)-m.safety):0};
 [...new Set(db.allocations.map(a=>a.sku))].forEach(sku=>{const act=db.allocations.filter(a=>a.sku===sku&&['submitted','approved'].includes(a.status)&&a.qty>200),sum=act.reduce((x,a)=>x+a.qty,0),lim=Math.floor(cap(sku)*0.8);if(sum>lim&&sum>0){const f=lim/sum;act.forEach(a=>{a.qty=Math.max(10,Math.floor(a.qty*f/10)*10)})}});
 db.skuAlias={...SUP_SKU_ALIAS};db.partnerAlias={...SUP_PARTNER_ALIAS};db.dataset='integrated';db.datasetBuiltAt=Date.now()
}
/* WMS Actual of the Integrated demo = the Supply WH lots on 23 Nov 2026 (Σ lots = on-hand; usable = grade A, not expired).
   Built here because the Ops wmsInit() reads the snapshot it is creating (opsUsable → wmsRow) once quota-policy.js is loaded. */
function supWmsFromLots(){const rows=db.productMaster.map(m=>{const ls=db.lots.filter(l=>l.sku===m.sku),ok=ls.filter(l=>opsLotUsable(l));return{sku:m.sku,onHand:ls.reduce((x,l)=>x+l.qty,0),usable:ok.reduce((x,l)=>x+l.qty,0),shelfDays:ok.length?Math.max(...ok.map(l=>opsDays(l.expiry))):0}});db.wmsSnapshot={source:'WMS DEMO · Integrated',version:'INTEGRATED-'+Date.now(),asOf:Date.now(),readAt:Date.now(),rows,fulfilledOrders:db.wmsSnapshot?.fulfilledOrders||[]}}
Object.assign(dict.th,{dsResetEvent:'เริ่มชุดสาธิตใหม่'});Object.assign(dict.en,{dsResetEvent:'Demo dataset restarted'});

/* ---------------------------------------------------------------- Supply meta line + page-level permissions */
Supply.metaHTML=function(App){const n=Object.values(App.sources).filter(s=>s.type==='import').length,fmt=ts=>new Date(ts).toLocaleString(lang==='th'?'th-TH-u-ca-gregory':'en-GB',{timeZone:'Asia/Bangkok',hour12:false,dateStyle:'medium',timeStyle:'short'}),lock=Supply.ctx.lockCh,fm=App.feedMeta;
 /* CR-01 6.1: every Supply page says how fresh the Ops data is — "ข้อมูล ณ <เวลา> · WMS version <n>" */
 const src=fm?`<span>${U.icon('info')}${esc(tp('feedMeta',{t:fmt(fm.cut),v:fm.wmsVersion}))}</span><span>${esc(fm.hasEvents?tp('feedMetaEvents',{i:fm.issued,d:fm.delivered,r:fm.inTransit,c:fm.cn}):t('feedMetaNone'))}</span>`:`<span>${U.icon('info')}${esc(St('sup_meta',{t:fmt(App.loadedAt||Date.now()),src:n?St('sup_src_import',{n}):St('sup_src_mock')}))}</span>${supDataset()==='uat'?`<span>${esc(t('feedUat'))}</span>`:''}`;
 return src+(lock?`<span class="lockchip">${U.icon('lock')}${esc(St('sup_scope',{c:lock}))}</span>`:'')};
Supply.afterRender=function(main){
 const can=Supply.ctx.can;
 if(Supply.App.page==='report'&&!can('supply.comment')){const ta=main.querySelector('#rpTa');if(ta){ta.readOnly=true;ta.placeholder=St('sup_no_comment');ta.title=St('sup_no_comment')}main.querySelectorAll('#rpClear').forEach(b=>b.remove())}
 if(Supply.App.page==='data'){
  if(!can('supply.import')){main.querySelectorAll('[data-imp]').forEach(i=>{const l=i.closest('label')||i;l.remove()});main.querySelectorAll('#resetAll').forEach(b=>b.remove());const h=main.querySelector('.card .card-head h3');if(h)h.insertAdjacentHTML('afterend',`<span class="small muted">${esc(St('sup_no_import'))}</span>`)}
  if(!can('supply.settings')){const f=main.querySelector('#setForm');if(f){f.querySelectorAll('input,select,button').forEach(x=>x.disabled=true);f.insertAdjacentHTML('beforebegin',`<p class="small muted">${esc(St('sup_no_settings'))}</p>`)}main.querySelectorAll('#setSave,#setDefault').forEach(b=>b.remove())}
 }
 if(Supply.App.page==='quota'){const mk=Calc.monthKey(Supply.App.model().asDn),DB=Supply.App.DB;if(DB.quotaRes&&DB.quotaRes.some(m=>m.has(mk))){const h=main.querySelector('#qHost');if(h)h.insertAdjacentHTML('beforebegin',`<div class="note">${U.icon('info')}<span>${esc(St('q_ops_note'))}</span></div>`)}}   // CR-01 6.3
 supCrossLinks(main);
 if(['calendar','replen'].includes(Supply.App.page)&&typeof Supply.poCard==='function')Supply.poCard(main,Supply.App);   // CR-01 F7
};

/* ---------------------------------------------------------------- 5.3 · one topic = one page, linked both ways */
Object.assign(dict.th,{reserve:'Safety Units (Ecom)',xNowStock:'สต็อก "ตอนนี้" (Available · Reserved · Safety Units) อยู่ที่',xQuotaOwner:'อนุมัติ / จัดสรร Quota ทำที่',xQuotaNote:'หน้านี้วิเคราะห์อย่างเดียว ไม่มีปุ่มแก้ Quota',xReturns:'ทำรายการคืนสินค้า / CN ที่',xWork:'งานค้างปฏิบัติการอยู่ที่',xStockout:'Stockout Date (Supply)',xStockoutTip:'วันที่คาดว่าของหมด จาก Stock & Projection (Run Rate L4W · AS OF ล่าสุด) — กดเพื่อดู Projection ของ SKU'});
Object.assign(dict.en,{reserve:'Safety Units (Ecom)',xNowStock:'Stock "now" (Available · Reserved · Safety Units) lives in',xQuotaOwner:'Quota is approved / allocated in',xQuotaNote:'This page only analyses — there is no quota edit here',xReturns:'Returns / CN are recorded in',xWork:'Operational work items live in',xStockout:'Stockout date (Supply)',xStockoutTip:'Projected stockout date from Stock & Projection (Run Rate L4W · latest AS OF) — click for the SKU projection'});
function supCrossLinks(main){
 const go=(v,label)=>workCanVisit(v)?`<button type="button" data-xview="${v}">${esc(t(label||v))} →</button>`:`<b>${esc(t(label||v))}</b>`,page=Supply.App.page;
 const items={stock:[t('xNowStock')+' '+go(workCanVisit('stockoverview')?'stockoverview':'allocation','allocation')],quota:[t('xQuotaOwner')+' '+go('allocation'),t('xQuotaNote')],calendar:[t('xReturns')+' '+go('returns')],report:[t('xWork')+' '+go('workQueue')]}[page];
 if(!items)return;const head=main.querySelector('.pagehead');if(!head)return;
 head.insertAdjacentHTML('afterend',`<div class="xlinks">${items.map(x=>`<span>${x}</span>`).join('')}</div>`);
 main.querySelectorAll('[data-xview]').forEach(b=>b.onclick=()=>navigate(b.dataset.xview));
}
/* Ops › สินค้าคงคลังและโควตา › Actual จาก WMS: + "Stockout Date" from Supply, linked to the SKU projection (SKU-level, same for every department) */
let supStockoutCache=null;
function supStockoutColumn(){
 const table=[...document.querySelectorAll('#page table')].find(tb=>/WMS On-hand/.test(tb.querySelector('thead')?.textContent||''));if(!table||table.dataset.supStockout)return;
 table.dataset.supStockout='1';table.querySelector('thead tr').insertAdjacentHTML('beforeend',`<th title="${esc(t('xStockoutTip'))}">${t('xStockout')}</th>`);
 const rows=[...table.querySelectorAll('tbody tr')];rows.forEach(tr=>tr.insertAdjacentHTML('beforeend','<td class="sup-so">…</td>'));
 Supply.ensureData().then(()=>{
  const A=Supply.App;if(!supStockoutCache||supStockoutCache.db!==A.DB){const F={asDn:Math.max(A.DB.minAsOf,Math.min(Calc.monday(Calc.dn(new Date().toISOString().slice(0,10))),A.DB.maxAsOf)),view:'W',ch:[],acc:[],brand:[],cat:[],q:'',rr:'L4W',h:3},M=Calc.computeModel(A.DB,F,A.S,{});supStockoutCache={db:A.DB,map:Object.fromEntries(M.rows.map(r=>[r.sku,r]))}}
  const canLink=workCanVisit('supStock');
  rows.forEach(tr=>{const cell=tr.querySelector('.sup-so'),sku=tr.querySelector('td')?.childNodes[0]?.textContent?.trim(),r=supStockoutCache.map[sku];if(!cell)return;if(!r){cell.textContent='—';return}const d=r.stockoutDn==null?'—':U.date(r.stockoutDn);cell.innerHTML=canLink?`<button type="button" class="linkish" data-sup-sku="${esc(sku)}">${d} ↗</button>`:d});
  table.querySelectorAll('[data-sup-sku]').forEach(b=>b.onclick=()=>{Supply.App.ui.sku=b.dataset.supSku;navigate('supStock')});
 }).catch(()=>rows.forEach(tr=>{const c=tr.querySelector('.sup-so');if(c)c.textContent='—'}));
}

/* ---------------------------------------------------------------- start: Integrated demo keeps only the Supply SKUs in the working product list */
if(supDataset()==='integrated'){seedProducts.splice(0,seedProducts.length);opsSyncProducts()}
supApplyTheme();
render();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',supResumeAfterReset,{once:true});else supResumeAfterReset();   // CR-03 fix: wait for the CDN libraries (Papa / XLSX / Chart) at the end of the page — a slow CDN made the Integrated reset fall back to UAT
