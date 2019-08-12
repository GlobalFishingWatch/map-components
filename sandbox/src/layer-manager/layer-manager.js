import React, { Component } from 'react'
import ReactMapGL from 'react-map-gl'
import styles from './layer-manager.module.css'

import LayerManager from '@globalfishingwatch/map-components/src/layer-manager'

class MapPage extends Component {
  state = {
    viewport: {
      width: 400,
      height: 400,
      latitude: 37.7577,
      longitude: -122.4376,
      zoom: 8
    }
  }

  onViewportChange = (e) => {
    console.log(e)
  }

  render() {
    return (
      <div className={styles.MapWrapper}>
        <LayerManager
          glyphs='https://raw.githubusercontent.com/GlobalFishingWatch/map-gl-glyphs/master/_output/{fontstack}/{range}.pbf?raw=true'
        >
          {({ mapStyle }) => {
            console.log('TCL: mapStyle', mapStyle)
            return (
              <ReactMapGL
                {...this.state.viewport}
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
