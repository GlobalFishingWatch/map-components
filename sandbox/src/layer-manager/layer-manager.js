import React, { Component } from 'react'
import ReactMapGL from 'react-map-gl'
import styles from './layer-manager.module.css'

import LayerManager from '@globalfishingwatch/map-components/src/layer-manager'

class MapPage extends Component {
  state = {
    viewport: {
      width: '100%',
      height: '100%',
      latitude: 37.7577,
      longitude: -122.4376,
      zoom: 8
    }
  }

  layers = [{ id: 'north-star', type: 'basemap' }]

  onViewportChange = (viewport) => {
    this.setState({ viewport })
  }

  render() {
    return (
      <div className={styles.MapWrapper}>
        <LayerManager
          layers={this.layers}
        >
          {({ mapStyle }) => {
            return (
              <ReactMapGL
                {...this.state.viewport}
                mapStyle={mapStyle}
                onViewportChange={this.onViewportChange}
              />
            )
          }}
        </LayerManager>
      </div>
    )
  }
}

export default MapPage
