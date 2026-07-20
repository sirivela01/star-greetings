using System;
using System.Collections.Generic;
using System.Linq;

namespace StarGreetings.Client
{
    [Serializable]
    public class GameConfig
    {
        public bool FORCED_TOP_DRAW { get; set; } = true;
        public string CARD_PLACEMENT_MODE { get; set; } = "middle";
        public List<StarData> roster { get; set; } = new List<StarData>();
    }

    [Serializable]
    public class LogEntry
    {
        public string timestamp { get; set; }
        public int round { get; set; }
        public string message { get; set; }
    }

    [Serializable]
    public class PendingWinnings
    {
        public int winnerIndex { get; set; }
        public List<CardInstance> cards { get; set; } = new List<CardInstance>();
        public int coins { get; set; }
        public List<int> deductionPlayers { get; set; } = new List<int>();
        public int wonCardsCount { get; set; }
        public int winnings { get; set; }
        public string matchedStarName { get; set; }
        public int roundNumber { get; set; }
    }

    [Serializable]
    public class ScoreboardEntry
    {
        public int id { get; set; }
        public string name { get; set; }
        public int stackCount { get; set; }
        public int coins { get; set; }
        public int freeStackBuys { get; set; }
    }

    [Serializable]
    public class PlayOutcome
    {
        public int playerIndex { get; set; }
        public string playerName { get; set; }
        public CardInstance playedCard { get; set; }
        public bool hasMatch { get; set; }
        public List<CardInstance> potBeforePlay { get; set; } = new List<CardInstance>();
        public int wonCount { get; set; }
        public CardInstance matchedWith { get; set; }
        public bool gameEnded { get; set; }
        public int nextPlayerIndex { get; set; }
        public bool isGameOver { get; set; }
        public List<ScoreboardEntry> scoreboard { get; set; } = new List<ScoreboardEntry>();
        public string error { get; set; }
    }

    public class GameState
    {
        public GameConfig config { get; set; }
        public List<Player> players { get; set; } = new List<Player>();
        public int currentPlayerIndex { get; set; }
        public List<CardInstance> pot { get; set; } = new List<CardInstance>();
        public List<LogEntry> logs { get; set; } = new List<LogEntry>();
        public int roundNumber { get; set; } = 1;
        public bool isGameOver { get; set; }
        public int globalInstanceCounter { get; set; }
        public int matchBet { get; set; }
        public bool isBetDeductedForCurrentPot { get; set; }
        public int currentPotStarterIndex { get; set; }
        public string selectedCategory { get; set; } = "Tollywood";
        public PendingWinnings pendingMatchWinnings { get; set; }
        public int matchWinsCount { get; set; }

        public GameState(GameConfig config = null)
        {
            this.config = config ?? new GameConfig();
        }

        public void InitializeGame(List<string> playerNames, int startingStackSize = 50, List<int> playerBets = null, string selectedCategory = "Tollywood")
        {
            this.players = playerNames.Select((name, index) => new Player(name, index)).ToList();
            this.pot = new List<CardInstance>();
            this.logs = new List<LogEntry>();
            this.roundNumber = 1;
            this.isGameOver = false;
            this.globalInstanceCounter = 0;
            this.selectedCategory = selectedCategory;
            this.matchWinsCount = 0;

            var roster = this.config.roster;
            if (roster == null || roster.Count == 0)
            {
                throw new Exception("Star roster is empty or not loaded.");
            }

            string activeCategory = this.selectedCategory ?? "Tollywood";
            var filteredRoster = roster.Where(c => string.Equals(c.industry, activeCategory, StringComparison.OrdinalIgnoreCase)).ToList();
            var finalRoster = filteredRoster.Count > 0 ? filteredRoster : roster;

            int lockedSize = 50; // Lock starting stack size to exactly 50 greetings
            var rand = new Random();

            foreach (var player in this.players)
            {
                player.stack = new List<CardInstance>();
                for (int i = 0; i < lockedSize; i++)
                {
                    var randomStar = finalRoster[rand.Next(finalRoster.Count)];
                    this.globalInstanceCounter++;
                    player.stack.Add(new CardInstance(randomStar, $"card_{this.globalInstanceCounter}"));
                }
            }

            // Resolve consensus bet
            int resolvedBet = 25; // default fallback
            if (playerBets != null && playerBets.Count > 0)
            {
                var counts = new Dictionary<int, int>();
                int maxCount = 0;
                foreach (var b in playerBets)
                {
                    int val = b > 0 ? b : 25;
                    if (!counts.ContainsKey(val)) counts[val] = 0;
                    counts[val]++;
                    
                    if (counts[val] > maxCount)
                    {
                        maxCount = counts[val];
                        resolvedBet = val;
                    }
                    else if (counts[val] == maxCount)
                    {
                        // tie breaker: lower bet
                        if (val < resolvedBet)
                        {
                            resolvedBet = val;
                        }
                    }
                }
            }
            this.matchBet = resolvedBet;

            // Deduct bet from players immediately at start
            foreach (var player in this.players)
            {
                if (player.coins < this.matchBet)
                {
                    player.coins += 300;
                    this.AddLog($"{player.name} was auto-refilled with 300 coins to cover the bet.");
                }
                player.coins -= this.matchBet;
            }
            this.isBetDeductedForCurrentPot = true;

            this.currentPlayerIndex = 0;
            this.currentPotStarterIndex = 0;
            this.AddLog($"Game started with {this.players.Count} players. Match Bet resolved to 🪙{this.matchBet} from player votes.");
        }

