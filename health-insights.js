// Health OS v4: conservative, source-aware comparison rules.
// Only same report family + facility + method/model + units may be compared.
// Missing metadata means NO comparison; never infer a match from numeric similarity.
const num=v=>typeof v==="number"&&Number.isFinite(v)?v:null;
const fmt=(n,d=2)=>Number(n).toFixed(d);
const present=s=>typeof s==="string"&&s.trim().length>0;
const same=(a,b)=>present(a)&&present(b)&&a.trim().toLowerCase()===b.trim().toLowerCase();
function comparable(a,b,family){
 if(!a||!b||a.valid===false||b.valid===false)return false;
 if(family==="body")return same(a.source,b.source)&&same(a.deviceModel,b.deviceModel);
 if(family==="lab")return same(a.facility,b.facility)&&same(a.reportType,b.reportType)&&same(a.method,b.method);
 return false;
}
export function bodyInsights(rows){
 const data=rows.filter(x=>x&&x.date&&x.valid!==false).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 if(!data.length)return ["尚無有效身體組成量測。新增一筆可看數值，兩筆同型號量測才能比較。"];
 const current=data[0],previous=data.slice(1).find(x=>comparable(current,x,"body"));
 const result=[`最新量測：${current.date}｜${current.source||"來源待確認"}｜${current.deviceModel||"型號未記錄"}。`];
 const metrics=[["weightKg","體重","kg",1],["bodyFatPct","體脂率","個百分點",1],["skeletalMuscleKg","骨骼肌量","kg",1],["fatMassKg","體脂肪量","kg",1],["visceralFatLevel","內臟脂肪等級","級",0]];
 for(const [key,label,unit,digits] of metrics){
  const value=num(current[key]);if(value===null)continue;
  const old=previous?num(previous[key]):null;
  result.push(old===null?`${label}：${fmt(value,digits)} ${unit}；無同型號可比前次值。`:`${label}：${fmt(value,digits)} ${unit}，相較 ${previous.date} ${value===old?"持平":value>old?"增加":"下降"} ${fmt(Math.abs(value-old),digits)} ${unit}。`);
 }
 if(!previous)result.push("未找到同來源、同儀器型號的歷史量測，暫不計算變化；不能將不同品牌／型號的骨骼肌量或體脂率直接相減。");
 result.push("量測時間、飲食、運動與水分可能影響數值；單次差異不等於實際脂肪或肌肉改變。");
 return result;
}
const METRICS=[["ldl","LDL-C"],["hdl","HDL-C"],["triglyceride","三酸甘油脂"],["totalCholesterol","總膽固醇"],["glucoseAC","空腹血糖"],["hba1c","HbA1c"],["egfr","eGFR"],["totalBilirubin","總膽紅素"]];
export function labInsights(rows){
 const data=rows.filter(x=>x&&x.date).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 if(!data.length)return ["尚無檢驗報告。新增一份可閱讀數值；同檢驗系列兩份以上才可比較。"];
 const current=data[0],result=[`最新報告：${current.date}｜${current.facility||"院所待確認"}｜${current.reportType||"類型未記錄"}。`];
 for(const [key,label] of METRICS){
  const item=current.blood?.[key],value=num(item?.value);if(value===null)continue;
  const old=data.slice(1).find(x=>comparable(current,x,"lab")&&same(x.blood?.[key]?.unit,item.unit)&&num(x.blood?.[key]?.value)!==null);
  const prior=old?num(old.blood[key].value):null;
  const suffix=prior===null?"沒有相同院所、報告類型、方法及單位的可比較前次值。":`較 ${old.date} ${value===prior?"持平":value>prior?"上升":"下降"} ${fmt(Math.abs(value-prior))} ${item.unit}。`;
  result.push(`${label}：${fmt(value)} ${item.unit||"單位未記錄"}；${suffix}`);
 }
 result.push("各次正常／異常以原報告參考範圍與個人風險判讀，數值上升或下降不等於改善或惡化。不同院所、檢驗方法、報告類型或單位不跨組比較。");
 result.push("異常檢驗與影像發現須分開追蹤；必要時由醫師評估，勿自行停藥或調整處方。");
 return result;
}
export const comparisonPolicy={version:"v4-strict-1",requires:["reportType","facility","method","unit"],bodyRequires:["source","deviceModel"],crossGroupComparison:false,missingIsZero:false};
