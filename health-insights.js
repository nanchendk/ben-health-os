// Ben Health OS v4 — informational comparison only, not a diagnosis.
// Comparisons require matching units and compatible source/method.
const number=v=>typeof v==="number"&&Number.isFinite(v)?v:null;
const safe=(v,d=1)=>Number(v).toFixed(d);
export function bodyInsights(rows){
 const valid=rows.filter(x=>x.valid!==false&&x.date).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 if(!valid.length)return ["尚無有效身體組成量測。新增一筆即可開始解讀；兩筆以上提供變化比較。"];
 const current=valid[0],previous=valid.slice(1).find(x=>x.source===current.source);
 const result=[`最近量測：${current.date}（${current.source||"來源未標示"}）。`];
 for(const [key,label,unit] of [["bodyFatPct","體脂率","個百分點"],["skeletalMuscleKg","骨骼肌量"," kg"],["weightKg","體重"," kg"]]){
  const a=number(current[key]),b=previous?number(previous[key]):null;
  if(a===null)continue;
  result.push(b===null?`${label}：${safe(a)}；目前沒有同來源的可比較前次數值。`:`${label}：${safe(a)}；較 ${previous.date} ${a>b?"增加":a<b?"下降":"持平"} ${safe(Math.abs(a-b))}${unit}。`);
 }
 result.push("體脂計與 InBody 不交叉比較；水分、進食與量測時間可能影響體組成結果。單次波動不等於脂肪或肌肉真正改變。");
 return result;
}
const LABS=[["ldl","LDL-C"],["hdl","HDL-C"],["triglyceride","三酸甘油酯"],["totalCholesterol","總膽固醇"],["glucoseAC","空腹血糖"],["hba1c","HbA1c"],["egfr","eGFR"],["totalBilirubin","總膽紅素"]];
export function labInsights(rows){
 const valid=rows.filter(x=>x.date).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 if(!valid.length)return ["尚無檢驗報告。上傳一份即可解讀報告數值；第二份起可做歷史比較。"];
 const now=valid[0],out=[`最近報告：${now.date}（${now.facility||"院所未標示"}）。`];
 for(const [key,label] of LABS){
  const obj=now.blood?.[key],v=number(obj?.value);if(v===null)continue;
  const older=valid.slice(1).find(x=>number(x.blood?.[key]?.value)!==null&&x.blood[key].unit===obj.unit);
  let line=`${label}：${safe(v,2)} ${obj.unit||""}`;
  if(older){const p=older.blood[key].value;line+=`；較 ${older.date} ${v>p?"上升":v<p?"下降":"持平"} ${safe(Math.abs(v-p),2)} ${obj.unit||""}`;}
  else line+="；尚無同單位的前次數值";
  out.push(line+"。");
 }
 out.push("請以原報告參考區間、檢驗方法、採檢條件與個人風險評估結果；數值上升或下降不必然代表改善或惡化。");
 out.push("如報告標示異常，請與醫師確認個人目標、複查時機及是否需要處置；本系統不提供診斷或自行調藥建議。");
 return out;
}
