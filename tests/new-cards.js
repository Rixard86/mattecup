const path = require('path'), fs = require('fs'), OUT = path.join(__dirname, 'out');
fs.mkdirSync(path.join(OUT, 'mob'), { recursive:true });
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const { chromium } = require('playwright');
const SETTLE_MS = 15000, FAST = 20;
let fails = 0;
const expect = (ok, what) => { if (!ok) fails++; console.log(ok ? 'OK  ' : 'FEL ', what); };

async function fresh(pg, intent){
  await pg.evaluate(([i, f]) => { F.speed = f; newRun('PL', 0); startMatch(); M.hand = []; M.energy = 9; M.mur = 0; M.oppGuard = i.def; M.intent = { ...i }; render(); }, [intent, FAST]);
  await pg.waitForTimeout(300);
}
async function play(pg, id, correct = true){
  await pg.evaluate(([c, ok]) => applyCard(CARDS[c], { correct:ok, fast:false }), [id, correct]);
  await pg.waitForFunction(() => !busy, null, { timeout:SETTLE_MS });
  return pg.evaluate(() => ({ atk:M.intent.atk, guard:M.oppGuard, mur:M.mur, energy:M.energy, chance:M.myChance, fx:M.fx.map(f => f.name), weather:weatherOf(), pierce:M.pierce,
    overlay:!!document.querySelector('.pitch .weather'), tags:[...document.querySelectorAll('.tag.fx')].map(t => t.textContent) }));
}
async function nextTurn(pg){
  await pg.evaluate(() => { M.intent = { atk:10, def:0, label:'Anfaller' }; M.mur = 0; endTurn(); });
  await pg.waitForFunction(() => !busy && M.phase === 'play', null, { timeout:SETTLE_MS });
  return pg.evaluate(() => ({ atk:M.intent.atk, raw:M.intent, mur:M.mur, energy:M.energy, fx:M.fx.map(f => `${f.name}:${f.turns}`), weather:weatherOf() }));
}

async function defensive(pg){
  await fresh(pg, { atk:10, def:0, label:'Anfaller' });
  let r = await play(pg, 'iceball');
  expect(r.atk === 3, `Isboll: deras anfall 10 → ${r.atk} (väntat 3)`);
  r = await nextTurn(pg);
  expect(!r.fx.includes('Isboll'), 'Isboll gäller bara en tur');
  await fresh(pg, { atk:10, def:0, label:'Anfaller' });
  r = await play(pg, 'iceball', false);
  expect(r.atk === 7, `Isboll med fel svar ger halv effekt: 10 → ${r.atk}`);
  await fresh(pg, { atk:10, def:0, label:'Anfaller' });
  r = await play(pg, 'rain');
  expect(r.atk === 7 && r.weather === 'rain' && r.overlay && r.tags.some(t => t.includes('Regn')), 'Regn: −3 direkt, regn på planen och etikett');
  const t2 = await nextTurn(pg);
  expect(t2.weather === 'rain' && t2.fx.includes('Regn:1'), 'Regn gäller turen efter också');
  const t3 = await nextTurn(pg);
  expect(t3.weather === '' && !t3.fx.length, 'Regn är borta efter två turer');
  await fresh(pg, { atk:10, def:0, label:'Anfaller' });
  r = await play(pg, 'glue');
  const g2 = await nextTurn(pg);
  expect(r.mur === 3 && g2.mur === 3, `Klisterhandskar: +3 mur nu och nästa tur (${r.mur}, ${g2.mur})`);
}

async function attacking(pg){
  await fresh(pg, { atk:0, def:8, label:'Försvarar' });
  await play(pg, 'fireball');
  const r = await play(pg, 'p_mainoo');
  expect(r.chance === 8 && r.guard === 8 && !r.pierce, `Eldboll: Passning 3+5 går igenom försvaret 8 (målchans ${r.chance}, försvar ${r.guard})`);
  await fresh(pg, { atk:0, def:8, label:'Försvarar' });
  const v = await play(pg, 'mbeumo2');
  expect(v.chance === 5 && v.guard === 8, `Volley går igenom försvaret (målchans ${v.chance})`);
  await fresh(pg, { atk:0, def:8, label:'Försvarar' });
  const t = await play(pg, 'thunder');
  const p = await play(pg, 'p_mainoo');
  expect(t.guard === 0 && p.chance === 6 && t.weather === 'storm', `Åskväder: försvar 0 och Passning 3+3 (målchans ${p.chance})`);
  const w = await play(pg, 'wind');
  expect(w.weather === 'wind' && w.fx.filter(n => n === 'Åskväder').length === 0, 'Bara ett väder åt gången: Stormvind ersätter Åskväder');
  await fresh(pg, { atk:0, def:8, label:'Försvarar' });
  const f = await play(pg, 'fog');
  expect(f.guard === 4, `Dimma: deras försvar 8 → ${f.guard}`);
  await fresh(pg, { atk:0, def:0, label:'Anfaller' });
  const e0 = await play(pg, 'speed'), e1 = await nextTurn(pg);
  expect(e0.energy === 10 && e1.energy === 4, `Snabbskor: +1 energi nu och nästa tur (${e0.energy}, ${e1.energy})`);
}

async function shots(b){
  for (const [w, h, dir] of [[1180, 820, ''], [360, 672, 'mob'], [800, 304, 'mob']]){
    const pg = await b.newPage({ viewport:{ width:w, height:h } });
    await pg.goto(GAME);
    await pg.evaluate(() => { save.seen = { mur:true }; newRun('PL', 0); startMatch(); M.hand = ['fireball', 'iceball', 'rain', 'thunder', 'mbeumo2']; M.fx = [{ name:'Regn', turns:2, opp:3, weather:'rain' }]; render(); });
    await pg.waitForTimeout(700);
    await pg.screenshot({ path:path.join(OUT, dir, `newcards_hand_${w}.png`) });
    await pg.evaluate(() => { R.offer = ['thunder', 'glue', 'wind']; R.stage = 1; go('reward'); });
    await pg.screenshot({ path:path.join(OUT, dir, `newcards_reward_${w}.png`) });
    await pg.close();
  }
}

(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport:{ width:1180, height:820 } }), errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(GAME);
  expect(await pg.evaluate(() => [...POOL.common, ...POOL.rare, ...POOL.epic, ...POOL.legend].every(id => CARDS[id] && /<(path|circle|rect)/.test(icon(CARDS[id].icon)))), 'alla kort i POOL finns och har en ikon');
  await defensive(pg);
  await attacking(pg);
  await shots(b);
  expect(!errs.length, 'inga sidfel ' + errs.join('; '));
  await b.close();
  console.log(fails ? `new-cards: ${fails} fel` : 'new-cards: alla OK');
  process.exit(fails ? 1 : 0);
})();
