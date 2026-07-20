using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using StarGreetings.Backend.Services;

namespace StarGreetings.Backend.Controllers
{
    [ApiController]
    [Route("")]
    public class GameController : ControllerBase
    {
        private readonly FirebaseService _firebaseService;
        private readonly GeminiService _geminiService;
        private readonly ILogger<GameController> _logger;

        private static readonly Dictionary<string, Dictionary<string, List<string>>> FALLBACK_DIALOGUES = new()
        {
            ["match_start"] = new()
            {
                ["tollywood"] = new()
                {
                    "Welcome to the high-voltage arena of Telugu Cinema! The stars are aligned, and the battle of blockbusters begins!",
                    "Box office records are about to shatter! Get ready for punch dialogues and ultimate heroism!"
                },
                ["bollywood"] = new()
                {
                    "Welcome to the grand musical stage of Hindi Cinema! Romance, drama, and magic are in the air!",
                    "Picture abhi baaki hai, mere dost! Let the cinematic journey of Bollywood begin!"
                }
            },
            ["round_start"] = new()
            {
                ["tollywood"] = new()
                {
                    "A new hero enters the scene! The crowd goes wild, and the bet is placed!",
                    "The screen is on fire! A new matchup begins at the box office!"
                },
                ["bollywood"] = new()
                {
                    "The lights dim and a new melody begins. The actors take their places!",
                    "The drama unfolds as another bet enters the pot. Who will steal the spotlight?"
                }
            },
            ["bluff_caught"] = new()
            {
                ["tollywood"] = new()
                {
                    "Caught red-handed! {caller} stands like an ultimate hero and exposes {player}'s duplicate claim!",
                    "Sensational twist! {caller} shattered {player}'s box office lie like a true mass hero!"
                },
                ["bollywood"] = new()
                {
                    "The disguise has fallen! {caller} caught {player} in a dramatic web of lies!",
                    "Cheating in romance never works! {caller} called {player}'s bluff in pure melodramatic style!"
                }
            },
            ["bluff_success"] = new()
            {
                ["tollywood"] = new()
                {
                    "Gravity-defying bluff! {player} tricked the opponents and walked away with the pot like a superstar!",
                    "Absolute mass response! {player}'s bluff was so powerful that everyone believed it!"
                },
                ["bollywood"] = new()
                {
                    "A masterclass in acting! {player} fooled everyone and claimed the spotlight silently!",
                    "What a performance! {player}'s lies were as sweet as a romantic duet, winning the entire pot!"
                }
            },
            ["round_win"] = new()
            {
                ["tollywood"] = new()
                {
                    "BOOM! {player} matched {card}! Absolute block-buster match wins the entire pot!",
                    "Records broken! {player} landed a matching greeting and swept the board like a boss!"
                },
                ["bollywood"] = new()
                {
                    "Wah! {player} found the perfect match for {card}! A standing ovation for winning the pot!",
                    "A match made in heaven! {player} matches the card and claims the limelight!"
                }
            },
            ["game_over"] = new()
            {
                ["tollywood"] = new()
                {
                    "The blockbuster concludes! {player} is the ultimate Box Office Emperor of the match!",
                    "End credits roll! {player} stood tallest and finished the game as a legendary hero!"
                },
                ["bollywood"] = new()
                {
                    "The grand finale has arrived! {player} wins the heart of the audience and the game!",
                    "And that's a wrap! {player} takes the final trophy with a superstar bow!"
                }
            }
        };

        public GameController(FirebaseService firebaseService, GeminiService geminiService, ILogger<GameController> logger)
        {
            _firebaseService = firebaseService;
            _geminiService = geminiService;
            _logger = logger;
        }

        #region Bot Decision Play
        public class BotPlayRequest
        {
            public List<JsonElement> hand { get; set; }
            public List<JsonElement> pot { get; set; }
            public List<JsonElement> revealed_cards { get; set; }
            public string playerId { get; set; }
            public int currentBet { get; set; } = 25;
            public string difficulty { get; set; } = "normal";
            public string dbUrl { get; set; }
        }

