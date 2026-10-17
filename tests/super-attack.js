const _p = require('path'), _fs = require('fs'), OUT = _p.join(__dirname, 'out');
for (const d of ['', 'mob', 'vs']) _fs.mkdirSync(_p.join(OUT, d), { recursive:true });
process.chdir(OUT); // skärmbilder hamnar i tests/out
const path = require('path');
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport:{width:1180,height:820} });
  const errs=[]; pg.on('pageerror', e=>errs.push(e.message));
  await pg.goto(GAME);
  for (const [tag, mur] of [['goal', 0], ['wall', 40], ['save', 8]]){
    await pg.evaluate((mur) => { newRun('PL', 0); R.stage = 5; startMatch(); M.turn = 3; M.hand = []; M.intent = { atk:15, def:0, label:'Superanfall' }; M.mur = mur; render(); }, mur);
    await pg.waitForTimeout(900);
    if (tag === 'goal') await pg.screenshot({ path:'S_warn.png' });
    await pg.evaluate(() => endTurn());
    const times = tag === 'goal' ? [700, 1500, 2600, 3150, 3500] : [3150, 3500];
    let t = 0;
    for (const at of times){ await pg.waitForTimeout(at - t); t = at; await pg.screenshot({ path:`S_${tag}_${at}.png` }); }
    await pg.waitForTimeout(6000);
    console.log(tag, await pg.evaluate(() => JSON.stringify({ busy, turn:M.turn, oppGoals:M.oppGoals, super:!!F.super, parts:F.parts.length })));
  }
  console.log('ERRORS', errs);
  await b.close();
})();
