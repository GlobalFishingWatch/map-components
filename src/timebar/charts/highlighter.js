import React, { useMemo } from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import dayjs from 'dayjs'
import { DEFAULT_FULL_DATE_FORMAT } from '../constants'
import styles from './highlighter.module.css'

const getCoords = (hoverStart, hoverEnd, outerScale) => {
  const hoverStartDate = new Date(hoverStart)
  const hoverEndDate = new Date(hoverEnd)
  const left = outerScale(hoverStartDate)
  const width = outerScale(hoverEndDate) - left
  const middleDate = new Date(
    Math.round(hoverStartDate.getTime() + (hoverEndDate.getTime() - hoverStartDate.getTime()) / 2)
  )
  const dateLabel = dayjs(middleDate).format(DEFAULT_FULL_DATE_FORMAT)
  const center = outerScale(middleDate)
  return {
    left,
    center,
    width,
    dateLabel,
  }
}

const Highlighter = ({ outerScale, graphHeight, hoverStart, hoverEnd, tooltipContainer }) => {
  const { width, left, center, dateLabel } = useMemo(
    () => getCoords(hoverStart, hoverEnd, outerScale),
    [hoverStart, hoverEnd, outerScale]
  )
  if (hoverStart === null || hoverEnd === null) {
    return null
  }

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
              <span className={styles.tooltipDate}>{dateLabel}</span>
              <span className={styles.tooltipValue}>42 knots</span>
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
  tooltipContainer: PropTypes.instanceOf(Element),
}

Highlighter.defaultProps = {
  hoverStart: null,
  hoverEnd: null,
  tooltipContainer: null,
}

export default Highlighter
