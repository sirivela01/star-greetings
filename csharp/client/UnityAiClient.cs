using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace StarGreetings.Client
{
    public class UnityAiClient : MonoBehaviour
    {
        [Header("Configuration")]
        [SerializeField] private string backendBaseUrl = "https://star-greetings.onrender.com";

        // Callback delegates for async request responses
        public delegate void BotPlayDecisionCallback(bool success, string action, CardInstance card, string reason, string error);
        public delegate void BotCallBluffCallback(bool success, bool callBluff, string reason, string error);
        public delegate void AudioTranscriptionCallback(bool success, string transcription, string error);
        public delegate void NarrativeCommentaryCallback(bool success, string commentary, string error);

        /// <summary>
        /// Request a play/bluff decision for a bot from the AI backend.
        /// </summary>
        public void RequestBotPlayDecision(List<CardInstance> hand, List<CardInstance> pot, List<CardInstance> revealedCards, string playerId, int currentBet, string difficulty, string dbUrl, BotPlayDecisionCallback callback)
        {
            StartCoroutine(PostBotPlayDecision(hand, pot, revealedCards, playerId, currentBet, difficulty, dbUrl, callback));
        }

        private IEnumerator PostBotPlayDecision(List<CardInstance> hand, List<CardInstance> pot, List<CardInstance> revealedCards, string playerId, int currentBet, string difficulty, string dbUrl, BotPlayDecisionCallback callback)
        {
            string url = $"{backendBaseUrl}/api/bot/decision/play";

            // Map variables to matching backend request payload structure
            var payload = new BotPlayRequestPayload
            {
                hand = hand,
                pot = pot,
                revealed_cards = revealedCards,
                playerId = playerId,
                currentBet = currentBet,
                difficulty = difficulty,
                dbUrl = dbUrl
            };

            string jsonPayload = JsonUtility.ToJson(payload);
            using (UnityWebRequest request = CreateJsonPostRequest(url, jsonPayload))
            {
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    var response = JsonUtility.FromJson<BotPlayResponsePayload>(request.downloadHandler.text);
                    callback?.Invoke(true, response.action, response.card, response.reason, null);
                }
                else
                {
                    callback?.Invoke(false, null, null, null, request.error);
                }
            }
        }

        /// <summary>
        /// Request a decision on whether the bot should call "Bluff!" on the human player's claim.
        /// </summary>
        public void RequestBotCallBluffDecision(int handSize, List<CardInstance> pot, List<CardInstance> revealedCards, string playerId, string difficulty, string declaredStarId, List<CardInstance> botHand, string dbUrl, BotCallBluffCallback callback)
        {
            StartCoroutine(PostBotCallBluffDecision(handSize, pot, revealedCards, playerId, difficulty, declaredStarId, botHand, dbUrl, callback));
        }

        private IEnumerator PostBotCallBluffDecision(int handSize, List<CardInstance> pot, List<CardInstance> revealedCards, string playerId, string difficulty, string declaredStarId, List<CardInstance> botHand, string dbUrl, BotCallBluffCallback callback)
        {
            string url = $"{backendBaseUrl}/api/bot/decision/call_bluff";

            var payload = new BotBluffRequestPayload
            {
                handSize = handSize,
                pot = pot,
                revealed_cards = revealedCards,
                playerId = playerId,
                difficulty = difficulty,
                declaredStarId = declaredStarId,
                botHand = botHand,
                dbUrl = dbUrl
            };

            string jsonPayload = JsonUtility.ToJson(payload);
            using (UnityWebRequest request = CreateJsonPostRequest(url, jsonPayload))
            {
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    var response = JsonUtility.FromJson<BotBluffResponsePayload>(request.downloadHandler.text);
                    callback?.Invoke(true, response.call_bluff, response.reason, null);
                }
                else
                {
                    callback?.Invoke(false, false, null, request.error);
                }
            }
        }

        /// <summary>
        /// Transcribe voice audio clips to recognize spoken star names.
        /// </summary>
        public void TranscribeVoiceAudio(byte[] audioBytes, string mimeType, List<string> rosterNames, AudioTranscriptionCallback callback)
        {
            StartCoroutine(PostTranscribeRequest(audioBytes, mimeType, rosterNames, callback));
        }

        private IEnumerator PostTranscribeRequest(byte[] audioBytes, string mimeType, List<string> rosterNames, AudioTranscriptionCallback callback)
        {
            string url = $"{backendBaseUrl}/api/voice/transcribe";

            var payload = new TranscribeRequestPayload
            {
                audio = Convert.ToBase64String(audioBytes),
                mimeType = mimeType,
                roster = rosterNames
            };

            string jsonPayload = JsonUtility.ToJson(payload);
            using (UnityWebRequest request = CreateJsonPostRequest(url, jsonPayload))
            {
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    var response = JsonUtility.FromJson<TranscribeResponsePayload>(request.downloadHandler.text);
                    callback?.Invoke(response.success, response.transcription, response.error);
                }
                else
                {
                    callback?.Invoke(false, null, request.error);
                }
            }
        }

        /// <summary>
        /// Get high-energy dramatic game narration commentary for an in-game event.
        /// </summary>
        public void RequestNarrativeCommentary(string eventName, string playerName, int roundNum, int bet, string theme, string challengerName, string cardName, NarrativeCommentaryCallback callback)
        {
            StartCoroutine(PostNarrateRequest(eventName, playerName, roundNum, bet, theme, challengerName, cardName, callback));
        }

        private IEnumerator PostNarrateRequest(string eventName, string playerName, int roundNum, int bet, string theme, string challengerName, string cardName, NarrativeCommentaryCallback callback)
        {
            string url = $"{backendBaseUrl}/api/narrate";

            var payload = new NarrateRequestPayload
            {
                @event = eventName,
                player = playerName,
                round = roundNum,
                bet = bet,
                theme = theme,
                caller = challengerName,
                card = cardName
            };

            string jsonPayload = JsonUtility.ToJson(payload);
            using (UnityWebRequest request = CreateJsonPostRequest(url, jsonPayload))
            {
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    var response = JsonUtility.FromJson<NarrateResponsePayload>(request.downloadHandler.text);
                    callback?.Invoke(true, response.commentary, null);
                }
                else
                {
                    callback?.Invoke(false, null, request.error);
                }
            }
        }

        #region HTTP Request Helper
        private UnityWebRequest CreateJsonPostRequest(string url, string jsonBody)
        {
            UnityWebRequest request = new UnityWebRequest(url, "POST");
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            return request;
        }
        #endregion

        #region Serialized Unity Request/Response Payloads
        [Serializable]
        private class BotPlayRequestPayload
        {
            public List<CardInstance> hand;
            public List<CardInstance> pot;
            public List<CardInstance> revealed_cards;
            public string playerId;
            public int currentBet;
            public string difficulty;
            public string dbUrl;
        }

        [Serializable]
        private class BotPlayResponsePayload
        {
            public string action;
            public CardInstance card;
            public string reason;
        }

        [Serializable]
        private class BotBluffRequestPayload
        {
            public int handSize;
            public List<CardInstance> pot;
            public List<CardInstance> revealed_cards;
            public string playerId;
            public string difficulty;
            public string declaredStarId;
            public List<CardInstance> botHand;
            public string dbUrl;
        }

        [Serializable]
        private class BotBluffResponsePayload
        {
            public bool call_bluff;
            public string reason;
        }

        [Serializable]
        private class TranscribeRequestPayload
        {
            public string audio;
            public string mimeType;
            public List<string> roster;
        }

        [Serializable]
        private class TranscribeResponsePayload
        {
            public bool success;
            public string transcription;
            public string error;
        }

        [Serializable]
        private class NarrateRequestPayload
        {
            public string @event;
            public string player;
            public int round;
            public int bet;
            public string theme;
            public string caller;
            public string card;
        }

        [Serializable]
        private class NarrateResponsePayload
        {
            public string commentary;
        }
        #endregion
    }
}
