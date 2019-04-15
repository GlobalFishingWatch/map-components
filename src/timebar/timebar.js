import React, { Component } from 'react'
import dayjs from 'dayjs'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import {
  getTime,
  clampToAbsoluteBoundaries,
  getDeltaDays,
  isMoreThanADay,
  getHumanizedDates,
} from './utils'
import styles from './timebar.module.css'
import TimeRangeSelector from './components/timerange-selector'
import Timeline from './components/timeline'
import { ReactComponent as IconLoop } from './icons/loop.svg'
import { ReactComponent as IconBack } from './icons/back.svg'
import { ReactComponent as IconPlay } from './icons/play.svg'
import { ReactComponent as IconForward } from './icons/forward.svg'
import { ReactComponent as IconTimeRange } from './icons/timeRange.svg'
import { ReactComponent as IconBookmark } from './icons/bookmark.svg'
import { ReactComponent as IconBookmarkFilled } from './icons/bookmarkFilled.svg'
import { ReactComponent as IconMinus } from './icons/minus.svg'
import { ReactComponent as IconPlus } from './icons/plus.svg'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const ONE_DAY_MS = 1000 * 60 * 60 * 24

class Timebar extends Component {
  constructor() {
    super()
    this.state = {
      showTimeRangeSelector: false,
      absoluteEnd: null,
    }
  }

  componentDidMount() {
    const { start, end } = this.props

    // TODO stick to day/hour here too
    this.notifyChange(start, end)
  }

  static getDerivedStateFromProps(props) {
    // let absolute end run through the end of the day
    const absoluteEnd = dayjs(props.absoluteEnd)
      .endOf('day')
      .toISOString()
    return {
      absoluteEnd,
    }
  }

  toggleTimeRangeSelector = () => {
    this.setState((prevState) => ({
      showTimeRangeSelector: !prevState.showTimeRangeSelector,
    }))
  }

  setBookmark = () => {
    const { start, end, onBookmarkChange } = this.props
    onBookmarkChange !== null && onBookmarkChange(start, end)
  }

  onTimeRangeSelectorSubmit = (start, end) => {
    this.notifyChange(start, end)
    this.setState({
      showTimeRangeSelector: false,
    })
  }

  zoom = (zoom) => {
    const { start, end, absoluteStart, absoluteEnd } = this.props
    const delta = Math.round(getDeltaDays(start, end))

    let steps
    let nextDelta
    let nextUnit = 'day'

    if (zoom === 'in') {
      steps = [365, 32, 30, 7, 1]
      for (let s = 0; s < steps.length; s += 1) {
        const step = steps[s]
        if (delta > step) {
          nextDelta = step
          break
        }
      }
      // sub-day situation
      if (nextDelta === undefined) {
        nextDelta = 23.9
        nextUnit = 'hour'
      }
    } else if (zoom === 'out') {
      steps = [1, 7, 30, 32, 365]
      for (let s = 0; s < steps.length; s += 1) {
        const step = steps[s]
        // if (delta > step) {
        if (delta < step) {
          nextDelta = step
          break
        }
      }

      // more than 1 year situation
      if (nextDelta === undefined) {
        this.notifyChange(absoluteStart, absoluteEnd)
        return
      }
    }

    const unitOffsetMs = nextUnit === 'hour' ? ONE_DAY_MS / 24 : ONE_DAY_MS
    const middleMs = getTime(start) + (getTime(end) - getTime(start)) / 2
    const offsetMs = (nextDelta * unitOffsetMs) / 2
    const newStartMs = middleMs - offsetMs
    const mNewStart = dayjs(newStartMs).startOf(nextUnit)
    const newEnd = mNewStart.add(nextDelta, nextUnit).toISOString()

    const deltaMs = nextDelta * unitOffsetMs
    const { newStartClamped, newEndClamped } = clampToAbsoluteBoundaries(
      mNewStart.toISOString(),
      newEnd,
      deltaMs,
      absoluteStart,
      absoluteEnd
    )

    this.notifyChange(newStartClamped, newEndClamped)
  }

