import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { fromJS } from 'immutable'
import { TRACKS_LAYER_IN_FRONT_OF_GROUP } from '../config'
import { closePopup } from '../module/module.actions.js'
import { getTracksStyles } from '../tracks/tracks.selectors.js'
import { mapInteraction } from './interaction.actions.js'
import { setViewport, transitionEnd } from './viewport.actions.js'
import Map from './Map'

const getStaticLayers = (state) => state.map.style.staticLayers
const getHeatmapLayers = (state) => state.map.heatmap.heatmapLayers

const hasHeatmapLayers = createSelector(
  [getHeatmapLayers],
  (heatmapLayers) => {
    return Object.keys(heatmapLayers).length > 0
  }
)
const getInteractiveLayerIds = createSelector(
  [getStaticLayers],
  // Note: here we assume that layer IDs provided with module match the GL layers that should
  // be interactive or not, ie typically the fill layer if a label layer is present
  (staticLayers) =>
    staticLayers.filter((l) => l.interactive === true && l.visible === true).map((l) => l.id)
)

const getMapStyles = (state) => state.map.style.mapStyle
const getMapStyle = createSelector(
  [getMapStyles, getTracksStyles],
  (mapStyles, trackStyles) => {
    if (!trackStyles) return mapStyles

    const currentLayerGroups = mapStyles
      .toJS()
      .layers.filter((l) => l.metadata !== undefined)
      .map((l) => l.metadata['mapbox:group'])
    const trackLayersIndex = currentLayerGroups.lastIndexOf(TRACKS_LAYER_IN_FRONT_OF_GROUP) + 1

    let finalMapStyles = mapStyles.mergeIn(['sources'], trackStyles.sources)
    let mapStylesLayers = mapStyles.get('layers')
    trackStyles.layers.forEach((trackLayer, i) => {
      mapStylesLayers = mapStylesLayers.insert(trackLayersIndex + i, fromJS(trackLayer))
    })
    finalMapStyles = finalMapStyles.set('layers', mapStylesLayers)
    return finalMapStyles
  }
)

const mapStateToProps = (state, ownProps) => ({
  viewport: state.map.viewport.viewport,
  maxZoom: state.map.viewport.maxZoom,
  minZoom: state.map.viewport.minZoom,
  cursor: state.map.interaction.cursor,
  token: state.map.module.token,
  mapStyle: getMapStyle(state),
  hasHeatmapLayers: hasHeatmapLayers(state),
  interactiveLayerIds: getInteractiveLayerIds(state),
})

const mapDispatchToProps = (dispatch) => ({
  setViewport: (viewport) => {
    dispatch(setViewport(viewport))
  },
  mapInteraction: (type, lat, long, features, cluster, glGetSource) => {
    dispatch(mapInteraction(type, lat, long, features, cluster, glGetSource))
  },
  transitionEnd: () => {
    dispatch(transitionEnd())
  },
  onClosePopup: () => {
    dispatch(closePopup())
  },
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Map)
