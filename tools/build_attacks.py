# Builds assets/attacks/<name>.png strips from the sprite archive for projectiles and effects, and
# writes js/attack_art.js (name -> file, frames, frame size). Drawers fall back to code-drawn
# shapes when a sprite is missing.
#
#   SPRITE_ARCHIVE="/path/to/UTDR Orgranized Sprite Archive" python3 tools/build_attacks.py
import os, re, glob, json
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVE = os.environ.get('SPRITE_ARCHIVE', os.path.join(ROOT, 'archive'))
UT = os.path.join(ARCHIVE, 'UNDERTALE Organized Sprite Archive', 'Battle')
DR = os.path.join(ARCHIVE, 'DELTARUNE Organized Sprite Archive', 'Characters')
OUT = os.path.join(ROOT, 'assets', 'attacks')

UC = UT + '/Characters/'
UE = UT + '/Enemies/'
DB = DR + '/Bosses/'
SUITS = DR + '/Enemies/Ch1/# Suits Bullets/'

SPRITES = {
    # Undertale
    'gaster_blaster': UC + 'Sans/Attacks/spr_gasterblaster',
    'sans_bone_top': UC + 'Sans/Attacks/spr_s_bonebul_top',
    'sans_bone_bottom': UC + 'Sans/Attacks/spr_s_bonebul_bottom',
    'pap_bone_top': UC + 'Papyrus/Attacks/spr_bonetop',
    'pap_bone_bottom': UC + 'Papyrus/Attacks/spr_bonebottom',
    'ut_fire': UC + 'Toriel/Attacks/spr_firebullet',
    'toriel_hand': UC + 'Toriel/Attacks/spr_handbullet',
    'undyne_arrow': UC + 'Undyne/Attacks/spr_bullet_testx_arrow',
    'undyne_arrow_blue': UC + 'Undyne/Attacks/spr_bullet_test_r',
    'undyne_spear': UC + 'Undyne/Attacks/spr_uspearbul',
    'undyne_risespear': UC + 'Undyne/Attacks/spr_risespearbullet',
    'asriel_star': UC + 'Asriel Dreemurr/Attacks/Star & Galacta Blazing/spr_regstar',
    'asriel_bigstar': UC + 'Asriel Dreemurr/Attacks/Star & Galacta Blazing/spr_stormstar',
    'asriel_bolt': UC + 'Asriel Dreemurr/Attacks/Shocker Breaker/spr_rainbowbolt',
    'asriel_target': UC + 'Asriel Dreemurr/Attacks/Shocker Breaker/spr_rainbowtarget',
    'asriel_gunbolt': UC + 'Asriel Dreemurr/Attacks/Chaos Buster/spr_asriel_gunbolt',
    'mett_bomb': UC + 'Mettaton EX/Attacks/spr_plusbomb',
    'mett_box': UC + 'Mettaton EX/Attacks/spr_blackbox_pl',
    'mett_heart': UC + 'Mettaton EX/Attacks/spr_mettheart_centered',
    'mett_lightning': UC + 'Mettaton EX/Attacks/spr_mettlightning_pl',
    'mett_leg_l': UC + 'Mettaton EX/Attacks/spr_mettlegbullet_l',
    'mett_leg_r': UC + 'Mettaton EX/Attacks/spr_mettlegbullet_r',
    'mett_parasol': UC + 'Mettaton EX/Attacks/spr_parasolmett',
    'mett_blast_h': UC + 'Mettaton EX/Attacks/spr_plusbomb_horblast',
    'mett_blast_v': UC + 'Mettaton EX/Attacks/spr_plusbomb_verblast',
    'muffet_croissant': UE + '04 - Hotland/Muffet/Attacks/spr_croissantl',
    'muffet_donut': UE + '04 - Hotland/Muffet/Attacks/spr_donutbullet',
    'muffet_spider': UE + '04 - Hotland/Muffet/Attacks/spr_spiderbullet1',
    'muffet_cupcake': UE + '04 - Hotland/Muffet/Attacks/spr_cupcakebullet',
    'muffet_pet': UE + '04 - Hotland/Muffet/Attacks/spr_cupcakemonster',
    'omega_eyeshot': UC + 'Omega Flowey/Attacks/Eyeshot/spr_eyeshot_a',
    # Deltarune
    'dr_spade': SUITS + 'spr_spadebullet',
    'dr_club': SUITS + 'spr_clubsbullet',
    'dr_diamond': SUITS + 'spr_diamondbullet',
    'dr_heart': SUITS + 'spr_heartbullet',
    'jevil_bomb_spade': DB + 'Ch1/Jevil/Attacks/spr_bomb_spade',
    'jevil_bomb_club': DB + 'Ch1/Jevil/Attacks/spr_bomb_club',
    'jevil_bomb_heart': DB + 'Ch1/Jevil/Attacks/spr_bomb_heart',
    'jevil_bomb_diamond': DB + 'Ch1/Jevil/Attacks/spr_bomb_diamond',
    'jevil_carousel': DB + 'Ch1/Jevil/Attacks/spr_carousel',
    'jevil_scythe': DB + 'Ch1/Jevil/Attacks/spr_joker_scythebody',
    'sneo_head': DB + 'Ch2/Spamton NEO/Attacks/spr_sneo_crew',
    'sneo_mail': DB + 'Ch2/Spamton NEO/Attacks/spr_sneo_mail',
    'sneo_phonehand': DB + 'Ch2/Spamton NEO/Attacks/spr_sneo_phonehand',
    'sneo_wireheart': DB + 'Ch2/Spamton NEO/Attacks/spr_sneo_wireheart',
    'sneo_bullet': DB + 'Ch2/Spamton NEO/Attacks/spr_sneo_bullet0',
    'knight_diamond': DB + 'Ch3/The Roaring Knight/Ch3/Battle/Attacks/spr_knight_diamondswordbullet',
}

def frames(base):
    files = [f for f in glob.glob(glob.escape(base) + '_*.png')
             if re.fullmatch(re.escape(os.path.basename(base)) + r'_\d+\.png', os.path.basename(f))]
    files.sort(key=lambda f: int(re.search(r'_(\d+)\.png$', f).group(1)))
    return [Image.open(f).convert('RGBA') for f in files]

def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    for name, base in SPRITES.items():
        fr = frames(base)
        if not fr:
            print('missing', name, base)
            continue
        w = max(f.width for f in fr)
        h = max(f.height for f in fr)
        strip = Image.new('RGBA', (w * len(fr), h))
        for i, f in enumerate(fr):
            strip.alpha_composite(f, (i * w + (w - f.width) // 2, (h - f.height) // 2))
        strip.save(os.path.join(OUT, name + '.png'), optimize=True)
        meta[name] = {'frames': len(fr), 'w': w, 'h': h}
    lines = [f"  {k}: {{ frames: {v['frames']}, w: {v['w']}, h: {v['h']} }}," for k, v in sorted(meta.items())]
    js = ('// Projectile and effect sprites (assets/attacks/<name>.png, a strip of `frames` frames of w x h),\n'
          '// built by tools/build_attacks.py from the supplied sprite pack. See js/attackart.js.\n'
          'const ATTACK_ART = {\n' + '\n'.join(lines) + '\n};\n')
    open(os.path.join(ROOT, 'js', 'attack_art.js'), 'w').write(js)
    print(len(meta), 'sprites')

if __name__ == '__main__':
    main()
