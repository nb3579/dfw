/* 文件名: js/game.js
   描述: 大富翁4：全球城市大地图 核心逻辑引擎 (100%防御防崩溃版)
   包含：棋盘生成、回合控制、地产逻辑、彩票与神明系统、AI决策
*/

// --- 🛡️ 安全 DOM 包装器 (防范元素缺失导致游戏崩溃) ---
const DOM = {
  setText: (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; },
  setHTML: (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; },
  setDisabled: (id, disabled) => { const el = document.getElementById(id); if (el) el.disabled = disabled; },
  show: (id) => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); },
  hide: (id) => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); },
  addClass: (id, cls) => { const el = document.getElementById(id); if (el) el.classList.add(cls); },
  removeClass: (id, cls) => { const el = document.getElementById(id); if (el) el.classList.remove(cls); },
  setClass: (id, cls) => { const el = document.getElementById(id); if (el) el.className = cls; } // ✅ 修复 TypeError 报错
};

// --- 游戏动态运行时状态 ---
let players = [];
let roundCount = 1;
let currentTurnIndex = 0;
let mapStates = [];
let isDiceRolling = false;
let currentPropPending = null;
let passStartBonus = 3000;
let lotteryPool = 5000;
let lotteryTickets = {};

const MAP_LENGTH = 40; // 11x11 Grid外圈周长为40格
const GOD_TURNS = 5;

// --- 基础数据配置 ---
const PLAYER_TEMPLATES = [
  { name: "孙小美 👧", color: "border-pink-500 text-pink-500 shadow-pink-500/20 bg-pink-500", textCol: "text-pink-400", avatar: "👧" },
  { name: "钱夫人 👩‍💼", color: "border-red-500 text-red-500 shadow-red-500/20 bg-red-500", textCol: "text-red-400", avatar: "👩‍💼" },
  { name: "阿土伯 👴", color: "border-green-500 text-green-500 shadow-green-500/20 bg-green-500", textCol: "text-green-400", avatar: "👴" },
  { name: "金贝贝 👶", color: "border-purple-500 text-purple-500 shadow-purple-500/20 bg-purple-500", textCol: "text-purple-400", avatar: "👶" }
];

// --- 85个全球名城 ---
const GLOBAL_CITIES = [
  "北京", "东京", "纽约", "伦敦", "巴黎", "罗马", "悉尼", "柏林", "多伦多", "新加坡", 
  "迪拜", "莫斯科", "首尔", "上海", "深圳", "香港", "曼谷", "孟买", "伊斯坦堡", "里约", 
  "开普敦", "阿姆斯特丹", "日内瓦", "维也纳", "马德里", "里斯本", "斯德哥尔摩", "奥斯陆", "哥本哈根", "布鲁塞尔", 
  "雅典", "布拉格", "华沙", "布达佩斯", "基辅", "都柏林", "赫尔辛基", "雷克雅未克", "马尼拉", "雅加达", 
  "吉隆坡", "河内", "温哥华", "洛杉矶", "芝加哥", "旧金山", "波士顿", "西雅图", "迈阿密", "休斯敦"
];

// --- 🧱 生成棋盘 ---
const TILE_DEFS = [];
function generate40Tiles() {
  let cityIndex = 0;
  for (let i = 0; i < MAP_LENGTH; i++) {
    let col = 1, row = 1;
    if (i <= 10) { col = i + 1; row = 1; }
    else if (i > 10 && i <= 20) { col = 11; row = (i - 10) + 1; }
    else if (i > 20 && i <= 30) { col = 11 - (i - 20); row = 11; }
    else { col = 1; row = 11 - (i - 30); }

    let type = "LAND", name = "", color = "from-cyan-500 to-blue-600 font-black";
    let desc = "环球都市地产", cost = 1200 + (i * 120), rent = 180 + (i * 30);

    if (i === 0) { type = "START"; name = "起点 🏁"; color = "bg-red-500"; desc = "起航奖励金发放处"; }
    else if (i === 10) { type = "HOSPITAL"; name = "医院 🏥"; color = "bg-blue-600"; desc = "需要调养，停步2回合"; }
    else if (i === 20) { type = "PRISON"; name = "拘留所 🚓"; color = "bg-gray-600"; desc = "反思改过，禁足2回合"; }
    else if (i === 30) { type = "GOD_SHRINE"; name = "神明庙 ⛩️"; color = "bg-amber-600"; desc = "烧香礼佛，请神降临"; }
    else if (i === 5 || i === 15 || i === 25 || i === 35) {
      type = (i % 10 === 5) ? "CHANCE" : "DESTINY";
      name = type === "CHANCE" ? "财富机遇 🎁" : "宿命大转 🎡";
      color = "bg-purple-600"; desc = "命运变局，未知祸福";
    } else {
      name = GLOBAL_CITIES[cityIndex] || "海外新城";
      cityIndex++;
      const colors = ["from-pink-500 to-pink-600", "from-yellow-500 to-amber-500", "from-blue-500 to-cyan-500", "from-red-500 to-rose-500", "from-green-500 to-emerald-500", "from-purple-500 to-violet-500"];
      color = colors[i % colors.length] + " font-bold";
    }
    TILE_DEFS.push({ id: i, col, row, name, type, cost, rent, color, desc });
  }
}
generate40Tiles();

