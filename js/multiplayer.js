// Star Greetings - Firebase Online Multiplayer Sync Engine

class MultiplayerManager {
  constructor() {
    this.roomRef = null;
    this.roomCode = null;
    this.isHost = false;
    this.currentUser = null;
    this.lastActionTimestamp = 0;
    this.lastActionId = null;
    this.db = null;
    this.disconnectTimer = null;
    
    // Clean up old broken default URL from previous builds if saved in local storage
    let savedUrl = localStorage.getItem("star_greetings_firebase_url");
    if (savedUrl && savedUrl.includes("star-greetings-default-default-rtdb")) {
      localStorage.removeItem("star_greetings_firebase_url");
      savedUrl = null;
    }
    
    // Default public Firebase Config for out-of-the-box operation
    this.firebaseConfig = {
      databaseURL: savedUrl || "https://star-greetings-default-rtdb.asia-southeast1.firebasedatabase.app"
    };

    this.initFirebase();
  }

  initFirebase() {
    try {
      this.db = null;
      if (typeof firebase === 'undefined') {
        console.error("Firebase is not loaded.");
        return;
      }
      
      // Initialize Firebase app or use existing one
      if (firebase.apps.length > 0) {
        // Since we only change databaseURL, we can re-use or re-initialize
        this.db = firebase.database();
      } else {
        firebase.initializeApp(this.firebaseConfig);
        this.db = firebase.database();
      }
    } catch (e) {
      console.error("Failed to initialize Firebase:", e);
    }
  }

