import * as Phaser from 'phaser';
import { InteractionComponent } from './interactionComponent';
import { QuestManager, QuestStatus } from './questManager';

export class Npc extends Phaser.Physics.Arcade.Sprite {
    interaction: InteractionComponent;
    private questManager: QuestManager | null = null;
    private exclamationIcon: Phaser.GameObjects.Image;
    private missionInteracted: boolean = false;

    static preload(scene: Phaser.Scene) {
        scene.load.spritesheet('npc_idle', 'npcIdle.png', {
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
    }

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'npc_idle');

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
            gapX: 35,
            gapY: 10
        });

        this.exclamationIcon = scene.add.image(x + 35, y - 40, 'exclamation').setScale(4);

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

        // Permanently remove exclamation on first interaction
        if (!this.missionInteracted) {
            this.missionInteracted = true;
            if (this.exclamationIcon && this.exclamationIcon.active) {
                this.exclamationIcon.destroy();
            }
        }

        const status = this.questManager.getStatus();
        const scene = this.scene as any; // Accessing DialogueSystem and QuizUI from Game scene

        switch (status) {
            case QuestStatus.IDLE:
                scene.dialogueSystem.showDialogue([
                    'Olá, viajante! Bem-vindo ao museu.',
                    'Vejo que você tem interesse em história e arte.',
                    'Eu tenho um desafio para você!',
                    'Explore o museu, interaja com as obras e aprenda sobre elas.',
                    'Quando tiver coletado todas as informações, volte aqui para um quiz!',
                    'Boa sorte!'
                ], () => {
                    this.questManager?.setStatus(QuestStatus.COLLECTING);
                });
                break;

            case QuestStatus.COLLECTING:
                scene.dialogueSystem.showDialogue([
                    'Ainda faltam informações para você coletar.',
                    'Procure pela Estátua e pela Pintura Famosa no museu!'
                ]);
                break;

            case QuestStatus.READY_FOR_QUIZ:
                scene.dialogueSystem.showDialogue([
                    'Excelente! Vejo que você explorou tudo.',
                    'Agora vamos ver o quanto você aprendeu.',
                    'Preparado para o Quiz?',
                    'Vamos lá!'
                ], () => {
                    this.questManager?.setStatus(QuestStatus.QUIZ_ACTIVE);
                    scene.startQuiz();
                });
                break;

            case QuestStatus.COMPLETED:
                scene.dialogueSystem.showDialogue([
                    'Parabéns novamente por completar o desafio!',
                    'Sinta-se à vontade para continuar explorando o museu.'
                ]);
                break;
        }
    }

    setPlayerTracking(player: Phaser.Physics.Arcade.Sprite) {
        this.interaction.setPlayerTracking(player);
    }

    update(_ts: number, _dt: number) {
        this.interaction.update();

        // Toggle exclamation visibility if mission hasn't started
        if (!this.missionInteracted && this.exclamationIcon && this.exclamationIcon.active) {
            this.exclamationIcon.setVisible(!this.interaction.isPromptVisible);
        }
    }
}


