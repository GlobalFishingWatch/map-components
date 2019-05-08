import * as React from 'react'

export interface MapModuleViewport {
  zoom?: number
  center?: number[]
}

export interface MapModuleHeatmapLayers {
  id: string
  tilesetId?: string
  subtype?: string
  visible?: boolean
  hue?: number
  opacity?: number
  filters?: {
    hue?: number
    filterValues?: Object
  }[]
  header: {
    endpoints?: Object
    isPBF?: boolean
    colsByName?: Object
    temporalExtents?: (number[])[]
    temporalExtentsLess?: boolean
  }
  interactive?: boolean
}

export interface MapModuleBasemapLayers {
  id?: string
  visible?: boolean
}

export interface MapModuleStaticLayers {
  id: string
  visible?: boolean
  selected?: boolean
  selectedFeatures?: {
    field?: string
    values?: string[]
  }
  highlighted?: boolean
  higlightedFeatures?: {
    field?: string
    values?: string[]
  }
  opacity?: number
  color?: string
  showLabels?: boolean
  interactive?: boolean
  filters?: (string[])[]
  isCustom?: boolean
  subtype?: any
  url?: string
  data?: Object
  gl?: Object
}

export interface MapModuleHoverPopup {
  content?: React.ReactNode
  latitude: number
  longitude: number
}

export interface MapModuleClickPopup {
  content?: React.ReactNode
  latitude: number
  longitude: number
}

export interface MapModuleProps {
  token?: string
  viewport: MapModuleViewport
  tracks?: any[]
  heatmapLayers?: MapModuleHeatmapLayers[]
  temporalExtent?: Date[]
  highlightTemporalExtent?: Date[]
  loadTemporalExtent?: Date[]
  basemapLayers?: MapModuleBasemapLayers[]
  staticLayers?: MapModuleStaticLayers[]
  hoverPopup?: MapModuleHoverPopup
  clickPopup?: MapModuleClickPopup
  glyphsPath?: string
  onViewportChange?: (...args: any[]) => any
  onLoadStart?: (...args: any[]) => any
  onLoadComplete?: (...args: any[]) => any
  onClick?: (...args: any[]) => any
  onHover?: (...args: any[]) => any
  onAttributionsChange?: (...args: any[]) => any
  onClosePopup?: (...args: any[]) => any
}

export default class MapModule extends React.Component<MapModuleProps, any> {
  render(): JSX.Element
}
