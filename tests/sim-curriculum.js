const C = require(require('path').resolve(__dirname, '..', 'curriculum.js'));
const N = +process.argv[2] || 1500;
const bad = {}, stats = {}; let total = 0;
const flag = (code, d, why, p) => { const k = `${code} d${d}: ${why}`; if (!bad[k]) bad[k] = { n:0, ex:p }; bad[k].n++; };
for (const s of C.CURRICULUM){
  for (let d = 1; d <= 4; d++){
    const seen = new Set();
    for (let i = 0; i < N; i++){
      let p;
      try { p = C.makeProblem(s.code, d); } catch (e){ flag(s.code, d, 'THROW ' + e.message, null); continue; }
      total++;
      const txt = JSON.stringify(p);
      if (/NaN|undefined|Infinity|\[object/.test(txt)) flag(s.code, d, 'bad text', p);
      if (p.kind === 'column'){
        const got = C.fromDigits((() => { const arr = Array(p.W).fill(0); p.steps.forEach(st => { arr[st.col] = st.digit; if (st.extra) arr[st.extra.col] = st.extra.digit; }); return arr; })());
        const exp = p.op === '+' ? p.a + p.b : p.op === '-' ? p.a - p.b : p.a * p.b;
        if (got !== p.ans || exp !== p.ans) flag(s.code, d, 'column steps', p);
        if (p.steps.some(st => st.digit < 0 || st.digit > 9)) flag(s.code, d, 'digit out of range', p);
        if (String(p.ans).length > p.W) flag(s.code, d, 'answer wider than grid', p);
        seen.add(p.a + p.op + p.b);
        continue;
      }
      if (!p.q) flag(s.code, d, 'empty q', p);
      if (!p.steps.length) flag(s.code, d, 'no steps', p);
      if (!p.hint) flag(s.code, d, 'no hint', p);
      const place = /^Vilket värde har siffran <b>(\d)<\/b> i talet <b>([^<]+)<\/b>\?$/.exec(p.q);
      if (place && place[2].split(place[1]).length > 2) flag(s.code, d, 'ambiguous digit', p);
      if (p.kind === 'choice'){
        if (p.correct < 0) flag(s.code, d, 'correct missing', p);
        if (new Set(p.choices).size !== p.choices.length) flag(s.code, d, 'dup choices', p);
        if (p.choices.length < 3) flag(s.code, d, 'few choices', p);
        seen.add(p.q + p.choices.join());
        continue;
      }
      if (!p.fields.length) flag(s.code, d, 'no fields', p);
      if (p.fields.some(f => !Number.isFinite(f.ans))) flag(s.code, d, 'non-finite ans', p);
      if (!p.neg && p.fields.some(f => f.ans < 0)) flag(s.code, d, 'negative ans without neg key', p);
      const can = C.canonical(p);
      if (!C.checkAnswer(p, can)) flag(s.code, d, 'canonical answer rejected', p);
      const wrong = can.map((v, i) => i === 0 ? String(C.parseNum(v) + 1).replace('.', ',') : v);
      if (C.checkAnswer(p, wrong) && p.equiv !== 'frac') flag(s.code, d, 'wrong answer accepted', p);
      if (p.equiv === 'frac'){ const eq = can.map(v => String(C.parseNum(v) * 3)); if (!C.checkAnswer(p, eq)) flag(s.code, d, 'equivalent frac rejected', p); if (C.checkAnswer(p, [can[0], String(C.parseNum(can[1]) + 1)])) flag(s.code, d, 'wrong frac accepted', p); }
      // decimals must be typable: at most 3 decimals
      p.fields.forEach(f => { const dec = (String(f.ans).split('.')[1] || '').length; if (dec > 3) flag(s.code, d, 'too many decimals', p); });
      seen.add(p.q + JSON.stringify(p.fields.map(f => f.ans)));
    }
    stats[`${s.code} d${d}`] = seen.size;
  }
}
console.log('problems generated:', total);
const keys = Object.keys(bad);
console.log('issues:', keys.length);
keys.slice(0, 40).forEach(k => console.log(' -', k, 'x' + bad[k].n, bad[k].ex ? JSON.stringify(bad[k].ex).slice(0, 300) : ''));
const low = Object.entries(stats).filter(([k, v]) => v < 6);
console.log('low variety (<6 distinct):', low.map(([k, v]) => k + '=' + v).join(', ') || 'none');
