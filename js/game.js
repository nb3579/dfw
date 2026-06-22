/* =======================================================
   大富翁4：全球城市大地圖與神明爭霸 遊戲主引擎模組 js/game.js
   ======================================================= */

// --- 遊戲動態運行時狀態 ---
let players = [];
let currentTurnIndex = 0;
let roundCount = 1;
let mapStates = [];
let isDiceRolling = false;
let currentPropPending = null;
let passStartBonus = 3000;

// --- 🎟️ 彩票系統資料庫 ---
let lotteryPool = 5000; // 初始累積獎金
let lotteryTickets = {}; // 記錄玩家本10輪購買的數字, 格式 { playerId: number }

// --- 40格環形首尾相連大地圖算法參數 ---
const MAP_LENGTH = 40;
const GOD_TURNS = 5;

// 定義經典的玩家模版
const PLAYER_TEMPLATES = [
  { id: 'sun', name: '孫小美', avatar: '👧', color: 'bg-pink-500', textCol: 'text-pink-400' },
  { id: 'money', name: '錢夫人', avatar: '👩‍💼', color: 'bg-blue-500', textCol: 'text-blue-400' },
  { id: 'land', name: '阿土伯', avatar: '👴', color: 'bg-green-500', textCol: 'text-green-400' },
  { id: 'baby', name: '金貝貝', avatar: '👶', color: 'bg-amber-500', textCol: 'text-amber-400' }
];

// --- 🛠️ 工具輔助函數 ---

// 1. 獲取地塊建築 Emoji
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

// 2. 獲取神明徽章 Emoji
function getGodBadgeEmoji(type) {
  if (type === "wealth") return "😇";
  if (type === "earth") return "🧙";
  if (type === "wisdom") return "🧠";
  return "✨";
}

// 3. 獲取骰子點數外觀
function getDiceFace(value) {
  const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  return faces[value - 1] || "🎲";
}

// 4. 計算地租
function calculateRent(tileId) {
  const tile = TILE_DEFS[tileId];
  const state = mapStates[tileId];
  if (!tile || !state || tile.type !== "LAND") return 0;
  if (state.level <= 1) return tile.rent;
  return tile.rent * Math.pow(2, state.level - 1);
}

// --- 85個全球名城（繁體中文） ---
const GLOBAL_CITIES = [
  "北京", "東京", "紐約", "倫敦", "巴黎", "羅馬", "悉尼", "柏林", "多倫多", "新加坡", 
  "迪拜", "莫斯科", "首爾", "上海", "深圳", "香港", "曼谷", "孟買", "伊斯坦堡", "里約", 
  "開普敦", "阿姆斯特丹", "日內瓦", "維也納", "馬德里", "里斯本", "斯德哥爾摩", "奧斯陸", "哥本哈根", "布魯塞爾", 
  "雅典", "布拉格", "華沙", "布達佩斯", "基輔", "都決林", "赫爾辛基", "雷克雅未克", "馬尼拉", "雅加達", 
  "吉隆坡", "河內", "溫哥華", "洛杉磯", "芝加哥", "舊金山", "波士頓", "西雅圖", "邁阿密", "休斯敦", 
  "拉斯維加斯", "火奴魯魯", "安克拉治", "墨西哥城", "哈瓦那", "波哥大", "利馬", "聖地亞哥", "布宜諾斯艾利斯", 
  "卡薩布蘭卡", "奈洛比", "拉哥斯", "約翰尼斯堡", "奧克蘭", "威靈頓", "基督城", "大阪", "京都", "名古屋", 
  "福岡", "札幌", "台北", "高雄", "新竹", "台中", "台南", "蘇黎世", "法蘭克福", "慕尼黑", 
  "漢堡", "新德里", "米蘭", "威尼斯", "巴塞隆納"
];

