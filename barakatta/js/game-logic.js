// Barakatta Core Game Logic Engine
class BarakattaGame {
  constructor(mode = "solo") {
    this.mode = mode;
    this.requireCaptureToEnterHome = true; // Traditional capture lock toggle
    this.initializeGame();
  }

  initializeGame() {
    this.players = {
      player1: {
        id: "player1",
        name: "You",
        color: "red",
        rocks: Array.from({ length: 6 }, (_, i) => ({
          id: i,
          status: "yard", // 'yard' | 'board' | 'home'
          stepsMoved: 0
        }))
      },
      player3: {
        id: "player3",
        name: "Bot",
        color: "yellow",
        rocks: Array.from({ length: 6 }, (_, i) => ({
          id: i,
          status: "yard",
          stepsMoved: 0
        }))
      }
    };

    this.currentTurn = "player1";
    this.diceValue = 0;
    this.status = "in_progress"; // 'in_progress' | 'player1_won' | 'player3_won'
    this.hasCapturedAnOpponent = {
      player1: false,
      player3: false
    };

    this.extraTurn = false;
    this.rollState = "idle"; // 'idle' | 'rolled' | 'waiting_choice'
  }

  // Returns list of rocks currently in yard
  getYardRocks(playerId) {
    return this.players[playerId].rocks.filter(r => r.status === "yard");
  }

  // Returns list of rocks currently on board
  getBoardRocks(playerId) {
    return this.players[playerId].rocks.filter(r => r.status === "board");
  }

  // Returns the coordinate cell of a rock given player start index and stepsMoved
  getRockCell(playerId, rockIndex, stepsOffset = 0) {
    const rock = this.players[playerId].rocks[rockIndex];
    if (!rock || rock.status === "yard") return null;

    const steps = rock.stepsMoved + stepsOffset;
    if (steps < 24) {
      const startIdx = BARAKATTA_BOARD.playerStartIndex[playerId];
      const pathIdx = (startIdx + steps) % 24;
      return BARAKATTA_BOARD.path[pathIdx];
    } else if (steps <= 26) {
      const stretch = BARAKATTA_BOARD.homeStretches[playerId];
      const idx = steps - 24;
      return stretch[idx];
    }
    return null; // reached home
  }

  // Returns if cell coordinates match a Safe Square (X)
  isSafeSquare(cell) {
    if (!cell) return false;
    return BARAKATTA_BOARD.safeSquares.some(
      s => s.row === cell.row && s.col === cell.col
    );
  }

  // Evaluates legal actions for the current turn and rolled dice value
  getLegalActions(playerId, diceValue) {
    const actions = [];
    const player = this.players[playerId];
    const yardCount = this.getYardRocks(playerId).length;
    const boardRocks = this.getBoardRocks(playerId);

    if (diceValue === 6) {
      // 1. Enter all rocks from yard at once
      if (yardCount > 0) {
        actions.push({ type: "ENTER_ALL_6" });
      }
      // 2. Move any active rock on board by 6
      boardRocks.forEach(rock => {
        if (this.isValidMove(playerId, rock.id, 6)) {
          actions.push({ type: "MOVE_ROCK", rockId: rock.id, steps: 6 });
        }
      });
    } else if (diceValue === 1) {
      // 1. Enter exactly 1 rock from yard
      if (yardCount > 0) {
        actions.push({ type: "ENTER_1_OPTIONAL" });
      }
      // 2. Move any active rock on board by 1
      boardRocks.forEach(rock => {
        if (this.isValidMove(playerId, rock.id, 1)) {
          actions.push({ type: "MOVE_ROCK", rockId: rock.id, steps: 1 });
        }
      });
    } else {
      // DiceValue 2, 3, 4, 5
      boardRocks.forEach(rock => {
        if (this.isValidMove(playerId, rock.id, diceValue)) {
          actions.push({ type: "MOVE_ROCK", rockId: rock.id, steps: diceValue });
        }
      });
    }

    return actions;
  }

