const path = require('path')
const fs = require('fs')
const { override, babelInclude, addWebpackModuleRule } = require('customize-cra')

module.exports = function(config, env) {
  return Object.assign(
    config,
    override(
      babelInclude([
        path.resolve('src'),
        // https://github.com/webpack/webpack/issues/1643#issuecomment-288110248
        fs.realpathSync('node_modules/@globalfishingwatch/map-components/src'),
      ]),
      addWebpackModuleRule({
        test: /\.(html)$/,
        use: {
          loader: 'html-loader',
          options: {
            attrs: [':data-src']
          }
        }
      })
    )(config, env)
  )
}
