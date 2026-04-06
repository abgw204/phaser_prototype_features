import { Scene, Tilemaps } from 'phaser';

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
}
