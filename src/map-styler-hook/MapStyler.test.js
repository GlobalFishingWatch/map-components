import React from 'react'
import ReactDOM from 'react-dom'
import { MapStyler } from './index'

it('no crashes without child', () => {
  const div = document.createElement('div')
  ReactDOM.render(<MapStyler />, div)
  ReactDOM.unmountComponentAtNode(div)
})

it('renders without crashing', () => {
  const div = document.createElement('div')
  ReactDOM.render(
    <MapStyler>
      {() => {
        return null
      }}
    </MapStyler>,
    div
  )
  ReactDOM.unmountComponentAtNode(div)
})
