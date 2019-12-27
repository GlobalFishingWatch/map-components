import HeatmapGenerator, { GEOM_TYPES, COLOR_RAMPS } from '../../lib/generators/heatmap/heatmap.js'

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
    passive: false,
    serverSideFilters: "flag=='ESP'",
  }
  const heatmapGenerator = new HeatmapGenerator({ fastTilesAPI: FAST_TILES_API })
  const styles = heatmapGenerator.getStyle(LAYER_DEFINITION)

  expect(styles).toMatchObject({
    id,
    layers: [
      // {
      //   id,
      //   // type: 'fill',
      //   // source: id,
      //   // 'source-layer': tileset,
      //   // layout: {
      //   //   visibility: 'visible',
      //   // },
      //   // paint: {},
      // },
    ],
    sources: [
      {
        id,
        type: 'vector',
        tiles: [
          'http://__heatmap__/{z}/{x}/{y}?geomType=gridded&tileset=fishing_64cells&fastTilesAPI=https%3A%2F%2Ffst-tiles-jzzp2ui3wq-uc.a.run.app%2Fv1%2F&delta=90',
        ],
      },
    ],
  })
})