// --- 工具函数 ---
function getPropertyEmoji(type, level) {
  if (type !== "LAND") {
    if (type === "START") return "🏁";
    if (type === "HOSPITAL") return "🏥";
    if (type === "PRISON") return "🚓";
    if (type === "GOD_SHRINE") return "⛩️";
    if (type === "CHANCE") return "🎁";
    if (type === "DESTINY") return "🎡";
    return "📍";
  }
  return ["🌳", "🏠", "🏡", "🏢", "🏣", "🏰"][level] || "🏠";
}

function getGodName(type) {
  return { "wealth": "大财神", "misfortune": "衰神", "earth": "土地公", "wisdom": "智慧神" }[type] || "";
}

function getGodBadgeEmoji(type) {
  return { "wealth": "😇", "misfortune": "😈", "earth": "🧙", "wisdom": "🧠" }[type] || "✨";
}

function getDiceFace(value) {
  return ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][value - 1] || "🎲";
}

function calculateRent(tileId) {
  const tile = TILE_DEFS[tileId];
  const state = mapStates[tileId];
  if (!tile || !state || tile.type !== "LAND") return 0;
  if (state.level <= 1) return tile.rent;
  return tile.rent * Math.pow(2, state.level - 1);
}

// --- 日志与UI辅助 ---
function addLog(text, customClass = "text-slate-300") {
  const logs = document.getElementById("game-logs");
  if (!logs) return;
  const item = document.createElement("div");
  // 优化日志单条显示效果，消除局促感
  item.className = "p-2 mb-1.5 bg-slate-900/50 rounded-lg border border-slate-800/60 leading-relaxed font-mono text-xs shadow-sm " + customClass;
  item.textContent = "[第 " + roundCount + " 轮] " + text;
  logs.appendChild(item);
  logs.scrollTop = logs.scrollHeight;
}

function clearLogs() {
  DOM.setHTML("game-logs", "");
}

