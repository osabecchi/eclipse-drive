'use strict';
/* ECLIPSE DRIVE — DOM menus */
const $ = id => document.getElementById(id);
const UI = { cur: 'title', stack: [], sortie: { mode: 'story', ship: SAVE.ship, diff: SAVE.diff, stage: 0 }, lastRun: null };

function showScr(id, push) {
  document.querySelectorAll('.scr').forEach(s => { s.hidden = s.id !== 'scr-' + id; });
  if (push && UI.cur !== id) UI.stack.push(UI.cur);
  UI.cur = id;
  const f = document.querySelector('#scr-' + id + ' .mbtn.primary') || document.querySelector('#scr-' + id + ' .mbtn');
  if (f && !IN.touchMode) setTimeout(() => f.focus({ preventScroll: true }), 0);
}
function hideAll() { document.querySelectorAll('.scr').forEach(s => { s.hidden = true; }); UI.cur = null; UI.stack = []; }
function back() {
  AU.sfx('ui');
  const prev = UI.stack.pop() || 'title';
  if (prev === 'title') openTitle(); else showScr(prev);
}
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', back));

function openTitle() {
  G.state = 'title'; G.run = null;
  UI.stack = [];
  $('tDust').textContent = fmt(SAVE.dust);
  const best = Math.max(0, ...DIFF_ORDER.map(d => (SAVE.best[d][0] || { score: 0 }).score));
  $('tBest').textContent = fmt(best);
  const rushOk = SAVE.clear.normal;
  $('bRush').disabled = !rushOk;
  $('rushTag').textContent = rushOk ? 'BOSS RUSH' : 'NORMAL クリアで解放';
  showScr('title');
  setTouch(false);
  AU.play('title');
}

/* ---------- ship icon canvas ---------- */
function shipIcon(id, pol) {
  const c = document.createElement('canvas'); const s = 2; c.width = 54 * s; c.height = 54 * s;
  const x = c.getContext('2d'); x.scale(s, s); x.translate(27, 29); x.scale(1.6, 1.6);
  const g = x.createRadialGradient(0, 2, 0, 0, 2, 16); g.addColorStop(0, 'rgba(' + PCOL[pol].rgb + ',0.6)'); g.addColorStop(1, 'rgba(' + PCOL[pol].rgb + ',0)');
  x.fillStyle = g; x.fillRect(-17, -17, 34, 34);
  x.fillStyle = pol ? '#132063' : '#fff3d6'; x.strokeStyle = pol ? '#78e0ff' : '#fff'; x.lineWidth = 1;
  const pts = id === 'lance' ? [0, -17, 4, -6, 6, 6, 13, 10, 4, 10, 0, 7, -4, 10, -13, 10, -6, 6, -4, -6]
    : id === 'orbit' ? [0, -13, 5, -3, 12, 2, 11, 9, 3, 7, 0, 10, -3, 7, -11, 9, -12, 2, -5, -3]
      : [0, -15, 5, -4, 14, 8, 5, 6, 0, 10, -5, 6, -14, 8, -5, -4];
  x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.closePath(); x.fill(); x.stroke();
  if (id === 'orbit') { x.fillStyle = PCOL[pol].main; [[-12, 10], [12, 10]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 2.6, 0, TAU); x.fill(); }); }
  return c;
}

