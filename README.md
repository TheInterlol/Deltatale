# Deltatale

A fan-made **Undertale / Deltarune boss rush** in plain HTML5 canvas – no frameworks, no build step.

> "I loved fighting this boss and I want to fight them again immediately."

Pick a boss, fight it, and retry instantly. Each boss recreates the mechanics of its original
encounter: its SOUL mode, attack patterns, phases, ACTs and how the fight ends.

Deltatale is an unofficial fan project and is not affiliated with Toby Fox or the official games.

## Running

Open `index.html` in a browser, or use the tiny local server:

```bash
npm start            # http://localhost:8080 (no dependencies, just Node)
```

## Controls

| Key | Action |
| --- | --- |
| `WASD` / arrows | move the SOUL, navigate menus |
| `Z` / `Enter` / `Space` | confirm, start a fight, shoot (yellow SOUL) |
| `X` / `Shift` | back, boss select |
| `Esc` / `P` | pause (X in the pause screen quits to the boss select) |
| `M` | sound on/off |

On touch devices a D-pad and Z/X buttons appear under the canvas.

## How a fight works

**Boss select** – `←` `→` switch between UNDERTALE and DELTARUNE, `↑` `↓` pick a boss, `Z` fights.
Bosses that aren't implemented yet are listed as *coming soon*.

**Undertale bosses** use Undertale's UI: `FIGHT` / `ACT` / `ITEM` / `MERCY`, you are just the SOUL.
**Deltarune bosses** use Deltarune's: `FIGHT` / `ACT` / `ITEM` / `SPARE` / `DEFEND`, Susie fights,
grazing bullets charges TP (for Rude Buster and TP-costing ACTs), `DEFEND` halves the next attack.

After winning: `Z` = back to the boss select (with the next boss highlighted), `X` = fight again.
After a GAME OVER: `Z` = retry immediately, `X` = boss select.

**Survival mode** (mode selector under the canvas) plays a boss' attacks back to back forever.

### SOUL modes and bullet colours

| Mode | Control |
| --- | --- |
| Red | moves freely |
| Blue | gravity; the key pointing away from the floor jumps (hold for higher). Can be slammed into walls and stand on platforms |
| Green | can't move; arrow keys turn the shield – block spears from the side they come from (yellow spears swap sides) |
| Yellow | moves and shoots with `Z`; in Deltarune hold and release `Z` for a BIG SHOT that breaks armoured targets |
| Purple | stuck on horizontal strings; `↑` `↓` hop between them |

Cyan attacks only hurt you while you move, orange ones only while you stand still.
Flashing red areas are about to be hit. Sans' hits add KARMA, which drains HP over time
(but can never take the last point).

## Bosses

