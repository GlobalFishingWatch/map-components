import layersDirectory from './basemap-layers.json'

export const BASEMAP_TYPE = 'BASEMAP'

class BasemapGenerator {
  type = BASEMAP_TYPE

  _getStyleSources = (layer) => {
    const { id, attribution } = layer
    const source = {
      ...layer.source,
      ...(layersDirectory[id] && layersDirectory[id].source),
      ...(attribution && { attribution }),
    }
    return [{ id, ...source }]
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
