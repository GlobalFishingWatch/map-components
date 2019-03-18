import React, { Component } from 'react'
import PropTypes from 'prop-types'
import styles from './date-selector.module.css'
import { ReactComponent as IconArrowUp } from '../icons/arrowUp.svg'
import { ReactComponent as IconArrowDown } from '../icons/arrowDown.svg'

class DateSelector extends Component {
  render() {
    const { onChange, value, canIncrement, canDecrement } = this.props
    return (
      <div className={styles.DateSelector}>
        <button
          type="button"
          className={styles.arrowButton}
          disabled={!canIncrement}
          onClick={() => {
            onChange(+1)
          }}
        >
          <IconArrowUp />
        </button>
        <span className={styles.value}>{value}</span>
        <button
          type="button"
          className={styles.arrowButton}
          disabled={!canDecrement}
          onClick={() => {
            onChange(-1)
          }}
        >
          <IconArrowDown />
        </button>
      </div>
    )
  }
}

DateSelector.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  canIncrement: PropTypes.bool.isRequired,
  canDecrement: PropTypes.bool.isRequired,
}

export default DateSelector
