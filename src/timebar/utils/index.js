import dayjs from 'dayjs'
import { getDefaultFormat } from './internal-utils'

export const getHumanizedDates = (start, end) => {
  const format = getDefaultFormat(start, end)
  const mStart = dayjs(start)
  const mEnd = dayjs(end)
  const humanizedStart = mStart.format(format)
  const humanizedEnd = mEnd.format(format)
  const interval = mEnd.diff(mStart, 'day')
  return { humanizedStart, humanizedEnd, interval }
}

const getTimebarRangeAuto = (auto) => {
  const ONE_DAY = 24 * 60 * 60 * 1000
  const daysEndInnerOuterFromToday = auto.daysEndInnerOuterFromToday || 4
  const daysInnerExtent = auto.daysInnerExtent || 30
  // today - n days
  const now = new Date()
  // Minus the timezone offset to normalize dates
  const end = now.getTime() - now.getTimezoneOffset() * 60000 - daysEndInnerOuterFromToday * ONE_DAY
  // inner should be 30 days long
  const start = end - daysInnerExtent * ONE_DAY
  // start outer at beginning of year
  return { start, end }
}

const getTimebarRangeDefault = (range) => {
  return {
    start: range.innerExtent[0],
    end: range.innerExtent[1],
  }
}

export const getTimebarRangeByWorkspace = (timeline) => {
  return timeline.auto !== undefined
    ? getTimebarRangeAuto(timeline.auto)
    : getTimebarRangeDefault(timeline)
}

export const geoJSONTrackToTimebarTrack = (geoJSONTrack) => {
  const segments = geoJSONTrack.features
    .filter((feature) => feature.properties.type === 'track')
    .map((feature) => {
      const times = feature.properties.coordinateProperties.times
      return {
        start: times[0],
        end: times[times.length - 1],
      }
    })
  let points = []
  geoJSONTrack.features
    .filter((feature) => feature.properties.type === 'fishing')
    .forEach((feature) => {
      const times = feature.properties.coordinateProperties.times
      points = [...points, ...times]
    })

  return {
    segments,
    points,
  }
}

export const geoJSONTrackToTimebarFeatureSegments = (geoJSONTrack) => {
  const graph = []
  geoJSONTrack.features
    .filter((feature) => feature.properties.type === 'track')
    .forEach((feature) => {
      const coordProps = feature.properties.coordinateProperties
      const featureKeys = Object.keys(coordProps)
      const segment = []
      coordProps.times.forEach((time, i) => {
        const point = {
          date: time,
        }
        featureKeys.forEach((key) => {
          point[key] = coordProps[key][i]
        })
        segment.push(point)
      })
      graph.push(segment)
    })
  return graph
}
