import { Scene } from 'phaser';
import { Player } from '../objects/player';
import { Npc } from '../objects/npc';
import { InteractiveButton } from '../objects/interactiveButton';
import { QuestManager, QuestStatus } from '../objects/questManager';
import { DialogueSystem } from '../objects/dialogueSystem';
import { QuizUI } from '../objects/quizUI';
import { Enemy } from '../objects/enemy';

export class Game extends Scene {
    player: Player;
    rat: Enemy;
    npcs: Npc[] = [];
    questManager: QuestManager;
    dialogueSystem: DialogueSystem;
    quizUI: QuizUI;
    vignetteEffect: any;

    constructor() {
        super('Game');
    }

    preload() {
        this.load.setPath('src/game/Assets');
        Player.preload(this);
        Npc.preload(this);
        Enemy.preload(this);
        this.load.tilemapTiledJSON('map', 'museum-full-level/map.json');
        this.load.image('tiles', 'museum-full-level/spritesheet.png');
        this.load.image('exclamation', 'exclamation.png');
        this.load.image('star', 'star.png');
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
        this.questManager = new QuestManager([
            { id: 'obras_famosas', requiredInfos: ['statue_info', 'painting_info'] },
            { id: 'reliquias_antigas', requiredInfos: ['sarcophagus_info', 'fossil_info'] }
        ]);

        this.scene.launch('UIScene', {
            phaseTitle: 'Museu antigo',
            missionsTotal: 2,
            questManager: this.questManager,
            missionDefs: {
                obras_famosas: {
                    id: 'obras_famosas',
                    title: 'Obras famosas',
                    steps: [
                        { infoKey: 'statue_info', text: 'Verifique a estátua do herói' },
                        { infoKey: 'painting_info', text: 'Verifique a pintura famosa' }
                    ]
                },
                reliquias_antigas: {
                    id: 'reliquias_antigas',
                    title: 'Relíquias antigas',
                    steps: [
                        { infoKey: 'sarcophagus_info', text: 'Verifique o sarcófago' },
                        { infoKey: 'fossil_info', text: 'Verifique o fóssil' }
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

                    // Ensure NPCs return to their idle animation
                    if (this.npcs) {
                        for (const npc of this.npcs) {
                            npc.play('npc_idle_anim', true);
                        }
                    }
                }
            });
        });

        this.events.on('inspect-mode-toggled', (isInspecting: boolean) => {
            if (isInspecting) {
                if (this.vignetteEffect) {
                    this.tweens.add({
                        targets: this.vignetteEffect,
                        radius: 0.6,
                        strength: 0.6, // amount/strength fallback
                        duration: 500,
                        ease: 'Power2'
                    });
                }
                this.tweens.add({
                    targets: this.cameras.main,
                    zoom: 1.8,
                    duration: 500,
                    ease: 'Power2',
                    overwrite: true
                });
            } else {
                if (this.vignetteEffect) {
                    this.tweens.add({
                        targets: this.vignetteEffect,
                        radius: 0.9,
                        strength: 0.6, // amount/strength fallback
                        duration: 500,
                        ease: 'Power2'
                    });
                }
                this.tweens.add({
                    targets: this.cameras.main,
                    zoom: 1.0,
                    duration: 500,
                    ease: 'Power2',
                    overwrite: true
                });
            }
        });
    }

    private createAnimations() {
        Player.createAnims(this);
        Npc.createAnims(this);
        Enemy.createAnims(this);
    }

