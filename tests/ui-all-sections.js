const _p = require('path'), _fs = require('fs'), OUT = _p.join(__dirname, 'out');
for (const d of ['', 'mob', 'vs']) _fs.mkdirSync(_p.join(OUT, d), { recursive:true });
process.chdir(OUT); // skärmbilder hamnar i tests/out
const path = require('path');
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport:{width:1180,height:820}, hasTouch:true });
  const errs=[]; pg.on('pageerror', e=>errs.push(e.message)); pg.on('console', m=>{ if(m.type()==='error' && !/ERR_FILE|404/.test(m.text())) errs.push(m.text()); });
  await pg.goto(GAME);
  const res = await pg.evaluate(() => {
    const out = { ok:0, bad:[] };
    for (const s of CURRICULUM) for (let d = 1; d <= 4; d++) for (let rep = 0; rep < 6; rep++){
      try {
        let done = null;
        openProblem({ code:s.code, tier:d, cancel:true, clock:true, onDone:r => { done = r; } });
        const p = P.prob;
        if (!modal.innerHTML.includes('pm-head')) throw new Error('no render');
        const correct = rep % 2 === 0;
        if (p.kind === 'column'){
          const dg = digitsOf(correct ? p.ans : p.ans + 1, P.W);
          for (let j = 0; j < P.W; j++){ P.cursor = j; ACT.num({ d:String(dg[j]) }); }
          ACT.hint(); ACT.submit();
        } else if (p.kind === 'choice'){
          ACT.hint(); ACT.pickChoice({ k: String(correct ? p.correct : (p.correct + 1) % p.choices.length) });
        } else {
          const can = canonical(p);
          can.forEach((v, i) => { P.field = i; const str = correct ? v : (i === 0 ? String(parseNum(v) + 7) : v);
            for (const ch of str.replace('-', '−')){ if (ch === '−') ACT.neg(); else ACT.num({ d:ch }); } });
          ACT.hint(); ACT.submit();
        }
        if (correct && P && P.view !== 'right') throw new Error('correct not accepted: ' + JSON.stringify(P.vals || P.ans) + ' exp ' + JSON.stringify(canonical(p)));
        if (!correct){
          if (!P || P.view !== 'solution') throw new Error('wrong not rejected');
          while (P.revealed < P.steps.length) ACT.nextStep();
          if (!modal.innerHTML.includes('Svaret är')) throw new Error('no final answer');
          ACT.solDone();
        } else { closeProblem({ correct:true }); }
        out.ok++;
      } catch (e){ out.bad.push(s.code + ' d' + d + ': ' + e.message); P = null; modal.hidden = true; }
    }
    return out;
  });
  console.log('rendered+answered:', res.ok, 'failures:', res.bad.length); res.bad.slice(0, 15).forEach(x => console.log(' -', x));
  console.log('ERRORS', errs.slice(0, 5));
  await b.close();
})();
