import uniq from 'lodash/uniq'
import {
  INIT_HEATMAP_LAYERS,
  UPDATE_HEATMAP_LAYER_TEMPORAL_EXTENTS_LOADED_INDICES,
  ADD_HEATMAP_LAYER,
  UPDATE_HEATMAP_LAYER_STYLE,
  REMOVE_HEATMAP_LAYER,
  ADD_REFERENCE_TILE,
  UPDATE_HEATMAP_TILE,
  RELEASE_HEATMAP_TILES,
  HIGHLIGHT_VESSELS,
  UPDATE_LOADED_TILES,
  HIGHLIGHT_CLICKED_VESSEL,
  CLEAR_HIGHLIGHT_CLICKED_VESSEL,
} from './heatmap.actions'

const initialState = {
  // a dict of heatmap layers (key is layer id)
  // each containing data, url, tiles, visibleTemporalExtentsIndices
  heatmapLayers: {},
  // store a list of tiles currently visible in the map
  // those are necessary when adding a new layer to know which tiles need to be loaded
  referenceTiles: [],
  highlightedVessels: { isEmpty: true },
  highlightedClickedVessel: null,
}

export default function(state = initialState, action) {
  switch (action.type) {
    case INIT_HEATMAP_LAYERS: {
      return Object.assign({}, state, { heatmapLayers: action.payload })
    }

    case UPDATE_HEATMAP_LAYER_TEMPORAL_EXTENTS_LOADED_INDICES: {
      const heatmapLayers = state.heatmapLayers
      let indices = heatmapLayers[action.payload.layerId].visibleTemporalExtentsIndices
      indices = uniq(indices.concat(action.payload.indicesAdded))
      heatmapLayers[action.payload.layerId].visibleTemporalExtentsIndices = indices
      return Object.assign({}, state, heatmapLayers)
    }

    case ADD_HEATMAP_LAYER: {
      const heatmapLayers = Object.assign({}, state.heatmapLayers, {
        [action.payload.id]: {
          tiles: [],
          ...action.payload,
        },
      })
      return Object.assign({}, state, { heatmapLayers })
    }

    case UPDATE_HEATMAP_LAYER_STYLE: {
      const newLayer = action.payload
      const layer = { ...state.heatmapLayers[newLayer.id], ...newLayer }
      const heatmapLayers = { ...state.heatmapLayers, [newLayer.id]: layer }
      return { ...state, heatmapLayers }
    }

    case REMOVE_HEATMAP_LAYER: {
      const heatmapLayers = Object.assign({}, state.heatmapLayers)
      delete heatmapLayers[action.payload.id]
      return Object.assign({}, state, { heatmapLayers })
    }

    case ADD_REFERENCE_TILE: {
      return Object.assign({}, state, { referenceTiles: [...state.referenceTiles, action.payload] })
    }

    case UPDATE_HEATMAP_TILE: {
      const layerId = action.payload.layerId
      const newTile = action.payload.tile
      const layer = { ...state.heatmapLayers[layerId] }
      let layerTiles = [...layer.tiles]
      const tileIndex = layerTiles.findIndex((t) => t.uid === newTile.uid)
      if (tileIndex === -1) {
        layerTiles.push(newTile)
      } else {
        layerTiles = [layerTiles.slice(0, tileIndex), newTile, layerTiles.slice(tileIndex + 1)]
      }
      layer.tiles = layerTiles
      const heatmapLayers = { ...state.heatmapLayers, [layerId]: layer }
      return { ...state, heatmapLayers }
    }

    case RELEASE_HEATMAP_TILES: {
      const uids = action.payload

      // remove tiles
      const layerIds = Object.keys(state.heatmapLayers)
      const heatmapLayers = { ...state.heatmapLayers }
      layerIds.forEach((layerId) => {
        const prevLayer = { ...heatmapLayers[layerId] }
        uids.forEach((tileUid) => {
          const releasedTileIndex = prevLayer.tiles.findIndex((tile) => tile.uid === tileUid)
          if (releasedTileIndex > -1) {
            // console.log('releasing', layerId, tileUid);
            prevLayer.tiles.splice(releasedTileIndex, 1)
          }
        })
      })

      // remove reference tiles
      let referenceTiles = [...state.referenceTiles]
      uids.forEach((tileUid) => {
        const releasedRefTileIndex = referenceTiles.findIndex((tile) => tile.uid === tileUid)
        if (releasedRefTileIndex > -1) {
          referenceTiles = [
            ...referenceTiles.slice(0, releasedRefTileIndex),
            ...referenceTiles.slice(releasedRefTileIndex + 1),
          ]
        }
      })

      return { ...state, heatmapLayers, referenceTiles }
    }

    case UPDATE_LOADED_TILES: {
      const newHeatmapLayers = { ...state.heatmapLayers }
      return { ...state, heatmapLayers: newHeatmapLayers }
    }

    case HIGHLIGHT_VESSELS: {
      return Object.assign({}, state, { highlightedVessels: action.payload })
    }

    case HIGHLIGHT_CLICKED_VESSEL: {
      return { ...state, highlightedClickedVessel: action.payload }
    }

    case CLEAR_HIGHLIGHT_CLICKED_VESSEL: {
      return { ...state, highlightedClickedVessel: null }
    }

    default:
      return state
  }
}