// --- 🧱 40個棋盤格子外圈環形排列算法 ---
const TILE_DEFS = [];
function generate40Tiles() {
  let cityIndex = 0;
  
  // 11x11 棋盤周長為 40 個格子 (索引0到39)
  for (let i = 0; i < MAP_LENGTH; i++) {
    let col = 1;
    let row = 1;
    
    // 首尾相連的環形座標映射邏輯 (採用 CSS Grid 1-based 座標值)
    if (i <= 10) {
      // 頂邊：行 = 1，列 = 1 至 11
      col = i + 1;
      row = 1;
    } else if (i > 10 && i <= 20) {
      // 右邊：列 = 11，行 = 2 至 11
      col = 11;
      row = (i - 10) + 1;
    } else if (i > 20 && i <= 30) {
      // 底邊：行 = 11，列 = 10 倒退回 1
      col = 11 - (i - 20);
      row = 11;
    } else {
      // 左邊：列 = 1，行 = 10 倒退回 2
      col = 1;
      row = 11 - (i - 30);
    }

    let type = "LAND";
    let name = "";
    let color = "from-cyan-500 to-blue-600 font-black";
    let desc = "環球都市地產";
    let cost = 1200 + (i * 120); 
    let rent = 180 + (i * 30);   

    // 地塊特性分配
    if (i === 0) {
      type = "START";
      name = "起點 🏁";
      color = "bg-red-500";
      desc = "起航獎勵金發放處";
    } else if (i === 10) {
      type = "HOSPITAL";
      name = "醫院 🏥";
      color = "bg-blue-600";
      desc = "需要調養，停步2回合";
    } else if (i === 20) {
      type = "PRISON";
      name = "拘留所 🚓";
      color = "bg-gray-600";
      desc = "反思改過，禁足2回合";
    } else if (i === 30) {
      type = "GOD_SHRINE";
      name = "神明廟 ⛩️";
      color = "bg-amber-600";
      desc = "燒香禮佛，請神降臨";
    } else if (i === 5 || i === 15 || i === 25 || i === 35) {
      type = (i % 10 === 5) ? "CHANCE" : "DESTINY";
      name = type === "CHANCE" ? "財富機會 🎁" : "宿命大轉 🎡";
      color = "bg-purple-600";
      desc = "命運變局，未知禍福";
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

// --- 初始化角色配置面板 ---
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
        '<span class="text-[10px] block text-slate-500 mt-1 uppercase tracking-wider">配戴色: ' + tpl.name + '</span>' +
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
        '<span class="text-[11px] font-bold text-slate-500">觀戰</span>' +
      '</label>' +
    '</div>';
    listContainer.appendChild(row);
  });
}

// --- 💰 浮動金幣增減特效 ---
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
  floatDiv.className = "floating-money-node " + (amount >= 0 ? "money-gain" : "money-loss");
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

