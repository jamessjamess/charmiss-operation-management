/* cr05-ui.js — CR-05 UX/UI (display only · no number, formula, data or permission changes)
   G1 page header (no eyebrow · group / page breadcrumb · plan chip by H1 · "ⓘ เกี่ยวกับหน้านี้") · G2 tables (25 rows per page · sticky first / last
   column when wide · cards ≤ 640 px) · G3 modals (S / M / L · fixed head + foot · full-screen sheet ≤ 640 px · backdrop / Esc) · G4 one-row mobile bar +
   drawer menu · B6 user menu (theme · language · switch user · logout) · G6 technical text · G7 dates · G8 empty states · G9 disabled-button walls */
Object.assign(dict.th,{c5Mock:'ข้อมูลจำลอง',c5MockTip:'ข้อมูลจำลอง · ไม่มีการส่งข้อมูลเข้าระบบจริง',c5About:'เกี่ยวกับหน้านี้',c5Menu:'เมนู',c5UserMenu:'บัญชีผู้ใช้',c5Theme:'ธีม',c5Lang:'ภาษา',c5Switch:'สลับผู้ใช้',c5Logout:'ออกจากระบบ',c5Access:'บัญชีและสิทธิ์ SSO',c5Override:'ย้ายสต็อกด่วน (Director Override)',
 c5Rows:'แถวต่อหน้า',c5Of:'{a}–{b} จาก {n}',c5Prev:'ก่อนหน้า',c5Next:'ถัดไป',c5ReadOnly:'บทบาทนี้ดูได้อย่างเดียวในบางรายการ — ปุ่มที่ทำไม่ได้ถูกซ่อนไว้',c5Discard:'ทิ้งข้อมูลที่กรอกไว้?',c5Close:'ปิด',c5Empty:'ยังไม่มีรายการ',c5EmptyRange:'ไม่มีรายการในช่วง {r}',c5AllTime:'ดูทุกช่วงเวลา',c5Wms:'ข้อมูล WMS ณ {t}',c5Cols:'คอลัมน์ที่แสดง',c5Scroll:'เลื่อนดูคอลัมน์เพิ่ม'});
Object.assign(dict.en,{c5Mock:'Simulated data',c5MockTip:'Simulated data · nothing is sent to live systems',c5About:'About this page',c5Menu:'Menu',c5UserMenu:'Account',c5Theme:'Theme',c5Lang:'Language',c5Switch:'Switch user',c5Logout:'Log out',c5Access:'Accounts & SSO',c5Override:'Quick stock move (Director override)',
 c5Rows:'Rows per page',c5Of:'{a}–{b} of {n}',c5Prev:'Previous',c5Next:'Next',c5ReadOnly:'This role is view-only for some items — actions it cannot take are hidden',c5Discard:'Discard what you entered?',c5Close:'Close',c5Empty:'Nothing here yet',c5EmptyRange:'Nothing between {r}',c5AllTime:'Any date',c5Wms:'WMS data as of {t}',c5Cols:'Columns shown',c5Scroll:'Scroll for more columns'});
const c5Store={get(k,d){try{const v=localStorage.getItem('cr5.'+k);return v==null?d:JSON.parse(v)}catch{return d}},set(k,v){try{localStorage.setItem('cr5.'+k,JSON.stringify(v))}catch{}}};
const c5Mobile=()=>matchMedia('(max-width:768px)').matches,c5Phone=()=>matchMedia('(max-width:640px)').matches;
const C5_FAMILY={payments:'orders',shipping:'orders',stockoverview:'allocation',erp:'documents'};
function c5GroupOf(v){const f=C5_FAMILY[v]||v,g=typeof CR4_NAV!=='undefined'?CR4_NAV.find(x=>x[2].includes(f)):null;return g&&g[1]?t(g[1]):''}
function c5PageTitle(){return (document.querySelector('.content .pagehead h1')||{}).textContent||t(view)}

