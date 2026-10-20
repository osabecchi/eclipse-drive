'use strict';
/* ECLIPSE DRIVE — rendering */
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const VIEW = { scale: 1, ox: 0, oy: 0, dpr: 1, cw: 0, ch: 0, rs: 0 };
const FONT_NUM = '"Share Tech Mono", ui-monospace, Menlo, Consolas, monospace';
const FONT_LBL = 'Michroma, "Segoe UI", system-ui, sans-serif';
const FONT_JP = '"Zen Kaku Gothic New", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif';
let SPR = null;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const cw = Math.max(1, window.innerWidth), ch = Math.max(1, window.innerHeight);
  VIEW.dpr = dpr; VIEW.cw = cw; VIEW.ch = ch;
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  const touch = IN.touchMode;
  const reserve = touch ? Math.min(110, Math.max(0, ch - cw * H / W)) : 0;
  const s = Math.min(cw / W, (ch - reserve) / H);
  VIEW.scale = s;
  VIEW.ox = (cw - W * s) / 2;
  VIEW.oy = touch ? Math.max(0, (ch - reserve - H * s) / 2) : (ch - H * s) / 2;
  const rs = clamp(Math.ceil(s * dpr), 1, 4);
  if (rs !== VIEW.rs) { VIEW.rs = rs; SPR = buildSprites(rs); }
  document.documentElement.style.setProperty('--field-b', Math.max(0, ch - (VIEW.oy + H * s)) + 'px');
  document.documentElement.style.setProperty('--field-l', VIEW.ox + 'px');
  document.documentElement.style.setProperty('--field-w', (W * s) + 'px');
}

