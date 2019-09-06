import React, { Component } from 'react'
import ReactMapGL from 'react-map-gl'
import styles from './layer-manager.module.css'

import LayerManager, { TYPES } from '@globalfishingwatch/map-components/src/layer-manager'

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
      { id: 'background', type: TYPES.BACKGROUND, color: '#00275c' },
      { id: 'north-star', type: TYPES.BASEMAP },
      {
        id: 'cp_rfmo',
        type: TYPES.CARTO_POLYGONS,
        color: '#58CFFF',
        opacity: 1,
        visible: true,
        selectedFeatures: {
          values: ['IATTC'],
          fill: {
            color: 'rgba(50, 139, 169, 0.3)',
          },
        },
      },
      {
        id: 'mpant',
        type: TYPES.CARTO_POLYGONS,
        color: '#58CFFF',
        opacity: 0,
      },
      // {
      //   id: 'eez',
      //   type: TYPES.CARTO_POLYGONS,
      //   color: '#A9ACFF',
      //   opacity: 1,
      // },
      // {
      //   id: 'bluefin_rfmo',
      //   type: TYPES.CARTO_POLYGONS,
      //   color: '#B3CF9F',
      //   opacity: 1,
      // },
    ]
  }

  componentDidMount() {
    // eslint-disable-next-line react/no-direct-mutation-state
    this.state.mounted = true
  }

  toggleLayerOpacity = () => {
    this.setState((state) => {
      const layers = state.layers.map(layer => {
        if (layer.id !== 'cp_rfmo' && layer.id !== 'mpant') return layer
        return ({
          ...layer,
          opacity: layer.opacity === 1 ? 0 : 1,
          color: '#'+Math.random().toString(16).substr(-6) // generates random color
        })
      })
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
          {({ mapStyle, loading }) => {
            console.log('TCL: MapPage -> render -> mapStyle', loading, mapStyle)
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
