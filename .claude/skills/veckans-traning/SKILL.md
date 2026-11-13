---
name: veckans-traning
description: Sätter veckans träning i United Mattecup utifrån en beskrivning av vad barnet övar på i skolan den här veckan (t.ex. "kort division, kapitel 2.4"). Används när användaren beskriver veckans matte, nämner ett kapitel eller avsnitt som ska övas, eller ber om att byta veckans träning.
---

# Veckans träning

Användaren beskriver med egna ord vad som övas i skolan den här veckan. Du översätter det till avsnitt i spelet och skriver in dem i `veckoplan.js`.

## 1. Hitta avsnitten

- Läs avsnittslistan: `grep -n "{ code:'" curriculum.js`. Varje avsnitt har en `code` (A = Alfa/åk 4, B = Beta/åk 5, G = Gamma/åk 6) och ett `name`.
- "Kapitel 2.4" motsvarar koden `X2.4` i den bok barnet läser. Barnet går i **åk 4 (Alfa)** om inget annat sägs. Om koden och namnet inte stämmer med beskrivningen, eller om samma ämne finns i flera böcker (t.ex. Kort division i A2.4 och B4.3), välj det som passar beskrivningen bäst och **flagga valet** i svaret.
- Det får vara 1–4 avsnitt. Talen turas om mellan avsnitten.
- Om inget avsnitt passar: säg det och föreslå närmaste. Hitta inte på nya koder.

## 2. Skriv `veckoplan.js`

Skriv om hela filen, så här:

```js
'use strict';
const WEEK_PLAN = {
  id:'2026-v46',
  week:46,
  topic:'Kort division',
  sections:['A2.4'],
};
```

- `week`: ISO-veckonumret för dagens datum (veckan börjar på måndag). Kontrollräkna, t.ex. med `node -e "const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+3-(d.getDay()+6)%7);const w=new Date(d.getFullYear(),0,4);console.log(d.getFullYear(),1+Math.round(((d-w)/864e5-3+(w.getDay()+6)%7)/7))"`.
- `id`: `ÅÅÅÅ-vVV`, t.ex. `2026-v46`. Ett nytt `id` nollställer barnets antal pass. Behåll därför samma `id` om veckan inte har bytts (t.ex. när du bara rättar ämnet).
- `topic`: kort rubrik på svenska som barnet ser, högst cirka 25 tecken.
- `sections`: koderna från steg 1.

## 3. Verifiera

```bash
cd tests && node weekly.js
```

Allt ska vara `OK`. Titta på `tests/out/weekly_title_1180.png` och `tests/out/mob/weekly_title_360.png` så att rubriken ryms.

## 4. Svara kort

- Vilka avsnitt som valdes (kod och namn), vecka och rubrik.
- Flaggade beslut.
- Fråga om du ska committa och pusha (Vercel bygger från GitHub). Påminn om att `veckoplan.js` också ska kopieras till Synology.

## Så fungerar läget i spelet

`veckans.js`: knappen Veckans träning på startsidan ger 10 tal ur veckans avsnitt, med svårigheten Brons, Brons, Brons, Silver, Silver, Guld, Guld, Guld, Stjärna, Stjärna. Antal pass och bästa resultat sparas i `save.weekly` per `id`, och syns under För vuxna. Knappen döljs om planen saknar giltiga avsnitt.
