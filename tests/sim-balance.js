// Balanssimulering av matchmotorn i United Mattecup (regler kopierade från index.html)
const fs = require('fs');
const src = fs.readFileSync(require('path').resolve(__dirname, '..', 'index.html'), 'utf8');
const CARDS = eval('(' + src.match(/const CARDS = (\{[\s\S]*?\n\});/)[1] + ')');
const START_DECK = ['p_mainoo','p_mount','p_ugarte','p_dalot','t_maguire','t_yoro','t_martinez','s_mbeumo'];
const POOL = eval('(' + src.match(/const POOL = (\{[\s\S]*?\n\});/)[1] + ')');
const FX_KEYS = ['atk', 'mur', 'opp', 'guard', 'energy'];
const scaleFx = (fx, ok) => { const o = { turns:fx.turns, weather:fx.weather }; FX_KEYS.forEach(k => { if (fx[k]) o[k] = ok ? fx[k] : k === 'energy' ? Math.floor(fx[k]/2) : Math.max(1, Math.floor(fx[k]/2)); }); return o; };
const RELICS = ['scarf','boots','gloves','lucky','coach','clock','bench','bus'];
const rnd = (a,b) => a + Math.floor(Math.random()*(b-a+1)), pick = a => a[Math.floor(Math.random()*a.length)];
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };

