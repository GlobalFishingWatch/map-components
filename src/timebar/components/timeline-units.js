import React, { Component } from 'react'
import PropTypes from 'prop-types'
import ImmediateContext from '../immediateContext'
import styles from './timeline-units.module.css'
import { DEFAULT_CSS_TRANSITION } from '../constants'
import { getUnitsPositions } from '../layouts'
import { clampToAbsoluteBoundaries, getDeltaMs, getDeltaDays } from '../utils/internal-utils'

class TimelineUnits extends Component {
  static contextType = ImmediateContext
  zoomToUnit({ start, end }) {
    const { absoluteStart, absoluteEnd } = this.props
    const { newStartClamped, newEndClamped } = clampToAbsoluteBoundaries(
      start,
      end,
      getDeltaMs(start, end),
      absoluteStart,
      absoluteEnd
    )
    this.props.onChange(newStartClamped, newEndClamped)
  }

  render() {
    const { start, end, absoluteStart, absoluteEnd, outerScale, outerStart, outerEnd } = this.props
    const { immediate } = this.context
    const innerDays = getDeltaDays(start, end)

    let baseUnit = 'day'
    if (innerDays > 366) baseUnit = 'year'
    else if (innerDays > 31) baseUnit = 'month'
    else if (innerDays < 1) baseUnit = 'hour'

    const units = getUnitsPositions(
      outerScale,
      outerStart,
      outerEnd,
      absoluteStart,
      absoluteEnd,
      baseUnit
    )
    return (
      <div>
        {units.map((d) => (
          <div
            key={d.id}
            style={{
              left: d.x,
              width: d.width,
              transition: immediate
                ? 'none'
                : `width ${DEFAULT_CSS_TRANSITION}, left ${DEFAULT_CSS_TRANSITION}`,
            }}
            className={styles.unit}
          >
            {baseUnit === 'hour' ? (
              <div>{d.label}</div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  this.zoomToUnit(d)
                }}
                title={d.hoverLabel}
              >
                {d.label}
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }
}

TimelineUnits.propTypes = {
  onChange: PropTypes.func.isRequired,
  start: PropTypes.string.isRequired,
  end: PropTypes.string.isRequired,
  absoluteStart: PropTypes.string.isRequired,
  absoluteEnd: PropTypes.string.isRequired,
  outerStart: PropTypes.string.isRequired,
  outerEnd: PropTypes.string.isRequired,
  outerScale: PropTypes.func.isRequired,
}

export default TimelineUnits
