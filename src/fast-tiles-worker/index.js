/* eslint no-restricted-globals: "off" */

import Pbf from 'pbf'
import vtpbf from 'vt-pbf'
import { VectorTile } from '@mapbox/vector-tile'
import geojsonVt from 'geojson-vt'
import tilebelt from '@mapbox/tilebelt'
import aggregate, { rawTileToIntArray } from './aggregate'

const FAST_TILES_KEY = '__fast_tiles__'
const FAST_TILES_KEY_RX = new RegExp(FAST_TILES_KEY)
const FAST_TILES_KEY_XYZ_RX = new RegExp(`${FAST_TILES_KEY}\\/(\\d+)\\/(\\d+)\\/(\\d+)`)
const CACHE_TIMESTAMP_HEADER_KEY = 'sw-cache-timestamp'
const CACHE_NAME = FAST_TILES_KEY
const CACHE_MAX_AGE_MS = 60 * 60 * 1000

const isoToDate = (iso) => {
  return new Date(iso).getTime()
}

const isoToDay = (iso) => {
  return isoToDate(iso) / 1000 / 60 / 60 / 24
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

const aggregateIntArray = (
  intArray,
  { geomType, numCells, delta, x, y, z, quantizeOffset, start, singleFrameStart }
) => {
  const tileBBox = tilebelt.tileToBBOX([x, y, z])
  const aggregated = aggregate(intArray, {
    quantizeOffset,
    tileBBox,
    delta,
    geomType,
    numCells,
    singleFrameStart,
    // TODO make me configurable
    skipOddCells: false,
  })
  return aggregated
}

const decodeTile = (originalResponse, tileset) => {
  return originalResponse.arrayBuffer().then((buffer) => {
    const intArray = rawTileToIntArray(buffer, { tileset })
    return intArray
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
  const tileset = url.searchParams.get('tileset')
  const geomType = url.searchParams.get('geomType')
  const fastTilesAPI = url.searchParams.get('fastTilesAPI')
  const quantizeOffset = parseInt(url.searchParams.get('quantizeOffset'))
  const delta = parseInt(url.searchParams.get('delta') || '10')
  const singleFrame = url.searchParams.get('singleFrame') === 'true'
  const start = isoToDay(url.searchParams.get('start'))
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
    singleFrameStart: singleFrame ? start - quantizeOffset : null,
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
    if (hasRecentCache) {
      return cacheResponse.arrayBuffer().then((ab) => {
        const intArray = new Uint16Array(ab)
        const aggregated = aggregateIntArray(intArray, aggregateParams)
        return encodeTileResponse(aggregated, aggregateParams)
      })
    } else {
      // console.log('too old, fetching again')
    }

    const fetchPromise = fetch(finalUrl)
    const decodePromise = fetchPromise.then((fetchResponse) => {
      if (!fetchResponse.ok) throw new Error()
      // Response needs to be cloned to m odify headers (used for cache expiration)
      // const responseToCache = fetchResponse.clone()
      const decoded = decodeTile(fetchResponse, tileset)
      return decoded
    })

    // Cache fetch response in parallel
    decodePromise.then((intArray) => {
      const headers = new Headers()
      const timestamp = new Date().getTime()
      // add extra header to set a timestamp on cache - will be read at cache.matches call
      headers.set(CACHE_TIMESTAMP_HEADER_KEY, timestamp)
      // convert response to decoded int arrays
      const blob = new Blob([intArray], { type: 'application/octet-binary' })

      const cacheResponse = new Response(blob, {
        // status: fetchResponse.status,
        // statusText: fetchResponse.statusText,
        headers,
      })
      self.caches.open(CACHE_NAME).then((cache) => {
        cache.put(finalReq, cacheResponse)
      })
    })

    // then, aggregate
    const aggregatePromise = decodePromise.then((intArray) => {
      const aggregated = aggregateIntArray(intArray, aggregateParams)
      return encodeTileResponse(aggregated, aggregateParams)
    })
    return aggregatePromise
  })
  fetchEvent.respondWith(cachePromise)
})
