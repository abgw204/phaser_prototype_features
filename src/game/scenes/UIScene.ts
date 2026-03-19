import { Scene } from 'phaser';
import { QuestManager, QuestStatus } from '../objects/questManager';

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

    private layout() {
        const w = this.scale.width;
        const xRight = w - this.padding;
        const yTop = this.padding;

        this.phasePanel.setPosition(xRight, yTop);

        let y = yTop + 140 + 14;
        for (const panel of this.missionPanels) {
            panel.setPosition(xRight, y);
            const bg = panel.getAt(0) as Phaser.GameObjects.Rectangle;
            y += bg.height + 14;
        }
    }

    private refreshAll() {
        const completedMissions = this.questManager.getStatus() === QuestStatus.COMPLETED ? 1 : 0;
        this.missionsText.setText(`Missões ${completedMissions}/${this.missionsTotal}`);
        this.objectsText.setText(`Objetos ${this.questManager.getCollectedCount()}/${this.questManager.getRequiredCount()}`);

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
            const done = this.questManager?.hasInfo(step.infoKey) ?? false;
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
            const done = this.questManager.hasInfo(step.infoKey);
            const checkbox = done ? '[✓]' : '[ ]';
            texts[idx].setText(`${checkbox} ${step.text}`);
            texts[idx].setColor(done ? '#a8ffb0' : '#ffffff');
        });
    }
}
