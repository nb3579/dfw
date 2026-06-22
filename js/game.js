/* =======================================================
   大富翁4：全球城市大地图与神明争霸 游戏主引擎模块js/game.js
   ======================================================= */

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

const MAP_LENGTH = 100;
const GOD_TURNS = 5;
/* 文件名: game.js
   描述: 核心游戏逻辑与状态管理
   更新日期: 2026-06-22
*/

// 【修复：将 icon 统一更正为 avatar，并补全 textCol 避免读取 undefined】
const PLAYER_TEMPLATES = [
  { id: 'sun', name: '孙小美', avatar: '👧', color: 'bg-pink-500', textCol: 'text-pink-400' },
  { id: 'money', name: '钱夫人', avatar: '👩‍💼', color: 'bg-blue-500', textCol: 'text-blue-400' },
  { id: 'land', name: '阿土伯', avatar: '👴', color: 'bg-green-500', textCol: 'text-green-400' },
  { id: 'baby', name: '金贝贝', avatar: '👶', color: 'bg-amber-500', textCol: 'text-amber-400' }
];

// --- 🛠️ 补齐缺失的核心辅助工具函数 ---

// 1. 获取房屋/地产级别或特殊格子的 Emoji 视觉标识
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
  if (type === "misfortune") return "😈";
  return "✨";
}

// 3. 获取骰子点数外观
function getDiceFace(value) {
  const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  return faces[value - 1] || "🎲";
}

// 4. 计算动态地租（随房屋等级翻倍）
function calculateRent(tileId) {
  const tile = TILE_DEFS[tileId];
  const state = mapStates[tileId];
  if (!tile || !state || tile.type !== "LAND") return 0;
  if (state.level <= 1) return tile.rent;
  return tile.rent * Math.pow(2, state.level - 1);
}

// --- 85个全球世界城市名录库 (用于填充100个格子的LAND类型) ---
const GLOBAL_CITIES = [
  "北京", "东京", "纽约", "伦敦", "巴黎", "罗马", "悉尼", "柏林", "多伦多", "新加坡", 
  "迪拜", "莫斯科", "首尔", "上海", "深圳", "香港", "曼谷", "孟买", "伊斯坦布尔", "里约", 
  "开普敦", "阿姆斯特丹", "日内瓦", "维也纳", "马德里", "里斯本", "斯德哥尔摩", "奥斯陆", "哥本哈根", "布鲁塞尔", 
  "雅典", "布拉格", "华沙", "布达佩斯", "基辅", "都屈林", "赫尔辛基", "雷克雅未克", "马尼拉", "雅加达", 
  "吉隆坡", "河内", "温哥华", "洛杉矶", "芝加哥", "旧金山", "波士顿", "西雅图", "迈阿密", "休斯敦", 
  "休斯敦", "拉斯维加斯", "火奴鲁鲁", "安克雷奇", "墨西哥城", "哈瓦那", "波哥大", "利马", "圣地亚哥", "布宜诺斯艾利斯", 
  "卡萨布兰卡", "内罗毕", "拉各斯", "约翰内斯堡", "奥克兰", "惠灵顿", "基督城", "大阪", "京都", "名古屋", 
  "福冈", "札幌", "台北", "高雄", "新竹", "台中", "台南", "苏黎世", "法兰克福", "慕尼黑", 
  "汉堡", "新德里", "米兰", "威尼斯", "巴塞罗那"
];

