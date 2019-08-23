import React, { useContext } from 'react'
import PropTypes from 'prop-types'
import ImmediateContext from '../immediateContext'
import styles from './tracks.module.css'

const SegmentType = PropTypes.shape({
  start: PropTypes.number,
  end: PropTypes.number,
})
const TrackType = PropTypes.shape({
  color: PropTypes.string,
  segments: PropTypes.arrayOf(SegmentType),
  points: PropTypes.arrayOf(PropTypes.number),
})

const Segments = ({ segments, color, outerScale, y }) => {
  return segments.map((segment, i) => (
    <div
      key={i}
      className={styles.segment}
      style={{
        backgroundColor: color,
        left: outerScale(segment.start),
        top: y,
        width: outerScale(segment.end) - outerScale(segment.start),
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
const Points = ({ points, color, outerScale, y }) => {
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

const Tracks = ({ tracks, outerScale, graphHeight }) => {
  const { immediate } = useContext(ImmediateContext)
  if (tracks === null || tracks === undefined) return null
  return tracks.map((track, i) => (
    <div key={i}>
      <Segments
        segments={track.segments}
        color={track.color}
        outerScale={outerScale}
        y={-10 + graphHeight / 2}
      />
      <Points
        points={track.points}
        color={track.color}
        outerScale={outerScale}
        y={-10 + graphHeight / 2}
      />
    </div>
  ))
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
