const Gerson = {
    id: "gerson",
    name: "Old Man Gerson",

    attackTimer: 0,

    init(){
        this.attackTimer = 0;
    },

    update(dt){
        this.attackTimer += dt;
        
        if(this.attackTimer >= 1.2){
            this.attackTimer = 0;
            spawnGersonSpears();
        }
    }
};

function spawnGersonSpears(){
    for(let i = 0; i < 4; i++){
        
        const x = arena.x + 30 + Math.random() * (arena.w - 60);
        const speed = 100 + Math.random() * 60;

        spawnBullet(x, arena.y - 30, 0, speed, 12, "axe01");

    }
}