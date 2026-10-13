# Builds assets/bosses/<id>/idle.png (+ hurt.png) strips from the "UTDR Organized Sprite Archive"
# pack and writes assets/bosses/sprites.json (frames, fps, scale); then run gen_manifest.py.
#
#   SPRITE_ARCHIVE="/path/to/UTDR Orgranized Sprite Archive" python3 tools/build_sprites.py [boss ids...]
#
# The archive itself is not part of the repository.
import os, re, glob, json, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVE = os.environ.get('SPRITE_ARCHIVE', os.path.join(ROOT, 'archive'))
UT = os.path.join(ARCHIVE, 'UNDERTALE Organized Sprite Archive')
DR = os.path.join(ARCHIVE, 'DELTARUNE Organized Sprite Archive')
OUT = os.path.join(ROOT, 'assets', 'bosses')

def frames(pattern):
    """All frames of a sprite: pattern without the _N.png suffix (relative to UT/ or DR/)."""
    files = glob.glob(glob.escape(pattern) + '_*.png')
    def idx(f):
        m = re.search(r'_(\d+)\.png$', f)
        return int(m.group(1)) if m else 0
    files = [f for f in files if re.fullmatch(re.escape(os.path.basename(pattern)) + r'_\d+\.png', os.path.basename(f))]
    files.sort(key=idx)
    if not files:
        raise SystemExit(f'no frames for {pattern}')
    return [Image.open(f).convert('RGBA') for f in files]

def ut(p): return os.path.join(UT, p)
def dr(p): return os.path.join(DR, p)

def layered(layers, count=None):
    """layers: [(pattern, dx, dy)] composited in order; animated layers cycle."""
    loaded = [(frames(p), dx, dy) for p, dx, dy in layers]
    n = count or max(len(f) for f, _, _ in loaded)
    w = max(dx + f[0].width for f, dx, dy in loaded)
    h = max(dy + f[0].height for f, dx, dy in loaded)
    out = []
    for i in range(n):
        im = Image.new('RGBA', (w, h))
        for f, dx, dy in loaded:
            fr = f[i % len(f)]
            im.alpha_composite(fr, (dx, dy))
        out.append(im)
    return out

def side_by_side(groups, gap=6):
    n = max(len(g) for g in groups)
    w = sum(g[0].width for g in groups) + gap * (len(groups) - 1)
    h = max(g[0].height for g in groups)
    out = []
    for i in range(n):
        im = Image.new('RGBA', (w, h))
        x = 0
        for g in groups:
            fr = g[i % len(g)]
            im.alpha_composite(fr, (x, h - fr.height))
            x += g[0].width + gap
        out.append(im)
    return out

def crop_common(frames_list):
    """Trim the transparent border shared by all frames."""
    box = None
    for f in frames_list:
        b = f.getbbox()
        if not b: continue
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    return [f.crop(box) for f in frames_list] if box else frames_list

def save_strip(frames_list, path):
    w = max(f.width for f in frames_list)
    h = max(f.height for f in frames_list)
    strip = Image.new('RGBA', (w * len(frames_list), h))
    for i, f in enumerate(frames_list):
        strip.alpha_composite(f, (i * w + (w - f.width) // 2, h - f.height))
    strip.save(path, optimize=True)
    return w, h

def build(only=None):
    if not os.path.isdir(ARCHIVE):
        raise SystemExit(f'sprite archive not found: {ARCHIVE} (set SPRITE_ARCHIVE)')
    from sprite_specs import SPECS
    meta = {}
    path = os.path.join(OUT, 'sprites.json')
    if os.path.exists(path):
        meta = json.load(open(path))
    for bid, spec in SPECS.items():
        if only and bid not in only: continue
        os.makedirs(os.path.join(OUT, bid), exist_ok=True)
        idle = crop_common(spec['idle']())
        w, h = save_strip(idle, os.path.join(OUT, bid, 'idle.png'))
        # pixel art looks best at whole or half steps
        raw = spec.get('height', 130) / h
        scale = max(0.5, round(raw * 2) / 2) if raw >= 0.75 else round(raw, 3)
        entry = {'sprite': 'idle.png', 'frames': len(idle), 'fps': spec.get('fps', 6), 'scale': scale}
        if spec.get('scale'): entry['scale'] = spec['scale']
        if 'hurt' in spec:
            hurt = crop_common(spec['hurt']())
            save_strip(hurt[:1], os.path.join(OUT, bid, 'hurt.png'))
            entry['hurt'] = 'hurt.png'
        if spec.get('offsetY'): entry['offsetY'] = spec['offsetY']
        meta[bid] = entry
        print(bid, len(idle), 'frames', w, 'x', h, 'scale', entry['scale'])
    json.dump(meta, open(path, 'w'), indent=1, sort_keys=True)

if __name__ == '__main__':
    build(sys.argv[1:] or None)
