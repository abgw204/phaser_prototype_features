import * as Phaser from 'phaser';

export class Npc extends Phaser.Physics.Arcade.Sprite {
    promptContainer: Phaser.GameObjects.Container;
    promptText: Phaser.GameObjects.Text;
    promptBg: Phaser.GameObjects.Rectangle;
    playerRef: Phaser.Physics.Arcade.Sprite | null = null;
    isPromptVisible: boolean = false;
    interactionDistance: number = 130;
    
    dialogContainer: Phaser.GameObjects.Container;
    isDialogVisible: boolean = false;

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

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'npc_idle');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(4.0);

        if (this.body) {
            this.body.immovable = true;
            (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        }

        this.play('npc_idle_anim');

        // Create the Interaction Prompt UI ('E' inside a black box)
        this.promptContainer = scene.add.container(x, y - 20);
        this.promptBg = scene.add.rectangle(0, 0, 30, 30, 0x000000, 0.8)
            .setStrokeStyle(2, 0xffffff);
        this.promptText = scene.add.text(0, 0, 'E', {
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.promptContainer.add([this.promptBg, this.promptText]);
        this.promptContainer.setVisible(false);

        // Create Dialog UI
        this.dialogContainer = scene.add.container(1920 / 2, 1080 - 150).setScrollFactor(0);
        const dialogBg = scene.add.rectangle(0, 0, 1200, 100, 0x000000, 0.8)
            .setStrokeStyle(4, 0xffffff);
        const dialogText = scene.add.text(-500, -33, "Esses slimes corrompidos estão destruindo nossas cavernas. Acabe com eles o mais rápido possível!", {
            fontSize: '32px',
            color: '#ffffff',
            wordWrap: { width: 1000 }
        });
        
        this.dialogContainer.add([dialogBg, dialogText]);
        this.dialogContainer.setVisible(false);

        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
            this.promptContainer.destroy();
            this.dialogContainer.destroy();
        }, this);
    }

    setPlayerTracking(player: Phaser.Physics.Arcade.Sprite) {
        this.playerRef = player;
    }

    update(_ts: number, _dt: number) {
        this.promptContainer.setPosition(this.x + 30, this.y - 30); // Keep UI above NPC

        if (!this.playerRef) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.playerRef.x, this.playerRef.y);

        if (dist <= this.interactionDistance && !this.isPromptVisible) {
            this.isPromptVisible = true;
            this.promptContainer.setVisible(true);
        } else if (dist > this.interactionDistance && this.isPromptVisible) {
            this.isPromptVisible = false;
            this.promptContainer.setVisible(false);
        }

        // Dialog toggle logic
        // We use 'any' to dynamically access the keys property added in player.ts
        const pKeys = (this.playerRef as any).keys;
        if (pKeys && Phaser.Input.Keyboard.JustDown(pKeys.E)) {
            if (this.isPromptVisible && !this.isDialogVisible) {
                this.scene.cameras.main.zoomTo(1.2, 400);
                this.isDialogVisible = true;
                this.dialogContainer.setVisible(true);
            }
        }
        
        // Hide dialog automatically if player walks away
        if (!this.isPromptVisible && this.isDialogVisible) {
            this.scene.cameras.main.zoomTo(1, 500);
            this.isDialogVisible = false;
            this.dialogContainer.setVisible(false);
        }
    }
}
