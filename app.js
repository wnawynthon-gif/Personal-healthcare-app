
const $=(s,root=document)=>root.querySelector(s); const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const KEY="ph_v8_data", CFG="ph_v8_cfg"; const FILE_DB="ph_v81_files", FILE_STORE="documents";
const blank={records:[],medications:[],documents:[],weightGoal:{},bodyLogs:[]};
let db=load(), importState={raw:[],headers:[],valid:[],invalid:[],duplicates:[]};

function load(){try{return {...blank,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return structuredClone(blank)}}
function save(){localStorage.setItem(KEY,JSON.stringify(db));renderAll();syncBadge()}
function uid(){return crypto?.randomUUID?.() || "id-"+Date.now()+"-"+Math.random().toString(16).slice(2)}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function fmtDate(v){if(!v)return "—";const d=new Date(v);return isNaN(d)?String(v):d.toLocaleString("th-TH",{year:"2-digit",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
function typeLabel(t){return ({weight:"น้ำหนัก",height:"ส่วนสูง",blood_pressure:"ความดัน",pulse:"ชีพจร",glucose:"น้ำตาล",lab:"ผลแล็บ",exercise:"ออกกำลังกาย",note:"บันทึก"})[t]||t||"—"}
function recordVal(r){if(r.type==="blood_pressure")return `${r.value??"—"}/${r.value2??"—"}`; return r.value??"—"}
function guessUnit(type){return ({weight:"kg",height:"cm",blood_pressure:"mmHg",pulse:"bpm",glucose:"mg/dL"})[type]||""}
function isVital(type){return ["weight","height","blood_pressure","pulse","glucose"].includes(type)}
function compactNote(r){
  const note=String(r?.note||"").trim();
  if(!note)return "";
  if(!isVital(r?.type))return note;
  if(/^อัปเดตจาก Dashboard v8\.[0-9]+/i.test(note))return note.replace(/v8\.[0-9]+/i,"v8.6");
  if(/Reference:|AI flag:|Validation:|Confidence:|Status:|Source:/i.test(note)){
    const src=(note.match(/Source:\s*([^•]+)/i)||[])[1]?.trim();
    return src?`นำเข้าจาก AI • ${src}`:"นำเข้าจาก AI";
  }
  return note.length>90?note.slice(0,87)+"…":note;
}
function deleteRecordById(id){if(!id)return;if(confirm("ลบรายการนี้?")){db.records=db.records.filter(r=>r.id!==id);save()}}

function syncBadge(){const cfg=getCfg();$("#storageBadge").textContent=cfg.url&&cfg.key?"Local + Supabase ready":"Local mode"}
function getCfg(){try{return JSON.parse(localStorage.getItem(CFG)||"{}")}catch{return {}}}
function setCfg(c){localStorage.setItem(CFG,JSON.stringify(c));syncBadge()}

function go(view){
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${view}`));
  $$(".nav").forEach(n=>n.classList.toggle("active",n.dataset.view===view));
  const meta={
    dashboard:["ภาพรวมสุขภาพ","สรุปข้อมูลล่าสุด แนวโน้ม และสิ่งที่ควรติดตาม"],
    weight:["ควบคุมน้ำหนัก","เป้าหมาย BMI รอบเอว อาหาร และการออกกำลัง"],
    coach:["AI Health Coach","แผนวันนี้จากน้ำหนัก BMI รอบเอว ความดัน ผลแล็บ อาหาร และกิจกรรม"],
    records:["ข้อมูลสุขภาพ","บันทึกและจัดการข้อมูลสุขภาพแบบโครงสร้าง"],
    import:["นำเข้าข้อมูล","Import Center v8.0 — ตรวจและแก้ไขก่อนบันทึก"],
    meds:["ยา & เตือน","ช่วยจัดรายการยาและเวลาเตือน"],
    ai:["AI วิเคราะห์ผลตรวจ","ถ่ายรูปผลตรวจ → AI วิเคราะห์ → Validation → Confirm → Save"],
    files:["Document Inbox","เก็บ PDF และรูปเอกสารสุขภาพ"],
    settings:["ตั้งค่า","การซิงก์และการจัดการข้อมูล"]
  }[view];
  $("#pageTitle").textContent=meta[0]; $("#pageSub").textContent=meta[1];
}
$$(".nav").forEach(b=>b.onclick=()=>go(b.dataset.view));
$$("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));

function latest(type){return db.records.filter(r=>r.type===type).sort((a,b)=>new Date(b.date)-new Date(a.date))[0]}
function bmiAssessment(){
  const w=latest("weight"),h=latest("height");
  const kg=Number(w?.value),cm=Number(h?.value);
  if(!Number.isFinite(kg)||!Number.isFinite(cm)||cm<=0)return null;
  const bmi=kg/((cm/100)**2);
  let level="ok",label="น้ำหนักอยู่ในช่วงมาตรฐาน";
  if(bmi<18.5){level="warn";label="น้ำหนักน้อย"}
  else if(bmi<25){level="ok";label="ช่วงน้ำหนักมาตรฐาน"}
  else if(bmi<30){level="warn";label="น้ำหนักเกิน"}
  else if(bmi<35){level="warn";label="โรคอ้วนระดับ 1"}
  else if(bmi<40){level="danger";label="โรคอ้วนระดับ 2"}
  else {level="danger";label="โรคอ้วนระดับ 3"}
  const m=cm/100;
  return {bmi,level,label,kg,cm,healthyMin:18.5*m*m,healthyMax:24.9*m*m,weightDate:w?.date,heightDate:h?.date};
}
function labName(r){
  const n=String(r?.analyte||r?.name||r?.test_name||String(r?.note||"").split("•")[0]||"").trim();
  return n;
}
function normLabName(n){return String(n||"").toLowerCase().replace(/[^a-z0-9ก-๙]+/g,"")}
function latestLab(matchers){
  const rows=db.records.filter(r=>r.type==="lab"&&Number.isFinite(Number(r.value))).sort((a,b)=>new Date(b.date)-new Date(a.date));
  return rows.find(r=>{const n=normLabName(labName(r));return matchers.some(x=>n.includes(x))})||null;
}
function mmolLipid(r){
  if(!r)return null;const v=Number(r.value),u=String(r.unit||"").toLowerCase().replace(/\s/g,"");if(!Number.isFinite(v))return null;
  if(u.includes("mmol"))return v;
  const n=normLabName(labName(r));
  if(u.includes("mg/dl")||u.includes("mgdl"))return n.includes("triglycer")||n==="tg"?v/88.57:v/38.67;
  return null;
}
function medicalLabFindings(){
  const out=[];
  const hba=latestLab(["hba1c","เอวันซี","ฮีโมโกลบินเอวันซี"]);
  if(hba){const v=Number(hba.value),u=String(hba.unit||"");if(u.includes("%")||(!u&&v<20)){
    if(v>=6.5)out.push({level:"danger",title:`HbA1c ${v}%`,text:"อยู่ในช่วงที่ใช้เป็นเกณฑ์วินิจฉัยเบาหวาน แต่โดยทั่วไปต้องให้แพทย์ยืนยันตามบริบท/การตรวจซ้ำหากไม่มีอาการชัดเจน"});
    else if(v>=5.7)out.push({level:"warn",title:`HbA1c ${v}%`,text:"อยู่ในช่วงก่อนเบาหวาน ควรทบทวนอาหาร การออกกำลังกาย น้ำหนัก และติดตามตามคำแนะนำของแพทย์"});
    else out.push({level:"ok",title:`HbA1c ${v}%`,text:"ต่ำกว่าเกณฑ์ก่อนเบาหวานตามเกณฑ์ทั่วไปของ CDC/ADA"});
  }}
  const tc=latestLab(["totalcholesterol","cholesteroltotal","คอเลสเตอรอลรวม"]), ldl=latestLab(["ldl"]), hdl=latestLab(["hdl"]), tg=latestLab(["triglycer","ไตรกลีเซอไรด์"]);
  const tcv=mmolLipid(tc); if(tcv!=null)out.push({level:tcv>=5?"warn":"ok",title:`Total cholesterol ${Number(tc.value)} ${tc.unit||""}`,text:tcv>=5?"สูงกว่าแนวทางทั่วไปของ NHS (<5 mmol/L) ควรประเมินร่วมกับ HDL, non-HDL/LDL และความเสี่ยงหัวใจโดยรวม":"อยู่ต่ำกว่า 5 mmol/L ตามแนวทางทั่วไปของ NHS"});
  const ldlv=mmolLipid(ldl); if(ldlv!=null)out.push({level:ldlv>=3?"warn":"ok",title:`LDL ${Number(ldl.value)} ${ldl.unit||""}`,text:ldlv>=3?"สูงกว่า healthy guide ทั่วไป (<3 mmol/L); เป้าหมายจริงอาจต่ำกว่านี้หากมีโรคหัวใจ เบาหวาน หรือความเสี่ยงสูง":"อยู่ต่ำกว่า 3 mmol/L ตาม healthy guide ทั่วไป"});
  const tgv=mmolLipid(tg); if(tgv!=null)out.push({level:tgv>=2?"warn":"ok",title:`Triglycerides ${Number(tg.value)} ${tg.unit||""}`,text:tgv>=2?"ตั้งแต่ 2 mmol/L ขึ้นไปควรพิจารณาบริบทการอดอาหาร อาหาร/แอลกอฮอล์ และความเสี่ยงเมตาบอลิก":"ต่ำกว่า 2 mmol/L ตามเป้าหมาย non-fasting ของ HEART UK"});
  if(hdl){const v=mmolLipid(hdl);if(v!=null&&v<1)out.push({level:"warn",title:`HDL ${Number(hdl.value)} ${hdl.unit||""}`,text:"HDL ต่ำกว่า 1.0 mmol/L เป็นปัจจัยที่ควรพิจารณาร่วมกับความเสี่ยงหัวใจโดยรวม (เกณฑ์ผู้หญิงทั่วไปสูงกว่า 1.2 mmol/L)"})}
  const egfr=latestLab(["egfr","estimatedglomerularfiltration"]); if(egfr){const v=Number(egfr.value);if(v<60)out.push({level:v<30?"danger":"warn",title:`eGFR ${v} ${egfr.unit||""}`,text:"eGFR ต่ำกว่า 60 ควรติดตามกับแพทย์; CKD ต้องพิจารณาความต่อเนื่องอย่างน้อย 3 เดือนและข้อมูลไตอื่นร่วมด้วย"});else out.push({level:"ok",title:`eGFR ${v} ${egfr.unit||""}`,text:"ค่า eGFR ตั้งแต่ 60 ขึ้นไปต้องตีความร่วมกับอายุและหลักฐานความเสียหายของไตอื่น ๆ"})}
  // For AI-imported labs not covered by a specific rule, respect the report/reference flag rather than inventing a universal range.
  const covered=new Set([hba,tc,ldl,hdl,tg,egfr].filter(Boolean).map(r=>r.id));
  const abnormal=db.records.filter(r=>r.type==="lab"&&!covered.has(r.id)&&["high","low","abnormal","critical"].includes(String(r.ai_flag||"").toLowerCase())).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,4);
  for(const r of abnormal)out.push({level:String(r.ai_flag).toLowerCase()==="critical"?"danger":"warn",title:`${labName(r)||"ผลตรวจ"} ${r.value} ${r.unit||""}`,text:`รายงาน/AI ระบุว่า ${r.ai_flag}; ควรเทียบกับ reference range ของห้องแล็บและให้แพทย์ตีความร่วมกับอาการและประวัติ`});
  return out;
}
function renderMedicalInsight(){
  const el=$("#medicalSummary"), rec=$("#medicalRecommendations"); if(!el||!rec)return;
  const bmi=bmiAssessment(),bp=latest("blood_pressure"),pulse=latest("pulse");
  if($("#kpiBmi")){ $("#kpiBmi").textContent=bmi?bmi.bmi.toFixed(1):"—"; $("#kpiBmiStatus").textContent=bmi?bmi.label:"ต้องมีน้ำหนักและส่วนสูง"; }
  const cards=[];
  if(bmi)cards.push(`<div class="med-card"><small>BMI</small><b>${bmi.bmi.toFixed(1)}</b><span>${esc(bmi.label)}</span><small>ช่วง BMI 18.5–24.9 ที่ส่วนสูง ${bmi.cm} cm ≈ ${bmi.healthyMin.toFixed(1)}–${bmi.healthyMax.toFixed(1)} kg</small></div>`);
  if(bp){const a=bpAssessment(bp);cards.push(`<div class="med-card"><small>ความดันล่าสุด</small><b>${bp.value}/${bp.value2}</b><span>${esc(a.label)}</span><small>การวินิจฉัยต้องอาศัยค่าเฉลี่ย/การวัดซ้ำที่ถูกวิธี</small></div>`)}
  if(pulse)cards.push(`<div class="med-card"><small>ชีพจรล่าสุด</small><b>${pulse.value} ${esc(pulse.unit||"bpm")}</b><span>ตีความร่วมกับการพัก ออกกำลัง ยา และอาการ</span><small>${fmtDate(pulse.date)}</small></div>`);
  el.innerHTML=cards.length?cards.join(""):`<div class="med-empty">เพิ่มน้ำหนัก ส่วนสูง ความดัน และผลตรวจ เพื่อเริ่มการวิเคราะห์</div>`;
  const findings=[];
  if(bmi){
    if(bmi.bmi>=25)findings.push({level:bmi.bmi>=35?"danger":"warn",title:`BMI ${bmi.bmi.toFixed(1)} — ${bmi.label}`,text:"BMI เป็นเครื่องมือคัดกรอง ไม่ใช่การวินิจฉัยไขมันในร่างกาย ควรดูรอบเอว ความดัน น้ำตาล ไขมัน และปัจจัยเสี่ยงอื่นร่วมกัน แนะนำวางแผนลดน้ำหนักอย่างยั่งยืนด้วยอาหารที่เหมาะสมและกิจกรรมที่ทำได้ต่อเนื่อง"});
    else if(bmi.bmi<18.5)findings.push({level:"warn",title:`BMI ${bmi.bmi.toFixed(1)} — น้ำหนักน้อย`,text:"ควรประเมินภาวะโภชนาการ การเปลี่ยนน้ำหนักโดยไม่ตั้งใจ และอาการร่วม โดยเฉพาะหากน้ำหนักลดเร็ว"});
    else findings.push({level:"ok",title:`BMI ${bmi.bmi.toFixed(1)}`,text:"อยู่ในช่วง BMI มาตรฐานสำหรับผู้ใหญ่ แต่ควรประเมินสุขภาพร่วมกับรอบเอว องค์ประกอบร่างกาย และผลตรวจอื่น"});
  }
  if(bp){const a=bpAssessment(bp);if(a.level==="danger")findings.push({level:"danger",title:"ความดันสูงมาก",text:"วัดซ้ำหลังพักอย่างถูกวิธี หากยัง ≥180/120 mmHg โดยเฉพาะเมื่อมีเจ็บหน้าอก หายใจลำบาก อ่อนแรง สับสน การพูดหรือการมองเห็นผิดปกติ ควรรับการประเมินฉุกเฉิน"});else if(a.level==="warn")findings.push({level:"warn",title:"ความดันที่บ้านสูงกว่าค่าตัดทั่วไป",text:"NICE ใช้ค่าเฉลี่ย HBPM/ABPM ≥135/85 mmHg เพื่อยืนยันความดันสูงเมื่อเหมาะสม ควรเก็บหลายครั้งหลายวันและนำค่าเฉลี่ยให้บุคลากรสุขภาพประเมิน"})}
  findings.push(...medicalLabFindings());
  rec.innerHTML=findings.length?findings.map(x=>`<div class="item medical-rec ${x.level}"><span class="med-icon">${x.level==="danger"?"⚠️":x.level==="warn"?"●":"✓"}</span><div><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small></div></div>`).join(""):`<div class="item"><small>ยังไม่มีข้อมูลที่เพียงพอสำหรับคำแนะนำ</small></div>`;
}
function renderDashboard(){
  const w=latest("weight"),h=latest("height"),bp=latest("blood_pressure"),p=latest("pulse");
  $("#kpiWeight").textContent=w?`${w.value} ${w.unit||"kg"}`:"—";
  $("#kpiWeightDate").textContent=w?fmtDate(w.date):"ยังไม่มีข้อมูล";
  $("#kpiBp").textContent=bp?`${bp.value}/${bp.value2}`:"—";
  $("#kpiBpStatus").textContent=bp?bpAssessment(bp).label:"ยังไม่มีข้อมูล";
  $("#kpiPulse").textContent=p?`${p.value} ${p.unit||"bpm"}`:"—";
  $("#kpiPulseDate").textContent=p?fmtDate(p.date):"ยังไม่มีข้อมูล";
  $("#kpiHeight").textContent=h?`${h.value} ${h.unit||"cm"}`:"—";
  $("#kpiHeightDate").textContent=h?fmtDate(h.date):"ยังไม่มีข้อมูล";
  $("#kpiCount").textContent=db.records.length;
  renderWeightChart(); renderBpChart(); renderFlags(); renderRecent(); renderMedicalInsight();
}
function bpAssessment(r){
  const s=Number(r.value),d=Number(r.value2);
  if(!Number.isFinite(s)||!Number.isFinite(d))return {level:"neutral",label:"ข้อมูลไม่ครบ"};
  if(s>=180||d>=120)return {level:"danger",label:"สูงมาก — วัดซ้ำและประเมินอาการ"};
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
  const weights=db.records.filter(r=>r.type==="weight"&&Number.isFinite(Number(r.value))).sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(weights.length>=2){
    const prev=weights.at(-2), cur=weights.at(-1), delta=Number(cur.value)-Number(prev.value);
    const level=Math.abs(delta)>=3?"warn":"ok";
    out.push({level,title:"แนวโน้มน้ำหนัก",text:`เทียบ 2 ครั้งล่าสุด: ${Number(prev.value).toFixed(1)} → ${Number(cur.value).toFixed(1)} kg (${delta>0?"+":""}${delta.toFixed(1)} kg)`});
  }
  if(!out.length)out.push({level:"ok",title:"ยังไม่มีธงเตือน",text:"เพิ่มข้อมูลความดัน น้ำหนัก และผลตรวจเพื่อให้ Dashboard วิเคราะห์แนวโน้มได้มากขึ้น"});
  $("#healthFlags").innerHTML=out.map(x=>`<div class="item flag ${x.level}"><span class="flag-dot"></span><div><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small></div></div>`).join("");
}
function renderRecent(){
  const a=[...db.records].sort((x,y)=>new Date(y.date)-new Date(x.date)).slice(0,8);
  $("#recentRecords").innerHTML=a.length?a.map(r=>{const n=compactNote(r);return `<div class="item timeline-item"><div class="timeline-main"><strong>${typeLabel(r.type)} • ${recordVal(r)} ${esc(r.unit||"")}</strong><small>${fmtDate(r.date)}${n?` • ${esc(n)}`:""}</small></div><div class="timeline-actions"><button class="btn mini recent-edit" data-id="${esc(r.id)}">แก้</button><button class="btn mini recent-del" data-id="${esc(r.id)}">ลบ</button></div></div>`}).join(""):`<div class="item"><small>ยังไม่มีข้อมูล</small></div>`;
  $$(".recent-edit").forEach(b=>b.onclick=()=>openRecord(b.dataset.id));
  $$(".recent-del").forEach(b=>b.onclick=()=>deleteRecordById(b.dataset.id));
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
  $("#recordsBody").innerHTML=a.length?a.map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${typeLabel(r.type)}</td><td>${recordVal(r)}</td><td>${esc(r.unit||"")}</td><td title="${esc(r.note||"")}">${esc(compactNote(r))}</td><td><button class="btn mini edit-rec" data-id="${r.id}">แก้</button> <button class="btn mini del-rec" data-id="${r.id}">ลบ</button></td></tr>`).join(""):`<tr><td colspan="6" class="muted">ยังไม่มีข้อมูล</td></tr>`;
  $$(".edit-rec").forEach(b=>b.onclick=()=>openRecord(b.dataset.id));
  $$(".del-rec").forEach(b=>b.onclick=()=>deleteRecordById(b.dataset.id));
}
$("#recordSearch").oninput=renderRecords;
$("#addRecordBtn").onclick=()=>openRecord();
$("#cleanupRecordsBtn").onclick=()=>{
  let changed=0;
  db.records=db.records.map(r=>{
    if(!isVital(r.type))return r;
    const compact=compactNote(r);
    if(compact && compact!==r.note && /Reference:|AI flag:|Validation:|Confidence:|Status:|Source:/i.test(String(r.note||""))){
      changed++;return {...r,raw_note:r.raw_note||r.note,note:compact,updated_at:new Date().toISOString()};
    }
    return r;
  });
  if(changed){save();alert(`จัดระเบียบแล้ว ${changed} รายการ\nข้อความต้นฉบับยังเก็บไว้ใน raw_note`)}
  else alert("ไม่พบ Vital Signs ที่ต้องจัดระเบียบ");
};
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
$("#recordType").onchange=()=>{$("#recordUnit").value=guessUnit($("#recordType").value)||$("#recordUnit").value}
$("#recordForm").onsubmit=e=>{
  e.preventDefault();
  const id=$("#recordId").value||uid(), old=db.records.find(r=>r.id===id);
  const rec={id,date:new Date($("#recordDate").value).toISOString(),type:$("#recordType").value,value:numOrText($("#recordValue").value),value2:numOrText($("#recordValue2").value),unit:$("#recordUnit").value.trim(),note:$("#recordNote").value.trim(),created_at:old?.created_at||new Date().toISOString(),updated_at:new Date().toISOString()};
  if(old)db.records=db.records.map(r=>r.id===id?rec:r); else db.records.push(rec);
  save();$("#recordDialog").close();
}
function setQuickDate(){
  const el=$("#quickDate"); if(!el)return;
  const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());el.value=d.toISOString().slice(0,16);
}
setQuickDate();
if($("#quickUpdateForm"))$("#quickUpdateForm").onsubmit=e=>{
  e.preventDefault();
  const date=new Date($("#quickDate").value);
  if(isNaN(date)){ $("#quickUpdateStatus").textContent="วันที่/เวลาไม่ถูกต้อง"; return; }
  const vals={weight:$("#quickWeight").value,height:$("#quickHeight").value,pulse:$("#quickPulse").value};
  const sys=$("#quickSys").value,dia=$("#quickDia").value;
  if((sys&&!dia)||(!sys&&dia)){ $("#quickUpdateStatus").textContent="ความดันต้องกรอกทั้ง SYS และ DIA"; return; }
  const now=new Date().toISOString(), add=(type,value,value2=null)=>db.records.push({id:uid(),date:date.toISOString(),type,value:Number(value),value2:value2===null?null:Number(value2),unit:guessUnit(type),note:"อัปเดตจาก Dashboard v9.0",created_at:now,updated_at:now});
  let count=0;
  for(const [type,value] of Object.entries(vals)){if(value!==""){add(type,value);count++;}}
  if(sys&&dia){add("blood_pressure",sys,dia);count++;}
  if(!count){ $("#quickUpdateStatus").textContent="กรอกอย่างน้อย 1 ค่าเพื่อบันทึก"; return; }
  save();
  ["#quickWeight","#quickHeight","#quickSys","#quickDia","#quickPulse"].forEach(id=>$(id).value="");
  setQuickDate();
  $("#quickUpdateStatus").textContent=`บันทึกแล้ว ${count} รายการ`;
};

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
  if(["height","ส่วนสูง","ความสูง","stature"].includes(s))return "height";
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
  if(["weight","height","blood_pressure","pulse","glucose"].includes(r.type)&&!Number.isFinite(Number(r.value)))errors.push("ค่า 1 ไม่ใช่ตัวเลข");
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
  for(const f of docs){
    const id=uid();
    const dup=db.documents.find(d=>d.name===f.name && d.size===f.size);
    if(dup){
      try{await idbPutFile(dup.id,f);dup.hasBlob=true;dup.type=f.type||guessMimeFromName(f.name);dup.date=new Date().toISOString();dup.note="Ready for Smart Import (file restored)"}catch(err){console.warn(err)}
      continue;
    }
    db.documents.push({id,name:f.name,type:f.type||guessMimeFromName(f.name),size:f.size,date:new Date().toISOString(),note:"Ready for Smart Import",hasBlob:true});
    try{await idbPutFile(id,f)}catch(err){console.warn("IndexedDB file save failed",err);db.documents.at(-1).hasBlob=false;db.documents.at(-1).note="Metadata only — browser file storage failed"}
  }
  if(docs.length)save();
  if(dataFiles.length){
    const f=dataFiles[0],text=await f.text();
    try{const parsed=/\.json$/i.test(f.name)||f.type==="application/json"?normalizeJson(JSON.parse(text)):parseCSV(text);setImportData(parsed,f.name)}
    catch(e){alert("อ่านไฟล์ไม่ได้: "+e.message)}
  } else if(docs.length){alert(`เพิ่มเอกสาร ${docs.length} ไฟล์ใน Document Inbox แล้ว`);go("files")}
}
$("#pasteImportBtn").onclick=()=>$("#pasteDialog").showModal();
$("#pasteForm").onsubmit=e=>{e.preventDefault();setImportData(parseCSV($("#pasteText").value),"pasted.csv");$("#pasteDialog").close()};
$("#downloadTemplate").onclick=()=>downloadText("health-import-template.csv","date,type,value,value2,unit,note\n2026-08-11T08:00:00,blood_pressure,128,82,mmHg,morning\n2026-08-11T08:05:00,weight,80,,kg,\n2026-08-11T08:06:00,height,170,,cm,\n");
function downloadText(name,text,type="text/plain"){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

function renderMeds(){
  $("#medList").innerHTML=db.medications.length?db.medications.map(m=>`<div class="item"><strong>${esc(m.name)}</strong><small>${esc(m.dose||"")} ${m.time?`• ${esc(m.time)}`:""} ${m.note?`• ${esc(m.note)}`:""}</small><div><button class="btn mini del-med" data-id="${m.id}">ลบ</button></div></div>`).join(""):`<div class="item"><small>ยังไม่มีรายการยา</small></div>`;
  $("#reminderList").innerHTML=db.medications.filter(m=>m.time).length?db.medications.filter(m=>m.time).sort((a,b)=>a.time.localeCompare(b.time)).map(m=>`<div class="item"><strong>${esc(m.time)} • ${esc(m.name)}</strong><small>${esc(m.dose||"")}</small></div>`).join(""):`<div class="item"><small>ยังไม่มีเวลาเตือน</small></div>`;
  $$(".del-med").forEach(b=>b.onclick=()=>{db.medications=db.medications.filter(m=>m.id!==b.dataset.id);save()});
}
$("#addMedBtn").onclick=()=>{$("#medForm").reset();$("#medDialog").showModal()};
$("#medForm").onsubmit=e=>{e.preventDefault();db.medications.push({id:uid(),name:$("#medName").value.trim(),dose:$("#medDose").value.trim(),time:$("#medTime").value,note:$("#medNote").value.trim(),created_at:new Date().toISOString()});save();$("#medDialog").close()}

async function renderFiles(){
  const box=$("#fileList");
  if(!db.documents.length){box.innerHTML=`<div class="item"><small>ยังไม่มีเอกสาร</small></div>`;return}
  const docs=[...db.documents].sort((a,b)=>new Date(b.date)-new Date(a.date));
  box.innerHTML=docs.map(f=>`<div class="file-card" data-doc="${f.id}">
    <span class="smart-badge">Smart Import</span>
    <div class="file-thumb" id="thumb-${f.id}"><span class="muted">${isPdfDoc(f)?"PDF":isHeicDoc(f)?"HEIC":"IMG"}</span></div>
    <strong>${esc(f.name)}</strong>
    <small>${Math.round(f.size/1024)} KB • ${fmtDate(f.date)}</small>
    <p class="muted">${esc(f.note||"")}</p>
    <div class="file-actions">
      <button class="btn mini preview-file" data-id="${f.id}">เปิดดู</button>
      <button class="btn mini primary smart-read" data-id="${f.id}">อ่านข้อมูล</button>
      <button class="btn mini del-file" data-id="${f.id}">ลบ</button>
    </div>
  </div>`).join("");
  $$(".del-file").forEach(b=>b.onclick=async()=>{if(confirm("ลบเอกสารนี้?")){await idbDeleteFile(b.dataset.id);db.documents=db.documents.filter(f=>f.id!==b.dataset.id);save()}});
  $$(".preview-file").forEach(b=>b.onclick=()=>openSmartDoc(b.dataset.id,false));
  $$(".smart-read").forEach(b=>b.onclick=()=>openSmartDoc(b.dataset.id,true));
  // Load lightweight thumbnails lazily.
  for(const f of docs.slice(0,12)){
    try{
      const blob=await idbGetFile(f.id); if(!blob) continue;
      const thumb=$("#thumb-"+CSS.escape(f.id));
      if(!thumb)continue;
      if(!isPdfDoc(f)){
        const jpeg=await ensureBrowserImage(blob,f);
        const url=URL.createObjectURL(jpeg);
        thumb.innerHTML=`<img src="${url}" alt="">`;
      }
    }catch(e){console.warn("thumb",f.name,e)}
  }
}

function exportData(){downloadText(`personal-healthcare-v9.2-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({version:"9.2",exported_at:new Date().toISOString(),...db},null,2),"application/json")}
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
function loadSettings(){
  const c=getCfg();$("#supabaseUrl").value=c.url||"";$("#supabaseKey").value=c.key||"";
  const a=getAiCfg(); if($("#aiFunctionUrl"))$("#aiFunctionUrl").value=a.functionUrl||deriveAiFunctionUrl(c.url||""); if($("#aiAnonKey"))$("#aiAnonKey").value=a.anonKey||c.key||"";
}

function renderAll(){renderDashboard();renderRecords();renderMeds();renderFiles();loadSettings();renderWeightManagement()}
renderAll();syncBadge();setImportStep(1);


/* ---------------- v8.1 Smart Document Import ---------------- */
let currentOcrDoc=null, detectedRows=[];

function guessMimeFromName(name){
  const n=String(name||"").toLowerCase();
  if(n.endsWith(".heic")||n.endsWith(".heif"))return "image/heic";
  if(n.endsWith(".pdf"))return "application/pdf";
  if(n.endsWith(".png"))return "image/png";
  if(n.endsWith(".jpg")||n.endsWith(".jpeg"))return "image/jpeg";
  return "application/octet-stream";
}
function isHeicDoc(f){const s=(f.type+" "+f.name).toLowerCase();return s.includes("heic")||s.includes("heif")}
function isPdfDoc(f){const s=(f.type+" "+f.name).toLowerCase();return s.includes("pdf")}
function openFileDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(FILE_DB,1);
    req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(FILE_STORE))d.createObjectStore(FILE_STORE)};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
async function idbPutFile(id,file){const d=await openFileDb();return new Promise((res,rej)=>{const tx=d.transaction(FILE_STORE,"readwrite");tx.objectStore(FILE_STORE).put(file,id);tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error)})}
async function idbGetFile(id){const d=await openFileDb();return new Promise((res,rej)=>{const q=d.transaction(FILE_STORE).objectStore(FILE_STORE).get(id);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}
async function idbDeleteFile(id){const d=await openFileDb();return new Promise((res,rej)=>{const tx=d.transaction(FILE_STORE,"readwrite");tx.objectStore(FILE_STORE).delete(id);tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error)})}

async function ensureBrowserImage(blob,doc){
  if(isHeicDoc(doc)||String(blob.type).includes("heic")||String(blob.type).includes("heif")){
    if(typeof heic2any!=="function")throw new Error("โหลด HEIC converter ไม่สำเร็จ");
    let out=await heic2any({blob,toType:"image/jpeg",quality:.9});
    if(Array.isArray(out))out=out[0];
    return out;
  }
  return blob;
}
function setOcrProgress(p,text){
  $("#ocrProgressBar").style.width=Math.max(0,Math.min(100,p))+"%";
  $("#ocrProgressText").textContent=text||"";
}
async function openSmartDoc(id,runOcr=true){
  const doc=db.documents.find(x=>x.id===id); if(!doc)return;
  currentOcrDoc=doc;detectedRows=[];
  $("#ocrFileName").textContent=doc.name;$("#ocrText").value="";$("#detectedBody").innerHTML="";
  $("#ocrStatus").textContent="";setOcrProgress(0,"กำลังเปิดไฟล์…");
  $("#ocrDialog").showModal();

  const blob=await idbGetFile(id);
  if(!blob){
    $("#ocrPreview").innerHTML=`<div class="notice warn">ไฟล์นี้มาจาก v8.0 ซึ่งเก็บไว้เพียง metadata กรุณาอัปโหลดไฟล์นี้อีกครั้งใน v8.1 เพื่อให้ระบบอ่านไฟล์จริง</div>`;
    $("#ocrStatus").textContent="ต้องอัปโหลดไฟล์นี้ใหม่ 1 ครั้ง";
    return;
  }
  try{
    if(isPdfDoc(doc)){
      await previewPdf(blob);
      if(runOcr)await smartReadPdf(blob);
    }else{
      const imgBlob=await ensureBrowserImage(blob,doc);
      const url=URL.createObjectURL(imgBlob);
      $("#ocrPreview").innerHTML=`<img id="ocrImagePreview" src="${url}" alt="${esc(doc.name)}">`;
      setOcrProgress(8,"Preview พร้อม");
      if(runOcr)await smartReadImage(imgBlob);
    }
  }catch(e){
    const heic=isHeicDoc(doc);
    if(heic){
      $("#ocrPreview").innerHTML=`<div class="notice warn"><strong>iPad อ่าน HEIC ไฟล์นี้ไม่ได้</strong><br>ไม่ใช่ข้อมูลเสีย แต่ตัวถอดรหัส HEIC ใน browser ไม่รองรับไฟล์นี้<br><br><strong>วิธีที่เสถียร:</strong> เปิดรูปใน Photos → Share/Save/Export เป็น JPEG หรือใช้ Screenshot แล้วอัปโหลด JPG/PNG จากนั้นกด “อ่านข้อมูล” อีกครั้ง</div>`;
      $("#ocrStatus").textContent="HEIC decoder ไม่รองรับไฟล์นี้ — ใช้ JPG/PNG สำหรับ OCR";
    }else{
      $("#ocrStatus").textContent="อ่านไฟล์ไม่สำเร็จ: "+e.message;
    }
    setOcrProgress(0,"เปิดไฟล์ไม่สำเร็จ");
  }
}
async function smartReadImage(blob){
  if(!window.Tesseract)throw new Error("OCR library ยังโหลดไม่สำเร็จ ลอง Refresh แล้วกดอีกครั้ง");
  setOcrProgress(12,"เริ่ม OCR…");
  const result=await Tesseract.recognize(blob,"eng",{
    logger:m=>{
      if(m.status==="recognizing text")setOcrProgress(15+Math.round((m.progress||0)*75),`OCR ${Math.round((m.progress||0)*100)}%`);
      else setOcrProgress(12,m.status||"กำลังประมวลผล");
    }
  });
  const text=result?.data?.text||"";
  $("#ocrText").value=text;
  setOcrProgress(92,"กำลังวิเคราะห์ค่าจากข้อความ…");
  detectedRows=parseHealthText(text,currentOcrDoc);
  renderDetectedRows();
  setOcrProgress(100,`อ่านเสร็จ • พบ ${detectedRows.length} รายการ`);
}
async function loadPdfJs(){
  const pdfjs=await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/build/pdf.worker.mjs";
  return pdfjs;
}
async function getPdf(blob){
  const pdfjs=await loadPdfJs();
  return pdfjs.getDocument({data:await blob.arrayBuffer()}).promise;
}
async function previewPdf(blob){
  const pdf=await getPdf(blob),page=await pdf.getPage(1),vp=page.getViewport({scale:1.25});
  const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");canvas.width=vp.width;canvas.height=vp.height;
  await page.render({canvasContext:ctx,viewport:vp}).promise;
  $("#ocrPreview").innerHTML="";$("#ocrPreview").appendChild(canvas);
  setOcrProgress(8,`PDF ${pdf.numPages} หน้า • Preview หน้า 1`);
}
async function smartReadPdf(blob){
  const pdf=await getPdf(blob),texts=[],maxPages=Math.min(pdf.numPages,8);
  for(let i=1;i<=maxPages;i++){
    setOcrProgress(10+Math.round((i-1)/maxPages*75),`อ่าน PDF หน้า ${i}/${maxPages}`);
    const page=await pdf.getPage(i),content=await page.getTextContent();
    let t=content.items.map(x=>x.str).join(" ").trim();
    if(t.length<80 && window.Tesseract){
      const vp=page.getViewport({scale:1.6}),canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");canvas.width=vp.width;canvas.height=vp.height;
      await page.render({canvasContext:ctx,viewport:vp}).promise;
      const o=await Tesseract.recognize(canvas,"eng");
      t=o?.data?.text||t;
    }
    texts.push(`--- Page ${i} ---\n${t}`);
  }
  const text=texts.join("\n\n");$("#ocrText").value=text;
  detectedRows=parseHealthText(text,currentOcrDoc);renderDetectedRows();setOcrProgress(100,`อ่าน PDF เสร็จ • พบ ${detectedRows.length} รายการ`);
}
function parseAnyDate(text){
  const s=String(text||"");
  const iso=s.match(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/);
  if(iso){const d=new Date(`${iso[1]}-${iso[2].padStart(2,"0")}-${iso[3].padStart(2,"0")}T08:00:00`);if(!isNaN(d))return d.toISOString()}
  const uk=s.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})\b/);
  if(uk){const d=new Date(`${uk[3]}-${uk[2].padStart(2,"0")}-${uk[1].padStart(2,"0")}T08:00:00`);if(!isNaN(d))return d.toISOString()}
  return new Date().toISOString();
}
function mkDetected(type,value,value2,unit,note,date){
  return {selected:true,type,value:value??"",value2:value2??"",unit:unit||guessUnit(type),note:note||"",date:date||new Date().toISOString()};
}
function parseHealthText(text,doc){
  const raw=String(text||""),norm=raw.replace(/[|]/g," ").replace(/\s+/g," ");
  const date=parseAnyDate(norm),rows=[],seen=new Set();
  const add=r=>{const sig=[r.type,r.value,r.value2,r.unit].join("|");if(!seen.has(sig)){seen.add(sig);rows.push(r)}};

  // Blood pressure: labels or 3-number monitor layouts (SBP/DBP/Pulse)
  let m;
  const bpPatterns=[
    /(?:blood\s*pressure|bp|systolic|sys)[^\d]{0,20}(\d{2,3})\D{1,12}(?:diastolic|dia)?[^\d]{0,10}(\d{2,3})/ig,
    /\b(\d{2,3})\s*\/\s*(\d{2,3})\s*(?:mmhg)?\b/ig
  ];
  for(const rx of bpPatterns)while((m=rx.exec(norm))){
    const s=+m[1],d=+m[2];if(s>=70&&s<=260&&d>=35&&d<=160&&s>d)add(mkDetected("blood_pressure",s,d,"mmHg","อ่านจาก "+(doc?.name||"เอกสาร"),date));
  }
  // Weight
  const wrx=/(?:weight|น้ำหนัก)[^\d]{0,20}(\d{2,3}(?:\.\d+)?)\s*(kg|kgs|kilograms?)?/ig;
  while((m=wrx.exec(norm))){const v=+m[1];if(v>=25&&v<=300)add(mkDetected("weight",v,null,"kg","อ่านจาก "+(doc?.name||"เอกสาร"),date))}
  // Height — first-class health metric in v8.6, never a lab result
  const hrx=/(?:height|stature|ส่วนสูง|ความสูง)[^\d]{0,20}(\d{2,3}(?:\.\d+)?)\s*(cm|centimeters?|ซม\.?|เซนติเมตร)?/ig;
  while((m=hrx.exec(norm))){const v=+m[1];if(v>=80&&v<=250)add(mkDetected("height",v,null,"cm","อ่านจาก "+(doc?.name||"เอกสาร"),date))}
  // Pulse / heart rate
  const prx=/(?:pulse|heart\s*rate|hr|ชีพจร)[^\d]{0,20}(\d{2,3})\s*(?:bpm)?/ig;
  while((m=prx.exec(norm))){const v=+m[1];if(v>=30&&v<=220)add(mkDetected("pulse",v,null,"bpm","อ่านจาก "+(doc?.name||"เอกสาร"),date))}
  // Glucose
  const grx=/(?:glucose|blood\s*sugar|น้ำตาล)[^\d]{0,25}(\d{2,3}(?:\.\d+)?)\s*(mg\/dl|mmol\/l)?/ig;
  while((m=grx.exec(norm))){let unit=(m[2]||"mg/dL");add(mkDetected("glucose",+m[1],null,unit,"อ่านจาก "+(doc?.name||"เอกสาร"),date))}
  // Common labs
  const labs=[
    ["HbA1c",/(?:hba1c)[^\d]{0,18}(\d{1,2}(?:\.\d+)?)\s*(%|mmol\/mol)?/i],
    ["Total cholesterol",/(?:total\s*cholesterol|cholesterol)[^\d]{0,22}(\d{1,3}(?:\.\d+)?)\s*(mg\/dl|mmol\/l)?/i],
    ["LDL",/\bldl\b[^\d]{0,18}(\d{1,3}(?:\.\d+)?)\s*(mg\/dl|mmol\/l)?/i],
    ["HDL",/\bhdl\b[^\d]{0,18}(\d{1,3}(?:\.\d+)?)\s*(mg\/dl|mmol\/l)?/i],
    ["Triglycerides",/(?:triglycerides?|tg)\b[^\d]{0,18}(\d{1,4}(?:\.\d+)?)\s*(mg\/dl|mmol\/l)?/i],
    ["Creatinine",/\bcreatinine\b[^\d]{0,18}(\d{1,4}(?:\.\d+)?)\s*(mg\/dl|umol\/l|µmol\/l)?/i],
  ];
  for(const [label,rx] of labs){const x=norm.match(rx);if(x)add(mkDetected("lab",+x[1],null,x[2]||"",label+" • อ่านจาก "+(doc?.name||"เอกสาร"),date))}
  return rows;
}
function renderDetectedRows(){
  const body=$("#detectedBody");
  if(!detectedRows.length){
    body.innerHTML=`<tr><td colspan="8"><div class="notice warn">ยังไม่พบค่าที่ระบบมั่นใจ คุณสามารถกด “+ เพิ่มแถว” แล้วกรอกค่าจากเอกสารได้</div></td></tr>`;
    $("#ocrStatus").textContent="ไม่พบค่าที่ระบุได้อัตโนมัติ";
    return;
  }
  body.innerHTML=detectedRows.map((r,i)=>`<tr data-i="${i}">
    <td><input type="checkbox" class="d-use" ${r.selected?"checked":""}></td>
    <td><select class="d-type">
      ${["blood_pressure","weight","height","pulse","glucose","lab","exercise","note"].map(t=>`<option value="${t}" ${r.type===t?"selected":""}>${typeLabel(t)}</option>`).join("")}
    </select></td>
    <td><input class="d-date date-input" type="datetime-local" value="${toLocalInput(r.date)}"></td>
    <td><input class="d-v1" type="number" step="any" value="${esc(r.value)}"></td>
    <td><input class="d-v2" type="number" step="any" value="${esc(r.value2??"")}"></td>
    <td><input class="d-unit" value="${esc(r.unit||"")}"></td>
    <td><input class="d-note note-input" value="${esc(r.note||"")}"></td>
    <td><button type="button" class="btn mini d-remove">ลบ</button></td>
  </tr>`).join("");
  $$("#detectedBody tr").forEach(tr=>{
    $$("input,select",tr).forEach(el=>el.onchange=()=>syncDetectedFromTable());
    $(".d-remove",tr).onclick=()=>{detectedRows.splice(Number(tr.dataset.i),1);renderDetectedRows()};
  });
  $("#ocrStatus").textContent=`พบ ${detectedRows.length} รายการ • กรุณาตรวจค่าก่อน Save`;
}
function syncDetectedFromTable(){
  detectedRows=$$("#detectedBody tr[data-i]").map(tr=>({
    selected:$(".d-use",tr).checked,type:$(".d-type",tr).value,
    date:new Date($(".d-date",tr).value).toISOString(),
    value:numOrText($(".d-v1",tr).value),value2:numOrText($(".d-v2",tr).value),
    unit:$(".d-unit",tr).value.trim(),note:$(".d-note",tr).value.trim()
  }));
}
$("#reanalyzeTextBtn").onclick=()=>{detectedRows=parseHealthText($("#ocrText").value,currentOcrDoc);renderDetectedRows()};
$("#addDetectedRowBtn").onclick=()=>{syncDetectedFromTable();detectedRows.push(mkDetected("lab","","","","กรอกจาก "+(currentOcrDoc?.name||"เอกสาร"),new Date().toISOString()));renderDetectedRows()};
$("#saveDetectedBtn").onclick=()=>{
  syncDetectedFromTable();
  const selected=detectedRows.filter(r=>r.selected);
  if(!selected.length){$("#ocrStatus").textContent="ยังไม่ได้เลือกรายการที่จะ Save";return}
  const existing=new Set(db.records.map(signature));let saved=0,skipped=0;
  for(const r of selected){
    const rec={id:uid(),date:r.date,type:r.type,value:r.value,value2:r.value2,unit:r.unit,note:r.note,source:currentOcrDoc?.name||"Smart Import",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    const err=validateRec(rec); if(err.length||existing.has(signature(rec))){skipped++;continue}
    db.records.push(rec);existing.add(signature(rec));saved++;
  }
  if(currentOcrDoc){currentOcrDoc.note=`Smart Import: saved ${saved} record(s)`;currentOcrDoc.last_ocr_at=new Date().toISOString()}
  save();$("#ocrStatus").textContent=`บันทึกสำเร็จ ${saved} รายการ${skipped?` • ข้าม ${skipped}`:""}`;
  setTimeout(()=>{$("#ocrDialog").close();go("dashboard")},650);
};


console.info("Personal Healthcare v8.1.1 Smart Import hotfix loaded");

console.info("Personal Healthcare v8.1.2 Image Import Fix loaded");


/* ================= v8.2 AI Health Report ================= */
const AI_CFG="ph_v82_ai_cfg";
let aiPhotos=[], aiResult=null;

function getAiCfg(){try{return JSON.parse(localStorage.getItem(AI_CFG)||"{}")}catch{return {}}}
function deriveAiFunctionUrl(supabaseUrl){
  const u=String(supabaseUrl||"").replace(/\/$/,"");
  return u?`${u}/functions/v1/analyze-health-report`:"";
}
function saveAiCfg(){
  localStorage.setItem(AI_CFG,JSON.stringify({
    functionUrl:$("#aiFunctionUrl").value.trim(),
    anonKey:$("#aiAnonKey").value.trim()
  }));
}
if($("#saveAiConfig"))$("#saveAiConfig").onclick=()=>{
  saveAiCfg();$("#aiConfigStatus").textContent="บันทึก AI Config แล้ว";
};
if($("#testAiFunction"))$("#testAiFunction").onclick=async()=>{
  saveAiCfg(); const c=getAiCfg(); $("#aiConfigStatus").textContent="กำลังทดสอบ...";
  if(!c.functionUrl||!c.anonKey){$("#aiConfigStatus").textContent="กรุณาใส่ Function URL และ Anon Key";return}
  try{
    const r=await fetch(c.functionUrl,{method:"OPTIONS",headers:{apikey:c.anonKey,Authorization:`Bearer ${c.anonKey}`}});
    $("#aiConfigStatus").textContent=r.ok||r.status===204?"Function ตอบสนองแล้ว":"Function ตอบกลับ "+r.status;
  }catch(e){$("#aiConfigStatus").textContent="เชื่อมต่อไม่ได้: "+e.message}
};

function setAiProgress(p,text){
  $("#aiProgressWrap").hidden=false;
  $("#aiProgressBar").style.width=Math.max(0,Math.min(100,p))+"%";
  $("#aiProgressText").textContent=text||"";
}
async function fileToJpegDataUrl(file,maxSide=1800,quality=.86){
  // iOS Safari can often decode camera HEIC natively even when libheif JS cannot.
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();
    img.decoding="async";
    await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(new Error("อุปกรณ์ไม่สามารถเปิดรูปนี้ได้"));img.src=url});
    const scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
    const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
    const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext("2d",{alpha:false});ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
    return canvas.toDataURL("image/jpeg",quality);
  }finally{URL.revokeObjectURL(url)}
}
async function addAiFiles(files){
  for(const f of files){
    if(!String(f.type).startsWith("image/") && !/\.(heic|heif|jpe?g|png|webp)$/i.test(f.name))continue;
    try{
      const dataUrl=await fileToJpegDataUrl(f);
      aiPhotos.push({id:uid(),name:f.name,dataUrl,originalSize:f.size});
    }catch(e){
      alert(`${f.name}: ${e.message}\nถ้าเป็น HEIC ให้เปิดรูปแล้ว Screenshot จากนั้นเลือกรูป Screenshot แทน`);
    }
  }
  renderAiPhotos();
}
function renderAiPhotos(){
  const box=$("#aiPhotoGrid");
  box.innerHTML=aiPhotos.map((p,i)=>`<div class="ai-photo"><img src="${p.dataUrl}" alt=""><button type="button" data-i="${i}">×</button></div>`).join("");
  $$("button",box).forEach(b=>b.onclick=()=>{aiPhotos.splice(Number(b.dataset.i),1);renderAiPhotos()});
  $("#analyzeAiBtn").disabled=!aiPhotos.length;
}
if($("#cameraInput"))$("#cameraInput").onchange=e=>{addAiFiles([...e.target.files]);e.target.value=""};
if($("#galleryInput"))$("#galleryInput").onchange=e=>{addAiFiles([...e.target.files]);e.target.value=""};
if($("#clearAiPhotosBtn"))$("#clearAiPhotosBtn").onclick=()=>{aiPhotos=[];aiResult=null;renderAiPhotos();resetAiAnalysis()};

function resetAiAnalysis(){
  $("#aiEmptyState").hidden=false;$("#aiAnalysis").hidden=true;$("#aiReviewPanel").hidden=true;$("#aiProgressWrap").hidden=true;
}
function aiFlagLabel(f){return ({normal:"ปกติ/ในช่วง",high:"สูง",low:"ต่ำ",abnormal:"ผิดช่วง",unknown:"ไม่ทราบ"})[f]||f||"ไม่ทราบ"}
function overallLabel(s){return ({normal:"ไม่มีจุดเด่นจากข้อมูลที่อ่านได้",follow_up:"ควรติดตาม",urgent:"ควรประเมินเร่งด่วน",unknown:"ต้องตรวจสอบ"})[s]||"ต้องตรวจสอบ"}
function confidenceClass(c){const n=Number(c);return n>=.85?"high":n>=.65?"medium":"low"}

async function analyzeAiPhotos(){
  const cfg=getAiCfg(), base=getCfg();
  const url=cfg.functionUrl||deriveAiFunctionUrl(base.url), key=cfg.anonKey||base.key;
  if(!url||!key){
    go("settings");
    $("#aiConfigStatus").textContent="ต้องตั้งค่า Edge Function URL และ Supabase Anon Key ก่อนใช้ AI";
    return;
  }
  if(!aiPhotos.length)return;
  $("#analyzeAiBtn").disabled=true;setAiProgress(12,"กำลังเตรียมภาพสำหรับ AI...");
  try{
    const payload={images:aiPhotos.map((p,i)=>({name:p.name||`page-${i+1}.jpg`,data_url:p.dataUrl})),language:"th"};
    setAiProgress(28,`กำลังส่ง ${aiPhotos.length} รูปไปวิเคราะห์...`);
    const res=await fetch(url,{
      method:"POST",
      headers:{"Content-Type":"application/json",apikey:key,Authorization:`Bearer ${key}`},
      body:JSON.stringify(payload)
    });
    const raw=await res.text();
    if(!res.ok)throw new Error(`${res.status}: ${raw.slice(0,300)}`);
    let data;try{data=JSON.parse(raw)}catch{throw new Error("Function ส่งข้อมูลกลับมาไม่ใช่ JSON")}
    if(data.error)throw new Error(data.error);
    aiResult=data;
    setAiProgress(92,"กำลังสร้าง Review...");
    renderAiResult();
    setAiProgress(100,"วิเคราะห์เสร็จแล้ว — กรุณาตรวจเทียบต้นฉบับก่อน Save");
  }catch(e){
    $("#aiProgressText").textContent="วิเคราะห์ไม่สำเร็จ: "+e.message;
    alert("AI วิเคราะห์ไม่สำเร็จ\n"+e.message);
  }finally{$("#analyzeAiBtn").disabled=!aiPhotos.length}
}
if($("#analyzeAiBtn"))$("#analyzeAiBtn").onclick=analyzeAiPhotos;

function renderAiResult(){
  const r=aiResult||{};
  $("#aiEmptyState").hidden=true;$("#aiAnalysis").hidden=false;$("#aiReviewPanel").hidden=false;
  $("#aiSummaryTitle").textContent=r.report_title||"ผลตรวจสุขภาพ";
  $("#aiSummaryText").textContent=r.summary_th||"AI อ่านข้อมูลจากเอกสารแล้ว กรุณาตรวจรายการด้านล่าง";
  const overall=r.overall_status||"unknown",badge=$("#aiOverallBadge");
  badge.className=`status-badge ${overall}`;badge.textContent=overallLabel(overall);

  const alerts=Array.isArray(r.alerts)?r.alerts:[];
  $("#aiAlerts").innerHTML=alerts.length?alerts.map(a=>`<div class="ai-alert ${esc(a.level||"info")}"><strong>${esc(a.title||"สิ่งที่ควรติดตาม")}</strong><small>${esc(a.message_th||"")}</small></div>`).join(""):`<div class="item"><small>ไม่พบคำเตือนเด่นจากข้อมูลที่ AI อ่านได้</small></div>`;

  const rows=Array.isArray(r.results)?r.results:[];
  $("#aiResultsBody").innerHTML=rows.length?rows.map((x,i)=>`<tr data-i="${i}">
    <td><input type="checkbox" class="air-use" ${x.confidence>=.55?"checked":""}></td>
    <td><input class="air-name ai-name" value="${esc(x.name||"")}"></td>
    <td><input class="air-value" value="${esc(x.value_text??x.value??"")}"></td>
    <td><input class="air-unit" value="${esc(x.unit||"")}"></td>
    <td><input class="air-ref ai-ref" value="${esc(x.reference_range||"")}"></td>
    <td><select class="air-flag">${["normal","high","low","abnormal","unknown"].map(f=>`<option value="${f}" ${x.flag===f?"selected":""}>${aiFlagLabel(f)}</option>`).join("")}</select></td>
    <td><span class="confidence ${confidenceClass(x.confidence)}">${Math.round((Number(x.confidence)||0)*100)}%</span></td>
    <td><input class="air-note ai-note" value="${esc(x.note_th||"")}"></td>
  </tr>`).join(""):`<tr><td colspan="8">AI ไม่พบค่าที่เป็นโครงสร้างจากภาพนี้</td></tr>`;
  $("#aiSaveStatus").textContent=`พบ ${rows.length} รายการ • วันที่เอกสาร: ${r.document_date||"ไม่ทราบ"}`;
}
if($("#selectAllAiBtn"))$("#selectAllAiBtn").onclick=()=>$$(".air-use").forEach(x=>x.checked=true);
if($("#deselectAllAiBtn"))$("#deselectAllAiBtn").onclick=()=>$$(".air-use").forEach(x=>x.checked=false);

function mapAiToRecord(name,valueText,unit,note,date){
  const n=String(name||"").toLowerCase();
  let type="lab", value=numOrText(String(valueText).replace(/,/g,"").match(/-?\d+(?:\.\d+)?/)?.[0]||valueText), value2=null;
  if(/weight|น้ำหนัก/.test(n))type="weight";
  else if(/height|stature|ส่วนสูง|ความสูง/.test(n))type="height";
  else if(/pulse|heart rate|ชีพจร/.test(n))type="pulse";
  else if(/glucose|blood sugar|น้ำตาล/.test(n))type="glucose";
  else if(/blood pressure|ความดัน/.test(n)){
    type="blood_pressure";const m=String(valueText).match(/(\d{2,3})\s*\/\s*(\d{2,3})/);if(m){value=+m[1];value2=+m[2]}
  }
  return {id:uid(),date:date||new Date().toISOString(),type,value,value2,unit:unit||guessUnit(type),note,source:"AI Health Report v8.2",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
}
if($("#saveAiResultsBtn"))$("#saveAiResultsBtn").onclick=()=>{
  if(!aiResult)return;
  const trs=$$("#aiResultsBody tr[data-i]"),existing=new Set(db.records.map(signature));let saved=0,skipped=0;
  let docDate=aiResult.document_date?new Date(aiResult.document_date+"T08:00:00"):new Date();
  if(isNaN(docDate))docDate=new Date();
  for(const tr of trs){
    if(!$(".air-use",tr).checked)continue;
    const i=Number(tr.dataset.i),orig=aiResult.results[i]||{};
    const name=$(".air-name",tr).value.trim(),value=$(".air-value",tr).value.trim(),unit=$(".air-unit",tr).value.trim(),ref=$(".air-ref",tr).value.trim(),flag=$(".air-flag",tr).value,note=$(".air-note",tr).value.trim();
    const fullNote=`${name}${ref?` • Reference: ${ref}`:""} • AI flag: ${flag}${note?` • ${note}`:""} • AI extracted; verify with original report`;
    const rec=mapAiToRecord(name,value,unit,fullNote,docDate.toISOString());
    if(validateRec(rec).length||existing.has(signature(rec))){skipped++;continue}
    db.records.push(rec);existing.add(signature(rec));saved++;
  }
  save();
  $("#aiSaveStatus").textContent=`บันทึกแล้ว ${saved} รายการ${skipped?` • ข้าม ${skipped} รายการ`:""} — เปิด Dashboard เพื่อดูแนวโน้ม`;
  setTimeout(()=>go("dashboard"),700);
};
console.info("Personal Healthcare v8.6 Medical Insight loaded");


/* ================= v8.3 Validation Engine ================= */
function parseReferenceRange(ref){
  const s=String(ref||"").trim().replace(/[–—]/g,"-");
  if(!s)return {kind:"unknown"};
  let m=s.match(/^\s*<\s*([0-9.]+)/); if(m)return {kind:"lt",max:+m[1]};
  m=s.match(/^\s*>\s*([0-9.]+)/); if(m)return {kind:"gt",min:+m[1]};
  m=s.match(/^\s*([0-9.]+)\s*-\s*([0-9.]+)/); if(m)return {kind:"range",min:+m[1],max:+m[2]};
  if(/negative/i.test(s))return {kind:"negative"};
  if(/positive/i.test(s))return {kind:"positive"};
  return {kind:"unknown"};
}
function numericFromText(v){
  const m=String(v??"").replace(/,/g,"").match(/-?\d+(?:\.\d+)?/);
  return m?Number(m[0]):null;
}
function validateAiItem(x){
  const ref=parseReferenceRange(x.reference_range);
  const flag=String(x.flag||"unknown");
  const valueText=String(x.value_text??"");
  const val=numericFromText(valueText);
  let expected="unknown",reason="ยังไม่มี reference range ที่อ่านได้";
  if(ref.kind==="range" && val!==null){
    expected=val<ref.min?"low":val>ref.max?"high":"normal";
    reason=`เทียบ ${val} กับช่วง ${ref.min}-${ref.max}`;
  } else if(ref.kind==="lt" && val!==null){
    expected=val<ref.max?"normal":"high"; reason=`เทียบ ${val} กับเกณฑ์ < ${ref.max}`;
  } else if(ref.kind==="gt" && val!==null){
    expected=val>ref.min?"normal":"low"; reason=`เทียบ ${val} กับเกณฑ์ > ${ref.min}`;
  } else if(ref.kind==="negative"){
    const neg=/negative|ไม่พบ/i.test(valueText); expected=neg?"normal":"abnormal"; reason=`เทียบผล ${valueText} กับเกณฑ์ Negative`;
  } else if(ref.kind==="positive"){
    const pos=/positive|พบ/i.test(valueText); expected=pos?"normal":"abnormal"; reason=`เทียบผล ${valueText} กับเกณฑ์ Positive`;
  }
  if(expected==="unknown")return {state:"unknown",expected,reason};
  const same=(flag===expected)||(flag==="abnormal"&&["high","low","abnormal"].includes(expected));
  if(same)return {state:"validated",expected,reason};
  if(flag==="unknown")return {state:"review",expected,reason:`AI ไม่ระบุ flag; ${reason}`};
  return {state:"mismatch",expected,reason:`AI flag=${flag} แต่จาก reference ควรเป็น ${expected}; ${reason}`};
}
function validationLabel(v){
  return ({validated:"ผ่านอัตโนมัติ",review:"ตรวจเพิ่ม",mismatch:"ไม่ตรง",unknown:"ไม่มีเกณฑ์"})[v.state]||v.state;
}
function updateValidationStats(){
  const rows=$$("#aiResultsBody tr[data-i]");
  let validated=0,review=0,confirmed=0;
  rows.forEach(tr=>{
    const st=tr.dataset.validation;
    if(st==="validated")validated++; else review++;
    if($(".air-use",tr)?.checked)confirmed++;
  });
  if($("#valExtracted"))$("#valExtracted").textContent=rows.length;
  if($("#valValidated"))$("#valValidated").textContent=validated;
  if($("#valNeedsReview"))$("#valNeedsReview").textContent=review;
  if($("#valConfirmed"))$("#valConfirmed").textContent=confirmed;
}

renderAiResult = function(){
  const r=aiResult||{};
  $("#aiEmptyState").hidden=true;$("#aiAnalysis").hidden=false;$("#aiReviewPanel").hidden=false;
  $("#aiSummaryTitle").textContent=r.report_title||"ผลตรวจสุขภาพ";
  $("#aiSummaryText").textContent=r.summary_th||"AI อ่านข้อมูลจากเอกสารแล้ว กรุณาตรวจรายการด้านล่าง";
  const overall=r.overall_status||"unknown",badge=$("#aiOverallBadge");
  badge.className=`status-badge ${overall}`;badge.textContent=overallLabel(overall);

  const alerts=Array.isArray(r.alerts)?r.alerts:[];
  $("#aiAlerts").innerHTML=alerts.length?alerts.map(a=>`<div class="ai-alert ${esc(a.level||"info")}"><strong>${esc(a.title||"สิ่งที่ควรติดตาม")}</strong><small>${esc(a.message_th||"")}</small></div>`).join(""):`<div class="item"><small>ไม่พบคำเตือนเด่นจากข้อมูลที่ AI อ่านได้</small></div>`;

  const rows=Array.isArray(r.results)?r.results:[];
  $("#aiResultsBody").innerHTML=rows.length?rows.map((x,i)=>{
    const v=validateAiItem(x);
    const autoSelect=(Number(x.confidence)>=.55 && v.state!=="mismatch");
    return `<tr data-i="${i}" data-validation="${v.state}" data-validation-reason="${esc(v.reason)}">
      <td><input type="checkbox" class="air-use" ${autoSelect?"checked":""}></td>
      <td><input class="air-name ai-name" value="${esc(x.name||"")}"></td>
      <td><input class="air-value" value="${esc(x.value_text??x.value??"")}"></td>
      <td><input class="air-unit" value="${esc(x.unit||"")}"></td>
      <td><input class="air-ref ai-ref" value="${esc(x.reference_range||"")}"></td>
      <td><select class="air-flag">${["normal","high","low","abnormal","unknown"].map(f=>`<option value="${f}" ${x.flag===f?"selected":""}>${aiFlagLabel(f)}</option>`).join("")}</select></td>
      <td><span class="validation-badge ${v.state}" title="${esc(v.reason)}">${validationLabel(v)}</span></td>
      <td><span class="confidence ${confidenceClass(x.confidence)}">${Math.round((Number(x.confidence)||0)*100)}%</span></td>
      <td><input class="air-note ai-note" value="${esc(x.note_th||"")}"></td>
    </tr>`;
  }).join(""):`<tr><td colspan="9">AI ไม่พบค่าที่เป็นโครงสร้างจากภาพนี้</td></tr>`;
  $("#aiSaveStatus").textContent=`พบ ${rows.length} รายการ • วันที่เอกสาร: ${r.document_date||"ไม่ทราบ"} • ตรวจเทียบ reference อัตโนมัติแล้ว`;
  $$("#aiResultsBody input, #aiResultsBody select").forEach(el=>el.onchange=updateValidationStats);
  updateValidationStats();
};

if($("#selectAllAiBtn"))$("#selectAllAiBtn").onclick=()=>{$$(".air-use").forEach(x=>x.checked=true);updateValidationStats()};
if($("#deselectAllAiBtn"))$("#deselectAllAiBtn").onclick=()=>{$$(".air-use").forEach(x=>x.checked=false);updateValidationStats()};

if($("#saveAiResultsBtn"))$("#saveAiResultsBtn").onclick=()=>{
  if(!aiResult)return;
  const trs=$$("#aiResultsBody tr[data-i]"),existing=new Set(db.records.map(signature));let saved=0,skipped=0;
  let docDate=aiResult.document_date?new Date(aiResult.document_date+"T08:00:00"):new Date();
  if(isNaN(docDate))docDate=new Date();
  for(const tr of trs){
    if(!$(".air-use",tr).checked)continue;
    const i=Number(tr.dataset.i),orig=aiResult.results[i]||{};
    const name=$(".air-name",tr).value.trim(),value=$(".air-value",tr).value.trim(),unit=$(".air-unit",tr).value.trim(),ref=$(".air-ref",tr).value.trim(),flag=$(".air-flag",tr).value,note=$(".air-note",tr).value.trim();
    const validation=tr.dataset.validation||"unknown",vreason=tr.dataset.validationReason||"";
    const confidence=Math.round((Number(orig.confidence)||0)*100);
    const fullNote=`${name}${ref?` • Reference: ${ref}`:""} • AI flag: ${flag} • Validation: ${validation}${vreason?` (${vreason})`:""} • Confidence: ${confidence}%${note?` • ${note}`:""} • Status: confirmed • Source: AI Health Report v9.0`;
    const rec=mapAiToRecord(name,value,unit,fullNote,docDate.toISOString());
    rec.validation_status=validation;
    rec.confirmation_status="confirmed";
    rec.ai_confidence=Number(orig.confidence)||0;
    rec.reference_range=ref;
    rec.ai_flag=flag;
    if(validateRec(rec).length||existing.has(signature(rec))){skipped++;continue}
    db.records.push(rec);existing.add(signature(rec));saved++;
  }
  save();
  $("#aiSaveStatus").textContent=`Confirmed & saved ${saved} รายการ${skipped?` • ข้าม ${skipped}`:""} — Dashboard พร้อมใช้งาน`;
  updateValidationStats();
  setTimeout(()=>go("dashboard"),700);
};
console.info("Personal Healthcare v8.6 Medical Insight loaded");

/* ================= v9.0 Medical Analysis Engine ================= */
const V87_MIGRATION_KEY="ph_v87_migrated";
function daysBetween(a,b){const x=new Date(a),y=new Date(b);if(isNaN(x)||isNaN(y))return null;return Math.abs(y-x)/86400000}
function dateOnly(v){if(!v)return "—";const d=new Date(v);return isNaN(d)?String(v):d.toLocaleDateString("th-TH",{year:"2-digit",month:"short",day:"numeric"})}
function normalizedUnit(u){return String(u||"").trim().toLowerCase().replace(/\s/g,"")}
function isHistoricalBmiLab(r){const n=normLabName(labName(r));return r?.type==="lab"&&(n==="bmi"||n.includes("bodymassindex")||n.includes("ดัชนีมวลกาย"))}
function isLegacyHeightLab(r){
  if(r?.type!=="lab")return false;
  const n=normLabName(labName(r)),u=normalizedUnit(r.unit),v=Number(r.value);
  const named=n.includes("height")||n.includes("ส่วนสูง")||n.includes("ความสูง");
  return named&&Number.isFinite(v)&&v>=80&&v<=250&&(u==="cm"||u==="เซนติเมตร"||u==="");
}
function migrateLegacyHealthRecords(opts={silent:true}){
  let migrated=0,cleaned=0;
  db.records=db.records.map(r=>{
    let x=r;
    if(isLegacyHeightLab(x)){
      x={...x,original_type:x.original_type||"lab",type:"height",unit:x.unit||"cm",raw_note:x.raw_note||x.note,note:"นำเข้าจากผลตรวจเดิม • จัดประเภทเป็นส่วนสูงโดย v9.0",updated_at:new Date().toISOString(),migration_v87:true};
      migrated++;
    }
    if(isVital(x.type)){
      const compact=compactNote(x);
      if(compact&&compact!==x.note&&/Reference:|AI flag:|Validation:|Confidence:|Status:|Source:/i.test(String(x.note||""))){
        x={...x,raw_note:x.raw_note||x.note,note:compact,updated_at:new Date().toISOString()};cleaned++;
      }
    }
    return x;
  });
  if(migrated||cleaned){localStorage.setItem(KEY,JSON.stringify(db));if(!opts.silent)alert(`จัดระเบียบข้อมูลแล้ว\n• ย้ายส่วนสูงเก่าจากผลแล็บ: ${migrated}\n• ย่อข้อความ Vital Signs: ${cleaned}`)}
  localStorage.setItem(V87_MIGRATION_KEY,"1");
  return {migrated,cleaned};
}
function priorityLabel(level){return ({ok:"ปกติ",watch:"ควรติดตาม",consult:"ควรปรึกษาแพทย์",urgent:"เร่งด่วน"})[level]||level}
function priorityClass(level){return ({ok:"ok",watch:"warn",consult:"warn",urgent:"danger"})[level]||"ok"}
function refText(r){return r?.reference_range?` • ช่วงอ้างอิง ${r.reference_range}`:""}
function labDateText(r){return r?.date?` • ${dateOnly(r.date)}`:""}
function referenceAssessment(r){
  if(!r)return null;const val=Number(r.value),ref=parseReferenceRange(r.reference_range);if(!Number.isFinite(val))return null;
  if(ref.kind==="range")return {status:val<ref.min?"low":val>ref.max?"high":"normal",text:`เทียบช่วง ${ref.min}–${ref.max}`};
  if(ref.kind==="lt")return {status:val<ref.max?"normal":"high",text:`เทียบเกณฑ์ < ${ref.max}`};
  if(ref.kind==="gt")return {status:val>ref.min?"normal":"low",text:`เทียบเกณฑ์ > ${ref.min}`};
  return null;
}
function latestAnyLab(matchers){return latestLab(matchers)}
function glucoseMgDl(r){if(!r)return null;const v=Number(r.value),u=normalizedUnit(r.unit);if(!Number.isFinite(v))return null;if(u.includes("mmol"))return v*18;if(u.includes("mg/dl")||u.includes("mgdl")||!u)return v;return null}
function medicalLabFindings(){
  const out=[],covered=new Set();
  const add=(r,x)=>{if(r?.id)covered.add(r.id);out.push({...x,date:r?.date||null})};
  const hba=latestAnyLab(["hba1c","a1c","เอวันซี","ฮีโมโกลบินเอวันซี"]);
  if(hba){const v=Number(hba.value),u=String(hba.unit||"");if(Number.isFinite(v)&&(u.includes("%")||(!u&&v<20))){
    if(v>=6.5)add(hba,{level:"consult",title:`HbA1c ${v}%`,text:`อยู่ในช่วงที่ใช้เป็นเกณฑ์เบาหวาน ควรให้บุคลากรสุขภาพยืนยันตามบริบทและผลตรวจที่เหมาะสม${labDateText(hba)}`});
    else if(v>=5.7)add(hba,{level:"watch",title:`HbA1c ${v}%`,text:`อยู่ในช่วงก่อนเบาหวาน ควรติดตามน้ำหนัก อาหาร การออกกำลังกาย และวางแผนตรวจซ้ำตามคำแนะนำ${labDateText(hba)}`});
    else add(hba,{level:"ok",title:`HbA1c ${v}%`,text:`ต่ำกว่า 5.7% ตามเกณฑ์คัดกรองทั่วไป${labDateText(hba)}`});
  }}
  const fpg=latestAnyLab(["fastingglucose","fastingbloodsugar","fbs","glucosefasting","น้ำตาลอดอาหาร"]);
  if(fpg){const mg=glucoseMgDl(fpg);if(mg!=null){if(mg>=126)add(fpg,{level:"consult",title:`Fasting glucose ${Number(fpg.value)} ${fpg.unit||""}`,text:`เทียบได้ประมาณ ${mg.toFixed(0)} mg/dL ซึ่งอยู่ในช่วงที่ใช้เป็นเกณฑ์เบาหวาน ควรยืนยันกับแพทย์${labDateText(fpg)}`});else if(mg>=100)add(fpg,{level:"watch",title:`Fasting glucose ${Number(fpg.value)} ${fpg.unit||""}`,text:`เทียบได้ประมาณ ${mg.toFixed(0)} mg/dL อยู่ในช่วงก่อนเบาหวานตามเกณฑ์คัดกรองทั่วไป${labDateText(fpg)}`});else add(fpg,{level:"ok",title:`Fasting glucose ${Number(fpg.value)} ${fpg.unit||""}`,text:`ต่ำกว่า 100 mg/dL ตามเกณฑ์คัดกรองทั่วไป${labDateText(fpg)}`})}}
  const tc=latestAnyLab(["totalcholesterol","cholesteroltotal","cholesterol","คอเลสเตอรอลรวม"]),ldl=latestAnyLab(["ldl"]),hdl=latestAnyLab(["hdl"]),tg=latestAnyLab(["triglycer","ไตรกลีเซอไรด์"]);
  const tcv=mmolLipid(tc);if(tcv!=null)add(tc,{level:tcv>=5?"watch":"ok",title:`Total cholesterol ${Number(tc.value)} ${tc.unit||""}`,text:`${tcv>=5?"สูงกว่า healthy guide ทั่วไป 5 mmol/L":"อยู่ต่ำกว่า healthy guide ทั่วไป 5 mmol/L"}; ควรดู LDL/HDL/non-HDL และความเสี่ยงหัวใจโดยรวม${labDateText(tc)}`});
  const ldlv=mmolLipid(ldl);if(ldlv!=null)add(ldl,{level:ldlv>=3?"watch":"ok",title:`LDL ${Number(ldl.value)} ${ldl.unit||""}`,text:`${ldlv>=3?"สูงกว่า healthy guide ทั่วไป 3 mmol/L":"อยู่ต่ำกว่า healthy guide ทั่วไป 3 mmol/L"}; เป้าหมายจริงอาจเข้มกว่านี้ในผู้มีความเสี่ยงสูง${labDateText(ldl)}`});
  const hdlv=mmolLipid(hdl);if(hdlv!=null)add(hdl,{level:hdlv<1?"watch":"ok",title:`HDL ${Number(hdl.value)} ${hdl.unit||""}`,text:`HDL ต้องตีความร่วมกับเพศและความเสี่ยงโดยรวม; เกณฑ์ทั่วไป NHS คือ >1.0 mmol/L ในผู้ชาย และ >1.2 ในผู้หญิง${labDateText(hdl)}`});
  const tgv=mmolLipid(tg);if(tgv!=null)add(tg,{level:tgv>=2.3?"watch":"ok",title:`Triglycerides ${Number(tg.value)} ${tg.unit||""}`,text:`ค่าหลังอดอาหาร/ไม่อดอาหารใช้บริบทต่างกัน; ควรดูสถานะการอดอาหารและผลไขมันชุดเดียวกัน${labDateText(tg)}`});
  const egfr=latestAnyLab(["egfr","estimatedglomerularfiltration"]);if(egfr){const v=Number(egfr.value);if(Number.isFinite(v)){if(v<30)add(egfr,{level:"consult",title:`eGFR ${v} ${egfr.unit||""}`,text:`ต่ำกว่า 30 ควรให้แพทย์ประเมินโดยดูผลซ้ำ ปัสสาวะ และบริบททางคลินิก${labDateText(egfr)}`});else if(v<60)add(egfr,{level:"watch",title:`eGFR ${v} ${egfr.unit||""}`,text:`ต่ำกว่า 60 ควรติดตาม; การวินิจฉัย CKD ต้องดูความต่อเนื่องและหลักฐานอื่นร่วมกัน${labDateText(egfr)}`});else add(egfr,{level:"ok",title:`eGFR ${v} ${egfr.unit||""}`,text:`ตั้งแต่ 60 ขึ้นไป แต่ยังต้องตีความร่วมกับอายุและหลักฐานความเสียหายของไตอื่น${labDateText(egfr)}`})}}
  const uric=latestAnyLab(["uricacid","กรดยูริก","uric"]);if(uric){const ra=referenceAssessment(uric),flag=String(uric.ai_flag||"").toLowerCase();if(ra||flag){const abnormal=(ra&&ra.status!=="normal")||["high","low","abnormal","critical"].includes(flag);add(uric,{level:flag==="critical"?"consult":abnormal?"watch":"ok",title:`กรดยูริก ${uric.value} ${uric.unit||""}`,text:`${ra?ra.text:`รายงานระบุ ${flag||"unknown"}`}${refText(uric)}${labDateText(uric)} • การตีความกรดยูริกควรดูอาการ ประวัติเกาต์ ยา และการทำงานของไตร่วมด้วย`})}}
  const histBmi=db.records.filter(isHistoricalBmiLab).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];if(histBmi){covered.add(histBmi.id);out.push({level:"ok",title:`BMI จากผลตรวจ ${histBmi.value} ${histBmi.unit||""}`,text:`เป็นค่าจากเอกสาร ณ วันที่ ${dateOnly(histBmi.date)} ไม่ใช่ BMI ปัจจุบันที่คำนวณจากน้ำหนัก/ส่วนสูงล่าสุด`,date:histBmi.date})}
  const abnormal=db.records.filter(r=>r.type==="lab"&&!covered.has(r.id)&&!isHistoricalBmiLab(r)&&["high","low","abnormal","critical"].includes(String(r.ai_flag||"").toLowerCase())).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
  for(const r of abnormal){const ra=referenceAssessment(r);out.push({level:String(r.ai_flag).toLowerCase()==="critical"?"consult":"watch",title:`${labName(r)||"ผลตรวจ"} ${r.value} ${r.unit||""}`,text:`${ra?ra.text:`รายงาน/AI ระบุ ${r.ai_flag}`}${refText(r)}${labDateText(r)} • ระบบยังไม่มีเกณฑ์เฉพาะ จึงไม่เดาค่ามาตรฐานแทนห้องแล็บ`,date:r.date})}
  return out;
}
function dataQualityFindings(){
  const out=[];
  const weights=db.records.filter(r=>r.type==="weight"&&Number.isFinite(Number(r.value))).sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(weights.length>=2){const a=weights.at(-2),b=weights.at(-1),d=daysBetween(a.date,b.date),delta=Number(b.value)-Number(a.value);if(d!=null&&d<1&&Math.abs(delta)>=3)out.push({level:"watch",title:"ตรวจสอบวันที่น้ำหนัก",text:`มีน้ำหนัก ${a.value} → ${b.value} kg ต่างกัน ${delta>0?"+":""}${delta.toFixed(1)} kg ภายในวันเดียว ข้อมูลอาจมาจากคนละวันที่จริง ควรแก้วันที่ก่อนใช้วิเคราะห์แนวโน้ม`})}
  const legacy=db.records.filter(isLegacyHeightLab);if(legacy.length)out.push({level:"watch",title:"พบส่วนสูงที่ยังเป็นผลแล็บ",text:`พบ ${legacy.length} รายการ กด “จัดระเบียบข้อมูล AI” เพื่อย้ายเป็นประเภทส่วนสูง`});
  return out;
}
function renderMedicalInsight(){
  const el=$("#medicalSummary"),rec=$("#medicalRecommendations");if(!el||!rec)return;
  const bmi=bmiAssessment(),bp=latest("blood_pressure"),pulse=latest("pulse");
  if($("#kpiBmi")){ $("#kpiBmi").textContent=bmi?bmi.bmi.toFixed(1):"—"; $("#kpiBmiStatus").textContent=bmi?bmi.label:"ต้องมีน้ำหนักและส่วนสูง"; }
  const cards=[];
  if(bmi)cards.push(`<div class="med-card"><small>BMI ปัจจุบัน (คำนวณ)</small><b>${bmi.bmi.toFixed(1)}</b><span>${esc(bmi.label)}</span><small>จาก ${bmi.kg} kg / ${bmi.cm} cm • ${dateOnly(bmi.weightDate)}</small></div>`);
  if(bp){const a=bpAssessment(bp);cards.push(`<div class="med-card"><small>ความดันล่าสุด</small><b>${bp.value}/${bp.value2}</b><span>${esc(a.label)}</span><small>${dateOnly(bp.date)} • ใช้ค่าเฉลี่ยหลายวันเมื่อต้องประเมินความดันสูง</small></div>`)}
  if(pulse)cards.push(`<div class="med-card"><small>ชีพจรล่าสุด</small><b>${pulse.value} ${esc(pulse.unit||"bpm")}</b><span>ตีความร่วมกับการพัก ออกกำลัง ยา และอาการ</span><small>${dateOnly(pulse.date)}</small></div>`);
  el.innerHTML=cards.length?cards.join(""):`<div class="med-empty">เพิ่มน้ำหนัก ส่วนสูง ความดัน และผลตรวจ เพื่อเริ่มการวิเคราะห์</div>`;
  const findings=[];
  if(bp){const a=bpAssessment(bp);if(a.level==="danger")findings.push({level:"urgent",title:"ความดันสูงมาก",text:"วัดซ้ำหลังพักอย่างถูกวิธี หากยัง ≥180/120 mmHg โดยเฉพาะเมื่อมีเจ็บหน้าอก หายใจลำบาก อ่อนแรง สับสน การพูดหรือการมองเห็นผิดปกติ ควรรับการประเมินฉุกเฉิน"});else if(a.level==="warn")findings.push({level:"watch",title:"ติดตามค่าเฉลี่ยความดันที่บ้าน",text:"ค่าล่าสุดสูงกว่าค่าตัดทั่วไปสำหรับ HBPM 135/85 mmHg ควรวัดซ้ำหลายวันอย่างถูกวิธีและใช้ค่าเฉลี่ยเพื่อประกอบการประเมิน"})}
  if(bmi){if(bmi.bmi>=30)findings.push({level:"watch",title:`BMI ปัจจุบัน ${bmi.bmi.toFixed(1)} — ${bmi.label}`,text:"BMI เป็นเครื่องมือคัดกรอง ไม่ใช่การวัดไขมันโดยตรง ควรดูรอบเอว ความดัน น้ำตาล ไขมัน และปัจจัยเสี่ยงร่วมกัน เป้าหมายหลักคือการลดน้ำหนักอย่างยั่งยืน ไม่ใช่ลดเร็ว"});else if(bmi.bmi>=25)findings.push({level:"watch",title:`BMI ปัจจุบัน ${bmi.bmi.toFixed(1)} — น้ำหนักเกิน`,text:"ควรติดตามรอบเอวและปัจจัยเสี่ยงเมตาบอลิก พร้อมปรับอาหารและกิจกรรมอย่างต่อเนื่อง"});else findings.push({level:"ok",title:`BMI ปัจจุบัน ${bmi.bmi.toFixed(1)}`,text:"อยู่ในช่วงมาตรฐานสำหรับผู้ใหญ่ตามเกณฑ์ทั่วไป แต่ยังควรดูองค์ประกอบสุขภาพอื่นร่วมกัน"})}
  findings.push(...medicalLabFindings(),...dataQualityFindings());
  const rank={urgent:0,consult:1,watch:2,ok:3};findings.sort((a,b)=>(rank[a.level]??9)-(rank[b.level]??9));
  rec.innerHTML=findings.length?findings.map(x=>`<div class="item medical-rec ${priorityClass(x.level)}"><span class="priority-pill ${x.level}">${priorityLabel(x.level)}</span><div><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small></div></div>`).join(""):`<div class="item"><small>ยังไม่มีข้อมูลที่เพียงพอสำหรับคำแนะนำ</small></div>`;
}
function renderFlags(){
  const out=[];const bp=latest("blood_pressure");
  if(bp){const a=bpAssessment(bp);if(a.level==="danger")out.push({level:"danger",title:"ความดันสูงมาก",text:`${bp.value}/${bp.value2} mmHg — วัดซ้ำและประเมินอาการ`});else if(a.level==="warn")out.push({level:"warn",title:"ติดตามความดัน",text:`${bp.value}/${bp.value2} mmHg — ควรดูค่าเฉลี่ยหลายวัน`})}
  const weights=db.records.filter(r=>r.type==="weight"&&Number.isFinite(Number(r.value))).sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(weights.length>=2){const prev=weights.at(-2),cur=weights.at(-1),delta=Number(cur.value)-Number(prev.value),d=daysBetween(prev.date,cur.date);if(d!=null&&d>=1)out.push({level:Math.abs(delta)>=3?"warn":"ok",title:"แนวโน้มน้ำหนัก",text:`${Number(prev.value).toFixed(1)} → ${Number(cur.value).toFixed(1)} kg (${delta>0?"+":""}${delta.toFixed(1)} kg) ใน ${Math.round(d)} วัน`});else out.push({level:"warn",title:"ยังไม่ใช้ค่าน้ำหนักคู่นี้วิเคราะห์แนวโน้ม",text:`สองค่าล่าสุดต่างกัน ${delta>0?"+":""}${delta.toFixed(1)} kg แต่วันที่ห่างกันน้อยกว่า 1 วัน กรุณาตรวจวันที่ข้อมูล`})}
  if(!out.length)out.push({level:"ok",title:"ยังไม่มีธงเตือน",text:"เพิ่มข้อมูลความดัน น้ำหนัก และผลตรวจเพื่อวิเคราะห์แนวโน้ม"});
  $("#healthFlags").innerHTML=out.map(x=>`<div class="item flag ${x.level}"><span class="flag-dot"></span><div><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small></div></div>`).join("");
}
function compactNote(r){
  const note=String(r?.note||"").trim();if(!note)return "";
  if(!isVital(r?.type))return note.length>130?note.slice(0,127)+"…":note;
  if(/^อัปเดตจาก Dashboard v8\.[0-9]+/i.test(note))return note.replace(/v8\.[0-9]+/i,"v9.0");
  if(/Reference:|AI flag:|Validation:|Confidence:|Status:|Source:/i.test(note)){const src=(note.match(/Source:\s*([^•]+)/i)||[])[1]?.trim();return src?`นำเข้าจาก AI • ${src}`:"นำเข้าจาก AI"}
  return note.length>90?note.slice(0,87)+"…":note;
}
if($("#cleanupRecordsBtn"))$("#cleanupRecordsBtn").onclick=()=>{const r=migrateLegacyHealthRecords({silent:false});renderAll()};
if(!localStorage.getItem(V87_MIGRATION_KEY))migrateLegacyHealthRecords({silent:true});
renderAll();
console.info("Personal Healthcare v9.0 Medical Analysis Engine loaded");

/* ================= v9.0 Health Risk & Action Plan ================= */
function severityMax(levels){const rank={ok:0,watch:1,consult:2,urgent:3};return levels.reduce((best,x)=>(rank[x]>rank[best]?x:best),'ok')}
function v88RiskGroups(){
  const bmi=bmiAssessment(),bp=latest('blood_pressure');
  const fpg=latestAnyLab(['fastingglucose','fastingbloodsugar','fbs','glucosefasting','น้ำตาลอดอาหาร']);
  const hba=latestAnyLab(['hba1c','a1c','เอวันซี','ฮีโมโกลบินเอวันซี']);
  const ldl=latestAnyLab(['ldl']),tc=latestAnyLab(['totalcholesterol','cholesteroltotal','cholesterol','คอเลสเตอรอลรวม']),tg=latestAnyLab(['triglycer','ไตรกลีเซอไรด์']);
  const egfr=latestAnyLab(['egfr','estimatedglomerularfiltration']);
  const groups=[];
  // Cardiovascular / BP + lipids
  const cvLevels=[];let cv=[];
  if(bp){const a=bpAssessment(bp);cvLevels.push(a.level==='danger'?'urgent':a.level==='warn'?'watch':'ok');cv.push(`BP ${bp.value}/${bp.value2}`)}
  const ldlv=mmolLipid(ldl);if(ldlv!=null){cvLevels.push(ldlv>=4.9?'consult':ldlv>=3?'watch':'ok');cv.push(`LDL ${Number(ldl.value)} ${ldl.unit||''}`.trim())}
  const tcv=mmolLipid(tc);if(tcv!=null){cvLevels.push(tcv>=5?'watch':'ok');cv.push(`Chol ${Number(tc.value)} ${tc.unit||''}`.trim())}
  const tgv=mmolLipid(tg);if(tgv!=null){cvLevels.push(tgv>=5.6?'consult':tgv>=1.7?'watch':'ok');cv.push(`TG ${Number(tg.value)} ${tg.unit||''}`.trim())}
  groups.push({name:'หัวใจและหลอดเลือด',level:severityMax(cvLevels.length?cvLevels:['ok']),text:cv.length?cv.join(' • '):'ข้อมูลยังไม่พอ'});
  // Metabolic / BMI + glycaemia
  const metLevels=[];let met=[];
  if(bmi){metLevels.push(bmi.bmi>=30?'watch':bmi.bmi>=25?'watch':'ok');met.push(`BMI ${bmi.bmi.toFixed(1)}`)}
  if(fpg){const mg=glucoseMgDl(fpg);if(mg!=null){metLevels.push(mg>=126?'consult':mg>=100?'watch':'ok');met.push(`Fasting glucose ${Math.round(mg)} mg/dL`)}}
  if(hba){const v=Number(hba.value);if(Number.isFinite(v)){metLevels.push(v>=6.5?'consult':v>=5.7?'watch':'ok');met.push(`HbA1c ${v}%`)}}
  groups.push({name:'เมตาบอลิก / เบาหวาน',level:severityMax(metLevels.length?metLevels:['ok']),text:met.length?met.join(' • '):'ข้อมูลยังไม่พอ'});
  // Kidney
  let kidneyLevel='ok',kidneyText='ยังไม่มี eGFR';if(egfr){const v=Number(egfr.value);kidneyLevel=v<30?'consult':v<60?'watch':'ok';kidneyText=`eGFR ${v} ${egfr.unit||''}`.trim()}
  groups.push({name:'ไต',level:kidneyLevel,text:kidneyText});
  // Data quality
  const dq=dataQualityFindings();groups.push({name:'คุณภาพข้อมูล',level:dq.length?'watch':'ok',text:dq.length?`${dq.length} จุดที่ควรตรวจสอบก่อนสรุปแนวโน้ม`:'ไม่พบปัญหาสำคัญจากข้อมูลล่าสุด'});
  return groups;
}
function v88ActionPlan(){
  const actions=[],bp=latest('blood_pressure'),bmi=bmiAssessment();
  const fpg=latestAnyLab(['fastingglucose','fastingbloodsugar','fbs','glucosefasting','น้ำตาลอดอาหาร']);
  const hba=latestAnyLab(['hba1c','a1c','เอวันซี','ฮีโมโกลบินเอวันซี']);
  const ldl=latestAnyLab(['ldl']),tc=latestAnyLab(['totalcholesterol','cholesteroltotal','cholesterol','คอเลสเตอรอลรวม']),tg=latestAnyLab(['triglycer','ไตรกลีเซอไรด์']);
  if(bp){const a=bpAssessment(bp);if(a.level==='danger')actions.push({level:'urgent',step:'ทำตอนนี้',title:'วัดความดันซ้ำและประเมินอาการ',text:'พักก่อนวัดซ้ำ หากยัง ≥180/120 mmHg โดยเฉพาะเมื่อมีเจ็บหน้าอก หายใจลำบาก อ่อนแรง สับสน หรือการพูด/มองเห็นผิดปกติ ควรรับการประเมินฉุกเฉิน'});else if(a.level==='warn')actions.push({level:'watch',step:'4–7 วันถัดไป',title:'เก็บค่าเฉลี่ยความดันที่บ้าน',text:'วัดเช้าและเย็น ครั้งละ 2 ค่า ห่างกันอย่างน้อย 1 นาที ต่อเนื่องอย่างน้อย 4 วัน (เหมาะที่สุด 7 วัน) และใช้ค่าเฉลี่ยหลังตัดวันแรกออก; หากค่าเฉลี่ยยัง ≥135/85 mmHg ควรคุยกับบุคลากรสุขภาพ'})}
  const mg=glucoseMgDl(fpg);if((mg!=null&&mg>=100)||(hba&&Number(hba.value)>=5.7))actions.push({level:(mg>=126||Number(hba?.value)>=6.5)?'consult':'watch',step:'ติดตามผลเลือด',title:'ทบทวนน้ำตาลกับแพทย์/คลินิก',text:'ค่า fasting glucose หรือ HbA1c อยู่เหนือช่วงปกติ ควรยืนยันชนิดการตรวจ การอดอาหาร และพิจารณาตรวจซ้ำตามคำแนะนำ ไม่ควรวินิจฉัยจากค่าครั้งเดียวในแอป'});
  const ldlv=mmolLipid(ldl),tcv=mmolLipid(tc),tgv=mmolLipid(tg);if((ldlv!=null&&ldlv>=3)||(tcv!=null&&tcv>=5)||(tgv!=null&&tgv>=1.7))actions.push({level:ldlv>=4.9?'consult':'watch',step:'นัดทบทวนความเสี่ยง',title:'ประเมินไขมันและความเสี่ยงหัวใจโดยรวม',text:'ดูผล lipid profile ทั้งชุดร่วมกับอายุ เพศ ความดัน เบาหวาน การสูบบุหรี่ ประวัติครอบครัว และยาที่ใช้ ก่อนกำหนดเป้าหมาย LDL หรือการรักษา'});
  if(bmi&&bmi.bmi>=30)actions.push({level:'watch',step:'เป้าหมายระยะกลาง',title:'วางแผนลดน้ำหนักแบบยั่งยืน',text:'การลดน้ำหนักประมาณ 5–10% ของน้ำหนักตั้งต้นสามารถให้ประโยชน์ต่อสุขภาพได้ในหลายคน ควรเน้นอาหารที่เหมาะสม กิจกรรมที่ทำต่อเนื่องได้ การนอน และติดตามรอบเอว/ความดัน/น้ำตาล มากกว่าลดเร็ว'});
  for(const q of dataQualityFindings())actions.push({level:'watch',step:'ก่อนดูแนวโน้ม',title:q.title,text:q.text});
  if(!actions.length)actions.push({level:'ok',step:'ติดตามตามปกติ',title:'ยังไม่มีรายการเร่งด่วนจากข้อมูลที่มี',text:'บันทึกข้อมูลอย่างสม่ำเสมอและทบทวนผลตรวจตามรอบที่บุคลากรสุขภาพแนะนำ'});
  const rank={urgent:0,consult:1,watch:2,ok:3};actions.sort((a,b)=>rank[a.level]-rank[b.level]);return actions.slice(0,6);
}
function previousOfType(type){const a=db.records.filter(r=>r.type===type).sort((x,y)=>new Date(y.date)-new Date(x.date));return a.length>=2?[a[0],a[1]]:null}
function historicalComparisonItems(){
  const out=[];
  const bpPair=previousOfType('blood_pressure');if(bpPair){const [cur,prev]=bpPair,d=daysBetween(prev.date,cur.date);let chip='neutral',label='ยังไม่สรุป';if(d!=null&&d>=1){const cs=Number(cur.value)+Number(cur.value2),ps=Number(prev.value)+Number(prev.value2);chip=cs<ps?'better':cs>ps?'worse':'neutral';label=chip==='better'?'ลดลง':'สูงขึ้น'}out.push({title:'ความดัน',values:`${prev.value}/${prev.value2} → ${cur.value}/${cur.value2} mmHg`,text:d!=null&&d<1?'วันที่ห่างกันน้อยกว่า 1 วัน จึงยังไม่ใช้เป็นแนวโน้มระยะยาว':`ห่างกันประมาณ ${Math.round(d)} วัน`,chip,label})}
  const histBmi=db.records.filter(isHistoricalBmiLab).sort((a,b)=>new Date(b.date)-new Date(a.date))[0],bmi=bmiAssessment();if(histBmi&&bmi){const d=daysBetween(histBmi.date,bmi.weightDate);let chip='neutral',label='ต่างช่วงข้อมูล';if(d!=null&&d>=1){chip=bmi.bmi<Number(histBmi.value)?'better':'worse';label=chip==='better'?'BMI ลดลง':'BMI สูงขึ้น'}out.push({title:'BMI เอกสาร → BMI ปัจจุบัน',values:`${Number(histBmi.value).toFixed(1)} → ${bmi.bmi.toFixed(1)}`,text:d!=null&&d<1?'ผลตรวจเดิมและข้อมูลล่าสุดถูกลงวันที่ใกล้กันมาก จึงไม่สรุปว่าเปลี่ยนจริงจนกว่าจะตรวจวันที่':'BMI ปัจจุบันคำนวณจากน้ำหนัก/ส่วนสูงล่าสุด ไม่ใช่ค่าจากเอกสารเดิม',chip,label})}
  const wPair=previousOfType('weight');if(wPair){const [cur,prev]=wPair,d=daysBetween(prev.date,cur.date),delta=Number(cur.value)-Number(prev.value);let chip='neutral',label='ตรวจวันที่';if(d!=null&&d>=1){chip=delta<0?'better':delta>0?'worse':'neutral';label=delta<0?'น้ำหนักลด':'น้ำหนักเพิ่ม'}out.push({title:'น้ำหนัก',values:`${Number(prev.value).toFixed(1)} → ${Number(cur.value).toFixed(1)} kg`,text:d!=null&&d<1?'สองค่าห่างกันน้อยกว่า 1 วัน จึงยังไม่ใช้สรุปแนวโน้ม':`${delta>0?'+':''}${delta.toFixed(1)} kg ในประมาณ ${Math.round(d)} วัน`,chip,label})}
  // Compare repeated labs with same normalized name only when dates are separated.
  const labs=db.records.filter(r=>r.type==='lab').sort((a,b)=>new Date(b.date)-new Date(a.date));const seen=new Set();
  for(const cur of labs){const key=normLabName(labName(cur));if(!key||seen.has(key)||isHistoricalBmiLab(cur))continue;const prev=labs.find(x=>x.id!==cur.id&&normLabName(labName(x))===key);if(!prev)continue;seen.add(key);const d=daysBetween(prev.date,cur.date);if(d==null||d<1)continue;const a=Number(prev.value),b=Number(cur.value);if(!Number.isFinite(a)||!Number.isFinite(b))continue;out.push({title:labName(cur)||'ผลแล็บ',values:`${a} → ${b} ${cur.unit||''}`.trim(),text:`เปรียบเทียบผลห่างกันประมาณ ${Math.round(d)} วัน; ควรตีความร่วมกับ reference range และบริบทการตรวจ`,chip:'neutral',label:'มีผลซ้ำ'});if(out.length>=6)break}
  return out.slice(0,6);
}
function renderRiskActionPlan(){
  const ro=$('#riskOverview'),ap=$('#actionPlan'),hc=$('#historicalComparison');if(!ro||!ap||!hc)return;
  ro.innerHTML=v88RiskGroups().map(g=>`<div class="risk-card"><div class="risk-head"><b>${esc(g.name)}</b><span class="risk-state ${g.level}">${priorityLabel(g.level)}</span></div><small>${esc(g.text)}</small></div>`).join('');
  ap.innerHTML=v88ActionPlan().map(a=>`<div class="item action-item ${a.level}"><div><span class="action-step">${esc(a.step)}</span><strong>${esc(a.title)}</strong><small>${esc(a.text)}</small></div></div>`).join('');
  const items=historicalComparisonItems();hc.innerHTML=items.length?items.map(x=>`<div class="item comparison-item"><div class="comparison-values"><b>${esc(x.title)} • ${esc(x.values)}</b><small>${esc(x.text)}</small></div><span class="trend-chip ${x.chip}">${esc(x.label)}</span></div>`).join(''):`<div class="item"><small>ยังไม่มีข้อมูลซ้ำที่มีวันที่ห่างกันพอสำหรับเปรียบเทียบ</small></div>`;
}
function renderFlags(){
  const out=[],dq=dataQualityFindings(),bp=latest('blood_pressure');
  out.push(...dq.map(x=>({level:'warn',title:x.title,text:x.text})));
  if(bp&&bpAssessment(bp).level==='warn')out.push({level:'warn',title:'ต้องการค่าเฉลี่ย HBPM',text:'ค่าความดันล่าสุดเพียงค่าเดียวไม่พอสำหรับสรุปแนวโน้ม ควรเก็บเช้า/เย็นหลายวันตามแผนด้านบน'});
  if(!out.length)out.push({level:'ok',title:'ข้อมูลพร้อมใช้มากขึ้น',text:'ยังไม่พบปัญหาคุณภาพข้อมูลสำคัญจากรายการล่าสุด'});
  $('#healthFlags').innerHTML=out.map(x=>`<div class="item flag ${x.level}"><span class="flag-dot"></span><div><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small></div></div>`).join('');
}
const _v88RenderMedicalInsight=renderMedicalInsight;
renderMedicalInsight=function(){_v88RenderMedicalInsight();renderRiskActionPlan()};
console.info('Personal Healthcare v9.0 Health Risk & Action Plan loaded');

/* ================= v9.0 Personalised Do / Limit / Avoid ================= */
function latestUric(){return latestAnyLab(["uricacid","กรดยูริก","uric"])}
function isAbnormalByReference(r){if(!r)return false;const ra=referenceAssessment(r);if(ra)return ra.status!=="normal";return ["high","low","abnormal","critical"].includes(String(r.ai_flag||"").toLowerCase())}
function currentMetabolicSignals(){
  const bmi=bmiAssessment(),bp=latest("blood_pressure");
  const fpg=latestAnyLab(["fastingglucose","fastingbloodsugar","fbs","glucosefasting","น้ำตาลอดอาหาร"]);
  const hba=latestAnyLab(["hba1c","a1c","เอวันซี","ฮีโมโกลบินเอวันซี"]);
  const ldl=latestAnyLab(["ldl"]),tc=latestAnyLab(["totalcholesterol","cholesteroltotal","cholesterol","คอเลสเตอรอลรวม"]),tg=latestAnyLab(["triglycer","ไตรกลีเซอไรด์"]),uric=latestUric();
  return {bmi,bp,fpg,hba,ldl,tc,tg,uric,mg:glucoseMgDl(fpg),ldlv:mmolLipid(ldl),tcv:mmolLipid(tc),tgv:mmolLipid(tg)};
}
function personalGuidanceItems(){
  const s=currentMetabolicSignals(),doItems=[],limitItems=[],avoidItems=[];
  const addUnique=(arr,item)=>{if(!arr.some(x=>x.title===item.title))arr.push(item)};

  if(s.bmi&&s.bmi.bmi>=25){
    addUnique(doItems,{title:"ลดน้ำหนักแบบค่อยเป็นค่อยไป",reason:`BMI ปัจจุบัน ${s.bmi.bmi.toFixed(1)} (${s.bmi.label})`,text:"เน้นอาหารที่ทำต่อเนื่องได้ การนอน และกิจกรรมที่เหมาะกับข้อจำกัดร่างกาย มากกว่าการลดเร็วหรืออดอาหารรุนแรง"});
  }
  if((s.mg!=null&&s.mg>=100)||(s.hba&&Number(s.hba.value)>=5.7)){
    addUnique(doItems,{title:"เพิ่มกิจกรรมทางกายสม่ำเสมอ",reason:`${s.mg!=null?`Fasting glucose ≈ ${Math.round(s.mg)} mg/dL`:""}${s.hba?`${s.mg!=null?" • ":""}HbA1c ${s.hba.value}%`:""}`,text:"หากทำได้และไม่มีข้อห้าม ตั้งเป้ากิจกรรมระดับปานกลางรวมประมาณ 150 นาที/สัปดาห์ และปรับให้เหมาะกับเข่า/ข้อ/โรคร่วม"});
    if(s.bmi&&s.bmi.bmi>=25)addUnique(doItems,{title:"ตั้งเป้าลดน้ำหนักระยะแรก 5–7%",reason:"มีสัญญาณน้ำตาลช่วงก่อนเบาหวานร่วมกับน้ำหนักเกิน",text:`จากน้ำหนักล่าสุด ${s.bmi.kg.toFixed(1)} kg คิดเป็นประมาณ ${(s.bmi.kg*.05).toFixed(1)}–${(s.bmi.kg*.07).toFixed(1)} kg โดยควรทำแบบค่อยเป็นค่อยไป`});
    addUnique(limitItems,{title:"ลดเครื่องดื่มหวานและน้ำตาลเติมเพิ่ม",reason:"น้ำตาลอดอาหาร/HbA1c สูงกว่าช่วงปกติ",text:"เลือกน้ำเปล่า เครื่องดื่มไม่หวาน และลดขนม/เครื่องดื่มที่มีน้ำตาลสูง"});
  }
  if(s.bp&&bpAssessment(s.bp).level==="warn"){
    addUnique(doItems,{title:"วัดความดันที่บ้านอย่างเป็นระบบ",reason:`BP ล่าสุด ${s.bp.value}/${s.bp.value2} mmHg`,text:"วัดเช้าและเย็น ครั้งละ 2 ค่า ห่างกันอย่างน้อย 1 นาที หลายวัน แล้วดูค่าเฉลี่ยแทนการตัดสินจากครั้งเดียว"});
    addUnique(limitItems,{title:"ลดเกลือและอาหารเค็มจัด",reason:`ความดันล่าสุด ${s.bp.value}/${s.bp.value2} mmHg`,text:"ลดอาหารแปรรูป ซุป/น้ำแกงเค็ม น้ำปลา ซีอิ๊ว และการเติมเกลือเพิ่ม โดยไม่ใช้เกลือโพแทสเซียมแทนเองหากมีโรคไตหรือใช้ยาบางชนิด"});
    addUnique(limitItems,{title:"ลดแอลกอฮอล์ โดยเฉพาะถ้าดื่มมาก",reason:"ความดันสูงกว่าช่วงที่ควรติดตาม",text:"การลดการดื่มมากเกินไปช่วยลดความดันและมีประโยชน์ต่อสุขภาพด้านอื่น"});
  }
  if((s.ldlv!=null&&s.ldlv>=3)||(s.tcv!=null&&s.tcv>=5)){
    addUnique(doItems,{title:"เปลี่ยนไขมันอิ่มตัวเป็นไขมันไม่อิ่มตัว",reason:`${s.ldl?`LDL ${s.ldl.value} ${s.ldl.unit||""}`:""}${s.tc?`${s.ldl?" • ":""}Cholesterol ${s.tc.value} ${s.tc.unit||""}`:""}`,text:"เลือกปลา ถั่ว เมล็ดพืช และน้ำมันพืชที่เหมาะสม พร้อมเพิ่มผัก ผลไม้ และอาหารใยอาหารสูง"});
    addUnique(limitItems,{title:"ลดอาหารไขมันอิ่มตัว",reason:"LDL/Cholesterol สูงกว่าช่วงทั่วไป",text:"ลดเนื้อติดมัน ไส้กรอก เนย กี ชีส ครีม เค้ก/บิสกิต และอาหารที่มีไขมันอิ่มตัวสูง"});
  }
  if(s.tgv!=null&&s.tgv>=1.7){
    addUnique(limitItems,{title:"ลดแอลกอฮอล์และเครื่องดื่มหวาน",reason:`Triglycerides ${s.tg.value} ${s.tg.unit||""}`,text:"แอลกอฮอล์และน้ำตาลส่วนเกินอาจทำให้ triglycerides สูงขึ้น ควรลดโดยเฉพาะเมื่อค่าผิดปกติ"});
  }
  if(s.uric&&isAbnormalByReference(s.uric)){
    addUnique(doItems,{title:"ดื่มน้ำให้เพียงพอ",reason:`กรดยูริก ${s.uric.value} ${s.uric.unit||""} สูงตามรายงาน/ช่วงอ้างอิง`,text:"หากแพทย์ไม่ได้จำกัดน้ำจากโรคหัวใจหรือไต การรักษาภาวะขาดน้ำให้น้อยลงเป็นส่วนหนึ่งของการดูแลความเสี่ยงเกาต์"});
    addUnique(limitItems,{title:"ลดเครื่องใน เนื้อแดงบางชนิด และอาหารทะเลปริมาณมาก",reason:"กรดยูริกสูง",text:"ไม่จำเป็นต้องงดอาหารทุกชนิดที่มีพิวรีน แต่ควรลดแหล่งที่มีพิวรีนสูงและดูอาการร่วม"});
    addUnique(avoidItems,{title:"หลีกเลี่ยงการดื่มหนัก/ดื่มรวดเดียว",reason:"กรดยูริกสูง",text:"โดยเฉพาะเบียร์และสุรา ซึ่งสัมพันธ์กับความเสี่ยงเกาต์เพิ่มขึ้น; หากมีเกาต์กำเริบควรงดแอลกอฮอล์และขอคำแนะนำการรักษา"});
  }
  if(!doItems.length)addUnique(doItems,{title:"บันทึกข้อมูลสม่ำเสมอ",reason:"ยังไม่มีสัญญาณเฉพาะที่ต้องปรับแผน",text:"เก็บน้ำหนัก ความดัน และผลตรวจตามรอบ เพื่อให้คำแนะนำครั้งต่อไปเฉพาะบุคคลมากขึ้น"});
  if(!limitItems.length)addUnique(limitItems,{title:"ยังไม่มีรายการเฉพาะที่ต้องลด",reason:"ข้อมูลปัจจุบันไม่ชี้ข้อจำกัดเฉพาะ",text:"คงหลักอาหารสมดุลและหลีกเลี่ยงการเปลี่ยนอาหารแบบสุดโต่งโดยไม่จำเป็น"});
  if(!avoidItems.length)addUnique(avoidItems,{title:"ยังไม่มีข้อห้ามอาหารแบบเด็ดขาดจากข้อมูลนี้",reason:"ไม่พบเงื่อนไขที่เพียงพอสำหรับคำว่า “ห้าม”",text:"ข้อห้ามจริงมักขึ้นกับโรคเฉพาะ ยา การแพ้ หรือคำแนะนำของแพทย์"});
  return {doItems:doItems.slice(0,5),limitItems:limitItems.slice(0,6),avoidItems:avoidItems.slice(0,4)};
}
function renderPersonalGuidance(){
  const el=$("#personalGuidance");if(!el)return;const g=personalGuidanceItems();
  const col=(kind,title,items)=>`<section class="guidance-col ${kind}"><h4>${title}</h4>${items.map(x=>`<div class="guidance-item"><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small><span>เหตุผล: ${esc(x.reason)}</span></div>`).join("")}</section>`;
  el.innerHTML=col("do","ควรทำ",g.doItems)+col("limit","ควรลด",g.limitItems)+col("avoid","ควรหลีกเลี่ยง",g.avoidItems);
}
function medicationSafetyItems(){
  const out=[];for(const m of db.medications||[]){const n=String(m.name||"").trim().toLowerCase();if(!n)continue;
    if(/simvastatin|ซิมวาสแตติน/.test(n))out.push({level:"avoid",title:`${m.name}: หลีกเลี่ยง grapefruit juice`,text:"น้ำเกรปฟรุตเพิ่มระดับ simvastatin และเพิ่มโอกาสผลข้างเคียง • อ้างอิง NHS"});
    else if(/amlodipine|แอมโลดิพีน/.test(n))out.push({level:"avoid",title:`${m.name}: หลีกเลี่ยง grapefruit / grapefruit juice`,text:"NHS แนะนำไม่กิน grapefruit หรือดื่มน้ำเกรปฟรุตระหว่างใช้ amlodipine เพราะอาจเพิ่มผลข้างเคียง"});
    else if(/allopurinol|อัลโลพูรินอล/.test(n))out.push({level:"limit",title:`${m.name}: จำกัดแอลกอฮอล์`,text:"แอลกอฮอล์ไม่ได้หยุดฤทธิ์ allopurinol โดยตรง แต่สามารถเพิ่มกรดยูริกและกระตุ้นเกาต์ได้"});
  }
  if((db.medications||[]).length&&!out.length)out.push({level:"info",title:"ยังไม่มี interaction ที่ระบบ v9.0 ตรวจได้จากรายการยา",text:"ระบบไม่เดา interaction ที่ไม่รู้จัก กรุณาตรวจฉลากยา NHS/เภสัชกรก่อนงดอาหารหรือเครื่องดื่มใด ๆ"});
  if(!(db.medications||[]).length)out.push({level:"info",title:"เพิ่มรายการยาเพื่อเปิด Medication Safety",text:"บันทึกชื่อยาให้ตรงกับฉลาก แล้วระบบจะตรวจข้อควรหลีกเลี่ยงที่มี rule รองรับ"});
  out.push({level:"info",title:"อย่าหยุดหรือปรับขนาดยาเอง",text:"คำเตือนอาหาร/เครื่องดื่มไม่ใช่คำสั่งหยุดยา หากสงสัย interaction ให้สอบถามแพทย์หรือเภสัชกร"});
  return out;
}
function renderMedicationSafety(){const el=$("#medicationSafety");if(!el)return;el.innerHTML=medicationSafetyItems().map(x=>`<div class="item med-safety ${x.level}"><div><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small></div></div>`).join("")}
function healthGoalItems(){
  const s=currentMetabolicSignals(),out=[];
  if(s.bmi&&s.bmi.bmi>=25){const pre=(s.mg!=null&&s.mg>=100&&s.mg<126)||(s.hba&&Number(s.hba.value)>=5.7&&Number(s.hba.value)<6.5);out.push({title:"น้ำหนัก",current:`${s.bmi.kg.toFixed(1)} kg • BMI ${s.bmi.bmi.toFixed(1)}`,target:pre?`ระยะแรกลดประมาณ ${(s.bmi.kg*.05).toFixed(1)}–${(s.bmi.kg*.07).toFixed(1)} kg (5–7%)`:"ลดแบบค่อยเป็นค่อยไปและกำหนดเป้าหมายร่วมกับบุคลากรสุขภาพ",note:"เป้าหมายไม่ควรใช้ BMI อย่างเดียว; ควรดูรอบเอว ความดัน น้ำตาล ไขมัน และความสามารถในการทำต่อเนื่อง"})}
  if(s.bp&&bpAssessment(s.bp).level==="warn")out.push({title:"ความดัน",current:`${s.bp.value}/${s.bp.value2} mmHg`,target:"เก็บค่าเฉลี่ย HBPM ที่เชื่อถือได้ก่อนกำหนดเป้าหมายการรักษา",note:"ค่าเฉลี่ยที่บ้าน ≥135/85 mmHg เป็นเกณฑ์สำคัญในการประเมินตาม NICE ไม่ใช่เป้าหมายรักษาเฉพาะบุคคล"});
  if((s.mg!=null&&s.mg>=100)||(s.hba&&Number(s.hba.value)>=5.7))out.push({title:"น้ำตาล",current:`${s.mg!=null?`FPG ~${Math.round(s.mg)} mg/dL`:""}${s.hba?`${s.mg!=null?" • ":""}HbA1c ${s.hba.value}%`:""}`,target:"ลดปัจจัยเสี่ยงและตรวจติดตามตามแผนแพทย์",note:"แอปไม่กำหนดวันตรวจซ้ำหรือวินิจฉัยจากค่าครั้งเดียว"});
  if((s.ldlv!=null&&s.ldlv>=3)||(s.tcv!=null&&s.tcv>=5))out.push({title:"ไขมัน",current:`${s.ldl?`LDL ${s.ldl.value} ${s.ldl.unit||""}`:""}${s.tc?`${s.ldl?" • ":""}Chol ${s.tc.value} ${s.tc.unit||""}`:""}`,target:"ประเมิน cardiovascular risk เพื่อกำหนดเป้าหมาย LDL ที่เหมาะสม",note:"เป้าหมาย LDL ขึ้นกับความเสี่ยงและโรคร่วม จึงไม่ตั้งเลขเป้าหมายเดียวให้ทุกคน"});
  return out.length?out:[{title:"เป้าหมายสุขภาพ",current:"ข้อมูลยังไม่พอ",target:"เพิ่มข้อมูล vital signs และผลตรวจที่มีวันที่ถูกต้อง",note:"เมื่อข้อมูลครบ ระบบจะสร้างเป้าหมายที่เฉพาะเจาะจงมากขึ้น"}];
}
function renderHealthGoals(){const el=$("#healthGoals");if(!el)return;el.innerHTML=healthGoalItems().map(x=>`<div class="item goal-item"><div><strong>${esc(x.title)}</strong><small>ปัจจุบัน: ${esc(x.current)}</small><small>เป้าหมาย: ${esc(x.target)}</small><span>${esc(x.note)}</span></div></div>`).join("")}
function monitoringPlanItems(){
  const s=currentMetabolicSignals(),out=[];
  if(s.bp&&bpAssessment(s.bp).level==="warn")out.push({title:"ความดันที่บ้าน",text:"เก็บเช้าและเย็น ครั้งละ 2 ค่า อย่างน้อย 4 วัน (เหมาะที่สุด 7 วัน) เพื่อคำนวณค่าเฉลี่ยที่น่าเชื่อถือ"});
  if(s.bmi&&s.bmi.bmi>=25)out.push({title:"น้ำหนัก",text:"ชั่งภายใต้เงื่อนไขใกล้เคียงกันและบันทึกวันที่จริง; ดูแนวโน้มหลายสัปดาห์แทนการตอบสนองต่อค่ารายวัน"});
  if((s.mg!=null&&s.mg>=100)||(s.hba&&Number(s.hba.value)>=5.7))out.push({title:"น้ำตาล",text:"ยืนยันว่าผลใดเป็น fasting และเก็บ HbA1c/ผลตรวจครั้งถัดไปตามรอบที่แพทย์หรือคลินิกแนะนำ"});
  if((s.ldlv!=null&&s.ldlv>=3)||(s.tcv!=null&&s.tcv>=5)||(s.tgv!=null&&s.tgv>=1.7))out.push({title:"ไขมัน",text:"เก็บ lipid profile ครั้งถัดไปพร้อมวันที่และสถานะอดอาหาร เพื่อเปรียบเทียบแนวโน้มได้ถูกต้อง"});
  if(s.uric&&isAbnormalByReference(s.uric))out.push({title:"กรดยูริก/อาการข้อ",text:"บันทึกว่ามีข้อบวมแดงร้อน ปวดเฉียบพลัน หรือประวัติเกาต์หรือไม่ และทบทวนยาที่อาจเกี่ยวข้องกับแพทย์"});
  if(dataQualityFindings().length)out.push({title:"คุณภาพข้อมูล",text:"แก้วันที่ข้อมูลที่ซ้ำหรือขัดแย้งก่อนใช้สรุปแนวโน้ม"});
  return out.length?out:[{title:"ติดตามตามปกติ",text:"เพิ่มข้อมูลตามรอบจริง และตรวจสอบวันที่/หน่วยก่อนบันทึก"}];
}
function renderMonitoringPlan(){const el=$("#monitoringPlan");if(!el)return;el.innerHTML=monitoringPlanItems().map(x=>`<div class="item"><div><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small></div></div>`).join("")}
function renderV90(){renderPersonalGuidance();renderMedicationSafety();renderHealthGoals();renderMonitoringPlan()}
const _v90RenderMedicalInsight=renderMedicalInsight;
renderMedicalInsight=function(){_v90RenderMedicalInsight();renderV90()};
renderV90();
console.info("Personal Healthcare v9.0 Personalised Guidance loaded");

/* ================= v9.1 Weight Management ================= */
function bmiInfo(b){if(!Number.isFinite(b))return {label:"กรอกส่วนสูงและน้ำหนัก",level:"neutral"};if(b<18.5)return {label:"ต่ำกว่าเกณฑ์ทั่วไป",level:"warn"};if(b<25)return {label:"ช่วงทั่วไป",level:"ok"};if(b<30)return {label:"น้ำหนักเกิน",level:"warn"};return {label:"ช่วงโรคอ้วนตามเกณฑ์ BMI",level:"danger"}}
function renderWeightManagement(){
  if(!$("#wmCurrent"))return;
  const goal=db.weightGoal||{},logs=[...(db.bodyLogs||[])].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const records=db.records.filter(r=>r.type==="weight"&&Number.isFinite(Number(r.value))).map(r=>({date:r.date,weight:Number(r.value)}));
  const all=records.sort((a,b)=>new Date(a.date)-new Date(b.date)),cur=all.at(-1),first=all[0],h=Number(goal.height),bmi=cur&&h?Number(cur.weight)/(h/100)**2:NaN,bi=bmiInfo(bmi),last=logs.at(-1);
  $("#wmCurrent").textContent=cur?`${Number(cur.weight).toFixed(1)} kg`:"—";$("#wmChange").textContent=cur&&first?`เปลี่ยนแปลง ${(cur.weight-first.weight)>=0?"+":""}${(cur.weight-first.weight).toFixed(1)} kg`:"ยังไม่มีข้อมูล";
  $("#wmBmi").textContent=Number.isFinite(bmi)?bmi.toFixed(1):"—";$("#wmBmiStatus").textContent=bi.label;$("#wmTarget").textContent=goal.targetWeight?`${goal.targetWeight} kg`:"—";$("#wmRemaining").textContent=cur&&goal.targetWeight?`เหลือ ${(Number(cur.weight)-Number(goal.targetWeight)).toFixed(1)} kg ถึงเป้าหมาย`:"ยังไม่ได้ตั้งเป้าหมาย";$("#wmWaist").textContent=last?.waist?`${last.waist} cm`:"—";
  const ids={height:"wmHeight",targetWeight:"wmTargetInput",weekly:"wmWeekly",calories:"wmCalories",protein:"wmProtein",steps:"wmSteps"};Object.entries(ids).forEach(([k,id])=>{if(goal[k]!=null)$("#"+id).value=goal[k]});
  const cut=Date.now()-Number($("#wmRange")?.value||30)*86400000,chartRows=all.filter(x=>new Date(x.date).getTime()>=cut).map((x,i)=>({id:i,date:x.date,value:x.weight}));$("#wmChart").innerHTML=chartSvg(chartRows,"weight");
  const tips=[];if(Number.isFinite(bmi))tips.push({level:bi.level,title:`BMI ${bmi.toFixed(1)} • ${bi.label}`,text:"BMI เป็นการคัดกรองเบื้องต้น ไม่ได้บอกองค์ประกอบร่างกายหรือวินิจฉัยโรค"});if(goal.weekly>.5)tips.push({level:"warn",title:"เป้าหมายค่อนข้างเร็ว",text:"พิจารณาลดประมาณ 0.25–0.5 kg/สัปดาห์ เพื่อรักษากล้ามเนื้อและทำต่อเนื่องได้"});if(last&&goal.protein&&Number(last.protein)<Number(goal.protein))tips.push({level:"warn",title:"โปรตีนยังต่ำกว่าเป้าหมาย",text:`วันนี้ ${last.protein||0} g จากเป้าหมาย ${goal.protein} g`});if(last&&goal.steps&&Number(last.steps)<Number(goal.steps))tips.push({level:"ok",title:"เพิ่มการเคลื่อนไหวแบบไม่กดเข่า",text:"แบ่งเดินสั้น ๆ ว่ายน้ำ หรือปั่นจักรยานอยู่กับที่ และปรับตามอาการปวดเข่า"});if(!tips.length)tips.push({level:"ok",title:"เริ่มเก็บข้อมูลต่อเนื่อง",text:"ชั่งเวลาใกล้เคียงกัน 2–4 ครั้ง/สัปดาห์ และดูแนวโน้มแทนค่ารายวัน"});$("#wmGuidance").innerHTML=tips.map(x=>`<div class="item flag ${x.level}"><span class="flag-dot"></span><div><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small></div></div>`).join("");
  $("#wmHistory").innerHTML=logs.length?logs.slice(-14).reverse().map(x=>`<tr><td>${new Date(x.date).toLocaleDateString("th-TH")}</td><td>${x.weight??"—"}</td><td>${x.waist??"—"}</td><td>${x.calories??"—"}</td><td>${x.protein??"—"}</td><td>${x.steps??"—"}</td><td>${(x.cardio||0)+(x.strength||0)} นาที</td><td><button class="btn mini wm-del" data-id="${x.id}">ลบ</button></td></tr>`).join(""):`<tr><td colspan="8" class="muted">ยังไม่มีข้อมูล</td></tr>`;$$('.wm-del').forEach(b=>b.onclick=()=>{if(confirm("ลบบันทึกนี้?")){db.bodyLogs=db.bodyLogs.filter(x=>x.id!==b.dataset.id);save()}})
}
$("#weightGoalForm").onsubmit=e=>{e.preventDefault();db.weightGoal={height:Number($("#wmHeight").value),targetWeight:Number($("#wmTargetInput").value),weekly:Number($("#wmWeekly").value||.5),calories:numOrText($("#wmCalories").value),protein:numOrText($("#wmProtein").value),steps:numOrText($("#wmSteps").value),updated_at:new Date().toISOString()};save()};
$("#bodyLogForm").onsubmit=e=>{e.preventDefault();const val=id=>numOrText($(id).value),log={id:uid(),date:$("#wmDate").value,weight:val("#wmWeight"),waist:val("#wmWaistInput"),calories:val("#wmCaloriesEaten"),protein:val("#wmProteinEaten"),steps:val("#wmStepsDone"),cardio:val("#wmCardio"),strength:val("#wmStrength"),created_at:new Date().toISOString()};if(![log.weight,log.waist,log.calories,log.protein,log.steps,log.cardio,log.strength].some(x=>x!==null)){alert("กรอกอย่างน้อย 1 ค่า");return}db.bodyLogs.push(log);if(log.weight!==null)db.records.push({id:uid(),date:new Date(log.date+"T08:00:00").toISOString(),type:"weight",value:log.weight,value2:null,unit:"kg",note:"Weight Management v9.1",created_at:new Date().toISOString(),updated_at:new Date().toISOString()});save();e.target.reset();$("#wmDate").value=new Date().toISOString().slice(0,10)};
$("#wmRange").onchange=renderWeightManagement;$("#wmDate").value=new Date().toISOString().slice(0,10);renderWeightManagement();
console.info("Personal Healthcare v9.1 Weight Management loaded");

// v9.1.2: all module wrappers are now registered; render late-loaded panels once.
renderMedicalInsight();
renderWeightManagement();
console.info("Personal Healthcare v9.1.2 Display Hotfix loaded");

/* ================= v9.2 Integrated AI Health Coach ================= */
function coachWeights(){
  return db.records.filter(r=>r.type==="weight"&&Number.isFinite(Number(r.value))).map(r=>({date:new Date(r.date),value:Number(r.value)})).filter(r=>!isNaN(r.date)).sort((a,b)=>a.date-b.date);
}
function coachWeightTrend(days){
  const cut=Date.now()-days*86400000,rows=coachWeights().filter(r=>r.date.getTime()>=cut);
  if(rows.length<2)return {days,count:rows.length,delta:null,label:"ข้อมูลไม่พอ"};
  const delta=rows.at(-1).value-rows[0].value;
  return {days,count:rows.length,delta,label:`${delta>0?"+":""}${delta.toFixed(1)} kg`};
}
function coachAdherence7(){
  const goal=db.weightGoal||{},cut=Date.now()-7*86400000,logs=(db.bodyLogs||[]).filter(x=>new Date(x.date).getTime()>=cut);
  let met=0,total=0;
  for(const x of logs){
    if(goal.calories&&Number.isFinite(Number(x.calories))){total++;if(Number(x.calories)<=Number(goal.calories))met++}
    if(goal.protein&&Number.isFinite(Number(x.protein))){total++;if(Number(x.protein)>=Number(goal.protein))met++}
    if(goal.steps&&Number.isFinite(Number(x.steps))){total++;if(Number(x.steps)>=Number(goal.steps))met++}
    if(Number(x.cardio)>0||Number(x.strength)>0){total++;met++}
  }
  return {logs:logs.length,total,met,pct:total?Math.round(met/total*100):null};
}
function coachItem(x){return `<div class="item coach-item ${esc(x.level||"info")}"><div><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small>${x.evidence?`<span>อ้างอิงจาก: ${esc(x.evidence)}</span>`:""}</div></div>`}
function renderHealthCoach(){
  if(!$("#coachHeadline"))return;
  const goal=db.weightGoal||{},bmi=bmiAssessment(),bp=latest("blood_pressure"),logs=[...(db.bodyLogs||[])].sort((a,b)=>new Date(a.date)-new Date(b.date)),last=logs.at(-1),weights=coachWeights(),t7=coachWeightTrend(7),t30=coachWeightTrend(30),t90=coachWeightTrend(90),adh=coachAdherence7();
  const labFindings=medicalLabFindings(),followups=labFindings.filter(x=>x.level==="warn"||x.level==="danger");
  if(bp&&bpAssessment(bp).level!=="ok")followups.unshift({level:bpAssessment(bp).level,title:"ความดัน",text:`${bp.value}/${bp.value2} mmHg`});
  const dataParts=[weights.length>0,bmi!==null,bp!==undefined,db.records.some(r=>r.type==="lab"),logs.length>0].filter(Boolean).length;
  $("#coachDataState").textContent=dataParts>=4?"พร้อม":dataParts>=2?"บางส่วน":"เริ่มต้น";$("#coachDataNote").textContent=`มีข้อมูล ${dataParts}/5 กลุ่มหลัก`;
  $("#coachWeightTrend").textContent=t30.delta==null?"—":t30.label;$("#coachWeightNote").textContent=t30.count>=2?`${t30.count} ค่าใน 30 วัน`:"ต้องมีอย่างน้อย 2 ค่าใน 30 วัน";
  $("#coachAdherence").textContent=adh.pct==null?"—":`${adh.pct}%`;$("#coachFollowups").textContent=String(followups.length);
  let headline="เริ่มจากเก็บข้อมูลให้ต่อเนื่อง";
  if(followups.some(x=>x.level==="danger"))headline="มีข้อมูลสำคัญที่ควรประเมินก่อนเร่งลดน้ำหนัก";
  else if(t30.delta!=null&&t30.delta<-.2)headline="แนวโน้มน้ำหนักกำลังลดลง — รักษาความสม่ำเสมอ";
  else if(bmi&&bmi.bmi>=25)headline="โฟกัสการลดน้ำหนักแบบค่อยเป็นค่อยไปและดูแลเมตาบอลิก";
  else if(dataParts>=4)headline="ข้อมูลพร้อมสำหรับติดตามสุขภาพแบบองค์รวม";
  $("#coachHeadline").textContent=headline;
  $("#coachSummary").textContent=`วิเคราะห์จากข้อมูล ${db.records.length} รายการ และบันทึกพฤติกรรม ${logs.length} วัน โดยดูแนวโน้มหลายวันแทนค่าครั้งเดียว`;
  const today=[];
  if(!goal.targetWeight)today.push({level:"info",title:"ตั้งเป้าหมายน้ำหนัก",text:"กำหนดเป้าหมายและอัตราประมาณ 0.25–0.5 kg/สัปดาห์ก่อนเริ่มติดตาม",evidence:"ยังไม่มีเป้าหมายใน Weight Management"});
  if(last&&goal.protein&&Number(last.protein)<Number(goal.protein))today.push({level:"watch",title:"เติมโปรตีนให้ใกล้เป้าหมาย",text:`ตั้งเป้า ${goal.protein} g/วัน โดยกระจายตามมื้อและเลือกแหล่งที่เหมาะกับโรคประจำตัว`,evidence:`ล่าสุด ${last.protein||0} g`});
  if(last&&goal.steps&&Number(last.steps)<Number(goal.steps))today.push({level:"info",title:"เพิ่มการเคลื่อนไหวแบบไม่กดเข่า",text:"แบ่งกิจกรรมเป็นช่วงสั้น ๆ เลือกเดินราบ ว่ายน้ำ หรือจักรยานอยู่กับที่ตามอาการ",evidence:`ล่าสุด ${last.steps||0} จากเป้าหมาย ${goal.steps} ก้าว`});
  if(bp&&bpAssessment(bp).level==="warn")today.push({level:"watch",title:"วัดความดันซ้ำอย่างเป็นระบบ",text:"พักก่อนวัดและเก็บเช้า–เย็นเพื่อดูค่าเฉลี่ยหลายวัน",evidence:`ล่าสุด ${bp.value}/${bp.value2} mmHg`});
  if(!last||Date.now()-new Date(last.date).getTime()>3*86400000)today.push({level:"info",title:"บันทึกข้อมูลวันนี้",text:"เพิ่มน้ำหนักหรือรอบเอว พร้อมอาหารและกิจกรรมอย่างน้อยหนึ่งรายการ",evidence:"ไม่มี body log ใน 3 วันที่ผ่านมา"});
  if(!today.length)today.push({level:"ok",title:"ทำแผนเดิมต่ออย่างสม่ำเสมอ",text:"คงเป้าหมายอาหาร โปรตีน ก้าว และกิจกรรมไว้ แล้วทบทวนแนวโน้มอีก 7 วัน",evidence:"ข้อมูลล่าสุดอยู่ใกล้เป้าหมายที่ตั้งไว้"});
  $("#coachToday").innerHTML=today.slice(0,4).map(coachItem).join("");
  const evidence=[];
  if(bmi)evidence.push({level:bmi.level,title:`BMI ${bmi.bmi.toFixed(1)} • ${bmi.label}`,text:`คำนวณจาก ${bmi.kg} kg และ ${bmi.cm} cm`,evidence:`น้ำหนัก ${fmtDate(bmi.weightDate)} • ส่วนสูง ${fmtDate(bmi.heightDate)}`});
  if(last?.waist)evidence.push({level:"info",title:`รอบเอวล่าสุด ${last.waist} cm`,text:"ใช้ติดตามแนวโน้มร่วมกับน้ำหนัก ไม่ใช้วินิจฉัยเพียงค่าเดียว",evidence:new Date(last.date).toLocaleDateString("th-TH")});
  if(bp)evidence.push({level:bpAssessment(bp).level,title:`ความดัน ${bp.value}/${bp.value2} mmHg`,text:bpAssessment(bp).label,evidence:fmtDate(bp.date)});
  evidence.push(...labFindings.slice(0,3).map(x=>({...x,evidence:"ผลตรวจล่าสุดที่บันทึกในแอป"})));
  $("#coachEvidence").innerHTML=evidence.length?evidence.map(coachItem).join(""):coachItem({level:"info",title:"ยังไม่มีหลักฐานเพียงพอ",text:"เพิ่มน้ำหนัก ส่วนสูง ความดัน และผลแล็บเพื่อให้คำแนะนำเฉพาะขึ้น"});
  $("#coachTrends").innerHTML=[t7,t30,t90].map(t=>`<div class="coach-trend-card"><span>${t.days} วัน</span><b>${esc(t.label)}</b><small>${t.count} ค่าน้ำหนัก</small></div>`).join("");
  const safety=[];
  if(followups.length)safety.push(...followups.slice(0,4).map(x=>({level:x.level,title:x.title,text:x.text,evidence:"Medical Analysis Engine"})));
  if((db.medications||[]).length)safety.push({level:"info",title:"อย่าหยุดหรือปรับยาเอง",text:"ใช้คำเตือนใน Medication Safety และยืนยันกับแพทย์หรือเภสัชกร",evidence:`มียา ${(db.medications||[]).length} รายการ`});
  if(!safety.length)safety.push({level:"ok",title:"ไม่พบสัญญาณเร่งด่วนจากข้อมูลที่มี",text:"ผลนี้ขึ้นกับข้อมูลที่บันทึก หากมีอาการผิดปกติควรขอคำแนะนำจากบุคลากรสุขภาพ",evidence:"ข้อมูลปัจจุบันในแอป"});
  $("#coachSafety").innerHTML=safety.map(coachItem).join("");
}
const _v92RenderAll=renderAll;renderAll=function(){_v92RenderAll();renderHealthCoach()};
if($("#refreshCoachBtn"))$("#refreshCoachBtn").onclick=renderHealthCoach;
renderHealthCoach();
console.info("Personal Healthcare v9.2 Integrated AI Health Coach loaded");
