import * as Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
    keys: any;
    isDead: boolean = false;
    isHit: boolean = false;
    hp: number = 3;
    coinsCollected: number = 0;

    static preload(scene: Phaser.Scene) {
        scene.load.spritesheet('player_idle', 'slime/IdleSpritesheet.png', {
            frameWidth: 16,
            frameHeight: 16
        });
        scene.load.spritesheet('player_walking', 'slime/BouncingSpritesheet.png', {
            frameWidth: 16,
            frameHeight: 16
        });
        scene.load.spritesheet('player_death', 'slime/DeathSpritesheet.png', {
            frameWidth: 20,
            frameHeight: 20
        });
        scene.load.spritesheet('player_hit', 'slime/HitSpritesheet.png', {
            frameWidth: 16,
            frameHeight: 16
        });
    }

    static createAnims(scene: Phaser.Scene) {
        scene.anims.create({
            key: 'idle',
            frames: scene.anims.generateFrameNumbers('player_idle', { frames: [0, 1, 2, 3, 4, 5, 6] }),
            frameRate: 10,
            repeat: -1
        });
        scene.anims.create({
            key: 'walk',
            frames: scene.anims.generateFrameNumbers('player_walking', { frames: [0, 1, 2, 3, 4, 5, 6] }),
            frameRate: 10,
            repeat: -1
        });
        scene.anims.create({
            key: 'death',
            frames: scene.anims.generateFrameNumbers('player_death', { frames: [0, 1, 2, 3, 4, 5, 6] }),
            frameRate: 18,
            repeat: 0
        });
        scene.anims.create({
            key: 'hit',
            frames: scene.anims.generateFrameNumbers('player_hit', { frames: [0, 1, 2, 3] }),
            frameRate: 10,
            repeat: 0
        });
    }

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
        super(scene, x, y, texture);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.keys = this.scene.input.keyboard?.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            E: Phaser.Input.Keyboard.KeyCodes.E
        }) as any;
        this.setScale(6.0);
        this.setDamping(true);
        this.setDrag(0.0001);
        this.body?.setSize(13, 13);
        this.setGravity(0, 8000);
        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
        }, this);
        this.play('idle');
    }

    takeDamage(dirX: number) {
        if (this.isDead || this.isHit) return;

        this.hp -= 1;
        if (this.hp <= 0) {
            this.isDead = true;
            this.anims.play('death', true);
            if (this.body) this.body.velocity.x = 0;
            this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                this.destroy();
            });
            return;
        }

        // Take damage logic
        this.isHit = true;
        this.anims.play('hit', true);
        this.setVelocityY(-1700); // knockback up
        this.setVelocityX(dirX * 1500); // knockback horizontally

        // Flash red
        this.setTint(0xff0000);

        this.scene.time.delayedCall(400, () => {
            this.clearTint();
            this.isHit = false;
        });
    }

    collectCoin() {
        this.coinsCollected += 1;
    }

    update(_ts: number, _dt: number) {
        if (this.isDead) return;

        if (this.isHit) {
            // Cannot control while in hit stun
            return;
        }

        if (this.keys.left.isDown && this.body) {
            this.anims.play('walk', true);
            this.body.velocity.x -= 100;
            this.setFlipX(true);
        }
        else if (this.keys.right.isDown && this.body) {
            this.anims.play('walk', true);
            this.body.velocity.x += 100;
            this.setFlipX(false);
        }
        else {
            this.anims.play('idle', true);
        }
        if (this.body && this.keys.space.isDown && this.body.blocked.down) {
            this.setVelocityY(-3500);
        }
    }
}