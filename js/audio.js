// -------------- Sound effects --------------
// Short synthesised sounds via Web Audio, so no audio files are needed.
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

function playTone({ freq, to = freq, duration = 0.08, type = 'square', volume = 0.05, delay = 0 }) {
  if (settings.muted) return;
  const ac = getAudioContext();
  if (!ac) return;

  const start = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, start + duration);

  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playNoise(duration = 0.15, volume = 0.06, delay = 0) {
  if (settings.muted) return;
  const ac = getAudioContext();
  if (!ac) return;
  const length = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ac.createBufferSource();
  const gain = ac.createGain();
  gain.gain.value = volume;
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(ac.destination);
  source.start(ac.currentTime + delay);
}

function playArpeggio(freqs, step, options = {}) {
  freqs.forEach((freq, i) => playTone({ duration: step * 1.4, ...options, freq, delay: i * step }));
}

// Rate-limit very frequent sounds (KARMA ticks, grazes) so they don't stack into noise.
const lastSfxTime = {};
function throttled(name, interval, fn) {
  const now = performance.now();
  if (lastSfxTime[name] && now - lastSfxTime[name] < interval * 1000) return;
  lastSfxTime[name] = now;
  fn();
}

const sfx = {
  move() { playTone({ freq: 520, duration: 0.04, volume: 0.03 }); },
  select() { playTone({ freq: 760, to: 980, duration: 0.07, volume: 0.04 }); },
  cancel() { playTone({ freq: 420, to: 300, duration: 0.07, volume: 0.04 }); },
  text() { throttled('text', 0.045, () => playTone({ freq: 310, duration: 0.025, volume: 0.015 })); },
  voice(pitch = 1) { throttled('text', 0.05, () => playTone({ freq: 220 * pitch, duration: 0.03, type: 'triangle', volume: 0.03 })); },
  hurt() { throttled('hurt', 0.08, () => playTone({ freq: 240, to: 70, duration: 0.22, type: 'sawtooth', volume: 0.07 })); },
  karma() { throttled('karma', 0.06, () => playTone({ freq: 180, to: 120, duration: 0.05, type: 'sawtooth', volume: 0.04 })); },
  graze() { throttled('graze', 0.05, () => playTone({ freq: 1400, duration: 0.03, type: 'triangle', volume: 0.025 })); },
  slash() { playTone({ freq: 900, to: 120, duration: 0.16, type: 'sawtooth', volume: 0.05 }); },
  damage() { playTone({ freq: 150, to: 55, duration: 0.25, volume: 0.07 }); },
  miss() { playTone({ freq: 300, to: 260, duration: 0.1, type: 'triangle', volume: 0.03 }); },
  heal() { playArpeggio([523, 659, 784], 0.07, { type: 'triangle', volume: 0.05 }); },
  mercy() { playArpeggio([660, 880], 0.06, { type: 'triangle', volume: 0.04 }); },
  spell() { playTone({ freq: 90, to: 600, duration: 0.35, type: 'sawtooth', volume: 0.06 }); },
  victory() { playArpeggio([523, 659, 784, 1047], 0.1, { type: 'square', volume: 0.04 }); },
  spare() { playArpeggio([784, 988, 1175, 1568], 0.08, { type: 'triangle', volume: 0.05 }); },
  ding() { throttled('ding', 0.03, () => playTone({ freq: 1200, to: 1500, duration: 0.06, type: 'square', volume: 0.04 })); },
  slam() { playNoise(0.18, 0.08); playTone({ freq: 90, to: 40, duration: 0.2, volume: 0.07 }); },
  warn() { throttled('warn', 0.1, () => playTone({ freq: 880, duration: 0.05, type: 'square', volume: 0.03 })); },
  blaster() { throttled('blaster', 0.08, () => { playNoise(0.35, 0.05); playTone({ freq: 140, to: 70, duration: 0.35, type: 'sawtooth', volume: 0.05 }); }); },
  shoot() { throttled('shoot', 0.05, () => playTone({ freq: 1000, to: 700, duration: 0.05, type: 'square', volume: 0.025 })); },
  bigShot() { playTone({ freq: 300, to: 1200, duration: 0.25, type: 'sawtooth', volume: 0.06 }); },
  explode() { throttled('explode', 0.06, () => playNoise(0.25, 0.06)); },
  shatter() { playNoise(0.3, 0.08); playArpeggio([392, 330, 262, 196], 0.18, { type: 'triangle', volume: 0.06, delay: 0.3 }); },
  soulChange() { playArpeggio([440, 660], 0.05, { type: 'square', volume: 0.04 }); }
};

// -------------- Music --------------
const musicTracks = new Set();
let currentMusic = null;

function playMusic(track) {
  if (!track) return;
  musicTracks.add(track);
  currentMusic = track;
  track.muted = settings.muted;
  track.currentTime = 0;
  // play() returns a promise that rejects when autoplay is blocked
  const result = track.play();
  if (result && typeof result.catch === 'function') result.catch(() => {});
}

// Stops all music - called on every scene change so music never leaks into another fight.
function stopMusic() {
  for (const track of musicTracks) {
    track.pause();
    track.currentTime = 0;
  }
  currentMusic = null;
}

function pauseMusic() {
  if (currentMusic) currentMusic.pause();
}

function resumeMusic() {
  if (!currentMusic) return;
  const result = currentMusic.play();
  if (result && typeof result.catch === 'function') result.catch(() => {});
}

function toggleMute() {
  settings.muted = !settings.muted;
  saveSettings();
  for (const track of musicTracks) track.muted = settings.muted;
  updateMuteButton();
}

function updateMuteButton() {
  if (!muteBtn) return;
  muteBtn.textContent = settings.muted ? 'Sound: off' : 'Sound: on';
  muteBtn.setAttribute('aria-pressed', String(settings.muted));
}
