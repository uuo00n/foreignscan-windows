const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  // 设置开发服务器端口为8080
  devServer: {
    port: 8080
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