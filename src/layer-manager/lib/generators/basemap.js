export const BASEMAP_TYPE = 'basemap'

const BasemapGenerator = {
  type: BASEMAP_TYPE,
  getStyleSources: async () => [
    {
      id: 'north-star',
      tiles: [
        'https://gtiles-dot-world-fishing-827.appspot.com/v1/tileset/ns/tile?x={x}&y={y}&z={z}',
      ],
      type: 'raster',
      tileSize: 256,
    },
  ],
  getStyleLayers: async () => [
    {
      id: 'north-star',
      type: 'raster',
      source: 'north-star',
    },
  ],
}

export default BasemapGenerator