// --- 100个棋盘格子动态构建生成器 ---
const TILE_DEFS = [];
function generate100Tiles() {
  let cityIndex = 0;
  
  for (let i = 0; i < 100; i++) {
    let col = 0;
    let row = 0;
    
    if (i <= 25) {
      col = i;
      row = 0;
    } else if (i > 25 && i <= 49) {
      col = 25;
      row = i - 25;
    } else if (i > 49 && i <= 75) {
      col = 25 - (i - 50);
      row = 25;
    } else {
      col = 0;
      row = 25 - (i - 75);
    }

    let type = "LAND";
    let name = "";
    let color = "from-cyan-500 to-blue-600 font-black";
    let desc = "世界商业城市";
    let cost = 1000 + (i * 20); 
    let rent = 150 + (i * 5);   

    if (i === 0) {
      type = "START";
      name = "起点 🏁";
      color = "bg-red-500";
      desc = "经过此处获得奖励资金";
    } else if (i === 25) {
      type = "HOSPITAL";
      name = "医院 🏥";
      color = "bg-blue-600";
      desc = "静养 2 回合，不能掷骰";
    } else if (i === 50) {
      type = "PRISON";
      name = "拘留所 🚓";
      color = "bg-gray-600";
      desc = "面壁 2 回合，不能行动";
    } else if (i === 12 || i === 37 || i === 62 || i === 87) {
      type = "GOD_SHRINE";
      name = "神明庙 ⛩️";
      color = "bg-amber-600";
      desc = "花费 10% 资产购买随机神力";
    } else if (i === 6 || i === 18 || i === 31 || i === 44 || i === 56 || i === 68 || i === 81 || i === 93) {
      type = Math.random() > 0.5 ? "CHANCE" : "DESTINY";
      name = type === "CHANCE" ? "财富机会 🎁" : "宿命大转 🎡";
      color = "bg-purple-600";
      desc = "未知的宿命或意外收支";
    } else {
      name = GLOBAL_CITIES[cityIndex] || "新都市";
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
generate100Tiles();

// --- 初始成员设置逻辑 ---
function renderSetupScreen() {
  const listContainer = document.getElementById("player-setup-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";
  
  PLAYER_TEMPLATES.forEach((tpl, index) => {
    const row = document.createElement("div");
    row.className = "flex items-center justify-between bg-slate-950/80 p-3 rounded-2xl border border-slate-800 shadow-inner";
    row.innerHTML = '<div class="flex items-center gap-3">' +
      '<span class="text-3xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">' + tpl.avatar + '</span>' +
      '<div>' +
        '<input type="text" id="setup-name-' + index + '" value="' + tpl.name + '" class="bg-slate-900 border border-slate-800 text-white font-bold rounded-lg px-2 py-1 text-xs w-32 focus:outline-none focus:border-cyan-400">' +
        '<span class="text-[10px] block text-slate-500 mt-1 uppercase tracking-wider">COLOR: ' + tpl.name.split(' ')[0] + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="flex gap-2">' +
      '<label class="flex items-center gap-1 cursor-pointer">' +
        '<input type="radio" name="setup-type-' + index + '" value="human" ' + (index === 0 ? "checked" : "") + ' class="accent-cyan-400">' +
        '<span class="text-[11px] font-bold text-slate-300">玩家</span>' +
      '</label>' +
      '<label class="flex items-center gap-1 cursor-pointer">' +
        '<input type="radio" name="setup-type-' + index + '" value="ai" ' + (index > 0 ? "checked" : "") + ' class="accent-cyan-400">' +
        '<span class="text-[11px] font-bold text-slate-400">AI</span>' +
      '</label>' +
      '<label class="flex items-center gap-1 cursor-pointer">' +
        '<input type="radio" name="setup-type-' + index + '" value="none" class="accent-cyan-400">' +
        '<span class="text-[11px] font-bold text-slate-500">不参战</span>' +
      '</label>' +
    '</div>';
    listContainer.appendChild(row);
  });
}

// --- 💰 核心金币盈亏弹气泡引擎 ---
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
  floatDiv.className = "floating-money-node " + (amount >= 0 ? "text-emerald-400" : "text-rose-500");
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
  const initCash = initCashEl ? (parseInt(initCashEl.value) || 30000) : 30000;
  passStartBonus = startBonusEl ? (parseInt(startBonusEl.value) || 5000) : 5000;

  players = [];
  PLAYER_TEMPLATES.forEach((tpl, index) => {
    const nameInput = document.getElementById("setup-name-" + index);
    const typeInput = document.querySelector('input[name="setup-type-' + index + '"]:checked');
    
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
    alert("必须保留最少2名角色才能开始终极对决！");
    return;
  }

  mapStates = TILE_DEFS.map(tile => {
    return { id: tile.id, owner: null, level: 0 };
  });

  lotteryPool = 5000;
  lotteryTickets = {};

  document.getElementById("setup-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  renderBoard();
  updatePlayerRanksUI();

  currentTurnIndex = 0;
  roundCount = 1;
  addLog("🎬 100格城市世界大地图绘制完成！全球对战开打！", "text-cyan-400 font-bold");
  
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
    tileDiv.style.gridColumn = tile.col + 1;
    tileDiv.style.gridRow = tile.row + 1;

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

    tileDiv.className = "board-tile bg-slate-900 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between overflow-hidden shadow relative select-none";
    tileDiv.innerHTML = '<div class="' + headerColor + ' text-[10px] md:text-[11px] px-1 py-0.5 rounded-lg text-center font-bold text-slate-950 shadow-md truncate">' +
        tile.name +
      '</div>' +
      '<div class="flex-grow flex flex-col items-center justify-center my-0.5 relative">' +
        '<span id="tile-house-visual-' + tile.id + '" class="text-xl filter drop-shadow-[0_2px_4px_rgba(255,255,255,0.05)]">' +
          getPropertyEmoji(tile.type, state ? state.level : 0) +
        '</span>' +
        '<div id="tile-owner-indicator-' + tile.id + '" class="absolute bottom-0 text-[10px] font-black px-1 rounded shadow-lg"></div>' +
      '</div>' +
      '<div class="text-[9px] text-slate-500 text-center font-bold tracking-tight truncate" id="tile-footer-' + tile.id + '">' +
        subText +
      '</div>' +
      '<div id="tile-players-holder-' + tile.id + '" class="absolute inset-x-0 bottom-1 flex justify-center gap-1 flex-wrap z-10 pointer-events-none px-1"></div>';
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
        if (owner.id === 0) tileDiv.className = "board-tile bg-slate-900 neon-border-pink rounded-xl p-2 flex flex-col justify-between overflow-hidden relative select-none";
        else if (owner.id === 1) tileDiv.className = "board-tile bg-slate-900 neon-border-blue rounded-xl p-2 flex flex-col justify-between overflow-hidden relative select-none";
        else if (owner.id === 2) tileDiv.className = "board-tile bg-slate-900 neon-border-green rounded-xl p-2 flex flex-col justify-between overflow-hidden relative select-none";
        else if (owner.id === 3) tileDiv.className = "board-tile bg-slate-900 neon-border-amber rounded-xl p-2 flex flex-col justify-between overflow-hidden relative select-none";

        indicator.className = "absolute bottom-0 text-[10px] text-slate-950 font-black px-1.5 py-0.5 rounded bg-white shadow-lg";
        indicator.textContent = owner.name.split(" ")[0];
        
        const finalRent = calculateRent(state.id);
        footer.innerHTML = "<span class=\"text-rose-400 font-extrabold\">租金:$" + finalRent + "</span>";
        houseVisual.textContent = getPropertyEmoji("LAND", state.level);
      }
    } else {
      tileDiv.className = "board-tile bg-slate-900 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between overflow-hidden shadow relative select-none";
      indicator.className = "hidden";
      indicator.textContent = "";
      footer.innerHTML = "<span class=\"text-slate-500 font-bold\">地价:$" + tile.cost + "</span>";
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
      const activeClass = (players[currentTurnIndex].id === p.id) ? "animate-bounce ring-4 ring-yellow-400 z-20" : "ring-1 ring-white/50";
      pBadge.className = "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-sm sm:text-base shadow-lg relative cursor-pointer " + p.color + " " + activeClass + " transition-all duration-350";
      pBadge.innerHTML = p.avatar + (p.god ? ("<span class=\"absolute -top-1.5 -right-1.5 text-xs\">" + getGodBadgeEmoji(p.god.type) + "</span>") : "");
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

  document.getElementById("current-player-avatar").textContent = p.avatar;
  document.getElementById("current-player-name").textContent = p.name;
  document.getElementById("round-counter").textContent = "第 " + roundCount + " 轮";

  document.getElementById("lottery-pool").textContent = "$" + lotteryPool.toLocaleString();
  document.getElementById("lottery-countdown").textContent = "开奖倒计时: " + (10 - (roundCount % 10)) + "轮";
  
  const ticket = lotteryTickets[p.id];
  document.getElementById("lottery-my-num").textContent = ticket ? (ticket + " 号") : "未投注";

  document.getElementById("btn-end-turn").disabled = true;
  document.getElementById("btn-roll").disabled = false;
  document.getElementById("btn-buy-lottery").disabled = ticket ? true : false;
  
  updatePlayerPositionsUI();
  updatePlayerRanksUI();

  if (p.skipTurns > 0) {
    p.skipTurns--;
    addLog("[" + p.name + "] 强制静养禁足中，无法行动（剩余回合: " + p.skipTurns + "）。", "text-slate-500");
    document.getElementById("quick-tip").textContent = p.name + " 住院/拘留，自动跳过回合。";
    
    document.getElementById("btn-end-turn").disabled = false;
    document.getElementById("btn-roll").disabled = true;

    if (p.isAI) {
      setTimeout(() => endTurn(), 1200);
    }
    return;
  }

  p.hasExtraRoll = false;

  if (p.god) {
    p.god.turnsLeft--;
    if (p.god.turnsLeft <= 0) {
      addLog("✨ [" + p.name + "] 头顶的神仙 [" + getGodName(p.god.type) + "] 护法期满，离开。");
      p.god = null;
    } else {
      triggerGodBuffStartOfTurn(p);
    }
  }

  document.getElementById("quick-tip").textContent = "轮到 [" + p.name + "] 操作。";

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
    addLog("💰 财神显灵！天降巨额现金红包送给 [" + player.name + "]：+$" + bonus + "！", "text-yellow-400 font-bold");
    if (window.sound) window.sound.playCoin();
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

    document.getElementById("lottery-pool").textContent = "$" + lotteryPool.toLocaleString();
    document.getElementById("lottery-my-num").textContent = randomNum + " 号";
    document.getElementById("btn-buy-lottery").disabled = true;

    addLog("🎟️ [" + p.name + "] 斥资 $500 购买了彩票，投注幸运数字: [" + randomNum + " 号]！", "text-yellow-300");
    if (window.sound) window.sound.playCoin();
  } else {
    alert("你的现金不足，无法购买彩票！");
  }
}

function aiBuyLottery(aiPlayer) {
  if (aiPlayer.cash >= 1500) {
    const randomNum = Math.floor(Math.random() * 50) + 1;
    aiPlayer.cash -= 500;
    lotteryTickets[aiPlayer.id] = randomNum;
    lotteryPool += 500;
    addLog("🎟️ AI [" + aiPlayer.name + "] 自动跟投 $500 购买彩票，幸运数字: [" + randomNum + " 号]。", "text-yellow-400");
  }
}

// --- 掷骰前进机制 ---
function triggerDiceRoll() {
  if (isDiceRolling || players[currentTurnIndex].isBankrupt) return;
  
  const p = players[currentTurnIndex];
  document.getElementById("btn-roll").disabled = true;
  isDiceRolling = true;

  const diceEl = document.getElementById("dice-element");
  diceEl.classList.add("dice-rolling");
  if (window.sound) window.sound.playDice();

  let diceValue = 1;
  let counter = 0;
  const rollInterval = setInterval(() => {
    diceValue = Math.floor(Math.random() * 6) + 1;
    diceEl.textContent = getDiceFace(diceValue);
    counter++;
    if (counter > 8) {
      clearInterval(rollInterval);
      diceEl.classList.remove("dice-rolling");
      isDiceRolling = false;
      
      addLog("🎲 [" + p.name + "] 掷出了骰子，结果为 [" + diceValue + "] 点。", "text-slate-100");
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
      addLog("🏪 [" + player.name + "] 疾步路过起点，下发奖励资金：+$" + passStartBonus + "！", "text-emerald-400 font-bold");
      if (window.sound) window.sound.playCoin();
    }

    updatePlayerPositionsUI();
    currentStep++;

    if (currentStep >= steps) {
      clearInterval(moveInterval);
      evaluateLandingTile(player, player.position);
    }
  }, 160);
}

// --- 停靠地格事件判定 ---
function evaluateLandingTile(player, tileId) {
  const tile = TILE_DEFS[tileId];
  const state = mapStates[tileId];

  document.getElementById("quick-tip").textContent = "[" + player.name + "] 停靠在 [" + tile.name + "]";

  if (tile.type === "HOSPITAL" || tile.type === "PRISON") {
    player.skipTurns = 2;
    const reason = tile.type === "HOSPITAL" ? "需要静养 2 回合 🏥。" : "遭到警方拘留思过 2 回合 🚓。";
    showEventModal("🚨 环境限行", "[" + player.name + "] 进入了 " + tile.name + "，" + reason, "🚨");
    addLog("🚨 [" + player.name + "] 误入 [" + tile.name + "] 区域，本轮禁足 2 回合。", "text-red-400");
    if (window.sound) window.sound.playMisfortune();
    prepareEndTurn();
    return;
  }

  if (tile.type === "START") {
    adjustPlayerCash(player, passStartBonus);
    addLog("🏪 [" + player.name + "] 精准降落起点！下发双倍奖金：+$" + passStartBonus + "！", "text-emerald-400 font-bold");
    if (window.sound) window.sound.playCoin();
    prepareEndTurn();
    return;
  }

  if (tile.type === "GOD_SHRINE") {
    promptShrineModal(player);
    return;
  }

  if (tile.type === "LAND") {
    if (state.owner !== null && state.owner !== player.id && player.god && player.god.type === "earth") {
      addLog("🧙 土地神显灵保佑！免付对手 [" + player.name + "] 城市过路费！", "text-green-400 font-bold");
      prepareEndTurn();
      return;
    }

    if (state.owner === null) {
      if (player.god && player.god.type === "earth") {
        state.owner = player.id;
        state.level = 1;
        addLog("🧙 土地神作法！免费将无主城市 [" + tile.name + "] 划归为 [" + player.name + "] 的产业！", "text-green-400 font-bold");
        updatePropertiesUI();
        if (window.sound) window.sound.playCoin();
        prepareEndTurn();
      } else {
        promptPropertyModal(tile, state, "buy");
      }
    } else if (state.owner === player.id) {
      if (player.god && player.god.type === "earth") {
        if (state.level < 5) {
          state.level++;
          addLog("🧙 土地神赠礼！免费为 [" + player.name + "] 的城市 [" + tile.name + "] 向上加盖一层 (当前Lv." + state.level + ")！", "text-green-400 font-bold");
          updatePropertiesUI();
          if (window.sound) window.sound.playCoin();
        } else {
          addLog("🏰 [" + player.name + "] 拥有的城市 [" + tile.name + "] 已经是最高顶级庄园！");
        }
        prepareEndTurn();
      } else {
        if (state.level < 5) {
          promptPropertyModal(tile, state, "upgrade");
        } else {
          addLog("🏰 [" + player.name + "] 拥有的城市 [" + tile.name + "] 已经是最高顶级庄园！");
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

  addLog("💸 [" + renter.name + "] 行经 [" + owner.name + "] 城市的关卡，需缴纳通行费 $" + finalRent + " (基础: $" + originalRent + ")。");
  
  if (renter.cash >= finalRent) {
    adjustPlayerCash(renter, -finalRent);
    adjustPlayerCash(owner, finalRent);
    addLog("💰 [" + renter.name + "] 支付了过路费，" + owner.name + " 钞票落袋！", "text-slate-300");
    if (window.sound) window.sound.playCoin();
    prepareEndTurn();
  } else {
    triggerLiquidationToPay(renter, owner, finalRent);
  }
}

function triggerLiquidationToPay(renter, creditor, debt) {
  addLog("🚨 [" + renter.name + "] 现金不足以偿还债务，启动土地拆卖清算机制！", "text-rose-500 font-bold");
  
  for (let i = 0; i < mapStates.length; i++) {
    const state = mapStates[i];
    if (state.owner === renter.id) {
      const tile = TILE_DEFS[i];
      const refundPrice = Math.floor((tile.cost + (state.level * tile.cost * 0.5)) * 0.7);
      
      state.owner = null;
      state.level = 0;
      adjustPlayerCash(renter, refundPrice);
      
      addLog("🏘️ 强制清算：倒卖折标城市 [" + tile.name + "] 房产权，变现补偿资金: +$" + refundPrice);
      updatePropertiesUI();

      if (renter.cash >= debt) {
        break;
      }
    }
  }

  if (renter.cash >= debt) {
    adjustPlayerCash(renter, -debt);
    adjustPlayerCash(creditor, debt);
    addLog("✅ [" + renter.name + "] 资产倒卖结束，还清所有通行债务，度过破产劫难。", "text-green-400");
    prepareEndTurn();
  } else {
    declareBankruptcy(renter, creditor);
  }
}

function declareBankruptcy(player, creditor) {
  player.isBankrupt = true;
  addLog("💀 轰烈倒闭！[" + player.name + "] 所有的土地拆标售罄依然不抵债务，宣告破产出局！", "text-red-500 font-bold");
  if (window.sound) window.sound.playMisfortune();

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

// --- 🏠 地产购置 Modal 弹窗 ---
function promptPropertyModal(tile, state, actionType) {
  currentPropPending = { tile, state, actionType };
  const player = players[currentTurnIndex];

  const modal = document.getElementById("property-modal");
  const title = document.getElementById("prop-title");
  const desc = document.getElementById("prop-desc");
  const costEl = document.getElementById("prop-cost");
  const levelEl = document.getElementById("prop-level");
  const rentEl = document.getElementById("prop-rent");
  const confirmBtn = document.getElementById("prop-confirm-btn");
  const colorBar = document.getElementById("prop-color-bar");

  colorBar.className = `h-3 w-full rounded-full mb-4 bg-gradient-to-r ${tile.color}`;

  if (actionType === "buy") {
    title.textContent = `收购：${tile.name}`;
    desc.textContent = "这是一块无主土地。收购后建立你的商业关卡卡口，坐享滚滚租金！";
    costEl.textContent = `$${tile.cost}`;
    levelEl.textContent = "空地 (Lv.0)";
    rentEl.textContent = `$${tile.rent}`;
    confirmBtn.textContent = "契约购入";
  } else {
    title.textContent = `升级：${tile.name}`;
    desc.textContent = "加盖豪华酒店、摩天庄园或摩天城堡，收取几何倍翻番的巨额租金！";
    const buildCost = Math.floor(tile.cost * 0.5);
    costEl.textContent = `$${buildCost}`;
    levelEl.textContent = `当前等级: Lv.${state.level}`;
    const nextRent = tile.rent * Math.pow(2, state.level + 1);
    rentEl.textContent = `$${nextRent} (升级后)`;
    confirmBtn.textContent = "加盖大厦";
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
    modal.classList.remove("hidden");
  }
}

function confirmPropertyAction(agree) {
  const modal = document.getElementById("property-modal");
  if (modal) modal.classList.add("hidden");
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
        addLog(`🏘️ 都市扩张：[${player.name}] 砸下 $${requiredCash}，将 [${tile.name}] 的城市收归麾下！`, "text-pink-400");
      } else {
        state.level++;
        addLog(`🏢 大厦平地起：[${player.name}] 支付 $${requiredCash} 工程款，将 [${tile.name}] 盖至 Lv.${state.level} 庄园！`, "text-cyan-400");
      }
      if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
      updatePropertiesUI();
    } else {
      addLog(`❌ 财务短缺：[${player.name}] 无法拿出足够资金用于 [${tile.name}] 的契约，放弃了机会。`, "text-rose-400");
    }
  } else {
    addLog(`💤 [${player.name}] 战略性放弃了对 [${tile.name}] 地皮的运营契机。`, "text-slate-500");
  }

  currentPropPending = null;
  prepareEndTurn();
}

function promptShrineModal(player) {
  if (player.isAI) {
    const price = Math.floor(calculateNetWorth(player) * 0.1);
    if (player.cash >= price + 1000) {
      const roll = Math.random();
      if (roll > 0.6) buyGod("wisdom");
      else if (roll > 0.3) buyGod("wealth");
      else buyGod("earth");
    } else {
      addLog(`⛩️ [${player.name}] 行经神庙，盘算当前功德香火钱不划算，未作购买。`);
      prepareEndTurn();
    }
    return;
  }

  const price = Math.floor(calculateNetWorth(player) * 0.1);
  document.getElementById("god-price-wealth").textContent = "$" + price.toLocaleString();
  document.getElementById("god-price-earth").textContent = "$" + price.toLocaleString();
  document.getElementById("god-price-wisdom").textContent = "$" + price.toLocaleString();

  document.getElementById("shrine-modal").classList.remove("hidden");
}

function closeShrineModal() {
  document.getElementById("shrine-modal").classList.add("hidden");
  addLog(`⛩️ [${players[currentTurnIndex].name}] 步出神庙，没有购买香火神明。`);
  prepareEndTurn();
}

function buyGod(godType) {
  document.getElementById("shrine-modal").classList.add("hidden");
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
    if (godType === "wisdom") desc = "【智慧神附体🧠】：每回合掷骰并移动完毕后，将额外获得一次投骰子移动的权力！";
    else if (godType === "wealth") desc = "【大财神附体😇】：后续 5 回合开始时，降临大额现金红包。";
    else desc = "【土地公附体🧙】：后续 5 回合内，免疫对手地通行费，行经自地免费盖大厦。";

    showEventModal(gName + " 恩赐降临！", "恭喜 " + p.name + "，诚心香火请来神仙庇护！\n\n神明效果：" + desc, "✨");
    addLog("✨ [" + p.name + "] 邀请到了 [" + gName + "] 全程庇护！资产 10% 付出: -$" + price, "text-yellow-400 font-bold");
  } else {
    alert("你的可用现金不足以支付 10% 的香火功德金！");
    addLog(`❌ [${p.name}] 试图购买神力，但口袋里的现金香火不够，购买失败。`, "text-rose-400");
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

// --- 🎲 智慧神特权判定、10 轮开奖机制 ---
function prepareEndTurn() {
  const p = players[currentTurnIndex];
  updatePlayerRanksUI();

  if (p.god && p.god.type === "wisdom" && !p.hasExtraRoll && !p.isBankrupt && p.skipTurns === 0) {
    p.hasExtraRoll = true; 
    addLog("🧠 智慧神开启大智慧！【" + p.name + "】被恩赐额外多一次大行动回合！", "text-cyan-400 font-bold");
    document.getElementById("quick-tip").textContent = "【智慧神再赐一动】请 " + p.name + " 再次掷骰！";
    document.getElementById("btn-roll").disabled = false;
    document.getElementById("btn-end-turn").disabled = true;

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
    document.getElementById("btn-end-turn").disabled = false;
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
  addLog("🎰 【环球时时彩中心】第 " + ((roundCount-1)/10) + " 届时时彩开盘了！当期中奖幸运数字为：[" + winNum + " 号]！", "text-yellow-400 font-extrabold");

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
      addLog("🎉🎉 恭喜神算中彩者！【" + w.name + "】买中当期中奖幸运号，独吞/均分当期累积巨款：+$" + splitMoney + "！", "text-emerald-400 font-extrabold");
    });
    
    if (window.sound && typeof window.sound.playJackpot === "function") window.sound.playJackpot();
    lotteryPool = 5000;
  } else {
    addLog("❌ 本届无任何玩家和 AI 撞中大奖数字 [" + winNum + " 号]！当期奖金滚滚并入下期！累计大奖爆发在即！", "text-slate-400 font-bold");
    if (window.sound && typeof window.sound.playMisfortune === "function") window.sound.playMisfortune();
  }

  lotteryTickets = {};
}

function triggerRandomEvent(player) {
  const events = [
    {
      title: "环球大资产税 💸",
      text: "因名下资产估价攀升，被国税机关按现总资产强制课税：-$1,500！",
      action: () => {
        adjustPlayerCash(player, -1500);
        if (window.sound) window.sound.playMisfortune();
      }
    },
    {
      title: "宏观产业投资回馈 🎁",
      text: "因为名下商业拓展出色，获得产业回馈：+$2,500！",
      action: () => {
        adjustPlayerCash(player, 2500);
        if (window.sound) window.sound.playCoin();
      }
    },
    {
      title: "天外福气神仙指路 🧙",
      text: "漫步世界走廊，神明觉得你颇具慧根，立刻赠与你一位神仙贴身附体护法 4 轮！",
      action: () => {
        const types = ["wealth", "earth", "wisdom"];
        const t = types[Math.floor(Math.random() * types.length)];
        player.god = { type: t, turnsLeft: 4 };
        if (window.sound && typeof window.sound.playGodArrival === "function") window.sound.playGodArrival();
        addLog("🧙 命运之手：[" + player.name + "] 随机得到了 [" + getGodName(t) + "] 的随行护法！");
      }
    },
    {
      title: "交通道路超速违章 🚓",
      text: "由于你的私人飞车在世界街头超速疾驰，被全网通缉扣押款项：-$1,000！",
      action: () => {
        adjustPlayerCash(player, -1000);
        if (window.sound) window.sound.playMisfortune();
      }
    }
  ];

  const selected = events[Math.floor(Math.random() * events.length)];
  selected.action();

  showEventModal(selected.title, "[" + player.name + "] 命运签纸：\n\n" + selected.text, "🔮");
  addLog("🎰 命运结果：[" + player.name + "] 抽中卡片 [" + selected.title + "]", "text-purple-400");
  
  updatePlayerRanksUI();
  prepareEndTurn();
}

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
    const godTag = p.god ? ('<span class="text-[9px] text-indigo-300 font-bold">' + getGodName(p.god.type) + ":" + p.god.turnsLeft + "r</span>") : "";
    const bankruptTag = p.isBankrupt ? '<div class="absolute inset-0 bg-rose-950/80 flex items-center justify-center font-bold text-rose-500 text-xs rounded-xl pointer-events-none select-none">破产</div>' : "";

    card.className = "p-2.5 rounded-xl transition-all relative flex flex-col justify-between h-[65px] " + turnBorder + " " + opacityClass;
    card.innerHTML = '<div class="flex items-center justify-between">' +
        '<div class="flex items-center gap-1.5">' +
          '<span id="rank-avatar-' + p.id + '" class="text-xl filter drop-shadow-[0_0_4px_rgba(255,255,255,0.15)]">' + p.avatar + '</span>' +
          '<div class="leading-none">' +
            '<span class="font-black text-[10px] text-white flex items-center gap-1">' + p.name.split(" ")[0] + " " + aiTag + '</span>' +
            '<span class="text-[9px] text-slate-500">#' + (idx + 1) + '</span>' +
          '</div>' +
        '</div>' +
        godTag +
      '</div>' +
      '<div class="flex justify-between items-end border-t border-slate-850/60 pt-1 mt-1 text-[9px]">' +
        '<div>' +
          '<span class="text-slate-500 block">总身价</span>' +
          '<span class="text-cyan-400 font-extrabold">$' + p.netWorth.toLocaleString() + '</span>' +
        '</div>' +
        '<div class="text-right">' +
          '<span class="text-slate-500 block">拥有现金</span>' +
          '<span class="text-slate-200 font-bold">$' + p.cash.toLocaleString() + '</span>' +
        '</div>' +
        '<div class="text-right">' +
          '<span class="text-slate-500 block">城市房产</span>' +
          '<span class="text-slate-400 font-medium">$' + p.propertyVal.toLocaleString() + '</span>' +
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
    showEventModal("👑 帝国终极之主", `恭喜 [${winner.name}] 在这场跨越百个都市的环球大富翁大地图争霸战中，令所有财阀破产，问鼎世界首富！`, "🏆");
    addLog(`🏆 争霸战宣告结束！环球首富头衔属于：[${winner.name}]！`, "text-yellow-400 font-bold");
    
    document.getElementById("btn-roll").disabled = true;
    document.getElementById("btn-end-turn").disabled = true;
  }
}

function getGodName(type) {
  if (type === "wealth") return "大财神";
  if (type === "earth") return "土地公";
  if (type === "wisdom") return "智慧神";
  return "";
}

function addLog(text, customClass = "text-slate-300") {
  const logs = document.getElementById("game-logs");
  if (!logs) return;
  const item = document.createElement("div");
  item.className = "p-1 border-b border-slate-800/40 leading-relaxed font-mono " + customClass;
  item.textContent = "[第 " + roundCount + " 轮] " + text;
  logs.appendChild(item);
  logs.scrollTop = logs.scrollHeight;
}

function clearLogs() {
  const logs = document.getElementById("game-logs");
  if (logs) logs.innerHTML = "";
}

function showEventModal(title, text, icon = "🎰") {
  const modal = document.getElementById("event-modal");
  const modalTitle = document.getElementById("event-modal-title");
  const modalText = document.getElementById("event-modal-text");
  const modalIcon = document.getElementById("event-modal-icon");
  if (!modal || !modalTitle || !modalText || !modalIcon) return;
  
  modalTitle.textContent = title;
  modalText.innerHTML = text.replace(/\n/g, "<br>");
  modalIcon.textContent = icon;
  modal.classList.remove("hidden");
}

function closeEventModal() {
  const modal = document.getElementById("event-modal");
  if (modal) modal.classList.add("hidden");
}

function initGameSetup() {
  renderSetupScreen();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGameSetup);
} else {
  initGameSetup();
}
