import BackgroundGenerator, { BACKGROUND_TYPE as BACKGROUND } from './background/background'
import BaseMapGenerator, { BASEMAP_TYPE as BASEMAP } from './basemap/basemap'
import CartoGenerator, {
  CARTO_POLYGONS_TYPE as CARTO_POLYGONS,
  CARTO_FISHING_MAP_API,
} from './carto-polygons/carto-polygons'

const TYPES = { BASEMAP, CARTO_POLYGONS, BACKGROUND }
export { TYPES }

export default {
  [BACKGROUND]: new BackgroundGenerator(),
  [BASEMAP]: new BaseMapGenerator(),
  [CARTO_POLYGONS]: new CartoGenerator({ baseUrl: CARTO_FISHING_MAP_API }),
}
