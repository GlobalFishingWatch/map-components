import layersDirectory from './carto-layers.json'

export const CARTO_TYPE = 'carto'

export const CARTO_FISHING_MAP_API = 'https://carto.globalfishingwatch.org/user/admin/api/v1/map'

const cacheUrls = {}

const getCartoLayergroupId = async ({ id, sql }) => {
  const layerConfig = JSON.stringify({
    version: '1.3.0',
    stat_tag: 'API',
    layers: [{ id, options: { sql } }],
  })
  const url = `${CARTO_FISHING_MAP_API}?config=${encodeURIComponent(layerConfig)}`

  if (cacheUrls[url]) {
    return cacheUrls[url]
  }

  const response = await fetch(url).then((res) => {
    if (res.status >= 400) {
      throw new Error(`loading of layer failed ${id}`)
    }
    return res.json()
  })

  if (!cacheUrls[url]) {
    cacheUrls[url] = response
  }

  return response
}

const CartoGenerator = {
  type: CARTO_TYPE,
  getStyleSources: async (layer) => {
    const { id } = layer
    const layerData = layersDirectory[layer.id] || layer
    try {
      const cartoLayer = await getCartoLayergroupId({ id, ...layerData.source })
      const tiles = [`${CARTO_FISHING_MAP_API}/${cartoLayer.layergroupid}/{z}/{x}/{y}.mvt`]
      return [{ id: layer.id, ...layerData.source, tiles }]
    } catch (e) {
      console.warn(e)
      return []
    }
  },
  getStyleLayers: async (layer) => {
    const layerData = layersDirectory[layer.id] || layer
    return layerData.layers.map((l) => {
      const layout = {
        visibility: layer.visible !== undefined ? (layer.visible ? 'visible' : 'none') : 'visible',
      }
      const paint =
        l.type === 'fill'
          ? {
              'fill-opacity': layer.opacity || 1,
              'fill-outline-color': layer.color,
              'fill-color': 'rgba(0,0,0,0)',
            }
          : {}
      return { ...l, layout, paint }
    })
  },
}

export default CartoGenerator
