const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const isDevelopment = process.env.NODE_ENV !== 'production';
// 统一后端地址配置：从前端配置文件读取
const { API_BASE } = require('../src/config/api.json');

// 保持对window对象的全局引用，避免JavaScript对象被垃圾回收时，窗口被自动关闭
let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  // 加载应用
  if (isDevelopment) {
    // 开发环境下，加载本地开发服务器
    mainWindow.loadURL('http://localhost:8080');
    // 通过环境变量控制是否打开开发者工具，默认不打开
    // 使用方式：在启动命令前设置 ELECTRON_OPEN_DEVTOOLS=true 才会打开
    // 例如：ELECTRON_OPEN_DEVTOOLS=true npm run electron:serve
    const shouldOpenDevTools = process.env.ELECTRON_OPEN_DEVTOOLS === 'true';
    if (shouldOpenDevTools) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    // 生产环境下，加载打包后的index.html
    mainWindow.loadURL(`file://${path.join(__dirname, '../dist/index.html')}`);
    // 同样支持通过环境变量在生产环境下打开开发者工具（默认不打开）
    const shouldOpenDevTools = process.env.ELECTRON_OPEN_DEVTOOLS === 'true';
    if (shouldOpenDevTools) {
      mainWindow.webContents.openDevTools();
    }
  }

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Windows 平台：在主窗口关闭时确保应用完全退出
  // 说明：配合 window-all-closed 中的 app.quit()，保证 Win32 下关闭窗口即退出进程
  if (process.platform === 'win32') {
    mainWindow.on('close', () => {
      app.quit();
    });
  }
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.on('ready', createWindow);

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // 关闭所有窗口后，直接退出应用（包含 macOS）
  // 说明：默认 macOS 会保持应用不退出，这里按需求改为完全退出
  app.quit();
});

app.on('activate', () => {
  // 在macOS上，当点击dock图标并且没有其他窗口打开时，
  // 通常会在应用程序中重新创建一个窗口
  if (mainWindow === null) {
    createWindow();
  }
});

// 处理IPC通信
// 健康检查
ipcMain.handle('check-health', async () => {
  try {
    const response = await fetch(API_BASE + 'ping');
    return response.ok;
  } catch (error) {
    console.error('健康检查失败:', error);
    return false;
  }
});

// 获取图片列表
ipcMain.handle('get-images', async () => {
  try {
    const response = await fetch(API_BASE + 'api/images');
    if (response.ok) {
      const data = await response.json();
      return data.images || [];
    }
    return [];
  } catch (error) {
    console.error('获取图片列表失败:', error);
    return [];
  }
});

// 图片检测
ipcMain.handle('run-detection', async (event, { imageId }) => {
  try {
    const response = await fetch(API_BASE + `api/images/${imageId}/detections`);

    if (response.ok) {
      const data = await response.json();
      return data.detections || [];
    }
    return [];
  } catch (error) {
    console.error('图片检测失败:', error);
    return [];
  }
});
