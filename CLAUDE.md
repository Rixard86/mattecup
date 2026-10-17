# United Mattecup

Mattespel i webbläsaren för en 10-åring som älskar fotboll och Manchester United. Det är en roguelite deckbuilder i arkadstil där varje spelat kort kräver att ett mattetal räknas. Uppgifterna följer Matematik Alfa, Beta och Gamma samt MatematikXYZ:s filmer.

Spelet är privat, för en familj. Det spelas främst på **iPad**, även på mobil.

## Viktiga regler

- **All text i spelet är på svenska.** Kommentarer i koden är också på svenska.
- **Inget byggsteg och inga beroenden i spelet.** Det är rena statiska filer. Inga CDN:er: typsnitten (Bungee, Nunito) ligger i `fonts/`. Allt utom onlinematchen ska fungera offline.
- **Ändra inte iPad-utseendet** när du anpassar för mobil. Mobilregler finns bara i två mediefrågor i slutet av CSS:en:
  - `(max-width:540px)` för telefon på höjden.
  - `(max-height:500px) and (orientation:landscape)` för telefon på bredden.

  Den minsta iPaden är 744 × 744 px eller större, så ingen av dem slår till där.
- **Bungee-rubriker:** Å, Ä och Ö når 0,97 em över baslinjen. Använd radhöjd minst 1,22 och marginal under `.eyebrow`, annars krockar texten.
- **Namn från kompismatchen visas för andra spelare.** Kör dem genom `vsClean()` och `esc()`. Servern sanerar också.
- **Spellogik ska valideras med simulering** innan den levereras (se Tester). Ange tydligt vad som behöver provas på riktig iPad.
- **Användaren vill:**
  - korta svar
  - beslut tydligt flaggade
  - kompletta filer eller zip att släppa in, inte patchar

## Filer

| Fil | Innehåll |
|---|---|
| `index.html` | Hela spelet: CSS, data (`CARDS`, `POOL`, `RELICS`, `LINEUP`), match, plan, straffar, skärmar, kompismatch |
| `curriculum.js` | 91 avsnitt (A/B/G), `gen(d)` med d = 1–4 (Brons, Silver, Guld, Stjärna), `makeProblem`, `checkAnswer`, `solveSteps`. Exporteras även för node. |
| `teams.js` | Lag per liga från svagast till starkast, `drawCup()`. Special League: alla lag i Allsvenskan och 32 världsklubbar, `SWE_TWO_CHANCE` |
| `api/vs.js` | Vercel Function (Node, CommonJS) för kompismatch, ett relä mot Upstash Redis REST |
| `online-config.js` | `window.VS_API`. Tom betyder samma adress som spelet (Vercel). På Synology anges Vercel-adressen här. |
| `LÄS-MIG.txt` | Installation på Synology och Vercel, för användaren |
| `tests/` | Tester och simuleringar. Följer inte med ut till Vercel (`.vercelignore`). |

## Arkitektur i `index.html`

- **Globala tillstånd:**
  - `save`: localStorage-nyckeln `unitedMattecup.v2`.
  - `R`: pågående cup. Har `R.vs = true` i kompismatch.
  - `M`: pågående match. Har `M.vs = true` i kompismatch.
  - `P`: öppet mattetal.
  - `screen`: aktuell skärm.
- **Visning:** `render()` sätter `app.innerHTML = SCREENS[screen]()`. Klick går via `data-act` till objektet `ACT`. `go(skärm)` byter skärm.
- **Planen:**
  - Canvas-motorn `F` med steg (`ST.pass`, `carry`, `tackle` osv.).
  - `fieldCard` animerar ett kort och `fieldEnemy` motståndarens drag.
  - Effekter: `burst`, `ring`, `bolt` och superanfallet (`superStart`/`superKick`/`superImpact`).
- **Straffar:** egen canvas `PV`, med funktionerna `penAim`, `penShootUs` och `penDive`.
- **Mattetal:** `openProblem(o)` → `renderProblem()` → `submitProblem()` → `o.onDone({ correct, fast })`. `record()` sköter utspridd repetition med 5 lådor per avsnitt.
- **Kort:** rätt svar ger full effekt, fel svar halv. Snabbt rätt svar ger +2 och tre rätt i rad ger publikbonus. `applyCard` räknar effekten.
- **Sällsynthet** (`r`): start, vanlig, sällsynt, episk, legendarisk.
  - Episka kort har lila holo-ram.
  - Legendariska kort är sex United-legender i svart och guld, ungefär var femte cup.
  - `save.legends` är samlingen och `noteLegend()` lägger till.

## Balans (beslutad med användaren)

- Motståndarens drag kommer från `rollIntent()`. Anfall: `rnd(3+2s, 6+3s)` per omgång s = 0–5.
- I finalen är vanliga anfall 11–15, och superanfallet 18–22 kommer var tredje tur. Superanfallet ska alltid vara starkast.
- Mål kräver `12 + 2s` målchans för United och 12 för motståndaren.
- Simulerat: en smart spelare med 85 % rätt vinner cirka 83 % av cuperna (`tests/sim-balance.js`).

## Kompismatch (VS)

- **Samtidiga turer:** varje spelare skickar `{atk, mur}` per tur. Båda enheterna räknar samma resultat med `vsTally(n)`: anfall minus kompisens mur, 12 = mål.
- **Redis** (TTL 3 h):
  - `vs:KOD:s0|s1`: platser med token, skapade med SET NX.
  - `vs:KOD:p0|p1`: varje spelares framsteg.
  - `vs:KOD:h0|h1`: när spelaren senast hördes av.

  Varje spelare skriver bara sina egna nycklar.
- **Klienten** frågar efter nytt läge var 1,2–2,5 s och skickar POST med `text/plain`, så ingen CORS-preflight behövs.
- **Spegeldraft:** `vsPacks(code)` med seedad RNG ger båda samma val i fyra omgångar. Stjärnvalet kan med 10 % chans innehålla en legend.
- **Robusthet:** spelet kan återansluta och spela vidare via localStorage `unitedMattecup.vs`. Lämnar en spelare vinner den andra på walkover.

## Tester (`tests/`)

```bash
cd tests
npm install
npx playwright install chromium
npm test             # mattetalen, alla avsnitt i UI, superanfall, mobil, kompismatch med två spelare
npm run test:cup     # hela cuper i alla tre ligorna (tar några minuter)
npm run sim:balance  # cupvinst per strategi och träffsäkerhet
npm run sim:vs       # balans i kompismatch
npm run dev          # lokal server på http://127.0.0.1:8787 med falsk Upstash, för att prova kompismatch i två flikar
```

Skärmbilder hamnar i `tests/out/`. `sim-curriculum.js` ska visa `issues: 0`.

## Driftsättning

- **Synology:** kopiera mappen till `web/mattecup/`.
- **Vercel:** importera repot med framework "Other" och utan byggsteg. Lägg till Upstash for Redis under Storage, så sätts `KV_REST_API_URL`/`KV_REST_API_TOKEN`.
