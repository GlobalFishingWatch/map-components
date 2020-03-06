import { useEffect, useState } from 'react'

const applyStyleTransformations = (style, styleTransformations) => {
  let newStyle = style
  styleTransformations.forEach((t) => {
    newStyle = t(newStyle)
  })
  return newStyle
}

function useMapStyler(
  layerComposer,
  styleTransformations,
  generatorConfigs,
  globalGeneratorConfig
) {
  const [mapStyle, setMapStyle] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const getGlStyles = async () => {
      const { style, promises } = layerComposer.getGLStyle(generatorConfigs, globalGeneratorConfig)
      setMapStyle(applyStyleTransformations(style, styleTransformations))
      if (promises && promises.length) {
        setLoading(true)
        await Promise.all(
          promises.map((p) => {
            return p.then(({ style }) => {
              setMapStyle(applyStyleTransformations(style, styleTransformations))
            })
          })
        )
        setLoading(false)
      }
    }
    getGlStyles()
  }, [layerComposer, styleTransformations, generatorConfigs, globalGeneratorConfig])

  return [mapStyle, loading]
}

export default useMapStyler
