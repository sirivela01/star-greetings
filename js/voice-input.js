// Voice Recognition/Speech-to-Text Utility for Star Greetings
// Includes real-time interim results typing and fuzzy-name auto-correction.
(function() {
  let activeRecorder = null;
  let activeStream = null;
  let activeChunks = [];
  let recordTimeout = null;

  // Web Audio VAD / Silence Detection Contexts
  let audioCtx = null;
  let audioSource = null;
  let audioAnalyser = null;
  let vadAnimationFrame = null;

  function cleanupAudioContext() {
    if (vadAnimationFrame) {
      cancelAnimationFrame(vadAnimationFrame);
      vadAnimationFrame = null;
    }
    if (audioSource) {
      try { audioSource.disconnect(); } catch(e) {}
      audioSource = null;
    }
    if (audioCtx) {
      try {
        if (audioCtx.state !== "closed") {
          audioCtx.close();
        }
      } catch(e) {}
      audioCtx = null;
    }
    audioAnalyser = null;
  }

  function startSilenceDetection(stream, recorder) {
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!window.AudioContext) return;

      audioCtx = new AudioContext();
      audioAnalyser = audioCtx.createAnalyser();
      audioAnalyser.fftSize = 256;
      
      audioSource = audioCtx.createMediaStreamSource(stream);
      audioSource.connect(audioAnalyser);

      const bufferLength = audioAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let lastSpeechTime = Date.now();
      const silenceVolumeThreshold = 12;
      const silenceDurationLimit = 750;

      function checkAudioSilence() {
        if (!activeRecorder || activeRecorder.state !== "recording" || activeRecorder !== recorder) {
          cleanupAudioContext();
          return;
        }

        audioAnalyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const averageVolume = sum / bufferLength;

        const currentTime = Date.now();
        if (averageVolume > silenceVolumeThreshold) {
          lastSpeechTime = currentTime;
        } else if (currentTime - lastSpeechTime > silenceDurationLimit) {
          VoiceSelfHealingEngine.log("SILENCE_AUTO_STOP", `No speech detected for ${silenceDurationLimit}ms. Stopping recording.`);
          if (recorder && recorder.state === "recording") {
            recorder.stop();
          }
          cleanupAudioContext();
          return;
        }

        vadAnimationFrame = requestAnimationFrame(checkAudioSilence);
      }

      vadAnimationFrame = requestAnimationFrame(checkAudioSilence);
    } catch(e) {
      console.warn("VAD / Silence Detection failed to start:", e);
    }
  }

  // Voice Self-Healing & Diagnostic Recovery Engine
  const VoiceSelfHealingEngine = {
    diagnosticLog: [],
    
    log(event, details) {
      const entry = { timestamp: new Date().toISOString(), event, details };
      this.diagnosticLog.push(entry);
      console.warn(`[Voice Self-Healing] ${event}:`, details);
      if (this.diagnosticLog.length > 50) this.diagnosticLog.shift();
    },

    async runRecovery(errorType, context = {}) {
      this.log("ERROR_DETECTED", { errorType, context });
      
      switch(errorType) {
        case "PERMISSION_DENIED":
          this.showPermissionGuide();
          this.resetMicUI(context.buttonId, context.inputId);
          break;
          
        case "RECORDER_STUCK":
        case "RECORDER_ERROR":
          this.log("RECOVERY_ACTION", "Resetting MediaRecorder and releasing streams...");
          this.releaseStreams();
          this.resetMicUI(context.buttonId, context.inputId);
          if (context.fallback) {
            this.log("RECOVERY_ACTION", "Triggering WebSpeech recognition fallback");
            context.fallback();
          }
          break;
          
        case "API_TRANSCRIBE_FAILED":
          this.log("RECOVERY_ACTION", "Transcription API failed. Falling back to Web Speech API.");
          this.resetMicUI(context.buttonId, context.inputId);
          if (context.fallback) {
            context.fallback();
          }
          break;
          
        case "NO_SPEECH_DETECTED":
          this.log("RECOVERY_ACTION", "No speech detected. Resetting UI with tooltip guide.");
          this.showSpeechTooltip(context.inputId);
          this.resetMicUI(context.buttonId, context.inputId);
          break;

        default:
          this.log("RECOVERY_ACTION", "General reset applied.");
          this.releaseStreams();
          this.resetMicUI(context.buttonId, context.inputId);
          break;
      }
    },

    releaseStreams() {
      cleanupAudioContext();
      if (activeStream) {
        try {
          activeStream.getTracks().forEach(track => track.stop());
        } catch (e) {
          this.log("STREAM_RELEASE_ERR", e.message);
        }
        activeStream = null;
      }
      activeRecorder = null;
      activeChunks = [];
      if (recordTimeout) {
        clearTimeout(recordTimeout);
        recordTimeout = null;
      }
    },

    resetMicUI(buttonId, inputId) {
      const btnEl = document.getElementById(buttonId);
      const inputEl = document.getElementById(inputId);
      if (btnEl) {
        btnEl.classList.remove("listening");
        btnEl.innerHTML = "🎙️";
      }
      if (inputEl) {
        inputEl.placeholder = "Type Hero/Heroine Name...";
      }
    },

    showPermissionGuide() {
      const existingToast = document.getElementById("voice-permission-toast");
      if (existingToast) existingToast.remove();

      const toast = document.createElement("div");
      toast.id = "voice-permission-toast";
      toast.style.position = "fixed";
      toast.style.bottom = "80px";
      toast.style.left = "50%";
      toast.style.transform = "translateX(-50%)";
      toast.style.background = "rgba(18, 18, 24, 0.95)";
      toast.style.color = "#ffffff";
      toast.style.padding = "16px 24px";
      toast.style.borderRadius = "12px";
      toast.style.boxShadow = "0 8px 32px rgba(0,0,0,0.5)";
      toast.style.border = "1px solid rgba(255, 75, 75, 0.3)";
      toast.style.zIndex = "10000";
      toast.style.maxWidth = "90%";
      toast.style.fontSize = "14px";
      toast.style.lineHeight = "1.5";
      toast.style.textAlign = "center";

      toast.innerHTML = `
        <div style="font-weight: bold; color: #ff4b4b; margin-bottom: 6px;">🎙️ Microphone Blocked</div>
        <div>Please allow microphone access in your browser settings to use voice guessing:</div>
        <div style="margin-top: 8px; font-size: 12px; color: #aaa;">
          <strong>Chrome:</strong> Click the lock icon in the address bar &gt; enable Microphone.<br/>
          <strong>Safari:</strong> Settings &gt; Safari &gt; Microphone &gt; Allow.
        </div>
        <button id="close-voice-toast" style="margin-top: 10px; background: #ff4b4b; border: none; color: white; padding: 4px 12px; borderRadius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">Got it</button>
      `;

      document.body.appendChild(toast);
      document.getElementById("close-voice-toast").onclick = () => toast.remove();
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 8000);
    },

    showSpeechTooltip(inputId) {
      const inputEl = document.getElementById(inputId);
      if (inputEl) {
        inputEl.placeholder = "🎙️ Speak louder & closer to microphone...";
        setTimeout(() => {
          if (inputEl.placeholder.includes("Speak louder")) {
            inputEl.placeholder = "Type Hero/Heroine Name...";
          }
        }, 3000);
      }
    }
  };

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
              VoiceSelfHealingEngine.runRecovery("API_TRANSCRIBE_FAILED", {
                buttonId,
                inputId,
                fallback: startWebSpeechRecognition
              });
            }
          };

          btnEl.classList.add("listening");
          btnEl.innerHTML = "🔴"; // Red record indicator
          inputEl.value = "";
          inputEl.placeholder = "Recording voice... Speak now!";

          recorder.start();
          
          // Start Audio Silence / Voice Activity Detection (VAD)
          startSilenceDetection(stream, recorder);

          // Auto-stop after 2.5 seconds (max limit)
          recordTimeout = setTimeout(() => {
            if (activeRecorder && activeRecorder.state === "recording") {
              activeRecorder.stop();
            }
          }, 2500);

        })
        .catch(err => {
          VoiceSelfHealingEngine.log("GET_USER_MEDIA_FAILED", err.message);
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            VoiceSelfHealingEngine.runRecovery("PERMISSION_DENIED", { buttonId, inputId });
          } else {
            VoiceSelfHealingEngine.runRecovery("RECORDER_ERROR", {
              buttonId,
              inputId,
              fallback: startWebSpeechRecognition
            });
          }
        });
    }

    function cleanupStreamAndUI() {
      cleanupAudioContext();
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
        VoiceSelfHealingEngine.log("SPEECH_REC_ERROR", event.error);
        if (event.error === "not-allowed") {
          VoiceSelfHealingEngine.runRecovery("PERMISSION_DENIED", { buttonId, inputId });
        } else if (event.error === "no-speech") {
          VoiceSelfHealingEngine.runRecovery("NO_SPEECH_DETECTED", { buttonId, inputId });
        } else {
          VoiceSelfHealingEngine.runRecovery("GENERAL_ERROR", { buttonId, inputId });
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
      const normalizedSpoken = spokenText.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      if (!normalizedSpoken) return spokenText;

      const roster = (window.game && window.game.config && window.game.config.roster) || [];
      if (roster.length === 0) return spokenText;

      let bestMatchName = spokenText;
      let bestScore = 0;

      // Direct mappings on the compact string (no spaces)
      const cleanSpoken = normalizedSpoken.replace(/\s+/g, "");
      const nameMappings = {
        "helloarjun": "Allu Arjun",
        "hello": "Allu Arjun",
        "nowthat": "Nagarjuna",
        "nowthere": "Nagarjuna",
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
        "baahubali": "Prabhas",
        "bahubali": "Prabhas"
      };

      // 1. Check custom direct mappings
      if (nameMappings[cleanSpoken]) {
        return nameMappings[cleanSpoken];
      }

      // 2. Perform fuzzy string matching over the roster names using tokens
      roster.forEach(star => {
        const starName = star.name;
        const starNormalized = starName.toLowerCase().replace(/[^a-z0-9\s]/g, "");
        const cleanStar = starNormalized.replace(/\s+/g, "");

        // Exact substring matches
        if (cleanSpoken.includes(cleanStar) || cleanStar.includes(cleanSpoken)) {
          bestScore = 1.0;
          bestMatchName = starName;
          return;
        }

        // Token match calculation
        const spokenTokens = normalizedSpoken.split(/\s+/);
        const starTokens = starNormalized.split(/\s+/);
        
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
