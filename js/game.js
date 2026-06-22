/* =======================================================
   大富翁4：全球股市与神明争霸战 游戏主引擎及商业机制模块
   ======================================================= */

// --- 游戏状态核心数据库 ---
let players = [];
let gameStocks = [];
let currentTurnIndex = 0;
let roundCount = 1;
let mapStates = [];
let selectedStockIndex = 0;
let isDiceRolling = false;
let currentPropPending = null;
let passStartBonus = 3000;

const MAP_LENGTH = 24;
const GOD_TURNS = 5;

// --- 24 地格精密配置 ---
const TILE_DEFS = [
  { id: 0, col: 0, row: 0, name: "起点 🏁", type: "START", color: "bg-red-500", desc: "每次经过获取起点奖励" },
  { id: 1, col: 1, row: 0, name: "台北 🗼", type: "LAND", cost: 1000, rent: 150, color: "from-pink-500 to-pink-600 font-bold", desc: "亚洲科技枢纽地标" },
  { id: 2, col: 2, row: 0, name: "命运宝箱 🎰", type: "CHANCE", color: "bg-purple-600", desc: "未知的宿命或神仙庇佑" },
  { id: 3, col: 3, row: 0, name: "硅谷 💻", type: "LAND", cost: 1400, rent: 220, color: "from-pink-500 to-pink-600 font-bold", desc: "高科技创业核心圣地" },
  { id: 4, col: 4, row: 0, name: "证券所 📈", type: "STOCK_EXCHANGE", color: "bg-emerald-600", desc: "股市狂欢交易所" },
  { id: 5, col: 5, row: 0, name: "东京 🌸", type: "LAND", cost: 1200, rent: 180, color: "from-yellow-500 to-amber-500 font-bold", desc: "东方时尚与商业中心" },
  { id: 6, col: 6, row: 0, name: "神明庙 ⛩️", type: "GOD_SHRINE", color: "bg-amber-600", desc: "求神问卜，降临各种神力" },
  { id: 7, col: 7, row: 0, name: "首尔 🇰🇷", type: "LAND", cost: 1100, rent: 160, color: "from-yellow-500 to-amber-500 font-bold", desc: "韩流潮流前沿之地" },
  
  { id: 8, col: 7, row: 1, name: "医院 🏥", type: "HOSPITAL", color: "bg-blue-600", desc: "需要静养，不能动弹" },
  { id: 9, col: 7, row: 2, name: "伦敦 🎡", type: "LAND", cost: 1600, rent: 280, color: "from-blue-500 to-cyan-500 font-bold", desc: "古老雾都与金融中心" },
  { id: 10, col: 7, row: 3, name: "巴黎 🗼", type: "LAND", cost: 1800, rent: 320, color: "from-blue-500 to-cyan-500 font-bold", desc: "浪漫艺术之都" },
  { id: 11, col: 7, row: 4, name: "机会命运 🎁", type: "CHANCE", color: "bg-purple-600", desc: "未知的财富机会" },
  
  { id: 12, col: 7, row: 5, name: "命运之轮 🎡", type: "DESTINY", color: "bg-indigo-600", desc: "命运由天定" },
  { id: 13, col: 6, row: 5, name: "纽约 🗽", type: "LAND", cost: 2500, rent: 450, color: "from-red-500 to-rose-500 font-bold", desc: "世界的金融十字路口" },
  { id: 14, col: 5, row: 5, name: "证券所 📈", type: "STOCK_EXCHANGE", color: "bg-emerald-600", desc: "股市狂欢交易所" },
  { id: 15, col: 4, row: 5, name: "上海 🏙️", type: "LAND", cost: 2000, rent: 350, color: "from-green-500 to-emerald-500 font-bold", desc: "东方明珠魔都极速发展" },
  { id: 16, col: 3, row: 5, name: "神明庙 ⛩️", type: "GOD_SHRINE", color: "bg-amber-600", desc: "各路路神明赐福" },
  { id: 17, col: 2, row: 5, name: "深圳 🇨🇳", type: "LAND", cost: 1500, rent: 250, color: "from-green-500 to-emerald-500 font-bold", desc: "硬件科技硅谷突飞猛进" },
  
  { id: 18, col: 1, row: 5, name: "拘留所 🚓", type: "PRISON", color: "bg-gray-600", desc: "面壁思过，停止掷骰" },
  { id: 19, col: 0, row: 5, name: "悉尼 🦘", type: "LAND", cost: 1300, rent: 200, color: "from-purple-500 to-violet-500 font-bold", desc: "南半球明珠" },
  { id: 20, col: 0, row: 4, name: "机会命运 🍀", type: "CHANCE", color: "bg-purple-600", desc: "好运降临或是意外开销" },
  { id: 21, col: 0, row: 3, name: "新加坡 🦁", type: "LAND", cost: 1700, rent: 300, color: "from-purple-500 to-violet-500 font-bold", desc: "花园城市金融交融点" },
  { id: 22, col: 0, row: 2, name: "命运之星 ⭐", type: "DESTINY", color: "bg-indigo-600", desc: "命运不可改变" },
  { id: 23, col: 0, row: 1, name: "迪拜 🕌", type: "LAND", cost: 3000, rent: 600, color: "from-red-500 to-rose-500 font-bold", desc: "满地黄金的沙漠绿洲" }
];

const PLAYER_TEMPLATES = [
  { name: "孙小美 👧", color: "border-pink-500 text-pink-500 shadow-pink-500/20 bg-pink-500", textCol: "text-pink-400", avatar: "👧" },
  { name: "钱夫人 👩‍💼", color: "border-red-500 text-red-500 shadow-red-500/20 bg-red-500", textCol: "text-red-400", avatar: "👩‍💼" },
  { name: "阿土伯 👴", color: "border-green-500 text-green-500 shadow-green-500/20 bg-green-500", textCol: "text-green-400", avatar: "👴" },
  { name: "金贝贝 👶", color: "border-purple-500 text-purple-500 shadow-purple-500/20 bg-purple-500", textCol: "text-purple-400", avatar: "👶" }
];

