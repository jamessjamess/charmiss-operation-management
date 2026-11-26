/* cr04-nav.js — CR-04 R1 · the menu in the order work flows: sell → ship → after-sales → stock → plan → report → data → admin.
   Page ids, names and access (page gate) stay exactly as before — only the order and the group headers change.
   หน้าหลัก has no group header · DATA and ADMIN start collapsed (a group a user opened / closed is remembered) · the group of the
   current page is always open. Replaces CR-01 5.1 (keep the 14 Ops items in their v13 order). */
Object.assign(dict.th,{navSales:'SALES',navFulfil:'FULFILLMENT',navInventory:'INVENTORY & QUOTA',navSupMon:'SUPPLY MONITOR',navSupPlan:'SUPPLY PLANNING',navReports:'REPORTS',navData:'DATA',navAdmin:'ADMIN'});
Object.assign(dict.en,{navSales:'SALES',navFulfil:'FULFILLMENT',navInventory:'INVENTORY & QUOTA',navSupMon:'SUPPLY MONITOR',navSupPlan:'SUPPLY PLANNING',navReports:'REPORTS',navData:'DATA',navAdmin:'ADMIN'});
const CR4_NAV=[
 ['home',null,['overview']],
 ['sales','navSales',['orders','ecommerce','customers']],
 ['fulfil','navFulfil',['soRequests','workQueue','returns']],
 ['inventory','navInventory',['allocation','stockoverview']],
 ['supmon','navSupMon',['supOverview','supStock','supExpiry','supConsign','supCalendar']],
 ['supplan','navSupPlan',['supReplen','supQuota','supProposals','supSop','supReview']],
 ['reports','navReports',['reports']],
 ['data','navData',['catalog','partners','supIntake','documents']],
 ['admin','navAdmin',['access','audit','supSetup']]
];
const CR4_NAV_CLOSED=['data','admin'];   // D2
function cr4NavState(){let closed=[],opened=[];try{closed=JSON.parse(storage.getItem('ops.navCollapsed')||'[]');opened=JSON.parse(storage.getItem('ops.navOpened')||'[]')}catch{}return{closed:new Set(closed),opened:new Set(opened)}}
/** the Ops buttons (workspaceNav, with every module's additions) + the Supply pages the role may open, grouped by CR4_NAV */
supNavGroups=function(){
 const btn={},order=[];workspaceNav().replace(/<button data-view="([^"]+)"[\s\S]*?<\/button>/g,(m,v)=>{btn[v]=m;order.push(v);return m});
 [...SUP_PLAN,'supSetup','supIntake','supSop'].filter((v,i,a)=>a.indexOf(v)===i&&supCanVisit(v)).forEach(v=>{btn[v]=`<button data-view="${v}" class="${view===v?'active':''}"><span>${SUP_ICON[v]||'◈'}</span>${t(v)}</button>`});
 const known=new Set(CR4_NAV.flatMap(g=>g[2])),groups=CR4_NAV.concat([['other','OTHER',order.filter(v=>!known.has(v))]]),st=cr4NavState();
 return groups.map(([id,label,views])=>{const items=views.filter(v=>btn[v]);if(!items.length)return '';
  if(!label)return `<div class="navgroup navhome" data-group="${id}"><nav>${items.map(v=>btn[v]).join('')}</nav></div>`;
  const active=items.some(v=>/class="active"/.test(btn[v])),closed=st.closed.has(id)||(CR4_NAV_CLOSED.includes(id)&&!st.opened.has(id)),open=active||!closed;
  return `<div class="navgroup${open?'':' collapsed'}" data-group="${id}"><button type="button" class="navhead" data-navgroup="${id}" aria-expanded="${open}"><span>${label==='OTHER'?'OTHER':t(label)}</span><i aria-hidden="true">⌃</i></button><nav>${items.map(v=>btn[v]).join('')}</nav></div>`}).join('')};
// remember a default-collapsed group the user opens (the CR-01 handler keeps the closed list)
document.addEventListener('click',e=>{const h=e.target.closest?.('[data-navgroup]');if(!h||!CR4_NAV_CLOSED.includes(h.dataset.navgroup))return;
 setTimeout(()=>{const open=!h.closest('.navgroup').classList.contains('collapsed'),st=cr4NavState();open?st.opened.add(h.dataset.navgroup):st.opened.delete(h.dataset.navgroup);storage.setItem('ops.navOpened',JSON.stringify([...st.opened]))},0)});
