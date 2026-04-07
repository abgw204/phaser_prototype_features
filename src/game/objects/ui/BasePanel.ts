import * as Phaser from 'phaser';

/**
 * BasePanel é uma classe base abstrata para todos os componentes de UI da UIScene.
 * Fornece funcionalidades comuns de visibilidade, animação e contrato de layout.
 */
export abstract class BasePanel extends Phaser.GameObjects.Container {
    protected _isVisible: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        this.setVisible(false);
        this.setAlpha(0);
        scene.add.existing(this);
    }

    /** Contrato para reposicionamento responsivo */
    abstract layout(width: number, height: number): void;

    /** Métodos de animação padrão */
    public show(duration: number = 160) {
        if (this._isVisible) return;
        this._isVisible = true;
        this.setVisible(true);
        
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: duration,
            ease: 'Quad.Out'
        });
    }

    public hide(duration: number = 120, onComplete?: () => void) {
        if (!this._isVisible) return;
        this._isVisible = false;
        
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: duration,
            ease: 'Quad.In',
            onComplete: () => {
                this.setVisible(false);
                if (onComplete) onComplete();
            }
        });
    }

    public get isVisible(): boolean {
        return this._isVisible;
    }
}
