const path = require('path'), fs = require('fs'), OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive:true });
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const { chromium } = require('playwright');

const SCREENS = [[1180, 820], [820, 1180], [1133, 744], [744, 1133], [1024, 1366], [390, 664], [844, 360]];
const IPAD_MIN = 744;

function flow(){
  const res = [], ok = (cond, tag) => res.push([!!cond, tag]);
  const open = () => { do openProblem({ code:'G1.4', tier:3, clock:true, retry:true, onDone(){} }); while (!P.prob.rows); };
  const type = row => P.steps.filter(s => s.row === row).forEach(s => {
    const W = P.W, o0 = row * W;
    if (P.cells.includes(o0 + s.col)){ P.cursor = o0 + s.col; ACT.num({ d:String(s.digit) }); }
    if (s.extra){ P.cursor = o0 + s.extra.col; ACT.num({ d:String(s.extra.digit) }); }
  });
  open();
  const W = P.W;
  ok(modal.querySelector('.grid.long'), 'uppställningen har två delrader');
  ok(P.cursor === W, 'markören börjar på entalen i rad 1');
  ok(P.ans[2 * W] === '0' && !modal.querySelector(`.ans[data-j="${2 * W}"]`), 'nollan i rad 2 står redan där och går inte att ändra');
  ACT.num({ d:'7' }); ACT.carry({ j:'1' });
  ok(P.carries[1] === 1, 'minnessiffra går att sätta');
  P.cursor = W; ACT.back();
  type(1);
  ok(Math.floor(P.cursor / W) === 2 && P.carries.every(c => c === 0), 'markören går vidare till rad 2 och minnessiffrorna töms');
  type(2);
  ok(P.cursor === 0, 'efter rad 2 kommer svarsraden');
  ACT.hint();
  ok(/lägg ihop/.test(P.hintText), 'tipset i svarsraden handlar om att lägga ihop raderna');
  type(0); ACT.submit();
  ok(P.view === 'right', 'rätt svar godkänns');
  closeProblem({ correct:true });
  open();
  type(1); ACT.submit();
  ok(P.view === 'solve' && /svarsraden/.test(P.msg), 'tom svarsrad ger meddelande');
  const wrong = () => { const dg = digitsOf(P.prob.ans + 1, P.W); for (let j = 0; j < P.W; j++){ P.cursor = j; ACT.num({ d:String(dg[j]) }); } ACT.submit(); };
  wrong();
  const W2 = P.W;
  ok(P.view === 'solve' && P.ans.every((v, i) => v === '' || (i === 2 * W2 && v === '0')) && P.cursor === W2, 'första felet tömmer rutorna men behåller nollan');
  wrong();
  ok(P.view === 'solution', 'fel svar ger genomgång');
  while (P.revealed < P.steps.length) ACT.nextStep();
  ok(modal.innerHTML.includes('Svaret är') && modal.querySelectorAll('.grid div.ans.fill').length >= 3 * W2 - 2, 'genomgången fyller alla tre raderna');
  return res;
}

async function shots(b, [w, h]){
  const pg = await b.newPage({ viewport:{ width:w, height:h }, hasTouch:true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(GAME);
  const fit = await pg.evaluate(() => {
    do openProblem({ code:'G1.4', tier:4, eyebrow:'Šeško · Nick', title:'Räkna rätt för full effekt', verb:'SKJUT!', cancel:true, clock:true, onDone(){} }); while (!P.prob.rows || P.W < 4);
    ACT.hint();
    const out = el => { const r = el.getBoundingClientRect(); return Math.round(Math.max(r.bottom - innerHeight, -r.top, r.right - innerWidth, -r.left, 0)); };
    return { grid:out(modal.querySelector('.grid')), submit:out(modal.querySelector('.submit')), cur:out(modal.querySelector('.ans.cur')) };
  });
  await pg.screenshot({ path:path.join(OUT, `long_${w}x${h}.png`) });
  await pg.evaluate(() => { const dg = digitsOf(P.prob.ans + 1, P.W); for (let j = 0; j < P.W; j++){ P.cursor = j; ACT.num({ d:String(dg[j]) }); } ACT.submit(); while (P.revealed < 9) ACT.nextStep(); });
  await pg.screenshot({ path:path.join(OUT, `long_sol_${w}x${h}.png`) });
  await pg.close();
  return { fit, errs };
}

(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport:{ width:1180, height:820 } });
  const pageErrs = []; pg.on('pageerror', e => pageErrs.push(e.message));
  await pg.goto(GAME);
  let fails = 0;
  for (const [pass, tag] of await pg.evaluate(flow)){ if (!pass) fails++; console.log(pass ? 'OK  ' : 'FEL ', tag); }
  for (const vp of SCREENS){
    const { fit, errs } = await shots(b, vp), ipad = Math.min(...vp) >= IPAD_MIN;
    const over = ipad ? Math.max(fit.grid, fit.submit) : Math.max(fit.submit, fit.cur);
    if (over || errs.length) fails++;
    console.log(over || errs.length ? 'FEL ' : 'OK  ', `${vp[0]}x${vp[1]}: ${ipad ? 'hela uppställningen' : 'knapp och aktiv ruta'} syns${over ? ` inte (+${over}px)` : ''}`, errs.join('; '));
  }
  if (pageErrs.length){ fails++; console.log('SIDFEL', pageErrs); }
  await b.close();
  console.log(fails ? `long-mul: ${fails} fel` : 'long-mul: alla OK');
  process.exit(fails ? 1 : 0);
})();
