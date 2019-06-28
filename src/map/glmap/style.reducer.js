import { fromJS } from 'immutable'
import uniq from 'lodash/uniq'
import GL_STYLE from './gl-styles/style.json'
import {
  SET_MAP_STYLE,
  MARK_CARTO_LAYERS_AS_INSTANCIATED,
  INIT_MAP_STYLE,
  SET_STATIC_LAYERS,
  SET_BASEMAP_LAYERS,
} from './style.actions'

const attributions = uniq(
  Object.keys(GL_STYLE.sources)
    .map((sourceKey) => GL_STYLE.sources[sourceKey].attribution)
    .filter((source) => source !== undefined)
)

export const setLayerStyleDefaults = (layer) => {
  if (layer.layout === undefined) {
    layer.layout = {}
  }
  if (layer.paint === undefined) {
    layer.paint = {}
  }
  if (layer.metadata === undefined) {
    layer.metadata = {}
  }
  // initialize time filter for time-filterable layers
  if (layer.metadata['gfw:temporal'] === true) {
    const temporalField =
      layer.metadata['gfw:temporalField'] === undefined
        ? 'timestamp'
        : layer.metadata['gfw:temporalField']
    layer.filter = ['all', ['>', temporalField, 0], ['<', temporalField, 999999999999]]
  }

  if (layer.metadata['mapbox:group'] === undefined) {
    layer.metadata['mapbox:group'] = 'temporal'
  }

  // set all layers to not visible except layers explicitely marked as visible (default basemap)
  if (layer.layout.visibility !== 'visible') {
    layer.layout.visibility = 'none'
  }
  return layer
}

const setStyleDefaults = (style) => {
  style.layers.forEach((layer) => {
    setLayerStyleDefaults(layer)
  })
  return style
}

const initialState = {
  mapStyle: fromJS(setStyleDefaults(GL_STYLE)),
  cartoLayersInstanciated: [],
  staticLayers: [],
  basemapLayers: [],
  attributions,
}

export default function(state = initialState, action) {
  switch (action.type) {
    case INIT_MAP_STYLE: {
      const newMapStyle = state.mapStyle.setIn(['glyphs'], action.payload.glyphsPath)
      return { ...state, mapStyle: newMapStyle }
    }
    case SET_MAP_STYLE: {
      return { ...state, mapStyle: action.payload }
    }
    case SET_STATIC_LAYERS: {
      return { ...state, staticLayers: action.payload }
    }
    case SET_BASEMAP_LAYERS: {
      return { ...state, basemapLayers: action.payload }
    }
    case MARK_CARTO_LAYERS_AS_INSTANCIATED: {
      const cartoLayersInstanciated = [...state.cartoLayersInstanciated, ...action.payload]
      return { ...state, cartoLayersInstanciated }
    }
    default:
      return state
  }
}
