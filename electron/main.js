const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const isDevelopment = process.env.NODE_ENV !== 'production';

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
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境下，加载打包后的index.html
    mainWindow.loadURL(`file://${path.join(__dirname, '../dist/index.html')}`);
  }

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.on('ready', createWindow);

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // 在macOS上，除非用户使用Cmd + Q确定地退出
  // 否则绝大部分应用会保持活动状态
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // 在macOS上，当点击dock图标并且没有其他窗口打开时，
  // 通常会在应用程序中重新创建一个窗口
  if (mainWindow === null) {
    createWindow();
  }
});

// 处理IPC通信
ipcMain.on('get-images', (event) => {
  const uploadsDir = path.join(__dirname, '../uploads');
  
  try {
    const files = fs.readdirSync(uploadsDir);
    const images = files.map(filename => {
      return {
        filename,
        path: path.join(uploadsDir, filename),
        url: `file://${path.join(uploadsDir, filename)}`
      };
    });
    
    event.reply('images-list', images);
  } catch (error) {
    console.error('获取图片列表时出错:', error);
    event.reply('images-list', []);
  }
});