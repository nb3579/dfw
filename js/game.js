/* =======================================================
   大富翁4：全球城市大地图与神仙争霸 游戏主引擎模块 js/game.js
   （完美无崩溃版、集成时时彩系统、防空隙UI排版、100%安全对象拦截）
   ======================================================= */

// --- 🛡️ 安全 DOM 包装器 (防范元素缺失导致游戏崩溃) ---
const DOM = {
  setText: (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; },
  setHTML: (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; },
  setDisabled: (id, disabled) => { const el = document.getElementById(id); if (el) el.disabled = disabled; },
  show: (id) => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); },
  hide: (id) => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); },
  addClass: (id, cls) => { const el = document.getElementById(id); if (el) el.classList.add(cls); },
  removeClass: (id, cls) => { const el = document.getElementById(id); if (el) el.classList.remove(cls); },
  setClass: (id, cls) => { const el = document.getElementById(id); if (el) el.className = cls; } // ✅ 修复 TypeError
};

// --- 游戏动态运行时状态 ---
let players = [];
let currentTurnIndex = 0;
let roundCount = 1;
let mapStates = [];
let isDiceRolling = false;
let currentPropPending = null;
let passStartBonus = 3000;

// --- 🎟️ 彩票系统数据库 ---
let lotteryPool = 5000; // 初始累积奖金
let lotteryTickets = {}; // 记录玩家本10轮购买的数字, 格式 { playerId: number }

// --- 40格环形首尾相连大地图算法参数 ---
const MAP_LENGTH = 40;
const GOD_TURNS = 5;

// --- 经典玩家模版 ---
const PLAYER_TEMPLATES = [
  { id: 'sun', name: '孙小美', avatar: '👧', color: 'bg-pink-500', textCol: 'text-pink-400' },
  { id: 'money', name: '钱夫人', avatar: '👩‍💼', color: 'bg-blue-500', textCol: 'text-blue-400' },
  { id: 'land', name: '阿土伯', avatar: '👴', color: 'bg-green-500', textCol: 'text-green-400' },
  { id: 'baby', name: '金贝贝', avatar: '👶', color: 'bg-amber-500', textCol: 'text-amber-400' }
];

// --- 85个全球名城（支持最高扩张到100格以上） ---
const GLOBAL_CITIES = [
  "北京", "东京", "纽约", "伦敦", "巴黎", "罗马", "悉尼", "柏林", "多伦多", "新加坡", 
  "迪拜", "莫斯科", "首尔", "上海", "深圳", "香港", "曼谷", "孟买", "伊斯坦堡", "里约", 
  "开普敦", "阿姆斯特丹", "日内瓦", "维也纳", "马德里", "里斯本", "斯德哥尔摩", "奥斯陆", "哥本哈根", "布鲁塞尔", 
  "雅典", "布拉格", "华沙", "布达佩斯", "基辅", "都柏林", "赫尔辛基", "雷克雅未克", "马尼拉", "雅加达", 
  "吉隆坡", "河内", "温哥华", "洛杉矶", "芝加哥", "旧金山", "波士顿", "西雅图", "迈阿密", "休斯敦", 
  "拉斯维加斯", "火奴鲁鲁", "安克拉治", "墨西哥城", "哈瓦那", "波哥大", "利马", "圣地亚哥", "布宜诺斯艾利斯", 
  "卡萨布兰卡", "内罗毕", "拉各斯", "约翰内斯堡", "奥克兰", "惠灵顿", "基督城", "大阪", "京都", "名古屋", 
  "福冈", "札幌", "台北", "高雄", "新竹", "台中", "台南", "苏黎世", "法兰克福", "慕尼黑", 
  "汉堡", "新德里", "米兰", "威尼斯", "巴塞罗那"
];

