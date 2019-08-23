import React, { useContext, useMemo } from 'react'
import PropTypes from 'prop-types'
import maxBy from 'lodash/maxBy'
import { area, curveStepAfter } from 'd3-shape'
import { getTime } from '../utils'
import ImmediateContext from '../immediateContext'
import { DEFAULT_CSS_TRANSITION } from '../constants'
import styles from './activity.module.css'

const TOP_MARGIN = 5
const BOTTOM_MARGIN = 20

const getMaxValue = (activity) => {
  const maxValueItem = maxBy(activity, (item) => item.value)
  return maxValueItem.value
}

const getPath = (graphHeight, activity, absoluteEnd, overallScale, maxValue) => {
  const finalHeight = graphHeight - TOP_MARGIN - BOTTOM_MARGIN
  const middle = TOP_MARGIN + finalHeight / 2

  const areaGenerator = area()
    .x((d) => overallScale(d.date))
    .y0((d) => middle - (finalHeight * d.value) / maxValue / 2)
    .y1((d) => middle + (finalHeight * d.value) / maxValue / 2)
    .curve(curveStepAfter)

  // because data stops at last day midnight, add an extra day with the same data
  // to allow the curve to go to the end of the day
  const lastDay = activity[activity.length - 1]
  const addedLastDay = { date: getTime(absoluteEnd), value: lastDay.value }

  const path = areaGenerator([...activity, addedLastDay])

  return path
}

const Activity = ({
  activity,
  absoluteEnd,
  outerWidth,
  graphHeight,
  svgTransform,
  overallScale,
}) => {
  const { immediate } = useContext(ImmediateContext)

  const maxValue = useMemo(() => getMaxValue(activity), [activity])

  const path = useMemo(() => getPath(graphHeight, activity, absoluteEnd, overallScale, maxValue), [
    graphHeight,
    activity,
    absoluteEnd,
    overallScale,
    maxValue,
  ])

  return (
    <svg width={outerWidth} height={graphHeight} className={styles.Activity}>
      <g
        className={styles.transformGroup}
        transform={svgTransform}
        style={{
          transition: immediate ? 'none' : `transform ${DEFAULT_CSS_TRANSITION}`,
        }}
      >
        <path d={path} fill="pink" fillOpacity={0.9} />
      </g>
    </svg>
  )
}

Activity.propTypes = {
  activity: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      date: PropTypes.number,
      value: PropTypes.number,
    })
  ).isRequired,
  absoluteEnd: PropTypes.string.isRequired,
  outerScale: PropTypes.func.isRequired,
  outerWidth: PropTypes.number.isRequired,
  graphHeight: PropTypes.number.isRequired,
  svgTransform: PropTypes.string.isRequired,
  overallScale: PropTypes.func.isRequired,
}

export default Activity
