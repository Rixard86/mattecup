const _p = require('path'), _fs = require('fs'), OUT = _p.join(__dirname, 'out');
for (const d of ['', 'mob', 'vs']) _fs.mkdirSync(_p.join(OUT, d), { recursive:true });
process.chdir(OUT); // skärmbilder hamnar i tests/out
const path = require('path');
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport:{width:1180,height:820}, hasTouch:true });
  const errs=[]; pg.on('pageerror', e=>errs.push(e.message)); pg.on('console', m=>{ if(m.type()==='error' && !/ERR_FILE/.test(m.text())) errs.push(m.text()); });
  await pg.goto(GAME);
  const runOne = async (lg, lv) => {
    const pg = await b.newPage({ viewport:{width:1180,height:820}, hasTouch:true });
    pg.on('pageerror', e=>errs.push(lg+': '+e.message));
    await pg.goto(GAME);
    await pg.evaluate(([lg, lv]) => { F.speed = 40; save.prog[lg].open = 3; newRun(lg, lv); }, [lg, lv]);
    const t0 = Date.now(); let last = '', stuck = 0;
    while (Date.now() - t0 < 560000){
      const st = await pg.evaluate(() => {
        const solve = ok => { const p = P.prob;
          if (p.kind === 'column'){ const dg = digitsOf(ok ? p.ans : p.ans + 1, P.W); for (let j = 0; j < P.W; j++){ P.cursor = j; ACT.num({ d:String(dg[j]) }); } ACT.submit(); }
          else if (p.kind === 'choice') ACT.pickChoice({ k:String(ok ? p.correct : (p.correct + 1) % p.choices.length) });
          else { canonical(p).forEach((v, i) => { P.field = i; const s = ok ? v : String(parseNum(v) + 3); for (const ch of s.replace('-', '−')){ if (ch === '−') ACT.neg(); else ACT.num({ d:ch }); } }); ACT.submit(); } };
        if (P){ if (P.view === 'solve'){ solve(Math.random() < .85); return 'solve'; } if (P.view === 'solution'){ while (P.revealed < P.steps.length) ACT.nextStep(); ACT.solDone(); return 'sol'; } return 'right'; }
        if (screen === 'map'){ startMatch(); return 'map'; }
        if (screen === 'reward'){ ACT.pickCard({ i:'0' }); return 'reward'; }
        if (screen === 'relic'){ ACT.pickRelic({ i:'0' }); return 'relic'; }
        if (screen === 'victory' || screen === 'gameover') return 'END:' + screen + ' ' + JSON.stringify({ league:R.league, level:R.level, opps:R.opps.map(o => o.name), hearts:R.hearts, right:R.right, total:R.total, unlocked:R.unlocked });
        if (screen === 'match'){
          if (M.phase === 'done'){ afterMatch(); return 'after'; }
          if (busy) return 'busy:' + M.turn + ':' + F.steps.length;
          if (M.phase === 'pens'){ if (M.pens.stage === 'aim'){ penAim(rnd(0, 2), rnd(0, 1)); return 'pen'; } if (M.pens.stage === 'save'){ penDive(rnd(0, 2)); return 'dive'; } return 'penwait'; }
          if (M.turn === 6 && Math.random() < .3) M.oppGoals = M.myGoals;
          const i = M.hand.findIndex(id => CARDS[id].cost <= M.energy);
          if (i >= 0 && Math.random() < .9){ playCard(i); return 'play'; }
          endTurn(); return 'end';
        }
        return screen;
      });
      if (st.startsWith('END')){ console.log(st); break; }
      if (st === last && st.startsWith('busy')) stuck++; else stuck = 0; last = st;
      if (stuck > 80){ console.log('STUCK', st); break; }
      if (Date.now() - t0 >= 559000) console.log('TIMEOUT at', await pg.evaluate(() => JSON.stringify({ screen, stage:R && R.stage, turn:M && M.turn })));
      await pg.waitForTimeout(st.startsWith('busy') || st === 'penwait' ? 120 : 40);
    }
      await pg.close();
  };
  await Promise.all([runOne('PL',0), runOne('CL',1), runOne('SL',2)]);
  console.log('ERRORS', errs.slice(0, 5));
  // screenshots
  await pg.evaluate(() => { F.speed = 1; go('leagues'); }); await pg.waitForTimeout(300); await pg.screenshot({ path:'L_leagues.png', fullPage:false });
  const shots = [['A3.1',3],['A3.5',3],['A4.5',1],['B3.2',2],['G2.2',1],['A5.4',3],['A3.4',2],['G2.6',3],['B4.2',3]];
  for (const [c, d] of shots){ await pg.evaluate(([c, d]) => { if (P) ACT.cancel(); openProblem({ code:c, tier:d, cancel:true, clock:true, title:'Räkna rätt för full effekt', eyebrow:'Mbeumo · Skott' }); if (P.prob.kind === 'input'){ ACT.num({ d:'1' }); } }, [c, d]); await pg.waitForTimeout(250); await pg.screenshot({ path:`L_${c}.png` }); }
  await pg.evaluate(() => { ACT.cancel(); openProblem({ code:'B3.4', tier:3 }); const p = P.prob; canonical(p).forEach((v,i)=>{P.field=i; for (const ch of String(parseNum(v)+2)) ACT.num({d:ch});}); ACT.submit(); ACT.nextStep(); ACT.nextStep(); });
  await pg.waitForTimeout(250); await pg.screenshot({ path:'L_solution.png' });
  await pg.evaluate(() => { ACT.cancel(); go('train'); }); await pg.waitForTimeout(250); await pg.screenshot({ path:'L_train.png' });
  const pp = await b.newPage({ viewport:{ width:820, height:1180 }, hasTouch:true });
  await pp.goto(GAME);
  await pp.evaluate(() => { go('leagues'); }); await pp.waitForTimeout(200); await pp.screenshot({ path:'L_leagues_port.png' });
  await pp.evaluate(() => { openProblem({ code:'A3.2', tier:4, clock:true }); ACT.num({ d:'1' }); }); await pp.waitForTimeout(200); await pp.screenshot({ path:'L_A3.2_port.png' });
  await b.close();
})();
