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
    allu_arjun:         { videoId: '09gyurxkX6A', start: 0,   song: 'Thaggede Le (Dialogue)', movie: 'Pushpa' },
    prabhas:            { videoId: 'IBlnvjem8jI', start: 0,   song: 'Please... I Request (Dialogue)', movie: 'Salaar' },
    mahesh_babu:        { videoId: 'VK77umRSaME', start: 10,  song: 'Mind Block',             movie: 'Sarileru Neekevvaru' },
    jr_ntr:             { videoId: 'y75QtkYiAwU', start: 0,   song: 'Fear Dialogue',          movie: 'Devara' },
    ram_charan:         { videoId: 'bO9Y3ArFnYA', start: 0,   song: 'Cricketer To Wrestler (Dialogue)', movie: 'Peddi' },
    samantha:           { videoId: 'u6BoyOceiPE', start: 20,  song: 'Oo Antava',              movie: 'Pushpa' },
    rashmika:           { videoId: 'C70GJYVoZ4Y', start: 10,  song: 'Saami Saami',            movie: 'Pushpa' },
    vijay_deverakonda:  { videoId: '8IyDUalEhrw', start: 5,   song: 'Angry Mass BGM',         movie: 'Arjun Reddy' },
    nani:               { videoId: 'kAtfaaUgDRU', start: 0,   song: 'Arjun Sarkaar (Dialogue)', movie: 'HIT: The Third Case' },
    pooja_hegde:        { videoId: 'EsLmVQKiEv0', start: 30,  song: 'Butta Bomma',            movie: 'Ala Vaikunthapurramuloo' },
    kajal_aggarwal:     { videoId: 'Q2IFPrLq0RM', start: 30,  song: 'Chali Chaliga',          movie: 'Mr. Perfect' },
    sai_pallavi:        { videoId: '3nauk_scj9U', start: 15,  song: 'Rowdy Baby',             movie: 'Maari 2' },
    keerthy_suresh:     { videoId: 'U5D3LSwAmZY', start: 60,  song: 'Chamkeela Angeelesi',    movie: 'Dasara' },
    anushka_shetty:     { videoId: 'pTdwbwoERSA', start: 20,  song: 'Darlingey',              movie: 'Mirchi' },
    shruti_haasan:      { videoId: 'kYJ6_g9pG9s', start: 10,  song: 'Charuseela',             movie: 'Srimanthudu' },
    pawan_kalyan:       { videoId: 'ePOglweqy7o', start: 0,   song: 'Hungry Cheetah (Dialogue)', movie: 'OG' },
    chiranjeevi:        { videoId: '6nH0YFbiRGA', start: 0,   song: 'Veera Shankar Reddy (Dialogue)', movie: 'Indra' },

    // ── BOLLYWOOD ────────────────────────────────────────────────────────
    shah_rukh_khan:     { videoId: 'i9A9NuTHUag', start: 0,   song: 'Chaiyya Chaiyya',        movie: 'Dil Se' },
    ranbir_kapoor:      { videoId: 'S7tYeUBgGHU', start: 60,  song: 'Channa Mereya',          movie: 'Ae Dil Hai Mushkil' },
    ranveer_singh:      { videoId: 'lL3KXtRjjYI', start: 20,  song: 'Malhari',                movie: 'Bajirao Mastani' },
    alia_bhatt:         { videoId: 'W1S9AbHpWFY', start: 15,  song: 'Kesariya',               movie: 'Brahmastra' },
    deepika_padukone:   { videoId: 'ZLor6YJ1oWI', start: 60,  song: 'Nagada Sang Dhol',       movie: 'Ram-Leela' },
    hrithik_roshan:     { videoId: 'Ir1J728cIck', start: 30,  song: 'Ghungroo',               movie: 'War' },
    katrina_kaif:       { videoId: 'cCmZ7aFU1xY', start: 40,  song: 'Kala Chashma',           movie: 'Baar Baar Dekho' },
    priyanka_chopra:    { videoId: 'wDIrpvH8MzE', start: 60,  song: 'Desi Girl',              movie: 'Dostana' },
    kareena_kapoor:     { videoId: '_0nEaQRCtJ8', start: 10,  song: 'Chammak Challo',         movie: 'Ra.One' },
    vicky_kaushal:      { videoId: '3YQKuAP79Q8', start: 30,  song: 'Tauba Tauba',            movie: 'Bad Newz' },
    kiara_advani:       { videoId: 'UU-eUEt-tPg', start: 30,  song: 'Ranjha',                 movie: 'Shershaah' },
    ayushmann_khurrana: { videoId: 'AWYwXlTWkAw', start: 0,   song: 'Bala',                   movie: 'Bala' },
    shraddha_kapoor:    { videoId: 'orEN9VEVBK8', start: 60,  song: 'Galliyan',               movie: 'Ek Villain' },
    rajkummar_rao:      { videoId: 'xbCntoTged4', start: 80,  song: 'Aao Kabhi Haveli Pe',    movie: 'Stree' },
    kriti_sanon:        { videoId: 'sh9GS1sc_eg', start: 30,  song: 'Param Sundari',          movie: 'Mimi' },
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
  let audioUnlocked = false;
  const isMobile    = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

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
     * KEY FIX: The player iframe must be VISIBLE (in the viewport) and not have 
     * zero dimensions/opacity:0, otherwise Chrome/Edge will block audio output 
     * completely. We set width:320px, height:180px, opacity:0.01 (virtually invisible)
     * and zIndex:9999 with pointer-events:none so it is click-through.
     * We also explicitly set the allow="autoplay; encrypted-media" attribute.
     */
    const wrap = document.createElement('div');
    wrap.id = 'yt-victory-wrap';
    Object.assign(wrap.style, {
      position:      'fixed',
      bottom:        '10px',
      right:         '10px',
      width:         '320px',
      height:        '180px',
      opacity:       '0.01',
      pointerEvents: 'none',
      zIndex:        '9999',
      overflow:      'hidden',
    });

    // Create the iframe element directly with autoplay permission delegated
    const playerIframe = document.createElement('iframe');
    playerIframe.id = 'yt-victory-player';
    playerIframe.width = '320';
    playerIframe.height = '180';
    playerIframe.setAttribute('allow', 'autoplay; encrypted-media');
    
    // Initialize with first song's videoId to establish proper API channel
    const initialId = VICTORY_SONGS.allu_arjun.videoId;
    playerIframe.src = `https://www.youtube.com/embed/${initialId}?enablejsapi=1&autoplay=0&controls=0&playsinline=1&mute=1&origin=${encodeURIComponent(window.location.origin)}`;

    wrap.appendChild(playerIframe);
    document.body.appendChild(wrap);

    ytPlayer = new YT.Player('yt-victory-player', {
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
    // Double check that the iframe has the allow attribute
    try {
      const iframe = document.getElementById('yt-victory-player');
      if (iframe) {
        iframe.setAttribute('allow', 'autoplay; encrypted-media');
      }
    } catch (_) {}
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
    if (event.data === 3 /* BUFFERING */) {
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
      // Loop the dialogue/song if the 20-second victory timer is still running
      if (stopTimer) {
        try {
          const entry = currentStarId ? VICTORY_SONGS[currentStarId] : null;
          ytPlayer.seekTo(entry ? entry.start || 0 : 0);
          ytPlayer.playVideo();
        } catch (_) {
          stopSong();
        }
      } else {
        stopSong();
      }
    }
  }

  function onPlayerError(event) {
    console.warn('[VictoryMusic] YT error code:', event.data);
    // Error codes: 2=bad param, 5=HTML5 error, 100=not found,
    //              101/150=embedding not allowed
    const entry = currentStarId ? VICTORY_SONGS[currentStarId] : null;
    if (entry && (event.data === 101 || event.data === 150)) {
      showEmbedBlockedWarning(entry);
    } else {
      stopSong(false); // remove toast completely for other errors
    }
  }

  function showEmbedBlockedWarning(entry) {
    if (toastEl) {
      const textEl = toastEl.querySelector('.vmt-text');
      if (textEl) {
        const starName = getStarName(currentStarId);
        textEl.innerHTML = `
          <div class="vmt-song" style="color: #f87171;">⚠️ Embed Restricted</div>
          <div class="vmt-meta" style="color: #fca5a5;">Tap below to hear on YouTube:</div>
          <a href="https://www.youtube.com/watch?v=${entry.videoId}" target="_blank" class="vmt-yt-link" style="color: #fbbf24; text-decoration: underline; font-size: 11px; font-weight: 700; margin-top: 4px; display: inline-block;">Open YouTube ↗</a>
        `;
      }
      if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
      const bar = document.getElementById('vmt-progress');
      if (bar) {
        bar.style.transition = 'none';
        bar.style.width = '100%';
        bar.style.background = '#f87171';
      }
      const unmuteBtn = document.getElementById('vmt-unmute-btn');
      if (unmuteBtn) unmuteBtn.classList.add('hidden');
    }
  }

  /* ─── 4. TOAST NOTIFICATION ─────────────────────────────────────────── */
  function getStarName(starId) {
    const cfg = (window.STAR_CONFIG && window.STAR_CONFIG.roster)
      ? window.STAR_CONFIG.roster.find(s => s.id === starId)
      : null;
    return cfg ? cfg.name : starId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function showToast(starId, song, movie, showPlayButton = false) {
    removeToast();
    const starName = getStarName(starId);
    toastEl = document.createElement('div');
    toastEl.id = 'victory-music-toast';
    
    let actionBtnHtml = '';
    if (showPlayButton) {
      actionBtnHtml = `<button class="vmt-play-btn" id="vmt-play-btn">▶ TAP TO PLAY</button>`;
    } else {
      actionBtnHtml = `<button class="vmt-unmute" id="vmt-unmute-btn" title="Tap to hear">🔊 Unmute</button>`;
    }

    toastEl.innerHTML = `
      <div class="vmt-inner">
        <span class="vmt-icon">🎵</span>
        <div class="vmt-text">
          <div class="vmt-song">${song}</div>
          <div class="vmt-meta">${movie} · ${starName}</div>
          <div class="vmt-bar-wrap"><div class="vmt-bar" id="vmt-progress"></div></div>
        </div>
        ${actionBtnHtml}
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

    // Play button (mobile unlock)
    const playBtn = document.getElementById('vmt-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        const entry = VICTORY_SONGS[currentStarId];
        if (entry && ytPlayer) {
          try {
            audioUnlocked = true; // Mark as unlocked
            ytPlayer.unMute();
            ytPlayer.setVolume(100);
            ytPlayer.loadVideoById({ videoId: entry.videoId, startSeconds: entry.start || 0 });
            ytPlayer.unMute();
            ytPlayer.setVolume(100);
            ytPlayer.playVideo();
          } catch (e) {
            console.error('[VictoryMusic] Manual play error:', e);
          }
        }
        playBtn.remove();
      });
    }

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

      // Auto-hide the unmute button after 5 seconds to keep the UI clean
      setTimeout(() => {
        const btn = document.getElementById('vmt-unmute-btn');
        if (btn) btn.classList.add('hidden');
      }, 5000);
    }

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

    let shouldAutoPlay = true;
    if (isMobile && !audioUnlocked) {
      shouldAutoPlay = false;
    }

    if (shouldAutoPlay) {
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
      }
    }

    showToast(starId, entry.song, entry.movie, !shouldAutoPlay);

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
    .vmt-play-btn {
      background: linear-gradient(135deg, #10b981, #34d399);
      border: none;
      color: #1a1a2e;
      padding: 6px 12px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 800;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(16,185,129,0.4);
      animation: vmtPulseGreen 1s ease infinite alternate;
    }
    @keyframes vmtPulseGreen {
      from { box-shadow: 0 2px 8px rgba(16,185,129,0.4); }
      to   { box-shadow: 0 2px 16px rgba(16,185,129,0.8); }
    }
    .vmt-play-btn:hover { background: linear-gradient(135deg, #34d399, #6ee7b7); }
    .hidden { display: none !important; }
  `;
  document.head.appendChild(style);

  /* ─── 8. INIT — pre-load the API on page load ───────────────────────── */
  loadYouTubeAPI();

  /* ─── 9. AUDIO UNLOCK FOR MOBILE ────────────────────────────────────── */
  function unlockAudio() {
    if (audioUnlocked || !ytPlayer || typeof ytPlayer.playVideo !== 'function') return;
    try {
      ytPlayer.mute();
      ytPlayer.playVideo();
      setTimeout(() => {
        try {
          ytPlayer.pauseVideo();
          ytPlayer.unMute();
          ytPlayer.setVolume(100);
          audioUnlocked = true;
          console.log('[VictoryMusic] Audio context unlocked.');
        } catch (_) {}
      }, 200);
    } catch (_) {}
    document.removeEventListener('touchend', unlockAudio);
    document.removeEventListener('click', unlockAudio);
  }
  document.addEventListener('touchend', unlockAudio, { passive: true });
  document.addEventListener('click', unlockAudio, { passive: true });

})();
