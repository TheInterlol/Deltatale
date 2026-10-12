// The full boss rush roster, grouped like the games. A boss is playable once a file in
// bosses/ registers the same id; the rest show up as "coming soon" in the boss select.
// `note` is a one-line summary of the original fight's signature mechanic.

const ROSTER = [
  {
    game: 'undertale',
    title: 'UNDERTALE',
    groups: [
      {
        name: 'Ruins',
        bosses: [
          { id: 'dummy', name: 'Training Dummy', note: 'Warm-up: shots from every side.' },
          { id: 'napstablook', name: 'Napstablook', note: 'Falling tears; cheer it up to win.' },
          { id: 'toriel', name: 'Toriel', note: 'Fire waves and paw sweeps; spare her again and again.' }
        ]
      },
      {
        name: 'Snowdin',
        bosses: [
          { id: 'doggo', name: 'Doggo', note: 'Cyan/orange swords: only moving things are seen.' },
          { id: 'dogamy_dogaressa', name: 'Dogamy & Dogaressa', note: 'Two axes, sniffing hearts.' },
          { id: 'greater_dog', name: 'Greater Dog', note: 'Spears and an over-excited dog.' },
          { id: 'papyrus', name: 'Papyrus', note: 'Blue SOUL gravity, bone jumps, the special attack.' }
        ]
      },
      {
        name: 'Waterfall',
        bosses: [
          { id: 'shyren', name: 'Shyren', note: 'Musical notes; hum along.' },
          { id: 'mad_dummy', name: 'Mad Dummy', note: 'Make the dummies hit themselves.' },
          { id: 'undyne', name: 'Undyne', note: 'Green SOUL shield vs. spears, then spear pits.' }
        ]
      },
      {
        name: 'Hotland / CORE',
        bosses: [
          { id: 'royal_guards', name: 'Royal Guards', note: 'Fire and swords from two knights.' },
          { id: 'muffet', name: 'Muffet', note: 'Purple SOUL on spider strings, her pet.' },
          { id: 'mettaton_ex', name: 'Mettaton EX', note: 'Yellow SOUL shooting, ratings, legs and bombs.' }
        ]
      },
      {
        name: 'Finale',
        bosses: [
          { id: 'asgore', name: 'Asgore', note: 'Orange/cyan fire, trident sweeps.' },
          { id: 'omega_flowey', name: 'Omega Flowey', note: 'Huge board, six SOUL phases.' },
          { id: 'asriel', name: 'Asriel Dreemurr', note: 'Star blazing, chaos saber, hyper goner.' }
        ]
      },
      {
        name: 'Genocide',
        bosses: [
          { id: 'glad_dummy', name: 'Glad Dummy', note: 'The dummy is happy now.' },
          { id: 'undyne_undying', name: 'Undyne the Undying', note: 'Faster spears, rising spears, spear rings.' },
          { id: 'mettaton_neo', name: 'Mettaton NEO', note: 'One hit... or is it?' },
          { id: 'sans', name: 'Sans', note: 'KARMA, bone walls, beams, gravity slams.' }
        ]
      },
      {
        name: 'Optional',
        bosses: [
          { id: 'so_sorry', name: 'So Sorry', note: 'Drawings come to life.' },
          { id: 'glyde', name: 'Glyde', note: 'Flying, fabulous, fragile.' },
          { id: 'mad_mew_mew', name: 'Mad Mew Mew', note: 'Mad Dummy\'s cousin (Switch).' }
        ]
      }
    ]
  },
  {
    game: 'deltarune',
    title: 'DELTARUNE',
    groups: [
      {
        name: 'Chapter 1',
        bosses: [
          { id: 'lancer', name: 'Lancer', note: 'Spades and a bike.' },
          { id: 'k_round', name: 'K. Round', note: 'Crown jumps and a growing king of checkers.' },
          { id: 'king', name: 'King', note: 'Spade bursts, chain attacks, the coward\'s plea.' }
        ]
      },
      {
        name: 'Chapter 2',
        bosses: [
          { id: 'sweet_cap_cakes', name: 'Sweet Cap\'n Cakes', note: 'Bullets on the beat; make all three dance.' },
          { id: 'berdly', name: 'Berdly', note: 'Tornadoes and feathers.' },
          { id: 'spamton', name: 'Spamton', note: 'Flying heads and pipis.' },
          { id: 'rouxls_kaard', name: 'Rouxls Kaard', note: 'Worms and board puzzles.' },
          { id: 'queen', name: 'Queen', note: 'Wine glasses, chairs, the acid fountain.' },
          { id: 'giga_queen', name: 'GIGA Queen', note: 'A giant-robot punching match in three rounds.' }
        ]
      },
      {
        name: 'Chapter 3',
        bosses: [
          { id: 'lanino_elnina', name: 'Lanino & Elnina', note: 'Sun/moon vs. rain/snow; pick a favourite.' },
          { id: 'shuttah', name: 'Shuttah', note: 'Freezing drops and timed photo challenges.' },
          { id: 'tenna', name: 'Tenna', note: 'A TV game show.' },
          { id: 'knight', name: 'The Roaring Knight', note: 'Sword storms.' }
        ]
      },
      {
        name: 'Chapter 4',
        bosses: [
          { id: 'jackenstein', name: 'Jackenstein', note: 'Dark mazes: key, treasure, exit, chasing pumpkin.' },
          { id: 'gerson', name: 'Old Man Gerson', note: 'Falling axes and boomerangs.' },
          { id: 'sound_of_justice', name: 'Sound of Justice', note: 'Green SOUL arrows, then hammer strikes.' },
          { id: 'titan', name: 'Titan', note: 'Darkness and light.' }
        ]
      },
      {
        name: 'Secret',
        bosses: [
          { id: 'jevil', name: 'Jevil', note: 'Chaos: suit bullets, carousel, scythes, the Devilsknife.' },
          { id: 'spamton_neo', name: 'Spamton NEO', note: 'Yellow SOUL BIG SHOTs, heads, phones, pipis.' }
        ]
      }
    ]
  }
];

// Flat list of every roster entry in display order, each with its game and group.
function rosterEntries() {
  const list = [];
  for (const section of ROSTER) {
    for (const group of section.groups) {
      for (const boss of group.bosses) list.push({ ...boss, game: section.game, group: group.name });
    }
  }
  return list;
}

function rosterEntry(id) {
  return rosterEntries().find(e => e.id === id) || null;
}

function isPlayable(id) {
  return Boolean(getBoss(id));
}