/* ---------- sprites ---------- */
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function buildSprites(rs) {
  const out = { b: [{}, {}], warn: {}, glow: [], dust: null, bit: null };
  const kinds = { small: 3.2, orb: 4.6, big: 8.5 };
  for (let pol = 0; pol < 2; pol++) {
    const c = PCOL[pol];
    for (const k in kinds) {
      const r = kinds[k], g = r * 2.1, size = (g * 2 + 2) * rs;
      const cn = mkCanvas(size, size), x = cn.getContext('2d');
      x.scale(rs, rs); const m = g + 1;
      const gr = x.createRadialGradient(m, m, r * 0.5, m, m, g);
      gr.addColorStop(0, 'rgba(' + c.rgb + ',0.55)'); gr.addColorStop(1, 'rgba(' + c.rgb + ',0)');
      x.fillStyle = gr; x.beginPath(); x.arc(m, m, g, 0, TAU); x.fill();
      if (pol === SOL) {
        x.fillStyle = c.main; x.beginPath(); x.arc(m, m, r, 0, TAU); x.fill();
        x.fillStyle = c.core; x.beginPath(); x.arc(m, m, r * 0.62, 0, TAU); x.fill();
      } else {
        x.fillStyle = c.core; x.beginPath(); x.arc(m, m, r, 0, TAU); x.fill();
        x.strokeStyle = c.main; x.lineWidth = Math.max(1.2, r * 0.36); x.beginPath(); x.arc(m, m, r - x.lineWidth / 2, 0, TAU); x.stroke();
        x.fillStyle = 'rgba(180,240,255,0.8)'; x.beginPath(); x.arc(m - r * 0.3, m - r * 0.3, r * 0.18, 0, TAU); x.fill();
      }
      out.b[pol][k] = { c: cn, h: m };
    }
    // rice: oriented along +x
    {
      const L = 7, R = 3.2, gl = 5, w = (L + gl) * 2 + 2, h = (R + gl) * 2 + 2;
      const cn = mkCanvas(w * rs, h * rs), x = cn.getContext('2d'); x.scale(rs, rs);
      const mx = w / 2, my = h / 2;
      x.fillStyle = 'rgba(' + c.rgb + ',0.32)'; x.beginPath(); x.ellipse(mx, my, L + gl, R + gl * 0.8, 0, 0, TAU); x.fill();
      if (pol === SOL) {
        x.fillStyle = c.main; x.beginPath(); x.ellipse(mx, my, L, R, 0, 0, TAU); x.fill();
        x.fillStyle = c.core; x.beginPath(); x.ellipse(mx, my, L * 0.6, R * 0.5, 0, 0, TAU); x.fill();
      } else {
        x.fillStyle = c.core; x.beginPath(); x.ellipse(mx, my, L, R, 0, 0, TAU); x.fill();
        x.strokeStyle = c.main; x.lineWidth = 1.3; x.beginPath(); x.ellipse(mx, my, L - 0.6, R - 0.6, 0, 0, TAU); x.stroke();
      }
      out.b[pol].rice = { c: cn, hx: mx, hy: my };
    }
    // generic glow
    {
      const s = 64, cn = mkCanvas(s * rs, s * rs), x = cn.getContext('2d'); x.scale(rs, rs);
      const gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(' + c.rgb + ',0.9)'); gr.addColorStop(0.3, 'rgba(' + c.rgb + ',0.35)'); gr.addColorStop(1, 'rgba(' + c.rgb + ',0)');
      x.fillStyle = gr; x.fillRect(0, 0, s, s);
      out.glow[pol] = cn;
    }
  }
  for (const k in kinds) {
    const r = kinds[k] + 2.5, size = (r * 2 + 4) * rs, cn = mkCanvas(size, size), x = cn.getContext('2d');
    x.scale(rs, rs); x.strokeStyle = '#ffffff'; x.lineWidth = 1.6; x.beginPath(); x.arc(r + 2, r + 2, r, 0, TAU); x.stroke();
    out.warn[k] = { c: cn, h: r + 2 };
  }
  {
    const s = 14, cn = mkCanvas(s * rs, s * rs), x = cn.getContext('2d'); x.scale(rs, rs);
    const gr = x.createRadialGradient(7, 7, 0, 7, 7, 7); gr.addColorStop(0, 'rgba(200,240,255,1)'); gr.addColorStop(1, 'rgba(120,200,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, s, s);
    x.fillStyle = '#fff'; x.beginPath(); x.moveTo(7, 1); x.lineTo(8, 6); x.lineTo(13, 7); x.lineTo(8, 8); x.lineTo(7, 13); x.lineTo(6, 8); x.lineTo(1, 7); x.lineTo(6, 6); x.closePath(); x.fill();
    out.dust = cn;
  }
  {
    const s = 8, cn = mkCanvas(s * rs, s * rs), x = cn.getContext('2d'); x.scale(rs, rs);
    x.fillStyle = '#ffe6a0'; x.beginPath(); x.moveTo(4, 0.5); x.lineTo(7.5, 4); x.lineTo(4, 7.5); x.lineTo(0.5, 4); x.closePath(); x.fill();
    out.bit = cn;
  }
  return out;
}

/* ---------- background ---------- */
const BG = { theme: null, neb: null, nebY: 0, stars: [], t: 0, key: '' };
const TITLE_THEME = { a: '#08060f', b: '#1a0e26', n1: '255,150,70', n2: '80,170,255', star: '230,230,255' };
function setBgTheme(theme, key) {
  if (BG.key === key) return;
  BG.key = key; BG.theme = theme;
  const r = mulberry32(key.length * 977 + key.charCodeAt(0));
  const c = mkCanvas(W, H * 2), x = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const px = r() * W, py = r() * H * 2, rad = 40 + r() * 140, col = r() < 0.5 ? theme.n1 : theme.n2;
    const al = 0.05 + r() * 0.08;
    for (const oy of [-H * 2, 0, H * 2]) { // wrap vertically so the scrolling tile has no seam
      const cy = py + oy;
      if (cy + rad < 0 || cy - rad > H * 2) continue;
      const gr = x.createRadialGradient(px, cy, 0, px, cy, rad);
      gr.addColorStop(0, 'rgba(' + col + ',' + al + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
      x.fillStyle = gr; x.fillRect(px - rad, cy - rad, rad * 2, rad * 2);
    }
  }
  BG.neb = c;
  BG.stars = [];
  for (let i = 0; i < 110; i++) BG.stars.push({ x: r() * W, y: r() * H, l: i % 3, s: 0.6 + r() * 1.2, tw: r() * TAU });
}
function drawBackground(dt, speedMul) {
  const th = BG.theme; if (!th) return;
  BG.t += dt;
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, th.a); gr.addColorStop(1, th.b);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  const sm = speedMul == null ? 1 : speedMul;
  BG.nebY = (BG.nebY + dt * 14 * sm) % (H * 2);
  ctx.drawImage(BG.neb, 0, BG.nebY - H * 2, W, H * 2);
  ctx.drawImage(BG.neb, 0, BG.nebY, W, H * 2);
  drawBgFeature(th);
  const spd = [18, 45, 110];
  for (const s of BG.stars) {
    s.y += spd[s.l] * dt * sm; if (s.y > H) { s.y -= H; s.x = Math.random() * W; }
    const a = s.l === 2 ? 0.85 : 0.35 + 0.3 * Math.sin(BG.t * 2 + s.tw);
    ctx.fillStyle = 'rgba(' + th.star + ',' + a + ')';
    if (s.l === 2 && sm > 0.5) ctx.fillRect(s.x, s.y, 1, 4 + s.s * 2);
    else ctx.fillRect(s.x, s.y, s.s, s.s);
  }
}
function drawBgFeature(th) {
  const n = G.st && G.state !== 'title' ? G.st.idx + 1 : 0, t = BG.t;
  ctx.save();
  if (n === 1) { // rising sun glow
    const gr = ctx.createRadialGradient(W / 2, H + 60, 20, W / 2, H + 60, 340);
    gr.addColorStop(0, 'rgba(255,170,90,0.35)'); gr.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  } else if (n === 2) { // cloud bands
    ctx.globalAlpha = 0.07; ctx.fillStyle = '#dff3ff';
    for (let i = 0; i < 6; i++) {
      const y = ((t * 70 + i * 140) % (H + 200)) - 100;
      for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.ellipse((i * 97 + j * 83) % W, y + (j % 2) * 18, 60, 18, 0, 0, TAU); ctx.fill(); }
    }
  } else if (n === 3) { // city lights
    for (let i = 0; i < 14; i++) {
      const x = (i * 29) % W + 6, y0 = ((t * 60 + i * 97) % (H + 160)) - 80;
      ctx.fillStyle = 'rgba(255,120,170,0.10)'; ctx.fillRect(x, y0, 16, 70 + (i % 4) * 25);
      ctx.fillStyle = 'rgba(255,200,230,0.35)';
      for (let k = 0; k < 6; k++) ctx.fillRect(x + 3 + (k % 2) * 7, y0 + 6 + k * 11, 2, 2);
    }
  } else if (n === 4) { // abyss rings
    ctx.strokeStyle = 'rgba(80,255,210,0.07)'; ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const r = ((t * 40 + i * 70) % 490);
      ctx.beginPath(); ctx.ellipse(W / 2, H * 0.45, r, r * 0.45, 0, 0, TAU); ctx.stroke();
    }
  } else if (n === 5) { // black sun
    const cx = W / 2, cy = 120, R = 88;
    const gr = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 2.4);
    gr.addColorStop(0, 'rgba(255,140,60,0.45)'); gr.addColorStop(1, 'rgba(255,80,30,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#050102'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,140,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, TAU); ctx.stroke();
  } else { // title eclipse
    const cx = W / 2, cy = H * 0.3, R = 70 + Math.sin(t * 0.6) * 2;
    const gr = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 2.6);
    gr.addColorStop(0, 'rgba(255,170,80,0.5)'); gr.addColorStop(0.5, 'rgba(120,120,255,0.12)'); gr.addColorStop(1, 'rgba(80,120,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * TAU + t * 0.05, l = R + 10 + 30 * (0.5 + 0.5 * Math.sin(i * 3.7 + t * 1.3));
      ctx.strokeStyle = i % 2 ? 'rgba(255,180,90,0.18)' : 'rgba(110,190,255,0.14)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#05040a'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,190,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R, -0.6, 1.2); ctx.stroke();
  }
  ctx.restore();
}

