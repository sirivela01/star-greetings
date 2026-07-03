# Barakatta Solo (P1 vs Bot) Path & Rule Guide

This guide details the exact cell-by-cell coordinate paths, transition rules, capture mechanics, and win conditions for the **Red Player (Player 1)** and the **Yellow Bot (Player 3)**.

---

## 🔴 Player 1 (Human - Red) Path

Player 1 seats at the **Bottom** of the board and moves in a counter-clockwise direction around each ring.

### 1. Ring 0 (Outer Loop - 22 Cells)
- **Start Cell (Outer X Mark)**: `(6, 3)` (Bottom Center)
- **Pathway**: Moves to the right, loops around the perimeter, and ends at the bottom-left corner:
  ` (6,3) [Start] -> (6,4) -> (6,5) -> (6,6) [Bottom-Right Corner] `
  ` -> (5,6) -> (4,6) -> (3,6) -> (2,6) -> (1,6) -> (0,6) [Top-Right Corner] `
  ` -> (0,5) -> (0,4) -> (0,3) -> (0,2) -> (0,1) -> (0,0) [Top-Left Corner] `
  ` -> (1,0) -> (2,0) -> (3,0) -> (4,0) -> (5,0) -> (6,0) [Bottom-Left Corner] `
- **Transition 0 ➔ 1**: From `(6,0)` (Bottom-Left Corner), moves diagonally up-right to `(5, 1)` (Bottom-Left Inner X Mark).
  > [!IMPORTANT]
  > **Kill-to-Advance Rule**: A rock cannot make this transition and is "blocked" at `(6,0)` unless it has captured at least one opponent rock during its Ring 0 lap.

### 2. Ring 1 (Middle Loop - 17 Cells)
- **Entry Cell (Inner X Mark)**: `(5, 1)` (Bottom-Left Inner X Mark)
- **Pathway**: Loops counter-clockwise and returns to the same entry cell:
  ` (5,1) [Entry] -> (5,2) -> (5,3) -> (5,4) -> (5,5) [Bottom-Right Inner Corner] `
  ` -> (4,5) -> (3,5) -> (2,5) -> (1,5) [Top-Right Inner Corner] `
  ` -> (1,4) -> (1,3) -> (1,2) -> (1,1) [Top-Left Inner Corner] `
  ` -> (2,1) -> (3,1) -> (4,1) -> (5,1) [Back to Bottom-Left Inner Corner] `
- **Transition 1 ➔ 2**: From `(5,1)`, moves diagonally up-right to `(4, 2)`.
  > [!IMPORTANT]
  > Requires a fresh capture during the Ring 1 lap.

### 3. Ring 2 (Inner Loop - 9 Cells)
- **Entry Cell**: `(4, 2)`
- **Pathway**: Loops counter-clockwise and returns to the entry cell:
  ` (4,2) [Entry] -> (4,3) -> (4,4) -> (3,4) -> (2,4) -> (2,3) -> (2,2) -> (3,2) -> (4,2) `
- **Transition 2 ➔ 3**: From `(4,2)`, moves diagonally up-right to the center Home `(3, 3)`.
  > [!IMPORTANT]
  > Requires a fresh capture during the Ring 2 lap.

---

## 🟡 Player 3 (Robot / Bot - Yellow) Path

The Bot starts at the **Top** of the board and moves in a counter-clockwise direction around each ring.

### 1. Ring 0 (Outer Loop - 22 Cells)
- **Start Cell (Outer X Mark)**: `(0, 3)` (Top Center)
- **Pathway**: Moves to the left, loops around the perimeter, and ends at the top-right corner:
  ` (0,3) [Start] -> (0,2) -> (0,1) -> (0,0) [Top-Left Corner] `
  ` -> (1,0) -> (2,0) -> (3,0) -> (4,0) -> (5,0) -> (6,0) [Bottom-Left Corner] `
  ` -> (6,1) -> (6,2) -> (6,3) -> (6,4) -> (6,5) -> (6,6) [Bottom-Right Corner] `
  ` -> (5,6) -> (4,6) -> (3,6) -> (2,6) -> (1,6) -> (0,6) [Top-Right Corner] `
- **Transition 0 ➔ 1**: From `(0,6)` (Top-Right Corner), moves diagonally down-left to `(1, 5)` (Top-Right Inner X Mark).
  > [!IMPORTANT]
  > **Kill-to-Advance Rule**: A rock cannot transition and is "blocked" at `(0,6)` unless it has captured at least one opponent rock during its Ring 0 lap.

### 2. Ring 1 (Middle Loop - 17 Cells)
- **Entry Cell (Inner X Mark)**: `(1, 5)` (Top-Right Inner X Mark)
- **Pathway**: Loops counter-clockwise and returns to the same entry cell:
  ` (1,5) [Entry] -> (1,4) -> (1,3) -> (1,2) -> (1,1) [Top-Left Inner Corner] `
  ` -> (2,1) -> (3,1) -> (4,1) -> (5,1) [Bottom-Left Inner Corner] `
  ` -> (5,2) -> (5,3) -> (5,4) -> (5,5) [Bottom-Right Inner Corner] `
  ` -> (4,5) -> (3,5) -> (2,5) -> (1,5) [Back to Top-Right Inner Corner] `
- **Transition 1 ➔ 2**: From `(1,5)`, moves diagonally down-left to `(2, 4)`.
  > [!IMPORTANT]
  > Requires a fresh capture during the Ring 1 lap.

### 3. Ring 2 (Inner Loop - 9 Cells)
- **Entry Cell**: `(2, 4)`
- **Pathway**: Loops counter-clockwise and returns to the entry cell:
  ` (2,4) [Entry] -> (2,3) -> (2,2) -> (3,2) -> (4,2) -> (4,3) -> (4,4) -> (3,4) -> (2,4) `
- **Transition 2 ➔ 3**: From `(2,4)`, moves diagonally down-left to the center Home `(3, 3)`.
  > [!IMPORTANT]
  > Requires a fresh capture during the Ring 2 lap.

---

## ⚔️ Key Rules & Mechanics

### 1. Starting Dice Roll
- To enter a rock onto the board's starting cell (e.g. `(6,3)` for Red), a player must roll a **6** or a **1**.
- Rolling a **6** allows you to enter all 6 rocks at once, or choose to move an active rock 6 steps.
- Rolling a **1** allows you to optionally enter a single rock onto the start cell.
- Rolling a **6** grants an **extra turn**.

### 2. Capturing Opponents (Kill)
- If a rock lands on a cell occupied by an opponent's rock, the opponent's rock is **captured** and sent back to their yard.
- Capturing is **prohibited on all Safe Squares (X Marks)**. 
- Multi-player stacking is allowed on safe cells, but stacking friendly rocks on normal cells is forbidden.

### 3. Inner Ring Locking (Kill-to-Advance)
- When a rock reaches the end of its current ring (e.g., `(6,0)` for Red's Ring 0), it is **blocked** and cannot move if it has not captured an opponent rock during that ring.
- If a rock is blocked, it must wait for a capturing opportunity to open up, or other rocks must move.

### 4. Win Condition (Home Center X)
- When all 6 rocks of a player reach the center home cell `(3,3)`, that player wins the game!
- Landing on the home cell `(3,3)` requires an **exact roll**.
