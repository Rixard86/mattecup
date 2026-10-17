const _p = require('path'), _fs = require('fs'), OUT = _p.join(__dirname, 'out');
for (const d of ['', 'mob', 'vs']) _fs.mkdirSync(_p.join(OUT, d), { recursive:true });
process.chdir(OUT); // skärmbilder hamnar i tests/out
require('./devserver.js'); // startar lokal server på 8787 med falsk Upstash på 8788
// Två spelare mot lokal server: hel match, straffar, återanslutning och lämna
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8787/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
async function mk(b, name, vp, mobile){
  const ctx = await b.newContext({ viewport:vp, isMobile:!!mobile, hasTouch:!!mobile, deviceScaleFactor:1 });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(name + ': ' + e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(name + ' console: ' + m.text()); });
  await pg.goto(BASE); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await sleep(300);
  pg.tapOrClick = sel => mobile ? pg.tap(sel) : pg.click(sel);
  return pg;
}
async function solve(pg, ok){
  await pg.evaluate(ok => {
    if (!P || P.view !== 'solve') return;
    const p = P.prob;
    if (p.kind === 'column'){ const dg = digitsOf(p.ans + (ok ? 0 : 1), P.W); for (let j = 0; j < P.W; j++){ P.cursor = j; ACT.num({ d:String(dg[j]) }); } ACT.submit(); }
    else if (p.kind === 'choice') ACT.pickChoice({ k:String(ok ? p.correct : (p.correct + 1) % p.choices.length) });
    else { const v = canonical(p); v.forEach((x, k) => { P.field = k; const s = ok ? x : (x === '7' ? '8' : '7'); for (const ch of s.replace('-', '−')){ if (ch === '−') ACT.neg(); else ACT.num({ d:ch }); } }); ACT.submit(); }
  }, ok);
  await sleep(150);
  await pg.evaluate(() => { if (P && P.view === 'solution'){ while (P.revealed < P.steps.length) ACT.nextStep(); ACT.solDone(); } });
}
async function setup(A, B, aOpt, bOpt){
  for (const [pg, o] of [[A, aOpt], [B, bOpt]]){
    await pg.evaluate(() => ACT.vs()); await sleep(150);
    await pg.fill('#vsName', o.name);
    await pg.tapOrClick(`[data-act=vsLeague][data-l=${o.league}]`); await pg.tapOrClick(`[data-act=vsLevel][data-v="${o.level}"]`);
    await pg.tapOrClick(`[data-act=vsKit][data-k=${o.kit}]`);
  }
  await A.tapOrClick('[data-act=vsCreate]'); await A.waitForSelector('.bigcode');
  const code = await A.evaluate(() => VS.code);
  await B.fill('#vsCode', code.toLowerCase()); await B.tapOrClick('[data-act=vsJoin]');
  await A.waitForSelector('.offer .card', { timeout:8000 }); await B.waitForSelector('.offer .card');
  for (let r = 0; r < 4; r++){
    const pa = await A.evaluate(() => VS.draft.packs[VS.draft.round].cards.join(',')), pb = await B.evaluate(() => VS.draft.packs[VS.draft.round].cards.join(','));
    console.log('round', r + 1, pa, pa === pb ? 'SAME' : 'DIFFERENT ' + pb);
    for (const pg of [A, B]){ await pg.tapOrClick(`.offer .card[data-i="${Math.floor(Math.random() * 3)}"]`); await sleep(120); }
  }
  await A.waitForSelector('[data-act=vsKickoff]', { timeout:8000 }); await B.waitForSelector('[data-act=vsKickoff]', { timeout:8000 });
  const ra = await A.evaluate(() => ({ mine:VS.myP.picks.join(','), opp:VS.oppP.picks.join(','), deck:VS.deck.length })), rb = await B.evaluate(() => ({ mine:VS.myP.picks.join(','), opp:VS.oppP.picks.join(','), deck:VS.deck.length }));
  console.log('REVEAL ok', ra.opp === rb.mine && rb.opp === ra.mine, 'deck', ra.deck, rb.deck);
  await A.screenshot({ path:'vs/A_reveal.png' }); await B.screenshot({ path:'vs/B_reveal.png' });
  await A.tapOrClick('[data-act=vsKickoff]'); await B.tapOrClick('[data-act=vsKickoff]');
  await A.waitForFunction(() => screen === 'match', null, { timeout:8000 }); await B.waitForFunction(() => screen === 'match', null, { timeout:8000 });
  return code;
}
async function closeInfo(pg){ if (await pg.$('.infobox')) await pg.tapOrClick('.infobox .btn'); }
async function playTurns(pg, mode, acc, maxTurns = 99){
  let turns = 0;
  for (let guard = 0; guard < 3000; guard++){
    await closeInfo(pg);
    const st = await pg.evaluate(() => M ? { phase:M.phase, busy, waiting:M.waiting, turn:M.turn, P:!!P, hand:M.hand.map(id => CARDS[id].cost <= M.energy), pens:M.pens && M.pens.stage } : null);
    if (!st || st.phase === 'done') return st;
    if (st.phase === 'pens'){
      if (st.pens === 'aim'){ await pg.evaluate(() => penAim(Math.floor(Math.random() * 3), 0)); await sleep(150); }
      if (st.P) await solve(pg, Math.random() < acc);
      await sleep(250); continue;
    }
    if (st.busy || st.waiting){ await sleep(250); continue; }
    if (st.P){ await solve(pg, Math.random() < acc); await sleep(200); continue; }
    if (turns >= maxTurns) return st;
    const i = mode === 'idle' ? -1 : st.hand.findIndex(x => x);
    if (i < 0){ await pg.tapOrClick('[data-act=endTurn]'); turns++; await sleep(300); continue; }
    await pg.tapOrClick(`.hand .card[data-i="${i}"]`); await sleep(150);
    await solve(pg, Math.random() < acc); await sleep(250);
  }
  return 'guard';
}
const score = pg => pg.evaluate(() => M && { me:M.myGoals, opp:M.oppGoals, mc:M.myChance, oc:M.oppChance, phase:M.phase, result:M.result, pens:M.pens && [M.pens.me, M.pens.opp], turn:M.turn });
(async () => {
  const b = await chromium.launch();
  const A = await mk(b, 'A', { width:1180, height:820 }, false);
  const B = await mk(b, 'B', { width:390, height:664 }, true);
  // 1) hel match med kort
  const code = await setup(A, B, { name:'Ville', league:'CL', level:1, kit:'white' }, { name:'Elias<b>', league:'PL', level:0, kit:'yellow' });
  console.log('match 1 code', code);
  await A.screenshot({ path:'vs/A_turn1.png' }); await B.screenshot({ path:'vs/B_turn1.png' });
  const [ra, rb] = await Promise.all([playTurns(A, 'cards', .85), playTurns(B, 'cards', .75)]);
  await sleep(800);
  const sa = await score(A), sb = await score(B);
  console.log('A', JSON.stringify(sa)); console.log('B', JSON.stringify(sb));
  console.log('CONSISTENT', sa.me === sb.opp && sa.opp === sb.me && ({ win:'lose', lose:'win', draw:'draw' })[sa.result] === sb.result);
  await A.screenshot({ path:'vs/A_end.png' }); await B.screenshot({ path:'vs/B_end.png' });
  // 2) ingen spelar kort -> 0-0 -> straffar
  await A.tapOrClick('[data-act=vsAgain]'); await B.tapOrClick('[data-act=vsAgain]');
  await setup(A, B, { name:'Ville', league:'SL', level:2, kit:'blue' }, { name:'Elias', league:'PL', level:0, kit:'black' });
  const p2 = Promise.all([playTurns(A, 'idle', .6), playTurns(B, 'idle', .6)]);
  await A.waitForFunction(() => M && M.phase === 'pens', null, { timeout:120000 });
  await sleep(1500); await A.screenshot({ path:'vs/A_pens.png' }); await B.screenshot({ path:'vs/B_pens.png' });
  await p2; await sleep(800);
  const pa = await score(A), pb = await score(B);
  console.log('PENS A', JSON.stringify(pa)); console.log('PENS B', JSON.stringify(pb));
  console.log('PENS CONSISTENT', ({ win:'lose', lose:'win', draw:'draw' })[pa.result] === pb.result);
  await B.screenshot({ path:'vs/B_pens_end.png' });
  // 3) återanslutning: A laddar om mitt i matchen
  await A.tapOrClick('[data-act=vsAgain]'); await B.tapOrClick('[data-act=vsAgain]');
  await setup(A, B, { name:'Ville', league:'PL', level:0, kit:'blue' }, { name:'Elias', league:'PL', level:0, kit:'blue' });
  await Promise.all([playTurns(A, 'cards', 1, 2), playTurns(B, 'cards', 1, 2)]);
  await sleep(1500);
  const before = await score(A);
  await A.reload(); await sleep(500);
  console.log('resume button', !!(await A.$('[data-act=vsResume]')));
  await A.click('[data-act=vsResume]'); await A.waitForFunction(() => screen === 'match', null, { timeout:8000 }); await sleep(400);
  const after = await score(A);
  console.log('RESUME', JSON.stringify(before), '->', JSON.stringify(after), 'same', before.me === after.me && before.opp === after.opp && before.mc === after.mc && before.turn === after.turn);
  // 4) B lämnar -> A vinner på walkover
  await B.tapOrClick('[data-act=vsLeave]'); await B.tapOrClick('[data-act=vsLeave]');
  await A.waitForFunction(() => M && M.phase === 'done', null, { timeout:10000 });
  console.log('WALKOVER', JSON.stringify(await score(A)), await A.evaluate(() => M.walkover));
  await A.screenshot({ path:'vs/A_walkover.png' });
  console.log('B screen', await B.evaluate(() => screen));
  // 5) fel kod och full match
  await B.evaluate(() => ACT.vs()); await B.fill('#vsName', 'Elias'); await B.fill('#vsCode', 'QQQQ'); await B.tap('[data-act=vsJoin]'); await sleep(400);
  console.log('bad code msg:', await B.evaluate(() => vsForm.err));
  const st = await (await fetch('http://127.0.0.1:8787/__stats')).json(); console.log('redis cmds', st);
  console.log('ERRORS', errs);
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
