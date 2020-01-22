import Pbf from 'pbf'
import { VectorTile } from '@mapbox/vector-tile'
import { GEOM_TYPES } from './constants'

export const BUFFER_HEADERS = ['cell', 'min', 'max']

export const rawTileToIntArray = (rawTileArrayBuffer, { tileset }) => {
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

    const featureSize = BUFFER_HEADERS.length + (maxTimestamp - minTimestamp + 1)

    featuresProps.push({
      values,
      cell,
      minTimestamp,
      maxTimestamp,
      featureSize,
    })

    bufferSize += featureSize
  }

  const buffer = new Uint16Array(bufferSize)
  let bufferPos = 0
  featuresProps.forEach((featureProps, i) => {
    buffer[bufferPos + 0] = featureProps.cell
    buffer[bufferPos + 1] = featureProps.minTimestamp
    buffer[bufferPos + 2] = featureProps.maxTimestamp
    let featureBufferPos = bufferPos + BUFFER_HEADERS.length

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
    singleFrameStart = null,
  }
) => {
  const features = []

  let aggregating = []

  let currentFeatureIndex = 0
  let currentFeature = {
    type: 'Feature',
    properties: {},
  }
  let currentFeatureCell
  let currentFeatureMinTimestamp
  let currentFeatureMaxTimestamp
  let currentFeatureTimestampDelta
  let currentAggregatedValue = 0
  let featureBufferPos = 0
  let head
  let tail

  const writeValueToFeature = (quantizedTail) => {
    // TODO add skipOddCells check
    if (singleFrameStart === null) {
      currentFeature.properties[quantizedTail.toString()] = currentAggregatedValue
    } else {
      if (singleFrameStart === quantizedTail) {
        currentFeature.properties.value = currentAggregatedValue
      }
    }
  }

  // write values after tail > minTimestamp
  const writeFinalTail = () => {
    let finalTailValue = 0
    for (let finalTail = tail + 1; finalTail <= currentFeatureMaxTimestamp; finalTail++) {
      currentAggregatedValue = currentAggregatedValue - finalTailValue
      if (finalTail > currentFeatureMinTimestamp) {
        finalTailValue = aggregating.shift()
      } else {
        finalTailValue = 0
      }
      const quantizedTail = finalTail - quantizeOffset
      if (quantizedTail >= 0) {
        writeValueToFeature(quantizedTail)
      }
    }
  }

  for (let i = 0; i < arrayBuffer.length; i++) {
    const value = arrayBuffer[i]

    switch (featureBufferPos) {
      // cell
      case 0:
        currentFeatureCell = value
        if (geomType === GEOM_TYPES.BLOB) {
          currentFeature.geometry = getPointGeom(tileBBox, currentFeatureCell, numCells)
        } else {
          currentFeature.geometry = getSquareGeom(tileBBox, currentFeatureCell, numCells)
        }
        break
      // minTs
      case 1:
        currentFeatureMinTimestamp = value
        head = currentFeatureMinTimestamp
        break
      // mx
      case 2:
        currentFeatureMaxTimestamp = value
        currentFeatureTimestampDelta = currentFeatureMaxTimestamp - currentFeatureMinTimestamp
        break
      // actual value
      default:
        // when we are looking at ts 0 and delta is 10, we are in fact looking at the aggregation of day -9
        tail = head - delta + 1

        aggregating.push(value)

        let tailValue = 0
        if (tail > currentFeatureMinTimestamp) {
          tailValue = aggregating.shift()
        }
        currentAggregatedValue = currentAggregatedValue + value - tailValue

        const quantizedTail = tail - quantizeOffset

        if (currentAggregatedValue > 0 && quantizedTail >= 0) {
          writeValueToFeature(quantizedTail)
        }
        head++
    }
    featureBufferPos++

    const isEndOfFeature =
      featureBufferPos - BUFFER_HEADERS.length - 1 === currentFeatureTimestampDelta

    if (isEndOfFeature) {
      writeFinalTail()
      features.push(currentFeature)
      currentFeature = {
        type: 'Feature',
        properties: {},
      }
      featureBufferPos = 0
      currentAggregatedValue = 0
      aggregating = []
      currentFeatureIndex++
      continue
    }
  }

  const geoJSON = {
    type: 'FeatureCollection',
    features,
  }
  return geoJSON
}

export default aggregate
