import PropTypes from 'prop-types'

export const trackTypes = {
  id: PropTypes.string.isRequired,
  url: PropTypes.string,
  data: PropTypes.object,
  color: PropTypes.string,
  type: PropTypes.oneOf(['geojson', undefined]),
  layerTemporalExtents: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  fitBoundsOnLoad: PropTypes.bool,
}
