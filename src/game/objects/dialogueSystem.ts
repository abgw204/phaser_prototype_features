import * as Phaser from 'phaser';

export class DialogueSystem {
    private scene: Phaser.Scene;
    private dialogContainer: Phaser.GameObjects.Container;
    private dialogText: Phaser.GameObjects.Text;
    private nextIndicator: Phaser.GameObjects.Text;
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
        this.dialogContainer = uiScene.add.container(1920 / 2, 1080 - 150).setScrollFactor(0);

        const dialogBg = uiScene.add.rectangle(0, -50, 1200, 150, 0x000000, 0.9)
            .setStrokeStyle(4, 0xffffff);

        this.dialogText = uiScene.add.text(-550, -100, '', {
            fontSize: '32px',
            color: '#ffffff',
            wordWrap: { width: 1100 }
        });

        this.nextIndicator = uiScene.add.text(553, -18, '▼', {
            fontSize: '24px',
            color: '#00af09ff'
        }).setOrigin(0.5);

        this.continueMessage = uiScene.add.text(380, -10, 'ESPAÇO para continuar', {
            fontSize: '24px',
            color: '#00af09ff'
        }).setOrigin(0.5);

        // ESC hint (bottom-left)
        this.escHint = uiScene.add.text(-560, 0, 'ESC para fechar', {
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
            dialogBg,
            this.dialogText,
            this.nextIndicator,
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
        this.nextIndicator.setVisible(!isLastLine);

        // Update message text for clarity
        this.continueMessage.setText(isLastLine ? 'ESPAÇO para fechar' : 'ESPAÇO para continuar');
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
