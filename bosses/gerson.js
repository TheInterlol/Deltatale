const Gerson = registerBoss({
    id: "gerson",
    name: "Old Man Gerson",
    game: "deltarune",
    color: "#7fd18b",
    emblem: "spear",
    music: gersonMusic,

    // ---------- Battle ----------
    player: { name: "SUSIE", maxHp: 120, power: 46 },
    maxHp: 400,
    attack: 24,
    defense: 4,
    gold: 120,
    check: "A legendary hero and an old turtle. The Hammer of Justice still rings.",
    intro: "* Old Man Gerson raised his hammer.\n* \"Hohoho! Let's see what you've got, youngster!\"",
    flavor: [
        "* Gerson leans on his hammer, wheezing.",
        "* His shell shines like in the good old days.",
        "* The air smells of tea and old glory.",
        "* Gerson mutters something about kids these days."
    ],
    lowHpFlavor: "* Gerson is breathing heavily, but still smiling.",
    dialogue: [
        "Hohoho! In my day we dodged axes for breakfast!",
        "Don't be scared, youngster! Move those feet!",
        "Justice swings a heavy hammer!",
        "I've still got a few lessons for you!",
        "Hah! Haven't seen guts like that in ages!"
    ],
    acts: [
        {
            name: "Listen",
            mercy: 25,
            repeatMercy: 10,
            text: "* Susie listened to Gerson's story about old heroes.\n* Gerson got lost in his memories.",
            repeatText: "* Susie listened to another story.\n* ...She's heard this one before."
        },
        {
            name: "Praise",
            mercy: 20,
            repeatMercy: 10,
            text: "* Susie said Gerson's hammer is pretty badass.\n* \"Hohoho! Finally someone with taste!\""
        }
    ],
    box: { w: 120, h: 120 },
    // From the fight: green-SOUL spear arrows, his spinning shell throwing stars and shells,
    // the hammer swung down on half the board, and red hammers thrown like boomerangs.
    attacks: [
        {
            name: "Spear arrows (green SOUL)",
            soul: "green",
            box: { w: 84, h: 84 },
            start(run) {
                run.data.pace = 1.05 + Math.min(0.4, (run.battle ? run.battle.turn : 0) * 0.05);
                run.data.script = makeSpearScript(1 + Math.floor((run.battle ? run.battle.turn : 0) / 3), run.data.pace);
                run.data.next = 0;
                run.data.clock = 0;
            },
            update: (run, dt) => UNDYNE_ATTACKS.green.update(run, dt)
        },
        {
            name: "Shell spin",
            duration: 7,
            update(run) {
                every(run, "star", 0.5 / run.speed, () => gersonStar(), 0.3);
                every(run, "shell", 1.6 / run.speed, () => gersonShell(), 0.8);
            }
        },
        {
            name: "Hammer of Justice",
            duration: 7,
            update(run) {
                every(run, "swing", 1.25 / run.speed, () => gersonSwing(run), 0.3);
                every(run, "star", 1.1 / run.speed, () => gersonStar(), 0.9);
            }
        },
        {
            name: "Hammer throw",
            duration: 6.5,
            update(run) {
                every(run, "boomerang", 0.85 / run.speed, () => spawnGersonBoomerang(run.speed), 0.3);
            }
        }
    ],

    // ---------- Survival ----------
    attackTimer: 0,

    init(){
        this.attackTimer = 0;
        this.anim.frame = 0;
        this.anim.timer = 0;
    },

    update(dt){
        this.attackTimer += dt;

        if(this.attackTimer >= 1.2){
            this.attackTimer = 0;
            spawnGersonSpears();
        }
    },

    // ---------- Sprite ----------
    anim: {
        frame: 0,
        timer: 0,
        frameWidth: 81,
        frameHeight: 63,
        frameCount: 7,
        frameDuration: 0.1
    },

    animate(dt){
        const anim = this.anim;

        anim.timer += dt;

        if(anim.timer >= anim.frameDuration){
            anim.timer = 0;
            anim.frame = (anim.frame + 1) % anim.frameCount;
        }
    },

    draw(cx, cy){
        const anim = this.anim;

        const sx = anim.frame * anim.frameWidth;
        const sy = 0;
        const sw = anim.frameWidth;
        const sh = anim.frameHeight;

        // 2x scale without distortion (a frame is 81x63)
        const drawWidth = sw * 2;
        const drawHeight = sh * 2;

        const x = cx - drawWidth / 2;
        const y = cy - drawHeight / 2;

        if(gersonSheet.complete && gersonSheet.naturalWidth > 0){
            ctx.drawImage(gersonSheet, sx, sy, sw, sh, x, y, drawWidth, drawHeight);
        }else{
            ctx.fillStyle = '#3a7f5a';
            ctx.fillRect(x, y, drawWidth, drawHeight);
        }
    }
});

function spawnGersonSpears(speedMult = 1){
    for(let i = 0; i < 4; i++){

        const x = arena.x + 30 + Math.random() * (arena.w - 60);
        const speed = (100 + Math.random() * 60) * speedMult;

        spawnBullet(x, arena.y - 30, 0, speed, 12, "axe01");

    }
}

