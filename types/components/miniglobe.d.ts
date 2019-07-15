import * as React from 'react'

export interface MiniGlobeBounds {
  north?: number
  south?: number
  west?: number
  east?: number
}

export interface MiniGlobeProps {
  center: number[]
  zoom: number
  bounds: MiniGlobeBounds
  size: number
  viewportThickness: number
}

export default class MiniGlobe extends React.Component<MiniGlobeProps, any> {
  render(): JSX.Element
}
