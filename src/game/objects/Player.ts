import * as Phaser from 'phaser';
import { PLAYER_ASSETS, PLAYER_ANIMS, PLAYER_PHYSICS, PLAYER_MOVEMENT, PLAYER_DAMAGE, PLAYER_KEYS, PLAYER_EVENTS } from './playerConfig';

export class Player extends Phaser.Physics.Arcade.Sprite {
    keys: any;
    isDead: boolean = false;
    isHit: boolean = false;
    isInDialogue: boolean = false;
    isInspecting: boolean = false;
    stairsLayer: Phaser.Tilemaps.TilemapLayer | null = null;

    // Preload player assets
    static preload(scene: Phaser.Scene) {
        scene.load.spritesheet(PLAYER_ASSETS.WALK_SPRITESHEET.key, PLAYER_ASSETS.WALK_SPRITESHEET.path, {
            frameWidth: PLAYER_ASSETS.WALK_SPRITESHEET.frameWidth,
            frameHeight: PLAYER_ASSETS.WALK_SPRITESHEET.frameHeight
        });
        scene.load.spritesheet(PLAYER_ASSETS.INSPECT_SPRITESHEET.key, PLAYER_ASSETS.INSPECT_SPRITESHEET.path, {
            frameWidth: PLAYER_ASSETS.INSPECT_SPRITESHEET.frameWidth,
            frameHeight: PLAYER_ASSETS.INSPECT_SPRITESHEET.frameHeight
        });
        scene.load.audio(PLAYER_ASSETS.SOUNDS.MAGNIFYING_UP.key, PLAYER_ASSETS.SOUNDS.MAGNIFYING_UP.path);
        scene.load.audio(PLAYER_ASSETS.SOUNDS.MAGNIFYING_DOWN.key, PLAYER_ASSETS.SOUNDS.MAGNIFYING_DOWN.path);
    }

    // Create player animations
    static createAnims(scene: Phaser.Scene) {
        scene.anims.create({
            key: PLAYER_ANIMS.IDLE.key,
            frames: scene.anims.generateFrameNumbers(PLAYER_ANIMS.IDLE.spritesheet, { frames: [...PLAYER_ANIMS.IDLE.frames] }),
            frameRate: PLAYER_ANIMS.IDLE.frameRate,
            repeat: PLAYER_ANIMS.IDLE.repeat
        });
        scene.anims.create({
            key: PLAYER_ANIMS.WALK.key,
            frames: scene.anims.generateFrameNumbers(PLAYER_ANIMS.WALK.spritesheet, { frames: [...PLAYER_ANIMS.WALK.frames] }),
            frameRate: PLAYER_ANIMS.WALK.frameRate,
            repeat: PLAYER_ANIMS.WALK.repeat
        });
        scene.anims.create({
            key: PLAYER_ANIMS.INSPECT.key,
            frames: scene.anims.generateFrameNumbers(PLAYER_ANIMS.INSPECT.spritesheet, { frames: [...PLAYER_ANIMS.INSPECT.frames] }),
            frameRate: PLAYER_ANIMS.INSPECT.frameRate,
            repeat: PLAYER_ANIMS.INSPECT.repeat
        });
        scene.anims.create({
            key: PLAYER_ANIMS.STOP_INSPECT.key,
            frames: scene.anims.generateFrameNumbers(PLAYER_ANIMS.STOP_INSPECT.spritesheet, { frames: [...PLAYER_ANIMS.STOP_INSPECT.frames] }),
            frameRate: PLAYER_ANIMS.STOP_INSPECT.frameRate,
            repeat: PLAYER_ANIMS.STOP_INSPECT.repeat
        });
    }

