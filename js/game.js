'use strict';
/* ECLIPSE DRIVE — game state, player, enemies, bullets, waves, scoring */
const G = ED.G = {
  state: 'title', run: null, st: null, t: 0,
  bullets: [], enemies: [], pshots: [], lasers: [], parts: [], pick: [], floats: [], sched: [],
  beam: null, chain: { n: 0, buf: [], flash: 0 }, shake: 0, lvl: 0, flash: 0, flashCol: '255,255,255',
  banner: null, tally: null, worldFlip: 0
};
let P = null;
let EID = 0;
const BR = { small: 3.2, orb: 4.6, big: 8.5, rice: 3.4 };
const EXTENDS = [400000, 1200000, 2500000, 4000000, 6000000];

/* ---------- helpers ---------- */
function D() { return G.run ? G.run.diff : DIFFS.normal; }
function later(t, fn) { G.sched.push({ t, fn }); }
function aimAt(x, y) { return P ? Math.atan2(P.y - y, P.x - x) : Math.PI / 2; }
function cnt(n) { return Math.max(1, Math.round(n * D().dens)); }
function ev(base) { return base * (1 - 0.3 * G.lvl); }
function shoot(x, y, ang, spd, pol, kind, o) {
  if (G.bullets.length > 1500) return null;
  const d = D();
  const b = { x, y, ang, spd: spd * d.spd, pol, kind: kind || 'orb', t: 0, acc: 0, turn: 0, maxS: 0, minS: 0, flipAt: 0, flipEvery: 0, dead: false, delay: 0 };
  if (o) Object.assign(b, o);
  b.r = BR[b.kind];
  if (b.acc) b.acc *= d.spd;
  if (b.maxS) b.maxS *= d.spd;
  if (d.flip && !b.noFlip && !b.flipAt && Math.random() < d.flip) b.flipAt = rand(0.7, 1.4);
  b.vx = Math.cos(b.ang) * b.spd; b.vy = Math.sin(b.ang) * b.spd;
  G.bullets.push(b);
  return b;
}
function fan(x, y, n, spread, ang, spd, pol, kind, o) {
  for (let i = 0; i < n; i++) {
    const a = n === 1 ? ang : ang + (i - (n - 1) / 2) * spread;
    shoot(x, y, a, spd, pol, kind, o);
  }
}
function ring(x, y, n, spd, pol, kind, off, o) {
  for (let i = 0; i < n; i++) shoot(x, y, (off || 0) + i * TAU / n, spd, pol, kind, o);
}
function addScore(v) {
  const R = G.run; if (!R) return;
  R.score += Math.round(v);
  while (R.extNext < EXTENDS.length && R.score >= EXTENDS[R.extNext]) {
    R.extNext++; P.lives++;
    floatText(P.x, P.y - 30, 'EXTEND!', '#ffffff', 16, 1.6);
    AU.sfx('extend');
  }
}
function floatText(x, y, txt, col, size, life) {
  G.floats.push({ x: clamp(x, 50, W - 50), y: Math.max(y, 96), txt, col: col || '#fff', size: size || 11, t: 0, life: life || 0.9 });
  if (G.floats.length > 40) G.floats.shift();
}
function burstParts(x, y, n, rgb, spd, size, life) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = spd * (0.3 + Math.random() * 0.9);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.6), t: 0, size: size * (0.6 + Math.random() * 0.8), rgb, kind: 'spark' });
  }
  if (G.parts.length > 900) G.parts.splice(0, G.parts.length - 900);
}
function ringFx(x, y, r, rgb, life) { G.parts.push({ x, y, vx: 0, vy: 0, life: life || 0.4, t: 0, size: r, rgb, kind: 'ring' }); }
function shake(v) { if (SAVE.set.shake) G.shake = Math.max(G.shake, v); }

