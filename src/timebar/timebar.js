import React, { Component } from 'react'
import dayjs from 'dayjs'
import PropTypes from 'prop-types'
import cx from 'classnames'
import ImmediateContext from './immediateContext'
import {
  getTime,
  clampToAbsoluteBoundaries,
  getDeltaDays,
  isMoreThanADay,
  getHumanizedDates,
} from './utils'
import './timebar-settings.module.css'
import styles from './timebar.module.css'
import TimeRangeSelector from './components/timerange-selector'
import Timeline from './components/timeline'
import { ReactComponent as IconLoop } from './icons/loop.svg'
import { ReactComponent as IconBack } from './icons/back.svg'
import { ReactComponent as IconPlay } from './icons/play.svg'
import { ReactComponent as IconPause } from './icons/pause.svg'
import { ReactComponent as IconForward } from './icons/forward.svg'
import { ReactComponent as IconTimeRange } from './icons/timeRange.svg'
import { ReactComponent as IconBookmark } from './icons/bookmark.svg'
import { ReactComponent as IconBookmarkFilled } from './icons/bookmarkFilled.svg'
import { ReactComponent as IconMinus } from './icons/minus.svg'
import { ReactComponent as IconPlus } from './icons/plus.svg'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const ONE_DAY_MS = 1000 * 60 * 60 * 24
const SPEED_STEPS = [1, 2, 3, 5, 10]

class Timebar extends Component {
  constructor() {
    super()
    const toggleImmediate = (immediate) => {
      this.setState((state) => ({
        immediate,
      }))
    }
    this.interval = null
    this.state = {
      immediate: false,
      toggleImmediate,
      playback: {
        playing: false,
        speedStep: 0,
        loop: false,
      },
      showTimeRangeSelector: false,
      absoluteEnd: null,
    }
  }

  componentDidMount() {
    const { start, end } = this.props

    // TODO stick to day/hour here too
    this.notifyChange(start, end)
  }

  componentWillUnmount() {
    this.clearInterval()
  }

  componentDidCatch() {
    this.clearInterval()
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

  onPlayClick = () => {
    const { playing } = this.state.playback
    this.setPlaybackConfig('playing', !playing)
    if (playing) {
      this.clearInterval()
    } else {
      this.setInterval()
    }
  }

  setInterval = () => {
    const speed = SPEED_STEPS[this.state.playback.speedStep]
    this.interval = setInterval(() => {
      const newStart = dayjs(this.props.start).add(1, 'day')
      const newEnd = newStart.add(30, 'day')
      this.notifyChange(newStart.toISOString(), newEnd.toISOString())
    }, 1000 / speed)
  }

  clearInterval = () => {
    if (this.interval !== null) {
      clearInterval(this.interval)
    }
  }

  toggleLoop = () => {
    this.setState((prevState) => ({
      playback: {
        ...prevState.playback,
        loop: !prevState.playback.loop,
      },
    }))
  }

  onForwardClick = () => {
    console.log('TODO: go forward in timeline')
  }

  onBackwardClick = () => {
    console.log('TODO: go backward in timeline')
  }

  onSpeedClick = () => {
    const { playback } = this.state
    const nextStep = playback.speedStep === SPEED_STEPS.length - 1 ? 0 : (playback.speedStep += 1)
    this.setPlaybackConfig('speedStep', nextStep)
    if (playback.playing) {
      this.clearInterval()
      this.setInterval()
    }
  }

  setPlaybackConfig = (prop, step) => {
    this.setState({
      playback: {
        ...this.state.playback,
        [prop]: step,
      },
    })
  }

  render() {
    const { start, end, absoluteStart, bookmarkStart, bookmarkEnd, enablePlayback } = this.props
    const { playback, immediate, toggleImmediate } = this.state

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
      <ImmediateContext.Provider value={{ immediate, toggleImmediate }}>
        <div className={styles.Timebar}>
          {enablePlayback && (
            <div
              className={cx(styles.playbackActions, {
                [styles.playbackActionsActive]: playback.playing,
              })}
            >
              <button
                type="button"
                title="Toggle animation looping"
                onClick={this.toggleLoop}
                className={cx(styles.uiButton, styles.secondary, styles.loop, {
                  [styles.secondaryActive]: playback.loop,
                })}
              >
                <IconLoop />
              </button>
              <button
                type="button"
                title="Move back"
                onClick={this.onBackwardClick}
                className={cx(styles.uiButton, styles.secondary, styles.back)}
              >
                <IconBack />
              </button>
              <button
                type="button"
                title={`${playback.playing === true ? 'Pause' : 'Play'} animation`}
                onClick={this.onPlayClick}
                className={cx(styles.uiButton, styles.play)}
              >
                {playback.playing === true ? <IconPause /> : <IconPlay />}
              </button>
              <button
                type="button"
                title="Move forward"
                onClick={this.onForwardClick}
                className={cx(styles.uiButton, styles.secondary, styles.forward)}
              >
                <IconForward />
              </button>
              <button
                type="button"
                title="Change animation speed"
                onClick={this.onSpeedClick}
                className={cx(styles.uiButton, styles.secondary, styles.speed)}
              >
                {SPEED_STEPS[playback.speedStep]}x
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
                className={cx(styles.uiButton, styles.timeRange)}
                onClick={this.toggleTimeRangeSelector}
              >
                <IconTimeRange />
              </button>
            </div>
            <button
              type="button"
              title="Bookmark current time range"
              className={cx(styles.uiButton, styles.bookmark)}
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
                className={cx(styles.uiButton, styles.out)}
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
                className={cx(styles.uiButton, styles.in)}
              >
                <IconPlus />
              </button>
            </div>
          </div>

          <Timeline {...this.props} onChange={this.notifyChange} absoluteEnd={absoluteEnd} />
        </div>
      </ImmediateContext.Provider>
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
  bookmarkStart: null,
  bookmarkEnd: null,
  enablePlayback: false,
  onBookmarkChange: () => {},
}

export default Timebar