  // Validates if moving a specific rock by D steps is legal
  isValidMove(playerId, rockId, steps) {
    const rock = this.players[playerId].rocks[rockId];
    if (!rock || rock.status !== "board") return false;

    const currentSteps = rock.stepsMoved;
    const targetSteps = currentSteps + steps;

    // A rock reaches home exactly at step 26. Overshoot is illegal.
    if (targetSteps > 26) return false;

    // Check capture lock for entering the home stretch
    const hasCapture = !this.requireCaptureToEnterHome || this.hasCapturedAnOpponent[playerId];
    if (!hasCapture && targetSteps >= 24) {
      // Without capture, rock cannot enter home stretch, but it can cycle outer loop
      return true; 
    }

    return true;
  }

  // Executes a game action
  executeAction(playerId, action) {
    const player = this.players[playerId];
    let actionSummary = "";

    if (action.type === "ENTER_ALL_6") {
      const yardRocks = this.getYardRocks(playerId);
      yardRocks.forEach(rock => {
        rock.status = "board";
        rock.stepsMoved = 0;
      });
      actionSummary = `Entered all ${yardRocks.length} rocks onto starting cell.`;
    } else if (action.type === "ENTER_1_OPTIONAL") {
      const yardRocks = this.getYardRocks(playerId);
      if (yardRocks.length > 0) {
        yardRocks[0].status = "board";
        yardRocks[0].stepsMoved = 0;
        actionSummary = `Entered 1 rock onto starting cell.`;
      }
    } else if (action.type === "MOVE_ROCK") {
      const rock = player.rocks[action.rockId];
      const steps = action.steps;
      const initialCell = this.getRockCell(playerId, action.rockId);
      
      const hasCapture = !this.requireCaptureToEnterHome || this.hasCapturedAnOpponent[playerId];
      
      if (!hasCapture && rock.stepsMoved + steps >= 24) {
        // Without capture, wrap around outer perimeter
        rock.stepsMoved = (rock.stepsMoved + steps) % 24;
      } else {
        rock.stepsMoved += steps;
      }

      // Check if it reached home
      if (rock.stepsMoved === 26) {
        rock.status = "home";
        actionSummary = `Moved rock #${rock.id + 1} home!`;
      } else {
        actionSummary = `Moved rock #${rock.id + 1} by ${steps} steps.`;
      }

      // Check for capture on target cell
      const targetCell = this.getRockCell(playerId, action.rockId);
      if (targetCell && rock.status === "board") {
        this.checkForCapture(playerId, targetCell);
      }
    }

    // Check if player won
    if (this.checkWinCondition(playerId)) {
      this.status = (playerId === "player1") ? "player1_won" : "player3_won";
    }

    return actionSummary;
  }

  // Captures any single opponent rock on target cell if not a Safe Square
  checkForCapture(attackerId, cell) {
    if (this.isSafeSquare(cell)) return;

    // Scan all opponent players
    Object.keys(this.players).forEach(opponentId => {
      if (opponentId === attackerId) return;

      const opponent = this.players[opponentId];
      // Find active opponent rocks on this cell
      const matchingRocks = opponent.rocks.filter(rock => {
        if (rock.status !== "board") return false;
        const oCell = this.getRockCell(opponentId, rock.id);
        return oCell && oCell.row === cell.row && oCell.col === cell.col;
      });

      // Capture only if there is exactly 1 opponent rock (no capture for doubles/stacks)
      if (matchingRocks.length === 1) {
        const capturedRock = matchingRocks[0];
        capturedRock.status = "yard";
        capturedRock.stepsMoved = 0;
        
        // Grant attacker capture unlocking and extra turn
        this.hasCapturedAnOpponent[attackerId] = true;
        this.extraTurn = true;
        
        console.log(`💥 Capture! Player ${attackerId} captured Player ${opponentId}'s rock #${capturedRock.id + 1}`);
      }
    });
  }

