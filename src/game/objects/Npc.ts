import * as Phaser from 'phaser';
import { InteractionComponent } from './InteractionComponent';
import { QuestManager, QuestStatus } from './QuestManager';
import { GameEvents } from '../constants/GameEvents';
import { Game } from '../scenes/Game';

export interface NpcConfig {
    missionId: string;
    dialogues: {
        intro: string[];
        collecting: string[];
        ready: string[];
        completed: string[];
    };
}

export class Npc extends Phaser.Physics.Arcade.Sprite {
    interaction: InteractionComponent;
    private questManager: QuestManager | null = null;
    private exclamationIcon: Phaser.GameObjects.Image;
    private missionAccepted: boolean = false;
    private config: NpcConfig;

    static preload(scene: Phaser.Scene) {
        scene.load.spritesheet('npc_idle', 'npcs/04_npc_female/idle.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        scene.load.spritesheet('npc', 'npc-giving-star.png', {
            frameWidth: 64,
            frameHeight: 64
        });
    }

    static createAnims(scene: Phaser.Scene) {
        scene.anims.create({
            key: 'npc_idle_anim',
            frames: scene.anims.generateFrameNumbers('npc_idle', { frames: [0, 1, 2, 3] }),
            frameRate: 3,
            repeat: -1
        });
        scene.anims.create({
            key: 'npc_anim',
            frames: scene.anims.generateFrameNumbers('npc', { start: 0, end: 9 }),
            frameRate: 9,
            repeat: 0
        });
    }

    constructor(scene: Phaser.Scene, x: number, y: number, config: NpcConfig) {
        super(scene, x, y, 'npc');
        this.config = config;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(4.5);

        this.play('npc_idle_anim');

        this.interaction = new InteractionComponent(scene, this, {
            dialogueLines: [], // Marks this as complex dialogue
            onInteract: () => this.handleInteraction(),
            gapX: 0,
            gapY: -70
        });

        this.exclamationIcon = scene.add.image(x, y - 120, 'exclamation').setScale(4);

        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
        }, this);
    }

    setQuestManager(qm: QuestManager) {
        this.questManager = qm;
    }

    private handleInteraction() {
        if (!this.questManager) return;

        const status = this.questManager.getStatus(this.config.missionId);
        const game = this.scene as Game;

        const pending = this.questManager.getPendingResult(this.config.missionId);
        if (pending) {
            this.scene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, pending, () => {
                this.questManager?.clearPendingResult(this.config.missionId);
            });
            return;
        }

        switch (status) {
            case QuestStatus.IDLE:
                this.scene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, this.config.dialogues.intro, () => {
                    this.questManager?.setStatus(this.config.missionId, QuestStatus.COLLECTING);
                    this.scene.events.emit(GameEvents.MISSION_ACCEPTED, this.config.missionId);
                    this.scene.events.emit(GameEvents.MISSION_STATUS_CHANGED);

                    this.missionAccepted = true;
                    if (this.exclamationIcon && this.exclamationIcon.active) {
                        this.exclamationIcon.destroy();
                    }
                });
                break;

            case QuestStatus.COLLECTING:
                this.scene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, this.config.dialogues.collecting);
                break;

            case QuestStatus.READY_FOR_QUIZ:
                this.scene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, this.config.dialogues.ready, () => {
                    this.questManager?.setStatus(this.config.missionId, QuestStatus.QUIZ_ACTIVE);
                    this.scene.events.emit(GameEvents.MISSION_STATUS_CHANGED);
                    game.startQuiz(this.config.missionId);
                });
                break;

            case QuestStatus.COMPLETED:
                this.scene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, this.config.dialogues.completed);
                break;
        }
    }

    setPlayerTracking(player: Phaser.Physics.Arcade.Sprite) {
        this.interaction.setPlayerTracking(player);
    }

    update(_ts: number, _dt: number) {
        this.interaction.update();

        // Toggle exclamation visibility while mission not accepted
        if (!this.missionAccepted && this.exclamationIcon && this.exclamationIcon.active) {
            this.exclamationIcon.setVisible(!this.interaction.isPromptVisible);
        }
    }
}
