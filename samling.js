'use strict';
const LIB_TABS = [['cards', 'Kort'], ['teams', 'Spelare'], ['relics', 'Utrustning']];
const RARITY_GROUPS = [['start', 'Startkort'], ['common', 'Vanliga'], ['rare', 'Sällsynta'], ['epic', 'Episka'], ['legend', 'Legendariska']];
const PERFECT_MIN_ANSWERS = 6, COMEBACK_GOALS = 2, TROPHY_GAP_MS = 2200, TROPHY_SHOW_MS = 2600, MASTER_BOX = 5;
let libView = 'cards';

function libSee(kind, ids){
  const list = save.lib[kind], fresh = [...new Set([].concat(ids))].filter(id => id && !list.includes(id));
  if (fresh.length){ list.push(...fresh); persist(); }
}
function seenCards(){
  return new Set(save.lib.cards.concat(save.legends || [], save.stats.runs ? START_DECK : []));
}
function seenOf(kind){
  return kind === 'cards' ? seenCards() : new Set(save.lib[kind]);
}
function totalOf(kind){
  if (kind === 'cards') return Object.keys(CARDS).length;
  return kind === 'teams' ? Object.values(TEAMS).flat().length : Object.keys(RELICS).length;
}
function seenCount(kind){
  const seen = seenOf(kind);
  if (kind === 'cards') return Object.keys(CARDS).filter(id => seen.has(id)).length;
  if (kind === 'teams') return Object.values(TEAMS).flat().filter(t => seen.has(t.name)).length;
  return Object.keys(RELICS).filter(k => seen.has(k)).length;
}

function libCards(){
  const seen = seenCards();
  return RARITY_GROUPS.map(([r, label]) => {
    const ids = Object.keys(CARDS).filter(id => CARDS[id].r === r);
    const shown = ids.filter(id => seen.has(id)).length;
    return `<div class="panelbox"><h3>${label} <small>${shown}/${ids.length}</small></h3>
      <div class="libcards">${ids.map(id => seen.has(id) ? cardHTML(id) : '<div class="card unknown" role="img" aria-label="Okänt kort"><span>?</span></div>').join('')}</div></div>`;
  }).join('');
}
function teamHTML(t){
  return `<details class="libteam" style="--opp:${t.color}"><summary><span class="oppbadge" style="color:${t.text}">${t.short}</span><b>${t.name}</b></summary>
    <ol>${t.players.map(([n, name]) => `<li><span>${n}</span>${name}</li>`).join('')}</ol></details>`;
}
function libTeams(){
  const seen = seenOf('teams');
  return CUP_DEFS.map(L => {
    const list = TEAMS[L.id], shown = list.filter(t => seen.has(t.name)).length;
    return `<div class="panelbox"><h3>${L.name} <small>${shown}/${list.length}</small></h3>
      <div class="libteams">${list.map(t => seen.has(t.name) ? teamHTML(t)
        : '<div class="libteam unknown"><span class="oppbadge">?</span><b>Okänt lag</b></div>').join('')}</div></div>`;
  }).join('');
}
function libRelics(){
  const seen = seenOf('relics');
  return `<div class="levels librelics">${Object.keys(RELICS).map(k => seen.has(k)
    ? `<div class="level"><span class="libicon">${icon(RELICS[k].icon)}</span><b>${RELICS[k].name}</b><span>${RELICS[k].text}</span></div>`
    : '<div class="level unknown"><span class="libicon">?</span><b>???</b><span>Okänd utrustning</span></div>').join('')}</div>`;
}
const LIB_VIEWS = { cards:libCards, teams:libTeams, relics:libRelics };
function libraryHTML(){
  const tabs = LIB_TABS.map(([k, label]) => `<button class="tab${k === libView ? ' on' : ''}" role="tab" aria-selected="${k === libView}" data-act="libTab" data-k="${k}">${label} <small>${seenCount(k)}/${totalOf(k)}</small></button>`).join('');
  return `<section class="screen scroll"><div class="wrap">
    <header class="topbar"><button class="btn ghost" data-act="home">Meny</button></header>
    <div><p class="eyebrow">Allt du har sett i cuper och matcher</p><h2 class="h2">Biblioteket</h2></div>
    <div class="tabs" role="tablist">${tabs}</div>
    ${LIB_VIEWS[libView]()}
  </div></section>`;
}

