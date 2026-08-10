const KEY='healthcare_v62';
const OLD='healthcare_v6';
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
 const visibleLabs=db.labs.filter(l=>l.importStatus!=='needs-review'&&l.importStatus!=='rejected'); const quarantinedLabs=db.labs.length-visibleLabs.length; id('labList').innerHTML=(visibleLabs.length?visibleLabs.slice().reverse().map(l=>`<div class="item"><div><strong>${l.name}: ${l.value} ${l.unit||''}</strong><small>${l.date}${l.range?' • '+l.range:''}</small></div><button class="delete" onclick="delLab(${l.id})">ลบ</button></div>`).join(''):'<p class="muted">ยังไม่มีผลตรวจที่ยืนยันแล้ว</p>')+(quarantinedLabs?`<p class="muted">กักกันข้อมูลนำเข้าที่ไม่น่าเชื่อถือ ${quarantinedLabs} รายการ — ไม่ใช้ในการวิเคราะห์/Doctor Report</p>`:'');
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
 const meds=db.meds.filter(x=>x.active),labs=db.labs.filter(l=>l.importStatus!=='needs-review'&&l.importStatus!=='rejected').slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,12);
 id('doctorReport').innerHTML=`
 <h3>Profile</h3><p><strong>Height:</strong> ${p.height||'—'} cm &nbsp; <strong>Latest weight:</strong> ${lastW?lastW.value.toFixed(1)+' kg':'—'} &nbsp; <strong>BMI:</strong> ${lastW?bmi(lastW.value,p.height).toFixed(1):'—'}</p>
 <p><strong>Conditions / limitations:</strong> ${p.conditions||'Not recorded'}<br><strong>Drug allergies:</strong> ${p.allergies||'Not recorded'}</p>
 <h3>Blood pressure — last 30 days</h3><p>${bp30.length?`${bp30.length} readings • Average ${avgS.toFixed(1)}/${avgD.toFixed(1)} mmHg`:'No readings recorded.'}</p>
 <table class="doctor-table"><tr><th>Date</th><th>BP</th><th>Pulse</th><th>Note</th></tr>${bp30.slice(-10).reverse().map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${x.sys}/${x.dia}</td><td>${x.pulse||'—'}</td><td>${x.note||''}</td></tr>`).join('')}</table>
 <h3>Current medication list</h3>${meds.length?`<table class="doctor-table"><tr><th>Medicine</th><th>Dose</th><th>Time</th><th>Note</th></tr>${meds.map(m=>`<tr><td>${m.name}</td><td>${m.dose}</td><td>${m.time}</td><td>${m.note||''}</td></tr>`).join('')}</table>`:'<p>No medication recorded.</p>'}
 <h3>Recent laboratory / health check results</h3>${labs.length?`<table class="doctor-table"><tr><th>Date</th><th>Test</th><th>Result</th><th>Reference / note</th></tr>${labs.map(l=>`<tr><td>${l.date}</td><td>${l.name}</td><td>${l.value} ${l.unit||''}</td><td>${l.range||''}</td></tr>`).join('')}</table>`:'<p>No laboratory results recorded.</p>'}
 <h3>Activity</h3><p>Recorded activity in last 7 days: <strong>${weekMinutes()} minutes</strong>. User-set weekly goal: ${p.weeklyGoal||0} minutes.</p>
 <p class="muted">Generated by Personal Healthcare v6.6 from user-entered data. This summary is not a diagnosis and does not replace the original laboratory report or clinician medication list.</p>`;
}
id('printBtn').onclick=()=>window.print();
id('exportBtn').onclick=()=>{
 const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='personal-health-data-v6.2.json';a.click();URL.revokeObjectURL(a.href)
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
 app:'Personal Healthcare',version:62,exportedAt:new Date().toISOString(),schemaVersion:62,data:db
},'personal-healthcare-v6.2-backup.json');

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
 localStorage.setItem('healthcare_v3_meta',JSON.stringify({updatedAt:new Date().toISOString(),schemaVersion:62,deviceId:localStorage.getItem('healthcare_device_id')||''}))
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
 const quarantined=db.labs.filter(l=>l.importStatus==='needs-review'||l.importStatus==='rejected');
 if(quarantined.length) issues.push({level:'medium',text:`กักกันผลตรวจจาก OCR ${quarantined.length} รายการ และไม่นำไปใช้วิเคราะห์จนกว่าจะยืนยันใหม่`});
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
    updatedAt:nowIso(),schemaVersion:62,deviceId:localStorage.getItem('healthcare_device_id')||''
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
    schema_version:622,
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
function latestByTest(){const map=new Map();db.labs.filter(l=>l.importStatus!=='needs-review').slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).forEach(l=>map.set(testKey(l),l));return[...map.values()].map(analyseLab)}
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


// ---------- v6.2 Image/PDF Lab Import ----------
let docImportState={file:null,text:'',rows:[],worker:null};
function setOcrProgress(label,pct){
 const wrap=id('ocrProgressWrap'); if(wrap)wrap.style.display='block';
 if(id('ocrStatus'))id('ocrStatus').textContent=label;
 const p=Math.max(0,Math.min(100,Math.round(pct||0)));
 if(id('ocrPercent'))id('ocrPercent').textContent=p+'%';
 if(id('ocrProgressBar'))id('ocrProgressBar').style.width=p+'%';
}
function resetDocImport(){
 docImportState={file:null,text:'',rows:[],worker:null};
 if(id('labDocFile'))id('labDocFile').value='';
 if(id('labDocPreview'))id('labDocPreview').innerHTML='<div class="muted">ยังไม่ได้เลือกไฟล์</div>';
 if(id('ocrProgressWrap'))id('ocrProgressWrap').style.display='none';
 if(id('ocrResultArea'))id('ocrResultArea').style.display='none';
 if(id('ocrRawText'))id('ocrRawText').value='';
 renderDetectedRows();
}
function filePreview(file){
 const p=id('labDocPreview');if(!p)return;
 if(file.type.startsWith('image/')){
   const url=URL.createObjectURL(file);
   p.innerHTML=`<img src="${url}" alt="Lab document preview">`;
 }else{
   p.innerHTML=`<div class="pdf-preview"><strong>📄 ${esc(file.name)}</strong><small>${(file.size/1024/1024).toFixed(2)} MB • PDF</small><small class="muted">ระบบจะลองอ่านข้อความใน PDF ก่อน และใช้ OCR ถ้าเป็นไฟล์สแกน</small></div>`;
 }
}
async function loadPdfJs(){
 if(window.__pdfjs)return window.__pdfjs;
 const lib=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.mjs');
 lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.worker.mjs';
 window.__pdfjs=lib;return lib;
}
async function getOcrWorker(){
 if(docImportState.worker)return docImportState.worker;
 if(!window.Tesseract?.createWorker)throw new Error('OCR library โหลดไม่สำเร็จ (Tesseract.js unavailable) กรุณาตรวจอินเทอร์เน็ตแล้ว Reload');
 const opts={
   workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/worker.min.js',
   corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',
   langPath:'https://tessdata.projectnaptha.com/4.0.0',
   logger:m=>{
     if(m.status==='recognizing text')setOcrProgress('กำลัง OCR…',(m.progress||0)*100);
     else if(m.status)setOcrProgress('OCR: '+m.status,Math.max(5,(m.progress||0)*100));
   }
 };
 // Safari/iPad can fail while loading multiple language packs. Try TH+EN first,
 // then fall back to English so numeric laboratory results remain usable.
 try{
   setOcrProgress('กำลังเตรียม OCR ภาษาไทย + อังกฤษ…',5);
   docImportState.worker=await Tesseract.createWorker(['eng','tha'],1,opts);
 }catch(firstErr){
   console.warn('Thai+English OCR init failed; retrying English only',firstErr);
   setOcrProgress('กำลังลอง OCR ภาษาอังกฤษสำรอง…',5);
   try{ docImportState.worker=await Tesseract.createWorker('eng',1,opts); }
   catch(secondErr){ throw new Error('เริ่ม OCR ไม่สำเร็จ: '+(secondErr?.message||firstErr?.message||'unknown OCR error')); }
 }
 return docImportState.worker;
}
async function ocrImageSource(source){
 const worker=await getOcrWorker();
 const {data:{text}}=await worker.recognize(source);
 return text||'';
}
async function extractPdf(file){
 setOcrProgress('กำลังเปิด PDF…',5);
 const pdfjs=await loadPdfJs(),bytes=new Uint8Array(await file.arrayBuffer());
 const pdf=await pdfjs.getDocument({data:bytes}).promise;
 let textParts=[], canvases=[];
 const maxPages=Math.min(pdf.numPages,12);
 for(let i=1;i<=maxPages;i++){
   setOcrProgress(`กำลังอ่านข้อความ PDF หน้า ${i}/${maxPages}`,5+40*(i/maxPages));
   const page=await pdf.getPage(i),tc=await page.getTextContent();
   const txt=tc.items.map(x=>x.str).join(' ').replace(/\s+/g,' ').trim();
   if(txt.length>35){textParts.push(`--- Page ${i} ---\n${txt}`);continue}
   const viewport=page.getViewport({scale:1.8}),canvas=document.createElement('canvas');
   canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);
   await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   canvases.push({page:i,canvas});
 }
 if(canvases.length){
   for(let j=0;j<canvases.length;j++){
     const x=canvases[j];setOcrProgress(`OCR PDF หน้า ${x.page} (${j+1}/${canvases.length})`,45+50*((j+1)/canvases.length));
     const txt=await ocrImageSource(x.canvas);
     textParts.push(`--- Page ${x.page} OCR ---\n${txt}`);
   }
 }
 return textParts.join('\n\n');
}
function normalizeOcrText(t){
 return String(t||'')
   .replace(/[|¦]/g,' ')
   .replace(/[ \t]+/g,' ')
   .replace(/\r/g,'')
   .replace(/\n{3,}/g,'\n\n')
   .trim();
}
const UNIT_RX='(?:mmol\\/L|mmol\\/l|mg\\/dL|mg\\/dl|g\\/dL|g\\/L|U\\/L|IU\\/L|µmol\\/L|umol\\/L|mL\\/min\\/1\\.73m2|%|mmol\\/mol|10\\^?9\\/L|10\\^?12\\/L|pg|fL|ng\\/mL|mIU\\/L|µIU\\/mL)';
function detectLabRowsFromText(text){
 const lines=normalizeOcrText(text).split(/\n+/).map(x=>x.trim()).filter(Boolean);
 const rows=[],seen=new Set(),today=new Date().toISOString().slice(0,10);
 const refRange=/(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)/i;
 const valUnit=new RegExp('(-?\\d+(?:\\.\\d+)?)\\s*('+UNIT_RX+')?','i');
 for(let raw of lines){
   let line=raw.replace(/\s{2,}/g,' ').trim();
   if(line.length<3||line.length>180)continue;
   const m=line.match(valUnit);if(!m)continue;
   const value=m[1],unit=m[2]||'';
   const before=line.slice(0,m.index).replace(/[:;•]+$/,'').trim();
   if(before.length<2||/^(page|date|dob|age|sex|time|patient|reference|range|result)$/i.test(before))continue;
   // Avoid dates and IDs misread as labs.
   if(/^\d/.test(before)||/\b(?:19|20)\d{2}\b/.test(before))continue;
   let low=null,high=null,mode='none',range='';
   const after=line.slice((m.index||0)+m[0].length);
   const rr=after.match(refRange);
   if(rr){low=+rr[1];high=+rr[2];mode='range';range=`${rr[1]}-${rr[2]}`}
   else{
     const mx=after.match(/[<≤]\s*(-?\d+(?:\.\d+)?)/);const mn=after.match(/[>≥]\s*(-?\d+(?:\.\d+)?)/);
     if(mx){high=+mx[1];mode='max';range=`<${mx[1]}`}
     else if(mn){low=+mn[1];mode='min';range=`>${mn[1]}`}
   }
   const name=before.replace(/^[^\p{L}]+/gu,'').trim();
   const key=(name+'|'+value+'|'+unit).toLowerCase();if(seen.has(key))continue;seen.add(key);
   rows.push({selected:true,name,value,unit,date:today,range,refLow:low,refHigh:high,refMode:mode,category:'auto'});
 }
 return rows.slice(0,80);
}
function renderDetectedRows(){
 const host=id('detectedLabRows');if(!host)return;
 const rows=docImportState.rows||[];
 if(id('detectedCount'))id('detectedCount').textContent=rows.length+' รายการ';
 if(id('confirmDetectedLabsBtn'))id('confirmDetectedLabsBtn').disabled=!rows.some(r=>r.selected);
 if(!rows.length){host.innerHTML='<p class="muted">ยังไม่พบรายการอัตโนมัติ คุณสามารถแก้ข้อความด้านบนแล้วกด “ตรวจหารายการผลตรวจ” อีกครั้ง</p>';return}
 host.innerHTML=`<div class="detect-row detect-head"><div>เลือก</div><div>รายการ</div><div>ค่า</div><div>หน่วย</div><div>วันที่</div><div></div></div>`+
 rows.map((r,i)=>`<div class="detect-row" data-i="${i}">
   <input type="checkbox" ${r.selected?'checked':''} onchange="docImportState.rows[${i}].selected=this.checked;renderDetectedRows()">
   <input value="${esc(r.name)}" oninput="docImportState.rows[${i}].name=this.value" placeholder="รายการตรวจ">
   <input value="${esc(r.value)}" oninput="docImportState.rows[${i}].value=this.value" placeholder="ค่า">
   <input class="detect-unit" value="${esc(r.unit)}" oninput="docImportState.rows[${i}].unit=this.value" placeholder="หน่วย">
   <input class="detect-date" type="date" value="${esc(r.date)}" oninput="docImportState.rows[${i}].date=this.value">
   <button class="remove-detect" onclick="docImportState.rows.splice(${i},1);renderDetectedRows()" type="button">ลบ</button>
   ${r.qualityReason?`<div class="detect-quality ${r.confidence==='low'?'bad':'warn'}"><strong>${r.confidence==='low'?'ต้องตรวจสอบ':'OCR ต้องยืนยัน'}</strong> • ${esc(r.qualityReason)}</div>`:''}
   <div class="detect-ref">
     <input type="number" step="any" value="${r.refLow??''}" oninput="docImportState.rows[${i}].refLow=this.value===''?null:+this.value" placeholder="Ref ต่ำสุด">
     <input type="number" step="any" value="${r.refHigh??''}" oninput="docImportState.rows[${i}].refHigh=this.value===''?null:+this.value" placeholder="Ref สูงสุด">
     <select onchange="docImportState.rows[${i}].refMode=this.value">
       <option value="none" ${r.refMode==='none'?'selected':''}>ไม่มี structured range</option>
       <option value="range" ${r.refMode==='range'?'selected':''}>Low–High</option>
       <option value="max" ${r.refMode==='max'?'selected':''}>≤ High</option>
       <option value="min" ${r.refMode==='min'?'selected':''}>≥ Low</option>
     </select>
   </div>
 </div>`).join('');
}
async function processLabDocument(file){
 docImportState.file=file;filePreview(file);
 if(id('ocrResultArea'))id('ocrResultArea').style.display='none';
 try{
   let text='';
   if(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf')){
     text=await extractPdf(file);
   }else if(file.type.startsWith('image/')){
     setOcrProgress('กำลัง OCR รูปผลตรวจ…',5);text=await ocrImageSource(file);
   }else throw new Error('รองรับ JPG, PNG และ PDF; HEIC ขึ้นอยู่กับ Safari/iOS ว่าสามารถ decode ได้หรือไม่');
   text=normalizeOcrText(text);
   docImportState.text=text;
   setOcrProgress('อ่านเอกสารเสร็จแล้ว',100);
   if(id('ocrRawText'))id('ocrRawText').value=text;
   if(id('ocrResultArea'))id('ocrResultArea').style.display='block';
   docImportState.rows=detectLabRowsFromText(text);renderDetectedRows();
   if(!text)alert('ไม่พบข้อความในเอกสาร ลองใช้รูปที่คมชัดขึ้นหรือ PDF ต้นฉบับ');
 }catch(err){
   console.error('Document import/OCR error',err);
   const msg=err?.message||String(err)||'Unknown error';
   setOcrProgress('OCR อัตโนมัติไม่สำเร็จ — ใช้โหมดตรวจแก้ด้วยตนเองได้',0);
   if(id('ocrHint'))id('ocrHint').textContent='รายละเอียด: '+msg;
   // Never trap the user on an OCR failure. Keep the selected document preview
   // visible and open the editable text/result area for manual entry/retry.
   if(id('ocrResultArea'))id('ocrResultArea').style.display='block';
   if(id('ocrRawText')&&!id('ocrRawText').value)id('ocrRawText').placeholder='OCR ไม่สำเร็จ คุณสามารถพิมพ์/วางข้อความจากผลตรวจที่นี่ แล้วกด “ตรวจหารายการผลตรวจ”';
   docImportState.rows=[];renderDetectedRows();
   alert('OCR อัตโนมัติไม่สำเร็จ แต่ยังใช้ไฟล์นี้ต่อได้\n\n'+msg+'\n\nพิมพ์หรือวางข้อความผลตรวจ แล้วกด “ตรวจหารายการผลตรวจ”');
 }
}
if(id('labDocFile'))id('labDocFile').onchange=e=>{const f=e.target.files?.[0];if(f)processLabDocument(f)};
if(id('detectLabsBtn'))id('detectLabsBtn').onclick=()=>{
 docImportState.text=id('ocrRawText').value;docImportState.rows=detectLabRowsFromText(docImportState.text);renderDetectedRows();
};
if(id('clearOcrBtn'))id('clearOcrBtn').onclick=resetDocImport;
if(id('confirmDetectedLabsBtn'))id('confirmDetectedLabsBtn').onclick=()=>{
 const chosen=docImportState.rows.filter(r=>r.selected&&String(r.name).trim()&&String(r.value).trim());
 if(!chosen.length)return alert('กรุณาเลือกอย่างน้อย 1 รายการ');
 let added=0;
 for(const r of chosen){
   db.labs.push({id:Date.now()+added,name:String(r.name).trim(),value:String(r.value).trim(),unit:String(r.unit||'').trim(),date:r.date||new Date().toISOString().slice(0,10),
    range:r.range||'',refLow:r.refLow??null,refHigh:r.refHigh??null,refMode:r.refMode||'none',category:r.category||'auto',source:'document-import',sourceFile:docImportState.file?.name||''});
   added++;
 }
 save();renderAnalysis();alert(`บันทึกผลตรวจจากเอกสารแล้ว ${added} รายการ กรุณาตรวจหน้า “วิเคราะห์สุขภาพ” อีกครั้ง`);
 resetDocImport();
};
window.docImportState=docImportState;window.renderDetectedRows=renderDetectedRows;

window.db=db;

// ---------- v6.2.2 Robust Medical Document Import ----------
db.documents=db.documents||[];
// v6.3 migration: legacy v6.2.2 OCR rows were auto-saved too aggressively.
// Keep them for audit/history, but exclude them from automatic health analysis until re-imported/confirmed.
if(!db._v63LegacyQuarantine){
  db.labs=(db.labs||[]).map(l=>l?.source==='document-import-v6.2.2'?{...l,importStatus:'needs-review'}:l);
// v6.4 Data Quality Gate: quarantine ALL legacy OCR imports. They remain in storage for audit but are hidden from clinical views.
const V64_MIGRATION_KEY='healthcare_v64_quality_migrated';
if(!localStorage.getItem(V64_MIGRATION_KEY)){
 db.labs=(db.labs||[]).map(l=>{
   const legacy=String(l?.source||'').startsWith('document-import-v6.') && !['document-import-v6.4','document-import-v6.5','document-import-v6.6'].includes(l?.source);
   return legacy?{...l,importStatus:'needs-review',qualityReason:'Legacy OCR import quarantined by v6.4'}:l;
 });
 localStorage.setItem(V64_MIGRATION_KEY,'1'); localStorage.setItem(KEY,JSON.stringify(db));
}
  db._v63LegacyQuarantine=true;
  try{localStorage.setItem(KEY,JSON.stringify(db))}catch{}
}
const V622_DOC_LABELS={lab:'Lab / Health Check',xray:'Chest X-ray',ultrasound:'Ultrasound',ecg:'ECG',other:'Medical document'};

function v622ParseDate(text){
 const m=String(text||'').match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/);
 if(!m)return new Date().toISOString().slice(0,10);
 let y=+m[3]; if(y>2400)y-=543;
 const d=new Date(y,+m[2]-1,+m[1]);
 return isNaN(d)?new Date().toISOString().slice(0,10):d.toISOString().slice(0,10);
}
function v622Classify(text){
 const t=cleanName(text);
 if(/electrocardiogram|normal sinus rhythm|qrs|qtc|qt qtc|ventricular rate|ecg|ekg/.test(t))return'ecg';
 if(/ultrasound|us whole abdomen|whole abdomen|gallbladder|portal veins|hepatomegaly|fatty liver|prostate gland/.test(t))return'ultrasound';
 if(/chest x ray|chest pa|pulmonary infiltration|pleural effusion|pneumothorax|cardiomediastinal|bony thorax/.test(t))return'xray';
 if(/health report|blood chemistry|cbc|cholesterol|triglyceride|hba1c|uric acid|creatinine|fasting blood|fbs|platelet/.test(t))return'lab';
 return'other';
}
function v622Section(text,startRx,endRx){
 const s=String(text||'').replace(/\r/g,''); const m=s.match(startRx); if(!m)return'';
 let out=s.slice((m.index||0)+m[0].length);
 if(endRx){const e=out.search(endRx); if(e>=0)out=out.slice(0,e)}
 return out.replace(/\n{3,}/g,'\n\n').trim().slice(0,2200);
}
function v622Summary(type,text){
 const raw=String(text||'');
 if(type==='xray'){
   const imp=v622Section(raw,/IMPRESSION\s*:?/i,/\b(?:Request|Report By|Print By)\b/i);
   const find=v622Section(raw,/FINDINGS\s*:?/i,/IMPRESSION\s*:?/i);
   return [find&&'Findings: '+find,imp&&'Impression: '+imp].filter(Boolean).join('\n\n') || raw.match(/No active chest disease\.?/i)?.[0] || '';
 }
 if(type==='ultrasound'){
   const imp=v622Section(raw,/IMPRESSION\s*:?/i,/\b(?:Request|Report By|Print By)\b/i);
   const find=v622Section(raw,/FINDINGS\s*:?/i,/IMPRESSION\s*:?/i);
   return [find&&'Findings: '+find,imp&&'Impression: '+imp].filter(Boolean).join('\n\n').slice(0,3000);
 }
 if(type==='ecg'){
   const parts=[];
   const rate=raw.match(/(?:ventricular rate|heart rate|rate)?\s*[:=]?\s*(\d{2,3})\s*bpm/i); if(rate)parts.push('Heart rate: '+rate[1]+' bpm');
   const rhythm=raw.match(/normal sinus rhythm/i); if(rhythm)parts.push('Rhythm: Normal sinus rhythm');
   const interp=raw.match(/normal ecg/i); if(interp)parts.push('Interpretation: Normal ECG');
   for(const [label,rx] of [['PR',/\bPR\s*[:=]?\s*(\d{2,4})\s*ms/i],['QRS',/\bQRS\s*[:=]?\s*(\d{2,4})\s*ms/i],['QT/QTc',/\bQT\s*\/\s*QTc\s*[:=]?\s*([\d/]+)\s*ms/i]]){const m=raw.match(rx);if(m)parts.push(label+': '+m[1]+' ms')}
   return parts.join('\n') || v622Section(raw,/ECG/i,null).slice(0,1200);
 }
 if(type==='lab')return 'ตรวจพบเอกสารผลตรวจสุขภาพ/แล็บ • ตรวจและยืนยันรายการด้านล่างก่อนบันทึก';
 return raw.slice(0,1500);
}

// ---------- v6.5 Smart Lab Importer ----------
// Conservative, template-aware lab extraction. The importer never invents a patient
// result from a reference value. Ambiguous rows stay unselected and are clearly flagged.
const V65_LABS=[
 {name:'HbA1c',rx:/(?:HbA1c|HBA1C)/i,unit:'%',low:null,high:null,cat:'glucose',min:2,max:20,shape:'decimal'},
 {name:'FBS',rx:/(?:\bFBS\b|Fasting\s*(?:Blood\s*)?(?:Sugar|Glucose)|น้ำตาลในเลือด)/i,unit:'mg/dL',low:70,high:99,cat:'glucose',min:30,max:700},
 {name:'BUN',rx:/\bBUN\b/i,unit:'mg/dL',low:6,high:20,cat:'kidney',min:1,max:250},
 {name:'Creatinine',rx:/(?:\bCreatinine\b|\bCr\b)/i,unit:'mg/dL',low:.67,high:1.17,cat:'kidney',min:.1,max:25,shape:'decimal'},
 {name:'eGFR',rx:/\beGFR\b/i,unit:'mL/min/1.73m2',low:90,high:null,cat:'kidney',min:1,max:200},
 {name:'Uric acid',rx:/(?:Uric\s*acid|กรดยูริก)/i,unit:'mg/dL',low:3.4,high:7,cat:'other',min:.5,max:30,shape:'decimal'},
 {name:'Cholesterol',rx:/(?:Total\s*Cholesterol|\bCholesterol\b)/i,unit:'mg/dL',low:null,high:200,cat:'lipid',min:50,max:800},
 {name:'Triglyceride',rx:/(?:Triglyceride|Triglycerides|\bTG\b)/i,unit:'mg/dL',low:null,high:150,cat:'lipid',min:10,max:3000},
 {name:'HDL-C',rx:/(?:HDL[- ]?C|\bHDL\b)/i,unit:'mg/dL',low:55,high:null,cat:'lipid',min:5,max:200},
 {name:'LDL-C',rx:/(?:LDL[- ]?C|\bLDL\b)/i,unit:'mg/dL',low:null,high:100,cat:'lipid',min:5,max:600},
 {name:'SGOT (AST)',rx:/(?:SGOT|\bAST\b)/i,unit:'U/L',low:null,high:41,cat:'liver',min:1,max:5000},
 {name:'SGPT (ALT)',rx:/(?:SGPT|\bALT\b)/i,unit:'U/L',low:null,high:42,cat:'liver',min:1,max:5000},
 {name:'Alk-phos',rx:/(?:Alk[- ]?phos|Alkaline\s*Phosphatase|\bALP\b)/i,unit:'U/L',low:40,high:130,cat:'liver',min:5,max:3000},
 {name:'Hb',rx:/(?:\bHb\b|Hemoglobin|Haemoglobin)/i,unit:'g/dL',low:12.7,high:16.9,cat:'blood',min:2,max:25,shape:'decimal'},
 {name:'Hct',rx:/(?:\bHct\b|Hematocrit|Haematocrit)/i,unit:'%',low:40.3,high:51.9,cat:'blood',min:5,max:75,shape:'decimal'},
 {name:'WBC',rx:/\bWBC\b/i,unit:'10^9/L',low:4.5,high:11.3,cat:'blood',min:.1,max:100,shape:'decimal'},
 {name:'Platelet',rx:/(?:Platelet|\bPLT\b)/i,unit:'10^9/L',low:160,high:356,cat:'blood',min:5,max:1500},
 {name:'PSA',rx:/\bPSA\b/i,unit:'ng/mL',low:null,high:null,cat:'other',min:0,max:500,shape:'decimal'}
];
// Backwards-compatible aliases used by older helpers.
const V63_LABS=V65_LABS;
const V63_CANONICAL=new Set(V65_LABS.map(x=>x.name.toLowerCase()));
function v65NumericCandidates(t){
 return [...String(t||'').replace(/[Oo](?=\d)/g,'0').replace(/(?<=\d)[Oo]/g,'0').matchAll(/-?\d+(?:[.,]\d+)?/g)]
  .map(m=>({v:+m[0].replace(',','.'),raw:m[0],i:m.index||0}))
  .filter(x=>Number.isFinite(x.v)&&!(x.v>=1900&&x.v<=2600));
}
function v65IsRefValue(spec,v){
 const eq=(a,b)=>a!=null&&Math.abs(v-a)<1e-8;
 return eq(spec.low,v)||eq(spec.high,v);
}
function v65ReferenceMeta(spec){
 if(spec.low!=null&&spec.high!=null)return{mode:'range',range:`${spec.low}-${spec.high}`};
 if(spec.high!=null)return{mode:'max',range:`<${spec.high}`};
 if(spec.low!=null)return{mode:'min',range:`>${spec.low}`};
 return{mode:'none',range:''};
}
function v65CandidateScore(spec,c,ctx,labelEnd){
 if(c.v<spec.min||c.v>spec.max)return-999;
 let score=20;
 // Patient result is expected after the test label and before reference notation/values.
 const rel=c.i-labelEnd;if(rel>=0)score+=12;else score-=8;
 if(v65IsRefValue(spec,c.v))score-=45;
 if(spec.shape==='decimal'&&/[.,]/.test(c.raw))score+=8;
 if(spec.shape==='decimal'&&!/[.,]/.test(c.raw))score-=3;
 // Strong penalty when immediately preceded by a comparison sign: almost certainly reference.
 const pre=ctx.slice(Math.max(0,c.i-3),c.i);if(/[<≤>≥]/.test(pre))score-=60;
 // IDs / dates are not lab values.
 if(c.v>10000)score-=80;
 return score;
}
function v65FindKnownLab(text,spec){
 const lines=normalizeOcrText(text).split(/\n+/).map(x=>x.trim()).filter(Boolean);
 for(let idx=0;idx<lines.length;idx++){
   const line=lines[idx],m=line.match(spec.rx);if(!m)continue;
   // Use a three-line neighborhood: OCR often wraps result/reference into adjacent lines.
   const before=idx>0?lines[idx-1]+' ':'';
   const after=idx+1<lines.length?' '+lines[idx+1]:'';
   const ctx=(before+line+after).slice(0,420);
   const labelPos=before.length+(m.index||0),labelEnd=labelPos+m[0].length;
   const nums=v65NumericCandidates(ctx).filter(x=>x.v>=spec.min&&x.v<=spec.max);
   if(!nums.length)return null;
   const ranked=nums.map(c=>({...c,score:v65CandidateScore(spec,c,ctx,labelEnd)})).sort((a,b)=>b.score-a.score);
   const best=ranked[0];
   if(!best||best.score<10)return{value:'',quality:'low',reason:'ไม่พบค่าผลตรวจที่แยกจาก reference ได้อย่างมั่นใจ',line};
   // A value identical to a known reference boundary is never accepted as the patient result.
   if(v65IsRefValue(spec,best.v))return{value:'',quality:'low',reason:'OCR จับค่า reference เป็นผลตรวจ',line};
   // If top candidates are nearly tied, keep the best value visible but require review.
   const ambiguous=ranked[1]&&ranked[1].score>=best.score-4&&Math.abs(ranked[1].v-best.v)>1e-8;
   return {value:String(best.v),quality:ambiguous?'medium':'high',reason:ambiguous?'มีตัวเลขหลายค่าที่เป็นไปได้ กรุณาเทียบกับใบจริง':'',line};
 }
 const flat=normalizeOcrText(text).replace(/\n/g,' '),m=flat.match(spec.rx);if(!m)return null;
 const ctx=flat.slice(Math.max(0,(m.index||0)-80),(m.index||0)+m[0].length+180),lm=ctx.match(spec.rx);
 const labelEnd=(lm?.index||0)+(lm?.[0]?.length||0),ranked=v65NumericCandidates(ctx).map(c=>({...c,score:v65CandidateScore(spec,c,ctx,labelEnd)})).sort((a,b)=>b.score-a.score);
 const best=ranked.find(x=>x.score>=10&&!v65IsRefValue(spec,x.v));
 return best?{value:String(best.v),quality:'medium',reason:'อ่านจากข้อความต่อเนื่อง กรุณาตรวจเทียบใบจริง',line:ctx}:null;
}
function detectLabRowsFromText(text){
 const rows=[],date=v622ParseDate(text);
 for(const spec of V65_LABS){
   const hit=v65FindKnownLab(text,spec);if(!hit)continue;
   const ref=v65ReferenceMeta(spec),valid=hit.value!==''&&v65PlausibleValue(spec,hit.value);
   rows.push({selected:false,name:spec.name,value:hit.value,unit:spec.unit,date,range:ref.range,refLow:spec.low,refHigh:spec.high,refMode:ref.mode,category:spec.cat,confidence:valid?hit.quality:'low',reviewRequired:true,qualityReason:valid?(hit.reason||'ผล OCR ต้องยืนยันกับเอกสารก่อนบันทึก'):(hit.reason||'ค่าที่อ่านได้ไม่ผ่านการตรวจสอบ')});
 }
 return rows;
}
function v65PlausibleValue(spec,value){
 const v=+value;if(!Number.isFinite(v)||v<spec.min||v>spec.max)return false;
 if(v65IsRefValue(spec,v))return false;
 return true;
}
function v63PlausibleRow(r){
 const spec=V65_LABS.find(x=>x.name===r.name);return !!spec&&v65PlausibleValue(spec,r.value);
}
async function v622CanvasFromFile(file,rotation=0,variant='contrast'){
 const bmp=await createImageBitmap(file,{imageOrientation:'from-image'}).catch(()=>createImageBitmap(file));
 // v6.5: use a larger working image for small printed lab values.
 const max=3200,scale=Math.min(2.5,max/Math.max(bmp.width,bmp.height),2.05); const w=Math.max(1,Math.round(bmp.width*scale)),h=Math.max(1,Math.round(bmp.height*scale));
 const swap=Math.abs(rotation)%180===90,canvas=document.createElement('canvas');canvas.width=swap?h:w;canvas.height=swap?w:h;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation*Math.PI/180);ctx.drawImage(bmp,-w/2,-h/2,w,h);ctx.restore();
 const im=ctx.getImageData(0,0,canvas.width,canvas.height),d=im.data;
 for(let i=0;i<d.length;i+=4){
   let y=.299*d[i]+.587*d[i+1]+.114*d[i+2];
   if(variant==='threshold') y=y>182?255:(y<92?0:Math.max(0,Math.min(255,(y-128)*1.65+128)));
   else y=Math.max(0,Math.min(255,(y-128)*1.32+128));
   d[i]=d[i+1]=d[i+2]=y;
 }
 ctx.putImageData(im,0,0);return canvas;
}
async function v622OcrImage(file){
 const worker=await getOcrWorker();
 try{await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});}catch(e){console.warn('OCR parameters unavailable',e)}
 const orientations=[0,90,270],candidates=[];
 for(let oi=0;oi<orientations.length;oi++){
   const rot=orientations[oi];
   // First pass on every orientation; only do the high-contrast second pass on the best-looking orientation later.
   setOcrProgress(`OCR เอกสาร ${rot===0?'แนวตั้ง':'หมุน '+rot+'°'}…`,8+oi*20);
   const c=await v622CanvasFromFile(file,rot,'contrast'),r=await worker.recognize(c);
   candidates.push({text:r.data?.text||'',confidence:r.data?.confidence||0,rotation:rot,variant:'contrast'});
 }
 let best=candidates.sort((a,b)=>(b.confidence+b.text.length/800)-(a.confidence+a.text.length/800))[0];
 // A second preprocessing pass often restores missing leading digits such as 158 -> 58.
 setOcrProgress('OCR รอบละเอียดสำหรับตัวเลข…',72);
 const hc=await v622CanvasFromFile(file,best.rotation,'threshold'),hr=await worker.recognize(hc),high={text:hr.data?.text||'',confidence:hr.data?.confidence||0,rotation:best.rotation,variant:'threshold'};
 // Merge both texts rather than discarding one pass. Parser can use alternative candidates from either pass.
 const merged=[best.text,high.text].filter(Boolean).join('\n--- OCR SECOND PASS ---\n');
 const chosen=high.confidence>best.confidence+5?high:best;
 return {text:merged||chosen.text,confidence:Math.max(best.confidence,high.confidence),rotation:chosen.rotation};
}


// ---------- v6.6 Crop-based OCR for Mahidol Health Report ----------
// The source form is a fixed table. Full-page OCR frequently drops leading digits
// or confuses the reference column with the patient result. v6.6 reads only the
// numeric result cells for this template and merges them with the canonical lab map.
const V66_MAHIDOL_ROWS=[
 ['FBS',0.351,0.245,0.016],['BUN',0.368,0.245,0.016],['Creatinine',0.386,0.245,0.016],['eGFR',0.403,0.245,0.016],
 ['Uric acid',0.421,0.245,0.016],['Cholesterol',0.438,0.245,0.016],['Triglyceride',0.456,0.245,0.016],['HDL-C',0.473,0.245,0.016],
 ['LDL-C',0.491,0.245,0.016],['SGOT (AST)',0.508,0.245,0.016],['SGPT (ALT)',0.526,0.245,0.016],['Alk-phos',0.543,0.245,0.016],
 ['Hb',0.586,0.245,0.014],['Hct',0.604,0.245,0.014],['WBC',0.621,0.245,0.014],['Platelet',0.639,0.245,0.014],
 ['HbA1c',0.822,0.130,0.014],['PSA',0.840,0.130,0.014]
];
function v66LooksLikeMahidolHealthReport(text){
 const t=String(text||'').toLowerCase();
 const anchors=[/check\s*up\s*center/i,/other\s*lab/i,/health\s*report/i,/sgot/i,/sgpt/i,/cholesterol/i,/platelet/i];
 return anchors.filter(rx=>rx.test(t)).length>=2;
}
function v66CropCell(canvas,yRatio,xRatio=0.245,hRatio=0.016){
 // Result column on the Mahidol health-report form. Ratios are deliberately tight
 // so reference values in the next column cannot enter OCR.
 const sx=Math.round(canvas.width*xRatio), sw=Math.round(canvas.width*(xRatio<0.2?0.10:0.085));
 const cy=Math.round(canvas.height*yRatio), sh=Math.max(22,Math.round(canvas.height*hRatio));
 const sy=Math.max(0,cy-Math.round(sh/2));
 const out=document.createElement('canvas');
 const scale=4;out.width=sw*scale;out.height=sh*scale;
 const ctx=out.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=true;
 ctx.drawImage(canvas,sx,sy,sw,sh,0,0,out.width,out.height);
 const im=ctx.getImageData(0,0,out.width,out.height),d=im.data;
 for(let i=0;i<d.length;i+=4){
  let y=.299*d[i]+.587*d[i+1]+.114*d[i+2];
  y=y>210?255:(y<105?0:Math.max(0,Math.min(255,(y-150)*1.9+150)));
  d[i]=d[i+1]=d[i+2]=y;
 }
 ctx.putImageData(im,0,0);return out;
}
function v66CleanNumericOcr(t){
 const s=String(t||'').replace(/[,]/g,'.').replace(/[Oo]/g,'0').replace(/[^0-9.]/g,'');
 const m=s.match(/\d+(?:\.\d+)?/);return m?m[0]:'';
}
async function v66ExtractMahidolHealthReport(file,rotation,text){
 if(!v66LooksLikeMahidolHealthReport(text))return [];
 const worker=await getOcrWorker(),canvas=await v622CanvasFromFile(file,rotation,'contrast');
 const prior={tessedit_pageseg_mode:'7',tessedit_char_whitelist:'0123456789.'};
 try{await worker.setParameters(prior)}catch(e){console.warn('v6.6 numeric OCR params unavailable',e)}
 const out=[],date=v622ParseDate(text);
 for(let i=0;i<V66_MAHIDOL_ROWS.length;i++){
  const [name,y,xr,hr]=V66_MAHIDOL_ROWS[i],spec=V65_LABS.find(x=>x.name===name);if(!spec)continue;
  setOcrProgress(`V6.6 อ่านช่องผลตรวจ ${i+1}/${V66_MAHIDOL_ROWS.length}: ${name}`,74+Math.round(22*(i+1)/V66_MAHIDOL_ROWS.length));
  const crop=v66CropCell(canvas,y,xr,hr),r=await worker.recognize(crop),raw=v66CleanNumericOcr(r.data?.text||'');
  if(!raw)continue;
  const value=String(+raw);if(!v65PlausibleValue(spec,value))continue;
  const ref=v65ReferenceMeta(spec);
  out.push({selected:false,name:spec.name,value,unit:spec.unit,date,range:ref.range,refLow:spec.low,refHigh:spec.high,refMode:ref.mode,category:spec.cat,confidence:'high',reviewRequired:true,qualityReason:'V6.6 อ่านจากช่อง Result โดยตรง — กรุณาเทียบกับใบจริงก่อนบันทึก',extraction:'crop-result-cell'});
 }
 try{await worker.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:'',preserve_interword_spaces:'1'})}catch(e){}
 return out;
}
function v66MergeLabRows(base,cropRows){
 const map=new Map((base||[]).map(r=>[r.name,r]));
 for(const r of cropRows||[]){
  const old=map.get(r.name);
  // Crop result-cell OCR wins whenever it returns a plausible value because its
  // field of view excludes the reference column entirely.
  if(!old||r.value!==''&&v63PlausibleRow(r))map.set(r.name,r);
 }
 return V65_LABS.map(s=>map.get(s.name)).filter(Boolean);
}

function v622RenderDocumentMeta(){
 const docs=docImportState.docs||[]; const badge=id('docTypeBadge'),sel=id('docTypeSelect'),sum=id('docStructuredSummary');
 if(!docs.length){if(badge)badge.textContent='ยังไม่พบ';return}
 if(docs.length===1){const d=docs[0];if(badge)badge.textContent=V622_DOC_LABELS[d.type]||d.type;if(sel)sel.value=d.type;if(sum)sum.value=d.summary||''}
 else{if(badge)badge.textContent=`${docs.length} เอกสาร`;if(sum)sum.value=docs.map((d,i)=>`[${i+1}] ${d.name} • ${V622_DOC_LABELS[d.type]}\n${d.summary||''}`).join('\n\n')}
}
function v622RenderMedicalDocuments(){
 const host=id('medicalDocumentList');if(!host)return;const docs=db.documents||[];
 host.innerHTML=docs.length?docs.slice().reverse().map(d=>`<div class="doc-card"><strong>${esc(d.name||'Medical document')}</strong><span class="doc-kind">${esc(V622_DOC_LABELS[d.type]||d.type||'Other')}</span><small>${esc(d.date||'')} • ${esc(d.summary||'ไม่มีสรุป')}</small></div>`).join(''):'<p class="muted">ยังไม่มีเอกสารทางการแพทย์ที่บันทึก</p>';
}
async function v622ProcessFiles(files){
 const arr=[...files]; if(!arr.length)return;
 docImportState.file=arr[0];docImportState.files=arr;docImportState.rows=[];docImportState.docs=[];docImportState.text='';
 if(id('ocrResultArea'))id('ocrResultArea').style.display='none';
 if(id('labDocPreview'))id('labDocPreview').innerHTML=`<div class="pdf-preview"><strong>กำลังอ่าน ${arr.length} ไฟล์</strong><div class="import-file-queue">${arr.map(f=>`<small>• ${esc(f.name)}</small>`).join('')}</div></div>`;
 try{
   for(let i=0;i<arr.length;i++){
     const file=arr[i];setOcrProgress(`กำลังอ่านไฟล์ ${i+1}/${arr.length}: ${file.name}`,Math.round(i/arr.length*90));let text='',rotation=0,confidence=null;
     if(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf'))text=await extractPdf(file);
     else if(file.type.startsWith('image/')){const r=await v622OcrImage(file);text=r.text;rotation=r.rotation;confidence=r.confidence}
     else continue;
     text=normalizeOcrText(text);const type=v622Classify(text),summary=v622Summary(type,text),date=v622ParseDate(text);
     docImportState.docs.push({name:file.name,type,summary,date,text,rotation,confidence});docImportState.text+=(docImportState.text?'\n\n':'')+`===== ${file.name} =====\n${text}`;
     if(type==='lab'){
       let rows=detectLabRowsFromText(text);
       if(!(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf'))){
         try{const cropRows=await v66ExtractMahidolHealthReport(file,rotation,text);rows=v66MergeLabRows(rows,cropRows)}catch(e){console.warn('v6.6 crop OCR fallback failed',e)}
       }
       docImportState.rows.push(...rows);
     }
   }
   // dedupe detected lab rows across multiple pages/files
   const seen=new Set();docImportState.rows=docImportState.rows.filter(r=>{const k=cleanName(r.name)+'|'+r.value+'|'+r.date;if(seen.has(k))return false;seen.add(k);return true});
   if(id('ocrRawText'))id('ocrRawText').value=docImportState.text;if(id('ocrResultArea'))id('ocrResultArea').style.display='block';
   setOcrProgress('อ่านเอกสารเสร็จแล้ว — V6.6 Crop-based Smart Lab Importer: ไม่เลือกผล OCR อัตโนมัติ กรุณาติ๊กเฉพาะค่าที่ตรงกับใบจริง',100);v622RenderDocumentMeta();renderDetectedRows();
   if(id('confirmDetectedLabsBtn'))id('confirmDetectedLabsBtn').disabled=!(docImportState.rows.some(r=>r.selected)||docImportState.docs.length);
 }catch(err){console.error(err);setOcrProgress('อ่านเอกสารไม่สำเร็จ',0);if(id('ocrResultArea'))id('ocrResultArea').style.display='block';alert('อ่านเอกสารไม่สำเร็จ: '+(err?.message||err))}
}
function v622Reset(){
 const w=docImportState.worker;docImportState={file:null,files:[],text:'',rows:[],docs:[],worker:w};window.docImportState=docImportState;
 if(id('labDocFile'))id('labDocFile').value='';if(id('labDocPreview'))id('labDocPreview').innerHTML='<div class="muted">ยังไม่ได้เลือกไฟล์</div>';if(id('ocrProgressWrap'))id('ocrProgressWrap').style.display='none';if(id('ocrResultArea'))id('ocrResultArea').style.display='none';if(id('ocrRawText'))id('ocrRawText').value='';if(id('docStructuredSummary'))id('docStructuredSummary').value='';renderDetectedRows();
}

if(id('labDocFile'))id('labDocFile').onchange=e=>v622ProcessFiles(e.target.files||[]);
if(id('detectLabsBtn'))id('detectLabsBtn').onclick=()=>{docImportState.text=id('ocrRawText').value;docImportState.rows=detectLabRowsFromText(docImportState.text);const type=v622Classify(docImportState.text);if(docImportState.docs?.length===1){docImportState.docs[0].type=type;docImportState.docs[0].summary=v622Summary(type,docImportState.text)}v622RenderDocumentMeta();renderDetectedRows();if(id('confirmDetectedLabsBtn'))id('confirmDetectedLabsBtn').disabled=!(docImportState.rows.some(r=>r.selected)||docImportState.docs?.length)};
if(id('docTypeSelect'))id('docTypeSelect').onchange=e=>{if(docImportState.docs?.length===1){docImportState.docs[0].type=e.target.value;docImportState.docs[0].summary=v622Summary(e.target.value,id('ocrRawText')?.value||'');v622RenderDocumentMeta()}};
if(id('docStructuredSummary'))id('docStructuredSummary').oninput=e=>{if(docImportState.docs?.length===1)docImportState.docs[0].summary=e.target.value};
if(id('clearOcrBtn'))id('clearOcrBtn').onclick=v622Reset;
if(id('confirmDetectedLabsBtn'))id('confirmDetectedLabsBtn').onclick=()=>{
 const chosen=(docImportState.rows||[]).filter(r=>r.selected&&String(r.name).trim()&&String(r.value).trim()&&v63PlausibleRow(r));const docs=docImportState.docs||[];if(!chosen.length&&!docs.length)return alert('ยังไม่มีข้อมูลที่พร้อมบันทึก');
 let added=0;for(const r of chosen){const row={id:Date.now()+added,name:String(r.name).trim(),value:String(r.value).trim(),unit:String(r.unit||'').trim(),date:r.date||new Date().toISOString().slice(0,10),range:r.range||'',refLow:r.refLow??null,refHigh:r.refHigh??null,refMode:r.refMode||'none',category:r.category||'auto',source:'document-import-v6.6',sourceFile:docImportState.file?.name||'',importStatus:'confirmed'};const dup=db.labs.some(x=>x.importStatus!=='rejected'&&cleanName(x.name)===cleanName(row.name)&&String(x.value)===String(row.value)&&String(x.date)===String(row.date));if(!dup){db.labs.push(row);added++;}}
 for(let i=0;i<docs.length;i++){const d=docs[i];db.documents.push({id:Date.now()+1000+i,name:d.name,type:d.type,date:d.date,summary:d.summary||'',source:'document-import-v6.6',ocrRotation:d.rotation||0,ocrConfidence:d.confidence??null})}
 save();renderAnalysis();v622RenderMedicalDocuments();alert(`บันทึกสำเร็จ: ผลตรวจ ${added} รายการ • เอกสาร ${docs.length} ไฟล์`);v622Reset();
};
const __renderAllV622=renderAll;renderAll=function(){__renderAllV622();v622RenderMedicalDocuments()};
window.docImportState=docImportState;window.renderDetectedRows=renderDetectedRows;renderAll();

// ---------- v6.4 Data Quality Gate ----------
function v64QuarantineLegacyOcr(){
 let n=0;
 db.labs=(db.labs||[]).map(l=>{
  if(String(l?.source||'').startsWith('document-import-v6.') && !['document-import-v6.4','document-import-v6.5','document-import-v6.6'].includes(l.source) && l.importStatus!=='needs-review'){
   n++; return {...l,importStatus:'needs-review',qualityReason:'Legacy OCR import quarantined manually in v6.6'};
  }
  return l;
 });
 save();renderQuality();renderAnalysis();renderDoctor();
 alert(n?`กักกันข้อมูล OCR เก่า ${n} รายการแล้ว\nข้อมูลเหล่านี้จะไม่ถูกใช้ในผลตรวจ, Health Analysis หรือ Doctor Report`:'ไม่มีข้อมูล OCR เก่าที่ยังต้องกักกัน');
}
if(id('cleanOcrImportsBtn')) id('cleanOcrImportsBtn').onclick=v64QuarantineLegacyOcr;
