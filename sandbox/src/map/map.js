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
      center: [-40, -80],
      zoom: 4,
    },
    fishingHeaders: null,
    showHeatmap: false,
    workspaceGL: []
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
          fishingHeaders: headers,
          // workspaceGL: [
          //   {
          //     "id": "chile_aquaculture",
          //     "url": "https://api-dot-world-fishing-827.appspot.com/v2/tilesets/test-chile-seconds-transport-v1/{z}%2F{x}%2F{y}.pbf",
          //     "color": "#2ef031",
          //     "visible": true,
          //     "gl": {
          //       "source": {
          //         "type": "vector",
          //         "tiles": [],
          //         "maxzoom": 3
          //       },
          //       "layers": [
          //         {
          //           "type": "circle",
          //           "source-layer": "chile_aquaculture",
          //           "metadata": {
          //             // "gfw:temporal": true,
          //             "mapbox:group": "temporal"
          //           },
          //           "paint": {
          //             "circle-radius": 3,
          //             "circle-opacity": 0.9,
          //             "circle-color": "#2ef031"
          //           },
          //           "layout": {
          //             "visibility": "visible"
          //           }
          //         },
          //       ]
          //     }
          //   }
          // ]
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
    const { viewport, temporalExtent, fishingHeaders, showHeatmap, workspaceGL } = this.state

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
    console.log(workspaceGL)
    return (
      <div className={styles.MapWrapper}>
        <div onClick={() => { 
          this.setState(state => ({
            // showHeatmap: !state.showHeatmap,
            temporalExtent: [new Date(2017, 1, 1), new Date(2017, 3, 31)]
          }))
        }}>
          showHeatmap:{showHeatmap.toString()}
        </div>
        <MapModule
          viewport={viewport}
          onViewportChange={this.onViewportChange}
          autoClusterZoom={false}
          heatmapLayers={showHeatmap ? heatmapLayers : []}
          // staticLayers={[]}
          staticLayers={[
            {
              "id": "chile_aquaculture",
              "url": "https://api-dot-world-fishing-827.appspot.com/v2/tilesets/test-chile-seconds-transport-v1/{z}%2F{x}%2F{y}.pbf",
              "color": "#2ef031",
              "visible": true,
              "gl": {
                "source": {
                  "type": "vector",
                  "tiles": [],
                  "maxzoom": 3
                },
                "layers": [
                  {
                    "type": "circle",
                    "source-layer": "chile_aquaculture",
                    "metadata": {
                      // "gfw:temporal": true,
                      "mapbox:group": "temporal"
                    },
                    "paint": {
                      "circle-radius": 3,
                      "circle-opacity": 0.9,
                      "circle-color": "#2ef031"
                    },
                    "layout": {
                      "visibility": "visible"
                    }
                  },
                ]
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