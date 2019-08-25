import React, { useContext } from 'react'
import PropTypes from 'prop-types'
import ImmediateContext from '../immediateContext'
import styles from './tracks.module.css'
import { DEFAULT_CSS_TRANSITION } from '../constants'

const SegmentType = PropTypes.shape({
  start: PropTypes.number,
  end: PropTypes.number,
})
const TrackType = PropTypes.shape({
  color: PropTypes.string,
  segments: PropTypes.arrayOf(SegmentType),
  points: PropTypes.arrayOf(PropTypes.number),
})

const Segments = ({ segments, color, outerScale, immediate, y }) => {
  return segments.map((segment, i) => (
    <div
      key={i}
      className={styles.segment}
      style={{
        backgroundColor: color,
        top: y,
        left: outerScale(segment.start),
        width: outerScale(segment.end) - outerScale(segment.start),
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
  outerScale: PropTypes.func.isRequired,
}
Segments.defaultProps = {
  color: 'var(--timebar-track-default)',
}

const POINT_SIZE = 5
const Points = ({ points, color, outerScale, immediate, y }) => {
  return points.map((point, i) => (
    <div
      key={i}
      className={styles.point}
      style={{
        backgroundColor: color,
        left: outerScale(point) - POINT_SIZE / 2,
        top: y - POINT_SIZE / 2,
        width: POINT_SIZE,
        height: POINT_SIZE,
        transition: immediate ? 'none' : `left ${DEFAULT_CSS_TRANSITION}`,
      }}
    />
  ))
}
Points.propTypes = {
  points: PropTypes.arrayOf(PropTypes.number).isRequired,
  color: PropTypes.string,
  y: PropTypes.number.isRequired,
  outerScale: PropTypes.func.isRequired,
}
Points.defaultProps = {
  color: 'var(--timebar-track-default)',
}

const Y_TRACK_SPACE = 14
const Tracks = ({ tracks, outerScale, graphHeight }) => {
  const { immediate } = useContext(ImmediateContext)
  if (tracks === null || tracks === undefined) return null

  const totalHeightOffset = ((tracks.length - 1) * Y_TRACK_SPACE) / 2
  const startY = -8 + graphHeight / 2

  return tracks.map((track, i) => {
    const y = startY + i * Y_TRACK_SPACE - totalHeightOffset
    return (
      <div key={i}>
        <Segments
          segments={track.segments}
          color={track.color}
          outerScale={outerScale}
          immediate={immediate}
          y={y}
        />
        <Points
          points={track.points}
          color={track.color}
          outerScale={outerScale}
          immediate={immediate}
          y={y}
        />
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
