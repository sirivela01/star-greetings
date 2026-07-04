# Walkthrough - Barakatta Traditional Board Game Integration & Victory Music Fix

We have successfully integrated the traditional Indian board game **Barakatta** (12 Katta) as an independent sibling alongside **Star Greetings**, sharing a unified authentication wrapper, while also implementing the YouTube Player API fixes for celebrity victory songs.

---

## 1. Barakatta Board Game Integration

All code and styling assets for Barakatta reside in the new, isolated `barakatta/` subdirectory, keeping Star Greetings files completely untouched.

### A. Game Selection routing
- **Flow Integration** in [js/auth.js](file:///c:/Users/syash/Downloads/python/star-greetings/js/auth.js) & [index.html](file:///c:/Users/syash/Downloads/python/star-greetings/index.html):
  - Updated starting stack configs, buy stack size, warning alerts, HTML labels, and backend API endpoints (such as `get_player_greetings` and `start_match_deduction`) to **50 cards** across [app.py](file:///c:/Users/syash/Downloads/python/star-greetings/app.py), [game-logic.js](file:///c:/Users/syash/Downloads/python/star-greetings/js/game-logic.js), [auth.js](file:///c:/Users/syash/Downloads/python/star-greetings/js/auth.js), [ui-rendering.js](file:///c:/Users/syash/Downloads/python/star-greetings/js/ui-rendering.js), and [index.html](file:///c:/Users/syash/Downloads/python/star-greetings/index.html).
  - Added a new `#game-selection-screen` following a successful account login/registration check.
  - Features two selectable glass cards: **Star Greetings** (routes to the card game arcade) and **Barakatta** (routes to the new board game arcade).
  - Keeps game state persistent by storing selection to `window.selectedGame`.

### B. Barakatta Arcade Dashboard
- **Layout & Traditional Visuals** in [index.html](file:///c:/Users/syash/Downloads/python/star-greetings/index.html) & [barakatta/css/styles.css](file:///c:/Users/syash/Downloads/python/star-greetings/barakatta/css/styles.css):
  - Styled with a rustic, warm terracotta, deep wood brown, and brass gold palette.
  - Implements the "Play with AI Bot" mode (active) and presents disabled "Pass & Play" and "Online Game" options as future expansions.
  - Displays user profile data, coin wallet, and Barakatta match wins.

### C. 8x8 Board geometry & config
- **Data Configuration** in [barakatta/js/board-config.js](file:///c:/Users/syash/Downloads/python/star-greetings/barakatta/js/board-config.js):
  - Defines the 28-cell counter-clockwise outer path starting at the bottom player start index (`0`), spaced symmetrically by 7 cells for 4 players.
  - Coordinates starting points and the 4 corners as Safe Squares (marked with X).
  - Maps 3-cell clockwise home stretches ending in private center home cells.

### D. Core Game logic
- **Functional Engine** in [barakatta/js/game-logic.js](file:///c:/Users/syash/Downloads/python/star-greetings/barakatta/js/game-logic.js):
  - **Dice Rules**:
    - Rolling a 6 allows entering all 6 yard rocks onto the start square and grants an extra roll.
    - Rolling a 1 offers a choice between entering exactly 1 rock or moving an active on-board rock.
    - Rolling 2, 3, 4, 5 permits moving on-board rocks only.
  - **Capture Dynamics**: Land on an opponent's rock on a non-safe cell to send it back to their yard, unlocking your rock to enter the home stretch, and gain an extra turn.
  - **Win Checks**: Triggered when a player moves all 6 rocks precisely into the center home cells.

### E. AI Bot Opponent & Canvas UI
- **AI Behavior & Board Rendering** in [barakatta/js/ui-rendering.js](file:///c:/Users/syash/Downloads/python/star-greetings/barakatta/js/ui-rendering.js):
  - **AI Bot Heuristics**: Rolls cowries on its turn and prioritizes actions by: (1) capturing player rocks, (2) entering all rocks on a 6, (3) moving rocks closest to landing exactly home, and (4) making random legal moves.
  - **Interactive Canvas**: Redraws the 8x8 grid, safe zones, and stacks matching cell tokens in group circular offsets. Highlights player rocks that have valid movements.
  - **Step Animations**: Smoothly shifts tokens cell-by-cell along the path rather than jumping instantly.
  - **Firebase Tracking**: Persists statistics under `barakatta/userStats/{uid}` and logs match results to `barakatta/matches/`.

---

## 2. Star Greetings Victory Music Fix
- **Standard YouTube API Setup** in [js/victory-music.js](file:///c:/Users/syash/Downloads/python/star-greetings/js/victory-music.js):
  - Replaced the manual iframe injection sequence with the standard YouTube API container `div` replacement constructor (`new YT.Player`).
  - Sets up secure postMessage event communication channels, allowing celebrity victory songs to unmute and auto-play immediately upon winning a match.

---

- **DOM Nesting & Rendering Fix**: Resolved a critical layout issue where the Barakatta game screen was rendered outside the `#app-root` wrapper. Moving the closing `</div>` tag of `#app-root` to the end of [index.html](file:///c:/Users/syash/Downloads/python/star-greetings/index.html) places all screens within the flex wrapper, resolving the empty blank screen issue when starting the game.
- **Vibrant Button Styles**: Replaced the transparent inline button backgrounds in the Barakatta dashboard with rich terracotta-to-bronze linear gradients and shiny gold border glows inside [barakatta/css/styles.css](file:///c:/Users/syash/Downloads/python/star-greetings/barakatta/css/styles.css).
- **Symmetric 7x7 Grid Board (Ashta Chamma)**: Updated the board configuration to use a traditional symmetric 7x7 grid instead of 8x8. The outer track length has been updated from 28 cells to 24 cells. Home stretches are scaled to 3 cells leading to the central cell `(3, 3)`. The board now features exactly the 9 safe 'X' squares in a symmetric layout:
  - Top/Bottom center: `(0, 3)`, `(6, 3)`
  - Left/Right center: `(3, 0)`, `(3, 6)`
  - Center: `(3, 3)`
  - Inner quadrant corners: `(1, 1)`, `(1, 5)`, `(5, 1)`, `(5, 5)`
- **True 3D DOM-based Board Scene & Beveled Extruded Tiles**:
  - Replaced the 2D canvas entirely with a hardware-accelerated 3D DOM scene wrapper (`.barakatta-board-scene`) containing a `.barakatta-board` tilted backward at a realistic 46-degree angle (`transform: rotateX(46deg)`).
  - Built a 3D wood frame border with depth and a darker bottom extrusion face (`translateZ` / `rotateX(-90deg)`).
  - Designed extruded maple wood (`#c49c74`) and walnut wood (`#5c3a21`) checkered tiles. Normal tiles are extruded 6px vertically, and safe tiles are extruded 10px vertically.
  - Safe tiles feature shiny metallic 3D chrome SVG X-icons and pulsing neon glow trims matching the owner player.
- **3D Sphere Rocks & Hop/Capture Animations**:
  - Rendered player rocks as 3D red/amber sphere tokens using radial gradients.
  - Added a staggered/fanned positioning math for tiles holding multiple tokens.
  - Wired hop animations (`translate3d` up in Z and down) for rock movement, and fly-out pop animations for captured tokens.
- **3D Tumbling Dice**:
  - Replaced the flat dice box icon with a 3d css cube (`.dice-cube`) consisting of 6 faces and 3D pip dot structures.
  - Programmed rolling tumble rotations that spin the cube multiple times before aligning the correct face to the camera.
- **Performance & Reduced-Motion Fallback**:
  - Added a `@media (prefers-reduced-motion: reduce)` rule that disables dice spins and rock hops for low-power devices.
- **Teal/Emerald Radial Gradient Tabletop Background**: Replaced the dark brown background in the Barakatta tabletop screen with a premium dark-emerald/teal radial gradient (`#06362e` to `#010c0a`) directly matching the chess app screenshot.
- **Symmetric 7x7 Concentric Ring Board**:
  - Implemented programmatic spiral ring generation (`generateRings(rows, cols)`) producing four nested concentric rings: `rings[0]` (outer 24 cells), `rings[1]` (inner 16 cells), `rings[2]` (inner 8 cells), and `rings[3]` (central cell `(3, 3)` which acts as the HOME zone).
  - Rotated and aligned ring paths clockwise for all players to move in the same rotational direction.
- **Ring-to-Ring Advancement & Blocked States**:
  - Added the Traditional Barakatta Advancement Rule: rocks must complete their current ring, and can only advance inward if they captured an opponent during this ring (`hasCapturedThisRing = true`) or if the step into the next ring's entry cell captures an opponent there.
  - Rocks that reach the end of a ring without a capture are marked as `"blocked"`, frozen until a capture option opens up or they themselves are captured.
- **Safe-Square Stacking & Same-Player Stacking Prohibition**:
  - Rocks can stack indefinitely on Safe Squares (X) without capture.
  - Stacking own rocks on non-start non-safe cells is now prohibited, rendering moves invalid.
- **AI Bot Priority Upgrades**:
  - Upgraded Bot decision priority: 1) Execute capture moves; 2) Capture to unlock blocked advancement; 3) Move rocks with active captures near their ring ends; 4) Enter on 6/1; 5) Favor progress.
- **Offline Pass & Play (Local Multi-player) Mode**:
  - Enabled the **Play Offline (Pass & Play)** button on the Barakatta dashboard.
  - Rewrote turn validation inside [ui-rendering.js](file:///c:/Users/syash/Downloads/python/star-greetings/barakatta/js/ui-rendering.js) to dynamically support turn switching between two human players on the same device. For Player 2 (the opponent), it enables active dice rolls and 3D rock selection clicks, skipping the computer AI execution routine.
  - Customised HUD labels and Game Over banners to reflect Player 1 vs Player 2 winner results.
- **Counter-Clockwise Paths & Outer X Starts**:
  - Configured all paths to move **counter-clockwise** around the concentric rings, matching the layout directions in your pen-and-paper drawing.
  - Assigned start indices dynamically from the outer safe X squares, and computed ring transition cells dynamically.
- **Board SVG Arrow Lines Overlay & Color-Coded Lanes**:
  - Created a hardware-accelerated SVG overlay (`.bk-board-arrows`) aligned on top of the 3D board scene grid.
  - Assigned distinct colors and markers to all 4 players (Red for Player 1, Blue for Player 2, Yellow for Player 3/Bot, and Green for Player 4) with offsets to separate them into parallel lanes so they don't overlap.
  - Implemented **Multi-Layered Path Rendering** matching your Ludo reference image: draws a thick, semi-transparent colored background ribbon (`stroke-width="16" opacity="0.15"`) to show the path's color while letting the board's wooden texture show through from underneath, with a bright, solid foreground arrow line (`opacity="0.75"`) on the upper layer.
  - **Clean Path Overlay & L-turns**: Restored the full drawing of loop paths (removing the simplified transitions-only overlay) to display the entire continuous pathways. Because Ring 1 and Ring 2 are clockwise, the paths naturally form 90-degree "L" shape turns at the corners where the safe X marks reside (e.g. at `(1,1)`, `(1,5)`, `(5,5)`). Arrowhead markers are placed at the starting segment and every 6th segment of the loops to maintain clean readability.
  - **Corner & Inner X Mark Alignments**: Reconfigured all player ring paths to match the exact coordinate sequences and diagonal/vertical transitions from your hand-drawn path diagram:
    - **Player 1 (Red)**: Ring 0 is counter-clockwise and ends at `(6,2)`, transitioning diagonally up-left to the bottom-left inner X mark `(5,1)`. Ring 1 and Ring 2 are clockwise, looping all the way around to `(5,3)` and `(4,3)` respectively. This resolves the array truncation bug, aligning the diagonal transitions `(6,2)->(5,1)`, `(5,3)->(4,2)` and vertical home transition `(4,3)->(3,3)` exactly with your diagram.
    - Parallel rotations are defined for the other three players.
  - Resolved Z-index overlapping in 3D CSS rendering by adding `transform: translateZ(10.2px)` to the SVG lane overlay so it floats above the 6px normal and 10px safe beveled tiles.
  - Adjusted the player rock tokens base translation to `translateZ(12px)` and aligned hop animations in [styles.css](file:///c:/Users/syash/Downloads/python/star-greetings/barakatta/css/styles.css) to ensure they always sit on top of the lane arrows.
  - **Extra Turn Rule on 6 or 1**: Updated the game state transition inside [game-logic.js](file:///c:/Users/syash/Downloads/python/star-greetings/barakatta/js/game-logic.js) so that both rolling a **6** and rolling a **1** grant the active player another roll chance. Any other roll switches the turn.
  - **Local Multiplayer Turn Switching**: Ensured that the turn transitions correctly in `"offline"` Pass & Play mode between player 1 (Red) and player 3 (Yellow).
  - **UI Freeze Bug Fix**: Removed obsolete `stepsMoved` math and redundant cell-by-cell intermediate loops from [ui-rendering.js](file:///c:/Users/syash/Downloads/python/star-greetings/barakatta/js/ui-rendering.js) which caused `NaN` calculations and hung the UI state transition. Rocks now move instantly using clean, hardware-accelerated 3D CSS hop transitions, allowing smooth turn handovers.
  - **Ludo-Style Dynamic Path Highlights**: 
    - Removed permanent static pathway lane lines to keep the 3D board grid clean and clear of clutter.
    - Added `getRockStepPath` helper to [game-logic.js](file:///c:/Users/syash/Downloads/python/star-greetings/barakatta/js/game-logic.js) to trace the exact coordinate path a rock travels for a given roll.
    - Implemented hover and click-select previews: hovering or tapping an active rock draws a glowing neon path representing its next steps with an arrowhead pointing at the destination cell, which flashes green with `.target-highlight` CSS keyframes.
    - Tap/click once selects a rock and draws the path; tapping it again (or tapping the target cell) confirms and executes the move. Clicking elsewhere cancels the selection.
    - Bots show their planned movement paths in yellow for 800ms before moving their piece to make CPU moves easy to follow.
  - **Solo Mode Turn Transition Bug Fix**: Fixed a bug where the game mode string `"ai_bot"` was not handled in the turn transition check (`this.mode === "solo" || this.mode === "offline"`), which caused the turn to stay with Player 1 (Red) forever and prevented the Bot from playing. Added `"ai_bot"` to the nextTurn check so that solo matches transition correctly to the AI Bot.
  - **Opponent Capture (Kill) Bug Fix**: Resolved a critical issue where landing on an opponent's rock on a non-safe cell did not trigger a capture (allowing red and yellow rocks to sit on the same space). The original `getOccupant` check returned the moving rock itself once its coordinates were updated, masking the opponent piece. Added the `getOpponentOccupant` helper to safely identify opponent rocks only, ensuring captures execute correctly and return opponent rocks to their respective yards.
  - **3D Dice Face Rotation Mismatch Fix**: Resolved a visual bug where rolling a 3 showed 4 pips on the dice face, and rolling a 4 showed 3 pips. Swapped the X-axis rotations for rolls of 3 and 4 in `diceRotations` inside [ui-rendering.js](file:///c:/Users/syash/Downloads/python/star-greetings/barakatta/js/ui-rendering.js) to ensure the visual pips match the actual moves.
  - **Traditional Global Capture Lock Rule**: Restructured the capture lock transition check from a per-rock check (`hasCapturedThisRing`) to a global player check (`this.hasCapturedAnOpponent[playerId]`). A player (or Bot) can only transition their pieces from the outer ring to the middle/inner rings if they have captured at least one opponent piece during the entire match. If they have not made any captures, they are strictly blocked at the end of the ring.

## Verification Results
- **Compile Success**: Code compiles cleanly: `python -m py_compile app.py`.
- **UI & Routing**: Web interface scales dynamically and loads assets reliably.
- **Gameplay Loop**: Concentric path loops, counter-clockwise paths, safety square stacks, 3D animations, offline Pass & Play, and clean multi-layered player lanes operate correctly.
