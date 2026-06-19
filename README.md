# Star Greetings - Card Party Game

★ A premium, high-fidelity local multiplayer card party game themed around Tollywood and Bollywood stars. Players vote on match bets, bluff, match cards, and merge coins with fluid animations and synthesized metallic sounds.

---

## 🎮 Game Rules & Loop

### 1. Game Setup
- Setup **2 to 6 players**.
- Customize player profile names and choose from premium predefined avatar illustrations.
- Every player selects their desired bet per round (**25, 50, 75, or 100** coins).
- Every player starts with **300 coins**, **10 free stack refills**, and a starting deck/stack locked to exactly **30 random greetings cards**.

### 2. Live Betting & Merging
- Before starting, the consensus bet is resolved based on the most voted amount (tie-breakers default to the lower bet value).
- When starting the game, **bets are deducted immediately** (balances show the post-bet amount, e.g., 275).
- A satisfying **flying coin animation** launches coins from each player's profile avatar to the center pot, accompanied by a **synthesized metallic chime sound** and a central **total merging coins display** (e.g. `🪙 75`).

### 3. Playing & Winning
- Turn order passes clockwise around the circular table.
- A **privacy shield ("Pass the Screen")** protects each player's turn to prevent card peeping in local pass-and-play.
- On your turn, play a card from the top of your stack into the center pot.
- If the played card matches the star ID of the top card already in the pot, you **WIN the pot**:
  - All cards in the pot fly to your deck stack.
  - You immediately receive all opponent bets + your own bet back.
  - As the winner, you start the next matchup!
- If a player runs out of cards, they are temporarily locked out. They can use one of their **10 free stack buys** to purchase a new stack of 30 cards, buy a stack with **100 coins**, or buy 300 coins to re-enter!

### 4. Advanced Seating Controls
- **Seat Distance:** Use the Front (`▲`) and Back (`▼`) buttons under any seat to slide the seat closer to or further from the center of the table.
- **Seat Rotation:** Long-press (250ms) on a player's avatar profile until it glows cyan, then drag left or right to slide the seat along the table perimeter. Pot cards fanned in *Near Player* mode slide along in real-time!

---

## 🚀 How to Run Locally

Since this is a fully client-side static web application, you can run it easily without complex servers:

1. Double-click [index.html](index.html) to run it directly in your browser.
2. Alternatively, run a simple local server in this directory:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (npx)
   npx serve .
   ```
   Open `http://localhost:8000/` in your browser.

---

## ☁️ Deployment Guide

### Deploying to GitHub

1. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Star Greetings game complete"
   ```
2. Create a new repository on your GitHub account.
3. Link the remote repository and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/star-greetings.git
   git push -u origin main
   ```

### Deploying to Render (Free Hosting)

Render supports hosting static websites directly from your GitHub repository for free:

1. Sign up/log in to [Render](https://render.com/).
2. Click **New +** and select **Static Site**.
3. Connect your GitHub account and select your `star-greetings` repository.
4. Configure the settings:
   - **Name:** `star-greetings` (or any unique name)
   - **Branch:** `main`
   - **Build Command:** *(Leave blank)*
   - **Publish Directory:** `.` (meaning the root folder)
5. Click **Create Static Site**.
6. Render will automatically deploy your game and provide a live URL (e.g. `https://star-greetings.onrender.com`).
