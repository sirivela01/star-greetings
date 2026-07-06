// Barakatta - Firebase Online Multiplayer Sync Engine

class BarakattaMultiplayerManager {
  constructor() {
    this.roomRef = null;
    this.roomCode = null;
    this.isHost = false;
    this.currentUser = null;
    this.db = null;
    this.lastActionId = null;
    
    // Connect to Firebase Realtime Database
    this.initFirebase();
    this.initUIEvents();
  }

  initFirebase() {
    try {
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        this.db = firebase.database();
        
        // Listen to connection status
        this.db.ref(".info/connected").on("value", (snapshot) => {
          const banner = document.getElementById("bk-db-status-banner");
          if (banner) {
            if (snapshot.val() === true) {
              banner.className = "db-status-banner connected";
              banner.querySelector(".status-text").textContent = "Connected to Database";
            } else {
              banner.className = "db-status-banner offline";
              banner.querySelector(".status-text").textContent = "Offline (Reconnecting...)";
            }
          }
        });
      }
    } catch (e) {
      console.error("Failed to initialize Firebase in Barakatta Multiplayer:", e);
      const banner = document.getElementById("bk-db-status-banner");
      if (banner) {
        banner.className = "db-status-banner offline";
        banner.querySelector(".status-text").textContent = "Database Error";
      }
    }
  }

  showScreen(screenId) {
    const screens = [
      "login-screen", "signup-screen", "forgot-password-screen",
      "dashboard-screen", "online-lobby-screen", "online-waiting-screen",
      "setup-screen", "game-screen", "end-screen",
      "barakatta-dashboard-screen", "barakatta-game-screen", "barakatta-setup-screen",
      "barakatta-online-lobby-screen", "barakatta-online-waiting-screen"
    ];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });
    const target = document.getElementById(screenId);
    if (target) target.classList.remove("hidden");
  }

  initUIEvents() {
    const playOnlineBtn = document.getElementById("barakatta-play-online-btn");
    if (playOnlineBtn) {
      playOnlineBtn.addEventListener("click", () => {
        this.currentUser = window.auth.getCurrentUser();
        if (!this.currentUser) {
          alert("Please log in first.");
          return;
        }
        this.showScreen("barakatta-online-lobby-screen");
      });
    }

    const backToDashboardLink = document.getElementById("link-bk-online-to-dashboard");
    if (backToDashboardLink) {
      backToDashboardLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.showScreen("barakatta-dashboard-screen");
      });
    }

    const createBtn = document.getElementById("bk-online-create-room-btn");
    if (createBtn) {
      createBtn.addEventListener("click", () => {
        this.createRoom();
      });
    }

    const joinBtn = document.getElementById("bk-online-join-room-btn");
    if (joinBtn) {
      joinBtn.addEventListener("click", () => {
        this.joinRoom();
      });
    }

    const leaveBtn = document.getElementById("bk-online-leave-room-btn");
    if (leaveBtn) {
      leaveBtn.addEventListener("click", () => {
        this.leaveRoom();
      });
    }

    const startBtn = document.getElementById("bk-online-start-match-btn");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        this.startMatch();
      });
    }
  }

  generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // clear ambiguous characters
    let code = "BK-";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async createRoom() {
    if (!this.db) {
      alert("Firebase Database is not configured or offline.");
      return;
    }
    this.currentUser = window.auth.getCurrentUser();
    if (!this.currentUser) return;

    this.roomCode = this.generateRoomCode();
    this.isHost = true;
    const myUid = this.currentUser.uid || "guest_" + this.currentUser.username;

    const roomData = {
      roomCode: this.roomCode,
      status: "waiting",
      hostUsername: this.currentUser.username,
      createdBy: myUid,
      players: {
        [myUid]: {
          name: this.currentUser.name || this.currentUser.username || "Host",
          username: this.currentUser.username,
          avatar: this.currentUser.avatar || "assets/avatars/avatar_1.png",
          joinedAt: firebase.database.ServerValue.TIMESTAMP,
          status: "connected"
        }
      }
    };

    try {
      this.roomRef = this.db.ref(`barakatta_rooms/${this.roomCode}`);
      await this.roomRef.set(roomData);
      
      // Setup presence disconnect listener
      this.roomRef.child(`players/${myUid}/status`).onDisconnect().set("disconnected");

      this.listenToRoom();
      document.getElementById("bk-lobby-room-code-lbl").textContent = this.roomCode;
      this.showScreen("barakatta-online-waiting-screen");
    } catch (e) {
      alert("Failed to create room: " + e.message);
    }
  }

  async joinRoom() {
    if (!this.db) {
      alert("Firebase Database is not configured or offline.");
      return;
    }
    this.currentUser = window.auth.getCurrentUser();
    if (!this.currentUser) return;

    const inputCode = document.getElementById("bk-online-join-code").value.trim().toUpperCase();
    if (!inputCode) {
      alert("Please enter a room code.");
      return;
    }

    try {
      const snap = await this.db.ref(`barakatta_rooms/${inputCode}`).once("value");
      if (!snap.exists()) {
        alert("Room not found. Check code and try again.");
        return;
      }

      const room = snap.val();
      if (room.status !== "waiting") {
        alert("This match has already started or is full.");
        return;
      }

      const players = room.players || {};
      const numPlayers = Object.keys(players).length;
      if (numPlayers >= 4) {
        alert("This room is full (maximum 4 players).");
        return;
      }

      this.roomCode = inputCode;
      this.isHost = false;
      const myUid = this.currentUser.uid || "guest_" + this.currentUser.username;

      const myData = {
        name: this.currentUser.name || this.currentUser.username || "Guest",
        username: this.currentUser.username,
        avatar: this.currentUser.avatar || "assets/avatars/avatar_1.png",
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
        status: "connected"
      };

      await this.db.ref(`barakatta_rooms/${this.roomCode}/players/${myUid}`).set(myData);
      this.roomRef = this.db.ref(`barakatta_rooms/${this.roomCode}`);
      
      // Presence disconnect listener
      this.roomRef.child(`players/${myUid}/status`).onDisconnect().set("disconnected");

      this.listenToRoom();
      document.getElementById("bk-lobby-room-code-lbl").textContent = this.roomCode;
      this.showScreen("barakatta-online-waiting-screen");
    } catch (e) {
      alert("Failed to join room: " + e.message);
    }
  }

  listenToRoom() {
    if (!this.roomRef) return;

    this.roomRef.on("value", (snap) => {
      const room = snap.val();
      if (!room) {
        // Room was deleted
        this.roomRef.off();
        alert("The room was disbanded by the host.");
        this.showScreen("barakatta-dashboard-screen");
        return;
      }

      // 1. Sync waiting lobby player list
      const playersList = document.getElementById("bk-lobby-players-list");
      const playerCountSpan = document.getElementById("bk-lobby-player-count");
      
      const playersArray = Object.entries(room.players || {}).map(([uid, p]) => {
        p.uid = uid;
        return p;
      }).sort((a, b) => a.joinedAt - b.joinedAt);

      if (playerCountSpan) playerCountSpan.textContent = playersArray.length;
      if (playersList) {
        playersList.innerHTML = "";
        playersArray.forEach((p, idx) => {
          const li = document.createElement("li");
          li.style.display = "flex";
          li.style.alignItems = "center";
          li.style.justifyContent = "space-between";
          li.style.background = "rgba(255, 255, 255, 0.05)";
          li.style.padding = "10px 15px";
          li.style.borderRadius = "8px";
          li.style.border = "1px solid rgba(255, 255, 255, 0.1)";
          
          const avatarUrl = p.avatar || "assets/avatars/avatar_1.png";
          const hostBadge = p.username === room.hostUsername ? "👑 Host" : "Player";
          
          li.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="${avatarUrl}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.2);">
              <span style="font-weight: 600; color: #fff;">${p.name} <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);">(@${p.username})</span></span>
            </div>
            <span style="font-size: 0.8rem; font-weight: 600; padding: 4px 8px; border-radius: 4px; background: ${p.username === room.hostUsername ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.1)'}; color: ${p.username === room.hostUsername ? '#fbbf24' : '#fff'};">${hostBadge}</span>
          `;
          playersList.appendChild(li);
        });
      }

      // 2. Start Match Button Enable/Disable
      const startBtn = document.getElementById("bk-online-start-match-btn");
      if (startBtn) {
        if (this.isHost) {
          startBtn.style.display = "block";
          if (playersArray.length >= 2) {
            startBtn.removeAttribute("disabled");
            startBtn.style.opacity = "1";
            startBtn.style.pointerEvents = "auto";
          } else {
            startBtn.setAttribute("disabled", "true");
            startBtn.style.opacity = "0.5";
            startBtn.style.pointerEvents = "none";
          }
        } else {
          startBtn.style.display = "none";
        }
      }

      // 3. Gameplay transitions
      if (room.status === "playing") {
        const localGameActive = window.bkGame && window.bkGame.mode === "online";
        
        if (!localGameActive) {
          // Initialize online game locally
          const sortedPlayers = Object.entries(room.players || {}).map(([uid, p]) => {
            p.uid = uid;
            return p;
          }).sort((a, b) => a.joinedAt - b.joinedAt);

          // Map players based on slots
          const mappedCustom = [];
          if (sortedPlayers.length === 2) {
            // P1 (Red) and P3 (Yellow)
            mappedCustom[0] = { name: sortedPlayers[0].name, avatar: sortedPlayers[0].avatar, isBot: false, username: sortedPlayers[0].username };
            mappedCustom[1] = { name: "", avatar: "", isBot: true }; // dummy slot 2
            mappedCustom[2] = { name: sortedPlayers[1].name, avatar: sortedPlayers[1].avatar, isBot: false, username: sortedPlayers[1].username };
            mappedCustom[3] = { name: "", avatar: "", isBot: true }; // dummy slot 4
          } else if (sortedPlayers.length === 3) {
            // P1, P2, P3
            mappedCustom[0] = { name: sortedPlayers[0].name, avatar: sortedPlayers[0].avatar, isBot: false, username: sortedPlayers[0].username };
            mappedCustom[1] = { name: sortedPlayers[1].name, avatar: sortedPlayers[1].avatar, isBot: false, username: sortedPlayers[1].username };
            mappedCustom[2] = { name: sortedPlayers[2].name, avatar: sortedPlayers[2].avatar, isBot: false, username: sortedPlayers[2].username };
            mappedCustom[3] = { name: "", avatar: "", isBot: true };
          } else {
            // P1, P2, P3, P4
            mappedCustom[0] = { name: sortedPlayers[0].name, avatar: sortedPlayers[0].avatar, isBot: false, username: sortedPlayers[0].username };
            mappedCustom[1] = { name: sortedPlayers[1].name, avatar: sortedPlayers[1].avatar, isBot: false, username: sortedPlayers[1].username };
            mappedCustom[2] = { name: sortedPlayers[2].name, avatar: sortedPlayers[2].avatar, isBot: false, username: sortedPlayers[2].username };
            mappedCustom[3] = { name: sortedPlayers[3].name, avatar: sortedPlayers[3].avatar, isBot: false, username: sortedPlayers[3].username };
          }

          window.startBarakattaGameCustom("online", sortedPlayers.length, mappedCustom);
        }

        // 4. Action synchronizer
        if (room.lastAction && room.lastAction.actionId !== this.lastActionId) {
          this.lastActionId = room.lastAction.actionId;
          
          if (room.lastAction.type === "roll") {
            // Animate only if it's not our local roll (which was already animated)
            if (room.lastAction.player !== window.bkGame.currentTurn || room.lastAction.playerObjUsername !== this.currentUser.username) {
              window.bkAnimateOnlineRoll(room.lastAction.value, room.lastAction.player);
            }
          } else if (room.lastAction.type === "move" || room.lastAction.type === "pass") {
            // Sync game state variables and draw board
            window.bkSyncGameState(room.gameState);
            
            // If match is over, stop listening
            if (window.bkGame.status !== "in_progress") {
              this.roomRef.off();
            }
          }
        }
      }
    });
  }

  async startMatch() {
    if (!this.verifyAuth() || !this.isHost || !this.roomRef) return;

    try {
      const snap = await this.roomRef.once("value");
      const room = snap.val();
      const sortedPlayers = Object.entries(room.players || {}).map(([uid, p]) => {
        p.uid = uid;
        return p;
      }).sort((a, b) => a.joinedAt - b.joinedAt);

      if (sortedPlayers.length < 2) {
        alert("Need at least 2 players to start.");
        return;
      }

      // Set initial slots mapping
      const mappedCustom = [];
      if (sortedPlayers.length === 2) {
        mappedCustom[0] = { name: sortedPlayers[0].name, avatar: sortedPlayers[0].avatar, isBot: false, username: sortedPlayers[0].username };
        mappedCustom[1] = { name: "", avatar: "", isBot: true };
        mappedCustom[2] = { name: sortedPlayers[1].name, avatar: sortedPlayers[1].avatar, isBot: false, username: sortedPlayers[1].username };
        mappedCustom[3] = { name: "", avatar: "", isBot: true };
      } else if (sortedPlayers.length === 3) {
        mappedCustom[0] = { name: sortedPlayers[0].name, avatar: sortedPlayers[0].avatar, isBot: false, username: sortedPlayers[0].username };
        mappedCustom[1] = { name: sortedPlayers[1].name, avatar: sortedPlayers[1].avatar, isBot: false, username: sortedPlayers[1].username };
        mappedCustom[2] = { name: sortedPlayers[2].name, avatar: sortedPlayers[2].avatar, isBot: false, username: sortedPlayers[2].username };
        mappedCustom[3] = { name: "", avatar: "", isBot: true };
      } else {
        mappedCustom[0] = { name: sortedPlayers[0].name, avatar: sortedPlayers[0].avatar, isBot: false, username: sortedPlayers[0].username };
        mappedCustom[1] = { name: sortedPlayers[1].name, avatar: sortedPlayers[1].avatar, isBot: false, username: sortedPlayers[1].username };
        mappedCustom[2] = { name: sortedPlayers[2].name, avatar: sortedPlayers[2].avatar, isBot: false, username: sortedPlayers[2].username };
        mappedCustom[3] = { name: sortedPlayers[3].name, avatar: sortedPlayers[3].avatar, isBot: false, username: sortedPlayers[3].username };
      }

      // Initialize game engine locally
      window.startBarakattaGameCustom("online", sortedPlayers.length, mappedCustom);

      // Serialize game state
      const serialized = window.bkGame.serialize();

      // Write match start to database
      this.lastActionId = "start_" + Math.random().toString(36).substring(2, 11);
      await this.roomRef.update({
        status: "playing",
        gameState: serialized,
        lastAction: {
          type: "start",
          actionId: this.lastActionId,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        }
      });
    } catch (e) {
      alert("Failed to start match: " + e.message);
    }
  }

  async sendRollAction(rollValue) {
    if (!this.roomRef) return;
    try {
      const actionId = "roll_" + Math.random().toString(36).substring(2, 11);
      this.lastActionId = actionId;
      
      const serialized = window.bkGame.serialize();
      await this.roomRef.update({
        gameState: serialized,
        lastAction: {
          type: "roll",
          value: rollValue,
          player: window.bkGame.currentTurn,
          playerObjUsername: this.currentUser.username,
          actionId: actionId,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        }
      });
    } catch (e) {
      console.error("Failed to sync roll action:", e);
    }
  }

  async sendMoveAction(summary) {
    if (!this.roomRef) return;
    try {
      const actionId = "move_" + Math.random().toString(36).substring(2, 11);
      this.lastActionId = actionId;

      const serialized = window.bkGame.serialize();
      await this.roomRef.update({
        gameState: serialized,
        lastAction: {
          type: "move",
          summary: summary || "",
          player: window.bkGame.currentTurn,
          actionId: actionId,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        }
      });
    } catch (e) {
      console.error("Failed to sync move action:", e);
    }
  }

  async sendPassAction() {
    if (!this.roomRef) return;
    try {
      const actionId = "pass_" + Math.random().toString(36).substring(2, 11);
      this.lastActionId = actionId;

      const serialized = window.bkGame.serialize();
      await this.roomRef.update({
        gameState: serialized,
        lastAction: {
          type: "pass",
          player: window.bkGame.currentTurn,
          actionId: actionId,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        }
      });
    } catch (e) {
      console.error("Failed to sync pass action:", e);
    }
  }

  async leaveRoom() {
    if (!this.roomRef) {
      this.showScreen("barakatta-dashboard-screen");
      return;
    }

    try {
      const myUid = this.currentUser.uid || "guest_" + this.currentUser.username;
      
      // Clean up disconnect listener
      this.roomRef.child(`players/${myUid}/status`).onDisconnect().cancel();

      if (this.isHost) {
        // Disband room
        await this.roomRef.remove();
      } else {
        // Just remove yourself
        await this.roomRef.child(`players/${myUid}`).remove();
      }
    } catch (e) {
      console.warn("Error while leaving room:", e);
    }

    this.roomRef.off();
    this.roomRef = null;
    this.roomCode = null;
    this.showScreen("barakatta-dashboard-screen");
  }

  verifyAuth() {
    this.currentUser = window.auth.getCurrentUser();
    return !!this.currentUser;
  }
}

// Instantiate globally
window.bkMultiplayer = new BarakattaMultiplayerManager();
