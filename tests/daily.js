const path = require('path'), fs = require('fs'), OUT = path.join(__dirname, 'out');
fs.mkdirSync(path.join(OUT, 'mob'), { recursive:true });
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const { chromium } = require('playwright');
const STEP_MS = 4000;
let fails = 0;
const expect = (ok, what) => { if (!ok) fails++; console.log(ok ? 'OK  ' : 'FEL ', what); };

function answerRight(){
  const p = P.prob;
  if (p.kind === 'choice'){ ACT.pickChoice({ k:String(p.correct) }); return; }
  if (p.kind === 'column'){ const dg = digitsOf(p.ans, P.W); for (let j = 0; j < P.W; j++){ P.cursor = j; ACT.num({ d:String(dg[j]) }); } ACT.submit(); return; }
  canonical(p).forEach((v, i) => { P.field = i; for (const ch of v.replace('-', '−')){ if (ch === '−') ACT.neg(); else ACT.num({ d:ch }); } });
  ACT.submit();
}

async function playDaily(pg){
  await pg.evaluate(() => ACT.daily());
  for (let i = 1; i <= 10; i++){
    await pg.waitForFunction(n => P && P.view === 'solve' && P.o.eyebrow.includes(`${n} av 10`), i, { timeout:STEP_MS });
    await pg.evaluate(answerRight);
  }
  await pg.waitForFunction(() => screen === 'dailyDone', null, { timeout:STEP_MS });
}

async function flow(pg){
  await pg.evaluate(() => { localStorage.clear(); }); await pg.reload();
  expect(await pg.evaluate(() => !!document.querySelector('[data-act=daily].gold')), 'Dagens träning syns på startsidan');
  await pg.evaluate(answerRight.toString().replace('function answerRight', 'window.answerRight = function'));
  await playDaily(pg);
  const s = await pg.evaluate(() => ({ streak:save.daily.streak, n:save.days[dayKey()].n, r:save.days[dayKey()].r, text:document.body.textContent }));
  expect(s.streak === 1 && s.n === 10 && s.r === 10 && s.text.includes('10 av 10'), `10 tal klara, svit 1 (svit ${s.streak}, idag ${s.n} tal)`);
  await pg.evaluate(() => go('title'));
  expect(await pg.evaluate(() => document.querySelector('[data-act=daily]').textContent.includes('Klar idag · 1 dag i rad')), 'startsidan visar Klar idag');
}

async function streaks(pg){
  const r = await pg.evaluate(() => {
    save.daily = { last:dayKey(1), streak:4, best:4 }; finishDaily(); const a = { ...save.daily };
    save.daily = { last:dayKey(3), streak:7, best:7 }; finishDaily(); const b = { ...save.daily };
    finishDaily(); const c = { ...save.daily };
    return { a, b, c };
  });
  expect(r.a.streak === 5 && r.a.best === 5, 'igår + idag ger svit 5');
  expect(r.b.streak === 1 && r.b.best === 7, 'missad dag nollställer sviten men bästa svit finns kvar');
  expect(r.c.streak === 1, 'två gånger samma dag räknas en gång');
}

async function weakAndReport(pg){
  const w = await pg.evaluate(() => {
    Object.values(save.skills).forEach(k => Object.assign(k, { box:1, right:0, wrong:0 }));
    Object.assign(save.skills['A3.2'], { box:1, wrong:5, right:1 }); Object.assign(save.skills['B2.1'], { box:2, wrong:1, right:3 });
    Object.assign(save.skills['A1.1'], { box:5, right:12 });
    return weakSections().map(s => s.code);
  });
  expect(w.join() === 'A3.2,B2.1,A1.1', `svagaste avsnitten väljs först och bara de som räknats (${w.join(', ')})`);
  await pg.evaluate(() => go('adults'));
  const rep = await pg.evaluate(() => ({ has:document.body.textContent.includes('Senaste veckan'), rows:document.querySelectorAll('h3 + p + .tablewrap tbody tr').length,
    today:document.querySelector('h3 + p + .tablewrap tbody tr').textContent }));
  expect(rep.has && rep.rows === 7 && rep.today.includes('idag') && rep.today.includes('10'), `veckorapporten visar 7 dagar och dagens 10 tal (${rep.today})`);
}

async function shots(b){
  for (const [w, h, dir] of [[1180, 820, ''], [360, 740, 'mob']]){
    const pg = await b.newPage({ viewport:{ width:w, height:h } });
    await pg.goto(GAME);
    await pg.evaluate(() => { save.daily = { last:dayKey(1), streak:3, best:5 }; go('title'); });
    await pg.screenshot({ path:path.join(OUT, dir, `daily_title_${w}.png`) });
    await pg.evaluate(() => { save.days[dayKey()] = { n:12, r:10, s:{ 'A3.2':[4, 6], 'A2.1':[6, 6] } }; save.days[dayKey(2)] = { n:8, r:5, s:{ 'A3.2':[5, 8] } }; go('adults'); });
    await pg.screenshot({ path:path.join(OUT, dir, `daily_report_${w}.png`), fullPage:true });
    await pg.close();
  }
}

(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport:{ width:1180, height:820 } }), errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(GAME);
  await flow(pg);
  await streaks(pg);
  await weakAndReport(pg);
  await shots(b);
  expect(!errs.length, 'inga sidfel ' + errs.join('; '));
  await b.close();
  console.log(fails ? `daily: ${fails} fel` : 'daily: alla OK');
  process.exit(fails ? 1 : 0);
})();