        [HttpPost("api/bot/decision/play")]
        public async Task<IActionResult> BotDecisionPlay([FromBody] BotPlayRequest request)
        {
            try
            {
                if (request.hand == null || request.hand.Count == 0)
                {
                    return BadRequest(new { error = "Empty hand" });
                }

                double playerBluffRate = 0.3;
                if (!string.IsNullOrEmpty(request.playerId))
                {
                    var stats = await _firebaseService.GetDataAsync<Dictionary<string, int>>($"playerStats/{request.playerId}/bluffHistory", request.dbUrl);
                    if (stats != null)
                    {
                        int attempts = stats.GetValueOrDefault("bluffAttempts", 0);
                        int caught = stats.GetValueOrDefault("bluffCaught", 0);
                        if (attempts > 0)
                        {
                            playerBluffRate = (caught + 1.0) / (attempts + 2.0);
                        }
                    }
                }

                var topCardPot = request.pot != null && request.pot.Count > 0 ? request.pot.Last() : (JsonElement?)null;

                Func<string, string> getActorId = (id) =>
                {
                    if (id == "baahubali") return "prabhas";
                    if (id == "rangasthalam") return "ram_charan";
                    if (id == "gabbar_singh") return "pawan_kalyan";
                    return id;
                };

                // Find matching cards in bot's hand
                var matchingCards = new List<JsonElement>();
                if (topCardPot.HasValue)
                {
                    string topActor = getActorId(topCardPot.Value.GetProperty("id").GetString());
                    foreach (var card in request.hand)
                    {
                        if (getActorId(card.GetProperty("id").GetString()) == topActor)
                        {
                            matchingCards.Add(card);
                        }
                    }
                }

                double pBluff = request.difficulty.ToLower() switch
                {
                    "easy" => 0.1,
                    "hard" => 0.35,
                    _ => 0.22
                };

                int handSize = request.hand.Count;
                pBluff += Math.Max(0.0, (30.0 - handSize) * 0.01);

                int potSize = request.pot?.Count ?? 0;
                pBluff += Math.Min(0.2, potSize * 0.02);
                pBluff -= playerBluffRate * 0.2;
                pBluff = Math.Max(0.05, Math.Min(0.85, pBluff));

                var rand = new Random();
                double randVal = rand.NextDouble();

                if (matchingCards.Count > 0)
                {
                    bool shouldPlayMatch = true;
                    if (request.difficulty.ToLower() != "hard" && randVal < 0.1)
                    {
                        shouldPlayMatch = false;
                    }

                    if (shouldPlayMatch)
                    {
                        var chosenCard = matchingCards[rand.Next(matchingCards.Count)];
                        return Ok(new
                        {
                            action = "real_match_claim",
                            card = chosenCard,
                            reason = "Played matching card legitimately"
                        });
                    }
                }

                // If not match or decided to bluff
                bool shouldBluff = randVal < pBluff;
                if (shouldBluff && request.pot != null && request.pot.Count > 0 && topCardPot.HasValue)
                {
                    string targetActorId = getActorId(topCardPot.Value.GetProperty("id").GetString());
                    
                    // Filter hand to non-matching cards
                    var nonMatchingCards = request.hand
                        .Where(c => getActorId(c.GetProperty("id").GetString()) != targetActorId)
                        .ToList();

                    if (nonMatchingCards.Count > 0)
                    {
                        var chosenCard = nonMatchingCards[rand.Next(nonMatchingCards.Count)];
                        return Ok(new
                        {
                            action = "bluff_claim",
                            card = chosenCard,
                            declaredStarId = topCardPot.Value.GetProperty("id").GetString(),
                            reason = $"Bluffing matching star {topCardPot.Value.GetProperty("name").GetString()} (Bluff Prob: {pBluff:F2})"
                        });
                    }
                }

                // Default fallback: play first card in hand
                var defaultCard = request.hand[0];
                string declaredId = topCardPot.HasValue ? topCardPot.Value.GetProperty("id").GetString() : defaultCard.GetProperty("id").GetString();
                bool isActualMatch = topCardPot.HasValue && getActorId(defaultCard.GetProperty("id").GetString()) == getActorId(topCardPot.Value.GetProperty("id").GetString());

                return Ok(new
                {
                    action = isActualMatch ? "real_match_claim" : "bluff_claim",
                    card = defaultCard,
                    declaredStarId = declaredId,
                    reason = isActualMatch ? "Legit play of top card" : "Default play of top card (bluff)"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error in bot play decision: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }
        #endregion

        #region Bot Decision Call Bluff
        public class BotBluffRequest
        {
            public int handSize { get; set; } = 30;
            public List<JsonElement> pot { get; set; }
            public List<JsonElement> revealed_cards { get; set; }
            public string playerId { get; set; }
            public string difficulty { get; set; } = "normal";
            public string declaredStarId { get; set; }
            public List<JsonElement> botHand { get; set; }
            public string dbUrl { get; set; }
        }

        [HttpPost("api/bot/decision/call_bluff")]
        public async Task<IActionResult> BotDecisionCallBluff([FromBody] BotBluffRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.declaredStarId))
                {
                    return Ok(new { call_bluff = false, reason = "No card declared" });
                }

                double playerBluffRate = 0.3;
                if (!string.IsNullOrEmpty(request.playerId))
                {
                    var stats = await _firebaseService.GetDataAsync<Dictionary<string, int>>($"playerStats/{request.playerId}/bluffHistory", request.dbUrl);
                    if (stats != null)
                    {
                        int attempts = stats.GetValueOrDefault("bluffAttempts", 0);
                        int caught = stats.GetValueOrDefault("bluffCaught", 0);
                        if (attempts > 0)
                        {
                            playerBluffRate = (caught + 1.0) / (attempts + 2.0);
                        }
                    }
                }

                double pCall = playerBluffRate;
                pCall += Math.Max(0.0, (30.0 - request.handSize) * 0.01);

                int botCopies = 0;
                if (request.botHand != null)
                {
                    foreach (var card in request.botHand)
                    {
                        string id = card.ValueKind == JsonValueKind.String 
                            ? card.GetString() 
                            : card.GetProperty("id").GetString();
                        
                        if (id == request.declaredStarId)
                        {
                            botCopies++;
                        }
                    }
                }

                pCall += botCopies switch
                {
                    1 => 0.15,
                    2 => 0.35,
                    >= 3 => 0.75,
                    _ => 0.0
                };

                int revealedCopies = 0;
                if (request.revealed_cards != null)
                {
                    foreach (var card in request.revealed_cards)
                    {
                        string id = card.ValueKind == JsonValueKind.String 
                            ? card.GetString() 
                            : card.GetProperty("id").GetString();
                        
                        if (id == request.declaredStarId)
                        {
                            revealedCopies++;
                        }
                    }
                }
                pCall += revealedCopies * 0.20;

                bool callBluff;
                var rand = new Random();
                if (request.difficulty.ToLower() == "easy")
                {
                    callBluff = rand.NextDouble() < 0.12;
                }
                else if (request.difficulty.ToLower() == "hard")
                {
                    callBluff = pCall >= 0.45;
                }
                else
                {
                    callBluff = rand.NextDouble() < pCall;
                }

                return Ok(new
                {
                    call_bluff = callBluff,
                    reason = $"Calculated call probability: {pCall:F2} (difficulty: {request.difficulty})"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error in bot call bluff decision: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }
        #endregion

        #region Bluff Stats Update
        public class StatsUpdateRequest
        {
            public string playerId { get; set; }
            public string type { get; set; } // "attempt", "caught"
            public string dbUrl { get; set; }
        }

        [HttpPost("api/player/stats/bluff")]
        public async Task<IActionResult> UpdatePlayerBluffStats([FromBody] StatsUpdateRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.playerId) || string.IsNullOrEmpty(request.type))
                {
                    return BadRequest(new { error = "Missing playerId or type" });
                }

                string statsPath = $"playerStats/{request.playerId}/bluffHistory";
                var currentStats = await _firebaseService.GetDataAsync<Dictionary<string, int>>(statsPath, request.dbUrl) ?? new Dictionary<string, int>();

                int attempts = currentStats.GetValueOrDefault("bluffAttempts", 0);
                int caught = currentStats.GetValueOrDefault("bluffCaught", 0);

                if (request.type == "attempt")
                {
                    attempts++;
                }
                else if (request.type == "caught")
                {
                    caught++;
                    attempts++; // Caught is also an attempt
                }

                currentStats["bluffAttempts"] = attempts;
                currentStats["bluffCaught"] = caught;

                await _firebaseService.UpdateDataAsync(statsPath, currentStats, request.dbUrl);

                return Ok(new { success = true, stats = currentStats });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
        #endregion

        #region Voice Transcribe & Correct
        public class TranscribeRequest
        {
            public string audio { get; set; } // base64 encoded audio string
            public string mimeType { get; set; } = "audio/wav";
            public List<string> roster { get; set; }
        }

        [HttpPost("api/voice/transcribe")]
        public async Task<IActionResult> TranscribeVoiceAudio([FromBody] TranscribeRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.audio))
                {
                    return BadRequest(new { error = "Missing audio bytes" });
                }

                byte[] audioBytes = Convert.FromBase64String(request.audio);
                List<string> rosterNames = request.roster ?? new List<string>();

                if (_geminiService.IsEnabled)
                {
                    string sysInstruction = "You are a professional automatic speech recognition (ASR) agent specialized in Indian cinema star names.";
                    string prompt = "Identify the actor name spoken in this audio clip.\n" +
                                   $"RAG Context (Possible Star Names in Play):\n{JsonSerializer.Serialize(rosterNames)}\n" +
                                   "\nRemember: 'Hello Arjun' or 'Hello' or 'Arjun' is 'Allu Arjun'. 'Now That' or similar is 'Nagarjuna'. " +
                                   "Return ONLY the exact matched name.";

                    string correctedName = await _geminiService.TranscribeAudioAsync(sysInstruction, prompt, audioBytes, request.mimeType);
                    if (!string.IsNullOrEmpty(correctedName))
                    {
                        return Ok(new { success = true, transcription = correctedName });
                    }
                }

                return StatusCode(503, new { success = false, error = "GenAI Service Unavailable" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        public class CorrectRequest
        {
            public string transcript { get; set; }
            public List<string> roster { get; set; }
        }

        [HttpPost("api/voice/correct")]
        public IActionResult CorrectVoiceInput([FromBody] CorrectRequest request)
        {
            try
            {
                string transcript = request.transcript?.Trim() ?? "";
                var rosterNames = request.roster ?? new List<string>();

                if (string.IsNullOrEmpty(transcript))
                {
                    return Ok(new { corrected = "" });
                }
                if (rosterNames.Count == 0)
                {
                    return Ok(new { corrected = transcript });
                }

                // 1. Try phonetic align matching
                string mlMatch = GetMlVoiceMatch(transcript, rosterNames);
                if (!string.IsNullOrEmpty(mlMatch))
                {
                    return Ok(new { corrected = mlMatch });
                }

                // 2. Gemini fallback
                if (_geminiService.IsEnabled)
                {
                    string sysInstruction = "You are an expert phonetic parser and auto-correction engine for Indian actor names. " +
                                           "The user is playing a cinema game and spoke a name. The speech recognition transcribed it as a phonetic approximation. " +
                                           "Your goal is to match this approximation to the single most likely star from the provided roster. " +
                                           "Return ONLY the exact matched star name from the roster (e.g. 'Nagarjuna', 'Prabhas'). " +
                                           "If it does not resemble any star in the roster, return the original transcription as-is. " +
                                           "Do not include quotes, explanations, or any other characters.";

                    string prompt = $"Spoken text phonetic transcription: '{transcript}'\n" +
                                   $"Roster of stars in play (RAG Context):\n{JsonSerializer.Serialize(rosterNames)}\n" +
                                   "\nIdentify if the spoken transcription resembles one of the names in the roster phonetically, " +
                                   "for example, 'Hello Arjun' or 'Hello' sounds exactly like 'Allu Arjun', " +
                                   "'Now That' sounds exactly like 'Nagarjuna', 'Bunny' or 'Allu' is 'Allu Arjun', " +
                                   "'Sam' is 'Samantha Ruth Prabhu', 'NTR' or 'Tarak' is 'Jr NTR'. " +
                                   "Output ONLY the corrected name or the original transcription if no match is found.";

                    var task = _geminiService.GenerateContentAsync(sysInstruction, prompt, 50);
                    task.Wait(); // Sync wait for quick web request simplicity or use async action
                    string correctedName = task.Result;
                    if (!string.IsNullOrEmpty(correctedName))
                    {
                        return Ok(new { corrected = correctedName.Replace("\"", "") });
                    }
                }

                // 3. Fallback dictionary mapping
                string cleanTranscript = transcript.ToLower().Replace(" ", "");
                var localMappings = new Dictionary<string, string>
                {
                    ["helloarjun"] = "Allu Arjun",
                    ["nowthat"] = "Nagarjuna",
                    ["nowthere"] = "Nagarjuna",
                    ["bunny"] = "Allu Arjun",
                    ["allu"] = "Allu Arjun",
                    ["tarak"] = "Jr NTR",
                    ["ntr"] = "Jr NTR",
                    ["sam"] = "Samantha",
                    ["kajal"] = "Kajal Agharwal"
                };

                if (localMappings.TryGetValue(cleanTranscript, out string mapped))
                {
                    return Ok(new { corrected = mapped });
                }

                return Ok(new { corrected = transcript });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
        #endregion

        #region Narrate Game
        public class NarrateRequest
        {
            public string @event { get; set; } = "round_start";
            public string player { get; set; } = "A player";
            public int round { get; set; } = 1;
            public int bet { get; set; } = 25;
            public string theme { get; set; } = "tollywood";
            public string caller { get; set; } = "Opponent";
            public string card { get; set; } = "";
        }

        [HttpPost("api/narrate")]
        public async Task<IActionResult> NarrateGame([FromBody] NarrateRequest request)
        {
            try
            {
                string theme = request.theme?.ToLower() ?? "tollywood";
                if (theme != "tollywood" && theme != "bollywood")
                {
                    theme = "tollywood";
                }

                if (_geminiService.IsEnabled)
                {
                    string sysInstruction = theme == "tollywood"
                        ? "You are a high-energy cinematic commentator for a card game. Theme is Tollywood (Telugu cinema). Speak with high-voltage commercial movie flair, using punch dialogues, mass hero references, box office hits, and dramatic energy. Keep your commentary to exactly one or two short sentences. Be extremely punchy and dramatic."
                        : "You are a high-energy cinematic commentator for a card game. Theme is Bollywood (Hindi cinema). Speak with romantic melodrama, musical grandeur, dramatic emotional dialogues, and Bollywood superstar energy. Keep your commentary to exactly one or two short sentences. Be extremely punchy and dramatic.";

                    string prompt = $"Generate a 1-2 sentence dramatic commentary for the following event in the game:\n" +
                                   $"- Event type: {request.@event}\n" +
                                   $"- Player active: {request.player}\n" +
                                   $"- Current Round: {request.round}\n" +
                                   $"- Pot consensus bet: {request.bet} coins\n";
                    if (!string.IsNullOrEmpty(request.card))
                    {
                        prompt += $"- Card played/matched: {request.card}\n";
                    }
                    if (!string.IsNullOrEmpty(request.caller) && request.@event == "bluff_caught")
                    {
                        prompt += $"- Challenger who caught the bluff: {request.caller}\n";
                    }

                    string commentary = await _geminiService.GenerateContentAsync(sysInstruction, prompt, 150);
                    if (!string.IsNullOrEmpty(commentary))
                    {
                        return Ok(new { commentary = commentary.Replace("\"", "") });
                    }
                }

                // Fallback dialogues
                var options = FALLBACK_DIALOGUES.GetValueOrDefault(request.@event, FALLBACK_DIALOGUES["round_start"]).GetValueOrDefault(theme, new List<string>());
                var rand = new Random();
                string dialogue = options.Count > 0 ? options[rand.Next(options.Count)] : "";

                // Interpolate
                dialogue = dialogue
                    .Replace("{player}", request.player)
                    .Replace("{caller}", request.caller)
                    .Replace("{card}", request.card)
                    .Replace("{round}", request.round.ToString())
                    .Replace("{bet}", request.bet.ToString());

                return Ok(new { commentary = dialogue });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
        #endregion

        #region Match End & Elo Ratings
        public class MatchEndRequest
        {
            public string playerId { get; set; }
            public string opponentId { get; set; } = "Bot Ranbir";
            public string outcome { get; set; } // "win", "loss", "draw"
            public string theme { get; set; }
            public string dbUrl { get; set; }
        }

        [HttpPost("api/player/stats/match_end")]
        public async Task<IActionResult> MatchEndStats([FromBody] MatchEndRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.playerId))
                {
                    return BadRequest(new { error = "Missing playerId" });
                }

                string pPath = $"playerStats/{request.playerId}";
                string oPath = $"playerStats/{request.opponentId}";

                var pData = await _firebaseService.GetDataAsync<Dictionary<string, JsonElement>>(pPath, request.dbUrl) ?? new Dictionary<string, JsonElement>();
                var oData = await _firebaseService.GetDataAsync<Dictionary<string, JsonElement>>(oPath, request.dbUrl) ?? new Dictionary<string, JsonElement>();

                int rP = pData.TryGetValue("rating", out var pRatingVal) ? pRatingVal.GetInt32() : 1000;
                int rO = oData.TryGetValue("rating", out var oRatingVal) ? oRatingVal.GetInt32() : 1000;

                int gamesP = pData.TryGetValue("gamesPlayed", out var pGamesVal) ? pGamesVal.GetInt32() : 0;
                int gamesO = oData.TryGetValue("gamesPlayed", out var oGamesVal) ? oGamesVal.GetInt32() : 0;

                double eP = 1.0 / (1.0 + Math.Pow(10.0, (rO - rP) / 400.0));
                double eO = 1.0 / (1.0 + Math.Pow(10.0, (rP - rO) / 400.0));

                double sP = 0.5, sO = 0.5;
                if (request.outcome == "win") { sP = 1.0; sO = 0.0; }
                else if (request.outcome == "loss") { sP = 0.0; sO = 1.0; }

                int k = 32;
                int newRP = (int)Math.Round(rP + k * (sP - eP));
                int newRO = (int)Math.Round(rO + k * (sO - eO));

                int changeP = newRP - rP;
                int changeO = newRO - rO;

                await _firebaseService.UpdateDataAsync(pPath, new { rating = newRP, gamesPlayed = gamesP + 1 }, request.dbUrl);
                await _firebaseService.UpdateDataAsync(oPath, new { rating = newRO, gamesPlayed = gamesO + 1 }, request.dbUrl);

                if (!string.IsNullOrEmpty(request.theme))
                {
                    string themePlaysPath = $"playerStats/{request.playerId}/themePlays";
                    var themePlays = await _firebaseService.GetDataAsync<Dictionary<string, int>>(themePlaysPath, request.dbUrl) ?? new Dictionary<string, int>();
                    themePlays[request.theme] = themePlays.GetValueOrDefault(request.theme, 0) + 1;
                    await _firebaseService.UpdateDataAsync(themePlaysPath, themePlays, request.dbUrl);
                }

                return Ok(new
                {
                    playerRating = newRP,
                    opponentRating = newRO,
                    changePlayer = changeP,
                    changeOpponent = changeO
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
        #endregion

        #region Analytics Anomalies & Recommendations
        public class AnomalyRequest
        {
            public string playerId { get; set; }
            public List<Dictionary<string, JsonElement>> turns { get; set; }
            public string dbUrl { get; set; }
        }

        [HttpPost("api/analytics/anomaly")]
        public async Task<IActionResult> DetectAnomaly([FromBody] AnomalyRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.playerId))
                {
                    return BadRequest(new { error = "Missing playerId" });
                }
                if (request.turns == null || request.turns.Count == 0)
                {
                    return Ok(new { isAnomaly = false, confidence = 0.0, flags = new List<string>() });
                }

                var flags = new List<string>();
                double confidence = 0.0;

                // Time checks
                var times = request.turns
                    .Where(t => t.ContainsKey("timeMs"))
                    .Select(t => t["timeMs"].GetDouble())
                    .ToList();

                double avgTime = times.Count > 0 ? times.Average() : 0.0;
                if (times.Count > 0 && avgTime < 350)
                {
                    flags.Add($"Rapid turn times (Average: {avgTime:F0}ms)");
                    confidence += 0.45;
                }

                // Bluff checks
                var bluffAttempts = request.turns.Where(t => t.TryGetValue("isBluff", out var isB) && isB.GetBoolean()).ToList();
                if (bluffAttempts.Count >= 4)
                {
                    int caughtCount = bluffAttempts.Count(t => t.TryGetValue("caught", out var c) && c.GetBoolean());
                    double successRate = (double)(bluffAttempts.Count - caughtCount) / bluffAttempts.Count;
                    if (successRate > 0.90)
                    {
                        flags.Add($"Suspicious bluff success rate ({successRate * 100:F0}%)");
                        confidence += 0.40;
                    }
                }

                // Bet win correlation checks
                var largeBets = request.turns.Where(t => t.TryGetValue("bet", out var b) && b.GetInt32() >= 75).ToList();
                if (largeBets.Count >= 4)
                {
                    int wonLargeBets = largeBets.Count(t => t.TryGetValue("win", out var w) && w.GetBoolean());
                    if ((double)wonLargeBets / largeBets.Count == 1.0)
                    {
                        flags.Add("Abnormal 100% win rate on high-bet turns");
                        confidence += 0.35;
                    }
                }

                bool isAnomaly = confidence >= 0.45;
                confidence = Math.Min(1.0, confidence);

                if (isAnomaly)
                {
                    string timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH_mm_ss_fffffffZ");
                    string anomalyLogPath = $"anomalies/{request.playerId}/{timestamp}";
                    var anomalyData = new
                    {
                        flags = flags,
                        confidence = confidence,
                        turnsCount = request.turns.Count,
                        avgTurnTimeMs = avgTime
                    };
                    await _firebaseService.UpdateDataAsync(anomalyLogPath, anomalyData, request.dbUrl);
                }

                return Ok(new
                {
                    isAnomaly = isAnomaly,
                    confidence = Math.Round(confidence, 2),
                    flags = flags
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        public class RecommendRequest
        {
            public string playerId { get; set; }
            public string dbUrl { get; set; }
        }

        [HttpPost("api/analytics/recommend")]
        public async Task<IActionResult> RecommendTheme([FromBody] RecommendRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.playerId))
                {
                    return Ok(new { recommendedTheme = "tollywood", reason = "Default Tollywood recommendation (no player profile)" });
                }

                string path = $"playerStats/{request.playerId}/themePlays";
                var plays = await _firebaseService.GetDataAsync<Dictionary<string, int>>(path, request.dbUrl) ?? new Dictionary<string, int>();

                int tCount = plays.GetValueOrDefault("tollywood", 0);
                int bCount = plays.GetValueOrDefault("bollywood", 0);

                string rec;
                string reason;

                if (tCount > bCount)
                {
                    rec = "bollywood";
                    reason = $"Based on your {tCount} games in Tollywood, try Bollywood for Hindi cinema blockbusters!";
                }
                else if (bCount > tCount)
                {
                    rec = "tollywood";
                    reason = $"Based on your {bCount} games in Bollywood, try Tollywood for high-voltage action punch-lines!";
                }
                else
                {
                    var rand = new Random();
                    rec = rand.NextDouble() < 0.5 ? "tollywood" : "bollywood";
                    reason = "Recommended cinema deck to kickstart your next card battle!";
                }

                return Ok(new { recommendedTheme = rec, reason = reason });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
        #endregion

        #region Custom Theme Generator
        public class CustomThemeRequest
        {
            public string prompt { get; set; }
            public string dbUrl { get; set; }
        }

        [HttpPost("api/generate-theme")]
        public async Task<IActionResult> GenerateCustomTheme([FromBody] CustomThemeRequest request)
        {
            try
            {
                string promptText = request.prompt?.Trim() ?? "";
                if (string.IsNullOrEmpty(promptText))
                {
                    return BadRequest(new { error = "Prompt is required" });
                }

                // Content moderation check
                var moderationKeywords = new List<string> { "nsfw", "naked", "porn", "gore", "kill", "suicide", "murder" };
                if (moderationKeywords.Any(w => promptText.ToLower().Contains(w)))
                {
                    return BadRequest(new { error = "Prompt contains moderated keywords" });
                }

                string deckId = Regex.Replace(promptText.ToLower(), @"[^a-z0-9]+", "_").Trim('_');
                if (string.IsNullOrEmpty(deckId)) deckId = "custom_deck";

                // Check Firebase Cache
                string cachePath = $"customDecks/{deckId}";
                var cached = await _firebaseService.GetDataAsync<Dictionary<string, JsonElement>>(cachePath, request.dbUrl);
                if (cached != null)
                {
                    var cachedCards = cached.TryGetValue("cards", out var cVal) ? JsonSerializer.Deserialize<List<object>>(cVal.GetRawText()) : new List<object>();
                    return Ok(new
                    {
                        success = true,
                        deckId = deckId,
                        themeName = cached.TryGetValue("themeName", out var tnVal) ? tnVal.GetString() : promptText,
                        cards = cachedCards
                    });
                }

                // Gemini implementation
                var cardsList = new List<Dictionary<string, string>>();
                if (_geminiService.IsEnabled)
                {
                    string sysInstruction = "You are an expert card game custom theme creator. Output ONLY a raw valid JSON array of character cards. Do not wrap in markdown or backticks.";
                    string prompt = $"Generate a list of exactly 10 unique, famous characters/celebrities/icons matching the theme '{promptText}'. " +
                                   "For each character, return a JSON object with fields:\n" +
                                   "- 'name': Full name of the character/celebrity.\n" +
                                   "- 'id': Unique slug (e.g. 'iron_man', 'voldemort').\n" +
                                   "- 'imagePrompt': A detailed visual description (English) to generate this character as a premium card portrait with theatrical lighting, epic background, movie poster style. Do not include quotes or backslashes.\n" +
                                   "\nEnsure the response is a single JSON array, e.g.:\n" +
                                   "[{\"id\": \"char_id\", \"name\": \"Character Name\", \"imagePrompt\": \"description...\"}]";

                    string geminiResult = await _geminiService.GenerateContentAsync(sysInstruction, prompt, 1000);
                    if (!string.IsNullOrEmpty(geminiResult))
                    {
                        // Clean markdown formatting if present
                        if (geminiResult.StartsWith("```"))
                        {
                            geminiResult = Regex.Replace(geminiResult, @"^```(?:json)?\n|```$", "", RegexOptions.Multiline).Trim();
                        }

                        try
                        {
                            var parsed = JsonSerializer.Deserialize<List<Dictionary<string, string>>>(geminiResult);
                            if (parsed != null && parsed.Count > 0)
                            {
                                var rand = new Random();
                                for (int i = 0; i < parsed.Count; i++)
                                {
                                    var item = parsed[i];
                                    string cId = item.GetValueOrDefault("id", $"char_{i}");
                                    string name = item.GetValueOrDefault("name", $"Character {i + 1}");
                                    string imgPrompt = item.GetValueOrDefault("imagePrompt", $"movie poster of {name} from {promptText}");
                                    string encodedPrompt = Uri.EscapeDataString(imgPrompt);
                                    string imagePath = $"https://image.pollinations.ai/p/{encodedPrompt}?width=512&height=512&seed={rand.Next(1, 100000)}";

                                    cardsList.Add(new Dictionary<string, string>
                                    {
                                        ["id"] = $"{deckId}_{cId}",
                                        ["name"] = name,
                                        ["industry"] = promptText,
                                        ["imagePath"] = imagePath
                                    });
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError($"Failed to parse Gemini generated cards: {ex.Message}");
                        }
                    }
                }

                // Fallback cards
                if (cardsList.Count == 0)
                {
                    for (int i = 1; i <= 10; i++)
                    {
                        cardsList.Add(new Dictionary<string, string>
                        {
                            ["id"] = $"{deckId}_{i}",
                            ["name"] = $"{promptText} Card {i}",
                            ["industry"] = promptText,
                            ["imagePath"] = $"https://image.pollinations.ai/p/movie_poster_of_{Uri.EscapeDataString(promptText)}_character_epic_lighting?width=512&height=512&seed={i}"
                        });
                    }
                }

                // Cache results in Firebase
                var newDeck = new
                {
                    deckId = deckId,
                    themeName = promptText,
                    cards = cardsList
                };
                await _firebaseService.UpdateDataAsync(cachePath, newDeck, request.dbUrl);

                return Ok(new
                {
                    success = true,
                    deckId = deckId,
                    themeName = promptText,
                    cards = cardsList
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
        #endregion

        #region Greetings Economy
        [HttpGet("api/player/greetings")]
        public async Task<IActionResult> GetPlayerGreetings([FromQuery] string userId, [FromQuery] string dbUrl)
        {
            try
            {
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest(new { error = "Missing userId" });
                }

                // Offline mode
                if (string.IsNullOrEmpty(dbUrl))
                {
                    return Ok(new { greetingsStack = 50 });
                }

                string path = $"players/{userId}/greetingsStack";
                var greetingsObj = await _firebaseService.GetDataAsync<object>(path, dbUrl);

                int greetings = 50;
                if (greetingsObj != null)
                {
                    greetings = Convert.ToInt32(greetingsObj.ToString());
                }
                else
                {
                    await _firebaseService.UpdateDataAsync($"players/{userId}", new { greetingsStack = 50 }, dbUrl);
                }

                return Ok(new { greetingsStack = greetings });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        public class StartMatchRequest
        {
            public string userId { get; set; }
            public string dbUrl { get; set; }
        }

        [HttpPost("api/player/greetings/start-match")]
        public async Task<IActionResult> StartMatchDeduction([FromBody] StartMatchRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.userId))
                {
                    return BadRequest(new { error = "Missing userId" });
                }

                // Offline mode
                if (string.IsNullOrEmpty(request.dbUrl))
                {
                    return Ok(new { success = true, greetingsStack = 50 });
                }

                string path = $"players/{request.userId}/greetingsStack";
                var greetingsObj = await _firebaseService.GetDataAsync<object>(path, request.dbUrl);
                int currentGreetings = greetingsObj != null ? Convert.ToInt32(greetingsObj.ToString()) : 50;

                if (currentGreetings < 50)
                {
                    return BadRequest(new { error = $"Insufficient greetings: you have {currentGreetings}, but need 50 to play." });
                }

                int newGreetings = currentGreetings - 50;
                await _firebaseService.UpdateDataAsync($"players/{request.userId}", new { greetingsStack = newGreetings }, request.dbUrl);

                return Ok(new { success = true, greetingsStack = newGreetings });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        public class ReturnRequest
        {
            public string userId { get; set; }
            public string remainingDeck { get; set; }
            public bool wonReward { get; set; } = false;
            public string dbUrl { get; set; }
        }

        [HttpPost("api/player/greetings/return")]
        public async Task<IActionResult> ReturnGreetings([FromBody] ReturnRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.userId))
                {
                    return BadRequest(new { error = "Missing userId" });
                }
                if (request.remainingDeck == null)
                {
                    return BadRequest(new { error = "Missing remainingDeck" });
                }

                string path = $"players/{request.userId}/greetingsStack";
                var greetingsObj = await _firebaseService.GetDataAsync<object>(path, request.dbUrl);
                int currentGreetings = greetingsObj != null ? Convert.ToInt32(greetingsObj.ToString()) : 0;

                int newGreetings = currentGreetings + Convert.ToInt32(request.remainingDeck);
                if (request.wonReward)
                {
                    newGreetings += 10;
                }

                await _firebaseService.UpdateDataAsync($"players/{request.userId}", new { greetingsStack = newGreetings }, request.dbUrl);

                return Ok(new { success = true, greetingsStack = newGreetings });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
        #endregion

        #region Phonetic Alignment Helper
        private string GetMlVoiceMatch(string transcript, List<string> rosterNames)
        {
            if (string.IsNullOrEmpty(transcript) || rosterNames == null || rosterNames.Count == 0)
            {
                return null;
            }

            string bestMatch = null;
            double bestScore = 0.0;

            var commonSubs = new Dictionary<string, string>
            {
                ["hello"] = "allu",
                ["nowthat"] = "nagarjuna",
                ["nowthere"] = "nagarjuna",
                ["now"] = "nag",
                ["that"] = "arjuna",
                ["ther"] = "arjuna",
                ["there"] = "arjuna",
                ["parbas"] = "prabhas",
                ["pravas"] = "prabhas",
                ["prabas"] = "prabhas",
                ["tarak"] = "ntr",
                ["junior"] = "jr",
                ["sam"] = "samantha"
            };

            string spokenClean = transcript.ToLower().Trim();
            foreach (var kvp in commonSubs)
            {
                spokenClean = spokenClean.Replace(kvp.Key, kvp.Value);
            }

            string spokenCompact = spokenClean.Replace(" ", "");

            foreach (string starName in rosterNames)
            {
                string starClean = starName.ToLower().Trim();
                string starCompact = starClean.Replace(" ", "");

                // 1. Exact match after replacement
                if (spokenCompact == starCompact)
                {
                    return starName;
                }

                // 2. Substring match
                if (spokenCompact.Contains(starCompact) || starCompact.Contains(spokenCompact))
                {
                    double score = (double)Math.Min(spokenCompact.Length, starCompact.Length) / Math.Max(spokenCompact.Length, starCompact.Length);
                    if (score > bestScore)
                    {
                        bestScore = score;
                        bestMatch = starName;
                    }
                }

                // 3. Levenshtein similarity
                int dist = CalculateLevenshteinDistance(spokenCompact, starCompact);
                int maxLen = Math.Max(spokenCompact.Length, starCompact.Length);
                double similarity = maxLen > 0 ? 1.0 - ((double)dist / maxLen) : 0.0;

                if (similarity > bestScore)
                {
                    bestScore = similarity;
                    bestMatch = starName;
                }
            }

            if (bestScore >= 0.70)
            {
                return bestMatch;
            }

            return null;
        }

        private int CalculateLevenshteinDistance(string s1, string s2)
        {
            if (s1.Length < s2.Length)
            {
                return CalculateLevenshteinDistance(s2, s1);
            }
            if (s2.Length == 0)
            {
                return s1.Length;
            }

            var previousRow = Enumerable.Range(0, s2.Length + 1).ToList();
            for (int i = 0; i < s1.Length; i++)
            {
                var currentRow = new List<int> { i + 1 };
                for (int j = 0; j < s2.Length; j++)
                {
                    int insertions = previousRow[j + 1] + 1;
                    int deletions = currentRow[j] + 1;
                    int substitutions = previousRow[j] + (s1[i] != s2[j] ? 1 : 0);
                    currentRow.Add(Math.Min(Math.Min(insertions, deletions), substitutions));
                }
                previousRow = currentRow;
            }
            return previousRow.Last();
        }
        #endregion
    }
}
