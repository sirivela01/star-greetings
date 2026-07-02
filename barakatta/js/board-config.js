// Barakatta Board Configuration - 8x8 Grid Layout
const BARAKATTA_BOARD = {
  rows: 8,
  cols: 8,
  
  // Outer perimeter path (28 cells) in counter-clockwise play order
  path: [
    { row: 7, col: 3 }, // 0: Player 1 (Bottom, Human) Start Point
    { row: 7, col: 4 }, // 1
    { row: 7, col: 5 }, // 2
    { row: 7, col: 6 }, // 3
    { row: 7, col: 7 }, // 4: Bottom-Right Corner (Safe)
    { row: 6, col: 7 }, // 5
    { row: 5, col: 7 }, // 6
    { row: 4, col: 7 }, // 7: Player 2 (Right) Start Point
    { row: 3, col: 7 }, // 8
    { row: 2, col: 7 }, // 9
    { row: 1, col: 7 }, // 10
    { row: 0, col: 7 }, // 11: Top-Right Corner (Safe)
    { row: 0, col: 6 }, // 12
    { row: 0, col: 5 }, // 13
    { row: 0, col: 4 }, // 14: Player 3 (Top, AI Bot) Start Point
    { row: 0, col: 3 }, // 15
    { row: 0, col: 2 }, // 16
    { row: 0, col: 1 }, // 17
    { row: 0, col: 0 }, // 18: Top-Left Corner (Safe)
    { row: 1, col: 0 }, // 19
    { row: 2, col: 0 }, // 20
    { row: 3, col: 0 }, // 21: Player 4 (Left) Start Point
    { row: 4, col: 0 }, // 22
    { row: 5, col: 0 }, // 23
    { row: 6, col: 0 }, // 24
    { row: 7, col: 0 }, // 25: Bottom-Left Corner (Safe)
    { row: 7, col: 1 }, // 26
    { row: 7, col: 2 }  // 27
  ],
  
  // Cells marked with 'X' where pawns are safe and can stack without capture
  safeSquares: [
    { row: 7, col: 3 }, // Player 1 start
    { row: 4, col: 7 }, // Player 2 start
    { row: 0, col: 4 }, // Player 3 start
    { row: 3, col: 0 }, // Player 4 start
    { row: 0, col: 0 }, // Top-Left Corner
    { row: 0, col: 7 }, // Top-Right Corner
    { row: 7, col: 0 }, // Bottom-Left Corner
    { row: 7, col: 7 }  // Bottom-Right Corner
  ],
  
  // Starting indices into the outer path array for each player seat
  playerStartIndex: {
    player1: 0,
    player2: 7,
    player3: 14,
    player4: 21
  },
  
  // Index on path where players turn into their respective private home stretch
  // (We use stepsMoved >= 28 to turn inwards, meaning a full 28-cell lap must be completed)
  homeEntryIndex: {
    player1: 0,
    player2: 7,
    player3: 14,
    player4: 21
  },
  
  // Private home stretch coordinates (3 steps each: step 28, step 29, step 30 [Home])
  homeStretches: {
    player1: [
      { row: 6, col: 3 },
      { row: 5, col: 3 },
      { row: 4, col: 3 } // Final home cell for Player 1
    ],
    player2: [
      { row: 4, col: 6 },
      { row: 4, col: 5 },
      { row: 4, col: 4 } // Final home cell for Player 2
    ],
    player3: [
      { row: 1, col: 4 },
      { row: 2, col: 4 },
      { row: 3, col: 4 } // Final home cell for Player 3
    ],
    player4: [
      { row: 3, col: 1 },
      { row: 3, col: 2 },
      { row: 3, col: 3 } // Final home cell for Player 4
    ]
  },
  
  // Center home cells coords
  centerHomeCells: [
    { row: 4, col: 3, player: "player1" },
    { row: 4, col: 4, player: "player2" },
    { row: 3, col: 4, player: "player3" },
    { row: 3, col: 3, player: "player4" }
  ]
};
