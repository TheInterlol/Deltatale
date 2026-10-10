// -------------- Zvukové efekty --------
// Krátké syntetizované zvuky přes Web Audio, takže nepotřebují žádné soubory.
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
  gameOver() { playArpeggio([392, 330, 262, 196], 0.18, { type: 'triangle', volume: 0.06 }); }
};

// -------------- Hudba --------
const musicTracks = new Set();
let currentMusic = null;

function playMusic(track) {
  musicTracks.add(track);
  currentMusic = track;
  track.muted = settings.muted;
  track.currentTime = 0;
  // play() vrací promise, která selže např. při blokovaném autoplay
  const result = track.play();
  if (result && typeof result.catch === 'function') result.catch(() => {});
}

// Zastaví veškerou hudbu - volá se při každém resetu, aby hudba nepřetekla k jinému bossovi.
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
  muteBtn.textContent = settings.muted ? 'Zvuk: vyp' : 'Zvuk: zap';
  muteBtn.setAttribute('aria-pressed', String(settings.muted));
}
