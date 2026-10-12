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
| `Esc` / `P` | pause menu (resume, retry, settings, boss select, title) |
| `M` | sound on/off |
| `F` | fullscreen |

On touch devices a D-pad and Z/X buttons appear under the canvas.

## How a fight works

The page is just the game: a 16:9 screen that fills the window. The **title screen** offers
BOSS RUSH, SURVIVAL and SETTINGS (music and sound-effect volume, sound on/off, screen shake,
fullscreen - all saved in the browser).

**Boss select** – `←` `→` switch between UNDERTALE and DELTARUNE, `↑` `↓` pick a boss, `Z` fights,
`X` goes back to the title.

**Undertale bosses** use Undertale's UI: `FIGHT` / `ACT` / `ITEM` / `MERCY`, you are just the SOUL.
**Deltarune bosses** use Deltarune's: `FIGHT` / `ACT` / `ITEM` / `SPARE` / `DEFEND`, Susie fights,
grazing bullets charges TP (for Rude Buster and TP-costing ACTs), `DEFEND` halves the next attack.

After winning: `Z` = back to the boss select (with the next boss highlighted), `X` = fight again.
After a GAME OVER: `Z` = retry immediately, `X` = boss select.

**Survival mode** (picked on the title screen) plays a boss' attacks back to back forever.

### SOUL modes and bullet colours

| Mode | Control |
| --- | --- |
| Red | moves freely |
| Blue | gravity; the key pointing away from the floor jumps (hold for higher). Can be slammed into walls and stand on platforms |
| Green | can't move; arrow keys turn the shield – block spears from the side they come from (yellow spears swap sides) |
| Yellow | moves and shoots with `Z`; in Deltarune hold and release `Z` for a BIG SHOT that breaks armoured targets |
| Purple | stuck on horizontal strings; `↑` `↓` hop between them |
| Split | two halves on three slots each: `A` `D` move the red half, `←` `→` the blue half; half-coloured circles let the matching half through |
| Plus | five spots of a plus-shaped board; arrows jump to an arm and back |

Cyan attacks only hurt you while you move, orange ones only while you stand still.
Flashing red areas are about to be hit. Sans' hits add KARMA, which drains HP over time
(but can never take the last point).

## Bosses

