const fs = require('fs');
const src = fs.readFileSync(require('path').resolve(__dirname, '..', 'index.html'), 'utf8');
const CARDS = eval('(' + src.match(/const CARDS = (\{[\s\S]*?\n\});/)[1] + ')');
const DRAFT = eval('(' + src.match(/const VS_DRAFT = (\{[\s\S]*?\n\});/)[1] + ')');
const START = ['p_mainoo','p_mount','p_ugarte','p_dalot','t_maguire','t_yoro','t_martinez','s_mbeumo'];
const FX = ['atk', 'mur', 'opp', 'guard', 'energy'], STRIKE = +src.match(/VS_STRIKE = (\d+)/)[1], THR = 12;
const pick = a => a[Math.floor(Math.random()*a.length)];
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
function packs(){
  const atk = shuffle(DRAFT.atk), def = shuffle(DRAFT.def), ex = shuffle(DRAFT.ex);
  return [[atk[0], def[0], ex[0]], [atk[1], def[1], ex[1]], [pick(DRAFT.rareAtk), pick(DRAFT.rareDef), pick(DRAFT.rareEx)], shuffle(DRAFT.epic).slice(0, 3)];
}
let PK = null;
function deck(){ return START.concat(PK.map(p => pick(p))); }
function player(acc, style){ return { acc, style, deck:deck() }; }
const scale = (fx, ok) => { const o = { turns:fx.turns, weather:fx.weather }; FX.forEach(k => { if (fx[k]) o[k] = ok ? fx[k] : k === 'energy' ? Math.floor(fx[k]/2) : Math.max(1, Math.floor(fx[k]/2)); }); return o; };
function value(c, def){
  const f = c.fx || {}, n = f.turns || 0;
  if (def) return (c.def||0) + ((f.mur||0) + (f.opp||0)) * n;
  return (c.atk||0) + (c.buff||0) + (f.atk||0) * 3 * n + (f.guard||0) * n + (c.strike ? 8 : 0);
}
function turns(p){
  const out = []; let draw = shuffle(p.deck), disc = [], streak = 0, buff = 0, fire = false, fx = [];
  const drawN = (h, n) => { for (let i=0;i<n;i++){ if (h.length>=8) break; if (!draw.length){ if (!disc.length) break; draw = shuffle(disc); disc = []; } h.push(draw.pop()); } };
  const sum = k => fx.reduce((s, f) => s + (f[k]||0), 0);
  for (let t=0;t<6;t++){
    let e = 3 + sum('energy'), hand = [], atk = 0, mur = sum('mur') + sum('opp'), thru = 0, crack = sum('guard'), rally = 0; drawN(hand, 5);
    const def = p.style === 'mix' ? Math.random() < .5 : p.style === 'def';
    for (;;){
      const pl = hand.map((id,i)=>({id,i,c:CARDS[id]})).filter(x=>x.c.cost<=e); if (!pl.length) break;
      pl.sort((a,b)=> p.style==='random' ? Math.random()-.5 : (value(b.c, def) - value(a.c, def)) || ((b.c.energy||0)+(b.c.draw||0)-(a.c.energy||0)-(a.c.draw||0)));
      const x = pl[0], c = x.c; e -= c.cost; hand.splice(x.i,1); disc.push(x.id);
      const ok = Math.random() < p.acc; streak = ok ? streak+1 : 0; const half = v => ok ? v : Math.max(1, Math.floor(v/2)), fh = v => ok ? v : Math.floor(v/2);
      let bonus = 0; if (ok && Math.random() < .5) bonus += 2; if (ok && streak>=3) bonus += 1;
      if (c.atk){ const a = half(c.atk + buff + rally + sum('atk')) + (c.kind==='atk'?bonus:0); if (c.pierce || fire) thru += a; else atk += a; buff = 0; fire = false; }
      if (c.def) mur += half(c.def) + (c.kind==='def'?bonus:0);
      if (c.buff) buff += half(c.buff); if (c.rally) rally += half(c.rally); if (c.energy) e += fh(c.energy); if (c.draw) drawN(hand, fh(c.draw));
      if (c.fire) fire = true;
      if (c.fx){ const f = scale(c.fx, ok); if (f.weather) fx = fx.filter(w => !w.weather); fx.push(f); mur += (f.mur||0) + (f.opp||0); e += f.energy||0; crack += f.guard||0; }
      if (c.strike) crack += STRIKE;
    }
    disc.push(...hand); out.push({ atk, mur, thru, crack });
    fx = fx.filter(f => --f.turns > 0);
  }
  return out;
}
const through = (a, b) => Math.max(0, a.atk - Math.max(0, b.mur - a.crack)) + a.thru;
function match(a, b){
  const A = turns(a), B = turns(b); let mc=0, oc=0, mg=0, og=0;
  for (let i=0;i<6;i++){ mc += through(A[i], B[i]); oc += through(B[i], A[i]); while (mc>=THR){mc-=THR;mg++;} while (oc>=THR){oc-=THR;og++;} }
  return [mg, og];
}
const N = 20000;
for (const [na, a, nb, b] of [['85% slump', [.85,'random'], '85% slump', [.85,'random']], ['85% mix', [.85,'mix'], '85% mix', [.85,'mix']], ['85% anfall', [.85,'atk'], '85% mix', [.85,'mix']], ['95% mix', [.95,'mix'], '70% mix', [.7,'mix']], ['85% anfall', [.85,'atk'], '85% anfall', [.85,'atk']]]){
  let wa=0, wb=0, dr=0, goals=0;
  for (let i=0;i<N;i++){ PK = packs(); const [x,y] = match(player(...a), player(...b)); goals += x+y; if (x>y) wa++; else if (y>x) wb++; else dr++; }
  console.log(`${na.padEnd(11)} mot ${nb.padEnd(11)} vinst ${(100*wa/N).toFixed(0)}% / ${(100*wb/N).toFixed(0)}%  oavgjort→straffar ${(100*dr/N).toFixed(0)}%  mål/match ${(goals/N).toFixed(1)}`);
}
