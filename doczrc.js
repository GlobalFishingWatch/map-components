import { css } from 'docz-plugin-css'

export default {
  hashRouter: true,
  title: 'GFW UI components',
  description: 'UI components used in Global Fishing Watch',
  base: '/map-components/',
  themeConfig: {
    colors: {
      primary: '#e54430',
      text: '#33447e',
    },
  },
  plugins: [
    css({
      preprocessor: 'postcss',
      cssmodules: true,
    }),
  ],
}