    // Create player
    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
        super(scene, x, y, texture);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.keys = this.scene.input.keyboard?.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.UP],
            down: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.DOWN],
            left: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.LEFT],
            right: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.RIGHT],
            w: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.W],
            a: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.A],
            s: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.S],
            d: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.D],
            space: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.SPACE],
            E: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.E],
            shift: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.SHIFT]
        }) as any;

        this.setScale(PLAYER_PHYSICS.SCALE);
        this.setDamping(PLAYER_PHYSICS.DAMPING);
        this.setSize(PLAYER_PHYSICS.HITBOX.WIDTH, PLAYER_PHYSICS.HITBOX.HEIGHT);
        this.setOffset(PLAYER_PHYSICS.HITBOX_OFFSET.X, PLAYER_PHYSICS.HITBOX_OFFSET.Y);
        this.setDrag(PLAYER_PHYSICS.DRAG.X, PLAYER_PHYSICS.DRAG.Y);
        this.setGravity(PLAYER_PHYSICS.GRAVITY.X, PLAYER_PHYSICS.GRAVITY.Y);
        this.setMaxVelocity(PLAYER_PHYSICS.MAX_VELOCITY.X, PLAYER_PHYSICS.MAX_VELOCITY.Y);

        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
        }, this);
        this.play(PLAYER_ANIMS.INITIAL_ANIM);
    }

    // Player damage? maybe
    takeDamage(dirX: number) {
        if (this.isDead || this.isHit) return;

        // Take damage logic
        this.isHit = true;
        this.setVelocityY(PLAYER_DAMAGE.KNOCKBACK_VELOCITY_Y);
        this.setVelocityX(dirX * PLAYER_DAMAGE.KNOCKBACK_VELOCITY_X);

        // Flash red
        this.setTint(PLAYER_DAMAGE.HIT_TINT);

        this.scene.time.delayedCall(PLAYER_DAMAGE.HIT_STUN_DURATION_MS, () => {
            this.clearTint();
            this.isHit = false;
        });
    }

    // Player update logic (runs once per frame)
    update(_ts: number, _dt: number) {
        if (this.isDead || this.isInDialogue) return;

        if (this.isHit) {
            // Cannot control while in hit stun
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.shift)) {
            this.isInspecting = !this.isInspecting;
            this.scene.events.emit(PLAYER_EVENTS.INSPECT_MODE_TOGGLED, this.isInspecting);
            if (this.isInspecting) {
                this.anims.play(PLAYER_ANIMS.INSPECT.key, true);
                this.scene.sound.play(PLAYER_ASSETS.SOUNDS.MAGNIFYING_UP.key);
            } else {
                this.anims.play(PLAYER_ANIMS.STOP_INSPECT.key, true);
                this.scene.sound.play(PLAYER_ASSETS.SOUNDS.MAGNIFYING_DOWN.key);
            }
        }

        const isStopInspectPlaying = this.anims.currentAnim?.key === PLAYER_ANIMS.STOP_INSPECT.key && this.anims.isPlaying;

        const leftDown = this.keys.left.isDown || this.keys.a.isDown;
        const rightDown = this.keys.right.isDown || this.keys.d.isDown;
        const jumpDown = this.keys.space.isDown || this.keys.up.isDown || this.keys.w.isDown;

        if (leftDown && this.body) {
            if (!this.isInspecting && !isStopInspectPlaying) {
                this.anims.play(PLAYER_ANIMS.WALK.key, true);
            }
            this.body.velocity.x -= this.isInspecting ? PLAYER_MOVEMENT.INSPECT_ACCELERATION : PLAYER_MOVEMENT.WALK_ACCELERATION;
            this.setFlipX(true);
        }
        else if (rightDown && this.body) {
            if (!this.isInspecting && !isStopInspectPlaying) {
                this.anims.play(PLAYER_ANIMS.WALK.key, true);
            }
            this.body.velocity.x += this.isInspecting ? PLAYER_MOVEMENT.INSPECT_ACCELERATION : PLAYER_MOVEMENT.WALK_ACCELERATION;
            this.setFlipX(false);
        }
        else if (!this.isInspecting && !isStopInspectPlaying) {
            this.anims.play(PLAYER_ANIMS.IDLE.key, true);
        }

        if (this.body && jumpDown && this.body.blocked.down && !this.isInspecting && !isStopInspectPlaying) {
            this.setVelocityY(PLAYER_MOVEMENT.JUMP_VELOCITY_Y);
        }

        if (this.stairsLayer && this.body) {
            const body = this.body as Phaser.Physics.Arcade.Body;

            // Verificamos o tile na posição central do corpo do jogador
            const tile = this.stairsLayer.getTileAtWorldXY(body.center.x, body.center.y, true);

            const upDown = this.keys.up.isDown || this.keys.w.isDown;
            const downDown = this.keys.down.isDown || this.keys.s.isDown;

            // Se o tile não for nulo e não for vazio (index !== -1)
            if (tile && tile.index !== -1) {
                body.setAllowGravity(false);
                if (upDown) {
                    body.setVelocityY(-PLAYER_MOVEMENT.CLIMB_SPEED_Y);
                } else if (downDown) {
                    body.setVelocityY(PLAYER_MOVEMENT.CLIMB_SPEED_Y);
                } else {
                    body.setVelocityY(0);
                }
            } else {
                // Fora da escada
                body.setAllowGravity(true);
            }
        }
    }
}
