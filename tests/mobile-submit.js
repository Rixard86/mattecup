const path = require('path'), fs = require('fs'), OUT = path.join(__dirname, 'out', 'mob');
fs.mkdirSync(OUT, { recursive:true });
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const { chromium } = require('playwright');

const PHONES = [[360, 672], [360, 620], [390, 664], [800, 304], [752, 280], [844, 360], [667, 330]];
const REPS = +process.argv[2] || 6;

function sweep(reps){
  const bad = {}, LEVELS = 4;
  const lastButton = () => modal.querySelector('.submit') || [...modal.querySelectorAll('.choice')].pop();
  const hidden = el => {
    if (!el) return 0;
    const r = el.getBoundingClientRect(), over = Math.round(Math.max(r.bottom - innerHeight, -r.top, 0));
    if (over > 0) return over;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return el.contains(hit) ? 0 : Math.round(r.height);
  };
  const measure = (tag, code, d) => {
    const k = `${code} d${d}`, parts = { knapp:lastButton(), svarsruta:modal.querySelector('.fld.cur, .ans.cur'), tips:modal.querySelector('.tip') };
    const [what, over] = Object.entries(parts).map(([n, el]) => [n, hidden(el)]).sort((a, c) => c[1] - a[1])[0];
    if (over > 0 && (!bad[k] || bad[k].over < over)) bad[k] = { over, tag:`${what}, ${tag}`, q:P.prob.q || `${P.prob.a} ${P.prob.op} ${P.prob.b}` };
  };
  for (const s of CURRICULUM) for (let d = 1; d <= LEVELS; d++) for (let i = 0; i < reps; i++){
    openProblem({ code:s.code, tier:d, eyebrow:'Šeško · Nick', title:'Räkna rätt för full effekt', verb:'SKJUT!', cancel:true, clock:true, retry:true, onDone(){} });
    measure('start', s.code, d);
    ACT.hint(); measure('tips', s.code, d);
    if (P.prob.kind !== 'choice'){ ACT.submit(); if (P && P.view === 'solve') measure('meddelande', s.code, d); }
    P = null; modal.hidden = true;
  }
  return bad;
}

async function checkPhone(b, [w, h]){
  const ctx = await b.newContext({ viewport:{ width:w, height:h }, isMobile:true, hasTouch:true, deviceScaleFactor:2 });
  const pg = await ctx.newPage(), errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(GAME);
  const bad = await pg.evaluate(sweep, REPS);
  const keys = Object.keys(bad);
  if (keys.length){
    const worst = keys.sort((a, c) => bad[c].over - bad[a].over)[0];
    const [code, lvl] = worst.split(' d');
    await pg.evaluate(([code, d]) => { openProblem({ code, tier:+d, eyebrow:'Šeško · Nick', title:'Räkna rätt för full effekt', verb:'SKJUT!', cancel:true, clock:true, onDone(){} }); ACT.hint(); }, [code, lvl]);
    await pg.screenshot({ path:path.join(OUT, `submit_${w}x${h}.png`) });
  }
  await ctx.close();
  return { keys, bad, errs };
}

(async () => {
  const b = await chromium.launch();
  let fails = 0;
  for (const vp of PHONES){
    const { keys, bad, errs } = await checkPhone(b, vp);
    fails += keys.length + errs.length;
    console.log(`${vp[0]}x${vp[1]}: ${keys.length ? keys.length + ' avsnitt där knappen hamnar utanför' : 'OK'}`);
    keys.slice(0, 12).forEach(k => console.log(`   ${k} +${bad[k].over}px (${bad[k].tag}) ${String(bad[k].q).replace(/<[^>]+>/g, '').slice(0, 70)}`));
    if (errs.length) console.log('   SIDFEL', errs);
  }
  await b.close();
  console.log(fails ? `mobile-submit: ${fails} fel` : 'mobile-submit: alla OK');
  process.exit(fails ? 1 : 0);
})();
