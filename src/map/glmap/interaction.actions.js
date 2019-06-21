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

const getFields = (glFeature, source = null) => {
  if (source === null || source === undefined) {
    // console.warn('Couldnt find source when looking for fields of layer', sourceId)
  }

  const fieldsDefinition =
    source === undefined ||
    source.metadata === undefined ||
    source.metadata['gfw:popups'] === undefined
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
      isMain: def.isMain,
    }
  })

  const mainField =
    fields.find((f) => f.isMain === true) ||
    fields.find((f) => f.id === 'name') ||
    fields.find((f) => f.id === 'id') ||
    fields[0]

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
        const childrenFeatures = children.map((child) =>
          getFeature(child, glFeature.layer.id, glSource)
        )
        resolve({
          zoom,
          childrenFeatures,
        })
      })
    })
  })
  return promise
}

const getFeature = (glFeature, layerId, source) => {
  const feature = {
    properties: glFeature.properties,
  }
  const fields = getFields(glFeature, source)
  feature.fields = fields

  // Get most likely feature title
  const mainField = fields.find((f) => f.isMain === true)
  feature.title = mainField === undefined ? layerId : mainField.value

  return feature
}

export const mapInteraction = (interactionType, latitude, longitude, glFeatures, glGetSource) => (
  dispatch,
  getState
) => {
  if (interactionType === 'click') {
    dispatch(clearHighlightedClickedVessel())
  }

  const currentStyle = getState().map.style.mapStyle.toJS()

  const event = {
    latitude,
    longitude,
    features: [],
  }

  // Collect and normalize features on legacy heatmap
  const currentLegacyHeatmapData = getState().map.heatmap.highlightedVessels
  let legacyHeatmapFeature

  if (currentLegacyHeatmapData.isEmpty !== true) {
    const foundVessels =
      currentLegacyHeatmapData.foundVessels === undefined
        ? []
        : currentLegacyHeatmapData.foundVessels
    const properties = foundVessels.length === 0 ? [] : foundVessels[0]
    const isCluster = currentLegacyHeatmapData.clickableCluster === true
    const count =
      isCluster === true && currentLegacyHeatmapData.highlightableCluster === false
        ? -1
        : foundVessels.length
    legacyHeatmapFeature = {
      isCluster,
      count,
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
    const source = currentStyle.sources[layerId]
    const feature = {
      layer: {
        id: layerId,
        group: glFeature.layer.metadata && glFeature.layer.metadata['mapbox:group'],
      },
      ...getFeature(glFeature, layerId, source),
    }

    if (glFeature.properties.cluster === true) {
      // lookup for cluster
      const clusterPromise = getCluster(glFeature, glGetSource).then((cluster) => {
        feature.cluster = cluster
        feature.count = cluster.childrenFeatures.length
      })
      clusterPromises.push(clusterPromise)
      feature.isCluster = true
    } else {
      feature.isCluster = false
    }
    event.features.push(feature)
  })

  Promise.all(clusterPromises).then(() => {
    // The whole set of features is considered a cluster
    // if any feature is a cluster, or there is more than one feature
    event.isCluster =
      event.features.length > 1 || event.features.some((feature) => feature.isCluster === true)

    // legacy heatmap layers can yield clusters with an unknown number of features, handle this here:
    if (legacyHeatmapFeature !== undefined && legacyHeatmapFeature.count === -1) {
      event.count = -1
    } else {
      event.count = event.features.reduce((count, feature) => {
        let featureCount = feature.count || 1
        return count + featureCount
      }, 0)
    }

    if (event.count === 1) {
      event.feature = event.features[0]
    }

    // When autoClusterZoom is set to true, we handle zoom here
    const autoClusterZoom = getState().map.module.autoClusterZoom === true

    // Check if cluster using customizable isCluster() callback
    // If not set resolves simply to (event) => event.isCluster === true
    const clusterBehavior = getState().map.module.isCluster(event)
    event.isCluster = clusterBehavior

    if (autoClusterZoom) {
      if (interactionType === 'click' && event.isCluster === true) {
        dispatch(clearHighlightedVessels())
        const clusterZoom = event.features[0].cluster && event.features[0].cluster.zoom
        dispatch(zoomIntoVesselCenter(latitude, longitude, clusterZoom))
      }
    }

    let cursor = event.features.length ? 'pointer' : null
    if (event.isCluster === true && autoClusterZoom === true) {
      cursor = 'zoom-in'
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
