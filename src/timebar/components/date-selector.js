import React, { Component } from 'react'
import PropTypes from 'prop-types'
import cx from 'classnames'
import styles from './date-selector.module.css'
import { ReactComponent as IconArrowUp } from '../icons/arrowUp.svg'
import { ReactComponent as IconArrowDown } from '../icons/arrowDown.svg'

class DateSelector extends Component {
  constructor(props) {
    super(props)
    this.state = {
      value: props.value,
      error: false,
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.value !== nextProps.value) {
      this.setState({ value: nextProps.value })
    }
  }

  validate(value) {
    const { unit } = this.props
    const isNumber = typeof value === 'number'
    if (!isNumber) return false

    // TODO: validate days / months / years
    switch (unit) {
      case 'date':
        return value > 0 && value < 31
      case 'month':
        return value >= 0 && value < 12
      case 'year':
        return value > 2012 && value < new Date().getFullYear()
      default:
        return false
    }
  }

  onIncrementClick = () => {
    const { value, unit } = this.props
    this.props.onChange(value + 1, unit)
  }

  onDecrementClick = () => {
    const { value, unit } = this.props
    this.props.onChange(value - 1, unit)
  }

  onInputChange = (event) => {
    const value = event.target.value && parseInt(event.target.value)
    const isValid = this.validate(value)
    this.setState({ value, error: !isValid }, () => {
      if (isValid) {
        this.debouncedChange(value)
      }
    })
  }

  debouncedChange = (value) => {
    this.props.onChange(value, this.props.unit)
  }

  render() {
    const { value, error } = this.state
    const { unit, label, canIncrement, canDecrement } = this.props
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
          <label className={cx(styles.valueInput, styles.labelInput)} htmlFor={label + unit}>
            {label}
          </label>
        )}
        <input
          type="text"
          name={label + unit}
          value={value}
          className={cx(styles.valueInput, { [styles.valueInputError]: error })}
          onChange={this.onInputChange}
        />
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
  onChange: PropTypes.func.isRequired,
  unit: PropTypes.oneOf(['date', 'month', 'year']).isRequired,
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  canIncrement: PropTypes.bool.isRequired,
  canDecrement: PropTypes.bool.isRequired,
}

DateSelector.defaultProps = {
  label: '',
}

export default DateSelector
