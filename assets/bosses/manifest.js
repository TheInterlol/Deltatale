// Boss art and music slots.
//
// Drop files into assets/bosses/<boss id>/ and list them here - the game only requests
// files that are listed, so a missing entry never causes a 404. Until a boss has a sprite,
// the game draws a neutral placeholder card with its name.
//
//   sprite   image file; a horizontal strip of `frames` equally wide frames
//   frames   number of animation frames in the strip (default 1)
//   fps      animation speed (default 8)
//   scale    drawing scale (default 2, pixel art stays crisp)
//   music    looping music file for the fight
//
// Example (uncomment after adding the files):
//   toriel: { sprite: 'idle.png', frames: 1, scale: 2, music: 'music.mp3' },
//
// Boss ids are listed in js/roster.js.
const BOSS_ASSETS = {
};
