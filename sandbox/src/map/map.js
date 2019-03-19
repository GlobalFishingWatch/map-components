import React, { Component } from 'react'

import MapModule from '@globalfishingwatch/map-components/src/map'

class MapPage extends Component {
  constructor(props) {
    super(props)
    this.state = {
      highlightTemporalExtent: [new Date(2017, 11, 1), new Date(2017, 11, 31)],
      viewport: {
        center: [0.026, 123.61],
        zoom: 5,
      },
    }
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

  render() {
    const { highlightTemporalExtent } = this.state
    return (
      <div>
        <MapModule
          tracks={this.tracks}
          viewport={this.viewport}
          temporalExtent={this.temporalExtent}
          loadTemporalExtent={this.loadTemporalExtent}
          highlightTemporalExtent={highlightTemporalExtent}
          onViewportChange={this.onViewportChange}
          staticLayers={[]}
        />
      </div>
    )
  }
}

export default MapPage
