/* cr04-home.js — CR-04 R2 · หน้าหลักเป็นหน้าหลักจริง (Command Center)
   0 header (who · scope · data times) · 1 My work · 2 Pulse cards by role · 3 flow strip (Order → Cash · Supply) · 4 Supply Alert + 14 days ahead
   · 5 ดูเพิ่ม (folded: recent orders · E-commerce). Every number comes from the function of its source page (homeData only gathers them).
   UAT seed: nothing from Supply — one info box instead (I2). The connections panel moved to Admin (I7). */
Object.assign(dict.th,{hmHello:'สวัสดี',hmScopeAll:'ทุกฝ่าย',hmScopeOf:'ฝ่าย {g}',hmOpsAt:'Ops ณ {t}',hmSupAt:'Supply AS OF {d}',hmDs:'ชุดข้อมูล {n}',
 hmWork:'งานของฉัน',hmWorkAll:'ดูทั้งหมด ({n})',hmWorkLess:'แสดง 7 รายการแรก',hmWorkNone:'ไม่มีงานค้างของคุณ',hmSrc_action:'Action',hmSrc_approve:'อนุมัติ',hmSrc_ops:'งานค้าง',hmSrc_sales:'ขาย',hmSrc_data:'ข้อมูล',
 hmSev0:'ด่วน',hmSev1:'ปกติ',hmSev2:'ติดตาม',hmDue:'ครบ {d}',hmLate:'เกิน {n} วัน',
 hmW_quota:'คำขอ Quota รออนุมัติ',hmW_prop:'ข้อเสนอ Supply รออนุมัติ',hmW_issue:'คำขอเบิกออกรออนุมัติ',hmW_move:'คำขอย้ายสต็อกระหว่างช่องทาง',hmW_case:'งานค้างเกินกำหนด',hmW_manifest:'ใบส่งมอบรอยืนยัน',hmW_return:'รับคืนรอตรวจ',hmW_cn:'CN รอออก',hmW_pay:'ยืนยันการชำระ',hmW_blocked:'SO ถูกบล็อก (Quota / WMS ไม่พอ)',hmW_atp:'ของพร้อม (ATP) {d}',hmW_confirm:'ออเดอร์รอยืนยัน',hmW_so:'Sales Out {s}',hmW_soMissing:'ยังไม่ส่ง',hmW_soLate:'ส่งช้า',hmW_check:'selfCheck ไม่ผ่าน',hmW_viewOnly:'ดูอย่างเดียว',
 hmPulse:'ตัวเลขหลัก',hmSupSrc:'Supply: AS OF {d} · Run Rate {rr} · ความเสี่ยง {h}',
 hmP_netMtd:'ยอดขายสุทธิ MTD',hmP_netNone:'ยังไม่มี Invoice / CN ในเดือนนี้ในชุดข้อมูลนี้',hmP_achMtd:'Quota Achievement MTD (Sales In)',hmP_achSub:'Sales In ÷ Quota · {d} – {a}',hmP_netSub:'IV − CN ตั้งแต่ {d}',hmP_ach:'Achievement MTD {p}',hmP_backlog:'ออเดอร์ค้าง',hmP_backlogSub:'เกินกำหนด {n}',hmP_stock:'มูลค่า Stock',hmP_stockSub:'DOC {d} วัน',hmP_stockout:'SKU เสี่ยงขาด',hmP_stockoutSub:'ต้องสั่งผลิต {n}',hmP_expiry:'At-risk หมดอายุ 3M',hmP_qty:'{q} ชิ้น',hmP_lost:'ยอดขายที่เสียโอกาส (ของขาด)',hmP_lostSub:'4 สัปดาห์ล่าสุด',
 hmP_salesMtd:'ยอดขาย MTD ฝ่าย',hmP_quotaLeft:'Quota คงเหลือเดือนนี้',hmP_quotaLeftSub:'{n} SKU · ชิ้น',hmP_backlogDept:'ออเดอร์ค้างของฝ่าย',hmP_instock:'In-stock rate ที่คู่ค้า',hmP_instockSub:'ต่ำกว่า {m}%: {n} คู่',hmP_stockoutDept:'SKU เสี่ยงขาดที่กระทบฝ่าย',hmP_fva:'FVA ของฝ่าย',hmP_fvaSub:'3 เดือนล่าสุด · บวก = ปรับแล้วแม่นขึ้น',
 hmP_ordersToday:'ออเดอร์วันนี้',hmP_payWait:'รอชำระ / ตรวจชำระ',hmP_blocked:'SO ถูกบล็อก',hmP_count:'รายการ',
 hmP_manifest:'ใบส่งมอบรอยืนยัน',hmP_returns:'รับคืนรอตรวจ',hmP_issue:'คำขอเบิกออก (รอ)',hmP_issueSub:'อนุมัติแล้ววันนี้ {n}',hmP_po7:'PO เข้า 7 วัน',hmP_lot90:'Lot หมดอายุ ≤ 90 วัน (WH)',
 hmP_payCheck:'รอตรวจชำระ',hmP_sla:'SO / IV รอ SLA',hmP_cn:'CN รอออก',hmP_ivcn:'IV − CN วันนี้',hmP_ivcnSub:'ยอดเอกสาร ERP วันนี้',
 hmP_soComplete:'ความครบ Sales Out',hmP_soCompleteSub:'สัปดาห์ {w} · {a}/{n} บัญชี',hmP_actions:'Action เปิด',hmP_propWait:'ข้อเสนอรออนุมัติ',hmP_order30:'SKU เสี่ยงขาด / สั่งผลิต 30 วัน',hmP_poDelay:'PO Delayed',hmP_sc:'selfCheck',hmP_scSub:'ผ่าน {a} จาก {n} ข้อ',
 hmP_storage:'พื้นที่ข้อมูลในเบราว์เซอร์',hmP_storageSub:'localStorage {k} KB · IndexedDB {i}',hmP_ds:'ชุดข้อมูล',hmP_dsSub:'สร้างเมื่อ {d}',
 hmFlow:'สายงานภาพเดียว',hmFlowOrder:'Order → Cash',hmFlowSupply:'Supply',hmF_confirm:'ออเดอร์ใหม่',hmF_pay:'รอชำระ',hmF_docs:'รอ SO / IV',hmF_pick:'งานจัดส่งค้าง',hmF_delivered:'ส่งถึงวันนี้',hmF_po:'PO เข้า 14 วัน',hmF_wh:'WH',hmF_it:'ระหว่างขนส่ง',hmF_cons:'ฝากขาย',hmF_so:'Sales Out สัปดาห์ล่าสุด',
 hmAhead:'14 วันข้างหน้า',hmA_po:'PO เข้า',hmA_cn:'CN คืน',hmA_lock:'วันปิดรับแก้แผน (วันที่ {d})',hmA_sop:'รอบประชุม S&OP · ปิดรอบแผน',hmAheadNone:'ไม่มีกำหนดการใน 14 วัน',
 hmMore:'ดูเพิ่ม',hmMoreSub:'คำสั่งซื้อล่าสุด · แผนก E-commerce',
 hmSupUat:'ข้อมูล Supply ใช้ชุด Integrated demo',hmSupUatDesc:'ตอนนี้ใช้ชุด UAT seed จึงไม่แสดงตัวเลข Supply บนหน้าหลัก เพื่อไม่ให้ปนกับข้อมูล Ops ของชุดนี้',hmSupUatBtn:'เริ่มชุด Integrated',hmSupLoading:'กำลังโหลดข้อมูล Supply…',
 hmAdminSys:'สถานะระบบ'});
