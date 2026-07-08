// Barakatta Core Game Logic Engine
console.log("Barakatta Core Logic Engine Loaded - Version 1.2.8");
class BarakattaGame {
  constructor(mode = "solo", playerCount = 4, customPlayers = null) {
    this.mode = mode;
    this.playerCount = playerCount;
    this.customPlayers = customPlayers;
    this.requireCaptureToEnterHome = true; // Traditional capture lock toggle
    this.initializeGame();
  }

  initializeGame() {
    this.players = {};

    const defaultNames = {
      player1: "Player 1",
      player2: "Player 2",
      player3: "Player 3",
      player4: "Player 4"
    };

    const slotColors = {
      player1: "red",
      player2: "green",
      player3: "yellow",
      player4: "blue"
    };

    const slotMapping = {
      2: ["player1", "player3"],
      3: ["player1", "player2", "player3"],
      4: ["player1", "player2", "player3", "player4"]
    };

    const slots = slotMapping[this.playerCount] || ["player1", "player3"];

    if (this.customPlayers) {
      slots.forEach((pId, idx) => {
        // Map index to the custom configuration:
        const customIdx = parseInt(pId.replace("player", ""), 10) - 1;
        const custom = this.customPlayers[customIdx] || {};
        
        this.players[pId] = {
          id: pId,
          name: custom.name || defaultNames[pId],
          avatar: custom.avatar || "assets/avatars/avatar_1.png",
          isBot: custom.isBot !== undefined ? custom.isBot : false,
          username: custom.username || "",
          color: slotColors[pId],
          rocks: Array.from({ length: 6 }, (_, rId) => ({
            id: rId,
            status: "yard",
            currentRing: 0,
            positionInRing: 0,
            hasCapturedThisRing: false
          }))
        };
      });
    } else {
      // Fallback to legacy default behavior
      const isSolo = (this.mode === "solo" || this.mode === "ai_bot");
      slots.forEach((pId, idx) => {
        let name = defaultNames[pId];
        let isBot = false;
        if (isSolo) {
          if (pId === "player1") {
            name = "You";
            isBot = false;
          } else {
            name = "Bot";
            isBot = true;
          }
        } else {
          name = `Player ${idx + 1}`;
          isBot = false;
        }

        this.players[pId] = {
          id: pId,
          name: name,
          avatar: "assets/avatars/avatar_1.png",
          isBot: isBot,
          username: "",
          color: slotColors[pId],
          rocks: Array.from({ length: 6 }, (_, rId) => ({
            id: rId,
            status: "yard",
            currentRing: 0,
            positionInRing: 0,
            hasCapturedThisRing: false
          }))
        };
      });
    }

    this.activePlayerIds = Object.keys(this.players);
    this.currentTurn = this.activePlayerIds[0];
    this.diceValue = 0;
    this.status = "in_progress";

    this.hasCapturedAnOpponent = {};
    this.consecutiveFailedYardRolls = {};
    this.activePlayerIds.forEach(pId => {
      this.hasCapturedAnOpponent[pId] = false;
      this.consecutiveFailedYardRolls[pId] = 0;
    });

    this.extraTurn = false;
    this.rollState = "idle";
    this.passedTurn = false;
  }

  // Generates a dice roll (returns standard unbiased 1-6 random roll)
  generatePityRoll(playerId) {
    // Unbiased, purely random roll (no pity mechanism)
    return Math.floor(Math.random() * 6) + 1;
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
      // 1. Enter all rocks from yard at once (only allowed if all 6 are in the yard)
      if (yardCount === 6) {
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
    let hasCaptured = this.hasCapturedAnOpponent[playerId];
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
          hasCaptured = true; // Remains unlocked once captured
          status = "active";
        } else {
          // Blocked! If we are trying to transition but are blocked, the move is invalid.
          return null;
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

    // Check if reached HOME ring (final ring) or if blocked at end of a ring
    if (ring === BARAKATTA_BOARD.rings.length - 1) {
      status = "home";
    } else if (pos === BARAKATTA_BOARD.playerPaths[playerId][ring].length - 1 && !hasCaptured) {
      status = "blocked";
    }

    return { ring, pos, hasCaptured, status, cell: finalCell };
  }

  // Returns list of cell coordinates the rock will visit step-by-step
  getRockStepPath(playerId, rockId, steps) {
    if (!this.isValidMove(playerId, rockId, steps)) return null;

    const rock = this.players[playerId].rocks[rockId];
    let ring = rock.currentRing;
    let pos = rock.positionInRing;
    let hasCaptured = this.hasCapturedAnOpponent[playerId];
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
          hasCaptured = true; // Remains unlocked once captured
        } else {
          return null;
        }
      } else {
        pos++;
        const cell = BARAKATTA_BOARD.playerPaths[playerId][ring][pos];
        const occupant = this.getOpponentOccupant(cell, playerId);
        const isSafe = this.isSafeSquare(cell);
        if (occupant && !isSafe) {
          hasCaptured = true;
        }
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

    if (action.type === "PASS") {
      this.passedTurn = true;
      actionSummary = "Passed turn.";
    } else if (action.type === "ENTER_ALL_6") {
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
      this.status = `${playerId}_won`;
    }

    return actionSummary;
  }

