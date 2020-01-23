import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import html from 'rollup-plugin-html'
import external from 'rollup-plugin-peer-deps-external'
import postcss from 'rollup-plugin-postcss'
import autoprefixer from 'autoprefixer'
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

export default [
  {
    input: './src/fast-tiles-worker/index.js',
    output: {
      file: './workers-dist/fast-tiles-worker.js',
      format: 'iife',
      sourcemap: true,
      name: 'FastTilesWorker',
    },
    plugins: [resolve(), commonjs()],
  },
  {
    input: ['./src/**/index.js'],
    output: {
      dir: distFolder,
      format: 'esm',
      sourcemap: !isProduction,
    },
    plugins: [
      json(),
      svgr(),
      html({ include: '**/*.html' }),
      external(),
      multiInput(),
      postcss({
        modules: true,
        plugins: [autoprefixer()],
      }),
      url(),
      babel({ exclude: 'node_modules/**' }),
      resolve(),
      commonjs({ include: 'node_modules/**' }),
      replace({
        'process.env.MAP_REDUX_REMOTE_DEBUG': process.env.MAP_REDUX_REMOTE_DEBUG === 'true',
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      }),
      bundleVisualizer && visualizer({ title: 'GFW Components bundle sizes' }),
      isProduction &&
        terser({
          // TODO: improve this as layer manager generators are crashing with:
          // "Cannot call a class as a function" but can't find the reason why
          // so this increases a 30kb the bundle sizes but at least it works
          keep_fnames: true,
        }),
    ],
  },
]
