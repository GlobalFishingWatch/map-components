import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { animated, Transition } from 'react-spring/renderprops'
import { getDeltaDays } from '../utils'
import ImmediateContext from '../immediateContext'
import styles from './timeline-units.module.css'
import { getUnitsPositions } from '../layouts'

class TimelineUnits extends Component {
  static contextType = ImmediateContext
  zoomToUnit({ start, end }) {
    this.props.onChange(start, end)
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
        <Transition
          native
          immediate={immediate}
          items={units}
          keys={units.map((d) => d.id)}
          from={{ opacity: 0 }}
          leave={{ opacity: 0 }}
          enter={(d) => ({ left: d.x, width: d.width, opacity: 1 })}
          update={(d) => ({ left: d.x, width: d.width, opacity: 1 })}
        >
          {(d) => (s) => (
            <animated.div style={s} className={styles.unit}>
              {baseUnit === 'hour' ? (
                <animated.div>{d.label}</animated.div>
              ) : (
                <animated.button
                  type="button"
                  onClick={() => {
                    this.zoomToUnit(d)
                  }}
                  title={d.hoverLabel}
                >
                  {d.label}
                </animated.button>
              )}
            </animated.div>
          )}
        </Transition>
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
