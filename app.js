
const $=(s,root=document)=>root.querySelector(s); const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const KEY="ph_v8_data", CFG="ph_v8_cfg";
const blank={records:[],medications:[],documents:[]};
let db=load(), importState={raw:[],headers:[],valid:[],invalid:[],duplicates:[]};

function load(){try{return {...blank,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return structuredClone(blank)}}
function save(){localStorage.setItem(KEY,JSON.stringify(db));renderAll();syncBadge()}
function uid(){return crypto?.randomUUID?.() || "id-"+Date.now()+"-"+Math.random().toString(16).slice(2)}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function fmtDate(v){if(!v)return "—";const d=new Date(v);return isNaN(d)?String(v):d.toLocaleString("th-TH",{year:"2-digit",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
function typeLabel(t){return ({weight:"น้ำหนัก",blood_pressure:"ความดัน",pulse:"ชีพจร",glucose:"น้ำตาล",lab:"ผลแล็บ",exercise:"ออกกำลังกาย",note:"บันทึก"})[t]||t||"—"}
function recordVal(r){if(r.type==="blood_pressure")return `${r.value??"—"}/${r.value2??"—"}`; return r.value??"—"}
function guessUnit(type){return ({weight:"kg",blood_pressure:"mmHg",pulse:"bpm",glucose:"mg/dL"})[type]||""}

function syncBadge(){const cfg=getCfg();$("#storageBadge").textContent=cfg.url&&cfg.key?"Local + Supabase ready":"Local mode"}
function getCfg(){try{return JSON.parse(localStorage.getItem(CFG)||"{}")}catch{return {}}}
function setCfg(c){localStorage.setItem(CFG,JSON.stringify(c));syncBadge()}

function go(view){
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${view}`));
  $$(".nav").forEach(n=>n.classList.toggle("active",n.dataset.view===view));
  const meta={
    dashboard:["ภาพรวมสุขภาพ","สรุปข้อมูลล่าสุด แนวโน้ม และสิ่งที่ควรติดตาม"],
    records:["ข้อมูลสุขภาพ","บันทึกและจัดการข้อมูลสุขภาพแบบโครงสร้าง"],
    import:["นำเข้าข้อมูล","Import Center v8.0 — ตรวจและแก้ไขก่อนบันทึก"],
    meds:["ยา & เตือน","ช่วยจัดรายการยาและเวลาเตือน"],
    files:["Document Inbox","เก็บ PDF และรูปเอกสารสุขภาพ"],
    settings:["ตั้งค่า","การซิงก์และการจัดการข้อมูล"]
  }[view];
  $("#pageTitle").textContent=meta[0]; $("#pageSub").textContent=meta[1];
}
$$(".nav").forEach(b=>b.onclick=()=>go(b.dataset.view));
$$("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));

function latest(type){return db.records.filter(r=>r.type===type).sort((a,b)=>new Date(b.date)-new Date(a.date))[0]}
function renderDashboard(){
  const w=latest("weight"),bp=latest("blood_pressure"),p=latest("pulse");
  $("#kpiWeight").textContent=w?`${w.value} ${w.unit||"kg"}`:"—";
  $("#kpiWeightDate").textContent=w?fmtDate(w.date):"ยังไม่มีข้อมูล";
  $("#kpiBp").textContent=bp?`${bp.value}/${bp.value2}`:"—";
  $("#kpiBpStatus").textContent=bp?bpAssessment(bp).label:"ยังไม่มีข้อมูล";
  $("#kpiPulse").textContent=p?`${p.value} ${p.unit||"bpm"}`:"—";
  $("#kpiPulseDate").textContent=p?fmtDate(p.date):"ยังไม่มีข้อมูล";
  $("#kpiCount").textContent=db.records.length;
  renderWeightChart(); renderBpChart(); renderFlags(); renderRecent();
}
function bpAssessment(r){
  const s=Number(r.value),d=Number(r.value2);
  if(!Number.isFinite(s)||!Number.isFinite(d))return {level:"neutral",label:"ข้อมูลไม่ครบ"};
  if(s>180||d>120)return {level:"danger",label:"สูงมาก — วัดซ้ำและประเมินอาการ"};
  if(s>=135||d>=85)return {level:"warn",label:"สูงกว่าช่วงอ้างอิงที่บ้าน"};
  return {level:"ok",label:"ต่ำกว่าเกณฑ์สูงที่บ้าน"};
}
function renderFlags(){
  const out=[]; const bp=latest("blood_pressure");
  if(bp){
    const a=bpAssessment(bp);
    if(a.level==="danger")out.push({level:"danger",title:"ความดันล่าสุดสูงมาก",text:`${bp.value}/${bp.value2} mmHg — หากวัดซ้ำแล้วยัง >180/120 และมีอาการ เช่น เจ็บหน้าอก หายใจลำบาก อ่อนแรง การมองเห็นหรือการพูดผิดปกติ ให้ขอความช่วยเหลือฉุกเฉินทันที`});
    else if(a.level==="warn")out.push({level:"warn",title:"ติดตามความดัน",text:`ค่าล่าสุด ${bp.value}/${bp.value2} mmHg อยู่ตั้งแต่เกณฑ์ที่ NHS ใช้พิจารณาว่าความดันที่บ้านสูง (135/85) ควรติดตามค่าเฉลี่ยและคุยกับบุคลากรสุขภาพหากยังสูง`});
  }
  const weights=db.records.filter(r=>r.type==="weight").sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(weights.length>=2){
    const delta=Number(weights.at(-1).value)-Number(weights[0].value);
    out.push({level:"ok",title:"แนวโน้มน้ำหนัก",text:`จากข้อมูลที่มี เปลี่ยนแปลง ${delta>0?"+":""}${delta.toFixed(1)} kg`});
  }
  if(!out.length)out.push({level:"ok",title:"ยังไม่มีธงเตือน",text:"เพิ่มข้อมูลความดัน น้ำหนัก และผลตรวจเพื่อให้ Dashboard วิเคราะห์แนวโน้มได้มากขึ้น"});
  $("#healthFlags").innerHTML=out.map(x=>`<div class="item flag ${x.level}"><span class="flag-dot"></span><div><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small></div></div>`).join("");
}
function renderRecent(){
  const a=[...db.records].sort((x,y)=>new Date(y.date)-new Date(x.date)).slice(0,5);
  $("#recentRecords").innerHTML=a.length?a.map(r=>`<div class="item"><strong>${typeLabel(r.type)} • ${recordVal(r)} ${esc(r.unit||"")}</strong><small>${fmtDate(r.date)} ${r.note?`• ${esc(r.note)}`:""}</small></div>`).join(""):`<div class="item"><small>ยังไม่มีข้อมูล</small></div>`;
}
function chartSvg(rows, mode){
  if(rows.length<2)return "ยังไม่มีข้อมูลเพียงพอ";
  const W=640,H=230,pad={l:38,r:18,t:18,b:28}, iw=W-pad.l-pad.r,ih=H-pad.t-pad.b;
  const vals=mode==="weight"?rows.map(r=>Number(r.value)):rows.flatMap(r=>[Number(r.value),Number(r.value2)]).filter(Number.isFinite);
  let min=Math.min(...vals),max=Math.max(...vals); if(min===max){min-=1;max+=1}
  const extra=(max-min)*.15;min-=extra;max+=extra;
  const x=i=>pad.l+(rows.length===1?iw/2:i*iw/(rows.length-1));
  const y=v=>pad.t+(max-v)*ih/(max-min);
  const line=arr=>arr.map((v,i)=>`${x(i)},${y(v)}`).join(" ");
  const grid=[0,.25,.5,.75,1].map(f=>{const yy=pad.t+ih*f,val=max-(max-min)*f;return `<line class="axis" x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}"/><text class="chart-label" x="2" y="${yy+3}">${val.toFixed(0)}</text>`}).join("");
  const labels=rows.map((r,i)=> i===0||i===rows.length-1||i===Math.floor(rows.length/2)?`<text class="chart-label" x="${x(i)-14}" y="${H-8}">${new Date(r.date).toLocaleDateString("th-TH",{day:"numeric",month:"short"})}</text>`:"").join("");
  if(mode==="weight"){
    const a=rows.map(r=>Number(r.value));
    return `<svg class="chart" viewBox="0 0 ${W} ${H}">${grid}<polyline class="line-weight" points="${line(a)}"/>${a.map((v,i)=>`<circle class="dot-w" cx="${x(i)}" cy="${y(v)}" r="4"/>`).join("")}${labels}</svg>`;
  }
  const s=rows.map(r=>Number(r.value)),d=rows.map(r=>Number(r.value2));
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${grid}<polyline class="line-sys" points="${line(s)}"/><polyline class="line-dia" points="${line(d)}"/>${s.map((v,i)=>`<circle class="dot-s" cx="${x(i)}" cy="${y(v)}" r="4"/>`).join("")}${d.map((v,i)=>`<circle class="dot-d" cx="${x(i)}" cy="${y(v)}" r="4"/>`).join("")}${labels}</svg>`;
}
function renderWeightChart(){const a=db.records.filter(r=>r.type==="weight"&&Number.isFinite(Number(r.value))).sort((x,y)=>new Date(x.date)-new Date(y.date)).slice(-12);$("#weightChart").innerHTML=chartSvg(a,"weight")}
function renderBpChart(){const a=db.records.filter(r=>r.type==="blood_pressure"&&Number.isFinite(Number(r.value))&&Number.isFinite(Number(r.value2))).sort((x,y)=>new Date(x.date)-new Date(y.date)).slice(-12);$("#bpChart").innerHTML=chartSvg(a,"bp")}

function renderRecords(){
  const q=$("#recordSearch")?.value?.trim().toLowerCase()||"";
  let a=[...db.records].sort((x,y)=>new Date(y.date)-new Date(x.date));
  if(q)a=a.filter(r=>[typeLabel(r.type),r.type,r.note,r.unit,r.value,r.value2].join(" ").toLowerCase().includes(q));
  $("#recordsBody").innerHTML=a.length?a.map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${typeLabel(r.type)}</td><td>${recordVal(r)}</td><td>${esc(r.unit||"")}</td><td>${esc(r.note||"")}</td><td><button class="btn mini edit-rec" data-id="${r.id}">แก้</button> <button class="btn mini del-rec" data-id="${r.id}">ลบ</button></td></tr>`).join(""):`<tr><td colspan="6" class="muted">ยังไม่มีข้อมูล</td></tr>`;
  $$(".edit-rec").forEach(b=>b.onclick=()=>openRecord(b.dataset.id));
  $$(".del-rec").forEach(b=>b.onclick=()=>{if(confirm("ลบรายการนี้?")){db.records=db.records.filter(r=>r.id!==b.dataset.id);save()}});
}
$("#recordSearch").oninput=renderRecords;
$("#addRecordBtn").onclick=()=>openRecord();
function openRecord(id){
  const r=id?db.records.find(x=>x.id===id):null;
  $("#recordDialogTitle").textContent=r?"แก้ไขข้อมูลสุขภาพ":"เพิ่มข้อมูลสุขภาพ";
  $("#recordId").value=r?.id||"";
  const local=new Date();local.setMinutes(local.getMinutes()-local.getTimezoneOffset());
  $("#recordDate").value=r?.date?toLocalInput(r.date):local.toISOString().slice(0,16);
  $("#recordType").value=r?.type||"weight";$("#recordValue").value=r?.value??"";$("#recordValue2").value=r?.value2??"";$("#recordUnit").value=r?.unit||guessUnit(r?.type||"weight");$("#recordNote").value=r?.note||"";
  $("#recordDialog").showModal();
}
function toLocalInput(v){const d=new Date(v);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)}
$("#recordType").onchange=()=>{if(!$("#recordUnit").value)$("#recordUnit").value=guessUnit($("#recordType").value)}
$("#recordForm").onsubmit=e=>{
  e.preventDefault();
  const id=$("#recordId").value||uid(), old=db.records.find(r=>r.id===id);
  const rec={id,date:new Date($("#recordDate").value).toISOString(),type:$("#recordType").value,value:numOrText($("#recordValue").value),value2:numOrText($("#recordValue2").value),unit:$("#recordUnit").value.trim(),note:$("#recordNote").value.trim(),created_at:old?.created_at||new Date().toISOString(),updated_at:new Date().toISOString()};
  if(old)db.records=db.records.map(r=>r.id===id?rec:r); else db.records.push(rec);
  save();$("#recordDialog").close();
}
function numOrText(v){if(v==="")return null;const n=Number(v);return Number.isFinite(n)?n:v}

function parseCSV(text){
  const rows=[];let row=[],field="",q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(c==='"'&&q&&n==='"'){field+='"';i++}
    else if(c==='"'){q=!q}
    else if(c===','&&!q){row.push(field);field=""}
    else if((c==="\n"||c==="\r")&&!q){if(c==="\r"&&n==="\n")i++;row.push(field);field="";if(row.some(x=>x!==""))rows.push(row);row=[]}
    else field+=c;
  }
  row.push(field);if(row.some(x=>x!==""))rows.push(row);
  if(!rows.length)return {headers:[],rows:[]};
  const headers=rows[0].map((h,i)=>h.trim()||`column_${i+1}`);
  return {headers,rows:rows.slice(1).map(a=>Object.fromEntries(headers.map((h,i)=>[h,a[i]??""])))}
}
function normalizeJson(x){
  const arr=Array.isArray(x)?x:(Array.isArray(x.records)?x.records:[x]);
  const headers=[...new Set(arr.flatMap(o=>Object.keys(o||{})))];
  return {headers,rows:arr.map(o=>Object.fromEntries(headers.map(h=>[h,o?.[h]??""])))}
}
function autoMap(headers){
  const find=(...names)=>headers.find(h=>names.some(n=>h.toLowerCase().replace(/[\s_-]/g,"").includes(n)))||"";
  return {
    date:find("date","datetime","time","วันที่"),
    type:find("type","category","metric","ประเภท"),
    value:find("systolic","value","result","ค่า"),
    value2:find("diastolic","value2","secondary","ค่าล่าง"),
    unit:find("unit","หน่วย"),
    note:find("note","remark","comment","หมายเหตุ")
  }
}
function setImportData(parsed,sourceName="pasted data"){
  importState.raw=parsed.rows.map((r,i)=>({...r,__row:i+2,__source:sourceName}));
  importState.headers=parsed.headers; setupMapping(); renderPreview(); setImportStep(2);
}
function setupMapping(){
  const map=autoMap(importState.headers), ids={mapDate:"date",mapType:"type",mapValue:"value",mapValue2:"value2",mapUnit:"unit",mapNote:"note"};
  Object.entries(ids).forEach(([id,key])=>{
    const sel=$("#"+id);sel.innerHTML=`<option value="">— ไม่ใช้ —</option>`+importState.headers.map(h=>`<option value="${esc(h)}">${esc(h)}</option>`).join("");sel.value=map[key]||"";
    sel.onchange=renderPreview;
  });
}
function mapping(){return {date:$("#mapDate").value,type:$("#mapType").value,value:$("#mapValue").value,value2:$("#mapValue2").value,unit:$("#mapUnit").value,note:$("#mapNote").value}}
function normalizeType(v){
  const s=String(v||"").trim().toLowerCase().replace(/\s+/g,"_");
  if(["bp","bloodpressure","blood_pressure","ความดัน","ความดันโลหิต"].includes(s))return "blood_pressure";
  if(["weight","น้ำหนัก"].includes(s))return "weight";
  if(["pulse","heart_rate","heartrate","ชีพจร"].includes(s))return "pulse";
  if(["glucose","blood_sugar","น้ำตาล"].includes(s))return "glucose";
  if(["exercise","ออกกำลังกาย"].includes(s))return "exercise";
  if(["note","บันทึก"].includes(s))return "note";
  if(["lab","labs","ผลแล็บ","ผลตรวจ"].includes(s))return "lab";
  return s||"lab";
}
function mappedRecords(){
  const m=mapping();
  return importState.raw.map((r,i)=>{
    const dateRaw=m.date?r[m.date]:"",typeRaw=m.type?r[m.type]:"";
    let date=dateRaw?new Date(dateRaw):new Date();
    if(isNaN(date))date=null;
    const type=normalizeType(typeRaw);
    const unit=(m.unit?r[m.unit]:"")||guessUnit(type);
    return {id:uid(),date:date?.toISOString()||"",type,value:numOrText(m.value?r[m.value]:""),value2:numOrText(m.value2?r[m.value2]:""),unit:String(unit||"").trim(),note:String(m.note?r[m.note]:"").trim(),source:r.__source,source_row:r.__row};
  });
}
function validateRec(r){
  const errors=[];
  if(!r.date)errors.push("วันที่ไม่ถูกต้อง");
  if(!r.type)errors.push("ไม่มีประเภท");
  if(["weight","blood_pressure","pulse","glucose"].includes(r.type)&&!Number.isFinite(Number(r.value)))errors.push("ค่า 1 ไม่ใช่ตัวเลข");
  if(r.type==="blood_pressure"&&!Number.isFinite(Number(r.value2)))errors.push("ความดันต้องมีค่า 2");
  return errors;
}
function signature(r){return [r.date?.slice(0,16),r.type,String(r.value),String(r.value2??""),r.unit].join("|")}
function analyzeImport(){
  const recs=mappedRecords(), existing=new Set(db.records.map(signature));
  importState.valid=[];importState.invalid=[];importState.duplicates=[];
  recs.forEach((r,i)=>{
    const err=validateRec(r);
    if(err.length)importState.invalid.push({r,i,err});
    else if(existing.has(signature(r)))importState.duplicates.push({r,i});
    else importState.valid.push({...r,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
  });
}
function renderPreview(){
  const recs=mappedRecords();
  $("#importSummary").textContent=`${importState.raw.length} แถว • ${importState.headers.length} คอลัมน์`;
  $("#previewHead").innerHTML="<tr><th>#</th><th>วันที่</th><th>ประเภท</th><th>ค่า 1</th><th>ค่า 2</th><th>หน่วย</th><th>หมายเหตุ</th><th>สถานะ</th></tr>";
  $("#previewBody").innerHTML=recs.slice(0,200).map((r,i)=>{
    const err=validateRec(r);
    return `<tr data-i="${i}">
      <td>${i+1}</td>
      <td><input class="input mini-edit p-date" value="${esc(r.date?r.date.slice(0,16):"")}"></td>
      <td><input class="input mini-edit p-type" value="${esc(r.type)}"></td>
      <td><input class="input mini-edit p-v1" value="${esc(r.value??"")}"></td>
      <td><input class="input mini-edit p-v2" value="${esc(r.value2??"")}"></td>
      <td><input class="input mini-edit p-unit" value="${esc(r.unit)}"></td>
      <td><input class="input mini-edit p-note" value="${esc(r.note)}"></td>
      <td class="${err.length?"bad":"ok"}">${err.length?esc(err.join(", ")):"พร้อม"}</td>
    </tr>`
  }).join("");
  $$("#previewBody tr").forEach(tr=>$$("input",tr).forEach(inp=>inp.onchange=()=>applyPreviewEdit(tr)));
  analyzeImport();$("#validationStatus").textContent=`พร้อม ${importState.valid.length} • ต้องแก้ ${importState.invalid.length} • duplicate ${importState.duplicates.length}`;
}
function applyPreviewEdit(tr){
  const i=Number(tr.dataset.i), raw=importState.raw[i], m=mapping();
  const set=(key,cls)=>{if(m[key])raw[m[key]]=tr.querySelector(cls).value};
  set("date",".p-date");set("type",".p-type");set("value",".p-v1");set("value2",".p-v2");set("unit",".p-unit");set("note",".p-note");
  renderPreview();
}
function setImportStep(n){
  $("#importStep1").hidden=n!==1;$("#importStep2").hidden=n!==2;$("#importStep3").hidden=n!==3;
  $$(".step").forEach(s=>s.classList.toggle("active",Number(s.dataset.step)<=n));
}
$("#backImport").onclick=()=>setImportStep(1);$("#backToPreview").onclick=()=>setImportStep(2);
$("#prepareSaveBtn").onclick=()=>{analyzeImport();$("#saveStats").innerHTML=`<div class="stat"><span>พร้อมบันทึก</span><b class="ok">${importState.valid.length}</b></div><div class="stat"><span>ข้อมูลไม่ครบ</span><b class="bad">${importState.invalid.length}</b></div><div class="stat"><span>Duplicate</span><b class="skip">${importState.duplicates.length}</b></div>`;$("#saveResult").innerHTML="";setImportStep(3)};
$("#saveImportBtn").onclick=async()=>{
  analyzeImport();
  db.records.push(...importState.valid);save();
  const cfg=getCfg();let syncMsg="";
  if(cfg.url&&cfg.key&&importState.valid.length){
    try{await supabaseInsert("health_records",importState.valid.map(r=>({id:r.id,recorded_at:r.date,type:r.type,value1:r.value,value2:r.value2,unit:r.unit,note:r.note,source:r.source})));syncMsg=" • Supabase sync สำเร็จ"}
    catch(e){syncMsg=` • Local save สำเร็จ แต่ Supabase: ${e.message}`}
  }
  $("#saveResult").innerHTML=`<div class="notice info"><strong>บันทึกแล้ว ${importState.valid.length} รายการ</strong>${esc(syncMsg)}<br>ข้าม ${importState.invalid.length} แถวที่ไม่ผ่าน และ ${importState.duplicates.length} duplicate</div>`;
  importState={raw:[],headers:[],valid:[],invalid:[],duplicates:[]};
}
$("#fileInput").onchange=e=>handleFiles([...e.target.files]);
["dragenter","dragover"].forEach(ev=>$("#dropzone").addEventListener(ev,e=>{e.preventDefault();e.currentTarget.style.borderColor="#0b6b57"}));
["dragleave","drop"].forEach(ev=>$("#dropzone").addEventListener(ev,e=>{e.preventDefault();e.currentTarget.style.borderColor=""}));
$("#dropzone").addEventListener("drop",e=>handleFiles([...e.dataTransfer.files]));
async function handleFiles(files){
  const dataFiles=files.filter(f=>/\.(csv|json)$/i.test(f.name)||["text/csv","application/json"].includes(f.type));
  const docs=files.filter(f=>!dataFiles.includes(f));
  docs.forEach(f=>db.documents.push({id:uid(),name:f.name,type:f.type||"file",size:f.size,date:new Date().toISOString(),note:"Imported to Document Inbox"}));
  if(docs.length)save();
  if(dataFiles.length){
    const f=dataFiles[0],text=await f.text();
    try{const parsed=/\.json$/i.test(f.name)||f.type==="application/json"?normalizeJson(JSON.parse(text)):parseCSV(text);setImportData(parsed,f.name)}
    catch(e){alert("อ่านไฟล์ไม่ได้: "+e.message)}
  } else if(docs.length){alert(`เพิ่มเอกสาร ${docs.length} ไฟล์ใน Document Inbox แล้ว`);go("files")}
}
$("#pasteImportBtn").onclick=()=>$("#pasteDialog").showModal();
$("#pasteForm").onsubmit=e=>{e.preventDefault();setImportData(parseCSV($("#pasteText").value),"pasted.csv");$("#pasteDialog").close()};
$("#downloadTemplate").onclick=()=>downloadText("health-import-template.csv","date,type,value,value2,unit,note\n2026-08-11T08:00:00,blood_pressure,128,82,mmHg,morning\n2026-08-11T08:05:00,weight,80,,kg,\n");
function downloadText(name,text,type="text/plain"){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

function renderMeds(){
  $("#medList").innerHTML=db.medications.length?db.medications.map(m=>`<div class="item"><strong>${esc(m.name)}</strong><small>${esc(m.dose||"")} ${m.time?`• ${esc(m.time)}`:""} ${m.note?`• ${esc(m.note)}`:""}</small><div><button class="btn mini del-med" data-id="${m.id}">ลบ</button></div></div>`).join(""):`<div class="item"><small>ยังไม่มีรายการยา</small></div>`;
  $("#reminderList").innerHTML=db.medications.filter(m=>m.time).length?db.medications.filter(m=>m.time).sort((a,b)=>a.time.localeCompare(b.time)).map(m=>`<div class="item"><strong>${esc(m.time)} • ${esc(m.name)}</strong><small>${esc(m.dose||"")}</small></div>`).join(""):`<div class="item"><small>ยังไม่มีเวลาเตือน</small></div>`;
  $$(".del-med").forEach(b=>b.onclick=()=>{db.medications=db.medications.filter(m=>m.id!==b.dataset.id);save()});
}
$("#addMedBtn").onclick=()=>{$("#medForm").reset();$("#medDialog").showModal()};
$("#medForm").onsubmit=e=>{e.preventDefault();db.medications.push({id:uid(),name:$("#medName").value.trim(),dose:$("#medDose").value.trim(),time:$("#medTime").value,note:$("#medNote").value.trim(),created_at:new Date().toISOString()});save();$("#medDialog").close()}

function renderFiles(){
  $("#fileList").innerHTML=db.documents.length?db.documents.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(f=>`<div class="file-card"><div class="file-type">${f.type.includes("pdf")?"PDF":"IMG"}</div><strong>${esc(f.name)}</strong><small>${Math.round(f.size/1024)} KB • ${fmtDate(f.date)}</small><p class="muted">${esc(f.note||"")}</p><button class="btn mini del-file" data-id="${f.id}">ลบรายการ</button></div>`).join(""):`<div class="item"><small>ยังไม่มีเอกสาร</small></div>`;
  $$(".del-file").forEach(b=>b.onclick=()=>{db.documents=db.documents.filter(f=>f.id!==b.dataset.id);save()});
}

function exportData(){downloadText(`personal-healthcare-v8-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({version:"8.0",exported_at:new Date().toISOString(),...db},null,2),"application/json")}
$("#exportBtn").onclick=exportData;$("#exportBtn2").onclick=exportData;
$("#resetAll").onclick=()=>{if(confirm("ล้างข้อมูลทั้งหมดในเครื่อง? การกระทำนี้ย้อนกลับไม่ได้")){localStorage.removeItem(KEY);db=structuredClone(blank);save()}}

$("#saveSupabase").onclick=()=>{setCfg({url:$("#supabaseUrl").value.trim().replace(/\/$/,""),key:$("#supabaseKey").value.trim()});$("#supabaseStatus").textContent="บันทึกแล้ว"};
$("#testSupabase").onclick=async()=>{
  $("#supabaseStatus").textContent="กำลังทดสอบ...";
  try{const r=await supabaseFetch("health_records","?select=id&limit=1");$("#supabaseStatus").textContent=`เชื่อมต่อสำเร็จ (${Array.isArray(r)?r.length:0} row test)`}
  catch(e){$("#supabaseStatus").textContent="เชื่อมต่อไม่สำเร็จ: "+e.message}
};
async function supabaseFetch(table,suffix=""){
  const c=getCfg();if(!c.url||!c.key)throw new Error("ยังไม่ได้ตั้งค่า URL / Key");
  const res=await fetch(`${c.url}/rest/v1/${table}${suffix}`,{headers:{apikey:c.key,Authorization:`Bearer ${c.key}`}});
  if(!res.ok)throw new Error(`${res.status} ${await res.text()}`);return res.json();
}
async function supabaseInsert(table,rows){
  const c=getCfg();const res=await fetch(`${c.url}/rest/v1/${table}`,{method:"POST",headers:{apikey:c.key,Authorization:`Bearer ${c.key}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(rows)});
  if(!res.ok)throw new Error(`${res.status} ${await res.text()}`);return true;
}
function loadSettings(){const c=getCfg();$("#supabaseUrl").value=c.url||"";$("#supabaseKey").value=c.key||""}

function renderAll(){renderDashboard();renderRecords();renderMeds();renderFiles();loadSettings()}
renderAll();syncBadge();setImportStep(1);
