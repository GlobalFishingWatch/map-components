import cloneDeep from 'lodash/cloneDeep'
import { targetMapVessel } from '../store'

import { getTilePromises, getCleanVectorArrays, groupData } from '../utils/heatmapTileData'
import { startLoader, completeLoader } from '../module/module.actions'
import { getTrackBounds, getTrackTimeBounds } from '../utils/getTrackBounds'

export const ADD_TRACK = 'ADD_TRACK'
export const UPDATE_TRACK = 'UPDATE_TRACK'
export const REMOVE_TRACK = 'REMOVE_TRACK'

const convertLegacyTrackToGeoJSON = (vectorArrays) => {
  const createFeature = (segId, type = 'track', geomType = 'LineString') => ({
    type: 'Feature',
    geometry: {
      type: geomType,
      coordinates: [],
    },
    properties: {
      type,
      segId,
      coordinateProperties: {
        times: [],
      },
    },
  })

  let currentLng
  let currentSeries = vectorArrays.series[0]
  let currentFeature = createFeature(currentSeries)
  const fishingPoints = createFeature('fishing', 'fishing', 'MultiPoint')
  const features = []
  let lngOffset = 0

  for (let index = 0, length = vectorArrays.latitude.length; index < length; index++) {
    const series = vectorArrays.series[index]
    const longitude = vectorArrays.longitude[index]
    const latitude = vectorArrays.latitude[index]
    const weight = vectorArrays.weight[index]

    if (currentLng) {
      if (longitude - currentLng < -180) {
        lngOffset += 360
      } else if (longitude - currentLng > 180) {
        lngOffset -= 360
      }
    }

    const ll = [longitude + lngOffset, latitude]
    if (series !== currentSeries && index !== 0) {
      features.push(cloneDeep(currentFeature))
      currentFeature = createFeature(series)
    }

    currentFeature.geometry.coordinates.push(ll)
    if (weight > 0) {
      fishingPoints.geometry.coordinates.push(ll)
      fishingPoints.properties.coordinateProperties.times.push(vectorArrays.datetime[index])
    }
    currentFeature.properties.coordinateProperties.times.push(vectorArrays.datetime[index])

    currentSeries = series
    currentLng = longitude
  }
  features.push(fishingPoints)

  return {
    type: 'FeatureCollection',
    features,
  }
}

function loadTrack(track) {
  return (dispatch, getState) => {
    const { id, url, type, fitBoundsOnLoad, layerTemporalExtents, color, data } = track
    const state = getState()
    if (state.map.tracks.data.find((t) => t.id === id)) {
      return
    }

    const payload = {
      id,
      url,
      type,
      color,
      fitBoundsOnLoad,
    }
    const trackHasData = track.data !== undefined && track.data !== null
    const trackHasUrl = url !== undefined && url !== null && url !== ''
    if (trackHasData) {
      payload.data = data
      payload.geoBounds = getTrackBounds(data)
    }
    dispatch({ type: ADD_TRACK, payload })

    if (trackHasData || !trackHasUrl) {
      return
    }

    const loaderID = startLoader(dispatch, state)
    if (type !== 'geojson') {
      // Deprecated tracks format logic to be deleted some day
      const token = state.map.module.token

      const promises = getTilePromises(url, token, layerTemporalExtents)

      Promise.all(promises.map((p) => p.catch((e) => e))).then((rawTileData) => {
        const cleanData = getCleanVectorArrays(rawTileData)

        if (!cleanData.length) {
          return
        }
        const rawTrackData = groupData(cleanData, [
          'latitude',
          'longitude',
          'datetime',
          'series',
          'weight',
          'sigma',
        ])

        const data = convertLegacyTrackToGeoJSON(rawTrackData)
        const timelineBounds = getTrackTimeBounds(data)
        const geoBounds = getTrackBounds(data)

        dispatch({
          type: UPDATE_TRACK,
          payload: {
            id,
            data,
            geoBounds,
            timelineBounds,
          },
        })
        dispatch(completeLoader(loaderID))
      })
    } else {
      fetch(url)
        .then((res) => {
          if (res.status >= 400) throw new Error(res.statusText)
          return res.json()
        })
        .then((data) => {
          const timelineBounds = getTrackTimeBounds(data)
          const geoBounds = getTrackBounds(data)
          dispatch({
            type: UPDATE_TRACK,
            payload: {
              id,
              data,
              geoBounds,
              timelineBounds,
            },
          })
          if (fitBoundsOnLoad) {
            targetMapVessel(id)
          }
        })
        .catch((err) => console.warn(err))
        .finally(() => dispatch(completeLoader(loaderID)))
    }
  }
}

const removeTrack = (trackId) => ({
  type: REMOVE_TRACK,
  payload: {
    trackId,
  },
})

export const updateTracks = (newTracks = []) => (dispatch, getState) => {
  const prevTracks = getState().map.tracks.data
  // add and update layers
  if (newTracks) {
    newTracks.forEach((newTrack) => {
      const trackId = newTrack.id
      const prevTrack = prevTracks.find((t) => t.id === trackId)
      if (prevTrack === undefined) {
        dispatch(loadTrack(newTrack))
      } else if (prevTrack.color !== newTrack.color) {
        dispatch({
          type: UPDATE_TRACK,
          payload: {
            id: newTrack.id,
            color: newTrack.color,
          },
        })
      }
    })
  }

  // clean up unused tracks
  prevTracks.forEach((prevTrack) => {
    if (!newTracks || !newTracks.find((t) => t.id === prevTrack.id)) {
      dispatch(removeTrack(prevTrack.id))
    }
  })
}
