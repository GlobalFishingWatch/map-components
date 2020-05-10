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
    const maxItem = maxBy(segment, (item) => item.value)
    return maxItem ? maxItem.value : 0
  })
  const maxValue = max(maxValues)
  return maxValue
}

const getMaxValues = (graphTracks) => {
  return graphTracks.map((graphTrack) => {
    if (!graphTrack) return 0
    return graphTrack.maxValue
      ? graphTrack.maxValue
      : getMaxValue(graphTrack.segmentsWithCurrentFeature)
  })
}

const getPaths = (activity, graphHeight, overallScale, maxValue, curve, mode = 'mirror') => {
  const finalHeight = graphHeight - TOP_MARGIN - BOTTOM_MARGIN
  const middle = TOP_MARGIN + finalHeight / 2

  const areaGenerator = area()
    .x((d) => overallScale(d.date))
    .y0(
      mode === 'mirror' || mode === 'up'
        ? (d) => middle - (finalHeight * d.value) / maxValue / 2
        : middle
    )
    .y1(
      mode === 'mirror' || mode === 'down'
        ? (d) => middle + (finalHeight * d.value) / maxValue / 2
        : middle
    )
    .curve(CURVES[curve])

  const paths = activity.map((segment, i) => {
    return areaGenerator(segment)
  })

  return paths
}

const getPathContainers = (graphTracks, graphHeight, overallScale, maxValues, curve) => {
  if (!graphTracks) return []
  return graphTracks.map((graphTrack, i) => {
    if (!graphTrack)
      return {
        paths: [],
      }
    return {
      paths: getPaths(
        graphTrack.segmentsWithCurrentFeature,
        graphHeight,
        overallScale,
        maxValues[i],
        curve,
        graphTracks.length === 1 ? 'mirror' : i === 0 ? 'up' : 'down'
      ),
      color: graphTrack.color,
    }
  })
}

const Activity = ({
  graphTracks,
  opacity,
  curve,
  outerWidth,
  graphHeight,
  svgTransform,
  overallScale,
}) => {
  const { immediate } = useContext(ImmediateContext)

  const maxValues = useMemo(() => {
    return getMaxValues(graphTracks)
  }, [graphTracks])

  const pathContainers = useMemo(() => {
    return getPathContainers(graphTracks, graphHeight, overallScale, maxValues, curve)
  }, [graphTracks, graphHeight, overallScale, maxValues, curve])

  return (
    <svg width={outerWidth} height={graphHeight}>
      <g
        transform={svgTransform}
        style={{
          transition: immediate ? 'none' : `transform ${DEFAULT_CSS_TRANSITION}`,
        }}
      >
        {pathContainers.map((pathContainer, trackIndex) => {
          return pathContainer.paths.map((path, i) => (
            <path
              key={`${trackIndex}-${i}`}
              d={path}
              fill={pathContainer.color}
              fillOpacity={opacity}
            />
          ))
        })}
      </g>
    </svg>
  )
}

Activity.propTypes = {
  graphTracks: PropTypes.arrayOf(
    PropTypes.shape({
      color: PropTypes.string,
      segmentsWithCurrentFeature: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string,
          date: PropTypes.number,
          value: PropTypes.number,
        })
      ),
      maxValue: PropTypes.number,
    })
  ).isRequired,
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
  opacity: 0.9,
  curve: 'curveStepAfter',
}

export default Activity
