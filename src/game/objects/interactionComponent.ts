import * as Phaser from 'phaser';

export interface InteractionOptions {
    interactionDistance?: number;
    dialogText?: string;
    dialogueLines?: string[];
    infoKey?: string;
    gapX?: number;
    gapY?: number;
    onInteract?: () => void;
    onInfoCollected?: (infoKey: string) => void;
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
    private dialogueLines: string[] | null = null;
    private infoKey: string | null = null;
    private onInteract: (() => void) | null = null;
    private onInfoCollected: ((key: string) => void) | null = null;

    private keyHandler: (event: KeyboardEvent) => void;
    private lastInteractionTime: number = 0;
    private readonly INTERACTION_COOLDOWN: number = 250;

    constructor(
        scene: Phaser.Scene,
        parent: Phaser.GameObjects.GameObject & { x: number; y: number },
        options?: InteractionOptions
    ) {
        this.scene = scene;
        this.parent = parent;
        this.interactionDistance = options?.interactionDistance ?? 130;
        this.dialogMessage = options?.dialogText ?? 'Interação!';
        this.dialogueLines = options?.dialogueLines ?? null;
        this.infoKey = options?.infoKey ?? null;
        this.onInteract = options?.onInteract ?? null;
        this.onInfoCollected = options?.onInfoCollected ?? null;

        // Create Prompt UI
        this.promptContainer = scene.add.container(parent.x, parent.y - 30);
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
        this.dialogContainer = scene.add.container(1920 / 2, 1080 - 180).setScrollFactor(0);
        const dialogBg = scene.add.rectangle(0, 0, 1200, 100, 0x000000, 0.8)
            .setStrokeStyle(4, 0xffffff);
        const dialogText = scene.add.text(-500, -33, this.dialogMessage, {
            fontSize: '32px',
            color: '#ffffff',
            wordWrap: { width: 1000 }
        });
        this.dialogContainer.add([dialogBg, dialogText]);
        this.dialogContainer.setVisible(false);
        this.dialogContainer.setDepth(100);

        // Setup Key Listener
        this.keyHandler = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'e') {
                const now = Date.now();
                if (now - this.lastInteractionTime < this.INTERACTION_COOLDOWN) return;

                if (this.isPromptVisible) {
                    this.lastInteractionTime = now;

                    if (this.dialogueLines) {
                        // Complex dialogue (managed by scene/DialogueSystem)
                        if (this.onInteract) this.onInteract();
                    } else {
                        // Simple single-line dialog
                        if (this.isDialogVisible) {
                            this.hideDialog();
                        } else {
                            this.showDialog();
                            if (this.infoKey && this.onInfoCollected) {
                                this.onInfoCollected(this.infoKey);
                            }
                            if (this.onInteract) this.onInteract();
                        }
                    }
                }
            }
        };
        scene.input.keyboard?.on('keydown', this.keyHandler);

        // Cleanup on parent destroy
        parent.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.destroy();
        });
    }

    setPlayerTracking(player: Phaser.Physics.Arcade.Sprite) {
        this.playerRef = player;
    }

    setDialogMessage(message: string) {
        this.dialogMessage = message;
        // Update the text object in container if it exists
        const textObj = this.dialogContainer.getAt(1) as Phaser.GameObjects.Text;
        if (textObj) textObj.setText(message);
    }

    update() {
        this.promptContainer.setPosition(this.parent.x, this.parent.y - 40);

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

        // Use a Tween instead of zoomTo for better interrupt handling
        this.scene.tweens.add({
            targets: this.scene.cameras.main,
            zoom: 1.2,
            duration: 400,
            ease: 'Power2',
            overwrite: true
        });

        this.scene.events.emit('dialogue-started');
    }

    private hideDialog() {
        this.isDialogVisible = false;
        this.dialogContainer.setVisible(false);

        this.scene.tweens.add({
            targets: this.scene.cameras.main,
            zoom: 1,
            duration: 400,
            ease: 'Power2',
            overwrite: true
        });

        this.scene.events.emit('dialogue-ended');
    }


    destroy() {
        this.scene.input.keyboard?.off('keydown', this.keyHandler);
        this.promptContainer.destroy();
        this.dialogContainer.destroy();
    }
}
