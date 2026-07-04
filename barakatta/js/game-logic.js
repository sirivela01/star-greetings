// Barakatta Core Game Logic Engine
console.log("Barakatta Core Logic Engine Loaded - Version 1.2.6");
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
          status: "yard", // 'yard' | 'active' | 'blocked' | 'home'
          currentRing: 0,
          positionInRing: 0,
          hasCapturedThisRing: false
        }))
      },
      player3: {
        id: "player3",
        name: "Bot",
        color: "yellow",
        rocks: Array.from({ length: 6 }, (_, i) => ({
          id: i,
          status: "yard",
          currentRing: 0,
          positionInRing: 0,
          hasCapturedThisRing: false
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
    return this.players[playerId].rocks.filter(r => r.status === "active" || r.status === "blocked");
  }

  // Returns the coordinate cell of a rock
  getRockCell(playerId, rockIndex, stepsOffset = 0) {
    const rock = this.players[playerId].rocks[rockIndex];
    if (!rock || rock.status === "yard" || rock.status === "home") return null;

    if (stepsOffset === 0) {
      return BARAKATTA_BOARD.playerPaths[playerId][rock.currentRing][rock.positionInRing];
    }

    const sim = this.simulateMove(playerId, rockIndex, stepsOffset);
    return sim ? sim.cell : null;
  }

  // Returns if cell coordinates match a Safe Square (X)
  isSafeSquare(cell) {
    if (!cell) return false;
    return BARAKATTA_BOARD.safeSquares.some(
      s => s.row === cell.row && s.col === cell.col
    );
  }

  // Finds occupant of a cell (any active rock of any player)
  getOccupant(cell) {
    if (!cell) return null;
    for (const playerId of Object.keys(this.players)) {
      for (const rock of this.players[playerId].rocks) {
        if (rock.status === "active" || rock.status === "blocked") {
          const c = this.getRockCell(playerId, rock.id);
          if (c && c.row === cell.row && c.col === cell.col) {
            return { playerId, rockId: rock.id, rock };
          }
        }
      }
    }
    return null;
  }

  // Finds occupant of a cell belonging to a specific player
  getOccupantOfPlayer(cell, playerId) {
    if (!cell) return null;
    for (const rock of this.players[playerId].rocks) {
      if (rock.status === "active" || rock.status === "blocked") {
        const c = this.getRockCell(playerId, rock.id);
        if (c && c.row === cell.row && c.col === cell.col) {
          return { playerId, rockId: rock.id, rock };
        }
      }
    }
    return null;
  }

  // Finds occupant of a cell belonging to any player EXCEPT the specified friendly player
  getOpponentOccupant(cell, friendlyPlayerId) {
    if (!cell) return null;
    for (const playerId of Object.keys(this.players)) {
      if (playerId === friendlyPlayerId) continue;
      for (const rock of this.players[playerId].rocks) {
        if (rock.status === "active" || rock.status === "blocked") {
          const c = this.getRockCell(playerId, rock.id);
          if (c && c.row === cell.row && c.col === cell.col) {
            return { playerId, rockId: rock.id, rock };
          }
        }
      }
    }
    return null;
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

  // Simulates moving a specific rock by D steps along the spiral rings path
  simulateMove(playerId, rockId, steps) {
    const rock = this.players[playerId].rocks[rockId];
    if (!rock || rock.status === "yard" || rock.status === "home") {
      return null;
    }

    let ring = rock.currentRing;
    let pos = rock.positionInRing;
    let hasCaptured = rock.hasCapturedThisRing;
    let status = rock.status;

    if (steps === 0) {
      const cell = BARAKATTA_BOARD.playerPaths[playerId][ring][pos];
      return { ring, pos, hasCaptured, status, cell };
    }

    for (let s = 1; s <= steps; s++) {
      const pathL = BARAKATTA_BOARD.playerPaths[playerId][ring].length;
      if (pos === pathL - 1) {
        // Last cell of current ring - try to transition to the next ring inward
        const nextRingIdx = ring + 1;
        if (nextRingIdx >= BARAKATTA_BOARD.rings.length) {
          // Overshoot (past the final HOME zone ring)
          return null;
        }

        const nextEntryCell = BARAKATTA_BOARD.playerPaths[playerId][nextRingIdx][0];
        const occupant = this.getOpponentOccupant(nextEntryCell, playerId);
        const isSafe = this.isSafeSquare(nextEntryCell);
        const wouldCaptureNow = occupant && !isSafe;

        if (hasCaptured || wouldCaptureNow) {
          // Allowed to transition!
          ring = nextRingIdx;
          pos = 0;
          hasCaptured = wouldCaptureNow; // reset capture flag for the new ring layer
          status = "active";
        } else {
          // Blocked! Must stop at the end of the current ring in a blocked state
          pos = pathL - 1;
          status = "blocked";
          break; // Stop movement
        }
      } else {
        // Normal move along current ring
        pos++;
        status = "active";

        const cell = BARAKATTA_BOARD.playerPaths[playerId][ring][pos];
        const occupant = this.getOpponentOccupant(cell, playerId);
        const isSafe = this.isSafeSquare(cell);
        if (occupant && !isSafe) {
          hasCaptured = true;
        }
      }
    }

    const finalCell = BARAKATTA_BOARD.playerPaths[playerId][ring][pos];

    // Same-player stacking rule check:
    // Own rocks can never stack on non-start non-safe cells
    const friendlyOccupant = this.getOccupantOfPlayer(finalCell, playerId);
    if (friendlyOccupant && friendlyOccupant.rockId !== rockId) {
      const startCell = BARAKATTA_BOARD.playerPaths[playerId][0][0];
      const isStart = (finalCell.row === startCell.row && finalCell.col === startCell.col);
      const isSafe = this.isSafeSquare(finalCell);
      if (!isStart && !isSafe) {
        return null; // Illegal stack
      }
    }

    // Check if reached HOME ring (final ring)
    if (ring === BARAKATTA_BOARD.rings.length - 1) {
      status = "home";
    }

    return { ring, pos, hasCaptured, status, cell: finalCell };
  }

  // Returns list of cell coordinates the rock will visit step-by-step
  getRockStepPath(playerId, rockId, steps) {
    if (!this.isValidMove(playerId, rockId, steps)) return null;

    const rock = this.players[playerId].rocks[rockId];
    let ring = rock.currentRing;
    let pos = rock.positionInRing;
    let hasCaptured = rock.hasCapturedThisRing;
    const pathCells = [BARAKATTA_BOARD.playerPaths[playerId][ring][pos]];

    for (let s = 1; s <= steps; s++) {
      const pathL = BARAKATTA_BOARD.playerPaths[playerId][ring].length;
      if (pos === pathL - 1) {
        const nextRingIdx = ring + 1;
        if (nextRingIdx >= BARAKATTA_BOARD.rings.length) break;

        const nextEntryCell = BARAKATTA_BOARD.playerPaths[playerId][nextRingIdx][0];
        const occupant = this.getOpponentOccupant(nextEntryCell, playerId);
        const isSafe = this.isSafeSquare(nextEntryCell);
        const wouldCaptureNow = occupant && !isSafe;

        if (hasCaptured || wouldCaptureNow) {
          ring = nextRingIdx;
          pos = 0;
          hasCaptured = wouldCaptureNow;
        } else {
          break;
        }
      } else {
        pos++;
      }
      pathCells.push(BARAKATTA_BOARD.playerPaths[playerId][ring][pos]);
    }
    return pathCells;
  }

  // Validates if moving a specific rock by D steps is legal
  isValidMove(playerId, rockId, steps) {
    const rock = this.players[playerId].rocks[rockId];
    if (!rock || (rock.status !== "active" && rock.status !== "blocked")) return false;

    const sim = this.simulateMove(playerId, rockId, steps);
    if (!sim) return false;

    // If it is blocked and couldn't move/advance, it is invalid
    if (sim.ring === rock.currentRing && sim.pos === rock.positionInRing) {
      return false;
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
        rock.status = "active";
        rock.currentRing = 0;
        rock.positionInRing = 0;
        rock.hasCapturedThisRing = false;
      });
      actionSummary = `Entered all ${yardRocks.length} rocks onto starting cell.`;
      this.extraTurn = true; // Roll of 6 gets another turn
    } else if (action.type === "ENTER_1_OPTIONAL") {
      const yardRocks = this.getYardRocks(playerId);
      if (yardRocks.length > 0) {
        yardRocks[0].status = "active";
        yardRocks[0].currentRing = 0;
        yardRocks[0].positionInRing = 0;
        yardRocks[0].hasCapturedThisRing = false;
        actionSummary = `Entered 1 rock onto starting cell.`;
      }
    } else if (action.type === "MOVE_ROCK") {
      const rock = player.rocks[action.rockId];
      const steps = action.steps;
      
      const sim = this.simulateMove(playerId, action.rockId, steps);
      if (sim) {
        // Update rock positions
        rock.currentRing = sim.ring;
        rock.positionInRing = sim.pos;
        rock.status = sim.status;
        rock.hasCapturedThisRing = sim.hasCaptured;

        actionSummary = `Moved rock #${rock.id + 1} to ring ${rock.currentRing}, cell ${rock.positionInRing}.`;

        // Check for capture on target cell
        if (sim.status !== "home" && !this.isSafeSquare(sim.cell)) {
          const opponent = this.getOpponentOccupant(sim.cell, playerId);
          if (opponent) {
            const oppRock = this.players[opponent.playerId].rocks[opponent.rockId];
            oppRock.status = "yard";
            oppRock.currentRing = 0;
            oppRock.positionInRing = 0;
            oppRock.hasCapturedThisRing = false;

            rock.hasCapturedThisRing = true;
            this.hasCapturedAnOpponent[playerId] = true;
            this.extraTurn = true; // Capture grants extra turn
            actionSummary += ` Captured opponent rock at row ${sim.cell.row}, col ${sim.cell.col}!`;
          }
        }

        if (sim.status === "home") {
          actionSummary = `Moved rock #${rock.id + 1} home!`;
        }
      }
    }

    // Check if player won (all 6 rocks home)
    const allHome = player.rocks.every(r => r.status === "home");
    if (allHome) {
      this.status = (playerId === "player1") ? "player1_won" : "player3_won";
    }

    return actionSummary;
  }

  // Transitions the active turn
  nextTurn() {
    this.rollState = "idle";
    
    // Check if extra turn is granted (roll of 6 or 1, or capture)
    if (this.diceValue === 6 || this.diceValue === 1 || this.extraTurn) {
      this.extraTurn = false; // Reset flag
      // Keep turn, player rolls again
      return this.currentTurn;
    }

    // Otherwise transition turns
    if (this.mode === "solo" || this.mode === "offline" || this.mode === "ai_bot") {
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

    // Helper to evaluate if a MOVE_ROCK action results in a capture
    const getActionCapture = (act) => {
      if (act.type !== "MOVE_ROCK") return false;
      const sim = this.simulateMove("player3", act.rockId, act.steps);
      if (!sim || sim.status === "home") return false;
      if (this.isSafeSquare(sim.cell)) return false;

      const opponent = this.getOpponentOccupant(sim.cell, "player3");
      return !!opponent;
    };

    // Priority 1: Capture an opponent rock if possible (moves it or advances it)
    const captureAction = legalActions.find(act => getActionCapture(act));
    if (captureAction) return captureAction;

    // Priority 2: Unblock a blocked rock by capturing an opponent sitting on the next ring's entry cell
    const unblockAction = legalActions.find(act => {
      if (act.type !== "MOVE_ROCK") return false;
      const rock = this.players.player3.rocks[act.rockId];
      if (rock.status !== "blocked") return false;
      return getActionCapture(act);
    });
    if (unblockAction) return unblockAction;

    // Priority 3: If a bot rock has hasCapturedThisRing = true and is nearing the end of its ring -> prioritize moving it onward
    const pathNearEndActions = legalActions.filter(act => {
      if (act.type !== "MOVE_ROCK") return false;
      const rock = this.players.player3.rocks[act.rockId];
      if (!rock.hasCapturedThisRing) return false;
      const ringL = BARAKATTA_BOARD.playerPaths["player3"][rock.currentRing].length;
      const distToLast = ringL - 1 - rock.positionInRing;
      return distToLast <= 6 && distToLast >= 0; // Nearing the end
    });
    if (pathNearEndActions.length > 0) {
      return pathNearEndActions.reduce((best, curr) => {
        const bestRock = this.players.player3.rocks[best.rockId];
        const currRock = this.players.player3.rocks[curr.rockId];
        const bestDist = BARAKATTA_BOARD.playerPaths["player3"][bestRock.currentRing].length - 1 - bestRock.positionInRing;
        const currDist = BARAKATTA_BOARD.playerPaths["player3"][currRock.currentRing].length - 1 - currRock.positionInRing;
        return (currDist < bestDist) ? curr : best;
      });
    }

    // Priority 4: Enter all rocks if 6 was rolled
    const enterAll6Action = legalActions.find(act => act.type === "ENTER_ALL_6");
    if (enterAll6Action) return enterAll6Action;

    // Priority 5: Move the rock closest to landing exactly home (final HOME ring)
    const moveHomeActions = legalActions.filter(act => {
      if (act.type !== "MOVE_ROCK") return false;
      const sim = this.simulateMove("player3", act.rockId, act.steps);
      return sim && sim.status === "home";
    });
    if (moveHomeActions.length > 0) {
      return moveHomeActions.reduce((prev, curr) => {
        const prevRock = this.players.player3.rocks[prev.rockId];
        const currRock = this.players.player3.rocks[curr.rockId];
        return (currRock.currentRing > prevRock.currentRing || 
                (currRock.currentRing === prevRock.currentRing && currRock.positionInRing > prevRock.positionInRing)) 
               ? curr : prev;
      });
    }

    // Priority 6: Otherwise move the rock closest to home, favoring active board rocks
    const moveActions = legalActions.filter(act => act.type === "MOVE_ROCK");
    if (moveActions.length > 0) {
      return moveActions.reduce((prev, curr) => {
        const prevRock = this.players.player3.rocks[prev.rockId];
        const currRock = this.players.player3.rocks[curr.rockId];
        const prevProgress = prevRock.currentRing * 100 + prevRock.positionInRing;
        const currProgress = currRock.currentRing * 100 + currRock.positionInRing;
        return (currProgress > prevProgress) ? curr : prev;
      });
    }

    // Priority 7: Fallback to any remaining action
    return legalActions[Math.floor(Math.random() * legalActions.length)];
  }
}
window.BarakattaGame = BarakattaGame;
