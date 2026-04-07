import { Scene } from 'phaser';
import { MapManager, MapData } from '../objects/MapManager';
import { Player } from '../objects/Player';
import { PLAYER_SPAWN } from '../objects/playerConfig';
import { Npc } from '../objects/Npc';
import { InteractiveButton } from '../objects/InteractiveButton';
import { QuestManager, QuestStatus } from '../objects/QuestManager';
import { Enemy } from '../objects/Enemy';
import { GameEvents } from '../constants/GameEvents';
import { SceneNames } from '../constants/SceneNames';
import { LayoutConfig } from '../constants/LayoutConfig';
import { UIScene } from './UIScene';
import { INpcEntity } from '../types/EntityTypes';
import { LevelQuizData } from '../data/LevelQuizData';
import { MissionRequirements, MissionRegistry } from '../data/MissionRegistry';

export class Game extends Scene {
    player: Player;
    rat: Enemy;
    npcs: Npc[] = [];
    questManager: QuestManager;
    vignetteEffect: Phaser.FX.Vignette | null = null;
    colorMatrix: Phaser.FX.ColorMatrix | null = null;
    stairsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    collisionLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private currentGrayscale: number = 0.0;
    private isInventoryOpen: boolean = false;
    private isControlsOverlayOpen: boolean = false;
    private isInspectTutorialOpen: boolean = false;

    constructor() {
        super(SceneNames.GAME);
    }

