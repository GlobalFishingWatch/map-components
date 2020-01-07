import memoizeOne from 'memoize-one'
import paintByGeomType from './heatmap-layers-paint'

export const HEATMAP_TYPE = 'HEATMAP'

const FAST_TILES_KEY = '__fast_tiles__'
const DEFAULT_FAST_TILES_API = 'https://fst-tiles-jzzp2ui3wq-uc.a.run.app/v1/'
const BASE_WORKER_URL = `http://${FAST_TILES_KEY}/{z}/{x}/{y}`

export const GEOM_TYPES = {
  BLOB: 'blob',
  GRIDDED: 'gridded',
  EXTRUDED: 'extruded',
}

export const GEOM_TYPES_GL_TYPES = {
  [GEOM_TYPES.BLOB]: 'heatmap',
  [GEOM_TYPES.GRIDDED]: 'fill',
  [GEOM_TYPES.EXTRUDED]: 'fill-extrusion',
}

export const COLOR_RAMPS = {
  FISHING: 'fishing',
  PRESENCE: 'presence',
  RECEPTION: 'reception',
}

const COLOR_RAMPS_RAMPS = {
  [COLOR_RAMPS.FISHING]: [
    'interpolate',
    ['linear'],
    'dummy',
    0,
    'rgba(0, 0, 0, 0)',
    0.01,
    '#0c276c',
    0.4,
    '#3B9088',
    0.8,
    '#EEFF00',
    1,
    '#ffffff',
  ],
  [COLOR_RAMPS.PRESENCE]: [
    'interpolate',
    ['linear'],
    'dummy',
    0,
    'rgba(0, 0, 0, 0)',
    0.01,
    '#0c276c',
    0.4,
    '#114685',
    0.8,
    '#00ffc3',
    1,
    '#ffffff',
  ],
  [COLOR_RAMPS.RECEPTION]: [
    'interpolate',
    ['linear'],
    'dummy',
    0,
    'rgba(0, 0, 0, 0)',
    0.01,
    '#ff4573',
    0.4,
    '#7b2e8d',
    0.8,
    '#093b76',
    1,
    '#0c276c',
  ],
}

// TODO this can yield different deltas depending even when start and end stays equally further apart:
//  improve logic or throttle
// TODO should work also with hours
const getDelta = (start, end) => {
  const startTimestampMs = new Date(start).getTime()
  const endTimestampMs = new Date(end).getTime()
  const startTimestampDays = Math.floor(startTimestampMs / 1000 / 60 / 60 / 24)
  const endTimestampDays = Math.floor(endTimestampMs / 1000 / 60 / 60 / 24)
  let daysDelta = endTimestampDays - startTimestampDays
  return daysDelta
}

class HeatmapGenerator {
  type = HEATMAP_TYPE

  constructor({ fastTilesAPI = DEFAULT_FAST_TILES_API }) {
    this.fastTilesAPI = fastTilesAPI
  }

  _fetchStats = memoizeOne((endpoint, tileset, zoom, delta, serverSideFilters) => {
    console.log('fetch stats', delta, zoom)
    this.loadingStats = true
    const statsUrl = new URL(`${endpoint}${tileset}/statistics/${zoom}`)
    if (serverSideFilters) {
      statsUrl.searchParams.set('filters', serverSideFilters)
    }
    return fetch(statsUrl.toString())
      .then((r) => r.text())
      .then((r) => {
        this.statsMax = parseInt(r.max)
        this.statsMin = parseInt(r.min)
        this.loadingStats = false
      })
  })

  _getStyleSources = (layer) => {
    const geomType = layer.geomType || GEOM_TYPES.GRIDDED

    const url = new URL(BASE_WORKER_URL)
    url.searchParams.set('geomType', geomType)
    url.searchParams.set('tileset', layer.tileset)
    url.searchParams.set('fastTilesAPI', this.fastTilesAPI)
    url.searchParams.set('delta', getDelta(layer.start, layer.end))

    if (layer.serverSideFilters) {
      url.searchParams.set('serverSideFilters', layer.serverSideFilters)
    }
    return [
      {
        id: layer.id,
        type: 'vector',
        tiles: [decodeURI(url.toString())],
      },
    ]
  }

  _getHeatmapLayers = (layer) => {
    const geomType = layer.geomType || GEOM_TYPES.GRIDDED
    const colorRampType = layer.colorRamp || COLOR_RAMPS.PRESENCE
    const colorRampMult = layer.colorRampMult || 1
    const statsMult = this.statsMax || 1
    const deltaMult = getDelta(layer.start, layer.end)
    // const mult = colorRampMult * statsMult * deltaMult
    const mult = colorRampMult

    const paint = { ...paintByGeomType[geomType] }
    const originalColorRamp = COLOR_RAMPS_RAMPS[colorRampType]
    const colorRamp = [...COLOR_RAMPS_RAMPS[colorRampType]]

    // TODO actually pick correct offset, not '0'
    colorRamp[2] = ['to-number', ['get', '0']]
    colorRamp[5] = mult * originalColorRamp[5]
    colorRamp[7] = mult * originalColorRamp[7]
    colorRamp[9] = mult * originalColorRamp[9]
    colorRamp[11] = mult * originalColorRamp[11]

    console.log(colorRamp)

    switch (geomType) {
      case GEOM_TYPES.GRIDDED:
        paint['fill-color'] = colorRamp
        break
      default:
        break
    }

    return [
      {
        id: layer.id,
        source: layer.id,
        'source-layer': layer.tileset,
        type: GEOM_TYPES_GL_TYPES[geomType],
        layout: {
          visibility: layer.visible ? 'visible' : 'none',
        },
        paint,
      },
    ]
  }

  _getStyleLayers = (layer) => {
    const statsPromise = this._fetchStats(
      this.fastTilesAPI,
      layer.tileset,
      Math.floor(layer.zoom),
      30,
      layer.serverSideFilters
    )

    const layers = this._getHeatmapLayers(layer)

    if (this.loadingStats === false) {
      return { layers }
    }

    const promise = new Promise((resolve) => {
      statsPromise.then(() => {
        resolve(this.getStyle(layer))
      })
    })

    return { layers, promise }
  }

  getStyle = (layer) => {
    const { layers, promise } = this._getStyleLayers(layer)
    return {
      id: layer.id,
      sources: this._getStyleSources(layer),
      layers,
      promise,
    }
  }
}

export default HeatmapGenerator
