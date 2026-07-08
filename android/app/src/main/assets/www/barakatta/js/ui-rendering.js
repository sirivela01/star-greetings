// Barakatta UI Rendering, Animations & Event Controller
console.log("Barakatta UI Rendering Controller Loaded - Version 1.5.2");
(function () {
  let game = null;
  let isRolling = false;
  let tilesGrid = null;
  let currentRollCount = 0;
  let selectedRockId = null;
  let activeHighlightPath = null;
  let isAnimatingMove = false;

  // Custom player setup configuration variables
  let bkSetupPlayerCount = 2;
  let bkSetupNames = {
    1: "Allu",
    2: "Ranbir",
    3: "Zendaya",
    4: "Prabhas"
  };
  let bkSetupAvatars = {
    1: 0,
    2: 1,
    3: 2,
    4: 3
  };
  let bkSetupTypes = {
    1: "human",
    2: "bot",
    3: "bot",
    4: "bot"
  };

  const playerConfig = {
    player1: { color: "#ef4444" }, // Red
    player2: { color: "#10b981" }, // Green
    player3: { color: "#fbbf24" }, // Yellow
    player4: { color: "#3b82f6" }  // Blue
  };

  const playerOffsets = {
    player1: { dx: -5, dy: 5 },
    player2: { dx: 5, dy: 5 },
    player3: { dx: 5, dy: -5 },
    player4: { dx: -5, dy: -5 }
  };

  const diceRotations = {
    1: { x: 0, y: 0 },
    6: { x: 180, y: 0 },
    2: { x: 0, y: -90 },
    5: { x: 0, y: 90 },
    3: { x: -90, y: 0 },
    4: { x: 90, y: 0 }
  };

  // Synthesizers for Touch and cycle sounds
  function playTouchSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(750, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(250, audioCtx.currentTime + 0.08);
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.08);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  }

  function playCycleSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1100, audioCtx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.06);
    } catch (e) {}
  }

  // Synthesizes a realistic pawn step/movement sound effect
  function playStepSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      // 1. Low impact wood block sound (Triangle wave)
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = "triangle";
      
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
      
      // 2. High frequency click/tap to simulate solid contact
      const clickOsc = audioCtx.createOscillator();
      const clickGain = clickOsc.context.createGain();
      clickOsc.type = "sine";
      clickOsc.frequency.setValueAtTime(1200, now);
      clickOsc.frequency.exponentialRampToValueAtTime(600, now + 0.02);
      
      clickGain.gain.setValueAtTime(0.03, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      
      clickOsc.connect(clickGain);
      clickGain.connect(audioCtx.destination);
      clickOsc.start(now);
      clickOsc.stop(now + 0.02);
    } catch (e) {
      console.warn("Step sound playback failed:", e);
    }
  }

  // Physically update DOM token's position to cell (r, c)
  function moveTokenToCell(playerId, rockId, r, c) {
    const domId = `bk-rock-${playerId}-${rockId}`;
    const rockToken = document.getElementById(domId);
    if (!rockToken) return;
    
    const tileDiv = tilesGrid[r] ? tilesGrid[r][c] : null;
    if (!tileDiv) return;
    
    const isSafe = BARAKATTA_BOARD.safeSquares.some(s => s.row === r && s.col === c);
    const baseZ = isSafe ? 22 : 18;
    
    // Group active board / home rocks on target cell to calculate staggered offset
    let rocksOnCell = [];
    Object.keys(game.players).forEach(pId => {
      game.players[pId].rocks.forEach(rObj => {
        if (pId === playerId && rObj.id === rockId) return; // Exclude moving rock
        
        let cell = null;
        if (rObj.status === "active" || rObj.status === "blocked") {
          cell = game.getRockCell(pId, rObj.id);
        } else if (rObj.status === "home") {
          cell = { row: 3, col: 3 };
        }
        if (cell && cell.row === r && cell.col === c) {
          rocksOnCell.push({ playerId: pId, rockId: rObj.id });
        }
      });
    });
    
    rocksOnCell.push({ playerId, rockId });
    const N = rocksOnCell.length;
    const idx = N - 1;
    
    const angle = (idx * 2 * Math.PI) / N;
    const dist = N > 1 ? 12 : 0;
    const offsetX = Math.cos(angle) * dist;
    const offsetY = Math.sin(angle) * dist;
    
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gridEl = document.querySelector(".barakatta-board-grid");
    if (gridEl) {
      const posX = tileDiv.offsetLeft + tileDiv.offsetWidth / 2 + offsetX;
      const posY = tileDiv.offsetTop + tileDiv.offsetHeight / 2 + offsetY;
      
      const currentX = rockToken.dataset.posX ? Number(rockToken.dataset.posX) : posX;
      const currentY = rockToken.dataset.posY ? Number(rockToken.dataset.posY) : posY;
      
      let boardRotateZ = 0;
      if (game.mode === "online" && window.currentUser) {
        const matchedPId = Object.keys(game.players).find(pId => game.players[pId].username === window.currentUser.username);
        if (matchedPId === "player3") boardRotateZ = 180;
        else if (matchedPId === "player2") boardRotateZ = 270;
        else if (matchedPId === "player4") boardRotateZ = 90;
      }
      const tokenRotVal = `rotateZ(${-boardRotateZ}deg) rotateX(-46deg) rotateZ(-45deg)`;

      if (!prefersReducedMotion) {
        const mx = (currentX + posX) / 2;
        const my = (currentY + posY) / 2;
        
        rockToken.classList.add("rock-hopping");
        rockToken.style.setProperty("--ox", `${currentX}px`);
        rockToken.style.setProperty("--oy", `${currentY}px`);
        rockToken.style.setProperty("--mx", `${mx}px`);
        rockToken.style.setProperty("--my", `${my}px`);
        rockToken.style.setProperty("--nx", `${posX}px`);
        rockToken.style.setProperty("--ny", `${posY}px`);
        rockToken.style.setProperty("--base-z", `${baseZ}px`);
        rockToken.style.setProperty("--hop-z", `${baseZ + 20}px`);
        rockToken.style.setProperty("--token-rot", tokenRotVal);
        setTimeout(() => rockToken.classList.remove("rock-hopping"), 300);
      }
      
      rockToken.dataset.row = r;
      rockToken.dataset.col = c;
      rockToken.dataset.posX = posX;
      rockToken.dataset.posY = posY;
      
      rockToken.style.transform = `translate3d(${posX}px, ${posY}px, ${baseZ}px) ${tokenRotVal}`;
      
      if (rockToken.parentNode !== gridEl) {
        gridEl.appendChild(rockToken);
      }
    }
  }

  // Move a single rock token step-by-step along a path of cells
  function animateRockPath(playerId, rockId, path, onComplete) {
    if (!path || path.length <= 1) {
      if (onComplete) onComplete();
      return;
    }
    
    let currentStep = 1;
    
    function nextStep() {
      if (currentStep >= path.length) {
        if (onComplete) onComplete();
        return;
      }
      
      const cell = path[currentStep];
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) {
        playStepSound();
      } else {
        setTimeout(playStepSound, 400);
      }
      moveTokenToCell(playerId, rockId, cell.row, cell.col);
      
      currentStep++;
      setTimeout(nextStep, 400);
    }
    
    nextStep();
  }

  // Execute local/offline actions with path animation if MOVE_ROCK
  function executeLocalAction(playerId, action, isBot) {
    if (action.type === "MOVE_ROCK") {
      const path = game.getRockStepPath(playerId, action.rockId, action.steps);
      if (path && path.length > 1) {
        isAnimatingMove = true;
        animateRockPath(playerId, action.rockId, path, () => {
          isAnimatingMove = false;
          const summary = game.executeAction(playerId, action);
          if (isBot) {
            document.getElementById("bk-status-desc").textContent = `${game.players[playerId].name}: ${summary}`;
            completeBotTurnSequence();
          } else {
            document.getElementById("bk-status-desc").textContent = summary;
            completeTurnSequence();
          }
        });
        return;
      }
    }
    
    const summary = game.executeAction(playerId, action);
    if (isBot) {
      document.getElementById("bk-status-desc").textContent = `${game.players[playerId].name}: ${summary}`;
      completeBotTurnSequence();
    } else {
      document.getElementById("bk-status-desc").textContent = summary;
      completeTurnSequence();
    }
  }

  const AVATARS = [
    "assets/avatars/avatar_1.png",
    "assets/avatars/avatar_2.png",
    "assets/avatars/avatar_3.png",
    "assets/avatars/avatar_4.png",
    "assets/avatars/avatar_5.png",
    "assets/avatars/avatar_6.png"
  ];

  // Track the current setup mode (ai_bot or offline)
  let bkSetupMode = "offline";

  // Mode-aware player setup row renderer
  function renderBkSetupFields() {
    const container = document.getElementById("bk-players-setup-container");
    if (!container) return;
    container.innerHTML = "";

    const defaultNames = ["Allu", "Ranbir", "Zendaya", "Prabhas"];
    const isAiBot = bkSetupMode === "ai_bot";

    for (let i = 1; i <= bkSetupPlayerCount; i++) {
      const fieldRow = document.createElement("div");
      fieldRow.className = "player-setup-row";

      let defaultVal = bkSetupNames[i] || defaultNames[i - 1] || `Player ${i}`;

      // Build the right-side tag: none for offline, locked label for ai_bot
      let rightTag = "";
      if (isAiBot) {
        if (i === 1) {
          rightTag = `<span class="player-type-tag human-tag">👤 You</span>`;
        } else {
          rightTag = `<span class="player-type-tag bot-tag">🤖 AI Bot</span>`;
        }
      }
      // offline: no toggles, no tags — all human

      // Remove button only for offline mode, rows 3+
      let removeBtn = "";
      if (!isAiBot && i > 2) {
        removeBtn = `<button type="button" class="remove-player-btn" id="bk-setup-remove-btn-${i}" data-index="${i}">&times;</button>`;
      }

      fieldRow.innerHTML = `
        <label for="bk-setup-name-${i}">Player ${i}:</label>
        <div class="input-with-action">
          <button type="button" class="avatar-cycler-btn" id="bk-setup-avatar-btn-${i}" data-row="${i}">
            <img src="${AVATARS[bkSetupAvatars[i]]}" id="bk-setup-avatar-img-${i}" alt="Avatar">
            <span class="avatar-cycler-badge">Cycle</span>
          </button>
          <div class="input-row-main" style="flex: 1;">
            <div style="display: flex; gap: 8px; width: 100%; align-items: center;">
              <input type="text" id="bk-setup-name-${i}" class="player-name-input"
                value="${defaultVal}" placeholder="Enter Name" maxlength="15" required
                style="flex: 1;" ${isAiBot && i === 2 ? "readonly" : ""}>
              ${rightTag}
            </div>
          </div>
          ${removeBtn}
        </div>
      `;
      container.appendChild(fieldRow);

      // Avatar cycle — available for all rows except bot row in ai_bot mode
      const avatarBtnEl = document.getElementById(`bk-setup-avatar-btn-${i}`);
      if (avatarBtnEl) {
        if (isAiBot && i === 2) {
          // Bot avatar is fixed — disable cycling
          avatarBtnEl.style.opacity = "0.5";
          avatarBtnEl.style.pointerEvents = "none";
          const badge = avatarBtnEl.querySelector(".avatar-cycler-badge");
          if (badge) badge.style.display = "none";
        } else {
          avatarBtnEl.addEventListener("click", () => {
            playCycleSound();
            bkSetupAvatars[i] = (bkSetupAvatars[i] + 1) % AVATARS.length;
            const img = document.getElementById(`bk-setup-avatar-img-${i}`);
            if (img) img.src = AVATARS[bkSetupAvatars[i]];
          });
        }
      }

      // Remove player (offline only, rows 3+)
      if (!isAiBot && i > 2) {
        const removeBtnEl = document.getElementById(`bk-setup-remove-btn-${i}`);
        if (removeBtnEl) {
          removeBtnEl.addEventListener("click", () => {
            playTouchSound();
            for (let k = 1; k <= bkSetupPlayerCount; k++) {
              const inp = document.getElementById(`bk-setup-name-${k}`);
              if (inp) bkSetupNames[k] = inp.value;
            }
            for (let k = i; k < bkSetupPlayerCount; k++) {
              bkSetupNames[k] = bkSetupNames[k + 1];
              bkSetupAvatars[k] = bkSetupAvatars[k + 1];
              bkSetupTypes[k] = bkSetupTypes[k + 1];
            }
            delete bkSetupNames[bkSetupPlayerCount];
            delete bkSetupAvatars[bkSetupPlayerCount];
            delete bkSetupTypes[bkSetupPlayerCount];
            bkSetupPlayerCount--;
            renderBkSetupFields();
          });
        }
      }
    }

    // Add Player button — only visible in offline mode
    const addBtn = document.getElementById("bk-setup-add-btn");
    if (addBtn) {
      if (isAiBot) {
        addBtn.style.display = "none";
      } else {
        addBtn.style.display = "block";
        addBtn.style.opacity = bkSetupPlayerCount >= 4 ? "0.5" : "1";
        addBtn.style.pointerEvents = bkSetupPlayerCount >= 4 ? "none" : "auto";
      }
    }
  }

  // Show setup screen with mode-aware configuration
  window.showBarakattaSetup = function (defaultMode) {
    bkSetupMode = defaultMode || "offline";
    const isAiBot = bkSetupMode === "ai_bot";

    const screens = ["login-screen", "signup-screen", "forgot-password-screen", "dashboard-screen",
      "setup-screen", "game-screen", "game-selection-screen",
      "barakatta-dashboard-screen", "barakatta-game-screen", "barakatta-setup-screen"];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });

    const bkSetupView = document.getElementById("barakatta-setup-screen");
    if (bkSetupView) bkSetupView.classList.remove("hidden");

    // Update title and subtitle based on mode
    const setupSubtitle = document.getElementById("bk-setup-subtitle");
    const setupSectionLabel = document.getElementById("bk-setup-section-label");
    const setupHint = document.getElementById("bk-setup-hint");
    if (isAiBot) {
      if (setupSubtitle) setupSubtitle.textContent = "Play with AI Bot";
      if (setupSectionLabel) setupSectionLabel.textContent = "YOUR NAME & AVATAR:";
      if (setupHint) setupHint.textContent = "Click the avatar circle to choose your character!";
    } else {
      if (setupSubtitle) setupSubtitle.textContent = "Configure Local Match (2–4 Players)";
      if (setupSectionLabel) setupSectionLabel.textContent = "PLAYERS & AVATARS (2 – 4):";
      if (setupHint) setupHint.textContent = "Click the avatar circles to cycle characters!";
    }

    // Reset config
    bkSetupPlayerCount = 2;
    bkSetupNames = { 1: "Allu", 2: "Ranbir", 3: "Zendaya", 4: "Prabhas" };
    bkSetupAvatars = { 1: 0, 2: 1, 3: 2, 4: 3 };
    // For ai_bot: P1=human, P2=bot. For offline: all human.
    bkSetupTypes = {
      1: "human",
      2: isAiBot ? "bot" : "human",
      3: "human",
      4: "human"
    };

    // For ai_bot, force P2 name to "AI Bot"
    if (isAiBot) {
      bkSetupNames[2] = "AI Bot";
    }

    renderBkSetupFields();

    // Add Player button (offline only)
    const addBtn = document.getElementById("bk-setup-add-btn");
    if (addBtn) {
      addBtn.onclick = () => {
        if (bkSetupPlayerCount >= 4 || bkSetupMode === "ai_bot") return;
        playTouchSound();
        for (let k = 1; k <= bkSetupPlayerCount; k++) {
          const inp = document.getElementById(`bk-setup-name-${k}`);
          if (inp) bkSetupNames[k] = inp.value;
        }
        bkSetupPlayerCount++;
        const defNames = ["Allu", "Ranbir", "Zendaya", "Prabhas"];
        bkSetupNames[bkSetupPlayerCount] = defNames[bkSetupPlayerCount - 1] || `Player ${bkSetupPlayerCount}`;
        bkSetupAvatars[bkSetupPlayerCount] = (bkSetupPlayerCount - 1) % AVATARS.length;
        bkSetupTypes[bkSetupPlayerCount] = "human"; // offline: always human
        renderBkSetupFields();
      };
    }

    const backBtn = document.getElementById("bk-setup-back-btn");
    if (backBtn) {
      backBtn.onclick = () => {
        playTouchSound();
        if (window.showBarakattaDashboard) window.showBarakattaDashboard(window.currentUser);
      };
    }

    const startBtn = document.getElementById("bk-setup-start-btn");
    if (startBtn) {
      startBtn.onclick = () => {
        playTouchSound();
        const customPlayers = [];
        for (let i = 1; i <= bkSetupPlayerCount; i++) {
          const nameInput = document.getElementById(`bk-setup-name-${i}`);
          const name = nameInput ? nameInput.value.trim() : `Player ${i}`;
          customPlayers.push({
            name: name || `Player ${i}`,
            avatar: AVATARS[bkSetupAvatars[i]],
            isBot: bkSetupTypes[i] === "bot"
          });
        }
        window.startBarakattaGameCustom(bkSetupMode, bkSetupPlayerCount, customPlayers);
      };
    }
  };

  // Legacy initializer fallback
  window.startBarakattaGame = function (mode) {
    window.showBarakattaSetup(mode);
  };

  // Initialize Barakatta Game Screen with dynamic config
  window.startBarakattaGameCustom = function (mode, playerCount, customPlayers) {
    const screens = [
      "login-screen", "signup-screen", "forgot-password-screen", 
      "dashboard-screen", "setup-screen", "game-screen", 
      "game-selection-screen", "barakatta-dashboard-screen", 
      "barakatta-game-screen", "barakatta-setup-screen",
      "barakatta-online-lobby-screen", "barakatta-online-waiting-screen",
      "online-lobby-screen", "online-waiting-screen"
    ];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });

    const bkGameView = document.getElementById("barakatta-game-screen");
    if (bkGameView) {
      bkGameView.classList.remove("hidden");
    }

    // Instantiation
    game = new BarakattaGame(mode, playerCount, customPlayers);
    window.bkGame = game;

    // Reset grid reference to force recreation
    tilesGrid = null;

    // Start event listeners
    initEventListeners();

    // Trigger first turn
    triggerTurn();
  };

  function initEventListeners() {
    const diceElement = document.getElementById("bk-dice-element");
    const rollBtn = document.getElementById("bk-roll-btn");
    const passBtn = document.getElementById("bk-pass-btn");

    // Remove existing event listeners by cloning
    const newDice = diceElement.cloneNode(true);
    diceElement.parentNode.replaceChild(newDice, diceElement);
    const newRoll = rollBtn.cloneNode(true);
    rollBtn.parentNode.replaceChild(newRoll, rollBtn);
    if (passBtn) {
      const newPass = passBtn.cloneNode(true);
      passBtn.parentNode.replaceChild(newPass, passBtn);
    }

    document.getElementById("bk-dice-element").addEventListener("click", handleHumanRoll);
    document.getElementById("bk-roll-btn").addEventListener("click", handleHumanRoll);

    const activePassBtn = document.getElementById("bk-pass-btn");
    if (activePassBtn) {
      activePassBtn.addEventListener("click", handlePassTurn);
    }
  }

  // Initialize the DOM-based 3D Board structure
  function initDOMBoard() {
    const boardContainer = document.getElementById("barakatta-board-3d");
    if (!boardContainer) return;

    boardContainer.innerHTML = "";

    const gridDiv = document.createElement("div");
    gridDiv.className = "barakatta-board-grid";
    boardContainer.appendChild(gridDiv);

    tilesGrid = Array.from({ length: 7 }, () => Array(7).fill(null));

    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const tileDiv = document.createElement("div");
        tileDiv.className = "tile";

        const isLight = ((r + c) % 2 === 0);
        tileDiv.style.setProperty("--tile-color", isLight ? "#c49c74" : "#5c3a21");
        tileDiv.style.setProperty("--tile-color-shadow", isLight ? "#99734d" : "#3b2210");
        tileDiv.style.setProperty("--tile-color-shadow-darker", isLight ? "#7e5b38" : "#2d1808");

        const isSafe = BARAKATTA_BOARD.safeSquares.some(s => s.row === r && s.col === c);

        const topDiv = document.createElement("div");
        topDiv.className = "tile-top" + (isSafe ? " safe-tile" : "");

        if (isSafe) {
          // Add player starting location highlight rims
          if (r === 6 && c === 3) topDiv.classList.add("rim-p1");
          else if (r === 0 && c === 3) topDiv.classList.add("rim-p3");

          // Render Extruded Chrome-Tube X Mark vector SVG
          topDiv.innerHTML = `
            <svg class="tile-x-icon" viewBox="0 0 40 40">
              <defs>
                <linearGradient id="chrome-grad-${r}-${c}" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#7a7a7a" />
                  <stop offset="25%" stop-color="#ffffff" />
                  <stop offset="50%" stop-color="#999999" />
                  <stop offset="75%" stop-color="#ffffff" />
                  <stop offset="100%" stop-color="#5a5a5a" />
                </linearGradient>
              </defs>
              <line x1="8" y1="9" x2="32" y2="33" stroke="#111111" stroke-width="5" stroke-linecap="round" />
              <line x1="32" y1="9" x2="8" y2="33" stroke="#111111" stroke-width="5" stroke-linecap="round" />
              <line x1="8" y1="8" x2="32" y2="32" stroke="url(#chrome-grad-${r}-${c})" stroke-width="4.5" stroke-linecap="round" />
              <line x1="30" y1="8" x2="6" y2="32" stroke="url(#chrome-grad-${r}-${c})" stroke-width="2.5" stroke-linecap="round" />
              <line x1="34" y1="8" x2="10" y2="32" stroke="url(#chrome-grad-${r}-${c})" stroke-width="2.5" stroke-linecap="round" />
              <line x1="8" y1="7.5" x2="32" y2="31.5" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />
            </svg>
          `;
        }

        const sideBottom = document.createElement("div");
        sideBottom.className = "tile-side-bottom";

        const sideRight = document.createElement("div");
        sideRight.className = "tile-side-right";

        tileDiv.appendChild(topDiv);
        tileDiv.appendChild(sideBottom);
        tileDiv.appendChild(sideRight);

        tileDiv.addEventListener("click", () => handleTileClick(r, c));

        gridDiv.appendChild(tileDiv);
        tilesGrid[r][c] = tileDiv;
      }
    }

    // Generate counter-clockwise arrow overlay matching the drawing
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("id", "bk-dynamic-path-svg");
    svg.setAttribute("viewBox", "0 0 700 700");
    svg.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5; transform: translateZ(10.2px); transform-style: preserve-3d;";

    const defs = document.createElementNS(svgNS, "defs");

    // Create markers for each player
    Object.keys(playerConfig).forEach(playerId => {
      const marker = document.createElementNS(svgNS, "marker");
      marker.setAttribute("id", `bk-arrow-${playerId}`);
      marker.setAttribute("viewBox", "0 0 10 10");
      marker.setAttribute("refX", "6");
      marker.setAttribute("refY", "5");
      marker.setAttribute("markerWidth", "5");
      marker.setAttribute("markerHeight", "5");
      marker.setAttribute("orient", "auto-start-reverse");

      const markerPath = document.createElementNS(svgNS, "path");
      markerPath.setAttribute("d", "M 0 1.5 L 8 5 L 0 8.5 z");
      markerPath.setAttribute("fill", playerConfig[playerId].color);
      marker.appendChild(markerPath);
      defs.appendChild(marker);
    });
    svg.appendChild(defs);

    // Create dynamic lines container
    const dynamicLinesContainer = document.createElementNS(svgNS, "g");
    dynamicLinesContainer.setAttribute("id", "bk-dynamic-lines-container");
    svg.appendChild(dynamicLinesContainer);

    boardContainer.appendChild(svg);
  }

  // Draw highlight path for active preview
  function drawHighlightPath(playerId, path) {
    const dynamicLinesContainer = document.getElementById("bk-dynamic-lines-container");
    if (!dynamicLinesContainer) return;
    dynamicLinesContainer.innerHTML = "";

    if (!path || path.length < 2) return;

    const svgNS = "http://www.w3.org/2000/svg";
    const color = playerConfig[playerId].color;
    const offset = playerOffsets[playerId];

    // Draw glowing circles (dots) at each cell of the path (excluding the start cell)
    for (let i = 1; i < path.length; i++) {
      const cell = path[i];
      const cx = cell.col * 100 + 50 + offset.dx;
      const cy = cell.row * 100 + 50 + offset.dy;

      // Draw a glowing outer circle/halo for the dot
      const dotHalo = document.createElementNS(svgNS, "circle");
      dotHalo.setAttribute("cx", cx);
      dotHalo.setAttribute("cy", cy);
      dotHalo.setAttribute("r", "10");
      dotHalo.setAttribute("fill", color);
      dotHalo.setAttribute("opacity", "0.4");
      dotHalo.style.filter = `drop-shadow(0 0 4px ${color})`;
      dynamicLinesContainer.appendChild(dotHalo);

      // Draw a bright inner dot
      const dotInner = document.createElementNS(svgNS, "circle");
      dotInner.setAttribute("cx", cx);
      dotInner.setAttribute("cy", cy);
      dotInner.setAttribute("r", "5");
      dotInner.setAttribute("fill", "#ffffff");
      dotInner.setAttribute("opacity", "1");
      dynamicLinesContainer.appendChild(dotInner);
    }
  }

  // Clear highlight path and tile target highlights
  function clearHighlightPath() {
    const dynamicLinesContainer = document.getElementById("bk-dynamic-lines-container");
    if (dynamicLinesContainer) dynamicLinesContainer.innerHTML = "";
    document.querySelectorAll(".tile-top").forEach(el => el.classList.remove("target-highlight"));
  }

  // Draw the complete board
  function drawBoard() {
    window.bkDrawBoard = drawBoard; // Expose for self-healing
    if (!game) return;

    // Dynamically rotate board so local player's home slot is always at the bottom
    const boardEl = document.getElementById("barakatta-board-3d");
    if (boardEl) {
      let rotateZ = 0;
      if (game.mode === "online" && window.currentUser) {
        const matchedPId = Object.keys(game.players).find(pId => game.players[pId].username === window.currentUser.username);
        if (matchedPId === "player3") rotateZ = 180;
        else if (matchedPId === "player2") rotateZ = 270;
        else if (matchedPId === "player4") rotateZ = 90;
      }
      boardEl.style.transform = `rotateX(46deg) rotateZ(${rotateZ}deg)`;
    }

    if (!tilesGrid) {
      initDOMBoard();
    }

    // Reset previous highlights on all tiles
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (tilesGrid[r][c]) {
          const tileTop = tilesGrid[r][c].querySelector(".tile-top");
          if (tileTop) tileTop.classList.remove("legal-highlight");
        }
      }
    }

    // Highlight legal active moves on the tiles for the active player
    const isHuman = !game.players[game.currentTurn].isBot;
    const legalActions = (isHuman && game.rollState === "rolled")
      ? game.getLegalActions(game.currentTurn, game.diceValue)
      : [];

    legalActions.forEach(act => {
      if (act.type === "MOVE_ROCK") {
        const cell = game.getRockCell(game.currentTurn, act.rockId);
        if (cell && tilesGrid[cell.row] && tilesGrid[cell.row][cell.col]) {
          const tileTop = tilesGrid[cell.row][cell.col].querySelector(".tile-top");
          if (tileTop) tileTop.classList.add("legal-highlight");
        }
      }
    });

    // Render rock tokens
    renderRocksOnBoard();
    updateYardDisplay();
  }

  // Update rock displays in player yards
  function updateYardDisplay() {
    const fullOrder = ["player1", "player2", "player3", "player4"];
    fullOrder.forEach(pId => {
      const yardBox = document.getElementById(`bk-${pId}-yard`);
      const yardRocks = document.getElementById(`bk-${pId}-yard-rocks`);
      const homeSpan = document.getElementById(`bk-${pId}-home-count`);

      if (game.players[pId]) {
        const player = game.players[pId];
        if (yardBox) {
          yardBox.style.display = "block";
          const title = yardBox.querySelector("h4");
          if (title) title.textContent = `${player.name}'s Yard`;
        }
        if (yardRocks) {
          yardRocks.innerHTML = "";
          const yardCount = game.getYardRocks(pId).length;
          for (let i = 0; i < yardCount; i++) {
            const rock = document.createElement("div");
            const imgColor = pId === "player1" ? "red" : (pId === "player2" ? "green" : (pId === "player3" ? "yellow" : "blue"));
            rock.style.cssText = `width: 14px; height: 14px; border-radius: 50%; background-image: url('assets/barakatta/demon_${imgColor}.jpg'); background-size: cover; border: 1px solid rgba(0,0,0,0.2);`;
            yardRocks.appendChild(rock);
          }
        }
        if (homeSpan) {
          homeSpan.parentNode.style.display = "flex";
          const labelSpan = homeSpan.parentNode.querySelector("span");
          if (labelSpan) labelSpan.textContent = `${player.name} Home:`;
          homeSpan.textContent = `${player.rocks.filter(r => r.status === "home").length}/6`;
        }
      } else {
        if (yardBox) yardBox.style.display = "none";
        if (homeSpan) homeSpan.parentNode.style.display = "none";
      }
    });
  }

  // Clear clickable highlights and event listeners from all yards
  function clearYardClickListeners() {
    const fullOrder = ["player1", "player2", "player3", "player4"];
    fullOrder.forEach(pId => {
      const yBox = document.getElementById(`bk-${pId}-yard`);
      if (yBox) {
        yBox.classList.remove("bk-yard-clickable-highlight");
        yBox.onclick = null;
      }
    });
  }

  // Synthesize a realistic dice rolling/tumbling sound effect using the Web Audio API
  function playSynthesizedDiceRollSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;

      // Number of tumbles/bounces
      const numBounces = 5 + Math.floor(Math.random() * 3); // 5 to 7 tumbles
      let time = now;

      for (let i = 0; i < numBounces; i++) {
        // Schedule each bounce with a slight progressive delay
        const bounceDelay = 0.10 + i * 0.08 + Math.random() * 0.05;
        time += bounceDelay;

        // Volume decays slightly as the dice slows down
        const volume = 0.12 * (1 - (i / numBounces) * 0.4);

        // 1. Low impact thud (Triangle wave)
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = "triangle";
        
        // Pitch sweeps down to simulate impact on a wooden/plastic surface
        osc.frequency.setValueAtTime(140 + Math.random() * 30, time);
        osc.frequency.exponentialRampToValueAtTime(35, time + 0.07);

        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(volume, time + 0.008);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start(time);
        osc.stop(time + 0.08);

        // 2. Plastic rattle noise (Filtered White Noise)
        const bufferSize = audioCtx.sampleRate * 0.04; // 40ms noise burst
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) {
          data[j] = Math.random() * 2 - 1;
        }

        const noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(700 + Math.random() * 200, time);
        filter.Q.setValueAtTime(3.5, time);

        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0, time);
        noiseGain.gain.linearRampToValueAtTime(volume * 0.5, time + 0.004);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

        noiseNode.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);

        noiseNode.start(time);
        noiseNode.stop(time + 0.04);
      }
    } catch (e) {
      console.warn("Dice AudioContext playback failed:", e);
    }
  }

  function playDiceRollSound() {
    try {
      const diceAudio = new Audio('assets/freesound_community-rolling-dice-2-102706.mp3');
      diceAudio.volume = 0.6;
      diceAudio.play().catch(e => {
        console.warn("Dice custom audio play failed, falling back to synthesis:", e);
        playSynthesizedDiceRollSound();
      });
    } catch (err) {
      console.warn("Dice custom audio load failed, falling back to synthesis:", err);
      playSynthesizedDiceRollSound();
    }
  }

  // Render and animate 3D rock tokens on board
  function renderRocksOnBoard() {
    if (!game || !tilesGrid) return;

    // Group active board / home rocks by cell coordinates
    const cellMap = {};
    Object.keys(game.players).forEach(playerId => {
      const player = game.players[playerId];
      player.rocks.forEach(rock => {
        let cell = null;
        if (rock.status === "active" || rock.status === "blocked") {
          cell = game.getRockCell(playerId, rock.id);
        } else if (rock.status === "home") {
          cell = { row: 3, col: 3 }; // Center tile
        }

        if (cell) {
          const key = `${cell.row}_${cell.col}`;
          if (!cellMap[key]) cellMap[key] = [];
          cellMap[key].push({ playerId, rockId: rock.id, rock });
        }
      });
    });

    // Remove any rock tokens in the DOM whose status is now yard
    const activeRockIds = new Set();
    Object.keys(cellMap).forEach(key => {
      cellMap[key].forEach(item => {
        activeRockIds.add(`bk-rock-${item.playerId}-${item.rockId}`);
      });
    });

    const allRockTokens = document.querySelectorAll(".rock-token");
    allRockTokens.forEach(token => {
      if (!activeRockIds.has(token.id) && !token.classList.contains("rock-captured")) {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!prefersReducedMotion) {
          document.getElementById("barakatta-board-3d").appendChild(token);
          token.classList.add("rock-captured");
          setTimeout(() => token.remove(), 600);
        } else {
          token.remove();
        }
      }
    });

    // Render / reposition all active rocks
    Object.keys(cellMap).forEach(key => {
      const [r, c] = key.split("_").map(Number);
      const tileDiv = tilesGrid[r] ? tilesGrid[r][c] : null;
      if (!tileDiv) return;

      const isSafe = BARAKATTA_BOARD.safeSquares.some(s => s.row === r && s.col === c);
      const baseZ = isSafe ? 22 : 18;

      const rocks = cellMap[key];
      const N = rocks.length;

      rocks.forEach((item, idx) => {
        const domId = `bk-rock-${item.playerId}-${item.rockId}`;
        let rockToken = document.getElementById(domId);
        const isNew = !rockToken;

        if (isNew) {
          rockToken = document.createElement("div");
          rockToken.id = domId;
          rockToken.className = `rock-token ${item.playerId}`;
        }

        // Calculate staggered 3D offset
        const angle = (idx * 2 * Math.PI) / N;
        const dist = N > 1 ? 12 : 0;
        const offsetX = Math.cos(angle) * dist;
        const offsetY = Math.sin(angle) * dist;

        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const gridEl = document.querySelector(".barakatta-board-grid");
        if (gridEl) {
          const posX = tileDiv.offsetLeft + tileDiv.offsetWidth / 2 + offsetX;
          const posY = tileDiv.offsetTop + tileDiv.offsetHeight / 2 + offsetY;

          // Animate hop if moving to a new cell
          const currentR = rockToken.dataset.row ? Number(rockToken.dataset.row) : null;
          const currentX = rockToken.dataset.posX ? Number(rockToken.dataset.posX) : null;
          const currentY = rockToken.dataset.posY ? Number(rockToken.dataset.posY) : null;

          if (currentR !== null && currentR !== r && !prefersReducedMotion) {
            const hopOffsetX = currentX - posX;
            const hopOffsetY = currentY - posY;

            rockToken.classList.add("rock-hopping");
            rockToken.style.setProperty("--ox", `${hopOffsetX}px`);
            rockToken.style.setProperty("--oy", `${hopOffsetY}px`);
            rockToken.style.setProperty("--base-z", `${baseZ}px`);
            rockToken.style.setProperty("--hop-z", `${baseZ + 20}px`);
            setTimeout(() => rockToken.classList.remove("rock-hopping"), 400);
          }

          // Update dataset attributes
          rockToken.dataset.row = r;
          rockToken.dataset.col = c;
          rockToken.dataset.posX = posX;
          rockToken.dataset.posY = posY;

          // Calculate counter-rotation for token based on board's rotation to keep them upright relative to the screen perspective
          let boardRotateZ = 0;
          if (game.mode === "online" && window.currentUser) {
            const matchedPId = Object.keys(game.players).find(pId => game.players[pId].username === window.currentUser.username);
            if (matchedPId === "player3") boardRotateZ = 180;
            else if (matchedPId === "player2") boardRotateZ = 270;
            else if (matchedPId === "player4") boardRotateZ = 90;
          }
          const tokenRotVal = `rotateZ(${-boardRotateZ}deg) rotateX(-46deg) rotateZ(-45deg)`;
          rockToken.style.setProperty("--token-rot", tokenRotVal);

          gridEl.appendChild(rockToken);
          rockToken.style.transform = `translate3d(${posX}px, ${posY}px, ${baseZ}px) ${tokenRotVal}`;
        }

        // Mouse hover preview path
        rockToken.onmouseenter = () => {
          const isHuman = !game.players[game.currentTurn].isBot;
          if (!isHuman || game.rollState !== "rolled") return;

          // If no rock is selected, show path on hover
          if (selectedRockId === null) {
            const path = game.getRockStepPath(game.currentTurn, item.rockId, game.diceValue);
            if (path) {
              clearHighlightPath();
              drawHighlightPath(game.currentTurn, path);
              
              const targetCell = path[path.length - 1];
              if (tilesGrid[targetCell.row] && tilesGrid[targetCell.row][targetCell.col]) {
                const targetTile = tilesGrid[targetCell.row][targetCell.col].querySelector(".tile-top");
                if (targetTile) targetTile.classList.add("target-highlight");
              }
            }
          }
        };

        rockToken.onmouseleave = () => {
          if (selectedRockId === null) {
            clearHighlightPath();
          }
        };
      });
    });
  }

  // Trigger state transitions on each turn start
  function triggerTurn() {
    if (!game) return;

    const passBtn = document.getElementById("bk-pass-btn");
    if (passBtn) passBtn.style.display = "none";

    const turnLabel = document.getElementById("bk-active-player-name");
    const statusTitle = document.getElementById("bk-status-title");
    const statusDesc = document.getElementById("bk-status-desc");
    const rollBtn = document.getElementById("bk-roll-btn");

    const activePlayer = game.players[game.currentTurn];
    const isBotTurn = !!activePlayer.isBot;

    turnLabel.textContent = activePlayer.name;
    turnLabel.style.color = playerConfig[game.currentTurn].color;

    // Online multiplayer check
    const isMyTurn = (game.mode === "online") ? (window.currentUser && activePlayer.username === window.currentUser.username) : true;

    if (!isBotTurn) {
      statusTitle.textContent = `${activePlayer.name}'s Turn`;
      
      if (isMyTurn) {
        statusDesc.textContent = "Roll the dice to proceed.";
        rollBtn.removeAttribute("disabled");
        if (game.rollState === "rolled") {
          evaluateHumanActions();
        }
      } else {
        rollBtn.setAttribute("disabled", "true");
        if (game.rollState === "rolled") {
          statusDesc.textContent = `${activePlayer.name} rolled a ${game.diceValue}. Waiting for their move...`;
        } else {
          statusDesc.textContent = `Waiting for ${activePlayer.name} to roll...`;
        }
      }
    } else {
      statusTitle.textContent = `${activePlayer.name}'s Turn`;
      statusDesc.textContent = `${activePlayer.name} is planning its move...`;
      rollBtn.setAttribute("disabled", "true");

      setTimeout(handleBotTurn, 800);
    }

    drawBoard();
  }

  // Handle dice rolling event
  function handleHumanRoll() {
    if (isAnimatingMove) return;
    if (isRolling || game.rollState !== "idle") return;

    const isPlayerTurn = !game.players[game.currentTurn].isBot;
    if (!isPlayerTurn) return;

    // Online multiplayer check
    if (game.mode === "online") {
      const activePlayerObj = game.players[game.currentTurn];
      if (!window.currentUser || activePlayerObj.username !== window.currentUser.username) {
        return; // Not their turn
      }
    }

    isRolling = true;
    playDiceRollSound();
    const diceElement = document.getElementById("bk-dice-element");
    const rollBtn = document.getElementById("bk-roll-btn");
    
    rollBtn.setAttribute("disabled", "true");

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    if (game.mode === "online" && window.bkMultiplayer) {
      let interval = null;
      if (!prefersReducedMotion) {
        interval = setInterval(() => {
          const tempX = Math.floor(Math.random() * 360);
          const tempY = Math.floor(Math.random() * 360);
          diceElement.style.transform = `rotateX(${tempX}deg) rotateY(${tempY}deg)`;
        }, 80);
      }

      window.bkMultiplayer.sendRollAction().then((rollValue) => {
        setTimeout(() => {
          if (interval) clearInterval(interval);
          isRolling = false;
          
          game.diceValue = rollValue;
          game.rollState = "rolled";
          
          currentRollCount++;
          const baseRot = diceRotations[rollValue];
          const spinX = baseRot.x + currentRollCount * 1440;
          const spinY = baseRot.y + currentRollCount * 1440;
          diceElement.style.transform = `rotateX(${spinX}deg) rotateY(${spinY}deg)`;

          setTimeout(() => {
            evaluateHumanActions();
          }, prefersReducedMotion ? 0 : 400);
        }, prefersReducedMotion ? 0 : 800);
      }).catch((err) => {
        if (interval) clearInterval(interval);
        isRolling = false;
        rollBtn.removeAttribute("disabled");
        alert("Roll failed: " + err.message);
      });
    } else {
      // Offline mode
      let duration = prefersReducedMotion ? 0 : 1000;

      if (!prefersReducedMotion) {
        let interval = setInterval(() => {
          const tempX = Math.floor(Math.random() * 360);
          const tempY = Math.floor(Math.random() * 360);
          diceElement.style.transform = `rotateX(${tempX}deg) rotateY(${tempY}deg)`;
        }, 80);

        setTimeout(() => {
          clearInterval(interval);
          finalizeRoll();
        }, duration);
      } else {
        finalizeRoll();
      }
    }

    function finalizeRoll() {
      isRolling = false;
      const roll = game.generatePityRoll(game.currentTurn);
      game.diceValue = roll;
      game.rollState = "rolled";

      currentRollCount++;
      const baseRot = diceRotations[roll];
      const spinX = baseRot.x + currentRollCount * 1440;
      const spinY = baseRot.y + currentRollCount * 1440;
      diceElement.style.transform = `rotateX(${spinX}deg) rotateY(${spinY}deg)`;

      setTimeout(() => {
        evaluateHumanActions();
      }, prefersReducedMotion ? 0 : 400);
    }
  }

  function handlePassTurn() {
    if (isAnimatingMove) return;
    if (isRolling || game.rollState !== "rolled") return;

    // Online multiplayer check
    if (game.mode === "online") {
      const activePlayerObj = game.players[game.currentTurn];
      if (!window.currentUser || activePlayerObj.username !== window.currentUser.username) {
        return; // Not their turn
      }
    }

    const passBtn = document.getElementById("bk-pass-btn");
    if (passBtn) passBtn.style.display = "none";

    if (game.mode === "online" && window.bkMultiplayer) {
      window.bkMultiplayer.sendPassAction().catch(err => {
        console.error("Pass action failed:", err);
        window.bkMultiplayer.forceResyncState();
      });
    } else {
      // Offline mode
      saveMatchState();
      game.nextTurn();
      triggerTurn();
    }
  }

  // Evaluate action choices and auto-execute entries
  function evaluateHumanActions() {
    const actions = game.getLegalActions(game.currentTurn, game.diceValue);

    // Clean up any previous yard listeners/glowing classes
    clearYardClickListeners();

    if (actions.length === 0) {
      const activeName = game.players[game.currentTurn].name;
      document.getElementById("bk-status-title").textContent = `${activeName} Has No Moves!`;
      document.getElementById("bk-status-desc").textContent = `${activeName} rolled a ${game.diceValue}. Turn is skipped.`;
      
      setTimeout(() => {
        if (game.mode === "online" && window.bkMultiplayer) {
          window.bkMultiplayer.sendPassAction().catch(err => {
            console.error("Pass action failed:", err);
            window.bkMultiplayer.forceResyncState();
          });
        } else {
          game.nextTurn();
          triggerTurn();
        }
      }, 1800);
      return;
    }

    drawBoard();

    const hasEnter1 = actions.some(act => act.type === "ENTER_1_OPTIONAL");
    const hasEnterAll = actions.some(act => act.type === "ENTER_ALL_6");
    const hasMoves = actions.some(act => act.type === "MOVE_ROCK");

    // Always allow passing if they rolled a 1
    if (game.diceValue === 1) {
      const passBtn = document.getElementById("bk-pass-btn");
      if (passBtn) passBtn.style.display = "block";
    }

    if (hasEnter1 || hasEnterAll) {

      const yardBox = document.getElementById(`bk-${game.currentTurn}-yard`);
      if (yardBox) {
        yardBox.classList.add("bk-yard-clickable-highlight");
        const pColor = game.players[game.currentTurn].color === "red" ? "#ef4444" : 
                       (game.players[game.currentTurn].color === "yellow" ? "#eab308" : 
                       (game.players[game.currentTurn].color === "green" ? "#10b981" : "#3b82f6"));
        yardBox.style.setProperty("--glow-color", pColor);

        yardBox.onclick = () => {
          clearYardClickListeners();
          clearHighlightPath();
          selectedRockId = null;

          const action = actions.find(act => act.type === "ENTER_1_OPTIONAL" || act.type === "ENTER_ALL_6");
          if (action) {
            if (game.mode === "online" && window.bkMultiplayer) {
              window.bkMultiplayer.sendMoveAction(action).then((summary) => {
                document.getElementById("bk-status-desc").textContent = summary;
              }).catch((err) => {
                console.error("Yard enter action failed:", err);
                window.bkMultiplayer.forceResyncState();
              });
            } else {
              executeLocalAction(game.currentTurn, action, false);
            }
          }
        };
      }

      if (hasMoves) {
        document.getElementById("bk-status-desc").textContent = "Click your glowing Yard to enter a demon, or click a board piece to move.";
      } else {
        document.getElementById("bk-status-desc").textContent = "Click your glowing Yard to enter a demon.";
      }
    } else {
      const activeName = game.players[game.currentTurn].name;
      document.getElementById("bk-status-desc").textContent = `${activeName}: Select one of your glowing rocks on the board to move it ${game.diceValue} spaces.`;
    }
  }

  // Handle board tile clicking directly
  function handleTileClick(row, col) {
    if (isAnimatingMove) return;
    const isPlayerTurn = !game.players[game.currentTurn].isBot;
    if (!isPlayerTurn || game.rollState !== "rolled") return;

    // Online multiplayer check
    if (game.mode === "online") {
      const activePlayerObj = game.players[game.currentTurn];
      if (!window.currentUser || activePlayerObj.username !== window.currentUser.username) {
        return; // Not their turn
      }
    }

    const actions = game.getLegalActions(game.currentTurn, game.diceValue);
    
    // Find if a rock of the active player on this tile is clicked
    const clickedRockAction = actions.find(act => {
      if (act.type !== "MOVE_ROCK") return false;
      const rockCell = game.getRockCell(game.currentTurn, act.rockId);
      return rockCell && rockCell.row === row && rockCell.col === col;
    });

    if (clickedRockAction) {
      const rockId = clickedRockAction.rockId;
      
      // If this rock is already selected, execute the move!
      if (selectedRockId === rockId) {
        selectedRockId = null;
        clearHighlightPath();
        clearYardClickListeners();
        if (game.mode === "online" && window.bkMultiplayer) {
          window.bkMultiplayer.sendMoveAction(clickedRockAction).then((summary) => {
            document.getElementById("bk-status-desc").textContent = summary;
          }).catch((err) => {
            console.error("Rock move action failed:", err);
            window.bkMultiplayer.forceResyncState();
          });
        } else {
          executeLocalAction(game.currentTurn, clickedRockAction, false);
        }
      } else {
        // Otherwise, select this rock and show its step-by-step path
        selectedRockId = rockId;
        const path = game.getRockStepPath(game.currentTurn, rockId, game.diceValue);
        activeHighlightPath = path;
        
        clearHighlightPath();
        drawHighlightPath(game.currentTurn, path);
        
        // Highlight the target cell
        if (path && path.length > 0) {
          const targetCell = path[path.length - 1];
          if (tilesGrid[targetCell.row] && tilesGrid[targetCell.row][targetCell.col]) {
            const tileTop = tilesGrid[targetCell.row][targetCell.col].querySelector(".tile-top");
            if (tileTop) tileTop.classList.add("target-highlight");
          }
        }
        
        document.getElementById("bk-status-desc").textContent = "Tap the selected rock again (or its green destination tile) to move it.";
      }
      return;
    }

    // Alternatively, if they click the highlighted target cell, execute the move for the selected rock!
    if (selectedRockId !== null && activeHighlightPath) {
      const targetCell = activeHighlightPath[activeHighlightPath.length - 1];
      if (row === targetCell.row && col === targetCell.col) {
        const confirmAction = actions.find(act => act.type === "MOVE_ROCK" && act.rockId === selectedRockId);
        if (confirmAction) {
          selectedRockId = null;
          clearHighlightPath();
          clearYardClickListeners();
          if (game.mode === "online" && window.bkMultiplayer) {
            window.bkMultiplayer.sendMoveAction(confirmAction).then((summary) => {
              document.getElementById("bk-status-desc").textContent = summary;
            }).catch((err) => {
              console.error("Confirm move action failed:", err);
              window.bkMultiplayer.forceResyncState();
            });
          } else {
            executeLocalAction(game.currentTurn, confirmAction, false);
          }
          return;
        }
      }
    }

    // If they click anywhere else, clear selection
    selectedRockId = null;
    clearHighlightPath();
    const activeName = game.players[game.currentTurn].name;
    document.getElementById("bk-status-desc").textContent = `${activeName}: Select one of your glowing rocks on the board to move it ${game.diceValue} spaces.`;
  }

  function completeTurnSequence() {
    selectedRockId = null;
    activeHighlightPath = null;
    clearHighlightPath();
    clearYardClickListeners();
    drawBoard();

    if (game.status !== "in_progress") {
      handleGameOver();
      return;
    }

    saveMatchState();
    game.nextTurn();
    triggerTurn();
  }

  // Bot Turn Handler
  function handleBotTurn() {
    const activeBotId = game.currentTurn;
    if (game.status !== "in_progress" || !game.players[activeBotId].isBot) return;

    // In online mode, ONLY the host coordinates bot turns
    if (game.mode === "online") {
      if (!window.bkMultiplayer || !window.bkMultiplayer.isHost) {
        return; 
      }
    }

    const diceElement = document.getElementById("bk-dice-element");
    playDiceRollSound();
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    if (game.mode === "online") {
      let interval = null;
      if (!prefersReducedMotion) {
        interval = setInterval(() => {
          const tempX = Math.floor(Math.random() * 360);
          const tempY = Math.floor(Math.random() * 360);
          diceElement.style.transform = `rotateX(${tempX}deg) rotateY(${tempY}deg)`;
        }, 80);
      }

      window.bkMultiplayer.sendRollAction().then((rollValue) => {
        setTimeout(() => {
          if (interval) clearInterval(interval);
          
          game.diceValue = rollValue;
          game.rollState = "rolled";
          
          currentRollCount++;
          const baseRot = diceRotations[rollValue];
          const spinX = baseRot.x + currentRollCount * 1440;
          const spinY = baseRot.y + currentRollCount * 1440;
          diceElement.style.transform = `rotateX(${spinX}deg) rotateY(${spinY}deg)`;

          setTimeout(() => {
            const actions = game.getLegalActions(activeBotId, rollValue);

            const isBotYardEmpty = game.getBoardRocks(activeBotId).length === 0;
            if (rollValue === 1 && isBotYardEmpty && Math.random() < 0.5) {
              const activeBotName = game.players[activeBotId].name;
              document.getElementById("bk-status-title").textContent = `${activeBotName} Passes Turn`;
              document.getElementById("bk-status-desc").textContent = `${activeBotName} rolled a 1 and chooses to PASS.`;
              
              setTimeout(() => {
                window.bkMultiplayer.sendPassAction().catch(err => {
                  console.error("Bot pass failed:", err);
                  window.bkMultiplayer.forceResyncState();
                });
              }, 1500);
              return;
            }
            
            if (actions.length === 0) {
              const activeBotName = game.players[activeBotId].name;
              document.getElementById("bk-status-title").textContent = `${activeBotName} Has No Moves!`;
              document.getElementById("bk-status-desc").textContent = `${activeBotName} rolled a ${rollValue}. Skips turn.`;
              
              setTimeout(() => {
                window.bkMultiplayer.sendPassAction().catch(err => {
                  console.error("Bot pass failed:", err);
                  window.bkMultiplayer.forceResyncState();
                });
              }, 1500);
              return;
            }

            const chosenAction = game.getBotDecision(actions);
            if (chosenAction) {
              if (chosenAction.type === "MOVE_ROCK") {
                const path = game.getRockStepPath(activeBotId, chosenAction.rockId, chosenAction.steps);
                if (path) {
                  clearHighlightPath();
                  drawHighlightPath(activeBotId, path);
                  
                  const targetCell = path[path.length - 1];
                  if (tilesGrid[targetCell.row] && tilesGrid[targetCell.row][targetCell.col]) {
                    const targetTile = tilesGrid[targetCell.row][targetCell.col].querySelector(".tile-top");
                    if (targetTile) targetTile.classList.add("target-highlight");
                  }
                }
                
                setTimeout(() => {
                  clearHighlightPath();
                  window.bkMultiplayer.sendMoveAction(chosenAction).then((summary) => {
                    document.getElementById("bk-status-desc").textContent = `${game.players[activeBotId].name}: ${summary}`;
                  }).catch((err) => {
                    console.error("Bot move failed:", err);
                    window.bkMultiplayer.forceResyncState();
                  });
                }, 800);
              } else {
                window.bkMultiplayer.sendMoveAction(chosenAction).then((summary) => {
                  document.getElementById("bk-status-desc").textContent = `${game.players[activeBotId].name}: ${summary}`;
                }).catch((err) => {
                  console.error("Bot move failed:", err);
                  window.bkMultiplayer.forceResyncState();
                });
              }
            }
          }, prefersReducedMotion ? 0 : 500);
        }, prefersReducedMotion ? 0 : 800);
      }).catch((err) => {
        if (interval) clearInterval(interval);
        console.error("Bot roll transaction failed:", err);
      });

    } else {
      // Offline mode
      let duration = prefersReducedMotion ? 0 : 1000;

      if (!prefersReducedMotion) {
        let interval = setInterval(() => {
          const tempX = Math.floor(Math.random() * 360);
          const tempY = Math.floor(Math.random() * 360);
          diceElement.style.transform = `rotateX(${tempX}deg) rotateY(${tempY}deg)`;
        }, 80);

        setTimeout(() => {
          clearInterval(interval);
          finalizeBotRoll();
        }, duration);
      } else {
        finalizeBotRoll();
      }
    }

    function finalizeBotRoll() {
      const roll = game.generatePityRoll(activeBotId);
      game.diceValue = roll;

      currentRollCount++;
      const baseRot = diceRotations[roll];
      const spinX = baseRot.x + currentRollCount * 1440;
      const spinY = baseRot.y + currentRollCount * 1440;
      diceElement.style.transform = `rotateX(${spinX}deg) rotateY(${spinY}deg)`;

      setTimeout(() => {
        const actions = game.getLegalActions(activeBotId, roll);

        const isBotYardEmpty = game.getBoardRocks(activeBotId).length === 0;
        if (roll === 1 && isBotYardEmpty && Math.random() < 0.5) {
          const activeBotName = game.players[activeBotId].name;
          document.getElementById("bk-status-title").textContent = `${activeBotName} Passes Turn`;
          document.getElementById("bk-status-desc").textContent = `${activeBotName} rolled a 1 and chooses to PASS to wait for a 6.`;
          
          setTimeout(() => {
            game.nextTurn();
            triggerTurn();
          }, 1500);
          return;
        }
        
        if (actions.length === 0) {
          const activeBotName = game.players[activeBotId].name;
          document.getElementById("bk-status-title").textContent = `${activeBotName} Has No Moves!`;
          document.getElementById("bk-status-desc").textContent = `${activeBotName} rolled a ${roll}. Skips turn.`;
          
          setTimeout(() => {
            game.nextTurn();
            triggerTurn();
          }, 1500);
          return;
        }

        const chosenAction = game.getBotDecision(actions);
        
        if (chosenAction) {
          setTimeout(() => {
            if (chosenAction.type === "MOVE_ROCK") {
              const path = game.getRockStepPath(activeBotId, chosenAction.rockId, chosenAction.steps);
              if (path) {
                clearHighlightPath();
                drawHighlightPath(activeBotId, path);
                
                const targetCell = path[path.length - 1];
                if (tilesGrid[targetCell.row] && tilesGrid[targetCell.row][targetCell.col]) {
                  const targetTile = tilesGrid[targetCell.row][targetCell.col].querySelector(".tile-top");
                  if (targetTile) targetTile.classList.add("target-highlight");
                }
              }
              
              setTimeout(() => {
                clearHighlightPath();
                executeLocalAction(activeBotId, chosenAction, true);
              }, 800);
            } else {
              executeLocalAction(activeBotId, chosenAction, true);
            }
          }, 600);
        }
      }, prefersReducedMotion ? 0 : 500);
    }
  }

  function completeBotTurnSequence() {
    clearHighlightPath();
    drawBoard();

    if (game.status !== "in_progress") {
      handleGameOver();
      return;
    }

    saveMatchState();
    game.nextTurn();
    triggerTurn();
  }

  function handleGameOver() {
    const winnerId = game.status.split("_")[0];
    const winnerName = game.players[winnerId] ? game.players[winnerId].name : "Unknown Player";
    const isHumanWinner = game.players[winnerId] ? !game.players[winnerId].isBot : false;
    const currentUser = window.currentUser;
    if (currentUser) {
      updateMatchHistoryStats(isHumanWinner);
    }

    setTimeout(() => {
      alert(`🎉 Congratulations! ${winnerName} won the match!`);

      // Online multiplayer clean-up hook
      if (game.mode === "online" && window.bkMultiplayer) {
        window.bkMultiplayer.leaveRoom();
        return;
      }

      const auth = window.auth;
      if (auth && window.currentUser) {
        const bkDashboardView = document.getElementById("barakatta-dashboard-screen");
        const bkGameView = document.getElementById("barakatta-game-screen");
        if (bkGameView) bkGameView.classList.add("hidden");
        if (bkDashboardView) bkDashboardView.classList.remove("hidden");
        
        const winsLabel = document.getElementById("barakatta-stats-wins");
        const localStats = JSON.parse(localStorage.getItem("bk_stats_" + window.currentUser.username)) || { wins: 0 };
        if (winsLabel) winsLabel.textContent = localStats.wins;
      }
    }, 500);
  }

  function updateMatchHistoryStats(isWin) {
    const user = window.currentUser;
    if (!user) return;

    const key = "bk_stats_" + user.username;
    const localStats = JSON.parse(localStorage.getItem(key)) || { matchesPlayed: 0, wins: 0 };
    localStats.matchesPlayed += 1;
    if (isWin) localStats.wins += 1;
    localStorage.setItem(key, JSON.stringify(localStats));

    if (typeof firebase !== 'undefined' && firebase.apps.length > 0 && user.uid) {
      const statsRef = firebase.database().ref(`barakatta/userStats/${user.uid}`);
      statsRef.once("value").then(snapshot => {
        const stats = snapshot.exists() ? snapshot.val() : { barakattaMatchesPlayed: 0, barakattaWins: 0 };
        stats.barakattaMatchesPlayed = (stats.barakattaMatchesPlayed || 0) + 1;
        if (isWin) {
          stats.barakattaWins = (stats.barakattaWins || 0) + 1;
        }
        statsRef.set(stats);
      }).catch(err => console.error("Failed to update stats in Firebase:", err));

      const matchId = `match_${Date.now()}`;
      const matchRef = firebase.database().ref(`barakatta/matches/${matchId}`);
      
      const playersData = {};
      Object.keys(game.players).forEach(pId => {
        playersData[pId] = {
          name: game.players[pId].name,
          color: game.players[pId].color,
          rocksHome: game.players[pId].rocks.filter(r => r.status === "home").length
        };
      });

      matchRef.set({
        mode: game.mode,
        players: playersData,
        status: game.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  function saveMatchState() {
    if (!game) return;
    const user = window.currentUser;
    if (!user) return;
    localStorage.setItem("bk_active_match_" + user.username, JSON.stringify(game.serializeState()));
  }

  window.bkSyncGameState = function (serializedState) {
    if (!game) return;

    let movedPlayerId = null;
    let movedRockId = null;
    let path = null;

    if (tilesGrid) {
      Object.keys(game.players).forEach(pId => {
        const incomingPlayer = serializedState.players[pId];
        if (!incomingPlayer) return;

        game.players[pId].rocks.forEach(rock => {
          const incomingRock = incomingPlayer.rocks[rock.id];
          if (!incomingRock) return;

          if (rock.currentRing !== incomingRock.currentRing || rock.positionInRing !== incomingRock.positionInRing) {
            if (rock.status === "active" || rock.status === "blocked") {
              const steps = game.diceValue || 1;
              path = game.getRockStepPath(pId, rock.id, steps);
              if (path) {
                movedPlayerId = pId;
                movedRockId = rock.id;
              }
            }
          }
        });
      });
    }

    if (movedPlayerId !== null && movedRockId !== null && path && path.length > 1) {
      isAnimatingMove = true;
      animateRockPath(movedPlayerId, movedRockId, path, () => {
        isAnimatingMove = false;
        game.deserialize(serializedState);
        triggerTurn();
      });
    } else {
      game.deserialize(serializedState);
      triggerTurn();
    }
  };

  window.bkAnimateOnlineRoll = function (roll, player) {
    isRolling = true;
    playDiceRollSound();
    const diceElement = document.getElementById("bk-dice-element");
    const statusDesc = document.getElementById("bk-status-desc");
    const activeName = game.players[player].name;
    
    statusDesc.textContent = `${activeName} is rolling...`;

    let duration = 1000;
    let interval = setInterval(() => {
      const tempX = Math.floor(Math.random() * 360);
      const tempY = Math.floor(Math.random() * 360);
      diceElement.style.transform = `rotateX(${tempX}deg) rotateY(${tempY}deg)`;
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      isRolling = false;
      game.diceValue = roll;
      game.rollState = "rolled";
      
      currentRollCount++;
      const baseRot = diceRotations[roll];
      const spinX = baseRot.x + currentRollCount * 1440;
      const spinY = baseRot.y + currentRollCount * 1440;
      diceElement.style.transform = `rotateX(${spinX}deg) rotateY(${spinY}deg)`;
      
      setTimeout(() => {
        statusDesc.textContent = `${activeName} rolled a ${roll}. Waiting for their move...`;
      }, 400);
    }, duration);
  };
})();
