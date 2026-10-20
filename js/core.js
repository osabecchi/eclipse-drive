'use strict';
/* ECLIPSE DRIVE — core: utils, save, input, audio */
const ED = window.ED = {};
const W = 360, H = 640;
const TAU = Math.PI * 2;
const SOL = 0, LUNA = 1;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const fmt = n => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/* ---------------- save ---------------- */
const SAVE_KEY = 'eclipse-drive-save-v1';
function defaultSave() {
  return {
    v: 1, dust: 0, dustTotal: 0,
    ships: { halcyon: true }, ship: 'halcyon', diff: 'normal',
    upg: { power: 0, capacity: 0, life: 0, absorb: 0, magnet: 0, spark: 0 },
    best: { normal: [], hard: [], eclipse: [] },
    reach: { normal: 1, hard: 1, eclipse: 1 },
    clear: { normal: false, hard: false, eclipse: false },
    rushClear: false, rushBest: 0,
    ranks: {}, stageBest: {},
    ach: {},
    stats: { kills: 0, absorbed: 0, maxChain: 0, plays: 0, deaths: 0, bursts: 0, playTime: 0, bestScore: 0 },
    set: { bgm: 0.55, sfx: 0.8, sens: 1.25, shake: true, help: true }
  };
}
function mergeDeep(def, src) {
  if (!src || typeof src !== 'object' || Array.isArray(def)) return src === undefined ? def : src;
  const out = {};
  for (const k in def) out[k] = (k in src) ? mergeDeep(def[k], src[k]) : def[k];
  for (const k in src) if (!(k in out)) out[k] = src[k];
  return out;
}
let SAVE = defaultSave();
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) SAVE = mergeDeep(defaultSave(), JSON.parse(raw));
} catch (e) { /* storage unavailable */ }
function saveGame() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { } }

/* ---------------- input ---------------- */
const IN = {
  keys: {}, sw: false, burst: false, pause: false, focus: false,
  tdx: 0, tdy: 0, touchId: null, tx: 0, ty: 0, touchMode: false, anyKey: false,
  padPrev: {}
};
const KEYMAP = {
  ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd',
  ShiftLeft: 'f', ShiftRight: 'f'
};
addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT')) return;
  const m = KEYMAP[e.code];
  if (m) { IN.keys[m] = true; e.preventDefault(); }
  if (!e.repeat) {
    if (e.code === 'KeyZ' || e.code === 'Space' || e.code === 'KeyJ') { IN.sw = true; e.preventDefault(); }
    if (e.code === 'KeyX' || e.code === 'KeyK' || e.code === 'KeyC') { IN.burst = true; }
    if (e.code === 'Escape' || e.code === 'KeyP') { IN.pause = true; }
  }
  IN.touchMode = false;
  IN.anyKey = true;
});
addEventListener('keyup', e => { const m = KEYMAP[e.code]; if (m) IN.keys[m] = false; });
addEventListener('blur', () => { IN.keys = {}; if (ED.onBlur) ED.onBlur(); });

function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const p = pads && pads[0];
  if (!p) return null;
  const b = i => p.buttons[i] && p.buttons[i].pressed;
  const edge = (i, k) => { const v = b(i); const r = v && !IN.padPrev[k]; IN.padPrev[k] = v; return r; };
  if (edge(0, 'a') || edge(2, 'x')) IN.sw = true;
  if (edge(1, 'b') || edge(3, 'y')) IN.burst = true;
  if (edge(9, 'st')) IN.pause = true;
  let ax = p.axes[0] || 0, ay = p.axes[1] || 0;
  if (Math.abs(ax) < 0.18) ax = 0; if (Math.abs(ay) < 0.18) ay = 0;
  if (b(14)) ax = -1; if (b(15)) ax = 1; if (b(12)) ay = -1; if (b(13)) ay = 1;
  return { ax, ay, focus: b(5) || b(7) || b(4) || b(6) };
}

