import tilecover from '@mapbox/tile-cover/index'
import debounce from 'lodash/debounce'
import { PerspectiveMercatorViewport } from 'viewport-mercator-project'
import { ACTIVITY_LAYERS_MAX_ZOOM_LEVEL_TILE_LOADING, TILES_LOAD_ZOOM_OFFSET } from '../config'
import {
  getTile,
  releaseTiles,
  highlightVesselFromHeatmap,
  updateLoadedTiles,
} from './heatmap.actions'

export const SET_CURRENTLY_VISIBLE_TILES = 'SET_CURRENTLY_VISIBLE_TILES'
export const SET_CURRENTLY_LOADED_TILES = 'SET_CURRENTLY_LOADED_TILES'
export const SET_CURRENTLY_SWAPPED_TILE_UIDS = 'SET_CURRENTLY_SWAPPED_TILE_UIDS'
export const MARK_TILES_UIDS_AS_LOADED = 'MARK_TILES_UIDS_AS_LOADED'
export const RELEASE_MARKED_TILES_UIDS = 'RELEASE_MARKED_TILES_UIDS'

// restrict tilecover to a single zoom level
// could be customized to load less or more detailed tiles
const getTilecoverLimits = (viewportZoom) => {
  let zoom = Math.ceil(viewportZoom + TILES_LOAD_ZOOM_OFFSET)
  let tilesAvailable = true
  if (zoom > ACTIVITY_LAYERS_MAX_ZOOM_LEVEL_TILE_LOADING) {
    zoom = ACTIVITY_LAYERS_MAX_ZOOM_LEVEL_TILE_LOADING
    tilesAvailable = false
  }
  return {
    min_zoom: zoom,
    max_zoom: zoom,
    tilesAvailable,
  }
}

const flushToReleaseTiles = () => (dispatch, getState) => {
  const state = getState()
  const currentToLoadTileUids = state.map.heatmapTiles.currentToLoadTileUids
  // console.log('Tiles left to load: ', currentToLoadTileUids);

  // Tiles are released only when all to-load tiles have finished loading
  // this is to ensure smooth visual transitions between zoom levels
  if (!currentToLoadTileUids.length) {
    const currentTilesToReleaseUids = state.map.heatmapTiles.currentToReleaseTileUids
    // console.log('no more tiles to load, releasing ', currentTilesToReleaseUids);
    dispatch(releaseTiles(currentTilesToReleaseUids))
    dispatch({
      type: RELEASE_MARKED_TILES_UIDS,
    })
  }
}

export const markTileAsLoaded = (tileUids) => (dispatch) => {
  dispatch({
    type: MARK_TILES_UIDS_AS_LOADED,
    payload: tileUids,
  })
  // console.log(tileUids, 'have finished loading');
  dispatch(flushToReleaseTiles())
}

const flushTileState = (forceLoadingAllVisibleTiles = false) => (dispatch, getState) => {
  const state = getState()
  const currentVisibleTiles = state.map.heatmapTiles.currentVisibleTiles
  let tilesToLoad = []
  const tilesToReleaseUids = []

  if (forceLoadingAllVisibleTiles === true) {
    tilesToLoad = currentVisibleTiles
  } else {
    const currentLoadedTiles = state.map.heatmapTiles.currentLoadedTiles

    currentVisibleTiles.forEach((visibleTile) => {
      if (currentLoadedTiles.find((t) => t.uid === visibleTile.uid) === undefined) {
        tilesToLoad.push(visibleTile)
      }
    })

    currentLoadedTiles.forEach((loadedTile) => {
      if (currentVisibleTiles.find((t) => t.uid === loadedTile.uid) === undefined) {
        tilesToReleaseUids.push(loadedTile.uid)
      }
    })
  }

  const tilesToLoadUids = tilesToLoad.map((t) => t.uid)
  // console.log('force loading:', forceLoadingAllVisibleTiles)
  // console.log('visible', currentVisibleTiles.map(t => t.uid))
  // console.log('load', tilesToLoadUids)
  // console.log('release', tilesToReleaseUids)
  // console.log('----')

  tilesToLoad.forEach((tile) => {
    dispatch(getTile(tile))
  })
  dispatch({
    type: SET_CURRENTLY_LOADED_TILES,
    payload: currentVisibleTiles,
  })

  dispatch({
    type: SET_CURRENTLY_SWAPPED_TILE_UIDS,
    payload: {
      tilesToLoadUids,
      tilesToReleaseUids,
    },
  })

  dispatch(updateLoadedTiles())
  dispatch(flushToReleaseTiles())
}

