import React from 'react'
import { AnySourceImpl, Layer } from '@types/mapbox-gl'

export interface LayerManagerGenerator {
  type: string
  getStyleSources: (layer: LayerManagerLayer) => AnySourceImpl
  getStyleLayers: (layer: LayerManagerLayer) => Layer
}

export interface LayerManagerOptions {
  generators: { [key: string]: LayerManagerGenerator }
  version: string
  glyphs: string
  sprites: string
}

export interface LayerManagerLayer {
  id: string
  type: 'background' | 'basemap' | 'carto'
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