  // Promise Timeout helper to prevent hanging on write errors or DNS failures
  withTimeout(promise, ms = 4500) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Database connection timed out. Please check your database settings and internet connection.")), ms))
    ]);
  }

  // Open Database config modal
  openDbConfigModal() {
    const modal = document.getElementById("db-config-modal");
    const input = document.getElementById("db-config-url");
    if (modal && input) {
      input.value = localStorage.getItem("star_greetings_firebase_url") || this.firebaseConfig.databaseURL;
      modal.classList.remove("hidden");
      modal.style.display = "flex";
    }
  }

  closeDbConfigModal() {
    const modal = document.getElementById("db-config-modal");
    if (modal) {
      modal.classList.add("hidden");
      modal.style.display = "none";
    }
  }

  async saveDbConfig(url) {
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith("https://")) {
      alert("Invalid URL. Must start with https://");
      return;
    }
    
    localStorage.setItem("star_greetings_firebase_url", cleanUrl);
    this.firebaseConfig.databaseURL = cleanUrl;
    
    try {
      if (firebase.apps.length > 0) {
        await firebase.app().delete();
      }
      firebase.initializeApp(this.firebaseConfig);
      this.db = firebase.database();
      alert("Database settings updated and connected successfully!");
      this.closeDbConfigModal();
    } catch (e) {
      alert("Failed to initialize with new URL: " + e.message);
    }
  }

  async resetDbConfigToDefault() {
    localStorage.removeItem("star_greetings_firebase_url");
    const defaultUrl = "https://star-greetings-default-rtdb.asia-southeast1.firebasedatabase.app";
    this.firebaseConfig.databaseURL = defaultUrl;
    
    try {
      if (firebase.apps.length > 0) {
        await firebase.app().delete();
      }
      firebase.initializeApp(this.firebaseConfig);
      this.db = firebase.database();
      
      const input = document.getElementById("db-config-url");
      if (input) input.value = defaultUrl;
      
      alert("Database settings reset to default successfully!");
      this.closeDbConfigModal();
    } catch (e) {
      alert("Failed to reset: " + e.message);
    }
  }

  // Generate a random 5-letter Room Code
  generateRoomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Hide all screens and show a specific one
  showScreen(screenId) {
    if (window.cleanupFloatingElements) {
      window.cleanupFloatingElements();
    }
    const screens = [
      "login-screen", "signup-screen", "forgot-password-screen",
      "dashboard-screen", "online-lobby-screen", "online-waiting-screen",
      "setup-screen", "game-screen", "end-screen"
    ];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });
    const target = document.getElementById(screenId);
    if (target) target.classList.remove("hidden");
  }

  // Create a new room
  async createRoom() {
    if (!this.db) {
      alert("Firebase Database is not configured or failed to initialize. Please enter your database settings.");
      this.openDbConfigModal();
      return;
    }

    this.currentUser = window.auth.getCurrentUser();
    if (!this.currentUser) {
      alert("Please log in first.");
      return;
    }

    this.roomCode = this.generateRoomCode();
    this.isHost = true;
    window.isOnlineGame = true;
    window.currentUserUsername = this.currentUser.username;

    const roomData = {
      roomCode: this.roomCode,
      status: "waiting",
      hostUsername: this.currentUser.username,
      placementMode: "middle",
      players: {
        [this.currentUser.username]: {
          name: this.currentUser.name || this.currentUser.username || "Player",
          username: this.currentUser.username,
          avatar: "assets/avatars/avatar_1.png", // default Player 1 avatar
          coins: this.currentUser.coins !== undefined ? this.currentUser.coins : 300,
          betVote: 25,
          joinedAt: firebase.database.ServerValue.TIMESTAMP
        }
      }
    };

    try {
      this.roomRef = this.db.ref(`rooms/${this.roomCode}`);
      await this.withTimeout(this.roomRef.set(roomData));
      this.roomRef.child(`players/${this.currentUser.username}`).onDisconnect().remove();
      
      // Setup listener
      this.listenToRoom();
      
      // Update UI
      document.getElementById("lobby-room-code-lbl").textContent = this.roomCode;
      this.showScreen("online-waiting-screen");
    } catch (e) {
      alert("Failed to create room: " + e.message);
      this.openDbConfigModal();
    }
  }

  // Join an existing room
  async joinRoom() {
    if (!this.db) {
      alert("Firebase Database is not configured or failed to initialize. Please enter your database settings.");
      this.openDbConfigModal();
      return;
    }

    const codeInput = document.getElementById("online-join-code");
    const code = codeInput.value.trim().toUpperCase();
    if (!code || code.length !== 5) {
      alert("Please enter a valid 5-letter Room Code.");
      return;
    }

    this.currentUser = window.auth.getCurrentUser();
    if (!this.currentUser) {
      alert("Please log in first.");
      return;
    }

    this.roomCode = code;
    this.isHost = false;
    window.isOnlineGame = true;
    window.currentUserUsername = this.currentUser.username;

    try {
      this.roomRef = this.db.ref(`rooms/${this.roomCode}`);
      const snapshot = await this.withTimeout(this.roomRef.once("value"));
      
      if (!snapshot.exists()) {
        alert("Room code not found!");
        return;
      }

      const room = snapshot.val();
      if (room.status !== "waiting") {
        alert("This match has already started or ended.");
        return;
      }

      const playersCount = Object.keys(room.players || {}).length;
      if (playersCount >= 6) {
        alert("Room is full (max 6 players).");
        return;
      }

      // Assign avatar dynamically based on seat index
      const avatarIdx = playersCount % 6;
      const avatarUrl = `assets/avatars/avatar_${avatarIdx + 1}.png`;

      // Add current player to room
      const playerRef = this.roomRef.child(`players/${this.currentUser.username}`);
      await this.withTimeout(playerRef.set({
        name: this.currentUser.name || this.currentUser.username || "Player",
        username: this.currentUser.username,
        avatar: avatarUrl || "assets/avatars/avatar_1.png",
        coins: this.currentUser.coins !== undefined ? this.currentUser.coins : 300,
        betVote: 25,
        joinedAt: firebase.database.ServerValue.TIMESTAMP
      }));
      playerRef.onDisconnect().remove();

      // Setup listener
      this.listenToRoom();

      // Update UI
      document.getElementById("lobby-room-code-lbl").textContent = this.roomCode;
      this.showScreen("online-waiting-screen");
    } catch (e) {
      alert("Failed to join room: " + e.message);
      this.openDbConfigModal();
    }
  }

  // Leave room
  async leaveRoom() {
    if (!this.roomRef) return;

    try {
      if (this.isHost) {
        // Delete the room if host leaves
        await this.roomRef.remove();
      } else {
        // Remove player
        await this.roomRef.child(`players/${this.currentUser.username}`).remove();
      }
    } catch (e) {
      console.error(e);
    }

    this.cleanupRoom();
    this.showScreen("online-lobby-screen");
  }

  cleanupRoom() {
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
    if (this.roomRef) {
      try {
        if (this.currentUser) {
          this.roomRef.child(`players/${this.currentUser.username}`).onDisconnect().cancel();
        }
      } catch (e) {
        console.error("onDisconnect cancel error:", e);
      }
      this.roomRef.off();
      this.roomRef = null;
    }
    this.roomCode = null;
    this.isHost = false;
    window.isOnlineGame = false;
    window.currentUserUsername = null;
  }

  // Listen for changes to the room
  listenToRoom() {
    this.roomRef.on("value", (snapshot) => {
      if (!snapshot.exists()) {
        // Room deleted
        if (window.isOnlineGame) {
          if (window.game && !window.game.isGameOver && window.game.players.length > 0) {
            // We were in the middle of a match and the host disconnected/deleted room!
            this.handlePlayerLeftWin();
          } else {
            alert("The room was closed by the host.");
            this.cleanupRoom();
            this.showScreen("dashboard-screen");
          }
        }
        return;
      }

      const room = snapshot.val();
      
      // If we are actively playing, check if an opponent left the match
      if (room.status === "playing" && window.game && !window.game.isGameOver) {
        // Self-healing during play: if my player node is missing (due to disconnect), re-add myself!
        if (this.currentUser) {
          const myUsername = (this.currentUser.username || "").toLowerCase().trim();
          if (myUsername && (!room.players || !room.players[myUsername])) {
            console.log("Self-healing during play: Re-registering myself in the players list");
            
            // Re-find my avatar from local game if possible
            const matchMe = window.game.players.find(p => 
              (p.username && p.username.toLowerCase().trim() === myUsername) ||
              (p.name && p.name.toLowerCase().trim() === (this.currentUser.name || "").toLowerCase().trim())
            );
            const avatarUrl = matchMe ? matchMe.avatar : "assets/avatars/avatar_1.png";
            
            playerRef.set({
              name: this.currentUser.name || this.currentUser.username || "Player",
              username: myUsername,
              avatar: avatarUrl || "assets/avatars/avatar_1.png",
              coins: this.currentUser.coins !== undefined ? this.currentUser.coins : 300,
              betVote: 25,
              joinedAt: firebase.database.ServerValue.TIMESTAMP
            });
            playerRef.onDisconnect().remove();
            return;
          }
        }

        const currentPlayersInRoom = Object.keys(room.players || {});
        
        // If players list has restored to full, clear any disconnect timer
        if (currentPlayersInRoom.length >= window.game.players.length) {
          if (this.disconnectTimer) {
            clearTimeout(this.disconnectTimer);
            this.disconnectTimer = null;
            console.log("Opponent reconnected. Cancelled default win timer.");
          }
        }

        // If the number of connected players in DB is less than active game players,
        // and we are the last player left, start the default win grace period timer!
        if (currentPlayersInRoom.length < window.game.players.length) {
          const isMeInRoom = room.players[this.currentUser.username] !== undefined;
          if (isMeInRoom && currentPlayersInRoom.length === 1) {
            if (!this.disconnectTimer) {
              console.log("Opponent disconnected. Waiting 10 seconds grace period for reconnect...");
              this.disconnectTimer = setTimeout(() => {
                this.handlePlayerLeftWin();
                this.disconnectTimer = null;
              }, 10000);
            }
          }
        }
      }
      
      if (room.status === "waiting") {
        // Self-healing: if my player node is missing (due to a connection drop), re-add myself!
        if (this.currentUser) {
          const myUsername = (this.currentUser.username || "").toLowerCase().trim();
          if (myUsername && (!room.players || !room.players[myUsername])) {
            console.log("Self-healing: Re-registering myself in the waiting room list");
            
            // Assign avatar index
            const playersCount = Object.keys(room.players || {}).length;
            const avatarUrl = this.isHost ? "assets/avatars/avatar_1.png" : `assets/avatars/avatar_${(playersCount % 6) + 1}.png`;
            
            playerRef.set({
              name: this.currentUser.name || this.currentUser.username || "Player",
              username: myUsername,
              avatar: avatarUrl || "assets/avatars/avatar_1.png",
              coins: this.currentUser.coins !== undefined ? this.currentUser.coins : 300,
              betVote: 25,
              joinedAt: firebase.database.ServerValue.TIMESTAMP
            });
            playerRef.onDisconnect().remove();
            return; // let the set update trigger next sync
          }
        }
        this.syncWaitingLobby(room);
      } else if (room.status === "playing") {
        this.syncActiveGame(room);
      } else if (room.status === "ended") {
        this.syncEndedGame(room);
      }
    });
  }

  // Render Waiting Lobby players list
  syncWaitingLobby(room) {
    const playersListEl = document.getElementById("lobby-players-list");
    const playerCountEl = document.getElementById("lobby-player-count");
    
    if (!playersListEl || !playerCountEl) return;
    playersListEl.innerHTML = "";
    
    // Sync placement mode selection
    const placementSelect = document.getElementById("online-placement-mode");
    if (placementSelect) {
      placementSelect.value = room.placementMode || "middle";
      if (this.isHost) {
        placementSelect.removeAttribute("disabled");
      } else {
        placementSelect.setAttribute("disabled", "true");
      }
    }
    
    // Sort players by join timestamp to keep consistent order, and guarantee username property is populated from keys
    const players = Object.entries(room.players || {}).map(([username, p]) => {
      p.username = username;
      return p;
    }).sort((a, b) => a.joinedAt - b.joinedAt);
    playerCountEl.textContent = players.length;

    players.forEach(p => {
      const row = document.createElement("li");
      row.className = "lobby-player-row";
      
      const isHost = p.username === room.hostUsername;
      
      row.innerHTML = `
        <div class="lobby-player-info">
          <img src="${p.avatar}" class="lobby-player-avatar" alt="Avatar">
          <span class="lobby-player-name">${p.name}</span>
        </div>
        <div class="lobby-player-badges">
          ${isHost ? `<span class="lobby-badge host">Host</span>` : ""}
          <span class="lobby-badge bet">Vote: 🪙${p.betVote}</span>
        </div>
      `;
      playersListEl.appendChild(row);
    });

    // Handle Start button visibility
    const startBtn = document.getElementById("online-start-match-btn");
    const waitingMsg = document.getElementById("online-host-msg");
    
    if (startBtn && waitingMsg) {
      if (this.isHost) {
        startBtn.style.display = "block";
        waitingMsg.style.display = "none";
        
        // Enable Start button only if at least 2 players have joined
        if (players.length >= 2) {
          startBtn.removeAttribute("disabled");
        } else {
          startBtn.setAttribute("disabled", "true");
        }
      } else {
        startBtn.style.display = "none";
        waitingMsg.style.display = "block";
      }
    }
  }

  // Update personal bet vote in waiting lobby
  async updateBetVote(val) {
    if (!this.roomRef || !this.currentUser) return;
    await this.roomRef.child(`players/${this.currentUser.username}/betVote`).set(val);
  }

  // Update card placement mode selection in waiting lobby (Host only)
  async updatePlacementMode(val) {
    if (!this.roomRef || !this.isHost) return;
    try {
      await this.roomRef.child("placementMode").set(val);
    } catch (e) {
      console.error("Failed to update placement mode:", e);
    }
  }

  // Start the match (Host only)
  async startMatch() {
    if (!this.isHost || !this.roomRef) return;

    try {
      const snapshot = await this.roomRef.once("value");
      const room = snapshot.val();
      const players = Object.values(room.players || {}).sort((a, b) => a.joinedAt - b.joinedAt);
      
      if (players.length < 2) {
        alert("Need at least 2 players to start.");
        return;
      }

      // Initialize game logic engine locally to serialize state
      const playerNames = players.map(p => p.name || p.username || "Player");
      const playerBets = players.map(p => p.betVote || 25);
      
      const gameEngine = new GameState();
      gameEngine.config.CARD_PLACEMENT_MODE = room.placementMode || "middle";
      gameEngine.initializeGame(playerNames, 30, playerBets);
      
      // Bind avatars and usernames to GameState players
      gameEngine.players.forEach((p, idx) => {
        p.avatar = players[idx].avatar;
        p.username = players[idx].username;
        p.coins = players[idx].coins; // carry over actual coins from database
      });

      // Re-deduct initial bets based on actual player coins
      gameEngine.players.forEach(p => {
        if (p.coins < gameEngine.matchBet) {
          p.coins += 300;
          gameEngine.addLog(`${p.name} was auto-refilled with 300 coins to cover the bet.`);
        }
        p.coins -= gameEngine.matchBet;
      });

      // Serialize state
      const serializedGameState = this.serializeGameState(gameEngine);

      // Write to database
      await this.roomRef.update({
        status: "playing",
        gameState: serializedGameState,
        lastAction: {
          type: "gameStart",
          actionId: "start_" + Math.random().toString(36).substring(2, 11),
          timestamp: firebase.database.ServerValue.TIMESTAMP
        }
      });
    } catch (e) {
      alert("Failed to start match: " + e.message);
    }
  }

  // Serialize local GameState object to flat JSON
  serializeGameState(game) {
    return {
      currentPlayerIndex: game.currentPlayerIndex,
      pot: game.pot.map(c => this.serializeCard(c)),
      logs: game.logs || [],
      roundNumber: game.roundNumber,
      isGameOver: game.isGameOver,
      globalInstanceCounter: game.globalInstanceCounter,
      matchBet: game.matchBet,
      isBetDeductedForCurrentPot: game.isBetDeductedForCurrentPot,
      currentPotStarterIndex: game.currentPotStarterIndex,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name || p.username || "Player",
        username: p.username || "player",
        avatar: p.avatar || "assets/avatars/avatar_1.png",
        coins: p.coins !== undefined ? p.coins : 300,
        freeStackBuys: p.freeStackBuys !== undefined ? p.freeStackBuys : 10,
        stack: p.stack.map(c => this.serializeCard(c)),
        radiusOffset: p.radiusOffset || 0,
        angleOffset: p.angleOffset || 0
      }))
    };
  }

  serializeCard(c) {
    return {
      id: c.id || "",
      name: c.name || "Unknown Star",
      industry: c.industry || "Tollywood",
      imagePath: c.imagePath || "",
      instanceId: c.instanceId || "",
      playedBy: c.playedBy !== undefined ? c.playedBy : null
    };
  }

  // Sync active game state update
  syncActiveGame(room) {
    // Hide waiting room screen and show game screen
    this.showScreen("game-screen");

    // Sync card placement mode
    window.game.config.CARD_PLACEMENT_MODE = room.placementMode || "middle";

    const stateData = room.gameState;
    if (!stateData) return;

    // Instantiate / rebuild game logic structure
    window.game.deserialize(stateData);

    // Sync views
    const activePlayer = window.game.getCurrentPlayer();
    
    // Update top HUD elements
    document.getElementById("hud-round-num").textContent = window.game.roundNumber;
    document.getElementById("hud-bet-amt").textContent = `🪙${window.game.matchBet}`;
    document.getElementById("hud-active-player-name").textContent = activePlayer ? activePlayer.name : "";

    // Sync database coins back to user profile locally if coin values changed
    this.syncLocalCoinsWithMatch();

    // Check last action to play animations
    const lastAction = room.lastAction;
    if (lastAction) {
      const isNewAction = lastAction.actionId && lastAction.actionId !== this.lastActionId;
      const isInitialLoad = !this.lastActionId;

      if (isNewAction) {
        this.lastActionId = lastAction.actionId;
        if (!isInitialLoad) {
          this.playActionAnimation(lastAction, room.gameState);
          return;
        }
      }
    }

    // Default static rendering if no animation is triggered (e.g., on page reload)
    window.renderSeats();
    window.renderPot();
    window.renderScoreboard();
    window.renderLogs();

    if (window.game.isGameOver) {
      this.triggerGameOver();
    }
  }

  syncLocalCoinsWithMatch() {
    const localUser = window.auth.getCurrentUser();
    if (localUser && window.game && window.game.players) {
      const matchMe = window.game.players.find(p => 
        (p.username && p.username.toLowerCase().trim() === localUser.username.toLowerCase().trim()) ||
        (p.name && p.name.toLowerCase().trim() === localUser.name.toLowerCase().trim())
      );
      if (matchMe && matchMe.coins !== localUser.coins) {
        const accounts = window.auth.getAccounts();
        if (accounts[localUser.username]) {
          accounts[localUser.username].coins = matchMe.coins;
          window.auth.saveAccounts(accounts);
        }
      }
    }
  }

  playActionAnimation(lastAction, gameState) {
    if (lastAction.type === "gameStart") {
      window.renderSeats();
      window.renderPot();
      window.renderScoreboard();
      window.renderLogs();
      window.triggerCoinMergeAnimation();
    } else if (lastAction.type === "play") {
      const playerIndex = lastAction.playerIndex;
      const cardPlayed = lastAction.card;
      const hasMatch = lastAction.hasMatch;
      const potBeforePlay = lastAction.potBeforePlay || [];

      // Run floating card animation
      const originSeatDom = document.querySelector(`.player-seat[data-player-id="${playerIndex}"]`);
      const pileDom = originSeatDom ? originSeatDom.querySelector(".player-seat-stack") : null;
      const startRect = pileDom ? pileDom.getBoundingClientRect() : document.body.getBoundingClientRect();
      const targetRect = document.getElementById("pot-cards-container").getBoundingClientRect();

      const floatCard = window.createCardElement(cardPlayed);
      floatCard.classList.add("floating-card-anim");
      document.body.appendChild(floatCard);

      floatCard.style.position = "fixed";
      floatCard.style.top = `${startRect.top}px`;
      floatCard.style.left = `${startRect.left}px`;
      floatCard.style.width = `${startRect.width}px`;
      floatCard.style.height = `${startRect.height}px`;
      floatCard.style.margin = "0";
      floatCard.style.transition = "all 0.5s cubic-bezier(0.25, 1, 0.5, 1)";

      // Force reflow
      floatCard.getBoundingClientRect();

      const targetX = targetRect.left + (targetRect.width / 2) - (startRect.width / 2);
      const targetY = targetRect.top + (targetRect.height / 2) - (startRect.height / 2);
      const targetRotation = (gameState.pot.length * 37) % 40 - 20;

      floatCard.style.top = `${targetY}px`;
      floatCard.style.left = `${targetX}px`;
      floatCard.style.transform = `rotate(${targetRotation}deg)`;

      // Play touch click sound
      window.playTouchSound();

      setTimeout(() => {
        floatCard.remove();

        if (hasMatch) {
          // Play win sequence
          const outcome = {
            playerIndex: playerIndex,
            playerName: lastAction.playerName,
            playedCard: cardPlayed,
            wonCount: lastAction.wonCount,
            isGameOver: gameState.isGameOver,
            potBeforePlay: potBeforePlay
          };
          
          // Re-render seats & logs
          window.renderSeats();
          window.renderScoreboard();
          window.renderLogs();

          // Win overlay animation
          this.triggerWinFlashOnline(outcome);
        } else {
          // Normal turn sync
          window.renderPot();
          window.renderSeats();
          window.renderScoreboard();
          window.renderLogs();
        }
      }, 500);
    } else if (lastAction.type === "shuffle") {
      window.playShuffleSound();
      window.renderSeats();
      window.renderLogs();
    } else if (lastAction.type === "buyStack" || lastAction.type === "buyCoins") {
      window.playReadySound();
      window.renderSeats();
      window.renderScoreboard();
      window.renderLogs();
    }
  }

  triggerWinFlashOnline(outcome) {
    const winOverlay = document.createElement("div");
    winOverlay.className = "win-flash-overlay";
    winOverlay.innerHTML = `
      <div class="win-flash-content">
        <h2 class="win-flash-title">${outcome.playerName} Wins the Pot!</h2>
        <p class="win-flash-sub">Matched: <strong>${outcome.playedCard.name}</strong></p>
        <p class="win-flash-cards">+${outcome.wonCount} cards added to stack</p>
      </div>
    `;
    document.body.appendChild(winOverlay);

    // Get winner seat coordinates
    const winnerSeatDom = document.querySelector(`.player-seat[data-player-id="${outcome.playerIndex}"]`);
    const winnerPileDom = winnerSeatDom ? winnerSeatDom.querySelector(".player-seat-stack") : null;
    const targetRect = winnerPileDom ? winnerPileDom.getBoundingClientRect() : document.body.getBoundingClientRect();

    // Fly pot cards to winner
    const potCards = document.querySelectorAll("#pot-cards-container .star-card");
    potCards.forEach(card => {
      const rect = card.getBoundingClientRect();
      card.style.position = "fixed";
      card.style.top = `${rect.top}px`;
      card.style.left = `${rect.left}px`;
      card.style.transition = "all 0.8s cubic-bezier(0.7, 0, 0.3, 1), opacity 0.5s";
      card.getBoundingClientRect();
      
      card.style.top = `${targetRect.top}px`;
      card.style.left = `${targetRect.left}px`;
      card.style.transform = "scale(0.3) rotate(0deg)";
      card.style.opacity = "0.2";
    });

    setTimeout(() => {
      winOverlay.classList.add("fade-out");
      setTimeout(() => {
        winOverlay.remove();
        
        window.renderPot();
        window.renderSeats();
        window.renderScoreboard();
        window.renderLogs();
        
        if (outcome.isGameOver) {
          this.triggerGameOver();
        }
      }, 300);
    }, 1800);
  }

  // Play card action online
  async playCard(cardInstanceId = null) {
    if (!this.roomRef) return;

    // Check if it is currently my turn
    const activePlayer = window.game.getCurrentPlayer();
    if (!activePlayer || activePlayer.username !== this.currentUser.username) {
      alert("It's not your turn!");
      return;
    }

    try {
      const snapshot = await this.roomRef.once("value");
      const room = snapshot.val();
      
      // Load game state into engine
      const gameEngine = new GameState();
      gameEngine.deserialize(room.gameState);
      
      const activePlayerEngine = gameEngine.getCurrentPlayer();
      const cardToAnimate = gameEngine.config.FORCED_TOP_DRAW || cardInstanceId === null
        ? activePlayerEngine.stack[0]
        : activePlayerEngine.stack.find(c => c.instanceId === cardInstanceId);

      const potBeforePlay = [...gameEngine.pot];
      const outcome = gameEngine.playCard(cardInstanceId);
      
      if (outcome.error) {
        alert(outcome.error);
        return;
      }

      // Serialize updated state
      const serializedGameState = this.serializeGameState(gameEngine);

      // Write updates to database
      await this.roomRef.update({
        gameState: serializedGameState,
        lastAction: {
          type: "play",
          actionId: "play_" + Math.random().toString(36).substring(2, 11),
          playerIndex: outcome.playerIndex,
          playerName: outcome.playerName,
          card: this.serializeCard(cardToAnimate),
          hasMatch: outcome.hasMatch,
          wonCount: outcome.wonCount || 0,
          potBeforePlay: potBeforePlay.map(c => this.serializeCard(c)),
          timestamp: firebase.database.ServerValue.TIMESTAMP
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Shuffle stack online
  async shuffleStack() {
    if (!this.roomRef) return;
    
    try {
      const snapshot = await this.roomRef.once("value");
      const room = snapshot.val();
      
      const gameEngine = new GameState();
      gameEngine.deserialize(room.gameState);
      
      const localPlayer = gameEngine.players.find(p => 
        (p.username && p.username.toLowerCase().trim() === this.currentUser.username.toLowerCase().trim()) ||
        (p.name && p.name.toLowerCase().trim() === this.currentUser.name.toLowerCase().trim())
      );
      if (!localPlayer || localPlayer.stackCount <= 1) return;

      gameEngine.shuffleStack(localPlayer.id);
      
      const serializedGameState = this.serializeGameState(gameEngine);
      await this.roomRef.update({
        gameState: serializedGameState,
        lastAction: {
          type: "shuffle",
          actionId: "shuffle_" + Math.random().toString(36).substring(2, 11),
          playerUsername: this.currentUser.username,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Buy Stack online
  async buyStack() {
    if (!this.roomRef) return;
    
    try {
      const snapshot = await this.roomRef.once("value");
      const room = snapshot.val();
      
      const gameEngine = new GameState();
      gameEngine.deserialize(room.gameState);
      
      const localPlayer = gameEngine.players.find(p => 
        (p.username && p.username.toLowerCase().trim() === this.currentUser.username.toLowerCase().trim()) ||
        (p.name && p.name.toLowerCase().trim() === this.currentUser.name.toLowerCase().trim())
      );
      if (!localPlayer) return;

      const res = gameEngine.buyStack(localPlayer.id);
      if (res.error) {
        alert(res.error);
        return;
      }
      
      const serializedGameState = this.serializeGameState(gameEngine);
      await this.roomRef.update({
        gameState: serializedGameState,
        lastAction: {
          type: "buyStack",
          actionId: "buystack_" + Math.random().toString(36).substring(2, 11),
          playerUsername: this.currentUser.username,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Buy Coins online
  async buyCoins() {
    if (!this.roomRef) return;
    
    try {
      const snapshot = await this.roomRef.once("value");
      const room = snapshot.val();
      
      const gameEngine = new GameState();
      gameEngine.deserialize(room.gameState);
      
      const localPlayer = gameEngine.players.find(p => 
        (p.username && p.username.toLowerCase().trim() === this.currentUser.username.toLowerCase().trim()) ||
        (p.name && p.name.toLowerCase().trim() === this.currentUser.name.toLowerCase().trim())
      );
      if (!localPlayer) return;

      gameEngine.buyCoins(localPlayer.id);
      
      const serializedGameState = this.serializeGameState(gameEngine);
      await this.roomRef.update({
        gameState: serializedGameState,
        lastAction: {
          type: "buyCoins",
          actionId: "buycoins_" + Math.random().toString(36).substring(2, 11),
          playerUsername: this.currentUser.username,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  // End Game manually online (Host only)
  async endGame() {
    if (!this.isHost || !this.roomRef) return;
    
    try {
      const snapshot = await this.roomRef.once("value");
      const room = snapshot.val();
      
      const gameEngine = new GameState();
      gameEngine.deserialize(room.gameState);
      
      gameEngine.endGame();
      
      const serializedGameState = this.serializeGameState(gameEngine);
      await this.roomRef.update({
        status: "ended",
        gameState: serializedGameState,
        lastAction: {
          type: "endGame",
          actionId: "end_" + Math.random().toString(36).substring(2, 11),
          timestamp: firebase.database.ServerValue.TIMESTAMP
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  triggerGameOver() {
    const standings = window.game.getScoreboard();
    window.renderFinalStandings(standings);
    
    this.showScreen("end-screen");
  }

  syncEndedGame(room) {
    this.triggerGameOver();
  }

  async handlePlayerLeftWin() {
    if (window.game.isGameOver) return;
    
    // Stop listener to prevent loops
    if (this.roomRef) {
      this.roomRef.off();
    }
    
    window.game.isGameOver = true;
    
    // Find local player in game
    const localUser = window.auth.getCurrentUser();
    const matchMe = window.game.players.find(p => 
      (p.username && p.username.toLowerCase().trim() === localUser.username.toLowerCase().trim()) ||
      (p.name && p.name.toLowerCase().trim() === localUser.name.toLowerCase().trim())
    );
    
    if (matchMe) {
      // Award coins: get the total pot bet from all opponents
      const opponentsCount = window.game.players.length - 1;
      const winnings = opponentsCount * window.game.matchBet;
      matchMe.coins += winnings + window.game.matchBet; // Refund bet + win from opponents
      
      // Empty cards to force win under 0 cards win condition
      matchMe.stack = [];
      
      // Update local storage coins
      const accounts = window.auth.getAccounts();
      if (accounts[localUser.username]) {
        accounts[localUser.username].coins = matchMe.coins;
        window.auth.saveAccounts(accounts);
      }
      
      alert(`Your opponent left the match! You win by default and earn the pot of 🪙${winnings} coins!`);
    }
    
    // Trigger game over screen
    this.triggerGameOver();
    
    // Clean up room in database if I am the host
    if (this.isHost && this.roomRef) {
      try {
        await this.roomRef.remove();
      } catch (e) {
        console.error(e);
      }
    }
    this.cleanupRoom();
  }

  async updatePlayerOffsets(playerId) {
    if (!this.roomRef) return;
    try {
      const snapshot = await this.roomRef.once("value");
      const room = snapshot.val();
      if (!room || !room.gameState) return;
      
      const gameEngine = new GameState();
      gameEngine.deserialize(room.gameState);
      
      const localPlayer = window.game ? window.game.players.find(p => p.id === playerId) : null;
      const enginePlayer = gameEngine.players.find(p => p.id === playerId);
      if (localPlayer && enginePlayer) {
        enginePlayer.angleOffset = localPlayer.angleOffset || 0;
        enginePlayer.radiusOffset = localPlayer.radiusOffset || 0;
        
        const serializedGameState = this.serializeGameState(gameEngine);
        await this.roomRef.child("gameState").set(serializedGameState);
      }
    } catch (e) {
      console.error("Failed to update player offsets in DB:", e);
    }
  }
}

// Reconstruct game logic from deserialization helper
GameState.prototype.deserialize = function(data) {
  this.currentPlayerIndex = data.currentPlayerIndex;
  this.pot = (data.pot || []).map(c => {
    const card = new CardInstance(c, c.instanceId);
    card.playedBy = c.playedBy;
    return card;
  });
  this.logs = data.logs || [];
  this.roundNumber = data.roundNumber;
  this.isGameOver = data.isGameOver;
  this.globalInstanceCounter = data.globalInstanceCounter;
  this.matchBet = data.matchBet;
  this.isBetDeductedForCurrentPot = data.isBetDeductedForCurrentPot;
  this.currentPotStarterIndex = data.currentPotStarterIndex;
  
  const oldPlayers = this.players || [];
  this.players = (data.players || []).map(p => {
    const player = new Player(p.name, p.id);
    player.username = p.username;
    player.avatar = p.avatar;
    player.coins = p.coins;
    player.freeStackBuys = p.freeStackBuys;
    player.stack = (p.stack || []).map(c => {
      const card = new CardInstance(c, c.instanceId);
      card.playedBy = c.playedBy;
      return card;
    });
    const existingPlayer = oldPlayers.find(ep => String(ep.id) === String(p.id));
    player.radiusOffset = existingPlayer ? (existingPlayer.radiusOffset || 0) : (p.radiusOffset || 0);
    player.angleOffset = existingPlayer ? (existingPlayer.angleOffset || 0) : (p.angleOffset || 0);
    return player;
  });
};

// Global Instance
window.multiplayer = new MultiplayerManager();
