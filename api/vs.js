// United Mattecup – onlinematch mot en kompis (Vercel Function, Node.js).
// Servern är bara ett relä: varje spelare skriver sitt eget framsteg och läser kompisens.
// Lagring: Upstash Redis via REST (Vercel Marketplace sätter KV_REST_API_URL/KV_REST_API_TOKEN).
// Allt raderas automatiskt efter 3 timmar.
const crypto = require('crypto');

const TTL = 3 * 3600;
const ALPH = 'BCDFGHJKLMNPQRSTVWXZ23456789'; // utan vokaler – inga riktiga ord som kod
const LEAGUES = ['PL', 'CL', 'SL'];
const KITS = ['blue', 'white', 'black', 'yellow'];

function httpErr(status, message){ const e = new Error(message); e.status = status; return e; }

async function redis(cmds){
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw httpErr(500, 'Servern saknar databas. Koppla Upstash Redis till Vercel-projektet (se LÄS-MIG).');
  const r = await fetch(url.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw httpErr(502, 'Databasen svarade inte (' + r.status + ').');
  const out = await r.json();
  return out.map(x => { if (x && x.error) throw httpErr(502, 'Databasfel.'); return x ? x.result : null; });
}

const int = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
const cleanName = s => String(s || '').normalize('NFC').replace(/[^\p{L}\p{N} \-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 14) || 'Kompis';
const cleanCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
function cleanSeat(b){
  return {
    name: cleanName(b.name),
    league: LEAGUES.includes(b.league) ? b.league : 'PL',
    level: [0, 1, 2].includes(Number(b.level)) ? Number(b.level) : 0,
    kit: KITS.includes(b.kit) ? b.kit : 'blue',
  };
}
function cleanProgress(d){
  d = d && typeof d === 'object' ? d : {};
  const turns = Array.isArray(d.turns) ? d.turns : [];
  return {
    turns: turns.slice(0, 8).map(t => ({ atk: int(t && t.atk, 300), mur: int(t && t.mur, 300) })),
    pens: (Array.isArray(d.pens) ? d.pens : []).slice(0, 12).map(Boolean),
    picks: (Array.isArray(d.picks) ? d.picks : []).slice(0, 6).map(String).filter(x => /^[a-z0-9_]{1,16}$/.test(x)),
    ready: !!d.ready, quit: !!d.quit, r: int(d.r, 500), n: int(d.n, 500),
  };
}
const parse = s => { try { return s ? JSON.parse(s) : null; } catch (e){ return null; } };
const pub = s => s ? { name: s.name, league: s.league, level: s.level, kit: s.kit } : null;
const key = (code, k) => `vs:${code}:${k}`;

async function readBody(req){
  if (req.body !== undefined && req.body !== null && req.body !== ''){
    if (typeof req.body === 'string') return parse(req.body) || {};
    if (Buffer.isBuffer(req.body)) return parse(req.body.toString('utf8')) || {};
    if (typeof req.body === 'object') return req.body;
  }
  let raw = '';
  for await (const chunk of req){ raw += chunk; if (raw.length > 20000) throw httpErr(413, 'För stor förfrågan.'); }
  return parse(raw) || {};
}

async function seatOf(code, seat, token){
  if (![0, 1].includes(seat)) throw httpErr(400, 'Fel plats.');
  const [s] = await redis([['GET', key(code, 's' + seat)]]);
  const v = parse(s);
  if (!v) throw httpErr(404, 'Matchen finns inte längre.');
  if (!token || v.token !== token) throw httpErr(403, 'Fel nyckel för matchen.');
  return v;
}

async function handle(b){
  const action = b.action;
  if (action === 'create'){
    const seat = { ...cleanSeat(b), token: crypto.randomBytes(12).toString('hex') };
    for (let i = 0; i < 8; i++){
      const code = Array.from(crypto.randomBytes(4), x => ALPH[x % ALPH.length]).join('');
      const [ok] = await redis([['SET', key(code, 's0'), JSON.stringify(seat), 'NX', 'EX', TTL]]);
      if (ok === 'OK') return { code, seat: 0, token: seat.token };
    }
    throw httpErr(503, 'Kunde inte skapa en kod. Försök igen.');
  }
  const code = cleanCode(b.code);
  if (code.length !== 4) throw httpErr(400, 'Koden ska ha 4 tecken.');
  if (action === 'join'){
    const [s0] = await redis([['GET', key(code, 's0')]]);
    const host = parse(s0);
    if (!host) throw httpErr(404, 'Hittar ingen match med koden ' + code + '.');
    const seat = { ...cleanSeat(b), token: crypto.randomBytes(12).toString('hex') };
    const [ok] = await redis([['SET', key(code, 's1'), JSON.stringify(seat), 'NX', 'EX', TTL], ['SET', key(code, 'h1'), String(Date.now()), 'EX', TTL]]);
    if (ok !== 'OK') throw httpErr(409, 'Matchen ' + code + ' är redan full.');
    return { code, seat: 1, token: seat.token, opp: pub(host) };
  }
  const seat = Number(b.seat);
  if (action === 'push'){
    await seatOf(code, seat, b.token);
    const data = cleanProgress(b.data);
    await redis([['SET', key(code, 'p' + seat), JSON.stringify(data), 'EX', TTL], ['SET', key(code, 'h' + seat), String(Date.now()), 'EX', TTL]]);
    return { ok: true };
  }
  if (action === 'state'){
    const res = await redis([
      ['MGET', key(code, 's0'), key(code, 's1'), key(code, 'p0'), key(code, 'p1'), key(code, 'h0'), key(code, 'h1')],
      ...([0, 1].includes(seat) ? [['SET', key(code, 'h' + seat), String(Date.now()), 'EX', TTL]] : []),
    ]);
    const [s0, s1, p0, p1, h0, h1] = res[0] || [];
    const seats = [parse(s0), parse(s1)];
    if (!seats[0]) throw httpErr(404, 'Matchen finns inte längre.');
    if ([0, 1].includes(seat) && (!seats[seat] || seats[seat].token !== b.token)) throw httpErr(403, 'Fel nyckel för matchen.');
    return { code, now: Date.now(), seats: seats.map(pub), p: [parse(p0), parse(p1)], seen: [Number(h0) || 0, Number(h1) || 0] };
  }
  throw httpErr(400, 'Okänd åtgärd.');
}

function send(res, status, obj){
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

module.exports = async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS'){ res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return send(res, 405, { error: 'Använd POST.' });
  try {
    const b = await readBody(req);
    return send(res, 200, await handle(b));
  } catch (e){
    return send(res, e.status || 500, { error: e.status ? e.message : 'Serverfel.' });
  }
};
