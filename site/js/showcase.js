(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const body = document.body;
  const api = window.SOLINK_API;

  const layerInfo = [
    { no: '01', name: '后盖与紧固', en: 'REAR COVER / FASTENERS', desc: '后盖、接线块、固定环与四颗长弹簧螺栓，是整机的尾部封装层。' },
    { no: '02', name: '压圈与盖板', en: 'RETAINER / PLATES', desc: '轴承外圈、垫片、顶部盖板、内隔板与红色固定压圈。' },
    { no: '03', name: '定子与导管', en: 'STATOR / CONDUITS', desc: '定子核心、长支撑杆、弯曲导管与带白色铭牌的定子筒。' },
    { no: '04', name: '传感器与弹性件', en: 'SENSOR / SPRINGS', desc: '绿色传感器 PCB、绝缘薄片与三组弹簧销。' },
    { no: '05', name: '转子与主轴', en: 'ROTOR / SHAFT', desc: '主轴、轴承圈、薄垫片与细卡环，是输出端的旋转基准。' },
    { no: '06', name: '外转子壳', en: 'OUTER ROTOR SHELL', desc: '黑色阳极氧化外转子壳，切口内露红色内衬。' },
    { no: '07', name: '前端盖与法兰', en: 'FRONT COVER / FLANGE', desc: '前端盖、轴套法兰与小挡圈，承托输出端。' },
    { no: '08', name: '输出齿轮', en: 'OUTPUT PINION', desc: '顶部输出斜齿轮，是整机的动力输出接口。' }
  ];

  let ready = false;
  let entered = false;
  let lenis = null;
  let labOpen = false;
  let menuOpen = false;
  let stormActive = false;
  let sceneMode = 'boot';
  let activeLayer = -1;
  let bgMode = 'space';
  let userBg = false;
  let musicOn = true;
  let musicRequested = false;
  let musicResumeAfterVideo = false;
  let musicFade = 0;
  let revealObserver = null;
  let cursor = null;
  let labScroll = 0;
  let menuScroll = 0;

  const bgm = $('#bgm');
  const enterBtn = $('#enterBtn');

  function setEnterText(text) {
    const el = $('#enterText');
    if (el) el.textContent = text;
  }

  // Wait for the 3D engine to finish booting.
  const readyTimer = setInterval(() => {
    if (window.SOLINK_API && window.SOLINK_API.ready()) {
      clearInterval(readyTimer);
      if (!ready) onReady();
    }
  }, 90);
  setTimeout(() => {
    if (!ready && window.SOLINK_API) { clearInterval(readyTimer); onReady(); }
  }, 9000);

  function onReady() {
    ready = true;
    setEnterText('ENTER THE AXIS');
    try {
      window.SOLINK_API.setBackground('space');
      bgMode = 'space';
      userBg = false;
    } catch (e) {}
    updateBgUI();
  }

  if (enterBtn) {
    enterBtn.addEventListener('click', () => {
      const soundOpt = document.querySelector('.launch-opt[data-opt="sound"]');
      if (!soundOpt || soundOpt.classList.contains('is-on')) {
        startMusic();
      } else {
        musicOn = false;
        syncMusicUI();
      }
      setEnterText('ENTERING');
      beginSiteSoon();
    }, true);
  }

  function beginSiteSoon() {
    if (entered) return;
    if (!body.classList.contains('loaded')) {
      const t = setInterval(() => {
        if (body.classList.contains('loaded')) {
          clearInterval(t);
          beginSite();
        }
      }, 120);
      setTimeout(() => { if (!entered) beginSite(); }, 2800);
    } else {
      beginSite();
    }
  }

  function beginSite() {
    if (entered) return;
    entered = true;
    setEnterText('ENTER THE AXIS');
    initLenis();
    initReveal();
    initCursor();
    initVideo();
    if (!body.classList.contains('loaded')) body.classList.add('loaded');
    requestAnimationFrame(() => {
      updateScene(true);
      onScroll();
    });
  }

  /* --------------------------------------------------------------------------
     music
     -------------------------------------------------------------------------- */
  function fadeMusicTo(target) {
    if (!bgm) return;
    clearInterval(musicFade);
    if (prefersReduced) { bgm.volume = target; return; }
    musicFade = setInterval(() => {
      const d = target - bgm.volume;
      if (Math.abs(d) < .012) {
        bgm.volume = target;
        clearInterval(musicFade);
      } else {
        bgm.volume = clamp(bgm.volume + d * .18, 0, 1);
      }
    }, 45);
  }

  function startMusic() {
    if (!bgm) return;
    if (bgm.paused) {
      bgm.muted = false;
      bgm.volume = 0;
      const p = bgm.play();
      if (p && p.then) {
        p.then(() => {
          musicOn = true;
          musicRequested = true;
          fadeMusicTo(.34);
          syncMusicUI();
        }).catch(() => {
          musicOn = false;
          syncMusicUI();
        });
      } else {
        musicOn = true;
        fadeMusicTo(.34);
        syncMusicUI();
      }
    } else {
      musicOn = true;
      bgm.muted = false;
      fadeMusicTo(.34);
      syncMusicUI();
    }
  }

  function stopMusic() {
    if (!bgm) return;
    bgm.pause();
    musicOn = false;
    syncMusicUI();
  }

  function toggleMusic() {
    if (!bgm) return;
    if (!bgm.paused && musicOn) stopMusic();
    else startMusic();
  }

  function syncMusicUI() {
    const sound = $('#scMusic');
    const now = $('#scNowPlaying');
    if (sound) {
      sound.classList.toggle('off', !musicOn);
      sound.setAttribute('aria-pressed', String(musicOn));
      const label = $('.sc-sound-label', sound);
      if (label) label.textContent = musicOn ? 'WE NEVER' : 'SOUND OFF';
    }
    if (now) now.classList.toggle('off', !musicOn);
  }

  if (bgm) {
    bgm.volume = 0;
    bgm.addEventListener('play', syncMusicUI);
    bgm.addEventListener('pause', syncMusicUI);
  }
  const musicBtn = $('#scMusic');
  if (musicBtn) musicBtn.addEventListener('click', toggleMusic);
  const nowBtn = $('#scNowToggle');
  if (nowBtn) nowBtn.addEventListener('click', toggleMusic);

  document.addEventListener('visibilitychange', () => {
    if (!bgm || !entered) return;
    if (document.hidden) {
      if (!bgm.paused) bgm.pause();
    } else if (musicOn && bgm.paused && !$('#scFilmVideo')?.matches(':playing')) {
      startMusic();
    }
  });

  /* --------------------------------------------------------------------------
     smooth scroll / navigation
     -------------------------------------------------------------------------- */
  function initLenis() {
    if (lenis || prefersReduced) {
      if (!lenis) window.addEventListener('scroll', onScroll, { passive: true });
      return;
    }
    if (!window.Lenis) {
      window.addEventListener('scroll', onScroll, { passive: true });
      return;
    }
    lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: .95,
      touchMultiplier: 1.1,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    });
    lenis.on('scroll', onScroll);
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  function scrollToElement(el) {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -58, duration: 1.15 });
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $$('[data-scroll]').forEach(a => {
    a.addEventListener('click', e => {
      const hash = a.getAttribute('href');
      if (!hash || !hash.startsWith('#')) return;
      const el = document.querySelector(hash);
      if (!el) return;
      e.preventDefault();
      if (labOpen) closeLab(false);
      if (menuOpen) closeMenu();
      scrollToElement(el);
    });
  });

  function onScroll() {
    if (!entered) return;
    const y = window.scrollY || document.documentElement.scrollTop;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const progress = clamp(y / max, 0, 1);
    const bar = $('#scReadProgress');
    if (bar) bar.style.width = (progress * 100).toFixed(2) + '%';
    const nav = $('#scNav');
    if (nav) nav.classList.toggle('scrolled', y > 70);
    updateNav(y);
    const film = $('#scFilm');
    const filmVideo = $('#scFilmVideo');
    if (film && filmVideo && !filmVideo.paused) {
      const fr = film.getBoundingClientRect();
      if (fr.bottom < 30 || fr.top > innerHeight - 30) filmVideo.pause();
    }
    if (!labOpen) updateScene();
  }

  function updateNav(y) {
    const links = $$('.sc-links a');
    let best = null;
    links.forEach(a => {
      const id = a.getAttribute('href');
      const el = id && id.length > 1 ? document.querySelector(id) : null;
      if (el && el.getBoundingClientRect().top <= innerHeight * .42) best = a;
    });
    links.forEach(a => a.classList.toggle('active', a === best));
  }

  function updateScene(force) {
    if (!entered || labOpen) return;
    const vh = innerHeight;
    const y = window.scrollY || document.documentElement.scrollTop;
    const axial = $('#scAxial');
    const storm = $('#scStorm');
    const cta = $('#scLabCta');
    if (!axial || !storm) return;
    const ar = axial.getBoundingClientRect();
    const sr = storm.getBoundingClientRect();
    const cr = cta ? cta.getBoundingClientRect() : { top: 1e9, bottom: -1 };
    const stormHit = sr.top < vh * .72 && sr.bottom > vh * .28;

    if (stormHit) {
      if (!stormActive) {
        stormActive = true;
        window.SOLINK_API.storm(true);
        if (!userBg) setBg('space', false);
      }
      sceneMode = 'storm';
      return;
    }

    if (stormActive) {
      stormActive = false;
      window.SOLINK_API.storm(false);
    }

    const axialHit = ar.top < vh * .9 && ar.bottom > vh * .12;
    if (axialHit) {
      const range = Math.max(1, axial.offsetHeight - vh);
      const p = clamp((y - axial.offsetTop) / range, 0, 1);
      window.SOLINK_API.axial(p);
      sceneMode = 'axial';
      updateLayerUI(p);
      return;
    }

    if (cr.top < vh * .82 && cr.bottom > 0) {
      if (sceneMode !== 'cta' || force) {
        window.SOLINK_API.hero();
        sceneMode = 'cta';
      }
      return;
    }

    if (ar.top > vh * .82) {
      if (sceneMode !== 'hero' || force) {
        window.SOLINK_API.hero();
        sceneMode = 'hero';
      }
      return;
    }

    sceneMode = 'quiet';
  }

  function updateLayerUI(p) {
    const idx = clamp(Math.floor(p * 8.001), 0, 7);
    const bar = $('#scAxialBar');
    const pct = $('#scAxialPct');
    if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
    if (pct) pct.textContent = String(Math.round(p * 100)).padStart(2, '0') + '%';
    if (idx === activeLayer) return;
    activeLayer = idx;
    const info = layerInfo[idx];
    const no = $('#scLayerNo'), name = $('#scLayerName'), en = $('#scLayerEn'), desc = $('#scLayerDesc');
    if (no) no.textContent = info.no;
    if (name) name.textContent = info.name;
    if (en) en.textContent = info.en;
    if (desc) desc.textContent = info.desc;
    $$('#scLayerRail button').forEach((b, i) => b.classList.toggle('active', i === idx));
  }

  /* --------------------------------------------------------------------------
     background / storm controls
     -------------------------------------------------------------------------- */
  function setBg(mode, markUser) {
    bgMode = mode === 'space' ? 'space' : 'studio';
    if (markUser) userBg = true;
    try { window.SOLINK_API.setBackground(bgMode); } catch (e) {}
    updateBgUI();
  }

  function updateBgUI() {
    const btn = $('#scBgToggle');
    if (btn) btn.textContent = bgMode === 'space' ? 'DEEP SPACE' : 'STUDIO GRAY';
  }

  const bgBtns = ['#scBgToggle', '#scStormBg'];
  bgBtns.forEach(sel => {
    const b = $(sel);
    if (b) b.addEventListener('click', () => setBg(bgMode === 'space' ? 'studio' : 'space', true));
  });

  /* --------------------------------------------------------------------------
     layer rail
     -------------------------------------------------------------------------- */
  $$('#scLayerRail button').forEach((b, i) => {
    b.addEventListener('click', () => openLab(i));
  });

  /* --------------------------------------------------------------------------
     teardown lab
     -------------------------------------------------------------------------- */
  function setLabUI() {
    const btn = $('#scLabToggle');
    if (btn) btn.textContent = labOpen ? 'CLOSE LAB' : 'TEARDOWN LAB';
  }

  function openLab(layerIndex) {
    if (labOpen) return;
    if (menuOpen) closeMenu();
    if (!entered) return;
    const filmVideo = $('#scFilmVideo');
    if (filmVideo && !filmVideo.paused) filmVideo.pause();
    labScroll = window.scrollY || document.documentElement.scrollTop || 0;
    labOpen = true;
    stormActive = false;
    if (lenis) lenis.stop();
    body.classList.add('lab-open');
    setLabUI();
    try { window.SOLINK_API.openLab(); } catch (e) {}
    if (Number.isInteger(layerIndex) && layerIndex >= 0) {
      setTimeout(() => {
        try { window.SOLINK_API.focusLayer(layerIndex); } catch (e) {}
      }, 260);
    }
    const hint = $('#hint');
    if (hint) hint.style.display = 'none';
  }

  function closeLab(restoreScene) {
    if (!labOpen) return;
    labOpen = false;
    body.classList.remove('lab-open');
    setLabUI();
    if (lenis) {
      lenis.start();
      lenis.scrollTo(labScroll, { immediate: true });
    } else {
      window.scrollTo(0, labScroll);
    }
    sceneMode = '';
    if (restoreScene !== false) {
      requestAnimationFrame(() => {
        window.scrollTo(0, labScroll);
        if (stormActive) { stormActive = false; }
        updateScene(true);
      });
    }
  }

  const labButtons = ['#scLabToggle', '#scHeroLab', '#scAxialLab', '#scStormLab', '#scLabCtaBtn'];
  labButtons.forEach(sel => {
    const b = $(sel);
    if (b) b.addEventListener('click', () => {
      if (labOpen) closeLab();
      else openLab();
    });
  });

  /* --------------------------------------------------------------------------
     mobile menu
     -------------------------------------------------------------------------- */
  function openMenu() {
    if (menuOpen) return;
    menuScroll = window.scrollY || document.documentElement.scrollTop || 0;
    menuOpen = true;
    const m = $('#scMenuPanel');
    if (m) { m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); }
    body.classList.add('menu-open');
    if (lenis) lenis.stop();
  }

  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    const m = $('#scMenuPanel');
    if (m) { m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }
    body.classList.remove('menu-open');
    if (lenis && !labOpen) {
      lenis.start();
      lenis.scrollTo(menuScroll, { immediate: true });
    } else if (!labOpen) {
      window.scrollTo(0, menuScroll);
    }
  }

  const menuBtn = $('#scMenuBtn');
  if (menuBtn) menuBtn.addEventListener('click', openMenu);
  const menuClose = $('#scMenuClose');
  if (menuClose) menuClose.addEventListener('click', closeMenu);
  const menuPanel = $('#scMenuPanel');
  if (menuPanel) {
    $$('a', menuPanel).forEach(a => a.addEventListener('click', () => closeMenu()));
  }

  /* --------------------------------------------------------------------------
     video / film
     -------------------------------------------------------------------------- */
  function initVideo() {
    const video = $('#scFilmVideo');
    const play = $('#scFilmPlay');
    if (!video || !play) return;
    play.addEventListener('click', () => {
      if (bgm && !bgm.paused) { musicResumeAfterVideo = true; bgm.pause(); }
      video.play().catch(() => {});
    });
    video.addEventListener('play', () => {
      play.classList.add('hidden');
      if (bgm && !bgm.paused) { musicResumeAfterVideo = true; bgm.pause(); }
    });
    video.addEventListener('pause', () => {
      if (video.currentTime === 0 || video.ended) play.classList.remove('hidden');
      if (musicResumeAfterVideo && !video.ended) {
        musicResumeAfterVideo = false;
        startMusic();
      }
    });
    video.addEventListener('ended', () => {
      play.classList.remove('hidden');
      if (musicResumeAfterVideo) { musicResumeAfterVideo = false; startMusic(); }
    });
  }

  /* --------------------------------------------------------------------------
     reveal / cursor
     -------------------------------------------------------------------------- */
  function initReveal() {
    const items = $$('.sc-headline, .sc-hero-copy, .sc-hero-foot, .sc-manifesto-copy, .sc-material-card, .sc-big-stat, .sc-spec-row, .sc-film-frame, .sc-data-note, .sc-cta-inner');
    items.forEach((el, i) => {
      el.classList.add('sc-reveal');
      el.style.transitionDelay = ((i % 5) * .055) + 's';
    });
    if (!('IntersectionObserver' in window) || prefersReduced) {
      items.forEach(el => el.classList.add('in'));
      return;
    }
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          revealObserver.unobserve(en.target);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    items.forEach(el => revealObserver.observe(el));
  }

  function initCursor() {
    if (!matchMedia('(pointer:fine)').matches) return;
    cursor = $('#scCursor');
    if (!cursor) return;
    let x = -40, y = -40, tx = -40, ty = -40;
    document.addEventListener('pointermove', e => {
      tx = e.clientX; ty = e.clientY;
      cursor.classList.remove('off');
    }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.add('off'));
    document.addEventListener('pointerover', e => {
      if (e.target.closest('a,button,.sc-material-card,.sc-layer-rail button')) cursor.classList.add('hot');
    });
    document.addEventListener('pointerout', e => {
      if (e.target.closest('a,button,.sc-material-card,.sc-layer-rail button')) cursor.classList.remove('hot');
    });
    (function tick() {
      x += (tx - x) * .22;
      y += (ty - y) * .22;
      cursor.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
      requestAnimationFrame(tick);
    })();
  }

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (labOpen) { closeLab(); return; }
    if (menuOpen) { closeMenu(); return; }
  });

  /* --------------------------------------------------------------------------
     first visible state while loader is fading
     -------------------------------------------------------------------------- */
  window.addEventListener('resize', () => {
    if (entered && !labOpen) {
      if (lenis) lenis.resize();
      updateScene(true);
    }
  });
})();
