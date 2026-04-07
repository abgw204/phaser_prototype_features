import * as Phaser from 'phaser';
import { BasePanel } from './BasePanel';
import { LayoutConfig } from '../../constants/LayoutConfig';
import { SceneNames } from '../../constants/SceneNames';
import { GameEvents } from '../../constants/GameEvents';
import { QuizQuestion } from '../../types/GameDataTypes';

/**
 * QuizPanel gerencia a interface de perguntas e respostas.
 * Substitui o antigo QuizUI, integrando-se à estrutura de BasePanel.
 */
export class QuizPanel extends BasePanel {
    private questions: QuizQuestion[] = [];
    private currentQuestionIndex: number = 0;
    private selectedOptionIndex: number = 0;
    private score: number = 0;
    private onComplete: ((score: number) => void) | null = null;

    private questionText: Phaser.GameObjects.Text;
    private optionTexts: Phaser.GameObjects.Text[] = [];
    private escHint: Phaser.GameObjects.Text;

    private onKeydownHandler?: (event: KeyboardEvent) => void;

    private readonly panelWidth = 1100;
    private readonly panelHeight = 750;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
        this.setDepth(LayoutConfig.UI.DEPTHS.QUIZ || 2000);

        this.bg = scene.add.rectangle(0, 0, this.panelWidth, this.panelHeight, 0x000000, 0.95);
        this.bg.setStrokeStyle(6, 0xffffff, 1);
        this.bg.setOrigin(0.5, 0.5);

        this.questionText = scene.add.text(0, -this.panelHeight / 2 + 60, '', {
            fontSize: '40px',
            color: LayoutConfig.COLORS.WHITE,
            align: 'center',
            wordWrap: { width: 1000, useAdvancedWrap: true }
        }).setOrigin(0.5, 0);

        this.escHint = scene.add.text(-this.panelWidth / 2 + 40, this.panelHeight / 2 - 40, 'ESC para fechar', {
            fontSize: '22px',
            color: LayoutConfig.COLORS.DANGER_RED
        }).setOrigin(0, 1);

        this.add([this.bg, this.questionText, this.escHint]);
    }

    public startQuiz(questions: QuizQuestion[], onComplete: (score: number) => void) {
        this.questions = questions;
        this.onComplete = onComplete;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.selectedOptionIndex = 0;

        this.showQuestion();
        this.show();
    }

    public override show() {
        if (this._isVisible) return;
        super.show();

        // Delay para evitar clique acidental do diálogo anterior
        this.scene.time.delayedCall(100, () => {
            this.setupInputListeners();
        });

        const gameScene = this.scene.scene.get(SceneNames.GAME);
        gameScene.events.emit(GameEvents.DIALOGUE_STARTED);
    }

    public override hide(duration: number = 200, onComplete?: () => void) {
        if (!this._isVisible) return;

        this.removeInputListeners();

        const gameScene = this.scene.scene.get(SceneNames.GAME);
        gameScene.events.emit(GameEvents.DIALOGUE_ENDED);

        super.hide(duration, () => {
            if (onComplete) onComplete();
            if (this.onComplete) {
                const finalScore = this.score;
                this.onComplete(finalScore);
                this.onComplete = null;
            }
        });
    }

    public layout(w: number, h: number) {
        this.setPosition(w / 2, h / 2);
    }

    private showQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        this.questionText.setText(question.text);

        // Limpar opções anteriores
        this.optionTexts.forEach(t => t.destroy());
        this.optionTexts = [];
        this.selectedOptionIndex = 0;

        const startY = -60;
        const spacing = 85;

        question.options.forEach((opt, idx) => {
            const optText = this.scene.add.text(0, startY + (idx * spacing), opt, {
                fontSize: '32px',
                color: idx === 0 ? LayoutConfig.COLORS.GOLD : LayoutConfig.COLORS.WHITE
            }).setOrigin(0.5);

            this.optionTexts.push(optText);
            this.add(optText);
        });
    }

    private moveSelection(dir: number) {
        this.selectedOptionIndex = Phaser.Math.Wrap(
            this.selectedOptionIndex + dir,
            0,
            this.optionTexts.length
        );

        this.optionTexts.forEach((text, idx) => {
            text.setColor(idx === this.selectedOptionIndex ? LayoutConfig.COLORS.GOLD : LayoutConfig.COLORS.WHITE);
            text.setScale(idx === this.selectedOptionIndex ? 1.1 : 1);
        });
    }

    private selectOption() {
        const question = this.questions[this.currentQuestionIndex];
        const isCorrect = this.selectedOptionIndex === question.correctIndex;

        if (isCorrect) {
            this.score++;
            this.flash(LayoutConfig.COLORS.SUCCESS_GREEN || 0x00ff00);
        } else {
            this.flash(LayoutConfig.COLORS.DANGER_RED || 0xff0000);
        }

        // Delay para feedback visual
        this.removeInputListeners();
        this.scene.time.delayedCall(500, () => {
            this.currentQuestionIndex++;
            if (this.currentQuestionIndex < this.questions.length) {
                this.showQuestion();
                this.setupInputListeners();
            } else {
                this.hide();
            }
        });
    }

    private flash(color: number | string) {
        const hexColor = typeof color === 'string' ? parseInt(color.replace('#', '0x')) : color;
        this.bg.setStrokeStyle(6, hexColor);
        this.scene.time.delayedCall(300, () => this.bg.setStrokeStyle(6, 0xffffff));
    }

    private setupInputListeners() {
        this.onKeydownHandler = (event: KeyboardEvent) => {
            if (!this._isVisible) return;

            const key = event.key.toLowerCase();
            if (key === 'arrowup' || key === 'w') {
                this.moveSelection(-1);
            } else if (key === 'arrowdown' || key === 's') {
                this.moveSelection(1);
            } else if (key === ' ' || key === 'enter') {
                event.preventDefault();
                this.selectOption();
            } else if (key === 'escape') {
                event.preventDefault();
                this.hide();
            }
        };
        window.addEventListener('keydown', this.onKeydownHandler);
    }

    private removeInputListeners() {
        if (this.onKeydownHandler) {
            window.removeEventListener('keydown', this.onKeydownHandler);
            this.onKeydownHandler = undefined;
        }
    }
}
