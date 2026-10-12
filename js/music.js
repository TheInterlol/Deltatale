// A tiny chiptune sequencer: songs (js/songs.js) are written as tracker-like strings or
// described by a style, compiled to 16th-note steps and synthesized with Web Audio
// (pulse/triangle/saw voices and noise drums). All music in the game is original.
//
// Song spec:
//   bpm, root (MIDI note of the tonic, e.g. 62 = D4), scale ('minor', 'major', ...), beats (4 or 3)
//   sections: { A: { prog: [chord degrees per bar], lead: [bar strings] }, B: {...} }, order: ['A', 'B']
//   lead: a bar string has one token per 16th: '.' rest, '-' hold, '3' scale degree (1 = tonic),
//         "3'" an octave up, '3,' an octave down, '4#' / '7b' sharp / flat
//   leads that are left out are composed from the chords (seeded, so always the same tune)
//   leadWave, bass ('octave', 'drive', 'half', 'sync', 'walk', 'waltz', 'pedal'), arp ('up', 'updown',
//   'down', 'broken' or null), drums (see DRUM_KITS), feel ('calm', 'bouncy', 'driving', 'chaotic'),
//   echo (true: a quiet delayed copy of the lead), seed
//   intense: overrides used while the fight is heated (low boss HP, late turns): drums, arp, bass

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  whole: [0, 2, 4, 6, 8, 10]
};

// Drum patterns per bar: k = kick, s = snare, h = closed hat, o = open hat.
const DRUM_KITS = {
  none: {},
  rock: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  four: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.' },
  half: { k: 'x...............', s: '........x.......', h: 'x...x...x...x...' },
  soft: { k: 'x.......x.......', h: '....x.......x...' },
  march: { k: 'x.......x.......', s: '....x.x.....x.xx', h: 'x...x...x...x...' },
  break: { k: 'x.....x...x.....', s: '....x.......x..x', h: 'x.xxx.x.x.xxx.x.' },
  gallop: { k: 'x..x..x.x..x..x.', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' },
  dnb: { k: 'x.........x.....', s: '....x.......x...', h: 'x.x.x.xxx.x.x.xx' },
  disco: { k: 'x...x...x...x...', s: '....x.......x...', o: '..x...x...x...x.' },
  waltz: { k: 'x...........', s: '....x...x...', h: 'x.x.x.x.x.x.' },
  waltzSoft: { k: 'x...........', h: '....x...x...' }
};

const RHYTHMS = {
  4: {
    calm: [[[0, 4], [4, 2], [6, 2], [8, 6], [14, 2]], [[0, 6], [6, 2], [8, 8]], [[0, 2], [2, 2], [4, 4], [8, 4], [12, 4]], [[0, 8], [8, 4], [12, 4]]],
    bouncy: [[[0, 2], [3, 1], [4, 2], [6, 2], [8, 2], [11, 1], [12, 4]], [[0, 3], [3, 3], [6, 2], [8, 4], [12, 2], [14, 2]], [[0, 2], [2, 2], [4, 2], [6, 2], [8, 6], [14, 2]]],
    driving: [[[0, 2], [2, 2], [4, 1], [6, 2], [8, 2], [10, 2], [12, 4]], [[0, 3], [3, 3], [6, 2], [8, 3], [11, 3], [14, 2]], [[0, 4], [4, 2], [6, 2], [8, 2], [10, 2], [12, 2], [14, 2]], [[0, 1], [2, 1], [3, 3], [6, 2], [8, 8]]],
    chaotic: [[[0, 1], [1, 1], [2, 1], [3, 1], [4, 2], [7, 1], [8, 2], [10, 1], [11, 1], [12, 4]], [[0, 3], [3, 1], [4, 3], [7, 1], [8, 1], [9, 1], [10, 2], [12, 2], [14, 2]], [[0, 2], [2, 1], [3, 2], [5, 1], [6, 4], [10, 2], [12, 1], [13, 3]]]
  },
  3: {
    calm: [[[0, 4], [4, 4], [8, 4]], [[0, 6], [6, 2], [8, 4]], [[0, 8], [8, 4]]],
    bouncy: [[[0, 2], [2, 2], [4, 2], [6, 2], [8, 4]], [[0, 4], [4, 2], [6, 2], [8, 4]], [[0, 3], [3, 1], [4, 4], [8, 2], [10, 2]]],
    driving: [[[0, 2], [2, 2], [4, 2], [6, 2], [8, 2], [10, 2]], [[0, 4], [4, 2], [6, 2], [8, 2], [10, 2]], [[0, 1], [1, 1], [2, 2], [4, 4], [8, 4]]],
    chaotic: [[[0, 1], [1, 1], [2, 1], [3, 1], [4, 2], [6, 2], [8, 1], [9, 1], [10, 2]], [[0, 2], [2, 1], [3, 1], [4, 4], [8, 1], [9, 3]]]
  }
};

const music = {
  song: null,
  compiled: null,
  step: 0,
  nextTime: 0,
  playing: false,
  intensity: 0,
  out: null,
  noise: null,
  pulse: null
};

function midiFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function scaleOf(spec) {
  return SCALES[spec.scale] || SCALES.minor;
}

// Scale degree (0 = tonic, may be negative or above 6) -> semitones above the tonic.
function degreeSemis(scale, deg) {
  const n = scale.length;
  const oct = Math.floor(deg / n);
  const idx = ((deg % n) + n) % n;
  return oct * 12 + scale[idx];
}

function seededRandom(seed) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str) {
  let h = 7;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 1000003;
  return h;
}

