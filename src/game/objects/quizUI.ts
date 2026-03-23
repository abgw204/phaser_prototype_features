import * as Phaser from 'phaser';

export interface QuizQuestion {
    text: string;
    options: string[];
    correctIndex: number;
}

export class QuizUI {
    private scene: Phaser.Scene;
    private quizContainer: Phaser.GameObjects.Container;
    private questionText: Phaser.GameObjects.Text;
    private optionTexts: Phaser.GameObjects.Text[] = [];

    private currentQuestionIndex: number = 0;
    private selectedOptionIndex: number = 0;
    private questions: QuizQuestion[] = [];
    private onComplete: (score: number) => void;
    private score: number = 0;
    public isVisible: boolean = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        const uiScene = scene.scene.get('UIScene');
        this.quizContainer = uiScene.add.container(1920 / 2, 1080 / 2).setScrollFactor(0);

        const quizBg = uiScene.add.rectangle(0, 0, 1100, 750, 0x000000, 0.95)
            .setStrokeStyle(6, 0xffffff);

        this.questionText = uiScene.add.text(0, -320, '', {
            fontSize: '40px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 1000 }
        }).setOrigin(0.5, 0);

        this.quizContainer.add([quizBg, this.questionText]);
        this.quizContainer.setVisible(false);
        this.quizContainer.setDepth(2000);

        // Input listeners
        scene.input.keyboard?.on('keydown-UP', () => this.moveSelection(-1));
        scene.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(1));
        scene.input.keyboard?.on('keydown-SPACE', () => {
            if (this.isVisible) {
                this.selectOption();
            }
        });
    }

    startQuiz(questions: QuizQuestion[], onComplete: (score: number) => void) {
        this.questions = questions;
        this.onComplete = onComplete;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.isVisible = false; // Keep input blocked until the next frame

        this.showQuestion();
        this.quizContainer.setVisible(true);
        this.scene.events.emit('dialogue-started');

        // Delay enabling input by one frame so the SPACE that closed the
        // last dialogue line doesn't also immediately answer the first question.
        this.scene.time.delayedCall(100, () => {
            this.isVisible = true;
        });
    }

    private showQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        this.questionText.setText(question.text);

        // Clear previous options
        this.optionTexts.forEach(t => t.destroy());
        this.optionTexts = [];
        this.selectedOptionIndex = 0;

        question.options.forEach((opt, idx) => {
            const uiScene = this.scene.scene.get('UIScene');
            const optText = uiScene.add.text(0, 20 + (idx * 85), opt, {
                fontSize: '32px',
                color: idx === 0 ? '#ffff00' : '#ffffff'
            }).setOrigin(0.5);
            this.optionTexts.push(optText);
            this.quizContainer.add(optText);
        });
    }

    private moveSelection(dir: number) {
        if (!this.isVisible) return;

        this.selectedOptionIndex = Phaser.Math.Wrap(
            this.selectedOptionIndex + dir,
            0,
            this.optionTexts.length
        );

        this.optionTexts.forEach((text, idx) => {
            text.setColor(idx === this.selectedOptionIndex ? '#ffff00' : '#ffffff');
            text.setScale(idx === this.selectedOptionIndex ? 1.1 : 1);
        });
    }

    private selectOption() {
        const question = this.questions[this.currentQuestionIndex];
        const isCorrect = this.selectedOptionIndex === question.correctIndex;

        if (isCorrect) {
            this.score++;
            this.flash(0x00ff00); // Green for correct
        } else {
            this.flash(0xff0000); // Red for incorrect
        }

        this.scene.time.delayedCall(500, () => {
            this.currentQuestionIndex++;
            if (this.currentQuestionIndex < this.questions.length) {
                this.showQuestion();
            } else {
                this.finishQuiz();
            }
        });
    }

    private flash(color: number) {
        const bg = this.quizContainer.getAt(0) as Phaser.GameObjects.Rectangle;
        const originalColor = 0xffffff;
        bg.setStrokeStyle(6, color);
        this.scene.time.delayedCall(300, () => bg.setStrokeStyle(6, originalColor));
    }

    private finishQuiz() {
        this.isVisible = false;
        this.quizContainer.setVisible(false);
        this.scene.events.emit('dialogue-ended');
        this.onComplete(this.score);
    }
}
