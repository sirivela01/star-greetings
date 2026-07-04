// Barakatta UI Rendering, Animations & Event Controller
console.log("Barakatta UI Rendering Controller Loaded - Version 1.2.8");
(function () {
  let game = null;
  let isRolling = false;
  let tilesGrid = null;
  let currentRollCount = 0;
  let selectedRockId = null;
  let activeHighlightPath = null;

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

  // Initialize Barakatta Game Screen
  window.startBarakattaGame = function (mode) {
    // Hide all views and show Barakatta board screen
    const screens = ["login-screen", "signup-screen", "forgot-password-screen", "dashboard-screen", "setup-screen", "game-screen", "game-selection-screen", "barakatta-dashboard-screen", "barakatta-game-screen"];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });

    const bkGameView = document.getElementById("barakatta-game-screen");
    if (bkGameView) {
      bkGameView.classList.remove("hidden");
    }

    // Instantiation
    game = new BarakattaGame(mode, 2);
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

    // Remove existing event listeners by cloning
    const newDice = diceElement.cloneNode(true);
    diceElement.parentNode.replaceChild(newDice, diceElement);
    const newRoll = rollBtn.cloneNode(true);
    rollBtn.parentNode.replaceChild(newRoll, rollBtn);

    document.getElementById("bk-dice-element").addEventListener("click", handleHumanRoll);
    document.getElementById("bk-roll-btn").addEventListener("click", handleHumanRoll);
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

    for (let i = 0; i < path.length - 1; i++) {
      const c1 = path[i];
      const c2 = path[i + 1];

      const x1 = c1.col * 100 + 50 + offset.dx;
      const y1 = c1.row * 100 + 50 + offset.dy;
      const x2 = c2.col * 100 + 50 + offset.dx;
      const y2 = c2.row * 100 + 50 + offset.dy;

      // 1. Draw thick neon background ribbon (semi-transparent)
      const lineBg = document.createElementNS(svgNS, "line");
      lineBg.setAttribute("x1", x1);
      lineBg.setAttribute("y1", y1);
      lineBg.setAttribute("x2", x2);
      lineBg.setAttribute("y2", y2);
      lineBg.setAttribute("stroke", color);
      lineBg.setAttribute("stroke-width", "16");
      lineBg.setAttribute("opacity", "0.35");
      lineBg.setAttribute("stroke-linecap", "round");
      lineBg.style.filter = `drop-shadow(0 0 5px ${color})`;
      dynamicLinesContainer.appendChild(lineBg);

      // 2. Draw thin solid foreground arrow line
      const lineFg = document.createElementNS(svgNS, "line");
      lineFg.setAttribute("x1", x1);
      lineFg.setAttribute("y1", y1);
      lineFg.setAttribute("x2", x2);
      lineFg.setAttribute("y2", y2);
      lineFg.setAttribute("stroke", "#ffffff");
      lineFg.setAttribute("stroke-width", "3");
      lineFg.setAttribute("opacity", "0.95");
      lineFg.setAttribute("stroke-linecap", "round");

      // Place arrowhead only at the final segment (the target cell)
      if (i === path.length - 2) {
        lineFg.setAttribute("marker-end", `url(#bk-arrow-${playerId})`);
      }
      dynamicLinesContainer.appendChild(lineFg);
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
    if (!game) return;

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
    const isHuman = (game.mode === "offline") || (game.currentTurn === "player1");
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
        if (yardBox) yardBox.style.display = "block";
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
          homeSpan.parentNode.style.display = "block";
          homeSpan.textContent = `${game.players[pId].rocks.filter(r => r.status === "home").length}/6`;
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
      if (!tilesGrid[r] || !tilesGrid[r][c]) return;

      const tileTop = tilesGrid[r][c].querySelector(".tile-top");
      if (!tileTop) return;

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

        // Animate hop if moving to a new cell
        if (rockToken.parentNode && rockToken.parentNode !== tileTop && !prefersReducedMotion) {
          rockToken.classList.add("rock-hopping");
          rockToken.style.setProperty("--ox", `${offsetX}px`);
          rockToken.style.setProperty("--oy", `${offsetY}px`);
          setTimeout(() => rockToken.classList.remove("rock-hopping"), 400);
        }

        tileTop.appendChild(rockToken);
        rockToken.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 12px)`;

        // Mouse hover preview path
        rockToken.onmouseenter = () => {
          const isHuman = (game.mode === "offline") || (game.currentTurn === "player1");
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

    const turnLabel = document.getElementById("bk-active-player-name");
    const statusTitle = document.getElementById("bk-status-title");
    const statusDesc = document.getElementById("bk-status-desc");
    const rollBtn = document.getElementById("bk-roll-btn");

    const activePlayer = game.players[game.currentTurn];
    const isBotTurn = (game.mode === "solo" || game.mode === "ai_bot") && game.currentTurn !== "player1";

    turnLabel.textContent = activePlayer.name;
    turnLabel.style.color = playerConfig[game.currentTurn].color;

    if (!isBotTurn) {
      statusTitle.textContent = game.currentTurn === "player1" ? "Your Turn" : `${activePlayer.name}'s Turn`;
      statusDesc.textContent = "Roll the dice to proceed.";
      rollBtn.removeAttribute("disabled");

      if (game.rollState === "rolled") {
        evaluateHumanActions();
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
    if (isRolling || game.rollState !== "idle") return;

    const isPlayerTurn = (game.mode === "offline") || (game.currentTurn === "player1");
    if (!isPlayerTurn) return;

    isRolling = true;
    const diceElement = document.getElementById("bk-dice-element");
    const rollBtn = document.getElementById("bk-roll-btn");
    
    rollBtn.setAttribute("disabled", "true");

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

    function finalizeRoll() {
      isRolling = false;
      const roll = Math.floor(Math.random() * 6) + 1;
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
        game.nextTurn();
        triggerTurn();
      }, 1800);
      return;
    }

    drawBoard();

    const hasEnter1 = actions.some(act => act.type === "ENTER_1_OPTIONAL");
    const hasEnterAll = actions.some(act => act.type === "ENTER_ALL_6");
    const hasMoves = actions.some(act => act.type === "MOVE_ROCK");

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
            const summary = game.executeAction(game.currentTurn, action);
            document.getElementById("bk-status-desc").textContent = summary;
            completeTurnSequence();
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
    const isPlayerTurn = (game.mode === "offline") || (game.currentTurn === "player1");
    if (!isPlayerTurn || game.rollState !== "rolled") return;

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
        const summary = game.executeAction(game.currentTurn, clickedRockAction);
        document.getElementById("bk-status-desc").textContent = summary;
        completeTurnSequence();
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
          const summary = game.executeAction(game.currentTurn, confirmAction);
          document.getElementById("bk-status-desc").textContent = summary;
          completeTurnSequence();
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
    if (game.status !== "in_progress" || activeBotId === "player1") return;

    const diceElement = document.getElementById("bk-dice-element");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

    function finalizeBotRoll() {
      const roll = Math.floor(Math.random() * 6) + 1;
      game.diceValue = roll;

      currentRollCount++;
      const baseRot = diceRotations[roll];
      const spinX = baseRot.x + currentRollCount * 1440;
      const spinY = baseRot.y + currentRollCount * 1440;
      diceElement.style.transform = `rotateX(${spinX}deg) rotateY(${spinY}deg)`;

      setTimeout(() => {
        const actions = game.getLegalActions(activeBotId, roll);
        
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
                const summary = game.executeAction(activeBotId, chosenAction);
                document.getElementById("bk-status-desc").textContent = `${game.players[activeBotId].name}: ${summary}`;
                completeBotTurnSequence();
              }, 800);
            } else {
              const summary = game.executeAction(activeBotId, chosenAction);
              document.getElementById("bk-status-desc").textContent = `${game.players[activeBotId].name}: ${summary}`;
              completeBotTurnSequence();
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
    const isHumanWinner = (winnerId === "player1");
    const currentUser = window.currentUser;
    if (currentUser) {
      updateMatchHistoryStats(isHumanWinner);
    }

    setTimeout(() => {
      alert(`🎉 Congratulations! ${winnerName} won the match!`);

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
})();
