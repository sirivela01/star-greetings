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

if (typeof window !== 'undefined') {
  window.BARAKATTA_BOARD = BARAKATTA_BOARD;
}
