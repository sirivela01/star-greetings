// Barakatta Board Configuration - 7x7 Grid Layout
const BARAKATTA_BOARD = {
  rows: 7,
  cols: 7,
  
  // Outer perimeter path (24 cells) in counter-clockwise play order
  path: [
    { row: 6, col: 3 }, // 0: Player 1 (Bottom, Human) Start Point (marked with X)
    { row: 6, col: 4 }, // 1
    { row: 6, col: 5 }, // 2
    { row: 6, col: 6 }, // 3: Bottom-Right Corner
    { row: 5, col: 6 }, // 4
    { row: 4, col: 6 }, // 5
    { row: 3, col: 6 }, // 6: Player 2 (Right) Start Point (marked with X)
    { row: 2, col: 6 }, // 7
    { row: 1, col: 6 }, // 8
    { row: 0, col: 6 }, // 9: Top-Right Corner
    { row: 0, col: 5 }, // 10
    { row: 0, col: 4 }, // 11
    { row: 0, col: 3 }, // 12: Player 3 (Top, AI Bot) Start Point (marked with X)
    { row: 0, col: 2 }, // 13
    { row: 0, col: 1 }, // 14
    { row: 0, col: 0 }, // 15: Top-Left Corner
    { row: 1, col: 0 }, // 16
    { row: 2, col: 0 }, // 17
    { row: 3, col: 0 }, // 18: Player 4 (Left) Start Point (marked with X)
    { row: 4, col: 0 }, // 19
    { row: 5, col: 0 }, // 20
    { row: 6, col: 0 }, // 21: Bottom-Left Corner
    { row: 6, col: 1 }, // 22
    { row: 6, col: 2 }  // 23
  ],
  
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
  ],
  
  // Starting indices into the outer path array for each player seat
  playerStartIndex: {
    player1: 0,
    player2: 6,
    player3: 12,
    player4: 18
  },
  
  // Index on path where players turn into their respective private home stretch
  homeEntryIndex: {
    player1: 0,
    player2: 6,
    player3: 12,
    player4: 18
  },
  
  // Private home stretch coordinates (3 steps each: step 24, step 25, step 26 [Home])
  homeStretches: {
    player1: [
      { row: 5, col: 3 },
      { row: 4, col: 3 },
      { row: 3, col: 3 } // Final home cell for Player 1
    ],
    player2: [
      { row: 3, col: 5 },
      { row: 3, col: 4 },
      { row: 3, col: 3 } // Final home cell for Player 2
    ],
    player3: [
      { row: 1, col: 3 },
      { row: 2, col: 3 },
      { row: 3, col: 3 } // Final home cell for Player 3
    ],
    player4: [
      { row: 3, col: 1 },
      { row: 3, col: 2 },
      { row: 3, col: 3 } // Final home cell for Player 4
    ]
  },
  
  // Center home cells coords (in 7x7 layout, they all merge into 3,3)
  centerHomeCells: [
    { row: 3, col: 3, player: "player1" },
    { row: 3, col: 3, player: "player2" },
    { row: 3, col: 3, player: "player3" },
    { row: 3, col: 3, player: "player4" }
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

function findEntryCell(lastCell, nextRing) {
  let bestCell = null;
  let minDistance = Infinity;
  nextRing.forEach(cell => {
    const dist = Math.abs(cell.row - lastCell.row) + Math.abs(cell.col - lastCell.col);
    if (dist < minDistance) {
      minDistance = dist;
      bestCell = cell;
    }
  });
  return bestCell;
}

// Generate spiral rings and individual player paths
BARAKATTA_BOARD.rings = generateRings(BARAKATTA_BOARD.rows, BARAKATTA_BOARD.cols);
BARAKATTA_BOARD.playerPaths = {
  player1: [],
  player2: [],
  player3: [],
  player4: []
};

Object.keys(BARAKATTA_BOARD.playerPaths).forEach(playerId => {
  const startIdx = BARAKATTA_BOARD.playerStartIndex[playerId];
  BARAKATTA_BOARD.playerPaths[playerId][0] = getPlayerRingPath(BARAKATTA_BOARD.rings[0], startIdx);
  
  for (let k = 1; k < BARAKATTA_BOARD.rings.length; k++) {
    const prevPath = BARAKATTA_BOARD.playerPaths[playerId][k-1];
    const lastCellOfPrevRing = prevPath[prevPath.length - 1];
    const entryCell = findEntryCell(lastCellOfPrevRing, BARAKATTA_BOARD.rings[k]);
    const entryIdx = BARAKATTA_BOARD.rings[k].findIndex(cell => cell.row === entryCell.row && cell.col === entryCell.col);
    BARAKATTA_BOARD.playerPaths[playerId][k] = getPlayerRingPath(BARAKATTA_BOARD.rings[k], entryIdx);
  }
});

if (typeof window !== 'undefined') {
  window.BARAKATTA_BOARD = BARAKATTA_BOARD;
}