// --- 遊戲啟動主引擎 ---
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
    alert("必須保留最少2名角色才能開始生死對決！");
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
  addLog("🎬 40格環形世界城市地圖拼接完畢！全球商戰正式開戰！", "text-cyan-400 font-bold");
  
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
    tileDiv.innerHTML = '<div class="' + headerColor + ' text-[9px] md:text-[10px] px-1 py-0.5 rounded text-center font-bold text-slate-950 shadow truncate">' +
        tile.name +
      '</div>' +
      '<div class="flex-grow flex flex-col items-center justify-center relative min-h-0">' +
        '<span id="tile-house-visual-' + tile.id + '" class="text-base md:text-2xl filter drop-shadow-[0_2px_4px_rgba(255,255,255,0.05)]">' +
          getPropertyEmoji(tile.type, state ? state.level : 0) +
        '</span>' +
        '<div id="tile-owner-indicator-' + tile.id + '" class="absolute bottom-0 text-[8px] md:text-[9px] font-black px-1 rounded shadow-lg"></div>' +
      '</div>' +
      '<div class="text-[8px] md:text-[9px] text-slate-500 text-center font-bold tracking-tight truncate" id="tile-footer-' + tile.id + '">' +
        subText +
      '</div>' +
      '<div id="tile-players-holder-' + tile.id + '" class="absolute inset-x-0 bottom-0.5 flex justify-center gap-0.5 flex-wrap z-10 pointer-events-none px-1"></div>';
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
        if (owner.id === 0) tileDiv.className = "board-tile bg-slate-900 neon-border-pink rounded-xl p-1 flex flex-col justify-between overflow-hidden relative select-none cursor-pointer h-full w-full";
        else if (owner.id === 1) tileDiv.className = "board-tile bg-slate-900 neon-border-blue rounded-xl p-1 flex flex-col justify-between overflow-hidden relative select-none cursor-pointer h-full w-full";
        else if (owner.id === 2) tileDiv.className = "board-tile bg-slate-900 neon-border-green rounded-xl p-1 flex flex-col justify-between overflow-hidden relative select-none cursor-pointer h-full w-full";
        else if (owner.id === 3) tileDiv.className = "board-tile bg-slate-900 neon-border-amber rounded-xl p-1 flex flex-col justify-between overflow-hidden relative select-none cursor-pointer h-full w-full";

        indicator.className = "absolute bottom-0 text-[8px] md:text-[9px] text-slate-950 font-black px-1.5 py-0.5 rounded bg-white shadow-lg";
        indicator.textContent = owner.name.split(" ")[0];
        
        const finalRent = calculateRent(state.id);
        footer.innerHTML = "<span class=\"text-rose-400 font-extrabold\">租金:$" + finalRent + "</span>";
        houseVisual.textContent = getPropertyEmoji("LAND", state.level);
      }
    } else {
      tileDiv.className = "board-tile bg-slate-900 border border-slate-800/85 rounded-xl p-1 flex flex-col justify-between overflow-hidden shadow relative select-none cursor-pointer h-full w-full";
      indicator.className = "hidden";
      indicator.textContent = "";
      footer.innerHTML = "<span class=\"text-slate-500 font-bold\">地價:$" + tile.cost + "</span>";
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
      pBadge.className = "w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center text-xs md:text-sm shadow-lg relative cursor-pointer " + p.color + " " + activeClass + " transition-all duration-350";
      pBadge.innerHTML = p.avatar + (p.god ? ("<span class=\"absolute -top-1.5 -right-1.5 text-[9px]\">" + getGodBadgeEmoji(p.god.type) + "</span>") : "");
      holder.appendChild(pBadge);
    }
  });
}

// --- 回合循環引擎 ---
function startPlayerTurn() {
  const p = players[currentTurnIndex];

  if (p.isBankrupt) {
    nextTurn();
    return;
  }

  document.getElementById("current-player-avatar").textContent = p.avatar;
  document.getElementById("current-player-name").textContent = p.name;
  document.getElementById("round-counter").textContent = "第 " + roundCount + " 輪";

  document.getElementById("lottery-pool").textContent = "$" + lotteryPool.toLocaleString();
  document.getElementById("lottery-countdown").textContent = "開獎倒計時: " + (10 - (roundCount % 10)) + "輪";
  
  const ticket = lotteryTickets[p.id];
  document.getElementById("lottery-my-num").textContent = ticket ? (ticket + " 號") : "無";

  document.getElementById("btn-end-turn").disabled = true;
  document.getElementById("btn-roll").disabled = false;
  document.getElementById("btn-buy-lottery").disabled = ticket ? true : false;
  
  updatePlayerPositionsUI();
  updatePlayerRanksUI();

  if (p.skipTurns > 0) {
    p.skipTurns--;
    addLog("[" + p.name + "] 靜養禁足中，無法行動（剩餘: " + p.skipTurns + " 回合）。", "text-slate-500");
    document.getElementById("quick-tip").textContent = p.name + " 禁足，自動跳過回合";
    
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
      addLog("✨ [" + p.name + "] 附身神仙 [" + getGodName(p.god.type) + "] 護法期滿，返回仙界。");
      p.god = null;
    } else {
      triggerGodBuffStartOfTurn(p);
    }
  }

  document.getElementById("quick-tip").textContent = "準備擲骰子";

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
    addLog("💰 大財神顯靈！天降紅包送給 [" + player.name + "]：+$" + bonus + "！", "text-yellow-400 font-bold");
    if (window.sound) window.sound.playCoin();
  }
}

