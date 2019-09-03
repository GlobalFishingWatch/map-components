export const GL_TYPE = 'GL_TYLES'

class BasemapGenerator {
  type = GL_TYPE

  getStyle = (layer) => {
    return {
      id: layer.id,
      // Auto generates sources and glLayers id using layer id when neccesary
      sources: layer.sources.map((glSource) => ({ id: `${layer.id}`, ...glSource })),
      layers: layer.layers.map((glLayer, i) => ({
        id: `${layer.id}-${i}`,
        source: layer.id,
        ...glLayer,
      })),
    }
  }
}

export default BasemapGenerator
