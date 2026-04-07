import * as Phaser from 'phaser';
import { GameEvents } from '../constants/GameEvents';
import { SceneNames } from '../constants/SceneNames';
import { LayoutConfig } from '../constants/LayoutConfig';
import { IPlayerState } from '../types/EntityTypes';

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

    // Hint system (sparkle animation after inactivity)
    enableHint?: boolean;
    hintDelayMs?: number;
    hintOffsetX?: number;
    hintOffsetY?: number;
    hintScale?: number;
}

export class InteractionComponent {
    private scene: Phaser.Scene;
    private parent: Phaser.GameObjects.GameObject & { x: number; y: number };
    private playerRef: Phaser.Physics.Arcade.Sprite | null = null;

    private promptContainer: Phaser.GameObjects.Container;
    private dialogContainer: Phaser.GameObjects.Container;
    private dialogBg: Phaser.GameObjects.Rectangle;
    private dialogText: Phaser.GameObjects.Text;
    private escHint: Phaser.GameObjects.Text;

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

    private hintEnabled: boolean;
    private hintDelayMs: number;
    private hintOffsetX: number;
    private hintOffsetY: number;
    private hintScale: number;
    private hintCompleted: boolean = false;
    private hintSprite: Phaser.GameObjects.Sprite | null = null;
    private hintTimer: Phaser.Time.TimerEvent | null = null;

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

        this.hintEnabled = options?.enableHint ?? false;
        this.hintDelayMs = options?.hintDelayMs ?? 15000;
        this.hintOffsetX = options?.hintOffsetX ?? 0;
        this.hintOffsetY = options?.hintOffsetY ?? -90;
        this.hintScale = options?.hintScale ?? 3;

        // Arm hint timer immediately; hint does not depend on prompt visibility.
        this.armHint();

