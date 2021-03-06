import { fromJS } from 'immutable'
import convert from '@globalfishingwatch/map-convert'
import uniq from 'lodash/uniq'
import throttle from 'lodash/throttle'
import { hexToRgb } from '../utils/map-colors'
import { STATIC_LAYERS_CARTO_ENDPOINT, STATIC_LAYERS_CARTO_TILES_ENDPOINT } from '../config'
import { CUSTOM_LAYERS_SUBTYPES, GL_TRANSPARENT } from '../constants'
import GL_STYLE from './gl-styles/style.json'
import { setLayerStyleDefaults } from './style.reducer.js'
import getMainGeomType from '../utils/getMainGeomType'

export const INIT_MAP_STYLE = 'INIT_MAP_STYLE'
export const SET_MAP_STYLE = 'SET_MAP_STYLE'
export const MARK_CARTO_LAYERS_AS_INSTANCIATED = 'MARK_CARTO_LAYERS_AS_INSTANCIATED'
export const SET_STATIC_LAYERS = 'SET_STATIC_LAYERS'
export const SET_BASEMAP_LAYERS = 'SET_BASEMAP_LAYERS'

const setDefaultVectorTiles = (currentSource, refLayerUrl) => {
  if (currentSource.type !== 'vector') {
    return currentSource
  }
  const tiles = currentSource.tiles
  const refLayerUrls = refLayerUrl === undefined ? [] : [refLayerUrl]

  const newTiles =
    tiles !== undefined && tiles.length > 0 ? uniq([...refLayerUrls, ...tiles]) : refLayerUrls
  return {
    ...currentSource,
    tiles: newTiles,
  }
}

export const initStyle = ({ glyphsPath }) => ({
  type: INIT_MAP_STYLE,
  payload: {
    glyphsPath,
  },
})

const setMapStyle = (style) => ({
  type: SET_MAP_STYLE,
  payload: style,
})

const setStyleTemporalExtent = (dispatch, getState, temporalExtent, applyToThrottled = false) => {
  const state = getState().map.style
  let style = state.mapStyle
  const currentStyle = style.toJS()
  const glLayers = currentStyle.layers

  let start = Math.round(temporalExtent[0].getTime() / 1000)
  let end = Math.round(temporalExtent[1].getTime() / 1000)

  // TEMPORARY, remove later - temporal layers points should have a timestamp, this is legacy
  // logic for legacy encounters layer that only have a 'timeIndex'
  const startIndex = convert.getOffsetedTimeAtPrecision(temporalExtent[0].getTime())
  const endIndex = convert.getOffsetedTimeAtPrecision(temporalExtent[1].getTime())

  for (let i = 0; i < glLayers.length; i++) {
    const glLayer = glLayers[i]
    if (glLayer.metadata === undefined || glLayer.metadata['gfw:temporal'] !== true) {
      continue
    }

    if (
      (applyToThrottled === true && glLayer.metadata['gfw:temporal:throttled'] !== true) ||
      (applyToThrottled === false && glLayer.metadata['gfw:temporal:throttled'] === true)
    ) {
      continue
    }

    // if layer is temporal, a filter must always be preset on the style.json object
    // because each layer can have a different time field to be filtered
    const currentFilter = style.getIn(['layers', i, 'filter']).toJS()
    if (currentFilter === null) {
      throw new Error('filter must be preset on style.json for temporal layer: ', glLayer.id)
    }

    // TEMPORARY, remove later - temporal layers points should have a timestamp, this is legacy
    // logic for legacy encounters layer that only have a 'timeIndex'
    const isLegacy = glLayer.metadata && glLayer.metadata['gfw:temporalField'] === 'timeIndex'
    currentFilter[1][2] = isLegacy ? startIndex : start
    currentFilter[2][2] = isLegacy ? endIndex : end
    style = style.setIn(['layers', i, 'filter'], fromJS(currentFilter))
  }
  dispatch(setMapStyle(style))
}

const applyTemporalExtentThrottled = throttle((dispatch, getState, temporalExtent) => {
  setStyleTemporalExtent(dispatch, getState, temporalExtent, true)
}, 400)

export const applyTemporalExtent = (temporalExtent) => (dispatch, getState) => {
  setStyleTemporalExtent(dispatch, getState, temporalExtent)
  applyTemporalExtentThrottled(dispatch, getState, temporalExtent)
}

