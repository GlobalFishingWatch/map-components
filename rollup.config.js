import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import external from 'rollup-plugin-peer-deps-external'
import postcss from 'rollup-plugin-postcss'
import resolve from 'rollup-plugin-node-resolve'
import url from 'rollup-plugin-url'
import json from 'rollup-plugin-json'
import reactSvg from 'rollup-plugin-react-svg'

import pkg from './package.json'

export default {
  input: 'src/index.js',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
    },
  ],
  plugins: [
    json(),
    reactSvg({
      // svgo options
      svgo: {
        plugins: [], // passed to svgo
        multipass: true,
      },
      // whether to output jsx
      jsx: false,
      // include: string
      include: null,
      // exclude: string
      exclude: null,
    }),
    external(),
    postcss({ modules: true }),
    url(),
    babel({ exclude: 'node_modules/**' }),
    resolve(),
    commonjs(),
  ],
}
