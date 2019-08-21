import Generators from './generators'
import { DEFAULT_CONFIG } from './constants'

class LayerManagerLib {
  constructor(params) {
    this.version = DEFAULT_CONFIG.version
    this.glyphs = params ? params.glyphs : DEFAULT_CONFIG.glyphs
    this.sprites = params ? params.sprites : DEFAULT_CONFIG.sprites
    this.generators = params ? params.generators : Generators
  }

  getSources = (layers) => {
    if (!layers) return { sourcesStyle: {}, sourcesPromises: [] }

    const sourcesPromises = []
    const sourcesStyle = Object.fromEntries(
      layers.flatMap((layer) => {
        if (!this.generators[layer.type]) {
          console.warn('There is no styleSource generator loaded for the layer:', layer)
          return []
        }
        const sourceGroup = this.generators[layer.type].getStyleSources(layer)
        return sourceGroup
          .map((source) => {
            const { id, promise, ...rest } = source
            if (promise) {
              sourcesPromises.push(promise)
            }
            return id ? [id, rest] : null
          })
          .filter((source) => !!source)
      })
    )
    return { sourcesStyle, sourcesPromises }
  }

  getLayers = (layers) => {
    if (!layers) return { layersStyle: [], layersPromises: [] }

    const layersPromises = []
    const layersStyle = layers.flatMap((layer) => {
      if (!this.generators[layer.type]) {
        console.warn('There is no styleLayer generator loaded for the layer:', layer)
        return []
      }
      const layers = this.generators[layer.type].getStyleLayers(layer).map((layer) => {
        if (layer.promise) {
          layersPromises.push(layer.promise)
        }
        return layer.id ? layer : []
      })
      return layers
    })

    return { layersStyle, layersPromises }
  }

  getStyleJson(sources, layers) {
    return {
      version: this.version,
      glyphs: this.glyphs,
      sprites: this.sprites,
      sources,
      layers,
    }
  }

  getGLStyle = (layers) => {
    if (!layers) {
      console.warn('No layers passed to layer manager')
    }

    const { sourcesStyle, sourcesPromises } = this.getSources(layers)
    const { layersStyle, layersPromises } = this.getLayers(layers)

    const promises = sourcesPromises
      .map((promise) => {
        return promise().then((source) => {
          const { id, ...rest } = source
          const { sourcesStyle } = this.getSources(layers)
          const { layersStyle } = this.getLayers(layers)
          const sources = {
            ...sourcesStyle,
            [id]: rest,
          }
          return this.getStyleJson(sources, layersStyle)
        })
      })
      .concat(
        layersPromises.map((promise) => {
          return promise().then((layer) => {
            const { sourcesStyle } = this.getSources(layers)
            const { layersStyle } = this.getLayers(layers)
            const layersResolved = layersStyle.map((layerStyle) => {
              if (layerStyle.id !== layer.id) return layerStyle
              return layer
            })
            return this.getStyleJson(sourcesStyle, layersResolved)
          })
        })
      )

    const style = this.getStyleJson(sourcesStyle, layersStyle)
    return [style, promises]
  }
}

export default LayerManagerLib