// --- 🎟️ 彩票購買機制 ---
function buyLotteryTicket() {
  const p = players[currentTurnIndex];
  if (p.isBankrupt || lotteryTickets[p.id]) return;

  if (p.cash >= 500) {
    const randomNum = Math.floor(Math.random() * 50) + 1; 
    adjustPlayerCash(p, -500);
    lotteryTickets[p.id] = randomNum;
    lotteryPool += 500;

    document.getElementById("lottery-pool").textContent = "$" + lotteryPool.toLocaleString();
    document.getElementById("lottery-my-num").textContent = randomNum + " 號";
    document.getElementById("btn-buy-lottery").disabled = true;

    addLog("🎟️ [" + p.name + "] 購入時時彩，投注幸運數：[" + randomNum + " 號]！", "text-yellow-300");
    if (window.sound) window.sound.playCoin();
  } else {
    alert("您的可用現金不足以投注購買彩票！");
  }
}

function aiBuyLottery(aiPlayer) {
  if (aiPlayer.cash >= 1500) {
    const randomNum = Math.floor(Math.random() * 50) + 1;
    aiPlayer.cash -= 500;
    lotteryTickets[aiPlayer.id] = randomNum;
    lotteryPool += 500;
    addLog("🎟️ AI [" + aiPlayer.name + "] 投注購買彩票，幸運數字: [" + randomNum + " 號]。", "text-yellow-400");
  }
}

// --- 擲骰前进机制 ---
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
      
      addLog("🎲 [" + p.name + "] 擲出了 [" + diceValue + "] 點前進！", "text-slate-100");
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
      addLog("🏪 [" + player.name + "] 路過起點，領取周轉獎勵金：+$" + passStartBonus + "！", "text-emerald-400 font-bold");
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

