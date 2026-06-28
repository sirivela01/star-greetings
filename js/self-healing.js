/**
 * Star Greetings - Self-Healing & Diagnostic Recovery Engine
 * Automatically detects runtime errors, recovers UI state, and resolves data anomalies.
 */

(function () {
  console.log("🛡️ Star Greetings Self-Healing Engine initialized.");

  // Keep a history of caught errors
  const errorLogs = [];
  let healingBannerTimeout = null;

  // 1. Listen for global JavaScript errors
  window.onerror = function (message, source, lineno, colno, error) {
    const errorDetails = {
      type: "Runtime Error",
      message: message,
      source: source || "unknown",
      line: lineno || 0,
      column: colno || 0,
      stack: error ? error.stack : null,
      timestamp: new Date().toISOString()
    };

    handleException(errorDetails);
    return false; // Let browser process it as well (but we heal it)
  };

  // 2. Listen for unhandled promise rejections (async/fetch/Firebase failures)
  window.addEventListener("unhandledrejection", function (event) {
    const errorDetails = {
      type: "Unhandled Promise Rejection",
      message: event.reason ? (event.reason.message || String(event.reason)) : "Unknown rejection",
      stack: event.reason && event.reason.stack ? event.reason.stack : null,
      timestamp: new Date().toISOString()
    };

    handleException(errorDetails);
  });

  /**
   * Processes the exception and runs the self-healing routine.
   */
  function handleException(err) {
    console.warn("⚠️ Self-Healing Engine intercepted error:", err.message);
    errorLogs.push(err);

    // Keep log size bounded
    if (errorLogs.length > 50) {
      errorLogs.shift();
    }

    // Try to log the crash telemetry to Firebase (if online and database is active)
    logTelemetryToFirebase(err);

    // Trigger healing procedure
    try {
      runHealingRoutine(err);
    } catch (healError) {
      console.error("❌ Critical: Healing routine failed to execute:", healError);
    }
  }

  /**
   * Heals UI states, stuck loaders, and game anomalies.
   */
  function runHealingRoutine(err) {
    let healingMessages = [];

    // --- HEAL STUCK UI SPINNERS AND OVERLAYS ---
    
    // Recovery 1: Stuck custom theme loading spinner
    const customThemeLoading = document.getElementById("custom-theme-loading");
    const generateThemeBtn = document.getElementById("generate-theme-btn");
    const cancelThemeBtn = document.getElementById("cancel-theme-btn");
    if (customThemeLoading && !customThemeLoading.classList.contains("hidden") && customThemeLoading.style.display !== "none") {
      customThemeLoading.classList.add("hidden");
      customThemeLoading.style.display = "none";
      if (generateThemeBtn) generateThemeBtn.style.display = "block";
      if (cancelThemeBtn) cancelThemeBtn.style.display = "block";
      healingMessages.push("Stuck theme generator loading spinner dismissed.");
    }

    // Recovery 2: Stuck guess round overlay or placing phase screens
    const guessingRoundOverlay = document.getElementById("guessing-round-overlay");
    if (guessingRoundOverlay && !guessingRoundOverlay.classList.contains("hidden")) {
      // If the game state says guessing is NOT active but the overlay is visible
      const isOfflineActive = window.offlineGuessingState && window.offlineGuessingState.active;
      const isOnlineActive = window.multiplayer && window.multiplayer.roomState && window.multiplayer.roomState.guessingRound;
      
      if (!isOfflineActive && !isOnlineActive) {
        guessingRoundOverlay.classList.add("hidden");
        guessingRoundOverlay.style.display = "none";
        healingMessages.push("Stuck guessing round screen dismissed.");
      }
    }

    // Recovery 3: Reset blank screen to theme selection or main dashboard
    const allScreens = [
      "login-screen", "signup-screen", "forgot-password-screen",
      "dashboard-screen", "setup-screen", "theme-selection-screen",
      "game-screen", "online-lobby-screen", "online-game-screen"
    ];
    let allHidden = true;
    allScreens.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.classList.contains("hidden")) {
        allHidden = false;
      }
    });
    if (allHidden) {
      const dashboard = document.getElementById("dashboard-screen");
      if (dashboard) {
        dashboard.classList.remove("hidden");
        healingMessages.push("Blank screen detected. Restored dashboard view.");
      }
    }

    // --- HEAL CORRUPT GAME LOOP STATES ---
    if (window.game) {
      const game = window.game;

      // Recovery 4: Validate and repair players array
      if (!Array.isArray(game.players)) {
        game.players = [];
        healingMessages.push("Corrupted player state re-initialized.");
      }

      // Recovery 5: Out of bounds turn index repair
      if (game.players.length > 0 && (game.currentPlayerIndex < 0 || game.currentPlayerIndex >= game.players.length)) {
        game.currentPlayerIndex = 0;
        healingMessages.push("Invalid active turn index repaired.");
      }

      // Recovery 6: Fix empty or corrupt card stacks
      game.players.forEach(p => {
        if (!Array.isArray(p.stack)) {
          p.stack = [];
          p.stackCount = 0;
          healingMessages.push(`Repaired corrupt cards stack for ${p.name}.`);
        }
        // Filter out null cards
        const originalLen = p.stack.length;
        p.stack = p.stack.filter(c => c && c.id && c.name);
        if (p.stack.length !== originalLen) {
          p.stackCount = p.stack.length;
          healingMessages.push(`Removed corrupt card instances from ${p.name}'s stack.`);
        }
      });

      // Recovery 7: Fix negative coin balances or invalid consensus bets
      if (game.potAmount < 0) {
        game.potAmount = 0;
        healingMessages.push("Corrected negative pot balance to 0.");
      }
    }

    // --- RE-RENDER STABLE VIEW IF RECOVERY ACTIONS WERE TAKEN ---
    if (healingMessages.length > 0) {
      console.log("🔧 Self-Healing Engine successfully applied corrections:", healingMessages);
      
      // Re-trigger layout updates
      if (window.renderSeats) window.renderSeats();
      if (window.renderPot) window.renderPot();
      if (window.renderScoreboard) window.renderScoreboard();

      // Notify the player
      showHealingAlert(err.message, healingMessages);
    }
  }

  /**
   * Dispatches telemetry logs directly to Firebase under '/crashes' endpoint.
   */
  async function logTelemetryToFirebase(err) {
    if (!window.multiplayer || !window.multiplayer.roomRef) return;
    try {
      const roomRef = window.multiplayer.roomRef;
      const crashRef = roomRef.child("crashes").push();
      await crashRef.set({
        message: err.message,
        type: err.type,
        line: err.line || "N/A",
        stack: err.stack || "N/A",
        timestamp: err.timestamp,
        userAgent: navigator.userAgent
      });
    } catch (e) {
      // Fail silently to avoid infinite recursion loops on log errors
    }
  }

  /**
   * Displays a beautiful, premium floating alert detailing the self-healing outcome.
   */
  function showHealingAlert(errorMsg, solutions) {
    // Remove any existing healing banner
    const existing = document.getElementById("self-healing-banner");
    if (existing) {
      existing.remove();
    }

    const banner = document.createElement("div");
    banner.id = "self-healing-banner";
    banner.className = "healing-banner-stagger";

    // Premium styling
    banner.style.position = "fixed";
    banner.style.top = "20px";
    banner.style.right = "20px";
    banner.style.zIndex = "999999";
    banner.style.maxWidth = "360px";
    banner.style.background = "linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(15, 23, 42, 0.95))";
    banner.style.border = "1px solid rgba(16, 185, 129, 0.4)";
    banner.style.borderRadius = "12px";
    banner.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(16, 185, 129, 0.2)";
    banner.style.color = "#fff";
    banner.style.padding = "16px";
    banner.style.fontFamily = "'Outfit', sans-serif";
    banner.style.fontSize = "0.85rem";
    banner.style.cursor = "pointer";
    banner.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    banner.style.transform = "translateX(120%)";

    const solutionsListHtml = solutions.map(s => `<li>🛡️ ${s}</li>`).join("");

    banner.innerHTML = `
      <div style="display: flex; gap: 12px; align-items: flex-start;">
        <div style="background: rgba(16, 185, 129, 0.1); padding: 8px; border-radius: 8px; color: #10b981; font-size: 1.25rem; display: flex; align-items: center; justify-content: center; animation: pulse-shield 1.5s infinite;">
          🛡️
        </div>
        <div style="flex: 1;">
          <h4 style="margin: 0 0 4px; font-weight: 700; color: #10b981; display: flex; align-items: center; justify-content: space-between;">
            Self-Healing Active
            <span style="font-size: 0.7rem; background: rgba(16, 185, 129, 0.2); padding: 2px 6px; border-radius: 4px; color: #10b981; font-weight: 500;">RESOLVED</span>
          </h4>
          <p style="margin: 0 0 8px; font-size: 0.78rem; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 250px;">
            ${errorMsg}
          </p>
          <ul style="margin: 0; padding: 0 0 0 4px; list-style: none; font-size: 0.75rem; color: #34d399; line-height: 1.4;">
            ${solutionsListHtml}
          </ul>
        </div>
      </div>
      <div id="self-healing-expand" style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); display: none; font-size: 0.72rem; color: #9ca3af; text-align: right;">
        Click to Force Restart Game State 🔄
      </div>
    `;

    document.body.appendChild(banner);

    // Animate slide-in
    void banner.offsetWidth; // trigger reflow
    banner.style.transform = "translateX(0)";

    // Expand menu on click
    banner.addEventListener("click", function (e) {
      const expandDiv = document.getElementById("self-healing-expand");
      if (expandDiv.style.display === "none") {
        expandDiv.style.display = "block";
      } else {
        // Force restart game
        if (confirm("Would you like to force restart the game state to ensure clean play? (Coins/Cards are saved)")) {
          window.location.reload();
        }
      }
    });

    // Auto dismiss after 7.5 seconds
    if (healingBannerTimeout) clearTimeout(healingBannerTimeout);
    healingBannerTimeout = setTimeout(() => {
      banner.style.transform = "translateX(120%)";
      setTimeout(() => banner.remove(), 400);
    }, 7500);
  }

  // Exposed API globally
  window.selfHealingEngine = {
    getErrorLogs: () => errorLogs,
    forceHeal: () => {
      runHealingRoutine({ message: "Manual self-healing triggered." });
    },
    triggerTestError: () => {
      setTimeout(() => {
        throw new Error("Self-Healing Test: Simulated game execution error resolved!");
      }, 50);
    }
  };

  // Add css keyframes for pulse-shield
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    @keyframes pulse-shield {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
      70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
  `;
  document.head.appendChild(styleEl);

})();