        public void AddLog(string message)
        {
            string timestamp = DateTime.Now.ToString("hh:mm:ss tt");
            this.logs.Insert(0, new LogEntry
            {
                timestamp = timestamp,
                round = this.roundNumber,
                message = message
            });
        }

        public Player GetCurrentPlayer()
        {
            if (this.players == null || this.currentPlayerIndex < 0 || this.currentPlayerIndex >= this.players.Count)
                return null;
            return this.players[this.currentPlayerIndex];
        }

        public List<Player> GetActivePlayers()
        {
            return this.players.Where(p => p.stackCount > 0).ToList();
        }

        public int FindNextPlayerIndex(int startIndex)
        {
            int total = this.players.Count;
            int nextIndex = startIndex;
            for (int i = 0; i < total; i++)
            {
                nextIndex = (nextIndex + 1) % total;
                if (this.players[nextIndex].stackCount > 0)
                {
                    return nextIndex;
                }
            }
            return -1;
        }

        public PlayOutcome PlayCard(string cardInstanceId = null)
        {
            if (this.isGameOver) 
                return new PlayOutcome { error = "Game is over" };

            var activePlayer = this.GetCurrentPlayer();
            if (activePlayer == null || activePlayer.stackCount == 0)
            {
                return new PlayOutcome { error = "Player has no cards to play" };
            }

            // Deduct bet if starting a new pot matchup and not yet deducted
            if (!this.isBetDeductedForCurrentPot)
            {
                var activePlayers = this.GetActivePlayers();
                foreach (var p in activePlayers)
                {
                    if (p.coins < this.matchBet)
                    {
                        p.coins += 300;
                        this.AddLog($"{p.name} was auto-refilled with 300 coins to cover the bet.");
                    }
                    p.coins -= this.matchBet;
                }
                this.isBetDeductedForCurrentPot = true;
                this.currentPotStarterIndex = this.currentPlayerIndex;
                this.AddLog($"New card matchup started. All active players bet 🪙{this.matchBet}.");
            }

            CardInstance cardToPlay = null;
            int cardIndex = -1;

            if (this.config.FORCED_TOP_DRAW)
            {
                cardToPlay = activePlayer.stack[0];
                cardIndex = 0;
            }
            else
            {
                cardIndex = activePlayer.stack.FindIndex(c => c.instanceId == cardInstanceId);
                if (cardIndex == -1)
                {
                    return new PlayOutcome { error = "Card not found in player's hand" };
                }
                cardToPlay = activePlayer.stack[cardIndex];
            }

            // Remove from player stack
            activePlayer.stack.RemoveAt(cardIndex);
            cardToPlay.playedBy = this.currentPlayerIndex;

            // Check match rules
            Func<string, string> getActorId = (id) =>
            {
                if (id == "baahubali") return "prabhas";
                if (id == "rangasthalam") return "ram_charan";
                if (id == "gabbar_singh") return "pawan_kalyan";
                return id;
            };

            bool hasMatch = this.pot.Count > 0 && getActorId(this.pot.Last().id) == getActorId(cardToPlay.id);
            int matchIndex = hasMatch ? this.pot.Count - 1 : -1;

            var outcome = new PlayOutcome
            {
                playerIndex = this.currentPlayerIndex,
                playerName = activePlayer.name,
                playedCard = cardToPlay,
                hasMatch = hasMatch,
                potBeforePlay = this.pot.ToList()
            };

            if (hasMatch)
            {
                int wonCardsCount = this.pot.Count;
                var matchedCard = this.pot[matchIndex];

                var activePlayers = this.GetActivePlayers();
                int totalOpponents = activePlayers.Where(p => p.id != activePlayer.id).Count();
                int winnings = totalOpponents * this.matchBet;

                this.pendingMatchWinnings = new PendingWinnings
                {
                    winnerIndex = this.currentPlayerIndex,
                    cards = this.pot.Concat(new List<CardInstance> { cardToPlay }).ToList(),
                    coins = winnings + this.matchBet,
                    deductionPlayers = this.players.Where(p => p.id != this.currentPlayerIndex && p.stackCount > 0).Select(p => p.id).ToList(),
                    wonCardsCount = wonCardsCount,
                    winnings = winnings,
                    matchedStarName = cardToPlay.name,
                    roundNumber = this.roundNumber
                };

                this.AddLog($"Round {this.roundNumber}: {activePlayer.name} matched \"{cardToPlay.name}\", won {wonCardsCount} cards, and won 🪙{winnings} from opponents.");

                outcome.wonCount = wonCardsCount;
                outcome.matchedWith = matchedCard;
                outcome.gameEnded = false;
            }
            else
            {
                this.pot.Add(cardToPlay);

                bool hasAnyPlayerReachedZero = this.players.Any(p => p.stackCount == 0);
                if (hasAnyPlayerReachedZero)
                {
                    this.isGameOver = true;
                    outcome.gameEnded = true;

                    var winner = this.players[0];
                    int maxCards = -1;
                    foreach (var p in this.players)
                    {
                        if (p.stackCount > maxCards)
                        {
                            maxCards = p.stackCount;
                            winner = p;
                        }
                    }

                    var loser = this.players.FirstOrDefault(p => p.stackCount == 0);

                    if (this.isBetDeductedForCurrentPot)
                    {
                        int activePlayersCount = this.players.Count(p => p.stackCount > 0);
                        int winnings = activePlayersCount * this.matchBet;
                        winner.coins += winnings;
                        this.AddLog($"{winner.name} won the final pot of 🪙{winnings} coins!");
                        this.isBetDeductedForCurrentPot = false;
                    }

                    string loserName = loser != null ? loser.name : "A player";
                    this.AddLog($"Game Over! {loserName} ran out of greetings. {winner.name} wins the match!");
                }
                else
                {
                    int nextIndex = this.FindNextPlayerIndex(this.currentPlayerIndex);
                    if (nextIndex == -1)
                    {
                        this.isGameOver = true;
                        outcome.gameEnded = true;
                    }
                    else
                    {
                        if (nextIndex <= this.currentPlayerIndex)
                        {
                            this.roundNumber++;
                        }
                        this.currentPlayerIndex = nextIndex;
                    }
                }
            }

            outcome.nextPlayerIndex = this.currentPlayerIndex;
            outcome.isGameOver = this.isGameOver;
            outcome.scoreboard = this.GetScoreboard();

            return outcome;
        }