// --- 地格停靠判定 ---
function evaluateLandingTile(player, tileId) {
  const tile = TILE_DEFS[tileId];
  const state = mapStates[tileId];

  document.getElementById("quick-tip").textContent = "停在 [" + tile.name + "]";

  if (tile.type === "HOSPITAL" || tile.type === "PRISON") {
    player.skipTurns = 2;
    const reason = tile.type === "HOSPITAL" ? "醫院靜養 2 回合 🏥。" : "拘留所禁足 2 回合 🚓。";
    showEventModal("🚨 限制狀態", "[" + player.name + "] 進入了 " + tile.name + "，" + reason, "🚨");
    addLog("🚨 [" + player.name + "] 停靠在 [" + tile.name + "]，本輪起禁足 2 回合。", "text-red-400");
    if (window.sound) window.sound.playMisfortune();
    prepareEndTurn();
    return;
  }

  if (tile.type === "START") {
    adjustPlayerCash(player, passStartBonus);
    addLog("🏪 [" + player.name + "] 精確降落起點！下發雙倍獎金：+$" + passStartBonus + "！", "text-emerald-400 font-bold");
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
      addLog("🧙 土地公作法！直接免疫付給 [" + player.name + "] 的通行過路費！", "text-green-400 font-bold");
      prepareEndTurn();
      return;
    }

    if (state.owner === null) {
      if (player.god && player.god.type === "earth") {
        state.owner = player.id;
        state.level = 1;
        addLog("🧙 土地公作法！免費將無主都市 [" + tile.name + "] 贈予並契約劃歸 [" + player.name + "]！", "text-green-400 font-bold");
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
          addLog("🧙 土地公作法！免費協助 [" + player.name + "] 的城市 [" + tile.name + "] 向上加蓋一層莊園 (當前Lv." + state.level + ")！", "text-green-400 font-bold");
          updatePropertiesUI();
          if (window.sound) window.sound.playCoin();
        } else {
          addLog("🏰 [" + player.name + "] 的城市 [" + tile.name + "] 已經是最高頂級莊園！");
        }
        prepareEndTurn();
      } else {
        if (state.level < 5) {
          promptPropertyModal(tile, state, "upgrade");
        } else {
          addLog("🏰 [" + player.name + "] 的城市 [" + tile.name + "] 已經是最高頂級莊園！");
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

  addLog("💸 [" + renter.name + "] 行經 [" + owner.name + "] 關口城市，需繳納通行費 $" + finalRent + " (基礎: $" + originalRent + ")。");
  
  if (renter.cash >= finalRent) {
    adjustPlayerCash(renter, -finalRent);
    adjustPlayerCash(owner, finalRent);
    addLog("💰 [" + renter.name + "] 支付了過路費，資金已匯入對方帳戶！", "text-slate-300");
    if (window.sound) window.sound.playCoin();
    prepareEndTurn();
  } else {
    triggerLiquidationToPay(renter, owner, finalRent);
  }
}

function triggerLiquidationToPay(renter, creditor, debt) {
  addLog("🚨 [" + renter.name + "] 現金見底，啟動城市房產權低價拆賣清算機制自救！", "text-rose-500 font-bold");
  
  for (let i = 0; i < mapStates.length; i++) {
    const state = mapStates[i];
    if (state.owner === renter.id) {
      const tile = TILE_DEFS[i];
      const refundPrice = Math.floor((tile.cost + (state.level * tile.cost * 0.5)) * 0.7);
      
      state.owner = null;
      state.level = 0;
      adjustPlayerCash(renter, refundPrice);
      
      addLog("🏘️ 強制清盤：折標倒賣 [" + tile.name + "] 產權，獲得變現資助資金: +$" + refundPrice);
      updatePropertiesUI();

      if (renter.cash >= debt) {
        break;
      }
    }
  }

  if (renter.cash >= debt) {
    adjustPlayerCash(renter, -debt);
    adjustPlayerCash(creditor, debt);
    addLog("✅ [" + renter.name + "] 清算結束，補齊還清通行債務，幸免於破產危機。", "text-green-400");
    prepareEndTurn();
  } else {
    declareBankruptcy(renter, creditor);
  }
}

function declareBankruptcy(player, creditor) {
  player.isBankrupt = true;
  addLog("💀 資本巨艦隕落！[" + player.name + "] 土地售罄仍資不抵債，正式宣告破產出局！", "text-red-500 font-bold");
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

// --- 🏠 地產購置 / 加蓋 彈窗 ---
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
    title.textContent = `收購：${tile.name}`;
    desc.textContent = "此地塊當前無人歸屬。購得產權後建立你的商業關卡卡口，賺取豐厚租金吧！";
    costEl.textContent = `$${tile.cost}`;
    levelEl.textContent = "空地 (Lv.0)";
    rentEl.textContent = `$${tile.rent}`;
    confirmBtn.textContent = "簽約契約購入";
  } else {
    title.textContent = `加蓋：${tile.name}`;
    desc.textContent = "在此投資加蓋摩天豪華寫字樓或私人城堡，收取翻倍暴漲的巨額租金！";
    const buildCost = Math.floor(tile.cost * 0.5);
    costEl.textContent = `$${buildCost}`;
    levelEl.textContent = `當前級別: Lv.${state.level}`;
    const nextRent = tile.rent * Math.pow(2, state.level + 1);
    rentEl.textContent = `$${nextRent} (加蓋後)`;
    confirmBtn.textContent = "立即動工加蓋";
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
        addLog(`🏘️ 商業擴張：[${player.name}] 斥資 $${requiredCash}，將 [${tile.name}] 收入麾下！`, "text-pink-400");
      } else {
        state.level++;
        addLog(`🏢 平地起朱樓：[${player.name}] 支付工程款 $${requiredCash}，將 [${tile.name}] 升級加建至 Lv.${state.level} 規模！`, "text-cyan-400");
      }
      if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
      updatePropertiesUI();
    } else {
      addLog(`❌ 財務緊繃：[${player.name}] 無力撥付對 [${tile.name}] 的契約資金，機會取消。`, "text-rose-400");
    }
  } else {
    addLog(`💤 [${player.name}] 戰略性放棄了經營和改造 [${tile.name}] 的契機。`, "text-slate-500");
  }

  currentPropPending = null;
  prepareEndTurn();
}

