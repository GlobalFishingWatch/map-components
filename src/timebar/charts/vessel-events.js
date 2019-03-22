import React, { Component, Fragment } from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import memoize from 'memoize-one'
import classNames from 'classnames'
import dayjs from 'dayjs'
import styles from './vessel-events.module.css'
import { ReactComponent as IconEncounter } from '../icons/events/encounter.svg'
import { ReactComponent as IconUnregistered } from '../icons/events/unregistered.svg'
import { ReactComponent as IconGap } from '../icons/events/gap.svg'
import { ReactComponent as IconPort } from '../icons/events/port.svg'

const ICONS = {
  encounter: <IconEncounter />,
  unregistered: <IconUnregistered />,
  gap: <IconGap />,
  port: <IconPort />,
  fishing: null,
}

const Layer = (props) => {
  const { outerScale, events, y, className, children } = props
  return (
    <g transform={`translate(0, ${y})`} className={className}>
      {events.map((event) => {
        const height = event.isThick ? 8 : 6
        const x1 = outerScale(event.start)
        const x2 = event.end === null ? x1 : outerScale(event.end)
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
  getEvents = memoize((events) => {
    return events.map((event) => ({
      ...event,
      isThick: ['encounter', 'gap'].indexOf(event.type) > -1,
      start: new Date(event.start),
      end: event.end === null ? null : new Date(event.end),
    }))
  })

  addHighlightInfo = memoize((events, highlightedEventIDs) => {
    const eventsWithHighlight = events.map((event) => ({
      ...event,
      isHighlighted: highlightedEventIDs !== null && highlightedEventIDs.indexOf(event.id) > -1,
    }))

    const highlighted = [
      ...eventsWithHighlight.filter((event) => event.isHighlighted === false),
      ...eventsWithHighlight.filter((event) => event.isHighlighted === true),
    ]

    return highlighted
  })

  filterEvents = memoize((events, outerStart, outerEnd) => {
    let filteredEvents = events

    if (dayjs(outerEnd).diff(dayjs(outerStart), 'day') > 300) {
      filteredEvents = events.filter((event) => event.type !== 'fishing')
    }

    return filteredEvents
  })

  getBackgrounds = memoize((events) =>
    events.filter((event) => event.end !== null).filter((event) => event.type === 'port')
  )

  getLines = memoize((events) => {
    let newEvents = events
      .filter((event) => event.end !== null)
      .filter((event) => ['port', 'track'].includes(event.type))

    // port events have a secondary background line
    newEvents
      .filter((e) => e.type === 'port')
      .forEach((event) => {
        newEvents.push({ ...event, type: 'portBg', id: `${event.id}-bg` })
      })

    newEvents = newEvents.map((event) => ({
      ...event,
      order: ['track', 'portBg', 'port'].indexOf(event.type),
    }))

    newEvents.sort((a, b) => a.order - b.order)

    return newEvents
  })

  getOverlays = memoize((events) => {
    const overlays = []
    events
      .filter((event) => ['port', 'encounter', 'gap'].includes(event.type))
      .forEach((event) => {
        const newEvent = { ...event }
        if (event.type === 'port') {
          if (event.end === null) {
            newEvent.interactive = true
          } else {
            // put another point at event end
            overlays.push({
              ...newEvent,
              start: newEvent.end,
              uid: `${newEvent.id}-end}`,
            })
            newEvent.end = newEvent.start
          }
        }
        overlays.push(newEvent)
      })
    return overlays
  })

  renderTooltip(events) {
    const { highlightedEventIDs, outerScale } = this.props
    if (highlightedEventIDs === null || highlightedEventIDs.length !== 1) {
      return null
    }
    const highlightedEvent = events.find((event) => event.id === highlightedEventIDs[0])
    if (highlightedEvent === undefined) {
      return null
    }

    const left = outerScale(highlightedEvent.start)
    const width =
      highlightedEvent.end === null || highlightedEvent === undefined
        ? 0
        : outerScale(highlightedEvent.end) - left
    const center = left + width / 2

    let title = {
      port: 'Docked',
      encounter: 'Had an encounter with {value}',
      gap: 'Failed to register ??? reports',
      fishing: 'Fished',
    }[highlightedEvent.type]

    if (highlightedEvent.type === 'encounter') {
      title = title.replace(
        '{value}',
        [highlightedEvent.encounteredVessel.slice(0, 15), '...'].join('')
      )
    }

    return (
      <div
        className={classNames(styles.tooltip, styles[highlightedEvent.type])}
        style={{ left: center }}
        key="tooltip"
      >
        {ICONS[highlightedEvent.type]}
        <div className={styles.tooltipText}>
          <div className={styles.tooltipDate}>
            {dayjs(highlightedEvent.start).format('MMM D YYYY')}
          </div>
          {title}
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
      tooltipContainer,
    } = this.props

    const preparedEvents = this.addHighlightInfo(this.getEvents(events), highlightedEventIDs)
    const filteredEvents = this.filterEvents(preparedEvents, outerStart, outerEnd)
    const backgrounds = this.getBackgrounds(filteredEvents)
    const lines = this.getLines(filteredEvents)
    const overlays = this.getOverlays(filteredEvents)
    const y = 5 + graphHeight / 2
    const tooltip = this.renderTooltip(filteredEvents)

    return (
      <Fragment>
        <svg width={outerWidth} height={graphHeight} className={styles.Events} key="svg">
          <Layer {...this.props} events={backgrounds} className={styles.backgrounds} y={0}>
            {(props) => (
              <g
                key={props.event.id}
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
            {(props) => (
              <line
                key={props.event.id}
                className={styles[props.event.type]}
                y={0}
                x1={props.style.x1}
                x2={props.style.x2}
              />
            )}
          </Layer>
          <Layer {...this.props} events={overlays} className={styles.overlays} y={y}>
            {(props) => (
              <g
                className={classNames(styles[props.event.type], {
                  [styles._highlighted]: props.event.isHighlighted,
                })}
                key={props.event.uid || props.event.id}
                onMouseEnter={() => onEventHighlighted(props.event)}
                onMouseLeave={() => onEventHighlighted()}
              >
                <rect
                  x={props.style.x1}
                  y={-props.height / 2}
                  width={props.style.width}
                  height={props.height}
                  rx={props.height / 2}
                  ry={props.height / 2}
                  fillOpacity={props.style.fillOpacity}
                />
              </g>
            )}
          </Layer>
        </svg>
        {tooltipContainer && ReactDOM.createPortal(tooltip, tooltipContainer)}
      </Fragment>
    )
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
  tooltipContainer: PropTypes.instanceOf(Element),
}

VesselEvents.defaultProps = {
  highlightedEventIDs: null,
}

export default VesselEvents