const applyLayerExpressions = (style, refLayer, currentGlLayer, glLayerIndex) => {
  let newStyle = style
  const currentStyle = style.toJS()
  const glType = currentGlLayer.type
  const defaultStyles = currentStyle.metadata['gfw:styles']
  const metadata = currentGlLayer.metadata
  ;['selected', 'highlighted'].forEach((styleType) => {
    // get selectedFeatures or highlightedFeatures
    const features = refLayer[`${styleType}Features`]
    const refLayerStyle = features && features.style ? features.style[glType] : {}
    const hasFeatures = features !== null && features !== undefined && features.values.length > 0
    const applyStyleToAllFeatures = refLayer[styleType]

    const defaultStyle = defaultStyles[styleType][glType] || {}
    const layerStyle =
      (metadata && metadata['gfw:styles'] && metadata['gfw:styles'][styleType]) || {}
    const allPaintProperties = { ...defaultStyle, ...layerStyle, ...refLayerStyle }

    if (Object.keys(allPaintProperties).length) {
      // go through each applicable gl paint property
      Object.keys(allPaintProperties).forEach((glPaintProperty) => {
        const selectedValue = allPaintProperties[glPaintProperty][0]
        const fallbackValue = allPaintProperties[glPaintProperty][1]
        const paintOrLayout = ['icon-size', 'icon-image'].includes(glPaintProperty)
          ? 'layout'
          : 'paint'
        let glPaintFinalValue
        if (
          hasFeatures === false &&
          applyStyleToAllFeatures !== true &&
          applyStyleToAllFeatures !== false
        ) {
          // style reset when no features filter is declared and neither is applyAll
          const originalLayerStyle = GL_STYLE.layers.find((l) => l.id === currentGlLayer.id)

          if (originalLayerStyle !== undefined) {
            // for reset: do not repaint with default style when layer as a custom main color property
            if (
              currentGlLayer.metadata &&
              currentGlLayer.metadata['gfw:mainColorPaintProperty'] === glPaintProperty
            ) {
              glPaintFinalValue = null
            } else {
              glPaintFinalValue = originalLayerStyle[paintOrLayout][glPaintProperty]
            }
          } else {
            // this will happen when no style exist in the original definition (ie custom layers)
            // in this case set glPaintFinalValue to null and we'll just skip applying
            // any selected/highlighted style for this layer
            glPaintFinalValue = null
          }
        } else if (applyStyleToAllFeatures === true || applyStyleToAllFeatures === false) {
          glPaintFinalValue = applyStyleToAllFeatures === true ? selectedValue : fallbackValue
        } else {
          let layerColorRgbString = ''
          if (refLayer.color !== null && refLayer.color !== undefined) {
            const layerColorRgb = hexToRgb(refLayer.color)
            layerColorRgbString = `${layerColorRgb.r},${layerColorRgb.g},${layerColorRgb.b}`
          }
          glPaintFinalValue = [
            'match',
            ['get', features.field],
            features.values,
            typeof selectedValue !== 'string'
              ? selectedValue
              : selectedValue.replace('$REFLAYER_COLOR_RGB', layerColorRgbString),
            typeof fallbackValue !== 'string'
              ? fallbackValue
              : fallbackValue.replace('$REFLAYER_COLOR_RGB', layerColorRgbString),
          ]
        }

        if (glPaintFinalValue !== undefined && glPaintFinalValue !== null) {
          newStyle = newStyle.setIn(
            ['layers', glLayerIndex, paintOrLayout, glPaintProperty],
            glPaintFinalValue
          )
        }
      })
    }
  })
  return newStyle
}

const toggleLayerVisibility = (style, refLayer, glLayerIndex) => {
  const visibility = refLayer.visible === true ? 'visible' : 'none'
  return style.setIn(['layers', glLayerIndex, 'layout', 'visibility'], visibility)
}