/* ---------- entities ---------- */
function polFill(pol, flash) { return pol ? (flash ? '#33489a' : '#0f1a4c') : (flash ? '#fff4d8' : '#ffd27e'); }
function polEdge(pol) { return pol ? '#62d6ff' : '#fff7e2'; }
function polCore(pol) { return pol ? '#7fe0ff' : '#ff8a2e'; }
function drawGlow(pol, x, y, r, a) {
  ctx.globalAlpha = a; ctx.drawImage(SPR.glow[pol], x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
}
function poly(pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }
function drawEnemy(e) {
  const pol = e.pol, fl = e.flash > 0;
  drawGlow(pol, e.x, e.y, e.r * 2.4, 0.35);
  ctx.save(); ctx.translate(e.x, e.y);
  ctx.fillStyle = polFill(pol, fl); ctx.strokeStyle = polEdge(pol); ctx.lineWidth = 1.4;
  const t = e.t;
  switch (e.type) {
    case 'dart': {
      const a = Math.atan2(e.vy || 1, e.vx || 0) - Math.PI / 2; ctx.rotate(a);
      poly([0, 11, -9, -7, 0, -2, 9, -7]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = polCore(pol); ctx.fillRect(-1.5, -1, 3, 5);
      break;
    }
    case 'swirl': {
      ctx.rotate(t * 4);
      for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); poly([0, -3, 10, -10, 6, 1]); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fillStyle = polCore(pol); ctx.fill();
      break;
    }
    case 'mine': {
      ctx.rotate(t * 2); const s = 1 + Math.sin(t * 8) * 0.08; ctx.scale(s, s);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) { const r = i % 2 ? 5 : 10, a = i / 16 * TAU; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = (Math.sin(t * 10) > 0) ? '#ff3355' : polCore(pol); ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, TAU); ctx.fill();
      break;
    }
    case 'lancer': {
      ctx.rotate((e.ang || Math.PI / 2) - Math.PI / 2);
      poly([0, 16, -7, -2, -4, -12, 4, -12, 7, -2]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = polCore(pol); poly([0, 9, -2.5, 0, 2.5, 0]); ctx.fill();
      break;
    }
    case 'turret': {
      poly([-15, -6, -8, -14, 8, -14, 15, -6, 15, 6, 8, 14, -8, 14, -15, 6]); ctx.fill(); ctx.stroke();
      ctx.rotate(e.ang || 0);
      ctx.fillStyle = polCore(pol);
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillRect(-1.5, 5, 3, 7); }
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
      break;
    }
    case 'heavy': {
      poly([0, 24, -14, 14, -26, 2, -22, -14, -8, -20, 8, -20, 22, -14, 26, 2, 14, 14]); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = polCore(pol); ctx.beginPath(); ctx.moveTo(-18, -6); ctx.lineTo(18, -6); ctx.stroke();
      ctx.fillStyle = polCore(pol); ctx.beginPath(); ctx.arc(0, 4, 7 + Math.sin(t * 6), 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 4, 3, 0, TAU); ctx.fill();
      break;
    }
    case 'carrier': {
      poly([-30, -10, -20, -20, 20, -20, 30, -10, 30, 10, 18, 22, -18, 22, -30, 10]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = polCore(pol);
      for (let i = 0; i < 4; i++) ctx.fillRect(-21 + i * 12, 12, 6, 4 + (Math.sin(t * 6 + i) > 0 ? 3 : 0));
      ctx.beginPath(); ctx.arc(0, -4, 6, 0, TAU); ctx.fill();
      break;
    }
    case 'spinner': {
      ctx.rotate(t * 3);
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); poly([0, 0, 5, -6, 18, 0, 5, 6]); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = PCOL[1].main; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI); ctx.fill();
      break;
    }
    case 'twin': {
      ctx.beginPath(); ctx.arc(-6, 0, 8, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(6, 0, 8, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = polCore(pol); ctx.fillRect(-7, 4, 2, 6); ctx.fillRect(5, 4, 2, 6);
      break;
    }
    case 'arm': {
      ctx.rotate(t * -3);
      ctx.beginPath();
      for (let i = 0; i < 12; i++) { const r = i % 2 ? 9 : 15, a = i / 12 * TAU; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = polCore(pol); ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, TAU); ctx.fill();
      break;
    }
  }
  ctx.restore();
  if (e.maxhp >= 30 && e.hp < e.maxhp && !e.isBoss) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x - 14, e.y + e.r + 5, 28, 3);
    ctx.fillStyle = PCOL[pol].main; ctx.fillRect(e.x - 14, e.y + e.r + 5, 28 * Math.max(0, e.hp / e.maxhp), 3);
  }
}
function drawBoss(b) {
  const pol = b.pol, fl = b.flash > 0 && b.bossState === 'fight', t = b.t;
  const invis = b.bossState !== 'fight' && b.bossState !== 'dying';
  drawGlow(pol, b.x, b.y, b.r * 3.4, 0.5);
  ctx.save(); ctx.translate(b.x, b.y);
  if (invis) ctx.globalAlpha = 0.65 + 0.35 * Math.sin(t * 20);
  ctx.lineWidth = 1.6;
  const fill = polFill(pol, fl), edge = polEdge(pol), core = polCore(pol);
  switch (b.def.look) {
    case 'gemini': {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-48, 0); ctx.lineTo(48, 0); ctx.stroke();
      [[-48, SOL], [48, LUNA]].forEach(([ox, p]) => {
        ctx.fillStyle = polFill(p, fl); ctx.strokeStyle = polEdge(p); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(ox, 0, 15, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.translate(ox, 0); ctx.rotate(t * (p ? -2 : 2));
        ctx.strokeStyle = polCore(p); ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 0.7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 21, Math.PI, Math.PI * 1.7); ctx.stroke();
        ctx.restore();
      });
      ctx.fillStyle = fill; ctx.strokeStyle = edge;
      poly([0, -26, 22, -8, 16, 18, -16, 18, -22, -8]); ctx.fill(); ctx.stroke();
      break;
    }
    case 'helix': {
      for (let i = 0; i < 14; i++) {
        const y = -40 + i * 6, ph = t * 4 + i * 0.6;
        for (let s = 0; s < 2; s++) {
          const x = Math.sin(ph + s * Math.PI) * 38, z = Math.cos(ph + s * Math.PI);
          ctx.fillStyle = s ? PCOL[1].main : PCOL[0].main; ctx.globalAlpha = (invis ? 0.6 : 1) * (0.45 + 0.4 * z);
          ctx.beginPath(); ctx.arc(x, y + 20, 3.5, 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = invis ? 0.8 : 1;
      ctx.fillStyle = fill; ctx.strokeStyle = edge;
      poly([0, -30, 26, -14, 26, 14, 0, 30, -26, 14, -26, -14]); ctx.fill(); ctx.stroke();
      break;
    }
    case 'obelisk': {
      ctx.fillStyle = fill; ctx.strokeStyle = edge;
      poly([0, -62, 26, -10, 18, 48, 0, 60, -18, 48, -26, -10]); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = core; ctx.globalAlpha = 0.7;
      for (let i = 0; i < 4; i++) { const y = -36 + i * 22 + (t * 30 % 22); ctx.beginPath(); ctx.moveTo(-14, y); ctx.lineTo(14, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      [-90, -40, 40, 90].forEach((ox, i) => { ctx.fillStyle = PCOL[i % 2].main; ctx.beginPath(); ctx.arc(ox, 24, 5, 0, TAU); ctx.fill(); });
      if (b.splitWarn) { ctx.restore(); ctx.save(); ctx.fillStyle = 'rgba(255,255,255,' + (0.08 + 0.08 * Math.sin(t * 30)) + ')'; ctx.fillRect(W / 2 - 1, 0, 2, H); }
      break;
    }
    case 'asura': {
      ctx.rotate(Math.sin(t) * 0.1);
      ctx.fillStyle = fill; ctx.strokeStyle = edge;
      ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30); } ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = core; ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.setLineDash([6, 6]); ctx.lineDashOffset = t * 30; ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = core; ctx.fillRect(-14, -8, 8, 4); ctx.fillRect(6, -8, 8, 4);
      break;
    }
    case 'eclipse': {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 40; i++) {
        const a = i / 40 * TAU + t * 0.3, l = 44 + 22 * (0.5 + 0.5 * Math.sin(i * 2.3 + t * 3));
        ctx.strokeStyle = 'rgba(' + PCOL[(i + (pol)) % 2].rgb + ',0.45)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 38, Math.sin(a) * 38); ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = fl ? '#2c1822' : '#030104'; ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.stroke();
      break;
    }
  }
  if (b.def.look !== 'eclipse') {
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 2, 8 + Math.sin(t * 5) * 1.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 2, 3.5, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = core; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4); ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function drawPlayer() {
  if (!P.alive) return;
  if (P.inv > 0 && Math.floor(P.inv * 16) % 2 === 0 && P.inv < 2.4) ctx.globalAlpha = 0.45;
  const c = PCOL[P.pol];
  // absorb field
  ctx.strokeStyle = 'rgba(' + c.rgb + ',' + (0.18 + P.absorbFx * 0.5) + ')';
  ctx.lineWidth = 1 + P.absorbFx * 1.5;
  ctx.beginPath(); ctx.arc(P.x, P.y, P.absorbR + 2 + P.swFx * 30, 0, TAU); ctx.stroke();
  drawGlow(P.pol, P.x, P.y + 4, 26 + P.absorbFx * 10, 0.55);
  if (P.ship.id === 'orbit') {
    P.opts.forEach(o => { drawGlow(P.pol, o.x, o.y, 12, 0.6); ctx.fillStyle = c.main; ctx.beginPath(); ctx.arc(o.x, o.y, 4, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); });
  }
  ctx.save(); ctx.translate(P.x, P.y);
  const bank = clamp(P.bank, -1, 1);
  ctx.scale(1 - Math.abs(bank) * 0.25, 1);
  // flame
  const fl = 6 + Math.random() * 5;
  ctx.fillStyle = 'rgba(' + c.rgb + ',0.8)'; poly([-3, 9, 0, 9 + fl, 3, 9]); ctx.fill();
  const body = P.pol ? '#132063' : '#fff3d6', edge = P.pol ? '#78e0ff' : '#ffffff', acc = P.pol ? '#62d6ff' : '#ffa53a';
  ctx.fillStyle = body; ctx.strokeStyle = edge; ctx.lineWidth = 1.3;
  if (P.ship.id === 'lance') poly([0, -17, 4, -6, 6, 6, 13, 10, 4, 10, 0, 7, -4, 10, -13, 10, -6, 6, -4, -6]);
  else if (P.ship.id === 'orbit') poly([0, -13, 5, -3, 12, 2, 11, 9, 3, 7, 0, 10, -3, 7, -11, 9, -12, 2, -5, -3]);
  else poly([0, -15, 5, -4, 14, 8, 5, 6, 0, 10, -5, 6, -14, 8, -5, -4]);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = acc; poly([0, -9, 2.5, -1, 0, 2, -2.5, -1]); ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
  // hitbox
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = P.pol ? '#62d6ff' : '#ff8a2e'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(P.x, P.y, P.focus ? 3.2 : 2.4, 0, TAU); ctx.fill(); ctx.stroke();
}
function drawBullets() {
  const arr = G.bullets, S = SPR.b;
  for (let i = 0; i < arr.length; i++) {
    const b = arr[i];
    const warn = (b.flipAt && b.flipAt - b.t < 0.3) || b.flipped > 0;
    if (b.kind === 'rice') {
      const s = S[b.pol].rice;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.ang);
      ctx.drawImage(s.c, -s.hx, -s.hy, s.hx * 2, s.hy * 2);
      ctx.restore();
    } else {
      const s = S[b.pol][b.kind];
      ctx.drawImage(s.c, b.x - s.h, b.y - s.h, s.h * 2, s.h * 2);
    }
    if (warn) {
      const w = SPR.warn[b.kind === 'rice' ? 'orb' : b.kind];
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(b.t * 50);
      ctx.drawImage(w.c, b.x - w.h, b.y - w.h, w.h * 2, w.h * 2);
      ctx.globalAlpha = 1;
    }
  }
}
function drawShots() {
  ctx.globalCompositeOperation = 'lighter';
  for (const s of G.pshots) {
    const c = PCOL[s.pol];
    ctx.strokeStyle = s.pol ? 'rgba(110,210,255,0.9)' : 'rgba(255,215,140,0.9)'; ctx.lineWidth = s.w;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.016, s.y - s.vy * 0.016); ctx.stroke();
  }
  for (const l of G.lasers) {
    if (l.t < 0 || l.trail.length < 4) continue;
    const c = PCOL[l.pol];
    ctx.strokeStyle = 'rgba(' + c.rgb + ',0.55)'; ctx.lineWidth = l.swarm ? 3 : 5;
    ctx.beginPath(); ctx.moveTo(l.trail[0], l.trail[1]);
    for (let i = 2; i < l.trail.length; i += 2) ctx.lineTo(l.trail[i], l.trail[i + 1]);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = l.swarm ? 1.2 : 2; ctx.stroke();
  }
  if (G.beam && G.beam.cw) {
    const b = G.beam, c = PCOL[b.pol], hw = b.cw;
    const gr = ctx.createLinearGradient(P.x - hw * 1.6, 0, P.x + hw * 1.6, 0);
    gr.addColorStop(0, 'rgba(' + c.rgb + ',0)'); gr.addColorStop(0.3, 'rgba(' + c.rgb + ',0.5)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.7, 'rgba(' + c.rgb + ',0.5)'); gr.addColorStop(1, 'rgba(' + c.rgb + ',0)');
    ctx.fillStyle = gr; ctx.fillRect(P.x - hw * 1.6, 0, hw * 3.2, P.y - 8);
    drawGlow(b.pol, P.x, P.y - 12, hw * 2, 0.9);
  }
  ctx.globalCompositeOperation = 'source-over';
}
function drawParts() {
  ctx.globalCompositeOperation = 'lighter';
  for (const p of G.parts) {
    const k = 1 - p.t / p.life;
    if (p.kind === 'ring') {
      ctx.strokeStyle = 'rgba(' + p.rgb + ',' + k * 0.8 + ')'; ctx.lineWidth = 2 * k + 0.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - k * k * 0.9), 0, TAU); ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(' + p.rgb + ',' + k + ')';
      const s = p.size * (0.4 + k * 0.6);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const p of G.pick) {
    if (p.kind === 'dust') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 3); ctx.drawImage(SPR.dust, -7, -7, 14, 14); ctx.restore(); }
    else ctx.drawImage(SPR.bit, p.x - 4, p.y - 4, 8, 8);
  }
}
function drawText(txt, x, y, size, col, align, font, alpha) {
  ctx.font = size + 'px ' + (font || FONT_LBL);
  ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
  if (alpha != null) ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(txt, x + 1, y + 1);
  ctx.fillStyle = col; ctx.fillText(txt, x, y);
  ctx.globalAlpha = 1;
}
function drawFloats() {
  for (const f of G.floats) {
    const a = f.t < 0.1 ? f.t / 0.1 : 1 - Math.max(0, (f.t - f.life * 0.6) / (f.life * 0.4));
    drawText(f.txt, f.x, f.y, f.size, f.col, 'center', FONT_NUM, a);
  }
}