  // Transitions the active turn
  nextTurn() {
    this.rollState = "idle";
    
    // Explicit pass turn request forfeits extra turn benefits
    if (this.passedTurn) {
      this.passedTurn = false;
      this.extraTurn = false;
      
      const currentIndex = this.activePlayerIds.indexOf(this.currentTurn);
      const nextIndex = (currentIndex + 1) % this.activePlayerIds.length;
      this.currentTurn = this.activePlayerIds[nextIndex];
      return this.currentTurn;
    }
    
    // Check if extra turn is granted (roll of 6 or 1, or capture)
    if (this.diceValue === 6 || this.diceValue === 1 || this.extraTurn) {
      this.extraTurn = false; // Reset flag
      // Keep turn, player rolls again
      return this.currentTurn;
    }

    // Otherwise transition turns
    const currentIndex = this.activePlayerIds.indexOf(this.currentTurn);
    const nextIndex = (currentIndex + 1) % this.activePlayerIds.length;
    this.currentTurn = this.activePlayerIds[nextIndex];
    
    this.extraTurn = false;
    return this.currentTurn;
  }

  serializeState() {
    const serializedPlayers = {};
    Object.keys(this.players).forEach(pId => {
      serializedPlayers[pId] = {
        name: this.players[pId].name,
        color: this.players[pId].color,
        rocksHome: this.players[pId].rocks.filter(r => r.status === "home").length,
        rocks: this.players[pId].rocks
      };
    });
    return {
      mode: this.mode,
      players: serializedPlayers,
      currentTurn: this.currentTurn,
      diceValue: this.diceValue,
      status: this.status,
      hasCapturedAnOpponent: this.hasCapturedAnOpponent,
      rollState: this.rollState
    };
  }

  // Deep-clone the game state for Expectiminimax tree search lookahead
  clone() {
    const copy = new BarakattaGame(this.mode);
    copy.players = JSON.parse(JSON.stringify(this.players));
    copy.currentTurn = this.currentTurn;
    copy.diceValue = this.diceValue;
    copy.rollState = this.rollState;
    copy.extraTurn = this.extraTurn;
    copy.hasCapturedAnOpponent = JSON.parse(JSON.stringify(this.hasCapturedAnOpponent));
    copy.requireCaptureToEnterHome = this.requireCaptureToEnterHome;
    return copy;
  }

  // Evaluate the board state from the perspective of a playerId (positive is good for them, negative is bad)
  evaluateBoard(playerId) {
    const opponentId = (playerId === "player1") ? "player3" : "player1";
    let score = 0;

    // 1. Progress score based on ring index and position inside each ring
    const getRockScore = (rock) => {
      if (rock.status === "yard") return 0;
      if (rock.status === "home") return 1000;
      
      let base = 0;
      if (rock.currentRing === 0) {
        base = rock.positionInRing * 2;
      } else if (rock.currentRing === 1) {
        base = 50 + rock.positionInRing * 4;
      } else if (rock.currentRing === 2) {
        base = 120 + rock.positionInRing * 6;
      }
      if (rock.status === "blocked") {
        base -= 15; // Penalty for blocked rocks
      }
      return base;
    };

    this.players[playerId].rocks.forEach(rock => {
      score += getRockScore(rock);
      if (rock.status === "yard") score -= 50; // Heavy penalty for rocks in yard
    });

    this.players[opponentId].rocks.forEach(rock => {
      score -= getRockScore(rock);
      if (rock.status === "yard") score += 50; // Advantage if opponent is stuck in yard
    });

    // 2. Safety vs Vulnerability check (penalize if opponent can capture us next turn)
    this.players[playerId].rocks.forEach(rock => {
      if (rock.status === "active") {
        const cell = BARAKATTA_BOARD.playerPaths[playerId][rock.currentRing][rock.positionInRing];
        if (!this.isSafeSquare(cell)) {
          this.players[opponentId].rocks.forEach(oppRock => {
            if (oppRock.status === "active" || oppRock.status === "blocked") {
              for (let roll = 1; roll <= 6; roll++) {
                const sim = this.simulateMove(opponentId, oppRock.id, roll);
                if (sim && sim.cell.row === cell.row && sim.cell.col === cell.col) {
                  score -= 30; // Vulnerable to capture!
                  break;
                }
              }
            }
          });
        } else {
          score += 15; // Bonus for landing/sitting on safe cell
        }
      }
    });

    // 3. Threatening opportunities (bonus if we can capture opponent next turn)
    this.players[opponentId].rocks.forEach(oppRock => {
      if (oppRock.status === "active") {
        const cell = BARAKATTA_BOARD.playerPaths[opponentId][oppRock.currentRing][oppRock.positionInRing];
        if (!this.isSafeSquare(cell)) {
          this.players[playerId].rocks.forEach(rock => {
            if (rock.status === "active" || rock.status === "blocked") {
              for (let roll = 1; roll <= 6; roll++) {
                const sim = this.simulateMove(playerId, rock.id, roll);
                if (sim && sim.cell.row === cell.row && sim.cell.col === cell.col) {
                  score += 20; // Threatening opponent rock
                  break;
                }
              }
            }
          });
        }
      }
    });

    return score;
  }