const updateGLLayer = (style, glLayerId, refLayer) => {
  const currentStyle = style.toJS()
  const currentStyleLayers = currentStyle.layers
  let newStyle = style

  const glLayerIndex = currentStyleLayers.findIndex((l) => l.id === glLayerId)
  const glLayer = currentStyleLayers.find((l) => l.id === glLayerId)

  // visibility
  newStyle = toggleLayerVisibility(newStyle, refLayer, glLayerIndex)

  if (refLayer.isBasemap === true) {
    return newStyle
  }

  const refLayerOpacity = refLayer.opacity === undefined ? 1 : refLayer.opacity

  // color/opacity
  switch (glLayer.type) {
    case 'fill': {
      newStyle = newStyle
        .setIn(['layers', glLayerIndex, 'paint', 'fill-opacity'], refLayerOpacity)
        .setIn(['layers', glLayerIndex, 'paint', 'fill-outline-color'], refLayer.color)
        .setIn(['layers', glLayerIndex, 'paint', 'fill-color'], GL_TRANSPARENT)
      break
    }
    case 'line': {
      const color = refLayer.color || (glLayer.paint && glLayer.paint['line-color'])
      newStyle = newStyle
        .setIn(['layers', glLayerIndex, 'paint', 'line-opacity'], refLayerOpacity)
        .setIn(['layers', glLayerIndex, 'paint', 'line-color'], color)
      break
    }
    case 'symbol': {
      if (glLayer.metadata && glLayer.metadata['gfw:isLabel'] === true) {
        const parentLayerIsVisible =
          newStyle.getIn(['layers', glLayerIndex, 'layout', 'visibility']) === 'visible'
        const labelsVisibility =
          parentLayerIsVisible && refLayer.showLabels === true ? 'visible' : 'none'
        newStyle = newStyle.setIn(
          ['layers', glLayerIndex, 'layout', 'visibility'],
          labelsVisibility
        )
        if (refLayer.showLabels !== true) {
          break
        }
      }
      newStyle = newStyle.setIn(['layers', glLayerIndex, 'paint', 'text-opacity'], refLayerOpacity)

      if (refLayer.color !== undefined) {
        newStyle = newStyle.setIn(['layers', glLayerIndex, 'paint', 'text-color'], refLayer.color)
      }
      break
    }
    // Event layers and custom layers with point geom types
    case 'circle': {
      newStyle = newStyle
        .setIn(['layers', glLayerIndex, 'paint', 'circle-opacity'], refLayerOpacity)
        .setIn(['layers', glLayerIndex, 'paint', 'circle-stroke-opacity'], refLayerOpacity)

      if (refLayer.color !== undefined) {
        const colorPaintProperty =
          glLayer && glLayer.metadata && glLayer.metadata['gfw:mainColorPaintProperty']
            ? glLayer.metadata['gfw:mainColorPaintProperty']
            : 'circle-color'
        newStyle = newStyle.setIn(
          ['layers', glLayerIndex, 'paint', colorPaintProperty],
          refLayer.color
        )
      }
      break
    }
    case 'raster': {
      newStyle = newStyle.setIn(
        ['layers', glLayerIndex, 'paint', 'raster-opacity'],
        refLayerOpacity
      )
      break
    }
    default: {
      break
    }
  }

  newStyle = applyLayerExpressions(newStyle, refLayer, glLayer, glLayerIndex)

  return newStyle
}

const addCustomGLLayer = (subtype, layerId, url, data) => (dispatch, getState) => {
  const state = getState()
  let style = state.map.style.mapStyle
  const currentStyle = style.toJS()

  // add source if it doesn't exist yet
  if (currentStyle.sources[layerId] === undefined) {
    const source = { type: subtype }
    if (subtype === CUSTOM_LAYERS_SUBTYPES.geojson) {
      source.data = data
    } else if (subtype === CUSTOM_LAYERS_SUBTYPES.raster) {
      source.tiles = [url]
      source.tileSize = 256
    }
    style = style.setIn(['sources', layerId], fromJS(source))
  }

  if (currentStyle.layers.find((glLayer) => glLayer.id === layerId) === undefined) {
    const glType = subtype === CUSTOM_LAYERS_SUBTYPES.geojson ? getMainGeomType(data) : subtype
    const glLayer = fromJS({
      id: layerId,
      source: layerId,
      type: glType,
      layout: {},
      paint: {},
    })
    const layerIndex =
      subtype === CUSTOM_LAYERS_SUBTYPES.raster
        ? // if raster, put at index of last raster layer except labels
          currentStyle.layers.length -
          1 -
          currentStyle.layers
            .filter((l) => l.id !== 'labels')
            .reverse()
            .findIndex((l) => l.type === 'raster')
        : currentStyle.layers.length - 1
    style = style.set('layers', style.get('layers').splice(layerIndex, 0, glLayer))
  }

  dispatch(setMapStyle(style))
}

