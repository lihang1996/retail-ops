/**
 * @module app/webpack.config
 * @description Webpack 自定义配置：别名、加载器、插件扩展。
 *
 * 核心配置：
 * 1. 路径别名（简化 import 路径）
 * 2. Three.js 支持（Babel 转译）
 * 3. 移除暗色模式（自定义 HTML 插件）
 *
 * 与 elpis 框架集成：
 * - 复用框架的 Webpack 配置
 * - 扩展框架的 loader 和 plugin
 * - 共享框架的依赖（Element Plus、Vue Router）
 */
const path = require('path')

// 获取 elpis 框架根目录（复用框架依赖）
const elpisRoot = path.dirname(require.resolve('@lh199.123/elpis/package.json'))
const HtmlWebpackPlugin = require(require.resolve('html-webpack-plugin', { paths: [elpisRoot] }))

/**
 * 自定义 HTML 插件：移除 elpis 框架默认的暗色模式
 * 将 <html class="dark"> 改为 <html>
 */
class RetailLightHtmlPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('RetailLightHtmlPlugin', (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tap('RetailLightHtmlPlugin', (data) => {
        // 移除 dark class（本项目使用浅色主题）
        data.html = data.html.replace(/<html\s+class=["']dark["']>/i, '<html>')
        return data
      })
    })
  }
}

module.exports = {
  /**
   * 路径别名配置
   * 简化 import 路径，提升开发体验
   */
  resolve: {
    alias: {
      // 业务权限模块别名
      $retailAuth: path.resolve(process.cwd(), 'app/pages/common/auth.js'),

      // Element Plus（复用框架依赖，避免重复打包）
      'element-plus$': require.resolve('element-plus', { paths: [elpisRoot] }),

      // Vue Router（复用框架依赖）
      'vue-router$': require.resolve('vue-router', { paths: [elpisRoot] }),

      // Element Plus 中文语言包
      $elementPlusZhCn: path.resolve(elpisRoot, 'node_modules/element-plus/es/locale/lang/zh-cn.mjs'),

      // ECharts（复用框架依赖）
      echarts$: require.resolve('echarts', { paths: [elpisRoot] }),
    },
  },

  /**
   * 模块加载规则
   */
  module: {
    rules: [
      {
        // Three.js 支持：将 ES6+ 代码转译为 ES5
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

  /**
   * 插件配置
   */
  plugins: [
    new RetailLightHtmlPlugin(),  // 移除暗色模式
  ],
}
