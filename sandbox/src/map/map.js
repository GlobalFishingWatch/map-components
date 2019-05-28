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
      center: [0, -80],
      zoom: 4,
    },
    fishingHeaders: null,
  }

  loadTemporalExtent = [new Date(2017, 12, 1), new Date(2017, 11, 31)]

  componentDidMount() {
    const promises = [
      'https://api-dot-skytruth-pelagos-production.appspot.com/v2/tilesets/gfw-tasks-657-uvi-v2/header',
      'https://api-dot-skytruth-pelagos-production.appspot.com/v2/tilesets/gfw-tasks-872-peruvian-nn-public-v1/header'
    ].map(
      url => fetch(url).then(res => res.json())
    )
    Promise.all(promises)
      .then(headers => {
        this.setState({
          fishingHeaders: headers
        })
      })
  }

  onViewportChange = ({ zoom, center }) => {
    this.setState({ viewport: { zoom, center } })
  }


  onFeatureClick = (event) => {
    console.log(event)
  }

  onFeatureHover = (event) => {
    // console.log(event)
  }

  render() {
    const { viewport, temporalExtent, fishingHeaders } = this.state

    let heatmapLayers = []
    if (fishingHeaders !== null) {
      heatmapLayers = [
        {
          id: 'fishing_ais',
          tilesetId: 'gfw-tasks-657-uvi-v2',
          hue: 200,
          opacity: 1,
          visible: true,
          interactive: true,
          filters: [],
          header: fishingHeaders[0],
        },
        // {
        //   id: 'peru-public-fishing',
        //   tilesetId: 'gfw-tasks-872-peruvian-nn-public-v1',
        //   hue: 100,
        //   opacity: 1,
        //   visible: true,
        //   interactive: true,
        //   filters: [],
        //   header: fishingHeaders[1],
        // }
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
          autoClusterZoom={false}
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
              interactive: true
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
