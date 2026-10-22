const path = require('path'), fs = require('fs'), OUT = path.join(__dirname, 'out');
fs.mkdirSync(path.join(OUT, 'mob'), { recursive:true });
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const { chromium } = require('playwright');
const SAVE_KEY = 'unitedMattecup.v2', CODE = 'B3.2', BOOK = 'CL', SQUAD = 11, FAST = 40, RIGHT_SHARE = .85;
const CUP_MS = 400000, POLL_MS = 40, BUSY_MS = 120;
const VIEWS = [[1180, 820, ''], [820, 1180, ''], [744, 744, ''], [390, 844, 'mob'], [844, 390, 'mob']];
let fails = 0;
const expect = (ok, what) => { if (!ok) fails++; console.log(ok ? 'OK  ' : 'FEL ', what); };

async function teamsCheck(pg){
  const r = await pg.evaluate(n => {
    const W = TEAMS.WC, clubs = Object.entries(TEAMS).filter(([k]) => k !== 'WC').flatMap(([, l]) => l.map(t => t.name));
    return { n:W.length, bad:W.filter(t => t.players.length !== n || !t.color || !t.text || !t.short).map(t => t.name),
      unique:new Set(W.map(t => t.name)).size, clash:W.filter(t => clubs.includes(t.name)).map(t => t.name) };
  }, SQUAD);
  expect(!r.bad.length && r.unique === r.n, `${r.n} landslag med ${SQUAD} spelare och unika namn ${r.bad.join(', ')}`);
  expect(!r.clash.length, 'inga landslag delar namn med klubblag ' + r.clash.join(', '));
}

async function pickFlow(pg){
  await pg.evaluate(k => { localStorage.clear(); localStorage.setItem(k, JSON.stringify({ seen:{ mur:true } })); }, SAVE_KEY);
  await pg.reload();
  await pg.evaluate(() => go('leagues'));
  expect(await pg.locator('.league.wc').count() === 1, 'World Cup finns bland ligorna');
  await pg.click('.league.wc [data-act=wcPick]');
  expect(await pg.evaluate(() => screen === 'wcpick'), 'knappen öppnar avsnittsvalet');
  await pg.click(`[data-act=wcBook][data-l=${BOOK}]`);
  const shown = await pg.$$eval('.seclist .scode', els => els.map(e => e.textContent));
  const want = await pg.evaluate(b => leagueOf(b).levels.flatMap((lv, i) => levelSections(b, i)).map(s => secLabel(s.code)), BOOK);
  expect(JSON.stringify(shown) === JSON.stringify(want), `fliken Beta visar alla ${want.length} avsnitt i Beta`);
  const idx = await pg.evaluate(c => CURRICULUM.findIndex(s => s.code === c), CODE);
  await pg.click(`.sec[data-l=WC][data-v="${idx}"]`);
  const r = await pg.evaluate(() => ({ screen, league:R.league, level:R.level, opps:R.opps.map(o => o.name),
    stages:R.opps.map(o => o.stage), eyebrow:document.querySelector('.eyebrow').textContent, wc:TEAMS.WC.map(t => t.name) }));
  expect(r.screen === 'map' && r.league === 'WC' && r.level === idx, `${CODE} startar en World Cup`);
  expect(r.eyebrow.includes('World Cup') && r.eyebrow.includes(CODE.replace(/^./, m => m + ' ')), 'cupvägen visar valt avsnitt: ' + r.eyebrow);
  expect(r.opps.every(n => r.wc.includes(n)), 'alla motståndare är landslag: ' + r.opps.join(', '));
  expect(r.stages[0] === 'Gruppspel 1' && r.stages[5] === 'Final', 'omgångarna heter som i VM: ' + r.stages.join(', '));
  await pg.screenshot({ path:path.join(OUT, 'wc_map.png') });
  return idx;
}

async function resumeFlow(pg){
  await pg.reload();
  const t = await pg.evaluate(() => document.querySelector('[data-act=continueRun] small').textContent);
  const name = await pg.evaluate(c => SECTIONS[c].name, CODE);
  expect(t.includes('World Cup') && t.includes(name), 'pågående World Cup kan fortsättas efter omladdning: ' + t);
  await pg.evaluate(() => ACT.continueRun());
}

async function libraryFlow(pg){
  const heads = await pg.evaluate(() => { libView = 'teams'; go('library'); return [...document.querySelectorAll('.panelbox h3')].map(h => h.textContent); });
  expect(heads.some(h => h.startsWith('World Cup')), 'biblioteket visar landslagen: ' + heads.join(' | '));
  await pg.evaluate(() => go('map'));
}

