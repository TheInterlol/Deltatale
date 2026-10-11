# Deltatale

Bitevní demo ve stylu Undertale/Deltarune v čistém HTML5 canvasu – bez frameworků a bez build kroku.
Susie čelí pěti bossům buď v **tahové bitvě** (ÚTOK / AKCE / VĚCI / UŠETŘIT / OBRANA), nebo v režimu
**přežití**, kde se jen uhýbá a sbírají se rekordy.

## Spuštění

Stačí otevřít `index.html` v prohlížeči. Případně přes lokální server:

```bash
npm start            # http://localhost:8080 (bez závislostí, jen Node)
```

## Ovládání

| Klávesa | Akce |
| --- | --- |
| `WASD` / šipky | pohyb srdce, výběr v menu |
| `Z` / `Enter` / mezerník | potvrdit, spustit hru |
| `X` / `Shift` | zpět z podmenu |
| `Esc` / `P` | pauza (hra se pozastaví i při přepnutí panelu) |
| `M` | zvuk zap/vyp |

Na dotykových zařízeních se pod plátnem objeví D-pad a tlačítka Z/X.

## Herní režimy

**Bitva (tahová)** – každé kolo vybereš příkaz:

- **ÚTOK** – zastav kurzor co nejblíž středu terče; perfektní zásah dává bonus.
- **AKCE** – *Prověřit* ukáže statistiky, akce konkrétního bosse zvyšují **MILOST**.
  *Rude Buster* je silné kouzlo za 50 % TP.
- **VĚCI** – léčivé předměty (inventář se doplní každou bitvu).
- **UŠETŘIT** – funguje, když je MILOST 100 % (jméno bosse zežloutne).
- **OBRANA** – příští útok ubere polovinu HP a přidá TP.

Pak boss promluví a zaútočí – srdce uhýbá v aréně. Těsné míjení střel (*graze*) nabíjí TP.
Útoky jdou podle časové osy bosse a s každým dalším kolem (a při nízkém HP bosse) zrychlují.
Bitva končí poražením bosse, ušetřením, nebo GAME OVER (Z = znovu, X = zpět).

**Přežití (na čas)** – původní režim: bez menu, každý zásah ubere 1 HP, ukládá se nejlepší čas.

## Bossové

| Boss | HP | Útoky v bitvě |
| --- | --- | --- |
| Training Dummy | 60 | střely ze všech stran, rychlá palba |
| Bone Rain | 200 | kostěný déšť, kostěné zdi s mezerou, kombinace |
| Jevil-ish Cards | 260 | rozhoz karet, kývající se vějíř, svírající se kruh |
| Spamton-ish Blasters | 240 | boční palba, mířené střely, křížová palba |
| Old Man Gerson | 400 | padající sekery, bumerangy, Kladivo spravedlnosti (+ hudba) |

## Struktura

```
index.html          stránka, ovládací prvky, pořadí skriptů
style.css           vzhled stránky a dotykového ovládání
js/config.js        canvas, DOM prvky, rozložení plátna, sprity a hudba
js/storage.js       bezpečný localStorage, rekordy a nastavení
js/input.js         klávesnice a dotyková tlačítka (držené i zmáčknuté klávesy)
js/audio.js         syntetizované zvukové efekty, správa hudby, ztlumení
js/state.js         herní stav, start/reset/konec hry, pauza
js/player.js        pohyb srdce
js/bullets.js       střely, kolize, poškození, graze
js/patterns.js      sdílené vzory střel a pomocník every() pro časovou osu útoků
js/effects.js       otřesy, záblesky, plovoucí čísla, seky
js/textbox.js       zalamování textu a postupné vypisování
js/items.js         léčivé předměty
js/bosses.js        registr bossů a popis jejich rozhraní
js/hud.js           rozhraní bitvy (panel Susie, příkazy, TP, bublina, překryvy)
js/render.js        kreslení scény
js/battle.js        stavový automat tahové bitvy
js/game.js          herní smyčka (updateGame + render)
bosses/*.js         jeden soubor na bosse
tests/              automatické testy (Playwright) a statický server
```

## Jak přidat bosse

1. Vytvoř `bosses/muj-boss.js` a zaregistruj ho přes `registerBoss({...})` – vzorem je
   `bosses/dummy.js`, celé rozhraní je popsané v `js/bosses.js`.
2. Přidej `<script src="bosses/muj-boss.js">` do `index.html` (před `js/game.js`)
   a `<option value="...">` do `#bossSelect` – `name` bosse musí odpovídat textu volby.
3. Útok v bitvě je `{ name, duration, update(run) }`. Pro pravidelné střílení použij
   `every(run, 'klic', interval, () => spawnNeco(run.speed))`; `run.speed` roste s koly.
4. Spusť `npm test` – testy samy zkontrolují, že boss má kompletní data, že se všechny jeho
   texty vejdou do boxu i bubliny a že každý jeho útok doběhne až do konce.

## Testy

```bash
npm install
npx playwright install chromium
npm test
```

Testy běží v headless Chromiu přes vestavěný `node:test`. Většina z nich vypne vlastní herní
smyčku a krokuje hru přes `updateGame(dt)`, takže výsledky nezávisí na rychlosti stroje.

## Ukládání

Vše je v `localStorage` prohlížeče a hra funguje i bez něj:

- `battle_best_<boss>` – nejlepší čas v režimu přežití (původní formát klíče),
- `deltatale_records` – výsledky bitev (poražen / ušetřen / nejméně kol),
- `deltatale_settings` – poslední boss, režim a ztlumení zvuku.
