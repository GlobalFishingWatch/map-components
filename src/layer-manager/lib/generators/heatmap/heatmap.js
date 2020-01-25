import memoizeOne from 'memoize-one'
import flatten from 'lodash/flatten'
import compact from 'lodash/compact'
import debounce from 'lodash/debounce'
import zip from 'lodash/zip'
import paintByGeomType from './heatmap-layers-paint'

export const HEATMAP_TYPE = 'HEATMAP'

const FAST_TILES_KEY = '__fast_tiles__'
const DEFAULT_FAST_TILES_API = 'https://fst-tiles-jzzp2ui3wq-uc.a.run.app/v1/'
const BASE_WORKER_URL = `http://${FAST_TILES_KEY}/{z}/{x}/{y}`

export const toDays = (d) => {
  return Math.floor(new Date(d).getTime() / 1000 / 60 / 60 / 24)
}

export const DEFAULT_QUANTIZE_OFFSET = toDays('2019-01-01T00:00:00.000Z')

export const HEATMAP_GEOM_TYPES = {
  BLOB: 'blob',
  GRIDDED: 'gridded',
  EXTRUDED: 'extruded',
}

export const HEATMAP_GEOM_TYPES_GL_TYPES = {
  [HEATMAP_GEOM_TYPES.BLOB]: 'heatmap',
  [HEATMAP_GEOM_TYPES.GRIDDED]: 'fill',
  [HEATMAP_GEOM_TYPES.EXTRUDED]: 'fill-extrusion',
}

export const HEATMAP_COLOR_RAMPS = {
  FISHING: 'fishing',
  PRESENCE: 'presence',
  RECEPTION: 'reception',
}

