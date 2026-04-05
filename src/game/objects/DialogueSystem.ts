import * as Phaser from 'phaser';

export class DialogueSystem {
    private scene: Phaser.Scene;
    private dialogContainer: Phaser.GameObjects.Container;
    private dialogBg: Phaser.GameObjects.Rectangle;
    private dialogText: Phaser.GameObjects.Text;
    private nextIndicator: Phaser.GameObjects.Text;
    private nextIndicatorContainer: Phaser.GameObjects.Container;
    private continueMessage: Phaser.GameObjects.Text;
    private escHint: Phaser.GameObjects.Text;

    private lines: string[] = [];
    private currentLineIndex: number = 0;
    private onComplete: (() => void) | null = null;
    public isVisible: boolean = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        // Create Dialog UI (reusing InteractionComponent style)
        const uiScene = scene.scene.get('UIScene');
        this.dialogContainer = uiScene.add.container(1920 / 2, 1080 - 200).setScrollFactor(0);

        this.dialogBg = uiScene.add.rectangle(0, 0, 1200, 150, 0x000000, 0.9)
            .setStrokeStyle(4, 0xffffff)
            .setOrigin(0.5, 0);

        this.dialogText = uiScene.add.text(-550, 30, '', {
            fontSize: '32px',
            color: '#ffffff',
            wordWrap: { width: 1100 }
        }).setOrigin(0, 0);

        this.nextIndicatorContainer = uiScene.add.container(553, 20);
        this.nextIndicator = uiScene.add.text(0, 15, '▼', {
            fontSize: '24px',
            color: '#00af09ff'
        }).setOrigin(0.5);
        this.nextIndicatorContainer.add(this.nextIndicator);

        this.continueMessage = uiScene.add.text(380, 50, 'ESPAÇO para continuar', {
            fontSize: '24px',
            color: '#00af09ff'
        }).setOrigin(0.5);

        // ESC hint (bottom-left)
        this.escHint = uiScene.add.text(-560, 60, 'ESC para fechar', {
            fontSize: '22px',
            color: '#ff4d4d'
        }).setOrigin(0, 1);

        // Indicator animation
        uiScene.tweens.add({
            targets: this.nextIndicator,
            y: '+=10',
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        this.dialogContainer.add([
            this.dialogBg,
            this.dialogText,
            this.nextIndicatorContainer,
            this.continueMessage,
            this.escHint,
        ]);
        this.dialogContainer.setVisible(false);
        this.dialogContainer.setDepth(1000);

        // Setup Key Listener
        scene.input.keyboard?.on('keydown-SPACE', () => {
            if (this.isVisible) {
                this.nextLine();
            }
        });

        scene.input.keyboard?.on('keydown-ESC', () => {
            if (this.isVisible) {
                this.closeDialogue(false);
            }
        });
    }

    showDialogue(lines: string[], onComplete?: () => void) {
        this.lines = lines;
        this.currentLineIndex = 0;
        this.onComplete = onComplete ?? null;
        this.isVisible = true;

        this.updateText();
        this.dialogContainer.setVisible(true);

        // Use Tween with overwrite to handle rapid triggers
        this.scene.tweens.add({
            targets: this.scene.cameras.main,
            zoom: 1.2,
            duration: 400,
            ease: 'Power2',
            overwrite: true
        });

        // Disable player movement (Game scene handling)
        this.scene.events.emit('dialogue-started');
    }

    private nextLine() {
        this.currentLineIndex++;
        if (this.currentLineIndex >= this.lines.length) {
            this.closeDialogue(true);
        } else {
            this.updateText();
        }
    }

    private updateText() {
        const isLastLine = this.currentLineIndex === this.lines.length - 1;
        this.dialogText.setText(this.lines[this.currentLineIndex]);

        // Hide indicator on last line
        this.nextIndicatorContainer.setVisible(!isLastLine);

        // Update message text for clarity
        this.continueMessage.setText(isLastLine ? 'ESPAÇO para fechar' : 'ESPAÇO para continuar');

        this.updateDialogLayout();
    }

    private updateDialogLayout() {
        if (!this.dialogBg || !this.dialogText) return;

        const paddingH = 30; // Top padding
        const paddingB = 80; // Bottom padding for controls
        const minHeight = 100;
        const textHeight = this.dialogText.displayHeight;
        const newHeight = Math.max(minHeight, textHeight + paddingH + paddingB);

        this.dialogBg.setSize(1200, newHeight);

        // Anchor indicators/messages to the bottom of the current box height
        this.nextIndicatorContainer.setY(newHeight - 45); // Slightly higher since indicator floats inside
        this.continueMessage.setY(newHeight - 20);
        this.escHint.setY(newHeight - 10);

        // Text is already at fixed Y=30 (from constructor) with origin (0,0)
    }

    private closeDialogue(complete: boolean) {
        const cb = complete ? this.onComplete : null;

        this.isVisible = false;
        this.dialogContainer.setVisible(false);
        this.lines = [];
        this.currentLineIndex = 0;
        this.onComplete = null;

        this.scene.tweens.add({
            targets: this.scene.cameras.main,
            zoom: 1,
            duration: 500,
            ease: 'Power2',
            overwrite: true
        });

        this.scene.events.emit('dialogue-ended');
        if (cb) cb();
    }
}
