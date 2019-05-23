import area from '@turf/area'
import { POLYGON_LAYERS_AREA } from '../constants'
import { clearHighlightedVessels, clearHighlightedClickedVessel } from '../heatmap/heatmap.actions'
import GL_STYLE from './gl-styles/style.json'
import { zoomIntoVesselCenter } from './viewport.actions'

export const SET_POPUP = 'SET_POPUP'
export const CLEAR_POPUP = 'CLEAR_POPUP'
export const SET_MAP_CURSOR = 'SET_MAP_CURSOR'

const getAreaKm2 = (glFeature) => {
  const areakm2 = 10 ** -6 * area(glFeature.geometry)
  const formatted = areakm2.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return formatted
}

const getFields = (glFeature, sourceId = null) => {
  const source = sourceId === null ? null : GL_STYLE.sources[sourceId]
  if (source === null || source === undefined) {
    console.warn('Couldnt find source when looking for fields of layer', sourceId)
  }
  const fieldsDefinition =
    source.metadata === undefined || source.metadata['gfw:popups'] === undefined
      ? []
      : source.metadata['gfw:popups']

  const properties = glFeature.properties

  // whitelist if 'gfw:popups' exist, if not return all
  const fieldsKeys = Object.keys(glFeature.properties).filter(
    (k) => fieldsDefinition.length === 0 || fieldsDefinition.find((fd) => fd.id === k) !== undefined
  )

  const fields = fieldsKeys.map((fieldKey) => {
    const value = fieldKey === POLYGON_LAYERS_AREA ? getAreaKm2(glFeature) : properties[fieldKey]
    const def = fieldsDefinition.find((fd) => fd.id === fieldKey) || {}
    const label = def.label || fieldKey
    return {
      id: fieldKey,
      label,
      value,
      title: `${label}: ${value}`,
      isLink: def.isLink,
    }
  })

  const mainField =
    fields.find((f) => f.id === 'name') || fields.find((f) => f.id === 'id') || fields[0]
  if (mainField !== undefined) {
    mainField.isMain = true
  }
  return fields
}

const getCluster = (glFeature, glGetSource) => {
  const clusterId = glFeature.properties.cluster_id
  const sourceId = glFeature.source
  const glSource = glGetSource(sourceId)
  const promise = new Promise((resolve, reject) => {
    glSource.getClusterExpansionZoom(clusterId, (err1, zoom) => {
      glSource.getClusterLeaves(clusterId, 99, 0, (err2, children) => {
        if (err1 || err2) {
          reject()
        }
        const childrenFeatures = children.map((child) => getFeature(child, sourceId))
        resolve({
          zoom,
          childrenFeatures,
        })
      })
    })
  })
  return promise
}

const getFeature = (glFeature, layerId) => {
  const feature = {
    properties: glFeature.properties,
  }
  const fields = getFields(glFeature, layerId)
  feature.fields = fields

  // Get most likely feature title
  const mainField = fields.find((f) => f.isMain === true)
  feature.title = mainField === undefined ? layerId : mainField.title

  return feature
}

export const mapInteraction = (interactionType, latitude, longitude, glFeatures, glGetSource) => (
  dispatch,
  getState
) => {
  if (interactionType === 'click') {
    dispatch(clearHighlightedClickedVessel())
  }

  const event = {
    latitude,
    longitude,
    features: [],
  }

  // Collect and normalize features on legacy heatmap
  const currentLegacyHeatmapData = getState().map.heatmap.highlightedVessels
  let legacyHeatmapFeature
  if (currentLegacyHeatmapData.isEmpty !== true) {
    const properties =
      currentLegacyHeatmapData.foundVessels === undefined
        ? []
        : currentLegacyHeatmapData.foundVessels[0]
    legacyHeatmapFeature = {
      isCluster: currentLegacyHeatmapData.clickableCluster === true,
      layer: {
        id: currentLegacyHeatmapData.layer.id,
        group: 'legacyHeatmap',
      },
      properties,
    }
    event.features.push(legacyHeatmapFeature)
  }

  // Try to retrieve 'gfw:id' (generated when instanciating CARTO layer to preserve original style.json id)
  // In most cases it won't exist, so fall back to source id
  const getStaticLayerIdFromGlFeature = (glFeature) =>
    (glFeature.layer.metadata !== undefined && glFeature.layer.metadata['gfw:id']) ||
    glFeature.layer.source

  // Collect gl features
  const clusterPromises = []
  const allGlFeatures = glFeatures || []
  allGlFeatures.forEach((glFeature) => {
    const layerId = getStaticLayerIdFromGlFeature(glFeature)
    const feature = {
      layer: {
        id: getStaticLayerIdFromGlFeature(glFeature),
        group: glFeature.layer.metadata && glFeature.layer.metadata['mapbox:group'],
      },
      ...getFeature(glFeature, layerId),
    }

    if (glFeature.properties.cluster === true) {
      // lookup for cluster
      const clusterPromise = getCluster(glFeature, glGetSource).then((cluster) => {
        feature.cluster = cluster
      })
      clusterPromises.push(clusterPromise)
      feature.isCluster = true
    }
    event.features.push(feature)
  })

  Promise.all(clusterPromises).then(() => {
    // The whole set of features is considered a cluster if any feature is a cluster or there are more than one feature
    event.isCluster =
      event.features.length > 1 || event.features.some((feature) => feature.isCluster === true)

    // legacy heatmap layers can yield clusters with an unknown number of features, handle this here:
    if (legacyHeatmapFeature !== undefined && legacyHeatmapFeature.isCluster) {
      event.count = -1
    } else {
      event.count = event.features.reduce((count, feature) => {
        const featureCount = feature.isCluster ? feature.cluster.childrenFeatures.length : 1
        return count + featureCount
      }, 0)
    }

    if (
      event.isCluster === true &&
      getState().map.module.autoClusterZoom === true &&
      interactionType === 'click'
    ) {
      dispatch(clearHighlightedVessels())
      dispatch(zoomIntoVesselCenter(latitude, longitude))
    }

    let cursor = null
    if (event.features.length) {
      cursor =
        getState().map.module.autoClusterZoom === true && event.isCluster ? 'zoom-in' : 'pointer'
    }

    dispatch({
      type: SET_MAP_CURSOR,
      payload: cursor,
    })

    const callback =
      interactionType === 'click' ? getState().map.module.onClick : getState().map.module.onHover

    if (callback !== undefined) {
      callback(event)
    }
  })
}
