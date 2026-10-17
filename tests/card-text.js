const path = require('path'), fs = require('fs'), OUT = path.join(__dirname, 'out', 'mob');
fs.mkdirSync(OUT, { recursive:true });
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const { chromium } = require('playwright');

const SCREENS = [[360, 740, true], [360, 620, true], [390, 664, true], [800, 304, true], [844, 360, true], [1180, 820, false], [820, 1180, false], [744, 1133, false], [1133, 744, false], [1024, 1366, false]];
const HAND_SIZE = 5;

function measure(handSize){
  save.seen = { mur:true };
  newRun('PL', 0); startMatch();
  const ids = Object.keys(CARDS), bad = [];
  for (let i = 0; i < ids.length; i += handSize){
    M.hand = ids.slice(i, i + handSize); render();
    document.querySelectorAll('.hand .card').forEach((el, k) => {
      const range = document.createRange(); range.selectNodeContents(el.querySelector('.ctext'));
      const textBottom = Math.max(...[...range.getClientRects()].map(r => r.bottom)), tag = el.querySelector('.rtag'), tier = el.querySelector('.ctier').getBoundingClientRect();
      const below = tag && tag.offsetParent ? tag.getBoundingClientRect().top : tier.top;
      const over = Math.round(Math.max(tier.bottom - el.getBoundingClientRect().bottom, textBottom - below));
      if (over > 1) bad.push(`${M.hand[k]} (${CARDS[M.hand[k]].name}) +${over}px`);
    });
  }
  return bad;
}

(async () => {
  const b = await chromium.launch();
  let fails = 0;
  for (const [w, h, phone] of SCREENS){
    const ctx = await b.newContext({ viewport:{ width:w, height:h }, isMobile:phone, hasTouch:phone, deviceScaleFactor:2 });
    const pg = await ctx.newPage();
    await pg.goto(GAME);
    await pg.evaluate(() => document.fonts.ready);
    const bad = await pg.evaluate(measure, HAND_SIZE);
    fails += bad.length;
    console.log(`${w}x${h}: ${bad.length ? bad.length + ' kort med klippt text: ' + bad.join(', ') : 'OK'}`);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `card-text: ${fails} fel` : 'card-text: alla OK');
  process.exit(fails ? 1 : 0);
})();
