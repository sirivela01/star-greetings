/**
 * victory-music.js
 * Plays a star's famous movie song (20 sec) via YouTube IFrame API
 * when that star's greeting card wins a round or the match.
 *
 * FIX: YouTube hidden off-screen players (-9999px) are treated as
 * background audio by Chrome and are silently blocked.
 * Solution: player is placed on-screen but fully transparent (opacity:0)
 * at 1x1px so the browser considers it a foreground player.
 */

(function () {
  'use strict';

  /* ─── 1. STAR → SONG MAP ─────────────────────────────────────────────
     videoId  : YouTube video ID (official channel uploads only)
     start    : seconds to seek to (chorus / best part)
     song     : display name shown in the toast
     movie    : movie name
  ──────────────────────────────────────────────────────────────────────── */
  const VICTORY_SONGS = {
    // ── TOLLYWOOD ────────────────────────────────────────────────────────
    allu_arjun:         { videoId: 'Q1w226eM6m8', start: 30,  song: 'Srivalli',              movie: 'Pushpa' },
    prabhas:            { videoId: 'Prot7h5vuMc', start: 15,  song: 'Naatu Naatu',            movie: 'RRR' },
    mahesh_babu:        { videoId: 'avqnaE-XTYI', start: 0,   song: 'Seeti Maar',             movie: 'DJ Tillu' },
    jr_ntr:             { videoId: '5vsOv_bcnhs', start: 20,  song: 'Chuttamalle',            movie: 'Devara' },
    ram_charan:         { videoId: 'Prot7h5vuMc', start: 90,  song: 'Naatu Naatu',            movie: 'RRR' },
    samantha:           { videoId: 'Q1w226eM6m8', start: 60,  song: 'Oo Antava',              movie: 'Pushpa' },
    rashmika:           { videoId: 'Q1w226eM6m8', start: 0,   song: 'Saami Saami',            movie: 'Pushpa' },
    vijay_deverakonda:  { videoId: 'BddP6PY9oSk', start: 45,  song: 'Kalaavathi',             movie: 'Sarkaru Vaari Paata' },
    nani:               { videoId: 'Prot7h5vuMc', start: 45,  song: 'Yedo Yekkado',           movie: 'Jersey' },
    pooja_hegde:        { videoId: 'BddP6PY9oSk', start: 0,   song: 'Bullet',                 movie: 'Radhe Shyam' },
    kajal_aggarwal:     { videoId: 'lP467N3oQcM', start: 20,  song: 'Dhinka Chika',           movie: 'Ready' },
    sai_pallavi:        { videoId: 'Prot7h5vuMc', start: 0,   song: 'Rowdy Baby',             movie: 'Maari 2' },
    keerthy_suresh:     { videoId: '5vsOv_bcnhs', start: 60,  song: 'Chamkeela Angeelesi',    movie: 'Dasara' },
    anushka_shetty:     { videoId: 'Prot7h5vuMc', start: 30,  song: 'Baahubali Theme',        movie: 'Baahubali' },
    shruti_haasan:      { videoId: 'BddP6PY9oSk', start: 30,  song: 'Oh Baby',                movie: 'Oh! Baby' },

    // ── BOLLYWOOD ────────────────────────────────────────────────────────
    shah_rukh_khan:     { videoId: 'lP467N3oQcM', start: 0,   song: 'Chaiyya Chaiyya',        movie: 'Dil Se' },
    ranbir_kapoor:      { videoId: 'BddP6PY9oSk', start: 60,  song: 'Channa Mereya',          movie: 'Ae Dil Hai Mushkil' },
    ranveer_singh:      { videoId: 'a6PUh-n0NYg', start: 20,  song: 'Malhari',                movie: 'Bajirao Mastani' },
    alia_bhatt:         { videoId: 'BddP6PY9oSk', start: 0,   song: 'Kesariya',               movie: 'Brahmastra' },
    deepika_padukone:   { videoId: 'a6PUh-n0NYg', start: 60,  song: 'Nagada Sang Dhol',       movie: 'Ram-Leela' },
    hrithik_roshan:     { videoId: 'qFkNATtc3mc', start: 30,  song: 'Ghungroo',               movie: 'War' },
    katrina_kaif:       { videoId: 'lP467N3oQcM', start: 40,  song: 'Chikni Chameli',         movie: 'Agneepath' },
    priyanka_chopra:    { videoId: 'lP467N3oQcM', start: 60,  song: 'Desi Girl',              movie: 'Dostana' },
    kareena_kapoor:     { videoId: 'a6PUh-n0NYg', start: 0,   song: 'Fevicol Se',             movie: 'Dabangg 2' },
    vicky_kaushal:      { videoId: 'qFkNATtc3mc', start: 60,  song: 'Bijlee Bijlee',          movie: 'Uri' },
    kiara_advani:       { videoId: 'kY41LShC1YI', start: 30,  song: 'Ranjha',                 movie: 'Shershaah' },
    ayushmann_khurrana: { videoId: 'kY41LShC1YI', start: 0,   song: 'Bala',                   movie: 'Bala' },
    shraddha_kapoor:    { videoId: 'kY41LShC1YI', start: 60,  song: 'Galliyan',               movie: 'Ek Villain' },
    rajkummar_rao:      { videoId: 'lP467N3oQcM', start: 80,  song: 'Aao Kabhi Haveli Pe',    movie: 'Stree' },
    kriti_sanon:        { videoId: 'kY41LShC1YI', start: 90,  song: 'Mimi Title Track',       movie: 'Mimi' },
  };

  const PLAY_DURATION_MS = 20000; // 20 seconds

  /* ─── 2. STATE ──────────────────────────────────────────────────────── */
  let ytPlayer      = null;   // YouTube IFrame player instance
  let stopTimer     = null;   // auto-stop handle
  let toastEl       = null;   // current toast element
  let apiReady      = false;  // YouTube API script loaded?
  let playerReady   = false;  // YT.Player onReady fired?
  let pendingStarId = null;   // queued play request (API not yet ready)
  let currentStarId = null;   // currently loaded/playing star

  /* ─── 3. LOAD YOUTUBE IFRAME API (once) ─────────────────────────────── */
  function loadYouTubeAPI() {
    if (document.getElementById('yt-iframe-api-script')) return;
    const tag = document.createElement('script');
    tag.id  = 'yt-iframe-api-script';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  /* YouTube calls this globally when the API script is ready */
  window.onYouTubeIframeAPIReady = function () {
    apiReady = true;

    /*
     * KEY FIX: The player div must be VISIBLE (in the viewport) even if
     * invisible to the user. Chrome/Edge block audio from players that are
     * positioned far off-screen (e.g., top:-9999px). We use opacity:0 and
     * pointer-events:none on a 1×1px element in the bottom-right corner.
     */
    const wrap = document.createElement('div');
    wrap.id = 'yt-victory-wrap';
    Object.assign(wrap.style, {
      position:      'fixed',
      bottom:        '0',
      right:         '0',
      width:         '1px',
      height:        '1px',
      opacity:       '0',
      pointerEvents: 'none',
      zIndex:        '-1',
      overflow:      'hidden',
    });

    const playerDiv = document.createElement('div');
    playerDiv.id = 'yt-victory-player';
    wrap.appendChild(playerDiv);
    document.body.appendChild(wrap);

    ytPlayer = new YT.Player('yt-victory-player', {
      height: '180',
      width:  '320',
      playerVars: {
        autoplay:       0,
        controls:       0,
        disablekb:      1,
        fs:             0,
        modestbranding: 1,
        rel:            0,
        iv_load_policy: 3,
        playsinline:    1,
        origin:         window.location.origin,
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError,
      },
    });
  };

  function onPlayerReady() {
    playerReady = true;
    console.log('[VictoryMusic] YouTube player ready.');
    // Ensure unmuted at full volume from the start
    try {
      ytPlayer.unMute();
      ytPlayer.setVolume(100);
    } catch (_) {}
    if (pendingStarId) {
      const id = pendingStarId;
      pendingStarId = null;
      playSong(id);
    }
  }

  function onPlayerStateChange(event) {
    /*
     * YT.PlayerState: UNSTARTED=-1, ENDED=0, PLAYING=1,
     *                 PAUSED=2, BUFFERING=3, CUED=5
     *
     * Chrome allows muted autoplay but blocks unmuted autoplay.
     * Strategy: let it start muted if needed, then immediately unmute
     * when it transitions to PLAYING (1) or BUFFERING (3).
     */
    if (event.data === 3 /* BUFFERING */ || event.data === 5 /* CUED */) {
      try {
        ytPlayer.unMute();
        ytPlayer.setVolume(100);
        ytPlayer.playVideo();
      } catch (_) {}
    }
    if (event.data === 1 /* PLAYING */) {
      // Force unmute the moment playback actually starts
      try {
        ytPlayer.unMute();
        ytPlayer.setVolume(100);
      } catch (_) {}
    }
    if (event.data === 0 /* ENDED */) {
      stopSong();
    }
  }

  function onPlayerError(event) {
    console.warn('[VictoryMusic] YT error code:', event.data);
    // Error codes: 2=bad param, 5=HTML5 error, 100=not found,
    //              101/150=embedding not allowed
    stopSong(true);
  }

  /* ─── 4. TOAST NOTIFICATION ─────────────────────────────────────────── */
  function getStarName(starId) {
    const cfg = (window.STAR_CONFIG && window.STAR_CONFIG.roster)
      ? window.STAR_CONFIG.roster.find(s => s.id === starId)
      : null;
    return cfg ? cfg.name : starId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function showToast(starId, song, movie) {
    removeToast();
    const starName = getStarName(starId);
    toastEl = document.createElement('div');
    toastEl.id = 'victory-music-toast';
    toastEl.innerHTML = `
      <div class="vmt-inner">
        <span class="vmt-icon">🎵</span>
        <div class="vmt-text">
          <div class="vmt-song">${song}</div>
          <div class="vmt-meta">${movie} · ${starName}</div>
          <div class="vmt-bar-wrap"><div class="vmt-bar" id="vmt-progress"></div></div>
        </div>
        <button class="vmt-unmute hidden" id="vmt-unmute-btn" title="Tap to hear">🔊</button>
        <button class="vmt-stop" id="vmt-stop-btn" title="Stop music">✕</button>
      </div>
    `;
    document.body.appendChild(toastEl);

    requestAnimationFrame(() => {
      const bar = document.getElementById('vmt-progress');
      if (bar) {
        bar.style.transition = `width ${PLAY_DURATION_MS}ms linear`;
        bar.style.width = '100%';
      }
    });

    // Stop button
    const stopBtn = document.getElementById('vmt-stop-btn');
    if (stopBtn) stopBtn.addEventListener('click', () => stopSong());

    // Unmute button — shown if browser is playing silently
    const unmuteBtn = document.getElementById('vmt-unmute-btn');
    if (unmuteBtn) {
      unmuteBtn.addEventListener('click', () => {
        try {
          ytPlayer.unMute();
          ytPlayer.setVolume(100);
          // If player was paused/stopped due to mute policy, restart
          const state = ytPlayer.getPlayerState ? ytPlayer.getPlayerState() : -1;
          if (state !== 1) ytPlayer.playVideo();
        } catch (_) {}
        unmuteBtn.classList.add('hidden');
      });
    }

    // After 800ms check if the player is muted (browser forced it) — show unmute button
    setTimeout(() => {
      try {
        if (ytPlayer && ytPlayer.isMuted && ytPlayer.isMuted()) {
          ytPlayer.unMute();
          ytPlayer.setVolume(100);
          // If still muted after attempt, show the tap-to-hear button
          setTimeout(() => {
            try {
              if (ytPlayer.isMuted && ytPlayer.isMuted()) {
                const btn = document.getElementById('vmt-unmute-btn');
                if (btn) btn.classList.remove('hidden');
              }
            } catch (_) {}
          }, 300);
        }
      } catch (_) {}
    }, 800);

    setTimeout(() => toastEl && toastEl.classList.add('vmt-visible'), 50);
  }

  function removeToast() {
    if (toastEl) { toastEl.remove(); toastEl = null; }
    const old = document.getElementById('victory-music-toast');
    if (old) old.remove();
  }

  /* ─── 5. PLAY / STOP ────────────────────────────────────────────────── */
  function playSong(starId) {
    const entry = VICTORY_SONGS[starId];
    if (!entry) {
      console.warn('[VictoryMusic] No song mapped for star:', starId);
      return;
    }

    // If API / player not ready yet, queue and ensure API is loading
    if (!apiReady || !playerReady || !ytPlayer || typeof ytPlayer.loadVideoById !== 'function') {
      pendingStarId = starId;
      loadYouTubeAPI();
      return;
    }

    // Stop whatever is playing
    stopSong(true /* silent */);

    currentStarId = starId;

    try {
      // Unmute and set full volume BEFORE loading — browser may have muted it
      ytPlayer.unMute();
      ytPlayer.setVolume(100);
      // loadVideoById starts buffering; onStateChange will call playVideo() + unMute again
      ytPlayer.loadVideoById({ videoId: entry.videoId, startSeconds: entry.start || 0 });
      // Also call playVideo() immediately — it may work right away
      ytPlayer.unMute();
      ytPlayer.setVolume(100);
      ytPlayer.playVideo();
    } catch (e) {
      console.warn('[VictoryMusic] playback error:', e);
      return;
    }

    showToast(starId, entry.song, entry.movie);

    // Auto-stop after 20 s
    stopTimer = setTimeout(() => stopSong(), PLAY_DURATION_MS);
  }

  function stopSong(silent) {
    if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
    if (!silent) removeToast();
    currentStarId = null;
    try {
      if (ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();
    } catch (_) {}
  }

  /* ─── 6. PUBLIC API ─────────────────────────────────────────────────── */
  window.VictoryMusic = {
    play:      playSong,
    stop:      stopSong,
    songs:     VICTORY_SONGS,
    isPlaying: () => !!stopTimer,
  };

  /* ─── 7. TOAST CSS ──────────────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    #victory-music-toast {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.35s ease, transform 0.35s ease;
      pointer-events: auto;
      width: min(340px, 92vw);
    }
    #victory-music-toast.vmt-visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .vmt-inner {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(10, 5, 30, 0.96);
      border: 1px solid rgba(139, 92, 246, 0.6);
      border-radius: 16px;
      padding: 12px 14px;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.15);
    }
    .vmt-icon {
      font-size: 24px;
      flex-shrink: 0;
      animation: vmtBounce 0.6s ease infinite alternate;
    }
    @keyframes vmtBounce {
      from { transform: translateY(0); }
      to   { transform: translateY(-4px); }
    }
    .vmt-text { flex: 1; min-width: 0; }
    .vmt-song {
      font-size: 14px;
      font-weight: 700;
      color: #E8C84A;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .vmt-meta {
      font-size: 11px;
      color: #9C89CC;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .vmt-bar-wrap {
      height: 3px;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
      margin-top: 6px;
      overflow: hidden;
    }
    .vmt-bar {
      height: 100%;
      width: 0;
      background: linear-gradient(90deg, #8B5CF6, #E8C84A);
      border-radius: 2px;
    }
    .vmt-stop {
      background: rgba(255,255,255,0.08);
      border: none;
      color: #9C89CC;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 13px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    .vmt-stop:hover { background: rgba(255,80,80,0.25); color: #ff8080; }
    .vmt-unmute {
      background: linear-gradient(135deg, #f59e0b, #fbbf24);
      border: none;
      color: #1a1a2e;
      padding: 4px 10px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(251,191,36,0.4);
      animation: vmtPulse 1s ease infinite alternate;
    }
    @keyframes vmtPulse {
      from { box-shadow: 0 2px 8px rgba(251,191,36,0.4); }
      to   { box-shadow: 0 2px 16px rgba(251,191,36,0.8); }
    }
    .vmt-unmute:hover { background: linear-gradient(135deg, #fbbf24, #fcd34d); }
    .hidden { display: none !important; }
  `;
  document.head.appendChild(style);

  /* ─── 8. INIT — pre-load the API on page load ───────────────────────── */
  loadYouTubeAPI();

})();
