import React, { Component } from 'react'

import MapModule from '@globalfishingwatch/map-components/components/map'

class MapPage extends Component {
  loadTemporalExtent = [new Date(2018, 0, 1), new Date(2018, 11, 31)]
  temporalExtent = [new Date(2018, 0, 1), new Date(2018, 11, 31)]
  viewport = {
    center: [0.026, 123.61],
    zoom: 5,
  }

  render() {
    return (
      <div>
        <MapModule
          tracks={[]}
          viewport={this.viewport}
          temporalExtent={this.temporalExtent}
          loadTemporalExtent={this.loadTemporalExtent}
          onViewportChange={(a, b, c) => {
            console.log(a, b, c)
          }}
          staticLayers={[]}
        />
      </div>
    )
  }
}

export default MapPage