Object.assign(dict.en,{hmHello:'Hello',hmScopeAll:'All departments',hmScopeOf:'{g} department',hmOpsAt:'Ops at {t}',hmSupAt:'Supply AS OF {d}',hmDs:'Dataset {n}',
 hmWork:'My work',hmWorkAll:'Show all ({n})',hmWorkLess:'Show the first 7',hmWorkNone:'Nothing waiting for you',hmSrc_action:'Actions',hmSrc_approve:'Approvals',hmSrc_ops:'Backlog',hmSrc_sales:'Sales',hmSrc_data:'Data',
 hmSev0:'Urgent',hmSev1:'Normal',hmSev2:'Follow up',hmDue:'Due {d}',hmLate:'{n} d overdue',
 hmW_quota:'Quota request to approve',hmW_prop:'Supply proposal to approve',hmW_issue:'Stock issue to approve',hmW_move:'Channel stock move request',hmW_case:'Overdue backlog item',hmW_manifest:'Handover to confirm',hmW_return:'Return to inspect',hmW_cn:'CN to issue',hmW_pay:'Confirm payment',hmW_blocked:'SO blocked (quota / WMS short)',hmW_atp:'Available (ATP) {d}',hmW_confirm:'Order to confirm',hmW_so:'Sales Out {s}',hmW_soMissing:'not received',hmW_soLate:'late',hmW_check:'selfCheck failed',hmW_viewOnly:'view only',
 hmPulse:'Key numbers',hmSupSrc:'Supply: AS OF {d} · run rate {rr} · risk within {h}',
 hmP_netMtd:'Net sales MTD',hmP_netNone:'No invoice / CN this month in this dataset',hmP_achMtd:'Quota achievement MTD (Sales In)',hmP_achSub:'Sales In ÷ quota · {d} – {a}',hmP_netSub:'IV − CN since {d}',hmP_ach:'Achievement MTD {p}',hmP_backlog:'Order backlog',hmP_backlogSub:'{n} overdue',hmP_stock:'Stock value',hmP_stockSub:'DOC {d} days',hmP_stockout:'SKUs at stockout risk',hmP_stockoutSub:'{n} to reorder',hmP_expiry:'Expiry at risk 3M',hmP_qty:'{q} pcs',hmP_lost:'Lost sales (stock-out)',hmP_lostSub:'last 4 weeks',
 hmP_salesMtd:'Department sales MTD',hmP_quotaLeft:'Quota left this month',hmP_quotaLeftSub:'{n} SKUs · pcs',hmP_backlogDept:'Department order backlog',hmP_instock:'In-stock rate at accounts',hmP_instockSub:'below {m}%: {n} pairs',hmP_stockoutDept:'Stockout-risk SKUs for the department',hmP_fva:'Department FVA',hmP_fvaSub:'last 3 months · positive = the change helped',
 hmP_ordersToday:'Orders today',hmP_payWait:'Awaiting payment / check',hmP_blocked:'Blocked SOs',hmP_count:'items',
 hmP_manifest:'Handovers to confirm',hmP_returns:'Returns to inspect',hmP_issue:'Stock issues (waiting)',hmP_issueSub:'{n} approved today',hmP_po7:'PO arriving in 7 days',hmP_lot90:'Lots expiring ≤ 90 days (WH)',
 hmP_payCheck:'Payments to check',hmP_sla:'SO / IV waiting SLA',hmP_cn:'CNs to issue',hmP_ivcn:'IV − CN today',hmP_ivcnSub:'ERP documents today',
 hmP_soComplete:'Sales Out completeness',hmP_soCompleteSub:'week of {w} · {a}/{n} accounts',hmP_actions:'Open actions',hmP_propWait:'Proposals to approve',hmP_order30:'Stockout risk / reorder within 30 days',hmP_poDelay:'PO delayed',hmP_sc:'selfCheck',hmP_scSub:'{a} of {n} checks pass',
 hmP_storage:'Browser storage',hmP_storageSub:'localStorage {k} KB · IndexedDB {i}',hmP_ds:'Dataset',hmP_dsSub:'built {d}',
 hmFlow:'Flow at a glance',hmFlowOrder:'Order → Cash',hmFlowSupply:'Supply',hmF_confirm:'New orders',hmF_pay:'Awaiting payment',hmF_docs:'Awaiting SO / IV',hmF_pick:'To ship',hmF_delivered:'Delivered today',hmF_po:'PO in 14 days',hmF_wh:'WH',hmF_it:'In transit',hmF_cons:'Consignment',hmF_so:'Sales Out last week',
 hmAhead:'Next 14 days',hmA_po:'PO arrives',hmA_cn:'CN returns',hmA_lock:'Plan change cut-off (day {d})',hmA_sop:'S&OP meeting · plan cycle close',hmAheadNone:'Nothing scheduled in 14 days',
 hmMore:'More',hmMoreSub:'Recent orders · E-commerce team',
 hmSupUat:'Supply data uses the Integrated demo',hmSupUatDesc:'The UAT seed is loaded, so the home page shows no Supply numbers — they would not match this dataset’s Ops data.',hmSupUatBtn:'Start the Integrated demo',hmSupLoading:'Loading Supply data…',
 hmAdminSys:'System status'});