  // Expectiminimax-based game playing AI for the opponent Bot (player3)
  getBotDecision(legalActions) {
    if (!legalActions || legalActions.length === 0) return null;
    if (legalActions.length === 1) return legalActions[0];

    let bestAction = null;
    let bestScore = -Infinity;

    for (const act of legalActions) {
      const simGame = this.clone();
      simGame.executeAction("player3", act);

      let expectedScore = 0;

      if (simGame.currentTurn === "player3") {
        // Bot gets another turn: maximize expected score across all possible next dice rolls (1-6)
        let sum = 0;
        for (let roll = 1; roll <= 6; roll++) {
          const nextActions = simGame.getLegalActions("player3", roll);
          if (nextActions.length === 0) {
            const tempGame = simGame.clone();
            tempGame.nextTurn();
            sum += tempGame.evaluateBoard("player3");
          } else {
            let maxScore = -Infinity;
            for (const nextAct of nextActions) {
              const tempGame = simGame.clone();
              tempGame.executeAction("player3", nextAct);
              const score = tempGame.evaluateBoard("player3");
              if (score > maxScore) maxScore = score;
            }
            sum += maxScore;
          }
        }
        expectedScore = sum / 6;
      } else {
        // Turn goes to player1 (Human): minimize expected score across all possible next dice rolls (1-6)
        let sum = 0;
        for (let roll = 1; roll <= 6; roll++) {
          const oppActions = simGame.getLegalActions("player1", roll);
          if (oppActions.length === 0) {
            const tempGame = simGame.clone();
            tempGame.nextTurn();
            sum += tempGame.evaluateBoard("player3");
          } else {
            let minScore = Infinity;
            for (const oppAct of oppActions) {
              const tempGame = simGame.clone();
              tempGame.executeAction("player1", oppAct);
              const score = tempGame.evaluateBoard("player3");
              if (score < minScore) minScore = score;
            }
            sum += minScore;
          }
        }
        expectedScore = sum / 6;
      }

      // Large reward for immediate captures on the current turn
      if (act.type === "MOVE_ROCK") {
        const sim = this.simulateMove("player3", act.rockId, act.steps);
        if (sim && sim.status !== "home" && !this.isSafeSquare(sim.cell)) {
          const opponent = this.getOpponentOccupant(sim.cell, "player3");
          if (opponent) {
            expectedScore += 150;
          }
        }
      }

      if (expectedScore > bestScore) {
        bestScore = expectedScore;
        bestAction = act;
      }
    }

    return bestAction;
  }

  serialize() {
    return {
      mode: this.mode,
      playerCount: this.playerCount,
      currentTurn: this.currentTurn,
      diceValue: this.diceValue,
      rollState: this.rollState || "idle",
      status: this.status,
      activePlayerIds: this.activePlayerIds,
      hasCapturedAnOpponent: this.hasCapturedAnOpponent,
      consecutiveFailedYardRolls: this.consecutiveFailedYardRolls,
      players: Object.keys(this.players).reduce((acc, pId) => {
        const p = this.players[pId];
        acc[pId] = {
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          isBot: p.isBot,
          color: p.color,
          username: p.username || "",
          rocks: p.rocks.map(r => ({
            id: r.id,
            status: r.status,
            currentRing: r.currentRing,
            positionInRing: r.positionInRing,
            hasCapturedThisRing: r.hasCapturedThisRing
          }))
        };
        return acc;
      }, {})
    };
  }

  deserialize(data) {
    this.mode = data.mode;
    this.playerCount = data.playerCount;
    this.currentTurn = data.currentTurn;
    this.diceValue = data.diceValue;
    this.rollState = data.rollState;
    this.status = data.status;
    this.activePlayerIds = data.activePlayerIds;
    this.hasCapturedAnOpponent = data.hasCapturedAnOpponent;
    this.consecutiveFailedYardRolls = data.consecutiveFailedYardRolls;
    
    this.players = {};
    Object.keys(data.players).forEach(pId => {
      const p = data.players[pId];
      this.players[pId] = {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        color: p.color,
        username: p.username || "",
        rocks: p.rocks.map(r => ({
          id: r.id,
          status: r.status,
          currentRing: r.currentRing,
          positionInRing: r.positionInRing,
          hasCapturedThisRing: r.hasCapturedThisRing
        }))
      };
    });
  }
}
window.BarakattaGame = BarakattaGame;
