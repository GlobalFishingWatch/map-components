export const BACKGROUND_TYPE = 'background'

const BasemapGenerator = {
  type: BACKGROUND_TYPE,
  getStyleSources: async () => [],
  getStyleLayers: async (layer) => [
    {
      id: 'background',
      type: 'background',
      layout: {
        visibility: layer.visible !== undefined ? (layer.visible ? 'visible' : 'none') : 'visible',
      },
      paint: {
        'background-color': layer.color || '#001436',
      },
    },
  ],
}

export default BasemapGenerator