/* ---------------------------------------------------------------- G7 · dates: the Gregorian-calendar Thai locale too (Action log · Supply meta) */
(()=>{const P=Date.prototype,ls=P.toLocaleString,ld=P.toLocaleDateString,tl=l=>l==='th-TH-u-ca-gregory';
 P.toLocaleString=function(l,o){return tl(l)&&!(o&&(o.month||o.weekday))&&!isNaN(this)?((o&&o.dateStyle&&!o.timeStyle)?fmtDate(this.getTime()):fmtDateTime(this.getTime())):ls.call(this,l,o)};
 P.toLocaleDateString=function(l,o){return tl(l)&&!(o&&(o.month||o.weekday||o.dateStyle))&&!isNaN(this)?fmtDate(this.getTime()):ld.call(this,l,o)}})();
/** G6 · internal codes (WMS INTEGRATED-1795650925164 …) → "ข้อมูล WMS ณ <time>", the code kept in the tooltip · G7 · ISO / dd/mm/yyyy left anywhere on screen */
const C5_TECH=/(?:WMS\s*(?:version|Snapshot)?\s*:?\s*)?\b(?:INTEGRATED|MIGRATION|SEED|DEMO|WMS)-(\d{12,})\b/g;
function c5TextSweep(root){if(!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:x=>{const s=x.nodeValue;if(!s||s.length<8)return NodeFilter.FILTER_SKIP;const p=x.parentElement;if(!p||p.closest('script,style,textarea,pre,code,option,[data-raw-date]'))return NodeFilter.FILTER_SKIP;
  return/\d{12,}|\b20\d\d-\d\d-\d\d\b|\b\d\d?\/\d\d?\/20\d\d\b/.test(s)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}}),list=[];
 while(w.nextNode())list.push(w.currentNode);
 list.forEach(x=>{const raw=x.nodeValue;let s=raw.replace(C5_TECH,(m,d)=>tp('c5Wms',{t:fmtDateTime(+d)}));
  s=s.replace(/\b(20\d\d-\d\d-\d\d)(?:[ T](\d\d:\d\d)(?::\d\d(?:\.\d+)?)?Z?)?\b/g,(m,d,tm)=>fmtDate(d)+(tm?' '+tm:''));
  s=s.replace(/\b(\d\d?)\/(\d\d?)\/(20\d\d)(?:,?\s+(\d\d?:\d\d)(?::\d\d)?)?\b/g,(m,d,mo,y,tm)=>fmtDate(`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`)+(tm?' '+tm:''));
  if(s!==raw){x.nodeValue=s;if(raw.match(C5_TECH)&&x.parentElement&&!x.parentElement.title)x.parentElement.title=raw.trim()}})}

