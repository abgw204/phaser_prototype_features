import { Scene } from 'phaser';
import { Player } from '../objects/player';
import { Platforms } from '../objects/platforms';
import { Enemy } from '../objects/enemy';
import { Coin } from '../objects/coin';
import { Npc } from '../objects/npc';

export class Game extends Scene {
    player: Player;
    bg: Phaser.GameObjects.TileSprite;
    coinText: Phaser.GameObjects.Text;
    npc: Npc;

    constructor() {
        super('Game');
    }

    preload() {
        this.load.setPath('src/game/Assets');
        Player.preload(this);
        Enemy.preload(this);
        Coin.preload(this);
        Npc.preload(this);
        this.load.image('bg', 'bg.png');
        this.load.tilemapTiledJSON('map', 'map/map.json');
        this.load.image('tiles', 'map/spritesheet.png');
    }

    create() {
        this.createBackground();
        const platforms = new Platforms(this);
        this.createAnimations();

        const map = this.make.tilemap({
            key: 'map',
            tileWidth: 16,
            tileHeight: 16
        });

        const tileset = map.addTilesetImage('spritefusion', 'tiles');
        let groundLayer: Phaser.Tilemaps.TilemapLayer | null = null;

        if (tileset) {
            groundLayer = map.createLayer('Layer_0', tileset, 350, 350);
            groundLayer?.setScale(6);

            // Ativa colisão para todos os tiles existentes no layer
            groundLayer?.setCollisionByExclusion([-1]);

            // Percorre os tiles e configura para colidir apenas no topo (one-way)
            groundLayer?.forEachTile(tile => {
                if (tile.collides) {
                    // Parâmetros: left, right, up, down
                    tile.setCollision(false, false, true, false);
                }
            });
        }

        this.createEntities();

        const enemies = this.spawnEnemies();
        const coins = this.spawnCoins();

        this.setupCollisions(platforms, enemies, coins, groundLayer);
        this.setupCameras();
        this.setupHUD();
    }

    private createBackground() {
        this.bg = this.add.tileSprite(1000, 1080 / 2, 1920, 1080, 'bg')
            .setScale(2)
            .setScrollFactor(0);
    }

    private createAnimations() {
        Player.createAnims(this);
        Enemy.createAnims(this);
        Coin.createAnims(this);
        Npc.createAnims(this);
    }

    private createEntities() {
        this.npc = new Npc(this, -200, 750);
        this.player = new Player(this, -1000, 800, 'player_idle');
        this.npc.setPlayerTracking(this.player);
    }

    private spawnEnemies(): Enemy[] {
        const enemyPositions = [
            { x: 800, y: 700, direction: 1 },
            { x: 1000, y: 700, direction: -1 },
            { x: 1400, y: 700, direction: 1 },
            { x: 1500, y: 100, direction: 1 },
        ];
        return enemyPositions.map(pos => new Enemy(this, pos.x, pos.y, pos.direction));
    }

    private spawnCoins(): Coin[] {
        const coinPositions = [
            { x: 600, y: 640 },
            { x: 800, y: 493 },
            { x: 1000, y: 340 },
            { x: 1600, y: 70 },
            { x: 1600, y: 70 },
            { x: 1700, y: 70 },
            { x: 1800, y: 70 },
            { x: 1900, y: 70 },
        ];
        return coinPositions.map(pos => new Coin(this, pos.x, pos.y));
    }

    private setupCollisions(platforms: Platforms, enemies: Enemy[], coins: Coin[], groundLayer: Phaser.Tilemaps.TilemapLayer | null) {
        this.physics.add.collider(this.player, platforms.group);
        this.physics.add.collider(enemies, platforms.group);
        this.physics.add.collider(this.npc, platforms.group);

        if (groundLayer) {
            this.physics.add.collider(this.player, groundLayer);
            this.physics.add.collider(enemies, groundLayer);
            this.physics.add.collider(this.npc, groundLayer);
        }

        // Setup Coin Collection
        this.physics.add.overlap(this.player, coins, (playerObj, coinObj) => {
            const p = playerObj as Player;
            const c = coinObj as Coin;

            p.collectCoin();
            c.destroy();
            this.coinText.setText(`x ${p.coinsCollected}`);
        });

        this.physics.add.collider(this.player, enemies, (playerObj, enemyObj) => {
            const p = playerObj as Player;
            const e = enemyObj as Enemy;
            if (e.isDead || p.isDead || p.isHit) return;

            if (p.body && e.body && p.body.touching.down && e.body.touching.up) {
                e.die();
                p.setVelocityY(-2700); // Bounce
            } else {
                const dirX = p.x < e.x ? -1 : 1;
                p.takeDamage(dirX);
            }
        });
    }

    private setupCameras() {
        this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    }

    private setupHUD() {
        this.add.image(20, 24, 'coin', 0)
            .setScrollFactor(0)
            .setScale(6)
            .setOrigin(0, 0);

        this.coinText = this.add.text(90, 20, 'x 0', {
            fontSize: '48px',
            color: '#ffffff',
        }).setScrollFactor(0).setOrigin(0, 0);
    }

    update(_time: number, _delta: number) {
        if (this.bg) {
            this.bg.tilePositionX = this.cameras.main.scrollX / 2;
            this.bg.tilePositionY = this.cameras.main.scrollY / 2;
        }
    }
}