/* ---------------------------------------------------------------- data (homeData gathers results of the source pages' own functions) */
const HM_SEV={high:0,medium:1,low:2};
let hmShowAll=false,hmCache={key:''},hmIdb=null;
function hmSupView(){return typeof fuCan==='function'&&fuCan('supply.view')}
function hmIntegrated(){return typeof supDataset==='function'&&supDataset()==='integrated'}
function hmCanSwitchDs(){return typeof isStockDirector==='function'&&isStockDirector()}
/** the Supply model the home page reads: the B4 call (latest AS OF, the default filter, the Manager's channel lock) */
function hmModel(){if(!hmIntegrated()||!supReady())return null;const A=Supply.App,lock=actLock(),key=A.feedKey+'|'+(lock||'')+'|'+JSON.stringify(A.S);
 if(hmCache.key!==key){const F={asDn:Supply.defaultAsOf(),view:'W',ch:lock?[lock]:[],acc:[],brand:[],cat:[],q:'',rr:A.S.rrBasis||'L4W',h:3};hmCache={key,F,M:Calc.computeModel(A.DB,F,A.S,{}),x:{}}}return hmCache.M}
function hmX(k,f){if(!(k in hmCache.x))hmCache.x[k]=f();return hmCache.x[k]}
function hmProfile(){const r=session.role,g=typeof orgSessionGroup==='function'?orgSessionGroup():null;
 const name=r==='manager'?(db.channelUsers?.find(u=>u.id===session.userId)?.name||t('manager')):r==='salesAdmin'?(orgProfile()?.name||t('salesAdmin')):(fuProfiles.find(x=>x.id===fuKey())?.name||t(r));return{role:r,id:fuKey(),group:g,name}}
/** Ops report net (IV − CN) for a period — the Reports page function with its own period variables, restored after */
function hmReportHas(from,to){const keep=[opsReportFrom,opsReportTo,opsReportStatus];opsReportFrom=from;opsReportTo=to;opsReportStatus='all';try{return opsReportData().rows.some(r=>r.gross||r.credit)}finally{[opsReportFrom,opsReportTo,opsReportStatus]=keep}}   // CR-05 C2: is there any IV / CN in the period?
function hmReportNet(from,to){const keep=[opsReportFrom,opsReportTo,opsReportStatus];opsReportFrom=from;opsReportTo=to;opsReportStatus='all';try{return opsReportData().net}finally{[opsReportFrom,opsReportTo,opsReportStatus]=keep}}
/** quota left this month in the user's scope — the Inventory & Quota balance (Σ max(0, quota − used)) */
function hmQuotaLeft(){const ps=db.partners.filter(visiblePartner);let qty=0,skus=0;(db.productMaster||[]).forEach(m=>{const l=ps.reduce((s,p)=>s+Math.max(0,quotaFor(p.id,m.sku)-consumedFor(p.id,m.sku)),0);if(l>0){qty+=l;skus++}});return{qty,skus}}
function hmBlocked(o){return liveOrder(o)&&!orderDoc(o)&&!!o.quotaCheck&&!o.quotaCheck.pass}
function hmSoWeek(){const accs=typeof inAccounts==='function'?inAccounts():[],w=Calc.monday(Calc.dn(dateKey(Date.now())))-7;const st=accs.map(a=>({a,st:inWeekStatus(a.account_id,w)}));return{w,st,n:accs.length,got:st.filter(x=>x.st.k==='ok'||x.st.k==='late').length}}
function hmStorage(){let b=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);b+=(k.length+(localStorage.getItem(k)||'').length)*2}}catch{}return b}