/* ---------- sortie ---------- */
function openSortie(mode) {
  AU.sfx('ui');
  const S = UI.sortie;
  S.mode = mode;
  if (!SAVE.ships[S.ship]) S.ship = 'halcyon';
  if (!diffUnlocked(S.diff)) S.diff = 'normal';
  $('sortieTitle').textContent = mode === 'story' ? 'SORTIE' : mode === 'practice' ? 'PRACTICE' : 'BOSS RUSH';
  $('sortieJp').textContent = mode === 'story' ? '出撃準備 — 全5ステージ' : mode === 'practice' ? 'ステージ練習 — 到達したステージを1面だけ遊ぶ' : 'ボスラッシュ — 5体のボスと連戦';
  $('stageSel').hidden = mode !== 'practice';
  renderSortie();
  showScr('sortie', true);
}
function diffUnlocked(d) { return d === 'normal' || (d === 'hard' && SAVE.clear.normal) || (d === 'eclipse' && SAVE.clear.hard); }
function renderSortie() {
  const S = UI.sortie;
  const wrap = $('sortieShips'); wrap.innerHTML = '';
  SHIP_ORDER.forEach(id => {
    const sh = SHIPS[id], own = !!SAVE.ships[id];
    const b = document.createElement('button');
    b.className = 'ship' + (S.ship === id ? ' on' : '') + (own ? '' : ' locked');
    b.appendChild(shipIcon(id, S.ship === id ? SOL : LUNA));
    b.insertAdjacentHTML('beforeend', '<b>' + sh.name + '</b><span>' + (own ? sh.jp : '格納庫で入手') + '</span>');
    b.addEventListener('click', () => { if (!own) { AU.sfx('deny'); $('sortieShipDesc').textContent = sh.desc + '（格納庫で ✦' + fmt(sh.cost) + ' で入手）'; return; } S.ship = id; SAVE.ship = id; AU.sfx('ui'); renderSortie(); });
    wrap.appendChild(b);
  });
  $('sortieShipDesc').textContent = SHIPS[S.ship].desc;
  const dw = $('sortieDiff'); dw.innerHTML = '';
  DIFF_ORDER.forEach(d => {
    const ok = diffUnlocked(d), df = DIFFS[d];
    const b = document.createElement('button');
    b.className = 'chip' + (S.diff === d ? ' on' : ''); b.disabled = !ok;
    b.innerHTML = '<b>' + df.name + '</b>' + (ok ? df.jp : (d === 'hard' ? 'NORMAL制覇で解放' : 'HARD制覇で解放'));
    b.addEventListener('click', () => { S.diff = d; SAVE.diff = d; AU.sfx('ui'); renderSortie(); });
    dw.appendChild(b);
  });
  $('sortieDiffDesc').textContent = DIFFS[S.diff].desc;
  if (S.mode === 'practice') {
    const sw = $('sortieStage'); sw.innerHTML = '';
    const reach = SAVE.reach[S.diff];
    if (S.stage >= reach) S.stage = reach - 1;
    STAGES.forEach((st, i) => {
      const b = document.createElement('button');
      const rk = SAVE.ranks[S.diff + '-' + st.n];
      b.className = 'chip' + (S.stage === i ? ' on' : ''); b.disabled = i >= reach;
      b.innerHTML = '<b>' + st.n + '</b>' + (rk ? '<span style="color:' + RANK_COL[rk] + '">' + rk + '</span>' : st.jp);
      b.addEventListener('click', () => { S.stage = i; AU.sfx('ui'); renderSortie(); });
      sw.appendChild(b);
    });
  }
}
$('bStart').addEventListener('click', () => openSortie('story'));
$('bPractice').addEventListener('click', () => openSortie('practice'));
$('bRush').addEventListener('click', () => { if (SAVE.clear.normal) openSortie('rush'); });
$('bGo').addEventListener('click', () => startRun(Object.assign({}, UI.sortie)));

function startRun(opt) {
  AU.init();
  AU.sfx('ui');
  saveGame();
  UI.lastOpt = opt;
  hideAll();
  newRun({ mode: opt.mode, diff: opt.diff, ship: opt.ship, stage: opt.mode === 'practice' ? opt.stage : 0 });
  setTouch(true);
  showHint();
}

