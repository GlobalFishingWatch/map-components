const DEFAULT_FAST_TILES_API = 'https://fst-tiles-jzzp2ui3wq-uc.a.run.app/v1/'
const BASE_WORKER_URL = 'http://__heatmap__/{z}/{x}/{y}'

export const HEATMAP_TYPE = 'HEATMAP'

export const GEOM_TYPES = {
  BLOB: 'blob',
  GRIDDED: 'gridded',
  EXTRUDED: 'extruded',
}

export const COLOR_RAMPS = {
  FISHING: [
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
  PRESENCE: [
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
  RECEPTION: [
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

const getDelta = (start, end, unit) => {
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

  _getStyleLayers = (layer) => [
    // {
    //   id: layer.id,
    // },
  ]

  getStyle = (layer) => {
    return {
      id: layer.id,
      sources: this._getStyleSources(layer),
      layers: this._getStyleLayers(layer),
    }
  }
}

export default HeatmapGenerator