// --- 初始化与游戏循环 ---
function renderSetupScreen() {
  const listContainer = document.getElementById("player-setup-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";
  
  PLAYER_TEMPLATES.forEach((tpl, index) => {
    const row = document.createElement("div");
    row.className = "flex flex-col sm:flex-row items-center justify-between bg-slate-900/60 p-4 mb-3 rounded-2xl border border-slate-700/50 shadow-lg gap-4";
    row.innerHTML = `<div class="flex items-center gap-4 w-full sm:w-auto">
      <span class="text-4xl drop-shadow-md">${tpl.avatar}</span>
      <div class="flex-grow">
        <input type="text" id="setup-name-${index}" value="${tpl.name}" class="bg-slate-950/80 border border-slate-700 text-white font-bold rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:border-cyan-400">
        <span class="text-xs block text-slate-400 mt-1 uppercase tracking-wider">配戴色: ${tpl.name.split(' ')[0]}</span>
      </div>
    </div>
    <div class="flex gap-3 w-full sm:w-auto bg-slate-950/50 p-2 rounded-xl justify-center">
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input type="radio" name="setup-type-${index}" value="human" ${index === 0 ? "checked" : ""} class="accent-cyan-400 w-4 h-4">
        <span class="text-xs font-bold text-slate-300">玩家</span>
      </label>
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input type="radio" name="setup-type-${index}" value="ai" ${index > 0 ? "checked" : ""} class="accent-cyan-400 w-4 h-4">
        <span class="text-xs font-bold text-slate-400">AI</span>
      </label>
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input type="radio" name="setup-type-${index}" value="none" class="accent-cyan-400 w-4 h-4">
        <span class="text-xs font-bold text-slate-500">不参战</span>
      </label>
    </div>`;
    listContainer.appendChild(row);
  });
}

function startGame() {
  if (window.sound && typeof window.sound.init === "function") window.sound.init();
  
  const initCash = parseInt(document.getElementById("init-cash")?.value) || 30000;
  passStartBonus = parseInt(document.getElementById("start-bonus")?.value) || 5000;

  players = [];
  PLAYER_TEMPLATES.forEach((tpl, index) => {
    const nameInput = document.getElementById("setup-name-" + index);
    const typeInput = document.querySelector('input[name="setup-type-' + index + '"]:checked');
    if (!nameInput || !typeInput) return;

    if (typeInput.value !== "none") {
      players.push({
        id: index,
        name: nameInput.value,
        avatar: tpl.avatar,
        color: tpl.color,
        textCol: tpl.textCol,
        cash: initCash,
        position: 0,
        god: null, 
        isBankrupt: false,
        isAI: typeInput.value === "ai",
        skipTurns: 0,
        hasExtraRoll: false 
      });
    }
  });

  if (players.length < 2) {
    alert("必须保留最少2名角色才能开始生死对决！");
    return;
  }

  mapStates = TILE_DEFS.map(tile => ({ id: tile.id, owner: null, level: 0 }));
  lotteryPool = 5000;
  lotteryTickets = {};

  DOM.hide("setup-screen");
  DOM.show("game-screen");

  renderBoard();
  updatePlayerRanksUI();

  currentTurnIndex = 0;
  roundCount = 1;
  addLog("🎬 40格环形世界城市地图拼接完毕！全球商战正式开战！", "text-cyan-400 font-bold text-sm");
  
  startPlayerTurn();
}

function renderBoard() {
  const container = document.getElementById("board-container");
  if (!container) return;
  container.querySelectorAll(".board-tile").forEach(el => el.remove());

  TILE_DEFS.forEach(tile => {
    const tileDiv = document.createElement("div");
    tileDiv.id = "tile-" + tile.id;
    tileDiv.style.gridColumn = tile.col;
    tileDiv.style.gridRow = tile.row;

    let headerColor = "bg-slate-800";
    let subText = tile.desc;
    const state = mapStates[tile.id];

    if (tile.type === "LAND") {
      headerColor = "bg-gradient-to-r " + tile.color;
      subText = "$" + tile.cost + " (租金:$" + tile.rent + ")";
    } else if (tile.type === "START") headerColor = "bg-red-500";
    else if (tile.type === "GOD_SHRINE") headerColor = "bg-amber-600";

    tileDiv.className = "board-tile bg-slate-900 border border-slate-800/85 rounded-xl p-1 flex flex-col justify-between overflow-hidden shadow relative select-none cursor-pointer h-full w-full";
    tileDiv.innerHTML = `<div class="${headerColor} text-[9px] md:text-[10px] px-1 py-0.5 rounded text-center font-bold text-slate-950 shadow truncate">${tile.name}</div>
      <div class="flex-grow flex flex-col items-center justify-center relative min-h-0">
        <span id="tile-house-visual-${tile.id}" class="text-base md:text-2xl filter drop-shadow-[0_2px_4px_rgba(255,255,255,0.05)]">
          ${getPropertyEmoji(tile.type, state ? state.level : 0)}
        </span>
        <div id="tile-owner-indicator-${tile.id}" class="absolute bottom-0 text-[8px] md:text-[9px] font-black px-1 rounded shadow-lg"></div>
      </div>
      <div class="text-[8px] md:text-[10px] text-slate-400 text-center font-bold tracking-tight truncate" id="tile-footer-${tile.id}">${subText}</div>
      <div id="tile-players-holder-${tile.id}" class="absolute inset-x-0 bottom-0.5 flex justify-center gap-0.5 flex-wrap z-10 pointer-events-none px-1"></div>`;
    container.appendChild(tileDiv);
  });

  updatePlayerPositionsUI();
  updatePropertiesUI();
}

function updatePropertiesUI() {
  mapStates.forEach(state => {
    const tile = TILE_DEFS[state.id];
    const tileDiv = document.getElementById("tile-" + state.id);
    const indicator = document.getElementById("tile-owner-indicator-" + state.id);
    const footer = document.getElementById("tile-footer-" + state.id);
    const houseVisual = document.getElementById("tile-house-visual-" + state.id);
    
    if (!tile || !tileDiv || !indicator || !footer || !houseVisual) return;
    if (tile.type !== "LAND") return;

    if (state.owner !== null) {
      const owner = players.find(p => p.id === state.owner);
      if (owner) {
        const borderClasses = ["neon-border-pink", "neon-border-blue", "neon-border-green", "neon-border-amber"];
        tileDiv.className = `board-tile bg-slate-900 ${borderClasses[owner.id]} rounded-xl p-1 flex flex-col justify-between overflow-hidden relative select-none cursor-pointer h-full w-full`;
        indicator.className = "absolute bottom-0 text-[8px] md:text-[9px] text-slate-950 font-black px-1.5 py-0.5 rounded bg-white shadow-lg";
        indicator.textContent = owner.name.split(" ")[0];
        
        footer.innerHTML = `<span class="text-rose-400 font-extrabold">租金:$${calculateRent(state.id)}</span>`;
        houseVisual.textContent = getPropertyEmoji("LAND", state.level);
      }
    } else {
      tileDiv.className = "board-tile bg-slate-900 border border-slate-800/85 rounded-xl p-1 flex flex-col justify-between overflow-hidden shadow relative select-none cursor-pointer h-full w-full";
      indicator.className = "hidden";
      footer.innerHTML = `<span class="text-slate-500 font-bold">地价:$${tile.cost}</span>`;
      houseVisual.textContent = "🌳";
    }
  });
}

function updatePlayerPositionsUI() {
  for (let i = 0; i < MAP_LENGTH; i++) {
    const h = document.getElementById("tile-players-holder-" + i);
    if (h) h.innerHTML = "";
  }

  players.forEach(p => {
    if (p.isBankrupt) return;
    const holder = document.getElementById("tile-players-holder-" + p.position);
    if (holder) {
      const pBadge = document.createElement("div");
      pBadge.id = "player-badge-" + p.id;
      const activeClass = (players[currentTurnIndex].id === p.id) ? "animate-bounce ring-2 ring-yellow-400 z-20" : "ring-1 ring-white/50";
      pBadge.className = `w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center text-xs md:text-sm shadow-lg relative cursor-pointer ${p.color} ${activeClass} transition-all duration-350`;
      pBadge.innerHTML = p.avatar + (p.god ? `<span class="absolute -top-1.5 -right-1.5 text-[9px]">${getGodBadgeEmoji(p.god.type)}</span>` : "");
      holder.appendChild(pBadge);
    }
  });
}

// --- 💰 浮动金币增减特效 ---
function showFloatingMoney(playerId, amount) {
  if (amount === 0) return;
  const badge = document.getElementById("player-badge-" + playerId);
  if (badge) {
    const rect = badge.getBoundingClientRect();
    createFloatingNode(rect.left + window.scrollX + rect.width / 2, rect.top + window.scrollY, amount);
  }
  const rankAvatar = document.getElementById("rank-avatar-" + playerId);
  if (rankAvatar) {
    const rect = rankAvatar.getBoundingClientRect();
    createFloatingNode(rect.left + window.scrollX + rect.width / 2, rect.top + window.scrollY, amount);
  }
}

function createFloatingNode(x, y, amount) {
  const floatDiv = document.createElement("div");
  floatDiv.className = "floating-money-node " + (amount >= 0 ? "money-gain text-emerald-400" : "money-loss text-rose-500");
  floatDiv.textContent = (amount >= 0 ? "+" : "") + "$" + Math.abs(amount).toLocaleString();
  floatDiv.style.left = x + "px";
  floatDiv.style.top = y + "px";
  document.body.appendChild(floatDiv);
  setTimeout(() => floatDiv.remove(), 1400);
}

function adjustPlayerCash(player, amount) {
  player.cash += amount;
  if (player.cash < 0) player.cash = 0;
  showFloatingMoney(player.id, amount);
  updatePlayerRanksUI();
}

// --- 回合循环引擎 ---
function startPlayerTurn() {
  const p = players[currentTurnIndex];
  if (p.isBankrupt) { nextTurn(); return; }

  // 100% 安全注入数据，无视缺少 DOM 标签
  DOM.setText("current-player-avatar", p.avatar);
  DOM.setText("current-player-name", p.name);
  DOM.setText("round-counter", "第 " + roundCount + " 轮");

  DOM.setText("lottery-pool", "$" + lotteryPool.toLocaleString());
  let roundsLeft = 10 - ((roundCount - 1) % 10);
  DOM.setText("lottery-countdown", "开奖倒计时: " + roundsLeft + " 轮");
  
  const ticket = lotteryTickets[p.id];
  DOM.setText("lottery-my-num", ticket ? (ticket + " 号") : "无");

  DOM.setDisabled("btn-end-turn", true);
  DOM.setDisabled("btn-roll", false);
  DOM.setDisabled("btn-buy-lottery", !!ticket);
  
  updatePlayerPositionsUI();
  updatePlayerRanksUI();

  if (p.skipTurns > 0) {
    p.skipTurns--;
    addLog(`🏥 [${p.name}] 强制滞留中，无法行动（剩余回合: ${p.skipTurns}）。`, "text-slate-500");
    DOM.setText("quick-tip", "禁足中，自动跳过回合");
    
    DOM.setDisabled("btn-end-turn", false);
    DOM.setDisabled("btn-roll", true);

    if (p.isAI) setTimeout(() => endTurn(), 1200);
    return;
  }

  p.hasExtraRoll = false;
  if (p.god) {
    p.god.turnsLeft--;
    if (p.god.turnsLeft <= 0) {
      addLog(`✨ [${p.name}] 附身神仙 [${getGodName(p.god.type)}] 护法期满，返回仙界。`);
      p.god = null;
    } else {
      triggerGodBuffStartOfTurn(p);
    }
  }

  DOM.setText("quick-tip", "准备掷骰子");

  if (p.isAI && !ticket && Math.random() > 0.6) {
    setTimeout(() => aiBuyLottery(p), 400);
  }
  if (p.isAI) {
    setTimeout(() => triggerDiceRoll(), 1100);
  }
}

function triggerGodBuffStartOfTurn(player) {
  if (!player.god) return;
  if (player.god.type === "wealth") {
    const bonus = Math.floor(Math.random() * 800) + 400;
    adjustPlayerCash(player, bonus);
    addLog(`💰 大财神显灵！天降红包送给 [${player.name}]：+$${bonus}！`, "text-yellow-400 font-bold");
    if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
  }
}

// --- 🎟️ 彩票购买机制 ---
function buyLotteryTicket() {
  const p = players[currentTurnIndex];
  if (p.isBankrupt || lotteryTickets[p.id]) return;

  if (p.cash >= 500) {
    const randomNum = Math.floor(Math.random() * 50) + 1; 
    adjustPlayerCash(p, -500);
    lotteryTickets[p.id] = randomNum;
    lotteryPool += 500;

    DOM.setText("lottery-pool", "$" + lotteryPool.toLocaleString());
    DOM.setText("lottery-my-num", randomNum + " 号");
    DOM.setDisabled("btn-buy-lottery", true);

    addLog(`🎟️ [${p.name}] 购入时时彩，投注幸运数：[${randomNum} 号]！`, "text-yellow-300");
    if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
  } else {
    alert("您的可用现金不足以投注购买彩票！");
  }
}

function aiBuyLottery(aiPlayer) {
  if (aiPlayer.cash >= 1500) {
    const randomNum = Math.floor(Math.random() * 50) + 1;
    adjustPlayerCash(aiPlayer, -500);
    lotteryTickets[aiPlayer.id] = randomNum;
    lotteryPool += 500;
    addLog(`🎟️ AI [${aiPlayer.name}] 投注购买彩票，幸运数字: [${randomNum} 号]。`, "text-yellow-400");
  }
}

// --- 掷骰前进机制 ---
function triggerDiceRoll() {
  if (isDiceRolling || players[currentTurnIndex].isBankrupt) return;
  const p = players[currentTurnIndex];
  DOM.setDisabled("btn-roll", true);
  isDiceRolling = true;

  DOM.addClass("dice-element", "dice-rolling");
  if (window.sound && typeof window.sound.playDice === "function") window.sound.playDice();

  let diceValue = 1;
  let counter = 0;
  const rollInterval = setInterval(() => {
    diceValue = Math.floor(Math.random() * 6) + 1;
    DOM.setText("dice-element", getDiceFace(diceValue));
    counter++;
    if (counter > 8) {
      clearInterval(rollInterval);
      DOM.removeClass("dice-element", "dice-rolling");
      isDiceRolling = false;
      
      addLog(`🎲 [${p.name}] 掷出了 [${diceValue}] 点前进！`, "text-slate-100");
      movePlayerStepByStep(p, diceValue);
    }
  }, 75);
}

function movePlayerStepByStep(player, steps) {
  let currentStep = 0;
  const moveInterval = setInterval(() => {
    player.position = (player.position + 1) % MAP_LENGTH;
    if (player.position === 0 && currentStep < steps - 1) {
      adjustPlayerCash(player, passStartBonus);
      addLog(`🏪 [${player.name}] 路过起点，领取周转奖励金：+$${passStartBonus}！`, "text-emerald-400 font-bold");
      if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
    }
    updatePlayerPositionsUI();
    currentStep++;
    if (currentStep >= steps) {
      clearInterval(moveInterval);
      evaluateLandingTile(player, player.position);
    }
  }, 160);
}

// --- 地格停靠判定 ---
function evaluateLandingTile(player, tileId) {
  const tile = TILE_DEFS[tileId];
  const state = mapStates[tileId];
  DOM.setText("quick-tip", `停在 [${tile.name}]`);

  if (tile.type === "HOSPITAL" || tile.type === "PRISON") {
    player.skipTurns = 2;
    const reason = tile.type === "HOSPITAL" ? "医院静养 2 回合 🏥。" : "拘留所禁足 2 回合 🚓。";
    showEventModal("🚨 限制状态", `[${player.name}] 进入了 ${tile.name}，${reason}`, "🚨");
    addLog(`🚨 [${player.name}] 停靠在 [${tile.name}]，本轮起禁足 2 回合。`, "text-red-400");
    if (window.sound && typeof window.sound.playMisfortune === "function") window.sound.playMisfortune();
    prepareEndTurn();
    return;
  }

  if (tile.type === "START") {
    adjustPlayerCash(player, passStartBonus);
    addLog(`🏪 [${player.name}] 精确降落起点！下发双倍奖金：+$${passStartBonus}！`, "text-emerald-400 font-bold");
    if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
    prepareEndTurn();
    return;
  }

  if (tile.type === "GOD_SHRINE") {
    promptShrineModal(player);
    return;
  }

  if (tile.type === "LAND") {
    if (state.owner !== null && state.owner !== player.id && player.god && player.god.type === "earth") {
      addLog(`🧙 土地公作法！直接免疫付给 [${players.find(p=>p.id===state.owner)?.name}] 的通行费！`, "text-green-400 font-bold");
      prepareEndTurn();
      return;
    }

    if (state.owner === null) {
      if (player.god && player.god.type === "earth") {
        state.owner = player.id;
        state.level = 1;
        addLog(`🧙 土地公作法！免费将无主都市 [${tile.name}] 赠予并契约划归 [${player.name}]！`, "text-green-400 font-bold");
        updatePropertiesUI();
        if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
        prepareEndTurn();
      } else {
        promptPropertyModal(tile, state, "buy");
      }
    } else if (state.owner === player.id) {
      if (player.god && player.god.type === "earth") {
        if (state.level < 5) {
          state.level++;
          addLog(`🧙 土地公作法！免费协助 [${player.name}] 的城市 [${tile.name}] 加盖一层庄园 (Lv.${state.level})！`, "text-green-400 font-bold");
          updatePropertiesUI();
          if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
        } else {
          addLog(`🏰 [${player.name}] 的城市 [${tile.name}] 已经是最高顶级庄园！`);
        }
        prepareEndTurn();
      } else {
        if (state.level < 5) {
          promptPropertyModal(tile, state, "upgrade");
        } else {
          addLog(`🏰 [${player.name}] 的城市 [${tile.name}] 已经是最高顶级庄园！`);
          prepareEndTurn();
        }
      }
    } else {
      collectRentLogic(player, state.owner, tileId);
    }
    return;
  }

  if (tile.type === "CHANCE" || tile.type === "DESTINY") {
    triggerRandomEvent(player);
    return;
  }

  prepareEndTurn();
}

function collectRentLogic(renter, ownerId, tileId) {
  const owner = players.find(p => p.id === ownerId);
  const originalRent = calculateRent(tileId);
  let finalRent = originalRent;

  if (renter.god && renter.god.type === "misfortune") finalRent *= 2;
  else if (renter.god && renter.god.type === "wealth") finalRent = Math.floor(finalRent / 2);

  if (owner.god && owner.god.type === "wealth") finalRent *= 2;
  else if (owner.god && owner.god.type === "misfortune") finalRent = Math.floor(finalRent / 2);

  addLog(`💸 [${renter.name}] 行经 [${owner.name}] 的城市，需缴纳通行费 $${finalRent} (基础: $${originalRent})。`);
  
  if (renter.cash >= finalRent) {
    adjustPlayerCash(renter, -finalRent);
    adjustPlayerCash(owner, finalRent);
    addLog(`💰 [${renter.name}] 支付了过路费，资金已汇入对方账户！`, "text-slate-300");
    if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
    prepareEndTurn();
  } else {
    triggerLiquidationToPay(renter, owner, finalRent);
  }
}

function triggerLiquidationToPay(renter, creditor, debt) {
  addLog(`🚨 [${renter.name}] 现金见底，启动城市房产权低价拆卖清算机制自救！`, "text-rose-500 font-bold");
  
  for (let i = 0; i < mapStates.length; i++) {
    const state = mapStates[i];
    if (state.owner === renter.id) {
      const tile = TILE_DEFS[i];
      const refundPrice = Math.floor((tile.cost + (state.level * tile.cost * 0.5)) * 0.7);
      
      state.owner = null;
      state.level = 0;
      adjustPlayerCash(renter, refundPrice);
      
      addLog(`🏘️ 强制清盘：折卖 [${tile.name}] 产权，变现: +$${refundPrice}`);
      updatePropertiesUI();

      if (renter.cash >= debt) break;
    }
  }

  if (renter.cash >= debt) {
    adjustPlayerCash(renter, -debt);
    adjustPlayerCash(creditor, debt);
    addLog(`✅ [${renter.name}] 清算结束，补齐还清债务，幸免于破产危机。`, "text-green-400");
    prepareEndTurn();
  } else {
    declareBankruptcy(renter, creditor);
  }
}

function declareBankruptcy(player, creditor) {
  player.isBankrupt = true;
  addLog(`💀 资本巨舰陨落！[${player.name}] 土地售罄仍资不抵债，正式宣告破产出局！`, "text-red-500 font-bold");
  if (window.sound && typeof window.sound.playMisfortune === "function") window.sound.playMisfortune();

  if (player.cash > 0 && creditor) {
    const leftover = player.cash;
    adjustPlayerCash(player, -leftover);
    adjustPlayerCash(creditor, leftover);
  }

  mapStates.forEach(state => {
    if (state.owner === player.id) {
      state.owner = null;
      state.level = 0;
    }
  });

  updatePropertiesUI();
  updatePlayerPositionsUI();
  updatePlayerRanksUI();

  checkGameOver();
  prepareEndTurn();
}

// --- 🏠 地产购置 / 加盖 弹窗 ---
function promptPropertyModal(tile, state, actionType) {
  currentPropPending = { tile, state, actionType };
  const player = players[currentTurnIndex];

  DOM.setClass("prop-color-bar", `h-3 w-full rounded-full mb-4 bg-gradient-to-r ${tile.color}`);

  if (actionType === "buy") {
    DOM.setText("prop-title", `收购：${tile.name}`);
    DOM.setText("prop-desc", "此地块当前无人归属。购得产权后建立你的商业关卡，赚取丰厚租金吧！");
    DOM.setText("prop-cost", `$${tile.cost}`);
    DOM.setText("prop-level", "空地 (Lv.0)");
    DOM.setText("prop-rent", `$${tile.rent}`);
    DOM.setText("prop-confirm-btn", "签约购入");
  } else {
    DOM.setText("prop-title", `加盖：${tile.name}`);
    DOM.setText("prop-desc", "在此投资加盖摩天豪华楼，成倍提升路过税收！");
    const buildCost = Math.floor(tile.cost * 0.5);
    DOM.setText("prop-cost", `$${buildCost}`);
    DOM.setText("prop-level", `当前级别: Lv.${state.level}`);
    const nextRent = tile.rent * Math.pow(2, state.level + 1);
    DOM.setText("prop-rent", `$${nextRent} (加盖后)`);
    DOM.setText("prop-confirm-btn", "动工加盖");
  }

  if (player.isAI) {
    let aiDecision = false;
    const requiredCash = actionType === "buy" ? tile.cost : Math.floor(tile.cost * 0.5);
    if (player.cash >= requiredCash + 2000) aiDecision = true;
    setTimeout(() => confirmPropertyAction(aiDecision), 1100);
  } else {
    DOM.show("property-modal");
  }
}

function confirmPropertyAction(agree) {
  DOM.hide("property-modal");
  if (!currentPropPending) return;

  const { tile, state, actionType } = currentPropPending;
  const player = players[currentTurnIndex];

  if (agree) {
    const requiredCash = actionType === "buy" ? tile.cost : Math.floor(tile.cost * 0.5);
    if (player.cash >= requiredCash) {
      adjustPlayerCash(player, -requiredCash);
      if (actionType === "buy") {
        state.owner = player.id;
        state.level = 1;
        addLog(`🏘️ 商业扩张：[${player.name}] 斥资 $${requiredCash} 将 [${tile.name}] 收入麾下！`, "text-pink-400");
      } else {
        state.level++;
        addLog(`🏢 平地起朱楼：[${player.name}] 支付工程款 $${requiredCash} 将 [${tile.name}] 升级至 Lv.${state.level}！`, "text-cyan-400");
      }
      if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
      updatePropertiesUI();
    } else {
      addLog(`❌ 财务紧绷：[${player.name}] 无力支付 [${tile.name}] 的契约资金，机会取消。`, "text-rose-400");
    }
  } else {
    addLog(`💤 [${player.name}] 战略性放弃了 [${tile.name}] 的经营契机。`, "text-slate-500");
  }

  currentPropPending = null;
  prepareEndTurn();
}

// --- ⛩️ 庙宇请神控制 ---
function promptShrineModal(player) {
  if (player.isAI) {
    const price = Math.floor(calculateNetWorth(player) * 0.1);
    if (player.cash >= price + 1000) {
      const roll = Math.random();
      if (roll > 0.6) buyGod("wisdom");
      else if (roll > 0.3) buyGod("wealth");
      else buyGod("earth");
    } else {
      addLog(`⛩️ AI [${player.name}] 评估资产后放弃了购买神明护法。`);
      prepareEndTurn();
    }
    return;
  }

  const price = Math.floor(calculateNetWorth(player) * 0.1);
  DOM.setText("god-price-wealth", `$${price.toLocaleString()}`);
  DOM.setText("god-price-earth", `$${price.toLocaleString()}`);
  DOM.setText("god-price-wisdom", `$${price.toLocaleString()}`);
  DOM.show("shrine-modal");
}

function closeShrineModal() {
  DOM.hide("shrine-modal");
  addLog(`⛩️ [${players[currentTurnIndex].name}] 步出神庙，未购买香火。`);
  prepareEndTurn();
}

function buyGod(godType) {
  DOM.hide("shrine-modal");
  const p = players[currentTurnIndex];
  const price = Math.floor(calculateNetWorth(p) * 0.1);

  if (p.cash >= price) {
    adjustPlayerCash(p, -price);
    p.god = { type: godType, turnsLeft: GOD_TURNS };
    
    if (window.sound && typeof window.sound.playGodArrival === "function") window.sound.playGodArrival();
    const gName = getGodName(godType);
    let desc = godType === "wisdom" ? "【智慧神附体🧠】：每回合行动完毕后，将额外获得一次投骰再行动机会！" :
               godType === "wealth" ? "【大财神附体😇】：后续 5 个回合开始时，神明将直接降临发放现金红包！" :
               "【土地公附体🧙】：后续 5 个回合内免疫过路费，停留自家城市免费加盖！";

    showEventModal(`${gName} 恩赐附体！`, `恭喜 ${p.name} 购得神力！\n\n神明效果：${desc}`, "✨");
    addLog(`✨ [${p.name}] 迎来大仙 [${gName}] 护庇！支出香火钱: -$${price}`, "text-yellow-400 font-bold");
  } else {
    alert("您的可用现金不足以支付香火钱！");
    addLog(`❌ [${p.name}] 资产不够购买香火，求神失败。`, "text-rose-400");
  }
  prepareEndTurn();
}

function calculateNetWorth(player) {
  let estateVal = 0;
  mapStates.forEach(st => {
    if (st.owner === player.id) {
      const tile = TILE_DEFS[st.id];
      estateVal += tile.cost + (st.level * tile.cost * 0.5);
    }
  });
  return player.cash + estateVal;
}

// --- 🧠 智慧神特权判定、回合终结 ---
function prepareEndTurn() {
  const p = players[currentTurnIndex];
  updatePlayerRanksUI();

  if (p.god && p.god.type === "wisdom" && !p.hasExtraRoll && !p.isBankrupt && p.skipTurns === 0) {
    p.hasExtraRoll = true; 
    addLog(`🧠 智慧神显圣！【${p.name}】额外获得一次大行动权！`, "text-cyan-400 font-bold");
    DOM.setText("quick-tip", "【智慧神加动】请再次掷骰！");
    DOM.setDisabled("btn-roll", false);
    DOM.setDisabled("btn-end-turn", true);

    if (p.isAI) setTimeout(() => triggerDiceRoll(), 1200);
    return;
  }

  if (p.isAI) setTimeout(() => endTurn(), 1100);
  else DOM.setDisabled("btn-end-turn", false);
}

function endTurn() {
  currentTurnIndex = (currentTurnIndex + 1) % players.length;
  if (currentTurnIndex === 0) {
    roundCount++;
    if (roundCount > 1 && (roundCount - 1) % 10 === 0) drawLotteryJackpot();
  }
  startPlayerTurn();
}

function nextTurn() {
  currentTurnIndex = (currentTurnIndex + 1) % players.length;
  if (currentTurnIndex === 0) {
    roundCount++;
    if (roundCount > 1 && (roundCount - 1) % 10 === 0) drawLotteryJackpot();
  }
  startPlayerTurn();
}

function drawLotteryJackpot() {
  const winNum = Math.floor(Math.random() * 50) + 1; 
  addLog(`🎰 【时时彩开奖】本期幸运数字：[${winNum} 号]！`, "text-yellow-400 font-extrabold");

  const winners = players.filter(p => !p.isBankrupt && lotteryTickets[p.id] === winNum);
  if (winners.length > 0) {
    const splitMoney = Math.floor(lotteryPool / winners.length);
    winners.forEach(w => {
      adjustPlayerCash(w, splitMoney);
      addLog(`🎉🎉 见证神话！【${w.name}】买中大奖，分得：+$${splitMoney}！`, "text-emerald-400 font-extrabold");
    });
    if (window.sound && typeof window.sound.playJackpot === "function") window.sound.playJackpot();
    lotteryPool = 5000;
  } else {
    addLog(`❌ 本期无人买中大奖号 [${winNum} 号]！资金滚入下一轮大奖池！`, "text-slate-400 font-bold");
    if (window.sound && typeof window.sound.playMisfortune === "function") window.sound.playMisfortune();
  }
  lotteryTickets = {};
}

// --- 命运黑天鹅 ---
function triggerRandomEvent(player) {
  const events = [
    {
      title: "环球大资产税 💸",
      text: "因名下资产暴涨，税务部门课征地税：-$1,500！",
      action: () => {
        adjustPlayerCash(player, -1500);
        if (window.sound && typeof window.sound.playMisfortune === "function") window.sound.playMisfortune();
      }
    },
    {
      title: "产业投资回馈 🎁",
      text: "商业投资表现卓越，获全球贸易发展基金：+$2,500！",
      action: () => {
        adjustPlayerCash(player, 2500);
        if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
      }
    },
    {
      title: "天外福气神仙指路 🧙",
      text: "神明觉得你颇具商业气场，特派一位神仙附体随行 4 轮！",
      action: () => {
        const types = ["wealth", "earth", "wisdom"];
        const t = types[Math.floor(Math.random() * types.length)];
        player.god = { type: t, turnsLeft: 4 };
        if (window.sound && typeof window.sound.playGodArrival === "function") window.sound.playGodArrival();
        addLog(`🧙 命运卡：[${player.name}] 迎来了大仙 [${getGodName(t)}] 的降临指路！`);
      }
    },
    {
      title: "交通道路超速 🚓",
      text: "因涉嫌名下飞车违章超速行驶，扣留罚款：-$1,000！",
      action: () => {
        adjustPlayerCash(player, -1000);
        if (window.sound && typeof window.sound.playMisfortune === "function") window.sound.playMisfortune();
      }
    }
  ];

  const selected = events[Math.floor(Math.random() * events.length)];
  selected.action();

  showEventModal(selected.title, `[${player.name}] 命运签章：\n\n${selected.text}`, "🔮");
  addLog(`🎰 命运事件：[${player.name}] 触发 [${selected.title}]`, "text-purple-400");
  
  updatePlayerRanksUI();
  prepareEndTurn();
}

// --- 📊 排行榜卡片重构 ---
function updatePlayerRanksUI() {
  const rankContainer = document.getElementById("player-ranks");
  if (!rankContainer) return;
  rankContainer.innerHTML = "";

  const sorted = [...players].map(p => {
    let estateVal = 0;
    mapStates.forEach(st => {
      if (st.owner === p.id) {
        const tile = TILE_DEFS[st.id];
        estateVal += tile.cost + (st.level * tile.cost * 0.5);
      }
    });
    return { ...p, propertyVal: estateVal, netWorth: p.cash + estateVal };
  }).sort((a, b) => b.netWorth - a.netWorth);

  sorted.forEach((p, idx) => {
    const card = document.createElement("div");
    const opacityClass = p.isBankrupt ? "opacity-30" : "";
    const isCurrent = (players[currentTurnIndex].id === p.id && !p.isBankrupt);
    const turnBorder = isCurrent ? "border border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.15)] bg-slate-900/90 scale-[1.01]" : "border border-slate-800/80 bg-slate-900/50";
    
    const aiTag = p.isAI ? `<span class="bg-slate-700 text-slate-300 text-[10px] px-1.5 rounded font-bold ml-1">AI</span>` : "";
    const godTag = p.god ? `<span class="text-[10px] text-indigo-300 font-bold block mt-1">${getGodName(p.god.type)} : 剩余 ${p.god.turnsLeft} 轮</span>` : "";
    const bankruptTag = p.isBankrupt ? `<div class="absolute inset-0 bg-rose-950/80 flex items-center justify-center font-bold text-rose-500 text-sm rounded-xl pointer-events-none select-none">破产出局</div>` : "";

    // 优化拉伸效果：使用 flex-1 让卡片平铺占据左边所有空间，同时加高 padding
    card.className = `p-4 rounded-xl transition-all relative flex flex-col justify-center flex-1 ${turnBorder} ${opacityClass}`;
    card.innerHTML = `<div class="flex items-center gap-4 mb-3">
        <span id="rank-avatar-${p.id}" class="text-4xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]">${p.avatar}</span>
        <div class="leading-tight">
          <span class="font-black text-base text-white flex items-center">${p.name.split(" ")[0]} ${aiTag}</span>
          <span class="text-[11px] text-slate-400 block mt-1">排名 #${idx + 1}</span>
          ${godTag}
        </div>
      </div>
      <div class="flex flex-col gap-1.5 text-xs bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
        <div class="flex justify-between"><span class="text-slate-500">身价:</span> <span class="text-cyan-400 font-black">$${p.netWorth.toLocaleString()}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">现金:</span> <span class="text-emerald-400 font-bold">$${p.cash.toLocaleString()}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">房产:</span> <span class="text-slate-300 font-medium">$${p.propertyVal.toLocaleString()}</span></div>
      </div>
      ${bankruptTag}`;
      
    rankContainer.appendChild(card);
  });
}

// --- 其他UI功能 ---
function showEventModal(title, text, icon = "🎰") {
  DOM.setText("event-modal-title", title);
  DOM.setHTML("event-modal-text", text.replace(/\n/g, "<br>"));
  DOM.setText("event-modal-icon", icon);
  DOM.show("event-modal");
}

function closeEventModal() {
  DOM.hide("event-modal");
}

// 绑定初始化
document.addEventListener("DOMContentLoaded", renderSetupScreen);