function homeData(profile){
 const P=profile||hmProfile(),r=P.role,now=Date.now(),today=opsDay(),os=scopedOrders(),st=cr4StageCounts(os),q=typeof fuQueueRows==='function'?fuQueueRows():[];
 const supOn=hmSupView()&&hmIntegrated(),M=supOn||(r==='admin'&&hmIntegrated())?hmModel():null,A=Supply.App,DB=A.DB;
 const D={profile:P,ds:supDataset(),supView:hmSupView(),supOn,supLoading:(supOn||(r==='admin'&&hmIntegrated()))&&!M,M,asDn:M?.asDn??null,work:[],pulse:[],flow:{order:null,supply:null},ahead:[],more:{orders:false,ecom:false}};
 /* ---- 1 · My work (only what this role may act on) */
 const W=(src,sev,due,title,sub,go)=>D.work.push({src,sev,due,title,sub,go});
 if(M&&workCanVisit('supSop')&&typeof sopActs==='function'){sopSync();sopActs().filter(a=>(a.status==='open'||a.status==='ack')&&sopMine(a)).forEach(a=>W('action',HM_SEV[a.sev]??1,a.due,a.type==='manual'?a.title:t('sopT_'+a.type),sopWhat(a),`data-sop-open="${esc(a.id)}"`))}
 if(canApprove())db.allocations.filter(a=>a.status==='submitted'&&visiblePartner(partner(a.partner))&&a.requesterId!==stockActorId()).forEach(a=>W('approve',1,(a.time||now)+864e5,t('hmW_quota'),`${a.id} · ${partner(a.partner)?.name||a.partner} · ${a.sku} · ${n(a.qty)}`,'data-hm-go="allocation"'));
 if(typeof props==='function')props().filter(propCanApprove).forEach(p=>W('approve',p.priority==='high'?0:1,p.dueAt||(p.created||now)+864e5,t('hmW_prop'),`${p.id} · ${t(PROP[p.type].label)} · ${p.sku} · ${n(p.qty)}`,`data-prop-open="${esc(p.id)}"`));
 if(typeof issueCanApprove==='function'&&issueCanApprove())(db.stockIssues||[]).filter(i=>i.status==='submitted'&&i.requestedById!==stockActorId()).forEach(i=>W('approve',1,(i.requestedAt||now)+864e5,t('hmW_issue'),`${i.id} · ${i.sku} · ${n(i.qty)}`,'data-hm-go="stockoverview"'));
 (db.stockRequests||[]).filter(x=>x.status==='requested'&&typeof ownsStockChannel==='function'&&ownsStockChannel(x.from)&&x.requesterId!==stockActorId()).forEach(x=>W('approve',1,(x.time||now)+864e5,t('hmW_move'),`${x.id} · ${x.sku} · ${n(x.qty)}`,'data-hm-go="allocation"'));
 const mineQ=row=>row.owner===P.id||(r==='manager'&&row.owner==='sa-'+String(P.group||'').toLowerCase());
 q.filter(x=>x.dueAt<now&&mineQ(x)).forEach(x=>W('ops',x.priority==='high'?0:1,x.dueAt,t('hmW_case'),`${x.o.id} · ${t('fuReason_'+x.reason)}`,`data-hm-order="${esc(x.o.id)}"`));
 if(fuCan('handover.confirm'))fuVisibleManifests().filter(m=>m.status==='draft'&&fuCanManifest(m,'handover.confirm')).forEach(m=>W('ops',1,(m.time||m.createdAt||now)+864e5,t('hmW_manifest'),`${m.id} · ${n(m.items.length)} ${t('hmP_count')}`,'data-hm-go="workQueue|handover"'));
 if(typeof opsWarehouse==='function'&&opsWarehouse())(db.returns||[]).filter(x=>x.status==='requested'&&visiblePartner(partner(x.partner))).forEach(x=>W('ops',1,(x.time||x.createdAt||now)+2*864e5,t('hmW_return'),`${x.id} · ${partner(x.partner)?.name||''}`,'data-hm-go="returns"'));
 if(canInvoice()||(r==='finance'&&fuCan('erp.receive')))(db.returns||[]).filter(x=>x.status==='inspected'&&visiblePartner(partner(x.partner))).forEach(x=>W('ops',1,(x.inspectedAt||x.time||now)+864e5,t('hmW_cn'),`${x.id} · ${partner(x.partner)?.name||''}`,'data-hm-go="returns"'));
 if(canPay())os.filter(o=>cr4OrderStage(o)==='pay'&&o.pay==='paid').forEach(o=>W('ops',1,o.time+864e5,t('hmW_pay'),`${o.id} · ฿${money(orderSum(o))}`,`data-hm-order="${esc(o.id)}"`));
 if(canOrder()||r==='manager')os.filter(hmBlocked).forEach(o=>{const s=(o.quotaCheck.rows||[]).find(x=>!x.pass),atp=s&&M?supAtp(s.sku,s.need):null;W('sales',0,o.time+864e5,t('hmW_blocked'),`${o.id} · ${s?s.sku+' · '+n(s.need):''}${atp?.date!=null?' · '+tp('hmW_atp',{d:fmtDate(atp.date)}):''}`,`data-hm-order="${esc(o.id)}"`)});
 if(canOrder())os.filter(o=>cr4OrderStage(o)==='confirm').forEach(o=>W('sales',2,o.time+864e5,t('hmW_confirm'),`${o.id} · ${partner(o.partner)?.name||''}`,`data-hm-order="${esc(o.id)}"`));
 if(M&&(r==='planner'||(r==='manager'&&P.group==='MT'))){const s=hmX('so',hmSoWeek);s.st.filter(x=>x.st.k==='missing'||x.st.k==='late').forEach(x=>W('data',x.st.k==='missing'?1:2,(s.w+7+((A.S.soLateDay||3)-1))*864e5,tp('hmW_so',{s:t(x.st.k==='missing'?'hmW_soMissing':'hmW_soLate')}),`${x.a.name} · ${fmtDate(s.w)}${r==='manager'?' · '+t('hmW_viewOnly'):''}`,workCanVisit('supIntake')?'data-b4-go="supIntake"':''))}
 if(M&&(r==='planner'||r==='admin')&&A.sc)A.sc.checks.filter(c=>!c.ok).forEach(c=>W('data',0,null,t('hmW_check'),`${c.id} · ${c.label||c.name||''}`,'data-b4-go="supSetup"'));
 D.work.sort((a,b)=>a.sev-b.sev||(a.due??9e15)-(b.due??9e15));
 /* ---- 2 · Pulse (R2-3) — S = needs Supply */
 const C=(id,label,value,sub,go,S)=>D.pulse.push({id,label,value,sub,go,sup:!!S});
 const mtd=today.slice(0,8)+'01',ach=()=>M?Calc.achMtd(DB,M.rows,M.mask,M.asDn):null,pct=v=>v==null?'—':n(Math.round(v*10)/10)+'%';
 const bk=q.length,late=q.filter(x=>x.dueAt<now).length,thb=v=>'฿'+n(Math.round(v));
 const lost=()=>M.rows.reduce((s,x)=>s+(x.lost4V||0),0),inb=()=>hmX('inb',()=>Calc.inboundOf(DB,Object.assign({},M,{h:1})));
 const netV=()=>hmReportHas(mtd,today)?thb(hmReportNet(mtd,today)):'—',netTip=()=>hmReportHas(mtd,today)?'':t('hmP_netNone'),achCard=()=>{if(M)C('ach',t('hmP_achMtd'),pct(ach()),tp('hmP_achSub',{d:fmtDate(mtd,'dm'),a:fmtDate(M.asDn,'dm')}),'supQuota',1)};   // CR-05 C2: net sales and quota achievement are two cards
 if(r==='director'){C('netMtd',t('hmP_netMtd'),netV(),tp('hmP_netSub',{d:fmtDate(mtd,'dm')}),'reports');D.pulse[D.pulse.length-1].tip=netTip();achCard();
  C('backlog',t('hmP_backlog'),n(bk),tp('hmP_backlogSub',{n:n(late)}),'workQueue');
  if(supOn){C('stock',t('hmP_stock'),M?thb(M.kpi.stockValue):'',M?tp('hmP_stockSub',{d:M.kpi.doc==null?'—':n(Math.round(M.kpi.doc))}):'','supOverview',1);
   C('stockout',t('hmP_stockout'),M?n(M.statusCount.stockout):'',M?tp('hmP_stockoutSub',{n:n(M.statusCount.reorder)}):'','supStock:stockout',1);
   C('expiry',t('hmP_expiry'),M?thb(M.kpi.riskBy[1][1]):'',M?tp('hmP_qty',{q:n(Math.round(M.kpi.riskBy[1][0]))}):'','supExpiry',1);
   C('lost',t('hmP_lost'),M?thb(lost()):'',t('hmP_lostSub'),'supOverview',1)}}
 else if(r==='manager'){C('salesMtd',t('hmP_salesMtd'),netV(),tp('hmP_netSub',{d:fmtDate(mtd,'dm')}),'reports');D.pulse[D.pulse.length-1].tip=netTip();achCard();
  const ql=hmQuotaLeft();C('quotaLeft',t('hmP_quotaLeft'),n(ql.qty),tp('hmP_quotaLeftSub',{n:n(ql.skus)}),'allocation');
  C('backlog',t('hmP_backlogDept'),n(bk),tp('hmP_backlogSub',{n:n(late)}),'workQueue');
  if(supOn){if(P.group==='MT'){const ew=M?hmX('ew',()=>Calc.earlyWarnOf(DB,M.rows,M.asDn,M.mask,M.S)).kpi:null;C('instock',t('hmP_instock'),ew?pct(ew.instock):'',ew?tp('hmP_instockSub',{m:M.S.inStockMin,n:n(ew.lowIn)}):'','supConsign',1)}
   else C('stockout',t('hmP_stockoutDept'),M?n(M.statusCount.stockout):'',M?tp('hmP_stockoutSub',{n:n(M.statusCount.reorder)}):'','supStock:stockout',1);
   const fv=M?hmX('fva',()=>Calc.fvaOf(DB,M,3,M.S).total):null;C('fva',t('hmP_fva'),fv?(fv.fva==null?'—':(fv.fva>0?'+':fv.fva<0?'−':'')+n(Math.abs(Math.round(fv.fva*10)/10))+' pp'):'',t('hmP_fvaSub'),'supQuota',1)}}
 else if(r==='salesAdmin'){C('ordersToday',t('hmP_ordersToday'),n(os.filter(o=>dateKey(o.time)===dateKey(now)).length),t('hmP_count'),'orders');
  C('payWait',t('hmP_payWait'),n(st.pay),t('hmP_count'),'orders|pay');C('blocked',t('hmP_blocked'),n(os.filter(hmBlocked).length),t('hmP_count'),'orders|docs');
  const ql=hmQuotaLeft();C('quotaLeft',t('hmP_quotaLeft'),n(ql.qty),tp('hmP_quotaLeftSub',{n:n(ql.skus)}),'allocation')}
 else if(r==='warehouse'){const mf=fuVisibleManifests().filter(m=>m.status==='draft').length,rt=(db.returns||[]).filter(x=>x.status==='requested'&&visiblePartner(partner(x.partner))).length,is=db.stockIssues||[];
  C('manifest',t('hmP_manifest'),n(mf),t('hmP_count'),'workQueue|handover');C('returns',t('hmP_returns'),n(rt),t('hmP_count'),'returns');
  C('issue',t('hmP_issue'),n(is.filter(i=>i.status==='submitted').length),tp('hmP_issueSub',{n:n(is.filter(i=>i.status==='issued'&&dateKey(i.issuedAt||i.approvedAt||i.updatedAt||0)===today).length)}),'stockoverview');
  if(supOn){const p7=M?inb().po.filter(p=>p.open&&p.day>=M.asDn&&p.day<M.asDn+7):[];C('po7',t('hmP_po7'),M?n(p7.length):'',M?tp('hmP_qty',{q:n(p7.reduce((s,p)=>s+p.qty,0))}):'','supCalendar',1);
   const l90=M?hmX('l90',()=>Calc.expiryLots(DB,M).filter(L=>L.j<0&&L.daysToExp>=0&&L.daysToExp<=90)):[];C('lot90',t('hmP_lot90'),M?n(l90.length):'',M?tp('hmP_qty',{q:n(Math.round(l90.reduce((s,L)=>s+L.qty,0)))}):'','supExpiry',1)}}
 else if(r==='finance'){C('payCheck',t('hmP_payCheck'),n(os.filter(o=>cr4OrderStage(o)==='pay'&&o.pay==='paid').length),t('hmP_count'),'orders|pay');
  C('sla',t('hmP_sla'),n(q.filter(x=>['slaWait','slaFailed','invoiceWait','sourceDocWait'].includes(x.reason)).length),t('hmP_count'),'workQueue');
  C('cn',t('hmP_cn'),n((db.returns||[]).filter(x=>x.status==='inspected'&&visiblePartner(partner(x.partner))).length),t('hmP_count'),'returns');
  C('ivcn',t('hmP_ivcn'),thb(orgTodaySales()),t('hmP_ivcnSub'),'reports')}
 else if(r==='planner'){const s=M?hmX('so',hmSoWeek):null,acts=M?sopActs().filter(a=>(a.status==='open'||a.status==='ack')&&sopVisible(a)):[];
  C('soComplete',t('hmP_soComplete'),s?(s.n?n(Math.round(s.got/s.n*100))+'%':'—'):'',s?tp('hmP_soCompleteSub',{w:fmtDate(s.w,'dm'),a:n(s.got),n:n(s.n)}):'','supIntake',1);
  C('actions',t('hmP_actions'),M?n(acts.length):'',M?tp('hmP_backlogSub',{n:n(acts.filter(a=>a.due<now).length)}):'','supSop',1);
  C('propWait',t('hmP_propWait'),n(props().filter(p=>p.status==='submitted'&&propVisible(p)).length),t('hmP_count'),'supProposals');
  C('order30',t('hmP_order30'),M?n(M.statusCount.stockout)+' / '+n(M.rows.filter(x=>x.orderByDn!=null&&x.orderByDn<=M.asDn+30).length):'',M?tp('hmP_stockoutSub',{n:n(M.statusCount.reorder)}):'','supReplen',1);
  C('poDelay',t('hmP_poDelay'),M?n(inb().kpi.delayN):'',M?tp('hmP_qty',{q:n(inb().kpi.delayQty)}):'','supCalendar',1);
  C('sc',t('hmP_sc'),M&&A.sc?(A.sc.ok?'✓':'✕'):'',M&&A.sc?tp('hmP_scSub',{a:n(A.sc.checks.filter(c=>c.ok).length),n:n(A.sc.checks.length)}):'','supSetup',1)}
 else if(r==='admin'){C('sc',t('hmP_sc'),M&&A.sc?(A.sc.ok?'✓':'✕'):'',M&&A.sc?tp('hmP_scSub',{a:n(A.sc.checks.filter(c=>c.ok).length),n:n(A.sc.checks.length)}):'','supSetup',hmIntegrated()?1:0);
  C('storage',t('hmP_storage'),n(Math.round(hmStorage()/1024))+' KB',tp('hmP_storageSub',{k:n(Math.round(hmStorage()/1024)),i:hmIdb==null?'—':n(Math.round(hmIdb/1024))+' KB'}),'supSetup');
  C('ds',t('hmP_ds'),t(D.ds==='integrated'?'dsIntegrated':'dsUat'),tp('hmP_dsSub',{d:db.datasetBuiltAt?fmtDateTime(db.datasetBuiltAt):'—'}),'');}
 if(!supOn&&r!=='admin')D.pulse=D.pulse.filter(c=>!c.sup);
 /* ---- 3 · flow strip */
 if(workCanVisit('orders')&&fuCan('orders.view'))D.flow.order=[['confirm',st.confirm,'orders|confirm'],['pay',st.pay,'orders|pay'],['docs',st.docs,'orders|docs'],['pick',st.pick,'orders|pick'],['delivered',os.filter(cr4DeliveredToday).length,'orders|done']];
 if(supOn&&M){const I=inb(),p14=I.po.filter(p=>p.open&&p.day>=M.asDn&&p.day<M.asDn+14),v=k=>M.rows.reduce((s,x)=>s+(x[k]||0)*x.cost,0),so=hmX('so7',()=>M.rows.reduce((s,x)=>s+Calc.flowsSku(DB,x.i,M.asDn-7,M.asDn,M.mask,1).soCons,0));
  D.flow.supply=[['po',n(p14.length)+' PO',tp('hmP_qty',{q:n(p14.reduce((s,p)=>s+p.qty,0))}),'supCalendar'],['wh',thb(v('whSel')),'','supStock'],['it',thb(v('itSel')),'','supStock'],['cons',thb(v('consSel')),'','supConsign'],['so',n(Math.round(so)),t('pcs'),'supOverview']]}
 /* ---- 4 · next 14 days (Supply AS OF calendar + the plan lock day + the S&OP cycle close) */
 if(supOn&&M){const I=inb(),end=M.asDn+14;I.po.filter(p=>p.open&&p.day>=M.asDn&&p.day<end).forEach(p=>D.ahead.push({dn:p.day,k:'po',label:t('hmA_po'),sub:`${p.no} · ${p.sku} · ${n(p.qty)}`,go:'supCalendar',late:p.status==='Delayed'}));
  I.cn.filter(c=>c.open&&c.day>=M.asDn&&c.day<end).forEach(c=>D.ahead.push({dn:c.day,k:'cn',label:t('hmA_cn'),sub:`${c.no} · ${c.acc} · ${n(c.qty)}`,go:'supCalendar'}));
  if(typeof sopLockInfo==='function'&&(workCanVisit('supSop')||workCanVisit('supProposals'))){const L=sopLockInfo(),td=Calc.dn(today),m0=Calc.monthStart(td);[m0,Calc.addMonths(m0,1)].forEach(m=>{const d=m+L.day-1;if(d>=td&&d<td+14){D.ahead.push({dn:d,k:'lock',label:tp('hmA_lock',{d:L.day}),sub:fmtMonth(Calc.monthKey(Calc.addMonths(m,1))),go:'supProposals'});if(workCanVisit('supSop'))D.ahead.push({dn:d,k:'sop',label:t('hmA_sop'),sub:'',go:'supSop'})}})}
  D.ahead.sort((a,b)=>a.dn-b.dn)}
 /* ---- 5 · more (folded) — not for Warehouse / ERP (no sales figures or E-commerce panel) */
 D.more.orders=!['warehouse','finance'].includes(r)&&fuCan('orders.view')&&os.length>0;D.more.ecom=!['warehouse','finance'].includes(r)&&typeof canViewEcom==='function'&&canViewEcom();
 return D}

