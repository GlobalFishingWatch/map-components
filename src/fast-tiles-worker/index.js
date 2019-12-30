/* eslint no-restricted-globals: "off" */

import Pbf from 'pbf'
import vtpbf from 'vt-pbf'
import { VectorTile } from '@mapbox/vector-tile'
import geojsonVt from 'geojson-vt'
import tilebelt from '@mapbox/tilebelt'

const FAST_TILES_KEY = '__fast_tiles__'
const FAST_TILES_KEY_RX = new RegExp(FAST_TILES_KEY)
const FAST_TILES_KEY_XYZ_RX = new RegExp(`${FAST_TILES_KEY}\\/(\\d+)\\/(\\d+)\\/(\\d+)`)

export const GEOM_TYPES = {
  BLOB: 'blob',
  GRIDDED: 'gridded',
  EXTRUDED: 'extruded',
}

self.addEventListener('install', (event) => {
  console.log('install sw')
  // cleaning up old cache values...
})

self.addEventListener('activate', (event) => {
  console.log('activate sw_')
  // self.clients.claim()

  // const allClients = clients.matchAll({
  //   includeUncontrolled: true
  // }).then((a) => {
  //   console.log(a)
  // });

  // Claim control of clients right after activating
  // This allows
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('Now ready to handle fetches?')
    })
  )
  console.log('Now ready to handle fetches!')
})

// self.importScripts('readTile.js');

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

const perfs = []

const aggregate = (f, { sourceLayer, geomType, numCells, delta, x, y, z }) => {
  const tileBBox = tilebelt.tileToBBOX([x, y, z])
  return f.arrayBuffer().then((buffer) => {
    const t = performance.now()

    var tile = new VectorTile(new Pbf(buffer))

    const tileLayer = tile.layers[sourceLayer]
    const features = []

    const QUANTIZE_OFFSET = new Date('2019-01-01T00:00:00.000Z').getTime() / 1000 / 60 / 60 / 24
    const ABS_START_DAY = new Date('2019-01-01T00:00:00.000Z').getTime() / 1000 / 60 / 60 / 24
    const ABS_END_DAY = new Date('2019-12-01T00:00:00.000Z').getTime() / 1000 / 60 / 60 / 24

    for (let i = 0; i < tileLayer.length; i++) {
      const rawFeature = tileLayer.feature(i)
      // console.log(rawFeature.properties)
      // const feature = rawFeature.toGeoJSON(x,y,z)
      const feature = {
        type: 'Feature',
        properties: {},
      }

      const values = rawFeature.properties
      const cell = values.cell
      const row = Math.floor(cell / numCells)
      // Skip every col and row, dividing num features by 4
      if (geomType === GEOM_TYPES.BLOB && (cell % 2 !== 0 || row % 2 !== 0)) {
        continue
      }

      if (geomType === GEOM_TYPES.BLOB) {
        feature.geometry = getPointGeom(tileBBox, cell, numCells)
      } else {
        feature.geometry = getSquareGeom(tileBBox, cell, numCells)
      }

      delete values.cell

      const finalValues = []
      let currentValue = 0
      let j = 0
      for (let d = ABS_START_DAY; d < ABS_END_DAY + delta; d++) {
        const tipValue = values[d] ? 1 : 0
        currentValue += tipValue

        if (j < delta) {
          j++
          continue
        }

        const tailValueIndex = d - delta
        let tailValue = tailValueIndex > 0 ? values[tailValueIndex] : 0
        if (tailValue === undefined) {
          tailValue = 0
        } else {
          tailValue = 1
        }
        currentValue -= tailValue

        if (currentValue > 0) {
          finalValues[d - delta - QUANTIZE_OFFSET] = currentValue
        }
        j++
      }
      feature.properties = finalValues

      features.push(feature)
    }

    const geoJSON = {
      type: 'FeatureCollection',
      features,
    }

    const tileindex = geojsonVt(geoJSON)
    const newTile = tileindex.getTile(z, x, y)
    const newBuff = vtpbf.fromGeojsonVt({ [sourceLayer]: newTile })

    perfs.push(performance.now() - t)
    if (perfs.length > 5) {
      console.log('avg perf:', perfs.reduce((prev, current) => prev + current, 0) / perfs.length)
    }

    return new Response(newBuff, {
      status: f.status,
      statusText: f.statusText,
      headers: f.headers,
    })
  })
}

self.addEventListener('fetch', (e) => {
  if (FAST_TILES_KEY_RX.test(e.request.url) === true) {
    const originalUrl = e.request.url

    const url = new URL(originalUrl)
    const geomType = url.searchParams.get('geomType')
    const delta = parseInt(url.searchParams.get('delta') || '10')
    const fastTilesAPI = url.searchParams.get('fastTilesAPI')
    const tileset = url.searchParams.get('tileset')

    const [z, x, y] = originalUrl
      .match(FAST_TILES_KEY_XYZ_RX)
      .slice(1, 4)
      .map((d) => parseInt(d))

    const finalUrl = `${fastTilesAPI}${tileset}/tile/heatmap/${z}/${x}/${y}`

    const finalReq = new Request(finalUrl, {
      headers: e.request.headers,
    })

    const cachePromise = self.caches.match(finalReq).then((cacheResponse) => {
      const TILESET_NUM_CELLS = 64
      const aggregateParams = {
        sourceLayer: tileset,
        geomType,
        delta,
        numCells: TILESET_NUM_CELLS,
        x,
        y,
        z,
      }
      // Cache hit - return response
      if (cacheResponse) {
        return aggregate(cacheResponse, aggregateParams)
      }

      const fetchPromise = fetch(finalUrl)

      fetchPromise.then((fetchResponse) => {
        var responseToCache = fetchResponse.clone()
        const CACHE_NAME = FAST_TILES_KEY
        self.caches.open(CACHE_NAME).then(function(cache) {
          cache.put(finalReq, responseToCache)
        })
      })

      const aggregatePromise = fetchPromise.then((fetchResponse) => {
        return aggregate(fetchResponse, aggregateParams)
      })
      return aggregatePromise
    })

    e.respondWith(cachePromise)
  }
})
