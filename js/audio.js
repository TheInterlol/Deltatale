// -------------- Sound effects --------
// Short synthesized sounds via Web Audio, so no sound files are needed.
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      audioCtx = new AudioCtx();
    } catch (e) {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

// Two volume buses: sound effects and music (see the settings screen).
let sfxBus = null;
let musicBus = null;

function audioBuses() {
  const ac = getAudioContext();
  if (!ac) return null;
  if (!sfxBus) {
    sfxBus = ac.createGain();
    musicBus = ac.createGain();
    sfxBus.connect(ac.destination);
    musicBus.connect(ac.destination);
    applyMusicVolume();
  }
  return { ac, sfx: sfxBus, music: musicBus };
}

function sfxLevel() {
  return settings.muted ? 0 : (settings.sfxVolume / 7);
}

function musicLevel() {
  return settings.muted ? 0 : (settings.musicVolume / 10);
}

function applyMusicVolume() {
  if (sfxBus) sfxBus.gain.value = sfxLevel();
  if (musicBus) musicBus.gain.value = musicLevel() * 0.8;
  for (const track of musicTracks) {
    track.muted = settings.muted;
    track.volume = Math.min(1, musicLevel() * 0.85);
  }
}

function playTone({ freq, to = freq, duration = 0.08, type = 'square', volume = 0.05, delay = 0 }) {
  if (settings.muted || !settings.sfxVolume) return;
  const buses = audioBuses();
  if (!buses) return;
  const ac = buses.ac;

  const start = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, start + duration);

  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(buses.sfx);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playArpeggio(freqs, step, options = {}) {
  freqs.forEach((freq, i) => playTone({ duration: step * 1.4, ...options, freq, delay: i * step }));
}

const sfx = {
  move() { playTone({ freq: 520, duration: 0.04, volume: 0.03 }); },
  select() { playTone({ freq: 760, to: 980, duration: 0.07, volume: 0.04 }); },
  cancel() { playTone({ freq: 420, to: 300, duration: 0.07, volume: 0.04 }); },
  text() { playTone({ freq: 310, duration: 0.025, volume: 0.015 }); },
  hurt() { playTone({ freq: 240, to: 70, duration: 0.22, type: 'sawtooth', volume: 0.07 }); },
  graze() { playTone({ freq: 1400, duration: 0.03, type: 'triangle', volume: 0.025 }); },
  slash() { playTone({ freq: 900, to: 120, duration: 0.16, type: 'sawtooth', volume: 0.05 }); },
  damage() { playTone({ freq: 150, to: 55, duration: 0.25, volume: 0.07 }); },
  heal() { playArpeggio([523, 659, 784], 0.07, { type: 'triangle', volume: 0.05 }); },
  mercy() { playArpeggio([660, 880], 0.06, { type: 'triangle', volume: 0.04 }); },
  buster() { playTone({ freq: 90, to: 600, duration: 0.35, type: 'sawtooth', volume: 0.06 }); },
  victory() { playArpeggio([523, 659, 784, 1047], 0.1, { type: 'square', volume: 0.04 }); },
  spare() { playArpeggio([784, 988, 1175, 1568], 0.08, { type: 'triangle', volume: 0.05 }); },
  gameOver() { playArpeggio([392, 330, 262, 196], 0.18, { type: 'triangle', volume: 0.06 }); },
  slam() { playTone({ freq: 110, to: 45, duration: 0.18, volume: 0.07 }); },
  warn() { playTone({ freq: 880, duration: 0.05, type: 'square', volume: 0.025 }); },
  beam() { playTone({ freq: 140, to: 900, duration: 0.25, type: 'sawtooth', volume: 0.05 }); },
  shot() { playTone({ freq: 1200, to: 900, duration: 0.04, type: 'square', volume: 0.02 }); },
  bigShot() { playTone({ freq: 300, to: 1400, duration: 0.2, type: 'sawtooth', volume: 0.05 }); },
  pop() { playTone({ freq: 600, to: 200, duration: 0.08, type: 'triangle', volume: 0.04 }); },
  block() { playTone({ freq: 1500, duration: 0.05, type: 'triangle', volume: 0.04 }); },
  phase() { playArpeggio([220, 330, 440], 0.08, { type: 'sawtooth', volume: 0.04 }); }
};

// -------------- Music --------
// Two kinds of music: audio files (assets/bosses/manifest.js, Gerson's track) and the
// original chiptune songs composed in js/songs.js, played by the sequencer in js/music.js.
const musicTracks = new Set();
let currentMusic = null;

function playMusic(music) {
  stopMusic();
  if (!music) return;
  if (music.song) {
    currentMusic = music;
    startSong(music.song);
    return;
  }
  musicTracks.add(music);
  currentMusic = music;
  applyMusicVolume();
  music.currentTime = 0;
  // play() returns a promise that rejects e.g. when autoplay is blocked
  const result = music.play();
  if (result && typeof result.catch === 'function') result.catch(() => {});
}

// Stops all music - called on every reset so one boss' music never leaks into another fight.
function stopMusic() {
  for (const track of musicTracks) {
    track.pause();
    track.currentTime = 0;
  }
  stopSong();
  currentMusic = null;
}

function pauseMusic() {
  if (!currentMusic) return;
  if (currentMusic.song) pauseSong();
  else currentMusic.pause();
}

function resumeMusic() {
  if (!currentMusic) return;
  if (currentMusic.song) {
    resumeSong();
    return;
  }
  const result = currentMusic.play();
  if (result && typeof result.catch === 'function') result.catch(() => {});
}

function toggleMute() {
  settings.muted = !settings.muted;
  saveSettings();
  applyMusicVolume();
}
