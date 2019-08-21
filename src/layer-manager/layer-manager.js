import { useEffect, useRef, useState } from 'react'
import LayerManagerLib from './lib'

export function useLayerManager(layers, config) {
  const [mapStyle, setMapStyle] = useState(null)
  const [loading, setLoading] = useState(false)

  const LayerManagerRef = useRef(new LayerManagerLib(config))

  useEffect(() => {
    const getGlStyles = async () => {
      // Initial option
      // let mapStyle = await LayerManagerRef.current.getGLStyle(layers)
      // if (!ignore) {
      //   setMapStyle(mapStyle)
      // }

      // Callback option
      // const mapStyle = LayerManagerRef.current.getGLStyle(layers, setMapStyle, setLoading(false))

      const [mapStyle, promises] = LayerManagerRef.current.getGLStyle(layers)
      setMapStyle(mapStyle)
      if (promises.length) {
        setLoading(true)
        await Promise.all(
          promises.map((p) => {
            return p.then((asyncMapStyle) => {
              setMapStyle(asyncMapStyle)
            })
          })
        )
        setLoading(false)
      }
    }
    getGlStyles()
  }, [layers])

  return [mapStyle, loading]
}

function LayerManager(props) {
  const { layers, config } = props
  const [mapStyle, loading] = useLayerManager(layers, config)

  return props.children ? props.children({ mapStyle, loading }) : null
}

export default LayerManager
