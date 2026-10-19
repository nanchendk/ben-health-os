import {initializeApp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {getFirestore,collection,doc,setDoc,getDocs,query,orderBy,limit,getDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {firebaseConfig,ownerUid} from "./firebase-config.js";
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