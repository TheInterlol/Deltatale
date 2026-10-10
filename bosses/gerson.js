const Gerson = registerBoss({
    id: "gerson",
    name: "Old Man Gerson",
    music: gersonMusic,

    // ---------- Bitva ----------
    maxHp: 400,
    attack: 4,
    defense: 4,
    gold: 120,
    check: "Legendární hrdina a želví stařec. Kladivo spravedlnosti pořád zvoní.",
    intro: "* Old Man Gerson pozvedl kladivo.\n* \"Hohoho! Tak ukaž, co v tobě je, mladá!\"",
    flavor: [
        "* Gerson se opírá o kladivo a supí.",
        "* Pancíř se blýská jako za starých časů.",
        "* Vzduchem se nese vůně čaje a dávné slávy.",
        "* Gerson si mumlá něco o dnešní mládeži."
    ],
    lowHpFlavor: "* Gerson těžce oddechuje, ale pořád se usmívá.",
    dialogue: [
        "Hohoho! Za mých časů jsme uhýbali i sekerám!",
        "Nenech se zastrašit, mladá! Hýbej se!",
        "Spravedlnost má těžké kladivo!",
        "Ještě ti dám pár lekcí!",
        "Hah! Takovou kuráž jsem dlouho neviděl!"
    ],
    acts: [
        {
            name: "Poslouchat",
            mercy: 25,
            repeatMercy: 10,
            text: "* Susie poslouchala Gersonův příběh o dávných hrdinech.\n* Gerson se zasnil.",
            repeatText: "* Susie poslouchala další příběh.\n* Ten už ale slyšela..."
        },
        {
            name: "Pochválit",
            mercy: 20,
            repeatMercy: 10,
            text: "* Susie řekla, že Gersonovo kladivo je fakt drsný.\n* \"Hohoho! Konečně někdo s vkusem!\""
        }
    ],
    attacks: [
        {
            name: "Padající sekery",
            duration: 6,
            update(run) {
                every(run, "axes", 1.2 / run.speed, () => spawnGersonSpears(run.speed), 0.4);
            }
        },
        {
            name: "Bumerangy",
            duration: 6.5,
            update(run) {
                every(run, "boomerang", 0.9 / run.speed, () => spawnGersonBoomerang(run.speed), 0.3);
            }
        },
        {
            name: "Kladivo spravedlnosti",
            duration: 8,
            update(run) {
                every(run, "axes", 1.4 / run.speed, () => spawnGersonSpears(run.speed), 0.4);
                every(run, "boomerang", 1.6 / run.speed, () => spawnGersonBoomerang(run.speed), 1);
            }
        }
    ],

    // ---------- Přežití ----------
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

        // 2x zvětšení bez deformace (snímek je 81x63)
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

// Sekera hozená zboku, která se zpomalí, otočí a vrátí zpátky (jako bumerang).
// Doletí asi 300 px, tedy přes střed arény - jinak by byl střed bezpečné místo.
// Každá druhá míří do řádku, kde je zrovna srdce.
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
