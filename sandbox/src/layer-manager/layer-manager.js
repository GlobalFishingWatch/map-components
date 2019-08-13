import React, { Component } from 'react'
import ReactMapGL from 'react-map-gl'
import styles from './layer-manager.module.css'

import LayerManager from '@globalfishingwatch/map-components/src/layer-manager'

class MapPage extends Component {
  state = {
    mounted: false,
    viewport: {
      width: '100%',
      height: '100%',
      latitude: 37.7577,
      longitude: -122.4376,
      zoom: 8
    },
    layers: [
      { id: 'north-star', type: 'basemap' },
      { id: 'cp_rfmo', type: 'carto', color: '#58CFFF', opacity: 1 }
    ]
  }

  componentDidMount() {
    // eslint-disable-next-line react/no-direct-mutation-state
    this.state.mounted = true
  }

  toggleLayerOpacity = () => {
    this.setState((state) => {
      const layers = [...state.layers]
      layers[1].opacity = layers[1].opacity === 1 ? 0 : 1
      layers[1].color = '#'+Math.random().toString(16).substr(-6) // generates random color
      return { layers }
    })
  }

  render() {
    return (
      <div className={styles.MapWrapper}>
        <button className={styles.btnToggle} onClick={this.toggleLayerOpacity}>Toggle layer opacity and color</button>
        <LayerManager
          layers={this.state.layers}
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