const updateWorkspaceGLLayers = (workspaceGLLayers) => (dispatch, getState) => {
  const state = getState()
  let style = state.map.style.mapStyle

  workspaceGLLayers.forEach((workspaceGLLayer) => {
    const { id, gl } = workspaceGLLayer
    const finalSource = setDefaultVectorTiles(gl.source, workspaceGLLayer.url)
    style = style.setIn(['sources', id], fromJS(finalSource))

    const existingLayerIds = style
      .get('layers')
      .toJS()
      .map((l) => l.id)
    const layersToAdd = gl.layers.filter((layer, index) => {
      const layerId = layer.id || index > 0 ? `${id}-${index}` : id
      return !existingLayerIds.includes(layerId)
    })
    layersToAdd.forEach((layerToAdd, index) => {
      // doesn't add a sufix in the first elements but it will for the following ones
      let layerToAddId = layerToAdd.id || index > 0 ? `${id}-${index}` : id
      const defaultGlLayer = setLayerStyleDefaults(layerToAdd)

      const glLayer = {
        ...defaultGlLayer,
        id: layerToAddId,
        source: id,
      }

      // set source-layer - defaults to source id
      if (gl.source.type === 'vector') {
        const sourceLayer =
          layerToAdd['source-layer'] === undefined ? id : layerToAdd['source-layer']
        glLayer['source-layer'] = sourceLayer
      }

      // find correct z-index
      const existingLayers = style.get('layers')
      const newLayerGroup = glLayer.metadata['mapbox:group']
      const newLayerIndex = existingLayers.findLastIndex((l) => {
        return newLayerGroup === l.toJS().metadata['mapbox:group']
      })
      style = style.set('layers', existingLayers.splice(newLayerIndex, 0, fromJS(glLayer)))
    })
  })

  dispatch(setMapStyle(style))
  dispatch(applyTemporalExtent(state.map.module.temporalExtent))
}

const getCartoLayerInstanciatePromise = ({ sourceId, sourceCartoSQL }) => {
  const mapConfig = { layers: [{ id: sourceId, options: { sql: sourceCartoSQL } }] }
  const mapConfigURL = encodeURIComponent(JSON.stringify(mapConfig))
  const cartoAnonymousMapUrl = STATIC_LAYERS_CARTO_ENDPOINT.replace('$MAPCONFIG', mapConfigURL)

  return new Promise((resolve) => {
    fetch(cartoAnonymousMapUrl)
      .then((res) => {
        if (res.status >= 400) {
          console.warn(`loading of layer failed ${sourceId}`)
          Promise.reject()
          return null
        }
        return res.json()
      })
      .then((data) => {
        resolve({
          layergroupid: data.layergroupid,
          sourceId,
        })
      })
      .catch((err) => {
        console.warn(err)
      })
  })
}

const instanciateCartoLayers = (layers) => (dispatch, getState) => {
  dispatch({
    type: MARK_CARTO_LAYERS_AS_INSTANCIATED,
    payload: layers.map((layer) => layer.sourceId),
  })
  const cartoLayersPromises = layers.map((layer) => getCartoLayerInstanciatePromise(layer))
  const cartoLayersPromisesPromise = Promise.all(cartoLayersPromises.map((p) => p.catch((e) => e)))
  cartoLayersPromisesPromise
    .then((instanciatedCartoLayers) => {
      let style = getState().map.style.mapStyle
      const currentStyle = style.toJS()
      instanciatedCartoLayers.forEach((cartoLayer) => {
        const tilesURL = STATIC_LAYERS_CARTO_TILES_ENDPOINT.replace(
          '$LAYERGROUPID',
          cartoLayer.layergroupid
        )

        // replace gl source with a new source that use tiles provided by Carto anonymous maps API
        const newSourceId = `${cartoLayer.sourceId}-instanciated`
        style = style.setIn(
          ['sources', newSourceId],
          fromJS({
            type: 'vector',
            tiles: [tilesURL],
          })
        )

        style = style.deleteIn(['sources', cartoLayer.sourceId])

        // change source in all layers that are using it (generally polygon + labels)
        currentStyle.layers.forEach((glLayer, glLayerIndex) => {
          if (glLayer.source === cartoLayer.sourceId) {
            style = style.setIn(['layers', glLayerIndex, 'source'], newSourceId)
            style = style.setIn(['layers', glLayerIndex, 'metadata', 'gfw:id'], cartoLayer.sourceId)
            const refLayer = layers.find((l) => l.refLayer.id === cartoLayer.sourceId).refLayer
            style = updateGLLayer(style, glLayer.id, refLayer)
          }
        })
      })

      dispatch(setMapStyle(style))
    })
    .catch((err) => {
      console.warn(err)
    })
}

