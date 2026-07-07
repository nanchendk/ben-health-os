const state = {
  profile: { startWeight: 98, currentWeight: 98, targetWeight: 80, waterTarget: 2200 },
  day: {
    date: "2026-07-07",
    waterMl: 1600,
    exercise: "彈力繩 15 min",
    meals: [
      { type: "午餐", desc: "紫米飯、白肉魚、豆干、蒸蛋、花椰菜、多樣蔬菜", kcal: 580, protein: 35, egg: 1.0, score: 95 }
    ]
  },
  weekly: {
    eggTargetMax: 10,
    eggCurrent: 4.5,
    fishCurrent: 1,
    fishTarget: 2,
    vegetableMeals: 3,
    vegetableTarget: 14,
    fruitServings: 1,
    fruitTarget: 7,
    waterAvg: 1800,
    waterTarget: 2200
  }
};

const mealName = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "加餐" };
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function pct(current, target){ return clamp(Math.round((current / target) * 100), 0, 100); }
function statusClass(percent){ if(percent >= 85) return "green"; if(percent >= 55) return "yellow"; return "red"; }

function updateDashboard(){
  const totalKcal = state.day.meals.reduce((s,m)=>s+Number(m.kcal||0),0);
  const totalProtein = state.day.meals.reduce((s,m)=>s+Number(m.protein||0),0);
  const avgScore = Math.round(state.day.meals.reduce((s,m)=>s+Number(m.score||0),0)/Math.max(state.day.meals.length,1));

  document.getElementById("dailyScore").textContent = avgScore;
  document.getElementById("calories").textContent = `${totalKcal} kcal`;
  document.getElementById("protein").textContent = `${totalProtein} g`;
  document.getElementById("water").textContent = `${state.day.waterMl} / ${state.profile.waterTarget} ml`;
  document.getElementById("exercise").textContent = state.day.exercise;

  const lost = state.profile.startWeight - state.profile.currentWeight;
  const targetLoss = state.profile.startWeight - state.profile.targetWeight;
  const progress = pct(lost, targetLoss);
  document.getElementById("currentWeight").textContent = state.profile.currentWeight.toFixed(1);
  document.getElementById("weightProgress").style.width = `${progress}%`;
  document.getElementById("weightText").textContent = `已完成 ${progress}%｜還差 ${(state.profile.currentWeight - state.profile.targetWeight).toFixed(1)} kg`;

  renderMeals();
  renderRadar();
  renderRecommendation();
}

function renderMeals(){
  const el = document.getElementById("mealList");
  el.innerHTML = "";
  state.day.meals.forEach(meal => {
    const div = document.createElement("div");
    div.className = "meal";
    div.innerHTML = `
      <div class="meal-type">${meal.type}</div>
      <div>
        <div class="meal-desc">${meal.desc}</div>
        <small class="hint">${meal.kcal || 0} kcal｜蛋白質 ${meal.protein || 0}g｜雞蛋等效 ${meal.egg || 0} 顆</small>
      </div>
      <div class="meal-score">${meal.score || "-"}分</div>`;
    el.appendChild(div);
  });
}

function renderRadar(){
  const items = [
    ["🥚 雞蛋", state.weekly.eggCurrent, state.weekly.eggTargetMax, `${state.weekly.eggCurrent}/${state.weekly.eggTargetMax}`],
    ["🐟 魚類", state.weekly.fishCurrent, state.weekly.fishTarget, `${state.weekly.fishCurrent}/${state.weekly.fishTarget}`],
    ["🥬 蔬菜", state.weekly.vegetableMeals, state.weekly.vegetableTarget, `${state.weekly.vegetableMeals}/${state.weekly.vegetableTarget}`],
    ["🍎 水果", state.weekly.fruitServings, state.weekly.fruitTarget, `${state.weekly.fruitServings}/${state.weekly.fruitTarget}`],
    ["💧 飲水", state.weekly.waterAvg, state.weekly.waterTarget, `${state.weekly.waterAvg}ml`]
  ];
  const el = document.getElementById("radarList");
  el.innerHTML = "";
  items.forEach(([label,current,target,text]) => {
    const percent = pct(current,target);
    const color = statusClass(percent);
    const div = document.createElement("div");
    div.className = "radar-item";
    div.innerHTML = `<span>${label}</span><div class="bar"><div class="${color}" style="width:${percent}%"></div></div><strong>${text}</strong>`;
    el.appendChild(div);
  });
}

function renderRecommendation(){
  const totalEgg = state.weekly.eggCurrent;
  let main = "晚餐以清爽蛋白＋蔬菜為主，澱粉減量。";
  let chips = ["雞腿去皮", "燙青菜", "半碗飯", "飯後散步15分鐘"];
  if(totalEgg >= 7){
    main = "本週蛋類已接近上限，下一餐改用魚、雞肉或豆腐當蛋白質來源。";
    chips = ["魚類", "豆腐", "大量青菜", "避免再加蛋"];
  }
  document.getElementById("nextMealMain").textContent = main;
  const chipsEl = document.getElementById("nextMealChips");
  chipsEl.innerHTML = "";
  chips.forEach(c => {
    const span = document.createElement("span");
    span.className = "chip";
    span.textContent = c;
    chipsEl.appendChild(span);
  });
}

document.getElementById("addMealBtn").addEventListener("click", () => {
  const type = document.getElementById("mealType").value;
  const desc = document.getElementById("mealDesc").value.trim();
  const kcal = Number(document.getElementById("mealKcal").value || 0);
  const protein = Number(document.getElementById("mealProtein").value || 0);
  const egg = Number(document.getElementById("mealEgg").value || 0);
  const score = Number(document.getElementById("mealScore").value || 0);
  if(!desc){ alert("請先輸入餐點描述"); return; }
  state.day.meals.push({ type: mealName[type], desc, kcal, protein, egg, score });
  state.weekly.eggCurrent += egg;
  updateDashboard();
  ["mealDesc","mealKcal","mealProtein","mealEgg","mealScore"].forEach(id => document.getElementById(id).value = "");
});

updateDashboard();
