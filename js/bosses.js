// Boss registry + the full Undertale / Deltarune roster shown on the boss select screen.
//
// A boss file calls registerBoss({...}). Fields (all optional except id/name/game):
//   id, name, game ('undertale' | 'deltarune'), party (preset in js/party.js), items
//   hp, def, damage (default damage per hit), invuln (UT i-frames), karma (Sans' KR)
//   gold, exp, music (Audio), voice (bubble text pitch)
//   intro, flavor[] | flavorText(battle), check (ACT > Check text)
//   acts: [{ name, tp, members: ['susie'], description, run(battle, member) -> text | text[] }]
//   attacks: { key: { soul, soulOptions, box: {w,h,...} | fn(battle), duration, damage,
//                     start(run), update(run, dt), end(run) } }
//   sequence: [keys] played in order, then loop: [keys] repeated (or nextAttack(battle))
//   dialogue(battle, attackKey) -> line(s) said before the attack (or attack.dialogue)
//   bubble: { x, y, w } speech bubble placement
//   draw(x, y, t, battle): the boss art, centred on (x, y)
//   hooks: setup, opening, onFight, onEnemyDamaged, onSpare, onFlee, onTurnEnd,
//          onEnemyDefeated, beforePlayerDamage, onPlayerZeroHp, canFlee
//
// An attack's `run` gives: t, dt, data, battle, speed, every(key, interval, fn, firstDelay),
// at(time, fn), finish().
const BOSSES = {};

function registerBoss(def) {
  const boss = Object.assign({
    game: 'undertale',
    party: def.game === 'deltarune' ? 'dr-ch1' : 'ut-lv1',
    items: [],
    hp: 100,
    def: 0,
    damage: 3,
    gold: 0,
    exp: 0,
    voice: 1,
    flavor: [],
    acts: [],
    attacks: {},
    sequence: [],
    loop: null
  }, def);
  if (!boss.intro) boss.intro = `* ${boss.name} attacks!`;
  BOSSES[boss.id] = boss;
  return boss;
}

function getBoss(id) {
  return BOSSES[id] || null;
}

// The researched roster. Entries without a registered boss show as "not implemented yet".
const ROSTER = [
  {
    game: 'undertale',
    title: 'UNDERTALE',
    sections: [
      { name: 'Ruins', bosses: [
        { id: 'toriel', name: 'Toriel', kind: 'Boss' },
        { id: 'napstablook', name: 'Napstablook', kind: 'Mini-boss' }
      ] },
      { name: 'Snowdin', bosses: [
        { id: 'doggo', name: 'Doggo', kind: 'Mini-boss' },
        { id: 'dogamy-dogaressa', name: 'Dogamy & Dogaressa', kind: 'Mini-boss' },
        { id: 'greater-dog', name: 'Greater Dog', kind: 'Mini-boss' },
        { id: 'papyrus', name: 'Papyrus', kind: 'Boss' }
      ] },
      { name: 'Waterfall', bosses: [
        { id: 'shyren', name: 'Shyren', kind: 'Mini-boss' },
        { id: 'mad-dummy', name: 'Mad Dummy', kind: 'Mini-boss' },
        { id: 'undyne', name: 'Undyne', kind: 'Boss' }
      ] },
      { name: 'Hotland / CORE', bosses: [
        { id: 'muffet', name: 'Muffet', kind: 'Boss' },
        { id: 'royal-guards', name: 'Royal Guards', kind: 'Mini-boss' },
        { id: 'mettaton', name: 'Mettaton', kind: 'Boss' },
        { id: 'mettaton-ex', name: 'Mettaton EX', kind: 'Boss' }
      ] },
      { name: 'Finale', bosses: [
        { id: 'asgore', name: 'Asgore', kind: 'Boss' },
        { id: 'omega-flowey', name: 'Omega Flowey', kind: 'Final boss (Neutral)' },
        { id: 'asriel', name: 'Asriel Dreemurr', kind: 'Final boss (True Pacifist)' }
      ] },
      { name: 'Genocide', bosses: [
        { id: 'undyne-undying', name: 'Undyne the Undying', kind: 'Boss' },
        { id: 'mettaton-neo', name: 'Mettaton NEO', kind: 'Boss' },
        { id: 'sans', name: 'Sans', kind: 'Final boss (Genocide)' }
      ] },
      { name: 'Optional / Secret', bosses: [
        { id: 'glyde', name: 'Glyde', kind: 'Secret' },
        { id: 'so-sorry', name: 'So Sorry', kind: 'Secret' }
      ] }
    ]
  },
  {
    game: 'deltarune',
    title: 'DELTARUNE',
    sections: [
      { name: 'Chapter 1', bosses: [
        { id: 'lancer', name: 'Lancer', kind: 'Boss' },
        { id: 'susie-lancer', name: 'Susie & Lancer', kind: 'Boss' },
        { id: 'clover', name: 'Clover', kind: 'Mini-boss' },
        { id: 'k-round', name: 'K. Round', kind: 'Boss' },
        { id: 'king', name: 'King', kind: 'Chapter boss' },
        { id: 'jevil', name: 'Jevil', kind: 'Secret boss' }
      ] },
      { name: 'Chapter 2', bosses: [
        { id: 'berdly', name: 'Berdly', kind: 'Boss' },
        { id: 'spamton', name: 'Spamton', kind: 'Mini-boss' },
        { id: 'tasque-manager', name: 'Tasque Manager', kind: 'Mini-boss' },
        { id: 'queen', name: 'Queen', kind: 'Chapter boss' },
        { id: 'spamton-neo', name: 'Spamton NEO', kind: 'Secret boss' }
      ] },
      { name: 'Chapter 3', bosses: [
        { id: 'tenna', name: 'Tenna', kind: 'Chapter boss' },
        { id: 'shadow-mantle', name: 'Shadow Mantle', kind: 'Optional' },
        { id: 'roaring-knight', name: 'Roaring Knight', kind: 'Secret boss' }
      ] },
      { name: 'Chapter 4', bosses: [
        { id: 'jackenstein', name: 'Jackenstein', kind: 'Mini-boss' },
        { id: 'titan', name: 'Titan', kind: 'Chapter boss' },
        { id: 'hammer-of-justice', name: 'Hammer of Justice', kind: 'Secret boss' }
      ] }
    ]
  }
];

function allRosterEntries() {
  const list = [];
  for (const game of ROSTER) {
    for (const section of game.sections) {
      for (const entry of section.bosses) list.push({ ...entry, game: game.game, section: section.name });
    }
  }
  return list;
}

function implementedBossIds() {
  return allRosterEntries().filter(e => BOSSES[e.id]).map(e => e.id);
}
