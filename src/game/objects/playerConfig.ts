// ============================================================
//  PLAYER CONFIG
//  Central Player configuration file.
//  All macros/constants used to instantiate and
//  control the Player object must be defined here.
// ============================================================

// ------------------------------------------------------------
// ASSETS
// ------------------------------------------------------------
export const PLAYER_ASSETS = {
    WALK_SPRITESHEET: {
        key: 'player_walk',
        path: 'player-walk.png',
        frameWidth: 32,
        frameHeight: 32,
    },
    INSPECT_SPRITESHEET: {
        key: 'player_inspect',
        path: 'player-inspect.png',
        frameWidth: 32,
        frameHeight: 32,
    },
    SOUNDS: {
        MAGNIFYING_UP: {
            key: 'magnifying_up',
            path: 'sound/magnifying_up.mp3',
        },
        MAGNIFYING_DOWN: {
            key: 'magnifying_down',
            path: 'sound/magnifying_down.mp3',
        },
    },
} as const;

// ------------------------------------------------------------
// SPAWN / INITIAL POSITION
// ------------------------------------------------------------
export const PLAYER_SPAWN = {
    X: 300,
    Y: 3500,
    TEXTURE: PLAYER_ASSETS.WALK_SPRITESHEET.key,   // texture used in the constructor
} as const;

// ------------------------------------------------------------
// STATS
// ------------------------------------------------------------
export const PLAYER_STATS = {
    HP: 3,
    INITIAL_COINS: 0,
} as const;

// ------------------------------------------------------------
// PHYSICS
// ------------------------------------------------------------
export const PLAYER_PHYSICS = {
    SCALE: 6.0,

    /** Hitbox size (setSize) */
    HITBOX: {
        WIDTH: 15,
        HEIGHT: 20,
    },

    /** Hitbox offset (setOffset) */
    HITBOX_OFFSET: {
        X: 8,
        Y: 11,
    },

    DAMPING: true,
    DRAG: { Y: 1, X: 0.0001 },

    GRAVITY: {
        X: 0,
        Y: 4500,
    },

    MAX_VELOCITY: {
        X: 3000,
        Y: 1300
    }
} as const;

// ------------------------------------------------------------
// MOVEMENT
// ------------------------------------------------------------
export const PLAYER_MOVEMENT = {
    /** Normal horizontal acceleration */
    WALK_ACCELERATION: 90,

    /** Horizontal acceleration in inspect mode */
    INSPECT_ACCELERATION: 25,

    /** Vertical jump velocity */
    JUMP_VELOCITY_Y: -1200,

    /** Vertical speed when climbing ladders */
    CLIMB_SPEED_Y: 600,
} as const;

// ------------------------------------------------------------
// DAMAGE / KNOCKBACK
// ------------------------------------------------------------
export const PLAYER_DAMAGE = {
    /** Hit-stun duration in ms */
    HIT_STUN_DURATION_MS: 400,

    /** Vertical knockback velocity */
    KNOCKBACK_VELOCITY_Y: -1700,

    /** Horizontal knockback multiplier (× dirX) */
    KNOCKBACK_VELOCITY_X: 1500,

    /** Flash color on taking damage (red) */
    HIT_TINT: 0xff0000,
} as const;

// ------------------------------------------------------------
// ANIMATIONS
// ------------------------------------------------------------
export const PLAYER_ANIMS = {
    IDLE: {
        key: 'idle',
        spritesheet: PLAYER_ASSETS.WALK_SPRITESHEET.key,
        frames: [0],
        frameRate: 10,
        repeat: -1,
    },
    WALK: {
        key: 'walk',
        spritesheet: PLAYER_ASSETS.WALK_SPRITESHEET.key,
        frames: [1, 2, 3, 4, 5, 6, 7, 0],
        frameRate: 10,
        repeat: -1,
    },
    INSPECT: {
        key: 'inspect',
        spritesheet: PLAYER_ASSETS.INSPECT_SPRITESHEET.key,
        frames: [0, 1, 2, 3, 4, 5],
        frameRate: 14,
        repeat: 0,
    },
    STOP_INSPECT: {
        key: 'stop_inspect',
        spritesheet: PLAYER_ASSETS.INSPECT_SPRITESHEET.key,
        frames: [3, 2, 1, 0],
        frameRate: 14,
        repeat: 0,
    },
    /** Initial animation on player creation */
    INITIAL_ANIM: 'idle',
} as const;

// ------------------------------------------------------------
// KEYBINDINGS
// ------------------------------------------------------------
export const PLAYER_KEYS = {
    UP: 'UP',
    DOWN: 'DOWN',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
    W: 'W',
    A: 'A',
    S: 'S',
    D: 'D',
    SPACE: 'SPACE',
    E: 'E',
    SHIFT: 'SHIFT',
} as const;

// ------------------------------------------------------------
// EVENTS (scene.events.emit / on)
// ------------------------------------------------------------
export const PLAYER_EVENTS = {
    INSPECT_MODE_TOGGLED: 'inspect-mode-toggled',
} as const;