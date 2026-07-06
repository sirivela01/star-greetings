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

// Player specific spiral path definitions matching the pen-and-paper drawing exactly:
// Player 1 (Bottom): loops counter-clockwise, transitions from (6,2)->(5,1) and (5,3)->(4,2) and (4,3)->(3,3).
// Player 3 (Top): loops counter-clockwise, transitions from (0,4)->(1,5) and (1,3)->(2,4) and (2,3)->(3,3).
// Player 4 (Left): loops counter-clockwise, transitions from (2,0)->(1,1) and (3,1)->(2,2) and (3,2)->(3,3).
// Player 2 (Right): loops counter-clockwise, transitions from (4,6)->(5,5) and (3,5)->(4,4) and (3,4)->(3,3).
const playerPathsConfig = {
  player1: {
    startCells: [
      { row: 6, col: 3 }, // Ring 0 start
      { row: 5, col: 1 }, // Ring 1 start (bottom-left inner X)
      { row: 4, col: 2 }, // Ring 2 start
      { row: 3, col: 3 }  // Ring 3 start (home center)
    ],
    endCells: [
      { row: 6, col: 2 }, // Ring 0 end
      { row: 5, col: 2 }, // Ring 1 end
      { row: 4, col: 3 }, // Ring 2 end
      { row: 3, col: 3 }  // Ring 3 end
    ]
  },
  player3: {
    startCells: [
      { row: 0, col: 3 }, // Ring 0 start
      { row: 1, col: 5 }, // Ring 1 start (top-right inner X)
      { row: 2, col: 4 }, // Ring 2 start
      { row: 3, col: 3 }  // Ring 3 start (home center)
    ],
    endCells: [
      { row: 0, col: 4 }, // Ring 0 end
      { row: 1, col: 4 }, // Ring 1 end
      { row: 2, col: 3 }, // Ring 2 end
      { row: 3, col: 3 }  // Ring 3 end
    ]
  },
  player4: {
    startCells: [
      { row: 3, col: 0 }, // Ring 0 start
      { row: 1, col: 1 }, // Ring 1 start (top-left inner X)
      { row: 2, col: 2 }, // Ring 2 start
      { row: 3, col: 3 }  // Ring 3 start (home center)
    ],
    endCells: [
      { row: 2, col: 0 }, // Ring 0 end
      { row: 2, col: 1 }, // Ring 1 end
      { row: 3, col: 2 }, // Ring 2 end
      { row: 3, col: 3 }  // Ring 3 end
    ]
  },
  player2: {
    startCells: [
      { row: 3, col: 6 }, // Ring 0 start
      { row: 5, col: 5 }, // Ring 1 start (bottom-right inner X)
      { row: 4, col: 4 }, // Ring 2 start
      { row: 3, col: 3 }  // Ring 3 start (home center)
    ],
    endCells: [
      { row: 4, col: 6 }, // Ring 0 end
      { row: 4, col: 5 }, // Ring 1 end
      { row: 3, col: 4 }, // Ring 2 end
      { row: 3, col: 3 }  // Ring 3 end
    ]
  }
};

// Generate spiral rings
BARAKATTA_BOARD.rings = generateRings(BARAKATTA_BOARD.rows, BARAKATTA_BOARD.cols);
// Reverse ONLY Ring 0 to make it counter-clockwise. Ring 1 & Ring 2 remain clockwise as drawn in your path diagram.
BARAKATTA_BOARD.rings[0].reverse();

BARAKATTA_BOARD.playerPaths = {
  player1: [],
  player2: [],
  player3: [],
  player4: []
};

Object.keys(BARAKATTA_BOARD.playerPaths).forEach(playerId => {
  const config = playerPathsConfig[playerId];

  for (let k = 0; k < BARAKATTA_BOARD.rings.length; k++) {
    const ring = BARAKATTA_BOARD.rings[k];
    const startCell = config.startCells[k];
    const endCell = config.endCells[k];

    const startIdx = ring.findIndex(c => c.row === startCell.row && c.col === startCell.col);
    const rotated = getPlayerRingPath(ring, startIdx);
    const endIdx = rotated.findIndex(c => c.row === endCell.row && c.col === endCell.col);

    if (k === 3) {
      // Home center cell
      BARAKATTA_BOARD.playerPaths[playerId][k] = [startCell];
    } else {
      // Slice from starting cell to ending cell (inclusive)
      BARAKATTA_BOARD.playerPaths[playerId][k] = rotated.slice(0, endIdx + 1);
    }
  }
});

if (typeof window !== 'undefined') {
  window.BARAKATTA_BOARD = BARAKATTA_BOARD;
}