/* ---------- player ---------- */
function makePlayer(ship) {
  const u = SAVE.upg;
  return {
    ship, x: W / 2, y: H - 90, pol: SOL, lives: 2 + u.life,
    emax: [120, 150, 180, 240][u.capacity], energy: [0, 40, 80][u.spark],
    absorbR: [14, 17, 20, 24][u.absorb], magR: [60, 110, 170, 9999][u.magnet],
    pow: 1 + [0, 0.08, 0.16, 0.25, 0.35, 0.5][u.power],
    inv: 2, alive: true, respawn: 0, swCD: 0, swFx: 0, shotT: 0, bank: 0,
    trail: [], opts: [{ x: W / 2, y: H - 90 }, { x: W / 2, y: H - 90 }], focus: false, absorbFx: 0, phaseAbsorb: 0
  };
}
function playerShot(x, y, ang, dmg, o) {
  const s = { x, y, vx: Math.cos(ang) * 900, vy: Math.sin(ang) * 900, dmg: dmg * P.pow, pol: P.pol, dead: false, pierce: false, hits: null, w: 2 };
  if (o) Object.assign(s, o);
  G.pshots.push(s);
}
function fireShip(dt) {
  P.shotT -= dt;
  if (P.shotT > 0) return;
  const up = -Math.PI / 2, f = P.focus;
  switch (P.ship.id) {
    case 'halcyon': {
      P.shotT += 0.065;
      playerShot(P.x - 4, P.y - 10, up, 1.2); playerShot(P.x + 4, P.y - 10, up, 1.2);
      const s1 = f ? 0.02 : 0.055, s2 = f ? 0.05 : 0.16;
      playerShot(P.x - 8, P.y - 6, up - s1, 0.55); playerShot(P.x + 8, P.y - 6, up + s1, 0.55);
      playerShot(P.x - 10, P.y - 2, up - s2, 0.42); playerShot(P.x + 10, P.y - 2, up + s2, 0.42);
      break;
    }
    case 'lance': {
      P.shotT += 0.06;
      for (let i = -1; i <= 1; i++) playerShot(P.x + i * 5, P.y - 12, up, 1.45, { pierce: true, hits: [], w: 3, vy: -1100 });
      break;
    }
    case 'orbit': {
      P.shotT += 0.07;
      playerShot(P.x - 4, P.y - 10, up, 0.95); playerShot(P.x + 4, P.y - 10, up, 0.95);
      P.opts.forEach((o, i) => playerShot(o.x, o.y - 6, up + (f ? (i ? -0.04 : 0.04) : 0), 0.8));
      break;
    }
  }
}
function doBurst() {
  if (P.energy < 10) { AU.sfx('deny'); return; }
  const E = Math.floor(P.energy / 10) * 10;
  const full = P.energy >= P.emax;
  P.energy -= E;
  G.run.bursts++; SAVE.stats.bursts++;
  G.flash = 0.25; G.flashCol = PCOL[P.pol].rgb;
  ringFx(P.x, P.y, 60, PCOL[P.pol].rgb, 0.5);
  const kind = P.ship.burst;
  if (kind === 'beam') {
    G.beam = { t: 0, dur: 0.6 + E / 120 * 0.9, w: 34 + E / 6, dps: E * 1.6 / (0.6 + E / 120 * 0.9), pol: P.pol };
    AU.sfx('beam'); shake(6);
  } else {
    const swarm = kind === 'swarm';
    const n = (E / 10) * (swarm ? 4 : 2), dmg = swarm ? 3.6 : 7.2;
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 + (i / (n - 1 || 1) - 0.5) * (Math.PI * 1.6) + Math.PI;
      G.lasers.push({ x: P.x, y: P.y, ang: a + rand(-0.2, 0.2), spd: swarm ? 340 : 260, t: -i * (swarm ? 0.006 : 0.012), dmg: dmg * (full ? 1.15 : 1), pol: P.pol, target: null, trail: [], dead: false, swarm });
    }
    AU.sfx('burst'); shake(4);
  }
  if (full) floatText(P.x, P.y - 40, 'FULL BURST', '#fff', 13, 1);
}
function killPlayer() {
  if (ED.god) return;
  P.alive = false; P.respawn = 1.4;
  G.run.misses++; G.st.misses++; SAVE.stats.deaths++;
  G.st.phaseHit = true;
  burstParts(P.x, P.y, 60, PCOL[P.pol].rgb, 260, 3, 0.9);
  burstParts(P.x, P.y, 30, '255,255,255', 160, 2, 0.6);
  ringFx(P.x, P.y, 90, '255,255,255', 0.6);
  AU.sfx('death'); shake(14);
  G.flash = 0.4; G.flashCol = '255,80,80';
  G.bullets.forEach(b => { if (Math.random() < 0.3) burstParts(b.x, b.y, 1, PCOL[b.pol].rgb, 40, 2, 0.3); });
  G.bullets.length = 0;
  P.energy = Math.floor(P.energy / 2);
  if (G.chain.n > 0) floatText(P.x, P.y - 20, 'CHAIN LOST', '#ff8080', 11, 1);
  G.chain.n = 0; G.chain.buf = [];
  P.lives--;
  if (P.lives < 0) { G.st.gameOverT = 2.2; }
}
function updatePlayer(dt) {
  if (!P.alive) {
    P.respawn -= dt;
    if (P.respawn <= 0 && P.lives >= 0) {
      P.alive = true; P.inv = 2.6; P.x = W / 2; P.y = H + 30; P.entering = 0.6;
    }
    return;
  }
  // movement
  const pad = pollPad();
  let mx = 0, my = 0;
  if (IN.keys.l) mx -= 1; if (IN.keys.r) mx += 1; if (IN.keys.u) my -= 1; if (IN.keys.d) my += 1;
  let focus = !!IN.keys.f;
  if (pad) { if (pad.ax || pad.ay) { mx = pad.ax; my = pad.ay; } focus = focus || pad.focus; }
  if (ED.botMove) { mx = ED.botMove.x; my = ED.botMove.y; focus = !!ED.botMove.f; }
  P.focus = focus;
  const len = Math.hypot(mx, my);
  if (len > 1) { mx /= len; my /= len; }
  const spd = focus ? P.ship.focus : P.ship.speed;
  if (P.entering > 0) { P.entering -= dt; P.y = lerp(P.y, H - 90, Math.min(1, dt * 6)); }
  else {
    P.x += mx * spd * dt; P.y += my * spd * dt;
    P.x += IN.tdx; P.y += IN.tdy;
  }
  IN.tdx = 0; IN.tdy = 0;
  P.x = clamp(P.x, 10, W - 10); P.y = clamp(P.y, 40, H - 16);
  P.bank = lerp(P.bank, mx + (IN.lastTdx || 0) * 0.3, Math.min(1, dt * 10));
  // options for ORBIT: follow trail
  P.trail.unshift({ x: P.x, y: P.y }); if (P.trail.length > 24) P.trail.pop();
  const o1 = P.trail[Math.min(P.trail.length - 1, 9)], o2 = P.trail[Math.min(P.trail.length - 1, 18)];
  P.opts[0].x = lerp(P.opts[0].x, o1.x - 26, 0.35); P.opts[0].y = lerp(P.opts[0].y, o1.y + 8, 0.35);
  P.opts[1].x = lerp(P.opts[1].x, o2.x + 26, 0.35); P.opts[1].y = lerp(P.opts[1].y, o2.y + 8, 0.35);
  // switch
  P.swCD -= dt; P.swFx = Math.max(0, P.swFx - dt); P.inv = Math.max(0, P.inv - dt); P.absorbFx = Math.max(0, P.absorbFx - dt * 3);
  if (IN.sw) {
    if (P.swCD <= 0) {
      P.pol ^= 1; P.swCD = 0.07; P.swFx = 0.25;
      ringFx(P.x, P.y, 26, PCOL[P.pol].rgb, 0.25);
      AU.sfx('switch', P.pol);
    }
  }
  if (IN.burst) doBurst();
  fireShip(dt);
}