/* ---------- hangar ---------- */
function openHangar() { AU.sfx('ui'); renderHangar(); showScr('hangar', true); }
function renderHangar() {
  $('hDust').textContent = fmt(SAVE.dust);
  const hs = $('hShips'); hs.innerHTML = '';
  SHIP_ORDER.forEach(id => {
    const sh = SHIPS[id], own = !!SAVE.ships[id];
    const d = document.createElement('div'); d.className = 'upg';
    const stats = Object.keys(sh.stats).map(k => '<span>' + k + '</span><div class="bar"><i style="width:' + sh.stats[k] * 20 + '%"></i></div>').join('');
    d.innerHTML = '<h3>' + sh.jp + '<small>' + sh.name + '</small></h3><p>' + sh.desc + '</p><div class="bars" style="grid-column:1">' + stats + '</div>';
    const b = document.createElement('button'); b.className = 'buy';
    if (own) { b.innerHTML = '所持<small>' + (SAVE.ship === id ? '使用中' : 'タップで選択') + '</small>'; b.addEventListener('click', () => { SAVE.ship = id; UI.sortie.ship = id; saveGame(); AU.sfx('ui'); renderHangar(); }); }
    else {
      b.innerHTML = '✦' + fmt(sh.cost) + '<small>購入</small>'; b.disabled = SAVE.dust < sh.cost;
      b.addEventListener('click', () => {
        if (SAVE.dust < sh.cost) { AU.sfx('deny'); return; }
        SAVE.dust -= sh.cost; SAVE.ships[id] = true; SAVE.ship = id; UI.sortie.ship = id; AU.sfx('buy'); checkGlobalAch(); saveGame(); renderHangar();
      });
    }
    d.appendChild(b); hs.appendChild(d);
  });
  const hu = $('hUpg'); hu.innerHTML = '';
  UPG_ORDER.forEach(k => {
    const u = UPGRADES[k], lv = SAVE.upg[k], max = lv >= u.max;
    const d = document.createElement('div'); d.className = 'upg';
    let pips = ''; for (let i = 0; i < u.max; i++) pips += '<i class="' + (i < lv ? 'on' : '') + '"></i>';
    d.innerHTML = '<h3>' + u.name + '<small>' + u.en + '</small></h3><p>' + u.desc + '　現在 ' + u.val(lv) + (max ? '' : ' → ' + u.val(lv + 1)) + '</p><div class="pips">' + pips + '</div>';
    const b = document.createElement('button'); b.className = 'buy';
    if (max) { b.innerHTML = 'MAX'; b.disabled = true; }
    else {
      const cost = u.cost[lv];
      b.innerHTML = '✦' + fmt(cost) + '<small>強化</small>'; b.disabled = SAVE.dust < cost;
      b.addEventListener('click', () => {
        if (SAVE.dust < cost) { AU.sfx('deny'); return; }
        SAVE.dust -= cost; SAVE.upg[k]++; AU.sfx('buy'); checkGlobalAch(); saveGame(); renderHangar();
      });
    }
    d.appendChild(b); hu.appendChild(d);
  });
}
$('hTabShips').addEventListener('click', () => { $('hShips').hidden = false; $('hUpg').hidden = true; $('hTabShips').classList.add('on'); $('hTabUpg').classList.remove('on'); AU.sfx('ui'); });
$('hTabUpg').addEventListener('click', () => { $('hShips').hidden = true; $('hUpg').hidden = false; $('hTabUpg').classList.add('on'); $('hTabShips').classList.remove('on'); AU.sfx('ui'); });
$('bHangar').addEventListener('click', openHangar);

