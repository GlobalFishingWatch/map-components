import { useEffect, useRef, useState } from 'react'
import LayerManagerLib from './lib'

export function useLayerManager(layers, config) {
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
  const { layers, config } = props
  const [mapStyle] = useLayerManager(layers, config)

  return props.children ? props.children({ mapStyle }) : null
}

export default LayerManager
