import { BACKGROUND_TYPE as BACKGROUND } from './lib/generators/background/background'
import { BASEMAP_TYPE as BASEMAP } from './lib/generators/basemap/basemap'
import { CARTO_TYPE as CARTO } from './lib/generators/carto/carto'

const TYPES = { BASEMAP, CARTO, BACKGROUND }
export { TYPES }

export { default } from './layer-manager'
export { useLayerManager } from './layer-manager'
