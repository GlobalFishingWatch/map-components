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
    if (!visible) return []

    try {
      if (this.tilesCacheByid[id] !== undefined) {
        const tiles = this.tilesCacheByid[id]
        return [{ id: layer.id, ...layerData.source, tiles }]
      }

      const promise = async () => {
        const { layergroupid } = await getCartoLayergroupId({
          id,
          baseUrl: layer.baseUrl || this.baseUrl,
          ...layerData.source,
        })
        const tiles = [`${CARTO_FISHING_MAP_API}/${layergroupid}/{z}/{x}/{y}.mvt`]
        this.tilesCacheByid[id] = tiles
        return { id: layer.id, ...layerData.source, tiles }
      }
      return [{ promise }]
    } catch (e) {
      console.warn(e)
      return []
    }
  }

  getStyleLayers = (layer) => {
    const layerData = layersDirectory[layer.id] || layer
    const isSourceReady = this.tilesCacheByid[layer.id] !== undefined
    if (!isSourceReady) return []

    return layerData.layers.map((l) => {
      const layout = {
        visibility: layer.visible !== undefined ? (layer.visible ? 'visible' : 'none') : 'visible',
      }
      const paint =
        l.type === 'fill'
          ? {
              'fill-opacity': layer.opacity !== undefined ? layer.opacity : 1,
              'fill-outline-color': layer.color,
              'fill-color': 'rgba(0,0,0,0)',
            }
          : {}
      return { ...l, layout, paint }
    })
  }
}

export default CartoPolygonsGenerator