// --- ⛩️ 廟宇請神控制 ---
function promptShrineModal(player) {
  if (player.isAI) {
    const price = Math.floor(calculateNetWorth(player) * 0.1);
    if (player.cash >= price + 1000) {
      const roll = Math.random();
      if (roll > 0.6) buyGod("wisdom");
      else if (roll > 0.3) buyGod("wealth");
      else buyGod("earth");
    } else {
      addLog(`⛩️ AI [${player.name}] 在功德箱前掂量了一下口袋，決定直接步出廟宇。`);
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
  addLog(`⛩️ [${players[currentTurnIndex].name}] 步出廟宇，未進行香火購買。`);
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
    if (godType === "wisdom") desc = "【智慧神附體🧠】：每回合投擲骰子並行動完畢後，將額外獲得一次投骰再行動機會！";
    else if (godType === "wealth") desc = "【大財神附體😇】：後續 5 個回合開始時，神明將直接降臨發放現金紅包！";
    else desc = "【土地公附體🧙】：後續 5 個回合內，直接免疫對手通行租金，停留在己方城市時更能免費加蓋大樓！";

    showEventModal(gName + " 恩賜附體！", "恭喜 " + p.name + "，誠心供奉香火求得神仙護法護體！\n\n神明效果：" + desc, "✨");
    addLog("✨ [" + p.name + "] 迎來大仙 [" + gName + "] 全程隨行庇護！支出香火錢: -$" + price, "text-yellow-400 font-bold");
  } else {
    alert("您的可用現金不足以撥付香火錢！");
    addLog(`❌ [${p.name}] 資產變現受限，無力撥付香火錢，購買神力失敗。`, "text-rose-400");
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

// --- 🧠 智慧神特權判定、回合終結 ---
function prepareEndTurn() {
  const p = players[currentTurnIndex];
  updatePlayerRanksUI();

  if (p.god && p.god.type === "wisdom" && !p.hasExtraRoll && !p.isBankrupt && p.skipTurns === 0) {
    p.hasExtraRoll = true; 
    addLog("🧠 智慧神顯聖！【" + p.name + "】醍醐灌頂，額外獲得多一次大行動權！", "text-cyan-400 font-bold");
    document.getElementById("quick-tip").textContent = "【智慧神加動】請再次擲骰！";
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
  addLog("🎰 【時時彩開盤公告】第 " + ((roundCount-1)/10) + " 屆時時彩結果開出！本期幸運中獎數字：[" + winNum + " 號]！", "text-yellow-400 font-extrabold");

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
      addLog("🎉🎉 見證神話！【" + w.name + "】福星高照撞中中獎幸運號，獨攬/平分巨額累積大獎：+$" + splitMoney + "！", "text-emerald-400 font-extrabold");
    });
    
    if (window.sound && typeof window.sound.playJackpot === "function") window.sound.playJackpot();
    lotteryPool = 5000;
  } else {
    addLog("❌ 本期無財閥或 AI 買中大獎號 [" + winNum + " 號]！當期資金全部滾存併入下一輪，大獎在即！", "text-slate-400 font-bold");
    if (window.sound && typeof window.sound.playMisfortune === "function") window.sound.playMisfortune();
  }

  lotteryTickets = {};
}

// --- 命運與機遇黑天鵝卡片 ---
function triggerRandomEvent(player) {
  const events = [
    {
      title: "環球大資產稅 💸",
      text: "因名下資產市值暴漲，被稅務機關評估課徵一筆地產建設資產稅：-$1,500！",
      action: () => {
        adjustPlayerCash(player, -1500);
        if (window.sound) window.sound.playMisfortune();
      }
    },
    {
      title: "宏觀產業投資回饋 🎁",
      text: "得益於名下商業都市投資管理表現卓越，獲得全球貿易發展獎勵資金：+$2,500！",
      action: () => {
        adjustPlayerCash(player, 2500);
        if (window.sound) window.sound.playCoin();
      }
    },
    {
      title: "天外福氣神仙指路 🧙",
      text: "漫步世界走廊結下仙緣，神明覺得你頗具商業氣場，特派一位神仙附體隨行護法 4 輪！",
      action: () => {
        const types = ["wealth", "earth", "wisdom"];
        const t = types[Math.floor(Math.random() * types.length)];
        player.god = { type: t, turnsLeft: 4 };
        if (window.sound && typeof window.sound.playGodArrival === "function") window.sound.playGodArrival();
        addLog("🧙 命運卡：[" + player.name + "] 偶然得到了大仙 [" + getGodName(t) + "] 的隨行降臨指路！");
      }
    },
    {
      title: "交通道路超速違章 🚓",
      text: "因涉嫌名下飛車在跨國高速公路中超速行駛，扣繳罰款扣留備用金：-$1,000！",
      action: () => {
        adjustPlayerCash(player, -1000);
        if (window.sound) window.sound.playMisfortune();
      }
    }
  ];

  const selected = events[Math.floor(Math.random() * events.length)];
  selected.action();

  showEventModal(selected.title, "[" + player.name + "] 命運簽章：\n\n" + selected.text, "🔮");
  addLog("🎰 命運事件：[" + player.name + "] 觸發卡牌 [" + selected.title + "]", "text-purple-400");
  
  updatePlayerRanksUI();
  prepareEndTurn();
}

// --- 📊 排行榜卡片重構（完美支援右側合流對齊展示） ---
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
    const bankruptTag = p.isBankrupt ? '<div class="absolute inset-0 bg-rose-950/80 flex items-center justify-center font-bold text-rose-500 text-xs rounded-xl pointer-events-none select-none">破產出局</div>' : "";

    card.className = "p-3 rounded-xl transition-all relative flex items-center justify-between h-[65px] " + turnBorder + " " + opacityClass;
    card.innerHTML = 
      '<div class="flex items-center gap-2.5">' +
        '<span id="rank-avatar-' + p.id + '" class="text-2xl filter drop-shadow-[0_0_4px_rgba(255,255,255,0.15)]">' + p.avatar + '</span>' +
        '<div class="leading-none">' +
          '<span class="font-black text-xs text-white flex items-center gap-1 truncate max-w-[90px]">' + p.name.split(" ")[0] + " " + aiTag + '</span>' +
          '<span class="text-[9px] text-slate-500 block mt-1">排名 #' + (idx + 1) + godTag + '</span>' +
        '</div>' +
      '</div>' +
      
      // 右側合流展示身價、可用現金、城市房產
      '<div class="text-right text-[10px] space-y-0.5 leading-tight font-mono shrink-0 border-l border-slate-800/80 pl-3">' +
        '<div>' +
          '<span class="text-slate-500">身價:</span> ' +
          '<span class="text-cyan-400 font-black">$' + p.netWorth.toLocaleString() + '</span>' +
        '</div>' +
        '<div>' +
          '<span class="text-slate-500">現金:</span> ' +
          '<span class="text-emerald-400 font-bold">$' + p.cash.toLocaleString() + '</span>' +
        '</div>' +
        '<div>' +
          '<span class="text-slate-500">房產:</span> ' +
          '<span class="text-slate-300 font-medium">$' + p.propertyVal.toLocaleString() + '</span>' +
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
    showEventModal("👑 帝國終極之主", `恭喜 [${winner.name}] 在這場跨越四十個都市的環球大地圖爭霸戰中，成功令所有其他財團清算破產，問鼎世界首富！`, "🏆");
    addLog(`🏆 商業對決宣告完美閉幕！大富翁榮譽頭銜屬於：[${winner.name}]！`, "text-yellow-400 font-bold");
    
    document.getElementById("btn-roll").disabled = true;
    document.getElementById("btn-end-turn").disabled = true;
  }
}

function getGodName(type) {
  if (type === "wealth") return "大財神";
  if (type === "earth") return "土地公";
  if (type === "wisdom") return "智慧神";
  return "";
}

function addLog(text, customClass = "text-slate-300") {
  const logs = document.getElementById("game-logs");
  if (!logs) return;
  const item = document.createElement("div");
  item.className = "p-0.5 border-b border-slate-800/20 leading-relaxed font-mono " + customClass;
  item.textContent = "[第 " + roundCount + " 輪] " + text;
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
