import layersDirectory from './basemap-layers.json'

export const BASEMAP_TYPE = 'BASEMAP'

class BasemapGenerator {
  constructor() {
    this.type = BASEMAP_TYPE
  }
  _getStyleSources = (layer) => {
    const { id } = layer
    const sourceData = layersDirectory[id] || layer
    return [{ id, ...sourceData.source }] || []
  }
  _getStyleLayers = (layer) => {
    const layerData = layersDirectory[layer.id]
    return layerData !== undefined ? layerData.layers : []
  }

  getStyle = (layer) => {
    return {
      id: layer.id,
      sources: this._getStyleSources(layer),
      layers: this._getStyleLayers(layer),
    }
  }
}

export default BasemapGenerator
