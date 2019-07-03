import React from 'react'
import PropTypes from 'prop-types'
import { combineReducers } from 'redux'
import { Provider } from 'react-redux'
import throttle from 'lodash/throttle'
import { trackTypes } from './proptypes/tracks'
import { heatmapLayerTypes, basemapLayerTypes, staticLayerTypes } from './proptypes/layers'
import { viewportTypes, popupTypes } from './proptypes/shared'

import Map from './glmap/Map.container'
import {
  initModule,
  setTemporalExtent,
  setHighlightTemporalExtent,
  setCursor,
} from './module/module.actions'
import { updateViewport, transitionToZoom } from './glmap/viewport.actions'
import { initStyle, commitStyleUpdates, applyTemporalExtent } from './glmap/style.actions'
import { updateTracks } from './tracks/tracks.actions'
import { updateHeatmapLayers, updateLayerLoadTemporalExtents } from './heatmap/heatmap.actions'

import store from './store'
import mapReducers from './store/reducers'

const mapReducer = combineReducers({
  map: mapReducers,
})

store.replaceReducer(mapReducer)

const throttleApplyTemporalExtent = throttle((temporalExtent) => {
  store.dispatch(applyTemporalExtent(temporalExtent))
  store.dispatch(setTemporalExtent(temporalExtent))
}, 16)

const updateViewportFromIncomingProps = (incomingViewport) => {
  store.dispatch(
    updateViewport({
      latitude: incomingViewport.center[0],
      longitude: incomingViewport.center[1],
      zoom: incomingViewport.zoom,
    })
  )
}

class MapModule extends React.Component {
  state = {
    initialized: false,
    error: null,
    errorInfo: null,
  }

  componentDidCatch(error, errorInfo) {
    console.log(error, errorInfo)
    this.setState({
      error: error,
      errorInfo: errorInfo,
    })
  }

  componentDidMount() {
    // First trigger synchronous actions that should happen before any map render
    // At the end of this, set a flag to allow map rendering

    if (this.props.viewport !== undefined) {
      updateViewportFromIncomingProps(this.props.viewport)
    }

    // TODO
    if (this.props.glyphsPath !== null) {
      store.dispatch(
        initStyle({
          glyphsPath: this.props.glyphsPath,
          // TODO apply URL updates here
        })
      )
    }

    if (this.props.onAttributionsChange !== undefined) {
      this.props.onAttributionsChange(store.getState().map.style.attributions)
    }

    if (store && store.getState().map.module.token === undefined) {
      store.dispatch(
        initModule({
          token: this.props.token,
          autoClusterZoom: this.props.autoClusterZoom,
          isCluster: this.props.isCluster,
          onViewportChange: this.props.onViewportChange,
          onHover: this.props.onHover,
          onClick: this.props.onClick,
          onLoadStart: this.props.onLoadStart,
          onLoadComplete: this.props.onLoadComplete,
          onClosePopup: this.props.onClosePopup,
          onAttributionsChange: this.props.onAttributionsChange,
        })
      )
    }

    if (this.props.highlightTemporalExtent !== null && this.props.highlightTemporalExtent.length) {
      store.dispatch(setHighlightTemporalExtent(this.props.highlightTemporalExtent))
    }

    if (
      (this.props.basemapLayers !== null && this.props.basemapLayers.length) ||
      (this.props.staticLayers !== null && this.props.staticLayers.length)
    ) {
      store.dispatch(
        commitStyleUpdates(this.props.staticLayers || [], this.props.basemapLayers || [])
      )
    }

    if (this.props.tracks !== null) {
      store.dispatch(updateTracks(this.props.tracks))
    }

    // Now trigger async actions

    if (this.props.temporalExtent !== null && this.props.temporalExtent.length) {
      throttleApplyTemporalExtent(this.props.temporalExtent)
    }

    // eslint-disable-next-line react/no-did-mount-set-state
    this.setState({
      initialized: true,
    })

    // heatmap layers
    if (this.props.heatmapLayers !== null) {
      store.dispatch(updateHeatmapLayers(this.props.heatmapLayers, this.props.loadTemporalExtent))
    }
  }

