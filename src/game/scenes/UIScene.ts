import { Scene } from 'phaser';
import { QuestManager, QuestStatus } from '../objects/QuestManager';

type MissionStepDef = {
    infoKey: string;
    text: string;
};

type ActiveMission = {
    id: string;
    title: string;
    steps: MissionStepDef[];
};

type UIInitData = {
    phaseTitle: string;
    missionsTotal: number;
    questManager: QuestManager;
    missionDefs: Record<string, ActiveMission>;
};

export class UIScene extends Scene {
    private phaseTitle: string;
    private missionsTotal: number;
    private questManager!: QuestManager;
    private missionDefs: Record<string, ActiveMission> = {};

    private root!: Phaser.GameObjects.Container;
    private phasePanel!: Phaser.GameObjects.Container;
    private missionsText!: Phaser.GameObjects.Text;
    private objectsText!: Phaser.GameObjects.Text;

    private starsPanel!: Phaser.GameObjects.Container;
    private starIcon!: Phaser.GameObjects.Image;
    private starsText!: Phaser.GameObjects.Text;

    private missionPanels: Phaser.GameObjects.Container[] = [];
    private activeMissionIds: string[] = [];
    private missionStepTexts: Map<string, Phaser.GameObjects.Text[]> = new Map();

    private padding: number = 16;
    private panelWidth: number = 360;

    private inventoryOverlay!: Phaser.GameObjects.Container;
    private inventoryDimmer!: Phaser.GameObjects.Rectangle;
    private inventoryPanel!: Phaser.GameObjects.Container;
    private inventoryBg!: Phaser.GameObjects.Graphics;
    private inventoryTitle!: Phaser.GameObjects.Text;
    private inventoryHint!: Phaser.GameObjects.Text;
    private inventoryContent!: Phaser.GameObjects.Container;
    private inventoryIsVisible: boolean = false;
    private inventoryPanelW: number = 1200;
    private inventoryPanelH: number = 800;

    private readonly inventoryPadding: number = 34;
    private readonly inventorySlotSize: number = 128;
    private readonly inventorySlotGap: number = 18;

    private readonly relicTextureByInfoKey: Record<string, string> = {
        statue_info: 'relic_statue',
        painting_info: 'relic_painting',
        sarcophagus_info: 'relic_sarcophagus',
        fossil_info: 'relic_fossil'
    };

    private onResize!: () => void;
    private onMissionAcceptedHandler!: (missionId: string) => void;
    private onMissionProgressHandler!: () => void;
    private onMissionStatusHandler!: () => void;

    private onGameDialogueEndedHandler!: () => void;

    private lastMissionStatuses: Map<string, QuestStatus> = new Map();

    private pendingMissionCompleteToastCount: number = 0;

    private missionCompleteToast: Phaser.GameObjects.Container | null = null;
    private missionCompleteToastBg!: Phaser.GameObjects.Rectangle;
    private missionCompleteToastText!: Phaser.GameObjects.Text;
    private missionCompleteToastHideTimer: Phaser.Time.TimerEvent | null = null;

    private onTabHandler!: (event: KeyboardEvent) => void;
    private onQHandler!: (event: KeyboardEvent) => void;

    private controlsOverlay!: Phaser.GameObjects.Container;
    private controlsBg!: Phaser.GameObjects.Rectangle;
    private controlsTitle!: Phaser.GameObjects.Text;
    private controlsBody!: Phaser.GameObjects.Text;
    private controlsEscHint!: Phaser.GameObjects.Text;
    private controlsIsVisible: boolean = false;
    private onEscControlsHandler!: (event: KeyboardEvent) => void;

    private inspectTutorialOverlay!: Phaser.GameObjects.Container;
    private inspectTutorialBg!: Phaser.GameObjects.Rectangle;
    private inspectTutorialTitle!: Phaser.GameObjects.Text;
    private inspectTutorialImage!: Phaser.GameObjects.Image;
    private inspectTutorialBody!: Phaser.GameObjects.Text;
    private inspectTutorialEscHint!: Phaser.GameObjects.Text;
    private inspectTutorialIsVisible: boolean = false;
    private inspectTutorialHasBeenShown: boolean = false;
    private onEscInspectTutorialHandler!: (event: KeyboardEvent) => void;

    private activeInteractionPrompts: Set<Phaser.GameObjects.GameObject> = new Set();
    private onInteractionPromptShownHandler!: (obj: Phaser.GameObjects.GameObject) => void;
    private onInteractionPromptHiddenHandler!: (obj: Phaser.GameObjects.GameObject) => void;

