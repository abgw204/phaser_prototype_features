import * as Phaser from 'phaser';
import { InteractionComponent } from './InteractionComponent';
import { QuestManager, QuestStatus } from './QuestManager';

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
        scene.load.spritesheet('npc_idle', 'npcIdle.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        scene.load.spritesheet('npc', 'npc-giving-star.png', {
            frameWidth: 64,
            frameHeight: 64
        });
    }

    static createAnims(scene: Phaser.Scene) {
        scene.anims.create({
            key: 'npc_idle_anim',
            frames: scene.anims.generateFrameNumbers('npc_idle', { frames: [0] }),
            frameRate: 6,
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

        this.setScale(4.0);

        if (this.body) {
            this.body.immovable = true;
            (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        }

        this.play('npc_idle_anim');

        this.interaction = new InteractionComponent(scene, this, {
            dialogueLines: [], // Marks this as complex dialogue
            onInteract: () => this.handleInteraction(),
            gapX: 0,
            gapY: -50
        });

        this.exclamationIcon = scene.add.image(x, y - 100, 'exclamation').setScale(4);

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
        const scene = this.scene as any; // Accessing DialogueSystem and QuizUI from Game scene

        const pending = this.questManager.getPendingResult(this.config.missionId);
        if (pending) {
            scene.dialogueSystem.showDialogue(pending, () => {
                this.questManager?.clearPendingResult(this.config.missionId);
            });
            return;
        }

        switch (status) {
            case QuestStatus.IDLE:
                scene.dialogueSystem.showDialogue(this.config.dialogues.intro, () => {
                    this.questManager?.setStatus(this.config.missionId, QuestStatus.COLLECTING);
                    this.scene.events.emit('mission-accepted', this.config.missionId);
                    this.scene.events.emit('mission-status-changed');

                    this.missionAccepted = true;
                    if (this.exclamationIcon && this.exclamationIcon.active) {
                        this.exclamationIcon.destroy();
                    }
                });
                break;

            case QuestStatus.COLLECTING:
                scene.dialogueSystem.showDialogue(this.config.dialogues.collecting);
                break;

            case QuestStatus.READY_FOR_QUIZ:
                scene.dialogueSystem.showDialogue(this.config.dialogues.ready, () => {
                    this.questManager?.setStatus(this.config.missionId, QuestStatus.QUIZ_ACTIVE);
                    this.scene.events.emit('mission-status-changed');
                    scene.startQuiz(this.config.missionId);
                });
                break;

            case QuestStatus.COMPLETED:
                scene.dialogueSystem.showDialogue(this.config.dialogues.completed);
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
