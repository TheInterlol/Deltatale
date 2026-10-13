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
OF = UC + 'Omega Flowey/'
UE = UT + '/Enemies/'
DB = DR + '/Bosses/'
SUITS = DR + '/Enemies/Ch1/# Suits Bullets/'

SPRITES = {
    # Undertale
    'asgore_particle': UC + 'Asgore/Background/spr_orangeparticle',
    'ut_battlebg': UT + '/UI/BG/spr_battlebg',      # frame 0: full grid, frame 1: the Ruins' side grids
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
    'asriel_bg': UC + 'Asriel Dreemurr/Background/spr_asrielbg',
    'asriel_handlightning': UC + 'Asriel Dreemurr/Attacks/Shocker Breaker/spr_handlightning',
    'asriel_sword': UC + 'Asriel Dreemurr/Attacks/Chaos Saber/spr_asriel_sword',
    'asriel_swordsmear': UC + 'Asriel Dreemurr/Attacks/Chaos Saber/spr_asriel_swordsmear',
    'asriel_twinkle': UC + 'Asriel Dreemurr/Attacks/Chaos Saber/spr_asriel_swordtwinkle',
    'asriel_gunarm': UC + 'Asriel Dreemurr/Attacks/Chaos Buster/spr_asriel_gunarm_shot',
    'asriel_redtarget': UC + 'Asriel Dreemurr/Attacks/Chaos Buster/spr_redtarget',
    'asriel_hg_face': UC + 'Asriel Dreemurr/Attacks/Hyper Goner/spr_hypergoner',
    'asriel_hg_debris': UC + 'Asriel Dreemurr/Attacks/Hyper Goner/spr_hg_debris_small',
    'asriel_final_wing': UC + 'Asriel Dreemurr/Final Form/spr_afinal_cosmoswing',
    'asriel_final_face': UC + 'Asriel Dreemurr/Final Form/spr_afinal_face',
    'asriel_final_cry': UC + 'Asriel Dreemurr/Final Form/spr_afinal_face_cry',
    'asriel_final_orb': UC + 'Asriel Dreemurr/Final Form/spr_afinal_orb',
    'asriel_final_stem': UC + 'Asriel Dreemurr/Final Form/spr_afinal_stem',
    'asriel_final_arm': UC + 'Asriel Dreemurr/Final Form/spr_afinal_arm',
    'asriel_final_shoulder': UC + 'Asriel Dreemurr/Final Form/spr_afinal_shoulder',
    'asriel_final_orbwing': UC + 'Asriel Dreemurr/Final Form/spr_afinal_orbwing',
    # the final form's body: the game's reference picture with the black around it removed
    'asriel_final_body': (UC + 'Asriel Dreemurr/Final Form/Unused/spr_afinal_ref', 'keyout'),
    # the wing as a solid shape (the game fills it with the shifting background)
    'asriel_wing_mask': (UC + 'Asriel Dreemurr/Final Form/spr_afinal_cosmoswing', 'fill'),
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
    'mett_discoball': UC + 'Mettaton EX/Attacks/spr_discoball_pl',
    'mett_rec': UC + 'Mettaton EX/Attacks/spr_recbox',
    'mett_rew': UC + 'Mettaton EX/Attacks/spr_rewbox',
    'mett_coreblast': UC + 'Mettaton EX/Attacks/spr_plusbomb_coreblast',
    'muffet_croissant': UE + '04 - Hotland/Muffet/Attacks/spr_croissantl',
    'muffet_donut': UE + '04 - Hotland/Muffet/Attacks/spr_donutbullet',
    'muffet_spider': UE + '04 - Hotland/Muffet/Attacks/spr_spiderbullet1',
    'muffet_cupcake': UE + '04 - Hotland/Muffet/Attacks/spr_cupcakebullet',
    'muffet_pet': UE + '04 - Hotland/Muffet/Attacks/spr_cupcakemonster',
    'omega_eyeshot': UC + 'Omega Flowey/Attacks/Eyeshot/spr_eyeshot_a',
    'omega_eyewarning': OF + 'Attacks/Eyeshot/spr_eyewarning',
    'omega_tv': OF + 'Parts/TV/spr_floweyx_tv',
    'omega_face': OF + 'Parts/TV Face/spr_tv_floweyx_laugh',
    'omega_static': OF + 'Parts/TV Face/spr_tvinside_old',
    'omega_noise': OF + 'Parts/TV Face/spr_noise',
    'omega_warning': OF + 'Parts/TV Face/spr_tv_warning',
    'omega_flame': OF + 'Attacks/Flamethrower/Unused/spr_floweyx_flame',
    'omega_flamestream': OF + 'Attacks/Flamethrower/Flamethrower - Flame/spr_floweyx_flame_move',
    'omega_nuke': OF + 'Attacks/Flowey Nuke/spr_floweynuke',
    'omega_explosion': OF + 'Attacks/Flowey Nuke/Explosion/spr_floweynuke_explosion',
    'omega_handgun': OF + 'Attacks/Handgun/Unused/spr_f_handgun',
    'omega_venus': OF + 'Attacks/Venus Fly Trap/Flytrap - Mouth/spr_venus_placeholder',
    'omega_fly': OF + 'Attacks/Venus Fly Trap/Fly/spr_floweyfly',
    'omega_dentata': OF + 'Attacks/Dentata/Mouthball/spr_mouthball',
    'omega_pellet': OF + 'Attacks/Pellet/spr_spinbullet_cheat',
    'omega_dirbullet': OF + 'Attacks/Pellet/spr_dirbullet',
    'omega_vine': OF + 'Parts/spr_gigavine',
    'omega_mouthflash': OF + 'Attacks/Mouth Beam/spr_mouthflash',
    'omega_mouthbeam': OF + 'Attacks/Mouth Beam/spr_mouthbeam',
    'soul_knife': OF + 'Soul Segments/Aqua/spr_6knife_big',
    'soul_bandage': OF + 'Soul Segments/Aqua/spr_6bandage_big',
    'soul_glove': OF + 'Soul Segments/Orange/spr_6glove',
    'soul_thumbsup': OF + 'Soul Segments/Orange/spr_6glove_thumbsup',
    'soul_shoe': OF + 'Soul Segments/Blue/spr_6shoe',
    'soul_star': OF + 'Soul Segments/Blue/spr_6shoe_star',
    'soul_note': OF + 'Soul Segments/Blue/spr_6shoe_musicnote',
    'soul_book': OF + 'Soul Segments/Purple/spr_6book',
    'soul_pan': OF + 'Soul Segments/Green/spr_6pan',
    'soul_egg': OF + 'Soul Segments/Green/spr_6pan_egg',
    'soul_fire': OF + 'Soul Segments/Green/spr_6pan_fire',
    'soul_gun': OF + 'Soul Segments/Yellow/spr_6gun',
    'soul_bullet': OF + 'Soul Segments/Yellow/spr_6gun_bullet',
    'soul_crosshair': OF + 'Soul Segments/Yellow/spr_6gun_crosshair',
    'soul_crossheart': OF + 'Soul Segments/Yellow/spr_6gun_crosshair_heart',
    'soul_flower': OF + 'Soul Segments/Yellow/spr_6gun_flower',
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
    'scc_speaker': DB + 'Ch2/Sweet Cap_n Cakes/Attacks/spr_musicenemy_boombox',
    'scc_note': DB + 'Ch2/Sweet Cap_n Cakes/Attacks/spr_musical_notes',
    'scc_wave': DB + 'Ch2/Sweet Cap_n Cakes/Attacks/spr_electricity_wave',
    'scc_dancer': DB + 'Ch2/Sweet Cap_n Cakes/Attacks/spr_musicenemy_dancer',
    'knight_diamond':DB + 'Ch3/The Roaring Knight/Ch3/Battle/Attacks/spr_knight_diamondswordbullet',
}