    private createEntities() {

        const npc1Config = {
            missionId: 'obras_famosas',
            dialogues: {
                intro: [
                    'Olá, viajante! Bem-vindo ao museu.',
                    'Vejo que você tem interesse em história e arte.',
                    'Eu tenho um desafio para você!',
                    'Explore o museu, interaja com as obras e aprenda sobre elas.',
                    'Quando tiver coletado todas as informações, volte aqui para um quiz!',
                    'Boa sorte!'
                ],
                collecting: [
                    'Ainda faltam informações para você coletar.',
                    'Procure pela Estátua e pela Pintura Famosa no museu!'
                ],
                ready: [
                    'Excelente! Vejo que você explorou tudo.',
                    'Agora vamos ver o quanto você aprendeu.',
                    'Preparado para o Quiz?',
                    'Vamos lá!'
                ],
                completed: [
                    'Parabéns novamente por completar o desafio!',
                    'Sinta-se à vontade para continuar explorando o museu.'
                ]
            }
        };

        const npc2Config = {
            missionId: 'reliquias_antigas',
            dialogues: {
                intro: [
                    'Saudações! Sou o curador de antiguidades.',
                    'Temos peças muito antigas por aqui.',
                    'Encontre o sarcófago e o fóssil.',
                    'Depois volte para conversarmos!'
                ],
                collecting: [
                    'Você ainda não encontrou todas as relíquias.',
                    'Continue procurando pelo sarcófago e fóssil.'
                ],
                ready: [
                    'Ah, você encontrou as relíquias!',
                    'Pronto para testar seus conhecimentos?'
                ],
                completed: [
                    'Muito bem! Você é um expert em relíquias.',
                    'Continue sua visita.'
                ]
            /*if (this.body) {
            // Offset visual sprite 25 pixels down relative to the collision body
            // scale is 6.0, so 25 pixels in world = 25 / 6 = 4.166 in unscaled offset
            // Default offset after setSize(13, 13) on 16x16 sprite is 1.5.
            (this.body as Phaser.Physics.Arcade.Body).setOffset(1.5, 1.5 - (-10 / 6.0));
        }*/}
        };

        this.rat = new Enemy(this, 1000, 310, 1);
        const npc1 = new Npc(this, 700, 387, npc1Config).setFlipX(true);
        const npc2 = new Npc(this, 1800, 387, npc2Config);
        this.npcs = [npc1, npc2];
        this.player = new Player(this, 1000, 360, 'player_idle');

        for (const npc of this.npcs) {
            npc.setPlayerTracking(this.player);
            npc.setQuestManager(this.questManager);
        }

        const statue_btn = new InteractiveButton(this, 212, 220, {
            interactionDistance: 210,
            dialogText: 'ESTÁTUA: Esculpida em 1832. Representa a coragem dos heróis antigos.',
            infoKey: 'statue_info',
            requireInspectionMode: true,
            onInfoCollected: (key) => {
                const changed = this.questManager.collectInfo(key);
                if (changed) this.events.emit('mission-progress-changed');
            }
        });

        const painting_btn = new InteractiveButton(this, 1272, 375, {
            interactionDistance: 130,
            dialogText: 'PINTURA: Criada por Vincent no ano de 1889. Suas cores vibrantes são únicas.',
            infoKey: 'painting_info',
            requireInspectionMode: true,
            onInfoCollected: (key) => {
                const changed = this.questManager.collectInfo(key);
                if (changed) this.events.emit('mission-progress-changed');
            }
        });

        const sarcophagus_btn = new InteractiveButton(this, 2275, 350, {
            interactionDistance: 130,
            dialogText: 'SARCÓFAGO: Uma antiga urna funerária egípcia.',
            infoKey: 'sarcophagus_info',
            requireInspectionMode: true,
            onInfoCollected: (key) => {
                const changed = this.questManager.collectInfo(key);
                if (changed) this.events.emit('mission-progress-changed');
            }
        });

        const fossil_btn = new InteractiveButton(this, 2769, 350, {
            interactionDistance: 130,
            dialogText: 'FÓSSIL: Restos petrificados de uma criatura do período Jurássico.',
            infoKey: 'fossil_info',
            requireInspectionMode: true,
            onInfoCollected: (key) => {
                const changed = this.questManager.collectInfo(key);
                if (changed) this.events.emit('mission-progress-changed');
            }
        });

        // Phase Complete Button
        const maxStars = 2; // Can be cleanly changed to 3 later
        const endPhase_btn = new InteractiveButton(this, 1460, 395, {
            interactionDistance: 130,
            gapY: -60, // Posiciona o prompt 'E' acima do texto (floatText = -60)
            gapX: 15,
            dialogueLines: [], // Empty array natively triggers `onInteract` directly, without the default `showDialog()`
            onInteract: () => {
                const collected = this.questManager.getTotalCompletedMissions();
                const uiScene = this.scene.get('UIScene') as any;
                uiScene.showPhaseCompleteUI(collected, maxStars);
            }
        });
        let isEndPhaseActive = false;

        const endPhase_container = this.add.container(0, -60);
        const floatStar = this.add.image(-10, 0, 'star').setScale(2.5);
        const endPhase_floatText = this.add.text(6, 0, `0/${maxStars}`, {
            fontSize: '22px',
            color: '#ffff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0, 0.5);

        endPhase_container.add([floatStar, endPhase_floatText]);
        endPhase_btn.add(endPhase_container);

        this.events.on('mission-status-changed', () => {
            const collected = this.questManager.getTotalCompletedMissions();
            endPhase_floatText.setText(`${collected}/${maxStars}`);

            // Only show the prompt and enable interaction when all required stars are collected
            if (collected >= maxStars && !isEndPhaseActive) {
                isEndPhaseActive = true;
                endPhase_btn.setPlayerTracking(this.player);
            }
        });

        statue_btn.setPlayerTracking(this.player);
        painting_btn.setPlayerTracking(this.player);
        sarcophagus_btn.setPlayerTracking(this.player);
        fossil_btn.setPlayerTracking(this.player);
    }

    public startQuiz(missionId: string) {
        if (missionId === 'obras_famosas') {
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
                if (score >= 3) {
                    this.questManager.setStatus(missionId, QuestStatus.COMPLETED);
                    this.events.emit('mission-status-changed');

                    const lines = [
                        `Incrível! Você acertou ${score} de 3 questões.`,
                        'Você é um verdadeiro especialista em arte agora!',
                        'Pegue essa estrela dourada como recompensa!',
                        'Você precisará delas ao longo da sua jornada!'
                    ];
                    // Find the NPC to play animation
                    const npc = this.npcs.find(n => n['config'] && n['config'].missionId === missionId);
                    if (npc) npc.play('npc_anim');

                    this.questManager.setPendingResult(missionId, lines);
                    this.dialogueSystem.showDialogue([...lines], () => this.questManager.clearPendingResult(missionId));
                } else {
                    this.questManager.setStatus(missionId, QuestStatus.READY_FOR_QUIZ);
                    this.events.emit('mission-status-changed');

                    const lines = [
                        `Você acertou ${score} de 3 questões.`,
                        'Talvez precise observar as obras com mais atenção...',
                        'Tente ler as informações novamente!'
                    ];
                    this.questManager.setPendingResult(missionId, lines);
                    this.dialogueSystem.showDialogue([...lines], () => this.questManager.clearPendingResult(missionId));
                }
            });
        } else if (missionId === 'reliquias_antigas') {
            this.quizUI.startQuiz([
                {
                    text: 'O que você encontrou no sarcófago?',
                    options: ['Múmia', 'Tesouro', 'Vazio'],
                    correctIndex: 0
                },
                {
                    text: 'De qual era é o fóssil?',
                    options: ['Cretáceo', 'Jurássico', 'Triássico'],
                    correctIndex: 1
                }
            ], (score) => {
                if (score >= 2) {
                    this.questManager.setStatus(missionId, QuestStatus.COMPLETED);
                    this.events.emit('mission-status-changed');

                    const lines = [
                        'Parabéns! Você entende de relíquias!',
                        'Mais uma estrela para sua coleção!'
                    ];
                    const npc = this.npcs.find(n => n['config'] && n['config'].missionId === missionId);
                    if (npc) npc.play('npc_anim');

                    this.questManager.setPendingResult(missionId, lines);
                    this.dialogueSystem.showDialogue([...lines], () => this.questManager.clearPendingResult(missionId));
                } else {
                    this.questManager.setStatus(missionId, QuestStatus.READY_FOR_QUIZ);
                    this.events.emit('mission-status-changed');

                    const lines = [
                        'Acho que você precisa dar outra olhada nas relíquias.',
                        'Preste bem atenção nos detalhes!'
                    ];
                    this.questManager.setPendingResult(missionId, lines);
                    this.dialogueSystem.showDialogue([...lines], () => this.questManager.clearPendingResult(missionId));
                }
            });
        }
    }

    private setupCollisions(collisionLayer: Phaser.Tilemaps.TilemapLayer | null) {
        if (collisionLayer) {
            this.physics.add.collider(this.player, collisionLayer);
            this.physics.add.collider(this.rat, collisionLayer);
            for (const npc of this.npcs) {
                this.physics.add.collider(npc, collisionLayer);
            }
        }
    }

    private setupCameras() {
        this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
        if (this.cameras.main.postFX) {
            this.vignetteEffect = this.cameras.main.postFX.addVignette(0.5, 0.5, 0.9, 0.6);
        }
    }

    update(_time: number, _delta: number) {
    }
}