const stat = k => s => s.stats[k] || 0;
const wonLeague = id => s => s.prog[id].won.some(Boolean);
const TROPHIES = [
  { id:'goal1', name:'Första målet', text:'Gör ditt första mål.', icon:'ball', need:stat('goals'), goal:1 },
  { id:'goal50', name:'Målfabriken', text:'Gör 50 mål.', icon:'ball', need:stat('goals'), goal:50 },
  { id:'win1', name:'Första segern', text:'Vinn en cupmatch.', icon:'star', need:stat('wins'), goal:1 },
  { id:'win30', name:'Vinnarskalle', text:'Vinn 30 cupmatcher.', icon:'star', need:stat('wins'), goal:30 },
  { id:'clean', name:'Hållit nollan', text:'Vinn en match utan att släppa in något mål.', icon:'glove', need:stat('cleans'), goal:1 },
  { id:'margin', name:'Kanonmatch', text:'Vinn en match med fyra mål eller mer.', icon:'bolt', need:stat('margin'), goal:4 },
  { id:'double', name:'Dubbelsmäll', text:'Gör två mål med ett och samma kort.', icon:'zig', need:stat('multi'), goal:2 },
  { id:'pens', name:'Is i magen', text:'Vinn en straffläggning.', icon:'ball', need:stat('pensWon'), goal:1 },
  { id:'wall', name:'Muren står', text:'Stoppa ett superanfall helt med din mur.', icon:'wall', need:stat('supers'), goal:1 },
  { id:'vs', name:'Kompisduell', text:'Vinn en onlinematch mot en kompis.', icon:'head', need:stat('vsWins'), goal:1 },
  { id:'cup1', name:'Pokal i skåpet', text:'Vinn din första cup.', icon:'crown', need:stat('cups'), goal:1 },
  { id:'cup10', name:'Pokalsamlare', text:'Vinn 10 cuper.', icon:'crown', need:stat('cups'), goal:10 },
  { id:'pl', name:'Premier League-mästare', text:'Vinn Premier League på någon nivå.', icon:'crown', test:wonLeague('PL') },
  { id:'cl', name:'Europas bästa', text:'Vinn Champions League på någon nivå.', icon:'crown', test:wonLeague('CL') },
  { id:'sl', name:'Världsklubb', text:'Vinn Special League på någon nivå.', icon:'crown', test:wonLeague('SL') },
  { id:'hard', name:'Svårast av alla', text:'Vinn en cup på nivån Svår.', icon:'flag', test:s => LEAGUE_IDS.some(l => s.prog[l].won[2]) },
  { id:'right100', name:'Räknesnille', text:'Räkna 100 tal rätt.', icon:'pass', need:stat('right'), goal:100 },
  { id:'right1000', name:'Mattemaskin', text:'Räkna 1 000 tal rätt.', icon:'pass', need:stat('right'), goal:1000 },
  { id:'fast', name:'Blixtsnabb', text:'Svara snabbt och rätt 25 gånger i matcher.', icon:'bolt', need:stat('fast'), goal:25 },
  { id:'streak', name:'Tio i rad', text:'Svara rätt på tio tal i rad i en match.', icon:'star', need:stat('streak'), goal:10 },
  { id:'master', name:'Avsnittsmästare', text:'Nå full behärskning i fem avsnitt.', icon:'band',
    need:s => Object.values(s.skills).filter(k => k.box >= MASTER_BOX).length, goal:5 },
  { id:'cards', name:'Hela truppen', text:'Se alla kort utom legenderna.', icon:'shield',
    need:() => Object.keys(CARDS).filter(id => CARDS[id].r !== 'legend' && seenCards().has(id)).length, get goal(){ return Object.keys(CARDS).length - POOL.legend.length; } },
  { id:'legend', name:'Legendjägare', text:'Värva en legend.', icon:'crown', need:s => (s.legends || []).length, goal:1 },
  { id:'teams', name:'Scouten', text:'Möt 40 olika lag.', icon:'flag', need:() => seenCount('teams'), goal:40 },
  { id:'relics', name:'Fullt utrustad', text:'Se all utrustning.', icon:'glove', need:() => seenCount('relics'), get goal(){ return Object.keys(RELICS).length; } },
  { id:'treble', secret:true, name:'Trebeln 1999', text:'Vinn en cup i alla tre ligorna.', icon:'crown', test:s => LEAGUE_IDS.every(l => wonLeague(l)(s)) },
  { id:'fergie', secret:true, name:'Fergie-tid', text:'Avgör en match med mål i sista turen.', icon:'bolt', need:stat('fergie'), goal:1 },
  { id:'comeback', secret:true, name:'Vändningen', text:'Vinn efter att ha legat under med två mål.', icon:'heart', need:stat('comeback'), goal:1 },
  { id:'perfect', secret:true, name:'Perfekt match', text:'Vinn en match utan ett enda fel svar.', icon:'star', need:stat('perfect'), goal:1 },
  { id:'hattrick', secret:true, name:'Hattrick på ett kort', text:'Gör tre mål med ett enda kort.', icon:'ball', need:stat('multi'), goal:3 },
];

