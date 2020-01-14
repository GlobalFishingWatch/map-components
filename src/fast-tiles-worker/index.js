/* eslint no-restricted-globals: "off" */

import Pbf from 'pbf'
import vtpbf from 'vt-pbf'
import { VectorTile } from '@mapbox/vector-tile'
import geojsonVt from 'geojson-vt'
import tilebelt from '@mapbox/tilebelt'
import aggregate, { rawTileToIntArrays } from './aggregate'

const FAST_TILES_KEY = '__fast_tiles__'
const FAST_TILES_KEY_RX = new RegExp(FAST_TILES_KEY)
const FAST_TILES_KEY_XYZ_RX = new RegExp(`${FAST_TILES_KEY}\\/(\\d+)\\/(\\d+)\\/(\\d+)`)
const CACHE_TIMESTAMP_HEADER_KEY = 'sw-cache-timestamp'
const CACHE_NAME = FAST_TILES_KEY
const CACHE_MAX_AGE_MS = 60 * 60 * 1000

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

const perfs = []

const aggregateResponse = (
  originalResponse,
  { sourceLayer, geomType, numCells, delta, x, y, z, quantizeOffset }
) => {
  const tileBBox = tilebelt.tileToBBOX([x, y, z])
  return originalResponse.arrayBuffer().then((buffer) => {
    const t = performance.now()

    var tile = new VectorTile(new Pbf(buffer))

    const tileLayer = tile.layers[sourceLayer]
    console.log(quantizeOffset)
    const geoJSON = aggregate(tileLayer, {
      quantizeOffset,
      tileBBox,
      delta,
      geomType,
      numCells,
      skipOddCells: false,
    })

    // if (z === 2 && x === 3 && y === 2) {
    console.log(geoJSON)
    console.log(geoJSON.features[906])
    console.log(geoJSON.features[906].properties['17167'])
    // }

    const tileindex = geojsonVt(geoJSON)
    const newTile = tileindex.getTile(z, x, y)
    const newBuff = vtpbf.fromGeojsonVt({ [sourceLayer]: newTile })

    perfs.push(performance.now() - t)
    if (perfs.length > 5) {
      console.log('avg perf:', perfs.reduce((prev, current) => prev + current, 0) / perfs.length)
    }

    return new Response(newBuff, {
      status: originalResponse.status,
      statusText: originalResponse.statusText,
    })
  })
}

const aggregateIntArrays = (intArrays, { geomType, numCells, delta, x, y, z, quantizeOffset }) => {
  const tileBBox = tilebelt.tileToBBOX([x, y, z])
  const aggregated = aggregate(intArrays, {
    quantizeOffset,
    tileBBox,
    delta,
    geomType,
    numCells,
    // TODO make configurable
    skipOddCells: false,
  })
  return aggregated
}

const decodeTile = (originalResponse, tileset) => {
  return originalResponse.arrayBuffer().then((buffer) => {
    const intArrays = rawTileToIntArrays(buffer, tileset)
    return intArrays
  })
}

const encodeTileResponse = (aggregatedGeoJSON, { x, y, z, tileset }) => {
  const tileindex = geojsonVt(aggregatedGeoJSON)
  const newTile = tileindex.getTile(z, x, y)
  const newBuff = vtpbf.fromGeojsonVt({ [tileset]: newTile })

  return new Response(newBuff)
}

