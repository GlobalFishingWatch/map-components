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

import pkg from './package.json'

const distFolder = pkg.main.split('/')[0]

const isProduction = process.env.NODE_ENV === 'production'

export default {
  input: ['./src/**/index.js'],
  output: {
    dir: distFolder,
    format: 'esm',
    sourcemap: true,
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
    commonjs(),
    isProduction && terser(),
  ],
}
