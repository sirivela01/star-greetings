// Voice Recognition/Speech-to-Text Utility for Star Greetings
// Includes real-time interim results typing and fuzzy-name auto-correction.
(function() {
  let activeRecorder = null;
  let activeStream = null;
  let activeChunks = [];
  let recordTimeout = null;

  window.startSpeechRecognition = function(inputId, buttonId) {
    const inputEl = document.getElementById(inputId);
    const btnEl = document.getElementById(buttonId);
    if (!inputEl || !btnEl) return;

    const roster = (window.game && window.game.config && window.game.config.roster) || [];
    const rosterNames = roster.map(s => s.name);

    // Toggle behavior: if already recording/listening, stop it
    if (btnEl.classList.contains("listening")) {
      stopActiveRecordingSession();
      return;
    }

    // Stop any other active session
    stopActiveRecordingSession();

    // Try high-quality MediaRecorder voice capture first
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) {
      startMediaRecording();
    } else {
      // Fallback to Web Speech API
      startWebSpeechRecognition();
    }

    function startMediaRecording() {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          activeStream = stream;
          activeChunks = [];
          
          let mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported('audio/webm')) {
            if (MediaRecorder.isTypeSupported('audio/mp4')) {
              mimeType = 'audio/mp4';
            } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
              mimeType = 'audio/ogg';
            } else {
              mimeType = '';
            }
          }

          const options = mimeType ? { mimeType } : {};
          const recorder = new MediaRecorder(stream, options);
          activeRecorder = recorder;

          recorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) {
              activeChunks.push(e.data);
            }
          };

          recorder.onstop = async () => {
            const blobType = mimeType || 'audio/webm';
            const audioBlob = new Blob(activeChunks, { type: blobType });
            
            inputEl.placeholder = "GenAI is listening to your voice...";
            inputEl.value = "";

            // Send audio blob to backend API
            const formData = new FormData();
            formData.append("audio", audioBlob, `voice.${blobType.split('/')[1]}`);
            formData.append("roster", JSON.stringify(rosterNames));

            try {
              const response = await fetch("/api/voice/transcribe", {
                method: "POST",
                body: formData
              });
              const data = await response.json();
              if (data && data.success && data.transcription) {
                console.log(`🎤 GenAI Voice Transcription resolved: "${data.transcription}"`);
                inputEl.value = data.transcription;
                inputEl.dispatchEvent(new Event("input", { bubbles: true }));
              } else {
                throw new Error(data.error || "Failed to transcribe");
              }
            } catch (err) {
              console.warn("GenAI Audio Transcription failed, falling back to Web Speech API text matching:", err);
              inputEl.placeholder = "Mic processing failed. Type instead!";
            } finally {
              cleanupStreamAndUI();
            }
          };

          btnEl.classList.add("listening");
          btnEl.innerHTML = "🔴"; // Red record indicator
          inputEl.value = "";
          inputEl.placeholder = "Recording voice... Speak now!";

          recorder.start();

          // Auto-stop after 3.5 seconds
          recordTimeout = setTimeout(() => {
            if (activeRecorder && activeRecorder.state === "recording") {
              activeRecorder.stop();
            }
          }, 3500);

        })
        .catch(err => {
          console.warn("getUserMedia failed or blocked, falling back to Web Speech API:", err);
          startWebSpeechRecognition();
        });
    }

    function cleanupStreamAndUI() {
      btnEl.classList.remove("listening");
      btnEl.innerHTML = "🎙️";
      inputEl.placeholder = "Type Hero/Heroine Name...";
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
        activeStream = null;
      }
      activeRecorder = null;
      activeChunks = [];
      if (recordTimeout) {
        clearTimeout(recordTimeout);
        recordTimeout = null;
      }
    }

    function stopActiveRecordingSession() {
      if (activeRecorder && activeRecorder.state === "recording") {
        activeRecorder.stop();
      }
      cleanupStreamAndUI();

      if (window.activeSpeechRecognition) {
        window.activeSpeechRecognition.abort();
        window.activeSpeechRecognition = null;
      }
    }

    function startWebSpeechRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser. Please use Chrome or Safari.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 3;

      let finalTranscript = "";

      recognition.onstart = function() {
        btnEl.classList.add("listening");
        btnEl.innerHTML = "🎙️";
        inputEl.value = "";
        inputEl.placeholder = "Listening... Speak now!";
        window.activeSpeechRecognition = recognition;
      };

      recognition.onerror = function(event) {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          alert("Microphone access is blocked. Please allow microphone permissions in your browser settings.");
        }
        stopWebSpeech();
      };

      recognition.onend = async function() {
        if (inputEl.value) {
          inputEl.placeholder = "Correcting with GenAI...";
          try {
            const response = await fetch("/api/voice/correct", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transcript: inputEl.value,
                roster: rosterNames
              })
            });
            const data = await response.json();
            if (data && data.corrected) {
              inputEl.value = data.corrected;
              inputEl.dispatchEvent(new Event("input", { bubbles: true }));
            }
          } catch (e) {
            const corrected = fuzzyCorrectStarName(inputEl.value);
            if (corrected && corrected !== inputEl.value) {
              inputEl.value = corrected;
              inputEl.dispatchEvent(new Event("input", { bubbles: true }));
            }
          }
        }
        stopWebSpeech();
      };

      recognition.onresult = function(event) {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        let liveText = finalTranscript || interimTranscript;
        let cleanText = liveText.trim();
        if (cleanText.endsWith(".")) {
          cleanText = cleanText.slice(0, -1);
        }
        cleanText = cleanText.replace(/\b\w/g, c => c.toUpperCase());
        inputEl.value = cleanText;
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      };

      function stopWebSpeech() {
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
        console.warn("SpeechRecognition start failed:", e);
      }
    }

    /**
     * Fuzzy match spoken text against the current active stars roster.
     */
    function fuzzyCorrectStarName(spokenText) {
      const cleanSpoken = spokenText.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      if (!cleanSpoken) return spokenText;

      // Extract current deck roster (from configuration)
      const roster = (window.game && window.game.config && window.game.config.roster) || [];
      if (roster.length === 0) return spokenText;

      let bestMatchName = spokenText;
      let bestScore = 0;

      // Direct matches and phonetic approximations
      const nameMappings = {
        "prabas": "Prabhas",
        "parbas": "Prabhas",
        "pravas": "Prabhas",
        "prabha": "Prabhas",
        "mahesh": "Mahesh Babu",
        "maheshbabu": "Mahesh Babu",
        "alluarjun": "Allu Arjun",
        "allu": "Allu Arjun",
        "arjun": "Allu Arjun",
        "bunny": "Allu Arjun",
        "ntr": "Jr NTR",
        "juniorntr": "Jr NTR",
        "tarak": "Jr NTR",
        "ramcharan": "Ram Charan",
        "charan": "Ram Charan",
        "cherry": "Ram Charan",
        "samantha": "Samantha Ruth Prabhu",
        "sam": "Samantha Ruth Prabhu",
        "rashmika": "Rashmika Mandanna",
        "poojahegde": "Pooja Hegde",
        "pooja": "Pooja Hegde",
        "nani": "Nani",
        "vijaydeverakonda": "Vijay Deverakonda",
        "vijay": "Vijay Deverakonda",
        "keerthysuresh": "Keerthy Suresh",
        "keerthi": "Keerthy Suresh",
        "anushkashetty": "Anushka Shetty",
        "anushka": "Anushka Shetty",
        "sweety": "Anushka Shetty",
        "kajalaggarwal": "Kajal Aggarwal",
        "kajal": "Kajal Aggarwal",
        "saipallavi": "Sai Pallavi",
        "shruthi": "Shruti Haasan",
        "shruthihaasan": "Shruti Haasan",
        "pawankalyan": "Pawan Kalyan",
        "pawan": "Pawan Kalyan",
        "kalyan": "Pawan Kalyan",
        "pk": "Pawan Kalyan",
        "chiranjeevi": "Chiranjeevi",
        "chiru": "Chiranjeevi",
        "megastar": "Chiranjeevi",
        "nagarjuna": "Nagarjuna",
        "nag": "Nagarjuna",
        "balakrishna": "Nandamuri Balakrishna",
        "balayya": "Nandamuri Balakrishna",
        "nbk": "Nandamuri Balakrishna",
        "venkatesh": "Venkatesh",
        "venky": "Venkatesh",
        "baahubali": "Prabhas", // Map Baahubali alias spoken to Prabhas
        "bahubali": "Prabhas"
      };

      // 1. Check custom direct mappings
      if (nameMappings[cleanSpoken]) {
        return nameMappings[cleanSpoken];
      }

      // 2. Perform fuzzy string matching over the roster names
      roster.forEach(star => {
        const starName = star.name;
        const cleanStar = starName.toLowerCase().replace(/[^a-z0-9]/g, "");

        // Exact substring matches
        if (cleanSpoken.includes(cleanStar) || cleanStar.includes(cleanSpoken)) {
          bestScore = 1.0;
          bestMatchName = starName;
          return;
        }

        // Token match calculation
        const spokenTokens = cleanSpoken.split(/\s+/);
        const starTokens = cleanStar.split(/\s+/);
        
        let matches = 0;
        spokenTokens.forEach(t => {
          if (starTokens.includes(t)) matches++;
        });

        if (matches > 0) {
          const score = matches / Math.max(spokenTokens.length, starTokens.length);
          if (score > bestScore) {
            bestScore = score;
            bestMatchName = starName;
          }
        }
      });

      // If we found a high quality match, return it
      if (bestScore >= 0.35) {
        return bestMatchName;
      }

      return spokenText;
    }
  };
})();
