import * as Phaser from 'phaser';

export class Platforms {
    group: Phaser.Physics.Arcade.StaticGroup;

    constructor(scene: Phaser.Scene) {
        this.group = scene.physics.add.staticGroup();
        // Chão principal
        this.group.add(scene.add.rectangle(400, 900, 6000, 50, 0x5C4033));
        this.group.add(scene.add.rectangle(6630, 900, 6000, 50, 0x5C4033));

        // Plataformas de Parkour
    }
}