function trophyDone(t){ return t.test ? t.test(save) : t.need(save) >= t.goal; }
function trophyCount(){ return TROPHIES.filter(t => save.trophies[t.id]).length; }
function trophyFx(t){
  const d = document.createElement('div');
  d.className = 'trophyban' + (t.secret ? ' secret' : '');
  d.innerHTML = `<span class="ticon">${icon(t.icon)}</span><span><small>${t.secret ? 'Hemlig trofé!' : 'Ny trofé!'}</small><b>${t.name}</b></span>`;
  fx.appendChild(d); setTimeout(() => d.remove(), TROPHY_SHOW_MS);
  sfx('legend');
}
function checkTrophies(quiet){
  const got = save.trophies, fresh = TROPHIES.filter(t => !got[t.id] && trophyDone(t));
  if (!fresh.length) return;
  fresh.forEach(t => { got[t.id] = Date.now(); });
  persist();
  if (!quiet) fresh.forEach((t, i) => setTimeout(() => trophyFx(t), i * TROPHY_GAP_MS));
}
function trophyHTML(t){
  const on = !!save.trophies[t.id], hide = t.secret && !on, cur = t.need && Math.min(t.need(save), t.goal);
  const bar = !on && !hide && t.need && t.goal > 1 ? `<span class="tbar"><i style="width:${100 * cur / t.goal}%"></i></span><small class="tprog">${cur} / ${t.goal}</small>` : '';
  return `<div class="trophy${on ? ' on' : ''}${t.secret ? ' secret' : ''}">
    <span class="ticon">${hide ? '?' : icon(t.icon)}</span>
    <b>${hide ? 'Hemlig trofé' : t.name}</b>${hide ? '' : `<span class="ttext">${t.text}</span>`}${bar}
  </div>`;
}
function trophiesHTML(){
  const n = trophyCount();
  return `<section class="screen scroll"><div class="wrap">
    <header class="topbar"><button class="btn ghost" data-act="home">Meny</button><span class="tag">${n}/${TROPHIES.length} upplåsta</span></header>
    <div><p class="eyebrow">Troféskåpet</p><h2 class="h2">Troféer</h2></div>
    <div class="trophies">${TROPHIES.map(trophyHTML).join('')}</div>
  </div></section>`;
}

function bump(key){ save.stats[key] = (save.stats[key] || 0) + 1; }
function best(key, v){ save.stats[key] = Math.max(save.stats[key] || 0, v); }
function noteAnswer(ok, fast){
  if (ok && fast) bump('fast');
  best('streak', M.streak);
  if (M.vs) return;
  M.answered++;
  if (!ok) M.miss++;
}
function noteWin(){
  bump('wins');
  if (!M.oppGoals) bump('cleans');
  best('margin', M.myGoals - M.oppGoals);
  if (M.pens) bump('pensWon');
  if (M.behind >= COMEBACK_GOALS) bump('comeback');
  if (!M.pens && M.lastLead === false) bump('fergie');
  if (!M.miss && M.answered >= PERFECT_MIN_ANSWERS) bump('perfect');
}
