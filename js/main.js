'use strict';
/* ECLIPSE DRIVE — boot, loop, touch */
(function () {
  const STEP = 1 / 60;
  let last = performance.now(), acc = 0;

  /* touch: relative drag anywhere, second finger = switch */
  function enterTouchMode() {
    if (IN.touchMode) return;
    IN.touchMode = true; resize(); setTouch(G.state === 'play');
  }
  window.addEventListener('touchstart', e => {
    enterTouchMode();
    AU.init();
    if (G.state !== 'play') return;
    if (e.target.closest && e.target.closest('button')) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (IN.touchId === null) { IN.touchId = t.identifier; IN.tx = t.clientX; IN.ty = t.clientY; }
      else IN.sw = true;
    }
    if (G.tally) G.tally.skip = true;
  }, { passive: false });
  window.addEventListener('touchmove', e => {
    if (G.state !== 'play') return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== IN.touchId) continue;
      const k = SAVE.set.sens / VIEW.scale;
      IN.tdx += (t.clientX - IN.tx) * k; IN.tdy += (t.clientY - IN.ty) * k;
      IN.lastTdx = clamp((t.clientX - IN.tx) * 0.3, -1, 1);
      IN.tx = t.clientX; IN.ty = t.clientY;
    }
  }, { passive: false });
  const endTouch = e => {
    for (const t of e.changedTouches) if (t.identifier === IN.touchId) { IN.touchId = null; IN.lastTdx = 0; }
    if (e.touches && e.touches.length === 0) IN.touchId = null;
  };
  window.addEventListener('touchend', endTouch);
  window.addEventListener('touchcancel', endTouch);

  const press = (id, fn) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); el.classList.add('press'); }, { passive: false });
    el.addEventListener('touchend', e => { e.preventDefault(); el.classList.remove('press'); }, { passive: false });
    el.addEventListener('mousedown', e => { e.preventDefault(); fn(); });
  };
  press('tSwitch', () => { IN.sw = true; });
  press('tBurst', () => { IN.burst = true; });

  window.addEventListener('mousedown', () => AU.init());
  window.addEventListener('keydown', e => {
    AU.init();
    if (IN.touchMode) { IN.touchMode = false; resize(); setTouch(false); }
    if (G.tally && (e.code === 'KeyZ' || e.code === 'Space' || e.code === 'Enter')) G.tally.skip = true;
  });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
  ED.onBlur = () => pauseGame();

  function uiSync() {
    if (!P || $('touch').hidden) return;
    const s = $('tSwitch');
    s.classList.toggle('sol', P.pol === SOL); s.classList.toggle('luna', P.pol === LUNA);
    const n = Math.floor(P.energy / 10);
    $('tBurst').classList.toggle('ready', n > 0);
    const txt = n > 0 ? (P.energy >= P.emax ? 'FULL' : '×' + n) : '—';
    if ($('tBurstN').textContent !== txt) $('tBurstN').textContent = txt;
  }

  function step(dt) {
    if (IN.pause) {
      IN.pause = false;
      if (G.state === 'play') pauseGame();
      else if (G.state === 'paused' && UI.cur === 'pause') resumeGame();
      else if (UI.cur && UI.cur !== 'title' && UI.cur !== 'result' && UI.cur !== 'pause') back();
    }
    if (G.state === 'play') {
      if (G.tally && (IN.sw || IN.burst)) G.tally.skip = true;
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 5) {
        updateGame(STEP);
        acc -= STEP; n++;
        IN.sw = false; IN.burst = false;
        if (G.state !== 'play') break;
      }
      if (n >= 5) acc = 0;
    } else { IN.sw = false; IN.burst = false; acc = 0; }
    if (!ED.noRender) render(dt);
    uiSync();
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    step(dt);
  }
  ED.tick = function (dt) { if (G.state === 'play') updateGame(dt || STEP); };
  ED.step = step;

  IN.touchMode = ('ontouchstart' in window) && matchMedia('(pointer: coarse)').matches;
  resize();
  openTitle();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { });
  requestAnimationFrame(frame);

  // home-screen app: register the service worker (https or localhost, top-level window only)
  const h = location.hostname, local = h === 'localhost' || h === '127.0.0.1';
  if ('serviceWorker' in navigator && window.self === window.top && (location.protocol === 'https:' || local)) {
    addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { }); });
  }
})();
