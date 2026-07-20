using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace StarGreetings.Backend.Services
{
    public class GeminiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly ILogger<GeminiService> _logger;

        public GeminiService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _apiKey = configuration["Gemini:ApiKey"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");
        }

        public bool IsEnabled => !string.IsNullOrEmpty(_apiKey);

        public async Task<string> GenerateContentAsync(string systemInstruction, string prompt, int maxTokens = 500)
        {
            if (!IsEnabled)
            {
                _logger.LogWarning("Gemini API key is not configured.");
                return null;
            }

            string url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={_apiKey}";

            var requestBody = new
            {
                systemInstruction = new
                {
                    parts = new[]
                    {
                        new { text = systemInstruction }
                    }
                },
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = prompt }
                        }
                    }
                },
                generationConfig = new
                {
                    maxOutputTokens = maxTokens
                }
            };

            try
            {
                string jsonPayload = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(url, content);
                if (response.IsSuccessStatusCode)
                {
                    string responseString = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(responseString);
                    
                    // Parse response root -> candidates[0] -> content -> parts[0] -> text
                    if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
                        candidates.GetArrayLength() > 0 &&
                        candidates[0].TryGetProperty("content", out var contentObj) &&
                        contentObj.TryGetProperty("parts", out var parts) &&
                        parts.GetArrayLength() > 0 &&
                        parts[0].TryGetProperty("text", out var textProp))
                    {
                        return textProp.GetString()?.Trim();
                    }
                }
                else
                {
                    string errContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"Gemini API generation failed. Status: {response.StatusCode}. Error: {errContent}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Gemini Service error: {ex.Message}");
            }
            return null;
        }

        public async Task<string> TranscribeAudioAsync(string systemInstruction, string prompt, byte[] audioData, string mimeType)
        {
            if (!IsEnabled)
            {
                _logger.LogWarning("Gemini API key is not configured.");
                return null;
            }

            string url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={_apiKey}";

            string base64Audio = Convert.ToBase64String(audioData);

            var requestBody = new
            {
                systemInstruction = new
                {
                    parts = new[]
                    {
                        new { text = systemInstruction }
                    }
                },
                contents = new[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new
                            {
                                inlineData = new
                                {
                                    mimeType = mimeType,
                                    data = base64Audio
                                }
                            },
                            new { text = prompt }
                        }
                    }
                },
                generationConfig = new
                {
                    maxOutputTokens = 50
                }
            };

            try
            {
                string jsonPayload = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(url, content);
                if (response.IsSuccessStatusCode)
                {
                    string responseString = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(responseString);
                    
                    if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
                        candidates.GetArrayLength() > 0 &&
                        candidates[0].TryGetProperty("content", out var contentObj) &&
                        contentObj.TryGetProperty("parts", out var parts) &&
                        parts.GetArrayLength() > 0 &&
                        parts[0].TryGetProperty("text", out var textProp))
                    {
                        return textProp.GetString()?.Trim();
                    }
                }
                else
                {
                    string errContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"Gemini API ASR transcription failed. Status: {response.StatusCode}. Error: {errContent}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Gemini Audio transcription error: {ex.Message}");
            }
            return null;
        }
    }
}
