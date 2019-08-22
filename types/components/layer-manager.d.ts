import React from 'react'
import { AnySourceImpl, Layer } from 'mapbox-gl'

export interface LayerManagerGenerator {
  type: string
  getStyle: (
    layer: LayerManagerLayer
  ) => {
    id: string
    sources: [AnySourceImpl]
    layers: [Layer]
  }
}

export interface LayerManagerOptions {
  generators: { [key: string]: LayerManagerGenerator }
  version: string
  glyphs: string
  sprites: string
}

export interface LayerManagerLayer {
  id: string
  type: 'BACKGROUND' | 'BASEMAP' | 'CARTO_POLYGONS' | string
  data?: any
  visible?: boolean
  opacity?: number
  color?: string
}

export interface LayerManagerComponent {
  config?: LayerManagerOptions
  layers: LayerManagerLayer[]
}

export default class MapModule extends React.Component<LayerManagerComponent, any> {
  render(): JSX.Element
}
