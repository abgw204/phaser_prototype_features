import * as Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
    keys: any;
    isDead: boolean = false;
    isHit: boolean = false;
    hp: number = 3;
    coinsCollected: number = 0;
    isInDialogue: boolean = false;
    isInspecting: boolean = false;

    static preload(scene: Phaser.Scene) {
        scene.load.spritesheet('player_walk', 'player-walk.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        scene.load.spritesheet('player_inspect', 'player-inspect.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        scene.load.audio('magnifying_up', 'sound/magnifying_up.mp3');
        scene.load.audio('magnifying_down', 'sound/magnifying_down.mp3');
    }

    static createAnims(scene: Phaser.Scene) {
        scene.anims.create({
            key: 'idle',
            frames: scene.anims.generateFrameNumbers('player_walk', { frames: [0] }),
            frameRate: 10,
            repeat: -1
        });
        scene.anims.create({
            key: 'walk',
            frames: scene.anims.generateFrameNumbers('player_walk', { frames: [1, 2, 3, 4, 5, 6, 7, 0] }),
            frameRate: 10,
            repeat: -1
        });
        scene.anims.create({
            key: 'inspect',
            frames: scene.anims.generateFrameNumbers('player_inspect', { frames: [0, 1, 2, 3, 4, 5] }),
            frameRate: 14,
            repeat: 0
        });
        scene.anims.create({
            key: 'stop_inspect',
            frames: scene.anims.generateFrameNumbers('player_inspect', { frames: [3, 2, 1, 0] }),
            frameRate: 14,
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
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            E: Phaser.Input.Keyboard.KeyCodes.E,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT
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
        this.play('inspect');
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
        if (this.isDead || this.isInDialogue) return;

        if (this.isHit) {
            // Cannot control while in hit stun
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.shift)) {
            this.isInspecting = !this.isInspecting;
            this.scene.events.emit('inspect-mode-toggled', this.isInspecting);
            if (this.isInspecting) {
                this.anims.play('inspect', true);
                this.scene.sound.play('magnifying_up');
            } else {
                this.anims.play('stop_inspect', true);
                this.scene.sound.play('magnifying_down');
            }
        }

        const isStopInspectPlaying = this.anims.currentAnim?.key === 'stop_inspect' && this.anims.isPlaying;

        const leftDown = this.keys.left.isDown || this.keys.a.isDown;
        const rightDown = this.keys.right.isDown || this.keys.d.isDown;
        const jumpDown = this.keys.space.isDown || this.keys.up.isDown || this.keys.w.isDown;

        if (leftDown && this.body) {
            if (!this.isInspecting && !isStopInspectPlaying) this.anims.play('walk', true);
            this.body.velocity.x -= this.isInspecting ? 25 : 90;
            this.setFlipX(true);
        }
        else if (rightDown && this.body) {
            if (!this.isInspecting && !isStopInspectPlaying) this.anims.play('walk', true);
            this.body.velocity.x += this.isInspecting ? 25 : 90;
            this.setFlipX(false);
        }
        else if (!this.isInspecting && !isStopInspectPlaying) {
            this.anims.play('idle', true);
        }

        if (this.body && jumpDown && this.body.blocked.down && !this.isInspecting && !isStopInspectPlaying) {
            this.setVelocityY(-2600);
        }
    }
}
