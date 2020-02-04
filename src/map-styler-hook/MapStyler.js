import useMapStyler from './'

function MapStyler(props) {
  const { layers } = props
  const [mapStyle, loading] = useMapStyler(layers)

  return props.children ? props.children({ mapStyle, loading }) : null
}

export default MapStyler
