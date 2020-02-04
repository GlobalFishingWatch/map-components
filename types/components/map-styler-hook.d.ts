import React from 'react'

export default interface useMapStyler {
  layerComposer: any
  layers: any[]
}

export class MapStyler extends React.Component<useMapStyler, any> {
  render(): JSX.Element
}
