import {initializeApp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {getFirestore,collection,doc,setDoc,getDocs,query,orderBy,limit,getDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {firebaseConfig,ownerUid} from "./firebase-config.js";
window.__benModuleLoaded = true;
const auth=getAuth(initializeApp(firebaseConfig)),db=getFirestore(),$=id=>document.getElementById(id);
let user=null;
const allowed=u=>u?.uid===ownerUid&&u.providerData.some(p=>p.providerId==="google.com");
$("loginBtn").onclick=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){$("loginStatus").textContent=e.code||"登入失敗"}};
async function refresh(){
 const uid=user.uid;
 const results=await getDocs(query(collection(db,"users",uid,"daily"),orderBy("date","desc"),limit(14)));
 const list=$("recentRecords");list.replaceChildren();
 let found=false;
 results.forEach(s=>{const d=s.data(),row=document.createElement("div");row.className="record";
 const label=document.createElement("span");label.textContent=[d.date,d.weightKg==null?"體重未回報":d.weightKg+"kg",d.sleepHours==null?"睡眠未回報":d.sleepHours+"小時",d.gutNotes||"腸胃未回報"].join("｜");
 row.append(label);list.append(row);
 if(!found&&typeof d.weightKg==="number"){$("latestWeight").textContent=d.weightKg+" kg";$("weightDate").textContent=d.date;found=true;}
 });
 const week=await getDoc(doc(db,"users",uid,"weeks","2026-W14"));
 if(week.exists()){const w=week.data();$("weekAverage").textContent=typeof w.averageWeightKg==="number"?w.averageWeightKg+" kg":"未回報";$("weekStatus").textContent=w.status||"未回報";}
}
onAuthStateChanged(auth,async u=>{
 user=null;$("dashboardView").hidden=true;$("accountArea").replaceChildren();
 if(!u){$("loginView").hidden=false;return;}
 if(!allowed(u)){$("loginStatus").textContent="此帳號未授權";await signOut(auth);return;}
 user=u;$("loginView").hidden=true;$("dashboardView").hidden=false;
 const b=document.createElement("button");b.textContent="登出";b.onclick=()=>signOut(auth);$("accountArea").append(b);
 try{await refresh()}catch(e){$("saveStatus").textContent="讀取失敗："+e.code}
});
$("dailyForm").onsubmit=async e=>{
 e.preventDefault();if(!user||!allowed(auth.currentUser))return;
 const date=$("recordDate").value;if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
 const num=id=>$(id).value.trim()===""?null:Number($(id).value);
 const txt=id=>$(id).value.trim()||null;
 $("saveBtn").disabled=true;
 try{await setDoc(doc(db,"users",user.uid,"daily",date),{date,weightKg:num("weight"),sleepHours:num("sleepHours"),waterMl:num("waterMl"),gutNotes:txt("gutNotes"),notes:txt("notes"),source:"manual",updatedAt:serverTimestamp()});$("saveStatus").textContent="儲存成功";await refresh()}
 catch(err){$("saveStatus").textContent="儲存失敗："+err.code}
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
  if(payload.format!=="ben-health-os-import-v1"||!Array.isArray(payload.daily)||!payload.week)throw Error("檔案格式不符");
  if(payload.daily.length>31)throw Error("單次最多31筆");
  let saved=0,skipped=0;
  status.textContent="格式驗證通過，共 "+payload.daily.length+" 筆每日紀錄，準備匯入…";
  for(const [index,record] of payload.daily.entries()){
   status.textContent="正在處理第 "+(index+1)+"/"+payload.daily.length+" 筆（"+record.date+"）；已新增 "+saved+" 筆、略過 "+skipped+" 筆";
   if(!/^\d{4}-\d{2}-\d{2}$/.test(record.date))throw Error("日期格式不正確");
   const ref=doc(db,"users",user.uid,"daily",record.date);
   if((await getDoc(ref)).exists()){skipped++;continue;}
   const {date,weightKg=null,sleepHours=null,waterMl=null,gutNotes=null,notes=null}=record;
   await setDoc(ref,{date,weightKg,sleepHours,waterMl,gutNotes,notes,source:"historical-import",updatedAt:serverTimestamp()});saved++;
  }
  status.textContent="每日紀錄處理完成，正在檢查週報…";
  if(typeof payload.week.id!=="string"||!payload.week.id)throw Error("週報 ID 缺漏");
  const weekRef=doc(db,"users",user.uid,"weeks",payload.week.id);
  if(!(await getDoc(weekRef)).exists()){
   const {id,...weekData}=payload.week;
   await setDoc(weekRef,{...weekData,source:"historical-import",updatedAt:serverTimestamp()});
  }
  status.textContent="匯入完成：新增 "+saved+" 天，略過既有 "+skipped+" 天。正在更新儀表板…";
  try{await refresh();status.textContent="匯入完成：新增 "+saved+" 天，略過既有 "+skipped+" 天。";}
  catch(refreshError){status.textContent="資料已寫入，但儀表板更新失敗："+(refreshError.code||refreshError.message);}
 }catch(e){status.textContent="匯入失敗："+(e.code||e.message);}
 finally{button.disabled=false;}
};
