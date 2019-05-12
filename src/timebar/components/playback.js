import React, { Component } from 'react'
import PropTypes from 'prop-types'
import cx from 'classnames'
import memoize from 'memoize-one'
import { scaleLinear } from 'd3-scale'
import ImmediateContext from '../immediateContext'
import { ReactComponent as IconLoop } from '../icons/loop.svg'
import { ReactComponent as IconBack } from '../icons/back.svg'
import { ReactComponent as IconPlay } from '../icons/play.svg'
import { ReactComponent as IconPause } from '../icons/pause.svg'
import { ReactComponent as IconForward } from '../icons/forward.svg'
import styles from './playback.module.css'
import uiStyles from '../timebar.module.css'

const BASE_STEP = 0.001
const SPEED_STEPS = [1, 2, 3, 5, 10]

class Playback extends Component {
  static contextType = ImmediateContext
  constructor() {
    super()
    this.state = {
      playing: false,
      speedStep: 0,
      loop: false,
    }
  }

  getStep = memoize((start, end, speedStep) => {
    const baseStepWithSpeed = BASE_STEP * SPEED_STEPS[speedStep]
    const startMs = new Date(start).getTime()
    const endMs = new Date(end).getTime()
    const scale = scaleLinear()
      .range([0, 1])
      .domain([startMs, endMs])
    const step = scale.invert(baseStepWithSpeed) - startMs
    return step
  })

  componentWillUnmount() {
    window.cancelAnimationFrame(this.requestAnimationFrame)
  }

  tick = (elapsedMs) => {
    if (this.lastUpdateMs === undefined || this.lastUpdateMs === null) {
      this.lastUpdateMs = elapsedMs
    }
    const { onTick, start, end } = this.props
    const { speedStep } = this.state
    // "compare" elapsed with theoretical 60 fps frame
    const progressRatio = (elapsedMs - this.lastUpdateMs) / (1000 / 60)
    const deltaMs = this.getStep(start, end, speedStep) * progressRatio
    onTick(deltaMs)
    this.lastUpdateMs = elapsedMs
    this.requestAnimationFrame = window.requestAnimationFrame(this.tick)
  }

  onPlayToggle = () => {
    const { playing } = this.state

    if (playing) {
      this.context.toggleImmediate(false)
      this.lastUpdateMs = null
      window.cancelAnimationFrame(this.requestAnimationFrame)
    } else {
      this.context.toggleImmediate(true)
      this.requestAnimationFrame = window.requestAnimationFrame(this.tick)
    }

    this.setState({
      playing: !playing,
    })
  }

  toggleLoop = () => {
    this.setState((prevState) => ({
      loop: !prevState.playback.loop,
    }))
  }

  onForwardClick = () => {
    console.log('TODO: go forward in timeline')
  }

  onBackwardClick = () => {
    console.log('TODO: go backward in timeline')
  }

  onSpeedClick = () => {
    const { speedStep } = this.state
    const nextStep = speedStep === SPEED_STEPS.length - 1 ? 0 : speedStep + 1
    const step = this.getStep(nextStep)
    this.step = step
    this.setState({ speedStep: nextStep })
  }

  render() {
    const { playing, loop, speedStep } = this.state
    return (
      <div
        className={cx(styles.playbackActions, {
          [styles.playbackActionsActive]: playing,
        })}
      >
        <button
          type="button"
          title="Toggle animation looping"
          onClick={this.toggleLoop}
          className={cx(uiStyles.uiButton, styles.secondary, styles.loop, {
            [styles.secondaryActive]: loop,
          })}
        >
          <IconLoop />
        </button>
        <button
          type="button"
          title="Move back"
          onClick={this.onBackwardClick}
          className={cx(uiStyles.uiButton, styles.secondary, styles.back)}
        >
          <IconBack />
        </button>
        <button
          type="button"
          title={`${playing === true ? 'Pause' : 'Play'} animation`}
          onClick={this.onPlayToggle}
          className={cx(uiStyles.uiButton, styles.play)}
        >
          {playing === true ? <IconPause /> : <IconPlay />}
        </button>
        <button
          type="button"
          title="Move forward"
          onClick={this.onForwardClick}
          className={cx(uiStyles.uiButton, styles.secondary, styles.forward)}
        >
          <IconForward />
        </button>
        <button
          type="button"
          title="Change animation speed"
          onClick={this.onSpeedClick}
          className={cx(uiStyles.uiButton, styles.secondary, styles.speed)}
        >
          {SPEED_STEPS[speedStep]}x
        </button>
      </div>
    )
  }
}

Playback.propTypes = {
  onTick: PropTypes.func.isRequired,
  start: PropTypes.string.isRequired,
  end: PropTypes.string.isRequired,
}

export default Playback
