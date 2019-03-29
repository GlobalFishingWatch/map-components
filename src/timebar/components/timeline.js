import React, { Component } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { scaleTime } from 'd3-scale'
import dayjs from 'dayjs'
import throttle from 'lodash/throttle'
import { animated, Spring } from 'react-spring'
import {
  getTime,
  clampToAbsoluteBoundaries,
  getDeltaMs,
  isMoreThanADay,
  stickToClosestUnit,
} from '../utils'
import Bookmark from './bookmark'
import TimelineUnits from './timeline-units'
import Handler from './timeline-handler'
import styles from './timeline.module.css'

const DRAG_INNER = 'DRAG_INNER'
const DRAG_START = 'DRAG_START'
const DRAG_END = 'DRAG_END'

class Timeline extends Component {
  constructor() {
    super()
    this.state = {
      innerStartPx: 0,
      innerEndPx: 0,
      innerWidth: 50,
      outerWidth: 100,
      outerHeight: 50,
      dragging: null,
    }
    this.isMovingInside = false
  }

  componentDidMount() {
    // wait for end of call stack to get rendered CSS
    window.setTimeout(this.onWindowResize, 1)
    window.addEventListener('resize', this.onWindowResize)
    window.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('touchmove', this.onMouseMove)
    window.addEventListener('mouseup', this.onMouseUp)
    window.addEventListener('touchend', this.onMouseUp)
    this.requestAnimationFrame = window.requestAnimationFrame(this.onEnterFrame)
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onWindowResize)
    window.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('touchmove', this.onMouseMove)
    window.removeEventListener('mouseup', this.onMouseUp)
    window.removeEventListener('touchend', this.onMouseUp)
    window.cancelAnimationFrame(this.requestAnimationFrame)
  }

  onWindowResize = () => {
    const graphStyle = window.getComputedStyle(this.graphContainer)
    const outerX = parseFloat(this.graphContainer.getBoundingClientRect().left)
    const outerWidth = parseFloat(graphStyle.width)
    const outerHeight = parseFloat(graphStyle.height)
    const innerStartPx = outerWidth * 0.15
    const innerEndPx = outerWidth * 0.85
    const innerWidth = outerWidth * 0.7
    this.setState({
      outerX,
      innerStartPx,
      innerEndPx,
      innerWidth,
      outerWidth,
      outerHeight,
    })
  }

  isHandlerZoomInValid(x) {
    const { dragging, innerStartPx, innerEndPx } = this.state
    const isZoomIn =
      (dragging === DRAG_START && x > innerStartPx) || (dragging === DRAG_END && x < innerEndPx)

    // check that start handler doesn't go after end handler or end handler before start handler
    const isValid =
      isZoomIn &&
      ((dragging === DRAG_START && x < innerEndPx - 20) ||
        (dragging === DRAG_END && x > innerStartPx + 20))
    const clampedX =
      dragging === DRAG_START ? Math.min(x, innerEndPx - 20) : Math.max(x, innerStartPx + 20)
    return { isZoomIn, isValid, clampedX }
  }

  isHandlerZoomOutValid(x) {
    const { dragging, innerStartPx, innerEndPx, outerWidth } = this.state
    return (
      (dragging === DRAG_START && x < innerStartPx && x > 0) ||
      (dragging === DRAG_END && x > innerEndPx && x < outerWidth)
    )
  }

  onEnterFrame = (timestamp) => {
    if (this.frameTimestamp === undefined) {
      this.frameTimestamp = timestamp
    }
    const progress = timestamp - this.frameTimestamp
    this.frameTimestamp = timestamp

    if (this.state.outerDrag === true) {
      const { dragging, innerStartPx, innerEndPx, outerWidth, handlerMouseX } = this.state
      const { start, end, absoluteStart, absoluteEnd, onChange } = this.props
      // console.log(progress);
      const deltaPxRatio =
        dragging === DRAG_START
          ? (innerStartPx - handlerMouseX) / innerStartPx
          : (handlerMouseX - innerEndPx) / (outerWidth - innerEndPx)

      const offsetMs =
        (this.innerScale.invert(0.6).getTime() - this.innerScale.invert(0).getTime()) *
        progress *
        deltaPxRatio
      let newStart = start
      let newEnd = end

      if (dragging === DRAG_START) {
        newStart = new Date(getTime(start) - offsetMs).toISOString()
      } else if (dragging === DRAG_END) {
        newEnd = new Date(getTime(end) + offsetMs).toISOString()
      }

      const { newStartClamped, newEndClamped } = clampToAbsoluteBoundaries(
        newStart,
        newEnd,
        getDeltaMs(start, end),
        absoluteStart,
        absoluteEnd
      )
      onChange(newStartClamped, newEndClamped)
    }

    this.requestAnimationFrame = window.requestAnimationFrame(this.onEnterFrame)
  }

  onMouseDown = (event, dragging) => {
    const { outerX } = this.state
    const clientX = event.clientX || event.changedTouches[0].clientX
    this.lastX = clientX
    const x = clientX - outerX
    this.setState({
      dragging,
      handlerMouseX: x,
    })
  }

  throttledMouseMove = throttle((clientX, scale) => {
    this.props.onMouseMove(clientX, scale)
  }, 16)

  onMouseMove = (event) => {
    const { start, end, absoluteStart, absoluteEnd, onChange, onMouseLeave } = this.props
    const { dragging, outerX, innerStartPx, innerEndPx } = this.state
    const clientX = event.clientX || event.changedTouches[0].clientX
    const x = clientX - outerX
    const isMovingInside = this.node.contains(event.target) && x > innerStartPx && x < innerEndPx
    if (isMovingInside) {
      this.isMovingInside = true
      this.throttledMouseMove(x, this.outerScale.invert)
    } else if (this.isMovingInside === true) {
      this.isMovingInside = false
      onMouseLeave()
    }
    if (dragging === DRAG_INNER) {
      const currentDeltaMs = getDeltaMs(start, end)
      // Calculates x movement from last event since TouchEvent doesn't have the movementX property
      const movementX = clientX - this.lastX
      this.lastX = event.clientX || event.changedTouches[0].clientX
      const newStart = this.innerScale.invert(-movementX)
      const newEnd = new Date(newStart.getTime() + currentDeltaMs)
      const { newStartClamped, newEndClamped } = clampToAbsoluteBoundaries(
        newStart.toISOString(),
        newEnd.toISOString(),
        currentDeltaMs,
        absoluteStart,
        absoluteEnd
      )
      onChange(newStartClamped, newEndClamped)
    } else if (this.isHandlerZoomInValid(x).isValid === true) {
      this.setState({
        handlerMouseX: x,
        outerDrag: false,
      })
    } else if (this.isHandlerZoomOutValid(x) === true) {
      this.setState({
        handlerMouseX: x,
        outerDrag: true,
      })
    }
  }

  onMouseUp = (event) => {
    const { start, end, onChange } = this.props
    const { dragging, outerX, innerStartPx } = this.state

    if (dragging === null) {
      return
    }

    const clientX = event.clientX || event.changedTouches[0].clientX
    const x = clientX - outerX

    const isHandlerZoomInValid = this.isHandlerZoomInValid(x)

    this.setState({
      dragging: null,
      handlerMouseX: null,
      outerDrag: false,
    })

    let newStart = start
    let newEnd = end

    if (isHandlerZoomInValid.isZoomIn) {
      if (dragging === DRAG_START) {
        newStart = this.innerScale
          .invert(isHandlerZoomInValid.clampedX - innerStartPx)
          .toISOString()
      } else if (dragging === DRAG_END) {
        newEnd = this.innerScale.invert(isHandlerZoomInValid.clampedX - innerStartPx).toISOString()
      }
    }
    // on release, "stick" to day/hour
    const stickUnit = isMoreThanADay(newStart, newEnd) ? 'day' : 'hour'
    newStart = stickToClosestUnit(newStart, stickUnit)
    newEnd = stickToClosestUnit(newEnd, stickUnit)

    onChange(newStart, newEnd)
  }

  render() {
    const {
      start,
      end,
      absoluteEnd,
      bookmarkStart,
      bookmarkEnd,
      onChange,
      onBookmarkChange,
    } = this.props
    const {
      dragging,
      handlerMouseX,
      innerStartPx,
      innerEndPx,
      innerWidth,
      outerX,
      outerWidth,
      outerHeight,
    } = this.state

    this.innerScale = scaleTime()
      .domain([new Date(start), new Date(end)])
      .range([0, innerWidth])
    const outerStart = this.innerScale.invert(-innerStartPx).toISOString()
    const outerEnd = this.innerScale.invert(outerWidth - innerStartPx).toISOString()

    this.outerScale = scaleTime()
      .domain([new Date(outerStart), new Date(outerEnd)])
      .range([0, this.state.outerWidth])

    const immediate = this.state.dragging !== null

    return (
      <div ref={(node) => (this.node = node)} className={styles.Timeline}>
        {bookmarkStart !== undefined && bookmarkStart !== null && (
          <Bookmark
            scale={this.outerScale}
            bookmarkStart={bookmarkStart}
            bookmarkEnd={bookmarkEnd}
            minX={-outerX}
            maxX={outerWidth}
            immediate={immediate}
            onDelete={() => {
              onBookmarkChange(null, null)
            }}
            onSelect={() => {
              onChange(bookmarkStart, bookmarkEnd)
            }}
          />
        )}
        <div
          className={styles.graphContainer}
          ref={(ref) => {
            this.graphContainer = ref
          }}
        >
          {/* // TODO separated drag area? */}
          <div
            className={styles.graph}
            onMouseDown={(event) => {
              this.onMouseDown(event, DRAG_INNER)
            }}
            onTouchStart={(event) => {
              this.onMouseDown(event, DRAG_INNER)
            }}
          >
            <TimelineUnits
              {...this.props}
              outerScale={this.outerScale}
              outerStart={outerStart}
              outerEnd={outerEnd}
              immediate={immediate}
            />
            {this.props.children &&
              this.props.children({
                outerScale: this.outerScale,
                outerStart,
                outerEnd,
                outerWidth,
                outerHeight,
                immediate,
                graphHeight: outerHeight - 20,
                tooltipContainer: this.tooltipContainer,
                ...this.props,
              })}
          </div>
        </div>
        <div
          ref={(el) => {
            this.tooltipContainer = el
          }}
        />
        <div
          className={classNames(styles.veilLeft, styles.veil, {
            [styles._immediate]: dragging === DRAG_START,
          })}
          style={{
            width: dragging === DRAG_START ? handlerMouseX : innerStartPx,
          }}
        />
        <Handler
          onMouseDown={(event) => {
            this.onMouseDown(event, DRAG_START)
          }}
          onTouchStart={(event) => {
            this.onMouseDown(event, DRAG_START)
          }}
          dragging={this.state.dragging === DRAG_START}
          x={innerStartPx}
          mouseX={this.state.handlerMouseX}
        />
        <Handler
          onMouseDown={(event) => {
            this.onMouseDown(event, DRAG_END)
          }}
          onTouchStart={(event) => {
            this.onMouseDown(event, DRAG_END)
          }}
          dragging={this.state.dragging === DRAG_END}
          x={innerEndPx}
          mouseX={this.state.handlerMouseX}
        />
        <div
          className={classNames(styles.veilRight, styles.veil, {
            [styles._immediate]: dragging === DRAG_END,
          })}
          style={{
            left: dragging === DRAG_END ? handlerMouseX : innerEndPx,
            width: dragging === DRAG_END ? outerWidth - handlerMouseX : outerWidth - innerEndPx,
          }}
        />
        <Spring native immediate={immediate} to={{ left: this.outerScale(new Date(absoluteEnd)) }}>
          {(style) => (
            <animated.div className={styles.absoluteEnd} style={style}>
              <div className={styles.lastUpdateLabel}>Last Update</div>
              <div className={styles.lastUpdate}>{dayjs(absoluteEnd).format('MMMM D YYYY')}</div>
            </animated.div>
          )}
        </Spring>
      </div>
    )
  }
}

Timeline.propTypes = {
  onChange: PropTypes.func.isRequired,
  onMouseLeave: PropTypes.func,
  onMouseMove: PropTypes.func,
  children: PropTypes.func.isRequired,
  start: PropTypes.string.isRequired,
  end: PropTypes.string.isRequired,
  absoluteStart: PropTypes.string.isRequired,
  absoluteEnd: PropTypes.string.isRequired,
  bookmarkStart: PropTypes.string,
  bookmarkEnd: PropTypes.string,
}

Timeline.defaultProps = {
  bookmarkStart: null,
  bookmarkEnd: null,
  onMouseLeave: () => {},
  onMouseMove: () => {},
}

export default Timeline