/* ---------------------------------------------------------------- B6 · C3 · G4 · the top bar + user menu + mobile drawer */
function c5Shell(){const head=document.querySelector('main header');if(!head||head.dataset.c5)return;head.dataset.c5='1';head.classList.add('c5-head');
 const crumb=head.firstElementChild,grp=c5GroupOf(view),title=t(view);
 if(crumb)crumb.outerHTML=`<div class="c5-left"><button type="button" class="c5-burger" data-c5-nav="toggle" aria-label="${t('c5Menu')}" aria-expanded="false">☰</button><nav class="c5-crumb" aria-label="breadcrumb">${grp?`<span class="c5-grp">${esc(grp)}</span><span class="c5-sep">/</span>`:''}<b>${esc(title)}</b></nav></div>`;
 const tools=head.querySelector('.tools');if(!tools)return;tools.classList.add('c5-tools');
 const lang=tools.querySelector('#lang'),theme=tools.querySelector('#themeSel'),out=tools.querySelector('#globalLogout'),idb=tools.querySelector('#identity'),av=tools.querySelector('.avatar'),sso=tools.querySelector('.pill.ok');
 const who=typeof hmProfile==='function'?hmProfile().name:(idb?idb.textContent.replace('↗','').trim():t(session.role));idb&&idb.remove();   // C3: a name, not the role's action label
 const menu=document.createElement('div');menu.className='c5-umenu';menu.hidden=true;menu.setAttribute('role','menu');
 menu.innerHTML=`<div class="c5-uhead"><b>${esc(who)}</b><small>${esc(String(t(session.role)).split(' · ')[0])}${typeof orgSessionGroup==='function'&&orgSessionGroup()?' · '+esc(orgSessionGroup()):''}</small></div><div class="c5-ubadges"><span class="pill ok">SSO DEMO</span><span class="pill">${t('c5Mock')}</span></div><label class="c5-urow">${t('c5Theme')}<span data-slot="theme"></span></label><label class="c5-urow">${t('c5Lang')}<span data-slot="lang"></span></label>
  <div class="c5-uacts">${workCanVisit('access')?`<button type="button" data-c5-go="access">${t('c5Access')}</button>`:''}${typeof isStockDirector==='function'&&isStockDirector()&&workCanVisit('allocation')?`<button type="button" data-c5-override="1">${t('c5Override')}</button>`:''}<span data-slot="out"></span><button type="button" data-c5-logout="1">${t('c5Logout')}</button></div>`;
 if(theme)menu.querySelector('[data-slot="theme"]').replaceWith(theme);else menu.querySelector('[data-slot="theme"]').closest('label').remove();
 if(lang)menu.querySelector('[data-slot="lang"]').replaceWith(lang);
 if(out){out.textContent=t('c5Switch');out.className='';menu.querySelector('[data-slot="out"]').replaceWith(out)}else menu.querySelector('[data-slot="out"]').remove();
 const btn=document.createElement('button');btn.type='button';btn.className='c5-user avatar';btn.dataset.c5User='1';btn.setAttribute('aria-haspopup','menu');btn.setAttribute('aria-expanded','false');btn.title=who;btn.textContent=av?av.textContent:'CS';av&&av.remove();
 tools.innerHTML='';tools.insertAdjacentHTML('beforeend',`<span class="pill c5-mock" title="${esc(t('c5MockTip'))}">◈ ${t('c5Mock')}</span>`);if(sso)tools.appendChild(sso);tools.appendChild(btn);tools.appendChild(menu);
 const aside=document.querySelector('.shell > aside');if(aside&&!document.querySelector('.c5-shade')){aside.insertAdjacentHTML('afterend','<div class="c5-shade" data-c5-nav="close"></div>')}
 document.querySelectorAll('aside nav button[data-view]').forEach(b=>{if(!b.title)b.title=b.textContent.trim()})}
function c5NavOpen(on){document.body.classList.toggle('c5-navopen',on);const b=document.querySelector('.c5-burger');if(b)b.setAttribute('aria-expanded',on)}
document.addEventListener('click',e=>{const el=e.target.closest?.('[data-c5-nav],[data-c5-user],[data-c5-go],[data-c5-override],[data-c5-logout]');const menu=document.querySelector('.c5-umenu');
 if(!el){if(menu&&!menu.hidden&&!e.target.closest('.c5-umenu')){menu.hidden=true;document.querySelector('[data-c5-user]')?.setAttribute('aria-expanded','false')}if(document.body.classList.contains('c5-navopen')&&e.target.closest('aside nav button[data-view]'))c5NavOpen(false);return}
 if(el.dataset.c5Nav!=null){c5NavOpen(el.dataset.c5Nav==='close'?false:!document.body.classList.contains('c5-navopen'));return}
 if(el.dataset.c5User){if(menu){menu.hidden=!menu.hidden;el.setAttribute('aria-expanded',String(!menu.hidden))}return}
 if(menu)menu.hidden=true;
 if(el.dataset.c5Go){navigate(el.dataset.c5Go);return}
 if(el.dataset.c5Override){navigate('allocation');setTimeout(()=>{const b=document.querySelector('[data-stock-override]');if(b)b.click();else if(typeof stockTransferForm==='function')stockTransferForm('override')},50);return}
 if(el.dataset.c5Logout){const b=document.querySelector('#globalLogout');if(b)b.click();else{logoutForUserSwitch();render()}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const m=document.querySelector('.c5-umenu');if(m&&!m.hidden)m.hidden=true;if(document.body.classList.contains('c5-navopen'))c5NavOpen(false)}});