| Boss | Game | Signature mechanics implemented |
| --- | --- | --- |
| Training Dummy | Undertale – Ruins | warm-up shots; Talk to spare |
| Napstablook | Undertale – Ruins | falling tears, slowing tears; Cheer three times for the "dapper blook" |
| Toriel | Undertale – Ruins | fire waves, paw sweep with bouncing fire, fire helix, faltering fire that avoids you, can't kill you, spare her again and again |
| Doggo | Undertale – Snowdin | cyan sword sweeps (stand still); survive, then Pet; Stick |
| Dogamy & Dogaressa | Undertale – Snowdin | axes swinging into a heart, rings of hearts half cyan; Roll Around → Re-sniff → Pet; Stick |
| Greater Dog | Undertale – Snowdin | spear flickering cyan/white, little dog that barks when you move; Beckon → Pet → Play → Pet → Pet, or Ignore ×4; Stick |
| Papyrus | Undertale – Snowdin | red warm-up, then permanent blue SOUL, the blue attack, six scripted bone sequences, the "absolutely normal attack" (dog, COOL DUDE, skateboard), spares you after it, captures instead of killing |
| Shyren | Undertale – Waterfall | music notes that speed up with every Hum; Hum to spare (5 Hums end it) |
| Mad Dummy | Undertale – Waterfall | immune to FIGHT; dodged scribbles hit it, dummy lines, robot rockets, knife, Napstablook's rain |
| Undyne | Undertale – Waterfall | green SOUL shield vs. 4-way spears incl. reversing yellow spears, rising spears, spear volleys, speeds up every turn, Plead/Challenge, flee once the red phase starts |
| Royal Guards | Undertale – Hotland | team attacks from top and bottom; Clean Armor ×5, Whisper, spare |
| Muffet | Undertale – Hotland | purple SOUL on strings, spiders, boomerang croissants, bouncing donuts, three pet attacks with scrolling strings; Pay/Struggle; Spider Donut or enough turns to be let go |
| Mettaton EX | Undertale – CORE | RATINGS show, yellow SOUL shooting up, leg kicks, bombs with plus explosions vs. blocks, disco lasers, mini Mettatons, shoot his heart and legs off, lightning; 10000 ratings ends the show |
| Asgore | Undertale – Finale | MERCY destroyed, cyan/orange trident sweeps telegraphed by eye flashes, fire helix, fire clouds, spiralling rings, hand chasers, corner rings; lethal hits leave 1 HP |
| Omega Flowey | Undertale – Finale | huge board, X-bullets, eye triplets, flamethrowers, friendliness pellets, vines, mouth beam, flytrap, bombs, finger guns, dentata snakes, FILE 2 reloads; six SOUL segments (knives, gloves, ballet shoes, books, frying pans, gun) – ACT turns them into healing; panic, then FIGHT or MERCY |
| Asriel Dreemurr | Undertale – Finale | Star/Galacta Blazing, Shocker Breaker I/II, Chaos Saber/Slicer, Chaos Buster/Blaster, Hyper Goner vortex, "But it refused", STRUGGLE → SAVE the lost souls (their own attacks) → SAVE Asriel |
| Glad Dummy | Undertale – Genocide | spares you right away |
| Mettaton NEO | Undertale – Genocide | falls to a single hit |
| Undyne the Undying | Undertale – Genocide | faster green spears with more reversals, rotating spear rings, spear barrages, rising spears; keeps fighting at 0 HP with slowing spears, then melts |
| Sans | Undertale – Genocide | KARMA, opening attack, bone lines from both sides, cyan bones, three platform sections, beam cannons, gravity slams, false mercy trap, bones across the command buttons in the second half, final barrage, the special attack: push the board onto FIGHT once he dozes off |
| So Sorry | Undertale – optional | cyan/orange tail swings, crumpled paper, Doodlebogs; ends after 10 peaceful turns or 11 hits |
| Glyde | Undertale – optional | star waves and exploding "COOL" stars; Applaud ×2 then Nothing ×3 |
| Mad Mew Mew | Undertale – optional (Switch) | split SOUL (A/D + ←/→), half-coloured circles, cat bullets, plus-shaped board; immune until she calms down, Talk, then spare or attack |
| Lancer | Deltarune – Chapter 1 | bike wheelie charges, bike passes throwing spades; Warning/Compliment; leaves after 4 turns |
| K. Round | Deltarune – Chapter 1 | stomps on your position, star kicks, star stomps, falling stars; heals with almond milk; Bow / Deep Bow until the crown falls |
| King | Deltarune – Chapter 1 | scripted 15 turns: spade attack, swinging board, spade-tipped chains, spiked cage in a shrinking box, chained cage with heart marks; defense drops near the end |
| Sweet Cap'n Cakes | Deltarune – Chapter 2 | bullets fired on the beat (trailing circles, speaker notes that follow your height, waves); Dance / DanceX until all three dance |
| Berdly | Deltarune – Chapter 2 | tornado walls, fluttering A+ papers, spear blast trails; Bump / BumpX; spareable when tired |
| Spamton | Deltarune – Chapter 2 | money vacuum, Minitons, growing word bullets; spare by answering his DEAL correctly |
| Rouxls Kaard | Deltarune – Chapter 2 | the house game (Take House / Distract), falling boxes squash the board, Thrash Machine part attacks |
| Queen | Deltarune – Chapter 2 | stomps, exploding heads, lasers, Berdly's tornadoes, social media words, plug sparks on a sliding board, wine glass, ultimate pop-ups; acid shields (Toast), loosen Berdly's cable |
| GIGA Queen | Deltarune – Chapter 2 | punching match on a plus-shaped board: telegraphed punches, kicks, pirouette, acid light cone (duck), walls with a gap, baseballs to punch back; punch with Z/X while she's open; 3 rounds, final huge baseball; TurboDodge, SELF-FIX |
| Lanino & Elnina | Deltarune – Chapter 3 | forecast each turn, sun/moon vs. rain/snow from opposite sides that turn into hearts in the middle; ILoveTV, then choose a favourite who stays and gets stronger |
| Shuttah | Deltarune – Chapter 3 | drops that freeze on the photo flash, crossing drops, aimed diamonds; EasyPhoto / ToughPhoto timed viewfinder challenges, PowerPhoto, group photo ends it |
| Tenna | Deltarune – Chapter 3 | SCORE to 1000 (ILoveTV, S-Action, Bet, grazing, minigames), All-Star Cast with dark zones, Smash Cut lightning, Rimshot stars, minigames, FINAL EPISODE and DEFEAT TENNA |
| The Roaring Knight | Deltarune – Chapter 3 | 15-turn cycle: stars from a cone that turn red and burst (light beams show the shards), swords that shadow the SOUL and leave slashes (a breathing ring of swords in phase 2), box splitter (the board cracks open, fast/slow diamonds; the cut never kills), a tunnel of blades with a finisher, rotating slashes (1-2-2-3-3-4 lines…); below 80 % it charges and ROARS; HoldBreath |
| Jackenstein | Deltarune – Chapter 4 | dark mazes with solid walls and a light radius: key and treasure for TP, exit, pumpkin chasing you once you hold the key; LightUp; Unleash ×3 to spare; bullet rain afterwards |
| Old Man Gerson | Deltarune – Chapter 4 | falling axes, boomerangs, combined attack (uses the project's own sprite and music) |
| Sound of Justice | Deltarune – Chapter 4 | nine fixed attacks: green SOUL arrows from left/right/top (called out, later silent), then red SOUL hammer strikes on marked areas; can't be damaged, ends after the nine attacks or on OKHeal |
| Titan | Deltarune – Chapter 4 | darkness and the SOUL's light (purify white bullets into TP), shield halves damage, Unleash/Brighten, swarm, centipedes, hands, big shots; heals at half HP, the old man joins, DualBuster, Susie's Idea |
| Jevil | Deltarune – secret | 4 phases by HP or tiredness, suit bullets, spirals, bombs, scythes, carousel, CHAOS BOMB, FINAL CHAOS; Pirouette/Hypnosis tire him for a pacify |
| Spamton NEO | Deltarune – secret | yellow SOUL with BIG SHOT, flying heads, mail trucks, chained heart, pipis, gripping phones, eyes/nose/mouth, POWER OF NEO; Snap wires to spare |

The full roster (every major, optional and secret boss of both games) is listed in
`js/roster.js` and in the boss select screen.

## Art and music

- **Boss sprites** come from the sprite pack the project owner supplied ("UTDR Organized Sprite
  Archive"). `tools/build_sprites.py` turns it into one animated strip per boss
  (`assets/bosses/<id>/idle.png`, sometimes `hurt.png`); bosses the game assembles from parts
  (Sans, Undyne, Asgore, Mettaton EX, Tenna, Titan…) are composited from those parts.
- **Music** comes from the supplied soundtrack pack, converted to MP3 in `assets/music/`
  (`tools/gen_manifest.py` maps each boss to its track). Bosses whose track wasn't in the pack
  (Sans, Undyne, Muffet, Mettaton EX, Asgore, Asriel…) play their original chiptune song from
  `js/songs.js` until a file is added.
- Bosses without a sprite (Mad Mew Mew) show an animated sigil (`js/presence.js`).
- Projectiles are drawn in code; the fonts are DotGothic16 and Pixelify Sans (SIL OFL).

UNDERTALE and DELTARUNE belong to Toby Fox. Deltatale is a non-commercial fan project.

To add or change art and music, put the files in `assets/bosses/<boss id>/` (or `assets/music/`)
and list them in `assets/bosses/manifest.js`:

```js
const BOSS_ASSETS = {
  toriel: { sprite: 'idle.png', frames: 1, scale: 1.5, hurt: 'hurt.png', music: 'assets/music/heartache.mp3' },
};
```

A sprite is a horizontal strip of equally wide frames. Only listed files are requested. To rebuild
everything from the packs: `SPRITE_ARCHIVE="/path/to/UTDR Orgranized Sprite Archive" python3
tools/build_sprites.py && python3 tools/gen_manifest.py`.

## Structure

```
index.html            page, controls, script order
style.css             page and touch-control styles
assets/bosses/        per-boss sprites + manifest.js (sprites and music per boss)
assets/music/         music tracks
tools/                scripts that build the sprites and the manifest from the packs
js/config.js          canvas, layout, bullet board (setArena)
js/storage.js         safe localStorage, records and settings
js/input.js           keyboard and touch input (held and pressed keys)
js/audio.js           synthesized sound effects, volume buses, music playback
js/music.js           the chiptune sequencer (tracker strings, generated leads, drums)
js/songs.js           the original songs, one per boss plus the menu
js/textbox.js         word wrap and typewriter text
js/bosses.js          boss registry and the full boss interface description
js/bossart.js         boss sprites from the manifest, emblems, shared projectile shapes
js/presence.js        the animated boss sigils
js/roster.js          the complete Undertale + Deltarune roster
js/items.js           healing items per game
js/state.js           game state, start/reset/end, survival mode
js/soul.js            SOUL modes (red, blue, green, yellow, purple, split, plus), shots, KARMA, solid walls
js/bullets.js         bullets, hitboxes, colours, damage, graze, shield blocks
js/patterns.js        shared attack building blocks (every, timeline, bones, beams, rings…)
js/effects.js         shake, flash, popups, slashes, particles
js/hud.js             battle UI for both games
js/render.js          scene and bullet drawing
js/menu.js            boss select screen
js/screens.js         title screen, settings, pause menu
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
- `deltatale_settings` – last boss, mode, sound, volumes and screen shake.
