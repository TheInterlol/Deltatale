# Writes assets/bosses/manifest.js from assets/bosses/sprites.json and the music table below.
import json, os
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'bosses')
sprites = json.load(open(OUT + '/sprites.json'))
MUSIC = {
    'toriel': 'heartache', 'napstablook': 'ghost_fight', 'papyrus': 'nyeh_heh_heh',
    'dummy': 'enemy_approaching', 'doggo': 'enemy_approaching', 'dogamy_dogaressa': 'enemy_approaching',
    'greater_dog': 'enemy_approaching', 'shyren': 'enemy_approaching', 'royal_guards': 'enemy_approaching',
    'so_sorry': 'enemy_approaching', 'glyde': 'enemy_approaching', 'glad_dummy': 'enemy_approaching',
    'lancer': 'vs_lancer', 'k_round': 'checker_dance', 'king': 'chaos_king', 'jevil': 'the_world_revolving',
    'rouxls_kaard': 'rouxls_battle', 'sweet_cap_cakes': 'keygen', 'berdly': 'berdly',
    'spamton': 'now_s_your_chance', 'spamton_neo': 'big_shot', 'queen': 'queen_boss', 'giga_queen': 'giga_size',
    'lanino_elnina': 'tv_game', 'shuttah': 'rude_buster', 'tenna': 'tenna_battle', 'knight': 'black_knife',
    'jackenstein': 'pumpkin_boss', 'sound_of_justice': 'sound_of_justice', 'titan': 'titan_battle',
}
entries = {}
for bid in sorted(set(sprites) | set(MUSIC)):
    e = dict(sprites.get(bid, {}))
    if bid in MUSIC: e['music'] = f'assets/music/{MUSIC[bid]}.mp3'
    entries[bid] = e
lines = []
for bid, e in entries.items():
    parts = ', '.join(f"{k}: {json.dumps(v)}" for k, v in e.items())
    lines.append(f"  {bid}: {{ {parts} }},")
header = '''// Boss art and music, built from the sprite and soundtrack packs the project owner supplied
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
'''
open(OUT + '/manifest.js', 'w').write(header + 'const BOSS_ASSETS = {\n' + '\n'.join(lines) + '\n};\n\n'
    + "// Menu and game over music.\nconst GLOBAL_MUSIC = {\n  menu: 'assets/music/start_menu.mp3',\n"
    + "  gameoverUndertale: 'assets/music/determination.mp3',\n  gameoverDeltarune: 'assets/music/gameover_dr.mp3'\n};\n")
print(len(entries), 'entries')
