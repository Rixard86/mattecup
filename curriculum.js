/* =========================================================
   UNITED MATTECUP – uppgifter
   Avsnitten följer Matematik Alfa, Beta och Gamma och MatematikXYZ:s filmer.
   Varje avsnitt har gen(d) där d = 1–4 är svårigheten inom avsnittet
   (kortets nivå: Brons, Silver, Guld, Stjärna).
   ========================================================= */
'use strict';

/* ---------- grundverktyg ---------- */
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a){ a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function digitsOf(n, len){ const d = []; for (let i = 0; i < len; i++){ d.push(n % 10); n = Math.floor(n / 10); } return d; }
function fromDigits(d){ return d.reduce((s, v, i) => s + v * Math.pow(10, i), 0); }
const r6 = x => Math.round(x * 1e6) / 1e6;
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
const f1 = x => Math.round(x * 10) / 10;
const pad2 = m => String(m).padStart(2, '0');
const COL = ['Ental', 'Tiotal', 'Hundratal', 'Tusental', 'Tiotusental'];
const col = j => COL[j].toLowerCase();
const COLPL = ['entalen', 'tiotalen', 'hundratalen', 'tusentalen', 'tiotusentalen'];
const POS = ['ental', 'tiotal', 'hundratal', 'tusental', 'tiotusental'];

function fmt(x){
  if (typeof x === 'string') return x;
  const neg = x < 0;
  let s = String(r6(Math.abs(x)));
  if (s.includes('e')) s = Math.abs(x).toFixed(6).replace(/\.?0+$/, '');
  let [i, d] = s.split('.');
  if (i.length >= 4) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '−' : '') + i + (d ? ',' + d : '');
}
const plain = x => String(r6(x)).replace('.', ',');
function parseNum(s){
  if (s == null) return NaN;
  const t = String(s).replace(/[\s ]/g, '').replace(',', '.').replace('−', '-');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return NaN;
  return Number(t);
}
const fracTxt = (n, d) => `${n}/${d}`;
function simp(n, d){ const g = gcd(n, d) || 1; return [n / g, d / g]; }

/* ---------- uppgiftsbyggare ---------- */
function mk(o){
  return Object.assign({ kind:'input', q:'', fig:'', fields:[], steps:[], answer:'', hint:'', calc:false, neg:false, slow:1.4, layout:'row', equiv:null }, o);
}
function NUM(q, ans, o = {}){
  return mk({ q, fig:o.fig || '', fields:[{ ans:r6(ans), suffix:o.suffix || '', label:o.label || '' }], steps:o.steps || [],
    answer:o.answer || (fmt(ans) + (o.suffix ? (o.suffix === '°' ? '' : ' ') + o.suffix : '')), hint:o.hint || '', calc:!!o.calc, neg:!!o.neg, slow:o.slow || 1.4 });
}
function MULTI(q, fields, o = {}){
  return mk({ q, fig:o.fig || '', fields:fields.map(f => ({ ans:r6(f.ans), label:f.label || '', suffix:f.suffix || '', mod:f.mod || 0 })),
    steps:o.steps || [], answer:o.answer || fields.map(f => fmt(f.ans) + (f.suffix ? ' ' + f.suffix : '')).join(' '),
    hint:o.hint || '', neg:!!o.neg, layout:o.layout || 'row', slow:o.slow || 1.5, calc:!!o.calc });
}
function FRAC(q, n, d, o = {}){
  return mk({ q, fig:o.fig || '', layout:'frac', equiv:'frac', fields:[{ ans:n }, { ans:d }], steps:o.steps || [],
    answer:o.answer || fracTxt(n, d), hint:o.hint || '', slow:o.slow || 1.5 });
}
function MIXED(q, w, n, d, o = {}){
  return mk({ q, fig:o.fig || '', layout:'mixed', equiv:'mixed', fields:[{ ans:w }, { ans:n }, { ans:d }], steps:o.steps || [],
    answer:o.answer || `${w} ${n}/${d}`, hint:o.hint || '', slow:1.6 });
}
function CHOICE(q, correct, wrongs, o = {}){
  const c = String(correct), ws = [];
  wrongs.forEach(w => { const s = String(w); if (s !== c && !ws.includes(s)) ws.push(s); });
  const opts = shuffle([c, ...shuffle(ws).slice(0, (o.n || 4) - 1)]);
  return mk({ kind:'choice', q, fig:o.fig || '', choices:opts, correct:opts.indexOf(c), steps:o.steps || [], answer:o.answer || c, hint:o.hint || '', slow:o.slow || 1.2 });
}
const COLUMN = p => Object.assign({ kind:'column', slow:1, steps:[], hint:'' }, p);

function checkAnswer(p, vals){
  if (p.kind === 'choice') return vals[0] === p.correct;
  const v = vals.map(parseNum);
  if (v.some(x => Number.isNaN(x))) return false;
  if (p.equiv === 'frac'){ const [n, d] = v, N = p.fields[0].ans, D = p.fields[1].ans; return d !== 0 && Math.abs(n * D - d * N) < 1e-9; }
  if (p.equiv === 'mixed'){
    const [w, n, d] = v, W = p.fields[0].ans, N = p.fields[1].ans, D = p.fields[2].ans;
    if (d <= 0 || n <= 0 || n >= d) return false;
    return Math.abs((w * d + n) * D - (W * D + N) * d) < 1e-9;
  }
  return p.fields.every((f, i) => f.mod ? (v[i] >= 0 && v[i] <= 24 && ((v[i] - f.ans) % f.mod + f.mod) % f.mod === 0) : Math.abs(v[i] - f.ans) < 1e-9);
}
const canonical = p => p.kind === 'choice' ? [p.correct] : p.fields.map(f => plain(f.ans));

/* ---------- uppställning (kolumnmetoden) ---------- */
function genAdd(n, carries){
  for (let tries = 0; tries < 500; tries++){
    const a = [], b = []; let cin = 0, ok = true;
    for (let j = 0; j < n && ok; j++){
      const lead = j === n - 1; let found = false;
      for (let t = 0; t < 80; t++){
        const x = rnd(lead ? 1 : 0, 9), y = rnd(lead ? 1 : 0, 9), s = x + y + cin;
        if ((s >= 10) === !!carries[j] && !(x === 0 && y === 0)){ a[j] = x; b[j] = y; cin = s >= 10 ? 1 : 0; found = true; break; }
      }
      ok = found;
    }
    if (ok){ const A = fromDigits(a), B = fromDigits(b); return COLUMN({ op:'+', a:A, b:B, ans:A + B, n, W:n }); }
  }
  return COLUMN({ op:'+', a:23, b:45, ans:68, n:2, W:2 });
}
function genSub(n, borrows, zeros = []){
  for (let tries = 0; tries < 900; tries++){
    const a = [], b = []; let bin = 0, ok = true;
    for (let j = 0; j < n && ok; j++){
      const lead = j === n - 1; let found = false;
      for (let t = 0; t < 120; t++){
        let x = rnd(lead ? 1 : 0, 9); const y = rnd(lead ? 1 : 0, 9);
        if (zeros.includes(j)) x = 0;
        else if (!zeros.length && bin && x === 0) continue;
        const eff = x - bin, need = !!borrows[j];
        const good = lead ? (eff > y) : ((eff < y) === need);
        if (good){ a[j] = x; b[j] = y; bin = need ? 1 : 0; found = true; break; }
      }
      ok = found;
    }
    if (ok){ const A = fromDigits(a), B = fromDigits(b); return COLUMN({ op:'-', a:A, b:B, ans:A - B, n, W:n }); }
  }
  return COLUMN({ op:'-', a:87, b:34, ans:53, n:2, W:2 });
}
function genMul(nA, bmin, bmax, mode){
  for (let t = 0; t < 2000; t++){
    const b = rnd(bmin, bmax), A = Array.from({ length:nA }, (_, i) => i === nA - 1 ? rnd(1, 9) : rnd(0, 9));
    let cin = 0, carries = 0;
    for (let j = 0; j < nA; j++){ const s = A[j] * b + cin; if (j < nA - 1 && s >= 10) carries++; cin = Math.floor(s / 10); }
    if (mode === 0 ? (carries === 0 && cin === 0) : mode === 1 ? carries >= 1 : carries >= 2){
      const a = fromDigits(A), ans = a * b;
      return COLUMN({ op:'×', a, b, ans, n:nA, W:String(ans).length });
    }
  }
  return COLUMN({ op:'×', a:23, b:3, ans:69, n:2, W:2 });
}
const randPattern = (n, k) => { for (;;){ const p = Array.from({ length:n }, (_, i) => i < n - 1 ? (Math.random() < .5 ? 1 : 0) : 0); if (p.reduce((s, v) => s + v, 0) === k) return p; } };

function solveSteps(p){
  const W = p.W, A = digitsOf(p.a, W), steps = [];
  if (p.op === '+'){
    const B = digitsOf(p.b, W); let cin = 0;
    for (let j = 0; j < W; j++){
      const s = A[j] + B[j] + cin;
      let t = `${COL[j]}: ${A[j]} + ${B[j]}${cin ? ' + 1 (minnessiffran)' : ''} = ${s}. `;
      t += s >= 10 && j < W - 1 ? `Skriv ${s % 10} och sätt minnessiffran 1 ovanför ${COLPL[j + 1]}.` : `Skriv ${s}.`;
      steps.push({ col:j, text:t, digit:s % 10, carryTo:s >= 10 ? j + 1 : null, carryVal:1, cin, last:j === W - 1 });
      cin = s >= 10 ? 1 : 0;
    }
  } else if (p.op === '-'){
    const B = digitsOf(p.b, W), top = A.slice();
    for (let j = 0; j < W; j++){
      const pre = top[j]; let t, zero = false;
      if (top[j] < B[j]){
        let k = j + 1; while (k < W && top[k] === 0) k++;
        if (k > j + 1){
          zero = true;
          t = `${COL[j]}: ${pre} − ${B[j]} går inte. Det finns 0 ${col(j + 1)}, så växla först 1 ${col(k)} till 10 ${col(k - 1)}${k - 1 > j + 1 ? ' och vidare nedåt' : ''}. Växla sedan 1 ${col(j + 1)} till 10 ${col(j)} (då blir det 9 ${col(j + 1)} kvar).`;
        } else t = `${COL[j]}: ${pre} − ${B[j]} går inte. Växla 1 ${col(j + 1)} till 10 ${col(j)}.`;
        top[k]--; for (let m = j + 1; m < k; m++) top[m] = 9; top[j] += 10;
        t += ` Nu blir det ${top[j]} − ${B[j]} = ${top[j] - B[j]}.`;
      } else {
        const changed = top[j] !== A[j];
        t = `${COL[j]}: ${top[j]} − ${B[j]} = ${top[j] - B[j]}.${changed ? ` (Efter växlingen finns det ${top[j]} ${col(j)} kvar.)` : ''}`;
      }
      steps.push({ col:j, text:t, digit:top[j] - B[j], topsAfter:top.slice(), pre, need:pre < B[j], zero });
    }
  } else {
    const nA = p.n, b = p.b; let cin = 0;
    for (let j = 0; j < nA; j++){
      const s = A[j] * b + cin, last = j === nA - 1;
      let t = `${COL[j]}: ${A[j]} · ${b}${cin ? ` + ${cin} (minnessiffran)` : ''} = ${s}. `;
      if (last){
        t += s >= 10 ? `Det är sista siffran, så skriv hela ${s}.` : `Skriv ${s}.`;
        steps.push({ col:j, text:t, digit:s % 10, extra:s >= 10 ? { col:j + 1, digit:Math.floor(s / 10) } : null, carryTo:null, cin, last:true });
      } else {
        t += s >= 10 ? `Skriv ${s % 10} och sätt minnessiffran ${Math.floor(s / 10)} ovanför ${COLPL[j + 1]}.` : `Skriv ${s}.`;
        steps.push({ col:j, text:t, digit:s % 10, carryTo:s >= 10 ? j + 1 : null, carryVal:Math.floor(s / 10), cin, last:false });
      }
      cin = Math.floor(s / 10);
    }
  }
  return steps;
}

/* ---------- kort division ---------- */
function shortDiv(a, dv){
  const ds = String(a).split('').map(Number); let rem = 0, q = '', L = [], carries = 0;
  ds.forEach(dg => {
    const cur = rem * 10 + dg, qd = Math.floor(cur / dv); rem = cur % dv;
    if (q === '' && qd === 0){ L.push(`${cur} / ${dv} går inte – ta med nästa siffra.`); }
    else { q += qd; L.push(`${cur} / ${dv} = ${qd}${rem ? `, och ${rem} blir kvar (minnessiffra till nästa siffra)` : ''}.`); if (rem) carries++; }
  });
  return { q:Number(q || 0), rem, L, carries };
}

/* ---------- figurer ---------- */
const CH = '#f4f2ea', C1 = '#6fd3ff', C2 = '#ff9ad5', C3 = '#ffd84d', C4 = '#5ee08a', DIM = 'rgba(244,242,234,.28)';
const PAL = [C1, C2, C3, C4, '#c4a7ff', '#ffb38a'];
const T = (x, y, s, o = {}) => `<text x="${f1(x)}" y="${f1(y)}" font-size="${o.size || 14}" font-weight="${o.w || 800}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill || CH}" font-family="Nunito,sans-serif">${s}</text>`;
const svg = (w, h, body, label = '') => `<svg class="qfig" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${body}</svg>`;

