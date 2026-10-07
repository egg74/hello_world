// Browser port of config.py + data.py + kpis.py + server.api (synthetic data only).
const PROCESSES={Receiving:120,Putaway:60,Picking:90,Packing:75,Loading:140};
const LINES_PER_UNIT={Receiving:.2,Putaway:.25,Picking:.6,Packing:.5,Loading:.1};
const TARGET_UTIL=0.85;
const THRESHOLDS={
 performance_to_standard:["higher",.95,.85],labor_utilization:["higher",.80,.70],
 capacity_utilization:["band",[.70,.90],[.60,.95]],labor_coverage:["higher",1.00,.92],
 absenteeism:["lower",.05,.08],overtime_pct:["lower",.05,.10],backlog_hours:["lower",2,6],
 forecast_mape:["lower",.10,.20],peak_to_avg:["lower",1.8,2.5]};
const HOUR_PROFILE={6:.03,7:.05,8:.06,9:.07,10:.07,11:.06,12:.04,13:.06,14:.08,15:.09,16:.10,17:.10,18:.06,19:.05,20:.04,21:.02,22:.02};
const DOW=[1.15,1.05,1,1,.95,.45,0]; // Mon..Sun
function mulberry32(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const r1=v=>Math.round(v*10)/10,r2=v=>Math.round(v*100)/100,p2=n=>String(n).padStart(2,"0");
const dstr=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;

function generate(days=56,seed=7,base=40000){
 const rnd=mulberry32(seed),uni=(a,b)=>a+(b-a)*rnd(),rows=[],backlog={};
 Object.keys(PROCESSES).forEach(p=>backlog[p]=0);
 const end=new Date();end.setHours(0,0,0,0);
 for(let d=0;d<days;d++){
  const day=new Date(end);day.setDate(end.getDate()-(days-1-d));
  const dow=(day.getDay()+6)%7,fc=base*DOW[dow]*(1+.25*d/days);
  if(fc===0)continue;
  const actual=fc*uni(.88,1.15);
  for(const [h,share] of Object.entries(HOUR_PROFILE))for(const [p,std] of Object.entries(PROCESSES)){
   const forecast=fc*share,demand=actual*share*uni(.9,1.1);
   const sched=Math.max(1,Math.floor(forecast/(std*TARGET_UTIL)+.999));
   let absent=0;for(let i=0;i<sched;i++)if(rnd()<.06)absent++;
   const present=sched-absent,ot=backlog[p]>0?present*.12*rnd():0,paid=present+ot,prod=paid*uni(.74,.92);
   const cap=prod*std*uni(.85,1.08),avail=demand+backlog[p],done=Math.min(avail,cap);
   backlog[p]=avail-done;
   rows.push({ts:`${dstr(day)}T${p2(h)}:00`,process:p,units_forecast:forecast,units_demand:demand,units_done:done,
    lines_done:done*LINES_PER_UNIT[p],heads_scheduled:sched,heads_present:present,hours_paid:paid,hours_productive:prod,
    hours_overtime:ot,backlog_units:backlog[p],std_uph:std});
  }}
 return rows}

const dv=(a,b)=>b?a/b:0,sum=(rs,k)=>rs.reduce((a,r)=>a+r[k],0);
function rag(n,v){const t=THRESHOLDS[n];
 if(t[0]==="higher")return v>=t[1]?"green":v>=t[2]?"amber":"red";
 if(t[0]==="lower")return v<=t[1]?"green":v<=t[2]?"amber":"red";
 return v>=t[1][0]&&v<=t[1][1]?"green":v>=t[2][0]&&v<=t[2][1]?"amber":"red"}
function kpis(rows){
 if(!rows.length)return{};
 const units=sum(rows,"units_done"),paid=sum(rows,"hours_paid"),prod=sum(rows,"hours_productive");
 const earned=rows.reduce((a,r)=>a+r.units_done/r.std_uph,0),design=rows.reduce((a,r)=>a+r.heads_scheduled*r.std_uph,0);
 const required=rows.reduce((a,r)=>a+r.units_forecast/(r.std_uph*TARGET_UTIL),0);
 const hourly={};rows.forEach(r=>hourly[r.ts]=(hourly[r.ts]||0)+r.units_done);
 const hv=Object.values(hourly),nh=hv.length,avg=dv(hv.reduce((a,b)=>a+b,0),nh);
 const last=rows.reduce((m,r)=>r.ts>m?r.ts:m,"");
 const backlog=rows.filter(r=>r.ts===last).reduce((a,r)=>a+r.backlog_units,0);
 const ape=rows.filter(r=>r.units_demand).map(r=>Math.abs(r.units_demand-r.units_forecast)/r.units_demand);
 const o={units,lines:sum(rows,"lines_done"),uplh:dv(units,paid),performance_to_standard:dv(earned,prod),
  labor_utilization:dv(prod,paid),capacity_utilization:dv(units,design),labor_coverage:dv(sum(rows,"heads_present"),required),
  absenteeism:1-dv(sum(rows,"heads_present"),sum(rows,"heads_scheduled")),overtime_pct:dv(sum(rows,"hours_overtime"),paid),
  backlog_units:backlog,backlog_hours:dv(backlog,dv(units,nh)),forecast_mape:dv(ape.reduce((a,b)=>a+b,0),ape.length),
  peak_to_avg:dv(Math.max(...hv),avg)};
 o.status={};Object.keys(THRESHOLDS).forEach(k=>o.status[k]=rag(k,o[k]));return o}
const groupBy=(rows,f)=>rows.reduce((g,r)=>((g[f(r)]??=[]).push(r),g),{});
function api(ROWS,days,proc){
 const last=ROWS.reduce((m,r)=>r.ts>m?r.ts:m,"").slice(0,10),ld=new Date(last+"T00:00:00");ld.setDate(ld.getDate()-(days-1));
 const rows=ROWS.filter(r=>r.ts.slice(0,10)>=dstr(ld)),sel=proc?rows.filter(r=>r.process===proc):rows;
 const per={};Object.entries(groupBy(rows,r=>r.process)).sort().forEach(([p,v])=>per[p]=kpis(v));
 const trend=Object.entries(groupBy(sel,r=>r.ts.slice(0,10))).sort().map(([date,v])=>{const k=kpis(v);delete k.status;return{date,...k}});
 const hourly=Object.entries(groupBy(sel,r=>+r.ts.slice(11,13))).sort((a,b)=>a[0]-b[0]).map(([h,v])=>{
  const n=new Set(v.map(r=>r.ts.slice(0,10))).size;
  return{hour:+h,units:sum(v,"units_done")/n,capacity:v.reduce((a,r)=>a+r.heads_scheduled*r.std_uph,0)/n,demand:sum(v,"units_demand")/n}});
 const alerts=[];Object.entries(per).forEach(([p,k])=>Object.entries(k.status).forEach(([n,s])=>{if(s!=="green")alerts.push({process:p,kpi:n,value:k[n],severity:s})}));
 alerts.sort((a,b)=>(a.severity!=="red")-(b.severity!=="red")||a.process.localeCompare(b.process)||a.kpi.localeCompare(b.kpi));
 return{days,process:proc,overall:kpis(rows),by_process:per,trend,hourly,alerts}}
