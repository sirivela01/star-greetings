using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace StarGreetings.Backend.Services
{
    public class FirebaseService
    {
        private readonly HttpClient _httpClient;
        private readonly string _databaseUrl;
        private readonly ILogger<FirebaseService> _logger;

        public FirebaseService(HttpClient httpClient, IConfiguration configuration, ILogger<FirebaseService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;

            // Load Firebase Database URL from Configuration, fallback to Env Variable
            _databaseUrl = configuration["Firebase:DatabaseUrl"] ?? Environment.GetEnvironmentVariable("FIREBASE_DATABASE_URL");
            if (!string.IsNullOrEmpty(_databaseUrl))
            {
                _databaseUrl = _databaseUrl.TrimEnd('/');
            }
        }

        public async Task<T> GetDataAsync<T>(string path, string customDbUrl = null)
        {
            string baseUrl = !string.IsNullOrEmpty(customDbUrl) ? customDbUrl.TrimEnd('/') : _databaseUrl;
            if (string.IsNullOrEmpty(baseUrl))
            {
                _logger.LogWarning("Firebase Database URL is not configured.");
                return default;
            }

            string requestUrl = $"{baseUrl}/{path}.json";
            try
            {
                var response = await _httpClient.GetAsync(requestUrl);
                if (response.IsSuccessStatusCode)
                {
                    string jsonString = await response.Content.ReadAsStringAsync();
                    if (string.IsNullOrEmpty(jsonString) || jsonString == "null")
                    {
                        return default;
                    }
                    return JsonSerializer.Deserialize<T>(jsonString, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                }
                else
                {
                    _logger.LogError($"Firebase read failed. Status: {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Firebase read error: {ex.Message}");
            }
            return default;
        }

        public async Task<bool> UpdateDataAsync(string path, object data, string customDbUrl = null)
        {
            string baseUrl = !string.IsNullOrEmpty(customDbUrl) ? customDbUrl.TrimEnd('/') : _databaseUrl;
            if (string.IsNullOrEmpty(baseUrl))
            {
                _logger.LogWarning("Firebase Database URL is not configured.");
                return false;
            }

            string requestUrl = $"{baseUrl}/{path}.json";
            try
            {
                string jsonPayload = JsonSerializer.Serialize(data);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                // Send PATCH request (equivalent to python requests.patch)
                var request = new HttpRequestMessage(new HttpMethod("PATCH"), requestUrl) { Content = content };
                var response = await _httpClient.SendAsync(request);

                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Firebase write error: {ex.Message}");
            }
            return false;
        }
    }
}
