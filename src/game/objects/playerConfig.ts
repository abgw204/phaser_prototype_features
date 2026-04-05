// ============================================================
//  PLAYER CONFIG
//  Arquivo de configuração central do Player.
//  Todas as macros/constantes usadas para instanciar e
//  controlar o objeto Player devem ser definidas aqui.
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
// SPAWN / POSIÇÃO INICIAL
// ------------------------------------------------------------
export const PLAYER_SPAWN = {
    X: 300,
    Y: 3500,
    TEXTURE: PLAYER_ASSETS.WALK_SPRITESHEET.key,   // textura usada no constructor
} as const;

// ------------------------------------------------------------
// STATS
// ------------------------------------------------------------
export const PLAYER_STATS = {
    HP: 3,
    INITIAL_COINS: 0,
} as const;

// ------------------------------------------------------------
// FÍSICA
// ------------------------------------------------------------
export const PLAYER_PHYSICS = {
    SCALE: 6.0,

    /** Tamanho do hitbox (setSize) */
    HITBOX: {
        WIDTH: 15,
        HEIGHT: 20,
    },

    /** Offset do hitbox (setOffset) */
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
// MOVIMENTO
// ------------------------------------------------------------
export const PLAYER_MOVEMENT = {
    /** Aceleração horizontal normal */
    WALK_ACCELERATION: 90,

    /** Aceleração horizontal no modo inspeção */
    INSPECT_ACCELERATION: 25,

    /** Velocidade vertical do pulo */
    JUMP_VELOCITY_Y: -1200,

    /** Velocidade vertical ao subir/descer escadas */
    CLIMB_SPEED_Y: 600,
} as const;

// ------------------------------------------------------------
// DANO / KNOCKBACK
// ------------------------------------------------------------
export const PLAYER_DAMAGE = {
    /** Duração do hit-stun em ms */
    HIT_STUN_DURATION_MS: 400,

    /** Velocidade vertical do knockback */
    KNOCKBACK_VELOCITY_Y: -1700,

    /** Multiplicador do knockback horizontal (× dirX) */
    KNOCKBACK_VELOCITY_X: 1500,

    /** Cor do flash ao tomar dano (vermelho) */
    HIT_TINT: 0xff0000,
} as const;

// ------------------------------------------------------------
// ANIMAÇÕES
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
    /** Animação inicial ao criar o player */
    INITIAL_ANIM: 'inspect',
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
// EVENTOS (scene.events.emit / on)
// ------------------------------------------------------------
export const PLAYER_EVENTS = {
    INSPECT_MODE_TOGGLED: 'inspect-mode-toggled',
} as const;