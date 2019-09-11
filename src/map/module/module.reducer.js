import PropTypes from 'prop-types'
import withReducerTypes from '../utils/withReducerTypes'
import {
  INIT_MODULE,
  SET_TEMPORAL_EXTENT,
  SET_HIGHLIGHT_TEMPORAL_EXTENT,
  START_LOADER,
  COMPLETE_LOADER,
  SET_MODULE_CURSOR,
} from './module.actions'

const initialState = {
  loaders: null,
  token: undefined,
  temporalExtent: [new Date(1970), new Date()],
  highlightTemporalExtent: null,
  cursor: null,
  onViewportChange: undefined,
  onHover: undefined,
  onClick: undefined,
  onLoad: undefined,
  onLoadStart: undefined,
  onLoadComplete: undefined,
  onClosePopup: undefined,
  onAttributionsChange: undefined,
}

const moduleReducer = (state = initialState, action) => {
  switch (action.type) {
    case INIT_MODULE: {
      return {
        ...state,
        ...action.payload,
      }
    }

    case SET_TEMPORAL_EXTENT: {
      return {
        ...state,
        temporalExtent: action.payload,
      }
    }

    case SET_HIGHLIGHT_TEMPORAL_EXTENT: {
      return {
        ...state,
        highlightTemporalExtent: action.payload,
      }
    }

    case START_LOADER: {
      const loaders = state.loaders !== null ? [...state.loaders] : []
      loaders.push(action.payload)
      return { ...state, loaders }
    }

    case COMPLETE_LOADER: {
      const loaders = [...state.loaders]
      const loaderIndex = loaders.findIndex((l) => l === action.payload)
      loaders.splice(loaderIndex, 1)
      return { ...state, loaders }
    }

    case SET_MODULE_CURSOR: {
      return { ...state, cursor: action.payload }
    }

    default:
      return state
  }
}

const moduleTypes = {
  loaders: PropTypes.arrayOf(PropTypes.number),
  token: PropTypes.string,
  temporalExtent: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
  onViewportChange: PropTypes.func,
  onHover: PropTypes.func,
  onClick: PropTypes.func,
  onLoad: PropTypes.func,
  onLoadStart: PropTypes.func,
  onLoadComplete: PropTypes.func,
  onClosePopup: PropTypes.func,
  onAttributionsChange: PropTypes.func,
}

export default withReducerTypes('module', moduleTypes)(moduleReducer)
