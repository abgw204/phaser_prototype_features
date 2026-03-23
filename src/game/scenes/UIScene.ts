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

    private onTabHandler!: (event: KeyboardEvent) => void;

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

        this.onTabHandler = (event: KeyboardEvent) => {
            event.preventDefault();
            this.toggleInventory();
        };
        this.input.keyboard?.on('keydown-TAB', this.onTabHandler);

        this.events.once('shutdown', () => {
            this.scale.off('resize', this.onResize);
            gameScene.events.off('mission-accepted', this.onMissionAcceptedHandler);
            gameScene.events.off('mission-progress-changed', this.onMissionProgressHandler);
            gameScene.events.off('mission-status-changed', this.onMissionStatusHandler);
            this.input.keyboard?.off('keydown-TAB', this.onTabHandler);
        });

        this.refreshAll();
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
