// Star Greetings - UI Rendering and Event Orchestration (Round-Table Overhaul)
document.addEventListener("DOMContentLoaded", () => {
  // Preset Avatars Array
  const AVATARS = [
    "assets/avatars/avatar_1.png",
    "assets/avatars/avatar_2.png",
    "assets/avatars/avatar_3.png",
    "assets/avatars/avatar_4.png",
    "assets/avatars/avatar_5.png",
    "assets/avatars/avatar_6.png"
  ];

  // Setup elements
  const setupScreen = document.getElementById("setup-screen");
  const gameScreen = document.getElementById("game-screen");
  const endScreen = document.getElementById("end-screen");
  const playersContainer = document.getElementById("players-setup-container");
  const addPlayerBtn = document.getElementById("add-player-btn");
  const startGameBtn = document.getElementById("start-game-btn");
  const startingStackInput = document.getElementById("starting-stack");

  // Round Table HUD & Elements
  const hudRoundNum = document.getElementById("hud-round-num");
  const hudBetAmt = document.getElementById("hud-bet-amt");
  const hudActivePlayerName = document.getElementById("hud-active-player-name");
  const potCountLbl = document.getElementById("pot-count-lbl");
  const potCardsContainer = document.getElementById("pot-cards-container");
  const seatsContainer = document.getElementById("seats-container");
  const scoreboardList = document.getElementById("scoreboard-list");
  const gameLogList = document.getElementById("game-log-list");
  const endGameBtn = document.getElementById("end-game-btn");

  // Side Drawer Elements
  const sideDrawer = document.getElementById("side-drawer");
  const drawerToggleBtn = document.getElementById("drawer-toggle-btn");
  const fullscreenBtn = document.getElementById("fullscreen-btn");
  const narratorToggleBtn = document.getElementById("narrator-toggle-btn");
  const drawerCloseBtn = document.getElementById("drawer-close-btn");

  // Private Hand Modal elements
  const privateHandModal = document.getElementById("private-hand-modal");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const modalHandContainer = document.getElementById("modal-hand-container");

  // Pass-and-play Shield overlay
  const shieldOverlay = document.getElementById("shield-overlay");
  const shieldPlayerName = document.getElementById("shield-player-name");
  const shieldReadyBtn = document.getElementById("shield-ready-btn");

  // End screen elements
  const finalStandingsList = document.getElementById("final-standings-list");
  const restartGameBtn = document.getElementById("restart-game-btn");

  // Game instances
  let game = new GameState();
  let maxPlayers = 6;
  let minPlayers = 1;
  let playerInputCount = 2; // Default starting count of player input fields (1 Human + 1 Bot)

  // Store avatar selection state per row index (1-based)
  let playerAvatars = {};
  // Store player type selection state per row index (1-based)
  let playerTypes = {};

  // Synthesize a celebratory victory fanfare using the Web Audio API
  function playVictorySound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      const playTone = (delay, pitch, duration, type = 'sine', gainVal = 0.12) => {
        setTimeout(() => {
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          oscillator.type = type;
          oscillator.frequency.setValueAtTime(pitch, audioCtx.currentTime);
          
          // Add a slight frequency vibrato/swell for the final note
          if (delay >= 360) {
            oscillator.frequency.exponentialRampToValueAtTime(pitch * 1.015, audioCtx.currentTime + 0.05);
            oscillator.frequency.exponentialRampToValueAtTime(pitch, audioCtx.currentTime + 0.1);
            oscillator.frequency.exponentialRampToValueAtTime(pitch * 1.015, audioCtx.currentTime + 0.15);
            oscillator.frequency.exponentialRampToValueAtTime(pitch, audioCtx.currentTime + 0.2);
          }
          
          gainNode.gain.setValueAtTime(gainVal, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
          
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + duration + 0.02);
        }, delay);
      };

      // Play rising arpeggio chord (C major triad ending on high C)
      playTone(0, 523.25, 0.15, 'triangle', 0.12);     // C5
      playTone(120, 659.25, 0.15, 'triangle', 0.12);   // E5
      playTone(240, 783.99, 0.15, 'triangle', 0.12);   // G5
      playTone(360, 1046.50, 0.8, 'sine', 0.15);       // C6 (Triumphant peak note)
    } catch (e) {
      console.warn("AudioContext playback blocked or failed:", e);
    }
  }

  // Synthesize a clean, satisfying touch sound using the Web Audio API
  function playTouchSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // Smooth sine wave
      oscillator.type = 'sine';
      
      // Quick pitch drop (chime)
      oscillator.frequency.setValueAtTime(750, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(250, audioCtx.currentTime + 0.08);
      
      // Fast fade out
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.08);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn("AudioContext playback blocked or failed:", e);
    }
  }

  // Synthesize a quick high-pitched click for avatar cycling
  function playCycleSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1100, audioCtx.currentTime + 0.05); // upward sweep
      
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.06);
    } catch (e) {}
  }

  // Synthesize a gentle sweep pop sound when player clicks "Ready"
  function playReadySound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'triangle'; // softer tone
      oscillator.frequency.setValueAtTime(260, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(520, audioCtx.currentTime + 0.12);
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.14);
    } catch (e) {}
  }

  // Synthesize a metallic coin chime merge sound using Web Audio API
  function playCoinMergeSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      const playChime = (delay, pitch, gainVal) => {
        setTimeout(() => {
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(pitch, audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(pitch * 1.5, audioCtx.currentTime + 0.15);
          
          gainNode.gain.setValueAtTime(gainVal, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
          
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.16);
        }, delay);
      };

      playChime(0, 987.77, 0.08); // B5
      playChime(80, 1318.51, 0.08); // E6
      playChime(160, 1567.98, 0.08); // G6
      playChime(240, 1975.53, 0.06); // B6
      playChime(320, 2637.02, 0.04); // E7
    } catch (e) {}
  }

  // Synthesize a card shuffling sound using the Web Audio API
  function playShuffleSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Play 8 rapid click/rustle sweeps to mimic shuffling cards
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          // Noise-like triangle/sine waves
          oscillator.type = i % 2 === 0 ? 'triangle' : 'sine';
          
          const startFreq = 200 + Math.random() * 400;
          oscillator.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.05);
          
          gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
          
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.06);
        }, i * 60);
      }
    } catch (e) {}
  }

  // Trigger coin merging flying animation from all player avatars to the center pot
  function triggerCoinMergeAnimation() {
    const potFelt = document.querySelector(".pot-felt-ring");
    if (!potFelt) return;

    const potRect = potFelt.getBoundingClientRect();
    const centerX = potRect.left + potRect.width / 2;
    const centerY = potRect.top + potRect.height / 2;

    // Calculate total coins being merged
    const activePlayers = game.players.filter(player => {
      const seatEl = document.querySelector(`.player-seat[data-player-id="${player.id}"]`);
      return seatEl && !seatEl.classList.contains("eliminated-seat");
    });
    const totalCoins = activePlayers.length * game.matchBet;

    // Create total merging coins badge in center pot area
    const potCenter = document.querySelector(".pot-center-area");
    if (potCenter && totalCoins > 0) {
      const badge = document.createElement("div");
      badge.className = "merging-coins-badge";
      badge.innerHTML = `<span>🪙</span> <strong>${totalCoins}</strong>`;
      potCenter.appendChild(badge);
      
      // Animate it in after a small delay (when coins fly)
      setTimeout(() => {
        badge.classList.add("show");
      }, 300);

      // Fade it out before the turn shield pops up
      setTimeout(() => {
        badge.classList.remove("show");
        setTimeout(() => {
          badge.remove();
        }, 500);
      }, 1300);
    }

    game.players.forEach(player => {
      const seatEl = document.querySelector(`.player-seat[data-player-id="${player.id}"]`);
      if (!seatEl || seatEl.classList.contains("eliminated-seat")) return;

      const avatarEl = seatEl.querySelector(".player-avatar-wrapper");
      if (!avatarEl) return;

      const avatarRect = avatarEl.getBoundingClientRect();
      const startX = avatarRect.left + avatarRect.width / 2;
      const startY = avatarRect.top + avatarRect.height / 2;

      // Spawn 3 coins per player with staggered delays
      for (let i = 0; i < 3; i++) {
        const coin = document.createElement("div");
        coin.className = "flying-coin-element";
        coin.innerHTML = "🪙";
        coin.style.left = `${startX - 15}px`;
        coin.style.top = `${startY - 15}px`;
        coin.style.transform = "scale(0) rotate(0deg)";
        coin.style.opacity = "0";
        document.body.appendChild(coin);

        const delay = i * 150;
        
        setTimeout(() => {
          coin.style.opacity = "1";
          coin.style.transform = `scale(1.2) rotate(${Math.random() * 360}deg)`;
          
          setTimeout(() => {
            coin.style.left = `${centerX - 15}px`;
            coin.style.top = `${centerY - 15}px`;
            coin.style.transform = `scale(0.8) rotate(${Math.random() * 720}deg)`;
            
            setTimeout(() => {
              coin.style.opacity = "0";
              coin.style.transform = "scale(0) rotate(0deg)";
              setTimeout(() => {
                coin.remove();
              }, 300);
            }, 750);
          }, 150);
        }, delay);
      }
    });

    // Play coin clink sound exactly when coins begin merging in the center
    setTimeout(() => {
      playCoinMergeSound();
    }, 400);
  }

  // Create card DOM element with fallback placeholder support
  function createCardElement(card, isClickable = false, onClickHandler = null, ownerId = null) {
    const cardEl = document.createElement("div");
    cardEl.className = `star-card ${card.industry.toLowerCase()}`;
    
    const activeOwnerId = ownerId !== null ? ownerId : card.playedBy;
    if (activeOwnerId !== null && activeOwnerId !== undefined) {
      cardEl.classList.add(`player-card-color-${activeOwnerId}`);
    }
    
    cardEl.dataset.instanceId = card.instanceId;

    // Get initials of star
    const initials = card.name
      .split(" ")
      .map(n => n[0])
      .slice(0, 3)
      .join("");

    // Setup HTML with image and a fallback placeholder
    cardEl.innerHTML = `
      <div class="card-inner">
        <div class="card-image-area">
          <img class="card-img" src="${card.imagePath}?v=1.36.2" alt="${card.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="card-fallback-placeholder">
            <span class="card-initials">${initials}</span>
          </div>
        </div>
        <div class="card-info">
          <h3 class="card-name">${card.name}</h3>
          <div class="card-movie-name">${card.movie || ""}</div>
        </div>
      </div>
    `;

    if (isClickable && onClickHandler) {
      cardEl.classList.add("clickable");
      cardEl.addEventListener("click", (e) => {
        e.stopPropagation();
        onClickHandler(card.instanceId);
      });
    }

    return cardEl;
  }

  // Create card back DOM element
  function createCardBackElement(ownerId = null) {
    const cardEl = document.createElement("div");
    cardEl.className = `star-card card-back`;
    if (ownerId !== null && ownerId !== undefined) {
      cardEl.classList.add(`player-card-color-${ownerId}`);
    }
    cardEl.innerHTML = `
      <div class="card-inner">
        <div class="card-logo">★</div>
        <div class="card-logo-text">Star</div>
      </div>
    `;
    return cardEl;
  }

  // Generate dynamic player input fields
  function renderPlayerSetupFields() {
    playersContainer.innerHTML = "";
    const defaultNames = ["Allu", "Ranbir", "Zendaya", "Prabhas", "Alia", "Holland"];
    
    for (let i = 1; i <= playerInputCount; i++) {
      const fieldRow = document.createElement("div");
      fieldRow.className = "player-setup-row";
      
      // Default player type assignment: all players default to human
      if (playerTypes[i] === undefined) {
        playerTypes[i] = "human";
      }
      
      let defaultVal = defaultNames[i - 1] || `Player ${i}`;
      if (playerTypes[i] === "bot") {
        defaultVal = `Bot ${defaultNames[i - 1] || i}`;
      }
      
      // Default avatar assignment
      const currentAvatarIdx = (i - 1) % AVATARS.length;
      if (playerAvatars[i] === undefined) {
        playerAvatars[i] = currentAvatarIdx;
      }
      
      fieldRow.innerHTML = `
        <label for="player-name-${i}">Player ${i}:</label>
        <div class="input-with-action">
          <!-- Avatar cycler button -->
          <button type="button" class="avatar-cycler-btn" id="avatar-btn-${i}" data-row="${i}">
            <img src="${AVATARS[playerAvatars[i]]}" id="avatar-img-${i}" alt="Avatar">
            <span class="avatar-cycler-badge">Cycle</span>
          </button>
          
          <div class="input-row-main">
            <div style="display: flex; gap: 8px; width: 100%;">
              <input type="text" id="player-name-${i}" class="player-name-input" value="${defaultVal}" placeholder="Enter Name" maxlength="15" required style="flex: 1;">
              ${i > 1 ? `<button type="button" class="player-type-toggle-btn ${playerTypes[i] === "bot" ? "bot" : ""}" id="type-toggle-btn-${i}" data-row="${i}">${playerTypes[i] === "bot" ? "🤖 Bot" : "👤 Human"}</button>` : ""}
            </div>
            
            <!-- Bet options selector -->
            <div class="player-bet-selector" id="bet-selector-${i}">
              <span class="bet-label">Bet:</span>
              <button type="button" class="bet-opt-btn active" data-val="25">25</button>
              <button type="button" class="bet-opt-btn" data-val="50">50</button>
              <button type="button" class="bet-opt-btn" data-val="75">75</button>
              <button type="button" class="bet-opt-btn" data-val="100">100</button>
            </div>
          </div>
          
          ${i > minPlayers ? `<button type="button" class="remove-player-btn" data-index="${i}">&times;</button>` : ""}
        </div>
      `;
      playersContainer.appendChild(fieldRow);
      
      // Attach cycle event listener to the avatar button
      const avatarBtn = document.getElementById(`avatar-btn-${i}`);
      avatarBtn.addEventListener("click", () => {
        cycleAvatar(i);
      });

      // Attach click listener to type toggle button (only Player 2 and up)
      if (i > 1) {
        const typeToggleBtn = document.getElementById(`type-toggle-btn-${i}`);
        typeToggleBtn.addEventListener("click", () => {
          playTouchSound();
          const nameInput = document.getElementById(`player-name-${i}`);
          if (playerTypes[i] === "bot") {
            playerTypes[i] = "human";
            typeToggleBtn.textContent = "👤 Human";
            typeToggleBtn.classList.remove("bot");
            if (nameInput.value === `Bot ${defaultNames[i - 1] || i}`) {
              nameInput.value = defaultNames[i - 1] || `Player ${i}`;
            }
          } else {
            playerTypes[i] = "bot";
            typeToggleBtn.textContent = "🤖 Bot";
            typeToggleBtn.classList.add("bot");
            if (nameInput.value === (defaultNames[i - 1] || `Player ${i}`)) {
              nameInput.value = `Bot ${defaultNames[i - 1] || i}`;
            }
          }
        });
      }

      // Attach click listeners to bet buttons
      const betSelector = document.getElementById(`bet-selector-${i}`);
      const betBtns = betSelector.querySelectorAll(".bet-opt-btn");
      betBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          betBtns.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          playCycleSound();
        });
      });
    }

    // Attach listeners for remove buttons
    document.querySelectorAll(".remove-player-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idxToRemove = parseInt(e.target.dataset.index);
        removePlayerField(idxToRemove);
      });
    });

    // Toggle add player button availability
    if (playerInputCount >= maxPlayers) {
      addPlayerBtn.style.display = "none";
    } else {
      addPlayerBtn.style.display = "inline-flex";
    }
  }

  function cycleAvatar(rowIdx) {
    playCycleSound();
    playerAvatars[rowIdx] = (playerAvatars[rowIdx] + 1) % AVATARS.length;
    const img = document.getElementById(`avatar-img-${rowIdx}`);
    if (img) {
      img.src = AVATARS[playerAvatars[rowIdx]];
    }
  }

  function addPlayerField() {
    if (playerInputCount < maxPlayers) {
      playerInputCount++;
      renderPlayerSetupFields();
    }
  }

  function removePlayerField(index) {
    if (playerInputCount > minPlayers) {
      const currentValues = [];
      const currentSelectedAvatars = [];
      const currentSelectedTypes = [];
      for (let i = 1; i <= playerInputCount; i++) {
        if (i !== index) {
          const inputVal = document.getElementById(`player-name-${i}`).value;
          currentValues.push(inputVal);
          currentSelectedAvatars.push(playerAvatars[i]);
          currentSelectedTypes.push(playerTypes[i] || "human");
        }
      }
      
      playerInputCount--;
      
      // Re-map avatars and types
      playerAvatars = {};
      playerTypes = {};
      currentSelectedAvatars.forEach((avatarIdx, idx) => {
        playerAvatars[idx + 1] = avatarIdx;
      });
      currentSelectedTypes.forEach((typeVal, idx) => {
        playerTypes[idx + 1] = typeVal;
      });

      renderPlayerSetupFields();

      // Restore remaining names
      for (let i = 1; i <= playerInputCount; i++) {
        document.getElementById(`player-name-${i}`).value = currentValues[i - 1] || "";
      }
    }
  }

  // Seating arrangement calculations (math to place players in a circle)
  function positionSeats() {
    const seats = document.querySelectorAll(".player-seat");
    if (seats.length === 0) return;
    
    const total = seats.length;
    const wrapper = document.querySelector(".table-surface-wrapper");
    if (!wrapper) return;
    
    const rect = wrapper.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const isMobile = window.innerWidth <= 640;
    const isTablet = window.innerWidth <= 1024 && window.innerWidth > 640;
    
    let baseRadius = 290; // Desktop default
    if (isMobile) {
      baseRadius = 145;
    } else if (isTablet) {
      baseRadius = 210;
    }
    
    // Angle offset so the active player is positioned nicely, or just start top/bottom.
    // For 2 players: 180 degrees apart. Let's place them at top (270 deg) and bottom (90 deg).
    const angleStart = -Math.PI / 2; // -90 deg (top center)
    
    seats.forEach((seat, index) => {
      const playerId = parseInt(seat.dataset.playerId);
      const playerObj = game.players.find(p => p.id === playerId);
      
      const angleOffset = playerObj ? (playerObj.angleOffset || 0) : 0;
      const theta = angleStart + (index * (2 * Math.PI / total)) + angleOffset;
      
      const offset = playerObj ? (playerObj.radiusOffset || 0) : 0;
      const radius = baseRadius + offset;
      
      const x = centerX + radius * Math.cos(theta);
      const y = centerY + radius * Math.sin(theta);
      
      seat.style.setProperty("--x", `${x}px`);
      seat.style.setProperty("--y", `${y}px`);
    });
  }

  // Listen for window resize to keep seats centered
  window.addEventListener("resize", positionSeats);

  // Render Seated Players
  function renderSeats() {
    seatsContainer.innerHTML = "";
    const activePlayer = game.getCurrentPlayer();
    
    game.players.forEach(p => {
      const seat = document.createElement("div");
      seat.className = `player-seat player-color-${p.id}`;
      seat.dataset.playerId = p.id;
      
      const isActive = activePlayer && p.id === activePlayer.id;
      const isEliminated = p.stackCount === 0;
      
      if (isActive) seat.classList.add("active-turn-seat");
      if (isEliminated) seat.classList.add("eliminated-seat");
      
      // Determine Stack Thickness class
      let thicknessClass = "stack-thin";
      if (p.stackCount > 6) {
        thicknessClass = "stack-thick";
      } else if (p.stackCount > 3) {
        thicknessClass = "stack-medium";
      }
      seat.classList.add(thicknessClass);

      const statusSymbol = (window.playerStatusIndicators && window.playerStatusIndicators[p.id]) || "";

      // Setup Seat layout
      seat.innerHTML = `
        <div class="player-avatar-wrapper">
          <img src="${p.avatar}" alt="${p.name}" draggable="false">
          ${isActive ? `<span class="player-seat-active-badge">Playing</span>` : ""}
          ${p.id === game.currentPotStarterIndex ? `<span class="player-seat-starter-badge" title="Starter (Played First)">⭐ Starter</span>` : ""}
          ${statusSymbol ? `<span class="player-status-badge">${statusSymbol}</span>` : ""}
        </div>
        <div class="player-seat-info">
          <span class="player-seat-name">${p.name} ${p.isBot ? '🤖' : ''}</span>
          <span class="player-seat-count">${p.stackCount} cards | 🪙${p.coins}</span>
          <div class="seat-adjust-controls">
            <button type="button" class="btn-adjust move-front-btn" data-player-id="${p.id}" title="Move Front (Closer)">▲</button>
            <button type="button" class="btn-adjust move-back-btn" data-player-id="${p.id}" title="Move Back (Further)">▼</button>
          </div>
        </div>
        <div class="player-seat-stack" id="stack-pile-${p.id}">
          <!-- Top Card or Buy Overlay goes here -->
        </div>
      `;
      
      seatsContainer.appendChild(seat);

      // Render top card of stack or Out overlay
      const pile = document.getElementById(`stack-pile-${p.id}`);
      if (!isEliminated) {
        const isCardSelectable = window.isOnlineGame 
          ? (p.username && window.auth.getCurrentUser() && p.username.toLowerCase().trim() === window.auth.getCurrentUser().username.toLowerCase().trim() && p.id === activePlayer.id)
          : (p.id === activePlayer.id && !p.isBot);

        if (isCardSelectable) {
          // ACTIVE player sees top card face-up
          // Clicking the card itself always plays it directly to the middle (top card of their stack)
          const topCard = p.stack[0];
          const cardEl = createCardElement(topCard, true, handleCardSelection, p.id);
          pile.appendChild(cardEl);
          
          // Add shuffle button if player has multiple cards
          if (p.stackCount > 1) {
            const actionOverlay = document.createElement("div");
            actionOverlay.className = "stack-action-overlay";
            actionOverlay.style.display = "flex";
            actionOverlay.style.flexDirection = "column";
            actionOverlay.style.gap = "4px";
            
            actionOverlay.innerHTML = `<button type="button" class="btn secondary-btn" id="shuffle-btn-${p.id}" style="padding: 4px 8px; font-size: 0.75rem;">🔀 Shuffle</button>`;
            seat.appendChild(actionOverlay);
            
            document.getElementById(`shuffle-btn-${p.id}`).addEventListener("click", (e) => {
              e.stopPropagation();
              if (!window.isOnlineGame) {
                playShuffleSound();
              }
              if (window.isOnlineGame) {
                window.multiplayer.shuffleStack();
              } else {
                game.shuffleStack(p.id);
                renderSeats();
                renderLogs();
              }
            });
          }
        } else {
          // NON-ACTIVE players see card face-down
          const cardEl = createCardBackElement(p.id);
          pile.appendChild(cardEl);
        }
      } else {
        // Render WINNER overlay when a player reaches 0 cards
        const buyOverlay = document.createElement("div");
        buyOverlay.className = "buy-stack-overlay";
        buyOverlay.innerHTML = `
          <div class="buy-overlay-title" style="color: #10b981; text-shadow: 0 0 10px rgba(16, 185, 129, 0.4);">WINNER!</div>
          <div class="buy-overlay-sub" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px; font-weight: normal;">0 Greetings!</div>
        `;
        pile.appendChild(buyOverlay);
      }
    });

    // Attach listeners to buy buttons in seats container
    seatsContainer.querySelectorAll(".buy-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const playerId = parseInt(btn.dataset.playerId);
        
        // Prevent clicking buy buttons on another player's seat during online matches
        const playerObj = game.players.find(p => p.id === playerId);
        if (window.isOnlineGame && playerObj && 
            (!playerObj.username || !window.auth.getCurrentUser() || 
             playerObj.username.toLowerCase().trim() !== window.auth.getCurrentUser().username.toLowerCase().trim())) {
          return;
        }

        if (btn.classList.contains("free-buy-btn") || btn.classList.contains("coin-buy-btn")) {
          if (window.isOnlineGame) {
            window.multiplayer.buyStack();
          } else {
            const res = game.buyStack(playerId);
            if (res.success) {
              playReadySound();
              renderSeats();
              renderScoreboard();
              renderLogs();
              
              // Update HUD elements
              const activePlayer = game.getCurrentPlayer();
              if (activePlayer) {
                hudActivePlayerName.textContent = activePlayer.name;
                hudRoundNum.textContent = game.roundNumber;
              }
            } else {
              alert(res.error);
            }
          }
        } else if (btn.classList.contains("broke-buy-btn")) {
          if (window.isOnlineGame) {
            window.multiplayer.buyCoins();
          } else {
            game.buyCoins(playerId);
            playReadySound();
            renderSeats();
            renderScoreboard();
            renderLogs();
          }
        }
      });
    });

    // Align coordinates
    positionSeats();
  }

  // Render Scoreboard list inside Side Drawer
  function renderScoreboard() {
    scoreboardList.innerHTML = "";
    const activePlayer = game.getCurrentPlayer();
    
    // Sort players by stackCount ascending (fewer cards closer to winning)
    const scores = [...game.players].sort((a, b) => a.stackCount - b.stackCount);
    
    scores.forEach((p, idx) => {
      const item = document.createElement("li");
      item.className = "score-item";
      if (activePlayer && p.id === activePlayer.id) {
        item.classList.add("active-turn");
      }
      
      let badge = "";
      if (idx === 0) badge = "👑 ";
      
      item.innerHTML = `
        <span class="score-player-name">${badge}${p.name}</span>
        <span class="score-player-cards">${p.stackCount} cards | 🪙${p.coins}</span>
      `;
      scoreboardList.appendChild(item);
    });
  }

  // Render Logs inside Side Drawer
  function renderLogs() {
    gameLogList.innerHTML = "";
    game.logs.forEach(log => {
      const logItem = document.createElement("div");
      logItem.className = "log-item";
      
      if (log.message.includes("won")) {
        logItem.classList.add("log-win");
      } else if (log.message.includes("started")) {
        logItem.classList.add("log-system");
      }

      logItem.innerHTML = `
        <span class="log-time">[${log.timestamp}]</span>
        <span class="log-text">${log.message}</span>
      `;
      gameLogList.appendChild(logItem);
    });
  }

  // Render Pot Cards Center scattered pile or Near Seated Player piles
  function renderPot() {
    potCardsContainer.innerHTML = "";
    potCountLbl.textContent = `${game.pot.length} Cards`;
    
    if (game.pot.length === 0) {
      potCountLbl.textContent = "Empty";
      return;
    }

    game.pot.forEach((card, idx) => {
      const cardEl = createCardElement(card);
      
      if (game.config.CARD_PLACEMENT_MODE === 'near' && card.playedBy !== undefined && card.playedBy !== null) {
        const total = game.players.length;
        const playerObj = game.players.find(p => p.id === card.playedBy);
        const angleOffset = playerObj ? (playerObj.angleOffset || 0) : 0;
        const theta = -Math.PI / 2 + (card.playedBy * (2 * Math.PI / total)) + angleOffset;
        
        const isMobile = window.innerWidth <= 640;
        const isTablet = window.innerWidth <= 1024 && window.innerWidth > 640;
        
        let radius = 150;
        if (isMobile) radius = 80;
        else if (isTablet) radius = 110;
        
        const seedAngle = (idx * 15) % 30 - 15;
        const seedX = (idx * 6) % 10 - 5;
        const seedY = (idx * 6) % 10 - 5;
        
        cardEl.style.left = `${20 + radius * Math.cos(theta) + seedX}px`;
        cardEl.style.top = `${28 + radius * Math.sin(theta) + seedY}px`;
        cardEl.style.transform = `rotate(${seedAngle}deg)`;
      } else {
        // Middle pot (centered)
        const seedAngle = (idx * 37) % 40 - 20; // -20deg to 20deg
        const seedX = (idx * 53) % 24 - 12; // -12px to 12px
        const seedY = (idx * 29) % 24 - 12; // -12px to 12px
        
        cardEl.style.left = `${20 + seedX}px`;
        cardEl.style.top = `${28 + seedY}px`;
        cardEl.style.transform = `rotate(${seedAngle}deg)`;
      }
      
      cardEl.style.zIndex = idx + 1;
      potCardsContainer.appendChild(cardEl);
    });
  }

  // Reposition pot cards near a specific player in real time during drag
  function updateNearPotPositions(playerId) {
    if (game.config.CARD_PLACEMENT_MODE !== 'near') return;
    const playerObj = game.players.find(p => p.id === playerId);
    if (!playerObj) return;
    
    const total = game.players.length;
    const angleOffset = playerObj.angleOffset || 0;
    const theta = -Math.PI / 2 + (playerId * (2 * Math.PI / total)) + angleOffset;
    
    const isMobile = window.innerWidth <= 640;
    const isTablet = window.innerWidth <= 1024 && window.innerWidth > 640;
    
    let radius = 150;
    if (isMobile) radius = 80;
    else if (isTablet) radius = 110;
    
    const cards = potCardsContainer.querySelectorAll(".star-card");
    game.pot.forEach((card, idx) => {
      if (card.playedBy === playerId) {
        const cardEl = cards[idx];
        if (cardEl) {
          const seedX = (idx * 6) % 10 - 5;
          const seedY = (idx * 6) % 10 - 5;
          cardEl.style.left = `${20 + radius * Math.cos(theta) + seedX}px`;
          cardEl.style.top = `${28 + radius * Math.sin(theta) + seedY}px`;
        }
      }
    });
  }

  // Show pass-and-play screen overlay
  function showTurnShield(nextPlayer) {
    shieldPlayerName.textContent = nextPlayer.name;
    shieldOverlay.classList.remove("hidden");
    shieldOverlay.style.display = "flex";
  }

  // Hide turn shield and show active player's screen
  function hideTurnShield() {
    shieldOverlay.classList.add("hidden");
    shieldOverlay.style.display = "none";
    
    // Start tracking turn time when Turn Shield is hidden
    window.lastTurnStartTime = Date.now();
    
    // Update active player's HUD
    const activePlayer = game.getCurrentPlayer();
    hudActivePlayerName.textContent = activePlayer.name;
    hudRoundNum.textContent = game.roundNumber;
    if (hudBetAmt) {
      hudBetAmt.textContent = `🪙${game.matchBet}`;
    }
    
    renderSeats();
    renderPot();
    renderScoreboard();
    renderLogs();
  }

  // Private Hand Modal (Strategic Selection)
  function openPrivateHandModal() {
    const activePlayer = game.getCurrentPlayer();
    if (!activePlayer) return;
    
    modalHandContainer.innerHTML = "";
    
    // Sort hand by industry, then by name
    const sortedStack = [...activePlayer.stack].sort((a, b) => {
      if (a.industry !== b.industry) {
        return a.industry.localeCompare(b.industry);
      }
      return a.name.localeCompare(b.name);
    });

    sortedStack.forEach(card => {
      const cardEl = createCardElement(card, true, (cardInstanceId) => {
        closePrivateHandModal();
        handleCardSelection(cardInstanceId);
      }, activePlayer.id);
      modalHandContainer.appendChild(cardEl);
    });

    privateHandModal.classList.remove("hidden");
    privateHandModal.style.display = "flex";
  }

  function closePrivateHandModal() {
    privateHandModal.classList.add("hidden");
    privateHandModal.style.display = "none";
  }

  // Handle playing a card from player's selection
  function handleCardSelection(cardInstanceId) {
    if (!window.isOnlineGame) {
      const activePlayer = game.getCurrentPlayer();
      if (activePlayer && activePlayer.isBot) {
        console.warn("Input blocked: bot turn in progress.");
        return;
      }
      playTouchSound();

      // Strategic AI Bot mode bluffing check
      if (window.themeSelectMode === "ai_bot" && !game.config.FORCED_TOP_DRAW) {
        const cardToPlay = activePlayer.stack.find(c => c.instanceId === cardInstanceId);
        const topCardPot = game.pot[game.pot.length - 1];
        if (topCardPot && cardToPlay && cardToPlay.id !== topCardPot.id) {
          window.pendingCardInstanceId = cardInstanceId;
          const bluffChoiceModal = document.getElementById("bluff-choice-modal");
          if (bluffChoiceModal) {
            bluffChoiceModal.classList.remove("hidden");
            bluffChoiceModal.style.display = "flex";
          }
          return;
        }
      }
    }
    if (window.isOnlineGame) {
      window.multiplayer.playCard(cardInstanceId);
    } else {
      executePlay(cardInstanceId);
    }
  }

  // Play execution and fly to pot animation
  function executePlay(cardInstanceId = null) {
    const activePlayer = game.getCurrentPlayer();
    
    let cardToAnimate = null;
    if (game.config.FORCED_TOP_DRAW || cardInstanceId === null) {
      cardToAnimate = activePlayer.stack[0];
    } else {
      cardToAnimate = activePlayer.stack.find(c => c.instanceId === cardInstanceId);
    }

    if (!cardToAnimate) {
      console.error("No card to play!");
      return;
    }

    if (!window.revealedCardsInMatch) {
      window.revealedCardsInMatch = [];
    }
    window.revealedCardsInMatch.push(cardToAnimate.id);

    // Call game engine
    const outcome = game.playCard(cardInstanceId);

    if (outcome.error) {
      alert(outcome.error);
      return;
    }

    // 🎵 START VICTORY MUSIC IMMEDIATELY (synchronous — still inside user gesture)
    // Must be called HERE, not inside setTimeout, or Chrome will block autoplay.
    if (outcome.hasMatch && outcome.playedCard && outcome.playedCard.id) {
      if (window.VictoryMusic) {
        window.VictoryMusic.play(outcome.playedCard.id);
      }
      window.lastRoundWinnerStarId = outcome.playedCard.id;
      window.lastRoundWinnerPlayerIndex = outcome.playerIndex;
    }

    if (!activePlayer.isBot) {
      const elapsed = Date.now() - (window.lastTurnStartTime || Date.now());
      if (!window.matchTurnTelemetry) window.matchTurnTelemetry = [];
      window.matchTurnTelemetry.push({
        timeMs: elapsed,
        bet: game.matchBet,
        isBluff: false,
        caught: false,
        win: outcome.hasMatch
      });
    }

    // --- ANIMATION: FLY CARD TO POT ---
    const floatCard = createCardElement(cardToAnimate, false, null, outcome.playerIndex);
    floatCard.classList.add("floating-card-anim");
    document.body.appendChild(floatCard);

    // Get origin seat element rect
    const originSeatDom = document.querySelector(`.player-seat[data-player-id="${outcome.playerIndex}"]`);
    const pileDom = originSeatDom ? originSeatDom.querySelector(".player-seat-stack") : null;
    const startRect = pileDom ? pileDom.getBoundingClientRect() : document.body.getBoundingClientRect();
    const targetRect = potCardsContainer.getBoundingClientRect();

    floatCard.style.position = "fixed";
    floatCard.style.top = `${startRect.top}px`;
    floatCard.style.left = `${startRect.left}px`;
    floatCard.style.width = `${startRect.width}px`;
    floatCard.style.height = `${startRect.height}px`;
    floatCard.style.margin = "0";
    floatCard.style.transition = "all 0.5s cubic-bezier(0.25, 1, 0.5, 1)";

    // Force reflow
    floatCard.getBoundingClientRect();

    // Calculate target coordinates based on placement mode
    let targetX, targetY;
    let targetRotation = (game.pot.length * 37) % 40 - 20;

    if (game.config.CARD_PLACEMENT_MODE === 'near') {
      const total = game.players.length;
      const playerObj = game.players.find(p => p.id === outcome.playerIndex);
      const angleOffset = playerObj ? (playerObj.angleOffset || 0) : 0;
      const theta = -Math.PI / 2 + (outcome.playerIndex * (2 * Math.PI / total)) + angleOffset;
      
      const wrapper = document.querySelector(".table-surface-wrapper");
      const rect = wrapper.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const isMobile = window.innerWidth <= 640;
      const isTablet = window.innerWidth <= 1024 && window.innerWidth > 640;
      
      let radius = 150;
      if (isMobile) radius = 80;
      else if (isTablet) radius = 110;
      
      targetX = centerX + radius * Math.cos(theta) - (startRect.width / 2);
      targetY = centerY + radius * Math.sin(theta) - (startRect.height / 2);
      targetRotation = (game.pot.length * 15) % 30 - 15;
    } else {
      targetX = targetRect.left + (targetRect.width / 2) - (startRect.width / 2);
      targetY = targetRect.top + (targetRect.height / 2) - (startRect.height / 2);
    }
    
    floatCard.style.top = `${targetY}px`;
    floatCard.style.left = `${targetX}px`;
    floatCard.style.transform = `rotate(${targetRotation}deg)`;

    setTimeout(() => {
      floatCard.remove();

      if (outcome.hasMatch) {
        // Temporarily add the played card to the visual pot DOM so it can be fanned and animated
        const tempCardEl = createCardElement(cardToAnimate, false, null, outcome.playerIndex);
        const idx = outcome.potBeforePlay.length + 1;
        
        if (game.config.CARD_PLACEMENT_MODE === 'near') {
          const total = game.players.length;
          const playerObj = game.players.find(p => p.id === outcome.playerIndex);
          const angleOffset = playerObj ? (playerObj.angleOffset || 0) : 0;
          const theta = -Math.PI / 2 + (outcome.playerIndex * (2 * Math.PI / total)) + angleOffset;
          
          const isMobile = window.innerWidth <= 640;
          const isTablet = window.innerWidth <= 1024 && window.innerWidth > 640;
          
          let radius = 150;
          if (isMobile) radius = 80;
          else if (isTablet) radius = 110;
          
          const seedAngle = (idx * 15) % 30 - 15;
          const seedX = (idx * 6) % 10 - 5;
          const seedY = (idx * 6) % 10 - 5;
          
          tempCardEl.style.left = `${20 + radius * Math.cos(theta) + seedX}px`;
          tempCardEl.style.top = `${28 + radius * Math.sin(theta) + seedY}px`;
          tempCardEl.style.transform = `rotate(${seedAngle}deg)`;
        } else {
          const seedAngle = (idx * 37) % 40 - 20;
          const seedX = (idx * 53) % 24 - 12;
          const seedY = (idx * 29) % 24 - 12;
          
          tempCardEl.style.left = `${20 + seedX}px`;
          tempCardEl.style.top = `${28 + seedY}px`;
          tempCardEl.style.transform = `rotate(${seedAngle}deg)`;
        }
        
        tempCardEl.style.zIndex = idx + 1;
        potCardsContainer.appendChild(tempCardEl);

        // Match win sequence: animate first, then update counts after flight
        if (window.themeSelectMode === "ai_bot") {
          triggerNarratorCommentary("round_win", { player: outcome.playerName, card: outcome.playedCard.name });
        }
        // 🎵 Victory Music was already started synchronously above (in user gesture).
        // No need to call again here — just trigger the win animation.
        triggerWinFlash(outcome);
      } else {
        // Standard turn transition
        renderPot();
        renderSeats();
        renderScoreboard();
        renderLogs();
        if (window.themeSelectMode === "ai_bot" && game.pot.length === 1) {
          triggerNarratorCommentary("round_start", { player: outcome.playerName });
        }
        proceedToNextTurn(outcome);
      }
    }, 500);
  }

  // Match victory animation with fly to winner
  function triggerWinFlash(outcome) {
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

    // Get winner's seat coordinate rect
    const winnerSeatDom = document.querySelector(`.player-seat[data-player-id="${outcome.playerIndex}"]`);
    const winnerPileDom = winnerSeatDom ? winnerSeatDom.querySelector(".player-seat-stack") : null;
    const targetRect = winnerPileDom ? winnerPileDom.getBoundingClientRect() : document.body.getBoundingClientRect();

    // Animate all cards currently in the pot flying to the winner's seat stack
    const potCards = potCardsContainer.querySelectorAll(".star-card");
    potCards.forEach(card => {
      const rect = card.getBoundingClientRect();
      
      // Detach and fly
      card.style.position = "fixed";
      card.style.top = `${rect.top}px`;
      card.style.left = `${rect.left}px`;
      card.style.transition = "all 0.8s cubic-bezier(0.7, 0, 0.3, 1), opacity 0.5s";
      
      // Force reflow
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
        
        // Render updated state now that cards have visually arrived
        renderPot();
        renderSeats();
        renderScoreboard();
        renderLogs();
        
        if (outcome.isGameOver) {
          triggerGameOver();
        } else {
          startOfflineGuessingRound(outcome);
        }
      }, 300);
    }, 1800);
  }

  // Bluff success animation and transition
  function triggerBluffWinFlash(playerIndex, playerName, cardName, wonCount) {
    if (window.themeSelectMode === "ai_bot") {
      triggerNarratorCommentary("bluff_success", { player: playerName });
    }
    if (window.playVictorySound) window.playVictorySound();
    const winOverlay = document.createElement("div");
    winOverlay.className = "win-flash-overlay";
    winOverlay.innerHTML = `
      <div class="win-flash-content">
        <h2 class="win-flash-title" style="background: linear-gradient(135deg, #ec4899, #f43f5e); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Bluff Successful!</h2>
        <p class="win-flash-sub"><strong>${playerName}</strong> successfully bluffed match on <strong>${cardName}</strong></p>
        <p class="win-flash-cards">+${wonCount} cards added to stack</p>
      </div>
    `;
    document.body.appendChild(winOverlay);

    const winnerSeatDom = document.querySelector(`.player-seat[data-player-id="${playerIndex}"]`);
    const winnerPileDom = winnerSeatDom ? winnerSeatDom.querySelector(".player-seat-stack") : null;
    const targetRect = winnerPileDom ? winnerPileDom.getBoundingClientRect() : document.body.getBoundingClientRect();

    const potCards = potCardsContainer.querySelectorAll(".star-card");
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
        renderPot();
        renderSeats();
        renderScoreboard();
        renderLogs();
        
        if (game.isGameOver) {
          triggerGameOver();
        } else {
          const outcome = {
            playerIndex: playerIndex,
            playerName: playerName,
            playedCard: { name: cardName },
            wonCount: wonCount,
            isGameOver: game.isGameOver
          };
          startOfflineGuessingRound(outcome);
        }
      }, 300);
    }, 1800);
  }

  // Bluff caught animation and transition
  function triggerBluffCaughtFlash(caughtPlayerIndex, caughtPlayerName, callerName, cardName, wonCount) {
    if (window.themeSelectMode === "ai_bot") {
      triggerNarratorCommentary("bluff_caught", { player: caughtPlayerName, caller: callerName });
    }
    if (window.playReadySound) window.playReadySound();
    const winOverlay = document.createElement("div");
    winOverlay.className = "win-flash-overlay";
    winOverlay.innerHTML = `
      <div class="win-flash-content">
        <h2 class="win-flash-title" style="background: linear-gradient(135deg, #e11d48, #be123c); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Bluff Caught!</h2>
        <p class="win-flash-sub"><strong>${callerName}</strong> caught <strong>${caughtPlayerName}</strong> bluffing!</p>
        <p class="win-flash-cards">+${wonCount} cards added to ${caughtPlayerName}'s stack</p>
      </div>
    `;
    document.body.appendChild(winOverlay);

    const seatDom = document.querySelector(`.player-seat[data-player-id="${caughtPlayerIndex}"]`);
    const pileDom = seatDom ? seatDom.querySelector(".player-seat-stack") : null;
    const targetRect = pileDom ? pileDom.getBoundingClientRect() : document.body.getBoundingClientRect();

    const potCards = potCardsContainer.querySelectorAll(".star-card");
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
        renderPot();
        renderSeats();
        renderScoreboard();
        renderLogs();
        
        if (game.isGameOver) {
          triggerGameOver();
        } else {
          const nextIndex = game.findNextPlayerIndex(caughtPlayerIndex);
          game.currentPlayerIndex = nextIndex;
          
          const nextPlayer = game.getCurrentPlayer();
          hudActivePlayerName.textContent = nextPlayer.name;
          hudRoundNum.textContent = game.roundNumber;
          renderSeats();
          
          if (!nextPlayer.isBot) {
            window.lastTurnStartTime = Date.now();
          }
          
          if (nextPlayer.isBot) {
            checkAndTriggerBotTurn();
          }
        }
      }, 300);
    }, 1800);
  }

  // Call Flask Server Bluff Stats endpoint
  async function callPlayerStatsBluffApi(playerId, type) {
    try {
      const dbUrl = (window.multiplayer && window.multiplayer.firebaseConfig) 
        ? window.multiplayer.firebaseConfig.databaseURL 
        : "https://star-greetings-default-rtdb.asia-southeast1.firebasedatabase.app";
      await fetch("/api/player/stats/bluff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, type, dbUrl })
      });
    } catch (e) {
      console.error("Failed to update player bluff stats:", e);
    }
  }

  // Show premium cinematic toast for narrator commentary
  function showNarratorCommentary(message) {
    const toggleBtn = document.getElementById("narrator-toggle-btn");
    if (toggleBtn && toggleBtn.classList.contains("disabled")) {
      return; // Narrator turned off by user
    }

    let container = document.querySelector(".narrator-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "narrator-toast-container";
      document.body.appendChild(container);
    }

    // Remove any existing active commentary
    container.innerHTML = "";

    const toast = document.createElement("div");
    toast.className = "narrator-toast-element";
    toast.innerHTML = `
      <div class="narrator-toast-header">🎙️ Movie Narrator</div>
      <div class="narrator-toast-body">"${message}"</div>
    `;
    container.appendChild(toast);

    // Force reflow
    toast.getBoundingClientRect();

    // Fade in
    toast.classList.add("show");

    // Fade out and remove after 5 seconds
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
      }, 400);
    }, 5000);
  }

  // Request cinematic narration from Flask server
  async function triggerNarratorCommentary(event, extraParams = {}) {
    const toggleBtn = document.getElementById("narrator-toggle-btn");
    if (toggleBtn && toggleBtn.classList.contains("disabled")) {
      return; // Do not call API if narrator is disabled
    }

    try {
      const activePlayer = game.getCurrentPlayer();
      const theme = game.selectedCategory || "tollywood";
      
      const payload = {
        event: event,
        player: extraParams.player || (activePlayer ? activePlayer.name : "Player"),
        round: game.roundNumber,
        bet: game.matchBet,
        theme: theme,
        ...extraParams
      };

      const response = await fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Narrator API failed");
      const result = await response.json();
      if (result.commentary) {
        showNarratorCommentary(result.commentary);
      }
    } catch (e) {
      console.error("Failed to fetch game narration:", e);
    }
  }

  function checkAndTriggerBotTurn() {
    if (game.isGameOver) return;
    const activePlayer = game.getCurrentPlayer();
    if (activePlayer && activePlayer.isBot) {
      console.log(`Bot ${activePlayer.name} is taking its turn...`);
      hudActivePlayerName.textContent = `${activePlayer.name} (Bot)...`;
      
      if (game.config.FORCED_TOP_DRAW) {
        setTimeout(() => {
          executePlay();
        }, 1200);
      } else {
        // Strategic bot play calling the Flask Heuristic API
        setTimeout(async () => {
          try {
            const dbUrl = (window.multiplayer && window.multiplayer.firebaseConfig) 
              ? window.multiplayer.firebaseConfig.databaseURL 
              : "https://star-greetings-default-rtdb.asia-southeast1.firebasedatabase.app";
            
            const humanPlayer = game.players.find(p => !p.isBot) || game.players[0];
            
            const response = await fetch("/api/bot/decision/play", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                hand: activePlayer.stack,
                pot: game.pot,
                revealed_cards: window.revealedCardsInMatch || [],
                playerId: humanPlayer.name,
                currentBet: game.matchBet,
                difficulty: game.config.AI_DIFFICULTY || "normal",
                dbUrl: dbUrl
              })
            });
            
            if (!response.ok) {
              throw new Error("Server response not OK");
            }
            
            const decision = await response.json();
            console.log("Bot decision outcome:", decision);
            
            if (decision.action === "real_match_claim" || decision.action === "bluff_claim") {
              window.pendingBotCard = decision.card;
              window.pendingBotAction = decision.action;
              
              const topCardPot = game.pot[game.pot.length - 1];
              const declaredName = topCardPot ? topCardPot.name : "Top Card";
              
              const titleEl = document.getElementById("bluff-challenge-title");
              const msgEl = document.getElementById("bluff-challenge-msg");
              if (titleEl) titleEl.textContent = "Match Claimed!";
              if (msgEl) {
                msgEl.innerHTML = `Bot <strong>${activePlayer.name}</strong> played a card and claimed a match on <strong>${declaredName}</strong>!<br>Do you suspect a bluff?`;
              }
              
              const challengeModal = document.getElementById("bluff-challenge-modal");
              if (challengeModal) {
                challengeModal.classList.remove("hidden");
                challengeModal.style.display = "flex";
              }
            } else {
              // Play normal card without claiming a match
              executePlay(decision.card ? decision.card.instanceId : null);
            }
          } catch (err) {
            console.error("Bot API call failed, falling back to standard draw:", err);
            executePlay();
          }
        }, 1200);
      }
    }
  }

  function proceedToNextTurn(outcome) {
    if (outcome.isGameOver) {
      triggerGameOver();
    } else {
      // Transition turns automatically without showing turn shield popups
      const nextPlayer = game.getCurrentPlayer();
      hudActivePlayerName.textContent = nextPlayer.name;
      renderSeats();
      renderPot();
      renderScoreboard();
      renderLogs();
      
      // Update turn start time for human player
      if (!nextPlayer.isBot) {
        window.lastTurnStartTime = Date.now();
      }
      
      if (nextPlayer.isBot) {
        checkAndTriggerBotTurn();
      }
    }
  }

  function cleanupFloatingElements() {
    document.querySelectorAll(".floating-card-anim, .win-flash-overlay, .coin-anim-element").forEach(el => el.remove());
  }
  window.cleanupFloatingElements = cleanupFloatingElements;

  // Trigger final screen and results
  function triggerGameOver() {
    // Stop any round music, then play the MATCH WINNER's last star song
    if (window.VictoryMusic) {
      window.VictoryMusic.stop(true);
    }
    // Determine the match winner's last matched star for the victory song
    // standings[0] = winner (most cards) after our sort fix
    // We use lastRoundWinnerStarId only if the round winner matches the match winner
    window._pendingVictoryStar = window.lastRoundWinnerStarId || null;
    cleanupFloatingElements();
    const standings = game.endGame();
    renderFinalStandings(standings);
    
    // Natural match end return of greetings stack
    if (window.auth) {
      const user = window.auth.getCurrentUser();
      if (user) {
        const humanPlayer = game.players.find(p => !p.isBot) || game.players[0];
        const wonReward = (standings.length > 0 && standings[0].name === humanPlayer.name);
        returnGreetings(humanPlayer.stackCount, wonReward);
      }
    }
    
    if (window.themeSelectMode === "ai_bot") {
      const dbUrl = (window.multiplayer && window.multiplayer.firebaseConfig) 
        ? window.multiplayer.firebaseConfig.databaseURL 
        : "https://star-greetings-default-rtdb.asia-southeast1.firebasedatabase.app";
        
      const humanPlayer = game.players.find(p => !p.isBot) || game.players[0];
      const botPlayer = game.players.find(p => p.isBot) || { name: "Bot Ranbir", stackCount: 30 };
      
      let outcome = "draw";
      // Most cards = winner
      if (humanPlayer.stackCount > botPlayer.stackCount) {
        outcome = "win";
      } else if (humanPlayer.stackCount < botPlayer.stackCount) {
        outcome = "loss";
      }

      // POST to match_end stats endpoint for Elo update
      fetch("/api/player/stats/match_end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: humanPlayer.name,
          opponentId: botPlayer.name,
          outcome: outcome,
          theme: (game.selectedCategory || "tollywood").toLowerCase(),
          dbUrl: dbUrl
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          window.finalMatchRatings = data;
          renderFinalStandings(standings);
        }
      })
      .catch(err => console.error("Error posting match end stats:", err));

      // POST to anomaly detection endpoint
      fetch("/api/analytics/anomaly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: humanPlayer.name,
          turns: window.matchTurnTelemetry || [],
          dbUrl: dbUrl
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.isAnomaly) {
          console.warn("🚨 [Anomaly Detected] 🚨", data);
          game.addLog(`⚠️ Anomaly detected: ${data.flags.join(", ")} (Confidence: ${data.confidence * 100}%)`);
          renderLogs();
        } else {
          console.log("No gameplay anomaly detected.", data);
        }
      })
      .catch(err => console.error("Error performing anomaly detection:", err));
    }
    
    if (window.themeSelectMode === "ai_bot" && standings.length > 0) {
      triggerNarratorCommentary("game_over", { player: standings[0].name });
    }
    
    playVictorySound();
    
    gameScreen.classList.add("hidden");
    endScreen.classList.remove("hidden");
  }

  function renderFinalStandings(standings) {
    finalStandingsList.innerHTML = "";

    const tagline = document.querySelector(".results-tagline");
    if (tagline && standings.length > 0) {
      tagline.innerHTML = `🎉 <strong style="color: #fbbf24; font-size: 1.15rem; text-shadow: 0 0 10px rgba(251, 191, 36, 0.3);">${standings[0].name}</strong> wins the match! 🎉`;
    }

    standings.forEach((p, idx) => {
      const item = document.createElement("div");
      item.className = "standing-row";
      if (idx === 0) {
        item.classList.add("winner-highlight");
      }

      let medal = "🎗️";
      if (idx === 0) medal = "🥇 Gold (Winner)";
      else if (idx === 1) medal = "🥈 Silver";
      else if (idx === 2) medal = "🥉 Bronze";

      let ratingStr = "";
      if (window.themeSelectMode === "ai_bot" && window.finalMatchRatings) {
        const humanPlayer = game.players.find(pl => !pl.isBot) || game.players[0];
        const botPlayer = game.players.find(pl => pl.isBot) || { name: "Bot Ranbir" };
        if (p.name === humanPlayer.name) {
          const change = window.finalMatchRatings.changePlayer;
          const changeSign = change >= 0 ? "+" : "";
          ratingStr = ` <span class="elo-badge" style="color: #6ee7b7; font-size: 0.85rem; margin-left: 8px;">(Elo: ${window.finalMatchRatings.playerRating} [${changeSign}${change}])</span>`;
        } else if (p.name === botPlayer.name) {
          const change = window.finalMatchRatings.changeOpponent;
          const changeSign = change >= 0 ? "+" : "";
          ratingStr = ` <span class="elo-badge" style="color: #fca5a5; font-size: 0.85rem; margin-left: 8px;">(Elo: ${window.finalMatchRatings.opponentRating} [${changeSign}${change}])</span>`;
        }
      }

      item.innerHTML = `
        <div class="standing-rank">${idx + 1}</div>
        <div class="standing-name">${p.name}${ratingStr}</div>
        <div class="standing-medal">${medal}</div>
        <div class="standing-count">${p.stackCount} cards</div>
      `;
      finalStandingsList.appendChild(item);
    });

    // Setup Victory Song Player Card — uses winner's last matched star
    const songPlayerEl = document.getElementById("victory-song-player");
    let songPlayBtn = document.getElementById("victory-song-play-btn");

    // Use the winner's last round-win star card for the victory song
    const winnerStarId = window._pendingVictoryStar || window.lastRoundWinnerStarId || null;

    if (songPlayerEl && songPlayBtn) {
      const songs = window.VictoryMusic ? window.VictoryMusic.songs : null;
      const entry = (songs && winnerStarId) ? songs[winnerStarId] : null;

      if (entry) {
        // Resolve star display name from config
        const starCfg = (window.STAR_CONFIG && window.STAR_CONFIG.roster)
          ? window.STAR_CONFIG.roster.find(s => s.id === winnerStarId)
          : null;
        const starName = starCfg ? starCfg.name : winnerStarId.replace(/_/g, ' ');

        document.getElementById("victory-song-name").textContent = entry.song;
        document.getElementById("victory-song-meta").textContent = `${entry.movie} · ${starName}`;

        // Show the player card
        songPlayerEl.style.display = "block";
        songPlayerEl.classList.remove("hidden");

        // Helper to sync button label with playback state
        const getIsPlaying = () =>
          !!(window.VictoryMusic && window.VictoryMusic.isPlaying && window.VictoryMusic.isPlaying());

        const refreshBtn = (btn) => {
          const sp = btn.querySelector("span");
          if (sp) sp.textContent = getIsPlaying() ? "⏹️ Stop Victory Song" : "🔊 Play Victory Song";
        };

        refreshBtn(songPlayBtn);

        // Clone to remove stale listeners
        const newBtn = songPlayBtn.cloneNode(true);
        songPlayBtn.parentNode.replaceChild(newBtn, songPlayBtn);
        songPlayBtn = newBtn;

        songPlayBtn.addEventListener("click", () => {
          if (!window.VictoryMusic) return;
          if (getIsPlaying()) {
            window.VictoryMusic.stop();
          } else {
            window.VictoryMusic.play(winnerStarId);
          }
          setTimeout(() => refreshBtn(songPlayBtn), 400);
        });

        // Keep button label in sync while on end screen
        const syncTimer = setInterval(() => {
          const btn = document.getElementById("victory-song-play-btn");
          if (!btn) { clearInterval(syncTimer); return; }
          refreshBtn(btn);
        }, 1000);

        // Auto-play attempt (works if still within user-gesture chain)
        setTimeout(() => {
          if (window.VictoryMusic && !getIsPlaying()) {
            window.VictoryMusic.play(winnerStarId);
          }
        }, 600);

      } else {
        songPlayerEl.style.display = "none";
        songPlayerEl.classList.add("hidden");
      }
    }

    // Clear pending star after use
    window._pendingVictoryStar = null;
  }

  // --- DRAWER TOGGLE CLICKS ---
  drawerToggleBtn.addEventListener("click", () => {
    sideDrawer.classList.remove("hidden-drawer");
  });

  drawerCloseBtn.addEventListener("click", () => {
    sideDrawer.classList.add("hidden-drawer");
  });

  // AI Narrator Toggle
  if (narratorToggleBtn) {
    narratorToggleBtn.addEventListener("click", () => {
      playReadySound();
      if (narratorToggleBtn.classList.contains("disabled")) {
        narratorToggleBtn.classList.remove("disabled");
        narratorToggleBtn.textContent = "🎙️ Narrator: ON";
        narratorToggleBtn.style.opacity = "1";
        narratorToggleBtn.style.background = "";
        narratorToggleBtn.style.borderColor = "";
        showNarratorCommentary("AI Narrator is back online! Let the show begin!");
      } else {
        narratorToggleBtn.classList.add("disabled");
        narratorToggleBtn.textContent = "🎙️ Narrator: OFF";
        narratorToggleBtn.style.opacity = "0.5";
        narratorToggleBtn.style.background = "rgba(239, 68, 68, 0.1)";
        narratorToggleBtn.style.borderColor = "rgba(239, 68, 68, 0.2)";
        
        const activeToast = document.querySelector(".narrator-toast-element");
        if (activeToast) activeToast.remove();
      }
    });
  }

  // Fullscreen Toggle
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", () => {
      playReadySound();
      const docEl = document.documentElement;
      const requestFS = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
      const exitFS = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen || document.msExitFullscreen;
      
      const isFS = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
      
      if (!isFS) {
        if (requestFS) {
          requestFS.call(docEl).catch(err => {
            console.warn(`Fullscreen request failed: ${err.message}`);
          });
        } else {
          alert("Fullscreen mode is not supported directly by this mobile browser. You can get a full-screen app experience by opening this page in Safari/Chrome and selecting 'Add to Home Screen'!");
        }
      } else {
        if (exitFS) {
          exitFS.call(document);
        }
      }
    });
  }

  // Close hand modal clicks
  modalCloseBtn.addEventListener("click", closePrivateHandModal);

  // --- BLUFF MODALS EVENT LISTENERS ---
  const bluffChoiceModal = document.getElementById("bluff-choice-modal");
  const bluffPlayNormalBtn = document.getElementById("bluff-play-normal-btn");
  const bluffClaimBtn = document.getElementById("bluff-claim-btn");

  const bluffChallengeModal = document.getElementById("bluff-challenge-modal");
  const bluffPassBtn = document.getElementById("bluff-pass-btn");
  const bluffCallBtn = document.getElementById("bluff-call-btn");

  if (bluffPlayNormalBtn) {
    bluffPlayNormalBtn.addEventListener("click", () => {
      playTouchSound();
      if (bluffChoiceModal) {
        bluffChoiceModal.classList.add("hidden");
        bluffChoiceModal.style.display = "none";
      }
      if (window.pendingCardInstanceId) {
        executePlay(window.pendingCardInstanceId);
        window.pendingCardInstanceId = null;
      }
    });
  }

  if (bluffClaimBtn) {
    bluffClaimBtn.addEventListener("click", async () => {
      playTouchSound();
      if (bluffChoiceModal) {
        bluffChoiceModal.classList.add("hidden");
        bluffChoiceModal.style.display = "none";
      }
      
      const cardInstanceId = window.pendingCardInstanceId;
      window.pendingCardInstanceId = null;
      if (!cardInstanceId) return;

      const activePlayer = game.getCurrentPlayer();
      const cardToPlay = activePlayer.stack.find(c => c.instanceId === cardInstanceId);
      const topCardPot = game.pot[game.pot.length - 1];
      const bot = game.players.find(p => p.isBot);
      const botHand = bot ? bot.stack : [];
      const dbUrl = (window.multiplayer && window.multiplayer.firebaseConfig) 
        ? window.multiplayer.firebaseConfig.databaseURL 
        : "https://star-greetings-default-rtdb.asia-southeast1.firebasedatabase.app";
      
      if (!window.revealedCardsInMatch) window.revealedCardsInMatch = [];
      window.revealedCardsInMatch.push(cardToPlay.id);

      try {
        const response = await fetch("/api/bot/decision/call_bluff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handSize: activePlayer.stackCount,
            pot: game.pot,
            revealed_cards: window.revealedCardsInMatch,
            playerId: activePlayer.name,
            difficulty: game.config.AI_DIFFICULTY || "normal",
            declaredStarId: topCardPot ? topCardPot.id : "",
            botHand: botHand,
            dbUrl: dbUrl
          })
        });

        if (!response.ok) throw new Error("Call bluff response failed");
        const result = await response.json();
        console.log("Bot call_bluff response:", result);

        if (result.call_bluff) {
          // Bot called bluff! Player caught!
          const wonCardsCount = game.pot.length;
          activePlayer.stack.push(...game.pot);
          game.pot = [];
          game.isBetDeductedForCurrentPot = false;
          game.addLog(`Round ${game.roundNumber}: Bot ${bot ? bot.name : "Ranbir"} called ${activePlayer.name}'s bluff and CAUGHT them! ${activePlayer.name} took the pot.`);
          
          const elapsed = Date.now() - (window.lastTurnStartTime || Date.now());
          if (!window.matchTurnTelemetry) window.matchTurnTelemetry = [];
          window.matchTurnTelemetry.push({
            timeMs: elapsed,
            bet: game.matchBet,
            isBluff: true,
            caught: true,
            win: false
          });

          const activePlayersAfter = game.getActivePlayers();
          if (activePlayersAfter.length <= 1) {
            game.isGameOver = true;
          }

          triggerBluffCaughtFlash(activePlayer.id, activePlayer.name, bot ? bot.name : "Ranbir", topCardPot.name, wonCardsCount);
          callPlayerStatsBluffApi(activePlayer.name, "caught");
        } else {
          // Bot let bluff pass! Player wins!
          const wonCardsCount = game.pot.length;
          const cardIndex = activePlayer.stack.findIndex(c => c.instanceId === cardInstanceId);
          activePlayer.stack.splice(cardIndex, 1);
          
          const activePlayers = game.getActivePlayers();
          const totalOpponents = activePlayers.filter(p => p.id !== activePlayer.id).length;
          const winnings = totalOpponents * game.matchBet;

          game.pendingMatchWinnings = {
            winnerIndex: activePlayer.id,
            cards: [...game.pot, cardToPlay],
            coins: winnings + game.matchBet,
            deductionPlayers: game.players.filter(p => p.id !== activePlayer.id && p.stackCount > 0).map(p => p.id),
            wonCardsCount: wonCardsCount,
            winnings: winnings,
            matchedStarName: cardToPlay.name,
            roundNumber: game.roundNumber
          };

          game.addLog(`Round ${game.roundNumber}: Bot ${bot ? bot.name : "Ranbir"} let ${activePlayer.name}'s bluff pass! ${activePlayer.name} won the pot.`);
          
          const elapsed = Date.now() - (window.lastTurnStartTime || Date.now());
          if (!window.matchTurnTelemetry) window.matchTurnTelemetry = [];
          window.matchTurnTelemetry.push({
            timeMs: elapsed,
            bet: game.matchBet,
            isBluff: true,
            caught: false,
            win: true
          });

          const activePlayersAfter = game.getActivePlayers();
          if (activePlayersAfter.length <= 1) {
            game.isGameOver = true;
          }

          triggerBluffWinFlash(activePlayer.id, activePlayer.name, topCardPot.name, wonCardsCount);
          callPlayerStatsBluffApi(activePlayer.name, "attempt");
        }
      } catch (err) {
        console.error("Failed to fetch bot call bluff decision, falling back to let it pass:", err);
        const wonCardsCount = game.pot.length;
        const cardIndex = activePlayer.stack.findIndex(c => c.instanceId === cardInstanceId);
        activePlayer.stack.splice(cardIndex, 1);
        
        const activePlayers = game.getActivePlayers();
        const totalOpponents = activePlayers.filter(p => p.id !== activePlayer.id).length;
        const winnings = totalOpponents * game.matchBet;

        game.pendingMatchWinnings = {
          winnerIndex: activePlayer.id,
          cards: [...game.pot, cardToPlay],
          coins: winnings + game.matchBet,
          deductionPlayers: game.players.filter(p => p.id !== activePlayer.id && p.stackCount > 0).map(p => p.id),
          wonCardsCount: wonCardsCount,
          winnings: winnings,
          matchedStarName: cardToPlay.name,
          roundNumber: game.roundNumber
        };

        game.addLog(`Round ${game.roundNumber}: ${activePlayer.name}'s bluff was let pass (fallback).`);
        
        const elapsed = Date.now() - (window.lastTurnStartTime || Date.now());
        if (!window.matchTurnTelemetry) window.matchTurnTelemetry = [];
        window.matchTurnTelemetry.push({
          timeMs: elapsed,
          bet: game.matchBet,
          isBluff: true,
          caught: false,
          win: true
        });

        triggerBluffWinFlash(activePlayer.id, activePlayer.name, topCardPot.name, wonCardsCount);
      }
    });
  }

  if (bluffPassBtn) {
    bluffPassBtn.addEventListener("click", () => {
      playTouchSound();
      if (bluffChallengeModal) {
        bluffChallengeModal.classList.add("hidden");
        bluffChallengeModal.style.display = "none";
      }
      
      const action = window.pendingBotAction;
      const card = window.pendingBotCard;
      window.pendingBotAction = null;
      window.pendingBotCard = null;
      
      if (!card) return;
      const bot = game.players.find(p => p.isBot);
      if (!bot) return;

      const topCardPot = game.pot[game.pot.length - 1];
      const declaredName = topCardPot ? topCardPot.name : "Top Card";

      if (action === "real_match_claim") {
        executePlay(card.instanceId);
      } else {
        const wonCardsCount = game.pot.length;
        const cardIndex = bot.stack.findIndex(c => c.instanceId === card.instanceId);
        if (cardIndex !== -1) bot.stack.splice(cardIndex, 1);
        
        const activePlayers = game.getActivePlayers();
        const totalOpponents = activePlayers.filter(p => p.id !== bot.id).length;
        const winnings = totalOpponents * game.matchBet;

        game.pendingMatchWinnings = {
          winnerIndex: bot.id,
          cards: [...game.pot, card],
          coins: winnings + game.matchBet,
          deductionPlayers: game.players.filter(p => p.id !== bot.id && p.stackCount > 0).map(p => p.id),
          wonCardsCount: wonCardsCount,
          winnings: winnings,
          matchedStarName: card.name,
          roundNumber: game.roundNumber
        };

        game.addLog(`Round ${game.roundNumber}: Bot ${bot.name} successfully bluffed match and won the pot of ${wonCardsCount} cards!`);
        
        const activePlayersAfter = game.getActivePlayers();
        if (activePlayersAfter.length <= 1) {
          game.isGameOver = true;
        }

        triggerBluffWinFlash(bot.id, bot.name, declaredName, wonCardsCount);
      }
    });
  }

  if (bluffCallBtn) {
    bluffCallBtn.addEventListener("click", () => {
      playTouchSound();
      if (bluffChallengeModal) {
        bluffChallengeModal.classList.add("hidden");
        bluffChallengeModal.style.display = "none";
      }

      const action = window.pendingBotAction;
      const card = window.pendingBotCard;
      window.pendingBotAction = null;
      window.pendingBotCard = null;

      if (!card) return;
      const bot = game.players.find(p => p.isBot);
      if (!bot) return;

      const humanPlayer = game.players.find(p => !p.isBot) || game.players[0];
      const topCardPot = game.pot[game.pot.length - 1];
      const declaredName = topCardPot ? topCardPot.name : "Top Card";

      if (action === "real_match_claim") {
        executePlay(card.instanceId);
        game.addLog(`Round ${game.roundNumber}: ${humanPlayer.name} incorrectly challenged Bot ${bot.name}'s legitimate match.`);
      } else {
        const wonCardsCount = game.pot.length;
        bot.stack.push(...game.pot);
        game.pot = [];
        game.isBetDeductedForCurrentPot = false;
        game.addLog(`Round ${game.roundNumber}: ${humanPlayer.name} caught Bot ${bot.name} bluffing! Bot collected the pot.`);

        const activePlayersAfter = game.getActivePlayers();
        if (activePlayersAfter.length <= 1) {
          game.isGameOver = true;
        }

        triggerBluffCaughtFlash(bot.id, bot.name, humanPlayer.name, declaredName, wonCardsCount);
      }
    });
  }

  // --- BUTTON CLICKS ---

  // Add/remove setup events
  addPlayerBtn.addEventListener("click", addPlayerField);

  // Ready button on Turn Shield clicked
  shieldReadyBtn.addEventListener("click", () => {
    playReadySound();
    
    // Get active player name
    const activePlayer = game.getCurrentPlayer();
    
    // Hide shield overlay immediately
    shieldOverlay.classList.add("hidden");
    shieldOverlay.style.display = "none";
    
    // Blur the app root
    const appRoot = document.getElementById("app-root");
    if (appRoot) {
      appRoot.classList.add("screen-blur-active");
    }
    
    // Create countdown overlay box
    const countdownOverlay = document.createElement("div");
    countdownOverlay.style.position = "fixed";
    countdownOverlay.style.top = "0";
    countdownOverlay.style.left = "0";
    countdownOverlay.style.width = "100%";
    countdownOverlay.style.height = "100%";
    countdownOverlay.style.display = "flex";
    countdownOverlay.style.alignItems = "center";
    countdownOverlay.style.justifyContent = "center";
    countdownOverlay.style.zIndex = "20000";
    
    const countdownBox = document.createElement("div");
    countdownBox.className = "countdown-box animate-scale";
    countdownBox.innerHTML = `
      <div class="countdown-title">Passing to ${activePlayer.name}...</div>
      <div class="countdown-number" id="countdown-num">3</div>
    `;
    
    countdownOverlay.appendChild(countdownBox);
    document.body.appendChild(countdownOverlay);
    
    let count = 3;
    const interval = setInterval(() => {
      count--;
      const numEl = document.getElementById("countdown-num");
      if (numEl) {
        numEl.textContent = count;
        playCycleSound();
      }
      
      if (count <= 0) {
        clearInterval(interval);
        // Remove countdown overlay
        countdownOverlay.remove();
        // Remove blur
        if (appRoot) {
          appRoot.classList.remove("screen-blur-active");
        }
        // Complete shield hiding & rendering
        hideTurnShield();
      }
    }, 1000);
  });

  // Greetings Stack Economy start match deduction helper
  async function deductGreetingsForMatchStart() {
    if (!window.auth) return true;
    const user = window.auth.getCurrentUser();
    if (!user) return true;
    
    const dbUrl = (window.multiplayer && window.multiplayer.firebaseConfig) 
      ? window.multiplayer.firebaseConfig.databaseURL 
      : "";

    // Offline / local players (no Firebase uid and no dbUrl) — skip deduction entirely
    if (!user.uid && !dbUrl) return true;

    const userId = user.uid || user.username;
    
    try {
      const response = await fetch("/api/player/greetings/start-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, dbUrl })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Sync local cache
        const newCount = data.greetingsStack;
        user.greetingsStack = newCount;
        await window.auth.updateGreetingsStackLocal(newCount);
        if (window.refreshGreetingsStack) {
          window.refreshGreetingsStack(user);
        }
        return true;
      } else {
        const errorMsg = data.error || "Failed to start match due to greetings stack error.";
        alert(errorMsg);
        return false;
      }
    } catch (e) {
      console.error("Greetings deduction error:", e);
      // Network error — allow the match rather than blocking the player
      return true;
    }
  }

  // Greetings Stack Economy return greetings helper
  async function returnGreetings(remainingDeck, wonReward) {
    if (!window.auth) return;
    const user = window.auth.getCurrentUser();
    if (!user) return;
    
    const dbUrl = (window.multiplayer && window.multiplayer.firebaseConfig) 
      ? window.multiplayer.firebaseConfig.databaseURL 
      : "";
    const userId = user.uid || user.username;
    
    try {
      const response = await fetch("/api/player/greetings/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, remainingDeck, wonReward, dbUrl })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const newCount = data.greetingsStack;
        user.greetingsStack = newCount;
        await window.auth.updateGreetingsStackLocal(newCount);
        if (window.refreshGreetingsStack) {
          window.refreshGreetingsStack(user);
        }
        console.log("Returned greetings. New stack:", newCount);
      }
    } catch (e) {
      console.error("Error returning greetings:", e);
    }
  }

  function showRoundLossModal(remainingCards) {
    const modal = document.getElementById("round-loss-modal");
    const msgEl = document.getElementById("round-loss-remaining-msg");
    if (msgEl) {
      msgEl.innerHTML = `Remaining deck cards: <strong style="color: #fff;">${remainingCards}</strong>`;
    }
    if (modal) {
      modal.style.display = "flex";
      modal.classList.remove("hidden");
    }
  }

  function resumeAfterRoundLoss() {
    const modal = document.getElementById("round-loss-modal");
    if (modal) {
      modal.style.display = "none";
      modal.classList.add("hidden");
    }
    
    const nextPlayer = game.getCurrentPlayer();
    if (nextPlayer) {
      hudActivePlayerName.textContent = nextPlayer.name;
      hudRoundNum.textContent = game.roundNumber;
      renderSeats();
      
      if (!nextPlayer.isBot) {
        window.lastTurnStartTime = Date.now();
      }
      
      if (nextPlayer.isBot) {
        checkAndTriggerBotTurn();
      }
    }
  }

  // Wire up the button event listeners for the round loss modal
  const lossContinueBtn = document.getElementById("loss-continue-btn");
  if (lossContinueBtn) {
    lossContinueBtn.addEventListener("click", () => {
      playTouchSound();
      resumeAfterRoundLoss();
    });
  }

  const lossLeaveBtn = document.getElementById("loss-leave-btn");
  if (lossLeaveBtn) {
    lossLeaveBtn.addEventListener("click", async () => {
      if (window.VictoryMusic) window.VictoryMusic.stop(true);
      playTouchSound();
      const humanPlayer = game.players.find(p => !p.isBot) || game.players[0];
      await returnGreetings(humanPlayer.stackCount, false);
      
      const modal = document.getElementById("round-loss-modal");
      if (modal) {
        modal.style.display = "none";
        modal.classList.add("hidden");
      }
      
      cleanupFloatingElements();
      gameScreen.classList.add("hidden");
      const dashboardView = document.getElementById("dashboard-screen");
      if (dashboardView) {
        dashboardView.classList.remove("hidden");
      }
      const updatedUser = window.auth.getCurrentUser();
      if (updatedUser && window.refreshGreetingsStack) {
        window.refreshGreetingsStack(updatedUser);
      }
    });
  }

  startGameBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    cleanupFloatingElements();
    
    const playerNames = [];
    const playerAvatarUrls = [];
    const playerBets = [];
    
    for (let i = 1; i <= playerInputCount; i++) {
      const input = document.getElementById(`player-name-${i}`);
      const name = input.value.trim();
      if (!name) {
        alert(`Please enter a valid name for Player ${i}.`);
        return;
      }
      playerNames.push(name);
      playerAvatarUrls.push(AVATARS[playerAvatars[i]]);
      
      // Get selected bet from player's selector
      const activeBetBtn = document.querySelector(`#bet-selector-${i} .bet-opt-btn.active`);
      const betVal = activeBetBtn ? parseInt(activeBetBtn.dataset.val) : 25;
      playerBets.push(betVal);
    }

    const stackSize = 6; // Lock stack size to 6 greetings
    const deckTheme = window.selectedOfflineTheme || "Tollywood";

    // If only 1 player is configured, automatically append a human opponent
    if (playerInputCount === 1) {
      playerNames.push("Ranbir");
      playerAvatarUrls.push(AVATARS[1]);
      playerBets.push(25);
      playerTypes[2] = "human";
      playerAvatars[2] = 1;
    }

    // Initialize state
    game.initializeGame(playerNames, stackSize, playerBets, deckTheme);
    
    // Load placement config option
    const placementMode = document.getElementById("placement-mode").value || "middle";
    game.config.CARD_PLACEMENT_MODE = placementMode;
    
    // Load actual coin balances of local accounts if they exist
    if (window.auth) {
      const accounts = window.auth.getAccounts();
      game.players.forEach(p => {
        const normalizedPlayerName = p.name.trim().toLowerCase();
        const matchKey = Object.keys(accounts).find(key => 
          key === normalizedPlayerName || 
          accounts[key].name.trim().toLowerCase() === normalizedPlayerName
        );
        if (matchKey) {
          p.coins = isNaN(parseInt(accounts[matchKey].coins, 10)) ? 300 : parseInt(accounts[matchKey].coins, 10);
          p.greetingsStack = accounts[matchKey].greetingsStack !== undefined ? accounts[matchKey].greetingsStack : 6;
        } else {
          p.greetingsStack = 6;
        }
      });
    }

    // Bind avatar URL and bot properties to the player objects dynamically
    if (window.auth) {
      const user = window.auth.getCurrentUser();
      game.players.forEach((p, idx) => {
        if (idx === 0 && user && user.avatar) {
          p.avatar = user.avatar;
        } else {
          p.avatar = playerAvatarUrls[idx];
        }
        p.isBot = (playerTypes[idx + 1] === "bot");
      });
    } else {
      game.players.forEach((p, idx) => {
        p.avatar = playerAvatarUrls[idx];
        p.isBot = (playerTypes[idx + 1] === "bot");
      });
    }

    // UI transition
    setupScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    // Close slide drawer initially
    sideDrawer.classList.add("hidden-drawer");

    // Render initial board elements immediately so flight paths can query active DOM elements
    renderSeats();
    renderPot();
    renderScoreboard();
    renderLogs();

    // Trigger coin merging flying animation
    triggerCoinMergeAnimation();

    // Delay displaying first turn shield by 1.6s to let animation finish
    setTimeout(() => {
      const firstPlayer = game.getCurrentPlayer();
      if (firstPlayer.isBot) {
        hideTurnShield();
        checkAndTriggerBotTurn();
      } else {
        showTurnShield(firstPlayer);
      }
    }, 1600);
  });

  // End Game manually
  endGameBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to end the game and view final standings?")) {
      sideDrawer.classList.add("hidden-drawer");
      triggerGameOver();
    }
  });

  // Restart/Play Again clicked
  restartGameBtn.addEventListener("click", () => {
    if (window.VictoryMusic) window.VictoryMusic.stop(true);
    cleanupFloatingElements();
    endScreen.classList.add("hidden");
    
    if (window.isOnlineGame && window.multiplayer) {
      window.multiplayer.leaveRoom();
    }
    
    // Redirect to dashboard and sync coins won/lost during the match
    const dashboardView = document.getElementById("dashboard-screen");
    if (dashboardView && window.auth) {
      dashboardView.classList.remove("hidden");
      
      const accounts = window.auth.getAccounts();
      
      // Update coins for ALL local accounts that participated in the match
      game.players.forEach(p => {
        const normalizedPlayerName = p.name.trim().toLowerCase();
        const matchKey = Object.keys(accounts).find(key => 
          key === normalizedPlayerName || 
          accounts[key].name.trim().toLowerCase() === normalizedPlayerName
        );
        if (matchKey) {
          accounts[matchKey].coins = p.coins;
        }
      });
      window.auth.saveAccounts(accounts);

      // Sync active user coins back to Firebase profile
      const user = window.auth.getCurrentUser();
      if (user) {
        const playerObj = game.players.find(p => p.name === user.name);
        if (playerObj) {
          window.auth.updateCoins(playerObj.coins);
        }
      }

      // Re-trigger auth initialization to refresh profile stats on dashboard
      const updatedUser = window.auth.getCurrentUser();
      if (updatedUser) {
        document.getElementById("dashboard-profile-name").textContent = updatedUser.name;
        document.getElementById("dashboard-profile-coins").textContent = updatedUser.coins;
        if (window.refreshGreetingsStack) {
          window.refreshGreetingsStack(updatedUser);
        }
      }
    } else {
      setupScreen.classList.remove("hidden");
      renderPlayerSetupFields();
    }
  });

  // Seat adjustment event delegation (Front/Back)
  seatsContainer.addEventListener("click", (e) => {
    const frontBtn = e.target.closest(".move-front-btn");
    const backBtn = e.target.closest(".move-back-btn");
    
    if (frontBtn) {
      e.stopPropagation();
      const playerId = parseInt(frontBtn.dataset.playerId);
      const playerObj = game.players.find(p => p.id === playerId);
      if (playerObj) {
        playerObj.radiusOffset = (playerObj.radiusOffset || 0) - 25;
        if (playerObj.radiusOffset < -80) playerObj.radiusOffset = -80;
        positionSeats();
        if (window.isOnlineGame && window.multiplayer) {
          window.multiplayer.updatePlayerOffsets(playerId);
        }
      }
    }
    
    if (backBtn) {
      e.stopPropagation();
      const playerId = parseInt(backBtn.dataset.playerId);
      const playerObj = game.players.find(p => p.id === playerId);
      if (playerObj) {
        playerObj.radiusOffset = (playerObj.radiusOffset || 0) + 25;
        if (playerObj.radiusOffset > 80) playerObj.radiusOffset = 80;
        positionSeats();
        if (window.isOnlineGame && window.multiplayer) {
          window.multiplayer.updatePlayerOffsets(playerId);
        }
      }
    }
  });

  // Dynamic Seat Rotation Dragging Variables
  let activeDragPlayerId = null;
  let longPressTimer = null;
  let isDraggingSeat = false;
  let dragStartX = 0;
  let dragStartY = 0;
  const LONG_PRESS_DELAY = 250; // 250ms hold
  const DRAG_CANCEL_THRESHOLD = 8; // px movement allowed before long-press cancels

  // Pointer down handler for seat rotation (delegated to seatsContainer)
  seatsContainer.addEventListener("pointerdown", (e) => {
    const avatarWrapper = e.target.closest(".player-avatar-wrapper");
    if (!avatarWrapper) return;
    
    // Do not initiate drag if player is eliminated
    const seatEl = avatarWrapper.closest(".player-seat");
    if (seatEl.classList.contains("eliminated-seat")) return;

    const playerId = parseInt(seatEl.dataset.playerId);
    
    activeDragPlayerId = playerId;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    isDraggingSeat = false;
    
    if (longPressTimer) clearTimeout(longPressTimer);
    
    longPressTimer = setTimeout(() => {
      isDraggingSeat = true;
      seatEl.classList.add("dragging-active");
      avatarWrapper.classList.add("dragging-active");
      
      // Visual & Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(40);
      }
      
      document.body.style.cursor = "grabbing";
    }, LONG_PRESS_DELAY);
  });

  // Global pointer move handler
  window.addEventListener("pointermove", (e) => {
    if (activeDragPlayerId === null) return;

    if (!isDraggingSeat) {
      // Check if user has moved too much before long press triggers
      const dist = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);
      if (dist > DRAG_CANCEL_THRESHOLD) {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }
      return;
    }

    // Dynamic rotation math
    const wrapper = document.querySelector(".table-surface-wrapper");
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const px = e.clientX;
    const py = e.clientY;

    const pointerTheta = Math.atan2(py - cy, px - cx);

    const playerObj = game.players.find(p => p.id === activeDragPlayerId);
    if (!playerObj) return;

    const total = game.players.length;
    const index = game.players.findIndex(p => p.id === activeDragPlayerId);
    const angleStart = -Math.PI / 2;
    const baseTheta = angleStart + (index * (2 * Math.PI / total));

    let rawOffset = pointerTheta - baseTheta;

    // Normalize wrapping
    while (rawOffset < -Math.PI) rawOffset += 2 * Math.PI;
    while (rawOffset > Math.PI) rawOffset -= 2 * Math.PI;

    // Clamp angleOffset to -0.6 to 0.6 radians (~34.4 degrees)
    playerObj.angleOffset = Math.max(-0.6, Math.min(0.6, rawOffset));

    // Update positions in real-time
    positionSeats();
    
    // Smoothly update pot cards near the player if placement is 'near'
    if (game.config.CARD_PLACEMENT_MODE === 'near') {
      updateNearPotPositions(activeDragPlayerId);
    }
  });

  // Global pointer up and cancel handlers
  const endDragSession = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    if (activeDragPlayerId !== null) {
      const seatEl = document.querySelector(`.player-seat[data-player-id="${activeDragPlayerId}"]`);
      if (seatEl) {
        seatEl.classList.remove("dragging-active");
        const avatarWrapper = seatEl.querySelector(".player-avatar-wrapper");
        if (avatarWrapper) avatarWrapper.classList.remove("dragging-active");
      }
      document.body.style.cursor = "";
      
      // Save offsets in online multiplayer if it is an online match
      if (window.isOnlineGame && window.multiplayer) {
        window.multiplayer.updatePlayerOffsets(activeDragPlayerId);
      }
    }

    activeDragPlayerId = null;
    isDraggingSeat = false;
  };

  window.addEventListener("pointerup", endDragSession);
  window.addEventListener("pointercancel", endDragSession);

  // Expose key UI functions to window for multiplayer.js integration
  window.renderSeats = renderSeats;
  window.renderPot = renderPot;
  window.renderScoreboard = renderScoreboard;
  window.renderLogs = renderLogs;
  window.createCardElement = createCardElement;
  window.playTouchSound = playTouchSound;
  window.playReadySound = playReadySound;
  window.playShuffleSound = playShuffleSound;
  window.playVictorySound = playVictorySound;
  window.triggerCoinMergeAnimation = triggerCoinMergeAnimation;
  window.renderFinalStandings = renderFinalStandings;
  window.game = game;

  // Bind Online Lobby Navigation & Action Buttons
  const playOnlineBtn = document.getElementById("play-online-btn");
  if (playOnlineBtn) {
    playOnlineBtn.addEventListener("click", () => {
      playTouchSound();
      window.multiplayer.showScreen("online-lobby-screen");
    });
  }

  const linkOnlineToDashboard = document.getElementById("link-online-to-dashboard");
  if (linkOnlineToDashboard) {
    linkOnlineToDashboard.addEventListener("click", (e) => {
      e.preventDefault();
      playTouchSound();
      window.multiplayer.showScreen("dashboard-screen");
    });
  }

  // Selected theme tracking
  let selectedTheme = "tollywood";

  // Custom Theme Modal handling
  const customThemeModal = document.getElementById("custom-theme-modal");
  const customThemePrompt = document.getElementById("custom-theme-prompt");
  const customThemeLoading = document.getElementById("custom-theme-loading");
  const generateThemeBtn = document.getElementById("generate-theme-btn");
  const cancelThemeBtn = document.getElementById("cancel-theme-btn");
  const customThemeCard = document.getElementById("custom-theme-card");

  function openCustomThemeModal() {
    if (customThemeModal) {
      customThemeModal.classList.remove("hidden");
      customThemeModal.style.display = "flex";
      if (customThemePrompt) {
        customThemePrompt.value = "";
        customThemePrompt.focus();
      }
      if (customThemeLoading) {
        customThemeLoading.classList.add("hidden");
        customThemeLoading.style.display = "none";
      }
      if (generateThemeBtn) {
        generateThemeBtn.style.display = "block";
      }
      if (cancelThemeBtn) {
        cancelThemeBtn.style.display = "block";
      }
    }
  }

  function closeCustomThemeModal() {
    if (customThemeModal) {
      customThemeModal.classList.add("hidden");
      customThemeModal.style.display = "none";
    }
  }

  if (cancelThemeBtn) {
    cancelThemeBtn.addEventListener("click", () => {
      playTouchSound();
      closeCustomThemeModal();
    });
  }

  // Bind click event on theme cards
  const themeCards = document.querySelectorAll(".theme-card");
  themeCards.forEach(card => {
    card.addEventListener("click", () => {
      playTouchSound();
      const themeVal = card.dataset.theme || "tollywood";
      if (themeVal === "custom") {
        openCustomThemeModal();
      } else {
        themeCards.forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        selectedTheme = themeVal;
      }
    });
  });

  if (generateThemeBtn) {
    generateThemeBtn.addEventListener("click", async () => {
      playTouchSound();
      const promptVal = customThemePrompt.value.trim();
      if (!promptVal) {
        alert("Please enter a theme prompt.");
        return;
      }

      // Show loading spinner, hide action buttons
      customThemeLoading.classList.remove("hidden");
      customThemeLoading.style.display = "block";
      generateThemeBtn.style.display = "none";
      cancelThemeBtn.style.display = "none";

      const dbUrl = (window.multiplayer && window.multiplayer.firebaseConfig) 
        ? window.multiplayer.firebaseConfig.databaseURL 
        : "https://star-greetings-default-rtdb.asia-southeast1.firebasedatabase.app";

      try {
        const response = await fetch("/api/generate-theme", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptVal, dbUrl })
        });
        const data = await response.json();
        
        if (response.ok && data.success) {
          const deckId = data.deckId;
          const themeName = data.themeName;
          const cards = data.cards;

          // Merge custom cards into game config roster
          if (window.STAR_CONFIG) {
            window.STAR_CONFIG.roster = window.STAR_CONFIG.roster.filter(c => c.industry.toLowerCase() !== themeName.toLowerCase() && c.industry.toLowerCase() !== deckId.toLowerCase());
            window.STAR_CONFIG.roster.push(...cards);
          }
          if (game && game.config && game.config.roster) {
            game.config.roster = game.config.roster.filter(c => c.industry.toLowerCase() !== themeName.toLowerCase() && c.industry.toLowerCase() !== deckId.toLowerCase());
            game.config.roster.push(...cards);
          }

          // Update Custom Theme Card DOM visually to indicate the custom deck generated
          if (customThemeCard) {
            const descEl = customThemeCard.querySelector(".theme-desc");
            if (descEl) {
              descEl.innerHTML = `🎨 AI Custom — <strong>${themeName}</strong>`;
            }
            customThemeCard.dataset.theme = deckId;
            
            themeCards.forEach(c => c.classList.remove("active"));
            customThemeCard.classList.add("active");
            selectedTheme = deckId;
          }

          closeCustomThemeModal();
        } else {
          alert("Error generating custom deck: " + (data.error || "Unknown error"));
          customThemeLoading.classList.add("hidden");
          customThemeLoading.style.display = "none";
          generateThemeBtn.style.display = "block";
          cancelThemeBtn.style.display = "block";
        }
      } catch (err) {
        console.error("Custom theme generation failed:", err);
        alert("Custom theme generation failed. Please try again.");
        customThemeLoading.classList.add("hidden");
        customThemeLoading.style.display = "none";
        generateThemeBtn.style.display = "block";
        cancelThemeBtn.style.display = "block";
      }
    });
  }

  const onlineCreateRoomBtn = document.getElementById("online-create-room-btn");
  if (onlineCreateRoomBtn) {
    onlineCreateRoomBtn.addEventListener("click", () => {
      playTouchSound();
      const lobbyView = document.getElementById("online-lobby-screen");
      if (lobbyView) lobbyView.classList.add("hidden");
      const themeSelectionView = document.getElementById("theme-selection-screen");
      if (themeSelectionView) themeSelectionView.classList.remove("hidden");
      window.themeSelectMode = "online";
    });
  }

  // Confirm Theme Button Click
  const confirmThemeBtn = document.getElementById("confirm-theme-btn");
  if (confirmThemeBtn) {
    confirmThemeBtn.addEventListener("click", async () => {
      playTouchSound();
      const themeSelectionView = document.getElementById("theme-selection-screen");
      if (themeSelectionView) themeSelectionView.classList.add("hidden");

      if (window.themeSelectMode === "online") {
        if (window.multiplayer) {
          window.multiplayer.createRoom(selectedTheme);
        }
      } else if (window.themeSelectMode === "ai_bot") {
        const allowed = await deductGreetingsForMatchStart();
        if (!allowed) {
          if (themeSelectionView) themeSelectionView.classList.remove("hidden");
          return;
        }
        
        cleanupFloatingElements();
        
        let p1Name = "Player 1";
        if (window.auth) {
          const user = window.auth.getCurrentUser();
          if (user && user.name) {
            p1Name = user.name;
          }
        }
        
        const playerNames = [p1Name, "Bot Ranbir"];
        const playerAvatarUrls = [AVATARS[0], AVATARS[1]];
        const playerBets = [25, 25];
        const stackSize = 6;
        const deckTheme = selectedTheme || "tollywood";
        
        // Initialize state
        game.initializeGame(playerNames, stackSize, playerBets, deckTheme);
        
        // Load placement config option
        const placementEl = document.getElementById("placement-mode");
        const placementMode = placementEl ? placementEl.value : "middle";
        game.config.CARD_PLACEMENT_MODE = placementMode;

        // Initialize AI Difficulty and Strategic Mode config
        const diffEl = document.getElementById("ai-difficulty");
        game.config.AI_DIFFICULTY = diffEl ? diffEl.value : "normal";
        game.config.FORCED_TOP_DRAW = true; // Forced top-card draw
        window.revealedCardsInMatch = [];
        window.matchTurnTelemetry = [];
        window.finalMatchRatings = null;
        triggerNarratorCommentary("match_start", { player: p1Name });
        
        // Bind avatar URL and bot properties
        if (window.auth) {
          const user = window.auth.getCurrentUser();
          game.players.forEach((p, idx) => {
            if (idx === 0 && user && user.avatar) {
              p.avatar = user.avatar;
            } else {
              p.avatar = playerAvatarUrls[idx];
            }
            p.isBot = (idx === 1); // Second player is bot
          });
        } else {
          game.players.forEach((p, idx) => {
            p.avatar = playerAvatarUrls[idx];
            p.isBot = (idx === 1); // Second player is bot
          });
        }
        
        // UI transition
        const gameScreen = document.getElementById("game-screen");
        if (gameScreen) gameScreen.classList.remove("hidden");
        
        // Close slide drawer initially
        const sideDrawer = document.getElementById("side-drawer");
        if (sideDrawer) sideDrawer.classList.add("hidden-drawer");
        
        // Render initial board elements
        renderSeats();
        renderPot();
        renderScoreboard();
        renderLogs();
        
        // Trigger coin merging flying animation
        triggerCoinMergeAnimation();
        
        // Delay displaying first turn shield by 1.6s to let animation finish
        setTimeout(() => {
          const firstPlayer = game.getCurrentPlayer();
          if (firstPlayer.isBot) {
            hideTurnShield();
            checkAndTriggerBotTurn();
          } else {
            showTurnShield(firstPlayer);
          }
        }, 1600);
      } else {
        // Offline pass-and-play setup transition
        window.selectedOfflineTheme = selectedTheme;
        const setupView = document.getElementById("setup-screen");
        if (setupView) {
          setupView.classList.remove("hidden");
        }
        // Auto-fill logged in user as Player 1 name in the game-setup form
        if (window.auth) {
          const user = window.auth.getCurrentUser();
          const p1Input = document.getElementById("player-name-1");
          if (user && p1Input) {
            p1Input.value = user.name;
          }
        }
      }
    });
  }

  // Back Theme Button Click
  const backThemeBtn = document.getElementById("back-theme-btn");
  if (backThemeBtn) {
    backThemeBtn.addEventListener("click", () => {
      playTouchSound();
      const themeSelectionView = document.getElementById("theme-selection-screen");
      if (themeSelectionView) themeSelectionView.classList.add("hidden");

      if (window.themeSelectMode === "online") {
        const lobbyView = document.getElementById("online-lobby-screen");
        if (lobbyView) lobbyView.classList.remove("hidden");
      } else {
        const dashboardView = document.getElementById("dashboard-screen");
        if (dashboardView) dashboardView.classList.remove("hidden");
      }
    });
  }

  const onlineJoinRoomBtn = document.getElementById("online-join-room-btn");
  if (onlineJoinRoomBtn) {
    onlineJoinRoomBtn.addEventListener("click", () => {
      playTouchSound();
      window.multiplayer.joinRoom();
    });
  }

  const linkWaitingToLobby = document.getElementById("link-waiting-to-lobby");
  if (linkWaitingToLobby) {
    linkWaitingToLobby.addEventListener("click", (e) => {
      e.preventDefault();
      playTouchSound();
      window.multiplayer.leaveRoom();
    });
  }

  const onlineStartMatchBtn = document.getElementById("online-start-match-btn");
  if (onlineStartMatchBtn) {
    onlineStartMatchBtn.addEventListener("click", () => {
      playTouchSound();
      window.multiplayer.startMatch();
    });
  }

  const onlineBetSelector = document.getElementById("online-bet-selector");
  if (onlineBetSelector) {
    const betBtns = onlineBetSelector.querySelectorAll(".bet-opt-btn");
    betBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        betBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        playCycleSound();
        const val = parseInt(btn.dataset.val);
        window.multiplayer.updateBetVote(val);
      });
    });
  }

  const lobbyConfigDbBtn = document.getElementById("lobby-config-db-btn");
  if (lobbyConfigDbBtn) {
    lobbyConfigDbBtn.addEventListener("click", () => {
      playTouchSound();
      try {
        if (!window.multiplayer) {
          alert("Multiplayer manager not initialized yet!");
          return;
        }
        window.multiplayer.openDbConfigModal();
      } catch (err) {
        alert("Settings Error: " + err.message);
      }
    });
  }

  const dbConfigCloseBtn = document.getElementById("db-config-close-btn");
  if (dbConfigCloseBtn) {
    dbConfigCloseBtn.addEventListener("click", () => {
      playTouchSound();
      try {
        if (window.multiplayer) window.multiplayer.closeDbConfigModal();
      } catch (err) {
        console.error(err);
      }
    });
  }

  const dbConfigSaveBtn = document.getElementById("db-config-save-btn");
  if (dbConfigSaveBtn) {
    dbConfigSaveBtn.addEventListener("click", () => {
      playTouchSound();
      try {
        const urlInput = document.getElementById("db-config-url");
        const apiKeyInput = document.getElementById("db-config-api-key");
        if (urlInput && apiKeyInput && window.multiplayer) {
          window.multiplayer.saveDbConfig(urlInput.value, apiKeyInput.value);
        }
      } catch (err) {
        alert("Save Error: " + err.message);
      }
    });
  }

  const dbConfigResetBtn = document.getElementById("db-config-reset-btn");
  if (dbConfigResetBtn) {
    dbConfigResetBtn.addEventListener("click", () => {
      playTouchSound();
      try {
        if (window.multiplayer) {
          window.multiplayer.resetDbConfigToDefault();
        }
      } catch (err) {
        alert("Reset Error: " + err.message);
      }
    });
  }

  const onlinePlacementMode = document.getElementById("online-placement-mode");
  if (onlinePlacementMode) {
    onlinePlacementMode.addEventListener("change", () => {
      const val = onlinePlacementMode.value;
      if (window.multiplayer) {
        window.multiplayer.updatePlacementMode(val);
      }
    });
  }

  // --- Theme Recommendation Badge ---
  async function fetchThemeRecommendation() {
    // Clear any existing badges first
    document.querySelectorAll(".recommendation-badge").forEach(el => el.remove());
    
    try {
      let pName = "";
      if (window.auth) {
        const user = window.auth.getCurrentUser();
        if (user) {
          pName = user.name;
        }
      }
      if (!pName) pName = "Player";

      const dbUrl = (window.multiplayer && window.multiplayer.firebaseConfig) 
        ? window.multiplayer.firebaseConfig.databaseURL 
        : "https://star-greetings-default-rtdb.asia-southeast1.firebasedatabase.app";

      const res = await fetch("/api/analytics/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: pName, dbUrl })
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.recommendedTheme) {
        const recommendedTheme = data.recommendedTheme.toLowerCase();
        const card = document.querySelector(`.theme-card[data-theme="${recommendedTheme}"]`);
        if (card) {
          card.style.position = "relative";
          
          const badge = document.createElement("div");
          badge.className = "recommendation-badge";
          badge.style.position = "absolute";
          badge.style.top = "-12px";
          badge.style.right = "-12px";
          badge.style.background = "linear-gradient(135deg, #fbbf24, #f59e0b)";
          badge.style.color = "#000";
          badge.style.fontWeight = "bold";
          badge.style.fontSize = "0.75rem";
          badge.style.padding = "4px 10px";
          badge.style.borderRadius = "20px";
          badge.style.boxShadow = "0 0 12px rgba(251, 191, 36, 0.6)";
          badge.style.zIndex = "10";
          badge.style.pointerEvents = "none";
          badge.style.border = "1px solid rgba(255, 255, 255, 0.3)";
          
          badge.animate([
            { transform: 'scale(1)', boxShadow: '0 0 12px rgba(251, 191, 36, 0.6)' },
            { transform: 'scale(1.05)', boxShadow: '0 0 20px rgba(251, 191, 36, 0.9)' }
          ], {
            duration: 1000,
            iterations: Infinity,
            direction: 'alternate',
            easing: 'ease-in-out'
          });
          
          badge.innerHTML = `🔥 Recommended for You!`;
          card.appendChild(badge);
          
          if (data.reason) {
            badge.title = data.reason;
            card.title = data.reason;
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch theme recommendation:", e);
    }
  }

  // Mutation observer for theme selection screen to fetch recommendation
  const themeSelectionScreen = document.getElementById("theme-selection-screen");
  if (themeSelectionScreen) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const isHidden = themeSelectionScreen.classList.contains("hidden");
          if (!isHidden) {
            fetchThemeRecommendation();
          }
        }
      });
    });
    observer.observe(themeSelectionScreen, { attributes: true });
  }

  let offlineGuessingState = {
    active: false,
    phase: "placing",
    cardHolderIndex: 0,
    selectedCardInstanceId: null,
    guesses: {},
    bets: {},
    confirmedStake: 0,
    currentGuesserIds: [],
    currentGuesserPointer: 0,
    outcome: null
  };

  window.startOfflineGuessingRound = function(outcome) {
    const guesserIds = game.players
      .filter(p => p.id !== outcome.playerIndex && p.stackCount > 0)
      .map(p => p.id);

    const targetCard = game.pendingMatchWinnings.cards[game.pendingMatchWinnings.cards.length - 1];
    const correctMovie = targetCard.movie || "Salaar";

    // Collect movie names ONLY from cards currently in players' stacks (in-play cards)
    const inPlayMovies = new Set();
    game.players.forEach(p => {
      p.stack.forEach(card => {
        if (card.movie && card.movie !== correctMovie) {
          inPlayMovies.add(card.movie);
        }
      });
    });
    let moviePool = [...inPlayMovies];
    // If not enough in-play movies, fill with roster movies as fallback
    if (moviePool.length < 5) {
      const rosterFallback = game.config.roster
        .map(s => s.movie)
        .filter(m => m && m !== correctMovie && !inPlayMovies.has(m));
      moviePool = [...moviePool, ...rosterFallback];
    }
    const shuffledOthers = moviePool.sort(() => 0.5 - Math.random()).slice(0, 5);
    const movieOptions = [correctMovie, ...shuffledOthers].sort(() => 0.5 - Math.random());

    offlineGuessingState = {
      active: true,
      phase: "placing",
      cardHolderIndex: outcome.playerIndex,
      selectedCardInstanceId: null,
      guesses: {},
      bets: {},
      selectedMovies: {},
      movieOptions: movieOptions,
      confirmedStake: 0,
      currentGuesserIds: guesserIds.filter(id => !game.players[id].isBot),
      currentGuesserPointer: 0,
      outcome: outcome
    };

    window.playerStatusIndicators = {};

    const correctStarName = targetCard.name;

    game.players.forEach(p => {
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
          const starForMovie = game.config.roster.find(s => s.movie === botMovie);
          botGuess = starForMovie ? starForMovie.name : "Prabhas";
        }
        
        offlineGuessingState.guesses[p.id] = botGuess;
        offlineGuessingState.selectedMovies[p.id] = botMovie;
        offlineGuessingState.bets[p.id] = Math.random() < 0.6 ? 5 : 10;
        window.playerStatusIndicators[p.id] = "✏️";
      }
    });

    renderSeats();

    const overlay = document.getElementById("guessing-round-overlay");
    if (overlay) {
      overlay.classList.remove("hidden");
      overlay.style.display = "flex";
    }

    renderOfflineGuessingRoundView();
  };

  function renderOfflineGuessingRoundView() {
    const titleEl = document.getElementById("guessing-round-title");
    const instructionsEl = document.getElementById("guessing-round-instructions");
    const contentEl = document.getElementById("guessing-round-content");
    const cardHolder = game.players[offlineGuessingState.cardHolderIndex];

    if (offlineGuessingState.phase === "placing") {
      titleEl.innerHTML = "🎴 Placing Face-Down Card";
      instructionsEl.innerHTML = `Pass the screen to <strong>${cardHolder.name}</strong>. Choose a card from your stack to place face-down.`;

      let cardsHtml = cardHolder.stack.map((c, index) => {
        return `<div class="star-card card-back" data-card-idx="${index}" style="width: 110px; height: 154px; margin: 4px; border: 2px solid rgba(255,255,255,0.1); border-radius: 8px; background: linear-gradient(135deg, #4c1d95, #1e1b4b); box-shadow: var(--shadow-sm); cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <div style="font-size: 1.5rem;">🌟</div>
        </div>`;
      }).join("");

      contentEl.innerHTML = `
        <div style="text-align: center; margin-bottom: 16px;">
          <p>Choose one card to place face-down:</p>
        </div>
        <div class="guessing-card-scroll" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; max-height: 300px; overflow-y: auto;">
          ${cardsHtml}
        </div>
      `;

      contentEl.querySelectorAll(".star-card").forEach(el => {
        el.addEventListener("click", () => {
          const cardIdx = parseInt(el.dataset.cardIdx);
          offlineGuessingState.selectedCardInstanceId = cardHolder.stack[cardIdx].instanceId;
          
          game.players.forEach(p => {
            if (p.id !== offlineGuessingState.cardHolderIndex && p.isBot && p.stackCount > 0) {
              window.playerStatusIndicators[p.id] = "🎴";
            }
          });

          offlineGuessingState.phase = "guessing";
          offlineGuessingState.currentGuesserPointer = 0;
          renderOfflineGuessingRoundView();
        });
      });
    }

    else if (offlineGuessingState.phase === "guessing") {
      const humanGuesserIds = offlineGuessingState.currentGuesserIds;
      
      if (humanGuesserIds.length === 0 || offlineGuessingState.currentGuesserPointer >= humanGuesserIds.length) {
        offlineGuessingState.phase = "revealing";
        offlineGuessingState.currentGuesserPointer = 0;
        renderOfflineGuessingRoundView();
        return;
      }

      const activeGuesserId = humanGuesserIds[offlineGuessingState.currentGuesserPointer];
      const guesser = game.players[activeGuesserId];

      titleEl.innerHTML = "✏️ Enter Your Guess & Stake";
      instructionsEl.innerHTML = `Pass the screen to <strong>${guesser.name}</strong>.`;

      contentEl.innerHTML = `
        <div class="pass-screen-box" style="text-align: center; padding: 24px 0;">
          <h3 style="margin-bottom: 20px;">Are you holding the device, ${guesser.name}?</h3>
          <button type="button" id="proceed-guess-btn" class="menu-btn primary-btn">Confirm & Proceed</button>
        </div>
      `;

      document.getElementById("proceed-guess-btn").addEventListener("click", () => {
        const movieButtonsHtml = offlineGuessingState.movieOptions.map(m => {
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

        document.getElementById("submit-guess-btn").addEventListener("click", () => {
          if (!selectedMovie) {
            alert("Please select a movie name!");
            return;
          }
          const guessVal = document.getElementById("guesser-name-input").value.trim();
          if (!guessVal) {
            alert("Please type a guess!");
            return;
          }

          offlineGuessingState.selectedMovies[activeGuesserId] = selectedMovie;
          offlineGuessingState.guesses[activeGuesserId] = guessVal;
          offlineGuessingState.bets[activeGuesserId] = selectedStake;
          window.playerStatusIndicators[activeGuesserId] = "✏️";
          renderSeats();

          offlineGuessingState.currentGuesserPointer++;
          renderOfflineGuessingRoundView();
        });
      });
    }

    else if (offlineGuessingState.phase === "revealing") {
      titleEl.innerHTML = "📢 Vote Tally & Confirm";
      instructionsEl.innerHTML = `Tallying the votes. Card Holder (<strong>${cardHolder.name}</strong>) must confirm the stake.`;

      let count5 = 0;
      let count10 = 0;
      game.players.forEach(p => {
        if (p.id !== offlineGuessingState.cardHolderIndex && p.stackCount > 0) {
          const betVal = offlineGuessingState.bets[p.id] || 5;
          if (betVal === 10) count10++;
          else count5++;
        }
      });

      const totalVoters = count5 + count10;
      const pct5 = totalVoters > 0 ? Math.round((count5 / totalVoters) * 100) : 100;
      const pct10 = totalVoters > 0 ? Math.round((count10 / totalVoters) * 100) : 0;
      const confirmedStake = count10 > count5 ? 10 : 5;

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
          <p style="font-size: 0.95rem; margin-bottom: 16px;">Majority vote result: <strong>Stake is ${confirmedStake} Greetings</strong></p>
          <button type="button" id="confirm-stake-btn" class="menu-btn primary-btn" style="width: 260px; margin: 0 auto;">Confirm — Stake is ${confirmedStake} Greetings</button>
        </div>
      `;

      document.getElementById("confirm-stake-btn").addEventListener("click", () => {
        offlineGuessingState.confirmedStake = confirmedStake;
        
        titleEl.innerHTML = "🃏 Reveal Hidden Card";
        instructionsEl.innerHTML = `Let's see who is on the hidden card!`;

        const targetCard = game.pendingMatchWinnings.cards[game.pendingMatchWinnings.cards.length - 1];
        
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
            <button type="button" id="flip-action-btn" class="menu-btn primary-btn" style="width: 180px; margin: 0 auto;">Flip Card 🃏</button>
          </div>
        `;

        const frontContainer = document.getElementById("flip-card-front");
        const frontCardDom = createCardElement(targetCard);
        frontCardDom.style.width = "100%";
        frontCardDom.style.height = "100%";
        frontCardDom.style.margin = "0";
        frontCardDom.style.boxShadow = "none";
        frontContainer.appendChild(frontCardDom);

        document.getElementById("flip-action-btn").addEventListener("click", () => {
          const innerEl = document.getElementById("flip-card-inner");
          innerEl.classList.add("flipped");

          if (window.playTouchSound) window.playTouchSound();

          setTimeout(() => {
            offlineGuessingState.phase = "results";
            calculateAndApplyOfflineTransfers(targetCard.name);
            renderOfflineGuessingRoundView();
          }, 700);
        });
      });
    }

    else if (offlineGuessingState.phase === "results") {
      titleEl.innerHTML = "📊 Round Results";
      instructionsEl.innerHTML = `Greeting card balances have been updated.`;

      const targetCard = game.pendingMatchWinnings.cards[game.pendingMatchWinnings.cards.length - 1];
      const correctStarName = targetCard.name;
      const confirmedStake = offlineGuessingState.confirmedStake;

      let rowsHtml = game.players.map((p, index) => {
        const changeVal = offlineGuessingState.transferDiffs ? (offlineGuessingState.transferDiffs[p.id] || 0) : 0;
        const changeStr = changeVal > 0 ? `+${changeVal} Stack` : changeVal < 0 ? `${changeVal} Stack` : `0 Stack`;

        if (index === offlineGuessingState.cardHolderIndex) {
          return `
            <tr class="results-row-stagger" style="--row-index: ${index}; font-style: italic;">
              <td>${p.name} (Winner)</td>
              <td>—</td>
              <td>—</td>
              <td><strong>${changeStr}</strong></td>
            </tr>
          `;
        }
        
        if (p.stackCount <= 0 && !offlineGuessingState.guesses[p.id]) {
          return `
            <tr class="results-row-stagger" style="--row-index: ${index}; color: var(--text-muted);">
              <td>${p.name}</td>
              <td>—</td>
              <td>—</td>
              <td>Eliminated</td>
            </tr>
          `;
        }

        const selectedMovie = offlineGuessingState.selectedMovies[p.id] || "None";
        const guessText = offlineGuessingState.guesses[p.id] || "No Guess";
        const isCorrect = (selectedMovie === targetCard.movie) && isCorrectGuess(guessText, correctStarName, targetCard.id);
        const resultClass = isCorrect ? "correct-row" : "wrong-row";
        
        return `
          <tr class="${resultClass} results-row-stagger" style="--row-index: ${index};">
            <td>${p.name} ${p.isBot ? '🤖' : ''}</td>
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
          <button type="button" id="continue-next-round-btn" class="menu-btn primary-btn">Continue Game</button>
        </div>
      `;

      document.getElementById("continue-next-round-btn").addEventListener("click", () => {
        const overlay = document.getElementById("guessing-round-overlay");
        if (overlay) {
          overlay.classList.add("hidden");
          overlay.style.display = "none";
        }

        window.playerStatusIndicators = null;

        game.collectMatchEarnings();

        renderPot();
        renderSeats();
        renderScoreboard();
        renderLogs();

        if (game.isGameOver) {
          triggerGameOver();
        } else {
          const humanPlayer = game.players.find(p => !p.isBot) || game.players[0];
          const humanLostRound = (offlineGuessingState.outcome.hasMatch && offlineGuessingState.outcome.playerIndex !== game.players.indexOf(humanPlayer));
          
          if (humanLostRound && !humanPlayer.isBot) {
            showRoundLossModal(humanPlayer.stackCount);
          } else {
            resumeAfterRoundLoss();
          }
        }
      });
    }
  }

  function calculateAndApplyOfflineTransfers(actualStarName) {
    const targetCard = game.pendingMatchWinnings.cards[game.pendingMatchWinnings.cards.length - 1];
    const actualMovieName = targetCard.movie || "";
    const confirmedStake = offlineGuessingState.confirmedStake;
    const diffs = {};

    let wrongGuessers = [];
    let correctGuessers = [];

    game.players.forEach((p, index) => {
      if (index === offlineGuessingState.cardHolderIndex) return;
      if (p.stackCount <= 0 && !offlineGuessingState.guesses[p.id]) return;

      const selectedMovie = offlineGuessingState.selectedMovies[p.id];
      const guessText = offlineGuessingState.guesses[p.id];
      
      const isCorrect = (selectedMovie === actualMovieName) && isCorrectGuess(guessText, actualStarName, targetCard.id);

      if (isCorrect) {
        correctGuessers.push(p);
      } else {
        wrongGuessers.push(p);
      }
    });

    let totalCollected = 0;
    let collectedCards = [];
    
    wrongGuessers.forEach(p => {
      const originalVal = p.greetingsStack !== undefined ? p.greetingsStack : 6;
      const transferVal = Math.min(confirmedStake, originalVal);
      diffs[p.id] = -transferVal;
      totalCollected += transferVal;

      // Physically transfer the cards from the player's active stack
      const actualDeduct = Math.min(transferVal, p.stack.length);
      const removed = p.stack.splice(0, actualDeduct);
      collectedCards.push(...removed);
    });

    const cardHolder = game.players[offlineGuessingState.cardHolderIndex];

    if (correctGuessers.length > 0) {
      const awardVal = Math.floor(totalCollected / correctGuessers.length);
      correctGuessers.forEach(p => {
        diffs[p.id] = awardVal;
      });

      if (collectedCards.length > 0) {
        const cardsPerWinner = Math.floor(collectedCards.length / correctGuessers.length);
        correctGuessers.forEach((p, idx) => {
          const startIdx = idx * cardsPerWinner;
          const endIdx = idx === correctGuessers.length - 1 ? collectedCards.length : startIdx + cardsPerWinner;
          const pCards = collectedCards.slice(startIdx, endIdx);
          p.stack.push(...pCards);
        });

        // The card holder who flipped the card gets any remainder cards!
        const distributedCount = cardsPerWinner * correctGuessers.length;
        const remainderCount = collectedCards.length - distributedCount;
        if (remainderCount > 0 && cardHolder) {
          const remainderCards = collectedCards.slice(distributedCount);
          cardHolder.stack.push(...remainderCards);
          diffs[cardHolder.id] = (diffs[cardHolder.id] || 0) + remainderCount;
        }
      }
    } else {
      // If nobody guessed correctly, all wrong guessers' stakes go to the Card Holder!
      if (cardHolder && collectedCards.length > 0) {
        cardHolder.stack.push(...collectedCards);
        diffs[cardHolder.id] = (diffs[cardHolder.id] || 0) + collectedCards.length;
      }
    }

    correctGuessers.forEach(p => {
      if (diffs[p.id] === undefined) diffs[p.id] = 0;
    });

    if (cardHolder && diffs[cardHolder.id] === undefined) {
      diffs[cardHolder.id] = 0;
    }

    // Make sure all players' greetingsStack profile counts are updated to match the new stack sizes
    game.players.forEach(p => {
      p.greetingsStack = p.stack.length;
    });

    offlineGuessingState.transferDiffs = diffs;

    if (window.auth) {
      const accounts = window.auth.getAccounts();
      game.players.forEach(p => {
        const normalizedPlayerName = p.name.trim().toLowerCase();
        const matchKey = Object.keys(accounts).find(key => 
          key === normalizedPlayerName || 
          accounts[key].name.trim().toLowerCase() === normalizedPlayerName
        );
        if (matchKey) {
          accounts[matchKey].coins = p.coins;
          accounts[matchKey].greetingsStack = p.greetingsStack;
        }
      });
      window.auth.saveAccounts(accounts);
    }
  }

  function isCorrectGuess(guessText, actualStarName, cardId) {
    if (!guessText) return false;
    const normalizedGuess = guessText.trim().toLowerCase().replace(/\s+/g, "");
    
    // Check against the card's displayed name
    const normalizedActual = actualStarName.trim().toLowerCase().replace(/\s+/g, "");
    if (normalizedGuess === normalizedActual ||
        normalizedActual.includes(normalizedGuess) ||
        normalizedGuess.includes(normalizedActual)) {
      return true;
    }
    
    // Also check against the real actor name from the roster (for entries like "Baahubali" → Prabhas)
    if (cardId) {
      const rosterEntry = game.config.roster.find(s => s.id === cardId);
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

  // Initialize view
  renderPlayerSetupFields();
});
