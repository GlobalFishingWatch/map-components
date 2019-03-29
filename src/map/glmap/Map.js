import React from 'react'
import PropTypes from 'prop-types'
import MapGL, { Popup } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
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

class Map extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      mouseOver: true,
    }
  }
  componentDidMount() {
    window.addEventListener('resize', this._resize)
    this._resize()

    // useful with FOUC
    window.setTimeout(() => this._resize(), 1)

    // there is a problem with the container width computation (only with "fat scrollbar" browser/os configs),
    // seems like the panels with scrollbars are taken into account or smth
    window.setTimeout(() => this._resize(), 10000)
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._resize)
  }

  _resize = () => {
    if (this._mapContainerRef === undefined) {
      console.warn('Cant set viewport on a map that hasnt finished intanciating yet')
      return
    }
    const mapContainerStyle = window.getComputedStyle(this._mapContainerRef)
    const width = parseInt(mapContainerStyle.width, 10)
    const height = parseInt(mapContainerStyle.height, 10) + 1

    if (width !== this.props.viewport.width || height !== this.props.viewport.height) {
      this.props.setViewport({
        ...this.props.viewport,
        width,
        height,
      })
    }
  }

  onViewportChange = (viewport) => {
    this.props.setViewport(viewport)
  }

  onMapInteraction = (event, type) => {
    // console.log(type, event, event.features)
    const callback = type === 'hover' ? this.props.mapHover : this.props.mapClick
    if (this.glMap !== undefined && event.features !== undefined && event.features.length) {
      const feature = event.features[0]
      if (feature.properties.cluster === true) {
        const clusterId = feature.properties.cluster_id
        const sourceId = feature.source
        const glSource = this.glMap.getSource(sourceId)
        glSource.getClusterExpansionZoom(clusterId, (err1, zoom) => {
          glSource.getClusterLeaves(clusterId, 99, 0, (err2, children) => {
            if (err1 || err2) {
              return
            }
            callback(event.lngLat[1], event.lngLat[0], event.features, {
              zoom,
              children,
            })
          })
        })
        return
      }
    }
    callback(event.lngLat[1], event.lngLat[0], event.features)
  }

  onHover = (event) => {
    this.onMapInteraction(event, 'hover')
  }

  onClick = (event) => {
    this.onMapInteraction(event, 'click')
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
      cursor,
      interactiveLayerIds,
    } = this.props
    return (
      <div
        id="map"
        className={styles.map}
        ref={(ref) => {
          this._mapContainerRef = ref
        }}
        onMouseLeave={() => {
          this.setState({ mouseOver: false })
        }}
        onMouseEnter={() => {
          this.setState({ mouseOver: true })
        }}
      >
        <MapGL
          ref={(ref) => {
            if (ref !== null) {
              this.glMap = ref.getMap()
            }
          }}
          onTransitionEnd={transitionEnd}
          onHover={this.onHover}
          onClick={this.onClick}
          getCursor={({ isDragging }) => {
            if (cursor === null) {
              return isDragging ? 'grabbing' : 'grab'
            }
            return cursor
          }}
          mapStyle={mapStyle}
          {...viewport}
          maxZoom={maxZoom}
          minZoom={minZoom}
          onViewportChange={this.onViewportChange}
          interactiveLayerIds={interactiveLayerIds}
        >
          <ActivityLayers loadTemporalExtent={this.props.loadTemporalExtent} />
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
  viewport: PropTypes.object,
  mapStyle: PropTypes.object,
  clickPopup: PropTypes.object,
  hoverPopup: PropTypes.object,
  maxZoom: PropTypes.number,
  minZoom: PropTypes.number,
  setViewport: PropTypes.func,
  mapHover: PropTypes.func,
  mapClick: PropTypes.func,
  onClosePopup: PropTypes.func,
  transitionEnd: PropTypes.func,
  cursor: PropTypes.string,
  interactiveLayerIds: PropTypes.arrayOf(PropTypes.string),
}

export default Map
