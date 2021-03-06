import React, { Component } from 'react'
import cx from 'classnames'
import MapModule from '@globalfishingwatch/map-components/src/map'
import styles from './map-workspace.module.css'

class MapWorkspace extends Component {
  state = {
    highlightTemporalExtent: [new Date(2017, 11, 1), new Date(2017, 11, 31)],
    viewport: {
      center: [0, 0],
      zoom: 5,
    },
    workspaceUrl: 'http://localhost:3333/workspace.json',
    workspaceAuto: true,
    workspaceStatus: 'ok',
    workspaceError: null,
  }

  timeout = null

  loadTemporalExtent = [new Date(2017, 12, 1), new Date(2017, 11, 31)]
  temporalExtent = [new Date(2017, 11, 1), new Date(2017, 11, 31)]
  tracks = [
    {
      id: 'dsadfafda8',
      url:
        'https://vessels-dot-world-fishing-827.appspot.com/datasets/indonesia/vessels/61d64d171-18a0-8c02-0606-28a5ce540077/tracks',
      color: '#FE81EB',
      type: 'geojson',
      fitBoundsOnLoad: true,
    },
  ]

  componentDidMount = () => {
    setInterval(this.increaseHighlightDay, 1000)
    if (this.state.workspaceAuto === true) {
      this.fetchWorkspace()
    }
  }

  componentDidUpdate = () => {
    if (this.state.highlightTemporalExtent[0].getDate() < 31) {
      clearInterval(this.increaseHighlightDay)
    }
  }

  componentWillUnmount = () => {
    clearInterval(this.increaseHighlightDay)
    if (this.timeout !== null) {
      clearTimeout(this.timeout)
    }
  }

  increaseHighlightDay = () => {
    const date = this.state.highlightTemporalExtent[0]
    const year = date.getFullYear()
    const month = date.getMonth()
    const newDay = date.getDate() + 1
    this.setState((state) => ({
      highlightTemporalExtent: [new Date(year, month, newDay), state.highlightTemporalExtent[1]],
    }))
  }

  onViewportChange = ({ zoom, center }) => {
    if (this.state.workspaceAuto === false) {
      this.setState({ viewport: { zoom, center } })
    }
  }

  onWorkspaceAutoChange = (event) => {
    this.setState({
      workspaceAuto: event.target.checked,
    })
    if (event.target.checked === true) {
      this.fetchWorkspace()
    }
  }

  onWorkspaceUrlChange = (event) => {
    const workspaceUrl = event.target.value
    this.setState(
      {
        workspaceUrl,
      },
      this.fetchWorkspace
    )
  }

  onFeatureClick = (event) => {
    console.log(event)
  }

  onFeatureHover = (event) => {
    if (event.type !== null) {
      console.log(event)
    }
  }

  fetchWorkspace = () => {
    const { workspaceUrl } = this.state
    this.setState({
      workspaceUrl,
      workspaceStatus: 'loading',
    })
    fetch(workspaceUrl)
      .then((response) => {
        if (response.status >= 200 && response.status < 300) {
          return response
        } else {
          var error = new Error(response.statusText)
          error.response = response
          throw error
        }
      })
      .then((response) => response.text())
      .then((text) => {
        try {
          const data = JSON.parse(text)
          this.loadWorkspace(data)
          if (this.state.workspaceAuto === true) {
            this.timeout = window.setTimeout(this.fetchWorkspace, 1000)
          }
          this.setState({
            workspaceStatus: 'ok',
            workspaceError: null,
          })
        } catch (err) {
          this.timeout = window.setTimeout(this.fetchWorkspace, 1000)
          this.setState({
            workspaceStatus: 'json',
            workspaceError: 'bad JSON:' + err,
          })
        }
      })
      .catch((err) => {
        this.timeout = window.setTimeout(this.fetchWorkspace, 1000)
        this.setState({
          workspaceStatus: 'fetch',
          workspaceError: 'couldnt fetch:' + err,
        })
      })
  }

  loadWorkspace(data) {
    const workspace = data.workspace
    const map = workspace.map
    const layers = workspace.map.layers
    this.setState({
      map: {
        viewport: {
          center: map.center,
          zoom: map.zoom,
        },
        staticLayers: layers,
      },
    })
  }

  render() {
    const {
      viewport,
      highlightTemporalExtent,
      workspaceUrl,
      workspaceStatus,
      workspaceError,
      workspaceAuto,
      map,
    } = this.state

    const finalViewport = map !== undefined && workspaceAuto === true ? map.viewport : viewport
    const finalStaticLayers = map !== undefined ? map.staticLayers : []
    return (
      <div className={styles.Container}>
        <div className={styles.WorkspacePanel}>
          Workspace url:
          <input
            className={styles.workspaceUrl}
            type="text"
            onChange={this.onWorkspaceUrlChange}
            value={workspaceUrl}
          />
          <input
            type="checkbox"
            onChange={this.onWorkspaceAutoChange}
            checked={this.state.workspaceAuto}
          />
          auto
          <span className={cx(styles.workspaceStatus, styles[workspaceStatus])} />
          <div className={styles[workspaceStatus]}>{workspaceError}</div>
        </div>
        <div className={styles.MapWrapper}>
          <MapModule
            viewport={finalViewport}
            onViewportChange={this.onViewportChange}
            staticLayers={finalStaticLayers}
            // staticLayers={[
            //   {
            //     visible: true,
            //     id: 'cluster_test',
            //     interactive: true,
            //   },
            // ]}
            // tracks={this.tracks}
            temporalExtent={this.temporalExtent}
            loadTemporalExtent={this.loadTemporalExtent}
            highlightTemporalExtent={highlightTemporalExtent}
            onClick={this.onFeatureClick}
            onHover={this.onFeatureHover}
          />
        </div>
      </div>
    )
  }
}

export default MapWorkspace
