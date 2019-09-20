import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import convert from '@globalfishingwatch/map-convert'
import { exportNativeViewport } from '../glmap/viewport.actions'
import { getTemporalExtent } from '../module/module.selectors'
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

const getTemporalExtentIndexes = createSelector(
  [getTemporalExtent],
  (temporalExtent) => {
    const startTimestamp = temporalExtent[0].getTime()
    const endTimestamp = Math.max(
      temporalExtent[1].getTime(),
      temporalExtent[0].getTime() + MIN_FRAME_LENGTH_MS
    )
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
  leftWorldScaled: state.map.viewport.leftWorldScaled,
  rightWorldScaled: state.map.viewport.rightWorldScaled,
  temporalExtentIndexes: getTemporalExtentIndexes(state),
})

const mapDispatchToProps = (dispatch, ownProps) => ({
  queryHeatmapVessels: (coords, temporalExtentIndexes) => {
    dispatch(queryHeatmapVessels(coords, temporalExtentIndexes))
  },
  exportNativeViewport: (viewport) => {
    dispatch(exportNativeViewport(viewport))
  },
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ActivityLayers)