// --- 🧱 40个棋盘格子外圈环形排列算法 ---
const TILE_DEFS = [];
function generate40Tiles() {
  let cityIndex = 0;
  
  // 11x11 棋盘周长为 40 个格子 (索引0到39)
  for (let i = 0; i < MAP_LENGTH; i++) {
    let col = 1;
    let row = 1;
    
    // 首尾相连的环形坐标映射逻辑 (采用 CSS Grid 1-based 坐标值)
    if (i <= 10) {
      col = i + 1;
      row = 1;
    } else if (i > 10 && i <= 20) {
      col = 11;
      row = (i - 10) + 1;
    } else if (i > 20 && i <= 30) {
      col = 11 - (i - 20);
      row = 11;
    } else {
      col = 1;
      row = 11 - (i - 30);
    }

    let type = "LAND";
    let name = "";
    let color = "from-cyan-500 to-blue-600 font-black";
    let desc = "环球都市地产";
    let cost = 1200 + (i * 120); 
    let rent = 180 + (i * 30);   

    // 地块特性分配
    if (i === 0) {
      type = "START";
      name = "起点 🏁";
      color = "bg-red-500";
      desc = "起航奖励金发放处";
      cost = 0;
      rent = 0;
    } else if (i === 10) {
      type = "HOSPITAL";
      name = "医院 🏥";
      color = "bg-blue-600";
      desc = "需要调养，停步2回合";
      cost = 0;
      rent = 0;
    } else if (i === 20) {
      type = "PRISON";
      name = "拘留所 🚓";
      color = "bg-gray-600";
      desc = "反思改过，禁足2回合";
      cost = 0;
      rent = 0;
    } else if (i === 30) {
      type = "GOD_SHRINE";
      name = "神明庙 ⛩️";
      color = "bg-amber-600";
      desc = "烧香礼佛，买神降临";
      cost = 0;
      rent = 0;
    } else if (i === 5 || i === 15 || i === 25 || i === 35) {
      type = (i % 10 === 5) ? "CHANCE" : "DESTINY";
      name = type === "CHANCE" ? "财富机遇 🎁" : "宿命大转 🎡";
      color = "bg-purple-600";
      desc = "命运变局，未知祸福";
      cost = 0;
      rent = 0;
    } else {
      name = GLOBAL_CITIES[cityIndex] || "海外新城";
      cityIndex++;
      const colors = [
        "from-pink-500 to-pink-600 font-bold",
        "from-yellow-500 to-amber-500 font-bold",
        "from-blue-500 to-cyan-500 font-bold",
        "from-red-500 to-rose-500 font-bold",
        "from-green-500 to-emerald-500 font-bold",
        "from-purple-500 to-violet-500 font-bold"
      ];
      color = colors[i % colors.length];
    }

    TILE_DEFS.push({ id: i, col, row, name, type, cost, rent, color, desc });
  }
}
generate40Tiles();

// --- 🛠️ 界面生成与工具辅助 ---

// 1. 获取地块建筑 Emoji
function getPropertyEmoji(type, level) {
  if (type !== "LAND") {
    if (type === "START") return "🏁";
    if (type === "HOSPITAL") return "🏥";
    if (type === "PRISON") return "🚓";
    if (type === "GOD_SHRINE") return "⛩️";
    if (type === "CHANCE") return "🎁";
    if (type === "DESTINY") return "🎡";
    return "🧱";
  }
  switch (level) {
    case 0: return "🌳";
    case 1: return "🏠";
    case 2: return "🏡";
    case 3: return "🏢";
    case 4: return "🏣";
    case 5: return "🏰";
    default: return "🏠";
  }
}

// 2. 获取神明徽章 Emoji
function getGodBadgeEmoji(type) {
  if (type === "wealth") return "😇";
  if (type === "earth") return "🧙";
  if (type === "wisdom") return "🧠";
  return "✨";
}

// 3. 获取骰子点数外观
function getDiceFace(value) {
  const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  return faces[value - 1] || "🎲";
}

// 4. 计算地租 (复利公式)
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
  item.className = "p-1.5 border-b border-slate-800/40 leading-relaxed font-mono " + customClass;
  item.textContent = "[第 " + roundCount + " 轮] " + text;
  logs.appendChild(item);
  logs.scrollTop = logs.scrollHeight;
}

function clearLogs() {
  DOM.setHTML("game-logs", "");
}