/* ---------- records ---------- */
let recTab = 'score';
function renderRecords() {
  const el = $('recBody');
  document.querySelectorAll('[data-rt]').forEach(b => b.classList.toggle('on', b.dataset.rt === recTab));
  if (recTab === 'score') {
    let h = '';
    DIFF_ORDER.forEach(d => {
      h += '<div class="label">' + DIFFS[d].name + (SAVE.clear[d] ? ' · 制覇' : '') + '</div><table><tr><th>#</th><th>SCORE</th><th>到達</th><th>CHAIN</th><th>機体</th></tr>';
      const list = SAVE.best[d];
      if (!list.length) h += '<tr><td colspan="5" style="color:var(--mute)">まだ記録がありません</td></tr>';
      list.forEach((e, i) => { h += '<tr><td>' + (i + 1) + '</td><td class="num">' + fmt(e.score) + '</td><td>' + (e.stage === 'ALL' ? 'ALL' : 'ST' + e.stage) + '</td><td class="num">' + e.chain + '</td><td>' + SHIPS[e.ship].name + '</td></tr>'; });
      h += '</table>';
    });
    h += '<div class="label">BOSS RUSH</div><p class="note">ベスト ' + fmt(SAVE.rushBest) + (SAVE.rushClear ? '　· 制覇' : '') + '</p>';
    el.innerHTML = h;
  } else if (recTab === 'rank') {
    let h = '<table><tr><th>STAGE</th>' + DIFF_ORDER.map(d => '<th style="text-align:center">' + DIFFS[d].name + '</th>').join('') + '</tr>';
    STAGES.forEach(st => {
      h += '<tr><td>' + st.n + ' ' + st.jp + '</td>' + DIFF_ORDER.map(d => { const r = SAVE.ranks[d + '-' + st.n]; return '<td class="rk" style="color:' + (r ? RANK_COL[r] : 'var(--mute)') + '">' + (r || '—') + '</td>'; }).join('') + '</tr>';
    });
    h += '</table><p class="note">ランクは撃墜率・チェイン率・ノーミスで決まる。練習ハイスコア：</p><table>';
    STAGES.forEach(st => { h += '<tr><td>' + st.n + ' ' + st.jp + '</td>' + DIFF_ORDER.map(d => '<td class="num">' + fmt(SAVE.stageBest[d + '-' + st.n] || 0) + '</td>').join('') + '</tr>'; });
    el.innerHTML = h + '</table>';
  } else if (recTab === 'ach') {
    const got = ACHS.filter(a => SAVE.ach[a.id]).length;
    el.innerHTML = '<p class="note" style="margin-bottom:6px">' + got + ' / ' + ACHS.length + ' 解除</p>' +
      ACHS.map(a => '<div class="ach' + (SAVE.ach[a.id] ? ' got' : '') + '"><b>' + a.name + '</b><span>' + a.desc + '</span><em>✦' + a.dust + '</em></div>').join('');
  } else {
    const s = SAVE.stats;
    const rows = [['プレイ回数', fmt(s.plays)], ['総プレイ時間', Math.floor(s.playTime / 60) + '分'], ['撃破数', fmt(s.kills)], ['吸収した弾', fmt(s.absorbed)],
      ['最大チェイン', s.maxChain], ['バースト使用', fmt(s.bursts)], ['ミス', fmt(s.deaths)], ['最高スコア', fmt(s.bestScore)], ['累計星屑', fmt(SAVE.dustTotal)]];
    el.innerHTML = '<div class="stats">' + rows.map(r => '<span>' + r[0] + '</span><b>' + r[1] + '</b>').join('') + '</div>';
  }
}
document.querySelectorAll('[data-rt]').forEach(b => b.addEventListener('click', () => { recTab = b.dataset.rt; AU.sfx('ui'); renderRecords(); }));
$('bRecords').addEventListener('click', () => { AU.sfx('ui'); renderRecords(); showScr('records', true); });
$('bHow').addEventListener('click', () => { AU.sfx('ui'); showScr('how', true); });

/* ---------- settings ---------- */
function renderSettings() {
  $('sBgm').value = SAVE.set.bgm; $('sSfx').value = SAVE.set.sfx; $('sSens').value = SAVE.set.sens;
  $('sShake').textContent = SAVE.set.shake ? 'ON' : 'OFF'; $('sShake').classList.toggle('on', SAVE.set.shake);
  $('sResetConfirm').hidden = true;
}
$('bSettings').addEventListener('click', () => { AU.init(); AU.sfx('ui'); renderSettings(); showScr('settings', true); });
$('sBgm').addEventListener('input', e => { SAVE.set.bgm = +e.target.value; AU.applyVol(); saveGame(); });
$('sSfx').addEventListener('input', e => { SAVE.set.sfx = +e.target.value; AU.applyVol(); AU.sfx('absorb', SOL); saveGame(); });
$('sSens').addEventListener('input', e => { SAVE.set.sens = +e.target.value; saveGame(); });
$('sShake').addEventListener('click', () => { SAVE.set.shake = !SAVE.set.shake; saveGame(); renderSettings(); AU.sfx('ui'); });
$('sReset').addEventListener('click', () => { $('sResetConfirm').hidden = false; AU.sfx('deny'); });
$('sResetNo').addEventListener('click', () => { $('sResetConfirm').hidden = true; });
$('sResetYes').addEventListener('click', () => {
  const keepSet = SAVE.set; SAVE = defaultSave(); SAVE.set = keepSet; saveGame();
  UI.sortie = { mode: 'story', ship: 'halcyon', diff: 'normal', stage: 0 };
  ED.toast('DATA', 'セーブデータを消去しました', ''); openTitle();
});

