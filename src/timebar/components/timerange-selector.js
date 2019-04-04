import React, { Component } from 'react'
import PropTypes from 'prop-types'
import dayjs from 'dayjs'
import classNames from 'classnames'
import { getTime } from '../utils'
import DateSelector from './date-selector'
import styles from './timerange-selector.module.css'

const ONE_DAY_MS = 1000 * 60 * 60 * 24 - 1

class TimeRangeSelector extends Component {
  constructor() {
    super()
    this.state = {
      startCanIncrement: true,
      startCanDecrement: true,
      endCanIncrement: true,
      endCanDecrement: true,
    }
  }

  componentDidMount() {
    const { start, end } = this.props
    this.setState({
      start,
      end,
    })
  }

  submit(start, end) {
    const { onSubmit } = this.props

    // on release, "stick" to day/hour
    const newStart = dayjs(start)
      .startOf('day')
      .toISOString()
    const newEnd = dayjs(end)
      .startOf('day')
      .toISOString()
    onSubmit(newStart, newEnd)
  }

  setUnit(which, allBounds, unit, offset) {
    const prevDate = this.state[which]
    const newDate = dayjs(prevDate).add(offset, unit)

    const bounds = allBounds[which]
    let newDateMs = newDate.toDate().getTime()
    newDateMs = Math.min(bounds.max, Math.max(bounds.min, newDateMs))

    this.setState({
      [which]: new Date(newDateMs),
      [`${which}CanIncrement`]: newDateMs !== bounds.max,
      [`${which}CanDecrement`]: newDateMs !== bounds.min,
    })
  }

  last30days = () => {
    const { absoluteEnd, onSubmit } = this.props
    onSubmit(
      dayjs(absoluteEnd)
        .subtract(30, 'day')
        .toISOString(),
      absoluteEnd
    )
  }

  render() {
    const {
      start,
      end,
      startCanIncrement,
      startCanDecrement,
      endCanIncrement,
      endCanDecrement,
    } = this.state
    const { absoluteStart, absoluteEnd } = this.props

    if (start === undefined) {
      return null
    }

    const bounds = {
      start: {
        min: getTime(absoluteStart),
        max: getTime(end) - ONE_DAY_MS,
      },
      end: {
        min: getTime(start) + ONE_DAY_MS,
        max: getTime(absoluteEnd),
      },
    }
    const mStart = dayjs(start)
    const mEnd = dayjs(end)

    return (
      <div className={styles.TimeRangeSelector}>
        <div className={styles.veil} onClick={this.props.onDiscard} />
        <h2>Select a time range</h2>
        <div className={styles.selectorsContainer}>
          <div className={styles.selectorGroup}>
            <span className={styles.selectorLabel}>START</span>
            <DateSelector
              canIncrement={startCanIncrement}
              canDecrement={startCanDecrement}
              onChange={(offset) => {
                this.setUnit('start', bounds, 'day', offset)
              }}
              value={mStart.date()}
            />
            <DateSelector
              canIncrement={startCanIncrement}
              canDecrement={startCanDecrement}
              onChange={(offset) => {
                this.setUnit('start', bounds, 'month', offset)
              }}
              value={mStart.format('MMM')}
            />
            <DateSelector
              canIncrement={startCanIncrement}
              canDecrement={startCanDecrement}
              onChange={(offset) => {
                this.setUnit('start', bounds, 'year', offset)
              }}
              value={mStart.year()}
            />
          </div>
          <div className={styles.selectorGroup}>
            <span className={styles.selectorLabel}>END</span>
            <DateSelector
              canIncrement={endCanIncrement}
              canDecrement={endCanDecrement}
              onChange={(offset) => {
                this.setUnit('end', bounds, 'day', offset)
              }}
              value={mEnd.date()}
            />
            <DateSelector
              canIncrement={endCanIncrement}
              canDecrement={endCanDecrement}
              onChange={(offset) => {
                this.setUnit('end', bounds, 'month', offset)
              }}
              value={mEnd.format('MMM')}
            />
            <DateSelector
              canIncrement={endCanIncrement}
              canDecrement={endCanDecrement}
              onChange={(offset) => {
                this.setUnit('end', bounds, 'year', offset)
              }}
              value={mEnd.year()}
            />
          </div>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={classNames(styles.cta, styles.secondary)}
            onClick={this.last30days}
          >
            LAST 30 DAYS
          </button>
          <button
            type="button"
            className={styles.cta}
            onClick={() => {
              this.submit(start, end)
            }}
          >
            DONE
          </button>
        </div>
      </div>
    )
  }
}

TimeRangeSelector.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  start: PropTypes.string.isRequired,
  end: PropTypes.string.isRequired,
  absoluteStart: PropTypes.string.isRequired,
  absoluteEnd: PropTypes.string.isRequired,
}

export default TimeRangeSelector
