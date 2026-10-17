const path = require('path'), fs = require('fs'), OUT = path.join(__dirname, 'out', 'mob');
fs.mkdirSync(OUT, { recursive:true });
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport:{ width:360, height:740 } });
  await pg.goto(GAME);
  const r = await pg.evaluate(() => {
    const kits = Object.values(TEAMS).flat().concat(Object.values(VS_KITS));
    const rows = kits.map(t => ({ name:t.name, from:t.color, to:meterFill(t.color), c:contrastOf(meterFill(t.color), METER_TRACK) }));
    return { low:rows.filter(x => x.c < MIN_METER_CONTRAST), kept:rows.filter(x => contrastOf(x.from, METER_TRACK) >= MIN_METER_CONTRAST && x.from !== x.to),
      changed:rows.filter(x => x.from !== x.to).map(x => `${x.name} ${x.from}→${x.to}`), n:rows.length };
  });
  console.log(`${r.n} färger, ${r.changed.length} ljusade: ${r.changed.join(', ')}`);
  await pg.evaluate(() => { save.seen = { mur:true }; newRun('PL', 0); R.opps[0] = { ...R.opps[0], ...TEAMS.PL.find(t => t.name === 'Bournemouth') }; startMatch(); M.oppChance = 5; render(); });
  const meter = await pg.evaluate(() => { const e = document.getElementById('meterOpp').getBoundingClientRect(); return [e.x, e.y, e.width, e.height]; });
  await pg.screenshot({ path:path.join(OUT, 'meter_bournemouth.png'), clip:{ x:meter[0], y:meter[1], width:meter[2], height:meter[3] } });
  await b.close();
  const fails = r.low.length + r.kept.length;
  if (r.low.length) console.log('FEL för låg kontrast:', JSON.stringify(r.low));
  if (r.kept.length) console.log('FEL färg ändrad fast den syntes:', JSON.stringify(r.kept));
  console.log(fails ? `meter-contrast: ${fails} fel` : 'meter-contrast: alla OK');
  process.exit(fails ? 1 : 0);
})();
