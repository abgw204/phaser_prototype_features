import { Scene, Tilemaps } from 'phaser';
import { Npc } from './Npc';
import { NPC_CONFIGS } from './npcConfig';

export interface MapData {
    tileLayers: Record<string, Phaser.Tilemaps.TilemapLayer>;
    objectLayers: Record<string, Phaser.Tilemaps.ObjectLayer>;
}

export class MapManager {
    /**
     * Dynamically creates all tile layers and extracts object layers from the map,
     * relying on Tiled custom properties (e.g., 'collider').
     */
    static setupMap(_scene: Scene, map: Tilemaps.Tilemap, tileset: Tilemaps.Tileset, scale: number = 6): MapData {
        const result: MapData = {
            tileLayers: {},
            objectLayers: {}
        };

        // 1. Process Tilemap Layers dynamically
        for (const layerData of map.layers) {
            const layer = map.createLayer(layerData.name, tileset, 0, 0);
            if (!layer) continue;

            layer.setScale(scale);

            // Check for 'collider' custom property set in Tiled editor
            const colliderProp = (layerData.properties as any[])?.find(p => p.name === 'collider');
            const hasCollider = colliderProp ? colliderProp.value : false;
            
            if (hasCollider) {
                // Apply collisions to all tiles except empty ones (-1)
                layer.setCollisionByExclusion([-1]);
            }

            // Optional: Support for dynamically setting depth (Z-Index)
            const depthProp = (layerData.properties as any[])?.find(p => p.name === 'depth');
            if (depthProp !== undefined) {
                layer.setDepth(depthProp.value);
            }

            result.tileLayers[layerData.name] = layer;
        }

        // 2. Process Object Layers
        if (map.objects) {
            for (const objLayer of map.objects) {
                result.objectLayers[objLayer.name] = objLayer;
            }
        }

        return result;
    }

    /**
     * Dynamically loads NPCs from the object layers in the map data.
     */
    static createNpcs(scene: Scene, mapData: MapData, scale: number = 6): Npc[] {
        const npcs: Npc[] = [];
        
        Object.values(mapData.objectLayers).forEach(layer => {
            layer.objects.forEach((obj: any) => {
                const objectType = obj.type || obj.class;

                if (objectType === 'Npc') {
                    const missionId = obj.properties?.find((p: any) => p.name === 'missionId')?.value;
                    const flipX = obj.properties?.find((p: any) => p.name === 'flipX')?.value || false;

                    const config = NPC_CONFIGS[missionId];
                    if (config) {
                        const npc = new Npc(scene, obj.x * scale, obj.y * scale, config);
                        npc.setFlipX(flipX);
                        npcs.push(npc);
                    } else {
                        console.warn(`[MapManager] NPC at (${obj.x}, ${obj.y}) has invalid missionId: ${missionId}`);
                    }
                }
            });
        });

        return npcs;
    }
}
