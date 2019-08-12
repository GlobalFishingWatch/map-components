import { useRef, useMemo } from 'react'
import LayerManagerLib from './lib'

function LayerManager(props) {
  const LayerManagerRef = useRef(
    new LayerManagerLib({
      glyphs: props.glyphs,
    })
  )

  const mapStyle = useMemo(() => LayerManagerRef.current.getMapStyle(), [])
  return props.children({ mapStyle })
}

export default LayerManager
