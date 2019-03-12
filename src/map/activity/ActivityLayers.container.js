import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { exportNativeViewport } from '../glmap/viewport.actions'
import ActivityLayers from './ActivityLayers'
import { queryHeatmapVessels } from '../heatmap/heatmapTiles.actions'

const getHeatmapLayers = state => state.map.heatmap.heatmapLayers

const getHeatmapLayersAsArray = createSelector(
  [getHeatmapLayers],
  heatmapLayers => {
    const a = Object.keys(heatmapLayers).map(id => ({
      ...heatmapLayers[id],
    }))
    // console.log(a)
    return a
  }
)

const getTracks = state => state.map.tracks.data

const getTracksWithData = createSelector(
  [getTracks],
  tracks => {
    const tracksWithData = tracks.filter(t => t.data !== undefined)
    return tracksWithData
  }
)

const mapStateToProps = state => ({
  highlightedVessels: state.map.heatmap.highlightedVessels,
  highlightedClickedVessel: state.map.heatmap.highlightedClickedVessel,
  viewport: state.map.viewport.viewport,
  zoom: state.map.viewport.viewport.zoom,
  heatmapLayers: getHeatmapLayersAsArray(state),
  tracks: getTracksWithData(state),
  leftWorldScaled: state.map.viewport.leftWorldScaled,
  rightWorldScaled: state.map.viewport.rightWorldScaled,
})

const mapDispatchToProps = (dispatch, ownProps) => ({
  queryHeatmapVessels: coords => {
    dispatch(queryHeatmapVessels(coords, ownProps.temporalExtentIndexes))
  },
  exportNativeViewport: viewport => {
    dispatch(exportNativeViewport(viewport))
  },
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ActivityLayers)
