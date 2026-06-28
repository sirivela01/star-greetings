// Voice Recognition/Speech-to-Text Utility for Star Greetings
(function() {
  window.startSpeechRecognition = function(inputId, buttonId) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use a modern browser like Chrome, Safari, or Edge.");
      return;
    }

    const inputEl = document.getElementById(inputId);
    const btnEl = document.getElementById(buttonId);
    if (!inputEl || !btnEl) return;

    // Toggle behavior: if already listening, stop it
    if (btnEl.classList.contains("listening")) {
      if (window.activeSpeechRecognition) {
        window.activeSpeechRecognition.stop();
      }
      return;
    }

    // Stop any other active speech recognition session first
    if (window.activeSpeechRecognition) {
      window.activeSpeechRecognition.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN"; // Configured for Indian English to handle local names better
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = function() {
      btnEl.classList.add("listening");
      btnEl.innerHTML = "🎙️";
      inputEl.placeholder = "Listening for name...";
      window.activeSpeechRecognition = recognition;
    };

    recognition.onerror = function(event) {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        alert("Microphone access is blocked. Please allow microphone permissions in your browser settings to use voice input.");
      }
      stopListening();
    };

    recognition.onend = function() {
      stopListening();
    };

    recognition.onresult = function(event) {
      if (event.results && event.results[0] && event.results[0][0]) {
        const transcript = event.results[0][0].transcript;
        let cleanText = transcript.trim();
        // Remove trailing period if present
        if (cleanText.endsWith(".")) {
          cleanText = cleanText.slice(0, -1);
        }
        inputEl.value = cleanText;
        // Dispatch event so any validation logic is triggered
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };

    function stopListening() {
      btnEl.classList.remove("listening");
      btnEl.innerHTML = "🎙️";
      inputEl.placeholder = "Type Hero/Heroine Name...";
      if (window.activeSpeechRecognition === recognition) {
        window.activeSpeechRecognition = null;
      }
    }

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
    }
  };
})();
