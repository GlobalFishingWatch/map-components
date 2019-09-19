import tbbox from '@turf/bbox'
import cloneDeep from 'lodash/cloneDeep'
import { targetMapVessel } from '../store'

import {
  getTilePromises,
  getCleanVectorArrays,
  groupData,
  addTracksPointsRenderingData,
  getTracksPlaybackData,
} from '../utils/heatmapTileData'
import { startLoader, completeLoader } from '../module/module.actions'

export const ADD_TRACK = 'ADD_TRACK'
export const UPDATE_TRACK = 'UPDATE_TRACK'
export const REMOVE_TRACK = 'REMOVE_TRACK'

const getTrackDataParsed = (geojson) => {
  const time = { start: Infinity, end: 0 }
  if (geojson && geojson.features) {
    geojson.features.forEach((feature) => {
      const hasTimes =
        feature.properties &&
        feature.properties.coordinateProperties &&
        feature.properties.coordinateProperties.times &&
        feature.properties.coordinateProperties.times.length > 0
      if (hasTimes) {
        feature.properties.coordinateProperties.times.forEach((datetime) => {
          if (datetime < time.start) {
            time.start = datetime
          } else if (datetime > time.end) {
            time.end = datetime
          }
        })
      }
    })
  }
  return {
    geojson,
    timelineBounds: [time.start, time.end],
  }
}

const getTrackBounds = (geojson) => {
  const bounds = tbbox(geojson)
  return {
    minLat: bounds[3],
    minLng: bounds[0],
    maxLat: bounds[1],
    maxLng: bounds[2],
  }
}

// Deprecated tracks format parsing
const getOldTrackBoundsFormat = (data, addOffset = false) => {
  const time = {
    start: Infinity,
    end: 0,
  }
  const geo = {
    minLat: Infinity,
    maxLat: -Infinity,
    minLng: Infinity,
    maxLng: -Infinity,
  }
  for (let i = 0, length = data.datetime.length; i < length; i++) {
    const datetime = data.datetime[i]
    if (datetime < time.start) {
      time.start = datetime
    } else if (datetime > time.end) {
      time.end = datetime
    }

    const lat = data.latitude[i]
    if (lat < geo.minLat) {
      geo.minLat = lat
    } else if (lat > geo.maxLat) {
      geo.maxLat = lat
    }

    let lng = data.longitude[i]
    if (addOffset === true) {
      if (lng < 0) {
        lng += 360
      }
    }
    if (lng < geo.minLng) {
      geo.minLng = lng
    } else if (lng > geo.maxLng) {
      geo.maxLng = lng
    }
  }

  // track crosses the antimeridian
  if (geo.maxLng - geo.minLng > 350 && addOffset === false) {
    return getOldTrackBoundsFormat(data, true)
  }

  return {
    time: [time.start, time.end],
    geo,
  }
}

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

        const vectorArray = addTracksPointsRenderingData(rawTrackData)
        const bounds = getOldTrackBoundsFormat(rawTrackData)

        //const data = getTracksPlaybackData(vectorArray)

        const geoJSON = convertLegacyTrackToGeoJSON(vectorArray)

        dispatch({
          type: UPDATE_TRACK,
          payload: {
            id,
            data: geoJSON,
            geoBounds: bounds.geo,
            timelineBounds: bounds.time,
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
          const { geojson, timelineBounds } = getTrackDataParsed(data)
          const geoBounds = getTrackBounds(data)
          dispatch({
            type: UPDATE_TRACK,
            payload: {
              id,
              data: geojson,
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