/* ---------------------------------------------------------------- view */
function hmGoAttr(go){if(!go)return'';const[v]=go.split('|');if(v.startsWith('sup'))return workCanVisit(v.split(':')[0])?`data-b4-go="${go}"`:'';return workCanVisit(v)?`data-hm-go="${go}"`:''}
function hmSupInfo(){return`<section class="panel hm-supinfo"><div class="panelbody"><b>◈ ${t('hmSupUat')}</b><p class="muted">${t('hmSupUatDesc')}</p>${hmCanSwitchDs()?`<button class="primary" data-hm-ds="1">${t('hmSupUatBtn')}</button>`:''}</div></section>`}
function hmConnections(){return`<section class="panel hm-conn"><div class="panelhead"><h2>${t('connections')}</h2><span class="pill warn">${t('simulate')}</span></div><div class="panelbody">${[['GoSaaS',t('ordersConnected'),'orders'],['Physical Stock',t('stockConnected'),'stockoverview'],['ERP SLA',t('erpConnected'),'erp'],['Single Sign-On',t('ssoConnected'),'access']].map(([name,desc,dest])=>`<div class="activityrow"><div class="between"><b>${name}</b>${workCanVisit(dest)?`<button data-hm-go="${dest}" aria-label="${name}">↗</button>`:''}</div><small class="muted">${desc}</small></div>`).join('')}<p class="hiddenNote">${t('stockSourceInfo')}</p></div></section>`}
function homePage(){const D=homeData(),P=D.profile,now=Date.now();
 const scope=P.group?tp('hmScopeOf',{g:P.group}):t('hmScopeAll'),times=[tp('hmOpsAt',{t:fmtDateTime(now)}),D.M?tp('hmSupAt',{d:fmtDate(D.M.asDn)}):'',tp('hmDs',{n:t(D.ds==='integrated'?'dsIntegrated':'dsUat')})].filter(Boolean).join(' · ');
 let h=`<div class="hm" data-role="${P.role}"><div class="hm-head"><div><h2>${t('hmHello')}, ${esc(P.name)}</h2><span class="muted">${esc(String(t(P.role)).split(' · ')[0])} · ${esc(scope)}</span></div><small class="muted hm-times">${esc(times)}</small></div>`;
 // 1 · My work
 const cnt={};D.work.forEach(w=>cnt[w.src]=(cnt[w.src]||0)+1);const list=hmShowAll?D.work:D.work.slice(0,7);
 h+=`<section class="panel hm-work"><div class="panelhead"><h2>${t('hmWork')} <span class="pill ${D.work.length?'warn':'ok'}">${n(D.work.length)}</span></h2><div class="hm-chips">${Object.entries(cnt).map(([s,c])=>`<span class="hm-chip">${t('hmSrc_'+s)} <b>${n(c)}</b></span>`).join('')}</div></div>`+
  (D.work.length?`<div class="hm-wlist">${list.map(w=>{const late=w.due!=null&&w.due<now,dd=w.due!=null?(late?tp('hmLate',{n:n(Math.max(1,Math.floor((now-w.due)/864e5)))}):tp('hmDue',{d:fmtDate(w.due,'dm')})):'';
   return`<button type="button" class="hm-witem" ${w.go||'disabled'} data-hm-src="${w.src}"><span class="hm-sev s${w.sev}">${t('hmSev'+w.sev)}</span><span class="hm-wt"><b>${esc(w.title)}</b><small>${esc(w.sub)}</small></span><span class="hm-wsrc">${t('hmSrc_'+w.src)}</span><span class="hm-wdue ${late?'late':''}">${esc(dd)}</span></button>`}).join('')}</div>${D.work.length>7?`<div class="hm-wmore"><button type="button" class="quiet" data-hm-all="1">${hmShowAll?t('hmWorkLess'):tp('hmWorkAll',{n:n(D.work.length)})}</button></div>`:''}`:`<div class="empty hm-empty">✓ ${t('hmWorkNone')}</div>`)+`</section>`;
 // 2 · Pulse
 const supNote=D.M?tp('hmSupSrc',{d:fmtDate(D.M.asDn),rr:hmCache.F?.rr||'L4W',h:'3M'}):'';
 h+=`<section class="hm-pulse-wrap"><div class="hm-sechead"><h2>${t('hmPulse')}</h2>${supNote&&D.pulse.some(c=>c.sup)?`<small class="muted">${esc(supNote)}</small>`:''}</div><div class="hm-pulse">${D.pulse.map(c=>{const sk=c.sup&&D.supLoading;return`<button type="button" class="hm-card${sk?' skel':''}" data-hm-card="${c.id}" ${hmGoAttr(c.go)||'disabled'}${c.tip?` title="${esc(c.tip)}"`:''}><small>${esc(c.label)}</small><strong>${sk?'&nbsp;':c.value}</strong><em>${sk?t('hmSupLoading'):esc(c.sub)}</em></button>`}).join('')}</div></section>`;
 if(D.supView&&D.ds!=='integrated')h+=hmSupInfo();
 // 3 · flow strip
 if(D.flow.order||D.flow.supply){h+=`<section class="panel hm-flow"><div class="panelhead"><h2>${t('hmFlow')}</h2></div><div class="panelbody">`;
  if(D.flow.order)h+=`<div class="hm-frow" data-flow="order"><span class="hm-flabel">${t('hmFlowOrder')}</span>${D.flow.order.map(([k,v,go])=>`<button type="button" class="hm-fstep" data-flow-step="${k}" ${hmGoAttr(go)||'disabled'}><small>${t('hmF_'+k)}</small><b>${n(v)}</b></button>`).join('<i aria-hidden="true">→</i>')}</div>`;
  if(D.flow.supply)h+=`<div class="hm-frow" data-flow="supply"><span class="hm-flabel">${t('hmFlowSupply')}</span>${D.flow.supply.map(([k,v,sub,go])=>`<button type="button" class="hm-fstep" data-flow-step="${k}" ${hmGoAttr(go)||'disabled'}><small>${t('hmF_'+k)}</small><b>${v}</b>${sub?`<em>${esc(sub)}</em>`:''}</button>`).join('<i aria-hidden="true">→</i>')}</div>`;
  else if(D.supView&&D.supLoading)h+=`<div class="hm-frow skel"><span class="hm-flabel">${t('hmFlowSupply')}</span><span class="muted">${t('hmSupLoading')}</span></div>`;
  h+=`</div></section>`}
 // 4 · Supply Alert (moved in by bind) + 14 days ahead · Admin: connected systems
 if(D.supOn){h+=`<div class="hm-2col"><div id="hmAlert">${D.supLoading?`<section class="panel"><div class="panelbody muted">${t('hmSupLoading')}</div></section>`:''}</div><section class="panel hm-ahead"><div class="panelhead"><h2>${t('hmAhead')}</h2>${D.M?`<span class="muted small">${fmtRange(D.M.asDn,D.M.asDn+13)}</span>`:''}</div>`+
  (D.supLoading?`<div class="panelbody muted">${t('hmSupLoading')}</div>`:D.ahead.length?`<div class="hm-alist">${D.ahead.slice(0,7).map(a=>`<button type="button" class="hm-aitem k-${a.k}${a.late?' late':''}" ${hmGoAttr(a.go)||'disabled'}><span class="hm-adate">${fmtDate(a.dn,'dm')}</span><span><b>${esc(a.label)}</b>${a.sub?`<small>${esc(a.sub)}</small>`:''}</span></button>`).join('')}${D.ahead.length>7?`<button type="button" class="quiet hm-amore" ${hmGoAttr('supCalendar')||'disabled'}>+${n(D.ahead.length-7)} · ${t('supCalendar')} →</button>`:''}</div>`:`<div class="empty hm-empty">${t('hmAheadNone')}</div>`)+`</section></div>`}
 if(P.role==='admin')h+=hmConnections();
 // 5 · more (folded)
 if(D.more.orders||D.more.ecom)h+=`<details class="hm-more"><summary><b>${t('hmMore')}</b> <span class="muted">${t('hmMoreSub')}</span></summary>${D.more.orders?`<section class="panel"><div class="panelhead"><h2>${t('recentOrders')}</h2><button data-hm-go="orders">${t('orderAll')} →</button></div>${commerceOrderTable(scopedOrders().slice(0,5),true)}</section>`:''}${D.more.ecom?ecomSummary():''}</details>`;
 return h+`</div>`}