function figClock(h, m){
  let s = `<circle cx="100" cy="100" r="92" fill="#fbfaf5" stroke="${C3}" stroke-width="6"/>`;
  for (let i = 0; i < 60; i++){
    const a = i * 6 * Math.PI / 180, r1 = i % 5 ? 82 : 75;
    s += `<line x1="${f1(100 + Math.sin(a) * r1)}" y1="${f1(100 - Math.cos(a) * r1)}" x2="${f1(100 + Math.sin(a) * 87)}" y2="${f1(100 - Math.cos(a) * 87)}" stroke="#222" stroke-width="${i % 5 ? 1.2 : 3}"/>`;
  }
  for (let n = 1; n <= 12; n++){ const a = n * 30 * Math.PI / 180; s += T(100 + Math.sin(a) * 62, 100 - Math.cos(a) * 62 + 7, n, { size:20, w:900, fill:'#222' }); }
  const ha = ((h % 12) + m / 60) * 30 * Math.PI / 180, ma = m * 6 * Math.PI / 180;
  s += `<line x1="100" y1="100" x2="${f1(100 + Math.sin(ha) * 44)}" y2="${f1(100 - Math.cos(ha) * 44)}" stroke="#111" stroke-width="8" stroke-linecap="round"/>`;
  s += `<line x1="100" y1="100" x2="${f1(100 + Math.sin(ma) * 72)}" y2="${f1(100 - Math.cos(ma) * 72)}" stroke="#111" stroke-width="4.5" stroke-linecap="round"/>`;
  s += `<circle cx="100" cy="100" r="6" fill="#da291c"/>`;
  return svg(200, 200, s, 'Klocka');
}
function axes(L, B, Wd, Tp, max, step){
  let s = '';
  for (let v = 0; v <= max + 1e-9; v += step){
    const y = B - (B - Tp) * v / max;
    s += `<line x1="${L}" x2="${Wd}" y1="${f1(y)}" y2="${f1(y)}" stroke="${DIM}"/>` + T(L - 6, y + 4, fmt(r6(v)), { size:12, anchor:'end', w:700 });
  }
  return s + `<line x1="${L}" y1="${B}" x2="${Wd}" y2="${B}" stroke="${CH}" stroke-width="2"/><line x1="${L}" y1="${Tp - 8}" x2="${L}" y2="${B}" stroke="${CH}" stroke-width="2"/>`;
}
function figBars(labels, values, step, yTitle){
  const W = 380, H = 240, L = 46, B = 200, Tp = 24, R = 12, max = Math.ceil(Math.max(...values) / step) * step || step, n = values.length, bw = (W - L - R) / n;
  let s = axes(L, B, W - R, Tp, max, step);
  values.forEach((v, i) => { const h = (B - Tp) * v / max; s += `<rect x="${f1(L + i * bw + bw * .2)}" y="${f1(B - h)}" width="${f1(bw * .6)}" height="${f1(h)}" fill="${C1}" rx="3"/>` + T(L + i * bw + bw / 2, B + 18, labels[i], { size:12 }); });
  if (yTitle) s += T(L + 4, Tp - 12, yTitle, { size:12, anchor:'start', fill:C3 });
  return svg(W, H, s, 'Stapeldiagram');
}
function figLine(labels, values, step, yTitle){
  const W = 380, H = 240, L = 46, B = 200, Tp = 24, R = 18, max = Math.ceil(Math.max(...values) / step) * step || step, n = values.length, dx = (W - L - R) / (n - 1);
  let s = axes(L, B, W - R, Tp, max, step), pts = values.map((v, i) => [L + i * dx, B - (B - Tp) * v / max]);
  s += `<polyline points="${pts.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ')}" fill="none" stroke="${C3}" stroke-width="3"/>`;
  pts.forEach((p, i) => { s += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="5" fill="${C3}"/>` + T(p[0], B + 18, labels[i], { size:12 }); });
  if (yTitle) s += T(L + 4, Tp - 12, yTitle, { size:12, anchor:'start', fill:C3 });
  return svg(W, H, s, 'Linjediagram');
}
function figPie(parts){
  const cx = 105, cy = 110, r = 92; let a = -Math.PI / 2, s = '';
  parts.forEach((p, i) => {
    const a2 = a + p.frac * 2 * Math.PI, large = p.frac > .5 ? 1 : 0;
    s += `<path d="M${cx},${cy} L${f1(cx + r * Math.cos(a))},${f1(cy + r * Math.sin(a))} A${r},${r} 0 ${large} 1 ${f1(cx + r * Math.cos(a2))},${f1(cy + r * Math.sin(a2))} Z" fill="${PAL[i]}" stroke="#17211d" stroke-width="2.5"/>`;
    a = a2;
    s += `<rect x="225" y="${36 + i * 32}" width="18" height="18" rx="4" fill="${PAL[i]}"/>` + T(250, 50 + i * 32, p.label, { anchor:'start', size:15 });
  });
  return svg(380, 220, s, 'Cirkeldiagram');
}
function figTable(head, rows){
  return `<table class="qtable"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${c}</td>` : `<th scope="row">${c}</th>`).join('')}</tr>`).join('')}</table>`;
}
function figFrac(kind, parts, shaded){
  let s = '';
  if (kind === 'circle'){
    const cx = 100, cy = 100, r = 85;
    for (let i = 0; i < parts; i++){
      const a = -Math.PI / 2 + i * 2 * Math.PI / parts, a2 = a + 2 * Math.PI / parts;
      s += `<path d="M${cx},${cy} L${f1(cx + r * Math.cos(a))},${f1(cy + r * Math.sin(a))} A${r},${r} 0 0 1 ${f1(cx + r * Math.cos(a2))},${f1(cy + r * Math.sin(a2))} Z" fill="${i < shaded ? C2 : 'transparent'}" stroke="${CH}" stroke-width="3"/>`;
    }
    return svg(200, 200, s, 'Bråk');
  }
  const w = 320 / parts;
  for (let i = 0; i < parts; i++) s += `<rect x="${f1(10 + i * w)}" y="20" width="${f1(w)}" height="70" fill="${i < shaded ? C2 : 'transparent'}" stroke="${CH}" stroke-width="3"/>`;
  return svg(340, 110, s, 'Bråk');
}
function figCoord(points, max){
  const S = Math.min(28, 260 / max), L = 34, B = 30 + max * S;
  let s = '';
  for (let i = 0; i <= max; i++){
    s += `<line x1="${L + i * S}" y1="30" x2="${L + i * S}" y2="${B}" stroke="${DIM}"/><line x1="${L}" y1="${B - i * S}" x2="${L + max * S}" y2="${B - i * S}" stroke="${DIM}"/>`;
    s += T(L + i * S, B + 18, i, { size:12 }) + T(L - 10, B - i * S + 4, i, { size:12, anchor:'end' });
  }
  s += `<line x1="${L}" y1="${B}" x2="${L + max * S + 12}" y2="${B}" stroke="${CH}" stroke-width="2.5"/><line x1="${L}" y1="${B}" x2="${L}" y2="18" stroke="${CH}" stroke-width="2.5"/>`;
  s += T(L + max * S + 18, B + 5, 'x', { fill:C3 }) + T(L, 12, 'y', { fill:C3 });
  points.forEach((p, i) => { s += `<circle cx="${L + p[0] * S}" cy="${B - p[1] * S}" r="6" fill="${PAL[i % 4]}"/>` + T(L + p[0] * S + 11, B - p[1] * S - 8, p[2], { fill:PAL[i % 4], size:16, w:900 }); });
  return svg(L + max * S + 30, B + 30, s, 'Koordinatsystem');
}
const reg = (n, cx, cy, r, rot = -Math.PI / 2) => Array.from({ length:n }, (_, i) => [f1(cx + r * Math.cos(rot + i * 2 * Math.PI / n)), f1(cy + r * Math.sin(rot + i * 2 * Math.PI / n))]);
const SHAPES = {
  triangel:[[30, 175], [190, 175], [110, 35]], kvadrat:[[45, 35], [175, 35], [175, 165], [45, 165]], rektangel:[[15, 60], [205, 60], [205, 160], [15, 160]],
  femhörning:reg(5, 110, 108, 88), sexhörning:reg(6, 110, 100, 88, 0), åttahörning:reg(8, 110, 100, 88, Math.PI / 8),
  parallellogram:[[20, 160], [150, 160], [200, 50], [70, 50]], romb:[[110, 15], [190, 100], [110, 185], [30, 100]], parallelltrapets:[[60, 50], [160, 50], [205, 160], [15, 160]],
};
function figShape(name){
  if (name === 'cirkel') return svg(220, 200, `<circle cx="110" cy="100" r="85" fill="rgba(111,211,255,.22)" stroke="${C1}" stroke-width="4"/>`, 'Figur');
  return svg(220, 200, `<polygon points="${SHAPES[name].map(p => p.join(',')).join(' ')}" fill="rgba(111,211,255,.22)" stroke="${C1}" stroke-width="4" stroke-linejoin="round"/>`, 'Figur');
}
function figRect(l, b, unit, grid){
  if (grid){
    const S = Math.min(34, 300 / l); let s = '';
    for (let i = 0; i < l; i++) for (let j = 0; j < b; j++) s += `<rect x="${10 + i * S}" y="${10 + j * S}" width="${S}" height="${S}" fill="rgba(111,211,255,.25)" stroke="${C1}" stroke-width="2"/>`;
    return svg(20 + l * S, 20 + b * S, s, 'Rutnät');
  }
  const sc = Math.min(260 / l, 140 / b), w = l * sc, h = b * sc;
  const s = `<rect x="20" y="20" width="${f1(w)}" height="${f1(h)}" fill="rgba(111,211,255,.18)" stroke="${C1}" stroke-width="4"/>` + T(20 + w / 2, h + 44, `${fmt(l)} ${unit}`, { fill:C3 }) + T(w + 30, 20 + h / 2 + 5, `${fmt(b)} ${unit}`, { anchor:'start', fill:C3 });
  return svg(w + 110, h + 56, s, 'Rektangel');
}
function figSquare(s0, unit){ return figRect(s0, s0, unit, false).replace(`>${fmt(s0)} ${unit}</text></svg>`, `>${fmt(s0)} ${unit}</text></svg>`); }
function figRightTri(bs, h, unit){
  const sc = Math.min(240 / bs, 150 / h), w = bs * sc, hh = h * sc, x0 = 30, y0 = 20 + hh;
  let s = `<polygon points="${x0},${f1(y0)} ${f1(x0 + w)},${f1(y0)} ${x0},20" fill="rgba(255,154,213,.2)" stroke="${C2}" stroke-width="4" stroke-linejoin="round"/>`;
  s += `<polyline points="${x0 + 14},${f1(y0)} ${x0 + 14},${f1(y0 - 14)} ${x0},${f1(y0 - 14)}" fill="none" stroke="${CH}" stroke-width="2"/>`;
  s += T(x0 + w / 2, y0 + 24, `${fmt(bs)} ${unit}`, { fill:C3 }) + T(x0 - 8, 20 + hh / 2, `${fmt(h)} ${unit}`, { anchor:'end', fill:C3 });
  return svg(w + 90, hh + 50, s.replace(/x="(\d+(\.\d+)?)" y/, m => m), 'Triangel');
}
function figTri3(a, b, c, unit){
  const s = `<polygon points="30,170 250,170 170,40" fill="rgba(255,154,213,.18)" stroke="${C2}" stroke-width="4" stroke-linejoin="round"/>` +
    T(140, 196, `${fmt(a)} ${unit}`, { fill:C3 }) + T(228, 100, `${fmt(b)} ${unit}`, { anchor:'start', fill:C3 }) + T(88, 96, `${fmt(c)} ${unit}`, { anchor:'end', fill:C3 });
  return svg(320, 210, s, 'Triangel');
}
function figL(Wd, H, cw, ch, unit){
  const sc = Math.min(240 / Wd, 170 / H), w = Wd * sc, h = H * sc, cwp = cw * sc, chp = ch * sc, x = 40, y = 20;
  const pts = [[x, y], [x + w - cwp, y], [x + w - cwp, y + chp], [x + w, y + chp], [x + w, y + h], [x, y + h]].map(p => p.map(f1).join(',')).join(' ');
  let s = `<polygon points="${pts}" fill="rgba(94,224,138,.18)" stroke="${C4}" stroke-width="4" stroke-linejoin="round"/>`;
  s += T(x + w / 2, y + h + 24, `${fmt(Wd)} ${unit}`, { fill:C3 }) + T(x - 8, y + h / 2, `${fmt(H)} ${unit}`, { anchor:'end', fill:C3 });
  s += T(x + (w - cwp) / 2, y - 6, `${fmt(Wd - cw)} ${unit}`, { fill:C3 }) + T(x + w + 8, y + chp + (h - chp) / 2 + 5, `${fmt(H - ch)} ${unit}`, { anchor:'start', fill:C3 });
  return svg(w + 120, h + 56, s, 'Sammansatt figur');
}
function figAngle(deg, lab){
  const vx = 60, vy = 170, L = 170, a = deg * Math.PI / 180;
  let s = `<line x1="${vx}" y1="${vy}" x2="${vx + L}" y2="${vy}" stroke="${CH}" stroke-width="4" stroke-linecap="round"/>`;
  s += `<line x1="${vx}" y1="${vy}" x2="${f1(vx + L * Math.cos(a))}" y2="${f1(vy - L * Math.sin(a))}" stroke="${CH}" stroke-width="4" stroke-linecap="round"/>`;
  if (deg === 90) s += `<polyline points="${vx + 26},${vy} ${vx + 26},${vy - 26} ${vx},${vy - 26}" fill="none" stroke="${C3}" stroke-width="3"/>`;
  else s += `<path d="M${vx + 34},${vy} A34,34 0 ${deg > 180 ? 1 : 0} 0 ${f1(vx + 34 * Math.cos(a))},${f1(vy - 34 * Math.sin(a))}" fill="none" stroke="${C3}" stroke-width="3"/>`;
  if (lab) s += T(vx + 56 * Math.cos(a / 2), vy - 56 * Math.sin(a / 2) + 5, lab, { fill:C3, size:16 });
  const minX = Math.min(0, L * Math.cos(a));
  return svg(260 - minX, 200, `<g transform="translate(${f1(-minX)},0)">${s}</g>`, 'Vinkel');
}
function figSplit(known, total){
  const vx = total === 180 ? 160 : 50, vy = 170, L = 140, a = known * Math.PI / 180;
  let s = `<line x1="${vx}" y1="${vy}" x2="${vx + L}" y2="${vy}" stroke="${CH}" stroke-width="4"/>`;
  s += total === 180 ? `<line x1="${vx}" y1="${vy}" x2="${vx - L}" y2="${vy}" stroke="${CH}" stroke-width="4"/>` : `<line x1="${vx}" y1="${vy}" x2="${vx}" y2="${vy - L}" stroke="${CH}" stroke-width="4"/><polyline points="${vx + 14},${vy} ${vx + 14},${vy - 14} ${vx},${vy - 14}" fill="none" stroke="${DIM}" stroke-width="2"/>`;
  s += `<line x1="${vx}" y1="${vy}" x2="${f1(vx + L * Math.cos(a))}" y2="${f1(vy - L * Math.sin(a))}" stroke="${C1}" stroke-width="4"/>`;
  s += T(vx + 52 * Math.cos(a / 2), vy - 52 * Math.sin(a / 2) + 5, `${known}°`, { fill:C3, size:16 });
  const b = (known + total) / 2 * Math.PI / 180;
  s += T(vx + 52 * Math.cos(b), vy - 52 * Math.sin(b) + 5, '?', { fill:C2, size:20 });
  return svg(320, 190, s, 'Vinklar');
}
function figTriAngles(A, B, C){
  const s = `<polygon points="30,180 290,180 120,40" fill="rgba(111,211,255,.15)" stroke="${C1}" stroke-width="4" stroke-linejoin="round"/>` +
    T(66, 172, A, { fill:C3, size:16 }) + T(250, 172, B, { fill:C3, size:16 }) + T(122, 78, C, { fill:C2, size:16 });
  return svg(320, 200, s, 'Triangel');
}
function figCross(a){
  const c = [160, 100], L = 130, r = a * Math.PI / 180;
  let s = `<line x1="${c[0] - L}" y1="${c[1]}" x2="${c[0] + L}" y2="${c[1]}" stroke="${CH}" stroke-width="4"/>`;
  s += `<line x1="${f1(c[0] - L * Math.cos(r))}" y1="${f1(c[1] + L * Math.sin(r))}" x2="${f1(c[0] + L * Math.cos(r))}" y2="${f1(c[1] - L * Math.sin(r))}" stroke="${CH}" stroke-width="4"/>`;
  s += T(c[0] + 46 * Math.cos(r / 2), c[1] - 46 * Math.sin(r / 2) + 5, `${a}°`, { fill:C3, size:16 });
  s += T(c[0] - 46 * Math.cos(r / 2), c[1] + 46 * Math.sin(r / 2) + 5, '?', { fill:C2, size:20 });
  return svg(320, 200, s, 'Vinklar');
}
function fig3D(type){
  const st = `fill="rgba(111,211,255,.18)" stroke="${C1}" stroke-width="3.5" stroke-linejoin="round"`, dash = `fill="none" stroke="${C1}" stroke-width="2" stroke-dasharray="6 5"`;
  const B = {
    kub:`<polygon points="40,70 140,70 140,170 40,170" ${st}/><polygon points="40,70 80,35 180,35 140,70" ${st}/><polygon points="140,70 180,35 180,135 140,170" ${st}/>`,
    rätblock:`<polygon points="20,80 170,80 170,160 20,160" ${st}/><polygon points="20,80 60,45 210,45 170,80" ${st}/><polygon points="170,80 210,45 210,125 170,160" ${st}/>`,
    cylinder:`<path d="M50,50 L50,160 A60,18 0 0 0 170,160 L170,50" ${st}/><ellipse cx="110" cy="50" rx="60" ry="18" ${st}/>`,
    klot:`<circle cx="110" cy="100" r="80" ${st}/><ellipse cx="110" cy="100" rx="80" ry="22" ${dash}/>`,
    kon:`<path d="M40,160 L110,25 L180,160" ${st}/><ellipse cx="110" cy="160" rx="70" ry="18" ${st}/>`,
    pyramid:`<polygon points="30,150 140,150 110,25" ${st}/><polygon points="140,150 190,115 110,25" ${st}/><path d="M30,150 L80,115 L190,115 M80,115 L110,25" ${dash}/>`,
  };
  return svg(220, 190, B[type], 'Kropp');
}
function figBox(l, b, h, unit){
  const s = `<polygon points="20,90 190,90 190,170 20,170" fill="rgba(111,211,255,.18)" stroke="${C1}" stroke-width="3.5"/><polygon points="20,90 70,50 240,50 190,90" fill="rgba(111,211,255,.1)" stroke="${C1}" stroke-width="3.5"/><polygon points="190,90 240,50 240,130 190,170" fill="rgba(111,211,255,.06)" stroke="${C1}" stroke-width="3.5"/>` +
    T(105, 192, `${fmt(l)} ${unit}`, { fill:C3 }) + T(248, 158, `${fmt(b)} ${unit}`, { anchor:'start', fill:C3 }) + T(12, 136, `${fmt(h)} ${unit}`, { anchor:'end', fill:C3 });
  return svg(330, 205, `<g transform="translate(50,0)">${s}</g>`, 'Rätblock');
}
function figCircle(v, kind, unit){
  let s = `<circle cx="110" cy="100" r="80" fill="rgba(255,216,77,.12)" stroke="${C3}" stroke-width="4"/><circle cx="110" cy="100" r="4" fill="${CH}"/>`;
  s += kind === 'd' ? `<line x1="30" y1="100" x2="190" y2="100" stroke="${C1}" stroke-width="3"/>` + T(110, 92, `d = ${fmt(v)} ${unit}`, { fill:C1 })
                    : `<line x1="110" y1="100" x2="190" y2="100" stroke="${C1}" stroke-width="3"/>` + T(150, 92, `r = ${fmt(v)} ${unit}`, { fill:C1 });
  return svg(220, 200, s, 'Cirkel');
}
function figBag(counts){
  const cols = { röda:'#ff5a4d', blå:'#4aa3ff', gula:'#ffd84d', gröna:'#5ee08a' };
  let balls = []; Object.keys(counts).forEach(k => { for (let i = 0; i < counts[k]; i++) balls.push(cols[k]); });
  balls = shuffle(balls);
  let s = `<path d="M40,60 Q30,190 150,195 Q270,190 260,60 Z" fill="rgba(244,242,234,.08)" stroke="${CH}" stroke-width="3"/><path d="M60,60 Q150,30 240,60" fill="none" stroke="${CH}" stroke-width="3"/>`;
  balls.forEach((c, i) => { const r = Math.floor(i / 6), k = i % 6; s += `<circle cx="${78 + k * 29 + (r % 2) * 14}" cy="${170 - r * 28}" r="12" fill="${c}" stroke="#111" stroke-width="1.5"/>`; });
  return svg(300, 210, s, 'Påse med kulor');
}
const svgFracTxt = (n, d) => `<span class="fr"><i>${n}</i><i>${d}</i></span>`;

/* ---------- hjälptexter ---------- */
const OPS = { '+':'+', '-':'−' };
function mentalSteps(a, b, op){
  const s = op === '+' ? 1 : -1, sym = op === '+' ? '+' : '−', res = a + s * b, L = [];
  if (b < 10){
    const toTen = op === '+' ? (10 - a % 10) % 10 : a % 10;
    if (toTen > 0 && toTen < b){
      L.push(`Dela upp ${b} i ${toTen} och ${b - toTen}.`);
      L.push(`${fmt(a)} ${sym} ${toTen} = ${fmt(a + s * toTen)}.`);
      L.push(`${fmt(a + s * toTen)} ${sym} ${b - toTen} = ${fmt(res)}.`);
      return L;
    }
    return [`${fmt(a)} ${sym} ${b} = ${fmt(res)}.`];
  }
  const parts = [Math.floor(b / 100) * 100, Math.floor((b % 100) / 10) * 10, b % 10].filter(x => x > 0);
  if (parts.length > 1) L.push(`Dela upp ${fmt(b)} i ${parts.map(fmt).join(' och ')}.`);
  let cur = a;
  parts.forEach(x => { L.push(`${fmt(cur)} ${sym} ${fmt(x)} = ${fmt(cur + s * x)}.`); cur += s * x; });
  return L;
}
const UNITS = {
  len:{ mm:.001, cm:.01, dm:.1, m:1, km:1000, mil:10000 },
  vol:{ ml:.001, cl:.01, dl:.1, l:1 },
  wt:{ g:1, hg:100, kg:1000, ton:1e6 },
};
function CONV(v, from, to, sys, o = {}){
  const U = UNITS[sys], f = r6(U[from] / U[to]), ans = r6(v * f);
  const rule = f >= 1 ? `1 ${from} = ${fmt(f)} ${to}` : `1 ${to} = ${fmt(r6(1 / f))} ${from}`;
  const how = f >= 1 ? `${fmt(v)} · ${fmt(f)} = ${fmt(ans)}` : `${fmt(v)} / ${fmt(r6(1 / f))} = ${fmt(ans)}`;
  const move = f >= 1 ? `Större enhet till mindre: talet blir större.` : `Mindre enhet till större: talet blir mindre.`;
  return NUM(`${o.pre || ''}<b>${fmt(v)} ${from}</b> = ? ${to}`, ans, { suffix:to, steps:[`${rule}.`, move, `${how}.`, `${fmt(v)} ${from} = ${fmt(ans)} ${to}.`], hint:`${rule}.`, slow:1.3 });
}
function CONV2(v, big, small, sys, toMixed){
  const U = UNITS[sys], f = U[big] / U[small];
  if (toMixed){
    const hi = Math.floor(v / f), lo = v - hi * f;
    return MULTI(`<b>${fmt(v)} ${small}</b> = ? ${big} och ? ${small}`, [{ ans:hi, suffix:big }, { ans:lo, suffix:small }],
      { steps:[`1 ${big} = ${fmt(f)} ${small}.`, `${fmt(v)} ${small} räcker till ${hi} hela ${big} (${fmt(hi * f)} ${small}).`, `Det blir ${fmt(lo)} ${small} över.`], hint:`1 ${big} = ${fmt(f)} ${small}.` });
  }
  const hi = Math.floor(v / f), lo = v - hi * f;
  return NUM(`<b>${hi} ${big} ${fmt(lo)} ${small}</b> = ? ${small}`, v, { suffix:small, steps:[`1 ${big} = ${fmt(f)} ${small}, så ${hi} ${big} = ${fmt(hi * f)} ${small}.`, `${fmt(hi * f)} + ${fmt(lo)} = ${fmt(v)} ${small}.`], hint:`Gör om ${big} till ${small} först.` });
}
const UNITED = ['Fernandes', 'Mbeumo', 'Šeško', 'Amad', 'Mainoo', 'Mount', 'Cunha', 'Dalot'];
const MONTHS = ['Aug', 'Sep', 'Okt', 'Nov', 'Dec', 'Jan'];
const MONTHF = { Aug:'augusti', Sep:'september', Okt:'oktober', Nov:'november', Dec:'december', Jan:'januari' };
const FRNAME = { 2:'halvor', 3:'tredjedelar', 4:'fjärdedelar', 5:'femtedelar', 6:'sjättedelar', 7:'sjundedelar', 8:'åttondelar', 9:'niondelar', 10:'tiondelar', 12:'tolftedelar' };
function roundTo(x, step){ return Math.floor(x / step + .5) * step; }
function roundSteps(x, step, word){
  const r = roundTo(x, step), digitPos = Math.round(Math.log10(step));
  const nextDigit = Math.floor(r6(x / (step / 10))) % 10;
  return [`Avrunda till närmaste ${word}.`, `Titta på siffran efter: ${nextDigit}. ${nextDigit >= 5 ? '5 eller mer – avrunda uppåt.' : 'Mindre än 5 – avrunda nedåt.'}`, `${fmt(x)} ≈ ${fmt(r)}.`, digitPos > 99 ? '' : ''].filter(Boolean);
}
const decTxt = (i, dec) => fmt(r6(i / Math.pow(10, dec)));

/* =========================================================
   ALFA (Premier League)
   ========================================================= */
const ALFA = [
  { code:'A1.1', name:'Siffror och tal', gen(d){
    const n = [2, 3, 4, 5][d - 1];
    if (Math.random() < .55){
      const N = rnd(Math.pow(10, n - 1), Math.pow(10, n) - 1), ds = digitsOf(N, n), cand = [];
      ds.forEach((v, i) => { if (v > 0) cand.push(i); });
      const p = pick(cand), v = ds[p] * Math.pow(10, p);
      return NUM(`Vilket värde har siffran <b>${ds[p]}</b> i talet <b>${fmt(N)}</b>?`, v,
        { steps:[`Räkna platserna från höger: ental, tiotal, hundratal…`, `Siffran ${ds[p]} står på ${POS[p]}splatsen.`, `${ds[p]} ${POS[p]} = ${fmt(v)}.`], hint:'Räkna platserna från höger: ental, tiotal, hundratal, tusental.' });
    }
    const ds = Array.from({ length:n }, (_, i) => i === n - 1 ? rnd(1, 9) : rnd(0, 9)), N = fromDigits(ds);
    const parts = []; for (let i = n - 1; i >= 0; i--) parts.push(`${ds[i]} ${POS[i]}`);
    return NUM(`Skriv talet som har ${parts.slice(0, -1).join(', ')} och ${parts[parts.length - 1]}.`, N,
      { steps:[`Skriv siffrorna i ordning, från ${POS[n - 1]} till ental: ${ds.slice().reverse().join(' ')}.`, `Talet är ${fmt(N)}.`], hint:`Börja med ${POS[n - 1]}en längst till vänster.` });
  } },
  { code:'A1.2', name:'Addition och subtraktion med huvudräkning', gen(d){
    const op = Math.random() < .5 ? '+' : '-'; let a, b;
    for (;;){
      if (d === 1){ a = rnd(12, 89); b = rnd(2, 9); }
      else if (d === 2){ a = rnd(21, 79); b = rnd(11, 59); }
      else if (d === 3){ a = rnd(25, 89); b = rnd(13, 69); }
      else { a = rnd(2, 9) * 100 + rnd(1, 9) * 10; b = rnd(2, 9) * 10; }
      if (op === '-' && b >= a) continue;
      const cross = op === '+' ? (a % 10 + b % 10 >= 10) : (a % 10 < b % 10);
      if (d === 2 && (cross || (op === '+' && a + b >= 100))) continue;
      if (d === 3 && !cross) continue;
      if (d === 3 && op === '+' && a + b >= 150) continue;
      if (d === 4 && op === '+' && Math.floor(a / 10) % 10 + b / 10 < 10) continue;
      if (d === 4 && op === '-' && Math.floor(a / 10) % 10 >= b / 10) continue;
      break;
    }
    const res = op === '+' ? a + b : a - b;
    return NUM(`Räkna i huvudet: <b>${fmt(a)} ${OPS[op]} ${fmt(b)}</b>`, res, { steps:mentalSteps(a, b, op), hint:'Dela upp talet i tiotal och ental och räkna en del i taget.', slow:1.1 });
  } },
  { code:'A1.3', name:'Multiplikation med huvudräkning', gen(d){
    let a, b;
    if (d === 1){ a = pick([2, 3, 4, 5, 10]); b = rnd(2, 10); }
    else if (d === 2){ a = rnd(6, 9); b = rnd(3, 10); }
    else if (d === 3){ a = rnd(11, 19); b = rnd(2, 6); }
    else { a = rnd(21, 49); b = rnd(3, 9); }
    const res = a * b;
    const steps = a < 11 ? [`${a} · ${b} betyder ${b} grupper med ${a} i varje.`, `${a} · ${b} = ${res}.`]
      : [`Dela upp ${a} i ${a - a % 10} och ${a % 10}.`, `${a - a % 10} · ${b} = ${(a - a % 10) * b} och ${a % 10} · ${b} = ${(a % 10) * b}.`, `${(a - a % 10) * b} + ${(a % 10) * b} = ${res}.`];
    return NUM(`<b>${a} · ${b}</b> = ?`, res, { steps, hint:a < 11 ? `Räkna ${a}-hopp ${b} gånger.` : `Dela upp ${a} i tiotal och ental.`, slow:1.1 });
  } },
  { code:'A1.4', name:'Division med huvudräkning', gen(d){
    let dv, q;
    if (d === 1){ dv = rnd(2, 5); q = rnd(2, 10); }
    else if (d === 2){ dv = rnd(6, 9); q = rnd(2, 10); }
    else if (d === 3){ dv = rnd(2, 5); q = rnd(11, 25); }
    else { dv = rnd(3, 9); q = rnd(11, 30); }
    const a = dv * q;
    const steps = q <= 10 ? [`Vilket tal gånger ${dv} blir ${a}?`, `${dv} · ${q} = ${a}, alltså är ${a} / ${dv} = ${q}.`]
      : [`Dela upp ${a} i ${dv * 10 * Math.floor(q / 10)} och ${a - dv * 10 * Math.floor(q / 10)}.`, `${dv * 10 * Math.floor(q / 10)} / ${dv} = ${10 * Math.floor(q / 10)} och ${a - dv * 10 * Math.floor(q / 10)} / ${dv} = ${q % 10}.`, `${10 * Math.floor(q / 10)} + ${q % 10} = ${q}.`];
    return NUM(`<b>${a} / ${dv}</b> = ?`, q, { steps, hint:`Tänk multiplikation: vad gånger ${dv} blir ${a}?`, slow:1.1 });
  } },
  { code:'A1.5', name:'Multiplikation och division', gen(d){
    if (d <= 2){
      const a = rnd(d === 1 ? 2 : 6, d === 1 ? 5 : 9), b = rnd(2, 10), c = a * b;
      if (Math.random() < .5) return NUM(`<b>? · ${b} = ${c}</b>`, a, { steps:[`Vad gånger ${b} blir ${c}?`, `${c} / ${b} = ${a}.`], hint:'Division är motsatsen till multiplikation.' });
      return NUM(`<b>${c} / ? = ${a}</b>`, b, { steps:[`${c} delat med vad blir ${a}?`, `${a} · ${b} = ${c}, så svaret är ${b}.`], hint:'Tänk: vad gånger svaret blir talet?' });
    }
    const t = rnd(0, 2), n = rnd(3, d === 3 ? 6 : 9), k = rnd(d === 3 ? 4 : 6, d === 3 ? 9 : 12);
    if (t === 0) return NUM(`En turnering har ${n} lag med ${k} spelare i varje lag. Hur många spelare är det totalt?`, n * k, { suffix:'spelare', steps:[`${n} lag med ${k} i varje: ${n} · ${k}.`, `${n} · ${k} = ${n * k}.`], hint:'Lika många i varje grupp – multiplicera.' });
    if (t === 1) return NUM(`${n * k} bollar delas lika mellan ${n} lag. Hur många bollar får varje lag?`, k, { suffix:'bollar', steps:[`Dela lika: ${n * k} / ${n}.`, `${n} · ${k} = ${n * k}, så varje lag får ${k}.`], hint:'Dela lika – dividera.' });
    const p = rnd(3, d === 3 ? 6 : 12) * 5;
    return NUM(`En biljett kostar ${p} kr. Hur mycket kostar ${n} biljetter?`, n * p, { suffix:'kr', steps:[`${n} biljetter à ${p} kr: ${n} · ${p}.`, `${n} · ${p} = ${n * p} kr.`], hint:'Samma pris flera gånger – multiplicera.' });
  } },
  { code:'A2.1', name:'Addition med uppställning', gen(d){
    if (d === 1) return genAdd(2, [0, 0]);
    if (d === 2) return Math.random() < .5 ? genAdd(2, [1, 0]) : genAdd(3, [0, 0, 0]);
    if (d === 3) return genAdd(3, pick([[1, 0, 0], [0, 1, 0]]));
    return genAdd(3, [1, 1, 0]);
  } },
  { code:'A2.2', name:'Subtraktion med uppställning', gen(d){
    if (d === 1) return genSub(2, [0, 0]);
    if (d === 2) return Math.random() < .5 ? genSub(2, [1, 0]) : genSub(3, [0, 0, 0]);
    if (d === 3) return genSub(3, pick([[1, 0, 0], [0, 1, 0]]));
    return Math.random() < .5 ? genSub(3, [1, 1, 0]) : genSub(3, [1, 1, 0], [1]);
  } },
  { code:'A2.3', name:'Multiplikation med uppställning', gen(d){
    if (d === 1) return genMul(2, 2, 4, 0);
    if (d === 2) return genMul(2, 3, 9, 1);
    if (d === 3) return genMul(3, 2, 6, 1);
    return genMul(3, 6, 9, 2);
  } },
  { code:'A2.4', name:'Kort division', gen(d){
    let dv, q;
    for (;;){
      dv = d === 4 ? rnd(2, 3) : rnd(2, 4);
      const nq = d === 1 ? 2 : d === 2 ? 3 : d === 3 ? rnd(2, 3) : 4, maxd = Math.floor(9 / dv);
      const qd = Array.from({ length:nq }, (_, i) => rnd(i === 0 ? 1 : 0, maxd));
      if (d === 3){ dv = rnd(3, 6); qd[0] = rnd(Math.ceil(10 / dv), 9); for (let i = 1; i < nq; i++) qd[i] = rnd(0, Math.floor(9 / dv)); }
      q = Number(qd.join(''));
      const r = shortDiv(q * dv, dv);
      if (r.carries === 0 && r.q === q) break;
    }
    const a = q * dv, sd = shortDiv(a, dv);
    return NUM(`Räkna med kort division: <b>${fmt(a)} / ${dv}</b>`, q, { steps:[...sd.L, `Svaret är ${fmt(q)}.`], hint:'Dela en siffra i taget, från vänster.' });
  } },
  { code:'A2.5', name:'Division med rest', gen(d){
    let dv, q;
    if (d === 1){ dv = rnd(2, 5); q = rnd(2, 9); }
    else if (d === 2){ dv = rnd(6, 9); q = rnd(2, 9); }
    else { dv = rnd(2, 5); q = rnd(11, 30); }
    const r = rnd(1, dv - 1), a = dv * q + r;
    const steps = q < 10 ? [`Vilket är det största tal i ${dv}:ans tabell som får plats i ${a}? ${dv} · ${q} = ${dv * q}.`, `${a} − ${dv * q} = ${r} blir kvar.`, `Svaret är ${q} rest ${r}.`]
      : [...shortDiv(a, dv).L, `Svaret är ${q} rest ${r}.`];
    const q0 = d === 4 ? `Tränaren har ${a} västar och ${dv} lag. Alla lag ska få lika många. Hur många västar får varje lag, och hur många blir över?` : `<b>${a} / ${dv}</b> = ? rest ?`;
    return MULTI(q0, [{ ans:q, label:'Kvot' }, { ans:r, label:'Rest' }], { steps, answer:`${q} rest ${r}`, hint:`Hur många gånger får ${dv} plats i ${a}? Det som blir över är resten.` });
  } },
  { code:'A2.6', name:'Division med minnessiffra', gen(d){
    let dv, q, a, sd;
    for (let t = 0; t < 500; t++){
      if (d === 1){ dv = rnd(2, 5); q = rnd(11, 49); }
      else if (d === 2){ dv = rnd(2, 5); q = rnd(21, 199); }
      else if (d === 3){ dv = rnd(6, 9); q = rnd(11, 111); }
      else { dv = rnd(3, 9); q = rnd(112, 999); }
      a = dv * q; sd = shortDiv(a, dv);
      if (d === 1 && a > 99) continue;
      if (d >= 2 && a < 100) continue;
      if (sd.carries >= 1) break;
    }
    return NUM(`Räkna med kort division: <b>${fmt(a)} / ${dv}</b>`, q, { steps:[...sd.L, `Svaret är ${fmt(q)}.`], hint:'Det som blir kvar skriver du som minnessiffra framför nästa siffra.' });
  } },
  { code:'A3.1', name:'Tid', gen(d){
    const h = rnd(1, 12), m = d === 1 ? 0 : d === 2 ? pick([15, 30, 45]) : d === 3 ? rnd(1, 11) * 5 : rnd(1, 59);
    const word = m === 0 ? `pekar på ${h}` : `har passerat ${h}`;
    return MULTI('Vad är klockan?', [{ ans:h, label:'Timmar', mod:12 }, { ans:m, label:'Minuter' }],
      { fig:figClock(h, m), layout:'time', answer:`${h}:${pad2(m)} (eller ${h + 12 === 24 ? 0 : h + 12}:${pad2(m)})`, slow:1.6,
        steps:[`Den korta visaren (timvisaren) ${word}.`, `Den långa visaren (minutvisaren) visar ${m} minuter. Varje siffra på klockan är 5 minuter.`, `Klockan är ${h}:${pad2(m)}.`], hint:'Kort visare = timmar. Lång visare = minuter, och varje siffra är 5 minuter.' });
  } },
  { code:'A3.2', name:'Räkna med tid', gen(d){
    const tt = (h, m) => `${pad2(h)}:${pad2(m)}`;
    if (d <= 3){
      let h = rnd(8, 18), m, dh, dm;
      if (d === 1){ m = 0; dh = rnd(1, 4); dm = 0; }
      else if (d === 2){ m = rnd(0, 6) * 5; dh = 0; dm = rnd(2, 5) * 5; if (m + dm >= 60) dm = 55 - m; }
      else { m = rnd(6, 11) * 5; dh = rnd(0, 2); dm = rnd(3, 9) * 5; while (m + dm < 60) dm += 5; }
      const tot = h * 60 + m + dh * 60 + dm, eh = Math.floor(tot / 60) % 24, em = tot % 60;
      const dur = [dh ? `${dh} h` : '', dm ? `${dm} min` : ''].filter(Boolean).join(' ');
      const steps = [`Lägg till timmarna: ${dh ? `${tt(h, m)} + ${dh} h = ${tt(h + dh, m)}` : 'inga hela timmar'}.`, `Lägg till minuterna: ${m} + ${dm} = ${m + dm} minuter.`];
      if (m + dm >= 60) steps.push(`${m + dm} minuter = 1 timme och ${m + dm - 60} minuter.`);
      steps.push(`Matchen slutar ${tt(eh, em)}.`);
      return MULTI(`Matchen börjar <b>${tt(h, m)}</b> och håller på i <b>${dur}</b>. När slutar den?`, [{ ans:eh, label:'Timmar' }, { ans:em, label:'Minuter' }],
        { layout:'time', answer:tt(eh, em), steps, hint:'Lägg till timmarna först och sedan minuterna. 60 minuter = 1 timme.' });
    }
    const h1 = rnd(9, 16), m1 = rnd(1, 11) * 5, durM = rnd(7, 18) * 10 + (Math.random() < .5 ? 5 : 0), t2 = h1 * 60 + m1 + durM;
    const h2 = Math.floor(t2 / 60), m2 = t2 % 60, H = Math.floor(durM / 60), Mi = durM % 60;
    const toNext = 60 - m1;
    return MULTI(`Träningen börjar <b>${tt(h1, m1)}</b> och slutar <b>${tt(h2, m2)}</b>. Hur lång är träningen?`, [{ ans:H, label:'Timmar', suffix:'h' }, { ans:Mi, label:'Minuter', suffix:'min' }],
      { answer:`${H} h ${Mi} min`, steps:[`Från ${tt(h1, m1)} till ${tt(h1 + 1, 0)} är det ${toNext} minuter.`, `Från ${tt(h1 + 1, 0)} till ${tt(h2, m2)} är det ${(h2 - h1 - 1) * 60 + m2} minuter.`, `${toNext} + ${(h2 - h1 - 1) * 60 + m2} = ${durM} minuter = ${H} h ${Mi} min.`], hint:'Räkna först fram till nästa hela timme.' });
  } },
  { code:'A3.3', name:'Fler enheter för tid', gen(d){
    const C = {
      1:[['min', 's', 60, 1, 5], ['h', 'min', 60, 1, 4]],
      2:[['s', 'min', 1 / 60, 2, 6], ['dygn', 'h', 24, 1, 3], ['min', 'h', 1 / 60, 2, 5]],
      3:[['veckor', 'dygn', 7, 2, 6], ['år', 'månader', 12, 2, 5], ['h', 'dygn', 1 / 24, 2, 4]],
    };
    if (d <= 3){
      const [from, to, f, lo, hi] = pick(C[d]), k = rnd(lo, hi), v = f >= 1 ? k : Math.round(k / f), ans = f >= 1 ? k * f : k;
      const rule = f >= 1 ? `1 ${from === 'veckor' ? 'vecka' : from} = ${f} ${to}` : `1 ${to === 'dygn' ? 'dygn' : to} = ${Math.round(1 / f)} ${from}`;
      return NUM(`<b>${v} ${from}</b> = ? ${to}`, ans, { suffix:to, steps:[`${rule}.`, f >= 1 ? `${v} · ${f} = ${ans}.` : `${v} / ${Math.round(1 / f)} = ${ans}.`], hint:`${rule}.` });
    }
    if (Math.random() < .5){
      const h = rnd(1, 3), m = rnd(1, 11) * 5;
      return NUM(`<b>${h} h ${m} min</b> = ? min`, h * 60 + m, { suffix:'min', steps:[`1 h = 60 min, så ${h} h = ${h * 60} min.`, `${h * 60} + ${m} = ${h * 60 + m} min.`], hint:'1 timme = 60 minuter.' });
    }
    const s = rnd(70, 290);
    return MULTI(`<b>${s} s</b> = ? min och ? s`, [{ ans:Math.floor(s / 60), suffix:'min' }, { ans:s % 60, suffix:'s' }],
      { steps:[`1 min = 60 s.`, `${s} s räcker till ${Math.floor(s / 60)} hela minuter (${Math.floor(s / 60) * 60} s).`, `${s} − ${Math.floor(s / 60) * 60} = ${s % 60} s blir kvar.`], hint:'1 minut = 60 sekunder.' });
  } },
  { code:'A3.4', name:'Tabeller', gen(d){
    const ps = shuffle(UNITED).slice(0, 4), ms = ['Aug', 'Sep', 'Okt'], mf = ['augusti', 'september', 'oktober'];
    let data;
    for (;;){ data = ps.map(() => ms.map(() => rnd(0, 6))); const tot = data.map(r => r[0] + r[1] + r[2]); if (new Set(tot).size === 4) break; }
    const fig = figTable(['Spelare', ...ms], ps.map((p, i) => [p, ...data[i]]));
    const i = rnd(0, 3), j = rnd(0, 2);
    if (d === 1) return NUM(`Tabellen visar mål per månad. Hur många mål gjorde <b>${ps[i]}</b> i <b>${mf[j]}</b>?`, data[i][j], { fig, suffix:'mål', steps:[`Leta upp raden för ${ps[i]}.`, `Gå till kolumnen ${ms[j]}: ${data[i][j]} mål.`], hint:'Hitta raden först och sedan kolumnen.' });
    if (d === 2){ const s = data[i].reduce((a, b) => a + b, 0); return NUM(`Hur många mål gjorde <b>${ps[i]}</b> totalt under de tre månaderna?`, s, { fig, suffix:'mål', steps:[`Raden för ${ps[i]}: ${data[i].join(' + ')}.`, `${data[i].join(' + ')} = ${s} mål.`], hint:'Addera alla tal på spelarens rad.' }); }
    if (d === 3){
      const others = [0, 1, 2, 3].filter(x => x !== i && data[x][j] !== data[i][j]);
      if (!others.length) return this.gen(3);
      const k = pick(others);
      const hi = data[i][j] > data[k][j] ? i : k, lo = hi === i ? k : i;
      return NUM(`Hur många fler mål gjorde <b>${ps[hi]}</b> än <b>${ps[lo]}</b> i ${mf[j]}?`, data[hi][j] - data[lo][j], { fig, suffix:'mål', steps:[`${ps[hi]}: ${data[hi][j]} mål, ${ps[lo]}: ${data[lo][j]} mål.`, `${data[hi][j]} − ${data[lo][j]} = ${data[hi][j] - data[lo][j]}.`], hint:'”Hur många fler” – räkna skillnaden med subtraktion.' });
    }
    const tot = data.map(r => r.reduce((a, b) => a + b, 0)), best = tot.indexOf(Math.max(...tot));
    return CHOICE('Vem gjorde flest mål totalt?', ps[best], ps.filter((_, x) => x !== best), { fig, steps:ps.map((p, x) => `${p}: ${data[x].join(' + ')} = ${tot[x]}.`).concat([`Flest mål: ${ps[best]}.`]), hint:'Räkna ihop varje rad och jämför.', slow:1.8 });
  } },
  { code:'A3.5', name:'Diagram', gen(d){
    const step = [1, 2, 5, 10][d - 1], n = 5, labels = MONTHS.slice(0, n);
    const vals = labels.map(() => d === 4 ? rnd(1, 16) * 5 : rnd(1, 8) * step);
    const fig = figBars(labels, vals, step, 'Mål');
    const i = rnd(0, n - 1);
    if (d <= 2) return NUM(`Diagrammet visar hur många mål United gjorde varje månad. Hur många mål gjorde de i <b>${MONTHF[labels[i]]}</b>?`, vals[i], { fig, suffix:'mål', steps:[`Följ stapeln för ${labels[i]} upp till toppen.`, `Läs av mot skalan till vänster: ${vals[i]} mål.`], hint:`Varje linje i skalan är ${step} mål.` });
    let k = (i + rnd(1, n - 1)) % n;
    if (d === 3){ const hi = vals[i] >= vals[k] ? i : k, lo = hi === i ? k : i; return NUM(`Hur många fler mål gjorde United i <b>${MONTHF[labels[hi]]}</b> än i <b>${MONTHF[labels[lo]]}</b>?`, vals[hi] - vals[lo], { fig, suffix:'mål', steps:[`${labels[hi]}: ${vals[hi]} mål. ${labels[lo]}: ${vals[lo]} mål.`, `${vals[hi]} − ${vals[lo]} = ${vals[hi] - vals[lo]}.`], hint:`Läs av båda staplarna. Varje linje är ${step} mål.` }); }
    return NUM(`Hur många mål gjorde United i <b>${MONTHF[labels[i]]}</b> och <b>${MONTHF[labels[k]]}</b> tillsammans?`, vals[i] + vals[k], { fig, suffix:'mål', steps:[`${labels[i]}: ${vals[i]} mål. ${labels[k]}: ${vals[k]} mål. (En stapel mitt emellan två linjer är 5.)`, `${vals[i]} + ${vals[k]} = ${vals[i] + vals[k]}.`], hint:'Varje linje är 10 mål. Halvvägs mellan två linjer är 5.' });
  } },
  { code:'A3.6', name:'Medelvärde', gen(d){
    const n = [3, 4, 5, 6][d - 1], mean = rnd(2, d === 4 ? 15 : 8);
    let vals;
    for (;;){ vals = Array.from({ length:n - 1 }, () => Math.max(0, mean + rnd(-3, 3))); const last = mean * n - vals.reduce((a, b) => a + b, 0); if (last >= 0 && last <= mean + 5){ vals.push(last); break; } }
    vals = shuffle(vals);
    const sum = vals.reduce((a, b) => a + b, 0);
    return NUM(`Ett lag gjorde så här många mål i ${n} matcher: <b>${vals.join(', ')}</b>. Vad är medelvärdet?`, mean, { suffix:'mål', steps:[`Lägg ihop alla: ${vals.join(' + ')} = ${sum}.`, `Dela med antalet matcher: ${sum} / ${n} = ${mean}.`], hint:'Medelvärde = summan delat med antalet.' });
  } },
  { code:'A4.1', name:'Multiplikation med 10, 100 och 1 000', gen(d){
    const f = d === 1 ? 10 : d === 2 ? 100 : d === 3 ? 1000 : pick([10, 100, 1000]), a = d === 4 ? rnd(101, 999) : rnd(2, 99), z = String(f).length - 1;
    if (d === 4 && Math.random() < .5) return NUM(`<b>${a} · ? = ${fmt(a * f)}</b>`, f, { steps:[`Hur många nollor har kommit till? ${z}.`, `Då är det multiplikation med ${fmt(f)}.`], hint:'Räkna nollorna som har kommit till.' });
    return NUM(`<b>${a} · ${fmt(f)}</b> = ?`, a * f, { steps:[`Multiplicera med ${fmt(f)}: varje siffra flyttas ${z} steg åt vänster.`, `Lägg till ${z} ${z === 1 ? 'nolla' : 'nollor'}: ${fmt(a * f)}.`], hint:`Med ${fmt(f)} lägger du till ${z} ${z === 1 ? 'nolla' : 'nollor'}.`, slow:1 });
  } },
  { code:'A4.2', name:'Multiplikation med tal som slutar på 0', gen(d){
    let a, b;
    if (d === 1){ a = rnd(2, 9); b = rnd(2, 9) * 10; }
    else if (d === 2){ a = rnd(11, 25); b = rnd(2, 5) * 10; }
    else if (d === 3){ a = rnd(2, 9) * 10; b = rnd(2, 9) * 10; }
    else { a = rnd(2, 9) * 100; b = rnd(2, 9) * 10; }
    const strip = x => { let z = 0; while (x % 10 === 0){ x /= 10; z++; } return [x, z]; };
    const [a1, za] = strip(a), [b1, zb] = strip(b), z = za + zb;
    return NUM(`<b>${fmt(a)} · ${fmt(b)}</b> = ?`, a * b, { steps:[`Räkna utan nollorna: ${a1} · ${b1} = ${a1 * b1}.`, `Lägg tillbaka nollorna (${z} st): ${fmt(a * b)}.`], hint:'Räkna utan nollorna först och lägg till dem sist.', slow:1.1 });
  } },
  { code:'A4.3', name:'Division med tal som slutar på 0', gen(d){
    let a, dv, q, steps;
    if (d === 1){ dv = rnd(2, 9); q = rnd(2, 9) * 10; a = dv * q; steps = [`Tänk ${a / 10} tiotal delat med ${dv}.`, `${a / 10} / ${dv} = ${q / 10}, så svaret är ${q / 10} tiotal = ${q}.`]; }
    else if (d === 2){ dv = rnd(2, 9) * 10; q = rnd(2, 9); a = dv * q; steps = [`Stryk en nolla i båda talen: ${a / 10} / ${dv / 10}.`, `${a / 10} / ${dv / 10} = ${q}.`]; }
    else if (d === 3){ dv = rnd(2, 9) * 10; q = rnd(2, 9) * 10; a = dv * q; steps = [`Stryk en nolla i båda talen: ${fmt(a / 10)} / ${dv / 10}.`, `${fmt(a / 10)} / ${dv / 10} = ${q}.`]; }
    else { dv = rnd(2, 9) * 100; q = rnd(2, 9); a = dv * q; steps = [`Stryk två nollor i båda talen: ${a / 100} / ${dv / 100}.`, `${a / 100} / ${dv / 100} = ${q}.`]; }
    return NUM(`<b>${fmt(a)} / ${fmt(dv)}</b> = ?`, q, { steps, hint:'Stryk lika många nollor i båda talen.', slow:1.1 });
  } },
  { code:'A4.4', name:'Avrundning och överslagsräkning', gen(d){
    if (d === 1){ const x = rnd(11, 99); return NUM(`Avrunda <b>${x}</b> till närmaste tiotal.`, roundTo(x, 10), { steps:roundSteps(x, 10, 'tiotal'), hint:'Titta på entalssiffran. 5 eller mer – avrunda uppåt.' }); }
    if (d === 2){ const x = rnd(101, 999), st = pick([10, 100]), w = st === 10 ? 'tiotal' : 'hundratal'; return NUM(`Avrunda <b>${x}</b> till närmaste ${w}.`, roundTo(x, st), { steps:roundSteps(x, st, w), hint:'Titta på siffran efter den du avrundar till.' }); }
    if (d === 3){ const x = rnd(1001, 9999), st = pick([100, 1000]), w = st === 100 ? 'hundratal' : 'tusental'; return NUM(`Avrunda <b>${fmt(x)}</b> till närmaste ${w}.`, roundTo(x, st), { steps:roundSteps(x, st, w), hint:'Titta på siffran efter den du avrundar till.' }); }
    const op = Math.random() < .5 ? '+' : '-', A = rnd(3, 7) * 100, B = rnd(1, op === '-' ? A / 100 - 1 : 3) * 100, a = A + rnd(-30, 30), b = B + rnd(-30, 30);
    const c = op === '+' ? A + B : A - B;
    return CHOICE(`Gör en överslagsräkning. Ungefär hur mycket är <b>${a} ${OPS[op]} ${b}</b>?`, c, [c + 100, c - 100, c + 200, c * 10].filter(x => x > 0),
      { steps:[`Avrunda till hela hundratal: ${a} ≈ ${A} och ${b} ≈ ${B}.`, `${A} ${OPS[op]} ${B} = ${c}.`], hint:'Avrunda båda talen till hundratal först.' });
  } },
  { code:'A4.5', name:'Bråk', gen(d){
    if (d <= 2){
      const p = d === 1 ? rnd(2, 4) : rnd(5, 8), s = rnd(1, p - 1), kind = pick(['circle', 'bar']);
      return FRAC('Hur stor del av figuren är färgad?', s, p, { fig:figFrac(kind, p, s), steps:[`Figuren är delad i ${p} lika stora delar.`, `${s} av delarna är färgade.`, `Det är ${s}/${p}.`], hint:'Nämnaren (under strecket) = antal delar. Täljaren = färgade delar.' });
    }
    const k = rnd(d === 3 ? 2 : 3, d === 3 ? 5 : 8), base = rnd(2, 10), n = k * base, j = d === 3 ? 1 : rnd(2, k - 1);
    return NUM(`Hur mycket är <b>${j}/${k} av ${n}</b>?`, j * base, { steps:[`1/${k} av ${n}: ${n} / ${k} = ${base}.`, ...(j > 1 ? [`${j}/${k} är ${j} gånger så mycket: ${j} · ${base} = ${j * base}.`] : [])], hint:`Dela först ${n} i ${k} lika delar.` });
  } },
  { code:'A5.1', name:'Från större till mindre längdenheter', gen(d){
    if (d === 4) return CONV2(rnd(2, 9) * 100 + rnd(1, 99), 'm', 'cm', 'len', false);
    const P = { 1:[['m', 'dm'], ['dm', 'cm'], ['cm', 'mm']], 2:[['m', 'cm'], ['dm', 'mm']], 3:[['km', 'm'], ['m', 'mm']] }[d], [from, to] = pick(P);
    return CONV(rnd(2, 9), from, to, 'len');
  } },
  { code:'A5.2', name:'Från mindre till större längdenheter', gen(d){
    if (d === 4) return CONV2(rnd(2, 9) * 100 + rnd(1, 99), 'm', 'cm', 'len', true);
    const P = { 1:[['dm', 'm', 10], ['cm', 'dm', 10], ['mm', 'cm', 10]], 2:[['cm', 'm', 100], ['mm', 'dm', 100]], 3:[['m', 'km', 1000], ['mm', 'm', 1000]] }[d], [from, to, f] = pick(P);
    return CONV(rnd(2, 9) * f, from, to, 'len');
  } },
  { code:'A5.3', name:'Mil och kilometer', gen(d){
    if (d === 1) return CONV(rnd(2, 9), 'mil', 'km', 'len');
    if (d === 2) return CONV(rnd(2, 9) * 10, 'km', 'mil', 'len');
    if (d === 3){ const m = rnd(1, 5), k = rnd(1, 9); return NUM(`<b>${m} mil ${k} km</b> = ? km`, m * 10 + k, { suffix:'km', steps:[`1 mil = 10 km, så ${m} mil = ${m * 10} km.`, `${m * 10} + ${k} = ${m * 10 + k} km.`], hint:'1 mil = 10 km.' }); }
    const k = rnd(11, 99); return MULTI(`<b>${k} km</b> = ? mil och ? km`, [{ ans:Math.floor(k / 10), suffix:'mil' }, { ans:k % 10, suffix:'km' }], { steps:['1 mil = 10 km.', `${k} km räcker till ${Math.floor(k / 10)} mil (${Math.floor(k / 10) * 10} km).`, `${k % 10} km blir kvar.`], hint:'1 mil = 10 km.' });
  } },
  { code:'A5.4', name:'Geometriska former', gen(d){
    const INFO = { triangel:'tre sidor och tre hörn', kvadrat:'fyra lika långa sidor och fyra räta vinklar', rektangel:'fyra räta vinklar, och motstående sidor är lika långa', cirkel:'ingen hörn – alla punkter är lika långt från mitten',
      femhörning:'fem sidor och fem hörn', sexhörning:'sex sidor och sex hörn', åttahörning:'åtta sidor och åtta hörn', parallellogram:'två par parallella sidor men inga räta vinklar',
      romb:'fyra lika långa sidor men inga räta vinklar', parallelltrapets:'ett par parallella sidor' };
    if (d === 4){
      const s = pick(['triangel', 'kvadrat', 'femhörning', 'sexhörning', 'åttahörning']), n = { triangel:3, kvadrat:4, femhörning:5, sexhörning:6, åttahörning:8 }[s], what = pick(['hörn', 'sidor']);
      return NUM(`Hur många ${what} har en <b>${s}</b>?`, n, { steps:[`En ${s} har ${INFO[s]}.`], hint:'Namnet säger ofta hur många hörn figuren har.' });
    }
    const G = { 1:['triangel', 'kvadrat', 'rektangel', 'cirkel'], 2:['femhörning', 'sexhörning', 'triangel', 'åttahörning'], 3:['parallellogram', 'romb', 'rektangel', 'kvadrat', 'parallelltrapets'] }[d], s = pick(G);
    return CHOICE('Vad heter figuren?', s, G.filter(x => x !== s), { fig:figShape(s), steps:[`En ${s} har ${INFO[s]}.`], hint:'Räkna hörnen och titta efter räta vinklar.' });
  } },
  { code:'A5.5', name:'Area', gen(d){
    if (d === 1){ const l = rnd(2, 7), b = rnd(2, 4); return NUM('Varje ruta är 1 cm². Hur stor är arean?', l * b, { fig:figRect(l, b, 'cm', true), suffix:'cm²', steps:[`Det är ${b} rader med ${l} rutor i varje.`, `${b} · ${l} = ${l * b} rutor = ${l * b} cm².`], hint:'Räkna rutorna – eller räkna rader gånger rutor per rad.' }); }
    if (d === 2){ const l = rnd(3, 12), b = rnd(2, 8); return NUM('Hur stor är rektangelns area?', l * b, { fig:figRect(l, b, 'cm'), suffix:'cm²', steps:['Area = längd · bredd.', `${l} · ${b} = ${l * b} cm².`], hint:'Area = längd · bredd.' }); }
    if (d === 3){ const s = rnd(3, 12); return NUM(`En kvadrat har sidan <b>${s} cm</b>. Hur stor är arean?`, s * s, { fig:figRect(s, s, 'cm'), suffix:'cm²', steps:['Alla sidor i en kvadrat är lika långa.', `Area = ${s} · ${s} = ${s * s} cm².`], hint:'Area = sida · sida.' }); }
    const b = rnd(2, 9), l = rnd(3, 12);
    return NUM(`En rektangel har arean <b>${l * b} cm²</b> och bredden <b>${b} cm</b>. Hur lång är den?`, l, { suffix:'cm', steps:['Area = längd · bredd.', `? · ${b} = ${l * b}.`, `${l * b} / ${b} = ${l} cm.`], hint:'Vilket tal gånger bredden blir arean?' });
  } },
  { code:'A6.1', name:'Från mindre till större volymenheter', gen(d){
    if (d === 4){ const l = rnd(1, 5), dl = rnd(1, 9); return MULTI(`<b>${l * 100 + dl * 10} cl</b> = ? l och ? dl`, [{ ans:l, suffix:'l' }, { ans:dl, suffix:'dl' }], { steps:['1 l = 100 cl och 1 dl = 10 cl.', `${l * 100 + dl * 10} cl = ${l * 100} cl + ${dl * 10} cl.`, `= ${l} l och ${dl} dl.`], hint:'1 l = 100 cl, 1 dl = 10 cl.' }); }
    const P = { 1:[['dl', 'l', 10]], 2:[['cl', 'l', 100], ['cl', 'dl', 10]], 3:[['ml', 'l', 1000], ['ml', 'dl', 100], ['ml', 'cl', 10]] }[d], [from, to, f] = pick(P);
    return CONV(rnd(2, 9) * f, from, to, 'vol');
  } },
  { code:'A6.2', name:'Från större till mindre volymenheter', gen(d){
    if (d === 4){ const l = rnd(1, 5), dl = rnd(1, 9); return NUM(`<b>${l} l ${dl} dl</b> = ? dl`, l * 10 + dl, { suffix:'dl', steps:[`1 l = 10 dl, så ${l} l = ${l * 10} dl.`, `${l * 10} + ${dl} = ${l * 10 + dl} dl.`], hint:'1 l = 10 dl.' }); }
    const P = { 1:[['l', 'dl']], 2:[['l', 'cl'], ['dl', 'cl']], 3:[['l', 'ml'], ['dl', 'ml'], ['cl', 'ml']] }[d], [from, to] = pick(P);
    return CONV(rnd(2, 9), from, to, 'vol');
  } },
  { code:'A6.3', name:'Från mindre till större viktenheter', gen(d){
    if (d === 4){ const k = rnd(1, 9), h = rnd(1, 9); return MULTI(`<b>${fmt(k * 1000 + h * 100)} g</b> = ? kg och ? hg`, [{ ans:k, suffix:'kg' }, { ans:h, suffix:'hg' }], { steps:['1 kg = 1 000 g och 1 hg = 100 g.', `${fmt(k * 1000 + h * 100)} g = ${fmt(k * 1000)} g + ${h * 100} g = ${k} kg och ${h} hg.`], hint:'1 kg = 1 000 g, 1 hg = 100 g.' }); }
    const P = { 1:[['hg', 'kg', 10]], 2:[['g', 'hg', 100], ['g', 'kg', 1000]], 3:[['kg', 'ton', 1000]] }[d], [from, to, f] = pick(P);
    return CONV(rnd(2, 9) * f, from, to, 'wt');
  } },
  { code:'A6.4', name:'Från större till mindre viktenheter', gen(d){
    if (d === 4){ const k = rnd(1, 9), h = rnd(1, 9); return NUM(`<b>${k} kg ${h} hg</b> = ? hg`, k * 10 + h, { suffix:'hg', steps:[`1 kg = 10 hg, så ${k} kg = ${k * 10} hg.`, `${k * 10} + ${h} = ${k * 10 + h} hg.`], hint:'1 kg = 10 hg.' }); }
    const P = { 1:[['kg', 'hg']], 2:[['hg', 'g'], ['kg', 'g']], 3:[['ton', 'kg']] }[d], [from, to] = pick(P);
    return CONV(rnd(2, 9), from, to, 'wt');
  } },
];

/* =========================================================
   BETA (Champions League)
   ========================================================= */
const BETA = [
  { code:'B1.1', name:'Tal i bråkform', gen(d){
    if (d === 1){ const p = rnd(3, 10), s = rnd(1, p - 1); return FRAC('Hur stor del av figuren är färgad?', s, p, { fig:figFrac(pick(['circle', 'bar']), p, s), steps:[`${p} lika stora delar, ${s} är färgade.`, `Det är ${s}/${p}.`], hint:'Nämnaren = antal delar. Täljaren = färgade delar.' }); }
    if (d === 2){
      const n = pick([3, 4, 5, 6, 8, 10]);
      if (Math.random() < .5) return NUM(`Hur många <b>${FRNAME[n]}</b> är en hel?`, n, { steps:[`En hel delad i ${FRNAME[n]} blir ${n} delar.`, `${n}/${n} = 1.`], hint:'Hur många lika stora delar behövs för en hel?' });
      const a = rnd(1, n - 1); return NUM(`<b>${a}/${n} + ?/${n} = 1</b>`, n - a, { steps:[`1 = ${n}/${n}.`, `${n} − ${a} = ${n - a}, så ${a}/${n} + ${n - a}/${n} = 1.`], hint:`En hel är ${n}/${n}.` });
    }
    if (d === 3){ const n = rnd(5, 12), ts = shuffle(Array.from({ length:n - 1 }, (_, i) => i + 1)).slice(0, 4), mx = Math.max(...ts); return CHOICE('Vilket bråk är störst?', fracTxt(mx, n), ts.filter(t => t !== mx).map(t => fracTxt(t, n)), { steps:['Alla bråk har samma nämnare – delarna är lika stora.', `Flest delar ger störst bråk: ${mx}/${n}.`], hint:'Samma nämnare: jämför täljarna.' }); }
    const t = rnd(1, 3), ns = shuffle([3, 4, 5, 6, 7, 8, 9, 10].filter(x => x > t)).slice(0, 4), mn = Math.min(...ns);
    return CHOICE('Vilket bråk är störst?', fracTxt(t, mn), ns.filter(x => x !== mn).map(x => fracTxt(t, x)), { steps:['Alla bråk har samma täljare.', 'Ju färre delar en hel delas i, desto större är varje del.', `Störst: ${t}/${mn}.`], hint:'Samma täljare: minst nämnare ger störst bråk.' });
  } },
  { code:'B1.2', name:'Bråkform och decimalform', gen(d){
    if (d === 1){ const k = rnd(1, 9); return NUM(`Skriv <b>${k}/10</b> i decimalform.`, k / 10, { steps:[`${k}/10 = ${k} tiondelar.`, `${k} tiondelar = ${fmt(k / 10)}.`], hint:'Tiondelar skrivs på första platsen efter kommat.' }); }
    if (d === 2){ let k; do { k = rnd(11, 99); } while (k % 10 === 0); return NUM(`Skriv <b>${k}/100</b> i decimalform.`, k / 100, { steps:[`${k}/100 = ${k} hundradelar.`, `${k} hundradelar = ${fmt(k / 100)}.`], hint:'Hundradelar har två platser efter kommat.' }); }
    if (d === 3){ const k = rnd(1, 9); return FRAC(`Skriv <b>${fmt(k / 10)}</b> i bråkform.`, k, 10, { steps:[`${fmt(k / 10)} = ${k} tiondelar.`, `${k} tiondelar = ${k}/10.`], hint:'Första siffran efter kommat är tiondelar.' }); }
    let k; do { k = rnd(11, 99); } while (k % 10 === 0);
    return FRAC(`Skriv <b>${fmt(k / 100)}</b> i bråkform.`, k, 100, { steps:[`${fmt(k / 100)} = ${k} hundradelar.`, `${k} hundradelar = ${k}/100.`], hint:'Två siffror efter kommat är hundradelar.' });
  } },
  { code:'B1.3', name:'Flera bråk i decimalform', gen(d){
    const L = { 1:[[1, 2], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10]], 2:[[1, 4], [3, 4], [1, 2], [2, 5]], 3:[[1, 4], [3, 4], [1, 5], [3, 5], [1, 2]], 4:[[3, 20], [7, 20], [1, 25], [3, 25], [9, 50]] }[d];
    const [n, dd] = pick(L), k = 100 / dd, dec = r6(n / dd);
    if (d === 3) return FRAC(`Skriv <b>${fmt(dec)}</b> i bråkform.`, n, dd, { steps:[`${fmt(dec)} = ${Math.round(dec * 100)}/100.`, `Förkorta: ${Math.round(dec * 100)}/100 = ${n}/${dd}.`], hint:'Skriv som hundradelar först.' });
    return NUM(`Skriv <b>${n}/${dd}</b> i decimalform.`, dec, { steps:[`Förläng till hundradelar: ${n}/${dd} = ${n * k}/100.`, `${n * k}/100 = ${fmt(dec)}.`], hint:'Förläng så att nämnaren blir 10 eller 100.' });
  } },
  { code:'B1.4', name:'Mer om tal i decimalform', gen(d){
    if (d <= 2){
      const ip = rnd(0, 9), t = rnd(1, 9), h = rnd(1, 9), x = r6(ip + t / 10 + (d === 2 ? h / 100 : 0)), dig = d === 1 ? t : h, v = d === 1 ? t / 10 : h / 100;
      return NUM(`Vilket värde har siffran <b>${dig}</b> i talet <b>${fmt(x)}</b>? <span class="muted">(${d === 1 ? 'tiondelar' : 'hundradelar'})</span>`, v, { steps:[`Första platsen efter kommat är tiondelar, andra är hundradelar.`, `${dig} står på ${d === 1 ? 'tiondels' : 'hundradels'}platsen: ${fmt(v)}.`], hint:'Efter kommat: tiondelar, hundradelar, tusendelar.' });
    }
    if (d === 3){
      const a = rnd(1, 8), b = rnd(1, 9), opts = [r6(a / 10), r6(a / 10 - .05 + b / 1000), r6(a / 100 + b / 1000), r6((a - 1) / 10 + .09)].filter(x => x > 0);
      const mx = Math.max(...opts); return CHOICE('Vilket tal är störst?', fmt(mx), opts.filter(x => x !== mx).map(fmt), { steps:['Jämför tiondelarna först, sedan hundradelarna.', `Störst: ${fmt(mx)}.`], hint:'Jämför siffra för siffra från vänster efter kommat.' });
    }
    const a = rnd(10, 98), lo = a / 10, hi = (a + 1) / 10;
    return NUM(`Vilket tal ligger mitt emellan <b>${fmt(lo)}</b> och <b>${fmt(hi)}</b>?`, r6(lo + .05), { steps:[`Skriv som hundradelar: ${fmt(lo)} = ${a}0 hundradelar, ${fmt(hi)} = ${a + 1}0 hundradelar.`, `Mitt emellan är ${a}5 hundradelar = ${fmt(r6(lo + .05))}.`], hint:'Lägg till en nolla: 2,3 = 2,30.' });
  } },
  { code:'B1.5', name:'Avrundning', gen(d){
    if (d === 1){ const x = rnd(101, 9999), st = pick([10, 100]), w = st === 10 ? 'tiotal' : 'hundratal'; return NUM(`Avrunda <b>${fmt(x)}</b> till närmaste ${w}.`, roundTo(x, st), { steps:roundSteps(x, st, w), hint:'Titta på siffran efter.' }); }
    if (d === 2){ const x = r6(rnd(10, 999) / 10); return NUM(`Avrunda <b>${fmt(x)}</b> till närmaste heltal.`, Math.round(x), { steps:[`Titta på tiondelssiffran: ${Math.round(x * 10) % 10}.`, `${Math.round(x * 10) % 10 >= 5 ? 'Avrunda uppåt' : 'Avrunda nedåt'}: ${fmt(x)} ≈ ${Math.round(x)}.`], hint:'Titta på första siffran efter kommat.' }); }
    if (d === 3){ let i; do { i = rnd(101, 999); } while (i % 10 === 0); const x = i / 100, r = Math.round(i / 10) / 10; return NUM(`Avrunda <b>${fmt(x)}</b> till en decimal.`, r, { steps:[`Titta på hundradelssiffran: ${i % 10}.`, `${i % 10 >= 5 ? 'Avrunda uppåt' : 'Avrunda nedåt'}: ${fmt(x)} ≈ ${fmt(r)}.`], hint:'Titta på andra siffran efter kommat.' }); }
    let i; do { i = rnd(1001, 9999); } while (i % 10 === 0); const x = i / 1000, r = Math.round(i / 10) / 100;
    return NUM(`Avrunda <b>${fmt(x)}</b> till två decimaler.`, r, { steps:[`Titta på tusendelssiffran: ${i % 10}.`, `${i % 10 >= 5 ? 'Avrunda uppåt' : 'Avrunda nedåt'}: ${fmt(x)} ≈ ${fmt(r)}.`], hint:'Titta på tredje siffran efter kommat.' });
  } },
  { code:'B2.1', name:'Addition med tal i decimalform', gen(d){
    let a, b, c = 0, dec = d === 3 ? 2 : 1;
    for (;;){
      if (d === 1){ a = rnd(11, 89); b = rnd(11, 89); if (a % 10 + b % 10 >= 10) continue; }
      else if (d === 2){ a = rnd(11, 89); b = rnd(11, 89); if (a % 10 + b % 10 < 10) continue; }
      else if (d === 3){ a = rnd(101, 999); b = rnd(101, 999); }
      else { a = rnd(11, 59); b = rnd(11, 59); c = rnd(11, 59); }
      break;
    }
    const s = a + b + c, txt = [a, b, c].filter(Boolean).map(x => decTxt(x, dec)).join(' + ');
    return NUM(`<b>${txt}</b> = ?`, s / Math.pow(10, dec), { steps:['Ställ upp talen med kommatecknen rakt under varandra.', `Räkna som ${dec === 1 ? 'tiondelar' : 'hundradelar'}: ${[a, b, c].filter(Boolean).join(' + ')} = ${s}.`, `Sätt tillbaka kommat: ${decTxt(s, dec)}.`], hint:'Kommatecken under kommatecken – sedan som vanlig addition.' });
  } },
  { code:'B2.2', name:'Tal med olika antal decimaler', gen(d){
    let a, b, op, txt;
    if (d === 1){ a = rnd(11, 89) * 10; b = rnd(101, 899); op = '+'; }
    else if (d === 2){ a = rnd(3, 9) * 100; b = rnd(11, a / 10 - 1) * 10; op = '-'; }
    else if (d === 3){ a = rnd(30, 99) * 10; b = rnd(101, a - 1); op = '-'; if (b % 10 === 0) b++; }
    else { a = 1000; b = rnd(101, 899); op = '-'; if (b % 10 === 0) b++; }
    const res = op === '+' ? a + b : a - b;
    txt = `${fmt(a / 100)} ${OPS[op]} ${fmt(b / 100)}`;
    return NUM(`<b>${txt}</b> = ?`, res / 100, { steps:['Gör så att talen har lika många decimaler genom att lägga till nollor.', `${(a / 100).toFixed(2).replace('.', ',')} ${OPS[op]} ${(b / 100).toFixed(2).replace('.', ',')}.`, `Räkna som hundradelar: ${a} ${OPS[op]} ${b} = ${res}.`, `Svaret är ${fmt(res / 100)}.`], hint:'Lägg till nollor så att båda talen har två decimaler.' });
  } },
  { code:'B2.3', name:'Multiplikation med tal i decimalform', gen(d){
    let a, dec, n;
    if (d === 1){ a = rnd(1, 9); dec = 1; n = rnd(2, 9); }
    else if (d === 2){ a = rnd(11, 59); dec = 1; n = rnd(2, 6); }
    else if (d === 3){ a = pick([125, 175, 225, 250, 375, 120, 150, 145]); dec = 2; n = pick([2, 4, 6, 8]); }
    else { a = rnd(11, 89); dec = 1; n = rnd(11, 15); }
    const p = a * n;
    return NUM(`<b>${decTxt(a, dec)} · ${n}</b> = ?`, p / Math.pow(10, dec), { steps:[`Räkna utan komma: ${a} · ${n} = ${p}.`, `${decTxt(a, dec)} har ${dec} ${dec === 1 ? 'decimal' : 'decimaler'}, så svaret ska också ha det: ${decTxt(p, dec)}.`], hint:'Räkna utan komma och sätt tillbaka lika många decimaler.' });
  } },
  { code:'B2.4', name:'Division med tal i decimalform', gen(d){
    let q, dv, dec = 1;
    if (d === 1){ q = rnd(1, 4); dv = rnd(2, 2); }
    else if (d === 2){ q = rnd(11, 25); dv = rnd(2, 4); }
    else if (d === 3){ q = rnd(11, 39); dv = rnd(3, 6); }
    else { q = rnd(11, 49); dv = rnd(5, 9); if (Math.random() < .5){ dec = 2; q = rnd(11, 29); dv = rnd(3, 4); } }
    if (d === 1){ dv = rnd(2, 4); }
    const a = q * dv;
    return NUM(`<b>${decTxt(a, dec)} / ${dv}</b> = ?`, q / Math.pow(10, dec), { steps:[`Räkna som heltal: ${a} / ${dv} = ${q}.`, `Sätt tillbaka kommat: ${decTxt(q, dec)}.`], hint:'Dela som vanligt – kommat hamnar på samma plats.' });
  } },
  { code:'B2.5', name:'Överslagsräkning vid addition och subtraktion', gen(d){
    const st = d >= 3 ? 100 : 10, op = d === 2 || (d === 4 && Math.random() < .5) ? '-' : '+';
    const A = rnd(3, 9) * st, B = rnd(1, op === '-' ? A / st - 1 : 9) * st;
    const jit = () => r6((rnd(-st * 3, st * 3) / 10 || 1) + rnd(1, 9) / 10);
    const a = r6(A + jit()), b = r6(B + jit()), c = op === '+' ? A + B : A - B;
    return CHOICE(`Ungefär hur mycket är <b>${fmt(a)} ${OPS[op]} ${fmt(b)}</b>?`, fmt(c), [c + st, Math.max(st, c - st), c * 10, c + 2 * st].map(fmt), { steps:[`Avrunda: ${fmt(a)} ≈ ${fmt(A)} och ${fmt(b)} ≈ ${fmt(B)}.`, `${fmt(A)} ${OPS[op]} ${fmt(B)} = ${fmt(c)}.`], hint:`Avrunda till närmaste ${st === 10 ? 'tiotal' : 'hundratal'} först.` });
  } },
  { code:'B2.6', name:'Överslagsräkning vid multiplikation och division', gen(d){
    const A = rnd(2, 9), B = rnd(2, 9), j = () => r6(rnd(-3, 3) / 10 || .2);
    if (d <= 2 || Math.random() < .4){
      const big = d >= 3 ? 10 : 1, a = r6(A * big + j()), b = r6(B + j()), c = A * B * big;
      return CHOICE(`Ungefär hur mycket är <b>${fmt(a)} · ${fmt(b)}</b>?`, fmt(c), [c + A * big, c - A * big, c * 10, c + B].map(fmt), { steps:[`Avrunda: ${fmt(a)} ≈ ${A * big} och ${fmt(b)} ≈ ${B}.`, `${A * big} · ${B} = ${c}.`], hint:'Avrunda till heltal och multiplicera.' });
    }
    const a = r6(A * B + j()), b = r6(B + j());
    return CHOICE(`Ungefär hur mycket är <b>${fmt(a)} / ${fmt(b)}</b>?`, String(A), [A + 2, Math.max(1, A - 2), A * 10, A + 5].map(String), { steps:[`Avrunda: ${fmt(a)} ≈ ${A * B} och ${fmt(b)} ≈ ${B}.`, `${A * B} / ${B} = ${A}.`], hint:'Välj tal som går jämnt upp i tabellen.' });
  } },
  { code:'B3.1', name:'Räkna med tid', gen(d){
    const tt = (h, m) => `${pad2(h)}:${pad2(m)}`;
    if (d === 1){ const m1 = rnd(1, 3), s1 = rnd(10, 50), s2 = rnd(15, 55), tot = m1 * 60 + s1 + s2; return MULTI(`Första halvan av loppet tog <b>${m1} min ${s1} s</b> och andra halvan <b>${s2} s</b>. Hur lång tid tog hela loppet?`, [{ ans:Math.floor(tot / 60), suffix:'min' }, { ans:tot % 60, suffix:'s' }], { steps:[`Sekunder: ${s1} + ${s2} = ${s1 + s2} s.`, ...(s1 + s2 >= 60 ? [`${s1 + s2} s = 1 min ${s1 + s2 - 60} s.`] : []), `Totalt: ${Math.floor(tot / 60)} min ${tot % 60} s.`], hint:'60 sekunder = 1 minut.' }); }
    if (d === 2){ const a = rnd(180, 300), b = a + rnd(10, 80); return MULTI(`Mbeumo sprang på <b>${Math.floor(a / 60)} min ${a % 60} s</b> och Amad på <b>${Math.floor(b / 60)} min ${b % 60} s</b>. Hur mycket snabbare var Mbeumo?`, [{ ans:Math.floor((b - a) / 60), suffix:'min' }, { ans:(b - a) % 60, suffix:'s' }], { steps:[`Gör om till sekunder: ${a} s och ${b} s.`, `${b} − ${a} = ${b - a} s.`, `${b - a} s = ${Math.floor((b - a) / 60)} min ${(b - a) % 60} s.`], hint:'Gör om allt till sekunder först.' }); }
    const h1 = d === 3 ? rnd(7, 12) : rnd(20, 23), m1 = rnd(1, 11) * 5 - rnd(0, 4), dur = rnd(d === 3 ? 100 : 120, 230), t2 = (h1 * 60 + m1 + dur) % 1440, h2 = Math.floor(t2 / 60), m2 = t2 % 60;
    return MULTI(`Bussen till matchen går <b>${tt(h1, m1)}</b> och kommer fram <b>${tt(h2, m2)}</b>${h2 < h1 ? ' (efter midnatt)' : ''}. Hur lång är resan?`, [{ ans:Math.floor(dur / 60), suffix:'h' }, { ans:dur % 60, suffix:'min' }],
      { steps:[`Från ${tt(h1, m1)} till ${tt((h1 + 1) % 24, 0)}: ${60 - m1} min.`, `Från ${tt((h1 + 1) % 24, 0)} till ${tt(h2, m2)}: ${dur - (60 - m1)} min.`, `Totalt ${dur} min = ${Math.floor(dur / 60)} h ${dur % 60} min.`], hint:'Räkna fram till nästa hela timme först.' });
  } },
  { code:'B3.2', name:'Koordinatsystemet', gen(d){
    const max = d === 1 ? 6 : 10, pts = [];
    while (pts.length < 4){ const x = rnd(1, max), y = rnd(1, max); if (!pts.some(p => p[0] === x && p[1] === y)) pts.push([x, y, 'ABCD'[pts.length]]); }
    if (d <= 2){ const p = d === 1 ? pts[0] : pick(pts.slice(0, 3)), show = d === 1 ? [pts[0]] : pts.slice(0, 3); return MULTI(`Vilka koordinater har punkten <b>${p[2]}</b>?`, [{ ans:p[0], label:'x' }, { ans:p[1], label:'y' }], { fig:figCoord(show, max), layout:'coord', answer:`(${p[0]}, ${p[1]})`, steps:[`Gå först åt sidan (x-axeln): ${p[0]}.`, `Gå sedan uppåt (y-axeln): ${p[1]}.`, `${p[2]} = (${p[0]}, ${p[1]}).`], hint:'Först x (åt sidan), sedan y (uppåt).' }); }
    if (d === 3){ const p = pick(pts); return CHOICE(`Vilken punkt har koordinaterna <b>(${p[0]}, ${p[1]})</b>?`, p[2], pts.filter(x => x !== p).map(x => x[2]), { fig:figCoord(pts, max), steps:[`x = ${p[0]}: gå ${p[0]} steg åt höger.`, `y = ${p[1]}: gå ${p[1]} steg uppåt.`, `Där ligger punkt ${p[2]}.`], hint:'Först x (åt sidan), sedan y (uppåt).' }); }
    const x1 = rnd(1, 4), x2 = rnd(6, 9), y1 = rnd(1, 3), y2 = rnd(5, 8);
    return MULTI(`A(${x1}, ${y1}), B(${x2}, ${y1}) och C(${x2}, ${y2}) är tre hörn i en rektangel ABCD. Vilka koordinater har D?`, [{ ans:x1, label:'x' }, { ans:y2, label:'y' }], { fig:figCoord([[x1, y1, 'A'], [x2, y1, 'B'], [x2, y2, 'C']], 10), layout:'coord', answer:`(${x1}, ${y2})`, steps:['D ligger rakt ovanför A och lika högt som C.', `x som A: ${x1}. y som C: ${y2}.`, `D = (${x1}, ${y2}).`], hint:'D ligger rakt ovanför A.' });
  } },
  { code:'B3.3', name:'Tabeller och diagram', gen(d){
    const step = d <= 2 ? 10 : 20, labels = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre'], vals = labels.map(() => rnd(1, 9) * (step / 2) + (d === 1 ? 0 : 0));
    if (d === 1) vals.forEach((_, i) => { vals[i] = rnd(1, 9) * 10; });
    const fig = figBars(labels, vals, step, 'Besökare på träningen'), i = rnd(0, 4), k = (i + rnd(1, 4)) % 5;
    if (d <= 2) return NUM(`Hur många besökare kom på <b>${labels[i]}</b>?`, vals[i], { fig, steps:[`Följ stapeln för ${labels[i]} upp.`, `Varje linje är ${step}. ${vals[i] % step ? 'Halvvägs mellan två linjer är ' + step / 2 + '.' : ''}`, `${labels[i]}: ${vals[i]}.`], hint:`Varje linje är ${step}. Halvvägs är ${step / 2}.` });
    if (d === 3){ const hi = vals[i] >= vals[k] ? i : k, lo = hi === i ? k : i; return NUM(`Hur många fler besökare kom på <b>${labels[hi]}</b> än på <b>${labels[lo]}</b>?`, vals[hi] - vals[lo], { fig, steps:[`${labels[hi]}: ${vals[hi]}. ${labels[lo]}: ${vals[lo]}.`, `${vals[hi]} − ${vals[lo]} = ${vals[hi] - vals[lo]}.`], hint:'Läs av båda och räkna skillnaden.' }); }
    const s = vals.reduce((a, b) => a + b, 0);
    return NUM('Hur många besökare kom det totalt under veckan?', s, { fig, steps:[`Läs av alla staplar: ${vals.join(' + ')}.`, `Summa: ${s}.`], hint:'Läs av varje stapel och lägg ihop.', slow:1.8 });
  } },
  { code:'B3.4', name:'Linjediagram och cirkeldiagram', gen(d){
    if (d <= 2){
      const labels = ['kl 6', 'kl 9', 'kl 12', 'kl 15', 'kl 18'], base = rnd(2, 6), vals = [base, base + rnd(1, 3), base + rnd(4, 7), base + rnd(6, 9), base + rnd(2, 5)].map(v => v * 2);
      const fig = figLine(labels, vals, 2, 'Temperatur (°C)'), i = rnd(0, 4);
      if (d === 1) return NUM(`Hur varmt var det <b>${labels[i]}</b>?`, vals[i], { fig, suffix:'°C', steps:[`Gå upp från ${labels[i]} till punkten.`, `Läs av till vänster: ${vals[i]} °C.`], hint:'Varje linje är 2 grader.' });
      const a = rnd(0, 1), b = rnd(2, 3); return NUM(`Hur många grader steg temperaturen mellan <b>${labels[a]}</b> och <b>${labels[b]}</b>?`, vals[b] - vals[a], { fig, suffix:'°C', steps:[`${labels[a]}: ${vals[a]} °C. ${labels[b]}: ${vals[b]} °C.`, `${vals[b]} − ${vals[a]} = ${vals[b] - vals[a]} grader.`], hint:'Läs av båda punkterna och räkna skillnaden.' });
    }
    if (d === 3){
      const N = rnd(2, 8) * 8, parts = shuffle([{ label:'Fotboll', frac:.5 }, { label:'Hockey', frac:.25 }, { label:'Tennis', frac:.125 }, { label:'Simning', frac:.125 }]), p = pick(parts.filter(x => x.frac >= .25));
      return NUM(`Cirkeldiagrammet visar vad <b>${N} elever</b> tycker bäst om. Hur många valde <b>${p.label.toLowerCase()}</b>?`, N * p.frac, { fig:figPie(parts), suffix:'elever', steps:[`${p.label} är ${p.frac === .5 ? 'halva' : 'en fjärdedel av'} cirkeln.`, `${p.frac === .5 ? `${N} / 2` : `${N} / 4`} = ${N * p.frac}.`], hint:'Hur stor del av cirkeln är det? Halva? En fjärdedel?' });
    }
    const N = pick([200, 300, 400, 500]), parts = [{ label:'Fotboll 50 %', frac:.5, p:50 }, { label:'Hockey 25 %', frac:.25, p:25 }, { label:'Tennis 15 %', frac:.15, p:15 }, { label:'Basket 10 %', frac:.1, p:10 }], q = pick(parts);
    return NUM(`${N} elever svarade. Hur många valde <b>${q.label.split(' ')[0].toLowerCase()}</b>?`, N * q.p / 100, { fig:figPie(parts), suffix:'elever', steps:[`${q.p} % av ${N}.`, `1 % av ${N} = ${N / 100}.`, `${q.p} · ${N / 100} = ${N * q.p / 100}.`], hint:'1 % är en hundradel.' });
  } },
  { code:'B3.5', name:'Medelvärde och typvärde', gen(d){
    if (d <= 2){
      const n = d === 1 ? 7 : 9, mode = rnd(1, 6), vals = [mode, mode, mode], cnt = {};
      while (vals.length < n){ const v = rnd(0, 8); if (v === mode) continue; cnt[v] = (cnt[v] || 0) + 1; if (cnt[v] > 2){ cnt[v]--; continue; } vals.push(v); }
      const sh = shuffle(vals);
      return NUM(`Mål per match: <b>${sh.join(', ')}</b>. Vad är typvärdet?`, mode, { steps:['Typvärdet är det värde som finns flest gånger.', `${mode} finns ${vals.filter(v => v === mode).length} gånger – flest.`], hint:'Vilket tal finns flest gånger?' });
    }
    const n = d === 3 ? 5 : 4, mean2 = d === 3 ? rnd(4, 12) * 2 : rnd(4, 12) * 2 + 1;
    let vals;
    for (;;){ vals = Array.from({ length:n - 1 }, () => rnd(1, 20)); const last = (mean2 * n) / 2 - vals.reduce((a, b) => a + b, 0); if (Number.isInteger(last) && last >= 0 && last <= 25){ vals.push(last); break; } }
    vals = shuffle(vals); const sum = vals.reduce((a, b) => a + b, 0);
    return NUM(`Antal hörnor i ${n} matcher: <b>${vals.join(', ')}</b>. Vad är medelvärdet?`, sum / n, { steps:[`Summa: ${vals.join(' + ')} = ${sum}.`, `${sum} / ${n} = ${fmt(sum / n)}.`], hint:'Medelvärde = summan / antalet.' });
  } },
  { code:'B3.6', name:'Median', gen(d){
    const n = [5, 7, 6, 8][d - 1];
    let vals;
    for (;;){ vals = Array.from({ length:n }, () => rnd(1, 30)); const s = vals.slice().sort((a, b) => a - b); if (n % 2 === 0 && d === 3 && (s[n / 2 - 1] + s[n / 2]) % 2) continue; break; }
    const s = vals.slice().sort((a, b) => a - b), med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
    return NUM(`Poäng i ${n} matcher: <b>${vals.join(', ')}</b>. Vad är medianen?`, med, { steps:[`Sortera i storleksordning: ${s.join(', ')}.`, n % 2 ? `Mittersta värdet: ${med}.` : `De två mittersta är ${s[n / 2 - 1]} och ${s[n / 2]}. Mitt emellan: (${s[n / 2 - 1]} + ${s[n / 2]}) / 2 = ${fmt(med)}.`], hint:'Sortera först. Medianen är det mittersta värdet.', slow:1.7 });
  } },
  { code:'B4.1', name:'Addition och subtraktion med uppställning', gen(d){
    if (d === 1) return genAdd(3, pick([[1, 0, 0], [0, 1, 0], [1, 1, 0]]));
    if (d === 2) return genAdd(4, randPattern(4, rnd(1, 3)));
    if (d === 3) return genSub(4, randPattern(4, rnd(1, 2)));
    return genSub(4, [1, 1, 1, 0], [1, 2]);
  } },
  { code:'B4.2', name:'Multiplikation med uppställning', gen(d){
    if (d === 1) return genMul(3, 3, 9, 1);
    if (d === 2) return genMul(4, 3, 6, 1);
    if (d === 3) return genMul(4, 7, 9, 2);
    const a = rnd(12, 49), b = rnd(12, 39), bt = b - b % 10, bu = b % 10;
    return NUM(`<b>${a} · ${b}</b> = ?`, a * b, { steps:[`Dela upp ${b} i ${bt} och ${bu}.`, `${a} · ${bt} = ${a * bt}.`, `${a} · ${bu} = ${a * bu}.`, `${a * bt} + ${a * bu} = ${fmt(a * b)}.`], hint:`Räkna ${a} · ${bu} och ${a} · ${bt} var för sig.` });
  } },
  { code:'B4.3', name:'Kort division', gen(d){
    let dv, q, a, sd;
    for (let t = 0; t < 800; t++){
      dv = d === 4 ? rnd(6, 9) : rnd(3, 8);
      q = d === 1 ? rnd(21, 199) : rnd(201, 1999);
      if (d === 3){ const s = String(q).split(''); s[rnd(1, s.length - 1)] = '0'; q = Number(s.join('')); }
      a = q * dv; sd = shortDiv(a, dv);
      if (d === 1 && (a < 100 || a > 999)) continue;
      if (d >= 2 && (a < 1000 || a > 9999)) continue;
      if (sd.carries >= 1) break;
    }
    return NUM(`Räkna med kort division: <b>${fmt(a)} / ${dv}</b>`, q, { steps:[...sd.L, `Svaret är ${fmt(q)}.`], hint:'En siffra i taget från vänster. Glöm inte minnessiffrorna.' });
  } },
  { code:'B4.4', name:'Multiplikation med 10, 100 och 1 000', gen(d){
    let i, dec, f;
    if (d === 1){ i = rnd(11, 99); dec = 1; f = 10; }
    else if (d === 2){ i = rnd(101, 999); dec = 2; f = 100; }
    else if (d === 3){ i = pick([rnd(1, 9), rnd(1001, 9999)]); dec = i < 10 ? 2 : 3; f = i < 10 ? 100 : 1000; }
    else { i = rnd(11, 99); dec = 2; f = 100; }
    const x = i / Math.pow(10, dec), ans = r6(x * f), z = String(f).length - 1;
    if (d === 4) return NUM(`<b>${fmt(x)} · ? = ${fmt(ans)}</b>`, f, { steps:[`Kommat har flyttats ${z} steg åt höger.`, `Det betyder multiplikation med ${fmt(f)}.`], hint:'Hur många steg har kommat flyttat sig?' });
    return NUM(`<b>${fmt(x)} · ${fmt(f)}</b> = ?`, ans, { steps:[`Multiplikation med ${fmt(f)}: flytta kommat ${z} steg åt höger.`, `${fmt(x)} · ${fmt(f)} = ${fmt(ans)}.`], hint:`Flytta kommat ${z} steg åt höger.`, slow:1.1 });
  } },
  { code:'B4.5', name:'Division med 10, 100 och 1 000', gen(d){
    let a, f;
    if (d === 1){ a = rnd(11, 99) * 10; f = 10; }
    else if (d === 2){ a = rnd(11, 99); if (a % 10 === 0) a++; f = 10; }
    else if (d === 3){ a = rnd(1, 99); f = 100; }
    else { f = pick([100, 1000]); a = f === 100 ? r6(rnd(11, 99) / 10) : rnd(11, 999); }
    const ans = r6(a / f), z = String(f).length - 1;
    return NUM(`<b>${fmt(a)} / ${fmt(f)}</b> = ?`, ans, { steps:[`Division med ${fmt(f)}: flytta kommat ${z} steg åt vänster.`, `${fmt(a)} / ${fmt(f)} = ${fmt(ans)}.`], hint:`Flytta kommat ${z} steg åt vänster. Fyll på med nollor vid behov.`, slow:1.1 });
  } },
  { code:'B5.1', name:'Längdenheter', gen(d){
    if (d === 1) return CONV(r6(rnd(11, 99) / 10), 'm', 'dm', 'len');
    if (d === 2) return CONV(r6(rnd(101, 399) / 100), 'm', 'cm', 'len');
    if (d === 3) return Math.random() < .5 ? CONV(rnd(11, 99), 'cm', 'm', 'len') : CONV(rnd(11, 99), 'mm', 'cm', 'len');
    return Math.random() < .5 ? CONV(r6(rnd(1, 9) / 10), 'km', 'm', 'len') : CONV(rnd(11, 99) * 100, 'm', 'km', 'len');
  } },
  { code:'B5.2', name:'Meter, kilometer och mil', gen(d){
    if (d === 1) return CONV(rnd(2, 9), 'km', 'm', 'len');
    if (d === 2) return CONV(r6(rnd(11, 59) / 10), 'mil', 'km', 'len');
    if (d === 3) return CONV(rnd(11, 99) * 100, 'm', 'km', 'len');
    return Math.random() < .5 ? CONV(rnd(11, 99), 'km', 'mil', 'len') : CONV(r6(rnd(11, 25) / 10), 'mil', 'm', 'len');
  } },
  { code:'B5.3', name:'Skala', gen(d){
    if (d === 1){ const c = rnd(2, 9); return NUM(`En ritning är i skala <b>1:10</b>. En planka är <b>${c} cm</b> på ritningen. Hur lång är den i verkligheten?`, c * 10, { suffix:'cm', steps:['Skala 1:10 betyder att verkligheten är 10 gånger större.', `${c} · 10 = ${c * 10} cm.`], hint:'1:10 – verkligheten är 10 gånger större.' }); }
    if (d === 2){ const c = rnd(2, 12); return NUM(`Ritningen av omklädningsrummet är i skala <b>1:100</b>. Väggen är <b>${c} cm</b> på ritningen. Hur lång är den i verkligheten?`, c, { suffix:'m', steps:['1:100 betyder att 1 cm på ritningen är 100 cm = 1 m i verkligheten.', `${c} cm på ritningen = ${c} m.`], hint:'100 cm = 1 m.' }); }
    if (d === 3){ const sc = pick([10000, 20000, 50000]), c = rnd(2, 9), m = c * sc / 100; return NUM(`En karta är i skala <b>1:${fmt(sc)}</b>. Avståndet till arenan är <b>${c} cm</b> på kartan. Hur långt är det i verkligheten?`, m, { suffix:'m', steps:[`1 cm på kartan = ${fmt(sc)} cm = ${fmt(sc / 100)} m.`, `${c} · ${fmt(sc / 100)} = ${fmt(m)} m.`], hint:`1 cm = ${fmt(sc)} cm i verkligheten. 100 cm = 1 m.` }); }
    const k = pick([2, 4, 5, 10]), mm = rnd(3, 9); return NUM(`En bild av en myra är i skala <b>${k}:1</b>. Myran är <b>${mm} mm</b> i verkligheten. Hur lång är den på bilden?`, mm * k, { suffix:'mm', steps:[`${k}:1 är en förstoring: bilden är ${k} gånger större.`, `${mm} · ${k} = ${mm * k} mm.`], hint:`${k}:1 – bilden är ${k} gånger större.` });
  } },
  { code:'B5.4', name:'Vinklar', gen(d){
    if (d <= 2){
      const type = pick(['spetsig', 'rät', 'trubbig', 'rak']), deg = { spetsig:d === 1 ? rnd(25, 65) : rnd(70, 84), rät:90, trubbig:d === 1 ? rnd(115, 160) : rnd(96, 110), rak:180 }[type];
      return CHOICE('Vilken sorts vinkel är det?', `${type} vinkel`, ['spetsig vinkel', 'rät vinkel', 'trubbig vinkel', 'rak vinkel'], { fig:figAngle(deg), steps:['Spetsig: mindre än 90°. Rät: 90°. Trubbig: mellan 90° och 180°. Rak: 180°.', `Den här vinkeln är ${deg}°: ${type}.`], hint:'Jämför med ett hörn på ett papper (90°).' });
    }
    if (d === 3){ const k = rnd(15, 75); return NUM('En rät vinkel är delad i två delar. Hur stor är den markerade vinkeln?', 90 - k, { fig:figSplit(k, 90), suffix:'°', steps:['En rät vinkel är 90°.', `90 − ${k} = ${90 - k}°.`], hint:'En rät vinkel är 90°.' }); }
    const k = rnd(25, 155); return NUM('Två vinklar bildar tillsammans en rak vinkel. Hur stor är den markerade vinkeln?', 180 - k, { fig:figSplit(k, 180), suffix:'°', steps:['En rak vinkel är 180°.', `180 − ${k} = ${180 - k}°.`], hint:'En rak vinkel är 180°.' });
  } },
  { code:'B5.5', name:'Omkrets', gen(d){
    if (d === 1){ const l = rnd(4, 15), b = rnd(2, 9); return NUM('Hur stor är rektangelns omkrets?', 2 * (l + b), { fig:figRect(l, b, 'cm'), suffix:'cm', steps:['Omkrets = alla sidor tillsammans.', `${l} + ${b} + ${l} + ${b} = ${2 * (l + b)} cm.`], hint:'Lägg ihop alla fyra sidor.' }); }
    if (d === 2){ const s = rnd(3, 15); return NUM(`En kvadrat har sidan <b>${s} cm</b>. Hur stor är omkretsen?`, 4 * s, { fig:figRect(s, s, 'cm'), suffix:'cm', steps:['En kvadrat har fyra lika långa sidor.', `4 · ${s} = ${4 * s} cm.`], hint:'Fyra lika långa sidor.' }); }
    if (d === 3){ const a = rnd(5, 14), b = rnd(4, 12), c = rnd(Math.abs(a - b) + 1, a + b - 1); return NUM('Hur stor är triangelns omkrets?', a + b + c, { fig:figTri3(a, b, c, 'cm'), suffix:'cm', steps:[`${a} + ${b} + ${c} = ${a + b + c} cm.`], hint:'Lägg ihop alla tre sidor.' }); }
    const l = rnd(6, 20), b = rnd(2, l - 1); return NUM(`En rektangel har omkretsen <b>${2 * (l + b)} cm</b> och längden <b>${l} cm</b>. Hur bred är den?`, b, { suffix:'cm', steps:[`Två längder: 2 · ${l} = ${2 * l} cm.`, `Kvar till två bredder: ${2 * (l + b)} − ${2 * l} = ${2 * b} cm.`, `En bredd: ${2 * b} / 2 = ${b} cm.`], hint:'Omkretsen är två längder och två bredder.' });
  } },
  { code:'B5.6', name:'Area', gen(d){
    if (d === 1){ const l = rnd(4, 15), b = rnd(2, 9); return NUM('Hur stor är rektangelns area?', l * b, { fig:figRect(l, b, 'cm'), suffix:'cm²', steps:['Area = längd · bredd.', `${l} · ${b} = ${l * b} cm².`], hint:'Area = längd · bredd.' }); }
    if (d === 2){ const s = rnd(3, 13); return NUM(`En kvadrat har sidan <b>${s} m</b>. Hur stor är arean?`, s * s, { fig:figRect(s, s, 'm'), suffix:'m²', steps:[`Area = ${s} · ${s} = ${s * s} m².`], hint:'Area = sida · sida.' }); }
    if (d === 3){ let b, h; do { b = rnd(3, 14); h = rnd(2, 10); } while ((b * h) % 2); return NUM('Hur stor är triangelns area?', b * h / 2, { fig:figRightTri(b, h, 'cm'), suffix:'cm²', steps:['Area = bas · höjd / 2.', `${b} · ${h} = ${b * h}.`, `${b * h} / 2 = ${b * h / 2} cm².`], hint:'En triangel är en halv rektangel: bas · höjd / 2.' }); }
    const W = rnd(6, 12), H = rnd(5, 10), cw = rnd(2, W - 3), ch = rnd(2, H - 3), A = W * H - cw * ch;
    return NUM('Hur stor är figurens area?', A, { fig:figL(W, H, cw, ch, 'm'), suffix:'m²', steps:[`Tänk dig en hel rektangel: ${W} · ${H} = ${W * H} m².`, `Ta bort hörnet som saknas: ${cw} · ${ch} = ${cw * ch} m².`, `${W * H} − ${cw * ch} = ${A} m².`], hint:'Dela upp figuren i två rektanglar.', slow:1.8 });
  } },
  { code:'B6.1', name:'Räkna med miniräknare', gen(d){
    if (d === 1){ const n = rnd(3, 8), p = rnd(129, 499); return NUM(`En matchtröja kostar <b>${p} kr</b>. Hur mycket kostar <b>${n}</b> tröjor?`, n * p, { suffix:'kr', calc:true, steps:[`${n} · ${p} = ${fmt(n * p)} kr.`], hint:'Samma pris flera gånger – multiplicera.' }); }
    if (d === 2){ const n = rnd(6, 15), each = rnd(150, 450), tot = n * each; return NUM(`Bussen till bortamatchen kostar <b>${fmt(tot)} kr</b>. ${n} supportrar delar lika. Hur mycket betalar var och en?`, each, { suffix:'kr', calc:true, steps:[`${fmt(tot)} / ${n} = ${each} kr.`], hint:'Dela lika – dividera.' }); }
    if (d === 3){ const n = rnd(2, 5), p = rnd(79, 249), pay = Math.ceil((n * p + 1) / 500) * 500; return NUM(`Du köper <b>${n}</b> halsdukar för <b>${p} kr</b> styck och betalar med <b>${fmt(pay)} kr</b>. Hur mycket får du tillbaka?`, pay - n * p, { suffix:'kr', calc:true, steps:[`Kostnad: ${n} · ${p} = ${fmt(n * p)} kr.`, `Tillbaka: ${fmt(pay)} − ${fmt(n * p)} = ${fmt(pay - n * p)} kr.`], hint:'Räkna först vad halsdukarna kostar.' }); }
    const mean = rnd(40, 75) * 1000 + rnd(1, 9) * 100, vals = [mean + 1200, mean - 800, mean + 300, mean - 700];
    return NUM(`Åskådare på Old Trafford i fyra matcher: <b>${vals.map(fmt).join(', ')}</b>. Vad är medelvärdet?`, mean, { calc:true, steps:[`Summa: ${fmt(vals.reduce((a, b) => a + b, 0))}.`, `Dela med 4: ${fmt(mean)}.`], hint:'Lägg ihop och dela med antalet.' });
  } },
  { code:'B6.2', name:'Enheter för volym', gen(d){
    if (d === 1) return CONV(r6(rnd(11, 59) / 10), 'l', 'dl', 'vol');
    if (d === 2) return Math.random() < .5 ? CONV(rnd(11, 99) * 10, 'ml', 'dl', 'vol') : CONV(rnd(11, 99), 'cl', 'l', 'vol');
    if (d === 3){
      const t = rnd(0, 2);
      if (t === 0){ const v = r6(rnd(11, 59) / 10); return NUM(`<b>${fmt(v)} dm³</b> = ? l`, v, { suffix:'l', steps:['1 dm³ = 1 l.', `${fmt(v)} dm³ = ${fmt(v)} l.`], hint:'1 dm³ = 1 liter.' }); }
      if (t === 1){ const v = rnd(1, 9) * 100; return NUM(`<b>${v} cm³</b> = ? dl`, v / 100, { suffix:'dl', steps:['1 cm³ = 1 ml.', `${v} cm³ = ${v} ml.`, `100 ml = 1 dl, så ${v} ml = ${v / 100} dl.`], hint:'1 cm³ = 1 ml och 1 dl = 100 ml.' }); }
      const v = rnd(2, 9); return NUM(`<b>${v} l</b> = ? cm³`, v * 1000, { suffix:'cm³', steps:['1 l = 1 dm³ = 1 000 cm³.', `${v} · 1 000 = ${fmt(v * 1000)} cm³.`], hint:'1 liter = 1 000 cm³.' });
    }
    return Math.random() < .5 ? CONV(r6(rnd(11, 99) / 100), 'l', 'cl', 'vol') : CONV(r6(rnd(11, 39) / 10), 'l', 'ml', 'vol');
  } },
  { code:'B6.3', name:'Enheter för vikt', gen(d){
    if (d === 1) return CONV(r6(rnd(11, 59) / 10), 'kg', 'hg', 'wt');
    if (d === 2) return CONV(r6(rnd(11, 59) / 10), 'kg', 'g', 'wt');
    if (d === 3) return Math.random() < .5 ? CONV(rnd(11, 99) * 10, 'g', 'kg', 'wt') : CONV(rnd(11, 99), 'hg', 'kg', 'wt');
    return Math.random() < .5 ? CONV(r6(rnd(11, 59) / 10), 'ton', 'kg', 'wt') : CONV(rnd(11, 99) * 10, 'kg', 'ton', 'wt');
  } },
  { code:'B6.4', name:'Volym och vikt med miniräknare', gen(d){
    if (d === 1){ const v = pick([1.5, .5, .75, 2.5]), n = pick([2, 4, 6, 8]); return NUM(`En vattenflaska rymmer <b>${fmt(v)} l</b>. Hur många dl är <b>${n}</b> flaskor?`, v * 10 * n, { suffix:'dl', calc:true, steps:[`${n} · ${fmt(v)} = ${fmt(v * n)} l.`, `1 l = 10 dl, så ${fmt(v * n)} l = ${fmt(v * n * 10)} dl.`], hint:'Räkna ut liter först och gör sedan om till dl.' }); }
    if (d === 2){ const s = pick([20, 25, 40, 50]), n = rnd(12, 60), t = r6(s * n / 1000); return NUM(`En säck gräsfrö väger <b>${s} kg</b>. Hur många säckar blir <b>${fmt(t)} ton</b>?`, n, { suffix:'säckar', calc:true, steps:[`${fmt(t)} ton = ${fmt(s * n)} kg.`, `${fmt(s * n)} / ${s} = ${n} säckar.`], hint:'Gör om ton till kg först.' }); }
    if (d === 3){ const g = pick([2, 2.5, 3]), n = rnd(4, 12), tot = r6(g * n / 10); return NUM(`Ett glas rymmer <b>${fmt(g)} dl</b>. Hur många glas kan man fylla från en kanna med <b>${fmt(tot)} l</b> saft?`, n, { suffix:'glas', calc:true, steps:[`${fmt(tot)} l = ${fmt(g * n)} dl.`, `${fmt(g * n)} / ${fmt(g)} = ${n} glas.`], hint:'Gör om liter till dl först.' }); }
    const w = r6(rnd(21, 59) / 10), n = rnd(11, 25); return NUM(`En låda med matchbollar väger <b>${fmt(w)} kg</b>. Hur mycket väger <b>${n}</b> lådor?`, r6(w * n), { suffix:'kg', calc:true, steps:[`${n} · ${fmt(w)} = ${fmt(r6(w * n))} kg.`], hint:'Multiplicera vikten med antalet.' });
  } },
];

/* =========================================================
   GAMMA (Special League)
   ========================================================= */
const PRIMES = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
const ODDCOMP = [9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51];
const GAMMA = [
  { code:'G1.1', name:'Olika sorters tal', gen(d){
    if (d === 1){ const s = rnd(1, 9), up = rnd(s + 1, 15); return NUM(`Det är <b>−${s} °C</b>. Temperaturen stiger <b>${up} grader</b>. Hur varmt blir det?`, up - s, { suffix:'°C', neg:true, steps:[`Från −${s} upp till 0 är ${s} grader.`, `${up} − ${s} = ${up - s} grader till.`, `Det blir ${up - s} °C.`], hint:'Tänk på en termometer: gå uppåt.' }); }
    if (d === 2){ const s = rnd(1, 8), down = rnd(s + 1, 15); return NUM(`Det är <b>${s} °C</b>. Temperaturen sjunker <b>${down} grader</b>. Hur varmt blir det?`, s - down, { suffix:'°C', neg:true, steps:[`Från ${s} ner till 0 är ${s} grader.`, `${down} − ${s} = ${down - s} grader till under noll.`, `Det blir −${down - s} °C.`], hint:'Gå nedåt på termometern förbi 0.' }); }
    if (d === 3){ const p = pick(PRIMES); return CHOICE('Vilket av talen är ett primtal?', p, shuffle(ODDCOMP).slice(0, 3), { steps:['Ett primtal är bara delbart med 1 och sig självt.', `${p} går inte att dela jämnt med något annat tal.`], hint:'Pröva att dela med 3, 5 och 7.' }); }
    const a = rnd(2, 12), b = rnd(2, 12); return NUM(`Hur stor är skillnaden mellan <b>${a} °C</b> och <b>−${b} °C</b>?`, a + b, { suffix:'grader', steps:[`Från −${b} till 0: ${b} grader.`, `Från 0 till ${a}: ${a} grader.`, `${b} + ${a} = ${a + b} grader.`], hint:'Räkna stegen via noll.' });
  } },
  { code:'G1.2', name:'Addition och subtraktion med tal i decimalform', gen(d){
    let a, b, op;
    if (d === 1){ a = rnd(11, 49); b = rnd(11, 49); op = '+'; return NUM(`<b>${decTxt(a, 1)} + ${decTxt(b, 1)}</b> = ?`, (a + b) / 10, { steps:[`Heltal och tiondelar var för sig, eller räkna ${a} + ${b} = ${a + b} tiondelar.`, `= ${decTxt(a + b, 1)}.`], hint:'Räkna heltalen och decimalerna var för sig.' }); }
    if (d === 2){ a = rnd(11, 59) * 10; b = rnd(101, 499); op = '+'; }
    else if (d === 3){ a = 1000; b = rnd(101, 899); op = '-'; }
    else { a = rnd(800, 1500); b = rnd(201, 699); op = '-'; }
    if (b % 10 === 0) b++;
    const r = op === '+' ? a + b : a - b;
    return NUM(`<b>${fmt(a / 100)} ${OPS[op]} ${fmt(b / 100)}</b> = ?`, r / 100, { steps:[`Lika många decimaler: ${(a / 100).toFixed(2).replace('.', ',')} ${OPS[op]} ${(b / 100).toFixed(2).replace('.', ',')}.`, `Som hundradelar: ${a} ${OPS[op]} ${b} = ${r}.`, `Svaret: ${fmt(r / 100)}.`], hint:'Fyll på med nollor så att båda har två decimaler.' });
  } },
  { code:'G1.3', name:'Multiplikation och division med tal i decimalform', gen(d){
    if (d === 1){ const a = rnd(2, 9), n = rnd(2, 9); return NUM(`<b>${decTxt(a, 1)} · ${n}</b> = ?`, a * n / 10, { steps:[`${a} · ${n} = ${a * n}.`, `En decimal: ${decTxt(a * n, 1)}.`], hint:'Räkna utan komma och sätt tillbaka en decimal.' }); }
    if (d === 2){ const a = rnd(2, 9), b = rnd(2, 9); return NUM(`<b>${decTxt(a, 1)} · ${decTxt(b, 1)}</b> = ?`, a * b / 100, { steps:[`Räkna utan komma: ${a} · ${b} = ${a * b}.`, `Totalt två decimaler: ${decTxt(a * b, 2)}.`], hint:'Räkna decimalerna i båda talen – så många ska svaret ha.' }); }
    if (d === 3){ const q = rnd(2, 9), n = rnd(2, 9); return NUM(`<b>${decTxt(q * n, 1)} / ${n}</b> = ?`, q / 10, { steps:[`${q * n} / ${n} = ${q}.`, `En decimal: ${decTxt(q, 1)}.`], hint:'Dela som heltal och sätt tillbaka kommat.' }); }
    const a = rnd(11, 29), b = rnd(2, 9); return NUM(`<b>${decTxt(a, 1)} · ${decTxt(b, 1)}</b> = ?`, a * b / 100, { steps:[`${a} · ${b} = ${a * b}.`, `Två decimaler: ${decTxt(a * b, 2)}.`], hint:'Räkna decimalerna i båda talen.' });
  } },
  { code:'G1.4', name:'Mer om multiplikation', gen(d){
    if (d === 1){ const n = rnd(2, 99) * 10; return NUM(`<b>${fmt(n)} · 0,1</b> = ?`, n / 10, { steps:['Gånger 0,1 är samma som att dela med 10.', `${fmt(n)} / 10 = ${fmt(n / 10)}.`], hint:'· 0,1 = / 10.' }); }
    if (d === 2){ const n = rnd(2, 99) * 100 + (Math.random() < .5 ? 0 : rnd(1, 9) * 10); return NUM(`<b>${fmt(n)} · 0,01</b> = ?`, n / 100, { steps:['Gånger 0,01 är samma som att dela med 100.', `${fmt(n)} / 100 = ${fmt(n / 100)}.`], hint:'· 0,01 = / 100.' }); }
    if (d === 3){ const f = pick([.5, .25]), n = rnd(2, 30) * (f === .5 ? 2 : 4); return NUM(`<b>${n} · ${fmt(f)}</b> = ?`, n * f, { steps:[`${fmt(f)} = ${f === .5 ? 'en halv' : 'en fjärdedel'}.`, `${n} / ${f === .5 ? 2 : 4} = ${fmt(n * f)}.`], hint:`${fmt(f)} är ${f === .5 ? 'hälften' : 'en fjärdedel'}.` }); }
    const n = pick([40, 60, 80]), opts = [[`${n} · 0,9`, n * .9], [`${n} · 1,2`, n * 1.2], [`${n} / 2`, n / 2], [`${n} · 0,5`, n * .5]];
    return CHOICE(`Vilket uttryck har störst värde?`, `${n} · 1,2`, opts.filter(o => o[1] !== n * 1.2).map(o => o[0]), { steps:['Gånger ett tal större än 1 gör talet större.', 'Gånger ett tal mindre än 1 gör talet mindre.', `${n} · 1,2 = ${fmt(n * 1.2)} är störst.`], hint:'Vilket tal är större än 1?' });
  } },
  { code:'G1.5', name:'Mer om division', gen(d){
    if (d === 1){ const n = rnd(2, 99); return NUM(`<b>${n} / 0,1</b> = ?`, n * 10, { steps:['Hur många tiondelar får plats? Tio gånger fler.', `${n} / 0,1 = ${n} · 10 = ${n * 10}.`], hint:'/ 0,1 = · 10.' }); }
    if (d === 2){ const n = rnd(2, 40); return NUM(`<b>${n} / 0,5</b> = ?`, n * 2, { steps:['Hur många halvor finns i talet? Dubbelt så många.', `${n} / 0,5 = ${n} · 2 = ${n * 2}.`], hint:'/ 0,5 = · 2.' }); }
    if (d === 3){ const q = rnd(2, 9), dv = rnd(2, 9); return NUM(`<b>${decTxt(q * dv, 1)} / ${decTxt(dv, 1)}</b> = ?`, q, { steps:['Förläng båda talen med 10 så att nämnaren blir ett heltal.', `${q * dv} / ${dv} = ${q}.`], hint:'Flytta kommat lika mycket i båda talen.' }); }
    const q = rnd(2, 9) * 10, dv = rnd(2, 9); return NUM(`<b>${decTxt(q * dv, 2)} / ${decTxt(dv, 2)}</b> = ?`, q, { steps:['Förläng båda talen med 100.', `${q * dv} / ${dv} = ${q}.`], hint:'Flytta kommat två steg i båda talen.' });
  } },
  { code:'G1.6', name:'Multiplikation och division med stora tal', gen(d){
    const zc = x => { let z = 0; while (x % 10 === 0 && x){ x /= 10; z++; } return z; };
    if (d <= 2){ const a = rnd(2, 9) * (d === 1 ? 1000 : 100), b = rnd(2, 9) * (d === 1 ? 10 : 100), A = a / Math.pow(10, zc(a)), B = b / Math.pow(10, zc(b)); return NUM(`<b>${fmt(a)} · ${fmt(b)}</b> = ?`, a * b, { steps:[`Utan nollor: ${A} · ${B} = ${A * B}.`, `Antal nollor: ${zc(a)} + ${zc(b)} = ${zc(a) + zc(b)}.`, `${fmt(a * b)}.`], hint:'Räkna utan nollorna och räkna sedan nollorna.' }); }
    if (d === 3){ const q = rnd(2, 9) * 1000, dv = rnd(2, 9) * 1000; return NUM(`<b>${fmt(q * dv)} / ${fmt(dv)}</b> = ?`, q, { steps:[`Stryk tre nollor i båda: ${fmt(q * dv / 1000)} / ${dv / 1000}.`, `= ${fmt(q)}.`], hint:'Stryk lika många nollor i båda talen.' }); }
    const m = r6(rnd(11, 99) / 10); return NUM(`Skriv <b>${fmt(m)} miljoner</b> med siffror.`, m * 1e6, { steps:['1 miljon = 1 000 000.', `${fmt(m)} · 1 000 000 = ${fmt(m * 1e6)}.`], hint:'1 miljon har sex nollor.' });
  } },
  { code:'G1.7', name:'Binära talsystemet', gen(d){
    const bits = d === 1 ? 3 : d <= 3 ? 4 : 5, n = rnd(Math.pow(2, bits - 1), Math.pow(2, bits) - 1), b = n.toString(2);
    const vals = b.split('').map((c, i) => [c, Math.pow(2, b.length - 1 - i)]);
    const expl = `Platsvärden: ${vals.map(v => v[1]).join(', ')}.`;
    if (d === 3 || (d === 4 && Math.random() < .5)){
      const p = mk({ q:`Skriv talet <b>${n}</b> i det binära talsystemet.`, fields:[{ ans:Number(b), suffix:'', label:'' }], answer:`${b} (binärt)`, bin:true,
        steps:[expl, `${n} = ${vals.filter(v => v[0] === '1').map(v => v[1]).join(' + ')}.`, `Sätt 1 där platsvärdet används och 0 annars: ${b}.`], hint:'Börja med det största platsvärdet som får plats: 16, 8, 4, 2, 1.', slow:1.8 });
      return p;
    }
    return NUM(`Det binära talet <b>${b}</b> – vilket tal är det i vårt vanliga talsystem?`, n, { steps:[expl, `Lägg ihop platsvärdena där det står 1: ${vals.filter(v => v[0] === '1').map(v => v[1]).join(' + ')} = ${n}.`], hint:'Platsvärdena från höger: 1, 2, 4, 8, 16.', slow:1.6 });
  } },
  { code:'G2.1', name:'Räkna med bråk', gen(d){
    if (d <= 2){ const n = rnd(5, 12); let a = rnd(1, n - 2), b = rnd(1, n - 1 - a); if (d === 2){ a = rnd(3, n - 1); b = rnd(1, a - 1); } const r = d === 1 ? a + b : a - b, op = d === 1 ? '+' : '−';
      return FRAC(`<b>${a}/${n} ${op} ${b}/${n}</b> = ?`, r, n, { steps:['Samma nämnare – räkna bara med täljarna.', `${a} ${op} ${b} = ${r}.`, `Svaret: ${r}/${n}.`], hint:'Nämnaren är densamma – räkna med täljarna.' }); }
    if (d === 3){ const n1 = pick([2, 3, 4, 5]), k = pick([2, 3]), n2 = n1 * k, a = rnd(1, n1 - 1), b = rnd(1, n2 - 1); if (a * k + b > 2 * n2) return this.gen(3);
      return FRAC(`<b>${a}/${n1} + ${b}/${n2}</b> = ?`, a * k + b, n2, { steps:[`Gör om till samma nämnare: ${a}/${n1} = ${a * k}/${n2}.`, `${a * k}/${n2} + ${b}/${n2} = ${a * k + b}/${n2}.`], hint:`Förläng ${a}/${n1} så att nämnaren blir ${n2}.` }); }
    const [n1, n2] = pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5]]), a = rnd(1, n1 - 1), b = rnd(1, n2 - 1), N = n1 * n2;
    return FRAC(`<b>${a}/${n1} + ${b}/${n2}</b> = ?`, a * n2 + b * n1, N, { steps:[`Gemensam nämnare: ${N}.`, `${a}/${n1} = ${a * n2}/${N} och ${b}/${n2} = ${b * n1}/${N}.`, `${a * n2}/${N} + ${b * n1}/${N} = ${a * n2 + b * n1}/${N}.`], hint:`Förläng båda bråken så att nämnaren blir ${N}.` });
  } },
  { code:'G2.2', name:'Bråkform och blandad form', gen(d){
    const den = rnd(2, d >= 3 ? 9 : 5), w = rnd(1, d >= 3 ? 8 : 3), num = rnd(1, den - 1), imp = w * den + num;
    if (d === 1 || d === 3) return MIXED(`Skriv <b>${imp}/${den}</b> i blandad form.`, w, num, den, { steps:[`Hur många hela? ${imp} / ${den} = ${w}, och ${num} blir kvar.`, `${imp}/${den} = ${w} ${num}/${den}.`], hint:`Hur många gånger får ${den} plats i ${imp}?` });
    return FRAC(`Skriv <b>${w} ${num}/${den}</b> i bråkform.`, imp, den, { steps:[`${w} hela = ${w * den}/${den}.`, `${w * den}/${den} + ${num}/${den} = ${imp}/${den}.`], hint:`Varje hel är ${den}/${den}.` });
  } },
  { code:'G2.3', name:'Bråkform och decimalform', gen(d){
    if (d === 1){ const [n, dd] = pick([[1, 2], [1, 4], [3, 4], [2, 5], [3, 5], [4, 5]]); return NUM(`Skriv <b>${n}/${dd}</b> i decimalform.`, n / dd, { steps:[`Förläng till hundradelar: ${n}/${dd} = ${n * 100 / dd}/100.`, `= ${fmt(n / dd)}.`], hint:'Förläng till tiondelar eller hundradelar.' }); }
    if (d === 2){ const [n, dd] = pick([[7, 20], [9, 20], [3, 25], [11, 25], [17, 50], [3, 50]]); return NUM(`Skriv <b>${n}/${dd}</b> i decimalform.`, n / dd, { steps:[`Förläng till hundradelar: ${n}/${dd} = ${n * 100 / dd}/100.`, `= ${fmt(n / dd)}.`], hint:'Förläng så att nämnaren blir 100.' }); }
    if (d === 3){ const n = pick([1, 3, 5, 7]); return NUM(`Skriv <b>${n}/8</b> i decimalform.`, n / 8, { steps:['Förläng till tusendelar: 8 · 125 = 1 000.', `${n}/8 = ${n * 125}/1 000 = ${fmt(n / 8)}.`], hint:'1/8 = 0,125.' }); }
    const [n, dd] = pick([[1, 8], [3, 8], [8, 5], [7, 4], [7, 20], [9, 25]]), dec = n / dd, k = Math.round(dec * 1000);
    return FRAC(`Skriv <b>${fmt(dec)}</b> i bråkform.`, n, dd, { steps:[`${fmt(dec)} = ${k}/1 000.`, `Förkorta: ${k}/1 000 = ${n}/${dd}.`], hint:'Skriv som tusendelar och förkorta.' });
  } },
  { code:'G2.4', name:'Beräkna delen från bråkform', gen(d){
    const k = d === 1 ? rnd(2, 10) : rnd(3, 8), j = d === 1 ? 1 : rnd(2, k - 1), base = d === 3 ? rnd(11, 40) : rnd(2, 12), n = k * base;
    if (d === 4){ const part = j * base; return NUM(`<b>${j}/${k}</b> av ett tal är <b>${part}</b>. Vilket är talet?`, n, { steps:[`${j}/${k} är ${part}, så 1/${k} är ${part} / ${j} = ${base}.`, `Hela talet är ${k} · ${base} = ${n}.`], hint:'Räkna ut vad 1 del är först.' }); }
    return NUM(`Hur mycket är <b>${j}/${k} av ${n}</b>?`, j * base, { steps:[`1/${k} av ${n} = ${n} / ${k} = ${base}.`, ...(j > 1 ? [`${j}/${k} = ${j} · ${base} = ${j * base}.`] : [])], hint:'Dela med nämnaren och gånga med täljaren.' });
  } },
  { code:'G2.5', name:'Procent', gen(d){
    if (d === 1){ const [n, dd, p] = pick([[1, 2, 50], [1, 4, 25], [3, 4, 75], [1, 10, 10], [1, 5, 20]]); return NUM(`Hur många procent är <b>${n}/${dd}</b>?`, p, { suffix:'%', steps:['Procent betyder hundradelar.', `${n}/${dd} = ${p}/100 = ${p} %.`], hint:'Förläng så att nämnaren blir 100.' }); }
    if (d === 2){ const p = rnd(1, 99); return NUM(`Skriv <b>${fmt(p / 100)}</b> i procent.`, p, { suffix:'%', steps:[`${fmt(p / 100)} = ${p} hundradelar = ${p} %.`], hint:'Procent = hundradelar.' }); }
    if (d === 3){ const dd = pick([5, 20, 25, 50]), n = rnd(1, dd - 1); return NUM(`Hur många procent är <b>${n}/${dd}</b>?`, n * 100 / dd, { suffix:'%', steps:[`Förläng med ${100 / dd}: ${n}/${dd} = ${n * 100 / dd}/100.`, `= ${n * 100 / dd} %.`], hint:'Förläng så att nämnaren blir 100.' }); }
    const tot = pick([20, 25, 50]), part = rnd(1, tot - 1); return NUM(`Av <b>${tot} elever</b> spelar <b>${part}</b> fotboll. Hur många procent är det?`, part * 100 / tot, { suffix:'%', steps:[`Andelen är ${part}/${tot}.`, `Förläng med ${100 / tot}: ${part * 100 / tot}/100 = ${part * 100 / tot} %.`], hint:'Skriv som bråk och förläng till hundradelar.' });
  } },
  { code:'G2.6', name:'Sannolikhet', gen(d){
    if (d === 1){ const k = rnd(1, 2), ws = k === 1 ? `en ${pick(['etta', 'trea', 'femma', 'sexa'])}` : `en etta eller en tvåa`; return FRAC(`Du slår en vanlig tärning. Hur stor är sannolikheten att du får <b>${ws}</b>?`, k, 6, { steps:['En tärning har 6 lika troliga utfall.', `Gynnsamma utfall: ${k}.`, `Sannolikheten är ${k}/6.`], hint:'Sannolikhet = gynnsamma / möjliga.' }); }
    if (d === 2){ const [t, k] = pick([['ett jämnt tal', 3], ['ett udda tal', 3], ['mer än 4', 2], ['mindre än 5', 4]]); return FRAC(`Du slår en tärning. Hur stor är sannolikheten att du får <b>${t}</b>?`, k, 6, { steps:['6 möjliga utfall.', `Gynnsamma: ${k}.`, `${k}/6.`], hint:'Räkna vilka av 1–6 som passar.' }); }
    if (d === 3){ const c = { röda:rnd(1, 5), blå:rnd(1, 5), gula:rnd(1, 4) }, tot = c.röda + c.blå + c.gula, col0 = pick(['röda', 'blå', 'gula']), sg = { röda:'röd', blå:'blå', gula:'gul' }[col0];
      return FRAC(`Du tar en kula utan att titta. Hur stor är sannolikheten att den är <b>${sg}</b>?`, c[col0], tot, { fig:figBag(c), steps:[`Totalt ${tot} kulor.`, `${c[col0]} är ${col0 === 'blå' ? 'blå' : col0}.`, `Sannolikheten är ${c[col0]}/${tot}.`], hint:'Gynnsamma kulor / alla kulor.' }); }
    if (Math.random() < .5){ const c = { röda:rnd(1, 5), blå:rnd(1, 5), gröna:rnd(1, 4) }, tot = c.röda + c.blå + c.gröna; return FRAC('Du tar en kula utan att titta. Hur stor är sannolikheten att den <b>inte</b> är röd?', tot - c.röda, tot, { fig:figBag(c), steps:[`Totalt ${tot} kulor, ${c.röda} röda.`, `Inte röda: ${tot - c.röda}.`, `Sannolikheten är ${tot - c.röda}/${tot}.`], hint:'Räkna alla kulor som inte är röda.' }); }
    return FRAC('Du singlar två mynt. Hur stor är sannolikheten att båda visar <b>krona</b>?', 1, 4, { steps:['Möjliga utfall: krona-krona, krona-klave, klave-krona, klave-klave.', 'Ett av fyra är krona-krona.', 'Sannolikheten är 1/4.'], hint:'Skriv upp alla möjliga utfall.' });
  } },
  { code:'G2.7', name:'Beräkna delen från procentform', gen(d){
    if (d === 1){ const n = rnd(2, 90) * 10; return NUM(`Hur mycket är <b>10 % av ${n}</b>?`, n / 10, { steps:['10 % = en tiondel.', `${n} / 10 = ${n / 10}.`], hint:'10 % är en tiondel.' }); }
    if (d === 2){ const p = pick([50, 25, 20]), n = rnd(2, 40) * (100 / p); return NUM(`Hur mycket är <b>${p} % av ${n}</b>?`, n * p / 100, { steps:[`${p} % = 1/${100 / p}.`, `${n} / ${100 / p} = ${n * p / 100}.`], hint:`${p} % = 1/${100 / p}.` }); }
    if (d === 3){ const p = pick([5, 15, 30, 75]), n = rnd(2, 30) * 20; return NUM(`Hur mycket är <b>${p} % av ${n}</b>?`, n * p / 100, { steps:[`1 % av ${n} = ${fmt(n / 100)}.`, `${p} · ${fmt(n / 100)} = ${fmt(n * p / 100)}.`], hint:'Räkna ut 1 % eller 10 % först.' }); }
    const pr = rnd(2, 18) * 50, p = pick([10, 20, 25, 30]); return NUM(`En matchtröja kostar <b>${pr} kr</b>. Den sänks med <b>${p} %</b>. Vad blir det nya priset?`, pr * (100 - p) / 100, { suffix:'kr', steps:[`Rabatten: ${p} % av ${pr} = ${pr * p / 100} kr.`, `Nytt pris: ${pr} − ${pr * p / 100} = ${pr * (100 - p) / 100} kr.`], hint:'Räkna ut rabatten först och dra bort den.' });
  } },
  { code:'G3.1', name:'Proportionalitet', gen(d){
    if (d === 1){ const p = rnd(4, 20) * 5, n = rnd(2, 9); return NUM(`En biljett kostar <b>${p} kr</b>. Vad kostar <b>${n}</b> biljetter?`, p * n, { suffix:'kr', steps:[`${n} · ${p} = ${p * n} kr.`], hint:'Dubbelt så många kostar dubbelt så mycket.' }); }
    if (d === 2){ const u = rnd(2, 15) * 5, a = rnd(2, 5), b = rnd(a + 1, 9); return NUM(`<b>${a} kg</b> äpplen kostar <b>${a * u} kr</b>. Vad kostar <b>${b} kg</b>?`, b * u, { suffix:'kr', steps:[`1 kg kostar ${a * u} / ${a} = ${u} kr.`, `${b} kg kostar ${b} · ${u} = ${b * u} kr.`], hint:'Räkna ut priset för 1 kg först.' }); }
    if (d === 3){ const k = rnd(2, 9), mul = rnd(1, 2), xs = [1, 2, 3, 5].map(x => x * mul), miss = rnd(1, 3);
      return NUM(`Tabellen visar ett proportionellt samband. Vilket tal saknas?`, xs[miss] * k, { fig:figTable(['Antal bollar', ...xs.map(String)], [['Pris (kr)', ...xs.map((x, i) => i === miss ? '?' : String(x * k * 10 / 10))]]).replace('Antal bollar', 'Antal'), steps:[`${xs[0]} kostar ${xs[0] * k}, så 1 kostar ${k}.`, `${xs[miss]} · ${k} = ${xs[miss] * k}.`], hint:'Hur mycket kostar 1 styck?' }); }
    const v = rnd(4, 12) * 10, t1 = rnd(2, 4), t2 = rnd(t1 + 1, 7); return NUM(`En buss kör <b>${v * t1} km</b> på <b>${t1} timmar</b>. Hur långt kör den på <b>${t2} timmar</b> med samma fart?`, v * t2, { suffix:'km', steps:[`På 1 timme: ${v * t1} / ${t1} = ${v} km.`, `På ${t2} timmar: ${t2} · ${v} = ${v * t2} km.`], hint:'Räkna ut hur långt bussen kör på 1 timme.' });
  } },
  { code:'G3.2', name:'Kombinatorik', gen(d){
    if (d === 1){ const a = rnd(2, 5), b = rnd(2, 4); return NUM(`Du har <b>${a}</b> tröjor och <b>${b}</b> par shorts. Hur många olika kombinationer kan du klä dig i?`, a * b, { suffix:'st', steps:[`Varje tröja kan kombineras med ${b} shorts.`, `${a} · ${b} = ${a * b}.`], hint:'Rita ett träddiagram eller multiplicera.' }); }
    if (d === 2){ const a = rnd(2, 4), b = rnd(2, 3), c = rnd(2, 3); return NUM(`Ett lag har <b>${a}</b> tröjor, <b>${b}</b> shorts och <b>${c}</b> par strumpor. Hur många olika matchställ kan de sätta ihop?`, a * b * c, { suffix:'st', steps:[`${a} · ${b} · ${c} = ${a * b * c}.`], hint:'Multiplicera antalet val i varje steg.' }); }
    if (d === 3){ const n = pick([3, 4]), f = n === 3 ? 6 : 24; return NUM(`På hur många olika sätt kan <b>${n}</b> spelare ställa sig på rad?`, f, { steps:[`Första platsen: ${n} val. Nästa: ${n - 1}. ${n === 4 ? 'Sedan 2, sist 1.' : 'Sist 1.'}`, `${Array.from({ length:n }, (_, i) => n - i).join(' · ')} = ${f}.`], hint:'Hur många kan stå först? Hur många är kvar till nästa plats?' }); }
    const n = rnd(4, 10); return NUM(`<b>${n}</b> lag spelar en serie där alla möter alla en gång. Hur många matcher blir det?`, n * (n - 1) / 2, { suffix:'matcher', steps:[`Varje lag möter ${n - 1} andra: ${n} · ${n - 1} = ${n * (n - 1)}.`, `Men då är varje match räknad två gånger: ${n * (n - 1)} / 2 = ${n * (n - 1) / 2}.`], hint:'Varje match har två lag – se upp så att du inte räknar dubbelt.' });
  } },
  { code:'G3.3', name:'Numeriska uttryck', gen(d){
    if (d === 1){ const a = rnd(2, 20), b = rnd(2, 9), c = rnd(2, 9); return NUM(`<b>${a} + ${b} · ${c}</b> = ?`, a + b * c, { steps:['Multiplikation före addition.', `${b} · ${c} = ${b * c}.`, `${a} + ${b * c} = ${a + b * c}.`], hint:'Gånger och delat räknas före plus och minus.' }); }
    if (d === 2){ const a = rnd(6, 20), b = rnd(1, a - 1), c = rnd(2, 9); return NUM(`<b>(${a} − ${b}) · ${c}</b> = ?`, (a - b) * c, { steps:['Parentesen först.', `${a} − ${b} = ${a - b}.`, `${a - b} · ${c} = ${(a - b) * c}.`], hint:'Räkna parentesen först.' }); }
    if (d === 3){ const c = rnd(2, 6), q = rnd(2, 9), b = c * q, a = rnd(q + 1, 30), e = rnd(1, 9); return NUM(`<b>${a} − ${b} / ${c} + ${e}</b> = ?`, a - q + e, { steps:['Division först.', `${b} / ${c} = ${q}.`, `Sedan från vänster: ${a} − ${q} + ${e} = ${a - q + e}.`], hint:'Division före plus och minus.' }); }
    const a = rnd(2, 6), b = rnd(1, 6), c = rnd(1, 6), e = rnd(2, 5), q = rnd(1, Math.min(5, a * (b + c) - 1)), dd = e * q; const res = a * (b + c) - q; // svaret alltid positivt (inget minustecken på tangentbordet)
    return NUM(`<b>${a} · (${b} + ${c}) − ${dd} / ${e}</b> = ?`, res, { steps:[`Parentesen: ${b} + ${c} = ${b + c}.`, `${a} · ${b + c} = ${a * (b + c)} och ${dd} / ${e} = ${q}.`, `${a * (b + c)} − ${q} = ${res}.`], hint:'Parentes först, sedan gånger och delat, sist plus och minus.' });
  } },
  { code:'G3.4', name:'Algebraiska uttryck', gen(d){
    if (d === 1){ const k = rnd(2, 9), m = rnd(1, 15), x = rnd(2, 9); return NUM(`Beräkna <b>${k}x + ${m}</b> om <b>x = ${x}</b>.`, k * x + m, { steps:[`Byt x mot ${x}: ${k} · ${x} + ${m}.`, `${k * x} + ${m} = ${k * x + m}.`], hint:`${k}x betyder ${k} · x.` }); }
    if (d === 2){ const m = rnd(20, 40), k = rnd(2, 4), a = rnd(2, Math.floor(m / k)); return NUM(`Beräkna <b>${m} − ${k}a</b> om <b>a = ${a}</b>.`, m - k * a, { steps:[`${k}a = ${k} · ${a} = ${k * a}.`, `${m} − ${k * a} = ${m - k * a}.`], hint:'Räkna gånger först.' }); }
    if (d === 3){
      const T = pick([
        ['dubbla talet x och lägg till 3', '2x + 3', ['x + 3', '2(x + 3)', '3x + 2']],
        ['talet x minus 5, sedan gånger 4', '4(x − 5)', ['4x − 5', 'x − 20', '5x − 4']],
        ['hälften av talet x', 'x / 2', ['2x', 'x − 2', 'x + 2']],
        ['tre mer än talet x', 'x + 3', ['3x', 'x − 3', '3 − x']],
      ]);
      return CHOICE(`Vilket uttryck betyder <b>${T[0]}</b>?`, T[1], T[2], { steps:[`”${T[0]}” skrivs ${T[1]}.`], hint:'Läs orden ett i taget och skriv dem som matematik.' });
    }
    const a = rnd(2, 9), b = rnd(2, 9), p = rnd(2, 5), q = rnd(2, 5); return NUM(`Beräkna <b>${p}a + ${q}b</b> om <b>a = ${a}</b> och <b>b = ${b}</b>.`, p * a + q * b, { steps:[`${p} · ${a} = ${p * a} och ${q} · ${b} = ${q * b}.`, `${p * a} + ${q * b} = ${p * a + q * b}.`], hint:'Byt bokstäverna mot talen.' });
  } },
  { code:'G3.5', name:'Mer om algebraiska uttryck', gen(d){
    if (d === 1){ const a = rnd(2, 9), b = rnd(2, 9); return MULTI(`Förenkla <b>${a}x + ${b}x</b>`, [{ ans:a + b, suffix:'x' }], { steps:[`${a} x och ${b} x till: ${a} + ${b} = ${a + b}.`, `${a}x + ${b}x = ${a + b}x.`], answer:`${a + b}x`, hint:'Lägg ihop alla x.' }); }
    if (d === 2){ const a = rnd(5, 12), b = rnd(1, a - 2), c = rnd(1, 6); return MULTI(`Förenkla <b>${a}a − ${b}a + ${c}a</b>`, [{ ans:a - b + c, suffix:'a' }], { steps:[`${a} − ${b} + ${c} = ${a - b + c}.`, `= ${a - b + c}a.`], answer:`${a - b + c}a`, hint:'Räkna med siffrorna framför a.' }); }
    if (d === 3){ const a = rnd(2, 6), b = rnd(1, 9), c = rnd(2, 6), e = rnd(1, 9); return MULTI(`Förenkla <b>${a}x + ${b} + ${c}x + ${e}</b>`, [{ ans:a + c, suffix:'x +' }, { ans:b + e }], { steps:[`x-termer: ${a}x + ${c}x = ${a + c}x.`, `Tal: ${b} + ${e} = ${b + e}.`, `${a + c}x + ${b + e}.`], answer:`${a + c}x + ${b + e}`, hint:'Samla x för sig och talen för sig.' }); }
    const k = rnd(2, 6), m = rnd(1, 9); return MULTI(`Multiplicera in i parentesen: <b>${k}(x + ${m})</b>`, [{ ans:k, suffix:'x +' }, { ans:k * m }], { steps:[`${k} gånger allt i parentesen.`, `${k} · x = ${k}x och ${k} · ${m} = ${k * m}.`, `${k}x + ${k * m}.`], answer:`${k}x + ${k * m}`, hint:'Talet framför parentesen gångas med båda termerna.' });
  } },
  { code:'G3.6', name:'Mönster', gen(d){
    if (d <= 2){ const s = d === 1 ? rnd(2, 6) : -rnd(3, 9), a = d === 1 ? rnd(1, 10) : rnd(60, 99), seq = [0, 1, 2, 3].map(i => a + i * s); return NUM(`Vilket tal kommer härnäst? <b>${seq.join(', ')}, …</b>`, a + 4 * s, { steps:[`Skillnaden mellan talen är ${s > 0 ? '+' : '−'}${Math.abs(s)}.`, `${seq[3]} ${s > 0 ? '+' : '−'} ${Math.abs(s)} = ${a + 4 * s}.`], hint:'Hur mycket ändras talen varje gång?' }); }
    if (d === 3){ const a = rnd(3, 6), s = rnd(2, 5), n = rnd(6, 10); return NUM(`Figur 1 har <b>${a}</b> stickor, figur 2 har <b>${a + s}</b> och figur 3 har <b>${a + 2 * s}</b>. Hur många stickor har <b>figur ${n}</b>?`, a + (n - 1) * s, { steps:[`Varje ny figur har ${s} stickor till.`, `Figur ${n}: ${a} + ${n - 1} · ${s} = ${a + (n - 1) * s}.`], hint:'Hur många stickor kommer till varje gång?' }); }
    if (Math.random() < .5){ const a = rnd(2, 5), seq = [0, 1, 2, 3].map(i => a * Math.pow(2, i)); return NUM(`Vilket tal kommer härnäst? <b>${seq.join(', ')}, …</b>`, a * 16, { steps:['Varje tal är dubbelt så stort som det förra.', `${seq[3]} · 2 = ${a * 16}.`], hint:'Är det plus eller gånger?' }); }
    const k = rnd(2, 5), m = rnd(1, 5), n = rnd(15, 30); return NUM(`Antalet stickor i figur n är <b>${k}n + ${m}</b>. Hur många stickor har <b>figur ${n}</b>?`, k * n + m, { steps:[`Byt n mot ${n}: ${k} · ${n} + ${m}.`, `${k * n} + ${m} = ${k * n + m}.`], hint:'Sätt in figurens nummer i stället för n.' });
  } },
  { code:'G3.7', name:'Ekvationer', gen(d){
    const x = rnd(2, 12);
    if (d === 1){ const a = rnd(3, 20); return MULTI(`Lös ekvationen: <b>x + ${a} = ${x + a}</b>`, [{ ans:x, label:'x =' }], { answer:`x = ${x}`, steps:[`Ta bort ${a} på båda sidor.`, `x = ${x + a} − ${a} = ${x}.`], hint:'Vilket tal plus ' + a + ' blir ' + (x + a) + '?' }); }
    if (d === 2){ const a = rnd(2, 9); return MULTI(`Lös ekvationen: <b>${a}x = ${a * x}</b>`, [{ ans:x, label:'x =' }], { answer:`x = ${x}`, steps:[`Dela båda sidor med ${a}.`, `x = ${a * x} / ${a} = ${x}.`], hint:`${a}x betyder ${a} · x.` }); }
    if (d === 3){ const a = rnd(2, 6), b = rnd(1, 15); return MULTI(`Lös ekvationen: <b>${a}x + ${b} = ${a * x + b}</b>`, [{ ans:x, label:'x =' }], { answer:`x = ${x}`, steps:[`Ta bort ${b} på båda sidor: ${a}x = ${a * x}.`, `Dela med ${a}: x = ${x}.`], hint:'Ta bort talet som läggs till först.' }); }
    if (Math.random() < .5){ const a = rnd(2, 6), b = rnd(1, 10); return MULTI(`Lös ekvationen: <b>${a}x − ${b} = ${a * x - b}</b>`, [{ ans:x, label:'x =' }], { answer:`x = ${x}`, steps:[`Lägg till ${b} på båda sidor: ${a}x = ${a * x}.`, `Dela med ${a}: x = ${x}.`], hint:'Lägg till talet som dras bort först.' }); }
    const a = rnd(2, 5), b = rnd(1, 9), xx = a * rnd(2, 8); return MULTI(`Lös ekvationen: <b>x/${a} + ${b} = ${xx / a + b}</b>`, [{ ans:xx, label:'x =' }], { answer:`x = ${xx}`, steps:[`Ta bort ${b}: x/${a} = ${xx / a}.`, `Gånger ${a}: x = ${xx}.`], hint:'Ta bort talet som läggs till, sedan gånger.' });
  } },
  { code:'G4.1', name:'Geometriska objekt', gen(d){
    const K = { kub:'sex kvadratiska sidoytor', rätblock:'sex rektangulära sidoytor', cylinder:'två cirklar som basytor och en buktig mantelyta', klot:'bara en buktig yta – ingen kant och inget hörn', kon:'en cirkel som bas och en spets', pyramid:'en månghörning som bas och trianglar som möts i en spets' };
    if (d === 1){ const t = pick(Object.keys(K)); return CHOICE('Vad heter kroppen?', t, Object.keys(K).filter(x => x !== t), { fig:fig3D(t), steps:[`En ${t} har ${K[t]}.`], hint:'Titta på basytan och om det finns en spets.' }); }
    if (d === 2){ const [b, w, n] = pick([['kub', 'hörn', 8], ['kub', 'kanter', 12], ['kub', 'sidoytor', 6], ['rätblock', 'hörn', 8], ['rätblock', 'kanter', 12], ['pyramid', 'hörn', 5], ['pyramid', 'kanter', 8], ['pyramid', 'sidoytor', 5]]);
      return NUM(`Hur många <b>${w}</b> har en${b === 'pyramid' ? ' fyrsidig' : ''} <b>${b}</b>?`, n, { fig:fig3D(b), steps:[`Räkna ${w} på figuren – glöm inte de som syns bakom.`, `En ${b} har ${n} ${w}.`], hint:'Räkna även det som är dolt på baksidan.' }); }
    if (d === 3){ const [s, n] = pick([['femhörning', 5], ['sexhörning', 6], ['åttahörning', 8], ['triangel', 3]]); return NUM(`Hur många sidor har en <b>${s}</b>?`, n, { fig:figShape(s), steps:[`En ${s} har lika många sidor som hörn: ${n}.`], hint:'Lika många sidor som hörn.' }); }
    const [q, a, w] = pick([['har bara en buktig yta och ingen kant', 'klot', ['kub', 'kon', 'cylinder']], ['har två cirkelformade basytor', 'cylinder', ['kon', 'klot', 'pyramid']], ['har en cirkel som bas och en spets', 'kon', ['cylinder', 'pyramid', 'klot']], ['har sex lika stora kvadratiska sidoytor', 'kub', ['rätblock', 'pyramid', 'cylinder']]]);
    return CHOICE(`Vilken kropp <b>${q}</b>?`, a, w, { steps:[`En ${a} ${q}.`], hint:'Föreställ dig kroppen i handen.' });
  } },
  { code:'G4.2', name:'Vinklar', gen(d){
    if (d === 1){ const A = rnd(30, 80), B = rnd(30, 150 - A); return NUM('Två vinklar i en triangel är kända. Hur stor är den tredje?', 180 - A - B, { fig:figTriAngles(`${A}°`, `${B}°`, '?'), suffix:'°', steps:['Vinkelsumman i en triangel är 180°.', `180 − ${A} − ${B} = ${180 - A - B}°.`], hint:'Alla vinklar i en triangel blir 180° tillsammans.' }); }
    if (d === 2){ const k = rnd(25, 155); return NUM('Hur stor är den markerade vinkeln?', 180 - k, { fig:figSplit(k, 180), suffix:'°', steps:['Vinklarna på en rak linje blir 180°.', `180 − ${k} = ${180 - k}°.`], hint:'En rak vinkel är 180°.' }); }
    if (d === 3){ const a = rnd(25, 155); return NUM('Två linjer korsar varandra. Hur stor är vinkeln mitt emot?', a, { fig:figCross(a), suffix:'°', steps:['Vinklar mitt emot varandra (vertikalvinklar) är lika stora.', `Den är också ${a}°.`], hint:'Vertikalvinklar är lika stora.' }); }
    const top = rnd(10, 80) * 2 - (Math.random() < .5 ? 0 : 0), base = (180 - top) / 2; return NUM(`En likbent triangel har toppvinkeln <b>${top}°</b>. Hur stor är var och en av basvinklarna?`, base, { fig:figTriAngles('?', '?', `${top}°`), suffix:'°', steps:['Basvinklarna i en likbent triangel är lika stora.', `180 − ${top} = ${180 - top}.`, `${180 - top} / 2 = ${base}°.`], hint:'Båda basvinklarna är lika stora och summan är 180°.' });
  } },
  { code:'G4.3', name:'Spegling och symmetri', gen(d){
    if (d === 1){ const [s, n, f] = pick([['kvadrat', 4, 'kvadrat'], ['rektangel', 2, 'rektangel'], ['liksidig triangel', 3, null], ['regelbunden sexhörning', 6, 'sexhörning'], ['regelbunden femhörning', 5, 'femhörning']]);
      return NUM(`Hur många symmetrilinjer har en <b>${s}</b>?`, n, { fig:f ? figShape(f) : '', steps:['En symmetrilinje delar figuren i två delar som är spegelbilder av varandra.', `En ${s} har ${n}.`], hint:'Tänk dig att du viker figuren så att halvorna passar exakt.' }); }
    if (d === 2){ const a = pick(['A', 'H', 'M', 'T', 'U', 'V', 'W', 'Y', 'O']), w = shuffle(['F', 'G', 'J', 'L', 'N', 'P', 'R', 'S', 'Z']).slice(0, 3); return CHOICE('Vilken bokstav har en <b>lodrät</b> symmetrilinje?', a, w, { steps:[`Om du viker ${a} på mitten uppifrån och ner passar halvorna.`], hint:'Vik bokstaven på mitten uppifrån och ner.' }); }
    const x = rnd(1, 6) * (Math.random() < .3 ? -1 : 1), y = rnd(1, 6) * (Math.random() < .3 ? -1 : 1);
    if (d === 3) return MULTI(`Punkten <b>(${fmt(x)}, ${fmt(y)})</b> speglas i y-axeln. Vilka koordinater får spegelbilden?`, [{ ans:-x, label:'x' }, { ans:y, label:'y' }], { neg:true, layout:'coord', answer:`(${fmt(-x)}, ${fmt(y)})`, steps:['Spegling i y-axeln: x byter tecken, y är samma.', `(${fmt(x)}, ${fmt(y)}) → (${fmt(-x)}, ${fmt(y)}).`], hint:'Bara x-koordinaten ändras.' });
    return MULTI(`Punkten <b>(${fmt(x)}, ${fmt(y)})</b> speglas i x-axeln. Vilka koordinater får spegelbilden?`, [{ ans:x, label:'x' }, { ans:-y, label:'y' }], { neg:true, layout:'coord', answer:`(${fmt(x)}, ${fmt(-y)})`, steps:['Spegling i x-axeln: y byter tecken, x är samma.', `(${fmt(x)}, ${fmt(y)}) → (${fmt(x)}, ${fmt(-y)}).`], hint:'Bara y-koordinaten ändras.' });
  } },
  { code:'G4.4', name:'Längd och skala', gen(d){
    if (d === 1) return pick([() => CONV(r6(rnd(11, 59) / 10), 'km', 'm', 'len'), () => CONV(rnd(11, 99) * 10, 'mm', 'm', 'len'), () => CONV(r6(rnd(11, 99) / 10), 'm', 'mm', 'len')])();
    if (d === 2){ const c = rnd(2, 9); return NUM(`Skala <b>1:20 000</b>. Hur många meter är <b>${c} cm</b> på kartan i verkligheten?`, c * 200, { suffix:'m', steps:['1 cm på kartan = 20 000 cm = 200 m.', `${c} · 200 = ${fmt(c * 200)} m.`], hint:'20 000 cm = 200 m.' }); }
    if (d === 3){ const c = rnd(3, 15); return NUM(`Skala <b>1:50 000</b>. Hur många km är <b>${c} cm</b> på kartan i verkligheten?`, c / 2, { suffix:'km', steps:['1 cm = 50 000 cm = 500 m = 0,5 km.', `${c} · 0,5 = ${fmt(c / 2)} km.`], hint:'50 000 cm = 0,5 km.' }); }
    const km = rnd(1, 6), sc = pick([25000, 50000]), cm = km * 100000 / sc; return NUM(`Avståndet är <b>${km} km</b> i verkligheten. Hur långt är det på en karta i skala <b>1:${fmt(sc)}</b>?`, cm, { suffix:'cm', steps:[`${km} km = ${fmt(km * 100000)} cm.`, `${fmt(km * 100000)} / ${fmt(sc)} = ${fmt(cm)} cm.`], hint:'Gör om km till cm och dela med skalan.' });
  } },
  { code:'G4.5', name:'Omkrets', gen(d){
    if (d === 1){ const [s, n] = pick([['regelbunden femhörning', 5], ['regelbunden sexhörning', 6], ['kvadrat', 4], ['liksidig triangel', 3]]), a = rnd(3, 15); return NUM(`En <b>${s}</b> har sidan <b>${a} cm</b>. Hur stor är omkretsen?`, n * a, { suffix:'cm', steps:[`${n} lika långa sidor.`, `${n} · ${a} = ${n * a} cm.`], hint:'Alla sidor är lika långa.' }); }
    if (d === 2){ const dd = rnd(2, 20); return NUM('Hur stor är cirkelns omkrets? Använd π ≈ 3,14.', r6(3.14 * dd), { fig:figCircle(dd, 'd', 'cm'), suffix:'cm', steps:['Omkrets = π · diametern.', `3,14 · ${dd} = ${fmt(r6(3.14 * dd))} cm.`], hint:'O = π · d.' }); }
    if (d === 3){ const r = rnd(2, 15); return NUM('Hur stor är cirkelns omkrets? Använd π ≈ 3,14.', r6(3.14 * 2 * r), { fig:figCircle(r, 'r', 'cm'), suffix:'cm', steps:[`Diametern är 2 · radien = ${2 * r} cm.`, `3,14 · ${2 * r} = ${fmt(r6(3.14 * 2 * r))} cm.`], hint:'O = π · d och d = 2 · r.' }); }
    const dd = pick([50, 60, 70]), v = pick([10, 20, 100]); return NUM(`Ett cykelhjul har diametern <b>${dd} cm</b>. Hur många meter rullar det på <b>${v} varv</b>? Använd π ≈ 3,14.`, r6(3.14 * dd * v / 100), { suffix:'m', steps:[`Ett varv: 3,14 · ${dd} = ${fmt(r6(3.14 * dd))} cm.`, `${v} varv: ${fmt(r6(3.14 * dd * v))} cm = ${fmt(r6(3.14 * dd * v / 100))} m.`], hint:'Ett varv = hjulets omkrets.' });
  } },
  { code:'G4.6', name:'Area och volym', gen(d){
    if (d === 1){ let b, h; do { b = rnd(3, 16); h = rnd(2, 12); } while ((b * h) % 2); return NUM('Hur stor är triangelns area?', b * h / 2, { fig:figRightTri(b, h, 'cm'), suffix:'cm²', steps:['Area = bas · höjd / 2.', `${b} · ${h} / 2 = ${b * h / 2} cm².`], hint:'A = b · h / 2.' }); }
    if (d === 2){ const b = rnd(4, 15), h = rnd(2, 10); return NUM(`Ett parallellogram har basen <b>${b} cm</b> och höjden <b>${h} cm</b>. Hur stor är arean?`, b * h, { fig:figShape('parallellogram'), suffix:'cm²', steps:['Area = bas · höjd.', `${b} · ${h} = ${b * h} cm².`], hint:'Ett parallellogram kan klippas om till en rektangel.' }); }
    if (d === 3){ const l = rnd(2, 10), b = rnd(2, 8), h = rnd(2, 6); return NUM('Hur stor är rätblockets volym?', l * b * h, { fig:figBox(l, b, h, 'cm'), suffix:'cm³', steps:['Volym = längd · bredd · höjd.', `${l} · ${b} · ${h} = ${l * b * h} cm³.`], hint:'V = l · b · h.' }); }
    const l = rnd(3, 8) * 10, b = rnd(2, 5) * 10, h = rnd(2, 5) * 10, V = l * b * h / 1000;
    return NUM(`Ett akvarium är <b>${l} cm</b> långt, <b>${b} cm</b> brett och <b>${h} cm</b> högt. Hur många liter rymmer det?`, V, { fig:figBox(l, b, h, 'cm'), suffix:'l', steps:[`Gör om till dm: ${l / 10} dm, ${b / 10} dm, ${h / 10} dm.`, `${l / 10} · ${b / 10} · ${h / 10} = ${V} dm³.`, `1 dm³ = 1 l, så ${V} l.`], hint:'Räkna i dm – då blir svaret direkt i liter.' });
  } },
];

const CURRICULUM = [...ALFA, ...BETA, ...GAMMA];
const SECTIONS = {}; CURRICULUM.forEach(s => { SECTIONS[s.code] = s; });

const LEAGUE_DEFS = [
  { id:'PL', name:'Premier League', book:'Alfa', color:'#3d195b', accent:'#00ff85',
    levels:[{ name:'Lätt', from:'A1.1', to:'A2.6' }, { name:'Medel', from:'A3.1', to:'A4.5' }, { name:'Svår', from:'A5.1', to:'A6.4' }] },
  { id:'CL', name:'Champions League', book:'Beta', color:'#0b1f63', accent:'#8ec5ff',
    levels:[{ name:'Lätt', from:'B1.1', to:'B2.6' }, { name:'Medel', from:'B3.1', to:'B4.5' }, { name:'Svår', from:'B5.1', to:'B6.4' }] },
  { id:'SL', name:'Special League', book:'Gamma', color:'#0f5e4f', accent:'#ffd84d',
    levels:[{ name:'Lätt', from:'G1.1', to:'G2.7' }, { name:'Medel', from:'G3.1', to:'G3.7' }, { name:'Svår', from:'G4.1', to:'G4.6' }] },
];
function levelSections(leagueId, lvl){
  const L = LEAGUE_DEFS.find(l => l.id === leagueId).levels[lvl];
  const i0 = CURRICULUM.findIndex(s => s.code === L.from), i1 = CURRICULUM.findIndex(s => s.code === L.to);
  return CURRICULUM.slice(i0, i1 + 1);
}
function makeProblem(code, d){
  const s = SECTIONS[code];
  const p = s.gen(d);
  p.skill = code; p.d = d;
  if (p.kind === 'column') p.steps = solveSteps(p);
  return p;
}

if (typeof module !== 'undefined') module.exports = { CURRICULUM, SECTIONS, LEAGUE_DEFS, levelSections, makeProblem, checkAnswer, canonical, parseNum, fmt, solveSteps, digitsOf, fromDigits };
