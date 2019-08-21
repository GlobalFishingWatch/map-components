import layersDirectory from './basemap-layers.json'

export const BASEMAP_TYPE = 'BASEMAP'

class BasemapGenerator {
  constructor() {
    this.type = BASEMAP_TYPE
  }
  getStyleSources = (layer) => {
    const { id } = layer
    const sourceData = layersDirectory[id] || layer
    return [{ id, ...sourceData.source }] || []
  }
  getStyleLayers = (layer) => {
    const layerData = layersDirectory[layer.id]
    return layerData !== undefined ? layerData.layers : []
  }
}

export default BasemapGenerator
