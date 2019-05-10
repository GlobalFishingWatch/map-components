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
      // startValid: true,
      // endValid: true,
      validity: {
        start: {
          date: true,
          year: true
        },
        end: {
          date: true,
          year: true
        }
      },
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
    const newStart = dayjs(start)
    const newEnd = dayjs(end)
    if (!newStart.isValid()) {
      this.setState({ startValid: false })
    } else if (!newEnd.isValid()) {
      this.setState({ endValid: false })
    } else {
      this.setState({ startValid: true, endValid: true })
      onSubmit(newStart.startOf('day').toISOString(), newEnd.startOf('day').toISOString())
    }
  }

  setValidity(which, value, unit, callback) {
    const setValidityState = valid => {
      this.setState(state => {
        const validity = {
          ...state.validity,
          [which]: {
            ...state.validity[which],
            [unit]: valid
          }
        }
        callback(this.allDatesValid(validity))
        return {
          validity
        }
      })
    }

    if (unit === 'month') {
      callback(this.allDatesValid(this.state.validity))
    }

    const valueNumber = parseInt(value)

    if (isNaN(valueNumber)) {
      setValidityState(false)
      return
    }

    const date = this.state[which]
    if (unit === 'date') {
      const daysInMonth = dayjs(date).daysInMonth()
      setValidityState(value > 0 && value < daysInMonth)
    } else {
      setValidityState(value > 2012 && value <= new Date().getFullYear())
    }
  }

  allDatesValid = (validity) => {
    return (
      validity.start.date === true &&
      validity.start.year === true &&
      validity.end.date === true &&
      validity.end.year === true
    )
  }

  onStartChange = (value, unit, applyBounds) => {
    this.onChange('start', value, unit, applyBounds)
  }

  onEndChange = (value, unit, applyBounds) => {
    this.onChange('end', value, unit, applyBounds)
  }

  onChange = (which, value, unit, applyBounds) => {
    if (applyBounds === true) {
      this.setUnit(which, unit, value, applyBounds)
    } else {
      this.setValidity(which, value, unit, allDatesValid => {
        if (allDatesValid === true) {
          this.setUnit(which, unit, value, applyBounds)
        }
      })
    }
    
  }

  setUnit(which, unit, value, applyBounds) {
    const prevDate = this.state[which]
    const newDate = dayjs(prevDate).set(unit, value)

    const { absoluteStart, absoluteEnd } = this.props
    const { start, end } = this.state

    const allBounds = {
      start: {
        min: getTime(absoluteStart),
        max: getTime(end) - ONE_DAY_MS,
      },
      end: {
        min: getTime(start) + ONE_DAY_MS,
        max: getTime(absoluteEnd),
      },
    }

    const bounds = allBounds[which]
    let newDateMs = newDate.toDate().getTime()
    if (applyBounds === true) {
      newDateMs = Math.min(bounds.max, Math.max(bounds.min, newDateMs))
    }

    this.setState(state => ({
      [which]: new Date(newDateMs),
      validity: {
        ...state.validity,
        [which]: {
          date: true,
          year: true
        }
      },
      [`${which}CanIncrement`]: newDateMs !== bounds.max,
      [`${which}CanDecrement`]: newDateMs !== bounds.min,
    }))
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
      validity,
      startCanIncrement,
      startCanDecrement,
      endCanIncrement,
      endCanDecrement,
    } = this.state

    if (start === undefined) {
      return null
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
              unit="date"
              valid={validity.start.date}
              canIncrement={startCanIncrement}
              canDecrement={startCanDecrement}
              onChange={this.onStartChange}
              value={mStart.date()}
            />
            <DateSelector
              unit="month"
              canIncrement={startCanIncrement}
              canDecrement={startCanDecrement}
              onChange={this.onStartChange}
              label={mStart.format('MMM')}
              value={mStart.month()}
            />
            <DateSelector
              unit="year"
              valid={validity.start.year}
              canIncrement={startCanIncrement}
              canDecrement={startCanDecrement}
              onChange={this.onStartChange}
              value={mStart.year()}
            />
          </div>
          <div className={styles.selectorGroup}>
            <span className={styles.selectorLabel}>END</span>
            <DateSelector
              unit="date"
              valid={validity.end.date}
              canIncrement={endCanIncrement}
              canDecrement={endCanDecrement}
              onChange={this.onEndChange}
              value={mEnd.date()}
            />
            <DateSelector
              unit="month"
              canIncrement={endCanIncrement}
              canDecrement={endCanDecrement}
              onChange={this.onEndChange}
              label={mEnd.format('MMM')}
              value={mEnd.month()}
            />
            <DateSelector
              unit="year"
              valid={validity.end.year}
              canIncrement={endCanIncrement}
              canDecrement={endCanDecrement}
              onChange={this.onEndChange}
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
            disabled={this.allDatesValid(validity) === false}
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
  onDiscard: PropTypes.func.isRequired,
  start: PropTypes.string.isRequired,
  end: PropTypes.string.isRequired,
  absoluteStart: PropTypes.string.isRequired,
  absoluteEnd: PropTypes.string.isRequired,
}

export default TimeRangeSelector
