const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  // 解决 copy-webpack-plugin 和 html-webpack-plugin 的 index.html 冲突
  chainWebpack: config => {
    config.plugin('copy').tap(args => {
      if (args[0].patterns && args[0].patterns.length > 0) {
        if (!args[0].patterns[0].globOptions) {
          args[0].patterns[0].globOptions = {};
        }
        if (!args[0].patterns[0].globOptions.ignore) {
          args[0].patterns[0].globOptions.ignore = [];
        }
        if (!args[0].patterns[0].globOptions.ignore.includes('**/index.html')) {
          args[0].patterns[0].globOptions.ignore.push('**/index.html');
        }
      }
      return args;
    });
  },
  // 设置开发服务器端口为8080
  devServer: {
    host: '127.0.0.1',
    port: 8080
  },
  // 配置Node.js核心模块的polyfill
  configureWebpack: {
    resolve: {
      fallback: {
        path: false,
        fs: false,
        crypto: false,
        stream: false,
        os: false,
        util: false
      }
    }
  },
  // 配置Electron构建
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      // 主进程入口
      mainProcessFile: 'electron/main.js',
      // 预加载脚本
      preload: 'electron/preload.js',
      // 构建配置
      builderOptions: {
        appId: 'com.foreignscan.app',
        productName: '智能防务检测系统',
        win: {
          icon: './public/icon.ico'
        },
        mac: {
          icon: './public/icon.icns'
        }
      }
    }
  }
})
