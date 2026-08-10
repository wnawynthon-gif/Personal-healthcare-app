const KEY='healthcare_v5';
const OLD='healthcare_v4';
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
 e.preventDefault();db.labs.push({id:Date.now(),name:id('labName').value,value:id('labValue').value,unit:id('labUnit').value,date:id('labDate').value,range:id('labRange').value});e.target.reset();id('labDate').valueAsDate=new Date();save()
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
 <p class="muted">Generated by Personal Healthcare v5 from user-entered data. This summary is not a diagnosis and does not replace the original laboratory report or clinician medication list.</p>`;
}
id('printBtn').onclick=()=>window.print();
id('exportBtn').onclick=()=>{
 const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='personal-health-data-v5.json';a.click();URL.revokeObjectURL(a.href)
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
 app:'Personal Healthcare',version:5,exportedAt:new Date().toISOString(),schemaVersion:5,data:db
},'personal-healthcare-v5-backup.json');

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
 localStorage.setItem('healthcare_v3_meta',JSON.stringify({updatedAt:new Date().toISOString(),schemaVersion:5,deviceId:localStorage.getItem('healthcare_device_id')||''}))
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
    updatedAt:nowIso(),schemaVersion:5,deviceId:localStorage.getItem('healthcare_device_id')||''
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
    schema_version:5,
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

window.db=db;