/* ---------------------------------------------------------------- G1 · the page header */
const C5_NOTES='#page > .banner:not(.pp-bar):not(.sop-lock):not(.warn), #page > .ecom-flow-banner, #page > .readonlynote, #page > .scope, #page > div > .banner:not(.pp-bar):not(.sop-lock):not(.warn):not(.governance-banner)';
function c5Header(){const ph=document.querySelector('.content > .pagehead');if(!ph||ph.dataset.c5)return;ph.dataset.c5='1';
 ph.querySelector('.eyebrow')?.remove();
 const h1=ph.querySelector('h1');if(!h1)return;const row=document.createElement('div');row.className='c5-h1row';h1.before(row);row.appendChild(h1);
 // the mock banner: the text is in the top bar badge now · the plan chip sits next to H1
 const ban=document.querySelector('.content > .banner');if(ban){const chip=ban.querySelector('.pp-chip');if(chip)row.appendChild(chip);ban.remove()}
 // notes of the page → "ⓘ เกี่ยวกับหน้านี้"
 const notes=[...document.querySelectorAll(C5_NOTES)].filter(n=>!n.closest('.panel,.card,form,dialog,.sup'));
 const sm=document.querySelector('#supMeta');
 if(notes.length||sm){const key='about.'+fuKey()+'.'+(C5_FAMILY[view]||view),seen=c5Store.get(key,null),open=seen==null?!c5Mobile():seen==='open';   // D5: open on the first visit — on a phone / small tablet closed (G4: first content within 400 px), ⓘ beside H1
  const box=document.createElement('div');box.className='c5-about';box.id='c5About';box.hidden=!open;notes.forEach(n=>{n.classList.add('c5-note');box.appendChild(n)});
  if(sm){const d=document.createElement('div');d.className='c5-note c5-meta';d.innerHTML=sm.innerHTML;d.querySelectorAll('svg').forEach(s=>s.remove());box.appendChild(d)}
  if(!box.textContent.trim())box.hidden=true;   // the Supply status line arrives after the page data (c5SupHead fills it) — never an empty box
  ph.after(box);row.insertAdjacentHTML('beforeend',`<button type="button" class="c5-aboutbtn" data-c5-about="${esc(key)}" aria-expanded="${open}" aria-controls="c5About">ⓘ ${t('c5About')}</button>`);
  if(seen==null)c5Store.set(key,'seen')}
 // a card / sticky head whose title repeats H1 → no title
 const ht=h1.textContent.trim();document.querySelectorAll('#page .panelhead h2').forEach(h=>{if(h.textContent.trim()===ht){h.remove()}})}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-c5-about]');if(!b)return;const box=document.querySelector('#c5About');if(!box)return;box.hidden=!box.hidden;b.setAttribute('aria-expanded',String(!box.hidden));c5Store.set(b.dataset.c5About,box.hidden?'closed':'open')});

