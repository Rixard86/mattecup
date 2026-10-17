const path = require('path'), fs = require('fs'), OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive:true });
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const { chromium } = require('playwright');

const SETTLE_MS = 25000, MIN_GAP_MS = 1500;
const CASES = [
  { tag:'kort-3-mål', mine:true, goals:3, setup:'M.oppGuard = 0; M.myChance = M.thrMe - 1; M.buffNext = 2 * M.thrMe; applyCard(CARDS.sesko, { correct:true, fast:false });' },
  { tag:'anfall-3-mål', mine:false, goals:3, setup:"M.oppChance = M.thrOpp - 1; M.mur = 0; M.intent = { atk:2 * M.thrOpp + 1, def:0, label:'Anfall' }; endTurn();" },
  { tag:'superanfall-2-mål', mine:false, goals:2, setup:"M.oppChance = 0; M.mur = 0; M.intent = { atk:2 * M.thrOpp + 1, def:0, label:'Superanfall' }; endTurn();" },
  { tag:'deligt-1-mål', mine:true, goals:1, setup:'M.oppGuard = 0; M.myChance = M.thrMe - 1; applyCard(CARDS.deligt, { correct:true, fast:false });' },
  { tag:'frusen-animation-3-mål', mine:true, goals:3, instant:true, setup:'window.requestAnimationFrame = () => 0; M.oppGuard = 0; M.myChance = M.thrMe - 1; M.buffNext = 2 * M.thrMe; applyCard(CARDS.sesko, { correct:true, fast:false });' },
];

async function runCase(pg, c){
  await pg.evaluate(() => {
    newRun('PL', 0); startMatch(); M.hand = [];
    window.__goals = []; const orig = window.__origGoalFx || goalFx; window.__origGoalFx = orig;
    window.goalFx = mine => { window.__goals.push({ mine, me:M.myGoals, opp:M.oppGoals, at:performance.now() }); orig(mine); };
    render();
  });
  await pg.waitForTimeout(800);
  await pg.evaluate(c.setup);
  await pg.waitForFunction(() => !busy, null, { timeout:SETTLE_MS });
  await pg.screenshot({ path:path.join(OUT, `G_${c.tag}.png`) });
  return pg.evaluate(() => ({ shown:window.__goals, me:M.myGoals, opp:M.oppGoals }));
}

function check(c, r){
  const errs = [], final = c.mine ? r.me : r.opp;
  if (r.shown.length !== c.goals) errs.push(`visade ${r.shown.length} mål, väntade ${c.goals}`);
  if (final !== c.goals) errs.push(`ställningen ${final}, väntade ${c.goals}`);
  r.shown.forEach((g, i) => {
    if (g.mine !== c.mine) errs.push(`mål ${i + 1} fel lag`);
    if ((c.mine ? g.me : g.opp) !== i + 1) errs.push(`mål ${i + 1} visade ställningen ${c.mine ? g.me : g.opp}`);
    if (i && !c.instant && g.at - r.shown[i - 1].at < MIN_GAP_MS) errs.push(`mål ${i + 1} kom för tätt efter förra`);
  });
  return errs;
}

(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport:{ width:1180, height:820 } });
  const pageErrs = []; pg.on('pageerror', e => pageErrs.push(e.message));
  await pg.goto(GAME);
  let fails = 0;
  for (const c of CASES){
    const errs = check(c, await runCase(pg, c));
    fails += errs.length;
    console.log(errs.length ? 'FEL ' : 'OK  ', c.tag, errs.join('; '));
  }
  if (pageErrs.length){ fails++; console.log('SIDFEL', pageErrs); }
  await b.close();
  console.log(fails ? `multi-goal: ${fails} fel` : 'multi-goal: alla OK');
  process.exit(fails ? 1 : 0);
})();
