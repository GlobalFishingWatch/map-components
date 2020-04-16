import React, { useContext, useMemo } from 'react'
import PropTypes from 'prop-types'
import ImmediateContext from '../immediateContext'
import styles from './tracks.module.css'
import { DEFAULT_CSS_TRANSITION } from '../constants'
import { geoJSONTrackToTimebarTrack } from '../utils'
import { getTrackY } from './utils'

const SegmentType = PropTypes.shape({
  start: PropTypes.number,
  end: PropTypes.number,
})
const TrackType = PropTypes.shape({
  color: PropTypes.string,
  segments: PropTypes.arrayOf(SegmentType),
  points: PropTypes.arrayOf(PropTypes.number),
})

const Segments = ({ segments, color, immediate, y }) => {
  return segments.map((segment) => (
    <div
      key={segment.id}
      className={styles.segment}
      style={{
        backgroundColor: color,
        top: y,
        left: segment.x,
        width: segment.width,
        transition: immediate
          ? 'none'
          : `left ${DEFAULT_CSS_TRANSITION}, width ${DEFAULT_CSS_TRANSITION}`,
      }}
    />
  ))
}
Segments.propTypes = {
  segments: PropTypes.arrayOf(SegmentType).isRequired,
  color: PropTypes.string,
  y: PropTypes.number.isRequired,
}
Segments.defaultProps = {
  color: 'var(--timebar-track-default)',
}

const POINT_SIZE = 5
const Points = ({ points, color, immediate, y }) => {
  return points.map((point) => (
    <div
      key={point.id}
      className={styles.point}
      style={{
        backgroundColor: color,
        left: point.x - POINT_SIZE / 2,
        top: y - POINT_SIZE / 2,
        width: point.width + POINT_SIZE,
        height: POINT_SIZE,
        transition: immediate ? 'none' : `left ${DEFAULT_CSS_TRANSITION}`,
      }}
    />
  ))
}
Points.propTypes = {
  points: PropTypes.arrayOf(PropTypes.object).isRequired,
  color: PropTypes.string,
  y: PropTypes.number.isRequired,
}
Points.defaultProps = {
  color: 'var(--timebar-track-default)',
}

const geoJSONTrackToTimebarTracks = (tracks) => {
  return tracks.map((track) => geoJSONTrackToTimebarTrack(track))
}

const getCoords = (tracks, outerScale) => {
  if (tracks === null) return null
  const coordTracks = []
  tracks.forEach((track) => {
    const coordTrack = {
      color: track.color,
    }
    coordTrack.segments = track.segments.map((segment, i) => {
      const x = outerScale(segment.start)
      return {
        id: i,
        x,
        width: outerScale(segment.end) - x,
      }
    })
    coordTrack.points = track.points.map((point, i) => ({
      id: i,
      x: outerScale(point),
      width: 0,
    }))
    coordTracks.push(coordTrack)
  })
  return coordTracks
}

// creates cluster with fishing points to avoid generating too many DOM
const getClusteredTrackCoords = (tracks) => {
  if (tracks === null) return null
  return tracks.map((track, i) => {
    const simplifiedPoints = []

    let currentCluster
    track.points.forEach((point, i) => {
      const prevPoint = i === 0 ? { x: Number.NEGATIVE_INFINITY } : track.points[i - 1]
      if (point.x - prevPoint.x > POINT_SIZE) {
        // if delta > 5 start a new cluster
        currentCluster = { ...point }

        // store previously created cluster
        if (currentCluster) {
          simplifiedPoints.push(currentCluster)
        }
      } else {
        // else modify current cluster
        currentCluster.width = point.x - currentCluster.x
      }
    })

    return {
      ...track,
      points: simplifiedPoints,
    }
  })
}

const Tracks = ({ tracks, outerScale, graphHeight }) => {
  const { immediate } = useContext(ImmediateContext)
  const timebarTracks = useMemo(() => geoJSONTrackToTimebarTracks(tracks), [tracks])
  const trackCoords = useMemo(() => getCoords(timebarTracks, outerScale), [
    timebarTracks,
    outerScale,
  ])
  const clusteredTrackCoords = useMemo(() => getClusteredTrackCoords(trackCoords), [trackCoords])

  if (tracks === null || tracks === undefined) return null

  return clusteredTrackCoords.map((track, i) => {
    const y = getTrackY(tracks.length, i, graphHeight)
    return (
      <div key={i}>
        <Segments segments={track.segments} color={track.color} immediate={immediate} y={y} />
        <Points points={track.points} color={track.color} immediate={immediate} y={y} />
      </div>
    )
  })
}

Tracks.propTypes = {
  tracks: PropTypes.arrayOf(TrackType).isRequired,
  outerScale: PropTypes.func.isRequired,
  graphHeight: PropTypes.number.isRequired,
}

Tracks.defaultProps = {
  tracks: null,
}

export default Tracks
