import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import convert from '@globalfishingwatch/map-convert'
import { exportNativeViewport } from '../glmap/viewport.actions'
import ActivityLayers from './ActivityLayers'
import { queryHeatmapVessels } from '../heatmap/heatmapTiles.actions'
import { MIN_FRAME_LENGTH_MS } from '../config'

const getHeatmapLayers = (state) => state.map.heatmap.heatmapLayers

const getHeatmapLayersAsArray = createSelector(
  [getHeatmapLayers],
  (heatmapLayers) => {
    const a = Object.keys(heatmapLayers).map((id) => ({
      ...heatmapLayers[id],
    }))
    // console.log(a)
    return a
  }
)

const getTracks = (state) => state.map.tracks.data

const getTracksWithData = createSelector(
  [getTracks],
  (tracks) => {
    const tracksWithData = tracks
      .filter((t) => t.isGeoJSON !== true)
      .filter((t) => t.data !== undefined)
    return tracksWithData
  }
)

const getTemporalExtent = (state) => state.map.module.temporalExtent
const getHighlightTemporalExtent = (state) => state.map.module.highlightTemporalExtent

const getTemporalExtentIndexes = createSelector(
  [getTemporalExtent],
  (temporalExtent) => {
    let finalTemporalExtent = temporalExtent
    if (temporalExtent === undefined || temporalExtent === null) {
      finalTemporalExtent = [new Date(1970), new Date()]
    }
    const startTimestamp = finalTemporalExtent[0].getTime()
    const endTimestamp = Math.max(
      finalTemporalExtent[1].getTime(),
      finalTemporalExtent[0].getTime() + MIN_FRAME_LENGTH_MS
    )
    const startIndex = convert.getOffsetedTimeAtPrecision(startTimestamp)
    const endIndex = convert.getOffsetedTimeAtPrecision(endTimestamp)
    return [startIndex, endIndex]
  }
)

const getHighlightTemporalExtentIndexes = createSelector(
  [getHighlightTemporalExtent],
  (highlightTemporalExtent) => {
    console.log(highlightTemporalExtent)
    if (highlightTemporalExtent === undefined) {
      return null
    }
    const startTimestamp = highlightTemporalExtent[0].getTime()
    const endTimestamp = highlightTemporalExtent[1].getTime()
    const startIndex = convert.getOffsetedTimeAtPrecision(startTimestamp)
    const endIndex = convert.getOffsetedTimeAtPrecision(endTimestamp)
    return [startIndex, endIndex]
  }
)

const mapStateToProps = (state) => ({
  highlightedVessels: state.map.heatmap.highlightedVessels,
  highlightedClickedVessel: state.map.heatmap.highlightedClickedVessel,
  viewport: state.map.viewport.viewport,
  zoom: state.map.viewport.viewport.zoom,
  heatmapLayers: getHeatmapLayersAsArray(state),
  tracks: getTracksWithData(state),
  leftWorldScaled: state.map.viewport.leftWorldScaled,
  rightWorldScaled: state.map.viewport.rightWorldScaled,
  temporalExtentIndexes: getTemporalExtentIndexes(state),
  highlightTemporalExtentIndexes: getHighlightTemporalExtentIndexes(state),
})

const mapDispatchToProps = (dispatch, ownProps) => ({
  queryHeatmapVessels: (coords) => {
    dispatch(queryHeatmapVessels(coords, ownProps.temporalExtentIndexes))
  },
  exportNativeViewport: (viewport) => {
    dispatch(exportNativeViewport(viewport))
  },
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ActivityLayers)
