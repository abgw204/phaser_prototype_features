import * as Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
	moveEvent: Phaser.Time.TimerEvent;
	direction: number;
	isDead: boolean = false;

	static preload(scene: Phaser.Scene) {
		scene.load.spritesheet('enemy_walking', 'slime/enemy_spritesheet.png', {
			frameWidth: 32,
			frameHeight: 32
		});
	}

	static createAnims(scene: Phaser.Scene) {
		scene.anims.create({
			key: 'enemy_walk',
			frames: scene.anims.generateFrameNumbers('enemy_walking', { start: 0, end: 4 }),
			frameRate: 10,
			repeat: -1
		});
		scene.anims.create({
			key: 'enemy_death',
			frames: scene.anims.generateFrameNumbers('enemy_walking', { start: 6, end: 11 }),
			frameRate: 16,
			repeat: 0
		});
	}

	constructor(scene: Phaser.Scene, x: number, y: number, direction: number) {
		super(scene, x, y, 'enemy_walking');

		scene.add.existing(this);
		scene.physics.add.existing(this);
		this.direction = direction;

		this.setScale(4.5);
		this.body?.setSize(26, 20);
		this.body?.setOffset(2, 10);
		this.setGravityY(8000);
		this.play('enemy_walk');

		this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
		this.once(Phaser.GameObjects.Events.DESTROY, () => {
			this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
			if (this.moveEvent) this.moveEvent.destroy();
		}, this);

		this.moveEvent = scene.time.addEvent({
			delay: 4000,
			callback: () => {
				this.direction *= -1;
			},
			loop: true
		});
	}

	die() {
		if (this.isDead) return;
		this.isDead = true;

		if (this.moveEvent) this.moveEvent.destroy();

		if (this.body) {
			this.body.velocity.x = 0;
			this.body.enable = false; // Disable physics
		}

		this.play('enemy_death', true);
		this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			this.destroy();
		});
	}

	update(_ts: number, _dt: number) {
		if (this.isDead) return;

		if (this.body) {
			this.setVelocityX(200 * this.direction);
			this.setFlipX(this.direction === 1);
		}
	}
}