import { combineReducers } from 'redux'

import ModuleReducer from '../module/module.reducer'
import TracksReducer from '../tracks/tracks.reducer'
import HeatmapReducer from '../heatmap/heatmap.reducer'
import HeatmapTilesReducer from '../heatmap/heatmapTiles.reducer'
import ViewportReducer from '../glmap/viewport.reducer'
import StyleReducer from '../glmap/style.reducer'
import InteractionReducer from '../glmap/interaction.reducer'

const mapReducer = combineReducers({
  module: ModuleReducer,
  tracks: TracksReducer,
  heatmap: HeatmapReducer,
  heatmapTiles: HeatmapTilesReducer,
  style: StyleReducer,
  viewport: ViewportReducer,
  interaction: InteractionReducer,
})

export default mapReducer
