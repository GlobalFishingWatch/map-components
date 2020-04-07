import { useEffect, useState } from 'react'

const applyStyleTransformations = (style, styleTransformations) => {
  if (!styleTransformations) return style
  let newStyle = style
  styleTransformations.forEach((t) => {
    newStyle = t(newStyle)
  })
  return newStyle
}

const defaultConfig = {}
function useMapStyler(layerComposer, generatorConfigs, config = defaultConfig) {
  const [mapStyle, setMapStyle] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const { styleTransformations, ...globalGeneratorConfig } = config
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
  }, [layerComposer, generatorConfigs, config])

  return [mapStyle, loading]
}

export default useMapStyler
