import { Scene } from 'phaser';
import { QuestManager } from '../objects/questManager';

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

    private padding: number = 24;
    private panelWidth: number = 450;

    private onResize!: () => void;
    private onMissionAcceptedHandler!: (missionId: string) => void;
    private onMissionProgressHandler!: () => void;
    private onMissionStatusHandler!: () => void;

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
        this.layout();

        this.onResize = () => this.layout();
        this.scale.on('resize', this.onResize);

        const gameScene = this.scene.get('Game') as Scene;
        this.onMissionAcceptedHandler = (missionId: string) => this.onMissionAccepted(missionId);
        this.onMissionProgressHandler = () => this.refreshAll();
        this.onMissionStatusHandler = () => this.refreshAll();

        gameScene.events.on('mission-accepted', this.onMissionAcceptedHandler);
        gameScene.events.on('mission-progress-changed', this.onMissionProgressHandler);
        gameScene.events.on('mission-status-changed', this.onMissionStatusHandler);

        this.events.once('shutdown', () => {
            this.scale.off('resize', this.onResize);
            gameScene.events.off('mission-accepted', this.onMissionAcceptedHandler);
            gameScene.events.off('mission-progress-changed', this.onMissionProgressHandler);
            gameScene.events.off('mission-status-changed', this.onMissionStatusHandler);
        });

        this.refreshAll();
    }

    private createPhasePanel() {
        this.phasePanel = this.add.container(0, 0);
        this.root.add(this.phasePanel);

        const bg = this.add.rectangle(0, 0, this.panelWidth, 140, 0x000000, 0.75);
        bg.setOrigin(1, 0);
        bg.setStrokeStyle(3, 0xffffff, 0.9);

        const title = this.add.text(0, 0, this.phaseTitle, {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        title.setOrigin(1, 0);

        this.missionsText = this.add.text(0, 0, '', {
            fontSize: '24px',
            color: '#ffffff'
        });
        this.missionsText.setOrigin(1, 0);

        this.objectsText = this.add.text(0, 0, '', {
            fontSize: '24px',
            color: '#ffffff'
        });
        this.objectsText.setOrigin(1, 0);

        this.phasePanel.add([bg, title, this.missionsText, this.objectsText]);

        // Store layout anchors (using right-top origin)
        title.setPosition(-this.padding, this.padding);
        this.missionsText.setPosition(-this.padding, this.padding + 46);
        this.objectsText.setPosition(-this.padding, this.padding + 78);
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

    private layout() {
        const w = this.scale.width;
        const xRight = w - this.padding;
        const yTop = this.padding;

        this.phasePanel.setPosition(xRight, yTop);

        // Position stars top left. root is offset by (-20, 0).
        this.starsPanel.setPosition(this.padding + 20, this.padding);

        let y = yTop + 140 + 14;
        for (const panel of this.missionPanels) {
            panel.setPosition(xRight, y);
            const bg = panel.getAt(0) as Phaser.GameObjects.Rectangle;
            y += bg.height + 14;
        }
    }

    private refreshAll() {
        const completedMissions = this.questManager.getTotalCompletedMissions();
        this.missionsText.setText(`Missões ${completedMissions}/${this.missionsTotal}`);
        this.objectsText.setText(`Objetos ${this.questManager.getTotalCollectedCount()}/${this.questManager.getTotalRequiredCount()}`);
        this.starsText.setText(`${completedMissions}`);

        for (const missionId of this.activeMissionIds) {
            this.refreshMissionSteps(missionId);
        }
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

        const baseHeight = 84;
        const lineHeight = 30;
        const panelHeight = baseHeight + (def.steps.length * lineHeight);

        const bg = this.add.rectangle(0, 0, this.panelWidth, panelHeight, 0x000000, 0.65);
        bg.setOrigin(1, 0);
        bg.setStrokeStyle(3, 0xffffff, 0.75);

        const title = this.add.text(0, 0, def.title, {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        title.setOrigin(1, 0);
        title.setPosition(-this.padding, this.padding);

        const stepTexts: Phaser.GameObjects.Text[] = [];
        def.steps.forEach((step, idx) => {
            const t = this.add.text(0, 0, '', {
                fontSize: '20px',
                color: '#ffffff',
                wordWrap: { width: this.panelWidth - (this.padding * 2) }
            });
            t.setOrigin(1, 0);
            t.setPosition(-this.padding, this.padding + 44 + (idx * lineHeight));
            // Initialize with current state so we don't rely on a later refresh order.
            const done = this.questManager?.hasInfo(def.id, step.infoKey) ?? false;
            const checkbox = done ? '[✓]' : '[ ]';
            t.setText(`${checkbox} ${step.text}`);
            stepTexts.push(t);
        });

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

        const message = this.add.text(0, 150, 'Parabéns, você completou sua exploração no museu!\nVocê pode continuar explorando.', {
            fontSize: '28px',
            color: '#ffffff',
            wordWrap: { width: 700, useAdvancedWrap: true },
            align: 'center'
        }).setOrigin(0.5);

        const closeText = this.add.text(0, 210, '[ Pressione E para fechar ]', {
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
        
        // Listen to E to close
        const keyHandler = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'e') {
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

