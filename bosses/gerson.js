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
    attacks: [
        {
            name: "Falling axes",
            duration: 6,
            update(run) {
                every(run, "axes", 1.2 / run.speed, () => spawnGersonSpears(run.speed), 0.4);
            }
        },
        {
            name: "Boomerangs",
            duration: 6.5,
            update(run) {
                every(run, "boomerang", 0.9 / run.speed, () => spawnGersonBoomerang(run.speed), 0.3);
            }
        },
        {
            name: "Hammer of Justice",
            duration: 8,
            update(run) {
                every(run, "axes", 1.4 / run.speed, () => spawnGersonSpears(run.speed), 0.4);
                every(run, "boomerang", 1.6 / run.speed, () => spawnGersonBoomerang(run.speed), 1);
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

    const axe = spawnBullet(x, y, dir * speed, 0, 12, "axe01");
    axe.ax = -dir * (speed * speed) / (2 * reach);
}
