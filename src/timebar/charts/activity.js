import React, { useContext, useMemo } from 'react'
import PropTypes from 'prop-types'
import maxBy from 'lodash/maxBy'
import max from 'lodash/max'
import {
  area,
  curveStepAfter,
  curveStepBefore,
  curveLinear,
  curveBasis,
  curveCatmullRom,
  curveCardinal,
} from 'd3-shape'
import ImmediateContext from '../immediateContext'
import { DEFAULT_CSS_TRANSITION } from '../constants'

const TOP_MARGIN = 5
const BOTTOM_MARGIN = 20

const CURVES = {
  curveStepAfter,
  curveStepBefore,
  curveLinear,
  curveBasis, // smoothes out, line does not pass through points
  curveCatmullRom, // smoothes out while insuring line passes through points but produces artefacts
  curveCardinal, // smoothes out while insuring line passes through points but produces artefacts
}

const getMaxValue = (activity) => {
  const maxValues = activity.map((segment) => {
    return maxBy(segment, (item) => item.value).value
  })
  const maxValue = max(maxValues)
  return maxValue
}

const getPaths = (graphHeight, activity, absoluteEnd, overallScale, maxValue, curve) => {
  const finalHeight = graphHeight - TOP_MARGIN - BOTTOM_MARGIN
  const middle = TOP_MARGIN + finalHeight / 2

  const areaGenerator = area()
    .x((d) => overallScale(d.date))
    .y0((d) => middle - (finalHeight * d.value) / maxValue / 2)
    .y1((d) => middle + (finalHeight * d.value) / maxValue / 2)
    .curve(CURVES[curve])

  const paths = activity.map((segment, i) => {
    return areaGenerator(segment)
  })

  return paths
}

const Activity = ({
  activity,
  color,
  opacity,
  curve,
  absoluteEnd,
  outerWidth,
  graphHeight,
  svgTransform,
  overallScale,
}) => {
  const { immediate } = useContext(ImmediateContext)

  const maxValue = useMemo(() => getMaxValue(activity), [activity])

  const paths = useMemo(
    () => getPaths(graphHeight, activity, absoluteEnd, overallScale, maxValue, curve),
    [graphHeight, activity, absoluteEnd, overallScale, maxValue, curve]
  )

  return (
    <svg width={outerWidth} height={graphHeight}>
      <g
        transform={svgTransform}
        style={{
          transition: immediate ? 'none' : `transform ${DEFAULT_CSS_TRANSITION}`,
        }}
      >
        {paths.map((path, i) => (
          <path key={i} d={path} fill={color} fillOpacity={opacity} />
        ))}
      </g>
    </svg>
  )
}

Activity.propTypes = {
  activity: PropTypes.arrayOf(
    PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        date: PropTypes.number,
        value: PropTypes.number,
      })
    )
  ).isRequired,
  color: PropTypes.string,
  opacity: PropTypes.number,
  curve: PropTypes.string,
  absoluteEnd: PropTypes.string.isRequired,
  outerScale: PropTypes.func.isRequired,
  outerWidth: PropTypes.number.isRequired,
  graphHeight: PropTypes.number.isRequired,
  svgTransform: PropTypes.string.isRequired,
  overallScale: PropTypes.func.isRequired,
}

Activity.defaultProps = {
  color: 'var(--timebar-light-blue)',
  opacity: 0.9,
  curve: 'curveStepAfter',
}

export default Activity