/* ---------------------------------------------------------------- G2 · tables: labels for cards · 25 rows per page · sticky first / last column when wide */
const C5_PG={};
function c5TableKey(tb,i){return(C5_FAMILY[view]||view)+':'+i+':'+[...tb.querySelectorAll('thead th')].map(th=>th.textContent.trim()).join('|').slice(0,80)}
function c5Tables(root,scope){if(!root)return;[...root.querySelectorAll('table')].forEach((tb,i)=>{if(tb.closest('.invoice,.c5-skip,.drp,.sup .clist')||tb.matches('.heat-tbl'))return;
 const heads=[...tb.querySelectorAll('thead th')].map(th=>th.textContent.replace(/[↕↑↓▲▼]/g,'').trim());
 if(!tb.dataset.c5&&(heads.length||tb.tBodies[0]?.rows.length)){tb.dataset.c5='1';tb.classList.add('c5-ct');tb.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,k)=>{if(td.tagName==='TD'&&!td.dataset.label&&heads[k])td.dataset.label=heads[k]}));
  tb.querySelectorAll('tbody td, thead th').forEach(td=>{const c=[...td.childNodes].filter(n=>n.nodeType===1||n.textContent.trim());if(c.length===1&&c[0].matches?.('input[type="checkbox"]'))td.classList.add('c5-tap')})}
 if(!tb.closest('.sup'))c5Paginate(tb,(scope||'')+c5TableKey(tb,i));c5Sticky(tb)})}
function c5Paginate(tb,key){const body=tb.tBodies[0];if(!body)return;const all=[...body.rows].filter(r=>!r.classList.contains('c5-sub'));all.forEach(r=>{if(r.hasAttribute('data-c5-out'))r.hidden=true});const rows=all.filter(r=>!r.hasAttribute('data-c5-out'));const N=rows.length;
 const wrap=tb.closest('.tablewrap')||tb,old=wrap.nextElementSibling?.classList.contains('c5-pager')?wrap.nextElementSibling:null;if(old)old.remove();
 if(N<=50){rows.forEach(r=>r.hidden=false);return}
 const size=c5Store.get('ps.'+key.split(':').slice(0,2).join(':'),25),pages=Math.ceil(N/size);let p=Math.min(C5_PG[key]||0,pages-1);C5_PG[key]=p;
 rows.forEach((r,k)=>{r.hidden=!(k>=p*size&&k<(p+1)*size)});
 wrap.insertAdjacentHTML('afterend',`<div class="c5-pager" data-c5-key="${esc(key)}"><span class="c5-of">${tp('c5Of',{a:n(p*size+1),b:n(Math.min(N,(p+1)*size)),n:n(N)})}</span><span class="c5-pg"><button type="button" data-c5-pg="-1" ${p<=0?'disabled data-c5-keep':''} aria-label="${t('c5Prev')}">‹</button><span>${n(p+1)} / ${n(pages)}</span><button type="button" data-c5-pg="1" ${p>=pages-1?'disabled data-c5-keep':''} aria-label="${t('c5Next')}">›</button></span><label class="c5-size">${t('c5Rows')}<select data-c5-size>${[25,50,100].map(s=>`<option ${s===size?'selected':''}>${s}</option>`).join('')}</select></label></div>`)}
function c5PagerTable(pg){let el=pg.previousElementSibling;return el?.matches('table')?el:el?.querySelector('table')}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-c5-pg]');if(!b)return;const pg=b.closest('.c5-pager'),key=pg.dataset.c5Key;C5_PG[key]=(C5_PG[key]||0)+ +b.dataset.c5Pg;const tb=c5PagerTable(pg);if(tb){c5Paginate(tb,key);c5Sticky(tb);(tb.closest('.panel')||tb).scrollIntoView({block:'nearest'})}});
document.addEventListener('change',e=>{const s=e.target.closest?.('[data-c5-size]');if(!s)return;const pg=s.closest('.c5-pager'),key=pg.dataset.c5Key;c5Store.set('ps.'+key.split(':').slice(0,2).join(':'),+s.value);C5_PG[key]=0;const tb=c5PagerTable(pg);if(tb){c5Paginate(tb,key);c5Sticky(tb)}});
/* a wide table keeps its first column (two when the first is a tick box) and its last column (actions) in view */
function c5Sticky(tb){const wrap=tb.closest('.tablewrap');if(!wrap||c5Phone())return;tb.classList.remove('c5-sticky');tb.querySelectorAll('.c5-s1,.c5-s2,.c5-sl').forEach(c=>{c.classList.remove('c5-s1','c5-s2','c5-sl');c.style.left=''});
 if(wrap.scrollWidth<=wrap.clientWidth+4)return;tb.classList.add('c5-sticky');wrap.classList.add('c5-scrollx');wrap.title=t('c5Scroll');
 const first=tb.querySelector('thead th'),two=first&&(!first.textContent.trim()||first.querySelector('input[type="checkbox"]')),w1=first?first.getBoundingClientRect().width:0;
 [...tb.rows].forEach(r=>{const c=r.cells;if(!c.length)return;c[0].classList.add('c5-s1');if(two&&c[1]){c[1].classList.add('c5-s2');c[1].style.left=w1+'px'}if(c.length>2)c[c.length-1].classList.add('c5-sl')})}
