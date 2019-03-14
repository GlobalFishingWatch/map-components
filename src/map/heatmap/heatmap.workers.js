import workerize from 'workerize'

/**
 * parseLayerTile - parses an heatmap tile to a playback-ready format.
 *
 * @param  {Object} rawTileData          the raw tile data, loaded either from the pelagos client or as a MVT/PBF vector tile
 * @param  {array} colsByName            names of the columns present in the raw tiles that need to be included in the final playback data
 * @param  {object} tileCoordinates      tile coordinates from reference tile
 * @param  {array} prevPlaybackData      (optional) in case some time extent was already loaded for this tile, append to this data
 * @return {Object}                      playback-ready merged data
 */
export function parseLayerTile(rawTileData, colsByName, isPBF, tileCoordinates, prevPlaybackData) {
  let data

  // LIBRARY: viewport-mercator-project
  const PI = Math.PI
  const PI_4 = PI / 4
  const DEGREES_TO_RADIANS = PI / 180
  const TILE_SIZE = 512

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'viewport-mercator-project: assertion failed.')
    }
  }

  const lngLatToWorld = (lng, lat, scale) => {
    assert(Number.isFinite(lng) && Number.isFinite(scale))
    assert(Number.isFinite(lat) && lat >= -90 && lat <= 90, 'invalid latitude')
    scale *= TILE_SIZE
    const lambda2 = lng * DEGREES_TO_RADIANS
    const phi2 = lat * DEGREES_TO_RADIANS
    const x = (scale * (lambda2 + PI)) / (2 * PI)
    const y = (scale * (PI - Math.log(Math.tan(PI_4 + phi2 * 0.5)))) / (2 * PI)
    return [x, y]
  }

  // LIBRARY: map-convert
  // the minimum multiplier for vessels radius. Multiply by VESSELS_BASE_RADIUS to get the final radius in px
  const VESSELS_MINIMUM_RADIUS_FACTOR = 0.25

  const VESSELS_MINIMUM_OPACITY = 0.5

  // --- TODO duplicated constants with client, find a way to share ----

  // from this zoom level and above, render using circle style instead of heatmap
  const VESSELS_HEATMAP_STYLE_ZOOM_THRESHOLD = 6

  // At which intervals should we consider showing a new frame. Impacts performance.
  // Expressed in ms, for example 86400000 is 1 day (24*60*60*1000)
  const PLAYBACK_PRECISION = 86400000
  const TIMELINE_OVERALL_START_DATE = new Date(Date.UTC(2012, 0, 1))
  const TIMELINE_OVERALL_START_DATE_OFFSET = Math.floor(
    TIMELINE_OVERALL_START_DATE / PLAYBACK_PRECISION
  )
  // ----

  /**
   * From a timestamp in ms returns a time with the precision set in Constants.
   * @param timestamp
   */
  const getTimeAtPrecision = (timestamp) => Math.floor(timestamp / PLAYBACK_PRECISION)

  const convert = {
    /**
     * Convert raw lat/long coordinates to project world coordinates in pixels
     * @param lat latitude in degrees
     * @param lon longitude in degrees
     */
    latLonToWorldCoordinates: (lat, lon) => {
      const worldX = ((lon + 180) / 360) * 256 // eslint-disable-line
      const worldY =
        ((1 -
          Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) /
            Math.PI) /
          2) *
        256 // eslint-disable-line
      return {
        worldX,
        worldY,
      }
    },

    sigmaToRadius: (sigma, zoomFactorRadiusRenderingMode, zoomFactorRadius) => {
      let radius =
        zoomFactorRadiusRenderingMode * Math.max(0.8, 2 + Math.log(sigma * zoomFactorRadius))
      radius = Math.max(VESSELS_MINIMUM_RADIUS_FACTOR, radius)
      return radius
    },

    weightToOpacity: (weight, zoomFactorOpacity) => {
      let opacity = 3 + Math.log(weight * zoomFactorOpacity)
      // TODO quick hack to avoid negative values, check why that happens
      opacity = Math.max(0, opacity)
      opacity = 3 + Math.log(opacity)
      opacity = 0.1 + 0.2 * opacity
      opacity = Math.min(1, Math.max(VESSELS_MINIMUM_OPACITY, opacity))
      return opacity
    },

    getZoomFactorOpacity: (zoom) => Math.pow(zoom - 1, 3.5) / 1000,
    getZoomFactorRadiusRenderingMode: (zoom) =>
      zoom < VESSELS_HEATMAP_STYLE_ZOOM_THRESHOLD ? 0.3 : 0.15,
    getZoomFactorRadius: (zoom) => Math.pow(zoom - 1, 2.5),

    /**
     * From a timestamp in ms returns a time with the precision set in Constants, offseted at the
     * beginning of available time (outerStart)
     * @param timestamp
     */
    getOffsetedTimeAtPrecision: (timestamp) =>
      Math.max(0, getTimeAtPrecision(timestamp) - TIMELINE_OVERALL_START_DATE_OFFSET),

    getTimestampFromOffsetedtTimeAtPrecision: (timeIndex) => {
      const absoluteTimeAtPrecision = TIMELINE_OVERALL_START_DATE_OFFSET + timeIndex
      const timestamp = absoluteTimeAtPrecision * PLAYBACK_PRECISION
      return timestamp
    },
  }

  // LIBRARY: utils

  const getCleanVectorArrays = (rawTileData) =>
    rawTileData.filter((vectorArray) => vectorArray !== null)

  const groupData = (cleanVectorArrays, columns) => {
    const data = {}

    const totalVectorArraysLength = cleanVectorArrays.reduce(
      (acc, a) => acc + a.longitude.length,
      0
    )

    const filteredColumns = columns.filter((column) => {
      if (cleanVectorArrays[0] && cleanVectorArrays[0][column] === undefined) {
        return false
      }
      return true
    })

    filteredColumns.forEach((key) => {
      data[key] = new Float32Array(totalVectorArraysLength)
    })

    let currentArray
    let cumulatedOffsets = 0

    const appendValues = (key) => {
      data[key].set(currentArray[key], cumulatedOffsets)
    }

    for (let index = 0, length = cleanVectorArrays.length; index < length; index++) {
      currentArray = cleanVectorArrays[index]
      filteredColumns.forEach(appendValues)
      cumulatedOffsets += currentArray.longitude.length
    }
    return data
  }

  const getTilePlaybackData = (data, colsByName, tileCoordinates, isPBF, prevPlaybackData) => {
    const tilePlaybackData = prevPlaybackData === undefined ? [] : prevPlaybackData

    const zoom = tileCoordinates.zoom
    const zoomFactorRadius = convert.getZoomFactorRadius(zoom)
    const zoomFactorRadiusRenderingMode = convert.getZoomFactorRadiusRenderingMode(zoom)
    const zoomFactorOpacity = convert.getZoomFactorOpacity(zoom)

    // store all available columns as object keys
    const columns = {}
    const columnsArr = Object.keys(colsByName)
    columnsArr.forEach((c) => {
      columns[c] = true
    })

    // columns specified by layer header columns
    let storedColumns = [].concat(columnsArr)
    if (columns.sigma === true) storedColumns.push('radius')
    if (columns.weight === true) storedColumns.push('opacity')
    if (columns.longitude === true) {
      storedColumns.push('worldX')
      storedColumns.push('worldY')
    }
    if (columns.id === true) {
      storedColumns.push('series')
    }

    // omit values that will be transformed before being stored to playback data (ie lat -> worldY)
    // only if hidden: true flag is set on header
    ;['latitude', 'longitude', 'datetime'].forEach((col) => {
      if (colsByName[col] === undefined || colsByName[col].hidden === true) {
        // REPLACING LODASH
        // pull(storedColumns, col)
        storedColumns = storedColumns.filter((c) => c !== col)
      }
    })
    // always pull sigma and weight
    // REPLACING LODASH
    // pull(storedColumns, 'sigma', 'weight')
    storedColumns = storedColumns.filter((c) => c !== 'sigma' && c !== 'weight')
    // REPLACING LODASH
    // storedColumns = uniq(storedColumns)
    // Set is not working
    // storedColumns = [...new Set(storedColumns)]
    storedColumns = storedColumns.filter((value) => {
      return !this[value] && (this[value] = true)
    }, Object.create(null))

    const numPoints = isPBF === true ? data.length : data.latitude.length

    for (let index = 0, length = numPoints; index < length; index++) {
      let point
      if (isPBF === true) {
        const feature = data.feature(index)
        point = feature.properties
        // WARNING: toGeoJSON is expensive. Avoid using raw coordinates in PBF tiles, pregenerate world coords
        // FIXME: this should not be done when headers declare worldX/Y -  if (!columns.worldX) {
        const geom = feature.toGeoJSON(tileCoordinates.x, tileCoordinates.y, zoom).geometry
          .coordinates
        point.longitude = geom[0]
        point.latitude = geom[1]
      } else {
        point = {}
        columnsArr.forEach((c) => {
          point[c] = data[c][index]
        })
      }

      const timeIndex = columns.timeIndex
        ? point.timeIndex
        : convert.getOffsetedTimeAtPrecision(point.datetime)

      // FIXME: this should not be done when headers declare worldX/Y -  if (!columns.worldX) {
      const latLng = lngLatToWorld(point.longitude, point.latitude, 1)
      point.worldX = latLng[0]
      point.worldY = latLng[1]

      if (columns.sigma) {
        point.radius = convert.sigmaToRadius(
          point.sigma,
          zoomFactorRadiusRenderingMode,
          zoomFactorRadius
        )
      }
      if (columns.weight) {
        point.opacity = convert.weightToOpacity(point.weight, zoomFactorOpacity)
      }
      if (columns.id) {
        point.series = point.id
      }

      if (!tilePlaybackData[timeIndex]) {
        const frame = {}
        storedColumns.forEach((column) => {
          frame[column] = [point[column]]
        })
        tilePlaybackData[timeIndex] = frame
        continue
      }
      const frame = tilePlaybackData[timeIndex]
      storedColumns.forEach((column) => {
        frame[column].push(point[column])
      })
    }
    return tilePlaybackData
  }

  // ORIGINAL CODE
  if (isPBF === true) {
    if (
      rawTileData === undefined ||
      !rawTileData.length ||
      rawTileData[0] === undefined ||
      !Object.keys(rawTileData[0].layers).length
    ) {
      return []
    }
    data = rawTileData[0].layers.points
  } else {
    const cleanVectorArrays = getCleanVectorArrays(rawTileData)
    data = groupData(cleanVectorArrays, Object.keys(colsByName))
    if (Object.keys(data).length === 0) {
      return []
    }
  }
  const playbackData = getTilePlaybackData(
    data,
    colsByName,
    tileCoordinates,
    isPBF,
    prevPlaybackData
  )
  return playbackData
}

export default workerize(`export ${parseLayerTile.toString()}`)
