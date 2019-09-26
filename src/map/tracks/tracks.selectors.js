import { createSelector } from 'reselect'
import { getTemporalExtent, getHighlightTemporalExtent } from '../module/module.selectors'

export const getTracksData = (state) => state.map.tracks.data

export const getGeojsonTracksReady = createSelector(
  getTracksData,
  (tracks) => tracks.filter((t) => t.data !== undefined)
)

const mergeStyles = (style1, style2) => ({
  sources: { ...style1.sources, ...style2.sources },
  layers: [...style1.layers, ...style2.layers],
})

const filterGeojsonByTimerange = (geojson, { start, end }) => {
  if (!geojson || !geojson.features) return null
  const featuresFiltered = geojson.features.reduce((filteredFeatures, feature) => {
    const hasTimes =
      feature.properties &&
      feature.properties.coordinateProperties &&
      feature.properties.coordinateProperties.times &&
      feature.properties.coordinateProperties.times.length > 0
    if (hasTimes) {
      const filtered = feature.geometry.coordinates.reduce(
        (filteredCoordinates, coordinate, index) => {
          const timeCoordinate = feature.properties.coordinateProperties.times[index]
          const isInTimeline = timeCoordinate >= start && timeCoordinate <= end
          if (isInTimeline) {
            filteredCoordinates.coordinates.push(coordinate)
            filteredCoordinates.times.push(timeCoordinate)
          }
          return filteredCoordinates
        },
        { coordinates: [], times: [] }
      )
      if (!filtered.coordinates.length) return filteredFeatures

      const filteredFeature = {
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: filtered.coordinates,
        },
        properties: {
          ...feature.properties,
          coordinateProperties: {
            times: filtered.times,
          },
        },
      }
      filteredFeatures.push(filteredFeature)
    }
    return filteredFeatures
  }, [])
  const geojsonFiltered = {
    ...geojson,
    features: featuresFiltered,
  }
  return geojsonFiltered
}

const getFullTracksStyles = createSelector(
  [getTemporalExtent, getGeojsonTracksReady],
  (temporalExtent, tracks) => {
    const hasTemporalExtent = temporalExtent && temporalExtent.length > 0
    const hasTracks = tracks && tracks.length > 0
    if (!hasTemporalExtent || !hasTracks) return null

    const timerange = {
      start: temporalExtent[0].getTime(),
      end: temporalExtent[1].getTime(),
    }
    const styles = tracks.reduce(
      (acc, track) => {
        if (!track.data) return acc

        const source = `${track.id}Track`
        const style = {
          sources: {
            [source]: {
              type: 'geojson',
              data: filterGeojsonByTimerange(track.data, timerange),
            },
          },
          layers: [
            {
              id: `${track.id}Lines`,
              source,
              type: 'line',
              paint: {
                'line-width': 1,
                'line-color': track.color,
              },
            },
            {
              id: `${track.id}Points`,
              source,
              type: 'circle',
              filter: ['match', ['geometry-type'], ['', 'Point'], true, false],
              paint: {
                'circle-radius': 4,
                'circle-color': track.color,
              },
            },
          ],
        }
        return mergeStyles(acc, style)
      },
      { sources: {}, layers: [] }
    )
    return styles
  }
)

const getHighlightedTrackStyles = createSelector(
  [getHighlightTemporalExtent, getGeojsonTracksReady],
  (highlightTemporalExtent, tracks) => {
    const hasTemporalExtent = highlightTemporalExtent && highlightTemporalExtent.length > 0
    const hasTracks = tracks && tracks.length > 0
    if (!hasTemporalExtent || !hasTracks) return null

    const timerange = {
      start: highlightTemporalExtent[0].getTime(),
      end: highlightTemporalExtent[1].getTime(),
    }
    const styles = tracks.reduce(
      (acc, track) => {
        if (!track.data) return acc

        const source = `${track.id}HighlightedTrack`
        const style = {
          sources: {
            [source]: {
              type: 'geojson',
              data: filterGeojsonByTimerange(track.data, timerange),
            },
          },
          layers: [
            {
              id: `${track.id}HighlightedLines`,
              source,
              type: 'line',
              paint: {
                'line-width': 1,
                'line-color': '#fff',
              },
            },
          ],
        }
        return mergeStyles(acc, style)
      },
      { sources: {}, layers: [] }
    )
    return styles
  }
)

export const getTracksStyles = createSelector(
  [getFullTracksStyles, getHighlightedTrackStyles],
  (trackStyles, highlightedTrackStyles) => {
    if (!highlightedTrackStyles) return trackStyles
    return mergeStyles(trackStyles, highlightedTrackStyles)
  }
)
