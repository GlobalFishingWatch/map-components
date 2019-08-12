function getMapStyle(glyphPath) {
  return {
    version: 8,
    glyphs: glyphPath,
    sources: {},
    layers: [],
  }
}

export { getMapStyle }

class LayerManagerLib {
  constructor(params) {
    this.glyphs = params.glyphs
  }

  getMapStyle = () => {
    return getMapStyle(this.glyphs)
  }
}

export default LayerManagerLib
