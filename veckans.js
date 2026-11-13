'use strict';
const WEEK_TIERS = [1, 1, 1, 2, 2, 3, 3, 3, 4, 4], WEEK_COUNT = WEEK_TIERS.length;
let weekly = null;

const weekSectionCodes = () => (WEEK_PLAN.sections || []).filter(c => SECTIONS[c]);
function weekState(){
  if (!save.weekly || save.weekly.id !== WEEK_PLAN.id) save.weekly = { id:WEEK_PLAN.id, passes:0, best:0 };
  return save.weekly;
}
const passText = n => `${n} pass den här veckan`;

function startWeekly(){
  weekly = { secs:weekSectionCodes(), i:0, right:0 };
  weeklyNext();
}
function weeklyNext(){
  if (weekly.i >= WEEK_COUNT){ finishWeekly(); return; }
  const code = weekly.secs[weekly.i % weekly.secs.length];
  openProblem({ code, tier:WEEK_TIERS[weekly.i], eyebrow:`Veckans träning · ${weekly.i + 1} av ${WEEK_COUNT}`, title:'Räkna', verb:'KOLLA', cancel:true, clock:false,
    onDone: res => { weekly.i++; if (res.correct) weekly.right++; setTimeout(weeklyNext, NEXT_PROBLEM_MS); } });
}
function finishWeekly(){
  const st = weekState();
  st.passes++; st.best = Math.max(st.best, weekly.right);
  persist(); go('weeklyDone'); sfx('cheer');
}

function weeklyButtonHTML(){
  if (!weekSectionCodes().length) return '';
  const n = weekState().passes, sub = n ? passText(n) : `${WEEK_COUNT} tal från brons till stjärna`;
  return `<button class="btn big" data-act="weekly">Veckans träning<small>${esc(WEEK_PLAN.topic)} · vecka ${WEEK_PLAN.week} · ${sub}</small></button>`;
}
function weeklyDoneHTML(){
  const st = weekState();
  return `<section class="screen scroll"><div class="wrap center">
    <p class="eyebrow">Vecka ${WEEK_PLAN.week} · ${esc(WEEK_PLAN.topic)}</p>
    <h2 class="h2">Veckans träning klar!</h2>
    <p style="font-size:20px">Du räknade ${weekly ? weekly.right : 0} av ${WEEK_COUNT} rätt.</p>
    <p class="unlock"><b>${passText(st.passes)}</b> · bästa ${st.best} av ${WEEK_COUNT}</p>
    <p class="muted" style="max-width:46ch">Talen blir svårare för varje tal. Kör ett pass till så sitter det ännu bättre.</p>
    <div class="row"><button class="btn big gold" data-act="home">Menyn</button><button class="btn big" data-act="weekly">Ett pass till</button></div>
  </div></section>`;
}
function weeklyReportHTML(){
  const codes = weekSectionCodes();
  if (!codes.length) return '';
  const st = weekState(), names = codes.map(c => `<b>${secLabel(c)}</b> ${SECTIONS[c].name}`).join(', ');
  return `<p>Veckans träning (vecka ${WEEK_PLAN.week}): ${names}. ${passText(st.passes)}, bästa pass ${st.best} av ${WEEK_COUNT} rätt.</p>`;
}
