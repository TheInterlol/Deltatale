from build_sprites import frames, layered, side_by_side, ut, dr

UB = 'Battle/Characters/'
UE = 'Battle/Enemies/'
DB = 'Characters/Bosses/'

def F(path, base):
    return lambda: frames(base(path))

SPECS = {
    # ---------------- Undertale (full sprites) ----------------
    'dummy': {'idle': F(UE + '01 - Ruins/Dummy/spr_dummybattle', ut), 'height': 110, 'fps': 2},
    'napstablook': {'idle': F(UE + '01 - Ruins/Napstablook/spr_napstabattle', ut), 'height': 110, 'fps': 3},
    'toriel': {'idle': F(UB + 'Toriel/spr_torielboss', ut), 'hurt': F(UB + 'Toriel/spr_torielboss_hurt', ut), 'height': 140, 'fps': 1},
    'doggo': {'idle': lambda: layered([
        (ut(UE + '02 - Snowdin/Canine Unit/Doggo/Parts/spr_movedogetail'), 0, 0),
        (ut(UE + '02 - Snowdin/Canine Unit/Doggo/Parts/spr_movedogebody'), 0, 0),
        (ut(UE + '02 - Snowdin/Canine Unit/Doggo/Parts/spr_movedogearms'), 0, 0),
        (ut(UE + '02 - Snowdin/Canine Unit/Doggo/Head/spr_movedogeheada'), 0, 0)]), 'height': 140, 'fps': 6},
    'dogamy_dogaressa': {'idle': lambda: side_by_side([
        frames(ut(UE + '02 - Snowdin/Canine Unit/Dogamy & Dogaressa/Dogamy/spr_mandognormal')),
        frames(ut(UE + '02 - Snowdin/Canine Unit/Dogamy & Dogaressa/Dogaressa/spr_womandognormal'))], gap=0), 'height': 120, 'fps': 6},
    'greater_dog': {'idle': F(UE + '02 - Snowdin/Canine Unit/Greater Dog/spr_greatdog_n', ut), 'height': 140, 'fps': 2},
    'papyrus': {'idle': F(UB + 'Papyrus/spr_papyrusboss_anim', ut), 'height': 150, 'fps': 1},
    'shyren': {'idle': F(UE + '03 - Waterfall/Shyren/spr_shyren_sing', ut), 'height': 120, 'fps': 4},
    'mad_dummy': {'idle': lambda: layered([
        (ut(UE + '03 - Waterfall/Mad Dummy/Parts/spr_maddum_base'), 3, 51),
        (ut(UE + '03 - Waterfall/Mad Dummy/Parts/spr_maddum_leg'), 1, 39),
        (ut(UE + '03 - Waterfall/Mad Dummy/Parts/spr_maddum_torso'), 0, 18),
        (ut(UE + '03 - Waterfall/Mad Dummy/Faces/spr_maddum_head'), -3, 0)], count=4), 'height': 110, 'fps': 4},
    'glad_dummy': {'idle': F(UE + '03 - Waterfall/Mad Dummy/spr_dummybattle_glad', ut), 'height': 110, 'fps': 2},
    'undyne': {'idle': lambda: layered([
        (ut(UB + 'Undyne/Armor/Armor - Parts/spr_undyneb_legs'), 20, 86), (ut(UB + 'Undyne/Armor/Armor - Parts/spr_undyneb_pants'), 24, 70),
        (ut(UB + 'Undyne/Armor/Armor - Parts/spr_undyneb_rightarm'), 58, 42), (ut(UB + 'Undyne/Armor/Armor - Parts/spr_undyneb_armor'), 9, 40),
        (ut(UB + 'Undyne/Armor/Armor - Parts/spr_undyneb_leftarm'), 0, 30), (ut(UB + 'Undyne/spr_undyneb_hair'), 30, 0),
        (ut(UB + 'Undyne/Head/spr_undyneb_face'), 26, 14)], count=4), 'height': 150, 'fps': 5},
    'sans': {'idle': lambda: layered([
        (ut(UB + 'Sans/Parts/spr_sansb_legs'), 5, 64), (ut(UB + 'Sans/Parts/spr_sans_bbody'), 0, 28),
        (ut(UB + 'Sans/Head/spr_sansb_face'), 11, 0)], count=1), 'height': 120, 'fps': 1},
    'asgore': {'idle': lambda: layered([
        (ut(UB + 'Asgore/Battle - Parts/spr_asgoreb_cape'), 0, 64), (ut(UB + 'Asgore/Battle - Parts/spr_asgoreb_feet'), 37, 150),
        (ut(UB + 'Asgore/Battle - Parts/spr_asgoreb_legs'), 48, 124), (ut(UB + 'Asgore/Battle - Parts/spr_asgoreb_dress'), 47, 96),
        (ut(UB + 'Asgore/Battle - Parts/spr_asgoreb_armor'), 22, 44), (ut(UB + 'Asgore/Battle - Parts/spr_asgoreb_arml'), 26, 80),
        (ut(UB + 'Asgore/Battle - Parts/spr_asgoreb_armr'), 110, 80), (ut(UB + 'Asgore/Head/spr_asgoreb_head1'), 56, 6)], count=1),
        'height': 165, 'fps': 1},
    'mettaton_ex': {'idle': lambda: layered([
        (ut(UB + 'Mettaton EX/Parts/spr_mettleg3'), 46, 88), (ut(UB + 'Mettaton EX/Parts/spr_mettleg1'), 56, 86),
        (ut(UB + 'Mettaton EX/Parts/spr_mettb_upperbody'), 18, 32), (ut(UB + 'Mettaton EX/Parts/spr_mettarm1'), 0, 48),
        (ut(UB + 'Mettaton EX/Parts/spr_mettarm6'), 82, 38), (ut(UB + 'Mettaton EX/Faces/spr_mettface1'), 35, 26)], count=1),
        'height': 160, 'fps': 1},
    'omega_flowey': {'idle': lambda: layered([
        (ut(UB + 'Omega Flowey/Parts/TV/spr_floweyx_tv'), 0, 0),
        (ut(UB + 'Omega Flowey/Parts/TV Face/spr_tv_floweyx_laugh'), 50, 40)]), 'height': 150, 'fps': 10},
    'asriel': {'idle': F(UB + 'Asriel Dreemurr/God of Hyperdeath/spr_asriel_afterimager_full', ut), 'height': 150, 'fps': 1},
    'undyne_undying': {'idle': F(UB + 'Undyne/Undyne the Undying/spr_undynex_example', ut), 'height': 150, 'fps': 1},
    'royal_guards': {'idle': lambda: side_by_side([
        frames(ut(UE + '04 - Hotland/Royal Guards/spr_bara01hurt')),
        frames(ut(UE + '04 - Hotland/Royal Guards/spr_bara02hurt'))], gap=0), 'height': 130, 'fps': 1},
    'muffet': {'idle': F(UE + '04 - Hotland/Muffet/spr_muffethurt', ut), 'height': 140, 'fps': 1},
    'glyde': {'idle': F(UE + '02 - Snowdin/Glyde/spr_glyde_hurt', ut), 'height': 130, 'fps': 1},
    'so_sorry': {'idle': F(UE + '04 - Hotland/So Sorry/spr_sorry_d', ut), 'height': 140, 'fps': 1},
    'mettaton_neo': {'idle': lambda: layered([
        (ut(UB + 'Mettaton NEO/spr_mneo_legs'), 0, 64),
        (ut(UB + 'Mettaton NEO/spr_mneo_body'), 3, 0)], count=1), 'height': 140, 'fps': 1},

    # ---------------- Deltarune ----------------
    'lancer': {'idle': F('Characters/NPCs/Dark World/Ch1/Lancer/Ch1/Battle/spr_lancerbike', dr),
               'hurt': F('Characters/NPCs/Dark World/Ch1/Lancer/Ch1/Battle/spr_lancerbike_hurt', dr), 'height': 92, 'fps': 8},
    'k_round': {'idle': F(DB + 'Ch1/K. Round/Ch1/Battle/Idle/spr_checkers_idle', dr), 'height': 150, 'fps': 8},
    'king': {'idle': F(DB + 'Ch1/King/Ch1/spr_chainking_idle', dr), 'hurt': F(DB + 'Ch1/King/Ch1/spr_chainking_hurt', dr), 'height': 150, 'fps': 6},
    'jevil': {'idle': F(DB + 'Ch1/Jevil/Body/spr_joker_dance', dr), 'height': 96, 'fps': 10},
    'rouxls_kaard': {'idle': F(DB + 'Ch1/Rouxls Kaard/Ch1/spr_rurus_idle', dr), 'height': 114, 'fps': 3},
    'sweet_cap_cakes': {'idle': lambda: side_by_side([
        frames(dr(DB + 'Ch2/Sweet Cap_n Cakes/Sweet/Ch2/spr_sweet_idle')),
        frames(dr(DB + 'Ch2/Sweet Cap_n Cakes/Cap_n/Ch2/spr_hatguy_idle')),
        frames(dr(DB + 'Ch2/Sweet Cap_n Cakes/K_K/Ch2/spr_kk_static'))]), 'height': 110, 'scale': 1.25, 'fps': 8},
    'berdly': {'idle': F('Characters/NPCs/Light World/Berdly/Ch2/Dark World/Battle/spr_berdlyb_idle', dr),
               'hurt': F('Characters/NPCs/Light World/Berdly/Ch2/Dark World/Battle/spr_berdly_hurt_kneel_battle', dr), 'height': 86, 'fps': 6},
    'spamton': {'idle': F(DB + 'Ch2/Spamton/spr_spamton_idle', dr), 'hurt': F(DB + 'Ch2/Spamton/spr_spamton_hurt', dr), 'height': 86, 'fps': 1},
    'queen': {'idle': F(DB + 'Ch2/Queen/Ch2/spr_queen_chair_1_battle', dr), 'hurt': F(DB + 'Ch2/Queen/Ch2/spr_queen_hurt', dr), 'height': 160, 'fps': 6},
    'giga_queen': {'idle': F(DB + 'Ch2/Giga Queen/Battle/spr_bqueen_idle', dr), 'hurt': F(DB + 'Ch2/Giga Queen/Battle/spr_bqueen_hurt', dr), 'height': 170, 'fps': 3},
    'spamton_neo': {'idle': lambda: layered([
        (dr(DB + 'Ch2/Spamton NEO/Parts/spr_sneo_wingr'), 0, 0),
        (dr(DB + 'Ch2/Spamton NEO/Parts/spr_sneo_legr'), 0, 0),
        (dr(DB + 'Ch2/Spamton NEO/Parts/spr_sneo_armr'), 0, 0),
        (dr(DB + 'Ch2/Spamton NEO/Parts/spr_sneo_body'), 0, 0),
        (dr(DB + 'Ch2/Spamton NEO/Parts/spr_sneo_legl'), 0, 0),
        (dr(DB + 'Ch2/Spamton NEO/Parts/spr_sneo_head'), 0, 0),
        (dr(DB + 'Ch2/Spamton NEO/Parts/spr_sneo_arml'), 0, 0),
        (dr(DB + 'Ch2/Spamton NEO/Parts/spr_sneo_wingl'), 0, 0)], count=4), 'height': 170, 'fps': 6},
    'lanino_elnina': {'idle': lambda: side_by_side([
        frames(dr(DB + 'Ch3/Lanino & Elnina/Lanino/Ch3/spr_lanino_idle_right')),
        frames(dr(DB + 'Ch3/Lanino & Elnina/Elnina/Ch3/spr_elnina_idle_left'))], gap=2), 'height': 120, 'fps': 1},
    'shuttah': {'idle': F('Characters/Enemies/Ch3/Shuttah/spr_shutta_idle', dr), 'height': 130, 'fps': 6},
    'tenna': {'idle': lambda: layered([(dr(DB + 'Ch3/Tenna/Battle/Poses & Animations/Parts/' + n), 0, 0) for n in [
        'spr_tenna_battle_arm_back', 'spr_tenna_battle_tails', 'spr_tenna_battle_legs', 'spr_tenna_battle_torso',
        'spr_tenna_battle_tie', 'spr_tenna_battle', 'spr_tenna_battle_face', 'spr_tenna_battle_arm_front']], count=8),
        'height': 165, 'fps': 8},
    'knight': {'idle': F(DB + 'Ch3/The Roaring Knight/Ch3/Battle/spr_roaringknight_idle', dr), 'height': 170, 'fps': 1},
    'jackenstein': {'idle': lambda: layered([
        (dr(DB + 'Ch4/Jackenstein/Overworld/Parts/spr_jackenstein_layer_1_arm_left'), 0, 0),
        (dr(DB + 'Ch4/Jackenstein/Overworld/Parts/spr_jackenstein_layer_2_feet'), 0, 0),
        (dr(DB + 'Ch4/Jackenstein/Overworld/Parts/spr_jackenstein_layer_3_waist'), 0, 0),
        (dr(DB + 'Ch4/Jackenstein/Overworld/Parts/spr_jackenstein_layer_4_torso'), 0, 0),
        (dr(DB + 'Ch4/Jackenstein/Overworld/Parts/spr_jackenstein_layer_5_arm_right'), 0, 0),
        (dr(DB + 'Ch4/Jackenstein/Overworld/Parts/spr_jackenstein_layer_6_head'), 0, 0),
        (dr(DB + 'Ch4/Jackenstein/Battle/spr_jackenstein_battle_eyes'), 0, 0)]), 'height': 170, 'fps': 6},
    'gerson': {'idle': F(DB + 'Ch4/Gerson/Battle/Hammer of Justice/spr_gerson_idle', dr),
               'hurt': F(DB + 'Ch4/Gerson/Battle/Hammer of Justice/spr_gerson_hurt2', dr), 'height': 110, 'fps': 10},
    'sound_of_justice': {'idle': lambda: frames(dr(DB + 'Ch4/Gerson/Battle/Sound of Justice/spr_statue_sound_of_justice_crumble'))[:1],
                         'height': 130, 'fps': 1},
    'titan': {'idle': lambda: layered([
        (dr(DB + 'Ch4/Titan/Battle/Body/Wings/Layer 1/Idle/spr_titan_0_backwing'), 0, 0),
        (dr(DB + 'Ch4/Titan/Battle/Body/Wings/Layer 2/Idle/spr_titan_1_backwing'), 0, 0),
        (dr(DB + 'Ch4/Titan/Battle/Body/Wings/Layer 3/Idle/spr_titan_2_backwing'), 0, 0),
        (dr(DB + 'Ch4/Titan/Battle/Body/Wings/Layer 4/Idle/spr_titan_3_backwing'), 0, 0),
        (dr(DB + 'Ch4/Titan/Battle/Body/Body/Rumble/spr_titan_rumble'), 0, 0),
        (dr(DB + 'Ch4/Titan/Battle/Body/Wings/Layer 5/Idle/spr_titan_5_backwing'), 0, 0),
        (dr(DB + 'Ch4/Titan/Battle/Body/Wings/Layer 6/Idle/spr_titan_6_backwing'), 0, 0),
        (dr(DB + 'Ch4/Titan/Battle/Body/Wings/Layer 7/Idle/spr_titan_7_backwing'), 0, 0)]),
        'hurt': F(DB + 'Ch4/Titan/Battle/Body/Body/Hurt/spr_titan_hurt', dr), 'height': 150, 'scale': 0.75, 'fps': 6},
}
