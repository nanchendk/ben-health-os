"use strict";
let data = null;
let page = "overview";
const root = document.getElementById("view");
const safe = value => String(value ?? "—").replace(/[&<>"']/g, char => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[char]);
const valid = value => typeof value === "number" && Number.isFinite(value);
function change(after,before) {
  if (!valid(after) || !valid(before)) return "—";
  const diff = after-before;
  return (diff>0?"+":"")+diff.toFixed(2);
}
function card(title, body) {
  return '<section class="card"><h2>'+safe(title)+'</h2>'+body+'</section>';
}
function table(headers, rows) {
  return '<div class="scroll"><table><thead><tr>'+headers.map(x=>'<th>'+safe(x)+'</th>').join("")+'</tr></thead><tbody>'+
    rows.map(row=>'<tr>'+row.map(x=>'<td>'+safe(x)+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
}
function metrics(items) {
  return '<div class="grid">'+items.map(x=>'<div class="metric"><small>'+safe(x[0])+'</small><b>'+safe(x[1])+'</b></div>').join("")+'</div>';
}
function note(message) {return '<div class="note">'+safe(message)+'</div>';}
function render() {
  document.querySelectorAll("[data-page]").forEach(button => button.classList.toggle("active",button.dataset.page===page));
  if (!data) {
    root.innerHTML=card("等待匯入","請先選擇私人 JSON 資料檔，載入後會顯示真實報告。");
    return;
  }
  let output="";
  if (page==="overview") {
    output=card("健康報告總覽",metrics([
      ["定安診所追蹤",data.clinic.length+" 份"],["年度健檢",data.annual.length+" 份"],
      ["InBody 正式報告",data.body.length+" 份"],["待核對截圖",data.unverifiedBody.length+" 筆"],
      ["比較規則","同類同單位"],["資料儲存","僅本機"]
    ]));
    output+=card("重點追蹤",note("定安診所：總膽紅素上升、HDL 偏低及 9 月尿液檢驗異常，建議帶原報告回診確認。")+
      note("年度健檢：部分代謝指標改善，腎臟影像發現與 HDL 下降仍需追蹤。"));
  }
  if (page==="clinic") {
    const [a,b]=data.clinic;
    const rows=Object.keys(b.blood).filter(k=>valid(a.blood[k]?.value)&&valid(b.blood[k]?.value)&&a.blood[k].unit===b.blood[k].unit)
      .map(k=>[b.blood[k].label+" ("+b.blood[k].unit+")",a.blood[k].value,b.blood[k].value,change(b.blood[k].value,a.blood[k].value)]);
    output=card("定安診所｜2026/6/24 → 9/23",table(["血液指標","6/24","9/23","變化"],rows)+
      note("三酸甘油脂下降；LDL 略升、HDL 下降。總膽紅素連續偏高，請醫師評估。"));
    output+=card("尿液追蹤",table(["指標","6/24","9/23"],data.urine.map(x=>[x.label,x.june,x.september]))+
      note("9 月尿液異常須結合症狀、採樣狀況及醫師判讀，必要時複查。"));
  }
  if (page==="annual") {
    const [a,b]=data.annual;
    const rows=Object.keys(b.metrics).filter(k=>valid(a.metrics[k]?.value)&&valid(b.metrics[k]?.value)&&a.metrics[k].unit===b.metrics[k].unit)
      .map(k=>[b.metrics[k].label+" ("+b.metrics[k].unit+")",a.metrics[k].value,b.metrics[k].value,change(b.metrics[k].value,a.metrics[k].value)]);
    output=card("年度健檢｜2024 → 2025",table(["指標","2024","2025","變化"],rows)+
      note("體重、血糖與部分肝功能指標改善，HDL 下降。"));
    output+=card("影像檢查",table(["年度","報告所見"],data.imaging.map(x=>[x.date,x.summary]))+
      note("影像分級及尺寸須由醫師結合原始影像評估，不與血液數值混算。"));
  }
  if (page==="body") {
    const body=data.body.map(x=>'<p class="muted">'+safe(x.date)+"｜"+safe(x.deviceModel)+"</p>"+
      metrics([["體重",x.weightKg+" kg"],["骨骼肌量",x.skeletalMuscleKg+" kg"],
        ["體脂肪量",x.fatMassKg+" kg"],["體脂率",x.bodyFatPct+"%"],
        ["內臟脂肪等級",x.visceralFatLevel],["基礎代謝率",x.bmrKcal+" kcal"]])).join("");
    output=card("InBody｜已核對正式報告",body+note("同型號至少兩筆有效紀錄才比較，不同儀器不混算。"));
    output+=card("待核對體組成截圖",table(["體重","比較狀態"],data.unverifiedBody.map(x=>[x.weightKg+" kg","日期／型號待確認"])));
  }
  if (page==="quality") {
    output=card("分類與比較限制",table(["資料","狀態"],[
      ["定安診所 2026","同院所同類型分組比較"],["年度健檢 2024–2025","同系列同單位比較"],
      ["InBody 2025","單次正式報告"],["其他體組成截圖","日期／型號待確認，不混算"],
      ["2019／2020／2022 健檢","待逐欄核對，不先混入"]
    ])+note("不同院所、不同檢驗方法或不同儀器的數值不直接比較。"));
  }
  root.innerHTML=output;
}
document.querySelectorAll("[data-page]").forEach(button=>button.addEventListener("click",()=>{page=button.dataset.page;render();}));
document.getElementById("file").addEventListener("change",async event=>{
  try {
    const file=event.target.files?.[0];
    if(!file)return;
    const input=JSON.parse(await file.text());
    if(input.format!=="ben-health-v4-private-preview-1"||!Array.isArray(input.clinic)||!Array.isArray(input.annual)||
      !Array.isArray(input.body)||!Array.isArray(input.unverifiedBody)||!Array.isArray(input.urine)||!Array.isArray(input.imaging))
      throw new Error("資料格式不符合預覽版要求");
    data=input;
    document.getElementById("load").innerHTML="<b>✓ 私人資料已在本機載入</b><p class='muted'>不會上傳至網站。重新整理即清除。</p>";
    render();
  } catch(error) {root.textContent="匯入失敗："+error.message;}
});
render();
