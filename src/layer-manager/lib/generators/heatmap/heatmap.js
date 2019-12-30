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

  _getStyleSources = (layer) => {
    const url = new URL(BASE_WORKER_URL)
    url.searchParams.set('geomType', layer.geomType)
    url.searchParams.set('tileset', layer.tileset)
    url.searchParams.set('fastTilesAPI', this.fastTilesAPI)
    url.searchParams.set('delta', getDelta(layer.start, layer.end))
    return [
      {
        id: layer.id,
        type: 'vector',
        tiles: [decodeURI(url.toString())],
      },
    ]
  }

  _getStyleLayers = (layer) => {
    const paint = { ...paintByGeomType[layer.geomType] }
    const originalColorRamp = COLOR_RAMPS_RAMPS[layer.colorRamp]
    const colorRamp = [...COLOR_RAMPS_RAMPS[layer.colorRamp]]

    const colorRampMult = layer.colorRampMult || 1

    // TODO actually pick correct offset, not '0'
    colorRamp[2] = ['to-number', ['get', '0']]
    colorRamp[5] = colorRampMult * originalColorRamp[5]
    colorRamp[7] = colorRampMult * originalColorRamp[7]
    colorRamp[9] = colorRampMult * originalColorRamp[9]
    colorRamp[11] = colorRampMult * originalColorRamp[11]

    switch (layer.geomType) {
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
        type: GEOM_TYPES_GL_TYPES[layer.geomType],
        layout: {
          visibility: layer.visible ? 'visible' : 'none',
        },
        paint,
      },
    ]
  }

  getStyle = (layer) => {
    return {
      id: layer.id,
      sources: this._getStyleSources(layer),
      layers: this._getStyleLayers(layer),
    }
  }
}

export default HeatmapGenerator
