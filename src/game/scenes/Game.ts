import { Scene } from 'phaser';
import { Player } from '../objects/player';
import { Npc } from '../objects/npc';
import { InteractiveButton } from '../objects/interactiveButton';
import { QuestManager, QuestStatus } from '../objects/questManager';
import { DialogueSystem } from '../objects/dialogueSystem';
import { QuizUI } from '../objects/quizUI';

export class Game extends Scene {
    player: Player;
    npc: Npc;
    questManager: QuestManager;
    dialogueSystem: DialogueSystem;
    quizUI: QuizUI;

    constructor() {
        super('Game');
    }

    preload() {
        this.load.setPath('src/game/Assets');
        Player.preload(this);
        Npc.preload(this);
        this.load.tilemapTiledJSON('map', 'museum/map.json');
        this.load.image('tiles', 'museum/spritesheet.png');
        this.load.image('exclamation', 'exclamation.png');
    }

    create() {
        this.createAnimations();

        const map = this.make.tilemap({
            key: 'map',
            tileWidth: 8,
            tileHeight: 8
        });

        const tileset = map.addTilesetImage('spritefusion', 'tiles');
        let collisionLayer: Phaser.Tilemaps.TilemapLayer | null = null;

        if (tileset) {
            const bgLayer = map.createLayer('Background', tileset, 0, 0);
            bgLayer?.setScale(10);

            collisionLayer = map.createLayer('Collision', tileset, 0, 0);
            collisionLayer?.setScale(10);
            collisionLayer?.setCollisionByExclusion([-1]);
        }

        // Initialize Systems
        this.dialogueSystem = new DialogueSystem(this);
        this.quizUI = new QuizUI(this);
        this.questManager = new QuestManager(['statue_info', 'painting_info']);

        this.scene.launch('UIScene', {
            phaseTitle: 'Museu antigo',
            missionsTotal: 1,
            questManager: this.questManager,
            missionDefs: {
                obras_famosas: {
                    id: 'obras_famosas',
                    title: 'Obras famosas',
                    steps: [
                        { infoKey: 'statue_info', text: 'Verifique a estátua do herói' },
                        { infoKey: 'painting_info', text: 'Verifique a pintura famosa' }
                    ]
                }
            }
        });
        this.scene.bringToTop('UIScene');

        this.createEntities();
        this.setupCollisions(collisionLayer);
        this.setupCameras();
        this.setupEvents();
    }

    private setupEvents() {
        this.events.on('dialogue-started', () => {
            if (this.player) this.player.isInDialogue = true;
        });
        this.events.on('dialogue-ended', () => {
            // Delay restoring control slightly so the SPACE press that closed
            // the dialogue doesn't trigger a jump.
            this.time.delayedCall(200, () => {
                // Only restore control if we didn't immediately start another dialogue/quiz
                if (!this.dialogueSystem.isVisible && !this.quizUI.isVisible) {
                    if (this.player) this.player.isInDialogue = false;
                }
            });
        });
    }

    private createAnimations() {
        Player.createAnims(this);
        Npc.createAnims(this);
    }

    private createEntities() {
        this.npc = new Npc(this, 1670, 190);
        this.player = new Player(this, 600, 144, 'player_idle');
        this.npc.setPlayerTracking(this.player);
        this.npc.setQuestManager(this.questManager);

        const statue_btn = new InteractiveButton(this, 212, 90, {
            interactionDistance: 210,
            dialogText: 'ESTÁTUA: Esculpida em 1832. Representa a coragem dos heróis antigos.',
            infoKey: 'statue_info',
            onInfoCollected: (key) => {
                const changed = this.questManager.collectInfo(key);
                if (changed) this.events.emit('mission-progress-changed');
            }
        });

        const painting_btn = new InteractiveButton(this, 1272, 250, {
            interactionDistance: 130,
            dialogText: 'PINTURA: Criada por Vincent no ano de 1889. Suas cores vibrantes são únicas.',
            infoKey: 'painting_info',
            onInfoCollected: (key) => {
                const changed = this.questManager.collectInfo(key);
                if (changed) this.events.emit('mission-progress-changed');
            }
        });

        statue_btn.setPlayerTracking(this.player);
        painting_btn.setPlayerTracking(this.player);
    }

    public startQuiz() {
        this.quizUI.startQuiz([
            {
                text: 'Em que ano a estátua foi esculpida?',
                options: ['1832', '1850', '1901'],
                correctIndex: 0
            },
            {
                text: 'Quem criou a pintura famosa?',
                options: ['Leonardo', 'Vincent', 'Picasso'],
                correctIndex: 1
            },
            {
                text: 'Em que ano a pintura foi criada?',
                options: ['1789', '1889', '1920'],
                correctIndex: 1
            }
        ], (score) => {
            if (score >= 2) {
                this.dialogueSystem.showDialogue([
                    `Incrível! Você acertou ${score} de 3 questões.`,
                    'Você é um verdadeiro especialista em arte agora!'
                ], () => {
                    this.questManager.setStatus(QuestStatus.COMPLETED);
                    this.events.emit('mission-status-changed');
                });
            } else {
                this.dialogueSystem.showDialogue([
                    `Você acertou ${score} de 3 questões.`,
                    'Talvez precise observar as obras com mais atenção...',
                    'Tente ler as informações novamente!'
                ], () => {
                    this.questManager.setStatus(QuestStatus.READY_FOR_QUIZ);
                    this.events.emit('mission-status-changed');
                });
            }
        });
    }

    private setupCollisions(collisionLayer: Phaser.Tilemaps.TilemapLayer | null) {
        if (collisionLayer) {
            this.physics.add.collider(this.player, collisionLayer);
            this.physics.add.collider(this.npc, collisionLayer);
        }
    }

    private setupCameras() {
        this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    }

    update(_time: number, _delta: number) {
    }
}
