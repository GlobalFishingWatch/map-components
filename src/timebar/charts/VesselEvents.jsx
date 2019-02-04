import React, { Component } from 'react'
import PropTypes from 'prop-types'
import memoize from 'memoize-one'
import classNames from 'classnames'
import * as m from 'dayjs'
import { getTime } from '../utils'
import styles from './VesselEvents.css'
import IconEncounter from '../icons/events/encounter.svg'
import IconUnregistered from '../icons/events/unregistered.svg'
import IconGap from '../icons/events/gap.svg'
import IconPort from '../icons/events/port.svg'

const ICONS = {
  encounter: <IconEncounter />,
  unregistered: <IconUnregistered />,
  gap: <IconGap />,
  port: <IconPort />,
  fishing: null,
}

const Layer = props => {
  const { outerScale, events, y, className, children } = props
  return (
    <g transform={`translate(0, ${y})`} className={className}>
      {events.map(event => {
        const x1 = outerScale(event.start)
        const x2 = outerScale(event.end)
        const height = event.isThick ? 8 : 6
        const width = Math.max(height, x2 - x1)

        return children({
          style: {
            x1,
            x2,
            width,
          },
          event,
          height,
        })
      })}
    </g>
  )
}

Layer.propTypes = {
  outerScale: PropTypes.func.isRequired,
  events: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.instanceOf(Date),
      end: PropTypes.instanceOf(Date),
      isThick: PropTypes.bool,
    })
  ).isRequired,
  children: PropTypes.func.isRequired,
  y: PropTypes.number.isRequired,
  className: PropTypes.string.isRequired,
}

class VesselEvents extends Component {
  getEvents = memoize(events =>
    events
      // .filter(event => ['encounter', 'gap', 'fishing'].indexOf(event.type) > -1)
      // .filter(event => event.type !== 'port')
      .map(event => ({
        ...event,
        isThick: ['encounter', 'gap'].indexOf(event.type) > -1,
        start: new Date(event.start),
        end: new Date(event.end),
      }))
  )

  addHighlightInfo = memoize((events, highlightedEventIDs) => {
    const eventsWithHighlight = events.map(event => ({
      ...event,
      isHighlighted: highlightedEventIDs.indexOf(event.id) > -1,
    }))

    const highlighted = [
      ...eventsWithHighlight.filter(event => event.isHighlighted === false),
      ...eventsWithHighlight.filter(event => event.isHighlighted === true),
    ]

    return highlighted
  })

  filterEvents = memoize((events, outerStart, outerEnd) => {
    let filteredEvents = events

    if (m(outerEnd).diff(m(outerStart), 'day') > 300) {
      filteredEvents = events.filter(event => event.type !== 'fishing')
    }

    return filteredEvents
  })

  getBackgrounds = memoize(events => events.filter(event => event.type === 'port'))

  getLines = memoize(events => events.filter(event => event.type === 'port'))

  renderTooltip(events) {
    const { highlightedEventIDs, outerScale } = this.props
    if (highlightedEventIDs.length !== 1) {
      return null
    }
    const highlightedEvent = events.find(event => event.id === highlightedEventIDs[0])
    if (highlightedEvent === undefined) {
      return null
    }

    const left = outerScale(highlightedEvent.start)
    const width = outerScale(highlightedEvent.end) - left
    const center = left + width / 2

    return (
      <div
        className={classNames(styles.tooltip, styles[highlightedEvent.type])}
        style={{ left: center }}
        key="tooltip"
      >
        {ICONS[highlightedEvent.type]}
        <div className={styles.tooltipText}>
          <div className={styles.tooltipDate}>{m(highlightedEvent.start).format('MMM D YYYY')}</div>
          {
            {
              port: 'Docked at ???',
              encounter: 'Had an encounter with ???',
              gap: 'Failed to register ??? reports',
              fishing: 'Fished',
            }[highlightedEvent.type]
          }
        </div>
      </div>
    )
  }

  render() {
    const {
      events,
      highlightedEventIDs,
      outerStart,
      outerEnd,
      outerWidth,
      graphHeight,
      onEventHighlighted,
    } = this.props

    const preparedEvents = this.addHighlightInfo(this.getEvents(events), highlightedEventIDs)
    const filteredEvents = this.filterEvents(preparedEvents, outerStart, outerEnd)
    const backgrounds = this.getBackgrounds(filteredEvents)
    const lines = this.getLines(filteredEvents)
    const overlays = filteredEvents
    const y = 5 + graphHeight / 2

    const tooltip = this.renderTooltip(filteredEvents)

    return [
      <svg width={outerWidth} height={graphHeight} className={styles.Events} key="svg">
        <Layer {...this.props} events={backgrounds} className={styles.backgrounds} y={0}>
          {props => (
            <g
              className={classNames(styles[props.event.type], {
                [styles._highlighted]: props.event.isHighlighted,
              })}
              onMouseEnter={() => onEventHighlighted(props.event)}
              onMouseLeave={() => onEventHighlighted()}
            >
              <rect x={props.style.x1} y={0} width={props.style.width} height={graphHeight} />
            </g>
          )}
        </Layer>
        <Layer {...this.props} events={lines} className={styles.lines} y={y}>
          {props => (
            <line
              className={styles[props.event.type]}
              y={0}
              x1={props.style.x1}
              x2={props.style.x2}
            />
          )}
        </Layer>
        <Layer {...this.props} events={overlays} className={styles.overlays} y={y}>
          {props => (
            <g
              className={classNames(styles[props.event.type], {
                [styles._highlighted]: props.event.isHighlighted,
              })}
              onMouseEnter={() => onEventHighlighted(props.event)}
              onMouseLeave={() => onEventHighlighted()}
            >
              {props.event.type !== 'port' && (
                <rect
                  x={props.style.x1}
                  y={-props.height / 2}
                  width={props.style.width}
                  height={props.height}
                  rx={props.height / 2}
                  ry={props.height / 2}
                  fillOpacity={props.style.fillOpacity}
                />
              )}
              {props.event.type === 'port' && [
                <circle r={3} cx={props.style.x1} />,
                <circle r={3} cx={props.style.x2} />,
              ]}
            </g>
          )}
        </Layer>
      </svg>,
      tooltip,
    ]
  }
}

VesselEvents.propTypes = {
  events: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.string,
      end: PropTypes.string,
      id: PropTypes.string,
      type: PropTypes.string,
    })
  ).isRequired,
  highlightedEventIDs: PropTypes.arrayOf(PropTypes.string),
  outerScale: PropTypes.func.isRequired,
  outerWidth: PropTypes.number.isRequired,
  outerHeight: PropTypes.number.isRequired,
  graphHeight: PropTypes.number.isRequired,
}

VesselEvents.defaultProps = {
  highlightedEventIDs: [],
}

export default VesselEvents