| Boss | Game | Signature mechanics implemented |
| --- | --- | --- |
| Training Dummy | Undertale – Ruins | warm-up shots; Talk to spare |
| Napstablook | Undertale – Ruins | falling tears, slowing tears; Cheer three times for the "dapper blook" |
| Toriel | Undertale – Ruins | fire waves, paw sweep with bouncing fire, fire helix, faltering fire that avoids you, can't kill you, spare her again and again |
| Papyrus | Undertale – Snowdin | red warm-up, then permanent blue SOUL, the blue attack, six scripted bone sequences, the "absolutely normal attack" (dog, COOL DUDE, skateboard), spares you after it, captures instead of killing |
| Mad Dummy | Undertale – Waterfall | immune to FIGHT; dodged scribbles hit it, dummy lines, robot rockets, knife, Napstablook's rain |
| Undyne | Undertale – Waterfall | green SOUL shield vs. 4-way spears incl. reversing yellow spears, rising spears, spear volleys, speeds up every turn, Plead/Challenge, flee once the red phase starts |
| Muffet | Undertale – Hotland | purple SOUL on strings, spiders, boomerang croissants, bouncing donuts, three pet attacks with scrolling strings; Pay/Struggle; Spider Donut or enough turns to be let go |
| Mettaton EX | Undertale – CORE | RATINGS show, yellow SOUL shooting up, leg kicks, bombs with plus explosions vs. blocks, disco lasers, mini Mettatons, shoot his heart and legs off, lightning; 10000 ratings ends the show |
| Asgore | Undertale – Finale | MERCY destroyed, cyan/orange trident sweeps telegraphed by eye flashes, fire helix, fire clouds, spiralling rings, hand chasers, corner rings; lethal hits leave 1 HP |
| Asriel Dreemurr | Undertale – Finale | Star/Galacta Blazing, Shocker Breaker I/II, Chaos Saber/Slicer, Chaos Buster/Blaster, Hyper Goner vortex, "But it refused", STRUGGLE → SAVE the lost souls (their own attacks) → SAVE Asriel |
| Undyne the Undying | Undertale – Genocide | faster green spears with more reversals, rotating spear rings, spear barrages, rising spears; keeps fighting at 0 HP with slowing spears, then melts |
| Sans | Undertale – Genocide | KARMA, opening attack, bone lines, cyan bones, platforms over bones, beam cannons, gravity slams, false mercy trap, final barrage, falls asleep – only then can be hit |
| Lancer | Deltarune – Chapter 1 | bike wheelie charges, bike passes throwing spades; Warning/Compliment; leaves after 4 turns |
| K. Round | Deltarune – Chapter 1 | stomps on your position, star kicks, star stomps, falling stars; heals with almond milk; Bow / Deep Bow until the crown falls |
| King | Deltarune – Chapter 1 | scripted 15 turns: spade attack, swinging board, spade-tipped chains, spiked cage in a shrinking box, chained cage with heart marks; defense drops near the end |
| Berdly | Deltarune – Chapter 2 | tornado walls, fluttering A+ papers, spear blast trails; Bump / BumpX; spareable when tired |
| Spamton | Deltarune – Chapter 2 | money vacuum, Minitons, growing word bullets; spare by answering his DEAL correctly |
| Rouxls Kaard | Deltarune – Chapter 2 | the house game (Take House / Distract), falling boxes squash the board, Thrash Machine part attacks |
| Queen | Deltarune – Chapter 2 | stomps, exploding heads, lasers, Berdly's tornadoes, social media words, plug sparks on a sliding board, wine glass, ultimate pop-ups; acid shields (Toast), loosen Berdly's cable |
| Old Man Gerson | Deltarune – Chapter 4 | falling axes, boomerangs, combined attack (uses the project's own sprite and music) |
| Jevil | Deltarune – secret | 4 phases by HP or tiredness, suit bullets, spirals, bombs, scythes, carousel, CHAOS BOMB, FINAL CHAOS; Pirouette/Hypnosis tire him for a pacify |
| Spamton NEO | Deltarune – secret | yellow SOUL with BIG SHOT, flying heads, mail trucks, chained heart, pipis, gripping phones, eyes/nose/mouth, POWER OF NEO; Snap wires to spare |

The full roster (every major, optional and secret boss of both games) is listed in
`js/roster.js` and in the boss select screen.

## Art and music

The repository only ships the project's own Susie/Gerson sprites and Gerson's music. Every
other boss is drawn as a **placeholder card** (its name and a small generic emblem) until you
give it art – the projectiles (bones, spears, fire, cards…) are drawn in code.

To add art or music for a boss, put the files in `assets/bosses/<boss id>/` and list them in
`assets/bosses/manifest.js`:

```js
const BOSS_ASSETS = {
  toriel: { sprite: 'idle.png', frames: 1, scale: 2, music: 'music.mp3' },
};
```

A sprite is a horizontal strip of equally wide frames. Only listed files are requested.

## Structure

```
index.html            page, controls, script order
style.css             page and touch-control styles
assets/bosses/        per-boss art/music slots + manifest.js
js/config.js          canvas, layout, bullet board (setArena)
js/storage.js         safe localStorage, records and settings
js/input.js           keyboard and touch input (held and pressed keys)
js/audio.js           synthesized sound effects, music, mute
js/textbox.js         word wrap and typewriter text
js/bosses.js          boss registry and the full boss interface description
js/bossart.js         boss sprites/placeholders, shared projectile shapes
js/roster.js          the complete Undertale + Deltarune roster
js/items.js           healing items per game
js/state.js           game state, start/reset/end, survival mode
js/soul.js            SOUL modes (red, blue, green, yellow, purple), shots, KARMA
js/bullets.js         bullets, hitboxes, colours, damage, graze, shield blocks
js/patterns.js        shared attack building blocks (every, timeline, bones, beams, rings…)
js/effects.js         shake, flash, popups, slashes, particles
js/hud.js             battle UI for both games
js/render.js          scene and bullet drawing
js/menu.js            boss select screen
js/battle.js          the turn-based battle state machine and attack runner
js/game.js            game loop
bosses/*.js           one file per boss
tests/                automated tests (Playwright) and a static server
```

## Adding a boss

1. Create `bosses/<id>.js` and call `registerBoss({...})` – the interface (stats, texts, ACTs,
   attacks, phases via `chooseAttack`, hooks like `onSpare`, `onFight`, `onLethal`…) is described
   at the top of `js/bosses.js`. The id must match its entry in `js/roster.js`.
2. Add `<script src="bosses/<id>.js">` to `index.html` (before `js/game.js`).
3. An attack is `{ name, duration, box: { w, h }, soul: 'blue', start(run), update(run, dt) }`.
   Build patterns from `every()`, `timeline()`, `floorBone()`, `warnZone()`, `spawnBeam()`,
   `spawnRing()`… in `js/patterns.js`. Custom bullet looks go into `BULLET_DRAWERS`.
4. Run `npm test` – the tests run every attack of every boss to the end, and check that every
   boss can hurt you, kill you, be retried and be beaten.

## Tests

```bash
npm install
npx playwright install chromium
npm test
```

The tests run in headless Chromium with the built-in `node:test`. Most of them switch off the
real game loop and step the game with `updateGame(dt)`, so results don't depend on machine speed.

## Saving

Everything lives in the browser's `localStorage`, and the game works without it:

- `battle_best_<boss>` – best survival time (original key format),
- `deltatale_records` – battle results (defeated / spared / fewest turns),
- `deltatale_settings` – last boss, mode and mute.
