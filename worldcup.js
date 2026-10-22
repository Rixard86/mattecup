/* =========================================================
   UNITED MATTECUP – World Cup
   Landslag och bara en nivå. Spelaren väljer själv vilket avsnitt
   i Matematik Alfa, Beta eller Gamma som hela cupen övar på.
   Cupens nivå (R.level) är avsnittets plats i CURRICULUM, se WORLD_CUP
   i curriculum.js. Laddas före spelets skript.
   ========================================================= */
'use strict';
let wcTab = LEAGUE_DEFS[0].id;

function wcCardHTML(){
  const W = WORLD_CUP;
  return `<article class="league wc" style="--lc:${W.color};--la:${W.accent}">
    <header><p class="eyebrow">${W.grade} · ${TEAMS[W.id].length} landslag</p><h3>${W.name}</h3></header>
    <div class="lvls"><button class="lvl" data-act="wcPick">
      <span class="lvtop"><b>Välj avsnitt</b></span>
      <span class="lvtopics">Öva på ett avsnitt du väljer själv i Alfa, Beta eller Gamma.</span>
      <span class="lvstate">Spela</span>
    </button></div>
  </article>`;
}
function wcSectionHTML(sc){
  const box = save.skills[sc.code].box, dots = Array.from({ length:MASTER_BOX }, (_, i) => `<i class="${i < box ? 'on' : ''}"></i>`).join('');
  return `<button class="sec" data-act="startLeague" data-l="${WORLD_CUP.id}" data-v="${CURRICULUM.indexOf(sc)}"><span class="scode">${secLabel(sc.code)}</span><span class="sname">${sc.name}</span><span class="mast">${dots}</span></button>`;
}
function wcPickHTML(){
  const L = leagueOf(wcTab), secs = L.levels.flatMap((lv, i) => levelSections(L.id, i));
  const tabs = LEAGUE_DEFS.map(x => `<button class="tab${x.id === wcTab ? ' on' : ''}" role="tab" aria-selected="${x.id === wcTab}" data-act="wcBook" data-l="${x.id}">${x.book} <small>${x.grade}</small></button>`).join('');
  return `<section class="screen scroll"><div class="wrap">
    <header class="topbar"><button class="btn ghost" data-act="leagues">Tillbaka</button></header>
    <div><p class="eyebrow">${WORLD_CUP.name} · ${TEAMS[WORLD_CUP.id].length} landslag</p><h2 class="h2">Välj avsnitt</h2></div>
    <p class="muted">Alla tal i cupen kommer från avsnittet du väljer. Korten bestämmer hur svåra talen blir.</p>
    <div class="tabs" role="tablist">${tabs}</div>
    <div class="panelbox"><h3>Matematik ${L.book}</h3><div class="seclist">${secs.map(wcSectionHTML).join('')}</div></div>
  </div></section>`;
}
