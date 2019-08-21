import LayerManagerLib from '../lib/index'
import { DEFAULT_CONFIG } from '../lib/constants'
import { validate as mapboxStyleValidator } from '@mapbox/mapbox-gl-style-spec'

test('instanciates with the default config', async () => {
  const layerManager = new LayerManagerLib()
  const objectToMatch = { ...DEFAULT_CONFIG }
  const styles = layerManager.getGLStyle()
  expect(styles).toMatchObject(objectToMatch)
  // expect(layerManager.getGLStyle(glyphPath)).toMatchSnapshot()
})

test('check valid style.json format', async () => {
  const LayerManager = new LayerManagerLib()
  const style = LayerManager.getGLStyle()
  const errors = mapboxStyleValidator(style)
  if (errors.length) {
    console.log('Errors found in style validation:', errors)
  }
  expect(errors.length).toBe(0)
})
