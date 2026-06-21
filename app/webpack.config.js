const path = require('path')

const elpisRoot = path.dirname(require.resolve('@lh199.123/elpis/package.json'))

module.exports = {
  resolve: {
    alias: {
      $retailAuth: path.resolve(process.cwd(), 'app/pages/common/auth.js'),
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve(process.cwd(), 'node_modules/three'),
        use: {
          loader: require.resolve('babel-loader', { paths: [elpisRoot] }),
          options: {
            presets: [[require.resolve('@babel/preset-env', { paths: [elpisRoot] }), { modules: false }]],
            plugins: [require.resolve('@babel/plugin-transform-runtime', { paths: [elpisRoot] })],
          },
        },
      },
    ],
  },
}
