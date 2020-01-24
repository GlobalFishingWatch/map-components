import BackgroundGenerator, { BACKGROUND_TYPE as BACKGROUND } from './background/background'
import BaseMapGenerator, { BASEMAP_TYPE as BASEMAP } from './basemap/basemap'
import GLStyleGenerator, { GL_TYPE as GL } from './gl/gl'
import CartoGenerator, {
  CARTO_POLYGONS_TYPE as CARTO_POLYGONS,
  CARTO_FISHING_MAP_API,
} from './carto-polygons/carto-polygons'
import HeatmapGenerator, {
  HEATMAP_TYPE,
  HEATMAP_GEOM_TYPES,
  HEATMAP_COLOR_RAMPS,
} from './heatmap/heatmap'

const TYPES = { BASEMAP, CARTO_POLYGONS, BACKGROUND, GL, HEATMAP_TYPE }
export { TYPES }

export { HEATMAP_GEOM_TYPES, HEATMAP_COLOR_RAMPS }

export default {
  [BACKGROUND]: new BackgroundGenerator(),
  [BASEMAP]: new BaseMapGenerator(),
  [GL]: new GLStyleGenerator(),
  [CARTO_POLYGONS]: new CartoGenerator({ baseUrl: CARTO_FISHING_MAP_API }),
  [HEATMAP_TYPE]: new HeatmapGenerator({}),
}
