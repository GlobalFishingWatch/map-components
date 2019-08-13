import { useEffect, useRef, useState } from 'react'
import LayerManagerLib from './lib'

export function useLayerManager(config, layers) {
  const [mapStyle, setMapStyle] = useState(null)

  const LayerManagerRef = useRef(new LayerManagerLib({ ...config }))

  useEffect(() => {
    let ignore = false
    const getGlStyles = async () => {
      const mapStyle = await LayerManagerRef.current.getGLStyle(layers)
      if (!ignore) {
        setMapStyle(mapStyle)
      }
    }
    getGlStyles()
    return () => {
      ignore = true
    }
  }, [layers])

  return [mapStyle]
}

function LayerManager(props) {
  const { config, layers } = props
  const [mapStyle] = useLayerManager(config, layers)
  console.log('TCL: mapStyle', mapStyle)
  return props.children({ mapStyle })
}

export default LayerManager
