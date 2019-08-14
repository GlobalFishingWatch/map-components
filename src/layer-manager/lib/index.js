import Generators from './generators'
import { DEFAULT_CONFIG } from './constants'
import { hasAllRequiredParams } from './utils'

class LayerManagerLib {
  constructor(params) {
    if (hasAllRequiredParams(params)) {
      this.version = params.version || DEFAULT_CONFIG.version
      this.glyphs = params.glyphs || DEFAULT_CONFIG.glyphs
      this.sprites = params.sprites || DEFAULT_CONFIG.sprites
      this.generators = params.generators || Generators
    } else {
      throw new Error('Required params missing')
    }
  }

  getSources = async (layers) => {
    if (!layers) return {}

    const styleSources = await Promise.all(
      layers
        .map((layer) => {
          if (!this.generators[layer.type]) {
            console.warn('There is no styleSource generator loaded for the layer:', layer)
            return null
          }
          return this.generators[layer.type].getStyleSources(layer)
        })
        .filter((l) => l !== null)
    )
    return Object.fromEntries(
      styleSources.flatMap((sourceGroup) => {
        return sourceGroup.map((source) => {
          const { id, ...rest } = source
          return [id, rest]
        })
      })
    )
  }

  getLayers = async (layers) => {
    if (!layers) return []

    const styleLayers = await Promise.all(
      layers
        .map((layer) => {
          if (!this.generators[layer.type]) {
            console.warn('There is no styleLayer generator loaded for the layer:', layer)
            return null
          }
          return this.generators[layer.type].getStyleLayers(layer)
        })
        .filter((l) => l !== null)
    )
    return styleLayers.flatMap((layers) => layers)
  }

  getGLStyle = async (layers) => {
    if (!layers) {
      console.warn('No layers passed to layer manager')
    }

    const [styleSources, styleLayers] = await Promise.all([
      this.getSources(layers),
      this.getLayers(layers),
    ])
    return {
      version: this.version,
      glyphs: this.glyphs,
      sprites: this.sprites,
      sources: styleSources,
      layers: styleLayers,
    }
  }
}

export default LayerManagerLib