  // Checks if all 6 rocks of a player are home
  checkWinCondition(playerId) {
    return this.players[playerId].rocks.every(r => r.status === "home");
  }

  // Transitions the active turn
  nextTurn() {
    this.rollState = "idle";
    
    // Check if extra turn is granted
    if (this.diceValue === 6 || this.extraTurn) {
      this.extraTurn = false; // Reset flag
      // Keep turn, player rolls again
      return this.currentTurn;
    }

    // Otherwise transition turns
    if (this.mode === "solo") {
      this.currentTurn = (this.currentTurn === "player1") ? "player3" : "player1";
    }
    
    this.extraTurn = false;
    return this.currentTurn;
  }

  // Serializes state to save in Firebase Realtime Database
  serializeState() {
    return {
      mode: this.mode,
      players: {
        player1: {
          name: this.players.player1.name,
          color: this.players.player1.color,
          rocksHome: this.players.player1.rocks.filter(r => r.status === "home").length,
          rocks: this.players.player1.rocks
        },
        bot: {
          name: this.players.player3.name,
          color: this.players.player3.color,
          rocksHome: this.players.player3.rocks.filter(r => r.status === "home").length,
          rocks: this.players.player3.rocks
        }
      },
      currentTurn: this.currentTurn,
      diceValue: this.diceValue,
      status: this.status,
      hasCapturedAnOpponent: this.hasCapturedAnOpponent,
      rollState: this.rollState
    };
  }

  // AI Heuristics decision-making for the opponent Bot (player3)
  getBotDecision(legalActions) {
    if (!legalActions || legalActions.length === 0) return null;

    // 1. Capture an opponent rock if possible
    const captureAction = legalActions.find(act => {
      if (act.type !== "MOVE_ROCK") return false;
      const cell = this.getRockCell("player3", act.rockId, act.steps);
      if (!cell || this.isSafeSquare(cell)) return false;
      
      const player1 = this.players.player1;
      const matchingRocks = player1.rocks.filter(rock => {
        if (rock.status !== "board") return false;
        const oCell = this.getRockCell("player1", rock.id);
        return oCell && oCell.row === cell.row && oCell.col === cell.col;
      });
      return matchingRocks.length === 1;
    });
    if (captureAction) return captureAction;

    // 2. Enter all rocks if 6 was rolled
    const enterAll6Action = legalActions.find(act => act.type === "ENTER_ALL_6");
    if (enterAll6Action) return enterAll6Action;

    // 3. Move the rock closest to landing exactly home (step 26)
    const moveHomeActions = legalActions.filter(act => {
      if (act.type !== "MOVE_ROCK") return false;
      const rock = this.players.player3.rocks[act.rockId];
      return (rock.stepsMoved + act.steps === 26);
    });
    if (moveHomeActions.length > 0) {
      return moveHomeActions.reduce((prev, curr) => {
        const prevRock = this.players.player3.rocks[prev.rockId];
        const currRock = this.players.player3.rocks[curr.rockId];
        return (currRock.stepsMoved > prevRock.stepsMoved) ? curr : prev;
      });
    }

    // 4. Otherwise move the rock closest to home, favoring active board rocks
    const moveActions = legalActions.filter(act => act.type === "MOVE_ROCK");
    if (moveActions.length > 0) {
      // Find the rock that is furthest along (closest to home)
      return moveActions.reduce((prev, curr) => {
        const prevRock = this.players.player3.rocks[prev.rockId];
        const currRock = this.players.player3.rocks[curr.rockId];
        return (currRock.stepsMoved > prevRock.stepsMoved) ? curr : prev;
      });
    }

    // 5. Fallback to any remaining action (like optional entry)
    return legalActions[Math.floor(Math.random() * legalActions.length)];
  }
}
window.BarakattaGame = BarakattaGame;
