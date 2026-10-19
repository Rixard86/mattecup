'use strict';
const DAILY_COUNT = 10, DAILY_SECTIONS = 4, KEEP_DAYS = 60, REPORT_DAYS = 7, NEXT_PROBLEM_MS = 250, MAX_TIER = 4, TOP_LIST = 4, PERCENT = 100;
const WEEKDAYS = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];
let daily = null;

function dayKey(back = 0){
  const d = new Date(); d.setDate(d.getDate() - back);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayLabel(back){
  const d = new Date(); d.setDate(d.getDate() - back);
  return back === 0 ? 'idag' : back === 1 ? 'igår' : `${WEEKDAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}
function noteDay(code, ok){
  const days = save.days, today = days[dayKey()] || (days[dayKey()] = { n:0, r:0, s:{} });
  const sec = today.s[code] || (today.s[code] = [0, 0]);
  today.n++; sec[1]++;
  if (ok){ today.r++; sec[0]++; }
  Object.keys(days).sort().slice(0, -KEEP_DAYS).forEach(k => delete days[k]);
}

const errRate = k => k.wrong / Math.max(1, k.right + k.wrong);
function weakSections(){
  const tried = CURRICULUM.filter(s => save.skills[s.code].right + save.skills[s.code].wrong > 0);
  const pool = tried.length ? tried : levelSections(LEAGUE_IDS[0], 0);
  const rank = (a, b) => save.skills[a.code].box - save.skills[b.code].box || errRate(save.skills[b.code]) - errRate(save.skills[a.code]);
  return pool.slice().sort(rank).slice(0, DAILY_SECTIONS);
}
const tierFor = code => Math.min(MAX_TIER, Math.max(1, save.skills[code].box - 1));

function dailyDoneToday(){ return save.daily.last === dayKey(); }
function dailyStreak(){ return save.daily.last === dayKey() || save.daily.last === dayKey(1) ? save.daily.streak : 0; }
function startDaily(){
  daily = { secs:weakSections().map(s => s.code), i:0, right:0 };
  dailyNext();
}
function dailyNext(){
  if (daily.i >= DAILY_COUNT){ finishDaily(); return; }
  const code = daily.secs[daily.i % daily.secs.length];
  openProblem({ code, tier:tierFor(code), eyebrow:`Dagens träning · ${daily.i + 1} av ${DAILY_COUNT}`, title:'Räkna', verb:'KOLLA', cancel:true, clock:false,
    onDone: res => { daily.i++; if (res.correct) daily.right++; setTimeout(dailyNext, NEXT_PROBLEM_MS); } });
}
function finishDaily(){
  const st = save.daily;
  if (st.last !== dayKey()){ st.streak = st.last === dayKey(1) ? st.streak + 1 : 1; st.best = Math.max(st.best, st.streak); st.last = dayKey(); }
  persist(); go('dailyDone'); sfx('cheer');
}

function dailyButtonHTML(){
  const n = dailyStreak(), streak = n ? ` · ${n} ${n === 1 ? 'dag' : 'dagar'} i rad` : '';
  const sub = dailyDoneToday() ? `Klar idag${streak}` : `${DAILY_COUNT} tal i dina svåraste avsnitt${streak}`;
  return `<button class="btn big${dailyDoneToday() ? '' : ' gold'}" data-act="daily">Dagens träning<small>${sub}</small></button>`;
}
function dailyDoneHTML(){
  const n = save.daily.streak;
  return `<section class="screen scroll"><div class="wrap center">
    <p class="eyebrow">Carrington</p>
    <h2 class="h2">Dagens träning klar!</h2>
    <p style="font-size:20px">Du räknade ${daily ? daily.right : 0} av ${DAILY_COUNT} rätt.</p>
    <p class="unlock"><b>${n} ${n === 1 ? 'dag' : 'dagar'} i rad</b>${save.daily.best > n ? ` · bästa svit ${save.daily.best}` : ''}</p>
    <p class="muted" style="max-width:46ch">Kom tillbaka i morgon så växer sviten. Talen kommer från de avsnitt där du har mest att vinna.</p>
    <div class="row"><button class="btn big gold" data-act="home">Menyn</button><button class="btn big" data-act="train">Träna mer</button></div>
  </div></section>`;
}

function weekSum(from){
  let n = 0, r = 0;
  for (let b = from; b < from + REPORT_DAYS; b++){ const d = save.days[dayKey(b)]; if (d){ n += d.n; r += d.r; } }
  return { n, r, pct:n ? Math.round(PERCENT * r / n) : null };
}
function weekSections(){
  const sum = {};
  for (let b = 0; b < REPORT_DAYS; b++){ const d = save.days[dayKey(b)]; if (d) Object.entries(d.s).forEach(([c, v]) => { sum[c] = (sum[c] || 0) + v[1]; }); }
  return Object.entries(sum).sort((a, b) => b[1] - a[1]).slice(0, TOP_LIST);
}
function weekReportHTML(){
  const now = weekSum(0), before = weekSum(REPORT_DAYS), pct = w => w.pct === null ? '–' : `${w.pct} %`;
  const rows = Array.from({ length:REPORT_DAYS }, (_, b) => { const d = save.days[dayKey(b)];
    return `<tr><td>${dayLabel(b)}</td><td class="n">${d ? d.n : 0}</td><td class="n">${d && d.n ? Math.round(PERCENT * d.r / d.n) + ' %' : '–'}</td></tr>`; }).join('');
  const name = c => { const s = CURRICULUM.find(x => x.code === c); return `<b>${secLabel(c)}</b> ${s ? s.name : ''}`; };
  const most = weekSections(), weak = weakSections().filter(s => save.skills[s.code].right + save.skills[s.code].wrong > 0);
  return `<h3>Senaste veckan</h3>
    <p>Den här veckan: <b>${now.n} tal</b>, ${pct(now)} rätt. Veckan innan: ${before.n} tal, ${pct(before)} rätt.
      Dagens träning: ${dailyStreak()} dagar i rad (bästa ${save.daily.best}).</p>
    <div class="tablewrap"><table class="skilltable"><thead><tr><th>Dag</th><th class="n">Tal</th><th class="n">Rätt</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${most.length ? `<p>Mest tränat: ${most.map(([c, n]) => `${name(c)} (${n})`).join(', ')}.</p>` : ''}
    ${weak.length ? `<p>Behöver träning: ${weak.map(s => name(s.code)).join(', ')}.</p>` : ''}`;
}
