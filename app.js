"use strict";

const STORAGE_KEY = "forward-step-state-v1";

const LADDER_LEVELS = [
  { name: "0级 · 热身", action: "对任何人进行一次自然的眼神回应或微笑；不盯视。" },
  { name: "1级 · 开口", action: "向店员或路人问一个真实、简短的问题。" },
  { name: "2级 · 表达", action: "表达一次不要求回应的友善评价，然后允许结束。" },
  { name: "3级 · 主动认识", action: "向感兴趣的人说一句真实、简短的话，然后允许自己结束。" },
  { name: "4级 · 双向交流", action: "在对方也愿意交流时，进行 30–90 秒的双向对话。" },
  { name: "5级 · 继续认识", action: "只有对方也表现出投入时，才表达继续认识的意愿。" }
];

const TITLES = [
  { name: "搭讪小白", threshold: 0 },
  { name: "初见勇气", threshold: 12 },
  { name: "学有所成", threshold: 30 },
  { name: "搭讪入门", threshold: 60 },
  { name: "搭讪筑基", threshold: 100 },
  { name: "从容行者", threshold: 160 },
  { name: "搭讪大师", threshold: 260 },
  { name: "真诚自如", threshold: 420 }
];

const MAP_REGIONS = [
  { name: "起步港", threshold: 0, position: [61, 351] },
  { name: "回声林", threshold: 12, position: [123, 278] },
  { name: "边界丘", threshold: 30, position: [190, 213] },
  { name: "星光原", threshold: 60, position: [251, 147] },
  { name: "从容城", threshold: 100, position: [315, 79] },
  { name: "自在峰", threshold: 160, position: [339, 28] }
];

const REASON_GROUPS = {
  fear_rejection: {
    label: "害怕被拒绝",
    keywords: ["拒绝", "没戏", "看不上", "不喜欢", "成功率", "白费", "失败"],
    plan: "如果出现“大概率会被拒绝”的想法，那么我只完成当前等级的最小动作，不预测结果。"
  },
  no_words: {
    label: "不知道说什么",
    keywords: ["说什么", "开场", "没话", "不会聊", "词", "脑子空白"],
    plan: "如果脑子突然空白，那么我只说一句真实的情境观察；说完就允许自己结束。"
  },
  hesitation: {
    label: "犹豫后错过",
    keywords: ["犹豫", "错过", "太晚", "来不及", "想太久", "走了"],
    plan: "如果发现自己开始反复推演，那么我先朝合适方向移动一步，再决定措辞。"
  },
  self_judgment: {
    label: "自我否定",
    keywords: ["不帅", "不好看", "状态差", "自卑", "配不上", "衣服", "身材", "没价值"],
    plan: "如果开始评价自己的外形或价值，那么我把它标记为“一个念头”，继续做最小动作。"
  },
  social_judgment: {
    label: "怕别人评价",
    keywords: ["别人看", "围观", "尴尬", "丢脸", "嘲笑", "朋友", "路人"],
    plan: "如果担心旁人评价，那么我把注意力放回距离、语速和边界，只完成一次礼貌表达。"
  },
  physical_anxiety: {
    label: "身体太紧张",
    keywords: ["紧张", "心跳", "腿软", "发抖", "呼吸", "僵", "害怕"],
    plan: "如果心跳加快，那么我感受脚底触地，同时开始行动；不等待紧张降到零。"
  },
  disturb: {
    label: "担心打扰",
    keywords: ["打扰", "不方便", "赶时间", "耳机", "工作", "不合适"],
    plan: "如果担心打扰，那么我只做三项环境检查；通过就行动，不通过就坦然离开。"
  },
  low_energy: {
    label: "状态或精力不足",
    keywords: ["累", "没精神", "没心情", "状态不好", "困", "身体不舒服"],
    plan: "如果当天精力不足，那么我把任务降一级；完成一个更小动作也算训练。"
  },
  other: {
    label: "其他阻碍",
    keywords: [],
    plan: "如果同样的阻碍再次出现，那么我先完成一个更小、可退出的动作，再做下一步决定。"
  }
};

const OUTCOME_LABELS = {
  completed: "完成了主动交流",
  graceful_exit: "对方没兴趣，我自然退出",
  unsuitable: "判断不适合打扰",
  avoided: "我回避了"
};

const COURAGE_FUND_RATES = {
  everyday: { solo: 0.05, companion: 0.2, group: 0.3 },
  strong: { solo: 2, companion: 7.5, group: 10.5 }
};

const COURAGE_FUND_LEVELS = {
  everyday: "一般心动",
  strong: "特别心动"
};

const COURAGE_FUND_GROUPS = {
  solo: "独自一人",
  companion: "与 1 人同行",
  group: "与 2 人及以上同行"
};

const DEFERRAL_REASONS = {
  rain: { label: "当晚有雨", icon: "☂" },
  busy: { label: "当晚有事", icon: "⌚" },
  energy: { label: "身体状态不佳", icon: "◐" },
  setting: { label: "场地或时机不合适", icon: "◇" },
  other: { label: "其他原因", icon: "＋" }
};

const CONTEXTS = [
  "商场",
  "街道",
  "咖啡店",
  "书店",
  "校园",
  "活动现场",
  "交通场所",
  "小区公共区域",
  "美术馆",
  "博物馆",
  "公园/绿道",
  "展览/市集",
  "夜市/步行街",
  "其他"
];
const WEEKDAY_NAMES = ["一", "二", "三", "四", "五", "六", "日"];

const defaultState = {
  version: 2,
  points: 0,
  settings: {
    weeklyTarget: 4,
    dailyLimit: 5,
    ladderLevel: 3,
    rewardLabel: "看一场一直想看的电影",
    rewardAmount: 0
  },
  logs: [],
  cards: [],
  expenses: [],
  deferrals: [],
  rewardClaims: []
};

let state = loadState();
let installPrompt = null;
let toastTimer = null;
let trainingFlow = null;
let selectedDeferralReason = "";