    constructor() {
        super('UIScene');
        this.phaseTitle = '';
        this.missionsTotal = 1;
    }

    init(data: UIInitData) {
        this.phaseTitle = data?.phaseTitle ?? '';
        this.missionsTotal = data?.missionsTotal ?? 1;
        this.questManager = data.questManager;
        this.missionDefs = data?.missionDefs ?? {};
    }

    create() {
        this.root = this.add.container(-20, 0);
        this.root.setScrollFactor(0);
        this.root.setDepth(5000);

        this.createPhasePanel();
        this.createStarsPanel();
        this.createInventoryOverlay();
        this.createControlsOverlay();
        this.createInspectTutorialOverlay();
        this.createMissionCompleteToast();
        this.layout();

        this.onResize = () => this.layout();
        this.scale.on('resize', this.onResize);

        const gameScene = this.scene.get('Game') as Scene;
        this.onMissionAcceptedHandler = (missionId: string) => this.onMissionAccepted(missionId);
        this.onMissionProgressHandler = () => this.refreshAll();
        this.onMissionStatusHandler = () => this.onMissionStatusChanged();

        gameScene.events.on('mission-accepted', this.onMissionAcceptedHandler);
        gameScene.events.on('mission-progress-changed', this.onMissionProgressHandler);
        gameScene.events.on('mission-status-changed', this.onMissionStatusHandler);

        this.onGameDialogueEndedHandler = () => this.onGameDialogueEnded();
        gameScene.events.on('dialogue-ended', this.onGameDialogueEndedHandler);

        this.onTabHandler = (event: KeyboardEvent) => {
            event.preventDefault();
            this.toggleInventory();
        };
        this.input.keyboard?.on('keydown-TAB', this.onTabHandler);

        this.onQHandler = (event: KeyboardEvent) => {
            event.preventDefault();
            if (!this.canShowControlsOverlay()) return;
            this.showControlsOverlay();
        };
        this.input.keyboard?.on('keydown-Q', this.onQHandler);

        this.onInteractionPromptShownHandler = (obj: Phaser.GameObjects.GameObject) => {
            this.activeInteractionPrompts.add(obj);
        };
        this.onInteractionPromptHiddenHandler = (obj: Phaser.GameObjects.GameObject) => {
            this.activeInteractionPrompts.delete(obj);
        };
        gameScene.events.on('interaction-prompt-shown', this.onInteractionPromptShownHandler);
        gameScene.events.on('interaction-prompt-hidden', this.onInteractionPromptHiddenHandler);
        
        // Activate controls guide at the start of the scene
        this.showControlsOverlay();

        this.events.once('shutdown', () => {
            this.scale.off('resize', this.onResize);
            gameScene.events.off('mission-accepted', this.onMissionAcceptedHandler);
            gameScene.events.off('mission-progress-changed', this.onMissionProgressHandler);
            gameScene.events.off('mission-status-changed', this.onMissionStatusHandler);
            if (this.onGameDialogueEndedHandler) gameScene.events.off('dialogue-ended', this.onGameDialogueEndedHandler);
            this.input.keyboard?.off('keydown-TAB', this.onTabHandler);
            this.input.keyboard?.off('keydown-Q', this.onQHandler);
            if (this.onEscControlsHandler) this.input.keyboard?.off('keydown', this.onEscControlsHandler);
            if (this.onEscInspectTutorialHandler) this.input.keyboard?.off('keydown', this.onEscInspectTutorialHandler);
            gameScene.events.off('interaction-prompt-shown', this.onInteractionPromptShownHandler);
            gameScene.events.off('interaction-prompt-hidden', this.onInteractionPromptHiddenHandler);
        });

        // Seed last-known statuses so we only toast on transitions.
        for (const missionId of Object.keys(this.missionDefs)) {
            this.lastMissionStatuses.set(missionId, this.questManager.getStatus(missionId));
        }

        this.refreshAll();
    }

