import { compose, createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'

import { fitToBounds } from '../glmap/viewport.actions'

let composeEnhancers = compose
if (
  (process.env.MAP_REDUX_REMOTE_DEBUG || process.env.REACT_APP_MAP_REDUX_REMOTE_DEBUG) &&
  process.env.NODE_ENV === 'development'
) {
  const composeWithDevTools = require('remote-redux-devtools').composeWithDevTools
  composeEnhancers = composeWithDevTools({
    name: 'Map module',
    realtime: true,
    hostname: 'localhost',
    port: 8000,
    maxAge: 30,
    stateSanitizer: (state) => ({ ...state, map: { ...state.map, heatmap: 'NOT_SERIALIZED' } }),
  })
}

const store = createStore(() => {}, {}, composeEnhancers(applyMiddleware(thunk)))

export const targetMapVessel = (id) => {
  const track = store.getState().map.tracks.data.find((t) => t.id === id.toString())
  store.dispatch(fitToBounds(track.geoBounds))

  return track.timelineBounds
}

export default store