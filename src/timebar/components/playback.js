import React, { Component } from 'react'
import cx from 'classnames'
import ImmediateContext from '../immediateContext'
import { ReactComponent as IconLoop } from '../icons/loop.svg'
import { ReactComponent as IconBack } from '../icons/back.svg'
import { ReactComponent as IconPlay } from '../icons/play.svg'
import { ReactComponent as IconPause } from '../icons/pause.svg'
import { ReactComponent as IconForward } from '../icons/forward.svg'
import styles from './playback.module.css'
import uiStyles from '../timebar.module.css'

const SPEED_STEPS = [1, 2, 3, 5, 10]

class Playback extends Component {
  static contextType = ImmediateContext
  constructor() {
    super()
    this.interval = null
    this.state = {
      playback: {
        playing: false,
        speedStep: 0,
        loop: false,
      },
    }
  }

  componentWillUnmount() {
    this.clearInterval()
  }

  componentDidCatch() {
    this.clearInterval()
  }

  onPlayClick = () => {
    const { playing } = this.state.playback
    this.setPlaybackConfig('playing', !playing)
    if (playing) {
      this.context.toggleImmediate(false)
      this.clearInterval()
    } else {
      this.context.toggleImmediate(true)
      this.setInterval()
    }
  }

  setInterval = () => {
    const { onTick } = this.props
    const speed = SPEED_STEPS[this.state.playback.speedStep]
    this.interval = setInterval(() => {
      onTick()
    }, 1000 / speed)
  }

  clearInterval = () => {
    if (this.interval !== null) {
      clearInterval(this.interval)
    }
  }

  toggleLoop = () => {
    this.setState((prevState) => ({
      playback: {
        ...prevState.playback,
        loop: !prevState.playback.loop,
      },
    }))
  }

  onForwardClick = () => {
    console.log('TODO: go forward in timeline')
  }

  onBackwardClick = () => {
    console.log('TODO: go backward in timeline')
  }

  onSpeedClick = () => {
    const { playback } = this.state
    const nextStep = playback.speedStep === SPEED_STEPS.length - 1 ? 0 : (playback.speedStep += 1)
    this.setPlaybackConfig('speedStep', nextStep)
    if (playback.playing) {
      this.clearInterval()
      this.setInterval()
    }
  }

  setPlaybackConfig = (prop, step) => {
    this.setState({
      playback: {
        ...this.state.playback,
        [prop]: step,
      },
    })
  }

  render() {
    const { playback } = this.state
    return (
      <div
        className={cx(styles.playbackActions, {
          [styles.playbackActionsActive]: playback.playing,
        })}
      >
        <button
          type="button"
          title="Toggle animation looping"
          onClick={this.toggleLoop}
          className={cx(uiStyles.uiButton, styles.secondary, styles.loop, {
            [styles.secondaryActive]: playback.loop,
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
          title={`${playback.playing === true ? 'Pause' : 'Play'} animation`}
          onClick={this.onPlayClick}
          className={cx(uiStyles.uiButton, styles.play)}
        >
          {playback.playing === true ? <IconPause /> : <IconPlay />}
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
          {SPEED_STEPS[playback.speedStep]}x
        </button>
      </div>
    )
  }
}

export default Playback
