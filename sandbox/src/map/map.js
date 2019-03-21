import React, { Component } from 'react'
import cx from 'classnames'
import MapModule from '@globalfishingwatch/map-components/src/map'
import './map.css'

class MapPage extends Component {
  state = {
    highlightTemporalExtent: [new Date(2017, 11, 1), new Date(2017, 11, 31)],
    viewport: {
      center: [0.026, 123.61],
      zoom: 5,
    },
    workspaceUrl: 'http://localhost:3333/workspace.json',
    workspaceStatus: 'ok',
    workspaceError: null,
  }

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
    setInterval(this.fetchWorkspace, 1000)
  }

  componentDidUpdate = () => {
    if (this.state.highlightTemporalExtent[0].getDate() < 31) {
      clearInterval(this.increaseHighlightDay)
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
    this.setState({ zoom, center })
  }

  onWorkspaceUrlChange = (event) => {
    const workspaceUrl = event.target.value
    this.setState({
      workspaceUrl,
    })
    this.fetchWorkspace()
  }

  fetchWorkspace = () => {
    const { workspaceUrl } = this.state
    this.setState({
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
          this.setState({
            workspaceStatus: 'ok',
            workspaceError: null,
          })
        } catch (err) {
          this.setState({
            workspaceStatus: 'json',
            workspaceError: 'bad JSON:' + err,
          })
        }
      })
      .catch((err) => {
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
        staticLayers: layers.filter((l) => l.type === 'CartoDBAnimation'),
      },
    })
  }

  render() {
    const {
      highlightTemporalExtent,
      workspaceUrl,
      workspaceStatus,
      workspaceError,
      map,
    } = this.state
    return (
      <div className="Container">
        <div className="WorkspacePanel">
          Workspace url:
          <input
            className="workspaceUrl"
            type="text"
            onChange={this.onWorkspaceUrlChange}
            value={workspaceUrl}
          />
          <span className={cx('workspaceStatus', workspaceStatus)} />
          <div className={workspaceStatus}>{workspaceError}</div>
        </div>
        <div className="MapWrapper">
          {map === undefined ? (
            <MapModule />
          ) : (
            <MapModule
              viewport={map.viewport}
              // tracks={this.tracks}
              // temporalExtent={this.temporalExtent}
              // loadTemporalExtent={this.loadTemporalExtent}
              // highlightTemporalExtent={highlightTemporalExtent}
              // onViewportChange={this.onViewportChange}
              staticLayers={map.staticLayers}
            />
          )}
        </div>
      </div>
    )
  }
}

export default MapPage