addEventListener('resize',()=>{clearTimeout(c5Sticky.t);c5Sticky.t=setTimeout(()=>document.querySelectorAll('#page table.c5-ct,#modal table.c5-ct').forEach(c5Sticky),150)});
/* a tick-box-only cell is the tap target on a phone */
document.addEventListener('click',e=>{const td=e.target.closest?.('td.c5-tap, th.c5-tap');if(!td||e.target.matches('input'))return;const cb=td.querySelector('input[type="checkbox"]');if(cb&&!cb.disabled){cb.click()}});

/* ---------------------------------------------------------------- G3 · modals */
const C5_S=['pp-roll','ca-decide','ca-form','customer','detail'];
function c5Modal(kind){const m=$('#modal');if(!m)return;m.classList.remove('c5-s','c5-m','c5-l');const body=m.firstElementChild;
 const hasTable=!!m.querySelector('table,.tablewrap,.doclayout,.invoice'),fields=m.querySelectorAll('input:not([type=hidden]),select,textarea').length;
 m.classList.add(hasTable||kind==='docdetail'?'c5-l':(fields<=2&&!hasTable)?'c5-s':'c5-m');
 if(body){body.classList.add('c5-mbody');const h=body.firstElementChild;if(h&&h.classList.contains('between'))h.classList.add('c5-mhead');body.querySelectorAll(':scope > .dialogactions').forEach(f=>f.classList.add('c5-mfoot'))}
 m.querySelectorAll('[data-close]').forEach(b=>{if(b.textContent.trim()==='×'){b.classList.add('c5-x');b.setAttribute('aria-label',t('c5Close'))}});
 m.dataset.c5Dirty='';c5Tables(m,'modal:'+(kind||''));c5TextSweep(m)}
document.addEventListener('input',e=>{const m=e.target.closest?.('#modal');if(m&&e.target.matches('input,textarea,select'))m.dataset.c5Dirty='1'},true);
document.addEventListener('click',e=>{const m=$('#modal');if(!m||!m.open||e.target!==m)return;const r=m.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)return;if(m.dataset.c5Dirty==='1'&&!confirm(t('c5Discard')))return;m.close()});
document.addEventListener('cancel',e=>{const m=$('#modal');if(e.target===m&&m.dataset.c5Dirty==='1'&&!confirm(t('c5Discard')))e.preventDefault()},true);
const c5ModalBefore=showModal;showModal=function(html,kind){c5ModalBefore(html,kind);c5Modal(kind)};

/* ---------------------------------------------------------------- G8 · empty states · G9 · walls of disabled buttons */
function c5Empty(root){const id=typeof ofbPageOf==='function'?ofbPageOf(view):null;root.querySelectorAll('.empty').forEach(el=>{if(el.dataset.c5||el.textContent.trim()!==t('noResults'))return;el.dataset.c5='1';
 const s=id?ofbState(id):null,d=s?OFB_DEF[id]:null,user=s&&Object.keys(d).some(k=>!['d','from','to','sort','dir','tab','card'].includes(k)&&s[k]!==d[k]);
 if(user)return;   // the user set a filter: "no match" is the right answer
 if(s&&s.d!=='all'){const[a,b]=cr4Range(s);el.innerHTML=`${esc(tp('c5EmptyRange',{r:fmtRange(a,b)}))}<div><button type="button" data-c5-alltime="${id}">${t('c5AllTime')}</button></div>`}else el.textContent=t('c5Empty')})}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-c5-alltime]');if(!b)return;const s=ofbState(b.dataset.c5Alltime);s.d='all';s.from=s.to='';ofbApply(b.dataset.c5Alltime)});