  notifyChange = (start, end) => {
    const { onChange } = this.props
    const { humanizedStart, humanizedEnd } = getHumanizedDates(start, end)
    onChange(start, end, humanizedStart, humanizedEnd)
  }

  render() {
    const { start, end, absoluteStart, bookmarkStart, bookmarkEnd, enablePlayback } = this.props

    // state.absoluteEnd overrides the value set in props.absoluteEnd - see getDerivedStateFromProps
    const { showTimeRangeSelector, absoluteEnd } = this.state

    const canZoomIn = isMoreThanADay(start, end)
    const deltaDays = getDeltaDays(start, end)
    const absoluteDeltaDays = getDeltaDays(absoluteStart, absoluteEnd)
    const canZoomOut = deltaDays <= absoluteDeltaDays - 1

    const hasBookmark =
      bookmarkStart !== undefined &&
      bookmarkStart !== null &&
      bookmarkEnd !== undefined &&
      bookmarkEnd !== null
    const bookmarkDisabled =
      hasBookmark &&
      getTime(bookmarkStart) === getTime(start) &&
      getTime(bookmarkEnd) === getTime(end)

    return (
      <div className={styles.Timebar}>
        {enablePlayback && (
          <div className={styles.playbackActions}>
            <button
              type="button"
              title="Toggle animation looping"
              className={classNames(styles.uiButton, styles.secondary, styles.loop)}
            >
              <IconLoop />
            </button>
            <button
              type="button"
              title="Move back"
              className={classNames(styles.uiButton, styles.secondary, styles.back)}
            >
              <IconBack />
            </button>
            <button
              type="button"
              title="Play animation"
              className={classNames(styles.uiButton, styles.play)}
            >
              <IconPlay />
            </button>
            <button
              type="button"
              title="Move forward"
              className={classNames(styles.uiButton, styles.secondary, styles.forward)}
            >
              <IconForward />
            </button>
            <button
              type="button"
              title="Change animation speed"
              className={classNames(styles.uiButton, styles.secondary, styles.speed)}
            >
              1x
            </button>
          </div>
        )}

        <div className={styles.timeActions}>
          {showTimeRangeSelector && (
            <TimeRangeSelector
              {...this.props}
              absoluteEnd={absoluteEnd}
              onSubmit={this.onTimeRangeSelectorSubmit}
              onDiscard={this.toggleTimeRangeSelector}
            />
          )}
          <div className={styles.timeRangeContainer}>
            <button
              type="button"
              title="Select a time range"
              className={classNames(styles.uiButton, styles.timeRange)}
              onClick={this.toggleTimeRangeSelector}
            >
              <IconTimeRange />
            </button>
          </div>
          <button
            type="button"
            title="Bookmark current time range"
            className={classNames(styles.uiButton, styles.bookmark)}
            onClick={this.setBookmark}
            disabled={bookmarkDisabled === true}
          >
            {hasBookmark ? <IconBookmarkFilled /> : <IconBookmark />}
          </button>
          <div className={styles.timeScale}>
            <button
              type="button"
              title="Zoom out"
              disabled={canZoomOut === false}
              onClick={() => {
                this.zoom('out')
              }}
              className={classNames(styles.uiButton, styles.out)}
            >
              <IconMinus />
            </button>
            <button
              type="button"
              title="Zoom in"
              disabled={canZoomIn === false}
              onClick={() => {
                this.zoom('in')
              }}
              className={classNames(styles.uiButton, styles.in)}
            >
              <IconPlus />
            </button>
          </div>
        </div>

        <Timeline {...this.props} onChange={this.notifyChange} absoluteEnd={absoluteEnd} />
      </div>
    )
  }
}

Timebar.propTypes = {
  start: PropTypes.string.isRequired,
  end: PropTypes.string.isRequired,
  bookmarkStart: PropTypes.string,
  bookmarkEnd: PropTypes.string,
  onBookmarkChange: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  absoluteStart: PropTypes.string.isRequired,
  absoluteEnd: PropTypes.string.isRequired,
  enablePlayback: PropTypes.bool,
}

Timebar.defaultProps = {
  enablePlayback: false,
  bookmarkStart: null,
  bookmarkEnd: null,
  onBookmarkChange: null,
}

export default Timebar
