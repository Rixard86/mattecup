const path = require('path'), fs = require('fs'), OUT = path.join(__dirname, 'out');
fs.mkdirSync(path.join(OUT, 'mob'), { recursive:true });
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const { chromium } = require('playwright');
const WAIT_MS = 4000;
let fails = 0;
const expect = (ok, what) => { if (!ok) fails++; console.log(ok ? 'OK  ' : 'FEL ', what); };

async function testImage(pg){
  const b64 = await pg.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 800; c.height = 400;
    const g = c.getContext('2d'); g.fillStyle = '#1e90ff'; g.fillRect(0, 0, 800, 400); g.fillStyle = '#ffd700'; g.beginPath(); g.arc(400, 200, 150, 0, 7); g.fill();
    return c.toDataURL('image/png').split(',')[1];
  });
  return Buffer.from(b64, 'base64');
}
async function choose(pg, file){
  const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-act=pickLogo]')]);
  await chooser.setFiles(file);
}
const logoInfo = pg => pg.evaluate(() => new Promise(res => {
  const src = save.settings.logo, shown = document.querySelector('.title-badge img');
  if (!src) return res({ src:null, shown:shown && shown.getAttribute('src') });
  const im = new Image(); im.onload = () => res({ src:src.slice(0, 22), w:im.width, h:im.height, shown:shown && shown.getAttribute('src') === src, reset:!!document.querySelector('[data-act=resetLogo]') }); im.src = src;
}));

(async () => {
  const b = await chromium.launch(), errs = [];
  for (const [w, h, dir] of [[1180, 820, ''], [360, 740, 'mob']]){
    const pg = await b.newPage({ viewport:{ width:w, height:h } });
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(GAME); await pg.evaluate(() => localStorage.clear()); await pg.reload();
    await choose(pg, { name:'logga.png', mimeType:'image/png', buffer:await testImage(pg) });
    await pg.waitForFunction(() => !!save.settings.logo, null, { timeout:WAIT_MS });
    let r = await logoInfo(pg);
    expect(r.src === 'data:image/png;base64,' && r.w === 256 && r.h === 128 && r.shown && r.reset, `${w}: loggan byts och förminskas (${r.w}×${r.h})`);
    await pg.screenshot({ path:path.join(OUT, dir, `logo_${w}.png`) });
    await pg.reload();
    r = await logoInfo(pg);
    expect(r.shown === true, `${w}: loggan finns kvar efter omladdning`);
    await pg.click('[data-act=resetLogo]');
    r = await logoInfo(pg);
    expect(!r.src && r.shown !== null && !r.shown.startsWith('data:'), `${w}: Standardlogga återställer`);
    await choose(pg, { name:'trasig.png', mimeType:'image/png', buffer:Buffer.from('inte en bild') });
    await pg.waitForFunction(() => document.body.textContent.includes('Bilden gick inte att läsa'), null, { timeout:WAIT_MS });
    expect(!(await pg.evaluate(() => save.settings.logo)), `${w}: trasig fil ger ett meddelande och ingen logga`);
    await pg.close();
  }
  expect(!errs.length, 'inga sidfel ' + errs.join('; '));
  await b.close();
  console.log(fails ? `logo: ${fails} fel` : 'logo: alla OK');
  process.exit(fails ? 1 : 0);
})();
