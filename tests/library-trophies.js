const path = require('path'), fs = require('fs'), OUT = path.join(__dirname, 'out');
fs.mkdirSync(path.join(OUT, 'mob'), { recursive:true });
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const { chromium } = require('playwright');
const SAVE_KEY = 'unitedMattecup.v2', SETTLE_MS = 20000;
let fails = 0;
const expect = (ok, what) => { if (!ok) fails++; console.log(ok ? 'OK  ' : 'FEL ', what); };

async function fresh(pg, saveData){
  await pg.evaluate(([k, s]) => { localStorage.clear(); if (s) localStorage.setItem(k, JSON.stringify(s)); }, [SAVE_KEY, saveData]);
  await pg.reload();
}
const unknownCount = (pg, tab) => pg.evaluate(t => { libView = t; go('library'); return document.querySelectorAll('.card.unknown, .libteam.unknown, .level.unknown').length; }, tab);

async function scoreGoals(pg, setup){
  await pg.evaluate(setup);
  await pg.waitForFunction(() => !busy, null, { timeout:SETTLE_MS });
}

async function libraryFlow(pg){
  await fresh(pg, { seen:{ mur:true } });
  expect(await pg.evaluate(() => trophyCount() === 0 && document.body.textContent.includes('Bibliotek')), 'ny spelare: 0 troféer och knappen Bibliotek finns');
  const nCards = await pg.evaluate(() => Object.keys(CARDS).length), nStart = await pg.evaluate(() => START_DECK.length);
  expect(await unknownCount(pg, 'cards') === nCards, `alla ${nCards} kort dolda från början`);
  expect(await unknownCount(pg, 'teams') === 116, 'alla 116 lag dolda från början');
  expect(await unknownCount(pg, 'relics') === 8, 'all utrustning dold från början');
  const opp = await pg.evaluate(() => { newRun('PL', 0); startMatch(); return M.opp.name; });
  expect(await unknownCount(pg, 'teams') === 115 && await pg.evaluate(n => save.lib.teams.includes(n), opp), `mött lag visas: ${opp}`);
  expect(await unknownCount(pg, 'cards') === nCards - nStart, 'startkorten visas efter första matchen');
  await pg.evaluate(() => { R.stage = 2; toRelicOrMap(); });
  expect(await unknownCount(pg, 'relics') === 5, 'tre erbjudna utrustningar visas');
}

async function trophyFlow(pg){
  await pg.evaluate(() => { newRun('PL', 0); startMatch(); M.hand = []; });
  await pg.waitForTimeout(600);
  await scoreGoals(pg, () => { M.oppGuard = 0; M.myChance = M.thrMe - 1; M.buffNext = 2 * M.thrMe; applyCard(CARDS.sesko, { correct:true, fast:true }); });
  await pg.evaluate(() => endMatch(true));
  const got = await pg.evaluate(() => Object.keys(save.trophies));
  for (const id of ['goal1', 'win1', 'clean', 'double', 'hattrick']) expect(got.includes(id), `trofé ${id} efter 3 mål på ett kort och vinst`);
  expect(!got.includes('margin'), 'Kanonmatch kräver fyra måls marginal');
  expect(await pg.evaluate(() => document.querySelectorAll('.trophyban').length >= 1), 'trofébanner visas');
  await pg.evaluate(() => { newRun('PL', 0); startMatch(); M.hand = []; M.turn = M.maxTurns; startTurn(); M.hand = []; M.answered = 6; M.behind = 2; });
  await pg.waitForTimeout(600);
  await scoreGoals(pg, () => { M.oppGuard = 0; M.myChance = M.thrMe - 1; applyCard(CARDS.sesko, { correct:true, fast:false }); });
  await pg.evaluate(() => fullTime());
  const got2 = await pg.evaluate(() => Object.keys(save.trophies));
  for (const id of ['fergie', 'perfect', 'comeback']) expect(got2.includes(id), `hemlig trofé ${id}`);
  await pg.evaluate(() => go('trophies'));
  const view = await pg.evaluate(() => ({
    secretOn: document.querySelectorAll('.trophy.secret.on').length,
    secretOff: [...document.querySelectorAll('.trophy.secret:not(.on)')].map(e => ({ text:!!e.querySelector('.ttext, .tbar'), name:e.querySelector('b').textContent })),
    total: document.querySelectorAll('.trophy').length }));
  expect(view.total === 30, '30 troféer i skåpet');
  expect(view.secretOn === 4, 'fyra upplåsta hemliga troféer har eget utseende');
  expect(view.secretOff.length === 1 && !view.secretOff[0].text && view.secretOff[0].name === 'Hemlig trofé', 'låst hemlig trofé saknar beskrivning och mätare');
  await pg.reload();
  expect(await pg.evaluate(() => trophyCount()) === got2.length, 'troféer sparas efter omladdning');
}

async function oldSave(pg){
  await fresh(pg, { seen:{ mur:true }, stats:{ runs:4, cups:1, right:150, total:170 } });
  const r = await pg.evaluate(() => ({ got:Object.keys(save.trophies), ban:document.querySelectorAll('.trophyban').length }));
  expect(r.got.includes('cup1') && r.got.includes('right100') && r.ban === 0, 'gammal sparfil: troféer låses upp tyst vid start');
}

async function shots(b){
  for (const [w, h, dir] of [[1180, 820, ''], [360, 672, 'mob']]){
    const pg = await b.newPage({ viewport:{ width:w, height:h } });
    await pg.goto(GAME);
    await pg.evaluate(() => { save.stats.runs = 1; save.lib.teams.push(TEAMS.PL[0].name, TEAMS.SL[3].name); save.lib.relics.push('boots');
      save.trophies = { goal1:1, cup1:1, fergie:1 }; save.stats.goals = 23; });
    for (const tab of ['cards', 'teams', 'relics']){
      await pg.evaluate(t => { libView = t; go('library'); const d = document.querySelector('details.libteam'); if (d) d.open = true; }, tab);
      await pg.screenshot({ path:path.join(OUT, dir, `lib_${tab}_${w}.png`), fullPage:true });
    }
    await pg.evaluate(() => go('trophies'));
    await pg.screenshot({ path:path.join(OUT, dir, `trophies_${w}.png`) });
    await pg.close();
  }
}

(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport:{ width:1180, height:820 } }), errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(GAME);
  await libraryFlow(pg);
  await trophyFlow(pg);
  await oldSave(pg);
  await shots(b);
  expect(!errs.length, 'inga sidfel ' + errs.join('; '));
  await b.close();
  console.log(fails ? `library-trophies: ${fails} fel` : 'library-trophies: alla OK');
  process.exit(fails ? 1 : 0);
})();
