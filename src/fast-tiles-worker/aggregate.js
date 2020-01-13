import { GEOM_TYPES } from './constants'

const dayToTime = (day) => day * 24 * 60 * 60 * 1000

export const rawTileToBlob = (rawTile) => {
  let bytes = new Uint8Array(59)

  for (let i = 0; i < 59; i++) {
    bytes[i] = 32 + i
  }
  const b = new Blob()
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
  tileLayer,
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

  for (let f = 0; f < tileLayer.length; f++) {
    const rawFeature = tileLayer.feature(f)
    const values = rawFeature.properties
    const cell = values.cell
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

    // TODO decouple from aggregation
    const allTimestamps = Object.keys(values).map((t) => parseInt(t))
    const minTimestamp = Math.min(...allTimestamps)
    const maxTimestamp = Math.max(...allTimestamps)

    const dayToQuantizedDay = (d) => {
      return (d - quantizeOffset).toString()
    }

    // compute initial value by aggregating values[minTimestamp] to values[minTimestamp + delta]
    // (delta not included) (stop before if minTimestamp + delta > maxTs)
    let initialValue = 0
    for (let d = minTimestamp; d < minTimestamp + delta && d < maxTimestamp + 1; d++) {
      const key = d.toString()
      const currentValue = values[key] ? parseInt(values[key]) : 0
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
      const headKey = (d + delta - 1).toString()
      const headValue = values[headKey] ? parseInt(values[headKey]) : 0
      const tailKey = (d - 1).toString()
      const tailValue = values[tailKey] ? parseInt(values[tailKey]) : 0
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
