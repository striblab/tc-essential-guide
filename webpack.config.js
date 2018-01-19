/**
 * Webpack config for building project
 * https://webpack.js.org/
 */
const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  devtool: 'source-map',
  entry: ['whatwg-fetch', './app/index.js'],
  output: {
    path: path.resolve(__dirname, './build'),
    filename: 'app.bundle.js',
    chunkFilename: '[name].[id].js'
  },
  module: {
    rules: [
      {
        test: /app\/(.*\.js|svelte-components\/.*\.html)$/,
        loader: 'babel-loader',
        options: {
          cacheDirectory: true
        }
      },
      {
        test: /app\/svelte-components\/.*\.html$/,
        exclude: /node_modules/,
        use: {
          loader: 'svelte-loader',
          options: {
            hydratable: true,
            store: true
          }
        }
      }
    ]
  },
  plugins: [
    new UglifyJSPlugin({
      sourceMap: true
    })
  ]
};
