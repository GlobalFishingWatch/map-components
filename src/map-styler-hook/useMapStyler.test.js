import React from 'react'
import ReactDOM from 'react-dom'
import LayerManager from '../index'

it('no crashes without child', () => {
  const div = document.createElement('div')
  ReactDOM.render(<LayerManager />, div)
  ReactDOM.unmountComponentAtNode(div)
})

it('renders without crashing', () => {
  const div = document.createElement('div')
  ReactDOM.render(
    <LayerManager>
      {() => {
        return null
      }}
    </LayerManager>,
    div
  )
  ReactDOM.unmountComponentAtNode(div)
})
