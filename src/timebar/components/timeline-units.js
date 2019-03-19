import React, { Component } from 'react'
import PropTypes from 'prop-types'
import dayjs from 'dayjs'
import { animated, Transition } from 'react-spring'
import { getTime, getDeltaDays } from '../utils'
import styles from './timeline-units.module.css'

const getUnitLabel = (mUnit, baseUnit, availableWidth) => {
  /* eslint key-spacing: 0, no-multi-spaces: 0 */
  const FORMATS = {
    year: { isFirst: () => false, formats: [[0, 'YYYY']] },
    month: {
      isFirst: (fm) => fm.month() === 0,
      formats: [[200, 'MMMM YYYY'], [100, 'MMMM', 'MMM YYYY'], [0, 'MMM', 'MMM YY']],
    },
    day: {
      isFirst: (fm) => fm.date() === 1,
      formats: [
        [999, 'ddd D MMMM YYYY'],
        [200, 'ddd D MMMM'],
        [70, 'ddd D', 'MMM 1'],
        [0, 'D', 'MMM'],
      ],
    },
    hour: {
      isFirst: (fm) => fm.hour() === 0,
      formats: [[999, 'ddd D MMMM YYYY H[H]'], [0, 'H[H]', 'ddd D']],
    },
  }
  const unitFormat = FORMATS[baseUnit]
  let format
  for (let i = 0; i < unitFormat.formats.length; i += 1) {
    const formatMinWidth = unitFormat.formats[i][0]
    if (availableWidth > formatMinWidth) {
      format = unitFormat.formats[i]
      break
    }
  }

  const isFirst = unitFormat.isFirst(mUnit)
  const formatString = isFirst && format[2] ? format[2] : format[1]
  return mUnit.format(formatString)
}

const getUnitsPositions = (
  outerScale,
  outerStart,
  outerEnd,
  absoluteStart,
  absoluteEnd,
  baseUnit
) => {
  const startMs = Math.max(getTime(outerStart), getTime(absoluteStart))
  const endMs = Math.min(getTime(outerEnd), getTime(absoluteEnd))

  // BUFFER ??
  const mOuterStart = dayjs(startMs).startOf(baseUnit)
  const mOuterEnd = dayjs(endMs).endOf(baseUnit)

  const units = []
  const numUnitsOffset = getTime(outerEnd) > getTime(absoluteEnd) ? 0 : 1
  const numUnits = mOuterEnd.diff(mOuterStart, baseUnit) + numUnitsOffset

  let mUnit = mOuterStart
  let x = outerScale(mUnit)

  for (let ui = 0; ui <= numUnits; ui += 1) {
    const mUnitNext = mUnit.add(1, baseUnit)
    const xNext = outerScale(mUnitNext)

    const id = mUnit.format(
      {
        year: 'YYYY',
        month: 'YYYY-MM',
        day: 'YYYY-MM-DD',
        hour: 'YYYY-MM-DD-HH',
      }[baseUnit]
    )

    const width = xNext - x
    const unit = {
      id,
      x,
      width,
      label: getUnitLabel(mUnit, baseUnit, width),
      hoverLabel: `${getUnitLabel(mUnit, baseUnit, Infinity)} - Zoom to ${baseUnit}`,
      start: mUnit.toISOString(),
      end: mUnitNext.subtract(1, 'hour').toISOString(), // this avoids being stuck when clicking on a day unit
    }
    units.push(unit)
    mUnit = mUnitNext
    x = xNext
  }

  return units
}

class TimelineUnits extends Component {
  zoomToUnit({ start, end }) {
    this.props.onChange(start, end)
  }

  render() {
    const {
      start,
      end,
      absoluteStart,
      absoluteEnd,
      outerScale,
      outerStart,
      outerEnd,
      immediate,
    } = this.props
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
  immediate: PropTypes.bool.isRequired,
}

export default TimelineUnits