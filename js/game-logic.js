// Star Greetings - Game Logic Engine
// Pure state management (no DOM operations) for future portability

class CardInstance {
  constructor(starData, instanceId) {
    this.id = starData.id;
    this.name = starData.name;
    this.industry = starData.industry;
    this.imagePath = starData.imagePath;
    this.movie = starData.movie || "";
    this.instanceId = instanceId; // Unique ID to identify this specific card instance
    this.playedBy = null; // Track who played this card in the pot
  }
}

class Player {
  constructor(name, id) {
    this.id = id;
    this.name = name;
    this.stack = []; // Array of CardInstance objects
    this.radiusOffset = 0; // Custom distance from center of table
    this.angleOffset = 0; // Custom angle offset around table (radians)
    this.coins = 300;
    this.freeStackBuys = 10;
    this.isBot = false;
  }

  get stackCount() {
    return this.stack.length;
  }
}

class GameState {
  constructor(config) {
    this.config = config || window.STAR_CONFIG;
    this.players = [];
    this.currentPlayerIndex = 0;
    this.pot = []; // Array of CardInstance currently in the pot
    this.logs = []; // Array of log strings or log objects
    this.roundNumber = 1;
    this.isGameOver = false;
    this.globalInstanceCounter = 0;
    this.matchBet = 0;
    this.isBetDeductedForCurrentPot = false;
    this.currentPotStarterIndex = 0;
    this.selectedCategory = "Tollywood";
    this.pendingMatchWinnings = null;
    this.matchWinsCount = 0;
  }

  // Set up the game with player names and stack size
  initializeGame(playerNames, startingStackSize, playerBets = [], selectedCategory = "Tollywood") {
    this.players = playerNames.map((name, index) => new Player(name, index));
    this.pot = [];
    this.logs = [];
    this.roundNumber = 1;
    this.isGameOver = false;
    this.globalInstanceCounter = 0;
    this.selectedCategory = selectedCategory;
    this.matchWinsCount = 0;

    const roster = this.config.roster;
    if (!roster || roster.length === 0) {
      throw new Error("Star roster is empty or not loaded.");
    }

    const activeCategory = this.selectedCategory || "Tollywood";
    const filteredRoster = roster.filter(c => c.industry.toLowerCase() === activeCategory.toLowerCase());
    const finalRoster = filteredRoster.length > 0 ? filteredRoster : roster;

    const lockedSize = 50; // Lock starting stack size to exactly 50 greetings

    this.players.forEach(player => {
      player.stack = [];
      for (let i = 0; i < lockedSize; i++) {
        const randomStar = finalRoster[Math.floor(Math.random() * finalRoster.length)];
        this.globalInstanceCounter++;
        player.stack.push(new CardInstance(randomStar, `card_${this.globalInstanceCounter}`));
      }
    });

    // Resolve consensus bet
    let resolvedBet = 25; // default fallback
    if (playerBets && playerBets.length > 0) {
      const counts = {};
      let maxCount = 0;
      playerBets.forEach(b => {
        const val = parseInt(b, 10) || 25;
        counts[val] = (counts[val] || 0) + 1;
        if (counts[val] > maxCount) {
          maxCount = counts[val];
          resolvedBet = val;
        } else if (counts[val] === maxCount) {
          // tie breaker: lower bet
          if (val < resolvedBet) {
            resolvedBet = val;
          }
        }
      });
    }
    this.matchBet = resolvedBet;

    // Deduct bet from players immediately at start (so balances show 275 right away)
    this.players.forEach(player => {
      player.coins = isNaN(parseInt(player.coins, 10)) ? 300 : parseInt(player.coins, 10);
      if (player.coins < this.matchBet) {
        player.coins += 300;
        this.addLog(`${player.name} was auto-refilled with 300 coins to cover the bet.`);
      }
      player.coins -= this.matchBet;
    });
    this.isBetDeductedForCurrentPot = true;

    // Start with the first player
    this.currentPlayerIndex = 0;
    this.currentPotStarterIndex = 0;
    this.addLog(`Game started with ${this.players.length} players. Match Bet resolved to 🪙${this.matchBet} from player votes.`);
  }

