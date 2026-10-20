'use strict';
/* ECLIPSE DRIVE — data tables */
const POLNAME = ['SOL', 'LUNA'];
const PCOL = [
  { core: '#fffaf0', main: '#ffc861', glow: '#ff9a2e', dark: '#7a3d0c', rgb: '255,180,70' },
  { core: '#0b1238', main: '#5fd4ff', glow: '#3d7dff', dark: '#071038', rgb: '80,170,255' }
];

const DIFFS = {
  normal: { id: 'normal', name: 'NORMAL', jp: 'ノーマル', spd: 1.0, dens: 1.0, rate: 1.0, echo: 3, mul: 1.0, bossHp: 1.0, flip: 0, desc: '標準。まずはここから。' },
  hard: { id: 'hard', name: 'HARD', jp: 'ハード', spd: 1.14, dens: 1.45, rate: 1.3, echo: 5, mul: 1.6, bossHp: 1.15, flip: 0, desc: '弾速・弾数アップ。スコア×1.6' },
  eclipse: { id: 'eclipse', name: 'ECLIPSE', jp: 'イクリプス', spd: 1.26, dens: 1.8, rate: 1.5, echo: 7, mul: 2.5, bossHp: 1.3, flip: 0.22, desc: '一部の弾が飛行中に色を変える。スコア×2.5' }
};
const DIFF_ORDER = ['normal', 'hard', 'eclipse'];

const SHIPS = {
  halcyon: {
    id: 'halcyon', name: 'HALCYON', jp: 'ハルシオン', cost: 0, speed: 235, focus: 115,
    desc: '扇状に広がるショット。バーストは追尾レーザー。扱いやすい万能型。',
    stats: { 火力: 3, 範囲: 4, 速度: 3 }, burst: 'homing'
  },
  lance: {
    id: 'lance', name: 'LANCE', jp: 'ランス', cost: 900, speed: 215, focus: 105,
    desc: '集中した貫通ショット。バーストは弾を消し去る極太ビーム。ボス戦向き。',
    stats: { 火力: 5, 範囲: 1, 速度: 2 }, burst: 'beam'
  },
  orbit: {
    id: 'orbit', name: 'ORBIT', jp: 'オービット', cost: 1600, speed: 250, focus: 120,
    desc: '軌跡を追う2基のオプション。バーストは大量の小型追尾弾。機動力が最高。',
    stats: { 火力: 3, 範囲: 5, 速度: 5 }, burst: 'swarm'
  }
};
const SHIP_ORDER = ['halcyon', 'lance', 'orbit'];

const UPGRADES = {
  power: { name: '火力', en: 'POWER', desc: 'ショットの威力が上がる', max: 5, cost: [150, 320, 600, 1000, 1600], val: l => '+' + [0, 8, 16, 25, 35, 50][l] + '%' },
  capacity: { name: '蓄積', en: 'CAPACITY', desc: 'エネルギー上限が増え、バーストが強くなる', max: 3, cost: [220, 550, 1100], val: l => [120, 150, 180, 240][l] },
  life: { name: '残機', en: 'LIFE', desc: '開始時の残機が増える', max: 2, cost: [450, 1300], val: l => (3 + l) + '機' },
  absorb: { name: '吸収', en: 'ABSORB', desc: '同色弾を吸い込む範囲が広がる', max: 3, cost: [160, 420, 850], val: l => [14, 17, 20, 24][l] + 'px' },
  magnet: { name: '磁力', en: 'MAGNET', desc: '星屑を引き寄せる範囲が広がる', max: 3, cost: [100, 260, 520], val: l => ['近', '中', '遠', '全'][l] },
  spark: { name: '初動', en: 'SPARK', desc: 'ステージ開始時にエネルギーを持って出撃', max: 2, cost: [300, 800], val: l => [0, 40, 80][l] }
};
const UPG_ORDER = ['power', 'capacity', 'life', 'absorb', 'magnet', 'spark'];