/** I3 · the alert row: hide what the role cannot act on, then a balanced grid (no empty cell, no lone card next to empty space) */
function hmFitGrid(row){if(!row)return;const items=[...row.children].filter(x=>!x.hidden),N=items.length;if(!N)return;const w=row.clientWidth||row.parentElement?.clientWidth||600,m=Math.max(1,Math.floor(w/180));
 const rows=Math.ceil(N/Math.min(N,m)),c=Math.ceil(N/rows);row.style.gridTemplateColumns=`repeat(${c},minmax(0,1fr))`;items.forEach(x=>x.style.gridColumn='');const rem=N%c;if(rem&&c>1)items[N-1].style.gridColumn=`span ${c-rem+1}`;
 row.dataset.cols=c}
function hmAlertTidy(){const card=document.querySelector('#page .sup-b4');if(!card)return;const row=card.querySelector('.sup-b4-row');if(!row)return;
 const canProp=typeof PROP!=='undefined'&&Object.values(PROP).some(x=>fuCan(x.perm));
 [...row.children].forEach(b=>{if(b.disabled||(b.dataset.b4Go==='supProposals'&&!canProp))b.remove()});
 if(!row.children.length){const slot=card.closest('#hmAlert');card.remove();if(slot){slot.closest('.hm-2col')?.classList.add('one');slot.remove()}return}hmFitGrid(row)}