const STOCKS_DEFS = [
  { symbol: "NVDA", name: "英伟达", price: 120.0, base: 120.0, vol: 0.15, trend: [], color: "#fbbf24" },
  { symbol: "AAPL", name: "苹果", price: 180.0, base: 180.0, vol: 0.05, trend: [], color: "#38bdf8" },
  { symbol: "TSMC", name: "台积电", price: 150.0, base: 150.0, vol: 0.08, trend: [], color: "#34d399" },
  { symbol: "TSLA", name: "特斯拉", price: 200.0, base: 200.0, vol: 0.20, trend: [], color: "#f87171" },
  { symbol: "MSFT", name: "微软", price: 400.0, base: 400.0, vol: 0.04, trend: [], color: "#a78bfa" }
];

// --- 初始引导界面生成 ---
function renderSetupScreen() {
  const listContainer = document.getElementById("player-setup-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";
  
  PLAYER_TEMPLATES.forEach((tpl, index) => {
    const row = document.createElement("div");
    row.className = "flex items-center justify-between bg-slate-950/80 p-3 rounded-2xl border border-slate-800 shadow-inner";
    row.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-3xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">${tpl.avatar}</span>
        <div>
          <input type="text" id="setup-name-${index}" value="${tpl.name}" class="bg-slate-900 border border-slate-800 text-white font-bold rounded-lg px-2 py-1 text-xs w-32 focus:outline-none focus:border-cyan-400">
          <span class="text-[10px] block text-slate-500 mt-1 uppercase tracking-wider">COLOR: ${tpl.name.split(' ')[0]}</span>
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
          <span class="text-[11px] font-bold text-slate-500">不参战</span>
        </label>
      </div>
    `;
    listContainer.appendChild(row);
  });
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
    
    // 防御性保护：如果元素还未加载成功，则安全跳过，防止控制台崩溃
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
        // 精细化证券持仓结构：NVDA, AAPL等
        stockHoldings: { "NVDA": 0, "AAPL": 0, "TSMC": 0, "TSLA": 0, "MSFT": 0 },
        stockCosts: { "NVDA": 0.0, "AAPL": 0.0, "TSMC": 0.0, "TSLA": 0.0, "MSFT": 0.0 }, // 平均买入价格
        position: 0,
        god: null,
        isBankrupt: false,
        isAI: typeVal === "ai",
        skipTurns: 0
      });
    }
  });

  if (players.length < 2) {
    alert("必须保留最少2名角色，且设置已正确渲染，才能正常进行对决！");
    return;
  }

  // 地图权属与级别初始化
  mapStates = TILE_DEFS.map(tile => {
    return { id: tile.id, owner: null, level: 0 };
  });

  // 证券走势图初始化前10周期
  gameStocks = JSON.parse(JSON.stringify(STOCKS_DEFS));
  gameStocks.forEach(s => {
    s.trend = Array.from({ length: 10 }, () => {
      const change = 1 + (Math.random() * 2 - 1) * s.vol;
      return parseFloat((s.base * change).toFixed(2));
    });
    s.price = s.trend[s.trend.length - 1];
  });

  document.getElementById("setup-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  renderBoard();
  updatePlayerRanksUI();
  updateStockTickerUI();

  currentTurnIndex = 0;
  roundCount = 1;
  addLog("🎬 地图初始化圆满完成，全球商业战役正式开始！", "text-cyan-400 font-bold");
  
  startPlayerTurn();
}

// --- 棋盘沙盒格子完全绘制 ---
function renderBoard() {
  const container = document.getElementById("board-container");
  if (!container) return;
  const existingTiles = container.querySelectorAll('.board-tile');
  existingTiles.forEach(el => el.remove());

  TILE_DEFS.forEach(tile => {
    const tileDiv = document.createElement("div");
    tileDiv.id = `tile-${tile.id}`;
    tileDiv.style.gridColumn = tile.col + 1;
    tileDiv.style.gridRow = tile.row + 1;

    let headerColor = "bg-slate-800";
    let subText = tile.desc;
    const state = mapStates[tile.id];

    if (tile.type === "LAND") {
      headerColor = `bg-gradient-to-r ${tile.color}`;
      subText = `$${tile.cost} (租金:$${tile.rent})`;
    } else if (tile.type === "START") {
      headerColor = "bg-red-500";
    } else if (tile.type === "STOCK_EXCHANGE") {
      headerColor = "bg-emerald-600";
    } else if (tile.type === "GOD_SHRINE") {
      headerColor = "bg-amber-600";
    }

    tileDiv.className = `board-tile bg-slate-900 border border-slate-800/80 rounded-2xl p-2.5 flex flex-col justify-between overflow-hidden shadow relative select-none`;
    tileDiv.innerHTML = `
      <div class="${headerColor} text-[10px] md:text-[11px] px-1.5 py-0.5 rounded-lg text-center font-bold text-slate-950 shadow-md">
        ${tile.name}
      </div>
      <div class="flex-grow flex flex-col items-center justify-center my-1 relative">
        <span id="tile-house-visual-${tile.id}" class="text-2xl md:text-3xl filter drop-shadow-[0_4px_8px_rgba(255,255,255,0.05)]">
          ${getPropertyEmoji(tile.type, state?.level)}
        </span>
        <div id="tile-owner-indicator-${tile.id}" class="absolute bottom-0 text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg"></div>
      </div>
      <div class="text-[9px] sm:text-[10px] text-slate-500 text-center font-bold tracking-tight" id="tile-footer-${tile.id}">
        ${subText}
      </div>
      <div id="tile-players-holder-${tile.id}" class="absolute inset-x-0 bottom-1 flex justify-center gap-1 flex-wrap z-10 pointer-events-none px-1"></div>
    `;
    container.appendChild(tileDiv);
  });

  updatePlayerPositionsUI();
  updatePropertiesUI();
}

// --- 地标与物主边框逻辑渲染 ---
function updatePropertiesUI() {
  mapStates.forEach(state => {
    const tile = TILE_DEFS[state.id];
    const tileDiv = document.getElementById(`tile-${state.id}`);
    if (!tile || !tileDiv) return;

    if (tile.type !== "LAND") return;

    const ownerId = state.owner;
    const indicator = document.getElementById(`tile-owner-indicator-${state.id}`);
    const footer = document.getElementById(`tile-footer-${state.id}`);
    const houseVisual = document.getElementById(`tile-house-visual-${state.id}`);

    if (ownerId !== null) {
      const owner = players.find(p => p.id === ownerId);
      if (owner) {
        // 物主定制渐变霓虹发光边框
        if (owner.id === 0) tileDiv.className = `board-tile bg-slate-900 neon-border-pink rounded-2xl p-2.5 flex flex-col justify-between overflow-hidden relative select-none`;
        else if (owner.id === 1) tileDiv.className = `board-tile bg-slate-900 neon-border-blue rounded-2xl p-2.5 flex flex-col justify-between overflow-hidden relative select-none`;
        else if (owner.id === 2) tileDiv.className = `board-tile bg-slate-900 neon-border-green rounded-2xl p-2.5 flex flex-col justify-between overflow-hidden relative select-none`;
        else if (owner.id === 3) tileDiv.className = `board-tile bg-slate-900 neon-border-amber rounded-2xl p-2.5 flex flex-col justify-between overflow-hidden relative select-none`;

        indicator.className = `absolute bottom-0 text-[10px] text-slate-950 font-black px-1.5 py-0.5 rounded bg-white shadow-lg`;
        indicator.textContent = owner.name.split(' ')[0];
        
        const finalRent = calculateRent(state.id);
        footer.innerHTML = `<span class="text-rose-400 font-extrabold">租金:$${finalRent}</span>`;
        houseVisual.textContent = getPropertyEmoji("LAND", state.level);
      }
    } else {
      tileDiv.className = `board-tile bg-slate-900 border border-slate-800/80 rounded-2xl p-2.5 flex flex-col justify-between overflow-hidden shadow relative select-none`;
      indicator.className = "hidden";
      indicator.textContent = "";
      footer.innerHTML = `<span class="text-slate-500 font-bold">地价:$${tile.cost}</span>`;
      houseVisual.textContent = "🌳";
    }
  });
}

// --- 棋子重定向及同步 ---
function updatePlayerPositionsUI() {
  for (let i = 0; i < MAP_LENGTH; i++) {
    const h = document.getElementById(`tile-players-holder-${i}`);
    if (h) h.innerHTML = "";
  }

  players.forEach(p => {
    if (p.isBankrupt) return;
    const holder = document.getElementById(`tile-players-holder-${p.position}`);
    if (holder) {
      const pBadge = document.createElement("div");
      const activeClass = (players[currentTurnIndex].id === p.id) ? "animate-bounce ring-4 ring-yellow-400 z-20" : "ring-1 ring-white/50";
      pBadge.className = `w-7 h-7 rounded-full flex items-center justify-center text-lg shadow-lg relative cursor-pointer ${p.color} ${activeClass} transition-all duration-350`;
      pBadge.innerHTML = `
        ${p.avatar}
        ${p.god ? `<span class="absolute -top-1.5 -right-1.5 text-xs">${getGodBadgeEmoji(p.god.type)}</span>` : ""}
      `;
      holder.appendChild(pBadge);
    }
  });
}

function getPropertyEmoji(type, level) {
  if (type !== "LAND") {
    if (type === "START") return "🏁";
    if (type === "STOCK_EXCHANGE") return "🏦";
    if (type === "GOD_SHRINE") return "⛩️";
    if (type === "HOSPITAL") return "🏥";
    if (type === "PRISON") return "🚓";
    return "🔮";
  }
  if (!level || level === 0) return "🌳";
  if (level === 1) return "🏡";
  if (level === 2) return "🏠";
  if (level === 3) return "🏢";
  if (level === 4) return "🏨";
  return "🏰";
}

function getGodBadgeEmoji(type) {
  if (type === "wealth") return "😇";
  if (type === "misfortune") return "😈";
  return "🧙";
}

// --- 回合转换逻辑器 ---
function startPlayerTurn() {
  const p = players[currentTurnIndex];

  if (p.isBankrupt) {
    nextTurn();
    return;
  }

  document.getElementById("current-player-avatar").textContent = p.avatar;
  document.getElementById("current-player-name").textContent = p.name;
  document.getElementById("round-counter").textContent = `ROUND ${roundCount}`;

  document.getElementById("btn-end-turn").disabled = true;
  document.getElementById("btn-roll").disabled = false;
  
  updatePlayerPositionsUI();
  updatePlayerRanksUI();

  if (p.skipTurns > 0) {
    p.skipTurns--;
    addLog(`🏥 [${p.name}] 正在修养或禁足，无法行动（剩余回合: ${p.skipTurns}）。`, "text-slate-500");
    document.getElementById("quick-tip").textContent = `${p.name} 禁足中，本回合自动跳过。`;
    
    document.getElementById("btn-end-turn").disabled = false;
    document.getElementById("btn-roll").disabled = true;

    if (p.isAI) {
      setTimeout(() => endTurn(), 1200);
    }
    return;
  }

  if (p.god) {
    p.god.turnsLeft--;
    if (p.god.turnsLeft <= 0) {
      addLog(`✨ [${p.name}] 头顶的神明 [${getGodName(p.god.type)}] 护法期限结束，化为灵气消散。`, "text-slate-400");
      p.god = null;
    } else {
      triggerGodBuffStartOfTurn(p);
    }
  }

  document.getElementById("quick-tip").textContent = `轮到 [${p.name}] 操作。`;

  if (p.isAI) {
    setTimeout(() => {
      triggerDiceRoll();
    }, 1000);
  }
}

function triggerGodBuffStartOfTurn(player) {
  if (!player.god) return;
  if (player.god.type === "wealth") {
    const bonus = Math.floor(Math.random() * 400) + 200;
    player.cash += bonus;
    addLog(`💰 财神眷顾！[${player.name}] 获得神降红包：+$${bonus}！`, "text-yellow-400 font-bold");
    if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
  } else if (player.god.type === "misfortune") {
    const loss = Math.floor(Math.random() * 300) + 150;
    player.cash = Math.max(0, player.cash - loss);
    addLog(`💸 衰神降头！[${player.name}] 财务遭遇无端损失：-$${loss}。`, "text-purple-400");
    if (window.sound && typeof window.sound.playMisfortune === "function") window.sound.playMisfortune();
  }
}

// --- 3D物理物理骰子驱动 ---
function triggerDiceRoll() {
  if (isDiceRolling || players[currentTurnIndex].isBankrupt) return;
  
  const p = players[currentTurnIndex];
  document.getElementById("btn-roll").disabled = true;
  isDiceRolling = true;

  const diceEl = document.getElementById("dice-element");
  diceEl.classList.add("dice-rolling");
  if (window.sound && typeof window.sound.playDice === "function") window.sound.playDice();

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
      
      addLog(`🎲 [${p.name}] 掷出了骰子，数额为 [${diceValue}]。`, "text-slate-100");
      movePlayerStepByStep(p, diceValue);
    }
  }, 70);
}

function getDiceFace(val) {
  const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  return faces[val - 1] || "⚀";
}

function movePlayerStepByStep(player, steps) {
  let currentStep = 0;
  
  const moveInterval = setInterval(() => {
    player.position = (player.position + 1) % MAP_LENGTH;
    
    if (player.position === 0 && currentStep < steps - 1) {
      player.cash += passStartBonus;
      addLog(`🏪 [${player.name}] 疾步路过起点，财务奖励下发：+$${passStartBonus}！`, "text-emerald-400 font-bold");
      if (window.sound) window.sound.playCoin();
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

  document.getElementById("quick-tip").textContent = `[${player.name}] 在 [${tile.name}] 格子驻足。`;

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
    player.cash += passStartBonus;
    addLog(`🏪 [${player.name}] 精确踩中起点格子，财务双倍发红利：+$${passStartBonus}！`, "text-emerald-400 font-bold");
    if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
    prepareEndTurn();
    return;
  }

  if (tile.type === "STOCK_EXCHANGE") {
    showEventModal("📈 证券交易所", `[${player.name}] 进入了交易所，可以在此进行股票交易，核算你的持仓盈亏。`, "💵");
    addLog(`📈 [${player.name}] 进入交易所特许经营板块。`, "text-emerald-400");
    if (!player.isAI) {
      openStockMarket();
    } else {
      simulateAISmartStockTrade(player);
    }
    prepareEndTurn();
    return;
  }

  if (tile.type === "LAND") {
    if (state.owner !== null && state.owner !== player.id && player.god?.type === "earth") {
      addLog(`🧙 土地公作法！帮助 [${player.name}] 直接豁免了全部地产过路费！`, "text-green-400 font-bold");
      prepareEndTurn();
      return;
    }

    if (state.owner === null) {
      if (player.god?.type === "earth") {
        state.owner = player.id;
        state.level = 1;
        addLog(`🧙 土地公作法！直接帮 [${player.name}] 免费占领了空地 [${tile.name}]！`, "text-green-400 font-bold");
        updatePropertiesUI();
        if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
        prepareEndTurn();
      } else {
        promptPropertyModal(tile, state, "buy");
      }
    } else if (state.owner === player.id) {
      if (player.god?.type === "earth") {
        if (state.level < 5) {
          state.level++;
          addLog(`🧙 土地公吹气！免费将 [${player.name}] 的房产 [${tile.name}] 级别拔高至 Lv.${state.level}！`, "text-green-400 font-bold");
          updatePropertiesUI();
          if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
        } else {
          addLog(`🏰 [${player.name}] 名下的 [${tile.name}] 已经达到了顶级城堡！`, "text-yellow-400");
        }
        prepareEndTurn();
      } else {
        if (state.level < 5) {
          promptPropertyModal(tile, state, "upgrade");
        } else {
          addLog(`🏰 [${player.name}] 巡视视察了名下的豪华城堡 [${tile.name}]，心中无限欢喜。`, "text-yellow-400");
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

  if (tile.type === "GOD_SHRINE") {
    triggerGodShrine(player);
    return;
  }

  prepareEndTurn();
}

function calculateRent(tileId) {
  const tile = TILE_DEFS[tileId];
  const state = mapStates[tileId];
  if (!tile || !state || tile.type !== "LAND") return 0;
  return tile.rent * Math.pow(2, state.level);
}

// --- 综合资产清算核算机制 ---
function collectRentLogic(renter, ownerId, tileId) {
  const owner = players.find(p => p.id === ownerId);
  const originalRent = calculateRent(tileId);
  let finalRent = originalRent;

  if (renter.god?.type === "misfortune") {
    finalRent *= 2;
  } else if (renter.god?.type === "wealth") {
    finalRent = Math.floor(finalRent / 2);
  }

  if (owner.god?.type === "wealth") {
    finalRent *= 2;
  } else if (owner.god?.type === "misfortune") {
    finalRent = Math.floor(finalRent / 2);
  }

  addLog(`💸 [${renter.name}] 踏入 [${owner.name}] 的领地 [${TILE_DEFS[tileId].name}]，需支付过路费 $${finalRent}。`, "text-orange-400");
  
  if (renter.cash >= finalRent) {
    renter.cash -= finalRent;
    owner.cash += finalRent;
    addLog(`💰 [${renter.name}] 全额支付过路租金，$${finalRent} 计入 [${owner.name}] 的可用现金。`, "text-slate-400");
    if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
    prepareEndTurn();
  } else {
    triggerLiquidationToPay(renter, owner, finalRent);
  }
}

function triggerLiquidationToPay(renter, creditor, debt) {
  addLog(`🚨 [${renter.name}] 可用现金枯竭！被迫执行破产清盘变卖(股票/地产)自救！`, "text-rose-500 font-bold");
  
  gameStocks.forEach(s => {
    const held = renter.stockHoldings[s.symbol] || 0;
    if (held > 0) {
      const cashBack = Math.floor(held * s.price);
      const costBasis = renter.stockCosts[s.symbol] || 0;
      const profit = Math.floor(held * (s.price - costBasis));
      const profitStr = profit >= 0 ? `盈利 +$${profit}` : `亏损 $${Math.abs(profit)}`;

      renter.cash += cashBack;
      renter.stockHoldings[s.symbol] = 0;
      renter.stockCosts[s.symbol] = 0;

      addLog(`💱 强制平仓：清仓 [${s.name}] ${held} 股，折现资金 $${cashBack} (${profitStr})。`, "text-yellow-400");
    }
  });

  if (renter.cash >= debt) {
    renter.cash -= debt;
    creditor.cash += debt;
    addLog(`✅ [${renter.name}] 通过平仓变现股票成功解除债务，支付过路费。`, "text-green-400");
    prepareEndTurn();
    return;
  }

  for (let i = 0; i < mapStates.length; i++) {
    const state = mapStates[i];
    if (state.owner === renter.id) {
      const tile = TILE_DEFS[i];
      const refundPrice = Math.floor((tile.cost + (state.level * tile.cost * 0.5)) * 0.7);
      
      state.owner = null;
      state.level = 0;
      renter.cash += refundPrice;
      
      addLog(`🏘️ 破产清算：司法拍卖 [${tile.name}] 产权，变现补偿金: $${refundPrice}。`, "text-yellow-500");
      updatePropertiesUI();

      if (renter.cash >= debt) {
        break;
      }
    }
  }

  if (renter.cash >= debt) {
    renter.cash -= debt;
    creditor.cash += debt;
    addLog(`✅ [${renter.name}] 通过重组拍卖地产成功偿还了债务。`, "text-green-400");
    prepareEndTurn();
  } else {
    declareBankruptcy(renter, creditor);
  }
}

function declareBankruptcy(player, creditor) {
  player.isBankrupt = true;
  addLog(`💀 商业破产：[${player.name}] 资产彻底清算后无力偿还债务，宣告破产出局！`, "text-rose-600 font-black text-sm");
  if (window.sound && typeof window.sound.playMisfortune === "function") window.sound.playMisfortune();

  if (player.cash > 0 && creditor) {
    creditor.cash += player.cash;
    player.cash = 0;
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

function checkGameOver() {
  const activePlayers = players.filter(p => !p.isBankrupt);
  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    showEventModal("👑 终极财阀诞生！", `恭喜 [${winner.name}] 在这场风云诡谲、神仙乱斗的全球股市大战中站到最后，笑傲商海！`, "👑");
    addLog(`🏆 战役宣告终结！最终的商海霸主是：[${winner.name}]！`, "text-yellow-400 font-black text-base");
    
    document.getElementById("btn-roll").disabled = true;
    document.getElementById("btn-end-turn").disabled = true;
  }
}

// --- 各类商业契约 Modals 弹窗 ---
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
    title.textContent = `投资：${tile.name}`;
    desc.textContent = tile.desc;
    costEl.textContent = `$${tile.cost}`;
    levelEl.textContent = "空地 (Lv.0)";
    rentEl.textContent = `$${tile.rent}`;
    confirmBtn.textContent = "立即购入";
  } else {
    title.textContent = `加盖扩建：${tile.name}`;
    desc.textContent = "加盖多层商业中心 or 摩天大楼，成倍提升路过税收！";
    const buildCost = Math.floor(tile.cost * 0.5);
    costEl.textContent = `$${buildCost}`;
    levelEl.textContent = `当前等级: Lv.${state.level}`;
    const nextRent = tile.rent * Math.pow(2, state.level + 1);
    rentEl.textContent = `$${nextRent} (升级后)`;
    confirmBtn.textContent = "确认加层";
  }

  if (player.isAI) {
    let aiDecision = false;
    const requiredCash = actionType === "buy" ? tile.cost : Math.floor(tile.cost * 0.5);
    
    if (player.cash >= requiredCash + 1500) {
      aiDecision = true;
    }

    setTimeout(() => {
      confirmPropertyAction(aiDecision);
    }, 1200);
  } else {
    modal.classList.remove("hidden");
  }
}

function confirmPropertyAction(agree) {
  document.getElementById("property-modal").classList.add("hidden");
  if (!currentPropPending) return;

  const { tile, state, actionType } = currentPropPending;
  const player = players[currentTurnIndex];

  if (agree) {
    const requiredCash = actionType === "buy" ? tile.cost : Math.floor(tile.cost * 0.5);
    if (player.cash >= requiredCash) {
      player.cash -= requiredCash;
      if (actionType === "buy") {
        state.owner = player.id;
        state.level = 1;
        addLog(`🏘️ 地产契约：[${player.name}] 砸下 $${requiredCash}，将 [${tile.name}] 产权收入囊中！`, "text-pink-400");
      } else {
        state.level++;
        addLog(`🏢 地产加盖：[${player.name}] 砸下工程款 $${requiredCash}，将 [${tile.name}] 扩建至 Lv.${state.level} 商业城！`, "text-cyan-400");
      }
      if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
      updatePropertiesUI();
    } else {
      addLog(`❌ 财务阻碍：[${player.name}] 资本储备不足，放弃了在 [${tile.name}] 的投资扩建。`, "text-rose-400");
    }
  } else {
    addLog(`💤 [${player.name}] 战略性放弃了在 [${tile.name}] 进行地产运作的决策。`, "text-slate-500");
  }

  currentPropPending = null;
  prepareEndTurn();
}

// --- 神明神明大殿与命运机会 ---
function triggerGodShrine(player) {
  const gods = [
    { type: "wealth", name: "大财神 😇", desc: "财神加身 5 轮！过路税减半，收过路费翻倍，且每轮开盘降下随机红包！" },
    { type: "misfortune", name: "大衰神 😈", desc: "衰神降头 5 轮！过路税翻倍，己方地带路过租金免半，且每轮钱包破漏丢现金！" },
    { type: "earth", name: "土地公 🧙", desc: "土地公护法 5 轮！路过无主荒地免费强占，自持地免费白嫖加层，且对手地免收租！" }
  ];

  const selected = gods[Math.floor(Math.random() * gods.length)];
  player.god = {
    type: selected.type,
    turnsLeft: GOD_TURNS
  };

  if (window.sound && typeof window.sound.playGodArrival === "function") window.sound.playGodArrival();
  showEventModal(selected.name, `[${player.name}] 诚心在庙宇进香，迎来 [${selected.name}] 附体 5 轮！\n\n特权：${selected.desc}`, "✨");
  addLog(`✨ 神明显显：[${player.name}] 迎来 [${selected.name}] 降临随行护身。`, "text-yellow-400 font-bold");
  
  updatePlayerPositionsUI();
  prepareEndTurn();
}

function triggerRandomEvent(player) {
  const events = [
    {
      title: "美股狂飙牛市 📈",
      text: "受宏观情绪利好，全球证券价格瞬间大涨 15%！",
      action: () => {
        gameStocks.forEach(s => {
          s.price = parseFloat((s.price * 1.15).toFixed(2));
          s.trend.push(s.price);
        });
        updateStockTickerUI();
        addLog("📣 股市战报：受宏观牛市刺激，盘面所有股票逆天大涨 15%！", "text-emerald-400 font-bold");
      }
    },
    {
      title: "美债收益黑天鹅 📉",
      text: "因流动性恐慌席卷硅谷，全线股票价格闪崩 12%！",
      action: () => {
        gameStocks.forEach(s => {
          s.price = parseFloat((s.price * 0.88).toFixed(2));
          s.trend.push(s.price);
        });
        updateStockTickerUI();
        addLog("📣 股市战报：黑天鹅空袭，盘面全线股票闪崩 12%！", "text-rose-400 font-bold");
      }
    },
    {
      title: "喜提产业扶持大基金 🎁",
      text: "由于合规管理得当，喜获政府商业产业创新大基金扶持：+$2,000！",
      action: () => {
        player.cash += 2000;
        if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
      }
    },
    {
      title: "反垄断巨额罚单 💸",
      text: "遭遇不正当竞争反垄断重罚，强制向总台补缴罚没准备金：-$1,500！",
      action: () => {
        player.cash = Math.max(0, player.cash - 1500);
        if (window.sound && typeof window.sound.playMisfortune === "function") window.sound.playMisfortune();
      }
    },
    {
      title: "福运神仙当街护卫 🧙",
      text: "偶遇神明游戏，直接随机迎来一位神随身护驾 4 回合！",
      action: () => {
        const types = ["wealth", "earth"];
        const t = types[Math.floor(Math.random() * types.length)];
        player.god = { type: t, turnsLeft: 4 };
        if (window.sound && typeof window.sound.playGodArrival === "function") window.sound.playGodArrival();
        addLog(`🧙 神意恩赐：[${player.name}] 遇到神随行护航 4 轮！`);
      }
    },
    {
      title: "通胀恶化风暴袭击 💣",
      text: "恶性通货膨胀风暴来袭，强制造成玩家大额资产流失：-$1,800！",
      action: () => {
        player.cash = Math.max(0, player.cash - 1800);
        if (window.sound && typeof window.sound.playMisfortune === "function") window.sound.playMisfortune();
      }
    }
  ];

  const selected = events[Math.floor(Math.random() * events.length)];
  selected.action();

  showEventModal(selected.title, `[${player.name}] 遭遇商业命运抉择：\n\n${selected.text}`, "🔮");
  addLog(`🎰 命运揭晓：[${player.name}] 遭遇了 [${selected.title}] 事件！`, "text-purple-400");
  
  updatePlayerRanksUI();
  prepareEndTurn();
}

// --- 周期交替及资产刷新引擎 ---
function prepareEndTurn() {
  const p = players[currentTurnIndex];
  updatePlayerRanksUI();

  if (p.isAI) {
    setTimeout(() => {
      endTurn();
    }, 1200);
  } else {
    document.getElementById("btn-end-turn").disabled = false;
  }
}

function endTurn() {
  currentTurnIndex = (currentTurnIndex + 1) % players.length;

  if (currentTurnIndex === 0) {
    roundCount++;
    fluctuateStockMarket();
  }

  startPlayerTurn();
}

function nextTurn() {
  currentTurnIndex = (currentTurnIndex + 1) % players.length;
  if (currentTurnIndex === 0) {
    roundCount++;
    fluctuateStockMarket();
  }
  startPlayerTurn();
}

function fluctuateStockMarket() {
  addLog(`🔔 回合交替 ROUND ${roundCount}：二级股市开盘刷新！`, "text-slate-500 font-bold");
  
  gameStocks.forEach(s => {
    const isUp = Math.random() > 0.48;
    const magnitude = Math.random() * s.vol;
    const changeFactor = isUp ? (1 + magnitude) : (1 - magnitude);
    
    s.price = parseFloat((s.price * changeFactor).toFixed(2));
    if (s.price < 5) s.price = 5.0;

    s.trend.push(s.price);
    if (s.trend.length > 12) s.trend.shift();
  });

  updateStockTickerUI();
  if (!document.getElementById("stock-modal").classList.contains("hidden")) {
    renderStockMarketDetails();
  }
}

// --- AI 量化买卖模拟器 ---
function simulateAISmartStockTrade(aiPlayer) {
  gameStocks.forEach(s => {
    const history = s.trend.slice(-5);
    if (history.length < 3) return;
    
    const currentPrice = s.price;
    const maxInHistory = Math.max(...history);
    const minInHistory = Math.min(...history);

    const holdingCount = aiPlayer.stockHoldings[s.symbol] || 0;
    const costBasis = aiPlayer.stockCosts[s.symbol] || 0;
    if (holdingCount > 0 && currentPrice >= maxInHistory * 0.9) {
      const cashBack = Math.floor(holdingCount * s.price);
      const profit = Math.floor(holdingCount * (s.price - costBasis));
      const profitStr = profit >= 0 ? `盈利 +$${profit}` : `亏损 $${Math.abs(profit)}`;

      aiPlayer.cash += cashBack;
      aiPlayer.stockHoldings[s.symbol] = 0;
      aiPlayer.stockCosts[s.symbol] = 0;

      addLog(`💱 AI 量化交易：[${aiPlayer.name}] 指导平仓 [${s.name}] 全部 ${holdingCount} 股，收回现金 +$${cashBack} (${profitStr})！`, "text-emerald-400");
      if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
    }

    if (aiPlayer.cash > 5000 && currentPrice <= minInHistory * 1.1) {
      const buyCount = Math.floor((aiPlayer.cash * 0.25) / s.price);
      if (buyCount > 0) {
        const cost = Math.floor(buyCount * s.price);
        
        const held = aiPlayer.stockHoldings[s.symbol] || 0;
        const currentCost = aiPlayer.stockCosts[s.symbol] || 0;
        const totalCostBasis = ((held * currentCost) + (buyCount * s.price)) / (held + buyCount);

        aiPlayer.cash -= cost;
        aiPlayer.stockHoldings[s.symbol] = held + buyCount;
        aiPlayer.stockCosts[s.symbol] = parseFloat(totalCostBasis.toFixed(2));

        addLog(`💱 AI 量化交易：[${aiPlayer.name}] 低位扫货 [${s.name}] ${buyCount} 股，投资资本 -$${cost} (成本均价均记:$${aiPlayer.stockCosts[s.symbol].toFixed(1)})。`, "text-cyan-400");
        if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
      }
    }
  });
}

// --- 综合看板 UI 控制 ---
function updateStockTickerUI() {
  const ticker = document.getElementById("stock-ticker");
  if (!ticker) return;
  ticker.innerHTML = "";
  gameStocks.forEach(s => {
    const change = s.trend.length >= 2 ? s.price - s.trend[s.trend.length - 2] : 0;
    const percent = s.trend.length >= 2 ? (change / s.trend[s.trend.length - 2] * 100).toFixed(1) : "0.0";
    const sign = change >= 0 ? "▲" : "▼";
    const color = change >= 0 ? "text-emerald-400" : "text-rose-400";
    
    const item = document.createElement("span");
    item.className = `inline-flex items-center gap-1 font-bold ${color}`;
    item.innerHTML = `${s.name}(${s.symbol}) $${s.price.toFixed(1)} ${sign}${percent}%`;
    ticker.appendChild(item);
  });
}

function updatePlayerRanksUI() {
  const rankContainer = document.getElementById("player-ranks");
  if (!rankContainer) return;
  rankContainer.innerHTML = "";

  const sorted = [...players].map(p => {
    let stockVal = 0;
    gameStocks.forEach(s => {
      stockVal += (p.stockHoldings[s.symbol] || 0) * s.price;
    });

    let propertyVal = 0;
    mapStates.forEach(st => {
      if (st.owner === p.id) {
        const tile = TILE_DEFS[st.id];
        propertyVal += tile.cost + (st.level * tile.cost * 0.5);
      }
    });

    const netWorth = p.cash + stockVal + propertyVal;

    return { ...p, stockVal, propertyVal, netWorth };
  }).sort((a, b) => b.netWorth - a.netWorth);

  sorted.forEach((p, idx) => {
    const card = document.createElement("div");
    const opacityClass = p.isBankrupt ? "opacity-35" : "";
    const turnBorder = (players[currentTurnIndex].id === p.id && !p.isBankrupt) ? "border-2 border-cyan-400 scale-[1.01] shadow-[0_0_15px_rgba(0,240,255,0.15)]" : "border border-slate-800/80";
    
    card.className = `p-4.5 rounded-2xl bg-slate-900/80 ${turnBorder} ${opacityClass} transition-all relative flex flex-col justify-between`;
    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-3">
          <span class="text-3xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]">${p.avatar}</span>
          <div>
            <div class="font-bold text-sm text-white flex items-center gap-1.5">
              ${p.name} 
              ${p.isAI ? `<span class="bg-slate-800 text-slate-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">AI</span>` : ""}
            </div>
            <div class="text-[10px] text-slate-400 uppercase tracking-widest font-black">Net worth: <span class="text-cyan-400 font-extrabold text-xs">$${p.netWorth.toLocaleString()}</span></div>
          </div>
        </div>
        <div class="text-right flex flex-col items-end">
          <span class="text-xs font-black text-slate-500">#${idx + 1}</span>
          ${p.god ? `<span class="bg-indigo-950/80 text-indigo-300 text-[9px] px-2 py-0.5 rounded-full border border-indigo-900/60 flex items-center gap-0.5 animate-pulse font-bold">${getGodName(p.god.type)}:${p.god.turnsLeft}r</span>` : ""}
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 text-[10px] text-slate-500 border-t border-slate-800/60 pt-2.5 mt-2">
        <div class="bg-slate-950/80 p-2 rounded-xl text-center">💵 Cash<br><span class="text-slate-200 font-black text-xs">$${p.cash.toLocaleString()}</span></div>
        <div class="bg-slate-950/80 p-2 rounded-xl text-center">📈 Stocks<br><span class="text-slate-200 font-black text-xs">$${Math.floor(p.stockVal).toLocaleString()}</span></div>
        <div class="bg-slate-950/80 p-2 rounded-xl text-center">🏘️ Estate<br><span class="text-slate-200 font-black text-xs">$${Math.floor(p.propertyVal).toLocaleString()}</span></div>
      </div>

      ${p.isBankrupt ? `<div class="absolute inset-0 bg-rose-950/90 flex items-center justify-center font-black text-rose-500 text-sm rounded-2xl transform rotate-1 select-none pointer-events-none border border-rose-500 shadow-2xl">BANKRUPT • 破产出局</div>` : ""}
    `;
    rankContainer.appendChild(card);
  });
}

function getGodName(type) {
  if (type === "wealth") return "财神";
  if (type === "misfortune") return "衰神";
  if (type === "earth") return "土地公";
  return "";
}

function openStockMarket() {
  document.getElementById("stock-modal").classList.remove("hidden");
  renderStockMarketDetails();
}

function closeStockMarket() {
  document.getElementById("stock-modal").classList.add("hidden");
}

function renderStockMarketDetails() {
  const activePlayer = players[currentTurnIndex];
  
  document.getElementById("stock-user-cash").textContent = `$${activePlayer.cash.toLocaleString()}`;

  const btnContainer = document.getElementById("stock-select-buttons");
  if (btnContainer) {
    btnContainer.innerHTML = "";
    gameStocks.forEach((s, idx) => {
      const btn = document.createElement("button");
      const activeClass = (selectedStockIndex === idx) ? "bg-cyan-500 text-slate-950 border-cyan-400" : "bg-slate-800 text-slate-300 border-slate-700/60 hover:bg-slate-750";
      btn.className = `border py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${activeClass}`;
      btn.textContent = s.symbol;
      btn.onclick = () => {
        selectedStockIndex = idx;
        renderStockMarketDetails();
      };
      btnContainer.appendChild(btn);
    });
  }

  const stock = gameStocks[selectedStockIndex];
  document.getElementById("stock-detail-name").textContent = `${stock.name} (${stock.symbol})`;
  document.getElementById("stock-detail-price").textContent = `$${stock.price.toFixed(2)}`;
  
  const holdCount = activePlayer.stockHoldings[stock.symbol] || 0;
  const costBasis = activePlayer.stockCosts[stock.symbol] || 0;
  const totalCostBasisVal = holdCount * costBasis;
  const currentTotalVal = holdCount * stock.price;
  const totalProfit = currentTotalVal - totalCostBasisVal;

  let holdDetailHTML = ``;
  if (holdCount > 0) {
    const profitColor = totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400';
    const profitSign = totalProfit >= 0 ? '+' : '';
    holdDetailHTML = `
      <div class="flex flex-col gap-1 text-[11px] font-mono leading-relaxed">
        <div class="flex justify-between"><span>已持股份:</span> <span class="font-bold text-white">${holdCount} 股</span></div>
        <div class="flex justify-between"><span>持仓均价:</span> <span class="font-bold text-cyan-400">$${costBasis.toFixed(2)}</span></div>
        <div class="flex justify-between"><span>估算损益:</span> <span class="font-bold ${profitColor}">${profitSign}$${totalProfit.toFixed(2)}</span></div>
      </div>
    `;
  } else {
    holdDetailHTML = `<span class="text-slate-500 italic text-[11px]">暂无持仓股份</span>`;
  }
  document.getElementById("stock-detail-hold").innerHTML = holdDetailHTML;

  // 触发 stock.js 中的高阶金融图表渲染
  if (window.stockEngine && typeof window.stockEngine.renderChart === "function") {
    window.stockEngine.renderChart(stock);
  }

  // 我的仓位汇总
  const holdingList = document.getElementById("stock-holding-list");
  if (holdingList) {
    holdingList.innerHTML = "";
    
    let hasAnyStock = false;
    gameStocks.forEach(s => {
      const count = activePlayer.stockHoldings[s.symbol] || 0;
      const costBasisPrice = activePlayer.stockCosts[s.symbol] || 0;
      if (count > 0) {
        hasAnyStock = true;
        const profit = count * (s.price - costBasisPrice);
        const profitColor = profit >= 0 ? 'text-emerald-400' : 'text-rose-400';
        const profitSign = profit >= 0 ? '+' : '';
        
        const row = document.createElement("div");
        row.className = "flex justify-between items-center bg-slate-900 p-2.5 rounded-xl border border-slate-850 text-xs text-slate-300 font-mono";
        row.innerHTML = `
          <div class="flex flex-col">
            <span class="font-bold text-white">${s.name} (${s.symbol})</span>
            <span class="text-[10px] text-slate-500">Hold: ${count} 股</span>
          </div>
          <div class="text-right flex flex-col">
            <span class="text-cyan-400 font-bold">成本均价: $${costBasisPrice.toFixed(2)}</span>
            <span class="${profitColor} font-bold text-[10px]">${profitSign}$${Math.floor(profit)} (${((profit / (count * costBasisPrice)) * 100).toFixed(1)}%)</span>
          </div>
        `;
        holdingList.appendChild(row);
      }
    });

    if (!hasAnyStock) {
      holdingList.innerHTML = `<div class="text-slate-500 text-xs italic text-center py-3">暂无任何持仓股份</div>`;
    }
  }
}

function setTradeMax() {
  const activePlayer = players[currentTurnIndex];
  const stock = gameStocks[selectedStockIndex];
  const amountInput = document.getElementById("stock-trade-amount");
  
  const maxBuy = Math.floor(activePlayer.cash / stock.price);
  amountInput.value = maxBuy > 0 ? maxBuy : 1;
}

function tradeStock(type) {
  const activePlayer = players[currentTurnIndex];
  if (activePlayer.isBankrupt) return;

  const stock = gameStocks[selectedStockIndex];
  const amountInput = document.getElementById("stock-trade-amount");
  const amount = parseInt(amountInput.value) || 0;

  if (amount <= 0) {
    alert("请输入有效的交易股数！");
    return;
  }

  if (type === "buy") {
    const cost = Math.floor(amount * stock.price);
    if (activePlayer.cash >= cost) {
      const held = activePlayer.stockHoldings[stock.symbol] || 0;
      const currentCost = activePlayer.stockCosts[stock.symbol] || 0;
      
      const totalCostBasis = ((held * currentCost) + (amount * stock.price)) / (held + amount);
      
      activePlayer.cash -= cost;
      activePlayer.stockHoldings[stock.symbol] = held + amount;
      activePlayer.stockCosts[stock.symbol] = parseFloat(totalCostBasis.toFixed(2));

      addLog(`💱 股市买入：[${activePlayer.name}] 扫货买入 [${stock.name}] ${amount} 股 (成交价:$${stock.price.toFixed(2)}，持仓均价:$${activePlayer.stockCosts[stock.symbol].toFixed(2)})。`, "text-emerald-400");
      if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
    } else {
      alert("可用现金准备金不足，交易指令失败！");
    }
  } else {
    const held = activePlayer.stockHoldings[stock.symbol] || 0;
    const costBasis = activePlayer.stockCosts[stock.symbol] || 0;
    if (held >= amount) {
      const revenue = Math.floor(amount * stock.price);
      const profit = Math.floor(amount * (stock.price - costBasis));
      const profitStr = profit >= 0 ? `盈利 +$${profit}` : `亏损 $${Math.abs(profit)}`;

      activePlayer.cash += revenue;
      activePlayer.stockHoldings[stock.symbol] = held - amount;
      if (activePlayer.stockHoldings[stock.symbol] === 0) {
        activePlayer.stockCosts[stock.symbol] = 0; // 重置
      }

      addLog(`💱 股市卖出：[${activePlayer.name}] 平仓卖出 [${stock.name}] ${amount} 股，套现 $${revenue} (${profitStr})！`, "text-rose-400");
      if (window.sound && typeof window.sound.playCoin === "function") window.sound.playCoin();
    } else {
      alert("阁下的持仓份额中并没有足够股数可以抛售！");
    }
  }

  renderStockMarketDetails();
  updatePlayerRanksUI();
}

// --- 系统日志辅助模块 ---
function addLog(text, customClass = "text-slate-300") {
  const logs = document.getElementById("game-logs");
  if (!logs) return;
  const item = document.createElement("div");
  item.className = `p-1.5 border-b border-slate-800/40 leading-relaxed font-mono ${customClass}`;
  item.textContent = `[ROUND ${roundCount}] ${text}`;
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

// --- 自动初始化引导界面 (避免 window.onload 被其他脚本覆盖) ---
function initGameSetup() {
  renderSetupScreen();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGameSetup);
} else {
  initGameSetup();
}
