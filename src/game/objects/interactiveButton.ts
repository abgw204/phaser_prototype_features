import * as Phaser from 'phaser';

export class InteractiveButton extends Phaser.GameObjects.Container {
    promptContainer: Phaser.GameObjects.Container;
    promptBg: Phaser.GameObjects.Rectangle;
    promptText: Phaser.GameObjects.Text;
    dialogContainer: Phaser.GameObjects.Container;
    playerRef: Phaser.Physics.Arcade.Sprite | null = null;
    isPromptVisible: boolean = false;
    isDialogVisible: boolean = false;
    interactionDistance: number;
    dialogMessage: string;
    onInteract: (() => void) | null = null;
    private keyHandler: ((event: KeyboardEvent) => void) | null = null;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        options?: {
            interactionDistance?: number;
            dialogText?: string;
            onInteract?: () => void;
        }
    ) {
        super(scene, x, y);

        scene.add.existing(this);

        this.interactionDistance = options?.interactionDistance ?? 130;
        this.dialogMessage = options?.dialogText ?? 'Interação!';
        this.onInteract = options?.onInteract ?? null;

        // Create the 'E' prompt UI
        this.promptContainer = scene.add.container(x, y - 30);
        this.promptBg = scene.add.rectangle(0, 0, 30, 30, 0x000000, 0.8)
            .setStrokeStyle(2, 0xffffff);
        this.promptText = scene.add.text(0, 0, 'E', {
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.promptContainer.add([this.promptBg, this.promptText]);
        this.promptContainer.setVisible(false);

        // Create Dialog UI (fixed on screen, like the NPC)
        this.dialogContainer = scene.add.container(1920 / 2, 1080 - 150).setScrollFactor(0);
        const dialogBg = scene.add.rectangle(0, 0, 1200, 100, 0x000000, 0.8)
            .setStrokeStyle(4, 0xffffff);
        const dialogText = scene.add.text(-500, -33, this.dialogMessage, {
            fontSize: '32px',
            color: '#ffffff',
            wordWrap: { width: 1000 }
        });

        this.dialogContainer.add([dialogBg, dialogText]);
        this.dialogContainer.setVisible(false);

        // Use keyboard event listener instead of JustDown polling
        this.keyHandler = () => {
            if (this.isPromptVisible && !this.isDialogVisible) {
                this.isDialogVisible = true;
                this.dialogContainer.setVisible(true);
                this.scene.cameras.main.zoomTo(1.2, 400);
                if (this.onInteract) {
                    this.onInteract();
                }
            }
        };
        scene.input.keyboard?.on('keydown-E', this.keyHandler, this);

        // Register update for prompt visibility
        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
            if (this.keyHandler) {
                this.scene.input.keyboard?.off('keydown-E', this.keyHandler, this);
            }
            this.promptContainer.destroy();
            this.dialogContainer.destroy();
        }, this);
    }

    setPlayerTracking(player: Phaser.Physics.Arcade.Sprite) {
        this.playerRef = player;
    }

    update(_ts: number, _dt: number) {
        // Keep prompt above the button position
        this.promptContainer.setPosition(this.x, this.y - 30);

        if (!this.playerRef) return;

        const dist = Phaser.Math.Distance.Between(
            this.x, this.y,
            this.playerRef.x, this.playerRef.y
        );

        if (dist <= this.interactionDistance && !this.isPromptVisible) {
            this.isPromptVisible = true;
            this.promptContainer.setVisible(true);
        } else if (dist > this.interactionDistance && this.isPromptVisible) {
            this.isPromptVisible = false;
            this.promptContainer.setVisible(false);
        }

        // Hide dialog automatically if player walks away
        if (!this.isPromptVisible && this.isDialogVisible) {
            this.scene.cameras.main.zoomTo(1, 500);
            this.isDialogVisible = false;
            this.dialogContainer.setVisible(false);
        }
    }
}
