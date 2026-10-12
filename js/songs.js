// Original chiptune songs for the boss rush (format: see js/music.js). None of them copies a
// melody from the games - each one is written for the mood of its fight. The main bosses have
// hand-written hooks; the rest are composed by js/music.js from their style (seeded, so a boss
// always has the same tune). A file listed in assets/bosses/manifest.js replaces the song.

function song(name, spec) {
  return { name, beats: 4, echo: false, ...spec };
}

const SONGS = {
  menu: song('menu', {
    bpm: 92, root: 62, scale: 'major', feel: 'calm', bass: 'half', arp: 'up', drums: 'soft', pad: true, echo: true,
    sections: {
      A: {
        prog: [1, 5, 6, 4],
        lead: [
          '5 - - . 3 - 2 - 1 - - - . . 2 3',
          '5 - - . 6 - 5 - 3 - - - . . . .',
          '6 - - . 5 - 3 - 2 - 3 - 5 - - -',
          '4 - - - 3 - 2 - 1 - - - . . . .'
        ]
      },
      B: { prog: [4, 1, 6, 5] }
    },
    order: ['A', 'B']
  }),

  // ---------------------------------------------------------------- Undertale
  dummy: song('dummy', { bpm: 116, root: 60, scale: 'major', feel: 'bouncy', bass: 'octave', drums: 'four', sections: { A: { prog: [1, 4, 1, 5] } } }),
  napstablook: song('napstablook', {
    bpm: 72, root: 57, scale: 'minor', feel: 'calm', bass: 'pedal', arp: null, drums: 'none', pad: true, echo: true, leadWave: 'triangle',
    sections: { A: { prog: [1, 6, 4, 5] }, B: { prog: [6, 4, 1, 5] } }, order: ['A', 'B']
  }),
  toriel: song('toriel', {
    bpm: 132, root: 60, scale: 'harmonic', feel: 'driving', bass: 'octave', drums: 'rock', echo: true,
    intense: { arp: 'updown' },
    sections: {
      A: {
        prog: [1, 6, 4, 5],
        lead: [
          "1' - 7 - 5 - - - 3 - 5 - 7 - 1' -",
          "1' - - - 7 - 6 - 3 - - - . . . .",
          "4 - 5 - 6 - 1' - 7 - 6 - 4 - - -",
          '5 - - - 7, - 2 - 5 - - - . . . .'
        ]
      },
      B: { prog: [6, 7, 1, 5] }
    },
    order: ['A', 'A', 'B']
  }),
  doggo: song('doggo', { bpm: 124, root: 57, scale: 'mixolydian', feel: 'bouncy', bass: 'walk', drums: 'four', sections: { A: { prog: [1, 7, 4, 1] } } }),
  dogamy_dogaressa: song('dogamy_dogaressa', { bpm: 118, root: 58, scale: 'dorian', feel: 'bouncy', bass: 'walk', drums: 'four', echo: true, sections: { A: { prog: [1, 4, 1, 5] }, B: { prog: [4, 4, 1, 1] } }, order: ['A', 'B'] }),
  greater_dog: song('greater_dog', { bpm: 140, root: 60, scale: 'major', feel: 'bouncy', bass: 'octave', drums: 'rock', sections: { A: { prog: [1, 5, 6, 4] } } }),
  papyrus: song('papyrus', {
    bpm: 152, root: 60, scale: 'major', feel: 'bouncy', bass: 'octave', drums: 'four',
    intense: { arp: 'up', drums: 'rock' },
    sections: {
      A: {
        prog: [1, 4, 5, 1],
        lead: [
          '1 . 3 . 5 . 5 . 6 . 5 . 3 - - .',
          "4 . 6 . 1' . 1' . 6 - 4 - 6 - - .",
          '5 . 4 . 3 . 2 . 5 . 7, . 2 - - .',
          "1 . 3 5 1' - - . 5 . 1' . . . . ."
        ]
      },
      B: { prog: [6, 4, 2, 5] }
    },
    order: ['A', 'A', 'B']
  }),
  shyren: song('shyren', { bpm: 84, root: 62, scale: 'lydian', feel: 'calm', bass: 'half', arp: 'updown', drums: 'none', pad: true, echo: true, leadWave: 'triangle', sections: { A: { prog: [1, 2, 1, 5] } } }),
  mad_dummy: song('mad_dummy', { bpm: 172, root: 59, scale: 'phrygian', feel: 'chaotic', bass: 'drive', drums: 'dnb', arp: 'down', sections: { A: { prog: [1, 2, 1, 7] }, B: { prog: [6, 7, 1, 1] } }, order: ['A', 'B'] }),
  undyne: song('undyne', {
    bpm: 166, root: 62, scale: 'minor', feel: 'driving', bass: 'drive', drums: 'gallop', leadWave: 'square',
    intense: { arp: 'up' },
    sections: {
      A: {
        prog: [1, 7, 6, 7],
        lead: [
          "1 - - 5 - - 1' - 7 - 5 - 4 - 5 -",
          '2 - - 7, - - 2 - 4 - 2 - 7, - 2 -',
          '3 - - 1 - - 3 - 6 - 5 - 3 - 1 -',
          '7, - - 2 - - 5 - 4 - 2 - 7, - - -'
        ]
      },
      B: { prog: [6, 3, 7, 5] }
    },
    order: ['A', 'A', 'B']
  }),
  royal_guards: song('royal_guards', { bpm: 128, root: 57, scale: 'minor', feel: 'driving', bass: 'sync', drums: 'march', sections: { A: { prog: [1, 1, 6, 7] } } }),
  muffet: song('muffet', {
    bpm: 136, root: 61, scale: 'harmonic', feel: 'bouncy', bass: 'waltz', drums: 'waltz', beats: 3, arp: null,
    sections: { A: { prog: [1, 4, 5, 1, 6, 4, 5, 5] } }
  }),
  mettaton_ex: song('mettaton_ex', {
    bpm: 140, root: 60, scale: 'major', feel: 'bouncy', bass: 'octave', arp: 'broken', drums: 'disco', echo: true,
    sections: { A: { prog: [1, 6, 2, 5] }, B: { prog: [4, 5, 3, 6] } }, order: ['A', 'A', 'B']
  }),
  asgore: song('asgore', {
    bpm: 112, root: 57, scale: 'minor', feel: 'calm', bass: 'half', drums: 'march', pad: true, leadWave: 'square',
    intense: { drums: 'rock', arp: 'up' },
    sections: {
      A: {
        prog: [1, 6, 3, 7],
        lead: [
          '1 - - - - - 5, - 1 - 2 - 3 - - -',
          '3 - 2 - 1 - 7, - 6, - - - - - - -',
          '3 - - - - - 2 - 3 - 4 - 5 - - -',
          '5 - 4 - 3 - 2 - 7, - - - - - - -'
        ]
      },
      B: { prog: [4, 5, 6, 5] }
    },
    order: ['A', 'B']
  }),
  omega_flowey: song('omega_flowey', { bpm: 150, root: 58, scale: 'phrygian', feel: 'chaotic', bass: 'drive', arp: 'updown', drums: 'dnb', leadWave: 'sawtooth', sections: { A: { prog: [1, 2, 1, 2] }, B: { prog: [6, 7, 1, 1] } }, order: ['A', 'A', 'B'] }),
  asriel: song('asriel', {
    bpm: 144, root: 62, scale: 'minor', feel: 'driving', bass: 'octave', arp: 'up', drums: 'rock', pad: true, echo: true,
    intense: { drums: 'dnb' },
    sections: { A: { prog: [1, 6, 3, 7] }, B: { prog: [4, 6, 7, 7] } }, order: ['A', 'B']
  }),
  glad_dummy: song('glad_dummy', { bpm: 100, root: 60, scale: 'major', feel: 'calm', bass: 'half', drums: 'soft', sections: { A: { prog: [1, 4, 1, 5] } } }),
  mettaton_neo: song('mettaton_neo', { bpm: 150, root: 59, scale: 'minor', feel: 'driving', bass: 'octave', arp: 'up', drums: 'disco', sections: { A: { prog: [1, 6, 7, 5] } } }),
  undyne_undying: song('undyne_undying', {
    bpm: 182, root: 62, scale: 'harmonic', feel: 'driving', bass: 'drive', arp: 'up', drums: 'dnb', leadWave: 'sawtooth',
    sections: {
      A: {
        prog: [1, 6, 4, 5],
        lead: [
          "1 - 5 - 1' - 7 - 6 - 5 - 6 - 7 -",
          "1' - - - 6 - 4 - 3 - - - 1 - 3 -",
          '4 - 6 - 1\' - 6 - 7 - 6 - 4 - 2 -',
          '7, - 2 - 5 - 4 - 2 - - - 7, - - -'
        ]
      },
      B: { prog: [6, 7, 1, 5] }
    },
    order: ['A', 'A', 'B']
  }),
  sans: song('sans', {
    bpm: 120, root: 62, scale: 'dorian', feel: 'driving', bass: 'sync', drums: 'break', echo: true, leadWave: 'square',
    intense: { arp: 'broken', drums: 'dnb' },
    sections: {
      A: {
        prog: [1, 1, 7, 4],
        lead: [
          '1 . 1 . 3 . . 4 . 5 . 3 . . 1 .',
          '7, . 1 . . . 5, . . . . . . . . .',
          '7, . 7, . 2 . . 3 . 4 . 2 . . 7, .',
          '4, . 5, . 6, . 7, . 1 - - - . . . .'
        ]
      },
      B: { prog: [4, 5, 1, 7] }
    },
    order: ['A', 'A', 'B', 'A']
  }),
  so_sorry: song('so_sorry', { bpm: 132, root: 60, scale: 'lydian', feel: 'bouncy', bass: 'walk', arp: 'up', drums: 'four', sections: { A: { prog: [1, 2, 4, 1] } } }),
  glyde: song('glyde', { bpm: 104, root: 61, scale: 'mixolydian', feel: 'bouncy', bass: 'sync', drums: 'disco', echo: true, sections: { A: { prog: [1, 7, 1, 4] } } }),
  mad_mew_mew: song('mad_mew_mew', { bpm: 158, root: 63, scale: 'major', feel: 'chaotic', bass: 'octave', arp: 'updown', drums: 'dnb', sections: { A: { prog: [1, 5, 6, 3] }, B: { prog: [4, 5, 1, 1] } }, order: ['A', 'B'] }),

  // ---------------------------------------------------------------- Deltarune
  lancer: song('lancer', { bpm: 138, root: 60, scale: 'mixolydian', feel: 'bouncy', bass: 'octave', drums: 'rock', sections: { A: { prog: [1, 7, 4, 1] } } }),
  k_round: song('k_round', { bpm: 126, root: 57, scale: 'minor', feel: 'driving', bass: 'drive', drums: 'march', sections: { A: { prog: [1, 6, 7, 1] } } }),
  king: song('king', {
    bpm: 124, root: 55, scale: 'harmonic', feel: 'driving', bass: 'octave', drums: 'march', pad: true, leadWave: 'sawtooth',
    intense: { drums: 'rock', arp: 'down' },
    sections: { A: { prog: [1, 4, 6, 5] }, B: { prog: [6, 5, 4, 5] } }, order: ['A', 'A', 'B']
  }),
  sweet_cap_cakes: song('sweet_cap_cakes', { bpm: 120, root: 60, scale: 'dorian', feel: 'bouncy', bass: 'sync', arp: 'broken', drums: 'disco', echo: true, sections: { A: { prog: [1, 4, 1, 4] }, B: { prog: [6, 7, 1, 1] } }, order: ['A', 'A', 'B'] }),
  berdly: song('berdly', { bpm: 146, root: 62, scale: 'major', feel: 'driving', bass: 'octave', arp: 'up', drums: 'rock', sections: { A: { prog: [1, 5, 4, 5] } } }),
  spamton: song('spamton', { bpm: 128, root: 60, scale: 'mixolydian', feel: 'chaotic', bass: 'walk', drums: 'four', sections: { A: { prog: [1, 7, 1, 5] } } }),
  rouxls_kaard: song('rouxls_kaard', { bpm: 110, root: 58, scale: 'harmonic', feel: 'bouncy', bass: 'waltz', drums: 'waltz', beats: 3, sections: { A: { prog: [1, 5, 1, 4, 1, 5, 1, 1] } } }),
  queen: song('queen', {
    bpm: 136, root: 61, scale: 'major', feel: 'bouncy', bass: 'octave', arp: 'broken', drums: 'disco', echo: true, leadWave: 'square',
    intense: { drums: 'break' },
    sections: { A: { prog: [1, 3, 4, 5] }, B: { prog: [6, 4, 5, 1] } }, order: ['A', 'A', 'B']
  }),
  giga_queen: song('giga_queen', { bpm: 150, root: 61, scale: 'major', feel: 'driving', bass: 'drive', arp: 'up', drums: 'rock', leadWave: 'sawtooth', sections: { A: { prog: [1, 5, 6, 4] }, B: { prog: [4, 5, 1, 1] } }, order: ['A', 'B'] }),
  lanino_elnina: song('lanino_elnina', { bpm: 112, root: 62, scale: 'lydian', feel: 'calm', bass: 'walk', arp: 'updown', drums: 'soft', pad: true, echo: true, sections: { A: { prog: [1, 2, 1, 5] } } }),
  shuttah: song('shuttah', { bpm: 122, root: 59, scale: 'dorian', feel: 'bouncy', bass: 'sync', drums: 'break', echo: true, sections: { A: { prog: [1, 4, 1, 7] } } }),
  tenna: song('tenna', {
    bpm: 148, root: 60, scale: 'major', feel: 'bouncy', bass: 'walk', arp: 'broken', drums: 'disco', echo: true, leadWave: 'square',
    intense: { drums: 'rock' },
    sections: { A: { prog: [1, 6, 2, 5] }, B: { prog: [3, 6, 2, 5] } }, order: ['A', 'A', 'B']
  }),
  knight: song('knight', {
    bpm: 160, root: 57, scale: 'phrygian', feel: 'chaotic', bass: 'drive', arp: 'down', drums: 'dnb', pad: true, leadWave: 'sawtooth',
    sections: { A: { prog: [1, 2, 6, 7] }, B: { prog: [4, 2, 1, 1] } }, order: ['A', 'A', 'B']
  }),
  jackenstein: song('jackenstein', { bpm: 108, root: 56, scale: 'harmonic', feel: 'bouncy', bass: 'walk', drums: 'soft', echo: true, leadWave: 'triangle', sections: { A: { prog: [1, 4, 5, 1] } } }),
  sound_of_justice: song('sound_of_justice', { bpm: 96, root: 55, scale: 'minor', feel: 'calm', bass: 'pedal', drums: 'march', pad: true, sections: { A: { prog: [1, 1, 6, 5] } } }),
  titan: song('titan', {
    bpm: 132, root: 54, scale: 'phrygian', feel: 'driving', bass: 'drive', arp: 'updown', drums: 'half', pad: true, leadWave: 'sawtooth',
    intense: { drums: 'dnb' },
    sections: { A: { prog: [1, 2, 1, 7] }, B: { prog: [6, 7, 1, 2] } }, order: ['A', 'A', 'B']
  }),
  jevil: song('jevil', {
    bpm: 184, root: 62, scale: 'harmonic', feel: 'chaotic', bass: 'waltz', drums: 'waltz', beats: 3, echo: true,
    intense: { arp: 'updown' },
    sections: {
      A: {
        prog: [1, 4, 5, 1],
        lead: [
          "1' 7 6 5 - - 3 - 5 - 7, -",
          "4 5 6 1' - - 6 - 4 - 2 -",
          "5 4# 5 7 - - 2' - 7 - 5 -",
          "1' - 5 - 3 - 1 - - - . ."
        ]
      },
      B: { prog: [6, 4, 5, 5] }
    },
    order: ['A', 'A', 'B']
  }),
  spamton_neo: song('spamton_neo', {
    bpm: 150, root: 60, scale: 'mixolydian', feel: 'driving', bass: 'octave', arp: 'up', drums: 'rock', echo: true, leadWave: 'square',
    intense: { drums: 'dnb' },
    sections: {
      A: {
        prog: [1, 7, 4, 1],
        lead: [
          "5 . 5 . 1' . 5 . 6 - 5 - 4 . 3 .",
          '2 . 2 . 7, . 2 . 4 - 2 - 1 . 7, .',
          "6 . 1' . 6 . 4 . 1' - 7 - 6 . 4 .",
          '5 - - - 3 - - - 1 . 1 . 1 - - -'
        ]
      },
      B: { prog: [4, 5, 6, 7] }
    },
    order: ['A', 'A', 'B']
  })
};
