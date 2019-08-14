import layersDirectory from './basemap-layers.json'

export const BASEMAP_TYPE = 'basemap'

const BasemapGenerator = {
  type: BASEMAP_TYPE,
  getStyleSources: async (layer) => {
    const { id } = layer
    const sourceData = layersDirectory[id] || layer
    return [{ id, ...sourceData.source }] || []
  },
  getStyleLayers: async (layer) => {
    const layerData = layersDirectory[layer.id]
    return layerData !== undefined ? layerData.layers : []
  },
}

export default BasemapGenerator
