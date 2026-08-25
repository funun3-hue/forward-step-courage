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
  { name: "搭讪小白", threshold: 0, actions: 0 },
  { name: "初见勇气", threshold: 20, actions: 5 },
  { name: "学有所成", threshold: 80, actions: 20 },
  { name: "搭讪入门", threshold: 200, actions: 50 },
  { name: "搭讪筑基", threshold: 500, actions: 125 },
  { name: "从容行者", threshold: 1000, actions: 250 },
  { name: "搭讪大师", threshold: 2000, actions: 500 },
  { name: "真诚自如", threshold: 4000, actions: 1000 }
];

const MAP_REGIONS = [
  { name: "起步港", threshold: 0, position: [61, 351] },
  { name: "回声林", threshold: 20, position: [123, 278] },
  { name: "边界丘", threshold: 80, position: [190, 213] },
  { name: "星光原", threshold: 200, position: [251, 147] },
  { name: "从容城", threshold: 500, position: [315, 79] },
  { name: "自在峰", threshold: 1000, position: [339, 28] }
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
  completed: "对方愿意继续交流",
  graceful_exit: "被拒绝了，我自然离开",
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

const GROUP_COMPOSITIONS = {
  unspecified: "未记录同行构成",
  women_only: "同行者均为女性",
  includes_man: "同行者中有男性"
};

const BOUNDARY_CHECKS = [
  "对方没有明显赶路、通话、戴耳机或处理工作。",
  "保持距离，对方慌乱拒绝后不过分纠缠。",
  "女生神情抗拒地回避或拒绝时，微笑着说谢谢并且离场。"
];

const CONTEXTS = [
  "商场",
  "街道",
  "咖啡店",
  "书店",
  "校园",
  "活动现场",
  "交通场所",
  "地铁",
  "小区",
  "美术馆",
  "博物馆",
  "公园/绿道",
  "展览/市集",
  "夜市/步行街",
  "其他"
];
const WEEKDAY_NAMES = ["一", "二", "三", "四", "五", "六", "日"];
const DAILY_ACTION_GOAL = 1;
const COMPLETE_ACTION_GOAL = 5;
const WEEKLY_ACTION_DAYS = 7;

const defaultState = {
  version: 7,
  points: 0,
  settings: {
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
let selectedWeekKey = weekKey();

const el = (id) => document.getElementById(id);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") return structuredClone(defaultState);
    const savedVersion = Number(saved.version || 1);
    const normalizeContext = (context) => {
      if (context === "小区公共区域") return "小区";
      if (savedVersion < 6 && context === "其他") return "地铁";
      return context;
    };
    const migrated = {
      ...structuredClone(defaultState),
      ...saved,
      settings: { ...defaultState.settings, ...(saved.settings || {}) },
      logs: Array.isArray(saved.logs) ? saved.logs.map((log) => ({ ...log, context: normalizeContext(log.context) })) : [],
      cards: Array.isArray(saved.cards) ? saved.cards.map((card, index) => {
        const migratedCard = { ...card, context: normalizeContext(card.context) };
        if (savedVersion < 7) {
          migratedCard.quote = cardQuote(migratedCard.kind, index + Number(migratedCard.anxietyBefore || 0));
          migratedCard.evidence = generateEvidence(migratedCard.kind, Number(migratedCard.anxietyBefore || 0), Number(migratedCard.anxietyAfter || 0));
        }
        return migratedCard;
      }) : [],
      expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
      deferrals: Array.isArray(saved.deferrals) ? saved.deferrals : [],
      rewardClaims: Array.isArray(saved.rewardClaims) ? saved.rewardClaims : []
    };
    migrated.version = 7;
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

function dateFromKey(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function weekItems(items, start, field = "createdAt") {
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return items.filter((item) => {
    const date = new Date(item[field]);
    return date >= start && date < end;
  });
}

function currentWeekItems(items, field = "createdAt") {
  const start = weekStart();
  return weekItems(items, start, field);
}

function currentWeekLogs() {
  return currentWeekItems(state.logs);
}

function actionLogs(logs = state.logs) {
  return logs.filter((log) => log.kind === "completed" || log.kind === "graceful_exit");
}

function rejectionLogs(logs = state.logs) {
  return logs.filter((log) => log.kind === "graceful_exit");
}

function courageFundAmount(level = "everyday", group = "solo") {
  return Number(COURAGE_FUND_RATES[level]?.[group] || 0);
}

function availableCourageFundAmount(level = "everyday", group = "solo") {
  const today = dateKey();
  const todayActions = actionLogs().filter((log) => dateKey(new Date(log.createdAt)) === today).length;
  return todayActions >= COMPLETE_ACTION_GOAL ? 0 : courageFundAmount(level, group);
}

function courageFundTotal(logs = state.logs) {
  return actionLogs(logs).reduce((sum, log) => sum + Number(log.fundAmount || 0), 0);
}

function formatMoney(value, signed = false) {
  const amount = Number(value || 0);
  if (!signed || amount === 0) return `¥${amount.toFixed(2)}`;
  return `${amount > 0 ? "+" : "-"}¥${Math.abs(amount).toFixed(2)}`;
}

function rejectionCountsByDay(logs = currentWeekLogs()) {
  return rejectionLogs(logs).reduce((counts, log) => {
    const key = dateKey(new Date(log.createdAt));
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function rejectionDayKeys(logs = currentWeekLogs()) {
  return Object.entries(rejectionCountsByDay(logs))
    .filter(([, count]) => count > 0)
    .map(([key]) => key);
}

function actionCountsByDay(logs = currentWeekLogs()) {
  return actionLogs(logs).reduce((counts, log) => {
    const key = dateKey(new Date(log.createdAt));
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function actionDayKeys(logs = currentWeekLogs()) {
  return Object.entries(actionCountsByDay(logs))
    .filter(([, count]) => count >= DAILY_ACTION_GOAL)
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

function formatLaunchLatency(value) {
  if (value === null || value === undefined || value === "") return "未记录";
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "未记录";
  return `${(milliseconds / 1000).toFixed(1)} 秒`;
}

function currentTitle(points = state.points, actions = actionLogs().length) {
  return [...TITLES].reverse().find((title) => points >= title.threshold && actions >= title.actions) || TITLES[0];
}

function nextTitle(points = state.points, actions = actionLogs().length) {
  const current = currentTitle(points, actions);
  return TITLES[TITLES.indexOf(current) + 1] || null;
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

function getWeekDays(start = weekStart()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function weekRangeLabel(key) {
  const start = dateFromKey(key);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const weeksAgo = Math.round((weekStart().getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  if (weeksAgo === 0) return "本周";
  if (weeksAgo === 1) return "上周";
  if (weeksAgo === 2) return "上上周";
  const range = `${start.getMonth() + 1}/${start.getDate()}–${end.getMonth() + 1}/${end.getDate()}`;
  return range;
}

function availableWeekKeys() {
  const keys = new Set([weekKey(), selectedWeekKey]);
  actionLogs().forEach((log) => {
    const date = new Date(log.createdAt);
    if (!Number.isNaN(date.getTime())) keys.add(weekKey(date));
  });
  return [...keys].sort((a, b) => b.localeCompare(a));
}

function isRewardClaimed() {
  return state.rewardClaims.some((claim) => claim.week === weekKey());
}

function renderToday() {
  const weekLogs = currentWeekLogs();
  const actionDays = actionDayKeys(weekLogs);
  const selectedWeekStart = weekStart(dateFromKey(selectedWeekKey));
  const selectedWeekLogs = weekItems(state.logs, selectedWeekStart);
  const selectedActionDays = actionDayKeys(selectedWeekLogs);
  const actionCounts = actionCountsByDay(selectedWeekLogs);
  const rejectionCounts = rejectionCountsByDay(selectedWeekLogs);
  const todayLogs = state.logs.filter((log) => dateKey(new Date(log.createdAt)) === dateKey());
  const todayActions = actionLogs(todayLogs).length;
  const todayRejections = rejectionLogs(todayLogs).length;
  const targetMet = actionDays.length >= WEEKLY_ACTION_DAYS;
  const weekActions = actionLogs(weekLogs);
  const weekFund = courageFundTotal(weekLogs);
  const weekExpense = currentWeekItems(state.expenses).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const weekBalance = weekFund - weekExpense;

  el("levelName").textContent = currentTitle().name;
  el("totalPoints").textContent = state.points;
  el("heroFundTotal").textContent = formatMoney(courageFundTotal());
  el("homeWeekActions").textContent = weekActions.length;
  el("homeWeekFund").textContent = formatMoney(weekFund);
  el("homeWeekBalance").textContent = formatMoney(weekBalance, true);
  el("homeWeekBalance").classList.toggle("negative", weekBalance < 0);
  el("trainingStatus").textContent = todayActions >= COMPLETE_ACTION_GOAL
    ? "今日 5 次出手 · 蓝色进阶已点亮"
    : todayActions >= DAILY_ACTION_GOAL
      ? `今日已出手${todayRejections ? ` · 收到 ${todayRejections} 次拒绝` : ""}`
      : `本周 ${actionDays.length} / ${WEEKLY_ACTION_DAYS} 个出手日`;
  el("weekProgressText").textContent = `${selectedActionDays.length} / ${WEEKLY_ACTION_DAYS} 天有真实出手`;
  el("weekSelector").innerHTML = availableWeekKeys()
    .map((key) => `<option value="${key}"${key === selectedWeekKey ? " selected" : ""}>${weekRangeLabel(key)}</option>`)
    .join("");
  el("startButton").innerHTML = todayActions >= DAILY_ACTION_GOAL
    ? "<span aria-hidden=\"true\">＋</span> 今日已出手 · 仍可自然行动"
    : "<span aria-hidden=\"true\">➜</span> 注意到一个合适机会";

  el("weekStrip").innerHTML = getWeekDays(selectedWeekStart)
    .map((date, index) => {
      const key = dateKey(date);
      const count = actionCounts[key] || 0;
      const rejectionCount = rejectionCounts[key] || 0;
      const status = count >= COMPLETE_ACTION_GOAL ? "complete" : count >= DAILY_ACTION_GOAL ? "progress" : "neutral";
      const rejectionClass = rejectionCount >= 6 ? " rejection-hot" : rejectionCount >= 5 ? " rejection-gold" : rejectionCount ? " has-rejection" : "";
      const heatLevel = Math.min(10, rejectionCount);
      const heatColors = ["", "", "", "", "", "", "#ffc178", "#ffa662", "#ff8a50", "#ff7345", "#ff5e3b"];
      const rejectionStyle = rejectionCount >= 6 ? ` style="--rejection-border:${heatColors[heatLevel]}"` : "";
      const today = selectedWeekKey === weekKey() && key === dateKey();
      const mark = status === "complete" ? `${count}✓` : status === "progress" ? `${count}/5` : date.getDate();
      const actionLabel = status === "complete" ? `完成${count}次出手` : status === "progress" ? `已出手${count}次` : "尚未出手";
      const rejectionLabel = rejectionCount >= 6
        ? `，其中收到${rejectionCount}次拒绝，金边正逐渐转为炽热金红色`
        : rejectionCount >= 5
          ? `，其中收到${rejectionCount}次拒绝，闪亮金边已点亮`
        : rejectionCount
          ? `，其中收到${rejectionCount}次拒绝`
          : "";
      return `<div class="day-dot ${status}${rejectionClass}${today ? " today" : ""}"${rejectionStyle} aria-label="周${WEEKDAY_NAMES[index]}：${actionLabel}${rejectionLabel}">
        <span>周${WEEKDAY_NAMES[index]}</span>
        <i>${mark}</i>
      </div>`;
    })
    .join("");

  const rewardClaimed = isRewardClaimed();
  el("rewardLabel").textContent = state.settings.rewardLabel;
  el("rewardValue").textContent = "";
  el("rewardValue").classList.add("hidden");
  el("rewardProgress").style.width = `${Math.min(100, (actionDays.length / WEEKLY_ACTION_DAYS) * 100)}%`;
  el("rewardState").textContent = rewardClaimed
    ? "本周已经兑现"
    : targetMet
      ? "已解锁，可以兑现"
      : "本周每天都出手一次";
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
  const actionCount = actionLogs().length;
  el("titleProgressText").textContent = next
    ? `${Math.min(state.points, next.threshold)}/${next.threshold} 点 · ${Math.min(actionCount, next.actions)}/${next.actions} 次`
    : `${state.points} 点 · ${actionCount} 次 · 顶级`;
  el("titleRoad").innerHTML = TITLES.map((title) => {
    const unlocked = state.points >= title.threshold && actionCount >= title.actions;
    return `<div class="title-step${unlocked ? " unlocked" : ""}">
      <span class="title-node">${unlocked ? "✓" : "·"}</span>
      <strong>${escapeHtml(title.name)}</strong>
      <small>${title.threshold} 点 · ${title.actions} 次</small>
    </div>`;
  }).join("");

  const allLogs = state.logs;
  const allActions = actionLogs(allLogs);
  const pairedActions = allActions.filter((log) => log.fundGroup === "companion");
  const groupActions = allActions.filter((log) => log.fundGroup === "group");
  const includesManActions = allActions.filter((log) => log.fundGroup !== "solo" && log.groupComposition === "includes_man");
  const boundaryCount = allLogs.filter((log) => log.kind === "graceful_exit" || log.kind === "unsuitable").length;
  const hasHighAnxietyAction = allActions.some((log) => Number(log.anxietyBefore) >= 7);
  const rejectionDayProgress = Math.min(rejectionDayKeys().length, 3);
  const achievements = [
    { icon: "✦", name: "初次启程", detail: "获得第一张真实行动卡", progress: state.cards.length, target: 1 },
    { icon: "♢", name: "迎着心跳", detail: "焦虑达到 7 分仍完成行动", progress: hasHighAnxietyAction ? 1 : 0, target: 1 },
    { icon: "◐", name: "三日破惧", detail: "一周有 3 天获得至少一次拒绝", progress: rejectionDayProgress, target: 3 },
    { icon: "⌁", name: "边界守护者", detail: "累计 5 次礼貌退出或不打扰", progress: boundaryCount, target: 5 },
    { icon: "¥", name: "第一枚勇气币", detail: "第一次把真实行动变成勇气预算", progress: courageFundTotal() > 0 ? 1 : 0, target: 1 },
    { icon: "十", name: "稳定出手", detail: "累计完成 10 次尊重边界的接近", progress: allActions.length, target: 10 },
    { icon: "▣", name: "证据收藏家", detail: "收藏 20 张勇气卡", progress: state.cards.length, target: 20 },
    { icon: "Ⅱ", name: "双人组·初次", detail: "第一次向有 1 位同行者的目标开口", progress: pairedActions.length, target: 1 },
    { icon: "Ⅱ", name: "双人组·三次", detail: "完成 3 次双人组主动交流", progress: pairedActions.length, target: 3 },
    { icon: "Ⅱ", name: "双人组·五次", detail: "完成 5 次双人组主动交流", progress: pairedActions.length, target: 5 },
    { icon: "♂", name: "男凝目光·初次", detail: "第一次向含男性同行者的组合开口", progress: includesManActions.length, target: 1 },
    { icon: "♂", name: "男凝目光·三次", detail: "完成 3 次含男性同行者的组合交流", progress: includesManActions.length, target: 3 },
    { icon: "Ⅲ", name: "三人组·初次", detail: "第一次向三人及以上组合开口", progress: groupActions.length, target: 1 },
    { icon: "Ⅲ", name: "三人组·三次", detail: "完成 3 次三人及以上组合交流", progress: groupActions.length, target: 3 },
    { icon: "Ⅲ", name: "三人组·十次", detail: "完成 10 次三人及以上组合交流", progress: groupActions.length, target: 10 }
  ];

  achievements.forEach((item) => {
    if (typeof item.unlocked !== "boolean") item.unlocked = item.progress >= item.target;
  });
  el("achievementCount").textContent = `${achievements.filter((item) => item.unlocked).length} / ${achievements.length}`;
  el("achievementGrid").innerHTML = achievements.map((item) => {
    const shownProgress = Math.min(item.progress, item.target);
    return `
    <article class="achievement${item.unlocked ? " unlocked" : ""}">
      <i aria-hidden="true">${item.icon}</i>
      <strong>${item.name}</strong>
      <small>${item.detail}</small>
      <span class="achievement-progress"><span><i style="width:${(shownProgress / item.target) * 100}%"></i></span><b>${shownProgress}/${item.target}</b></span>
    </article>`;
  }).join("");
}

function cardSymbol(card, visualIndex = Number(card.pattern) % 16) {
  return ["勇", "行", "真", "定", "进", "界", "光", "诚", "跃", "启", "稳", "敢", "澄", "燃", "拓", "昂"][visualIndex % 16];
}

function cardBackMessage(card, index) {
  const common = [
    "我主动创造了一次真实机会。",
    "我迎着紧张向前，并完成开口。",
    "今天的行动力又增长了一格。",
    "我把想法变成了真正的行动。",
    "我敢于开始，也越来越有底气。",
    "我正在练成随时向前一步的能力。",
    "这次出手，让下一次更加自然。",
    "我的主动性正在一次次变强。",
    "我用行动打开了新的可能。",
    "今天的我，成功跨过了犹豫。",
    "我带着心跳向前，也带回了经验。",
    "每一次开口都在升级我的能力。",
    "我把机会握在了自己手里。",
    "我亲自选择行动，并完成行动。",
    "今天积累的是更强的行动惯性。",
    "一个真实动作正在扩大我的自由。",
    "我主动靠近，也始终尊重边界。",
    "我敢于被看见，也敢于表达自己。",
    "我的真诚和行动都已经发生。",
    "这一次练习，让我的能力更扎实。",
    "我让勇气变成了看得见的证据。",
    "我完成了出手，也赢过了回避。",
    "我把选择权牢牢留在自己手中。",
    "今天这一小步正在累积成实力。"
  ];
  const exits = [
    "拒绝出现，我依旧完成了主动行动。",
    "我接住一次拒绝，也增强一次底气。",
    "这次挑战变成了我的行动经验。",
    "我敢于尝试，所以今天已经赢过回避。",
    "我把拒绝变成经验，把行动变成实力。",
    "越过这一关，下一次我会更敢开口。"
  ];
  const groups = [
    "旁人在场，我依然主动完成了开口。",
    "更大的挑战，练出了更强的行动力。",
    "我穿过被注视的感觉，成功迈出一步。",
    "组合场景提升了这次行动的含金量。",
    "面对多人，我依旧把握住了机会。",
    "环境越复杂，我越能练出稳定和自然。"
  ];
  const pool = card.fundGroup === "companion" || card.fundGroup === "group"
    ? [...groups, ...common]
    : card.kind === "graceful_exit"
      ? [...exits, ...common]
      : common;
  return pool[Math.max(0, index) % pool.length];
}

function cardDayHeading(value, includeYear = false) {
  const date = new Date(value);
  return `${includeYear ? `${date.getFullYear()}年` : ""}${date.getMonth() + 1}月${date.getDate()}日`;
}

function courageCardMarkup(card) {
  const chronologicalIndex = Math.max(0, state.cards.findIndex((item) => item.id === card.id));
  const visualIndex = chronologicalIndex % 16;
  return `
    <button class="courage-card" type="button" aria-label="翻开${escapeHtml(card.title)}" aria-pressed="false">
      <span class="card-inner">
        <span class="card-face card-back pattern-${visualIndex}">
          <span class="card-rarity">${escapeHtml(card.rarity)} · 勇气卡</span>
          <span class="card-emblem">${cardSymbol(card, visualIndex)}</span>
          <span class="card-back-bottom"><span class="card-date">${escapeHtml(formatShortDate(card.createdAt))}</span><strong>${escapeHtml(cardBackMessage(card, chronologicalIndex))}</strong></span>
        </span>
        <span class="card-face card-front">
          <span>
            <span class="card-rarity">${escapeHtml(card.rarity)} · 新证据</span>
            <h3>${escapeHtml(card.title)}</h3>
            <blockquote>${escapeHtml(card.quote)}</blockquote>
          </span>
          <span class="card-meta">
            <span>${escapeHtml(card.context)} · ${escapeHtml(COURAGE_FUND_GROUPS[card.fundGroup] || "同行情况未记录")} · 焦虑 ${card.anxietyBefore} → ${card.anxietyAfter}</span>
            <span>${escapeHtml(card.kind === "graceful_exit" ? "接住拒绝 · 主动出手已完成" : OUTCOME_LABELS[card.kind])} · +${card.points} 点${Number(card.fundAmount) > 0 ? ` · +${formatMoney(card.fundAmount)}` : ""}</span>
            <span class="card-evidence">${escapeHtml(card.evidence)}</span>
          </span>
        </span>
      </span>
    </button>`;
}

function bindCardFlips(container) {
  container.querySelectorAll(".courage-card").forEach((card) => {
    card.addEventListener("click", () => {
      const flipped = card.classList.toggle("flipped");
      card.setAttribute("aria-pressed", String(flipped));
      if (flipped) vibrate(18);
    });
  });
}

function openCardDay(dayKey) {
  const dayCards = state.cards
    .filter((card) => dateKey(new Date(card.createdAt)) === dayKey)
    .reverse();
  if (!dayCards.length) return;
  const content = el("cardDayDialogContent");
  content.innerHTML = `
    <h2>${escapeHtml(cardDayHeading(dayCards[0].createdAt, true))}</h2>
    <p class="album-help">共 ${dayCards.length} 张勇气卡 · 点击卡片翻面</p>
    <div class="card-day-grid">${dayCards.map(courageCardMarkup).join("")}</div>`;
  bindCardFlips(content);
  el("cardDayDialog").showModal();
}

function renderCards() {
  el("cardCount").textContent = state.cards.length;
  if (!state.cards.length) {
    el("cardGrid").innerHTML = `<div class="starter-card"><div><i aria-hidden="true">✦</i><strong>第一张卡等待一次真实行动</strong><p>完成主动表达，或在对方没有兴趣时自然退出，都会生成一张只属于你的新证据。</p></div></div>`;
    return;
  }

  const groups = [...state.cards].reverse().reduce((result, card) => {
    const key = dateKey(new Date(card.createdAt));
    const group = result.find((item) => item.key === key);
    if (group) group.cards.push(card);
    else result.push({ key, cards: [card] });
    return result;
  }, []);

  el("cardGrid").innerHTML = groups.map((group) => {
    const latestCard = group.cards[0];
    const chronologicalIndex = Math.max(0, state.cards.findIndex((item) => item.id === latestCard.id));
    return `
      <button class="card-date-group pattern-${chronologicalIndex % 16}" type="button" data-card-day="${escapeHtml(group.key)}" aria-label="查看${escapeHtml(cardDayHeading(latestCard.createdAt))}收集的${group.cards.length}张勇气卡">
        <span>${escapeHtml(cardDayHeading(latestCard.createdAt))}</span>
        <strong>${group.cards.length}<small> 张</small></strong>
        <em>点开查看当日卡片</em>
      </button>`;
  }).join("");

  el("cardGrid").querySelectorAll("[data-card-day]").forEach((button) => {
    button.addEventListener("click", () => openCardDay(button.dataset.cardDay));
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

function renderAttemptTrend(actions) {
  const chart = el("attemptTrendChart");
  const sorted = [...actions]
    .map((log) => ({ ...log, trendAt: new Date(log.launchedAt || log.createdAt) }))
    .filter((log) => !Number.isNaN(log.trendAt.getTime()))
    .sort((a, b) => a.trendAt - b.trendAt);

  el("attemptTrendTotal").textContent = `${sorted.length} 次`;
  if (!sorted.length) {
    chart.innerHTML = `<div class="empty-state">本周还没有真实出手。</div>`;
    return;
  }

  const width = 390;
  const height = 210;
  const left = 30;
  const right = 14;
  const top = 20;
  const bottom = 36;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const start = weekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const weekDuration = end - start;
  const xFor = (date) => left + Math.min(1, Math.max(0, (date - start) / weekDuration)) * plotWidth;
  const yFor = (count) => top + plotHeight - (count / sorted.length) * plotHeight;
  let path = `M ${left} ${top + plotHeight}`;
  sorted.forEach((log, index) => {
    const x = xFor(log.trendAt);
    path += ` H ${x.toFixed(2)} V ${yFor(index + 1).toFixed(2)}`;
  });
  const lastX = xFor(sorted.at(-1).trendAt);
  const areaPath = `${path} L ${lastX.toFixed(2)} ${top + plotHeight} L ${left} ${top + plotHeight} Z`;
  const dayLabels = getWeekDays().map((date, index) => {
    const x = left + ((index + 0.5) / 7) * plotWidth;
    return `<text class="attempt-axis-label" x="${x.toFixed(2)}" y="${height - 12}" text-anchor="middle">${WEEKDAY_NAMES[index]}</text>`;
  }).join("");
  const points = sorted.map((log, index) => {
    const x = xFor(log.trendAt);
    const y = yFor(index + 1);
    return `<circle class="attempt-point" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4"><title>${escapeHtml(formatShortDate(log.trendAt))} ${escapeHtml(formatTime(log.trendAt))} · 累计 ${index + 1} 次</title></circle>`;
  }).join("");

  chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="本周累计出手 ${sorted.length} 次">
      <defs>
        <linearGradient id="attemptLineGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#75a9e8" />
          <stop offset="1" stop-color="#77c9b5" />
        </linearGradient>
        <linearGradient id="attemptAreaGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#77c9b5" stop-opacity="0.22" />
          <stop offset="1" stop-color="#75a9e8" stop-opacity="0.02" />
        </linearGradient>
      </defs>
      <line class="attempt-grid-line" x1="${left}" x2="${width - right}" y1="${top + plotHeight}" y2="${top + plotHeight}" />
      <line class="attempt-grid-line" x1="${left}" x2="${width - right}" y1="${top}" y2="${top}" />
      <text class="attempt-axis-label" x="${left - 8}" y="${top + plotHeight + 4}" text-anchor="end">0</text>
      <text class="attempt-axis-label" x="${left - 8}" y="${top + 4}" text-anchor="end">${sorted.length}</text>
      <path class="attempt-area" d="${areaPath}" />
      <path class="attempt-line" d="${path}" />
      ${points}
      ${dayLabels}
    </svg>`;
}

function renderReview() {
  const logs = currentWeekLogs();
  const actions = actionLogs(logs);
  const avoidances = logs.filter((log) => log.kind === "avoided");
  el("avoidanceCount").textContent = `${avoidances.length} 次回避`;
  renderAttemptTrend(actions);

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
    : `<div class="empty-state">这里可以帮助你识别反复出现的回避想法。</div>`;

  const topReasonKey = sortedReasons[0]?.[0];
  el("ifThenPlan").innerHTML = topReasonKey
    ? `<span>下次的“如果—那么”计划 · ${escapeHtml(REASON_GROUPS[topReasonKey].label)}</span><p>${escapeHtml(REASON_GROUPS[topReasonKey].plan)}</p>`
    : `<span>下次的“如果—那么”计划</span><p>记录一次回避后，这里会根据最常见阻碍生成行动计划。</p>`;

  el("contextCount").textContent = `${actions.length} 次记录`;
  const countBy = (getLabel) => actions.reduce((counts, log) => {
    const label = getLabel(log);
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {});
  const renderCounts = (counts) => {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"));
    return entries.length
      ? entries.map(([label, count]) => `<div><span>${escapeHtml(label)}</span><strong>${count}</strong></div>`).join("")
      : `<div class="compact-stat-empty">尚无记录</div>`;
  };
  el("ledgerContextStats").innerHTML = renderCounts(countBy((log) => log.context || "场景未记录"));
  el("ledgerTargetStats").innerHTML = renderCounts(countBy((log) => {
    const level = COURAGE_FUND_LEVELS[log.fundLevel] || "心动程度未记录";
    const group = COURAGE_FUND_GROUPS[log.fundGroup] || "同行情况未记录";
    return `${level} · ${group}`;
  }));

  const weekCards = currentWeekItems(state.cards);
  el("evidenceList").innerHTML = weekCards.length
    ? [...weekCards].reverse().slice(0, 6).map((card) => `
        <article class="evidence-item">
          <i aria-hidden="true">✦</i>
          <div><strong>${escapeHtml(card.evidence)}</strong><small>${escapeHtml(card.context)} · ${escapeHtml(card.rarity)}勇气卡</small></div>
          <span>${escapeHtml(formatShortDate(card.createdAt))}</span>
        </article>`).join("")
    : `<div class="empty-state">完成一次真实行动后，新证据会出现在这里。</div>`;

  const unsuitableCount = logs.filter((log) => log.kind === "unsuitable").length;
  el("historyList").innerHTML = `
    <div class="behavior-summary">
      <div><span>实际出手</span><strong>${actions.length}</strong><small>次</small></div>
      <div><span>判断不合适</span><strong>${unsuitableCount}</strong><small>次</small></div>
      <div><span>回避</span><strong>${avoidances.length}</strong><small>次</small></div>
    </div>`;
}

function renderExpenses() {
  const expenses = state.expenses;
  const lifetimeFund = courageFundTotal();
  const lifetimeExpense = state.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const lifetimeBalance = lifetimeFund - lifetimeExpense;
  const lifetimeActions = actionLogs().length;

  el("fundWeekEarned").textContent = formatMoney(lifetimeFund);
  el("expenseTotal").textContent = formatMoney(lifetimeExpense);
  el("fundWeekBalance").textContent = formatMoney(lifetimeBalance, true);
  el("fundBalanceTotal").textContent = formatMoney(lifetimeBalance, true);
  el("fundWeekBalanceCard").classList.toggle("positive", lifetimeBalance > 0);
  el("fundWeekBalanceCard").classList.toggle("negative", lifetimeBalance < 0);
  el("fundBalanceTotal").classList.toggle("positive", lifetimeBalance > 0);
  el("fundBalanceTotal").classList.toggle("negative", lifetimeBalance < 0);
  el("ledgerActionSummary").textContent = lifetimeActions
    ? `${lifetimeActions} 次真实出手，已经留下 ${formatMoney(lifetimeFund)} 行动积累。`
    : "还没有行动入账。第一笔会从真实出手开始。";
  el("expenseList").innerHTML = expenses.length
    ? [...expenses].reverse().map((item) => `
        <article class="expense-item">
          <div><strong>${escapeHtml(item.category)}</strong></div>
          <span>¥${Number(item.amount).toFixed(2)} · ${escapeHtml(formatShortDate(item.createdAt))}</span>
        </article>`).join("")
    : "";

}

function renderAll() {
  renderToday();
  renderMap();
  renderCards();
  renderReview();
  renderExpenses();
}

function contextOptions(selected = "商场") {
  return CONTEXTS.map((context) => `<option${context === selected ? " selected" : ""}>${escapeHtml(context)}</option>`).join("");
}

function openTrainingDialog() {
  trainingFlow = {
    stage: "safety",
    safetyIndex: 0,
    opportunityStartedAt: Date.now(),
    opportunityStartedPerf: performance.now(),
    launchedAt: null,
    launchLatencyMs: null,
    outcome: null,
    anxietyBefore: 6,
    anxietyAfter: 4,
    context: "商场",
    note: "",
    fundLevel: "everyday",
    fundGroup: "solo",
    groupComposition: "unspecified",
    reasonCategory: "",
    reasonText: ""
  };
  renderTrainingDialog();
  el("trainingDialog").showModal();
}

function renderTrainingDialog() {
  const content = el("trainingDialogContent");
  if (!trainingFlow) return;

  if (trainingFlow.stage === "safety") {
    const safetyIndex = Math.min(BOUNDARY_CHECKS.length - 1, Number(trainingFlow.safetyIndex || 0));
    const isLastCheck = safetyIndex === BOUNDARY_CHECKS.length - 1;
    content.innerHTML = `
      <div class="dialog-step safety-timing-stage">
        <div class="safety-timer-ring" aria-hidden="true"></div>
        <div class="safety-step-content">
          <div class="safety-progress-row">
            <p class="eyebrow">逐条边界检查</p>
            <strong>${safetyIndex + 1} / ${BOUNDARY_CHECKS.length}</strong>
          </div>
          <h2>先确认这是一个合适机会</h2>
          <p class="dialog-lead">一次只判断一件事。能识别边界，本身就是社交能力。</p>
          <div class="single-safety-check" aria-live="polite">
            <span>边界 ${safetyIndex + 1}</span>
            <p class="safety-check-copy">${escapeHtml(BOUNDARY_CHECKS[safetyIndex])}</p>
          </div>
          <div class="button-stack">
            <button class="primary-action" id="safetyConfirmButton" type="button">${isLastCheck ? "确认，开始行动" : "确认，下一条"}</button>
            <button class="secondary-action" id="safetyRejectButton" type="button">不符合，本次不打扰</button>
          </div>
        </div>
      </div>`;

    el("safetyConfirmButton").addEventListener("click", () => {
      if (!isLastCheck) {
        trainingFlow.safetyIndex = safetyIndex + 1;
        renderTrainingDialog();
        return;
      }
      const wallElapsed = Date.now() - trainingFlow.opportunityStartedAt;
      const performanceElapsed = performance.now() - trainingFlow.opportunityStartedPerf;
      trainingFlow.launchLatencyMs = Math.max(0, Math.round(Math.max(wallElapsed, performanceElapsed)));
      trainingFlow.launchedAt = new Date().toISOString();
      trainingFlow.stage = "action";
      renderTrainingDialog();
    });
    el("safetyRejectButton").addEventListener("click", () => saveSimpleLog("unsuitable"));
    return;
  }

  if (trainingFlow.stage === "action") {
    const ladder = LADDER_LEVELS[Number(state.settings.ladderLevel)] || LADDER_LEVELS[3];
    content.innerHTML = `
      <div class="dialog-step">
        <p class="eyebrow">${escapeHtml(ladder.name)}</p>
        <h2>焦虑可以在场，你仍然能选择</h2>
        <div class="minimum-action"><span>今天的最小动作</span><strong>${escapeHtml(ladder.action)}</strong></div>
        <div class="fund-action-cue">
          <span>完成后再记录心动程度与同行人数</span>
          <strong>¥0.05–¥10.50</strong>
          <p>现在只做最小动作，不在出手前计算档位。</p>
        </div>
        <div class="launch-plan"><span>如果环境合适，而且我开始反复预测拒绝</span><strong>那么我先迈出一步，再允许焦虑跟上来。</strong></div>
        <p class="dialog-lead">不用寻找完美开场。说话真实、保持距离、给对方轻松退出的空间。</p>
        <button class="primary-action" id="returnedButton" type="button">行动完成了，回来记录</button>
        <button class="secondary-action" id="changedUnsuitableButton" type="button">现场变得不合适</button>
        <button class="text-button" id="actionAvoidedButton" type="button">我还是回避了</button>
      </div>`;
    el("returnedButton").addEventListener("click", () => {
      trainingFlow.stage = "outcome";
      renderTrainingDialog();
    });
    el("changedUnsuitableButton").addEventListener("click", () => saveSimpleLog("unsuitable"));
    el("actionAvoidedButton").addEventListener("click", () => {
      trainingFlow.outcome = "avoided";
      trainingFlow.stage = "avoidance-detail";
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
          <button class="outcome-button" type="button" data-outcome="completed"><strong>对方愿意继续交流</strong><span>这仍是一笔真实出手记录</span></button>
          <button class="outcome-button" type="button" data-outcome="graceful_exit"><strong>被拒绝了，我自然离开</strong><span>增加今日拒绝计数，完成暴露训练</span></button>
        </div>
      </div>`;
    content.querySelectorAll("[data-outcome]").forEach((button) => {
      button.addEventListener("click", () => {
        const outcome = button.dataset.outcome;
        trainingFlow.outcome = outcome;
        trainingFlow.stage = "action-detail";
        renderTrainingDialog();
      });
    });
    return;
  }

  if (trainingFlow.stage === "action-detail") {
    const fundAmount = availableCourageFundAmount(trainingFlow.fundLevel, trainingFlow.fundGroup);
    const fundCapReached = fundAmount === 0 && actionLogs().filter((log) => dateKey(new Date(log.createdAt)) === dateKey()).length >= COMPLETE_ACTION_GOAL;
    content.innerHTML = `
      <form class="dialog-step" id="actionDetailForm">
        <p class="eyebrow">生成一张新勇气卡</p>
        <h2>${escapeHtml(OUTCOME_LABELS[trainingFlow.outcome])}</h2>
        <div class="fund-config">
          <div class="fund-config-heading">
            <span>事后记录本次挑战档位</span>
            <strong id="fundPreview" aria-live="polite">${fundCapReached ? "今日已满，不再累计" : `+${formatMoney(fundAmount)}`}</strong>
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
          <label class="group-composition-field${trainingFlow.fundGroup === "solo" ? " hidden" : ""}" id="groupCompositionField">
            <span>同行构成（只用于组合成就）</span>
            <select id="groupCompositionSelect">
              ${Object.entries(GROUP_COMPOSITIONS).map(([key, label]) => `<option value="${key}"${trainingFlow.groupComposition === key ? " selected" : ""}>${escapeHtml(label)}</option>`).join("")}
            </select>
          </label>
          <p>只记录你的主观挑战感和同行人数，不记录她的外貌细节；回应如何都不改变金额。</p>
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
    el("fundLevelSelect").addEventListener("change", updateFundPreview);
    el("fundGroupSelect").addEventListener("change", updateFundPreview);
    el("groupCompositionSelect").addEventListener("change", () => {
      trainingFlow.groupComposition = el("groupCompositionSelect").value;
    });
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
    const todayLogs = state.logs.filter((log) => dateKey(new Date(log.createdAt)) === dateKey());
    const todayActions = actionLogs(todayLogs).length;
    const todayRejections = rejectionLogs(todayLogs).length;
    const weekLogs = currentWeekLogs();
    const weekActions = actionLogs(weekLogs).length;
    const weekFund = courageFundTotal(weekLogs);
    const weekExpense = currentWeekItems(state.expenses).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const weekBalance = weekFund - weekExpense;
    content.innerHTML = `
      <div class="dialog-step">
        <p class="eyebrow">+${card.points} 勇气值 · +${formatMoney(card.fundAmount)} 储备金</p>
        <h2>${card.kind === "graceful_exit" ? "拒绝已收到，今天更自由了一点" : "行动完成，奖励现在就到账"}</h2>
        <div class="fund-reward">
          <span aria-hidden="true">✦</span>
          <div><small>勇气储备金</small><strong>+${formatMoney(card.fundAmount)}</strong><p>无论对方如何回应，这次尊重边界的接近都已入账。</p></div>
        </div>
        <div class="reward-reveal">
          <span class="big-symbol" aria-hidden="true">${cardSymbol(card)}</span>
          <strong>${escapeHtml(card.quote)}</strong>
          <p>${escapeHtml(card.evidence)}</p>
        </div>
        <p class="launch-latency-fact">从发现机会到开始行动：<strong>${formatLaunchLatency(card.launchLatencyMs)}</strong><span>只记录事实，不评价快慢。</span></p>
        <div class="reward-momentum-stats">
          <div><span>本周真实出手</span><strong>${weekActions} 次</strong></div>
          <div><span>本周勇气储备</span><strong>${formatMoney(weekFund)}</strong></div>
          <div><span>当前本周净额</span><strong>${formatMoney(weekBalance, true)}</strong></div>
        </div>
        <p class="reward-progress-copy">今日已真实出手 ${todayActions} 次${todayActions >= COMPLETE_ACTION_GOAL ? " · 蓝色进阶已点亮" : " · 绿色行动底已点亮"}${todayRejections ? `；其中 ${todayRejections} 次拒绝已记为暗金描边` : ""}</p>
        <button class="primary-action" id="rewardLedgerButton" type="button">查看刚刚入账</button>
        <button class="secondary-action" id="viewCardButton" type="button">去卡册翻开它</button>
        <button class="text-button" id="finishTrainingButton" type="button">完成本次记录</button>
      </div>`;
    el("rewardLedgerButton").addEventListener("click", () => {
      closeDialog(el("trainingDialog"));
      switchView("ledgerView", "勇气账本");
    });
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
  const compositionField = el("groupCompositionField");
  compositionField?.classList.toggle("hidden", trainingFlow.fundGroup === "solo");
  if (trainingFlow.fundGroup === "solo") trainingFlow.groupComposition = "unspecified";
  const amount = availableCourageFundAmount(trainingFlow.fundLevel, trainingFlow.fundGroup);
  const fundCapReached = amount === 0 && actionLogs().filter((log) => dateKey(new Date(log.createdAt)) === dateKey()).length >= COMPLETE_ACTION_GOAL;
  el("fundPreview").textContent = fundCapReached ? "今日已满，不再累计" : `+${formatMoney(amount)}`;
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
    "我主动选择机会，也主动创造可能。",
    "我带着紧张向前，行动依然漂亮完成。",
    "一次真实出手，胜过十次脑内推演。",
    "行动属于我，成长也属于我。",
    "我真诚靠近，也稳稳守住边界。",
    "每次出手都在增强我的行动肌肉。",
    "我无需等待焦虑许可，现在就能行动。",
    "真实经验正在快速扩展我的能力。",
    "我能拥抱不确定，也能保持真诚。",
    "行动让我增长，勇气让我自由。",
    "今天我正在扩展自己的选择。",
    "每一次自然开口，都在强化主动本能。",
    "我负责表达，也享受行动本身。",
    "我用现实经验持续升级自己。",
    "心跳加快，正说明我在突破边界。",
    "我把注意力带回当下，果断完成一步。",
    "勇气已经真实发生，并留下证据。",
    "我正在练成一项会长期受益的能力。"
  ];
  const exits = [
    "我接住一次拒绝，也完成一次升级。",
    "拒绝增加训练重量，行动增长我的力量。",
    "我迎难而上，今天的主动性再次获胜。",
    "一次拒绝，就是一次更强的行动耐受。"
  ];
  const pool = kind === "graceful_exit" ? [...exits, ...common] : common;
  return pool[index % pool.length];
}

function generateEvidence(kind, before, after) {
  if (kind === "graceful_exit") {
    if (after < before) return `我主动出手并接住了一次拒绝；焦虑从 ${before} 降到 ${after}，行动耐受正在增长。`;
    return "我主动出手并接住了一次拒绝；即使焦虑还在，我依旧完成了行动。";
  }
  if (after < before) return `行动后焦虑从 ${before} 降到 ${after}；开始往往比脑内预测更可控。`;
  if (after === before) return `焦虑仍是 ${after}，但我没有等待它消失才行动。`;
  return `焦虑短暂升到 ${after}，但我仍完成了自己的选择；情绪不是命令。`;
}

function saveActionLog(event) {
  event.preventDefault();
  trainingFlow.fundLevel = el("fundLevelSelect").value;
  trainingFlow.fundGroup = el("fundGroupSelect").value;
  trainingFlow.groupComposition = trainingFlow.fundGroup === "solo" ? "unspecified" : el("groupCompositionSelect").value;
  const before = Number(el("beforeRange").value);
  const after = Number(el("afterRange").value);
  const context = el("trainingContext").value;
  const note = el("trainingNote").value.trim();
  const basePoints = 3;
  const points = basePoints + (before >= 6 ? 1 : 0);
  const fundAmount = availableCourageFundAmount(trainingFlow.fundLevel, trainingFlow.fundGroup);
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
    fundGroup: trainingFlow.fundGroup,
    groupComposition: trainingFlow.groupComposition,
    launchedAt: trainingFlow.launchedAt,
    launchLatencyMs: trainingFlow.launchLatencyMs
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
    groupComposition: trainingFlow.groupComposition,
    launchedAt: trainingFlow.launchedAt,
    launchLatencyMs: trainingFlow.launchLatencyMs,
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

function openSettings() {
  el("ladderLevelInput").value = state.settings.ladderLevel;
  el("rewardLabelInput").value = state.settings.rewardLabel;
  el("settingsDialog").showModal();
}

function initSettings() {
  el("ladderLevelInput").innerHTML = LADDER_LEVELS.map((level, index) => `<option value="${index}">${escapeHtml(level.name)}</option>`).join("");
  el("settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.settings.ladderLevel = Number(el("ladderLevelInput").value);
    state.settings.rewardLabel = el("rewardLabelInput").value.trim() || defaultState.settings.rewardLabel;
    state.settings.rewardAmount = 0;
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
    amount: 0,
    createdAt: now
  });
  saveState();
  renderAll();
  vibrate([25, 30, 45]);
  showToast("真实奖赏已兑现");
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
  el("settingsButton").addEventListener("click", openSettings);
  el("editRewardButton").addEventListener("click", openSettings);
  el("closeTrainingButton").addEventListener("click", () => closeDialog(el("trainingDialog")));
  el("closeSettingsButton").addEventListener("click", () => closeDialog(el("settingsDialog")));
  el("closeInstallButton").addEventListener("click", () => closeDialog(el("installDialog")));
  el("closeCardDayButton").addEventListener("click", () => closeDialog(el("cardDayDialog")));
  el("installButton").addEventListener("click", installApp);
  el("claimRewardButton").addEventListener("click", claimReward);
  el("exportButton").addEventListener("click", exportData);
  el("expenseForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(el("expenseAmount").value);
    if (!Number.isFinite(amount) || amount <= 0) return;
    state.expenses.push({
      id: uid("expense"),
      createdAt: new Date().toISOString(),
      amount,
      category: el("expenseCategory").value,
      note: ""
    });
    saveState();
    event.currentTarget.reset();
    renderAll();
    showToast("真实开销已记录");
  });
  el("weekSelector").addEventListener("change", (event) => {
    selectedWeekKey = event.currentTarget.value;
    renderToday();
  });

  [el("trainingDialog"), el("settingsDialog"), el("installDialog"), el("cardDayDialog")].forEach((dialog) => {
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