        public void CollectMatchEarnings()
        {
            if (this.pendingMatchWinnings == null) return;
            var pw = this.pendingMatchWinnings;

            var winnerPlayer = this.players[pw.winnerIndex];
            if (winnerPlayer != null)
            {
                winnerPlayer.stack.AddRange(pw.cards);
                winnerPlayer.coins += pw.coins;
            }

            foreach (var pId in pw.deductionPlayers)
            {
                var p = this.players[pId];
                if (p != null && p.stackCount > 0)
                {
                    // deduct 10 cards
                    int countToDeduct = Math.Min(10, p.stack.Count);
                    p.stack.RemoveRange(0, countToDeduct);
                }
            }

            this.pot.Clear();
            this.isBetDeductedForCurrentPot = false;

            var activePlayersAfter = this.GetActivePlayers();
            if (activePlayersAfter.Count <= 1)
            {
                this.isGameOver = true;
                var winner = activePlayersAfter.FirstOrDefault() ?? this.players[0];
                this.AddLog($"Game Over! Only {(activePlayersAfter.Count > 0 ? activePlayersAfter[0].name : "nobody")} has cards left.");
            }

            this.pendingMatchWinnings = null;
        }

        public List<ScoreboardEntry> GetScoreboard()
        {
            return this.players.Select(p => new ScoreboardEntry
            {
                id = p.id,
                name = p.name,
                stackCount = p.stackCount,
                coins = p.coins,
                freeStackBuys = p.freeStackBuys
            }).OrderByDescending(x => x.stackCount).ToList();
        }

