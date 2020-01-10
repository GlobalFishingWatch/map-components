import { GEOM_TYPES } from './constants'

const dayToTime = (day) => day * 24 * 60 * 60 * 1000

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
    let currentValue = 0
    let j = 0
    const allTimestamps = Object.keys(values).map((t) => parseInt(t))
    const minTimestamp = Math.min(...allTimestamps)
    const maxTimestamp = Math.max(...allTimestamps)

    for (let d = minTimestamp; d < maxTimestamp + delta; d++) {
      const key = d.toString()
      const headValue = values[key] ? parseInt(values[key]) : 0
      currentValue += headValue

      // if not yet at aggregation delta, just keep up aggregating, do not write anything yet
      j++
      if (j < delta) {
        continue
      }

      // substract tail value
      const tailValueIndex = d - delta
      const tailValueKey = tailValueIndex.toString()
      let tailValue = tailValueIndex > 0 ? values[tailValueKey] : 0
      tailValue = tailValue !== undefined ? parseInt(tailValue) : 0
      currentValue -= tailValue

      if (currentValue > 0) {
        const finalIndex = d - delta - quantizeOffset + 1
        finalValues[finalIndex.toString()] = currentValue
      }
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
