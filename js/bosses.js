// Registr bossů. Každý boss žije ve vlastním souboru v bosses/ a zaregistruje se přes registerBoss().
//
// Rozhraní bosse:
//   id, name            id odpovídá hodnotě v <select id="bossSelect">
//   init(), update(dt)  režim Přežití - nekonečný vzor střel (původní API)
//   draw(x, y, t)       vykreslení se středem v (x, y); t = čas v sekundách
//   animate(dt)         volitelné - animace spritu
//   music               volitelné - Audio, které hraje během boje
//
//   Režim Bitva:
//   maxHp, attack, defense, gold
//   check               popis pro AKCE > Prověřit
//   intro               úvodní text bitvy
//   flavor[]            texty v menu mezi koly, lowHpFlavor když bossovi dochází HP
//   dialogue[]          repliky v bublině před každým útokem
//   acts[]              { name, mercy, repeatMercy?, text, repeatText?, effect?(battle) }
//   attacks[]           časová osa útoků: { name, duration, start?(run), update(run, dt) }
//                       run = { t, dt, timers, data, speed, level } - viz every() v patterns.js
const BOSSES = {};

function registerBoss(boss) {
  BOSSES[boss.id] = boss;
  return boss;
}

function getBoss(id) {
  return BOSSES[id] || null;
}

// -------------- Pomocné kreslení pro bossy bez spritu --------
function fillRoundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function fillCircle(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