// "1 . 3 - 5' . 4# ." -> [{ step, deg, acc, len }]
function parseBar(bar, stepsPerBar) {
  const tokens = bar.trim().split(/\s+/).slice(0, stepsPerBar);
  const notes = [];
  tokens.forEach((tok, step) => {
    if (tok === '.') return;
    if (tok === '-') {
      const last = notes[notes.length - 1];
      if (last && last.step + last.len === step) last.len += 1;
      return;
    }
    const m = tok.match(/^(\d)([#b]?)(['’,]*)$/);
    if (!m) return;
    let deg = Number(m[1]) - 1;
    let octave = 0;
    for (const c of m[3]) octave += c === ',' ? -1 : 1;
    notes.push({ step, deg, octave, acc: m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0, len: 1 });
  });
  return notes;
}

// ---------------- composing a lead from the chords ----------------
function chordTones(root) {
  return [root, root + 2, root + 4];
}

function nearestChordTone(current, root, rand, leap) {
  const options = [];
  for (let o = -2; o <= 2; o++) for (const t of chordTones(root)) options.push(t + o * 7);
  const inRange = options.filter(d => d >= -3 && d <= 10);
  inRange.sort((a, b) => Math.abs(a - current) - Math.abs(b - current));
  if (leap && inRange.length > 2) return inRange[Math.min(inRange.length - 1, 1 + Math.floor(rand() * 3))];
  return inRange[Math.floor(rand() * Math.min(2, inRange.length))];
}

function composeBar(rhythm, root, prevDeg, rand, feel, cadence) {
  const notes = [];
  let deg = prevDeg;
  const leapChance = { calm: 0.15, bouncy: 0.35, driving: 0.25, chaotic: 0.55 }[feel] || 0.25;
  rhythm.forEach(([step, len], i) => {
    const strong = step % 4 === 0;
    if (strong || i === 0) {
      deg = nearestChordTone(deg, root, rand, rand() < leapChance);
    } else {
      deg += rand() < 0.5 ? 1 : -1;
      if (feel === 'chaotic' && rand() < 0.3) deg += rand() < 0.5 ? 3 : -2;
    }
    deg = Math.max(-3, Math.min(10, deg));
    notes.push({ step, deg, octave: 0, acc: 0, len });
  });
  if (cadence && notes.length) {
    const last = notes[notes.length - 1];
    last.deg = nearestChordTone(last.deg, 0, () => 0, false);
  }
  return { notes, last: deg };
}

// A section's lead: two motifs, the first one repeated over the later chords (so it sounds
// like a tune, not noise), and a cadence at the end.
function composeSection(spec, section, seed) {
  const rand = seededRandom(seed);
  const beats = spec.beats || 4;
  const bank = RHYTHMS[beats][spec.feel || 'driving'] || RHYTHMS[beats].driving;
  const prog = section.prog;
  const rA = bank[Math.floor(rand() * bank.length)];
  const rB = bank[Math.floor(rand() * bank.length)];
  const rC = bank[Math.floor(rand() * bank.length)];
  const bars = [];
  let deg = 4;
  let motifA = null;
  for (let i = 0; i < prog.length; i++) {
    const root = prog[i] - 1;
    const pos = i % 4;
    const last = i === prog.length - 1;
    if (pos === 0 || pos === 2) {
      if (motifA && pos === 2 && !last) {
        // the first motif again, moved to this chord
        const shift = root - motifA.root;
        bars.push(motifA.notes.map(n => ({ ...n, deg: Math.max(-3, Math.min(10, n.deg + shift)) })));
        continue;
      }
      const made = composeBar(rA, root, deg, rand, spec.feel, last);
      deg = made.last;
      if (!motifA) motifA = { notes: made.notes, root };
      bars.push(made.notes);
    } else {
      const made = composeBar(last ? rC : rB, root, deg, rand, spec.feel, last);
      deg = made.last;
      bars.push(made.notes);
    }
  }
  return bars;
}

// ---------------- compiling ----------------
function bassBar(style, rootSemi, stepsPerBar) {
  const r = rootSemi;
  const ev = (step, semi, len) => ({ step, semi, len });
  switch (style) {
    case 'octave': return Array.from({ length: stepsPerBar / 2 }, (_, i) => ev(i * 2, r + (i % 2 ? 12 : 0), 2));
    case 'drive': return Array.from({ length: stepsPerBar / 2 }, (_, i) => ev(i * 2, r, 2));
    case 'half': return [ev(0, r, 7), ev(8, r, 7)];
    case 'pedal': return [ev(0, r, stepsPerBar)];
    case 'sync': return [ev(0, r, 3), ev(3, r, 3), ev(6, r + 12, 2), ev(8, r, 3), ev(11, r, 3), ev(14, r + 7, 2)];
    case 'walk': return [ev(0, r, 4), ev(4, r + 4, 4), ev(8, r + 7, 4), ev(12, r + 9, 4)];
    case 'waltz': return [ev(0, r, 4), ev(4, r + 7, 4), ev(8, r + 12, 4)];
    default: return [ev(0, r, 4), ev(8, r, 4)];
  }
}

function arpBar(style, chordSemis, stepsPerBar) {
  if (!style) return [];
  let order = chordSemis.concat(chordSemis[0] + 12);
  if (style === 'down') order = order.slice().reverse();
  if (style === 'updown') order = order.concat(order.slice(1, -1).reverse());
  if (style === 'broken') order = [chordSemis[0], chordSemis[2], chordSemis[1], chordSemis[2]];
  return Array.from({ length: stepsPerBar }, (_, i) => ({ step: i, semi: order[i % order.length], len: 1 }));
}

function compileSong(spec) {
  const scale = scaleOf(spec);
  const beats = spec.beats || 4;
  const spb = beats * 4;
  const order = spec.order || Object.keys(spec.sections);
  const seed = spec.seed || hashString(spec.name || 'song');
  const leads = {};
  for (const [name, section] of Object.entries(spec.sections)) {
    leads[name] = section.lead
      ? section.lead.map(bar => parseBar(bar, spb))
      : composeSection(spec, section, seed + hashString(name));
  }

  const steps = [];
  const push = (step, ev) => {
    (steps[step] = steps[step] || []).push(ev);
  };
  let barStart = 0;
  for (const name of order) {
    const section = spec.sections[name];
    const lead = leads[name];
    section.prog.forEach((chord, bar) => {
      const root = Number(String(chord).replace(/[^0-9-]/g, '')) - 1;
      const rootSemi = degreeSemis(scale, root);
      const chordSemis = chordTones(root).map(d => degreeSemis(scale, d));
      const base = barStart + bar * spb;

      for (const n of lead[bar] || []) {
        const midi = spec.root + 12 + degreeSemis(scale, n.deg) + n.octave * 12 + n.acc + (spec.leadShift || 0);
        push(base + n.step, { ch: 'lead', midi, len: n.len });
        if (spec.echo) push(base + n.step + 3, { ch: 'echo', midi, len: Math.min(n.len, 3) });
      }
      for (const b of bassBar(section.bass || spec.bass, rootSemi, spb)) {
        push(base + b.step, { ch: 'bass', midi: spec.root - 24 + b.semi, len: b.len });
      }
      const intenseBass = spec.intense && spec.intense.bass;
      if (intenseBass) {
        for (const b of bassBar(intenseBass, rootSemi, spb)) push(base + b.step, { ch: 'bass', midi: spec.root - 24 + b.semi, len: b.len, layer: 1 });
      }
      for (const a of arpBar(section.arp !== undefined ? section.arp : spec.arp, chordSemis, spb)) {
        push(base + a.step, { ch: 'arp', midi: spec.root + a.semi, len: 1 });
      }
      const intenseArp = spec.intense && spec.intense.arp;
      if (intenseArp && !spec.arp) {
        for (const a of arpBar(intenseArp, chordSemis, spb)) push(base + a.step, { ch: 'arp', midi: spec.root + a.semi, len: 1, layer: 1 });
      }
      if (spec.pad) {
        for (const s of chordSemis) push(base, { ch: 'pad', midi: spec.root + s, len: spb });
      }
    });
    barStart += section.prog.length * spb;
  }
  return { steps, length: barStart, stepsPerBar: spb, stepDur: 60 / spec.bpm / 4 };
}

// ---------------- synthesis ----------------
function musicNoise(ac) {
  if (!music.noise) {
    const buffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    music.noise = buffer;
  }
  return music.noise;
}

function pulseWave(ac) {
  if (!music.pulse) {
    // a 25% pulse wave, the classic chiptune lead
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
    music.pulse = ac.createPeriodicWave(real, imag);
  }
  return music.pulse;
}

function playVoice(ac, time, midi, dur, { wave = 'square', vol = 0.1, attack = 0.005, release = 0.06, vibrato = 0 }) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  if (wave === 'pulse') osc.setPeriodicWave(pulseWave(ac));
  else osc.type = wave;
  osc.frequency.setValueAtTime(midiFreq(midi), time);
  if (vibrato && dur > 0.25) {
    const lfo = ac.createOscillator();
    const depth = ac.createGain();
    lfo.frequency.value = 5.5;
    depth.gain.setValueAtTime(0, time);
    depth.gain.linearRampToValueAtTime(midiFreq(midi) * 0.012 * vibrato, time + Math.min(0.3, dur * 0.6));
    lfo.connect(depth);
    depth.connect(osc.frequency);
    lfo.start(time);
    lfo.stop(time + dur + release + 0.05);
  }
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(vol, time + attack);
  gain.gain.setValueAtTime(vol * 0.8, time + Math.max(attack, dur * 0.4));
  gain.gain.linearRampToValueAtTime(0.0001, time + dur + release);
  osc.connect(gain);
  gain.connect(music.out);
  osc.start(time);
  osc.stop(time + dur + release + 0.02);
}

function playDrum(ac, time, kind, vol = 1) {
  const out = music.out;
  if (kind === 'k') {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);
    gain.gain.setValueAtTime(0.38 * vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    osc.connect(gain);
    gain.connect(out);
    osc.start(time);
    osc.stop(time + 0.18);
    return;
  }
  const src = ac.createBufferSource();
  src.buffer = musicNoise(ac);
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  const len = kind === 's' ? 0.13 : kind === 'o' ? 0.12 : 0.035;
  filter.type = kind === 's' ? 'bandpass' : 'highpass';
  filter.frequency.value = kind === 's' ? 1700 : 7000;
  gain.gain.setValueAtTime((kind === 's' ? 0.2 : 0.06) * vol, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + len);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  src.start(time, Math.random() * 0.5);
  src.stop(time + len + 0.02);
}

const CHANNEL_SOUND = {
  lead: spec => ({ wave: spec.leadWave || 'pulse', vol: 0.11, vibrato: 1 }),
  echo: spec => ({ wave: spec.leadWave || 'pulse', vol: 0.035 }),
  bass: spec => ({ wave: spec.bassWave || 'triangle', vol: 0.24, release: 0.03 }),
  arp: () => ({ wave: 'square', vol: 0.03, release: 0.02 }),
  pad: () => ({ wave: 'triangle', vol: 0.035, attack: 0.2, release: 0.3 })
};

function scheduleStep(ac, step, time) {
  const song = music.song;
  const c = music.compiled;
  for (const ev of c.steps[step] || []) {
    if (ev.layer === 1 && music.intensity < 1) continue;
    const opts = CHANNEL_SOUND[ev.ch](song);
    playVoice(ac, time, ev.midi + (ev.ch === 'lead' && music.intensity >= 2 ? 12 : 0), ev.len * c.stepDur * 0.92, opts);
  }
  const kitName = music.intensity >= 1 && song.intense && song.intense.drums ? song.intense.drums : song.drums;
  const kit = DRUM_KITS[kitName] || DRUM_KITS.none;
  const inBar = step % c.stepsPerBar;
  for (const kind of ['k', 's', 'h', 'o']) {
    const pattern = kit[kind];
    if (pattern && pattern[inBar % pattern.length] === 'x') playDrum(ac, time, kind);
  }
}

// ---------------- transport ----------------
function startSong(spec) {
  stopSong();
  const buses = audioBuses();
  if (!buses) return;
  const ac = buses.ac;
  if (!spec._compiled) spec._compiled = compileSong(spec);
  music.song = spec;
  music.compiled = spec._compiled;
  music.step = 0;
  music.intensity = 0;
  music.out = ac.createGain();
  music.out.gain.value = spec.volume || 1;
  music.out.connect(buses.music);
  music.nextTime = ac.currentTime + 0.08;
  music.playing = true;
}

function stopSong() {
  music.playing = false;
  music.song = null;
  if (music.out && audioCtx) {
    const out = music.out;
    out.gain.setTargetAtTime(0, audioCtx.currentTime, 0.03);
    setTimeout(() => out.disconnect(), 300);
  }
  music.out = null;
}

function pauseSong() {
  music.playing = false;
  if (music.out && audioCtx) music.out.gain.setTargetAtTime(0, audioCtx.currentTime, 0.02);
}

function resumeSong() {
  if (!music.song || !audioCtx) return;
  music.playing = true;
  music.out.gain.setTargetAtTime(music.song.volume || 1, audioCtx.currentTime, 0.02);
  music.nextTime = audioCtx.currentTime + 0.05;
}

function setMusicIntensity(level) {
  music.intensity = level;
}

// Called every frame: schedules the notes of the next ~0.2 s.
function updateMusic() {
  if (!music.playing || !audioCtx || !music.out) return;
  const ac = audioCtx;
  if (state.battle) setMusicIntensity(battleMusicIntensity(state.battle));
  if (music.nextTime < ac.currentTime - 0.2) music.nextTime = ac.currentTime + 0.05; // after a stall
  const c = music.compiled;
  while (music.nextTime < ac.currentTime + 0.2) {
    scheduleStep(ac, music.step, music.nextTime);
    music.nextTime += c.stepDur;
    music.step = (music.step + 1) % c.length;
  }
}

// The music gets fuller when the fight heats up.
function battleMusicIntensity(battle) {
  const boss = battle.boss;
  if (boss.musicIntensity) return boss.musicIntensity(battle);
  const hpLow = boss.maxHp && battle.bossHp / boss.maxHp < 0.5;
  return hpLow || battle.turn >= 6 ? 1 : 0;
}

// ---------------- which music plays where ----------------
const songWrappers = {};

function songMusic(id) {
  if (typeof SONGS === 'undefined' || !SONGS[id]) return null;
  if (!songWrappers[id]) songWrappers[id] = { song: SONGS[id], id };
  return songWrappers[id];
}

function playMenuMusic() {
  const menuSong = songMusic('menu');
  if (!menuSong || currentMusic === menuSong) return;
  playMusic(menuSong);
}
