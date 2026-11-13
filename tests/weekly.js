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

async function playWeekly(pg){
  const seen = [], before = await pg.evaluate(() => weekState().passes);
  await pg.evaluate(() => ACT.weekly());
  for (let i = 1; i <= 10; i++){
    await pg.waitForFunction(n => P && P.view === 'solve' && P.o.eyebrow.includes(`Veckans träning · ${n} av 10`), i, { timeout:STEP_MS });
    seen.push(await pg.evaluate(() => ({ code:P.prob.skill, d:P.prob.d })));
    await pg.evaluate(() => answerRight());
  }
  await pg.waitForFunction(n => screen === 'weeklyDone' && save.weekly.passes === n + 1, before, { timeout:STEP_MS });
  return seen;
}

async function plan(pg){
  const r = await pg.evaluate(() => ({ codes:WEEK_PLAN.sections, bad:WEEK_PLAN.sections.filter(c => !SECTIONS[c]), id:WEEK_PLAN.id, week:WEEK_PLAN.week, topic:WEEK_PLAN.topic }));
  expect(r.codes.length > 0 && !r.bad.length, `veckoplanen har giltiga avsnitt (${r.codes.join(', ')}${r.bad.length ? ', okända: ' + r.bad.join(', ') : ''})`);
  expect(typeof r.id === 'string' && r.id.length > 0 && Number.isInteger(r.week) && r.topic, `veckoplanen har id, vecka och ämne (${r.id}, v${r.week}, ${r.topic})`);
  return r;
}

async function flow(pg, p){
  await pg.evaluate(() => { localStorage.clear(); }); await pg.reload();
  await pg.evaluate(answerRight.toString().replace('function answerRight', 'window.answerRight = function'));
  const btn = await pg.evaluate(() => { const b = document.querySelector('[data-act=weekly]'); return b ? b.textContent : ''; });
  expect(btn.includes(p.topic) && btn.includes(`vecka ${p.week}`), `knappen visar veckans ämne (${btn})`);
  const seen = await playWeekly(pg);
  expect(seen.every(s => p.codes.includes(s.code)), `alla tal kommer från veckans avsnitt (${[...new Set(seen.map(s => s.code))].join(', ')})`);
  expect(seen.map(s => s.d).join() === '1,1,1,2,2,3,3,3,4,4', `svårigheten går från brons till stjärna (${seen.map(s => s.d).join()})`);
  const s = await pg.evaluate(() => ({ w:save.weekly, text:document.body.textContent, n:save.days[dayKey()].n }));
  expect(s.w.passes === 1 && s.w.best === 10 && s.text.includes('10 av 10') && s.n === 10, `ett pass klart, 10 av 10, räknas i dagsloggen (pass ${s.w.passes}, idag ${s.n} tal)`);
  await playWeekly(pg);
  await pg.evaluate(() => go('title'));
  expect(await pg.evaluate(() => document.querySelector('[data-act=weekly]').textContent.includes('2 pass den här veckan')), 'startsidan visar 2 pass');
  await pg.evaluate(() => go('adults'));
  expect(await pg.evaluate(() => document.body.textContent.includes('Veckans träning (vecka')), 'För vuxna visar veckans träning');
}

async function newWeek(pg){
  const r = await pg.evaluate(() => {
    const old = { ...WEEK_PLAN };
    Object.assign(WEEK_PLAN, { id:'test-ny-vecka' }); go('title');
    const fresh = document.querySelector('[data-act=weekly]').textContent;
    Object.assign(WEEK_PLAN, { sections:['X9.9'] }); go('title');
    const hidden = !document.querySelector('[data-act=weekly]');
    Object.assign(WEEK_PLAN, old); return { fresh, hidden };
  });
  expect(!r.fresh.includes('pass den här veckan'), 'ny veckoplan nollställer antalet pass');
  expect(r.hidden, 'knappen döljs om planen saknar giltiga avsnitt');
}

async function shots(b){
  for (const [w, h, dir] of [[1180, 820, ''], [360, 740, 'mob']]){
    const pg = await b.newPage({ viewport:{ width:w, height:h } });
    await pg.goto(GAME);
    await pg.evaluate(() => go('title'));
    await pg.screenshot({ path:path.join(OUT, dir, `weekly_title_${w}.png`) });
    await pg.evaluate(() => { weekly = { right:8 }; weekState().passes = 2; weekState().best = 9; go('weeklyDone'); });
    await pg.screenshot({ path:path.join(OUT, dir, `weekly_done_${w}.png`) });
    await pg.close();
  }
}

(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport:{ width:1180, height:820 } }), errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(GAME);
  const p = await plan(pg);
  await flow(pg, p);
  await newWeek(pg);
  await shots(b);
  expect(!errs.length, 'inga sidfel ' + errs.join('; '));
  await b.close();
  console.log(fails ? `weekly: ${fails} fel` : 'weekly: alla OK');
  process.exit(fails ? 1 : 0);
})();