/* ---------------- audio ---------------- */
const AU = {
  ctx: null, master: null, sfxG: null, bgmG: null, noiseBuf: null,
  last: {}, track: null, step: 0, nextT: 0, timer: 0, absorbN: 0, absorbT: 0
};
AU.init = function () {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  const ctx = AU.ctx = new C();
  AU.master = ctx.createGain(); AU.master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  AU.master.connect(comp); comp.connect(ctx.destination);
  AU.sfxG = ctx.createGain(); AU.sfxG.connect(AU.master);
  AU.bgmG = ctx.createGain(); AU.bgmG.connect(AU.master);
  AU.applyVol();
  const len = ctx.sampleRate;
  AU.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = AU.noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  AU.timer = setInterval(AU.sched, 25);
};
AU.applyVol = function () {
  if (!AU.ctx) return;
  AU.sfxG.gain.value = SAVE.set.sfx * 0.55;
  AU.bgmG.gain.value = SAVE.set.bgm * 0.32;
};
function tone(type, f0, f1, dur, vol, out, t0, attack) {
  const ctx = AU.ctx; if (!ctx) return;
  const t = t0 || ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const a = attack || 0.004;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out || AU.sfxG);
  o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, fFrom, fTo, out, t0, q) {
  const ctx = AU.ctx; if (!ctx) return;
  const t = t0 || ctx.currentTime;
  const s = ctx.createBufferSource(); s.buffer = AU.noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q || 1.2;
  f.frequency.setValueAtTime(fFrom, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(30, fTo), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(out || AU.sfxG);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
AU.sfx = function (name, p) {
  const ctx = AU.ctx; if (!ctx || ED.noAudio) return;
  const now = ctx.currentTime;
  const gap = { absorb: 0.035, kill: 0.03, dust: 0.05, hit: 0.05, shot: 0.06, bit: 0.04 }[name] || 0;
  if (gap && AU.last[name] && now - AU.last[name] < gap) return;
  AU.last[name] = now;
  switch (name) {
    case 'absorb': {
      if (now - AU.absorbT > 0.5) AU.absorbN = 0;
      AU.absorbT = now; AU.absorbN = Math.min(AU.absorbN + 1, 24);
      const f = (p === LUNA ? 520 : 660) * Math.pow(2, AU.absorbN / 24);
      tone('sine', f, f * 1.5, 0.07, 0.12);
      break;
    }
    case 'switch': tone('triangle', p === SOL ? 330 : 880, p === SOL ? 990 : 300, 0.09, 0.16); break;
    case 'kill': noise(0.16, 0.35, 2400, 300); tone('square', 220, 70, 0.1, 0.06); break;
    case 'killBig': noise(0.6, 0.6, 1600, 80); tone('sawtooth', 160, 35, 0.5, 0.2); break;
    case 'hit': tone('square', 1400, 900, 0.03, 0.03); break;
    case 'chain': {
      const n = Math.min(p || 1, 12);
      [0, 4, 7, 12].forEach((s, i) => tone('triangle', 440 * Math.pow(2, (s + n) / 12), 0, 0.12, 0.12, null, now + i * 0.045));
      break;
    }
    case 'break': tone('sawtooth', 300, 120, 0.2, 0.08); break;
    case 'burst': noise(0.7, 0.5, 300, 6000, null, null, 0.7); tone('sawtooth', 110, 880, 0.5, 0.18); break;
    case 'beam': noise(1.3, 0.45, 800, 200, null, null, 0.5); tone('sawtooth', 70, 60, 1.2, 0.25); break;
    case 'death': noise(1.0, 0.8, 3000, 60); tone('sawtooth', 600, 40, 0.9, 0.3); break;
    case 'warn': for (let i = 0; i < 6; i++) tone('square', i % 2 ? 440 : 587, 0, 0.22, 0.09, null, now + i * 0.26); break;
    case 'phase': noise(0.9, 0.7, 2000, 60); [0, 7, 12, 19].forEach((s, i) => tone('triangle', 523 * Math.pow(2, s / 12), 0, 0.3, 0.1, null, now + 0.15 + i * 0.07)); break;
    case 'bossDie': for (let i = 0; i < 6; i++) noise(0.5, 0.6, 2500, 70, null, now + i * 0.22); tone('sawtooth', 200, 30, 2.0, 0.3); break;
    case 'dust': tone('sine', 1760 + Math.random() * 400, 0, 0.05, 0.05); break;
    case 'bit': tone('sine', 2400, 0, 0.03, 0.03); break;
    case 'extend': [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone('square', 392 * Math.pow(2, s / 12), 0, 0.15, 0.08, null, now + i * 0.07)); break;
    case 'flip': tone('sine', 1200, 300, 0.25, 0.12); tone('sine', 300, 1200, 0.25, 0.12, null, now + 0.05); break;
    case 'ui': tone('triangle', 880, 1320, 0.06, 0.1); break;
    case 'buy': [0, 7, 12].forEach((s, i) => tone('triangle', 660 * Math.pow(2, s / 12), 0, 0.14, 0.12, null, now + i * 0.06)); break;
    case 'deny': tone('square', 160, 120, 0.15, 0.08); break;
    case 'clear': [0, 4, 7, 11, 12].forEach((s, i) => tone('triangle', 523 * Math.pow(2, s / 12), 0, 0.4, 0.12, null, now + i * 0.11)); break;
    case 'ach': [12, 16, 19, 24].forEach((s, i) => tone('sine', 523 * Math.pow(2, s / 12), 0, 0.25, 0.1, null, now + i * 0.08)); break;
  }
};

/* --- procedural BGM sequencer --- */
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phryg: [0, 1, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11] };
const TRACKS = {
  title: { bpm: 96, root: 45, scale: 'dorian', prog: [0, 5, 3, 4], kick: 'half', arp: [0, 2, 4, 7, 4, 2], lead: 'sine', pad: true },
  s1: { bpm: 132, root: 45, scale: 'minor', prog: [0, 5, 2, 6], kick: 'four', arp: [0, 2, 4, 2, 7, 4, 2, 4], lead: 'square' },
  s2: { bpm: 138, root: 47, scale: 'dorian', prog: [0, 3, 4, 2], kick: 'four', arp: [0, 4, 7, 4, 9, 7, 4, 2], lead: 'triangle' },
  s3: { bpm: 142, root: 43, scale: 'phryg', prog: [0, 1, 0, 6], kick: 'break', arp: [0, 2, 0, 4, 0, 5, 4, 2], lead: 'square' },
  s4: { bpm: 146, root: 44, scale: 'harm', prog: [0, 5, 3, 4], kick: 'four', arp: [0, 4, 7, 11, 7, 4, 2, 4], lead: 'sawtooth' },
  s5: { bpm: 152, root: 42, scale: 'harm', prog: [0, 1, 5, 4], kick: 'break', arp: [0, 7, 4, 9, 7, 4, 11, 7], lead: 'square' },
  boss: { bpm: 158, root: 40, scale: 'phryg', prog: [0, 1, 0, 5], kick: 'boss', arp: [0, 3, 7, 3, 8, 7, 3, 1], lead: 'sawtooth' },
  last: { bpm: 166, root: 41, scale: 'harm', prog: [0, 5, 1, 4], kick: 'boss', arp: [0, 7, 3, 11, 7, 3, 12, 7], lead: 'sawtooth' },
  clear: { bpm: 110, root: 48, scale: 'dorian', prog: [0, 3, 4, 0], kick: 'half', arp: [0, 2, 4, 7, 9, 7, 4, 2], lead: 'triangle', pad: true }
};
AU.play = function (name) {
  if (AU.trackName === name) return;
  AU.trackName = name;
  AU.track = TRACKS[name] || null;
  AU.step = 0;
  if (AU.ctx) AU.nextT = AU.ctx.currentTime + 0.08;
};
AU.stop = function () { AU.track = null; AU.trackName = null; };
function noteF(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
AU.sched = function () {
  const ctx = AU.ctx; if (!ctx || !AU.track || SAVE.set.bgm <= 0) { if (ctx) AU.nextT = ctx.currentTime + 0.05; return; }
  const tr = AU.track, sp = 60 / tr.bpm / 4;
  if (AU.nextT < ctx.currentTime - 0.2) AU.nextT = ctx.currentTime + 0.02;
  while (AU.nextT < ctx.currentTime + 0.12) { AU.playStep(tr, AU.step, AU.nextT, sp); AU.step++; AU.nextT += sp; }
};
AU.playStep = function (tr, step, t, sp) {
  const out = AU.bgmG, sc = SCALES[tr.scale];
  const bar = Math.floor(step / 16), s = step % 16;
  const deg = tr.prog[bar % tr.prog.length];
  const deg2n = d => tr.root + 12 * Math.floor(d / 7) + sc[((d % 7) + 7) % 7];
  // drums
  const k = tr.kick;
  const kickOn = k === 'four' ? s % 4 === 0 : k === 'half' ? s % 8 === 0 : k === 'break' ? (s === 0 || s === 6 || s === 10) : (s % 4 === 0 || s === 14);
  if (kickOn) tone('sine', 150, 42, 0.18, 0.55, out, t);
  if (k !== 'half' && (s === 4 || s === 12)) noise(0.12, 0.28, 1800, 900, out, t, 0.8);
  if (s % 2 === 1 || k === 'boss') noise(0.03, k === 'boss' ? 0.08 : 0.12, 9000, 7000, out, t, 2);
  // bass
  if (s % 2 === 0) {
    const bn = deg2n(deg) - 12 + (s % 8 === 6 ? 12 : 0);
    const o = AU.ctx.createOscillator(), g = AU.ctx.createGain(), f = AU.ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = noteF(bn);
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + sp * 1.8);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + sp * 1.9);
    o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + sp * 2);
  }
  // arp
  const ai = step % tr.arp.length;
  if (tr.pad ? s % 2 === 0 : true) {
    const n = deg2n(deg + 7) + tr.arp[ai] - (tr.arp[ai] > 7 ? 0 : 0);
    tone(tr.lead, noteF(n + 12 * (bar % 4 === 3 && s > 8 ? 1 : 0)), 0, sp * 0.9, tr.lead === 'sawtooth' ? 0.035 : tr.lead === 'square' ? 0.04 : 0.07, out, t);
  }
  // pad at bar start
  if (s === 0) {
    [0, 2, 4].forEach(o => {
      const n = deg2n(deg + o) + 12;
      tone('triangle', noteF(n), 0, sp * 15, tr.pad ? 0.05 : 0.03, out, t, sp * 3);
    });
  }
};

ED.util = { clamp, lerp, rand, mulberry32, fmt };
