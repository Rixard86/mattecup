const fs = require('fs');
const src = fs.readFileSync(require('path').resolve(__dirname, '..', 'index.html'), 'utf8');
const CARDS = eval('(' + src.match(/const CARDS = (\{[\s\S]*?\n\});/)[1] + ')');
const START = ['p_mainoo','p_mount','p_ugarte','p_dalot','t_maguire','t_yoro','t_martinez','s_mbeumo'];
const POOL = { common:['amad','dorgu','sesko','shaw','heaven','mazraoui'], rare:['bruno','rashford','cunha','deligt','lammens','tielemans'], epic:['lammens2','zirkzee','baleba'] };
const pick = a => a[Math.floor(Math.random()*a.length)];
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
function packs(){ const a1=pick(['sesko','shaw']), e1=pick(['amad','dorgu']); return [[a1,'heaven',e1],[a1==='sesko'?'shaw':'sesko','mazraoui',e1==='amad'?'dorgu':'amad'],[pick(['rashford','cunha','tielemans']),pick(['deligt','lammens']),'bruno'],['zirkzee','lammens2','baleba']]; }
let PK = null;
function deck(){ return START.concat(PK.map(p => pick(p))); }
function player(acc, style){ return { acc, style, deck:deck() }; }
function turns(p){
  const out = []; let draw = shuffle(p.deck), disc = [], streak = 0, buff = 0;
  const drawN = (h, n) => { for (let i=0;i<n;i++){ if (h.length>=8) break; if (!draw.length){ if (!disc.length) break; draw = shuffle(disc); disc = []; } h.push(draw.pop()); } };
  for (let t=0;t<6;t++){
    let e = 3, hand = [], atk = 0, mur = 0, rally = 0; drawN(hand, 5);
    const def = p.style === 'mix' ? Math.random() < .5 : p.style === 'def';
    for (;;){
      const pl = hand.map((id,i)=>({id,i,c:CARDS[id]})).filter(x=>x.c.cost<=e); if (!pl.length) break;
      pl.sort((a,b)=> p.style==='random' ? Math.random()-.5 : ((def ? (b.c.def||0)-(a.c.def||0) : (b.c.atk||0)-(a.c.atk||0)) || ((b.c.energy||0)+(b.c.draw||0)-(a.c.energy||0)-(a.c.draw||0))));
      const x = pl[0]; e -= x.c.cost; hand.splice(x.i,1); disc.push(x.id);
      const ok = Math.random() < p.acc; streak = ok ? streak+1 : 0; const half = v => ok ? v : Math.max(1, Math.floor(v/2)), fh = v => ok ? v : Math.floor(v/2);
      let bonus = 0; if (ok && Math.random() < .5) bonus += 2; if (ok && streak>=3) bonus += 1;
      if (x.c.atk){ atk += half(x.c.atk + buff + rally) + (x.c.kind==='atk'?bonus:0); buff = 0; }
      if (x.c.def) mur += half(x.c.def) + (x.c.kind==='def'?bonus:0);
      if (x.c.buff) buff += half(x.c.buff); if (x.c.rally) rally += half(x.c.rally); if (x.c.energy) e += fh(x.c.energy); if (x.c.draw) drawN(hand, fh(x.c.draw));
    }
    disc.push(...hand); out.push({ atk, mur });
  }
  return out;
}
function match(a, b){
  const A = turns(a), B = turns(b); let mc=0, oc=0, mg=0, og=0;
  for (let i=0;i<6;i++){ mc += Math.max(0, A[i].atk - B[i].mur); oc += Math.max(0, B[i].atk - A[i].mur); while (mc>=12){mc-=12;mg++;} while (oc>=12){oc-=12;og++;} }
  return [mg, og];
}
const N = 20000;
for (const [na, a, nb, b] of [['85% slump', [.85,'random'], '85% slump', [.85,'random']], ['85% mix', [.85,'mix'], '85% mix', [.85,'mix']], ['85% anfall', [.85,'atk'], '85% mix', [.85,'mix']], ['95% mix', [.95,'mix'], '70% mix', [.7,'mix']], ['85% anfall', [.85,'atk'], '85% anfall', [.85,'atk']]]){
  let wa=0, wb=0, dr=0, goals=0;
  for (let i=0;i<N;i++){ PK = packs(); const [x,y] = match(player(...a), player(...b)); goals += x+y; if (x>y) wa++; else if (y>x) wb++; else dr++; }
  console.log(`${na.padEnd(11)} mot ${nb.padEnd(11)} vinst ${(100*wa/N).toFixed(0)}% / ${(100*wb/N).toFixed(0)}%  oavgjort→straffar ${(100*dr/N).toFixed(0)}%  mål/match ${(goals/N).toFixed(1)}`);
}
