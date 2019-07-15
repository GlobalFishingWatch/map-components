import React from 'react'
import PropTypes from 'prop-types'
import MapGL, { Popup } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { TILES_URL_NEEDING_AUTHENTICATION } from '../config'
import ActivityLayers from '../activity/ActivityLayers.container.js'
import styles from './map.css'

const PopupWrapper = (props) => {
  const { latitude, longitude, children, closeButton, onClose } = props
  return (
    <Popup
      latitude={latitude}
      longitude={longitude}
      closeButton={closeButton}
      onClose={onClose}
      anchor="bottom"
      offsetTop={-10}
      tipSize={4}
      closeOnClick={false}
    >
      {children}
    </Popup>
  )
}

PopupWrapper.propTypes = {
  latitude: PropTypes.number.isRequired,
  longitude: PropTypes.number.isRequired,
  children: PropTypes.node.isRequired,
  closeButton: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
}

PopupWrapper.defaultProps = {
  onClose: () => {},
}

class Map extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      mouseOver: true,
    }
    this._mapContainerRef = null
    this._containerResizeObserver = new ResizeObserver(this._containerResize)
  }

  _containerResize = (entries) => {
    const mapContainerStyle = entries[0].contentRect
    const width = mapContainerStyle.width
    const height = mapContainerStyle.height + 1

    if (width !== this.props.viewport.width || height !== this.props.viewport.height) {
      this.props.setViewport({
        ...this.props.viewport,
        width,
        height,
      })
    }
  }

  componentWillUnmount() {
    this._containerResizeObserver.disconnect()
  }

  onViewportChange = (viewport) => {
    this.props.setViewport(viewport)
  }

  onMapInteraction = (event, type) => {
    this.props.mapInteraction(
      type,
      event.lngLat[1],
      event.lngLat[0],
      event.features,
      this.glGetSource
    )
  }

  onHover = (event) => {
    this.onMapInteraction(event, 'hover')
  }

  onClick = (event) => {
    this.onMapInteraction(event, 'click')
  }

  getRef = (ref) => {
    if (ref !== null) {
      this.glMap = ref.getMap()
      this.glGetSource = this.glMap.getSource.bind(this.glMap)
    }
  }

  getCursor = ({ isDragging }) => {
    const { cursor } = this.props
    if (cursor === null) {
      return isDragging ? 'grabbing' : 'grab'
    }
    return cursor
  }

  transformRequest = (url, resourceType) => {
    const { token } = this.props
    if (token !== null && resourceType === 'Tile' && url.match(TILES_URL_NEEDING_AUTHENTICATION)) {
      return {
        url: url,
        headers: { Authorization: 'Bearer ' + token },
      }
    }
  }

  render() {
    const {
      viewport,
      maxZoom,
      minZoom,
      transitionEnd,
      mapStyle,
      onClosePopup,
      clickPopup,
      hoverPopup,
      hasHeatmapLayers,
      interactiveLayerIds,
    } = this.props
    return (
      <div
        id="map"
        className={styles.map}
        ref={(ref) => {
          this._mapContainerRef = ref
          if (this._mapContainerRef !== null) {
            this._containerResizeObserver.observe(this._mapContainerRef)
          }
        }}
        onMouseLeave={() => {
          this.setState({ mouseOver: false })
        }}
        onMouseEnter={() => {
          this.setState({ mouseOver: true })
        }}
      >
        <MapGL
          ref={this.getRef}
          transformRequest={this.transformRequest}
          onTransitionEnd={transitionEnd}
          onHover={this.onHover}
          onClick={this.onClick}
          getCursor={this.getCursor}
          mapStyle={mapStyle}
          {...viewport}
          maxZoom={maxZoom}
          minZoom={minZoom}
          onViewportChange={this.onViewportChange}
          interactiveLayerIds={interactiveLayerIds}
          clickRadius={4}
        >
          {hasHeatmapLayers !== false && <ActivityLayers />}
          {clickPopup !== undefined && clickPopup !== null && (
            <PopupWrapper
              latitude={clickPopup.latitude}
              longitude={clickPopup.longitude}
              closeButton
              onClose={onClosePopup}
            >
              {clickPopup.content}
            </PopupWrapper>
          )}
          {this.state.mouseOver === true && hoverPopup !== undefined && hoverPopup !== null && (
            <PopupWrapper
              latitude={hoverPopup.latitude}
              longitude={hoverPopup.longitude}
              closeButton={false}
            >
              {hoverPopup.content}
            </PopupWrapper>
          )}
        </MapGL>
        <div className={styles.googleLogo} />
      </div>
    )
  }
}

Map.propTypes = {
  token: PropTypes.string,
  viewport: PropTypes.object.isRequired,
  mapStyle: PropTypes.object.isRequired,
  clickPopup: PropTypes.object,
  hoverPopup: PropTypes.object,
  maxZoom: PropTypes.number.isRequired,
  minZoom: PropTypes.number.isRequired,
  setViewport: PropTypes.func.isRequired,
  mapInteraction: PropTypes.func,
  onClosePopup: PropTypes.func,
  transitionEnd: PropTypes.func,
  cursor: PropTypes.string,
  hasHeatmapLayers: PropTypes.bool.isRequired,
  interactiveLayerIds: PropTypes.arrayOf(PropTypes.string),
}

Map.defaultProps = {
  token: null,
  clickPopup: null,
  hoverPopup: null,
  mapInteraction: () => {},
  onClosePopup: () => {},
  transitionEnd: () => {},
  cursor: null,
  interactiveLayerIds: null,
}

export default Map
