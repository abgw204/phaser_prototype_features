import * as Phaser from 'phaser';
import { InteractionComponent } from './interactionComponent';

export class Npc extends Phaser.Physics.Arcade.Sprite {
    interaction: InteractionComponent;

    static preload(scene: Phaser.Scene) {
        scene.load.spritesheet('npc_idle', 'npcIdle.png', {
            frameWidth: 64,
            frameHeight: 64
        });
    }

    static createAnims(scene: Phaser.Scene) {
        scene.anims.create({
            key: 'npc_idle_anim',
            frames: scene.anims.generateFrameNumbers('npc_idle', { frames: [0] }),
            frameRate: 6,
            repeat: -1
        });
    }

    constructor(scene: Phaser.Scene, x: number, y: number, dialogText: string) {
        super(scene, x, y, 'npc_idle');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(4.0);

        if (this.body) {
            this.body.immovable = true;
            (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        }

        this.play('npc_idle_anim');

        this.interaction = new InteractionComponent(scene, this, {
            dialogText: dialogText,
            gapX: 30,
            gapY: 0
        });

        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
        }, this);
    }

    setPlayerTracking(player: Phaser.Physics.Arcade.Sprite) {
        this.interaction.setPlayerTracking(player);
    }

    update(_ts: number, _dt: number) {
        this.interaction.update();
    }
}

