import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { area, curveStepAfter } from 'd3-shape'
import { animated, Spring } from 'react-spring/renderprops'
import { getTime } from '../utils'
import ImmediateContext from '../immediateContext'
import styles from './activity.module.css'

const TOP_MARGIN = 5

class Activity extends Component {
  static contextType = ImmediateContext
  render() {
    const { activity, absoluteEnd, outerScale, outerWidth, graphHeight } = this.props
    const { immediate } = this.context

    // because data stops at last day midnight, add an extra day with the same data
    // to allow the curve to go to the end of the day
    const lastDay = activity[activity.length - 1]
    const addedLastDay = { date: getTime(absoluteEnd), value: lastDay.value }

    const finalHeight = graphHeight - TOP_MARGIN
    const middle = TOP_MARGIN + finalHeight / 2

    const areaGenerator = area()
      .x((d) => outerScale(d.date))
      .y0((d) => middle - (finalHeight * d.value) / 2)
      .y1((d) => middle + (finalHeight * d.value) / 2)
      .curve(curveStepAfter)

    return (
      <svg width={outerWidth} height={graphHeight} className={styles.Activity}>
        <Spring native immediate={immediate} to={{ d: areaGenerator([...activity, addedLastDay]) }}>
          {(style) => <animated.path d={style.d} fill="pink" fillOpacity={0.9} />}
        </Spring>
      </svg>
    )
  }
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
  immediate: PropTypes.bool.isRequired,
  outerWidth: PropTypes.number.isRequired,
  graphHeight: PropTypes.number.isRequired,
}

export default Activity