        public List<ScoreboardEntry> EndGame()
        {
            this.isGameOver = true;
            var winner = this.players[0];
            int maxCards = -1;
            foreach (var p in this.players)
            {
                if (p.stackCount > maxCards)
                {
                    maxCards = p.stackCount;
                    winner = p;
                }
            }

            this.AddLog($"Match over! {winner.name} wins with the most greetings ({maxCards}).");
            return this.GetScoreboard();
        }

        public Dictionary<string, object> BuyStack(int playerId)
        {
            var player = this.players.FirstOrDefault(p => p.id == playerId);
            if (player == null) return new Dictionary<string, object> { { "error", "Player not found" } };
            if (player.stackCount > 0) return new Dictionary<string, object> { { "error", "Player already has cards" } };

            string costType = "";
            if (player.freeStackBuys > 0)
            {
                player.freeStackBuys--;
                costType = "free buy";
            }
            else if (player.coins >= 100)
            {
                player.coins -= 100;
                costType = "100 coins";
            }
            else
            {
                return new Dictionary<string, object> { { "error", "Not enough coins or free buys" } };
            }

            var roster = this.config.roster;
            string activeCategory = this.selectedCategory ?? "Tollywood";
            var filteredRoster = roster.Where(c => string.Equals(c.industry, activeCategory, StringComparison.OrdinalIgnoreCase)).ToList();
            var finalRoster = filteredRoster.Count > 0 ? filteredRoster : roster;

            var rand = new Random();
            for (int i = 0; i < 50; i++)
            {
                var randomStar = finalRoster[rand.Next(finalRoster.Count)];
                this.globalInstanceCounter++;
                player.stack.Add(new CardInstance(randomStar, $"card_{this.globalInstanceCounter}"));
            }

            this.AddLog($"{player.name} bought a new stack (50 greetings) using a {costType}.");

            var activePlayers = this.GetActivePlayers();
            if (activePlayers.Count > 1 && this.isGameOver)
            {
                this.isGameOver = false;
                this.AddLog($"Game resumed as {player.name} re-entered the match!");
            }

            return new Dictionary<string, object> { { "success", true } };
        }

        public Dictionary<string, object> ShuffleStack(int playerId)
        {
            var player = this.players.FirstOrDefault(p => p.id == playerId);
            if (player == null || player.stackCount <= 1) 
                return new Dictionary<string, object> { { "error", "Cannot shuffle stack" } };

            var rand = new Random();
            for (int i = player.stack.Count - 1; i > 0; i--)
            {
                int j = rand.Next(i + 1);
                var temp = player.stack[i];
                player.stack[i] = player.stack[j];
                player.stack[j] = temp;
            }

            this.AddLog($"{player.name} shuffled their greetings stack.");
            return new Dictionary<string, object> { { "success", true } };
        }

        public Dictionary<string, object> BuyCoins(int playerId)
        {
            var player = this.players.FirstOrDefault(p => p.id == playerId);
            if (player == null) 
                return new Dictionary<string, object> { { "error", "Player not found" } };
            
            player.coins += 300;
            this.AddLog($"{player.name} bought 300 coins. New balance: {player.coins} coins.");
            return new Dictionary<string, object> { { "success", true } };
        }
    }
}
