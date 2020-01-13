import Pbf from 'pbf'
import { VectorTile } from '@mapbox/vector-tile'
import { GEOM_TYPES } from './constants'

const dayToTime = (day) => day * 24 * 60 * 60 * 1000

export const ARRAY_BUFFER_HEADER_OFFSET_INDEX = 3

export const rawTileToArrayBuffers = (rawTile, tileset) => {
  const tile = new VectorTile(new Pbf(rawTile))
  const tileLayer = tile.layers[tileset]

  const arrayBuffers = []
  for (let f = 0; f < tileLayer.length; f++) {
    const rawFeature = tileLayer.feature(f)
    const values = rawFeature.properties
    const cell = values.cell

    delete values.cell

    const allTimestamps = Object.keys(values).map((t) => parseInt(t))
    const minTimestamp = Math.min(...allTimestamps)
    const maxTimestamp = Math.max(...allTimestamps)

    const bufferLength = maxTimestamp - minTimestamp + 1 + ARRAY_BUFFER_HEADER_OFFSET_INDEX
    let bytes = new Uint16Array(bufferLength)
    bytes[0] = cell
    bytes[1] = minTimestamp
    bytes[2] = maxTimestamp

    let i = 0
    for (let d = minTimestamp; d <= maxTimestamp; d++) {
      const currentValue = values[d.toString()]
      // if (f === 0) console.log(currentValue)
      const index = i + ARRAY_BUFFER_HEADER_OFFSET_INDEX
      bytes[index] = currentValue
      i++
    }
    // if (i === 0) console.log(bytes)
    arrayBuffers.push(bytes)
  }

  return arrayBuffers
}

const getCellCoords = (tileBBox, cell, numCells) => {
  const col = cell % numCells
  const row = Math.floor(cell / numCells)
  const [minX, minY, maxX, maxY] = tileBBox
  const width = maxX - minX
  const height = maxY - minY
  return {
    col,
    row,
    width,
    height,
  }
}

const getPointGeom = (tileBBox, cell, numCells) => {
  const [minX, minY] = tileBBox
  const { col, row, width, height } = getCellCoords(tileBBox, cell, numCells)

  const pointMinX = minX + (col / numCells) * width
  const pointMinY = minY + (row / numCells) * height

  return {
    type: 'Point',
    coordinates: [pointMinX, pointMinY],
  }
}

const getSquareGeom = (tileBBox, cell, numCells) => {
  const [minX, minY] = tileBBox
  const { col, row, width, height } = getCellCoords(tileBBox, cell, numCells)

  const squareMinX = minX + (col / numCells) * width
  const squareMinY = minY + (row / numCells) * height
  const squareMaxX = minX + ((col + 1) / numCells) * width
  const squareMaxY = minY + ((row + 1) / numCells) * height
  return {
    type: 'Polygon',
    coordinates: [
      [
        [squareMinX, squareMinY],
        [squareMaxX, squareMinY],
        [squareMaxX, squareMaxY],
        [squareMinX, squareMaxY],
        [squareMinX, squareMinY],
      ],
    ],
  }
}

const aggregate = (
  arrayBuffers,
  {
    quantizeOffset,
    tileBBox,
    delta = 30,
    geomType = GEOM_TYPES.GRIDDED,
    numCells = 64,
    skipOddCells = false,
  }
) => {
  const features = []

  for (let f = 0; f < arrayBuffers.length; f++) {
    const rawFeature = arrayBuffers[f]
    const cell = rawFeature[0]
    const minTimestamp = rawFeature[1]
    const maxTimestamp = rawFeature[2]
    const values = rawFeature.slice(ARRAY_BUFFER_HEADER_OFFSET_INDEX)
    const row = Math.floor(cell / numCells)
    // Skip every col and row, dividing num features by 4
    // This is a very cheap hack to reduce number of points and allow faster animation
    if (skipOddCells === true && (cell % 2 !== 0 || row % 2 !== 0)) {
      continue
    }

    const feature = {
      type: 'Feature',
      properties: {},
    }

    if (geomType === GEOM_TYPES.BLOB) {
      feature.geometry = getPointGeom(tileBBox, cell, numCells)
    } else {
      feature.geometry = getSquareGeom(tileBBox, cell, numCells)
    }

    delete values.cell

    const finalValues = {}

    const dayToQuantizedDay = (d) => {
      return (d - quantizeOffset).toString()
    }

    // compute initial value by aggregating values[minTimestamp] to values[minTimestamp + delta]
    // (delta not included) (stop before if minTimestamp + delta > maxTs)
    let initialValue = 0
    for (let d = minTimestamp; d < minTimestamp + delta && d < maxTimestamp + 1; d++) {
      const key = d - minTimestamp
      const currentValue = values[key] ? values[key] : 0
      initialValue += currentValue
    }
    // store first value, and also the [delta] values before
    // (ie if delta is 30 days, 15 days before minTimestamp the aggregated value is already equal to the value at minTimestamp)
    for (let d = minTimestamp - delta + 1; d <= minTimestamp; d++) {
      const qd = dayToQuantizedDay(d)
      if (qd >= 0) {
        finalValues[qd.toString()] = initialValue
      }
    }

    // start at minTimestamp + 1, stop at maxTimestamp + delta
    // add head value, subtract tail value
    let currentValue = initialValue
    for (let d = minTimestamp + 1; d < maxTimestamp; d++) {
      const headKey = d + delta - 1 - minTimestamp
      const headValue = values[headKey] ? values[headKey] : 0
      const tailKey = d - 1 - minTimestamp
      const tailValue = values[tailKey] ? values[tailKey] : 0
      currentValue = currentValue + headValue - tailValue
      finalValues[dayToQuantizedDay(d).toString()] = currentValue
    }

    feature.properties = finalValues

    features.push(feature)
  }

  const geoJSON = {
    type: 'FeatureCollection',
    features,
  }
  return geoJSON
}

export default aggregate
