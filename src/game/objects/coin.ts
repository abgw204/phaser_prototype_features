import * as Phaser from 'phaser';

export class Coin extends Phaser.Physics.Arcade.Sprite {
    static preload(scene: Phaser.Scene) {
        scene.load.spritesheet('coin', 'coinsSpritesheet.png', {
            frameWidth: 8,
            frameHeight: 8
        });
    }

    static createAnims(scene: Phaser.Scene) {
        scene.anims.create({
            key: 'coin_spin',
            frames: scene.anims.generateFrameNumbers('coin', { start: 0, end: 7 }),
            frameRate: 9,
            repeat: -1
        });
    }

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'coin');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(8); // Adjust scale as needed
        this.body?.setSize(10, 10);

        // Coins don't move or have gravity, they just stay in the air
        if (this.body) {
            (this.body as Phaser.Physics.Arcade.Body).allowGravity = false;
            this.body.immovable = true;
        }

        this.play('coin_spin');
    }
}
