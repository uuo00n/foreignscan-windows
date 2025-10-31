<template>
  <div class="image-viewer">
    <div class="image-container">
      <img :src="imageSrc" alt="检测图片" v-if="imageSrc" />
      <div class="backend-error" v-else-if="hasBackendError">后端异常，无法获取图片</div>
      <div class="no-image" v-else>请选择一个检测记录查看图片</div>
      <div class="detection-markers" v-if="detectionResults.length > 0">
        <div 
          v-for="(result, index) in detectionResults" 
          :key="index" 
          class="marker"
          :style="{
            left: `${result.x}px`,
            top: `${result.y}px`,
            width: `${result.width}px`,
            height: `${result.height}px`
          }"
        ></div>
      </div>
    </div>
    <div class="controls">
      <button class="detection-btn" @click="runDetection" :disabled="!imageSrc || hasBackendError">检测结果</button>
      <button class="export-btn" :disabled="!imageSrc || hasBackendError">导出报告</button>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';

// 条件导入 Electron，避免在浏览器环境中报错
const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

export default {
  name: 'ImageViewer',
  computed: {
    ...mapState(['currentImage', 'detectionResults', 'backendStatus']),
    imageSrc() {
      // 如果没有选中记录，返回null
      if (!this.currentImage) return null;
      
      // 如果有服务器图片路径，优先使用
      if (this.currentImage.path) {
        // 确保路径正确
        console.log('使用服务器图片路径:', this.currentImage.path);
        return this.currentImage.path;
      } else {
        // 如果没有服务器图片路径或path为null，使用本地示例图片
        console.log('使用本地示例图片');
        return require('@/assets/hinge-example.jpg');
      }
    },
    hasBackendError() {
      return this.backendStatus === 'error';
    }
  },
  methods: {
    ...mapActions(['setDetectionResults']),
    async runDetection() {
      if (!this.currentImage || !this.currentImage.id) {
        return;
      }
      
      try {
        // 通过IPC与主进程通信，调用后端API进行检测
        if (ipcRenderer) {
          // 使用正确的API格式
          const results = await ipcRenderer.invoke('run-detection', {
            imageId: this.currentImage.id
          });
          this.setDetectionResults(results || []);
        } else {
          // 浏览器环境下，直接调用API
          try {
            // 使用POST方法和正确的API路径
            const response = await fetch('http://localhost:3000/api/detect', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                imageId: this.currentImage.id
              })
            });
            
            const data = await response.json();
            if (response.ok && data.results) {
              this.setDetectionResults(data.results || []);
            } else {
              this.setDetectionResults([]);
              console.error('检测失败:', data.message || '未知错误');
            }
          } catch (error) {
            this.setDetectionResults([]);
            console.error('检测请求失败:', error);
          }
        }
      } catch (error) {
        this.setDetectionResults([]);
        console.error('检测过程出错:', error);
      }
    }
  }
}
</script>

<style scoped>
.image-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.image-container {
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f0f0;
  overflow: hidden;
}

.image-container img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.no-image {
  color: #999;
  font-size: 16px;
}

.detection-markers .marker {
  position: absolute;
  border: 2px solid red;
  background-color: rgba(255, 0, 0, 0.2);
  pointer-events: none;
}

.controls {
  display: flex;
  justify-content: center;
  padding: 10px;
  gap: 10px;
  background-color: #f5f5f5;
}

.controls button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.detection-btn {
  background-color: #4285f4;
  color: white;
}

.export-btn {
  background-color: #34a853;
  color: white;
}
</style>