function c5Walls(root){if(cr4Viewing())return;const dis=[...root.querySelectorAll('button:disabled:not([data-c5-keep])')].filter(b=>!b.closest('.c5-pager,.ofb,.list-action-bar,#cr4Pop,form,.drp,.cr4-tabs,.orderTabs,.sup')&&!b.matches('.hm-fstep,.hm-card,.sup-b4-item'));   // number tiles that only lack a link stay (they are data, not actions)
 const byText={};dis.forEach(b=>{const k=b.textContent.trim();(byText[k]||=[]).push(b)});let hid=0;
 Object.values(byText).forEach(list=>{if(list.length>=2||dis.length>2)list.forEach(b=>{b.hidden=true;hid++})});
 if(hid>=2&&!root.querySelector('.c5-ro'))root.insertAdjacentHTML('afterbegin',`<p class="c5-ro">${t('c5ReadOnly')}</p>`)}

/* ---------------------------------------------------------------- wiring */
const c5BindBefore=bind;bind=function(){c5BindBefore();if(!session)return;const pg=$('#page');if(pg){c5Tables(pg);c5Empty(pg);c5Walls(pg);c5TextSweep(pg)}};
/* the shell is finished by later render steps (theme select · footer) — restructure it last */
const c5RenderBefore=render;render=function(){c5RenderBefore();if(!session)return;c5Shell();c5Header();c5NavOpen(false)};

/* ---------------------------------------------------------------- Supply pages: B4 one status line (+ ⓘ with the feed details) · no second title · tables */
I18N.add({rows_per_page:'แถวต่อหน้า'},{rows_per_page:'Rows per page'});
function c5SupHead(main){const pc=main.querySelector(':scope > .pagehead .perchip');const sm=document.querySelector('#supMeta');
 const box=document.querySelector('#c5About'),meta=box&&box.querySelector('.c5-meta'),btn=document.querySelector('[data-c5-about]');
 if(meta&&sm){meta.innerHTML=sm.innerHTML;meta.querySelectorAll('svg').forEach(s=>s.remove()) /* the Supply icon is sized only inside .sup */;c5TextSweep(meta);box.hidden=!(btn&&btn.getAttribute('aria-expanded')==='true')||!box.textContent.trim()}
 if(pc&&!pc.querySelector('.c5-info')){const tip=sm?sm.textContent.replace(/\s+/g,' ').trim():'';pc.insertAdjacentHTML('beforeend',`<span class="dotsep">·</span><button type="button" class="c5-info" data-c5-info="1" title="${esc(tip)}" aria-label="${t('c5About')}">ⓘ</button>`)}}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-c5-info]'))document.querySelector('[data-c5-about]')?.click()});
/* the SKU drawer (Supply): same table treatment — labels for phone cards · sticky first / last column when wider than the drawer · dates / codes */
(()=>{const host=document.getElementById('supDrawer');if(!host||!window.MutationObserver)return;let q=0;new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;const b=host.querySelector('.drawer');if(!b||host.classList.contains('hidden'))return;c5Tables(b,'drawer:');c5TextSweep(b)})}).observe(host,{childList:true,subtree:true})})();
if(window.Supply){const c5Ar=Supply.afterRender;Supply.afterRender=function(main,A){if(c5Ar)c5Ar.call(this,main,A);c5Tables(main);c5SupHead(main);c5TextSweep(main)}}
