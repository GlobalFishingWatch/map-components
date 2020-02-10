import React from 'react'
import ReactDOM from 'react-dom'
import { LayerComposer } from './index'

it('no crashes without child', () => {
  const div = document.createElement('div')
  ReactDOM.render(<LayerComposer />, div)
  ReactDOM.unmountComponentAtNode(div)
})

it('renders without crashing', () => {
  const div = document.createElement('div')
  ReactDOM.render(
    <LayerComposer>
      {() => {
        return null
      }}
    </LayerComposer>,
    div
  )
  ReactDOM.unmountComponentAtNode(div)
})
