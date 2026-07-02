// Barakatta UI Rendering, Animations & Event Controller
(function () {
  let canvas, ctx;
  let game = null;
  let isRolling = false;
  let activeChoicePromise = null; // Used for optional 1 entry choice

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
    game = new BarakattaGame(mode);
    window.bkGame = game;

    // Canvas Setup
    canvas = document.getElementById("barakatta-board-canvas");
    ctx = canvas.getContext("2d");

    // Start event listeners
    initEventListeners();

    // Trigger first turn
    triggerTurn();
  };

  function initEventListeners() {
    // Dice Click
    const diceElement = document.getElementById("bk-dice-element");
    const rollBtn = document.getElementById("bk-roll-btn");

    // Remove existing event listeners by cloning
    const newDice = diceElement.cloneNode(true);
    diceElement.parentNode.replaceChild(newDice, diceElement);
    const newRoll = rollBtn.cloneNode(true);
    rollBtn.parentNode.replaceChild(newRoll, rollBtn);

    document.getElementById("bk-dice-element").addEventListener("click", handleHumanRoll);
    document.getElementById("bk-roll-btn").addEventListener("click", handleHumanRoll);

    // Canvas Click
    const newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);
    canvas = document.getElementById("barakatta-board-canvas");
    ctx = canvas.getContext("2d");
    canvas.addEventListener("click", handleCanvasClick);
  }

  // Draw the complete board
  function drawBoard() {
    if (!canvas || !ctx || !game) return;

    const w = canvas.width;
    const h = canvas.height;
    const cellSize = w / 7;

    // Clear board
    ctx.clearRect(0, 0, w, h);

    // Draw grid cells with premium 3D beveled chess-theme checkered look (cream/charcoal)
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const x = c * cellSize;
        const y = r * cellSize;

        // Alternating light/dark checkered wood cells
        const isLight = ((r + c) % 2 === 0);
        ctx.fillStyle = isLight ? "#c49c74" : "#5c3a21"; // Premium maple wood vs walnut wood
        ctx.fillRect(x, y, cellSize, cellSize);

        // Draw 3D Bevel effect on each cell to give it three-dimensional depth
        if (isLight) {
          // Highlight on top & left (light source from top-left)
          ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y + cellSize);
          ctx.lineTo(x, y);
          ctx.lineTo(x + cellSize, y);
          ctx.stroke();

          // Drop shadow on bottom & right
          ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y + cellSize);
          ctx.lineTo(x + cellSize, y + cellSize);
          ctx.lineTo(x + cellSize, y);
          ctx.stroke();
        } else {
          // Recessed shadow on top & left
          ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y + cellSize);
          ctx.lineTo(x, y);
          ctx.lineTo(x + cellSize, y);
          ctx.stroke();

          // Reflected light border on bottom & right
          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y + cellSize);
          ctx.lineTo(x + cellSize, y + cellSize);
          ctx.lineTo(x + cellSize, y);
          ctx.stroke();
        }

        // Draw fine grid separator lines
        ctx.strokeStyle = "#121212";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }

    // Draw Safe Squares (X) - Shiny Silver Metallic Gradient
    BARAKATTA_BOARD.safeSquares.forEach(safe => {
      const x = safe.col * cellSize;
      const y = safe.row * cellSize;

      // Safe square backdrop highlight (subtle silver/white sheen)
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(x, y, cellSize, cellSize);

      // Coordinates for X diagonals
      const padding = 12;
      const x1 = x + padding, y1 = y + padding;
      const x2 = x + cellSize - padding, y2 = y + cellSize - padding;
      const x3 = x + cellSize - padding, y3 = y + padding;
      const x4 = x + padding, y4 = y + cellSize - padding;

      // 1. Draw Diagonal 1 (Top-Left to Bottom-Right) - Thick 3D Chrome Cylinder
      ctx.lineCap = "round";

      // Dark drop shadow/depth outline
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Shiny silver gradient body
      const gradTLBR = ctx.createLinearGradient(x1, y1, x2, y2);
      gradTLBR.addColorStop(0, "#7a7a7a");
      gradTLBR.addColorStop(0.25, "#e8e8e8");
      gradTLBR.addColorStop(0.5, "#8a8a8a");
      gradTLBR.addColorStop(0.75, "#ffffff");
      gradTLBR.addColorStop(1, "#5a5a5a");
      ctx.strokeStyle = gradTLBR;
      ctx.lineWidth = 6;
      ctx.stroke();

      // Specs highlight core
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1 + 1, y1 + 1);
      ctx.lineTo(x2 - 1, y2 - 1);
      ctx.stroke();

      // 2. Draw Diagonal 2 (Top-Right to Bottom-Left) - Parallel 3D Chrome Tubes
      const offsets = [-3.5, 3.5];
      offsets.forEach(offset => {
        // Dark outline
        ctx.strokeStyle = "#111111";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x3 + offset, y3 - offset);
        ctx.lineTo(x4 + offset, y4 - offset);
        ctx.stroke();

        // Silver tube body
        const gradTRBL = ctx.createLinearGradient(x3, y3, x4, y4);
        gradTRBL.addColorStop(0, "#5a5a5a");
        gradTRBL.addColorStop(0.25, "#ffffff");
        gradTRBL.addColorStop(0.5, "#7a7a7a");
        gradTRBL.addColorStop(0.75, "#dcdcdc");
        gradTRBL.addColorStop(1, "#4a4a4a");
        ctx.strokeStyle = gradTRBL;
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // spec highlight core
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(x3 + offset, y3 - offset);
        ctx.lineTo(x4 + offset, y4 - offset);
        ctx.stroke();
      });
    });

    // Draw Starting Area Player Badges/Colors
    drawPlayerStartBadge("player1", "#ef4444"); // Red starts bottom
    drawPlayerStartBadge("player3", "#eab308"); // Yellow starts top

    // Render rock tokens
    renderRocksOnBoard();
    updateYardDisplay();

    // Draw rich 3D mahogany wooden border frame with inner gold trim
    // 1. Dark outer drop shadow border
    ctx.strokeStyle = "#231103";
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    // 2. Rich mahogany center frame
    ctx.strokeStyle = "#5c2e0b";
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    // 3. Inner beveled gold line trim
    ctx.strokeStyle = "rgba(255, 224, 130, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(10, 10, w - 20, h - 20);
  }

  function drawPlayerStartBadge(playerId, color) {
    const startIdx = BARAKATTA_BOARD.playerStartIndex[playerId];
    const cell = BARAKATTA_BOARD.path[startIdx];
    const cellSize = canvas.width / 7;
    const x = cell.col * cellSize;
    const y = cell.row * cellSize;

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
  }

  // Update rock display elements in the player yards
  function updateYardDisplay() {
    const playerYard = document.getElementById("bk-player-yard-rocks");
    const botYard = document.getElementById("bk-bot-yard-rocks");

    playerYard.innerHTML = "";
    botYard.innerHTML = "";

    const p1YardCount = game.getYardRocks("player1").length;
    for (let i = 0; i < p1YardCount; i++) {
      const rock = document.createElement("div");
      rock.className = "bk-rock-token bk-rock-red";
      playerYard.appendChild(rock);
    }

    const p3YardCount = game.getYardRocks("player3").length;
    for (let i = 0; i < p3YardCount; i++) {
      const rock = document.createElement("div");
      rock.className = "bk-rock-token bk-rock-yellow";
      botYard.appendChild(rock);
    }

    document.getElementById("bk-player-home-count").textContent = `${game.players.player1.rocks.filter(r => r.status === "home").length}/6`;
    document.getElementById("bk-bot-home-count").textContent = `${game.players.player3.rocks.filter(r => r.status === "home").length}/6`;
  }

  // Renders all board-active rock tokens onto the canvas
  function renderRocksOnBoard() {
    const cellSize = canvas.width / 7;
    
    // Group all board active rocks by cell coordinate to calculate offsets for stacking
    const cellMap = {};

    Object.keys(game.players).forEach(playerId => {
      const player = game.players[playerId];
      player.rocks.forEach(rock => {
        if (rock.status !== "board") return;

        const cell = game.getRockCell(playerId, rock.id);
        if (cell) {
          const key = `${cell.row}_${cell.col}`;
          if (!cellMap[key]) cellMap[key] = [];
          cellMap[key].push({ playerId, rockId: rock.id });
        }
      });
    });

    // Check legal actions to apply highlight pulse
    const legalActions = (game.currentTurn === "player1" && game.rollState === "rolled")
      ? game.getLegalActions("player1", game.diceValue)
      : [];

    // Draw rocks with offsets
    Object.keys(cellMap).forEach(key => {
      const rocks = cellMap[key];
      const [row, col] = key.split("_").map(Number);
      const cellCenterX = col * cellSize + cellSize / 2;
      const cellCenterY = row * cellSize + cellSize / 2;

      const N = rocks.length;
      const radius = 10;

      rocks.forEach((r, idx) => {
        let x = cellCenterX;
        let y = cellCenterY;

        // Apply visual offsets for multi-pawn stacking in the same cell
        if (N > 1) {
          const angle = (idx * 2 * Math.PI) / N;
          const dist = cellSize / 4;
          x += Math.cos(angle) * dist;
          y += Math.sin(angle) * dist;
        }

        // Check if this rock is legal to move
        const isLegal = legalActions.some(act => act.type === "MOVE_ROCK" && act.rockId === r.rockId);

        // Draw highlight glow if it's the human player's legal move
        if (isLegal && game.currentTurn === "player1") {
          ctx.shadowColor = "#ffffff";
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(x, y, radius + 4, 0, 2 * Math.PI);
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        }

        // Draw rock body
        const color = (r.playerId === "player1") ? "#ef4444" : "#eab308";
        const gradient = ctx.createRadialGradient(x - radius/3, y - radius/3, 2, x, y, radius);
        
        if (r.playerId === "player1") {
          gradient.addColorStop(0, "#f87171");
          gradient.addColorStop(0.8, "#b91c1c");
        } else {
          gradient.addColorStop(0, "#fbbf24");
          gradient.addColorStop(0.8, "#b45309");
        }

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw identifier number on the rock
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px Outfit, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(r.rockId + 1, x, y);
      });
    });
  }

  // Starts the active player turn sequence
  function triggerTurn() {
    drawBoard();

    const turnName = game.currentTurn === "player1" ? "Your Turn" : "Bot is thinking...";
    document.getElementById("bk-active-player-name").textContent = game.currentTurn === "player1" ? "You" : "Bot";
    document.getElementById("bk-status-title").textContent = turnName;

    const rollBtn = document.getElementById("bk-roll-btn");
    const diceElement = document.getElementById("bk-dice-element");

    if (game.currentTurn === "player1") {
      document.getElementById("bk-status-desc").textContent = "Click Roll Dice or the dice box to roll.";
      rollBtn.removeAttribute("disabled");
      diceElement.style.pointerEvents = "auto";
    } else {
      document.getElementById("bk-status-desc").textContent = "Bot is planning its move...";
      rollBtn.setAttribute("disabled", "true");
      diceElement.style.pointerEvents = "none";

      // Trigger AI turn after delay
      setTimeout(handleBotTurn, 1000);
    }
  }

  // Handles clicking Roll Dice for human player
  function handleHumanRoll() {
    if (isRolling || game.currentTurn !== "player1" || game.rollState !== "idle") return;

    isRolling = true;
    const diceElement = document.getElementById("bk-dice-element");
    const rollBtn = document.getElementById("bk-roll-btn");
    
    rollBtn.setAttribute("disabled", "true");
    diceElement.classList.add("bk-dice-rolling");
    diceElement.textContent = "🎲";

    // Play rolling animation
    let duration = 600;
    let interval = setInterval(() => {
      diceElement.textContent = Math.floor(Math.random() * 6) + 1;
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      diceElement.classList.remove("bk-dice-rolling");
      isRolling = false;

      // Final roll result
      const roll = Math.floor(Math.random() * 6) + 1;
      game.diceValue = roll;
      game.rollState = "rolled";
      diceElement.textContent = roll;

      // Check actions
      evaluateHumanActions();
    }, duration);
  }

  function evaluateHumanActions() {
    const actions = game.getLegalActions("player1", game.diceValue);

    if (actions.length === 0) {
      document.getElementById("bk-status-title").textContent = "No Moves Available!";
      document.getElementById("bk-status-desc").textContent = `You rolled a ${game.diceValue}. Turn is skipped.`;
      
      setTimeout(() => {
        game.nextTurn();
        triggerTurn();
      }, 1800);
      return;
    }

    // Highlight active legal rocks on canvas
    drawBoard();

    // Check if optional 1-entry choice exists
    const hasEnter1 = actions.some(act => act.type === "ENTER_1_OPTIONAL");
    const hasMoves = actions.some(act => act.type === "MOVE_ROCK");

    if (hasEnter1 && hasMoves) {
      // Prompt selection overlay choice
      game.rollState = "waiting_choice";
      const choiceSelector = document.getElementById("bk-choice-selector");
      choiceSelector.style.display = "block";
      choiceSelector.classList.remove("hidden");

      document.getElementById("bk-status-desc").textContent = "Choose whether to enter a new rock or move an existing one.";

      // Wire up choice button clicks
      const enterBtn = document.getElementById("bk-choice-enter-btn");
      const moveBtn = document.getElementById("bk-choice-move-btn");

      const handleChoice = (choiceType) => {
        choiceSelector.style.display = "none";
        choiceSelector.classList.add("hidden");
        game.rollState = "rolled";

        if (choiceType === "enter") {
          // Immediately execute entry
          const summary = game.executeAction("player1", { type: "ENTER_1_OPTIONAL" });
          document.getElementById("bk-status-desc").textContent = summary;
          completeTurnSequence();
        } else {
          // User wants to move, wait for canvas rock click
          document.getElementById("bk-status-desc").textContent = "Click on one of your glowing rocks on the board to move it.";
          // Re-draw board to render glows
          drawBoard();
        }
      };

      enterBtn.onclick = () => handleChoice("enter");
      moveBtn.onclick = () => handleChoice("move");

    } else if (actions.length === 1 && actions[0].type === "ENTER_ALL_6") {
      // Auto-execute enter all 6
      const summary = game.executeAction("player1", actions[0]);
      document.getElementById("bk-status-desc").textContent = summary;
      completeTurnSequence();
    } else if (actions.length === 1 && actions[0].type === "ENTER_1_OPTIONAL") {
      // Auto-execute enter 1
      const summary = game.executeAction("player1", actions[0]);
      document.getElementById("bk-status-desc").textContent = summary;
      completeTurnSequence();
    } else {
      document.getElementById("bk-status-desc").textContent = `Select one of your glowing rocks on the board to move it ${game.diceValue} spaces.`;
    }
  }

  // Handle clicking the board grid cells
  function handleCanvasClick(e) {
    if (game.currentTurn !== "player1" || game.rollState !== "rolled") return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const col = Math.floor(clickX / (canvas.width / 7));
    const row = Math.floor(clickY / (canvas.height / 7));

    // Find if a legal rock was clicked
    const actions = game.getLegalActions("player1", game.diceValue);
    
    // Filter active rocks that are in this grid cell
    const clickedRockAction = actions.find(act => {
      if (act.type !== "MOVE_ROCK") return false;
      const rockCell = game.getRockCell("player1", act.rockId);
      return rockCell && rockCell.row === row && rockCell.col === col;
    });

    if (clickedRockAction) {
      // Execute the movement animation cell-by-cell!
      const rockId = clickedRockAction.rockId;
      const rock = game.players.player1.rocks[rockId];
      const startSteps = rock.stepsMoved;
      
      const stepsCount = clickedRockAction.steps;
      let finalSteps = startSteps + stepsCount;
      const hasCapture = !game.requireCaptureToEnterHome || game.hasCapturedAnOpponent["player1"];
      if (!hasCapture && finalSteps >= 28) {
        finalSteps = finalSteps % 28;
      }

      // Execute action in logic
      const summary = game.executeAction("player1", clickedRockAction);
      document.getElementById("bk-status-desc").textContent = summary;

      // Animate movement
      animateRockMovement("player1", rockId, startSteps, finalSteps, () => {
        completeTurnSequence();
      });
    }
  }

  // Smooth cell-by-cell path traversal animation
  function animateRockMovement(playerId, rockId, startSteps, finalSteps, callback) {
    let currentStep = startSteps;
    const totalSteps = (finalSteps >= startSteps) 
      ? (finalSteps - startSteps) 
      : (28 - startSteps + finalSteps); // handle outer wrap loop count

    if (totalSteps <= 0) {
      callback();
      return;
    }

    let stepsCompleted = 0;
    
    function stepAnimation() {
      if (stepsCompleted >= totalSteps) {
        callback();
        return;
      }

      currentStep = (currentStep + 1);
      
      // Temporarily update rock's stepsMoved in state for drawing
      game.players[playerId].rocks[rockId].stepsMoved = currentStep;
      drawBoard();

      stepsCompleted++;
      setTimeout(stepAnimation, 250); // Speed of token step animation
    }

    stepAnimation();
  }

  function completeTurnSequence() {
    drawBoard();

    // Check if won
    if (game.status !== "in_progress") {
      handleGameOver();
      return;
    }

    // Save match status in Firebase or local
    saveMatchState();

    // Transition turn
    game.nextTurn();
    triggerTurn();
  }

  // Executes AI Bot Turn sequence
  function handleBotTurn() {
    if (game.status !== "in_progress" || game.currentTurn !== "player3") return;

    const diceElement = document.getElementById("bk-dice-element");
    diceElement.classList.add("bk-dice-rolling");

    // Roll animation
    let duration = 600;
    let interval = setInterval(() => {
      diceElement.textContent = Math.floor(Math.random() * 6) + 1;
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      diceElement.classList.remove("bk-dice-rolling");

      const roll = Math.floor(Math.random() * 6) + 1;
      game.diceValue = roll;
      diceElement.textContent = roll;

      // Select AI move decision
      const actions = game.getLegalActions("player3", roll);
      
      if (actions.length === 0) {
        document.getElementById("bk-status-title").textContent = "Bot Has No Moves!";
        document.getElementById("bk-status-desc").textContent = `Bot rolled a ${roll}. Skips turn.`;
        
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
            const rockId = chosenAction.rockId;
            const rock = game.players.player3.rocks[rockId];
            const startSteps = rock.stepsMoved;
            
            const stepsCount = chosenAction.steps;
            let finalSteps = startSteps + stepsCount;
            const hasCapture = !game.requireCaptureToEnterHome || game.hasCapturedAnOpponent["player3"];
            if (!hasCapture && finalSteps >= 28) {
              finalSteps = finalSteps % 28;
            }

            const summary = game.executeAction("player3", chosenAction);
            document.getElementById("bk-status-desc").textContent = `Bot: ${summary}`;

            animateRockMovement("player3", rockId, startSteps, finalSteps, () => {
              completeBotTurnSequence();
            });
          } else {
            // Entry action
            const summary = game.executeAction("player3", chosenAction);
            document.getElementById("bk-status-desc").textContent = `Bot: ${summary}`;
            completeBotTurnSequence();
          }
        }, 600);
      }
    }, duration);
  }

  function completeBotTurnSequence() {
    drawBoard();

    if (game.status !== "in_progress") {
      handleGameOver();
      return;
    }

    saveMatchState();

    game.nextTurn();
    triggerTurn();
  }

  // Handles game over victory logic
  function handleGameOver() {
    const isHumanWinner = (game.status === "player1_won");
    
    // Save final stats and update wins
    const currentUser = window.currentUser;
    if (currentUser) {
      updateMatchHistoryStats(isHumanWinner);
    }

    setTimeout(() => {
      if (isHumanWinner) {
        alert("🎉 Congratulations! You got all 6 rocks home and won the match!");
      } else {
        alert("🤖 Bot wins! Better luck next time.");
      }

      // Exit back to dashboard
      const auth = window.auth;
      if (auth && window.currentUser) {
        // Redraw dashboard with refreshed stats
        const bkDashboardView = document.getElementById("barakatta-dashboard-screen");
        const bkGameView = document.getElementById("barakatta-game-screen");
        if (bkGameView) bkGameView.classList.add("hidden");
        if (bkDashboardView) bkDashboardView.classList.remove("hidden");
        
        // Refresh local stats display
        const winsLabel = document.getElementById("barakatta-stats-wins");
        const localStats = JSON.parse(localStorage.getItem("bk_stats_" + window.currentUser.username)) || { wins: 0 };
        if (winsLabel) winsLabel.textContent = localStats.wins;
      }
    }, 500);
  }

  // Local/Firebase stats logging helper
  function updateMatchHistoryStats(isWin) {
    const user = window.currentUser;
    if (!user) return;

    // 1. Update localStorage
    const key = "bk_stats_" + user.username;
    const localStats = JSON.parse(localStorage.getItem(key)) || { matchesPlayed: 0, wins: 0 };
    localStats.matchesPlayed += 1;
    if (isWin) localStats.wins += 1;
    localStorage.setItem(key, JSON.stringify(localStats));

    // 2. Update Firebase
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

      // Append match entry
      const matchId = `match_${Date.now()}`;
      const matchRef = firebase.database().ref(`barakatta/matches/${matchId}`);
      matchRef.set({
        mode: "solo",
        players: {
          player1: { uid: user.uid, color: "red", rocksHome: game.players.player1.rocks.filter(r => r.status === "home").length },
          bot: { color: "yellow", rocksHome: game.players.player3.rocks.filter(r => r.status === "home").length }
        },
        status: isWin ? "player1_won" : "bot_won",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  function saveMatchState() {
    if (!game) return;
    const user = window.currentUser;
    if (!user) return;

    // Locally cache the active match state
    localStorage.setItem("bk_active_match_" + user.username, JSON.stringify(game.serializeState()));
  }
})();
