'use strict';
/* ECLIPSE DRIVE — bosses */
function iv(x) { return x / D().rate; }
function tick(b, k, interval, dt, first) {
  if (b.tm[k] == null) b.tm[k] = first != null ? interval - first : 0;
  b.tm[k] += dt;
  let n = 0;
  while (b.tm[k] >= interval) { b.tm[k] -= interval; n++; }
  return n;
}
function hover(b, dt, ax, ay, sp) {
  const tx = W / 2 + Math.sin(b.phT * sp) * ax, ty = b.baseY + Math.sin(b.phT * sp * 1.7) * ay;
  const k = Math.min(1, dt * 2);
  b.x += (tx - b.x) * k; b.y += (ty - b.y) * k;
}
function counterPol() { return P && P.alive ? P.pol ^ 1 : SOL; }

const BOSSES = {
  gemini: {
    name: 'GEMINI', jp: '双月の番人', r: 30, look: 'gemini',
    phases: [
      {
        hp: 650, time: 35, pol: SOL, name: '交互環「明と暗」',
        update(b, dt) {
          hover(b, dt, 70, 12, 0.6);
          if (tick(b, 'ring', iv(0.6), dt)) { b.k = (b.k || 0) + 1; b.a += 0.13; ring(b.x, b.y, cnt(16), 100, b.k % 2, 'orb', b.a); }
          if (tick(b, 'aim', iv(2.2), dt, 1.2)) fan(b.x, b.y + 10, 3, 0.2, aimAt(b.x, b.y), 170, b.pol, 'rice');
        }
      },
      {
        hp: 750, time: 35, pol: LUNA, name: '双星「ジェミニ」',
        update(b, dt) {
          hover(b, dt, 50, 10, 0.5);
          if (tick(b, 'l', iv(0.85), dt)) fan(b.x - 48, b.y, cnt(5), 0.2, aimAt(b.x - 48, b.y), 150, SOL, 'orb');
          if (tick(b, 'r', iv(0.85), dt, 0.42)) fan(b.x + 48, b.y, cnt(5), 0.2, aimAt(b.x + 48, b.y), 150, LUNA, 'orb');
          if (tick(b, 'ring', iv(1.7), dt)) { b.k = (b.k || 0) + 1; ring(b.x, b.y, cnt(10), 75, b.k % 2, 'big', b.k * 0.3); }
        }
      },
      {
        hp: 850, time: 40, pol: SOL, name: '月下花「ルナフローラ」',
        update(b, dt) {
          hover(b, dt, 30, 8, 0.4);
          if (tick(b, 'f', iv(0.085), dt)) {
            b.a += 0.33;
            shoot(b.x, b.y, b.a, 120, SOL, 'orb'); shoot(b.x, b.y, b.a + Math.PI, 120, LUNA, 'orb');
            if (D().dens > 1.2) { shoot(b.x, b.y, -b.a + 0.5, 105, LUNA, 'small'); shoot(b.x, b.y, -b.a + 0.5 + Math.PI, 105, SOL, 'small'); }
          }
          if (tick(b, 'aim', iv(1.9), dt)) fan(b.x, b.y + 10, 5, 0.12, aimAt(b.x, b.y), 165, counterPol(), 'rice');
        }
      }
    ]
  },
  helix: {
    name: 'HELIX', jp: '螺旋艦', r: 32, look: 'helix',
    phases: [
      {
        hp: 800, time: 35, pol: LUNA, name: '螺旋「ダブルヘリックス」',
        update(b, dt) {
          hover(b, dt, 40, 10, 0.5);
          if (tick(b, 's', iv(0.075), dt)) {
            b.a += 0.155;
            const arms = D().dens > 1.4 ? 6 : 4;
            for (let i = 0; i < arms; i++) shoot(b.x, b.y, b.a + i * TAU / arms, 118, i % 2, 'rice');
          }
        }
      },
      {
        hp: 900, time: 35, pol: SOL, name: '逆螺旋「リバーサル」',
        update(b, dt) {
          hover(b, dt, 60, 10, 0.45);
          const seg = Math.floor(b.phT / 2.6), dir = seg % 2 ? -1 : 1, pol = seg % 2;
          if (tick(b, 's', iv(0.07), dt)) {
            b.a += 0.19 * dir;
            const arms = cnt(3);
            for (let i = 0; i < arms; i++) shoot(b.x, b.y, b.a + i * TAU / arms, 125, pol, 'orb');
          }
          if (tick(b, 'st', iv(1.4), dt, 0.8)) {
            const a = aimAt(b.x, b.y), cp = counterPol();
            for (let i = 0; i < 5; i++) shoot(b.x, b.y + 12, a, 150 + i * 24, cp, 'rice');
          }
        }
      },
      {
        hp: 1000, time: 40, pol: LUNA, name: '渦「加速する銀河」',
        update(b, dt) {
          hover(b, dt, 40, 14, 0.5);
          if (tick(b, 'r', iv(0.75), dt)) {
            b.k = (b.k || 0) + 1;
            const t = b.k % 2 ? 0.55 : -0.55;
            ring(b.x, b.y, cnt(18), 35, b.k % 2, 'orb', b.k * 0.2, { acc: 110, maxS: 220, turn: t });
          }
          if (tick(b, 'a', iv(2.4), dt)) fan(b.x, b.y, 3, 0.35, aimAt(b.x, b.y), 120, b.pol, 'big');
        }
      }
    ]
  },
  obelisk: {
    name: 'OBELISK', jp: '蝕の塔', r: 34, look: 'obelisk',
    phases: [
      {
        hp: 900, time: 38, pol: SOL, name: '光帳「カーテンフォール」',
        update(b, dt) {
          hover(b, dt, 20, 6, 0.4);
          if (tick(b, 'row', iv(0.78), dt)) {
            b.k = (b.k || 0) + 1;
            const n = Math.round(11 * Math.min(1.35, D().dens)), gap = Math.floor(Math.random() * (n - 2));
            for (let i = 0; i < n; i++) {
              if (i === gap || i === gap + 1) continue;
              shoot(14 + i * (W - 28) / (n - 1), -4, Math.PI / 2, 112, b.k % 2, 'orb');
            }
          }
          if (tick(b, 'aim', iv(1.6), dt)) fan(b.x, b.y + 20, 3, 0.25, aimAt(b.x, b.y), 150, b.pol, 'rice');
        }
      },
      {
        hp: 1000, time: 38, pol: LUNA, name: '分空「ディバイデッドスカイ」',
        update(b, dt) {
          hover(b, dt, 30, 8, 0.5);
          const side = Math.floor(b.phT / 3.4) % 2;
          b.splitSide = side;
          b.splitWarn = (b.phT % 3.4) > 2.8;
          const k = tick(b, 'rain', iv(0.1 / D().dens), dt);
          for (let j = 0; j < k; j++) {
            const x = Math.random() * W, pol = (x < W / 2 ? 0 : 1) ^ side;
            shoot(x, -4, Math.PI / 2 + rand(-0.08, 0.08), 135 + Math.random() * 45, pol, 'small');
          }
          if (tick(b, 'ring', iv(2.2), dt)) ring(b.x, b.y, cnt(14), 90, b.pol, 'orb', Math.random());
        }
      },
      {
        hp: 1100, time: 42, pol: SOL, name: '蝕柱「エクリプスピラー」',
        update(b, dt) {
          hover(b, dt, 25, 6, 0.45);
          b.pol = Math.floor(b.phT / 4) % 2;
          const cyc = b.phT % 2.0;
          if (cyc < 1.2 && tick(b, 'em', iv(0.14), dt)) {
            [-90, -40, 40, 90].forEach((ox, i) => {
              const ex = b.x + ox, ey = b.y + 24;
              shoot(ex, ey, aimAt(ex, ey) + (i - 1.5) * 0.12, 195, i % 2, 'rice');
            });
          }
          if (tick(b, 'row', iv(1.5), dt)) {
            b.k = (b.k || 0) + 1;
            const n = 9, gap = Math.floor(Math.random() * (n - 2));
            for (let i = 0; i < n; i++) if (i !== gap && i !== gap + 1) shoot(20 + i * (W - 40) / (n - 1), -4, Math.PI / 2, 85, b.k % 2, 'big');
          }
        }
      }
    ]
  },
  asura: {
    name: 'ASURA', jp: '千手', r: 30, look: 'asura',
    phases: [
      {
        hp: 1000, time: 40, pol: SOL, name: '四臂「阿修羅陣」',
        init(b) { spawnArms(b, 72, 0.9, { k: 'aim', n: 3, spread: 0.22, spd: 140, every: 1.4, kind: 'orb' }); },
        update(b, dt) {
          hover(b, dt, 50, 10, 0.4);
          if (tick(b, 'ring', iv(1.5), dt)) { b.k = (b.k || 0) + 1; ring(b.x, b.y, cnt(18), 92, b.k % 2, 'orb', b.k * 0.17); }
        }
      },
      {
        hp: 1100, time: 40, pol: LUNA, name: '旋臂「千手観音」',
        init(b) { spawnArms(b, 96, 1.5, { k: 'ring', n: 6, spd: 105, every: 1.15, kind: 'orb', rot: 0.4 }); },
        update(b, dt) {
          hover(b, dt, 30, 10, 0.5);
          if (tick(b, 'fan', iv(1.15), dt)) fan(b.x, b.y + 10, cnt(7), 0.14, aimAt(b.x, b.y), 150, counterPol(), 'rice');
        }
      },
      {
        hp: 1300, time: 45, pol: SOL, name: '修羅「狂乱の千手」',
        init(b) { G.enemies.forEach(e => { if (e.part && e.mv.parent === b) killEnemy(e); }); },
        update(b, dt) {
          hover(b, dt, 60, 16, 0.6);
          b.pol = Math.floor(b.phT / 3) % 2;
          const k = tick(b, 'rnd', iv(0.06 / D().dens), dt);
          for (let j = 0; j < k; j++) shoot(b.x, b.y, rand(0.1, Math.PI - 0.1), rand(85, 165), Math.random() < 0.5 ? 0 : 1, 'small');
          if (tick(b, 'cross', iv(0.17), dt)) {
            b.a += 0.06;
            for (let i = 0; i < 4; i++) shoot(b.x, b.y, b.a + i * Math.PI / 2, 150, i % 2, 'rice');
          }
        }
      }
    ]
  },
  eclipse: {
    name: 'ECLIPSE', jp: '黒き太陽', r: 38, look: 'eclipse',
    phases: [
      {
        hp: 1100, time: 40, pol: SOL, name: '日蝕環「コロナ」',
        update(b, dt) {
          hover(b, dt, 40, 10, 0.4);
          if (tick(b, 'ring', iv(0.44), dt)) { b.k = (b.k || 0) + 1; b.a += 0.071; ring(b.x, b.y, cnt(22), 112, b.k % 2, 'orb', b.a); }
          if (tick(b, 'big', iv(1.8), dt)) fan(b.x, b.y + 16, 5, 0.3, aimAt(b.x, b.y), 88, counterPol(), 'big');
        }
      },
      {
        hp: 1200, time: 40, pol: LUNA, name: '反転螺旋「フリップ」',
        update(b, dt) {
          hover(b, dt, 50, 10, 0.45);
          if (tick(b, 's', iv(0.065), dt)) {
            b.a += 0.21;
            const arms = cnt(3);
            for (let i = 0; i < arms; i++) shoot(b.x, b.y, b.a + i * TAU / arms, 120, SOL, 'orb', { flipAt: 0.95, noFlip: true });
          }
          if (tick(b, 'r', iv(1.2), dt)) ring(b.x, b.y, cnt(10), 80, LUNA, 'big', Math.random(), { flipAt: 1.3, noFlip: true });
        }
      },
      {
        hp: 1400, time: 45, pol: SOL, name: '皆既「トータルエクリプス」',
        update(b, dt) {
          hover(b, dt, 40, 12, 0.5);
          const T = 3.2, c = b.phT % T;
          b.pol = Math.floor(b.phT / T) % 2;
          G.worldFlip = c > T - 0.75 ? (c - (T - 0.75)) / 0.75 : 0;
          if (b.lastFlip !== Math.floor(b.phT / T)) {
            if (b.lastFlip != null) {
              for (const bl of G.bullets) { bl.pol ^= 1; bl.flipped = 0.3; }
              AU.sfx('flip'); G.flash = 0.15; G.flashCol = PCOL[b.pol].rgb;
            }
            b.lastFlip = Math.floor(b.phT / T);
          }
          if (tick(b, 'sp', iv(0.1), dt)) { b.a += 0.27; for (let i = 0; i < 2; i++) shoot(b.x, b.y, b.a + i * Math.PI, 100, b.pol, 'orb'); }
          if (tick(b, 'ring', iv(0.9), dt)) ring(b.x, b.y, cnt(16), 85, b.pol ^ 1, 'small', Math.random());
        }
      },
      {
        hp: 99999, time: 24, pol: LUNA, survival: true, name: '終焉「ラストエクリプス」',
        update(b, dt) {
          hover(b, dt, 20, 6, 0.3);
          b.inv = 1;
          b.pol = Math.floor(b.phT / 2) % 2;
          G.worldFlip = 0;
          const k = Math.min(1, b.phT / 18);
          if (tick(b, 'ring', iv(0.55 - 0.15 * k), dt)) { b.k = (b.k || 0) + 1; ring(b.x, b.y, cnt(20), 95 + 30 * k, b.k % 2, 'orb', b.k * 0.13); }
          if (tick(b, 'sp', iv(0.09), dt)) { b.a += 0.23; shoot(b.x, b.y, b.a, 115, SOL, 'small', { flipAt: 1.0, noFlip: true }); shoot(b.x, b.y, -b.a, 115, LUNA, 'small', { flipAt: 1.0, noFlip: true }); }
          if (tick(b, 'aim', iv(1.6), dt)) fan(b.x, b.y, 3, 0.22, aimAt(b.x, b.y), 140, counterPol(), 'big');
        }
      }
    ]
  }
};
const BOSS_ORDER = ['gemini', 'helix', 'obelisk', 'asura', 'eclipse'];

