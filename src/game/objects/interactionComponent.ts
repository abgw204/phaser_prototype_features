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
    requireInspectionMode?: boolean;
}

export class InteractionComponent {
    private scene: Phaser.Scene;
    private parent: Phaser.GameObjects.GameObject & { x: number; y: number };
    private playerRef: Phaser.Physics.Arcade.Sprite | null = null;

    private promptContainer: Phaser.GameObjects.Container;
    private dialogContainer: Phaser.GameObjects.Container;
    private dialogBg: Phaser.GameObjects.Rectangle;
    private dialogText: Phaser.GameObjects.Text;

    public isPromptVisible: boolean = false;
    private isDialogVisible: boolean = false;

    private interactionDistance: number;
    private dialogMessage: string;
    private dialogueLines: string[] | null = null;
    private infoKey: string | null = null;
    private onInteract: (() => void) | null = null;
    private onInfoCollected: ((key: string) => void) | null = null;
    private requireInspectionMode: boolean;

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
        this.requireInspectionMode = options?.requireInspectionMode ?? false;

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
        const uiScene = scene.scene.get('UIScene');
        this.dialogContainer = uiScene.add.container(1920 / 2, 1080 - 180).setScrollFactor(0);
        this.dialogBg = uiScene.add.rectangle(0, 0, 1200, 100, 0x000000, 0.8)
            .setStrokeStyle(4, 0xffffff);
        this.dialogText = uiScene.add.text(-500, 0, this.dialogMessage, {
            fontSize: '32px',
            color: '#ffffff',
            wordWrap: { width: 1000 }
        }).setOrigin(0, 0.5);
        this.dialogContainer.add([this.dialogBg, this.dialogText]);
        this.dialogContainer.setVisible(false);
        this.dialogContainer.setDepth(100);

        this.updateDialogLayout();

        // Setup Key Listener
        this.keyHandler = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'e') {
                const now = Date.now();
                if (now - this.lastInteractionTime < this.INTERACTION_COOLDOWN) return;

                const isPlayerInspecting = (this.playerRef as any)?.isInspecting;
                const canInteract = this.requireInspectionMode ? isPlayerInspecting : !isPlayerInspecting;

                if (this.isPromptVisible && canInteract) {
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
        if (this.dialogText) {
            this.dialogText.setText(message);
            this.updateDialogLayout();
        }
    }

    private updateDialogLayout() {
        if (!this.dialogBg || !this.dialogText) return;

        const padding = 60;
        const minHeight = 100;
        const textHeight = this.dialogText.displayHeight;
        const newHeight = Math.max(minHeight, textHeight + padding);

        this.dialogBg.setSize(1200, newHeight);
        
        // Adjust container Y if necessary so it grows upward or stays fixed
        // Currently it's at 1080 - 180 = 900.
        // If it grows, we might want it to stay above the bottom area.
    }

    update() {
        this.promptContainer.setPosition(this.parent.x, this.parent.y - 40);

        if (!this.playerRef) return;

        const dist = Phaser.Math.Distance.Between(
            this.parent.x, this.parent.y,
            this.playerRef.x, this.playerRef.y
        );

        const isPlayerInspecting = (this.playerRef as any).isInspecting;
        const canInteract = this.requireInspectionMode ? isPlayerInspecting : !isPlayerInspecting;

        if (dist <= this.interactionDistance && !this.isPromptVisible && canInteract) {
            this.isPromptVisible = true;
            this.promptContainer.setVisible(true);
        } else if ((dist > this.interactionDistance || !canInteract) && this.isPromptVisible) {
            this.isPromptVisible = false;
            this.promptContainer.setVisible(false);
            if (this.isDialogVisible) {
                this.hideDialog();
            }
        }
    }

    private showDialog() {
        this.updateDialogLayout();
        this.isDialogVisible = true;
        this.dialogContainer.setVisible(true);

        const isPlayerInspecting = (this.playerRef as any)?.isInspecting;

        // Use a Tween instead of zoomTo for better interrupt handling
        this.scene.tweens.add({
            targets: this.scene.cameras.main,
            zoom: isPlayerInspecting ? 1.8 : 1.2,
            duration: 400,
            ease: 'Power2',
            overwrite: true
        });

        this.scene.events.emit('dialogue-started');
    }

    private hideDialog() {
        this.isDialogVisible = false;
        this.dialogContainer.setVisible(false);

        const isPlayerInspecting = (this.playerRef as any)?.isInspecting;

        this.scene.tweens.add({
            targets: this.scene.cameras.main,
            zoom: isPlayerInspecting ? 1.8 : 1,
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
