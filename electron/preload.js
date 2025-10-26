const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取图片列表
  getImageList: () => ipcRenderer.invoke('get-image-list'),
  // 运行检测
  runDetection: (imageId) => ipcRenderer.invoke('run-detection', imageId)
})