import{DAILY,WEEKS,HOME,CLINIC,LABS,METS,EXCLUSIONS}from"./dashboard-data.js?v=20261019-firestore-1";
const $=id=>document.getElementById(id);
const fmt=(x,p=2)=>x==null?"未回報":typeof x==="number"?x.toFixed(p):String(x);
const td=(x)=>"<td>"+String(x??"未回報").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")+"</td>";
const render=(id,rows)=>{$(id).innerHTML=rows.map(r=>"<tr>"+r.map(td).join("")+"</tr>").join("")||'<tr><td>Firestore 尚無此類資料</td></tr>'};
render("wtbody",WEEKS.map((r,i)=>[r[0],r[1],fmt(r[2]),i&&r[2]!=null&&WEEKS[i-1][2]!=null?fmt(r[2]-WEEKS[i-1][2]):"—",r[3]]));
render("htbody",HOME.map(r=>r.map((x,i)=>i===9?x==="bad"?"不採信":"有效":x)));
render("ctbody",CLINIC.map(r=>[r.date,fmt(r.weight),fmt(r.smm),fmt(r.fat),fmt(r.bmi),fmt(r.fatPct),fmt(r.visceral),fmt(r.bmr),r.valid?r.note:"不採信："+r.note]));
const labs=(arr)=>arr.map(r=>[r.name,...r.v.map(x=>fmt(x,typeof x==="number"?2:0)),r.ref||r.note||""]);
render("lipidBody",labs(LABS.lipid));render("liverBody",labs(LABS.liver));render("otherBody",labs(LABS.other));render("urineBody",labs(LABS.urine));
render("metsBody",METS.map(r=>[r.name,r.th,r.base,r.now,r.met]));$("metsCount").textContent=METS.length||"未統計";
render("exBody",EXCLUSIONS);
document.querySelectorAll("[data-lab-date]").forEach((e,i)=>e.textContent=LABS.dates[i]||"未匯入");
function chart(id,points,field,w,h){const svg=$(id);if(points.length<2){svg.outerHTML='<p class="note">目前有效量測不足，暫不繪製趨勢。</p>';return}const vals=points.map(p=>p[field]);const lo=Math.min(...vals)-.5,hi=Math.max(...vals)+.5;const x=i=>35+i/(points.length-1)*(w-50),y=v=>15+(hi-v)/(hi-lo)*(h-40);const line=points.map((p,i)=>(i?"L":"M")+x(i).toFixed(1)+","+y(p[field]).toFixed(1)).join(" ");svg.innerHTML='<path d="'+line+'" fill="none" stroke="#167d75" stroke-width="2.5"/>'+points.map((p,i)=>'<circle cx="'+x(i)+'" cy="'+y(p[field])+'" r="3" fill="#167d75"/>').join("")}
chart("wchart",DAILY.filter(r=>!r[2]).map(r=>({v:r[1]})),"v",820,260);
chart("fchart",HOME.filter(r=>r[9]!=="bad"&&typeof r[2]==="number").map(r=>({v:r[2]})),"v",380,130);
chart("mchart",HOME.filter(r=>r[9]!=="bad"&&typeof r[3]==="number").map(r=>({v:r[3]})),"v",380,130);
$("theme").onclick=()=>{const dark=document.body.dataset.theme==="dark";document.body.dataset.theme=dark?"light":"dark";document.body.style.background=dark?"#f5f7f9":"#15212b";document.body.style.color=dark?"#202c39":"#dfe9ec"};
