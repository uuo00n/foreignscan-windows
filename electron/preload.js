const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取图片列表
  getImageList: () => ipcRenderer.invoke('get-images'),
  // 新命名，便于后续统一
  getImages: () => ipcRenderer.invoke('get-images'),
  // 运行检测
  runDetection: (payload) => ipcRenderer.invoke('run-detection', payload),
  // 选择模型文件
  pickModelFile: () => ipcRenderer.invoke('pick-model-file')
})