/* ---------- HUD ---------- */
function drawHUD() {
  const R = G.run, st = G.st;
  // score
  drawText(fmt(R.score), 10, 16, 17, '#ffffff', 'left', FONT_NUM);
  const hi = Math.max(R.score, (SAVE.best[R.diffId][0] || { score: 0 }).score);
  drawText('HI ' + fmt(R.mode === 'story' ? hi : R.score), 10, 33, 10, 'rgba(220,220,255,0.6)', 'left', FONT_NUM);
  drawText((R.mode === 'rush' ? 'RUSH ' : 'STAGE ') + (st.idx + 1) + '  ' + st.def.jp, W - 10, 16, 10, 'rgba(255,255,255,0.75)', 'right', FONT_JP);
  drawText(R.diff.name + (R.mode === 'practice' ? ' · PRACTICE' : ''), W - 10, 31, 8, 'rgba(255,255,255,0.45)', 'right');
  // chain
  const C = G.chain;
  const cy = 52;
  for (let i = 0; i < 3; i++) {
    const p = C.buf[i];
    ctx.beginPath(); ctx.arc(16 + i * 12, cy, 4, 0, TAU);
    if (p != null) { ctx.fillStyle = PCOL[p].main; ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke();
  }
  if (C.n > 0) {
    const s = 1 + C.flash * 0.4;
    drawText(C.n + ' CHAIN', 54, cy, Math.round(12 * s), C.flash > 0 ? '#ffffff' : '#ffe9a8', 'left', FONT_NUM);
  }
  // boss bar
  const b = st.boss;
  if (b && !b.dead && st.phase === 'boss' && b.bossState !== 'enter') {
    const ph = b.def.phases[b.ph] || b.def.phases[b.def.phases.length - 1];
    const y = 70;
    drawText(b.def.jp + '  ' + b.def.name, 10, y, 9, '#ffffff', 'left', FONT_JP);
    for (let i = 0; i < b.def.phases.length; i++) {
      ctx.fillStyle = i < b.ph ? 'rgba(255,255,255,0.15)' : i === b.ph ? '#ffffff' : 'rgba(255,255,255,0.6)';
      ctx.fillRect(W - 14 - (b.def.phases.length - 1 - i) * 9, y - 3, 6, 6);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(10, y + 8, W - 20, 5);
    if (ph.survival) {
      const k = clamp(1 - b.phT / ph.time, 0, 1);
      ctx.fillStyle = '#ff6060'; ctx.fillRect(10, y + 8, (W - 20) * k, 5);
    } else {
      ctx.fillStyle = PCOL[b.pol].main; ctx.fillRect(10, y + 8, (W - 20) * clamp(b.hp / b.maxhp, 0, 1), 5);
    }
    if (b.bossState === 'fight') {
      const left = Math.max(0, ph.time - b.phT);
      drawText(left.toFixed(1), W - 10, y + 22, 11, left < 6 ? '#ff8080' : 'rgba(255,255,255,0.8)', 'right', FONT_NUM);
    }
  }
  if (G.phaseBanner) {
    const pb = G.phaseBanner;
    if (pb.t > 3) G.phaseBanner = null;
    else {
      const a = Math.min(1, pb.t * 3) * Math.min(1, (3 - pb.t) * 2);
      const x = W - 10 - (1 - Math.min(1, pb.t * 3)) * 40;
      drawText(pb.txt, x, 104, 12, pb.survival ? '#ff9a9a' : '#fff2c8', 'right', FONT_JP, a);
      if (pb.survival) drawText('— 生き残れ —', x, 120, 9, '#ff9a9a', 'right', FONT_JP, a);
    }
  }
  // lives
  for (let i = 0; i < Math.min(P.lives, 8); i++) {
    const x = 14 + i * 13, y = H - 46;
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; poly([x, y - 5, x + 4, y + 4, x, y + 2, x - 4, y + 4]); ctx.fill();
  }
  // energy gauge
  const gx = 10, gy = H - 18, gw = W - 20 - 64, seg = P.emax / 10;
  const c = PCOL[P.pol];
  for (let i = 0; i < seg; i++) {
    const sx = gx + i * gw / seg, sw = gw / seg - 2;
    const fill = clamp((P.energy - i * 10) / 10, 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(sx, gy, sw, 7);
    if (fill > 0) { ctx.fillStyle = fill >= 1 ? c.main : 'rgba(' + c.rgb + ',0.5)'; ctx.fillRect(sx, gy, sw * fill, 7); }
  }
  const full = P.energy >= P.emax;
  const lbl = P.energy >= 10 ? (full ? 'FULL BURST' : 'BURST ×' + Math.floor(P.energy / 10)) : 'ENERGY';
  drawText(lbl, gx, gy - 9, 8, full ? (Math.sin(G.run.time * 10) > 0 ? '#ffffff' : c.main) : 'rgba(255,255,255,0.6)', 'left');
  // polarity badge
  const bx = W - 34, by = H - 24;
  drawGlow(P.pol, bx, by, 26, 0.7);
  ctx.fillStyle = P.pol ? PCOL[1].core : PCOL[0].main; ctx.strokeStyle = P.pol ? PCOL[1].main : '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(bx, by, 11, 0, TAU); ctx.fill(); ctx.stroke();
  if (P.pol) { ctx.fillStyle = PCOL[1].main; ctx.beginPath(); ctx.arc(bx + 3, by - 2, 7, 0, TAU); ctx.fill(); ctx.fillStyle = PCOL[1].core; ctx.beginPath(); ctx.arc(bx + 6, by - 4, 6, 0, TAU); ctx.fill(); }
  drawText(POLNAME[P.pol], bx, by + 18, 7, c.main, 'center');
}
function drawBanners() {
  const bn = G.banner;
  if (bn && bn.kind === 'stage') {
    const t = bn.t, a = Math.min(1, t * 2) * Math.min(1, (bn.life - t) * 2);
    const def = bn.def;
    ctx.fillStyle = 'rgba(0,0,0,' + 0.35 * a + ')'; ctx.fillRect(0, H * 0.38, W, 120);
    drawText(bn.rush ? 'BOSS RUSH  ' + (def.n) + ' / 5' : 'STAGE ' + def.n, W / 2, H * 0.38 + 26, 12, 'rgba(255,255,255,0.8)', 'center', FONT_LBL, a);
    drawText(def.jp, W / 2, H * 0.38 + 60, 34, '#ffffff', 'center', FONT_JP, a);
    drawText(def.name + '  —  ' + def.sub, W / 2, H * 0.38 + 96, 9, 'rgba(255,230,200,0.8)', 'center', FONT_JP, a);
  } else if (bn && bn.kind === 'warn') {
    const t = bn.t, a = Math.min(1, t * 3) * Math.min(1, (bn.life - t) * 3);
    const y = H * 0.4;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(120,0,20,0.45)'; ctx.fillRect(0, y - 30, W, 60);
    ctx.fillStyle = 'rgba(255,60,80,0.8)';
    for (let i = -2; i < 14; i++) { const x = i * 30 + (t * 60 % 30); poly([x, y - 30, x + 14, y - 30, x + 4, y - 22, x - 10, y - 22]); ctx.fill(); poly([x, y + 22, x + 14, y + 22, x + 4, y + 30, x - 10, y + 30]); ctx.fill(); }
    ctx.globalAlpha = 1;
    drawText('WARNING', W / 2, y - 4, 26, Math.sin(t * 14) > 0 ? '#ffffff' : '#ff6070', 'center', FONT_LBL, a);
    drawText(bn.boss.jp + '  ' + bn.boss.name + ' 接近', W / 2, y + 15, 10, '#ffd0d0', 'center', FONT_JP, a);
  }
  if (G.tally) drawTally();
  if (G.worldFlip > 0) {
    const a = G.worldFlip;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 + 0.5 * Math.sin(G.run.time * 40)) * a + ')';
    ctx.lineWidth = 8 * a; ctx.strokeRect(4, 4, W - 8, H - 8);
    drawText('POLARITY FLIP', W / 2, H * 0.5, 12, '#ffffff', 'center', FONT_LBL, a);
  }
  if (G.flash > 0) { ctx.fillStyle = 'rgba(' + G.flashCol + ',' + Math.min(0.5, G.flash) + ')'; ctx.fillRect(0, 0, W, H); }
  if (G.st && G.st.gameOverT > 0) {
    const a = clamp((2.2 - G.st.gameOverT) * 1.5, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,' + a * 0.5 + ')'; ctx.fillRect(0, 0, W, H);
    drawText('GAME OVER', W / 2, H * 0.45, 26, '#ffffff', 'center', FONT_LBL, a);
  }
}
function drawTally() {
  const T = G.tally, t = T.t;
  const a = Math.min(1, t * 3);
  ctx.fillStyle = 'rgba(5,4,14,' + 0.72 * a + ')'; ctx.fillRect(0, H * 0.22, W, H * 0.5);
  const y0 = H * 0.22 + 30;
  if (T.rush) {
    drawText('BOSS ' + T.def.n + ' DEFEATED', W / 2, y0 + 40, 16, '#ffffff', 'center', FONT_LBL, a);
    drawText('+' + fmt(T.clearB + T.missB), W / 2, y0 + 80, 16, '#ffe9a8', 'center', FONT_NUM, a);
    return;
  }
  drawText('STAGE ' + T.def.n + ' CLEAR', W / 2, y0, 15, '#ffffff', 'center', FONT_LBL, a);
  const rows = [
    ['撃墜率', Math.round(T.killRate * 100) + '%', '+' + fmt(T.killB)],
    ['チェイン率', Math.round(T.chainRate * 100) + '%', ''],
    ['ノーミス', T.noMiss ? 'YES' : '—', T.missB ? '+' + fmt(T.missB) : ''],
    ['クリアボーナス', '', '+' + fmt(T.clearB)]
  ];
  rows.forEach((r, i) => {
    const ra = clamp((t - 0.3 - i * 0.25) * 4, 0, 1);
    const y = y0 + 40 + i * 26;
    drawText(r[0], 40, y, 11, 'rgba(255,255,255,0.8)', 'left', FONT_JP, ra);
    drawText(r[1], 200, y, 12, '#ffffff', 'right', FONT_NUM, ra);
    drawText(r[2], W - 40, y, 12, '#ffe9a8', 'right', FONT_NUM, ra);
  });
  const ra = clamp((t - 1.6) * 3, 0, 1);
  if (ra > 0) {
    drawText('RANK', W / 2 - 40, y0 + 168, 11, 'rgba(255,255,255,0.7)', 'center', FONT_LBL, ra);
    const s = 1 + (1 - ra) * 1.5;
    drawText(T.rank, W / 2 + 30, y0 + 168, Math.round(44 * s), RANK_COL[T.rank], 'center', FONT_LBL, ra);
  }
  if (t > 1.8) drawText(IN.touchMode ? 'タップで次へ' : 'Z / SPACE で次へ', W / 2, y0 + 222, 9, 'rgba(255,255,255,' + (0.4 + 0.3 * Math.sin(t * 5)) + ')', 'center', FONT_JP);
}

function render(dt) {
  const v = VIEW;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#030208'; ctx.fillRect(0, 0, cv.width, cv.height);
  let sx = 0, sy = 0;
  if (G.shake > 0) { sx = rand(-G.shake, G.shake) * 0.35; sy = rand(-G.shake, G.shake) * 0.35; }
  const k = v.dpr * v.scale;
  ctx.setTransform(k, 0, 0, k, v.dpr * (v.ox + sx * v.scale), v.dpr * (v.oy + sy * v.scale));
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  const playing = G.run && (G.state === 'play' || G.state === 'paused' || G.state === 'result');
  if (playing) setBgTheme(G.st.def.bg, 'st' + G.st.idx); else setBgTheme(TITLE_THEME, 'title');
  drawBackground(G.state === 'paused' ? 0 : dt, playing ? 1 : 0.25);
  if (playing) {
    drawParts();
    for (const e of G.enemies) if (!e.isBoss) drawEnemy(e);
    for (const e of G.enemies) if (e.isBoss) drawBoss(e);
    drawShots();
    drawPlayer();
    drawBullets();
    drawFloats();
    drawBanners();
    if (G.state !== 'result') drawHUD();
  }
  ctx.restore();
  // frame edge
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1 / v.scale;
  ctx.strokeRect(0, 0, W, H);
}
ED.render = render; ED.resize = resize; ED.VIEW = VIEW;
