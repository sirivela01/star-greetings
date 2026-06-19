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
  let minPlayers = 2;
  let playerInputCount = 3; // Default starting count of player input fields

  // Store avatar selection state per row index (1-based)
  let playerAvatars = {};

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
  function createCardElement(card, isClickable = false, onClickHandler = null) {
    const cardEl = document.createElement("div");
    cardEl.className = `star-card ${card.industry.toLowerCase()}`;
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
        <div class="card-industry-tag">${card.industry}</div>
        <div class="card-image-area">
          <img class="card-img" src="${card.imagePath}" alt="${card.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="card-fallback-placeholder">
            <span class="card-initials">${initials}</span>
          </div>
        </div>
        <div class="card-info">
          <h3 class="card-name">${card.name}</h3>
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
  function createCardBackElement() {
    const cardEl = document.createElement("div");
    cardEl.className = `star-card card-back`;
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
      
      const defaultVal = defaultNames[i - 1] || `Player ${i}`;
      
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
            <input type="text" id="player-name-${i}" class="player-name-input" value="${defaultVal}" placeholder="Enter Name" maxlength="15" required>
            
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
      for (let i = 1; i <= playerInputCount; i++) {
        if (i !== index) {
          const inputVal = document.getElementById(`player-name-${i}`).value;
          currentValues.push(inputVal);
          currentSelectedAvatars.push(playerAvatars[i]);
        }
      }
      
      playerInputCount--;
      
      // Re-map avatars
      playerAvatars = {};
      currentSelectedAvatars.forEach((avatarIdx, idx) => {
        playerAvatars[idx + 1] = avatarIdx;
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
      seat.className = "player-seat";
      seat.dataset.playerId = p.id;
      
      const isActive = activePlayer && p.id === activePlayer.id;
      const isEliminated = p.stackCount === 0;
      
      if (isActive) seat.classList.add("active-turn-seat");
      if (isEliminated) seat.classList.add("eliminated-seat");
      
      // Determine Stack Thickness class
      let thicknessClass = "stack-thin";
      if (p.stackCount > 30) {
        thicknessClass = "stack-thick";
      } else if (p.stackCount > 10) {
        thicknessClass = "stack-medium";
      }
      seat.classList.add(thicknessClass);

      // Setup Seat layout
      seat.innerHTML = `
        <div class="player-avatar-wrapper">
          <img src="${p.avatar}" alt="${p.name}" draggable="false">
          ${isActive ? `<span class="player-seat-active-badge">Playing</span>` : ""}
          ${p.id === game.currentPotStarterIndex ? `<span class="player-seat-starter-badge" title="Starter (Played First)">⭐ Starter</span>` : ""}
        </div>
        <div class="player-seat-info">
          <span class="player-seat-name">${p.name}</span>
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
          ? (p.username === (window.auth.getCurrentUser()?.username) && p.id === activePlayer.id)
          : (p.id === activePlayer.id);

        if (isCardSelectable) {
          // ACTIVE player sees top card face-up
          // Clicking the card triggers standard play
          const topCard = p.stack[0];
          const cardEl = createCardElement(topCard, true, handleCardSelection);
          pile.appendChild(cardEl);
          
          // Add shuffle button if player has multiple cards
          if (p.stackCount > 1) {
            const actionOverlay = document.createElement("div");
            actionOverlay.className = "stack-action-overlay";
            actionOverlay.innerHTML = `<button type="button" class="btn secondary-btn" id="shuffle-btn-${p.id}">🔀 Shuffle</button>`;
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
          const cardEl = createCardBackElement();
          pile.appendChild(cardEl);
        }
      } else {
        // Render arcade-style Buy Stack overlay
        const buyOverlay = document.createElement("div");
        buyOverlay.className = "buy-stack-overlay";
        
        let buttonHtml = "";
        if (p.freeStackBuys > 0) {
          buttonHtml = `<button type="button" class="btn buy-btn free-buy-btn" data-player-id="${p.id}">Free Stack<br><span class="btn-sub">${p.freeStackBuys} left</span></button>`;
        } else if (p.coins >= 100) {
          buttonHtml = `<button type="button" class="btn buy-btn coin-buy-btn" data-player-id="${p.id}">Buy Stack<br><span class="btn-sub">🪙 100 Coins</span></button>`;
        } else {
          buttonHtml = `<button type="button" class="btn buy-btn broke-buy-btn" data-player-id="${p.id}">Get 300 Coins<br><span class="btn-sub">Free Coins</span></button>`;
        }
        
        buyOverlay.innerHTML = `
          <div class="buy-overlay-title">OUT</div>
          ${buttonHtml}
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
        if (window.isOnlineGame && playerObj && playerObj.username !== window.auth.getCurrentUser()?.username) {
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
    
    // Sort players by stackCount descending
    const scores = [...game.players].sort((a, b) => b.stackCount - a.stackCount);
    
    scores.forEach((p, idx) => {
      const item = document.createElement("li");
      item.className = "score-item";
      if (activePlayer && p.id === activePlayer.id) {
        item.classList.add("active-turn");
      }
      if (p.stackCount === 0) {
        item.classList.add("eliminated");
      }
      
      let badge = "";
      if (idx === 0 && p.stackCount > 0) badge = "👑 ";
      
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
      });
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
      playTouchSound();
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

    // Call game engine
    const outcome = game.playCard(cardInstanceId);

    if (outcome.error) {
      alert(outcome.error);
      return;
    }

    // --- ANIMATION: FLY CARD TO POT ---
    const floatCard = createCardElement(cardToAnimate);
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
        const tempCardEl = createCardElement(cardToAnimate);
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
        triggerWinFlash(outcome);
      } else {
        // Standard turn transition
        renderPot();
        renderSeats();
        renderScoreboard();
        renderLogs();
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
          // Winner starts the next round. Their turn continues; update HUD elements.
          const nextPlayer = game.getCurrentPlayer();
          hudActivePlayerName.textContent = nextPlayer.name;
          hudRoundNum.textContent = game.roundNumber;
          renderSeats();
        }
      }, 300);
    }, 1800);
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
    }
  }

  // Trigger final screen and results
  function triggerGameOver() {
    const standings = game.endGame();
    renderFinalStandings(standings);
    
    gameScreen.classList.add("hidden");
    endScreen.classList.remove("hidden");
  }

  function renderFinalStandings(standings) {
    finalStandingsList.innerHTML = "";
    
    // Check highest count
    const maxCards = standings[0] ? standings[0].stackCount : 0;

    standings.forEach((p, idx) => {
      const item = document.createElement("div");
      item.className = "standing-row";
      if (p.stackCount === maxCards && maxCards > 0) {
        item.classList.add("winner-highlight");
      }

      let medal = "🎗️";
      if (idx === 0 && p.stackCount > 0) medal = "🥇 Gold (Winner)";
      else if (idx === 1 && p.stackCount > 0) medal = "🥈 Silver";
      else if (idx === 2 && p.stackCount > 0) medal = "🥉 Bronze";
      else if (p.stackCount === 0) medal = "💀 Eliminated";

      item.innerHTML = `
        <div class="standing-rank">${idx + 1}</div>
        <div class="standing-name">${p.name}</div>
        <div class="standing-medal">${medal}</div>
        <div class="standing-count">${p.stackCount} cards</div>
      `;
      finalStandingsList.appendChild(item);
    });
  }

  // --- DRAWER TOGGLE CLICKS ---
  drawerToggleBtn.addEventListener("click", () => {
    sideDrawer.classList.remove("hidden-drawer");
  });

  drawerCloseBtn.addEventListener("click", () => {
    sideDrawer.classList.add("hidden-drawer");
  });

  // Close hand modal clicks
  modalCloseBtn.addEventListener("click", closePrivateHandModal);

  // --- BUTTON CLICKS ---

  // Add/remove setup events
  addPlayerBtn.addEventListener("click", addPlayerField);

  // Ready button on Turn Shield clicked
  shieldReadyBtn.addEventListener("click", () => {
    playReadySound();
    hideTurnShield();
  });

  startGameBtn.addEventListener("click", (e) => {
    e.preventDefault();
    
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

    const stackSize = 30; // Lock stack size to 30 greetings

    // Initialize state
    game.initializeGame(playerNames, stackSize, playerBets);
    
    // Load placement config option
    const placementMode = document.getElementById("placement-mode").value || "middle";
    game.config.CARD_PLACEMENT_MODE = placementMode;
    
    // Bind avatar URL properties to the player objects dynamically
    game.players.forEach((p, idx) => {
      p.avatar = playerAvatarUrls[idx];
    });

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
      showTurnShield(game.getCurrentPlayer());
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
    endScreen.classList.add("hidden");
    
    // Redirect to dashboard and sync coins won/lost during the match
    const dashboardView = document.getElementById("dashboard-screen");
    if (dashboardView && window.auth) {
      dashboardView.classList.remove("hidden");
      const user = window.auth.getCurrentUser();
      if (user) {
        const playerObj = game.players.find(p => p.name === user.name);
        if (playerObj) {
          const accounts = window.auth.getAccounts();
          accounts[user.username].coins = playerObj.coins;
          window.auth.saveAccounts(accounts);
        }
      }
      // Re-trigger auth initialization to refresh profile stats on dashboard
      const updatedUser = window.auth.getCurrentUser();
      if (updatedUser) {
        document.getElementById("dashboard-profile-name").textContent = updatedUser.name;
        document.getElementById("dashboard-profile-coins").textContent = updatedUser.coins;
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

  const onlineCreateRoomBtn = document.getElementById("online-create-room-btn");
  if (onlineCreateRoomBtn) {
    onlineCreateRoomBtn.addEventListener("click", () => {
      playTouchSound();
      window.multiplayer.createRoom();
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
        if (urlInput && window.multiplayer) {
          window.multiplayer.saveDbConfig(urlInput.value);
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

  // Initialize view
  renderPlayerSetupFields();
});