const el = (id) => document.getElementById(id);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") return structuredClone(defaultState);
    const migrated = {
      ...structuredClone(defaultState),
      ...saved,
      settings: { ...defaultState.settings, ...(saved.settings || {}) },
      logs: Array.isArray(saved.logs) ? saved.logs : [],
      cards: Array.isArray(saved.cards) ? saved.cards : [],
      expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
      deferrals: Array.isArray(saved.deferrals) ? saved.deferrals : [],
      rewardClaims: Array.isArray(saved.rewardClaims) ? saved.rewardClaims : []
    };
    if (Number(saved.version || 1) < 2) {
      migrated.version = 2;
      migrated.settings.weeklyTarget = 4;
      migrated.settings.dailyLimit = 5;
    }
    return migrated;
  } catch (error) {
    console.warn("无法读取本地数据，已使用默认设置。", error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weekStart(date = new Date()) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function weekKey(date = new Date()) {
  return dateKey(weekStart(date));
}

function currentWeekItems(items, field = "createdAt") {
  const start = weekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return items.filter((item) => {
    const date = new Date(item[field]);
    return date >= start && date < end;
  });
}

function currentWeekLogs() {
  return currentWeekItems(state.logs);
}

function currentWeekDeferrals() {
  return currentWeekItems(state.deferrals);
}

function actionLogs(logs = state.logs) {
  return logs.filter((log) => log.kind === "completed" || log.kind === "graceful_exit");
}

function courageFundAmount(level = "everyday", group = "solo") {
  return Number(COURAGE_FUND_RATES[level]?.[group] || 0);
}

function courageFundTotal(logs = state.logs) {
  return actionLogs(logs).reduce((sum, log) => sum + Number(log.fundAmount || 0), 0);
}

function formatMoney(value, signed = false) {
  const amount = Number(value || 0);
  if (!signed || amount === 0) return `¥${amount.toFixed(2)}`;
  return `${amount > 0 ? "+" : "-"}¥${Math.abs(amount).toFixed(2)}`;
}

function trainingDayKeys(logs = currentWeekLogs()) {
  return [...new Set(actionLogs(logs).map((log) => dateKey(new Date(log.createdAt))))];
}

function actionCountsByDay(logs = currentWeekLogs()) {
  return actionLogs(logs).reduce((counts, log) => {
    const key = dateKey(new Date(log.createdAt));
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function fullTrainingDayKeys(logs = currentWeekLogs()) {
  const limit = Number(state.settings.dailyLimit);
  return Object.entries(actionCountsByDay(logs))
    .filter(([, count]) => count >= limit)
    .map(([key]) => key);
}

function formatShortDate(value) {
  const date = new Date(value);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatTime(value) {
  const date = new Date(value);
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function currentTitle(points = state.points) {
  return [...TITLES].reverse().find((title) => points >= title.threshold) || TITLES[0];
}

function nextTitle(points = state.points) {
  return TITLES.find((title) => title.threshold > points) || null;
}

function currentMapRegion(points = state.points) {
  return [...MAP_REGIONS].reverse().find((region) => points >= region.threshold) || MAP_REGIONS[0];
}

function showToast(message) {
  const toast = el("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function vibrate(pattern = 35) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function getWeekDays() {
  const start = weekStart();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function hasSpacedThreeDays() {
  const doneKeys = trainingDayKeys();
  const dayIndexes = getWeekDays()
    .slice(0, 6)
    .map((date, index) => (doneKeys.includes(dateKey(date)) ? index : -1))
    .filter((index) => index >= 0);

  for (let a = 0; a < dayIndexes.length; a += 1) {
    for (let b = a + 1; b < dayIndexes.length; b += 1) {
      for (let c = b + 1; c < dayIndexes.length; c += 1) {
        if (dayIndexes[b] - dayIndexes[a] >= 2 && dayIndexes[c] - dayIndexes[b] >= 2) return true;
      }
    }
  }
  return false;
}

function isRewardClaimed() {
  return state.rewardClaims.some((claim) => claim.week === weekKey());
}

function renderToday() {
  const weekLogs = currentWeekLogs();
  const activeDays = trainingDayKeys(weekLogs);
  const completeDays = fullTrainingDayKeys(weekLogs);
  const counts = actionCountsByDay(weekLogs);
  const deferrals = currentWeekDeferrals();
  const todayLogs = state.logs.filter((log) => dateKey(new Date(log.createdAt)) === dateKey());
  const todayActions = actionLogs(todayLogs).length;
  const target = Number(state.settings.weeklyTarget);
  const dailyLimit = Number(state.settings.dailyLimit);
  const targetMet = completeDays.length >= target;
  const todayDeferral = deferrals.find((item) => item.fromDate === dateKey());

  el("levelName").textContent = currentTitle().name;
  el("totalPoints").textContent = state.points;
  el("heroFundTotal").textContent = formatMoney(courageFundTotal());
  el("todayAttempts").textContent = todayActions;
  el("todayLimit").textContent = ` / ${dailyLimit}`;
  el("trainingStatus").textContent = targetMet ? "本周4个完整训练日已完成" : `本周 ${completeDays.length} / ${target} 个完整训练日`;
  el("weekProgressText").textContent = `${completeDays.length} / ${target} 个完整训练日`;
  el("startButton").innerHTML = todayActions >= dailyLimit
    ? "<span aria-hidden=\"true\">＋</span> 本日目标已完成 · 自愿记录"
    : "<span aria-hidden=\"true\">➜</span> 注意到一个合适机会";

  el("weekStrip").innerHTML = getWeekDays()
    .map((date, index) => {
      const key = dateKey(date);
      const count = counts[key] || 0;
      const deferred = deferrals.some((item) => item.fromDate === key);
      const status = count >= dailyLimit ? "complete" : deferred ? "deferred" : count > 0 ? "progress" : "neutral";
      const today = key === dateKey();
      const mark = status === "complete" ? "✓" : status === "progress" ? `${count}/${dailyLimit}` : status === "deferred" ? (count ? `${count}↷` : "↷") : date.getDate();
      const label = status === "complete" ? `完成${dailyLimit}次接近` : status === "progress" ? `已完成${count}次接近` : status === "deferred" ? `${count ? `已完成${count}次并` : ""}顺延` : "休息或未安排";
      return `<div class="day-dot ${status}${today ? " today" : ""}" aria-label="周${WEEKDAY_NAMES[index]}：${label}">
        <span>周${WEEKDAY_NAMES[index]}</span>
        <i>${mark}</i>
      </div>`;
    })
    .join("");

  const weekStatus = el("weekStatusBanner");
  weekStatus.className = "week-status-banner";
  if (targetMet) {
    weekStatus.classList.add("complete");
    weekStatus.textContent = `绿色完成：本周已有 ${completeDays.length} 个完整训练日，每天都完成了 ${dailyLimit} 次实际接近。`;
  } else if (deferrals.length) {
    weekStatus.classList.add("deferred");
    weekStatus.textContent = `黄色顺延：本周已有 ${deferrals.length} 次现实调整，还差 ${target - completeDays.length} 个完整训练日。延期不等于失败。`;
  } else if (activeDays.length) {
    weekStatus.classList.add("progress");
    weekStatus.textContent = `蓝色进展：你已经在 ${activeDays.length} 天采取了行动；未满 ${dailyLimit} 次的日子也保留真实进度。`;
  } else {
    weekStatus.textContent = "灰色待开始：白天偶遇和晚间专门练习都会计入，选择适合的机会即可。";
  }

  const deferButton = el("deferButton");
  if (todayActions >= dailyLimit) {
    deferButton.disabled = true;
    deferButton.innerHTML = "<span aria-hidden=\"true\">✓</span> 今日已完成，无需顺延";
  } else if (todayDeferral) {
    deferButton.disabled = true;
    deferButton.innerHTML = `<span aria-hidden="true">↷</span> 已因“${escapeHtml(DEFERRAL_REASONS[todayDeferral.reason]?.label || "其他原因")}”顺延到明天`;
  } else if (targetMet) {
    deferButton.disabled = true;
    deferButton.innerHTML = "<span aria-hidden=\"true\">✓</span> 本周目标已经完成";
  } else {
    deferButton.disabled = false;
    deferButton.innerHTML = "<span aria-hidden=\"true\">↷</span> 今晚无法完成，顺延一天";
  }

  const restPass = el("restPass");
  const restEarned = hasSpacedThreeDays();
  restPass.classList.toggle("earned", restEarned);
  restPass.innerHTML = restEarned
    ? `<span class="rest-icon" aria-hidden="true">◐</span><div><strong>主动休息券已获得</strong><p>你完成了 3 个间隔训练日。休息不会破坏进度，也不用补签。</p></div>`
    : `<span class="rest-icon" aria-hidden="true">◐</span><div><strong>主动休息券尚未获得</strong><p>前六天完成 3 个间隔训练日后获得；漏一天不会清零。</p></div>`;

  const rewardClaimed = isRewardClaimed();
  el("rewardLabel").textContent = state.settings.rewardLabel;
  el("rewardValue").textContent = Number(state.settings.rewardAmount) > 0
    ? `真实预算 ¥${Number(state.settings.rewardAmount).toFixed(0)} · 不计算虚构省钱`
    : "时间型奖赏 · 真实兑现";
  el("rewardProgress").style.width = `${Math.min(100, (completeDays.length / target) * 100)}%`;
  el("rewardState").textContent = rewardClaimed
    ? "本周已经兑现"
    : targetMet
      ? "已解锁，可以兑现"
      : `完成 ${target} 个完整训练日后兑现`;
  el("claimRewardButton").classList.toggle("hidden", !targetMet || rewardClaimed);
}

function renderMap() {
  const region = currentMapRegion();
  const currentIndex = MAP_REGIONS.indexOf(region);
  document.querySelectorAll(".map-region").forEach((node, index) => {
    node.classList.toggle("active", index <= currentIndex);
  });
  el("mapTraveler").setAttribute("transform", `translate(${region.position[0]} ${region.position[1]})`);
  el("mapRegionName").textContent = `${region.name}已点亮`;

  const nextRegion = MAP_REGIONS[currentIndex + 1];
  el("mapNextText").textContent = nextRegion
    ? `再获得 ${nextRegion.threshold - state.points} 点，抵达${nextRegion.name}`
    : "六个区域已全部点亮";

  const next = nextTitle();
  el("titleProgressText").textContent = next ? `${state.points} / ${next.threshold}` : `${state.points} · 顶级`;
  el("titleRoad").innerHTML = TITLES.map((title) => {
    const unlocked = state.points >= title.threshold;
    return `<div class="title-step${unlocked ? " unlocked" : ""}">
      <span class="title-node">${unlocked ? "✓" : "·"}</span>
      <strong>${escapeHtml(title.name)}</strong>
      <small>${title.threshold} 点</small>
    </div>`;
  }).join("");

  const allLogs = state.logs;
  const achievements = [
    { icon: "✦", name: "初次启程", detail: "获得第一张真实行动卡", unlocked: state.cards.length >= 1 },
    { icon: "♢", name: "迎着心跳", detail: "焦虑达到 7 分仍完成行动", unlocked: actionLogs(allLogs).some((log) => Number(log.anxietyBefore) >= 7) },
    { icon: "◐", name: "三日远征", detail: "一周完成 3 个间隔训练日", unlocked: hasSpacedThreeDays() },
    { icon: "⌁", name: "边界守护者", detail: "累计 5 次礼貌退出或不打扰", unlocked: allLogs.filter((log) => log.kind === "graceful_exit" || log.kind === "unsuitable").length >= 5 },
    { icon: "¥", name: "第一枚勇气币", detail: "第一次把真实行动变成勇气预算", unlocked: courageFundTotal() > 0 },
    { icon: "十", name: "稳定出手", detail: "累计完成 10 次尊重边界的接近", unlocked: actionLogs(allLogs).length >= 10 },
    { icon: "▣", name: "证据收藏家", detail: "收藏 20 张勇气卡", unlocked: state.cards.length >= 20 }
  ];

  el("achievementCount").textContent = `${achievements.filter((item) => item.unlocked).length} / ${achievements.length}`;
  el("achievementGrid").innerHTML = achievements.map((item) => `
    <article class="achievement${item.unlocked ? " unlocked" : ""}">
      <i aria-hidden="true">${item.icon}</i>
      <strong>${item.name}</strong>
      <small>${item.detail}</small>
    </article>`).join("");
}

function cardSymbol(card) {
  return ["勇", "行", "真", "定", "进", "界", "光", "诚"][Number(card.pattern) % 8];
}

function renderCards() {
  el("cardCount").textContent = state.cards.length;
  if (!state.cards.length) {
    el("cardGrid").innerHTML = `<div class="starter-card"><div><i aria-hidden="true">✦</i><strong>第一张卡等待一次真实行动</strong><p>完成主动表达，或在对方没有兴趣时自然退出，都会生成一张只属于你的新证据。</p></div></div>`;
    return;
  }

  el("cardGrid").innerHTML = [...state.cards]
    .reverse()
    .map((card) => `
      <button class="courage-card" type="button" aria-label="翻开${escapeHtml(card.title)}" aria-pressed="false">
        <span class="card-inner">
          <span class="card-face card-back pattern-${Number(card.pattern) % 8}">
            <span class="card-rarity">${escapeHtml(card.rarity)} · 勇气卡</span>
            <span class="card-emblem">${cardSymbol(card)}</span>
            <span class="card-back-bottom"><span class="card-date">${escapeHtml(formatShortDate(card.createdAt))}</span><strong>${escapeHtml(card.quote)}</strong></span>
          </span>
          <span class="card-face card-front">
            <span>
              <span class="card-rarity">${escapeHtml(card.rarity)} · 新证据</span>
              <h3>${escapeHtml(card.title)}</h3>
              <blockquote>${escapeHtml(card.quote)}</blockquote>
            </span>
            <span class="card-meta">
              <span>${escapeHtml(card.context)} · 焦虑 ${card.anxietyBefore} → ${card.anxietyAfter}</span>
              <span>${escapeHtml(OUTCOME_LABELS[card.kind])} · +${card.points} 点${Number(card.fundAmount) > 0 ? ` · +${formatMoney(card.fundAmount)}` : ""}</span>
              <span class="card-evidence">${escapeHtml(card.evidence)}</span>
            </span>
          </span>
        </span>
      </button>`)
    .join("");

  document.querySelectorAll(".courage-card").forEach((card) => {
    card.addEventListener("click", () => {
      const flipped = card.classList.toggle("flipped");
      card.setAttribute("aria-pressed", String(flipped));
      if (flipped) vibrate(18);
    });
  });
}

function categorizeReason(text = "") {
  const normalized = text.toLowerCase().replaceAll(/\s+/g, "");
  let best = { key: "other", score: 0 };
  Object.entries(REASON_GROUPS).forEach(([key, group]) => {
    if (key === "other") return;
    const score = group.keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? 1 : 0), 0);
    if (score > best.score) best = { key, score };
  });
  return best.key;
}

function renderReview() {
  const logs = currentWeekLogs();
  const deferrals = currentWeekDeferrals();
  const actions = actionLogs(logs);
  const exits = logs.filter((log) => log.kind === "graceful_exit");
  const avoidances = logs.filter((log) => log.kind === "avoided");
  const days = fullTrainingDayKeys(logs);

  el("reviewDays").textContent = days.length;
  el("reviewActions").textContent = actions.length;
  el("reviewExits").textContent = exits.length;
  el("avoidanceCount").textContent = `${avoidances.length} 次回避`;
  el("deferralCount").textContent = `${deferrals.length} 次顺延`;

  const deferralCounts = deferrals.reduce((counts, item) => {
    counts[item.reason] = (counts[item.reason] || 0) + 1;
    return counts;
  }, {});
  const sortedDeferrals = Object.entries(deferralCounts).sort((a, b) => b[1] - a[1]);
  const maxDeferral = sortedDeferrals[0]?.[1] || 1;
  el("deferralReasonChart").innerHTML = sortedDeferrals.length
    ? sortedDeferrals.map(([key, count]) => `
        <div class="reason-row">
          <span>${escapeHtml(DEFERRAL_REASONS[key]?.label || DEFERRAL_REASONS.other.label)}</span>
          <span class="reason-bar"><i style="width:${(count / maxDeferral) * 100}%"></i></span>
          <strong>${count}</strong>
        </div>`).join("")
    : `<div class="empty-state">本周还没有顺延记录。下雨、临时有事或状态不佳时，可以如实调整一天。</div>`;
  el("deferralList").innerHTML = deferrals.length
    ? [...deferrals].reverse().map((item) => `
        <article class="deferral-item">
          <i aria-hidden="true">${DEFERRAL_REASONS[item.reason]?.icon || "＋"}</i>
          <div><strong>${escapeHtml(DEFERRAL_REASONS[item.reason]?.label || "其他原因")}</strong><small>${escapeHtml(item.detail || "顺延一天，不扣分")}</small></div>
          <span>${escapeHtml(formatShortDate(item.fromDate))} → ${escapeHtml(formatShortDate(item.toDate))}</span>
        </article>`).join("")
    : "";

  const reasonCounts = {};
  avoidances.forEach((log) => {
    const category = log.reasonCategory || categorizeReason(log.reasonText);
    reasonCounts[category] = (reasonCounts[category] || 0) + 1;
  });
  const sortedReasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);
  const maxReason = sortedReasons[0]?.[1] || 1;
  el("reasonChart").innerHTML = sortedReasons.length
    ? sortedReasons.map(([key, count]) => `
        <div class="reason-row">
          <span>${escapeHtml(REASON_GROUPS[key]?.label || REASON_GROUPS.other.label)}</span>
          <span class="reason-bar"><i style="width:${(count / maxReason) * 100}%"></i></span>
          <strong>${count}</strong>
        </div>`).join("")
    : `<div class="empty-state">本周还没有回避记录。这里不会惩罚你，只会帮助你识别反复出现的想法。</div>`;

  const topReasonKey = sortedReasons[0]?.[0];
  el("ifThenPlan").innerHTML = topReasonKey
    ? `<span>下次的“如果—那么”计划 · ${escapeHtml(REASON_GROUPS[topReasonKey].label)}</span><p>${escapeHtml(REASON_GROUPS[topReasonKey].plan)}</p>`
    : `<span>下次的“如果—那么”计划</span><p>记录一次回避后，这里会根据最常见阻碍生成行动计划。</p>`;

  const contextCounts = actions.reduce((counts, log) => {
    const context = log.context || "未记录";
    counts[context] = (counts[context] || 0) + 1;
    return counts;
  }, {});
  const sortedContexts = Object.entries(contextCounts).sort((a, b) => b[1] - a[1]);
  const maxContext = sortedContexts[0]?.[1] || 1;
  el("contextCount").textContent = `${actions.length} 次记录`;
  el("contextChart").innerHTML = sortedContexts.length
    ? sortedContexts.map(([context, count]) => `
        <div class="reason-row">
          <span>${escapeHtml(context)}</span>
          <span class="reason-bar"><i style="width:${(count / maxContext) * 100}%"></i></span>
          <strong>${count}</strong>
        </div>`).join("")
    : `<div class="empty-state">完成一次搭讪并保存场景后，这里会显示本周的场景分布。</div>`;

  const weekCards = currentWeekItems(state.cards);
  el("evidenceList").innerHTML = weekCards.length
    ? [...weekCards].reverse().slice(0, 6).map((card) => `
        <article class="evidence-item">
          <i aria-hidden="true">✦</i>
          <div><strong>${escapeHtml(card.evidence)}</strong><small>${escapeHtml(card.context)} · ${escapeHtml(card.rarity)}勇气卡</small></div>
          <span>${escapeHtml(formatShortDate(card.createdAt))}</span>
        </article>`).join("")
    : `<div class="empty-state">完成一次真实行动后，新证据会出现在这里。</div>`;

  renderExpenses();
  el("historyList").innerHTML = logs.length
    ? [...logs].reverse().map((log) => {
        const detail = log.kind === "avoided"
          ? `阻碍：${REASON_GROUPS[log.reasonCategory || categorizeReason(log.reasonText)]?.label || "其他阻碍"}${log.reasonText ? ` · ${escapeHtml(log.reasonText)}` : ""}`
          : log.note
            ? escapeHtml(log.note)
            : `焦虑 ${log.anxietyBefore ?? "—"} → ${log.anxietyAfter ?? "—"}`;
        const contextDetail = log.context && log.context !== "未记录" ? `${escapeHtml(log.context)} · ` : "";
        const fundDetail = Number(log.fundAmount) > 0 ? ` · 储备金 +${formatMoney(log.fundAmount)}` : "";
        return `<article class="history-item">
          <i aria-hidden="true">${log.kind === "avoided" ? "○" : log.kind === "unsuitable" ? "◇" : "✓"}</i>
          <div><strong>${escapeHtml(OUTCOME_LABELS[log.kind])}</strong><small>${contextDetail}${detail}${fundDetail}</small></div>
          <span>${escapeHtml(formatTime(log.createdAt))}</span>
        </article>`;
      }).join("")
    : `<div class="empty-state">本周还没有行动记录。工具只保存你的行为与经验，不记录她是谁。</div>`;
}

function renderExpenses() {
  const expenses = currentWeekItems(state.expenses);
  const weekFund = courageFundTotal(currentWeekLogs());
  const weekExpense = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const weekBalance = weekFund - weekExpense;
  const lifetimeFund = courageFundTotal();
  const lifetimeExpense = state.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const lifetimeBalance = lifetimeFund - lifetimeExpense;

  el("fundWeekEarned").textContent = formatMoney(weekFund);
  el("expenseTotal").textContent = formatMoney(weekExpense);
  el("fundWeekBalance").textContent = formatMoney(weekBalance, true);
  el("fundBalanceTotal").textContent = formatMoney(lifetimeBalance, true);
  el("fundWeekBalanceCard").classList.toggle("positive", weekBalance > 0);
  el("fundWeekBalanceCard").classList.toggle("negative", weekBalance < 0);
  el("fundBalanceTotal").classList.toggle("positive", lifetimeBalance > 0);
  el("fundBalanceTotal").classList.toggle("negative", lifetimeBalance < 0);
  el("fundLifetimeText").textContent = lifetimeBalance >= 0
    ? `累计行动积累 ${formatMoney(lifetimeFund)}，累计吃饭外开销 ${formatMoney(lifetimeExpense)}；目前还有 ${formatMoney(lifetimeBalance)} 勇气预算。`
    : `累计行动积累 ${formatMoney(lifetimeFund)}，累计吃饭外开销 ${formatMoney(lifetimeExpense)}；开销高出 ${formatMoney(Math.abs(lifetimeBalance))}，不记为欠债。`;
  el("expenseList").innerHTML = expenses.length
    ? [...expenses].reverse().map((item) => `
        <article class="expense-item">
          <div><strong>${escapeHtml(item.category)}</strong><small>${escapeHtml(item.note || "无备注")}</small></div>
          <span>¥${Number(item.amount).toFixed(2)} · ${escapeHtml(formatShortDate(item.createdAt))}</span>
        </article>`).join("")
    : `<div class="empty-state">尚未记录吃饭以外的开销。正结余只有在真正用于奖赏时才会成为现实激励。</div>`;
}

function renderAll() {
  renderToday();
  renderMap();
  renderCards();
  renderReview();
}

function contextOptions(selected = "商场") {
  return CONTEXTS.map((context) => `<option${context === selected ? " selected" : ""}>${escapeHtml(context)}</option>`).join("");
}

function openTrainingDialog() {
  const todayActions = actionLogs(state.logs.filter((log) => dateKey(new Date(log.createdAt)) === dateKey())).length;
  trainingFlow = {
    stage: "safety",
    outcome: null,
    anxietyBefore: 6,
    anxietyAfter: 4,
    context: "商场",
    note: "",
    fundLevel: "everyday",
    fundGroup: "solo",
    reasonCategory: "",
    reasonText: "",
    beyondLimit: todayActions >= Number(state.settings.dailyLimit)
  };
  renderTrainingDialog();
  el("trainingDialog").showModal();
}

function renderTrainingDialog() {
  const content = el("trainingDialogContent");
  if (!trainingFlow) return;

  if (trainingFlow.stage === "safety") {
    content.innerHTML = `
      <div class="dialog-step">
        <p class="eyebrow">10 秒环境检查</p>
        <h2>先确认这是一个合适机会</h2>
        <p class="dialog-lead">不是每个心动瞬间都必须行动。能识别边界，本身就是社交能力。</p>
        ${trainingFlow.beyondLimit ? `<div class="if-then-plan"><span>本日 ${state.settings.dailyLimit} 次实际接近已完成</span><p>你可以自愿记录额外行动，但今天不再增加勇气值，不必继续搜寻目标。</p></div>` : ""}
        <div class="check-list">
          <label class="check-row"><input type="checkbox" data-safety-check /><span>对方没有明显赶路、通话、戴耳机或处理工作。</span></label>
          <label class="check-row"><input type="checkbox" data-safety-check /><span>保持距离，对方慌乱拒绝后不过分纠缠</span></label>
          <label class="check-row"><input type="checkbox" data-safety-check /><span>女生神情抗拒地回避或拒绝时，微笑着说谢谢并且离场。</span></label>
        </div>
        <div class="button-stack">
          <button class="primary-action" id="safetyPassButton" type="button" disabled>环境合适，去完成最小动作</button>
          <button class="secondary-action" id="unsuitableButton" type="button">不适合打扰，记为判断正确</button>
        </div>
      </div>`;

    const checks = [...content.querySelectorAll("[data-safety-check]")];
    checks.forEach((checkbox) => checkbox.addEventListener("change", () => {
      el("safetyPassButton").disabled = !checks.every((item) => item.checked);
    }));
    el("safetyPassButton").addEventListener("click", () => {
      trainingFlow.stage = "action";
      renderTrainingDialog();
    });
    el("unsuitableButton").addEventListener("click", () => saveSimpleLog("unsuitable"));
    return;
  }

  if (trainingFlow.stage === "action") {
    const ladder = LADDER_LEVELS[Number(state.settings.ladderLevel)] || LADDER_LEVELS[3];
    const fundAmount = trainingFlow.beyondLimit ? 0 : courageFundAmount(trainingFlow.fundLevel, trainingFlow.fundGroup);
    content.innerHTML = `
      <div class="dialog-step">
        <p class="eyebrow">${escapeHtml(ladder.name)}</p>
        <h2>焦虑可以在场，你仍然能选择</h2>
        <div class="minimum-action"><span>今天的最小动作</span><strong>${escapeHtml(ladder.action)}</strong></div>
        <div class="fund-config">
          <div class="fund-config-heading">
            <span>给这次勇气定一个即时奖赏</span>
            <strong id="fundPreview" aria-live="polite">${trainingFlow.beyondLimit ? "今日已满，不再累计" : `+${formatMoney(fundAmount)}`}</strong>
          </div>
          <div class="fund-config-grid">
            <label>
              <span>主观心动程度</span>
              <select id="fundLevelSelect">
                <option value="everyday"${trainingFlow.fundLevel === "everyday" ? " selected" : ""}>一般心动</option>
                <option value="strong"${trainingFlow.fundLevel === "strong" ? " selected" : ""}>特别心动</option>
              </select>
            </label>
            <label>
              <span>对方当时</span>
              <select id="fundGroupSelect">
                <option value="solo"${trainingFlow.fundGroup === "solo" ? " selected" : ""}>独自一人</option>
                <option value="companion"${trainingFlow.fundGroup === "companion" ? " selected" : ""}>与 1 人同行</option>
                <option value="group"${trainingFlow.fundGroup === "group" ? " selected" : ""}>与 2 人及以上同行</option>
              </select>
            </label>
          </div>
          <p>只记录你的主观挑战感和同行人数，不记录她的外貌细节；回应如何都不改变金额。</p>
        </div>
        <div class="launch-plan"><span>如果环境合适，而且我开始反复预测拒绝</span><strong>那么我先迈出一步，再允许焦虑跟上来。</strong></div>
        <p class="dialog-lead">不用寻找完美开场。说话真实、保持距离、给对方轻松退出的空间。</p>
        <button class="primary-action" id="returnedButton" type="button">行动完成了，回来记录</button>
        <button class="text-button" id="backToSafetyButton" type="button">返回环境检查</button>
      </div>`;
    el("fundLevelSelect").addEventListener("change", updateFundPreview);
    el("fundGroupSelect").addEventListener("change", updateFundPreview);
    el("returnedButton").addEventListener("click", () => {
      trainingFlow.stage = "outcome";
      renderTrainingDialog();
    });
    el("backToSafetyButton").addEventListener("click", () => {
      trainingFlow.stage = "safety";
      renderTrainingDialog();
    });
    return;
  }

  if (trainingFlow.stage === "outcome") {
    content.innerHTML = `
      <div class="dialog-step">
        <p class="eyebrow">不评判结果</p>
        <h2>刚才发生了什么？</h2>
        <div class="outcome-grid">
          <button class="outcome-button" type="button" data-outcome="completed"><strong>完成了主动交流</strong><span>不记录是否拿到联系方式</span></button>
          <button class="outcome-button" type="button" data-outcome="graceful_exit"><strong>对方没兴趣，我自然退出</strong><span>这是一次完整而有边界的训练</span></button>
          <button class="outcome-button" type="button" data-outcome="unsuitable"><strong>靠近后发现不合适</strong><span>我没有勉强打扰</span></button>
          <button class="outcome-button" type="button" data-outcome="avoided"><strong>我回避了</strong><span>不扣分，只识别阻碍</span></button>
        </div>
      </div>`;
    content.querySelectorAll("[data-outcome]").forEach((button) => {
      button.addEventListener("click", () => {
        const outcome = button.dataset.outcome;
        if (outcome === "unsuitable") {
          saveSimpleLog("unsuitable");
          return;
        }
        trainingFlow.outcome = outcome;
        trainingFlow.stage = outcome === "avoided" ? "avoidance-detail" : "action-detail";
        renderTrainingDialog();
      });
    });
    return;
  }

  if (trainingFlow.stage === "action-detail") {
    const fundAmount = trainingFlow.beyondLimit ? 0 : courageFundAmount(trainingFlow.fundLevel, trainingFlow.fundGroup);
    content.innerHTML = `
      <form class="dialog-step" id="actionDetailForm">
        <p class="eyebrow">生成一张新勇气卡</p>
        <h2>${escapeHtml(OUTCOME_LABELS[trainingFlow.outcome])}</h2>
        <div class="fund-confirmation">
          <span>本次勇气储备金</span>
          <strong>${fundAmount ? `+${formatMoney(fundAmount)}` : "今日已满 · 不再累计"}</strong>
          <small>${escapeHtml(COURAGE_FUND_LEVELS[trainingFlow.fundLevel])} · ${escapeHtml(COURAGE_FUND_GROUPS[trainingFlow.fundGroup])} · 回应不影响入账</small>
        </div>
        <label><span>本次搭讪场景（写入勇气卡和周复盘）</span><select id="trainingContext">${contextOptions(trainingFlow.context)}</select></label>
        <div class="slider-row">
          <div class="slider-label"><span>行动前预计焦虑</span><strong id="beforeValue">${trainingFlow.anxietyBefore} / 10</strong></div>
          <input id="beforeRange" type="range" min="0" max="10" value="${trainingFlow.anxietyBefore}" />
        </div>
        <div class="slider-row">
          <div class="slider-label"><span>行动后现在的焦虑</span><strong id="afterValue">${trainingFlow.anxietyAfter} / 10</strong></div>
          <input id="afterRange" type="range" min="0" max="10" value="${trainingFlow.anxietyAfter}" />
        </div>
        <label><span>一句经验（可选）</span><textarea id="trainingNote" maxlength="100" placeholder="只写自己的经验，不写她的照片或可识别特征。"></textarea></label>
        <button class="primary-action" type="submit">收下这张勇气卡</button>
      </form>`;
    bindRange("beforeRange", "beforeValue");
    bindRange("afterRange", "afterValue");
    el("actionDetailForm").addEventListener("submit", saveActionLog);
    return;
  }

  if (trainingFlow.stage === "avoidance-detail") {
    content.innerHTML = `
      <form class="dialog-step" id="avoidanceForm">
        <p class="eyebrow">不扣分 · 找到模式</p>
        <h2>当时阻止我的最强想法是什么？</h2>
        <div class="reason-chips">
          ${Object.entries(REASON_GROUPS).filter(([key]) => key !== "other").map(([key, group]) => `<button class="reason-chip" type="button" data-reason="${key}">${escapeHtml(group.label)}</button>`).join("")}
        </div>
        <label><span>原话记录（推荐）</span><textarea id="reasonText" maxlength="120" required placeholder="例如：她肯定会拒绝我，旁边的人会觉得很尴尬。"></textarea></label>
        <label><span>场景类别</span><select id="avoidanceContext">${contextOptions(trainingFlow.context)}</select></label>
        <button class="primary-action" type="submit">保存洞察，不惩罚自己</button>
      </form>`;
    content.querySelectorAll("[data-reason]").forEach((button) => {
      button.addEventListener("click", () => {
        content.querySelectorAll("[data-reason]").forEach((item) => item.classList.remove("selected"));
        button.classList.add("selected");
        trainingFlow.reasonCategory = button.dataset.reason;
      });
    });
    el("avoidanceForm").addEventListener("submit", saveAvoidanceLog);
    return;
  }

  if (trainingFlow.stage === "reward") {
    const card = trainingFlow.savedCard;
    const todayActions = actionLogs(state.logs.filter((log) => dateKey(new Date(log.createdAt)) === dateKey())).length;
    const dailyLimit = Number(state.settings.dailyLimit);
    content.innerHTML = `
      <div class="dialog-step">
        <p class="eyebrow">${trainingFlow.beyondLimit ? "额外记录 · 不再累计" : `+${card.points} 勇气值 · +${formatMoney(card.fundAmount)} 储备金`}</p>
        <h2>${trainingFlow.beyondLimit ? "今天已经足够，不必继续搜寻" : "行动完成，奖励现在就到账"}</h2>
        <div class="fund-reward${card.fundAmount ? "" : " capped"}">
          <span aria-hidden="true">✦</span>
          <div><small>勇气储备金</small><strong>${card.fundAmount ? `+${formatMoney(card.fundAmount)}` : "今日已满"}</strong><p>${card.fundAmount ? "无论对方如何回应，这次尊重边界的接近都已入账。" : "超过每日目标的行动可以记录，但不会驱动继续搜寻。"}</p></div>
        </div>
        <div class="reward-reveal">
          <span class="big-symbol" aria-hidden="true">${cardSymbol(card)}</span>
          <strong>${escapeHtml(card.quote)}</strong>
          <p>${escapeHtml(card.evidence)}</p>
        </div>
        <p class="reward-progress-copy">今日 ${Math.min(todayActions, dailyLimit)} / ${dailyLimit} 次${todayActions >= dailyLimit ? " · 已经完成，可以停止" : " · 每一次都在削弱回避的自动反应"}</p>
        <button class="primary-action" id="viewCardButton" type="button">去卡册翻开它</button>
        <button class="text-button" id="finishTrainingButton" type="button">完成本次记录</button>
      </div>`;
    el("viewCardButton").addEventListener("click", () => {
      closeDialog(el("trainingDialog"));
      switchView("cardsView", "勇气卡册");
    });
    el("finishTrainingButton").addEventListener("click", () => closeDialog(el("trainingDialog")));
  }
}

function bindRange(rangeId, valueId) {
  el(rangeId).addEventListener("input", (event) => {
    el(valueId).textContent = `${event.target.value} / 10`;
  });
}

function updateFundPreview() {
  trainingFlow.fundLevel = el("fundLevelSelect").value;
  trainingFlow.fundGroup = el("fundGroupSelect").value;
  const amount = trainingFlow.beyondLimit ? 0 : courageFundAmount(trainingFlow.fundLevel, trainingFlow.fundGroup);
  el("fundPreview").textContent = trainingFlow.beyondLimit ? "今日已满，不再累计" : `+${formatMoney(amount)}`;
}

function saveSimpleLog(kind) {
  const todayLogs = state.logs.filter((log) => dateKey(new Date(log.createdAt)) === dateKey());
  const alreadyRewardedJudgment = todayLogs.some((log) => log.kind === "unsuitable" && Number(log.points) > 0);
  const points = kind === "unsuitable" && !alreadyRewardedJudgment ? 1 : 0;
  state.logs.push({
    id: uid("log"),
    createdAt: new Date().toISOString(),
    kind,
    context: "未记录",
    points
  });
  state.points += points;
  saveState();
  renderAll();
  closeDialog(el("trainingDialog"));
  vibrate(25);
  showToast(points ? "判断正确 · +1 勇气值" : "已记录：不勉强打扰也是能力");
}

function cardRarity(anxietyBefore) {
  if (anxietyBefore >= 9) return "曜金";
  if (anxietyBefore >= 7) return "星芒";
  if (anxietyBefore >= 5) return "晨雾";
  return "微光";
}

function cardQuote(kind, index) {
  const common = [
    "我练习的是选择，不是胜负。",
    "勇气不是不紧张，是仍然向前一步。",
    "一次真实行动，胜过十次脑内推演。",
    "结果属于双方，行动属于我。",
    "我可以真诚靠近，也可以从容离开。",
    "拒绝不是审判，只是两个人此刻不匹配。"
  ];
  const exits = [
    "我尊重她的答案，也守住自己的完整。",
    "自然离开不是失败，是边界感。",
    "这次没有继续，但我没有被恐惧替我选择。"
  ];
  const pool = kind === "graceful_exit" ? [...exits, ...common] : common;
  return pool[index % pool.length];
}

function generateEvidence(kind, before, after) {
  if (kind === "graceful_exit") {
    if (after < before) return `我承受了没有得到期待回应的时刻，并自然离开；焦虑从 ${before} 降到 ${after}。`;
    return "即使没有得到期待的回应，我也保持边界并完成离开；难受和行动可以同时存在。";
  }
  if (after < before) return `行动后焦虑从 ${before} 降到 ${after}；开始往往比脑内预测更可控。`;
  if (after === before) return `焦虑仍是 ${after}，但我没有等待它消失才行动。`;
  return `焦虑短暂升到 ${after}，但我仍完成了自己的选择；情绪不是命令。`;
}

function saveActionLog(event) {
  event.preventDefault();
  const before = Number(el("beforeRange").value);
  const after = Number(el("afterRange").value);
  const context = el("trainingContext").value;
  const note = el("trainingNote").value.trim();
  const basePoints = trainingFlow.beyondLimit ? 0 : 3;
  const points = basePoints + (!trainingFlow.beyondLimit && before >= 6 ? 1 : 0);
  const fundAmount = trainingFlow.beyondLimit ? 0 : courageFundAmount(trainingFlow.fundLevel, trainingFlow.fundGroup);
  const now = new Date().toISOString();
  const cardIndex = state.cards.length;
  const evidence = generateEvidence(trainingFlow.outcome, before, after);
  const card = {
    id: uid("card"),
    createdAt: now,
    kind: trainingFlow.outcome,
    title: `第 ${cardIndex + 1} 次向前`,
    context,
    anxietyBefore: before,
    anxietyAfter: after,
    note,
    evidence,
    quote: cardQuote(trainingFlow.outcome, cardIndex + before),
    rarity: cardRarity(before),
    pattern: (cardIndex * 3 + before + new Date().getDate()) % 8,
    points,
    fundAmount,
    fundLevel: trainingFlow.fundLevel,
    fundGroup: trainingFlow.fundGroup
  };
  const log = {
    id: uid("log"),
    createdAt: now,
    kind: trainingFlow.outcome,
    context,
    anxietyBefore: before,
    anxietyAfter: after,
    note,
    points,
    fundAmount,
    fundLevel: trainingFlow.fundLevel,
    fundGroup: trainingFlow.fundGroup,
    cardId: card.id
  };
  state.cards.push(card);
  state.logs.push(log);
  state.points += points;
  saveState();
  trainingFlow.savedCard = card;
  trainingFlow.stage = "reward";
  renderAll();
  renderTrainingDialog();
  vibrate([30, 45, 55]);
}

function saveAvoidanceLog(event) {
  event.preventDefault();
  const reasonText = el("reasonText").value.trim();
  const reasonCategory = trainingFlow.reasonCategory || categorizeReason(reasonText);
  state.logs.push({
    id: uid("log"),
    createdAt: new Date().toISOString(),
    kind: "avoided",
    context: el("avoidanceContext").value,
    reasonText,
    reasonCategory,
    points: 0
  });
  saveState();
  renderAll();
  closeDialog(el("trainingDialog"));
  showToast(`已归入“${REASON_GROUPS[reasonCategory].label}” · 不扣分`);
}

function switchView(viewId, title) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
  el("pageTitle").textContent = title || document.querySelector(`[data-view="${viewId}"]`)?.dataset.label || "向前一步";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeDialog(dialog) {
  if (dialog.open) dialog.close();
}

function openDeferralDialog() {
  selectedDeferralReason = "";
  document.querySelectorAll("[data-deferral-reason]").forEach((button) => button.classList.remove("selected"));
  el("deferralOtherLabel").classList.add("hidden");
  el("deferralOther").value = "";
  el("saveDeferralButton").disabled = true;
  el("deferralDialog").showModal();
}

function saveDeferral(event) {
  event.preventDefault();
  if (!selectedDeferralReason) return;
  if (state.deferrals.some((item) => item.fromDate === dateKey())) {
    closeDialog(el("deferralDialog"));
    showToast("今晚已经记录过顺延");
    return;
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayActions = actionLogs(state.logs.filter((log) => dateKey(new Date(log.createdAt)) === dateKey())).length;
  state.deferrals.push({
    id: uid("deferral"),
    createdAt: new Date().toISOString(),
    fromDate: dateKey(),
    toDate: dateKey(tomorrow),
    reason: selectedDeferralReason,
    detail: el("deferralOther").value.trim(),
    completedBeforeDeferral: todayActions
  });
  saveState();
  renderAll();
  closeDialog(el("deferralDialog"));
  vibrate(25);
  showToast(`${DEFERRAL_REASONS[selectedDeferralReason].label} · 已顺延到明天，不扣分`);
}

function openSettings() {
  el("weeklyTargetInput").value = state.settings.weeklyTarget;
  el("dailyLimitInput").value = state.settings.dailyLimit;
  el("ladderLevelInput").value = state.settings.ladderLevel;
  el("rewardLabelInput").value = state.settings.rewardLabel;
  el("rewardAmountInput").value = state.settings.rewardAmount;
  el("settingsDialog").showModal();
}

function initSettings() {
  el("ladderLevelInput").innerHTML = LADDER_LEVELS.map((level, index) => `<option value="${index}">${escapeHtml(level.name)}</option>`).join("");
  el("settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.settings.weeklyTarget = Number(el("weeklyTargetInput").value);
    state.settings.dailyLimit = Number(el("dailyLimitInput").value);
    state.settings.ladderLevel = Number(el("ladderLevelInput").value);
    state.settings.rewardLabel = el("rewardLabelInput").value.trim() || defaultState.settings.rewardLabel;
    state.settings.rewardAmount = Math.max(0, Number(el("rewardAmountInput").value) || 0);
    saveState();
    renderAll();
    closeDialog(el("settingsDialog"));
    showToast("训练规则已保存");
  });
}

function claimReward() {
  if (isRewardClaimed()) return;
  const now = new Date().toISOString();
  state.rewardClaims.push({
    id: uid("reward"),
    week: weekKey(),
    label: state.settings.rewardLabel,
    amount: Number(state.settings.rewardAmount),
    createdAt: now
  });
  if (Number(state.settings.rewardAmount) > 0) {
    state.expenses.push({
      id: uid("expense"),
      createdAt: now,
      amount: Number(state.settings.rewardAmount),
      category: "奖赏兑现",
      note: state.settings.rewardLabel
    });
  }
  saveState();
  renderAll();
  vibrate([25, 30, 45]);
  showToast("已兑现真实奖赏 · 不是虚构省钱");
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `向前一步-${dateKey()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast("本地数据已导出");
}

async function installApp() {
  if (installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    el("installButton").classList.add("hidden");
    return;
  }
  el("installDialog").showModal();
}

function initEvents() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => switchView(item.dataset.view, item.dataset.label));
  });
  el("startButton").addEventListener("click", openTrainingDialog);
  el("deferButton").addEventListener("click", openDeferralDialog);
  el("settingsButton").addEventListener("click", openSettings);
  el("editRewardButton").addEventListener("click", openSettings);
  el("closeTrainingButton").addEventListener("click", () => closeDialog(el("trainingDialog")));
  el("closeSettingsButton").addEventListener("click", () => closeDialog(el("settingsDialog")));
  el("closeDeferralButton").addEventListener("click", () => closeDialog(el("deferralDialog")));
  el("closeInstallButton").addEventListener("click", () => closeDialog(el("installDialog")));
  el("installButton").addEventListener("click", installApp);
  el("claimRewardButton").addEventListener("click", claimReward);
  document.querySelectorAll("[data-deferral-reason]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDeferralReason = button.dataset.deferralReason;
      document.querySelectorAll("[data-deferral-reason]").forEach((item) => item.classList.toggle("selected", item === button));
      el("deferralOtherLabel").classList.toggle("hidden", selectedDeferralReason !== "other");
      el("saveDeferralButton").disabled = false;
    });
  });
  el("deferralForm").addEventListener("submit", saveDeferral);
  el("exportButton").addEventListener("click", exportData);
  el("resetButton").addEventListener("click", () => {
    const confirmed = window.confirm("确定清空所有训练、卡片和账本数据吗？此操作无法撤销。建议先导出数据。");
    if (!confirmed) return;
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  });
  el("expenseForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(el("expenseAmount").value);
    if (!Number.isFinite(amount) || amount <= 0) return;
    state.expenses.push({
      id: uid("expense"),
      createdAt: new Date().toISOString(),
      amount,
      category: el("expenseCategory").value,
      note: el("expenseNote").value.trim()
    });
    saveState();
    event.currentTarget.reset();
    renderExpenses();
    showToast("真实开销已记录");
  });

  [el("trainingDialog"), el("settingsDialog"), el("deferralDialog"), el("installDialog")].forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      const box = dialog.getBoundingClientRect();
      const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
      if (outside) closeDialog(dialog);
    });
  });
}

function initInstall() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (!standalone) el("installButton").classList.remove("hidden");
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    el("installButton").classList.remove("hidden");
  });
  window.addEventListener("appinstalled", () => {
    el("installButton").classList.add("hidden");
    showToast("已安装到桌面");
  });
}

function initServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("离线缓存注册失败", error)));
  }
}

initSettings();
initEvents();
initInstall();
initServiceWorker();
renderAll();
