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
      if (typeof firebase !== 'undefined') {
        if (firebase.apps.length === 0) {
          // Initialize using the same settings as main multiplayer engine
          let savedUrl = localStorage.getItem("star_greetings_firebase_url");
          if (savedUrl && savedUrl.includes("star-greetings-default-default-rtdb")) {
            savedUrl = null;
          }
          let savedApiKey = localStorage.getItem("star_greetings_firebase_api_key");
          const activeUrl = savedUrl || "https://star-greetings-default-rtdb.asia-southeast1.firebasedatabase.app";
          const activeApiKey = savedApiKey || "AIzaSyBE_YC0fC3p7JJrDA6BwfIdVVYRPacZtn0";
          
          // Helper to extract authDomain from Database URL
          const getAuthDomain = (dbUrl) => {
            if (!dbUrl) return "";
            const host = dbUrl.replace("https://", "").split("/")[0];
            const parts = host.split(".");
            let firstPart = parts[0];
            if (firstPart.endsWith("-default-rtdb")) {
              firstPart = firstPart.substring(0, firstPart.length - "-default-rtdb".length);
            }
            return `${firstPart}.firebaseapp.com`;
          };

          firebase.initializeApp({
            apiKey: activeApiKey,
            databaseURL: activeUrl,
            authDomain: getAuthDomain(activeUrl)
          });
        }

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

    let inputCode = document.getElementById("bk-online-join-code").value.trim().toUpperCase();
    if (!inputCode) {
      alert("Please enter a room code.");
      return;
    }

    if (inputCode.length === 4 && !inputCode.startsWith("BK-")) {
      inputCode = "BK-" + inputCode;
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

      // 1. Sync waiting lobby player list (only if room is in waiting or starting status)
      if (room.status === "waiting" || room.status === "starting") {
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
            const playersCount = Object.keys(room.players || {}).length;
            if (playersCount >= 2) {
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
      }

      // 3. Game Start Gate: Transition to "starting"
      if (room.status === "starting" || room.status === "playing") {
        const localGameActive = window.bkGame && window.bkGame.mode === "online";
        
        if (!localGameActive) {
          // Initialize online game locally from the locked seat assignments
          const mappedCustom = room.seats;
          const playerCount = room.playerCount || 4;
          
          window.startBarakattaGameCustom("online", playerCount, mappedCustom);

          // Mark this player as ready
          const myUsername = this.currentUser.username;
          this.roomRef.child("readiness/" + myUsername).set(true);
        }

        // Host client readiness coordinator
        if (this.isHost && room.status === "starting") {
          const humanPlayers = room.seats.filter(s => s && !s.isBot);
          const readyPlayers = Object.keys(room.readiness || {});
          
          if (readyPlayers.length === humanPlayers.length) {
            // All players initialized and ready! Start the match officially
            const serialized = window.bkGame.serialize();
            this.lastActionId = "start_" + Math.random().toString(36).substring(2, 11);
            
            this.roomRef.update({
              status: "playing",
              gameState: serialized,
              lastAction: {
                type: "start",
                actionId: this.lastActionId,
                timestamp: firebase.database.ServerValue.TIMESTAMP
              }
            });
          }
        }
      }

      // 4. Gameplay Action Synchronizer
      if (room.status === "playing" && room.lastAction && room.lastAction.actionId !== this.lastActionId) {
        this.lastActionId = room.lastAction.actionId;
        
        if (room.lastAction.type === "roll") {
          // Animate only if it's not our local roll (which was already animated)
          if (room.lastAction.player !== window.bkGame.currentTurn || room.lastAction.playerObjUsername !== this.currentUser.username) {
            window.bkAnimateOnlineRoll(room.lastAction.value, room.lastAction.player);
          } else {
            // It is our local roll, sync the game state just in case
            window.bkSyncGameState(room.gameState);
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

      // Transition to starting gate phase
      await this.roomRef.update({
        status: "starting",
        seats: mappedCustom,
        playerCount: sortedPlayers.length,
        readiness: {}
      });
    } catch (e) {
      alert("Failed to start match: " + e.message);
    }
  }

  sendRollAction() {
    return new Promise((resolve, reject) => {
      if (!this.roomRef) {
        reject(new Error("No room active"));
        return;
      }
      
      const myUsername = this.currentUser.username;
      let rolledValue = null;

      this.roomRef.transaction((room) => {
        if (!room || room.status !== "playing") return room;
        if (!room.gameState) return room;

        const tempGame = new BarakattaGame(room.gameState.mode, room.gameState.playerCount);
        tempGame.deserialize(room.gameState);

        const activePlayerId = tempGame.currentTurn;
        const activePlayerObj = tempGame.players[activePlayerId];
        if (!activePlayerObj || activePlayerObj.username !== myUsername) {
          return; // Abort
        }

        if (tempGame.rollState !== "idle") {
          return; // Abort
        }

        rolledValue = tempGame.generatePityRoll(activePlayerId);
        tempGame.diceValue = rolledValue;
        tempGame.rollState = "rolled";

        room.gameState = tempGame.serialize();
        room.lastAction = {
          type: "roll",
          value: rolledValue,
          player: activePlayerId,
          playerObjUsername: myUsername,
          actionId: "roll_" + Math.random().toString(36).substring(2, 11),
          timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        return room;
      }, (error, committed, snapshot) => {
        if (error) {
          reject(error);
        } else if (!committed) {
          reject(new Error("Transaction aborted or conflict occurred."));
        } else {
          resolve(rolledValue);
        }
      });
    });
  }

  sendMoveAction(actionData) {
    return new Promise((resolve, reject) => {
      if (!this.roomRef) {
        reject(new Error("No room active"));
        return;
      }
      
      const myUsername = this.currentUser.username;
      let actionSummary = "";

      this.roomRef.transaction((room) => {
        if (!room || room.status !== "playing") return room;
        if (!room.gameState) return room;

        const tempGame = new BarakattaGame(room.gameState.mode, room.gameState.playerCount);
        tempGame.deserialize(room.gameState);

        const activePlayerId = tempGame.currentTurn;
        const activePlayerObj = tempGame.players[activePlayerId];
        if (!activePlayerObj || activePlayerObj.username !== myUsername) {
          return; // Abort
        }

        const actions = tempGame.getLegalActions(activePlayerId, tempGame.diceValue);
        const confirmAction = actions.find(act => {
          if (act.type !== actionData.type) return false;
          if (act.type === "MOVE_ROCK") return act.rockId === actionData.rockId;
          return true;
        });
        
        if (!confirmAction) {
          return; // Abort
        }

        actionSummary = tempGame.executeAction(activePlayerId, confirmAction);
        
        if (tempGame.status === "in_progress") {
          tempGame.nextTurn();
        }

        room.gameState = tempGame.serialize();
        room.lastAction = {
          type: "move",
          summary: actionSummary || "",
          player: activePlayerId,
          actionId: "move_" + Math.random().toString(36).substring(2, 11),
          timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        return room;
      }, (error, committed, snapshot) => {
        if (error) {
          reject(error);
        } else if (!committed) {
          reject(new Error("Transaction aborted or conflict occurred."));
        } else {
          resolve(actionSummary);
        }
      });
    });
  }

  sendPassAction() {
    return new Promise((resolve, reject) => {
      if (!this.roomRef) {
        reject(new Error("No room active"));
        return;
      }
      
      const myUsername = this.currentUser.username;

      this.roomRef.transaction((room) => {
        if (!room || room.status !== "playing") return room;
        if (!room.gameState) return room;

        const tempGame = new BarakattaGame(room.gameState.mode, room.gameState.playerCount);
        tempGame.deserialize(room.gameState);

        const activePlayerId = tempGame.currentTurn;
        const activePlayerObj = tempGame.players[activePlayerId];
        if (!activePlayerObj || activePlayerObj.username !== myUsername) {
          return; // Abort
        }

        if (tempGame.rollState !== "rolled") {
          return; // Abort
        }

        tempGame.executeAction(activePlayerId, { type: "PASS" });
        
        if (tempGame.status === "in_progress") {
          tempGame.nextTurn();
        }

        room.gameState = tempGame.serialize();
        room.lastAction = {
          type: "pass",
          player: activePlayerId,
          actionId: "pass_" + Math.random().toString(36).substring(2, 11),
          timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        return room;
      }, (error, committed, snapshot) => {
        if (error) {
          reject(error);
        } else if (!committed) {
          reject(new Error("Transaction aborted or conflict occurred."));
        } else {
          resolve();
        }
      });
    });
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
