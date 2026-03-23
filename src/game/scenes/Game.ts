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
    colorMatrix: any;
    private currentGrayscale: number = 0.7;
    private isInventoryOpen: boolean = false;
    private isControlsOverlayOpen: boolean = false;

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

        this.load.spritesheet('sparkle', 'sparkle.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        this.load.image('relic_statue', 'relics/statue_relic.png');
        this.load.image('relic_painting', 'relics/painting_relic.png');
        this.load.image('relic_sarcophagus', 'relics/sarcophagus_relic.png');
        this.load.image('relic_fossil', 'relics/dino_relic.png');
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

        this.setupEvents();

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

        if (this.isControlsOverlayOpen && this.player) {
            this.player.isInDialogue = true;
        }
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
                if (!this.dialogueSystem.isVisible && !this.quizUI.isVisible && !this.isInventoryOpen) {
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

        this.events.on('inventory-opened', () => {
            this.isInventoryOpen = true;
            if (this.player) this.player.isInDialogue = true;
        });

        this.events.on('inventory-closed', () => {
            this.isInventoryOpen = false;
            if (!this.dialogueSystem.isVisible && !this.quizUI.isVisible) {
                if (this.player) this.player.isInDialogue = false;
            }
        });

        this.events.on('controls-overlay-opened', () => {
            this.isControlsOverlayOpen = true;
            if (this.player) this.player.isInDialogue = true;
        });

        this.events.on('controls-overlay-closed', () => {
            this.isControlsOverlayOpen = false;
            if (!this.dialogueSystem.isVisible && !this.quizUI.isVisible && !this.isInventoryOpen) {
                if (this.player) this.player.isInDialogue = false;
            }
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

        if (!this.anims.exists('sparkle_hint_anim')) {
            this.anims.create({
                key: 'sparkle_hint_anim',
                frames: this.anims.generateFrameNumbers('sparkle', { start: 0, end: 5 }),
                frameRate: 8,
                repeat: -1
            });
        }
    }

    private createEntities() {

        const npc1Config = {
            missionId: 'obras_famosas',
            dialogues: {
                intro: [
                    'Curador Viajante... Finalmente você chegou. Meus olhos já mal conseguem distinguir a luz.',
                    'O Grande Esquecimento roubou os tons, as pinceladas... roubou a alma deste salão.',
                    'Mas o seu mapa ainda brilha. Há esperança.',
                    'Preciso que você encontre a Pintura Famosa e a nossa Estátua mais antiga. Leia seus fragmentos de história.',
                    'Se você conseguir se lembrar dos detalhes delas, poderemos trazer as cores de volta a esta ala.',
                    'Vá, antes que a tela fique em branco para sempre.'
                ],
                collecting: [
                    'O cinza ainda domina este salão, Curador.',
                    'Encontre a Estátua e a Pintura Famosa. Observe os anos, os criadores... Cada detalhe é uma faísca de cor.'
                ],
                ready: [
                    'Sinto uma vibração no ar... Você tocou as obras antigas, não tocou?',
                    'As memórias estão frescas em sua mente.',
                    'Chegou a hora. Mostre-me o que aprendeu. Se suas memórias forem precisas, quebraremos o Esquecimento!',
                    'Vamos invocar as cores?'
                ],
                completed: [
                    'Olhe! O azul, o amarelo... As cores estão voltando! A memória de Vincent vive novamente!',
                    'Obrigado, Curador Viajante. Esta ala do museu nunca mais será esquecida.'
                ]
            }
        };
        const npc2Config = {
            missionId: 'reliquias_antigas',
            dialogues: {
                intro: [
                    'Passos? Há tanto tempo não ouço passos neste corredor de poeira e sombras.',
                    'Sou o Guardião das Eras. As fundações do mundo estão se desfazendo com o Esquecimento.',
                    'Se perdermos nosso passado mais profundo, não teremos chão para o futuro.',
                    'Busque as relíquias primordiais nas sombras: o Sarcófago dos reis antigos e o Fóssil cravado na pedra.',
                    'Traga-me o conhecimento deles, Curador.'
                ],
                collecting: [
                    'As areias do tempo estão escorrendo, e a névoa do Esquecimento continua espessa.',
                    'Você ainda não desvendou os segredos do Sarcófago e do Fóssil. Continue buscando.'
                ],
                ready: [
                    'A poeira ao seu redor parece brilhar... Você encontrou as fundações do passado!',
                    'Agora, devemos ancorar essa realidade. Prove que você detém a verdadeira memória das relíquias.',
                    'Prepare-se, Curador. O tempo nos julgará agora.'
                ],
                completed: [
                    'As linhas do tempo estão restauradas! O passado profundo respira mais uma vez.',
                    'Sua jornada é nobre, Curador. Leve essa luz para os próximos salões.'
                ]
            }
            /*if (this.body) {
            // Offset visual sprite 25 pixels down relative to the collision body
            // scale is 6.0, so 25 pixels in world = 25 / 6 = 4.166 in unscaled offset
            // Default offset after setSize(13, 13) on 16x16 sprite is 1.5.
            (this.body as Phaser.Physics.Arcade.Body).setOffset(1.5, 1.5 - (-10 / 6.0));
        }*/
        };

        this.rat = new Enemy(this, 2000, 315, 1);
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
            dialogText: 'Uma estátua gélida e cinzenta. A placa gasta pelo tempo diz: "Esculpida no ano de 1832,  representando a rigidez da alma humana".',
            infoKey: 'statue_info',
            requireInspectionMode: true,
            enableHint: true,
            hintDelayMs: 145000,
            hintOffsetX: 20,
            hintOffsetY: 42,
            onInfoCollected: (key) => {
                const changed = this.questManager.collectInfo(key);
                if (changed) this.events.emit('mission-progress-changed');
            }
        });

        const painting_btn = new InteractiveButton(this, 1272, 375, {
            interactionDistance: 130,
            dialogText: 'A tela está coberta por uma névoa escura, mas você consegue ler a assinatura borrada: \'Vincent\'. Ao lado, um pedaço de papel rasgado revela que a obra foi concluída em 1889, capturando uma noite estrelada antes que o mundo perdesse sua luz.',
            infoKey: 'painting_info',
            requireInspectionMode: true,
            enableHint: true,
            hintDelayMs: 135000,
            hintOffsetX: 40,
            hintOffsetY: -140,
            onInfoCollected: (key) => {
                const changed = this.questManager.collectInfo(key);
                if (changed) this.events.emit('mission-progress-changed');
            }
        });

        const sarcophagus_btn = new InteractiveButton(this, 2275, 350, {
            interactionDistance: 130,
            dialogText: 'Um túmulo pesado de uma civilização apagada. Ao afastar a tampa pesada, você não encontra ouro, mas sim uma Múmia preservada. Uma prova de que a humanidade sempre tentou lutar contra o esquecimento.',
            infoKey: 'sarcophagus_info',
            requireInspectionMode: true,
            enableHint: true,
            hintDelayMs: 140000,
            hintOffsetX: 0,
            hintOffsetY: -120,
            onInfoCollected: (key) => {
                const changed = this.questManager.collectInfo(key);
                if (changed) this.events.emit('mission-progress-changed');
            }
        });

        const fossil_btn = new InteractiveButton(this, 2769, 350, {
            interactionDistance: 130,
            dialogText: 'A marca de uma criatura gigantesca encravada na pedra. A placa do museu, quase apagada, descreve a criatura como um monarca do período Jurássico. Uma era muito antes do homem existir.',
            infoKey: 'fossil_info',
            requireInspectionMode: true,
            enableHint: true,
            hintDelayMs: 160000,
            hintOffsetX: 0,
            hintOffsetY: -100,
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
            enableHint: false,
            hintDelayMs: 15000,
            hintOffsetX: 0,
            hintOffsetY: -120,
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
            color: '#ffff8bff',
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
                    text: 'Para ancorarmos a estátua de volta à nossa realidade, me diga: em que ano a rigidez da alma humana foi cravada na pedra?',
                    options: ['1832', '1850', '1901'],
                    correctIndex: 0
                },
                {
                    text: 'A tela estava coberta por uma névoa escura. De quem é a assinatura que luta para não ser apagada pelo Esquecimento?',
                    options: ['Leonardo', 'Vincent', 'Picasso'],
                    correctIndex: 1
                },
                {
                    text: 'Antes de o mundo perder a sua luz, em que ano aquele céu estrelado foi eternizado na pintura?',
                    options: ['1789', '1889', '1920'],
                    correctIndex: 1
                }
            ], (score: number) => {
                if (score >= 3) {
                    this.questManager.setStatus(missionId, QuestStatus.COMPLETED);
                    this.events.emit('mission-status-changed');

                    const lines = [
                        `Incrível! Você demonstrou grande conhecimento!`,
                        'E conseguiu trazer um pouco de cor de volta para este salão!',
                        'Pegue essa estrela dourada como recompensa!',
                        'Você precisará delas ao longo da sua jornada!',
                        'Esse é um grande passo para restaurar a luz do mundo!'
                    ];
                    // Find the NPC to play animation
                    const npc = this.npcs.find(n => n['config'] && n['config'].missionId === missionId);
                    if (npc) npc.play('npc_anim');

                    this.questManager.setPendingResult(missionId, lines);
                    this.updateGrayscale();
                    this.dialogueSystem.showDialogue([...lines], () => this.questManager.clearPendingResult(missionId));
                } else {
                    this.questManager.setStatus(missionId, QuestStatus.READY_FOR_QUIZ);
                    this.events.emit('mission-status-changed');

                    const lines = [
                        'Hmm...',
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
                    text: 'Ao abrir o pesado túmulo antigo, qual foi a prova que você encontrou de que a humanidade sempre lutou contra o tempo e a morte?',
                    options: ['Ouro e Tesouros', 'Uma Múmia preservada', 'Vazio'],
                    correctIndex: 1
                },
                {
                    text: 'O monarca encravado na pedra viveu eras antes do primeiro ser humano respirar. A qual período o fóssil pertence?',
                    options: ['Cretáceo', 'Jurássico', 'Triássico'],
                    correctIndex: 1
                }
            ], (score: number) => {
                if (score >= 2) {
                    this.questManager.setStatus(missionId, QuestStatus.COMPLETED);
                    this.events.emit('mission-status-changed');

                    const lines = [
                        'Parabéns! Agora você entende as relíquias antigas!',
                        'O salão está mais iluminado.',
                        'Pegue essa estrela dourada, ela trará luz ao seu caminho.',
                        'Você precisará delas para avançar em sua jornada!'
                    ];
                    const npc = this.npcs.find(n => n['config'] && n['config'].missionId === missionId);
                    if (npc) npc.play('npc_anim');

                    this.questManager.setPendingResult(missionId, lines);
                    this.updateGrayscale();
                    this.dialogueSystem.showDialogue([...lines], () => this.questManager.clearPendingResult(missionId));
                } else {
                    this.questManager.setStatus(missionId, QuestStatus.READY_FOR_QUIZ);
                    this.events.emit('mission-status-changed');

                    const lines = [
                        'Hmm... Não estamos tão certos sobre as relíquias.',
                        'Acho que você precisa dar outra olhada.',
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
            this.colorMatrix = this.cameras.main.postFX.addColorMatrix();
            this.colorMatrix.grayscale(0.7);
        }
    }

    private updateGrayscale() {
        if (!this.colorMatrix) return;

        const completed = this.questManager.getTotalCompletedMissions();
        let targetGray = 0.7;

        if (completed === 1) targetGray = 0.3;
        else if (completed >= 2) targetGray = 0;

        const grayObj = { val: this.currentGrayscale };
        this.tweens.add({
            targets: grayObj,
            val: targetGray,
            duration: 2000,
            ease: 'Power2',
            onUpdate: () => {
                this.currentGrayscale = grayObj.val;
                this.colorMatrix.grayscale(this.currentGrayscale);
            }
        });
    }

    update(_time: number, _delta: number) {
    }
}
