import React, { useMemo } from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import dayjs from 'dayjs'
import { getDefaultFormat } from '../utils'
import styles from './highlighter.module.css'

const getCoords = (hoverStart, hoverEnd, outerScale) => {
  const hoverStartDate = new Date(hoverStart)
  const hoverEndDate = new Date(hoverEnd)
  const left = outerScale(hoverStartDate)
  const width = outerScale(hoverEndDate) - left
  const centerDate = new Date(
    Math.round(hoverStartDate.getTime() + (hoverEndDate.getTime() - hoverStartDate.getTime()) / 2)
  )
  const format = getDefaultFormat(hoverStart, hoverEnd)
  const centerDateLabel = dayjs(centerDate).format(format)
  const center = outerScale(centerDate)
  return {
    left,
    center,
    width,
    centerDate,
    centerDateLabel,
  }
}

const getValueAtCenter = (activity, centerDate) => {
  const centerTime = centerDate.getTime()
  for (let s = 0; s < activity.length; s++) {
    const segment = activity[s]
    const segmentLength = segment.length
    const segmentStart = segment[0].date
    const segmentEnd = segment[segmentLength - 1].date
    if (centerDate > segmentStart && centerDate < segmentEnd) {
      for (let i = 0; i < segmentLength; i++) {
        const point = segment[i]
        const nextPoint = segment[i + 1]
        const time = point.date
        const nextTime = nextPoint ? nextPoint.date : Number.POSITIVE_INFINITY
        if (centerTime > time && centerTime <= nextTime) {
          return point.value
        }
      }
    }
  }
  return null
}

const Highlighter = ({
  hoverStart,
  hoverEnd,
  activity,
  unit,
  outerScale,
  graphHeight,
  tooltipContainer,
}) => {
  const { width, left, center, centerDate, centerDateLabel } = useMemo(
    () => getCoords(hoverStart, hoverEnd, outerScale),
    [hoverStart, hoverEnd, outerScale]
  )
  const valueAtCenter = useMemo(() => getValueAtCenter(activity, centerDate), [
    activity,
    centerDate,
  ])
  if (hoverStart === null || hoverEnd === null) {
    return null
  }

  const valueLabel = valueAtCenter !== null ? `${valueAtCenter} ${unit}` : null

  return (
    <>
      <div
        className={styles.highlighter}
        style={{
          left,
          width,
          height: graphHeight,
        }}
      ></div>
      {tooltipContainer !== null &&
        ReactDOM.createPortal(
          <div
            className={styles.tooltipContainer}
            style={{
              left: center,
            }}
          >
            <div className={styles.tooltip}>
              <span className={styles.tooltipDate}>{centerDateLabel}</span>
              <span className={styles.tooltipValue}>{valueLabel}</span>
            </div>
          </div>,
          tooltipContainer
        )}
    </>
  )
}

Highlighter.propTypes = {
  outerScale: PropTypes.func.isRequired,
  graphHeight: PropTypes.number.isRequired,
  hoverStart: PropTypes.string,
  hoverEnd: PropTypes.string,
  activity: PropTypes.arrayOf(
    PropTypes.arrayOf(
      PropTypes.shape({
        date: PropTypes.number,
        value: PropTypes.number,
      })
    )
  ).isRequired,
  unit: PropTypes.string,
  tooltipContainer: PropTypes.instanceOf(Element),
}

Highlighter.defaultProps = {
  hoverStart: null,
  hoverEnd: null,
  tooltipContainer: null,
  unit: '',
}

export default Highlighter