/* ---------- enemies ---------- */
function spawnEnemy(type, pol, x, y, mv, frs, extra) {
  const T = ETYPES[type];
  const hpMul = 1 + (G.st ? G.st.idx : 0) * 0.07;
  const e = {
    id: ++EID, type, pol, x, y, hp: T.hp * hpMul, maxhp: T.hp * hpMul, r: T.r, score: T.score, dust: T.dust,
    t: 0, mv: mv || { k: 'line', vx: 0, vy: 80 }, frs: [], entered: false, flash: 0, dead: false,
    part: false, isBoss: false, ang: 0, vx: 0, vy: 0, inv: 0
  };
  (Array.isArray(frs) ? frs : frs ? [frs] : []).forEach(f => {
    const c = Object.assign({}, f);
    c.ft = f.first != null ? f.first : rand(0.4, 1.0);
    e.frs.push(c);
  });
  if (extra) Object.assign(e, extra);
  G.enemies.push(e);
  if (!e.part && !e.isBoss && G.st) G.st.spawned++;
  return e;
}
function moveEnemy(e, dt) {
  const m = e.mv, px = e.x, py = e.y;
  switch (m.k) {
    case 'line': e.x += m.vx * dt; e.y += m.vy * dt; break;
    case 'sine': e.y += m.vy * dt; e.x = m.x0 + Math.sin(e.t * m.w + (m.ph || 0)) * m.amp; break;
    case 'stop': {
      const tEx = m.arr + m.wait;
      if (e.t < tEx) { const k = Math.min(1, dt * (m.ease || 2.6)); e.x += (m.tx - e.x) * k; e.y += (m.ty - e.y) * k; }
      else { const a = Math.min(1, (e.t - tEx) * 1.2); e.x += (m.ex || 0) * a * dt; e.y += (m.ey == null ? -90 : m.ey) * a * dt; }
      break;
    }
    case 'curve': {
      if (e.t > (m.t0 || 0) && e.t < (m.t0 || 0) + (m.td || 9)) m.ang += m.turn * dt;
      e.x += Math.cos(m.ang) * m.spd * dt; e.y += Math.sin(m.ang) * m.spd * dt; break;
    }
    case 'dive': {
      if (e.t < 1.0) { const k = Math.min(1, dt * 3); e.x += (m.tx - e.x) * k; e.y += (m.ty - e.y) * k; m.a = aimAt(e.x, e.y); }
      else if (e.t < 1.5) { m.a = lerp(m.a, aimAt(e.x, e.y), Math.min(1, dt * 4)); e.ang = m.a; }
      else {
        if (!m.dashed) {
          m.dashed = true;
          if (e.y < H * 0.6) fan(e.x, e.y, cnt(3), 0.3, m.a, 165, e.pol, 'rice');
        }
        m.s = Math.min(430, (m.s || 60) + 900 * dt);
        e.x += Math.cos(m.a) * m.s * dt; e.y += Math.sin(m.a) * m.s * dt;
      }
      e.ang = m.a;
      break;
    }
    case 'orbit': {
      const p = m.parent;
      if (!p || p.dead) { e.dead = true; return; }
      m.a += m.w * dt;
      const rr = m.rad + Math.sin(e.t * 1.3) * (m.wob || 0);
      e.x = p.x + Math.cos(m.a) * rr; e.y = p.y + Math.sin(m.a) * rr * 0.75;
      break;
    }
    case 'drift': {
      if (e.t < 2) { const k = Math.min(1, dt * 1.6); e.y += (m.ty - e.y) * k; e.x += (m.tx - e.x) * k; }
      else if (e.t < m.life) { e.x = lerp(e.x, m.tx + Math.sin((e.t - 2) * 0.6) * 70, Math.min(1, dt * 2)); }
      else e.y -= 40 * dt;
      break;
    }
    case 'boss': break;
  }
  if (dt > 0) { e.vx = (e.x - px) / dt; e.vy = (e.y - py) / dt; }
}
function fireEnemy(e, dt) {
  if (!P || e.y < 8 || e.y > H * 0.7 || e.x < 0 || e.x > W) return;
  const d = D();
  for (const f of e.frs) {
    f.ft -= dt * d.rate;
    if (f.ft > 0) continue;
    f.ft += f.every;
    if (f.max != null) { if (f.max <= 0) continue; f.max--; }
    const pol = f.pol != null ? f.pol : e.pol;
    switch (f.k) {
      case 'aim': fan(e.x, e.y, f.fixed ? f.n : cnt(f.n), f.spread || 0.25, aimAt(e.x, e.y), f.spd, pol, f.kind); break;
      case 'ring': e.ang += f.rot || 0.2; ring(e.x, e.y, cnt(f.n), f.spd, pol, f.kind, e.ang); break;
      case 'down': fan(e.x, e.y, f.n, f.spread || 0.2, Math.PI / 2, f.spd, pol, f.kind); break;
      case 'spiral': {
        e.ang += f.rot;
        for (let i = 0; i < f.arms; i++) shoot(e.x, e.y, e.ang + i * TAU / f.arms, f.spd, f.alt ? i % 2 : pol, f.kind);
        break;
      }
      case 'stream': {
        for (let i = 0; i < f.n; i++) shoot(e.x, e.y, aimAt(e.x, e.y), f.spd + i * 22, pol, f.kind || 'rice');
        break;
      }
      case 'spawn': {
        e.spawnN = (e.spawnN || 0) + 1;
        const sp = Math.floor((e.spawnN - 1) / 3) % 2 ? e.pol ^ 1 : e.pol;
        const side = e.spawnN % 2 ? -1 : 1;
        spawnEnemy('dart', sp, e.x + side * 20, e.y + 10, { k: 'curve', spd: 120, ang: Math.PI / 2 + side * 0.9, turn: -side * 1.0, t0: 0.2, td: 1.2 },
          { k: 'aim', n: 1, spd: 150, every: 2, kind: 'small', max: 1 });
        break;
      }
    }
  }
}
function damageEnemy(e, amount, pol, src) {
  if (e.dead) return false;
  if (e.isBoss && (e.inv > 0 || e.bossState !== 'fight')) { e.flash = 0.02; return false; }
  const d = amount * (pol !== e.pol ? 2 : 1);
  e.hp -= d; e.flash = 0.06;
  if (e.isBoss) { G.run.bossDmg = (G.run.bossDmg || 0) + d; }
  if (e.hp <= 0) {
    if (e.isBoss) bossPhaseEnd(e, src);
    else killEnemy(e, src);
    return true;
  }
  return false;
}
function killEnemy(e, src) {
  if (e.dead) return;
  e.dead = true;
  const R = G.run, d = D();
  addScore(e.score * d.mul);
  const big = e.r >= 15;
  burstParts(e.x, e.y, big ? 40 : 14, PCOL[e.pol].rgb, big ? 240 : 170, big ? 3.2 : 2.4, big ? 0.8 : 0.5);
  ringFx(e.x, e.y, e.r * 2.2, PCOL[e.pol].rgb, 0.35);
  if (big) { shake(5); AU.sfx('killBig'); floatText(e.x, e.y, fmt(e.score * d.mul), '#fff', 10, 0.8); } else AU.sfx('kill');
  // stardust
  let dn = Math.floor(e.dust) + (Math.random() < e.dust % 1 ? 1 : 0);
  for (let i = 0; i < dn; i++) G.pick.push({ x: e.x, y: e.y, vx: rand(-80, 80), vy: rand(-120, -20), t: 0, kind: 'dust', val: 1 });
  if (!e.part) {
    G.st.killed++; R.kills++; SAVE.stats.kills++;
    chainKill(e.pol, e.x, e.y);
  }
  // echo (revenge) bullets: same polarity as the shot that killed it
  if (P && P.alive && e.pol === P.pol && !e.part && d.echo > 0 && e.y < P.y - 50 && e.y > 0) {
    fan(e.x, e.y, d.echo, 0.16, aimAt(e.x, e.y), 205, e.pol, 'small', { echo: true, noFlip: true });
  }
  if (e.type === 'mine') ring(e.x, e.y, cnt(10), 105, e.pol, 'orb', Math.random());
}
function chainKill(pol, x, y) {
  const C = G.chain, R = G.run;
  if (C.buf.length && C.buf[0] !== pol) {
    if (C.n > 0) { floatText(x, y - 14, 'CHAIN BREAK', '#ff9a9a', 10, 0.9); AU.sfx('break'); }
    C.n = 0; C.buf = [pol]; return;
  }
  C.buf.push(pol);
  if (C.buf.length === 3) {
    C.n++; C.buf = []; C.flash = 1;
    const bonus = 100 * Math.pow(2, Math.min(C.n, 9) - 1) * D().mul;
    addScore(bonus);
    G.st.triplets++;
    if (C.n > R.maxChain) R.maxChain = C.n;
    if (C.n > SAVE.stats.maxChain) SAVE.stats.maxChain = C.n;
    floatText(x, y - 16, C.n + ' CHAIN  ' + fmt(bonus), PCOL[pol].main, 12, 1.1);
    AU.sfx('chain', C.n);
    if (C.n >= 5) checkAch('chain5');
    if (C.n >= 10) checkAch('chain10');
    if (C.n >= 25) checkAch('chain25');
  }
}

