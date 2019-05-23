import React, { Component } from 'react'
import MapModule from '@globalfishingwatch/map-components/src/map'
import styles from './map.module.css'

const someClusters = [
  {
    "type": "Feature",
    "properties": {
      "test": 42
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        2.8125,
        -0.17578097424708533
      ]
    }
  },
  {
    "type": "Feature",
    "properties": {},
    "geometry": {
      "type": "Point",
      "coordinates": [
        3.779296875,
        -0.21972602392080884
      ]
    }
  },
  {
    "type": "Feature",
    "properties": {},
    "geometry": {
      "type": "Point",
      "coordinates": [
        -4.658203125,
        -2.6357885741666065
      ]
    }
  },
  {
    "type": "Feature",
    "properties": {},
    "geometry": {
      "type": "Point",
      "coordinates": [
        3.1640625,
        -2.767477951092084
      ]
    }
  }
]

class MapPage extends Component {
  state = {
    temporalExtent: [new Date(2017, 1, 1), new Date(2017, 1, 31)],
    highlightTemporalExtent: [new Date(2017, 1, 1), new Date(2017, 1, 10)],
    viewport: {
      center: [0, 0],
      zoom: 3,
    },
    fishingHeader: null,
  }

  loadTemporalExtent = [new Date(2017, 12, 1), new Date(2017, 11, 31)]

  componentDidMount() {
    fetch('https://api-dot-skytruth-pelagos-production.appspot.com/v2/tilesets/gfw-tasks-657-uvi-v2/header')
      .then(res => res.json())
      .then(header => {
        this.setState({
          fishingHeader: header
        })
      })
  }

  onViewportChange = ({ zoom, center }) => {
    this.setState({ viewport: { zoom, center } })
  }


  onFeatureClick = (event) => {
    // console.log(event)
  }

  onFeatureHover = (event) => {
    // console.log(event)
  }

  render() {
    const { viewport, temporalExtent, fishingHeader } = this.state

    let heatmapLayers = []
    if (fishingHeader !== null) {
      heatmapLayers = [
        {
          id: 'fishing_ais',
          tilesetId: 'gfw-tasks-657-uvi-v2',
          hue: 200,
          opacity: 1,
          visible: true,
          interactive: true,
          filters: [],
          header: fishingHeader,
        }
      ]
    }


    return (
      <div className={styles.MapWrapper} onClick={() => { 
        this.setState({
          temporalExtent: [new Date(2017, 1, 1), new Date(2017, 3, 31)]
        })
      }}>
        click me
        <MapModule
          viewport={viewport}
          onViewportChange={this.onViewportChange}
          autoClusterZoom={true}
          heatmapLayers={heatmapLayers}
          // staticLayers={[]}
          staticLayers={[
            {
              id: 'encounters_ais',
              visible: true,
              interactive: true,
              color: '#eeff00'
            },
            {
              id: 'eez',
              visible: true,
              color: '#ff00ff',
              interactive: false
            },
            {
              id: 'events_encounter_vessel',
              visible: true,
              color: '#f56700',
              interactive: true,
              data: {
                "type": "FeatureCollection",
                "features": someClusters,
              }
            }
          ]}
          temporalExtent={temporalExtent}
          loadTemporalExtent={this.loadTemporalExtent}
          onClick={this.onFeatureClick}
          onHover={this.onFeatureHover}
        />
      </div>
    )
  }
}

export default MapPage
