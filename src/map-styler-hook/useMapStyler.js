import { useEffect, useState } from 'react'

function useMapStyler(layerComposer, layers) {
  const [mapStyle, setMapStyle] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const getGlStyles = async () => {
      const { style, promises } = layerComposer.getGLStyle(layers)
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
  }, [layerComposer, layers])

  return [mapStyle, loading]
}

export default useMapStyler
