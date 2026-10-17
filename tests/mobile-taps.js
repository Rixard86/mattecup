const _p = require('path'), _fs = require('fs'), OUT = _p.join(__dirname, 'out');
for (const d of ['', 'mob', 'vs']) _fs.mkdirSync(_p.join(OUT, d), { recursive:true });
process.chdir(OUT); // skärmbilder hamnar i tests/out
const path = require('path');
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs=[];
  for (const [w,h] of [[1180,820],[820,1180],[1024,1366],[1366,1024],[744,1133],[1133,744]]){
    const pg = await b.newPage({ viewport:{width:w,height:h} });
    await pg.goto(GAME);
    const r = await pg.evaluate(()=>[matchMedia('(max-width:540px), (max-height:500px) and (orientation:landscape)').matches, matchMedia('(max-height:360px) and (orientation:landscape)').matches]);
    console.log('iPad', w, h, 'phone rules active:', r); await pg.close();
  }
  // real taps on phones
  for (const [w,h] of [[390,664],[844,360]]){
    const ctx = await b.newContext({ viewport:{width:w,height:h}, isMobile:true, hasTouch:true, deviceScaleFactor:2 });
    const pg = await ctx.newPage(); pg.on('pageerror', e=>errs.push(e.message));
    await pg.goto(GAME); await pg.evaluate(()=>{localStorage.clear(); localStorage.setItem('unitedMattecup.v2', JSON.stringify({seen:{mur:true}}));}); await pg.reload();
    await pg.evaluate(()=>{F.speed=20;newRun('PL',0);startMatch();}); await pg.waitForTimeout(400);
    let played=0;
    for (let t=0;t<30 && played<12;t++){
      const st = await pg.evaluate(()=>({busy:busy||!!P, phase:M&&M.phase, P:!!P, hand:M?M.hand.map(id=>CARDS[id].cost<=M.energy):[]}));
      if (st.phase!=='play') break;
      if (st.busy){ await pg.waitForTimeout(300); continue; }
      const i = st.hand.findIndex(x=>x);
      if (i<0){ await pg.tap('[data-act=endTurn]'); await pg.waitForTimeout(400); continue; }
      await pg.tap(`.hand .card[data-i="${i}"]`); let ok=false; for(let k=0;k<10&&!ok;k++){ await pg.waitForTimeout(100); ok=await pg.evaluate(()=>!!P&&P.view==='solve'); } if(!ok){ continue; }
      // answer via taps
      const plan = await pg.evaluate(()=>{ const p=P.prob; if(p.kind==='column') return {k:'col',d:digitsOf(p.ans,P.W).map(String)}; if(p.kind==='choice') return {k:'ch',i:p.correct}; return {k:'in',v:canonical(p)}; });
      if (plan.k==='ch') await pg.tap(`.choice[data-k="${plan.i}"]`);
      else {
        if (plan.k==='col'){ for(let j=0;j<plan.d.length;j++){ await pg.evaluate(j=>{P.cursor=j;},j); await pg.tap(`.numpad [data-d="${plan.d[j]}"]`);} }
        else { for (let f=0; f<plan.v.length; f++){ await pg.evaluate(f=>{P.field=f;},f); for (const ch of plan.v[f]){ if(ch==='-') await pg.tap('[data-act=neg]'); else await pg.tap(`.numpad [data-d="${ch===','||ch==='.'?',':ch}"]`);} } }
        await pg.tap('[data-act=submit]');
      }
      played++; await pg.waitForTimeout(500);
    }
    const res = await pg.evaluate(()=>({right:R.right,total:R.total,turn:M.turn}));
    console.log('phone',w,h,'played',played,res);
    await pg.screenshot({path:`mob/tap_${w}.png`}); await ctx.close();
  }
  console.log('ERRORS', errs); await b.close();
})();