const HEATMAP_COLOR_RAMPS_RAMPS = {
  [HEATMAP_COLOR_RAMPS.FISHING]: [
    'rgba(12, 39, 108, 0)',
    'rgb(12, 39, 108)',
    '#3B9088',
    '#EEFF00',
    '#ffffff',
  ],
  [HEATMAP_COLOR_RAMPS.PRESENCE]: [
    'rgba(12, 39, 108, 0)',
    'rgb(12, 39, 108)',
    '#114685',
    '#00ffc3',
    '#ffffff',
  ],
  [HEATMAP_COLOR_RAMPS.RECEPTION]: [
    'rgba(255, 69, 115, 0)',
    'rgb(255, 69, 115)',
    '#7b2e8d',
    '#093b76',
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

// TODO This is hardcoded for now, but it will need to be set intelligently
const quantizeOffset = DEFAULT_QUANTIZE_OFFSET

// TODO for now only works in days
const toQuantizedDays = (d) => {
  const days = toDays(d)
  return days - quantizeOffset
}

class HeatmapGenerator {
  type = HEATMAP_TYPE
  loadingStats = false
  stats = {
    max: 30,
    min: 1,
    median: 2,
  }

  constructor({ fastTilesAPI = DEFAULT_FAST_TILES_API }) {
    this.fastTilesAPI = fastTilesAPI
  }

  _getServerSideFilters = (serverSideFilter, start, end, useStartAndEnd) => {
    const serverSideFiltersList = []

    if (serverSideFilter) {
      serverSideFiltersList.push(serverSideFilter)
    }

    if (useStartAndEnd) {
      serverSideFiltersList.push(`timestamp > '${start.slice(0, 19).replace('T', ' ')}'`)
      serverSideFiltersList.push(`timestamp < '${end.slice(0, 19).replace('T', ' ')}'`)
    }
    const serverSideFilters = serverSideFiltersList.join(' AND ')
    return serverSideFilters
  }

  _fetchStats = memoizeOne((endpoint, tileset, zoom, serverSideFilters) => {
    this.loadingStats = true
    const statsUrl = new URL(`${endpoint}${tileset}/statistics/${zoom}`)
    if (serverSideFilters) {
      statsUrl.searchParams.set('filters', serverSideFilters)
    }
    return fetch(statsUrl.toString())
      .then((r) => r.json())
      .then((r) => {
        // prevent values being exactly the same to avoid a style error
        const min = r.min - 0.001
        const median = r.median
        const max = r.max + 0.001
        this.stats = {
          min,
          median,
          max,
        }

        this.loadingStats = false
      })
  })

  _getStyleSources = (layer) => {
    if (!layer.start || !layer.end || !layer.tileset) {
      throw new Error('Heatmap generator must specify start, end and tileset parameters', layer)
    }
    const geomType = layer.geomType || HEATMAP_GEOM_TYPES.GRIDDED

    const url = new URL(BASE_WORKER_URL)
    url.searchParams.set('tileset', layer.tileset)
    url.searchParams.set('geomType', geomType)
    url.searchParams.set('fastTilesAPI', this.fastTilesAPI)
    url.searchParams.set('quantizeOffset', quantizeOffset)
    url.searchParams.set('delta', this.delta)

    if (layer.singleFrame === true) {
      url.searchParams.set('singleFrame', layer.singleFrame)
      url.searchParams.set('start', layer.start)
    }

    if (layer.serverSideFilter) {
      url.searchParams.set(
        'serverSideFilters',
        this._getServerSideFilters(
          layer.serverSideFilter,
          layer.start,
          layer.end,
          layer.updateColorRampOnTimeChange
        )
      )
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
    const geomType = layer.geomType || HEATMAP_GEOM_TYPES.GRIDDED
    const colorRampType = layer.colorRamp || HEATMAP_COLOR_RAMPS.PRESENCE
    const colorRampMult = layer.colorRampMult || 1

    const delta = this.delta
    const overallMult = colorRampMult * delta

    const medianOffseted = this.stats.median - this.stats.min + 0.001
    const maxOffseted = this.stats.max - this.stats.min + 0.002
    const medianMaxOffsetedValue = medianOffseted + (maxOffseted - medianOffseted) / 2
    const stops = [
      // probably always start at 0 (black alpha)
      0,
      // first meaningful value = use minimum value in stats
      this.stats.min,
      // next step = use median value in stats
      this.stats.min + medianOffseted * overallMult,
      // this is the intermediate value bnetween median and max
      this.stats.min + medianMaxOffsetedValue * overallMult,
      // final step = max value for current zoom level
      this.stats.min + maxOffseted * overallMult,
    ]

    const originalColorRamp = HEATMAP_COLOR_RAMPS_RAMPS[colorRampType]
    let legend = zip(stops, originalColorRamp)

    const colorRampValues = flatten(legend)

    const d = toQuantizedDays(layer.start)
    const pickValueAt = layer.singleFrame ? 'value' : d.toString()

    const valueExpression = ['to-number', ['get', pickValueAt]]
    const colorRamp = ['interpolate', ['linear'], valueExpression, ...colorRampValues]
    const paint = { ...paintByGeomType[geomType] }
    switch (geomType) {
      case HEATMAP_GEOM_TYPES.GRIDDED:
        paint['fill-color'] = colorRamp
        break
      case HEATMAP_GEOM_TYPES.EXTRUDED:
        paint['fill-extrusion-color'] = colorRamp
        const zoomFactor = 1 / Math.ceil(layer.zoom)
        const extrusionHeightRamp = flatten(
          zip(stops, [
            0,
            10000 * zoomFactor,
            150000 * zoomFactor,
            300000 * zoomFactor,
            500000 * zoomFactor,
          ])
        )
        paint['fill-extrusion-height'] = [
          'interpolate',
          ['linear'],
          valueExpression,
          ...extrusionHeightRamp,
        ]

        break
      case HEATMAP_GEOM_TYPES.BLOB:
        paint['heatmap-weight'] = valueExpression
        const hStops = [0, 0.005, 0.1, 0.3, 1]
        // const hStops2 = [0, stops[1] / 10, stops[2] / 50, stops[3] / 200, stops[4] / 300]
        const heatmapColorRamp = flatten(zip(hStops, originalColorRamp))
        paint['heatmap-color'] = [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          ...heatmapColorRamp,
        ]
        break
      default:
        break
    }

    // 'desactivate' legend values that are similar
    let prevValidValue
    legend = legend.map(([value, color], i) => {
      let rdFn = Math.round
      if (i === 0) rdFn = Math.floor
      if (i === 4) rdFn = Math.ceil
      let finalValue = rdFn(value)
      if (i > 0 && prevValidValue === finalValue) {
        finalValue = null
      } else {
        prevValidValue = finalValue
      }
      return [finalValue, color]
    })

    return [
      {
        id: layer.id,
        source: layer.id,
        'source-layer': layer.tileset,
        type: HEATMAP_GEOM_TYPES_GL_TYPES[geomType],
        layout: {
          visibility: layer.visible ? 'visible' : 'none',
        },
        paint,
        metadata: {
          legend,
        },
      },
    ]
  }

  _getStyleLayers = (layer) => {
    if (layer.fetchStats !== true) {
      return { layers: this._getHeatmapLayers(layer) }
    }
    const serverSideFilters = this._getServerSideFilters(
      layer.serverSideFilter,
      layer.start,
      layer.end,
      layer.updateColorRampOnTimeChange
    )
    const statsPromise = this._fetchStats(
      this.fastTilesAPI,
      layer.tileset,
      Math.floor(layer.zoom),
      serverSideFilters
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

  _updateDelta = (layer) => {
    const newDelta = getDelta(layer.start, layer.end)
    if (newDelta === this.delta) return null

    if (this.currentSetDeltaDebounced) this.currentSetDeltaDebounced.cancel()

    const promise = new Promise((resolve) => {
      this.currentSetDeltaDebounced = debounce(() => {
        this.delta = newDelta
        resolve(this.getStyle(layer))
      }, 1000)
      this.currentSetDeltaDebounced()
    })

    return promise
  }
  _setDelta = debounce(this._updateDelta, 1000)

  getStyle = (layer) => {
    if (!this.delta) {
      this.delta = getDelta(layer.start, layer.end)
    }
    const { layers, promise } = this._getStyleLayers(layer)
    const deltaPromise = this._updateDelta(layer)
    const promises = compact([promise, deltaPromise])
    return {
      id: layer.id,
      sources: this._getStyleSources(layer),
      layers,
      promises,
    }
  }
}

export default HeatmapGenerator