import {initializeApp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {getFirestore,collection,doc,setDoc,getDocs,query,orderBy,limit,getDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {firebaseConfig,ownerUid} from "./firebase-config.js";
window.__benModuleLoaded = true;
const auth=getAuth(initializeApp(firebaseConfig)),db=getFirestore(),$=id=>document.getElementById(id);
let user=null;
let loadedDate=null;
const allowed=u=>u?.uid===ownerUid&&u.providerData.some(p=>p.providerId==="google.com");
$("loginBtn").onclick=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){$("loginStatus").textContent=e.code||"登入失敗"}};
const fmtWeight=n=>Number(n).toFixed(2)+" kg";
function renderTrend(rows){
 const el=$("weightChart");el.replaceChildren();
 const values=rows.filter(d=>typeof d.weightKg==="number"&&Number.isFinite(d.weightKg)&&d.excludeFromTrend!==true).sort((a,b)=>a.date.localeCompare(b.date));
 if(!values.length){el.textContent="尚無體重資料";return;}
 const w=800,h=260,p={l:55,r:24,t:28,b:48};
 const lo=Math.min(...values.map(d=>d.weightKg)),hi=Math.max(...values.map(d=>d.weightKg));
 const min=Math.floor((lo-0.4)*2)/2,max=Math.ceil((hi+0.4)*2)/2,span=max-min||1;
 const days=30;
 const newest=values[values.length-1].date;
 const end=new Date(newest+"T12:00:00");const first=new Date(end);first.setDate(first.getDate()-(days-1));
 const x=d=>p.l+((new Date(d+"T12:00:00")-first)/(end-first||1))*(w-p.l-p.r);
 const y=v=>h-p.b-(v-min)/span*(h-p.t-p.b);
 const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");
 svg.setAttribute("viewBox",`0 0 ${w} ${h}`);svg.setAttribute("aria-hidden","true");
 const add=(tag,attrs,label)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(label!=null)n.textContent=label;svg.append(n);return n;};
 for(let i=0;i<=4;i++){const v=min+(max-min)*i/4,Y=y(v);add("line",{x1:p.l,x2:w-p.r,y1:Y,y2:Y,stroke:"#e5eaf2"});add("text",{x:p.l-9,y:Y+4,"text-anchor":"end",fill:"#66758c","font-size":"13"},v.toFixed(1));}
 const visible=values.filter(d=>d.date>=first.toISOString().slice(0,10));
 if(visible.length>1)add("polyline",{points:visible.map(d=>`${x(d.date)},${y(d.weightKg)}`).join(" "),fill:"none",stroke:"#2676bd","stroke-width":"3","stroke-linecap":"round","stroke-linejoin":"round"});
 for(const d of visible){const circle=add("circle",{cx:x(d.date),cy:y(d.weightKg),r:5,fill:"#2676bd"});const t=document.createElementNS(ns,"title");t.textContent=d.date+"｜"+fmtWeight(d.weightKg);circle.append(t);}
 for(const d of [first,end]){const date=d.toISOString().slice(0,10);add("text",{x:x(date),y:h-17,"text-anchor":date===newest?"end":"start",fill:"#66758c","font-size":"13"},date.slice(5));}
 el.append(svg);
 const hint=document.createElement("p");hint.className="hint";hint.textContent="顯示 "+visible.length+" 筆體重紀錄｜最新 "+fmtWeight(values[values.length-1].weightKg);el.append(hint);
}
function renderWeek15(rows){
 const days=rows.filter(d=>d.date>="2026-10-19"&&d.date<="2026-10-25"&&typeof d.weightKg==="number"&&Number.isFinite(d.weightKg));
 $("week15Count").textContent=days.length+" / 7";
 $("week15Average").textContent=days.length?fmtWeight(days.reduce((sum,d)=>sum+d.weightKg,0)/days.length):"尚無紀錄";
 $("week15Status").textContent=days.length?"依已回報的 "+days.length+" 天計算；非完整七日週平均。":"恢復正常飲食與輕度運動；等待 Week 15 晨重回報。";
}
let cachedDailyRows=[];
function taipeiDate(){return new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Taipei"});}
function dateShift(date,offset){const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);}
let cachedWeeks=[];
function mondayFor(date){const d=new Date(date+"T12:00:00Z");const dow=d.getUTCDay();d.setUTCDate(d.getUTCDate()-((dow+6)%7));return d.toISOString().slice(0,10);}
function healthWeekId(date){const anchor=new Date("2026-10-19T12:00:00Z"),d=new Date(mondayFor(date)+"T12:00:00Z");const n=15+Math.round((d-anchor)/604800000);return n>=1?"2026-W"+String(n).padStart(2,"0"):null;}
function weekStart(id){const n=Number(id.slice(-2));return dateShift("2026-10-19",(n-15)*7);}
function populateWeekOptions(rows,weeks){
 const select=$("metricWeek"),old=select.value;
 const ids=new Set(["2026-W15","2026-W14"]);
 for(const d of rows){if(/^2026-\d{2}-\d{2}$/.test(d.date||"")){const id=healthWeekId(d.date);if(id)ids.add(id);}}
 for(const w of weeks){if(/^2026-W\d{2}$/.test(w.id||""))ids.add(w.id);}
 select.replaceChildren();
 const opt=(value,label)=>{const o=document.createElement("option");o.value=value;o.textContent=label;select.append(o);};
 for(const id of [...ids].sort().reverse()){
  const start=weekStart(id),end=dateShift(start,6),n=Number(id.slice(-2));
  opt(id,(n===15?"本週｜":n===14?"上週｜":"歷史｜")+"Week "+n+"（"+start.slice(5)+"–"+end.slice(5)+"）");
 }
 opt("rolling","最近七個日曆日");
 select.value=[...select.options].some(o=>o.value===old)?old:"2026-W15";
}
function renderWeekDailyDetails(recent,start,end){
 const root=$("weekDailyDetails");root.replaceChildren();
 const h=document.createElement("h3");h.textContent="每日紀錄明細";root.append(h);
 const table=document.createElement("table");table.className="week-table";
 const head=document.createElement("tr");
 for(const name of ["日期","體重","睡眠","飲食紀錄","腸胃／其他"]){const th=document.createElement("th");th.textContent=name;head.append(th);}table.append(head);
 let count=0;
 for(let d=start;d<=end;d=dateShift(d,1)){
  const row=recent.find(r=>r.date===d);
  if(row)count++;
  const tr=document.createElement("tr");
  const cells=[d,row&&typeof row.weightKg==="number"?fmtWeight(row.weightKg):"未回報",row&&typeof row.sleepHours==="number"?row.sleepHours+" 小時":"未回報",row?.foodNotes||"未記錄文字",([row?.dataQuality&&row.dataQuality!=="clean"?"資料品質："+row.dataQuality:null,row?.gutNotes,row?.exerciseNotes,row?.notes].filter(Boolean).join("；"))||"未記錄文字"];
  for(const value of cells){const td=document.createElement("td");td.textContent=value;tr.append(td);}table.append(tr);
 }
 const p=document.createElement("p");p.className="hint";p.textContent="此期間共有 "+count+" / 7 天建立每日紀錄；空白數值不代表零。";
 root.append(p,table);
}
function renderV3Summary(rows){
 const week=rows.filter(d=>d.date>="2026-10-19"&&d.date<="2026-10-25");
 const weights=week.filter(d=>typeof d.weightKg==="number"&&d.excludeFromTrend!==true);
 const protein=week.filter(d=>typeof d.proteinG==="number");
 const resistance=week.filter(d=>d.exercise?.resistance?.done===true||/彈力繩.*(完成|[0-9]+\s*分鐘)/.test(d.exerciseNotes||""));
 const gut=week.filter(d=>(typeof d.gutNotes==="string"&&d.gutNotes.trim())||d.gut?.events?.length||d.gut?.noStoolToday===true);
 $("v3Weight").textContent=weights.length+" / 7 天";
 $("v3Protein").textContent=protein.length?protein.filter(d=>d.proteinG>=120).length+" / "+protein.length+" 天達標":"未回報";
 $("v3Resistance").textContent=resistance.length+" / 7 天";
 $("v3Gut").textContent=gut.length+" / 7 天";
}
function renderMetrics(rows){
 const mode=$("metricWeek").value,today=taipeiDate();
 const start=mode==="rolling"?dateShift(today,-6):weekStart(mode);
 const end=mode==="rolling"?today:dateShift(start,6);
 const recent=rows.filter(d=>typeof d.date==="string"&&d.date>=start&&d.date<=end);
 const label=mode==="rolling"?"最近七個日曆日":"Week "+Number(mode.slice(-2));
 $("metricPeriod").textContent="統計期間："+start+" ～ "+end+"｜"+label+"（未回報不補零）";
 for(const [key,id,coverage,unit,digits] of [["sleepHours","sleepAverage","sleepCoverage"," 小時",1],["waterMl","waterAverage","waterCoverage"," ml",0],["proteinG","proteinAverage","proteinCoverage"," g",1],["caloriesKcal","calorieAverage","calorieCoverage"," kcal",0]]){
  const nums=recent.map(d=>d[key]).filter(n=>typeof n==="number"&&Number.isFinite(n)&&n>=0);
  $(id).textContent=nums.length?(nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(digits)+unit:"未回報";
  $(coverage).textContent=nums.length+" / 7 天有量化紀錄";
 }
 const food=recent.filter(d=>typeof d.foodNotes==="string"&&d.foodNotes.trim()).length;
 const exercise=recent.filter(d=>typeof d.exerciseNotes==="string"&&d.exerciseNotes.trim()).length;
 $("foodCoverage").textContent="飲食文字紀錄："+food+" / 7 天（不等於已計算營養）";
 $("exerciseCoverage").textContent="運動文字紀錄："+exercise+" / 7 天";
 renderWeekDailyDetails(recent,start,end);
}
$("metricWeek").addEventListener("change",()=>renderMetrics(cachedDailyRows));
const foodPresets={soy:{label:"無糖高纖豆漿 400 ml",protein:14,kcal:120},eggs:{label:"雞蛋 2 顆",protein:13,kcal:150},whey:{label:"乳清 1 份",protein:25,kcal:120},tofu:{label:"豆乾 1 份",protein:10,kcal:110}};
let waterHistory=[],foodHistory=[],quickFood=[];
const qualityExcluded=new Set(["illness","dehydration","glycogen-refill","outlier"]);
function quickMessage(message){$("quickStatus").textContent=message+"；請按「儲存私人紀錄」才會寫入。";}
function quickReady(){if(!user||loadedDate!==$("recordDate").value){quickMessage("請先選擇並載入日期");return false;}return true;}
function updateQuickDisplays(){
 $("quickWaterValue").textContent=$("waterMl").value.trim()===""?"未回報":Number($("waterMl").value).toLocaleString()+" ml";
 $("quickFoodValue").textContent=quickFood.length?"已快選："+quickFood.map(id=>foodPresets[id].label).join("、"):"未選擇品項";
}
document.querySelectorAll("[data-water-add]").forEach(b=>b.addEventListener("click",()=>{
 if(!quickReady())return;
 waterHistory.push($("waterMl").value);$("waterMl").value=Number($("waterMl").value||0)+Number(b.dataset.waterAdd);
 updateQuickDisplays();quickMessage("飲水已更新");
}));
$("quickWaterUndo").onclick=()=>{if(!quickReady()||!waterHistory.length)return;$("waterMl").value=waterHistory.pop();updateQuickDisplays();quickMessage("已撤銷上一筆飲水");};
document.querySelectorAll("[data-food]").forEach(b=>b.addEventListener("click",()=>{
 if(!quickReady())return;
 const preset=foodPresets[b.dataset.food];
 foodHistory.push({protein:$("proteinG").value,calories:$("caloriesKcal").value,notes:$("foodNotes").value,items:[...quickFood]});
 $("proteinG").value=Number($("proteinG").value||0)+preset.protein;
 $("caloriesKcal").value=Number($("caloriesKcal").value||0)+preset.kcal;
 $("foodNotes").value=[$("foodNotes").value.trim(),preset.label+"（快選估算）"].filter(Boolean).join("；");
 quickFood.push(b.dataset.food);updateQuickDisplays();quickMessage("已加入 "+preset.label+" 的估算營養");
}));
$("quickFoodUndo").onclick=()=>{if(!quickReady()||!foodHistory.length)return;const prev=foodHistory.pop();$("proteinG").value=prev.protein;$("caloriesKcal").value=prev.calories;$("foodNotes").value=prev.notes;quickFood=prev.items;updateQuickDisplays();quickMessage("已撤銷上一筆飲食快選");};
document.querySelectorAll("[data-exercise]").forEach(b=>b.addEventListener("click",()=>{
 if(!quickReady())return;const mins=Number(b.dataset.exercise);$("exerciseNotes").value=mins?"彈力繩 "+mins+" 分鐘":"今日未做彈力繩";$("quickExerciseValue").textContent=$("exerciseNotes").value;quickMessage("運動紀錄已更新");
}));
const gutLabels={normal:"正常成形",soft:"偏軟",hard:"偏硬／費力",none:"今日無排便"};
document.querySelectorAll("[data-gut]").forEach(b=>b.addEventListener("click",()=>{
 if(!quickReady())return;const label=gutLabels[b.dataset.gut];$("gutNotes").value=[$("gutNotes").value.trim(),label].filter(Boolean).join("；");$("quickGutValue").textContent=label;quickMessage("排便紀錄已更新");
}));
const formFields=["weight","sleepHours","waterMl","proteinG","caloriesKcal","foodNotes","exerciseNotes","gutNotes","notes"];
async function loadDate(){
 const date=$("recordDate").value;
 if(!user||!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
 $("saveStatus").textContent="正在讀取 "+date+" 的既有紀錄…";
 loadedDate=null;$("saveBtn").disabled=true;
 try{
  const snapshot=await getDoc(doc(db,"users",user.uid,"daily",date));
  if($("recordDate").value!==date)return;
  const d=snapshot.exists()?snapshot.data():{};
  for(const [input,key] of [["weight","weightKg"],["sleepHours","sleepHours"],["waterMl","waterMl"],["proteinG","proteinG"],["caloriesKcal","caloriesKcal"],["foodNotes","foodNotes"],["exerciseNotes","exerciseNotes"],["gutNotes","gutNotes"],["notes","notes"]])$(input).value=d[key]??"";
  $("dataQuality").value=d.dataQuality||"clean";
  waterHistory=[];foodHistory=[];quickFood=[];updateQuickDisplays();
  $("quickExerciseValue").textContent=d.exerciseNotes||"未回報";$("quickGutValue").textContent=d.gutNotes||"未回報";
  loadedDate=date;
  $("saveStatus").textContent=snapshot.exists()?"已載入 "+date+" 的既有紀錄；儲存會更新此日期。":"此日期尚無紀錄，可以新增。";
 }catch(err){$("saveStatus").textContent="讀取日期失敗："+(err.code||err.message);}
 finally{if($("recordDate").value===date)$("saveBtn").disabled=loadedDate!==date;}
}
$("recordDate").addEventListener("change",loadDate);
function renderWeeklyOverview(weeks,rows){
 const root=$("weeklyOverview");root.replaceChildren();
 const sorted=weeks.sort((a,b)=>String(a.startDate||a.id).localeCompare(String(b.startDate||b.id)));
 if(!sorted.length){root.textContent="尚無歷史週報";return;}
 const table=document.createElement("table");table.className="week-table";
 const head=document.createElement("tr");
 for(const name of ["週別","期間","平均體重","紀錄狀態"]){const th=document.createElement("th");th.textContent=name;head.append(th);}
 table.append(head);
 for(const w of sorted){
  const tr=document.createElement("tr");
  const vals=[w.id||"未標示",[w.startDate,w.endDate].filter(Boolean).join(" ～ ")||"未回報",typeof w.averageWeightKg==="number"?fmtWeight(w.averageWeightKg):"未回報",w.status||"未回報"];
  for(const val of vals){const td=document.createElement("td");td.textContent=val;tr.append(td);}
  table.append(tr);
 }
 root.append(table);
}
async function refresh(){
 const uid=user.uid;
 const results=await getDocs(query(collection(db,"users",uid,"daily"),orderBy("date","desc"),limit(200)));
 const rows=results.docs.map(s=>s.data());
 cachedDailyRows=rows;
 renderTrend(rows.slice(0,30));renderWeek15(rows);renderV3Summary(rows);
 const list=$("recentRecords");list.replaceChildren();
 let found=false;
 results.docs.slice(0,14).forEach(s=>{const d=s.data(),row=document.createElement("div");row.className="record";
 const label=document.createElement("span");label.textContent=[d.date,d.weightKg==null?"體重未回報":d.weightKg+"kg",d.sleepHours==null?"睡眠未回報":d.sleepHours+"小時",d.gutNotes||"腸胃未回報"].join("｜");
 row.append(label);list.append(row);
 if(!found&&typeof d.weightKg==="number"){$("latestWeight").textContent=d.weightKg+" kg";$("weightDate").textContent=d.date;found=true;}
 });
 const weekly=await getDocs(collection(db,"users",uid,"weeks"));
 cachedWeeks=weekly.docs.map(s=>({id:s.id,...s.data()}));
 renderWeeklyOverview(cachedWeeks,rows);
 populateWeekOptions(rows,cachedWeeks);renderMetrics(rows);
 const week=await getDoc(doc(db,"users",uid,"weeks","2026-W14"));
 if(week.exists()){const w=week.data();$("weekAverage").textContent=typeof w.averageWeightKg==="number"?w.averageWeightKg+" kg":"未回報";$("weekStatus").textContent=w.status||"未回報";}
}
onAuthStateChanged(auth,async u=>{
 user=null;loadedDate=null;$("dashboardView").hidden=true;$("accountArea").replaceChildren();
 if(!u){$("loginView").hidden=false;return;}
 if(!allowed(u)){$("loginStatus").textContent="此帳號未授權";await signOut(auth);return;}
 user=u;$("loginView").hidden=true;$("dashboardView").hidden=false;
 const b=document.createElement("button");b.textContent="登出";b.onclick=()=>signOut(auth);$("accountArea").append(b);
 try{await refresh();if(!$("recordDate").value)$("recordDate").value=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Taipei"});await loadDate()}catch(e){$("saveStatus").textContent="讀取失敗："+e.code}
});
$("dailyForm").onsubmit=async e=>{
 e.preventDefault();if(!user||!allowed(auth.currentUser))return;
 const date=$("recordDate").value;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||loadedDate!==date){$("saveStatus").textContent="請先等待當日紀錄載入完成";return;}
 const num=id=>$(id).value.trim()===""?null:Number($(id).value);
 const txt=id=>$(id).value.trim()||null;
 const data={date,weightKg:num("weight"),sleepHours:num("sleepHours"),waterMl:num("waterMl"),proteinG:num("proteinG"),caloriesKcal:num("caloriesKcal"),foodNotes:txt("foodNotes"),exerciseNotes:txt("exerciseNotes"),gutNotes:txt("gutNotes"),notes:txt("notes"),dataQuality:$("dataQuality").value,excludeFromTrend:qualityExcluded.has($("dataQuality").value),schemaVersion:3,updatedAt:serverTimestamp()};
 $("saveBtn").disabled=true;
 try{
  await setDoc(doc(db,"users",user.uid,"daily",date),data,{merge:true});
  $("saveStatus").textContent="儲存成功："+date;
  await refresh();
 }catch(err){$("saveStatus").textContent="儲存失敗："+(err.code||err.message)}
 finally{$("saveBtn").disabled=false}
};
$("importBtn").onclick=async()=>{
 const status=$("importStatus"),file=$("importFile").files[0],button=$("importBtn");
 if(!user||!allowed(auth.currentUser)){status.textContent="請先登入授權帳號";return;}
 if(!file){status.textContent="請先選取 JSON 檔";return;}
 status.textContent="正在讀取檔案："+file.name;
 button.disabled=true;
 try{
  const payload=JSON.parse(await file.text());
  status.textContent="檔案讀取完成，正在驗證資料格式…";
  if(!["ben-health-os-import-v1","ben-health-os-import-v2"].includes(payload.format)||!Array.isArray(payload.daily)||(!payload.week&&!Array.isArray(payload.weeks)))throw Error("檔案格式不符");
  if(payload.daily.length>200)throw Error("單次最多200筆");
  let saved=0,skipped=0,enriched=0;
  status.textContent="格式驗證通過，共 "+payload.daily.length+" 筆每日紀錄，準備匯入…";
  for(const [index,record] of payload.daily.entries()){
   status.textContent="正在處理第 "+(index+1)+"/"+payload.daily.length+" 筆（"+record.date+"）；已新增 "+saved+" 筆、略過 "+skipped+" 筆";
   if(!/^\d{4}-\d{2}-\d{2}$/.test(record.date))throw Error("日期格式不正確");
   const ref=doc(db,"users",user.uid,"daily",record.date);
   const old=await getDoc(ref);
   if(old.exists()){
    const current=old.data(),missing={};
    for(const key of ["weightKg","sleepHours","waterMl","gutNotes","notes","foodNotes","exerciseNotes","proteinG","caloriesKcal"]){
     if((current[key]===undefined||current[key]===null||current[key]==="")&&record[key]!==undefined&&record[key]!==null&&record[key]!=="")missing[key]=record[key];
    }
    if(Object.keys(missing).length){await setDoc(ref,{...missing,updatedAt:serverTimestamp()},{merge:true});enriched++;}
    else skipped++;
    continue;
   }
   const {date,weightKg=null,sleepHours=null,waterMl=null,gutNotes=null,notes=null,foodNotes=null,exerciseNotes=null,proteinG=null,caloriesKcal=null}=record;
   await setDoc(ref,{date,weightKg,sleepHours,waterMl,gutNotes,notes,foodNotes,exerciseNotes,proteinG,caloriesKcal,source:"historical-import",updatedAt:serverTimestamp()});saved++;
  }
  status.textContent="每日紀錄處理完成，正在檢查週報…";
  const weekList=Array.isArray(payload.weeks)?payload.weeks:[payload.week];
  let weekSaved=0,weekSkipped=0;
  for(const w of weekList){
   if(!w||typeof w.id!=="string"||!/^2026-W\d{2}$/.test(w.id))throw Error("週報 ID 格式不正確");
   const weekRef=doc(db,"users",user.uid,"weeks",w.id);
   if((await getDoc(weekRef)).exists()){weekSkipped++;continue;}
   const {id,...weekData}=w;
   await setDoc(weekRef,{...weekData,source:"historical-import",updatedAt:serverTimestamp()});weekSaved++;
  }
  status.textContent="匯入完成：新增 "+saved+" 天，略過既有 "+skipped+" 天。正在更新儀表板…";
  try{await refresh();status.textContent="匯入完成：新增 "+saved+" 天、補齊 "+enriched+" 天缺漏欄位、略過 "+skipped+" 天；新增 "+weekSaved+" 份週報、略過 "+weekSkipped+" 份。";}
  catch(refreshError){status.textContent="資料已寫入，但儀表板更新失敗："+(refreshError.code||refreshError.message);}
 }catch(e){status.textContent="匯入失敗："+(e.code||e.message);}
 finally{button.disabled=false;}
};