/* ---------------------------------------------------------------- wiring */
const hmCommerceBefore=commerceHome;commerceHome=function(){return session?homePage():hmCommerceBefore()};
const hmBindBefore=bind;bind=function(){hmBindBefore();if(!session)return;
 const brand=document.querySelector('aside .brand');if(brand&&!brand.dataset.hm){brand.dataset.hm='1';brand.setAttribute('role','link');brand.tabIndex=0;brand.style.cursor='pointer';brand.onclick=()=>navigate('overview');brand.onkeydown=e=>{if(e.key==='Enter')navigate('overview')}}
 const crumb=document.querySelector('main header > .muted');if(crumb&&!crumb.querySelector('[data-hm-home]')){const first=crumb.firstChild;if(first&&first.nodeType===3&&first.textContent.trim()){const b=document.createElement('button');b.type='button';b.className='linkish';b.dataset.hmHome='1';b.textContent=first.textContent.trim();b.onclick=()=>navigate('overview');crumb.replaceChild(b,first);crumb.insertBefore(document.createTextNode(' '),b.nextSibling)}}
 if(view==='access'&&isStockDirector()&&session.role==='admin'&&!document.querySelector('#page .hm-conn'))document.querySelector('#page')?.insertAdjacentHTML('beforeend',hmConnections());
 if(view!=='overview')return;
 const card=document.querySelector('#page .sup-b4'),slot=document.querySelector('#hmAlert');
 if(card){if(slot&&hmIntegrated()&&!card.textContent.includes(t('b4Loading'))){slot.innerHTML='';slot.appendChild(card);hmAlertTidy()}else card.remove()}
 if(session.role==='admin'&&hmIdb==null&&navigator.storage?.estimate)navigator.storage.estimate().then(e=>{hmIdb=e.usageDetails?.indexedDB??e.usage??0;if(view==='overview'&&session?.role==='admin'){const el=document.querySelector('[data-hm-card="storage"] em');if(el)el.textContent=tp('hmP_storageSub',{k:n(Math.round(hmStorage()/1024)),i:n(Math.round(hmIdb/1024))+' KB'})}}).catch(()=>{hmIdb=0})};
addEventListener('resize',()=>{if(session&&view==='overview')hmFitGrid(document.querySelector('#page .sup-b4-row'))});
document.addEventListener('click',e=>{const el=e.target.closest?.('[data-hm-go],[data-hm-order],[data-hm-all],[data-hm-ds]');if(!el||!session)return;
 if(el.dataset.hmAll){hmShowAll=!hmShowAll;render();return}
 if(el.dataset.hmDs){if(typeof supDatasetForm==='function')supDatasetForm();return}
 if(el.dataset.hmOrder){openOrderWorkspace(el.dataset.hmOrder);return}
 const[v,tab]=el.dataset.hmGo.split('|');if(v==='orders'&&tab&&typeof cr4SetOrderTab==='function'){cr4SetOrderTab(tab);if(typeof ofbReset==='function'){ofbReset('orders');ofbState('orders').d='all'}}   // the strip counts every order in scope → the list opens on every date
 if(v==='workQueue'&&tab)fuTab=tab;navigate(v)});