// An axe thrown from the side that slows down, turns around and comes back (a boomerang).
// It flies about 300 px, past the middle of the board - otherwise the middle would be safe.
// Every other one aims at the row the SOUL is in.
function spawnGersonBoomerang(speedMult = 1){
    const fromRight = Math.random() > 0.5;
    const x = fromRight ? arena.x + arena.w + 40 : arena.x - 40;
    const aimed = Math.random() > 0.5;
    const randomY = arena.y + 20 + Math.random() * (arena.h - 40);
    const y = aimed ? state.player.y : randomY;
    const dir = fromRight ? -1 : 1;
    const speed = 330 * speedMult;
    const reach = 300;

    const axe = spawnBullet(x, y, dir * speed, 0, 10, "gersonHammer");
    axe.ax = -dir * (speed * speed) / (2 * reach);
}

// stars flung out of his spinning shell, arcing into the board from his side
function gersonStar() {
    const x = arena.x + arena.w + 70;
    const y = arena.y - 20 + Math.random() * 40;
    const tx = arena.x + Math.random() * arena.w;
    const t = 0.9;
    spawn({ kind: "gersonStar", x, y, vx: (tx - x) / t, vy: -120, ay: 2 * (arena.y + arena.h * (0.3 + Math.random() * 0.6) - y + 120 * t) / (t * t), r: 6, maxLife: 3, minLife: 1 });
}

// a green shell sliding across the board, bouncing along its floor
function gersonShell() {
    const fromRight = Math.random() < 0.6;
    spawn({ kind: "gersonShell", x: fromRight ? arena.x + arena.w + 20 : arena.x - 20, y: arena.y + arena.h - 14,
        vx: (fromRight ? -1 : 1) * 150, r: 11, minLife: 1, maxLife: 5, bounceT: 0,
        update(b, dt) {
            b.x += b.vx * dt;
            b.bounceT += dt;
            b.y = arena.y + arena.h - 14 - Math.abs(Math.sin(b.bounceT * 3.2)) * (arena.h - 40);
        } });
}

// the hammer comes down on the left or right half - its outline flashes first
function gersonSwing(run) {
    const left = Math.random() < 0.5;
    const half = arena.w / 2;
    const x = left ? arena.x : arena.x + half;
    warnZone(x, arena.y, half, arena.h, 0.55, 0.22, { kind: "gersonSlam", left, ownWarn: true, clip: false });
}

BULLET_DRAWERS.gersonHammer = b => {
    if (drawArt("gerson_hammer", b.x, b.y, 30, 30, { frame: state.clock * 16 })) return;
    ctx.fillStyle = "#e04040";
    fillCircle(b.x, b.y, b.r);
};

BULLET_DRAWERS.gersonStar = b => {
    if (drawArt("gerson_star", b.x, b.y, 18, 18, { angle: b.life * 6 })) return;
    ctx.fillStyle = "#fff";
    fillCircle(b.x, b.y, b.r);
};

BULLET_DRAWERS.gersonShell = b => {
    if (drawArt("gerson_shell", b.x, b.y, 30, 30, { frame: state.clock * 20 })) return;
    ctx.fillStyle = "#3ddc5a";
    fillCircle(b.x, b.y, b.r);
};

BULLET_DRAWERS.gersonSlam = b => {
    const x = b.x - b.hw;
    const y = b.y - b.hh;
    if (b.life < b.warn) {
        ctx.globalAlpha *= Math.floor(b.life * 14) % 2 ? 0.7 : 0.3;
        if (!drawArt("gerson_telegraph", b.x, b.y, b.hw * 2, b.hh * 2 + 30)) {
            ctx.strokeStyle = "#fff";
            ctx.strokeRect(x + 2, y + 2, b.hw * 2 - 4, b.hh * 2 - 4);
        }
        return;
    }
    // the giant hammer head slams through
    const k = Math.min(1, (b.life - b.warn) / 0.08);
    drawArt("gerson_bighammer", b.x, y - 40 + k * (b.hh * 2), b.hw * 2.2, b.hw * 2.2 * 39 / 67, { flipX: b.left });
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(x, y, b.hw * 2, b.hh * 2);
};

// His arena at night: dark green, with the stained-glass window glowing in changing colours.
Gerson.drawBackdrop = () => {
    const img = attackImage("gerson_arena");
    if (!img) return false;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, 320, 240, 0, -60, 720, 540);
    ctx.fillStyle = "rgba(0, 18, 8, 0.78)";
    ctx.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);
    const colors = ["#3ddc84", "#9a5cff", "#35c8d8", "#d84a8a"];
    ctx.globalAlpha = 0.4 + Math.sin(state.clock * 0.8) * 0.1;
    drawArt("gerson_glass", 360, 56, 214, 124, { tint: colors[Math.floor(state.clock / 3) % colors.length] });
    ctx.restore();
    return true;
};