function match(R, stage, cfg){
  const has = k => R.relics.includes(k);
  const boss = stage === 5, defp = .2 + Math.random()*.2;
  const M = { turn:1, maxTurns:6 + (has('clock')?1:0), hand:[], draw:shuffle(R.deck), discard:[], mur:0, myChance:0, oppChance:0, my:0, opp:0, oppGuard:0, buffNext:0, rally:0, streak:0, retry:false, fx:[], pierce:false, thrMe:12+(cfg.tm??2)*stage, thrOpp:12 };
  const drawN = n => { for (let i=0;i<n;i++){ if (M.hand.length>=8) break; if (!M.draw.length){ if (!M.discard.length) break; M.draw = shuffle(M.discard); M.discard=[]; } M.hand.push(M.draw.pop()); } };
  const intent = () => { const s=stage, r=Math.random();
    if (boss && M.turn%3===0) return { atk:rnd(cfg.sl||14,cfg.sh||18), def:0 };
    if (r < defp) return { atk:0, def:rnd(4+s,6+2*s)+Math.round((cfg.kd||0)*s) };
    if (s>=(cfg.press??2) && r < defp+.2) return { atk:rnd(3+s,4+s)+Math.round((cfg.k||0)*s), def:rnd(2+s,3+s) };
    const k=cfg.k||0; if (boss && cfg.bh) return { atk:rnd(cfg.bl,cfg.bh), def:0 }; return { atk:rnd(3+s+Math.round(k*s),6+2*s+Math.round(k*s)), def:0 }; };
  const sum = k => M.fx.reduce((s,f)=>s+(f[k]||0),0);
  const answer = () => { let ok = Math.random() < cfg.acc; if (!ok && has('coach') && !M.retry){ M.retry = true; ok = Math.random() < cfg.acc; } return { ok, fast: ok && Math.random() < cfg.fast }; };
  while (M.turn <= M.maxTurns){
    let energy = 3 + (M.turn===1 && has('scarf') ? 1 : 0);
    M.mur = has('gloves') ? 2 : 0; M.rally = 0;
    drawN(has('bench') ? 6 : 5);
    const it = intent(); M.oppGuard = it.def;
    M.mur += sum('mur'); energy += sum('energy'); it.atk = Math.max(0, it.atk - sum('opp')); M.oppGuard = Math.max(0, M.oppGuard - sum('guard'));
    // spela kort
    for (;;){
      const playable = M.hand.map((id,i)=>({id,i,c:CARDS[id]})).filter(x => x.c.cost <= energy);
      if (!playable.length) break;
      let ch;
      if (cfg.smart){
        const needDef = it.atk - M.mur > 0;
        const score = x => { const c=x.c; let v = 0;
          if (c.energy || c.draw || c.rally) v += 6 + (c.energy||0)*3;
          if (c.def) v += needDef ? Math.min(c.def, it.atk - M.mur) * 1.6 : 0;
          if (c.atk) v += c.atk + (c.pierce || M.pierce ? Math.min(M.oppGuard, c.atk) : 0);
          if (c.buff && !c.atk) v += c.buff + (c.fire ? 3 : 0);
          if (c.strike) v += M.oppGuard;
          if (c.fx){ const f = c.fx, later = f.turns - 1, block = (f.mur||0) + (f.opp||0), hits = M.hand.filter(id => CARDS[id].atk && id !== x.id).length;
            if (f.weather && M.fx.some(w => w.weather && w.turns >= 2)) return 0;
            v += (f.atk||0) * (hits + 2 * later) + Math.min(block, Math.max(0, it.atk - M.mur)) * 1.6 + block * .7 * later + Math.min(f.guard||0, M.oppGuard) + (f.guard||0) * .3 * later + (f.energy||0) * 4 * later; }
          return v / Math.max(1, c.cost) + (c.cost===0?5:0); };
        playable.sort((a,b)=>score(b)-score(a)); ch = playable[0];
        if (score(ch) <= 0) break;
      } else ch = cfg.random ? pick(playable) : playable[0];
      energy -= ch.c.cost; M.hand.splice(ch.i,1); M.discard.push(ch.id);
      const c = ch.c, res = answer(), ok = res.ok;
      if (ok) M.streak++; else M.streak = 0;
      const half = v => ok ? v : Math.max(1, Math.floor(v/2)), fh = v => ok ? v : Math.floor(v/2);
      let bonus = 0; if (ok && res.fast) bonus += 2; if (ok && M.streak>=3) bonus += has('lucky') ? 2 : 1;
      let atk=0, def=0;
      if (c.atk){ atk = half(c.atk + M.buffNext + M.rally + sum('atk') + (has('boots')?1:0)) + (c.kind==='atk'?bonus:0); M.buffNext = 0; }
      if (c.def) def = half(c.def) + (c.kind==='def'?bonus:0);
      if (c.buff) M.buffNext += half(c.buff);
      if (c.rally) M.rally += half(c.rally);
      if (c.energy) energy += fh(c.energy);
      if (c.draw) drawN(fh(c.draw));
      const pierce = !!atk && (M.pierce || !!c.pierce); if (atk) M.pierce = false; if (c.fire) M.pierce = true;
      if (c.fx){ const f = scaleFx(c.fx, ok); if (f.weather) M.fx = M.fx.filter(x => !x.weather); M.fx.push(f);
        M.mur += f.mur||0; energy += f.energy||0; it.atk = Math.max(0, it.atk - (f.opp||0)); M.oppGuard = Math.max(0, M.oppGuard - (f.guard||0)); }
      if (c.strike) M.oppGuard = 0;
      M.mur += def;
      const abs = pierce ? 0 : Math.min(M.oppGuard, atk); M.oppGuard -= abs; M.myChance += atk - abs;
      while (M.myChance >= M.thrMe){ M.myChance -= M.thrMe; M.my++; }
    }
    M.discard.push(...M.hand); M.hand = [];
    const dmg = it.atk ? it.atk - Math.min(M.mur, it.atk) : 0;
    M.oppChance += dmg; while (M.oppChance >= M.thrOpp){ M.oppChance -= M.thrOpp; M.opp++; }
    M.fx = M.fx.filter(f => --f.turns > 0);
    M.turn++;
  }
  if (M.my !== M.opp) return { win: M.my > M.opp, pens:false, my:M.my, opp:M.opp };
  // straffar
  const me=[], op=[];
  for (let n=1;;n++){
    me.push(Math.random() < cfg.acc);
    const z = Math.random()<.2 ? 1 : pick([0,2]), dive = pick([0,2]);
    op.push(dive===z ? Math.random()>=.8 : !(z!==1 && Math.random()<.12));
    const m = me.filter(Boolean).length, o = op.filter(Boolean).length;
    if (n<=3){ const rem=3-n; if (m>o+rem) return {win:true,pens:true,my:M.my,opp:M.opp}; if (o>m+rem) return {win:false,pens:true,my:M.my,opp:M.opp}; continue; }
    if (m!==o) return { win:m>o, pens:true, my:M.my, opp:M.opp };
    if (n>=8) return { win:true, pens:true, my:M.my, opp:M.opp };
  }
}
function run(cfg){
  const R = { deck:START_DECK.slice(), relics:[], hearts:3 };
  const st = { lossAt:[0,0,0,0,0,0], played:[0,0,0,0,0,0], pens:0, matches:0, gd:0 };
  for (let s=0; s<6; ){
    const r = match(R, s, cfg); st.played[s]++; st.matches++; if (r.pens) st.pens++; st.gd += r.my - r.opp;
    if (!r.win){ st.lossAt[s]++; if (--R.hearts <= 0) return { won:false, stage:s, ...st, hearts:0 }; continue; }
    if (s===5) return { won:true, stage:6, ...st, hearts:R.hearts };
    s++;
    const offer=[]; while (offer.length<3){ const r=Math.random(), e=.05+.04*s, ra=.25+.06*s; const id=pick(r<e?POOL.epic:r<e+ra?POOL.rare:POOL.common); if(!offer.includes(id)) offer.push(id); }
    R.deck.push(cfg.smart ? offer.sort((a,b)=>(CARDS[b].tier)-(CARDS[a].tier))[0] : pick(offer));
    if (s===2 || s===4){ const ro = shuffle(RELICS.filter(k=>!R.relics.includes(k))).slice(0,3); const k = pick(ro); if (k==='bus') R.hearts++; else R.relics.push(k); }
  }
}
const N = 20000; const T = JSON.parse(process.argv[2] || '{"k":1,"bl":11,"bh":15,"sl":18,"sh":22}'); // standard = nuvarande balans
const rows = [];
for (const [name,base] of [['Smart',{smart:true}],['Slumpvis',{random:true}]])
  for (const acc of [1,.85,.7,.5]){
    const cfg = { ...base, acc, fast:.5, ...T }; let won=0, hearts=0, pens=0, matches=0, gd=0; const loss=[0,0,0,0,0,0], pl=[0,0,0,0,0,0];
    for (let i=0;i<N;i++){ const r = run(cfg); if (r.won){ won++; hearts += r.hearts; } pens+=r.pens; matches+=r.matches; gd+=r.gd; r.lossAt.forEach((v,k)=>loss[k]+=v); r.played.forEach((v,k)=>pl[k]+=v); }
    rows.push({ strategi:name, rätt:Math.round(acc*100)+'%', cupvinst:(100*won/N).toFixed(1)+'%', 'hjärtan kvar (vid vinst)':(hearts/Math.max(1,won)).toFixed(2), 'matchvinst per omgång': pl.map((p,k)=>p?Math.round(100*(1-loss[k]/p))+'%':'-').join(' '), straffar:(100*pens/matches).toFixed(0)+'%', 'målskillnad/match':(gd/matches).toFixed(2) });
  }
console.table(rows);
