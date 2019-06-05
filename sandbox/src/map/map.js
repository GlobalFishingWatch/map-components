import React, { Component } from 'react'
import MapModule from '@globalfishingwatch/map-components/src/map'
import styles from './map.module.css'

class MapPage extends Component {
  state = {
    highlightTemporalExtent: [new Date(2017, 11, 1), new Date(2017, 11, 31)],
    viewport: {
      center: [0, 0],
      zoom: 3,
    }
  }

  loadTemporalExtent = [new Date(2017, 12, 1), new Date(2017, 11, 31)]
  temporalExtent = [new Date(2017, 1, 1), new Date(2017, 11, 31)]

  onViewportChange = ({ zoom, center }) => {
    if (this.state.workspaceAuto === false) {
      this.setState({ viewport: { zoom, center } })
    }
  }


  onFeatureClick = (event) => {
    console.log(event)
  }

  onFeatureHover = (event) => {
    if (event.type !== null) {
      console.log(event)
    }
  }

  render() {
    const { viewport } = this.state

    return (
      <div className={styles.MapWrapper}>
        <MapModule
          viewport={viewport}
          onViewportChange={this.onViewportChange}
          staticLayers={[]}
          // staticLayers={[
          //   {
          //     id: 'encounters_ais',
          //     visible: true,
          //     interactive: true,
          //     color: '#eeff00'
          //   },
          // ]}
          temporalExtent={this.temporalExtent}
          loadTemporalExtent={this.loadTemporalExtent}
          onClick={this.onFeatureClick}
          onHover={this.onFeatureHover}
        />
      </div>
    )
  }
}

export default MapPage
