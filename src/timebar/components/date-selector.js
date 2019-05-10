import React, { Component } from 'react'
import PropTypes from 'prop-types'
import cx from 'classnames'
import dayjs from 'dayjs'
import styles from './date-selector.module.css'
import { ReactComponent as IconArrowUp } from '../icons/arrowUp.svg'
import { ReactComponent as IconArrowDown } from '../icons/arrowDown.svg'

class DateSelector extends Component {
  constructor(props) {
    super(props)
    this.state = { value: props.value }
    this.months = Array.from(Array(12).keys()).map((i) => ({
      value: i,
      label: dayjs()
        .month(i)
        .format('MMM'),
    }))
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.value !== nextProps.value) {
      this.setState({ value: nextProps.value })
    }
  }

  onIncrementClick = () => {
    const { value, unit } = this.props
    this.props.onChange(value + 1, unit, true)
  }

  onDecrementClick = () => {
    const { value, unit } = this.props
    this.props.onChange(value - 1, unit, true)
  }

  onInputChange = (event) => {
    const value = event.target.value && parseInt(event.target.value)
    this.setValue(value)
  }

  setValue = (value) => {
    this.setState({ value })
    this.props.onChange(value, this.props.unit)
  }

  render() {
    const { value } = this.state
    const { unit, label, canIncrement, canDecrement, valid } = this.props
    return (
      <div className={styles.DateSelector}>
        <button
          type="button"
          className={styles.arrowButton}
          disabled={!canIncrement}
          onClick={this.onIncrementClick}
        >
          <IconArrowUp />
        </button>
        {label !== '' && (
          <label
            className={cx(styles.valueInput, styles.labelInput, {
              [styles.valueInputError]: !valid,
            })}
            htmlFor={label + unit}
          >
            {label}
          </label>
        )}
        {unit !== 'month' && (
          <input
            type="text"
            name={label + unit}
            value={value}
            className={cx(styles.valueInput, { [styles.valueInputError]: !valid })}
            onChange={this.onInputChange}
          />
        )}
        {unit === 'month' && (
          <select
            value={value}
            name={label + unit}
            className={styles.selectInput}
            onChange={this.onInputChange}
          >
            {this.months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          className={styles.arrowButton}
          disabled={!canDecrement}
          onClick={this.onDecrementClick}
        >
          <IconArrowDown />
        </button>
      </div>
    )
  }
}

DateSelector.propTypes = {
  valid: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  unit: PropTypes.oneOf(['date', 'month', 'year']).isRequired,
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  canIncrement: PropTypes.bool.isRequired,
  canDecrement: PropTypes.bool.isRequired,
}

DateSelector.defaultProps = {
  valid: true,
  label: '',
}

export default DateSelector
