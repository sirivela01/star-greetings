// Voice Recognition/Speech-to-Text Utility for Star Greetings
// Includes real-time interim results typing and fuzzy-name auto-correction.
(function() {
  let activeRecorder = null;
  let activeStream = null;
  let activeChunks = [];
  let recordTimeout = null;

  // Web Audio Contexts for VAD and VU Visualizations
  let audioCtx = null;
  let audioSource = null;
  let audioAnalyser = null;
  let vadAnimationFrame = null;

  // Track attempt history for active session to prevent infinite recovery loops
  let attemptedEngines = new Set();
  let currentEngineType = null; // 'webspeech' or 'mediarecorder'

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

  function startSilenceDetection(stream, recorder, buttonId, inputId) {
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
      
      // Dynamic ambient noise floor calibration (first 150ms)
      let noiseFloorSamples = [];
      let calibrationStart = Date.now();
      let silenceVolumeThreshold = 12; // default
      const silenceDurationLimit = 1200; // ms (increased from 400ms to prevent premature cutoff)

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

        // Dynamic VU visualizer feedback
        const btnEl = document.getElementById(buttonId);
        if (btnEl && btnEl.classList.contains("listening")) {
          const intensity = Math.min(100, Math.max(0, averageVolume * 2));
          btnEl.style.setProperty("--vu-pulse", `${intensity}px`);
        }

        const currentTime = Date.now();
        if (currentTime - calibrationStart < 150) {
          noiseFloorSamples.push(averageVolume);
          vadAnimationFrame = requestAnimationFrame(checkAudioSilence);
          return;
        } else if (noiseFloorSamples.length > 0) {
          const avgNoise = noiseFloorSamples.reduce((a,b) => a+b, 0) / noiseFloorSamples.length;
          silenceVolumeThreshold = Math.max(8, Math.min(25, avgNoise + 6)); // set adaptive threshold
          noiseFloorSamples = []; // clear
          VoiceSelfHealingEngine.log("CALIBRATION_COMPLETE", `Noise floor: ${avgNoise.toFixed(1)}, threshold: ${silenceVolumeThreshold}`);
        }

        // Speech vs Silence check
        if (averageVolume > silenceVolumeThreshold) {
          lastSpeechTime = currentTime;
        } else if (currentTime - lastSpeechTime > silenceDurationLimit) {
          VoiceSelfHealingEngine.log("SILENCE_AUTO_STOP", `No speech detected for ${silenceDurationLimit}ms. Stopping recorder.`);
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
      if (this.diagnosticLog.length > 30) this.diagnosticLog.shift();
    },

    async runRecovery(errorType, context = {}) {
      this.log("ERROR_DETECTED", { errorType, context });
      
      switch(errorType) {
        case "PERMISSION_DENIED":
          this.showPermissionGuide();
          this.resetMicUI(context.buttonId, context.inputId);
          this.releaseStreams();
          break;
          
        case "ENGINE_STUCK":
        case "ENGINE_ERROR":
        case "API_TRANSCRIBE_FAILED":
        case "NO_SPEECH_DETECTED":
          // Fallback Strategy: If one engine fails, try the alternative
          const nextEngine = this.getFallbackEngine();
          if (nextEngine && !attemptedEngines.has(nextEngine)) {
            this.log("FALLBACK_TRIGGERED", `Switching from ${currentEngineType} to ${nextEngine}`);
            this.resetMicUI(context.buttonId, context.inputId, "Retrying alternative engine...");
            this.releaseStreams();
            
            // Execute next engine
            setTimeout(() => {
              if (nextEngine === "webspeech") {
                startWebSpeechRecognition(context.inputId, context.buttonId);
              } else if (nextEngine === "mediarecorder") {
                startMediaRecording(context.inputId, context.buttonId);
              }
            }, 300);
          } else {
            this.log("RECOVERY_ACTION", "All speech engines exhausted. Prompting manual input.");
            this.showSpeechTooltip(context.inputId, errorType === "NO_SPEECH_DETECTED");
            this.releaseStreams();
            this.resetMicUI(context.buttonId, context.inputId);
          }
          break;

        default:
          this.log("RECOVERY_ACTION", "General reset applied.");
          this.releaseStreams();
          this.resetMicUI(context.buttonId, context.inputId);
          break;
      }
    },

    getFallbackEngine() {
      if (currentEngineType === "webspeech") {
        return "mediarecorder";
      } else if (currentEngineType === "mediarecorder") {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) return "webspeech";
      }
      return null;
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
      if (window.activeSpeechRecognition) {
        try {
          window.activeSpeechRecognition.abort();
        } catch (e) {}
        window.activeSpeechRecognition = null;
      }
    },

    resetMicUI(buttonId, inputId, customPlaceholder = null) {
      const btnEl = document.getElementById(buttonId);
      const inputEl = document.getElementById(inputId);
      if (btnEl) {
        btnEl.classList.remove("listening");
        btnEl.innerHTML = "🎙️";
        btnEl.style.removeProperty("--vu-pulse");
      }
      if (inputEl) {
        inputEl.placeholder = customPlaceholder || "Type Hero/Heroine Name...";
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
      toast.style.background = "rgba(18, 18, 24, 0.98)";
      toast.style.color = "#ffffff";
      toast.style.padding = "16px 24px";
      toast.style.borderRadius = "12px";
      toast.style.boxShadow = "0 8px 32px rgba(0,0,0,0.6)";
      toast.style.border = "1px solid rgba(6, 182, 212, 0.4)";
      toast.style.zIndex = "10000";
      toast.style.maxWidth = "90%";
      toast.style.fontSize = "14px";
      toast.style.lineHeight = "1.5";
      toast.style.textAlign = "center";
      toast.style.backdropFilter = "blur(8px)";

      toast.innerHTML = `
        <div style="font-weight: bold; color: var(--accent-cyan, #06b6d4); margin-bottom: 6px;">🎙️ Microphone Permission Guide</div>
        <div style="margin-bottom: 8px;">Please allow microphone access in your browser settings to use voice input:</div>
        <div style="text-align: left; font-size: 12px; color: #ccc; background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
          <strong>Chrome/Edge:</strong> Click the Lock 🔒 icon in the address bar &gt; set Microphone to <strong>Allow</strong>.<br/>
          <strong>Safari:</strong> Go to Settings &gt; Websites &gt; Microphone &gt; set to <strong>Allow</strong>.<br/>
          <strong>Firefox:</strong> Click the Mic icon next to address bar &gt; clear Blocked permissions.
        </div>
        <button id="close-voice-toast" style="margin-top: 10px; background: linear-gradient(135deg, #06b6d4, #0891b2); border: none; color: black; font-weight: bold; padding: 6px 16px; borderRadius: 6px; cursor: pointer; font-size: 12px;">Got it</button>
      `;

      document.body.appendChild(toast);
      document.getElementById("close-voice-toast").onclick = () => toast.remove();
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 10000);
    },

    showSpeechTooltip(inputId, isSilence = false) {
      const inputEl = document.getElementById(inputId);
      if (inputEl) {
        inputEl.placeholder = isSilence 
          ? "🎙️ Speak louder & closer to microphone..." 
          : "🎙️ Try typing if voice recognition fails...";
        setTimeout(() => {
          if (inputEl.placeholder.includes("Speak louder") || inputEl.placeholder.includes("Try typing")) {
            inputEl.placeholder = "Type Hero/Heroine Name...";
          }
        }, 3000);
      }
    }
  };

  // MAIN ENTRY POINT FOR CLIENT CALLS
  window.startSpeechRecognition = function(inputId, buttonId) {
    const btnEl = document.getElementById(buttonId);
    if (!btnEl) return;

    // Toggle behavior: if already recording/listening, stop it
    if (btnEl.classList.contains("listening")) {
      VoiceSelfHealingEngine.releaseStreams();
      VoiceSelfHealingEngine.resetMicUI(buttonId, inputId);
      return;
    }

    // Reset attempt records for a fresh session
    attemptedEngines.clear();

    // Prefer Native browser Web Speech API (shows real-time interim results, no network latency)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      startWebSpeechRecognition(inputId, buttonId);
    } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) {
      startMediaRecording(inputId, buttonId);
    } else {
      alert("Voice recognition is not supported in this browser. Please use Chrome, Safari or Edge.");
    }
  };

  // ENGINE 1: NATIVE WEB SPEECH API (Primary)
  function startWebSpeechRecognition(inputId, buttonId) {
    const inputEl = document.getElementById(inputId);
    const btnEl = document.getElementById(buttonId);
    if (!inputEl || !btnEl) return;

    currentEngineType = "webspeech";
    attemptedEngines.add("webspeech");
    VoiceSelfHealingEngine.log("ENGINE_START", "WebSpeechRecognition");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 3;

    let finalTranscript = "";
    let isStuckCheck = null;

    recognition.onstart = function() {
      btnEl.classList.add("listening");
      btnEl.innerHTML = "🔴";
      btnEl.style.setProperty("--vu-pulse", "4px");
      inputEl.value = "";
      inputEl.placeholder = "Listening... Speak now!";
      window.activeSpeechRecognition = recognition;

      // Web Audio API VU visualizer dummy loop (since Web Speech handles audio input directly)
      let dummyPulseIndex = 0;
      const pulseInterval = setInterval(() => {
        if (window.activeSpeechRecognition !== recognition) {
          clearInterval(pulseInterval);
          return;
        }
        // Create an organic pulse while listening
        const dummyVal = 3 + Math.sin(dummyPulseIndex) * 5;
        btnEl.style.setProperty("--vu-pulse", `${dummyVal}px`);
        dummyPulseIndex += 0.4;
      }, 80);

      // Guard: if no speech results arrive within 4.5 seconds, trigger error recovery
      isStuckCheck = setTimeout(() => {
        if (window.activeSpeechRecognition === recognition && !finalTranscript) {
          VoiceSelfHealingEngine.log("ENGINE_STUCK", "WebSpeech timed out with no results");
          recognition.abort();
          VoiceSelfHealingEngine.runRecovery("ENGINE_STUCK", { buttonId, inputId });
        }
      }, 4500);
    };

    recognition.onerror = function(event) {
      if (isStuckCheck) clearTimeout(isStuckCheck);
      VoiceSelfHealingEngine.log("SPEECH_REC_ERROR", event.error);
      
      if (event.error === "not-allowed") {
        VoiceSelfHealingEngine.runRecovery("PERMISSION_DENIED", { buttonId, inputId });
      } else if (event.error === "no-speech") {
        VoiceSelfHealingEngine.runRecovery("NO_SPEECH_DETECTED", { buttonId, inputId });
      } else {
        VoiceSelfHealingEngine.runRecovery("ENGINE_ERROR", { buttonId, inputId });
      }
    };

    recognition.onend = async function() {
      if (isStuckCheck) clearTimeout(isStuckCheck);
      
      const roster = (window.game && window.game.config && window.game.config.roster) || [];
      const rosterNames = roster.map(s => s.name);

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
      
      if (window.activeSpeechRecognition === recognition) {
        VoiceSelfHealingEngine.resetMicUI(buttonId, inputId);
        window.activeSpeechRecognition = null;
      }
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

    try {
      recognition.start();
    } catch (e) {
      console.warn("SpeechRecognition start failed:", e);
      VoiceSelfHealingEngine.runRecovery("ENGINE_ERROR", { buttonId, inputId });
    }
  }

  // ENGINE 2: MEDIARECORDER + BACKEND TRANSCRIBE (Secondary Fallback)
  function startMediaRecording(inputId, buttonId) {
    const inputEl = document.getElementById(inputId);
    const btnEl = document.getElementById(buttonId);
    if (!inputEl || !btnEl) return;

    currentEngineType = "mediarecorder";
    attemptedEngines.add("mediarecorder");
    VoiceSelfHealingEngine.log("ENGINE_START", "MediaRecorder");

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

          const roster = (window.game && window.game.config && window.game.config.roster) || [];
          const rosterNames = roster.map(s => s.name);

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
              VoiceSelfHealingEngine.resetMicUI(buttonId, inputId);
            } else {
              throw new Error(data.error || "Failed to transcribe");
            }
          } catch (err) {
            VoiceSelfHealingEngine.runRecovery("API_TRANSCRIBE_FAILED", { buttonId, inputId });
          }
        };

        btnEl.classList.add("listening");
        btnEl.innerHTML = "🔴"; // Red record indicator
        inputEl.value = "";
        inputEl.placeholder = "Recording voice... Speak now!";

        recorder.start();
        
        // Start Audio Silence / Voice Activity Detection (VAD) with VU level calculations
        startSilenceDetection(stream, recorder, buttonId, inputId);

        // Auto-stop after 4.5 seconds (max limit) - increased from 1.0 second to allow full pronunciation
        recordTimeout = setTimeout(() => {
          if (activeRecorder && activeRecorder.state === "recording") {
            VoiceSelfHealingEngine.log("RECORD_MAX_LIMIT_REACHED", "Auto-stopping at 4.5s max timeout");
            activeRecorder.stop();
          }
        }, 4500);

      })
      .catch(err => {
        VoiceSelfHealingEngine.log("GET_USER_MEDIA_FAILED", err.message);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          VoiceSelfHealingEngine.runRecovery("PERMISSION_DENIED", { buttonId, inputId });
        } else {
          VoiceSelfHealingEngine.runRecovery("ENGINE_ERROR", { buttonId, inputId });
        }
      });
  }

  /**
   * Fuzzy match spoken text against the current active stars roster.
   * This local matcher is extremely fast and fallback-safe.
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
      "now": "Nagarjuna",
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
      "rashmika": "Dear Comrade",
      "dearcomrade": "Dear Comrade",
      "poojahegde": "Ala Vaikuntapurramulo",
      "pooja": "Ala Vaikuntapurramulo",
      "alavaikuntapurramulo": "Ala Vaikuntapurramulo",
      "nani": "Nani",
      "vijaydeverakonda": "Vijay Deverakonda",
      "vijay": "Vijay Deverakonda",
      "keerthysuresh": "Dasara",
      "keerthi": "Dasara",
      "dasara": "Dasara",
      "anushkashetty": "Anushka Shetty",
      "anushka": "Anushka Shetty",
      "sweety": "Anushka Shetty",
      "kajalaggarwal": "Kajal Aggarwal",
      "kajal": "Kajal Aggarwal",
      "saipallavi": "Maari 2",
      "maari": "Maari 2",
      "maari2": "Maari 2",
      "shruthi": "Srimanthudu",
      "shruthihaasan": "Srimanthudu",
      "srimanthudu": "Srimanthudu",
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
})();

