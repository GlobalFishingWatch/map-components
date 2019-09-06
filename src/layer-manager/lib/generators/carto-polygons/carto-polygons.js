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
  type = CARTO_POLYGONS_TYPE
  tilesCacheByid = {}

  constructor({ baseUrl = CARTO_FISHING_MAP_API }) {
    this.baseUrl = baseUrl
  }

  _getStyleSources = (layer) => {
    const { id } = layer
    const layerData = layersDirectory[layer.id] || layer
    const response = {
      sources: [{ id: layer.id, ...layerData.source }],
    }

    try {
      if (this.tilesCacheByid[id] !== undefined) {
        const tiles = this.tilesCacheByid[id]
        response.sources = [{ id: layer.id, ...layerData.source, tiles }]
        return response
      }

      const promise = async () => {
        try {
          const { layergroupid } = await getCartoLayergroupId({
            id,
            baseUrl: layer.baseUrl || this.baseUrl,
            ...layerData.source,
          })
          const tiles = [`${CARTO_FISHING_MAP_API}/${layergroupid}/{z}/{x}/{y}.mvt`]
          this.tilesCacheByid[id] = tiles
          return this.getStyle(layer)
        } catch (e) {
          console.warn(e)
          return response
        }
      }
      return { ...response, promise: promise() }
    } catch (e) {
      console.warn(e)
      return response
    }
  }

  _getStyleLayers = (layer) => {
    const isSourceReady = this.tilesCacheByid[layer.id] !== undefined

    const layerData = layersDirectory[layer.id] || layer
    return layerData.layers.map((glLayer) => {
      const visibility =
        layer.visible !== undefined ? (layer.visible ? 'visible' : 'none') : 'visible'
      const layout = {
        visibility: isSourceReady ? visibility : 'none',
      }
      let paint = {}
      const hasSelectedFeatures =
        layer.selectedFeatures !== undefined &&
        layer.selectedFeatures.values &&
        layer.selectedFeatures.values.length
      // TODO: make this dynamic
      if (glLayer.type === 'fill') {
        paint['fill-opacity'] = layer.opacity !== undefined ? layer.opacity : 1
        const fillColor = layer.fillColor || 'rgba(0,0,0,0)'

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
      } else if (glLayer.type === 'circle') {
        const circleColor = layer.color || '#99eeff'
        const circleOpacity = layer.opacity || 1
        const circleStrokeColor = layer.strokeColor || 'hsla(190, 100%, 45%, 0.5)'
        const circleStrokeWidth = layer.strokeWidth || 2
        const circleRadius = layer.radius || 5
        paint['circle-color'] = circleColor
        paint['circle-stroke-width'] = circleStrokeWidth
        paint['circle-radius'] = circleRadius
        paint['circle-stroke-color'] = circleStrokeColor
        if (hasSelectedFeatures) {
          const { field = 'id', values, fallback = {} } = layer.selectedFeatures
          const {
            color = 'rgba(50, 139, 169, 0.3)',
            opacity = 1,
            strokeColor = 'rgba(0,0,0,0)',
            strokeWidth = 0,
          } = fallback
          const matchFilter = ['match', ['get', field], values]
          paint[`circle-color`] = [...matchFilter, circleColor, color]
          paint['circle-opacity'] = [...matchFilter, circleOpacity, opacity]
          paint['circle-stroke-color'] = [...matchFilter, circleStrokeColor, strokeColor]
          paint['circle-stroke-width'] = [...matchFilter, circleStrokeWidth, strokeWidth]
        }
      }

      return { ...glLayer, layout, paint }
    })
  }

  getStyle = (layer) => {
    const { sources, promise } = this._getStyleSources(layer)
    return {
      id: layer.id,
      promise,
      sources: sources,
      layers: this._getStyleLayers(layer),
    }
  }
}

export default CartoPolygonsGenerator
