import { Scene } from 'phaser';
import { Player } from '../objects/player';
import { Npc } from '../objects/npc';
import { InteractiveButton } from '../objects/interactiveButton';

export class Game extends Scene {
    player: Player;
    npc: Npc;

    constructor() {
        super('Game');
    }

    preload() {
        this.load.setPath('src/game/Assets');
        Player.preload(this);
        Npc.preload(this);
        this.load.tilemapTiledJSON('map', 'museum/map.json');
        this.load.image('tiles', 'museum/spritesheet.png');
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
            // Background layer - sem colisão
            const bgLayer = map.createLayer('Background', tileset, 0, 0);
            bgLayer?.setScale(10);

            // Collision layer - colisão nas quatro direções
            collisionLayer = map.createLayer('Collision', tileset, 0, 0);
            collisionLayer?.setScale(10);
            collisionLayer?.setCollisionByExclusion([-1]);
        }

        this.createEntities();
        this.setupCollisions(collisionLayer);
        this.setupCameras();
    }

    private createAnimations() {
        Player.createAnims(this);
        Npc.createAnims(this);
    }

    private createEntities() {
        this.npc = new Npc(this, 1000, 190, 'Esses slimes corrompidos estão destruindo nossas cavernas. Acabe com eles o mais rápido possível!');
        this.player = new Player(this, 600, 144, 'player_idle');
        this.npc.setPlayerTracking(this.player);

        // Exemplo: botão interativo em uma posição desejada
        const button = new InteractiveButton(this, 1500, 300, {
            interactionDistance: 130,
            dialogText: 'Bem-vindo ao museu! Explore as obras de arte ao redor.',
        });
        button.setPlayerTracking(this.player);
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
