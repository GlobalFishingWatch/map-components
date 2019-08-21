import { useEffect, useRef, useState } from 'react'
import LayerManagerLib from './lib'

export function useLayerManager(layers, config) {
  const [mapStyle, setMapStyle] = useState(null)
  const [loading, setLoading] = useState(false)

  const LayerManagerRef = useRef(new LayerManagerLib(config))

  useEffect(() => {
    const getGlStyles = async () => {
      const { style, promises } = LayerManagerRef.current.getGLStyle(layers)
      setMapStyle(style)
      if (promises && promises.length) {
        setLoading(true)
        await Promise.all(
          promises.map((p) => {
            return p.then(({ style }) => {
              setMapStyle(style)
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
