// Lokal testmiljö: falsk Upstash REST (port 8788) + statisk server med /api/vs (port 8787)
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const store = new Map(); // key -> { v, exp }
let cmdCount = 0;
const get = k => { const e = store.get(k); if (!e) return null; if (e.exp && e.exp < Date.now()){ store.delete(k); return null; } return e.v; };
function run(cmd){
  cmdCount++;
  const [c, ...a] = cmd; const C = String(c).toUpperCase();
  if (C === 'GET') return get(a[0]);
  if (C === 'MGET') return a.map(get);
  if (C === 'SET'){
    const [k, v, ...opt] = a; let nx = false, ex = 0;
    for (let i = 0; i < opt.length; i++){ const o = String(opt[i]).toUpperCase(); if (o === 'NX') nx = true; if (o === 'EX') ex = Number(opt[++i]); }
    if (nx && get(k) !== null) return null;
    store.set(k, { v:String(v), exp: ex ? Date.now() + ex * 1000 : 0 }); return 'OK';
  }
  throw new Error('unsupported ' + C);
}
http.createServer((req, res) => {
  let raw = ''; req.on('data', d => raw += d); req.on('end', () => {
    if (req.headers.authorization !== 'Bearer testtoken'){ res.statusCode = 401; return res.end('{"error":"unauthorized"}'); }
    const body = JSON.parse(raw);
    const out = req.url.endsWith('/pipeline') ? body.map(cmd => { try { return { result:run(cmd) }; } catch (e){ return { error:e.message }; } }) : { result:run(body) };
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(out));
  });
}).listen(8788);
process.env.KV_REST_API_URL = 'http://127.0.0.1:8788';
process.env.KV_REST_API_TOKEN = 'testtoken';
const handler = require(ROOT + '/api/vs.js');
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.woff2':'font/woff2', '.png':'image/png', '.txt':'text/plain; charset=utf-8' };
let latency = Number(process.env.LAT || 60), down = false;
http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/__stats'){ res.end(JSON.stringify({ cmdCount, keys:store.size })); return; }
  if (u === '/__down'){ down = true; res.end('down'); return; }
  if (u === '/__up'){ down = false; res.end('up'); return; }
  if (u === '/api/vs'){
    if (down){ req.socket.destroy(); return; }
    // som Vercel: text/plain -> sträng i req.body
    let raw = ''; req.on('data', d => raw += d); req.on('end', () => { req.body = raw; setTimeout(() => handler(req, res), latency); });
    return;
  }
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.statusCode = 404; return res.end('nf'); }
  res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res);
}).listen(8787, () => console.log('dev on 8787'));
