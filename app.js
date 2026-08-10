const KEY='healthcare_v6';
const OLD='healthcare_v5';
const blank={
 profile:{height:167,targetWeight:null,weeklyGoal:150,weightFreq:7,bpReminderEnabled:false,bpMorningTime:'08:00',bpEveningTime:'20:00',conditions:'',allergies:'',displayName:'My Health',syncEmail:''},
 reminders:{medEnabled:true,weightEnabled:false,weightTime:'08:00',activityEnabled:false,activityTime:'18:00'},
 sync:{mode:'local',lastSyncAt:null,lastCloudUpdatedAt:null,lastSyncedLocalUpdatedAt:null,revision:0,history:[]},
 bp:[],weights:[{date:new Date().toISOString(),value:80}],activities:[],meds:[],labs:[],medTaken:[],checks:{}
};
let db=JSON.parse(localStorage.getItem(KEY)||'null');
if(!db){
 const old=JSON.parse(localStorage.getItem(OLD)||'null');
 db=old?{...blank,...old,profile:{...blank.profile,...(old.profile||{})},medTaken:old.medTaken||[]}:blank;
}
let reportDays=7;
function save(){localStorage.setItem(KEY,JSON.stringify(db));renderAll()}
function fmtDate(x){return new Date(x).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})}
function dateOnly(x){return new Date(x).toLocaleDateString('th-TH',{dateStyle:'medium'})}
function sameDay(a,b=new Date()){return new Date(a).toDateString()===new Date(b).toDateString()}
function withinDays(x,days){return new Date(x)>=new Date(Date.now()-days*86400000)}
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:null}
function bmi(w,h){return w/((h/100)**2)}
function id(x){return document.getElementById(x)}
id('todayText').textContent=new Date().toLocaleDateString('th-TH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
id('labDate').valueAsDate=new Date();

document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('.tab,.page').forEach(x=>x.classList.remove('active'));b.classList.add('active');id(b.dataset.page).classList.add('active');
 if(b.dataset.page==='report')drawCharts();
 if(b.dataset.page==='doctor')renderDoctor();
});
document.querySelectorAll('.range').forEach(b=>b.onclick=()=>{document.querySelectorAll('.range').forEach(x=>x.classList.remove('active'));b.classList.add('active');reportDays=+b.dataset.days;renderReport();drawCharts()});

function bpClass(s,d){
 if(s>180||d>120)return ['สูงมาก — วัดซ้ำและประเมินอาการ','danger'];
 if(s>=135||d>=85)return ['สูงกว่าค่าที่ใช้พิจารณาความดันสูงเมื่อวัดที่บ้าน','warn'];
 if(s<90||d<60)return ['ค่อนข้างต่ำ','warn'];
 return ['ต่ำกว่าเกณฑ์ความดันสูงที่บ้าน','ok'];
}
function todayMinutes(){
 return db.activities.filter(x=>sameDay(x.date)).reduce((a,b)=>a+b.minutes,0)
}
function weekMinutes(){
 return db.activities.filter(x=>withinDays(x.date,7)).reduce((a,b)=>a+b.minutes,0)
}
function medAppliesToday(m){
 const d=new Date().getDay(); if(m.freq==='weekdays')return d>=1&&d<=5; return true;
}
function medTakenToday(m){return db.medTaken.some(x=>x.medId===m.id&&sameDay(x.date))}
function dueState(m){
 if(medTakenToday(m))return 'taken';
 const [h,mi]=m.time.split(':').map(Number); const due=new Date();due.setHours(h,mi,0,0);
 return new Date()>due?'overdue':'upcoming'
}
function notify(text){
 if('Notification' in window && Notification.permission==='granted') new Notification('Personal Healthcare',{body:text});
}
async function enableNotifications(){
 if(!('Notification' in window)){alert('Browser นี้ไม่รองรับ Web Notification');return}
 const p=await Notification.requestPermission();
 alert(p==='granted'?'เปิดการแจ้งเตือนแล้ว (ทำงานเมื่อ browser/PWA อนุญาต)':'ยังไม่ได้อนุญาตการแจ้งเตือน');
}
id('notifyBtn').onclick=enableNotifications;

id('bpForm').onsubmit=e=>{
 e.preventDefault();db.bp.push({date:new Date().toISOString(),sys:+id('sys').value,dia:+id('dia').value,pulse:id('pulse').value?+id('pulse').value:null,period:id('bpPeriod').value,note:id('bpNote').value});
 e.target.reset();save();
};
id('weightForm').onsubmit=e=>{
 e.preventDefault();db.profile.height=+id('height').value;db.weights.push({date:new Date().toISOString(),value:+id('weight').value});e.target.reset();id('height').value=db.profile.height;save()
};
id('activityForm').onsubmit=e=>{
 e.preventDefault();db.activities.push({date:new Date().toISOString(),type:id('activityType').value,minutes:+id('activityMinutes').value,note:id('activityNote').value});e.target.reset();save()
};
id('medForm').onsubmit=e=>{
 e.preventDefault();db.meds.push({id:Date.now(),name:id('medName').value,dose:id('medDose').value,time:id('medTime').value,freq:id('medFreq').value,lead:+id('medLead').value,note:id('medNote').value,active:true});e.target.reset();id('medLead').value=0;save()
};
id('labForm').onsubmit=e=>{
 e.preventDefault();db.labs.push({id:Date.now(),name:id('labName').value.trim(),value:id('labValue').value.trim(),unit:id('labUnit').value.trim(),date:id('labDate').value,range:id('labRange').value.trim(),refLow:id('labRefLow').value!==''?+id('labRefLow').value:null,refHigh:id('labRefHigh').value!==''?+id('labRefHigh').value:null,refMode:id('labRefMode').value,category:id('labCategory').value});e.target.reset();id('labDate').valueAsDate=new Date();id('labRefMode').value='range';id('labCategory').value='auto';save()
};
id('profileForm').onsubmit=e=>{
 e.preventDefault();db.profile={...db.profile,height:+id('profileHeight').value,targetWeight:id('targetWeight').value?+id('targetWeight').value:null,weeklyGoal:+id('weeklyGoal').value||0,weightFreq:+id('weightFreq').value,bpReminderEnabled:id('bpReminderEnabled').checked,bpMorningTime:id('bpMorningTime').value,bpEveningTime:id('bpEveningTime').value,conditions:id('conditions').value,allergies:id('allergies').value};save()
};

function delMed(x){db.meds=db.meds.filter(m=>m.id!==x);save()}
function delLab(x){db.labs=db.labs.filter(m=>m.id!==x);save()}
function takeMed(x){db.medTaken.push({medId:x,date:new Date().toISOString()});save()}
window.delMed=delMed;window.delLab=delLab;window.takeMed=takeMed;

