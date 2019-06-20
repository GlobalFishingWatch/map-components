import 'react-app-polyfill/ie11'
import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'

// Polyfill for older browsers (IE11 for example)
window.Promise = window.Promise || Promise

ReactDOM.render(<App />, document.getElementById('root'))