    preload() {
        this.load.setPath('assets/');
        Player.preload(this);
        Npc.preload(this);
        Enemy.preload(this);
        this.load.tilemapTiledJSON('map', 'map_v0/map.json');
        this.load.image('tiles', 'map_v0/spritesheet.png');
        this.load.image('exclamation', 'exclamation.png');
        this.load.image('star', 'star.png');
        this.load.image('inspect_example', 'inspect_example.png');

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
            tileWidth: 16,
            tileHeight: 16
        });

        let mapData: MapData | null = null;
        const tileset = map.addTilesetImage('dungeon', 'tiles');

        if (tileset) {
            mapData = MapManager.setupMap(this, map, tileset, 6);
            
            this.collisionLayer = mapData.tileLayers['Collision'] || null;
            this.stairsLayer = mapData.tileLayers['Stairs'] || null;
        }

        // Initialize Systems
        this.questManager = new QuestManager(MissionRequirements);

        this.setupEvents();

        this.scene.launch(SceneNames.UI, {
            phaseTitle: 'Museu antigo',
            missionsTotal: Object.keys(MissionRegistry).length,
            questManager: this.questManager,
            missionDefs: MissionRegistry
        });
        this.scene.bringToTop(SceneNames.UI);

        if (mapData) {
            this.createEntities(mapData);
        }
        this.setupCollisions(this.collisionLayer);
        this.setupCameras();

        if (this.isControlsOverlayOpen && this.player) {
            this.player.isInDialogue = true;
        }
    }

    private setupEvents() {
        this.events.on(GameEvents.DIALOGUE_STARTED, () => {
            if (this.player) this.player.isInDialogue = true;

            // Camera Zoom Effect local (Side Effect da UI removido)
            const isPlayerInspecting = this.player?.isInspecting;
            this.tweens.add({
                targets: this.cameras.main,
                zoom: isPlayerInspecting ? 1.8 : 1.2,
                duration: 400,
                ease: 'Power2',
                overwrite: true
            });
        });

        this.events.on(GameEvents.DIALOGUE_ENDED, () => {
            this.time.delayedCall(200, () => {
                if (this.player) this.player.isInDialogue = false;

                if (this.npcs) {
                    for (const npc of this.npcs) {
                        npc.play('npc_idle_anim', true);
                    }
                }
            });

            // Restore Camera
            const isPlayerInspecting = this.player?.isInspecting;
            this.tweens.add({
                targets: this.cameras.main,
                zoom: isPlayerInspecting ? 1.8 : 1.0,
                duration: 400,
                ease: 'Power2',
                overwrite: true
            });
        });

        this.events.on(GameEvents.INVENTORY_OPENED, () => {
            this.isInventoryOpen = true;
            if (this.player) this.player.isInDialogue = true;
        });

        this.events.on(GameEvents.INVENTORY_CLOSED, () => {
            this.isInventoryOpen = false;
            this.checkDialogState();
        });

        this.events.on(GameEvents.CONTROLS_OVERLAY_OPENED, () => {
            this.isControlsOverlayOpen = true;
            if (this.player) this.player.isInDialogue = true;
        });

        this.events.on(GameEvents.CONTROLS_OVERLAY_CLOSED, () => {
            this.isControlsOverlayOpen = false;
            this.checkDialogState();
        });

        this.events.on(GameEvents.INSPECT_TUTORIAL_OPENED, () => {
            this.isInspectTutorialOpen = true;
            if (this.player) this.player.isInDialogue = true;
        });

        this.events.on(GameEvents.INSPECT_TUTORIAL_CLOSED, () => {
            this.isInspectTutorialOpen = false;
            this.checkDialogState();
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

    private createEntities(mapData: MapData) {
        this.npcs = MapManager.createNpcs(this, mapData, 6);

        // 2. Static placements
        this.rat = new Enemy(this, 2000, 315, 1);
        
        // 3. Player Spawn
        let spawnX = PLAYER_SPAWN.X;
        let spawnY = PLAYER_SPAWN.Y;

        const spawnLayer = mapData.objectLayers['PlayerSpawn'];
        if (spawnLayer && spawnLayer.objects) {
            const spawnPoint = spawnLayer.objects.find((obj: any) => obj.name === 'SpawnPoint');
            if (spawnPoint) {
                spawnX = (spawnPoint.x || 0) * 6;
                spawnY = (spawnPoint.y || 0) * 6;
            }
        }

        this.player = new Player(this, spawnX, spawnY, PLAYER_SPAWN.TEXTURE);
        this.player.stairsLayer = this.stairsLayer;

        for (const npc of this.npcs) {
            npc.setPlayerTracking(this.player);
            npc.setQuestManager(this.questManager);
        }

        // 4. Interactive Items
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
                if (changed) this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
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
                if (changed) this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
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
                if (changed) this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
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
                if (changed) this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
            }
        });

        // Phase Complete Button
        const maxStars = 2;
        const endPhase_btn = new InteractiveButton(this, 1460, 395, {
            interactionDistance: 130,
            gapY: -60,
            gapX: 15,
            dialogueLines: [],
            enableHint: false,
            hintDelayMs: 15000,
            hintOffsetX: 0,
            hintOffsetY: -120,
            onInteract: () => {
                const collected = this.questManager.getTotalCompletedMissions();
                const uiScene = this.scene.get(SceneNames.UI) as UIScene;
                if (uiScene) {
                    uiScene.showPhaseCompleteUI(collected, maxStars);
                }
            }
        });

        let isEndPhaseActive = false;
        const endPhase_container = this.add.container(0, -60);
        const floatStar = this.add.image(-10, 0, 'star').setScale(2.5);
        const endPhase_floatText = this.add.text(6, 0, `0/${maxStars}`, {
            fontSize: '22px',
            color: LayoutConfig.COLORS.STAR_YELLOW,
            fontStyle: 'bold',
            stroke: LayoutConfig.COLORS.BLACK,
            strokeThickness: 4
        }).setOrigin(0, 0.5);

        endPhase_container.add([floatStar, endPhase_floatText]);
        endPhase_btn.add(endPhase_container);

        this.events.on(GameEvents.MISSION_STATUS_CHANGED, () => {
            const collected = this.questManager.getTotalCompletedMissions();
            endPhase_floatText.setText(`${collected}/${maxStars}`);

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
        const questions = LevelQuizData[missionId];
        if (!questions) {
            console.warn(`[Game] No quiz data for missionId: ${missionId}`);
            return;
        }

        this.events.emit(GameEvents.SHOW_QUIZ_REQUEST, questions, (score: number) => {
            const isSuccess = score >= questions.length;
            
            if (isSuccess) {
                this.questManager.setStatus(missionId, QuestStatus.COMPLETED);
                this.events.emit(GameEvents.MISSION_STATUS_CHANGED);

                const lines = missionId === 'obras_famosas' ? [
                    `Incrível! Você demonstrou grande conhecimento!`,
                    'E conseguiu trazer um pouco de cor de volta para este salão!',
                    'Pegue essa estrela dourada como recompensa!',
                    'Você precisará delas ao longo da sua jornada!',
                    'Esse é um grande passo para restaurar a luz do mundo!'
                ] : [
                    'Parabéns! Agora você entende as relíquias antigas!',
                    'O salão está mais iluminado.',
                    'Pegue essa estrela dourada, ela trará luz ao seu caminho.',
                    'Você precisará delas para avançar em sua jornada!'
                ];

                const npc = this.npcs.find(n => (n as unknown as INpcEntity).config && (n as unknown as INpcEntity).config.missionId === missionId);
                if (npc) npc.play('npc_anim');

                this.questManager.setPendingResult(missionId, lines);
                this.updateGrayscale();
                this.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [...lines], () => this.questManager.clearPendingResult(missionId));
            } else {
                this.questManager.setStatus(missionId, QuestStatus.READY_FOR_QUIZ);
                this.events.emit(GameEvents.MISSION_STATUS_CHANGED);

                const lines = missionId === 'obras_famosas' ? [
                    'Hmm...',
                    'Talvez precise observar as obras com mais atenção...',
                    'Tente ler as informações novamente!'
                ] : [
                    'Hmm... Não estamos tão certos sobre as relíquias.',
                    'Acho que você precisa dar outra olhada.',
                    'Preste bem atenção nos detalhes!'
                ];
                this.questManager.setPendingResult(missionId, lines);
                this.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [...lines], () => this.questManager.clearPendingResult(missionId));
            }
        });
    }

    private checkDialogState() {
        if (!this.isInventoryOpen && !this.isControlsOverlayOpen && !this.isInspectTutorialOpen) {
             if (this.player) this.player.isInDialogue = false;
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
            this.colorMatrix = this.cameras.main.postFX.addColorMatrix();
            this.colorMatrix.grayscale(this.currentGrayscale);
        }
    }

    private updateGrayscale() {
        if (!this.colorMatrix) return;

        const completed = this.questManager.getTotalCompletedMissions();
        let targetGray = 0.0;

        if (completed === 1) targetGray = 0.3;
        else if (completed >= 2) targetGray = 0;

        const grayObj = { val: this.currentGrayscale };
        this.tweens.add({
            targets: grayObj,
            val: targetGray,
            duration: 2000,
            ease: 'Power2',
            onUpdate: () => {
                if (this.colorMatrix) {
                    this.currentGrayscale = grayObj.val;
                    this.colorMatrix.grayscale(this.currentGrayscale);
                }
            }
        });
    }

    update(_time: number, _delta: number) {
    }
}