        // Create Prompt UI
        this.promptContainer = scene.add.container(parent.x, parent.y - 30);
        const promptBg = scene.add.rectangle(options?.gapX ?? 0, options?.gapY ?? 0, 30, 30, 0x000000, 0.8)
            .setStrokeStyle(2, 0xffffff);
        const promptText = scene.add.text(options?.gapX ?? 0, options?.gapY ?? 0, 'E', {
            fontSize: '20px',
            color: LayoutConfig.COLORS.WHITE,
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.promptContainer.add([promptBg, promptText]);
        this.promptContainer.setVisible(false);

        // Create Dialog UI
        const uiScene = scene.scene.get(SceneNames.UI);
        this.dialogContainer = uiScene.add.container(1920 / 2, 1080 - 180).setScrollFactor(0);
        this.dialogBg = uiScene.add.rectangle(0, 0, 1200, 100, 0x000000, 0.8)
            .setStrokeStyle(4, 0xffffff);
        this.dialogText = uiScene.add.text(-500, 0, this.dialogMessage, {
            fontSize: '32px',
            color: LayoutConfig.COLORS.WHITE,
            wordWrap: { width: 1000 }
        }).setOrigin(0, 0);

        this.escHint = uiScene.add.text(-560, 40, 'ESC para fechar', {
            fontSize: '22px',
            color: LayoutConfig.COLORS.DANGER_RED
        }).setOrigin(0, 1);

        this.dialogContainer.add([this.dialogBg, this.dialogText, this.escHint]);
        this.dialogContainer.setVisible(false);
        this.dialogContainer.setDepth(100);

        this.updateDialogLayout();

        // Setup Key Listener
        this.keyHandler = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            if (key === 'e') {
                const player = this.playerRef as unknown as IPlayerState;
                if (player?.isInDialogue) return;

                const now = Date.now();
                if (now - this.lastInteractionTime < this.INTERACTION_COOLDOWN) return;

                const isPlayerInspecting = player?.isInspecting;
                const canInteract = this.requireInspectionMode ? isPlayerInspecting : !isPlayerInspecting;

                if (this.isPromptVisible && canInteract) {
                    this.lastInteractionTime = now;

                    this.markInteracted();

                    if (this.dialogueLines) {
                        // Complex dialogue (managed by scene/DialogueSystem)
                        if (this.onInteract) this.onInteract();
                    } else {
                        // Simple single-line dialog
                        if (!this.isDialogVisible) {
                            this.showDialog();
                            if (this.infoKey && this.onInfoCollected) {
                                this.onInfoCollected(this.infoKey);
                            }
                            if (this.onInteract) this.onInteract();
                        }
                    }
                }
            } else if (key === 'escape') {
                if (this.isDialogVisible) {
                    this.hideDialog();
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
        if (!this.dialogBg || !this.dialogText || !this.escHint) return;

        const padding = 100;
        const minHeight = 80;
        const textHeight = this.dialogText.displayHeight;
        const newHeight = Math.max(minHeight, textHeight + padding);

        this.dialogBg.setSize(1200, newHeight);

        // Position text 25px below top
        this.dialogText.setY(-newHeight / 2 + 25);

        // Update ESC hint position to the bottom left with better margin
        this.escHint.setY(newHeight / 2 - 15);
    }

    update() {
        this.promptContainer.setPosition(this.parent.x, this.parent.y - 40);

        if (this.hintSprite) {
            this.hintSprite.setPosition(this.parent.x + this.hintOffsetX, this.parent.y + this.hintOffsetY);
        }

        if (!this.playerRef) return;

        const dist = Phaser.Math.Distance.Between(
            this.parent.x, this.parent.y,
            this.playerRef.x, this.playerRef.y
        );

        const player = this.playerRef as unknown as IPlayerState;
        const isPlayerInspecting = player.isInspecting;
        const canInteract = this.requireInspectionMode ? isPlayerInspecting : !isPlayerInspecting;

        if (dist <= this.interactionDistance && !this.isPromptVisible && canInteract) {
            this.isPromptVisible = true;
            this.promptContainer.setVisible(true);
            this.scene.events.emit(GameEvents.INTERACTION_PROMPT_SHOWN, this.parent);
        } else if ((dist > this.interactionDistance || !canInteract) && this.isPromptVisible) {
            this.isPromptVisible = false;
            this.promptContainer.setVisible(false);
            this.scene.events.emit(GameEvents.INTERACTION_PROMPT_HIDDEN, this.parent);
            if (this.isDialogVisible) {
                this.hideDialog();
            }
        }
    }

    private armHint() {
        if (!this.hintEnabled) return;
        if (this.hintCompleted) return;
        if (this.hintTimer) return;

        this.hintTimer = this.scene.time.delayedCall(this.hintDelayMs, () => {
            this.hintTimer = null;
            if (this.hintCompleted) return;
            this.showHint();
        });
    }

    private disarmHint() {
        if (this.hintTimer) {
            this.hintTimer.remove(false);
            this.hintTimer = null;
        }
        this.hideHint();
    }

    private showHint() {
        if (!this.hintEnabled) return;
        if (this.hintCompleted) return;

        if (!this.hintSprite) {
            this.hintSprite = this.scene.add.sprite(
                this.parent.x + this.hintOffsetX,
                this.parent.y + this.hintOffsetY,
                'sparkle',
                0
            );
            this.hintSprite.setOrigin(0.5, 0.5);
            this.hintSprite.setScale(this.hintScale);
            this.hintSprite.setDepth(50);

            this.hintSprite.once(Phaser.GameObjects.Events.DESTROY, () => {
                this.hintSprite = null;
            });
        }

        this.hintSprite.setVisible(true);
        if (this.scene.anims.exists('sparkle_hint_anim')) {
            this.hintSprite.play('sparkle_hint_anim', true);
        }
    }

    private hideHint() {
        if (!this.hintSprite) return;
        this.hintSprite.setVisible(false);
        this.hintSprite.stop();
    }

    private markInteracted() {
        if (this.hintCompleted) return;
        this.hintCompleted = true;
        this.disarmHint();
        if (this.hintSprite) {
            this.hintSprite.destroy();
            this.hintSprite = null;
        }
    }

    private showDialog() {
        this.updateDialogLayout();
        this.isDialogVisible = true;
        this.dialogContainer.setVisible(true);

        const player = this.playerRef as unknown as IPlayerState;
        const isPlayerInspecting = player?.isInspecting;

        // Use a Tween instead of zoomTo for better interrupt handling
        this.scene.tweens.add({
            targets: this.scene.cameras.main,
            zoom: isPlayerInspecting ? 1.8 : 1.2,
            duration: 400,
            ease: 'Power2',
            overwrite: true
        });

        this.scene.events.emit(GameEvents.DIALOGUE_STARTED);
    }

    private hideDialog() {
        this.isDialogVisible = false;
        this.dialogContainer.setVisible(false);

        const player = this.playerRef as unknown as IPlayerState;
        const isPlayerInspecting = player?.isInspecting;

        this.scene.tweens.add({
            targets: this.scene.cameras.main,
            zoom: isPlayerInspecting ? 1.8 : 1,
            duration: 400,
            ease: 'Power2',
            overwrite: true
        });

        this.scene.events.emit(GameEvents.DIALOGUE_ENDED);
    }


    destroy() {
        if (this.isPromptVisible) {
            this.scene.events.emit(GameEvents.INTERACTION_PROMPT_HIDDEN, this.parent);
        }
        this.scene.input.keyboard?.off('keydown', this.keyHandler);
        this.promptContainer.destroy();
        this.dialogContainer.destroy();

        this.disarmHint();
        if (this.hintSprite) {
            this.hintSprite.destroy();
            this.hintSprite = null;
        }
    }
}
