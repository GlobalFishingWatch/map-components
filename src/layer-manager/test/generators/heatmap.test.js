import LayerManagerLib from '../../lib/index'
import { validate as mapboxStyleValidator } from '@mapbox/mapbox-gl-style-spec'
import HeatmapGenerator, {
  HEATMAP_TYPE,
  GEOM_TYPES,
  COLOR_RAMPS,
} from '../../lib/generators/heatmap/heatmap.js'

const FAST_TILES_API = 'https://fst-tiles-jzzp2ui3wq-uc.a.run.app/v1/'

test('returns a valid style for a simple static gridded heatmap', async () => {
  const id = 'heatmap_test'
  const tileset = 'fishing_64cells'

  const LAYER_DEFINITION = {
    id,
    tileset,
    start: '2019-01-01T00:00:00.000Z',
    end: '2019-04-01T00:00:00.000Z',
    visible: true,
    geomType: GEOM_TYPES.GRIDDED,
    colorRamp: COLOR_RAMPS.PRESENCE,
    colorRampMult: 40,
    // passive: false,
    // serverSideFilters: "flag=='ESP'",
  }

  const heatmapGenerator = new HeatmapGenerator({ fastTilesAPI: FAST_TILES_API })
  const heatmapStyle = heatmapGenerator.getStyle(LAYER_DEFINITION)

  const LayerManager = new LayerManagerLib()
  const { style } = LayerManager.getGLStyle([
    {
      type: HEATMAP_TYPE,
      ...LAYER_DEFINITION,
    },
  ])

  // TODO I'm not sure why LM.getStyle sometimes return a style within an object, sometimes not
  const errors = mapboxStyleValidator(style)
  if (errors.length) {
    console.log('Errors found in style validation:', errors)
  }
  expect(errors.length).toBe(0)

  expect(heatmapStyle).toMatchObject({
    id,
    layers: [
      {
        id,
        type: 'fill',
        source: id,
        'source-layer': tileset,
        layout: {
          visibility: 'visible',
        },
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['to-number', ['get', '0']],
            0,
            'rgba(0, 0, 0, 0)',
            0.4,
            '#0c276c',
            16,
            '#114685',
            32,
            '#00ffc3',
            40,
            '#ffffff',
          ],
        },
      },
    ],
    sources: [
      {
        id,
        type: 'vector',
        tiles: [
          'http://__fast_tiles__/{z}/{x}/{y}?geomType=gridded&tileset=fishing_64cells&fastTilesAPI=https%3A%2F%2Ffst-tiles-jzzp2ui3wq-uc.a.run.app%2Fv1%2F&delta=90',
        ],
      },
    ],
  })
})