self.addEventListener('fetch', (fetchEvent) => {
  const originalUrl = fetchEvent.request.url

  if (FAST_TILES_KEY_RX.test(originalUrl) !== true) {
    return
  }

  const url = new URL(originalUrl)
  const geomType = url.searchParams.get('geomType')
  const delta = parseInt(url.searchParams.get('delta') || '10')
  const fastTilesAPI = url.searchParams.get('fastTilesAPI')
  const tileset = url.searchParams.get('tileset')
  const quantizeOffset = parseInt(url.searchParams.get('quantizeOffset'))
  const serverSideFilters = url.searchParams.get('serverSideFilters')

  const [z, x, y] = originalUrl
    .match(FAST_TILES_KEY_XYZ_RX)
    .slice(1, 4)
    .map((d) => parseInt(d))

  const TILESET_NUM_CELLS = 64
  const aggregateParams = {
    geomType,
    numCells: TILESET_NUM_CELLS,
    delta,
    x,
    y,
    z,
    quantizeOffset,
    tileset,
  }

  const finalUrl = new URL(`${fastTilesAPI}${tileset}/tile/heatmap/${z}/${x}/${y}`)

  if (serverSideFilters) {
    finalUrl.searchParams.set('filters', serverSideFilters)
  }
  const finalUrlStr = decodeURI(finalUrl.toString())
  // console.log('real tile zoom', z)
  const finalReq = new Request(finalUrlStr)

  const cachePromise = self.caches.match(finalReq).then((cacheResponse) => {
    const now = new Date().getTime()
    const cachedTimestamp =
      cacheResponse && parseInt(cacheResponse.headers.get(CACHE_TIMESTAMP_HEADER_KEY))
    // only get value from cache if it's recent enough
    const hasRecentCache = cacheResponse && now - cachedTimestamp < CACHE_MAX_AGE_MS
    console.log(hasRecentCache)
    if (hasRecentCache) {
      return (
        cacheResponse
          .arrayBuffer()
          // .blob()
          // .then((blob) => blob.arrayBuffer())
          // .then((blob) => blob.arrayBuffer())
          .then((ab) => {
            console.log(ab)
            const aggregated = aggregateIntArrays(ab, aggregateParams)
            return encodeTileResponse(aggregated, aggregateParams)
          })
      )
    } else {
      // console.log('too old, fetching again')
    }

    const fetchPromise = fetch(finalUrl)
    const decodePromise = fetchPromise.then((fetchResponse) => {
      if (!fetchResponse.ok) throw new Error()
      // Response needs to be cloned to m odify headers (used for cache expiration)
      // const responseToCache = fetchResponse.clone()
      const t = performance.now()
      const decoded = decodeTile(fetchResponse, tileset)
      console.log('decoded in ', performance.now() - t)
      return decoded
    })

    // Cache fetch response in parallel
    decodePromise.then((intArrays) => {
      const headers = new Headers()
      const timestamp = new Date().getTime()
      // add extra header to set a timestamp on cache - will be read at cache.matches call
      headers.set(CACHE_TIMESTAMP_HEADER_KEY, timestamp)
      // convert response to decoded int arrays
      const blob = new Blob(intArrays, { type: 'application/octet-binary' })

      const cacheResponse = new Response(blob, {
        // status: fetchResponse.status,
        // statusText: fetchResponse.statusText,
        headers,
      })
      // self.caches.open(CACHE_NAME).then((cache) => {
      //   cache.put(finalReq, cacheResponse)
      // })
    })

    // then, aggregate
    const aggregatePromise = decodePromise.then((intArrays) => {
      const t = performance.now()
      const aggregated = aggregateIntArrays(intArrays, aggregateParams)
      console.log('aggregated in ', performance.now() - t, ' - ', x, y, z)
      return encodeTileResponse(aggregated, aggregateParams)
    })
    return aggregatePromise
  })
  fetchEvent.respondWith(cachePromise)
})

/*
  const cachePromise = self.caches
    .match(finalReq)
    .then((cacheResponse) => {
      const TILESET_NUM_CELLS = 64
      const aggregateParams = {
        sourceLayer: tileset,
        geomType,
        delta,
        numCells: TILESET_NUM_CELLS,
        x,
        y,
        z,
        quantizeOffset,
      }
      // Cache hit - return response
      if (cacheResponse) {
        const cachedTimestamp = parseInt(cacheResponse.headers.get(CACHE_TIMESTAMP_HEADER_KEY))
        const now = new Date().getTime()

        // only get value from cache if it's recent enough
        if (now - cachedTimestamp < CACHE_MAX_AGE_MS) {
          // console.log('recent enough get from cache')
          return aggregateResponse(cacheResponse, aggregateParams)
        } else {
          // console.log('too old, fetching again')
        }
      }

      const fetchPromise = fetch(finalUrl)

      // Will try to cache fetch response in parallel
      fetchPromise
        .then((fetchResponse) => {
          if (!fetchResponse.ok) {
            throw new Error()
          }
          var responseToCache = fetchResponse.clone()
          responseToCache.blob().then((blob) => {
            const headers = new Headers()
            const timestamp = new Date().getTime()
            // add extra header to set a timestamp on cache - will be read at cache.matches call
            headers.set(CACHE_TIMESTAMP_HEADER_KEY, timestamp)
            const cacheResponse = new Response(blob, {
              status: fetchResponse.status,
              statusText: fetchResponse.statusText,
              headers,
            })
            const CACHE_NAME = FAST_TILES_KEY
            self.caches.open(CACHE_NAME).then(function(cache) {
              cache.put(finalReq, cacheResponse)
            })
          })
        })
        .catch((e) => {
          console.log("Can't cache")
        })

      // then, aggregate
      const aggregatePromise = fetchPromise
        .then((fetchResponse) => {
          if (!fetchResponse.ok) {
            throw new Error()
          }
          // return aggregateResponse(fetchResponse, aggregateParams)
          return decodeTile(fetchResponse, tileset)
        })
        .catch((e) => {
          console.log("Can't aggregate")
          throw new Error()
        })

      return aggregatePromise
    })
    .catch((e) => {
      console.log('Failed caching/aggregating')
    })

  fetchEvent.respondWith(cachePromise)

  */