    private createMissionCompleteToast() {
        const cx = this.scale.width / 2;
        const y = Math.max(90, Math.floor(this.scale.height * 0.16));

        this.missionCompleteToast = this.add.container(cx, y);
        this.missionCompleteToast.setScrollFactor(0);
        this.missionCompleteToast.setDepth(8800);
        this.missionCompleteToast.setVisible(false);

        this.missionCompleteToastBg = this.add.rectangle(0, 0, 860, 120, 0x000000, 0.85);
        this.missionCompleteToastBg.setStrokeStyle(4, 0xffffff, 0.95);
        this.missionCompleteToastBg.setOrigin(0.5);

        this.missionCompleteToastText = this.add.text(0, 0, 'Missão concluída\nAperte TAB para ver as relíquias', {
            fontSize: '28px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 800, useAdvancedWrap: true },
            lineSpacing: 8
        }).setOrigin(0.5);

        this.missionCompleteToast.add([
            this.missionCompleteToastBg,
            this.missionCompleteToastText
        ]);

        this.layoutMissionCompleteToast(this.scale.width, this.scale.height);
    }

    private layoutMissionCompleteToast(w: number, h: number) {
        if (!this.missionCompleteToast) return;
        const cx = w / 2;
        const y = Math.max(90, Math.floor(h * 0.16));
        this.missionCompleteToast.setPosition(cx, y);

        // Keep width responsive so it stays readable on small screens.
        const maxW = Math.min(860, Math.floor(w * 0.92));
        this.missionCompleteToastBg.setSize(maxW, 120);
        this.missionCompleteToastText.setWordWrapWidth(Math.max(240, maxW - 60), true);
    }

    private showMissionCompleteToast() {
        if (!this.missionCompleteToast) return;

        if (this.missionCompleteToastHideTimer) {
            this.missionCompleteToastHideTimer.remove(false);
            this.missionCompleteToastHideTimer = null;
        }

        this.missionCompleteToast.setVisible(true);
        this.missionCompleteToast.setAlpha(0);
        this.missionCompleteToast.setScale(0.98);

        this.tweens.add({
            targets: this.missionCompleteToast,
            alpha: 1,
            scale: 1,
            duration: 180,
            ease: 'Quad.Out'
        });

        this.missionCompleteToastHideTimer = this.time.delayedCall(3200, () => {
            if (!this.missionCompleteToast) return;
            this.tweens.add({
                targets: this.missionCompleteToast,
                alpha: 0,
                duration: 220,
                ease: 'Quad.In',
                onComplete: () => {
                    this.missionCompleteToast?.setVisible(false);
                }
            });
        });
    }

