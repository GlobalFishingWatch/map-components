import React, { useContext, useMemo } from 'react'
import PropTypes from 'prop-types'
import styles from './tracks-events.module.css'
import { getTrackY } from './utils'
import { DEFAULT_CSS_TRANSITION } from '../constants'
import ImmediateContext from '../immediateContext'

const getCoordinates = (tracksEvents, outerScale) => {
  return tracksEvents.map((trackEvents) => {
    return trackEvents.map((event) => {
      const height = 8
      const x1 = outerScale(event.start)
      const x2 = event.end === null ? x1 : outerScale(event.end)
      const width = Math.max(height, x2 - x1)
      return {
        ...event,
        x1,
        x2,
        width,
        height,
      }
    })
  })
}

const TracksEvents = ({ tracksEvents, outerWidth, graphHeight, outerScale }) => {
  const { immediate } = useContext(ImmediateContext)
  const tracksEventsWithCoordinates = useMemo(() => getCoordinates(tracksEvents, outerScale), [
    tracksEvents,
    outerScale,
  ])
  return (
    <div width={outerWidth} height={graphHeight} className={styles.Events}>
      {tracksEventsWithCoordinates.map((trackEvents, index) => (
        <div
          key={index}
          className={styles.track}
          style={{
            top: `${getTrackY(tracksEvents.length, index, graphHeight)}px`,
          }}
        >
          {trackEvents.map((event) => (
            <div
              key={event.id}
              className={styles.event}
              data-type={event.type}
              style={{
                background: event.color || 'white',
                left: `${event.x1}px`,
                top: `${-event.height / 2}px`,
                width: `${event.width}px`,
                height: `${event.height}px`,
                transition: immediate
                  ? 'none'
                  : `left ${DEFAULT_CSS_TRANSITION}, width ${DEFAULT_CSS_TRANSITION}`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

TracksEvents.propTypes = {
  tracksEvents: PropTypes.arrayOf(
    PropTypes.arrayOf(
      PropTypes.shape({
        start: PropTypes.number,
        end: PropTypes.number,
        id: PropTypes.string,
        type: PropTypes.string,
      })
    )
  ).isRequired,
  outerScale: PropTypes.func.isRequired,
  outerWidth: PropTypes.number.isRequired,
  graphHeight: PropTypes.number.isRequired,
}

export default TracksEvents
