import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { geoOrthographic, geoPath } from 'd3-geo' // eslint-disable-line
import { feature } from 'topojson-client'
import styles from './miniglobe.module.css'
import jsonData from './ne_110m_land.json'

const DEFAULT_SETTINGS = {
  minZoom: 2.5,
  center: [0, 0],
  zoom: 3,
  bounds: {
    north: 25,
    south: -25,
    east: 40,
    west: -40,
  },
  size: 40,
  viewportThickness: 6,
}

class MiniGlobe extends Component {
  constructor() {
    super()
    this.state = {
      projection: null,
    }

    this.worldData = feature(jsonData, jsonData.objects.land).features
  }

  componentDidMount() {
    this.setProjection()
  }

  componentDidUpdate(nextProps) {
    if (
      this.props.center[0] !== nextProps.center[0] ||
      this.props.center[1] !== nextProps.center[1]
    ) {
      this.recenter()
    }
  }

  setProjection() {
    const { center, size } = this.props
    const [latitude, longitude] = center
    const projection = geoOrthographic()
      .translate([size / 2, size / 2])
      .scale(size / 2)
      .clipAngle(90)
    projection.rotate([-longitude, -latitude])
    this.setState({ projection })
  }

  recenter() {
    if (this.state.projection) {
      const { center } = this.props
      const [latitude, longitude] = center
      const updatedProjection = this.state.projection
      this.state.projection.rotate([-longitude, -latitude])
      this.setState({ projection: updatedProjection })
    }
  }

  render() {
    const { zoom, bounds, size, viewportThickness } = this.props
    if (bounds === undefined) {
      console.error('MiniGlobe: bounds not specified')
      return null
    }

    const { north, south, west, east } = bounds
    const viewportBoundsGeoJSON = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[west, north], [east, north], [east, south], [west, south], [west, north]]],
      },
    }

    return (
      <svg width={size} height={size} className={styles.globeSvg}>
        <circle className={styles.globeBackground} cx={size / 2} cy={size / 2} r={size / 2} />
        <g>
          {this.worldData.map((d, i) => (
            <path key={`path-${i}`} d={geoPath().projection(this.state.projection)(d)} />
          ))}
          {zoom > DEFAULT_SETTINGS.minZoom && (
            <path
              key="viewport"
              d={geoPath().projection(this.state.projection)(viewportBoundsGeoJSON)}
              className={styles.viewport}
              style={{ strokeWidth: viewportThickness }}
            />
          )}
        </g>
      </svg>
    )
  }
}

MiniGlobe.propTypes = {
  center: PropTypes.arrayOf(PropTypes.number).isRequired,
  zoom: PropTypes.number.isRequired,
  bounds: PropTypes.shape({
    north: PropTypes.number,
    south: PropTypes.number,
    west: PropTypes.number,
    east: PropTypes.number,
  }).isRequired,
  size: PropTypes.number.isRequired,
  viewportThickness: PropTypes.number.isRequired,
}

MiniGlobe.defaultProps = {
  center: DEFAULT_SETTINGS.center,
  zoom: DEFAULT_SETTINGS.zoom,
  bounds: DEFAULT_SETTINGS.bounds,
  size: DEFAULT_SETTINGS.size,
  viewportThickness: DEFAULT_SETTINGS.viewportThickness,
}

export default MiniGlobe