export const commitStyleUpdates = (staticLayers, basemapLayers) => (dispatch, getState) => {
  // Store a copy of static and basemap layers. This is not used directly by
  // the Map component which only needs a prepared style object
  dispatch({
    type: SET_STATIC_LAYERS,
    payload: staticLayers,
  })
  dispatch({
    type: SET_BASEMAP_LAYERS,
    payload: basemapLayers,
  })

  const layers = [...staticLayers, ...basemapLayers.map((bl) => ({ ...bl, isBasemap: true }))]

  const currentGLSources = getState().map.style.mapStyle.toJS().sources

  // collect layers declared in workspace but not in original gl style
  const workspaceGLLayers = layers.filter((layer) => layer.gl !== undefined)

  if (workspaceGLLayers.length) {
    // Adds the gl layers again in case the source is a dynamic geojson source
    dispatch(updateWorkspaceGLLayers(workspaceGLLayers))
  }

  // instanciate custom layers if needed
  const customLayers = layers.filter(
    (layer) => layer.isCustom === true && currentGLSources[layer.id] === undefined
  )
  if (customLayers.length) {
    customLayers.forEach((layer) => {
      dispatch(addCustomGLLayer(layer.subtype, layer.id, layer.url, layer.data))
    })
  }

  const state = getState().map.style
  let style = state.mapStyle
  const currentStyle = style.toJS()
  const glLayers = currentStyle.layers
  const glSources = currentStyle.sources

  const cartoLayersToInstanciate = []

  // update source when needed
  staticLayers.forEach((refLayer) => {
    const sourceId = refLayer.id
    if (currentGLSources[sourceId] !== undefined && refLayer.visible === true) {
      if (refLayer.data !== undefined) {
        style = style.setIn(['sources', sourceId, 'data'], fromJS(refLayer.data))
      }
      if (refLayer.url !== undefined) {
        const newSource = setDefaultVectorTiles(currentGLSources[sourceId], refLayer.url)
        style = style.setIn(['sources', sourceId], fromJS(newSource))
      }
    }
  })

  for (let i = 0; i < glLayers.length; i++) {
    const glLayer = glLayers[i]
    const sourceId = glLayer.source
    const glSource = glSources[sourceId]
    const layerId = (glLayer.metadata !== undefined && glLayer.metadata['gfw:id']) || sourceId

    const refLayer = layers.find((l) => l.id === layerId)

    if (refLayer === undefined) {
      if (glLayer.type !== 'background') {
        // console.warn('gl layer does not exists in workspace', glLayer);
      }
      continue
    }

    // check if layer is served from Carto, which means we need to instanciate it first
    // TODO BUG: check if layer is not instanciatING too
    const sourceCartoSQL = glSource.metadata !== undefined && glSource.metadata['gfw:carto-sql']
    if (sourceCartoSQL !== false && sourceCartoSQL !== undefined) {
      // only if layer is visible and has not been instanciated yet
      const cartoLayerInstanciated = state.cartoLayersInstanciated.indexOf(sourceId) > -1
      if (
        refLayer.visible === true &&
        !cartoLayerInstanciated &&
        !cartoLayersToInstanciate.find((l) => l.sourceId === sourceId)
      ) {
        cartoLayersToInstanciate.push({ sourceId, sourceCartoSQL, refLayer })
      }
      continue
    }

    style = updateGLLayer(style, glLayer.id, refLayer)
  }

  if (cartoLayersToInstanciate.length) {
    dispatch(instanciateCartoLayers(cartoLayersToInstanciate))
  }

  dispatch(setMapStyle(style))
}
