import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { mergeDeep, fromJS } from 'immutable'
import { closePopup } from '../module/module.actions.js'
import { getTracksStyles } from '../tracks/tracks.selectors.js'
import { mapHover, mapClick } from './interaction.actions.js'
import { setViewport, transitionEnd } from './viewport.actions.js'
import Map from './Map'

const getStaticLayers = (state) => state.map.style.staticLayers

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

    return mergeDeep(mapStyles, fromJS(trackStyles))
  }
)

const mapStateToProps = (state, ownProps) => ({
  viewport: state.map.viewport.viewport,
  maxZoom: state.map.viewport.maxZoom,
  minZoom: state.map.viewport.minZoom,
  cursor: state.map.interaction.cursor,
  mapStyle: getMapStyle(state),
  interactiveLayerIds: getInteractiveLayerIds(state),
})

const mapDispatchToProps = (dispatch) => ({
  setViewport: (viewport) => {
    dispatch(setViewport(viewport))
  },
  mapHover: (lat, long, features) => {
    dispatch(mapHover(lat, long, features))
  },
  mapClick: (lat, long, features) => {
    dispatch(mapClick(lat, long, features))
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
