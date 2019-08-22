import layersDirectory from './carto-polygons-layers.json'

export const CARTO_POLYGONS_TYPE = 'CARTO_POLYGONS'
export const CARTO_FISHING_MAP_API = 'https://carto.globalfishingwatch.org/user/admin/api/v1/map'

const getCartoLayergroupId = async ({ id, sql, baseUrl }) => {
  const layerConfig = JSON.stringify({
    version: '1.3.0',
    stat_tag: 'API',
    layers: [{ id, options: { sql } }],
  })
  const url = `${baseUrl}?config=${encodeURIComponent(layerConfig)}`

  const response = await fetch(url).then((res) => {
    if (res.status >= 400) {
      throw new Error(`loading of layer failed ${id}`)
    }
    return res.json()
  })

  return response
}

class CartoPolygonsGenerator {
  constructor({ baseUrl = CARTO_FISHING_MAP_API }) {
    this.type = CARTO_POLYGONS_TYPE
    this.baseUrl = baseUrl
    this.tilesCacheByid = {}
  }

  getStyleSources = (layer) => {
    const { id } = layer
    const layerData = layersDirectory[layer.id] || layer
    const visible = layer.visible === undefined || layer.visible === true
    const response = {
      sources: [],
    }
    if (!visible) return response

    try {
      if (this.tilesCacheByid[id] !== undefined) {
        const tiles = this.tilesCacheByid[id]
        response.sources = [{ id: layer.id, ...layerData.source, tiles }]
        return response
      }

      const promise = async () => {
        const { layergroupid } = await getCartoLayergroupId({
          id,
          baseUrl: layer.baseUrl || this.baseUrl,
          ...layerData.source,
        })
        const tiles = [`${CARTO_FISHING_MAP_API}/${layergroupid}/{z}/{x}/{y}.mvt`]
        this.tilesCacheByid[id] = tiles
        return this.getStyle(layer)
      }
      return { ...response, promise: promise() }
    } catch (e) {
      console.warn(e)
      return response
    }
  }

  getStyleLayers = (layer) => {
    const isSourceReady = this.tilesCacheByid[layer.id] !== undefined
    if (!isSourceReady) return []

    const layerData = layersDirectory[layer.id] || layer
    return layerData.layers.map((glLayer) => {
      const layout = {
        visibility: layer.visible !== undefined ? (layer.visible ? 'visible' : 'none') : 'visible',
      }
      let paint = {}
      if (glLayer.type === 'fill') {
        paint['fill-opacity'] = layer.opacity !== undefined ? layer.opacity : 1
        const fillColor = layer.fillColor || 'rgba(0,0,0,0)'
        const hasSelectedFeatures =
          layer.selectedFeatures !== undefined &&
          layer.selectedFeatures.values &&
          layer.selectedFeatures.values.length

        if (hasSelectedFeatures) {
          const { field = 'id', values, fill = {} } = layer.selectedFeatures
          const { color = fillColor, fillOutlineColor = layer.color } = fill

          const matchFilter = ['match', ['get', field], values]
          paint[`fill-color`] = [...matchFilter, color, fillColor]
          paint[`fill-outline-color`] = [...matchFilter, fillOutlineColor, layer.color]
        } else {
          paint[`fill-color`] = fillColor
          paint[`fill-outline-color`] = layer.color
        }
      }

      return { ...glLayer, layout, paint }
    })
  }

  getStyle = (layer) => {
    const { sources, promise } = this.getStyleSources(layer)
    return {
      id: layer.id,
      promise,
      sources: sources,
      layers: this.getStyleLayers(layer),
    }
  }
}

export default CartoPolygonsGenerator
