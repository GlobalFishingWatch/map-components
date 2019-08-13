import Generators from './generators'
import { DEFAULT_CONFIG } from './constants'
import { hasAllRequiredParams } from '../utils'

class LayerManagerLib {
  constructor(params) {
    if (hasAllRequiredParams(params)) {
      this.version = params.version || DEFAULT_CONFIG.version
      this.glyphs = params.glyphs || DEFAULT_CONFIG.glyphs
      this.generators = params.generators || Generators
    } else {
      throw new Error('Required params missing')
    }
  }

  getSources = async (layers) => {
    const styleSources = await Promise.all(
      layers.map((layer) => {
        return this.generators[layer.type].getStyleSources()
      })
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
    const styleLayers = await Promise.all(
      layers.map((layer) => {
        return this.generators[layer.type].getStyleLayers()
      })
    )
    return styleLayers.flatMap((layers) => layers)
  }

  getGLStyle = async (layers) => {
    const [styleSources, styleLayers] = await Promise.all([
      this.getSources(layers),
      this.getLayers(layers),
    ])
    return {
      version: this.version,
      glyphs: this.glyphs,
      sources: styleSources,
      layers: styleLayers,
    }
  }
}

export default LayerManagerLib