    private createPhasePanel() {
        this.phasePanel = this.add.container(0, 0);
        this.root.add(this.phasePanel);

        const bg = this.add.rectangle(0, 0, this.panelWidth, 110, 0x000000, 0.75);
        bg.setOrigin(1, 0);
        bg.setStrokeStyle(3, 0xffffff, 0.9);

        const title = this.add.text(0, 0, this.phaseTitle, {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        title.setOrigin(1, 0);

        this.missionsText = this.add.text(0, 0, '', {
            fontSize: '18px',
            color: '#ffffff'
        });
        this.missionsText.setOrigin(1, 0);

        this.objectsText = this.add.text(0, 0, '', {
            fontSize: '18px',
            color: '#ffffff'
        });
        this.objectsText.setOrigin(1, 0);

        this.phasePanel.add([bg, title, this.missionsText, this.objectsText]);

        // Store layout anchors (using right-top origin)
        title.setPosition(-this.padding, this.padding);
        this.missionsText.setPosition(-this.padding, this.padding + 34);
        this.objectsText.setPosition(-this.padding, this.padding + 58);
    }

    private createStarsPanel() {
        this.starsPanel = this.add.container(0, 0);
        this.root.add(this.starsPanel);

        this.starIcon = this.add.image(0, 0, 'star').setOrigin(0, 0);
        this.starIcon.setScale(5);

        this.starsText = this.add.text(this.starIcon.displayWidth + 10, 0, '0', {
            fontSize: '48px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0, 0);

        this.starsPanel.add([this.starIcon, this.starsText]);
    }

    private createInventoryOverlay() {
        this.inventoryOverlay = this.add.container(0, 0);
        this.inventoryOverlay.setDepth(9000);
        this.inventoryOverlay.setScrollFactor(0);
        this.inventoryOverlay.setVisible(false);

        this.inventoryDimmer = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.55);
        this.inventoryDimmer.setOrigin(0.5);
        this.inventoryDimmer.setInteractive();

        this.inventoryPanel = this.add.container(0, 0);

        this.inventoryBg = this.add.graphics();

        this.inventoryTitle = this.add.text(0, 0, 'Mapa das Relíquias', {
            fontSize: '42px',
            color: '#3b2a1a',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0);

        this.inventoryHint = this.add.text(0, 0, '[TAB] para fechar', {
            fontSize: '22px',
            color: '#5a4634'
        }).setOrigin(0.5, 0);

        this.inventoryContent = this.add.container(0, 0);

        this.inventoryPanel.add([
            this.inventoryBg,
            this.inventoryTitle,
            this.inventoryHint,
            this.inventoryContent
        ]);

        this.inventoryOverlay.add([
            this.inventoryDimmer,
            this.inventoryPanel
        ]);
    }

    private layout() {
        const w = this.scale.width;
        const h = this.scale.height;
        const xRight = w - this.padding;
        const yTop = this.padding;

        this.phasePanel.setPosition(xRight, yTop);

        // Position stars top left. root is offset by (-20, 0).
        this.starsPanel.setPosition(this.padding + 20, this.padding);

        let y = yTop + 110 + 10;
        for (const panel of this.missionPanels) {
            panel.setPosition(xRight, y);
            const bg = panel.getAt(0) as Phaser.GameObjects.Rectangle;
            y += bg.height + 10;
        }

        this.layoutInventory(w, h);
        this.layoutControls(w, h);
        this.layoutInspectTutorial(w, h);
        this.layoutMissionCompleteToast(w, h);
    }

    private createInspectTutorialOverlay() {
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        this.inspectTutorialOverlay = this.add.container(cx, cy);
        this.inspectTutorialOverlay.setScrollFactor(0);
        this.inspectTutorialOverlay.setDepth(8600);
        this.inspectTutorialOverlay.setVisible(false);

        const panelW = 980;
        const panelH = 560;

        this.inspectTutorialBg = this.add.rectangle(0, 0, panelW, panelH, 0x000000, 0.85);
        this.inspectTutorialBg.setStrokeStyle(4, 0xffffff, 0.85);

        this.inspectTutorialTitle = this.add.text(0, 0, 'Modo inspecionar', {
            fontSize: '44px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0);

        this.inspectTutorialImage = this.add.image(0, 0, 'inspect_example').setOrigin(0.5, 0);

        this.inspectTutorialBody = this.add.text(
            0,
            0,
            "Use a tecla '⇧' (SHIFT) para entrar no modo inspecionar. Nesse modo, você conseguirá interagir com as relíquias presentes no museu.",
            {
                fontSize: '28px',
                color: '#ffffff',
                align: 'center',
                lineSpacing: 10,
                wordWrap: { width: panelW - 140, useAdvancedWrap: true }
            }
        ).setOrigin(0.5, 0);

        this.inspectTutorialEscHint = this.add.text(0, 0, 'ESC para fechar', {
            fontSize: '22px',
            color: '#ff4d4d'
        }).setOrigin(0, 1);

        this.inspectTutorialOverlay.add([
            this.inspectTutorialBg,
            this.inspectTutorialTitle,
            this.inspectTutorialImage,
            this.inspectTutorialBody,
            this.inspectTutorialEscHint
        ]);

        this.layoutInspectTutorial(this.scale.width, this.scale.height);
    }

    private layoutInspectTutorial(w: number, h: number) {
        if (!this.inspectTutorialOverlay || !this.inspectTutorialBg) return;

        this.inspectTutorialOverlay.setPosition(w / 2, h / 2);

        const bw = this.inspectTutorialBg.width;
        const bh = this.inspectTutorialBg.height;

        this.inspectTutorialTitle.setPosition(0, -bh / 2 + 26);

        const imageTopY = -bh / 2 + 105;
        this.inspectTutorialImage.setPosition(0, imageTopY);

        const maxImageW = bw - 180;
        const maxImageH = 260;
        const scale = Math.min(maxImageW / this.inspectTutorialImage.width, maxImageH / this.inspectTutorialImage.height, 1);
        this.inspectTutorialImage.setScale(scale);

        const textY = imageTopY + (this.inspectTutorialImage.displayHeight + 26);
        this.inspectTutorialBody.setPosition(0, textY);

        this.inspectTutorialEscHint.setPosition(-bw / 2 + 46, bh / 2 - 26);
    }

    private showInspectTutorialOverlay() {
        if (this.inspectTutorialIsVisible) return;
        this.inspectTutorialIsVisible = true;
        this.inspectTutorialHasBeenShown = true;

        const gameScene = this.scene.get('Game') as Scene;
        gameScene.events.emit('inspect-tutorial-opened');

        this.inspectTutorialOverlay.setVisible(true);
        this.inspectTutorialOverlay.setAlpha(0);
        this.tweens.add({
            targets: this.inspectTutorialOverlay,
            alpha: 1,
            duration: 160,
            ease: 'Quad.Out'
        });

        this.onEscInspectTutorialHandler = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'escape') {
                this.hideInspectTutorialOverlay();
            }
        };
        this.input.keyboard?.on('keydown', this.onEscInspectTutorialHandler);
    }

    private hideInspectTutorialOverlay() {
        if (!this.inspectTutorialIsVisible) return;
        this.inspectTutorialIsVisible = false;

        const gameScene = this.scene.get('Game') as Scene;
        gameScene.events.emit('inspect-tutorial-closed');

        if (this.onEscInspectTutorialHandler) this.input.keyboard?.off('keydown', this.onEscInspectTutorialHandler);

        this.tweens.add({
            targets: this.inspectTutorialOverlay,
            alpha: 0,
            duration: 120,
            ease: 'Quad.In',
            onComplete: () => {
                this.inspectTutorialOverlay.setVisible(false);
            }
        });
    }

    private onMissionStatusChanged() {
        // Detect transitions to COMPLETED to show the toast once.
        for (const missionId of Object.keys(this.missionDefs)) {
            const prev = this.lastMissionStatuses.get(missionId) ?? QuestStatus.IDLE;
            const next = this.questManager.getStatus(missionId);
            if (next === QuestStatus.COMPLETED && prev !== QuestStatus.COMPLETED) {
                // TAB is blocked while the dialogue UI is visible, so queue the toast
                // and show it after the player closes the post-mission dialogue.
                this.pendingMissionCompleteToastCount++;
            }
            this.lastMissionStatuses.set(missionId, next);
        }

        this.refreshAll();
    }

    private onGameDialogueEnded() {
        if (this.pendingMissionCompleteToastCount <= 0) return;

        // Show a single toast even if multiple missions completed back-to-back.
        this.pendingMissionCompleteToastCount = 0;

        // Small delay so the SPACE that closes the dialogue doesn't feel like
        // it immediately triggers another UI event.
        this.time.delayedCall(120, () => this.showMissionCompleteToast());
    }

    private createControlsOverlay() {
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        this.controlsOverlay = this.add.container(cx, cy);
        this.controlsOverlay.setScrollFactor(0);
        this.controlsOverlay.setDepth(8500);
        this.controlsOverlay.setVisible(false);

        const panelW = 980;
        const panelH = 420;

        this.controlsBg = this.add.rectangle(0, 0, panelW, panelH, 0x000000, 0.85);
        this.controlsBg.setStrokeStyle(4, 0xffffff, 0.85);

        this.controlsTitle = this.add.text(0, 0, 'Controles', {
            fontSize: '44px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0);

        this.controlsBody = this.add.text(0, 0,
            'WASD ou SETAS: andar\n' +
            'E: interagir\n' +
            'SHIFT: modo inspecionar\n' +
            'TAB: abrir o mapa das relíquias\n' +
            'Q: ver novamente os controles', {
            fontSize: '28px',
            color: '#ffffff',
            align: 'left',
            lineSpacing: 10,
            wordWrap: { width: panelW - 140, useAdvancedWrap: true }
        }).setOrigin(0.5, 0);

        this.controlsEscHint = this.add.text(0, 0, 'ESC para fechar', {
            fontSize: '22px',
            color: '#ff4d4d'
        }).setOrigin(0, 1);

        this.controlsOverlay.add([
            this.controlsBg,
            this.controlsTitle,
            this.controlsBody,
            this.controlsEscHint
        ]);

        this.layoutControls(this.scale.width, this.scale.height);
    }

    private layoutControls(w: number, h: number) {
        if (!this.controlsOverlay || !this.controlsBg) return;

        this.controlsOverlay.setPosition(w / 2, h / 2);

        const bw = this.controlsBg.width;
        const bh = this.controlsBg.height;

        this.controlsTitle.setPosition(0, -bh / 2 + 26);
        this.controlsBody.setPosition(0, -bh / 2 + 110);
        this.controlsEscHint.setPosition(-bw / 2 + 46, bh / 2 - 26);
    }

    private showControlsOverlay() {
        if (this.controlsIsVisible) return;
        this.controlsIsVisible = true;

        const gameScene = this.scene.get('Game') as Scene;
        gameScene.events.emit('controls-overlay-opened');

        this.controlsOverlay.setVisible(true);
        this.controlsOverlay.setAlpha(0);
        this.tweens.add({
            targets: this.controlsOverlay,
            alpha: 1,
            duration: 160,
            ease: 'Quad.Out'
        });

        this.onEscControlsHandler = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'escape') {
                this.hideControlsOverlay();
            }
        };
        this.input.keyboard?.on('keydown', this.onEscControlsHandler);
    }

    private canShowControlsOverlay(): boolean {
        if (this.controlsIsVisible) return false;
        if (this.inspectTutorialIsVisible) return false;
        if (this.inventoryIsVisible) return false;
        if (this.phaseCompletePanel) return false;

        // Block if player is currently near an interactable (prompt visible)
        if (this.activeInteractionPrompts.size > 0) return false;

        const gameScene = this.scene.get('Game') as any;
        if (gameScene?.dialogueSystem?.isVisible) return false;
        if (gameScene?.quizUI?.isVisible) return false;
        if (gameScene?.isInventoryOpen) return false;
        if (gameScene?.player?.isInDialogue) return false;
        return true;
    }

    private hideControlsOverlay() {
        if (!this.controlsIsVisible) return;
        this.controlsIsVisible = false;

        const gameScene = this.scene.get('Game') as Scene;
        gameScene.events.emit('controls-overlay-closed');

        if (this.onEscControlsHandler) this.input.keyboard?.off('keydown', this.onEscControlsHandler);

        this.tweens.add({
            targets: this.controlsOverlay,
            alpha: 0,
            duration: 120,
            ease: 'Quad.In',
            onComplete: () => {
                this.controlsOverlay.setVisible(false);
                if (!this.inspectTutorialHasBeenShown) {
                    this.showInspectTutorialOverlay();
                }
            }
        });
    }

    private layoutInventory(w: number, h: number) {
        if (!this.inventoryOverlay) return;

        this.inventoryDimmer.setPosition(w / 2, h / 2);
        this.inventoryDimmer.setSize(w, h);

        this.inventoryPanelW = Math.min(Math.floor(w * 0.90), 1320);
        this.inventoryPanelH = Math.min(Math.floor(h * 0.90), 880);

        this.inventoryPanel.setPosition(w / 2, h / 2);

        this.redrawInventoryBg();

        const topY = -this.inventoryPanelH / 2;
        this.inventoryTitle.setPosition(0, topY + 18);
        this.inventoryHint.setPosition(0, topY + 66);

        const contentX = -this.inventoryPanelW / 2 + this.inventoryPadding;
        const contentY = topY + 110;
        this.inventoryContent.setPosition(contentX, contentY);

        if (this.inventoryIsVisible) {
            this.refreshInventory();
        }
    }

    private redrawInventoryBg() {
        const w = this.inventoryPanelW;
        const h = this.inventoryPanelH;

        const x = -w / 2;
        const y = -h / 2;

        this.inventoryBg.clear();

        this.inventoryBg.fillStyle(0xdbc8a3, 1);
        this.inventoryBg.fillRoundedRect(x, y, w, h, 18);

        this.inventoryBg.fillStyle(0xf3ead2, 0.35);
        this.inventoryBg.fillRoundedRect(x + 10, y + 10, w - 20, h - 20, 14);

        this.inventoryBg.lineStyle(6, 0x6a4b2a, 0.85);
        this.inventoryBg.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 18);

        this.inventoryBg.lineStyle(2, 0x000000, 0.12);
        this.inventoryBg.strokeRoundedRect(x + 14, y + 14, w - 28, h - 28, 14);
    }

    private refreshAll() {
        const completedMissions = this.questManager.getTotalCompletedMissions();
        this.missionsText.setText(`Missões ${completedMissions}/${this.missionsTotal}`);
        this.objectsText.setText(`Objetos ${this.questManager.getTotalCollectedCount()}/${this.questManager.getTotalRequiredCount()}`);
        this.starsText.setText(`${completedMissions}`);

        for (const missionId of this.activeMissionIds) {
            this.refreshMissionSteps(missionId);
        }

        if (this.inventoryIsVisible) {
            this.refreshInventory();
        }
    }

    private canToggleInventory(): boolean {
        if (this.phaseCompletePanel) return false;
        const gameScene = this.scene.get('Game') as any;
        if (gameScene?.dialogueSystem?.isVisible) return false;
        if (gameScene?.quizUI?.isVisible) return false;
        return true;
    }

    private toggleInventory() {
        if (this.inventoryIsVisible) {
            this.hideInventory();
            return;
        }

        if (!this.canToggleInventory()) return;
        this.showInventory();
    }

    private showInventory() {
        this.inventoryIsVisible = true;
        this.refreshInventory();

        const gameScene = this.scene.get('Game') as Scene;
        gameScene.events.emit('inventory-opened');

        this.inventoryOverlay.setVisible(true);
        this.inventoryOverlay.setAlpha(0);
        this.inventoryPanel.setScale(0.98);

        this.tweens.add({
            targets: this.inventoryOverlay,
            alpha: 1,
            duration: 140,
            ease: 'Quad.Out'
        });
        this.tweens.add({
            targets: this.inventoryPanel,
            scale: 1,
            duration: 180,
            ease: 'Quad.Out'
        });
    }

    private hideInventory() {
        this.inventoryIsVisible = false;

        const gameScene = this.scene.get('Game') as Scene;
        gameScene.events.emit('inventory-closed');

        this.tweens.add({
            targets: this.inventoryOverlay,
            alpha: 0,
            duration: 120,
            ease: 'Quad.In',
            onComplete: () => {
                this.inventoryOverlay.setVisible(false);
            }
        });
    }

    private refreshInventory() {
        if (!this.inventoryContent) return;

        this.inventoryContent.removeAll(true);

        const contentW = this.inventoryPanelW - (this.inventoryPadding * 2);
        const slot = this.inventorySlotSize;
        const gap = this.inventorySlotGap;
        const cols = Math.max(1, Math.floor((contentW + gap) / (slot + gap)));

        let y = 0;
        let sections = 0;

        const missionIds = Object.keys(this.missionDefs);
        for (const missionId of missionIds) {
            const def = this.missionDefs[missionId];
            if (!def) continue;

            const status = this.questManager.getStatus(def.id);
            if (status !== QuestStatus.COMPLETED) continue;

            sections++;

            const header = this.add.text(0, y, def.title, {
                fontSize: '28px',
                color: '#3b2a1a',
                fontStyle: 'bold'
            }).setOrigin(0, 0);
            this.inventoryContent.add(header);
            y += header.displayHeight + 14;

            def.steps.forEach((step, idx) => {
                const col = idx % cols;
                const row = Math.floor(idx / cols);
                const x = col * (slot + gap);
                const sy = y + row * (slot + gap);

                const slotBg = this.add.rectangle(x + slot / 2, sy + slot / 2, slot, slot, 0x000000, 0.07);
                slotBg.setStrokeStyle(4, 0x6a4b2a, 0.78);

                const inner = this.add.rectangle(x + slot / 2, sy + slot / 2, slot - 14, slot - 14, 0xffffff, 0.16);
                inner.setStrokeStyle(2, 0x000000, 0.10);

                const textureKey = this.relicTextureByInfoKey[step.infoKey];
                if (textureKey && this.textures.exists(textureKey)) {
                    const img = this.add.image(x + slot / 2, sy + slot / 2, textureKey).setOrigin(0.5);
                    const scale = Math.min((slot - 18) / img.width, (slot - 18) / img.height);
                    img.setScale(scale);
                    this.inventoryContent.add([slotBg, inner, img]);
                } else {
                    const label = this.add.text(x + slot / 2, sy + slot / 2, this.getInventoryPlaceholderLabel(step.infoKey), {
                        fontSize: '18px',
                        color: '#3b2a1a',
                        fontStyle: 'bold'
                    }).setOrigin(0.5);
                    this.inventoryContent.add([slotBg, inner, label]);
                }
            });

            const rows = Math.ceil(def.steps.length / cols);
            y += rows * (slot + gap);
            y += 22;
        }

        if (sections === 0) {
            const empty = this.add.text(contentW / 2, 140, 'Complete uma missão para revelar relíquias no mapa.', {
                fontSize: '26px',
                color: '#4b3a2a',
                wordWrap: { width: Math.min(900, contentW), useAdvancedWrap: true },
                align: 'center'
            }).setOrigin(0.5, 0.5);
            this.inventoryContent.add(empty);
        }
    }

    private getInventoryPlaceholderLabel(infoKey: string): string {
        const parts = infoKey.split('_').filter(Boolean);
        if (parts.length === 0) return '??';

        const first = parts[0] ?? '';
        const second = parts[1] ?? '';

        const a = first.slice(0, 2);
        const b = second.slice(0, 1);
        const result = `${a}${b}`.toUpperCase();
        return result.length > 0 ? result : '??';
    }

    private onMissionAccepted(missionId: string) {
        if (this.activeMissionIds.includes(missionId)) return;

        const def = this.missionDefs[missionId];
        if (!def) return;

        this.activeMissionIds.push(missionId);
        const panel = this.createMissionPanel(def);
        this.missionPanels.push(panel);
        this.root.add(panel);
        this.layout();
        this.refreshAll();
    }

    private createMissionPanel(def: ActiveMission): Phaser.GameObjects.Container {
        const panel = this.add.container(0, 0);
        panel.setScrollFactor(0);
        panel.setDepth(5001);

        const bg = this.add.rectangle(0, 0, this.panelWidth, 100, 0x000000, 0.65);
        bg.setOrigin(1, 0);
        bg.setStrokeStyle(3, 0xffffff, 0.75);

        const title = this.add.text(0, 0, def.title, {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        title.setOrigin(1, 0);
        title.setPosition(-this.padding, this.padding);

        let currentY = this.padding + 28;
        const stepTexts: Phaser.GameObjects.Text[] = [];
        def.steps.forEach((step) => {
            const t = this.add.text(0, 0, '', {
                fontSize: '16px',
                color: '#ffffff',
                wordWrap: { width: this.panelWidth - (this.padding * 2) }
            });
            t.setOrigin(1, 0);
            t.setPosition(-this.padding, currentY);

            // Initialize with current state
            const done = this.questManager?.hasInfo(def.id, step.infoKey) ?? false;
            const checkbox = done ? '[✓]' : '[ ]';
            t.setText(`${checkbox} ${step.text}`);

            stepTexts.push(t);
            currentY += t.displayHeight + 6;
        });

        // Set final background height based on accumulated text height
        bg.setSize(this.panelWidth, currentY + this.padding / 2);

        this.missionStepTexts.set(def.id, stepTexts);
        panel.add([bg, title, ...stepTexts]);
        return panel;
    }

    private refreshMissionSteps(missionId: string) {
        const def = this.missionDefs[missionId];
        const texts = this.missionStepTexts.get(missionId);
        if (!def || !texts) return;

        def.steps.forEach((step, idx) => {
            const done = this.questManager.hasInfo(missionId, step.infoKey);
            const checkbox = done ? '[✓]' : '[ ]';
            texts[idx].setText(`${checkbox} ${step.text}`);
            texts[idx].setColor(done ? '#a8ffb0' : '#ffffff');
        });
    }

    private phaseCompletePanel: Phaser.GameObjects.Container | null = null;

    public showPhaseCompleteUI(collectedStars: number, maxStars: number) {
        if (this.phaseCompletePanel) {
            this.phaseCompletePanel.destroy();
        }

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        this.phaseCompletePanel = this.add.container(cx, cy);
        this.phaseCompletePanel.setScrollFactor(0);
        this.phaseCompletePanel.setDepth(10000);

        const bg = this.add.rectangle(0, 0, 800, 500, 0x000000, 0.95);
        bg.setStrokeStyle(4, 0xffd700);

        const title = this.add.text(0, -180, 'FASE CONCLUÍDA!', {
            fontSize: '56px',
            color: '#ffd700',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const message = this.add.text(0, 150, 'Parabéns, você completou sua exploração no museu!.', {
            fontSize: '28px',
            color: '#ffffff',
            wordWrap: { width: 700, useAdvancedWrap: true },
            align: 'center'
        }).setOrigin(0.5);

        const closeText = this.add.text(0, 210, '[ Pressione ESC para fechar ]', {
            fontSize: '20px',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        // Stars display (e.g. * * *)
        const starsContainer = this.add.container(0, -30);
        const starSpacing = 140;
        const startX = -((maxStars - 1) * starSpacing) / 2;

        for (let i = 0; i < maxStars; i++) {
            const star = this.add.image(startX + (i * starSpacing), 0, 'star');
            star.setScale(8);
            if (i >= collectedStars) {
                star.setTint(0x444444); // Dark star for missing
                star.setAlpha(0.5);
            }
            starsContainer.add(star);
        }

        this.phaseCompletePanel.add([bg, title, starsContainer, message, closeText]);
        // Do not add to `this.root` so it centers on screen exactly without -20 offset.

        // Listen to ESC to close
        const keyHandler = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'escape') {
                this.hidePhaseCompleteUI();
                this.input.keyboard?.off('keydown', keyHandler);
            }
        };
        // Add a slight delay before attaching listener so the current 'E' press doesn't instantly close it
        this.time.delayedCall(100, () => {
            this.input.keyboard?.on('keydown', keyHandler);
        });
    }

    public hidePhaseCompleteUI() {
        if (this.phaseCompletePanel) {
            this.phaseCompletePanel.destroy();
            this.phaseCompletePanel = null;
        }
    }
}
