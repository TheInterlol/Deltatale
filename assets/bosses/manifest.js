// Boss art and music, built from the sprite and soundtrack packs the project owner supplied
// (UNDERTALE / DELTARUNE (c) Toby Fox - used in this non-commercial fan project).
//
//   sprite   image in assets/bosses/<id>/: a horizontal strip of `frames` equally wide frames
//   frames   number of animation frames in the strip (default 1)
//   fps      animation speed (default 8)
//   scale    drawing scale
//   hurt     optional image shown while the boss is hit
//   music    looping music file (a path starting with assets/ is used as is,
//            otherwise it is relative to assets/bosses/<id>/)
//
// Bosses without an entry keep the animated sigil and their original chiptune song.
// Regenerate with tools/build_sprites.py + tools/gen_manifest.py (see README).
const BOSS_ASSETS = {
  asgore: { fps: 1, frames: 1, scale: 1.0, sprite: "idle.png" },
  asriel: { fps: 1, frames: 1, scale: 1.5, sprite: "idle.png" },
  berdly: { fps: 6, frames: 5, hurt: "hurt.png", scale: 2.5, sprite: "idle.png", music: "assets/music/berdly.mp3" },
  dogamy_dogaressa: { fps: 6, frames: 11, scale: 1.0, sprite: "idle.png", music: "assets/music/enemy_approaching.mp3" },
  doggo: { fps: 6, frames: 13, scale: 1.5, sprite: "idle.png", music: "assets/music/enemy_approaching.mp3" },
  dummy: { fps: 2, frames: 2, scale: 1.0, sprite: "idle.png", music: "assets/music/enemy_approaching.mp3" },
  giga_queen: { fps: 3, frames: 2, hurt: "hurt.png", scale: 1.5, sprite: "idle.png", music: "assets/music/giga_size.mp3" },
  glad_dummy: { fps: 2, frames: 2, scale: 1.0, sprite: "idle.png", music: "assets/music/enemy_approaching.mp3" },
  glyde: { fps: 1, frames: 1, scale: 0.657, sprite: "idle.png", music: "assets/music/enemy_approaching.mp3" },
  greater_dog: { fps: 2, frames: 2, scale: 1.5, sprite: "idle.png", music: "assets/music/enemy_approaching.mp3" },
  jackenstein: { fps: 6, frames: 6, scale: 1.5, sprite: "idle.png", music: "assets/music/pumpkin_boss.mp3" },
  jevil: { fps: 10, frames: 8, scale: 2.0, sprite: "idle.png", music: "assets/music/the_world_revolving.mp3" },
  k_round: { fps: 8, frames: 8, scale: 2.0, sprite: "idle.png", music: "assets/music/checker_dance.mp3" },
  king: { fps: 6, frames: 5, hurt: "hurt.png", scale: 2.0, sprite: "idle.png", music: "assets/music/chaos_king.mp3" },
  knight: { fps: 1, frames: 1, scale: 2.5, sprite: "idle.png", music: "assets/music/black_knife.mp3" },
  lancer: { fps: 8, frames: 6, hurt: "hurt.png", scale: 2.0, sprite: "idle.png", music: "assets/music/vs_lancer.mp3" },
  lanino_elnina: { fps: 1, frames: 1, scale: 2.0, sprite: "idle.png", music: "assets/music/tv_game.mp3" },
  mad_dummy: { fps: 4, frames: 4, scale: 1.5, sprite: "idle.png" },
  mettaton_ex: { fps: 1, frames: 1, scale: 1.0, sprite: "idle.png" },
  mettaton_neo: { fps: 1, frames: 1, scale: 1.0, sprite: "idle.png" },
  muffet: { fps: 1, frames: 1, scale: 0.686, sprite: "idle.png" },
  napstablook: { fps: 3, frames: 2, scale: 1.5, sprite: "idle.png", music: "assets/music/ghost_fight.mp3" },
  omega_flowey: { fps: 10, frames: 21, scale: 1.0, sprite: "idle.png" },
  papyrus: { fps: 1, frames: 1, scale: 1.5, sprite: "idle.png", music: "assets/music/nyeh_heh_heh.mp3" },
  queen: { fps: 6, frames: 6, hurt: "hurt.png", scale: 2.0, sprite: "idle.png", music: "assets/music/queen_boss.mp3" },
  rouxls_kaard: { fps: 3, frames: 2, scale: 2.0, sprite: "idle.png", music: "assets/music/rouxls_battle.mp3" },
  royal_guards: { fps: 1, frames: 1, scale: 0.625, sprite: "idle.png", music: "assets/music/enemy_approaching.mp3" },
  sans: { fps: 1, frames: 1, scale: 1.5, sprite: "idle.png" },
  shuttah: { fps: 6, frames: 5, scale: 2.0, sprite: "idle.png", music: "assets/music/rude_buster.mp3" },
  shyren: { fps: 4, frames: 4, scale: 2.0, sprite: "idle.png", music: "assets/music/enemy_approaching.mp3" },
  so_sorry: { fps: 1, frames: 1, scale: 1.0, sprite: "idle.png", music: "assets/music/enemy_approaching.mp3" },
  sound_of_justice: { fps: 1, frames: 1, scale: 2.0, sprite: "idle.png", music: "assets/music/sound_of_justice.mp3" },
  spamton: { fps: 1, frames: 1, hurt: "hurt.png", scale: 2.5, sprite: "idle.png", music: "assets/music/now_s_your_chance.mp3" },
  spamton_neo: { fps: 6, frames: 4, scale: 2.0, sprite: "idle.png", music: "assets/music/big_shot.mp3" },
  sweet_cap_cakes: { fps: 8, frames: 6, scale: 1.25, sprite: "idle.png", music: "assets/music/keygen.mp3" },
  tenna: { fps: 8, frames: 8, scale: 1.5, sprite: "idle.png", music: "assets/music/tenna_battle.mp3" },
  titan: { fps: 6, frames: 7, hurt: "hurt.png", scale: 0.75, sprite: "idle.png", music: "assets/music/titan_battle.mp3" },
  toriel: { fps: 1, frames: 1, hurt: "hurt.png", scale: 1.5, sprite: "idle.png", music: "assets/music/heartache.mp3" },
  undyne: { fps: 5, frames: 4, scale: 1.0, sprite: "idle.png" },
  undyne_undying: { fps: 1, frames: 1, scale: 1.0, sprite: "idle.png" },
};

// Menu and game over music.
const GLOBAL_MUSIC = {
  menu: 'assets/music/start_menu.mp3',
  gameoverUndertale: 'assets/music/determination.mp3',
  gameoverDeltarune: 'assets/music/gameover_dr.mp3'
};
