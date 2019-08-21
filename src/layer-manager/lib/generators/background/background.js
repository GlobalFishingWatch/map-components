export const BACKGROUND_TYPE = 'BACKGROUND'

class BasemapGenerator {
  constructor() {
    this.type = BACKGROUND_TYPE
  }
  getStyleSources = () => []
  getStyleLayers = (layer) => [
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
  ]
  getStyle = (layer) => {
    return {
      id: layer.id,
      sources: this.getStyleSources(layer),
      layers: this.getStyleLayers(layer),
    }
  }
}

export default BasemapGenerator