/* ---------- waves ---------- */
const WAVES = {
  snake(w, r) {
    const side = r() < 0.5 ? -1 : 1, x0 = W / 2 + side * (40 + r() * 70), amp = 30 + r() * 40, vy = 115 + 40 * G.lvl;
    for (let i = 0; i < 6; i++) later(i * 0.3, () => spawnEnemy('dart', i < 3 ? w.p : w.q, x0, -12,
      { k: 'sine', vy, x0, amp, w: 2.2, ph: -i * 0.5 }, { k: 'aim', n: 1, spd: 150, every: 2.4, first: 0.6 + i * 0.05, kind: 'small', max: 1 }));
  },
  vee(w, r) {
    const cy = 110 + r() * 40;
    for (let i = 0; i < 6; i++) {
      const x = W / 2 + (i - 2.5) * 50, ty = cy - Math.abs(i - 2.5) * 18;
      later(i * 0.12, () => spawnEnemy('swirl', i < 3 ? w.p : w.q, x, -14, { k: 'stop', tx: x, ty, arr: 1.0, wait: 3.2, ex: (i < 3 ? -60 : 60), ey: -70 },
        { k: 'aim', n: 3, spread: 0.24, spd: 135, every: ev(1.7), first: 1.0 + i * 0.1, kind: 'orb' }));
    }
  },
  sweep(w, r) {
    const y1 = 70 + r() * 50, y2 = y1 + 70;
    for (let i = 0; i < 3; i++) later(i * 0.32, () => spawnEnemy('dart', w.p, -12, y1, { k: 'curve', spd: 175, ang: 0.05, turn: 1.0, t0: 0.9, td: 1.3 }, { k: 'aim', n: 1, spd: 160, every: 9, first: 0.8, kind: 'small', max: 1 }));
    for (let i = 0; i < 3; i++) later(1.5 + i * 0.32, () => spawnEnemy('dart', w.q, W + 12, y2, { k: 'curve', spd: 175, ang: Math.PI - 0.05, turn: -1.0, t0: 0.9, td: 1.3 }, { k: 'aim', n: 1, spd: 160, every: 9, first: 0.8, kind: 'small', max: 1 }));
  },
  mines(w, r) {
    const xs = [0, 1, 2, 3, 4, 5].map(i => 35 + i * 58 + r() * 20);
    for (let i = 0; i < 6; i++) {
      const x = xs[(i * 4) % 6], vx = (r() - 0.5) * 30;
      later(i * 0.35, () => spawnEnemy('mine', i < 3 ? w.p : w.q, x, -10, { k: 'line', vx, vy: 62 + 20 * G.lvl }, null));
    }
  },
  heavy(w, r) {
    const x = 110 + r() * 140;
    spawnEnemy('heavy', w.p, x, -30, { k: 'stop', tx: x, ty: 125, arr: 1.4, wait: 6.5, ey: -50 }, [
      { k: 'aim', n: 5, spread: 0.18, spd: 150, every: ev(1.25), first: 1.5, kind: 'rice' },
      { k: 'ring', n: 14, spd: 95, every: ev(2.4), first: 2.2, kind: 'orb', rot: 0.15 }]);
    for (const s of [-1, 1]) later(0.6, () => spawnEnemy('swirl', w.p, x + s * 62, -14, { k: 'stop', tx: x + s * 62, ty: 175, arr: 1.2, wait: 5, ex: s * 80, ey: -40 },
      { k: 'aim', n: 1, spd: 150, every: ev(1.4), kind: 'orb' }));
  },
  turret(w, r) {
    const xs = r() < 0.5 ? [70, 180, 290] : [60 + r() * 30, 180, 300 - r() * 30];
    xs.forEach((x, i) => later(i * 0.25, () => spawnEnemy('turret', w.p, x, -16 - (i === 1 ? 30 : 0), { k: 'line', vx: 0, vy: 42 },
      { k: 'ring', n: 10, spd: 95, every: ev(1.9), first: 1.2 + i * 0.3, kind: 'orb', rot: 0.17 })));
  },
  lancer(w, r) {
    for (let i = 0; i < 3; i++) {
      const x = 70 + i * 110 + (r() - 0.5) * 30;
      later(i * 0.45, () => spawnEnemy('lancer', w.p, x, -14, { k: 'dive', tx: x, ty: 80 + i * 20 }, null));
    }
  },
  carrier(w, r) {
    const x = 120 + r() * 120;
    spawnEnemy('carrier', w.p, x, -34, { k: 'drift', tx: x, ty: 105, life: 12 }, [
      { k: 'spawn', every: ev(1.2), first: 1.8 },
      { k: 'ring', n: 9, spd: 80, every: ev(2.8), first: 2.5, kind: 'big', rot: 0.3 }]);
  },
  spinner(w, r) {
    const x = 120 + r() * 120;
    spawnEnemy('spinner', w.p, x, -20, { k: 'stop', tx: x, ty: 135, arr: 1.4, wait: 6, ey: -60 },
      { k: 'spiral', arms: Math.round(2 * D().dens) * 1 + (D().dens > 1.4 ? 2 : 0) || 2, alt: true, spd: 118, rot: 0.29, every: ev(0.11), first: 1.6, kind: 'orb' });
    for (const s of [-1, 1]) later(0.8, () => spawnEnemy('swirl', w.p, x + s * 80, -14, { k: 'stop', tx: x + s * 80, ty: 95, arr: 1.0, wait: 4.5, ex: s * 90, ey: -30 },
      { k: 'aim', n: 3, spread: 0.3, spd: 140, every: ev(1.8), kind: 'orb' }));
  },
  wall(w, r) {
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 56;
      spawnEnemy('swirl', i < 3 ? w.p : w.q, x, -14 - (i % 2) * 18, { k: 'line', vx: 0, vy: 48 },
        { k: 'down', n: 1, spd: 165, every: ev(1.05), first: 0.6 + i * 0.12, kind: 'rice' });
    }
  },
  cross(w, r) {
    for (let i = 0; i < 3; i++) {
      later(i * 0.3, () => spawnEnemy('dart', w.p, -12, 30 + r() * 0, { k: 'line', vx: 125, vy: 120 }, { k: 'aim', n: 1, spd: 160, every: 9, first: 0.7, kind: 'small', max: 1 }));
      later(0.15 + i * 0.3, () => spawnEnemy('dart', w.q, W + 12, 30, { k: 'line', vx: -125, vy: 120 }, { k: 'aim', n: 1, spd: 160, every: 9, first: 0.7, kind: 'small', max: 1 }));
    }
  },
  twins(w, r) {
    for (let i = 0; i < 6; i++) {
      const left = i < 3, x = left ? 50 + i * 38 : W - 50 - (i - 3) * 38, ty = 70 + (i % 3) * 32;
      later(i * 0.15, () => spawnEnemy('twin', left ? w.p : w.q, x, -14, { k: 'stop', tx: x, ty, arr: 1.1, wait: 4.2, ex: left ? -70 : 70, ey: -40 },
        { k: 'stream', n: 3, spd: 150, every: ev(2.0), first: 1.2 + (i % 3) * 0.35, kind: 'rice' }));
    }
  }
};
const WAVE_DUR = { heavy: 1.5, carrier: 2.2, spinner: 1.5, turret: 1.3, wall: 1.3, twins: 1.3 };
function genWaves(def, diffId) {
  const r = mulberry32(def.seed + DIFF_ORDER.indexOf(diffId) * 7919);
  const names = Object.keys(def.pool);
  const tot = names.reduce((s, k) => s + def.pool[k], 0);
  const list = [];
  let prev = '';
  for (let i = 0; i < def.waves; i++) {
    let name;
    if (i < def.first.length) name = def.first[i];
    else {
      for (let tries = 0; tries < 6; tries++) {
        let x = r() * tot;
        for (const k of names) { x -= def.pool[k]; if (x <= 0) { name = k; break; } }
        if (name !== prev) break;
      }
    }
    prev = name;
    const p = r() < 0.5 ? SOL : LUNA;
    const q = r() < 0.55 ? p ^ 1 : p;
    list.push({ name, p, q, seed: Math.floor(r() * 1e9) });
  }
  return list;
}