function spawnArms(b, rad, w, fr) {
  const exist = G.enemies.filter(e => e.part && !e.dead && e.mv.parent === b);
  exist.forEach(e => { e.mv.rad = rad; e.mv.w = w; e.frs = [Object.assign({}, fr, { ft: rand(0.5, 1.2) })]; });
  for (let i = exist.length; i < 4; i++) {
    const e = spawnEnemy('arm', i % 2, b.x, b.y, { k: 'orbit', parent: b, rad, a: i * TAU / 4, w, wob: 10 }, fr, { part: true });
    e.hp = e.maxhp = ETYPES.arm.hp * D().bossHp;
  }
}
function spawnBoss(id) {
  const def = BOSSES[id];
  const b = spawnEnemy('heavy', def.phases[0].pol, W / 2, -70, { k: 'boss' }, null, {
    isBoss: true, bossId: id, def, r: def.r, ph: 0, phT: 0, tm: {}, a: 0, k: 0, baseY: 125,
    bossState: 'enter', inv: 99, score: 0, dust: 0
  });
  b.hp = b.maxhp = def.phases[0].hp * D().bossHp;
  return b;
}
function bossStartPhase(b) {
  const ph = b.def.phases[b.ph];
  b.pol = ph.pol; b.phT = 0; b.tm = {}; b.k = 0;
  b.hp = b.maxhp = ph.hp * D().bossHp;
  b.bossState = 'fight'; b.inv = 0;
  b.phaseHit = false; b.phaseBursts = G.run.bursts; P.phaseAbsorb = 0;
  G.st.phaseHit = false;
  G.worldFlip = 0;
  if (ph.init) ph.init(b);
  G.phaseBanner = { txt: ph.name, t: 0, survival: !!ph.survival };
}
function updateBoss(b, dt) {
  switch (b.bossState) {
    case 'enter': {
      const k = Math.min(1, dt * 1.6);
      b.x += (W / 2 - b.x) * k; b.y += (b.baseY - b.y) * k;
      if (b.t > 2.2) bossStartPhase(b);
      break;
    }
    case 'trans': {
      b.transT -= dt;
      const k = Math.min(1, dt * 2);
      b.x += (W / 2 - b.x) * k; b.y += (b.baseY - b.y) * k;
      if (b.transT <= 0) bossStartPhase(b);
      break;
    }
    case 'fight': {
      b.phT += dt;
      b.inv = Math.max(0, b.inv - dt);
      const ph = b.def.phases[b.ph];
      ph.update(b, dt);
      if (b.phT >= ph.time) bossPhaseEnd(b, 'timeout');
      break;
    }
    case 'dying': {
      b.dieT += dt;
      b.x += rand(-1, 1); b.y += 8 * dt;
      if (Math.random() < dt * 14) {
        const x = b.x + rand(-b.r, b.r) * 1.3, y = b.y + rand(-b.r, b.r);
        burstParts(x, y, 14, PCOL[Math.random() < 0.5 ? 0 : 1].rgb, 220, 3, 0.7);
        ringFx(x, y, rand(20, 50), '255,255,255', 0.35); shake(6);
      }
      if (b.dieT > 2.1) {
        b.dead = true;
        burstParts(b.x, b.y, 140, '255,255,255', 420, 3.5, 1.3);
        burstParts(b.x, b.y, 80, PCOL[0].rgb, 300, 3, 1.1);
        burstParts(b.x, b.y, 80, PCOL[1].rgb, 300, 3, 1.1);
        ringFx(b.x, b.y, 200, '255,255,255', 0.9);
        G.flash = 0.6; G.flashCol = '255,255,255'; shake(22);
        for (let i = 0; i < 24; i++) G.pick.push({ x: b.x, y: b.y, vx: rand(-200, 200), vy: rand(-220, 60), t: 0, kind: 'dust', val: 1 });
      }
      break;
    }
  }
}
function bossPhaseEnd(b, src) {
  if (b.bossState !== 'fight') return;
  const ph = b.def.phases[b.ph], R = G.run, mul = D().mul;
  const timeout = src === 'timeout' && !ph.survival;
  const timeLeft = Math.max(0, ph.time - b.phT);
  const bonus = timeout ? 0 : Math.round((ph.survival ? 150000 : 10000 + timeLeft * 900) * mul);
  if (bonus) addScore(bonus);
  floatText(W / 2, b.y + 60, timeout ? 'TIME OUT' : (ph.survival ? 'SURVIVED  +' : 'BREAK  +') + (bonus ? fmt(bonus) : ''), timeout ? '#aab' : '#fff', 14, 1.6);
  cancelBullets(true);
  G.worldFlip = 0;
  if (!timeout && !G.st.phaseHit && R.bursts === b.phaseBursts && P.phaseAbsorb >= 300) checkAch('pacifist');
  for (let i = 0; i < 6; i++) G.pick.push({ x: b.x, y: b.y, vx: rand(-150, 150), vy: rand(-180, 0), t: 0, kind: 'dust', val: 1 });
  burstParts(b.x, b.y, 60, PCOL[b.pol].rgb, 300, 3, 0.8);
  ringFx(b.x, b.y, 120, '255,255,255', 0.5);
  G.flash = 0.3; G.flashCol = '255,255,255'; shake(10);
  b.ph++;
  G.phaseBanner = null;
  if (b.ph >= b.def.phases.length) {
    b.bossState = 'dying'; b.dieT = 0; b.hp = 0;
    G.enemies.forEach(e => { if (e.part) killEnemy(e); });
    G.st.phase = 'bossdie'; G.st.t = 0;
    AU.sfx('bossDie');
    if (src === 'burst') checkAch('burstkill');
  } else {
    b.bossState = 'trans'; b.transT = 1.5; b.inv = 2;
    AU.sfx('phase');
  }
}