const _debouncedFlushState = (dispatch) => {
  dispatch(flushTileState())
}
const debouncedFlushState = debounce(_debouncedFlushState, 500)

export const updateHeatmapTilesFromViewport = (forceLoadingAllVisibleTiles = false) => (
  dispatch,
  getState
) => {
  // if in transition, skip loading/releasing
  // else
  //   collect all tiles in viewport
  //   save them to reducer: currentVisibleTiles
  // if not zooming: flush immediately
  //   if forceLoadingAllVisiblelTiles
  //     get tiles from currentVisibleTiles
  //   else
  //     get tiles from currentVisibleTiles
  //     make delta with currentLoadedTiles
  //     get tiles from delta+
  //     release tiles from delta-
  //   save to reducer: currentVisibleTiles -> currentLoadedTiles
  // if zooming: debounced flush to avoid "tile spam"
  const mapViewport = getState().map.viewport
  const viewport = mapViewport.viewport

  // do not allow any tile update during transitions (currently only zoom)
  // wait for the end of the transition to look at viewport and load matching tiles
  if (!viewport.width || !viewport.height || mapViewport.currentTransition !== null) {
    return
  }

  // instanciate a viewport instance to get lat/lon from screen top left/ bottom right bounds
  const boundsViewport = new PerspectiveMercatorViewport(viewport)
  const bounds = [
    boundsViewport.unproject([0, 0]),
    boundsViewport.unproject([viewport.width, viewport.height]),
  ]

  const [wn, es] = bounds
  const [w, s, e, n] = [wn[0], es[1], es[0], wn[1]]
  const boundsPolygonsCoordinates = []

  const limits = getTilecoverLimits(viewport.zoom)
  if (limits.tilesAvailable === false && forceLoadingAllVisibleTiles !== true) {
    return
  }

  if (e > 180 || w < -180) {
    // deal with the antimeridian situation by splitting the bounds polygon into two polygons
    const w1 = e > 180 ? w : w + 360
    const e1 = 180 - 0.001
    const w2 = -180
    const e2 = e > 180 ? e - 360 : e
    boundsPolygonsCoordinates.push([[[w1, n], [e1, n], [e1, s], [w1, s], [w1, n]]])
    boundsPolygonsCoordinates.push([[[w2, n], [e2, n], [e2, s], [w2, s], [w2, n]]])
  } else {
    boundsPolygonsCoordinates.push([[[w, n], [e, n], [e, s], [w, s], [w, n]]])
  }

  const geom = {
    type: 'MultiPolygon',
    coordinates: boundsPolygonsCoordinates,
  }

  // using tilecover, get xyz tile coords as well as quadkey indexes (named uid through the app)
  const viewportTilesCoords = tilecover.tiles(geom, limits)
  const viewportTilesIndexes = tilecover.indexes(geom, limits)
  const visibleTiles = []

  viewportTilesCoords.forEach((coords, i) => {
    const uid = viewportTilesIndexes[i]
    const zoom = coords[2]
    if (zoom >= 2) {
      visibleTiles.push({
        tileCoordinates: {
          x: coords[0],
          y: coords[1],
          zoom: coords[2],
        },
        uid,
      })
    }
  })

  dispatch({
    type: SET_CURRENTLY_VISIBLE_TILES,
    payload: visibleTiles,
  })

  const isMouseWheelZooming = mapViewport.prevZoom !== viewport.zoom

  if (isMouseWheelZooming === false) {
    dispatch(flushTileState(forceLoadingAllVisibleTiles))
  } else {
    debouncedFlushState(dispatch)
  }
}

export const queryHeatmapVessels = (coords, temporalExtentIndexes) => (dispatch, getState) => {
  // use tilecover to get what tile quadkey/uid "belongs" to the point
  const geom = {
    type: 'Point',
    coordinates: [coords.longitude, coords.latitude],
  }
  const zoom = getState().map.viewport.viewport.zoom

  // get quadkey for tile at current zoom level, but also neighbouring zoom levels,
  // in case current zoom level tiles has not been loaded yet
  const uids = [zoom, zoom - 1, zoom + 1]
    .map((z) => getTilecoverLimits(z))
    .map((limits) => tilecover.indexes(geom, limits))
    .map((indexes) => indexes[0])

  const query = {
    ...coords,
    uids,
  }

  // console.log(query);
  dispatch(highlightVesselFromHeatmap(query, temporalExtentIndexes))
}