/* ---------- run / stage flow ---------- */
function newRun(opt) {
  const R = G.run = {
    mode: opt.mode, diffId: opt.diff, diff: DIFFS[opt.diff], ship: SHIPS[opt.ship],
    stageIdx: opt.stage || 0, startStage: opt.stage || 0, score: 0, maxChain: 0, dust: 0, kills: 0, absorbed: 0,
    misses: 0, bursts: 0, extNext: 0, ranks: [], cleared: false, time: 0, achNew: [], stagesCleared: 0, rushIdx: 0
  };
  G.bullets = []; G.enemies = []; G.pshots = []; G.lasers = []; G.parts = []; G.pick = []; G.floats = []; G.sched = [];
  G.beam = null; G.chain = { n: 0, buf: [], flash: 0 }; G.tally = null; G.banner = null; G.worldFlip = 0;
  P = makePlayer(R.ship);
  SAVE.stats.plays++;
  G.state = 'play';
  startStage(R.stageIdx);
  return R;
}
function startStage(idx) {
  const R = G.run, def = STAGES[idx];
  const rush = R.mode === 'rush';
  G.st = {
    idx, def, phase: 'intro', t: 0, waves: rush ? [] : genWaves(def, R.diffId), wi: 0, waveT: 0,
    spawned: 0, killed: 0, triplets: 0, misses: 0, absorbed: 0, scoreStart: R.score, boss: null, gameOverT: 0, endT: 0
  };
  G.sched = [];
  P.energy = Math.max(P.energy, [0, 40, 80][SAVE.upg.spark]);
  G.banner = { kind: 'stage', t: 0, life: rush ? 2.0 : 3.2, def, rush };
  AU.play(def.bgm);
  if (ED.onStage) ED.onStage(def);
}
function updateStage(dt) {
  const st = G.st, R = G.run, def = st.def;
  st.t += dt;
  G.lvl = clamp((st.idx + (st.waves.length ? st.wi / st.waves.length : 1)) / 5, 0, 1);
  if (st.gameOverT > 0) {
    st.gameOverT -= dt;
    if (st.gameOverT <= 0) finishRun(false);
    return;
  }
  switch (st.phase) {
    case 'intro':
      if (st.t > (R.mode === 'rush' ? 1.6 : 2.0)) { st.phase = st.waves.length ? 'waves' : 'warn'; st.t = 0; if (st.phase === 'warn') startWarn(); }
      break;
    case 'waves': {
      st.waveT -= dt;
      const alive = G.enemies.some(e => !e.part && !e.isBoss);
      if (st.wi < st.waves.length) {
        const w = st.waves[st.wi];
        const base = def.interval * (WAVE_DUR[st.waves[Math.max(0, st.wi - 1)].name] || 1);
        if (st.waveT <= 0 || (!alive && G.sched.length === 0 && st.waveT < base * 0.55)) {
          WAVES[w.name](w, mulberry32(w.seed));
          st.wi++;
          st.waveT = def.interval * (WAVE_DUR[w.name] || 1);
        }
      } else if ((!alive && G.sched.length === 0) || st.waveT < -9) {
        st.phase = 'warn'; st.t = 0; startWarn();
      }
      break;
    }
    case 'warn':
      if (st.t > 2.6) { st.phase = 'boss'; st.t = 0; st.boss = spawnBoss(def.boss); }
      break;
    case 'boss':
      break;
    case 'bossdie':
      if (st.t > 2.4) stageClear();
      break;
    case 'tally':
      if (G.tally) {
        G.tally.t += dt;
        if (G.tally.t > (R.mode === 'rush' ? 2.2 : 5.0) || (G.tally.t > 1.6 && G.tally.skip)) nextStage();
      }
      break;
  }
}
function startWarn() {
  G.banner = { kind: 'warn', t: 0, life: 2.6, boss: BOSSES[G.st.def.boss] };
  AU.sfx('warn');
  AU.play(G.st.idx === 4 ? 'last' : 'boss');
}
function stageClear() {
  const st = G.st, R = G.run, d = D();
  const rush = R.mode === 'rush';
  const killRate = st.spawned ? st.killed / st.spawned : 1;
  const chainRate = st.spawned ? Math.min(1, st.triplets * 3 / st.spawned) : 1;
  const noMiss = st.misses === 0;
  const pts = killRate * 40 + chainRate * 40 + (noMiss ? 20 : 0);
  const rank = rush ? null : pts >= 88 ? 'S' : pts >= 72 ? 'A' : pts >= 52 ? 'B' : 'C';
  const clearB = 20000 * (st.idx + 1) * d.mul;
  const killB = rush ? 0 : Math.round(killRate * 30000 * d.mul);
  const missB = noMiss ? 50000 * d.mul : 0;
  addScore(clearB + killB + missB);
  R.stagesCleared++;
  if (rank) {
    R.ranks.push(rank);
    const key = R.diffId + '-' + (st.idx + 1);
    const order = 'CBAS';
    if (!SAVE.ranks[key] || order.indexOf(rank) > order.indexOf(SAVE.ranks[key])) SAVE.ranks[key] = rank;
    if (rank === 'S') checkAch('srank');
  }
  if (noMiss) checkAch('nomiss');
  if (st.idx === 0) checkAch('first');
  if (st.idx === 2) checkAch('stage3');
  const nextReach = Math.min(5, st.idx + 2);
  if (R.mode !== 'rush' && SAVE.reach[R.diffId] < nextReach) SAVE.reach[R.diffId] = nextReach;
  G.tally = { t: 0, rank, killRate, chainRate, noMiss, clearB, killB, missB, stageScore: R.score - st.scoreStart, def: st.def, skip: false, rush };
  st.phase = 'tally'; st.t = 0;
  AU.sfx('clear');
  AU.play('clear');
  saveGame();
}
function nextStage() {
  const R = G.run, st = G.st;
  G.tally = null;
  if (R.mode === 'practice' || st.idx >= 4) { R.cleared = true; finishRun(true); return; }
  R.stageIdx = st.idx + 1;
  startStage(R.stageIdx);
}
function finishRun(cleared) {
  const R = G.run;
  if (!R || R.finished) return;
  R.finished = true;
  R.cleared = cleared;
  const scoreDust = Math.floor(R.score / 4000);
  R.dustTotal = R.dust + scoreDust;
  R.scoreDust = scoreDust;
  SAVE.dust += R.dustTotal; SAVE.dustTotal += R.dustTotal;
  SAVE.stats.playTime += R.time;
  if (R.score > SAVE.stats.bestScore) SAVE.stats.bestScore = R.score;
  R.newBest = false;
  if (R.mode === 'story') {
    const list = SAVE.best[R.diffId];
    const entry = { score: R.score, stage: cleared ? 'ALL' : (R.stageIdx + 1), ship: R.ship.id, chain: R.maxChain, date: new Date().toISOString().slice(0, 10) };
    list.push(entry); list.sort((a, b) => b.score - a.score); list.length = Math.min(list.length, 5);
    R.newBest = list[0] === entry;
    if (cleared) {
      SAVE.clear[R.diffId] = true;
      checkAch(R.diffId === 'normal' ? 'clearN' : R.diffId === 'hard' ? 'clearH' : 'clearE');
    }
  } else if (R.mode === 'practice') {
    const key = R.diffId + '-' + (R.startStage + 1);
    if (!SAVE.stageBest[key] || R.score > SAVE.stageBest[key]) { SAVE.stageBest[key] = R.score; R.newBest = true; }
  } else if (R.mode === 'rush') {
    if (cleared) { SAVE.rushClear = true; checkAch('rush'); }
    if (R.score > SAVE.rushBest) { SAVE.rushBest = R.score; R.newBest = true; }
  }
  if (R.score >= 1000000) checkAch('score1m');
  if (R.score >= 5000000) checkAch('score5m');
  checkGlobalAch();
  saveGame();
  G.state = 'result';
  AU.play(cleared ? 'clear' : 'title');
  if (ED.onResult) ED.onResult(R);
}
function checkGlobalAch() {
  if (SAVE.stats.absorbed >= 1000) checkAch('absorb1k');
  if (SAVE.stats.absorbed >= 10000) checkAch('absorb10k');
  if (SAVE.stats.kills >= 1000) checkAch('kills1k');
  if (SAVE.stats.kills >= 5000) checkAch('kills5k');
  if (SHIP_ORDER.every(s => SAVE.ships[s])) checkAch('allships');
  if (UPG_ORDER.every(k => SAVE.upg[k] >= UPGRADES[k].max)) checkAch('maxupg');
}
function checkAch(id) {
  if (SAVE.ach[id]) return;
  const a = ACHS.find(x => x.id === id); if (!a) return;
  SAVE.ach[id] = Date.now();
  SAVE.dust += a.dust; SAVE.dustTotal += a.dust;
  if (G.run) G.run.achNew.push(a);
  AU.sfx('ach');
  if (ED.toast) ED.toast('実績解除', a.name, '+' + a.dust + ' 星屑');
  saveGame();
}

