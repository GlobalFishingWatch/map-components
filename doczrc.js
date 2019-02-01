import { css } from 'docz-plugin-css'

export default {
  hashRouter: true,
  plugins: [
    css({
      preprocessor: 'postcss',
      cssmodules: true,
    }),
  ],
}