def frames(base):
    files = [f for f in glob.glob(glob.escape(base) + '_*.png')
             if re.fullmatch(re.escape(os.path.basename(base)) + r'_\d+\.png', os.path.basename(f))]
    files.sort(key=lambda f: int(re.search(r'_(\d+)\.png$', f).group(1)))
    return [Image.open(f).convert('RGBA') for f in files]

def flood_outside(im):
    """Pixels connected to the border through black / transparent pixels."""
    w, h = im.size
    px = im.load()
    dark = lambda p: p[3] < 20 or (p[0] < 30 and p[1] < 30 and p[2] < 30)
    seen = [[False] * w for _ in range(h)]
    stack = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y][x] or not dark(px[x, y]): continue
        seen[y][x] = True
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return seen

def process(frame, how):
    im = frame.copy()
    px = im.load()
    out = flood_outside(im)
    for y in range(im.height):
        for x in range(im.width):
            if how == 'keyout':
                if out[y][x]: px[x, y] = (0, 0, 0, 0)
            elif how == 'fill':
                # the sprite is a black card with a see-through wing: fill the wing, drop the card
                p = px[x, y]
                px[x, y] = (255, 255, 255, 255) if p[3] < 20 else ((0, 0, 0, 0) if sum(p[:3]) < 90 else p)
    return im

def main():
    if not os.path.isdir(ARCHIVE):
        raise SystemExit(f'sprite archive not found: {ARCHIVE} (set SPRITE_ARCHIVE)')
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    for name, base in SPRITES.items():
        how = None
        if isinstance(base, tuple): base, how = base
        fr = frames(base)
        if how: fr = [process(f, how) for f in fr]
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
