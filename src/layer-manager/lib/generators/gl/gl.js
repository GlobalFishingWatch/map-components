export const GL_TYPE = 'GL_STYLES'

class GlStyleGenerator {
  type = GL_TYPE

  _getStyleSources = (layer) => {
    return layer.sources.map((glSource) => ({ id: `${layer.id}`, ...glSource }))
  }

  _getStyleLayers = (layer) => {
    const layout = {
      visibility: layer.visible !== undefined ? (layer.visible ? 'visible' : 'none') : 'visible',
    }
    return layer.layers.map((glLayer, i) => ({
      id: `${layer.id}-${i}`,
      source: layer.id,
      ...glLayer,
      layout: {
        ...layout,
        ...glLayer.layout,
      },
    }))
  }

  getStyle = (layer) => {
    return {
      id: layer.id,
      // Auto generates sources and glLayers id using layer id when neccesary
      sources: this._getStyleSources(layer),
      layers: this._getStyleLayers(layer),
    }
  }
}

export default GlStyleGenerator