// --- 初始化角色配置面板 ---
function renderSetupScreen() {
  const listContainer = document.getElementById("player-setup-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";
  
  PLAYER_TEMPLATES.forEach((tpl, index) => {
    const row = document.createElement("div");
    row.className = "flex items-center justify-between bg-slate-950/80 p-3 rounded-2xl border border-slate-800 shadow-inner";
    row.innerHTML = `<div class="flex items-center gap-3">
        <span class="text-3xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">${tpl.avatar}</span>
        <div>
          <input type="text" id="setup-name-${index}" value="${tpl.name}" class="bg-slate-900 border border-slate-800 text-white font-bold rounded-lg px-2 py-1 text-xs w-32 focus:outline-none focus:border-cyan-400">
          <span class="text-[10px] block text-slate-500 mt-1 uppercase tracking-wider">配戴色: ${tpl.name.split(' ')[0]}</span>
        </div>
      </div>
      <div class="flex gap-2">
        <label class="flex items-center gap-1 cursor-pointer">
          <input type="radio" name="setup-type-${index}" value="human" ${index === 0 ? "checked" : ""} class="accent-cyan-400">
          <span class="text-[11px] font-bold text-slate-300">玩家</span>
        </label>
        <label class="flex items-center gap-1 cursor-pointer">
          <input type="radio" name="setup-type-${index}" value="ai" ${index > 0 ? "checked" : ""} class="accent-cyan-400">
          <span class="text-[11px] font-bold text-slate-400">AI</span>
        </label>
        <label class="flex items-center gap-1 cursor-pointer">
          <input type="radio" name="setup-type-${index}" value="none" class="accent-cyan-400">
          <span class="text-[11px] font-bold text-slate-500">观战</span>
        </label>
      </div>`;
    listContainer.appendChild(row);
  });
}

// --- 💰 浮动金币增减特效 ---
function showFloatingMoney(playerId, amount) {
  if (amount === 0) return;

  // 1. 在棋盘上的棋子微章上叠加悬浮文字
  const badge = document.getElementById(`player-badge-${playerId}`);
  if (badge) {
    const rect = badge.getBoundingClientRect();
    createFloatingNode(rect.left + window.scrollX + rect.width / 2, rect.top + window.scrollY, amount);
  }

  // 2. 同时在排行榜的资产卡片头像上同步弹出
  const rankAvatar = document.getElementById(`rank-avatar-${playerId}`);
  if (rankAvatar) {
    const rect = rankAvatar.getBoundingClientRect();
    createFloatingNode(rect.left + window.scrollX + rect.width / 2, rect.top + window.scrollY, amount);
  }
}

function createFloatingNode(x, y, amount) {
  const floatDiv = document.createElement("div");
  floatDiv.className = "floating-cash " + (amount >= 0 ? "text-emerald-400" : "text-rose-500");
  floatDiv.textContent = (amount >= 0 ? "+" : "") + "$" + Math.abs(amount).toLocaleString();
  floatDiv.style.left = x + "px";
  floatDiv.style.top = y + "px";
  document.body.appendChild(floatDiv);
  
  setTimeout(() => { floatDiv.remove(); }, 1400);
}

function adjustPlayerCash(player, amount) {
  player.cash += amount;
  if (player.cash < 0) player.cash = 0;
  showFloatingMoney(player.id, amount);
  updatePlayerRanksUI();
}

// --- 游戏启动主引擎 ---
function startGame() {
  if (window.sound && typeof window.sound.init === "function") {
    window.sound.init();
  }
  
  const initCashEl = document.getElementById("init-cash");
  const startBonusEl = document.getElementById("start-bonus");
  const initCash = initCashEl ? (parseInt(initCashEl.value) || 20000) : 20000;
  passStartBonus = startBonusEl ? (parseInt(startBonusEl.value) || 3000) : 3000;

  players = [];
  PLAYER_TEMPLATES.forEach((tpl, index) => {
    const nameInput = document.getElementById(`setup-name-${index}`);
    const typeInput = document.querySelector(`input[name="setup-type-${index}"]:checked`);
    
    if (!nameInput || !typeInput) return;

    const nameVal = nameInput.value;
    const typeVal = typeInput.value;
    
    if (typeVal !== "none") {
      players.push({
        id: index,
        name: nameVal,
        avatar: tpl.avatar,
        color: tpl.color,
        textCol: tpl.textCol,
        cash: initCash,
        position: 0,
        god: null, 
        isBankrupt: false,
        isAI: typeVal === "ai",
        skipTurns: 0,
        hasExtraRoll: false 
      });
    }
  });

  if (players.length < 2) {
    alert("必须保留最少2名角色才能开始生死对决！");
    return;
  }

  mapStates = TILE_DEFS.map(tile => {
    return { id: tile.id, owner: null, level: 0 };
  });

  lotteryPool = 5000;
  lotteryTickets = {};

  DOM.hide("setup-screen");
  DOM.show("game-screen");

  renderBoard();
  updatePlayerRanksUI();

  currentTurnIndex = 0;
  roundCount = 1;
  addLog("🎬 40格环形世界城市地图拼接完毕！全球商战正式开战！", "text-cyan-400 font-bold");
  
  startPlayerTurn();
}

function renderBoard() {
  const container = document.getElementById("board-container");
  if (!container) return;
  
  const existingTiles = container.querySelectorAll(".board-tile");
  existingTiles.forEach(el => el.remove());

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
    } else if (tile.type === "START") {
      headerColor = "bg-red-500";
    } else if (tile.type === "GOD_SHRINE") {
      headerColor = "bg-amber-600";
    }

    tileDiv.className = "board-tile bg-slate-900 border border-slate-800/85 rounded-xl p-1 flex flex-col justify-between overflow-hidden shadow relative select-none cursor-pointer h-full w-full";
    tileDiv.innerHTML = `<div class="${headerColor} text-[8px] md:text-[10px] px-1 py-0.5 rounded text-center font-bold text-slate-950 shadow truncate">${tile.name}</div>
      <div class="flex-grow flex flex-col items-center justify-center relative min-h-0">
        <span id="tile-house-visual-${tile.id}" class="text-base md:text-2xl filter drop-shadow-[0_2px_4px_rgba(255,255,255,0.05)]">
          ${getPropertyEmoji(tile.type, state ? state.level : 0)}
        </span>
        <div id="tile-owner-indicator-${tile.id}" class="absolute bottom-0 text-[8px] md:text-[9px] font-black px-1 rounded shadow-lg"></div>
      </div>
      <div class="text-[8px] md:text-[9px] text-slate-500 text-center font-bold tracking-tight truncate" id="tile-footer-${tile.id}">${subText}</div>
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
    if (!tile || !tileDiv) return;

    if (tile.type !== "LAND") return;

    const ownerId = state.owner;
    const indicator = document.getElementById("tile-owner-indicator-" + state.id);
    const footer = document.getElementById("tile-footer-" + state.id);
    const houseVisual = document.getElementById("tile-house-visual-" + state.id);

    if (ownerId !== null) {
      const owner = players.find(p => p.id === ownerId);
      if (owner) {
        // 重绘边框，由于不使用股票系统，这里直接根据拥有者ID注入Tailwind色块类
        const colorHexMap = ["border-pink-500", "border-blue-500", "border-green-500", "border-amber-500"];
        const shadowMap = ["shadow-pink-500/40", "shadow-blue-500/40", "shadow-green-500/40", "shadow-amber-500/40"];
        
        tileDiv.className = `board-tile bg-slate-900 border-2 ${colorHexMap[owner.id]} rounded-xl p-1 flex flex-col justify-between overflow-hidden relative select-none cursor-pointer h-full w-full ${shadowMap[owner.id]}`;
        
        indicator.className = `absolute bottom-0 text-[8px] md:text-[9px] text-slate-950 font-black px-1.5 py-0.5 rounded bg-white shadow-lg`;
        indicator.textContent = owner.name.split(" ")[0];
        
        const finalRent = calculateRent(state.id);
        footer.innerHTML = `<span class="text-rose-400 font-extrabold">租金:$${finalRent}</span>`;
        houseVisual.textContent = getPropertyEmoji("LAND", state.level);
      }
    } else {
      tileDiv.className = "board-tile bg-slate-900 border border-slate-800/85 rounded-xl p-1 flex flex-col justify-between overflow-hidden shadow relative select-none cursor-pointer h-full w-full";
      indicator.className = "hidden";
      indicator.textContent = "";
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
      // 保证颜色绑定通过 tailwind 颜色类
      const badgeBg = p.color; // e.g. "bg-pink-500"
      pBadge.className = `w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center text-xs md:text-sm shadow-lg relative cursor-pointer ${badgeBg} ${activeClass} transition-all duration-350`;
      pBadge.innerHTML = p.avatar + (p.god ? `<span class="absolute -top-1.5 -right-1.5 text-[9px]">${getGodBadgeEmoji(p.god.type)}</span>` : "");
      holder.appendChild(pBadge);
    }
  });
}

// --- 回合循环引擎 ---
function startPlayerTurn() {
  const p = players[currentTurnIndex];

  if (p.isBankrupt) {
    nextTurn();
    return;
  }

  DOM.setText("current-player-avatar", p.avatar);
  DOM.setText("current-player-name", p.name);
  DOM.setText("round-counter", "第 " + roundCount + " 轮");

  DOM.setText("lottery-pool", "$" + lotteryPool.toLocaleString());
  DOM.setText("lottery-countdown", "开奖倒计时: " + (10 - (roundCount % 10)) + "轮");
  
  const ticket = lotteryTickets[p.id];
  DOM.setText("lottery-my-num", ticket ? (ticket + " 号") : "无");

  DOM.setDisabled("btn-end-turn", true);
  DOM.setDisabled("btn-roll", false);
  DOM.setDisabled("btn-buy-lottery", ticket ? true : false);
  
  updatePlayerPositionsUI();
  updatePlayerRanksUI();

  if (p.skipTurns > 0) {
    p.skipTurns--;
    addLog(`🏥 [${p.name}] 正在修养或禁足，无法行动（剩余回合: ${p.skipTurns}）。`, "text-slate-500");
    DOM.setText("quick-tip", `${p.name} 禁足，自动跳过回合`);
    
    DOM.setDisabled("btn-end-turn", false);
    DOM.setDisabled("btn-roll", true);

    if (p.isAI) {
      setTimeout(() => endTurn(), 1200);
    }
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
    setTimeout(() => {
      aiBuyLottery(p);
    }, 400);
  }

  if (p.isAI) {
    setTimeout(() => {
      triggerDiceRoll();
    }, 1100);
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

// --- 3D物理物理骰子驱动 ---
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
  }, 70);
}

function movePlayerStepByStep(player, steps) {
  let currentStep = 0;
  
  const moveInterval = setInterval(() => {
    player.position = (player.position + 1) % MAP_LENGTH;
    
    if (player.position === 0 && currentStep < steps - 1) {
      adjustPlayerCash(player, passStartBonus);
      addLog(`🏪 [${player.name}] 疾步路过起点，财务奖励下发：+$${passStartBonus}！`, "text-emerald-400 font-bold");
      if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
    }

    updatePlayerPositionsUI();
    currentStep++;

    if (currentStep >= steps) {
      clearInterval(moveInterval);
      evaluateLandingTile(player, player.position);
    }
  }, 180);
}

// --- 地理位置业务决断 ---
function evaluateLandingTile(player, tileId) {
  const tile = TILE_DEFS[tileId];
  const state = mapStates[tileId];

  DOM.setText("quick-tip", `停在 [${tile.name}]`);

  if (tile.type === "HOSPITAL" || tile.type === "PRISON") {
    player.skipTurns = 2;
    const reason = tile.type === "HOSPITAL" ? "需要静养 2 回合 🏥。" : "面壁思过 2 回合 🚓。";
    showEventModal("🚨 环境限行", `[${player.name}] 误入 ${tile.name}，${reason}`, "🚨");
    addLog(`🚨 [${player.name}] 触发禁足规定，本轮进入 [${tile.name}] 格子暂停 2 轮。`, "text-rose-400");
    if (window.sound && typeof window.sound.playMisfortune === "function") window.sound.playMisfortune();
    prepareEndTurn();
    return;
  }

  if (tile.type === "START") {
    adjustPlayerCash(player, passStartBonus);
    addLog(`🏪 [${player.name}] 精确踩中起点格子，财务双倍发红利：+$${passStartBonus}！`, "text-emerald-400 font-bold");
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
      addLog(`🧙 土地公作法！直接免疫付给 [${players.find(p=>p.id===state.owner)?.name}] 的通行过路费！`, "text-green-400 font-bold");
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
          addLog(`🧙 土地公作法！免费协助 [${player.name}] 的城市 [${tile.name}] 向上加盖一层庄园 (当前Lv.${state.level})！`, "text-green-400 font-bold");
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

// --- 综合资产清算核算机制 ---
function collectRentLogic(renter, ownerId, tileId) {
  const owner = players.find(p => p.id === ownerId);
  const originalRent = calculateRent(tileId);
  let finalRent = originalRent;

  if (renter.god && renter.god.type === "misfortune") {
    finalRent *= 2;
  } else if (renter.god && renter.god.type === "wealth") {
    finalRent = Math.floor(finalRent / 2);
  }

  if (owner.god && owner.god.type === "wealth") {
    finalRent *= 2;
  } else if (owner.god && owner.god.type === "misfortune") {
    finalRent = Math.floor(finalRent / 2);
  }

  addLog(`💸 [${renter.name}] 行经 [${owner.name}] 关口城市，需缴纳入城费 $${finalRent} (基础: $${originalRent})。`);
  
  if (renter.cash >= finalRent) {
    adjustPlayerCash(renter, -finalRent);
    adjustPlayerCash(owner, finalRent);
    addLog(`💰 [${renter.name}] 支付了过路费，资金已汇入对方帐户！`, "text-slate-300");
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
      
      addLog(`🏘️ 强制清盘：折价拍卖 [${tile.name}] 产权，获得变现资助资金: +$${refundPrice}`);
      updatePropertiesUI();

      if (renter.cash >= debt) {
        break;
      }
    }
  }

  if (renter.cash >= debt) {
    adjustPlayerCash(renter, -debt);
    adjustPlayerCash(creditor, debt);
    addLog(`✅ [${renter.name}] 清算结束，补齐还清通行债务，幸免于破产危机。`, "text-green-400");
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

  // ✅ 确保 setClass 不再报错
  DOM.setClass("prop-color-bar", `h-3 w-full rounded-full mb-4 bg-gradient-to-r ${tile.color}`);

  if (actionType === "buy") {
    DOM.setText("prop-title", `收购：${tile.name}`);
    DOM.setText("prop-desc", "此地块当前无人归属。购得产权后建立你的商业关卡卡口，赚取丰厚租金吧！");
    DOM.setText("prop-cost", `$${tile.cost}`);
    DOM.setText("prop-level", "空地 (Lv.0)");
    DOM.setText("prop-rent", `$${tile.rent}`);
    DOM.setText("prop-confirm-btn", "签约购买");
  } else {
    DOM.setText("prop-title", `加盖：${tile.name}`);
    DOM.setText("prop-desc", "在此投资加盖摩天豪华写字楼或私人城堡，收取翻倍暴涨的巨额租金！");
    const buildCost = Math.floor(tile.cost * 0.5);
    DOM.setText("prop-cost", `$${buildCost}`);
    DOM.setText("prop-level", `当前级别: Lv.${state.level}`);
    const nextRent = tile.rent * Math.pow(2, state.level + 1);
    DOM.setText("prop-rent", `$${nextRent} (加盖后)`);
    DOM.setText("prop-confirm-btn", "立即动工加盖");
  }

  if (player.isAI) {
    let aiDecision = false;
    const requiredCash = actionType === "buy" ? tile.cost : Math.floor(tile.cost * 0.5);
    if (player.cash >= requiredCash + 2000) {
      aiDecision = true;
    }
    setTimeout(() => {
      confirmPropertyAction(aiDecision);
    }, 1100);
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
        addLog(`🏘️ 商业扩张：[${player.name}] 斥资 $${requiredCash}，将 [${tile.name}] 收入麾下！`, "text-pink-400");
      } else {
        state.level++;
        addLog(`🏢 平地起朱楼：[${player.name}] 支付工程款 $${requiredCash}，将 [${tile.name}] 升级加建至 Lv.${state.level} 规模！`, "text-cyan-400");
      }
      if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
      updatePropertiesUI();
    } else {
      addLog(`❌ 财务紧绷：[${player.name}] 无力拨付对 [${tile.name}] 的契约资金，机会取消。`, "text-rose-400");
    }
  } else {
    addLog(`💤 [${player.name}] 战略性放弃了经营和改造 [${tile.name}] 的契机。`, "text-slate-500");
  }

  currentPropPending = null;
  prepareEndTurn();
}

// --- ⛩️ 庙宇请神控制 (10% 资产现金交易机制) ---
function promptShrineModal(player) {
  if (player.isAI) {
    const price = Math.floor(calculateNetWorth(player) * 0.1);
    if (player.cash >= price + 1000) {
      const roll = Math.random();
      if (roll > 0.6) buyGod("wisdom");
      else if (roll > 0.3) buyGod("wealth");
      else buyGod("earth");
    } else {
      addLog(`⛩️ AI [${player.name}] 在功德箱前掂量了一下口袋，决定直接步出庙宇。`);
      prepareEndTurn();
    }
    return;
  }

  const price = Math.floor(calculateNetWorth(player) * 0.1);
  DOM.setText("god-price-wealth", "$" + price.toLocaleString());
  DOM.setText("god-price-earth", "$" + price.toLocaleString());
  DOM.setText("god-price-wisdom", "$" + price.toLocaleString());

  DOM.show("shrine-modal");
}

function closeShrineModal() {
  DOM.hide("shrine-modal");
  addLog(`⛩️ [${players[currentTurnIndex].name}] 步出庙宇，未进行香火购买。`);
  prepareEndTurn();
}

function buyGod(godType) {
  DOM.hide("shrine-modal");
  const p = players[currentTurnIndex];
  const price = Math.floor(calculateNetWorth(p) * 0.1);

  if (p.cash >= price) {
    adjustPlayerCash(p, -price);
    p.god = {
      type: godType,
      turnsLeft: GOD_TURNS
    };
    
    if (window.sound && typeof window.sound.playGodArrival === "function") window.sound.playGodArrival();

    const gName = getGodName(godType);
    let desc = "";
    if (godType === "wisdom") desc = "【智慧神附体🧠】：每回合投掷骰子并行动完毕后，将额外获得一次投骰再行动机会！";
    else if (godType === "wealth") desc = "【大财神附体😇】：后续 5 个回合开始时，神明将直接降临发放现金红包！";
    else desc = "【土地公附体🧙】：后续 5 个回合内，直接免疫对手通行租金，停留在己方城市时更能免费加盖大楼！";

    showEventModal(gName + " 恩赐附体！", "恭喜 " + p.name + "，诚心供奉香火求得神仙护法护体！\n\n神明效果：" + desc, "✨");
    addLog("✨ [" + p.name + "] 迎来大仙 [" + gName + "] 全程随行庇护！支出香火钱: -$" + price, "text-yellow-400 font-bold");
  } else {
    alert("您的可用现金不足以拨付香火钱！");
    addLog(`❌ [${p.name}] 资产变现受限，无力拨付香火钱，购买神力失败。`, "text-rose-400");
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

  // 智慧神 Extra Turn 判定
  if (p.god && p.god.type === "wisdom" && !p.hasExtraRoll && !p.isBankrupt && p.skipTurns === 0) {
    p.hasExtraRoll = true; 
    addLog("🧠 智慧神显圣！【" + p.name + "】醍醐灌顶，额外获得多一次大行动权！", "text-cyan-400 font-bold");
    DOM.setText("quick-tip", "【智慧神加动】请再次掷骰！");
    DOM.setDisabled("btn-roll", false);
    DOM.setDisabled("btn-end-turn", true);

    if (p.isAI) {
      setTimeout(() => {
        triggerDiceRoll();
      }, 1200);
    }
    return;
  }

  if (p.isAI) {
    setTimeout(() => {
      endTurn();
    }, 1100);
  } else {
    DOM.setDisabled("btn-end-turn", false);
  }
}

function endTurn() {
  currentTurnIndex = (currentTurnIndex + 1) % players.length;

  if (currentTurnIndex === 0) {
    roundCount++;
    if (roundCount > 1 && (roundCount - 1) % 10 === 0) {
      drawLotteryJackpot();
    }
  }

  startPlayerTurn();
}

function nextTurn() {
  currentTurnIndex = (currentTurnIndex + 1) % players.length;
  if (currentTurnIndex === 0) {
    roundCount++;
    if (roundCount > 1 && (roundCount - 1) % 10 === 0) {
      drawLotteryJackpot();
    }
  }
  startPlayerTurn();
}

function drawLotteryJackpot() {
  const winNum = Math.floor(Math.random() * 50) + 1; 
  addLog("🎰 【时时彩开盘公告】第 " + ((roundCount-1)/10) + " 届时时彩结果开出！本期幸运中奖数字：[" + winNum + " 号]！", "text-yellow-400 font-extrabold");

  const winners = [];
  players.forEach(p => {
    if (!p.isBankrupt && lotteryTickets[p.id] === winNum) {
      winners.push(p);
    }
  });

  if (winners.length > 0) {
    const splitMoney = Math.floor(lotteryPool / winners.length);
    winners.forEach(w => {
      adjustPlayerCash(w, splitMoney);
      addLog("🎉🎉 见证神话！【" + w.name + "】福星高照撞中中奖幸运号，独揽/平分巨额累积大奖：+$" + splitMoney + "！", "text-emerald-400 font-extrabold");
    });
    
    if (window.sound && typeof window.sound.playJackpot === "function") window.sound.playJackpot();
    lotteryPool = 5000;
  } else {
    addLog("❌ 本期无财阀或 AI 买中大奖号 [" + winNum + " 号]！当期资金全部滚存并入下一轮，大奖在即！", "text-slate-400 font-bold");
    if (window.sound && typeof window.sound.playMisfortune === "function") window.sound.playMisfortune();
  }

  lotteryTickets = {};
}

// --- 命运与机遇黑天鹅卡片 ---
function triggerRandomEvent(player) {
  const events = [
    {
      title: "环球大资产税 💸",
      text: "因名下资产市值暴涨，被税务机关评估课征一笔地产建设资产税：-$1,500！",
      action: () => {
        adjustPlayerCash(player, -1500);
        if (window.sound && typeof window.sound.playMisfortune === "function") window.sound.playMisfortune();
      }
    },
    {
      title: "宏观产业投资回馈 🎁",
      text: "得益于名下商业都市投资管理表现卓越，获得全球贸易发展奖励资金：+$2,500！",
      action: () => {
        adjustPlayerCash(player, 2500);
        if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
      }
    },
    {
      title: "天外福气神仙指路 🧙",
      text: "漫步世界走廊结下仙缘，神明觉得你颇具商业气场，特派一位神仙附体随行护法 4 轮！",
      action: () => {
        const types = ["wealth", "earth", "wisdom"];
        const t = types[Math.floor(Math.random() * types.length)];
        player.god = { type: t, turnsLeft: 4 };
        if (window.sound && typeof window.sound.playGodArrival === "function") window.sound.playGodArrival();
        addLog("🧙 命运卡：[" + player.name + "] 偶然得到了大仙 [" + getGodName(t) + "] 的随行降临指路！");
      }
    },
    {
      title: "交通道路超速违章 🚓",
      text: "因涉嫌名下飞车在跨国高速公路中超速行驶，扣缴罚款扣留备用金：-$1,000！",
      action: () => {
        adjustPlayerCash(player, -1000);
        if (window.sound && typeof window.sound.playMisfortune === "function") window.sound.playMisfortune();
      }
    }
  ];

  const selected = events[Math.floor(Math.random() * events.length)];
  selected.action();

  showEventModal(selected.title, "[" + player.name + "] 命运签章：\n\n" + selected.text, "🔮");
  addLog("🎰 命运事件：[" + player.name + "] 触发卡牌 [" + selected.title + "]", "text-purple-400");
  
  updatePlayerRanksUI();
  prepareEndTurn();
}

// --- 📊 排行榜卡片 (修复填满效果) ---
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

    const netWorth = p.cash + estateVal;
    return Object.assign({}, p, { propertyVal: estateVal, netWorth: netWorth });
  }).sort((a, b) => b.netWorth - a.netWorth);

  sorted.forEach((p, idx) => {
    const card = document.createElement("div");
    const opacityClass = p.isBankrupt ? "opacity-30" : "";
    const isCurrent = (players[currentTurnIndex].id === p.id && !p.isBankrupt);
    const turnBorder = isCurrent ? "border border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.15)] bg-slate-900/90 scale-[1.01]" : "border border-slate-850 bg-slate-950/40";
    
    const aiTag = p.isAI ? '<span class="bg-slate-800 text-slate-400 text-[8px] px-1 rounded font-bold">AI</span>' : "";
    const godTag = p.god ? ('<span class="text-[9px] text-indigo-300 font-bold ml-1">' + getGodName(p.god.type) + ":" + p.god.turnsLeft + "回</span>") : "";
    const bankruptTag = p.isBankrupt ? '<div class="absolute inset-0 bg-rose-950/80 flex items-center justify-center font-bold text-rose-500 text-xs rounded-xl pointer-events-none select-none">破产出局</div>' : "";

    // 使用 flex-1 弹性拉伸填满整个排行榜栏位
    card.className = "p-3 rounded-xl transition-all relative flex flex-col justify-center flex-1 " + turnBorder + " " + opacityClass;
    card.innerHTML = 
      '<div class="flex items-center gap-2.5 mb-2">' +
        '<span id="rank-avatar-' + p.id + '" class="text-2xl filter drop-shadow-[0_0_4px_rgba(255,255,255,0.15)]">' + p.avatar + '</span>' +
        '<div class="leading-none">' +
          '<span class="font-black text-xs text-white flex items-center gap-1 truncate">' + p.name.split(" ")[0] + " " + aiTag + '</span>' +
          '<span class="text-[9px] text-slate-500 block mt-1">排名 #' + (idx + 1) + godTag + '</span>' +
        '</div>' +
      '</div>' +
      
      '<div class="flex justify-between items-end border-t border-slate-850/60 pt-1.5 mt-1 text-[10px]">' +
        '<div>' +
          '<span class="text-slate-500 block">总资产</span>' +
          '<span class="text-cyan-400 font-black">$' + p.netWorth.toLocaleString() + '</span>' +
        '</div>' +
        '<div class="text-right">' +
          '<span class="text-slate-500 block">可用现金 / 房产</span>' +
          '<span class="text-emerald-400 font-bold">$' + p.cash.toLocaleString() + '</span>' +
          '<span class="text-slate-400"> / $' + p.propertyVal.toLocaleString() + '</span>' +
        '</div>' +
      '</div>' +
      bankruptTag;
      
    rankContainer.appendChild(card);
  });
}

function checkGameOver() {
  const activePlayers = players.filter(p => !p.isBankrupt);
  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    showEventModal("👑 帝国终极之主", `恭喜 [${winner.name}] 在这场跨越四十个都市的环球大地图争霸战中，成功令所有其他财团清算破产，问鼎世界首富！`, "🏆");
    addLog(`🏆 商业对决宣告完美闭幕！大富翁荣誉头衔属于：[${winner.name}]！`, "text-yellow-400 font-bold");
    
    DOM.setDisabled("btn-roll", true);
    DOM.setDisabled("btn-end-turn", true);
  }
}

function getGodName(type) {
  if (type === "wealth") return "大财神";
  if (type === "earth") return "土地公";
  if (type === "wisdom") return "智慧神";
  return "";
}

function showEventModal(title, text, icon = "🎰") {
  DOM.setText("event-modal-title", title);
  DOM.setHTML("event-modal-text", text.replace(/\n/g, "<br>"));
  DOM.setText("event-modal-icon", icon);
  DOM.show("event-modal");
}

function closeEventModal() {
  DOM.hide("event-modal");
}

function initGameSetup() {
  renderSetupScreen();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGameSetup);
} else {
  initGameSetup();
}