/* ---------- main update ---------- */
function updateGame(dt) {
  const R = G.run;
  R.time += dt;
  for (let i = G.sched.length - 1; i >= 0; i--) { const s = G.sched[i]; s.t -= dt; if (s.t <= 0) { G.sched.splice(i, 1); s.fn(); } }
  updateStage(dt);
  if (G.state !== 'play') return;
  updatePlayer(dt);
  G.chain.flash = Math.max(0, G.chain.flash - dt * 2);
  G.shake = Math.max(0, G.shake - dt * 30);
  G.flash = Math.max(0, G.flash - dt);
  if (G.phaseBanner) G.phaseBanner.t += dt;
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.life) G.banner = null; }
  // enemies
  for (let i = 0; i < G.enemies.length; i++) {
    const e = G.enemies[i];
    if (e.dead) continue;
    e.t += dt; e.flash = Math.max(0, e.flash - dt);
    if (e.isBoss) updateBoss(e, dt);
    else { moveEnemy(e, dt); if (!e.dead) fireEnemy(e, dt); }
    if (e.dead) continue;
    if (!e.entered && e.y > 0 && e.y < H && e.x > 0 && e.x < W) e.entered = true;
    if (e.entered && !e.isBoss && (e.y > H + 40 || e.y < -70 || e.x < -60 || e.x > W + 60)) { e.dead = true; e.escaped = true; }
    if (P.alive && P.inv <= 0 && !e.isBoss && dist2(e.x, e.y, P.x, P.y) < (e.r * 0.7 + 3) ** 2) killPlayer();
    if (P.alive && P.inv <= 0 && e.isBoss && dist2(e.x, e.y, P.x, P.y) < (e.r * 0.6) ** 2) killPlayer();
  }
  G.enemies = G.enemies.filter(e => !e.dead);
  updateShots(dt);
  updateLasers(dt);
  updateBeam(dt);
  updateBullets(dt);
  updatePickups(dt);
  updateParts(dt);
}
function updateShots(dt) {
  const arr = G.pshots;
  for (let i = 0; i < arr.length; i++) {
    const s = arr[i];
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.y < -20 || s.x < -20 || s.x > W + 20) { s.dead = true; continue; }
    for (let j = 0; j < G.enemies.length; j++) {
      const e = G.enemies[j];
      if (e.dead || e.y < 2) continue;
      const rr = e.r + 4;
      if (Math.abs(s.x - e.x) < rr && Math.abs(s.y - e.y) < rr + 6) {
        if (s.pierce) { if (s.hits.indexOf(e.id) >= 0) continue; s.hits.push(e.id); }
        damageEnemy(e, s.dmg, s.pol, 'shot');
        if (Math.random() < 0.3) burstParts(s.x, s.y + 4, 1, e.isBoss && e.inv > 0 ? '180,180,180' : PCOL[s.pol].rgb, 80, 1.8, 0.2);
        AU.sfx('hit');
        if (!s.pierce) { s.dead = true; break; }
        s.dmg *= 0.8;
      }
    }
  }
  G.pshots = arr.filter(s => !s.dead);
}
function nearestEnemy(x, y, exclude) {
  let best = null, bd = 1e12;
  for (const e of G.enemies) {
    if (e.dead || e.y < 0 || e.y > H || (e.isBoss && e.bossState !== 'fight')) continue;
    let d = dist2(x, y, e.x, e.y);
    if (exclude && exclude.get(e.id) > 2) d *= 3;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function updateLasers(dt) {
  const counts = new Map();
  for (const l of G.lasers) if (l.target && !l.target.dead) counts.set(l.target.id, (counts.get(l.target.id) || 0) + 1);
  for (const l of G.lasers) {
    l.t += dt;
    if (l.t < 0) { l.x = P.x; l.y = P.y; continue; }
    if (!l.target || l.target.dead || (l.target.isBoss && l.target.bossState !== 'fight')) {
      l.target = nearestEnemy(l.x, l.y, counts);
      if (l.target) counts.set(l.target.id, (counts.get(l.target.id) || 0) + 1);
    }
    let want = -Math.PI / 2;
    if (l.target) want = Math.atan2(l.target.y - l.y, l.target.x - l.x);
    let da = want - l.ang;
    while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    const turn = (l.swarm ? 9 : 6) + l.t * 14;
    l.ang += clamp(da, -turn * dt, turn * dt);
    l.spd = Math.min(l.swarm ? 950 : 850, l.spd + 1300 * dt);
    l.x += Math.cos(l.ang) * l.spd * dt; l.y += Math.sin(l.ang) * l.spd * dt;
    l.trail.push(l.x, l.y); if (l.trail.length > (l.swarm ? 12 : 22)) l.trail.splice(0, 2);
    if (l.t > 3 || l.y < -40 || l.y > H + 40 || l.x < -40 || l.x > W + 40) { l.dead = true; continue; }
    if (l.target && !l.target.dead && dist2(l.x, l.y, l.target.x, l.target.y) < (l.target.r + 7) ** 2) {
      const e = l.target;
      const killed = damageEnemy(e, l.dmg, l.pol, 'burst');
      if (killed && e.isBoss && e.dead) checkAch('burstkill');
      burstParts(l.x, l.y, 5, PCOL[l.pol].rgb, 150, 2.4, 0.35);
      l.dead = true;
    }
  }
  G.lasers = G.lasers.filter(l => !l.dead);
}
function updateBeam(dt) {
  const b = G.beam; if (!b) return;
  b.t += dt;
  if (b.t > b.dur || !P.alive) { G.beam = null; return; }
  const hw = b.w / 2 * Math.min(1, b.t * 8) * (b.t > b.dur - 0.2 ? (b.dur - b.t) / 0.2 : 1);
  b.cw = hw;
  for (const e of G.enemies) {
    if (e.dead || e.y > P.y || e.y < -10) continue;
    if (Math.abs(e.x - P.x) < hw + e.r) {
      const killed = damageEnemy(e, b.dps * dt, b.pol, 'burst');
      if (killed && e.isBoss) checkAch('burstkill');
      if (Math.random() < 0.3) burstParts(e.x + rand(-e.r, e.r), e.y + e.r * 0.5, 1, PCOL[b.pol].rgb, 120, 2, 0.3);
    }
  }
  for (const bl of G.bullets) {
    if (!bl.dead && bl.y < P.y + 10 && Math.abs(bl.x - P.x) < hw + bl.r) { bl.dead = true; toBit(bl); }
  }
  shake(2);
}
function toBit(b) {
  G.pick.push({ x: b.x, y: b.y, vx: rand(-30, 30), vy: rand(-40, 0), t: 0, kind: 'bit', val: 1 });
}
function updateBullets(dt) {
  const arr = G.bullets;
  const alive = P.alive;
  const ar2 = P.absorbR * P.absorbR;
  for (let i = 0; i < arr.length; i++) {
    const b = arr[i];
    if (b.dead) continue;
    b.t += dt;
    if (b.acc || b.turn) {
      b.spd += b.acc * dt;
      if (b.maxS && b.spd > b.maxS) b.spd = b.maxS;
      if (b.minS && b.spd < b.minS) b.spd = b.minS;
      b.ang += b.turn * dt;
      b.vx = Math.cos(b.ang) * b.spd; b.vy = Math.sin(b.ang) * b.spd;
    }
    if (b.flipAt && b.t >= b.flipAt) {
      b.pol ^= 1; b.flipped = 0.25;
      b.flipAt = b.flipEvery ? b.t + b.flipEvery : 0;
    }
    if (b.flipped) b.flipped = Math.max(0, b.flipped - dt);
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < -30 || b.x > W + 30 || b.y < -40 || b.y > H + 30) { b.dead = true; continue; }
    if (!alive) continue;
    const dx = b.x - P.x, dy = b.y - P.y;
    if (dx > 30 || dx < -30 || dy > 30 || dy < -30) continue;
    const d2v = dx * dx + dy * dy;
    if (b.pol === P.pol) {
      if (d2v < ar2 + b.r * b.r) absorb(b);
    } else if (P.inv <= 0) {
      const hr = b.r * 0.72 + 1.6;
      if (d2v < hr * hr) { killPlayer(); break; }
    }
  }
  G.bullets = arr.filter(b => !b.dead);
}
function absorb(b) {
  b.dead = true;
  const R = G.run;
  P.energy = Math.min(P.emax, P.energy + 1);
  P.absorbFx = 1; P.phaseAbsorb++;
  R.absorbed++; G.st.absorbed++; SAVE.stats.absorbed++;
  addScore(10 * D().mul);
  if (Math.random() < 0.5) G.parts.push({ x: b.x, y: b.y, vx: (P.x - b.x) * 4, vy: (P.y - b.y) * 4, life: 0.18, t: 0, size: 2.5, rgb: PCOL[b.pol].rgb, kind: 'spark' });
  AU.sfx('absorb', b.pol);
}
function updatePickups(dt) {
  for (const p of G.pick) {
    p.t += dt;
    const home = P.alive && p.t > (p.kind === 'bit' ? 0.35 : 0.45) && (p.kind === 'bit' || p.homing || dist2(p.x, p.y, P.x, P.y) < P.magR * P.magR || G.st.phase === 'tally' || G.st.phase === 'bossdie');
    if (home) {
      p.homing = true;
      const a = Math.atan2(P.y - p.y, P.x - p.x), sp = Math.min(900, 150 + (p.t - 0.35) * 900);
      p.vx = lerp(p.vx, Math.cos(a) * sp, Math.min(1, dt * 10)); p.vy = lerp(p.vy, Math.sin(a) * sp, Math.min(1, dt * 10));
    } else { p.vx *= 1 - dt * 2; p.vy = lerp(p.vy, 55, dt * 2); }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (P.alive && dist2(p.x, p.y, P.x, P.y) < 18 * 18) {
      p.dead = true;
      if (p.kind === 'dust') { G.run.dust += p.val; AU.sfx('dust'); }
      else { addScore(50 * D().mul); AU.sfx('bit'); }
    } else if (p.y > H + 20) p.dead = true;
  }
  G.pick = G.pick.filter(p => !p.dead);
}
function updateParts(dt) {
  for (const p of G.parts) {
    p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 1 - dt * 2.5; p.vy *= 1 - dt * 2.5;
  }
  G.parts = G.parts.filter(p => p.t < p.life);
  for (const f of G.floats) { f.t += dt; f.y -= 22 * dt; }
  G.floats = G.floats.filter(f => f.t < f.life);
}
function cancelBullets(toBits) {
  for (const b of G.bullets) {
    if (toBits) toBit(b);
    else if (Math.random() < 0.3) burstParts(b.x, b.y, 1, PCOL[b.pol].rgb, 40, 2, 0.3);
  }
  G.bullets.length = 0;
}

Object.assign(ED, { newRun, finishRun, updateGame, checkAch, checkGlobalAch, startStage, saveGame });
