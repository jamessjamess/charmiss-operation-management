/* cr04-core.js — CR-04 shared helpers (loaded after every Ops / Supply module, before the other cr04-*.js files)
   I10 · one date format for the whole app: DD MMM YYYY in the Gregorian year (TH 25 พ.ย. 2026 · EN 25 Nov 2026)
   R3  · one order-stage rule (each order sits in exactly one stage) used by the order tabs, the home flow strip and My work */
const CR4_MON={th:['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],en:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']};
/** any date-ish value → 'YYYY-MM-DD' (Bangkok day): epoch ms, Date, ISO text, or a Supply day number (Calc.dn) */
function cr4Iso(x){if(x==null||x==='')return'';if(x instanceof Date)x=x.getTime();if(typeof x==='number'){if(!isFinite(x))return'';if(Math.abs(x)<1e7&&typeof Calc!=='undefined')return Calc.iso(x);return dateKey(x)}const s=String(x);if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);const d=Date.parse(s);return isNaN(d)?'':dateKey(d)}
function fmtDate(x,opt){const s=cr4Iso(x);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return'—';const y=+s.slice(0,4),m=+s.slice(5,7),d=+s.slice(8,10),M=(CR4_MON[lang]||CR4_MON.en)[m-1];return opt==='dm'?`${d} ${M}`:opt==='my'?`${M} ${y}`:`${d} ${M} ${y}`}
function fmtTime(ms){return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms))}
function fmtDateTime(ms){return ms?fmtDate(ms)+' '+fmtTime(ms):'—'}
/** 'YYYY-MM' → 'พ.ย. 2026' / 'Nov 2026' */
function fmtMonth(ym){return /^\d{4}-\d{2}$/.test(ym||'')?fmtDate(ym+'-01','my'):'—'}
/** a range: '1 – 25 พ.ย. 2026' · '28 ต.ค. – 3 พ.ย. 2026' · '28 Dec 2025 – 3 Jan 2026' */
function fmtRange(a,b){a=cr4Iso(a);b=cr4Iso(b);if(!a&&!b)return'—';if(!a||!b||a===b)return fmtDate(a||b);if(a.slice(0,7)===b.slice(0,7))return`${+a.slice(8,10)} – ${fmtDate(b)}`;if(a.slice(0,4)===b.slice(0,4))return`${fmtDate(a,'dm')} – ${fmtDate(b)}`;return`${fmtDate(a)} – ${fmtDate(b)}`}

/* ---------------------------------------------------------------- R3 · order stages (the first step the order has not passed yet) */
const CR4_STAGES=['confirm','pay','docs','pick','transit','done','closed'];
function cr4OrderStage(o){
 if(['cancelled','returned'].includes(o.status)||o.ship==='returned')return'closed';
 if(o.status==='completed'||o.ship==='delivered')return'done';
 if(o.ship==='shipped')return'transit';
 if(!o.confirmed)return'confirm';
 if(!paymentOK(o))return'pay';
 const d=orderDoc(o);if(!d||!d.invoice)return'docs';
 return'pick'}
function cr4StageCounts(os){const c={all:os.length};CR4_STAGES.forEach(s=>c[s]=0);os.forEach(o=>c[cr4OrderStage(o)]++);return c}
/** an order delivered today (Bangkok day) — the last box of the Order → Cash strip */
function cr4DeliveredToday(o){const ts=o.deliveredAt||o.completedAt;return cr4OrderStage(o)==='done'&&!!ts&&dateKey(ts)===opsDay()}

/* ---------------------------------------------------------------- R6 · the plan period (one value for the whole app) */
let cr4ViewPeriod=null;   // another period opened read-only (null = the current one)
function cr4PP(){return/^\d{4}-\d{2}$/.test(db?.planPeriod||'')?db.planPeriod:(typeof FEED_MONTH!=='undefined'?FEED_MONTH:'2026-11')}
function cr4Viewing(){return!!cr4ViewPeriod&&cr4ViewPeriod!==cr4PP()}
function cr4PlanPeriod(){return cr4Viewing()?cr4ViewPeriod:cr4PP()}
