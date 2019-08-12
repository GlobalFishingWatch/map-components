import * as layerManager from './index'
import { validate as mapboxStyleValidator } from '@mapbox/mapbox-gl-style-spec'

const glyphPath =
  'https://raw.githubusercontent.com/GlobalFishingWatch/map-gl-glyphs/master/_output/{fontstack}/{range}.pbf?raw=true'

test('returns the valid glyphs path', () => {
  const objectToMatch = {
    glyphs: glyphPath,
  }
  expect(layerManager.getMapStyle(glyphPath)).toMatchObject(objectToMatch)
  // expect(layerManager.getMapStyle(glyphPath)).toMatchSnapshot()
})

test('check valid style.json format', () => {
  const style = layerManager.getMapStyle(glyphPath)
  const errors = mapboxStyleValidator(style)
  if (errors.length) {
    console.log('Errors found in style validation:', errors)
  }
  expect(errors.length).toBe(0)
})