function step(share){
  const p = P && P.prob;
  if (P && P.view === 'solve'){
    window.wcSkills = (window.wcSkills || []).concat(p.skill);
    const ok = Math.random() < share;
    if (p.kind === 'column'){ const dg = digitsOf(ok ? p.ans : p.ans + 1, P.W); for (let j = 0; j < P.W; j++){ P.cursor = j; ACT.num({ d:String(dg[j]) }); } ACT.submit(); }
    else if (p.kind === 'choice') ACT.pickChoice({ k:String(ok ? p.correct : (p.correct + 1) % p.choices.length) });
    else { canonical(p).forEach((v, i) => { P.field = i; const s = ok ? v : String(parseNum(v) + 3); for (const ch of s.replace('-', '−')){ if (ch === '−') ACT.neg(); else ACT.num({ d:ch }); } }); ACT.submit(); }
    return 'solve';
  }
  if (P && P.view === 'solution'){ while (P.revealed < P.steps.length) ACT.nextStep(); ACT.solDone(); return 'sol'; }
  if (P) return 'right';
  if (screen === 'map'){ startMatch(); return 'map'; }
  if (screen === 'reward'){ ACT.pickCard({ i:'0' }); return 'reward'; }
  if (screen === 'relic'){ ACT.pickRelic({ i:'0' }); return 'relic'; }
  if (screen === 'victory' || screen === 'gameover') return 'END';
  if (screen !== 'match') return screen;
  if (M.phase === 'done'){ afterMatch(); return 'after'; }
  if (busy) return 'busy';
  if (M.phase === 'pens'){ if (M.pens.stage === 'aim'){ penAim(rnd(0, 2), rnd(0, 1)); return 'pen'; } if (M.pens.stage === 'save'){ penDive(rnd(0, 2)); return 'dive'; } return 'busy'; }
  const i = M.hand.findIndex(id => CARDS[id].cost <= M.energy);
  if (i >= 0){ playCard(i); return 'play'; }
  endTurn(); return 'end';
}

async function playCup(pg){
  await pg.evaluate(f => { F.speed = f; window.wcSkills = []; }, FAST);
  const t0 = Date.now(); let st = '';
  while (st !== 'END' && Date.now() - t0 < CUP_MS){
    st = await pg.evaluate(step, RIGHT_SHARE);
    await pg.waitForTimeout(st === 'busy' ? BUSY_MS : POLL_MS);
  }
  const r = await pg.evaluate(() => ({ screen, skills:[...new Set(window.wcSkills)], n:window.wcSkills.length, stage:R.stage }));
  expect(st === 'END', `cupen spelades till slut (${r.screen} i omgång ${r.stage + 1})`);
  expect(r.n > 0 && r.skills.length === 1 && r.skills[0] === CODE, `alla ${r.n} tal i cupen kom från ${CODE}: ${r.skills.join(', ')}`);
}

async function winFlow(pg, idx){
  await pg.evaluate(i => { F.speed = 1; newRun('WC', i); R.stage = 5; finishRun(true); }, idx);
  const r = await pg.evaluate(i => ({ screen, unlocked:R.unlocked, won:save.prog.WC.won[i], got:Object.keys(save.trophies), text:app.textContent }), idx);
  expect(r.screen === 'victory' && r.unlocked === null && r.text.includes('United vann World Cup'), 'vinst i World Cup låser inte upp någon nivå');
  expect(r.won && !r.got.includes('hard') && !r.got.includes('treble'), 'vinsten sparas utan troféerna Svårast av alla och Trebeln');
  await pg.screenshot({ path:path.join(OUT, 'wc_victory.png') });
  await pg.evaluate(() => ACT.again());
  expect(await pg.evaluate(i => R.league === 'WC' && R.level === i && screen === 'map', idx), 'Spela igen startar samma avsnitt');
}

async function sizes(b){
  for (const [w, h, dir] of VIEWS){
    const pg = await b.newPage({ viewport:{ width:w, height:h } });
    await pg.goto(GAME);
    for (const s of ['leagues', 'wcpick']){
      const over = await pg.evaluate(x => { go(x); return Math.max(...[document.documentElement, ...document.querySelectorAll('.screen, .wrap')].map(e => e.scrollWidth - e.clientWidth)); }, s);
      expect(over <= 0, `${s} ryms på bredden ${w} × ${h}`);
      await pg.screenshot({ path:path.join(OUT, dir, `wc_${s}_${w}x${h}.png`), fullPage:true });
    }
    await pg.close();
  }
}

(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport:{ width:1180, height:820 } }), errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(GAME);
  await teamsCheck(pg);
  const idx = await pickFlow(pg);
  await resumeFlow(pg);
  await libraryFlow(pg);
  await playCup(pg);
  await winFlow(pg, idx);
  await sizes(b);
  expect(!errs.length, 'inga sidfel ' + errs.join('; '));
  await b.close();
  console.log(fails ? `world-cup: ${fails} fel` : 'world-cup: alla OK');
  process.exit(fails ? 1 : 0);
})();