const STAGES = [
  {
    n: 1, name: 'DAWN', jp: '黎明', sub: '夜明けの防衛線', waves: 13, interval: 4.0, seed: 101,
    pool: { snake: 3, vee: 3, sweep: 2, mines: 1, heavy: 1, cross: 2 }, first: ['snake', 'vee', 'sweep'],
    boss: 'gemini', bgm: 's1', bg: { a: '#170d2e', b: '#3b1636', n1: '255,140,80', n2: '80,180,255', star: '255,230,200' }
  },
  {
    n: 2, name: 'CLOUD SEA', jp: '雲海', sub: '雲の下の迎撃網', waves: 15, interval: 3.8, seed: 202,
    pool: { snake: 2, vee: 2, sweep: 2, mines: 2, heavy: 2, turret: 3, lancer: 2, cross: 2, wall: 1 }, first: ['turret', 'snake'],
    boss: 'helix', bgm: 's2', bg: { a: '#0b1a33', b: '#22355a', n1: '120,220,255', n2: '255,200,140', star: '210,235,255' }
  },
  {
    n: 3, name: 'ECLIPSED CITY', jp: '蝕都', sub: '光を喰われた都市', waves: 16, interval: 3.6, seed: 303,
    pool: { snake: 2, vee: 2, sweep: 1, mines: 2, heavy: 2, turret: 2, lancer: 2, carrier: 2, spinner: 2, wall: 2, cross: 1 }, first: ['spinner', 'wall'],
    boss: 'obelisk', bgm: 's3', bg: { a: '#120a1c', b: '#2e1030', n1: '255,90,140', n2: '150,110,255', star: '255,200,230' }
  },
  {
    n: 4, name: 'ABYSS', jp: '深淵', sub: '重力井戸の底へ', waves: 17, interval: 3.4, seed: 404,
    pool: { snake: 1, vee: 2, sweep: 1, mines: 2, heavy: 3, turret: 2, lancer: 3, carrier: 2, spinner: 3, wall: 2, cross: 1, twins: 2 }, first: ['twins', 'lancer'],
    boss: 'asura', bgm: 's4', bg: { a: '#050b17', b: '#0e2a2f', n1: '60,255,200', n2: '80,120,255', star: '190,255,240' }
  },
  {
    n: 5, name: 'BLACK SUN', jp: '黒日', sub: '日蝕の中心', waves: 18, interval: 3.2, seed: 505,
    pool: { vee: 2, mines: 2, heavy: 3, turret: 2, lancer: 2, carrier: 2, spinner: 3, wall: 2, twins: 3, cross: 1 }, first: ['twins', 'spinner'],
    boss: 'eclipse', bgm: 's5', bg: { a: '#0a0306', b: '#2a0c06', n1: '255,120,40', n2: '120,60,255', star: '255,210,170' }
  }
];

const ETYPES = {
  dart: { hp: 3, r: 9, score: 100, dust: 0.15 },
  swirl: { hp: 8, r: 10, score: 150, dust: 0.2 },
  mine: { hp: 2, r: 8, score: 80, dust: 0.1 },
  lancer: { hp: 12, r: 11, score: 300, dust: 0.35 },
  turret: { hp: 42, r: 15, score: 800, dust: 2 },
  heavy: { hp: 115, r: 22, score: 2000, dust: 4 },
  carrier: { hp: 150, r: 26, score: 3000, dust: 5 },
  spinner: { hp: 62, r: 16, score: 1500, dust: 3 },
  twin: { hp: 30, r: 13, score: 600, dust: 1 },
  arm: { hp: 160, r: 14, score: 2000, dust: 2 }
};

const RANK_COL = { S: '#ffe27a', A: '#9fe8ff', B: '#b7c7ff', C: '#c8a8c8' };

/* achievements: check(ctx) with ctx = {ev, run, save} */
const ACHS = [
  { id: 'first', name: '初陣', desc: 'ステージ1をクリア', dust: 100 },
  { id: 'absorb1k', name: '吸収体', desc: '累計1,000発の弾を吸収', dust: 150 },
  { id: 'absorb10k', name: '光喰らい', desc: '累計10,000発の弾を吸収', dust: 500 },
  { id: 'chain5', name: '三連の理', desc: '1プレイで CHAIN 5 達成', dust: 120 },
  { id: 'chain10', name: '連鎖術師', desc: '1プレイで CHAIN 10 達成', dust: 300 },
  { id: 'chain25', name: '無限連鎖', desc: '1プレイで CHAIN 25 達成', dust: 800 },
  { id: 'stage3', name: '蝕都突入', desc: 'ステージ3をクリア', dust: 200 },
  { id: 'clearN', name: '日蝕を越えて', desc: 'NORMAL で全ステージクリア', dust: 600 },
  { id: 'clearH', name: '極光', desc: 'HARD で全ステージクリア', dust: 1200 },
  { id: 'clearE', name: '黒き太陽の主', desc: 'ECLIPSE で全ステージクリア', dust: 2500 },
  { id: 'nomiss', name: '無傷', desc: 'ノーミスでステージクリア', dust: 200 },
  { id: 'srank', name: '完璧主義', desc: 'いずれかのステージで Sランク', dust: 250 },
  { id: 'burstkill', name: '解放の一撃', desc: 'バーストでボスにとどめを刺す', dust: 200 },
  { id: 'score1m', name: 'ミリオン', desc: '1プレイで 1,000,000点', dust: 300 },
  { id: 'score5m', name: 'ファイブスター', desc: '1プレイで 5,000,000点', dust: 1000 },
  { id: 'kills1k', name: '撃墜王', desc: '累計1,000機撃破', dust: 200 },
  { id: 'kills5k', name: '殲滅者', desc: '累計5,000機撃破', dust: 600 },
  { id: 'rush', name: 'ボスラッシュ制覇', desc: 'ボスラッシュをクリア', dust: 800 },
  { id: 'allships', name: '格納庫満杯', desc: '全機体を入手', dust: 300 },
  { id: 'maxupg', name: '完全武装', desc: '全強化を最大に', dust: 1000 },
  { id: 'pacifist', name: '光の盾', desc: 'ボスの1フェイズ中、ミス・バーストなしで300発吸収', dust: 400 }
];
