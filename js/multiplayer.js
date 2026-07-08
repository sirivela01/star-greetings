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
    this.wasInWaitingLobby = false;
    
    // Clean up old broken default URL from previous builds if saved in local storage
    let savedUrl = localStorage.getItem("star_greetings_firebase_url");
    if (savedUrl && savedUrl.includes("star-greetings-default-default-rtdb")) {
      localStorage.removeItem("star_greetings_firebase_url");
      savedUrl = null;
    }
    
    let savedApiKey = localStorage.getItem("star_greetings_firebase_api_key");
    
    const activeUrl = savedUrl || "https://star-greetings-default-rtdb.asia-southeast1.firebasedatabase.app";
    const activeApiKey = savedApiKey || "AIzaSyBE_YC0fC3p7JJrDA6BwfIdVVYRPacZtn0";

    // Default public Firebase Config for out-of-the-box operation
    this.firebaseConfig = {
      apiKey: activeApiKey,
      databaseURL: activeUrl,
      authDomain: this.getAuthDomainFromDbUrl(activeUrl)
    };

    this.initFirebase();
  }

  getAuthDomainFromDbUrl(dbUrl) {
    if (!dbUrl) return "";
    try {
      const host = dbUrl.replace("https://", "").split("/")[0];
      const parts = host.split(".");
      let firstPart = parts[0];
      if (firstPart.endsWith("-default-rtdb")) {
        firstPart = firstPart.substring(0, firstPart.length - "-default-rtdb".length);
      }
      return `${firstPart}.firebaseapp.com`;
    } catch (e) {
      console.error("Failed to parse authDomain from database URL:", e);
      return "";
    }
  }

  getMyUid() {
    if (!this.currentUser) return null;
    let uid = this.currentUser.uid;
    if (!uid) {
      try {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0 && firebase.auth) {
          const fbUser = firebase.auth().currentUser;
          if (fbUser) {
            uid = fbUser.uid;
          }
        }
      } catch (e) {
        console.warn("Firebase auth query failed:", e);
      }
    }
    return uid || "guest_" + this.currentUser.username;
  }

  showToast(message, type = 'error') {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast-element ${type === 'success' ? 'toast-success' : 'toast-error'}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    // Force reflow
    toast.getBoundingClientRect();
    
    // Add show class
    toast.classList.add("show");
    
    // Hide and remove after 4s
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) {
          container.remove();
        }
      }, 300);
    }, 4000);
  }

  verifyAuth() {
    const user = window.auth ? window.auth.getCurrentUser() : this.currentUser;
    if (!user) {
      this.showToast("Please log in to play online", "error");
      
      // Redirect to login screen
      const loginView = document.getElementById("login-screen");
      const currentViews = document.querySelectorAll(".screen-view");
      currentViews.forEach(v => v.classList.add("hidden"));
      if (loginView) {
        loginView.classList.remove("hidden");
        // Reset inputs
        const usernameInput = document.getElementById("login-username");
        const passwordInput = document.getElementById("login-password");
        if (usernameInput) usernameInput.value = "";
        if (passwordInput) passwordInput.value = "";
      }
      return false;
    }
    return true;
  }

  setupConnectionListener() {
    if (this.db) {
      this.db.ref(".info/connected").off();
      this.db.ref(".info/connected").on("value", async (snapshot) => {
        const isConnected = snapshot.val() === true;
        this.updateConnectionStatus(isConnected);
        if (isConnected && this.roomRef) {
          await this.registerPresence();
        }
      });
    }
  }

  async registerPresence() {
    const myUid = this.getMyUid();
    if (!this.roomRef || !myUid) return;

    const playerRef = this.roomRef.child(`players/${myUid}`);
    try {
      await playerRef.onDisconnect().cancel();
      await playerRef.update({
        status: 'connected',
        disconnectedAt: null
      });
      await playerRef.onDisconnect().update({
        status: 'disconnected',
        disconnectedAt: firebase.database.ServerValue.TIMESTAMP
      });
      console.log("Presence registered successfully for:", myUid);
    } catch (e) {
      console.error("Failed to register presence:", e);
    }
  }

  initFirebase() {
    try {
      this.db = null;
      if (typeof firebase === 'undefined') {
        console.error("Firebase is not loaded.");
        this.updateConnectionStatus(false);
        return;
      }
      
      // Initialize Firebase app or use existing one
      if (firebase.apps.length > 0) {
        this.db = firebase.database();
      } else {
        firebase.initializeApp(this.firebaseConfig);
        this.db = firebase.database();
      }

      this.setupConnectionListener();
    } catch (e) {
      console.error("Failed to initialize Firebase:", e);
      this.updateConnectionStatus(false);
    }
  }

  updateConnectionStatus(isConnected) {
    const banner = document.getElementById("db-status-banner");
    const createBtn = document.getElementById("online-create-room-btn");
    const joinBtn = document.getElementById("online-join-room-btn");
    
    if (banner) {
      banner.className = "db-status-banner " + (isConnected ? "connected" : "error");
      const dot = banner.querySelector(".status-dot") || document.createElement("span");
      dot.className = "status-dot";
      const text = banner.querySelector(".status-text") || document.createElement("span");
      text.className = "status-text";
      
      text.textContent = isConnected ? "Connected to database" : "Failed to connect or disconnected from database";
      
      banner.innerHTML = "";
      banner.appendChild(dot);
      banner.appendChild(text);
    }

    if (isConnected) {
      if (createBtn) createBtn.removeAttribute("disabled");
      if (joinBtn) joinBtn.removeAttribute("disabled");
    } else {
      if (createBtn) createBtn.setAttribute("disabled", "true");
      if (joinBtn) joinBtn.setAttribute("disabled", "true");
    }
  }

  // Promise Timeout helper to prevent hanging on write errors or DNS failures
  withTimeout(promise, ms = 4500) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Database connection timed out. Please check your database settings.")), ms))
    ]);
  }

  // Open Database config modal
  openDbConfigModal() {
    const modal = document.getElementById("db-config-modal");
    const inputUrl = document.getElementById("db-config-url");
    const inputApiKey = document.getElementById("db-config-api-key");
    if (modal) {
      if (inputUrl) {
        inputUrl.value = localStorage.getItem("star_greetings_firebase_url") || this.firebaseConfig.databaseURL;
      }
      if (inputApiKey) {
        inputApiKey.value = localStorage.getItem("star_greetings_firebase_api_key") || (this.firebaseConfig.apiKey !== "AIzaSyBE_YC0fC3p7JJrDA6BwfIdVVYRPacZtn0" ? this.firebaseConfig.apiKey : "");
      }
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

  async saveDbConfig(url, apiKey) {
    const cleanUrl = url.trim();
    const cleanApiKey = apiKey ? apiKey.trim() : "";
    if (!cleanUrl.startsWith("https://")) {
      alert("Invalid URL. Must start with https://");
      return;
    }
    
    localStorage.setItem("star_greetings_firebase_url", cleanUrl);
    if (cleanApiKey) {
      localStorage.setItem("star_greetings_firebase_api_key", cleanApiKey);
      this.firebaseConfig.apiKey = cleanApiKey;
    } else {
      localStorage.removeItem("star_greetings_firebase_api_key");
      this.firebaseConfig.apiKey = "AIzaSyBE_YC0fC3p7JJrDA6BwfIdVVYRPacZtn0";
    }
    
    this.firebaseConfig.databaseURL = cleanUrl;
    this.firebaseConfig.authDomain = this.getAuthDomainFromDbUrl(cleanUrl);
    
    try {
      if (firebase.apps.length > 0) {
        await firebase.app().delete();
      }
      firebase.initializeApp(this.firebaseConfig);
      this.db = firebase.database();

      this.setupConnectionListener();

      alert("Database settings updated and connected successfully!");
      this.closeDbConfigModal();
    } catch (e) {
      alert("Failed to initialize with new URL: " + e.message);
    }
  }

  async resetDbConfigToDefault() {
    localStorage.removeItem("star_greetings_firebase_url");
    localStorage.removeItem("star_greetings_firebase_api_key");
    const defaultUrl = "https://star-greetings-default-rtdb.asia-southeast1.firebasedatabase.app";
    const defaultApiKey = "AIzaSyBE_YC0fC3p7JJrDA6BwfIdVVYRPacZtn0";
    
    this.firebaseConfig.databaseURL = defaultUrl;
    this.firebaseConfig.apiKey = defaultApiKey;
    this.firebaseConfig.authDomain = this.getAuthDomainFromDbUrl(defaultUrl);
    
    try {
      if (firebase.apps.length > 0) {
        await firebase.app().delete();
      }
      firebase.initializeApp(this.firebaseConfig);
      this.db = firebase.database();

      this.setupConnectionListener();
      
      const inputUrl = document.getElementById("db-config-url");
      const inputApiKey = document.getElementById("db-config-api-key");
      if (inputUrl) inputUrl.value = defaultUrl;
      if (inputApiKey) inputApiKey.value = "";
      
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
    if (screenId !== "game-screen" && screenId !== "end-screen") {
      if (window.VictoryMusic) window.VictoryMusic.stop(true);
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
  async createRoom(selectedTheme = "Tollywood") {
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

    const codeLabel = document.getElementById("lobby-room-code-lbl");
    if (codeLabel) {
      codeLabel.innerHTML = '<span class="spinner-small"></span> Generating...';
    }
    this.showScreen("online-waiting-screen");

    this.roomCode = this.generateRoomCode();
    this.isHost = true;
    window.isOnlineGame = true;
    window.currentUserUsername = this.currentUser.username;
    this.hasDeductedGreetingsForMatch = false;
    this.hasReturnedGreetingsForMatch = false;

    const myUid = this.getMyUid();
    if (!myUid) {
      if (codeLabel) {
        codeLabel.innerHTML = 'Failed <button id="retry-create-btn" class="btn-retry">Retry</button>';
        const retryBtn = document.getElementById("retry-create-btn");
        if (retryBtn) retryBtn.onclick = () => this.createRoom(selectedTheme);
      }
      this.showToast("Authentication missing. Please log in again.");
      return;
    }

    const roomData = {
      roomCode: this.roomCode,
      status: "waiting",
      hostUsername: this.currentUser.username,
      createdBy: myUid,
      placementMode: "middle",
      deckTheme: selectedTheme,
      players: {
        [myUid]: {
          name: this.currentUser.name || this.currentUser.username || "Player",
          username: this.currentUser.username,
          avatar: this.currentUser.avatar || "assets/avatars/avatar_1.png", // custom avatar or default Player 1 avatar
          coins: isNaN(parseInt(this.currentUser.coins, 10)) ? 300 : parseInt(this.currentUser.coins, 10),
          betVote: 25,
          joinedAt: firebase.database.ServerValue.TIMESTAMP,
          status: "connected",
          greetingsStack: this.currentUser.greetingsStack !== undefined ? this.currentUser.greetingsStack : 50
        }
      }
    };

    let creationCompleted = false;
    const timeoutId = setTimeout(() => {
      if (!creationCompleted) {
        if (codeLabel) {
          codeLabel.innerHTML = 'Failed <button id="retry-create-btn" class="btn-retry">Retry</button>';
          const retryBtn = document.getElementById("retry-create-btn");
          if (retryBtn) {
            retryBtn.onclick = (e) => {
              e.preventDefault();
              this.createRoom();
            };
          }
        }
      }
    }, 5000);

    try {
      this.roomRef = this.db.ref(`rooms/${this.roomCode}`);
      await this.withTimeout(this.roomRef.set(roomData));
      creationCompleted = true;
      clearTimeout(timeoutId);
      
      await this.registerPresence();
      
      // Setup listener
      this.listenToRoom();
      
      // Update UI
      if (codeLabel) {
        codeLabel.textContent = this.roomCode;
      }
    } catch (e) {
      creationCompleted = true;
      clearTimeout(timeoutId);
      if (codeLabel) {
        codeLabel.innerHTML = 'Failed <button id="retry-create-btn" class="btn-retry">Retry</button>';
        const retryBtn = document.getElementById("retry-create-btn");
        if (retryBtn) {
          retryBtn.onclick = (e) => {
            e.preventDefault();
            this.createRoom();
          };
        }
      }
      this.showToast("Failed to create room: " + e.message);
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
    this.hasDeductedGreetingsForMatch = false;
    this.hasReturnedGreetingsForMatch = false;

    const myUid = this.getMyUid();
    if (!myUid) {
      this.showToast("Authentication missing. Please log in again.");
      return;
    }

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
      const avatarUrl = this.currentUser.avatar || `assets/avatars/avatar_${avatarIdx + 1}.png`;

      // Add current player to room
      const playerRef = this.roomRef.child(`players/${myUid}`);
      await this.withTimeout(playerRef.set({
        name: this.currentUser.name || this.currentUser.username || "Player",
        username: this.currentUser.username,
        avatar: avatarUrl || "assets/avatars/avatar_1.png",
        coins: isNaN(parseInt(this.currentUser.coins, 10)) ? 300 : parseInt(this.currentUser.coins, 10),
        betVote: 25,
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
        status: "connected",
        greetingsStack: this.currentUser.greetingsStack !== undefined ? this.currentUser.greetingsStack : 50
      }));
      await this.registerPresence();

      // Setup listener
      this.listenToRoom();

      // Update UI
      const codeLabel = document.getElementById("lobby-room-code-lbl");
      if (codeLabel) {
        codeLabel.textContent = this.roomCode;
      }
      this.showScreen("online-waiting-screen");
    } catch (e) {
      alert("Failed to join room: " + e.message);
      this.openDbConfigModal();
    }
  }

  // Leave room
  async leaveRoom() {
    if (!this.verifyAuth()) return;
    if (!this.roomRef) return;

    const myUid = this.getMyUid();
    try {
      if (this.isHost) {
        // Delete the room if host leaves
        await this.roomRef.remove();
      } else if (myUid) {
        // Remove player
        await this.roomRef.child(`players/${myUid}`).remove();
      }
      
      // Return greetings if left in middle of play
      if (window.game && !window.game.isGameOver) {
        await this.returnGreetingsOnline(false);
      }
    } catch (e) {
      console.error(e);
    }

    this.cleanupRoom();
    this.showScreen("online-lobby-screen");
  }

  cleanupRoom() {
    if (this.disconnectTimer) {
      clearInterval(this.disconnectTimer);
      this.disconnectTimer = null;
    }
    if (this.roomRef) {
      try {
        const myUid = this.getMyUid();
        if (myUid) {
          this.roomRef.child(`players/${myUid}`).onDisconnect().cancel();
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
    this.lastActionId = null;
    this.wasInWaitingLobby = false;
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
      const myUid = this.getMyUid();
      
      // If we are actively playing, check if an opponent left the match
      if (room.status === "playing" && window.game && !window.game.isGameOver) {
        // Self-healing during play: if my player node is missing or marked disconnected, restore it!
        if (myUid) {
          const dbPlayer = room.players && room.players[myUid];
          if (!dbPlayer) {
            console.log("Self-healing during play: Re-registering myself in the players list");
            
            // Re-find my avatar from local game if possible
            const matchMe = window.game.players.find(p => 
              p.uid === myUid ||
              (p.username && p.username.toLowerCase().trim() === (this.currentUser.username || "").toLowerCase().trim())
            );
            const avatarUrl = matchMe ? matchMe.avatar : (this.currentUser.avatar || "assets/avatars/avatar_1.png");
            
            const playerRef = this.roomRef.child(`players/${myUid}`);
            const activeBetBtn = document.querySelector("#online-bet-selector .bet-opt-btn.active");
            const currentBet = activeBetBtn ? (parseInt(activeBetBtn.dataset.val, 10) || 25) : 25;
            playerRef.set({
              name: this.currentUser.name || this.currentUser.username || "Player",
              username: this.currentUser.username,
              avatar: avatarUrl || "assets/avatars/avatar_1.png",
              coins: isNaN(parseInt(this.currentUser.coins, 10)) ? 300 : parseInt(this.currentUser.coins, 10),
              betVote: currentBet,
              joinedAt: firebase.database.ServerValue.TIMESTAMP,
              status: "connected"
            });
            this.registerPresence();
            return;
          } else if (dbPlayer.status !== "connected") {
            console.log("Self-healing during play: restabilizing my status to connected");
            this.registerPresence();
          }
        }

        // Check if any opponent is marked disconnected
        let disconnectedOpponents = [];
        if (room.players && window.game.players) {
          window.game.players.forEach(p => {
            if (p.uid !== myUid) {
              const dbPlayer = room.players[p.uid];
              if (dbPlayer && dbPlayer.status === "disconnected") {
                disconnectedOpponents.push({
                  uid: p.uid,
                  name: p.name || p.username || "Opponent",
                  disconnectedAt: dbPlayer.disconnectedAt
                });
              }
            }
          });
        }

        if (disconnectedOpponents.length > 0) {
          const opponent = disconnectedOpponents[0];
          if (!this.disconnectedOpponentInfo || this.disconnectedOpponentInfo.uid !== opponent.uid) {
            this.disconnectedOpponentInfo = {
              uid: opponent.uid,
              name: opponent.name,
              disconnectedAt: Date.now()
            };
            
            // Start the disconnect banner update timer (60 second grace period)
            if (this.disconnectTimer) {
              clearInterval(this.disconnectTimer);
            }
            this.disconnectTimer = setInterval(() => this.updateDisconnectBanner(), 1000);
            this.updateDisconnectBanner(); // Run immediately
          }
        } else {
          // Clear any disconnect warnings if all opponents are connected
          if (this.disconnectedOpponentInfo) {
            console.log("Opponent reconnected! Clearing disconnect timer.");
            this.disconnectedOpponentInfo = null;
            if (this.disconnectTimer) {
              clearInterval(this.disconnectTimer);
              this.disconnectTimer = null;
            }
            this.hideDisconnectBanner();
          }
        }
      }
      
      if (room.status === "waiting") {
        // Self-healing: if my player node is missing or marked disconnected, restore it!
        if (myUid) {
          const dbPlayer = room.players && room.players[myUid];
          if (!dbPlayer) {
            console.log("Self-healing: Re-registering myself in the waiting room list");
            
            // Assign avatar index
            const playersCount = Object.keys(room.players || {}).length;
            const avatarUrl = this.currentUser.avatar || (this.isHost ? "assets/avatars/avatar_1.png" : `assets/avatars/avatar_${(playersCount % 6) + 1}.png`);
            
            const playerRef = this.roomRef.child(`players/${myUid}`);
            const activeBetBtn = document.querySelector("#online-bet-selector .bet-opt-btn.active");
            const currentBet = activeBetBtn ? (parseInt(activeBetBtn.dataset.val, 10) || 25) : 25;
            playerRef.set({
              name: this.currentUser.name || this.currentUser.username || "Player",
              username: this.currentUser.username,
              avatar: avatarUrl || "assets/avatars/avatar_1.png",
              coins: isNaN(parseInt(this.currentUser.coins, 10)) ? 300 : parseInt(this.currentUser.coins, 10),
              betVote: currentBet,
              joinedAt: firebase.database.ServerValue.TIMESTAMP,
              status: "connected"
            });
            this.registerPresence();
            return;
          } else if (dbPlayer.status !== "connected") {
            console.log("Self-healing: restabilizing my status to connected in waiting room");
            this.registerPresence();
          }
        }
        this.syncWaitingLobby(room);
      } else if (room.status === "playing") {
        if (!this.hasDeductedGreetingsForMatch) {
          this.hasDeductedGreetingsForMatch = true;
          this.deductGreetingsOnMatchStart();
        }
        this.syncActiveGame(room);
      } else if (room.status === "ended") {
        this.syncEndedGame(room);
      }
    });
  }

  // Render Waiting Lobby players list
  syncWaitingLobby(room) {
    this.wasInWaitingLobby = true;
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

    // Sync deck theme selection badge
    const roomThemeBadge = document.getElementById("lobby-room-theme-badge");
    if (roomThemeBadge) {
      const themeVal = room.deckTheme || "Tollywood";
      let themeText = themeVal;
      let badgeClass = "theme-badge tollywood";
      const lowerTheme = themeVal.toLowerCase();
      if (lowerTheme === "tollywood") {
        themeText = "Tollywood 🎬";
        badgeClass = "theme-badge tollywood";
      } else if (lowerTheme === "bollywood") {
        themeText = "Bollywood 🎥";
        badgeClass = "theme-badge bollywood";
      }
      roomThemeBadge.textContent = themeText;
      roomThemeBadge.className = badgeClass;
    }
    
    // Sort players by join timestamp to keep consistent order, and guarantee uid property is populated
    const players = Object.entries(room.players || {}).map(([uid, p]) => {
      p.uid = uid;
      return p;
    }).sort((a, b) => a.joinedAt - b.joinedAt);
    playerCountEl.textContent = players.length;

    // Log the received players data from Firebase for diagnostics
    console.log("Firebase syncWaitingLobby players data:", room.players);

    players.forEach((p, idx) => {
      const row = document.createElement("li");
      row.className = "lobby-player-row";
      
      const isHost = p.uid === room.createdBy;
      
      // If name or avatar is not fully resolved/loaded, show a skeleton placeholder row
      if (!p.name || !p.avatar) {
        row.innerHTML = `
          <div class="lobby-player-info skeleton-pulse" style="width: 100%; display: flex; align-items: center; gap: 8px; padding: 4px 0;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);"></div>
            <div style="width: 120px; height: 16px; border-radius: 4px; background: rgba(255, 255, 255, 0.1);"></div>
          </div>
        `;
      } else {
        const displayName = p.name || p.username || `Player ${idx + 1}`;
        const displayAvatar = p.avatar || "assets/avatars/avatar_1.png";
        const displayBetVote = p.betVote !== undefined ? p.betVote : 25;
        const isOffline = p.status === "disconnected";
        const displayGreetings = p.greetingsStack !== undefined ? p.greetingsStack : 50;
        
        row.innerHTML = `
          <div class="lobby-player-info">
            <img src="${displayAvatar}" class="lobby-player-avatar" alt="Avatar">
            <span class="lobby-player-name" style="${isOffline ? 'opacity: 0.6;' : ''}">${displayName}</span>
          </div>
          <div class="lobby-player-badges">
            ${isHost ? `<span class="lobby-badge host">Host</span>` : ""}
            ${isOffline ? `<span class="lobby-badge disconnected" style="background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.35); color: #f87171; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px;">Offline</span>` : ""}
            <span class="lobby-badge greetings" style="background: linear-gradient(135deg, #d97706, #b45309); border-color: #f59e0b; color: #fff; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px;">🎴 ${displayGreetings} Stack</span>
            <span class="lobby-badge bet">Vote: 🪙${displayBetVote}</span>
          </div>
        `;
      }
      playersListEl.appendChild(row);
    });

    // Calculate live bet tallies
    const tally = { 25: 0, 50: 0, 75: 0, 100: 0 };
    players.forEach(p => {
      const vote = parseInt(p.betVote, 10) || 25;
      if (tally[vote] !== undefined) {
        tally[vote]++;
      }
    });
    const tallyEl = document.getElementById("online-bet-tally");
    if (tallyEl) {
      tallyEl.textContent = `Tally: 25: ${tally[25]} votes | 50: ${tally[50]} votes | 75: ${tally[75]} votes | 100: ${tally[100]} votes`;
    }

    // Handle Start button visibility and greetings balance validation
    const startBtn = document.getElementById("online-start-match-btn");
    const waitingMsg = document.getElementById("online-host-msg");
    
    // Check if any player has less than 50 greetings
    const lowGreetingsPlayers = players.filter(p => (p.greetingsStack !== undefined ? p.greetingsStack : 50) < 50);
    const hasLowGreetings = lowGreetingsPlayers.length > 0;
    
    if (startBtn && waitingMsg) {
      // Dynamic injection of warning banner
      let warningBanner = document.getElementById("online-lobby-warning-banner");
      if (hasLowGreetings) {
        if (!warningBanner) {
          warningBanner = document.createElement("div");
          warningBanner.id = "online-lobby-warning-banner";
          warningBanner.style = "background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; padding: 10px; border-radius: 6px; font-size: 0.85rem; margin-bottom: 15px; text-align: center; line-height: 1.4;";
          startBtn.parentNode.insertBefore(warningBanner, startBtn);
        }
        const playerNamesStr = lowGreetingsPlayers.map(p => p.name).join(", ");
        warningBanner.innerHTML = `⚠️ Cannot start match: <strong>${playerNamesStr}</strong> has less than 50 greetings.`;
      } else {
        if (warningBanner) {
          warningBanner.remove();
        }
      }

      if (this.isHost) {
        startBtn.style.display = "block";
        waitingMsg.style.display = "none";
        
        // Enable Start button only if at least 2 players have joined and nobody is low on greetings
        if (players.length >= 2 && !hasLowGreetings) {
          startBtn.removeAttribute("disabled");
          startBtn.classList.add("pulse-anim");
        } else {
          startBtn.setAttribute("disabled", "true");
          startBtn.classList.remove("pulse-anim");
        }
      } else {
        startBtn.style.display = "none";
        waitingMsg.style.display = "block";
        if (hasLowGreetings) {
          waitingMsg.innerHTML = `<span style="color: #f87171;">⚠️ Some players have less than 6 greetings. Waiting for them to acquire more...</span>`;
        } else {
          waitingMsg.textContent = "Waiting for Host to start match...";
        }
      }
    }
  }

  // Update personal bet vote in waiting lobby
  async updateBetVote(val) {
    if (!this.verifyAuth()) return;
    if (!this.roomRef || !this.currentUser) return;
    const parsedVal = parseInt(val, 10);
    const myUid = this.getMyUid();
    if (myUid) {
      // Use .update() instead of .set() to prevent overwriting other player properties
      await this.roomRef.child(`players/${myUid}`).update({
        betVote: isNaN(parsedVal) ? 25 : parsedVal
      });
    }
  }

  // Update card placement mode selection in waiting lobby (Host only)
  async updatePlacementMode(val) {
    if (!this.verifyAuth()) return;
    if (!this.isHost || !this.roomRef) return;
    try {
      await this.roomRef.child("placementMode").set(val);
    } catch (e) {
      console.error("Failed to update placement mode:", e);
    }
  }

  // Update deck theme selection in waiting lobby (Host only)
  async updateDeckTheme(val) {
    if (!this.verifyAuth()) return;
    if (!this.isHost || !this.roomRef) return;
    try {
      await this.roomRef.child("deckTheme").set(val);
    } catch (e) {
      console.error("Failed to update deck theme:", e);
    }
  }

  // Start the match (Host only)
  async startMatch() {
    if (!this.verifyAuth()) return;
    if (!this.isHost || !this.roomRef) return;

    try {
      const snapshot = await this.roomRef.once("value");
      const room = snapshot.val();
      const players = Object.entries(room.players || {}).map(([uid, p]) => {
        p.uid = uid;
        return p;
      }).sort((a, b) => a.joinedAt - b.joinedAt);
      
      if (players.length < 2) {
        alert("Need at least 2 players to start.");
        return;
      }

      // Initialize game logic engine locally to serialize state
      const playerNames = players.map(p => p.name || p.username || "Player");
      const playerBets = players.map(p => parseInt(p.betVote, 10) || 25);
      
      const gameEngine = new GameState();
      gameEngine.config.CARD_PLACEMENT_MODE = room.placementMode || "middle";
      gameEngine.initializeGame(playerNames, 6, playerBets, room.deckTheme || "Tollywood");
      
      // Bind avatars, usernames, and UIDs to GameState players
      gameEngine.players.forEach((p, idx) => {
        p.avatar = players[idx].avatar;
        p.username = players[idx].username;
        p.uid = players[idx].uid;
        p.coins = isNaN(parseInt(players[idx].coins, 10)) ? 300 : parseInt(players[idx].coins, 10); // carry over actual coins from database
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
      matchWinsCount: game.matchWinsCount || 0,
      pot: game.pot.map(c => this.serializeCard(c)),
      logs: game.logs || [],
      roundNumber: game.roundNumber,
      isGameOver: game.isGameOver,
      globalInstanceCounter: game.globalInstanceCounter,
      matchBet: parseInt(game.matchBet, 10) || 25,
      isBetDeductedForCurrentPot: game.isBetDeductedForCurrentPot,
      currentPotStarterIndex: game.currentPotStarterIndex,
      selectedCategory: game.selectedCategory || "Tollywood",
      pendingMatchWinnings: game.pendingMatchWinnings ? {
        winnerIndex: game.pendingMatchWinnings.winnerIndex,
        cards: game.pendingMatchWinnings.cards.map(c => this.serializeCard(c)),
        coins: game.pendingMatchWinnings.coins,
        deductionPlayers: game.pendingMatchWinnings.deductionPlayers,
        wonCardsCount: game.pendingMatchWinnings.wonCardsCount,
        winnings: game.pendingMatchWinnings.winnings,
        matchedStarName: game.pendingMatchWinnings.matchedStarName,
        roundNumber: game.pendingMatchWinnings.roundNumber
      } : null,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name || p.username || "Player",
        username: p.username || "player",
        uid: p.uid || "",
        avatar: p.avatar || "assets/avatars/avatar_1.png",
        coins: isNaN(parseInt(p.coins, 10)) ? 300 : parseInt(p.coins, 10),
        freeStackBuys: isNaN(parseInt(p.freeStackBuys, 10)) ? 10 : parseInt(p.freeStackBuys, 10),
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
      const isInitialLoad = !this.lastActionId && !this.wasInWaitingLobby;

      if (isNewAction) {
        this.lastActionId = lastAction.actionId;
        this.wasInWaitingLobby = false;
        if (!isInitialLoad) {
          this.playActionAnimation(lastAction, room.gameState);
          return;
        }
      } else {
        // If the action has already been processed or is currently playing,
        // return early to prevent subsequent events (like timestamp resolution)
        // from running static rendering and clearing active animations/overlays.
        if (this.lastActionId) {
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

    // Sync Guessing Round Overlay online
    const overlay = document.getElementById("guessing-round-overlay");
    if (room.guessingRound && room.guessingRound.active) {
      if (overlay) {
        overlay.classList.remove("hidden");
        overlay.style.display = "flex";
      }
      this.renderOnlineGuessingRoundView(room.guessingRound);
    } else {
      if (overlay && !overlay.classList.contains("hidden")) {
        overlay.classList.add("hidden");
        overlay.style.display = "none";
        window.playerStatusIndicators = null;
        window.renderSeats();
      }
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
        window.auth.updateCoins(matchMe.coins);
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
          // Play victory music for this round win
          if (window.VictoryMusic && cardPlayed && cardPlayed.id) {
            window.VictoryMusic.play(cardPlayed.id);
            // Track the round winner's last matched star for match-end song
            window.lastRoundWinnerStarId = cardPlayed.id;
            window.lastRoundWinnerPlayerIndex = playerIndex;
          }

          // Win sequence outcome
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
          if (gameState.isGameOver) {
            this.triggerGameOver();
          }
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
        } else {
          this.checkAndTriggerOnlineGuessingRound(outcome);
        }
      }, 300);
    }, 1800);
  }

  // Play card action online
  async playCard(cardInstanceId = null) {
    if (!this.verifyAuth()) return;
    if (!this.roomRef) return;

    // Check if it is currently my turn
    const activePlayer = window.game.getCurrentPlayer();
    const myUid = this.getMyUid();
    if (!activePlayer || activePlayer.uid !== myUid) {
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
    if (!this.verifyAuth()) return;
    if (!this.roomRef) return;
    
    try {
      const snapshot = await this.roomRef.once("value");
      const room = snapshot.val();
      
      const gameEngine = new GameState();
      gameEngine.deserialize(room.gameState);
      
      const myUid = this.getMyUid();
      const localPlayer = gameEngine.players.find(p => p.uid === myUid);
      if (!localPlayer || localPlayer.stackCount <= 1) return;

      gameEngine.shuffleStack(localPlayer.id);
      
      const serializedGameState = this.serializeGameState(gameEngine);
      await this.roomRef.update({
        gameState: serializedGameState,
        lastAction: {
          type: "shuffle",
          actionId: "shuffle_" + Math.random().toString(36).substring(2, 11),
          playerUsername: this.currentUser.username,
          playerUid: myUid,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Buy Stack online
  async buyStack() {
    if (!this.verifyAuth()) return;
    if (!this.roomRef) return;
    
    try {
      const snapshot = await this.roomRef.once("value");
      const room = snapshot.val();
      
      const gameEngine = new GameState();
      gameEngine.deserialize(room.gameState);
      
      const myUid = this.getMyUid();
      const localPlayer = gameEngine.players.find(p => p.uid === myUid);
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
          playerUid: myUid,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Buy Coins online
  async buyCoins() {
    if (!this.verifyAuth()) return;
    if (!this.roomRef) return;
    
    try {
      const snapshot = await this.roomRef.once("value");
      const room = snapshot.val();
      
      const gameEngine = new GameState();
      gameEngine.deserialize(room.gameState);
      
      const myUid = this.getMyUid();
      const localPlayer = gameEngine.players.find(p => p.uid === myUid);
      if (!localPlayer) return;

      gameEngine.buyCoins(localPlayer.id);
      
      const serializedGameState = this.serializeGameState(gameEngine);
      await this.roomRef.update({
        gameState: serializedGameState,
        lastAction: {
          type: "buyCoins",
          actionId: "buycoins_" + Math.random().toString(36).substring(2, 11),
          playerUsername: this.currentUser.username,
          playerUid: myUid,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  // End Game manually online (Host only)
  async endGame() {
    if (!this.verifyAuth()) return;
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

  async returnGreetingsOnline(wonReward = false) {
    if (this.hasReturnedGreetingsForMatch) return;
    if (!window.auth || !this.currentUser) return;
    if (!window.game || window.game.players.length === 0) return;
    
    const myUid = this.getMyUid();
    const matchMe = window.game.players.find(p => 
      p.uid === myUid ||
      (p.username && p.username.toLowerCase().trim() === (this.currentUser.username || "").toLowerCase().trim())
    );
    if (!matchMe) return;
    
    this.hasReturnedGreetingsForMatch = true;
    const dbUrl = this.firebaseConfig.databaseURL || "";
    const userId = this.currentUser.uid || this.currentUser.username;
    const remainingDeck = matchMe.stackCount;
    
    try {
      const response = await fetch("/api/player/greetings/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, remainingDeck, wonReward, dbUrl })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const newCount = data.greetingsStack;
        this.currentUser.greetingsStack = newCount;
        window.auth.updateGreetingsStackLocal(newCount);
        if (window.refreshGreetingsStack) {
          window.refreshGreetingsStack(this.currentUser);
        }
        console.log("Returned online greetings. New stack:", newCount);
      }
    } catch (e) {
      console.error("Error returning greetings online:", e);
    }
  }

  async deductGreetingsOnMatchStart() {
    if (!window.auth || !this.currentUser) return;
    const dbUrl = this.firebaseConfig.databaseURL || "";
    const userId = this.currentUser.uid || this.currentUser.username;
    
    try {
      const response = await fetch("/api/player/greetings/start-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, dbUrl })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const newCount = data.greetingsStack;
        this.currentUser.greetingsStack = newCount;
        window.auth.updateGreetingsStackLocal(newCount);
        if (window.refreshGreetingsStack) {
          window.refreshGreetingsStack(this.currentUser);
        }
        console.log("Deducted greetings on online match start. New stack:", newCount);
      }
    } catch (e) {
      console.error("Error deducting greetings online:", e);
    }
  }

  triggerGameOver() {
    const standings = window.game.getScoreboard();
    window.renderFinalStandings(standings);
    
    // Natural end match return of greetings stack online
    const myUid = this.getMyUid();
    const matchMe = window.game.players.find(p => p.uid === myUid);
    if (matchMe) {
      const wonReward = (standings.length > 0 && standings[0].name === matchMe.name);
      this.returnGreetingsOnline(wonReward);
    }
    
    if (window.playVictorySound) {
      window.playVictorySound();
    }

    if (window.VictoryMusic) {
      window.VictoryMusic.stop(true);
    }
    // Set pending victory star from last round winner for the end screen
    window._pendingVictoryStar = window.lastRoundWinnerStarId || null;
    
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
    const myUid = this.getMyUid();
    const matchMe = window.game.players.find(p => 
      p.uid === myUid ||
      (p.username && p.username.toLowerCase().trim() === localUser.username.toLowerCase().trim())
    );
    
    if (matchMe) {
      const remainingDeck = matchMe.stackCount;
      // Award coins: get the total pot bet from all opponents
      const opponentsCount = window.game.players.length - 1;
      const winnings = opponentsCount * window.game.matchBet;
      matchMe.coins += winnings + window.game.matchBet; // Refund bet + win from opponents
      
      // Empty cards to force win under 0 cards win condition
      matchMe.stack = [];
      
      // Update coins locally and in Firebase database
      window.auth.updateCoins(matchMe.coins);
      
      // Return greetings with actual remaining count and wonReward = true
      if (!this.hasReturnedGreetingsForMatch) {
        this.hasReturnedGreetingsForMatch = true;
        const dbUrl = this.firebaseConfig.databaseURL || "";
        const userId = this.currentUser.uid || this.currentUser.username;
        fetch("/api/player/greetings/return", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, remainingDeck, wonReward: true, dbUrl })
        })
        .then(res => res.json())
        .then(data => {
          if (data && data.success) {
            const newCount = data.greetingsStack;
            this.currentUser.greetingsStack = newCount;
            window.auth.updateGreetingsStackLocal(newCount);
            if (window.refreshGreetingsStack) {
              window.refreshGreetingsStack(this.currentUser);
            }
          }
        })
        .catch(err => console.error("Error returning greetings on player left win:", err));
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

  updateDisconnectBanner() {
    if (!this.disconnectedOpponentInfo) {
      this.hideDisconnectBanner();
      return;
    }
    
    const { name, disconnectedAt } = this.disconnectedOpponentInfo;
    const gracePeriodSeconds = 60;
    const elapsedSeconds = Math.floor((Date.now() - disconnectedAt) / 1000);
    
    if (elapsedSeconds >= 8) {
      const remainingSeconds = Math.max(0, gracePeriodSeconds - elapsedSeconds);
      this.showDisconnectBanner(`Waiting for ${name} to reconnect... (${remainingSeconds}s)`);
      
      if (remainingSeconds <= 0) {
        console.log("Grace period elapsed. Player left match default win triggered.");
        if (this.disconnectTimer) {
          clearInterval(this.disconnectTimer);
          this.disconnectTimer = null;
        }
        this.disconnectedOpponentInfo = null;
        this.hideDisconnectBanner();
        this.handlePlayerLeftWin();
      }
    } else {
      this.hideDisconnectBanner();
    }
  }

  showDisconnectBanner(message) {
    let banner = document.getElementById("game-disconnect-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "game-disconnect-banner";
      banner.style.position = "fixed";
      banner.style.top = "20px";
      banner.style.left = "50%";
      banner.style.transform = "translateX(-50%) translateY(-20px)";
      banner.style.opacity = "0";
      banner.style.background = "rgba(239, 68, 68, 0.95)";
      banner.style.color = "#ffffff";
      banner.style.padding = "12px 24px";
      banner.style.borderRadius = "8px";
      banner.style.fontFamily = "'Inter', sans-serif";
      banner.style.fontSize = "0.9rem";
      banner.style.fontWeight = "600";
      banner.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)";
      banner.style.backdropFilter = "blur(8px)";
      banner.style.webkitBackdropFilter = "blur(8px)";
      banner.style.border = "1px solid rgba(255, 255, 255, 0.15)";
      banner.style.zIndex = "99999";
      banner.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
      banner.style.display = "flex";
      banner.style.alignItems = "center";
      banner.style.gap = "10px";
      
      const spinner = document.createElement("div");
      spinner.className = "banner-spinner";
      spinner.style.width = "16px";
      spinner.style.height = "16px";
      spinner.style.borderRadius = "50%";
      spinner.style.border = "2px solid rgba(255, 255, 255, 0.3)";
      spinner.style.borderTopColor = "#ffffff";
      spinner.style.animation = "banner-spin 0.8s linear infinite";
      banner.appendChild(spinner);
      
      const textSpan = document.createElement("span");
      textSpan.id = "game-disconnect-banner-text";
      banner.appendChild(textSpan);
      
      if (!document.getElementById("banner-spin-style")) {
        const style = document.createElement("style");
        style.id = "banner-spin-style";
        style.textContent = `
          @keyframes banner-spin {
            to { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(banner);
      
      banner.getBoundingClientRect(); // force reflow
      banner.style.transform = "translateX(-50%) translateY(0)";
      banner.style.opacity = "1";
    }
    
    const textSpan = document.getElementById("game-disconnect-banner-text");
    if (textSpan) {
      textSpan.textContent = message;
    }
  }

  hideDisconnectBanner() {
    const banner = document.getElementById("game-disconnect-banner");
    if (banner) {
      banner.style.transform = "translateX(-50%) translateY(-20px)";
      banner.style.opacity = "0";
      setTimeout(() => {
        if (banner.parentNode) {
          banner.parentNode.removeChild(banner);
        }
      }, 300);
    }
  }

  async updatePlayerOffsets(playerId) {
    if (!this.verifyAuth()) return;
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

  async checkAndTriggerOnlineGuessingRound(outcome) {
    window.game.matchWinsCount = (window.game.matchWinsCount || 0) + 1;
    if (window.game.matchWinsCount % 3 === 0) {
      if (this.isHost) {
        await this.initializeOnlineGuessingRound(outcome);
      }
    } else {
      if (this.isHost) {
        await this.skipOnlineGuessingRound();
      }
    }
  }

  async skipOnlineGuessingRound() {
    if (!this.roomRef || !window.game) return;
    window.game.collectMatchEarnings();
    const serializedGameState = this.serializeGameState(window.game);
    
    try {
      await this.roomRef.update({
        gameState: serializedGameState,
        lastAction: {
          type: "guessingRoundContinue",
          actionId: "guessing_continue_" + Math.random().toString(36).substring(2, 11),
          timestamp: firebase.database.ServerValue.TIMESTAMP
        },
        guessingRound: null
      });
    } catch (e) {
      console.error("Failed to skip online guessing round:", e);
    }
  }

  async initializeOnlineGuessingRound(outcome) {
    if (!this.roomRef) return;
    
    this.onlineTransfersApplied = false;

    const guessers = window.game.players.filter(p => p.id !== outcome.playerIndex && p.stackCount > 0);
    const guesserUids = guessers.map(p => p.uid).filter(uid => uid);

    const initialGuesses = {};
    const initialBets = {};

    const cardHolder = window.game.players[outcome.playerIndex];
    // Take the top 6 cards of the cardHolder's stack
    const top6Cards = cardHolder ? cardHolder.stack.slice(0, 6) : [];
    
    // Get unique movie names from these 6 cards
    const top6Movies = top6Cards.map(c => c.movie).filter(m => m);
    const uniqueTop6Movies = [...new Set(top6Movies)];
    const movieOptions = uniqueTop6Movies.sort(() => 0.5 - Math.random());

    const targetCard = window.game.pendingMatchWinnings.cards[window.game.pendingMatchWinnings.cards.length - 1];
    const correctStarName = targetCard.name;
    const correctMovie = targetCard.movie || "Salaar";

    window.game.players.forEach(p => {
      if (p.id !== outcome.playerIndex && p.isBot && p.stackCount > 0) {
        const P_correct = 0.3;
        let botGuess = "";
        let botMovie = "";
        if (Math.random() < P_correct) {
          botGuess = correctStarName;
          botMovie = correctMovie;
        } else {
          const incorrectMovies = movieOptions.filter(m => m !== correctMovie);
          botMovie = incorrectMovies[Math.floor(Math.random() * incorrectMovies.length)];
          const starForMovie = window.game.config.roster.find(s => s.movie === botMovie);
          botGuess = starForMovie ? starForMovie.name : "Prabhas";
        }
        initialGuesses[p.id] = { guess: botGuess, selectedMovie: botMovie, locked: true };
        initialBets[p.id] = Math.random() < 0.6 ? 5 : 10;
      }
    });

    try {
      await this.roomRef.child("guessingRound").set({
        active: true,
        phase: "placing",
        cardHolderId: outcome.playerIndex,
        guesses: initialGuesses,
        bets: initialBets,
        confirmedStake: 0,
        revealed: false,
        guesserUids: guesserUids,
        movieOptions: movieOptions
      });
    } catch (e) {
      console.error("Failed to initialize online guessing round:", e);
    }
  }

  async renderOnlineGuessingRoundView(guessingRound) {
    const titleEl = document.getElementById("guessing-round-title");
    const instructionsEl = document.getElementById("guessing-round-instructions");
    const contentEl = document.getElementById("guessing-round-content");
    
    const cardHolder = window.game.players[guessingRound.cardHolderId];
    if (!cardHolder) return;
    
    const myUid = this.getMyUid();
    const myId = window.game.players.findIndex(p => p.uid === myUid);
    const isCardHolder = (myId === guessingRound.cardHolderId);

    window.playerStatusIndicators = {};
    window.game.players.forEach(p => {
      if (p.id === guessingRound.cardHolderId) return;
      if (guessingRound.bets && guessingRound.bets[p.id] !== undefined) {
        window.playerStatusIndicators[p.id] = "🎴";
      } else if (guessingRound.guesses && guessingRound.guesses[p.id] !== undefined) {
        window.playerStatusIndicators[p.id] = "✏️";
      }
    });
    window.renderSeats();

    if (guessingRound.phase === "placing") {
      if (isCardHolder) {
        titleEl.innerHTML = "🎴 Placing Face-Down Card";
        instructionsEl.innerHTML = `Choose one card from your stack to place face-down.`;

        // Show ONLY the top 6 cards of the stack
        const top6Cards = cardHolder.stack.slice(0, 6);
        let cardsHtml = top6Cards.map((c, index) => {
          const starInfo = window.game.config.roster.find(s => s.id === c.id) || c;
          const imgHtml = starInfo.imagePath ? `<img src="${starInfo.imagePath}" style="width: 100%; height: 100%; border-radius: 8px; object-fit: cover;">` : `<div style="font-size: 1.2rem; margin-top: 40px;">🎬</div>`;
          return `<div class="star-card" data-card-idx="${index}" style="width: 110px; height: 154px; margin: 4px; border: 2px solid var(--accent-cyan); border-radius: 8px; background: #0f0c29; box-shadow: var(--shadow-sm); cursor: pointer; position: relative;">
            ${imgHtml}
            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.8); font-size: 0.72rem; padding: 4px; border-bottom-left-radius: 6px; border-bottom-right-radius: 6px; text-align: center;">${starInfo.name}</div>
          </div>`;
        }).join("");

        contentEl.innerHTML = `
          <div style="text-align: center; margin-bottom: 16px;">
            <p>Select one greeting card to place face-down (from top 6 cards):</p>
          </div>
          <div class="guessing-card-scroll" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; max-height: 300px; overflow-y: auto;">
            ${cardsHtml}
          </div>
        `;

        contentEl.querySelectorAll(".star-card").forEach(el => {
          el.addEventListener("click", async () => {
            const cardIdx = parseInt(el.dataset.cardIdx);
            const selectedCard = cardHolder.stack[cardIdx];
            
            await this.roomRef.child("guessingRound/selectedCardInstanceId").set(selectedCard.instanceId);
            await this.roomRef.child("guessingRound/phase").set("guessing");
          });
        });
      } else {
        titleEl.innerHTML = "🎴 Placing Face-Down Card";
        instructionsEl.innerHTML = `Waiting for <strong>${cardHolder.name}</strong> to place a card face-down.`;
        contentEl.innerHTML = `
          <div style="text-align: center; padding: 32px 0;">
            <div class="spinner" style="width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-top-color: var(--accent-pink); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
            <p>Wait for the hidden card to be placed...</p>
          </div>
        `;
      }
    }

    else if (guessingRound.phase === "guessing") {
      if (isCardHolder) {
        titleEl.innerHTML = "✏️ Guessers Thinking...";
        instructionsEl.innerHTML = `Waiting for other players to enter their guesses.`;

        let guesserStatusHtml = window.game.players.filter(p => p.id !== guessingRound.cardHolderId && p.stackCount > 0).map(p => {
          const hasGuessed = guessingRound.guesses && guessingRound.guesses[p.id];
          return `
            <div style="display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <span>${p.name} ${p.isBot ? '🤖' : ''}</span>
              <span>${hasGuessed ? "✏️ Locked In" : "⌛ Thinking..."}</span>
            </div>
          `;
        }).join("");

        contentEl.innerHTML = `
          <div style="padding: 12px 0;">
            ${guesserStatusHtml}
          </div>
        `;

        if (this.isHost) {
          // Dynamic bot guesses computation based on the actual selected card
          const cardHolder = window.game.players[guessingRound.cardHolderId];
          const targetCard = (cardHolder && cardHolder.stack.find(c => c.instanceId === guessingRound.selectedCardInstanceId)) || window.game.pendingMatchWinnings.cards[window.game.pendingMatchWinnings.cards.length - 1];
          const correctStarName = targetCard.name;
          const correctMovie = targetCard.movie || "Salaar";
          
          let needsBotUpdate = false;
          const updatedGuesses = { ...guessingRound.guesses };
          const updatedBets = { ...guessingRound.bets };
          
          window.game.players.forEach(p => {
            if (p.id !== guessingRound.cardHolderId && p.isBot && p.stackCount > 0) {
              const currentGuess = guessingRound.guesses && guessingRound.guesses[p.id];
              if (!currentGuess || !currentGuess.actualValidated) {
                const P_correct = 0.3;
                let botGuess = "";
                let botMovie = "";
                if (Math.random() < P_correct) {
                  botGuess = correctStarName;
                  botMovie = correctMovie;
                } else {
                  const incorrectMovies = guessingRound.movieOptions.filter(m => m !== correctMovie);
                  botMovie = incorrectMovies[Math.floor(Math.random() * incorrectMovies.length)];
                  const starForMovie = window.game.config.roster.find(s => s.movie === botMovie);
                  botGuess = starForMovie ? starForMovie.name : "Prabhas";
                }
                updatedGuesses[p.id] = { guess: botGuess, selectedMovie: botMovie, locked: true, actualValidated: true };
                updatedBets[p.id] = Math.random() < 0.6 ? 5 : 10;
                needsBotUpdate = true;
              }
            }
          });
          
          if (needsBotUpdate) {
            this.roomRef.child("guessingRound/guesses").set(updatedGuesses);
            this.roomRef.child("guessingRound/bets").set(updatedBets);
          }

          const allGuessed = guessingRound.guesserUids.every(uid => {
            const p = window.game.players.find(pl => pl.uid === uid);
            return p && guessingRound.guesses && guessingRound.guesses[p.id];
          });
          if (allGuessed) {
            let count5 = 0;
            let count10 = 0;
            window.game.players.forEach(p => {
              if (p.id !== guessingRound.cardHolderId && p.stackCount > 0) {
                const betVal = guessingRound.bets && guessingRound.bets[p.id];
                if (betVal === 10) count10++;
                else count5++;
              }
            });
            const confirmedStake = count10 > count5 ? 10 : 5;

            await this.roomRef.child("guessingRound/confirmedStake").set(confirmedStake);
            await this.roomRef.child("guessingRound/phase").set("revealing");
          }
        }
      } else {
        const hasGuessed = guessingRound.guesses && guessingRound.guesses[myId];

        if (!hasGuessed) {
          titleEl.innerHTML = "✏️ Enter Your Guess & Stake";
          instructionsEl.innerHTML = `Choose a movie, enter the star name, and choose your stake.`;

          const movieOptions = guessingRound.movieOptions || [];
          const movieButtonsHtml = movieOptions.map(m => {
            return `<button type="button" class="movie-option-btn" data-movie="${m}">${m}</button>`;
          }).join("");

          contentEl.innerHTML = `
            <div style="text-align: center; padding: 12px 0;">
              <p style="margin-bottom: 8px; font-size: 1.1rem; color: rgba(255,255,255,0.9);">Select the movie name for this greeting card:</p>
              <div class="movie-option-list">
                ${movieButtonsHtml}
              </div>
              
              <p style="margin-top: 16px; margin-bottom: 8px; font-size: 1.1rem; color: rgba(255,255,255,0.9);">Write the Hero or Heroine name:</p>
              <div class="guess-input-container">
                <input type="text" id="guesser-name-input" class="guess-input-field" placeholder="Type Hero/Heroine Name..." autofocus autocomplete="off" style="flex: 1; font-size: 1.1rem; padding: 10px; margin-bottom: 0;">
                <button type="button" id="voice-input-btn" class="voice-input-btn" title="Speak Guess">🎙️</button>
              </div>
              
              <p style="margin-bottom: 8px; font-size: 1.1rem; color: rgba(255,255,255,0.9);">Choose how many greetings to stake on your guess:</p>
              <div class="guessing-stake-btn-container" style="margin-bottom: 16px; display: flex; justify-content: center; gap: 16px;">
                <button type="button" class="menu-btn stake-option-btn active" data-amt="5" style="border: 2px solid var(--accent-cyan); background: rgba(6, 182, 212, 0.25); width: 140px; font-size: 1.05rem; display: inline-block;">5 Greetings</button>
                <button type="button" class="menu-btn stake-option-btn" data-amt="10" style="border: 2px solid rgba(236, 72, 153, 0.2); background: rgba(236, 72, 153, 0.05); width: 140px; font-size: 1.05rem; display: inline-block;">10 Greetings</button>
              </div>
              
              <button type="button" id="submit-guess-btn" class="menu-btn primary-btn">Submit Guess & Stake</button>
            </div>
          `;

          const voiceBtn = contentEl.querySelector("#voice-input-btn");
          if (voiceBtn) {
            voiceBtn.addEventListener("click", () => {
              window.startSpeechRecognition("guesser-name-input", "voice-input-btn");
            });
          }

          let selectedMovie = "";
          const movieButtons = contentEl.querySelectorAll(".movie-option-btn");
          movieButtons.forEach(btn => {
            btn.addEventListener("click", () => {
              movieButtons.forEach(b => b.classList.remove("selected"));
              btn.classList.add("selected");
              selectedMovie = btn.dataset.movie;
            });
          });

          let selectedStake = 5;
          const stakeButtons = contentEl.querySelectorAll(".stake-option-btn");
          stakeButtons.forEach(btn => {
            btn.addEventListener("click", () => {
              stakeButtons.forEach(b => {
                b.classList.remove("active");
                b.style.borderWidth = "2px";
                b.style.borderStyle = "solid";
                if (b.dataset.amt === "5") {
                  b.style.borderColor = "rgba(6, 182, 212, 0.2)";
                  b.style.background = "rgba(6, 182, 212, 0.05)";
                } else {
                  b.style.borderColor = "rgba(236, 72, 153, 0.2)";
                  b.style.background = "rgba(236, 72, 153, 0.05)";
                }
              });
              btn.classList.add("active");
              selectedStake = parseInt(btn.dataset.amt);
              if (selectedStake === 5) {
                btn.style.borderColor = "var(--accent-cyan)";
                btn.style.background = "rgba(6, 182, 212, 0.25)";
              } else {
                btn.style.borderColor = "var(--accent-pink)";
                btn.style.background = "rgba(236, 72, 153, 0.25)";
              }
            });
          });

          document.getElementById("submit-guess-btn").addEventListener("click", async () => {
            if (!selectedMovie) {
              alert("Please select a movie name!");
              return;
            }
            const guessVal = document.getElementById("guesser-name-input").value.trim();
            if (!guessVal) {
              alert("Please type a guess!");
              return;
            }

            await this.roomRef.child(`guessingRound/guesses/${myId}`).set({ 
              guess: guessVal, 
              selectedMovie: selectedMovie, 
              locked: true 
            });
            await this.roomRef.child(`guessingRound/bets/${myId}`).set(selectedStake);
          });
        } else {
          titleEl.innerHTML = "✏️ Guess Submitted";
          instructionsEl.innerHTML = `Waiting for other players to submit their guesses.`;
          
          let guesserStatusHtml = window.game.players.filter(p => p.id !== guessingRound.cardHolderId && p.stackCount > 0).map(p => {
            const isLocal = p.uid === myUid;
            const hasGuessed = guessingRound.guesses && guessingRound.guesses[p.id];
            return `
              <div style="display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); ${isLocal ? 'color: var(--accent-cyan); font-weight: 600;' : ''}">
                <span>${p.name} ${p.isBot ? '🤖' : ''} ${isLocal ? '(You)' : ''}</span>
                <span>${hasGuessed ? "✏️ Locked In" : "⌛ Thinking..."}</span>
              </div>
            `;
          }).join("");

          contentEl.innerHTML = `
            <div style="padding: 12px 0;">
              ${guesserStatusHtml}
            </div>
          `;
        }
      }
    }

    else if (guessingRound.phase === "betting") {
      let count5 = 0;
      let count10 = 0;
      window.game.players.forEach(p => {
        if (p.id !== guessingRound.cardHolderId && p.stackCount > 0) {
          const betVal = guessingRound.bets && guessingRound.bets[p.id];
          if (betVal === 10) count10++;
          else if (betVal === 5) count5++;
        }
      });

      const totalVoters = count5 + count10;
      const pct5 = totalVoters > 0 ? Math.round((count5 / totalVoters) * 100) : 0;
      const pct10 = totalVoters > 0 ? Math.round((count10 / totalVoters) * 100) : 0;
      const confirmedStake = count10 > count5 ? 10 : 5;

      const hasVoted = guessingRound.bets && guessingRound.bets[myId] !== undefined;

      if (isCardHolder) {
        titleEl.innerHTML = "📢 Vote Tally & Confirm";
        instructionsEl.innerHTML = `Tallying the votes. Confirm the stake once all guessers vote.`;

        const allVoted = guessingRound.guesserUids.every(uid => {
          const p = window.game.players.find(pl => pl.uid === uid);
          return p && guessingRound.bets && guessingRound.bets[p.id] !== undefined;
        });

        contentEl.innerHTML = `
          <div class="stake-vote-tally-container">
            <div class="stake-tally-row">
              <div class="stake-tally-info">
                <span>Stake 5 Greetings</span>
                <span>${count5} votes (${pct5}%)</span>
              </div>
              <div class="stake-tally-progress-bg">
                <div class="stake-tally-progress-fill" style="width: ${pct5}%;"></div>
              </div>
            </div>
            <div class="stake-tally-row" style="margin-top: 12px;">
              <div class="stake-tally-info">
                <span>Stake 10 Greetings</span>
                <span>${count10} votes (${pct10}%)</span>
              </div>
              <div class="stake-tally-progress-bg">
                <div class="stake-tally-progress-fill" style="width: ${pct10}%; background: linear-gradient(90deg, #ec4899, #f43f5e);"></div>
              </div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 16px;">
            <p style="font-size: 0.95rem; margin-bottom: 16px;">
              ${allVoted ? `Majority vote result: <strong>Stake is ${confirmedStake} Greetings</strong>` : `Waiting for all guessers to vote...`}
            </p>
            <button type="button" id="confirm-stake-btn" class="menu-btn primary-btn" ${allVoted ? "" : "disabled"} style="width: 260px; margin: 0 auto; ${allVoted ? "" : "opacity: 0.5; cursor: not-allowed;"}">Confirm — Stake is ${confirmedStake} Greetings</button>
          </div>
        `;

        if (allVoted) {
          document.getElementById("confirm-stake-btn").addEventListener("click", async () => {
            await this.roomRef.child("guessingRound/confirmedStake").set(confirmedStake);
            await this.roomRef.child("guessingRound/phase").set("revealing");
          });
        }
      } else {
        if (!hasVoted) {
          titleEl.innerHTML = "🎴 Stake Your Greetings";
          instructionsEl.innerHTML = `Choose how many greetings to stake on your guess.`;

          contentEl.innerHTML = `
            <div style="text-align: center; padding: 12px 0;">
              <p style="margin-bottom: 16px; font-size: 0.95rem;">Choose how many greetings to stake:</p>
              <div class="guessing-stake-btn-container">
                <button type="button" class="menu-btn stake-btn" data-amt="5" style="border-color: var(--accent-cyan); background: rgba(6, 182, 212, 0.1);">Stake 5 Greetings</button>
                <button type="button" class="menu-btn stake-btn" data-amt="10" style="border-color: var(--accent-pink); background: rgba(236, 72, 153, 0.1);">Stake 10 Greetings</button>
              </div>
            </div>
          `;

          contentEl.querySelectorAll(".stake-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
              const amt = parseInt(btn.dataset.amt);
              await this.roomRef.child(`guessingRound/bets/${myId}`).set(amt);
            });
          });
        } else {
          titleEl.innerHTML = "📢 Vote Submitted";
          instructionsEl.innerHTML = `Waiting for all guessers to vote and Card Holder to confirm.`;

          contentEl.innerHTML = `
            <div class="stake-vote-tally-container">
              <div class="stake-tally-row">
                <div class="stake-tally-info">
                  <span>Stake 5 Greetings</span>
                  <span>${count5} votes (${pct5}%)</span>
                </div>
                <div class="stake-tally-progress-bg">
                  <div class="stake-tally-progress-fill" style="width: ${pct5}%;"></div>
                </div>
              </div>
              <div class="stake-tally-row" style="margin-top: 12px;">
                <div class="stake-tally-info">
                  <span>Stake 10 Greetings</span>
                  <span>${count10} votes (${pct10}%)</span>
                </div>
                <div class="stake-tally-progress-bg">
                  <div class="stake-tally-progress-fill" style="width: ${pct10}%; background: linear-gradient(90deg, #ec4899, #f43f5e);"></div>
                </div>
              </div>
            </div>
            <div style="text-align: center; padding: 12px 0;">
              <p>Waiting for Card Holder confirmation...</p>
            </div>
          `;
        }
      }
    }

    else if (guessingRound.phase === "revealing") {
      titleEl.innerHTML = "🃏 Reveal Hidden Card";
      instructionsEl.innerHTML = `Let's see who is on the hidden card!`;

      const targetCard = (cardHolder && cardHolder.stack.find(c => c.instanceId === guessingRound.selectedCardInstanceId)) || window.game.pendingMatchWinnings.cards[window.game.pendingMatchWinnings.cards.length - 1];

      contentEl.innerHTML = `
        <div class="guessing-card-container">
          <div class="guessing-card-inner" id="flip-card-inner">
            <div class="guessing-card-back pulse-glow" style="width: 100%; height: 100%; border-radius: 8px; background: linear-gradient(135deg, #4c1d95, #1e1b4b); box-shadow: 0 0 15px rgba(255,215,0,0.5); display: flex; align-items: center; justify-content: center;">
              <div style="font-size: 2rem;">🌟</div>
            </div>
            <div class="guessing-card-front" id="flip-card-front" style="width: 100%; height: 100%;">
              <!-- Card Front Rendered Here -->
            </div>
          </div>
        </div>
        <div style="text-align: center; margin-top: 16px;">
          ${isCardHolder ? `<button type="button" id="flip-action-btn" class="menu-btn primary-btn" style="width: 180px; margin: 0 auto;">Flip Card 🃏</button>` : `<p>Waiting for <strong>${cardHolder.name}</strong> to flip the card...</p>`}
        </div>
      `;

      const frontContainer = document.getElementById("flip-card-front");
      const frontCardDom = window.createCardElement(targetCard);
      frontCardDom.style.width = "100%";
      frontCardDom.style.height = "100%";
      frontCardDom.style.margin = "0";
      frontCardDom.style.boxShadow = "none";
      frontContainer.appendChild(frontCardDom);

      if (isCardHolder) {
        document.getElementById("flip-action-btn").addEventListener("click", async () => {
          const innerEl = document.getElementById("flip-card-inner");
          innerEl.classList.add("flipped");

          if (window.playTouchSound) window.playTouchSound();

          setTimeout(async () => {
            await this.roomRef.child("guessingRound/revealed").set(true);
            await this.roomRef.child("guessingRound/phase").set("results");
          }, 700);
        });
      } else {
        if (guessingRound.revealed) {
          const innerEl = document.getElementById("flip-card-inner");
          if (innerEl) innerEl.classList.add("flipped");
        }
      }
    }

    else if (guessingRound.phase === "results") {
      titleEl.innerHTML = "📊 Round Results";
      instructionsEl.innerHTML = `Greeting card balances have been updated.`;

      const targetCard = (cardHolder && cardHolder.stack.find(c => c.instanceId === guessingRound.selectedCardInstanceId)) || window.game.pendingMatchWinnings.cards[window.game.pendingMatchWinnings.cards.length - 1];
      const correctStarName = targetCard.name;
      const confirmedStake = guessingRound.confirmedStake || 5;

      if (this.isHost && !this.onlineTransfersApplied) {
        this.onlineTransfersApplied = true;
        await this.calculateAndApplyOnlineTransfers(guessingRound);
      }

      const diffs = {};
      let wrongGuessers = [];
      let correctGuessers = [];
      const correctMovieName = targetCard.movie || "";

      window.game.players.forEach((p, index) => {
        if (index === guessingRound.cardHolderId) return;
        if (p.stackCount <= 0 && (!guessingRound.guesses || !guessingRound.guesses[p.id])) return;

        const guessObj = guessingRound.guesses && guessingRound.guesses[p.id];
        const guessText = guessObj ? guessObj.guess : "";
        const selectedMovie = guessObj ? guessObj.selectedMovie : "";
        
        const isCorrect = (selectedMovie === correctMovieName) && this.isCorrectGuess(guessText, correctStarName, targetCard.id);
        if (isCorrect) {
          correctGuessers.push(p);
        } else {
          wrongGuessers.push(p);
        }
      });

      let totalCollected = 0;
      wrongGuessers.forEach(p => {
        const originalVal = p.greetingsStack !== undefined ? p.greetingsStack : 50;
        const transferVal = Math.min(confirmedStake, originalVal);
        totalCollected += transferVal;
        diffs[p.id] = -transferVal;
      });

      const cardHolderPlayer = window.game.players[guessingRound.cardHolderId];

      if (correctGuessers.length > 0) {
        const awardVal = Math.floor(totalCollected / correctGuessers.length);
        correctGuessers.forEach(p => {
          diffs[p.id] = awardVal;
        });
        const distributed = awardVal * correctGuessers.length;
        const remainder = totalCollected - distributed;
        if (remainder > 0 && cardHolderPlayer) {
          diffs[cardHolderPlayer.id] = remainder;
        }
      } else {
        if (cardHolderPlayer) {
          diffs[cardHolderPlayer.id] = totalCollected;
        }
      }

      if (cardHolderPlayer && diffs[cardHolderPlayer.id] === undefined) {
        diffs[cardHolderPlayer.id] = 0;
      }

      correctGuessers.forEach(p => {
        if (diffs[p.id] === undefined) diffs[p.id] = 0;
      });

      let rowsHtml = window.game.players.map((p, index) => {
        const changeVal = diffs[p.id] || 0;
        const changeStr = changeVal > 0 ? `+${changeVal} Stack` : changeVal < 0 ? `${changeVal} Stack` : `0 Stack`;

        if (index === guessingRound.cardHolderId) {
          return `
            <tr class="results-row-stagger" style="--row-index: ${index}; font-style: italic;">
              <td>${p.name} (Winner)</td>
              <td>—</td>
              <td>—</td>
              <td><strong>${changeStr}</strong></td>
            </tr>
          `;
        }

        if (p.stackCount <= 0 && (!guessingRound.guesses || !guessingRound.guesses[p.id])) {
          return `
            <tr class="results-row-stagger" style="--row-index: ${index}; color: var(--text-muted);">
              <td>${p.name}</td>
              <td>—</td>
              <td>—</td>
              <td>Eliminated</td>
            </tr>
          `;
        }

        const guessObj = guessingRound.guesses && guessingRound.guesses[p.id];
        const guessText = guessObj ? guessObj.guess : "No Guess";
        const selectedMovie = guessObj ? guessObj.selectedMovie : "None";
        const isCorrect = (selectedMovie === correctMovieName) && this.isCorrectGuess(guessText, correctStarName, targetCard.id);
        const resultClass = isCorrect ? "correct-row" : "wrong-row";

        return `
          <tr class="${resultClass} results-row-stagger" style="--row-index: ${index};">
            <td>${p.name} ${p.isBot ? '🤖' : ''} ${p.uid === myUid ? '(You)' : ''}</td>
            <td>"${selectedMovie}" / "${guessText}"</td>
            <td>${isCorrect ? "✅ Correct" : "❌ Incorrect"}</td>
            <td><strong>${changeStr}</strong></td>
          </tr>
        `;
      }).join("");

      contentEl.innerHTML = `
        <div class="star-revealed-text">
          Star revealed: <strong>${correctStarName}</strong>
        </div>
        <table class="guessing-results-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Guess</th>
              <th>Status</th>
              <th>Transfer</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div style="text-align: center; margin-top: 24px;">
          ${this.isHost ? `<button type="button" id="continue-online-match-btn" class="menu-btn primary-btn">Continue Game</button>` : `<p>Waiting for Host to continue game...</p>`}
        </div>
      `;

      if (this.isHost) {
        document.getElementById("continue-online-match-btn").addEventListener("click", async () => {
          window.game.collectMatchEarnings();
          const serializedGameState = this.serializeGameState(window.game);
          
          await this.roomRef.update({
            gameState: serializedGameState,
            lastAction: {
              type: "guessingRoundContinue",
              actionId: "guessing_continue_" + Math.random().toString(36).substring(2, 11),
              timestamp: firebase.database.ServerValue.TIMESTAMP
            },
            guessingRound: null
          });
        });
      }
    }
  }

  async calculateAndApplyOnlineTransfers(guessingRound) {
    if (!this.roomRef || !window.game) return;

    const cardHolder = window.game.players[guessingRound.cardHolderId];
    const targetCard = (cardHolder && cardHolder.stack.find(c => c.instanceId === guessingRound.selectedCardInstanceId)) || window.game.pendingMatchWinnings.cards[window.game.pendingMatchWinnings.cards.length - 1];
    const correctStarName = targetCard.name;
    const correctMovieName = targetCard.movie || "";
    const confirmedStake = guessingRound.confirmedStake || 5;

    let wrongGuessers = [];
    let correctGuessers = [];

    window.game.players.forEach((p, index) => {
      if (index === guessingRound.cardHolderId) return;
      if (p.stackCount <= 0 && (!guessingRound.guesses || !guessingRound.guesses[p.id])) return;

      const guessObj = guessingRound.guesses && guessingRound.guesses[p.id];
      const guessText = guessObj ? guessObj.guess : "";
      const selectedMovie = guessObj ? guessObj.selectedMovie : "";
      
      const isCorrect = (selectedMovie === correctMovieName) && this.isCorrectGuess(guessText, correctStarName, targetCard.id);

      if (isCorrect) {
        correctGuessers.push(p);
      } else {
        wrongGuessers.push(p);
      }
    });

    const updates = {};
    let totalCollected = 0;
    let collectedCards = [];

    const snapshot = await this.roomRef.child("players").once("value");
    const dbPlayers = snapshot.val() || {};

    wrongGuessers.forEach(p => {
      const dbPlayer = dbPlayers[p.uid] || {};
      const originalVal = dbPlayer.greetingsStack !== undefined ? dbPlayer.greetingsStack : 50;
      const transferVal = Math.min(confirmedStake, originalVal);
      const newVal = originalVal - transferVal;
      updates[`players/${p.uid}/greetingsStack`] = newVal;
      totalCollected += transferVal;

      // Physically transfer the cards in the game engine
      const gamePlayer = window.game.players.find(gp => gp.id === p.id);
      if (gamePlayer) {
        const actualDeduct = Math.min(transferVal, gamePlayer.stack.length);
        const removed = gamePlayer.stack.splice(0, actualDeduct);
        collectedCards.push(...removed);
      }
    });

     // cardHolder is already declared at the top of the function
    const dbCardHolder = cardHolder ? (dbPlayers[cardHolder.uid] || {}) : {};
    const originalHolderVal = dbCardHolder.greetingsStack !== undefined ? dbCardHolder.greetingsStack : 50;

    if (correctGuessers.length > 0) {
      const awardVal = Math.floor(totalCollected / correctGuessers.length);
      correctGuessers.forEach(p => {
        const dbPlayer = dbPlayers[p.uid] || {};
        const originalVal = dbPlayer.greetingsStack !== undefined ? dbPlayer.greetingsStack : 50;
        const newVal = originalVal + awardVal;
        updates[`players/${p.uid}/greetingsStack`] = newVal;
      });

      if (collectedCards.length > 0) {
        const cardsPerWinner = Math.floor(collectedCards.length / correctGuessers.length);
        correctGuessers.forEach((p, idx) => {
          const gamePlayer = window.game.players.find(gp => gp.id === p.id);
          if (gamePlayer) {
            const startIdx = idx * cardsPerWinner;
            const endIdx = idx === correctGuessers.length - 1 ? collectedCards.length : startIdx + cardsPerWinner;
            const pCards = collectedCards.slice(startIdx, endIdx);
            gamePlayer.stack.push(...pCards);
          }
        });

        // The card holder who flipped the card gets any remainder cards!
        const distributedCount = cardsPerWinner * correctGuessers.length;
        const remainderCount = collectedCards.length - distributedCount;
        if (remainderCount > 0 && cardHolder) {
          cardHolder.stack.push(...collectedCards.slice(distributedCount));
          updates[`players/${cardHolder.uid}/greetingsStack`] = originalHolderVal + remainderCount;
        }
      }
    } else {
      // If nobody guessed correctly, all wrong guessers' stakes go to the Card Holder!
      if (cardHolder && collectedCards.length > 0) {
        cardHolder.stack.push(...collectedCards);
        updates[`players/${cardHolder.uid}/greetingsStack`] = originalHolderVal + collectedCards.length;
      }
    }

    await this.roomRef.update(updates);
  }

  isCorrectGuess(guessText, actualStarName, cardId) {
    if (!guessText) return false;
    const normalizedGuess = guessText.trim().toLowerCase().replace(/\s+/g, "");
    
    // Check against the card's displayed name
    const normalizedActual = actualStarName.trim().toLowerCase().replace(/\s+/g, "");
    if (normalizedGuess === normalizedActual ||
        normalizedActual.includes(normalizedGuess) ||
        normalizedGuess.includes(normalizedActual)) {
      return true;
    }
    
    // Also check against the real actor name from the roster (e.g. "Prabhas" for "Baahubali" card)
    if (cardId && window.game && window.game.config && window.game.config.roster) {
      const rosterEntry = window.game.config.roster.find(s => s.id === cardId);
      if (rosterEntry && rosterEntry.name !== actualStarName) {
        const normalizedRoster = rosterEntry.name.trim().toLowerCase().replace(/\s+/g, "");
        if (normalizedGuess === normalizedRoster ||
            normalizedRoster.includes(normalizedGuess) ||
            normalizedGuess.includes(normalizedRoster)) {
          return true;
        }
      }
    }
    
    return false;
  }
}

// Reconstruct game logic from deserialization helper
GameState.prototype.deserialize = function(data) {
  this.currentPlayerIndex = data.currentPlayerIndex;
  this.matchWinsCount = data.matchWinsCount || 0;
  this.pot = (data.pot || []).map(c => {
    const card = new CardInstance(c, c.instanceId);
    card.playedBy = c.playedBy;
    return card;
  });
  this.logs = data.logs || [];
  this.roundNumber = data.roundNumber;
  this.isGameOver = data.isGameOver;
  this.globalInstanceCounter = data.globalInstanceCounter;
  this.matchBet = parseInt(data.matchBet, 10) || 25;
  this.isBetDeductedForCurrentPot = data.isBetDeductedForCurrentPot;
  this.currentPotStarterIndex = data.currentPotStarterIndex;
  this.selectedCategory = data.selectedCategory || "Tollywood";
  this.pendingMatchWinnings = data.pendingMatchWinnings ? {
    winnerIndex: data.pendingMatchWinnings.winnerIndex,
    cards: (data.pendingMatchWinnings.cards || []).map(c => {
      const card = new CardInstance(c, c.instanceId);
      card.playedBy = c.playedBy;
      return card;
    }),
    coins: data.pendingMatchWinnings.coins,
    deductionPlayers: data.pendingMatchWinnings.deductionPlayers || [],
    wonCardsCount: data.pendingMatchWinnings.wonCardsCount,
    winnings: data.pendingMatchWinnings.winnings,
    matchedStarName: data.pendingMatchWinnings.matchedStarName,
    roundNumber: data.pendingMatchWinnings.roundNumber
  } : null;
  
  const oldPlayers = this.players || [];
  this.players = (data.players || []).map(p => {
    const player = new Player(p.name, p.id);
    player.username = p.username;
    player.uid = p.uid;
    player.avatar = p.avatar;
    player.coins = isNaN(parseInt(p.coins, 10)) ? 300 : parseInt(p.coins, 10);
    player.freeStackBuys = isNaN(parseInt(p.freeStackBuys, 10)) ? 10 : parseInt(p.freeStackBuys, 10);
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
