// const ReactDOMServer = require('react-dom/server')
// const Header = require('../../components/header')
// console.log('TCL: Header', Header)

// const html = ReactDOMServer.renderToStaticMarkup(Header)
// console.log('TCL: html', html)

import React from 'react'
import ReactDom from 'react-dom/server'
import Header from './header'
import fs from 'fs'
import util from 'util'

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const components = [
  { component: <Header />, path: 'src/header/html/header.html' },
  { component: <Header mini />, path: 'src/header/html/header-mini.html' },
  { component: <Header inverted />, path: 'src/header/html/header-inverted.html' },
]

async function preRender(components: any) {
  const styles = await readFile('src/header/header.css')

  for (let i = 0, length = components.length; i < length; i++) {
    const { component, path } = components[i];
    const markup = ReactDom.renderToStaticMarkup(component)
    const html = `<styles>\n${styles}</style>\n${markup}`
    try {
      const file = await writeFile(path, html)
      console.log(`Wrote ${path}`)
    } catch(e) {
      console.log(e)
    }
  }
}

preRender(components)
