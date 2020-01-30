import React from 'react'
import ReactDom from 'react-dom/server'
import Header from './header'
import fs from 'fs'
import util from 'util'

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)

const components = [
  { component: <Header />, path: 'src/header/html/header.html' },
  { component: <Header mini />, path: 'src/header/html/header-mini.html' },
  { component: <Header inverted />, path: 'src/header/html/header-inverted.html' },
  { component: <Header mini inverted />, path: 'src/header/html/header-mini-inverted.html' },
]

async function preRender(components: any) {
  const styles = await readFile('src/header/header.css')
  const script = await readFile('src/header/header-scripts.js')

  for (let i = 0, length = components.length; i < length; i++) {
    const { component, path } = components[i]
    const markup = ReactDom.renderToStaticMarkup(component)
    const html = `<style>\n${styles}</style>\n${markup}\n${script}`
    try {
      await writeFile(path, html)
      console.log(`Wrote ${path}`)
    } catch (e) {
      console.log(e)
    }
  }
}

preRender(components)
