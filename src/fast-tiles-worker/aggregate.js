import Pbf from 'pbf'
import { VectorTile } from '@mapbox/vector-tile'
import { GEOM_TYPES } from './constants'

const dayToTime = (day) => day * 24 * 60 * 60 * 1000

export const ARRAY_BUFFER_HEADER_OFFSET_INDEX = 3
export const BUFFER_HEADERS = ['new', 'cell', 'min', 'max']

export const rawTileToIntArrays = (
  rawTileArrayBuffer,
  { tileset, maxDelta = 1000, quantizeOffset }
) => {
  const tile = new VectorTile(new Pbf(rawTileArrayBuffer))
  const tileLayer = tile.layers[tileset]

  let bufferSize = 0
  const featuresProps = []
  for (let f = 0; f < tileLayer.length; f++) {
    const rawFeature = tileLayer.feature(f)
    const values = rawFeature.properties
    const cell = values.cell

    delete values.cell

    const allTimestampsRaw = Object.keys(values)
    const allTimestamps = allTimestampsRaw.map((t) => parseInt(t))
    const minTimestamp = Math.min(...allTimestamps)
    const maxTimestamp = Math.max(...allTimestamps)

    // start will actually be maxDelta days - 1 before the actual start,
    // so that values before take into account first values when aggregating
    // except when absolute start/quantizeOffset is after that value
    const realMinTimeStamp = Math.max(minTimestamp - maxDelta + 1, quantizeOffset)
    // const realMinTimeStamp = minTimestamp - maxDelta + 1
    // const realMinTimeStamp = minTimestamp

    // if (f === 0) console.log(realMinTimeStamp, minTimestamp, maxTimestamp)
    // if (f === 100) console.log(realMinTimeStamp, minTimestamp, maxTimestamp)
    // if (f === 1000) console.log(realMinTimeStamp, minTimestamp, maxTimestamp)

    const featureSize = BUFFER_HEADERS.length + (maxTimestamp - realMinTimeStamp) + 1

    featuresProps.push({
      values,
      cell,
      minTimestamp: realMinTimeStamp,
      maxTimestamp,
      featureSize,
    })

    bufferSize += featureSize
  }

  const buffer = new Int16Array(bufferSize)
  let bufferPos = 0
  featuresProps.forEach((featureProps, i) => {
    buffer[bufferPos] = -1 // start feature
    buffer[bufferPos + 1] = featureProps.cell
    buffer[bufferPos + 2] = featureProps.minTimestamp
    buffer[bufferPos + 3] = featureProps.maxTimestamp
    let featureBufferPos = bufferPos + 4

    for (let d = featureProps.minTimestamp; d <= featureProps.maxTimestamp; d++) {
      const currentValue = featureProps.values[d.toString()]
      buffer[featureBufferPos] = currentValue || 0
      featureBufferPos++
    }

    bufferPos += featureProps.featureSize
  })

  return buffer
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
  arrayBuffer,
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

  let currentFeature
  let currentFeatureCell
  let currentFeatureMinTimestamp
  let currentFeatureMaxTimestamp
  let currentAggregatedValue
  let currentTailValue
  let featureBufferPos
  let currentTs
  for (let i = 0; i < arrayBuffer.length; i++) {
    const value = arrayBuffer[i]
    if (value === -1) {
      // add previously completed feature
      if (i > 0) {
        features.push(currentFeature)
      }
      currentFeature = {
        type: 'Feature',
        properties: {},
      }
      featureBufferPos = 0
      currentTailValue = 0
      currentAggregatedValue = 0
      continue
    }

    switch (featureBufferPos) {
      // cell
      case 1:
        currentFeatureCell = value
        if (geomType === GEOM_TYPES.BLOB) {
          currentFeature.geometry = getPointGeom(tileBBox, currentFeatureCell, numCells)
        } else {
          currentFeature.geometry = getSquareGeom(tileBBox, currentFeatureCell, numCells)
        }
        break
      // minTs
      case 2:
        currentFeatureMinTimestamp = value
        currentTs = currentFeatureMinTimestamp
        break
      // maxTs
      case 3:
        currentFeatureMaxTimestamp = value
        break
      // actual value
      default:
        currentAggregatedValue = currentAggregatedValue + value - currentTailValue
        const quantizedDay = currentTs - quantizeOffset
        if (value > 0) {
          if (features.length === 0) {
            console.log(currentAggregatedValue)
          }
          currentFeature.properties[quantizedDay.toString()] = currentAggregatedValue
        }
        currentTailValue = value
    }
    currentTs++
    featureBufferPos++
  }
  features.push(currentFeature)

  const geoJSON = {
    type: 'FeatureCollection',
    features,
  }
  return geoJSON
}

const aggregate_ = (
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
      return d - quantizeOffset
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
    let tailValue = 0
    for (let d = minTimestamp + 1; d < maxTimestamp; d++) {
      const headKey = d + delta - 1 - minTimestamp
      const headValue = values[headKey] ? values[headKey] : 0
      // const tailKey = d - 1 - minTimestamp
      // const tailValue = values[tailKey] ? values[tailKey] : 0
      currentValue = currentValue + headValue - tailValue
      finalValues[dayToQuantizedDay(d).toString()] = currentValue
      tailValue = headValue
    }

    // console.log

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