/* ---------- pause ---------- */
function pauseGame() {
  if (G.state !== 'play') return;
  G.state = 'paused';
  showScr('pause'); UI.stack = [];
  setTouch(false);
}
function resumeGame() {
  if (G.state !== 'paused') return;
  hideAll(); G.state = 'play'; setTouch(true);
  IN.tdx = IN.tdy = 0; IN.touchId = null;
}
$('pResume').addEventListener('click', () => { AU.sfx('ui'); resumeGame(); });
$('pHow').addEventListener('click', () => { AU.sfx('ui'); UI.stack = ['pause']; showScr('how'); UI.stack = ['pause']; });
$('pRetire').addEventListener('click', () => { AU.sfx('ui'); hideAll(); G.state = 'play'; finishRun(false); });
$('tPause').addEventListener('click', e => { e.stopPropagation(); pauseGame(); });

/* ---------- result ---------- */
ED.onResult = function (R) {
  setTouch(false);
  setTimeout(() => {
    $('rTitle').textContent = R.cleared ? (R.mode === 'practice' ? 'STAGE CLEAR' : 'MISSION COMPLETE') : 'GAME OVER';
    $('rSub').textContent = (R.mode === 'story' ? '本編' : R.mode === 'practice' ? 'ステージ練習 ' + (R.startStage + 1) : 'ボスラッシュ') + ' · ' + R.diff.name + ' · ' + R.ship.name;
    $('rScore').textContent = fmt(R.score);
    $('rTag').textContent = R.newBest ? 'NEW RECORD' : '';
    $('rRanks').innerHTML = R.ranks.map((r, i) => '<span style="color:' + RANK_COL[r] + '">' + (R.startStage + i + 1) + ':' + r + '</span>').join('');
    const rows = [['到達', R.cleared ? 'ALL CLEAR' : 'STAGE ' + (R.stageIdx + 1)], ['最大チェイン', R.maxChain], ['撃破', fmt(R.kills)], ['吸収', fmt(R.absorbed)],
      ['ミス', R.misses], ['拾った星屑', '✦' + fmt(R.dust)], ['スコア換算', '✦' + fmt(R.scoreDust)], ['獲得合計', '✦' + fmt(R.dustTotal)], ['所持星屑', '✦' + fmt(SAVE.dust)]];
    $('rStats').innerHTML = rows.map(r => '<span>' + r[0] + '</span><b>' + r[1] + '</b>').join('');
    $('rAch').innerHTML = R.achNew.length ? '<div class="label">NEW ACHIEVEMENTS</div>' + R.achNew.map(a => '<div class="ach got"><b>' + a.name + '</b><span>' + a.desc + '</span><em>✦' + a.dust + '</em></div>').join('') : '';
    showScr('result'); UI.stack = [];
  }, 400);
};
$('rRetry').addEventListener('click', () => { if (UI.lastOpt) startRun(UI.lastOpt); });
$('rTitleBtn').addEventListener('click', () => { AU.sfx('ui'); openTitle(); });

/* ---------- toast / touch / hint ---------- */
ED.toast = function (tag, txt, sub) {
  const t = document.createElement('div'); t.className = 'toast';
  t.innerHTML = '<b>' + tag + '</b>' + txt + (sub ? '<em>' + sub + '</em>' : '');
  $('toasts').appendChild(t);
  setTimeout(() => t.remove(), 3200);
};
function setTouch(on) { $('touch').hidden = !(on && IN.touchMode); }
let hintTimer = 0;
function showHint() {
  if (!IN.touchMode) return;
  const h = $('hint'); h.hidden = false; h.style.opacity = 1;
  clearTimeout(hintTimer); hintTimer = setTimeout(() => { h.style.opacity = 0; setTimeout(() => { h.hidden = true; }, 700); }, 3500);
}
Object.assign(ED, { openTitle, pauseGame, resumeGame, setTouch, startRun, UI });
