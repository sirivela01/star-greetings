// Barakatta Board Configuration - 7x7 Grid Layout
const BARAKATTA_BOARD = {
  rows: 7,
  cols: 7,
  
  // Cells marked with 'X' where pawns are safe and can stack without capture
  safeSquares: [
    { row: 6, col: 3 }, // Player 1 start
    { row: 3, col: 6 }, // Player 2 start
    { row: 0, col: 3 }, // Player 3 start
    { row: 3, col: 0 }, // Player 4 start
    { row: 3, col: 3 }, // Center home cell
    { row: 1, col: 1 }, // Top-Left inner safe
    { row: 1, col: 5 }, // Top-Right inner safe
    { row: 5, col: 1 }, // Bottom-Left inner safe
    { row: 5, col: 5 }  // Bottom-Right inner safe
  ]
};

// Programmatic 3D Spiral Ring Generation
function generateRings(rows, cols) {
  const rings = [];
  let top = 0, bottom = rows - 1, left = 0, right = cols - 1;

  while (top <= bottom && left <= right) {
    const ring = [];
    // top row, left -> right
    for (let c = left; c <= right; c++) ring.push({ row: top, col: c });
    // right col, top+1 -> bottom
    for (let r = top + 1; r <= bottom; r++) ring.push({ row: r, col: right });
    // bottom row, right-1 -> left (if bottom != top)
    if (bottom > top) for (let c = right - 1; c >= left; c--) ring.push({ row: bottom, col: c });
    // left col, bottom-1 -> top+1 (if right != left)
    if (right > left) for (let r = bottom - 1; r > top; r--) ring.push({ row: r, col: left });

    rings.push(ring);
    top++; bottom--; left++; right--;
  }
  return rings;
}

function getPlayerRingPath(ring, startIndex) {
  return [...ring.slice(startIndex), ...ring.slice(0, startIndex)];
}

function getRingEntryCell(playerId, k) {
  if (playerId === "player1") return { row: 6 - k, col: 3 };
  if (playerId === "player3") return { row: k, col: 3 };
  if (playerId === "player4") return { row: 3, col: k };
  if (playerId === "player2") return { row: 3, col: 6 - k };
  return null;
}

// Generate spiral rings and individual player paths
BARAKATTA_BOARD.rings = generateRings(BARAKATTA_BOARD.rows, BARAKATTA_BOARD.cols);
// Reverse each ring to make it counter-clockwise
BARAKATTA_BOARD.rings.forEach(ring => ring.reverse());

BARAKATTA_BOARD.playerPaths = {
  player1: [],
  player2: [],
  player3: [],
  player4: []
};

Object.keys(BARAKATTA_BOARD.playerPaths).forEach(playerId => {
  for (let k = 0; k < BARAKATTA_BOARD.rings.length; k++) {
    const entryCell = getRingEntryCell(playerId, k);
    const entryIdx = BARAKATTA_BOARD.rings[k].findIndex(c => c.row === entryCell.row && c.col === entryCell.col);
    BARAKATTA_BOARD.playerPaths[playerId][k] = getPlayerRingPath(BARAKATTA_BOARD.rings[k], entryIdx);
  }
});

if (typeof window !== 'undefined') {
  window.BARAKATTA_BOARD = BARAKATTA_BOARD;
}