  // Add a log entry
  addLog(message) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.logs.unshift({
      timestamp,
      round: this.roundNumber,
      message
    });
  }

  // Get current active player
  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  // Get active players (players who still have cards)
  getActivePlayers() {
    return this.players.filter(p => p.stackCount > 0);
  }

  // Find next player index with cards, starting after current player
  // Returns -1 if no players have cards left
  findNextPlayerIndex(startIndex) {
    const total = this.players.length;
    let nextIndex = startIndex;
    for (let i = 0; i < total; i++) {
      nextIndex = (nextIndex + 1) % total;
      if (this.players[nextIndex].stackCount > 0) {
        return nextIndex;
      }
    }
    return -1;
  }

  // Play a card from the current player's stack into the pot
  // If FORCED_TOP_DRAW is true, it plays the first card in their stack
  // If false, it plays the card corresponding to the instanceId
  playCard(cardInstanceId = null) {
    if (this.isGameOver) return { error: "Game is over" };

    const activePlayer = this.getCurrentPlayer();
    if (!activePlayer || activePlayer.stackCount === 0) {
      return { error: "Player has no cards to play" };
    }

    // Deduct bet if starting a new pot matchup and not yet deducted
    if (!this.isBetDeductedForCurrentPot) {
      const activePlayers = this.getActivePlayers();
      activePlayers.forEach(p => {
        p.coins = isNaN(parseInt(p.coins, 10)) ? 300 : parseInt(p.coins, 10);
        if (p.coins < this.matchBet) {
          p.coins += 300;
          this.addLog(`${p.name} was auto-refilled with 300 coins to cover the bet.`);
        }
        p.coins -= this.matchBet;
      });
      this.isBetDeductedForCurrentPot = true;
      this.currentPotStarterIndex = this.currentPlayerIndex;
      this.addLog(`New card matchup started. All active players bet 🪙${this.matchBet}.`);
    }

    let cardToPlay = null;
    let cardIndex = -1;

    if (this.config.FORCED_TOP_DRAW) {
      // Force draw top card
      cardToPlay = activePlayer.stack[0];
      cardIndex = 0;
    } else {
      // Find specified card
      cardIndex = activePlayer.stack.findIndex(c => c.instanceId === cardInstanceId);
      if (cardIndex === -1) {
        return { error: "Card not found in player's hand" };
      }
      cardToPlay = activePlayer.stack[cardIndex];
    }

    // Remove from player stack
    activePlayer.stack.splice(cardIndex, 1);
    
    // Assign played by owner index
    cardToPlay.playedBy = this.currentPlayerIndex;

    // Check if card matches the top card currently in the pot (same star ID or actor)
    const getActorId = (id) => {
      if (id === 'baahubali') return 'prabhas';
      if (id === 'rangasthalam') return 'ram_charan';
      if (id === 'gabbar_singh') return 'pawan_kalyan';
      return id;
    };
    const hasMatch = this.pot.length > 0 && getActorId(this.pot[this.pot.length - 1].id) === getActorId(cardToPlay.id);
    const matchIndex = hasMatch ? this.pot.length - 1 : -1;

    let outcome = {
      playerIndex: this.currentPlayerIndex,
      playerName: activePlayer.name,
      playedCard: cardToPlay,
      hasMatch: hasMatch,
      potBeforePlay: [...this.pot]
    };

    if (hasMatch) {
      // Player wins the round!
      const wonCardsCount = this.pot.length;
      const matchedCard = this.pot[matchIndex];
      
      // Calculate winnings
      const activePlayers = this.getActivePlayers();
      const totalOpponents = activePlayers.filter(p => p.id !== activePlayer.id).length;
      const winnings = totalOpponents * this.matchBet;
      
      // Store in pending state (winnings will be collected in collectMatchEarnings)
      this.pendingMatchWinnings = {
        winnerIndex: this.currentPlayerIndex,
        cards: [...this.pot, cardToPlay],
        coins: winnings + this.matchBet,
        deductionPlayers: this.players.filter(p => p.id !== this.currentPlayerIndex && p.stackCount > 0).map(p => p.id),
        wonCardsCount: wonCardsCount,
        winnings: winnings,
        matchedStarName: cardToPlay.name,
        roundNumber: this.roundNumber
      };

      // Add log
      this.addLog(`Round ${this.roundNumber}: ${activePlayer.name} matched "${cardToPlay.name}", won ${wonCardsCount} cards, and won 🪙${winnings} from opponents.`);
      
      outcome.wonCount = wonCardsCount;
      outcome.matchedWith = matchedCard;
      outcome.gameEnded = false;
    } else {
      // No match. Card is added to the pot.
      this.pot.push(cardToPlay);
      
      // Check if any player has reached 0 cards (which triggers immediate game end)
      const hasAnyPlayerReachedZero = this.players.some(p => p.stackCount === 0);
      if (hasAnyPlayerReachedZero) {
        this.isGameOver = true;
        outcome.gameEnded = true;
        
        // Player with 0 greetings is the LOSER. Winner is the player with the MOST cards.
        let winner = this.players[0];
        let maxCards = -1;
        this.players.forEach(p => {
          if (p.stackCount > maxCards) {
            maxCards = p.stackCount;
            winner = p;
          }
        });
        
        const loser = this.players.find(p => p.stackCount === 0);
        
        // Award the remaining pot coins to the winner of the match
        if (this.isBetDeductedForCurrentPot) {
          const activePlayersCount = this.players.filter(p => p.stackCount > 0).length;
          const winnings = activePlayersCount * this.matchBet;
          winner.coins += winnings;
          this.addLog(`${winner.name} won the final pot of 🪙${winnings} coins!`);
          this.isBetDeductedForCurrentPot = false;
        }
        
        const loserName = loser ? loser.name : "A player";
        this.addLog(`Game Over! ${loserName} ran out of greetings. ${winner.name} wins the match!`);
      } else {
        // Turn rotates to next player with cards
        const nextIndex = this.findNextPlayerIndex(this.currentPlayerIndex);
        if (nextIndex === -1) {
          this.isGameOver = true;
          outcome.gameEnded = true;
        } else {
          if (nextIndex <= this.currentPlayerIndex) {
            this.roundNumber++;
          }
          this.currentPlayerIndex = nextIndex;
        }
      }
    }

    outcome.nextPlayerIndex = this.currentPlayerIndex;
    outcome.isGameOver = this.isGameOver;
    outcome.scoreboard = this.getScoreboard();

    return outcome;
  }

  collectMatchEarnings() {
    if (!this.pendingMatchWinnings) return;
    const { winnerIndex, cards, coins, deductionPlayers } = this.pendingMatchWinnings;
    
    const winnerPlayer = this.players[winnerIndex];
    if (winnerPlayer) {
      winnerPlayer.stack.push(...cards);
      winnerPlayer.coins += coins;
    }
    
    deductionPlayers.forEach(pId => {
      const p = this.players[pId];
      if (p && p.stackCount > 0) {
        p.stack.splice(0, 10);
      }
    });
    
    this.pot = [];
    this.isBetDeductedForCurrentPot = false;
    
    const activePlayersAfter = this.getActivePlayers();
    if (activePlayersAfter.length <= 1) {
      this.isGameOver = true;
      const winner = activePlayersAfter[0] || this.players[0];
      this.addLog(`Game Over! Only ${activePlayersAfter.length > 0 ? activePlayersAfter[0].name : "nobody"} has cards left.`);
    }
    
    this.pendingMatchWinnings = null;
  }

  // Get current scoreboard rankings — most cards = highest rank (winner first)
  getScoreboard() {
    return this.players.map(p => ({
      id: p.id,
      name: p.name,
      stackCount: p.stackCount,
      coins: p.coins,
      freeStackBuys: p.freeStackBuys
    })).sort((a, b) => b.stackCount - a.stackCount); // DESCENDING: most cards = winner
  }

  // Force end the game and get final standings
  endGame() {
    this.isGameOver = true;
    
    // Find winner — player with the MOST cards wins
    let winner = this.players[0];
    let maxCards = -1;
    this.players.forEach(p => {
      if (p.stackCount > maxCards) {
        maxCards = p.stackCount;
        winner = p;
      }
    });
    
    this.addLog(`Match over! ${winner.name} wins with the most greetings (${maxCards}).`);
    return this.getScoreboard();
  }

  // Buy a stack of 50 cards
  buyStack(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: "Player not found" };
    if (player.stackCount > 0) return { error: "Player already has cards" };

    let costType = "";
    if (player.freeStackBuys > 0) {
      player.freeStackBuys--;
      costType = "free buy";
    } else if (player.coins >= 100) {
      player.coins -= 100;
      costType = "100 coins";
    } else {
      return { error: "Not enough coins or free buys" };
    }

    // Add 50 cards to player's stack from selected deck theme
    const roster = this.config.roster;
    const activeCategory = this.selectedCategory || "Tollywood";
    const filteredRoster = roster.filter(c => c.industry.toLowerCase() === activeCategory.toLowerCase());
    const finalRoster = filteredRoster.length > 0 ? filteredRoster : roster;

    for (let i = 0; i < 50; i++) {
      const randomStar = finalRoster[Math.floor(Math.random() * finalRoster.length)];
      this.globalInstanceCounter++;
      player.stack.push(new CardInstance(randomStar, `card_${this.globalInstanceCounter}`));
    }

    this.addLog(`${player.name} bought a new stack (50 greetings) using a ${costType}.`);

    // If game was over because only 1 active player was left, reset gameOver state if there are now >1 active players
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length > 1 && this.isGameOver) {
      this.isGameOver = false;
      this.addLog(`Game resumed as ${player.name} re-entered the match!`);
    }

    return { success: true };
  }

  // Shuffle player's stack
  shuffleStack(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.stackCount <= 1) return { error: "Cannot shuffle stack" };

    // Fisher-Yates shuffle algorithm
    for (let i = player.stack.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = player.stack[i];
      player.stack[i] = player.stack[j];
      player.stack[j] = temp;
    }

    this.addLog(`${player.name} shuffled their greetings stack.`);
    return { success: true };
  }

  // Refill coins
  buyCoins(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: "Player not found" };
    player.coins += 300;
    this.addLog(`${player.name} bought 300 coins. New balance: ${player.coins} coins.`);
    return { success: true };
  }
}

// Export class if using module system, otherwise attach to window
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GameState, CardInstance };
} else {
  window.GameState = GameState;
  window.CardInstance = CardInstance;
}