  componentDidUpdate(prevProps) {
    // tracks
    if (this.props.tracks !== prevProps.tracks) {
      store.dispatch(updateTracks(this.props.tracks))
    }

    // heatmap layers
    if (this.props.heatmapLayers !== prevProps.heatmapLayers) {
      store.dispatch(updateHeatmapLayers(this.props.heatmapLayers, this.props.loadTemporalExtent))
    }

    // basemap / static layers
    if (
      (this.props.basemapLayers !== null && this.props.basemapLayers.length) ||
      (this.props.staticLayers !== null && this.props.staticLayers.length)
    ) {
      if (
        this.props.basemapLayers !== prevProps.basemapLayers ||
        this.props.staticLayers !== prevProps.staticLayers
      ) {
        store.dispatch(
          commitStyleUpdates(this.props.staticLayers || [], this.props.basemapLayers || [])
        )
      }
    }

    // loadTemporalExtent
    if (this.props.loadTemporalExtent !== null && this.props.loadTemporalExtent.length) {
      if (
        prevProps.loadTemporalExtent === null ||
        !prevProps.loadTemporalExtent.length ||
        this.props.loadTemporalExtent[0].getTime() !== prevProps.loadTemporalExtent[0].getTime() ||
        this.props.loadTemporalExtent[1].getTime() !== prevProps.loadTemporalExtent[1].getTime()
      ) {
        store.dispatch(updateLayerLoadTemporalExtents(this.props.loadTemporalExtent))
      }
    }
    // temporalExtent
    if (this.props.temporalExtent !== null && this.props.temporalExtent.length) {
      if (
        prevProps.temporalExtent === null ||
        !prevProps.temporalExtent.length ||
        this.props.temporalExtent[0].getTime() !== prevProps.temporalExtent[0].getTime() ||
        this.props.temporalExtent[1].getTime() !== prevProps.temporalExtent[1].getTime()
      ) {
        throttleApplyTemporalExtent(this.props.temporalExtent)
      }
    }

    // highlightTemporalExtent
    if (this.props.highlightTemporalExtent !== null && this.props.highlightTemporalExtent.length) {
      if (
        prevProps.highlightTemporalExtent === null ||
        !prevProps.highlightTemporalExtent.length ||
        this.props.highlightTemporalExtent[0].getTime() !==
          prevProps.highlightTemporalExtent[0].getTime() ||
        this.props.highlightTemporalExtent[1].getTime() !==
          prevProps.highlightTemporalExtent[1].getTime()
      ) {
        store.dispatch(setHighlightTemporalExtent(this.props.highlightTemporalExtent))
      }
    } else {
      if (this.props.highlightTemporalExtent !== prevProps.highlightTemporalExtent) {
        store.dispatch(setHighlightTemporalExtent(this.props.highlightTemporalExtent))
      }
    }

    // viewport - since viewport will be updated internally to the module,
    // we have to compare incoming props to existing viewport in store, ie:
    // update viewport from incoming props ONLY if zoom or center is different
    // from the internally stored one
    // TODO FFS incoming lat lon should be an object, not an array
    const currentViewport = store.getState().map.viewport.viewport
    //                                        stop propagating updates from outside when zooming in
    if (
      this.props.viewport !== undefined &&
      store.getState().map.viewport.currentTransition === null
    ) {
      if (
        currentViewport.latitude !== this.props.viewport.center[0] ||
        currentViewport.longitude !== this.props.viewport.center[1] ||
        currentViewport.zoom !== this.props.viewport.zoom
      ) {
        // if zoom delta is precisely === 1, zoom with a transition
        if (Math.abs(currentViewport.zoom - this.props.viewport.zoom) === 1) {
          store.dispatch(transitionToZoom(this.props.viewport.zoom))
        } else {
          updateViewportFromIncomingProps(this.props.viewport)
        }
      }
    }

    if (this.props.cursor !== undefined) {
      if (this.props.cursor !== prevProps.cursor) {
        store.dispatch(setCursor(this.props.cursor))
      }
    }
  }
  render() {
    if (this.state.error !== null) {
      console.log(this.state.error)
      return (
        <div>
          <h2>Map component crashed!</h2>
          <p className="red">{this.state.error && this.state.error.toString()}</p>
          <div>Component Stack Error Details:</div>
          <p className="red">{this.state.errorInfo.componentStack}</p>
        </div>
      )
    }
    // won't render anything before actions in componentDidMount have been triggered
    return this.state.initialized !== true ? null : (
      <Provider store={store}>
        <Map {...this.props} />
      </Provider>
    )
  }
}

MapModule.propTypes = {
  token: PropTypes.string,
  viewport: PropTypes.shape(viewportTypes).isRequired,
  autoClusterZoom: PropTypes.bool,
  isCluster: PropTypes.func,
  tracks: PropTypes.arrayOf(PropTypes.exact(trackTypes)),
  heatmapLayers: PropTypes.arrayOf(PropTypes.shape(heatmapLayerTypes)),
  temporalExtent: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
  highlightTemporalExtent: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
  loadTemporalExtent: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
  basemapLayers: PropTypes.arrayOf(PropTypes.shape(basemapLayerTypes)),
  staticLayers: PropTypes.arrayOf(PropTypes.shape(staticLayerTypes)),
  cursor: PropTypes.string,
  // customLayers
  hoverPopup: PropTypes.shape(popupTypes),
  clickPopup: PropTypes.shape(popupTypes),
  glyphsPath: PropTypes.string,
  onViewportChange: PropTypes.func,
  onLoadStart: PropTypes.func,
  onLoadComplete: PropTypes.func,
  onClick: PropTypes.func,
  onHover: PropTypes.func,
  onAttributionsChange: PropTypes.func,
  onClosePopup: PropTypes.func,
}

MapModule.defaultProps = {
  token: null,
  glyphsPath: null,
  autoClusterZoom: true,
  isCluster: (event) => event.isCluster === true,
  highlightTemporalExtent: null,
  tracks: null,
  hoverPopup: null,
  clickPopup: null,
  heatmapLayers: null,
  temporalExtent: null,
  loadTemporalExtent: null,
  basemapLayers: null,
  staticLayers: null,
  cursor: null,
  onViewportChange: () => {},
  onLoadStart: () => {},
  onLoadComplete: () => {},
  onClick: () => {},
  onHover: () => {},
  onAttributionsChange: () => {},
  onClosePopup: () => {},
}

export default MapModule
