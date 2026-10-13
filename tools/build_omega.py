# Builds assets/bosses/omega_flowey/scene.png: Omega Flowey's body (640 x 480, like the game's
# screen) put together from the separate parts in the sprite pack. The TV face is drawn in game.
#
#   SPRITE_ARCHIVE="/path/to/UTDR Orgranized Sprite Archive" python3 tools/build_omega.py
import os, sys, math
import numpy as np
from PIL import Image, ImageOps, ImageEnhance, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVE = os.environ.get('SPRITE_ARCHIVE', os.path.join(ROOT, 'archive'))
P = os.path.join(ARCHIVE, 'UNDERTALE Organized Sprite Archive', 'Battle', 'Characters', 'Omega Flowey', 'Parts')
if not os.path.isdir(P):
    raise SystemExit(f'sprite archive not found: {ARCHIVE} (set SPRITE_ARCHIVE)')
out = os.path.join(ROOT, 'assets', 'bosses', 'omega_flowey', 'scene.png')
def L(n, f=0): return Image.open(f'{P}/{n}_{f}.png').convert('RGBA')
W, H = 640, 480
im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
def put(sprite, x, y, flip=False, scale=1.0):
    s = ImageOps.mirror(sprite) if flip else sprite
    if scale != 1: s = s.resize((round(s.width * scale), round(s.height * scale)), Image.LANCZOS)
    im.alpha_composite(s, (round(x), round(y))) if x >= 0 and y >= 0 else paste_clip(s, x, y)
def paste_clip(s, x, y):
    x, y = round(x), round(y)
    cx, cy = max(0, -x), max(0, -y)
    s = s.crop((cx, cy, s.width, s.height))
    im.alpha_composite(s, (x + cx, y + cy))
mirror = lambda x, w: W - x - w
# background pipes, both corners
bg = L('Pipes/spr_bgpipe')
bg = ImageEnhance.Brightness(bg).enhance(0.6)
for sc, x, y in [(1.35, -20, -40)]:
    put(bg, x, y, scale=sc); put(bg, mirror(x, bg.width * sc), y, flip=True, scale=sc)
# pipe rings around the face (segments along arcs)
pp = ImageEnhance.Brightness(L('Pipes/spr_pipepart')).enhance(0.72)
def arc(cx, cy, rx, ry, a0, a1, n, sc=1.0):
    for i in range(n):
        a = a0 + (a1 - a0) * i / (n - 1)
        x = cx + math.cos(a) * rx; y = cy + math.sin(a) * ry
        seg = pp.resize((round(pp.width * 1.25), round(pp.height * 1.25)), Image.LANCZOS).rotate(-math.degrees(a) - 90, expand=True, resample=Image.BICUBIC)
        if sc != 1: seg = seg.resize((round(seg.width * sc), round(seg.height * sc)), Image.LANCZOS)
        put(seg, x - seg.width / 2, y - seg.height / 2)
# ring over the top of the TV and down both sides of the upper eyes
arc(320, 125, 135, 115, math.pi * 1.0, math.pi * 2.0, 16)
# two lower loops around the face
arc(255, 210, 75, 70, math.pi * 0.5, math.pi * 1.5, 9)
arc(385, 210, 75, 70, math.pi * -0.5, math.pi * 0.5, 9)
arc(320, 280, 120, 25, 0, math.pi, 10)
# side stalks + vines + arms
st = L('Side Stalk/spr_sidestalk')
put(st, -130, 70); put(st, mirror(-130, st.width), 70, flip=True)
v = L('Vines/spr_vines_flowey')
put(v, -40, 205); put(v, mirror(-40, v.width), 205, flip=True)
arm = L('Arm/spr_floweyarm')
put(arm, 5, 205); put(arm, mirror(5, arm.width), 205, flip=True)
# upper eyes
e = L('Face/Eye/spr_lefteye_full')
e = e.resize((round(e.width * 1.08), round(e.height * 1.08)), Image.LANCZOS)
put(e, 152, 108); put(e, mirror(152, e.width), 108, flip=True)
# face: flesh, nostrils, flip eyes, mouth
face = Image.new('RGBA', (W, H))
fm = L('Face/spr_floweyx_fleshmound')
for (x, y, sc) in [(250, 126, 1.15), (262, 168, 0.95), (275, 196, 0.75)]:
    f2 = fm.resize((round(fm.width * sc), round(fm.height * sc)), Image.LANCZOS)
    face.alpha_composite(f2, (x, y))
mask = Image.new('L', (W, H), 0)
ImageDraw.Draw(mask).polygon([(242, 132), (398, 132), (392, 175), (368, 222), (272, 222), (248, 175)], fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(3))
face.putalpha(Image.fromarray(np.minimum(np.array(face.getchannel('A')), np.array(mask))))
im.alpha_composite(face)
fe = L('Face/Eye/spr_flipeye_full')
put(fe, 234, 150); put(fe, mirror(234, fe.width), 150, flip=True)
put(L('Face/spr_nostrils'), 289, 136)
put(L('Face/Mouth/spr_floweyx_mouthedge'), 274, 190)
put(L('Face/Mouth/spr_floweyx_mouthl'), 336, 192, flip=True)
put(L('Face/Mouth/spr_floweyx_mouthbridge'), 297, 192)
# (the TV is drawn in game, so its screen can change)
# shrink to the game's 405 px tall screen
im = im.resize((540, 405), Image.LANCZOS)
im.save(out, optimize=True)
print('wrote', out)
