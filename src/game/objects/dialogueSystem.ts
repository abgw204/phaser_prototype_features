import * as Phaser from 'phaser';

export class DialogueSystem {
    private scene: Phaser.Scene;
    private dialogContainer: Phaser.GameObjects.Container;
    private dialogText: Phaser.GameObjects.Text;
    private nextIndicator: Phaser.GameObjects.Text;
    
    private lines: string[] = [];
    private currentLineIndex: number = 0;
    private onComplete: (() => void) | null = null;
    private isVisible: boolean = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        // Create Dialog UI (reusing InteractionComponent style)
        this.dialogContainer = scene.add.container(1920 / 2, 1080 - 150).setScrollFactor(0);
        
        const dialogBg = scene.add.rectangle(0, 0, 1200, 150, 0x000000, 0.9)
            .setStrokeStyle(4, 0xffffff);
            
        this.dialogText = scene.add.text(-550, -50, '', {
            fontSize: '32px',
            color: '#ffffff',
            wordWrap: { width: 1100 }
        });

        this.nextIndicator = scene.add.text(550, 30, '▼', {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Indicator animation
        scene.tweens.add({
            targets: this.nextIndicator,
            y: '+=10',
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        this.dialogContainer.add([dialogBg, this.dialogText, this.nextIndicator]);
        this.dialogContainer.setVisible(false);
        this.dialogContainer.setDepth(1000);

        // Setup Key Listener
        scene.input.keyboard?.on('keydown-SPACE', () => {
            if (this.isVisible) {
                this.nextLine();
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
        this.scene.cameras.main.zoomTo(1.2, 400);

        // Disable player movement (Game scene handling)
        this.scene.events.emit('dialogue-started');
    }

    private nextLine() {
        this.currentLineIndex++;
        if (this.currentLineIndex >= this.lines.length) {
            this.hideDialogue();
            if (this.onComplete) this.onComplete();
        } else {
            this.updateText();
        }
    }

    private updateText() {
        this.dialogText.setText(this.lines[this.currentLineIndex]);
        // Last line? Hide indicator
        this.nextIndicator.setVisible(this.currentLineIndex < this.lines.length - 1);
    }

    private hideDialogue() {
        this.isVisible = false;
        this.dialogContainer.setVisible(false);
        this.scene.cameras.main.zoomTo(1, 500);
        this.scene.events.emit('dialogue-ended');
    }
}
