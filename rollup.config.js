import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import external from 'rollup-plugin-peer-deps-external'
import postcss from 'rollup-plugin-postcss'
import resolve from 'rollup-plugin-node-resolve'
import url from 'rollup-plugin-url'
import json from 'rollup-plugin-json'
import svgr from '@svgr/rollup'
import { terser } from 'rollup-plugin-terser'
import multiInput from 'rollup-plugin-multi-input'
import replace from 'rollup-plugin-replace'
import visualizer from 'rollup-plugin-visualizer'
import pkg from './package.json'

require('dotenv').config()

const distFolder = pkg.main.split('/')[0]

const isProduction = process.env.NODE_ENV === 'production'
const bundleVisualizer = process.env.BUNDLE_VISUALIZER === 'true' && !isProduction

export default {
  input: ['./src/**/index.js'],
  output: {
    dir: distFolder,
    format: 'esm',
    sourcemap: !isProduction,
  },
  plugins: [
    json(),
    svgr(),
    external(),
    multiInput(),
    postcss({ modules: true }),
    url(),
    babel({ exclude: 'node_modules/**' }),
    resolve(),
    commonjs({ include: 'node_modules/**' }),
    replace({
      'process.env.MAP_REDUX_REMOTE_DEBUG': process.env.MAP_REDUX_REMOTE_DEBUG === 'true',
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
    bundleVisualizer && visualizer({ title: 'GFW Components bundle sizes' }),
    isProduction && terser(),
  ],
}