function renderAlerts(){
 const alerts=[]; const last=db.bp.at(-1);
 if(last && (last.sys>180||last.dia>120)) alerts.push(`<div class="alert danger">ความดันล่าสุด ${last.sys}/${last.dia} mmHg สูงมาก ควรวัดซ้ำอย่างถูกวิธี และหากมีอาการผิดปกติรุนแรงให้ขอความช่วยเหลือทางการแพทย์ทันที</div>`);
 const overdue=db.meds.filter(m=>m.active&&medAppliesToday(m)&&dueState(m)==='overdue');
 if(overdue.length) alerts.push(`<div class="alert warn">มียา ${overdue.length} รายการที่เลยเวลาตามตารางที่คุณบันทึกไว้ กรุณาตรวจสอบคำสั่งใช้ยาเดิมของคุณ ไม่ควรเพิ่มขนาดยาเพื่อชดเชยเอง</div>`);
 id('alertBox').innerHTML=alerts.join('');
}
function renderTodayMeds(){
 const meds=db.meds.filter(m=>m.active&&medAppliesToday(m)).sort((a,b)=>a.time.localeCompare(b.time));
 id('todayMeds').innerHTML=meds.length?meds.map(m=>{
  const st=dueState(m), taken=st==='taken';
  return `<div class="item"><div><strong>${m.time} • ${m.name}</strong><small>${m.dose}${m.note?' • '+m.note:''}</small></div><div class="med-actions">${taken?'<span class="pill">กินแล้ว</span>':`<button class="taken" onclick="takeMed(${m.id})">กินแล้ว</button>`}${st==='overdue'?'<span class="overdue">เลยเวลา</span>':''}</div></div>`
 }).join(''):'<p class="muted">ยังไม่มียาตามตารางวันนี้</p>';
}
function renderProfile(){
 const p=db.profile;id('profileHeight').value=p.height||167;id('targetWeight').value=p.targetWeight??'';id('weeklyGoal').value=p.weeklyGoal??150;id('weightFreq').value=String(p.weightFreq||7);id('bpReminderEnabled').checked=!!p.bpReminderEnabled;id('bpMorningTime').value=p.bpMorningTime||'08:00';id('bpEveningTime').value=p.bpEveningTime||'20:00';id('conditions').value=p.conditions||'';id('allergies').value=p.allergies||'';
}
function renderAll(){
 const lastBP=db.bp.at(-1), lastW=db.weights.at(-1),p=db.profile;
 if(lastBP){let c=bpClass(lastBP.sys,lastBP.dia);id('bpLatest').textContent=`${lastBP.sys}/${lastBP.dia}`;id('bpStatus').textContent=c[0]}
 else{id('bpLatest').textContent='ยังไม่มี';id('bpStatus').textContent='เพิ่มค่าที่หน้า “บันทึก”'}
 if(lastW){id('weightLatest').textContent=`${lastW.value.toFixed(1)} kg`;id('bmiLatest').textContent=`BMI ${bmi(lastW.value,p.height).toFixed(1)}${p.targetWeight?' • เป้า '+p.targetWeight+' kg':''}`}
 const activeToday=db.meds.filter(m=>m.active&&medAppliesToday(m));id('medDue').textContent=`${activeToday.length} รายการ`;id('medStatus').textContent=activeToday.length?`${activeToday.filter(m=>medTakenToday(m)).length}/${activeToday.length} บันทึกว่ากินแล้ว`:'ยังไม่มีตารางยา';
 const wm=weekMinutes();id('activityWeek').textContent=`${wm} นาที`;id('activityGoal').textContent=`เป้าหมาย ${p.weeklyGoal||0} นาที`;
 const fields=[db.bp.length>0,db.weights.length>0,db.labs.length>0,db.meds.length>0,p.height>0];id('healthScore').textContent=Math.round(fields.filter(Boolean).length/fields.length*100)+'%';
 let status=['พร้อมติดตาม','ok']; if(lastBP)status=bpClass(lastBP.sys,lastBP.dia);id('statusBadge').textContent=status[0];id('statusBadge').className='badge '+status[1];
 id('summaryText').textContent=lastBP?`ความดันล่าสุด ${lastBP.sys}/${lastBP.dia} mmHg • น้ำหนัก ${lastW.value.toFixed(1)} kg`:'เพิ่มความดันครั้งแรกเพื่อเริ่มวิเคราะห์แนวโน้ม';
 const lastWeightDays=(Date.now()-new Date(lastW.date))/86400000;
 const tasks=[
   ['bp',p.bpReminderEnabled?'วัดความดันเช้า/เย็นตามตาราง':'วัดความดันตามแผนของคุณ'],
   ['activity',`กิจกรรมวันนี้ (7 วัน: ${wm}/${p.weeklyGoal||0} นาที)`],
   ['weight',lastWeightDays>=p.weightFreq?'ถึงรอบชั่งน้ำหนักแล้ว':'ชั่งน้ำหนักตามรอบที่กำหนด']
 ];
 id('todayChecklist').innerHTML=tasks.map(([k,t])=>`<label class="check"><input type="checkbox" ${db.checks[k]?'checked':''} onchange="db.checks['${k}']=this.checked;save()"><span>${t}</span></label>`).join('');
 id('medList').innerHTML=db.meds.length?db.meds.map(m=>`<div class="item"><div><strong>${m.name} • ${m.time}</strong><small>${m.dose} • ${m.freq}${m.note?' • '+m.note:''}</small></div><button class="delete" onclick="delMed(${m.id})">ลบ</button></div>`).join(''):'<p class="muted">ยังไม่มียาที่บันทึก</p>';
 id('labList').innerHTML=db.labs.length?db.labs.slice().reverse().map(l=>`<div class="item"><div><strong>${l.name}: ${l.value} ${l.unit||''}</strong><small>${l.date}${l.range?' • '+l.range:''}</small></div><button class="delete" onclick="delLab(${l.id})">ลบ</button></div>`).join(''):'<p class="muted">ยังไม่มีผลตรวจที่บันทึก</p>';
 renderAlerts();renderTodayMeds();renderProfile();renderReport();renderDoctor();
}
function renderReport(){
 const bp=db.bp.filter(x=>withinDays(x.date,reportDays)), wt=db.weights.filter(x=>withinDays(x.date,reportDays)), acts=db.activities.filter(x=>withinDays(x.date,reportDays));
 id('avgSys').textContent=bp.length?mean(bp.map(x=>x.sys)).toFixed(1):'—';id('avgDia').textContent=bp.length?mean(bp.map(x=>x.dia)).toFixed(1):'—';
 id('weightChange').textContent=wt.length>1?(wt.at(-1).value-wt[0].value).toFixed(1)+' kg':'—';id('activityTotal').textContent=acts.reduce((s,x)=>s+x.minutes,0)+' นาที';
 const logs=[...db.bp.map(x=>({date:x.date,text:`BP ${x.sys}/${x.dia}${x.pulse?' • pulse '+x.pulse:''}`})),...db.weights.map(x=>({date:x.date,text:`Weight ${x.value} kg`})),...db.activities.map(x=>({date:x.date,text:`${x.type} ${x.minutes} นาที${x.note?' • '+x.note:''}`}))].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,16);
 id('recentLog').innerHTML=logs.map(x=>`<div class="item"><div><strong>${x.text}</strong><small>${fmtDate(x.date)}</small></div></div>`).join('');
}
function drawLine(canvas,items,keys,colors){
 const c=id(canvas),ctx=c.getContext('2d'),W=c.width,H=c.height,p=35;ctx.clearRect(0,0,W,H);ctx.strokeStyle='#dbe5e5';ctx.lineWidth=1;
 for(let i=0;i<5;i++){let y=p+(H-2*p)*i/4;ctx.beginPath();ctx.moveTo(p,y);ctx.lineTo(W-p,y);ctx.stroke()}
 if(!items.length){ctx.fillStyle='#789';ctx.font='18px sans-serif';ctx.fillText('ยังไม่มีข้อมูล',p,H/2);return}
 let vals=items.flatMap(x=>keys.map(k=>+x[k])).filter(Number.isFinite),min=Math.min(...vals),max=Math.max(...vals);if(min===max){min-=1;max+=1}
 keys.forEach((k,ki)=>{ctx.strokeStyle=colors[ki];ctx.lineWidth=3;ctx.beginPath();items.forEach((x,i)=>{let xx=p+(W-2*p)*(items.length===1?.5:i/(items.length-1)),yy=H-p-(x[k]-min)/(max-min)*(H-2*p);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)});ctx.stroke()})
}
function drawCharts(){drawLine('bpChart',db.bp.filter(x=>withinDays(x.date,reportDays)),['sys','dia'],['#0f766e','#e0962d']);drawLine('weightChart',db.weights.filter(x=>withinDays(x.date,reportDays)),['value'],['#386cb0'])}
function renderDoctor(){
 const p=db.profile,lastW=db.weights.at(-1),bp30=db.bp.filter(x=>withinDays(x.date,30)),avgS=mean(bp30.map(x=>x.sys)),avgD=mean(bp30.map(x=>x.dia));
 const meds=db.meds.filter(x=>x.active),labs=db.labs.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,12);
 id('doctorReport').innerHTML=`
 <h3>Profile</h3><p><strong>Height:</strong> ${p.height||'—'} cm &nbsp; <strong>Latest weight:</strong> ${lastW?lastW.value.toFixed(1)+' kg':'—'} &nbsp; <strong>BMI:</strong> ${lastW?bmi(lastW.value,p.height).toFixed(1):'—'}</p>
 <p><strong>Conditions / limitations:</strong> ${p.conditions||'Not recorded'}<br><strong>Drug allergies:</strong> ${p.allergies||'Not recorded'}</p>
 <h3>Blood pressure — last 30 days</h3><p>${bp30.length?`${bp30.length} readings • Average ${avgS.toFixed(1)}/${avgD.toFixed(1)} mmHg`:'No readings recorded.'}</p>
 <table class="doctor-table"><tr><th>Date</th><th>BP</th><th>Pulse</th><th>Note</th></tr>${bp30.slice(-10).reverse().map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${x.sys}/${x.dia}</td><td>${x.pulse||'—'}</td><td>${x.note||''}</td></tr>`).join('')}</table>
 <h3>Current medication list</h3>${meds.length?`<table class="doctor-table"><tr><th>Medicine</th><th>Dose</th><th>Time</th><th>Note</th></tr>${meds.map(m=>`<tr><td>${m.name}</td><td>${m.dose}</td><td>${m.time}</td><td>${m.note||''}</td></tr>`).join('')}</table>`:'<p>No medication recorded.</p>'}
 <h3>Recent laboratory / health check results</h3>${labs.length?`<table class="doctor-table"><tr><th>Date</th><th>Test</th><th>Result</th><th>Reference / note</th></tr>${labs.map(l=>`<tr><td>${l.date}</td><td>${l.name}</td><td>${l.value} ${l.unit||''}</td><td>${l.range||''}</td></tr>`).join('')}</table>`:'<p>No laboratory results recorded.</p>'}
 <h3>Activity</h3><p>Recorded activity in last 7 days: <strong>${weekMinutes()} minutes</strong>. User-set weekly goal: ${p.weeklyGoal||0} minutes.</p>
 <p class="muted">Generated by Personal Healthcare v6 from user-entered data. This summary is not a diagnosis and does not replace the original laboratory report or clinician medication list.</p>`;
}
id('printBtn').onclick=()=>window.print();
id('exportBtn').onclick=()=>{
 const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='personal-health-data-v6.json';a.click();URL.revokeObjectURL(a.href)
};

// Lightweight in-app due check while page is open.
setInterval(()=>{
 db.meds.filter(m=>m.active&&medAppliesToday(m)&&!medTakenToday(m)).forEach(m=>{
   const [h,mi]=m.time.split(':').map(Number),due=new Date();due.setHours(h,mi,0,0);
   const delta=(due-Date.now())/60000;
   if(delta<=m.lead && delta>-1) notify(`${m.name} ${m.dose} เวลา ${m.time}`);
 });
},60000);


// ---------- v3 PWA / Backup / Trend Engine ----------
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();deferredPrompt=e;id('installBtn').style.display='inline-block';
});
id('installBtn').onclick=async()=>{
  if(!deferredPrompt){alert('หากปุ่มติดตั้งไม่ขึ้น ให้ใช้เมนู browser → Add to Home Screen / Install App');return}
  deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; id('installBtn').style.display='none';
};

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').then(()=>{if(id('swStatus'))id('swStatus').textContent='พร้อมใช้งาน'}).catch(()=>{if(id('swStatus'))id('swStatus').textContent='ลงทะเบียนไม่สำเร็จ'});
}else if(id('swStatus')) id('swStatus').textContent='Browser ไม่รองรับ';

function updateEnvStatus(){
  if(id('onlineStatus')) id('onlineStatus').textContent=navigator.onLine?'ออนไลน์':'ออฟไลน์';
  if(id('notificationStatus')) id('notificationStatus').textContent=('Notification' in window)?Notification.permission:'ไม่รองรับ';
}
window.addEventListener('online',updateEnvStatus);window.addEventListener('offline',updateEnvStatus);updateEnvStatus();

function downloadJSON(obj,name){
 const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),a=document.createElement('a');
 a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)
}
if(id('backupBtn')) id('backupBtn').onclick=()=>downloadJSON({
 app:'Personal Healthcare',version:6,exportedAt:new Date().toISOString(),schemaVersion:6,data:db
},'personal-healthcare-v6-backup.json');

if(id('importFile')) id('importFile').onchange=async e=>{
 const f=e.target.files?.[0]; if(!f)return;
 try{
   const raw=JSON.parse(await f.text());
   const incoming=raw.data||raw;
   if(!incoming.profile||!Array.isArray(incoming.bp)||!Array.isArray(incoming.weights)) throw new Error('รูปแบบไม่ถูกต้อง');
   db={...blank,...incoming,profile:{...blank.profile,...incoming.profile},medTaken:incoming.medTaken||[],checks:incoming.checks||{}};
   localStorage.setItem(KEY,JSON.stringify(db)); alert('นำเข้าข้อมูลสำเร็จ'); location.reload();
 }catch(err){alert('นำเข้าไม่สำเร็จ: '+err.message)}
};
if(id('resetTodayBtn')) id('resetTodayBtn').onclick=()=>{db.checks={};save()};
if(id('clearDataBtn')) id('clearDataBtn').onclick=()=>{
 if(confirm('ล้างข้อมูลสุขภาพทั้งหมดจากอุปกรณ์นี้? การกระทำนี้ย้อนกลับไม่ได้หากไม่มี Backup')){
   localStorage.removeItem(KEY);location.reload();
 }
};

function linearSlope(points){
 if(points.length<2)return 0;
 const n=points.length,xm=(n-1)/2,ym=mean(points);
 let num=0,den=0;points.forEach((y,i)=>{num+=(i-xm)*(y-ym);den+=(i-xm)**2});return den?num/den:0
}
function trendFlags(){
 const flags=[];
 const bp7=db.bp.filter(x=>withinDays(x.date,7));
 const bp30=db.bp.filter(x=>withinDays(x.date,30));
 if(bp7.length>=3){
   const avs=mean(bp7.map(x=>x.sys)),avd=mean(bp7.map(x=>x.dia));
   if(avs>=135||avd>=85)flags.push({type:'warn',text:`ค่าเฉลี่ยความดัน 7 วัน ${avs.toFixed(0)}/${avd.toFixed(0)} mmHg อยู่เหนือเกณฑ์ที่ NHS ใช้พิจารณาว่าสูงเมื่อวัดที่บ้าน ควรติดตามต่อเนื่องและนำค่าเฉลี่ยไปคุยกับแพทย์`});
   else flags.push({type:'ok',text:`ค่าเฉลี่ยความดัน 7 วัน ${avs.toFixed(0)}/${avd.toFixed(0)} mmHg ต่ำกว่าเกณฑ์ความดันสูงที่บ้าน 135/85`});
 }
 if(bp30.length>=5){
   const ss=linearSlope(bp30.map(x=>x.sys));
   if(ss>1.5)flags.push({type:'info',text:'แนวโน้ม SYS ในข้อมูล 30 วันกำลังเพิ่มขึ้น ควรดูค่าเฉลี่ยหลายวันร่วมกับวิธีวัด ไม่ใช้จุดเดียวตัดสิน'});
 }
 const wt30=db.weights.filter(x=>withinDays(x.date,30));
 if(wt30.length>=2){
   const change=wt30.at(-1).value-wt30[0].value;
   flags.push({type:'info',text:`น้ำหนักใน 30 วันเปลี่ยน ${change>=0?'+':''}${change.toFixed(1)} kg จากข้อมูลที่บันทึกไว้`});
 }
 const mins=weekMinutes(),goal=db.profile.weeklyGoal||150;
 flags.push({type:mins>=goal?'ok':'info',text:`กิจกรรม 7 วัน ${mins}/${goal} นาที (${goal?Math.min(100,Math.round(mins/goal*100)):0}% ของเป้าที่ตั้งไว้)`});
 const active=db.meds.filter(m=>m.active&&medAppliesToday(m));
 if(active.length){
   const taken=active.filter(m=>medTakenToday(m)).length;
   flags.push({type:taken===active.length?'ok':'info',text:`บันทึกการกินยาวันนี้ ${taken}/${active.length} รายการ`});
 }
 if(!flags.length)flags.push({type:'info',text:'ยังมีข้อมูลไม่พอสำหรับวิเคราะห์แนวโน้ม กรุณาบันทึกอย่างต่อเนื่อง'});
 return flags;
}
function renderTrendFlags(){
 const html=trendFlags().map(f=>`<div class="flag ${f.type}">${f.text}</div>`).join('');
 if(id('trendFlags'))id('trendFlags').innerHTML=html;
 if(id('reportFlags'))id('reportFlags').innerHTML=html;
}
const _oldRenderAll=renderAll;
renderAll=function(){_oldRenderAll();renderTrendFlags();updateEnvStatus()};
renderAll();

// persist a daily snapshot for future cloud sync conflict handling
function snapshotMeta(){
 localStorage.setItem('healthcare_v3_meta',JSON.stringify({updatedAt:new Date().toISOString(),schemaVersion:6,deviceId:localStorage.getItem('healthcare_device_id')||''}))
}
if(!localStorage.getItem('healthcare_device_id'))localStorage.setItem('healthcare_device_id',crypto?.randomUUID?crypto.randomUUID():'dev-'+Date.now());
window.addEventListener('beforeunload',snapshotMeta);


// ---------- v4 Reminder Center / Quality / Sync Adapter ----------
db.reminders={...blank.reminders,...(db.reminders||{})};
db.sync={...blank.sync,...(db.sync||{})};
db.profile={...blank.profile,...(db.profile||{})};

function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

function renderIdentity(){
 if(id('profileName')) id('profileName').textContent=db.profile.displayName||'My Health';
 if(id('profileMeta')) id('profileMeta').textContent=db.profile.syncEmail?db.profile.syncEmail:'Local profile';
 if(id('syncState')) id('syncState').textContent=db.sync.mode==='local'?'Local only':'Sync enabled';
 if(id('displayName')) id('displayName').value=db.profile.displayName||'My Health';
 if(id('syncEmail')) id('syncEmail').value=db.profile.syncEmail||'';
 if(id('cloudMode')) id('cloudMode').textContent=db.sync.mode==='local'?'Local adapter':'Remote adapter';
}
if(id('identityForm')) id('identityForm').onsubmit=e=>{
 e.preventDefault();db.profile.displayName=id('displayName').value.trim()||'My Health';db.profile.syncEmail=id('syncEmail').value.trim();save();
};

function reminderQueue(){
 const out=[], now=new Date(), p=db.profile, r=db.reminders;
 db.meds.filter(m=>m.active&&medAppliesToday(m)&&!medTakenToday(m)).forEach(m=>{
   const [h,mi]=m.time.split(':').map(Number),d=new Date();d.setHours(h,mi,0,0);
   out.push({type:'ยา',text:`${m.name} ${m.dose}`,when:m.time,priority:d<now?'high':'normal'});
 });
 if(p.bpReminderEnabled){
   for(const [label,t] of [['วัดความดันเช้า',p.bpMorningTime],['วัดความดันเย็น',p.bpEveningTime]]){
     const [h,mi]=t.split(':').map(Number),d=new Date();d.setHours(h,mi,0,0);
     const hasToday=db.bp.some(x=>sameDay(x.date)&&x.period.includes(label.includes('เช้า')?'เช้า':'เย็น'));
     if(!hasToday) out.push({type:'ความดัน',text:label,when:t,priority:d<now?'high':'normal'});
   }
 }
 const lastW=db.weights.at(-1);
 if(r.weightEnabled&&lastW){
   const days=(Date.now()-new Date(lastW.date))/86400000;
   if(days>=p.weightFreq) out.push({type:'น้ำหนัก',text:'ถึงรอบชั่งน้ำหนัก',when:r.weightTime,priority:'normal'});
 }
 if(r.activityEnabled&&todayMinutes()===0) out.push({type:'กิจกรรม',text:'ยังไม่มีกิจกรรมที่บันทึกวันนี้',when:r.activityTime,priority:'normal'});
 return out.sort((a,b)=>(a.when||'99:99').localeCompare(b.when||'99:99'));
}

function renderReminderCenter(){
 const q=reminderQueue(), meds=q.filter(x=>x.type==='ยา').length, bp=q.filter(x=>x.type==='ความดัน').length;
 if(id('reminderSummary')) id('reminderSummary').innerHTML=`
   <div class="card stat"><span>รอเตือนทั้งหมด</span><strong>${q.length}</strong><small>รายการ</small></div>
   <div class="card stat"><span>ยา</span><strong>${meds}</strong><small>ยังไม่บันทึกว่ากิน</small></div>
   <div class="card stat"><span>ความดัน</span><strong>${bp}</strong><small>ตามตารางวันนี้</small></div>
   <div class="card stat"><span>กิจกรรมวันนี้</span><strong>${todayMinutes()} นาที</strong><small>บันทึกแล้ว</small></div>`;
 if(id('reminderQueue')) id('reminderQueue').innerHTML=q.length?q.map(x=>`<div class="queue-item"><div><strong>${esc(x.type)} • ${esc(x.text)}</strong><div class="when">${esc(x.when||'วันนี้')}</div></div><span class="pill">${x.priority==='high'?'ควรตรวจตอนนี้':'รอตามเวลา'}</span></div>`).join(''):'<p class="muted">ไม่มีรายการค้างตามการตั้งค่าปัจจุบัน</p>';
 if(id('medReminderEnabled')) id('medReminderEnabled').checked=!!db.reminders.medEnabled;
 if(id('weightReminderEnabled')) id('weightReminderEnabled').checked=!!db.reminders.weightEnabled;
 if(id('weightReminderTime')) id('weightReminderTime').value=db.reminders.weightTime||'08:00';
 if(id('activityReminderEnabled')) id('activityReminderEnabled').checked=!!db.reminders.activityEnabled;
 if(id('activityReminderTime')) id('activityReminderTime').value=db.reminders.activityTime||'18:00';
}
if(id('reminderForm')) id('reminderForm').onsubmit=e=>{
 e.preventDefault();db.reminders={...db.reminders,medEnabled:id('medReminderEnabled').checked,weightEnabled:id('weightReminderEnabled').checked,weightTime:id('weightReminderTime').value,activityEnabled:id('activityReminderEnabled').checked,activityTime:id('activityReminderTime').value};save()
};
if(id('runReminderCheckBtn')) id('runReminderCheckBtn').onclick=()=>{
 const q=reminderQueue(); if(q.length) notify(`มี ${q.length} รายการที่ควรตรวจใน Reminder Center`); renderReminderCenter();
};

function qualityScan(){
 const issues=[];
 const lastW=db.weights.at(-1);
 if(!db.profile.height) issues.push({level:'high',text:'ยังไม่มีส่วนสูง ทำให้คำนวณ BMI ไม่ได้'});
 if(!lastW) issues.push({level:'medium',text:'ยังไม่มีน้ำหนักล่าสุด'});
 if(!db.bp.length) issues.push({level:'medium',text:'ยังไม่มีข้อมูลความดัน'});
 if(!db.labs.length) issues.push({level:'low',text:'ยังไม่มีผลตรวจสุขภาพในระบบ'});
 if(db.profile.conditions && db.profile.conditions.length<3) issues.push({level:'low',text:'ข้อมูลโรคประจำตัว/ข้อจำกัดสั้นมาก ควรตรวจว่ากรอกครบหรือไม่'});
 const badBP=db.bp.filter(x=>x.sys<=x.dia || x.sys<60 || x.sys>260 || x.dia<30 || x.dia>160);
 if(badBP.length) issues.push({level:'high',text:`พบข้อมูลความดัน ${badBP.length} รายการที่อาจผิดรูปแบบหรือไม่สมเหตุผล`});
 const dupBP=db.bp.filter((x,i,a)=>a.findIndex(y=>y.date===x.date&&y.sys===x.sys&&y.dia===x.dia)!==i);
 if(dupBP.length) issues.push({level:'medium',text:`พบความดันซ้ำ ${dupBP.length} รายการ`});
 const badWt=db.weights.filter(x=>x.value<30||x.value>250);
 if(badWt.length) issues.push({level:'high',text:`พบน้ำหนัก ${badWt.length} รายการนอกช่วงตรวจสอบของแอป`});
 const medsMissing=db.meds.filter(m=>!m.name||!m.dose||!m.time);
 if(medsMissing.length) issues.push({level:'high',text:`มียา ${medsMissing.length} รายการที่ข้อมูลชื่อ/ขนาด/เวลาไม่ครบ`});
 const labMissing=db.labs.filter(l=>!l.name||!l.value||!l.date);
 if(labMissing.length) issues.push({level:'medium',text:`มีผลตรวจ ${labMissing.length} รายการที่ข้อมูลไม่ครบ`});
 let score=100-issues.reduce((s,x)=>s+(x.level==='high'?20:x.level==='medium'?10:5),0);score=Math.max(0,score);
 return {issues,score};
}
function renderQuality(){
 const r=qualityScan();
 if(id('qualityScoreWrap')) id('qualityScoreWrap').innerHTML=`<div class="quality-score"><div class="quality-num">${r.score}</div><div><strong>Data Quality Score</strong><p class="muted">${r.score>=85?'ข้อมูลพร้อมใช้วิเคราะห์ในระดับดี':r.score>=65?'ควรแก้บางรายการก่อนดูแนวโน้มระยะยาว':'ควรตรวจข้อมูลหลายรายการก่อนใช้อ้างอิง'}</p></div></div>`;
 if(id('qualityIssues')) id('qualityIssues').innerHTML=r.issues.length?r.issues.map(x=>`<div class="issue ${x.level}">${esc(x.text)}</div>`).join(''):'<div class="flag ok">ไม่พบปัญหาคุณภาพข้อมูลตามกฎที่ตั้งไว้</div>';
}
if(id('scanQualityBtn')) id('scanQualityBtn').onclick=renderQuality;

// CSV format: name,value,unit,date,range
if(id('labCsvFile')) id('labCsvFile').onchange=async e=>{
 const f=e.target.files?.[0]; if(!f)return;
 try{
   const text=await f.text(), lines=text.trim().split(/\r?\n/); if(lines.length<2)throw new Error('CSV ไม่มีข้อมูล');
   const head=lines[0].split(',').map(x=>x.trim().toLowerCase());
   const req=['name','value','date']; if(!req.every(x=>head.includes(x)))throw new Error('ต้องมีคอลัมน์ name,value,date');
   const idx=o=>head.indexOf(o);
   let added=0;
   for(const line of lines.slice(1)){
     const c=line.split(',').map(x=>x.trim().replace(/^"|"$/g,''));
     if(!c[idx('name')]||!c[idx('value')]||!c[idx('date')])continue;
     db.labs.push({id:Date.now()+added,name:c[idx('name')],value:c[idx('value')],unit:idx('unit')>=0?c[idx('unit')]:'',date:c[idx('date')],range:idx('range')>=0?c[idx('range')]:''});added++;
   }
   save();alert(`นำเข้า Lab CSV สำเร็จ ${added} รายการ`);
 }catch(err){alert('นำเข้า CSV ไม่สำเร็จ: '+err.message)}
};

// backend adapter scaffold
window.HealthCloudAdapter={
 async push(payload){ throw new Error('No remote backend configured'); },
 async pull(){ throw new Error('No remote backend configured'); },
 async sync(){
   return {mode:'local',message:'Cloud adapter พร้อม แต่ยังไม่ได้ตั้งค่า backend'};
 }
};

const __renderAllV4=renderAll;
renderAll=function(){__renderAllV4();renderIdentity();renderReminderCenter();renderQuality()};
renderAll();


// ---------- v5 Supabase Cloud Sync ----------
const CLOUD_CFG_KEY='healthcare_v5_supabase_config';
let sb=null, sbSession=null;

function nowIso(){return new Date().toISOString()}
function logSync(type,message){
  db.sync.history=db.sync.history||[];
  db.sync.history.unshift({date:nowIso(),type,message});
  db.sync.history=db.sync.history.slice(0,30);
  localStorage.setItem(KEY,JSON.stringify(db));
  renderSyncHistory();
}
function localUpdatedAt(){
  const meta=JSON.parse(localStorage.getItem('healthcare_v3_meta')||'{}');
  return meta.updatedAt||db.sync.lastSyncedLocalUpdatedAt||new Date(0).toISOString();
}
function markLocalUpdated(){
  localStorage.setItem('healthcare_v3_meta',JSON.stringify({
    updatedAt:nowIso(),schemaVersion:6,deviceId:localStorage.getItem('healthcare_device_id')||''
  }));
}
const originalSaveV5=save;
save=function(){markLocalUpdated();originalSaveV5()};

function getCloudConfig(){
  try{return JSON.parse(localStorage.getItem(CLOUD_CFG_KEY)||'null')}catch{return null}
}
function setCloudConfig(cfg,remember=true){
  if(remember)localStorage.setItem(CLOUD_CFG_KEY,JSON.stringify(cfg));
  else sessionStorage.setItem(CLOUD_CFG_KEY,JSON.stringify(cfg));
}
function effectiveCloudConfig(){
  try{return JSON.parse(sessionStorage.getItem(CLOUD_CFG_KEY)||'null')||getCloudConfig()}catch{return null}
}
async function initSupabase(){
  const cfg=effectiveCloudConfig();
  if(!cfg?.url||!cfg?.key||!window.supabase?.createClient){
    sb=null; renderCloudState(); return false;
  }
  try{
    sb=window.supabase.createClient(cfg.url,cfg.key,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    const {data,error}=await sb.auth.getSession();
    if(error)throw error;
    sbSession=data.session||null;
    sb.auth.onAuthStateChange((_event,session)=>{sbSession=session;renderCloudState()});
    renderCloudState();
    return true;
  }catch(err){
    sb=null; logSync('error','Cloud init: '+err.message);renderCloudState();return false;
  }
}

async function sendMagicLink(email){
  if(!sb)throw new Error('กรุณาตั้งค่า Supabase ก่อน');
  const {error}=await sb.auth.signInWithOtp({
    email,
    options:{emailRedirectTo:window.location.href.split('#')[0]}
  });
  if(error)throw error;
}
async function signOutCloud(){
  if(!sb)return; const {error}=await sb.auth.signOut(); if(error)throw error; sbSession=null;renderCloudState()
}
function cloudRowPayload(){
  if(!sbSession?.user)throw new Error('ยังไม่ได้ Sign in');
  return {
    user_id:sbSession.user.id,
    payload:db,
    schema_version:6,
    revision:(db.sync.revision||0)+1,
    device_id:localStorage.getItem('healthcare_device_id')||null,
    client_updated_at:localUpdatedAt(),
    updated_at:nowIso()
  };
}
async function fetchCloudRow(){
  if(!sbSession?.user)throw new Error('ยังไม่ได้ Sign in');
  const {data,error}=await sb.from('health_snapshots').select('*').eq('user_id',sbSession.user.id).maybeSingle();
  if(error)throw error;
  return data||null;
}
async function pushCloud(force=false){
  if(!sbSession?.user)throw new Error('ยังไม่ได้ Sign in');
  const cloud=await fetchCloudRow();
  if(cloud&&!force){
    const cloudChanged=db.sync.lastCloudUpdatedAt && new Date(cloud.updated_at)>new Date(db.sync.lastCloudUpdatedAt);
    const localChanged=db.sync.lastSyncedLocalUpdatedAt && new Date(localUpdatedAt())>new Date(db.sync.lastSyncedLocalUpdatedAt);
    if(cloudChanged&&localChanged)throw Object.assign(new Error('SYNC_CONFLICT'),{code:'SYNC_CONFLICT',cloud});
  }
  const row=cloudRowPayload();
  const {data,error}=await sb.from('health_snapshots').upsert(row,{onConflict:'user_id'}).select().single();
  if(error)throw error;
  db.sync.mode='supabase';
  db.sync.lastSyncAt=nowIso();
  db.sync.lastCloudUpdatedAt=data.updated_at;
  db.sync.lastSyncedLocalUpdatedAt=localUpdatedAt();
  db.sync.revision=data.revision||row.revision;
  localStorage.setItem(KEY,JSON.stringify(db));
  logSync('ok','Upload สำเร็จ • revision '+db.sync.revision);
  renderCloudState();
  return data;
}
async function pullCloud(force=false){
  if(!sbSession?.user)throw new Error('ยังไม่ได้ Sign in');
  const cloud=await fetchCloudRow();
  if(!cloud){logSync('ok','Cloud ยังไม่มีข้อมูล');return null}
  if(!force){
    const cloudChanged=db.sync.lastCloudUpdatedAt && new Date(cloud.updated_at)>new Date(db.sync.lastCloudUpdatedAt);
    const localChanged=db.sync.lastSyncedLocalUpdatedAt && new Date(localUpdatedAt())>new Date(db.sync.lastSyncedLocalUpdatedAt);
    if(cloudChanged&&localChanged)throw Object.assign(new Error('SYNC_CONFLICT'),{code:'SYNC_CONFLICT',cloud});
  }
  const incoming=cloud.payload||{};
  const preservedSync={...db.sync,mode:'supabase',lastSyncAt:nowIso(),lastCloudUpdatedAt:cloud.updated_at,lastSyncedLocalUpdatedAt:nowIso(),revision:cloud.revision||0,history:db.sync.history||[]};
  db={...blank,...incoming,profile:{...blank.profile,...(incoming.profile||{})},reminders:{...blank.reminders,...(incoming.reminders||{})},sync:preservedSync};
  localStorage.setItem(KEY,JSON.stringify(db));markLocalUpdated();
  logSync('ok','Download สำเร็จ • revision '+db.sync.revision);
  renderAll();renderCloudState();
  return cloud;
}
async function syncNow(){
  const cloud=await fetchCloudRow();
  if(!cloud)return pushCloud();
  const cloudAt=new Date(cloud.updated_at||0), localAt=new Date(localUpdatedAt()||0), baseCloud=new Date(db.sync.lastCloudUpdatedAt||0), baseLocal=new Date(db.sync.lastSyncedLocalUpdatedAt||0);
  const cloudChanged=cloudAt>baseCloud, localChanged=localAt>baseLocal;
  if(cloudChanged&&localChanged)throw Object.assign(new Error('SYNC_CONFLICT'),{code:'SYNC_CONFLICT',cloud});
  if(cloudChanged)return pullCloud(true);
  return pushCloud(true);
}
function showConflict(err){
  if(id('conflictBox'))id('conflictBox').innerHTML=`<div class="conflict"><strong>พบ Sync Conflict</strong><p>ข้อมูลบนอุปกรณ์และ Cloud ถูกแก้หลังการ sync ครั้งล่าสุด ระบบจึงไม่เขียนทับอัตโนมัติ</p><div class="sync-actions"><button class="secondary" onclick="resolveConflict('local')">ใช้อุปกรณ์นี้ → Cloud</button><button class="secondary" onclick="resolveConflict('cloud')">ใช้ Cloud → อุปกรณ์นี้</button></div></div>`;
}
window.resolveConflict=async choice=>{
 try{
   if(choice==='local')await pushCloud(true);else await pullCloud(true);
   if(id('conflictBox'))id('conflictBox').innerHTML='<div class="flag ok">แก้ conflict แล้ว</div>';
 }catch(e){alert(e.message)}
};
async function cloudAction(fn){
 try{if(id('conflictBox'))id('conflictBox').innerHTML='';await fn()}
 catch(err){if(err.code==='SYNC_CONFLICT')showConflict(err);else{logSync('error',err.message);alert('Cloud: '+err.message)}}
}
function renderSyncHistory(){
 if(!id('syncHistory'))return;
 const h=db.sync.history||[];
 id('syncHistory').innerHTML=h.length?h.map(x=>`<div class="sync-log ${x.type==='error'?'error':'ok'}"><strong>${esc(x.message)}</strong><small>${fmtDate(x.date)}</small></div>`).join(''):'<p class="muted">ยังไม่มีประวัติ sync</p>';
}
function renderCloudState(){
 const cfg=effectiveCloudConfig(), signed=!!sbSession?.user;
 if(id('supabaseUrl'))id('supabaseUrl').value=cfg?.url||'';
 if(id('supabaseKey'))id('supabaseKey').value=cfg?.key||'';
 if(id('cloudConnection'))id('cloudConnection').textContent=!cfg?'Not configured':sb?(signed?'Connected + signed in':'Connected • sign in required'):'Config saved';
 if(id('cloudBadge'))id('cloudBadge').textContent=signed?'Cloud ready':cfg?'Configured':'Local only';
 if(id('authSignedOut'))id('authSignedOut').style.display=signed?'none':'block';
 if(id('authSignedIn'))id('authSignedIn').style.display=signed?'block':'none';
 if(signed){if(id('signedEmail'))id('signedEmail').textContent=sbSession.user.email||'Signed in';if(id('signedUserId'))id('signedUserId').textContent=sbSession.user.id}
 if(id('lastSync'))id('lastSync').textContent=db.sync.lastSyncAt?fmtDate(db.sync.lastSyncAt):'Never';
 if(id('cloudRevision'))id('cloudRevision').textContent=db.sync.revision||'—';
 if(id('syncState'))id('syncState').textContent=signed?'Supabase sync':'Local only';
 renderSyncHistory();
}
if(id('supabaseConfigForm'))id('supabaseConfigForm').onsubmit=async e=>{
 e.preventDefault();
 const cfg={url:id('supabaseUrl').value.trim().replace(/\/$/,''),key:id('supabaseKey').value.trim()};
 if(!cfg.url||!cfg.key)return alert('กรุณาใส่ URL และ key');
 setCloudConfig(cfg,id('rememberCloudConfig').checked);
 await initSupabase();
 logSync('ok','บันทึก Supabase configuration แล้ว');
};
if(id('magicLinkForm'))id('magicLinkForm').onsubmit=e=>{
 e.preventDefault();cloudAction(async()=>{await sendMagicLink(id('authEmail').value.trim());logSync('ok','ส่ง Magic Link / OTP แล้ว');alert('ตรวจอีเมลเพื่อเข้าสู่ระบบ')})
};
if(id('signOutBtn'))id('signOutBtn').onclick=()=>cloudAction(signOutCloud);
if(id('syncNowBtn'))id('syncNowBtn').onclick=()=>cloudAction(syncNow);
if(id('pushCloudBtn'))id('pushCloudBtn').onclick=()=>cloudAction(()=>pushCloud(false));
if(id('pullCloudBtn'))id('pullCloudBtn').onclick=()=>cloudAction(()=>pullCloud(false));

const __renderAllV5=renderAll;
renderAll=function(){__renderAllV5();renderCloudState()};
initSupabase().then(()=>renderCloudState());


// ---------- v6 Health Analysis Engine ----------
db.analysis=db.analysis||{lastRunAt:null};db.sync=db.sync||{};
function cleanName(s){return String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
function numericValue(v){const s=String(v??'').replace(/,/g,'').trim(),m=s.match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null}
function inferCategory(name){const n=cleanName(name);if(/hba1c|glucose|น้ำตาล|fasting sugar/.test(n))return'glucose';if(/chol|ldl|hdl|trig|ไขมัน|non hdl/.test(n))return'lipid';if(/creatin|egfr|acr|albumin creatinine|urea|ไต/.test(n))return'kidney';if(/alt|ast|alp|bilirubin|ggt|ตับ/.test(n))return'liver';if(/haemoglobin|hemoglobin|wbc|rbc|platelet|cbc|mcv|mch|เลือด/.test(n))return'blood';return'other'}
function refFromText(text){const t=String(text||'').replace(/,/g,'').trim();let m=t.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)/i);if(m)return{mode:'range',low:+m[1],high:+m[2]};m=t.match(/(?:<|≤|<=)\s*(-?\d+(?:\.\d+)?)/);if(m)return{mode:'max',high:+m[1],low:null};m=t.match(/(?:>|≥|>=)\s*(-?\d+(?:\.\d+)?)/);if(m)return{mode:'min',low:+m[1],high:null};return null}
function structuredRef(l){if(l.refMode&&l.refMode!=='none'&&(l.refLow!=null||l.refHigh!=null))return{mode:l.refMode,low:l.refLow,high:l.refHigh,source:'structured'};const p=refFromText(l.range);return p?{...p,source:'text'}:null}
function compareRef(value,ref){if(value==null||!ref)return null;if(ref.mode==='range'){if(ref.low!=null&&value<ref.low)return'low';if(ref.high!=null&&value>ref.high)return'high';return'normal'}if(ref.mode==='max')return ref.high!=null&&value>ref.high?'high':'normal';if(ref.mode==='min')return ref.low!=null&&value<ref.low?'low':'normal';return null}
function unitNorm(u){return String(u||'').toLowerCase().replace(/\s/g,'')}
function evidenceRule(lab,value){const n=cleanName(lab.name),u=unitNorm(lab.unit);if(/hba1c|glycated haemoglobin|glycated hemoglobin/.test(n)){if(u.includes('mmol/mol')&&value!=null){if(value>=48)return{state:'high',severity:'warn',label:'อยู่ในช่วงเกณฑ์ที่ใช้ประเมินเบาหวาน',note:'ควรให้แพทย์ตีความและยืนยันตามบริบท/การตรวจซ้ำ โดยเฉพาะถ้าไม่มีอาการ',evidence:'HbA1c ≥48 mmol/mol'};if(value>=42)return{state:'high',severity:'warn',label:'ความเสี่ยงเบาหวานเพิ่มขึ้น',note:'ช่วง 42–47 mmol/mol ใช้ระบุความเสี่ยงเพิ่มขึ้นในแนวทาง UK',evidence:'HbA1c 42–47 mmol/mol'};return{state:'normal',severity:'ok',label:'ต่ำกว่า 42 mmol/mol',note:'ต่ำกว่าช่วง increased-risk ตามเกณฑ์ UK',evidence:'HbA1c <42 mmol/mol'}}if((u==='%'||u.includes('percent'))&&value!=null){if(value>=6.5)return{state:'high',severity:'warn',label:'อยู่ในช่วงเกณฑ์ที่ใช้ประเมินเบาหวาน',note:'ควรให้แพทย์ตีความและยืนยัน',evidence:'HbA1c ≥6.5%'};if(value>=6.0)return{state:'high',severity:'warn',label:'ความเสี่ยงเบาหวานเพิ่มขึ้น',note:'ช่วง 6.0–6.4% สอดคล้องกับ increased-risk range',evidence:'HbA1c 6.0–6.4%'};return{state:'normal',severity:'ok',label:'ต่ำกว่า 6.0%',note:'ต่ำกว่าช่วง increased-risk',evidence:'HbA1c <6.0%'}}}
if(/total cholesterol|cholesterol total|^cholesterol$|คอเลสเตอรอลรวม/.test(n)&&u==='mmol/l'&&value!=null)return value<5?{state:'normal',severity:'ok',label:'ต่ำกว่า 5 mmol/L',note:'อยู่ต่ำกว่า healthy guide ของ NHS สำหรับ total cholesterol',evidence:'NHS healthy guide <5 mmol/L'}:{state:'high',severity:'warn',label:'≥5 mmol/L',note:'สูงกว่า healthy guide ทั่วไป; เป้าหมายส่วนบุคคลขึ้นกับความเสี่ยงและการรักษา',evidence:'NHS healthy guide <5 mmol/L'};
if(/non hdl/.test(n)&&u==='mmol/l'&&value!=null)return value<4?{state:'normal',severity:'ok',label:'ต่ำกว่า 4 mmol/L',note:'ต่ำกว่า healthy guide ทั่วไป',evidence:'NHS non-HDL guide <4 mmol/L'}:{state:'high',severity:'warn',label:'≥4 mmol/L',note:'สูงกว่า healthy guide ทั่วไป',evidence:'NHS non-HDL guide <4 mmol/L'};
if(/\begfr\b|estimated glomerular/.test(n)&&value!=null&&value<60)return{state:'low',severity:'warn',label:'eGFR <60',note:'ควรประเมินร่วมกับ ACR และความต่อเนื่องของผล; ค่าเดียวไม่เพียงพอสำหรับสรุป CKD',evidence:'NICE CKD assessment uses eGFR + ACR/persistence'};return null}
function testKey(l){return cleanName(l.name)+'|'+unitNorm(l.unit)}
function historyFor(l){return db.labs.filter(x=>testKey(x)===testKey(l)).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)))}
function trendFor(l){const h=historyFor(l).filter(x=>numericValue(x.value)!=null);if(h.length<2)return{direction:'insufficient',delta:null,count:h.length};const a=numericValue(h[h.length-2].value),b=numericValue(h[h.length-1].value),delta=b-a,tol=Math.max(Math.abs(a)*0.02,0.001);return{direction:Math.abs(delta)<=tol?'stable':delta>0?'up':'down',delta,count:h.length}}
function analyseLab(lab){const value=numericValue(lab.value),ref=structuredRef(lab),refState=compareRef(value,ref),rule=evidenceRule(lab,value),trend=trendFor(lab);let state=refState||rule?.state||'unknown',severity='info',label='',note='';if(refState){severity=refState==='normal'?'ok':'warn';label=refState==='normal'?'อยู่ในช่วงอ้างอิงของแล็บ':refState==='high'?'สูงกว่าช่วงอ้างอิงของแล็บ':'ต่ำกว่าช่วงอ้างอิงของแล็บ';note='ใช้ช่วงอ้างอิงที่บันทึกจากใบแล็บเป็นหลัก'}else if(rule){severity=rule.severity;label=rule.label;note=rule.note}else{label=value==null?'ค่าไม่ใช่ตัวเลขสำหรับวิเคราะห์อัตโนมัติ':'ยังไม่มีช่วงอ้างอิงที่ใช้เปรียบเทียบ';note='เพิ่ม reference range จากใบแล็บเพื่อให้วิเคราะห์ได้แม่นยำขึ้น'}return{lab,value,ref,state,severity,label,note,rule,trend,category:lab.category&&lab.category!=='auto'?lab.category:inferCategory(lab.name)}}
function latestByTest(){const map=new Map();db.labs.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).forEach(l=>map.set(testKey(l),l));return[...map.values()].map(analyseLab)}
function bpAnalysis(){const bp7=db.bp.filter(x=>withinDays(x.date,7));if(!bp7.length)return{state:'unknown',text:'ยังไม่มีความดันใน 7 วัน'};const s=mean(bp7.map(x=>x.sys)),d=mean(bp7.map(x=>x.dia));return s>=135||d>=85?{state:'warn',text:`ค่าเฉลี่ยความดันที่บ้าน 7 วัน ${s.toFixed(0)}/${d.toFixed(0)} mmHg สูงกว่า/เท่ากับเกณฑ์ 135/85 ที่ NHS ใช้พิจารณาว่าสูงเมื่อวัดที่บ้าน`}:{state:'ok',text:`ค่าเฉลี่ยความดันที่บ้าน 7 วัน ${s.toFixed(0)}/${d.toFixed(0)} mmHg ต่ำกว่า 135/85`}}
function analysisPriorities(){const out=[],labs=latestByTest();labs.filter(x=>x.state==='high'||x.state==='low').forEach(x=>out.push({level:x.severity==='critical'?'critical':'warn',text:`${x.lab.name}: ${x.lab.value} ${x.lab.unit||''} — ${x.label}`,date:x.lab.date}));const bp=bpAnalysis();if(bp.state==='warn')out.push({level:'warn',text:bp.text,date:new Date().toISOString()});if(!out.length)out.push({level:'ok',text:'ยังไม่พบค่าล่าสุดที่ถูก flag จากข้อมูลและช่วงอ้างอิงที่บันทึกไว้',date:new Date().toISOString()});return out}
function refText(a){const r=a.ref;if(!r)return a.lab.range||'ไม่ได้บันทึก';if(r.mode==='range')return`${r.low??'–'} – ${r.high??'–'}`;if(r.mode==='max')return`≤ ${r.high}`;if(r.mode==='min')return`≥ ${r.low}`;return a.lab.range||'—'}
function trendText(t){if(t.direction==='insufficient')return'ยังมีข้อมูลไม่พอสำหรับแนวโน้ม';if(t.direction==='stable')return`ค่อนข้างคงที่ (${t.count} ครั้ง)`;return`${t.direction==='up'?'เพิ่มขึ้น':'ลดลง'} ${Math.abs(t.delta).toFixed(2)} จากครั้งก่อน`}
function renderAnalysis(){db.analysis.lastRunAt=new Date().toISOString();const all=latestByTest(),filter=id('analysisCategoryFilter')?.value||'all',shown=filter==='all'?all:all.filter(x=>x.category===filter),pr=analysisPriorities(),attention=pr.filter(x=>x.level!=='ok').length;if(id('attentionCount'))id('attentionCount').textContent=attention;if(id('analysisBadge')){id('analysisBadge').textContent=attention?'มีประเด็นควรติดตาม':'ยังไม่พบ flag สำคัญ';id('analysisBadge').className='badge '+(attention?'warn':'ok')}if(id('analysisPriorities'))id('analysisPriorities').innerHTML=pr.map(x=>`<div class="priority-row ${x.level}">${esc(x.text)}</div>`).join('');if(id('systemOverview')){const b=bpAnalysis(),lastW=db.weights.at(-1),bm=lastW&&db.profile.height?bmi(lastW.value,db.profile.height):null;id('systemOverview').innerHTML=`<div class="system-item"><strong>ความดัน</strong><small>${esc(b.text)}</small></div><div class="system-item"><strong>น้ำหนัก / BMI</strong><small>${lastW?lastW.value.toFixed(1)+' kg'+(bm?' • BMI '+bm.toFixed(1):''):'ยังไม่มีข้อมูล'}</small></div><div class="system-item"><strong>ผลตรวจ</strong><small>${db.labs.length} รายการ • ${all.length} ชนิดการตรวจ</small></div><div class="system-item"><strong>กิจกรรม 7 วัน</strong><small>${weekMinutes()} / ${db.profile.weeklyGoal||150} นาทีตามเป้าที่ตั้งไว้</small></div>`}if(id('labAnalysisList'))id('labAnalysisList').innerHTML=shown.length?shown.sort((a,b)=>String(b.lab.date).localeCompare(String(a.lab.date))).map(a=>{const cls=a.state==='normal'?'normal':a.state==='unknown'?'unknown':a.severity==='critical'?'critical':a.state,stateCls=a.state==='normal'?'state-normal':a.state==='unknown'?'state-unknown':a.severity==='critical'?'state-critical':'state-warn';return`<div class="lab-result-card ${cls}"><div class="lab-main"><strong>${esc(a.lab.name)}</strong><div class="lab-meta">${esc(a.lab.date)} • Ref: ${esc(refText(a))} ${esc(a.lab.unit||'')}<br>${esc(a.note)}<br>Trend: ${esc(trendText(a.trend))}</div><span class="lab-state ${stateCls}">${esc(a.label)}</span>${a.rule?.evidence?`<div class="evidence-note">${esc(a.rule.evidence)}</div>`:''}</div><div class="lab-value">${esc(a.lab.value)} <small>${esc(a.lab.unit||'')}</small></div></div>`}).join(''):'<p class="muted">ยังไม่มีผลตรวจในกลุ่มนี้</p>';renderTrendSelector(all);renderClinicalReview(all)}
function renderTrendSelector(all){if(!id('trendTestSelect'))return;const prev=id('trendTestSelect').value;id('trendTestSelect').innerHTML=all.length?all.map(a=>`<option value="${esc(testKey(a.lab))}">${esc(a.lab.name)} (${esc(a.lab.unit||'')})</option>`).join(''):'<option>ยังไม่มีข้อมูล</option>';if(prev&&[...id('trendTestSelect').options].some(o=>o.value===prev))id('trendTestSelect').value=prev;drawLabTrend()}
function drawLabTrend(){if(!id('labTrendChart'))return;const key=id('trendTestSelect')?.value,items=db.labs.filter(l=>testKey(l)===key&&numericValue(l.value)!=null).sort((a,b)=>String(a.date).localeCompare(String(b.date))),c=id('labTrendChart'),ctx=c.getContext('2d'),W=c.width,H=c.height,p=45;ctx.clearRect(0,0,W,H);ctx.strokeStyle='#dbe5e5';for(let i=0;i<5;i++){const y=p+(H-2*p)*i/4;ctx.beginPath();ctx.moveTo(p,y);ctx.lineTo(W-p,y);ctx.stroke()}if(!items.length){ctx.fillStyle='#789';ctx.font='18px sans-serif';ctx.fillText('ยังไม่มีข้อมูลแนวโน้ม',p,H/2);if(id('trendNarrative'))id('trendNarrative').textContent='';return}const vals=items.map(x=>numericValue(x.value)),min0=Math.min(...vals),max0=Math.max(...vals),pad=Math.max((max0-min0)*.15,Math.abs(max0)*.05,.1),min=min0-pad,max=max0+pad;ctx.strokeStyle='#0f766e';ctx.lineWidth=4;ctx.beginPath();items.forEach((x,i)=>{const xx=p+(W-2*p)*(items.length===1?.5:i/(items.length-1)),v=numericValue(x.value),yy=H-p-(v-min)/(max-min)*(H-2*p);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);ctx.fillStyle='#0f766e';ctx.fillRect(xx-4,yy-4,8,8)});ctx.stroke();const t=trendFor(items.at(-1));if(id('trendNarrative'))id('trendNarrative').textContent=`${items.at(-1).name}: ${trendText(t)} • ใช้ ${items.length} ผลตรวจที่มีหน่วยเดียวกัน`}
function renderClinicalReview(all){if(!id('clinicalReviewSummary'))return;const abnormal=all.filter(a=>a.state==='high'||a.state==='low'),bp=bpAnalysis();id('clinicalReviewSummary').innerHTML=`<div class="review-block"><strong>ประเด็นติดตาม</strong><br>${abnormal.length?abnormal.map(a=>`${esc(a.lab.name)} ${esc(a.lab.value)} ${esc(a.lab.unit||'')} (${esc(a.label)})`).join('<br>'):'ไม่มี lab flag จากข้อมูลล่าสุดที่บันทึก'}</div><div class="review-block"><strong>ความดัน</strong><br>${esc(bp.text)}</div><div class="review-block"><strong>คำถามสำหรับแพทย์</strong><br>• ผลที่ถูก flag ต้องตรวจซ้ำเมื่อใด?<br>• ต้องประเมินร่วมกับยา/โรคประจำตัวหรือผลตรวจอื่นหรือไม่?<br>• เป้าหมายส่วนบุคคลของผลตรวจและความดันควรเป็นเท่าใด?</div><div class="review-block muted">สรุปจากข้อมูลที่ผู้ใช้บันทึก ณ ${new Date().toLocaleString('th-TH')} • ไม่ใช่การวินิจฉัย</div>`}
if(id('analysisCategoryFilter'))id('analysisCategoryFilter').onchange=renderAnalysis;if(id('reanalyseBtn'))id('reanalyseBtn').onclick=renderAnalysis;if(id('trendTestSelect'))id('trendTestSelect').onchange=drawLabTrend;if(id('copyReviewBtn'))id('copyReviewBtn').onclick=async()=>{const txt=id('clinicalReviewSummary')?.innerText||'';try{await navigator.clipboard.writeText(txt);alert('Copy Clinical Review Summary แล้ว')}catch{alert('ไม่สามารถ Copy อัตโนมัติได้')}};
if(id('labCsvFile'))id('labCsvFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const text=await f.text(),lines=text.trim().split(/\r?\n/);if(lines.length<2)throw new Error('CSV ไม่มีข้อมูล');const parseLine=line=>{const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(ch===','&&!q){out.push(cur.trim());cur=''}else cur+=ch}out.push(cur.trim());return out};const head=parseLine(lines[0]).map(x=>x.toLowerCase()),idx=x=>head.indexOf(x);if(!['name','value','date'].every(x=>head.includes(x)))throw new Error('ต้องมีคอลัมน์ name,value,date');let added=0;for(const line of lines.slice(1)){const c=parseLine(line);if(!c[idx('name')]||!c[idx('value')]||!c[idx('date')])continue;const get=k=>idx(k)>=0?c[idx(k)]:'';db.labs.push({id:Date.now()+added,name:get('name'),value:get('value'),unit:get('unit'),date:get('date'),range:get('range'),refLow:get('ref_low')!==''?+get('ref_low'):null,refHigh:get('ref_high')!==''?+get('ref_high'):null,refMode:get('ref_mode')||'none',category:get('category')||'auto'});added++}save();renderAnalysis();alert(`นำเข้า Lab CSV สำเร็จ ${added} รายการ`)}catch(err){alert('นำเข้า CSV ไม่สำเร็จ: '+err.message)}};
function healthCore(){return{profile:db.profile,bp:db.bp,weights:db.weights,activities:db.activities,meds:db.meds,labs:db.labs,medTaken:db.medTaken,reminders:db.reminders}}
function simpleHash(obj){const s=JSON.stringify(obj);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
function dataHashOf(payload){if(!payload)return'';return simpleHash({profile:payload.profile,bp:payload.bp,weights:payload.weights,activities:payload.activities,meds:payload.meds,labs:payload.labs,medTaken:payload.medTaken,reminders:payload.reminders})}
const _syncNowV5=syncNow;syncNow=async function(){const cloud=await fetchCloudRow();if(!cloud)return pushCloud();const localHash=simpleHash(healthCore()),cloudHash=dataHashOf(cloud.payload);if(localHash===cloudHash){db.sync.mode='supabase';db.sync.lastSyncAt=nowIso();db.sync.lastCloudUpdatedAt=cloud.updated_at;db.sync.lastSyncedLocalUpdatedAt=localUpdatedAt();db.sync.revision=cloud.revision||db.sync.revision;localStorage.setItem(KEY,JSON.stringify(db));logSync('ok','Smart Sync: ไม่มีข้อมูลสุขภาพเปลี่ยน • ไม่เพิ่ม revision');renderCloudState();return cloud}return _syncNowV5()};
const __renderAllV6=renderAll;renderAll=function(){__renderAllV6();renderAnalysis()};renderAll();

window.db=db;
