'use strict';
const FX_KEYS = ['atk', 'mur', 'opp', 'guard', 'energy'];
const TOOL_WAIT_MS = 650, TOOL_BURST = 60, TOOL_SPEED = 300, TOOL_LIFE = .8, TOOL_SIZE = 6, TOOL_RING = 140, TOOL_RING_MS = 600;
const TOOL_COLORS = {
  fire:['#fff3b0', '#ffd84d', '#ff9a1f', '#e8200c'], ice:['#ffffff', '#c7f0ff', '#67e8f9', '#38bdf8'],
  glove:['#ffffff', '#fde68a', '#f5c542'], boot:['#ffffff', '#bbf7d0', '#4ade80'],
  rain:['#e0f2fe', '#7dd3fc', '#38bdf8'], fog:['#ffffff', '#e5e7eb', '#cbd5e1'],
  wind:['#ffffff', '#d1fae5', '#a7f3d0'], storm:['#ffffff', '#fef08a', '#facc15', '#a78bfa'],
};

function fxSum(key){ return (M && M.fx || []).reduce((s, f) => s + (f[key] || 0), 0); }
function fxText(f){
  const p = [];
  if (f.atk) p.push(`alla anfall +${f.atk}`);
  if (f.mur) p.push(`mur +${f.mur}`);
  const theirs = [f.opp && `anfall −${f.opp}`, f.guard && `försvar −${f.guard}`].filter(Boolean);
  if (theirs.length) p.push(`deras ${theirs.join(', ')}`);
  if (f.energy) p.push(`energi +${f.energy}`);
  return p.join(', ');
}
function fxSpan(f){ return f.turns === 1 ? 'denna tur' : `${f.turns} turer`; }
function scaleFx(fx, ok){
  const out = { turns:fx.turns, weather:fx.weather };
  FX_KEYS.forEach(k => { if (fx[k]) out[k] = ok ? fx[k] : k === 'energy' ? Math.floor(fx[k] / 2) : Math.max(1, Math.floor(fx[k] / 2)); });
  return out;
}
function addFx(c, ok){
  const f = { ...scaleFx(c.fx, ok), name:c.name };
  if (f.weather) M.fx = M.fx.filter(x => !x.weather);
  M.fx.push(f);
  M.mur += f.mur || 0;
  M.energy += f.energy || 0;
  if (M.vs){ M.mur += f.opp || 0; M.crackTurn += f.guard || 0; return; }
  if (M.intent) M.intent.atk = Math.max(0, M.intent.atk - (f.opp || 0));
  M.oppGuard = Math.max(0, M.oppGuard - (f.guard || 0));
}
function vsFxTurnStart(){
  M.mur += fxSum('mur') + fxSum('opp');
  M.energy += fxSum('energy');
  M.crackTurn += fxSum('guard');
}
function fxTurnStart(){
  M.mur += fxSum('mur');
  M.energy += fxSum('energy');
  M.intent.atk = Math.max(0, M.intent.atk - fxSum('opp'));
  M.oppGuard = Math.max(0, M.oppGuard - fxSum('guard'));
}
function fxTurnEnd(){ M.fx = M.fx.filter(f => --f.turns > 0); }
function fxTags(){
  return (M.fx || []).map(f => `<span class="tag fx">${f.name}: ${fxText(f)} · ${f.turns === 1 ? 'sista turen' : `${f.turns} turer kvar`}</span>`);
}
function weatherOf(){
  const w = (M && M.fx || []).find(f => f.weather);
  return w ? w.weather : '';
}

function isTool(c){ return c.kind === 'gear' || c.kind === 'env'; }
function toolFx(c){
  if (!F.W) return;
  const cx = F.W / 2, cy = F.H / 2, col = TOOL_COLORS[c.icon] || TOOL_COLORS.glove;
  burst(cx, cy, TOOL_BURST, col, TOOL_SPEED, TOOL_LIFE, TOOL_SIZE);
  ring(cx, cy, col[1], TOOL_RING, TOOL_RING_MS);
  if (c.icon === 'storm') screenFx('white');
}
