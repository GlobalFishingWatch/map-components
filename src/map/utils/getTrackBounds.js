import tbbox from '@turf/bbox'

export const getTrackTimeBounds = (geojson) => {
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
  return [time.start, time.end]
}

export const getTrackBounds = (geojson) => {
  const bounds = tbbox(geojson)
  return {
    minLat: bounds[3],
    minLng: bounds[0],
    maxLat: bounds[1],
    maxLng: bounds[2],
  }
}
