class BGMPlayer {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.schedulerTimer = null;
    this.nextNoteTime = 0.0;
    this.tempo = 72; // BPM
    this.secondsPerBeat = 60.0 / this.tempo;
    this.beatIndex = 0;
    this.enabled = localStorage.getItem("bgm_enabled") !== "false";
    this.activeNodes = [];
    
    // Chord progression in C Major / A Minor:
    // Bar 1: C Major (C3, G3, C4, E4)
    // Bar 2: F Major (F2, C3, F3, A3)
    // Bar 3: A Minor (A2, E3, A3, C4)
    // Bar 4: G Major (G2, D3, G3, B3)
    this.chords = [
      { bass: 130.81, pad: [196.00, 261.63, 329.63], arpeggio: [261.63, 329.63, 392.00, 523.25, 659.25, 783.99] }, // C Maj
      { bass: 87.31,  pad: [130.81, 174.61, 220.00], arpeggio: [174.61, 220.00, 261.63, 349.23, 440.00, 523.25] }, // F Maj
      { bass: 110.00, pad: [164.81, 220.00, 261.63], arpeggio: [220.00, 261.63, 329.63, 440.00, 523.25, 659.25] }, // A Min
      { bass: 98.00,  pad: [146.83, 196.00, 246.94], arpeggio: [196.00, 246.94, 293.66, 392.00, 493.88, 587.33] }  // G Maj
    ];
  }

  initAudio() {
    if (this.audioCtx) return;
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Master gain for ambient volume
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(0.08, this.audioCtx.currentTime); 
    this.masterGain.connect(this.audioCtx.destination);
  }

  start() {
    if (!this.enabled) return;
    this.initAudio();
    if (this.isPlaying) return;
    
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    
    this.isPlaying = true;
    this.nextNoteTime = this.audioCtx.currentTime + 0.1;
    this.beatIndex = 0;
    
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.activeNodes.forEach(node => {
      try {
        node.gain.gain.cancelScheduledValues(this.audioCtx.currentTime);
        node.gain.gain.setValueAtTime(node.gain.gain.value, this.audioCtx.currentTime);
        node.gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.5);
        setTimeout(() => {
          try { node.osc.stop(); } catch(e) {}
        }, 600);
      } catch (e) {}
    });
    this.activeNodes = [];
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem("bgm_enabled", this.enabled ? "true" : "false");
    if (this.enabled) {
      this.start();
    } else {
      this.stop();
    }
    this.updateButtonUI();
  }

  updateButtonUI() {
    const btn = document.getElementById("global-bgm-btn");
    if (btn) {
      btn.innerHTML = this.enabled ? "🎵" : "🔇";
      btn.title = this.enabled ? "Mute Background Music" : "Play Background Music";
      btn.classList.toggle("muted", !this.enabled);
    }

    const dashboardBtn = document.getElementById("dashboard-music-btn");
    if (dashboardBtn) {
      dashboardBtn.innerHTML = `<span class="music-icon">${this.enabled ? "🎵" : "🔇"}</span> Music ${this.enabled ? "On" : "Off"}`;
      if (this.enabled) {
        dashboardBtn.style.color = "#fbbf24";
        dashboardBtn.style.borderColor = "rgba(245, 158, 11, 0.4)";
      } else {
        dashboardBtn.style.color = "#a1a1aa";
        dashboardBtn.style.borderColor = "rgba(255, 255, 255, 0.15)";
      }
    }
  }

  scheduler() {
    while (this.isPlaying && this.nextNoteTime < this.audioCtx.currentTime + 0.2) {
      this.scheduleNote(this.beatIndex, this.nextNoteTime);
      this.nextNoteTime += this.secondsPerBeat;
      this.beatIndex = (this.beatIndex + 1) % 16;
    }
    if (this.isPlaying) {
      this.schedulerTimer = setTimeout(() => this.scheduler(), 25);
    }
  }

  scheduleNote(beat, time) {
    const barIndex = Math.floor(beat / 4);
    const beatInBar = beat % 4;
    const chord = this.chords[barIndex];
    
    // Play Bass + Pad on beat 0
    if (beatInBar === 0) {
      this.playSynthNote(chord.bass, time, this.secondsPerBeat * 3.8, 'sine', 0.12, 0.2, 0.4);
      chord.pad.forEach(freq => {
        this.playSynthNote(freq, time, this.secondsPerBeat * 3.8, 'triangle', 0.04, 0.4, 0.4);
      });
    }
    
    // Play arpeggiated melodic notes
    if (beatInBar === 0) {
      this.playSynthNote(chord.arpeggio[0], time, 0.8, 'sine', 0.06, 0.05, 0.2);
      this.playSynthNote(chord.arpeggio[3], time + this.secondsPerBeat * 0.5, 0.8, 'sine', 0.05, 0.05, 0.2);
    } else if (beatInBar === 1) {
      this.playSynthNote(chord.arpeggio[1], time, 0.8, 'sine', 0.06, 0.05, 0.2);
      this.playSynthNote(chord.arpeggio[4], time + this.secondsPerBeat * 0.5, 0.8, 'sine', 0.05, 0.05, 0.2);
    } else if (beatInBar === 2) {
      this.playSynthNote(chord.arpeggio[2], time, 0.8, 'sine', 0.06, 0.05, 0.2);
      this.playSynthNote(chord.arpeggio[3], time + this.secondsPerBeat * 0.5, 0.8, 'sine', 0.05, 0.05, 0.2);
    } else if (beatInBar === 3) {
      this.playSynthNote(chord.arpeggio[5], time, 1.2, 'sine', 0.06, 0.05, 0.3);
    }
  }

  playSynthNote(freq, startTime, duration, type = 'sine', volume = 0.1, attack = 0.1, release = 0.2) {
    if (!this.isPlaying) return;
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + attack);
    gainNode.gain.setValueAtTime(volume, startTime + duration - release);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration);

    const nodeRecord = { osc, gain: gainNode };
    this.activeNodes.push(nodeRecord);
    
    setTimeout(() => {
      const idx = this.activeNodes.indexOf(nodeRecord);
      if (idx !== -1) this.activeNodes.splice(idx, 1);
    }, (startTime + duration - this.audioCtx.currentTime + 1) * 1000);
  }
}

// Robust BGM initialization check preventing race conditions with DOMContentLoaded
function initBGM() {
  window.bgm = new BGMPlayer();

  // Create UI Toggle Button
  const btn = document.createElement("button");
  btn.id = "global-bgm-btn";
  btn.className = "bgm-toggle-btn";
  btn.innerHTML = window.bgm.enabled ? "🎵" : "🔇";
  btn.title = window.bgm.enabled ? "Mute Background Music" : "Play Background Music";
  if (!window.bgm.enabled) btn.classList.add("muted");
  document.body.appendChild(btn);

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    window.bgm.toggle();
  });

  // Sync dashboard music button if it exists
  const dashboardBtn = document.getElementById("dashboard-music-btn");
  if (dashboardBtn) {
    dashboardBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.bgm.toggle();
    });
  }

  // Set initial UI state for buttons
  window.bgm.updateButtonUI();

  // Start music automatically on first user click or touch interaction
  const triggerBgm = () => {
    window.bgm.start();
    document.removeEventListener("click", triggerBgm);
    document.removeEventListener("touchstart", triggerBgm);
  };
  document.addEventListener("click", triggerBgm);
  document.addEventListener("touchstart", triggerBgm);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBGM);
} else {
  initBGM();
}
