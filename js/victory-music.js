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
    allu_arjun:         { videoId: 'pnzdyfCKCT0', start: 10,  song: 'Srivalli',            movie: 'Pushpa' },
    prabhas:            { videoId: '4DfuGTfubsI', start: 0,   song: 'Saahore Baahubali',   movie: 'Baahubali 2' },
    mahesh_babu:        { videoId: 'kYJmG2cT9lQ', start: 8,   song: 'Bad Boy',             movie: 'Businessman' },
    jr_ntr:             { videoId: 'Uo1v9-Hl4pE', start: 0,   song: 'Chuttamalle',         movie: 'Devara' },
    ram_charan:         { videoId: 'kYmZ6x4G-18', start: 0,   song: 'Massa Massa',         movie: 'Peddi' },
    samantha:           { videoId: 'TbkCa4Ij6Ek', start: 15,  song: 'Oo Antava',           movie: 'Pushpa' },
    rashmika:           { videoId: 'dPk-0cD1oKk', start: 0,   song: 'Saami Saami',         movie: 'Pushpa' },
    vijay_deverakonda:  { videoId: 'rGFHypqFXfI', start: 0,   song: 'Kalaavathi',          movie: 'Sarkaru Vaari Paata' },
    nani:               { videoId: 'JMoNuTHTfTo', start: 0,   song: 'Yedo Yekkado',        movie: 'Jersey' },
    pooja_hegde:        { videoId: '1P8M9PQWWYM', start: 0,   song: 'Bullet',              movie: 'Radhe Shyam' },
    kajal_aggarwal:     { videoId: 'KkAiVmkwGUk', start: 0,   song: 'Dhinka Chika',        movie: 'Ready' },
    sai_pallavi:        { videoId: 'VynaFxCvPEI', start: 0,   song: 'Rowdy Baby',          movie: 'Maari 2' },
    keerthy_suresh:     { videoId: 'nfWlot6h_JM', start: 0,   song: 'Nuvve Nuvve',         movie: 'Dasara' },
    anushka_shetty:     { videoId: 'H_LUgXByY5Q', start: 0,   song: 'Baahubali Theme',     movie: 'Baahubali' },
    shruti_haasan:      { videoId: 'aasrh2GBsmU', start: 0,   song: 'Oh Baby',             movie: 'Oh! Baby' },

    // ── BOLLYWOOD ────────────────────────────────────────────────────────
    shah_rukh_khan:     { videoId: 'j20Cm2uIUwk', start: 0,   song: 'Chaiyya Chaiyya',     movie: 'Dil Se' },
    ranbir_kapoor:      { videoId: 'yFn2_m4oHOM', start: 0,   song: 'Channa Mereya',       movie: 'Ae Dil Hai Mushkil' },
    ranveer_singh:      { videoId: 'O-AfrHSLVPU', start: 0,   song: 'Malhari',             movie: 'Bajirao Mastani' },
    alia_bhatt:         { videoId: 'K4o6DKGFMp0', start: 0,   song: 'Kesariya',            movie: 'Brahmastra' },
    deepika_padukone:   { videoId: 'e2lnLTBBCeU', start: 0,   song: 'Nagada Sang Dhol',    movie: 'Ram-Leela' },
    hrithik_roshan:     { videoId: 'qwfCHf3BKSA', start: 0,   song: 'Ghungroo',            movie: 'War' },
    katrina_kaif:       { videoId: 'fGhWMj0CQWU', start: 0,   song: 'Chikni Chameli',      movie: 'Agneepath' },
    priyanka_chopra:    { videoId: '3f7wWMRD67Y', start: 0,   song: 'Desi Girl',           movie: 'Dostana' },
    kareena_kapoor:     { videoId: 'B9OxWtCbqpI', start: 0,   song: 'Fevicol Se',          movie: 'Dabangg 2' },
    vicky_kaushal:      { videoId: 'sMnXjKWGjTc', start: 0,   song: 'Bijlee Bijlee',       movie: 'Uri' },
    kiara_advani:       { videoId: 'E_RL6cpVrHE', start: 0,   song: 'Ranjha',              movie: 'Shershaah' },
    ayushmann_khurrana: { videoId: 'k7j0o4JpFsE', start: 0,   song: 'Bala',               movie: 'Bala' },
    shraddha_kapoor:    { videoId: 'tS34-LzGHgo', start: 0,   song: 'Galliyan',            movie: 'Ek Villain' },
    rajkummar_rao:      { videoId: 'XBo4bMCRH0E', start: 0,   song: 'Aao Kabhi Haveli Pe', movie: 'Stree' },
    kriti_sanon:        { videoId: 'gq6_L72J0WY', start: 0,   song: 'Mimi Title Track',    movie: 'Mimi' },
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
     * After loadVideoById() the player transitions to BUFFERING(3) then
     * PLAYING(1). We call playVideo() on BUFFERING to kick off playback
     * in case the initial playVideo() call was ignored while loading.
     */
    if (event.data === 3 /* BUFFERING */ || event.data === 5 /* CUED */) {
      try { ytPlayer.playVideo(); } catch (_) {}
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

    const stopBtn = document.getElementById('vmt-stop-btn');
    if (stopBtn) stopBtn.addEventListener('click', () => stopSong());

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
      // loadVideoById starts buffering; onStateChange will call playVideo()
      ytPlayer.loadVideoById({ videoId: entry.videoId, startSeconds: entry.start || 0 });
      // Also call playVideo() immediately — it may work right away
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
  `;
  document.head.appendChild(style);

  /* ─── 8. INIT — pre-load the API on page load ───────────────────────── */
  loadYouTubeAPI();

})();
