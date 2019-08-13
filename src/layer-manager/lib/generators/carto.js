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

const layersDirectory = {
  cp_rfmo: {
    id: 'cp_rfmo',
    sql:
      'SELECT the_geom, the_geom_webmercator, cartodb_id, id, id as rfb FROM carrier_portal_rfmo_hi_res',
    popups: [{ id: 'rfb' }, { id: 'POLYGON_LAYERS_AREA' }],
    type: 'vector',
  },
}

const CartoGenerator = {
  type: CARTO_TYPE,
  getStyleSources: async (layer) => {
    const layerData = layersDirectory[layer.id] || layer
    try {
      const cartoLayer = await getCartoLayergroupId(layerData)
      const tiles = [`${CARTO_FISHING_MAP_API}/${cartoLayer.layergroupid}/{z}/{x}/{y}.mvt`]
      return [{ ...layerData, tiles }]
    } catch (e) {
      console.warn(e)
      return []
    }
  },
  getStyleLayers: async (layer) => [
    {
      id: 'cp_rfmo',
      type: 'fill',
      source: 'cp_rfmo',
      'source-layer': 'cp_rfmo',
      paint: {
        'fill-opacity': 1,
        'fill-outline-color': layer.color,
        'fill-color': 'rgba(0,0,0,0)',
      },
    },
  ],
}

export default CartoGenerator
