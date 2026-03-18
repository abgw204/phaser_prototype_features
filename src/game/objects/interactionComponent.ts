import * as Phaser from 'phaser';

export interface InteractionOptions {
    interactionDistance?: number;
    dialogText?: string;
    gapX?: number;
    gapY?: number;
    onInteract?: () => void;
}

export class InteractionComponent {
    private scene: Phaser.Scene;
    private parent: Phaser.GameObjects.GameObject & { x: number; y: number };
    private playerRef: Phaser.Physics.Arcade.Sprite | null = null;

    private promptContainer: Phaser.GameObjects.Container;
    private dialogContainer: Phaser.GameObjects.Container;

    private isPromptVisible: boolean = false;
    private isDialogVisible: boolean = false;

    private interactionDistance: number;
    private dialogMessage: string;
    private onInteract: (() => void) | null = null;

    private keyHandler: () => void;

    constructor(
        scene: Phaser.Scene,
        parent: Phaser.GameObjects.GameObject & { x: number; y: number },
        options?: InteractionOptions
    ) {
        this.scene = scene;
        this.parent = parent;
        this.interactionDistance = options?.interactionDistance ?? 130;
        this.dialogMessage = options?.dialogText ?? 'Interação!';
        this.onInteract = options?.onInteract ?? null;

        // Create Prompt UI
        this.promptContainer = scene.add.container(parent.x, parent.y - 30)
        const promptBg = scene.add.rectangle(options?.gapX ?? 0, options?.gapY ?? 0, 30, 30, 0x000000, 0.8)
            .setStrokeStyle(2, 0xffffff);
        const promptText = scene.add.text(options?.gapX ?? 0, options?.gapY ?? 0, 'E', {
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.promptContainer.add([promptBg, promptText]);
        this.promptContainer.setVisible(false);

        // Create Dialog UI
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

        // Setup Key Listener
        this.keyHandler = () => {
            if (this.isPromptVisible && !this.isDialogVisible) {
                this.showDialog();
                if (this.onInteract) this.onInteract();
            }
        };
        scene.input.keyboard?.on('keydown-E', this.keyHandler);

        // Cleanup on parent destroy
        parent.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.destroy();
        });
    }

    setPlayerTracking(player: Phaser.Physics.Arcade.Sprite) {
        this.playerRef = player;
    }

    update() {
        this.promptContainer.setPosition(this.parent.x, this.parent.y - 30);

        if (!this.playerRef) return;

        const dist = Phaser.Math.Distance.Between(
            this.parent.x, this.parent.y,
            this.playerRef.x, this.playerRef.y
        );

        if (dist <= this.interactionDistance && !this.isPromptVisible) {
            this.isPromptVisible = true;
            this.promptContainer.setVisible(true);
        } else if (dist > this.interactionDistance && this.isPromptVisible) {
            this.isPromptVisible = false;
            this.promptContainer.setVisible(false);
            if (this.isDialogVisible) {
                this.hideDialog();
            }
        }
    }

    private showDialog() {
        this.isDialogVisible = true;
        this.dialogContainer.setVisible(true);
        this.scene.cameras.main.zoomTo(1.2, 400);
    }

    private hideDialog() {
        this.isDialogVisible = false;
        this.dialogContainer.setVisible(false);
        this.scene.cameras.main.zoomTo(1, 500);
    }

    destroy() {
        this.scene.input.keyboard?.off('keydown-E', this.keyHandler);
        this.promptContainer.destroy();
        this.dialogContainer.destroy();
    }
}
