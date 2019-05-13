export const INIT_MODULE = 'INIT_MODULE'
export const SET_TEMPORAL_EXTENT = 'SET_TEMPORAL_EXTENT'
export const SET_HIGHLIGHT_TEMPORAL_EXTENT = 'SET_HIGHLIGHT_TEMPORAL_EXTENT'
export const START_LOADER = 'START_LOADER'
export const COMPLETE_LOADER = 'COMPLETE_LOADER'

export const initModule = (props) => (dispatch) => {
  dispatch({
    type: INIT_MODULE,
    payload: props,
  })
}

export const startLoader = (dispatch, state, loaderId) => {
  const timestamp = new Date().getTime()
  const generatedLoaderId = loaderId !== undefined ? `${loaderId}_${timestamp}` : timestamp
  dispatch({
    type: START_LOADER,
    payload: generatedLoaderId,
  })
  if (state.map.module.onLoadStart !== undefined) {
    state.map.module.onLoadStart()
  }
  return loaderId
}

export const completeLoader = (loaderId) => (dispatch, getState) => {
  dispatch({
    type: COMPLETE_LOADER,
    payload: loaderId,
  })
  const state = getState()
  const loaders = state.map.module.loaders
  if (!loaders.length && state.map.module.onLoadComplete !== undefined) {
    state.map.module.onLoadComplete()
  }
}

export const onViewportChange = () => (dispatch, getState) => {
  const state = getState()
  const callback = state.map.module.onViewportChange

  if (callback === undefined) {
    return
  }
  const viewport = state.map.viewport

  if (viewport.bounds === undefined) {
    return
  }

  callback({
    zoom: viewport.viewport.zoom,
    center: [viewport.viewport.latitude, viewport.viewport.longitude],
    bounds: viewport.bounds,
    canZoomIn: viewport.canZoomIn,
    canZoomOut: viewport.canZoomOut,
    mouseLatLong: viewport.mouseLatLong,
  })
}

export const setTemporalExtent = (temporalExtent) => ({
  type: SET_TEMPORAL_EXTENT,
  payload: temporalExtent,
})

export const setHighlightTemporalExtent = (highlightTemporalExtent) => ({
  type: SET_HIGHLIGHT_TEMPORAL_EXTENT,
  payload: highlightTemporalExtent,
})

export const closePopup = () => (dispatch, getState) => {
  const state = getState()
  if (state.map.module.onClosePopup !== undefined) {
    state.map.module.onClosePopup()
  }
}
